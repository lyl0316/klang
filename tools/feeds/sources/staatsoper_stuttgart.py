"""Staatsoper Stuttgart: opera and the Staatsorchester's concerts from the house calendar (HTML).

    https://www.staatsoper-stuttgart.de/spielplan/kalender/            month list (filter links)
    https://www.staatsoper-stuttgart.de/spielplan/kalender/YYYY-MM/    one month of performances
    https://www.staatsoper-stuttgart.de/spielplan/kalender/…/<slug>/<id>/
                                                                       one page per performance

Each month page lists the performances as schema.org Event microdata: ``startDate``
("2026-11-01T18:00:00", Stuttgart local time, checked against the "18:00 – 21:15" printed
next to it), the title and link, a category icon (oper, konzert, junge-oper for JOiN, none for
tours and talks), the composer line ("von Gaetano Donizetti", "Werke von …"), the genre and
the room as the last text line ("Opernhaus", "Liederhalle, Beethovensaal", "Nord"),
attributes (Premiere, Familienvorstellung, Schulvorstellung …) and the ticket link. About
10 month requests cover the season.

The performance page adds that evening's cast ("Besetzung": conductor, director, singers by
character, Staatsorchester, Staatsopernchor) and, for concerts, the works ("<strong>Ferruccio
Busoni</strong> Berceuse élégiaque op. 42<br>…"). The cast is per performance, so pages are
read incrementally (cap 150): a performance the previous feed already has with its cast
(same id, start and title) keeps it; the requests left go first to one performance of each
production not read yet, then to performances still without a cast, soonest first, then to
performances in the next two weeks and a fixed share of the others (each about once a week).
Production facts (works, director, orchestra, chorus) are shared by all dates; the conductor
and singers only by the date read.

Skipped: the JOiN youth programme, guided tours ("Einblicke"), introductions and matinees,
open rehearsals, readings, talks and podcasts, the costume sale, pop and hip-hop formats,
school and family performances, children's concerts. The Stuttgart Ballet has its own site
and is not in this calendar.

The imprint forbids commercial reuse of the site's texts and pictures; Klang takes facts only
(date, time, room, performers, works, links). Checked against the website on 29 Oct 2026:
337 performances listed (incl. past days of October), 154 kept; JOiN and tours left out.
"""
from __future__ import annotations

import html as _html
import re
from datetime import datetime

from common import (BudgetExceeded, FetchError, clean, event_id, get, infer_type, log, looks_cancelled, make_event,
                    previous_event, refresh_due, requests_left, today_zurich)

from ._consent import looks_like_person
from ._south_germany import credit, dedupe_credits, in_window, local_iso, skip_title, town

KEY = 'staatsoper_stuttgart'
NAME = 'Staatsoper Stuttgart'
SITE = 'https://www.staatsoper-stuttgart.de/'
ATTRIBUTION = 'Source: Staatsoper Stuttgart (staatsoper-stuttgart.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 150             # ~11 calendar pages, the rest for performance pages
TIME_LIMIT = 900
REFRESH_NEAR_DAYS = 14
REFRESH_EVERY_DAYS = 7

BASE = 'https://www.staatsoper-stuttgart.de'
CALENDAR = BASE + '/spielplan/kalender/'
HOUSE = 'Staatsoper Stuttgart'
ORCHESTRA = 'Staatsorchester Stuttgart'
MAX_MONTHS = 16

_SKIP_RE = re.compile(r'(?i)i did it my way|ganze familie|für kinder|kinderkonzert|tee ?& ?techno|höchstkultur')


def _text(fragment):
    return clean(_html.unescape(fragment or ''))


# ---------------------------------------------------------------------------
# calendar
# ---------------------------------------------------------------------------

def _months(page_html):
    """Month pages linked from the calendar filter, from the current month on."""
    today = today_zurich()
    out = []
    for y, m in re.findall(r'href="/spielplan/kalender/(\d{4})-(\d{2})/"', page_html or ''):
        if (int(y), int(m)) >= (today.year, today.month) and f'{y}-{m}' not in out:
            out.append(f'{y}-{m}')
    return sorted(out)[:MAX_MONTHS]


def parse_month(page_html):
    rows = []
    for chunk in re.split(r'<div class="performance performance--', page_html or '')[1:]:
        pid = re.search(r'id="(\d{4})-(\d{2})-(\d{2})-p(\d+)"', chunk)
        start = re.search(r'itemprop="startDate" content="(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})', chunk)
        link = re.search(r'<a href="(/spielplan/kalender/[^"]+)" itemprop="url"><span itemprop="name">(.*?)</span>',
                         chunk, re.S)
        if not (pid and start and link):
            continue
        y, mo, d, hh, mi = (int(x) for x in start.groups())
        printed = re.search(r'performance__time">(?:<meta[^>]*>)?\s*(\d{1,2}):(\d{2})(?:\s*–\s*(\d{1,2}):(\d{2}))?', chunk)
        if printed and (int(printed.group(1)), int(printed.group(2))) != (hh, mi):
            log.warning('%s %s: startDate %02d:%02d but the page shows %s:%s; using the page', KEY, pid.group(4),
                        hh, mi, printed.group(1), printed.group(2))
            hh, mi = int(printed.group(1)), int(printed.group(2))
        items = [_text(x) for x in re.findall(r'<div class="performance__textitem">(.*?)</div>\s*(?=<div class="perf'
                                              r'ormance__textitem"|</div>)', chunk, re.S)]
        author = re.search(r'<div class="--color-gray1">(.*?)</div>', chunk, re.S)
        sub = re.search(r'<div class="performance__subtitle">(.*?)</div>', chunk, re.S)
        attrs = [_text(x) for x in re.findall(r'<div class="performance__attributes?">(.*?)</div>', chunk, re.S)]
        ticket = re.search(r'<a href="(https://ticket\.[^"]+)"[^>]*class="performance__ticketlink"', chunk)
        state = re.findall(r'performance__ticketlink[^"]*"[^>]*>(.*?)</', chunk, re.S)
        end = (int(printed.group(3)), int(printed.group(4))) if printed and printed.group(3) else None
        place = items[-1] if items and not items[-1].startswith(('von ', 'Werke ')) else ''
        rows.append({
            'id': pid.group(4), 'url': BASE + _html.unescape(link.group(1)),
            'slug': link.group(1).rstrip('/').split('/')[-2],
            'title': _text(link.group(2)), 'day': datetime(y, mo, d).date(), 'start': (hh, mi), 'end': end,
            'cats': re.findall(r'performance__categoryicon--([a-z0-9-]+)', chunk),
            'author': _text(author.group(1)) if author else '',
            'sub': _text(sub.group(1)) if sub else '',
            'items': items, 'place': place, 'attrs': attrs,
            'ticket': _html.unescape(ticket.group(1)) if ticket else None,
            'state': [_text(s) for s in state],
        })
    return rows


def _read_calendar():
    first = get(CALENDAR)                                   # FetchError propagates
    rows = {r['id']: r for r in parse_month(first)}
    months = _months(first)
    n = 1
    for m in months:
        if requests_left() <= 0:
            log.warning('%s: request cap reached in the calendar at %s', KEY, m)
            break
        try:
            page = get(f'{CALENDAR}{m}/')
        except FetchError as err:
            log.warning('%s: month %s failed: %s', KEY, m, err)
            continue
        n += 1
        for r in parse_month(page):
            rows.setdefault(r['id'], r)
    log.info('%s: %d calendar request(s), %d performances', KEY, n, len(rows))
    return list(rows.values())


# ---------------------------------------------------------------------------
# performance pages
# ---------------------------------------------------------------------------

def _lines(block):
    """'Role <b><a>Name</a>, <a>Name</a></b><br />' lines -> [(role, [names])]"""
    out = []
    for line in re.split(r'<br\s*/?>', block or ''):
        m = re.match(r'(.*?)<b>(.*)</b>', line.strip(), re.S)
        if not m:
            continue
        names = [_text(x) for x in re.split(r'</a>\s*,|</span>\s*,|\s/\s', m.group(2))]
        out.append((_text(m.group(1)), [n.strip(' ,') for n in names if n.strip(' ,')]))
    return out


def parse_detail(page_html, perf_id):
    """-> {'cast': [(role, [names])], 'works': [(composer, title)], 'composers': [names]}"""
    h = page_html or ''
    out = {'cast': [], 'works': [], 'composers': []}
    hook = h.find(f'js-marker-cast-and-crew-hook" data-performance-id="{perf_id}"')
    if hook >= 0:
        seg = h[hook:]
        seg = seg[:seg.find('nextperformances__bottomlink')] if 'nextperformances__bottomlink' in seg else seg[:20000]
        for cls in ('nextperformances__crew', 'nextperformances__cast', 'nextperformances__ensemble'):
            m = re.search(r'<div class="%s">(.*?)</div>' % cls, seg, re.S)
            if m:
                out['cast'].extend(_lines(m.group(1)))
        rest = re.sub(r'(?s)<div class="nextperformances__(?:crew|cast)">.*?</div>', '', seg)
        for grp in re.findall(r'<b>(.*?)</b>', rest, re.S):            # a group line without a role
            names = [_text(x) for x in re.split(r'</a>\s*,', grp)]
            out['cast'].append(('', [n for n in names if n]))
    author = re.search(r'<div class="production__author">(.*?)</div>', h, re.S)
    if author and re.match(r'(?i)\s*werke von', _text(author.group(1))):
        out['composers'] = [c.strip() for c in re.split(r',\s*|\s+und\s+', re.sub(r'(?i)^\s*werke von\s*', '',
                                                                                  _text(author.group(1)))) if c.strip()]
    left = h.split('<div class="twocol__left production__left">', 1)[1][:20000] if 'production__left' in h else ''
    rich = next((x for x in re.findall(r'<div class="richtext[^"]*">(.*?)</div>', left, re.S) if '<strong>' in x), '')
    if rich:
        for line in re.split(r'<br\s*/?>', rich):
            m = re.match(r'\s*<strong>(.*?)</strong>(.*)$', line, re.S)
            if not m:
                if out['works'] and _text(line):
                    break                                   # the description starts
                continue
            comp, work = _text(m.group(1)), _text(m.group(2))
            if looks_like_person(comp, max_words=5) and work:
                out['works'].append((comp, work))
    return out


# ---------------------------------------------------------------------------
# rows -> events
# ---------------------------------------------------------------------------

def _kind(r):
    if 'junge-oper' in r['cats']:
        return None
    if 'konzert' in r['cats']:
        return 'concert'
    if 'oper' in r['cats']:
        if re.search(r'(?i)konzert|lieder|orchester', r['title']) or any(
                re.search(r'(?i)\bkonzert\b', x) for x in r['items'] + [r['sub']]):
            return 'concert'
        return 'opera'
    return None


_CHAMBER_RE = re.compile(r'(?i)kammerkonzert|lunchkonzert')


def _venue(place):
    """-> (venueName, city or 'abroad')"""
    p = clean(place)
    if not p or len(p) > 60 or re.search(r'(?i)diverse|siehe programm', p):
        return None, 'Stuttgart'
    low = p.lower()
    if low.startswith('liederhalle'):
        return 'Liederhalle Stuttgart' + p[len('Liederhalle'):], 'Stuttgart'
    if low.startswith(('opernhaus', 'nord', 'foyer nord')) or low in ('staatstheater stuttgart',):
        return f'{HOUSE}, {p}', 'Stuttgart'
    return p, (town(p) or 'Stuttgart')


def _composer(r):
    m = re.match(r'(?i)^(?:von|musik von)\s+(.+)$', r['author'])
    if m and looks_like_person(m.group(1), max_words=5) and not re.search(r'\bund\b|,', m.group(1)):
        return m.group(1)
    return None


def _credits(d, kind, *, production_only=False):
    out = []
    for role_text, names in d.get('cast') or []:
        for n in names:
            if not role_text:
                low = n.lower()
                if re.search(r'musiker|mitglieder', low):
                    out.append(('Choir' if 'chor' in low else 'Ensemble', n))
                elif 'orchester' in low:
                    out.append(('Orchestra', n))
                elif 'chor' in low:
                    out.append(('Choir', n))
                continue
            if re.fullmatch(r'(?i)(?:kinder|opern|extra)?chor(?:\s*(?:&|und)\s*(?:kinder|extra)?chor)*|chorleitung|'
                            r'choreinstudierung|einstudierung (?:kinder)?chor', role_text.strip(' :')):
                c = ('Chorus master', n)                    # 'Chor <b>Bernhard Moncado</b>': the chorus master
            else:
                c = credit(n, role_text, opera=True)
            if not c:
                continue
            if production_only and c[0] not in ('Director', 'Choreographer', 'Orchestra', 'Choir'):
                continue
            out.append(c)
    return out


def fetch():
    rows = _read_calendar()
    cands, skipped = [], {}

    def skip(why):
        skipped[why] = skipped.get(why, 0) + 1

    for r in rows:
        if not in_window(r['day']):
            skip('outside the window')
            continue
        kind = _kind(r)
        if not kind:
            skip('JOiN / tours / talks')
            continue
        text = ' '.join([r['title'], r['sub'], r['author']] + r['items'])
        if skip_title(r['title'], r['sub'], *r['attrs']) or _SKIP_RE.search(text):
            skip('children / talk / not classical')
            continue
        venue, city = _venue(r['place'])
        if city == 'abroad':
            skip('abroad')
            continue
        r.update(kind=kind, venue=venue, city=city, startIso=local_iso(r['day'], *r['start']),
                 endIso=local_iso(r['day'], *r['end']) if r['end'] else None)
        cands.append(r)
    if skipped:
        log.info('%s: skipped %s', KEY, ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    for r in cands:
        prev = previous_event(event_id(KEY, r['id']), r['startIso'], title=r['title'])
        if prev and (prev.get('credits') or prev.get('program')):
            r['prev'] = prev
    productions = {}
    for r in cands:
        productions.setdefault(r['slug'], []).append(r)
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
        if requests_left() <= 0:
            break
        try:
            d = parse_detail(get(r['url']), r['id'])
        except BudgetExceeded as err:
            log.warning('%s: stopped reading performance pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: performance page failed: %s', KEY, r['id'], err)
            continue
        read += 1
        r['detail'] = d
        details.setdefault(r['slug'], d)
    log.info('%s: %d performance page(s) read; %d performances reuse an earlier cast; %d still without a cast',
             KEY, read, sum(1 for r in cands if r.get('prev') and not r.get('detail')),
             sum(1 for r in cands if not r.get('prev') and not r.get('detail')))

    events = []
    for r in cands:
        d = r.get('detail')
        shared = d or details.get(r['slug'])
        kind = r['kind']
        credits, program = [], []
        if d:
            credits = _credits(d, kind)
        elif r.get('prev'):
            credits = [(x.get('role'), x.get('name')) for x in r['prev'].get('credits') or []]
            program = [(x.get('composer') or '', x.get('title') or '') for x in r['prev'].get('program') or []]
        elif shared:
            credits = _credits(shared, kind, production_only=True)
        if not program:
            if shared and shared['works']:
                program = shared['works']
            elif _composer(r):
                program = [(_composer(r), r['title'] if kind == 'opera' else '')]
            elif shared and shared['composers']:
                program = [(c, '') for c in shared['composers']]
            else:
                m = re.match(r'(?i)^werke von\s+(.+)$', r['author'])
                if m:
                    program = [(c.strip(), '') for c in re.split(r',\s*|\s+und\s+', m.group(1)) if c.strip()]
        credits = dedupe_credits(credits)
        chamber = bool(_CHAMBER_RE.search(r['title']))
        if chamber:
            credits = [(rl, n) for rl, n in credits if not (rl == 'Orchestra' and n == ORCHESTRA)]
        if kind == 'opera' and not any(rl == 'Orchestra' for rl, _ in credits):
            credits.append(('Orchestra', ORCHESTRA))
        ctype = 'vocal-opera' if kind == 'opera' else infer_type(r['title'], credits, program, r['sub'],
                                                                 solo_rule=True)
        if kind == 'concert' and re.search(r'(?i)liedkonzert|liederabend|nacht der lieder', r['title']):
            ctype = 'recital'
        elif chamber:
            ctype = 'chamber'
        series = re.sub(r'^\d+\.\s*', '', r['title']) if re.match(r'^\d+\.\s*\w*konzert$', r['title']) else None
        cancelled = looks_cancelled(r['title']) or any(looks_cancelled(x) for x in r['attrs'] + r['state'])
        try:
            events.append(make_event(
                KEY, r['id'], r['title'], r['startIso'], end=r['endIso'], city=r['city'], venueName=r['venue'],
                type=ctype, series=series or (r['sub'] if kind == 'concert' and len(r['sub']) <= 60 else None),
                credits=credits, program=program, ticketUrl=r['ticket'], url=r['url'],
                status='cancelled' if cancelled else None))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, r['id'], err)
    return events
