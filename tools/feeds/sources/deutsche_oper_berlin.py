"""Deutsche Oper Berlin: opera, ballet (Staatsballett Berlin) and concerts from the house's own
calendar.

    https://deutscheoperberlin.de/de_DE/event.json?current_page=calendar&date_from=…&p=N
    https://deutscheoperberlin.de/de_DE/production/<slug>.<cluster>?event_date=<id>

The calendar page loads its entries from ``event.json`` (the site's own JSON, 20 per page,
about 350 for the season; ~18 requests). Each entry is one performance (``IdEventDate``) with
the title, category (Oper, Ballett, Konzert, Liederabend, Führung, Film …), the stage, a short
work line ("Oper in drei Akten von Pjotr Tschajkowski"), the organiser (e.g. Staatsballett
Berlin), a cancelled flag (``IsCancled``) and ``EventOrderValue`` = 'YYYYMMDDHHMM-…' (Berlin
local time; ``DateFrom`` is the first date of the series, not of this performance). Checked
against the website on 29 Oct 2026: 4 Nov 2026 19:30 Pique Dame = "202611041930".

Each production page (one request per production, ``IdEventCluster``) has, per date, the
team (Musikalische Leitung, Regie …) and the cast (role: singer, choir, orchestra). Those are
read incrementally: a performance the previous feed already has with its cast (same id, start
and title) keeps it; production pages are read for performances still without a cast, soonest
first, then for productions playing in the next two weeks and a fixed share of the others
(about weekly). A ballet whose page names no conductor is taken to be danced to recorded music
and skipped.

During a test run on 29 Oct 2026 the server refused connections for a while after about 60
quick requests (other sites did the same at that moment, so it may have been the network), so
this reader stays small: at most 80 requests and 3 extra seconds between production pages.
A full run (18 calendar pages + ~50 productions) took about 70 requests and 3 minutes.

Skipped: guided tours, introductions and talks (Premierengespräch, Einführung, Werkstatt),
films and cinema events, children's and school formats (Knirps-Konzert, children's music
theatre in the Tischlerei, Kinder tanzen, Music Circus), parties and club nights (Late Night),
jazz and swing evenings, readings. Kept, like the other readers: a full staged children's opera
on the main stage with the house orchestra (In 80 Tagen um die Welt).
"""
from __future__ import annotations

import html as _html
import re

from common import (BudgetExceeded, FetchError, clean, event_id, get_json, get, guess_type, infer_type, log,
                    make_event, previous_event, refresh_due, requests_left, today_zurich)

from ._berlin import Spacer, abroad, berlin_local, credit, german_town, is_pop, skip_title, venue_name

KEY = 'deutsche_oper_berlin'
NAME = 'Deutsche Oper Berlin'
SITE = 'https://deutscheoperberlin.de/'
ATTRIBUTION = 'Source: Deutsche Oper Berlin (deutscheoperberlin.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 80
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 14
REFRESH_EVERY_DAYS = 7
PAGE_GAP = 3.0                # seconds between production pages (on top of common.get's spacing)

BASE = 'https://deutscheoperberlin.de'
API = BASE + '/de_DE/event.json?current_page=calendar&date_from={day}&location=alle&category=alle&status=&p={page}'
MAX_PAGES = 40

_SKIP_CATEGORIES = {'führung', 'film', 'kino', 'gespräch', 'einführung', 'workshop', 'party', 'lesung', 'ausstellung',
                    'fest', 'special', 'pop', 'sonstige musik', 'diskussion', 'discussion', 'guided tour'}
_SKIP_RE = re.compile(r'klassenzimmer|schul|szenisches konzert für kind|'
                      r'premierengespräch|einführung|gespräch|im kino|kino\b|party|clubnacht|club night|disco|'
                      r'tischlerei-bar|lounge|yoga|mitmach|bastel|familien|glam night|training zum zuschauen|'
                      r'unlimited salon|partizipativ', re.I)
_OPERA_RE = re.compile(r'\boper\b|operette|musiktheater|singspiel|opera\b|dramma|tragedia|melodram|'
                       r'szenisches oratorium|zarzuela', re.I)


def parse_page(data):
    """-> (entries, more pages?) from one event.json answer."""
    out = []
    for e in (data or {}).get('EventOverview') or []:
        if not isinstance(e, dict) or not e.get('IdEventDate'):
            continue
        out.append(e)
    pager = (data or {}).get('Pager') or {}
    return out, bool(pager) and not pager.get('IsLastPage', True)


def _start(e):
    m = re.match(r'(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})', str(e.get('EventOrderValue') or ''))
    if not m:
        return None
    y, mo, d, hh, mi = (int(x) for x in m.groups())
    t = re.match(r'\s*(\d{1,2}):(\d{2})', str(e.get('DateTimeStart') or ''))
    if t and (int(t.group(1)), int(t.group(2))) != (hh, mi):
        log.warning('%s %s: order value %02d:%02d but the time shown is %s; using the time shown',
                    KEY, e.get('IdEventDate'), hh, mi, e.get('DateTimeStart'))
        hh, mi = int(t.group(1)), int(t.group(2))
    if (str(d), str(mo)) != (str(e.get('DateDay') or d).strip(), str(e.get('DateMonth') or mo).strip()):
        log.warning('%s %s: order value %s does not match the day shown %s.%s', KEY, e.get('IdEventDate'),
                    e.get('EventOrderValue'), e.get('DateDay'), e.get('DateMonth'))
    return berlin_local(y, mo, d, hh, mi)


def parse_production(page_html):
    """-> {IdEventDate: [(role text, name)]} with the team and the cast of every date on the page."""
    out = {}
    h = page_html or ''
    for kind in ('staff', 'ensemble'):
        for m in re.finditer(r'<span id="%s-furtherevent_(\d+)"[^>]*>(.*?)(?=<span id="(?:staff|ensemble)-furtherevent_|'
                             r'<div class="further-events-dates-wrapper"|$)' % kind, h, re.S):
            rows = out.setdefault(m.group(1), [])
            for role, names in re.findall(r'<span class="person-role">(.*?)</span>\s*<span class="person-names">(.*?)'
                                          r'</span>\s*<span', m.group(2), re.S):
                for n in re.findall(r'<div class="person_wrapper">(.*?)</div>', names, re.S):
                    name = clean(n)
                    if name:
                        rows.append((clean(role), name))
    return out


def _is_opera(e):
    return (clean(e.get('ContentCategory')).lower() in ('oper', 'opera', 'operette')
            or bool(_OPERA_RE.search(clean(e.get('OpusInfoShort')))))


def _is_ballet(e):
    return clean(e.get('ContentCategory')).lower() in ('ballett', 'ballet', 'tanz')


def _composer(e):
    m = re.search(r'\bvon\s+([A-ZÄÖÜ][^,;()]+?)\s*$', clean(e.get('OpusInfoShort')))
    return m.group(1).strip() if m and len(m.group(1).split()) <= 5 else None


def _credits(rows, opera, ballet):
    out = []
    split = []
    for role, name in rows:                               # 'Dominic Limburg, Robert Reimer': two people
        parts = [x.strip() for x in re.split(r'\s*,\s*|\s+/\s+', name) if x.strip()]
        if len(parts) > 1 and all(len(x.split()) >= 2 and x[:1].isupper() for x in parts):
            split += [(role, x) for x in parts]
        else:
            split.append((role, name))
    for role, name in split:
        r = clean(role)
        if re.fullmatch(r'(?i)chöre|chor|chor und extrachor|kinderchor|extrachor', r):
            out.append(('Choir', name))
            continue
        if re.fullmatch(r'(?i)orchester', r):
            out.append(('Orchestra', name))
            continue
        if re.fullmatch(r'(?i)ballett|tanz|tänzer(?:innen)?|statisterie', r):
            continue
        if ballet and not re.search(r'(?i)musikalische leitung|dirigent|choreogra|orchester|klavier|solist', r):
            continue                                      # dancers are not musical credits
        c = credit(r, name, opera=opera or ballet)
        if c:
            out.append(c)
    return out


def _type(e, credits, ballet):
    cat = clean(e.get('ContentCategory')).lower()
    text = f"{e.get('Title')} {e.get('OpusInfoShort')}"
    if ballet:
        return 'orchestral'
    if _is_opera(e):
        return 'vocal-opera'
    if cat == 'liederabend' or re.search(r'liederabend|recital', text, re.I):
        return 'recital'
    return guess_type(text) or infer_type(clean(e.get('Title')), credits, None)


def _read_calendar():
    day = today_zurich().isoformat()
    entries, page, more = {}, 1, True
    while more and page <= MAX_PAGES:
        if requests_left() <= 5:
            log.warning('%s: calendar stopped at page %d (request cap)', KEY, page)
            break
        try:
            data = get_json(API.format(day=day, page=page), headers={'X-Requested-With': 'XMLHttpRequest'})
        except BudgetExceeded as err:
            log.warning('%s: stopped: %s', KEY, err.reason)
            break
        except FetchError as err:
            if page == 1:
                raise
            log.warning('%s: calendar page %d failed: %s', KEY, page, err)
            break
        items, more = parse_page(data)
        for e in items:
            entries.setdefault(str(e['IdEventDate']), e)
        if not items:
            break
        page += 1
    log.info('%s: %d calendar page(s), %d performances', KEY, page - 1, len(entries))
    return list(entries.values())


def fetch():
    raw = _read_calendar()
    skipped, cands = {}, []

    def skip(why, e):
        skipped[why] = skipped.get(why, 0) + 1
        log.debug('%s: skipped (%s): %s %s', KEY, why, e.get('EventOrderValue'), e.get('Title'))

    for e in raw:
        title = clean(e.get('Title'))
        cat = clean(e.get('ContentCategory')).lower()
        text = f"{title} {clean(e.get('OpusInfoShort'))} {clean(e.get('FormalCategory'))}"
        main_stage_opera = cat in ('oper', 'opera') and re.search(r'(?i)großes haus', clean(e.get('Location')))
        formal = clean(e.get('FormalCategory')).lower()
        children = e.get('IsChildrenStatus') or formal in ('kinder / jugend', 'children', 'kinder')
        if cat in _SKIP_CATEGORIES or formal in _SKIP_CATEGORIES or skip_title(title) or _SKIP_RE.search(text) or \
                (children and not main_stage_opera):
            skip('tour / talk / film / children', e)
            continue
        if (is_pop(title) or (cat not in ('klassik', 'classical music') and is_pop(text))) and not _is_opera(e):
            skip('pop / jazz', e)
            continue
        start = _start(e)
        if not start:
            skip('no time', e)
            continue
        place = clean(e.get('Location'))
        city = 'Berlin'
        if place and not re.search(r'(?i)großes haus|foyer|tischlerei|parkett|rang|kassenhalle|deutsche oper', place):
            town = german_town(f"{place} {clean(e.get('City'))}")
            if abroad(place) and not town:
                skip('abroad', e)
                continue
            city = town or 'Berlin'
        e['_start'], e['_city'] = start, city
        cands.append(e)

    # production pages: casts per date, incrementally
    def reuse(e):
        prev = previous_event(event_id(KEY, e['IdEventDate']), e['_start'], title=clean(e.get('Title')))
        return prev if prev and prev.get('credits') else None

    prods = {}
    for e in cands:
        url = _production_url(e)
        if not url:
            continue
        p = prods.setdefault(url, {'first': e['_start'], 'missing': 0, 'due': False, 'key': str(e.get('IdEventCluster'))})
        p['first'] = min(p['first'], e['_start'])
        e['_prev'] = reuse(e)
        if not e['_prev']:
            p['missing'] += 1
        elif refresh_due(p['key'], e['_start'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            p['due'] = True
    order = sorted((u for u, p in prods.items() if p['missing'] or p['due']),
                   key=lambda u: (not prods[u]['missing'], prods[u]['first']))
    casts, read, spacer = {}, 0, Spacer(PAGE_GAP)
    for url in order:
        if requests_left() <= 0:
            break
        spacer.wait()
        try:
            casts.update(parse_production(get(url)))
            read += 1
        except BudgetExceeded as err:
            log.warning('%s: stopped reading production pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s: production page failed: %s', KEY, err)

    events = []
    for e in cands:
        sid = str(e['IdEventDate'])
        opera, ballet = _is_opera(e), _is_ballet(e)
        rows = casts.get(sid)
        prev = e.get('_prev')
        if rows is not None:
            credits = _credits(rows, opera, ballet)
            if ballet and not any(r == 'Conductor' for r, _ in credits):
                skip('ballet without live music', e)
                continue
        elif prev:
            credits = [(c.get('role'), c.get('name')) for c in prev.get('credits') or []]
        else:
            credits = []
        title = clean(e.get('Title'))
        composer = _composer(e)
        program = [(composer, title)] if composer and (opera or ballet) else []
        url = e.get('Slug') or ''
        url = BASE + url if url.startswith('/') else url
        ticket = e.get('PriceUrl') if str(e.get('PriceUrl') or '').startswith('http') else None
        place = clean(e.get('Location')) or 'Großes Haus'
        venue = venue_name(f'Deutsche Oper Berlin, {place}') if e['_city'] == 'Berlin' and \
            re.search(r'(?i)großes haus|foyer|tischlerei', place) else venue_name(place)
        try:
            events.append(make_event(
                KEY, sid, title, e['_start'], city=e['_city'], venueName=venue,
                type=_type(e, credits, ballet), series='Ballett' if ballet else None,
                credits=credits, program=program, ticketUrl=ticket, url=url,
                status='cancelled' if e.get('IsCancled') else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, sid, err)
    if skipped:
        log.info('%s: skipped %s', KEY, ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    log.info('%s: %d production page(s) read', KEY, read)
    return events


def _production_url(e):
    slug = _html.unescape(str(e.get('Slug') or ''))
    if not slug.startswith('/'):
        return None
    return BASE + slug.split('?')[0]
