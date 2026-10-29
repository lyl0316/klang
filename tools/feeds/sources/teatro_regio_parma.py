"""Teatro Regio di Parma: opera, concerts, dance and the Festival Verdi from the monthly
calendar and the show pages (HTML, WordPress).

    https://teatroregioparma.it/calendario/?c_year=<yyyy>&c_month=<m>   one month
    https://teatroregioparma.it/spettacolo/<slug>/                     one show, all its dates

A month page is a grid of days (``data-time="2026-12-19"``); each day lists its shows with
category ("Opera", "Concerti", "Parma Danza", "Festival Verdi", "Verdi Off", "Regio
Young", "RegioInsieme", "Eventi del Regio" …), title, link and start times. Months are read
from the current one up to 15 months ahead (stopping after three empty months), about 15
requests. The WordPress REST API has the shows but not their dates, so it is not used.

The show page gives the place of each date ("Teatro Regio di Parma", "Teatro Giuseppe Verdi
di Busseto"), a note per date ("TURNO A", "Prova Aperta", "Prova Under30"), the credits as
"direttore <b>Name</b>" lines with bold group names ("FILARMONICA ARTURO TOSCANINI"), the
composer ("Musica <b>…</b>"), the cast ("Aida / <b>Federica Vitali</b>") and the ticket link.
One request per show, read incrementally: a show whose dates the previous feed already has
with their place (same id, start and title) keeps them; the requests left go to shows not
seen before, soonest first, then to shows in the next two weeks and a fixed share of the
others (each about once a week). The cast is per production, not per date.

robots.txt: "User-agent: *" with an empty Disallow (everything allowed). No terms about
reuse were found on the site.

Skipped: Regio Young (children and families), RegioInsieme (schools and community), the
Verdi Off fringe (street shows, circus, talks, films), open and under-30 rehearsals
("Prove aperte", "Prova Under30"), talks ("Prima che si alzi il sipario"), study days,
exhibitions and ceremonies, dance without an orchestra credited (or named in the title:
"Orchestra e Ballo della Fondazione Arena di Verona"), and Festival Verdi entries whose page
credits no performer.

Checked against the website on 29 Oct 2026 (Il pipistrello 19 Dec, Il lago dei cigni
27/29 Dec, Quintetto dei Berliner Philharmoniker 26 Jan, Boris Godunov 22–30 Jan: dates,
times, places, credits match).
"""
from __future__ import annotations

import html as _html
import re
from datetime import date

from common import (BudgetExceeded, FetchError, clean, event_id, get, log, looks_cancelled, make_event, previous_event,
                    refresh_due, requests_left, today_zurich)

from ._italy_centre import (concert_type, fold, month_number, paragraphs, parse_block, role_en, rome_iso, split_groups,
                            all_credits)

KEY = 'teatro_regio_parma'
NAME = 'Teatro Regio di Parma'
SITE = 'https://teatroregioparma.it/'
ATTRIBUTION = 'Source: Fondazione Teatro Regio di Parma (teatroregioparma.it)'
KIND = 'venue'
COUNTRY = 'italy'
MAX_REQUESTS = 80              # ~15 months + one page per show (~40 a season)
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 14
REFRESH_EVERY_DAYS = 7

BASE = 'https://teatroregioparma.it'
MONTH_URL = BASE + '/calendario/?c_year={y}&c_month={m}'
MONTHS_AHEAD = 15
CITY = 'Parma'

_SKIP_CATEGORIES = {'regio young', 'regioinsieme', 'verdi off', 'visite guidate', 'vivi il regio'}
_SKIP_TITLE_RE = re.compile(r"prima che si alzi il sipario|prov[ae] aperte?|prove? under ?30|giornata di studi|cerimonia|"
                            r"mostra|proiezione|incontr[oi]|conferenz|visita|laborator|\blab\b|scoprendo|antropologo|"
                            r"gamification|presentazione|fuoco di gioia", re.I)
_SKIP_NOTE_RE = re.compile(r'prova|scuol|riservat', re.I)
_TOWN_RE = re.compile(r'\b(Busseto|Fidenza|Roncole|Colorno|Salsomaggiore|Fontanellato|Langhirano|Soragna|Sabbioneta|'
                      r'Reggio Emilia|Piacenza|Modena|Cremona|Mantova|Bologna|Milano)\b', re.I)
_TOWN_EN = {'milano': 'Milan', 'mantova': 'Mantua'}


# ---------------------------------------------------------------------------
# calendar
# ---------------------------------------------------------------------------

def parse_month(page):
    """-> list of {slug, url, title, category, y, mo, d, hh, mi}"""
    rows = []
    for chunk in re.split(r'<div class="calendar-cell', page or '')[1:]:         # one day each
        cell = re.match(r'[^>]*data-time="(\d{4})-(\d{1,2})-(\d{1,2})"[^>]*>', chunk)
        if not cell:
            continue
        y, mo, d, body = int(cell.group(1)), int(cell.group(2)), int(cell.group(3)), chunk
        for li in re.findall(r'<li class="show"[^>]*>(.*?)</li>', body, re.S):
            href = re.search(r'href="([^"]+)"', li)
            if not href:
                continue
            url = _html.unescape(href.group(1))
            slug = re.search(r'/spettacolo/([^/]+)/?', url)
            cat = re.search(r'class="category">(.*?)</div>', li, re.S)
            title = re.search(r'class="title">(.*?)</div>', li, re.S)
            for hh, mi in re.findall(r'class="time">\s*(\d{1,2})[:.](\d{2})', li):
                rows.append({'slug': slug.group(1) if slug else url, 'url': url,
                             'title': clean(title.group(1)) if title else '', 'category': clean(cat.group(1)) if cat else '',
                             'y': y, 'mo': mo, 'd': d, 'hh': int(hh), 'mi': int(mi)})
    return rows


# ---------------------------------------------------------------------------
# show pages
# ---------------------------------------------------------------------------

def parse_show(page):
    h = page or ''
    title = re.search(r'<h1[^>]*>(.*?)</h1>', h, re.S)
    category = re.search(r'class="parent-category"[^>]*>(.*?)</a>', h, re.S)
    subtitle = re.search(r'<div class="subtitle">(.*?)</div>', h, re.S)
    # places and dates: one wrapper per place
    dates = []
    for wrapper in re.split(r'<div class="show-dates-wrapper">', h)[1:]:
        wrapper = re.split(r'wp-block-buttons|<h2|</main>', wrapper)[0]
        venue = re.search(r'class="show-venue[^"]*">.*?<a[^>]*>(.*?)</a>', wrapper, re.S)
        venue = clean(venue.group(1)) if venue else ''
        for sd in re.split(r'<div class="show-date ', wrapper)[1:]:
            m = re.search(r'icon-calendar"></span>\s*[a-zì]+\s+(\d{1,2})\s+([a-z]+)', sd)
            t = re.search(r'icon-time"></span>\s*(\d{1,2})[:.](\d{2})', sd)
            note = re.search(r'<b>(.*?)</b>', sd, re.S)
            if m and month_number(m.group(2)):
                dates.append({'d': int(m.group(1)), 'mo': month_number(m.group(2)),
                              'time': (int(t.group(1)), int(t.group(2))) if t else None,
                              'note': clean(note.group(1)) if note else '', 'venue': venue})
    # credits: the block between the first section heading and the dates column
    start = h.find('wp-block-heading alignwide')
    stop = h.find('show-dates-wrapper', start)
    block = h[start:stop] if start >= 0 and stop > start else ''
    block = re.sub(r'(?is)<div class="toggable-content.*?</div>\s*</div>', ' ', block)
    block = re.sub(r'(\b[A-ZÀ-Ý])<strong>([a-zà-ÿ])', r'<strong>\1\2', block)     # 'viola M<strong>artin Stegner'
    parsed = parse_block(paragraphs(block), clean(title.group(1)) if title else '')
    credits = all_credits(parsed['credits'])
    cast = []
    for role, name in re.findall(r'<div class="text">\s*(.*?)<br\s*/?>\s*<b>(.*?)</b>', h, re.S):
        role, name = clean(role), clean(name)
        if not name:
            continue
        r = role_en(role) or role
        if r in ('Orchestra', 'Choir', 'Ensemble'):
            cast.extend(split_groups(name) or [(r, name)])
        else:
            cast.append((r, name))
    sub = clean(subtitle.group(1)) if subtitle else ''
    if not credits and not cast and sub:
        cast = split_groups(sub)                         # 'Filarmonici di Busseto'
    ticket = re.search(r'class="wp-block-button__link[^"]*" href="(https?://[^"]*vivaticket[^"]*)"', h)
    return {'title': clean(title.group(1)) if title else '', 'category': clean(category.group(1)) if category else '',
            'subtitle': clean(subtitle.group(1)) if subtitle else '', 'dates': dates,
            'credits': _order(credits + cast), 'program': parsed['program'],
            'ticket': _html.unescape(ticket.group(1)) if ticket else None}


def _order(credits):
    lead = [c for c in credits if c[0] in ('Conductor', 'Director', 'Choreographer')]
    return lead + [c for c in credits if c not in lead]


def _city(venue):
    m = _TOWN_RE.search(venue or '')
    if not m:
        return CITY
    town = m.group(1)
    return _TOWN_EN.get(town.lower(), town[:1].upper() + town[1:])


def _type(category, credits, title, program):
    """-> (type, skip reason)"""
    c = fold(category)
    roles = {r for r, _ in credits}
    std = {'Conductor', 'Director', 'Choreographer', 'Orchestra', 'Choir', 'Ensemble', 'Chorus master', 'Performer'}
    characters = [r for r in roles if r not in std and not role_en(r, characters=False)]
    if 'danza' in c or 'balletto' in c:
        live = 'Orchestra' in roles or re.search(r'(?i)orchestr', title)
        return ('orchestral', None) if live else (None, 'dance without live music')
    if not credits:
        return None, 'no performers listed'
    if c == 'opera' or len(characters) >= 2:
        return 'vocal-opera', None
    return concert_type(title, credits, program), None


# ---------------------------------------------------------------------------
# fetch
# ---------------------------------------------------------------------------

def fetch():
    today = today_zurich()
    rows, empty = [], 0
    y, m = today.year, today.month
    for i in range(MONTHS_AHEAD):
        if requests_left() <= 0:
            log.warning('teatro_regio_parma: request cap reached in the calendar at %d-%02d', y, m)
            break
        try:
            month_rows = parse_month(get(MONTH_URL.format(y=y, m=m)))
        except FetchError as err:
            if i == 0:
                raise
            log.warning('teatro_regio_parma: month %d-%02d failed: %s', y, m, err)
            month_rows = None
        if month_rows is not None:
            month_rows = [r for r in month_rows if (r['y'], r['mo']) == (y, m)]
            rows.extend(month_rows)
            empty = 0 if month_rows else empty + 1
            if empty >= 3:
                break
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)

    cands, skipped, seen = [], {}, set()
    for r in rows:
        why = None
        if fold(r['category']) in _SKIP_CATEGORIES:
            why = 'family/school/fringe series'
        elif _SKIP_TITLE_RE.search(r['title']):
            why = 'rehearsal/talk/exhibition'
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
        cands.append({'row': r, 'start': start, 'sid': sid})
    if skipped:
        log.info('teatro_regio_parma: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    by_slug = {}
    for c in cands:
        by_slug.setdefault(c['row']['slug'], []).append(c)
    shows, prev_of, order = {}, {}, []
    for slug, dates in by_slug.items():
        prevs = {c['sid']: previous_event(event_id(KEY, c['sid']), c['start'], title=None) for c in dates}
        complete = all(p and p.get('venueName') for p in prevs.values())
        prev_of.update({k: p for k, p in prevs.items() if p})
        first = min(c['start'] for c in dates)
        if not complete:
            order.append((0, first, slug))
        elif refresh_due(slug, first, near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            order.append((1, first, slug))
    order.sort()
    fetched = 0
    for _, _, slug in order:
        if requests_left() <= 0:
            break
        try:
            shows[slug] = parse_show(get(by_slug[slug][0]['row']['url']))
        except BudgetExceeded as err:
            log.warning('teatro_regio_parma: stopped reading show pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('teatro_regio_parma %s: show page failed: %s', slug, err)
            continue
        fetched += 1
    log.info('teatro_regio_parma: %d dates, %d shows; %d show page(s) read', len(cands), len(by_slug), fetched)

    events, skipped_after = [], set()
    for c in cands:
        r = c['row']
        s = shows.get(r['slug'])
        if s is None:
            p = prev_of.get(c['sid'])
            if p:
                events.append(p)                         # unchanged since the previous feed
            continue
        match = [x for x in s['dates'] if (x['d'], x['mo']) == (r['d'], r['mo'])
                 and (x['time'] is None or x['time'] == (r['hh'], r['mi']))] or \
                [x for x in s['dates'] if (x['d'], x['mo']) == (r['d'], r['mo'])]
        info = match[0] if match else {'venue': (s['dates'][0]['venue'] if s['dates'] else ''), 'note': ''}
        if _SKIP_NOTE_RE.search(info['note']):
            continue                                     # 'Prova Aperta', 'Prova Under30'
        kind, why = _type(s['category'] or r['category'], s['credits'], s['title'] or r['title'], s['program'])
        if why:
            skipped_after.add((r['slug'], why))
            continue
        program = s['program']
        if program and all(not w for _, w in program) and len(program) == 1:
            if kind == 'vocal-opera':                    # 'Musica <b>Giuseppe Verdi</b>' -> the opera itself
                program = [(program[0][0], s['title'] or r['title'])]
            elif s['subtitle'] and fold(s['subtitle']) != fold(program[0][0]):
                program = [(program[0][0], s['subtitle'])]    # a ballet: 'Il lago dei cigni'
        venue = info['venue'] or 'Teatro Regio di Parma'
        title = s['title'] or r['title']
        if title.isupper() and len(title) > 3:
            title = r['title'] if not r['title'].isupper() else title.title()
        try:
            events.append(make_event(
                KEY, c['sid'], title, c['start'], city=_city(venue), venueName=venue, type=kind,
                credits=s['credits'], program=program, ticketUrl=s['ticket'], url=r['url'],
                status='cancelled' if looks_cancelled(title) or looks_cancelled(info['note']) else None))
        except ValueError as err:
            log.warning('teatro_regio_parma %s: skipped: %s', c['sid'], err)
    for slug, why in sorted(skipped_after):
        log.info('teatro_regio_parma %s: %s, skipped', slug, why)
    return events
