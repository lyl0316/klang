"""Konzerthaus Berlin (Gendarmenmarkt): the house's own programme, incl. guest concerts.

    https://www.konzerthaus.de/de/programm                       first weeks (full page)
    https://www.konzerthaus.de/de/programm/DD-MM-YYYY?ajax=1&…   the following chunks
    https://www.konzerthaus.de/de/programm/<slug>/<id>           one page per event

The programme page lists about a month; its "more" link (``infinite-more-link``) gives the
next chunk, read in turn until the window ends (about 15 requests). Each entry has the date
and time (``<time datetime="2026-11-24 19:00">``, Berlin local time), the hall (Großer Saal,
Kleiner Saal, Werner-Otto-Saal, Musikclub), the title, a label for the house's own events
("Eigenveranstaltungen") and, for those, the performers with their instruments and the
programme (composer / work) under "weitere Infos". One event id can have several dates; a
performance is id + date + time.

Guest concerts are listed without performers or works. Those that look classical (orchestra,
choir, quartet, recital … in the title) are read on their event page (cast with instruments,
composers and works), one request each, incrementally: a concert the previous feed already
has with its cast or works (same id, start and title) keeps them, and only concerts in the next
week and a fixed share of the others (about weekly) are read again. A guest event that does not
look classical is skipped; so is any event whose page lists neither works nor a classical
performer.

Checked against the website on 29 Oct 2026 (times on the page equal the datetime attribute).

Skipped: guided tours (Führung, Rundgang), family and children's formats (KlangKüken,
FamilienKonzert, Ringel Rangel Röschen, beschenkt), talks (NEXTDOOR TALK), open days, galas
of other organisers, jazz/pop/swing/world/electronic evenings, readings.
"""
from __future__ import annotations

import html as _html
import re
from datetime import date

from common import (BudgetExceeded, FetchError, clean, event_id, get, guess_type, infer_type, jsonld_events, log,
                    looks_cancelled, make_event, previous_event, refresh_due, requests_left, today_zurich)

from ._berlin import berlin_iso, credit, is_interval, is_pop, skip_title, venue_name

KEY = 'konzerthaus_berlin'
NAME = 'Konzerthaus Berlin'
SITE = 'https://www.konzerthaus.de/'
ATTRIBUTION = 'Source: Konzerthaus Berlin (konzerthaus.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 120
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 7

BASE = 'https://www.konzerthaus.de'
FIRST = BASE + '/de/programm'
MAX_CHUNKS = 30
WINDOW_DAYS = 450

_SKIP_RE = re.compile(r'klangk[üu]ken|ringel rangel|m[äa]rchen|beschenkt|nextdoor|rundgang|tag der offenen|'
                      r'kinderbetreuung|rasselbande|opus klassik gala|benefiz|preisverleihung|tanzperformance|'
                      r'weihnachtsgeschichten|lesung|liest\b|hörspiel|kabarett|alias\b|sub_bar|orientecho|'
                      r'i̇ç i̇çe|iç içe|unterwegs|puppenspiel|puppentheater|aşina|asina\b', re.I)
# words that mark a non-classical evening, unless the entry lists works by composers
_SOFT_SKIP_RE = re.compile(r'gala\b|songs\b|swing|beats\b|elektronisch|improvisiert|lateinamerika|vogue|\bdj\b|'
                           r'\brap\b|orchestra\b.*urban|urban', re.I)
# a guest event is read only when its title/subtitle look classical
_CLASSICAL_RE = re.compile(r'orchest|sinfoni|symphon|philharmon|kammerorchester|quartett|quartet|trio\b|quintett|'
                           r'chor\b|chöre|choir|kantorei|sängerknaben|oratorium|kantate|kantaten|messe\b|requiem|'
                           r'passion|magnificat|klavierabend|klavierrezital|rezital|recital|liederabend|kammermusik|'
                           r'sonaten|sonate|bach|mozart|beethoven|brahms|schubert|händel|haydn|vivaldi|'
                           r'tschaikowsk|mahler|bruckner|klassik|barock|organ|orgel|cembalo|violin|violoncello|'
                           r'ensemble|hochschule|musikhochschule|universität der künste|sinfonietta|camerata|'
                           r'akademie|konzertchor|singakademie|kammerchor|bläser|brass|streicher|weihnachtsoratorium|'
                           r'neujahrskonzert|festkonzert|preisträger|wettbewerb', re.I)
_ROOMS_RE = re.compile(r'^(gro(ß|ss)er saal|kleiner saal|werner-otto-saal|musikclub|konzerthaus berlin)$', re.I)


def _abs(href):
    href = _html.unescape(href or '').strip()
    if href.startswith('/'):
        return BASE + href
    return href if href.startswith('http') else None


def _performers(h4):
    """'<h4 class="info">Name<span class="info-zusatz">Dirigent</span><br>…' -> [(role text, name)]."""
    out = []
    for line in re.split(r'<br\s*/?>', h4 or ''):
        role = re.search(r'<span class="info-zusatz">(.*?)</span>', line, re.S)
        name = clean(re.sub(r'<span class="info-zusatz">.*?</span>', '', line, flags=re.S))
        if name:
            out.append((clean(role.group(1)) if role else '', name))
    return out


def _works(p):
    """'<strong>Composer</strong><br>Work<br>Work<br><strong>Pause</strong>…' -> [(composer, work)]."""
    out, composer = [], ''
    for line in re.split(r'<br\s*/?>', p or ''):
        strong = re.search(r'<strong>(.*?)</strong>', line, re.S)
        if strong:
            composer = clean(strong.group(1))
            rest = clean(re.sub(r'<strong>.*?</strong>', '', line, flags=re.S))
            if is_interval(composer):
                composer = ''
                continue
            if rest:
                out.append((composer, rest))
            continue
        work = clean(line)
        if not work or is_interval(work):
            continue
        if composer:
            out.append((composer, work))
    # 'Werke von A, B und C' names composers only
    split = []
    for c, w in out:
        m = re.match(r'(?i)^(?:werke|musik|lieder) von (.+)$', c)
        if m and not w:
            split += [(x.strip(), '') for x in re.split(r'\s*,\s*|\s+und\s+|\s*&\s*', re.sub(r'(?i)\s+(?:und|u\.)\s*a(?:nderen|\.)?$', '', m.group(1))) if x.strip()]
        else:
            split.append((c, w))
    out = split
    # a composer with no work listed still counts
    named = {c for c, _ in out}
    for line in re.findall(r'<strong>(.*?)</strong>', p or '', re.S):
        c = clean(line)
        if re.match(r'(?i)^(?:werke|musik|lieder) von ', c):
            continue
        if c and not is_interval(c) and c not in named:
            out.append((c, ''))
            named.add(c)
    return out


def parse_listing(page_html):
    """-> (entries, next chunk URL or None)."""
    out = []
    for chunk in re.split(r'<li id="\d{4}-\d{2}-\d{2}-\d{4}"', page_html or '')[1:]:
        chunk = chunk.split('<!-- EVENT-ITEM -->')[0]
        when = re.search(r'<time datetime="(\d{4}-\d{2}-\d{2}) (\d{1,2}):(\d{2})"', chunk)
        link = re.search(r'class="event-title">\s*<a href="([^"]+)">(.*?)</a>', chunk, re.S)
        if not (when and link):
            continue
        href = _html.unescape(link.group(1))
        eid = re.search(r'/(\d+)/?$', href)
        room = re.search(r'class="room">(.*?)</span>', chunk, re.S)
        sub = re.search(r'</h2>\s*<p><i>(.*?)</i></p>', chunk, re.S)
        h4 = re.search(r'<h4 class="info">(.*?)</h4>', chunk, re.S)
        works = re.search(r'</h4>\s*<p>(.*?)</p>', chunk, re.S)
        ticket = re.search(r'class="ticketing">.*?<a\s+href="([^"]+)"', chunk, re.S)
        promoter = re.findall(r'other-promoter-item-dropdown">(.*?)</span>', chunk)
        out.append({
            'eid': eid.group(1) if eid else href.strip('/').rsplit('/', 1)[-1],
            'date': when.group(1), 'hh': int(when.group(2)), 'mm': int(when.group(3)),
            'title': clean(link.group(2)), 'url': _abs(href),
            'room': clean(room.group(1)) if room else '',
            'sub': clean(sub.group(1)) if sub else '',
            'performers': _performers(h4.group(1)) if h4 else [],
            'works': _works(works.group(1)) if works else [],
            'ticket': _abs(ticket.group(1)) if ticket else None,
            'own': any('eigenveranstaltung' in clean(x).lower() for x in promoter),
            'status_text': clean(re.search(r'class="ticketing">(.*?)</div>', chunk, re.S).group(1))
            if re.search(r'class="ticketing">(.*?)</div>', chunk, re.S) else '',
        })
    nxt = re.search(r'<a href="([^"]+)" class="infinite-more-link"', page_html or '')
    return out, (_abs(nxt.group(1)) if nxt else None)


def parse_detail(page_html):
    """-> {'performers': [(role text, name)], 'works': [(composer, work)], 'room': str}."""
    h = page_html or ''
    out = {'performers': [], 'works': [], 'room': ''}
    box = re.search(r'<div class="artists_and_works">(.*?)<div class="clearfix">', h, re.S)
    if box:
        for m in re.finditer(r'<span class="cast-member">(.*?)</span>\s*(?=<span class="cast-member">|</div>)',
                             box.group(1) + '</div>', re.S):
            inner = m.group(1)
            role = re.search(r'<span class="instrument">(.*?)$', inner, re.S)
            name = clean(re.sub(r'<span class="instrument">.*$', '', inner, flags=re.S))
            if name:
                out['performers'].append((clean(role.group(1)) if role else '', name))
        composer = ''
        for kind, text in re.findall(r'<span class="(composer|worktitle)">(.*?)</span>', box.group(1), re.S):
            if kind == 'composer':
                composer = clean(text)
                if is_interval(composer):
                    composer = ''
            else:
                work = clean(text)
                if work and not is_interval(work):
                    out['works'].append((composer, work))
        named = {c for c, _ in out['works']}
        for c in re.findall(r'<span class="composer">(.*?)</span>', box.group(1), re.S):
            c = clean(c)
            if c and not is_interval(c) and c not in named:
                out['works'].append((c, ''))
                named.add(c)
    if not out['performers']:
        for ev in jsonld_events(h):
            for p in ev.get('performer') or []:
                if isinstance(p, dict) and clean(p.get('name')):
                    out['performers'].append(('', clean(p.get('name'))))
            break
    room = re.search(r'<span class="room">(?:<a [^>]*>)?(.*?)(?:</a>)?</span>', h, re.S)
    out['room'] = clean(room.group(1)) if room else ''
    return out


def _venue(room):
    r = clean(room)
    m = re.match(r'^(.+?)\s+[–-]\s+\1$', r)
    if m:
        r = m.group(1)                                   # 'Französischer Dom – Französischer Dom'
    if not r or re.fullmatch(r'(?i)konzerthaus berlin', r):
        return 'Konzerthaus Berlin'
    if _ROOMS_RE.match(r):
        return venue_name(f'Konzerthaus Berlin, {r}')
    return r


def _credits(pairs):
    out = []
    for role, name in pairs:
        c = credit(role, name)
        if c:
            out.append(c)
    return out


def _type(e, credits, works):
    text = f"{e['title']} {e['sub']}"
    roles = {r for r, _ in credits}
    if re.search(r'liederabend|klavierabend|rezital|recital', text, re.I):
        return 'recital'
    if re.search(r'kammermusik|quartett|quartet|trio\b|quintett|kammermusikmatinee', text, re.I) and 'Orchestra' not in roles:
        return 'chamber'
    if re.search(r'oratorium|kantate|kantaten|messe\b|requiem|passion|magnificat|\bchor\b|chöre|sängerknaben', text, re.I) \
            or 'Choir' in roles:
        return 'vocal-opera'
    if 'Orchestra' in roles or re.search(r'orchester|orchestra|sinfonie|symphon|philharmon', text, re.I):
        return 'orchestral'
    g = guess_type(text)
    return g or infer_type(e['title'], credits, works, e['sub'])


def _read_listing():
    entries, url, pages = {}, FIRST, 0
    last = today_zurich().toordinal() + WINDOW_DAYS
    seen = set()
    while url and pages < MAX_CHUNKS and url not in seen:
        seen.add(url)
        if requests_left() <= 10:
            log.warning('%s: listing stopped at %s (request cap)', KEY, url)
            break
        try:
            page = get(url)
        except BudgetExceeded as err:
            log.warning('%s: stopped: %s', KEY, err.reason)
            break
        except FetchError as err:
            if pages == 0:
                raise
            log.warning('%s: listing chunk failed: %s', KEY, err)
            break
        pages += 1
        items, url = parse_listing(page)
        for e in items:
            entries.setdefault((e['eid'], e['date'], e['hh'], e['mm']), e)
        if items and date.fromisoformat(items[-1]['date']).toordinal() > last:
            break
        if not items:
            break
    log.info('%s: %d listing page(s), %d entries', KEY, pages, len(entries))
    return list(entries.values())


def fetch():
    entries = _read_listing()
    skipped, cands = {}, []

    def skip(why, e):
        skipped[why] = skipped.get(why, 0) + 1
        log.debug('%s: skipped (%s): %s %s', KEY, why, e['date'], e['title'])

    for e in entries:
        text = f"{e['title']} {e['sub']}"
        if (skip_title(text) and not re.search(r'(?i)gesprächskonzert', text)) or _SKIP_RE.search(text):
            skip('tour / family / talk / not a concert', e)
            continue
        if (is_pop(text) or _SOFT_SKIP_RE.search(text)) and not e['works']:
            skip('pop / jazz / world / gala', e)
            continue
        if re.match(r'(?i)musikclub', e['room']) and not e['works']:
            skip('Musikclub (children / club format) without works', e)
            continue
        if not e['own'] and not e['works'] and not _CLASSICAL_RE.search(text):
            skip('guest event, not classical', e)
            continue
        e['start'] = berlin_iso(f"{e['date']}T{e['hh']:02d}:{e['mm']:02d}")
        e['sid'] = f"{e['eid']}-{e['date'].replace('-', '')}{e['hh']:02d}{e['mm']:02d}"
        e['detail'] = None
        cands.append(e)

    # event pages for entries listed without works or performers (guest concerts), incrementally
    need = []
    for e in cands:
        if e['works'] or e['performers']:
            continue
        prev = previous_event(event_id(KEY, e['sid']), e['start'], title=e['title'])
        if prev and (prev.get('credits') or prev.get('program')) and \
                not refresh_due(e['sid'], e['start'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            e['detail'] = {'performers': [], 'works': [], 'room': '', 'reused': prev}
            continue
        need.append(e)
    pages = {}
    for e in sorted(need, key=lambda x: x['start']):
        url = e['url']
        if url in pages:
            e['detail'] = pages[url]
            continue
        if requests_left() <= 0:
            break
        try:
            pages[url] = e['detail'] = parse_detail(get(url))
        except BudgetExceeded as err:
            log.warning('%s: stopped reading event pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: event page failed: %s', KEY, e['eid'], err)

    events = []
    for e in cands:
        performers, works = e['performers'], e['works']
        d = e['detail'] or {}
        reused = d.get('reused')
        if reused:
            credits = [(c.get('role'), c.get('name')) for c in reused.get('credits') or []]
            works = [(p.get('composer') or '', p.get('title') or '') for p in reused.get('program') or []]
        else:
            if d:
                performers = performers or d.get('performers') or []
                works = works or d.get('works') or []
            credits = _credits(performers)
            if d and not works and not e['own'] and not any(r in ('Orchestra', 'Choir', 'Ensemble', 'Conductor')
                                                           for r, _ in credits):
                skip('guest event without works or classical performers', e)
                continue
        if any(re.search(r'(?i)^(vocals|dj|rap|beatbox|e-bass|e-gitarre|drums)$', r or '') for r, _ in credits):
            skip('pop / jazz / world', e)
            continue
        works = [(c, w) for c, w in works if c or (w and w[:1].isupper() and len(w) <= 80)]
        cancelled = looks_cancelled(e['title']) or looks_cancelled(e['status_text'])
        try:
            events.append(make_event(
                KEY, e['sid'], e['title'], e['start'], city='Berlin', venueName=_venue(e['room'] or d.get('room')),
                type=_type(e, credits, works), credits=credits, program=works, ticketUrl=e['ticket'], url=e['url'],
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, e['sid'], err)
    if skipped:
        log.info('%s: skipped %s', KEY, ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    log.info('%s: %d event page(s) read', KEY, len(pages))
    return events
