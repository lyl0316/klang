"""Gstaad Menuhin Festival & Academy: the summer festival's concerts (mid-July to early
September) in Saanen, Gstaad, Rougemont, Lauenen, Zweisimmen ... from the festival's site.

    https://www.menuhin.ch/de/programm-and-tickets     one request (redirects to "Programm <year>")

The programme page lists every concert as an event teaser: the date ("Freitag, 17. Juli
2026"), "time, venue" ("19:30, Kirche Saanen"), the format (Orchester, Rezital,
Kammermusik, Oper ...), the title, the artists and the series. Only those facts are taken.
Between festivals (autumn to spring) the page has no concerts yet: the reader then
returns nothing, which is expected.

robots.txt (Cmsbox) allows the programme pages; only ?login/?search-style URLs and
technical folders are disallowed. The Impressum has no terms about reuse.

Skipped: children's and family formats, talks, open rehearsals and the Academy's
masterclasses.
"""
from __future__ import annotations

import re
from urllib.parse import urljoin

from common import FetchError, clean, get, log, looks_cancelled, make_event, to_zurich_datetime, today_zurich
from ._westsouth import find_date, fold, group_role, is_not_a_concert, local_iso

KEY = 'gstaad_menuhin'
NAME = 'Gstaad Menuhin Festival & Academy'
SITE = 'https://www.menuhin.ch/'
ATTRIBUTION = 'Source: Gstaad Menuhin Festival & Academy (menuhin.ch)'
KIND = 'festival'
MAX_REQUESTS = 4
TIME_LIMIT = 90

BASE = 'https://www.menuhin.ch'
PROGRAMME = BASE + '/de/programm-and-tickets'
TYPES = {'orchester': 'orchestral', 'rezital': 'recital', 'kammermusik': 'chamber', 'oper': 'vocal-opera',
         'chor': 'vocal-opera', 'vokal': 'vocal-opera', 'liederabend': 'recital'}
SKIP_FORMATS = re.compile(r'kinder|familie|family|talk|gesprach|probe|masterclass|meisterkurs|kurs|film|movie|apero|dinner|'
                          r'konferenz|academy|discovery|lecture')
_TOWNS = (('saanen', 'Saanen'), ('gstaad', 'Gstaad'), ('rougemont', 'Rougemont'), ('lauenen', 'Lauenen'),
          ('zweisimmen', 'Zweisimmen'), ('gsteig', 'Gsteig'), ('schonried', 'Schönried'), ('saanenmoser', 'Saanenmöser'),
          ('vers l.eglise', "Vers-l'Église"), ('chateau-d', "Château-d'Œx"), ('lenk', 'Lenk'), ('feutersoey', 'Feutersoey'),
          ('festival-zelt', 'Gstaad'), ('zelt', 'Gstaad'), ('thun', 'Thun'), ('bern', 'Bern'), ('rossiniere', 'Rossinière'),
          ('chateau-d.oex', "Château-d'Œx"), ('les diablerets', 'Les Diablerets'), ('boltigen', 'Boltigen'))


def _town(venue):
    """'Kirche Saanen' -> 'Saanen'; 'Grand Chalet Balthus, Rossinière' -> 'Rossinière'; else the
    place after the last comma, else Gstaad (the festival's home)."""
    f = fold(venue)
    hit = next((c for frag, c in _TOWNS if frag in f), None)
    if hit:
        return hit
    if ',' in venue:
        tail = venue.rsplit(',', 1)[1].strip()
        if tail and not re.search(r'\d', tail):
            return tail
    return 'Gstaad'


def parse_programme(html):
    """-> [{'date', 'time', 'venue', 'format', 'title', 'artists', 'series', 'url'}]."""
    out = []
    for art in re.findall(r'<article class="event[^"]*"[^>]*>(.*?)</article>', html or '', re.S):
        date = re.search(r'event_part--date">(.*?)</p>', art, re.S)
        time = re.search(r'event_part--time">(.*?)</p>', art, re.S)
        title = re.search(r'event__part--title">(.*?)</h2>', art, re.S)
        if not date or not time or not title:
            continue
        d = find_date(clean(date.group(1)))
        m = re.match(r'^\s*(\d{1,2})[:.](\d{2})\s*,?\s*(.*)$', clean(time.group(1)))
        if not d or not m:
            continue
        fmt = re.search(r'event__part--titleTwo">(.*?)</h3>', art, re.S)
        link = re.search(r'href="([^"]+)" class="event__part event__part--link"', art)
        out.append({
            'date': d, 'time': (int(m.group(1)), int(m.group(2))), 'venue': m.group(3).strip(),
            'format': clean(fmt.group(1)) if fmt else '', 'title': clean(title.group(1)),
            'artists': [clean(a).rstrip(',') for a in re.findall(r'event__part--artist"[^>]*>(.*?)</span>', art, re.S)
                        if clean(a).rstrip(',')],
            'series': ', '.join(clean(t) for t in re.findall(r'event__part--topic"[^>]*>(.*?)</span>', art, re.S)),
            'url': urljoin(BASE, link.group(1)) if link else None,
        })
    return out


def to_events(items, today):
    events = []
    for it in items:
        # the format says what it is; the series ("Family Matters" was the 2026 motto) does not
        if SKIP_FORMATS.search(fold(it['format'])) or is_not_a_concert(it['title']) or \
                re.search(r'screening|kino|cine\b|hike|wanderung|lunch|brunch', fold(f"{it['title']} {it['venue']}")):
            continue
        start = local_iso(*it['date'], *it['time'])
        if to_zurich_datetime(start).date() < today:
            continue
        credits = [(group_role(a) or 'Performer', a) for a in it['artists']]
        kind = next((t for k, t in TYPES.items() if k in fold(it['format'])), None)
        sid = (it['url'] or '').rstrip('/').rsplit('/', 1)[-1] or f"{start[:16]}-{fold(it['title'])[:30]}"
        try:
            events.append(make_event(
                KEY, sid, it['title'], start, city=_town(it['venue']), venueName=it['venue'], type=kind,
                series=it['series'] or 'Gstaad Menuhin Festival', credits=credits, url=it['url'] or PROGRAMME,
                ticketUrl=it['url'], status='cancelled' if looks_cancelled(it['title']) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, sid, err)
    return events


def fetch():
    html = get(PROGRAMME)                        # FetchError propagates: build reuses yesterday's events
    if 'Menuhin' not in html:
        raise FetchError(PROGRAMME, 'unexpected programme page')
    items = parse_programme(html)
    if not items:
        log.info('%s: no concerts published yet (between festivals)', KEY)
    return to_events(items, today_zurich())
