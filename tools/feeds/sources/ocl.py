"""Orchestre de Chambre de Lausanne (OCL): the orchestra's concerts in Lausanne.

    https://www.ocl.ch/concerts/        one request: every concert of the season (current)
    https://www.ocl.ch/                 one request: the link to the season .ics
    https://www.ocl.ch/wp-content/uploads/…/OCL_2026-2027_Saison_Complete.ics

The season .ics (published in May) has exact start times, the works ("Composer" then
"• work" lines) and the performers ("Name – Rôle" under INTERPRÈTES) in DESCRIPTION; only
those facts are read, never the presentation texts. The /concerts/ page is the current
state: it gives each concert's page (used as the link) and its dates. An .ics date that
no longer appears there is dropped as outdated, and a single time shown there wins over
the .ics. Concerts only on /concerts/ are added when they are in Switzerland and show a
single start time (e.g. the "Sociétés chorales vaudoises" concerts).

Skipped: "Les Découvertes" (young-audience and baby concerts), "L'OCL pour tous" (not open
to the public), tours abroad, and the Opéra de Lausanne / Béjart Ballet collaborations
(several start times per listing; the Opéra de Lausanne reader covers its own productions).
Tour dates in Switzerland without a start time (Martigny, Gstaad) cannot be listed.

robots.txt: Crawl-delay 10 (honoured by common.get). The site's terms claim all of its
content; Klang republishes facts only (date, time, title, venue, performers, works, links).
"""
from __future__ import annotations

import re
from datetime import datetime

from common import (FetchError, ZURICH, clean, get, log, looks_cancelled, make_event, parse_ics, to_zurich_iso,
                    today_zurich)

from ._consent import fold, group_role, looks_like_person, role_en, swiss_town

KEY = 'ocl'
NAME = 'Orchestre de Chambre de Lausanne'
SITE = 'https://www.ocl.ch/'
ATTRIBUTION = 'Source: Orchestre de Chambre de Lausanne (ocl.ch). Facts only; details and tickets on ocl.ch.'
KIND = 'orchestra'
MAX_REQUESTS = 6
TIME_LIMIT = 180

HOME = 'https://www.ocl.ch/'
CONCERTS = 'https://www.ocl.ch/concerts/'
ICS_FALLBACK = 'https://www.ocl.ch/wp-content/uploads/2026/05/OCL_2026-2027_Saison_Complete.ics'
ORCHESTRA = 'Orchestre de Chambre de Lausanne'

FR_MONTHS = {'janvier': 1, 'fevrier': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6, 'juillet': 7, 'aout': 8,
             'septembre': 9, 'octobre': 10, 'novembre': 11, 'decembre': 12}
_SKIP_TYPES = {'les-decouvertes', 'locl-pour-tous', 'a-letranger', 'tournee-europeenne', 'opera-de-lausanne',
               'bejart-ballet'}
_YOUNG_RE = re.compile(r'd[èe]s \d+ ans|b[ée]b[ée]|jeune public|concert jeunesse|portes ouvertes|scolaire|'
                       r'non ouverts? au public|d[ée]couvertes', re.I)


# ---------------------------------------------------------------------------
# /concerts/
# ---------------------------------------------------------------------------

def parse_dates(text):
    """'25, 27, 30 avril, 02 mai 2027 | 15h, 17h' -> ([date, …], [(h, m), …])"""
    left, _, right = (text or '').partition('|')
    times = [(int(h), int(m or 0)) for h, m in re.findall(r'\b(\d{1,2})\s*h\s*(\d{2})?', right)]
    year_m = re.search(r'(\d{4})', left)
    if not year_m:
        return [], times
    year = int(year_m.group(1))
    days, pending = [], []
    for tok in re.split(r'\s*,\s*', left.replace(year_m.group(1), ' ')):
        m = re.match(r'^\s*(\d{1,2})(?:\s+([a-zéèûô]+))?\s*$', fold(tok))
        if not m:
            continue
        pending.append(int(m.group(1)))
        if m.group(2) and m.group(2) in FR_MONTHS:
            days += [(d, FR_MONTHS[m.group(2)]) for d in pending]
            pending = []
    out = []
    for d, mo in days:
        try:
            out.append(datetime(year, mo, d).date())
        except ValueError:
            continue
    return out, times


def parse_concerts_page(page_html):
    out = []
    for cls, cell in re.findall(r'<div class="cell masonry-item ([^"]*)">(.*?)(?=<div class="cell masonry-item|<!--fwp-loop-->|$)',
                                page_html or '', re.S):
        url = re.search(r'<a href="(https://www\.ocl\.ch/concert/[^"]+)"', cell)
        h3 = re.search(r'<h3>(.*?)</h3>', cell, re.S)
        loc = re.search(r'<p class="location[^"]*">(.*?)</p>', cell, re.S)
        when = re.search(r'<span class="date">(.*?)</span>', cell, re.S)
        if not url or not when:
            continue
        dates, times = parse_dates(clean(when.group(1)))
        people = [(clean(b).lstrip('–- ').strip(), clean(a)) for a, b in re.findall(r'<p><strong>(.*?)</strong>(.*?)</p>', cell, re.S)]
        out.append({'url': url.group(1), 'types': set(re.findall(r'type_concert-([a-z0-9-]+)', cls)),
                    'title': clean(h3.group(1)) if h3 else '', 'location': clean(loc.group(1)) if loc else '',
                    'dates': dates, 'times': times, 'people': people})
    return out


def _tokens(text):
    t = fold(text).replace('n°', ' ')
    return {re.sub(r's$', '', w) for w in re.findall(r'[a-z]+|\d+', t) if w not in ('l', 'le', 'la', 'les', 'de', 'n')}


# ---------------------------------------------------------------------------
# .ics DESCRIPTION -> facts
# ---------------------------------------------------------------------------

def parse_description(desc):
    """-> (program [(composer, work)], credits [(role, name)])"""
    program, credits = [], []
    lines = [l.strip() for l in (desc or '').split('\n')]
    composer, in_people = None, False
    for i, line in enumerate(lines):
        if not line:
            composer = None
            if in_people:
                in_people = False
            continue
        if re.match(r'(?i)^interpr[èe]tes\b', line):
            in_people, composer = True, None
            continue
        if re.match(r'(?i)^(lieu|horaire|informations|billetterie|nb|reprise|diffus|dur[ée]e)\b', line):
            in_people, composer = False, None
            continue
        if in_people:
            m = re.match(r'^(.+?)\s+[–—-]\s+(.+)$', line)
            if m:
                name, role = m.group(1).strip(), m.group(2).strip()
                r = role_en(role)
                if r is None:
                    r = role[:1].upper() + role[1:]
                if r and len(name) <= 80:
                    credits.append((r, name))
            elif len(line) <= 80:
                # 'Ensemble Vocal de Lausanne', "L'OCL avec l'orchestre de l'HEMU"; prose such as
                # 'Lectures de textes autour de Beethoven' or 'Étudiant(e)s de …' is not a credit
                for part in re.split(r'\s+avec\s+', line):
                    part = re.sub(r"^(?i:l['’]|le |la |les )(?=orchestre|ensemble|ch[oœ]ur|quatuor)", '', part.strip())
                    part = part[:1].upper() + part[1:]
                    if re.fullmatch(r"(?i)(?:l['’])?ocl", part) or fold(part) == fold(ORCHESTRA):
                        credits.append(('Orchestra', ORCHESTRA))
                    elif group_role(part):
                        credits.append((group_role(part), part))
                    elif _is_name(part):
                        credits.append(('Performer', part))
            continue
        if line.startswith('•'):
            if composer:
                program.append((composer, line.lstrip('• ').strip()))
            continue
        nxt = lines[i + 1] if i + 1 < len(lines) else ''
        if nxt.startswith('•') and looks_like_person(line, max_words=6):
            composer = line
    return program, credits


_PARTICLES = {'de', 'du', 'des', 'van', 'von', 'der', 'da', 'di', 'la', 'le', 'del', 'della', 'ten', 'y', 'e'}


def _is_name(text):
    """'Anna Vieira Leite' yes; 'Lectures de textes autour de Beethoven' no."""
    words = text.split()
    return looks_like_person(text, max_words=5) and \
        all(w[:1].isupper() or w in _PARTICLES or w[:2] in ("d'", "d’") for w in words)


def _guest_group(desc):
    """'Carte blanche à l'Orchestre de l'HEMU' -> 'Orchestre de l'HEMU' (the OCL does not play)."""
    m = re.search(r"(?im)carte blanche (?:à|a) (?:l['’]|la |le |les )?((?:orchestre|ensemble|quatuor|ch[oœ]ur)\b[^\n]{0,60})$",
                  desc or '')
    if not m:
        return None
    name = m.group(1).strip(' .')
    return name[:1].upper() + name[1:]


def _concert_type(title, program, credits, types=()):
    t = fold(f"{title} {' '.join(w for _, w in program)}")
    if re.search(r'messie|messiah|requiem|messe|oratori|passion|cantate|stabat|magnificat|chorale|choeur', t) \
            or 'societes-chorales-vaudoises' in types:
        return 'vocal-opera'
    if re.search(r'recital', t):
        return 'recital'
    if re.search(r'entracte', t):
        return 'chamber'
    return 'orchestral'


def _venue_city(location):
    """'Salle Métropole, Place de la Palud 2, 1003 Lausanne' -> ('Salle Métropole', 'Lausanne')."""
    parts = [p.strip() for p in (location or '').split(',') if p.strip()]
    city = None
    for p in reversed(parts):
        m = re.match(r'^\d{4}\s+(.+)$', p)
        if m:
            city = m.group(1)
            break
    if not city and parts:
        city = swiss_town(parts[-1])
    return (parts[0] if parts else None), (city or 'Lausanne')


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def fetch():
    today = today_zurich()
    try:
        cells = parse_concerts_page(get(CONCERTS))
    except FetchError as err:
        log.warning('%s: /concerts/ failed (%s); using the .ics alone', KEY, err)
        cells = []
    ics_url = ICS_FALLBACK
    try:
        links = re.findall(r'https://www\.ocl\.ch/wp-content/uploads/[^"\'\s<>]+?\.ics', get(HOME))
        if links:
            ics_url = sorted(set(links))[-1]          # the newest upload path sorts last
    except FetchError as err:
        log.warning('%s: home page failed (%s); using the known .ics link', KEY, err)
    vevents = parse_ics(get(ics_url, accept='text/calendar'))     # FetchError -> reuse yesterday
    if not vevents:
        raise FetchError(ics_url, 'no events in the season .ics')

    events, used_cells, skipped = [], set(), {}
    for e in vevents:
        if e['all_day'] or not e['start'] or e['start'].date() < today:
            continue
        summary = clean(e['summary'])
        if _YOUNG_RE.search(f"{summary} {e['description'][:200]}"):
            skipped['young audience'] = skipped.get('young audience', 0) + 1
            continue
        start = e['start']
        cell = None
        if cells:
            cands = [c for c in cells if start.date() in c['dates']]
            if not cands:
                skipped['not on /concerts/ any more'] = skipped.get('not on /concerts/ any more', 0) + 1
                log.info('%s: %s on %s is no longer on /concerts/; dropped', KEY, summary, start.date())
                continue
            series = summary.split('|')[0]
            cell = max(cands, key=lambda c: len(_tokens(series) & _tokens(c['title'] + ' ' + c['url'])))
            used_cells.add((cell['url'], start.date()))
            if len(cell['times']) == 1 and (start.hour, start.minute) != cell['times'][0]:
                h, m = cell['times'][0]
                log.info('%s: %s: time %s on /concerts/ wins over %s in the .ics', KEY, summary, f'{h}:{m:02d}',
                         start.strftime('%H:%M'))
                start = start.replace(hour=h, minute=m)
        program, credits = parse_description(e['description'])
        kind = _concert_type(summary, program, credits)
        guest = _guest_group(e['description'])
        if guest:
            if not any(fold(n) == fold(guest) for _, n in credits):
                credits.append((group_role(guest) or 'Ensemble', guest))
        elif kind != 'chamber' and kind != 'recital' and not any(fold(n) == fold(ORCHESTRA) for _, n in credits):
            credits.append(('Orchestra', ORCHESTRA))
        venue, city = _venue_city(e['location'])
        try:
            events.append(make_event(
                KEY, e['uid'] or f'{start:%Y%m%d%H%M}', summary, to_zurich_iso(start), end=e['end'],
                city=city, venueName=venue, type=kind, series=summary.split('|')[0].strip(), credits=credits,
                program=program, url=cell['url'] if cell else CONCERTS, ticketUrl=cell['url'] if cell else None,
                status='cancelled' if e['status'] == 'cancelled' or looks_cancelled(summary) else None))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, e['uid'], err)

    # concerts that are only on /concerts/ (not in the May .ics)
    for c in cells:
        if c['types'] & _SKIP_TYPES or _YOUNG_RE.search(c['title']):
            continue
        town = swiss_town(re.split(r'\s+[-–]\s+', c['location'])[-1]) if c['location'] else None
        if not town:
            continue
        for d in c['dates']:
            if d < today or (c['url'], d) in used_cells:
                continue
            if len(c['times']) != 1:
                skipped['no single start time'] = skipped.get('no single start time', 0) + 1
                continue
            h, m = c['times'][0]
            start = datetime(d.year, d.month, d.day, h, m, tzinfo=ZURICH)
            credits = []
            for role, name in c['people']:
                r = role_en(role) if role else (group_role(name) or 'Performer')
                if r is None:
                    r = role
                if r:
                    credits.append((r, name))
            venue = re.split(r'\s+[-–]\s+', c['location'])[0].strip()
            kind = _concert_type(c['title'], [], credits, c['types'])
            if kind == 'orchestral' or 'les-collaborations' in c['types']:
                credits.append(('Orchestra', ORCHESTRA))      # listed by the OCL as its own concert
            try:
                events.append(make_event(
                    KEY, f"{c['url'].rstrip('/').rsplit('/', 1)[-1]}-{d:%Y%m%d}", c['title'], to_zurich_iso(start),
                    city=town, venueName=venue, type=kind, credits=credits, url=c['url'], ticketUrl=c['url']))
            except ValueError as err:
                log.warning('%s: skipped %s: %s', KEY, c['url'], err)
    log.info('%s: %d .ics events, %d listing cells, %d events; skipped %s', KEY, len(vevents), len(cells),
             len(events), skipped)
    return events
