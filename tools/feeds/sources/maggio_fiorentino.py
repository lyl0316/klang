"""Maggio Musicale Fiorentino, Florence: opera, concerts and ballet from the monthly
calendar and the event pages (HTML, server-rendered Nuxt).

    https://www.maggiofiorentino.com/calendario/<yyyy>/<mm>     one month, every performance
    https://www.maggiofiorentino.com/events/<slug>              one production / concert
    https://www.maggiofiorentino.com/event_season/<family season slug>   the family & school series

A month page lists each performance as a link to its event page whose aria-label carries
title, time and full date ("Simon Boccanegra alle 17:00 di Sunday, 15 November 2026"),
plus the category (Opera / Concerti / Balletto), the place ("Teatro del Maggio - Sala
Grande", "Teatro Goldoni", "Teatro Il Momento - Empoli") and a short excerpt. Months are
read from the current one up to 15 months ahead (stopping after three empty months), about
15 requests. The family and school series ("Spettacoli per le famiglie e le scuole", linked
from the home page) is read once to know which events to leave out.

Event pages carry the cast as "role / name" pairs ("Artisti": "Maestro concertatore e
direttore / James Conlon", "Simon Boccanegra / George Petean") and for concerts the
programme ("<b>Composer</b> / work"). One request per event, read incrementally: an event
whose dates the previous feed already has with cast or works (same id, start and title)
keeps them; the requests left go to events still missing them, soonest first, then to
events in the next two weeks and a fixed share of the others (each about once a week).
The cast is per production, not per date. Ticket buttons are scripts, so ``ticketUrl`` is
not set; ``url`` is the event page. robots.txt answers 404 (everything allowed); no terms
about reuse were found on the site.

Skipped: the family and school series (Il mirabile elisir, Pierino e il lupo, Disney
Fantasia live …), school performances ("Recita per le scuole"), the touring school opera
"Verdi Game", ballets with neither conductor nor orchestra credited (recorded music, e.g.
Roberto Bolle and Friends), and concerts whose page names no performers and no works
(guest pop shows such as Bryan Adams).

Checked against the website on 29 Oct 2026 (Simon Boccanegra 15–24 Nov, Mendelssohn 2 on
21 Nov, Rarità mozartiane 28 Nov, Les contes d'Hoffmann, La traviata, Capuçon/Argerich
7 Apr: dates, times, halls, casts and works match). An opera's composer comes from the
calendar excerpt ("<h4>Alban Berg</h4>") when the event page does not repeat it. Singers
marked "*" / "°" (young-artist programme, chorus members) are kept without the mark.
"""
from __future__ import annotations

import html as _html
import re
from datetime import date

from common import (BudgetExceeded, FetchError, clean, event_id, get, log, looks_cancelled, make_event,
                    previous_event, refresh_due, requests_left, today_zurich)

from ._italy_centre import (concert_type, fold, month_number, paragraphs, parse_block, role_en, rome_iso, split_groups,
                            looks_like_person)

KEY = 'maggio_fiorentino'
NAME = 'Maggio Musicale Fiorentino'
SITE = 'https://www.maggiofiorentino.com/'
ATTRIBUTION = 'Source: Fondazione Teatro del Maggio Musicale Fiorentino (maggiofiorentino.com)'
KIND = 'venue'
COUNTRY = 'italy'
MAX_REQUESTS = 90              # ~17 calendar requests + one page per event (~50 a season)
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 14
REFRESH_EVERY_DAYS = 7

BASE = 'https://www.maggiofiorentino.com'
MONTH_URL = BASE + '/calendario/{y}/{m:02d}'
MONTHS_AHEAD = 15
CITY = 'Florence'
_TOWNS = {'firenze': 'Florence', 'fiesole': 'Fiesole', 'prato': 'Prato', 'pistoia': 'Pistoia', 'empoli': 'Empoli',
          'siena': 'Siena', 'lucca': 'Lucca', 'pisa': 'Pisa', 'arezzo': 'Arezzo'}
_SKIP_VENUE_RE = re.compile(r'scuol|istituto|liceo', re.I)
_SKIP_TITLE_RE = re.compile(r'verdi game|live in concert|famiglie|bambini|ragazzi|visita guidata|open day|prova aperta|'
                            r'incontro con|conferenz', re.I)


# ---------------------------------------------------------------------------
# calendar
# ---------------------------------------------------------------------------

_ITEM_RE = re.compile(r'<a href="(/events/[^"]+)" class="block" aria-label="([^"]*)">(.*?)</a>(?=<!--\]-->|<a href="/events/)',
                      re.S)
_LABEL_RE = re.compile(r'^(.*) alle (\d{1,2}):(\d{2}) di [A-Za-z]+, (\d{1,2}) ([A-Za-z]+) (\d{4})$')


def parse_month(page):
    rows = []
    for href, label, body in _ITEM_RE.findall(page or ''):
        label = clean(_html.unescape(label))
        m = _LABEL_RE.match(label)
        if not m:
            continue
        title, hh, mi, d, mon, y = m.groups()
        mo = month_number(mon)
        if not mo:
            continue
        cat = re.search(r'<span class="font-bold"><span style="color:[^"]*;">([^<]*)</span>', body)
        place = re.search(r'<div class="font-size-small"><span class="font-bold">[^<]*</span>\s*(.*?)</div>', body, re.S)
        slug = href.split('/events/', 1)[1].strip('/')
        h4 = re.search(r'<h4[^>]*>(.*?)</h4>', body, re.S)
        rows.append({'slug': slug, 'url': BASE + href, 'title': clean(title), 'y': int(y), 'mo': mo, 'd': int(d),
                     'hh': int(hh), 'mi': int(mi), 'category': clean(cat.group(1)) if cat else '',
                     'place': clean(place.group(1)) if place else '', 'composer': clean(h4.group(1)) if h4 else ''})
    return rows


def _venue(place):
    """-> (venueName, city, note) from 'Teatro del Maggio - Auditorium (Recita per le scuole)'."""
    note = re.search(r'\(([^)]*)\)\s*$', place)
    p = clean(re.sub(r'\s*\([^)]*\)\s*$', '', place))
    f = fold(p)
    if not p:
        return 'Teatro del Maggio', CITY, note.group(1) if note else ''
    if f in ('auditorium', 'sala grande', 'cavea', 'sala mehta', 'piccolo teatro'):
        return f'Teatro del Maggio - {p}', CITY, note.group(1) if note else ''
    m = re.match(r'^(.*\S)\s+-\s+(.+)$', p)
    if m and not fold(m.group(1)).startswith('teatro del maggio'):
        town = m.group(2).strip()
        return p, _TOWNS.get(fold(town), town), note.group(1) if note else ''
    return p, CITY, note.group(1) if note else ''


def _family_slugs():
    """Slugs of the family & school series (one or two requests)."""
    out = set()
    try:
        home = get(BASE + '/')
    except FetchError as err:
        log.warning('maggio_fiorentino: home page failed, family series unknown: %s', err)
        return out
    for path in sorted(set(re.findall(r'href="(/event_season/[^"]*famigli[^"]*)"', home)))[:2]:
        try:
            page = get(BASE + path)
        except FetchError as err:
            log.warning('maggio_fiorentino: %s failed: %s', path, err)
            continue
        out |= {s.strip('/') for s in re.findall(r'href="/events/([^"#?]+)"', page)}
    return out


# ---------------------------------------------------------------------------
# event pages
# ---------------------------------------------------------------------------

def _section(page, name):
    m = re.search(r'<h5[^>]*>\s*' + name + r'\s*</h5>(.*?)</section>', page or '', re.S | re.I)
    return m.group(1) if m else ''


def _name(text):
    """'Erica Cortese*' -> 'Erica Cortese'; 'Min Kim (20, 22)' -> 'Min Kim'."""
    t = clean(text).strip(' ,;')
    t = re.sub(r'\s*\((?:[\d,\s]|e\b)+\)$', '', t)
    return t.rstrip('*°').strip()


def parse_detail(page, title=''):
    """-> {'credits': [(role, name)], 'program': [(composer, work)], 'category', 'head_composer'}"""
    credits, composers = [], []
    for p in re.findall(r'<p[^>]*>(.*?)</p>', _section(page, 'Artisti'), re.S):
        if re.match(r'\s*[*°]', clean(p)):
            continue                                       # '* Artisti del … Program' footnote
        role_text = None
        for tok in re.split(r'(?is)(<span[^>]*>.*?</span>)|<br\s*/?>', p):
            if not tok or not clean(tok):
                continue
            if tok.lower().startswith('<span') and re.search(r'(?i)color:\s*(?:#808080|rgb\(128,\s*128,\s*128\))', tok):
                role_text = clean(tok)
                continue
            for name in re.split(r'\s*/\s*', clean(tok)):
                name = _name(name)
                if not name:
                    continue
                if role_text is None:
                    groups = split_groups(name)
                    if groups:
                        credits.extend(groups)
                    elif looks_like_person(name):
                        credits.append(('Performer', name))
                    continue
                if re.match(r'(?i)^musiche?\s+di$', role_text):
                    composers.append(name)
                    continue
                role = role_en(role_text)
                if not role:
                    continue
                if role in ('Orchestra', 'Choir', 'Ensemble'):
                    credits.extend(split_groups(name) or [(role, name)])
                else:
                    credits.append((role, name))
    prog = parse_block(paragraphs(_section(page, 'Programma')), title)
    program = list(prog['program']) or [(c, '') for c in composers]
    head = re.search(r'<a href="/event_categories/[^"]*"[^>]*>([^<]*)</a>(.*?)</div></div></div></div>', page or '', re.S)
    head_composer, head_credits = '', []
    if head:
        h4 = re.search(r'<h4[^>]*>(.*?)</h4>', head.group(2), re.S)
        head_composer = clean(h4.group(1)) if h4 else ''
        block = parse_block(paragraphs(re.sub(r'(?is)<h[124][^>]*>.*?</h[124]>', ' ', head.group(2))), title)
        head_credits = [(r, n) for r, n, _ in block['credits']]
    if not credits:
        credits = head_credits
    return {'credits': credits, 'program': program, 'category': clean(head.group(1)) if head else '',
            'head_composer': head_composer}


def _type(category, title, credits, program):
    c = fold(category)
    roles = {r for r, _ in credits}
    if c == 'opera':
        return 'vocal-opera'
    if c == 'balletto':
        return 'orchestral' if (roles & {'Conductor', 'Orchestra'}) else None
    return concert_type(title, credits, program)


# ---------------------------------------------------------------------------
# fetch
# ---------------------------------------------------------------------------

def fetch():
    today = today_zurich()
    family = _family_slugs()
    rows, empty = [], 0
    y, m = today.year, today.month
    for i in range(MONTHS_AHEAD):
        if requests_left() <= 0:
            log.warning('maggio_fiorentino: request cap reached in the calendar at %d-%02d', y, m)
            break
        try:
            month_rows = parse_month(get(MONTH_URL.format(y=y, m=m)))
        except FetchError as err:
            if i == 0:
                raise
            log.warning('maggio_fiorentino: month %d-%02d failed: %s', y, m, err)
            month_rows = None
        if month_rows is not None:
            rows.extend(month_rows)
            empty = 0 if month_rows else empty + 1
            if empty >= 3:
                break
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)

    cands, skipped, seen = [], {}, set()
    for r in rows:
        venue, city, note = _venue(r['place'])
        why = None
        if r['slug'] in family or _SKIP_TITLE_RE.search(r['title']):
            why = 'family/school series'
        elif _SKIP_VENUE_RE.search(note) or _SKIP_VENUE_RE.search(venue):
            why = 'school performance'
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        if date(r['y'], r['mo'], r['d']) < today:
            continue
        start = rome_iso(r['y'], r['mo'], r['d'], r['hh'], r['mi'])
        sid = f"{r['slug']}-{start[:16].replace('-', '').replace(':', '')}"
        if sid in seen:
            continue
        seen.add(sid)
        cands.append({'row': r, 'start': start, 'sid': sid, 'venue': venue, 'city': city})
    if skipped:
        log.info('maggio_fiorentino: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    by_slug = {}
    for c in cands:
        by_slug.setdefault(c['row']['slug'], []).append(c)
    details, order = {}, []
    for slug, dates in by_slug.items():
        prevs = [previous_event(event_id(KEY, c['sid']), c['start'], title=c['row']['title']) for c in dates]
        full = [p for p in prevs if p and (p.get('credits') or p.get('program'))]
        if full:
            p = full[0]
            details[slug] = {'credits': [(x.get('role'), x.get('name')) for x in p.get('credits') or []],
                             'program': [(x.get('composer') or '', x.get('title') or '') for x in p.get('program') or []],
                             'type': p.get('type'), 'reused': True}
        first = min(c['start'] for c in dates)
        if not full:
            order.append((0, first, slug))
        elif refresh_due(slug, first, near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            order.append((1, first, slug))
    order.sort()
    fetched = 0
    for _, _, slug in order:
        if requests_left() <= 0:
            break
        dates = by_slug[slug]
        try:
            d = parse_detail(get(dates[0]['row']['url']), dates[0]['row']['title'])
        except BudgetExceeded as err:
            log.warning('maggio_fiorentino: stopped reading event pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('maggio_fiorentino %s: event page failed: %s', slug, err)
            continue
        fetched += 1
        details[slug] = d
    log.info('maggio_fiorentino: %d performances, %d events; %d event page(s) read, %d reused',
             len(cands), len(by_slug), fetched, sum(1 for d in details.values() if d.get('reused')))

    events, skipped_after = [], set()
    for c in cands:
        r = c['row']
        d = details.get(r['slug'], {'credits': [], 'program': []})
        program = d['program']
        composer = d.get('head_composer') or r.get('composer')
        if not program and composer and fold(r['category']) == 'opera':
            program = [(composer, r['title'])]
        if d.get('reused') and d.get('type'):
            kind = d['type']
        else:
            category = r['category'] or d.get('category', '')
            kind = _type(category, r['title'], d['credits'], program)
            if 'category' in d and fold(category) == 'balletto' and kind is None:
                skipped_after.add((r['slug'], 'ballet without conductor or orchestra'))
                continue
            if 'category' in d and fold(category) != 'opera' and not d['credits'] and not program:
                skipped_after.add((r['slug'], 'no performers or works listed (not a classical concert)'))
                continue
        try:
            events.append(make_event(
                KEY, c['sid'], r['title'], c['start'], city=c['city'], venueName=c['venue'], type=kind,
                credits=d['credits'], program=program, url=r['url'],
                status='cancelled' if looks_cancelled(r['title']) or looks_cancelled(r['place']) else None))
        except ValueError as err:
            log.warning('maggio_fiorentino %s: skipped: %s', c['sid'], err)
    for slug, why in sorted(skipped_after):
        log.info('maggio_fiorentino %s: %s, skipped', slug, why)
    return events
