"""Kammerphilharmonie Graubünden: the orchestra's concerts in Chur and across Graubünden (and its
guest concerts elsewhere in Switzerland).

    https://www.kammerphilharmonie.ch/de/                         "Kommende Veranstaltungen"
    https://www.kammerphilharmonie.ch/de/konzerte/termine/<x>.php one page per date

The start page lists every upcoming date: day ("20. November 2026"), local start ("19.00 Uhr"),
title, format (Sinfoniekonzert, Chorkonzert, Oper, Weihnachtsgala ...), place ("Martinskirche
Chur", "Bündner Arena, Cazis") and ticket link. A date page adds the line-up ("Besetzung":
"Philippe Bach, Dirigent") and the programme (composer + work). Pages are fetched once per
programme (same title); a date whose place is missing from the list gets its own page.

Skipped: children's projects (Orchesterchaos), family actions and the chanson show "à la Diva".
"""
from __future__ import annotations

import html as htmllib
import re
from urllib.parse import urljoin

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, today_zurich
from ._east import NOT_A_CONCERT, find_date, find_time, fold, group_role, infer_type, is_group, local_iso, role_for

KEY = 'kammerphilharmonie_gr'
NAME = 'Kammerphilharmonie Graubünden'
SITE = 'https://www.kammerphilharmonie.ch/'
ATTRIBUTION = 'Source: Kammerphilharmonie Graubünden (kammerphilharmonie.ch)'
KIND = 'orchestra'
MAX_REQUESTS = 40
TIME_LIMIT = 240

BASE = 'https://www.kammerphilharmonie.ch'
LISTING = BASE + '/de/'
SKIP = re.compile(r'knef|chanson|orchesterchaos|familienaktion|anmeldung|kinderkonzert|musical')
TYPES = {'oper': 'vocal-opera', 'chorkonzert': 'vocal-opera', 'sinfoniekonzert': 'orchestral',
         'neujahrskonzert': 'orchestral', 'winterkonzert': 'orchestral', 'weihnachtsgala': 'orchestral',
         'live in concert': 'orchestral', 'kammermusik': 'chamber'}


def _entries(page):
    out = {}
    for li in re.findall(r'<li class="listEntry listEntryObject-event[^"]*"[^>]*>(.*?)</li>', page, re.S):
        url = re.search(r'data-url="([^"]+)"', li)
        day = re.search(r'daydate dayFrom">([^<]*)<', li)
        hm = re.search(r'timeFrom">([^<]*)<', li)
        title = re.search(r'listEntryTitle">(.*?)</h3>', li, re.S)
        if not (url and day and hm and title):
            continue
        u = urljoin(BASE, htmllib.unescape(url.group(1)))
        desc = re.search(r'listEntryDescription">(.*?)</div>(.*?)(?:<a class="listEntryTicket|</div>)', li, re.S)
        ticket = re.search(r'class="listEntryTicket" href="([^"]+)"', li)
        entry = {'url': u, 'day': clean(day.group(1)), 'time': clean(hm.group(1)), 'title': clean(title.group(1)),
                 'format': clean(desc.group(1)) if desc else '', 'place': clean(desc.group(2)) if desc else '',
                 'ticket': htmllib.unescape(ticket.group(1)) if ticket else None}
        old = out.get(u)
        if not old or (not old['place'] and entry['place']):  # the same date appears in several lists
            out[u] = entry
    return list(out.values())


def _details(url):
    page = get(url)
    head = re.search(r'<h1>(.*?)</h1>', page, re.S)
    place = re.search(r'<div class="dateEntry">.*?</div>\s*([^<]+?)\s*</strong>', page, re.S)
    ticket = re.search(r'class="linkButton" href="([^"]+)"[^>]*>\s*» Tickets', page)
    credits, program = [], []
    cast = re.search(r'<h2>\s*(?:<strong>)?Besetzung(?:</strong>)?.*?</h2>(.*?)</div>', page, re.S)
    if cast:
        for line in re.split(r'<br\s*/?>|</p>', cast.group(1)):
            m = re.match(r'\s*(?:<p>)?\s*<strong>(.*?)</strong>\s*(.*)$', line, re.S)
            if not m:
                continue
            name, label = clean(m.group(1)).rstrip(','), clean(m.group(2))
            if re.search(r'^musiker|^mitglieder', fold(name)):
                continue                                    # "Musikerinnen und Musiker der Kammerphilharmonie"
            else:
                role = role_for(label, name) if label else (group_role(name) if is_group(name) else 'Performer')
            if name and role:
                credits.append((role, name))
    prog = re.search(r'<h2>\s*Programm\s*</h2>(.*?)</div>', page, re.S)
    if prog:
        for para in re.findall(r'<p>(.*?)</p>', prog.group(1), re.S):
            composer = re.match(r'\s*<strong>(.*?)</strong>', para, re.S)
            lines = [clean(x) for x in re.split(r'<br\s*/?>', re.sub(r'<em>.*?</em>', '', para, flags=re.S))[1:]]
            if composer and lines and lines[0] and not re.search(r'filmklassiker|live-orchester|regie:', fold(lines[0])):
                name = re.sub(r'\s*\(\s*[*†]?\s*\d{4}(?:\s*[-–]\s*\d{4})?\s*\)\s*$', '', clean(composer.group(1)))
                work = lines[0]
                if re.search(r'[-–]$', work) and len(lines) > 1 and lines[1]:
                    work = f'{work} {lines[1]}'               # 'Il sault dils morts –' + 'Der Ilanzer Totentanz (2026)'
                elif re.match(r'(?:ein|eine)\b', fold(work)):  # 'Eine Bündner Jäger-Oper ...' is a genre, not the title
                    named = re.search(r'«([^»]+)»', clean(para))
                    work = named.group(1) if named else None
                if work:
                    program.append((name, work))
    return {'format': clean(head.group(1)).split('» ')[-1] if head else '', 'place': clean(place.group(1)) if place else '',
            'credits': credits, 'program': program, 'ticket': htmllib.unescape(ticket.group(1)) if ticket else None}


def _city(place):
    if ',' in place:
        return place.rsplit(',', 1)[1].strip()
    words = place.split()
    return words[-1] if words else None


def fetch():
    today = today_zurich()
    entries = []
    for e in _entries(get(LISTING)):                        # FetchError propagates
        ymd, hm = find_date(e['day']), find_time(e['time'])
        if not (ymd and hm):
            continue
        text = fold(f"{e['title']} {e['format']}")
        if SKIP.search(text) or NOT_A_CONCERT.search(text):
            continue
        start = local_iso(*ymd, *hm)
        if to_zurich_datetime(start).date() < today:
            continue
        entries.append(dict(e, start=start))
    entries.sort(key=lambda e: e['start'])

    by_title, own = {}, {}
    for e in entries:                                      # dates without a place first need their own page
        if not e['place'] and requests_left() > 0:
            try:
                own[e['url']] = _details(e['url'])
                by_title.setdefault(fold(e['title']), own[e['url']])
            except FetchError as err:
                log.warning('%s: no details for %s: %s', KEY, e['url'], err)
    for e in entries:
        key = fold(e['title'])
        if key not in by_title and requests_left() > 0:
            try:
                by_title[key] = _details(e['url'])
            except FetchError as err:
                log.warning('%s: no details for %s: %s', KEY, e['url'], err)
                by_title[key] = None

    events = []
    for e in entries:
        d = own.get(e['url']) or by_title.get(fold(e['title'])) or {}
        mine = own.get(e['url']) or {}
        place = e['place'] or mine.get('place') or ''
        fmt = e['format'] or mine.get('format') or d.get('format') or ''
        if SKIP.search(fold(fmt)):
            continue
        credits = d.get('credits') or []
        kind = TYPES.get(fold(fmt)) or infer_type(f"{e['title']} {fmt}", credits)
        try:
            events.append(make_event(
                KEY, e['url'].rsplit('/', 1)[-1].replace('.php', ''), e['title'], e['start'],
                city=_city(place), venueName=place or None, type=kind, series=fmt or None,
                credits=credits, program=d.get('program'), ticketUrl=e['ticket'] or mine.get('ticket'), url=e['url'],
                status='cancelled' if looks_cancelled(f"{e['title']} {fmt}") else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, e['url'], err)
    return events
