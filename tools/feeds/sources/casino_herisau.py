"""Casino-Gesellschaft Herisau: the society's chamber music series ("Kammermusik im intimen Rahmen",
six evenings from November to April in the Casino Herisau).

    https://www.casino-herisau.ch/Agenda.php      all upcoming events of the society

Each agenda entry has the date ("Mittwoch, 04.11.2026"), the title (ensemble, or "Name, Tenor
Name, Klavier"), the programme lines ("L.v.Beethoven: Streichquartett op. 132"), the place and the
local start ("19:30 Uhr"). The society's literature talks and museum visits (KulturElle) are in the
same list and are skipped: only entries with a programme or musicians are kept. One request per run.
"""
from __future__ import annotations

import re

from common import clean, get, log, looks_cancelled, make_event, to_zurich_datetime, today_zurich
from ._east import (NOT_A_CONCERT, find_date, find_time, fold, group_role, html_lines, infer_type, is_group, local_iso,
                    role_for)

KEY = 'casino_herisau'
NAME = 'Casino-Gesellschaft Herisau'
SITE = 'https://www.casino-herisau.ch/'
ATTRIBUTION = 'Source: Casino-Gesellschaft Herisau (casino-herisau.ch)'
KIND = 'venue'
MAX_REQUESTS = 3
TIME_LIMIT = 60

BASE = 'https://www.casino-herisau.ch/'
AGENDA = BASE + 'Agenda.php'
WORK = re.compile(r'^([A-ZÄÖÜ][^:]{2,60}):\s*(.+)$')
PLAYERS = {'Violin', 'Viola', 'Cello', 'Double bass', 'Piano', 'Harpsichord', 'Organ', 'Flute', 'Oboe', 'Clarinet',
           'Bassoon', 'Horn', 'Trumpet', 'Harp', 'Guitar', 'Soprano', 'Mezzo-soprano', 'Alto', 'Countertenor',
           'Tenor', 'Baritone', 'Bass', 'Percussion', 'Accordion', 'Saxophone', 'Recorder', 'Lute', 'Voice'}


def _title_credits(title):
    """'Ilker Arcayürek, Tenor Ammiel Bushakewitz, Klavier' -> [('Tenor', ...), ('Piano', ...)];
    'Guarneri Trio Prague' -> [('Ensemble', 'Guarneri Trio Prague')]."""
    credits = []
    for name, label in re.findall(r'\s*(.+?),\s*(\S+)(?=\s+[A-ZÄÖÜ]|\s*$)', title):
        role = role_for(label, name)
        if role in PLAYERS:
            credits.append((role, name.strip()))
    if not credits and is_group(title):
        credits.append((group_role(title), title))
    return credits


def fetch():
    today = today_zurich()
    page = get(AGENDA)                                      # FetchError propagates
    events = []
    for chunk in re.split(r'class="BackgroundAgendaTagDatum"', page)[1:]:
        eid = re.search(r'Agenda-Folgeseite\.php\?id=(\d+)', chunk)
        chunk = re.sub(r'\s(?:title|alt)="[^"]*"', '', chunk)  # tooltips repeat the text and may hold line breaks
        lines = [l.lstrip('> ').strip() for l in html_lines(chunk)]
        lines = [l for l in lines if l]
        if not eid or len(lines) < 2:
            continue
        ymd = find_date(lines[0])
        if not ymd:
            continue
        title = lines[1]
        try:
            ort = lines[lines.index('Ort:') + 1]
            zeit = lines[lines.index('Uhrzeit:') + 1]
            body = lines[2:lines.index('Ort:')]
        except (ValueError, IndexError):
            continue
        hm = find_time(zeit)
        if not hm:
            continue
        program = [(m.group(1).strip(), m.group(2).strip()) for m in (WORK.match(l) for l in body) if m]
        credits = _title_credits(title)
        if ',' in title and credits and all(r in PLAYERS for r, _ in credits):
            title = ' & '.join(n for _, n in credits)      # 'A, Tenor B, Klavier' -> 'A & B'
        if not program and not credits:
            continue                                        # a talk, an excursion: not a concert
        if NOT_A_CONCERT.search(fold(title)):
            continue
        start = local_iso(*ymd, *hm)
        if to_zurich_datetime(start).date() < today:
            continue
        town = re.search(r'\b\d{4}\s+([A-ZÄÖÜ][\w.\- ]+)$', ort)
        city = town.group(1).strip() if town else ort.split(',')[-1].strip()
        venue = 'Casino Herisau' if 'poststrasse 9' in fold(ort) else ort
        url = f'{BASE}Agenda-Folgeseite.php?id={eid.group(1)}'
        try:
            events.append(make_event(
                KEY, eid.group(1), title, start, city=city, venueName=venue, type=infer_type(title, credits, 'chamber'),
                series='Casino-Konzerte', credits=credits, program=program, url=url,
                status='cancelled' if looks_cancelled(' '.join([title] + body)) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, eid.group(1), err)
    return events
