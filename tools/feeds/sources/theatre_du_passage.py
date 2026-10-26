"""Théâtre du Passage, Neuchâtel: the opera (and classical-concert) performances of the
theatre's season, from its own site.

    https://www.theatredupassage.ch/                         one request: the season with genres
    https://www.theatredupassage.ch/programme/detail/<id>    one request per kept production

The home page lists every production with its genre ("Opéra", "Musique", "Théâtre",
"Humour" ...) and dates. Only opera/operetta and explicitly classical concert genres are
kept: the theatre's "Musique" genre is mostly chanson, sing-alongs and crossover shows.
The production page gives every performance with its local start time ("DI 11 AVRIL
2027 17:00"), the hall and the credits ("Avec" list, "Direction musicale", "Mise en
scène"). Only these facts are taken; the presentation text is not.

robots.txt: "User-agent: *" with no rule, everything allowed. No terms about reuse.
"""
from __future__ import annotations

import re

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, \
    today_zurich
from ._westsouth import DATE_RE, find_date, fold, group_role, infer_type, known_role, local_iso

KEY = 'theatre_du_passage'
NAME = 'Théâtre du Passage, Neuchâtel'
SITE = 'https://www.theatredupassage.ch/'
ATTRIBUTION = 'Source: Théâtre du Passage (theatredupassage.ch)'
KIND = 'venue'
MAX_REQUESTS = 15
TIME_LIMIT = 120

BASE = 'https://www.theatredupassage.ch'
CITY = 'Neuchâtel'
KEEP_GENRES = re.compile(r'\bop[ée]ra\b|op[ée]rette|lyrique|musique classique|concert classique|r[ée]cital')
DROP_GENRES = re.compile(r'famille|jeune public|conference|cinema|documentaire|visite|action culturelle|pop\b')


def parse_listing(html):
    """-> [{'url', 'genres', 'title'}] (each production once)."""
    out, seen = [], set()
    for m in re.finditer(r"href='(/programme/detail/[^']+)'", html or ''):
        if m.group(1) in seen:
            continue
        seg = html[m.start():m.start() + 1200]
        genres = re.search(r"class='genres'>(.*?)</div>", seg, re.S)
        title = re.search(r'<h3>(.*?)</h3>', seg, re.S)
        seen.add(m.group(1))
        out.append({'url': BASE + m.group(1), 'genres': clean(genres.group(1)) if genres else '',
                    'title': clean(title.group(1)) if title else ''})
    return out


def _lines(html):
    page = re.sub(r'<(script|style)\b.*?</\1>', ' ', html or '', flags=re.S)
    return [clean(x) for x in re.split(r'<[^>]+>', page) if clean(x)]


def parse_details(html):
    """Production page -> dict(perfs [(iso, sold_out)], hall, credits, composer)."""
    lines = _lines(html)
    perfs, credits, composer, hall = [], [], None, None
    try:
        i = lines.index('Date')
    except ValueError:
        i = -1
    if i >= 0:
        j = i + 1
        pending = None
        while j < len(lines) and lines[j] not in ('Durée', 'Lieu'):
            ln = lines[j]
            d = find_date(ln)
            t = re.search(r'\b(\d{1,2}):(\d{2})\b', ln)
            if d:
                pending = d
            if pending and t:
                perfs.append(local_iso(*pending, int(t.group(1)), int(t.group(2))))
                pending = None
            j += 1
    if 'Lieu' in lines:
        k = lines.index('Lieu')
        hall = lines[k + 1] if k + 1 < len(lines) else None
    m = re.search(r'\bDe ([A-ZÀ-Ý][\w.\'’-]+(?: (?:von |van |de )?[A-ZÀ-Ý][\w.\'’-]+){1,3})', ' '.join(lines))
    if m:
        composer = m.group(1)
    if 'Avec' in lines:
        k = lines.index('Avec') + 1
        label = 'Performer'
        while k < len(lines) and not lines[k].startswith('©') and lines[k] not in ('Plus d\'infos', 'Plus d’infos'):
            ln = lines[k]
            role = known_role(ln)
            if role is not None and len(ln) <= 40 and not group_role(ln):
                label = role                                   # a heading: "Direction musicale", "Mise en scène"
            elif role is None or group_role(ln):
                name = re.sub(r'\s*\((?:direction|dir\.)[^)]*\)', '', ln).strip()
                g = group_role(name)
                if label:
                    credits.append((g or label, name))
            k += 1
    return {'perfs': perfs, 'hall': hall, 'credits': credits, 'composer': composer}


def fetch():
    today = today_zurich()
    items = parse_listing(get(BASE + '/'))          # FetchError propagates: build reuses yesterday's events
    if not items:
        raise FetchError(BASE, 'no productions on the home page')
    events = []
    for it in items:
        g = fold(it['genres'])
        if not KEEP_GENRES.search(g) or DROP_GENRES.search(g) or requests_left() <= 0:
            continue
        try:
            info = parse_details(get(it['url']))
        except FetchError as err:
            log.warning('%s: no page for %s: %s', KEY, it['url'], err)
            continue
        opera = bool(re.search(r'op[ée]r', g))
        program = [(info['composer'], it['title'])] if info['composer'] and opera else []
        kind = 'vocal-opera' if opera else infer_type(it['title'], info['credits'], program=program)
        venue = f"Théâtre du Passage, {info['hall']}" if info['hall'] else 'Théâtre du Passage'
        slug = it['url'].rsplit('/', 1)[-1]
        for start in info['perfs']:
            if to_zurich_datetime(start).date() < today:
                continue
            try:
                events.append(make_event(
                    KEY, f'{slug}-{start[:16].replace("-", "").replace(":", "").replace("T", "")}', it['title'], start,
                    city=CITY, venueName=venue, type=kind, credits=info['credits'], program=program,
                    url=it['url'], ticketUrl=it['url'],
                    status='cancelled' if looks_cancelled(it['title']) else 'scheduled'))
            except ValueError as err:
                log.warning('%s: skipped %s: %s', KEY, slug, err)
    return events
