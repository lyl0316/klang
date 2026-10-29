"""styriarte, Graz: the concerts of "Aus dem Hause Styriarte" (styriarte festival, Recreation,
Meerschein, Psalm) from the site's own programme API and production pages.

    https://styriarte.com/api/filtered-program?page=N&startDate=…&endDate=…&currentLocale=default
    https://styriarte.com/produktionen/<slug>                       one page per production

The programme page (/programm) is filled by the JSON endpoint its own script calls:
``{"results": "<li …>…</li>…", "last_page": 6}``, ten performances per page. (With
``currentLocale=de`` it answers with nothing; the page itself sends ``default``.) Each entry
has the date without a year ("09.11."), weekday and time ("Mo, 18:00"), the title, tags
("Konzert", "Matinee", "Kinderzimmer" …), the festival, the hall and the ticket link
(``shop?event=192``, used as the id).

Performers and works are on the production page: "<h3>Programm</h3><p>Samuel Barber: Adagio
for Strings …" and the cast cards ("Mei-Ann Chen", "Dirigentin"). A card's role line is the
artist's general one ("Orchesterleitung, Blockflöte, Cembalo, Orgel"); a single role is
mapped, several give "Performer". Production pages are read incrementally
(_austria_east.read_details): a performance the previous feed already has with performers or
works keeps them; new ones first, then the ones due for a re-read.

The site's terms (AGB, "Urheberrecht") reserve the reproduction of its content; Klang takes
facts only (date, time, title, hall, performers, works, links back), never texts or images.

Halls: Stefaniensaal -> "Congress Graz, Stefaniensaal" (as musikverein_graz / oper_graz);
Minoritensaal, Palais Attems, Helmut List Halle … keep their names, in Graz; the parish
churches of Pöllau and Stainz and the Schöckl give those towns.

Skipped: "Kinderzimmer" (children's shows), readings and films without a concert tag,
guided tours, the "Styriarte-Apéro" (the festival's programme presentation) and the "Intro"
talks (not listed separately).

Checked against the website on 29 Oct 2026: 60 performances listed from today (styriarte
2027 not published yet), 51 kept (6 "Frau Holle" children's shows and 3 Apéros skipped); dates, times,
halls, performers and works match the production pages.
"""
from __future__ import annotations

import html as _html
import re
import urllib.parse
from datetime import timedelta

from common import FetchError, clean, get, get_json, log, looks_cancelled, make_event, today_zurich

from ._austria_east import (composer_like, credit, local_iso, prev_credits, prev_program, read_details, role_of,
                            work_line, year_for)
from ._consent import group_role

KEY = 'styriarte'
NAME = 'styriarte'
SITE = 'https://styriarte.com/'
ATTRIBUTION = 'Source: styriarte – Die Steirischen Festspiele (styriarte.com)'
KIND = 'festival'
COUNTRY = 'austria'
MAX_REQUESTS = 60              # ~6–15 listing pages, the rest for production pages
TIME_LIMIT = 600

BASE = 'https://styriarte.com'
API = BASE + '/api/filtered-program?'
MAX_PAGES = 30
WINDOW_DAYS = 450

_SKIP_TAGS = {'Kinderzimmer'}
_MUSIC_TAGS = {'Konzert', 'Musiktheater', 'Matinee', 'Outdoor', 'Picknick', 'Am Set'}
_SKIP_TITLE = re.compile(r'(?i)kinder|familie|f[üu]hrung|workshop|schulkonzert|ap[ée]ro\b')
_TOWNS = (
    (r'p[öo]llau', 'Pöllau'),
    (r'stainz', 'Stainz'),
    (r'sch[öo]ckl', 'St. Radegund bei Graz'),
)


def hall(text):
    t = clean(text)
    if re.search(r'stefaniensaal', t, re.I):
        return 'Congress Graz, Stefaniensaal', 'Graz'
    for rx, town in _TOWNS:
        if re.search(rx, t, re.I):
            return t, town
    return t or 'Graz', 'Graz'


# ---------------------------------------------------------------------------
# listing
# ---------------------------------------------------------------------------

_LI_RE = re.compile(r'<li id="[^"]*" class="js-event-teaser-item[^"]*"[^>]*>(.*?)</li>\s*(?=<li id=|$)', re.S)


def parse_listing(fragment, today, state=None):
    """Entries of one API page. The dates carry no year: the list is chronological, so the year
    goes up whenever the month goes back (``state`` carries the last date across pages)."""
    state = {} if state is None else state
    rows = []
    for li in _LI_RE.findall(fragment or ''):
        date = re.search(r'class="headline[^"]*">\s*(\d{1,2})\.(\d{1,2})\.\s*<', li)
        time = re.search(r'class="text-program">\s*\w+,\s*(\d{1,2}):(\d{2})\s*<', li)
        title = re.search(r'<h3[^>]*>(.*?)</h3>', li, re.S)
        href = re.search(r'href="(/produktionen/[^"#?]+)"', li)
        if not (date and time and title and href):
            continue
        day, month = int(date.group(1)), int(date.group(2))
        if 'last' not in state:
            year = year_for(day, month, today)
        else:
            year = state['last'][0] + (1 if (month, day) < state['last'][1:] else 0)
        state['last'] = (year, month, day)
        venue = re.search(r'class="text-program hidden lg:block">\s*(.*?)\s*</div>', li, re.S)
        ticket = re.search(r'href="(https://shop\.styriarte\.com/webshop/webticket/shop\?event=(\d+)[^"]*)"', li)
        slug = href.group(1).rsplit('/', 1)[-1]
        rows.append({
            'title': clean(title.group(1)), 'start': local_iso(year, month, day, time.group(1), time.group(2)),
            'tags': set(re.findall(r'data-tooltip="([^"]*)"', li)),
            'festival': (re.findall(r'title="([^"]*)"\s*class="tag relative', li) or [None])[0],
            'venue': clean(venue.group(1)) if venue else '', 'page': BASE + href.group(1),
            'ticket': _html.unescape(ticket.group(1)) if ticket else None,
            'sid': ticket.group(2) if ticket else
            f'{slug}-{year:04d}{month:02d}{day:02d}{time.group(1)}{time.group(2)}',
            'labels': ' '.join(re.findall(r'class="(?:badge|label|status)[^"]*"[^>]*>([^<]*)<', li)),
        })
    return rows


# ---------------------------------------------------------------------------
# production page
# ---------------------------------------------------------------------------

def _work(line):
    pair = work_line(line)
    if pair:
        return pair
    m = re.match(r'^(.+?)\s*\(([^()]{3,60})\)$', clean(line))        # 'La sedia di Gurdjieff (Nicola Segatta)'
    if m and composer_like(m.group(2)):
        return m.group(2), m.group(1)
    return None


def parse_production(page_html):
    h = page_html or ''
    out = {'credits': [], 'program': []}
    prog = re.search(r'<h3>\s*Programm\s*</h3>\s*(.*?)(?:<h3>|</div>)', h, re.S)
    for para in re.findall(r'<p>(.*?)</p>', prog.group(1) if prog else '', re.S):
        for line in re.split(r'<br\s*/?>', para):
            pair = _work(line)
            if pair and pair not in out['program']:
                out['program'].append(pair)
    cast = re.search(r'<h2>\s*Besetzung\s*</h2>(.*?)</section>', h, re.S)
    for name, meta in re.findall(r'data-title="([^"]*)"\s*data-slug="[^"]*"\s*data-collection="artists".*?'
                                 r'generic-teaser-meta[^>]*>\s*<div>\s*(.*?)\s*</div>', cast.group(1) if cast else '',
                                 re.S):
        name, meta = clean(_html.unescape(name)), clean(meta)
        roles = [r for r in (x.strip() for x in meta.split(',')) if r]
        if len(roles) == 1:
            c = credit(name, roles[0])
        elif group_role(name):
            c = (group_role(name), name)
        elif roles and all(role_of(r) is None for r in roles):
            c = None                                    # off-stage only (director, designer)
        else:
            c = ('Performer', name)
        if c and c not in out['credits']:
            out['credits'].append(c)
    return out


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def fetch():
    today = today_zurich()
    params = {'filterTicketsAvailable': 'false', 'startDate': today.isoformat(),
              'endDate': (today + timedelta(days=WINDOW_DAYS)).isoformat(), 'currentLocale': 'default'}
    rows, page, last, state = [], 1, 1, {}
    while page <= min(last, MAX_PAGES):
        try:
            data = get_json(API + urllib.parse.urlencode(dict(params, page=page)))
        except FetchError:
            if page == 1:
                raise
            log.warning('styriarte: listing page %d failed', page)
            break
        last = int(data.get('last_page') or 1)
        rows += parse_listing(data.get('results') or '', today, state)
        page += 1
    kept, skipped = [], 0
    for r in rows:
        if r['tags'] & _SKIP_TAGS or _SKIP_TITLE.search(r['title']) or (r['tags'] and not r['tags'] & _MUSIC_TAGS):
            skipped += 1
            continue
        kept.append(r)
    log.info('styriarte: %d performances listed (%d page(s)), %d skipped (children/readings)', len(rows), page - 1,
             skipped)
    details, previous = read_details(KEY, kept, lambda url: parse_production(get(url)))
    events = []
    for r in kept:
        d, prev = details.get(r['page']), previous.get(r['sid'])
        venue, city = hall(r['venue'])
        try:
            events.append(make_event(
                KEY, r['sid'], r['title'], r['start'], city=city, venueName=venue, series=r['festival'],
                credits=d['credits'] if d else prev_credits(prev), program=d['program'] if d else prev_program(prev),
                ticketUrl=r['ticket'], url=r['page'],
                status='cancelled' if looks_cancelled(f"{r['title']} {r['labels']} {' '.join(r['tags'])}")
                else 'scheduled'))
        except ValueError as err:
            log.warning('styriarte %s: skipped: %s', r['sid'], err)
    return events
