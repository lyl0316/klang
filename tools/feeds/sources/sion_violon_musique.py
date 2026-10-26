"""Sion Violon Musique (Sion Festival, Concours Tibor Varga): concerts in Sion and Valais.

    https://sion-violon-musique.ch/tous-les-evenements-et-concerts/   one request: upcoming and past concerts
    https://sion-violon-musique.ch/events/<slug>/      one request per upcoming concert

The concerts page lists "Tous les concerts" (upcoming) and "Concerts passés" as
``<span class="obj-date">23.08.26 > 17h00</span>`` + ``<span class="obj-titre">``.
Each concert page adds the venue ("Lieu du concert": name, street, "1950 Sion"), the ticket
link, the artists (name + role) and the programme ("<b>S. Rachmaninov, </b>Work" lines;
movement lines are left out). Only those facts are taken, never the presentation texts.

The festival runs from late August to early September, so between seasons the
"Concerts" list is empty and this reader returns nothing; that is expected.

Skipped: family concerts, the festival line-up page, multi-day "itinérance" items without
a start time, and season summary entries ("CONCERTS 2025").

robots.txt: Crawl-delay 10 (honoured by common.get). The site's terms ask for consent before
its content is reproduced; Klang republishes facts only (date, time, title, venue,
performers, works, links back).
"""
from __future__ import annotations

import html as _html
import re
from datetime import datetime

from common import (BudgetExceeded, FetchError, ZURICH, clean, get, guess_type, log, looks_cancelled, make_event,
                    requests_left, to_zurich_iso, today_zurich)

from ._consent import group_role, looks_like_person, role_en

KEY = 'sion_violon_musique'
NAME = 'Sion Violon Musique'
SITE = 'https://sion-violon-musique.ch/'
ATTRIBUTION = 'Source: Sion Violon Musique / Sion Festival (sion-violon-musique.ch). Facts only; details there.'
KIND = 'festival'
MAX_REQUESTS = 40
TIME_LIMIT = 600

# 'Tous les évènements et concerts': the festival concerts plus the academy's public concerts
# (Concert des professeurs / des étudiants), which /evenements-2-2/ leaves out
LISTING = 'https://sion-violon-musique.ch/tous-les-evenements-et-concerts/'
CITY = 'Sion'

_SKIP_RE = re.compile(r'famille|familles|enfant|jeune public|line-?up|^concerts \d{4}|itin[ée]rance|atelier|'
                      r'masterclass|conf[ée]rence|pr[ée]lude|visite', re.I)


def parse_listing(page_html):
    """-> [{'url', 'date': date, 'time': (h, m)|None, 'title', 'upcoming': bool}]"""
    out = []
    parts = re.split(r'<h2>\s*((?:Tous les )?[Cc]oncerts(?: pass[ée]s)?)\s*</h2>', page_html or '')
    for i in range(1, len(parts) - 1, 2):
        upcoming = 'pass' not in parts[i]
        ul = re.search(r'<ul\s+class="objs-list">(.*?)</ul>', parts[i + 1], re.S)
        if not ul:
            continue
        for m in re.finditer(r'<li class="obj-solo">\s*<a href="([^"]+)">(.*?)</a>\s*</li>', ul.group(1), re.S):
            block = m.group(2)
            d = re.search(r'<span class="obj-date">(.*?)</span>', block, re.S)
            t = re.search(r'<span class="obj-titre">(.*?)</span>', block, re.S)
            if not d or not t:
                continue
            when = clean(_html.unescape(d.group(1)))
            dm = re.match(r'(\d{2})\.(\d{2})\.(\d{2,4})\s*\W*\s*(?:(\d{1,2})\s*[h:]\s*(\d{2}))?', when)
            if not dm:
                continue
            year = int(dm.group(3))
            year += 2000 if year < 100 else 0
            try:
                date = datetime(year, int(dm.group(2)), int(dm.group(1))).date()
            except ValueError:
                continue
            tm = (int(dm.group(4)), int(dm.group(5))) if dm.group(4) else None
            if re.search(r'\d{2}\.\d{2}\.\d{2}\s*\W*\s*\d{2}\.\d{2}\.\d{2}', when):
                tm = None                                   # a date range, no start time
            out.append({'url': _html.unescape(m.group(1)), 'date': date, 'time': tm,
                        'title': clean(t.group(1)), 'upcoming': upcoming})
    return out


def parse_detail(page_html):
    """-> {'time', 'venue', 'city', 'ticket', 'credits', 'program'}"""
    h = page_html or ''
    out = {'time': None, 'venue': None, 'city': None, 'ticket': None, 'credits': [], 'program': []}
    d = re.search(r'<h1 class="prof-titre">.*?<span class="obj-date">(.*?)</span>', h, re.S)
    if d:
        tm = re.search(r'(\d{1,2})\s*[h:]\s*(\d{2})\s*$', clean(_html.unescape(d.group(1))))
        if tm:
            out['time'] = (int(tm.group(1)), int(tm.group(2)))
    addr = re.search(r'<div class="map-adresse">(.*?)</div>', h, re.S)
    if addr:
        name = re.search(r'<span class="prof-exer">(.*?)</span>', addr.group(1), re.S)
        out['venue'] = clean(name.group(1)) if name else None
        city = re.search(r'\b\d{4}\s+([^<\n]+?)\s*<', addr.group(1))
        out['city'] = clean(city.group(1)) if city else None
    else:
        loc = re.search(r'<h2 class="event-location[^"]*">(.*?)</h2>', h, re.S)
        out['venue'] = clean(loc.group(1)).lstrip('> ').strip() if loc else None
    ticket = re.search(r'<div class="intro-resa">.*?<a href="([^"]+)"', h, re.S)
    out['ticket'] = _html.unescape(ticket.group(1)) if ticket else None
    art = re.search(r'<h2>\s*Artistes\s*</h2>(.*?)(?:id="concert-lieu"|<h2>)', h, re.S)
    if art:
        for name, role in re.findall(r'<p class="obj-titre">(.*?)</p>\s*<p class="obj-date[^"]*">(.*?)</p>',
                                     art.group(1), re.S):
            name = clean(name)
            role_txt = clean(re.split(r'(?i)<br\s*/?>', role)[0])
            if not name:
                continue
            r = role_en(role_txt) if role_txt else None
            if r is None:
                r = group_role(name) or (role_txt[:1].upper() + role_txt[1:] if role_txt else 'Performer')
            if r:
                out['credits'].append((r, name))
    prog = re.search(r'<h2>\s*(?:<strong>)?\s*Programme\s*(?:</strong>)?\s*</h2>(.*?)(?:</div>|<h2>)', h, re.S)
    if prog:
        for p in re.findall(r'<p>(.*?)</p>', prog.group(1), re.S):
            m = re.match(r'^\s*<(?:b|strong)>(.*?)</(?:b|strong)>(.*)$', p.strip(), re.S)
            if not m:
                continue                                    # movements and blank lines
            composer = clean(m.group(1)).strip(' ,:')
            work = clean(m.group(2)).strip(' ,:')
            if composer and looks_like_person(composer, max_words=6) and work and len(work) <= 200:
                out['program'].append((composer, work))
    return out


def fetch():
    items = parse_listing(get(LISTING))          # FetchError -> reuse yesterday's events
    today = today_zurich()
    todo = [i for i in items if i['date'] >= today and not _SKIP_RE.search(i['title'])]
    events, read = [], 0
    for it in todo:
        info = {'time': None, 'venue': None, 'city': None, 'ticket': None, 'credits': [], 'program': []}
        if requests_left() > 0:
            try:
                info = parse_detail(get(it['url']))
                read += 1
            except BudgetExceeded:
                pass
            except FetchError as err:
                log.warning('%s: concert page failed: %s', KEY, err)
        tm = info['time'] or it['time']
        if not tm:
            log.info('%s: %s on %s has no start time; skipped', KEY, it['title'], it['date'])
            continue
        start = datetime(it['date'].year, it['date'].month, it['date'].day, tm[0], tm[1], tzinfo=ZURICH)
        credits = info['credits']
        kind = guess_type(' '.join([it['title']] + [w for _, w in info['program']]))
        roles = {r for r, _ in credits}
        if not kind:
            kind = 'orchestral' if 'Orchestra' in roles else None
        slug = it['url'].rstrip('/').rsplit('/', 1)[-1]
        try:
            events.append(make_event(
                KEY, f'{slug}-{start:%Y%m%d%H%M}', it['title'], to_zurich_iso(start),
                city=info['city'] or CITY, venueName=info['venue'], type=kind, series='Sion Festival',
                credits=credits, program=info['program'], url=it['url'], ticketUrl=info['ticket'],
                status='cancelled' if looks_cancelled(it['title']) else None))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, it['url'], err)
    log.info('%s: %d listed (%d upcoming to read), %d concert pages read, %d events', KEY, len(items), len(todo),
             read, len(events))
    return events
