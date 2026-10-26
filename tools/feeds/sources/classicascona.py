"""classicAscona (Settimane Musicali di Ascona): the autumn festival's concerts in Ascona,
Locarno and the Locarnese (mid-September to mid-October), from the festival's own site.

    https://classicascona.ch/concerti/            one request (plus up to 2 further pages)

The concert list shows each concert as a card: the day ("10.10"), the local start time
and title ("19:30 | Concerto per la pace"), the place ("Chiesa San Francesco, Locarno"),
the category and the performers ("Soprano: Name", ensembles). The festival year comes
from the page header ("18 settembre - 10 ottobre 2026"). Only these facts are taken.
Outside the festival the page lists past concerts only, so the reader returns nothing.

robots.txt: WordPress default (only /wp-admin/ disallowed). No terms about reuse.

Skipped: children's and school projects, readings ("Musica e letteratura"), talks
("Introduzione"), sing-alongs, cooking and walks, masterclasses.
"""
from __future__ import annotations

import re

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, \
    today_zurich
from ._westsouth import find_date, fold, group_role, infer_type, is_not_a_concert, known_role, local_iso, role_for

KEY = 'classicascona'
NAME = 'classicAscona – Settimane Musicali di Ascona'
SITE = 'https://classicascona.ch/'
ATTRIBUTION = 'Source: classicAscona – Settimane Musicali di Ascona (classicascona.ch)'
KIND = 'festival'
MAX_REQUESTS = 4
TIME_LIMIT = 90

LISTING = 'https://classicascona.ch/concerti/'
SKIP_RE = re.compile(r'lettura|reading|lesung|cucina|cooking|gourmet|passeggiata|escursione|masterclass|bambini|'
                     r'ragazzi|conferenza|incontro|film|introduzione|sing ?along|per le strade|musica e letteratura')
# children's / school projects named only in the performer lines ("Progetto Accademia per bambini e ragazzi")
SKIP_ARTISTS_RE = re.compile(r'per bambini|scuole di|\bpubblico\b')
# a second part of the place that is a building, not a town ("Isole di Brissago, Villa Emden")
_BUILDING_RE = re.compile(r'^(chiesa|villa|osteria|sala|teatro|aula|palazzo|castello|piazza|spiaggia|chiostro|biblioteca)\b')


def festival_year(html):
    m = re.search(r'\d{1,2}\s+[a-z]+\s*[-–]\s*\d{1,2}\s+[a-z]+\s+(\d{4})', fold(clean(html)))
    return int(m.group(1)) if m else None


def _place(text):
    """'Chiesa San Francesco, Locarno' -> ('Chiesa San Francesco', 'Locarno')."""
    t = re.sub(r'\s*\[.*?\]\s*', ' ', clean(text)).strip()
    if ',' in t:
        venue, town = (x.strip() for x in t.split(',', 1))
        town = town.split(',')[0].strip()
        if re.search(r'aula magna|piscina|padiglione', fold(town)):
            venue, town = f'{venue}, {town}', 'Ascona'
        elif _BUILDING_RE.search(fold(town)):            # "Bordei, Chiesa e Osteria Giardino"
            place = venue
            venue, town = f'{town}, {place}', ('Brissago' if 'brissago' in fold(place) else place)
        return venue, town
    if re.search(r'brissago', fold(t)):
        return t, 'Brissago'
    return t, 'Ascona'


def parse_cards(html, year):
    out = []
    for card in re.split(r'class="brxe-[a-z0-9]+ brxe-block event-card"', html or '')[1:]:
        day = re.search(r'event-card__date">(\d{1,2})\.(\d{1,2})<', card)
        head = re.search(r'event-card__heading"><a href="([^"]+)"[^>]*>(.*?)</a>', card, re.S)
        if not day or not head:
            continue
        m = re.match(r'^\s*(\d{1,2})[:.](\d{2})\s*\|\s*(.+)$', clean(head.group(2)))
        if not m:
            continue
        loc = re.search(r'event-card__location">(.*?)</div>', card, re.S)
        cat = re.search(r'event-card__category">(.*?)</div>', card, re.S)
        artists = [clean(a) for a in re.findall(r'event-card__artist-name"><p>(.*?)</p>', card, re.S)]
        out.append({'url': head.group(1), 'title': clean(m.group(3)), 'day': (int(day.group(2)), int(day.group(1))),
                    'time': (int(m.group(1)), int(m.group(2))), 'place': clean(loc.group(1)) if loc else '',
                    'category': clean(cat.group(1)) if cat else '', 'artists': artists,
                    'sold_out': 'event-card__sold-out' in card, 'year': year})
    return out


def _credits(artists):
    out = []
    for a in artists:
        m = re.match(r'^([^:]{2,40}):\s*(.+)$', a)
        if m:
            # Italian "pianoforte" is the modern piano (in French listings it means fortepiano)
            role = 'Piano' if fold(m.group(1)).strip() == 'pianoforte' else known_role(m.group(1), m.group(2))
            if role is None and m.group(2)[:1].islower():
                continue                     # "Name: pioniere della cucina ...": a guest's description, not a role
            if role is None:
                role = role_for(m.group(1), m.group(2))
            if role:
                out.append((role, m.group(2).strip()))
        elif a:
            out.append((group_role(a) or 'Performer', a))
    return out


def fetch():
    today = today_zurich()
    html = get(LISTING)                          # FetchError propagates: build reuses yesterday's events
    year = festival_year(html)
    if not year:
        raise FetchError(LISTING, 'festival year not found on the concert list')
    cards = parse_cards(html, year)
    page = 2
    while cards and requests_left() > 0 and page <= 3 and f'/concerti/page/{page}/' in html and \
            any((year, *c['day']) >= (today.year, today.month, today.day) for c in cards):
        try:
            html = get(f'{LISTING}page/{page}/')
        except FetchError as err:
            log.warning('%s: page %d unavailable: %s', KEY, page, err)
            break
        cards += parse_cards(html, year)
        page += 1
    events, seen = [], set()
    for c in cards:
        if c['url'] in seen or SKIP_RE.search(fold(c['title'])) or is_not_a_concert(c['title']) or \
                SKIP_ARTISTS_RE.search(fold(' '.join(c['artists']))):
            continue
        seen.add(c['url'])
        start = local_iso(c['year'], *c['day'], *c['time'])
        if to_zurich_datetime(start).date() < today:
            continue
        credits = _credits(c['artists'])
        venue, town = _place(c['place'])
        slug = c['url'].rstrip('/').rsplit('/', 1)[-1]
        try:
            events.append(make_event(
                KEY, f'{c["year"]}-{slug}', c['title'], start, city=town, venueName=venue,
                type=infer_type(c['title'], credits), series=c['category'] or 'classicAscona', credits=credits,
                url=c['url'], ticketUrl=c['url'], status='cancelled' if looks_cancelled(c['title']) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, slug, err)
    return events
