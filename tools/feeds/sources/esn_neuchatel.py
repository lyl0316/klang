"""Ensemble Symphonique Neuchâtel (ESN): the orchestra's season, from its own site (Webflow).

    https://www.esn-ne.ch/programme              one request: links to this season's concerts
    https://www.esn-ne.ch/concerts/<slug>        one request per concert (about 8)

Each concert page starts with the performances ("8 novembre 2026, 17h - Salle de
Musique, La Chaux-de-Fonds"; several dates and halls may follow each other), the title,
and the line-up ("Name · role" lines and the ensembles); the works follow under
"Programme" as "<b>Composer</b> - <i>Title</i>". Tours list their dates in the text
("Vendredi 28 mai 2027 | 20h. Cathédrale de Lausanne"). Only these facts are taken.

robots.txt: only a sitemap line, everything allowed. No terms of use on the site.

Skipped: family and school concerts ("Concert famille", "Concerts des écoliers") and runs
announced without a start time ("du 11 au 14 avril 2027"), which are not invented.
"""
from __future__ import annotations

import re
from urllib.parse import urljoin

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, \
    today_zurich
from ._westsouth import DATE_RE, find_date, fold, group_role, infer_type, is_not_a_concert, local_iso, role_for

KEY = 'esn_neuchatel'
NAME = 'Ensemble Symphonique Neuchâtel'
SITE = 'https://www.esn-ne.ch/'
ATTRIBUTION = 'Source: Ensemble Symphonique Neuchâtel (esn-ne.ch)'
KIND = 'orchestra'
MAX_REQUESTS = 25
TIME_LIMIT = 180

BASE = 'https://www.esn-ne.ch'
LISTING = BASE + '/programme'
ORCHESTRA = 'Ensemble Symphonique Neuchâtel'

_CITIES = (('la chaux-de-fonds', 'La Chaux-de-Fonds'), ('neuchatel', 'Neuchâtel'), ('lausanne', 'Lausanne'),
           ('delemont', 'Delémont'), ('berne', 'Bern'), ('bern', 'Bern'), ('couvet', 'Couvet'), ('fribourg', 'Fribourg'),
           ('geneve', 'Genève'), ('bienne', 'Biel/Bienne'), ('le locle', 'Le Locle'), ('porrentruy', 'Porrentruy'))
_TIMES_RE = re.compile(r'\b(\d{1,2})\s*(?:h\s*(\d{2})?)?\s*(?:&|et)\s*(\d{1,2})\s*h\s*(\d{2})?|\b(\d{1,2})\s*h\s*(\d{2})?(?!\d)', re.I)


def season_links(html):
    """Concert page URLs listed before "Concerts passés" on the programme page."""
    current = (html or '').split('Concerts passés', 1)[0]
    out = []
    for href in re.findall(r'href="(/concerts/[^"#?]+)"', current):
        url = urljoin(BASE, href)
        if url not in out:
            out.append(url)
    return out


def _city(text):
    f = fold(text)
    return next((c for frag, c in _CITIES if frag in f), None)


def _venue_city(place):
    """'Salle de Musique, La Chaux-de-Fonds' -> ('Salle de Musique', 'La Chaux-de-Fonds');
    'Cathédrale de Lausanne' -> ('Cathédrale de Lausanne', 'Lausanne')."""
    p = clean(place).strip(' -–·.|,')
    if not p:
        return None, None
    if ',' in p:
        venue, town = (x.strip() for x in p.rsplit(',', 1))
        return venue or None, _city(town) or town
    return p, _city(p)


def performances(text):
    """'19 juin 2027, 19h30 - Salle ..., La Chaux-de-Fonds 20 juin 2027, 17h - ...' ->
    [(iso start, venue, city)]. Segments without a clock time are skipped."""
    out = []
    folded = fold(text)
    starts = [m.start() for m in DATE_RE.finditer(folded)]
    for i, pos in enumerate(starts):
        seg_f = folded[pos:starts[i + 1] if i + 1 < len(starts) else len(folded)]
        seg = text[pos:pos + len(seg_f)]
        d = find_date(seg_f)
        if not d:
            continue
        rest = seg[DATE_RE.match(seg_f).end():]
        m = re.match(r'^[\s,|:]*(.*?)(?:\s*[-–·]\s+|\s*\.\s+|\s*\|\s*)(.*)$', rest)
        time_part, place = (m.group(1), m.group(2)) if m else (rest, '')
        tm = _TIMES_RE.search(time_part)
        if not tm:
            continue
        if tm.group(1):                                            # "14 & 16h"
            times = [(int(tm.group(1)), int(tm.group(2) or 0)), (int(tm.group(3)), int(tm.group(4) or 0))]
        else:
            times = [(int(tm.group(5)), int(tm.group(6) or 0))]
        venue, city = _venue_city(place)
        for hh, mi in times:
            out.append((local_iso(*d, hh, mi), venue, city))
    return out


def _br_lines(html):
    text = re.sub(r'\s+', ' ', html or '')
    return [ln for ln in re.split(r'(?i)<br\s*/?>|</p>|<p\b[^>]*>|</h\d>|<h\d\b[^>]*>', text) if clean(ln).strip('\u200d ')]


def _credits(html_fragment):
    out = []
    for raw in _br_lines(html_fragment):
        t = clean(raw).strip('\u200d ')
        if not t or len(t) > 90 or re.search(r'\d{4}', t):
            continue
        if re.fullmatch(r'(?:\s|<[^>]+>|\u200d)*<em>.*?</em>(?:\s|<[^>]+>|\u200d)*', raw):
            continue                                               # work headings are in italics
        m = re.match(r'^(.+?)\s+·\s+(.+)$', t)
        if m:
            role = role_for(m.group(2), m.group(1))
            if role:
                out.append((role, m.group(1)))
        elif group_role(t) and not re.search(r'[.:!?]$', t) and not re.match(r'(?i)(avec|en |dans|le |la |l[\'’])', t):
            out.append((group_role(t), re.sub(r'\s*\(.*?\)\s*$', '', t) if t.endswith(')') and 'NEC' in t else t))
    return out


def parse_page(html):
    """Concert page -> dict(title, subtitle, perfs, credits, program, ticket)."""
    page = html or ''
    head = re.search(r'class="text-block _22-px post-episode-text">(.*?)</div>', page, re.S)
    title = re.search(r'<h1 class="post-heading-text">(.*?)</h1>', page, re.S)
    lineup = re.search(r'post-heading-text">.*?</h1>\s*<div class="w-richtext">(.*?)</div>', page, re.S)
    ticket = re.search(r'href="([^"]+)"[^>]*class="nav-button black-button concerts', page)
    body = re.search(r'<div class="rich-text-text w-richtext">(.*?)<div class="related-episodes-section"', page, re.S)
    body = body.group(1) if body else ''
    before_prog, _, prog_part = body.partition('<h2>Programme</h2>')
    perfs = performances(clean(re.sub(r'(?i)<br\s*/?>|</div>', ' ', head.group(1)))) if head else []
    if not perfs:                                                  # tours: dates in the text
        for ln in _br_lines(before_prog):
            perfs += performances(clean(ln))
    credits = _credits(lineup.group(1) if lineup else '') + _credits(before_prog)
    program = []
    prog_part = re.split(r'<h2\b', prog_part, 1)[0]
    for raw in _br_lines(prog_part):
        t = clean(raw).strip('\u200d ')
        if not t or len(t) > 200:
            continue
        strong = re.search(r'<strong>(.*?)</strong>', raw, re.S)
        if strong and ' - ' not in t and not re.search(r'<em>', raw):
            continue                                               # "Textes de Blaise Cendrars"
        m = re.match(r'^(.{2,60}?)\s*[-–]\s*(.+)$', t)
        if m and (strong or re.match(r'^[A-Z]\.', t)):
            program.append((m.group(1).strip(), m.group(2).strip()))
    if not program:              # "<p><strong>W. A. Mozart</strong><em>Work<br/>Work</em></p>"
        for comp, works in re.findall(r'<p>\s*<strong>(.*?)</strong>\s*<em>(.*?)</em>\s*</p>', prog_part, re.S):
            composer = clean(comp)
            if not composer or len(composer) > 60 or ' - ' in composer:
                continue
            for w in re.split(r'(?i)<br\s*/?>', works):
                if clean(w).strip('\u200d '):
                    program.append((composer, clean(w).strip('\u200d ')))
    tagline = re.search(r'<meta content="([^"]*)" name="description"', page)
    return {'title': clean(title.group(1)) if title else '', 'perfs': perfs, 'credits': credits, 'program': program,
            'ticket': ticket.group(1) if ticket else None, 'all': clean(head.group(1)) if head else '',
            'tagline': clean(tagline.group(1)) if tagline else ''}


def fetch():
    today = today_zurich()
    links = season_links(get(LISTING))             # FetchError propagates: build reuses yesterday's events
    if not links:
        raise FetchError(LISTING, 'no concert links on the programme page')
    events = []
    for url in links:
        if requests_left() <= 0:
            break
        try:
            info = parse_page(get(url))
        except FetchError as err:
            log.warning('%s: no page for %s: %s', KEY, url, err)
            continue
        if not info['title'] or is_not_a_concert(f"{info['title']} {info['tagline']}"):
            continue
        slug = url.rsplit('/', 1)[-1]
        title, series = info['title'], None
        if fold(title).strip() == 'autour de la saison' and info['program']:   # a series label, not a title
            series = title
            comp, work = info['program'][-1]
            title = f'{comp}: {work}'
        credits = list(info['credits'])
        if not any(fold(ORCHESTRA) in fold(n) for _, n in credits):
            credits.append(('Orchestra', ORCHESTRA))
        kind = infer_type(title, credits, program=info['program'])
        if not info['perfs']:
            log.info('%s: %s has no dated performance with a time (%s)', KEY, slug, info['all'])
        for start, venue, city in info['perfs']:
            if to_zurich_datetime(start).date() < today:
                continue
            try:
                events.append(make_event(
                    KEY, f'{slug}-{start[:16].replace("-", "").replace(":", "").replace("T", "")}', title, start,
                    city=city or 'Neuchâtel', venueName=venue, type=kind, series=series, credits=credits,
                    program=info['program'],
                    url=url, ticketUrl=info['ticket'],
                    status='cancelled' if looks_cancelled(info['title']) else 'scheduled'))
            except ValueError as err:
                log.warning('%s: skipped %s: %s', KEY, slug, err)
    return events
