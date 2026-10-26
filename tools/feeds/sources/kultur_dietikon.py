"""KulturDietikon: classical concerts from the town of Dietikon's culture calendar.

    https://kulturdietikon.ch/wp-json/tribe/events/v1/events?start_date=YYYY-MM-DD

The calendar ("The Events Calendar" REST API) lists every cultural event in Dietikon with its local
start time; it has no categories, so classical concerts are picked by words in the title and text
(symphony, chamber music, string quartet, opera studio, oratorio, composers' names ...), and pop,
jazz, brass band, comedy and film are left out. The event text is used only to classify; it is not
republished. Facts kept: date, time, title, link. Up to two requests per run.
"""
from __future__ import annotations

import re

from common import clean, guess_type, log, looks_cancelled, make_event, to_zurich_datetime, to_zurich_iso, today_zurich
from ._east import NOT_A_CONCERT, fold, tribe_events

KEY = 'kultur_dietikon'
NAME = 'KulturDietikon'
SITE = 'https://kulturdietikon.ch/'
ATTRIBUTION = 'Source: KulturDietikon (kulturdietikon.ch)'
KIND = 'aggregator'
MAX_REQUESTS = 4
TIME_LIMIT = 60

API = 'https://kulturdietikon.ch/wp-json/tribe/events/v1/events'
CLASSICAL = re.compile(
    r'sinfoni|symphon|klavierkonzert|violinkonzert|cellokonzert|kammermusik|streichquartett|klaviertrio|'
    r'opernatelier|oratori|kantate|requiem|\bmesse\b|orchesterverein|sinfonietta|kammerorchester|\bsonate|'
    r'liederabend|orgelkonzert|beethoven|mozart|\bbach\b|schubert|brahms|haydn|vivaldi|handel|tschaikowsk|'
    r'dvorak|mendelssohn|schumann|chopin|debussy|ravel|honegger|klassik|klassisch')
NOT_CLASSICAL = re.compile(r'jazz|funk|rock\b|\bpop\b|comedy|comedian|\bdj\b|chanson|musical|schlager|volksmusik|'
                           r'blasmusik|stadtmusik|jugendmusik|kurzfilm|kinderklassik|tribute|90er|bachata|flamenc|'
                           r'open mic|rap\b|slam|comedia|kabarett|satire|zauber')
STUDENTS = re.compile(r'schuler\*?innen|gesangsschuler|instrumentalschuler|vorspiel|stufentest')


def fetch():
    today = today_zurich()
    events = []
    for e in tribe_events(API, today.isoformat()):          # FetchError propagates
        title = clean(e.get('title'))
        text = fold(f"{title} {clean(e.get('description'))}")
        if not title or e.get('all_day') or not CLASSICAL.search(text):
            continue
        if NOT_CLASSICAL.search(text) or NOT_A_CONCERT.search(fold(title)) or STUDENTS.search(text):
            continue
        try:
            start = to_zurich_iso(e['start_date'])
        except (KeyError, ValueError):
            continue
        if start[11:16] == '00:00' or to_zurich_datetime(start).date() < today:
            continue                                        # 00:00 marks an all-day market or festival
        venue = e.get('venue') if isinstance(e.get('venue'), dict) else {}
        try:
            events.append(make_event(
                KEY, e.get('id'), title, start, city=clean(venue.get('city')) or 'Dietikon',
                venueName=clean(venue.get('venue')) or None, type=guess_type(title), url=e.get('url'),
                ticketUrl=e.get('website') or None, status='cancelled' if looks_cancelled(title) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, e.get('id'), err)
    return events
