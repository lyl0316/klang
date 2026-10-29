"""Opéra national du Rhin (Strasbourg, Mulhouse, Colmar): opera, concerts, recitals and
ballet with live music, from the house's own API.

    https://api.operanationaldurhin.eu/event_dates?doorTime[after]=…&order[doorTime]=asc&page=N
    https://api.operanationaldurhin.eu/events/<id>                                   one production

The website (operanationaldurhin.eu, Roadiz) loads its dates from the public API at
api.operanationaldurhin.eu (robots.txt: allow all), the same calls its ticket buttons make.
The date list (50 a page, ~5 pages for 450 days) gives each performance's start (with
offset), the place (name, zone strasbourg/mulhouse/colmar, address), the production
(name, main category: opera, oratorio, concert, recital, "L'Heure lyrique", ballet …) and
cancelled/postponed flags. The production record adds the cast: role labels ("Direction
musicale", character names, "Piano") with the people, and the orchestra or choir. One
request per production, read incrementally: a production whose performances the previous
feed already has with their cast (same id, start and title) keeps it (re-read when it
plays within 10 days, otherwise about once a week).

Kept: operas (also the family operas' public performances, as opernhaus_zurich does),
oratorios, concerts, recitals, "L'Heure lyrique" song recitals, festive concerts, and
ballets with live music (a "Direction musicale" credit or an orchestra credited).
Performances in other towns of the region (Sarre-Union, Vogelgrun, Illkirch …) are kept
with that town. Skipped: workshops, guided tours, open classes and rehearsals, talks
(table ronde), film screenings, baby and family workshops, dinners/balls, ballets to
recorded music, and "Les concerts de l'OPS" (the Strasbourg Philharmonic's chamber series
in the opera house, read with programme and players by ops_strasbourg).

Facts only (date, time, title, place, performers, links); checked against the website on
29 Oct 2026.
"""
from __future__ import annotations

import json
import re
from datetime import timedelta

from common import (BudgetExceeded, FetchError, clean, get, get_json, log, make_event, requests_left,
                    to_zurich_datetime, today_zurich)

from ._france_regions import concert_type, credits_from, fold, group_role, is_skipped, reusable

KEY = 'opera_du_rhin'
NAME = 'Opéra national du Rhin'
SITE = 'https://www.operanationaldurhin.eu/'
ATTRIBUTION = 'Source: Opéra national du Rhin (operanationaldurhin.eu)'
KIND = 'venue'
COUNTRY = 'france'
MAX_REQUESTS = 80
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 10
REFRESH_EVERY_DAYS = 7

WWW = 'https://www.operanationaldurhin.eu'
API = 'https://api.operanationaldurhin.eu'
DATES = (API + '/event_dates?doorTime%5Bafter%5D={start}&doorTime%5Bbefore%5D={end}&itemsPerPage=50'
         '&order%5BdoorTime%5D=asc&page={page}')
EVENT = API + '{iri}'
MAX_PAGES = 15
WINDOW_DAYS = 450

# main category slug -> kind
_KINDS = {'opera-1': 'opera', 'opera': 'opera', 'oratorio': 'vocal', 'concert': 'concert', 'recital-1': 'recital',
          'recital': 'recital', 'lheure-lyrique': 'concert', 'concerts-de-fetes': 'concert', 'danse-1': 'ballet'}
_SKIP_NAME = re.compile(r"concerts de l.ops|avec vous\b|bal\b|diners?\b")
_ZONES = {'strasbourg': 'Strasbourg', 'mulhouse': 'Mulhouse', 'colmar': 'Colmar'}
_VENUES = {('opera', 'strasbourg'): 'Opéra de Strasbourg', ('la sinne', 'mulhouse'): 'Théâtre de la Sinne',
           ('theatre municipal de colmar', 'colmar'): 'Théâtre municipal de Colmar'}


def read_dates(today):
    start, end = today.isoformat(), (today + timedelta(days=WINDOW_DAYS)).isoformat()
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
            log.warning('opera_du_rhin: date page %d failed', page)
            break
        out.extend(data.get('hydra:member') or [])
        if 'hydra:next' not in (data.get('hydra:view') or {}):
            break
    return out


def _city(place):
    zone = (place.get('zone') or '').lower()
    if zone in _ZONES:
        return _ZONES[zone]
    addr = place.get('address') or {}
    if addr.get('addressCountry') and addr['addressCountry'] not in ('FR', 'France'):
        return None
    return clean(addr.get('addressLocality')) or None


def _venue(place, city):
    name = clean(place.get('name'))
    key = (fold(name), (place.get('zone') or '').lower())
    if key in _VENUES:
        return _VENUES[key]
    m = re.match(r'(?i)^op[ée]ra,\s*(.+)$', name)
    if m and city == 'Strasbourg':
        return f'Opéra de Strasbourg, {m.group(1)}'               # 'Opéra, salle Bastide'
    return name


def parse_event(data):
    """-> {'rows': [(label, name)], 'composer': str}"""
    rows = []
    for p in data.get('performers') or []:
        label = clean(p.get('name'))
        people = [clean(x.get('fullName') or f"{x.get('name') or ''} {x.get('familyName') or ''}")
                  for x in p.get('people') or []]
        org = p.get('organization') or {}
        if isinstance(org, dict) and clean(org.get('name')):
            rows.append(('', clean(org['name'])))
        for n in people:
            if n:
                rows.append((label, n))
        if not people and not org and label and group_role(label):
            rows.append(('', label))
    # 'Contrebasse   \r\nThomas Cornut\r\n\r\nAccordéon   \r\nHugo Degorre': more players, role above name
    for block in re.split(r'\n\s*\n', (data.get('additionalRoles') or '').replace('\r', '')):
        lines = [clean(re.sub(r'[*_#]+', '', x)) for x in block.split('\n') if clean(x)]
        if len(lines) == 2 and len(lines[0]) <= 40 and len(lines[1]) <= 80:
            rows.append((lines[0], lines[1]))
    return {'rows': rows, 'composer': clean(data.get('subtitle'))}


def _live_music(prod):
    return any(re.match(r'direction musicale|chef d.orchestre', fold(l)) for l, _ in prod['rows']) or \
        any(not l and re.search(r'orchest', fold(n)) for l, n in prod['rows'])


def _sid(iri, start):
    num = iri.rstrip('/').rsplit('/', 1)[-1]
    return f'{num}-{start[:4]}{start[5:7]}{start[8:10]}{start[11:13]}{start[14:16]}'


def fetch():
    today = today_zurich()
    dates = read_dates(today)
    prods = {}
    for x in dates:
        ev = x.get('event') or {}
        iri = ev.get('@id')
        cat = (ev.get('mainCategory') or {}).get('slug') or ''
        kind = _KINDS.get(cat)
        name = clean(ev.get('name'))
        if not iri or not kind or not x.get('doorTime') or x.get('online'):
            continue
        if _SKIP_NAME.search(fold(name)) or is_skipped(name):
            continue
        p = prods.setdefault(iri, {'iri': iri, 'kind': kind, 'name': name, 'slug': ev.get('slug'),
                                   'season': (ev.get('season') or {}).get('slug'), 'cat': cat,
                                   'cancelled': bool(ev.get('cancelled') or ev.get('postponed')), 'dates': []})
        p['dates'].append(x)
    log.info('opera_du_rhin: %d dates, %d productions to consider', len(dates), len(prods))
    events, read, reused = [], 0, 0
    for p in sorted(prods.values(), key=lambda p: p['dates'][0]['doorTime']):
        perfs = [(_sid(p['iri'], x['doorTime']), x['doorTime'], p['name']) for x in p['dates']]
        old = reusable(KEY, perfs, p['iri'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS)
        prod = None
        if old is None:
            if requests_left() <= 0:
                log.info('opera_du_rhin: request cap reached; %s waits for a later run', p['name'])
                continue
            try:
                prod = parse_event(get_json(EVENT.format(iri=p['iri'])))
                read += 1
            except BudgetExceeded as err:
                log.warning('opera_du_rhin: stopped reading productions: %s', err.reason)
                break
            except FetchError as err:
                log.warning('opera_du_rhin: %s failed: %s', p['iri'], err)
                continue
            if p['kind'] == 'ballet' and not _live_music(prod):
                continue
        else:
            reused += 1
        url = f"{WWW}/fr/spectacles/{p['season']}/{p['cat']}/{p['slug']}" if p['season'] and p['slug'] else SITE
        for (sid, start, title), x in zip(perfs, p['dates']):
            place = x.get('place') or {}
            city = _city(place)
            if not city:
                continue
            if prod is not None:
                credits = credits_from(prod['rows'], {'opera': 'opera', 'vocal': 'opera', 'ballet': 'ballet'}.get(
                    p['kind'], 'concert'), day=to_zurich_datetime(start).date())
                if not credits and p['kind'] == 'recital' and prod['composer'] and len(prod['composer']) <= 30:
                    credits = credits_from([(prod['composer'], title)])    # subtitle 'Mezzo-soprano', title the singer
                program = [(prod['composer'], title)] if p['kind'] in ('opera', 'vocal', 'ballet') and \
                    prod['composer'] and not re.search(r'\d|&|,', prod['composer']) and \
                    len(prod['composer'].split()) <= 4 else []
                hint = {'opera': 'vocal-opera', 'vocal': 'vocal-opera', 'ballet': 'orchestral',
                        'recital': 'recital'}.get(p['kind'])
                ctype = concert_type(title, credits, program, hint)
            else:
                prev = old[sid]
                credits = [(c.get('role'), c.get('name')) for c in prev.get('credits') or []]
                program = [(w.get('composer'), w.get('title')) for w in prev.get('program') or []]
                ctype = prev.get('type')
            ticket = x.get('offerUrl') or x.get('manualOfferUrl')
            cancelled = p['cancelled'] or x.get('cancelled') or x.get('postponed')
            try:
                events.append(make_event(
                    KEY, sid, title, start, end=x.get('endDate'), city=city, venueName=_venue(place, city),
                    type=ctype, credits=credits, program=program, ticketUrl=ticket, url=url,
                    status='cancelled' if cancelled else 'scheduled'))
            except ValueError as err:
                log.warning('opera_du_rhin: %s skipped: %s', sid, err)
    log.info('opera_du_rhin: %d production records read, %d reused', read, reused)
    return events
