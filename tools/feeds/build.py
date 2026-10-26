#!/usr/bin/env python3
"""Build Klang's real-concert feed from the readers in tools/feeds/sources/.

    python3 tools/feeds/build.py [--only k1,k2] [--out data/concerts.json]
                                 [--previous URL_OR_PATH | --previous none]
                                 [--fresh-hours H] [--timeout S] [--show N] [--strict] [-v]
    python3 tools/feeds/build.py --list

Each reader runs on its own (one at a time, isolated try/except, time limit, request cap).
Events are checked, limited to today .. today+450 days (Swiss time), de-duplicated across
sources, sorted, and written as {"generatedAt", "sources": [...], "concerts": [...]}.

When a reader fails (or suddenly returns nothing), its events from the previous feed
(--previous, default: the published one) are reused, so one broken site does not empty a
city. Exit status: 0 unless build.py itself has a bug (or --strict and a source failed
without a fallback); 2 for bad arguments.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import re
import sys
import threading
import time
import traceback
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


def venue_similar(va, vb):
    qa, qb = va & _HALL_QUALIFIERS, vb & _HALL_QUALIFIERS
    if qa and qb and qa != qb:
        return False        # Grosser Saal vs Kleiner Saal
    if va == vb:
        return True
    small, big = (va, vb) if len(va) <= len(vb) else (vb, va)
    if small <= _GENERIC | _HALL_QUALIFIERS:
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


def same_concert(a, b):
    """True when two events (from different sources) describe the same performance.
    The caller has already checked that the starts are within DEDUPE_MINUTES."""
    ca, cb = city_key(a.get('city')), city_key(b.get('city'))
    if ca and cb and ca != cb:
        return False
    va, vb = venue_tokens(a), venue_tokens(b)
    if va and vb:
        if venue_similar(va, vb):
            return True
        return False
    # a venue is missing: only trust a matching city plus a similar title
    return bool(ca and cb) and title_similar(a.get('title'), b.get('title'))


def richness(ev):
    return (2 * len(ev.get('credits') or []) + 2 * len(ev.get('program') or [])
            + sum(1 for f in ('venueName', 'city', 'durationMin', 'type', 'series', 'ticketUrl', 'url') if ev.get(f)))


def ordered(ev):
    out = {k: ev[k] for k in KEY_ORDER if k in ev and ev[k] not in (None, '', [])}
    out.update({k: v for k, v in ev.items() if k not in out and k not in KEY_ORDER and v not in (None, '', [])})
    return out


def merge(a, b, priority):
    """Keep the preferred record (higher source priority, then richer); fill its gaps from the other."""
    rank_a = (priority.get(a['source'], 0), richness(a))
    rank_b = (priority.get(b['source'], 0), richness(b))
    win, lose = (a, b) if rank_a >= rank_b else (b, a)
    out = dict(win)
    for f in ('durationMin', 'city', 'venueName', 'type', 'series', 'credits', 'program', 'ticketUrl', 'url'):
        if not out.get(f) and lose.get(f):
            out[f] = lose[f]
    return ordered(out)


def _ts(ev):
    return common.to_zurich_datetime(ev['start']).timestamp()


def dedupe(events, priority):
    """Remove repeated ids within a source and the same performance listed by several
    sources. ``priority`` maps source key -> int. Returns (events sorted by start, merged)."""
    by_id = {}
    for ev in events:
        prev = by_id.get(ev['id'])
        by_id[ev['id']] = ev if prev is None or richness(ev) > richness(prev) else prev
    merged = len(events) - len(by_id)
    pending = sorted(by_id.values(), key=lambda e: (_ts(e), e['source'], e['id']))
    window = DEDUPE_MINUTES * 60
    kept = []
    for ev in pending:
        t = _ts(ev)
        hit = None
        for i in range(len(kept) - 1, -1, -1):
            dt = t - _ts(kept[i])
            if dt > 2 * window:
                break
            if abs(dt) <= window and kept[i]['source'] != ev['source'] and same_concert(kept[i], ev):
                hit = i
                break
        if hit is None:
            kept.append(ordered(ev))
        else:
            kept[hit] = merge(kept[hit], ev, priority)
            merged += 1
    kept.sort(key=lambda e: (_ts(e), e['title'], e['id']))
    return kept, merged


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def _now_iso():
    return datetime.now(common.ZURICH).isoformat(timespec='seconds')


def _code_hash(src):
    h = hashlib.sha1()
    for path in (getattr(src.module, '__file__', None), common.__file__):
        try:
            with open(path, 'rb') as f:
                h.update(f.read())
        except (OSError, TypeError):
            pass
    return h.hexdigest()[:12]


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

    results, entries, all_events, priority = [], [], [], {}
    for src in sources:
        priority[src.key] = src.priority
        res = Result(key=src.key)
        code = _code_hash(src) if src.module else None
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

    concerts, merged = dedupe(all_events, priority)
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
