"""Stadttheater Olten: concerts and opera guest performances on the theatre's programme.

    https://www.stadttheater-olten.ch/programm/programmuebersicht/?page=N   12 cards per page

Each card has the genre tags ("Konzert", "Musiktheater", "Familienvorstellung", "Comedy" ...), the
title and page, and one row per performance with the date ("Dienstag, 10. November 2026") and the
local start and end ("19:30 – 21:15 Uhr"), plus the ticket link. Kept: "Konzert" and opera
("Oper", or "Musiktheater" that is not a musical or show). Skipped: family concerts (Bébékonzert),
musicals, comedy and shows. About four requests per run.
"""
from __future__ import annotations

import html as htmllib
import re
from urllib.parse import urljoin

from common import (FetchError, clean, get, guess_type, log, looks_cancelled, make_event, requests_left,
                    to_zurich_datetime, today_zurich)
from ._east import CREW_RE, NOT_A_CONCERT, PERSON, find_date, fold, group_role, infer_type, is_group, local_iso, role_for

KEY = 'stadttheater_olten'
NAME = 'Stadttheater Olten'
SITE = 'https://www.stadttheater-olten.ch/'
ATTRIBUTION = 'Source: Stadttheater Olten (stadttheater-olten.ch)'
KIND = 'venue'
MAX_REQUESTS = 25
TIME_LIMIT = 90

BASE = 'https://www.stadttheater-olten.ch'
LISTING = BASE + '/programm/programmuebersicht/?page={}'
NOT_OPERA = re.compile(r'musical|my fair lady|show|revue|operette light')


def _cards(page):
    for card in re.split(r'<div class="col-12 col-md-6 col-lg-4 blog-card-column">', page)[1:]:
        tags = [fold(clean(c)) for c in re.findall(r'class="blog-card-category"[^>]*>(.*?)</span>', card, re.S)]
        link = re.search(r'<h2 class="card-title"><a href="([^"]+)"[^>]*>(.*?)</a>', card, re.S)
        if not link:
            continue
        rows = [(clean(a), clean(b)) for a, b in re.findall(r'<tr>\s*<td>(.*?)</td>\s*<td>(.*?)</td>', card, re.S)]
        ticket = re.search(r'class="card-footer ticket">\s*<a href="([^"]+)"', card)
        yield {'tags': tags, 'url': urljoin(BASE, htmllib.unescape(link.group(1))), 'title': clean(link.group(2)),
               'rows': rows, 'ticket': htmllib.unescape(ticket.group(1)) if ticket else None,
               'flags': clean(' '.join(re.findall(r'blog-flag-([\w&#;-]+)', card)))}


def _strong_runs(block):
    """'<strong>A</strong><br>x<br>y<strong>B</strong>' -> [('A', ['x', 'y']), ('B', [])]."""
    block = re.sub(r'(?s)<ul\b.*?</ul>', ' ', block)                    # movements
    block = re.sub(r'</strong>\s*<strong>', '', block)                  # 'Piano und musikalische ' + 'Leitung'
    out = []
    for part in re.split(r'<strong>', block)[1:]:
        head, _, rest = part.partition('</strong>')
        lines = [clean(x) for x in re.split(r'<br\s*/?>|</p>|<p[^>]*>', rest)]
        out.append((clean(head), [x for x in lines if x and x != '***']))
    return out


def _is_label(text):
    f = fold(text)
    return bool(f) and len(f.split()) <= 5 and not is_group(text) and (
        f in ('mit', 'solisten', 'solistinnen', 'besetzung') or role_for(text) not in (None, 'Performer')
        or bool(CREW_RE.search(f)))


def _details(url):
    page = get(url)
    people = re.search(r'id="collapsePromoter"[^>]*>(.*?)</div>', page, re.S)
    works = re.search(r'id="collapseMore"[^>]*>(.*?)</div>', page, re.S)
    hall = re.search(r'<div class="label">Saal</div>\s*([^<]+)<', page)
    credits, program = [], []
    for head, lines in _strong_runs(people.group(1) if people else ''):
        if _is_label(head):                                 # '<b>Klavier</b> Patricia Ulrich'
            for line in lines:
                if is_group(line):
                    credits.append((group_role(line), line))
                elif PERSON.match(line):
                    role = 'Performer' if fold(head) == 'mit' else role_for(head, line)
                    if role:
                        credits.append((role, line))
        elif is_group(head):
            credits.append((group_role(head), head))
        elif head:                                          # '<b>Avi Avital</b> Mandoline'
            role = role_for(lines[0], head) if lines else 'Performer'
            if role:
                credits.append((role, head))
    for composer, lines in _strong_runs(works.group(1) if works else ''):
        composer = re.sub(r'\s*\(\s*[*†]?\s*\d{4}(?:\s*[-–]\s*\d{4})?\s*\)\s*$', '', composer)
        if fold(composer) in ('programm', '') or re.match(r'mit werken', fold(' '.join(lines))):
            continue
        program += [(composer, line) for line in lines]
    return {'credits': credits, 'program': program, 'hall': clean(hall.group(1)) if hall else ''}


def fetch():
    today = today_zurich()
    seen, cards, n = set(), [], 1
    while n <= 6:
        try:
            page = get(LISTING.format(n))
        except FetchError:
            if n == 1:
                raise
            break
        new = [c for c in _cards(page) if (c['url'], tuple(c['rows'])) not in seen]
        if not new:
            break                                           # past the last page the site repeats it
        for c in new:
            seen.add((c['url'], tuple(c['rows'])))
        cards += new
        if f'?page={n + 1}' not in page:
            break
        n += 1

    events = []
    for c in cards:
        tags, text = set(c['tags']), fold(c['title'])
        if 'familienvorstellung' in tags or NOT_A_CONCERT.search(text):
            continue
        if 'oper' in tags or ('musiktheater' in tags and not NOT_OPERA.search(text) and 'show' not in tags):
            kind = 'vocal-opera'
        elif 'konzert' in tags:
            kind = guess_type(c['title'])
        else:
            continue
        d = {}
        if requests_left() > 0:
            try:
                d = _details(c['url'])
            except FetchError as err:
                log.warning('%s: no details for %s: %s', KEY, c['url'], err)
        credits = d.get('credits') or []
        if kind is None:
            kind = infer_type(c['title'], credits)
        venue = f"Stadttheater Olten, {d['hall']}" if d.get('hall') and 'olten' not in fold(d['hall']) else 'Stadttheater Olten'
        for day, times in c['rows']:
            ymd = find_date(day)
            hm = re.findall(r'(\d{1,2})[:.](\d{2})', times)
            if not (ymd and hm):
                continue
            start = local_iso(*ymd, int(hm[0][0]), int(hm[0][1]))
            if to_zurich_datetime(start).date() < today:
                continue
            end = local_iso(*ymd, int(hm[1][0]), int(hm[1][1])) if len(hm) > 1 else None
            if end and end <= start:
                end = None
            slug = c['url'].rstrip('/').rsplit('/', 1)[-1]
            try:
                events.append(make_event(
                    KEY, f'{slug}-{start[:16]}', c['title'], start, end=end, city='Olten',
                    venueName=venue, type=kind, credits=credits, program=d.get('program'),
                    ticketUrl=c['ticket'], url=c['url'],
                    status='cancelled' if looks_cancelled(f"{c['title']} {c['flags']}") else 'scheduled'))
            except ValueError as err:
                log.warning('%s: skipped %s: %s', KEY, slug, err)
    return events
