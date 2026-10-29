"""Mozarteumorchester Salzburg: the orchestra's own concert calendar (Nuxt site).

    https://www.mozarteumorchester.at/de/konzerte               the next 10 dates (server-rendered)
    https://www.mozarteumorchester.at/de/konzerte/<slug>/<id>   one page per date

Every page embeds its data as a Nuxt payload (``<script id="__NUXT_DATA__">``). The calendar
page holds only the next ten dates; the rest of the list is loaded by the page's script
from /de/api/… or with query parameters, both disallowed by robots.txt, so they are never
requested. Each date has its own page with a numeric id (the slug in the path is not
checked by the site): start (ISO with offset), room and venue, status ("sale", "soldout",
"past" …), genres (Konzert, "Oper, Ballett & Musical", Familien …), series tags, the cast
(person, role) and the works (composer in ``description_short``). The reader therefore
reads date pages by id: the ids on the calendar page, the ids of the previous feed's
concerts (reused unless the concert is within a week or its weekly turn has come, see
common.refresh_due), ids above the highest known one (new dates; it stops after a run of
missing ids), and the other ids on a weekly rotation (past dates and non-concerts are not
in the previous feed, so each is looked at about once a week), then more unknown ids from a
daily moving start until about 110 requests. Many ids are missing (404). Without a previous feed the
first run reads ids from the highest known one downward until the request cap (about
half of them; missing ids answer 404). Checked against the website on
29 Oct 2026 (Sonntagsmatinee 02 8.11. 11.00 Großes Festspielhaus: Hankyeol Yoon,
Alexander Gadjiev, Cécile Lartigau; Auerbach / Rachmaninoff / Tchaikovsky; Tosca 31.10.
19.00 Großes Festspielhaus with the Salzburger Landestheater).

The orchestra plays the Salzburger Landestheater's operas; those dates are listed here
with a link to the theatre's ticket page (not fetched: its robots.txt shuts out AI crawlers).

Skipped: family and school concerts, workshops, open house days, introductions and talks,
and dates abroad.
"""
from __future__ import annotations

import json
import re

from common import (BudgetExceeded, FetchError, clean, event_id, get, infer_type, log, looks_cancelled, make_event,
                    previous_event, previous_events, refresh_due, requests_left, to_zurich_datetime, today_zurich)

from ._austria_west import credit, order_credits, strip_tracking

KEY = 'mozarteumorchester'
NAME = 'Mozarteumorchester Salzburg'
SITE = 'https://www.mozarteumorchester.at/de/konzerte'
ATTRIBUTION = 'Source: Mozarteumorchester Salzburg (mozarteumorchester.at)'
KIND = 'orchestra'
COUNTRY = 'austria'
MAX_REQUESTS = 150
TIME_LIMIT = 900
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 7
ROTATION_DAYS = 7              # an unknown id is looked at about once a week
SCAN_AHEAD = 40                # ids above the highest known one
SOFT_CAP = 110                 # extra unknown ids are read only up to this many requests
MAX_MISSES_AHEAD = 15          # stop scanning ahead after this many missing ids in a row

BASE = 'https://www.mozarteumorchester.at'
LISTING = BASE + '/de/konzerte'
DETAIL = BASE + '/de/konzerte/{slug}/{id}'
ORCHESTRA = 'Mozarteumorchester Salzburg'
WINDOW_DAYS = 450

_SKIP_GENRE = re.compile(r'familie|kinder|schul|jugend|workshop|vermittlung', re.I)
_SKIP_TITLE = re.compile(r'einführung|einfuehrung|vortrag|workshop|open house|familien|kinder|schul|probe\b|'
                         r'gespräch|talk|führung|fuehrung|mitmach|tag der offenen', re.I)
_OPERA_GENRE = re.compile(r'oper|musical|ballett', re.I)
_AUSTRIA = (('wien', 'Vienna'), ('vienna', 'Vienna'), ('graz', 'Graz'), ('linz', 'Linz'), ('innsbruck', 'Innsbruck'),
            ('bregenz', 'Bregenz'), ('eisenstadt', 'Eisenstadt'), ('grafenegg', 'Grafenegg'), ('st. pölten', 'St. Pölten'),
            ('klagenfurt', 'Klagenfurt'), ('villach', 'Villach'), ('wels', 'Wels'), ('hallein', 'Hallein'),
            ('bad ischl', 'Bad Ischl'), ('st. wolfgang', 'St. Wolfgang'), ('zell am see', 'Zell am See'))
_ABROAD = re.compile(r'münchen|munich|berlin|hamburg|frankfurt|köln|dresden|leipzig|paris|london|tokyo|japan|china|korea|'
                     r'zürich|zurich|luzern|lucerne|italien|deutschland|spanien|usa|tournee|tour\b|gastspiel', re.I)
# an item in the genre "Oper, Ballett & Musical" is kept when its subtitle says opera, ballet or oratorio
_STAGE_WORK_RE = re.compile(r'oper|operette|ballett|dramma|melodramma|singspiel|oratori|opéra|opera|zarzuela|tanz', re.I)


# ---------------------------------------------------------------------------
# Nuxt payload
# ---------------------------------------------------------------------------

_PAYLOAD_RE = re.compile(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', re.S)
_WRAPPERS = {'ShallowReactive', 'Reactive', 'Ref', 'ShallowRef', 'EmptyRef', 'NuxtError'}


def nuxt_data(page):
    """The Nuxt 3 payload (a flat list with index references) as plain Python data."""
    m = _PAYLOAD_RE.search(page or '')
    if not m:
        return None
    flat = json.loads(m.group(1))

    def res(i, depth=0):
        v = flat[i]
        if depth > 60:
            return None
        if isinstance(v, list):
            if v and isinstance(v[0], str) and v[0] in _WRAPPERS:
                return res(v[1], depth + 1) if len(v) > 1 and isinstance(v[1], int) else None
            if v and isinstance(v[0], str) and v[0] in ('Set', 'Map'):
                return None
            return [res(x, depth + 1) if isinstance(x, int) and not isinstance(x, bool) else x for x in v]
        if isinstance(v, dict):
            return {k: res(x, depth + 1) if isinstance(x, int) and not isinstance(x, bool) else x for k, x in v.items()}
        return v
    return res(0)


def listing_ids(page):
    """Event ids on the calendar page."""
    data = nuxt_data(page) or {}
    events = (((data.get('pinia') or {}).get('events') or {}).get('events')) or []
    ids = [e.get('id') for e in events if isinstance(e, dict) and isinstance(e.get('id'), int)]
    for v in (data.get('data') or {}).values():                 # the cached fetch result
        if isinstance(v, dict) and isinstance(v.get('events'), list):
            ids += [e.get('id') for e in v['events'] if isinstance(e, dict) and isinstance(e.get('id'), int)]
    return sorted(set(ids))


def detail_event(page, eid):
    data = nuxt_data(page) or {}
    return (data.get('data') or {}).get(f'event-detail-{eid}')


# ---------------------------------------------------------------------------
# one date -> event
# ---------------------------------------------------------------------------

def _venue(room, context=''):
    """-> (venueName, city); city None for a date abroad."""
    room = room or {}
    hall, venue = clean(room.get('name')), clean((room.get('venue') or {}).get('name'))
    if venue.lower() == 'festspielbezirk' and hall:
        return hall, 'Salzburg'
    if venue.lower() == 'orchesterhaus':
        return f'Orchesterhaus Mozarteumorchester{", " + hall if hall else ""}', 'Salzburg'
    name = f'{venue}, {hall}' if venue and hall and hall.lower() not in venue.lower() else (venue or hall)
    for word, city in _AUSTRIA:
        if re.search(r'(?<![\w-])' + re.escape(word) + r'(?![\w-])', name, re.I):
            return name, city
    if _ABROAD.search(f'{name} {context}'):
        return name, None
    return name or None, 'Salzburg'


def _credits(casts, opera):
    out = []
    for c in casts or []:
        person = c.get('person') or {}
        name = clean(person.get('name'))
        roles = [clean(r.get('role_text')) for r in c.get('roles') or [] if clean(r.get('role_text'))]
        if person.get('is_organization') and not roles:
            out.append(credit('', name) or ('Ensemble', name))
            continue
        for role in roles or ['']:
            got = credit(role, name, opera=opera)
            if got:
                out.append(got)
    return order_credits(out)


def _program(works):
    out = []
    for w in works or []:
        title = clean(w.get('name'))
        if w.get('is_break') or not title or re.fullmatch(r'[\s*·•\-–—]+|pause', title, re.I):
            continue
        out.append((clean(w.get('description_short')), title))
    return out


def to_event(ev, today):
    """-> (make_event dict | None, reason)."""
    eid = ev.get('id')
    name = clean(ev.get('name'))
    subtitle = clean(ev.get('subtitle'))
    genres = ' '.join(clean(g.get('name')) for g in ev.get('genres') or [])
    status = clean(ev.get('status')).lower()
    if not name or not ev.get('date_start'):
        return None, 'no title/date'
    if status == 'past':
        return None, 'past'
    try:
        local = to_zurich_datetime(ev['date_start'])
    except ValueError:
        return None, 'bad date'
    days = (local.date() - today).days
    if days < 0 or days > WINDOW_DAYS:
        return None, 'outside window'
    if _SKIP_GENRE.search(genres) or _SKIP_TITLE.search(name) or _SKIP_TITLE.search(subtitle):
        return None, 'not a concert'
    venue, city = _venue(ev.get('room'), f'{name} {subtitle}')
    if not city:
        return None, 'abroad'
    opera = bool(_OPERA_GENRE.search(genres))
    if opera and not _STAGE_WORK_RE.search(subtitle):
        return None, 'musical'                            # 'The Sound of Music'
    credits = _credits(ev.get('casts'), opera)
    program = _program(ev.get('works'))
    title = name
    series = None
    tags = [clean(t.get('name')) for t in ev.get('tags') or [] if clean(t.get('name'))]
    if subtitle and not opera and (re.fullmatch(r'[A-ZÄÖÜ][\w-]+ \d+', subtitle) or
                                   any(subtitle.lower().startswith(t.lower()) for t in tags)):
        title = f'{subtitle}: {name}'                     # 'Sonntagsmatinee 02: Hankyeol Yoon / …'
        series = re.sub(r'\s*\d+$', '', subtitle) or None
    if opera:
        kind = 'orchestral' if re.search(r'ballett', subtitle, re.I) and \
            not re.search(r'oper', subtitle, re.I) else 'vocal-opera'
        if subtitle and not program:
            m = re.search(r'\bvon\s+(.+)$', subtitle)
            if m:
                program = [(clean(m.group(1)), name)]
    else:
        kind = infer_type(title, credits, program, series, solo_rule=False) or 'orchestral'
    cancelled = status in ('cancelled', 'canceled', 'abgesagt') or looks_cancelled(name) or looks_cancelled(subtitle)
    end = ev.get('date_end') if ev.get('date_end') and ev.get('date_end') != ev.get('date_start') else None
    return make_event(KEY, eid, title, ev['date_start'], end=end, city=city, venueName=venue, type=kind,
                      series=series, credits=credits, program=program,
                      ticketUrl=strip_tracking(ev.get('ticket_url_external')),
                      url=DETAIL.format(slug=((ev.get('slug') or {}).get('de') or 'konzert'), id=eid),
                      status='cancelled' if cancelled else 'scheduled'), 'ok'


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def fetch():
    today = today_zurich()
    listed = listing_ids(get(LISTING))                      # FetchError propagates
    prev = {}
    for e in previous_events(KEY):
        sid = str(e.get('id') or '').rsplit('-', 1)[-1]
        if sid.isdigit() and str(e.get('start') or '')[:10] >= today.isoformat():
            prev[int(sid)] = e
    known_max = max(list(prev) + listed + [0])

    # what to read, in order: listed dates, previous concerts due for a re-read, new ids, rotation
    plan = []
    for i in listed:
        plan.append((0, i))
    for i, e in sorted(prev.items(), key=lambda kv: kv[1].get('start') or ''):
        if i in listed:
            continue
        if refresh_due(i, e.get('start'), near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            plan.append((1, i))                     # the others keep their record (below)
    rotation = today.toordinal() % ROTATION_DAYS
    unknown = [i for i in range(known_max, 0, -1) if i not in listed and i not in prev]   # newest first
    for i in unknown:
        if not prev or i % ROTATION_DAYS == rotation:
            plan.append((2, i))
    # then, while the soft cap allows, the other unknown ids from a starting point that moves
    # every day, so a concert missed so far is found sooner than its weekly turn
    rest = [i for i in unknown if prev and i % ROTATION_DAYS != rotation]
    if rest:
        shift = (today.toordinal() * 17) % len(rest)
        plan += [(3, i) for i in rest[shift:] + rest[:shift]]
    ahead = list(range(known_max + 1, known_max + SCAN_AHEAD + 1))

    events, reasons, read, misses = [], {}, 0, 0
    seen, checked = set(), set()                      # ids made into events / ids answered by the site

    def read_one(i):
        nonlocal read
        try:
            page = get(DETAIL.format(slug='konzert', id=i))
        except FetchError as err:
            if getattr(err, 'status', None) == 404:
                checked.add(i)
            raise
        read += 1
        checked.add(i)
        ev = detail_event(page, i)
        if not ev:
            return 'no data'
        got, why = to_event(ev, today)
        if got:
            events.append(got)
            seen.add(i)
        return why

    def run(ids, *, ahead_mode=False):
        nonlocal misses
        for i in ids:
            if requests_left() <= 0:
                return False
            try:
                why = read_one(i)
                misses = 0
            except BudgetExceeded as err:
                log.warning('%s: stopped: %s', KEY, err.reason)
                return False
            except FetchError as err:
                why = 'missing' if getattr(err, 'status', None) == 404 else 'failed'
                if why == 'failed':
                    log.warning('%s %s: %s', KEY, i, err)
                if ahead_mode:
                    misses += 1
                    if misses >= MAX_MISSES_AHEAD:
                        reasons[why] = reasons.get(why, 0) + 1
                        return True
            reasons[why] = reasons.get(why, 0) + 1
        return True

    # listed first, then new ids ahead, then previous re-reads, then the rotation
    ok = run([i for t, i in plan if t == 0])
    ok = ok and run(ahead, ahead_mode=True)
    ok = ok and run([i for t, i in plan if t == 1])
    if ok:
        ok = run([i for t, i in plan if t == 2])
    if ok and requests_left() > MAX_REQUESTS - SOFT_CAP:
        run([i for t, i in plan if t == 3][:max(0, requests_left() - (MAX_REQUESTS - SOFT_CAP))])
    # previous concerts not re-read (or not reached) keep their record
    for i, e in prev.items():
        if i in checked:                             # read this run: what the page says now counts
            continue
        p = previous_event(event_id(KEY, i), e.get('start'), title=e.get('title'))
        if p:
            try:
                events.append(make_event(
                    KEY, i, p['title'], p['start'], city=p.get('city'), venueName=p.get('venueName'),
                    type=p.get('type'), series=p.get('series'), credits=p.get('credits'), program=p.get('program'),
                    ticketUrl=p.get('ticketUrl'), url=p.get('url'), status=p.get('status'),
                    durationMin=p.get('durationMin')))
            except ValueError:
                pass
    log.info('%s: %d page(s) read; %s', KEY, read, ', '.join(f'{v} {k}' for k, v in sorted(reasons.items())))
    return events
