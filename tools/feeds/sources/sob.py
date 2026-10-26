"""Sinfonieorchester Basel: concerts from the orchestra's own pages.

The site is a Nuxt app. Its concert list is filled from /de/api/..., which robots.txt
disallows (as it does every URL with a query string), so this reader only reads normal
pages and the state each page embeds for its first render (window.__NUXT__):

* /de/konzerte embeds the first ten upcoming concerts, the home page /de/ a further set of
  highlights;
* every concert page (/de/konzerte/<slug>/<id>) embeds the full concert (line-up with roles,
  works, venue, end time, ticket link) plus the other dates of the same production and the
  concerts of its subscription series, which are added to the queue.

Concert pages are fetched soonest first while the request budget lasts; a concert that was
only seen in another page's state is listed from that summary (no line-up or works).
Concerts the pages never mention are not found: the full list is only in the API.

Skipped: mini.musik (kindergarten and school sessions), concert introductions, open
rehearsals ("Poschner probiert"), ballet and opera-house dance evenings, and concerts outside
Switzerland (e.g. Burghof Lörrach).
"""
from __future__ import annotations

import re
import unicodedata

from common import (FetchError, clean, get, guess_type, log, looks_cancelled, make_event, requests_left,
                    to_zurich_datetime, today_zurich)

KEY = 'sob'
NAME = 'Sinfonieorchester Basel'
SITE = 'https://www.sinfonieorchesterbasel.ch/'
ATTRIBUTION = 'Source: Sinfonieorchester Basel (sinfonieorchesterbasel.ch)'
KIND = 'orchestra'
TIME_LIMIT = 300

BASE = 'https://www.sinfonieorchesterbasel.ch'
SEEDS = (BASE + '/de/konzerte', BASE + '/de/')
ORCHESTRA = 'Sinfonieorchester Basel'
SKIP_RE = re.compile(r'mini\.musik|konzerteinfuhrung|einfuhrung|poschner probiert|generalprobe|nussknacker|ballett|'
                     r'workshop|fuhrung|schulkonzert|schulvorstellung|kindergarten|schulklassen|apero|podium|gesprach')
SKIP_TYPES = {'konzerteinfuhrung', 'einfuhrung', 'workshop', 'fuhrung', 'probe'}

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


# ---------------------------------------------------------------------------
# window.__NUXT__ = (function(a,b,...){ a.x=...; return {...} }(v1,v2,...))
# A small reader for that JavaScript: literals, objects, arrays and the parameter names.
# ---------------------------------------------------------------------------

class _JS:
    _ID = re.compile(r'[A-Za-z_$][\w$]*')
    _NUM = re.compile(r'-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?')
    _ESC = {'n': '\n', 'r': '\r', 't': '\t', 'b': '\b', 'f': '\f', 'v': '\v', '0': '\0'}

    def __init__(self, src, env):
        self.s, self.i, self.env = src, 0, env

    def peek(self):
        while self.i < len(self.s) and self.s[self.i] in ' \t\r\n':
            self.i += 1
        return self.s[self.i] if self.i < len(self.s) else ''

    def eat(self, tok):
        self.peek()
        if not self.s.startswith(tok, self.i):
            raise ValueError(f'expected {tok!r} at {self.i}')
        self.i += len(tok)

    def ident(self):
        self.peek()
        m = self._ID.match(self.s, self.i)
        if not m:
            raise ValueError(f'name expected at {self.i}')
        self.i = m.end()
        return m.group(0)

    def string(self):
        quote, j, out = self.s[self.i], self.i + 1, []
        while self.s[j] != quote:
            if self.s[j] == '\\':
                n = self.s[j + 1]
                if n == 'u':
                    out.append(chr(int(self.s[j + 2:j + 6], 16)))
                    j += 6
                    continue
                out.append(self._ESC.get(n, n))
                j += 2
                continue
            out.append(self.s[j])
            j += 1
        self.i = j + 1
        return ''.join(out)

    def number(self):
        self.peek()
        m = self._NUM.match(self.s, self.i)
        self.i = m.end()
        v = m.group(0)
        return float(v) if any(c in v for c in '.eE') else int(v)

    def value(self):
        c = self.peek()
        if c in '"\'':
            return self.string()
        if c == '{':
            self.eat('{')
            d = {}
            while self.peek() != '}':
                k = self.string() if self.peek() in '"\'' else (self.number() if self.peek().isdigit() else self.ident())
                self.eat(':')
                d[str(k)] = self.value()
                if self.peek() == ',':
                    self.eat(',')
            self.eat('}')
            return d
        if c == '[':
            self.eat('[')
            a = []
            while self.peek() != ']':
                a.append(self.value())
                if self.peek() == ',':
                    self.eat(',')
            self.eat(']')
            return a
        if c == '-' or c == '.' or c.isdigit():
            return self.number()
        name = self.ident()
        if name in ('true', 'false'):
            return name == 'true'
        if name in ('null', 'undefined'):
            return None
        if name == 'void':
            self.value()
            return None
        if name == 'Array' and self.peek() == '(':
            self.eat('(')
            n = self.number()
            self.eat(')')
            return [None] * int(n)
        return self.env.get(name)


def nuxt_state(html):
    """The page's window.__NUXT__ object as Python data, or None."""
    start = html.find('window.__NUXT__=(function(')
    if start < 0:
        return None
    end = html.find('</script>', start)
    src = html[start + len('window.__NUXT__=(function('):end].rstrip().rstrip(';')
    close = src.index(')')
    params = [p.strip() for p in src[:close].split(',') if p.strip()]
    call = src.rindex('}(')
    args_src = src[call + 2:]
    args_src = args_src[:-2] if args_src.endswith('))') else args_src
    env = dict(zip(params, _JS('[' + args_src + ']', {}).value()))
    body = src[src.index('{', close) + 1:call]
    p = _JS(body, env)
    while p.peek():
        if body.startswith('return', p.i):
            p.i += 6
            return p.value()
        path = [p.ident()]
        while p.peek() in ('.', '['):
            if p.peek() == '.':
                p.eat('.')
                path.append(p.ident())
            else:
                p.eat('[')
                path.append(p.value())
                p.eat(']')
        p.eat('=')
        v = p.value()
        obj = env.get(path[0])
        for k in path[1:-1]:
            obj = obj[k] if isinstance(obj, dict) else obj[int(k)]
        if isinstance(obj, dict):
            obj[str(path[-1])] = v
        elif isinstance(obj, list):
            obj[int(path[-1])] = v
        if p.peek() == ';':
            p.eat(';')
    return None


# ---------------------------------------------------------------------------
# concerts
# ---------------------------------------------------------------------------

def _summaries(node, out):
    """Every concert-like dict (id, date_start, name, slug) anywhere in the state."""
    if isinstance(node, dict):
        if isinstance(node.get('id'), int) and node.get('date_start') and node.get('name') and \
                isinstance(node.get('slug'), dict) and node['slug'].get('de'):
            out.setdefault(node['id'], node)
        for v in node.values():
            if isinstance(v, (dict, list)):
                _summaries(v, out)
    elif isinstance(node, list):
        for v in node:
            _summaries(v, out)
    return out


def _skip(c):
    tags = ' '.join(t.get('name', '') for t in c.get('tags') or [] if isinstance(t, dict))
    text = _fold(' '.join(str(x or '') for x in (c.get('name'), c.get('subtitle'), tags)))
    return bool(SKIP_RE.search(text)) or _fold(c.get('type') or '') in SKIP_TYPES


def _place(venue):
    """-> (venue name, city, in Switzerland?)"""
    venue = venue if isinstance(venue, dict) else {}
    name = clean(venue.get('name_detail_manual') or venue.get('name') or '')
    lines = [clean(x) for x in re.split(r'[\r\n]+', venue.get('address') or '') if clean(x)]
    city, swiss = None, True
    if lines:
        m = re.match(r'^(?:CH-)?(\d{4,5})\s+(.+)$', lines[-1])
        if m:
            city, swiss = m.group(2), len(m.group(1)) == 4
    if not city:
        city = 'Basel' if 'basel' in _fold(name) or not name else None
    if re.search(r'lorrach|weil am rhein|freiburg|mulhouse|saint-louis|strasbourg', _fold(name + ' ' + ' '.join(lines))):
        swiss = False
    return name or None, city, swiss


def _roles(label, name):
    """'Violine & Leitung' -> ['Violin', 'Conductor']; a single label -> [its role]."""
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


def _end(c, start):
    """End time as the page shows it ('Konzertende ca. 20 Uhr'): the manual end, else the end.
    The manual end sometimes carries another day (copied from a sister concert); its time of
    day is what the page shows, so it is put on the concert's own day."""
    raw = c.get('date_end_manual') or c.get('date_end')
    if not raw:
        return None
    try:
        s, e = to_zurich_datetime(start), to_zurich_datetime(raw)
    except (ValueError, TypeError):
        return None
    if e.date() != s.date():
        e = s.replace(hour=e.hour, minute=e.minute, second=0, microsecond=0)
    minutes = (e - s).total_seconds() / 60
    return e if 20 <= minutes <= 300 else None


def _credits(c):
    out = []
    groups = [c.get(f'role_group_{i}') for i in range(1, 5)]
    roles = [r for g in groups if isinstance(g, list) for r in g] or (c.get('roles') or [])
    for r in roles:
        if not isinstance(r, dict):
            continue
        label = r.get('name_manual') or r.get('name') or ''
        for cast in r.get('casts') or []:
            person = cast.get('person') if isinstance(cast, dict) else None
            name = clean((person or {}).get('name_manual') or (person or {}).get('name') or '')
            for role in (_roles(label, name) if name else []):
                out.append((role, name))
    return out


def _program(c):
    out = []
    for w in c.get('works') or []:
        if not isinstance(w, dict) or w.get('is_break'):
            continue
        composer, title = clean(w.get('description_short')), clean(w.get('name'))
        if not title or re.fullmatch(r'-?\s*pause\s*-?', composer or '', re.I):
            continue
        out.append((composer, title))
    return out


def _url(c):
    return f"{BASE}/de/konzerte/{c['slug']['de']}/{c['id']}"


def fetch():
    today = today_zurich()
    known, full = {}, {}
    pages = 0
    for seed in SEEDS:
        try:
            state = nuxt_state(get(seed))
            pages += 1
        except FetchError as err:
            if seed == SEEDS[0]:
                raise
            log.warning('%s: %s failed: %s', KEY, seed, err)
            continue
        except (ValueError, IndexError, KeyError) as err:
            log.warning('%s: could not read the page state of %s: %s', KEY, seed, err)
            continue
        _summaries(state, known)
    if not known:
        raise FetchError(SEEDS[0], 'no concerts found in the page state (site changed?)')

    def upcoming():
        rows = []
        for cid, c in known.items():
            try:
                start = to_zurich_datetime(c['date_start'])
            except (ValueError, TypeError):
                continue
            if start.date() >= today and not _skip(c):
                rows.append((start, cid))
        return sorted(rows)

    while requests_left() > 0:
        todo = [cid for _, cid in upcoming() if cid not in full]
        if not todo:
            break
        cid = todo[0]
        c = known[cid]
        try:
            state = nuxt_state(get(_url(c)))
            current = (((state or {}).get('state') or {}).get('events') or {}).get('currentEvent') or {}
            full[cid] = dict(current, slug=c['slug'], id=cid) if current.get('id') == cid else dict(c)
            _summaries(state, known)
        except FetchError as err:
            log.warning('%s: no details for %s: %s', KEY, _url(c), err)
            full[cid] = dict(c)
        except (ValueError, IndexError, KeyError) as err:
            log.warning('%s: could not read the page state of %s: %s', KEY, _url(c), err)
            full[cid] = dict(c)

    events = []
    for start, cid in upcoming():
        c = full.get(cid) or known[cid]
        venue, city, swiss = _place(c.get('venue'))
        if not swiss:
            continue
        title = clean(c.get('name'))
        subtitle = clean(c.get('subtitle'))
        if subtitle and _fold(subtitle) not in _fold(title):
            title = f'{title} – {subtitle}'
        tags = [clean(t.get('name')) for t in c.get('tags') or [] if isinstance(t, dict) and clean(t.get('name'))]
        series = next((t for t in tags if _fold(t) not in ('weitere konzerte',)), None)
        credits = _credits(c)
        if credits and not any(n == ORCHESTRA for _, n in credits) and 'Sinfoniekonzert' in tags:
            credits.append(('Orchestra', ORCHESTRA))
        end = _end(c, c['date_start'])
        status = _fold(c.get('status') or '')
        cancelled = bool(re.search(r'cancel|abgesagt|annul', status)) or looks_cancelled(title)
        if 'Sinfoniekonzert' in tags:
            kind = 'vocal-opera' if guess_type(title) == 'vocal-opera' else 'orchestral'
        else:
            kind = infer_type(title, credits)
        try:
            events.append(make_event(
                KEY, cid, title, c['date_start'], end=end,
                city=city or 'Basel', venueName=venue, type=kind, series=series,
                credits=credits, program=_program(c),
                ticketUrl=c.get('ticket_url') or c.get('ticket_url_external') or None, url=_url(c),
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, cid, err)
    return events
