"""Staatstheater am Gärtnerplatz, Munich: opera, operetta, ballet and concerts (HTML).

    https://www.gaertnerplatztheater.de/de/spielplan/index.html?ajax=1&offset=N&letzterTermin=T
        one month of the programme per request (N = 0 is the current month), as the
        Spielplan page's own "Mehr laden" script loads it; "ende erreicht." after the last
    https://www.gaertnerplatztheater.de/de/produktionen/<slug>.html?ID_Vorstellung=<id>
        the production page with the cast of that one performance ("Besetzung am …")

Each programme entry has the performance id (``vorstellung-N``), the production id, the
division (``sparte-N``: 14 Oper, 2 Operette, 3 Musical, 4 Ballett, 5 Konzerte, 6 Extras,
10 JGPTheater, 33 Opernstudio, 36 Orchesterakademie, 35 Sonstiges), the date ("Do,
29.10.26"), start and end time ("19.30–22.20 Uhr", Munich local time), the room or guest
town when not the main stage ("Foyer", "Kempten"), labels (Premiere, Schulvorstellung …),
the title, a genre line ("Dramma giocoso", "Operette", "Orchesterkonzert") and the ticket
state. The production page adds the composer ("Musik von Gioachino Rossini"), the original
title, the evening's cast (conductor, director, singers by character), the house orchestra
and chorus, and for concerts the works ("<b>Richard Strauss</b><br>Metamorphosen …").

The cast is per performance, so pages are read incrementally (cap 150): a performance the
previous feed already has with its cast (same id, start and title) keeps it; the requests
left go first to one performance of every production not read yet (its composer and work
then serve all its dates), then to performances still without a cast, soonest first, then
to performances in the next two weeks and a fixed share of the others (each about once a
week), to pick up cast changes. Production facts (composer, work, director, choreographer,
orchestra, chorus) are shared by all dates; the conductor and singers only by the date read.

Kept: opera, operetta, ballet (with the house orchestra), concerts, the Opernstudio's and the
orchestra academy's concerts. Skipped: musicals, Extras (tango evenings, introductions,
guided tours, workshops, the opera ball), the youth theatre (JGPTheater), school and
children's performances, concerts for young audiences, open rehearsals, and guest
performances abroad. For a ballet only the conductor, choreographer and orchestra are kept
(the dancers alternate).

The imprint says reproducing the pages needs the theatre's consent; Klang takes facts only
(date, time, room, performers, works, links). Checked against the website on 29 Oct 2026:
265 performances in the programme, 141 kept; a first run reads ~125 performance pages (cap 150).
"""
from __future__ import annotations

import html as _html
import re

from common import (BudgetExceeded, FetchError, clean, event_id, get, infer_type, log, looks_cancelled, make_event,
                    previous_event, refresh_due, requests_left)

from ._consent import looks_like_person
from ._south_germany import credit, dedupe_credits, in_window, local_iso, parse_day, skip_title, town

KEY = 'gaertnerplatztheater'
NAME = 'Staatstheater am Gärtnerplatz'
SITE = 'https://www.gaertnerplatztheater.de/'
ATTRIBUTION = 'Source: Staatstheater am Gärtnerplatz (gaertnerplatztheater.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 150             # ~10 months of programme, the rest for performance pages
TIME_LIMIT = 900
REFRESH_NEAR_DAYS = 14
REFRESH_EVERY_DAYS = 7

BASE = 'https://www.gaertnerplatztheater.de/de/'
PROGRAMME = BASE + 'spielplan/index.html?ajax=1&offset={n}&letzterTermin={t}'
MAX_MONTHS = 16
HOUSE = 'Staatstheater am Gärtnerplatz'
ORCHESTRA = 'Orchester des Staatstheaters am Gärtnerplatz'

SPARTE_KEEP = {14: 'opera', 2: 'operetta', 4: 'ballet', 5: 'concert', 33: 'concert', 36: 'concert'}
SPARTE_SKIP = {3, 10, 35}                    # musical, youth theatre, other (Extras alone: no kept division)
TYP_SKIP = {23, 25}                          # guided tour, school performance
ROOMS = {57: '', 58: 'Foyer', 92: 'Orchesterprobensaal', 107: 'Studiobühne'}

_SKIP_TEXT = re.compile(r'(?i)junges publikum|schulklassen|generalprobenbesuch|tanz-?workshop|tanzabend|kinder|'
                        r'familienkonzert|theaterführung|spielzeitpräsentation|opernball|sing-?along|halloween|meisterklasse|'
                        r'rockballett|dancesoap|wettbewerb')


def _text(fragment):
    return clean(_html.unescape(fragment or ''))


# ---------------------------------------------------------------------------
# programme (one month per request)
# ---------------------------------------------------------------------------

def parse_programme(page_html):
    rows = []
    for chunk in re.split(r'<div class="mb-3 text-center p-5 vorstellung performance', page_html or '')[1:]:
        classes = chunk[:chunk.find('">')]
        vid = re.search(r'\bvorstellung-(\d+)\b', classes)
        pid = re.search(r'\bproduktion-([1-9]\d*)\b', classes)
        if not vid:
            continue
        sparten = {int(x) for x in re.findall(r'\bsparte-(\d+)\b', classes)} - {0}
        typen = {int(x) for x in re.findall(r'\btyp-(\d+)\b', classes)} - {0}
        orte = {int(x) for x in re.findall(r'\bort-(\d+)\b', classes)} - {0}
        day = parse_day(re.search(r'fw-semibold"\s*>\s*(.*?)</div>', chunk, re.S).group(1)
                        if re.search(r'fw-semibold"\s*>\s*(.*?)</div>', chunk, re.S) else '')
        times = re.search(r'<div class="fw-bold">\s*(\d{1,2})[.:](\d{2})(?:\s*[–-]\s*(\d{1,2})[.:](\d{2}))?\s*Uhr',
                          chunk)
        place = re.search(r'<div class="text-produktion-font-color">\s*(.*?)\s*</div>', chunk, re.S)
        icons = re.search(r'<div class="text-produktion-font-color icons">(.*?)</div>', chunk, re.S)
        link = re.search(r'<a href="\./(produktionen/[^"]+)" class="text-decoration-none"[^>]*>(.*?)</a>', chunk, re.S)
        genre = re.search(r'<span class="text-uppercase me-3 fw-bold">(.*?)</span>', chunk, re.S)
        pills = re.findall(r'<span class="rounded-pill[^"]*">(.*?)</span>', chunk, re.S)
        note = re.search(r'<div class="children-without-margin">(.*?)</div>', chunk, re.S)
        ticket = re.search(r'<a href="(https://tickets\.[^"]+)"[^>]*class="ticket', chunk)
        state = re.findall(r'class="(?:ticket )?btn btn-produktion[^"]*"[^>]*>(.*?)</(?:a|span)>', chunk, re.S)
        if not (day and times and link):
            continue
        rows.append({
            'id': vid.group(1), 'production': pid.group(1) if pid else None,
            'sparten': sparten, 'typen': typen, 'orte': orte, 'day': day,
            'start': (int(times.group(1)), int(times.group(2))),
            'end': (int(times.group(3)), int(times.group(4))) if times.group(3) else None,
            'place': _text(place.group(1)) if place else '',
            'labels': [_text(x) for x in re.findall(r'>([^<>]+)<', icons.group(1))] if icons else [],
            'url': BASE + _html.unescape(link.group(1)),
            'title': _text(link.group(2)),
            'genre': _text(genre.group(1)) if genre else '',
            'pills': [_text(p) for p in pills],
            'note': _text(note.group(1)) if note else '',
            'ticket': _html.unescape(ticket.group(1)) if ticket else None,
            'state': [_text(s) for s in state],
        })
    return rows


def _read_programme():
    rows, last, months = {}, 0, 0
    for n in range(MAX_MONTHS):
        if requests_left() <= 0:
            log.warning('%s: request cap reached in the programme at month %d', KEY, n)
            break
        try:
            page = get(PROGRAMME.format(n=n, t=last))
        except FetchError as err:
            if n == 0:
                raise
            log.warning('%s: programme month %d failed: %s', KEY, n, err)
            break
        months += 1
        if clean(page).startswith('ende erreicht'):
            break
        for r in parse_programme(page):
            rows.setdefault(r['id'], r)
        m = re.search(r'<div class="d-none letzterTermin">(\d+)</div>', page)
        last = m.group(1) if m else last
    log.info('%s: %d programme request(s), %d performances', KEY, months, len(rows))
    return list(rows.values())


# ---------------------------------------------------------------------------
# production pages
# ---------------------------------------------------------------------------

def parse_detail(page_html):
    """-> {'composer', 'work', 'cast': [(role, [names])], 'groups': [names], 'works': [(composer, title)]}"""
    h = page_html or ''
    out = {'composer': None, 'work': None, 'cast': [], 'groups': [], 'works': []}
    info = re.search(r'<div id="infosBox"[^>]*>(.*?)</div>', h, re.S)
    if info:
        found = re.findall(r'(?i)(?:musik|komposition)\s+von\s', info.group(1))
        paras = [p for p in re.findall(r'<p>(.*?)</p>', info.group(1), re.S)]
        for i, p in enumerate(paras):
            lines = [_text(x) for x in re.split(r'<br\s*/?>', p)]
            for line in lines:
                m = re.match(r'(?i)^(?:musik|komposition)\s+von\s+(.+?)$', line)
                name = m.group(1).strip() if m else ''
                if m and len(found) == 1 and looks_like_person(name, max_words=5) and not re.search(
                        r'(?i)\bund\b|&|\(|\bnach\b', name):
                    out['composer'] = name                  # one composer only ('Musik von Gioachino Rossini')
            if i == 0 and len(lines) == 1 and lines[0] and not re.search(r'(?i)\bvon\b|\d', lines[0]):
                out['work'] = lines[0]                       # the original title ('Il viaggio a Reims')
    box = re.search(r'<div id="besetzungBox".*?(?=<div class="col col-12 col-xl-4">|<div id="termineBox"|$)', h, re.S)
    if box:
        b = box.group(0)
        for fp in re.findall(r'<div class="function_person">(.*?)</div>', b, re.S):
            role = re.search(r'<span class="function[^"]*">(.*?)</span>', fp, re.S)
            person = re.search(r'<span class="person[^"]*">(.*)', fp, re.S)
            if not (role and person):
                continue
            names = [_text(x) for x in re.split(r'</a>\s*,|\s/\s|<br\s*/?>', person.group(1))]
            out['cast'].append((_text(role.group(1)), [n for n in names if n and n not in (',', '/')]))
        for g in re.findall(r'<b>(.*?)</b>', b, re.S):
            for line in re.split(r'<br\s*/?>', g):
                line = _text(line)
                if line:
                    out['groups'].append(line)
    inhalt = re.search(r'<div id="inhaltBox"[^>]*>(.*?)</div>', h, re.S)
    if inhalt:
        for comp, rest in re.findall(r'<b>(.*?)</b>\s*<br\s*/?>(.*?)(?=<b>|</p>|$)', inhalt.group(1), re.S):
            comp = _text(comp)
            if not looks_like_person(comp, max_words=5):
                continue
            titles = []
            for line in re.split(r'<br\s*/?>', rest):
                t = _text(line)
                if not t:
                    continue
                if titles and (re.match(r'^[(a-zäöü]|^(?:Oper|Fassung|Bearbeitung|für|nach)\b', t)
                               or titles[-1].endswith(',')):
                    titles[-1] = f'{titles[-1]} {t}'           # '»Herzog Blaubarts Burg«,' + 'Oper in einem Akt'
                else:
                    titles.append(t)
            out['works'].extend((comp, t.rstrip(',')) for t in titles)
    return out


# ---------------------------------------------------------------------------
# rows -> events
# ---------------------------------------------------------------------------

def _kind(r):
    for s in sorted(r['sparten']):
        if s in SPARTE_KEEP:
            return SPARTE_KEEP[s]
    return None


def _wanted(r):
    if r['sparten'] & SPARTE_SKIP or not _kind(r):          # Extras alone; Extras + Konzerte is a concert
        return 'not opera/operetta/ballet/concert'
    if r['typen'] & TYP_SKIP or any(l == 'Schulvorstellung' for l in r['labels']):
        return 'school / guided tour'
    if skip_title(r['title'], r['genre'], r['note'], *r['labels']) or _SKIP_TEXT.search(
            ' '.join([r['title'], r['genre'], r['note']])):
        return 'children / talk / workshop'
    return None


def _venue(r):
    """-> (venueName, English town or 'abroad')"""
    room = next((ROOMS[o] for o in sorted(r['orte']) if o in ROOMS), None)
    place = r['place']
    if 'Gastspiel' in r['pills'] and place:
        city = town(place) or clean(place.split(',')[0]).strip()
        return place, city
    if room:
        return f'{HOUSE}, {room}', 'Munich'
    if place and not re.fullmatch(r'(?i)(?:staatstheater am )?gärtnerplatz-?theater', place):
        city = town(place)
        return place, ('Munich' if city is None else city)
    return HOUSE, 'Munich'


_HOUSE_OF = ' des Staatstheaters am Gärtnerplatz'


def _groups(text, kind):
    """'Ballett, Chor, Statisterie und Kinderstatisterie des Staatstheaters am Gärtnerplatz' ->
    [('Choir', 'Chor des Staatstheaters am Gärtnerplatz')]; the house orchestra; players."""
    t = re.sub(r'(?i)^mit (?:den )?', '', clean(text))
    if re.match(r'(?i)(?:musikerinnen|musiker|mitglieder)\w*\b', t):
        return [('Ensemble', t[0].upper() + t[1:])]
    m = re.match(r'(?i)(.+?)\s+des\s+(?:staatstheaters|orchesters des staatstheaters) am g[äa]rtnerplatz$', t)
    if not m:
        if re.search(r'(?i)orchester', t):
            return [('Orchestra', t)]
        if re.search(r'(?i)\bchor\b', t) and kind != 'ballet':
            return [('Choir', t)]
        return []
    out = []
    for item in re.split(r'\s*,\s*|\s+und\s+|\s+', m.group(1)):
        w = item.lower()
        if w == 'orchester':
            out.append(('Orchestra', ORCHESTRA))
        elif w in ('chor', 'extrachor', 'opernchor') and kind != 'ballet':
            out.append(('Choir', 'Chor' + _HOUSE_OF))
        elif w == 'kinderchor' and kind != 'ballet':
            out.append(('Choir', 'Kinderchor' + _HOUSE_OF))
    return out


def _credits(d, kind, *, production_only=False):
    out = []
    for role_text, names in d.get('cast') or []:
        for n in names:
            c = credit(n, role_text, opera=kind != 'ballet')
            if not c:
                continue
            r = c[0]
            if kind == 'ballet' and r not in ('Conductor', 'Choreographer'):
                continue
            if production_only and r not in ('Director', 'Choreographer'):
                continue
            out.append(c)
    for g in d.get('groups') or []:
        out.extend(_groups(g, kind))
    return out


def fetch():
    rows = _read_programme()
    cands, skipped = [], {}

    def skip(why):
        skipped[why] = skipped.get(why, 0) + 1

    for r in rows:
        if not in_window(r['day']):
            skip('outside the window')
            continue
        why = _wanted(r)
        if why:
            skip(why)
            continue
        venue, city = _venue(r)
        if city in (None, 'abroad'):
            skip('guest performance abroad / unknown town')
            continue
        r['venue'], r['city'], r['kind'] = venue, city, _kind(r)
        r['startIso'] = local_iso(r['day'], *r['start'])
        r['endIso'] = local_iso(r['day'], *r['end']) if r['end'] else None
        cands.append(r)
    if skipped:
        log.info('%s: skipped %s', KEY, ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    for r in cands:
        prev = previous_event(event_id(KEY, r['id']), r['startIso'], title=r['title'])
        if prev and (prev.get('credits') or prev.get('program')):
            r['prev'] = prev
    productions = {}
    for r in cands:
        productions.setdefault(r['production'] or r['id'], []).append(r)
    known = {p for p, rs in productions.items() if any(x.get('prev') for x in rs)}

    first, missing, due = [], [], []
    for p, rs in productions.items():
        rs.sort(key=lambda r: r['startIso'])
        if p not in known:
            first.append(rs[0])
    firsts = {id(r) for r in first}
    for r in cands:
        if id(r) in firsts:
            continue
        if not r.get('prev'):
            missing.append(r)
        elif refresh_due(r['id'], r['startIso'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            due.append(r)
    order = (sorted(first, key=lambda r: r['startIso']) + sorted(missing, key=lambda r: r['startIso'])
             + sorted(due, key=lambda r: r['startIso']))
    details, read = {}, 0
    for r in order:
        p = r['production'] or r['id']
        if requests_left() <= 0:
            break
        try:
            d = parse_detail(get(r['url']))
        except BudgetExceeded as err:
            log.warning('%s: stopped reading production pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: production page failed: %s', KEY, r['id'], err)
            continue
        read += 1
        r['detail'] = d
        details.setdefault(p, d)
        known.add(p)
    log.info('%s: %d production page(s) read; %d performances reuse an earlier cast; %d still without a cast',
             KEY, read, sum(1 for r in cands if r.get('prev') and not r.get('detail')),
             sum(1 for r in cands if not r.get('prev') and not r.get('detail')))

    events, no_live = [], 0
    for r in cands:
        p = r['production'] or r['id']
        d = r.get('detail')
        shared = d or details.get(p)
        kind = r['kind']
        credits, program = [], []
        if d:
            credits = _credits(d, kind)
        elif r.get('prev'):
            credits = [(x.get('role'), x.get('name')) for x in r['prev'].get('credits') or []]
            program = [(x.get('composer') or '', x.get('title') or '') for x in r['prev'].get('program') or []]
        elif shared:
            credits = _credits(shared, kind, production_only=True)
        if shared and not program:
            if shared['works']:
                program = shared['works']
            elif shared['composer'] and kind != 'concert':
                program = [(shared['composer'], shared['work'] or r['title'])]
        credits = dedupe_credits(credits)
        if kind == 'ballet':
            live = any(rl == 'Conductor' for rl, _ in credits) or (
                shared is not None and any(rl == 'Conductor' for rl, _ in _credits(shared, kind)))
            if not live:
                no_live += 1
                continue                                # a ballet without a conductor: recorded music
        if kind in ('opera', 'operetta', 'ballet') and not any(rl == 'Orchestra' for rl, _ in credits):
            credits.append(('Orchestra', ORCHESTRA))
        if kind == 'concert' and (33 in r['sparten'] or re.search(r'(?i)oper', f"{r['title']} {r['genre']}")):
            kind = 'vocal'                              # the Opernstudio's evenings, an operetta gala
        ctype = {'opera': 'vocal-opera', 'operetta': 'vocal-opera', 'ballet': 'orchestral',
                 'vocal': 'vocal-opera'}.get(kind) or infer_type(
            r['title'], credits, program, r['genre'], solo_rule=False)
        series = 'Ballett' if kind == 'ballet' else (r['genre'] if kind in ('concert', 'vocal') and r['genre'] else None)
        cancelled = looks_cancelled(r['title']) or any(looks_cancelled(x) for x in r['state'] + r['labels'] + r['pills'])
        try:
            events.append(make_event(
                KEY, r['id'], r['title'], r['startIso'], end=r['endIso'], city=r['city'], venueName=r['venue'],
                type=ctype, series=series, credits=credits, program=program, ticketUrl=r['ticket'], url=r['url'],
                status='cancelled' if cancelled else None))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, r['id'], err)
    if no_live:
        log.info('%s: %d ballet performance(s) left out: no conductor known (recorded music or not read yet)',
                 KEY, no_live)
    return events
