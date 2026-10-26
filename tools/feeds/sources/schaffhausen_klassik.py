"""Schaffhausen Klassik (formerly Musik-Collegium Schaffhausen): the symphonic subscription series
in St. Johann Schaffhausen, the "Sonntags um 11" chamber matinées, lunch and extra concerts.

    https://schaffhausen-klassik.ch/wp-json/tribe/events/v1/events?start_date=YYYY-MM-DD

The calendar API ("The Events Calendar") gives each concert's local start and end (Europe/Zurich),
the hall and town, and the series (category). From the event text only facts are taken: the
line-up lines before "Tickets" ("Lucie Chartin, Sopran", "Sinfonisches Orchester Schweiz") and the
programme pairs after "Programm" ("Wolfgang Amadeus Mozart (1756-1791):" + work). The prose is not
used. One request per run.

Skipped: family and school-class concerts.
"""
from __future__ import annotations

import re

from common import clean, log, looks_cancelled, make_event, to_zurich_datetime, to_zurich_iso, today_zurich
from ._east import (NOT_A_CONCERT, fold, group_role, html_lines, infer_type, is_group, name_role_line, tribe_events)

KEY = 'schaffhausen_klassik'
NAME = 'Schaffhausen Klassik'
SITE = 'https://schaffhausen-klassik.ch/'
ATTRIBUTION = 'Source: Schaffhausen Klassik (schaffhausen-klassik.ch)'
KIND = 'venue'
PRIORITY = 25            # the promoter of the series; visiting orchestras keep their own listings
MAX_REQUESTS = 5
TIME_LIMIT = 90

API = 'https://schaffhausen-klassik.ch/wp-json/tribe/events/v1/events'
SKIP = re.compile(r'familienkonzert|schulklassen|schulkonzert|kinder')
VENUES = {'st. johann': 'St. Johann Schaffhausen', 'kirche st. johann': 'St. Johann Schaffhausen',
          'rathauslaube': 'Rathauslaube', 'stadttheater': 'Stadttheater Schaffhausen',
          'stadttheater schaffhausen': 'Stadttheater Schaffhausen', 'munster': 'Münster Schaffhausen'}
COMPOSER = re.compile(r'^(.+?)\s*\(\s*[*†]?\s*\d{4}(?:\s*[-–]\s*\d{4})?\s*\)\s*:?\s*(.*)$')


def _facts(description, title):
    lines = html_lines(description)
    credits, program = [], []
    try:
        cut = next(i for i, l in enumerate(lines) if fold(l) in ('tickets', 'programm'))
    except StopIteration:
        cut = 0
    for line in lines[:cut]:
        f = fold(line)
        if fold(title) in f or re.search(r'\d{1,2}\.\s*\w+|\bum \d|uhr\b', f) or len(line) > 90:
            continue
        if ',' not in line and is_group(line):
            credits.append((group_role(line), line))
            continue
        pair = name_role_line(line)
        if pair and (pair[0] != 'Performer' or ',' in line):
            credits.append(pair)
    if 'programm' in [fold(l) for l in lines]:
        rest = lines[[fold(l) for l in lines].index('programm') + 1:]
        i = 0
        while i < len(rest):
            line = rest[i]
            if len(line) > 160:
                break                                       # the prose starts
            m = COMPOSER.match(line)
            if m:
                work = m.group(2).strip()
                if work:
                    program.append((m.group(1).strip(), work))
                else:                                       # 'Ludwig van Beethoven (1770-1827):' + one work per line
                    while (i + 1 < len(rest) and len(rest[i + 1]) <= 160 and not COMPOSER.match(rest[i + 1])
                           and not _venue_line(rest[i + 1]) and not re.match(r'(preise|tickets|eintritt)\b', fold(rest[i + 1]))):
                        program.append((m.group(1).strip(), rest[i + 1]))
                        i += 1
            i += 1
    return credits, program


def _venue_line(line):
    """The hall named at the end of the event text ('St. Johann', 'Rathauslaube') -> venue name or None."""
    return VENUES.get(fold(line).strip(' .'))


def fetch():
    today = today_zurich()
    events = []
    for e in tribe_events(API, today.isoformat()):          # FetchError propagates
        title = clean(e.get('title'))
        cats = ' '.join(clean(c.get('name')) for c in e.get('categories') or [])
        if not title or e.get('all_day') or SKIP.search(fold(title)) or NOT_A_CONCERT.search(fold(title)):
            continue
        try:
            start = to_zurich_iso(e['start_date'])
            end = to_zurich_iso(e['end_date']) if e.get('end_date') else None
        except (KeyError, ValueError):
            continue
        if to_zurich_datetime(start).date() < today:
            continue
        if end and end <= start:
            end = None
        venue = e.get('venue') if isinstance(e.get('venue'), dict) else {}
        credits, program = _facts(e.get('description') or '', title)
        hall = clean(venue.get('venue')) or next(
            (v for v in map(_venue_line, html_lines(e.get('description') or '')) if v), None)
        series = re.sub(r'^Schaffhausen Klassik\s+', '', cats).strip() or None
        hint = 'chamber' if re.search(r'sonntags um 11|lunch', fold(f'{title} {cats}')) else (
            'orchestral' if 'symphonic' in fold(cats) else None)
        try:
            events.append(make_event(
                KEY, e.get('id'), title, start, end=end, city=clean(venue.get('city')) or 'Schaffhausen',
                venueName=hall, type=infer_type(title, credits, hint), series=series,
                credits=credits, program=program, url=e.get('url'), ticketUrl=e.get('website') or None,
                status='cancelled' if looks_cancelled(title) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, e.get('id'), err)
    return events
