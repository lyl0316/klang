"""Sommets Musicaux de Gstaad: the winter festival's concerts (late January / early February)
in the churches of Saanen and Rougemont and the Gstaad chapel.

    https://www.sommets-musicaux.com/programme/                    one request: the whole festival
    https://www.sommets-musicaux.com/concert/<day>/<time-venue>/   one request per concert (about 17)

The programme page gives each day ("Vendredi 29 janvier 2027") and each concert's local
time and church ("19:30 – Église de Saanen"), the artists ("<b>Name</b>, role"), the
composers and the ticket link. The concert page adds the works ("<b>R. Schumann</b>
Concerto pour violoncelle ..."). Only these facts are taken.

robots.txt names a list of AI crawlers and SEO bots it blocks; the "*" group, which
applies to this reader, only disallows technical paths. No terms of use about reuse.

Skipped: the dinners with the artists and the children's illustrated concert (an
illustrator drawing live to piano music).
"""
from __future__ import annotations

import re

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, \
    today_zurich
from ._westsouth import find_date, fold, group_role, infer_type, local_iso, role_for

KEY = 'sommets_musicaux'
NAME = 'Sommets Musicaux de Gstaad'
SITE = 'https://www.sommets-musicaux.com/'
ATTRIBUTION = 'Source: Sommets Musicaux de Gstaad (sommets-musicaux.com)'
KIND = 'festival'
MAX_REQUESTS = 30
TIME_LIMIT = 240

LISTING = 'https://www.sommets-musicaux.com/programme/'
SERIES = 'Sommets Musicaux de Gstaad'

_TOWNS = (('saanen', 'Saanen'), ('gstaad', 'Gstaad'), ('rougemont', 'Rougemont'), ('schonried', 'Schönried'),
          ('lauenen', 'Lauenen'), ('gsteig', 'Gsteig'), ('zweisimmen', 'Zweisimmen'), ('chateau-d', "Château-d'Œx"))


def _city(venue):
    f = fold(venue)
    return next((c for frag, c in _TOWNS if frag in f), 'Gstaad')


def parse_listing(html):
    """-> [{'start', 'venue', 'credits', 'composers', 'url', 'ticket', 'text'}]."""
    out = []
    days = re.split(r'<div class="program-day', html or '')[1:]
    for day in days:
        h2 = re.search(r'<h2>(.*?)</h2>', day, re.S)
        d = find_date(clean(h2.group(1))) if h2 else None
        if not d:
            continue
        for item in re.split(r'<div class="event-item"', day)[1:]:
            h3 = re.search(r'<h3>(.*?)</h3>', item, re.S)
            head = clean(h3.group(1)) if h3 else ''
            m = re.match(r'^(\d{1,2})[:h.](\d{2})\s*[–—-]\s*(.+)$', head)
            if not m:
                continue                                         # e.g. "21:30 Dîner avec les artistes"
            credits = []
            for li in re.findall(r'<li>(.*?)</li>', item, re.S):
                name = re.search(r'<strong>(.*?)</strong>', li, re.S)
                if not name:
                    continue
                name = clean(name.group(1))
                label = clean(re.sub(r'<strong>.*?</strong>', '', li, flags=re.S)).strip(' ,')
                role = role_for(label, name) if label else (group_role(name) or 'Performer')
                credits.append((role, name, label))
            comps = re.search(r'<h4[^>]*>(.*?)</h4>', item, re.S)
            link = re.search(r'href="([^"]+)" class="event-link"', item)
            ticket = re.search(r'class="btn-cart">\s*<a href="([^"]+)"', item)
            out.append({
                'start': local_iso(*d, int(m.group(1)), int(m.group(2))), 'venue': m.group(3).strip(),
                'credits': credits, 'composers': clean(comps.group(1)) if comps else '',
                'url': link.group(1) if link else None, 'ticket': ticket.group(1) if ticket else None,
                'text': clean(item),
            })
    return out


def parse_works(html):
    """Concert page -> [(composer, title)] from the "event-detail" block. A paragraph without
    a composer continues the previous composer; a line starting in lower case continues
    the previous title."""
    block = re.search(r'<div class="event-detail">(.*?)</div>', html or '', re.S)
    works, composer = [], ''
    for p in re.findall(r'<p>(.*?)</p>', block.group(1) if block else '', re.S):
        comp = re.search(r'<strong>(.*?)</strong>', p, re.S)
        if comp and clean(comp.group(1)):
            composer = clean(comp.group(1))
        lines = [clean(x) for x in re.split(r'(?i)<br\s*/?>', re.sub(r'<strong>.*?</strong>', '', p, flags=re.S))]
        titles = []
        for line in lines:
            if not line:
                continue
            if titles and (line[:1].islower() or line[:1] in '(«'):
                titles[-1] = f'{titles[-1]} {line}'
            else:
                titles.append(line)
        for t in titles or ['']:
            if composer or t:
                works.append((composer, t))
    return works


def fetch():
    today = today_zurich()
    items = parse_listing(get(LISTING))             # FetchError propagates: build reuses yesterday's events
    if not items:
        raise FetchError(LISTING, 'no concerts on the programme page')
    events = []
    for it in items:
        if to_zurich_datetime(it['start']).date() < today:
            continue
        if re.search(r'dessinat|illustrat', fold(it['text'])):
            continue                                        # children's illustrated concert
        credits = [(r, n) for r, n, _ in it['credits'] if r]
        program = [(c.strip(), '') for c in it['composers'].split(',') if c.strip()]
        if it['url'] and requests_left() > 0:
            try:
                program = parse_works(get(it['url'])) or program
            except FetchError as err:
                log.warning('%s: no works for %s: %s', KEY, it['url'], err)
        names = [n for _, n in credits]
        title = ', '.join(names[:3]) + (' …' if len(names) > 3 else '') or SERIES
        sid = it['start'][:16].replace('-', '').replace(':', '').replace('T', '-') + '-' + fold(it['venue']).replace(' ', '-')
        try:
            events.append(make_event(
                KEY, sid, title, it['start'], city=_city(it['venue']), venueName=it['venue'], series=SERIES,
                type=infer_type(title, credits, program=program), credits=credits, program=program,
                url=it['url'] or LISTING, ticketUrl=it['ticket'],
                status='cancelled' if looks_cancelled(it['text']) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, sid, err)
    return events
