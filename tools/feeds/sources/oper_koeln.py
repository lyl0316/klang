"""Oper Köln: opera, concerts and guest performances from the house's own programme (HTML).

    https://www.oper.koeln/programm            page 1, then ?page=1 … ?page=N (50 entries each)

The programme lists every performance (about 300 for the season, 7 pages) and carries,
hidden in each entry, that evening's cast ("Abendbesetzung": role headings with the
people under them, characters for operas) plus the date and time ("Fr., 30.10.2026,
18:00"), the end time, the room ("Opernhaus", "Kinderoper" – a room of the house), the
composer ("writer" field), a category label (Premiere, Wiederaufnahme, Führung, Workshop,
Konzert …) and the ticket link. So one run costs only the listing pages; no production
page is read. Only facts are taken (date, time, title, room, cast, composer, links).
Checked against the website on 29 Oct 2026: 304 entries listed, the hidden time equals the
visible one, the end time's ``datetime`` is real UTC ("…T21:40:00Z" for 22:40 Uhr).
robots.txt only closes admin/search/user paths; the Bühnen Köln terms (AGB, Impressum)
say nothing about automated reading.

Kept: operas, operetta and musicals of the house (incl. its "Familienvorstellung" of a
main-stage production and La Piccola Cubana, staged in the Kinderoper room for adults),
concerts with a classical cast or title, dance guest performances only when an
orchestra is credited. Skipped: the children's operas ("Für alle ab N Jahren" in the
Kinderoper room, "Oper für die Allerkleinsten", the mobile Kinderoper "Gastspiel Oper"),
guided tours, workshops, public rehearsals, introductions, audience talks, festivals,
galas without a cast, closed performances, the carnival revue "Wat e Thiater" and pop
concerts (no classical cast or title). The "writer" of a choreographic opera is the
choreographer (Dido & Aeneas: Sasha Waltz), so no composer is given for those.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta

from common import FetchError, clean, log, looks_cancelled, make_event, get, to_zurich_iso

from ._consent import group_role, looks_like_person, role_en

KEY = 'oper_koeln'
NAME = 'Oper Köln'
SITE = 'https://www.oper.koeln/'
ATTRIBUTION = 'Source: Oper Köln (oper.koeln)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 25
TIME_LIMIT = 300

BASE = 'https://www.oper.koeln'
LISTING = BASE + '/programm'
MAX_PAGES = 20
CITY = 'Cologne'
TZ = 'Europe/Berlin'

_SKIP_CATEGORY = re.compile(r'(?i)führung|workshop|probe|einführung|gespräch')
_SKIP_TITLE = re.compile(r'(?i)(?<!auf)führung|workshop|einführung|publikumsgespräch|plausch|öffentliche probe|soiree|'
                         r'festival|musiktheaterlabor|\bgala\b|wat e thiater|allerkleinsten|kita')
_CHILD_INFO = re.compile(r'(?i)für alle ab \d+ jahren|für kinder|allerkleinsten|mobile kinderoper|kita')
_CLASSICAL_HINT = re.compile(r'(?i)chor|orchest|sinfon|symphon|philharm|kammer|quartett|lied|oratori|messe|'
                             r'requiem|kantate|klavier|weihnachtskonzert|oper|arie')


def _items(page_html):
    return re.split(r'<li class="s-bko-activity s-bko-activity--schedule', page_html or '')[1:]


def _field(chunk, name):
    m = re.search(rf'field--name-{name} field__item">(.*?)</div>', chunk, re.S)
    return clean(m.group(1)) if m else ''


def _cast(chunk):
    """-> [(role heading, [names])] from the hidden 'Abendbesetzung'."""
    out = []
    cast = chunk.split('s-js-cast', 1)
    if len(cast) < 2:
        return out
    for role, people in re.findall(r'bko-role-grouped-roles__title">(.*?)</h4>\s*<ul[^>]*>(.*?)</ul>', cast[1], re.S):
        names = []
        for li in re.findall(r'<li>(.*?)</li>', people, re.S):
            for n in re.split(r'\s*/\s*', clean(li)):
                n = re.sub(r'^KS\s+', '', n.strip(' ,'))
                if n:
                    names.append(n)
        if clean(role) and names:
            out.append((clean(role), names))
    return out


def parse_listing(page_html):
    """-> list of entry dicts from one programme page."""
    rows = []
    for it in _items(page_html):
        aid = re.search(r'id="s-js-activity-(\d+)"', it)
        day = re.search(r's-bko-activity__datetime"\s*datetime="(\d{4}-\d{2}-\d{2})"', it)
        link = re.search(r's-link-container[^>]*>\s*<a href="([^"]+)"[^>]*>(.*?)</a>', it, re.S)
        if not (aid and day and link):
            continue
        content = it.split('s-bko-activity__border-container--ticket', 1)[0]
        hidden = re.search(r's-js-time-string[^>]*>\s*<time[^>]*>\s*([^<]*?)\s*</time>', it)
        start = None
        m = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{4}),\s*(\d{1,2}):(\d{2})', hidden.group(1)) if hidden else None
        if m:
            start = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)), int(m.group(4)), int(m.group(5)))
        else:
            t = re.search(r's-time-string">\s*(\d{1,2}):(\d{2})', content)
            if t:
                y, mo, d = map(int, day.group(1).split('-'))
                start = datetime(y, mo, d, int(t.group(1)), int(t.group(2)))
        end = re.search(r's-bko-activity__time-end">\s*<time[^>]*>\s*(\d{1,2}):(\d{2})', content)
        place = re.search(r's-time-string">.*?</span>\s*</span>\s*([^<]*?)\s*</div>', content, re.S)
        ticket = re.search(r'href="(https://shop\.oper\.koeln/[^"]*event=(\d+)[^"]*)"', it)
        sold_out = bool(re.search(r'(?i)<p class="s-link-text[^"]*">\s*ausverkauft', it))
        rows.append({
            'id': aid.group(1), 'title': clean(link.group(2)), 'url': BASE + link.group(1),
            'start': start, 'end': (int(end.group(1)), int(end.group(2))) if end else None,
            'writer': _field(content, 'writer'), 'place': clean(place.group(1)) if place else '',
            'category': _field(content, 'category'), 'info': _field(content, 'text-7'),
            'ticket': ticket.group(1).replace('&amp;', '&') if ticket else None, 'sold_out': sold_out,
            'cast': _cast(it),
        })
    return rows


def _voice_role(desc):
    r = role_en(desc)
    if r is None:
        bare = re.sub(r'\s+(?:[IVX]{1,3}|\d)\.?$', '', clean(desc))
        if bare != clean(desc):
            r = role_en(bare)
    return r


def credits_for(cast, opera):
    """[(role heading, [names])] -> [(role, name)]: conductor, soloists/characters, groups, staging."""
    conductors, soloists, groups, staging = [], [], [], []
    for desc, names in cast:
        r = _voice_role(desc)
        for name in names:
            if not name or re.search(r'(?i)statist|n\.\s?n\.|besetzung', f'{desc} {name}'):
                continue
            if r in ('Orchestra', 'Choir', 'Ensemble'):
                groups.append((r, name))
            elif r == '':
                continue
            elif r == 'Conductor':
                conductors.append((r, name))
            elif r in ('Director', 'Choreographer'):
                staging.append((r, name))
            elif r is None:
                g = group_role(name)
                if g and not looks_like_person(name, max_words=3):
                    groups.append((g, name))
                elif opera and len(desc) <= 60:
                    soloists.append((desc, name))          # a character in the opera
                else:
                    soloists.append(('Performer', name))
            elif r in ('Narrator', 'Presenter') and opera:
                soloists.append((desc, name))
            else:
                soloists.append((r, name))
    return conductors + soloists + groups + staging


def _venue(place):
    p = clean(place)
    if not p:
        return 'Oper Köln'
    return f'Oper Köln, {p}'


def classify(row):
    """-> (keep, why_skipped, kind) where kind is 'opera', 'concert' or 'dance'."""
    title, cat, info, place, writer = row['title'], row['category'], row['info'], row['place'], row['writer']
    roles = [r for r, _ in row['cast']]
    has_orch = any(_voice_role(r) == 'Orchestra' for r in roles) or \
        any(group_role(n) == 'Orchestra' for _, ns in row['cast'] for n in ns)
    if _SKIP_CATEGORY.search(cat) or _SKIP_TITLE.search(title):
        return False, 'tour/workshop/talk/festival/gala', None
    if re.search(r'(?i)geschlossene vorstellung', info):
        return False, 'closed performance', None
    if place.lower().startswith('gastspiel') or re.search(r'(?i)kinderoper|allerkleinsten|für kinder', writer + ' ' + info) or \
            (_CHILD_INFO.search(info) and (place.lower() == 'kinderoper' or not has_orch)):
        return False, "children's format", None
    if re.search(r'(?i)tanzgastspiel|choreografien von|choreographie & regie', f'{info} {writer}'):
        return (True, None, 'dance') if has_orch else (False, 'dance without live orchestra', None)
    if cat.lower() == 'konzert' or not writer:
        if row['cast'] or _CLASSICAL_HINT.search(f'{title} {info}'):
            return True, None, 'concert'
        return False, 'no cast, not classical', None
    return True, None, 'opera'


def _start_end(row):
    start = row['start']
    end = None
    if row['end']:
        end = start.replace(hour=row['end'][0], minute=row['end'][1])
        if end <= start:
            end += timedelta(days=1)
    return to_zurich_iso(start, assume=TZ), (to_zurich_iso(end, assume=TZ) if end else None)


def fetch():
    rows, seen = [], set()
    page = get(LISTING)                                  # FetchError -> build.py keeps yesterday's
    n = 0
    while True:
        found = parse_listing(page)
        for r in found:
            if r['id'] not in seen:
                seen.add(r['id'])
                rows.append(r)
        if not found or 'rel="next"' not in page or n + 1 >= MAX_PAGES:
            break
        n += 1
        try:
            page = get(f'{LISTING}?page={n}')
        except FetchError as err:
            log.warning('%s: page %d failed: %s', KEY, n, err)
            break
    if not rows:
        raise FetchError(LISTING, 'no programme entries found (layout changed?)')
    events, skipped = [], {}
    for r in rows:
        keep, why, kind = classify(r)
        if not keep:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        if r['start'] is None:
            skipped['no time'] = skipped.get('no time', 0) + 1
            continue
        start, end = _start_end(r)
        credits = credits_for(r['cast'], kind == 'opera')
        program = None
        if kind == 'opera' and r['writer'] and looks_like_person(r['writer'], max_words=5) and \
                not re.search(r'(?i)choreogra', r['info']):
            program = [(r['writer'], r['title'])]
        if kind == 'opera':
            typ = 'vocal-opera'
        elif kind == 'dance':
            typ = 'orchestral'
        else:
            typ = None                                    # build.py infers it from the cast
        try:
            events.append(make_event(
                KEY, r['id'], r['title'], start, end=end, city=CITY, venueName=_venue(r['place']), type=typ,
                credits=credits, program=program, ticketUrl=r['ticket'], url=r['url'],
                status='cancelled' if looks_cancelled(f"{r['title']} {r['category']} {r['info']}") else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, r['id'], err)
    log.info('%s: %d entries on %d page(s), %d kept; skipped %s', KEY, len(rows), n + 1, len(events), skipped)
    return events
