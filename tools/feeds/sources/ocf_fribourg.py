"""Orchestre de chambre fribourgeois (OCF): the orchestra's season, from its own site.

    https://www.ocf.ch/fr/concertskonzerte                        one request: every upcoming date
    https://www.ocf.ch/fr/concertskonzerte--archivesarchiv?event=N  one request per production

The listing gives each date's day, month, two-digit year, local start time, title and
place ("Equilibre, Fribourg", "Murten, Ryf 4 - Museum Murten", "Podium Düdingen"). The
event page adds the line-up ("<b>Direction</b> Name", "<b>Soliste</b> Name, soprano",
"<b>Violon</b> Name", "<b>Name</b> (character)") and the works ("<b>Composer</b> (dates)
<i>Title</i>" list items, or "<b>Composer</b> : Title" lines). Only those facts are
taken; the bilingual presentation texts are not. A production with several dates (an
opera run) is fetched once.

robots.txt: only a sitemap line, everything allowed. No terms of use on the site.

Note: "Mézières" in this listing is Mézières (FR) (Musée du Papier Peint), not Mézières VD.
"""
from __future__ import annotations

import re
from urllib.parse import urljoin

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, \
    today_zurich
from ._westsouth import fold, group_role, infer_type, is_not_a_concert, known_role, local_iso, role_for, split_names

KEY = 'ocf_fribourg'
NAME = 'Orchestre de chambre fribourgeois'
SITE = 'https://www.ocf.ch/'
ATTRIBUTION = 'Source: Orchestre de chambre fribourgeois (ocf.ch)'
KIND = 'orchestra'
MAX_REQUESTS = 40
TIME_LIMIT = 240

BASE = 'https://www.ocf.ch'
LISTING = BASE + '/fr/concertskonzerte'
ORCHESTRA = 'Orchestre de chambre fribourgeois'

# places the listing gives without a town
_PLACE_CITY = (('podium', 'Düdingen'), ('düdingen', 'Düdingen'), ('equilibre', 'Fribourg'), ('nuithonie', 'Villars-sur-Glâne'),
               ('forum fribourg', 'Granges-Paccot'), ('murten', 'Murten'), ('morat', 'Murten'), ('bulle', 'Bulle'))

_EVENT_RE = re.compile(r'<div class="event ">(.*?)<div class="clr">', re.S)


def _span(cls, html):
    m = re.search(r'<span class="%s">(.*?)</span>' % cls, html, re.S)
    return clean(m.group(1)) if m else ''


def parse_listing(html):
    """-> [{'sid', 'url', 'title', 'start', 'place'}]."""
    out = []
    for block in _EVENT_RE.findall(html or ''):
        link = re.search(r'<h2><a href="([^"]*event=(\d+))"[^>]*>(.*?)</a>', block, re.S)
        if not link:
            continue
        day, month, year, hm = _span('day', block), _span('month', block), _span('year', block), _span('time', block)
        place = re.search(r'<b class="place">(.*?)</b>', block, re.S)
        try:
            y = int(year)
            y = y + 2000 if y < 100 else y
            hh, mi = (int(x) for x in hm.split(':'))
            start = local_iso(y, int(month), int(day), hh, mi)
        except (ValueError, TypeError) as err:
            log.warning('%s: unreadable date for event %s: %s', KEY, link.group(2), err)
            continue
        out.append({'sid': link.group(2), 'url': urljoin(BASE, link.group(1).replace('&amp;', '&')),
                    'title': clean(link.group(3)), 'start': start, 'place': clean(place.group(1)) if place else ''})
    return out


def venue_city(place):
    """'Equilibre, Fribourg' -> ('Equilibre', 'Fribourg');
    'Murten, Ryf 4 - Museum Murten' -> ('Museum Murten', 'Murten'); 'Podium Düdingen' -> (.., 'Düdingen')."""
    p = clean(place)
    if not p:
        return None, 'Fribourg'
    if ' - ' in p:
        left, venue = p.split(' - ', 1)
        city = left.split(',')[0].strip()
    elif ',' in p:
        venue, city = (x.strip() for x in p.rsplit(',', 1))
    else:
        venue, city = p, None
    if not city or re.search(r'\d', city):
        city = next((c for frag, c in _PLACE_CITY if frag in fold(p)), 'Fribourg')
    if fold(city) == 'mezieres':
        city = 'Mézières (FR)'
    return venue.strip() or None, city


def _lines(segment):
    text = re.sub(r'\s+', ' ', segment)
    text = re.sub(r'(?i)<br\s*/?>|</p>|<p\b[^>]*>|</li>|<li\b[^>]*>|</ul>|<ul\b[^>]*>', '\n', text)
    return [ln.strip() for ln in text.split('\n') if clean(ln)]


_LABEL_RE = re.compile(r'^<(b|strong)>(.*?)</\1>\s*(.*)$', re.S)


def parse_details(html):
    """Event page -> (credits [(role, name)], program [(composer, title)], is_opera)."""
    page = html or ''
    start = page.find('class="wrapobject"')
    seg = page[start:] if start >= 0 else page
    seg = seg.split('-----', 1)[0].split('<div class="clr">', 1)[0]
    program, credits = [], []
    for comp, title in re.findall(r'<li>\s*<b>(.*?)</b>[^<]*<br\s*/?>\s*<(?:i|em)>(.*?)</(?:i|em)>', seg, re.S):
        program.append((clean(comp), clean(title)))
    seg_no_list = re.sub(r'<ul\b.*?</ul>', '\n', seg, flags=re.S)
    # drop prose paragraphs (presentation texts) before looking at lines
    seg_no_list = ''.join(p for p in re.split(r'(?i)(?=<p\b)', seg_no_list)
                          if len(clean(p)) <= 250 or len(re.findall(r'(?i)<(?:b|strong)>', p)) >= 2)
    prev = ''                                               # the line before a run of "•" works
    for raw in _lines(seg_no_list):
        plain = clean(raw)
        if len(plain) > 160:
            continue                                        # prose
        if plain[:1] in '•·-–*':                            # "L. v. Beethoven" / "• Trio op. 1 n° 1"
            if re.search(r'(?i)\b(op\.|n°|bwv|kv|hob)', plain):
                composer = prev if re.fullmatch(r"[A-ZÀ-Ý][\w.'’ -]{2,40}", prev) and known_role(prev) is None \
                    and not group_role(prev) else ''
                program.append((composer, plain.lstrip('•·-–* ')))
            continue
        prev = plain
        m = _LABEL_RE.match(raw)
        if m:
            label, value = clean(m.group(2)).rstrip(' :'), clean(m.group(3))
            if not value:
                continue
            if value.startswith(':'):                       # "<b>Composer</b> : Title"
                program.append((label, value.lstrip(': ')))
                continue
            if re.fullmatch(r'\(.*\)', value):              # "<b>Singer</b> (character)"
                credits.append(('Performer', label))
                continue
            role = known_role(label)
            if role is None or role == '':
                continue
            if role == 'Performer':                         # "Soliste(s)": each part carries its own role
                for part in re.split(r'\s*/\s*|\s*;\s*', value):
                    pm = re.match(r'^(.+?),\s*([^,]{3,40})$', part)
                    if pm and known_role(pm.group(2)):
                        credits.append((role_for(pm.group(2), pm.group(1)), pm.group(1)))
                    elif part:
                        credits.append((group_role(part) or 'Performer', part))
            else:
                for name in split_names(value):
                    credits.append((role if role not in ('Orchestra', 'Ensemble', 'Choir') else (group_role(name) or role), name))
            continue
        if re.match(r'(?i)^avec\s', plain):                 # "Avec l'Orchestre de l'HEMU et ..."
            for part in re.split(r'\s+et\s+|,\s*', plain[5:]):
                name = re.sub(r"^(?:l['’]|la |le |les )", '', part.strip(' .'), flags=re.I)
                name = name[:1].upper() + name[1:]
                if group_role(name):
                    credits.append((group_role(name), name))
            continue
        if not re.search(r'[.!?]$', plain) and '<' not in raw.replace('<strong>', '').replace('</strong>', ''):
            for part in plain.split(','):
                part = part.strip(' ,')
                if part and len(part) <= 70 and group_role(part):
                    credits.append((group_role(part), part))
    is_opera = False
    for raw in _lines(seg_no_list):
        m = re.match(r"(?i)^(?:op[ée]ra|oper)\b(?:.*?\bd['’]|.*?\bde |.*?\bvon )?([A-ZÀ-Ý][^()<,]+?)?\s*(?:\(|<|$)", clean(raw))
        if m and len(clean(raw)) < 120:
            is_opera = True
            if m.group(1) and not program:
                program.append((m.group(1).strip(), ''))
            break
    return credits, program, is_opera


def fetch():
    today = today_zurich()
    items = parse_listing(get(LISTING))             # FetchError propagates: build reuses yesterday's events
    if not items:
        raise FetchError(LISTING, 'no concerts found on the listing')
    details = {}                                     # normalised title -> parsed event page
    events = []
    for it in items:
        if to_zurich_datetime(it['start']).date() < today or is_not_a_concert(it['title']):
            continue
        key = fold(it['title'])
        if key not in details and requests_left() > 0:
            try:
                details[key] = parse_details(get(it['url']))
            except FetchError as err:
                log.warning('%s: no details for %s: %s', KEY, it['url'], err)
        credits, program, is_opera = details.get(key, ([], [], False))
        credits = list(credits)
        roles = {r for r, _ in credits}
        if ('Conductor' in roles or is_opera) and not any(fold(ORCHESTRA) in fold(n) for _, n in credits):
            credits.append(('Orchestra', ORCHESTRA))
        venue, city = venue_city(it['place'])
        if is_opera and program and not program[0][1]:
            program = [(program[0][0], it['title'].split(' - ')[0])] + list(program[1:])
        kind = 'vocal-opera' if is_opera else infer_type(it['title'], credits, program=program)
        try:
            events.append(make_event(
                KEY, it['sid'], it['title'], it['start'], city=city, venueName=venue, type=kind,
                credits=credits, program=program, url=it['url'],
                status='cancelled' if looks_cancelled(it['title']) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, it['sid'], err)
    return events
