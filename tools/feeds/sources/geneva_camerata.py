"""Geneva Camerata (GECA): the orchestra's own concert series in Geneva, from its site.

    https://www.genevacamerata.com/fr/concerts      one request: the upcoming season

Each concert card gives the series ribbon ("Concerts Prestige", "Concerts exceptionnels",
"Concerts Sauvage", "GECA Underground", "Concerts en famille", "Rencontres magiques",
"GECA en tournée"), one <time datetime> per performance (UTC, e.g. 2026-11-03T19:00:00Z
for 20:00 in Geneva), the title, the place ("Bâtiment des Forces Motrices - Genève -
Suisse") and the artists (as image captions). The concert page of each kept concert
(about 5 requests) adds each artist's role ("Artistes": <strong>Name</strong> <em>Direction</em>).
Only these facts are taken.

Kept: the Prestige and exceptional concerts in Switzerland. Skipped: the pop/rock
crossover nights (Sauvage, Underground), family and children's formats, and the tour
(mostly abroad, listed without start times).

robots.txt: Drupal default (admin paths only). No terms about reuse on the site.
"""
from __future__ import annotations

import re
from urllib.parse import urljoin

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, \
    to_zurich_iso, today_zurich
from ._westsouth import VOICES, fold, group_role, infer_type, role_for

KEY = 'geneva_camerata'
NAME = 'Geneva Camerata'
SITE = 'https://www.genevacamerata.com/'
ATTRIBUTION = 'Source: Geneva Camerata (genevacamerata.com)'
KIND = 'orchestra'
MAX_REQUESTS = 12
TIME_LIMIT = 90

BASE = 'https://www.genevacamerata.com'
LISTING = BASE + '/fr/concerts'
KEEP_SERIES = ('prestige', 'exceptionnel')
ORCHESTRA = 'Geneva Camerata'


def parse_cards(html):
    out = []
    for card in re.split(r'<div class="geca-box ', html or '')[1:]:
        link = re.search(r'<a href="(/fr/concerts/[^"]+)"', card)
        name = re.search(r'<h2 class="concert-name[^"]*">(.*?)</h2>', card, re.S)
        series = re.search(r'geca-ribbon-name">(.*?)</span>', card, re.S)
        if not link or not name:
            continue
        times = re.findall(r'<time datetime="([^"]+)"', card)
        after = card.split('</h2>', 1)[-1]
        place = re.search(r'<div>(.*?)</div>', after, re.S)
        artists = [clean(a) for a in re.findall(r'node--type-artiste[^>]*>\s*<img[^>]*alt="([^"]*)"', card)]
        out.append({'url': urljoin(BASE, link.group(1)), 'title': clean(name.group(1)),
                    'series': clean(series.group(1)) if series else '', 'times': times,
                    'place': clean(place.group(1)) if place else '', 'artists': [a for a in artists if a],
                    'soldout': 'geca-ribbon-soldout' in card})
    return out


def parse_roles(html):
    """Concert page -> [(role, name)] from the "Artistes" block
    (<strong>David Greilsammer</strong> <em>Direction</em>; groups have no role line)."""
    block = (html or '').split('>Artistes</h3>', 1)
    if len(block) < 2:
        return []
    block = block[1].split('class="p-accordion"', 1)[0]
    out = []
    for a in re.findall(r'<a href="/fr/artist/[^"]*"[^>]*>(.*?)</a>', block, re.S):
        name = re.search(r'<strong>(.*?)</strong>', a, re.S)
        label = re.search(r'<em>(.*?)</em>', a, re.S)
        name, label = clean(name.group(1)) if name else '', clean(label.group(1)) if label else ''
        if not name:
            continue
        if fold(name) in ('orchestre geca', 'geca', 'geneva camerata', 'orchestre geneva camerata'):
            out.append(('Orchestra', ORCHESTRA, ''))
            continue
        role = role_for(label, name) if label else (group_role(name) or 'Performer')
        if role:
            out.append((role, name, fold(label)))
    # French "alto" is the viola, except next to singers (Soprano, Alto, Tenor, Baryton)
    singers = any(r in VOICES and lab != 'alto' for r, _, lab in out)
    return [('Alto' if singers and lab == 'alto' else r, n) for r, n, lab in out]


def fetch():
    today = today_zurich()
    cards = parse_cards(get(LISTING))            # FetchError propagates: build reuses yesterday's events
    if not cards:
        raise FetchError(LISTING, 'no concert cards')
    events = []
    for c in cards:
        if not any(k in fold(c['series']) for k in KEEP_SERIES):
            continue
        parts = [p.strip() for p in c['place'].split(' - ')]
        if len(parts) >= 2 and fold(parts[-1]) not in ('suisse', 'switzerland', 'schweiz'):
            continue                                  # abroad
        venue = parts[0] if parts else None
        city = parts[1] if len(parts) >= 3 else 'Genève'
        starts = []
        for t in c['times']:
            try:
                start = to_zurich_iso(t)
            except ValueError:
                continue
            if start[11:16] == '00:00' or to_zurich_datetime(start).date() < today:
                continue                              # midnight = time not announced
            starts.append(start)
        if not starts:
            continue
        credits = []
        if requests_left() > 0:
            try:
                credits = parse_roles(get(c['url']))
            except FetchError as err:
                log.warning('%s: no concert page for %s: %s', KEY, c['url'], err)
        named = {fold(n) for _, n in credits}
        for a in c['artists']:                       # card captions the page did not list
            if fold(a) in ('orchestre geca', 'geca', 'geneva camerata'):
                if not any(r == 'Orchestra' and n == ORCHESTRA for r, n in credits):
                    credits.append(('Orchestra', ORCHESTRA))
            elif fold(a) not in named:
                credits.append((group_role(a) or 'Performer', a))
        if not any(r == 'Orchestra' for r, _ in credits):
            credits.append(('Orchestra', ORCHESTRA))
        slug = c['url'].rstrip('/').rsplit('/', 1)[-1]
        for start in starts:
            try:
                events.append(make_event(
                    KEY, f'{slug}-{start[:16].replace("-", "").replace(":", "").replace("T", "")}', c['title'], start,
                    city=city, venueName=venue, type=infer_type(c['title'], credits) or 'orchestral',
                    series=c['series'], credits=credits, url=c['url'], ticketUrl=c['url'],
                    status='cancelled' if looks_cancelled(c['title']) else 'scheduled'))
            except ValueError as err:
                log.warning('%s: skipped %s: %s', KEY, slug, err)
    return events
