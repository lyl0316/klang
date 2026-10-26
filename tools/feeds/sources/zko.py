"""Zürcher Kammerorchester: concerts from the orchestra's own app API (JSON).

    https://zko.ch/wp-json/app/v1/concerts      one request, all upcoming concerts
    https://zko.ch/konzerte/                    one request, only to learn the event pages' URLs

Quirks (checked against the website on 26 Oct 2026):
- ``datetime_start`` / ``datetime_end`` are UTC although ``timezone`` says "UTC+2" all
  year: 18:30 in winter and 17:30 in summer are both shown as 19:30 on the site
  (``datetime_string_long``). ``further_dates`` holds every performance in Swiss local
  time. The reader checks both readings against ``datetime_string_long`` and follows
  whichever matches, so it keeps working if ZKO ever fixes the label.
- Performers and works are only in the HTML ``description``: works as
  ``<strong>Composer</strong> Title`` lines, performers as ``Name (Rolle)`` lines. Only
  those facts are taken; the text itself is never copied.
- The API has no event page URL. ``/konzerte/`` lists the Zürich concerts with their
  pages; for the rest the WordPress short link ``/?post_type=noisa_events&p=<id>``
  (which redirects to the event page) is used.

Skipped: children's and family formats (Kinder-, Nuggi-, Krabbel-, Purzel-, ABC-Konzert,
Junges ZKO), talks without performers (Neuland), open rehearsals without a programme
(Hereinspaziert!), and tours abroad ("ZKO on Tour - International" or a venue outside
Switzerland).
"""
from __future__ import annotations

import html as _html
import re
from datetime import datetime

from common import (FetchError, clean, get, get_json, guess_type, log, looks_cancelled, make_event,
                    to_zurich_datetime, to_zurich_iso)

KEY = 'zko'
NAME = 'Zürcher Kammerorchester'
SITE = 'https://zko.ch/'
ATTRIBUTION = 'Source: Zürcher Kammerorchester (zko.ch)'
KIND = 'orchestra'
MAX_REQUESTS = 6
TIME_LIMIT = 120

API_URL = 'https://zko.ch/wp-json/app/v1/concerts'
LISTING_URL = 'https://zko.ch/konzerte/'
SHORTLINK = 'https://zko.ch/?post_type=noisa_events&p={id}'
ORCHESTRA = 'Zürcher Kammerorchester'

# ---------------------------------------------------------------------------
# what to skip
# ---------------------------------------------------------------------------

_KIDS_RE = re.compile(r'kinderkonzert|nuggi|krabbel|purzel|abc-konzert|familienkonzert|junges zko|schulkonzert', re.I)
_ABROAD_RE = re.compile(r'on tour\s*-\s*international', re.I)
_REHEARSAL_RE = re.compile(r'orchesterprobe|offene probe|öffentliche probe|probenbesuch', re.I)
_SWISS_COUNTRY = {'', 'switzerland', 'schweiz', 'suisse', 'svizzera', 'ch'}

# venue name fragment -> city, for venues the API gives without a city
_VENUE_CITY = (
    ('zürich', 'Zürich'), ('zuerich', 'Zürich'), ('zko-haus', 'Zürich'), ('höngg', 'Zürich'),
    ('fraumünster', 'Zürich'), ('grossmünster', 'Zürich'), ('opernhaus', 'Zürich'), ('tonhalle', 'Zürich'),
    ('kkl', 'Luzern'), ('luzern', 'Luzern'), ('lucerne', 'Luzern'), ('lac lugano', 'Lugano'), ('lugano', 'Lugano'),
    ('chur', 'Chur'), ('zug', 'Zug'), ('winterthur', 'Winterthur'), ('basel', 'Basel'), ('bern', 'Bern'),
    ('st. gallen', 'St. Gallen'), ('genève', 'Genève'), ('genf', 'Genève'), ('lausanne', 'Lausanne'),
    ('gstaad', 'Gstaad'), ('verbier', 'Verbier'), ('baden', 'Baden'), ('aarau', 'Aarau'),
)

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
    'gesang': 'Voice', 'stimme': 'Voice',
    'erzählung': 'Narrator', 'erzähler': 'Narrator', 'erzählerin': 'Narrator', 'sprecher': 'Narrator',
    'sprecherin': 'Narrator', 'rezitation': 'Narrator', 'lesung': 'Narrator', 'schauspiel': 'Narrator',
    'moderation': 'Presenter', 'konzertmeister': 'Concertmaster', 'konzertmeisterin': 'Concertmaster',
}
_INSTRUMENTISH = re.compile(r'(phon|flöte|horn|tuba|geige|violine|viola|bass|harfe|klavier|orgel|trompete|posaune|'
                            r'cello|gitarre|schlagzeug|zither|hackbrett|laute|akkordeon|elektronik|keyboard|'
                            r'synthesizer|marimba|vibraphon|celesta|sopran|tenor|bariton|alt|stimme|gesang|harmonika)$')
# roles of people who do not perform: left out
_OFFSTAGE = {'konzept', 'konzeption', 'dramaturgie', 'regie', 'inszenierung', 'choreografie', 'choreographie',
             'einstudierung', 'komposition', 'arrangement', 'bühne', 'kostüme', 'licht', 'video', 'ton'}


def _role(text):
    """German role text -> English role ('Performer' if unknown), None for off-stage roles."""
    t = clean(text).strip(' ,;:')
    t = re.sub(r'\s*\([^)]*\)', '', t).strip()          # "Klavier (Artist in Residence)"
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
            mapped.append(p[:1].upper() + p[1:])        # an instrument we do not translate
        else:
            mapped.append('Performer')                  # e.g. an opera character
    if len(mapped) > 1 and 'Performer' in mapped:
        mapped = [m for m in mapped if m != 'Performer']
    if not mapped:
        return None if offstage else 'Performer'
    if 'Conductor' in mapped and len(mapped) > 1:            # "Violine und Leitung"
        others = [m for m in mapped if m != 'Conductor']
        return ' & '.join(others) + ' & direction'
    return ' & '.join(dict.fromkeys(mapped))


def _known_role(text):
    """The English role when ``text`` consists only of role words ('' for off-stage roles),
    else None (then it is probably a work title)."""
    t = re.sub(r'\s*\([^)]*\)', '', clean(text)).strip(' ,;:')
    if not t or len(t) > 50:
        return None
    parts = [p.strip() for p in re.split(r'\s*(?:,|/|&|\bund\b)\s*', t.lower()) if p.strip()]
    if parts and all(p in _ROLE_WORDS or p in _OFFSTAGE for p in parts):
        return _role(t) or ''
    return None


_CHOIR_RE = re.compile(r'(chor\b|chor\s|chöre|choir|chorus|choeur|chœur|\bcoro|vokalensemble|vocal ensemble|singers|'
                       r'sängerknaben|kantorei|vocalisten|vokalisten|\bvocale\b|\bvocal\b)', re.I)
_ORCH_RE = re.compile(r'(orchest|orquesta|philharmon|filarm|sinfoniett|symphoniker|sinfoniker|camerata|harmonie\b|'
                      r'musikkollegium|concert olympique)', re.I)
_ENS_RE = re.compile(r'(ensemble|quartett|quartet|quatuor|quartetto|trio\b|quintett|quintet|consort|musiker|musician|'
                     r'solisten|sängerinnen|sänger|collegium|duo\b|academy|akademie|players)', re.I)


def _group_role(name):
    """'Orchestra' / 'Choir' / 'Ensemble' when the name is obviously a group, else None."""
    members = re.search(r'musiker|mitglieder|members', name, re.I)
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


# ---------------------------------------------------------------------------
# description -> works and performers (facts only)
# ---------------------------------------------------------------------------

_STOP_RE = re.compile(r'^(weitere|letztes|letzte|nächste|mit freundlicher|unterstützt|in kooperation|veranstalter|'
                      r'ticket|einzeltickets|tickets|altersempfehlung|das konzert ist|kinder bis|erwachsene)', re.I)
_NOT_A_NAME_RE = re.compile(r'(\d|ticket|chf|uhr\b|©|http|www\.|programm|konzert|werke von|weitere|folgt|ansage|'
                            r'altersempfehlung|kooperation|veranstalter|catering|gratis|erhältlich|verfügbar)', re.I)
_GROUP_REJECT_RE = re.compile(r'(\d|ticket|chf|uhr\b|©|http|www\.|weitere|folgt|ansage|altersempfehlung|kooperation|'
                              r'veranstalter|catering|gratis|erhältlich|verfügbar|in kürze|werke von|\bmit\b|\bvon\b)', re.I)
_STRONG_LINE_RE = re.compile(r'^\s*(?:<[^>]+>\s*)*?<(strong|b)>(.*?)</\1>(.*)$', re.I | re.S)


def _lines(description):
    text = (description or '').replace('\r', '')
    text = re.sub(r'(?i)<br\s*/?>|</p>|<p[^>]*>|\n', '\n', text)
    return [ln.strip() for ln in text.split('\n')]


def _looks_like_name(text):
    if not text or len(text) > 70 or _NOT_A_NAME_RE.search(text):
        return False
    words = text.split()
    return 1 <= len(words) <= 7 and text[0].isupper()


def parse_description(description):
    """-> (program [(composer, title)], credits [(role, name)]). Facts only."""
    program, credits = [], []
    for raw in _lines(description):
        if not raw:
            continue
        plain = clean(raw)
        if not plain:
            continue
        if _STOP_RE.match(plain) or plain.startswith(('- ', '– ', '—')):
            # "Weitere Konzerte ...", ticket and partner lines: nothing after these on the line
            continue
        if '©' in plain or 'http' in plain.lower():
            continue
        m = _STRONG_LINE_RE.match(raw)
        if m:
            name = clean(m.group(2)).strip(' ,:;–-')
            rest = clean(m.group(3)).strip(' ,:;–-')
            if not name or name.endswith(':'):
                continue
            role = _known_role(rest) if rest else None
            if rest and role is None:
                if _looks_like_name(name):
                    program.append((name, rest))      # <strong>Composer</strong> Title
            elif role:
                credits.append((role, name))          # <strong>Name</strong> Role (tour pages)
            elif not rest and _group_role(name) and not _GROUP_REJECT_RE.search(name):
                credits.append((_group_role(name), name))
            continue
        pm = re.match(r'^(.+?)\s*\(([^()\d]{2,60})\)$', plain)
        if pm and _looks_like_name(pm.group(1)):
            role = _role(pm.group(2))
            if role:
                credits.append((role, pm.group(1)))
            continue
        if (_group_role(plain) and len(plain) <= 80 and len(plain.split()) <= 9 and not plain.endswith('.')
                and not _GROUP_REJECT_RE.search(plain)):
            credits.append((_group_role(plain), plain))
    return program, credits


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _city(location, is_tour):
    loc = location or {}
    city = clean(loc.get('city'))
    if city:
        return {'zurich': 'Zürich', 'zuerich': 'Zürich'}.get(city.lower(), city)
    name = clean(loc.get('name')).lower()
    for frag, c in _VENUE_CITY:
        if frag in name:
            return c
    return None if is_tour else 'Zürich'               # home concerts are in Zürich; a Swiss tour stop: unknown


def _swiss(location):
    country = clean((location or {}).get('country')).lower()
    return country in _SWISS_COUNTRY


def _hhmm(text):
    m = re.search(r'\b(\d{1,2})[:.](\d{2})\b', text or '')
    return f'{int(m.group(1)):02d}:{m.group(2)}' if m else None


def _naive(value):
    try:
        return datetime.strptime(str(value).strip()[:19], '%Y-%m-%d %H:%M:%S')
    except ValueError:
        return datetime.strptime(str(value).strip()[:16], '%Y-%m-%d %H:%M')


def _zone_of_start(e):
    """'UTC' or 'Europe/Zurich': how ``datetime_start`` must be read, judged by the time the
    site shows (``datetime_string_long`` / ``_timeframe``)."""
    shown = _hhmm(e.get('datetime_string_long')) or _hhmm(e.get('datetime_string_timeframe'))
    start = e.get('datetime_start')
    if not start or not shown:
        return 'UTC'
    as_utc = to_zurich_datetime(_naive(start), assume='UTC').strftime('%H:%M')
    as_local = _naive(start).strftime('%H:%M')
    if as_utc == shown:
        return 'UTC'
    if as_local == shown:
        return 'Europe/Zurich'
    log.warning('zko %s: start %s matches neither UTC nor local time of %r; assuming UTC',
                e.get('id'), start, e.get('datetime_string_long'))
    return 'UTC'


def _performances(e):
    """-> list of (start_iso, end_iso|None, ticket_url|None, is_main) for every date of a concert."""
    zone = _zone_of_start(e)
    main = to_zurich_iso(_naive(e['datetime_start']), assume=zone)
    main_end = None
    if e.get('datetime_end'):
        try:
            main_end = to_zurich_iso(_naive(e['datetime_end']), assume=zone)
        except ValueError:
            main_end = None
    out = []
    further = [f for f in (e.get('further_dates') or []) if isinstance(f, dict) and f.get('datetime_start')]
    if further:
        # further_dates are Swiss local time today; check against the main start in case that changes
        local = [to_zurich_iso(_naive(f['datetime_start']), assume='Europe/Zurich') for f in further]
        utc = [to_zurich_iso(_naive(f['datetime_start']), assume='UTC') for f in further]
        starts = local if main in local or main not in utc else utc
        f_zone = 'Europe/Zurich' if starts is local else 'UTC'
        for f, s in zip(further, starts):
            end = None
            if f.get('datetime_end'):
                try:
                    end = to_zurich_iso(_naive(f['datetime_end']), assume=f_zone)
                except ValueError:
                    end = None
            out.append((s, end, f.get('url') or None, s == main))
        if not any(p[3] for p in out):
            out.append((main, main_end, e.get('url') or None, True))
    else:
        out.append((main, main_end, e.get('url') or None, True))
    return out


def _type(title, categories, credits):
    roles = {r for r, _ in credits}
    if re.search(r'kammermusik', title, re.I):
        return 'chamber'
    if 'Choir' in roles or guess_type(title) == 'vocal-opera' or re.search(r'\bgesang\b|\boper', f'{title} {categories}', re.I):
        return 'vocal-opera'
    t = guess_type(f'{title} {categories}')
    if t and t != 'orchestral':
        return t
    if 'Orchestra' in roles:
        return 'orchestral'
    players = [n for r, n in credits if r not in ('Orchestra', 'Ensemble', 'Choir', 'Presenter', 'Narrator')]
    if 'Ensemble' not in roles and 2 <= len(players) <= 9:
        return 'chamber'
    return t


def _series(title, categories):
    m = re.match(r'^(.{3,40}?)\s+—\s+\S', title)          # "Kammermusik@ZKO — Elegien der Stille"
    if m:
        return m.group(1).strip()
    m = re.match(r'^(ZKO on Tour)\s*:', title, re.I)
    if m:
        return m.group(1)
    if re.search(r'\bAbo-Konzerte\b', categories or ''):
        return 'Abo-Konzerte'
    return None


def _norm_title(text):
    return re.sub(r'[^a-z0-9]+', ' ', clean(_html.unescape(text or '')).lower()).strip()


def page_urls(listing_html):
    """{(dd/mm, normalised title): event page URL} from https://zko.ch/konzerte/."""
    out = {}
    for m in re.finditer(r'<a href="(https://zko\.ch/events/[^"]+)"[^>]*>(.*?)</a>', listing_html or '', re.S):
        block = m.group(2)
        date = re.search(r'class="event-date">\s*([^<]+?)\s*<', block)
        title = re.search(r'class="grid-title">(.*?)</h2>', block, re.S)
        if date and title:
            out.setdefault((date.group(1).strip(), _norm_title(title.group(1))), m.group(1))
    return out


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def parse(data, pages=None):
    """API JSON (+ optional page URL map) -> list of events."""
    if not isinstance(data, list):
        raise ValueError(f'unexpected API answer: {type(data).__name__}')
    pages = pages or {}
    events, skipped = [], {}

    def skip(why):
        skipped[why] = skipped.get(why, 0) + 1

    for e in data:
        if not isinstance(e, dict) or not e.get('id') or not e.get('title') or not e.get('datetime_start'):
            skip('incomplete')
            continue
        title = clean(e['title'])
        categories = clean(e.get('categories') if isinstance(e.get('categories'), str) else '')
        location = e.get('location') if isinstance(e.get('location'), dict) else {}
        is_tour = bool(re.search(r'on tour', f'{title} {categories}', re.I))
        if _KIDS_RE.search(f'{title} {categories}'):
            skip('children/family')
            continue
        if _ABROAD_RE.search(categories) or not _swiss(location):
            skip('abroad')
            continue
        city = _city(location, is_tour)
        program, credits = parse_description(e.get('description'))
        if not credits and e.get('artists'):
            credits = [(_group_role(a) or 'Performer', a) for a in re.split(r'\s*/\s*', clean(e['artists'])) if a]
        performers = [c for c in credits if c[0] not in ('Presenter',)]
        if not program and not performers:
            skip('talk/no performers')
            continue
        if not program and _REHEARSAL_RE.search(clean(e.get('description'))):
            skip('open rehearsal')                  # "Hereinspaziert!": seats inside a rehearsal, no programme
            continue
        venue = clean(location.get('name')).rstrip('.') or None
        if venue and re.fullmatch(r'(?i)hauptbühne opernhaus', venue):
            venue = 'Opernhaus Zürich, Hauptbühne'            # matches Klang's own venue name
        cancelled = looks_cancelled(title) or looks_cancelled(e.get('datetime_string_timeframe') or '')
        try:
            dates = _performances(e)
        except (ValueError, TypeError) as err:
            log.warning('zko %s: unreadable date: %s', e.get('id'), err)
            skip('bad date')
            continue
        dm = to_zurich_datetime(dates[0][0]).strftime('%d/%m')
        url = pages.get((dm, _norm_title(title))) or SHORTLINK.format(id=int(e['id']))
        kind = _type(title, categories, credits)
        series = _series(title, categories)
        for start, end, ticket, is_main in dates:
            sid = str(e['id']) if is_main else f"{e['id']}-{start[:16].replace('-', '').replace(':', '').replace('T', '')}"
            try:
                events.append(make_event(
                    KEY, sid, title, start, end=end, city=city, venueName=venue, type=kind, series=series,
                    credits=credits, program=program, ticketUrl=ticket or e.get('url') or None, url=url,
                    status='cancelled' if cancelled else 'scheduled'))
            except ValueError as err:
                log.warning('zko %s: skipped: %s', e.get('id'), err)
    if skipped:
        log.info('zko: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    return events


def fetch():
    data = get_json(API_URL)                    # FetchError propagates: build reuses yesterday's events
    pages = {}
    try:
        pages = page_urls(get(LISTING_URL))
    except FetchError as err:                    # the page URLs are a nicety; short links still work
        log.warning('zko: concert listing unavailable (%s); using short links', err)
    return parse(data, pages)
