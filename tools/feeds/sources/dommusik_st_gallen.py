"""DomMusik St.Gallen: choir and organ concerts in the Cathedral (Kathedrale) St. Gallen.

    https://www.dommusik.ch/musik-konzerte/konzerte/     "Nächste Anlässe" (Verowa event list)

Each event in the list has its day (``data-date="20261122"``), title, local start and end
("16.00–18.00 Uhr"), place ("Kathedrale, St. Gallen", "Chor der Kathedrale") and its Verowa event
id (from the per-event iCal export link). The description is prose and is not used. Kept: concerts,
Abendmusik, organ series (Orgeltrost, Domorgelkonzerte, Orgelsommer), Nine Lessons and Carols.
Skipped: sing-alongs (Offenes Singen, Singtag), vespers, introductions, tours and talks. One request
per run.
"""
from __future__ import annotations

import re

from common import clean, get, log, looks_cancelled, make_event, to_zurich_datetime, today_zurich
from ._east import NOT_A_CONCERT, fold, local_iso

KEY = 'dommusik_st_gallen'
NAME = 'DomMusik St.Gallen'
SITE = 'https://www.dommusik.ch/'
ATTRIBUTION = 'Source: DomMusik St.Gallen (dommusik.ch)'
KIND = 'venue'
MAX_REQUESTS = 3
TIME_LIMIT = 60

LISTING = 'https://www.dommusik.ch/musik-konzerte/konzerte/'
KEEP = re.compile(r'konzert|abendmusik|orgel|organ|nine lessons|carols|passionsmusik|stiftsbibliothek|oratori|messe\b|'
                  r'requiem|kantate')
SKIP = re.compile(r'offenes singen|singtag|lieder-singen|liedersingen|vesper|nacht der lichter|podium|prasentation|'
                  r'einfuhrung|(?<!auf)fuhrung|gottesdienst')
PLACES = {'kathedrale, st. gallen': 'Kathedrale St. Gallen', 'chor der kathedrale': 'Kathedrale St. Gallen, Chor',
          'barocksaal stiftsbibliothek': 'Stiftsbibliothek St. Gallen, Barocksaal'}


def fetch():
    today = today_zurich()
    page = get(LISTING)                                     # FetchError propagates
    events = []
    for item in re.split(r'<div class="event_list_item ', page)[1:]:
        day = re.search(r'data-date="(\d{4})(\d{2})(\d{2})"', item)
        title = re.search(r'class="event_title">(.*?)</span>', item, re.S)
        times = re.search(r'event-time-text">(.*?)</span>', item, re.S)
        place = re.search(r'event-location-room">(.*?)</span>', item, re.S)
        eid = re.search(r'/export/ical/(e\d+)', item)
        if not (day and title and times and eid):
            continue
        title = clean(title.group(1))
        f = fold(title)
        if not KEEP.search(f) or SKIP.search(f) or NOT_A_CONCERT.search(f):
            continue
        hm = re.findall(r'(\d{1,2})[.:](\d{2})', clean(times.group(1)))
        if not hm:
            continue
        ymd = tuple(int(x) for x in day.groups())
        start = local_iso(*ymd, int(hm[0][0]), int(hm[0][1]))
        if to_zurich_datetime(start).date() < today:
            continue
        end = local_iso(*ymd, int(hm[1][0]), int(hm[1][1])) if len(hm) > 1 else None
        if end and end <= start:
            end = None
        where = clean(place.group(1)) if place else 'Kathedrale, St. Gallen'
        kind = 'recital' if re.search(r'orgel|organ', f) else (
            'vocal-opera' if re.search(r'chor|choral|carols|passion|abendmusik|oratori|messe|requiem|kantate', f) else None)
        try:
            events.append(make_event(
                KEY, eid.group(1), title, start, end=end, city='St. Gallen',
                venueName=PLACES.get(fold(where), where), type=kind, url=LISTING,
                status='cancelled' if looks_cancelled(title) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, eid.group(1), err)
    return events
