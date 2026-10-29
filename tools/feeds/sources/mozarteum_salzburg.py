"""Stiftung Mozarteum Salzburg: the foundation's concert calendar, Mozartwoche included.

    https://mozarteum.at/page-data/konzerte/page-data.json      one request, every event

The site is a Gatsby build: the calendar page /konzerte is rendered from one JSON file
(``page-data.json``) that holds every event of the season with its dates
(``concertLocationTimes``: date, start, end, hall), performers (``artists`` with an
instrument / role), category (Mozartwoche, Saisonkonzerte, Kinder und Jugend, Museen,
"Weitere Veranstalter" = guest promoters in the foundation's halls …) and the ticket shop
id of each date (``jettickets``). The programme is the "<strong>Composer</strong><br>Work"
block at the top of the event's info text; only those lines are taken, never the prose
that follows (``_austria_west.program_from_html``). Times are Salzburg local time.
Checked against the website on 29 Oct 2026 (Meisterkonzert Gautier Capuçon 17.11. 19.00
Großer Saal; Mozart Requiem / Pinnock 5.12.; Mozartwoche Wiener Philharmoniker I
23.1.2027 19.30 Großes Festspielhaus).

The site's own link for an event is /konzerte?event=<slug> (a query on the calendar page);
the ticket link is the foundation's shop (ticket.mozarteum.at, never fetched).

The legal notice forbids reusing the site's texts, pictures and recordings without
consent; Klang republishes facts only (date, time, title, hall, performers, works, links).

Skipped: archived events, guided tours, workshops, museum programmes, children's, school
and family formats, films, talks, the Mozartwoche fringe ("Trazom": crime café, film
evenings), drama and puppet theatre, club nights, and guest promoters' shows that are
not classical (comedy, swing big band, health talks, readings).
"""
from __future__ import annotations

import re
from datetime import date

from common import clean, get_json, infer_type, log, looks_cancelled, make_event, to_zurich_iso, today_zurich

from ._austria_west import credit, order_credits, program_from_html, role_from_text, split_names, strip_tracking

KEY = 'mozarteum_salzburg'
NAME = 'Stiftung Mozarteum Salzburg'
SITE = 'https://mozarteum.at/konzerte'
ATTRIBUTION = 'Source: Stiftung Mozarteum Salzburg (mozarteum.at)'
KIND = 'venue'
COUNTRY = 'austria'
MAX_REQUESTS = 5
TIME_LIMIT = 300

BASE = 'https://mozarteum.at'
DATA = BASE + '/page-data/konzerte/page-data.json'
EVENT_URL = BASE + '/konzerte?event={slug}'
SHOP_URL = 'https://ticket.mozarteum.at/webshop/webticket/shop?event={id}&language=de'
TZ = 'Europe/Vienna'
WINDOW_DAYS = 450
FULL_NAMES = {'Mozart': 'Wolfgang Amadé Mozart', 'W. A. Mozart': 'Wolfgang Amadé Mozart',
              'W.A. Mozart': 'Wolfgang Amadé Mozart'}

# categories (nameDe of the category or second category) that are never concerts
_SKIP_CATEGORY = {
    'führung', 'workshop', 'museen', 'schulklassen', 'kindergarten', 'krabbelgruppen', 'mittendrin (unter 4 j.)',
    'lauschkonzerte (4+)', 'familienkonzert', 'familien', 'kinder und jugend', 'pädagogik', 'film', 'talk',
    'clubbing', 'drama', 'get-together', 'marionetten', 'trazom',
}
_SKIP_TITLE = re.compile(
    r'führung|fuehrung|workshop|basteln|kinder|familie|schulkonzert|schulklassen|sing-?along|mitsing|mitmach|'
    r'lausch-?konzert|krabbel|\btalk\b|gespräch|vortrag|lecture|lesung|film\b|komödie|healthfluenza|glenn miller|'
    r'swing|wettbewerb|clubbing|\bdj\b|ferienwoche|ausklang|balkan|mariachi', re.I)
# the Salzburger Bachgesellschaft's "J" series (J1, J2 …) are its family concerts
_JUNIOR_RE = re.compile(r'^J\d+\s')
_OPERA_RE = re.compile(r'\boper\b|musiktheater|opera|singspiel|dramma giocoso|così fan tutte', re.I)


def _venue(location):
    name = clean(location)
    if not name or name.lower() in ('tbd', 'tba', 'n.n.'):
        return None, 'Salzburg'
    if re.search(r'hof bei salzburg', name, re.I):
        return name, 'Hof bei Salzburg'
    return name, 'Salzburg'


def _type(category, title, credits, program, opera=False):
    c = category.lower()
    if opera or c in ('oper', 'musiktheater') or _OPERA_RE.search(title):
        return 'vocal-opera'
    if c == 'rezital':
        return 'recital'
    if c in ('kammerkonzert', 'klassik pur', 'after work', 'museumskonzert', 'sofa-konzert'):
        t = infer_type(title, credits, program)
        return t if t in ('recital', 'chamber', 'vocal-opera') else 'chamber'
    if 'orgel' in c:
        return 'recital'
    return infer_type(title, credits, program)


def _characters(artists):
    """How many artists are listed with a part in an opera ('Don Alfonso', 'Fiordiligi')."""
    return sum(1 for a in artists or [] if role_from_text(a.get('professionDe'), opera=True)[0] == 'character')


def _credits(artists, opera):
    out = []
    for a in sorted(artists or [], key=lambda a: a.get('sortOrder') or 0):
        name = a.get('nameDe') or a.get('nameEn')
        prof = a.get('professionDe') or a.get('professionEn')
        kind, role = role_from_text(name)
        if not clean(prof) and kind == 'role' and out and out[-1][0] == 'Performer':
            out[-1] = (role, out[-1][1])                  # 'Cécile Lartigau' + 'Ondes Martenot' as two entries
            continue
        for person in split_names(name):
            c = credit(prof, person, opera=opera)
            if c:
                out.append(c)
    return order_credits(out)


def _reading(credits, program):
    """A reading with a little music: a narrator first and at most one musician, no works."""
    if not credits or program:
        return False
    musicians = [c for c in credits if c[0] not in ('Narrator', 'Presenter')]
    return credits[0][0] in ('Narrator', 'Presenter') and len(musicians) <= 1


def fetch():
    data = get_json(DATA)['result']['data']
    tickets = {n.get('konzertId'): n.get('eventId') for n in (data.get('jettickets') or {}).get('nodes') or []}
    today = today_zurich()
    events, skipped = [], {}

    def skip(why):
        skipped[why] = skipped.get(why, 0) + 1

    for e in data.get('events') or []:
        title = clean(e.get('titleDe') or e.get('titleEn'))
        if not title or e.get('archived'):
            skip('archived')
            continue
        cat = clean((e.get('category') or {}).get('nameDe'))
        cat2 = clean((e.get('secondCategory') or {}).get('nameDe'))
        staged = cat.lower() in ('oper', 'musiktheater')
        if cat.lower() in _SKIP_CATEGORY or (cat2.lower() in _SKIP_CATEGORY and not (staged and cat2.lower() == 'trazom')):
            skip(f'category {cat if cat.lower() in _SKIP_CATEGORY else cat2}')
            continue
        if _SKIP_TITLE.search(title) or _SKIP_TITLE.search((e.get('slugDe') or '').replace('-', ' ')):
            skip('not a concert (title)')
            continue
        if cat.lower() == 'salzburger bachgesellschaft' and _JUNIOR_RE.match(title):
            skip('family series')
            continue
        opera = staged or bool(_OPERA_RE.search(title)) or _characters(e.get('artists')) >= 2
        credits = _credits(e.get('artists'), opera)
        program = program_from_html(e.get('infoDe') or '', full_names=FULL_NAMES)
        if credits and (all(r in ('Narrator', 'Presenter') for r, _ in credits) or _reading(credits, program)):
            skip('reading/talk')
            continue
        status_text = clean((e.get('statusText') or {}).get('textDe'))
        cancelled_all = looks_cancelled(title) or bool(re.search(r'\babgesagt\b|entfällt|cancel', status_text, re.I))
        external = strip_tracking(e.get('externalUrlDe') or e.get('externalUrlEn'))
        slug = e.get('slugDe') or e.get('slugEn')
        series = cat if cat and cat.lower() not in ('weitere veranstalter', 'konzert', 'kammerkonzert') else None
        if (e.get('category') or {}).get('isSubcategoryOf') and \
                clean(e['category']['isSubcategoryOf'].get('nameDe')).lower() == 'mozartwoche':
            series = 'Mozartwoche'
        kind = _type(cat, title, credits, program, opera)
        for clt in e.get('concertLocationTimes') or []:
            day, hour = clt.get('date'), clt.get('startTime')
            if not day or not hour or not re.match(r'\d{1,2}:\d{2}$', hour):
                skip('no time')
                continue
            try:
                start = to_zurich_iso(f'{day}T{hour}', assume=TZ)
            except ValueError:
                skip('bad date')
                continue
            delta = (date.fromisoformat(day[:10]) - today).days
            if delta < 0 or delta > WINDOW_DAYS:
                skip('outside window')
                continue
            end = None
            if clt.get('endTime') and re.match(r'\d{1,2}:\d{2}$', clt['endTime']):
                end = to_zurich_iso(f'{day}T{clt["endTime"]}', assume=TZ)
            venue, city = _venue((clt.get('location') or {}).get('nameDe'))
            shop = tickets.get(clt.get('id'))
            try:
                events.append(make_event(
                    KEY, clt.get('id') or f'{slug}-{day}-{hour}', title, start, end=end, city=city, venueName=venue,
                    type=kind, series=series, credits=credits, program=program,
                    ticketUrl=SHOP_URL.format(id=shop) if shop else external,
                    url=EVENT_URL.format(slug=slug) if slug else SITE,
                    status='cancelled' if cancelled_all or looks_cancelled(clt.get('concertNumber') or '') else 'scheduled'))
            except ValueError as err:
                log.warning('%s %s: skipped: %s', KEY, slug, err)
    if skipped:
        log.info('%s: skipped %s', KEY, ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    return events
