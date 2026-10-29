"""Brucknerhaus Linz (LIVA): the classical concerts of the house's event calendar.

    https://www.brucknerhaus.at/programm/veranstaltungen?filter-interests-1=1401&…&page=N
    https://www.brucknerhaus.at/programm/veranstaltungen/<slug-dd.mm.yyyy-hh-mm>      one page per event

The calendar (about 225 events, 50 a page) is filtered on the server by the site's own genre
checkboxes, sent as a plain GET like the site's filter form does; several genres are ORed. The
reader asks for the classical ones: Alte Musik, Bruckner Orchester Linz, Chormusik,
Kammermusik, Klaviermusik, Liederabende, Orchestermusik, Orgelmusik, Originalklang, Serenaden,
Vokalmusik, Zeitgenössische Musik (about 80 events, 2 pages). Each entry has the date
("Mo, 2. Nov 26"), time, hall ("Großer Saal / Brucknerhaus / Linz"), the series line
("BRUCKNER ORCHESTER LINZ"), title, subtitle, the event page and the ticket link. The event
page's slug ends with its date and time and is used as the id.

Performers ("<strong>Maria Ioudenitch</strong> | Violine") and works ("<strong>Maurice
Ravel</strong> // 1875–1937" then "<em>Ma mère l’oye</em>. Suite M. 60 // 1908") are only on
the event page, read incrementally (_austria_east.read_details): an event the previous feed
already has with performers or works keeps them; new events are read first (soonest first),
then those due for a re-read. A first run needs about 60 event pages (~80 requests); later runs
about 15.

The Bruckner Orchester Linz's concerts here are also listed by landestheater_linz (the
orchestra's own house); build.py merges them (same hall and start).

Skipped: Kost-Proben (open rehearsals with lunch), "Chor für alle" (sing-along), children's
formats (midi.music, mini.music, Junges Brucknerhaus), guided tours, introductions and talks.

Checked against the website on 29 Oct 2026: 76 events in the classical genres, 58 kept;
dates, times, halls, performers and works match the event pages.
"""
from __future__ import annotations

import html as _html
import re
import urllib.parse

from common import FetchError, clean, get, log, looks_cancelled, make_event

from ._austria_east import (credits_split, local_iso, month_number, name_role_line, prev_credits, prev_program,
                            program_from_lines, read_details, role_of)

KEY = 'brucknerhaus_linz'
NAME = 'Brucknerhaus Linz'
SITE = 'https://www.brucknerhaus.at/'
ATTRIBUTION = 'Source: Brucknerhaus Linz – LIVA (brucknerhaus.at)'
KIND = 'venue'
COUNTRY = 'austria'
MAX_REQUESTS = 130             # 2–3 listing pages, the rest for event pages
TIME_LIMIT = 900

BASE = 'https://www.brucknerhaus.at'
LISTING = BASE + '/programm/veranstaltungen'
GENRES = (  # (form field number, value): the classical genres of the site's filter
    (1, 1401), (3, 14301), (5, 1459), (11, 166), (15, 1398), (21, 1458), (24, 163), (25, 1399), (26, 1457),
    (29, 6421), (30, 1400), (34, 1402))
MAX_PAGES = 8

_SKIP = re.compile(r'(?i)kost[-.\s]?probe|chor für alle|mitsing|midi\.music|mini\.music|maxi\.music|'
                   r'junges brucknerhaus|'
                   r'f[üu]hrung|einf[üu]hrung|vortrag|gespr[äa]ch|lesung|workshop|kinder|familie|baby|schul')


def _query(page=None):
    q = [(f'filter-interests-{n}', str(v)) for n, v in GENRES]
    if page:
        q.append(('page', str(page)))
    return LISTING + '?' + urllib.parse.urlencode(q)


def parse_listing(page_html):
    rows = []
    for chunk in (page_html or '').split('class="col-12 col-sm-6 col-md-12 event__element"')[1:]:
        href = re.search(r'href="/programm/veranstaltungen/([^"?#]+)"', chunk)
        date = re.search(r'event__date">(.*?)</div>', chunk, re.S)
        loc = re.search(r'event__location">(.*?)</div>', chunk, re.S)
        name = re.search(r'class="display-2 event__name[^"]*">(.*?)</div>', chunk, re.S)
        if not (href and date and loc and name):
            continue
        dparts = [clean(x) for x in re.findall(r'<span class="(?:raleway|opensans)">(.*?)</span>', date.group(1), re.S)]
        lparts = [clean(x) for x in re.findall(r'<span[^>]*>(.*?)</span>', loc.group(1), re.S)]
        time = re.search(r'(\d{1,2}):(\d{2})', ' '.join(lparts))
        # dparts: ['Mo,', '2.', 'Nov', '26']
        try:
            day = int(dparts[1].rstrip('.'))
            month = month_number(dparts[2])
            year = 2000 + int(dparts[3]) if len(dparts[3]) == 2 else int(dparts[3])
        except (IndexError, ValueError):
            continue
        if not (month and time):
            continue
        places = [x for x in lparts if not re.match(r'^\d{1,2}:\d{2}', x)]     # hall, house, town (may be empty)
        top = re.search(r'class="topline">(.*?)<div class="display-2', chunk, re.S)
        sub = re.search(r'home-events__item___subline">(.*?)</div>', chunk, re.S)
        ticket = re.search(r'href="(https://ticket\.liva\.at/[^"]+)"', chunk)
        rows.append({
            'sid': href.group(1), 'page': f'{BASE}/programm/veranstaltungen/{href.group(1)}',
            'start': local_iso(year, month, day, time.group(1), time.group(2)),
            'name': clean(name.group(1)), 'sub': clean(sub.group(1)) if sub else '',
            'top': clean(top.group(1)) if top else '', 'places': places,
            'ticket': _html.unescape(ticket.group(1)) if ticket else None,
        })
    return rows


def _pages(page_html):
    return sorted({int(n) for n in re.findall(r'veranstaltungen\?[^"]*?page=(\d+)', page_html or '')})


def venue(places):
    """['Großer Saal', 'Brucknerhaus', 'Linz'] -> ('Brucknerhaus Linz, Großer Saal', 'Linz')."""
    hall, house, city = (places + ['', '', ''])[:3]
    city = city or 'Linz'
    if house.lower() == 'brucknerhaus' or (not house and 'saal' in hall.lower() and city == 'Linz'):
        return (f'Brucknerhaus Linz, {hall}' if hall else 'Brucknerhaus Linz'), city
    return ', '.join(x for x in (house, hall) if x) or hall or 'Brucknerhaus Linz', city


# ---------------------------------------------------------------------------
# event page
# ---------------------------------------------------------------------------

def _section(h, ident):
    m = re.search(r'<h2[^>]*id="heading-' + ident + r'"[^>]*>.*?</h2>(.*?)(?:<h2|</section>|<a data-toggle|'
                  r'<div class="accordion)', h, re.S)
    return m.group(1) if m else ''


def _lines(fragment):
    s = re.sub(r'(?i)</p>|<br\s*/?>|<p[^>]*>', '\n', fragment or '')
    return [clean(x) for x in s.split('\n')]


# ' // 1875–1937', ' // um 1700', ' // o. J.', ' // 2025–26 [Österreichische Erstaufführung]'
_DATES_RE = re.compile(r'\s*//\s*(?:(?:ca\.|um|vor|nach|rev\.)\s*)?(?:o\.\s*J\.|\d[\d–\-‒/ ,.rev]*)'
                       r'(?:\s*\[[^\]]*\])?\s*(?=\]?\s*$)')


def parse_detail(page_html):
    h = page_html or ''
    lines = []
    for line in _lines(_section(h, 'program')):
        line = _DATES_RE.sub('', line).strip()          # 'Maurice Ravel // 1875–1937' -> 'Maurice Ravel'
        lines.append(line)
    program = program_from_lines(lines)
    credits = []
    for line in _lines(_section(h, 'team')):
        if not line:
            continue
        name, role = name_role_line(line)
        if role and not role_of(role) and role_of(name):  # 'Gesangssolist:innen | A, B, C'
            name, role = role, name
        for c in credits_split(name, role, character_ok=True):   # 'Werner Güra | Evangelist'
            if c not in credits:
                credits.append(c)
    return {'credits': credits, 'program': program}


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def fetch():
    first = get(_query())
    pages = [first]
    for n in [p for p in _pages(first) if p > 1][:MAX_PAGES - 1]:
        try:
            pages.append(get(_query(n)))
        except FetchError as err:
            log.warning('brucknerhaus_linz: listing page %d failed: %s', n, err)
    rows, seen = [], set()
    for page in pages:
        for r in parse_listing(page):
            if r['sid'] not in seen:
                seen.add(r['sid'])
                rows.append(r)
    kept = []
    for r in rows:
        if _SKIP.search(f"{r['top']} {r['name']} {r['sub']}"):
            log.debug('brucknerhaus_linz: skipped %s: %s', r['sid'], r['name'])
            continue
        r['title'] = r['name'] + (f" – {r['sub']}" if r['sub'] and r['sub'].lower() not in r['name'].lower() else '')
        kept.append(r)
    log.info('brucknerhaus_linz: %d events in the classical genres (%d page(s)), %d kept', len(rows), len(pages),
             len(kept))
    details, previous = read_details(KEY, kept, lambda url: parse_detail(get(url)), every_days=10)
    events = []
    for r in kept:
        d, prev = details.get(r['page']), previous.get(r['sid'])
        name, city = venue(r['places'])
        series = r['top'].title() if r['top'] and r['top'].upper() == r['top'] else r['top']
        if series and re.search(r'(?i)gastveranstaltung', series):
            series = None
        try:
            events.append(make_event(
                KEY, r['sid'], r['title'], r['start'], city=city, venueName=name, series=series,
                credits=d['credits'] if d else prev_credits(prev), program=d['program'] if d else prev_program(prev),
                ticketUrl=r['ticket'], url=r['page'],
                status='cancelled' if looks_cancelled(f"{r['name']} {r['sub']} {r['top']}") else 'scheduled'))
        except ValueError as err:
            log.warning('brucknerhaus_linz %s: skipped: %s', r['sid'], err)
    return events
