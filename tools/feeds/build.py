#!/usr/bin/env python3
"""Build Klang's real-concert feed from the readers in tools/feeds/sources/.

    python3 tools/feeds/build.py [--only k1,k2] [--out data/concerts.json]
                                 [--previous URL_OR_PATH | --previous none]
                                 [--fresh-hours H] [--timeout S] [--show N] [--strict] [-v]
    python3 tools/feeds/build.py --list

Each reader runs on its own (one at a time, isolated try/except, time limit, request cap).
Events are checked, limited to today .. today+450 days (Swiss time), de-duplicated across
sources, given a type where the facts make it clear, sorted, and written as
{"generatedAt", "sources": [...], "concerts": [...]}.

The previous feed (--previous, default: the published one) is handed to the readers
(common.previous_event), so readers that read detail pages can reuse what they learnt on
earlier runs. When a reader fails (or suddenly returns nothing), its events from the
previous feed are reused, so one broken site does not empty a city. Exit status: 0 unless
build.py itself has a bug (or --strict and a source failed without a fallback); 2 for bad
arguments.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import logging
import os
import re
import sys
import threading
import time
import traceback
import unicodedata
import urllib.parse
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional

HERE = os.path.dirname(os.path.abspath(__file__))
APP_ROOT = os.path.dirname(os.path.dirname(HERE))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import common  # noqa: E402
import sources as registry  # noqa: E402

DEFAULT_OUT = os.path.join(APP_ROOT, 'data', 'concerts.json')
DEFAULT_PREVIOUS = 'https://lyl0316.github.io/klang/data/concerts.json'
WINDOW_DAYS = 450
DEDUPE_MINUTES = 20
GRACE_SECONDS = 60          # extra wait after a source's time limit before abandoning it
SUSPICIOUS_PREVIOUS = 5     # 0 events now but at least this many last time -> treat as failure
KEY_ORDER = ('id', 'source', 'title', 'start', 'durationMin', 'city', 'venueName', 'type', 'series',
             'credits', 'program', 'ticketUrl', 'url', 'status')

log = logging.getLogger('feeds.build')


# ---------------------------------------------------------------------------
# previous feed (fallback when a source fails)
# ---------------------------------------------------------------------------

class Previous:
    """The last published feed, loaded lazily on first use."""

    def __init__(self, spec, out_path):
        self.candidates = []
        if spec and spec.strip().lower() not in ('none', 'off', 'no', ''):
            self.candidates.append(spec.strip())
        if out_path and os.path.exists(out_path) and os.path.abspath(out_path) not in map(os.path.abspath, self.candidates):
            self.candidates.append(out_path)     # local copy as a second chance
        self._data = None
        self._loaded = False
        self.origin = None
        self.error = None

    def data(self):
        if not self._loaded:
            self._loaded = True
            self._data = self._load()
        return self._data

    def _load(self):
        problems = []
        for c in self.candidates:
            try:
                if re.match(r'https?://', c, re.I):
                    with common.source_budget('previous', max_requests=3, seconds=180):
                        data = common.get_json(c)
                else:
                    with open(c, encoding='utf-8') as f:
                        data = json.load(f)
            except (common.FetchError, OSError, ValueError) as e:
                problems.append(f'{c}: {e}')
                continue
            if isinstance(data, dict) and isinstance(data.get('concerts'), list):
                self.origin = c
                log.info('previous feed: %s (%d concerts)', c, len(data['concerts']))
                return data
            problems.append(f'{c}: not a Klang feed')
        self.error = '; '.join(problems) or 'no previous feed configured'
        log.info('no previous feed: %s', self.error)
        return None

    def events(self, key):
        data = self.data() or {}
        return [dict(e) for e in data.get('concerts', []) if isinstance(e, dict) and e.get('source') == key]

    def info(self, key):
        data = self.data() or {}
        for s in data.get('sources', []):
            if isinstance(s, dict) and s.get('key') == key:
                return s
        return None


# ---------------------------------------------------------------------------
# running one source
# ---------------------------------------------------------------------------

@dataclass
class Result:
    key: str
    events: list = field(default_factory=list)
    ok: bool = True
    error: Optional[str] = None
    note: Optional[str] = None
    reused: bool = False
    fetched_at: Optional[str] = None
    requests: int = 0
    seconds: float = 0.0
    invalid: int = 0
    trace: Optional[str] = None


def run_source(src, time_limit):
    """Call src.fetch() in a worker thread with its own request budget and time limit.
    Returns (events | None, error | None, note | None, requests, seconds, traceback | None)."""
    box = {}

    def target():
        with common.source_budget(src.key, max_requests=src.max_requests, seconds=time_limit) as budget:
            box['budget'] = budget
            try:
                result = src.fetch()
                box['events'] = list(result) if result is not None else []
            except BaseException as e:  # noqa: BLE001 - a reader must never take the build down
                box['error'] = f'{type(e).__name__}: {e}'
                box['trace'] = traceback.format_exc()

    t0 = time.monotonic()
    worker = threading.Thread(target=target, name=f'feed-{src.key}', daemon=True)
    worker.start()
    worker.join(time_limit + GRACE_SECONDS)
    seconds = time.monotonic() - t0
    budget = box.get('budget')
    used = budget.used if budget else 0
    if worker.is_alive():
        return None, f'timed out after {time_limit + GRACE_SECONDS}s', None, used, seconds, None
    note = f'partial: {budget.exhausted}' if budget and budget.exhausted else None
    if 'error' in box:
        return None, box['error'], note, used, seconds, box.get('trace')
    return box.get('events', []), None, note, used, seconds, None


def check_events(events, key, today, last_day):
    """Keep well-formed events of this source inside the date window.
    Returns (kept, invalid_count, outside_window_count, first_problems)."""
    kept, invalid, outside, problems = [], 0, 0, []
    for ev in events:
        try:
            if not isinstance(ev, dict):
                raise ValueError('not a dict (use make_event)')
            if ev.get('source') != key:
                raise ValueError(f'source {ev.get("source")!r} is not {key!r}')
            if not isinstance(ev.get('id'), str) or not ev['id'].startswith(key + '-'):
                raise ValueError(f'id {ev.get("id")!r} must start with {key}-')
            if not isinstance(ev.get('title'), str) or not ev['title'].strip():
                raise ValueError('missing title')
            start = common._start_iso(ev.get('start'))
        except (ValueError, TypeError) as e:
            invalid += 1
            if len(problems) < 3:
                problems.append(str(e))
            continue
        day = common.to_zurich_datetime(start).date()
        if not (today <= day <= last_day):
            outside += 1
            continue
        ev = dict(ev, start=start)
        ev.setdefault('status', 'scheduled')
        kept.append(ev)
    return kept, invalid, outside, problems


# ---------------------------------------------------------------------------
# de-duplication across sources
# ---------------------------------------------------------------------------

_CITY_ALIASES = {
    'zurich': ('zurich', 'zuerich', 'zurigo'),
    'geneve': ('geneve', 'geneva', 'genf', 'ginevra'),
    'basel': ('basel', 'bale', 'basle', 'basilea'),
    'bern': ('bern', 'berne', 'berna'),
    'luzern': ('luzern', 'lucerne', 'lucerna'),
    'lausanne': ('lausanne', 'losanna'),
    'lugano': ('lugano',),
    'winterthur': ('winterthur',),
    'st-gallen': ('st gallen', 'st. gallen', 'sankt gallen', 'saint-gall', 'saint gall', 'san gallo'),
    'fribourg': ('fribourg', 'freiburg', 'friburgo'),
    'neuchatel': ('neuchatel', 'neuenburg'),
    'sion': ('sion', 'sitten'),
    'biel': ('biel', 'bienne', 'biel/bienne', 'biel-bienne'),
    'chur': ('chur', 'coire', 'coira'),
    'solothurn': ('solothurn', 'soleure'),
    'schaffhausen': ('schaffhausen', 'schaffhouse'),
    'zug': ('zug', 'zoug'),
    'thun': ('thun', 'thoune'),
    'locarno': ('locarno',),
    'verbier': ('verbier',),
    'montreux': ('montreux',),
    'vevey': ('vevey',),
    'gstaad': ('gstaad', 'saanen'),
    'davos': ('davos',),
    'baden': ('baden',),
    'aarau': ('aarau',),
}
_CITY_OF = {alias: canon for canon, aliases in _CITY_ALIASES.items() for alias in aliases}
_CITY_WORDS = {w for aliases in _CITY_ALIASES.values() for a in aliases for w in re.findall(r'[a-z0-9]+', a)}
_STOP = {'saal', 'salle', 'sala', 'konzertsaal', 'the', 'de', 'la', 'le', 'les', 'du', 'des', 'der', 'die',
         'das', 'dem', 'den', 'im', 'in', 'am', 'an', 'zu', 'und', 'et', 'di', 'del', 'della', 'da', 'of',
         'and', 'st', 'ch'}
_HALL_QUALIFIERS = {'gross', 'grosser', 'grosse', 'grossen', 'grand', 'grande', 'klein', 'kleiner', 'kleine',
                    'kleinen', 'kleines', 'petit', 'petite', 'piccola', 'studio', 'foyer', 'kammermusiksaal',
                    'musiksaal', 'festsaal', 'krypta', 'crypte', 'auditorium', 'aula', 'kuppel', 'lounge'}
_GENERIC = {'kirche', 'church', 'eglise', 'chiesa', 'temple', 'theater', 'theatre', 'teatro', 'hall', 'halle',
            'kathedrale', 'cathedrale', 'casino', 'kulturzentrum', 'zentrum', 'centre', 'center'}
_TITLE_STOP = _STOP | {'konzert', 'concert', 'concerts', 'konzerte', 'mit', 'avec', 'con', 'with', 'for', 'fur',
                       'pour', 'per', 'a', 'e', 'il', 'un', 'une', 'ein', 'eine'}


def city_key(name):
    f = common._fold(name).strip()
    f = re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9./ -]+', ' ', f)).strip()
    return _CITY_OF.get(f, f) or None


def _tokens(text, stop):
    return {t for t in re.findall(r'[a-z0-9]+', common._fold(text)) if len(t) > 1 and t not in stop}


def venue_tokens(ev):
    return _tokens(ev.get('venueName'), _STOP | _CITY_WORDS)


def _jaccard(a, b):
    return len(a & b) / len(a | b) if a and b else 0.0


def venue_similar(va, vb, same_city=True):
    qa, qb = va & _HALL_QUALIFIERS, vb & _HALL_QUALIFIERS
    if qa and qb and qa != qb:
        return False        # Grosser Saal vs Kleiner Saal
    small, big = (va, vb) if len(va) <= len(vb) else (vb, va)
    vague = small <= _GENERIC | _HALL_QUALIFIERS
    if va == vb:
        return same_city or not vague     # "Kirche" = "Kirche" only means something in one town
    if vague:
        return False        # just "Kirche" or "Theater": too vague to call it the same place
    if small <= big:
        return True         # "Tonhalle" vs "Tonhalle, Grosser Saal"
    shared = (va & vb) - _GENERIC - _HALL_QUALIFIERS
    return bool(shared) and _jaccard(va - _HALL_QUALIFIERS, vb - _HALL_QUALIFIERS) >= 0.5


def title_similar(a, b):
    ta, tb = _tokens(a, _TITLE_STOP), _tokens(b, _TITLE_STOP)
    if not ta or not tb:
        return False
    small, big = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    return _jaccard(ta, tb) >= 0.5 or (len(small) >= 2 and small <= big)


# words that don't tell two concert titles apart ("3. Sinfoniekonzert" vs "4. Sinfoniekonzert")
_TITLE_GENERIC = {'sinfoniekonzert', 'symphoniekonzert', 'abonnementskonzert', 'abokonzert', 'abo', 'kammerkonzert',
                  'mittagskonzert', 'lunchkonzert', 'matinee', 'matineekonzert', 'soiree', 'orgelkonzert',
                  'kirchenkonzert', 'adventskonzert', 'weihnachtskonzert', 'neujahrskonzert', 'festkonzert',
                  'serenade', 'nr', 'no', 'op', 'teil', 'part', 'saison', 'season', 'gastspiel', 'zu', 'gast',
                  'philharmonisches', 'philharmonische'}


def _name_key(name):
    return re.sub(r'[^a-z0-9]+', ' ', common._fold(name)).strip()


# a leading article doesn't tell two performers apart ("L'Orchestre de Chambre de Genève")
_ARTICLE_RE = re.compile(r'^(?:l|le|la|les|das|die|der|the|il|lo|gli|i) (?=\S{4})')


def _performer_key(name):
    return _ARTICLE_RE.sub('', _name_key(name))


def shared_performers(a, b):
    """How many performers (by name, ignoring case, accents, punctuation and a leading article)
    both events credit."""
    na = {_performer_key(c.get('name')) for c in a.get('credits') or [] if isinstance(c, dict)}
    nb = {_performer_key(c.get('name')) for c in b.get('credits') or [] if isinstance(c, dict)}
    return len({n for n in na & nb if len(n) >= 4})


def venue_contains(a, b):
    """True when one venue name contains the other ("Theater Casino Zug, Theatersaal" /
    "Theater Casino Zug") and the shorter one names a place, not just "Kirche" or "Theater"."""
    ka, kb = _name_key(a.get('venueName')), _name_key(b.get('venueName'))
    if not ka or not kb:
        return False
    short, long_ = (ka, kb) if len(ka) <= len(kb) else (kb, ka)
    if not re.search(rf'(?<![a-z0-9]){re.escape(short)}(?![a-z0-9])', long_):
        return False
    words = _tokens(short, _STOP | _CITY_WORDS)
    distinctive = words - _GENERIC - _HALL_QUALIFIERS
    return bool(distinctive) or len(words & _GENERIC) >= 2


def title_very_similar(a, b):
    """Titles with at least two telling words in common and little else ("Musiques sérieuses")."""
    ta = {t for t in _tokens(a, _TITLE_STOP | _CITY_WORDS | _TITLE_GENERIC) if not t.isdigit()}
    tb = {t for t in _tokens(b, _TITLE_STOP | _CITY_WORDS | _TITLE_GENERIC) if not t.isdigit()}
    return min(len(ta), len(tb)) >= 2 and _jaccard(ta, tb) >= 0.75


def hall_part(ev):
    """The words that name a hall inside a building: what follows the first ',' or ' – ' of the
    venue name, without city words ('Tonhalle Zürich – Kleiner Saal' -> {'kleiner', 'saal'};
    'Kirche St. Peter, Zürich' -> set(); 'Tonhalle Zürich' -> set())."""
    v = str(ev.get('venueName') or '')
    m = re.search(r',|\s[–—-]\s', v)
    return _tokens(v[m.end():], _CITY_WORDS) if m else set()


# the hall a listing means when it names only the building
_MAIN_HALL = {'gross', 'grosser', 'grosse', 'grossen', 'grand', 'grande', 'musiksaal', 'konzertsaal', 'hauptbuhne',
              'theatersaal', 'festsaal'}
# words that don't tell two halls apart ("Grosser Saal" / "Saal")
_HALL_FILLER = (_STOP - {'konzertsaal'}) | {'grande', 'grosse', 'grosser', 'grand'}


def _base_strength(a, b):
    ca, cb = city_key(a.get('city')), city_key(b.get('city'))
    if ca and cb and ca != cb:
        return 0
    same_city = bool(ca and cb)
    va, vb = venue_tokens(a), venue_tokens(b)
    if va and vb:
        qa, qb = va & _HALL_QUALIFIERS, vb & _HALL_QUALIFIERS
        if qa and qb and qa != qb:
            return 0                      # Grosser Saal vs Kleiner Saal
        if venue_similar(va, vb, same_city):
            return 3
        if not same_city:
            return 0
        # the same city at the same time, but the venue is named differently (an orchestra's
        # listing vs the hall's): the same performers, the same building or the same title
        shared = shared_performers(a, b)
        if shared >= 2:
            return 2
        # one performer in common in a building named alike ("Concorde espace culture" /
        # "Concorde, Grande Salle"): nobody plays in two halls at once
        if shared and (va & vb) - _GENERIC - _HALL_QUALIFIERS:
            return 2
        if venue_contains(a, b) or title_very_similar(a.get('title'), b.get('title')):
            return 1
        return 0
    if not same_city:
        return 0
    # a venue is missing: trust the city plus the same performers or a similar title
    if shared_performers(a, b) >= 2:
        return 2
    return 1 if title_similar(a.get('title'), b.get('title')) else 0


def match_strength(a, b):
    """0 when two events (from different sources, starting within DEDUPE_MINUTES of each other)
    are different concerts; otherwise how sure the match is (3 = similar venue, 2 = the same
    performers, 1 = one venue name contains the other or very similar titles).

    A similar venue is not enough when the listings name different halls of one building, or
    only one of them names a hall and nothing else (cast, title) ties them together: the
    "Tonhalle Zürich" listing of one ensemble is not the "Kleiner Saal" recital of another."""
    s = _base_strength(a, b)
    if not s:
        return 0
    shared = shared_performers(a, b)
    ha, hb = hall_part(a), hall_part(b)
    if bool(ha) != bool(hb) and not shared and not title_similar(a.get('title'), b.get('title')):
        # a building vs one of its halls, nothing in common: two casts that differ, or a listing
        # without a cast that can only mean the building's main hall, not "Hans Huber-Saal"
        if (a.get('credits') and b.get('credits')) or not (ha or hb) & _MAIN_HALL:
            return 0
    fa, fb = ha - _HALL_FILLER, hb - _HALL_FILLER
    if fa and fb and not fa & fb and shared < 2:
        return 0                          # two named halls: Konzertsaal vs Luzerner Saal
    if s == 1 and not shared and not venue_contains(a, b):
        da = venue_tokens(a) - _GENERIC - _HALL_QUALIFIERS
        db = venue_tokens(b) - _GENERIC - _HALL_QUALIFIERS
        if da and db and not da & db:
            return 0                      # a similar title in two places: Fraumünster vs Grossmünster
    return s


def same_concert(a, b):
    """True when two events (from different sources) describe the same performance.
    The caller has already checked that the starts are within DEDUPE_MINUTES."""
    return match_strength(a, b) > 0


def richness(ev):
    return (2 * len(ev.get('credits') or []) + 2 * len(ev.get('program') or [])
            + sum(1 for f in ('venueName', 'city', 'durationMin', 'type', 'series', 'ticketUrl', 'url') if ev.get(f)))


# ticket shops that sell for many Swiss venues: fine, but the venue's own box office is better
_TICKET_SHOPS = ('ticketcorner.ch', 'ticketino.com', 'starticket.ch', 'eventfrog.ch', 'petzi.ch', 'monbillet.ch',
                 'seetickets', 'eventim', 'ticketportal', '442hz.com', 'tixly', 'kulturticket.ch', 'ticketmaster',
                 'etix.com', 'infomaniak', 'fnac', 'biletino', 'tickets.ch')


def _site(url):
    """Registrable domain of a URL ('kartenverkauf.theatercasino.ch' -> 'theatercasino.ch')."""
    try:
        host = (urllib.parse.urlsplit(str(url or '')).hostname or '').lower().rstrip('.')
    except ValueError:
        return ''
    parts = host.split('.')
    return '.'.join(parts[-2:]) if len(parts) >= 2 else host


def _is_ticket_shop(url):
    host = (urllib.parse.urlsplit(str(url or '')).hostname or '').lower()
    return bool(host) and any(shop in host for shop in _TICKET_SHOPS)


def ticket_rank(url, home):
    """3: on the venue's or the organiser's own domain (``home``), 2: a ticket shop or a Swiss
    site, 1: an unrelated foreign site (often a copy-paste slip on the source site), 0: none."""
    if not url:
        return 0
    site = _site(url)
    if site and site in home:
        return 3
    host = (urllib.parse.urlsplit(url).hostname or '').lower()
    if any(shop in host for shop in _TICKET_SHOPS) or host.endswith(('.ch', '.li')):
        return 2
    return 1


def _credit_score(credits):
    names = {_name_key(c.get('name')) for c in credits or []}
    return (len(names), sum(1 for c in credits or [] if c.get('role') != 'Performer'))


def _program_score(program):
    """(work titles, lines): the interval or an end time ('- Pause -') is not a work."""
    lines = [p for p in program or [] if isinstance(p, dict) and not common.is_not_work_line(p.get('composer'), p.get('title'))]
    return (sum(1 for p in lines if p.get('title')), len(lines))


def _translit(word):
    """'tschaikowsky' and 'tchaikovsky' -> one spelling (as js/ics.js translit does)."""
    w = word.replace('tsch', 'ch').replace('sch', 'sh').replace('tch', 'ch').replace('ae', 'a').replace('oe', 'o')
    w = w.replace('ue', 'u').replace('ou', 'u').replace('w', 'v').replace('j', 'i').replace('y', 'i').replace('kh', 'k')
    return re.sub(r'ff$', 'v', w)


def _composer_words(composer):
    """The telling name words of a composer line ('Pjotr Iljitsch Tschaikowsky' -> {'chaiko', 'iliich', 'piotr'}),
    life dates and arrangers' notes left out."""
    text = re.sub(r'\([^)]*\)', ' ', common._fold(composer))
    return {_translit(w)[:6] for w in re.findall(r'[a-z]{4,}', text) if w not in ('arrangement', 'bearbeitung', 'nach')}


def _composers_cover(program, other):
    """True when every composer of ``other`` is also named in ``program`` (one name word in
    common is enough: 'Mendelssohn' / 'Felix Mendelssohn Bartholdy')."""
    words = set().union(*[_composer_words(p.get('composer')) for p in program or [] if isinstance(p, dict)] or [set()])
    for p in other or []:
        mine = _composer_words(p.get('composer')) if isinstance(p, dict) else set()
        if mine and not mine & words:
            return False
    return True


_GROUP_ROLES = {'Orchestra', 'Choir', 'Ensemble'}


def _people(credits):
    """The performers named as people (not orchestras, choirs or ensembles), as name keys."""
    return {_performer_key(c.get('name')) for c in credits or []
            if isinstance(c, dict) and c.get('role') not in _GROUP_ROLES} - {''}


def ordered(ev):
    out = {k: ev[k] for k in KEY_ORDER if k in ev and ev[k] not in (None, '', [])}
    out.update({k: v for k, v in ev.items() if k not in out and k not in KEY_ORDER and v not in (None, '', [])})
    return out


def merge(a, b, priority, sites=None):
    """One record for two listings of the same performance.

    The record of the source with the higher priority is kept (then the richer one), so the
    id, title and link of a performance stay the same from day to day. It takes the richer
    facts of the two: the longer cast (a bare 'Performer' role is replaced by the other
    listing's instrument), the programme with more work titles, the more specific venue
    ("Casino Bern, Grosser Saal" over "Casino Bern"), and the ticket link on the venue's or
    the organiser's own domain rather than an unrelated foreign site. Empty fields are filled
    from the other record. ``sites`` maps source key -> the source's SITE URL."""
    rank_a = (priority.get(a['source'], 0), richness(a))
    rank_b = (priority.get(b['source'], 0), richness(b))
    win, lose = (a, b) if rank_a >= rank_b else (b, a)
    out = dict(win)
    for f in ('durationMin', 'city', 'venueName', 'type', 'series', 'credits', 'program', 'ticketUrl', 'url'):
        if not out.get(f) and lose.get(f):
            out[f] = lose[f]
    # the richer cast, with specific roles where the other listing knows them; but only a cast
    # that names every person the kept listing names (a listing not updated after a change of
    # conductor must not bring the old one back; an ensemble may be listed by its members)
    if lose.get('credits') and _credit_score(lose['credits']) > _credit_score(out.get('credits')) \
            and _people(out.get('credits')) <= _people(lose['credits']):
        out['credits'] = lose['credits']
    other = win if out.get('credits') is lose.get('credits') else lose
    roles = {_name_key(c.get('name')): c.get('role') for c in other.get('credits') or [] if c.get('role') != 'Performer'}
    if out.get('credits') and any(c.get('role') == 'Performer' and _name_key(c.get('name')) in roles
                                  for c in out['credits']):
        out['credits'] = [dict(c, role=roles[_name_key(c.get('name'))])
                          if c.get('role') == 'Performer' and _name_key(c.get('name')) in roles else c
                          for c in out['credits']]
    # the programme with more work titles (a listing often has composers only), when it names
    # every composer of the kept one (not a programme that was changed since)
    if lose.get('program') and _program_score(lose['program']) > _program_score(out.get('program')) \
            and _composers_cover(lose['program'], out.get('program')):
        out['program'] = lose['program']
    # the more specific venue name
    vw, vl = _name_key(out.get('venueName')), _name_key(lose.get('venueName'))
    if vw and vl and len(vl) > len(vw) and re.search(rf'(?<![a-z0-9]){re.escape(vw)}(?![a-z0-9])', vl):
        out['venueName'] = lose['venueName']
    # the ticket link on the venue's or organiser's own domain
    home = {_site(x) for x in (a.get('url'), b.get('url'), (sites or {}).get(a['source']),
                               (sites or {}).get(b['source'])) if x} - {''}
    # (a direct link to a ticket shop is kept: it sells the ticket, a venue's event page may not)
    if ticket_rank(lose.get('ticketUrl'), home) > ticket_rank(out.get('ticketUrl'), home) \
            and not _is_ticket_shop(out.get('ticketUrl')):
        out['ticketUrl'] = lose['ticketUrl']
    return ordered(out)


# "Kammerfas- sung" (a word broken at a line end on the site) -> "Kammerfassung"; "Sommer- und
# Herbstkonzerte" keeps its hyphen
_BROKEN_WORD_RE = re.compile(r'(?<=[a-zäöüéèàß])- (?!(?:und|oder|bis|et|ou|and|or|e|o)\b)(?=[a-zäöüéèà]{2})')


# "Champagner- Lied" / "Projekt- Ensemble" (broken before a noun) -> "Champagner-Lied"
_BROKEN_COMPOUND_RE = re.compile(r'(?<=[a-zäöüéèàß])- (?=[A-ZÄÖÜ][a-zäöüéèàß]{2})')


def _tidy_text(s, *, words=False):
    # also a line break that a site sends as the two characters backslash + n ('Tito Vespasiano\\n')
    s = re.sub(r'(?:\s|\\[nrt])+', ' ', unicodedata.normalize('NFC', s)).strip()
    return _BROKEN_COMPOUND_RE.sub('-', _BROKEN_WORD_RE.sub('', s)) if words else s


def _tidy_program(program):
    """Each line tidied; the interval and end-time lines dropped (also from reused events)."""
    out = []
    for p in program:
        if not isinstance(p, dict):
            out.append(p)
            continue
        p = {k: (_tidy_text(v, words=k == 'title') if isinstance(v, str) else v) for k, v in p.items()}
        if isinstance(p.get('title'), str):
            p['title'] = re.sub(r'\s*[*,;]+$', '', p['title'])
        if common.is_not_work_line(p.get('composer'), p.get('title')) or not (p.get('composer') or p.get('title')):
            continue
        out.append(p)
    return out


def tidy_event(ev):
    """Text as one line, with composed accents (some sites send "u" + U+0308): titles, venue,
    credits and programme. A line break inside a role ("Tito Vespasiano\\n") is a space."""
    out = dict(ev)
    for f in ('title', 'series', 'venueName', 'city'):
        if isinstance(out.get(f), str):
            out[f] = _tidy_text(out[f], words=f == 'title')
    if out.get('credits'):
        out['credits'] = [{k: (_tidy_text(v) if isinstance(v, str) else v) for k, v in c.items()}
                          if isinstance(c, dict) else c for c in out['credits']]
    if out.get('program'):
        out['program'] = _tidy_program(out['program'])
        if not out['program']:
            del out['program']
    return out


def _ts(ev):
    return common.to_zurich_datetime(ev['start']).timestamp()


def dedupe(events, priority, sites=None, merges=None):
    """Remove repeated ids within a source and the same performance listed by several
    sources. ``priority`` maps source key -> int, ``sites`` source key -> SITE URL.
    Returns (events sorted by start, merged count). When ``merges`` is a list, one record per
    cross-source merge is appended to it: {'id' (kept), 'absorbed', 'source' (of the absorbed
    listing), 'strength', 'minutes' (start difference)}."""
    by_id = {}
    for ev in events:
        prev = by_id.get(ev['id'])
        by_id[ev['id']] = ev if prev is None or richness(ev) > richness(prev) else prev
    merged = len(events) - len(by_id)
    pending = sorted(by_id.values(), key=lambda e: (_ts(e), e['source'], e['id']))
    window = DEDUPE_MINUTES * 60
    kept, times, absorbed = [], [], []      # absorbed[i]: the sources already merged into kept[i]
    for ev in pending:
        t = _ts(ev)
        best = None                          # (strength, -abs(dt), index)
        for i in range(len(kept) - 1, -1, -1):
            dt = t - times[i]
            if dt > 2 * window:
                break
            if abs(dt) > window or ev['source'] in absorbed[i]:
                continue
            strength = match_strength(kept[i], ev)
            if strength and (best is None or (strength, -abs(dt)) > best[:2]):
                best = (strength, -abs(dt), i)
        if best is None:
            kept.append(ordered(ev))
            times.append(t)
            absorbed.append({ev['source']})
        else:
            i = best[2]
            other = kept[i]
            kept[i] = merge(other, ev, priority, sites)
            gone = ev if kept[i]['id'] == other['id'] else other     # merge() keeps the higher-priority record
            log.info('merged %s into %s (%s, %d min apart)', gone['id'], kept[i]['id'],
                     {3: 'similar venue', 2: 'same performers', 1: 'venue/title'}[best[0]], round(-best[1] / 60))
            if merges is not None:
                merges.append({'id': kept[i]['id'], 'absorbed': gone['id'], 'source': gone['source'],
                               'strength': best[0], 'minutes': round(-best[1] / 60)})
            absorbed[i].add(ev['source'])
            merged += 1
    kept.sort(key=lambda e: (_ts(e), e['title'], e['id']))
    return kept, merged


def settle_types(events, kinds=None):
    """Last pass: fill in or correct each event's type from its facts (common.fix_type).
    ``kinds`` maps source key -> KIND. Returns (events, number changed)."""
    out, changed = [], 0
    for ev in events:
        fixed = common.fix_type(ev, (kinds or {}).get(ev.get('source')))
        if fixed.get('type') != ev.get('type') or fixed.get('series') != ev.get('series'):
            changed += 1
            fixed = ordered(fixed)
        out.append(fixed)
    return out, changed


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def _now_iso():
    return datetime.now(common.ZURICH).isoformat(timespec='seconds')


def _local_imports(path):
    """Files of the sources/ modules that the module at ``path`` imports
    (``from ._east import …``, ``from .geneva_victoria_hall import …``, ``import sources._x``)."""
    try:
        with open(path, encoding='utf-8') as f:
            tree = ast.parse(f.read(), filename=path)
    except (OSError, SyntaxError, ValueError, TypeError):
        return []
    names = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            if node.level == 1:
                if node.module:
                    names.append(node.module.split('.')[0])
                else:
                    names.extend(a.name for a in node.names)          # from . import _east
            elif node.level == 0 and (node.module or '').startswith('sources.'):
                names.append(node.module.split('.')[1])
        elif isinstance(node, ast.Import):
            names.extend(a.name.split('.')[1] for a in node.names if a.name.startswith('sources.'))
    here = os.path.join(HERE, 'sources')
    return [os.path.join(here, n + '.py') for n in names if os.path.isfile(os.path.join(here, n + '.py'))]


def code_files(src):
    """The reader's own file, the sources/ helper modules it imports (also indirectly), and
    common.py: what decides its output. Their contents make up the codeHash."""
    first = getattr(src.module, '__file__', None)
    files, todo = [], [first] if first else []
    while todo:
        path = os.path.abspath(todo.pop(0))
        if path in files:
            continue
        files.append(path)
        todo.extend(_local_imports(path))
    return files + [os.path.abspath(common.__file__)]


def _code_hash(src):
    h = hashlib.sha1()
    for path in code_files(src):
        try:
            with open(path, 'rb') as f:
                h.update(os.path.basename(path).encode('utf-8') + b'\0' + f.read())
        except (OSError, TypeError):
            pass
    return h.hexdigest()[:12]


def request_cap(src):
    """The reader's own MAX_REQUESTS (default common.MAX_REQUESTS), at most common.MAX_REQUESTS_CAP."""
    try:
        wanted = int(getattr(src.module, 'MAX_REQUESTS', src.max_requests or common.MAX_REQUESTS))
    except (TypeError, ValueError):
        wanted = common.MAX_REQUESTS
    return max(1, min(wanted, common.MAX_REQUESTS_CAP))


def _annotate(kind, message):
    if os.environ.get('GITHUB_ACTIONS') == 'true':
        print(f'::{kind}::{message}', flush=True)


def parse_args(argv):
    p = argparse.ArgumentParser(description='Build Klang data/concerts.json from the source readers.')
    p.add_argument('--only', help='comma-separated source keys to run (others are left out of the output)')
    p.add_argument('--out', default=DEFAULT_OUT, help='output file (default: data/concerts.json in the app)')
    p.add_argument('--previous', default=DEFAULT_PREVIOUS,
                   help='previous feed URL or path, used when a source fails; "none" to disable')
    p.add_argument('--fresh-hours', type=float, default=0,
                   help='reuse a source from the previous feed without fetching if it was fetched OK '
                        'less than H hours ago with the same reader code (used on push builds)')
    p.add_argument('--timeout', type=int, default=None,
                   help='per-source time limit in seconds (default: the reader\'s TIME_LIMIT or 600)')
    p.add_argument('--show', type=int, default=0, metavar='N', help='print N sample events per source')
    p.add_argument('--strict', action='store_true', help='exit 1 if a source failed without a fallback')
    p.add_argument('--list', action='store_true', help='list the readers and their attribution, fetch nothing')
    p.add_argument('-v', '--verbose', action='store_true', help='log every request')
    return p.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format='%(levelname)s %(name)s: %(message)s', stream=sys.stderr)
    if args.list:
        for s in registry.discover():
            print(f'{s.key:<24} {s.kind:<10} prio {s.priority:<3} {"" if s.enabled else "(disabled) "}{s.name} | {s.site} | '
                  f'{s.attribution}' + (f' | ERROR: {s.error}' if s.error else ''))
        return 0
    out_path = os.path.abspath(args.out)
    only = [k.strip() for k in args.only.split(',') if k.strip()] if args.only else None
    if only:
        unknown = sorted(set(only) - set(registry.module_names()))
        if unknown:
            print(f'Unknown source(s): {", ".join(unknown)}. Available: {", ".join(registry.module_names()) or "none"}',
                  file=sys.stderr)
            return 2
        if out_path == os.path.abspath(DEFAULT_OUT):
            log.warning('--only writes ONLY the selected sources into %s', out_path)

    today = common.today_zurich()
    last_day = today + timedelta(days=WINDOW_DAYS)
    previous = Previous(args.previous, out_path)
    sources = [s for s in registry.discover(only) if s.enabled or (only and s.key in only)]
    if not sources:
        print('No source readers found in tools/feeds/sources/.')
    codes, changed = {}, []
    for src in sources:
        if src.module is not None:
            src.max_requests = request_cap(src)    # the registry stops at the default of 60
            codes[src.key] = _code_hash(src)
    # readers reuse details they read on earlier runs (common.previous_event); after a change
    # to a reader's code all of its reused details are due for a re-read (common.refresh_due)
    feed = previous.data() if sources else None
    for src in sources:
        old = (previous.info(src.key) or {}).get('codeHash') if feed else None
        if old and src.key in codes and old != codes[src.key]:
            changed.append(src.key)
    known = common.set_previous(feed, code_changed=changed)
    if known:
        log.info('previous feed handed to the readers: %d events (reader code changed since: %s)', known,
                 ', '.join(changed) or 'none')

    results, entries, all_events, priority, kinds, sites = [], [], [], {}, {}, {}
    for src in sources:
        priority[src.key] = src.priority
        kinds[src.key] = src.kind
        sites[src.key] = src.site
        res = Result(key=src.key)
        code = codes.get(src.key)
        info = None
        if args.fresh_hours > 0 and not src.error:
            info = previous.info(src.key)
        fresh = False
        if info and info.get('ok') and info.get('fetchedAt') and info.get('codeHash') == code:
            try:
                age_h = (datetime.now(common.ZURICH) - common.to_zurich_datetime(info['fetchedAt'])).total_seconds() / 3600
                fresh = 0 <= age_h <= args.fresh_hours
            except ValueError:
                fresh = False
        if fresh:
            res.events, _, _, _ = check_events(previous.events(src.key), src.key, today, last_day)
            res.reused, res.fetched_at = True, info['fetchedAt']
            res.note = f'reused, fetched {age_h:.1f} h ago'
        else:
            if src.error:
                events, error, note, used, secs, trace = None, src.error, None, 0, 0.0, None
            else:
                limit = args.timeout or src.time_limit
                events, error, note, used, secs, trace = run_source(src, limit)
            res.requests, res.seconds, res.note, res.trace = used, secs, note, trace
            if error is None:
                kept, invalid, outside, problems = check_events(events, src.key, today, last_day)
                res.invalid = invalid
                if invalid:
                    log.warning('%s: dropped %d invalid event(s), e.g. %s', src.key, invalid, '; '.join(problems))
                if events and invalid == len(events):
                    error = f'all {invalid} events invalid ({problems[0]})'
                elif not events:
                    prev_count = len(previous.events(src.key))
                    if prev_count >= SUSPICIOUS_PREVIOUS:
                        error = f'returned no events (previous feed had {prev_count})'
                if error is None:
                    res.events, res.fetched_at = kept, _now_iso()
            if error is not None:
                res.ok, res.error = False, error
                old, _, _, _ = check_events(previous.events(src.key), src.key, today, last_day)
                if old:
                    res.events, res.reused = old, True
                    res.fetched_at = (previous.info(src.key) or {}).get('fetchedAt')
                _annotate('warning', f'source {src.key} failed: {error}'
                          + (f' (reused {len(old)} previous events)' if old else ' (no previous events)'))
        results.append(res)
        all_events.extend(res.events)
        entries.append({
            'key': src.key, 'name': src.name, 'site': src.site, 'attribution': src.attribution,
            'count': len(res.events), 'ok': res.ok, 'error': res.error, 'reused': res.reused,
            'fetchedAt': res.fetched_at, 'codeHash': code,
        })
        status = 'ok' if res.ok and not res.reused else ('fresh' if res.ok else ('REUSED' if res.reused else 'FAILED'))
        print(f'  {src.key:<24} {status:<7} {len(res.events):>5} events  {res.requests:>3} req  {res.seconds:6.1f}s'
              + (f'  {res.error}' if res.error else '') + (f'  [{res.note}]' if res.note else ''), flush=True)
        if res.trace:
            print('    ' + '\n    '.join(res.trace.strip().splitlines()[-6:]), file=sys.stderr)
        for ev in res.events[:max(0, args.show)]:
            print('    ' + json.dumps(ev, ensure_ascii=False))

    merges = []
    concerts, merged = dedupe([tidy_event(ev) for ev in all_events], priority, sites, merges)
    concerts, retyped = settle_types(concerts, kinds)
    if retyped:
        log.info('type or series set from the facts for %d concert(s)', retyped)
    for entry in entries:   # counts after de-duplication
        entry['count'] = sum(1 for c in concerts if c['source'] == entry['key'])
    doc = {
        'generatedAt': _now_iso(),
        'generator': 'Klang feed builder (tools/feeds/build.py)',
        'notice': "Facts only (date, time, title, venue, performers, works, links) from each source's "
                  'public listings; see sources[].attribution. No descriptions or images are copied.',
        'window': {'from': today.isoformat(), 'to': last_day.isoformat()},
        'sources': entries,
        'concerts': concerts,
        # listings merged into another source's record of the same performance (for audits)
        'merges': sorted(merges, key=lambda m: (m['id'], m['absorbed'])),
    }
    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    tmp = out_path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write('\n')
    os.replace(tmp, out_path)

    failed = [r.key for r in results if not r.ok]
    lost = [r.key for r in results if not r.ok and not r.reused]
    print(f'{len(concerts)} concerts from {len(sources)} source(s), {merged} duplicate(s) merged'
          + (f'; failed: {", ".join(failed)}' if failed else '')
          + (f' (no fallback for {", ".join(lost)})' if lost else '') + f' -> {out_path}')
    return 1 if (args.strict and lost) else 0


if __name__ == '__main__':
    sys.exit(main())
