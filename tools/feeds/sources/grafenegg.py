"""Grafenegg: the Grafenegg Festival and the season concerts ("Jahreszeitenklänge") of the
Tonkünstler-Orchester in Grafenegg, from the site's own JSON API.

    https://www.grafenegg.com/de/api/events/?date=YYYY-MM-DD&page=1&page_size=100   coming events
    https://www.grafenegg.com/de/api/events/<id>/                                   one event's details
    https://www.grafenegg.com/de/programm-karten/<slug>/<id>                        the event page (link)

The programme page is a Nuxt app reading these endpoints. The list gives every coming event
from ``date`` on (about 60): name, subtitle, start (with offset), room ("Auditorium",
"Wolkenturm", "Rudolf Buchbinder Saal"), tags ("Grafenegg präsentiert", "Jahreszeitenklänge",
"Fremdveranstaltung", "Kinderkonzert" …), the sales status and the ticket link. The detail
endpoint adds the cast by role ("Dirigent: Giovanni Antonini", "Orchester: Tonkünstler-
Orchester Niederösterreich") and the works (composer + title); it is read incrementally
(_austria_east.read_details): an event the previous feed already has with performers or works
keeps them; new events first, then those due for a re-read. robots.txt answers 404 (no rules).

Kept: Grafenegg's own concerts and the festival; guest events only when they say classical
("Klassik unter Sternen"). Skipped: bus transfers, introductions ("Einführung"), park
tours, children's and school concerts, the Advent market, the programme presentation, guest
musicals, comedy, pop and tribute shows, folk "Adventsingen".

Checked against the website on 29 Oct 2026: 58 coming events (the 2027 festival is
presented on 7 Nov 2026 and not listed yet), 12 kept; dates, times, rooms, casts and works
match the event pages.
"""
from __future__ import annotations

import re

from common import FetchError, clean, get_json, log, looks_cancelled, make_event, today_zurich, to_zurich_datetime

from ._austria_east import credit, prev_credits, prev_program, read_details
from ._consent import strip_life_dates

KEY = 'grafenegg'
NAME = 'Grafenegg'
SITE = 'https://www.grafenegg.com/'
ATTRIBUTION = 'Source: Grafenegg Kulturbetriebsgesellschaft (grafenegg.com)'
KIND = 'festival'
COUNTRY = 'austria'
MAX_REQUESTS = 60              # 1–2 list pages + event details
TIME_LIMIT = 600

BASE = 'https://www.grafenegg.com'
LIST = BASE + '/de/api/events/?date={date}&page={page}&page_size=100'
DETAIL = BASE + '/de/api/events/{id}/'
PAGE = BASE + '/de/programm-karten/{slug}/{id}'
MAX_PAGES = 5

_SKIP = re.compile(r'(?i)bustransfer|einf[üu]hrung|f[üu]hrung|schulkonzert|kinderkonzert|programmpr[äa]sentation|'
                   r'grafenegg advent|musical|adventsingen|tribute|experience|comedy|kabarett')
_CLASSICAL_GUEST = re.compile(r'(?i)klassik|oper\b|philharm|sinfoni|symphon|orchester|kammermusik|quartett|recital')


def room(r):
    name = clean((r.get('room') or {}).get('name'))
    if not name:
        return 'Grafenegg'
    if re.search(r'(?i)^schloss grafenegg$', name):
        return 'Schloss Grafenegg'
    return f'Grafenegg, {name}'


def parse_detail(d):
    """The detail JSON -> {'credits': [(role, name)], 'program': [(composer, work)], 'casts': [(start, role, name)]}"""
    casts = []
    for key in ('role_group_1', 'role_group_2', 'role_group_3'):
        for group in d.get(key) or []:
            role = clean(group.get('name'))
            for c in group.get('casts') or []:
                name = clean((c.get('person') or {}).get('name'))
                if name:
                    casts.append((c.get('date_from'), role, name))
    program = []
    for w in d.get('works') or []:
        if w.get('is_break'):
            continue
        composer, title = strip_life_dates(clean(w.get('name'))), clean(w.get('description'))
        if composer and title:
            program.append((composer, title))
    return {'casts': casts, 'program': program}


def _credits_for(detail, start):
    out = []
    for when, role, name in detail.get('casts') or []:
        if when and start:
            try:
                if to_zurich_datetime(when) != to_zurich_datetime(start):
                    continue                            # the cast of another date
            except ValueError:
                pass
        c = credit(name, role, character_ok=True)       # 'Evangelist: Daniel Johannsen'
        if c and c not in out:
            out.append(c)
    return out


def fetch():
    today = today_zurich()
    rows, page = [], 1
    while page <= MAX_PAGES:
        try:
            data = get_json(LIST.format(date=today.isoformat(), page=page))
        except FetchError:
            if page == 1:
                raise
            break
        rows += data.get('results') or []
        if not data.get('next'):
            break
        page += 1
    kept = []
    for r in rows:
        name, sub = clean(r.get('name')), clean(r.get('subtitle'))
        tags = {clean(t.get('name')) for t in r.get('tags') or []}
        kind = r.get('event_type_new') or ''
        genre = clean((r.get('genre') or {}).get('name'))
        if genre == 'Bus' or kind.startswith(('3-child', '4-child')) or not r.get('has_detail'):
            continue
        if 'Kinderkonzert' in tags or _SKIP.search(f'{name} {sub}'):
            continue
        if 'Fremdveranstaltung' in tags and not _CLASSICAL_GUEST.search(f'{name} {sub}'):
            continue
        if not r.get('date_start') or not r.get('id'):
            continue
        kept.append({'sid': str(r['id']), 'title': name, 'sub': sub, 'start': r['date_start'], 'end': r.get('date_end'),
                     'page': DETAIL.format(id=r['id']), 'r': r, 'tags': tags})
    log.info('grafenegg: %d coming events, %d kept', len(rows), len(kept))
    details, previous = read_details(KEY, kept, lambda url: parse_detail(get_json(url)), every_days=7)
    events = []
    for k in kept:
        r = k['r']
        d, prev = details.get(k['page']), previous.get(k['sid'])
        credits = _credits_for(d, k['start']) if d else prev_credits(prev)
        program = d['program'] if d else prev_program(prev)
        series = next((t for t in ('Jahreszeitenklänge', 'Sommerklänge', 'Festival') if t in k['tags']), None)
        title = k['title']
        if k['sub'] and len(k['sub']) <= 40 and not re.search(r'(?i)uhr|matinee|best-of', k['sub']) \
                and k['sub'].lower() not in title.lower():
            title = f"{title} – {k['sub']}"
        slug = ((r.get('slug') or {}).get('de')) or 'event'
        status = clean(r.get('status'))
        try:
            events.append(make_event(
                KEY, k['sid'], title, k['start'], end=k['end'], city='Grafenegg', venueName=room(r), series=series,
                credits=credits, program=program, ticketUrl=r.get('ticket_url_external') or r.get('ticket_url'),
                url=PAGE.format(slug=slug, id=r['id']),
                status='cancelled' if status in ('cancelled', 'canceled') or looks_cancelled(f'{name} {status}')
                else 'scheduled'))
        except ValueError as err:
            log.warning('grafenegg %s: skipped: %s', k['sid'], err)
    return events
