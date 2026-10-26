"""Collegium Novum Zürich: concerts from the ensemble's concert page (HTML).

    https://cnz.ch/concerts            one page: every concert with date, venue and works
    https://cnz.ch/<concert>           one page per upcoming concert: performers and ticket link

The listing's ``<time datetime="…Z">`` is UTC (17:00Z is shown as 18:00 Uhr in November);
it is converted to Swiss time and checked against the time shown. Works come as
``<strong>Composer</strong> <em>Title</em> <span>scoring (year)</span>``. Performers with
roles are only on the concert's own page (``field-concert-credits-more``); the list of
the ensemble's individual players is not taken.

Skipped: past concerts and guest performances abroad (no Swiss postcode in the address,
e.g. Huddersfield).
"""
from __future__ import annotations

import html as _html
import re

from common import (FetchError, clean, get, guess_type, log, looks_cancelled, make_event, requests_left,
                    to_zurich_datetime, to_zurich_iso, today_zurich)

KEY = 'cnz'
NAME = 'Collegium Novum Zürich'
SITE = 'https://cnz.ch/'
ATTRIBUTION = 'Source: Collegium Novum Zürich (cnz.ch)'
KIND = 'ensemble'
MAX_REQUESTS = 30
TIME_LIMIT = 300

BASE = 'https://cnz.ch'
LISTING_URL = BASE + '/concerts'
ENSEMBLE = 'Collegium Novum Zürich'

_CITY_NAMES = {'zürich': 'Zürich', 'zurich': 'Zürich', 'genève': 'Genève', 'geneve': 'Genève', 'genf': 'Genève',
               'basel': 'Basel', 'bern': 'Bern', 'luzern': 'Luzern', 'lausanne': 'Lausanne', 'winterthur': 'Winterthur',
               'lugano': 'Lugano', 'st. gallen': 'St. Gallen'}

# ---------------------------------------------------------------------------
# roles (German -> Klang's English role names)
# ---------------------------------------------------------------------------

_ROLE_WORDS = {
    'leitung': 'Conductor', 'musikalische leitung': 'Conductor', 'dirigent': 'Conductor', 'dirigentin': 'Conductor',
    'violine': 'Violin', 'geige': 'Violin', 'viola': 'Viola', 'violoncello': 'Cello', 'cello': 'Cello',
    'kontrabass': 'Double bass', 'klavier': 'Piano', 'piano': 'Piano', 'cembalo': 'Harpsichord', 'orgel': 'Organ',
    'hammondorgel': 'Hammond organ', 'flöte': 'Flute', 'bassflöte': 'Bass flute', 'blockflöte': 'Recorder',
    'oboe': 'Oboe', 'englischhorn': 'Cor anglais', 'klarinette': 'Clarinet', 'bassklarinette': 'Bass clarinet',
    'fagott': 'Bassoon', 'horn': 'Horn', 'trompete': 'Trumpet', 'posaune': 'Trombone', 'tuba': 'Tuba',
    'saxophon': 'Saxophone', 'saxofon': 'Saxophone', 'harfe': 'Harp', 'gitarre': 'Guitar',
    'e-gitarre': 'Electric guitar', 'e-bass': 'Electric bass', 'akkordeon': 'Accordion', 'schlagzeug': 'Percussion',
    'perkussion': 'Percussion', 'schlagwerk': 'Percussion', 'elektronik': 'Electronics',
    'live-elektronik': 'Electronics', 'klangregie': 'Sound direction', 'sopran': 'Soprano',
    'mezzosopran': 'Mezzo-soprano', 'alt': 'Alto', 'countertenor': 'Countertenor', 'tenor': 'Tenor',
    'bariton': 'Baritone', 'bass': 'Bass', 'stimme': 'Voice', 'gesang': 'Voice', 'sprecher': 'Narrator',
    'sprecherin': 'Narrator', 'performance': 'Performer', 'moderation': 'Presenter',
}
_OFFSTAGE_WORDS = ('konzept', 'dramaturg', 'regie', 'choreo', 'einstudierung', 'assistenz', 'kamera', 'film', 'licht',
                   'schnitt', 'design', 'produktion', 'technik', 'komposition')
_INSTRUMENTISH = re.compile(r'(phon|flöte|horn|tuba|geige|violine|viola|bass|harfe|klavier|orgel|trompete|posaune|'
                            r'cello|gitarre|schlagzeug|zither|laute|akkordeon|elektronik|keyboard|synthesizer|'
                            r'marimba|vibraphon|celesta|sopran|tenor|bariton|stimme)$')


def _role(text):
    t = re.sub(r'\s*\([^)]*\)', '', clean(text)).strip(' ,;:')
    if not t:
        return 'Performer'
    parts = [p.strip() for p in re.split(r'\s*(?:,|/|&|\bund\b)\s*', t.lower()) if p.strip()]
    mapped, offstage = [], 0
    for p in parts:
        p = re.sub(r'\s*\d+$', '', p)
        if any(w in p for w in _OFFSTAGE_WORDS):
            offstage += 1
        elif p in _ROLE_WORDS:
            mapped.append(_ROLE_WORDS[p])
        elif _INSTRUMENTISH.search(p):
            mapped.append(p[:1].upper() + p[1:])
        else:
            mapped.append('Performer')
    if len(mapped) > 1 and 'Performer' in mapped:
        mapped = [m for m in mapped if m != 'Performer']
    if not mapped:
        return None if offstage else 'Performer'
    if 'Conductor' in mapped and len(mapped) > 1:
        return ' & '.join(m for m in mapped if m != 'Conductor') + ' & direction'
    return ' & '.join(dict.fromkeys(mapped))


_CHOIR_RE = re.compile(r'(chor\b|chor\s|choir|chorus|choeur|chœur|vokalensemble|vocal ensemble|singers|vocalisten|\bvocale?\b)', re.I)
_ORCH_RE = re.compile(r'(orchest|philharmon|sinfoniett|symphoniker|sinfoniker|camerata)', re.I)
_ENS_RE = re.compile(r'(ensemble|quartett|quartet|quatuor|trio\b|quintett|quintet|consort|collegium|duo\b|'
                     r'studierende|kollektiv|collective)', re.I)


def _group_role(name):
    if _CHOIR_RE.search(name) and not re.search(r'orchest', name, re.I):
        return 'Choir'
    if _ORCH_RE.search(name):
        return 'Orchestra'
    if _ENS_RE.search(name):
        return 'Ensemble'
    return None


# ---------------------------------------------------------------------------
# parsing
# ---------------------------------------------------------------------------

def _span_texts(html):
    return [clean(x) for x in re.findall(r'<span[^>]*>(.*?)</span>', html or '', re.S)]


def _location(block):
    """-> (venueName, city or None) from a teaser's location block."""
    loc = re.search(r'<div class="location[^"]*">(.*?)</div>', block or '', re.S)
    if not loc:
        return None, None
    name = re.search(r'<span class="at">.*?</span>\s*<span>(.*?)</span>', loc.group(1), re.S)
    addr = re.search(r'<span class="city">(.*?)</span>', loc.group(1), re.S)
    venue = clean(name.group(1)) if name else ''
    city = None
    if addr:
        m = re.search(r'\b(\d{4})\s+([^,()]+?)\s*\)?\s*$', clean(addr.group(1)))
        if m and 1000 <= int(m.group(1)) <= 9699 and not 9485 <= int(m.group(1)) <= 9498:
            raw = m.group(2).strip()
            city = _CITY_NAMES.get(raw.lower(), raw)
    if venue and city:
        # "Genf: Salle communale de Plainpalais", "Lausanne, BCV Concert Hall"
        m = re.match(r'^([^:,]+)[:,]\s*(.+)$', venue)
        if m and _CITY_NAMES.get(m.group(1).strip().lower(), m.group(1).strip()) == city:
            venue = m.group(2).strip()
    return venue or None, city


def parse_listing(page_html):
    """-> list of concert dicts (all, past ones included)."""
    out = []
    for m in re.finditer(r'<article class="concert teaser"\s+data-nodeid="(\d+)">(.*?)</article>', page_html or '', re.S):
        nid, block = m.group(1), m.group(2)
        link = re.search(r'<h2[^>]*>\s*<a href="([^"]+)"[^>]*>(.*?)</a>', block, re.S)
        when = re.search(r'<time datetime="([^"]+)"[^>]*>(.*?)</time>', block, re.S)
        if not (link and when):
            continue
        venue, city = _location(block)
        works = []
        for row in re.findall(r'<div class="row person">(.*?)</div>', block, re.S):
            composer = re.search(r'<strong>(.*?)</strong>', row, re.S)
            work = re.search(r'<em>(.*?)</em>', row, re.S)
            if not (composer and work):
                continue
            rest = re.sub(r'(?s)^.*?</em>', '', row)
            detail = ' '.join(t for t in _span_texts(rest) if t)
            title = clean(work.group(1)).rstrip(',')
            if detail:
                title = f'{title} {detail}' if detail.startswith('(') else f'{title}, {detail}'
            works.append((clean(composer.group(1)), title))
        out.append({'nid': nid, 'href': _html.unescape(link.group(1)), 'title': clean(link.group(2)),
                    'datetime': when.group(1), 'shown': clean(when.group(2)), 'venue': venue, 'city': city,
                    'works': works})
    return out


def parse_detail(page_html):
    """-> {'credits': [(role, name)], 'ticket': url|None}."""
    h = page_html or ''
    credits = []
    more = re.search(r'<div class="field-concert-credits-more[^"]*">(.*?)<div class="block tickets', h, re.S)
    if more:
        for row in re.findall(r'<div class="row person">(.*?)</div>', more.group(1), re.S):
            name = re.search(r'<strong>(.*?)</strong>', row, re.S)
            if not name:
                continue
            nm = clean(name.group(1))
            role_txt = ' '.join(_span_texts(re.sub(r'(?s)^.*?</strong>', '', row)))
            if nm.endswith(':'):                         # "Steamboat Switzerland:" heads a group
                credits.append(('Ensemble', nm.rstrip(':').strip()))
                continue
            if not role_txt:
                credits.append((_group_role(nm) or 'Performer', nm))
                continue
            role = _role(role_txt)
            if role:
                credits.append((role, nm))
    ticket = re.search(r'<div class="field-ticket-link[^"]*">\s*<a href="([^"]+)"', h)
    if not ticket:
        # guest concerts: "Vorverkauf über die <a href=…>Société de musique contemporaine</a>"
        block = re.search(r'<div class="block tickets">(.*?)<div class="block ', h, re.S)
        ticket = re.search(r'<a href="(https?://[^"]+)"', block.group(1)) if block else None
    return {'credits': credits, 'ticket': _html.unescape(ticket.group(1)) if ticket else None}


def _start(c):
    start = to_zurich_iso(c['datetime'], assume='UTC')
    m = re.search(r'(\d{1,2})[:.](\d{2})\s*Uhr', c['shown'])
    if m and start[11:16] != f'{int(m.group(1)):02d}:{m.group(2)}':
        log.warning('cnz %s: datetime %s is %s in Swiss time but the page shows %s',
                    c['nid'], c['datetime'], start[11:16], c['shown'])
    return start


def _type(title, credits, works):
    roles = [r for r, _ in credits]
    text = ' '.join([title] + [w for _, w in works])
    t = guess_type(text)
    if t == 'vocal-opera' and not re.search(r'\b(oratori|requiem|oper|opera|messe|passion|kantate|chor)', text, re.I):
        t = None                 # common.guess_type also fires on e.g. "Laboratorium"
    if 'Choir' in roles or t == 'vocal-opera':
        return 'vocal-opera'
    if 'Orchestra' in roles:
        return 'orchestral'
    players = [n for r, n in credits if r not in ('Orchestra', 'Ensemble', 'Choir', 'Conductor', 'Presenter', 'Narrator')]
    if 'Ensemble' not in roles and len(players) == 1:
        return 'recital'
    return 'chamber'


def fetch():
    concerts = parse_listing(get(LISTING_URL))       # FetchError propagates
    if not concerts:
        raise FetchError(LISTING_URL, 'no concerts found on the page (layout changed?)')
    today = today_zurich()
    events = []
    for c in concerts:
        try:
            start = _start(c)
        except ValueError as err:
            log.warning('cnz %s: bad date %r: %s', c['nid'], c['datetime'], err)
            continue
        if to_zurich_datetime(start).date() < today:
            continue
        if not c['city']:
            log.info('cnz %s: not in Switzerland or no address, skipped: %s @ %s', c['nid'], c['title'], c['venue'])
            continue
        url = c['href'] if c['href'].startswith('http') else BASE + c['href']
        detail = {'credits': [], 'ticket': None}
        if requests_left() > 0:
            try:
                detail = parse_detail(get(url))
            except FetchError as err:
                log.warning('cnz %s: concert page failed: %s', c['nid'], err)
        credits = detail['credits'] or [('Ensemble', ENSEMBLE)]
        try:
            events.append(make_event(
                KEY, c['nid'], c['title'], start, city=c['city'], venueName=c['venue'],
                type=_type(c['title'], credits, c['works']), credits=credits, program=c['works'],
                ticketUrl=detail['ticket'], url=url,
                status='cancelled' if looks_cancelled(c['title']) else 'scheduled'))
        except ValueError as err:
            log.warning('cnz %s: skipped: %s', c['nid'], err)
    return events
