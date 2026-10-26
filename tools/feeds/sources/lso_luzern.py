"""Luzerner Sinfonieorchester: concerts from the orchestra's events API (The Events Calendar).

The REST API (sinfonieorchester.ch/de/wp-json/tribe/events/v1/events) gives the title, the
start and end in Swiss time, the venue and the category. Performers and works are only on
the event pages (the "Besetzung" and "Programm" blocks), so the reader also fetches one page
per kept concert, soonest first. When the request budget would not cover every page, a
repeat performance (same title) reuses the details of the first one instead of fetching its
own page; an event whose page could not be read is still listed, without performers.

Skipped: school, toddler and family-day formats, the Sinfonieball, all-day "save the date"
entries and tour concerts outside Switzerland.
"""
from __future__ import annotations

import re
import unicodedata

from common import (FetchError, clean, get, get_json, guess_type, log, looks_cancelled, make_event,
                    requests_left, to_zurich_datetime, to_zurich_iso, today_zurich)

KEY = 'lso_luzern'
NAME = 'Luzerner Sinfonieorchester'
SITE = 'https://sinfonieorchester.ch/'
ATTRIBUTION = 'Source: Luzerner Sinfonieorchester (sinfonieorchester.ch)'
KIND = 'orchestra'
TIME_LIMIT = 300

API = 'https://sinfonieorchester.ch/de/wp-json/tribe/events/v1/events?per_page=50&page={page}'
ORCHESTRA = 'Luzerner Sinfonieorchester'
MAX_PAGES = 5

CONCERT_CATEGORIES = ('sinfoniekonzerte', 'kammermusik', 'klavierfestival', 'lunchkonzerte', 'tourneen')
MV_KEEP = re.compile(r'konzert fur familien|kammermusik trifft|klangxchange')   # public concerts among education formats
SKIP_TITLE = re.compile(r'sinfonieball|\bball\b|familientag|save the date|generalprobe|schulklassen|kindergarten|'
                        r'\bschulen\b|spielplatz musik|workshop|fuhrung|einfuhrung|podium|gesprach mit')
SWISS = {'', 'schweiz', 'switzerland', 'suisse', 'svizzera', 'ch'}

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


def _city(venue):
    city = clean(venue.get('city') or '')
    name = _fold(venue.get('venue') or '')
    addr = _fold(venue.get('address') or '')
    if city and not city.isdigit():
        return city
    if 'orchesterhaus' in name or 'arsenalstrasse' in addr:
        return 'Kriens'
    if 'luzern' in name or 'kkl' in name or (city.isdigit() and city.startswith('60')):
        return 'Luzern'
    return None


def _list_events():
    """All upcoming events from the API (paged). A failure on page 1 propagates."""
    out, page = [], 1
    while page <= MAX_PAGES:
        try:
            data = get_json(API.format(page=page))
        except FetchError:
            if page == 1:
                raise
            log.warning('%s: listing page %d failed, keeping %d events', KEY, page, len(out))
            break
        out.extend(data.get('events') or [])
        if page >= int(data.get('total_pages') or 1) or not data.get('next_rest_url'):
            break
        page += 1
    return out


def _keep(ev):
    title = _fold(clean(ev.get('title')))
    slugs = {c.get('slug', '') for c in ev.get('categories') or []}
    if SKIP_TITLE.search(title) or ev.get('all_day') or ev.get('hide_from_listings'):
        return False
    if not any(s.startswith(CONCERT_CATEGORIES) for s in slugs):
        return 'musikvermittlung' in slugs and bool(MV_KEEP.search(title))
    venue = ev.get('venue') if isinstance(ev.get('venue'), dict) else {}
    return _fold(clean(venue.get('country'))).strip() in SWISS


_NN_RE = re.compile(r'^\s*(n\.?\s*n\.?|tba|tbd|tbc|noch offen|wird bekannt ?gegeben)\s*$', re.I)
_ARTISTS_RE = re.compile(r'<div class="info-title">(.*?)</div>\s*<div class="tribe-events-artists__name">(.*?)</div>', re.S)
_NOTE_RE = re.compile(r'^\(?\s*(pause|ohne pause|zugabe|konzertende|konzertdauer|dauer\b|ende ca)', re.I)
_PART_RE = re.compile(r'^\d+\.\s*(akt|teil|halfte|hälfte)$', re.I)
_PROSE_RE = re.compile(r'bekannt ?gegeben|programm wird|auswahl aus|folgenden werken|präsentiert|musik von .* und anderen'
                       r'|^tba$|^n\.? ?n\.?$', re.I)
_REMARK_RE = re.compile(r'(ur|erst|schweizer erst|europäische erst|deutschsprachige erst)aufführung\b|einzige|im auftrag|'
                        r'auftragswerk|in zusammenarbeit|mit freundlicher|gefördert|anlässlich|zum \d+\.', re.I)
_DURATION_RE = re.compile(r'dauer[^0-9]*?(\d+)\s*(?:std|h)\b\.?(?:\s*(\d+)\s*min)?|dauer[^0-9]*?(\d+)\s*min', re.I)


# a piece of the work listed above it in the same item: 'XV Sostenuto in Des-Dur' under
# '24 Préludes, op. 28', 'VI Juni: Barcarole' under 'Die Jahreszeiten, op. 37a', '2.–4. Satz'
_CHILD_RE = re.compile(r'^(?:[IVXL]{1,4}\s+\S|\d+\.\s*(?:[–-]\s*\d+\.\s*)?Satz\b)')
_CATALOGUE_RE = re.compile(r'\b(?:op\.?|opus|KV|BWV|WoO|Hob\.?|D|RV|HWV|WWV|MWV|BB|Sz\.?|TrV|L\.)\s*[A-Z]?\s*\d')
_PARTICLES = {'van', 'von', 'de', 'da', 'di', 'du', 'la', 'le', 'del', 'della', 'der', 'den', 'ten', 'ter', 'y', 'e',
              'des', 'dos', 'das', 'zu', 'bin', 'al', 'el', 'arr.', 'arr', 'bearb.', 'nach', 'und', 'et', 'and', '&', '/'}


def _catalogue_spaced(text):
    """'Siegfried-Idyll, W W V 103' -> 'WWV 103'; 'MW V N 10' -> 'MWV N 10' (letter-spaced on the page)."""
    t = re.sub(r'\b([A-Z])\s?([A-Z])\s([A-Z])\b(?=\s*(?:[A-Z]\s*)?\d)',
               lambda m: ''.join(m.groups()) if ''.join(m.groups()) in ('WWV', 'MWV', 'BWV', 'HWV', 'TWV') else m.group(0),
               text)
    return re.sub(r'\bK\s+V(?=\s*\d)', 'KV', t)


def _is_name_label(label):
    """A works label that names a composer ('Ludwig van Beethoven', 'Johann Strauss (Sohn)'), not
    a heading of the programme ('Nach dem Requiem')."""
    t = clean(label)
    if not t or len(t) > 70 or re.search(r'\d|[«»"“”„:;!?]', t):
        return False
    words = t.split()
    return len(words) <= 8 and t[0].isupper() and \
        all(not w[:1].islower() or w in _PARTICLES for w in words)


def _parse_page(html):
    """-> dict(credits, program, duration, ticket, info, cancelled)"""
    credits, program, duration, ticket, end_time, last_composer = [], [], None, None, None, ''
    block = html.split('tribe-events-artists', 1)[1] if 'tribe-events-artists' in html else ''
    block = block.split('tribe-events-information', 1)[0]
    for label, names in _ARTISTS_RE.findall(block):
        for name in re.findall(r'<a\b[^>]*>(.*?)</a>', names, re.S) or [names]:
            name = clean(name)
            if _NN_RE.match(name):                     # 'NN': not yet announced
                continue
            for role in (_roles(label, name) if name else []):
                credits.append((role, name))
    works = html.split('tribe-events-works"', 1)[1] if 'tribe-events-works"' in html else ''
    works = works.split('Im Kalender eintragen', 1)[0]
    for item in re.split(r'<li class="tribe-events-works__item">', works)[1:]:
        m = re.search(r'tribe-events-works__label">(.*?)</p>', item, re.S)
        composer = clean(m.group(1)) if m else ''
        composer = re.sub(r'\s*\(\s*(?:\*|geb\.\s*)?\d{3,4}[^)]*\)\s*$', '', composer).strip()
        texts = [clean(t) for t in re.findall(r'tribe-events-works__text">(.*?)</p>', item, re.S)]
        heading = False
        if _NOTE_RE.match(composer):                   # 'Pause: ca. 25 Min.', 'Konzertende ca. 13:10 Uhr'
            texts, composer = [composer] + texts, ''
        elif _PART_RE.match(composer):                 # '1. AKT' / '2. AKT' = first / second half
            composer = ''
        elif composer and not _is_name_label(composer):
            heading, composer = True, ''               # 'Nach dem Requiem' / 'Im Schatten von Beethoven': a heading
        elif composer:
            last_composer = composer
        if heading:
            continue
        inherited = False
        if not composer and any(texts) and not any(_NOTE_RE.match(t) for t in texts):
            composer, inherited = last_composer, True  # an empty label repeats the composer above
        parent, joined = None, set()                   # index of the work the next 'XV …' line belongs to
        for t in texts:
            if t.strip(' _') == '':                    # '_': a separator between the works of one composer
                parent = None
                continue
            t = _catalogue_spaced(t)
            d = _DURATION_RE.search(t) if not composer else None
            if d:
                duration = int(d.group(3)) if d.group(3) else int(d.group(1)) * 60 + int(d.group(2) or 0)
                continue
            m = re.search(r'konzertende\D*(\d{1,2})[:.](\d{2})', t, re.I) if not composer else None
            if m:
                end_time = f'{int(m.group(1)):02d}:{m.group(2)}'
                continue
            if _CHILD_RE.match(t) and parent is not None:
                t = re.sub(r"\s*\|\s*(?:ca\.\s*)?\d+\s*['’‘′`]?\s*(?:min\.?)?\s*$", '', t).strip()
                c, w = program[parent]
                if len(w) + len(t) < 280:              # 'Nocturnes, op. 62: I Nr. 1 in H-Dur', then ', II …'
                    program[parent] = (c, f"{w}{', ' if parent in joined else ': '}{t}")
                    joined.add(parent)
                continue
            if _CHILD_RE.match(t) and parent is False:
                continue                               # a piece of a selection that is not listed as a work
            if not t or _NOTE_RE.match(t) or _REMARK_RE.match(t):
                continue
            if _PROSE_RE.search(t) and not (re.match(r'(?i)auswahl aus\b', t) and _CATALOGUE_RE.search(t)):
                parent = False                         # ('Auswahl aus Mazurkas, op. 59' is a work)
                continue
            if re.fullmatch(r'\([^()]*\)', t):          # '(Martha Argerich, Mikhail Pletnev)': who plays it
                continue
            m = re.fullmatch(r'([^()]{3,80}?)\s*\(([^()]{3,40})\)', t)
            if m and role_for(m.group(2)) in INSTRUMENT_ROLES:   # 'Kristian Mráček (Violine)': a soloist
                credits.append((role_for(m.group(2)), m.group(1)))
                continue
            t = re.sub(r"\s*\|\s*(?:ca\.\s*)?\d+\s*['’‘′`]?\s*(?:min\.?)?\s*(?:\([^()]*\))?\s*$", '', t).strip()
            if t:
                program.append((composer, t))
                parent = len(program) - 1 if _CATALOGUE_RE.search(t) and not _CHILD_RE.match(t) else None
        if composer and not inherited and not any(t for t in texts) and not _PROSE_RE.search(composer):
            program.append((composer, ''))
    m = re.search(r'tribe-events-information[^>]*>(.*?)</div>\s*</div>', html, re.S)
    info = clean(m.group(1)) if m else ''
    for href in re.findall(r'tribe-events-tickets__item[^>]*>\s*<a\b[^>]*href="([^"]+)"', html):
        href = href.replace('&#038;', '&').replace('&amp;', '&')
        if 'testing=true' not in href and 'underShop' not in href:
            ticket = re.sub(r'\?useEmbed=true$', '', href)
            break
    cancelled = bool(re.search(r'>\s*(abgesagt|annulliert|entf[äa]llt)\s*<', html, re.I))
    return {'credits': credits, 'program': program, 'duration': duration, 'ticket': ticket,
            'info': info, 'cancelled': cancelled, 'end_time': end_time}


def _check_info(info, start_iso, url):
    """Cross-check the page's 'Mi, 11. November 2026 | 19:30 Uhr' with the API start."""
    m = re.search(r'(\d{1,2})[:.](\d{2})\s*Uhr', info or '')
    if m and f'{int(m.group(1)):02d}:{m.group(2)}' != start_iso[11:16]:
        log.warning('%s: page says %s:%s but the API says %s (%s)', KEY, m.group(1), m.group(2), start_iso, url)


def _start(e, prefix='start'):
    if e.get(f'utc_{prefix}_date'):
        return to_zurich_iso(e[f'utc_{prefix}_date'], assume='UTC')
    return to_zurich_iso(e.get(f'{prefix}_date'), assume=e.get('timezone') or 'Europe/Zurich')


def fetch():
    today = today_zurich()
    rows = []
    for e in _list_events():
        if not _keep(e):
            continue
        try:
            start = _start(e)
        except ValueError as err:
            log.warning('%s: bad start for %s: %s', KEY, e.get('id'), err)
            continue
        if to_zurich_datetime(start).date() >= today:
            rows.append((start, e))
    rows.sort(key=lambda r: r[0])

    details_by_title, events = {}, []
    for i, (start, e) in enumerate(rows):
        venue = e.get('venue') if isinstance(e.get('venue'), dict) else {}
        title = clean(e.get('title'))
        url = e.get('url')
        tkey = _fold(title)
        details = None
        remaining = len(rows) - i
        if url and requests_left() > 0 and (requests_left() >= remaining or tkey not in details_by_title):
            try:
                details = _parse_page(get(url))
                _check_info(details['info'], start, url)
                details_by_title.setdefault(tkey, details)
            except FetchError as err:
                log.warning('%s: no details for %s: %s', KEY, url, err)
        if details is None and tkey in details_by_title:       # repeat performance: same line-up, own ticket link unknown
            details = dict(details_by_title[tkey], ticket=None, cancelled=False)
        details = details or {'credits': [], 'program': [], 'duration': None, 'ticket': None, 'cancelled': False,
                              'end_time': None}

        slugs = {c.get('slug', '') for c in e.get('categories') or []}
        cats = [clean(c.get('name')) for c in e.get('categories') or []]
        credits = list(details['credits'])
        orchestral = any(s.startswith(('sinfoniekonzerte', 'tourneen')) for s in slugs)
        if orchestral and not any(n == ORCHESTRA for _, n in credits):
            credits.append(('Orchestra', ORCHESTRA))
        if any(s.startswith('kammermusik') for s in slugs):
            kind = 'chamber'
        elif orchestral:
            kind = 'vocal-opera' if guess_type(title) == 'vocal-opera' else 'orchestral'
        else:
            kind = infer_type(title, credits)
        end = None
        if details['duration'] is None and details.get('end_time'):
            end = start[:11] + details['end_time'] + ':00' + start[19:]
        elif details['duration'] is None:
            try:
                end = _start(e, 'end')
                mins = (to_zurich_datetime(end) - to_zurich_datetime(start)).total_seconds() / 60
                end = end if 30 <= mins <= 240 else None
            except ValueError:
                end = None
        series = next((c for c in cats if c and not c.lower().startswith('musikvermittlung')), None)
        try:
            events.append(make_event(
                KEY, e.get('id'), title, start,
                durationMin=details['duration'], end=end,
                city=_city(venue), venueName=clean(venue.get('venue')) or None,
                type=kind, series=series, credits=credits, program=details['program'],
                ticketUrl=details['ticket'] or e.get('website') or None, url=url,
                status='cancelled' if details['cancelled'] or looks_cancelled(title) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, e.get('id'), err)
    return events
