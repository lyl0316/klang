"""Münchner Philharmoniker: the orchestra's concert calendar (HTML).

    https://www.mphil.de/kalender                                         first 15 concerts
    https://www.mphil.de/kalender?…[action]=concertCalendarLoadConcerts&…[offset]=N&type=1726500002
                                                                          the next 15 ("Mehr laden")
    https://www.mphil.de/konzerte-und-karten/kalender/konzerte/<slug>     one page per concert

The calendar page shows 15 concert cards and a "Mehr laden" button with ``data-count``
(about 120) and ``data-next-offset``; the button's AJAX URL (``data-list-url`` on the
calendar, without its cHash, as the site's own script sends it) returns the next 15 cards,
so the whole season costs about 8 requests. Each card has the start (``<time datetime=
"2026-10-29 19:30">``, Munich local time), the hall, the series category (Symphoniekonzerte,
Kammerkonzerte, Gastkonzerte, Education), an optional title and subtitle, performers with
their instrument, the works in short form ("39. Symphonie"), a ticket link and status labels.
Long lists are cut with "( ... )". Symphony concerts have no title: Klang names them after
the first performer and the composers ("Barbara Hannigan: Khayam, Haydn, Messiaen, Ravel"),
from the card only, so the title stays the same from run to run.

The concert page adds the full works ("Symphonie Nr. 39 g-Moll Hob. I:39"), all performers
and the dates sharing the programme. It is read incrementally (cap 100 requests): a concert
whose card is unchanged since the previous feed (same id and start, its performers and
composers all in the earlier record) keeps the works and cast read before; the requests left
go to concerts still missing them, soonest first, then to concerts in the next week and a
fixed share of the others (each about every two weeks). One page serves every date of its
programme (same card contents, a date listed under "alle Termine mit diesem Konzertprogramm").

Tours: German towns are kept with their English name (Hamburg, Dortmund, Frankfurt,
Baden-Baden, Ottobeuren); concerts abroad (Vienna, Amsterdam, Paris, the USA …) are left
out. A hall without a town name ("Saal X", "Herz-Jesu-Kirche") is in Munich.

Skipped: the Education series on its own (Kindergarten, family, school and youth concerts,
"Frag die Profis", "Chefsache"), anything whose title says it is for children, and the jazz
late-night format ("MPHIL Late" with the Ensemble »MPhil Jazz«).

The imprint says the pages' content may not be reproduced without consent; Klang takes facts
only (date, time, hall, performers, works, links). Checked against the website on
29 Oct 2026: 117 entries, 70 kept (27 Education, 18 abroad, 2 jazz); 71 requests.
"""
from __future__ import annotations

import html as _html
import re
from datetime import datetime

from common import (BudgetExceeded, FetchError, clean, event_id, get, infer_type, log, looks_cancelled, make_event,
                    previous_event, refresh_due, requests_left)

from ._south_germany import credit, dedupe_credits, in_window, local_iso, name_key, skip_title, town

KEY = 'muenchner_philharmoniker'
NAME = 'Münchner Philharmoniker'
SITE = 'https://www.mphil.de/'
ATTRIBUTION = 'Source: Münchner Philharmoniker (mphil.de)'
KIND = 'orchestra'
COUNTRY = 'germany'
MAX_REQUESTS = 100             # ~8 listing requests, the rest for concert pages
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 14

BASE = 'https://www.mphil.de'
CALENDAR = BASE + '/kalender'
ORCHESTRA = 'Münchner Philharmoniker'
MAX_PAGES = 20
PARAM = 'tx_mphilconcerts_konzertkalender26'


# ---------------------------------------------------------------------------
# listing
# ---------------------------------------------------------------------------

def _list_url(page_html):
    """The AJAX list URL of the calendar, without its cHash (the site's script drops it too)."""
    m = re.search(r'data-list-url="([^"]+)"', page_html or '')
    if not m:
        return None
    url = _html.unescape(m.group(1))
    url = re.sub(r'&cHash=[0-9a-f]+', '', url)
    return BASE + url if url.startswith('/') else url


def _next_offset(page_html):
    m = re.search(r'data-next-offset="(\d+)"', page_html or '')
    return int(m.group(1)) if m else 0


def _text(fragment):
    return clean(_html.unescape(fragment or ''))


def _persons(fragment, block):
    """[(name, role)] from the <li class="m-mphil-<block>__person …"> items (linked or not)."""
    out = []
    for li in re.findall(r'<li class="m-mphil-%s__person\b[^"]*"[^>]*>(.*?)</li>' % block, fragment or '', re.S):
        name = re.search(r'__person-link-title">(.*?)</span>|__person-link -inactive">(.*?)</(?:span|p)>', li, re.S)
        inst = re.search(r'__instrument">(.*?)</span>\s*(?:</span>)?\s*$', li.strip(), re.S)
        n = _text((name.group(1) or name.group(2)) if name else '')
        if n:
            out.append((n, _text(inst.group(1)) if inst else ''))
    return out


def parse_cards(page_html):
    """-> list of card dicts from one calendar page or AJAX fragment."""
    out = []
    for chunk in re.split(r'<li class="l-row__item m-mphil-concertlist__item', page_html or '')[1:]:
        chunk = chunk.split('m-mphil-concertlist__load-more')[0]
        href = re.search(r'class="m-mphil-concertlist__detail-link" href="([^"]+)"', chunk)
        when = re.search(r'<time datetime="(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})"', chunk)
        if not (href and when):
            continue
        y, mo, d, hh, mi = (int(x) for x in when.groups())
        venue = re.search(r'm-mphil-concertlist__venue">(.*?)</div>', chunk, re.S)
        title = re.search(r'm-mphil-concertlist__headline[^>]*>(.*?)</h3>', chunk, re.S)
        sub = re.search(r'm-mphil-concertlist__subheadline[^>]*>(.*?)</h4>', chunk, re.S)
        persons = _persons(chunk, 'concertlist')
        works = re.findall(r'concertlist__work-composer">(.*?)</span>\s*<span class="m-mphil-concertlist__work-title">'
                           r'(.*?)</span>', chunk, re.S)
        tickets = [(u, _text(t)) for u, t in re.findall(
            r'<a href="(https?://[^"]+)"[^>]*class="e-button-primary[^"]*"[^>]*>(.*?)</a>', chunk, re.S)]
        labels = [_text(x) for x in re.findall(r'class="e-button-primary[^"]*"[^>]*>(.*?)</(?:a|span|button)>', chunk, re.S)]
        slug = _html.unescape(href.group(1)).rstrip('/').rsplit('/', 1)[-1]
        out.append({
            'slug': slug,
            'url': BASE + _html.unescape(href.group(1)),
            'day': datetime(y, mo, d).date(), 'hh': hh, 'mm': mi,
            'venue': _text(venue.group(1)) if venue else '',
            'cats': list(dict.fromkeys(_text(c) for c in re.findall(r'm-mphil-concertlist__cat"[^>]*>(.*?)</p>', chunk))),
            'title': _text(title.group(1)) if title else '',
            'sub': _text(sub.group(1)) if sub else '',
            'persons': persons,
            'works': [(_text(c), _text(t)) for c, t in works if _text(c) or _text(t)],
            'more': '--more' in chunk,
            'ticket': next((u for u, t in tickets if 'karten' in t.lower() or 'ticket' in t.lower()), None)
                      or (tickets[0][0] if tickets else None),
            'labels': labels,
        })
    return out


def _read_listing():
    first = get(CALENDAR)                                  # FetchError propagates
    cards = parse_cards(first)
    url = _list_url(first)
    offset = _next_offset(first)
    pages = 1
    while url and offset and pages < MAX_PAGES:
        if requests_left() <= 0:
            log.warning('%s: request cap reached in the calendar at offset %d', KEY, offset)
            break
        try:
            frag = get(f'{url}&{PARAM}%5Boffset%5D={offset}')
        except FetchError as err:
            log.warning('%s: calendar offset %d failed: %s', KEY, offset, err)
            break
        pages += 1
        more = parse_cards(frag)
        if not more:
            break
        cards.extend(more)
        nxt = _next_offset(frag)
        if nxt <= offset:
            break
        offset = nxt
    seen, out = set(), []
    for c in cards:
        if c['slug'] not in seen:
            seen.add(c['slug'])
            out.append(c)
    log.info('%s: %d calendar request(s), %d concerts', KEY, pages, len(out))
    return out


# ---------------------------------------------------------------------------
# concert pages
# ---------------------------------------------------------------------------

def parse_detail(page_html):
    """-> {'persons': [(name, role)], 'works': [(composer, title)], 'dates': {(date, hh, mm)}}"""
    h = page_html or ''
    persons = _persons(h, 'concert-detail')
    works = []
    for item in re.findall(r'<li class="m-mphil-concert-detail__work-item">(.*?)</li>', h, re.S):
        if '-pause' in item:
            continue
        comp = re.search(r'concert-detail__work-composer[^>]*>(.*?)</(?:a|span|p)>', item, re.S)
        title = re.search(r'concert-detail__work-title\b[^"]*"[^>]*>(.*?)</(?:p|a)>', item, re.S)
        c, t = _text(comp.group(1)) if comp else '', _text(title.group(1)) if title else ''
        if c or t:
            works.append((c, t))
    modal = h.split('id="further-dates"', 1)[1] if 'id="further-dates"' in h else ''
    dates = set()
    for y, mo, d, hh, mi in re.findall(r'<time datetime="(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})"', modal):
        dates.add((datetime(int(y), int(mo), int(d)).date(), int(hh), int(mi)))
    return {'persons': persons, 'works': works, 'dates': dates}


def _signature(c):
    return (tuple(c['persons']), tuple(c['works']), c['title'])


def _listing_matches(c, prev):
    cast = {name_key(x.get('name')) for x in prev.get('credits') or []}
    if any(name_key(n) not in cast for n, _ in c['persons']):
        return False
    composers = ' | '.join(name_key(p.get('composer')) for p in prev.get('program') or [])
    return all(name_key(w) in composers for w, _ in c['works'] if name_key(w))


def _apply_detail(c, d):
    if d['works']:
        c['works_full'] = d['works']
    if d['persons']:
        c['persons_full'] = d['persons']
    c['detailed'] = True


def _enrich(cands):
    for c in cands:
        prev = previous_event(event_id(KEY, c['slug']), c['start'])
        if prev and _listing_matches(c, prev) and (prev.get('program') or prev.get('credits')):
            c['prev'] = prev
    groups = {}
    for c in cands:
        groups.setdefault(_signature(c), []).append(c)

    def tier(c):
        if not c.get('prev'):
            return 0
        if refresh_due(c['slug'], c['start'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    order = sorted((c for c in cands if tier(c) is not None), key=lambda c: (tier(c), c['start']))
    read = 0
    for c in order:
        if c.get('detailed'):
            continue
        if requests_left() <= 0:
            break
        try:
            d = parse_detail(get(c['url']))
        except BudgetExceeded as err:
            log.warning('%s: stopped reading concert pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: concert page failed: %s', KEY, c['slug'], err)
            continue
        read += 1
        _apply_detail(c, d)
        for other in groups.get(_signature(c), []):
            if other is not c and not other.get('detailed') and (other['day'], other['hh'], other['mm']) in d['dates']:
                _apply_detail(other, d)
    log.info('%s: %d concert page(s) read, %d concerts reuse earlier details', KEY, read,
             sum(1 for c in cands if c.get('prev') and not c.get('detailed')))


# ---------------------------------------------------------------------------
# cards -> events
# ---------------------------------------------------------------------------

def _surname(name):
    """'Joseph Haydn' -> 'Haydn', 'Felix Mendelssohn Bartholdy' -> 'Mendelssohn'."""
    n = re.sub(r'\s+Bartholdy$', '', clean(name))
    parts = n.split()
    return parts[-1] if parts else ''


def _title(c):
    if c['title']:
        return c['title']
    composers = list(dict.fromkeys(_surname(w) for w, _ in c['works'] if w))
    lead = c['persons'][0][0] if c['persons'] else ''
    if lead and composers:
        return f"{lead}: {', '.join(composers)}"
    return ', '.join(composers) or lead or c['sub'] or ORCHESTRA


_VOCAL_WORK_RE = re.compile(r'(?i)missa|\bmesse\b|requiem|oratori|passion|kantate|\boper\b|walpurgisnacht|'
                            r'stabat mater|magnificat|te deum')
_VOICES = {'Soprano', 'Mezzo-soprano', 'Alto', 'Contralto', 'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass',
           'Choir'}


def _type(c, credits, program):
    cats = c['cats']
    voices = sum(1 for r, _ in credits if r in _VOICES)
    if voices >= 2 and any(_VOCAL_WORK_RE.search(t or '') for _, t in program):
        return 'vocal-opera'
    t = infer_type(c['title'] or c['sub'], credits, program, c['sub'], solo_rule=False)
    if t:
        return t
    if 'Symphoniekonzerte' in cats:
        return 'orchestral'
    if 'Kammerkonzerte' in cats:
        return 'chamber'
    return None


def fetch():
    cards = _read_listing()
    cands, skipped = [], {}

    def skip(why):
        skipped[why] = skipped.get(why, 0) + 1

    for c in cards:
        if not in_window(c['day']):
            skip('outside the window')
            continue
        if c['cats'] and set(c['cats']) <= {'Education'}:
            skip('education (children, school, family)')
            continue
        if skip_title(c['title'], c['sub']):
            skip('children / not a concert')
            continue
        if any(re.search(r'(?i)\bjazz\b', n) for n, _ in c['persons']):
            skip('jazz')
            continue
        city = town(c['venue']) or 'Munich'
        if city == 'abroad':
            skip('abroad')
            continue
        c['city'] = city
        c['start'] = local_iso(c['day'], c['hh'], c['mm'])
        cands.append(c)
    if skipped:
        log.info('%s: skipped %s', KEY, ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    _enrich(cands)

    events = []
    for c in cands:
        prev = c.get('prev') if not c.get('detailed') else None
        persons = c.get('persons_full') or c['persons']
        credits = [x for x in (credit(n, r) for n, r in persons) if x]
        credits = [(r, n) for r, n in credits if r not in ('Director', 'Choreographer')]
        works = c.get('works_full') or c['works']
        program = [(w, t) for w, t in works]
        if prev:
            if prev.get('program'):
                program = [(p.get('composer') or '', p.get('title') or '') for p in prev['program']]
            if len(prev.get('credits') or []) > len(credits):
                credits = [(x.get('role'), x.get('name')) for x in prev['credits']]
        credits = dedupe_credits(credits)
        if 'Symphoniekonzerte' in c['cats'] and not any(n == ORCHESTRA for _, n in credits):
            credits.append(('Orchestra', ORCHESTRA))
        cancelled = looks_cancelled(c['title']) or any(looks_cancelled(x) for x in c['labels'])
        try:
            events.append(make_event(
                KEY, c['slug'], _title(c), c['start'], city=c['city'], venueName=c['venue'] or None,
                type=_type(c, credits, program), series=c['sub'] or None, credits=credits, program=program,
                ticketUrl=c['ticket'], url=c['url'], status='cancelled' if cancelled else None))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, c['slug'], err)
    return events
