"""Sinfonietta de Lausanne: the orchestra's subscription concerts, from its own site.

    https://www.sinfonietta.ch/saison/                 one request: the season with dates and times
    https://www.sinfonietta.ch/evenements/<slug>/      one request per upcoming concert (about 5)

The season page lists each concert as "Je 4 février 2027 - 19h" followed by its title
("Vitalité | 3ᵉ concert de saison") and link. The concert page adds the hall and town
("Salle Métropole, Lausanne"), the works (COMPOSER in capitals, then the work) and the
performers ("Name, role" lines and ensembles). Only these facts are taken.

robots.txt asks for a Crawl-delay of 10 s (honoured by common.get). No terms about reuse.
"""
from __future__ import annotations

import re
from urllib.parse import unquote

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, \
    today_zurich
from ._westsouth import caps_words, find_date, find_time, group_role, infer_type, is_not_a_concert, known_role, \
    local_iso

KEY = 'sinfonietta_lausanne'
NAME = 'Sinfonietta de Lausanne'
SITE = 'https://www.sinfonietta.ch/'
ATTRIBUTION = 'Source: Le Sinfonietta de Lausanne (sinfonietta.ch)'
KIND = 'orchestra'
MAX_REQUESTS = 10
TIME_LIMIT = 180

SEASON = 'https://www.sinfonietta.ch/saison/'
ORCHESTRA = 'Sinfonietta de Lausanne'


def _lines(html):
    page = re.sub(r'<(script|style)\b.*?</\1>', ' ', html or '', flags=re.S)
    return [clean(x) for x in re.split(r'<[^>]+>', page) if clean(x)]


def parse_season(html):
    """-> [{'url', 'title', 'date', 'time'}] from the season list:
    <li class="event-list__item"><a href="...">Je 4 février 2027 - 19h</a> Vitalité | 3ᵉ concert de saison</li>"""
    out = []
    for li in re.findall(r'<li class="event-list__item">(.*?)</li>', html or '', re.S):
        m = re.search(r'<a href="(https://www\.sinfonietta\.ch/evenements/[^"]+)"[^>]*>(.*?)</a>(.*)$', li, re.S)
        if not m:
            continue
        when = clean(m.group(2))
        d, t = find_date(when), find_time(re.sub(r'^.*?\d{4}', '', when))
        title = clean(m.group(3))
        if d and t and title and not any(o['url'] == m.group(1) for o in out):
            out.append({'url': m.group(1), 'title': title, 'date': d, 'time': t})
    return out


def parse_concert(html):
    """Concert page -> dict(venue, city, credits, program)."""
    lines = _lines(html)
    start = next((i for i, ln in enumerate(lines) if find_date(ln) and re.search(r'\d{1,2}h', ln)), None)
    info = {'venue': None, 'city': None, 'credits': [], 'program': []}
    if start is None:
        return info
    i = start + 1
    if i < len(lines) and ',' in lines[i] and not known_role(lines[i].rsplit(',', 1)[-1]):
        info['venue'], info['city'] = (x.strip() for x in lines[i].rsplit(',', 1))
        i += 1
    while i < len(lines):
        ln = lines[i]
        if re.match(r'(?i)^(en collaboration|le concert sera|billets|avec le soutien)', ln) or len(ln) > 120:
            break
        letters = [c for c in ln if c.isalpha()]
        if letters and all(c.isupper() for c in letters):
            nxt = lines[i + 1] if i + 1 < len(lines) else ''
            # COMPOSER then a short work title; the concert's own title in capitals is followed by prose
            if nxt and len(nxt) <= 100 and not nxt.endswith('.') and \
                    not all(c.isupper() for c in nxt if c.isalpha()) and not re.search(r',\s*\S+$', nxt):
                info['program'].append((caps_words(ln), lines[i + 1]))
                i += 2
                continue
            break                                    # the concert's title in capitals: the prose follows
        m = re.match(r'^(.+?),\s*([^,]{3,40})$', ln)
        if m and known_role(m.group(2)) is not None:
            role = known_role(m.group(2), m.group(1))
            if role:
                info['credits'].append((role, m.group(1)))
        elif group_role(ln):
            info['credits'].append((group_role(ln), ln))
        i += 1
    return info


def fetch():
    today = today_zurich()
    items = parse_season(get(SEASON))             # FetchError propagates: build reuses yesterday's events
    if not items:
        raise FetchError(SEASON, 'no concerts on the season page')
    events = []
    for it in items:
        start = local_iso(*it['date'], *it['time'])
        if to_zurich_datetime(start).date() < today or is_not_a_concert(it['title']):
            continue
        info = {'venue': None, 'city': None, 'credits': [], 'program': []}
        if requests_left() > 0:
            try:
                info = parse_concert(get(it['url']))
            except FetchError as err:
                log.warning('%s: no page for %s: %s', KEY, it['url'], err)
        credits = list(info['credits'])
        if not any(n == ORCHESTRA for _, n in credits):
            credits.append(('Orchestra', ORCHESTRA))
        slug = unquote(it['url']).rstrip('/').rsplit('/', 1)[-1]
        try:
            events.append(make_event(
                KEY, slug, it['title'], start, city=info['city'] or 'Lausanne', venueName=info['venue'],
                type=infer_type(it['title'], credits, program=info['program']) or 'orchestral',
                credits=credits, program=info['program'], url=it['url'], ticketUrl=it['url'],
                status='cancelled' if looks_cancelled(it['title']) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, slug, err)
    return events
