"""Luzerner Theater: opera performances (with the Luzerner Sinfonieorchester) and dance evenings
with live orchestra.

    https://www.luzernertheater.ch/spielplan/kalender     the whole season in one page
    https://www.luzernertheater.ch/<production>           one page per production

The calendar lists every performance with its date (``id="2026-11-13"``), start and end time
("19.30 - 22.05 Uhr", Swiss local time), genre (Oper, Tanz, Schauspiel ...), title, subtitle
("Komische Oper von Gaetano Donizetti"), stage and ticket link. The production page adds the
production team (conductor, director, choreographer) and the cast; the orchestra and choir are
listed as collectives.

Kept: operas (genre "Oper") and dance evenings whose production page credits an orchestra.
Skipped: plays, musicals (My Fair Lady is filed under "Oper"), children's pieces, school and
closed performances, the Operncafé, Kostprobe and Inspiration side events, talks and parties.

Terms: the site's AGB and imprint say nothing about reusing listings; only facts are republished.
"""
from __future__ import annotations

import html as htmllib
import re
from urllib.parse import urljoin

from common import (FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime,
                    today_zurich)
from ._east import NOT_A_CONCERT, credits_from_pairs, fold, group_role, local_iso

KEY = 'luzerner_theater'
NAME = 'Luzerner Theater'
SITE = 'https://www.luzernertheater.ch/'
ATTRIBUTION = 'Source: Luzerner Theater (luzernertheater.ch)'
KIND = 'venue'
MAX_REQUESTS = 30
TIME_LIMIT = 240

BASE = 'https://www.luzernertheater.ch'
CALENDAR = BASE + '/spielplan/kalender'
STAGES = {'buhne': 'Luzerner Theater', 'box': 'Luzerner Theater, Box', 'ug': 'Luzerner Theater, UG',
          'foyer': 'Luzerner Theater, Foyer'}
SIDE_EVENTS = re.compile(r'operncafe|kostprobe|inspiration|einfuhrungsmatinee|matinee|geschl\. vorstellung|'
                         r'geschlossene vorstellung|schulvorstellung')
NOT_OPERA = re.compile(r'musical|bilderbuch|kinderoper|familienstuck|revue|schauspiel')
STAFF = {'Conductor', 'Director', 'Choreographer'}


def _items(page):
    out = []
    for blk in page.split('<!-- BEGIN spielplan_item -->')[1:]:
        day = re.search(r'\bid="(\d{4})-(\d{2})-(\d{2})"', blk)
        link = re.search(r'class="spielplan-item__link" href="([^"]+)"', blk)
        title = re.search(r'spielplan-item__title">\s*<h2>(.*?)</h2>', blk, re.S)
        if not (day and link and title):
            continue
        genre = re.search(r'genre--desktop">(.*?)</div>', blk, re.S)
        sub = re.search(r'spielplan-item__subtitle">(.*?)</div>', blk, re.S)
        times = re.search(r'spielplan-item__time">(.*?)</div>', blk, re.S)
        col1 = re.search(r'spielplan-item__col-1(.*?)spielplan-item__col-2', blk, re.S)
        stage = re.search(r'spielplan-item__stage[^>]*>(.*?)</a>', blk, re.S)
        age = re.search(r'spielplan-item__age">\s*ab\s*(\d+)', blk)
        chips = [clean(c) for c in re.findall(r'class="spielplan-item__subscription[^"]*"[^>]*>(.*?)</a>', blk, re.S)]
        ticket = re.search(r'href="(https://tickets\.luzernertheater\.ch/[^"]+)"', blk)
        prod = re.search(r'data-production-id="(\d+)"', blk)
        labels = clean(re.sub(r'(?s)<style.*?</style>|<svg.*?</svg>', ' ', col1.group(1))) if col1 else ''
        hm = re.findall(r'(\d{1,2})[.:](\d{2})', clean(times.group(1))) if times else []
        out.append({
            'ymd': tuple(int(x) for x in day.groups()), 'hm': [tuple(int(x) for x in t) for t in hm],
            'url': urljoin(BASE, htmllib.unescape(link.group(1))), 'title': clean(title.group(1)),
            'genre': clean(genre.group(1)) if genre else '', 'sub': clean(sub.group(1)) if sub else '',
            'labels': labels, 'stage': clean(stage.group(1)) if stage else '',
            'age': int(age.group(1)) if age else None, 'chips': chips, 'rest': clean(blk[-1500:]),
            'ticket': htmllib.unescape(ticket.group(1)) if ticket else None,
            'prod': prod.group(1) if prod else None,
        })
    return out


def _people(block):
    """[(label, [(name, {dates} or None)])] per cast row; a person shown with dates
    ("(09.12.2026 / 26.12.2026)") only appears on those dates."""
    rows = []
    for row in re.findall(r'<li class="cast-row">(.*?)(?:</li>|(?=<li class="cast-row">)|$)', block, re.S):
        parts = row.split('<div class="role-persons">')
        label = clean(parts[0]).rstrip(' –-')
        people = []
        for part in parts[1:] or [row]:
            dates = {'%s-%s-%s' % d[::-1] for d in re.findall(r'person-activity-date[^"]*">(\d{2})\.(\d{2})\.(\d{4})<', part)}
            bare = re.sub(r'(?s)<button\b.*?</button>|<span class="numeric date-detail">.*$|'
                          r'<span class="person-separation-comma">.*?</span>', ' ', part)
            name = re.search(r'<a\b[^>]*>(.*?)</a>', bare, re.S)
            name = clean(name.group(1) if name else bare).strip(' ,/')
            if name:
                people.append((name, dates or None))
        rows.append((label, people))
    return rows


def _on(rows, day):
    """(label, name) pairs for a performance on ``day`` ('YYYY-MM-DD')."""
    pairs = []
    for label, people in rows:
        dated = [n for n, dates in people if dates and day in dates]
        if not dated and any(dates for _, dates in people):
            dated = [n for n, dates in people if not dates]      # the alternate cast
        pairs += [(label, n) for n in (dated or [n for n, _ in people])]
    return pairs


def _details(url):
    page = get(url)
    crew = re.search(r'<ul class="production-crew-list">(.*?)</ul>', page, re.S)
    cast = re.search(r'<ul class="production-cast-list">(.*?)</ul>', page, re.S)
    groups = re.search(r'<ul class="production-collective-list">(.*?)</ul>', page, re.S)
    collective = []
    if groups:
        for name in (clean(n) for n in re.findall(r'<a\b[^>]*>(.*?)</a>', groups.group(1), re.S)):
            if name and not re.search(r'statist|komparse', fold(name)):
                collective.append((group_role(name), name))
    return {'crew': _people(crew.group(1)) if crew else [], 'cast': _people(cast.group(1)) if cast else [],
            'groups': collective}


def _credits(d, day):
    if not d:
        return []
    credits = [(r, n) for r, n in credits_from_pairs(_on(d['crew'], day)) if r in STAFF]
    # cast rows are characters ("Adina – Tania Lorenzo Castro") or dancers
    credits += [('Performer', n) for _, n in _on(d['cast'], day)]
    return credits + d['groups']


def _program(title, sub):
    if not re.search(r'oper|opera|tragedia|dramma|singspiel|operette|melodram|lirica', fold(sub)):
        return []
    m = re.search(r'\bvon\s+([A-ZÄÖÜ][^,;]+)$', sub)
    if not m:
        return []
    work = re.sub(r'\s*\[[^\]]*\]\s*', ' ', title).strip()
    return [(m.group(1).strip(), work)]


def _venue(stage):
    f = fold(stage)
    if f in STAGES:
        return STAGES[f], 'Luzern'
    if 'sudpol' in f:
        return 'Südpol', 'Kriens'
    return (stage or 'Luzerner Theater'), 'Luzern'


def fetch():
    today = today_zurich()
    keep = []
    for it in _items(get(CALENDAR)):                        # FetchError propagates
        genre, text = fold(it['genre']), fold(' '.join([it['title'], it['sub']]))
        if not it['hm'] or SIDE_EVENTS.search(fold(' '.join([it['labels'], it['rest']] + it['chips']))):
            continue
        if NOT_A_CONCERT.search(text):
            continue
        if 'oper' in genre and not NOT_OPERA.search(text) and (it['age'] or 99) > 6:
            kind = 'opera'
        elif genre == 'tanz':
            kind = 'dance'
        else:
            continue
        start = local_iso(*it['ymd'], *it['hm'][0])
        if to_zurich_datetime(start).date() < today:
            continue
        end = local_iso(*it['ymd'], *it['hm'][1]) if len(it['hm']) > 1 else None
        if end and end <= start:
            end = None
        keep.append(dict(it, kind=kind, start=start, end=end))
    keep.sort(key=lambda it: it['start'])

    details = {}
    for it in keep:
        if it['url'] in details or requests_left() <= 0:
            continue
        try:
            details[it['url']] = _details(it['url'])
        except FetchError as err:
            log.warning('%s: no details for %s: %s', KEY, it['url'], err)
            details[it['url']] = None

    events = []
    for it in keep:
        credits = _credits(details.get(it['url']), it['start'][:10])
        if it['kind'] == 'dance':
            if not any(r == 'Orchestra' for r, _ in credits):
                continue                                    # recorded music
            kind, program = 'orchestral', []
        else:
            kind, program = 'vocal-opera', _program(it['title'], it['sub'])
        venue, city = _venue(it['stage'])
        m = re.search(r'event=(\d+)', it['ticket'] or '')
        sid = m.group(1) if m else f"{it['prod'] or it['url'].rsplit('/', 1)[-1]}-{it['start'][:16]}"
        try:
            events.append(make_event(
                KEY, sid, it['title'], it['start'], end=it['end'], city=city, venueName=venue, type=kind,
                credits=credits, program=program, ticketUrl=it['ticket'], url=it['url'],
                status='cancelled' if looks_cancelled(' '.join([it['title'], it['labels']] + it['chips'])) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, sid, err)
    return events
