"""Accademia Nazionale di Santa Cecilia, Rome: the concert calendar (HTML) and concert pages.

    https://santacecilia.it/concerti/calendario-concerti/?pg=40&vista=elenco   every coming date
    https://santacecilia.it/concerto/<slug>/?replica=<id>                       one concert, all dates

The calendar shows 18 dates and loads more with a POST to admin-ajax.php (never sent);
the page itself also reads its ``pg`` parameter, so ``?pg=40`` returns every coming date
(181 on 29 Oct 2026, up to June 2027) in one request. The "load more" script is printed
only while more dates remain, which is how the reader knows it got them all. robots.txt
answers 404 (everything allowed); no terms about reuse were found on the site.

Each date ("replica") gives its id, the date and time (the add-to-calendar link carries
``dates=20261105T193000`` with ``ctz=Europe/Rome``; the printed "Ore 19:30" wins if they
ever disagree), the hall, a label ("ROMAEUROPA FESTIVAL", "TUTTI A SANTA CECILIA",
"prima del concerto" …) and the ticket link. Performers and works are only on the concert
page (one request per concert, shared by its dates), in a free-form block:
"direttore <b>Name</b>", "<b>Composer</b> Work", bold group names, then the description
(never taken). Concert pages are read incrementally: a concert whose dates the previous
feed already has with cast or works (same id, start and title) keeps them; the requests
left go to concerts still missing them, soonest first, then to concerts in the next two
weeks and a fixed share of the others (each about once a week).

Skipped: "Tutti a Santa Cecilia" (the family, children's and school series, incl. "Prove
d'ascolto", Baby sound, Open Day), "Spirito Classico" pre-concert talks ("prima del
concerto"), the orchestra's tours abroad ("Tournée – Parigi"), invitation-only concerts,
cine-concerts, and the guest shows of the Romaeuropa Festival (crossover: 100 Cellos,
Orchestra Notturna Clandestina, The Köln Concert …).

Checked against the website on 29 Oct 2026 (Soddy 5–7 Nov, Kissin/Schiff 9 Nov, Theodora
16 Nov, Winterreise 20 Jan, Pagliacci 13–17 May: dates, times, halls, cast and works match).
"""
from __future__ import annotations

import html as _html
import re

from common import (BudgetExceeded, FetchError, clean, event_id, get, log, looks_cancelled, make_event,
                    previous_event, refresh_due, requests_left)

from ._italy_centre import concert_type, fold, month_number, paragraphs, parse_block, rome_iso, all_credits

KEY = 'santa_cecilia'
NAME = 'Accademia Nazionale di Santa Cecilia'
SITE = 'https://santacecilia.it/'
ATTRIBUTION = 'Source: Accademia Nazionale di Santa Cecilia (santacecilia.it)'
KIND = 'orchestra'
COUNTRY = 'italy'
MAX_REQUESTS = 80              # 1-2 calendar requests + one page per concert (~50 concerts a season)
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 14
REFRESH_EVERY_DAYS = 7

BASE = 'https://santacecilia.it'
CALENDAR = BASE + '/concerti/calendario-concerti/?pg={pg}&vista=elenco'
FIRST_PG = 40                  # 40 x 18 = 720 dates; doubled once if the page says more remain
CITY = 'Rome'
AUDITORIUM = 'Auditorium Parco della Musica'
_AUDITORIUM_HALLS = ('sala santa cecilia', 'sala sinopoli', 'sala petrassi', 'teatro studio', 'spazio risonanze',
                     'cavea', 'giardino claudio abbado', 'studio 1', 'studio 2', 'studio 3', 'sala coro',
                     'bibliomediateca', 'sala ospiti', 'museo degli strumenti musicali', 'auditorium')

_SKIP_LABEL_RE = re.compile(r'tutti a santa cecilia|prima del concerto|tourn[ée]e|ad inviti|romaeuropa', re.I)
_SKIP_TITLE_RE = re.compile(r"^tourn[ée]e\b|open day|prove d.ascolto|baby sound|cine-?concert|cineconcerto|"
                            r"spirito classico|conferenza|lezione|masterclass|visita guidata|laboratorio|juniorchestra", re.I)


# ---------------------------------------------------------------------------
# calendar
# ---------------------------------------------------------------------------

def parse_calendar(page):
    """-> list of dicts, one per date ('replica')."""
    rows = []
    for m in re.finditer(r'<article id="elencoReplica(\d+)"(.*?)</article>', page or '', re.S):
        rid, a = m.group(1), m.group(2)
        link = re.search(r'class="contentWrap titolo[^"]*"><a href="([^"]+)"[^>]*>(.*?)</a>', a, re.S)
        if not link:
            continue
        url = _html.unescape(link.group(1))
        slug = re.search(r'/concerto/([^/?#]+)', url)
        dates = re.search(r'dates=(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})', a)
        shown = re.search(r'class="orario[^"]*">.*?</span>\s*(\d{1,2})[:.](\d{2})', a, re.S)
        day = re.search(r'class="datej">(\d{1,2})<', a)
        month = re.search(r'class="dateF">([^<]+)<', a)
        hall = re.search(r'class="luogo[^"]*">(.*?)</div>', a, re.S)
        labels = [clean(x) for x in re.findall(r'class="alert[^"]*">(.*?)</div>', a, re.S) if clean(x)]
        ticket = re.search(r'<a href="([^"]+)"[^>]*title="Acquista"', a)
        rows.append({
            'rid': rid, 'url': url, 'slug': slug.group(1) if slug else url, 'title': clean(link.group(2)),
            'dates': dates.groups() if dates else None, 'shown': shown.groups() if shown else None,
            'day': int(day.group(1)) if day else None, 'month': month_number(month.group(1)) if month else None,
            'hall': clean(hall.group(1)) if hall else '', 'labels': labels,
            'ticket': _html.unescape(ticket.group(1)) if ticket else None,
        })
    return rows


def _more_remain(page):
    return "$('.pseudoInput.loadMore').removeClass('hidden')" in (page or '')


def read_calendar():
    pg = FIRST_PG
    page = get(CALENDAR.format(pg=pg))                  # FetchError propagates
    if _more_remain(page):
        try:
            page = get(CALENDAR.format(pg=pg * 2))
        except FetchError as err:
            log.warning('santa_cecilia: longer calendar failed, keeping the first %d pages: %s', pg, err)
        if _more_remain(page):
            log.warning('santa_cecilia: the calendar still has more dates than %d pages', pg * 2)
    return parse_calendar(page)


def _start(row):
    """ISO start in Rome, from the calendar link's date and the printed time."""
    if row['dates']:
        y, mo, d, hh, mi = (int(x) for x in row['dates'])
    else:
        return None
    if row['shown']:
        sh, sm = int(row['shown'][0]), int(row['shown'][1])
        if (sh, sm) != (hh, mi):
            log.warning('santa_cecilia %s: calendar link says %02d:%02d, page shows %02d:%02d; using the page',
                        row['rid'], hh, mi, sh, sm)
            hh, mi = sh, sm
    if row['day'] and row['day'] != d:
        log.warning('santa_cecilia %s: calendar link day %d differs from printed day %d', row['rid'], d, row['day'])
    return rome_iso(y, mo, d, hh, mi)


def _venue(hall):
    """-> (venueName, city) or (None, None) for a hall abroad ('Parigi, Philharmonie')."""
    h = clean(re.sub(r'(?i)turno\s+\S+$', '', hall)).strip()
    f = fold(h)
    if not h:
        return AUDITORIUM, CITY
    if any(f.startswith(x) for x in _AUDITORIUM_HALLS):
        if f == 'auditorium':
            return AUDITORIUM, CITY
        return f'{AUDITORIUM}, {h[:1].upper() + h[1:].lower() if h.isupper() else h}', CITY
    if ',' in h:                                         # 'Vienna, Konzerthaus': a tour date
        return None, None
    return h, CITY


# ---------------------------------------------------------------------------
# concert pages
# ---------------------------------------------------------------------------

def parse_detail(page):
    m = re.search(r'<div class="specificheProgramma entryContent">(.*?)<div class="boundaryLine', page or '', re.S)
    if not m:
        m = re.search(r'<div class="specificheProgramma entryContent">(.*?)</div>', page or '', re.S)
    title = re.search(r'<title>(.*?)\s*\|', page or '', re.S)
    block = parse_block(paragraphs(m.group(1)) if m else [], clean(title.group(1)) if title else '')
    return {'credits': all_credits(block['credits']), 'program': block['program']}


def _type(title, credits, program):
    roles = [r for r, _ in credits]
    std = {'Conductor', 'Orchestra', 'Choir', 'Ensemble', 'Chorus master', 'Performer', 'Piano', 'Violin', 'Cello',
           'Viola', 'Soprano', 'Mezzo-soprano', 'Contralto', 'Countertenor', 'Tenor', 'Baritone', 'Bass',
           'Bass-baritone', 'Narrator', 'Organ', 'Harpsichord', 'Voice', 'Flute', 'Clarinet', 'Oboe', 'Horn',
           'Trumpet', 'Harp', 'Guitar', 'Percussion', 'Double bass'}
    characters = [r for r in roles if r not in std and '&' not in r]
    if len(characters) >= 2:
        return 'vocal-opera'
    return concert_type(title, credits, program)


# ---------------------------------------------------------------------------
# fetch
# ---------------------------------------------------------------------------

def _skip(row):
    if any(_SKIP_LABEL_RE.search(x) for x in row['labels']):
        return 'family/talk/tour/guest label'
    if _SKIP_TITLE_RE.search(row['title']):
        return 'not a public concert in Rome'
    return None


def fetch():
    rows = read_calendar()
    skipped = {}
    cands = []
    for row in rows:
        why = _skip(row)
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        start = _start(row)
        venue, city = _venue(row['hall'])
        if not start or not city:
            skipped['abroad / no time'] = skipped.get('abroad / no time', 0) + 1
            continue
        cands.append({'row': row, 'start': start, 'venue': venue, 'city': city})
    if skipped:
        log.info('santa_cecilia: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    # one concert page per slug; reuse the previous feed's details when every date still matches
    concerts = {}
    for c in cands:
        concerts.setdefault(c['row']['slug'], []).append(c)
    details, reused = {}, 0
    order = []
    for slug, dates in concerts.items():
        prevs = [previous_event(event_id(KEY, c['row']['rid']), c['start'], title=c['row']['title']) for c in dates]
        full = [p for p in prevs if p and (p.get('credits') or p.get('program'))]
        if full:
            p = full[0]
            details[slug] = {'credits': [(x.get('role'), x.get('name')) for x in p.get('credits') or []],
                             'program': [(x.get('composer') or '', x.get('title') or '') for x in p.get('program') or []],
                             'reused': True}
        first = min(dates, key=lambda c: c['start'])
        tier = 0 if not full else (1 if refresh_due(slug, first['start'], near_days=REFRESH_NEAR_DAYS,
                                                    every_days=REFRESH_EVERY_DAYS) else None)
        if tier is not None:
            order.append((tier, first['start'], slug, first['row']['url']))
    order.sort()
    fetched = 0
    for tier, _, slug, url in order:
        if requests_left() <= 0:
            break
        try:
            d = parse_detail(get(url))
        except BudgetExceeded as err:
            log.warning('santa_cecilia: stopped reading concert pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('santa_cecilia %s: concert page failed: %s', slug, err)
            continue
        fetched += 1
        if d['credits'] or d['program'] or slug not in details:
            details[slug] = d
    reused = sum(1 for s, d in details.items() if d.get('reused'))
    log.info('santa_cecilia: %d dates kept of %d, %d concerts; %d concert page(s) read, %d reused',
             len(cands), len(rows), len(concerts), fetched, reused)

    events = []
    for c in cands:
        row = c['row']
        d = details.get(row['slug'], {'credits': [], 'program': []})
        title = row['title']
        status = 'cancelled' if (looks_cancelled(title) or any(looks_cancelled(x) for x in row['labels'])) else None
        try:
            events.append(make_event(
                KEY, row['rid'], title, c['start'], city=c['city'], venueName=c['venue'],
                type=_type(title, d['credits'], d['program']), credits=d['credits'], program=d['program'],
                ticketUrl=row['ticket'], url=row['url'], status=status))
        except ValueError as err:
            log.warning('santa_cecilia %s: skipped: %s', row['rid'], err)
    return events
