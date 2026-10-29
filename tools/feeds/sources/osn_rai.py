"""Orchestra Sinfonica Nazionale della Rai (OSN Rai), Turin: the orchestra's season at the
Auditorium Rai "Arturo Toscanini" (Stagione sinfonica, Rai NuovaMusica, Beethoven POPS, the
Christmas, Carnival and Easter concerts …) and its concerts elsewhere.

    https://www.raicultura.it/sitemap.archivio.orchestrarai.xml     every page of the orchestra's section
    https://www.raicultura.it/orchestrarai/eventi/Stagione-20262027---Concerto-n-4-<uuid>.html   one page per concert

orchestrasinfonica.rai.it now redirects to raicultura.it/orchestrarai. Its "Calendario" is a web
component that POSTs to a search service, which this reader does not do; the section's sitemap
(robots.txt allows everything) lists every concert page instead ("…/eventi/Stagione-<season>---…").
Only the current and next season's pages are read.

A concert page has a schema.org Event (place and first start only) and a free-text block:
the series ("Concerto n. 4 (serie arancio)"), the hall, one line per performance ("Giovedì 3
dicembre 2026, 20.30" / "Venerdì 4 dicembre 2026, 20.00", Turin local time), performers as
"<strong>NAME </strong><em>role</em>" (capitals, title-cased here), guest choirs, and the programme
("<strong>Composer</strong>" + work lines). Each performance date becomes one event. The
orchestra itself is always credited.

Pages are read incrementally (_italy_north.read_pages): a concert the previous feed already has
keeps its record unless it is within two weeks or due for its weekly re-read. Within a numbered
series ("Concerto n. 7", "Beethoven POPS n. 3"), numbers are chronological, so pages numbered
below the lowest one still upcoming in the previous feed are past and are not read again.

Checked against the website on 29 Oct 2026: 40 concert pages for 2026/2027, 57 performances ahead; Concerto n. 4,
3 Dec 20:30 and 4 Dec 20:00 (Daniele Rustioni, Roman Simovic; Liszt, Rózsa, Dvořák), Concerto di
Natale 22 Dec 20:30 (Fabio Luisi, Coro del Teatro Regio di Torino; Beethoven 9).
"""
from __future__ import annotations

import json
import re

from common import clean, get, infer_type, jsonld_events, log, looks_cancelled, make_event, previous_events, \
    to_zurich_iso, today_zurich

from ._italy_north import MONTHS, credit, fold, group_role, house_groups, nice_name, read_pages

KEY = 'osn_rai'
NAME = 'Orchestra Sinfonica Nazionale della Rai'
SITE = 'https://www.raicultura.it/orchestrarai'
ATTRIBUTION = 'Source: Orchestra Sinfonica Nazionale della Rai (raicultura.it/orchestrarai)'
KIND = 'orchestra'
COUNTRY = 'italy'
MAX_REQUESTS = 70              # 1 sitemap + one page per concert (~40 a season)
TIME_LIMIT = 600

SITEMAP = 'https://www.raicultura.it/sitemap.archivio.orchestrarai.xml'
ORCHESTRA = 'Orchestra Sinfonica Nazionale della Rai'
TZ = 'Europe/Rome'
_PAGE_RE = re.compile(r'https://www\.raicultura\.it/orchestrarai/eventi/Stagione-(\d{4})(\d{4})---([^"<\s]+)\.html')
_DATE_RE = re.compile(r'(\d{1,2})\s+([a-z]+)\s+(\d{4})\s*,?\s*(?:ore\s*)?(\d{1,2})[.:](\d{2})')


def _number(slug):
    """'Concerto-n-4-<uuid>' -> ('concerto', 4); unnumbered -> (None, None)."""
    m = re.match(r'(.+?)-n-(\d+)-[0-9a-f]{8}-', slug)
    return (m.group(1).lower(), int(m.group(2))) if m else (None, None)


def season_pages(xml):
    today = today_zurich()
    first = today.year if today.month >= 8 else today.year - 1
    out = []
    for m in _PAGE_RE.finditer(xml or ''):
        if int(m.group(1)) in (first, first + 1) and m.group(0) not in out:
            out.append(m.group(0))
    return out


def _past_pages(urls):
    """Pages numbered below the lowest upcoming number of their series in the previous feed."""
    lowest = {}
    for e in previous_events(KEY):
        m = _PAGE_RE.match(e.get('url') or '')
        if m:
            series, n = _number(m.group(3))
            if series and e.get('start', '')[:10] >= today_zurich().isoformat():
                lowest[series] = min(n, lowest.get(series, n))
    out = set()
    for u in urls:
        series, n = _number(_PAGE_RE.match(u).group(3))
        if series in lowest and n < lowest[series]:
            out.add(u)
    return out


# ---------------------------------------------------------------------------
# concert pages
# ---------------------------------------------------------------------------

def _lines(block):
    block = block.split('<hr', 1)[0]
    return [ln for ln in re.split(r'(?i)<br\s*/?>', block)]


def parse_concert(html, url):
    h = html or ''
    head = re.search(r'<h1 class="article__title">(.*?)</h1>', h, re.S)
    sub = re.search(r'<h2 class="article__subtitle">(.*?)</h2>', h, re.S)
    name = re.sub(r'^Stagione \d{4}/\d{4}\s*[-–]\s*', '', clean(head.group(1))) if head else ''
    subtitle = clean(sub.group(1)) if sub else ''
    body = re.search(r'<div class="article__text">(.*?)<div class="article__tag">', h, re.S)
    if not (name and body):
        return []
    place = next((e.get('location') for e in jsonld_events(h) if isinstance(e.get('location'), dict)), {}) or {}
    venue = clean(place.get('name')) or 'Auditorium Rai "Arturo Toscanini"'
    address = place.get('address') or {}
    locality = clean(address.get('addressLocality') if isinstance(address, dict) else address)
    if isinstance(address, dict) and address.get('addressCountry') not in (None, '', 'IT'):
        log.info('osn_rai: abroad, skipped: %s', name)
        return []
    city = 'Turin' if re.search(r'torino', fold(locality)) else 'Milan' if re.search(r'milano', fold(locality)) \
        else (locality.split(',')[-1].strip() or 'Turin')

    dates, credits, works = [], [('Orchestra', ORCHESTRA)], []
    composer, current, after_dates = None, None, False
    for raw in _lines(body.group(1)):
        text = clean(raw)
        m = _DATE_RE.search(fold(text))
        if m and m.group(2) in MONTHS:
            dates.append(f'{m.group(3)}-{MONTHS[m.group(2)]:02d}-{int(m.group(1)):02d}T{int(m.group(4)):02d}:{m.group(5)}')
            after_dates = True
            continue
        if not text:
            composer = current = None
            continue
        if not after_dates:
            continue
        raw = raw.strip()
        em = re.search(r'<em>((?:(?!<em>).)*?)</em>\s*$', raw, re.S)
        before = clean(raw[:em.start()]) if em else ''
        if em and before and not re.search(r'\d', before) and before.upper() == before:
            c = credit(clean(em.group(1)), before)
            if c:
                credits.append(c)
            composer = None
            continue
        if text.upper() == text and not re.search(r'\d', text) and len(text) < 90:
            g = house_groups(nice_name(text)) if group_role(text) else []
            credits += g or [('Performer', nice_name(text))]
            continue
        only_bold = re.fullmatch(r'\s*(?:<span[^>]*>)?\s*<strong>([^<]+)</strong>\s*(?:</span>)?\s*', raw)
        if only_bold and not re.search(r'\d', only_bold.group(1)) and len(clean(only_bold.group(1)).split()) <= 6:
            composer, current = nice_name(only_bold.group(1)), None
            continue
        if composer:
            if current is None:
                works.append([composer, text])
                current = works[-1]
            else:
                current[1] += (' ' if text[:1].islower() else ' – ') + text
    title = f'{name}: {subtitle}' if subtitle else name
    program = [tuple(w) for w in works]
    events = []
    for local in dict.fromkeys(dates):
        sid = f"{re.sub(r'-[0-9a-f]{8}-.*$', '', url.rsplit('/', 1)[-1])}-{local[:10]}"
        try:
            events.append(make_event(
                KEY, sid, title, to_zurich_iso(local, assume=TZ), city=city, venueName=venue,
                type=infer_type(title, credits, program, solo_rule=False) or 'orchestral', series=name,
                credits=credits, program=program, ticketUrl=url, url=url,
                status='cancelled' if looks_cancelled(clean(body.group(1))[:200]) else 'scheduled'))
        except ValueError as err:
            log.warning('osn_rai %s: skipped: %s', sid, err)
    if not events:
        log.info('osn_rai: no performance date found on %s', url)
    return events


def fetch():
    urls = season_pages(get(SITEMAP))
    past = _past_pages(urls)
    todo = [u for u in urls if u not in past]
    log.info('osn_rai: %d concert pages this season and next, %d known to be past', len(urls), len(past))

    def order(u):
        series, n = _number(_PAGE_RE.match(u).group(3))
        return f'{series or "~"}{n or 0:04d}'

    events, read, reused = read_pages(KEY, todo, parse_concert, order=order)
    today = today_zurich().isoformat()
    events = [e for e in events if e['start'][:10] >= today]
    log.info('osn_rai: %d concert page(s) read, %d reused, %d performances ahead', read, reused, len(events))
    return events
