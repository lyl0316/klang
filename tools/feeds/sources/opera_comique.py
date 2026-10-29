"""Opéra Comique (Théâtre national de l'Opéra-Comique, Paris): operas, concerts and recitals.

    https://www.opera-comique.com/fr/calendrier            one page: every session of the season
    https://www.opera-comique.com/fr/spectacles/<slug>     one page per production

The calendar lists every session (``<div class="row session-N">``) with its category
("Opéra", "Concerts et récitals", "Ateliers", "Masterclasses", "Événement", "Spectacle
jeunesse"), title, composer/author line and link. Its ``<time datetime>`` ends in "Z" but
is Paris wall-clock time (checked against the website on 29 Oct 2026: "20h" =
"T20:00:00Z"; the production page's JSON-LD has the same session as "T20:00:00+01:00").

Production pages (about 15, all read every run) give the cast and creative team
("job" / "name" pairs under Artistes / Équipe artistique / Distribution), one schema.org
TheaterEvent per session (startDate with offset, eventStatus) and the place: the
JSON-LD always names the Opéra-Comique, so the session cards ("TAP – Scène nationale de
Grand Poitiers") and the practical information ("Au T2G de Gennevilliers … 92230
Gennevilliers", "Au Foyer de l'Opéra-Comique") decide the venue. A session card's text line is
read for what it is: a place ("[Spectacle hors les murs] Musée d'Orsay … 75007 Paris"), a
performer of that session ("Adrian Herpe, piano"), the composer of a "Portraits" recital
("Charles Gounod"), or a replay note (skipped). Sessions at a place whose town cannot be
told are left out. Only facts are taken (no presentation texts).

The 2026-27 season (the house is in its "Campus Favart" year) has few productions; most
sessions are Académie recitals, readings, workshops and masterclasses.

Skipped: workshops (Bébés Chœurs, chorale participative), masterclasses, children's shows,
yoga, mock trials, danced lectures and other "Événement" entries without a concert,
reading evenings ("Soirées-lectures") and the touring comedy "La Fabuleuse Histoire de
l'Opéra-Comique" (actors and variety songs, played outside Paris).
"""
from __future__ import annotations

import re
from datetime import datetime

from common import FetchError, clean, get, guess_type, jsonld_events, log, looks_cancelled, make_event, requests_left, \
    to_zurich_iso, today_zurich

from ._paris import PARIS_TZ, abroad, credit, fold, is_not_a_concert, paris_iso, town_in

KEY = 'opera_comique'
NAME = 'Opéra Comique'
SITE = 'https://www.opera-comique.com/'
ATTRIBUTION = 'Source: Opéra Comique (opera-comique.com)'
KIND = 'venue'
COUNTRY = 'france'
MAX_REQUESTS = 60
TIME_LIMIT = 300

BASE = 'https://www.opera-comique.com'
CALENDAR = BASE + '/fr/calendrier'
HOUSE = 'Opéra-Comique, Salle Favart'
CITY = 'Paris'

_SKIP_TAXO = {'ateliers', 'masterclasses', 'spectacle jeunesse'}
_SKIP_TITLE = re.compile(r'(?i)fabuleuse histoire de l.op[ée]ra-comique|soir[ée]es?-lectures?|yoga|proc[èe]s fictifs|'
                         r'conf[ée]rence|b[ée]b[ée]s ch|chorale participative|jolis ch|podcast')


def parse_calendar(page):
    """-> list of {sid, start, taxo, title, author, href, label} for every session."""
    out = []
    parts = re.split(r'<div class="row session-(\d+)"', page or '')
    for i in range(1, len(parts) - 1, 2):
        sid, body = parts[i], parts[i + 1]
        dt = re.search(r'<time datetime="(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})', body)
        title = re.search(r'<h3 class="title[^"]*">(.*?)</h3>', body, re.S)
        href = re.search(r'href="(/fr/spectacles/[^"#?]+)"', body)
        if not (dt and title and href):
            continue
        taxo = re.search(r'<h4 class="taxo">(.*?)</h4>', body, re.S)
        author = re.search(r'<h4 class="author">(.*?)</h4>', body, re.S)
        label = re.search(r'session-availability__label">(.*?)<', body, re.S)
        y, mo, d, hh, mi = (int(x) for x in dt.groups())
        out.append({
            'sid': sid, 'start': paris_iso(y, mo, d, hh, mi), 'date': (y, mo, d), 'time': (hh, mi),
            'taxo': clean(taxo.group(1)) if taxo else '', 'title': clean(title.group(1)),
            'author': clean(author.group(1)) if author else '', 'href': href.group(1),
            'label': clean(label.group(1)) if label else '',
        })
    return out


def parse_show(page):
    """-> {'people': [(section, job, name)], 'sessions': {(y,m,d,hh,mi): place},
           'info': str, 'status': {start_iso: status}, 'category': str}."""
    h = page or ''
    out = {'people': [], 'sessions': {}, 'info': '', 'status': {}}
    for blk in re.split(r'paragraph--type--title-cast ', h)[1:]:
        sec = re.search(r'<span class="title">(.*?)</span>', blk, re.S)
        section = clean(sec.group(1)) if sec else ''
        for job, name, detail in re.findall(r'<div class="job">(.*?)</div>\s*<div class="name">(.*?)</div>\s*'
                                            r'<div class="detail">(.*?)</div>', blk, re.S):
            name = clean(name) or clean(detail)
            if name:
                out['people'].append((section, clean(job), name))
    for card in re.split(r'<div role="article"(?= about="/fr/seance/)', h)[1:]:
        date = re.search(r'<div class="session-date">(.*?)</div>', card, re.S)
        time = re.search(r'<div class="session-time">(.*?)</div>', card, re.S)
        text = re.search(r'<div class="session-text">(.*?)</div>', card, re.S)
        about = re.search(r'/fr/seance/(\d{4})(\d{2})(\d{2})', card)
        tm = re.search(r'(\d{1,2})h(\d{2})?', clean(time.group(1))) if time else None
        if not (about and tm):
            continue
        key = (int(about.group(1)), int(about.group(2)), int(about.group(3)), int(tm.group(1)), int(tm.group(2) or 0))
        out['sessions'][key] = clean(text.group(1)) if text else ''
    info = re.search(r'Information compl[ée]mentaire(.*?)(?:Saison 20\d\d|T[ée]l[ée]phone billetterie|</section>)', h, re.S)
    if info:
        out['info'] = clean(info.group(1))
    for ev in jsonld_events(h):
        try:
            out['status'][to_zurich_iso(ev.get('startDate'), assume=PARIS_TZ)] = ev.get('eventStatus')
        except (TypeError, ValueError):
            continue
    return out


def _house_place(info):
    """(venueName, city) from the practical information ('Au T2G de Gennevilliers … 92230
    Gennevilliers', 'Au Foyer de l'Opéra-Comique'), or the main hall."""
    m = re.search(r"(?:^|[-–.]\s*)(?:Au|À la|A la|À l['’]|Aux|Dans le|Dans la)\s+(.+?)(?:\s+[-–]\s+|,\s*\d|\.\s|$)", info or '')
    if not m:
        return HOUSE, CITY
    place = clean(m.group(1)).rstrip(' .,')
    f = fold(place)
    if 'opera-comique' in f or 'opera comique' in f or 'salle favart' in f:
        if 'foyer' in f:
            return 'Opéra-Comique, Foyer', CITY
        return HOUSE, CITY
    town = town_in(info) or town_in(place)
    if not town:
        return place, None
    return place, town


_PLACE_WORDS = re.compile(r"(?i)hors les murs|th[ée][âa]tre|sc[èe]ne|salle|mus[ée]e|auditorium|[ée]glise|chapelle|centre|"
                          r"espace|palais|librairie|op[ée]ra|\bT2G\b|\b\d{5}\b")


def session_note(text, default):
    """What a session card's text line says: ('place', (venueName, city)), ('credit', (role, name)),
    ('composer', name), ('skip', None) for a replay, or ('none', default)."""
    t = clean(text)
    if not t:
        return 'none', default
    if re.search(r'(?i)replay|en ligne|streaming', t):
        return 'skip', None
    if _PLACE_WORDS.search(t):
        t = re.sub(r'^\[[^\]]*\]\s*=?\s*', '', t)
        if re.search(r'(?i)op[ée]ra-?comique|salle favart', t) and not re.search(r'(?i)hors les murs', text):
            return 'place', default
        venue = re.split(r'\s+[-–]\s+(?=\d|[\w\s,]*\d{5})', t)[0].strip(' ,')
        if re.search(r'\b\d{5}\b', venue):                # 'Musée d'Orsay, Esplanade … 75007 Paris'
            venue = venue.split(',')[0].strip()
        town = town_in(t)
        if abroad(t):
            town = None
        elif not town and re.search(r'(?i)mus[ée]e d.orsay|carnavalet|louvre|philharmonie|ch[âa]telet|grand palais', t):
            town = CITY
        return 'place', (venue, town)
    m = re.match(r"^([^,]{3,60}),\s*([^,]{2,40})$", t)
    if m:
        c = credit(m.group(1), m.group(2))
        if c and c[0] not in ('Performer', 'Composer', 'Director'):
            return 'credit', c
    if re.fullmatch(r"[A-ZÉ][\w'’.-]+(?:\s+[A-Za-zÉé][\w'’.-]+){1,3}", t):
        return 'composer', t
    return 'none', default


def _credits_and_program(people, taxo, title):
    credits, composers = [], []
    for section, job, name in people:
        fj = fold(job)
        if re.search(r'compositeur|compositrice|composition|^musique$', fj):
            if name not in composers:
                composers.append(name)
            continue
        if re.search(r'^auteur|^autrice|livret|production|residence|coproduction|librett|poete|ecrivain', fj) or \
                fold(section).startswith('production'):
            continue
        if re.search(r'supervision musicale|directeur des etudes|directrice des etudes|conseill|cadreur|operateur|'
                     r'coordinat|stagiaire|dispositif', fj):
            continue
        c = credit(name, job)          # a character in an opera ('Rita') gives 'Performer'
        if c is None or c[0] in ('Composer', 'Director', 'Choreographer'):
            continue
        credits.append(c)
    program = []
    if composers:
        if taxo.lower().startswith('op') or len(composers) == 1:
            program = [(c, title) for c in composers] if len(composers) == 1 else [(c, '') for c in composers]
        else:
            program = [(c, '') for c in composers]
    return credits, program


def _characters(show):
    """How many singers the Distribution lists by character ('Rita', 'Le Podestat'): an opera."""
    if not show:
        return 0
    return sum(1 for section, job, name in show['people']
               if fold(section).startswith('distribution') and job and credit(name, job) == ('Performer', clean(name)))


def _type(taxo, title, credits, characters=0):
    t = fold(taxo)
    if t.startswith('opera') or 'lyrique' in t or characters >= 2:
        return 'vocal-opera'
    g = guess_type(title)
    if g:
        return g
    roles = [r for r, _ in credits]
    voices = {'Soprano', 'Mezzo-soprano', 'Alto', 'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass', 'Voice'}
    if 'Orchestra' in roles or 'Conductor' in roles:
        return 'orchestral'
    if set(roles) & voices or 'Choir' in roles:
        return 'vocal-opera' if 'Choir' in roles or roles.count('Performer') >= 2 else 'recital'
    players = [r for r in roles if r not in ('Director', 'Narrator', 'Actor', 'Host')]
    if len(players) == 1:
        return 'recital'
    if players:
        return 'chamber'
    return None


def fetch():
    rows = parse_calendar(get(CALENDAR))            # FetchError propagates: build reuses the previous feed
    today = today_zurich()
    keep, skipped = [], {}
    for r in rows:
        why = None
        if fold(r['taxo']) in _SKIP_TAXO:
            why = 'workshop / masterclass / children'
        elif _SKIP_TITLE.search(r['title']) or is_not_a_concert(r['title']):
            why = 'not a concert'
        elif fold(r['taxo']) in ('evenement', 'événement') and not guess_type(r['title']):
            why = 'event without a concert'
        elif datetime(*r['date']).date() < today:
            why = 'past'
        if why:
            skipped[why] = skipped.get(why, 0) + 1
        else:
            keep.append(r)
    log.info('opera_comique: %d sessions on the calendar, %d kept; skipped %s', len(rows), len(keep),
             ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())) or 'none')

    shows = {}
    for href in dict.fromkeys(r['href'] for r in keep):
        if requests_left() <= 0:
            log.warning('opera_comique: request cap reached before %s', href)
            break
        try:
            shows[href] = parse_show(get(BASE + href))
        except FetchError as err:
            log.warning('opera_comique: %s failed: %s', href, err)

    events = []
    for r in keep:
        show = shows.get(r['href'])
        credits, program, venue, city, status = [], [], HOUSE, CITY, None
        if show:
            credits, program = _credits_and_program(show['people'], r['taxo'], r['title'])
            venue, city = _house_place(show['info'])
            places = [v for k, v in (session_note(t, None) for t in show['sessions'].values()) if k == 'place' and v]
            if places:                              # a show played elsewhere: a card without a place line too
                venue, city = max(set(places), key=places.count)
            kind, value = session_note(show['sessions'].get(r['date'] + r['time']), (venue, city))
            if kind == 'skip':
                continue
            if kind == 'place':
                venue, city = value
            elif kind == 'credit':
                credits = credits + [value]
            elif kind == 'composer' and re.search(r'(?i)portrait', r['title']):
                program = [(value, '')]
            status = show['status'].get(r['start'])
        elif r['author'] and fold(r['taxo']).startswith('opera'):
            program = [(r['author'], r['title'])] if ',' not in r['author'] and '/' not in r['author'] else []
        if not city:
            log.info('opera_comique %s: place unknown or abroad, skipped: %s (%s)', r['sid'], r['title'], venue)
            continue
        cancelled = looks_cancelled(r['label']) or looks_cancelled(r['title']) or \
            bool(status and re.search(r'(?i)cancel|postpon', str(status)))
        try:
            events.append(make_event(
                KEY, r['sid'], r['title'], r['start'], city=city, venueName=venue,
                type=_type(r['taxo'], r['title'], credits, _characters(show)), credits=credits, program=program,
                url=BASE + r['href'], ticketUrl=BASE + r['href'],
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('opera_comique %s: skipped: %s', r['sid'], err)
    return events
