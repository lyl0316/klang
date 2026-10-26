"""Abbaye de Saint-Maurice: concerts and organ vespers in the Abbey's basilica, from the
Abbey's own agenda.

    https://www.abbaye-stmaurice.ch/fr/agenda/prochains-evenements/   one request: upcoming events
    https://www.abbaye-stmaurice.ch/fr/evenements/<slug>              one request per music event

The agenda lists every upcoming event with its title, category and date ("- 01.11.2026").
Most are services, guided tours, talks and book evenings; only music events (organ vespers,
concerts, recitals, choirs) are kept. Their page gives the local start time ("Heure de
début 17h00") and the place; the performer is taken from the short page summary when it
starts with a name ("Tom Rioult, lauréat du Concours ..." -> Tom Rioult). Nothing else of
the text is used.

robots.txt asks for a Crawl-delay of 10 s, which common.get honours. The pages are large
(about 1 MB each), so only the agenda and the music events' pages are fetched. No terms
of use about reuse on the site.
"""
from __future__ import annotations

import re
from urllib.parse import urljoin

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, \
    today_zurich
from ._westsouth import fold, local_iso

KEY = 'abbaye_saint_maurice'
NAME = 'Abbaye de Saint-Maurice'
SITE = 'https://www.abbaye-stmaurice.ch/'
ATTRIBUTION = "Source: Abbaye de Saint-Maurice (abbaye-stmaurice.ch)"
KIND = 'venue'
MAX_REQUESTS = 8
TIME_LIMIT = 180

BASE = 'https://www.abbaye-stmaurice.ch'
LISTING = BASE + '/fr/agenda/prochains-evenements/'
CITY = 'Saint-Maurice'
VENUE = "Basilique de l'Abbaye de Saint-Maurice"

MUSIC_RE = re.compile(r'concert|orgue|vesperale|recital|choeur|chorale|cantate|oratorio|requiem|messe en musique|'
                      r'ensemble vocal|quatuor|orchestre|musique')
NOT_RE = re.compile(r'visite|conference|livres|curiosit|nuit .*musees|pelerinage|exposition|atelier|enfants|'
                    r'soiree spirituelle|retraite|cours\b')


def parse_listing(html):
    """-> [{'url', 'title', 'date': (y, m, d)}]."""
    out, seen = [], set()
    for href, body in re.findall(r'<a href="(/fr/evenements/[^"]+)"[^>]*>(.*?)</a>', html or '', re.S):
        if href in seen:
            continue
        title = re.search(r'<h2[^>]*>(.*?)</h2>', body, re.S)
        date = re.search(r'-\s*(\d{2})\.(\d{2})\.(\d{4})', clean(body))
        if not title or not date:
            continue
        seen.add(href)
        out.append({'url': urljoin(BASE, href), 'title': clean(title.group(1)),
                    'date': (int(date.group(3)), int(date.group(2)), int(date.group(1)))})
    return out


def parse_details(html):
    """-> (start time (hh, mm) or None, performer name or None, place or None)."""
    page = html or ''
    m = re.search(r'Heure de d[ée]but\s*</(?:div|p)>\s*<(?:div|p)[^>]*>\s*(\d{1,2})\s*[h:.]\s*(\d{2})?', page)
    when = (int(m.group(1)), int(m.group(2) or 0)) if m else None
    where = re.search(r'>\s*O[ùu] \?\s*</(?:div|p)>\s*<(?:div|p)[^>]*>([^<]{3,120})<', page)
    place = clean(where.group(1)) if where else None
    desc = re.search(r'<meta[^>]*name="description"[^>]*content="([^"]*)"', page)
    performer = None
    if desc:
        first = clean(desc.group(1)).split(',')[0].strip()
        if re.fullmatch(r"[A-ZÀ-Ý][\w'’-]+(?: (?:de |von |van |le |la )?[A-ZÀ-Ý][\w'’-]+){1,3}", first):
            performer = first
    return when, performer, place


def fetch():
    today = today_zurich()
    items = parse_listing(get(LISTING))             # FetchError propagates: build reuses yesterday's events
    if not items:
        raise FetchError(LISTING, 'no events on the agenda page')
    events = []
    for it in items:
        f = fold(it['title'])
        if not MUSIC_RE.search(f) or NOT_RE.search(f):
            continue
        y, mo, d = it['date']
        if (y, mo, d) < (today.year, today.month, today.day) or requests_left() <= 0:
            continue
        try:
            when, performer, place = parse_details(get(it['url']))
        except FetchError as err:
            log.warning('%s: no page for %s: %s', KEY, it['url'], err)
            continue
        if not when:
            log.info('%s: no start time on %s', KEY, it['url'])
            continue
        start = local_iso(y, mo, d, *when)
        credits = []
        if performer:
            credits.append(('Organ' if 'orgue' in f else 'Performer', performer))
        kind = 'recital' if 'orgue' in f else ('vocal-opera' if re.search(r'choeur|chorale|vocal|requiem|messe|cantate', f) else None)
        slug = it['url'].rstrip('/').rsplit('/', 1)[-1]
        try:
            # "Abbaye de Saint-Maurice" is the abbey's basilica; another place is kept as the page gives it
            venue = VENUE if not place or fold(place) == 'abbaye de saint-maurice' else place
            events.append(make_event(
                KEY, slug, it['title'], start, city=CITY, venueName=venue, type=kind, credits=credits,
                url=it['url'], status='cancelled' if looks_cancelled(it['title']) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, slug, err)
    return events
