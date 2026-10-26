"""Concerts J.S. Bach de Lutry: the season of six Sunday concerts in the Temple de Lutry,
from the association's own site.

    https://concerts-bach.lutry.org/agenda-new/      one request: this and earlier seasons

The agenda page opens with the current season ("68ème Saison ... (2026-2027)"), the hall
and the common start time ("Au Temple de Lutry à 17 h"), then one block per concert:
the date ("Le 1er novembre 2026") followed by short lines naming the work and the
performers, the performers in bold ("avec l'<b>Ensemble vocal de Lausanne</b>, sous la
direction de <b>Pierre-Fabien Roubaty</b>"). Only these facts are taken: the block's
first line as the title, the bold names with their role, the works where a line names
them ("J.S. Bach – L'Offrande Musicale", "Requiem Allemand de J. Brahms").

robots.txt is empty (everything allowed). The site has no terms of use.
Older seasons further down the page are ignored.
"""
from __future__ import annotations

import re

from common import FetchError, clean, get, log, make_event, to_zurich_datetime, today_zurich
from ._westsouth import find_date, find_time, fold, group_role, infer_type, known_role, local_iso

KEY = 'concerts_bach_lutry'
NAME = 'Concerts J.S. Bach de Lutry'
SITE = 'https://concerts-bach.lutry.org/'
ATTRIBUTION = 'Source: Les Concerts J.S. Bach de Lutry (concerts-bach.lutry.org)'
KIND = 'venue'
MAX_REQUESTS = 4
TIME_LIMIT = 60

AGENDA = 'https://concerts-bach.lutry.org/agenda-new/'
TICKETS = 'https://monbillet.ch/?q=concerts+bach+lutry'     # the link of the site's own "Réservation et vente des billets" page
VENUE, CITY = 'Temple de Lutry', 'Lutry'

_WORK_RE = re.compile(r'(?i)passion|requiem|oratorio|messe|cantate|offrande|motets?|magnificat|vespr|stabat|concerti?\b|'
                      r'suites?\b|variations')
_NAME = r"[A-ZÀ-Ý][\w'’.-]+(?: (?:de |da |van |von |della )?[A-ZÀ-Ý][\w'’.-]+)+"


def season_blocks(html):
    """-> (default (hh, mm) or None, [list of <p> html per concert]) for the first (current) season."""
    page = html or ''
    head = re.search(r'Saison des Concerts J\.S\. Bach de Lutry\s*\(\d{4}-\d{4}\)', clean(page))
    start = page.find('Saison des Concerts J.S. Bach de Lutry (')
    if start < 0 or not head:
        return None, []
    end = page.find('<h1', start)
    section = page[start:end if end > 0 else len(page)]
    paras = re.findall(r'<p\b[^>]*>(.*?)</p>', section, re.S)
    when = None
    blocks = []
    for p in paras:
        text = clean(p)
        if not text:
            continue
        if when is None and re.search(r'(?i)\bà\s*\d{1,2}\s*h', text):
            when = find_time(text)
            continue
        if re.match(r'(?i)^le\s+\d', text) and find_date(text):
            blocks.append([p])
        elif blocks:
            blocks[-1].append(p)
    return when, blocks


def parse_block(paras):
    """One concert block -> dict(date, title, credits, program)."""
    date = find_date(clean(paras[0]))
    lines = [clean(p).strip(' ,') for p in paras[1:] if clean(p).strip(' ,')]
    text = ' '.join(lines)
    title = lines[0] if lines else ''
    if len(title) < 25 and len(lines) > 1 and re.match(r'(?i)^et\s', lines[1]):
        title = f'{title} {lines[1]}'
    credits, program = [], []
    for p in paras[1:]:
        for b in re.findall(r'<span style="[^"]*font-weight:\s*bold[^"]*"[^>]*>(.*?)</span>', p, re.S):
            name = re.sub(r'\s+et\s*$', '', clean(b)).strip(' ,.')
            if not name or len(name) > 70 or _WORK_RE.search(name) or find_date(name):
                continue
            after = clean(p.split(b, 1)[-1])[:40]
            m = re.match(r'^[,\s]*([a-zà-ÿ]+(?:iste|ant|ante)?)\b', after)
            role = known_role(m.group(1), name) if m else None
            if not role:
                before = fold(clean(p.split(b, 1)[0]))
                role = 'Conductor' if re.search(r'direction de\s*$', before) else (group_role(name) or 'Performer')
            if not any(n == name for _, n in credits):
                credits.append((role, name))
    for m in re.finditer(r'sous la direction de\s+(' + _NAME + ')', text):
        name = m.group(1).rstrip('.')
        if not any(n == name for _, n in credits):
            credits.append(('Conductor', name))
    credits = [(r, n) for r, n in credits if not (r == 'Performer' and any(n in m and n != m for _, m in credits))]
    for ln in lines:
        m = re.match(r'^(J\.\s?S\.\s?Bach|[A-Z]\.(?:\s?[A-Z]\.)?\s?[A-ZÀ-Ý]\w+)\s*[–,-]\s*(.+)$', ln)
        if m:
            program.append((m.group(1), m.group(2).strip()))
            continue
        m = re.match(r"^(.+?)\s+de\s+([A-Z]\.(?:\s?[A-Z]\.)?\s?[A-ZÀ-Ý]\w+)$", ln)
        if m and _WORK_RE.search(m.group(1)):
            program.append((m.group(2), m.group(1)))
    return {'date': date, 'title': title, 'credits': credits, 'program': program}


def fetch():
    today = today_zurich()
    when, blocks = season_blocks(get(AGENDA))      # FetchError propagates: build reuses yesterday's events
    if not blocks:
        raise FetchError(AGENDA, 'current season not found on the agenda page')
    if not when:
        raise FetchError(AGENDA, 'season start time not found')
    events = []
    for paras in blocks:
        info = parse_block(paras)
        if not info['date'] or not info['title']:
            continue
        start = local_iso(*info['date'], *when)
        if to_zurich_datetime(start).date() < today:
            continue
        try:
            events.append(make_event(
                KEY, start[:10], info['title'], start, city=CITY, venueName=VENUE,
                series='Concerts J.S. Bach de Lutry',
                type=infer_type(info['title'], info['credits'], program=info['program']),
                credits=info['credits'], program=info['program'], url=AGENDA, ticketUrl=TICKETS))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, start, err)
    return events
