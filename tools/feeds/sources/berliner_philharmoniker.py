"""Berliner Philharmoniker / Philharmonie Berlin (Großer Saal and Kammermusiksaal): the
orchestra's concerts and the guest concerts in the Philharmonie, from the concert pages.

    https://www.berliner-philharmoniker.de/sitemap.xml                 sitemap index
    https://www.berliner-philharmoniker.de/pages/sitemap.xml[?page=N…]  page sitemaps (3)
    https://www.berliner-philharmoniker.de/konzerte/kalender/<id>/      one page per concert

The site's calendar is filled in the browser from a search service; the page itself holds no
concerts, and the ticket shop is closed to robots. So this reader takes the concert pages
listed in the sitemap (``/konzerte/kalender/<id>/`` with ``lastmod``, ~1,700 incl. past ones)
and reads them one by one, within the request cap. Each page gives the title (series in bold,
then the title; "Gastveranstaltung" marks a guest concert), the cast (name, role), the
programme (composer, work) and every performance: date and time ("Mi 28. April 2027,
20.00 Uhr", cross-checked with ``data-performance-start``, a Unix epoch), the hall, and a
category (orchestra_cat, guest_cat, tour_cat, house_tour_cat, education_cat …).

Which pages to read (no state but the previous feed):
- the sitemap ``lastmod`` is about the day a page was made; pages are numbered in that order;
- each season's concerts are created on one day (dozens of pages with the same ``lastmod``) and
  numbered in date order. For each such batch the first page still ahead of today is found
  (from the previous feed, else by bisection: a few requests) and the batch's pages before it
  are past and not read;
- pages numbered below the oldest live batch are read only when made or edited in the last
  300 days (a guest concert booked longer ahead and never edited since would be missed);
- the previous feed's concerts keep what was read (same page, start and title) and are re-read
  in the week before and about weekly otherwise; pages not in the previous feed (past guest
  concerts, skipped formats, pages not reached yet) are read newest first, every run when made
  or edited in the last 7 days, otherwise on a fixed rotation (each about every 4 days).
  Order: new pages, edited known ones, known ones due for a re-read, the rotation, the rest.
So a first run (no previous feed) covers about 140 pages and later runs fill in the rest.

Checked against the website on 29 Oct 2026: printed times equal ``data-performance-start``
(Berlin local time); the season 2026/27 batch is pages 56990–57200 (created 10 Mar 2026), in
date order (57000 = 2 Sep 2026, 57050 = 4 Nov 2026, 57100 = 25 Jan 2027, 57150 = 28 Apr 2027).

Skipped: guided tours, education/family/school formats, masterclasses, talks and readings
(Satzwechsel "Literatur & Musik"), jazz/world/pop guest shows (ACT Night, World, Die drei ???,
film music), tours abroad (Proms, Salzburg …; Baden-Baden and other German towns are kept).
"""
from __future__ import annotations

import collections
import hashlib
import re
from datetime import date, datetime

from common import (BudgetExceeded, FetchError, ZURICH, clean, get, guess_type, infer_type, log, looks_cancelled,
                    make_event, previous_events, refresh_due, requests_left, today_zurich)

from ._berlin import (CLASSICAL_RE, abroad, berlin_local, credit, german_town, is_interval, is_pop,
                      skip_title, venue_name)

KEY = 'berliner_philharmoniker'
NAME = 'Berliner Philharmoniker / Philharmonie Berlin'
SITE = 'https://www.berliner-philharmoniker.de/'
ATTRIBUTION = 'Source: Berliner Philharmoniker (berliner-philharmoniker.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 150
TIME_LIMIT = 1000
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 7
ROTATION_DAYS = 4              # pages not in the previous feed: each read about every 4 days
NEW_DAYS = 7                   # pages made or edited this recently are read every run
YOUNG_DAYS = 300               # pages below the oldest live batch: only if made/edited this recently
BATCH_MIN = 40                 # pages with the same lastmod that make a season batch
MAX_AGE_DAYS = 550             # pages older than this (lastmod) are ignored

BASE = 'https://www.berliner-philharmoniker.de'
SITEMAP = BASE + '/sitemap.xml'
PAGE = BASE + '/konzerte/kalender/{id}/'

_SKIP_CATS = re.compile(r'house_tour|education|hidden_special|vocal_heroes|familyconcert', re.I)
_SKIP_RE = re.compile(r'masterclass|meisterkurs|literatur\s*(?:&|und)\s*musik|satzwechsel|act night|jazz|\bworld\b|'
                      r'die drei \?\?\?|hörspiel|filmmusik|film music|gala der filmmusik|movie|boogie|musical|'
                      r'tag im grünen|sommerfest|scratch|mitsing|kinder|familie|schul|kita|vocal heroes|'
                      r'tanzworkshop|offene probe|öffentliche generalprobe|sitzkissen|rundgang|führung|'
                      r'world peace culture|hommage an mario lanza|tribute|show\b|dinner|diskurs|quartett der kritiker|'
                      r'tour 20\d\d|poetry slam|swing|dark tenor|christmas|winter wonderland|puttin|matinee des freunde|'
                      r'insider-matinee|märchen-matinee|ronny heinrich|salonorchester|tanzorchester', re.I)
_GERMANY_HALL_RE = re.compile(r'philharmonie|kammermusiksaal|großer saal|foyer|musikinstrumenten-museum|'
                              r'berlin|potsdam|baden-baden|festspielhaus', re.I)


# ---------------------------------------------------------------------------
# sitemap
# ---------------------------------------------------------------------------

def parse_sitemap_index(xml):
    return [re.sub(r'&amp;', '&', u) for u in re.findall(r'<loc>([^<]+)</loc>', xml or '')
            if '/pages/sitemap.xml' in u]


def parse_sitemap(xml):
    """-> {page id: lastmod date} for the concert pages."""
    out = {}
    for pid, lm in re.findall(r'<loc>[^<]*/konzerte/kalender/(\d+)/</loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})', xml or ''):
        out[int(pid)] = date.fromisoformat(lm)
    return out


# ---------------------------------------------------------------------------
# concert page
# ---------------------------------------------------------------------------

def _title(page_html):
    """-> (title, series) from the page heading."""
    m = re.search(r'<h1>\s*<span aria-hidden="true"[^>]*>(.*?)</span>', page_html or '', re.S)
    if not m:
        m = re.search(r'<h1>(.*?)</h1>', page_html or '', re.S)
        return clean(m.group(1)) if m else '', None
    inner = m.group(1)
    strong = re.search(r'<strong>(.*?)</strong>', inner, re.S)
    rest = clean(re.sub(r'<strong>.*?</strong>', ' ', inner, flags=re.S))
    if strong:
        series = clean(strong.group(1))
        if not rest:
            return series, None
        if series.lower() == 'gastveranstaltung':
            return rest, None
        return rest, series
    return clean(inner), None


def _cast(page_html):
    m = re.search(r'<strong>Besetzung</strong></p>\s*<p>(.*?)</p>', page_html or '', re.S)
    out = []
    for line in re.split(r'<br\s*/?>', m.group(1)) if m else []:
        name = re.search(r'<strong>(.*?)</strong>', line, re.S)
        if not name:
            continue
        role = clean(re.sub(r'<strong>.*?</strong>', ' ', line, flags=re.S))
        out.append((role, clean(name.group(1))))
    return out


def _program(page_html):
    m = re.search(r'<strong>Programm</strong></p>(.*?)(?:<hr>|</div>)', page_html or '', re.S)
    out = []
    for cls, body in re.findall(r'<p( class="[^"]*")?>(.*?)</p>', m.group(1) if m else '', re.S):
        if cls:                                          # soloists, introductions, the interval
            continue
        composer = re.search(r'^\s*<strong>(.*?)</strong>', body, re.S)
        if composer:
            work = clean(re.sub(r'^\s*<strong>.*?</strong>\s*(?:<br\s*/?>)?', '', body, flags=re.S))
            c = clean(composer.group(1))
            if is_interval(c):
                continue
            out.append((c, work))
        else:
            work = clean(body)
            if work and not is_interval(work):
                out.append(('', work))
    return out


def _performances(page_html):
    out = []
    for block in re.split(r'<div class="ticket[ "]', page_html or '')[1:]:
        when = re.search(r'<time datetime="(\d{4})-(\d{2})-(\d{2})">\s*<strong>(.*?)</strong>\s*</time>\s*(?:<br>\s*([^<]*))?',
                         block, re.S)
        if not when:
            continue
        y, mo, d = int(when.group(1)), int(when.group(2)), int(when.group(3))
        printed = clean(when.group(4))
        hall = clean(when.group(5) or '')
        t = re.search(r'(\d{1,2})[.:](\d{2})\s*Uhr', printed)
        epoch = re.search(r'data-performance-start="(\d{9,11})"', block)
        cat = re.search(r'data-performance-category="([^"]*)"', block)
        hh = mi = None
        if t:
            hh, mi = int(t.group(1)), int(t.group(2))
        elif epoch:
            local = datetime.fromtimestamp(int(epoch.group(1)), ZURICH)
            hh, mi = local.hour, local.minute
        if hh is None:
            continue
        if epoch and t:
            local = datetime.fromtimestamp(int(epoch.group(1)), ZURICH)
            if (local.year, local.month, local.day, local.hour, local.minute) != (y, mo, d, hh, mi):
                (log.debug if 'ortszeit' in printed.lower() else log.warning)('%s: printed %s but epoch %s; using the printed time', KEY, printed, local.isoformat())
        details = re.search(r'class="ticket__details[^"]*">(.*?)</div>', block, re.S)
        out.append({
            'date': date(y, mo, d), 'hh': hh, 'mi': mi, 'hall': hall,
            'cat': cat.group(1) if cat else '',
            'note': clean(details.group(1)) if details else '',
            'cancelled': looks_cancelled(printed) or bool(re.search(r'(?i)abgesagt|entfällt|cancel', block[:3000])),
        })
    return out


def parse_page(page_html):
    title, series = _title(page_html)
    return {'title': title, 'series': series, 'cast': _cast(page_html), 'program': _program(page_html),
            'performances': _performances(page_html)}


# ---------------------------------------------------------------------------
# which pages to read
# ---------------------------------------------------------------------------

def _page_of(ev):
    m = re.match(rf'{KEY}-(\d+)-', str(ev.get('id') or ''))
    return int(m.group(1)) if m else None


def _batches(pages):
    """[(lo, hi)] id ranges of the season batches (many pages made on one day)."""
    by_day = collections.defaultdict(list)
    for pid, lm in pages.items():
        by_day[lm].append(pid)
    out = []
    for day, ids in by_day.items():
        if len(ids) >= BATCH_MIN:
            ids.sort()
            lo, hi = ids[len(ids) // 50], ids[-1 - len(ids) // 50]      # ignore stray edits at the edges
            out.append((lo, hi))
    return sorted(out)


def _rotation_slot(pid, today):
    return int(hashlib.sha1(str(pid).encode()).hexdigest()[:8], 16) % ROTATION_DAYS == today.toordinal() % ROTATION_DAYS


class _Reader:
    def __init__(self):
        self.parsed = {}

    def read(self, pid):
        if pid in self.parsed:
            return self.parsed[pid]
        if requests_left() <= 0:
            raise BudgetExceeded(PAGE.format(id=pid), 'request cap reached')
        try:
            self.parsed[pid] = parse_page(get(PAGE.format(id=pid)))
        except FetchError as err:
            if isinstance(err, BudgetExceeded):
                raise
            log.warning('%s %s: page failed: %s', KEY, pid, err)
            self.parsed[pid] = None
        return self.parsed[pid]


def _last_date(parsed):
    if not parsed or not parsed['performances']:
        return None
    return max(p['date'] for p in parsed['performances'])


def _boundary(lo, hi, ids, known_upcoming, reader, today):
    """The first page of a batch (ids sorted, all in [lo, hi]) with a performance from today on."""
    members = [i for i in ids if lo <= i <= hi]
    if not members:
        return None
    upper = min((i for i in known_upcoming if lo <= i <= hi), default=None)
    left, right = 0, len(members)                     # answer is in members[left:right] (right = none)
    if upper is not None:
        right = members.index(upper) if upper in members else right
    probes = 0
    while left < right and probes < 10:
        mid = (left + right) // 2
        parsed = reader.read(members[mid])
        probes += 1
        last = _last_date(parsed)
        if last is None or last < today:
            left = mid + 1
        else:
            right = mid
    if left >= len(members):
        return hi + 1                                  # the whole batch is past
    return members[left]


def _select(pages, prev_by_page, reader, today):
    """-> list of page ids to read, in order (the reader may stop early at the cap)."""
    ids = sorted(p for p, lm in pages.items() if (today - lm).days <= MAX_AGE_DAYS or p in prev_by_page)
    known_upcoming = {p for p, evs in prev_by_page.items()
                      if any(str(e.get('start', ''))[:10] >= today.isoformat() for e in evs)}
    past_ranges, live_los = [], []
    for lo, hi in _batches({p: pages[p] for p in ids}):
        b = _boundary(lo, hi, ids, known_upcoming, reader, today)
        if b is None:
            continue
        if b > lo:
            past_ranges.append((lo, b - 1))
        if b <= hi:
            live_los.append(lo)
    floor = min(live_los) if live_los else (ids[0] if ids else 0)

    def is_past(pid):
        return any(lo <= pid <= hi for lo, hi in past_ranges)

    recent = lambda pid: (today - pages.get(pid, today)).days <= NEW_DAYS
    tiers = collections.defaultdict(list)
    for pid in ids:
        if pid in reader.parsed:
            continue                                   # read while finding the batch boundaries
        young = (today - pages[pid]).days <= YOUNG_DAYS
        if pid in prev_by_page:
            evs = prev_by_page[pid]
            first = min(str(e.get('start')) for e in evs)
            if recent(pid):
                tiers[1].append(pid)
            elif refresh_due(pid, first, near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
                tiers[2].append(pid)
            continue
        if pid < floor and not young:
            continue
        if is_past(pid) and not recent(pid):
            continue
        if recent(pid):
            tiers[0].append(pid)
        elif _rotation_slot(pid, today):
            tiers[3].append(pid)
        else:
            tiers[4].append(pid)
    order = []
    for t in sorted(tiers):
        order += sorted(tiers[t], reverse=True)       # newest pages first
    log.info('%s: %d concert pages in the sitemap, floor %s, past batch ranges %s; to read: new %d, edited %d, '
             'refresh %d, rotation %d, others %d', KEY, len(ids), floor, past_ranges, len(tiers[0]), len(tiers[1]),
             len(tiers[2]), len(tiers[3]), len(tiers[4]))
    return order


# ---------------------------------------------------------------------------
# events
# ---------------------------------------------------------------------------

def _city(hall):
    h = clean(hall)
    if not h or _GERMANY_HALL_RE.search(h) and not abroad(h):
        town = german_town(h)
        return town if town and town != 'Berlin' and not re.search(r'(?i)philharmonie berlin|kammermusiksaal', h) \
            else 'Berlin'
    if abroad(h):
        return None
    town = german_town(h)
    if town:
        return town
    if ',' in h:                                       # 'Felsenreitschule, Salzburg': a town we do not know
        return None
    return 'Berlin'                                    # another room of the Philharmonie or nearby


def _venue(hall, city):
    h = clean(hall)
    if city == 'Berlin':
        if re.fullmatch(r'(?i)gro(ß|ss)er saal', h):
            return 'Philharmonie Berlin, Großer Saal'
        if re.fullmatch(r'(?i)kammermusiksaal', h):
            return 'Philharmonie Berlin, Kammermusiksaal'
        if re.match(r'(?i)foyer', h):
            return 'Philharmonie Berlin, Foyer'
        if not h:
            return 'Philharmonie Berlin'
    return venue_name(h)


def _type(parsed, credits, program):
    text = f"{parsed['title']} {parsed['series'] or ''}"
    roles = {r for r, _ in credits}
    if re.search(r'liederabend|klavierabend|recital|rezital', text, re.I):
        return 'recital'
    if 'Choir' in roles or re.search(r'oratori|requiem|messe\b|passion|stabat mater|kantate', text, re.I):
        return 'vocal-opera'
    if 'Orchestra' in roles:
        return 'orchestral'
    if re.search(r'kammermusik|quartett|quartet|ensemble', text, re.I):
        return 'chamber'
    return guess_type(text) or infer_type(parsed['title'], credits, program, parsed['series'])


def _guest_title(credits, program):
    """A guest concert's page is headed only "Gastveranstaltung": name it after its performers
    ('Rundfunk-Sinfonieorchester Berlin, Vladimir Jurowski'), else its composers."""
    groups = [n for r, n in credits if r in ('Orchestra', 'Choir', 'Ensemble')]
    leaders = [n for r, n in credits if r == 'Conductor']
    names = (groups[:1] + leaders[:1]) or [n for r, n in credits if r not in ('Narrator', 'Presenter')][:2]
    if names:
        return ', '.join(names)
    composers = list(dict.fromkeys(c for c, _ in program if c))
    return ', '.join(composers[:3]) or None


def _events(pid, parsed, today):
    out, why = [], None
    if not parsed or not parsed['title']:
        return out, 'unreadable'
    text = f"{parsed['title']} {parsed['series'] or ''}"
    if skip_title(text) or _SKIP_RE.search(text) or is_pop(text):
        return out, 'not a concert / pop / family'
    credits = [c for c in (credit(r, n) for r, n in parsed['cast']) if c]
    people = ' '.join(n for _, n in credits)
    if _SKIP_RE.search(people) or is_pop(people):
        return out, 'pop / show'
    program = [(c, w) for c, w in parsed['program']
               if c or not re.match(r'(?i)(?:texte? von|worte|moderation|lesung|mit |gespräch)', w)]
    if not program and not CLASSICAL_RE.search(f"{text} {' '.join(n for _, n in credits)}"):
        return out, 'no programme, not classical'
    if any(re.search(r'(?i)gitarre|e-bass|leadgesang|bigband|big band', r or n) for r, n in credits):
        return out, 'pop / show'
    if any(re.search(r'(?i)^(vocals|dj|rap|beatbox|moderation|presenter)$', r or '') for r, _ in credits) and not program:
        return out, 'pop / show'
    kind = None
    for perf in parsed['performances']:
        if perf['date'] < today:
            continue
        if _SKIP_CATS.search(perf['cat']) or re.search(r'(?i)\bworld\b|jazz', perf['note']):
            why = 'tour / education / world'
            continue
        city = _city(perf['hall'])
        if not city:
            why = 'abroad'
            continue
        kind = kind or _type(parsed, credits, program)
        title = parsed['title']
        if title.lower() == 'gastveranstaltung':
            title = _guest_title(credits, program) or title
        sid = f"{pid}-{perf['date'].strftime('%Y%m%d')}{perf['hh']:02d}{perf['mi']:02d}"
        try:
            out.append(make_event(
                KEY, sid, title, berlin_local(perf['date'].year, perf['date'].month, perf['date'].day,
                                                        perf['hh'], perf['mi']),
                city=city, venueName=_venue(perf['hall'], city), type=kind, series=parsed['series'],
                credits=credits, program=program, url=PAGE.format(id=pid),
                status='cancelled' if perf['cancelled'] else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, sid, err)
    return out, (None if out else why)


def fetch():
    today = today_zurich()
    index = get(SITEMAP)
    pages = {}
    for url in parse_sitemap_index(index) or [BASE + '/pages/sitemap.xml']:
        try:
            pages.update(parse_sitemap(get(url)))
        except FetchError as err:
            log.warning('%s: sitemap %s failed: %s', KEY, url, err)
    if not pages:
        raise FetchError(SITEMAP, 'no concert pages in the sitemap')

    prev_by_page = collections.defaultdict(list)
    for ev in previous_events(KEY):
        pid = _page_of(ev)
        if pid is not None:
            prev_by_page[pid].append(ev)

    reader = _Reader()
    try:
        order = _select(pages, prev_by_page, reader, today)
    except BudgetExceeded as err:
        log.warning('%s: stopped while finding the batch boundaries: %s', KEY, err.reason)
        order = []
    for pid in order:
        try:
            reader.read(pid)
        except BudgetExceeded as err:
            log.warning('%s: stopped reading concert pages: %s', KEY, err.reason)
            break

    events, skipped, reused = [], collections.Counter(), 0
    for pid in sorted(set(reader.parsed) | set(prev_by_page)):
        parsed = reader.parsed.get(pid)
        if parsed is None and pid in reader.parsed:
            parsed = False                              # the page failed: keep the earlier record
        if parsed:
            evs, why = _events(pid, parsed, today)
            events += evs
            if why:
                skipped[why] += 1
        elif pid in prev_by_page and pid in pages:
            # not read this run: keep what the previous feed has (build.py drops past dates)
            for ev in prev_by_page[pid]:
                if str(ev.get('start', ''))[:10] >= today.isoformat():
                    events.append({k: v for k, v in ev.items() if k != 'country'})
                    reused += 1
    if skipped:
        log.info('%s: pages without concerts for Klang: %s', KEY, ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    log.info('%s: %d concert page(s) read, %d performance(s) kept from the previous feed', KEY,
             sum(1 for v in reader.parsed.values() if v is not None), reused)
    return events
