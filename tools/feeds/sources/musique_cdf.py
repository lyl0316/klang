"""Société de Musique de La Chaux-de-Fonds: the concerts at the Salle de musique (and the
Salle Faller / L'Heure Bleue), from the society's own site.

    https://musiquecdf.ch/concerts/            one request: every concert with date, time, hall
    https://musiquecdf.ch/concert/<slug>/      one request per concert (about 30) for works and roles

The concert list is an Elementor loop: one item per concert with the line-up as title
("ADAM LALOUM piano / ORCHESTRE ... / ROBERT TREVINO direction"), the date ("22 octobre
2026"), the local start time ("19:30"), the hall and the series (Grande Série,
Collaboration, Nouveau Talent, as a CSS class). Each concert page lists the works
(composer, life dates, title) and the artists (NAME, role). Names printed in capitals are
re-cased ("Adam Laloum"). Only those facts are taken.

robots.txt allows everything but /cgi-bin/ and /tmp/. The site has a copyright line and
a privacy page, no terms about reuse.
"""
from __future__ import annotations

import re

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, \
    today_zurich
from ._westsouth import caps_words, find_date, find_time, fold, group_role, infer_type, known_role, local_iso, \
    role_for, smart_case

KEY = 'musique_cdf'
NAME = 'Société de Musique de La Chaux-de-Fonds'
SITE = 'https://musiquecdf.ch/'
ATTRIBUTION = 'Source: Société de Musique de La Chaux-de-Fonds (musiquecdf.ch)'
KIND = 'venue'
TIME_LIMIT = 300

LISTING = 'https://musiquecdf.ch/concerts/'
TICKETS = 'https://musiquecdf.ch/billetterie/'
CITY = 'La Chaux-de-Fonds'
SERIES = {'grande-serie': 'Grande Série', 'collaboration': 'Collaboration', 'nouveau-talent': 'Nouveaux Talents'}

_WIDGET_RE = re.compile(r'elementor-widget-(text-editor|theme-post-title|heading)\b[^>]*>(.*?)</div>', re.S)


def _texts(chunk):
    """Text of the text-editor / heading widgets of an Elementor chunk, in page order."""
    out = []
    for kind, body in _WIDGET_RE.findall(chunk):
        body = re.sub(r'(?i)<br\s*/?>', ' / ', body)
        t = clean(body)
        if t:
            out.append((kind, t))
    return out


def parse_listing(html):
    """-> {post id: {'url', 'title', 'credits', 'start', 'venue', 'series'}} (each concert once)."""
    out = {}
    for chunk in (html or '').split('data-elementor-type="loop-item"')[1:]:
        pid = re.search(r'e-loop-item-(\d+)', chunk)
        link = re.search(r'href="(https://musiquecdf\.ch/concert/[^"]+)"', chunk)
        head = re.search(r'<h5[^>]*>(.*?)</h5>', chunk, re.S)
        if not pid or not link or not head or pid.group(1) in out:
            continue
        texts = [t for k, t in _texts(chunk) if k == 'text-editor']
        date = next((find_date(t) for t in texts if find_date(t)), None)
        hm = next((find_time(t) for t in texts if re.fullmatch(r'\d{1,2}[:h.]\d{2}', t.strip())), None)
        venue = next((t for t in texts if not find_date(t) and not re.fullmatch(r'\d{1,2}[:h.]\d{2}', t.strip())), None)
        if not date or not hm:
            continue
        lines = [clean(x) for x in re.split(r'(?i)<br\s*/?>', head.group(1)) if clean(x)]
        series = re.search(r'type-concert-([a-z-]+)', chunk)
        out[pid.group(1)] = {
            'url': link.group(1), 'lines': lines, 'start': local_iso(*date, *hm), 'venue': venue,
            'series': SERIES.get(series.group(1)) if series else None,
        }
    return out


def _line_credit(line):
    """'ADAM LALOUM piano' -> ('Piano', 'Adam Laloum'); 'ORCHESTRE ...' -> ('Orchestra', 'Orchestre ...')."""
    m = re.match(r'^(.*?[A-ZÀ-Ý.\'’)])\s+([a-zà-ÿ][a-zà-ÿ \-–&,]+)$', line)
    if m:
        name, label = smart_case(m.group(1)), m.group(2)
        role = known_role(label, name)
        if role:
            return role, name
    name = smart_case(line)
    g = group_role(name)
    return (g, name) if g else None


def parse_details(html):
    """Concert page -> (credits [(role, name)], program [(composer, title)])."""
    texts = [t for _, t in _texts(html or '')]
    try:
        p0 = max(i for i, t in enumerate(texts) if t == 'Programme')
    except ValueError:
        p0 = None
    a0 = next((i for i, t in enumerate(texts) if t == 'Artistes'), None)
    program, credits = [], []
    if p0 is not None:
        block = texts[p0 + 1:a0 if a0 and a0 > p0 else len(texts)]
        i = 0
        while i < len(block):
            if re.fullmatch(r'\d{1,2}\.', block[i]) and i + 1 < len(block):
                composer = block[i + 1]
                j = i + 2
                if j < len(block) and re.fullmatch(r'(?:vers|env\.?|ca\.?|né[e]? en)?[\d*()\s\-–/?.c]+', block[j]):
                    j += 1                                       # life dates
                title = block[j] if j < len(block) and not re.fullmatch(r'\d{1,2}\.', block[j]) else ''
                program.append((caps_words(composer), title))
                i = j + 1
            else:
                i += 1
    if a0 is not None:
        block = texts[a0 + 1:]
        i = 0
        while i < len(block):
            t = block[i]
            if t.startswith('Copyright') or t.startswith('Politique'):
                break
            if len(t) > 80:                                      # a presentation paragraph, never taken
                i += 1
                continue
            nxt = block[i + 1] if i + 1 < len(block) else ''
            if nxt and nxt[:1].islower():                        # "ADAM LALOUM" + "piano"
                role = known_role(nxt, smart_case(t))
                if role is None:
                    role = role_for(nxt) if len(nxt) <= 30 else 'Performer'
                if role:
                    credits.append((role, caps_words(t)))
                i += 2
                continue
            name = caps_words(t)
            credits.append((group_role(name) or 'Performer', name))
            i += 1
    return credits, program


def _merge_credits(listed, page):
    """The concert list's line-up is the more careful one (the pages have typos such as a
    missing first letter); the page adds people the list does not name."""
    out = list(listed)
    names = [fold(n) for _, n in listed]
    for role, name in page:
        f = fold(name)
        if len(name) > 80:
            continue                                          # a sentence, not a name
        last = f.split()[-1] if f.split() else f
        if any(f in n or n in f or (last and last == n.split()[-1]) for n in names if n):
            continue
        out.append((role, name))
    return out


def fetch():
    today = today_zurich()
    concerts = parse_listing(get(LISTING))           # FetchError propagates: build reuses yesterday's events
    if not concerts:
        raise FetchError(LISTING, 'no concerts found on the concert list')
    events = []
    for pid, c in sorted(concerts.items(), key=lambda kv: kv[1]['start']):
        if to_zurich_datetime(c['start']).date() < today:
            continue
        title = ' · '.join(caps_words(x) for x in c['lines'])
        credits = [cr for cr in (_line_credit(x) for x in c['lines']) if cr]
        program = []
        if requests_left() > 0:
            try:
                page_credits, program = parse_details(get(c['url']))
                credits = _merge_credits(credits, page_credits)
            except FetchError as err:
                log.warning('%s: no details for %s: %s', KEY, c['url'], err)
        venue = c['venue'] or 'Salle de musique'
        try:
            events.append(make_event(
                KEY, pid, title, c['start'], city=CITY, venueName=venue, series=c['series'],
                type=infer_type(title, credits, program=program), credits=credits, program=program,
                url=c['url'], ticketUrl=TICKETS,
                status='cancelled' if looks_cancelled(title) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, pid, err)
    return events
