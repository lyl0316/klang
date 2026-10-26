"""Orchestra della Svizzera italiana (OSI): concerts in Lugano, Ticino and elsewhere in Switzerland.

osi.swiss is a Nuxt site backed by Storyblok. The page "Tutti i concerti"
(https://www.osi.swiss/concerti/tutti-i-concerti/) embeds the whole season in its
__NUXT_DATA__ payload: the Pinia store "osi-concerts" holds every concert story with its
title, date ("2026-11-12 20:00", Swiss local time), city, venue, series ("stagione"),
conductor, soloists, programme (composer + work) and ticket link. Soloists' instruments are
references to "instrument" stories; most are resolved elsewhere in the same payload. Only
when one is not is the concert's own page (/concerti/tutti-i-concerti/2026-11-12-20-00)
fetched, which resolves it. A normal run therefore needs one request plus a few.
robots.txt allows everything; common.get() keeps its default pace.

Kept: future concerts in Switzerland. Skipped: tour dates abroad, school concerts and
family/children's events of the "be connected" outreach series. Some concert pages answer
HTTP 422 (a site-side error); those concerts keep the listing's facts, with role
"Performer" for a soloist whose instrument could not be resolved.
"""
from __future__ import annotations

import json
import re
import unicodedata

from common import (BudgetExceeded, FetchError, clean, get, guess_type, log, looks_cancelled,
                    make_event, requests_left, to_zurich_iso, today_zurich)

KEY = 'osi'
NAME = 'Orchestra della Svizzera italiana'
SITE = 'https://www.osi.swiss/'
ATTRIBUTION = 'Source: Orchestra della Svizzera italiana (osi.swiss)'
KIND = 'orchestra'
MAX_REQUESTS = 60
TIME_LIMIT = 600

BASE = 'https://www.osi.swiss'
LISTING_URL = BASE + '/concerti/tutti-i-concerti/'
ORCHESTRA = 'Orchestra della Svizzera italiana'

# Italian city names -> the local names Klang uses
CITY_NAMES = {
    'lucerna': 'Luzern', 'zurigo': 'Zürich', 'ginevra': 'Genève', 'berna': 'Bern', 'basilea': 'Basel',
    'losanna': 'Lausanne', 'san gallo': 'St. Gallen', 'coira': 'Chur', 'friburgo': 'Fribourg',
    'sion': 'Sion', 'sitten': 'Sion', 'soletta': 'Solothurn', 'sciaffusa': 'Schaffhausen',
    'neuchatel': 'Neuchâtel', 'zugo': 'Zug', 'thun': 'Thun', 'winterthur': 'Winterthur',
}
# Swiss places OSI plays in (used to keep the Swiss dates of a tour)
SWISS = {
    'lugano', 'bellinzona', 'locarno', 'mendrisio', 'chiasso', 'ascona', 'muralto', 'minusio',
    'porza', 'massagno', 'paradiso', 'biasca', 'faido', 'airolo', 'giubiasco', 'balerna', 'stabio',
    'agno', 'caslano', 'morcote', 'brissago', 'losone', 'tenero', 'gordola', 'riva san vitale',
    'monte verita', 'olivone', 'acquarossa', 'sonogno', 'cevio', 'maggia', 'novazzano', 'coldrerio',
    'castel san pietro', 'vacallo', 'capriasca', 'tesserete', 'savosa', 'sorengo', 'collina d oro',
    'luzern', 'lucerna', 'zurich', 'zurigo', 'geneve', 'ginevra', 'bern', 'berna', 'basel', 'basilea',
    'lausanne', 'losanna', 'st. gallen', 'san gallo', 'chur', 'coira', 'fribourg', 'friburgo',
    'sion', 'solothurn', 'soletta', 'schaffhausen', 'neuchatel', 'zug', 'zugo', 'thun', 'winterthur',
    'st. moritz', 'san moritz', 'davos', 'gstaad', 'verbier', 'montreux', 'vevey', 'baden', 'aarau',
    'andermatt', 'engelberg', 'ernen', 'interlaken', 'brig', 'sils', 'pontresina', 'poschiavo',
    'roveredo', 'mesocco', 'grono',
}
VENUES = {'lac': 'LAC Lugano Arte e Cultura', 'hall del lac': 'LAC Lugano Arte e Cultura, Hall',
          'docks': 'Docks', 'kkl': 'KKL Luzern'}

SKIP_RE = re.compile(r'(scuol|school|bambin|famigli|family|kids|fiaba|festa del pap|festa della mamm|'
                     r'laborator|workshop|prova aperta|prove aperte|conferenz|incontro|visita guidata|'
                     r'gala\b|ballo\b)', re.I)

ROLES = [
    (r'^(direttore|direttrice|direzione|maestro concertatore)', 'Conductor'),
    (r'^(pianoforte|piano)( e .*)?$', 'Piano'), (r'^violino( e .*)?$', 'Violin'), (r'^viola$', 'Viola'),
    (r'^violoncello$', 'Cello'), (r'^contrabbasso$', 'Double bass'), (r'^flauto$', 'Flute'),
    (r'^oboe$', 'Oboe'), (r'^clarinetto$', 'Clarinet'), (r'^fagotto$', 'Bassoon'), (r'^corno$', 'Horn'),
    (r'^tromba$', 'Trumpet'), (r'^trombone$', 'Trombone'), (r'^tuba$', 'Tuba'), (r'^arpa$', 'Harp'),
    (r'^clavicembalo$', 'Harpsichord'), (r'^organo$', 'Organ'), (r'^percussion[ei]$', 'Percussion'),
    (r'^chitarra$', 'Guitar'), (r'^mandolino$', 'Mandolin'), (r'^fisarmonica$', 'Accordion'),
    (r'^sassofono$', 'Saxophone'), (r'^marimba$', 'Marimba'),
    (r'^soprano$', 'Soprano'), (r'^mezzo-?soprano$', 'Mezzo-soprano'), (r'^(contralto|alto)$', 'Alto'),
    (r'^tenore$', 'Tenor'), (r'^baritono$', 'Baritone'), (r'^basso$', 'Bass'),
    (r'^controtenore$', 'Countertenor'), (r'^voce recitante$|^narrat', 'Narrator'),
    (r'^presentat', 'Presenter'), (r'^coro$', 'Choir'), (r'^orchestra$', 'Orchestra'),
]
GROUP_RE = re.compile(r'(orchestr|ensemble|quartet|quartett|trio\b|quintet|coro\b|choir|chor\b|'
                      r'cappella|consort|camerata|accademia|solisti)', re.I)
CHOIR_RE = re.compile(r'(coro\b|choir|chor\b|cappella|vocal)', re.I)
ORCH_RE = re.compile(r'(orchestr|philharm|sinfoni|camerata)', re.I)


# ---------------------------------------------------------------------------
# Nuxt __NUXT_DATA__ (devalue) payload, read lazily
# ---------------------------------------------------------------------------

_WRAPPERS = {'Reactive', 'ShallowReactive', 'Ref', 'ShallowRef', 'EmptyRef', 'EmptyShallowRef', 'NuxtError'}


class Payload:
    """Lazy reader for Nuxt's devalue array: values are only resolved when they are read,
    so no deep recursion happens (readers run in a worker thread with a small stack)."""

    def __init__(self, html_text):
        m = re.search(r'<script[^>]*\bid="__NUXT_DATA__"[^>]*>(.*?)</script>', html_text, re.S)
        if not m:
            raise ValueError('no __NUXT_DATA__ payload')
        self.arr = json.loads(m.group(1))

    def at(self, i):
        """Resolve index i one level: wrappers are unwrapped, containers keep index children."""
        for _ in range(50):
            if not isinstance(i, int) or isinstance(i, bool):
                return i
            if i < 0 or i >= len(self.arr):
                return None
            v = self.arr[i]
            if isinstance(v, list) and v and isinstance(v[0], str) and v[0] in _WRAPPERS:
                i = v[1] if len(v) > 1 else -1
                continue
            if isinstance(v, list) and v and isinstance(v[0], str) and v[0] in ('Date',):
                return v[1] if len(v) > 1 else None
            return v
        return None

    def get(self, node, *path):
        """Follow keys / list positions from a resolved node: get(story, 'content', 'title')."""
        for key in path:
            if isinstance(node, dict):
                node = self.at(node.get(key)) if key in node else None
            elif isinstance(node, list) and isinstance(key, int):
                node = self.at(node[key]) if -len(node) <= key < len(node) else None
            else:
                return None
        return node

    def items(self, node):
        return [self.at(x) for x in node] if isinstance(node, list) else []

    def text(self, node, depth=0):
        """Plain text of a Storyblok rich-text document (or a plain string)."""
        if isinstance(node, str):
            return node
        if depth > 30:
            return ''
        if isinstance(node, dict):
            if self.at(node.get('type')) == 'text':
                return self.at(node.get('text')) or ''
            parts = [self.text(c, depth + 1) for c in self.items(self.at(node.get('content')))]
            sep = '\n' if self.at(node.get('type')) in ('doc', 'bullet_list', 'ordered_list') else ''
            return sep.join(p for p in parts if p)
        if isinstance(node, list):
            return '\n'.join(self.text(self.at(c), depth + 1) for c in node)
        return ''


def _store(p, name):
    """A Pinia store from the payload (e.g. 'osi-concerts', 'page')."""
    root = p.at(0)
    return p.get(root, 'pinia', name)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _fold(s):
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9. ]+", ' ', s).strip()


def _city(raw):
    c = clean(raw)
    return CITY_NAMES.get(_fold(c), c) if c else None


def _venue(raw):
    v = clean(raw)
    if not v:
        return None
    return VENUES.get(_fold(v), v.title() if v.isupper() and len(v) > 4 else v)


def _role(raw):
    t = _fold(raw)
    for rx, out in ROLES:
        if re.search(rx, t):
            return out
    return None


UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)


def _instruments(p):
    """Role uuid -> name ('c23c1ed9-…' -> 'Pianoforte') for the role stories present in the payload."""
    out = {}
    for v in p.arr:
        if isinstance(v, dict) and 'uuid' in v and 'content' in v:
            c = p.at(v['content'])
            if isinstance(c, dict) and p.get(c, 'component') == 'instrument':
                uuid, name = p.at(v['uuid']), p.get(c, 'name')
                if isinstance(uuid, str) and isinstance(name, str):
                    out[uuid] = clean(name)
    return out


def _person(p, node, instruments=None):
    """(name, role_text) of a Storyblok musician story or a listing artist dict. role_text is
    None when the role is unknown, and the string 'UNRESOLVED' when it is an unknown uuid."""
    if not isinstance(node, dict):
        return None, None
    content = p.get(node, 'content')
    src = content if isinstance(content, dict) and ('name' in content or 'lastname' in content) else node
    first = clean(p.get(src, 'name') or '')
    last = clean(p.get(src, 'lastname') or '')
    name = f'{first} {last}'.strip()
    role = p.get(src, 'role')
    if isinstance(role, dict):
        role = p.get(role, 'name') or p.get(role, 'content', 'name')
    if isinstance(role, str) and UUID_RE.match(role.strip()):
        role = (instruments or {}).get(role.strip(), 'UNRESOLVED')
    return name or None, clean(role) if isinstance(role, str) and role.strip() else None


def _credits_of(p, content, instruments=None):
    """[(role, name)] and whether some role could not be resolved from the payload."""
    credits, unresolved = [], False
    director = p.get(content, 'director')
    if isinstance(director, dict):
        name, role = _person(p, director, instruments)
        if name:
            credits.append(('Conductor', name))
            if role == 'UNRESOLVED':
                unresolved = True
            elif role and re.search(r'play\s*&\s*conduct', role, re.I):
                # a play-and-conduct director ("Play&Conduct - Violino") also plays a solo part
                inst = _role(re.sub(r'(?i).*play\s*&\s*conduct[\s.:,–-]*', '', role))
                if inst and inst != 'Conductor':
                    credits.append((inst, name))
    for m in p.items(p.get(content, 'musicians')):
        name, role = _person(p, m, instruments)
        if not name:
            continue
        r = role or ''
        if r == 'UNRESOLVED':
            unresolved, r = True, ''
        if re.search(r'play\s*&\s*conduct', r, re.I):          # "Play&Conduct - Mandolino"
            credits.append(('Conductor', name))
            r = re.sub(r'(?i).*play\s*&\s*conduct[\s.:,–-]*', '', r)    # "Play&Conduct.- Pianoforte"
        mapped = _role(r)
        if mapped:
            credits.append((mapped, name))
        elif r and not GROUP_RE.search(name):
            credits.append((r[:1].upper() + r[1:], name))
        elif GROUP_RE.search(name) or _fold(r) in ('quartetto', 'coro', 'ensemble'):
            credits.append(('Choir' if CHOIR_RE.search(name) or _fold(r) == 'coro' else
                            'Orchestra' if ORCH_RE.search(name) else 'Ensemble', name))
        else:
            credits.append(('Performer', name))
    orchestras = []
    for o in p.items(p.get(content, 'orchestra')):
        if isinstance(o, str):
            orchestras.append(clean(o))
        elif isinstance(o, dict):
            n = p.get(o, 'content', 'name') or p.get(o, 'name')
            if isinstance(n, str) and clean(n):
                orchestras.append(clean(n))
    for o in orchestras or [ORCHESTRA]:
        credits.append(('Choir' if CHOIR_RE.search(o) else 'Orchestra', o))
    return credits, unresolved


def _program_of(p, content):
    program = []
    for it in p.items(p.get(content, 'program_items')):
        if not isinstance(it, dict):
            continue
        composer = clean(p.get(it, 'composer_name') or '')
        work = clean(p.text(p.get(it, 'piece_of_music')) or '')
        if not composer or len(composer) > 60 or re.search(r'[:…!?]|\.\s|\btutte le\b', composer):
            continue                       # empty spacer rows and free-text notes
        program.append((composer, work))
    return program


def _ticket_of(p, content):
    for t in p.items(p.get(content, 'ticket_link')):
        if isinstance(t, dict):
            url = p.get(t, 'link', 'url') or p.get(t, 'link', 'cached_url')
            if isinstance(url, str) and url.startswith('http'):
                return url
    return None


# ---------------------------------------------------------------------------
# fetch
# ---------------------------------------------------------------------------

def _record(p, story, instruments):
    """Normalised facts of one concert story (listing store or concert page)."""
    content = p.get(story, 'content')
    if not isinstance(content, dict) or p.get(content, 'component') not in (None, 'concert'):
        return None
    stagione = p.get(content, 'stagione')
    if isinstance(stagione, dict):
        stagione = p.get(stagione, 'name') or p.get(stagione, 'content', 'name')
    main_name, _ = _person(p, p.get(content, 'main_artist'), instruments)
    credits, unresolved = _credits_of(p, content, instruments)
    slug = p.get(story, 'full_slug')
    return {
        'id': p.get(story, 'id'), 'title': clean(p.get(content, 'title') or ''), 'main': main_name,
        'date': p.get(content, 'date'), 'city': p.get(content, 'city'), 'address': p.get(content, 'address'),
        'stagione': clean(stagione) if isinstance(stagione, str) else None,
        'link': '/' + slug.strip('/') if isinstance(slug, str) and slug else None,
        'credits': credits, 'unresolved': unresolved,
        'program': _program_of(p, content), 'ticket': _ticket_of(p, content), 'full': True,
    }


def _listing(page):
    """Concert records from the 'Tutti i concerti' page. The Pinia store 'osi-concerts' holds
    the full Storyblok stories; the useAsyncData state holds a flat summary (fallback)."""
    p = Payload(page)
    instruments = _instruments(p)
    out = []
    store = _store(p, 'osi-concerts')
    concerts = p.get(store, 'concerts') if isinstance(store, dict) else None
    for story in p.items(concerts):
        if isinstance(story, dict) and isinstance(p.get(story, 'content'), dict):
            rec = _record(p, story, instruments)
            if rec:
                out.append(rec)
    if out:
        return out
    state = p.get(p.at(0), 'state') or {}
    flat = next((p.get(state, k) for k in state if k.startswith('$sconcerts-') and 'WithoutDate' not in k), None)
    for c in p.items(flat):
        if not isinstance(c, dict):
            continue
        main_name, _ = _person(p, p.get(c, 'mainArtist'), instruments)
        out.append({
            'id': p.get(c, 'id'), 'title': '', 'main': main_name, 'date': p.get(c, 'date'),
            'city': p.get(c, 'city'), 'address': p.get(c, 'address'), 'stagione': p.get(c, 'stagione'),
            'link': p.get(c, 'link'), 'credits': [], 'unresolved': True, 'program': [], 'ticket': None,
            'full': False,
        })
    if not out:
        raise ValueError('concert list not found in the page data')
    return out


def _detail(page):
    p = Payload(page)
    story = p.get(_store(p, 'page'), 'story')
    rec = _record(p, story, _instruments(p)) if isinstance(story, dict) else None
    if not rec or not rec.get('date'):
        raise ValueError('no concert record on the page')
    return rec


def _swiss(city, stagione):
    if not re.search(r'tourn', stagione or '', re.I):
        return True                        # the regular series play in Ticino
    return _fold(city) in SWISS


def _local_iso(value):
    m = re.match(r'^\s*(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})', value or '')
    if not m:
        raise ValueError(f'unreadable date {value!r}')
    return to_zurich_iso(f'{m.group(1)}T{int(m.group(2)):02d}:{m.group(3)}:00')


def _skip(rec):
    text = ' '.join(filter(None, [rec.get('title'), rec.get('main')]))
    return bool(SKIP_RE.search(text)) or not _swiss(rec.get('city'), rec.get('stagione'))


def fetch():
    today = today_zurich().isoformat()
    listing = _listing(get(LISTING_URL))       # a failure here propagates
    wanted = [r for r in listing
              if isinstance(r.get('date'), str) and r['date'][:10] >= today and not _skip(r)]
    wanted.sort(key=lambda r: r['date'])

    events, details_on = [], True
    for rec in wanted:
        url = BASE + rec['link'] if isinstance(rec.get('link'), str) and rec['link'].startswith('/') else None
        # the concert page resolves instrument names the listing only gives as ids
        if rec['unresolved'] and details_on and url and requests_left() > 0:
            try:
                d = _detail(get(url))
                merged = dict(rec)
                merged.update({k: v for k, v in d.items() if v not in (None, '', [])})
                merged['unresolved'] = d['unresolved']
                rec = merged
            except BudgetExceeded:
                details_on = False
            except FetchError as e:
                log.info('%s: %s: %s (using the listing only)', KEY, url, e)
            except Exception as e:
                log.warning('%s: could not read %s: %s', KEY, url, e)
        if _skip(rec):
            continue
        try:
            events.append(_event(rec, url))
        except ValueError as e:
            log.warning('%s: skipped %s: %s', KEY, url or rec.get('date'), e)
    return events


def _event(rec, url):
    # the page headline is the main artist ("Francesco Piemontesi", "Lunch with OSI"); the
    # story title is only used in <title> and is sometimes stale (copied from another concert)
    title = rec.get('main') or rec.get('title') or ORCHESTRA
    stagione = rec.get('stagione')
    credits = rec.get('credits') or [('Orchestra', ORCHESTRA)]
    program = rec.get('program') or []
    kind = guess_type(' '.join([title, stagione or ''] + [w for _, w in program]))
    if kind in (None, 'chamber') and any(r == 'Conductor' for r, _ in credits) and \
            any(r == 'Orchestra' for r, _ in credits):
        kind = 'orchestral'
    sid = rec.get('id') or (rec.get('link') or '').rstrip('/').rsplit('/', 1)[-1]
    return make_event(
        KEY, sid, title, _local_iso(rec['date']),
        city=_city(rec.get('city')), venueName=_venue(rec.get('address')), type=kind,
        series=stagione, credits=credits, program=program, ticketUrl=rec.get('ticket'), url=url,
        status='cancelled' if looks_cancelled(title) else None)
