"""Teatro alla Scala, Milan: opera, ballet and concerts from the theatre's own calendar.

    https://www.teatroallascala.org/it/calendario.html          every performance, 2024 onwards (~2 MB)
    https://www.teatroallascala.org/it/stagione/<season>/<genre>/[<series>/]<slug>.html   one page per production

The calendar is one static page: each performance is an ``<a class="mcl-evt-a mcl-type-<genre>"
data-id="evt-N" data-evm="evm-M">`` with ``<time datetime="2026-11-03T19:30:00">`` (Milan local
time, no offset), the title, the composer (opera) or choreographer (ballet) and the subscription
series. Performances on the same day after the first are in a second block (``mcl-btt``) with the
attributes in another order; both are read. A cancelled performance has "annullato" appended to its
title (seen on 3 June 2024, Hélène Grimaud).

Production pages (one request each, read incrementally: a performance the previous feed already
has with its cast or programme keeps them; new productions first, then those playing in the next
two weeks and a weekly share of the others) give the conductor and soloists (``table-prd``), the
cast with per-date notes ("Marina Rebeka (20, 24, 27 ott.; 3, 5, 8 nov.) / Ekaterina Bakanova
(29 ott.)": each performance gets the singers announced for its date), the programme
(``<td class="dt">Composer</td><td>works</td>``), the house ensembles ("Orchestra e Coro del Teatro
alla Scala") and the room (Ridotto dei palchi "Arturo Toscanini"). Names printed in capitals are
title-cased. Concerts of the Filarmonica della Scala link to filarmonica.it and are not read
there: their credits come from the calendar title ("Filarmonica della Scala / conductor /
soloist"), the first person named after the orchestra taken as the conductor.

Skipped: children's and family shows (Grandi spettacoli per piccoli), talks (Incontri, Prima delle
prime, La Scala dei libri, readings at the museum), the under-30 previews (Anteprima UNDER30, sold
to under-30s only), the ballet school's show, tours and events elsewhere (Eventi fuori sede, e.g. a
dance piece at the Piccolo Teatro with recorded music), and ballets whose page names no conductor
(no live orchestra; they wait until their page has been read).

Checked against the website on 29 Oct 2026: 1363 calendar entries in all, 235 performances
kept from today (Faust 29 Oct 19:30, Requiem Verdi/Chailly 30 Oct 20:00, Otello 7 Dec 18:00 with Brian
Jagde / Luca Salsi / Eleonora Buratto, Mozart quintets 17 Jan 11:00 at the Ridotto, Bernheim
recital 22 Nov 20:00 with Mathieu Pordoy).
"""
from __future__ import annotations

import html as _html
import re
from datetime import datetime

from common import clean, get, guess_type, infer_type, log, looks_cancelled, make_event, to_zurich_datetime, \
    to_zurich_iso, today_zurich

from ._italy_north import credit, date_notes, fold, house_groups, minutes, nice_name, plays_on, reuse, \
    split_names, with_details

KEY = 'teatro_alla_scala'
NAME = 'Teatro alla Scala'
SITE = 'https://www.teatroallascala.org/'
ATTRIBUTION = 'Source: Teatro alla Scala (teatroallascala.org)'
KIND = 'venue'
COUNTRY = 'italy'
MAX_REQUESTS = 110             # 1 calendar + one page per production (~60 in a season)
TIME_LIMIT = 600

BASE = 'https://www.teatroallascala.org'
CALENDAR = BASE + '/it/calendario.html'
CITY = 'Milan'
VENUE = 'Teatro alla Scala'
RIDOTTO = 'Teatro alla Scala, Ridotto dei palchi "Arturo Toscanini"'
TZ = 'Europe/Rome'

_SKIP_GENRES = {'grandi_spettacoli_per_piccoli', 'grandi_spettacoli_per_piccoli_e_famiglie', 'incontri',
                'incontri_spazio_scala', 'tournee', 'eventi_fuori_sede'}
_SKIP_TITLE = re.compile(r'anteprima\s+under\s?30|prima delle prime|scuola di ballo|letture e note|la scala dei libri|'
                         r'bookcity|per i bambini|opera baby|mimì & teo|mimi & teo|incontro|conferenza|ragazzi|famiglie|piccolo 80', re.I)


# ---------------------------------------------------------------------------
# calendar
# ---------------------------------------------------------------------------

_A_RE = re.compile(r'<a\b([^>]*\bclass="mcl-evt-a[^"]*"[^>]*)>(.*?)</a>', re.S)


def _attr(attrs, name):
    m = re.search(rf'\b{name}="([^"]*)"', attrs)
    return _html.unescape(m.group(1)) if m else ''


def parse_calendar(page):
    """-> list of dicts (sid, evm, genre, href, local, title, authors), one per performance."""
    out, seen = [], set()
    for attrs, body in _A_RE.findall(page or ''):
        sid = _attr(attrs, 'data-id')
        when = re.search(r'<time[^>]*datetime="([^"]+)"', body)
        title = re.search(r'class="mcl-evt-title">(.*?)</h2>', body, re.S)
        if not (sid and when and title) or sid in seen:
            continue
        seen.add(sid)
        genre = re.search(r'mcl-type-([\w-]*)', _attr(attrs, 'class'))
        out.append({
            'sid': sid.replace('evt-', ''), 'evm': _attr(attrs, 'data-evm').replace('evm-', ''),
            'genre': genre.group(1) if genre else '', 'href': _attr(attrs, 'href'),
            'local': when.group(1), 'title': clean(title.group(1).replace('<br>', ' ')),
            'authors': [clean(a) for a in re.findall(r'class="mcl-evt-author">(.*?)</address>', body, re.S)],
        })
    return out


# ---------------------------------------------------------------------------
# production pages
# ---------------------------------------------------------------------------

def _lines(cell):
    parts = re.split(r'(?i)<br\s*/?>|</p>\s*<p[^>]*>|</p>|<p[^>]*>', cell)
    return [clean(p) for p in parts if clean(p)]


def _works(composer, cell):
    lines = _lines(cell)
    if not lines:
        return []
    if re.match(r'(?i)^da\b', lines[0]) and len(lines) > 1:      # an excerpt: "da Tosca" + the aria
        return [(composer, f'{lines[0]}: {"; ".join(lines[1:])}')]
    works = []
    for ln in lines:
        if works and (ln.startswith('(') or ln[:1].islower()):
            works[-1] = (composer, f'{works[-1][1]} {ln}')
        else:
            works.append((composer, ln))
    return works


def parse_production(page, url=None):
    """-> {'people': [(role, name, notes)], 'groups': [(role, name)], 'works': [(composer, title)],
           'ridotto': bool, 'conductor': bool, 'composer': str|None, 'minutes': int|None, 'series': str}"""
    h = page or ''
    out = {'people': [], 'groups': [], 'works': [], 'ridotto': False, 'conductor': False, 'composer': None,
           'minutes': None, 'series': '', 'dance': False, 'recorded': bool(re.search(r'(?i)base registrata', h))}
    leaf = re.search(r'class="cnt__leaf"[^>]*>(.*?)</div>', h, re.S)
    out['series'] = clean(leaf.group(1)) if leaf else ''
    nfo = re.search(r'<div class="table table-nfo">(.*?)</table>', h, re.S)
    if nfo:
        for row in re.findall(r'<tr>(.*?)</tr>', nfo.group(1), re.S):
            if 'ico-clock' in row:
                out['minutes'] = minutes(re.sub(r'<th.*?</th>', '', row, flags=re.S))
                continue
            for line in _lines(re.sub(r'<th.*?</th>', '', row, flags=re.S)):
                low = fold(line)
                if 'ridotto' in low:
                    out['ridotto'] = True
                if 'scuola di ballo' in low or 'corpo di ballo' in low:
                    out['dance'] = True
                if re.match(r'(?:con la partecipazione|produzione|nuova produzione|co-?produzione|balletto in|opera in|'
                            r'dramma|melodramma|libretto|performance|in diretta)', low) or 'anteprima' in low:
                    continue
                if 'ballerin' in low or low.startswith('corpo di ballo') and 'orchestra' not in low:
                    continue
                if re.search(r'orchestra|\bcoro\b|ensemble|filarmonica|professori|quartetto|solisti', low):
                    out['groups'] += house_groups(line)
    for block in re.findall(r'<div class="table table-prd">(.*?)</table>', h, re.S):
        for role, names in re.findall(r'<th scope="row">(.*?)</th>\s*<td>(.*?)</td>', block, re.S):
            r = clean(role)
            if re.match(r'(?i)^musica$', r):
                out['composer'] = nice_name(names)
                continue
            for name in split_names(clean(names)):
                n, notes = date_notes(name)
                out['people'].append((r, nice_name(n), notes))
    cast = re.search(r'<section id="cast" class="section">(?:(?!</section>).)*?<h2 class="mod__title"[^>]*>Cast</h2>'
                     r'(.*?)</section>', h, re.S)
    if cast:
        for role, names in re.findall(r'<td class="dt">(.*?)</td>\s*<td>(.*?)</td>', cast.group(1), re.S):
            for name in split_names(clean(names)):
                n, notes = date_notes(name)
                out['people'].append((clean(role), nice_name(n), notes))
    prog = re.search(r'<section id="programma"[^>]*>(.*?)</section>', h, re.S)
    if prog and re.search(r'(?i)coreografi', prog.group(1)):
        out['dance'] = True                    # a dance programme: choreographers, not works
    elif prog:
        for composer, cell in re.findall(r'<td class="dt">(.*?)</td>\s*<td>(.*?)</td>', prog.group(1), re.S):
            out['works'] += _works(nice_name(composer), cell)
    out['conductor'] = any(credit(r, n) and credit(r, n)[0] == 'Conductor' for r, n, _ in out['people'])
    return out


# ---------------------------------------------------------------------------
# performances -> events
# ---------------------------------------------------------------------------

def _filarmonica_credits(title):
    parts = [p.strip() for p in title.split(' / ') if p.strip()]
    out, conductor = [], False
    for p in parts:
        c = credit(None, p)
        if not c:
            continue
        if c[0] == 'Performer' and not conductor:
            out.append(('Conductor', c[1]))
            conductor = True
        else:
            out.append(c)
    return out


def _series_from_href(href):
    m = re.search(r'/concerti/([a-z0-9-]+)/', href or '')
    if not m:
        return None
    return m.group(1).replace('-', ' ').capitalize().replace('Recital di canto', 'Recital di canto')


def _apply(c, d):
    day = to_zurich_datetime(c['start']).date()
    credits = []
    for role, name in d['groups']:
        credits.append((role, name))
    for role, name, notes in d['people']:
        if plays_on(notes, day):
            cr = credit(role, name)
            if cr:
                credits.append(cr)
    c['credits'] = credits
    if d['works']:
        c['program'] = d['works']
    elif d['composer'] and c['genre'] == 'balletto':
        c['program'] = [(d['composer'], c['title'])]
    c['venue'] = RIDOTTO if d['ridotto'] else VENUE
    c['minutes'] = d['minutes']
    c['conductor'] = (d['conductor'] or any(r == 'Orchestra' for r, _ in d['groups'])) and not d['recorded']
    c['dance'] = d['dance'] or c['genre'] == 'balletto'
    if d['series']:
        c['series'] = d['series']


def _type(c):
    if c['genre'] == 'opera':
        return 'vocal-opera'
    if c['genre'] == 'balletto':
        return 'orchestral'
    return infer_type(c['title'], c.get('credits'), c.get('program'), c.get('series')) or guess_type(c['title'])


def fetch():
    today = today_zurich().isoformat()
    rows = parse_calendar(get(CALENDAR))
    log.info('teatro_alla_scala: %d calendar entries', len(rows))
    cands, skipped = [], {}

    def skip(why):
        skipped[why] = skipped.get(why, 0) + 1

    for r in rows:
        if r['local'][:10] < today:
            continue
        title = r['title']
        cancelled = looks_cancelled(title)
        title = re.sub(r'(?i)\s*[-–(]*\s*annullat[oa]\)?\s*$', '', title).strip()
        if r['genre'] in _SKIP_GENRES:
            skip(r['genre'] or 'other')
            continue
        if _SKIP_TITLE.search(title) or any(_SKIP_TITLE.search(a) for a in r['authors']):
            skip('talk / children / preview')
            continue
        href = r['href']
        url = href if href.startswith('http') else BASE + href
        filarmonica = 'filarmonica.it' in url
        if not r['genre'] and not filarmonica:
            skip('not a performance of the house')
            continue
        try:
            start = to_zurich_iso(r['local'], assume=TZ)
        except ValueError:
            skip('no time')
            continue
        c = {'sid': r['sid'], 'title': title, 'start': start, 'genre': r['genre'] or 'concerti', 'url': url,
             'page': None if filarmonica else url, 'cancelled': cancelled, 'venue': VENUE, 'credits': [],
             'program': [], 'series': None, 'minutes': None, 'conductor': None,
             'ticket': f"{BASE}/it/biglietti.html?startdate=&enddate=&spettacolo={r['evm']}" if r['evm'] else None}
        if filarmonica:
            c['credits'] = _filarmonica_credits(title)
            c['series'] = 'Filarmonica della Scala'
            c['ticket'] = url
        else:
            if 'ridotto' in href:
                c['venue'] = RIDOTTO
            c['series'] = _series_from_href(href)
            if r['genre'] == 'opera' and r['authors']:
                c['program'] = [(r['authors'][0], re.sub(r'\s*-\s*7 dicembre.*$', '', title))]
        cands.append(c)
    if skipped:
        log.info('teatro_alla_scala: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    read = with_details(KEY, cands, parse_production, _apply,
                        first=lambda c: ('0' if c['genre'] == 'balletto' else '1') + c['start'])
    log.info('teatro_alla_scala: %d production page(s) read', read)

    events = []
    for c in cands:
        if not c['detailed'] and c.get('prev'):
            old = reuse(c)
            c['credits'] = old.get('credits') or c['credits']
            c['program'] = old.get('program') or c['program']
            c['venue'] = old.get('venueName') or c['venue']
            c['minutes'] = old.get('durationMin')
            c['conductor'] = True
        if (c['genre'] == 'balletto' or c.get('dance')) and not c['conductor']:
            log.info('teatro_alla_scala %s: ballet without a conductor (or not read yet), skipped: %s',
                     c['sid'], c['title'])
            continue
        try:
            events.append(make_event(
                KEY, c['sid'], c['title'], c['start'], city=CITY, venueName=c['venue'], type=_type(c),
                series=c['series'], credits=c['credits'], program=c['program'], durationMin=c['minutes'],
                ticketUrl=c['ticket'], url=c['url'], status='cancelled' if c['cancelled'] else 'scheduled'))
        except ValueError as err:
            log.warning('teatro_alla_scala %s: skipped: %s', c['sid'], err)
    return events
