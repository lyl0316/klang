"""Conservatorio della Svizzera italiana (CSI), Lugano: the public concerts of the
conservatory and its foundation (Aula Magna, LAC Hall and Sala Teatro, churches of the
Luganese), from the conservatory's own event list.

    https://www.conservatorio.ch/it/fondazione/eventi-e-streaming            page 1
    https://www.conservatorio.ch/it/fondazione/eventi-e-streaming?page=N     pages 2.. (up to 4 more)

Each list item gives the date ("27.10.26"), "place, local time" ("Aula Magna del
Conservatorio, 19:00"), the title and the event page. Only these facts are taken. The
LAC's own site is behind a Cloudflare challenge and is not read; concerts the CSI gives
at the LAC appear here with the CSI as source.

robots.txt: "User-agent: *" with an empty Disallow (everything allowed). No terms about
reuse on the site.

Skipped: children's and school projects (Orchestriamoci, music walks), talks and the
research forum.
"""
from __future__ import annotations

import re
from urllib.parse import urljoin

from common import FetchError, clean, get, guess_type, log, looks_cancelled, make_event, requests_left, \
    to_zurich_datetime, today_zurich
from ._westsouth import fold, group_role, is_not_a_concert, local_iso

KEY = 'conservatorio_lugano'
NAME = 'Conservatorio della Svizzera italiana, Lugano'
SITE = 'https://www.conservatorio.ch/'
ATTRIBUTION = 'Source: Conservatorio della Svizzera italiana (conservatorio.ch)'
KIND = 'venue'
MAX_REQUESTS = 6
TIME_LIMIT = 90

BASE = 'https://www.conservatorio.ch'
LISTING = BASE + '/it/fondazione/eventi-e-streaming'
SKIP_RE = re.compile(r'orchestriamoci|passeggiata musicale|forum|conferenza|presentazione|masterclass|workshop|'
                     r'laboratorio|bambini|open day|porte aperte|esami|audizion|\bsmus\b|piccole voci|'
                     r'scuola di musica')


def parse_list(html):
    out = []
    for li in re.findall(r'<li>\s*<a href="(/it/[^"]*dettaglio/id/(\d+)[^"]*)"[^>]*>(.*?)</a>\s*</li>', html or '', re.S):
        href, eid, body = li
        when = re.search(r'<time>(.*?)</time>', body, re.S)
        place = re.search(r'</time>\s*<p>(.*?)</p>', body, re.S)
        title = re.search(r'<strong>(.*?)</strong>', body, re.S)
        if not when or not place or not title:
            continue
        d = re.match(r'(\d{1,2})\.(\d{1,2})\.(\d{2,4})', clean(when.group(1)))
        p = re.match(r'^(.*?),\s*(\d{1,2})[:.](\d{2})\s*$', clean(place.group(1)))
        if not d or not p:
            continue
        y = int(d.group(3))
        out.append({'id': eid, 'url': urljoin(BASE, href), 'title': clean(title.group(1)),
                    'date': (y + 2000 if y < 100 else y, int(d.group(2)), int(d.group(1))),
                    'time': (int(p.group(2)), int(p.group(3))), 'place': p.group(1).strip()})
    return out


def venue_city(place):
    """'Aula Magna del Conservatorio' -> (.., 'Lugano'); 'LAC - Hall' -> ('LAC Lugano, Hall', 'Lugano');
    'Chiesa SS. Giorgio e Andrea, Carona' -> ('Chiesa SS. Giorgio e Andrea', 'Carona')."""
    p = clean(place)
    f = fold(p)
    if f.startswith('lac'):
        hall = re.sub(r'^LAC\s*[-–]?\s*', '', p).strip()
        return (f'LAC Lugano, {hall}' if hall else 'LAC Lugano'), 'Lugano'
    if ',' in p:
        venue, town = (x.strip() for x in p.rsplit(',', 1))
        if 'ascona' in fold(town):                    # "Sala Balint, Monte Verità Ascona"
            venue, town = f'{venue}, {town}', 'Ascona'
        return venue, town
    return p, 'Lugano'


def fetch():
    today = today_zurich()
    first = get(LISTING)                         # FetchError propagates: build reuses yesterday's events
    items = parse_list(first)
    if not items and 'list-events' not in first:
        raise FetchError(LISTING, 'event list not found')
    # ?page=1 is the page just read; fetch only the further ones
    pages = sorted({int(n) for n in re.findall(r'eventi-e-streaming\?page=(\d+)', first)} - {0, 1})
    for n in pages[:4]:
        if requests_left() <= 0:
            break
        try:
            items += parse_list(get(f'{LISTING}?page={n}'))
        except FetchError as err:
            log.warning('%s: page %d unavailable: %s', KEY, n, err)
    events, seen = [], set()
    for it in items:
        if it['id'] in seen:
            continue
        seen.add(it['id'])
        if SKIP_RE.search(fold(it['title'])) or is_not_a_concert(it['title']):
            continue
        start = local_iso(*it['date'], *it['time'])
        if to_zurich_datetime(start).date() < today:
            continue
        venue, town = venue_city(it['place'])
        head = it['title'].split(' - ')[0]
        g = group_role(head) if not re.match(r'(?i)concert', head) else None
        credits = [(g, head)] if g else []
        try:
            events.append(make_event(
                KEY, it['id'], it['title'], start, city=town, venueName=venue, type=guess_type(it['title']),
                credits=credits, url=it['url'], status='cancelled' if looks_cancelled(it['title']) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, it['id'], err)
    return events
