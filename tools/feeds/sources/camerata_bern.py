"""CAMERATA BERN: the chamber orchestra's subscription concerts in Bern (Zentrum Paul Klee, Casino,
Dampfzentrale) and its guest concerts elsewhere in Switzerland.

    https://www.cameratabern.ch/konzerte          "Nächste Konzerte": every upcoming date
    https://www.cameratabern.ch/konzerte/<slug>   one page per concert (programme)

The list gives the title and series ("Imagine Abokonzert"), the date ("Sa, 21. Nov 2026"), one or
more local start times, the place ("Bern, Zentrum Paul Klee") and the line-up ("Lily Higson-Spence /
Leitung und Violine"). The concert page adds the programme (composer + work); it is fetched once per
title. Directing from the instrument ("Leitung und Violine") is credited as the instrument.

Skipped: family concerts, the "12nach12" lunchtime rehearsal visits (Werkstatteinblick) and tours
abroad (Monfalcone, London ...).
"""
from __future__ import annotations

import html as htmllib
import re

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, today_zurich
from ._east import (NOT_A_CONCERT, find_date, find_time, fold, group_role, infer_type, is_group, local_iso, looks_foreign,
                    role_for)

KEY = 'camerata_bern'
NAME = 'CAMERATA BERN'
SITE = 'https://www.cameratabern.ch/'
ATTRIBUTION = 'Source: CAMERATA BERN (cameratabern.ch)'
KIND = 'orchestra'
MAX_REQUESTS = 25
TIME_LIMIT = 180

LISTING = 'https://www.cameratabern.ch/konzerte'
ORCHESTRA = 'CAMERATA BERN'
SKIP = re.compile(r'familienkonzert|werkstatteinblick|12nach12|schulkonzert|kinder')
FOREIGN_TOWNS = re.compile(r'^(monfalcone|london|amsterdam|antwerpen|bad kissingen|blaibach|bonn|brugge|budapest|bukarest|'
                           r'celle|cremona|edinburgh|espinho|essen|frankfurt|genova|gent|grenoble|hamburg|hannover|'
                           r'heidelberg|hindsgavl|hitzacker|kyoto|koln|neumarkt|novara|perugia|prag|rotterdam|sainokuni|'
                           r'samobor|schwetzingen|st\. peter im schwarzwald|staufen|timisoara|tokyo|vaduz|wien|paris|'
                           r'berlin|munchen|salzburg|luxemburg)\b')


def _role(label, name):
    f = fold(label)
    m = re.match(r'leitung(?:,)? und (.+)$', f) or re.match(r'leitung, (\w+)', f)
    if m:
        return role_for(m.group(1), name)                 # directing from the instrument
    return role_for(label, name) if label else (group_role(name) if is_group(name) else 'Performer')


def _entries(page):
    i = page.find('Nächste Konzerte')
    out = []
    for blk in re.split(r'(?=<div class="row entry entry-)', page[i if i >= 0 else 0:])[1:]:
        eid = re.search(r'entry-(\d+)', blk).group(1)
        head = re.search(r'<h3>(.*?)</h3>', blk, re.S)
        day = re.search(r'class="date">(.*?)</span>', blk, re.S)
        place = re.search(r'class="ort">(.*?)</span>', blk, re.S)
        url = re.search(r'href="(https://www\.cameratabern\.ch/konzerte/[^"]+)"', blk)
        if not (head and day and url):
            continue
        series = re.search(r'<b>(.*?)</b>', head.group(1), re.S)
        title = clean(re.sub(r'<b>.*?</b>', '', head.group(1), flags=re.S))
        artists = []
        for name, label in re.findall(r'class="artist d-block">\s*<b>(.*?)</b>(?:<br>)?(.*?)</span>', blk, re.S):
            name, label = clean(name), clean(label)
            if name and not fold(name).startswith('weiterer termin'):
                artists.append((label, name))
        ticket = re.search(r'href="([^"]+)"[^>]*class="btn btn-tickets', blk)
        out.append({'id': eid, 'title': title, 'series': clean(series.group(1)) if series else '',
                    'day': clean(day.group(1)), 'times': [clean(t) for t in re.findall(r'class="uhrzeit">(.*?)</span>', blk, re.S)],
                    'place': clean(place.group(1)) if place else '', 'url': htmllib.unescape(url.group(1)),
                    'artists': artists, 'ticket': htmllib.unescape(ticket.group(1)) if ticket else None})
    return out


def _program(url):
    page = get(url)
    m = re.search(r'<h2 id="programm">.*?</h2>(.*?)(?:<h2\b|<div class="section)', page, re.S)
    works = []
    for para in re.findall(r'<p[^>]*>(.*?)</p>', m.group(1) if m else '', re.S):
        composer = re.match(r'\s*<strong>(.*?)</strong>', para, re.S)
        lines = [clean(x) for x in re.split(r'<br\s*/?>', para)[1:]]
        lines = [x for x in lines if x and not re.fullmatch(r'\(?[*†]?[\d–\-\s]+\)?', x)]
        if composer and lines:
            works.append((clean(composer.group(1)), lines[0]))
    return works


def _place(text):
    if ',' in text:
        town, venue = (s.strip() for s in text.split(',', 1))
        if fold(town) not in fold(venue) and len(venue.split()) <= 2:
            venue = f'{venue} {town}'                       # 'Theater Casino' -> 'Theater Casino Zug'
        return venue, town
    words = text.split()
    return text or None, (words[-1] if len(words) > 1 else 'Bern')


def fetch():
    today = today_zurich()
    entries = _entries(get(LISTING))                        # FetchError propagates
    keep = []
    for e in entries:
        ymd = find_date(e['day'])
        if not ymd or SKIP.search(fold(f"{e['title']} {e['series']}")) or NOT_A_CONCERT.search(fold(e['title'])):
            continue
        venue, city = _place(e['place'])
        if FOREIGN_TOWNS.match(fold(city or '')) or looks_foreign(e['place']):
            continue
        for i, t in enumerate(e['times'] or ['']):
            hm = find_time(t)
            if not hm:
                continue
            start = local_iso(*ymd, *hm)
            if to_zurich_datetime(start).date() < today:
                continue
            keep.append(dict(e, start=start, venue=venue, city=city, n=i))
    keep.sort(key=lambda e: e['start'])

    programs = {}
    for e in keep:
        key = fold(e['title'])
        if key in programs or requests_left() <= 0:
            continue
        try:
            programs[key] = _program(e['url'])
        except FetchError as err:
            log.warning('%s: no programme for %s: %s', KEY, e['url'], err)
            programs[key] = []

    events = []
    for e in keep:
        credits = []
        for label, name in e['artists']:
            role = _role(label, name)
            if role:
                credits.append((role, name))
        chamber = 'kammermusik' in fold(e['series'])
        if not chamber and not any(fold(n) == fold(ORCHESTRA) for _, n in credits):
            credits.append(('Orchestra', ORCHESTRA))
        credits = [('Orchestra', ORCHESTRA) if fold(n) == fold(ORCHESTRA) else (r, n) for r, n in credits]
        kind = 'chamber' if chamber else (infer_type(e['title'], credits) or 'orchestral')
        sid = e['id'] + (f"-{e['n']}" if e['n'] else '')
        try:
            events.append(make_event(
                KEY, sid, e['title'], e['start'], city=e['city'], venueName=e['venue'], type=kind,
                series=e['series'] or None, credits=credits, program=programs.get(fold(e['title'])),
                ticketUrl=e['ticket'], url=e['url'],
                status='cancelled' if looks_cancelled(f"{e['title']} {e['series']}") else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, sid, err)
    return events
