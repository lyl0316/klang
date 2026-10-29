"""Münchener Kammerorchester (MKO): the orchestra's season calendar (HTML, WordPress).

    https://www.m-k-o.eu/programm/alle-veranstaltungen/        every event of the season, one page
    https://www.m-k-o.eu/event-detail/<id>/<name>               one page per event

The listing has one block per event: the date ("12.11.2026"), the title, a subtitle (often
the series: "2. Abokonzert", "Sonntags um 11"), the time ("20 Uhr", "19.30 Uhr", Munich
local time), the hall, the performers ("Sarah Aristidou, Sopran | Bas Wiegers, Dirigent")
and the composers ("Werke von Claude Debussy | Claude Vivier | …"). The event page adds the
works ("Claude Debussy, Petite Suite …") and the ticket link. Event pages are read
incrementally (cap 80): an event whose listing is unchanged since the previous feed (same id,
start and title; its performers and composers all in the earlier record) keeps the works read
before; the requests left go to events still missing them, soonest first, then to events in
the next week and a fixed share of the others (each about every two weeks). An event not read
yet keeps the composers from the listing.

Tours: for a guest concert the listing's title is often the town ("Olten", "Erlangen",
"Konzerthaus Ravensburg") and the hall has no town ("Stadttheater"), so the town is looked
up in the hall, then the title and subtitle. German towns are kept with their English name
(Stuttgart, Frankfurt, Hamburg, Bayreuth …); concerts abroad (Olten, Zürich, Amsterdam,
Rotterdam) are left out. A hall without a known town is in Munich.

Skipped: the children's concert, the MVHS talk series ("Im Rampenlicht", "In Kooperation mit
der MVHS"), the rehearsal visit "MKO Inside" and events without a time.

The imprint reserves the content under German copyright; Klang takes facts only (date, time,
hall, performers, works, links). Checked against the website on 29 Oct 2026: 46 events listed,
37 kept (5 abroad, 4 talks/rehearsal visit/children).
"""
from __future__ import annotations

import html as _html
import re

from common import (BudgetExceeded, FetchError, clean, event_id, get, infer_type, log, looks_cancelled, make_event,
                    previous_event, refresh_due, requests_left)

from ._south_germany import (credit, dedupe_credits, in_window, local_iso, name_key, parse_day, parse_time, role,
                             skip_title, town)

KEY = 'muenchener_kammerorchester'
NAME = 'Münchener Kammerorchester'
SITE = 'https://www.m-k-o.eu/'
ATTRIBUTION = 'Source: Münchener Kammerorchester (m-k-o.eu)'
KIND = 'orchestra'
COUNTRY = 'germany'
MAX_REQUESTS = 80             # 1 listing request + ~45 event pages, with room for retries
TIME_LIMIT = 400
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 14

BASE = 'https://www.m-k-o.eu'
LISTING = BASE + '/programm/alle-veranstaltungen/'
ORCHESTRA = 'Münchener Kammerorchester'

_SERIES_RE = re.compile(r'(?i)^\d+\.\s*abokonzert$|^sonntags um 11$|^nachtmusik der moderne$|^kulturzeit\b|festival|'
                        r'meisterkonzerte|^gve konzert$')
_NOT_WORK_RE = re.compile(r'(?i)^(?:pause\b|nn$|n\.n\.$|folgt in kürze)')
_SKIP_RE = re.compile(r'(?i)kooperation mit der mvhs|im rampenlicht|mko inside|proben- und konzertereignis|'
                      r'freundeskreis')


def _text(fragment):
    return clean(_html.unescape(fragment or ''))


def _performers(text):
    """'Sarah Aristidou, Sopran | Bas Wiegers, Dirigent' -> [(name, role)]"""
    out = []
    for part in re.split(r'\s*\|\s*|<br\s*/?>', text or ''):
        part = _text(part)
        if not part:
            continue
        name, _, role = part.partition(',')
        out.append((name.strip(), role.strip()))
    return out


def parse_listing(page_html):
    rows = []
    for block in re.split(r'<h3 class="wp-block-heading mt0">', page_html or '')[1:]:
        block = block.split('class="wp-block-buttons')[0]
        day = parse_day(block[:20])
        title = re.search(r'<span>(.*?)</span>\s*</h3>', block, re.S)
        info = re.search(r'</h3>\s*<p>(.*?)</p>', block, re.S)
        href = re.search(r'<a href="(https://www\.m-k-o\.eu/event-detail/(\d+)/[^"]*)"', block)
        if not (day and title and info and href):
            continue
        spans = [_text(s) for s in re.findall(r'<span>(.*?)</span>', info.group(1), re.S)]
        sub = _text(re.split(r'</br>|<br\s*/?>|<span>', info.group(1))[0])
        when = parse_time(spans[0]) if spans else None
        venue = spans[1] if len(spans) > 1 else ''
        paras = re.findall(r'<p(?: class="([^"]*)")?>(.*?)</p>', block[info.end():], re.S)
        performers, composers = [], []
        for cls, body in paras:
            if 'workItems' in (cls or ''):
                text = re.sub(r'(?i)^\s*werke von\s*', '', _text(body))
                composers = [c.strip() for c in text.split('|') if c.strip() and c.strip().lower() != 'pause']
            elif not cls:
                performers = _performers(body)
        m = re.fullmatch(r'([^,]{3,60}),\s*([^,]{3,40})', sub)
        if m and role(m.group(2)) and not performers:      # 'Brad Lubman, Dirigent' in the subtitle line
            performers, sub = [(m.group(1).strip(), m.group(2).strip())], ''
        rows.append({
            'id': href.group(2), 'url': _html.unescape(href.group(1)).replace(' ', '%20'),
            'day': day, 'time': when, 'title': _text(title.group(1)), 'sub': sub,
            'venue': '' if re.search(r'(?i)noch unbekannt|tba', venue) else venue,
            'performers': performers, 'composers': composers,
        })
    return rows


def parse_detail(page_html):
    """-> {'performers': [(name, role)], 'works': [(composer, title)], 'ticket': url|None}"""
    h = page_html or ''
    out = {'performers': [], 'works': [], 'ticket': None}
    side = re.search(r'<h4 class="text-transform-none hide-on-mobile">.*?</h4>(.*?)'
                     r'(?:<h2 class="opas_chronik|Ähnliche Konzerte|$)', h, re.S)
    if side:
        part = side.group(1)
        prog_at = part.find('<b>Programm</b>')
        cast = part[:prog_at] if prog_at >= 0 else part
        for body in re.findall(r'<p>(.*?)</p>', cast, re.S):
            out['performers'].extend(_performers(body))
        if prog_at >= 0:
            for body in re.findall(r'<p>(.*?)</p>', part[prog_at:], re.S):
                lines = [_text(x) for x in re.split(r'<br\s*/?>', body)]
                lines = [x for x in lines if x]
                if not lines or _NOT_WORK_RE.match(lines[0]):
                    continue
                if len(lines) >= 2:
                    out['works'].append((lines[0].rstrip(', '), ' '.join(lines[1:])))
                else:
                    comp, _, work = lines[0].partition(',')
                    out['works'].append((comp.strip(), work.strip()))
    ticket = re.search(r'<a class="wp-block-button__link wp-element-button" href="([^"]+)"[^>]*>\s*Tickets\s*</a>', h)
    if ticket:
        out['ticket'] = _html.unescape(ticket.group(1))
    return out


def _listing_matches(r, prev):
    cast = {name_key(x.get('name')) for x in prev.get('credits') or []}
    if any(name_key(n) not in cast for n, _ in r['performers'] if n):
        return False
    composers = ' | '.join(name_key(p.get('composer')) for p in prev.get('program') or [])
    return all(name_key(c) in composers for c in r['composers'])


def _type(r, credits, program):
    t = infer_type(r['title'], credits, program, r['sub'], solo_rule=False)
    if t:
        return t
    return 'orchestral'


def fetch():
    rows = parse_listing(get(LISTING))                      # FetchError propagates
    cands, skipped = [], {}

    def skip(why):
        skipped[why] = skipped.get(why, 0) + 1

    for r in rows:
        if not in_window(r['day']):
            skip('outside the window')
            continue
        if not r['time']:
            skip('no time')
            continue
        if skip_title(r['title'], r['sub']) or _SKIP_RE.search(f"{r['title']} {r['sub']}"):
            skip('children / talk / rehearsal')
            continue
        city = town(r['venue'], r['title'], r['sub']) or 'Munich'
        if city == 'abroad':
            skip('abroad')
            continue
        r['city'] = city
        r['start'] = local_iso(r['day'], *r['time'])
        cands.append(r)
    if skipped:
        log.info('%s: %d listed; skipped %s', KEY, len(rows), ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    for r in cands:
        prev = previous_event(event_id(KEY, r['id']), r['start'], title=r['title'])
        if prev and _listing_matches(r, prev) and prev.get('program'):
            r['prev'] = prev

    def tier(r):
        if not r.get('prev'):
            return 0
        if refresh_due(r['id'], r['start'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    read = 0
    for r in sorted((r for r in cands if tier(r) is not None), key=lambda r: (tier(r), r['start'])):
        if requests_left() <= 0:
            break
        try:
            r['detail'] = parse_detail(get(r['url']))
            read += 1
        except BudgetExceeded as err:
            log.warning('%s: stopped reading event pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: event page failed: %s', KEY, r['id'], err)
    log.info('%s: %d event page(s) read, %d events reuse earlier details', KEY, read,
             sum(1 for r in cands if r.get('prev') and not r.get('detail')))

    events = []
    for r in cands:
        d = r.get('detail') or {}
        prev = r.get('prev') if not d else None
        performers = d.get('performers') or r['performers']
        credits = [x for x in (credit(n, role) for n, role in performers) if x]
        program = [(c, t) for c, t in d.get('works') or [] if not _NOT_WORK_RE.match(c) and not _NOT_WORK_RE.match(t)]
        program = program or [(c, '') for c in r['composers'] if not _NOT_WORK_RE.match(c)]
        ticket = d.get('ticket')
        if prev:
            program = [(p.get('composer') or '', p.get('title') or '') for p in prev.get('program') or []] or program
            if len(prev.get('credits') or []) > len(credits):
                credits = [(x.get('role'), x.get('name')) for x in prev['credits']]
            ticket = prev.get('ticketUrl')
        opera = bool(re.search(r'(?i)\boper\b', r['title']))
        credits = dedupe_credits(credits)
        if not any(n == ORCHESTRA for _, n in credits):
            credits.append(('Orchestra', ORCHESTRA))
        try:
            events.append(make_event(
                KEY, r['id'], r['title'], r['start'], city=r['city'], venueName=r['venue'] or None,
                type='vocal-opera' if opera else _type(r, credits, program),
                series=r['sub'] if _SERIES_RE.search(r['sub']) else None,
                credits=credits, program=program, ticketUrl=ticket, url=r['url'],
                status='cancelled' if looks_cancelled(f"{r['title']} {r['sub']}") else None))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, r['id'], err)
    return events
