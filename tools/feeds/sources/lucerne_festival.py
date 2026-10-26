"""Lucerne Festival: concerts from the festival's programme listings and event pages.

The listing (lucernefestival.ch/de/karten/programm) shows the current festival; the other
festivals of the season (Spring, Pulse, Summer ...) have their own listing at
/de/programm/<festival-slug>, linked from the festival menu. Each listing item gives the
day and local time (without the year), the venue, the title, the ticket link and the
event page. The event page adds the line-up with roles, the works and a MusicEvent
JSON-LD block whose startDate is UTC written without a 'Z' ("2026-11-22T17:30" for
18.30 Uhr in November); it is only used to confirm the date and year, the local time on
the listing is what is published.

Event pages are fetched soonest first while the request budget lasts; events beyond it
are listed from the listing alone (no performers or works).
"""
from __future__ import annotations

import html as htmllib
import re
import unicodedata
from datetime import date, timedelta
from urllib.parse import urljoin

from common import (FetchError, clean, get, guess_type, jsonld_events, log, looks_cancelled, make_event,
                    requests_left, to_zurich_datetime, today_zurich)

KEY = 'lucerne_festival'
NAME = 'Lucerne Festival'
SITE = 'https://www.lucernefestival.ch/'
ATTRIBUTION = 'Source: Lucerne Festival (lucernefestival.ch)'
KIND = 'festival'
TIME_LIMIT = 300

BASE = 'https://www.lucernefestival.ch'
LISTING = BASE + '/de/karten/programm'
MAX_LISTING_PAGES = 12
SKIP_RE = re.compile(r'\b(einfuhrung|werkeinfuhrung|gesprach|talk|podium|workshop|fuhrung|lesung|film|party|'
                     r'ball|apero|empfang|symposium|masterclass|meisterkurs|probe|kinderprogramm)\b')

# ---------------------------------------------------------------------------
# roles (German labels -> Klang's English roles) and a type guess from the line-up
# ---------------------------------------------------------------------------

ROLE_RULES = tuple((re.compile(p), r) for p, r in (
    (r'vortrag|referent|vortragende|gesprach|talk\b|lecture', 'Speaker'),
    (r'chorleitung|choreinstudierung|einstudierung|chordirektor|chorus ?master', 'Chorus master'),
    (r'leitung|dirigent|conductor|\bdirection\b', 'Conductor'),
    (r'konzertmeister', 'Violin'),
    (r'quartett|quartet|quintett|quintet|sextett|sextet|oktett|octet|ensemble|\btrio\b', 'Ensemble'),
    (r'saxophon', 'Saxophone'),
    (r'mezzo', 'Mezzo-soprano'),
    (r'sopran', 'Soprano'),
    (r'countertenor|\baltus\b', 'Countertenor'),
    (r'bass-?bariton', 'Bass-baritone'),
    (r'bariton|baryton', 'Baritone'),
    (r'tenor', 'Tenor'),
    (r'kontrabass|double bass', 'Double bass'),
    (r'violoncell|cell[oi]', 'Cello'),
    (r'viola\b|violen\b|bratsche', 'Viola'),
    (r'violl?in|geige', 'Violin'),
    (r'hammerklavier|fortepiano', 'Fortepiano'),
    (r'klavier|piano|flugel', 'Piano'),
    (r'cembalo|harpsichord', 'Harpsichord'),
    (r'orgel|organ\b', 'Organ'),
    (r'harfe|harp\b', 'Harp'),
    (r'laute|theorbe|lute\b', 'Lute'),
    (r'gitarre|guitar', 'Guitar'),
    (r'akkordeon|accordion|bandoneon', 'Accordion'),
    (r'blockflote|recorder', 'Recorder'),
    (r'flote|flute', 'Flute'),
    (r'oboe', 'Oboe'),
    (r'englischhorn|cor anglais', 'Cor anglais'),
    (r'klarinette|clarinet', 'Clarinet'),
    (r'fagott|bassoon', 'Bassoon'),
    (r'trompete|trumpet', 'Trumpet'),
    (r'posaune|trombone', 'Trombone'),
    (r'tuba', 'Tuba'),
    (r'horn', 'Horn'),
    (r'pauke|timpani', 'Timpani'),
    (r'schlagzeug|perkussion|percussion', 'Percussion'),
    (r'\balt\b|\balto\b', 'Alto'),
    (r'\bbass\b', 'Bass'),
    (r'stimme|gesang|sanger|vocals?\b|voice', 'Voice'),
    (r'sprecher|erzahler|rezitation|narrat|lesung', 'Narrator'),
    (r'moderation|moderator|host\b', 'Host'),
    (r'chor|choir|vokalensemble', 'Choir'),
    (r'orchester|orchestra', 'Orchestra'),
    (r'\bband\b', 'Ensemble'),
    (r'regie|inszenierung|stage director|szenische', 'Director'),
    (r'choreogra', 'Choreographer'),
    (r'tanz|dance', 'Dancer'),
    (r'schauspiel|actor|actress', 'Actor'),
    (r'puppenspiel', 'Puppeteer'),
    (r'komposition|komponist|composer', 'Composer'),
    (r'arrangement|bearbeitung', 'Arranger'),
    (r'solist', 'Soloist'),
    (r'^spiel$|mitwirkende|^besetzung$|interpret', 'Performer'),
    (r'buhne|kostum|licht|dramaturg|produktion|video|maske|ausstattung|technik|sounddesign|'
     r'textfassung|konzept|idee|assistenz|inspizienz|souffl', None),       # crew: not listed
))
GROUP_RE = re.compile(r'orchest|sinfoni|symphon|philharm|kollegium|collegium|gesangverein|ensemble|quartet|quartett|\btrio\b|quintet|\bchor|chor\b|'
                      r'choir|choeur|camerata|consort|kantorei|vokal|singknaben|sangerknaben|\bband\b|\bduo\b|solisten\b', re.I)
VOICES = {'Soprano', 'Mezzo-soprano', 'Alto', 'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass', 'Voice'}
INSTRUMENT_ROLES = {'Violin', 'Viola', 'Cello', 'Double bass', 'Piano', 'Fortepiano', 'Harpsichord', 'Organ', 'Harp', 'Lute',
                    'Guitar', 'Accordion', 'Recorder', 'Flute', 'Oboe', 'Cor anglais', 'Clarinet', 'Bassoon', 'Saxophone',
                    'Trumpet', 'Trombone', 'Tuba', 'Horn', 'Timpani', 'Percussion', 'Soprano', 'Mezzo-soprano', 'Alto',
                    'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass', 'Voice'}
NON_PLAYING = {'Speaker', 'Conductor', 'Chorus master', 'Director', 'Choreographer', 'Composer', 'Arranger', 'Host'}


def _fold(text):
    s = unicodedata.normalize('NFKD', str(text or '')).replace('ß', 'ss')
    return ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()


def _group_role(name):
    n = _fold(name)
    if re.match(r'(ensemble|solist|mitglieder|members|musiker)', n):
        return 'Ensemble'
    if 'orchest' in n:
        return 'Orchestra'
    if re.search(r'chor|choir|choeur|kantorei|vokal|vocal|singers|singknaben|sangerknaben|gesangverein', n):
        return 'Choir'
    if re.search(r'sinfoni|symphon|philharm|camerata|kollegium|collegium|streicher', n):
        return 'Orchestra'
    return 'Ensemble'


def role_for(label, name=''):
    """Klang role for a German/English role label, or None for crew we do not list."""
    f = _fold(clean(label))
    if f:
        for rx, role in ROLE_RULES:
            if rx.search(f):
                if role in ('Performer', 'Soloist') and name and GROUP_RE.search(_fold(name)):
                    return _group_role(name)
                if role == 'Orchestra' and re.match(r'(musiker|cellist|mitglied|solist|blaser|streicher|members)', _fold(name)):
                    return 'Ensemble'                     # 'Cellist*innen des SOB': players of the orchestra
                return role
    if name and GROUP_RE.search(_fold(name)):
        return _group_role(name)
    if f and len(f) <= 30:
        return clean(label)[0].upper() + clean(label)[1:]
    return 'Performer'


def _roles(label, name):
    """'Violine und Leitung' -> ['Violin', 'Conductor']; a single label -> [its role]."""
    parts = [p.strip() for p in re.split(r'\s+(?:und|&)\s+|\s*/\s*', clean(label)) if p.strip()]
    if len(parts) > 1 and all(any(rx.search(_fold(p)) for rx, _ in ROLE_RULES) for p in parts):
        roles = []
        for p in parts:
            r = role_for(p, name)
            if r and r not in roles:
                roles.append(r)
        return roles
    role = role_for(label, name)
    return [role] if role else []


def infer_type(title, credits, hint=None):
    """orchestral / chamber / recital / vocal-opera from title and line-up (None if unsure)."""
    t = guess_type(title)
    if t == 'vocal-opera':
        return t
    roles = [r for r, _ in credits]
    if 'Conductor' in roles or 'Orchestra' in roles:
        return 'orchestral' if 'Choir' not in roles else 'vocal-opera'
    if 'Choir' in roles:
        return 'vocal-opera'
    players = [r for r in roles if r not in NON_PLAYING]
    if len(players) == 1 and players[0] not in ('Ensemble', 'Performer'):
        return 'recital'
    if len(players) == 2 and (set(players) & VOICES) and 'Piano' in players:
        return 'recital'
    if 2 <= len(players) <= 9 or 'Ensemble' in roles:
        return 'chamber'
    return t or hint


def _city(venue, address=''):
    """'KKL Luzern, Konzertsaal' -> Luzern; 'Kammermusiksaal KKV, Vitznau' -> Vitznau."""
    m = re.search(r'CH-?\s*\d{4}\s+([A-ZÄÖÜ][\w .\-äöüéè]+?)\s*$', clean(address or ''))
    if m:
        return m.group(1).strip()
    v = clean(venue)
    f = _fold(v)
    if 'luzern' in f or 'lucerne' in f or re.search(r'\bkkl\b', f):
        return 'Luzern'
    parts = [p.strip() for p in v.split(',') if p.strip()]
    if len(parts) > 1 and re.fullmatch(r'[A-ZÄÖÜ][\wäöüéè\- .]+', parts[-1]) and len(parts[-1]) <= 30:
        return parts[-1]
    return 'Luzern'


def _festival_listings(html):
    """Festival listing URLs from the festival menu (the active one is the page itself)."""
    urls = []
    nav = html.split('festival-nav-list', 1)[1].split('</ul>', 1)[0] if 'festival-nav-list' in html else ''
    for href, cls in re.findall(r'href="([^"]+)"\s+class="([^"]*)"', nav):
        if re.search(r'\bactive\b', cls):             # the festival the page already shows
            continue
        m = re.search(r'/de/(?:programm/)?([a-z]+-\d{4})/?$', href)
        if m:
            urls.append(f'{BASE}/de/programm/{m.group(1)}')
    return urls


def _festival_name(html):
    m = re.search(r'festival-nav-item[^"]*\bactive\b[^>]*>.*?<span class="h4">(.*?)</span>', html, re.S)
    if m:
        return clean(m.group(1))
    m = re.search(r'class="festival-title[^"]*">(.*?)(?:\||</div>)', html, re.S)
    return clean(m.group(1)) if m else None


def _items(html):
    """-> list of dicts from the listing's <li class="event-item"> blocks."""
    out = []
    festival = _festival_name(html)
    for li in re.findall(r'<li class="event-item[^"]*"[^>]*>(.*?)</li>\s*(?=<li class="event-item|</ul>)', html, re.S):
        li = re.sub(r'(?is)<(svg|picture)\b.*?</\1>', '', li)
        link = re.search(r'<p class="event-title[^"]*">\s*<a href="([^"]+)">(.*?)</a>', li, re.S)
        if not link:
            continue
        url = urljoin(BASE, htmllib.unescape(link.group(1)))
        m = re.search(r'/(\d+)/?$', url)
        sid = m.group(1) if m else url
        when = re.search(r'<strong>Datum und Ort</strong>\s*<br>(.*?)</div>', li, re.S)
        when = clean(when.group(1)) if when else ''
        prog = re.search(r'<strong>Programm</strong>\s*<br>(.*?)</div>', li, re.S)
        sub = re.search(r'<div class="body-small">(.*?)</div>\s*<p class="event-title', li, re.S)
        fest = re.search(r'ticket-status">\s*<div class="body-small bold">(.*?)</div>', li, re.S)
        ticket = re.search(r'href="(https://shop\.lucernefestival\.ch/[^"]+)"', li)
        out.append({
            'sid': sid, 'url': url, 'title': clean(link.group(2)), 'when': when,
            'programme': clean(prog.group(1)) if prog else '',
            'subtitle': clean(sub.group(1)) if sub else '',
            'festival': clean(fest.group(1)) if fest else festival,
            'ticket': htmllib.unescape(ticket.group(1)) if ticket else None,
            'cancelled': looks_cancelled(clean(li)),
        })
    return out


_WHEN_RE = re.compile(r'(\d{1,2})\.(\d{1,2})\.(\d{4})?\s*\|\s*(\d{1,2})[.:](\d{2})\s*Uhr\s*(?:\|\s*(.*))?$')


def _parse_when(text, today):
    """'So 22.11. | 18.30 Uhr | KKL Luzern, Konzertsaal' -> (date, 'HH:MM', venue)"""
    m = _WHEN_RE.search(text)
    if not m:
        return None, None, None
    day, month = int(m.group(1)), int(m.group(2))
    year = int(m.group(3)) if m.group(3) else today.year
    try:
        d = date(year, month, day)
        if not m.group(3) and d < today - timedelta(days=7):
            d = date(year + 1, month, day)
    except ValueError:
        return None, None, None
    return d, f'{int(m.group(4)):02d}:{m.group(5)}', clean(m.group(6) or '') or None


def _performers(html):
    credits = []
    block = html.split('id="cast"', 1)[1].split('</section>', 1)[0] if 'id="cast"' in html else ''
    for li in re.findall(r'<li class="cell[^"]*">(.*?)</li>', block, re.S):
        name = re.search(r'<strong>(.*?)</strong>', li, re.S)
        name = clean(name.group(1)) if name else ''
        label = re.search(r'<span class="body-small">(.*?)</span>', li, re.S)
        label = clean(label.group(1)) if label else ''
        rest = clean(re.sub(r'<strong>.*?</strong>|<span class="body-small">.*?</span>', ' ', li, flags=re.S))
        if name.endswith(':'):                         # 'Solist*innen des LFCO: Aris Streisfeld, Violine | ...'
            name = name[:-1].strip()
        for role in (_roles(label, name) if name else []):
            credits.append((role, name))
        for part in rest.split('|'):
            m = re.fullmatch(r'\s*([^,]{3,80}),\s*([^,]{3,40})\s*', part)
            if m:
                role = role_for(m.group(2), m.group(1))
                if role:
                    credits.append((role, m.group(1)))
    return credits


_DATES_RE = re.compile(r'\(\s*\*?\s*\d{3,4}(?:\s*[–-]\s*\d{3,4})?\s*\)')
_REMARK_RE = re.compile(r'^(ur|erst|schweizer erst|europäische erst|deutschsprachige erst)aufführung|^auftragswerk|'
                        r'^im auftrag|^pause|^zugabe|^\d{1,2}[.:]\d{2}\s*uhr|^ca\.\s*\d+\s*min|^dauer', re.I)


def _program(html):
    """Works from the #program section: '<strong>Composer</strong> (dates)<br>Title<br>...'"""
    out = []
    block = html.split('id="program"', 1)[1] if 'id="program"' in html else ''
    block = block.split('id="description"', 1)[0]
    last_composer = None
    for cls, item in re.findall(r'<div class="(program-item p[^"]*)">(.*?)</div>', block, re.S):
        lines = [ln for ln in re.split(r'<br\s*/?>', item)]
        # 'program-item--continuation': a further work by the composer of the item above
        composer = last_composer if 'program-item--continuation' in cls else None
        for ln in lines:
            text = clean(ln)
            if not text:
                continue
            strongs = re.findall(r'<strong>(.*?)</strong>', ln, re.S)
            in_em = re.search(r'<em>\s*<strong>', ln)
            outside = clean(_DATES_RE.sub(' ', re.sub(r'<strong>.*?</strong>', ' ', ln, flags=re.S)))
            if strongs and not in_em and not outside.strip(' /&,-–') and not text.startswith('«'):
                composer = ' / '.join(clean(s).strip(' /') for s in strongs if clean(s).strip(' /'))
                continue
            if composer is None or _REMARK_RE.search(text):
                continue
            out.append((composer, text))
        if composer is not None:
            last_composer = composer
    return out


def _details(url):
    html = get(url)
    ld = next((e for e in jsonld_events(html)), {})
    start_utc = None
    if ld.get('startDate'):
        try:
            start_utc = to_zurich_datetime(ld['startDate'], assume='UTC')
        except ValueError:
            start_utc = None
    loc = ld.get('location') if isinstance(ld.get('location'), dict) else {}
    cancelled = 'cancel' in str(ld.get('eventStatus', '')).lower() or bool(
        re.search(r'>\s*(abgesagt|annulliert)\s*<', html, re.I))
    return {'credits': _performers(html), 'program': _program(html), 'start_utc': start_utc,
            'address': clean(loc.get('address') if isinstance(loc.get('address'), str) else ''),
            'cancelled': cancelled}


def fetch():
    today = today_zurich()
    first = get(LISTING)                               # FetchError propagates: nothing to reuse otherwise
    pages, seen_pages = [first], {LISTING}
    queue = [u for u in _festival_listings(first) if u not in seen_pages]
    while queue and len(seen_pages) < MAX_LISTING_PAGES:
        u = queue.pop(0)
        if u in seen_pages:
            continue
        seen_pages.add(u)
        try:
            pages.append(get(u))
        except FetchError as err:
            log.warning('%s: listing %s failed: %s', KEY, u, err)
    for page in list(pages):                           # follow plain pagination links, if any
        for href in re.findall(r'href="([^"]*[?&]page=\d+[^"]*)"', page):
            u = urljoin(BASE, htmllib.unescape(href))
            if u not in seen_pages and len(seen_pages) < MAX_LISTING_PAGES:
                seen_pages.add(u)
                try:
                    pages.append(get(u))
                except FetchError as err:
                    log.warning('%s: listing %s failed: %s', KEY, u, err)

    items, seen = [], set()
    for page in pages:
        for it in _items(page):
            if it['sid'] in seen:
                continue
            seen.add(it['sid'])
            d, hhmm, venue = _parse_when(it['when'], today)
            if d is None or d < today:
                continue
            if SKIP_RE.search(_fold(' '.join([it['title'], it['subtitle'], it['programme']]))):
                continue
            items.append(dict(it, day=d, hhmm=hhmm, venue=venue))
    items.sort(key=lambda it: (it['day'], it['hhmm']))

    events = []
    for it in items:
        details = {'credits': [], 'program': [], 'start_utc': None, 'address': '', 'cancelled': False}
        if requests_left() > 0:
            try:
                details = _details(it['url'])
            except FetchError as err:
                log.warning('%s: no details for %s: %s', KEY, it['url'], err)
        day = it['day']
        if details['start_utc'] is not None:
            ld_local = details['start_utc']
            if ld_local.strftime('%m-%d') == day.strftime('%m-%d'):
                day = ld_local.date()                      # the year, from the page
            if ld_local.strftime('%H:%M') != it['hhmm']:
                log.warning('%s: listing %s %s but JSON-LD (UTC) gives %s (%s)', KEY, day, it['hhmm'],
                            ld_local.strftime('%H:%M'), it['url'])
        start = f"{day.isoformat()}T{it['hhmm']}:00"
        start = to_zurich_datetime(start, assume='Europe/Zurich')
        series = ' · '.join(x for x in (f"Lucerne Festival {it['festival']}" if it['festival'] else 'Lucerne Festival',
                                        it['subtitle']) if x)
        credits = details['credits']
        title = it['title']
        try:
            events.append(make_event(
                KEY, it['sid'], title, start,
                city=_city(it['venue'], details['address']), venueName=it['venue'],
                type=infer_type(title + ' ' + it['subtitle'], credits),
                series=series, credits=credits, program=details['program'],
                ticketUrl=it['ticket'], url=it['url'],
                status='cancelled' if it['cancelled'] or details['cancelled'] else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, it['sid'], err)
    return events
