"""Alte Oper Frankfurt: the classical concerts of the house's subscription series (its own
and those of the Museums-Gesellschaft and Pro Arte), from the pages robots.txt allows.

    https://www.alteoper.de/de                                     home page (next highlights)
    https://www.alteoper.de/de/programm                            first page of the programme
    https://www.alteoper.de/de/abowelten, /de/abonnements          links to the subscription series
    https://www.alteoper.de/de/abonnements/<slug>/<id>             every concert of one series
    https://www.alteoper.de/de/festivals-und-highlights/<slug>/<id>   a festival's concerts
    https://www.alteoper.de/de/programm/<slug>/<id>                one concert (performers, works)

The site is a Nuxt app. Every page carries its data in ``window.__NUXT__`` (a JavaScript
function call whose arguments hold repeated values); ``_nuxt_state`` decodes it. The full
programme is only reachable through ``/de/api/events/?page=N``, which robots.txt forbids
(``Disallow: /de/api/*`` and ``Disallow: /*?*``), and ``/de/programm`` server-renders only
its first page (the next ~10 days). So this reader cannot see the whole programme: it reads
the subscription and festival pages, which list (checked against the website on
29 Oct 2026) 81 upcoming classical concerts of the season: the Alte Oper's own series
(orchestras, piano, Debüt, Bach, Ensemble Modern, lunchtime, 2 × hören …), the
Museums-Gesellschaft's symphony and chamber concerts (subscriptions 571 and 572) and
Pro Arte's Internationale Orchesterkonzerte and Meisterkonzerte (575 and 576). Those four
are not linked from the site's menus (other organisers' subscriptions), so their ids are
listed in EXTRA_ABOS; further ones are picked up from the ``abos`` of concerts read. Not
covered beyond the next ~10 days (home page and first programme page): concerts of
organisers without a subscription page here, chiefly the hr-Sinfonieorchester's
(~20 a season) and one-off guest promoters'.

Each listing entry has the id, start (with UTC offset), room, title, subtitle, organiser,
genres, event types, "ideal for", ticket link and ticket status. Performers ("interpreters":
name + task) and works ("composers": name + newline-separated compositions) are only on the
concert's own page (one request each, ~250 KB), so they are read incrementally like
tonhalle.py: a concert the previous feed already has with performers or works (same id,
start and title) keeps them; the requests left after the listings (cap 150) go to concerts
without details, nearest first, then to concerts in the next week and a fixed share of the
others (each about every two weeks). Only these facts are taken, never descriptions.

Classical: a genre among Klassik / Orchester / Kammermusik / Klavier / Alte Musik / Neue
Musik. Skipped: jazz, pop, entertainment, cabaret, shows and musicals, congresses, guided
tours, children's and family formats ("Kinder & Jugend", "Familien", Kinder-Uni), the hr's
youth series (Junge Konzerte), the Campus talks (Kienzles Klassik, Backstage mit
Sarah Willis) and events outside the house.

The imprint allows copies only for private, non-commercial use and protects the site's
texts; Klang republishes facts only (date, time, title, hall, performers, works, links).
"""
from __future__ import annotations

import re

from common import (BudgetExceeded, FetchError, clean, event_id, get, infer_type, log, looks_cancelled, make_event,
                    previous_event, refresh_due, requests_left, to_zurich_datetime, to_zurich_iso, today_zurich)

from ._consent import group_role, role_en

KEY = 'alte_oper_frankfurt'
NAME = 'Alte Oper Frankfurt'
SITE = 'https://www.alteoper.de/'
ATTRIBUTION = 'Source: Alte Oper Frankfurt (alteoper.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 150             # ~25 listing pages, the rest for concert pages
TIME_LIMIT = 900
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 14

BASE = 'https://www.alteoper.de'
SEEDS = ('/de', '/de/programm', '/de/abowelten', '/de/abonnements')
# other organisers' subscription series, not linked from the menus (ids checked 29 Oct 2026):
# 571 Museums-Abo Sinfoniekonzerte, 572 Museums-Abo Kammerkonzerte, 575 Internationale
# Orchesterkonzerte (Pro Arte), 576 Meisterkonzerte (Pro Arte). A gone id answers 404.
EXTRA_ABOS = (571, 572, 575, 576)
CITY = 'Frankfurt'
HOUSE = 'Alte Oper Frankfurt'

_CLASSICAL = {'klassik', 'orchester', 'kammermusik', 'klavier', 'alte musik', 'neue musik'}
_NOT_CLASSICAL = {'jazz', 'rock, pop, singer songwriter', 'entertainment', 'kabarett & comedy', 'kinder & jugend',
                  'kongresse & events', 'lesung', 'weltmusik'}
_SKIP_TYPES = {'führung', 'alte oper campus'}
_SKIP_IDEAL = re.compile(r'^(familien|kinder von|kitas)', re.I)
_SKIP_PAGE = re.compile(r'kinder|famili|junge-konzerte|schul|jung$', re.I)
_SKIP_TITLE = re.compile(r'führung|treffpunkt|workshop|kinder-uni|erforschen|backstage mit|kienzles klassik|'
                         r'behind the scenes|einführung|probenbesuch|offene probe', re.I)
_ROOMS = {'großer saal': 'Großer Saal', 'mozart saal': 'Mozart Saal', 'albert mangelsdorff foyer': 'Albert Mangelsdorff Foyer',
          'hindemith saal': 'Hindemith Saal', 'clubbar': 'Clubbar'}


# ---------------------------------------------------------------------------
# window.__NUXT__ = (function(a,b,…){return {…}}(v1,v2,…));
# ---------------------------------------------------------------------------

_NUM_RE = re.compile(r'-?(?:\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+)')
_IDENT_RE = re.compile(r'[A-Za-z_$][\w$]*')
_KEY_RE = re.compile(r'[\w$-]+')
_ESCAPES = {'n': '\n', 't': '\t', 'r': '\r', 'b': '\b', 'f': '\f', 'v': '\v', '0': '\0'}


class _JS:
    """A small reader for the JavaScript object literal Nuxt prints (objects with bare keys,
    arrays, strings, numbers, true/false/null/void 0, and the function's parameter names)."""

    def __init__(self, text, env):
        self.s, self.i, self.env = text, 0, env

    def _ws(self):
        while self.i < len(self.s) and self.s[self.i] in ' \t\r\n':
            self.i += 1

    def value(self):
        self._ws()
        c = self.s[self.i]
        if c == '{':
            return self._obj()
        if c == '[':
            return self._arr()
        if c in '"\'':
            return self._str()
        m = _NUM_RE.match(self.s, self.i)
        if m:
            self.i = m.end()
            t = m.group(0)
            return float(t) if re.search(r'[.eE]', t) else int(t)
        m = _IDENT_RE.match(self.s, self.i)
        if not m:
            raise ValueError(f'unexpected {self.s[self.i:self.i + 30]!r}')
        self.i = m.end()
        word = m.group(0)
        if word in ('true', 'false', 'null', 'undefined'):
            return {'true': True, 'false': False}.get(word)
        if word == 'void':
            self.value()
            return None
        if word == 'Array':                               # Array(n): an empty array
            self._ws()
            self.i += 1
            self.value()
            self._ws()
            self.i += 1
            return []
        return self.env.get(word)

    def _str(self):
        s, q = self.s, self.s[self.i]
        self.i += 1
        out = []
        while True:
            c = s[self.i]
            if c == q:
                self.i += 1
                return ''.join(out)
            if c == '\\':
                n = s[self.i + 1]
                if n == 'u':
                    out.append(chr(int(s[self.i + 2:self.i + 6], 16)))
                    self.i += 6
                elif n == 'x':
                    out.append(chr(int(s[self.i + 2:self.i + 4], 16)))
                    self.i += 4
                else:
                    out.append(_ESCAPES.get(n, n))
                    self.i += 2
                continue
            out.append(c)
            self.i += 1

    def _key(self):
        self._ws()
        if self.s[self.i] in '"\'':
            return self._str()
        m = _KEY_RE.match(self.s, self.i)
        self.i = m.end()
        return m.group(0)

    def _obj(self):
        self.i += 1
        out = {}
        while True:
            self._ws()
            if self.s[self.i] == '}':
                self.i += 1
                return out
            k = self._key()
            self._ws()
            if self.s[self.i] != ':':
                raise ValueError(f'expected ":" at {self.s[self.i:self.i + 30]!r}')
            self.i += 1
            out[k] = self.value()
            self._ws()
            if self.s[self.i] == ',':
                self.i += 1

    def _arr(self):
        self.i += 1
        out = []
        while True:
            self._ws()
            if self.s[self.i] == ']':
                self.i += 1
                return out
            out.append(self.value())
            self._ws()
            if self.s[self.i] == ',':
                self.i += 1


_NUXT_RE = re.compile(r'window\.__NUXT__\s*=\s*\(function\(([^)]*)\)\s*\{\s*return\s*')


def _nuxt_state(page):
    """The decoded window.__NUXT__ object of a page, or None."""
    m = _NUXT_RE.search(page or '')
    if not m:
        return None
    params = [p.strip() for p in m.group(1).split(',') if p.strip()]
    text = page[m.end():page.find('</script>', m.end())]
    cut = text.rfind('}}(')                               # end of the body, start of the arguments
    end = text.rfind('));')
    if cut < 0 or end < cut:
        return None
    try:
        args = _JS('[' + text[cut + 3:end] + ']', {}).value()
        return _JS(text[:cut + 2], dict(zip(params, args))).value()
    except (ValueError, IndexError) as err:
        log.warning('%s: unreadable __NUXT__ data: %s', KEY, err)
        return None


def _events_in(node, out, page):
    """Collect every event dict (an int id, a slug and a start_date) found anywhere in ``node``."""
    if isinstance(node, dict):
        if isinstance(node.get('id'), int) and node.get('slug') and node.get('start_date') and \
                node.get('item_type') in (None, 'event'):
            e = out.setdefault(node['id'], {'pages': set()})
            for k, v in node.items():
                if e.get(k) in (None, '', []):
                    e[k] = v
            e['pages'].add(page)
        for v in node.values():
            _events_in(v, out, page)
    elif isinstance(node, list):
        for v in node:
            _events_in(v, out, page)


def _series_links(page, state):
    """Subscription / festival page paths linked from a page (href or Nuxt data)."""
    paths = set(re.findall(r'href="(/de/(?:abonnements|festivals-und-highlights)/[\w-]+/\d+)/?"', page or ''))
    abos = (((state or {}).get('state') or {}).get('abos') or {}).get('abos') or []
    for a in abos:
        if isinstance(a, dict) and a.get('slug') and isinstance(a.get('id'), int):
            paths.add(f"/de/abonnements/{a['slug']}/{a['id']}")
    return paths


# ---------------------------------------------------------------------------
# filters and facts
# ---------------------------------------------------------------------------

def _names(items):
    return [clean(x.get('name')).lower() for x in items or [] if isinstance(x, dict) and x.get('name')]


def _skip_reason(e):
    genres = set(_names(e.get('genres')))
    title = clean(e.get('title') or e.get('name'))
    if e.get('is_past'):
        return 'past'
    if not genres & _CLASSICAL:
        return 'not classical'
    if genres & _NOT_CLASSICAL:
        return 'jazz/pop/entertainment/children'
    if set(_names(e.get('event_types'))) & _SKIP_TYPES:
        return 'tour/talk'
    if any(_SKIP_IDEAL.match(x) for x in _names(e.get('ideal_fors'))):
        return 'children/family'
    if _SKIP_TITLE.search(title):
        return 'tour/talk/children'
    pages = e.get('pages') or set()
    if pages and all(_SKIP_PAGE.search(p.rsplit('/', 2)[-2] if p.count('/') >= 3 else p) for p in pages):
        return 'youth series'
    return None


def _venue(room):
    r = clean(room)
    low = r.lower()
    if not r or low in ('ganzes haus', 'alte oper', 'alte oper frankfurt'):
        return HOUSE, True
    if low in _ROOMS:
        return f'{HOUSE}, {_ROOMS[low]}', True
    if 'saal' in low or 'foyer' in low:
        return f'{HOUSE}, {r}', True
    return r, False                                       # a museum, the zoo …: not in the house


_EXTRA_ROLES = {'hammerflügel': 'Fortepiano', 'hammerklavier': 'Fortepiano', 'violoncello piccolo': 'Cello',
                'kontrabassquartett': 'Ensemble', 'vokalensemble': 'Choir', 'chor und orchester': 'Choir & Orchestra',
                'tasteninstrumente': 'Keyboards', 'electronics': 'Electronics', 'elektronik': 'Electronics',
                'live-elektronik': 'Electronics', 'dj': 'DJ'}
_INSTRUMENTISH = re.compile(r'(phon|flöte|horn|tuba|geige|violine|viola|bass|harfe|klavier|orgel|trompete|posaune|'
                            r'cello|gitarre|schlagzeug|laute|akkordeon|marimba|vibraphon|sopran|tenor|bariton|stimme)$', re.I)


def _role(task):
    """German task -> English role; None for off-stage people."""
    t = clean(task).strip(' ,;:')
    if not t:
        return 'Performer'
    r = role_en(t)
    if r is not None:
        return r or None
    parts = [p.strip() for p in re.split(r'\s*(?:,|/|&|\bund\b)\s*', t) if p.strip()]
    mapped = []
    for p in parts:
        low = p.lower()
        r = role_en(p)
        if r == '':
            continue
        if r:
            mapped.append(r)
        elif low in _EXTRA_ROLES:
            mapped.append(_EXTRA_ROLES[low])
        elif _INSTRUMENTISH.search(low):
            mapped.append(p[:1].upper() + p[1:])
        else:
            mapped.append('Performer')
    if len(mapped) > 1 and 'Performer' in mapped:
        mapped = [m for m in mapped if m != 'Performer']
    if not mapped:
        return None
    if 'Conductor' in mapped and len(mapped) > 1:          # "Leitung, Hammerflügel"
        return ' & '.join(m for m in mapped if m != 'Conductor') + ' & direction'
    return ' & '.join(dict.fromkeys(mapped))


_MORE_ORCH_RE = re.compile(r'kapelle\b|staatskapelle|orkest|gewandhaus|concertgebouw|filarm|symphonie\b', re.I)


def _group(name):
    """group_role, also for orchestras named without 'Orchester' (Staatskapelle, Concertgebouworkest)."""
    return group_role(name) or ('Orchestra' if _MORE_ORCH_RE.search(name) else None)


def _credits(interpreters, title=''):
    """[(role, name)]; a title that is just a group's name ('hr-Sinfonieorchester') credits that
    group when the page's performers leave it out."""
    out = []
    for p in interpreters or []:
        if not isinstance(p, dict):
            continue
        name = clean(' '.join(x for x in (p.get('first_name'), p.get('last_name')) if x))
        if not name or re.match(r'(?i)^(n\.?\s*n\.?|tba|tbd)$', name):
            continue
        task = clean(p.get('task'))
        if not task:
            out.append((_group(name) or 'Performer', name))
            continue
        role = _role(task)
        if role:
            out.append((role, name))
    t = clean(title)
    if t and _group(t) and len(t.split()) <= 6 and not re.search(r'[,&:+]|\bmit\b', t) and \
            not any(n.lower() == t.lower() for _, n in out):
        out.insert(0, (_group(t), t))
    return out


_NOT_WORK_RE = re.compile(r'(?i)^(?:zwischenspiel|pause|einführung|moderation|gespräch|vortrag|vorträge|lesung|'
                          r'mit\s|im gespräch|und weitere|u\.\s?a\.$)')


def _program(composers):
    out = []
    for c in composers or []:
        if not isinstance(c, dict):
            continue
        name = clean(' '.join(x for x in (c.get('first_name'), c.get('last_name')) if x))
        works = [clean(w) for w in re.split(r'\n+', c.get('composition') or '') if clean(w)]
        if not name and not works:
            continue
        if _NOT_WORK_RE.match(name):                      # 'Zwischenspiel' – 'mit Thomas Guggeis'
            continue
        works = [w for w in works if not _NOT_WORK_RE.match(w)]
        if name and not works and c.get('composition'):
            continue                                      # 'Max Hollein' – 'Vorträge'
        heading = ''
        for w in works or ['']:
            if w.endswith(':') and len(works) > 1:           # 'Cavalleria rusticana:' then its numbers
                heading = w
                continue
            out.append((name, f'{heading} {w}'.strip() if heading else w))
    return out


_VOCAL_RE = re.compile(r'(?i)passion\b|oratori|requiem|missa\b|\bmesse\b|kantate|magnificat|stabat mater|'
                       r'chorfantasie|\boper\b|\bopera\b')


def _type(e, credits, program):
    """infer_type on the facts, corrected by the site's genres (the house orchestra's name
    'Opern- und Museumsorchester' is not an opera; Bach's 'Sinfonien' for keyboard are not
    symphonies)."""
    title = re.sub(r'(?i)opern- und museumsorchester', 'Museumsorchester', clean(e.get('title')))
    subtitle = clean(e.get('subtitle'))
    genres = set(_names(e.get('genres')))
    roles = {r for r, _ in credits}
    works = ' '.join(f'{c} {t}' for c, t in program)
    if _VOCAL_RE.search(f'{title} {subtitle}') or (_VOCAL_RE.search(works) and ('Choir' in roles or 'vokal' in genres)):
        return 'vocal-opera'
    t = infer_type(title, credits, program, subtitle)
    if t == 'vocal-opera' and 'Choir' not in roles and 'vokal' not in genres:
        t = None
    if 'orchester' in genres or 'Orchestra' in roles:
        return 'orchestral' if t in (None, 'chamber', 'recital', 'orchestral') else t
    if t == 'orchestral':
        t = None                                          # no orchestra: a keyboard 'Sinfonie', a 'Konzert'
    if t:
        return t
    players = [n for r, n in credits if r not in ('Presenter', 'Narrator')]
    if 'kammermusik' in genres:
        return 'recital' if len(players) == 1 else 'chamber'
    if 'klavier' in genres or len(players) == 1:
        return 'recital' if len(players) <= 1 else 'chamber'
    return 'chamber' if players else None


def _cancelled(e):
    status = clean(e.get('ticket_status')).lower()
    if 'cancel' in status or 'abgesagt' in status:
        return True
    return any(looks_cancelled(clean(e.get(k))) for k in ('title', 'subtitle', 'headline', 'ticket_text'))


# ---------------------------------------------------------------------------
# fetch
# ---------------------------------------------------------------------------

def _read(path, events, read):
    try:
        page = get(BASE + path)
    except FetchError as err:
        log.warning('%s: %s failed: %s', KEY, path, err)
        return None
    read.add(path)
    state = _nuxt_state(page)
    if state is None:
        log.warning('%s: no __NUXT__ data on %s', KEY, path)
        return page, None
    _events_in(state, events, path)
    return page, state


def _detail_event(state):
    for k, v in ((state or {}).get('fetch') or {}).items():
        if k.startswith('EventDetail') and isinstance(v, dict) and isinstance(v.get('event'), dict):
            return v['event']
    return None


def fetch():
    events, read, series = {}, set(), set()
    first = get(BASE + SEEDS[0])                          # FetchError: build.py reuses yesterday's feed
    read.add(SEEDS[0])
    state = _nuxt_state(first)
    if state is None:
        raise FetchError(BASE + SEEDS[0], 'no __NUXT__ data (layout changed?)')
    _events_in(state, events, SEEDS[0])
    series |= _series_links(first, state)
    for path in SEEDS[1:]:
        got = _read(path, events, read)
        if got:
            series |= _series_links(*got)
    by_id = {}
    for p in sorted(series):
        by_id.setdefault(p.rsplit('/', 1)[-1] + p.split('/')[2], p)   # one page per (kind, id)
    for i in EXTRA_ABOS:
        by_id.setdefault(f'{i}abonnements', f'/de/abonnements/abo/{i}')
    for path in sorted(by_id.values()):
        if requests_left() <= 10:
            log.warning('%s: request cap nearly reached, %s not read', KEY, path)
            break
        _read(path, events, read)
    if not events:
        raise FetchError(BASE + SEEDS[0], 'no events found (layout changed?)')

    today = today_zurich()
    cands, skipped = [], {}
    for eid, e in events.items():
        why = _skip_reason(e)
        if not why:
            try:
                start = to_zurich_iso(e['start_date'], assume='Europe/Berlin')
            except ValueError:
                why = 'no time'
        if not why and to_zurich_datetime(start).date() < today:
            why = 'past'
        venue, here = _venue(e.get('room'))
        if not why and not here:
            why = 'not in the house'
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        c = {'id': eid, 'e': e, 'start': start, 'title': clean(e.get('title') or e.get('name')), 'venue': venue,
             'credits': [], 'program': [], 'detailed': False, 'reused': False, 'type_hint': None}
        prev = previous_event(event_id(KEY, eid), start, title=c['title'])
        if prev and (prev.get('credits') or prev.get('program')):
            c['credits'] = [(x.get('role'), x.get('name')) for x in prev.get('credits') or [] if x.get('name')]
            c['program'] = [(x.get('composer') or '', x.get('title') or '') for x in prev.get('program') or []]
            c['type_hint'] = prev.get('type')
            c['reused'] = True
        cands.append(c)

    def tier(c):
        if not c['reused']:
            return 0
        if refresh_due(c['id'], c['start'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    order = sorted((c for c in cands if tier(c) is not None), key=lambda c: (tier(c), c['start']))
    fetched, new_abos = 0, set()
    for c in order:
        if requests_left() <= 0:
            break
        path = f"/de/programm/{c['e'].get('slug') or 'x'}/{c['id']}"
        try:
            page = get(BASE + path)
        except BudgetExceeded as err:
            log.warning('%s: stopped reading concert pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: concert page failed: %s', KEY, c['id'], err)
            continue
        fetched += 1
        d = _detail_event(_nuxt_state(page))
        if not d:
            log.warning('%s %s: no event data on its page', KEY, c['id'])
            continue
        c['detailed'] = True
        c['credits'] = _credits(d.get('interpreters'), c['title'])
        c['program'] = _program(d.get('composers'))
        for k in ('ticket_status', 'ticket_text', 'subtitle', 'headline', 'ticket_link'):
            if d.get(k) not in (None, ''):
                c['e'][k] = d[k]
        if d.get('start_date') and d['start_date'] != c['e'].get('start_date'):
            try:
                c['start'] = to_zurich_iso(d['start_date'], assume='Europe/Berlin')
            except ValueError:
                pass
        for a in d.get('abos') or []:
            if isinstance(a, dict) and isinstance(a.get('id'), int) and f"{a['id']}abonnements" not in by_id:
                new_abos.add(a['id'])
    if new_abos:
        log.warning('%s: concerts belong to subscription pages this reader does not read (add to EXTRA_ABOS?): %s', KEY,
                 ', '.join(map(str, sorted(new_abos))))

    out = []
    for c in cands:
        e = c['e']
        try:
            out.append(make_event(
                KEY, c['id'], c['title'], c['start'], city=CITY, venueName=c['venue'],
                type=_type(e, c['credits'], c['program']) if c['detailed'] or not c['type_hint'] else c['type_hint'],
                series=clean(e.get('headline')) or None, credits=c['credits'], program=c['program'],
                ticketUrl=e.get('ticket_link'), url=f"{BASE}/de/programm/{e.get('slug')}/{c['id']}",
                status='cancelled' if _cancelled(e) else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, c['id'], err)
    log.info('%s: %d page(s) of listings, %d concert page(s) read; %d concerts (%d with details); skipped %s',
             KEY, len(read), fetched, len(out), sum(1 for c in cands if c['detailed'] or c['reused']), skipped)
    return out
