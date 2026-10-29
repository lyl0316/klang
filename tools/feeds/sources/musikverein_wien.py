"""Musikverein Wien: every event in the Musikverein's halls from the house's own calendar.

    https://spielplan.musikverein.at/spielplan?month=YYYY-MM     one page per month (HTML)
    https://spielplan.musikverein.at/spielplan?code=KIJU         children/youth/family events
    https://spielplan.musikverein.at/e/<id>.json                  one concert (cast, programme)
    https://musikverein.at/konzert/?id=<id>                       the concert page we link to

The calendar on musikverein.at/spielplan/ is an iframe of spielplan.musikverein.at (no
robots.txt there: HTTP 404). Its month pages list every event with date, "19:30 Uhr - 21:30
Uhr", hall, title, two free-text lines (performers' names, composers' surnames, subtitles
... in no fixed order) and the ticket link. The concert page on musikverein.at is filled in
by JavaScript from ``/e/<id>.json``, which has the facts per concert: cast with profession
("Dirigent", "Violine", "Orchester"), the programme (composer + work, in order, "***" =
interval), the kind of event ("Konzert", "Einführungsvortrag", "Symposion" ...) and a
cancelled flag. Only those facts are taken, never the descriptions.

That JSON costs one request per concert (about 1,000 events a season), so it is read
incrementally: a concert the previous feed already has (same id, start and title) keeps
its cast and programme; the requests left after the month pages (cap 150) go to concerts
not seen before, nearest first, then to concerts in the next week and a fixed share of the
others (each about every two weeks). A concert not reached yet is listed with its date,
hall, title and links only, until a later run reads it.

Each month page is the whole month (also its past days, dropped here). The page with the
filter ``code=KIJU`` lists all children's/family events of the season in one go; they are
skipped (the filter is only trusted when the page shows it selected).

The site's legal notice asks for consent before its content is reused; Klang republishes
facts only (date, time, title, hall, performers, works, links back).

Skipped: introductions and talks (Einführungsvortrag, Gespräch, Panel, Symposion),
exhibitions/installations, films, guided tours, children's/school/kindergarten
performances, and any event whose JSON does not call it a concert. Hired-hall concerts
("Eingemietete Veranstaltung", e.g. tourist Mozart/Strauss concerts) are kept: they are
classical concerts in the hall.

Checked against the website on 29 Oct 2026 (Tonkünstler 30 Oct, Wiener Mozart Orchester,
Sumi Jo 10 Nov, Wiener Symphoniker 12 Nov ...).
"""
from __future__ import annotations

import html as _html
import re
from datetime import date, timedelta

from common import (BudgetExceeded, FetchError, clean, event_id, get, get_json, infer_type, log, looks_cancelled,
                    make_event, previous_event, refresh_due, requests_left, today_zurich)

from ._vienna import CITY, credit, fold, local_iso, looks_like_person, order_credits

KEY = 'musikverein_wien'
NAME = 'Musikverein Wien'
SITE = 'https://musikverein.at/'
ATTRIBUTION = 'Source: Musikverein Wien (musikverein.at)'
KIND = 'venue'
COUNTRY = 'austria'
MAX_REQUESTS = 150             # ~16 month pages + 1 filter page, the rest for concert JSON
TIME_LIMIT = 900
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 14
WINDOW_DAYS = 450

PLAN = 'https://spielplan.musikverein.at/spielplan'
JSON = 'https://spielplan.musikverein.at/e/{id}.json'
PAGE = 'https://musikverein.at/konzert/?id={id}'

# lines in the ticket box that say it is not a public concert
_CLOSED_RE = re.compile(r'f[üu]r kinderg[äa]rten|f[üu]r schulklassen|im anschluss an das hauptkonzert', re.I)
# never a concert (title or subtitle lines)
_SKIP_RE = re.compile(
    r'einf[üu]hrung|vortrag|gespr[äa]ch|\bpanel\b|symposi|vernissage|ausstellung|installation|\bfilme?\b|'
    r'f[üu]hrung|workshop|pr[äa]sentation|auf ein glas|publikumsgespr|meet the|offene probe|kinder(?!totenlieder)|'
    r'schulklass|schulvorstell|kindergarten|tag der offenen|lecture|\btalk\b|podcast', re.I)
_CONCERT_KIND_RE = re.compile(r'konzert|oper|ballett|liederabend|rezital|recital|matinee|soir[ée]e', re.I)
_OFFSTAGE_RE = re.compile(r'fassung|dramaturg|konzept|regie|inszen|licht|video|\bton\b|klangregie|bühne|kostüm|'
                          r'moderation|einstudierung|produktion|text', re.I)


# ---------------------------------------------------------------------------
# month pages
# ---------------------------------------------------------------------------

_LI_RE = re.compile(r'<li class="event ([^"]*)" id="([0-9a-f]{6,})">(.*?)(?=<li class="event |</ul>\s*</li>|$)', re.S)


def _texts(fragment):
    return [clean(x) for x in re.findall(r'<(?:p|h3)\b[^>]*>(.*?)</(?:p|h3)>', fragment, re.S)]


def parse_month(page_html):
    """-> list of row dicts, one per event on a month page."""
    rows = []
    for cls, eid, body in _LI_RE.findall(page_html or ''):
        dt = re.search(r'<div class="event--date-time[^"]*">(.*?)</div>\s*<div class="event--main">', body, re.S)
        main = re.search(r'<div class="event--main">(.*?)</div>', body, re.S)
        if not dt or not main:
            continue
        d = [x for x in _texts(dt.group(1)) if x and x not in ('Fremdveranstaltung', 'Eigenveranstaltung')]
        day = re.search(r'(\d{2})\.(\d{2})\.(\d{4})', ' '.join(d))
        times = re.findall(r'(\d{1,2}:\d{2})\s*Uhr', ' '.join(d))
        if not day or not times:
            continue
        rest = [x for x in d if not re.search(r'\d{2}\.\d{2}\.\d{4}|\bUhr\b', x)]
        room, venue = (rest + ['', ''])[:2]
        heading = re.search(r'<h3[^>]*>(.*?)</h3>', main.group(1), re.S)
        lines = [clean(x) for x in re.findall(r'<p class="text">(.*?)</p>', main.group(1), re.S) if clean(x)]
        ticket = re.search(r'<a href="([^"]+)"\s+class="ticket-link"', body)
        box = re.search(r'<div class="event--ticketing">(.*?)</div>\s*</div>', body, re.S)
        rows.append({
            'id': eid, 'cls': cls.strip(),
            'day': date(int(day.group(3)), int(day.group(2)), int(day.group(1))),
            'time': times[0], 'end': times[1] if len(times) > 1 else None,
            'room': room, 'venue': venue,
            'title': clean(heading.group(1)) if heading else '',
            'lines': lines,
            'ticket': _html.unescape(ticket.group(1)) if ticket else None,
            'note': clean(box.group(1)) if box else '',
        })
    return rows


def _months(page_html):
    return re.findall(r'<option value="(\d{4}-\d{2})"', page_html or '')


def _children(today):
    """ids of the season's children's/family events (one filtered page), or an empty set."""
    try:
        page = get(f'{PLAN}?code=KIJU')
    except FetchError as err:
        log.warning('%s: children\'s filter page failed: %s', KEY, err)
        return set()
    if not re.search(r'<option value="KIJU"\s+selected', page):
        log.warning('%s: the children\'s filter was not applied; ignoring that page', KEY)
        return set()
    return {r['id'] for r in parse_month(page)}


# ---------------------------------------------------------------------------
# concert JSON
# ---------------------------------------------------------------------------

def parse_json(data):
    """-> {'kind', 'cancelled', 'credits': [(role, name)], 'works': [(composer, title)],
    'title', 'start', 'room', 'venue'} from /e/<id>.json."""
    booking = ((data or {}).get('booking') or {}).get('data') or [{}]
    b = booking[0] if booking else {}
    cast = sorted(((data.get('cast') or {}).get('data') or []), key=lambda c: int(c.get('order') or 0))
    credits = []
    for c in cast:
        name = clean(c.get('name_D') or c.get('name_E'))
        prof = clean(c.get('profession_D') or c.get('profession_E'))
        if not clean(c.get('website_target')):
            continue                                    # production staff ('Gesamtproduktion', 'Musikprojektleitung')
        if prof and _OFFSTAGE_RE.search(prof) and not re.search(r'leitung|dirig', prof, re.I):
            continue
        cr = credit(name, prof)
        if cr:
            credits.append(cr)
    title = clean(b.get('name_1_web_D'))
    works = []
    prog = sorted(((data.get('program') or {}).get('data') or []), key=lambda p: int(p.get('order') or 0))
    for p in prog:
        if str(p.get('is_encore')) == '1' or str(p.get('is_text')) == '1':
            continue
        comp = clean(p.get('composer_author'))
        work = clean(p.get('opus_titel_D') or p.get('opus_titel_E'))
        if comp.strip('* ') == '' and work.strip('* ') == '':
            continue                                    # '***': the interval
        if not comp:
            continue                                    # a subtitle or a note, not a work
        if fold(comp) == fold(title) or comp.isupper() or re.match(r'(?i)musikbeitr', comp):
            continue
        if not work and not looks_like_person(comp, max_words=6):
            continue
        works.append((comp, work))
    return {
        'kind': clean(b.get('activity_status_description')),
        'cancelled': str(b.get('booking_status_is_cancelled')).lower() == 'true',
        'credits': order_credits(credits), 'works': works, 'title': title,
        'start': clean(b.get('date_start')), 'room': clean(b.get('room_description')),
        'venue': clean(b.get('venue_description')),
    }


# ---------------------------------------------------------------------------
# rows -> events
# ---------------------------------------------------------------------------

def _venue_name(room, venue):
    if not venue or fold(venue) == 'musikverein':
        return f'Musikverein Wien, {room}' if room else 'Musikverein Wien'
    return f'{venue}, {room}' if room and fold(room) != fold(venue) else venue


def _skip(row, children):
    if row['id'] in children:
        return 'children'
    if _CLOSED_RE.search(row['note']):
        return 'closed performance'
    if _SKIP_RE.search(row['title']) or any(_SKIP_RE.search(x) for x in row['lines'][:1]):
        return 'not a concert'
    return None


def fetch():
    today = today_zurich()
    last = today + timedelta(days=WINDOW_DAYS)
    first = get(f"{PLAN}?month={today.strftime('%Y-%m')}")          # FetchError propagates
    months = [m for m in _months(first) if f'{today:%Y-%m}' < m <= f'{last:%Y-%m}']
    pages = [first]
    for m in months:
        try:
            pages.append(get(f'{PLAN}?month={m}'))
        except BudgetExceeded:
            raise
        except FetchError as err:
            log.warning('%s: month %s failed: %s', KEY, m, err)
    rows = {}
    for page in pages:
        for r in parse_month(page):
            if today <= r['day'] <= last:
                rows[r['id']] = r
    children = _children(today)

    cands, skipped = [], {}
    for r in sorted(rows.values(), key=lambda r: (r['day'], r['time'])):
        why = _skip(r, children)
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        start = local_iso(r['day'], r['time'])
        if not start:
            continue
        c = {'row': r, 'start': start, 'title': r['title'], 'credits': [], 'works': [], 'type': None,
             'detailed': False, 'reused': False, 'cancelled': looks_cancelled(r['title']) or looks_cancelled(r['note'])}
        prev = previous_event(event_id(KEY, r['id']), start, title=r['title'])
        if prev and (prev.get('credits') or prev.get('program')):     # read on an earlier run
            c['credits'] = [(x.get('role'), x.get('name')) for x in prev.get('credits') or []]
            c['works'] = [(x.get('composer') or '', x.get('title') or '') for x in prev.get('program') or []]
            c['type'] = prev.get('type')
            c['reused'] = True
            c['cancelled'] = c['cancelled'] or prev.get('status') == 'cancelled'
        cands.append(c)
    if skipped:
        log.info('%s: skipped %s', KEY, ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    def tier(c):
        if not c['reused']:
            return 0
        if refresh_due(c['row']['id'], c['start'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    order = sorted((c for c in cands if tier(c) is not None), key=lambda c: (tier(c), c['start']))
    read, dropped = 0, set()
    for c in order:
        if requests_left() <= 0:
            break
        try:
            d = parse_json(get_json(JSON.format(id=c['row']['id'])))
        except BudgetExceeded as err:
            log.warning('%s: stopped reading concert JSON: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: concert JSON failed: %s', KEY, c['row']['id'], err)
            continue
        read += 1
        if d['kind'] and not _CONCERT_KIND_RE.search(d['kind']):
            dropped.add(c['row']['id'])
            continue
        c['detailed'] = True
        c['credits'], c['works'] = d['credits'], d['works']
        c['cancelled'] = d['cancelled'] or looks_cancelled(c['title']) or looks_cancelled(c['row']['note'])
    log.info('%s: %d concert JSON read, %d not concerts, %d reused, %d without details yet', KEY, read,
             len(dropped), sum(1 for c in cands if c['reused'] and not c['detailed']),
             sum(1 for c in cands if not c['reused'] and not c['detailed'] and c['row']['id'] not in dropped))

    events = []
    for c in cands:
        r = c['row']
        if r['id'] in dropped:
            continue
        kind = infer_type(c['title'], c['credits'], c['works']) if (c['detailed'] or not c['type']) else c['type']
        end = local_iso(r['day'], r['end']) if r['end'] else None
        try:
            events.append(make_event(
                KEY, r['id'], c['title'], c['start'], end=end,
                city=CITY, venueName=_venue_name(r['room'], r['venue']), type=kind,
                credits=c['credits'], program=c['works'], ticketUrl=r['ticket'], url=PAGE.format(id=r['id']),
                status='cancelled' if c['cancelled'] else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, r['id'], err)
    return events
