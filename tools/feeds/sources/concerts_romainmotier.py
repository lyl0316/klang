"""Les Concerts de Romainmôtier: the association's concerts in the Abbatiale de Romainmôtier
(spring, summer organ series and autumn/Advent concerts).

    https://www.concerts-romainmotier.ch/programme             one request: the year's concerts
    https://www.concerts-romainmotier.ch/programme/<slug>      one request per upcoming concert

The programme lists every concert with its title, the performers or subtitle above it and
the Swiss local date and time ("15 novembre 2026 16:00"; a few days have two times,
"28 juin 2026, 15:00 et 17:00"). The concert page adds the works (a definition list:
composer, then its works) and the performers ("Avec": "Name (role)"). Only these facts
are taken.

robots.txt lists AI crawlers (GPTBot, ClaudeBot, CCBot ...) with "Disallow: /" and has
no "*" group, so this calendar bot is allowed; it is not an AI crawler and only reads the
programme. No terms of use on the site.

Skipped: the organ discovery sessions for children ("Médiation culturelle").
"""
from __future__ import annotations

import re
from urllib.parse import urljoin

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, \
    today_zurich
from ._westsouth import find_date, group_role, infer_type, is_not_a_concert, known_role, local_iso, role_for

# Disabled: the site's robots.txt blocks AI crawlers by name (ClaudeBot, anthropic-ai …). Klang's bot is
# not one, but we respect the owners' clear wish not to be read automatically. Ask them before enabling.
ENABLED = False
KEY = 'concerts_romainmotier'
NAME = 'Les Concerts de Romainmôtier'
SITE = 'https://www.concerts-romainmotier.ch/'
ATTRIBUTION = 'Source: Les Concerts de Romainmôtier (concerts-romainmotier.ch)'
KIND = 'venue'
MAX_REQUESTS = 25
TIME_LIMIT = 150

BASE = 'https://www.concerts-romainmotier.ch'
LISTING = BASE + '/programme'
VENUE, CITY = 'Abbatiale de Romainmôtier', 'Romainmôtier'


def parse_listing(html):
    """-> [{'url', 'title', 'pretitle', 'starts'}]."""
    out = []
    for art in re.findall(r'<article\b.*?</article>', html or '', re.S):
        h3 = re.search(r'<h3[^>]*>(.*?)</h3>', art, re.S)
        when = re.search(r'<div class="text-muted">(.*?)</div>', art, re.S)
        link = re.search(r'href="(/programme/[^"]+)"', art)
        if not h3 or not when or not link:
            continue
        pre = re.search(r'<small[^>]*>(.*?)</small>', h3.group(1), re.S)
        title = clean(re.sub(r'<small[^>]*>.*?</small>', '', h3.group(1), flags=re.S))
        text = clean(when.group(1))
        d = find_date(text)
        times = re.findall(r'\b([01]?\d|2[0-3]):([0-5]\d)\b', text)
        if not d or not times:
            continue
        out.append({'url': urljoin(BASE, link.group(1)), 'title': title, 'pretitle': clean(pre.group(1)) if pre else '',
                    'starts': [local_iso(*d, int(h), int(m)) for h, m in times]})
    return out


def parse_details(html):
    """Concert page -> (credits, program, ticket url)."""
    page = html or ''
    program, credits = [], []
    perf = re.search(r'<dl class="performances-list">(.*?)</dl>', page, re.S)
    composer = None
    for tag, body in re.findall(r'<(dt|dd)>(.*?)</\1>', perf.group(1) if perf else '', re.S):
        t = clean(body)
        if tag == 'dt':
            # a <dt> followed by <dd>s is a composer; a lone <dt> is a piece (chant, anonymous)
            composer = t
            program.append((t, ''))
        elif composer is not None:
            if program and program[-1] == (composer, ''):
                program.pop()
            program.append((composer, t))
    program = [(re.sub(r'\s*\((?:m\.|n\.|\*|†)?\s*[\d\s\-–?]+\)\s*$', '', c), w) if w else ('', c) for c, w in program]
    cred = re.search(r'<dl class="credits">(.*?)</dl>', page, re.S)
    for dd in re.findall(r'<dd>(.*?)</dd>', cred.group(1) if cred else '', re.S):
        t = clean(dd)
        m = re.match(r'^(.+?)\s*\(([^()]+)\)$', t)
        if m:
            role = known_role(m.group(2), m.group(1))
            if role is None:
                role = role_for(m.group(2), m.group(1))
            if role:
                credits.append((role, m.group(1)))
        elif t:
            credits.append((group_role(t) or 'Performer', t))
    ticket = re.search(r'href="(https://monbillet\.ch/[^"]+)"', page)
    return credits, program, ticket.group(1) if ticket else None


def fetch():
    today = today_zurich()
    items = parse_listing(get(LISTING))            # FetchError propagates: build reuses yesterday's events
    if not items:
        raise FetchError(LISTING, 'no concerts on the programme page')
    events = []
    for it in items:
        starts = [s for s in it['starts'] if to_zurich_datetime(s).date() >= today]
        if not starts or is_not_a_concert(f"{it['title']} {it['pretitle']}"):
            continue
        credits, program, ticket = [], [], None
        if requests_left() > 0:
            try:
                credits, program, ticket = parse_details(get(it['url']))
            except FetchError as err:
                log.warning('%s: no details for %s: %s', KEY, it['url'], err)
        # the performers' name is the title or the line above it ("Ensemble Antiphona" / "A Chantar")
        for name in (it['title'].split(' – ')[0], it['pretitle'].split(' – ')[0]):
            words = [w for w in name.split() if w.lower() not in ('de', 'du', 'des', 'la', 'le', 'les', 'et', "d'")]
            g = group_role(name)
            if g and words and all(w[:1].isupper() for w in words) and not any(n == name for _, n in credits):
                credits.insert(0, (g, name))
        m = re.match(r"^(.+?)\s+[–-]\s+R[ée]cital d.orgue", it['title'])
        if m and not any(n == m.group(1) for _, n in credits):
            credits.insert(0, ('Organ', m.group(1)))
        title = it['title'] if not it['pretitle'] or len(it['pretitle']) > 60 else f"{it['title']} – {it['pretitle']}"
        slug = it['url'].rsplit('/', 1)[-1].replace('concerts-romainmotier-', '')
        for start in starts:
            try:
                events.append(make_event(
                    KEY, f'{slug}-{start[11:16].replace(":", "")}', title, start, city=CITY, venueName=VENUE,
                    type=infer_type(title, credits, program=program), credits=credits, program=program,
                    url=it['url'], ticketUrl=ticket, status='cancelled' if looks_cancelled(title) else 'scheduled'))
            except ValueError as err:
                log.warning('%s: skipped %s: %s', KEY, slug, err)
    return events
