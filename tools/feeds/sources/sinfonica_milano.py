"""Orchestra Sinfonica di Milano (Fondazione Orchestra Sinfonica e Coro Sinfonico di Milano
Giuseppe Verdi): concerts at the Auditorium di Milano and elsewhere.

    https://sinfonicadimilano.org/?s=public&p=eventi&a=lista_json&lang=it    the next concerts (JSON)
    https://sinfonicadimilano.org/it/musica-da-camera-2026-27 (and the other series pages)   a series' concerts
    https://sinfonicadimilano.org/it/eventi/<season>/<slug>                   one page per programme

LIMITATION: the site's full calendar ("Tutti i concerti") is loaded with POST requests
(``lista_json`` with start/length/filters), which Klang's readers do not send. Asked with GET the
same endpoint answers with the next nine performances only (about two weeks ahead), so the
symphonic season appears in Klang about two weeks before each concert. The chamber-music series
pages (Musica da camera, Musica da camera in Auditorium, Intersezioni) are static and list their
whole season, so those concerts appear as soon as they are announced.

Programme pages give the title, the hall (``<h2>``), every date of the programme ("30 ottobre ore
20:00", "01 novembre ore 16:00"; the year comes from the season, 2026-27: August-December 2026,
January-July 2027; Milan local time), the duration, the works (``<h5>Composer</h5><h5>Work</h5>``)
and the performers ("Name Mezzosoprano", the orchestra as a heading). They are read
incrementally (_italy_north.read_pages). A performance flagged ``eventi_repliche_is_annullata``
in the JSON is marked cancelled.

Skipped: Crescendo in Musica and Musica da Cameretta (children and families), POPs (film and
pop programmes), guided tours and courses.

Checked against the website on 29 Oct 2026: 9 performances in the JSON (Mahler, Das Lied von der
Erde, 30 Oct 20:00 and 1 Nov 16:00, Emmanuel Tjeknavorian), 19 performances in all with the series
pages (Bartók/Hermann/Schubert 29 Nov 11:00 at the Teatro Gerolamo).
"""
from __future__ import annotations

import re

from common import FetchError, clean, get, get_json, infer_type, log, make_event, to_zurich_iso

from ._italy_north import MONTHS, credit, fold, house_groups, minutes, nice_name, read_pages, skip_title

KEY = 'sinfonica_milano'
NAME = 'Orchestra Sinfonica di Milano'
SITE = 'https://sinfonicadimilano.org/'
ATTRIBUTION = 'Source: Orchestra Sinfonica di Milano (sinfonicadimilano.org)'
KIND = 'orchestra'
COUNTRY = 'italy'
MAX_REQUESTS = 50              # 1 JSON + ~4 series pages + one page per programme
TIME_LIMIT = 600

BASE = 'https://sinfonicadimilano.org'
JSON_LIST = BASE + '/?s=public&p=eventi&a=lista_json&lang=it'
SERIES_PAGES = ('/it/musica-da-camera-{season}', '/it/musica-da-camera-in-auditorium-{season}', '/it/intersezioni')
CITY = 'Milan'
TZ = 'Europe/Rome'
ORCHESTRA = 'Orchestra Sinfonica di Milano'
_SKIP_CAT = re.compile(r'(?i)crescendo in musica|cameretta|pops|corsi|visite')
_VENUES = {'auditorium di milano fondazione cariplo': 'Auditorium di Milano Fondazione Cariplo'}


def _season_of(url):
    m = re.search(r'/eventi/(\d{4})-(\d{2})/', url)
    return (int(m.group(1)), 2000 + int(m.group(2))) if m else None


def parse_programme(html, url, meta):
    h = html or ''
    title = re.search(r'<h1[^>]*>(.*?)</h1>', h, re.S)
    sub = re.search(r'<h1[^>]*>.*?</h1>\s*<span>(.*?)</span>', h, re.S)
    place = re.search(r'<h2 class="g-py-30"[^>]*>(.*?)</h2>', h, re.S)
    if not title:
        return []
    title = clean(title.group(1))
    if title.isupper():
        title = title.title().replace(' / ', ' / ')
    venue = clean(place.group(1)) if place else ''
    town = re.search(r'\ba ([A-Z][\w\' ]+)$', venue)
    city = town.group(1).strip() if town and not re.search(r'(?i)milano', town.group(1)) else CITY
    season = _season_of(url) or meta.get('season')
    dur = re.search(r'Durata:\s*(.*?)</h4>', h, re.S)
    works = []
    for block in re.findall(r'<div class="opera-div[^"]*"[^>]*>(.*?)</div>', h, re.S):
        heads = [clean(x) for x in re.findall(r'<h5[^>]*>(.*?)</h5>', block, re.S)]
        if len(heads) >= 2 and heads[0] and heads[1]:
            works.append((nice_name(heads[0]), heads[1]))
    credits = []
    perf = re.search(r'<h3 class="rosso[^"]*"[^>]*>(.*?)</h3>(.*?)</div>', h, re.S)
    if perf:
        credits += house_groups(clean(perf.group(1)))
        for name, role in re.findall(r'<span[^>]*>\s*<a[^>]*>(.*?)</a>\s*</span>\s*([^<]*)<br', perf.group(2), re.S):
            c = credit(clean(role), clean(name))
            if c:
                credits.append(c)
    if not any(r == 'Orchestra' for r, _ in credits) and meta.get('orchestra'):
        credits.insert(0, ('Orchestra', meta['orchestra']))
    events = []
    head = h.split('SEGUI IL CONCERTO ONLINE', 1)[0]
    for day, mon, hh, mi in re.findall(r"<span class='rosso'>(\d{1,2})</span>\s*([a-z]+)\s+ore\s+(\d{1,2})[:.](\d{2})", head):
        month = MONTHS.get(fold(mon))
        if not (month and season):
            continue
        year = season[0] if month >= 8 else season[1]
        local = f'{year}-{month:02d}-{int(day):02d}T{int(hh):02d}:{mi}'
        sid = f"{url.rstrip('/').split('/')[-1]}-{local[:10]}-{local[11:].replace(':', '')}"
        try:
            events.append(make_event(
                KEY, sid, title, to_zurich_iso(local, assume=TZ), city=city,
                venueName=_VENUES.get(fold(venue), venue) or None,
                type=infer_type(title, credits, works, meta.get('series'), solo_rule=False) or
                ('chamber' if re.search(r'(?i)camera', meta.get('series') or '') else 'orchestral'),
                series=meta.get('series'), credits=credits, program=works,
                durationMin=minutes(dur.group(1)) if dur else None, ticketUrl=url, url=url,
                status='cancelled' if local in meta.get('cancelled', set()) else 'scheduled'))
        except ValueError as err:
            log.warning('sinfonica_milano %s: skipped: %s', sid, err)
    return events


def fetch():
    metas = {}
    data = get_json(JSON_LIST)
    seasons = set()
    for e in (data or {}).get('dati') or []:
        cat = clean(e.get('eventi_categorie_nome'))
        title = clean(e.get('titolo_it'))
        if _SKIP_CAT.search(cat) or skip_title(title):
            continue
        url = f"{BASE}/it/eventi/{e.get('stagioni_slug')}/{e.get('slug_it')}"
        m = metas.setdefault(url, {'series': cat.capitalize() if cat else None, 'cancelled': set(),
                                   'orchestra': clean(e.get('orchestra')) or None})
        seasons.add(e.get('stagioni_slug'))
        if str(e.get('eventi_repliche_is_annullata')) == '1':
            m['cancelled'].add(f"{e.get('data_inizio')}T{(e.get('ora_inizio') or '')[:5]}")
    for season in sorted(s for s in seasons if s) or ['2026-27']:
        for path in SERIES_PAGES:
            page_url = BASE + path.format(season=season)
            try:
                page = get(page_url)
            except FetchError as err:
                log.info('sinfonica_milano: series page %s: %s', page_url, err)
                continue
            heading = re.search(r'<h1[^>]*>(.*?)</h1>', page, re.S)
            series = clean(heading.group(1)).capitalize() if heading else None
            for href in re.findall(r'href="(?:https://sinfonicadimilano\.org)?(/it/eventi/\d{4}-\d{2}/[a-z0-9-]+)(?:/\d+)?"',
                                   page):
                metas.setdefault(BASE + href, {'series': series, 'cancelled': set(), 'orchestra': None})
        break                                       # one season's series pages are enough
    log.info('sinfonica_milano: %d programme page(s) known', len(metas))
    events, read, reused = read_pages(KEY, list(metas), lambda html, url: parse_programme(html, url, metas[url]))
    log.info('sinfonica_milano: %d programme page(s) read, %d reused', read, reused)
    return events
