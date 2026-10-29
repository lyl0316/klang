"""Shared helpers for Klang's concert feed readers.

Python 3.9+ standard library only. Every reader in ``sources/`` imports from here:

    from common import get, get_json, jsonld_events, parse_ics, to_zurich_iso, clean, \
        guess_type, make_event, today_zurich, FetchError

Politeness is built into ``get``: it identifies as KlangConcertBot, obeys robots.txt
(cached per host), waits between requests to the same host (at least ``MIN_DELAY``
seconds, longer if robots.txt asks via Crawl-delay or Request-rate), retries twice on
transient errors, and stops after ``MAX_REQUESTS`` requests per source (a reader that
reads one detail page per concert may raise its own cap up to ``MAX_REQUESTS_CAP``;
``build.py`` also sets a per-source time limit). It never logs in and never sends forms.

Readers that read detail pages can reuse what the previous feed already knows about a
concert (``previous_event``) and spend their requests on concerts still missing details.
"""
from __future__ import annotations

import codecs
import copy
import difflib
import gzip
import hashlib
import html
import http.client
import json
import logging
import os
import re
import socket
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import zlib
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

__all__ = [
    # the shared API
    'get', 'get_json', 'jsonld_events', 'parse_ics', 'to_zurich_iso', 'clean', 'guess_type',
    'make_event', 'today_zurich', 'FetchError',
    # extras
    'BudgetExceeded', 'to_zurich_datetime', 'as_list', 'looks_cancelled', 'requests_left',
    'source_budget', 'USER_AGENT', 'ZURICH', 'TYPES', 'MIN_DELAY', 'MAX_REQUESTS', 'MAX_REQUESTS_CAP', 'log',
    # incremental details and type rules
    'event_id', 'previous_event', 'previous_events', 'set_previous', 'refresh_due', 'same_title', 'infer_type',
    'fix_type',
]

USER_AGENT = 'KlangConcertBot/1.0 (+https://lyl0316.github.io/klang/; personal, non-commercial)'
BOT_TOKEN = 'KlangConcertBot'          # product token matched against robots.txt groups
ZURICH = ZoneInfo('Europe/Zurich')
MIN_DELAY = 1.5                        # seconds between two requests to the same host
MAX_REQUESTS = 60                      # HTTP requests per source per run, unless the reader sets MAX_REQUESTS
MAX_REQUESTS_CAP = 150                 # the most a reader may ask for (detail-heavy readers)
MAX_BYTES = 20 * 1024 * 1024           # refuse responses larger than this
RETRIES = 2                            # extra attempts after a transient failure
BACKOFF = (5.0, 15.0)                  # seconds to wait before retry 1 and 2
MAX_RETRY_AFTER = 120.0                # longest Retry-After we are willing to wait
TYPES = ('orchestral', 'chamber', 'recital', 'vocal-opera', 'mixed')

log = logging.getLogger('feeds')


# ---------------------------------------------------------------------------
# errors and per-source budget
# ---------------------------------------------------------------------------

class FetchError(Exception):
    """A polite GET could not (or must not) be completed. ``status`` is the HTTP code, if any."""

    def __init__(self, url, reason, status=None):
        super().__init__(f'{reason} ({url})')
        self.url = url
        self.reason = reason
        self.status = status


class BudgetExceeded(FetchError):
    """The source used up its request cap or its time limit; no request was sent."""


class _Budget:
    def __init__(self, key=None, max_requests=MAX_REQUESTS, deadline=None):
        self.key = key
        self.max_requests = max(0, min(int(max_requests), MAX_REQUESTS_CAP))
        self.deadline = deadline          # time.monotonic() value, or None
        self.used = 0                     # HTTP requests sent (robots.txt not counted)
        self.exhausted = None             # reason string once the budget ran out

    def check(self, url, wait=0.0):
        if self.used >= self.max_requests:
            self.exhausted = f'request cap of {self.max_requests} reached'
            raise BudgetExceeded(url, self.exhausted)
        if self.deadline is not None and time.monotonic() + wait > self.deadline:
            self.exhausted = 'time limit reached'
            raise BudgetExceeded(url, self.exhausted)


_local = threading.local()


def _budget():
    b = getattr(_local, 'budget', None)
    if b is None:
        b = _local.budget = _Budget()
    return b


@contextmanager
def source_budget(key, *, max_requests=MAX_REQUESTS, seconds=None):
    """Give the current thread a fresh request budget (used by build.py around each fetch()).
    ``max_requests`` is clamped to MAX_REQUESTS_CAP."""
    previous = getattr(_local, 'budget', None)
    b = _Budget(key, max_requests, time.monotonic() + seconds if seconds else None)
    _local.budget = b
    try:
        yield b
    finally:
        _local.budget = previous


def requests_left() -> int:
    """How many more requests the running source may send."""
    b = _budget()
    return max(0, b.max_requests - b.used)


# ---------------------------------------------------------------------------
# robots.txt (RFC 9309), cached per origin
# ---------------------------------------------------------------------------

class _Robots:
    """robots.txt rules for our user agent.

    Parsed twice: by a small RFC 9309 matcher (``*`` / ``$`` wildcards, longest match wins,
    Allow wins ties, decimal Crawl-delay; urllib.robotparser supports none of these) and
    by ``urllib.robotparser``. The RFC matcher decides whenever one of its rules applies;
    when none does, urllib.robotparser must also allow the URL.
    """

    def __init__(self, text=None, *, allow_all=False, disallow_all=False, note=''):
        self.allow_all = allow_all
        self.disallow_all = disallow_all
        self.note = note
        self.rules = []          # (allow, pattern, compiled regex)
        self.crawl_delay = None
        self.request_rate = None  # (requests, seconds)
        self.rp = None
        if text is not None:
            self._parse(text)

    def _parse(self, text):
        lines = text.replace('\r\n', '\n').replace('\r', '\n').split('\n')
        token = BOT_TOKEN.lower()
        groups = []              # [agents(set), rules(list), crawl_delay, request_rate]
        current = None
        in_agents = False
        for raw in lines:
            line = raw.split('#', 1)[0].strip()
            if ':' not in line:
                continue
            field, value = (s.strip() for s in line.split(':', 1))
            field = field.lower()
            if field == 'user-agent':
                if not in_agents:
                    current = [set(), [], None, None]
                    groups.append(current)
                    in_agents = True
                current[0].add(value.lower())
                continue
            in_agents = False
            if current is None:
                continue
            if field in ('allow', 'disallow'):
                if value:
                    current[1].append((field == 'allow', value))
            elif field == 'crawl-delay':
                try:
                    current[2] = max(0.0, float(value))
                except ValueError:
                    pass
            elif field == 'request-rate':
                m = re.match(r'(\d+)\s*/\s*(\d+)\s*([smhd]?)', value, re.I)
                if m and int(m.group(1)) > 0:
                    secs = int(m.group(2)) * {'': 1, 's': 1, 'm': 60, 'h': 3600, 'd': 86400}[m.group(3).lower()]
                    current[3] = (int(m.group(1)), secs)

        def agent_matches(agent):
            name = re.match(r'[a-z_-]*', agent).group(0)
            return name == token

        mine = [g for g in groups if any(agent_matches(a) for a in g[0])]
        if not mine:
            mine = [g for g in groups if '*' in g[0]]
        for agents, rules, delay, rate in mine:
            for allow, pattern in rules:
                self.rules.append((allow, pattern, _robots_regex(pattern)))
            if delay is not None:
                self.crawl_delay = max(self.crawl_delay or 0.0, delay)
            if rate is not None:
                self.request_rate = rate

        # urllib.robotparser as a second opinion for URLs none of our rules cover
        self.rp = urllib.robotparser.RobotFileParser()
        self.rp.parse(lines)

    @property
    def delay(self):
        d = MIN_DELAY
        if self.crawl_delay:
            d = max(d, self.crawl_delay)
        if self.request_rate:
            n, secs = self.request_rate
            d = max(d, secs / n)
        return d

    def allowed(self, url):
        if self.disallow_all:
            return False
        if self.allow_all:
            return True
        parts = urllib.parse.urlsplit(url)
        target = urllib.parse.unquote(parts.path or '/') + (f'?{urllib.parse.unquote(parts.query)}' if parts.query else '')
        if target == '/robots.txt':
            return True
        best = None  # (length, allow)
        for allow, pattern, rx in self.rules:
            if rx.match(target):
                cand = (len(pattern), allow)
                if best is None or cand[0] > best[0] or (cand[0] == best[0] and allow):
                    best = cand
        if best is not None:
            return best[1]
        return self.rp.can_fetch(BOT_TOKEN, url) if self.rp is not None else True


def _robots_regex(pattern):
    pattern = urllib.parse.unquote(pattern)
    anchored = pattern.endswith('$')
    if anchored:
        pattern = pattern[:-1]
    rx = '.*'.join(re.escape(p) for p in pattern.split('*'))
    return re.compile(rx + ('$' if anchored else ''), re.S)


_robots_cache = {}
_robots_lock = threading.Lock()


def _origin(url):
    p = urllib.parse.urlsplit(url)
    return f'{p.scheme.lower()}://{p.netloc.lower()}'


def _robots_for(url):
    origin = _origin(url)
    with _robots_lock:
        r = _robots_cache.get(origin)
        if r is None:
            r = _robots_cache[origin] = _load_robots(origin)
    return r


def _load_robots(origin):
    url = origin + '/robots.txt'
    host = urllib.parse.urlsplit(origin).netloc.lower()
    last = ''
    for attempt in range(RETRIES + 1):
        _wait_turn(host, MIN_DELAY)
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Accept': 'text/plain,*/*;q=0.5',
                                                   'Accept-Encoding': 'gzip'})
        try:
            with _plain_opener.open(req, timeout=20) as resp:
                raw = _decompress(resp.read(512 * 1024), resp.headers.get('Content-Encoding', ''))
                text = _decode(raw, resp.headers.get('Content-Type', ''))
                log.debug('robots.txt %s: %d bytes', origin, len(raw))
                if re.match(r'\s*(?:<!doctype\s+html|<html|<head)', text, re.I):
                    # a challenge or error page instead of robots.txt (captcha, bot protection): the
                    # site is not letting us read its rules, so treat it as unreachable, not "no rules"
                    return _Robots(disallow_all=True, note='robots.txt is an HTML page (bot protection?)')
                robots = _Robots(text)
                with _host_lock:   # honour Crawl-delay from the very first page request
                    _next_slot[host] = max(_next_slot.get(host, 0.0), time.monotonic() + robots.delay)
                return robots
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                return _Robots(disallow_all=True, note=f'robots.txt answered HTTP {e.code}')
            if 400 <= e.code < 500:
                return _Robots(allow_all=True, note=f'no robots.txt (HTTP {e.code})')
            last = f'HTTP {e.code}'
        except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError,
                http.client.HTTPException, OSError) as e:
            last = str(getattr(e, 'reason', e))
        if attempt < RETRIES:
            time.sleep(BACKOFF[min(attempt, len(BACKOFF) - 1)])
    # RFC 9309: if robots.txt is unreachable, assume complete disallow.
    return _Robots(disallow_all=True, note=f'robots.txt unreachable ({last})')


# ---------------------------------------------------------------------------
# polite GET
# ---------------------------------------------------------------------------

_host_lock = threading.Lock()
_next_slot = {}   # host -> earliest time.monotonic() for the next request


def _wait_turn(host, delay, budget=None, url=None):
    with _host_lock:
        now = time.monotonic()
        slot = max(now, _next_slot.get(host, 0.0))
        if budget is not None:
            budget.check(url, slot - now)
        _next_slot[host] = slot + delay
    if slot > now:
        time.sleep(slot - now)


class _PoliteRedirect(urllib.request.HTTPRedirectHandler):
    max_redirections = 5

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not newurl.lower().startswith(('http://', 'https://')):
            raise FetchError(newurl, 'redirect to a non-http URL')
        if not _robots_for(newurl).allowed(newurl):
            raise FetchError(newurl, 'redirect target disallowed by robots.txt')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_opener = urllib.request.build_opener(_PoliteRedirect)
_plain_opener = urllib.request.build_opener()


def _decompress(raw, encoding):
    encoding = (encoding or '').lower().strip()
    if encoding == 'gzip' or (encoding == '' and raw[:2] == b'\x1f\x8b'):
        return gzip.decompress(raw)
    if encoding == 'deflate':
        try:
            return zlib.decompress(raw)
        except zlib.error:
            return zlib.decompress(raw, -zlib.MAX_WBITS)
    return raw


def _decode(raw, content_type=''):
    if raw.startswith(codecs.BOM_UTF8):
        return raw[3:].decode('utf-8', 'replace')
    candidates = []
    m = re.search(r'charset=["\']?([\w.:-]+)', content_type or '', re.I)
    if m:
        candidates.append(m.group(1))
    head = raw[:4096].decode('ascii', 'ignore')
    m = re.search(r'<meta[^>]+charset=["\']?([\w.:-]+)', head, re.I)
    if m:
        candidates.append(m.group(1))
    for enc in candidates:
        try:
            return raw.decode(enc, 'replace')
        except LookupError:
            continue
    try:
        return raw.decode('utf-8')
    except UnicodeDecodeError:
        return raw.decode('cp1252', 'replace')


def _retry_after(headers):
    value = (headers or {}).get('Retry-After') if headers is not None else None
    if not value:
        return None
    value = value.strip()
    if value.isdigit():
        return float(value)
    try:
        from email.utils import parsedate_to_datetime
        return max(0.0, (parsedate_to_datetime(value) - datetime.now(timezone.utc)).total_seconds())
    except (TypeError, ValueError):
        return None


def _safe_url(url):
    """Percent-encode spaces / non-ASCII in path and query, IDNA-encode the host, drop the fragment."""
    p = urllib.parse.urlsplit(url.strip())
    netloc = p.netloc
    try:
        netloc.encode('ascii')
    except UnicodeEncodeError:
        netloc = p.hostname.encode('idna').decode('ascii') + (f':{p.port}' if p.port else '')
    path = urllib.parse.quote(p.path or '/', safe="/%:@!$&'()*+,;=-._~")
    query = urllib.parse.quote(p.query, safe="/?%:@!$&'()*+,;=-._~")
    return urllib.parse.urlunsplit((p.scheme.lower(), netloc, path, query, ''))


def _fetch(url, accept, timeout, headers):
    if not isinstance(url, str) or not re.match(r'\s*https?://[^/\s]+', url, re.I):
        raise FetchError(url, 'not an absolute http(s) URL')
    try:
        url = _safe_url(url)
    except (ValueError, UnicodeError) as e:
        raise FetchError(url, f'bad URL: {e}') from None
    budget = _budget()
    robots = _robots_for(url)
    if not robots.allowed(url):
        raise FetchError(url, 'disallowed by robots.txt' + (f' ({robots.note})' if robots.note else ''))
    host = urllib.parse.urlsplit(url).netloc.lower()
    send = {'Accept': accept or 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate'}
    for k, v in (headers or {}).items():
        if k.lower() not in ('user-agent', 'cookie', 'authorization'):
            send[k] = v
    send['User-Agent'] = USER_AGENT
    for attempt in range(RETRIES + 1):
        budget.check(url)
        _wait_turn(host, robots.delay, budget, url)
        budget.used += 1
        log.debug('GET %s', url)
        retry_wait = None
        try:
            with _opener.open(urllib.request.Request(url, headers=send), timeout=timeout) as resp:
                raw = resp.read(MAX_BYTES + 1)
                if len(raw) > MAX_BYTES:
                    raise FetchError(url, f'response larger than {MAX_BYTES} bytes')
                raw = _decompress(raw, resp.headers.get('Content-Encoding', ''))
                return raw, resp.headers.get('Content-Type', '')
        except urllib.error.HTTPError as e:
            e.close()
            if e.code in (429, 500, 502, 503, 504) and attempt < RETRIES:
                retry_wait = min(_retry_after(e.headers) or BACKOFF[min(attempt, len(BACKOFF) - 1)], MAX_RETRY_AFTER)
                reason = f'HTTP {e.code}'
            else:
                raise FetchError(url, f'HTTP {e.code}', e.code) from None
        except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError,
                http.client.HTTPException, OSError, EOFError, zlib.error) as e:
            reason = f'network error: {getattr(e, "reason", e)}'
            if attempt >= RETRIES:
                raise FetchError(url, reason) from None
            retry_wait = BACKOFF[min(attempt, len(BACKOFF) - 1)]
        log.info('retrying %s in %.0fs (%s)', url, retry_wait, reason)
        budget.check(url, retry_wait)
        time.sleep(retry_wait)
    raise FetchError(url, 'gave up')  # not reached


def get(url, *, accept=None, timeout=30, headers=None) -> str:
    """Politely GET ``url`` and return the body as text. Raises FetchError.

    robots.txt is checked (also for redirect targets), requests to one host are spaced
    by max(MIN_DELAY, Crawl-delay), 429/5xx/network errors are retried twice, and the
    running source's request cap / time limit is enforced (BudgetExceeded).
    ``headers`` may add e.g. Accept-Language; User-Agent, Cookie and Authorization
    cannot be overridden.
    """
    raw, ctype = _fetch(url, accept, timeout, headers)
    return _decode(raw, ctype)


def get_json(url, **kw):
    """``get`` + ``json.loads``. Raises FetchError on HTTP or JSON errors."""
    kw.setdefault('accept', 'application/json, text/javascript;q=0.5, */*;q=0.1')
    text = get(url, **kw)
    try:
        return json.loads(text.lstrip('﻿'))
    except ValueError as e:
        raise FetchError(url, f'invalid JSON: {e}; starts {text[:80]!r}') from None


# ---------------------------------------------------------------------------
# text helpers
# ---------------------------------------------------------------------------

_INVISIBLE = dict.fromkeys(map(ord, '\xad​‌‍⁠﻿'), None)
_TAG_RE = re.compile(r'</?[A-Za-z!][^>]*>')


def clean(text) -> str:
    """Strip tags and entities (incl. &shy;, nbsp, zero-width chars) and collapse whitespace."""
    if text is None:
        return ''
    s = str(text)
    if '<' in s:
        s = re.sub(r'(?is)<(script|style)\b.*?</\1\s*>', ' ', s)
        s = re.sub(r'(?i)<br\s*/?>|</(p|div|li|h[1-6]|tr|td|th|dd|dt)\s*>', ' ', s)
        s = _TAG_RE.sub('', s)
    if '&' in s:
        s = html.unescape(s)
        if re.search(r'&(#\d+|#x[0-9a-f]+|[a-z]+);', s, re.I):   # double-escaped (&amp;shy;)
            s = html.unescape(s)
    s = s.translate(_INVISIBLE)
    return re.sub(r'\s+', ' ', s).strip()


def _fold(text):
    """lowercase ASCII-ish form for matching: 'Zürich Opéra' -> 'zurich opera'."""
    s = unicodedata.normalize('NFKD', str(text or '')).replace('ß', 'ss')
    return ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()


def as_list(value) -> list:
    """None -> [], list/tuple -> list, anything else -> [value]. Handy for JSON-LD."""
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return list(value)
    return [value]


_CANCEL_RE = re.compile(r'\b(abgesagt|annule|annulee|annullato|cancell?ed|entfallt|entfaellt|fallt aus|faellt aus|verschoben|postponed|reporte|rinviato)\b')


def looks_cancelled(text) -> bool:
    """True when a title/label says the event is cancelled or postponed (de/fr/it/en)."""
    return bool(_CANCEL_RE.search(_fold(text)))


_TYPE_RULES = (
    ('vocal-opera', r'\b(oper|opera|operas|opern|opernabend|operette|operetta|operettes|singspiel|zarzuela|opera buffa|opera seria)\b'),
    ('vocal-opera', r'(requiem|oratori(um|o|en)\b|\bpassion\b|\bpassions\b|\bmesse\b|\bmass\b|\bmissa\b|magnificat|stabat mater|\bvesper|kantate|cantate|cantata|\bchoir\b|\bchoral|\bchor(?!e[og])|chor\b|choeur|\bcoro\b|\bcorale\b)'),
    ('recital', r'(rezital|recital|liederabend|klavierabend|lieder abend|soiree de lieder)'),
    ('orchestral', r'(kammerorchester|chamber orchestra|orchestre de chambre|orchestra da camera)'),
    ('chamber', r'(quartett|quartet|quatuor|quartetto|kammermusik|chamber music|\bchamber\b|musique de chambre|musica da camera|\btrio\b|quintet|quintett|quintette|sextet|sextett|septet|septett|oktett|octet|\bduo\b|sonatenabend)'),
    ('orchestral', r'(sinfoni|symphon|orchest|philharm|sinfonica|sinfonico|abonnementskonzert)'),
)


def guess_type(text) -> str | None:
    """Best guess of Klang's concert type from free text, or None if nothing matches."""
    t = _fold(text)
    if not t.strip():
        return None
    for kind, rx in _TYPE_RULES:
        if re.search(rx, t):
            return kind
    return None


# ---------------------------------------------------------------------------
# time helpers
# ---------------------------------------------------------------------------

_ISO_RE = re.compile(
    r'^\s*(\d{4})-(\d{2})-(\d{2})'
    r'(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,]\d+)?)?\s*(Z|UTC|GMT|[+-]\d{2}(?::?\d{2})?)?)?\s*$', re.I)
_COMPACT_RE = re.compile(r'^\s*(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?\s*$', re.I)


def _zone(name):
    if name is None:
        return ZURICH
    if isinstance(name, (timezone, ZoneInfo)):
        return name
    if str(name).upper() in ('UTC', 'Z', 'GMT'):
        return timezone.utc
    return ZoneInfo(str(name))


def _parse_offset(text):
    t = text.upper()
    if t in ('Z', 'UTC', 'GMT'):
        return timezone.utc
    sign = -1 if t[0] == '-' else 1
    digits = t[1:].replace(':', '')
    hours, minutes = int(digits[:2]), int(digits[2:4] or 0)
    return timezone(sign * timedelta(hours=hours, minutes=minutes))


def to_zurich_datetime(value, *, assume='Europe/Zurich') -> datetime:
    """Like to_zurich_iso but returns an aware datetime in Europe/Zurich."""
    if isinstance(value, datetime):
        dt = value
        if dt.tzinfo is None or dt.utcoffset() is None:
            dt = dt.replace(tzinfo=_zone(assume))
    elif isinstance(value, date):
        raise ValueError(f'{value!r} has no time of day')
    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        secs = value / 1000.0 if value > 1e11 else float(value)
        dt = datetime.fromtimestamp(secs, timezone.utc)
    elif isinstance(value, str):
        m = _ISO_RE.match(value)
        if m:
            y, mo, d, hh, mi, ss, off = m.groups()
            if hh is None:
                raise ValueError(f'{value!r} has no time of day')
            dt = datetime(int(y), int(mo), int(d), int(hh), int(mi), int(ss or 0))
        else:
            m = _COMPACT_RE.match(value)
            if not m:
                raise ValueError(f'not an ISO 8601 date-time: {value!r}')
            y, mo, d, hh, mi, ss, off = m.groups()
            dt = datetime(int(y), int(mo), int(d), int(hh), int(mi), int(ss or 0))
        dt = dt.replace(tzinfo=_parse_offset(off) if off else _zone(assume))
    else:
        raise ValueError(f'cannot read a date-time from {value!r}')
    return dt.astimezone(ZURICH)


def _fmt_offset(td):
    minutes = int(td.total_seconds() // 60)
    sign = '+' if minutes >= 0 else '-'
    minutes = abs(minutes)
    return f'{sign}{minutes // 60:02d}:{minutes % 60:02d}'


def to_zurich_iso(value, *, assume='Europe/Zurich') -> str:
    """Convert a datetime / ISO string / epoch to 'YYYY-MM-DDTHH:MM:00+01:00' in Swiss time.

    Values carrying an offset (or 'Z') are converted; naive values are read in the
    ``assume`` zone ('Europe/Zurich', 'UTC' or any IANA name). Seconds are dropped.
    A bare date raises ValueError (decide the time yourself).
    """
    local = to_zurich_datetime(value, assume=assume)
    return local.strftime('%Y-%m-%dT%H:%M:00') + _fmt_offset(local.utcoffset())


def today_zurich() -> date:
    """Today's date in Switzerland (override with env KLANG_FEEDS_TODAY=YYYY-MM-DD for tests)."""
    forced = os.environ.get('KLANG_FEEDS_TODAY')
    if forced:
        return date.fromisoformat(forced)
    return datetime.now(ZURICH).date()


# ---------------------------------------------------------------------------
# JSON-LD
# ---------------------------------------------------------------------------

_LD_RE = re.compile(r'<script\b[^>]*\btype\s*=\s*["\']?application/ld\+json["\']?[^>]*>(.*?)</script\s*>', re.I | re.S)


def _loads_lenient(text):
    s = text.strip()
    s = re.sub(r'^\s*(<!--|//\s*<!\[CDATA\[|/\*\s*<!\[CDATA\[\s*\*/)', '', s)
    s = re.sub(r'(-->|//\s*\]\]>|/\*\s*\]\]>\s*\*/)\s*$', '', s).strip()
    attempts = (s, re.sub(r',\s*([}\]])', r'\1', s), html.unescape(s))
    for attempt in attempts:
        try:
            return json.loads(attempt, strict=False)
        except ValueError:
            continue
    return None


def _ld_types(node):
    out = []
    for t in as_list(node.get('@type')):
        t = str(t).rstrip('/')
        out.append(re.split(r'[/:#]', t)[-1])
    return out


def _is_event(node):
    return any(t.endswith('Event') for t in _ld_types(node))


def jsonld_events(html_text) -> list[dict]:
    """Every schema.org *Event (Event, MusicEvent, TheaterEvent, ...) found in the page's
    <script type="application/ld+json"> blocks: lists and @graph are flattened, ItemLists
    and other wrappers are searched, and subEvents are included. Raw dicts are returned."""
    out, seen = [], set()

    def walk(node):
        if isinstance(node, list):
            for x in node:
                walk(x)
        elif isinstance(node, dict):
            if _is_event(node):
                if id(node) not in seen:
                    seen.add(id(node))
                    out.append(node)
                for k in ('subEvent', 'subEvents'):
                    walk(node.get(k))
            else:
                for v in node.values():
                    if isinstance(v, (list, dict)):
                        walk(v)

    for block in _LD_RE.findall(html_text or ''):
        data = _loads_lenient(block)
        if data is None:
            log.debug('unreadable JSON-LD block: %r', block[:120])
            continue
        walk(data)
    return out


# ---------------------------------------------------------------------------
# iCalendar
# ---------------------------------------------------------------------------

_WINDOWS_TZ = {
    'w. europe standard time': 'Europe/Zurich', 'romance standard time': 'Europe/Paris',
    'central europe standard time': 'Europe/Budapest', 'central european standard time': 'Europe/Warsaw',
    'gmt standard time': 'Europe/London', 'utc': 'UTC', 'coordinated universal time': 'UTC',
    'cet': 'Europe/Zurich', 'mez': 'Europe/Zurich', 'cest': 'Europe/Zurich',
}


def _ics_zone(tzid, fallback):
    if not tzid:
        return fallback
    name = tzid.strip().strip('"')
    if name.lower() in _WINDOWS_TZ:
        return _zone(_WINDOWS_TZ[name.lower()])
    # e.g. "/freeassociation.sourceforge.net/Tzfile/Europe/Zurich" or "/citadel.org/.../Europe/Zurich"
    m = re.search(r'((?:Africa|America|Antarctica|Asia|Atlantic|Australia|Europe|Indian|Pacific|Etc)/[A-Za-z_+-]+(?:/[A-Za-z_+-]+)?)$', name)
    for candidate in ([m.group(1)] if m else []) + [name]:
        try:
            return _zone(candidate)
        except Exception:  # ZoneInfoNotFoundError, ValueError
            continue
    log.debug('unknown TZID %r, assuming Europe/Zurich', tzid)
    return fallback


def _ics_split(line):
    in_quote = False
    for i, ch in enumerate(line):
        if ch == '"':
            in_quote = not in_quote
        elif ch == ':' and not in_quote:
            head, value = line[:i], line[i + 1:]
            break
    else:
        return None
    parts = re.split(r';(?=(?:[^"]*"[^"]*")*[^"]*$)', head)
    params = {}
    for p in parts[1:]:
        k, _, v = p.partition('=')
        params[k.strip().upper()] = v.strip().strip('"')
    return parts[0].strip().upper(), params, value


def _ics_text(value):
    return re.sub(r'\\([\\;,nN])', lambda m: '\n' if m.group(1) in 'nN' else m.group(1), value).strip()


def _ics_time(value, params, default_tz):
    """-> (aware datetime in Europe/Zurich, all_day) or (None, False)."""
    value = value.strip()
    m = re.fullmatch(r'(\d{4})(\d{2})(\d{2})', value)
    if m or params.get('VALUE', '').upper() == 'DATE':
        m = m or re.match(r'(\d{4})(\d{2})(\d{2})', value)
        if not m:
            return None, False
        return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)), tzinfo=ZURICH), True
    m = _COMPACT_RE.match(value)
    if not m:
        return None, False
    y, mo, d, hh, mi, ss, z = m.groups()
    naive = datetime(int(y), int(mo), int(d), int(hh), int(mi), min(int(ss or 0), 59))
    tz = timezone.utc if z else _ics_zone(params.get('TZID'), default_tz)
    return naive.replace(tzinfo=tz).astimezone(ZURICH), False


def _ics_duration(value):
    m = re.fullmatch(r'([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?', value.strip())
    if not m:
        return None
    sign, w, d, h, mi, s = m.groups()
    td = timedelta(weeks=int(w or 0), days=int(d or 0), hours=int(h or 0), minutes=int(mi or 0), seconds=int(s or 0))
    return -td if sign == '-' else td


def parse_ics(text) -> list[dict]:
    """Minimal iCalendar reader. Returns one dict per VEVENT:
    {uid, summary, start, end, location, url, description, status, all_day, categories, rrule}
    ``start``/``end`` are aware datetimes in Europe/Zurich (or None); TZID (IANA, Windows
    and prefixed names), UTC 'Z', floating times (X-WR-TIMEZONE or Swiss time), VALUE=DATE
    (all_day=True, midnight), DURATION and line folding are handled. ``status`` is
    lower-case ('cancelled', 'confirmed', 'tentative') or None. RRULEs are NOT expanded
    (the raw rule is returned in ``rrule``). Events without a readable DTSTART are skipped.
    """
    if isinstance(text, bytes):
        text = _decode(text)
    text = text.lstrip('﻿').replace('\r\n', '\n').replace('\r', '\n')
    lines = re.sub(r'\n[ \t]', '', text).split('\n')
    default_tz = ZURICH
    stack, ev, out = [], None, []
    for line in lines:
        if not line.strip():
            continue
        parsed = _ics_split(line)
        if parsed is None:
            continue
        name, params, value = parsed
        if name == 'BEGIN':
            comp = value.strip().upper()
            stack.append(comp)
            if comp == 'VEVENT':
                ev = {'uid': None, 'summary': '', 'start': None, 'end': None, 'location': '', 'url': None,
                      'description': '', 'status': None, 'all_day': False, 'categories': [], 'rrule': None,
                      '_duration': None, '_params': {}}
            continue
        if name == 'END':
            comp = value.strip().upper()
            if stack and stack[-1] == comp:
                stack.pop()
            if comp == 'VEVENT' and ev is not None:
                if ev['end'] is None and ev['start'] is not None:
                    if ev['_duration'] is not None:
                        ev['end'] = ev['start'] + ev['_duration']
                    elif ev['all_day']:
                        ev['end'] = ev['start'] + timedelta(days=1)
                ev.pop('_duration')
                ev.pop('_params')
                if ev['start'] is not None:
                    out.append(ev)
                ev = None
            continue
        top = stack[-1] if stack else None
        if top == 'VCALENDAR' and name == 'X-WR-TIMEZONE':
            default_tz = _ics_zone(value, ZURICH)
        if top != 'VEVENT' or ev is None:
            continue
        if name == 'UID':
            ev['uid'] = value.strip()
        elif name == 'SUMMARY':
            ev['summary'] = _ics_text(value)
        elif name == 'LOCATION':
            ev['location'] = _ics_text(value)
        elif name == 'DESCRIPTION':
            ev['description'] = _ics_text(value)
        elif name == 'URL':
            ev['url'] = value.strip() or None
        elif name == 'STATUS':
            ev['status'] = value.strip().lower() or None
        elif name == 'CATEGORIES':
            ev['categories'] += [c.strip() for c in re.split(r'(?<!\\),', value) if c.strip()]
        elif name == 'RRULE':
            ev['rrule'] = value.strip()
        elif name == 'DTSTART':
            ev['start'], ev['all_day'] = _ics_time(value, params, default_tz)
        elif name == 'DTEND':
            ev['end'], _ = _ics_time(value, params, default_tz)
        elif name == 'DURATION':
            ev['_duration'] = _ics_duration(value)
    return out


# ---------------------------------------------------------------------------
# the normalised event
# ---------------------------------------------------------------------------

_FIELDS = ('durationMin', 'city', 'venueName', 'type', 'series', 'credits', 'program', 'ticketUrl', 'url', 'status', 'end')
_TYPE_ALIASES = {
    'opera': 'vocal-opera', 'vocal': 'vocal-opera', 'choral': 'vocal-opera', 'oratorio': 'vocal-opera',
    'vocal-opera': 'vocal-opera', 'orchestra': 'orchestral', 'orchestral': 'orchestral', 'symphonic': 'orchestral',
    'symphony': 'orchestral', 'chamber': 'chamber', 'chamber music': 'chamber', 'chamber-music': 'chamber',
    'recital': 'recital', 'solo': 'recital', 'mixed': 'mixed',
}


def _make_id(source, sid):
    s = str(sid).strip()
    if s.startswith(source + '-'):
        s = s[len(source) + 1:]
    ascii_s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    slugged = re.sub(r'-{2,}', '-', re.sub(r'[^A-Za-z0-9._~-]+', '-', ascii_s)).strip('-.')
    if not slugged or len(slugged) > 64:
        digest = hashlib.sha1(s.encode('utf-8')).hexdigest()[:10]
        slugged = f'{slugged[:48].rstrip("-.")}-{digest}' if slugged else digest
    return f'{source}-{slugged}'


def _http_url(value):
    if not value:
        return None
    u = str(value).strip().replace(' ', '%20')
    p = urllib.parse.urlsplit(u)
    if p.scheme.lower() in ('http', 'https') and p.netloc:
        return u
    return None


def _start_iso(start):
    if isinstance(start, datetime):
        if start.tzinfo is None or start.utcoffset() is None:
            raise ValueError('start datetime is naive; use to_zurich_iso(value, assume=...) first')
        iso = to_zurich_iso(start)
    elif isinstance(start, str):
        m = _ISO_RE.match(start)
        ok = bool(m and m.group(4) is not None and m.group(7) is not None)
        if not ok:
            mc = _COMPACT_RE.match(start)
            ok = bool(mc and mc.group(7))
        if not ok:
            raise ValueError(f'start must be ISO 8601 with a time and UTC offset, got {start!r}')
        iso = to_zurich_iso(start)
    else:
        raise ValueError(f'start must be an ISO string or aware datetime, got {start!r}')
    if not 2000 <= int(iso[:4]) <= 2100:
        raise ValueError(f'implausible start {iso}')
    return iso


def _role_name_pairs(items, a, b):
    for item in as_list(items):
        if isinstance(item, dict):
            yield item.get(a), item.get(b)
        elif isinstance(item, (list, tuple)) and len(item) == 2:
            yield item[0], item[1]
        elif isinstance(item, str):
            yield None, item


def _credits(items):
    out, seen = [], set()
    for role, name in _role_name_pairs(items, 'role', 'name'):
        name, role = clean(name), clean(role) or 'Performer'
        if not name:
            continue
        role = role[0].upper() + role[1:]
        key = (role.lower(), name.lower())
        if key not in seen:
            seen.add(key)
            out.append({'role': role[:80], 'name': name[:160]})
    named = {c['name'].lower() for c in out if c['role'] != 'Performer'}
    return [c for c in out if c['role'] != 'Performer' or c['name'].lower() not in named][:60]


# A programme line that is page furniture, not a work: the interval and the expected end
# ("- Pause -", "Konzertende ca. 21.30 Uhr", "Ende um 22 h"). Tested on the folded text without
# leading/trailing dashes, stars and dots, so "Pausa", "Entr'acte", "Das Ende der Zeit" or "La Fin
# du monde" stay works.
NOT_WORK_LINE_RE = re.compile(
    r'^(?:pause|entracte|intermission|intervallo)$'
    r'|^(?:konzert|vorstellungs)(?:ende|beginn|dauer)\b'
    r'|^(?:konzert\s+)?(?:mit|ohne)\s+pause$'
    r'|^(?:ende|beginn|fin|fine)\s+(?:ca\.?\s*|um\s+|vers\s+|env\.?\s*)?\d{1,2}\s*(?:[.:h]|uhr\b)'
    r'|^fin du concert\b'
    r'|^(?:ca\.?\s*)?\d{1,2}[.:h]\d{2}\s*(?:uhr|h)\b')


def is_not_work_line(composer, title) -> bool:
    """True for a programme line that is the interval or a time note, not a work."""
    text = title if clean(title) else composer          # a bare '- Pause -' in the composer column
    s = re.sub(r'\s+', ' ', _fold(clean(text))).strip(' -–—*•·.!:')
    return bool(s) and bool(NOT_WORK_LINE_RE.search(s))


def _program(items):
    out, seen = [], set()
    for composer, title in _role_name_pairs(items, 'composer', 'title'):
        composer, title = clean(composer), clean(title)
        title = re.sub(r'\s*[*,;]+$', '', title)        # a footnote star or a dangling comma
        if not composer and not title:
            continue
        if is_not_work_line(composer, title):
            continue
        key = (composer.lower(), title.lower())
        if key not in seen:
            seen.add(key)
            out.append({'composer': composer[:120], 'title': title[:300]})
    return out[:80]


def _status(value):
    if value is None or value is False or value == '':
        return 'scheduled'
    if value is True:
        return 'cancelled'
    v = _fold(value).rsplit('/', 1)[-1]
    if re.search(r'cancel|annul|abgesagt|postpon|verschoben', v):
        return 'cancelled'
    if v in ('scheduled', 'eventscheduled', 'eventrescheduled', 'eventmovedonline', 'confirmed', 'tentative'):
        return 'scheduled'
    log.warning('unknown status %r treated as scheduled', value)
    return 'scheduled'


def make_event(source, sid, title, start, **fields) -> dict:
    """Validate and normalise one concert. Returns the dict for the feed; empty fields are
    dropped. Raises ValueError for a missing id/title or a start without time+offset, and
    TypeError for an unknown field name (a programming error).

    fields: durationMin, city, venueName, type, series, credits, program, ticketUrl, url,
    status ('scheduled'/'cancelled', schema.org EventCancelled, True=cancelled),
    end (ISO+offset or aware datetime; used to compute durationMin if that is missing).
    credits: [{'role','name'}] or [(role, name)]; program: [{'composer','title'}] or [(composer, title)].
    """
    unknown = sorted(set(fields) - set(_FIELDS))
    if unknown:
        raise TypeError(f'make_event() got unknown field(s): {", ".join(unknown)}')
    if not isinstance(source, str) or not re.fullmatch(r'[a-z0-9][a-z0-9_]*', source):
        raise ValueError(f'bad source key {source!r}')
    if sid is None or not str(sid).strip():
        raise ValueError('missing site id')
    title = clean(title)
    if not title:
        raise ValueError('missing title')
    start_iso = _start_iso(start)

    ev = {'id': _make_id(source, sid), 'source': source, 'title': title[:300], 'start': start_iso}

    duration = fields.get('durationMin')
    if duration in (None, '') and fields.get('end') not in (None, ''):
        try:
            delta = to_zurich_datetime(fields['end'], assume='Europe/Zurich') - to_zurich_datetime(start_iso)
            duration = delta.total_seconds() / 60
        except ValueError:
            duration = None
    try:
        duration = int(round(float(duration))) if duration not in (None, '') else None
    except (TypeError, ValueError):
        duration = None
    if duration is not None and 0 < duration <= 900:
        ev['durationMin'] = duration

    for key, limit in (('city', 80), ('venueName', 200)):
        value = clean(fields.get(key))
        if value:
            ev[key] = value[:limit]

    kind = fields.get('type')
    if kind:
        norm = _TYPE_ALIASES.get(str(kind).strip().lower())
        if norm:
            ev['type'] = norm
        else:
            log.warning('%s: unknown type %r dropped', source, kind)

    series = clean(fields.get('series'))
    if series and series.lower() != title.lower():
        ev['series'] = series[:200]

    credits = _credits(fields.get('credits'))
    if credits:
        ev['credits'] = credits
    program = _program(fields.get('program'))
    if program:
        ev['program'] = program

    for key in ('ticketUrl', 'url'):
        u = _http_url(fields.get(key))
        if u:
            ev[key] = u
    ev['status'] = _status(fields.get('status'))
    return ev


# ---------------------------------------------------------------------------
# the previous feed: incremental details for readers that read detail pages
# ---------------------------------------------------------------------------

_previous_lock = threading.Lock()
_previous_by_id = {}
_previous_by_source = {}
_previous_stale = frozenset()      # sources whose reader code changed since the previous feed


def set_previous(feed, *, code_changed=()) -> int:
    """Hand the previous feed's events to the readers. build.py calls this once, before the
    readers run. ``feed`` is a Klang feed dict, a list of events, or None (forget it).
    ``code_changed``: source keys whose reader code (codeHash) differs from the one that made
    the previous feed; their reusable details are all due for a re-read (refresh_due), so a
    parser fix reaches every concert as soon as the request cap allows.
    Returns the number of events kept."""
    concerts = feed.get('concerts') if isinstance(feed, dict) else feed
    by_id, by_source = {}, {}
    for e in concerts if isinstance(concerts, list) else []:
        if not isinstance(e, dict):
            continue
        eid, src = e.get('id'), e.get('source')
        if isinstance(eid, str) and isinstance(src, str) and eid.startswith(src + '-') and e.get('start'):
            by_id[eid] = e
            by_source.setdefault(src, []).append(e)
    global _previous_by_id, _previous_by_source, _previous_stale
    with _previous_lock:
        _previous_by_id, _previous_by_source = by_id, by_source
        _previous_stale = frozenset(code_changed or ())
    return len(by_id)


def event_id(source, sid) -> str:
    """The id make_event() gives to site id ``sid`` of ``source``: ('tonhalle', 2055696) -> 'tonhalle-2055696'."""
    return _make_id(source, sid)


def previous_events(source_key) -> list[dict]:
    """Copies of this source's events in the previous feed ([] without a previous feed)."""
    return [copy.deepcopy(e) for e in _previous_by_source.get(source_key, [])]


def _same_instant(a, b):
    try:
        return to_zurich_datetime(a) == to_zurich_datetime(b)
    except (ValueError, TypeError):
        return False


def _title_key(text):
    return re.sub(r'[^a-z0-9]+', '', _fold(clean(text)))


def same_title(a, b) -> bool:
    """True when two titles are the same apart from case, accents, punctuation and spacing,
    or differ only by a typo ('Kinderopernorcherster' / 'Kinderopernorchester'), never by a number."""
    ka, kb = _title_key(a), _title_key(b)
    if not ka or not kb:
        return False
    if ka == kb:
        return True
    if re.findall(r'\d+', ka) != re.findall(r'\d+', kb):
        return False                      # '1. Kammerkonzert' is not '2. Kammerkonzert'
    return min(len(ka), len(kb)) >= 8 and difflib.SequenceMatcher(None, ka, kb).ratio() >= 0.9


def previous_event(event_id, start, *, title=None) -> dict | None:
    """The previous feed's record of this concert, or None.

    It is returned only when it is clearly the same performance: the same id
    (``event_id(KEY, sid)``), the same start (the same instant), and, when ``title`` is
    given, the same title (``same_title``). The result is a copy. A reader decides itself
    whether the listing still matches (e.g. the same performers) before reusing its details.
    Note that the previous record may hold fields that build.py filled from another source
    listing the same performance."""
    prev = _previous_by_id.get(event_id)
    if prev is None or not _same_instant(prev.get('start'), start):
        return None
    if title is not None and not same_title(title, prev.get('title')):
        return None
    return copy.deepcopy(prev)


def refresh_due(key, start=None, *, near_days=7, every_days=7) -> bool:
    """Whether a detail page that could be reused from the previous feed should be read again
    anyway: always for a concert within ``near_days`` days (cast changes), otherwise once every
    ``every_days`` days on a fixed rotation by ``key``, so the re-reads are spread evenly.
    Always when the running reader's code changed since the previous feed (set_previous)."""
    running = getattr(getattr(_local, 'budget', None), 'key', None)
    if running is not None and running in _previous_stale:
        return True
    today = today_zurich()
    if start is not None:
        try:
            if (to_zurich_datetime(start).date() - today).days <= near_days:
                return True
        except (ValueError, TypeError):
            return True
    if every_days <= 1:
        return True
    slot = int(hashlib.sha1(str(key).encode('utf-8')).hexdigest()[:8], 16) % every_days
    return slot == today.toordinal() % every_days


# ---------------------------------------------------------------------------
# concert type from the facts (credits, programme, title)
# ---------------------------------------------------------------------------

_LEADER_ROLE_RE = re.compile(r'conduct|direction|music director|musikalische leitung|^leitung|dirig|chorus master|'
                             r'chorleitung|chef de choeur|chef d.orchestre|maestro')
_CHOREO_ROLE_RE = re.compile(r'choreo')
_STAGING_ROLE_RE = re.compile(r'director|regie|mise en scene|staging|stage|dramaturg|design|light|licht|costume|kostum|'
                              r'\bset\b|buhne|video|assistan')
_SPEAKER_ROLE_RE = re.compile(r'presenter|moderat|host|narrat|speaker|sprecher|erzahl|reader|recitation|actor|schauspiel|dancer|tanz')
_VOICE_ROLE_RE = re.compile(r'sopran|mezzo|\balto\b|\balt\b|contralto|countertenor|tenor|bariton|(?<!double )\bbass\b|basso|'
                            r'voice|vocal|gesang|stimme|singer')
# players from an orchestra, credited as a group: chamber music, not the orchestra
_MEMBERS_RE = re.compile(r'(?:solistes|soloists|solisten|musikerinnen|musiker|musicians|musiciens|members|mitglieder|membres|'
                         r'blaser|bläser|streicher|cordes|vents)\b')
_ORCH_NAME_RE = re.compile(r'orchest|orquest|philharm|filarm|sinfoniett|symphoniker|sinfoniker|camerata')
_CHOIR_NAME_RE = re.compile(r'\bchor\b|chor |chore\b|choir|chorus|choeur|\bcoro\b|vokalensemble|vocal ensemble|singers|kantorei')
_GROUP_NAME_RE = re.compile(r'ensemble|quartet|quartett|quatuor|quartetto|\btrio\b|quintet|sextet|septet|oktett|octet|'
                            r'consort|collegium|musiker|musicians|solisten|soloists|academy|akademie|\bband\b|players|'
                            r'harmonie|kapelle|brass')
# words in a title or series that say an orchestra, a choir or a stage is involved
_ENSEMBLE_TEXT_RE = re.compile(r'sinfoni|symphon|orchest|orquest|philharm|filarm|\bchor|choir|choeur|\bcoro\b|kantorei|'
                               r'\boper\b|\bopera\b|\bopern|operette|oratori|requiem|\bpassion\b|\bmesse\b|\bmissa\b|'
                               r'kantate|cantata|ballett|ballet|big ?band')
# works that need an orchestra or a choir (a concerto, a symphony, a mass ...)
_CONCERTO_RE = re.compile(r'(klavier|violin|cello|viola|bratschen|kontrabass|floten|oboen|klarinetten|fagott|horn|trompeten|'
                          r'posaunen|tuba|orgel|harfen|gitarren|cembalo|saxophon|marimba|schlagzeug|doppel|tripel)konzert|'
                          r'\bkonzert (fur|in [a-h]|nr|no)\b|\bconcerto\b(?! italiano)|\bconcert (pour|no|n.)|sinfonie|'
                          r'symphonie|symphony|sinfonia concertante|orchest|\bmesse\b|\bmissa\b|requiem|oratori|kantate|'
                          r'cantata|\bpassion\b')
_STAGE_TEXT_RE = re.compile(r'\boper\b|\bopera\b|\bopern|operette|singspiel|musical')


def _credit_facts(credits):
    """Counts of what the credits say: groups, conductors, choreographers, staging, voices, and
    the set of individual players (instruments, voices, 'Performer')."""
    f = {'orchestra': 0, 'choir': 0, 'ensemble': 0, 'leaders': 0, 'choreo': 0, 'staging': 0, 'voices': 0,
         'players': set()}
    for role, name in _role_name_pairs(credits, 'role', 'name'):
        name = clean(name)
        if not name:
            continue
        r, n = _fold(clean(role) or 'Performer').strip(), _fold(name)
        if _MEMBERS_RE.match(n):                 # "Solistes de l'Orchestre …", "Musiker*innen des …"
            f['ensemble'] += 1
        elif r in ('orchestra', 'orchester', 'orchestre', 'orchestra da camera'):
            f['orchestra'] += 1
        elif r in ('choir', 'chorus', 'chor', 'choeur', 'coro'):
            f['choir'] += 1
        elif r in ('ensemble', 'band', 'group', 'quartet', 'trio'):
            f['ensemble'] += 1
        elif _LEADER_ROLE_RE.search(r):
            f['leaders'] += 1
        elif _CHOREO_ROLE_RE.search(r):
            f['choreo'] += 1
        elif _STAGING_ROLE_RE.search(r):
            f['staging'] += 1
        elif _SPEAKER_ROLE_RE.search(r):
            continue
        elif _ORCH_NAME_RE.search(n):            # a group credited as 'Performer' or by instrument
            f['orchestra'] += 1
        elif _CHOIR_NAME_RE.search(n):
            f['choir'] += 1
        elif _GROUP_NAME_RE.search(n):
            f['ensemble'] += 1
        else:
            f['players'].add(n)
            if _VOICE_ROLE_RE.search(r):
                f['voices'] += 1
    return f


def _solo_or_duo(f):
    """1 or 2 when the credits are one or two players and no group, conductor or staging, else 0."""
    if f['orchestra'] or f['choir'] or f['ensemble'] or f['leaders'] or f['staging'] or f['choreo']:
        return 0
    n = len(f['players'])
    return n if n in (1, 2) else 0


def _is_ballet(f, text):
    """A choreographer with an orchestra or conductor, and no choir, singers or opera."""
    return bool(f['choreo'] and (f['orchestra'] or f['leaders']) and not f['choir'] and not f['voices']
                and not _STAGE_TEXT_RE.search(text))


def _works_text(program):
    return ' '.join(_fold(f'{clean(c)} {clean(t)}') for c, t in _role_name_pairs(program, 'composer', 'title'))


def infer_type(title, credits=None, program=None, series=None, *, solo_rule=True) -> str | None:
    """Klang's concert type from the facts, or None when they don't say.

    - A ballet with live music (a choreographer plus an orchestra or conductor): 'orchestral'.
    - One or two players and no orchestra, ensemble, choir or conductor: 'recital' (a duo whose
      title says chamber music: 'chamber'), unless the title or a work needs an orchestra or a
      choir (a concerto, a symphony, a mass ...). ``solo_rule=False`` skips this, e.g. for an
      orchestra's own listing where the orchestra plays without being credited.
    - Otherwise the title's and series' words (guess_type), then the groups credited (an
      orchestra: 'orchestral', a choir: 'vocal-opera', an ensemble or 3–12 players:
      'chamber'), then the works' titles.
    ``credits``/``program`` take the same shapes as make_event()."""
    f = _credit_facts(credits)
    text = _fold(f'{clean(title)} {clean(series)}')
    if _is_ballet(f, text):
        return 'orchestral'
    worded = guess_type(text)
    n = _solo_or_duo(f) if solo_rule else 0
    if n and not _ENSEMBLE_TEXT_RE.search(text) and not _CONCERTO_RE.search(f'{text} {_works_text(program)}'):
        return 'chamber' if n == 2 and worded == 'chamber' else 'recital'
    if worded:
        return worded
    if f['orchestra']:
        return 'orchestral'
    if f['choir']:
        return 'vocal-opera'
    if f['ensemble'] or 3 <= len(f['players']) <= 12:
        return 'chamber'
    return guess_type(_works_text(program))


def fix_type(ev, kind=None) -> dict:
    """A copy of the event with its type filled in or corrected from its facts (build.py's
    last pass over the merged feed):

    - a missing type is inferred (``infer_type``);
    - 'orchestral' for one or two players with no orchestra, ensemble, choir or conductor
      becomes 'recital' (a duo whose title says chamber music: 'chamber'); so does 'chamber'
      for a single player;
    - a ballet with live music (choreographer + orchestra or conductor, no singers) stays
      'orchestral' and gets the series 'Ballett' when it has none.

    ``kind`` is the source's KIND. An orchestra's or ensemble's own listing implies that the
    group plays even when it is not credited, so the one-or-two-players rule is applied to
    it only when the title itself says recital ("Klavierabend", "Liederabend" ...)."""
    out = dict(ev)
    credits, program = ev.get('credits') or [], ev.get('program') or []
    f = _credit_facts(credits)
    text = _fold(f"{clean(ev.get('title'))} {clean(ev.get('series'))}")
    group_source = kind in ('orchestra', 'ensemble')
    cur = out.get('type')
    if cur in (None, '', 'orchestral') and _is_ballet(f, text):
        out['type'] = 'orchestral'
        if not out.get('series'):
            out['series'] = 'Ballett'
        return out
    if not cur:
        guessed = infer_type(ev.get('title'), credits, program, ev.get('series'), solo_rule=not group_source)
        if guessed:
            out['type'] = guessed
        return out
    if cur not in ('orchestral', 'chamber'):
        return out
    n = _solo_or_duo(f)
    worded = guess_type(text)
    if not n or (cur == 'chamber' and (n != 1 or worded == 'chamber')):
        return out
    free = not _ENSEMBLE_TEXT_RE.search(text) and not _CONCERTO_RE.search(f'{text} {_works_text(program)}')
    if worded == 'recital' or (free and not group_source):
        out['type'] = 'chamber' if n == 2 and worded == 'chamber' else 'recital'
    return out
