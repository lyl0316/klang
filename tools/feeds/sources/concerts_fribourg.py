"""Société des Concerts de Fribourg: the subscription series at Equilibre, Fribourg.

    https://www.concertsfribourg.ch/fr/programme.html      one request: every concert of the season
    https://www.concertsfribourg.ch/fr/programme/sdc/...   one request per concert (about 11)

The programme page marks each concert up as a schema.org MusicEvent (microdata) with
``startDate`` as Swiss local time without an offset ("2026-11-27T19:30"), the hall and
the title. Each concert page adds the line-up ("Name, role" items) and the works (one
section per composer, the work titles below it). Only those facts are taken.

robots.txt: none (HTTP 404), so everything is allowed. No terms of use on the site.

Skipped: the "hors abonnement" film-and-music evening at the Cinéma Rex (cinema).
"""
from __future__ import annotations

import re
from urllib.parse import urljoin

from common import FetchError, clean, get, log, looks_cancelled, make_event, to_zurich_datetime, to_zurich_iso, \
    today_zurich
from ._westsouth import fold, group_role, infer_type, is_not_a_concert, role_for, smart_case

KEY = 'concerts_fribourg'
NAME = 'Société des Concerts de Fribourg'
SITE = 'https://www.concertsfribourg.ch/'
ATTRIBUTION = 'Source: Société des Concerts de Fribourg (concertsfribourg.ch)'
KIND = 'venue'
MAX_REQUESTS = 30
TIME_LIMIT = 180

BASE = 'https://www.concertsfribourg.ch'
LISTING = BASE + '/fr/programme.html'
TICKETS = BASE + '/fr/abonnements-et-billets.html'

_ITEM_RE = re.compile(r'<a href="(/fr/programme/sdc/Element/concert/c/[^"]+)"\s+class="concert"(.*?)</a>', re.S)
_SKIP_VENUE_RE = re.compile(r'cin[ée]ma', re.I)


def _venue_city(location):
    """'Salle Equilibre' -> ('Salle Equilibre', 'Fribourg'); a place in another town keeps it."""
    loc = clean(location)
    m = re.match(r'^(.*?),\s*([A-ZÀ-Ý][\w\'’ -]+)$', loc)
    if m and fold(m.group(2)) not in ('fribourg', 'freiburg'):
        return m.group(1).strip(), m.group(2).strip()
    return loc or None, 'Fribourg'


def parse_listing(html):
    """-> [{'url', 'start', 'venue', 'title', 'series'}] for every concert on the programme page."""
    out = []
    for href, body in _ITEM_RE.findall(html or ''):
        start = re.search(r'itemprop="startDate" content="([^"]+)"', body)
        loc = re.search(r'itemprop="location">(.*?)</div>', body, re.S)
        name = re.search(r'itemprop="name"[^>]*>(.*?)</div>', body, re.S)
        head = re.search(r'<h2>(.*?)</h2>', body, re.S)
        if not start or not name:
            continue
        out.append({'url': urljoin(BASE, href), 'start': start.group(1).strip(), 'venue': clean(loc.group(1)) if loc else '',
                    'title': clean(name.group(1)), 'series': clean(head.group(1)) if head else ''})
    return out


def _person(text):
    """'Claire BOOTH' -> 'Claire Booth' (surnames in capitals as printed in the line-up)."""
    words = []
    for w in clean(text).split():
        letters = [c for c in w if c.isalpha()]
        words.append(smart_case(w) if len(letters) > 1 and all(c.isupper() for c in letters) else w)
    return ' '.join(words)


def parse_details(html):
    """Concert page -> (credits [(role, name)], program [(composer, title)], cancelled)."""
    credits, program = [], []
    roles = re.search(r'<ul class="roles">(.*?)</ul>', html or '', re.S)
    for li in re.findall(r'<li>(.*?)</li>', roles.group(1) if roles else '', re.S):
        name = re.search(r'<a\b[^>]*>(.*?)</a>', li, re.S)
        label = re.search(r'<span>(.*?)</span>', li, re.S)
        name = clean(name.group(1)) if name else ''
        label = clean(label.group(1)) if label else ''
        if not name:
            continue
        role = role_for(label, name) if label else (group_role(name) or 'Performer')
        if role:
            credits.append((role, name))
    # extra soloists are listed as "Name, rôle" items in the concert text: take only those items
    desc = re.search(r'<div class="description rte"[^>]*>(.*?)</div>', html or '', re.S)
    items = re.findall(r'<li>(.*?)</li>', desc.group(1) if desc else '', re.S)
    # ... or as "<p><strong>Name</strong>, role</p>" paragraphs ("Frank Dupree, piano")
    items += re.findall(r'<p\b[^>]*>\s*(<strong>[^<]{3,60}</strong>\s*,[^<]{3,40})</p>', desc.group(1) if desc else '')
    for li in items:
        m = re.match(r'^([^,]{3,60}),\s*([^,]{3,40})$', clean(li))
        if m:
            role = role_for(m.group(2))
            if role and role != 'Performer' and not re.search(r'\d', m.group(1)):
                credits.append((role, _person(m.group(1))))
    body_all = (html or '').split('<div class="navigation"', 1)[0]
    for sec in body_all.split('<div class="section">')[1:]:
        comp = re.search(r'<div class="title">(.*?)</div>', sec, re.S)
        body = sec.split('section-description', 1)[-1]
        composer = re.sub(r'\s*\([^)]*\)\s*$', '', clean(comp.group(1))) if comp else ''
        works = []
        for p in re.findall(r'<p\b[^>]*>(.*?)</p>', body, re.S):
            t = clean(p)
            if not t or re.match(r'^([IVX]+|\d+)\s*[.)]\s', t):
                continue
            if re.match(r'(?i)^(entracte|pause|dur[ée]e|arrangement|\*)', t):
                break
            # the first paragraph is the work; later ones only when they are works too (op., n°, BWV ...)
            if not works or re.search(r'(?i)\b(op\.|n°|nr\.|bwv|kv|hob|wq|rv)\s*\S', t):
                works.append(t)
        if composer and works:
            program.extend((composer, w) for w in works[:3])
        elif composer:
            program.append((composer, ''))
    name = re.search(r'<h2 itemprop="name"[^>]*>(.*?)</h2>', html or '', re.S)
    cancelled = looks_cancelled(clean(name.group(1))) if name else False
    return credits, program, cancelled


def fetch():
    today = today_zurich()
    items = parse_listing(get(LISTING))           # FetchError propagates: build reuses yesterday's events
    if not items:
        raise FetchError(LISTING, 'no concerts found on the programme page')
    events = []
    for it in items:
        if _SKIP_VENUE_RE.search(it['venue']) or is_not_a_concert(it['title']):
            continue
        try:
            start = to_zurich_iso(it['start'])
        except ValueError as err:
            log.warning('%s: bad date %r: %s', KEY, it['start'], err)
            continue
        if to_zurich_datetime(start).date() < today:
            continue
        credits, program, cancelled = [], [], looks_cancelled(it['title'])
        try:
            credits, program, page_cancelled = parse_details(get(it['url']))
            cancelled = cancelled or page_cancelled
        except FetchError as err:
            log.warning('%s: no details for %s: %s', KEY, it['url'], err)
        venue, city = _venue_city(it['venue'])
        sid = re.sub(r'\.html$', '', it['url'].rsplit('/', 1)[-1])
        try:
            events.append(make_event(
                KEY, f"{start[:10]}-{sid}", it['title'], start, city=city, venueName=venue,
                type=infer_type(it['title'], credits), series='Société des Concerts de Fribourg',
                credits=credits, program=program, url=it['url'], ticketUrl=TICKETS,
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, it['url'], err)
    return events
