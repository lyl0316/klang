"""argovia philharmonic (Aarau, Baden and touring in canton Aargau): concerts from the orchestra's
own event calendar (WordPress "The Events Calendar" REST API).

    https://argoviaphil.ch/wp-json/tribe/events/v1/events?start_date=YYYY-MM-DD&per_page=50

The API gives each date with its local start and end (``start_date`` in Europe/Zurich), the hall
and town, and the category (Sinfoniekonzerte, Kammerkonzerte, Löwenkonzerte, Sonderkonzerte,
Gastkonzerte, Familienkonzerte, Serie Surprise). The description is prose and is NOT used. The
concert page adds the line-up ("Mitwirkende": name + role) and the programme (composer + work);
it is fetched once per programme (same title), because robots.txt asks for 10 s between requests.

Skipped: family concerts, the yoga-with-music mornings, introductions and anything abroad.
"""
from __future__ import annotations

import html as htmllib
import re

from common import (FetchError, clean, get, get_json, log, looks_cancelled, make_event, requests_left, to_zurich_datetime,
                    to_zurich_iso, today_zurich)
from ._east import NOT_A_CONCERT, fold, infer_type, is_group, group_role, role_for

KEY = 'argovia_philharmonic'
NAME = 'argovia philharmonic'
SITE = 'https://argoviaphil.ch/'
ATTRIBUTION = 'Source: argovia philharmonic (argoviaphil.ch)'
KIND = 'orchestra'
MAX_REQUESTS = 40
TIME_LIMIT = 600          # Crawl-delay: 10

API = 'https://argoviaphil.ch/wp-json/tribe/events/v1/events?start_date={}&per_page=50&page={}'
ORCHESTRA = 'argovia philharmonic'
SKIP_CATS = {'familienkonzerte'}
SKIP_TEXT = re.compile(r'yoga|familienkonzert|kinderkonzert|probe\b|einfuhrung')
SERIES = {'sinfoniekonzerte': 'Sinfoniekonzert', 'kammerkonzerte': 'Kammerkonzert', 'lowenkonzerte': 'Löwenkonzert',
          'sonderkonzerte': 'Sonderkonzert', 'serie surprise': 'Serie Surprise'}
SWISS = {'', 'switzerland', 'schweiz', 'suisse', 'svizzera', 'ch'}
# the calendar's name for a hall -> the hall's usual name, so the host's own listing of the same concert merges
VENUE_ALIASES = {'stadtsaal winterthur': 'Stadthaus Winterthur'}   # Musikkollegium Winterthur's hall


def _section(page, heading):
    m = re.search(r'<h3[^>]*>\s*%s\s*</h3>(.*?)(?=<h3|<hr\b|<!-- Event content)' % heading, page, re.S)
    return m.group(1) if m else ''


def _details(url):
    page = get(url)
    credits = []
    for name, label in re.findall(r'<(?:b|strong)>(.*?)</(?:b|strong)>\s*(?:<span[^>]*>)?([^<]*)',
                                  _section(page, 'Mitwirkende'), re.S):
        name, label = clean(name), clean(label)
        if not name:
            continue
        if re.search(r'musiker|mitglieder', fold(name)):
            role = 'Ensemble'                               # "Musiker:innen des argovia philharmonic"
        else:
            role = role_for(label, name) if label else (group_role(name) if is_group(name) else 'Performer')
        if role:
            credits.append((role, name))
    program = []
    for para in re.findall(r'<p>(.*?)</p>', _section(page, 'Programm'), re.S):
        composer = re.search(r'<(?:b|strong)>(.*?)</(?:b|strong)>', para, re.S)
        lines = [clean(x) for x in re.split(r'<br\s*/?>', para)[1:]]
        if composer:
            name = clean(composer.group(1))
            for line in lines:
                if not line or re.fullmatch(r'\(?\*?[\d–\-\s]+\)?', line) or line.startswith(name):
                    continue                                # life dates, or the composer's name again
                program.append((name, line))
    ticket = re.search(r'href="([^"]+)"[^>]*>\s*KAUFE TICKET', page)
    return {'credits': credits, 'program': program, 'ticket': htmllib.unescape(ticket.group(1)) if ticket else None}


def fetch():
    today = today_zurich()
    raw, page = [], 1
    while True:
        data = get_json(API.format(today.isoformat(), page))   # FetchError propagates
        raw += data.get('events') or []
        if page >= int(data.get('total_pages') or 1) or page >= 5:
            break
        page += 1

    items = []
    for e in raw:
        title = clean(e.get('title'))
        cats = [fold(clean(c.get('name'))) for c in e.get('categories') or []]
        venue = e.get('venue') if isinstance(e.get('venue'), dict) else {}
        if not title or e.get('all_day') or set(cats) & SKIP_CATS:
            continue
        if SKIP_TEXT.search(fold(title)) or NOT_A_CONCERT.search(fold(title)):
            continue
        if fold(clean(venue.get('country'))) not in SWISS:
            continue
        try:
            start = to_zurich_iso(e['start_date'], assume='Europe/Zurich')
            end = to_zurich_iso(e['end_date'], assume='Europe/Zurich') if e.get('end_date') else None
            if end and (to_zurich_datetime(end) - to_zurich_datetime(start)).total_seconds() >= 3 * 3600:
                end = None                                  # 3 h is the calendar's placeholder length
        except (KeyError, ValueError):
            continue
        items.append({'id': e.get('id'), 'title': title, 'start': start, 'end': end, 'cats': cats,
                      'venue': VENUE_ALIASES.get(fold(clean(venue.get('venue'))), clean(venue.get('venue'))),
                      'city': clean(venue.get('city')), 'url': e.get('url')})
    items.sort(key=lambda it: it['start'])

    details = {}
    for it in items:
        key = fold(it['title'])
        if key in details or requests_left() <= 0 or not it['url']:
            continue
        try:
            details[key] = _details(it['url'])
        except FetchError as err:
            log.warning('%s: no details for %s: %s', KEY, it['url'], err)
            details[key] = None

    events = []
    for it in items:
        d = details.get(fold(it['title'])) or {}
        credits = d.get('credits') or []
        series = next((SERIES[c] for c in it['cats'] if c in SERIES), None)
        hint = 'chamber' if 'kammerkonzerte' in it['cats'] else ('orchestral' if 'sinfoniekonzerte' in it['cats'] else None)
        kind = infer_type(it['title'], credits, hint)
        if hint == 'chamber' and kind == 'orchestral' and not any(r == 'Conductor' for r, _ in credits):
            kind = 'chamber'
        if kind is None and any(n == ORCHESTRA for _, n in credits):
            kind = 'orchestral'
        try:
            events.append(make_event(
                KEY, it['id'], it['title'], it['start'], end=it['end'], city=it['city'], venueName=it['venue'],
                type=kind, series=series, credits=credits, program=d.get('program'),
                ticketUrl=d.get('ticket'), url=it['url'],
                status='cancelled' if looks_cancelled(it['title']) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, it['id'], err)
    return events
