"""Komische Oper Berlin (playing at the Schillertheater while its house is rebuilt): opera,
operetta, musical theatre and concerts from the house's own calendar.

    https://www.komische-oper-berlin.de/spielplan/kalender/YYYY-MM/                 one month
    https://www.komische-oper-berlin.de/spielplan/kalender/YYYY-MM/<slug>/<id>/     one performance

The calendar is read month by month, from the current month to the last month the page offers
(``data-load-forward-until``; about 9 requests). Every performance has an id, the start
(``itemprop="startDate"``, Berlin local time; checked against the website on 29 Oct 2026:
"19:00" shown = "T19:00:00"), the title, the composer (``performance__author``), the stage and
labels (Premiere, Sinfoniekonzert, Jung für alle …).

The performance's own page names, in its meta description, the work line ("Tragedia
giapponese in drei Akten", "Kammerkonzert 4") and that evening's cast ("Besetzung: Cio-Cio-San:
Gloria Jieun Choi, …, Musikalische Leitung: Yi-Chen Lin"). Only those facts are taken. The
pages cost one request per performance and are read incrementally: a performance the previous
feed already has with its cast (same id, start and title) keeps it; the requests left go to
performances without a cast, soonest first, then to the next two weeks and a fixed share of
the others (about weekly).

The server refused about a third of the connections during a test run on 29 Oct 2026 (also
at a low rate, and once for a robots.txt request), so this reader stays small: at most 70
requests per run and 4 extra seconds between performance pages; common.get retries a refused
connection twice. A first run covers the calendar and about 60 performance pages; the rest are
filled in on later runs.

Skipped: guided tours (Führung …), introductions and matinees (Einführungsmatinee), workshops,
talks, parties and lounges, children's workshops and school formats. Kept: full staged
children's operas on the main stage with the house orchestra (e.g. Pippi Langstrumpf), like
the other readers.
"""
from __future__ import annotations

import html as _html
import re

from common import (BudgetExceeded, FetchError, clean, event_id, get, guess_type, infer_type, log, looks_cancelled,
                    make_event, previous_event, refresh_due, requests_left, today_zurich)

from ._berlin import Spacer, abroad, berlin_iso, credit, german_town, group_of, is_pop, role_de, skip_title, venue_name

KEY = 'komische_oper_berlin'
NAME = 'Komische Oper Berlin'
SITE = 'https://www.komische-oper-berlin.de/'
ATTRIBUTION = 'Source: Komische Oper Berlin (komische-oper-berlin.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 70             # the server refuses some connections under load: stay small and slow
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 14
REFRESH_EVERY_DAYS = 7
PAGE_GAP = 4.0                # seconds between performance pages (on top of common.get's spacing)

BASE = 'https://www.komische-oper-berlin.de'
MONTH = BASE + '/spielplan/kalender/{ym}/'
MAX_MONTHS = 18

_SKIP_RE = re.compile(r'einführungsmatinee|matinee zu|after show|lounge|workshop|wunderkammer|staatsballett|'
                      r'tag der offenen|kostümverkauf|spielzeitpräsentation|gala\b|kinderchor-workshop|'
                      r'für kinder|kita|schul|kuscheltier|singt mit|mitsing|peter und der wolf|kinderkonzert', re.I)
_OPERA_RE = re.compile(r'oper|operette|opéra|opera|tragedia|dramma|melodram|singspiel|musical|musiktheater|'
                       r'comédie|commedia|zarzuela|revue|oratorium', re.I)
_CONCERT_RE = re.compile(r'konzert|liederabend|recital|kammermusik', re.I)
# KO's own groups that a cast may name as a role ('Orchester: Orchester der Komischen Oper Berlin')
_GROUP_ROLES = {'orchester': 'Orchestra', 'chor': 'Choir', 'chorsolisten': 'Choir', 'kinderchor': 'Choir',
                'vokalensemble': 'Choir', 'ensemble': 'Ensemble'}


def parse_month(page_html):
    """-> (performances, last month offered 'YYYY-MM' or None)."""
    out = []
    h = page_html or ''
    for part in re.split(r'<div class="performance performance--', h)[1:]:
        start = re.search(r'itemprop="startDate" content="([^"]+)"', part)
        link = re.search(r'class="performance__(?:title|smallheadline)".*?<a href="([^"]+)"[^>]*>(.*?)</a>', part, re.S)
        if not (start and link):
            continue
        href = _html.unescape(link.group(1))
        pid = re.search(r'/(\d+)/?$', href)
        if not pid:
            continue
        author = re.search(r'performance__author">(.*?)</div>', part, re.S)
        loc = re.search(r'performance__location">(.*?)</div>', part, re.S)
        attrs = re.search(r'<div class="performance__attributes">(.*?)</div>\s*</div>', part, re.S)
        ticket = re.search(r'performance__ticketbutton[^"]*">\s*<a href="([^"]+)"', part)
        out.append({
            'id': pid.group(1),
            'start_raw': start.group(1),
            'title': clean(link.group(2)),
            'small': 'performance__smallheadline' in part[:part.find(link.group(0)) + 60] if link else False,
            'url': BASE + href if href.startswith('/') else href,
            'composer': clean(author.group(1)) if author else '',
            'place': clean(loc.group(1)) if loc else '',
            'labels': [clean(x) for x in re.findall(r'<div class="attribute[^"]*">(.*?)</div>', attrs.group(1), re.S)]
            if attrs else [],
            'ticket': BASE + _html.unescape(ticket.group(1)) if ticket and ticket.group(1).startswith('/') else None,
            'classes': part[:200],
        })
    until = re.search(r'data-load-forward-until="(\d{4}-\d{2})', h)
    return out, (until.group(1) if until else None)


def parse_performance(page_html):
    """-> {'work': work line, 'cast': [(role text, name)]} from a performance page's meta description."""
    m = re.search(r'<meta name="description" content="([^"]*)"', page_html or '')
    desc = clean(_html.unescape(m.group(1))) if m else ''
    desc = re.sub(r'(\w)[:*_/]in(nen)?\b', r'\1*in\2', desc)          # 'Solist:innen' -> 'Solist*innen'
    head, _, cast_text = desc.partition('Besetzung:')
    cast = []
    for chunk in re.split(r',\s*(?=[^,:]{1,80}:\s)', cast_text):
        role, sep, names = chunk.partition(':')
        if not sep:
            continue
        for n in re.split(r'\s*,\s*', names):
            n = re.sub(r'\s*\([^)]*\)', '', n).strip()
            if n:
                cast.append((role.strip(), n))
    return {'work': head.strip(' ,'), 'cast': cast}


def _credits(cast, opera):
    out, groups = [], set()
    for role, name in cast:
        r = clean(role)
        f = r.lower()
        if f in ('darsteller', 'darstellerin', 'darsteller*innen', 'tänzer', 'tänzerin', 'tänzer*innen', 'statisterie',
                 'spielleitung', 'chöre', 'kinderchöre', 'geräuschemacher', 'komparserie') or name.lower() == f:
            continue                                       # actors, dancers, chorus masters, staff
        if f in _GROUP_ROLES:
            out.append((_GROUP_ROLES[f], name))           # the site's own word: 'Chor: Chorsolisten der …'
            continue
        if role_de(r) is None and group_of(r):
            if r not in groups:                            # 'camerata 415 berlin: member, member …'
                groups.add(r)
                out.append((group_of(r), r))
            continue
        c = credit(r, name, opera=opera)
        if c:
            out.append(c)
    return out


def _type(p, credits, work):
    text = f"{p['title']} {work} {' '.join(p['labels'])}"
    roles = {r for r, _ in credits}
    if _OPERA_RE.search(work) and not _CONCERT_RE.search(work):
        return 'vocal-opera'
    if re.search(r'liederabend|recital', text, re.I):
        return 'recital'
    if re.search(r'kammerkonzert|kammermusik', text, re.I):
        return 'chamber'
    if re.search(r'sinfoniekonzert|neujahrskonzert|orchesterkonzert', text, re.I) or 'Orchestra' in roles:
        return 'orchestral'
    if p['composer'] and not _CONCERT_RE.search(text):
        return 'vocal-opera'                               # a staged work by a named composer
    return guess_type(text) or infer_type(p['title'], credits, None)


def _months():
    t = today_zurich()
    y, m = t.year, t.month
    for _ in range(MAX_MONTHS):
        yield f'{y:04d}-{m:02d}'
        m += 1
        if m > 12:
            y, m = y + 1, 1


def _read_calendar():
    perfs, until, n = {}, None, 0
    for ym in _months():
        if until and ym > until:
            break
        if requests_left() <= 10:
            log.warning('%s: calendar stopped at %s (request cap)', KEY, ym)
            break
        try:
            page = get(MONTH.format(ym=ym))
        except BudgetExceeded as err:
            log.warning('%s: stopped: %s', KEY, err.reason)
            break
        except FetchError as err:
            if n == 0:
                raise
            log.warning('%s: month %s failed: %s', KEY, ym, err)
            if getattr(err, 'status', None) == 404:
                break
            continue
        n += 1
        items, last = parse_month(page)
        until = until or last
        for p in items:
            perfs.setdefault(p['id'], p)
    log.info('%s: %d month page(s), %d performances', KEY, n, len(perfs))
    return list(perfs.values())


def fetch():
    perfs = _read_calendar()
    skipped, cands = {}, []
    today = today_zurich().isoformat()

    def skip(why, p):
        skipped[why] = skipped.get(why, 0) + 1
        log.debug('%s: skipped (%s): %s %s', KEY, why, p['start_raw'], p['title'])

    for p in perfs:
        text = f"{p['title']} {' '.join(p['labels'])}"
        if skip_title(p['title']) or _SKIP_RE.search(text):
            skip('tour / talk / workshop / ballet guest', p)
            continue
        if is_pop(text) and not p['composer']:
            skip('pop', p)
            continue
        if p['start_raw'][:10] < today:
            continue
        place = p['place']
        city = 'Berlin'
        if place and abroad(place):
            skip('abroad', p)
            continue
        town = german_town(place)
        if town and town != 'Berlin' and not re.search(r'(?i)berlin|schillertheater|unter den linden', place):
            city = town
        try:
            p['start'] = berlin_iso(p['start_raw'])
        except ValueError:
            skip('no time', p)
            continue
        p['city'] = city
        p['prev'] = previous_event(event_id(KEY, p['id']), p['start'], title=p['title'])
        p['page'] = None
        cands.append(p)

    def tier(p):
        if not (p['prev'] and p['prev'].get('credits')):
            return 0
        if refresh_due(p['id'], p['start'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    order = sorted((p for p in cands if tier(p) is not None), key=lambda p: (tier(p), p['start']))
    read, spacer = 0, Spacer(PAGE_GAP)
    for p in order:
        if requests_left() <= 0:
            break
        spacer.wait()
        try:
            p['page'] = parse_performance(get(p['url']))
            read += 1
        except BudgetExceeded as err:
            log.warning('%s: stopped reading performance pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: performance page failed: %s', KEY, p['id'], err)

    events = []
    for p in cands:
        page, prev = p['page'], p['prev']
        work = (page or {}).get('work') or ''
        if re.search(r'(?i)\bfür kinder\b|workshop|führung|einführung', work):
            skip('children / workshop / tour', p)
            continue
        opera = bool(_OPERA_RE.search(work)) or (bool(p['composer']) and not _CONCERT_RE.search(f"{p['title']} {work}"))
        if page:
            credits = _credits(page['cast'], opera)
        elif prev:
            credits = [(c.get('role'), c.get('name')) for c in prev.get('credits') or []]
        else:
            credits = []
        program = [(p['composer'], p['title'])] if p['composer'] and opera else []
        cancelled = looks_cancelled(p['title']) or bool(re.search(r'is-cancel|abgesagt', p['classes'], re.I))
        try:
            events.append(make_event(
                KEY, p['id'], p['title'], p['start'], city=p['city'], venueName=venue_name(p['place']) or 'Komische Oper Berlin',
                type=_type(p, credits, work) if (page or not prev) else (prev.get('type') or _type(p, credits, work)),
                credits=credits, program=program, ticketUrl=p['ticket'], url=p['url'],
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, p['id'], err)
    if skipped:
        log.info('%s: skipped %s', KEY, ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    log.info('%s: %d performance page(s) read', KEY, read)
    return events
