"""Théâtre des Champs-Élysées (Paris): operas, orchestras, recitals and chamber music.

    https://www.theatrechampselysees.fr/calendrier?slug=YY-MM            one month of the calendar
    https://www.theatrechampselysees.fr/saison-2026-27/<genre>/<slug>   one page per production

The calendar (the same request the site's own month buttons send) lists every performance
of a month: the day ("lundi 2 novembre"; the year comes from the month asked for), the
time ("19h30"), the production link and a short title ("Manon Lescaut, Puccini | Opéra mis
en scène"). The genre is the second part of the link (orchestre, recital-piano,
recital-chant, musique-de-chambre, opera-mis-en-scene, opera-en-concert, musique-sacree,
concert, danse, en-famille ...). Months are read from the current one on, until three
months in a row are empty or the 450-day window ends.

The production page holds the facts the reader takes: the heading (title, then performers
"<strong>Name</strong> role" or, for an opera, the composer), the "Distribution"
("<strong>Name</strong> | role", characters for singers, "accentus | direction Christophe
Grapperon" for a choir and its chorus master), the "Programme" ("<strong>Composer</strong>
Work") and the list of dates. Production pages are read incrementally (one request
each): a performance the previous feed already has with its cast or works (same id, start
and title) keeps them, and the requests left after the calendar (cap 150) go to
productions still missing details, soonest first, then to those playing within two weeks
and a fixed share of the others (each about once a week). Checked against the website on
29 Oct 2026 (Utopia Orchestra 6 Nov 20h00, Manon Lescaut 2-15 Nov, Quatuor Leonkoro 8 Nov
11h00). No robots.txt (HTTP 404) and no terms about automated reading; facts only.

Venue: the theatre's main hall ("Théâtre des Champs-Élysées"); its Studio and Comédie
host theatre, not concerts.

Skipped: family shows (en-famille), the under-30 previews (avant-premières jeunes: dress
rehearsals), dance without live music (a "danse" production is kept only when its page
credits an orchestra or a conductor), jazz, pop and variety evenings, talks.
"""
from __future__ import annotations

import re
from datetime import date

from common import BudgetExceeded, FetchError, clean, event_id, get, guess_type, log, looks_cancelled, make_event, \
    previous_event, refresh_due, requests_left, today_zurich

from ._paris import credit, fold, group_role, is_not_a_concert, month_number, paris_iso, role_en

KEY = 'theatre_champs_elysees'
NAME = 'Théâtre des Champs-Élysées'
SITE = 'https://www.theatrechampselysees.fr/'
ATTRIBUTION = 'Source: Théâtre des Champs-Élysées (theatrechampselysees.fr)'
KIND = 'venue'
COUNTRY = 'france'
MAX_REQUESTS = 150             # ~16 calendar months + ~100 production pages
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 14
REFRESH_EVERY_DAYS = 7

BASE = 'https://www.theatrechampselysees.fr'
CALENDAR = BASE + '/calendrier?slug={yy:02d}-{mm:02d}'
VENUE = 'Théâtre des Champs-Élysées'
CITY = 'Paris'
WINDOW_MONTHS = 16

_SKIP_GENRES = {'en-famille', 'avant-premieres-jeunes-30-ans', 'jeune-public'}
_POP_RE = re.compile(r'(?i)\bjazz\b|\bpop\b|vari[ée]t[ée]|chanson fran|\bswing\b|com[ée]die musicale|\bstand-?up\b|'
                     r'humour|conf[ée]rence|rencontre avec|\bcirque\b|big band|\bgospel\b|tango')
_OPERA_GENRES = ('opera-mis-en-scene', 'opera-en-concert', 'opera')


# ---------------------------------------------------------------------------
# calendar
# ---------------------------------------------------------------------------

def parse_month(page, year):
    """-> list of {href, genre, title, date:(y,m,d), time:(h,m)} from one calendar month."""
    out = []
    for day in re.split(r'<div class="calendar__day', page or '')[1:]:
        name = re.search(r'class="calendar__name">(.*?)</p>', day, re.S)
        if not name:
            continue
        m = re.search(r'(\d{1,2})\s+([a-zéû]+)', fold(clean(name.group(1))))
        mo = month_number(m.group(2)) if m else None
        if not mo:
            continue
        for ev in re.findall(r'<li class="calendar__event[^"]*">(.*?)</li>', day, re.S):
            tm = re.search(r'date-value">\s*(\d{1,2})h(\d{2})?', ev)
            a = re.search(r'<a href="(/saison-[^"]+)"[^>]*>(.*?)</a>', ev, re.S)
            if not (tm and a):
                continue
            href = a.group(1).split('?')[0]
            parts = href.strip('/').split('/')
            out.append({'href': href, 'genre': parts[1] if len(parts) >= 3 else '',
                        'slug': parts[-1], 'title': clean(a.group(2)),
                        'date': (year, mo, int(m.group(1))), 'time': (int(tm.group(1)), int(tm.group(2) or 0))})
    return out


def _months(today):
    y, m = today.year, today.month
    for _ in range(WINDOW_MONTHS):
        yield y, m
        m += 1
        if m > 12:
            y, m = y + 1, 1


# ---------------------------------------------------------------------------
# production page
# ---------------------------------------------------------------------------

def _strong_per_line(fragment):
    """'<strong>Chostakovitch </strong>Concerto …<strong> <br>Stravinsky</strong>' -> one <strong> per line."""
    def fix(m):
        parts = [p for p in re.split(r'(?i)<br\s*/?>', m.group(1))]
        return '<br>'.join(f'<strong>{p}</strong>' if clean(p) else '' for p in parts)
    return re.sub(r'(?is)<strong>(.*?)</strong>', fix, fragment or '')


def _lines(fragment, first_only=False):
    """'<strong>A</strong> role <br><strong>B</strong> | role' -> [('A', 'role'), ('B', 'role')];
    a line without <strong> -> ('', text). ``first_only``: the first <strong> is the name and
    a later one with what follows it is dropped ('<strong>Puccini</strong> I Crisantemi
    (<strong>Tomo Keller</strong> direction)')."""
    out = []
    for line in re.split(r'(?i)<br\s*/?>|</p>|</h\d>|</li>', _strong_per_line(fragment)):
        if first_only:
            parts = re.split(r'(?is)<strong>(.*?)</strong>', line)      # text, strong, text, strong, ...
            if len(parts) >= 3:
                line = f'<strong>{parts[1]}</strong>' + re.sub(r'\(\s*$', '', clean(parts[2]))
        strong = ''.join(re.findall(r'(?is)<strong>(.*?)</strong>', line))
        rest = re.sub(r'(?is)<strong>.*?</strong>', ' ', line)
        strong, rest = clean(strong).strip(' |,–:'), clean(rest).strip(' |,–-:')
        if strong or rest:
            out.append((strong, rest))
    return out


def parse_production(page):
    """-> {'title', 'head': [(name, role)], 'cast': [(name, role)], 'works': [(composer, title)],
           'dates': {(y,m,d,h,mi)}, 'cancelled': {(y,m,d,h,mi)}}."""
    h = page or ''
    out = {'title': '', 'head': [], 'cast': [], 'works': [], 'dates': set(), 'cancelled': set()}
    head = re.search(r'<div class="event-detail__title">(.*?)</div>', h, re.S)
    if head:
        t = re.search(r'<h1>(.*?)</h1>', head.group(1), re.S)
        h1 = _lines(t.group(1)) if t else []
        if len(h1) > 1 or any(n and r for n, r in h1):     # '<strong>David Khrikuli</strong> piano <br>…'
            out['title'] = ' & '.join(n for n, _ in h1 if n)
            out['head'] = [(n, r) for n, r in h1 if n]
        else:
            out['title'] = clean(t.group(1)) if t else ''
        h2 = re.search(r'<h2>(.*?)</h2>', head.group(1), re.S)
        out['head'] += _lines(h2.group(1)) if h2 else []
    dist = re.search(r'id="distribution-content"[^>]*>(.*?)</div>', h, re.S)
    if dist:
        out['cast'] = _lines(dist.group(1))
    prog = re.search(r'id="program-content"[^>]*>(.*?)</div>', h, re.S)
    if prog:
        composer = ''
        people = {fold(n) for n, _ in out['head'] + out['cast'] if n}
        people |= {fold(p.strip()) for p in re.split(r'\s*(?:&|,| et )\s*', out['title']) if p.strip()}
        for strong, rest in _lines(prog.group(1), first_only=True):
            if strong and fold(strong) in people:              # 'David Khrikuli' heading his half of a shared recital
                composer = ''
                continue
            if (strong and not rest and len(strong.split()) > 4) or re.match(r'(?i)^(?:pour |extraits?|programme|œuvres|oeuvres)', strong):
                continue
            composer = strong or composer
            if composer and rest:
                out['works'].append((composer, rest))
            elif strong and not rest:
                out['works'].append((strong, ''))
    dates = re.search(r'<ol class="widget__dates">(.*?)</ol>', h, re.S)
    for li in re.findall(r'<li class="widget__dates-item([^"]*)">(.*?)</li>', dates.group(1) if dates else '', re.S):
        cls, body = li
        d = re.search(r'class="day">\s*\w+\s+(\d{1,2})', body)
        mo = re.search(r'class="month">\s*([a-zéû]+)\s+(\d{4})', fold(body))
        tm = re.search(r'class="hour">\s*-\s*(\d{1,2})h(\d{2})?', fold(body))
        if d and mo and tm and month_number(mo.group(1)):
            key = (int(mo.group(2)), month_number(mo.group(1)), int(d.group(1)), int(tm.group(1)), int(tm.group(2) or 0))
            out['dates'].add(key)
            if looks_cancelled(cls) or looks_cancelled(clean(body)):
                out['cancelled'].add(key)
    return out


def _clean_works(works):
    """Drop a trailing '...'/'etc.' line and lines that are notes, keep (composer, work)."""
    out = []
    for c, w in works:
        if re.search(r'(?i)^(?:programme|entracte|pause|sous r[ée]serve|programme? (?:à|a) venir)', c + ' ' + w):
            continue
        out.append((c.rstrip(' ,:'), w.strip(' ,')))
    return out


def credits_for(prod, genre, title):
    """Credits and works from a production page."""
    credits, program = [], _clean_works(prod['works'])
    head = prod['head']
    if genre in _OPERA_GENRES and head and not head[0][0] and len(head) == 1 and not program:
        program = [(head[0][1], prod['title'] or title)]          # an opera: the heading's second line is the composer
        head = []
    for name, role in head + prod['cast']:
        if not name:
            continue
        m = re.match(r'(?i)^direction\s+(.+)$', role)
        if m and group_role(name):                                # 'accentus | direction Christophe Grapperon'
            g = group_role(name)
            credits.append((g, name))
            credits.append(('Chorus master' if g == 'Choir' else 'Conductor', clean(m.group(1))))
            continue
        names = [name] if group_role(name) else [n for n in re.split(r'\s*,\s*|\s+et\s+', name) if n]
        for nm in names:
            c = credit(nm, role) if role else (group_role(nm) or 'Performer', nm)
            if c and c[0] not in ('Director', 'Choreographer', 'Composer'):
                credits.append(c)
    voices = {'Soprano', 'Mezzo-soprano', 'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass', 'Voice'}
    if any(r in voices for r, _ in credits) or genre in _OPERA_GENRES + ('musique-sacree', 'recital-chant'):
        credits = [('Alto' if r == 'Viola' else r, n) for r, n in credits]      # 'alto' is the voice here
    if genre in ('recital-piano', 'recital-chant', 'musique-de-chambre') and \
            not any(r not in ('Orchestra', 'Conductor', 'Ensemble', 'Choir') for r, _ in credits):
        for nm in re.split(r'\s*(?:&|,| et )\s*', prod['title'] or title):       # 'Renaud Capuçon & Mao Fujita'
            if nm and not any(n == nm for _, n in credits):
                credits.append((group_role(nm) or ('Piano' if genre == 'recital-piano' else 'Performer'), nm))
    title_group = group_role(prod['title'])
    if title_group in ('Orchestra', 'Choir', 'Ensemble') and not any(n == prod['title'] for _, n in credits):
        credits.insert(0, (title_group, prod['title']))           # 'Utopia Orchestra' heading
    return credits, program


def _type(genre, title, credits, program):
    if genre in _OPERA_GENRES or genre == 'musique-sacree':
        return 'vocal-opera'
    if genre in ('recital-piano',):
        return 'recital'
    if genre == 'recital-chant':
        return 'recital'
    if genre == 'musique-de-chambre':
        return 'chamber'
    if genre == 'orchestre':
        return 'orchestral'
    roles = [r for r, _ in credits]
    if 'Orchestra' in roles or 'Conductor' in roles:
        return 'orchestral'
    return guess_type(title + ' ' + ' '.join(w for _, w in program))


# ---------------------------------------------------------------------------
# fetch
# ---------------------------------------------------------------------------

def _read_calendar(today):
    rows, empty = [], 0
    for y, m in _months(today):
        if requests_left() <= 0:
            break
        try:
            page = get(CALENDAR.format(yy=y % 100, mm=m))
        except FetchError as err:
            if (y, m) == (today.year, today.month):
                raise                                             # the first month must work
            log.warning('theatre_champs_elysees: month %d-%02d failed: %s', y, m, err)
            continue
        got = parse_month(page, y)
        rows += got
        empty = 0 if got else empty + 1
        if empty >= 3:
            break
    return rows


def fetch():
    today = today_zurich()
    rows = _read_calendar(today)
    cands, skipped = [], {}
    seen = set()
    for r in rows:
        why = None
        if r['genre'] in _SKIP_GENRES:
            why = 'family / previews'
        elif is_not_a_concert(r['title']) or _POP_RE.search(r['title']):
            why = 'not a classical concert'
        elif date(*r['date']) < today:
            why = 'past'
        key = (r['href'], r['date'], r['time'])
        if key in seen:
            continue
        seen.add(key)
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        y, mo, d = r['date']
        r['start'] = paris_iso(y, mo, d, *r['time'])
        r['sid'] = f"{r['slug']}-{y:04d}{mo:02d}{d:02d}-{r['time'][0]:02d}{r['time'][1]:02d}"
        r['short'] = clean(r['title'].split('|')[0]).strip(' ,')
        cands.append(r)
    log.info('theatre_champs_elysees: %d performances listed, %d kept; skipped %s', len(rows), len(cands),
             ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())) or 'none')

    # reuse details from the previous feed
    for c in cands:
        prev = previous_event(event_id(KEY, c['sid']), c['start'], title=c['short'])
        c['prev'] = prev if prev and (prev.get('credits') or prev.get('program')) else None

    by_prod = {}
    for c in cands:
        by_prod.setdefault(c['href'], []).append(c)

    def tier(href):
        group = by_prod[href]
        if any(c['prev'] is None for c in group):
            return 0
        first = min(c['start'] for c in group)
        if refresh_due(href, first, near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    order = sorted((h for h in by_prod if tier(h) is not None), key=lambda h: (tier(h), min(c['start'] for c in by_prod[h])))
    prods = {}
    for href in order:
        if requests_left() <= 0:
            break
        try:
            prods[href] = parse_production(get(BASE + href))
        except BudgetExceeded as err:
            log.warning('theatre_champs_elysees: stopped reading production pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('theatre_champs_elysees: %s failed: %s', href, err)
    log.info('theatre_champs_elysees: %d production page(s) read, %d productions', len(prods), len(by_prod))

    events = []
    for c in cands:
        prod = prods.get(c['href'])
        title = c['short']
        credits, program, cancelled = [], [], looks_cancelled(c['title'])
        if prod:
            credits, program = credits_for(prod, c['genre'], title)
            key = c['date'] + c['time']
            cancelled = cancelled or key in prod['cancelled']
            if c['genre'] == 'danse' and not any(r in ('Orchestra', 'Conductor') for r, _ in credits):
                log.info('theatre_champs_elysees: dance without live music skipped: %s', title)
                continue
        elif c['prev']:
            credits = [(x.get('role'), x.get('name')) for x in c['prev'].get('credits') or []]
            program = [(p.get('composer'), p.get('title')) for p in c['prev'].get('program') or []]
        elif c['genre'] == 'danse':
            continue                                              # not checked for live music yet
        try:
            events.append(make_event(
                KEY, c['sid'], title, c['start'], city=CITY, venueName=VENUE,
                type=_type(c['genre'], title, credits, program), credits=credits, program=program,
                url=BASE + c['href'], ticketUrl=BASE + c['href'],
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('theatre_champs_elysees %s: skipped: %s', c['sid'], err)
    return events
