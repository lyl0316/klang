"""Theater Casino Zug: classical concerts and operas from the house's season calendar.

    https://www.theatercasino.ch/programm/veranstaltungen     the whole season in one page

The page is grouped by month (``id="month-2026-11"``); each date has the day ("FR 30.10."), the
local start time ("19:30 Uhr"), the title, a one-line line-up ("mit William Garfield Walker
(Dirigent), Margarita Höhenrieder & Antti Siirala (Klaviere)"), the hall, the genres
(``data-categories="klassik,"``) and the ticket link. Only genres Klassik and Oper are kept, plus
Musiktheater evenings that are billed as a concert. One request per run.
"""
from __future__ import annotations

import html as htmllib
import re

from common import clean, get, log, looks_cancelled, make_event, to_zurich_datetime, today_zurich
from ._east import NOT_A_CONCERT, fold, group_role, infer_type, is_group, local_iso, parse_lineup

KEY = 'theater_casino_zug'
NAME = 'Theater Casino Zug'
SITE = 'https://www.theatercasino.ch/'
ATTRIBUTION = 'Source: Theater Casino Zug (theatercasino.ch)'
KIND = 'venue'
MAX_REQUESTS = 3
TIME_LIMIT = 90

LISTING = 'https://www.theatercasino.ch/programm/veranstaltungen'
# the main hall is plain "Theater Casino Zug", as the orchestras' own sites call it (lets the feed merge duplicates)
HALLS = {'theatersaal': 'Theater Casino Zug', 'buhne-theatersaal': 'Theater Casino Zug',
         'kleiner-saal': 'Theater Casino Zug, Kleiner Saal', 'festsaal': 'Theater Casino Zug, Festsaal',
         'foyer': 'Theater Casino Zug, Foyer', 'shedhalle': 'Shedhalle Zug'}
OPERA_SUB = re.compile(r'^(?:\w+ )?(?:oper|operette|kammeroper|singspiel)\s+von\s+(.+)$', re.I)
def fetch():
    today = today_zurich()
    page = get(LISTING)                                     # FetchError propagates
    events = []
    for section in re.split(r'(?=<div class="section tcz-nodetypes-events-content-events-list[^"]*" id="month-)', page)[1:]:
        month = re.search(r'id="month-(\d{4})-(\d{2})"', section)
        if not month:
            continue
        year = int(month.group(1))
        for blk in re.split(r'(?=<div id="node-[0-9a-f-]+" class="event-date-entry)', section)[1:]:
            node = re.search(r'id="node-([0-9a-f-]+)"', blk).group(1)
            cats = set(filter(None, (re.search(r'data-categories="([^"]*)"', blk) or [None, ''])[1].split(',')))
            day = re.search(r'date-font[^>]*>\s*\w+\s+(\d{1,2})\.(\d{1,2})\.', blk)
            hm = re.search(r'fs-lg mt-1">\s*(\d{1,2}):(\d{2})', blk)
            title = re.search(r'event-title-text[^>]*>(.*?)</strong>', blk, re.S)
            sub = re.search(r'</a><p class="fs-lg[^"]*">(.*?)</p>', blk, re.S)
            if not (day and hm and title):
                continue
            title, sub = clean(title.group(1)), clean(sub.group(1)) if sub else ''
            text = fold(f'{title} {sub}')
            if 'klassik' in cats:
                kind = None
            elif 'oper' in cats:
                kind = 'vocal-opera'
            elif 'musiktheater' in cats and re.search(r'konzert|orchester|camerata|ensemble|oper\b', text):
                kind = None
            else:
                continue
            if NOT_A_CONCERT.search(text):
                continue
            d, mo = int(day.group(1)), int(day.group(2))
            y = year + 1 if mo < int(month.group(2)) - 6 else year
            start = local_iso(y, mo, d, int(hm.group(1)), int(hm.group(2)))
            if to_zurich_datetime(start).date() < today:
                continue
            url = re.search(r'href="(https://www\.theatercasino\.ch/programm/veranstaltungen/[^"]+)"', blk)
            ticket = re.search(r'href="(https://kartenverkauf\.[^"]+)"', blk)
            venues = [v for v in (re.search(r'data-venues="([^"]*)"', blk) or [None, ''])[1].split(',') if v]
            series = re.search(r'class="subscription[^"]*"><span[^>]*>(.*?)</span>', blk, re.S)
            parts = [p.strip() for p in sub.split(' | ') if p.strip()]
            opera = [m for m in (OPERA_SUB.match(p) for p in parts) if m]
            people = [p for p in parts if not OPERA_SUB.match(p)]
            credits = parse_lineup(people[0]) if people else []
            band = re.match(r'^(.+?)\s+spielt\s+', title)      # 'Wiener Concert-Verein spielt Wiener Klassik'
            if band and is_group(band.group(1)) and fold(band.group(1)) not in {fold(n) for _, n in credits}:
                credits.insert(0, (group_role(band.group(1)), band.group(1)))
            program = []
            if opera:
                kind, program = 'vocal-opera', [(clean(opera[0].group(1)), title)]
            if kind is None:
                kind = infer_type(f'{title} {sub}', credits)
            try:
                events.append(make_event(
                    KEY, node, title, start, city='Zug',
                    venueName=HALLS.get(venues[0], 'Theater Casino Zug') if venues else 'Theater Casino Zug',
                    type=kind, series=clean(series.group(1)) if series else None, credits=credits, program=program,
                    ticketUrl=htmllib.unescape(ticket.group(1)) if ticket else None,
                    url=htmllib.unescape(url.group(1)) if url else LISTING,
                    status='cancelled' if looks_cancelled(f'{title} {sub}') else 'scheduled'))
            except ValueError as err:
                log.warning('%s: skipped %s: %s', KEY, node, err)
    return events
