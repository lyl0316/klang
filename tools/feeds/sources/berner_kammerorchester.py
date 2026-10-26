"""Berner Kammerorchester (BKO): the orchestra's subscription and guest concerts in and around Bern.

    https://www.bko.ch/de/konzerte/                       the "Veranstaltungskalender" of upcoming dates
    https://www.bko.ch/de/konzerte/termine/<name>.php     one page per concert

The calendar lists each upcoming concert (date, hall, title, page). The concert page has the date
("Fr., 30. Oktober 2026"), the local start ("19:30 Uhr"), the hall, the line-up ("Patrick Demenga |
Violoncello", "Philippe Bach | Dirigent") and the programme table (composer, work). The orchestra
publishes its season per calendar year, so the list can be short between seasons.
"""
from __future__ import annotations

import html as htmllib
import re
from urllib.parse import urljoin

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, today_zurich
from ._east import NOT_A_CONCERT, find_date, find_time, fold, group_role, infer_type, is_group, local_iso, role_for

KEY = 'berner_kammerorchester'
NAME = 'Berner Kammerorchester'
SITE = 'https://www.bko.ch/'
ATTRIBUTION = 'Source: Berner Kammerorchester (bko.ch)'
KIND = 'orchestra'
MAX_REQUESTS = 25
TIME_LIMIT = 120

BASE = 'https://www.bko.ch'
LISTING = BASE + '/de/konzerte/'
ORCHESTRA = 'Berner Kammerorchester'
TOWNS = ('Bern', 'Biel', 'Thun', 'Spiez', 'Münsingen', 'Riggisberg', 'Langnau i. Emmental', 'Zweisimmen', 'Meiringen',
         'Moutier', 'Herzogenbuchsee', 'Burgdorf', 'Laupen', 'Zürich', 'Zug', 'Luzern', 'Basel', 'Interlaken')


def _city(hall):
    for town in TOWNS:
        if re.search(r'\b%s\b' % re.escape(town), hall):
            return town
    words = hall.split()
    return words[-1] if len(words) > 1 else 'Bern'


def _details(url):
    page = get(url)
    head = re.search(r'class="elementStandard elementContent eventHeader">(.*?)</div>', page, re.S)
    head = head.group(1) if head else ''
    day = re.search(r'class="date">(.*?)</span>', head, re.S)
    hm = re.search(r'class="time">(.*?)</span>', head, re.S)
    hall = re.search(r'class="location">(.*?)</span>', head, re.S)
    ticket = re.search(r'href="([^"]+)" class="cart"', head)
    title = re.search(r'<h1>(.*?)</h1>', page, re.S)
    credits = []
    for line in re.findall(r'<h3 class="accordionHeader"[^>]*>(.*?)<span class="accordionHeaderOpener"', page, re.S):
        name, _, label = clean(line).partition('|')
        name, label = name.strip(), label.strip()
        if not name:
            continue
        role = role_for(label, name) if label else (group_role(name) if is_group(name) else 'Performer')
        if role:
            credits.append((role, name))
    program = []
    table = re.search(r'id="anchor_[^"]*_Programm".*?<table[^>]*>(.*?)</table>', page, re.S)
    for composer, work in re.findall(r'<tr>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*</tr>', table.group(1) if table else '', re.S):
        composer = re.sub(r'\s*\(\s*[*†]?\s*\d{4}(?:\s*[-–]\s*\d{4})?\s*\)\s*$', '', clean(composer))
        if composer and clean(work):
            program.append((composer, clean(work)))
    return {'day': clean(day.group(1)) if day else '', 'time': clean(hm.group(1)) if hm else '',
            'hall': clean(hall.group(1)) if hall else '', 'title': clean(title.group(1)) if title else '',
            'ticket': htmllib.unescape(ticket.group(1)) if ticket else None, 'credits': credits, 'program': program}


def fetch():
    today = today_zurich()
    page = get(LISTING)                                     # FetchError propagates
    urls = []
    for li in re.findall(r'<li class="listEntry[^"]*listEntryObject-event[^"]*"[^>]*data-url="([^"]+)"', page):
        u = urljoin(BASE, htmllib.unescape(li))
        if u not in urls:
            urls.append(u)
    events = []
    for url in urls:
        if requests_left() <= 0:
            break
        try:
            d = _details(url)
        except FetchError as err:
            log.warning('%s: no page for %s: %s', KEY, url, err)
            continue
        ymd, hm = find_date(d['day']), find_time(d['time'])
        if not (ymd and hm and d['title']) or NOT_A_CONCERT.search(fold(d['title'])):
            continue
        start = local_iso(*ymd, *hm)
        if to_zurich_datetime(start).date() < today:
            continue
        credits = d['credits']
        if not any(r == 'Orchestra' for r, _ in credits):
            credits = credits + [('Orchestra', ORCHESTRA)]
        try:
            events.append(make_event(
                KEY, url.rsplit('/', 1)[-1].replace('.php', ''), d['title'], start, city=_city(d['hall']),
                venueName=d['hall'] or None, type=infer_type(d['title'], credits, 'orchestral'), credits=credits,
                program=d['program'], ticketUrl=d['ticket'], url=url,
                status='cancelled' if looks_cancelled(d['title']) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, url, err)
    return events
