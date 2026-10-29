"""Staatsoper Unter den Linden, Berlin: opera, ballet and concerts from the house's own Spielplan.

    https://www.staatsoper-berlin.de/de/spielplan/                 today and the next days
    https://www.staatsoper-berlin.de/de/spielplan/_f/DD-MM-YYYY    the following chunks
    https://www.staatsoper-berlin.de/de/veranstaltungen/<slug>.<n>/   one page per production

The Spielplan shows a few days per page and ends with a link to the next chunk
(``data-pagination-fragment-url``); the chunks are read in that order until the season ends
(about 40 requests for a season). Every performance (``data-termin-id``) carries its date and
time, the stage, the work's composer (``termin__werkinfo``), labels (festival, Premiere,
Schulvorstellung …) and, under "mehr Infos", that evening's cast (role: name) and, for
concerts, the programme (composer / work). Only those facts are taken.

Performances listed without a cast (mostly ballets of the Staatsballett) are looked up on
their production page (one request per production): its cast list names the conductor and the
orchestra; a ballet without "Musikalische Leitung" there is taken to be danced to recorded
music and skipped. Chunk URLs must be the ones the site links (other dates answer 404).

Checked against the website on 29 Oct 2026: times printed on the page ("18.00") equal the
``datetime`` attribute (Berlin local time). Performances on tour (Shanghai, Kawasaki …) have
no time and are skipped; guest performances in other German towns keep that town.

Skipped: guided tours (Vor-Führung, Nach(t)führung), introductions and talks (Einblick,
Gespräch), school performances (label "Schulvorstellung"), children's formats, workshops and
tours abroad. Kept: the "Familienvorstellung" of a regular opera (the full production) and
concerts of the Kinderchor der Staatsoper.
"""
from __future__ import annotations

import html as _html
import re

from common import (BudgetExceeded, FetchError, clean, get, guess_type, infer_type, log, looks_cancelled, make_event,
                    requests_left, today_zurich)

from ._berlin import (CITY, abroad, berlin_iso, credit, german_town, is_interval, is_pop, looks_like_person,
                      skip_title, venue_name)

KEY = 'staatsoper_berlin'
NAME = 'Staatsoper Unter den Linden'
SITE = 'https://www.staatsoper-berlin.de/'
ATTRIBUTION = 'Source: Staatsoper Unter den Linden (staatsoper-berlin.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 110
TIME_LIMIT = 600

BASE = 'https://www.staatsoper-berlin.de'
FIRST = BASE + '/de/spielplan/'
MAX_CHUNKS = 90
WINDOW_DAYS = 450

_SKIP_LABEL_RE = re.compile(r'schulvorstellung|schulkonzert|kinder|workshop|führung', re.I)
_HOUSE_STAGES = re.compile(r'staatsoper|apollosaal|probensaal|alter orchesterprobensaal|werkstatt|'
                           r'pierre boulez saal|boulezsaal|philharmonie|konzerthaus', re.I)


def _abs(href):
    href = _html.unescape(href or '').strip()
    if href.startswith('/'):
        return BASE + href
    return href if href.startswith('http') else None


def _cast(block):
    """[(role text, name)] from a 'besetzung' list (groups are listed without a role)."""
    out = []
    lists = re.findall(r'<ul class="besetzung__liste.*?</ul>\s*</div>', block, re.S)
    for lst in lists:
        for item in re.split(r'<li class="besetzung__item', lst)[1:]:
            role = re.search(r'besetzung__rolle">(.*?)</span>', item, re.S)
            names = [clean(n) for n in re.findall(r'besetzung__beteiligte-liste-item">(.*?)</(?:div|li)>', item, re.S)]
            for n in names:
                if n and n.lower() not in ('u. a.', 'u.a.'):
                    out.append((clean(role.group(1)).rstrip(':') if role else '', n))
    return out


def _program(block):
    out = []
    for comp, works in re.findall(r'konzert-programmpunkt__kuenstler[^>]*>(.*?)</div>\s*'
                                  r'<div class="konzert-programmpunkt__titel[^>]*>(.*?)</div>', block, re.S):
        composer = clean(comp)
        paras = re.findall(r'<p>(.*?)</p>', works, re.S) or [works]
        title = clean(paras[0])
        if is_interval(composer) or is_interval(title):
            continue
        if re.match(r'(?i)^werke von$', composer):
            for c in re.split(r'\s*,\s*|\s+und\s+|\s*&\s*', re.sub(r'\s+u\.\s*a\.?$', '', title)):
                if c.strip():
                    out.append((c.strip(), ''))
            continue
        if composer or title:
            out.append((composer, title))
    return out


def parse_chunk(page_html):
    """-> (list of performance dicts, next chunk URL or None)."""
    out = []
    for art in re.split(r'<article class="termin-list__item', page_html or '')[1:]:
        tid = re.search(r'data-termin-id="(\d+)"', art)
        when = re.search(r'<time datetime="([^"]+)"', art)
        link = re.search(r'termin__title.*?<a href="([^"]*)"[^>]*>(.*?)</a>', art, re.S)
        if not (tid and when and link):
            continue
        place = re.search(r'termin__spielstaette">(.*?)</div>', art, re.S)
        werk = re.search(r'termin__werkinfo">(.*?)</div>', art, re.S)
        labels = [clean(x).strip(' ,') for x in re.findall(r'<li class="u-inline-block">(.*?)</li>', art, re.S)]
        ticket = re.search(r'termin__ticket-button">\s*<a class="button[^"]*" href="([^"]+)"', art)
        out.append({
            'id': tid.group(1),
            'when': when.group(1).strip(),
            'title': clean(link.group(2)),
            'url': _abs(link.group(1)),
            'place': clean(place.group(1)) if place else '',
            'werk': clean(werk.group(1)) if werk else '',
            'labels': [x for x in labels if x],
            'cast': _cast(art),
            'program': _program(art),
            'ticket': _abs(ticket.group(1)) if ticket else None,
            'status_text': ' '.join(re.findall(r'class="termin__[a-z-]*(?:status|hinweis|abgesagt)[^"]*"[^>]*>(.*?)<',
                                               art, re.S)),
            'cancelled_class': bool(re.search(r'termin--abgesagt|is-cancel|abgesagt', art[:600], re.I)),
        })
    nxt = re.search(r'data-pagination-fragment-url="([^"]+)"', page_html or '')
    return out, (_abs(nxt.group(1)) if nxt else None)


def parse_production(page_html):
    """-> {'cast': [(role text, name)], 'program': [(composer, work)]} from a production page."""
    h = page_html or ''
    cast = []
    free = re.search(r'<div class="besetzung-freitext[^"]*">(.*?)</div>', h, re.S)
    if free:
        for li in re.findall(r'<li>(.*?)</li>', free.group(1), re.S):
            line = clean(li)
            m = re.match(r'^([^:]{1,80}):\s*(.+)$', line)
            if m:
                for n in re.split(r'\s*,\s*', m.group(2)):
                    cast.append((m.group(1), n))
            elif line:
                cast.append(('', line))
    else:
        block = re.search(r'<div class="besetzung flow[^"]*"[^>]*>(.*)', h, re.S)
        if block:
            cast = _cast(block.group(1))
    prog = re.search(r'<section class="layout" id="programm">(.*?)</section>', h, re.S)
    return {'cast': cast, 'program': _program(prog.group(1)) if prog else []}


def _start(when):
    m = re.match(r'(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})', when)
    if not m:
        return None                                   # no time (tours): not a performance we can list
    return berlin_iso(f'{m.group(1)}T{int(m.group(2)):02d}:{m.group(3)}')


def _is_opera(p):
    composer = p['werk'].split(',')[0].strip()
    return bool(composer) and looks_like_person(composer, max_words=5) and len(composer.split()) >= 2 \
        and not p['program'] and not p.get('concert') \
        and not re.search(r'konzert|liederabend|recital|gastspiel|staatskapelle|salon', f"{p['title']} {composer}", re.I)


def _credits(cast, opera):
    out = []
    for role, name in cast:
        c = credit(role, name, opera=opera)
        if c:
            out.append(c)
    return out


def _type(p, credits, program, ballet=False):
    roles = {r for r, _ in credits}
    text = f"{p['title']} {p['werk']}"
    if ballet:
        return 'orchestral'
    if _is_opera(p):
        return 'vocal-opera'
    if re.search(r'liederabend|recital|rezital', text, re.I):
        return 'recital'
    singers = sum(1 for r, _ in credits if r == 'Performer' or r in ('Soprano', 'Mezzo-soprano', 'Alto', 'Tenor',
                                                                      'Baritone', 'Bass', 'Countertenor'))
    if 'Choir' in roles or re.search(r'chor\b|requiem|messe\b|oratori|passion', text, re.I) or singers >= 3:
        return 'vocal-opera'
    if 'Orchestra' in roles or re.search(r'staatskapelle|sinfoniekonzert|abonnementkonzert', text, re.I):
        return 'orchestral'
    g = guess_type(text)
    if g:
        return g
    if re.search(r'kammerkonzert|kammermusik|apollo-salon|barocktage-konzert|museumskonzert', text, re.I):
        return 'chamber'
    return infer_type(p['title'], credits, program)


def _series(p):
    for label in p['labels']:
        if re.search(r'barocktage|festtage|infektion|linden|festival', label, re.I):
            return label
    m = re.match(r'^(\d+\.\s*(?:Abonnementkonzert|Kammerkonzert|Sinfoniekonzert))', p['title'])
    return m.group(1) if m else None


def _read_chunks():
    perf, url, pages = {}, FIRST, 0
    last_day = today_zurich().toordinal() + WINDOW_DAYS
    seen_urls = set()
    while url and pages < MAX_CHUNKS and url not in seen_urls:
        seen_urls.add(url)
        if requests_left() <= 5:
            log.warning('%s: stopping the Spielplan at %s (request cap)', KEY, url)
            break
        try:
            page = get(url)
        except BudgetExceeded as err:
            log.warning('%s: stopped: %s', KEY, err.reason)
            break
        except FetchError as err:
            if pages == 0:
                raise
            (log.info if getattr(err, 'status', None) == 404 else log.warning)('%s: chunk failed: %s', KEY, err)
            break
        pages += 1
        items, url = parse_chunk(page)
        for p in items:
            perf.setdefault(p['id'], p)
        if items:
            try:
                from datetime import date
                d = date.fromisoformat(items[-1]['when'][:10])
                if d.toordinal() > last_day:
                    break
            except ValueError:
                pass
    log.info('%s: %d Spielplan page(s), %d performances', KEY, pages, len(perf))
    return list(perf.values())


def fetch():
    perfs = _read_chunks()
    skipped, cands = {}, []

    def skip(why, p=None):
        skipped[why] = skipped.get(why, 0) + 1
        if p is not None:
            log.debug('%s: skipped (%s): %s %s', KEY, why, p['when'], p['title'])

    for p in perfs:
        text = f"{p['title']} {p['werk']}"
        if skip_title(p['title']) or any(_SKIP_LABEL_RE.search(x) for x in p['labels']):
            skip('tour / talk / school / children', p)
            continue
        if is_pop(text) and not p['program']:
            skip('pop / jazz', p)
            continue
        start = _start(p['when'])
        if not start:
            skip('no time (tour)')
            continue
        place = p['place']
        city = CITY
        if not _HOUSE_STAGES.search(place):
            town = german_town(f"{p['title']} {place}")
            guest = re.search(r'gastspiel|tournee|tour\b', p['title'], re.I)
            if (abroad(f"{place} {p['title']}") or guest) and not town:
                skip('abroad', p)
                continue
            if town:
                city = town
        p['start'], p['city'] = start, city
        cands.append(p)

    # performances without a cast: their production page says who plays (and whether live music)
    productions = {}
    for p in cands:
        if p['cast'] or p['program']:
            continue
        prod = (p['url'] or '').split('#')[0]
        if prod and prod not in productions:
            productions[prod] = None
    for prod in sorted(productions, key=lambda u: min(c['start'] for c in cands if (c['url'] or '').startswith(u))):
        if requests_left() <= 0:
            break
        try:
            productions[prod] = parse_production(get(prod))
        except BudgetExceeded:
            break
        except FetchError as err:
            log.warning('%s: production page failed: %s', KEY, err)

    events = []
    for p in cands:
        prod = (p['url'] or '').split('#')[0]
        cast, ballet = p['cast'], False
        program = list(p['program'])
        if not cast and not program:
            got = productions.get(prod) or {}
            pc = got.get('cast') or []
            if got.get('program'):
                program = got['program']
                p['concert'] = True
            if pc:
                roles = ' '.join(r for r, _ in pc)
                choreo = re.search(r'choreogra', roles, re.I)
                music = re.search(r'musikalische leitung|dirigent', roles, re.I)
                if choreo and not music:
                    skip('ballet without live music', p)
                    continue
                ballet = bool(choreo)
                if ballet:
                    # dancers are not musical credits: keep conductor, orchestra, choreographer
                    cast = [(r, n) for r, n in pc
                            if re.search(r'musikalische leitung|dirigent|choreogra', r, re.I)
                            or (not r and re.search(r'staatskapelle|orchester|chor', n, re.I))]
                else:
                    cast = pc
        opera = _is_opera(p) or ballet
        credits = _credits(cast, opera)
        if ballet:
            credits = [(('Choreographer' if re.search(r'choreogra', r, re.I) else r), n) for r, n in credits]
        roles = {r for r, _ in credits}
        if re.search(r'ballett|ballet|dance|tanz', p['title'], re.I) and not roles & {'Conductor', 'Orchestra'}:
            skip('ballet without live music', p)
            continue
        if _is_opera(p) and not program:
            program = [(p['werk'].split(',')[0].strip(), p['title'])]
        cancelled = looks_cancelled(f"{p['status_text']} {' '.join(p['labels'])}") or looks_cancelled(p['title'])
        place = p['place'] or 'Staatsoper Unter den Linden'
        try:
            events.append(make_event(
                KEY, p['id'], p['title'], p['start'], city=p['city'],
                venueName=venue_name(f'Staatsoper Unter den Linden, {place}' if re.match(r'(?i)apollosaal|alter orch', place)
                                     else place),
                type=_type(p, credits, program, ballet), series=_series(p) or ('Ballett' if ballet else None),
                credits=credits, program=program, ticketUrl=p['ticket'], url=p['url'],
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, p['id'], err)
    if skipped:
        log.info('%s: skipped %s', KEY, ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    log.info('%s: %d production page(s) read', KEY, sum(1 for v in productions.values() if v is not None))
    return events
