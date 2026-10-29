"""Esterházy (Eisenstadt, St. Margarethen, Forchtenstein): concerts in Schloss Esterházy's
Haydnsaal, the Herbstgold festival, the piano festival and the opera in the St. Margarethen
quarry, from the Esterházy calendar (esterhazy.at).

    https://esterhazy.at/veranstaltungen?category[0]=2305&…&start=…&end=…     one month per request
    https://esterhazy.at/veranstaltungen/<category>/<slug>                    one page per event / series

The official Haydn concerts in Eisenstadt are Esterházy's own ("Classic", "Herbstgold",
"Pianofestival", "Konzert"); haydnfestival.at is not an official site and is not used.

The calendar is a Craft CMS page filtered by GET parameters: the categories Oper (2305),
Konzert (2315), Classic (25766), Herbstgold (68801) and Pianofestival (954668); ``start`` /
``end`` give the range, but the site answers with at most one calendar month (a longer range
is cut to its first month; a range before today or past the published season falls back to
the next weeks), so the reader asks month by month, from today up to 450 days ahead, and
drops repeated entries. Each entry has date and time ("07.11.2026 19:30"), place and
category ("Schloss Esterházy | Konzert"), title, a line with the performers ("Alexandre
Kantorow, Klavier | Sir Antonio Pappano, Dirigent | Chamber Orchestra of Europe") or a short
blurb (not used), the badge "Fremdveranstaltung" (a hired hall) and the ticket link. The id is
the event page's slug plus date and time (an event page can serve several dates).

The works ("Johannes Brahms: Konzert für Klavier und Orchester Nr. 1 d-Moll op. 15") are on
the event page, read incrementally (_austria_east.read_details); a page shared by several
programmes (the Herbstgold and piano festival pages) is not used for works.

Places: Schloss Esterházy -> Eisenstadt; Steinbruch St. Margarethen -> St. Margarethen;
Burg Forchtenstein -> Forchtenstein; Schloss Lackenbach -> Lackenbach.

Skipped: rock/pop festivals and wind-band concerts in the castle yard or hired halls
("Lovely Days", "Forestglade", "Butterfly Dance", Musikverein and military bands), jazz,
world music, cinema, talks, children's shows, guided tours and markets (other categories).

Checked against the website on 29 Oct 2026: 63 entries in the music categories up to Nov
2027, 48 kept (incl. 19 Rigoletto performances in St. Margarethen, summer 2027); dates,
times, places and performers match the calendar and the event pages.
"""
from __future__ import annotations

import calendar
import html as _html
import re
import urllib.parse
from datetime import date, timedelta

from common import FetchError, clean, get, log, looks_cancelled, make_event, today_zurich

from ._austria_east import (composer_like, credit, group_of, local_iso, name_role_line, prev_credits, prev_program,
                            program_from_lines, read_details, role_of, work_line)

KEY = 'esterhazy_eisenstadt'
NAME = 'Esterházy – Haydn in Eisenstadt'
SITE = 'https://esterhazy.at/veranstaltungen'
ATTRIBUTION = 'Source: Esterházy Betriebe (esterhazy.at)'
KIND = 'venue'
COUNTRY = 'austria'
MAX_REQUESTS = 60              # 15 months of calendar + event pages
TIME_LIMIT = 600

BASE = 'https://esterhazy.at'
LISTING = BASE + '/veranstaltungen?'
CATEGORIES = (2305, 2315, 25766, 68801, 954668)    # Oper, Konzert, Classic, Herbstgold, Pianofestival
ELEMENT = '461655'
WINDOW_DAYS = 450

_PLACES = (
    (r'steinbruch', 'Steinbruch St. Margarethen', 'St. Margarethen'),
    (r'forchtenstein', 'Burg Forchtenstein', 'Forchtenstein'),
    (r'lackenbach', 'Schloss Lackenbach', 'Lackenbach'),
    (r'^schloss esterh[áa]zy|^schloss$', 'Schloss Esterházy', 'Eisenstadt'),
)
_SKIP = re.compile(r'(?i)lovely days|forestglade|butterfly|cinello|kinder|famil|talk\b|vortrag|jazz|stride|'
                   r'weltmusik|kino|militär|military|musikverein|bauernkapelle|blasmusik|winterreifen|\bf[üu]hrung')


def place(text):
    t = clean(text)
    for rx, venue, city in _PLACES:
        if re.search(rx, t, re.I):
            return venue, city
    return t or 'Schloss Esterházy', 'Eisenstadt'


def _months(today):
    last = today + timedelta(days=WINDOW_DAYS)
    y, m = today.year, today.month
    while (y, m) <= (last.year, last.month):
        first = max(date(y, m, 1), today)
        end = date(y, m, calendar.monthrange(y, m)[1])
        yield first, end
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def _url(first, end):
    q = [(f'category[{i}]', str(c)) for i, c in enumerate(CATEGORIES)]
    q += [('elementId', ELEMENT), ('limit', '100'), ('offset', '0'), ('start', f'{first.isoformat()} 00:00:00'),
          ('end', f'{end.isoformat()} 23:59:59'), ('appointmentsSortMode', 'chronological'),
          ('onlyMainCalendarSeries', '0')]
    return LISTING + urllib.parse.urlencode(q)


_EVENT_RE = re.compile(r'<div\s+class="event mb-2"[^>]*>(.*?)(?=<div\s+class="event mb-2"|<footer|$)', re.S)


def parse_listing(page_html):
    rows = []
    for body in _EVENT_RE.findall(page_html or ''):
        href = re.search(r'href="(https://esterhazy\.at/veranstaltungen/[^"]+)"', body)
        small = re.findall(r'class="smalltext[^"]*">([^<]*)<', body)
        title = re.search(r'class="h3 mt-0">(.*?)</p>', body, re.S)
        if not (href and len(small) >= 2 and title):
            continue
        m = re.match(r'\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})', small[0])
        if not m:
            continue
        d, mo, y, hh, mm = m.groups()
        where, _, category = clean(small[1]).partition('|')
        line = re.search(r'class="h3 mt-0">.*?</p>\s*<p>(.*?)</p>', body, re.S)
        ticket = [u for u in re.findall(r'href="(https?://[^"]+)"', body) if 'esterhazy.at/veranstaltungen' not in u]
        page = _html.unescape(href.group(1))
        slug = page.rstrip('/').rsplit('/', 1)[-1]
        rows.append({
            'page': page, 'sid': f'{slug}-{y}{int(mo):02d}{int(d):02d}{int(hh):02d}{mm}',
            'start': local_iso(y, mo, d, hh, mm), 'where': clean(where), 'category': clean(category),
            'title': clean(title.group(1)), 'line': clean(line.group(1)) if line else '',
            'hired': 'Fremdveranstaltung' in body, 'ticket': _html.unescape(ticket[0]) if ticket else None,
            'labels': ' '.join(clean(x) for x in re.findall(r'class="badge[^"]*">(.*?)</span>', body, re.S)),
        })
    return rows


def line_credits(line):
    """'Alexandre Kantorow, Klavier | Sir Antonio Pappano, Dirigent | Chamber Orchestra of Europe' -> credits;
    [] for a blurb."""
    parts = [p.strip() for p in re.split(r'\||\s+I\s+', line.replace('\ufeff', '')) if p.strip()]   # 'Muti I Wiener …'
    if not parts or len(line) > 300 or any(len(p.split()) > 9 for p in parts):
        return []
    out = []
    for p in parts:
        name, role = name_role_line(p)
        if not (composer_like(name) or group_of(name)) or role_of(name):
            return []                                   # 'Klavier - Recital': a subtitle, not performers
        c = credit(name, role)
        if c and c not in out:
            out.append(c)
    return out


def parse_detail(page_html):
    h = page_html or ''
    lines = []
    for card in re.findall(r'<div\s+class="card sidebar-card[^"]*"[^>]*><div\s+class="card-body">(.*?)</div>', h, re.S):
        if ':' not in clean(card) or re.search(r'(?i)kategorie|ticket|tel\.|@|€', clean(card)):
            continue
        lines += re.split(r'(?i)<br\s*/?>|</p>', card) + ['']
    program = [p for p in program_from_lines(lines) if p] or \
        [w for w in (work_line(x) for x in lines) if w]
    head = re.search(r'id="headingOne">(.*?)<div', h, re.S)
    credits = []
    for raw in re.split(r'(?i)<br\s*/?>', head.group(1) if head else ''):
        name, role = name_role_line(raw)
        c = credit(name, role)
        if c and c not in credits:
            credits.append(c)
    return {'credits': credits, 'program': program}


def fetch():
    today = today_zurich()
    rows, seen = [], set()
    for i, (first, end) in enumerate(_months(today)):
        try:
            page = get(_url(first, end))
        except FetchError as err:
            if i == 0:
                raise
            log.warning('esterhazy_eisenstadt: month %s failed: %s', first, err)
            continue
        for r in parse_listing(page):
            if r['sid'] not in seen:
                seen.add(r['sid'])
                rows.append(r)
    kept = []
    for r in rows:
        if _SKIP.search(f"{r['title']} {r['line']}") or (r['hired'] and r['category'] != 'Oper' and
                                                          re.search(r'(?i)band|kapelle|festival', r['title'])):
            log.debug('esterhazy_eisenstadt: skipped %s', r['title'])
            continue
        kept.append(r)
    log.info('esterhazy_eisenstadt: %d entries in the music categories, %d kept', len(rows), len(kept))
    titles_per_page = {}
    for r in kept:
        titles_per_page.setdefault(r['page'], set()).add(r['title'])
    details, previous = read_details(KEY, kept, lambda url: parse_detail(get(url)), every_days=7)
    events = []
    for r in kept:
        venue, city = place(r['where'])
        d, prev = details.get(r['page']), previous.get(r['sid'])
        shared = len(titles_per_page.get(r['page'], ())) > 1
        credits = line_credits(r['line'])
        if not credits and not shared:
            credits = d['credits'] if d else prev_credits(prev)
        program = [] if shared else (d['program'] if d else prev_program(prev))
        series = re.match(r'(?i)(herbstgold|zu pfingsten|quartetto plus)\b', r['title'])
        try:
            events.append(make_event(
                KEY, r['sid'], r['title'], r['start'], city=city, venueName=venue,
                type='vocal-opera' if r['category'] == 'Oper' else None,
                series=series.group(1).title() if series else None,
                credits=credits, program=program, ticketUrl=r['ticket'], url=r['page'],
                status='cancelled' if looks_cancelled(f"{r['title']} {r['labels']}") else 'scheduled'))
        except ValueError as err:
            log.warning('esterhazy_eisenstadt %s: skipped: %s', r['sid'], err)
    return events
