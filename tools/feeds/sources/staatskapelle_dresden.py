"""Sächsische Staatskapelle Dresden: the orchestra's own concerts (symphony concerts in the
Semperoper, chamber evenings, special concerts in Dresden) from staatskapelle-dresden.de.

    https://www.staatskapelle-dresden.de/konzerte-und-tickets/                       all dates
    https://www.staatskapelle-dresden.de/konzerte-und-tickets/details/<season>/<slug>/

The concert list carries one schema.org MusicEvent JSON-LD block per date (name, local start
without offset = German time, end, hall, link to the programme page), ~65 dates for the season.
The programme page adds the works ("Komponist" + works), the performers ("Name <span
class=instrument>Rolle</span>") and, per date, the hall and the ticket link. It is read
incrementally (one request per programme, ~30 a season): a date whose previous record
(same id, start and title) has its cast keeps it; the rest of the request cap goes to
programmes still missing it, nearest first, then to programmes in the next week and a fixed
share of the others. The orchestra itself is not listed on its own pages; it is added as
"Sächsische Staatskapelle Dresden" when a conductor leads the concert. Only facts are taken.

The Semperoper's own calendar (reader ``semperoper``) leaves these concerts to this reader.
Skipped: "Kapelle für Kids", symposia, talks and the late-night format "Late Night with
Ludwig" is kept (a concert). Guest concerts abroad are not on this list (tours have their own
page, not read). Checked against the website on 29 Oct 2026 (65 dates, Nov 2026 – Jul 2027).
"""
from __future__ import annotations

import html as _html
import re

from common import (BudgetExceeded, FetchError, clean, event_id, get, jsonld_events, log, looks_cancelled,
                    make_event, previous_event, refresh_due, requests_left)

from ._saxony import berlin_iso, cast_credits, german_town, skip_reason, strip_life_dates

KEY = 'staatskapelle_dresden'
NAME = 'Sächsische Staatskapelle Dresden'
SITE = 'https://www.staatskapelle-dresden.de/'
ATTRIBUTION = 'Source: Sächsische Staatskapelle Dresden (staatskapelle-dresden.de)'
KIND = 'orchestra'
COUNTRY = 'germany'
MAX_REQUESTS = 60
TIME_LIMIT = 400
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 10

BASE = 'https://www.staatskapelle-dresden.de'
LIST = BASE + '/konzerte-und-tickets/'
ORCHESTRA = 'Sächsische Staatskapelle Dresden'
CITY = 'Dresden'

_HALLS = (
    (r'^semperoper$', 'Semperoper Dresden'),
    (r'^semper zwei$', 'Semperoper Dresden, Semper Zwei'),
    (r'kulturpalast', 'Kulturpalast Dresden, Konzertsaal'),
    (r'frauenkirche', 'Frauenkirche Dresden'),
    (r'hellerau', 'Festspielhaus Hellerau'),
    (r'schlosskapelle', 'Schlosskapelle des Dresdner Residenzschlosses'),
)


def _hall(name):
    n = clean(name)
    low = n.lower()
    for rx, hall in _HALLS:
        if re.search(rx, low):
            return hall, CITY
    return n, german_town(n, default=CITY)


def parse_page(page_html):
    """-> {'works': [(composer, title)], 'works_by_day': {(yy, m, d): [(composer, title)]},
           'people': [(role, name)], 'dates': {(yy, m, d, hh, mm): (hall, ticket)}}
    A page for several evenings with different programmes heads each programme with
    '»…« am 14.4.27' (works_by_day)."""
    h = page_html or ''
    out = {'works': [], 'works_by_day': {}, 'people': [], 'dates': {}}
    werke = re.search(r'<div class="werke[^"]*">(.*?)</div>\s*<h3 class="visually-hidden">', h, re.S)
    if werke:
        day = None
        for m in re.finditer(r'<h3[^>]*>(.*?)</h3>|<div class="mb-3">(.*?)</ul>', werke.group(1), re.S):
            if m.group(1) is not None:
                d = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{2,4})', clean(m.group(1)))
                day = (int(d.group(3)) % 100, int(d.group(2)), int(d.group(1))) if d else None
                continue
            block = m.group(2)
            comp = re.search(r'<p[^>]*>(.*?)</p>', block, re.S)
            composer = strip_life_dates(clean(comp.group(1))) if comp else ''
            for li in re.findall(r'<li[^>]*>(.*?)</li>', block, re.S):
                t = clean(li)
                if t:
                    out['works'].append((composer, t))
                    if day:
                        out['works_by_day'].setdefault(day, []).append((composer, t))
    box = re.search(r'<h3 class="visually-hidden">Mitwirkende</h3>(.*?)<div class="mitwirkende"></div>', h, re.S)
    box = box.group(1) if box else ''.join(re.findall(r'<div class="mitwirkende">(.*?)</div>', h, re.S))
    for group in re.findall(r'<p class="kopfzeile[^"]*">(.*?)</p>', box, re.S):
        if clean(group):
            out['people'].append(('', clean(group)))
    box = re.sub(r'<p class="kopfzeile[^"]*">.*?</p>', '', box, flags=re.S)
    for name, role in re.findall(r'<li>([^<]*)<span class="instrument">(.*?)</span>\s*</li>', box, re.S):
        if clean(name):
            out['people'].append((clean(role), clean(name)))
    dates = re.search(r'<div class="dates row">(.*?)</ul>', h, re.S)
    for li in re.findall(r'<li>(.*?)</li>', dates.group(1) if dates else '', re.S):
        day = re.search(r'<div class="date">\s*(\d{1,2}\.\d{1,2}\.\d{2,4})\s*</div>', li)
        tm = re.search(r'<div class="zeit">\s*(\d{1,2}):(\d{2})', li)
        ort = re.search(r'<div class="ort">(.*?)</div>', li, re.S)
        shop = re.search(r'href="(https?://ticket[^"]+)"', li)
        if day and tm:
            d, m, y = day.group(1).split('.')
            key = (int(y) % 100, int(m), int(d), int(tm.group(1)), int(tm.group(2)))
            out['dates'][key] = (clean(ort.group(1)) if ort else '', _html.unescape(shop.group(1)) if shop else None)
    return out


def _date_key(local):
    """'2026-11-07T19:00' -> (26, 11, 7, 19, 0), the key of parse_page()['dates']."""
    return (int(local[:4]) % 100, int(local[5:7]), int(local[8:10]), int(local[11:13]), int(local[14:16]))


def _sid(url, local):
    slug = re.sub(r'^.*/details/', '', url or '').strip('/').replace('/', '-')
    return f'{slug}-{local[:16].replace("-", "").replace(":", "").replace("T", "-")}'


def _type(title, credits, works):
    roles = {r for r, _ in credits}
    text = title.lower()
    if 'kammerabend' in text or 'kammermatinee' in text:
        return 'chamber'
    if 'rezital' in text or 'recital' in text:
        return 'recital'
    if roles & {'Choir'} or any(re.search(r'(?i)requiem|messe|oratori|passion|kantate', t) for _, t in works):
        return 'vocal-opera'
    if 'Orchestra' in roles or 'Conductor' in roles:
        return 'orchestral'
    return None


def fetch():
    page = get(LIST)
    cands, skipped = [], {}
    for ev in jsonld_events(page):
        title = clean(ev.get('name'))
        url = clean(ev.get('url'))
        local = clean(ev.get('startDate'))
        if not title or not re.match(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}', local):
            continue
        why = skip_reason(title)
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        loc = ev.get('location') or {}
        hall, city = _hall(loc.get('name') if isinstance(loc, dict) else '')
        if not city:
            skipped['abroad'] = skipped.get('abroad', 0) + 1
            continue
        start = berlin_iso(local[:16])
        cands.append({
            'sid': _sid(url, local), 'title': title, 'start': start, 'local': local[:16], 'end': clean(ev.get('endDate')) or None,
            'url': url or LIST, 'hall': hall, 'city': city, 'people': None, 'works': [], 'ticket': None,
            'reused': None, 'cancelled': looks_cancelled(title) or 'cancel' in clean(ev.get('eventStatus')).lower(),
        })
    if skipped:
        log.info('staatskapelle_dresden: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    for c in cands:
        prev = previous_event(event_id(KEY, c['sid']), c['start'], title=c['title'])
        if prev and prev.get('credits'):
            c['reused'] = prev
    pages = {}
    for c in cands:
        if c['url'] != LIST:
            pages.setdefault(c['url'], []).append(c)

    def tier(u):
        if any(c['reused'] is None for c in pages[u]):
            return 0
        if refresh_due(u, min(c['start'] for c in pages[u]), near_days=REFRESH_NEAR_DAYS,
                       every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    order = sorted((u for u in pages if tier(u) is not None), key=lambda u: (tier(u), min(c['start'] for c in pages[u])))
    read = 0
    for u in order:
        if requests_left() <= 0:
            break
        try:
            d = parse_page(get(u))
        except BudgetExceeded as err:
            log.warning('staatskapelle_dresden: stopped reading programme pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('staatskapelle_dresden: %s failed: %s', u, err)
            continue
        read += 1
        for c in pages[u]:
            c['people'] = d['people']
            c['works'] = d['works_by_day'].get(_date_key(c['local'])[:3]) or d['works']
            hall, ticket = d['dates'].get(_date_key(c['local']), ('', None))
            if hall:
                c['hall'], c['city'] = _hall(hall)
            c['ticket'] = ticket
    log.info('staatskapelle_dresden: %d programme page(s) read for %d dates', read, len(cands))

    events = []
    for c in cands:
        if c['people'] is not None:
            credits = cast_credits(c['people'])
            works = c['works']
            ticket = c['ticket']
        elif c['reused']:
            credits = [(x.get('role'), x.get('name')) for x in c['reused'].get('credits') or []]
            works = [(p.get('composer') or '', p.get('title') or '') for p in c['reused'].get('program') or []]
            ticket = c['reused'].get('ticketUrl')
        else:
            credits, works, ticket = [], [], None
        roles = {r for r, _ in credits}
        leads = 'Conductor' in roles or any(r.endswith('& direction') for r in roles)
        if leads and not roles & {'Orchestra'} and 'kammer' not in c['title'].lower():
            credits.append(('Orchestra', ORCHESTRA))
        try:
            events.append(make_event(
                KEY, c['sid'], c['title'], c['start'], end=c['end'] and berlin_iso(c['end'][:16]),
                city=c['city'], venueName=c['hall'], type=_type(c['title'], credits, works),
                credits=credits, program=works, ticketUrl=ticket, url=c['url'],
                status='cancelled' if c['cancelled'] else 'scheduled'))
        except ValueError as err:
            log.warning('staatskapelle_dresden %s: skipped: %s', c['sid'], err)
    return events

