"""Kammerorchester Basel: the orchestra's concerts in Switzerland.

    https://www.kammerorchesterbasel.ch/de/konzerte.html        one request: every concert
    https://www.kammerorchesterbasel.ch/de/konzerte/<slug>.html  one request per own concert

The concert list has one ``<li class="ep_teaser" data-date="2026-11-07T19:30:00+01:00"
data-location="basel|on_the_road">`` per concert, with the title, "City, Venue" and either
a page on the orchestra's site or the guest promoter's page. Concert pages add the
programme (``<strong>Composer</strong> (life dates)`` then works) and the performers
(``<span class="name">`` + ``<span class="task">, Rolle</span>``). Only those facts are
taken; the essays and biographies on the pages are never copied.

Skipped: public rehearsals ("Kostprobe", "Öffentliche Probe") and guest concerts abroad
(the town must be a known Swiss town; Vaduz, London, Salzburg … are dropped).

The site's terms ask for consent before its content is reproduced. Klang republishes
facts only (date, time, title, venue, performers, works, links back).
"""
from __future__ import annotations

import html as _html
import re
import urllib.parse

from common import (BudgetExceeded, FetchError, clean, get, guess_type, log, looks_cancelled, make_event,
                    requests_left, to_zurich_iso, today_zurich)

from ._consent import fold, group_role, has_life_dates, looks_like_person, role_en, strip_life_dates, swiss_town

KEY = 'kammerorchester_basel'
NAME = 'Kammerorchester Basel'
SITE = 'https://www.kammerorchesterbasel.ch/'
ATTRIBUTION = 'Source: Kammerorchester Basel (kammerorchesterbasel.ch). Facts only; details and tickets there.'
KIND = 'orchestra'
MAX_REQUESTS = 40
TIME_LIMIT = 300

BASE = 'https://www.kammerorchesterbasel.ch/'
LISTING = BASE + 'de/konzerte.html'
ORCHESTRA = 'Kammerorchester Basel'

_REHEARSAL_RE = re.compile(r'kostprobe|öffentliche probe|oeffentliche probe|offene probe|probenbesuch|workshop|'
                           r'schulkonzert|familienkonzert|kinderkonzert|klassenzimmer', re.I)
_VENUES = {'stadtcasino': 'Stadtcasino Basel', 'martinskirche': 'Martinskirche', 'don bosco': 'Don Bosco Basel'}


def parse_listing(page_html):
    out = []
    for m in re.finditer(r'<li class="ep_teaser[^"]*"\s+data-date="([^"]+)"\s+data-location="([^"]*)"[^>]*>(.*?)</li>',
                         page_html or '', re.S):
        start, where, block = m.group(1), m.group(2), m.group(3)
        title = re.search(r'<span class="title">(.*?)</span>', block, re.S)
        loc = re.search(r'<span class="location">(.*?)</span>', block, re.S)
        links = [(_html.unescape(h), clean(t), clean(x))
                 for h, t, x in re.findall(r'<a class="hyperlink_txt" href="([^"]+)"(?: title="([^"]*)")?[^>]*>(.*?)</a>',
                                           block, re.S)]
        page = next(((h, t) for h, t, x in links if not re.match(r'(?i)tickets?$', x)), (None, ''))
        ticket = next((h for h, t, x in links if re.match(r'(?i)tickets?$', x)), None)
        city, venue = None, None
        if loc:
            parts = [p.strip() for p in clean(loc.group(1)).split(',', 1)]
            city = parts[0]
            venue = parts[1] if len(parts) > 1 else None
        out.append({'start': start, 'where': where, 'title': clean(title.group(1)) if title else '',
                    'city': city, 'venue': venue, 'page': _abs(page[0]), 'page_title': page[1],
                    'ticket': _abs(ticket), 'flags': clean(block)})
    return out


def _abs(href):
    if not href:
        return None
    return urllib.parse.urljoin(BASE, href)


def _own_page(url):
    return bool(url) and url.startswith(BASE) and '/konzerte/' in url


def parse_detail(page_html):
    """-> (program [(composer, work)], credits [(role, name)])"""
    program, credits = [], []
    # the heading can carry the series ('Programm | Clariant-Abokonzert'), and the programme
    # can span several text blocks of the same article
    m = re.search(r'<h2>\s*Programm\b[^<]*</h2>(.*?)(?:<div class="mod_article|$)', page_html or '', re.S)
    section = m.group(1) if m else ''
    text = re.sub(r'\s+', ' ', section)
    # '<strong>Name </strong>(dates)<strong><br></strong>Work<strong><br><br>Name2 </strong>' -> keep <br> outside <strong>
    for _ in range(3):
        text = re.sub(r'(?i)<strong>((?:\s|<br\s*/?>)+)', r'\1<strong>', text)
        text = re.sub(r'(?i)((?:\s|<br\s*/?>)+)</strong>', r'</strong>\1', text)
        text = re.sub(r'(?i)<strong>\s*</strong>', '', text)
    text = re.sub(r'(?i)<br\s*/?>|</p>|</div>', '\n', text)
    composer = None
    for raw in text.split('\n'):
        line = raw.strip()
        plain = clean(line)
        if not plain:
            composer = None
            continue
        mm = re.match(r'(?i)^mit musik von (.+)$', plain)           # 'Mit Musik von <b>A</b> und <b>B.</b>'
        if mm:
            for group in re.findall(r'<strong>(.*?)</strong>', line):
                for c in re.split(r'\s*(?:,|\bund\b)\s*', clean(group)):
                    c = c.strip(' .,')
                    if looks_like_person(c, max_words=5) and len(c.split()) >= 2:
                        program.append((c, ''))
            composer = None
            continue
        sm = re.match(r'^\s*(?:<[^>]+>\s*)*<strong>(.*?)</strong>(.*)$', line)
        if sm:
            name, rest = clean(sm.group(1)).strip(' :'), clean(sm.group(2))
            # a composer heading has life dates, or is at least a first and last name on its own
            # ('Vorkonzert', 'Konzerteinführung …', 'Dauer: …' are not)
            if looks_like_person(name, max_words=6) and (has_life_dates(rest) or (
                    len(name.split()) >= 2 and not role_en(name) and
                    (not rest or re.fullmatch(r'[\(\[][^)\]]{0,30}[\)\]]', rest)))):
                composer = strip_life_dates(name)
            else:
                composer = None
            continue
        if len(plain) > 200 or re.search(r'[a-zäöüé]{2}[.!?]\s+[A-ZÄÖÜ][a-zäöüé]', plain) or \
                re.search(r'\b(uhr|foyer)\b', plain, re.I) or plain.endswith('.') and not \
                re.search(r'\b(op|Nr|No|KV|BWV|Hob|BB|Sz|D|WoO|Op)\.$', plain):
            composer = None
            continue
        if re.match(r'(?i)^(konzertante? auff[üu]hrung|konzertant|halbszenisch|in \w+ sprache|pause|dauer|'
                    r'mit [üu]bertiteln|uraufführung$|ua$)', plain):
            continue                     # notes about the performance, not works
        if composer:
            program.append((composer, plain))
    # performers given as plain text: 'Katya Polin (Violine)<br>Martin Zeller (Viola da Gamba)'
    mw = re.search(r'<h2>\s*Mitwirkende\s*</h2>(.*?)(?:<div class="mod_article|$)', page_html or '', re.S)
    if mw and '<span class="name">' not in mw.group(1):
        for line in re.split(r'(?i)<br\s*/?>|</p>|</li>', mw.group(1)):
            pm = re.match(r'^\s*(.+?)\s*\(([^()]{2,40})\)\s*$', clean(line))
            if not pm:
                continue
            name, r = pm.group(1), role_en(pm.group(2))
            if r and looks_like_person(name, max_words=6):
                credits.append((r, name))
    for name, task in re.findall(r'<span class="name">(.*?)</span>(?:\s*<span class="task">(.*?)</span>)?',
                                 page_html or '', re.S):
        name, task = clean(name), clean(task).lstrip(', ').strip()
        if not name:
            continue
        r = role_en(task) if task else None
        if not task:
            r = group_role(name) or 'Performer'
        elif r is None:
            r = task[:1].upper() + task[1:]
        elif r == '':
            continue
        credits.append((r, name))
    return program, credits


def _order(credits):
    rank = {'Conductor': 0, 'Orchestra': 2, 'Choir': 3, 'Ensemble': 2}
    return sorted(credits, key=lambda c: rank.get(c[0], 1))


def fetch():
    listing = parse_listing(get(LISTING))         # FetchError -> reuse yesterday's events
    if not listing:
        raise FetchError(LISTING, 'no concerts found (layout changed?)')
    today = today_zurich().isoformat()
    events, skipped, details = [], {}, {}
    for it in listing:
        if it['start'][:10] < today:
            continue
        if _REHEARSAL_RE.search(f"{it['title']} {it['page_title']}"):
            skipped['rehearsal/education'] = skipped.get('rehearsal/education', 0) + 1
            continue
        town = swiss_town(it['city'] or '')
        if not town:
            skipped['abroad'] = skipped.get('abroad', 0) + 1
            log.debug('%s: dropped %s (%s) as not in Switzerland', KEY, it['title'], it['city'])
            continue
        program, credits = [], []
        if _own_page(it['page']):
            if it['page'] not in details and requests_left() > 0:
                try:
                    details[it['page']] = parse_detail(get(it['page']))
                except BudgetExceeded:
                    details[it['page']] = ([], [])
                except FetchError as err:
                    log.warning('%s: concert page failed: %s', KEY, err)
                    details[it['page']] = ([], [])
            program, credits = details.get(it['page'], ([], []))
        title = it['title']
        if re.search(r'(?i)nachtklang', title):
            # chamber formats played by members of the orchestra: not the full orchestra
            if not credits:
                credits = [('Ensemble', f'Musiker:innen des {ORCHESTRA}')]
        elif not any(fold(n) == fold(ORCHESTRA) for _, n in credits):
            credits = list(credits) + [('Orchestra', ORCHESTRA)]
        if re.match(r'(?i)zu gast in\b', title):
            title = f"{ORCHESTRA} – {it['page_title']}" if it['page_title'] else f'{ORCHESTRA} – {title}'
        venue = it['venue'] or town
        venue = _VENUES.get(fold(venue), venue)
        if re.search(r'(?i)nachtklang', title):
            kind = 'chamber'                      # chamber formats with players of the orchestra
        else:
            kind = guess_type(' '.join([title] + [w for _, w in program]))
            if kind in (None, 'chamber'):
                kind = 'orchestral'
            if guess_type(it['page_title'] or '') == 'vocal-opera':
                kind = 'vocal-opera'              # 'Abokonzert mit Mozart-Oper', 'Bachs Johannes-Passion …'
        sid = (it['page'] or '').rstrip('/').rsplit('/', 1)[-1].replace('.html', '') if _own_page(it['page']) \
            else fold(town).replace(' ', '-')
        sid = f"{sid}-{it['start'][:16].replace('-', '').replace(':', '').replace('T', '')}"
        try:
            events.append(make_event(
                KEY, sid, title, to_zurich_iso(it['start']), city=town, venueName=venue, type=kind,
                credits=_order(credits), program=program, url=it['page'] or LISTING, ticketUrl=it['ticket'],
                status='cancelled' if looks_cancelled(it['flags']) else None))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, it['title'], err)
    log.info('%s: %d concerts listed, %d kept, %d concert pages read; skipped %s',
             KEY, len(listing), len(events), len(details), skipped)
    return events
