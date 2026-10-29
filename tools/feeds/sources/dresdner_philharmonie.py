"""Dresdner Philharmonie: the orchestra's concerts in the Kulturpalast Dresden (and elsewhere in
Dresden), from the JSON its own concert calendar is built from, plus one page per programme.

    https://www.dresdnerphilharmonie.de/api/event/?page=1&limit=500&language=de     all dates
    https://www.dresdnerphilharmonie.de/de/konzerte-tickets/konzertkalender-dresden/<slug>/

The API (robots.txt closes only /api/labels/ and /ics/) returns every date of the season in
one response (~140, Aug – Jun, past ones included): id, title, date (Unix epoch, checked against
the "19.00 Uhr" on the site), venue, genre label, the programme ("program": composer + work) and
the soloists ("contributors"). Conductor, orchestra and choirs are missing there; they are
only on the programme's page ("Mitwirkende": name + role), one page per programme with all its
dates. Those pages are read incrementally: a date whose previous record (same id, start, title)
already has its full cast keeps it; the requests left go to programmes still missing it, nearest
first, then to programmes playing in the next week and a fixed share of the others (each about
every ten days). Only facts are taken (date, time, title, hall, people, works, links).

Skipped (by the site's genre label and title): school and family concerts, guided tours,
"Näher dran!" formats, film concerts, readings ("Literatur/Lesung und Musik"), sing-alongs,
the Bürgerchor's singing events and pop/jazz evenings. Kept: symphony, chamber, organ, choir,
"Kurzkonzert" (abgeFRACKt), "Stars am Klavier", concert operas, guest orchestras.
Checked against the website on 29 Oct 2026.
"""
from __future__ import annotations

import html as _html
import re

from common import (BudgetExceeded, FetchError, clean, event_id, get, get_json, log, looks_cancelled, make_event,
                    previous_event, refresh_due, requests_left, to_zurich_datetime, today_zurich)

from ._saxony import berlin_iso, cast_credits, german_town, skip_reason

KEY = 'dresdner_philharmonie'
NAME = 'Dresdner Philharmonie'
SITE = 'https://www.dresdnerphilharmonie.de/'
ATTRIBUTION = 'Source: Dresdner Philharmonie (dresdnerphilharmonie.de)'
KIND = 'orchestra'
COUNTRY = 'germany'
MAX_REQUESTS = 110             # 1 API call + one page per programme (~70 programmes a season)
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 10

BASE = 'https://www.dresdnerphilharmonie.de'
API = BASE + '/api/event/?page=1&limit=500&language=de'
CITY = 'Dresden'
ORCHESTRA = 'Dresdner Philharmonie'

_SKIP_LABELS = {'schulkonzert', 'familienkonzert', 'führung', 'näher dran!', 'film und musik',
                'literatur und musik', 'lesung und musik', 'canaletto - das dresdner stadtfest'}
_SKIP_TITLE = re.compile(r'(?i)star wars|zimmer vs\.?|blockbuster|jazz|mehldau|picknick|geh. aus, mein herz')


def _venue(text):
    v = clean(text)
    low = v.lower()
    if not v or 'kulturpalast' in low:
        return 'Kulturpalast Dresden, Konzertsaal', CITY
    town = german_town(v, default=CITY)
    return v, town


def _work(composer, title):
    t = clean(title).strip()
    if len(t) > 2 and t[0] in '"„“»' and t[-1] in '"“”«' and t.count('"') <= 2:
        t = t[1:-1].strip()
    return clean(composer), t


def parse_page(page_html):
    """-> {'people': [(role, name)], 'ids': {event ids on the page}, 'tickets': {event id: shop link}}
    from a programme page."""
    h = page_html or ''
    out = {'people': [], 'ids': set(re.findall(r'event-id="(\d+)"', h)), 'tickets': {}}
    for art in re.findall(r'<article class="event-data">(.*?)</article>', h, re.S):
        ids = re.findall(r'event-id="(\d+)"', art)
        shop = re.search(r'<dpc-button-ticket[^>]*\bhref="(https?://[^"]+)"', art)
        if ids and shop:
            out['tickets'][ids[0]] = _html.unescape(shop.group(1)).replace('page=customerlogin.secure&', '')
    m = re.search(r'<h2>\s*Mitwirkende\s*</h2>\s*<dl[^>]*>(.*?)</dl>', h, re.S)
    if m:
        for name, role in re.findall(r'<dt>(.*?)</dt>\s*<dd>(.*?)</dd>', m.group(1), re.S):
            name = clean(_html.unescape(name))
            if name:
                out['people'].append((clean(_html.unescape(role)), name))
    return out


def _slug_url(link):
    path = re.sub(r'\?.*$', '', link or '')
    return BASE + path if path.startswith('/') else None


def _complete(credits):
    roles = {c.get('role') for c in credits or []}
    return bool(roles & {'Conductor', 'Orchestra', 'Choir', 'Ensemble'})


def fetch():
    data = get_json(API)
    today = today_zurich()
    cands, skipped = [], {}
    for t in data.get('teaser') or []:
        meta, teaser, ext = t.get('meta') or {}, t.get('teaser') or {}, t.get('extension') or {}
        sid = meta.get('id')
        title = clean(teaser.get('title'))
        label = clean(ext.get('label'))
        if not sid or not title or not ext.get('date'):
            continue
        local = to_zurich_datetime(int(ext['date']))
        if local.date() < today:
            continue
        genres = [clean(g).lower() for g in ((ext.get('filter') or {}).get('genre') or [])]
        if label.lower() in _SKIP_LABELS or any(g in _SKIP_LABELS for g in genres):
            skipped[label or 'label'] = skipped.get(label or 'label', 0) + 1
            continue
        why = skip_reason(title, label) or (_SKIP_TITLE.search(title) and 'not classical')
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        venue, city = _venue(ext.get('venue'))
        if not city:
            skipped['abroad'] = skipped.get('abroad', 0) + 1
            continue
        people = [(clean(c.get('role')), clean(c.get('name'))) for c in ext.get('contributors') or []]
        program = [_work(p.get('composer'), p.get('title')) for p in ext.get('program') or [] if p.get('composer')]
        start = berlin_iso(local)
        state = clean((ext.get('button') or {}).get('state'))
        cands.append({
            'sid': str(sid), 'title': title, 'label': label, 'start': start, 'venue': venue, 'city': city,
            'people': people, 'program': program, 'page': _slug_url((teaser.get('link') or {}).get('url')),
            'duration': ext.get('duration'), 'state': state, 'cast': None, 'reused': None, 'ticket': None,
            'cancelled': looks_cancelled(title) or 'CANCEL' in state.upper(),
        })
    if skipped:
        log.info('dresdner_philharmonie: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    # earlier runs: the full cast of a date whose listing is unchanged
    for c in cands:
        prev = previous_event(event_id(KEY, c['sid']), c['start'], title=c['title'])
        if prev and _complete(prev.get('credits')):
            names = {clean(x.get('name')).lower() for x in prev.get('credits') or []}
            if all(n.lower() in names for _, n in c['people'] if n):
                c['reused'] = [(x.get('role'), x.get('name')) for x in prev['credits']]
                c['ticket'] = prev.get('ticketUrl') if prev.get('ticketUrl') != c['page'] else None

    pages = {}
    for c in cands:
        if c['page']:
            pages.setdefault(c['page'], []).append(c)

    def tier(url):
        group = pages[url]
        if any(c['reused'] is None for c in group):
            return 0
        if refresh_due(url, min(c['start'] for c in group), near_days=REFRESH_NEAR_DAYS,
                       every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    order = sorted((u for u in pages if tier(u) is not None), key=lambda u: (tier(u), min(c['start'] for c in pages[u])))
    read = 0
    for url in order:
        if requests_left() <= 0:
            log.warning('dresdner_philharmonie: request cap reached; %d programme page(s) not read',
                        len(order) - read)
            break
        try:
            d = parse_page(get(url))
        except BudgetExceeded as err:
            log.warning('dresdner_philharmonie: stopped reading programme pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('dresdner_philharmonie: %s failed: %s', url, err)
            continue
        read += 1
        for c in pages[url]:
            if d['people']:
                c['cast'] = d['people']
            c['ticket'] = d['tickets'].get(c['sid']) or c['ticket']
    log.info('dresdner_philharmonie: %d programme page(s) read, %d dates, %d with full cast', read, len(cands),
             sum(1 for c in cands if c['cast'] or c['reused']))

    events = []
    for c in cands:
        if c['cast']:
            credits = cast_credits(c['cast'])
        elif c['reused']:
            credits = c['reused']
        else:
            credits = cast_credits(c['people'])
        try:
            events.append(make_event(
                KEY, c['sid'], c['title'], c['start'], durationMin=c['duration'], city=c['city'],
                venueName=c['venue'], series=c['label'] if c['label'] and c['label'] != c['title'] else None,
                type=_type(c['label'], c['title'], credits, c['program']),
                credits=credits, program=c['program'], ticketUrl=c['ticket'] or c['page'],
                url=c['page'] or BASE + '/de/',
                status='cancelled' if c['cancelled'] else 'scheduled'))
        except ValueError as err:
            log.warning('dresdner_philharmonie %s: skipped: %s', c['sid'], err)
    return events


def _type(label, title, credits, program):
    lab = label.lower()
    roles = {r for r, _ in credits}
    if 'oper' in lab or roles & {'Choir'} or lab.startswith('chor'):
        return 'vocal-opera'
    if lab == 'orgel' or (roles == {'Organ'}):
        return 'recital'
    if 'kammer' in lab:
        return 'chamber'
    if 'Orchestra' in roles or 'sinfonie' in lab or 'Conductor' in roles:
        return 'orchestral'
    if lab == 'stars am klavier' or len([r for r in roles if r not in ('Presenter', 'Narrator')]) == 1:
        return 'recital'
    return None
