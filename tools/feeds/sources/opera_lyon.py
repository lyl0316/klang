"""Opéra de Lyon: opera, concerts and ballet with live music, from the house's own API.

    https://api.opera-lyon.com/api/event_dates?startDate[after]=…&order[startDate]=asc&page=N
    https://api.opera-lyon.com/api/web_response_by_path?path=/fr/programmation/…   one production

The website (opera-lyon.com, a Nuxt front end) reads everything from its Roadiz/API Platform
back end at api.opera-lyon.com, which has no robots.txt; the reader uses the same two
public JSON calls the site makes. The date list (50 a page, ~4 pages for 450 days, guided
tours and school performances filtered out by the API's own ``not[event.type]`` filter)
gives each performance's start (with offset), its place (name, town, country) and the
production (name, URL). The production record adds the genre tags, the performers with
their role labels ("Direction musicale (les 14, 16, 19 et 21 décembre)", "Baryton",
character names) and the programme ("**Composer** / *Work*" lines). Per-date notes on a
role are honoured. Production records cost one request each and are read incrementally: a
production whose performances the previous feed already has with their cast or programme
(same id, start and title) keeps them, re-read when it plays within 10 days and otherwise
about once a week.

Kept: operas (incl. productions in other Lyon theatres), concerts, recitals, and ballets
with live music (a "Direction musicale" credit or the orchestra credited). Skipped: the
Opéra Underground series (jazz, rock, world music), family and story concerts ("Concert
conté"), ciné-concerts, talks ("Grand Entretien", "Alors on danse ?"), workshops, and
ballets to recorded music. Facts only (date, time, title, place, performers, works,
links); checked against the website on 29 Oct 2026.
"""
from __future__ import annotations

import json
import re
import urllib.parse
from datetime import timedelta

from common import (BudgetExceeded, FetchError, clean, get, get_json, infer_type, log, looks_cancelled, make_event,
                    requests_left, to_zurich_datetime, today_zurich)

from ._france_regions import credits_from, fold, group_role, is_skipped, reusable

KEY = 'opera_lyon'
NAME = 'Opéra de Lyon'
SITE = 'https://www.opera-lyon.com/'
ATTRIBUTION = 'Source: Opéra de Lyon (opera-lyon.com)'
KIND = 'venue'
COUNTRY = 'france'
MAX_REQUESTS = 100
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 10
REFRESH_EVERY_DAYS = 7

WWW = 'https://www.opera-lyon.com'
API = 'https://api.opera-lyon.com/api'
DATES = (API + '/event_dates?startDate%5Bafter%5D={start}&startDate%5Bbefore%5D={end}&itemsPerPage=50'
         '&order%5BstartDate%5D=asc&not%5Bevent.type%5D%5B%5D=guided_tour&not%5Bevent.type%5D%5B%5D=educational'
         '&page={page}')
PRODUCTION = API + '/web_response_by_path?path={path}'
MAX_PAGES = 15
WINDOW_DAYS = 450

_KEEP_SECTIONS = {'opera': 'opera', 'concert': 'concert', 'danse': 'ballet'}
_SKIP_TAGS = re.compile(r'musique actuelle|opera underground|concert conte|cine-concert|jeune public|conference|'
                        r'atelier|visite')


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

def read_dates(today):
    start = today.isoformat()
    end = (today + timedelta(days=WINDOW_DAYS)).isoformat()
    out = []
    for page in range(1, MAX_PAGES + 1):
        url = DATES.format(start=start, end=end, page=page)
        try:
            data = json.loads(get(url, accept='application/ld+json'))
        except ValueError as err:
            raise FetchError(url, f'invalid JSON: {err}') from None
        except FetchError:
            if page == 1:
                raise
            log.warning('opera_lyon: date page %d failed', page)
            break
        out.extend(data.get('hydra:member') or [])
        if 'hydra:next' not in (data.get('hydra:view') or {}):
            break
    return out


def _place(p):
    if isinstance(p, list):
        p = p[0] if p else {}
    return p if isinstance(p, dict) else {}


def _city(place):
    addr = place.get('address') or {}
    if addr.get('addressCountry') and addr.get('addressCountry') not in ('FR', 'France', 'FRANCE'):
        return None
    name = clean(place.get('name'))
    m = re.search(r'(?:,|\s-\s)\s*([A-ZÉ][^,]*?)$', name)
    town = clean(addr.get('addressLocality'))
    if not town and m:
        town = re.sub(r'\s+\d+(?:e|er)$', '', m.group(1)).strip()          # 'Lyon 5e' -> 'Lyon'
    town = re.sub(r'\s+\d+(?:e|er)$', '', town)
    if fold(town).startswith('lyon') or not town:
        return 'Lyon'
    if '-' in town and fold(town).startswith('oullins'):
        return 'Oullins-Pierre-Bénite'
    return town


def _venue(place):
    name = clean(place.get('name'))
    if fold(name) in ("opera de lyon", "grande salle de l'opera"):
        return 'Opéra de Lyon'
    return name


# ---------------------------------------------------------------------------
# production record
# ---------------------------------------------------------------------------

def _names(text):
    t = clean(re.sub(r'\s*\n\s*', ', ', text or ''))
    t = re.sub(r'\s*\((?:soci[ée]taire|pensionnaire)[^)]*\)', '', t)
    parts = [p.strip(' ,*') for p in re.split(r'\s*,\s*|\s+et\s+(?=[A-ZÉ])', t) if p.strip(' ,*')]
    return parts


def parse_production(item):
    """-> {'tags': [folded names], 'rows': [(label, name)], 'composer': str, 'works': [(composer, title)]}"""
    tags = [fold(t.get('name')) for t in item.get('tags') or [] if isinstance(t, dict)]
    rows, composer = [], ''
    for p in item.get('performers') or []:
        label = clean(p.get('name'))
        ident = p.get('identities') or p.get('manualPeopleOrOrganization') or ''
        if label.startswith('*'):
            continue                                       # '* Soliste du Lyon Opéra Studio' (a footnote)
        if fold(label) in ('un opera de', 'une creation de', 'musique', 'un ballet de', 'compositeur'):
            composer = composer or clean(ident)
            continue
        if not clean(ident):
            if label and group_role(label):
                rows.append(('', label))                   # 'Orchestre et Maîtrise de l'Opéra de Lyon'
            continue
        names = _names(ident)
        if not label:
            rows.extend(('', n) for n in names)
            continue
        if fold(label) == 'avec':
            label = ''
        for n in names:
            rows.append((label, n))
    works = parse_schedule(item.get('scheduleDescription') or '')
    return {'tags': tags, 'rows': rows, 'composer': composer, 'works': works}


_LIFE = re.compile(r'\s*\(\s*(?:\*|n[ée]e?\s)?\s*\d{4}\s*(?:[-–]\s*\d{0,4})?\s*\)?\s*$')


def parse_schedule(md):
    """'**Ludwig van Beethoven**  \\n*Egmont*' -> [('Ludwig van Beethoven', 'Egmont')]."""
    works, composer = [], ''
    for raw in re.split(r'\n', md or ''):
        line = raw.strip()
        if not line or re.match(r'(?i)^(dur[ée]e|entracte|pause)\b', clean(line.strip('*'))):
            continue
        bold = line.startswith('**') and not line.startswith('***') and line.count('**') >= 2 and \
            re.fullmatch(r'\*\*[^*]+\*\*\)?', line)
        if bold:
            text = clean(_LIFE.sub('', line.replace('**', '')))
            lead = re.match(r"(?i)^(?:œuvres?|oeuvres?|airs?|extraits?|pages?) (?:de |d['’]|des )\s*", text)
            if lead:                                            # '**Œuvres de Bizet, Gounod, …**'
                for c in re.split(r'\s*,\s*|\s+et\s+', text[lead.end():].strip(' .…')):
                    if c.strip():
                        works.append((c.strip(), ''))
                composer = ''
                continue
            composer = text
            continue
        title = clean(re.sub(r'\*+', '', line))
        title = re.sub(r'\s*\(\s*\d{4}(?:\s*[-–]\s*\d{2,4})?\s*\)\s*$', '', title)      # '(1878-1880)'
        if not title:
            continue
        if line.startswith('*') or not works or works[-1][0] != composer or not composer:
            works.append((composer, title))
        else:
            c, t = works[-1]
            works[-1] = (c, f'{t} – {title}' if t else title)
    return [(c, t) for c, t in works if c or t]


def _section(url):
    m = re.match(r'/fr/programmation/[^/]+/([^/]+)/', url or '')
    return m.group(1) if m else ''


def _keep(kind, prod, name, subtitle):
    tags = ' | '.join(prod['tags'])
    if _SKIP_TAGS.search(tags) or is_skipped(name, subtitle):
        return False
    if kind == 'ballet':
        live = any(re.match(r'direction musicale|chef d.orchestre|cheffe d.orchestre', fold(l)) for l, _ in prod['rows']) or \
            any(re.search(r'orchest', fold(n)) for _, n in prod['rows'])
        return live
    return True


def _type(kind, prod, title, credits, works):
    tags = prod['tags']
    if kind == 'opera':
        return 'vocal-opera'
    if kind == 'ballet':
        return 'orchestral'
    if 'recital' in tags:
        return 'recital'
    if 'musique de chambre' in tags:
        return 'chamber'
    t = infer_type(title, credits, works)
    if t == 'vocal-opera' and not any(re.search(r'sopran|mezzo|alto|tenor|bariton|bass|voice|choir|chorus|narrat',
                                                fold(r)) for r, _ in credits):
        t = infer_type('', credits, works) or 'chamber'      # 'L’opéra par l’Orchestre': players only
    if 'grand concert' in tags and not t:
        return 'orchestral'
    return t


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def _sid(event_iri, start_iso):
    """'/api/events/3627' + '2026-12-14T20:00:00+01:00' -> '3627-202612142000' (local time)."""
    num = event_iri.rstrip('/').rsplit('/', 1)[-1]
    return f'{num}-{start_iso[:4]}{start_iso[5:7]}{start_iso[8:10]}{start_iso[11:13]}{start_iso[14:16]}'


def fetch():
    today = today_zurich()
    dates = read_dates(today)
    prods = {}
    for x in dates:
        ev = x.get('event') or {}
        iri, url = ev.get('@id'), ev.get('url') or ''
        kind = _KEEP_SECTIONS.get(_section(url))
        if not iri or not kind or not x.get('startDate'):
            continue
        if x.get('online') or is_skipped(ev.get('name'), ev.get('subtitle')):
            continue
        p = prods.setdefault(iri, {'iri': iri, 'url': url, 'kind': kind, 'name': clean(ev.get('name')),
                                   'subtitle': clean(ev.get('subtitle')), 'dates': []})
        p['dates'].append(x)
    log.info('opera_lyon: %d dates, %d productions to consider', len(dates), len(prods))

    events, read, reused = [], 0, 0
    for p in sorted(prods.values(), key=lambda p: p['dates'][0]['startDate']):
        perfs = []
        for x in p['dates']:
            start = x['startDate']
            perfs.append((_sid(p['iri'], start), start, p['name']))
        old = reusable(KEY, perfs, p['iri'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS)
        prod = None
        if old is None:
            if requests_left() <= 0:
                log.info('opera_lyon: request cap reached; %s waits for a later run', p['name'])
                continue
            try:
                data = get_json(PRODUCTION.format(path=urllib.parse.quote(p['url'], safe='/')))
                prod = parse_production(data.get('item') or {})
                read += 1
            except BudgetExceeded as err:
                log.warning('opera_lyon: stopped reading productions: %s', err.reason)
                break
            except FetchError as err:
                log.warning('opera_lyon: %s failed: %s', p['url'], err)
                continue
            if not _keep(p['kind'], prod, p['name'], p['subtitle']):
                continue
        else:
            reused += 1
        works = []
        if prod:
            works = prod['works'] or ([(prod['composer'], p['name'])] if prod['composer'] and p['kind'] == 'opera'
                                      else [])
        for (sid, start, title), x in zip(perfs, p['dates']):
            place = _place(x.get('place'))
            city = _city(place)
            if not city:
                continue
            day = to_zurich_datetime(start).date()
            if prod is not None:
                credits = credits_from(prod['rows'], 'opera' if p['kind'] == 'opera' else
                                       ('ballet' if p['kind'] == 'ballet' else 'concert'), day=day)
                ctype = _type(p['kind'], prod, title, credits, works)
                program = works
            else:
                prev = old[sid]
                credits = [(c.get('role'), c.get('name')) for c in prev.get('credits') or []]
                program = [(w.get('composer'), w.get('title')) for w in prev.get('program') or []]
                ctype = prev.get('type')
            offers = (x.get('offers') or {}).get('offers') or []
            ticket = next((o.get('url') for o in offers if isinstance(o, dict) and o.get('url')), None)
            cancelled = looks_cancelled(title) or looks_cancelled((x.get('availability') or {}).get('@id', ''))
            try:
                events.append(make_event(
                    KEY, sid, title, start, end=x.get('endDate'), city=city, venueName=_venue(place), type=ctype,
                    credits=credits, program=program, ticketUrl=ticket, url=WWW + p['url'],
                    status='cancelled' if cancelled else 'scheduled'))
            except ValueError as err:
                log.warning('opera_lyon: %s skipped: %s', sid, err)
    log.info('opera_lyon: %d production records read, %d reused', read, reused)
    return events
