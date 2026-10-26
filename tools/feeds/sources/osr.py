"""Orchestre de la Suisse Romande: the orchestra's season calendar.

1. The site's internal calendar JSON (https://www.osr.ch/fr/?type=1597241552, undocumented):
   [{year, months: [{month, days: [{day, events: [{name, locationDate: '19h30 - Victoria Hall',
   director, authors, status, statusMsg, url}]}]}]}]. The date comes from the nesting; the
   time and the hall share one string. status: 1 Réserver, 2 Complet, 3 Annulé, 4 Indisponible,
   5 Streaming, 6 Reporté, 7 Abonnement, 8 Liste d'attente (labels from the event pages).
2. One event page per production (only while the request budget lasts, earliest first):
   '19:30 — Victoria Hall, Genève' gives the city, plus the line-up ('Les artistes' with roles),
   the works and the published duration. Without it the calendar alone is used.

Opera productions with the Grand Théâtre appear with only their first and last date; the
other dates are listed in the 'authors' text ('6, 8, 10 et 12 février – 19h30 | 14 février – 15h')
and are expanded from it. Children's series (Doudou-Concerts, Concerts pour petites oreilles)
and concerts outside Switzerland are left out. Concerts at Victoria Hall also appear in the
Ville de Genève agenda; build.py merges them (this orchestra source wins).
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta

from common import (BudgetExceeded, FetchError, ZURICH, clean, get, get_json, log, looks_cancelled,
                    make_event, requests_left, to_zurich_iso, today_zurich)
from ._geneva import (CREATIVE, cast_dates, concert_type, duration_minutes, fold, fr_month, group_role,
                      is_placeholder, looks_like_name, on_date, role_en, stable_ids, swiss_city, voice_context)

KEY = 'osr'
NAME = 'Orchestre de la Suisse Romande'
SITE = 'https://www.osr.ch/'
ATTRIBUTION = 'Source: Orchestre de la Suisse Romande (osr.ch)'
KIND = 'orchestra'
MAX_REQUESTS = 50
TIME_LIMIT = 400

BASE = 'https://www.osr.ch'
CALENDAR_URL = BASE + '/fr/?type=1597241552'
OSR = 'Orchestre de la Suisse Romande'

STATUS_CANCELLED = {3, 6}            # Annulé, Reporté
_KIDS = re.compile(r'(doudou|petites oreilles|\bcpo\d|pour les enfants des|petits des \d|concert scolaire|scolaires?\b)')
_VENUE_CITY = {
    'victoria hall': 'Genève', 'batiment des forces motrices': 'Genève', 'grand theatre de geneve': 'Genève',
    'conservatoire de musique de geneve': 'Genève', 'institut jaques-dalcroze': 'Genève', 'la cite bleue': 'Genève',
    'arena geneve': 'Genève', 'centre des arts - music school, ecolint': 'Genève', 'studio ernest-ansermet': 'Genève',
    'institut florimont': 'Genève', 'theatre de beaulieu': 'Lausanne', 'salle metropole': 'Lausanne',
    'rosey concert hall': 'Rolle', "l'heure bleue — salle de musique": 'La Chaux-de-Fonds',
    'stadtcasino basel': 'Basel', 'casino bern': 'Bern', 'tonhalle zurich': 'Zürich', 'kkl luzern': 'Luzern',
    'noda bcvs': 'Sion',
}
_TICKET_HOSTS = {
    'gtg.ch': 'https://www.gtg.ch/', 'concoursgeneve.ch': 'https://www.concoursgeneve.ch/',
    'motet.ch': 'https://www.motet.ch/', 'ticketcorner.ch': 'https://www.ticketcorner.ch/',
}
_SKIP_SERIES = {'deplacement', 'hors abonnement', 'grand theatre de geneve', 'abonnement'}


# ---------------------------------------------------------------------------
# calendar
# ---------------------------------------------------------------------------

_LOC_RE = re.compile(r'^\s*(\d{1,2})\s*h\s*(\d{2})?\s*[-–—]\s*(.+?)\s*$')


def _calendar_rows(data, today):
    rows = []
    for y in data if isinstance(data, list) else []:
        for m in y.get('months') or []:
            for d in m.get('days') or []:
                for e in d.get('events') or []:
                    try:
                        day = date(int(y['year']), int(m['month']), int(d['day']))
                    except (KeyError, TypeError, ValueError):
                        continue
                    if day < today:
                        continue
                    lm = _LOC_RE.match(clean(e.get('locationDate')))
                    if not lm:
                        log.info('osr: no time in %r (%s)', e.get('locationDate'), e.get('name'))
                        continue
                    start = datetime(day.year, day.month, day.day, int(lm.group(1)), int(lm.group(2) or 0), tzinfo=ZURICH)
                    rows.append({
                        'start': start, 'venue': lm.group(3), 'name': clean(e.get('name')),
                        'director': clean(e.get('director')), 'authors': clean(e.get('authors')),
                        'status': e.get('status'), 'statusMsg': clean(e.get('statusMsg')),
                        'path': (e.get('url') or '').strip(), 'expanded': False,
                    })
    return rows


def _slug(path):
    return path.rstrip('/').rsplit('/', 1)[-1] or path


_DATESEG = re.compile(r'^\s*((?:\d{1,2}(?:er)?\s*(?:,|et)\s*)*\d{1,2}(?:er)?)\s+([A-Za-zéûÉ]+)\.?(?:\s+(\d{4}))?'
                      r'\s*[–—-]\s*(\d{1,2})\s*h\s*(\d{2})?\s*$')


def _expand_dates(rows):
    """Grand Théâtre productions list only first/last date in the calendar; the full list is
    in 'authors': 'Opéra de … | 13 décembre – 17h | 15, 17 et 31 décembre – 19h'."""
    by_path = {}
    for r in rows:
        by_path.setdefault(r['path'], []).append(r)
    extra = []
    for path, group in by_path.items():
        anchor = min(group, key=lambda r: r['start'])
        have = {r['start'].date() for r in group}
        for seg in anchor['authors'].split('|'):
            m = _DATESEG.match(seg)
            if not m:
                continue
            month = fr_month(m.group(2))
            if not month:
                continue
            for dtxt in re.findall(r'\d{1,2}', m.group(1)):
                year = int(m.group(3)) if m.group(3) else anchor['start'].year
                try:
                    day = date(year, month, int(dtxt))
                except ValueError:
                    continue
                if not m.group(3):
                    if day < anchor['start'].date() - timedelta(days=120):
                        day = day.replace(year=year + 1)
                    elif day > anchor['start'].date() + timedelta(days=240):
                        day = day.replace(year=year - 1)
                if day in have:
                    continue
                have.add(day)
                start = datetime(day.year, day.month, day.day, int(m.group(4)), int(m.group(5) or 0), tzinfo=ZURICH)
                extra.append(dict(anchor, start=start, status=1, expanded=True))
    return extra


# ---------------------------------------------------------------------------
# event page
# ---------------------------------------------------------------------------

def _texts(pattern, html_text):
    return [clean(x) for x in re.findall(pattern, html_text, re.S)]


def parse_event_page(html_text):
    """Facts from an OSR event page: representations (date, time, hall, city, categories,
    genres, rep uid), subtitle, musicians [(names, role)], works [(composer, title)], duration."""
    out = {'reps': [], 'subtitle': '', 'musicians': [], 'songs': [], 'cast': [], 'cast_nf': [], 'duration': None}
    m = re.search(r'<h1>(.*?)</h1>\s*<p class="h4 mb-4">(.*?)</p>', html_text, re.S)
    if m:
        out['subtitle'] = clean(m.group(2))
    a = html_text.find('<div class="representations">')
    b = html_text.find('class="bg-beige"', a)
    block = html_text[a:b] if a >= 0 else ''
    for chunk in block.split('<div class="representation">')[1:]:
        dm = re.search(r'<p class="date">\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*</p>', chunk)
        tm = re.search(r'<p class="day">\s*(\d{1,2}):(\d{2})\s*[—–-]\s*(.*?)\s*</p>', chunk, re.S)
        if not dm or not tm:
            continue
        place = clean(tm.group(3))
        venue, _, city = place.rpartition(',')
        if not venue:
            venue, city = place, ''
        uid = re.search(r'data-rep-uid="(\d+)"', chunk)
        out['reps'].append({
            'date': date(int(dm.group(3)), int(dm.group(2)), int(dm.group(1))),
            'time': (int(tm.group(1)), int(tm.group(2))), 'venue': venue.strip(), 'city': city.strip(),
            'categories': _texts(r'<div class="category">(.*?)</div>', chunk),
            'genres': _texts(r'<div class="genre">(.*?)</div>', chunk),
            'uid': uid.group(1) if uid else None,
        })
    pa = html_text.find('class="container text-center pb-5 program"')
    program = html_text[pa:html_text.find('</section>', pa)] if pa >= 0 else ''
    for pm in re.finditer(r'<p class="musicians">(.*?)</p>', program, re.S):
        names = _texts(r'<span class="name">(.*?)</span>', pm.group(1))
        role = ' '.join(_texts(r'<span class="title">(.*?)</span>', pm.group(1)))
        if names:
            out['musicians'].append((names, role))
    sm = re.search(r'class="col-lg-6 text-lg-left song">(.*)', program, re.S)
    if sm:
        in_cast = False
        for p in re.findall(r'<p class="h4 sub">(.*?)</p>', sm.group(1), re.S):
            head = re.match(r'\s*<strong>(.*?)</strong>(.*)$', p, re.S)
            strong, rest = (clean(head.group(1)), head.group(2)) if head else (None, p)
            lines = [x for x in (clean(x) for x in re.split(r'<br\s*/?>', rest)) if x]
            if strong and fold(strong) in ('distribution', 'avec', 'interpretes'):
                in_cast = True
                continue
            if in_cast and not strong:
                out['cast'].extend(lines)       # 'Direction musicale, Marta G.' / 'Figaro, Philippe Sly'
                continue
            in_cast = False
            if not strong and lines and all(_name_first(x) for x in lines):
                out['cast_nf'].extend(lines)    # concert opera: 'Nikoloz Lagvilava, Nabucco<br> María José Siri, Abigaille'
                continue
            out['songs'].append((strong, lines))
    out['duration'] = duration_minutes(clean(program))
    return out


_NOT_A_WORK = re.compile(r'^(dur[ée]e|livret|d[’\']apr[èe]s|cr[ée][ée] le|chant[ée] en|conseill[ée]|nouvelle production|'
                         r'distribution|version de concert|surtitr|musique de|commande|co-commande|cr[ée]ation|'
                         r'premi[èe]re (suisse|mondiale)|premi[èe]re fois)', re.I)
_WORK_OF = re.compile(r'^(?:op[ée]ra(?:-comique| bouffe)?|op[ée]rette|oratorio|ballet|musique|drame lyrique|'
                      r'conte musical|production sc[ée]nique.*)\s+(?:de|d[’\'])\s*(.+)$', re.I)
# a heading that names an event, not a composer: 'Demi-finale de Direction d'Orchestre', 'Ciné-concert'
_NOT_COMPOSER = re.compile(r'\b(finale|demi-finale|concours|direction|orchestre|cine-concert|concert|programme|'
                           r'repertoire|distribution|solistes?|recital|extraits?|selection|transcriptions?)\b')


def _composer_like(text):
    """'Ludwig van Beethoven' yes; 'The Addams Family', 'Dimokratía', 'Ciné-concert' no."""
    return (looks_like_name(text, max_words=6) and len(text.split()) >= 2
            and not re.match(r"(?i)^(the|a|le|la|les|l['’]|un|une|il|lo|die|der|das|el)\b", text)
            and not _NOT_COMPOSER.search(fold(text)))


def works_from_songs(songs):
    program, last_title, by_line = [], None, None
    for strong, lines in songs:
        if strong is None:                                  # '<p>Musique de Marc Shaiman</p>' after a film title
            m = _WORK_OF.match(lines[0]) if lines else None
            if m and last_title and _composer_like(m.group(1)) and not any(p['title'] == last_title for p in program):
                program.append({'composer': m.group(1), 'title': last_title})
                by_line = None                              # so the name under the title was the film director
            continue
        if by_line:
            program.append(by_line)
        by_line = None
        if strong.isupper() and len(strong) > 3:           # 'DISTRIBUTION'
            continue
        m = _WORK_OF.match(lines[0]) if lines else None
        if m and _composer_like(m.group(1)):                # '<strong>Le nozze di Figaro</strong> Opéra de Mozart'
            program.append({'composer': m.group(1), 'title': strong})
            continue
        if _composer_like(strong):
            works = [l for l in lines if not _NOT_A_WORK.match(l)]
            for w in works:
                program.append({'composer': strong, 'title': w})
            if not works and not lines:
                program.append({'composer': strong, 'title': ''})
        else:
            last_title = strong
            if len(lines) == 1 and _composer_like(lines[0]):
                # '<strong>Harry Potter … in Concert</strong><br> John Williams': the composer, unless a
                # 'Musique de …' line follows (then the name was the film's director)
                by_line = {'composer': lines[0], 'title': strong}
    if by_line:
        program.append(by_line)
    return program


def _name_first(line):
    """'Nikoloz Lagvilava, Nabucco' (singer, then role) -> True."""
    m = re.match(r'^([^,]{3,60}),\s*(.{2,40})$', line)
    return bool(m and looks_like_name(m.group(1)) and len(m.group(1).split()) >= 2
                and not re.search(r'\d', m.group(2)) and not _NOT_A_WORK.match(line))


def credits_from_cast(lines, *, name_first=False):
    """'Direction musicale, Marta Gardolinska' / 'Figaro, Philippe Sly (13, 15 déc.) | Jared Mac Werlein (18 déc.)'
    / 'Chœur du Grand Théâtre de Genève' -> credits (creative team left out)."""
    out = []
    for line in lines:
        if ',' not in line:
            g = group_role(line)
            if g:
                out.append({'role': g, 'name': line})
            continue
        label, names = (x.strip() for x in line.split(',', 1))
        if name_first:
            label, names = names, label
        role = role_en(label)
        if role is CREATIVE:
            continue
        if role is None:
            if not re.match(r'^[A-ZÀ-Ý]', label) or len(label) > 40:
                continue
            role = label                                    # a character: 'Le Comte Almaviva'
        for n in names.split('|'):
            dates = cast_dates(n)                           # 'Jared Mac Werlein (18, 28 décembre 2026)'
            n = re.sub(r'\s*\([^)]*\)', '', n).strip(' ,')
            if n and len(n) <= 80 and not is_placeholder(n):
                out.append(dict({'role': role, 'name': n}, **({'dates': dates} if dates else {})))
    return out


def works_from_authors(authors):
    """Calendar fallback: 'Ludwig van Beethoven | Symphonie N° 1 | Symphonie N° 4' or
    'Igor Stravinski | Dimitri Chostakovitch | Johannes Brahms'."""
    parts = [p.strip() for p in authors.split('|') if p.strip()]
    if not parts or any(len(p) > 70 or _DATESEG.match(p) for p in parts):
        return []
    program, composer = [], None
    for p in parts:
        m = _WORK_OF.match(p)
        if m and _composer_like(m.group(1)):
            program.append({'composer': m.group(1), 'title': ''})
            continue
        if _composer_like(p) and not re.search(r'\b(symphonie|concerto|suite|ouverture|sonate|quatuor)\b', p, re.I):
            composer = p
            program.append({'composer': p, 'title': ''})
        elif composer:
            if program and program[-1]['composer'] == composer and not program[-1]['title']:
                program.pop()
            program.append({'composer': composer, 'title': p})
    return program


def credits_from_musicians(musicians):
    voices = voice_context([r for _, r in musicians])
    out = []
    for names, role_text in musicians:
        role = role_en(role_text, voices=voices) if role_text else None
        if role is CREATIVE:
            continue
        for n in names:
            r = role or group_role(n) or ('Performer' if not role_text else
                                          (role_text[0].upper() + role_text[1:])[:40])
            out.append({'role': r, 'name': n})
    return out


# ---------------------------------------------------------------------------
# fetch
# ---------------------------------------------------------------------------

def _ticket(row, page_url):
    msg = fold(row['statusMsg'])
    for host, url in _TICKET_HOSTS.items():
        if host in msg:
            return url
    return page_url


def _city(venue, rep_city):
    c = swiss_city(rep_city) if rep_city else None
    if c:
        return c
    f = fold(venue).strip()
    if f in _VENUE_CITY:
        return _VENUE_CITY[f]
    if re.search(r'\bgeneve\b', f):
        return 'Genève'
    return None


def fetch():
    today = today_zurich()
    data = get_json(CALENDAR_URL)               # FetchError propagates: build reuses yesterday
    rows = _calendar_rows(data, today)
    if not rows and not data:
        raise FetchError(CALENDAR_URL, 'empty calendar')
    rows = [r for r in rows if r['path'] and not _KIDS.search(fold(f"{r['path']} {r['name']} {r['authors']}"))]
    rows += [r for r in _expand_dates(rows) if r['start'].date() >= today]

    # event pages, one per production, earliest first, while the budget lasts
    pages = {}
    order = sorted({r['path'] for r in rows}, key=lambda p: min(r['start'] for r in rows if r['path'] == p))
    for path in order:
        if requests_left() <= 0:
            log.info('osr: request budget used up, %d productions without event page', len(order) - len(pages))
            break
        try:
            pages[path] = parse_event_page(get(BASE + path))
        except BudgetExceeded:
            break
        except FetchError as err:
            log.warning('osr: event page %s: %s', path, err)

    stable_ids(rows, key=lambda r: _slug(r['path']))
    events = []
    for r in rows:
        page = pages.get(r['path']) or {}
        rep = next((x for x in page.get('reps', []) if x['date'] == r['start'].date()
                    and x['time'] == (r['start'].hour, r['start'].minute)), None)
        if rep is None:
            rep = next((x for x in page.get('reps', []) if x['date'] == r['start'].date()), None)
        if rep is None and r['expanded']:
            rep = next((x for x in page.get('reps', []) if fold(x['venue']) == fold(r['venue'])), None)
            rep = dict(rep, categories=[], uid=None) if rep else None
        venue = rep['venue'] if rep else r['venue']
        city = _city(venue, rep['city'] if rep else '')
        if not city:
            log.info('osr: skipped %s on %s: %r is not a known Swiss venue', r['name'], r['start'].date(), venue)
            continue
        genres = rep['genres'] if rep else []
        cats = rep['categories'] if rep else []
        gtext = fold(' '.join(genres + cats))
        if _KIDS.search(gtext):
            continue

        song_text = fold(' '.join(' '.join(l) for _, l in page.get('songs') or []) + ' ' + page.get('subtitle', ''))
        if re.search(r'\bjazz\b|\bpop\b|variete|\bdanse\b|\bballet\b', fold(' '.join(genres))) \
                or re.search(r'ballet du grand theatre|\bchoregraph', song_text):
            log.debug('osr: skipped %s (%s)', r['name'], ', '.join(genres))   # crossover shows, ballets
            continue
        credits = on_date(credits_from_musicians(page.get('musicians') or []) + credits_from_cast(page.get('cast') or [])
                          + credits_from_cast(page.get('cast_nf') or [], name_first=True), r['start'])
        if not credits and r['director']:
            credits = [{'role': 'Conductor', 'name': r['director']}]
        g = group_role(r['name']) if looks_like_name(r['name']) else None    # a name, not 'Cuivres en liberté'
        if g and fold(r['name']) != fold(OSR) and not any(fold(c['name']) == fold(r['name']) for c in credits):
            credits.append({'role': g, 'name': r['name']})     # the guest choir is the title: 'Le Motet de Genève'
        chamber = 'musique de chambre' in gtext
        guest = re.search(r"\binvite\b", fold(r['name']))
        if not chamber and not guest and not any(c['role'] == 'Orchestra' for c in credits):
            credits.append({'role': 'Orchestra', 'name': OSR})
        program = works_from_songs(page.get('songs') or []) or works_from_authors(r['authors'])

        title = r['name']
        if re.search(r'\bconcours\b', fold(title)) and r['authors'] and len(r['authors']) <= 80:
            title = f"{title} – {r['authors']}"
        series = next((c for c in cats if fold(c) not in _SKIP_SERIES), None)
        if chamber:
            kind = 'chamber'
        elif re.search(r'\bop[eé]ra|\boperette|\bvoix\b', gtext) or re.search(r'^op[ée]r', fold(r['authors'])):
            kind = 'vocal-opera'
        else:
            kind = concert_type(title, credits, program, page.get('subtitle', '')) or 'orchestral'
        page_url = BASE + r['path']
        cancelled = r['status'] in STATUS_CANCELLED or looks_cancelled(f"{r['statusMsg']} {r['name']}")
        try:
            events.append(make_event(
                KEY, r['sid'], title, to_zurich_iso(r['start']),
                durationMin=page.get('duration'), city=city, venueName=venue, type=kind, series=series,
                credits=credits, program=program, ticketUrl=_ticket(r, page_url), url=page_url,
                status='cancelled' if cancelled else None))
        except ValueError as err:
            log.warning('osr: skipped %s: %s', r['path'], err)
    return events
