"""Musikkollegium Winterthur: concerts from the orchestra's programme listing and event pages.

The listing (musikkollegium.ch/programm-tickets/programm) has every upcoming date with its
local start time, title, series, ticket link and event page. Each event page adds a
MusicEvent JSON-LD block (start and end with the Swiss offset, venue with address, status)
and the "Besetzung" (line-up with roles) and programme blocks. With about 90 dates per
season but at most 60 requests per run, a page is fetched once per production: its "Alle
Daten" list names the other dates of the same production, which reuse its venue, line-up
and works. Dates beyond the budget are listed from the listing alone (city Winterthur,
no venue or line-up).

Skipped: public rehearsals, masterclasses, ballet, art-viewing formats and the orchestra's
tours abroad.
"""
from __future__ import annotations

import html as htmllib
import re
import unicodedata
from urllib.parse import urljoin

from common import (FetchError, clean, get, guess_type, jsonld_events, log, looks_cancelled, make_event,
                    requests_left, to_zurich_datetime, to_zurich_iso, today_zurich)

KEY = 'musikkollegium'
NAME = 'Musikkollegium Winterthur'
SITE = 'https://www.musikkollegium.ch/'
ATTRIBUTION = 'Source: Musikkollegium Winterthur (musikkollegium.ch)'
KIND = 'orchestra'
TIME_LIMIT = 300

BASE = 'https://www.musikkollegium.ch'
LISTING = BASE + '/programm-tickets/programm'
ORCHESTRA = 'Musikkollegium Winterthur'
SKIP_SERIES = {'teilhabe-partizipation', 'masterclass', 'ballett'}
SKIP_GENRES = {'öffentliche-generalprobe', 'masterclass', 'ballett'}
SKIP_TEXT = re.compile(r'tournee|generalprobe|masterclass|meisterkurs|workshop|fuhrung|bildbetrachtung')
SERIES_NAMES = {
    'abonnementskonzert': 'Abonnementskonzert', 'hauskonzert': 'Hauskonzert', 'extrakonzert': 'Extrakonzert',
    'freikonzert': 'Freikonzert', 'familienkonzert': 'Familienkonzert', 'midi-musical': 'Musik über Mittag',
    'oper': 'Oper', 'kafi-dia': 'KafiDia', 'kammermusik': 'Kammermusik Liebestrasse',
    'music-for-a-while': 'Music for a While',
}
SWISS = {'', 'ch', 'che', 'schweiz', 'switzerland', 'suisse', 'svizzera'}

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
                      r'choir|choeur|camerata|consort|kantorei|vokal|singknaben|sangerknaben|stimmen\b|voices\b|\bband\b|\bduo\b|solisten\b', re.I)
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
    if re.search(r'chor|choir|choeur|kantorei|vokal|vocal|singers|singknaben|sangerknaben|gesangverein|stimmen\b|voices\b', n):
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


def _items(html):
    out = []
    for attrs, body in re.findall(r'<article class="event-entry"(.*?)>(.*?)</article>', html, re.S):
        link = re.search(r'class="event-entry--link" href="([^"]+)"', body)
        head = re.search(r'event-entry--headline">(.*?)</h2>', body, re.S)
        if not link or not head:
            continue
        url = urljoin(BASE, htmllib.unescape(link.group(1)))
        m = re.search(r'-(\d+)/?$', url)
        dates = [clean(x) for x in re.findall(r'event-entry--date">(.*?)</span>', body, re.S)]
        ticket = re.search(r'event-entry--btn">.*?href="([^"]+)"', body, re.S)
        attr = dict(re.findall(r'data-([a-z]+)="([^"]*)"', attrs))
        out.append({
            'sid': m.group(1) if m else url, 'url': url, 'title': clean(head.group(1)),
            'when': ' '.join(dates), 'series': attr.get('series', ''),
            'genres': {g for g in attr.get('genre', '').split(',') if g},
            'badges': [clean(b) for b in re.findall(r'event-badge[^"]*">(.*?)</span>', body, re.S)],
            'ticket': htmllib.unescape(ticket.group(1)).strip() if ticket else None,
            'cancelled': looks_cancelled(clean(body)),
        })
    return out


def _local_start(when):
    """'Mi 11.11.2026 19.30 Uhr' -> ISO with offset, or None."""
    m = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2})[.:](\d{2})', when)
    if not m:
        return None
    d, mo, y, hh, mi = (int(x) for x in m.groups())
    return to_zurich_iso(f'{y:04d}-{mo:02d}-{d:02d}T{hh:02d}:{mi:02d}:00')


_NN_RE = re.compile(r'^\s*(n\.?\s*n\.?|tba|tbd|tbc|noch offen)\s*$', re.I)


def _roles(label, name):
    """'Leitung und Sopran' -> ['Conductor', 'Soprano']; a single label -> [its role]."""
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


def _cast(html):
    credits = []
    block = html.split('event-detail--cast', 1)[1] if 'event-detail--cast' in html else ''
    block = block.split('event-detail--body', 1)[0]
    for label, dd in re.findall(r'<dt>(.*?)</dt>\s*<dd>(.*?)</dd>', block, re.S):
        names = [clean(n) for n in re.findall(r'<a\b[^>]*>(.*?)</a>', dd, re.S)]
        rest = clean(re.sub(r'<br\s*/?>', ',', re.sub(r'<a\b[^>]*>.*?</a>', ',', dd, flags=re.S)))   # one name per line
        names += [n.strip() for n in re.split(r'[,;/]| und ', rest) if len(n.strip()) > 2]
        for name in names:
            if not name or _NN_RE.match(name):          # 'N.N.': not yet announced
                continue
            for role in _roles(label, name):
                credits.append((role, name))
    return credits


def _program(html):
    out = []
    block = html.split('event-detail--program', 1)[1] if 'event-detail--program' in html else ''
    block = block.split('event-detail--text', 1)[0]
    for work in re.findall(r'<div class="event-detail--work">(.*?)</div>', block, re.S):
        composer = re.search(r'event-detail--composer">(.*?)</span>', work, re.S)
        title = re.search(r'event-detail--title">(.*?)</span>', work, re.S)
        if composer and title:                       # entries without a work title are prose, not works
            if clean(composer.group(1)):             # no composer: 'Zwei Solokonzerte nach Wahl ...' is prose too
                out.append((clean(composer.group(1)), clean(title.group(1))))
        elif composer:                               # 'Angels in America' + 'Oper von <strong>Péter Eötvös</strong> ...'
            by = re.search(r'<p>\s*(?:Oper|Operette|Kammeroper|Oratorium|Singspiel|Musiktheater|Ballett)?\s*von\s*'
                           r'<strong>(.*?)</strong>', work, re.S)
            if by and clean(by.group(1)) and len(clean(composer.group(1))) <= 120:
                out.append((clean(by.group(1)), clean(composer.group(1))))
    return out


def _details(url):
    html = get(url)
    ld = next(iter(jsonld_events(html)), {})
    loc = ld.get('location') if isinstance(ld.get('location'), dict) else {}
    addr = loc.get('address') if isinstance(loc.get('address'), dict) else {}
    siblings = {urljoin(BASE, htmllib.unescape(h))
                for h in re.findall(r'<li><a href="(/programm/[^"]+)">', html.split('event-detail--dates', 1)[-1].split('</ul>', 1)[0])}
    start = end = None
    try:
        start = to_zurich_iso(ld['startDate']) if ld.get('startDate') else None
        end = to_zurich_iso(ld['endDate']) if ld.get('endDate') else None
    except ValueError:
        start = end = None
    return {
        'start': start, 'end': end,
        'venue': clean(loc.get('name')) or None,
        'city': clean(addr.get('addressLocality')) or None,
        'country': _fold(clean(addr.get('addressCountry'))),
        'cancelled': 'cancel' in str(ld.get('eventStatus', '')).lower(),
        'credits': _cast(html), 'program': _program(html), 'siblings': siblings,
    }


def _venue_name(venue, city):
    """'Stadthaus' -> 'Stadthaus Winterthur' (how Klang knows the hall)."""
    if venue and city and _fold(city) not in _fold(venue) and len(venue) <= 40:
        return f'{venue} {city}' if _fold(venue) in ('stadthaus', 'theater', 'stadtkirche', 'tonhalle', 'casino') else venue
    return venue


def fetch():
    today = today_zurich()
    items = []
    for it in _items(get(LISTING)):                  # FetchError propagates
        if it['series'] in SKIP_SERIES or it['genres'] & SKIP_GENRES:
            continue
        if SKIP_TEXT.search(_fold(' '.join([it['title']] + it['badges']))):
            continue
        start = _local_start(it['when'])
        if not start or to_zurich_datetime(start).date() < today:
            continue
        items.append(dict(it, start=start))
    items.sort(key=lambda it: it['start'])

    # One page per production: its "Alle Daten" list names the other dates, which reuse its
    # venue, length, line-up and works. A date of the same programme in another series (e.g.
    # 'Musik über Mittag' in the Theater, 'Kammermusik Liebestrasse' at the Liebestrasse) is in
    # another hall with another length, so it gets its own page once the budget allows.
    pages, shared, other_series = {}, {}, []           # URL -> own details; URL -> (details, series)

    def load(it):
        try:
            details = _details(it['url'])
        except FetchError as err:
            log.warning('%s: no details for %s: %s', KEY, it['url'], err)
            return
        pages[it['url']] = details
        shared[it['url']] = (details, it['series'])
        for sib in details['siblings']:
            shared.setdefault(sib, (details, it['series']))

    for it in items:
        if requests_left() <= 0:
            break
        if it['url'] in shared:
            if shared[it['url']][1] != it['series']:
                other_series.append(it)
            continue
        load(it)
    for it in other_series:                             # left-over budget: the other-series dates
        if requests_left() <= 0:
            break
        load(it)

    events = []
    for it in items:
        own_page = it['url'] in pages
        if own_page:
            details, series = pages[it['url']], it['series']
        else:
            details, series = shared.get(it['url'], (None, None))
        same_production = own_page or series == it['series']
        start, end, venue, city, credits, program, cancelled = it['start'], None, None, None, [], [], it['cancelled']
        if details:
            if details['country'] not in SWISS:
                continue                                    # concert abroad
            if own_page and details['start']:
                if details['start'] != start:
                    log.warning('%s: listing says %s, page says %s (%s)', KEY, start, details['start'], it['url'])
                start = details['start']
                end = details['end']
            elif same_production and details['start'] and details['end']:   # another date: same length
                length = to_zurich_datetime(details['end']) - to_zurich_datetime(details['start'])
                end = to_zurich_iso(to_zurich_datetime(start) + length)
            if same_production:
                venue, city = details['venue'], details['city']
            credits, program = list(details['credits']), details['program']
            cancelled = cancelled or (own_page and details['cancelled'])
        if not city:
            m = re.search(r'zu gast in ([A-ZÄÖÜ][\wäöüé\- ]+)', it['title'], re.I)
            city = m.group(1).strip() if m else 'Winterthur'
        series_name = next((b for b in it['badges'] if b), None) or SERIES_NAMES.get(it['series']) or None
        if it['series'] == 'oper':
            kind = 'vocal-opera'
        elif it['series'] in ('kammermusik', 'midi-musical', 'music-for-a-while', 'kafi-dia'):
            kind = infer_type(it['title'], credits) or 'chamber'
            kind = 'recital' if kind == 'recital' else 'chamber'
        elif it['series'] == 'abonnementskonzert':
            kind = 'vocal-opera' if guess_type(it['title']) == 'vocal-opera' else 'orchestral'
        else:
            kind = infer_type(it['title'], credits)
        try:
            events.append(make_event(
                KEY, it['sid'], it['title'], start, end=end,
                city=city, venueName=_venue_name(venue, city), type=kind, series=series_name,
                credits=credits, program=program, ticketUrl=it['ticket'], url=it['url'],
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, it['sid'], err)
    return events
