"""Konzert und Theater St.Gallen: concerts of the Sinfonieorchester St.Gallen (Tonhalle St.Gallen),
operas and orchestral ballet evenings of the Theater St.Gallen.

    https://www.konzertundtheater.ch/programm/kalender/            this month and the next
    https://www.konzertundtheater.ch/programm/kalender/2026-12/    one page per further month

Each performance in the calendar carries schema.org microdata: a naive ``startDate`` in Swiss
local time, the hall ("Tonhalle", "Grosses Haus", "Lokremise" ...), the category (Konzert,
Musiktheater, Tanz, Schauspiel), a subtitle and the ticket link. The production page (one
request per production, not per date) adds the line-up ("Mitwirkende" with role labels),
the works ("Composer: work" lines) and the end time of every date.

Kept: concerts, operas/operettas and dance evenings that credit an orchestra. Skipped: plays,
musicals, school/family/baby concerts, introductions, tours, cafés, courses and guest
performances abroad.

Terms: the imprint says that reproducing information or data needs prior consent of the
publisher. Only facts (date, time, title, hall, line-up, works, link) are republished.
"""
from __future__ import annotations

import html as htmllib
import re
from urllib.parse import urljoin

from common import (FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime,
                    to_zurich_iso, today_zurich)
from ._east import (credits_from_pairs, fold, infer_type, is_group, group_role, looks_foreign,
                    NOT_A_CONCERT, VOICES)

KEY = 'kts_st_gallen'
NAME = 'Konzert und Theater St.Gallen'
SITE = 'https://www.konzertundtheater.ch/'
ATTRIBUTION = 'Source: Konzert und Theater St.Gallen (konzertundtheater.ch)'
KIND = 'venue'
PRIORITY = 25          # the orchestra's and opera house's own calendar
TIME_LIMIT = 420

BASE = 'https://www.konzertundtheater.ch'
CALENDAR = BASE + '/programm/kalender/'
MONTH_URL = BASE + '/programm/kalender/{}/'
ORCHESTRA = 'Sinfonieorchester St.Gallen'

HALLS = {
    'tonhalle': 'Tonhalle St.Gallen',
    'grosses haus': 'Theater St.Gallen, Grosses Haus',
    'lokremise': 'Lokremise St.Gallen',
    'studio': 'Theater St.Gallen, Studio',
    'theaterfoyer': 'Theater St.Gallen, Foyer',
    'foyer': 'Theater St.Gallen, Foyer',
    'probebuhne': 'Theater St.Gallen, Probebühne',
    'kathedrale': 'Kathedrale St. Gallen',
    'klosterhof': 'Klosterhof St. Gallen',
}
OTHER_TOWNS = ('Baden', 'Delémont', 'Zürich', 'Winterthur', 'Chur', 'Wil', 'Rorschach', 'Herisau', 'Bern', 'Basel',
               'Luzern', 'Schaffhausen', 'Frauenfeld', 'Aarau', 'Genf', 'Genève', 'Lausanne', 'Vernier', 'Zug',
               'Olten', 'Thun', 'Biel', 'Arbon', 'Kreuzlingen', 'Romanshorn', 'Gossau', 'Uzwil', 'Appenzell', 'Trogen',
               'Mels', 'Wattwil', 'Rapperswil', 'Buchs', 'Sargans', 'Altstätten', 'Heerbrugg', 'Teufen')
LOCAL_ONLY = re.compile(r'grundstufe|unterstufe|mittelstufe|oberstufe|kindergarten')
STAFF = {'Conductor', 'Director', 'Choreographer', 'Orchestra', 'Choir', 'Ensemble'}
CONCERT_SERIES = re.compile(r'tonhallekonzert|meisterzyklus|meisterzkylus|sonntags um|lunch|kammermusik|'
                            r'sinfoniekonzert|extrakonzert|festkonzert|neujahrskonzert|silvesterkonzert|chorkonzert')
OPERA_SUB = re.compile(r'^(?:(?:komische |grosse |romantische |tragische |heitere |lyrische |fantastische )?'
                       r'(?:oper|opera|operette|operetta|singspiel|kammeroper|musikdrama|melodramma)[^,]*?)\s+von\s+(.+)$', re.I)
COMPOSER_LINE = re.compile(r'^([A-ZÄÖÜÉ][\w.\'’\- ]{2,60}?):\s*(.+)$')
NOT_COMPOSER = re.compile(r'herausgeber|libretto|text|dauer|sprache|ubertitel|tickets|leitung|fassung|bearbeitung|werke|'
                          r'uraufführung|urauffuhrung|auftragswerk|mit\b|in\b|ab\b|alter|pause|eintritt', re.I)


# ---------------------------------------------------------------------------
# calendar pages
# ---------------------------------------------------------------------------

def _performances(page):
    out = []
    for blk in re.split(r'(?=<div class="performance performance--)', page)[1:]:
        blk = blk.split('<!-- performance -->', 1)[0]
        pid = re.search(r'\bid="(\d{4}-\d{2}-\d{2})-p(\d+)"', blk)
        start = re.search(r'itemprop="startDate" content="([^"]+)"', blk)
        title = re.search(r'class="performance__title">(.*?)</h3>', blk, re.S)
        if not (pid and start and title):
            continue
        href = re.search(r'href="(/programm/kalender/[^"]+/\d+/)"', blk)
        cat = re.search(r'performance__category --hide-phone-only">([^<]*)<', blk)
        loc = re.search(r'performance__location">(.*?)</div>', blk, re.S)
        texts = re.search(r'class="performance__text">(.*?)</a>', blk, re.S)
        lines = [clean(x) for x in re.findall(r'<div>(.*?)</div>', texts.group(1), re.S)] if texts else []
        ticket = re.search(r'href="(https?://tickets\.[^"]+)"[^>]*class="ticketbutton__tickets', blk)
        info = ' '.join(clean(x) for x in re.findall(r'ticketbutton__infoitem[^"]*">(.*?)</div>', blk, re.S))
        url = urljoin(BASE, htmllib.unescape(href.group(1))) if href else None
        slug = re.search(r'/programm/kalender/(?:\d{4}-\d{2}/)?([^/]+)/\d+/', href.group(1)).group(1) if href else pid.group(2)
        out.append({
            'pid': pid.group(2), 'start_raw': start.group(1), 'title': clean(title.group(1)),
            'category': clean(cat.group(1)) if cat else '', 'hall': clean(loc.group(1)) if loc else '',
            'sub': [x for x in lines if x], 'url': url, 'slug': slug,
            'ticket': htmllib.unescape(ticket.group(1)) if ticket else None,
            'cancelled': looks_cancelled(' '.join([clean(title.group(1)), info] + lines)),
        })
    return out


def _months(page):
    return re.findall(r'class="calendarbar__month[^"]*" data-filter-token="(\d{4}-\d{2})"', page)


# ---------------------------------------------------------------------------
# production pages
# ---------------------------------------------------------------------------

def _cast(page):
    i = page.find('js-marker-cast-and-crew-container')
    if i < 0:
        return []
    block = page[i:page.find('productionschedule', i) if page.find('productionschedule', i) > 0 else i + 40000]
    pairs = []
    for item in re.findall(r'<div class="productioncastandcrew__item">(.*?)</div>', block, re.S):
        names = [clean(n) for n in re.findall(r'<(?:a|span)\b[^>]*>(.*?)</(?:a|span)>', item, re.S)]
        head = clean(re.split(r'<(?:a|span)\b', item, 1)[0])
        label = head[:-1].strip() if head.endswith(':') else ''
        if not names:
            text = clean(item)
            if ':' in text:
                label, rest = text.split(':', 1)
                names = [n.strip() for n in re.split(r'[,/]', rest) if n.strip()]
            else:
                names = [text]
        for name in names:
            pairs.append((label, name))
    credits = credits_from_pairs(pairs)
    # groups without a label ("Sinfonieorchester St.Gallen", "Opernchor St.Gallen")
    return [(group_role(n) if r == 'Performer' and is_group(n) else r, n) for r, n in credits]


def _works(page):
    m = re.search(r'productioninfos__section--additionalinfo">\s*<div class="productioninfos__textinfo">(.*?)</div>',
                  page, re.S)
    if not m:
        return []
    works = []
    for raw in re.split(r'<br\s*/?>', m.group(1)):
        line = clean(raw)
        if not line:
            continue
        cm = COMPOSER_LINE.match(line)
        if cm and not NOT_COMPOSER.search(cm.group(1)) and len(cm.group(1).split()) <= 5:
            works.append([cm.group(1).strip(), cm.group(2).strip()])
        elif works and works[-1][1].endswith(','):          # a work continued on the next line
            works[-1][1] = works[-1][1] + ' ' + line
    return [(c, t.rstrip(',')) for c, t in works]


def _ends(page):
    """performance id -> 'HH:MM' end time from the date selector ('19.11.2026 19:30 - 21:30')."""
    return {pid: end for pid, end in re.findall(
        r'<option value="(\d+)">\s*\d{1,2}\.\d{1,2}\.\d{4}\s+\d{1,2}:\d{2}\s*-\s*(\d{1,2}:\d{2})\s*</option>', page)}


def _details(url):
    page = get(url)
    return {'credits': _cast(page), 'works': _works(page), 'ends': _ends(page)}


# ---------------------------------------------------------------------------
# filters and mapping
# ---------------------------------------------------------------------------

def _wanted(p):
    text = fold(' '.join([p['title']] + p['sub']))
    cat = fold(p['category'])
    if NOT_A_CONCERT.search(text) or LOCAL_ONLY.search(text):
        return None
    if cat == 'konzert':
        return 'concert'
    if cat == 'musiktheater':
        if re.search(r'musical|revue|show\b', text):
            return None
        return 'opera'
    if cat == 'tanz':
        return 'dance'          # kept only when the production credits an orchestra
    return None


def _place(hall):
    f = fold(hall)
    if f in HALLS:
        return HALLS[f], 'St. Gallen'
    if looks_foreign(hall):
        return None, None
    if ',' in hall:
        venue, town = hall.rsplit(',', 1)
        return clean(venue), clean(town.split('/')[0])
    for town in OTHER_TOWNS:
        if re.search(r'\b%s\b' % re.escape(fold(town)), f):
            return hall, town
    return hall or None, 'St. Gallen'


def fetch():
    today = today_zurich()
    first = get(CALENDAR)                                   # FetchError propagates
    perfs = _performances(first)
    have = {p['start_raw'][:7] for p in perfs}
    for month in _months(first):
        if month in have or month < today.strftime('%Y-%m'):
            continue
        try:
            perfs += _performances(get(MONTH_URL.format(month)))
        except FetchError as err:
            log.warning('%s: month %s not read: %s', KEY, month, err)

    seen, items = set(), []
    for p in perfs:
        if p['pid'] in seen:
            continue
        seen.add(p['pid'])
        kind = _wanted(p)
        if not kind:
            continue
        try:
            start = to_zurich_iso(p['start_raw'])
        except ValueError:
            continue
        if to_zurich_datetime(start).date() < today:
            continue
        venue, city = _place(p['hall'])
        if not city:
            continue                                        # guest performance abroad
        items.append(dict(p, kind=kind, start=start, venue=venue, city=city))
    items.sort(key=lambda p: p['start'])

    details = {}
    for p in items:
        if p['slug'] in details or not p['url']:
            continue
        if requests_left() <= 0:
            break
        try:
            details[p['slug']] = _details(p['url'])
        except FetchError as err:
            log.warning('%s: no details for %s: %s', KEY, p['url'], err)
            details[p['slug']] = None

    events = []
    for p in items:
        d = details.get(p['slug']) or {}
        credits = list(d.get('credits') or [])
        sub = p['sub'][0] if p['sub'] else ''
        program, series, kind = [], None, None
        if p['kind'] == 'dance':
            if not any(r == 'Orchestra' for r, _ in credits) or p['city'] != 'St. Gallen':
                continue                    # recorded music, or a guest performance without the orchestra
            kind = 'orchestral'
        elif p['kind'] == 'opera':
            kind = 'vocal-opera'
            # cast labels are characters ("Hoffmann", "Stimme aus der Gruft"), not voice types; instrumentalists
            # ("Violine: Iryna Gintova" in a concert of the opera chorus) keep their instrument
            credits = [(r if r in STAFF or r not in VOICES | {'Performer', 'Narrator', 'Soloist'} else 'Performer', n)
                       for r, n in credits]
            m = OPERA_SUB.match(sub)
            if m:
                program = [(clean(m.group(1)), p['title'])]
        else:
            program = d.get('works') or []
            if CONCERT_SERIES.search(fold(sub)):
                series = sub
            hint = 'orchestral' if re.search(r'tonhalle|sinfonie', fold(sub)) else None
            kind = infer_type(' '.join([p['title'], sub]), credits, hint)
        end = None
        if p['pid'] in (d.get('ends') or {}):
            hh, mm = d['ends'][p['pid']].split(':')
            end_local = to_zurich_datetime(p['start']).replace(hour=int(hh), minute=int(mm))
            if end_local > to_zurich_datetime(p['start']):
                end = to_zurich_iso(end_local)
        try:
            events.append(make_event(
                KEY, p['pid'], p['title'], p['start'], end=end, city=p['city'], venueName=p['venue'],
                type=kind, series=series, credits=credits, program=program,
                ticketUrl=p['ticket'], url=p['url'], status='cancelled' if p['cancelled'] else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, p['pid'], err)
    return events
