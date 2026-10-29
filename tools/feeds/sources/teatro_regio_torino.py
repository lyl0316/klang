"""Teatro Regio Torino: opera, ballet and concerts (Teatro Regio, Piccolo Regio Puccini) from
the theatre's own pages.

    https://www.teatroregio.torino.it/calendar/list           every production since 2018 (~1.1 MB)
    https://www.teatroregio.torino.it/<category>-<season>/<slug>   one page per production

The list (the Drupal view behind "Calendario") gives each production's category, date range
("15 Ottobre-21 Novembre 2026"), title and link, newest season first; productions whose range
ends before today are dropped. The performances themselves are only on the production page: its
"Calendario rappresentazioni" block has one row per performance with an add-to-calendar record
(``atc_date_start`` 2026-10-27 20:00:00, ``atc_timezone`` Europe/Rome; the ``<time>`` next to it
wrongly says "Z"), the place ("Luogo di svolgimento: Teatro Regio") and a note ("Anteprima
Giovani"). The page also lists the artists ("<strong>Name</strong> direttore", the house
orchestra and chorus), the cast ("Personaggi e interpreti": character, voice, singer and the
performances each sings, as true UTC instants) and the programme ("<strong>Composer</strong>"
+ works).

Pages are read incrementally (_italy_north.read_pages): a production the previous feed
already has keeps its performances unless it plays within two weeks or is due for its weekly
re-read; new productions are read first.

The site's content is published under CC BY-NC-ND 3.0 ("Copyright e termini di utilizzo",
/node/1564): Klang is non-commercial, credits the Fondazione Teatro Regio di Torino and takes
facts only (dates, places, names, works), never texts or images.

Skipped: talks (Conferenze), school and family shows (Scuola all'Opera, Spettacoli, In famiglia,
Attività e percorsi, Formazione docenti), the "Anteprima Giovani" previews (under-30s only),
tours and performances abroad (e.g. the orchestra at the Royal Opera House Muscat), and ballets
whose page names no conductor or orchestra (recorded music).

Checked against the website on 29 Oct 2026: 23 productions from today in the kept categories,
83 performances (Roberto Bolle and Friends and The Tokyo Ballet name no conductor: skipped);
La bohème (Leoncavallo) 27 Oct-22 Nov with Andrea Battistoni and per-date casts, Estasi 12 Nov
20:00 with Battistoni / Antoinette Dennefeld and the Saint-Saëns, Berlioz, Falla, Ravel
programme, Iris 5-18 Nov.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone

from common import clean, infer_type, log, looks_cancelled, make_event, get, to_zurich_iso, today_zurich

from ._italy_north import MONTHS, credit, fold, house_groups, nice_name, read_pages

KEY = 'teatro_regio_torino'
NAME = 'Teatro Regio Torino'
SITE = 'https://www.teatroregio.torino.it/'
ATTRIBUTION = 'Source: Fondazione Teatro Regio di Torino (teatroregio.torino.it)'
KIND = 'venue'
COUNTRY = 'italy'
MAX_REQUESTS = 60              # 1 list + one page per production (~25 a season)
TIME_LIMIT = 600

BASE = 'https://www.teatroregio.torino.it'
LIST = BASE + '/calendar/list'
CITY = 'Turin'
TZ = 'Europe/Rome'

_KEEP = {'opera e balletto', 'concerti', 'concerti extra'}
_ABROAD = re.compile(r'muscat|\boman\b|tournee|tournée|giappone|parigi|paris|vienna|wien|london|londra|new york', re.I)
_ABROAD_TITLE = re.compile(r'muscat|\boman\b|tournee|tournée', re.I)
_VENUES = {'teatro regio': 'Teatro Regio', 'piccolo regio puccini': 'Teatro Regio, Piccolo Regio Puccini',
           'piccolo regio': 'Teatro Regio, Piccolo Regio Puccini'}


# ---------------------------------------------------------------------------
# list
# ---------------------------------------------------------------------------

def _end(text):
    """'15 Ottobre-21 Novembre 2026' / '6-7 Settembre 2026' -> date of the last day, or None."""
    m = re.findall(r'(\d{1,2})\s+([a-zà]+)\s+(\d{4})', fold(text))
    if not m:
        return None
    d, mon, y = m[-1]
    try:
        return datetime(int(y), MONTHS[mon], int(d)).date()
    except (KeyError, ValueError):
        return None


def parse_list(page):
    out = []
    for cat, when, href, title in re.findall(
            r'category-label"><span class="field-content">(.*?)</span></span> \| <span class="views-field '
            r'views-field-field-activity-calendar"><span class="field-content">(.*?)</span>.*?<h2 class="views-field '
            r'views-field-title"><span class="field-content"><a href="([^"]+)"[^>]*>(.*?)</a>', page or '', re.S):
        out.append({'cat': clean(cat), 'when': clean(when), 'end': _end(clean(when)), 'href': href,
                    'title': clean(title)})
    return out


# ---------------------------------------------------------------------------
# production pages
# ---------------------------------------------------------------------------

def _programme(html):
    block = re.search(r'field--name-field-activity-program[^>]*>(.*?)</div>', html, re.S)
    works = []
    for para in re.findall(r'<p>(.*?)</p>', block.group(1) if block else '', re.S):
        para = re.sub(r'<span class="note">.*?</span>', '', para, flags=re.S)
        m = re.match(r'\s*<strong>(.*?)</strong>(.*)$', para, re.S)
        if not m:
            continue
        composer = nice_name(m.group(1))
        lines = [clean(x) for x in re.split(r'<br\s*/?>', m.group(2)) if clean(x)]
        if composer and lines:
            title = lines[0]
            for extra in lines[1:]:
                title += (' ' if extra[:1].islower() or extra.startswith('(') else ' – ') + extra
            works.append((composer, title))
    return works


def _people(html):
    credits = []
    for block in re.findall(r'view-id-opera_details[^"]*"[^>]*>(.*?)</section>', html, re.S):
        for row in re.findall(r'<div class="views-row">(.*?)</div>', block, re.S):
            name = re.search(r'opera-detail-value">(.*?)</strong>', row, re.S)
            role = re.search(r'label-ref">(.*?)</span>', row, re.S)
            if not name:
                continue
            if role:
                c = credit(clean(role.group(1)), clean(name.group(1)))
                if c:
                    credits.append(c)
            else:
                credits += house_groups(nice_name(name.group(1)))
    return credits


def _cast(html):
    """-> [(role, name, {UTC instants})] from 'Personaggi e interpreti'."""
    sec = re.search(r'Personaggi e interpreti</h2>(.*?)</section>', html, re.S)
    out = []
    for row in re.split(r'<div class="views-row">', sec.group(1) if sec else '')[1:]:
        voice = re.search(r'views-field-name"><span class="field-content">(.*?)</span>', row, re.S)
        name = re.search(r'views-field-field-artist-ref"><div class="field-content">(.*?)</div>', row, re.S)
        if not name:
            continue
        times = set(re.findall(r'<time datetime="(\d{4}-\d\d-\d\dT\d\d:\d\d):\d\dZ"', row))
        out.append((clean(voice.group(1)) if voice else '', nice_name(re.sub(r'\s*\([^)]*\)', '', clean(name.group(1)))),
                    times))
    return out


def parse_production(html, url, meta=None):
    meta = meta or {}
    h = html or ''
    place = re.search(r'calendar-location"><strong>Luogo di svolgimento:</strong>\s*(.*?)</span>', h, re.S)
    place = clean(place.group(1)) if place else 'Teatro Regio'
    if _ABROAD.search(place) or _ABROAD_TITLE.search(meta.get('title', '')):
        log.info('teatro_regio_torino: abroad, skipped: %s (%s)', meta.get('title'), place)
        return []
    venue = _VENUES.get(fold(place), place)
    city = 'Milan' if re.search(r'milano', fold(place)) else CITY
    credits = _people(h)
    cast = _cast(h)
    works = _programme(h)
    kind = meta.get('kind', 'concert')
    if kind == 'ballet' and not any(r in ('Conductor', 'Orchestra') for r, _ in credits):
        log.info('teatro_regio_torino: ballet without live music, skipped: %s', meta.get('title'))
        return []
    head = re.search(r'<h1[^>]*>(.*?)</h1>', h, re.S)
    composer = re.search(r'atc_title"><a [^>]*>[^<]*</a>\s*\|\s*([^<]+)</var>', h)
    events = []
    cal = re.search(r'<section id="block-views-blockcalendar-list-block-\d+"(.*?)</section>', h, re.S)
    for row in re.split(r'<div class="views-row">', cal.group(1) if cal else '')[1:]:
        when = re.search(r'atc_date_start">(\d{4}-\d\d-\d\d \d\d:\d\d)', row)
        if not when:
            continue
        note = re.search(r'field-location-details"><div class="field-content">(.*?)</div>', row, re.S)
        note = clean(note.group(1)) if note else ''
        if re.search(r'(?i)anteprima giovani|scuol|famigli', note):
            continue
        start = to_zurich_iso(when.group(1).replace(' ', 'T'), assume=TZ)
        utc = datetime.fromisoformat(start).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M')
        perf = list(credits) + [c for c in (credit(v or 'Performer', n) if v else credit(None, n)
                                            for v, n, times in cast if not times or utc in times) if c]
        title = meta.get('title') or (clean(head.group(1)) if head else '')
        program = works or ([(nice_name(composer.group(1)), title)] if composer and kind in ('opera', 'ballet')
                            and clean(composer.group(1)) else [])
        sid = f"{url.rstrip('/').split('/')[-1]}-{when.group(1)[:10]}-{when.group(1)[11:].replace(':', '')}"
        try:
            events.append(make_event(
                KEY, sid, title, start, city=city, venueName=venue,
                type=('vocal-opera' if kind == 'opera' else 'orchestral' if kind == 'ballet'
                      else infer_type(title, perf, program)),
                series=meta.get('series'), credits=perf, program=program, ticketUrl=url, url=url,
                status='cancelled' if looks_cancelled(note) or looks_cancelled(title) else 'scheduled'))
        except ValueError as err:
            log.warning('teatro_regio_torino %s: skipped: %s', sid, err)
    return events


def fetch():
    today = today_zurich()
    rows = parse_list(get(LIST))
    log.info('teatro_regio_torino: %d productions in the list', len(rows))
    metas, skipped = {}, {}
    for r in rows:
        if r['end'] is None or r['end'] < today:
            continue
        cat = fold(r['cat'])
        if cat not in _KEEP:
            skipped[r['cat']] = skipped.get(r['cat'], 0) + 1
            continue
        if _ABROAD_TITLE.search(r['title']):
            skipped['abroad'] = skipped.get('abroad', 0) + 1
            continue
        url = BASE + r['href'] if r['href'].startswith('/') else r['href']
        kind = 'concert'
        if cat == 'opera e balletto':
            kind = 'ballet' if re.search(r'(?i)ballet|balletto|schiaccianoci|bolle|danza|giselle|lago dei cigni',
                                         r['title']) else 'opera'
        title = r['title'].replace('MITO | ', 'MITO – ')
        metas[url] = {'title': title, 'kind': kind, 'series': r['cat'] if kind == 'concert' else None,
                      'end': r['end'].isoformat()}
    if skipped:
        log.info('teatro_regio_torino: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    events, read, reused = read_pages(KEY, list(metas), lambda html, url: parse_production(html, url, metas[url]),
                                      order=lambda url: metas[url]['end'])
    log.info('teatro_regio_torino: %d production page(s) read, %d reused', read, reused)
    return events
