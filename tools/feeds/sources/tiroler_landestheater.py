"""Tiroler Landestheater & Tiroler Symphonieorchester Innsbruck (TSOI): opera, operetta,
ballet with live music and concerts from the theatre's schedule.

    https://www.landestheater.at/dynamic-search/schedule/j-schedule?page=N&startDate=…&endDate=…
                                             the schedule as JSON (25 per page, ~20 pages)
    https://www.landestheater.at/produktionen/<slug>       one page per production

The schedule page (/spielplan) is filled by the site's script from the JSON above (the same
request the page sends; GET, robots.txt allows everything). Each entry is one performance:
``start`` (a true Unix epoch, Innsbruck time on the site), title, type of date
(Vorstellung, Premiere, Konzert, Einführung, Schulvorstellung …), sections (Musiktheater,
Konzert, Tanz, Schauspiel, Junges Theater …), TSOI series (Symphoniekonzerte,
Kammermusik …), stage and the production page. The schedule also lists the concerts of
the Haus der Musik Innsbruck (HDM in Concert, Klavier & Co …).

Production pages carry one schema.org Event (microdata) per remaining date with that
evening's performers by name, its ticket link, the programme ("<strong>Composer</strong>
<br>Work") and the cast with roles for the next date. Roles of the other dates are taken
from that cast by name (a singer listed for another date under the same name keeps the
role; a stand-in takes the role of the person listed at the same place). Production pages
cost one request each and are read incrementally: a production whose dates are all in
the previous feed (same id, start and title) keeps their cast and works unless it plays in
the next two weeks or its turn in the weekly rotation has come (common.refresh_due).
Checked against the website on 29 Oct 2026 (Un ballo in maschera 20.11. 19.30 Großes Haus;
3. Symphoniekonzert 14./15.1.2027 19.30 Congress Innsbruck, Saal Tirol, Daniel Cohen /
Vadim Gluzman, Beethoven op. 61 / Schumann op. 38).

Stages: the theatre's own rooms become "Tiroler Landestheater, Großes Haus" etc.; a date in
another Tyrolean town (the TSOI's New Year's concert in Kufstein, Reutte) takes that town as
its city; a touring date whose place is only "mobil" is left out. On 29 Oct 2026 the site
refused connections for a while after a few hundred requests in quick succession during
testing, so the reader waits 3 s more between requests than common.get does, and a
schedule page that fails makes the run fail (build.py keeps the previous feed's dates).

Skipped: introductions, guided tours, school performances, public rehearsals, children's
and youth theatre (Junges Theater, unless it is an opera such as Hänsel und Gretel),
spoken theatre, musicals and plays with songs, dance without live music (no conductor or
orchestra on the production page), talks, readings, jazz, folk and pop concerts, family
and sing-along concerts.
"""
from __future__ import annotations

import json
import re
import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from common import (BudgetExceeded, FetchError, clean, event_id, get, get_json, infer_type, log, looks_cancelled,
                    make_event, previous_event, refresh_due, requests_left, to_zurich_datetime, to_zurich_iso,
                    today_zurich)

from ._austria_west import credit, order_credits, program_from_html, role_from_text

KEY = 'tiroler_landestheater'
NAME = 'Tiroler Landestheater & Tiroler Symphonieorchester Innsbruck'
SITE = 'https://www.landestheater.at/spielplan'
ATTRIBUTION = 'Source: Tiroler Landestheater (landestheater.at)'
KIND = 'venue'
COUNTRY = 'austria'
MAX_REQUESTS = 110             # ~20 schedule pages + up to ~50 production pages
TIME_LIMIT = 900
REFRESH_NEAR_DAYS = 14
REFRESH_EVERY_DAYS = 7

BASE = 'https://www.landestheater.at'
SCHEDULE = (BASE + '/dynamic-search/schedule/j-schedule?page={page}&startDate={start}&endDate={end}'
            '&useDate=1&configId=37802&preselectConfigId=37803')
TZ = 'Europe/Vienna'
VIENNA = ZoneInfo(TZ)
CITY = 'Innsbruck'
WINDOW_DAYS = 450
MAX_PAGES = 40
EXTRA_DELAY = 3.0               # seconds, added to common.get's 1.5 s per request

_SKIP_ACTIVITY = re.compile(r'einführung|führung|schulvorstellung|probe|sonst|workshop|gespräch|matinee', re.I)
_SKIP_TEXT = re.compile(
    r'jazz|folk|\btalk\b|gespräch|lesung|late night|kinder|familie|junges publikum|kindergärten|mitsing|sitzkissen|'
    r'beatbox|in concert\b(?!:)|clapton|kuschel|klangwelt|klangwerkstatt|klangspiel|detektiv|jugendclub|kidsclub|'
    r'offenes|salon|führung|ball\b(?! im savoy)|anna mabo|figurentheater|tanzen\b', re.I)
_OPERA_DESC = re.compile(r'\boper\b|operette|opéra|opera|melodramma|dramma|singspiel|märchenspiel|comédie|zarzuela|'
                         r'oratori|requiem|messe|passion', re.I)
_MUSICAL_RE = re.compile(r'musical|monolog|liederabend mit|chanson', re.I)
_VENUE_PREFIX = re.compile(r'^(?:großes haus|kammerspiele|foyer großes haus|probebühne \d|\[k2\]|ensembleprobenraum)$', re.I)


# ---------------------------------------------------------------------------
# schedule
# ---------------------------------------------------------------------------

def _pause():
    """Extra spacing on top of common.get's: the site refused connections for a while when
    asked every 1.5 s (29 Oct 2026)."""
    time.sleep(EXTRA_DELAY)


def _epoch(day):
    return int(datetime(day.year, day.month, day.day, tzinfo=VIENNA).timestamp())


def read_schedule(today):
    """-> list of activity dicts from today to +WINDOW_DAYS (every page)."""
    start = _epoch(today)
    end = _epoch(today + timedelta(days=WINDOW_DAYS))
    out, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        # a page that fails makes the whole run fail (build.py then keeps the previous feed's
        # dates for this source) rather than publish a schedule with a hole in it
        _pause()
        data = get_json(SCHEDULE.format(page=page, start=start, end=end))['activitiesData']
        acts = data.get('activities') or {}
        groups = acts.values() if isinstance(acts, dict) else [acts]
        items = [a for g in groups for a in (g if isinstance(g, list) else [g]) if isinstance(a, dict)]
        for a in items:
            if a.get('id') not in seen:
                seen.add(a.get('id'))
                out.append(a)
        total, per_page = int(data.get('total_count') or 0), int(data.get('per_page') or 25)
        if not items or page * per_page >= total:
            break
    log.info('%s: schedule: %d dates', KEY, len(out))
    return out


def _ticket_info(a):
    try:
        return json.loads(a.get('ticketInfo') or '{}')
    except ValueError:
        return {}


def classify(a):
    """-> 'opera' | 'concert' | 'dance' (needs the production page) | None (not for Klang)."""
    title, desc = clean(a.get('title')), clean(a.get('description'))
    sections = {clean(s).lower() for s in a.get('sections') or []}
    tsoi = {clean(s).lower() for s in a.get('tsoi') or []}
    kind = clean(a.get('activityType'))
    if _SKIP_ACTIVITY.search(kind) or a.get('information') in ('schoolPerformance', 'finalRehearsal'):
        return None
    if _SKIP_TEXT.search(title) or _SKIP_TEXT.search(desc):
        return None
    if 'musiktheater' in sections:
        if 'schauspiel' in sections and (not _OPERA_DESC.search(desc) or _MUSICAL_RE.search(desc)):
            return None                                   # musical / play with songs
        return 'opera'
    if 'junges theater' in sections:
        return None
    if 'konzert' in sections or tsoi & {'symphoniekonzerte', 'kammermusik'} or kind.lower() == 'konzert':
        if sections & {'schauspiel', 'tanz'}:
            return None
        return 'concert'
    if sections == {'tanz'} or 'musiktheatertanz' in tsoi:
        return 'dance'
    return None


_TYROL_TOWNS = ('Kufstein', 'Reutte', 'Lienz', 'Schwaz', 'Wörgl', 'Kitzbühel', 'Hall in Tirol', 'Telfs', 'Imst',
                'Landeck', 'Brixlegg', 'Erl', 'Seefeld', 'Zams', 'Jenbach', 'Rattenberg', 'Matrei', 'Wattens')


def _venue(stage):
    """-> (venueName, city); city None for a touring date whose place is not given ('mobil')."""
    s = clean(stage)
    if s.lower() == 'mobil':
        return None, None
    if not s or s.lower() == 'sonstiges':
        return 'Tiroler Landestheater', CITY
    for town in _TYROL_TOWNS:
        if s.lower() == town.lower():
            return None, town
        if s.lower().startswith(town.lower() + ','):
            return s, town
    if _VENUE_PREFIX.match(s):
        return f'Tiroler Landestheater, {s.strip("[]")}', CITY
    if s.lower() == 'hofburg':
        return 'Hofburg Innsbruck', CITY
    return s, CITY


# ---------------------------------------------------------------------------
# production pages
# ---------------------------------------------------------------------------

_VIP_RE = re.compile(r'<div class="text text--label">\s*([^<]*?)\s*</div>\s*<a [^>]*class="production__vip-name"[^>]*>(.*?)</a>', re.S)


def parse_production(page):
    """-> {'dates': {local 'YYYY-MM-DDTHH:MM': {'performers': [...], 'ticket': url, 'stage': str}},
           'roles': [(label, name)], 'program': [(composer, title)], 'live_music': bool}"""
    out = {'dates': {}, 'roles': [], 'program': [], 'live_music': False}
    for item in re.split(r'<li class="activity-slider__item', page or '')[1:]:
        item = item.split('</li>')[0]
        m = re.search(r'itemprop="startDate" content="(\d{4}-\d{2}-\d{2})[A-Z]*(\d{2}:\d{2})', item)
        if not m:
            continue
        perf = [clean(x) for x in re.findall(r'itemprop="performer"[^>]*>\s*<meta itemprop="name" content="([^"]*)"', item)]
        ticket = re.search(r'href="(https://shop\.landestheater\.at/[^"]+)"', item)
        stage = re.search(r'itemprop="location".*?itemprop="name">([^<]*)<', item, re.S)
        special = re.search(r'special-info">(.*?)</div>', item, re.S)
        out['dates'][f'{m.group(1)}T{m.group(2)}'] = {
            'performers': [p for p in perf if p], 'ticket': ticket.group(1) if ticket else None,
            'stage': clean(stage.group(1)) if stage else '', 'note': clean(special.group(1)) if special else ''}
    prog = re.search(r'id="production-program">(.*?)(?:<div class="component-container[^"]*" id="production-|</main>)',
                     page or '', re.S)
    if prog:
        out['program'] = program_from_html(re.sub(r'(?s)<h2.*?</h2>', '', prog.group(1)))
    cast = re.search(r'id="production-cast">(.*?)</main>', page or '', re.S)
    if cast:
        body = re.sub(r'(?s)<form.*?</form>', '', cast.group(1))
        for label, names in re.findall(r'class="text text--label">\s*([^<]*?)\s*</span>\s*'
                                       r'<span class="production__cast-role-names">(.*?)</span>\s*</div>', body, re.S):
            for name in re.findall(r'<a [^>]*>(.*?)</a>', names, re.S) or [names]:
                if clean(name):
                    out['roles'].append((clean(label), clean(name)))
    vips = re.search(r'id="production-vip">(.*?)id="production-', page or '', re.S)
    if vips:
        for label, name in _VIP_RE.findall(vips.group(1)):
            if clean(name) and not any(n == clean(name) for _, n in out['roles']):
                out['roles'].append((clean(label), clean(name)))
    labels = ' '.join(l for l, _ in out['roles']).lower()
    out['live_music'] = bool(re.search(r'musikalische leitung|dirigent|orchester', labels))
    return out


def _date_credits(detail, when, opera):
    """[(role, name)] for one date from the production page."""
    roles = detail['roles']
    by_name = {}
    for label, name in roles:
        by_name.setdefault(name, label)
    info = detail['dates'].get(when)
    names = info['performers'] if info and info['performers'] else [n for _, n in roles]
    # the cast section is the next date's cast, in the order of that date's microdata
    next_date = next((d for d in sorted(detail['dates']) if detail['dates'][d]['performers']), None)
    ref = detail['dates'][next_date]['performers'] if next_date else []
    out = []
    for i, name in enumerate(names):
        label = by_name.get(name)
        if label is None and len(ref) == len(names) and i < len(ref):
            label = by_name.get(ref[i])                  # a stand-in: the role of the person at that place
        c = credit(label or '', name, opera=opera)
        if c:
            out.append(c)
    listed = {n for d in detail['dates'].values() for n in d['performers']}
    for label, name in roles:
        kind, role = role_from_text(label)
        # groups are never in the microdata; nor is the conductor on some pages (then the
        # cast section's conductor, the one of the next date, is taken for every date)
        if role in ('Orchestra', 'Choir') and name not in names or \
                role == 'Conductor' and name not in listed and not any(r == 'Conductor' for r, _ in out):
            c = credit(label, name, opera=opera)
            if c:
                out.append(c)
    return order_credits(out)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def _local(a):
    """Local Innsbruck time 'YYYY-MM-DDTHH:MM' of an activity."""
    return to_zurich_datetime(int(a['start'])).astimezone(VIENNA).strftime('%Y-%m-%dT%H:%M')


def _type(cls, title, series, credits, program):
    if cls == 'opera':
        return 'vocal-opera'
    if cls == 'dance':
        return 'orchestral'
    if series == 'Kammermusik':
        return 'chamber'
    roles = [r for r, _ in credits]
    players = [r for r in roles if r not in ('Orchestra', 'Choir', 'Ensemble', 'Conductor', 'Presenter', 'Narrator')]
    if credits and len(players) == len(roles) and len(players) in (1, 2) and \
            not re.search(r'symphoniekonzert|orchest|academie', title, re.I):
        return 'recital'                                  # 'Sinfonien an zwei Klavieren' is not orchestral
    t = infer_type(title, credits, program)
    if t:
        return t
    if re.search(r'symphoniekonzert|academie|neujahrskonzert|promenaden', title, re.I):
        return 'orchestral'
    return None


def fetch():
    today = today_zurich()
    acts = read_schedule(today)
    cands, skipped = [], {}
    for a in acts:
        cls = classify(a)
        if not cls:
            skipped[clean(a.get('activityType')) or '?'] = skipped.get(clean(a.get('activityType')) or '?', 0) + 1
            continue
        try:
            start = to_zurich_iso(int(a['start']))
        except (KeyError, TypeError, ValueError):
            continue
        cands.append({'a': a, 'cls': cls, 'start': start, 'title': clean(a.get('title')),
                      'link': clean(a.get('production_link')), 'prev': None})
    if skipped:
        log.info('%s: skipped %s', KEY, ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    # productions: reuse the previous feed's cast/works, or read the production page
    prods = {}
    for c in cands:
        c['prev'] = previous_event(event_id(KEY, c['a']['id']), c['start'], title=c['title'])
        prods.setdefault(c['link'], []).append(c)
    order = []
    for link, group in prods.items():
        first = min(c['start'] for c in group)
        if not link:
            continue
        complete = all(c['prev'] for c in group)
        due = refresh_due(link, first, near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS)
        if not complete or due:
            order.append((0 if not complete else 1, first, link))
    details = {}
    for _, _, link in sorted(order):
        if requests_left() <= 0:
            break
        try:
            _pause()
            details[link] = parse_production(get(BASE + link))
        except BudgetExceeded as err:
            log.warning('%s: stopped reading production pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: production page failed: %s', KEY, link, err)
    log.info('%s: %d production page(s) read, %d production(s) reused', KEY, len(details),
             sum(1 for l, g in prods.items() if l not in details and all(c['prev'] for c in g)))

    events = []
    for c in cands:
        a, cls, title = c['a'], c['cls'], c['title']
        detail = details.get(c['link'])
        prev = c['prev']
        when = _local(a)
        credits, program, ticket = [], [], None
        if detail:
            if cls == 'dance' and not detail['live_music']:
                continue                                      # ballet to recorded music
            credits = _date_credits(detail, when, cls == 'opera')
            program = detail['program']
            ticket = (detail['dates'].get(when) or {}).get('ticket')
        elif prev:
            credits = [(x.get('role'), x.get('name')) for x in prev.get('credits') or []]
            program = [(x.get('composer'), x.get('title')) for x in prev.get('program') or []]
            ticket = prev.get('ticketUrl')
        elif cls == 'dance':
            continue                                          # live music not known yet
        info = _ticket_info(a)
        note = ' '.join([clean(info.get('specialText')), clean(info.get('ticketStatusText')),
                         clean((detail['dates'].get(when) or {}).get('note') if detail else '')])
        cancelled = looks_cancelled(title) or looks_cancelled(note) or info.get('ticketStatus') in ('cancelled', 'canceled')
        venue, city = _venue(a.get('stage'))
        if not city:
            log.info('%s %s: place not given (%s), skipped', KEY, a.get('id'), a.get('stage'))
            continue
        ticket = ticket or clean(info.get('ticketLink')) or None
        end = None
        if a.get('end') and a.get('publishEndTime') and int(a['end']) > int(a['start']):
            end = to_zurich_iso(int(a['end']))
        series = None
        tsoi = [clean(s) for s in a.get('tsoi') or [] if clean(s) and clean(s).lower() not in ('musiktheatertanz', 'zugabe')]
        if tsoi:
            series = tsoi[0]
        m = re.match(r'^(HDM in Concert|Klavier & Co|Wort & Musik|Screen & Score|Academie Konzert)\s*:', title)
        if m:
            series = m.group(1)
        try:
            events.append(make_event(
                KEY, a['id'], title, c['start'], end=end, city=city, venueName=venue,
                type=_type(cls, title, series, credits, program), series=series,
                credits=credits, program=program, ticketUrl=ticket, url=BASE + c['link'] if c['link'] else SITE,
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, a.get('id'), err)
    return events
