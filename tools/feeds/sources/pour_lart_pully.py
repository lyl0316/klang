"""Pour l'Art, Pully: the chamber-music series at the Théâtre de l'Octogone, from the
series' own site (the Octogone links its "Pour l'Art" page there).

    https://www.pourlart.ch/                      one request: the upcoming concerts with dates
    https://www.pourlart.ch/concert/<slug>/       one request per upcoming concert (about 8)

The home page's upcoming list gives each concert's title (the ensemble or duo), cycle and
date ("Le mardi 27 octobre 2026"). The concert page adds the local start time ("à 19:30"),
the hall ("Théâtre de l'Octogone à Pully"), the works (composer + title) and the players
("Name, violon"). Only these facts are taken; the press quotes are not.

robots.txt asks for a Crawl-delay of 10 s (honoured by common.get), so a run takes about
1.5 minutes. The site has a copyright line and a privacy page, no terms about reuse.
"""
from __future__ import annotations

import re

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, \
    today_zurich
from ._westsouth import caps_words, find_date, find_time, group_role, infer_type, known_role, local_iso

KEY = 'pour_lart_pully'
NAME = "Pour l'Art (Octogone, Pully)"
SITE = 'https://www.pourlart.ch/'
ATTRIBUTION = "Source: Pour l'Art – musique de chambre (pourlart.ch)"
KIND = 'venue'
MAX_REQUESTS = 14
TIME_LIMIT = 420          # 8 requests at Crawl-delay 10 s, plus room for one 503 + Retry-After 120 s (seen 26 Oct 2026)

HOME = 'https://www.pourlart.ch/'
TICKETS = 'https://theatre-octogone.ch/billetterie/'
VENUE, CITY = "Théâtre de l'Octogone", 'Pully'


def parse_upcoming(html):
    """-> [{'url', 'title', 'date', 'cycle'}] from the home page's upcoming list."""
    out, seen = [], set()
    for chunk in re.split(r'<div class="jet-listing-grid__item', html or '')[1:]:
        link = re.search(r'href="(https://www\.pourlart\.ch/concert/[^"]+)"', chunk)
        text = clean(re.sub(r'<(script|style)\b.*?</\1>', ' ', chunk, flags=re.S))
        d = find_date(text)
        if not link or not d or link.group(1) in seen:
            continue                                   # the season programme further down has no year
        seen.add(link.group(1))
        h = re.search(r'<a href="https://www\.pourlart\.ch/concert/[^"]+"[^>]*>(.*?)</a>', chunk, re.S)
        cyc = re.search(r'Cycle\s+\d', text)
        out.append({'url': link.group(1), 'title': clean(h.group(1)) if h else '', 'date': d,
                    'cycle': cyc.group(0) if cyc else None})
    return out


def parse_concert(html):
    """Concert page -> dict(time, venue, credits, program)."""
    page = re.sub(r'<(script|style)\b.*?</\1>', ' ', html or '', flags=re.S)
    text = clean(page)
    m = re.search(r'à\s*(\d{1,2})[:h.](\d{2})', text)
    when = (int(m.group(1)), int(m.group(2))) if m else None
    venue = re.search(r'à\s*\d{1,2}[:h.]\d{2},?\s*([^,]{5,60}?)\s+Programme', text)
    program = [(clean(c), clean(t)) for c, t in
               re.findall(r'<span class="compositeur">(.*?)</span>(.*?)</li>', page, re.S)]
    credits = []
    block = page.split('Interprètes', 1)[1] if 'Interprètes' in page else ''
    block = block.split('Informations', 1)[0]
    lines = [clean(x) for x in re.split(r'(?i)<br\s*/?>|</p>|</li>|</div>', block) if clean(x)]
    i = 0
    while i < len(lines):
        ln = lines[i]
        m = re.match(r'^(.+?)\s*,\s*([^,]{3,30})$', ln)
        if m and known_role(m.group(2)):
            credits.append((known_role(m.group(2), m.group(1)) or 'Performer', caps_words(m.group(1))))
        elif i + 1 < len(lines) and lines[i + 1].startswith(',') and known_role(lines[i + 1].lstrip(', ')):
            credits.append((known_role(lines[i + 1].lstrip(', '), ln) or 'Performer', caps_words(ln)))
            i += 1
        i += 1
    return {'time': when, 'venue': clean(venue.group(1)) if venue else None, 'credits': credits, 'program': program}


def fetch():
    today = today_zurich()
    home = get(HOME)                                  # FetchError propagates: build reuses yesterday's events
    items = parse_upcoming(home)
    if not items and 'concert' not in home:
        raise FetchError(HOME, 'no concert list on the home page')
    default_time = find_time(re.search(r'(?i)horaire des concerts\s*:\s*\d{1,2}h\d{0,2}', clean(home)).group(0)) \
        if re.search(r'(?i)horaire des concerts\s*:\s*\d{1,2}h\d{0,2}', clean(home)) else None
    events = []
    for it in items:
        if it['date'] < (today.year, today.month, today.day):
            continue
        info = {'time': None, 'venue': None, 'credits': [], 'program': []}
        if requests_left() > 0:
            try:
                info = parse_concert(get(it['url']))
            except FetchError as err:
                log.warning('%s: no page for %s: %s', KEY, it['url'], err)
        when = info['time'] or default_time
        if not when:
            log.warning('%s: no start time for %s', KEY, it['url'])
            continue
        start = local_iso(*it['date'], *when)
        if to_zurich_datetime(start).date() < today:
            continue
        title = caps_words(it['title'])
        credits = list(info['credits'])
        g = group_role(title)
        if g and not any(n == title for _, n in credits):
            credits.insert(0, (g, title))
        venue, city = VENUE, CITY
        if info['venue'] and 'octogone' not in info['venue'].lower():    # a concert elsewhere: "Salle X à Lutry"
            pm = re.match(r'^(.+?)\s+à\s+([A-ZÀ-Ý][\w\'’ -]+)$', info['venue'])
            venue, city = (pm.group(1), pm.group(2)) if pm else (info['venue'], CITY)
        slug = it['url'].rstrip('/').rsplit('/', 1)[-1]
        try:
            events.append(make_event(
                KEY, slug, title, start, city=city, venueName=venue, series="Pour l'Art",
                type=infer_type(title, credits, program=info['program']) or 'chamber',
                credits=credits, program=info['program'], url=it['url'], ticketUrl=TICKETS,
                status='cancelled' if looks_cancelled(title) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, slug, err)
    return events
