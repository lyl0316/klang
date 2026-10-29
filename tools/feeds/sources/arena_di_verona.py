"""Fondazione Arena di Verona: the Arena Opera Festival (summer, Arena di Verona) and the
Teatro Filarmonico season (opera, ballet, symphony concerts), plus the foundation's chamber
series in Verona's museums ("Musei in Musica").

    https://www.arena.it/calendario/                      every performance, both venues (~0.7 MB)
    https://www.arena.it/<arena-opera-festival|teatro-filarmonico-verona>/[<year>/]<slug>/   one page per production

The calendar is one static page: ``<div class="day" data-day="YYYY-MM-DD">`` with one
``<li class="bh-calendarShow">`` per production on that day: tags (Opera, Balletto, Concerto,
Musica da camera, Visita guidata, Proiezione; the festival adds the year), title + link, place and
time(s) (Verona local).

Production pages (one request each, read incrementally: a performance the previous feed already
has with its cast or programme keeps them; new productions first, then those playing in the next
two weeks and a weekly share of the others) are well structured: a "Cast" panel (role / name:
conductor, orchestra, chorus master; "Interpreti" with the dates each one sings, "22/11"), a
per-performance cast table under each date (``<time datetime="2026-11-22T15:30">``; "cast
cooming soon" while unknown) and a "Programma" panel (``<h5>Composer</h5><p>work</p>``). The
house ensembles are credited as "Orchestra, Coro … e Tecnici: Fondazione Arena di Verona", turned
into "Orchestra della Fondazione Arena di Verona" (and the Coro when named). The JSON-LD on these
pages is an EventSeries with dates only, so the HTML is used.

Skipped: guided tours, film screenings, events without a time, and ballets whose page credits
no conductor or orchestra.

Checked against the website on 29 Oct 2026: 123 calendar entries, 113 performances kept from today
(La Bohème 22 Nov 15:30 with Gianna Fratta and Selene Zanetti, Brahms Serenata 6 Nov 20:00 with
Dmitri Jurowski and Sergej Nakarjakov, Musei in Musica quartets 8 Nov 11:00 at the Museo Nicolis
in Villafranca di Verona, Aida ed. 1913 12 Jun 2027 21:30 in the Arena).
"""
from __future__ import annotations

import html as _html
import re

from common import clean, get, infer_type, log, looks_cancelled, make_event, to_zurich_datetime, to_zurich_iso, \
    today_zurich

from ._italy_north import credit, fold, minutes, nice_name, reuse, with_details

KEY = 'arena_di_verona'
NAME = 'Fondazione Arena di Verona'
SITE = 'https://www.arena.it/'
ATTRIBUTION = 'Source: Fondazione Arena di Verona (arena.it)'
KIND = 'venue'
COUNTRY = 'italy'
MAX_REQUESTS = 80              # 1 calendar + one page per production (~45 a year)
TIME_LIMIT = 600

BASE = 'https://www.arena.it'
CALENDAR = BASE + '/calendario/'
TZ = 'Europe/Rome'
HOUSE = 'Fondazione Arena di Verona'

_KEEP_TAGS = {'opera', 'balletto', 'concerto', 'musica da camera', 'operetta'}
_PLACES = {          # place as the calendar names it -> (venueName, city)
    'arena di verona': ('Arena di Verona', 'Verona'),
    'teatro filarmonico': ('Teatro Filarmonico', 'Verona'),
    'sala filarmonica': ('Teatro Filarmonico, Sala Filarmonica', 'Verona'),
    'teatro romano': ('Teatro Romano', 'Verona'),
    'museo nicolis': ('Museo Nicolis', 'Villafranca di Verona'),
    'museo degli affreschi': ('Museo degli Affreschi G. B. Cavalcaselle', 'Verona'),
}


# ---------------------------------------------------------------------------
# calendar
# ---------------------------------------------------------------------------

def parse_calendar(page):
    out = []
    for chunk in re.split(r'<div class="day" data-day="', page or '')[1:]:
        day = chunk[:10]
        for li in re.findall(r'<li class="bh-calendarShow"(.*?)</li>', chunk, re.S):
            a = re.search(r'<a href="([^"]+)" title="([^"]*)"', li)
            if not a:
                continue
            labels = [clean(x) for x in re.findall(r'<span class="label">(.*?)</span>', li, re.S)]
            out.append({
                'day': day, 'href': _html.unescape(a.group(1)), 'title': clean(_html.unescape(a.group(2))),
                'tags': [clean(t) for t in re.findall(r'<div class="tag">(.*?)</div>', li, re.S)],
                'place': labels[0] if labels else '',
                'times': [x for x in labels if re.fullmatch(r'\d{1,2}:\d{2}', x)],
            })
    return out


# ---------------------------------------------------------------------------
# production pages
# ---------------------------------------------------------------------------

def _house(role, name):
    """'Orchestra, Coro, Ballo e Tecnici' + 'Fondazione Arena di Verona' -> the orchestra and choir."""
    r = fold(role)
    if fold(name) != fold(HOUSE):
        return None
    out = []
    if 'orchestra' in r:
        out.append(('Orchestra', f'Orchestra della {HOUSE}'))
    if re.search(r'\bcoro\b', r) and 'maestro' not in r:
        out.append(('Choir', f'Coro della {HOUSE}'))
    return out


_LIFE = re.compile(r'\s*\(\s*\d{4}\s*(?:[-–]\s*\d{4})?\s*\)')


def parse_production(page, url=None):
    """-> {'general': [(role, name)], 'singers': [(role, name, {(m, d)})], 'by_date': {'YYYY-MM-DDTHH:MM': [(role, name)]},
           'works': [(composer, title)], 'composer': str, 'minutes': int|None}"""
    h = page or ''
    out = {'general': [], 'singers': [], 'by_date': {}, 'works': [], 'composer': '', 'minutes': None}
    for li in re.findall(r'<article class="ctn-data">(.*?)</article>', h, re.S):
        when = re.search(r'<time datetime="(\d{4}-\d\d-\d\dT\d\d:\d\d)"', li)
        if not when:
            continue
        rows = []
        for role, cell in re.findall(r'<tr>\s*<th scope="row">(.*?)</th>\s*<td>(.*?)</td>', li, re.S):
            for name in re.findall(r'<a [^>]*>(.*?)</a>', cell, re.S) or [cell]:
                if clean(name):
                    rows.append((clean(role), nice_name(name)))
        out['by_date'][when.group(1)] = rows
    cast = re.search(r'<div id="cast"[^>]*></div>(.*?)(?:<div id="[\w-]+"|<footer|$)', h, re.S)
    if cast:
        body = cast.group(1)
        split = body.find('>Interpreti<')
        general, singers = (body[:split], body[split:]) if split >= 0 else (body, '')
        for role, cell in re.findall(r'<p class="spacer-bottom-1">(.*?)</p>\s*<p>(.*?)</p>', general, re.S):
            for name in re.findall(r'<a [^>]*>(.*?)</a>', cell, re.S) or [cell]:
                if clean(name):
                    out['general'].append((clean(_html.unescape(role)), nice_name(_html.unescape(name))))
        for role, cell in re.findall(r'<p class="spacer-bottom-1">(.*?)</p>\s*<p>(.*?)</p>', singers, re.S):
            current = None
            for attrs, text in re.findall(r'<a ([^>]*)>(.*?)</a>', cell, re.S):
                if 'bullet' in attrs:
                    m = re.match(r'\s*(\d{1,2})/(\d{1,2})', clean(text))
                    if m and current is not None:
                        current[2].add((int(m.group(2)), int(m.group(1))))
                elif clean(text):
                    current = (clean(_html.unescape(role)), nice_name(_html.unescape(text)), set())
                    out['singers'].append(current)
    prog = re.search(r'<div id="programma"[^>]*></div>(.*?)<div class="buttons-bar left-right">', h, re.S)
    if prog:
        composer = ''
        for tag, text in re.findall(r'<(h5|p)>((?:(?!<h5|<p>).)*?)</\1>', prog.group(1), re.S):
            t = clean(_html.unescape(text))
            if tag == 'h5':
                composer = nice_name(_LIFE.sub('', t)) if t else composer
            elif t and composer:
                out['works'].append((composer, t))
    info = re.search(r'>Musica</[^>]+>\s*<[^>]+>(.*?)</', h, re.S)
    out['composer'] = clean(info.group(1)) if info else ''
    dur = re.search(r'>Durata</[^>]+>\s*<[^>]+>(.*?)</', h, re.S)
    out['minutes'] = minutes(dur.group(1)) if dur else None
    return out


def _credits_for(d, local):
    credits = []
    for role, name in d['general']:
        h = _house(role, name)
        if h is not None:
            credits += h
            continue
        c = credit(role, name)
        if c:
            credits.append(c)
    rows = d['by_date'].get(local)
    if rows:
        for role, name in rows:
            c = credit(role, name)
            if c:
                credits.append(c)
    else:
        day = (int(local[5:7]), int(local[8:10]))
        for role, name, dates in d['singers']:
            if not dates or day in dates:
                c = credit(role, name)
                if c:
                    credits.append(c)
    return credits


def _apply(c, d):
    c['credits'] = _credits_for(d, c['local'])
    if d['works']:
        c['program'] = d['works']
    elif d['composer'] and c['kind'] in ('opera', 'ballet') and ',' not in d['composer']:
        c['program'] = [(nice_name(d['composer']), c['title'])]
    c['minutes'] = d['minutes']
    c['live'] = any(r in ('Conductor', 'Orchestra') for r, _ in c['credits'])


def _type(c):
    if c['kind'] == 'opera':
        return 'vocal-opera'
    if c['kind'] == 'ballet':
        return 'orchestral'
    if c['kind'] == 'chamber':
        return infer_type(c['title'], c['credits'], c['program']) or 'chamber'
    return infer_type(c['title'], c['credits'], c['program'])


def fetch():
    today = today_zurich().isoformat()
    rows = parse_calendar(get(CALENDAR))
    log.info('arena_di_verona: %d calendar entries', len(rows))
    cands, seen, skipped = [], set(), {}

    def skip(why):
        skipped[why] = skipped.get(why, 0) + 1

    for r in rows:
        if r['day'] < today:
            continue
        tags = {fold(t) for t in r['tags'] if not re.fullmatch(r'\d{4}', t)}
        if not tags & _KEEP_TAGS:
            skip('/'.join(sorted(tags)) or 'untagged')
            continue
        place = _PLACES.get(fold(r['place']))
        if not place:
            skip(f"place {r['place']!r}")
            continue
        if not r['times']:
            skip('no time')
            continue
        kind = ('opera' if 'opera' in tags or 'operetta' in tags else 'ballet' if 'balletto' in tags else
                'chamber' if 'musica da camera' in tags else 'concert')
        url = BASE + r['href'] if r['href'].startswith('/') else r['href']
        slug = r['href'].strip('/').split('/')[-1]
        for tm in r['times']:
            local = f"{r['day']}T{int(tm.split(':')[0]):02d}:{tm.split(':')[1]}"
            sid = f'{slug}-{local[:10]}-{local[11:].replace(":", "")}'
            if sid in seen:
                continue
            seen.add(sid)
            cands.append({'sid': sid, 'title': r['title'].replace(' | ', ' – '), 'start': to_zurich_iso(local, assume=TZ),
                          'local': local, 'kind': kind, 'url': url, 'page': url, 'venue': place[0], 'city': place[1],
                          'credits': [], 'program': [], 'minutes': None, 'live': None,
                          'cancelled': looks_cancelled(r['title'])})
    if skipped:
        log.info('arena_di_verona: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    read = with_details(KEY, cands, parse_production, _apply,
                        first=lambda c: ('0' if c['kind'] == 'ballet' else '1') + c['start'])
    log.info('arena_di_verona: %d production page(s) read', read)

    events = []
    for c in cands:
        if not c['detailed'] and c.get('prev'):
            old = reuse(c)
            c['credits'] = old.get('credits') or c['credits']
            c['program'] = old.get('program') or c['program']
            c['minutes'] = old.get('durationMin')
            c['live'] = True
        if c['kind'] == 'ballet' and not c['live']:
            log.info('arena_di_verona %s: ballet without live music (or not read yet), skipped', c['sid'])
            continue
        try:
            events.append(make_event(
                KEY, c['sid'], c['title'], c['start'], city=c['city'], venueName=c['venue'], type=_type(c),
                credits=c['credits'], program=c['program'], durationMin=c['minutes'], ticketUrl=c['url'],
                url=c['url'], status='cancelled' if c['cancelled'] else 'scheduled'))
        except ValueError as err:
            log.warning('arena_di_verona %s: skipped: %s', c['sid'], err)
    return events
