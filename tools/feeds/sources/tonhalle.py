"""Tonhalle Zürich: the Tonhalle-Orchester's calendar and the hall's own calendar (HTML).

    https://www.tonhalle-orchester.ch/konzerte/kalender/        orchestra (also tours, other venues)
    https://tonhallezuerich.ch/home-tz/konzerte/kalender/       hall (orchestra + guest concerts)

Both calendars run on one ProcessWire site and show 10 concerts per page. Pages are read
as ``…/kalender/pageN/``; robots.txt forbids the ``?action=filtercalendar`` query the
site's own pager adds, so it is never sent. An event has the same numeric id in both
calendars (``…-2055193/``), which is how the two are merged. Concerts of other sources
(e.g. the Zürcher Kammerorchester in the Tonhalle) are left in: build.py merges them by
venue and start time and keeps the richer source.

Each listing row has ``data-timestamp`` (a true Unix epoch, checked against the
"19.30 Uhr" shown next to it), the title, performers with roles and the composers' names.
The hall (Grosse / Kleine Tonhalle) and the works are only on the event page, so the
requests left after the listings (cap 60) are spent on event pages, nearest concerts
first. One event page also names the hall of every related date it lists. Concerts
further ahead keep the composers' names from the listing and the venue
"Tonhalle Zürich" until they come close enough.

Skipped: guided tours, school and family concerts, children's series, talks
(Prélude, readings), sing-alongs, events without a time, pop/comedy shows, and the
orchestra's tours abroad ("Gastspiel in Hamburg").
"""
from __future__ import annotations

import html as _html
import re
from datetime import datetime

from common import (FetchError, clean, get, guess_type, log, looks_cancelled, make_event, requests_left,
                    to_zurich_datetime, to_zurich_iso)

KEY = 'tonhalle'
NAME = 'Tonhalle Zürich'
SITE = 'https://www.tonhalle-orchester.ch/'
ATTRIBUTION = 'Source: Tonhalle-Gesellschaft Zürich (tonhalle-orchester.ch / tonhallezuerich.ch)'
KIND = 'venue'
TIME_LIMIT = 600

TOZ = 'https://www.tonhalle-orchester.ch'
TZ = 'https://tonhallezuerich.ch'
CALENDARS = (
    ('toz', TOZ + '/konzerte/kalender/', TOZ),
    ('tz', TZ + '/home-tz/konzerte/kalender/', TZ),
)
MAX_PAGES = 30                 # per calendar; the site has ~15 and ~21
TOZ_ORCHESTRA = 'Tonhalle-Orchester Zürich'

# ---------------------------------------------------------------------------
# what to skip
# ---------------------------------------------------------------------------

_SKIP_TITLE = re.compile(
    r'führung|schulprojekt|schulkonzert|familienkonzert|kunterwunderbunt|kammermusik für kinder|kinderkonzert|'
    r'zukunftstag|orgelpräsentation|prélude\s*:|prelude\s*:|künstlergespräch|weihnachtssingen|mitsingen|superar|'
    r'workshop|einführung|probenbesuch|offene probe|\bball\b|lesung|tribute|rock the opera|comedian harmonists|'
    r'comedy|\bshow\b|\bliest\b|literatur und musik', re.I)
_VOCAL_RE = re.compile(r'passion|oratori|requiem|messiah|messias|\bmesse\b|missa|kantate|magnificat|elias|'
                       r'stabat mater|\boper\b|opera\b', re.I)
_POP_ROLES = {'Vocals', 'Comedy', 'Dj', 'DJ', 'Beatbox', 'Rap'}
_TALK_ROLES = {'Narrator', 'Presenter'}

_SWISS_CITIES = {
    'zürich': 'Zürich', 'zurich': 'Zürich', 'winterthur': 'Winterthur', 'luzern': 'Luzern', 'lucerne': 'Luzern',
    'basel': 'Basel', 'bern': 'Bern', 'genf': 'Genève', 'genève': 'Genève', 'geneva': 'Genève',
    'lausanne': 'Lausanne', 'lugano': 'Lugano', 'st. gallen': 'St. Gallen', 'st.gallen': 'St. Gallen',
    'chur': 'Chur', 'zug': 'Zug', 'baden': 'Baden', 'aarau': 'Aarau', 'schaffhausen': 'Schaffhausen',
    'solothurn': 'Solothurn', 'biel': 'Biel', 'thun': 'Thun', 'fribourg': 'Fribourg', 'freiburg': 'Fribourg',
    'gstaad': 'Gstaad', 'verbier': 'Verbier', 'andermatt': 'Andermatt', 'locarno': 'Locarno',
    'montreux': 'Montreux', 'vevey': 'Vevey', 'neuchâtel': 'Neuchâtel', 'davos': 'Davos', 'sion': 'Sion',
}
_FOREIGN_HINT = re.compile(r'baden-baden|deutschland|germany|österreich|austria|wien|vienna|hamburg|berlin|'
                           r'münchen|munich|amsterdam|paris|london|frankreich|italien|spanien|japan|china|usa|'
                           r'tournee|tour\b', re.I)

# ---------------------------------------------------------------------------
# roles (German -> Klang's English role names)
# ---------------------------------------------------------------------------

_ROLE_WORDS = {
    'leitung': 'Conductor', 'musikalische leitung': 'Conductor', 'dirigent': 'Conductor',
    'dirigentin': 'Conductor', 'chefdirigent': 'Conductor', 'chefdirigentin': 'Conductor',
    'music director': 'Music Director',
    'violine': 'Violin', 'geige': 'Violin', 'barockvioline': 'Baroque violin', 'viola': 'Viola',
    'bratsche': 'Viola', 'violoncello': 'Cello', 'cello': 'Cello', 'barockcello': 'Baroque cello',
    'kontrabass': 'Double bass', 'klavier': 'Piano', 'piano': 'Piano', 'flügel': 'Piano',
    'hammerklavier': 'Fortepiano', 'fortepiano': 'Fortepiano', 'cembalo': 'Harpsichord',
    'orgel': 'Organ', 'flöte': 'Flute', 'querflöte': 'Flute', 'blockflöte': 'Recorder', 'oboe': 'Oboe',
    'englischhorn': 'Cor anglais', 'klarinette': 'Clarinet', 'fagott': 'Bassoon', 'horn': 'Horn',
    'trompete': 'Trumpet', 'posaune': 'Trombone', 'tuba': 'Tuba', 'saxophon': 'Saxophone',
    'saxofon': 'Saxophone', 'harfe': 'Harp', 'gitarre': 'Guitar', 'laute': 'Lute', 'theorbe': 'Theorbo',
    'akkordeon': 'Accordion', 'bandoneon': 'Bandoneon', 'schlagzeug': 'Percussion',
    'perkussion': 'Percussion', 'percussion': 'Percussion', 'schlagwerk': 'Percussion',
    'e-gitarre': 'Electric guitar', 'e-bass': 'Electric bass', 'marimba': 'Marimba', 'cimbalom': 'Cimbalom',
    'sopran': 'Soprano', 'mezzosopran': 'Mezzo-soprano', 'alt': 'Alto', 'countertenor': 'Countertenor',
    'tenor': 'Tenor', 'bariton': 'Baritone', 'bassbariton': 'Bass-baritone', 'bass': 'Bass',
    'gesang': 'Voice', 'stimme': 'Voice', 'vocals': 'Vocals', 'comedy': 'Comedy',
    'erzählung': 'Narrator', 'erzähler': 'Narrator', 'erzählerin': 'Narrator', 'sprecher': 'Narrator',
    'sprecherin': 'Narrator', 'rezitation': 'Narrator', 'lesung': 'Narrator', 'schauspiel': 'Narrator',
    'moderation': 'Presenter', 'konzertmeister': 'Concertmaster', 'konzertmeisterin': 'Concertmaster',
    'gesamtleitung': 'Conductor', 'künstlerische leitung': 'Conductor', 'chorleitung': 'Chorus master',
    'schulchor': 'Choir', 'drums': 'Percussion', 'chor': 'Choir', 'orchester': 'Orchestra', 'barockorchester': 'Orchestra', 'ensemble': 'Ensemble',
    'vokalensemble': 'Choir', 'quartett': 'Ensemble', 'saxophon quartett': 'Ensemble',
    'saxophonquartett': 'Ensemble', 'streichquartett': 'Ensemble', 'klaviertrio': 'Ensemble',
    'sopransaxophon': 'Soprano saxophone', 'altsaxophon': 'Alto saxophone', 'tenorsaxophon': 'Tenor saxophone',
    'baritonsaxophon': 'Baritone saxophone', 'wagnertuba': 'Wagner tuba', 'pauken': 'Timpani',
    'pauke': 'Timpani', 'elektronik': 'Electronics', 'live-elektronik': 'Electronics',
    'conductor': 'Conductor', 'violin': 'Violin', 'piano': 'Piano', 'flute': 'Flute', 'soprano': 'Soprano',
    'mezzo-soprano': 'Mezzo-soprano', 'mezzo': 'Mezzo-soprano', 'baritone': 'Baritone', 'organ': 'Organ',
    'harp': 'Harp', 'guitar': 'Guitar', 'clarinet': 'Clarinet', 'trumpet': 'Trumpet', 'harpsichord': 'Harpsichord',
}
# an unknown role that still names an instrument or voice keeps its (German) name; anything
# else (e.g. an opera character in a concert performance) becomes 'Performer'
_INSTRUMENTISH = re.compile(r'(phon|flöte|horn|tuba|geige|violine|viola|bass|harfe|klavier|orgel|trompete|posaune|'
                            r'cello|gitarre|schlagzeug|zither|hackbrett|laute|akkordeon|elektronik|keyboard|'
                            r'synthesizer|marimba|vibraphon|celesta|sopran|tenor|bariton|alt|stimme|gesang)$')
_OFFSTAGE = {'konzept', 'konzeption', 'dramaturgie', 'regie', 'inszenierung', 'choreografie', 'choreographie',
             'einstudierung', 'komposition', 'arrangement', 'bühne', 'kostüme', 'licht', 'video', 'ton',
             'ballettmeister', 'ballettmeisterin', 'ausstattung', 'text', 'libretto', 'bühnenbild', 'kostüm',
             'lichtdesign', 'sounddesign', 'produktion', 'idee', 'sandmalerei', 'visuals', 'live-visuals'}


def _characters(pairs):
    """How many performers are listed with a role that is neither an instrument/voice nor a
    group nor off-stage: in a concert performance of an opera these are the characters
    ('Mari Eriksmoen, Giulia')."""
    n = 0
    for name, function in pairs:
        f = clean(function).strip(' ,;:')
        if name and f and not _PLACEHOLDER_RE.match(clean(name)) and _role(f) == 'Performer':
            n += 1
    return n


def _role(text):
    """German role text -> English role, None for off-stage roles."""
    t = re.sub(r'\s*\([^)]*\)', '', clean(text)).strip(' ,;:')       # "Klavier (Artist in Residence)"
    if not t:
        return 'Performer'
    parts = [p.strip() for p in re.split(r'\s*(?:,|/|&|\bund\b)\s*', t.lower()) if p.strip()]
    mapped, offstage = [], 0
    for p in parts:
        p = re.sub(r'\s*\d+$', '', p)                     # "Sopran 2"
        if p in _OFFSTAGE or any(w in p for w in ('konzept', 'dramaturg', 'regie', 'choreo', 'einstudierung',
                                                   'assistenz', 'ballettmeister')):
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
    if 'Conductor' in mapped and len(mapped) > 1:                      # "Violine und Leitung"
        return ' & '.join(m for m in mapped if m != 'Conductor') + ' & direction'
    return ' & '.join(dict.fromkeys(mapped))


_CHOIR_RE = re.compile(r'(chor\b|chor\s|chöre|choir|chorus|choeur|chœur|\bcoro|vokalensemble|vocal ensemble|singers|'
                       r'sängerknaben|kantorei|vocalisten|vokalisten|\bvocale\b|\bvocal\b|sing-?akademie|singers)', re.I)
_ORCH_RE = re.compile(r'(orchest|orquesta|philharmon|filarm|sinfoniett|symphoniker|sinfoniker|camerata|harmonie\b|'
                      r'musikkollegium|concert olympique)', re.I)
_ENS_RE = re.compile(r'(ensemble|quartett|quartet|quatuor|quartetto|trio\b|trió\b|quintett|quintet|consort|musiker|'
                     r'musician|solisten|sängerinnen|sänger|collegium|duo\b|^duo|academy|akademie|players|harmonists)', re.I)
# "N.N." / "tba": a performer not yet announced is not a credit
_PLACEHOLDER_RE = re.compile(r'(?i)^(?:n\.?\s*n\.?|tba|t\.b\.a\.|tbd|noch offen|wird bekannt gegeben)$')


def _group_role(name):
    """'Orchestra' / 'Choir' / 'Ensemble' when the name is obviously a group, else None."""
    members = re.search(r'musiker|mitglieder|members|studierende', name, re.I)
    choir = _CHOIR_RE.search(name)
    if choir and not re.search(r'orchest', name, re.I):
        return 'Choir'
    if _ORCH_RE.search(name) and not members:
        return 'Orchestra'
    if choir:
        return 'Choir'
    if _ENS_RE.search(name):
        return 'Ensemble'
    return None


def _credit(name, function):
    """(role, name) for a performer, or None for off-stage people."""
    name = clean(name).rstrip(':').strip()
    if not name or _PLACEHOLDER_RE.match(name):
        return None
    if not clean(function).strip(' ,;:'):
        return (_group_role(name) or 'Performer', name)
    role = _role(function)
    return (role, name) if role else None


# ---------------------------------------------------------------------------
# listing pages
# ---------------------------------------------------------------------------

_ROW_SPLIT = re.compile(r'<div class="row data\b[^"]*">')
_HOUR_RE = re.compile(r'(\d{1,2})[.:](\d{2})\s*Uhr', re.I)


def _event_key(href):
    m = re.search(r'-(\d{5,})/(?:tz/?)?$', href)
    if m:
        return m.group(1)
    return re.sub(r'^/konzerte/kalender/|/(?:tz/?)?$', '', href).strip('/')


def parse_listing(page_html):
    """-> list of row dicts from one calendar page."""
    rows = []
    chunks = _ROW_SPLIT.split(page_html or '')[1:]
    for chunk in chunks:
        chunk = re.split(r'<div data-month=|<div class="row\s+showmore', chunk)[0]
        href = re.search(r'href="(/konzerte/kalender/[^"]+)"', chunk)
        ts = re.search(r'data-timestamp="(\d{9,11})"', chunk)
        title = re.search(r'<h3>(.*?)</h3>', chunk, re.S)
        if not (href and ts and title):
            continue
        hour = re.search(r'class="hour">\s*(.*?)\s*</div>', chunk, re.S)
        composers = re.search(r'<span class="composer">\s*(.*?)\s*</span>', chunk, re.S)
        ticket = re.search(r'pos-btn-billett">\s*<a[^>]*href="([^"]+)"', chunk)
        labels = re.findall(r'pos-label-bestellstatus.*?<span[^>]*>([^<]*)</span>', chunk, re.S)
        members = re.findall(r'<span class="member-name">(.*?)</span>\s*<span class="member-function">(.*?)</span>',
                             chunk, re.S)
        rows.append({
            'href': _html.unescape(href.group(1)),
            'key': _event_key(_html.unescape(href.group(1))),
            'ts': int(ts.group(1)),
            'title': clean(title.group(1)),
            'hour': clean(hour.group(1)) if hour else '',
            'composers': clean(composers.group(1)) if composers else '',
            'ticket': _html.unescape(ticket.group(1)) if ticket else None,
            'labels': [clean(x) for x in labels if clean(x)],
            'members': [(clean(n), clean(f)) for n, f in members if clean(n)],
        })
    return rows


def _last_page(page_html):
    nums = [int(n) for n in re.findall(r"/kalender/page(\d+)", page_html or '')]
    return max(nums) if nums else 1


def _read_calendar(name, base, origin, rows):
    """Read every page of one calendar into ``rows`` (key -> row). The first page must work."""
    first = get(base)                                   # FetchError propagates
    last = min(_last_page(first), MAX_PAGES)
    pages = [first]
    for n in range(2, last + 1):
        if requests_left() <= 0:
            log.warning('tonhalle: request cap reached in the %s calendar at page %d of %d', name, n, last)
            break
        try:
            pages.append(get(f'{base}page{n}/'))
        except FetchError as err:
            log.warning('tonhalle: %s page %d failed: %s', name, n, err)
            if getattr(err, 'status', None) == 404:
                break
    count = 0
    for page in pages:
        for row in parse_listing(page):
            count += 1
            row['url'] = origin + row['href']
            prev = rows.get(row['key'])
            if prev is None:
                row['calendars'] = {name}
                rows[row['key']] = row
            else:
                prev['calendars'].add(name)
                for k in ('ticket', 'composers'):
                    prev[k] = prev.get(k) or row.get(k)
                if not prev['members'] and row['members']:
                    prev['members'] = row['members']
    log.info('tonhalle: %s calendar: %d page(s), %d rows', name, len(pages), count)


# ---------------------------------------------------------------------------
# event pages
# ---------------------------------------------------------------------------

_MORE_WORKS_RE = re.compile(r'(?i)^(?:sowie|und|plus)?\s*(?:weitere\s+)?werke\s+(?:u\.\s*a\.\s*)?von\s+(.+?)\.?$')


def parse_detail(page_html):
    """-> {'places': {key|'self': place}, 'performers': [(name, function, is_member)],
           'works': [(composer, title)]} from one event page."""
    out = {'places': {}, 'performers': [], 'works': []}
    h = page_html or ''
    dates = re.search(r'<div class="dates-wrapper">(.*?)<div class="pagetitle">', h, re.S)
    for box in re.split(r'<div class="date-container', dates.group(1) if dates else '')[1:]:
        place = re.search(r'<span class="place">(.*?)</span>', box, re.S)
        link = re.search(r'class="overlay-link" href="([^"]+)"', box)
        if place and clean(place.group(1)):
            out['places'][_event_key(link.group(1)) if link else 'self'] = clean(place.group(1))
    info = re.search(r'<div class="info">(.*?)(?:<div class="rahmenprogramm"|<div class="price"|<div class="sponsor"|'
                     r'<div class="social"|<div class="cp-media-grid|<section)', h, re.S)
    blocks = re.findall(r'<div class="artists">(.*?)</div>', info.group(1), re.S) if info else []
    for i, block in enumerate(blocks):
        spans = re.findall(r'<span class="name([^"]*)">(.*?)</span>\s*<span class="function([^"]*)">(.*?)</span>',
                           block, re.S)
        if i < 2:
            for cls, name, _, function in spans:
                if clean(name):
                    out['performers'].append((clean(name), clean(function), 'is-ensemble-member' in cls))
        else:
            composer = ''
            for _, name, fcls, function in spans:
                if 'is-pause' in fcls:
                    continue
                title = clean(function)
                more = _MORE_WORKS_RE.match(title)
                if more:                                  # "sowie Werke von Mozart, Bach und Brahms"
                    for other in re.split(r'\s*,\s*|\s+und\s+|\s*&\s*', more.group(1)):
                        if other.strip():
                            out['works'].append((other.strip(), ''))
                    continue
                composer = clean(name) or composer        # an empty name repeats the previous composer
                if composer and title:
                    out['works'].append((composer, title))
    return out


def _venue(place, fallback_city='Zürich'):
    """-> (venueName, city or None) for a place shown on an event page."""
    p = clean(place)
    low = p.lower()
    if 'grosse tonhalle' in low or 'grosser saal' in low:
        return 'Tonhalle Zürich – Grosser Saal', 'Zürich'           # Klang's own venue names
    if 'kleine tonhalle' in low or 'kleiner saal' in low:
        return 'Tonhalle Zürich – Kleiner Saal', 'Zürich'
    if low in ('opernhaus', 'opernhaus zürich', 'oper zürich'):
        return 'Opernhaus Zürich', 'Zürich'                             # Klang's own venue name
    if 'tonhalle' in low and 'st. gallen' not in low:
        return ('Tonhalle Zürich' if low in ('tonhalle', 'tonhalle zürich') else f'Tonhalle Zürich – {p}'), 'Zürich'
    if _FOREIGN_HINT.search(low):
        return p, None
    for word, city in _SWISS_CITIES.items():
        if re.search(rf'(?<![\w-]){re.escape(word)}(?![\w-])', low):
            return p, city
    if re.search(r'opernhaus|fraumünster|grossmünster|st\. peter|predigerkirche|kirche enge|neumünster', low):
        return p, 'Zürich'
    return p, fallback_city


# ---------------------------------------------------------------------------
# rows -> events
# ---------------------------------------------------------------------------

_NOT_COMPOSER = {'nn', 'n.n.', 'traditional', 'traditionell', 'diverse', 'various', 'anonym', 'anonymous'}


def _listing_composers(text):
    out = []
    for part in re.split(r'\s*,\s*', clean(text)):
        part = part.strip()
        if not part or part.lower() in _NOT_COMPOSER or len(part) > 60:
            continue
        if re.search(r'[«»:\d]|^mit\b|^werke\b|^musik\b', part, re.I) or not part[0].isupper():
            continue
        if len(part.split()) > 5:
            continue
        if part not in out:
            out.append(part)
    return out


def _series(title):
    m = re.match(r'^(Kosmos Kammermusik|Série jeunes|Sonic Matter|Filmsinfonik|Kammermusik-Matinee|'
                 r'Kammermusik-Lunchkonzert|Orchester-Lunchkonzert|Festtags-Matinee|Abo-Konzert(?: #\d+)?)\b', title)
    return m.group(1) if m else None


def _type(title, credits, works, characters=0):
    roles = [r for r, _ in credits]
    if characters >= 2 and ('Orchestra' in roles or 'Ensemble' in roles):
        return 'vocal-opera'                            # an opera in concert: singers listed by character
    text = ' '.join([title] + [t for _, t in works])
    if re.search(r'rezital|recital|liederabend|klavierabend', title, re.I):
        return 'recital'
    t = guess_type(text)
    if t == 'vocal-opera' or 'Choir' in roles or (_VOCAL_RE.search(title) and ('Orchestra' in roles or 'Ensemble' in roles)):
        return 'vocal-opera'
    if 'Orchestra' in roles:
        return 'orchestral'
    if t in ('recital', 'chamber', 'orchestral'):
        return t
    players = [n for r, n in credits if r not in ('Orchestra', 'Ensemble', 'Choir', 'Presenter', 'Narrator')]
    if 'Ensemble' in roles or 2 <= len(players) <= 9:
        return 'chamber'
    if len(players) == 1:
        return 'recital'
    return None


def _start(row):
    """ISO start from the epoch, cross-checked with the shown time. None when no time is shown."""
    local = to_zurich_datetime(row['ts'])
    m = _HOUR_RE.search(row['hour'])
    if not m:
        return None
    hh, mm = int(m.group(1)), int(m.group(2))
    if hh == 0 and mm == 0:
        return None                                     # "00.00 Uhr": all-day / time unknown
    if (local.hour, local.minute) != (hh, mm):
        log.warning('tonhalle %s: timestamp %s is %s but the page shows %s; using the page',
                    row['key'], row['ts'], local.strftime('%H:%M'), row['hour'])
        return to_zurich_iso(datetime(local.year, local.month, local.day, hh, mm))
    return to_zurich_iso(local)


def _prepare(rows):
    """Filter rows and attach start, credits, composers. -> list of candidate dicts."""
    out, skipped = [], {}

    def skip(why):
        skipped[why] = skipped.get(why, 0) + 1

    for row in rows.values():
        title = row['title']
        if _SKIP_TITLE.search(title):
            skip('not a concert / family / talk')
            continue
        start = _start(row)
        if not start:
            skip('no time')
            continue
        credits = [c for c in (_credit(n, f) for n, f in row['members']) if c]
        roles = {r for r, _ in credits}
        if roles & _POP_ROLES:
            skip('pop/comedy')
            continue
        if credits and roles <= _TALK_ROLES:
            skip('reading/talk')
            continue
        if any(n == TOZ_ORCHESTRA for _, n in credits):
            credits = [('Conductor' if r == 'Music Director' else r, n) for r, n in credits]
        at_tonhalle = 'tz' in row['calendars']
        city, needs_page = 'Zürich', False
        if not at_tonhalle:
            g = re.match(r'(?i)^gastspiel in (.+)$', title)
            place = g.group(1) if g else ''
            if g:
                _, city = _venue(place, fallback_city=None)
                if not city:
                    skip('tour abroad')
                    continue
            else:
                needs_page = True                       # somewhere else: the event page says where
        out.append({
            'row': row, 'key': row['key'], 'title': title, 'start': start, 'credits': credits,
            'composers': _listing_composers(row['composers']), 'city': city,
            'venue': 'Tonhalle Zürich' if at_tonhalle else None, 'needs_page': needs_page,
            'works': [], 'detailed': False, 'characters': _characters(row['members']),
            'cancelled': looks_cancelled(title) or any(looks_cancelled(x) for x in row['labels']),
        })
    if skipped:
        log.info('tonhalle: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    return out


def _detail_url(row):
    path = re.sub(r'/tz/?$', '/', row['href'])
    return TOZ + path


def _enrich(cands):
    """Spend the remaining requests on event pages: events at other venues first, then the
    nearest concerts. Pages also reveal the hall of related dates."""
    by_key = {c['key']: c for c in cands}
    order = sorted(cands, key=lambda c: (not c['needs_page'],
                                         any(n == 'Zürcher Kammerorchester' for _, n in c['credits']),
                                         c['start']))
    places = {}
    fetched = 0
    for c in order:
        if c['detailed'] or (c['key'] in places and not c['needs_page'] and c['works']):
            continue
        if requests_left() <= 0:
            break
        try:
            d = parse_detail(get(_detail_url(c['row'])))
        except FetchError as err:
            log.warning('tonhalle %s: event page failed: %s', c['key'], err)
            continue
        fetched += 1
        c['detailed'] = True
        for key, place in d['places'].items():
            places[c['key'] if key == 'self' else key] = place
        if d['works']:
            c['works'] = d['works']
        perf = [x for x in (_credit(n, f) for n, f, _ in d['performers']) if x]
        if perf:
            if any(n == TOZ_ORCHESTRA for _, n in perf):
                perf = [('Conductor' if r == 'Music Director' else r, n) for r, n in perf]
            c['credits'] = perf
            c['characters'] = _characters([(n, f) for n, f, _ in d['performers']])
        # same programme on other dates: same title, performers and (several) composers
        if d['works'] and len(set(c['composers'])) >= 2:
            for key in d['places']:
                other = by_key.get(key)
                if (other and other is not c and not other['works'] and other['title'] == c['title']
                        and other['composers'] == c['composers'] and other['credits'] == c['credits']):
                    other['works'] = d['works']
    for c in cands:
        place = places.get(c['key'])
        if place:
            venue, city = _venue(place, fallback_city=c['city'])
            c['venue'], c['city'] = venue, city
        elif c['needs_page']:
            c['city'] = None                            # unknown place outside the Tonhalle: leave it out
    log.info('tonhalle: %d event page(s) read, halls known for %d of %d concerts', fetched,
             sum(1 for c in cands if c['key'] in places), len(cands))


def fetch():
    rows = {}
    for name, base, origin in CALENDARS:
        _read_calendar(name, base, origin, rows)
    cands = _prepare(rows)
    _enrich(cands)
    events = []
    for c in cands:
        if not c['city']:
            log.info('tonhalle %s: place unknown or abroad, skipped: %s', c['key'], c['title'])
            continue
        row = c['row']
        program = c['works'] or [(name, '') for name in c['composers']]
        try:
            events.append(make_event(
                KEY, c['key'], c['title'], c['start'], city=c['city'], venueName=c['venue'],
                type=_type(c['title'], c['credits'], c['works'], c['characters']), series=_series(c['title']),
                credits=c['credits'], program=program, ticketUrl=row.get('ticket'), url=row['url'],
                status='cancelled' if c['cancelled'] else 'scheduled'))
        except ValueError as err:
            log.warning('tonhalle %s: skipped: %s', c['key'], err)
    return events
