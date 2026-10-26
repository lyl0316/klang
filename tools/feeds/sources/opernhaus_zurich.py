"""Opernhaus Zürich: opera, ballet and concerts from the house's own calendar.

    https://www.opernhaus.ch/spielplan/kalendarium/          page 1, then /page2 … /pageN
    https://www.opernhaus.ch/spielplan/kalendarium/<slug>/   one page per production

The calendar (about 20 pages of 25 entries) has one schema.org Event JSON-LD block per
performance, emitted twice (before and inside each entry); the entry's HTML adds the
performance id (``uid_N``), the room and a one-line genre note ("Oper von …",
"Ballett von …", "2. Philharmonisches Konzert"). ``startDate`` has no offset and is Swiss
local time (checked against the site on 26 Oct 2026: 19.00 on the page = "T19:00").

Production pages carry one JSON-LD Event per remaining performance with that evening's
cast in ``performer`` (role in ``description``), so conductors and singers are per date.
They cost one request per production, so they are fetched for ballets first (to learn
whether there is live music) and then for the productions playing soonest, within the
request cap. Concert pages add the programme ("Composer: Work" lines) and the players
("Flöte <em>Name</em>"). Only those facts are taken, never descriptions or biographies.

The terms of opernhaus.ch say its content may not be reproduced without consent. Klang
republishes facts only (date, time, title, room, performers, works, links back).

Skipped: workshops, guided tours (Führungen), open space, talks, matinees/previews
(introductions), children's and school-only formats, family concerts, galas/benefits,
live broadcasts ("Opernhaus für alle"), guest performances abroad, dance-school shows and
ballets without live music (no "Musikalische Leitung" on the production page).
"""
from __future__ import annotations

import html as _html
import re
from datetime import datetime

from common import (BudgetExceeded, FetchError, clean, get, guess_type, jsonld_events, log, looks_cancelled,
                    make_event, requests_left, to_zurich_iso)

from ._consent import group_role, looks_like_person, role_en

KEY = 'opernhaus_zurich'
NAME = 'Opernhaus Zürich'
SITE = 'https://www.opernhaus.ch/'
ATTRIBUTION = 'Source: Opernhaus Zürich (opernhaus.ch). Facts only; details and tickets on opernhaus.ch.'
KIND = 'venue'
MAX_REQUESTS = 60
TIME_LIMIT = 420

BASE = 'https://www.opernhaus.ch'
LISTING = BASE + '/spielplan/kalendarium/'
PAGE = BASE + '/spielplan/kalendarium/page{n}'
MAX_PAGES = 40
CITY = 'Zürich'

# room / place as the calendar names it -> (venueName for Klang, city)
_PLACES = (
    (r'^hauptb[üu]hne', ('Opernhaus Zürich, Hauptbühne', 'Zürich')),
    (r'^studiob[üu]hne', ('Opernhaus Zürich, Studiobühne', 'Zürich')),
    (r'^spiegelsaal', ('Opernhaus Zürich, Spiegelsaal', 'Zürich')),
    (r'^opernhaus$', ('Opernhaus Zürich', 'Zürich')),
    (r'^tonhalle', ('Tonhalle Zürich', 'Zürich')),
    (r'^zko[ -]haus', ('ZKO-Haus', 'Zürich')),
    (r'winterthur', (None, 'Winterthur')),
    (r'dietikon', (None, 'Dietikon')),
)
_ABROAD_RE = re.compile(r'new york|carnegie|paris|london|wien\b|vienna|berlin|hamburg|m[üu]nchen|munich|tokyo|'
                        r'salzburg|baden-baden|edinburgh|mailand|milano|amsterdam|madrid|barcelona|'
                        r'gastspiel in (?!winterthur|z[üu]rich|basel|bern|luzern|gen[fè]|lausanne|st\.? gallen)', re.I)

# never a concert: checked on the title
_DROP_TITLE_RE = re.compile(
    r'workshop|f[üu]hrung|fuehrung|guided tour|backstage|open space|talks?\b|gespr[äa]ch|matinee|preview|'
    r'einf[üu]hrung|musikgeschichten|klanglabor|impro-?opera|squillo|perform!|familien|schulvorstellung|'
    r'schulworkshop|benefiz|\bgala\b|night at the opera|ballettschule|tanzakademie|\btaz\b|opernhaus f[üu]r alle|'
    r'werkeinf|kurs\b|probe\b|ferien', re.I)
# never a concert: checked on the one-line note under the title
_DROP_NOTE_RE = re.compile(r'workshop|f[üu]r kinder|kinder ab|jährige|jaehrige|jugendliche|gesprächsreihe|geschlossene|'
                           r'schulvorstellung|familienkonzert', re.I)
_OPERA_RE = re.compile(r'\b(kinder)?oper(n|ette)?\b|konzertante auff|musiktheater|singspiel', re.I)
_BALLET_RE = re.compile(r'ballett von|choreografien? von|choreographien? von|\bballett\b', re.I)
_CONCERT_RE = re.compile(r'konzert|liederabend|rezital|recital|\bmesse\b|-messe\b|te deum|requiem|oratori|kantate|'
                         r'philharmon|scintilla|opera nova|orche|sinfoni|symphon|kammermusik|lieder\b', re.I)


def _weekday(start):
    try:
        return datetime.strptime(str(start)[:10], '%Y-%m-%d').weekday()
    except ValueError:
        return 6


def _venue(location):
    loc = clean(location)
    for rx, (venue, city) in _PLACES:
        if re.search(rx, loc, re.I):
            return venue or loc, city
    return loc or 'Opernhaus Zürich', CITY


def _note(desc_html):
    """The one-line genre note under the title, without the 'AMAG Volksvorstellung' label."""
    text = clean(re.sub(r'(?is)<p>\s*AMAG Volksvorstellung\s*</p>', ' ', desc_html or ''))
    return clean(re.sub(r'AMAG Volksvorstellung', ' ', text))


def classify(title, note):
    """-> 'opera' | 'ballet' | 'concert' | 'musictheatre' | 'maybe' (needs the production
    page) | None (not for Klang)."""
    t, n = clean(title), clean(note)
    if _DROP_TITLE_RE.search(t) and not re.search(r'galakonzert', t, re.I):
        return None
    if _DROP_NOTE_RE.search(n):
        return None
    if re.search(r'konzert|liederabend|rezital|recital', t, re.I):
        return 'concert'
    if re.search(r'musiktheater', n, re.I):
        return 'musictheatre'
    if _OPERA_RE.search(n) or re.search(r'\bopern\b', t, re.I):
        return 'opera'
    if _BALLET_RE.search(n):
        return 'ballet'
    if _CONCERT_RE.search(f'{t} {n}'):
        return 'concert'
    return 'maybe'          # decided by the production page (genre line), if it is read


def _composer_from_note(note):
    """'Oper von Wolfgang Amadeus Mozart' / 'Oper Camille Saint-Saëns' -> the composer."""
    m = re.match(r'^(?:Kinder)?Oper(?:ette)?\s+(?:von\s+)?(.+?)\s*$', clean(note), re.I)
    if m and looks_like_person(m.group(1), max_words=5):
        return m.group(1)
    return None


def _choreographers_from_note(note):
    m = re.match(r'^(?:Ballett|Choreografien?|Choreographien?)\s+von\s+(.+?)\s*$', clean(note), re.I)
    if not m:
        return []
    names = re.split(r'\s*(?:,|\bund\b|&)\s*', m.group(1))
    return [n.strip() for n in names if looks_like_person(n.strip(), max_words=4)]


def _series(title, note):
    text = f'{title} {note}'
    if re.search(r'philharmonische?s? konzert', text, re.I):
        return 'Philharmonische Konzerte'
    if re.search(r'kammerkonzert', title, re.I):
        return 'Kammerkonzerte'
    if re.search(r'liederabend', title, re.I):
        return 'Liederabende'
    if re.search(r'scintilla', title, re.I):
        return 'La Scintilla'
    if re.search(r'opera nova', text, re.I):
        return 'Opera Nova'
    return None


def _concert_type(title, note, credits):
    text = f'{title} {note}'
    roles = {r for r, _ in credits}
    if re.search(r'liederabend|rezital|recital', text, re.I):
        return 'recital'
    if re.search(r'kammerkonzert|kammermusik|opera nova', text, re.I):
        return 'chamber'
    if re.search(r'messe\b|te deum|requiem|oratori|kantate|galakonzert.*opernstudio', text, re.I):
        return 'vocal-opera'
    if re.search(r'philharmon|neujahrskonzert|scintilla|orche|open-air-konzert|sinfoni|symphon', text, re.I) \
            or 'Orchestra' in roles:
        return 'orchestral'
    return guess_type(text)


# ---------------------------------------------------------------------------
# calendar pages
# ---------------------------------------------------------------------------

_LD_RE = re.compile(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', re.S | re.I)


def parse_listing(page_html):
    """-> list of dicts, one per calendar entry (raw facts, not yet filtered)."""
    out = []
    chunks = re.split(r'<div class="el-eventlistitem', page_html or '')
    for chunk in chunks[1:]:
        m = re.match(r'[^>]*\bid="uid_(\d+)"', chunk)
        if not m:
            continue
        ld = None
        for block in _LD_RE.findall(chunk):
            evs = jsonld_events(f'<script type="application/ld+json">{block}</script>')
            if evs:
                ld = evs[0]
                break
        if not ld or not ld.get('startDate'):
            continue
        h2 = re.search(r'<h2[^>]*>(.*?)</h2>', chunk, re.S)
        loc = re.search(r'<div class="location">(.*?)</div>', chunk, re.S)
        note = re.search(r'<div class="description">(.*?)</div>', chunk, re.S)
        links = re.search(r'<div class="links[^"]*">(.*?)</div>\s*</div>', chunk, re.S)
        link = re.search(r'<a href="([^"]+)" class="link-box"', chunk)
        offers = ld.get('offers') if isinstance(ld.get('offers'), dict) else {}
        out.append({
            'uid': m.group(1),
            'title': clean(h2.group(1)) if h2 else clean(ld.get('name')),
            'start': ld.get('startDate'),
            'end': ld.get('endDate'),
            'location': clean(loc.group(1)) if loc else clean((ld.get('location') or {}).get('name')),
            'note': _note(note.group(1)) if note else '',
            'flags': clean(links.group(1)) if links else '',
            'url': _abs(ld.get('url') or (link.group(1) if link else None)),
            'ticket': _abs(_html.unescape(offers.get('url') or '')) or None,
        })
    return out


def _abs(url):
    if not url:
        return None
    url = _html.unescape(str(url)).strip()
    if url.startswith('/'):
        url = BASE + url
    return url if url.startswith('http') else None


def _has_next(page_html):
    return bool(re.search(r'kalendarium/page\d+[\'"][^>]*>\s*<span>\s*Vorw', page_html or ''))


# ---------------------------------------------------------------------------
# production pages
# ---------------------------------------------------------------------------

def parse_detail(page_html):
    """-> {'casts': {'YYYY-MM-DDTHH:MM': [(role_text, name, is_group)]}, 'live': bool,
           'program': [(composer, title)], 'players': [(role, name)], 'music': [composer]}"""
    casts, live = {}, False
    for ev in jsonld_events(page_html):
        start = str(ev.get('startDate') or '')[:16]
        people = []
        for p in ev.get('performer') or []:
            if not isinstance(p, dict):
                continue
            desc, name = clean(p.get('description')), clean(p.get('name'))
            is_group = 'Group' in str(p.get('@type') or '') or 'Organization' in str(p.get('@type') or '')
            if re.match(r'(?i)musikalische leitung|dirigent', desc) or (is_group and re.match(r'(?i)orchester', desc)):
                live = True
            people.append((desc, name, is_group))
        if start and start not in casts:
            casts[start] = people
    # labels of the creative team (also there when the JSON-LD has no performers)
    for label in re.findall(r'<div class="label">\s*(.*?)\s*</div>', page_html or '', re.S):
        if re.match(r'(?i)musikalische leitung', clean(label)):
            live = True
    info = re.search(r'<div class="program-info">\s*<div class="inner[^"]*">(.*?)</div>\s*</div>', page_html or '', re.S)
    program, players = parse_program_info(info.group(1) if info else '')
    longinfo = re.search(r'<div class="longinfo">(.*?)</div>', page_html or '', re.S)
    music, genre, composer = [], None, None
    if longinfo:
        lines = [clean(x) for x in re.split(r'(?i)<br\s*/?>|</p>|<p[^>]*>|\n', longinfo.group(1)) if clean(x)]
        m = re.search(r'Musik von (.+?)(?:<|$)', longinfo.group(1).replace('\n', ' '))
        if m:
            music = [n for n in (x.strip() for x in re.split(r'\s*(?:,|\bund\b|&)\s*', clean(m.group(1))))
                     if looks_like_person(n, max_words=5)]
        for i, line in enumerate(lines[:4]):
            if re.match(r'(?i)(kinder)?oper(ette)?\b|eine .{0,30}\boper\b|.{0,40}\boper in\b', line):
                genre = 'opera'
                if i > 0 and looks_like_person(lines[i - 1], max_words=5):
                    composer = lines[i - 1]
                break
            if re.match(r'(?i)ballett\b|choreografien? von', line):
                genre = 'ballet'
                break
            if re.match(r'(?i)musiktheater', line):
                genre = 'musictheatre'
                break
    return {'casts': casts, 'live': live, 'program': program, 'players': players, 'music': music,
            'genre': genre, 'composer': composer}


_CONT_END_RE = re.compile(r'\b(und|f[üu]r|and|et|mit|aus|in|de|der|die|das|op\.|nach|von|à|pour)$', re.I)


def parse_program_info(fragment):
    """'Flöte <em>Name</em>' lines -> players; 'Composer: Work' lines -> works. Prose is ignored."""
    if not fragment:
        return [], []
    text = re.sub(r'\s+', ' ', fragment)
    text = re.sub(r'(?i)<br\s*/?>', '\n', text)
    text = re.sub(r'(?i)</p\s*>', '\n\n', text)
    players, program = [], []
    composer = None
    for raw in text.split('\n'):
        line_html = re.sub(r'^(?:\s*<(?:p|span|strong|b)\b[^>]*>)+|(?:</(?:p|span|strong|b)>\s*)+$', '', raw.strip()).strip()
        line = clean(line_html)
        if not line:
            composer = None
            continue
        if len(line) > 160 or re.search(r'[a-zäöüé]{2}[.!?]\s+[A-ZÄÖÜ][a-zäöüé]', line) or line.endswith(('.', '!', '?')) and \
                not re.search(r'\b(op|Nr|No|KV|BWV|Hob|D|Op)\.$', line):
            composer = None
            continue
        pm = re.match(r'^\s*([^<>]{2,40}?)\s*<em>(.*?)</em>\s*$', line_html) or \
            re.match(r'^\s*<em>(.*?)</em>\s*([^<>]{2,40}?)\s*$', line_html)
        if pm:
            a, b = clean(pm.group(1)), clean(pm.group(2))
            role, name = (a, b) if '<em>' not in line_html[:5] and line_html.find('<em>') > 0 else (b, a)
            r = role_en(role)
            if r and looks_like_person(name, max_words=6):
                players.append((r, name))
            continue
        m = re.match(r'^(.{2,60}?):\s*(.*)$', line)
        if m and looks_like_person(m.group(1), max_words=5) and not role_en(m.group(1)):
            composer = m.group(1).strip()
            work = m.group(2).strip()
            if work:
                program.append([composer, work])
            continue
        m = re.match(r'^Werke von (.+)$', line, re.I)
        if m:
            for c in re.split(r'\s*(?:,|\bund\b)\s*', m.group(1)):
                if looks_like_person(c, max_words=5):
                    program.append([c.strip(), ''])
            continue
        if composer:
            if program and program[-1][0] == composer and program[-1][1] and \
                    (_CONT_END_RE.search(program[-1][1]) or line[:1].islower()):
                program[-1][1] = f'{program[-1][1]} {line}'
            else:
                program.append([composer, line])
    return [(c, t) for c, t in program], players


# production staff and dancers listed among an opera's cast ('Regiemitarbeit', 'Tänzerinnen und Tänzer')
_STAFF_RE = re.compile(r'(?i)regie|mitarbeit|assisten|t[äa]nzer(in|innen)?\b|ballett|statist|souffl|inspiz|'
                       r'einstudierung|dramaturg|kost[üu]m|licht|b[üu]hnenbild|video|sounddesign|aus+t+at+ung|'
                       r'koordinat|stunt|kampf|fecht|maske|requisit|technik|produktion')


def credits_for(kind, people, players):
    """Per-performance cast -> [(role, name)] in Klang's order (conductor, soloists, groups, staging)."""
    conductors, soloists, groups, staging = [], [], [], []
    for desc, name, is_group in people:
        name = name.strip(' ,')
        if not name or len(name) > 80 or re.search(r'besetzung|bekannt gegeben', name, re.I):
            continue
        if is_group:
            r = role_en(desc)
            if r == '' or re.search(r'statist', f'{desc} {name}', re.I):
                continue
            groups.append((r if r in ('Orchestra', 'Choir', 'Ensemble') else (group_role(name) or 'Ensemble'), name))
            continue
        r = role_en(desc)
        if r == '':
            continue
        if r in ('Narrator', 'Presenter') and kind in ('opera', 'musictheatre'):
            r = None                                      # 'Sprecher' is a character in Die Zauberflöte
        if r in ('Director', 'Choreographer'):
            if kind in ('opera', 'ballet', 'musictheatre'):
                staging.append((r, name))
            continue
        if r == 'Conductor':
            conductors.append((r, name))
            continue
        if r is None:
            if kind == 'ballet' or _STAFF_RE.search(desc):
                continue                                  # dancers and staff are not musical credits
            if kind in ('opera', 'musictheatre') and desc and len(desc) <= 40 and desc.lower() != 'mit':
                soloists.append((desc, name))             # a character in the opera
            elif looks_like_person(name):
                soloists.append(('Performer', name))
            continue
        soloists.append((r, name))
    return conductors + soloists + list(players) + groups + staging


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def fetch():
    entries, seen = [], set()
    first = get(LISTING)                                     # FetchError here -> reuse yesterday
    page_html, n = first, 1
    while True:
        rows = parse_listing(page_html)
        for r in rows:
            if r['uid'] not in seen:
                seen.add(r['uid'])
                entries.append(r)
        if not rows or not _has_next(page_html) or n >= MAX_PAGES:
            break
        n += 1
        try:
            page_html = get(PAGE.format(n=n))
        except FetchError as err:
            log.warning('%s: calendar page %d failed: %s', KEY, n, err)
            break
    if not entries:
        raise FetchError(LISTING, 'no calendar entries found (layout changed?)')

    kept, skipped = [], {}
    for e in entries:
        kind = classify(e['title'], e['note'])
        if kind is None:
            skipped['not a concert'] = skipped.get('not a concert', 0) + 1
            continue
        if _ABROAD_RE.search(f"{e['location']} {e['title']}"):
            skipped['abroad'] = skipped.get('abroad', 0) + 1
            continue
        if not e['ticket'] and re.match(r'\d{4}-\d\d-\d\dT(0\d|1[01]):', str(e['start'])) and \
                _weekday(e['start']) < 5:
            # a weekday-morning performance with no ticket link is a closed school performance even
            # when the note does not say so (e.g. the Kinderopernorchester on Monday 31 May at 10.00)
            skipped['school performance'] = skipped.get('school performance', 0) + 1
            continue
        e['kind'] = kind
        kept.append(e)

    # production pages: ballets (live music?) and unclear entries first, then the soonest productions
    order, first_start = [], {}
    for e in kept:
        u = e['url']
        if u and u.startswith(BASE + '/spielplan/') and u not in first_start:
            first_start[u] = (0 if e['kind'] in ('ballet', 'maybe') else 1, e['start'])
            order.append(u)
    order.sort(key=lambda u: first_start[u])
    details = {}
    for u in order:
        if requests_left() <= 0:
            break
        try:
            details[u] = parse_detail(get(u))
        except BudgetExceeded:
            break
        except FetchError as err:
            log.warning('%s: production page failed: %s', KEY, err)

    events = []
    for e in kept:
        d = details.get(e['url'])
        kind = e['kind']
        if kind == 'maybe':
            kind = d['genre'] if d and d['genre'] else None
            if kind is None:
                skipped['not a concert (production page)'] = skipped.get('not a concert (production page)', 0) + 1
                continue
        if kind == 'ballet' and d is not None and not d['live']:
            skipped['ballet without live music'] = skipped.get('ballet without live music', 0) + 1
            continue
        venue, city = _venue(e['location'])
        people = (d['casts'].get(str(e['start'])[:16]) if d else None) or []
        credits = credits_for(kind, people, d['players'] if d else [])
        if not any(r == 'Choreographer' for r, _ in credits) and kind == 'ballet':
            credits += [('Choreographer', c) for c in _choreographers_from_note(e['note'])]
        program = list(d['program']) if d else []
        composer = (_composer_from_note(e['note']) or (d and d['composer'])) if kind == 'opera' else None
        if composer and not program:
            program = [(composer, e['title'])]
        if kind == 'ballet' and d and d['music'] and not program:
            single = re.match(r'(?i)^ballett von', e['note'])
            program = [(c, e['title'] if single else '') for c in d['music']]
        if kind == 'opera':
            ctype = 'vocal-opera'
        elif kind == 'ballet':
            ctype = 'orchestral' if (d and d['live']) else None
        elif kind == 'musictheatre':
            ctype = 'mixed'
        else:
            ctype = _concert_type(e['title'], e['note'], credits)
        cancelled = looks_cancelled(f"{e['title']} {e['note']} {e['flags']}")
        try:
            end = to_zurich_iso(e['end'], assume='Europe/Zurich') if e.get('end') else None
        except ValueError:
            end = None
        try:
            events.append(make_event(
                KEY, e['uid'], e['title'], to_zurich_iso(e['start'], assume='Europe/Zurich'), end=end,
                city=city, venueName=venue, type=ctype, series=_series(e['title'], e['note']),
                credits=credits, program=program, url=e['url'], ticketUrl=e['ticket'],
                status='cancelled' if cancelled else None))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, e['uid'], err)
    log.info('%s: %d calendar entries, %d kept, %d production pages read; skipped %s',
             KEY, len(entries), len(events), len(details), skipped)
    return events
