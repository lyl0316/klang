"""Kultur im Podium, Düdingen: the opera and concert subscription series at the Podium.

    https://www.kulturimpodium.ch/programm/      one request: the season with category, date and time
    https://www.kulturimpodium.ch/<slug>/        one request per kept performance (about 7)

The programme page lists every performance with its category (Oper, Konzert, Kinder,
Jazz, Musical, Show, Tanz), the Swiss local date and time ("Mittwoch, 28. Oktober 2026,
19:30") and the title. Only Oper and Konzert are kept. The performance page starts with
a short fact block: the composer ("von <b>Composer</b>"), the visiting orchestra or
company, and "Role <b>Name</b>" lines; works appear as "Title <b>Composer</b>". Only
those facts are taken, never the presentation text.

robots.txt: WordPress default (only /wp-admin/ disallowed). The Impressum names the
association; there are no terms of use about reuse.

Note: in the "Leitung" line of an opera the production team follows the conductor
("Leitung Franco Trinca, Dieter Kaegi, ..."); only the first name, the conductor, is kept.
"""
from __future__ import annotations

import re

from common import FetchError, clean, get, log, looks_cancelled, make_event, to_zurich_datetime, today_zurich
from ._westsouth import find_date, find_time, fold, group_role, infer_type, known_role, local_iso, role_for, \
    smart_case, split_names

KEY = 'kultur_im_podium'
NAME = 'Kultur im Podium Düdingen'
SITE = 'https://www.kulturimpodium.ch/'
ATTRIBUTION = 'Source: Kultur im Podium Düdingen (kulturimpodium.ch)'
KIND = 'venue'
MAX_REQUESTS = 25
TIME_LIMIT = 150

LISTING = 'https://www.kulturimpodium.ch/programm/'
TICKETS = 'https://www.kulturimpodium.ch/abonnenemts-und-tickets/'
VENUE, CITY = 'Podium Düdingen', 'Düdingen'
KEEP = {'oper': 'vocal-opera', 'konzert': None}

_BUTTON_RE = re.compile(r'awb-button__text--default">([^<]+)</span>')
_TITLE_RE = re.compile(r'<h3[^>]*><a href="(https://www\.kulturimpodium\.ch/[^"]+)"[^>]*>(.*?)</a></h3>', re.S)
_WORK_RE = re.compile(r'(?i)\d|konzert|sinfonie|symphonie|suite|sonate|ouvert|quartett|messe|requiem|passion|oratorium|'
                      r'kantate|variation|lieder|serenade|divertimento|fantasie|rhapsod|konzertant')


def parse_listing(html):
    """-> [{'url', 'title', 'category', 'when'}] in page order."""
    out, seen = [], set()
    for m in _TITLE_RE.finditer(html or ''):
        url, title = m.group(1), clean(m.group(2))
        if url in seen:
            continue
        before = _BUTTON_RE.findall(html[max(0, m.start() - 6000):m.start()])
        if len(before) < 2:
            continue
        seen.add(url)
        out.append({'url': url, 'title': title, 'category': clean(before[-2]), 'when': clean(before[-1])})
    return out


def _fact_lines(block):
    """Split the fact block into lines of (label text, [strong texts]). A <br> often sits
    inside <strong>, so the bold state is carried across line breaks."""
    out, label, strong, buf, inside = [], [], [], [], False
    for tok in re.split(r'(?i)(</?strong>|<br\s*/?>|</?p\b[^>]*>)', block):
        low = tok.lower()
        if low == '<strong>' or low == '</strong>':
            if inside and clean(''.join(buf)):
                strong.append(clean(''.join(buf)))
            elif not inside and clean(''.join(buf)):
                label.append(clean(''.join(buf)))
            buf, inside = [], low == '<strong>'
        elif low.startswith('<br') or low.startswith('</p') or low.startswith('<p'):
            if clean(''.join(buf)):
                (strong if inside else label).append(clean(''.join(buf)))
            buf = []
            if label or strong:
                out.append((' '.join(label).strip(' ,'), strong))
            label, strong = [], []
        else:
            buf.append(tok)
    if clean(''.join(buf)):
        (strong if inside else label).append(clean(''.join(buf)))
    if label or strong:
        out.append((' '.join(label).strip(' ,'), strong))
    return out


def parse_details(html):
    """Performance page -> (credits [(role, name)], program [(composer, title)])."""
    m = re.search(r'<div class="fusion-text fusion-text-2"[^>]*>(.*?)</div>', html or '', re.S)
    block = re.sub(r'\s+', ' ', m.group(1) if m else '')
    credits, program = [], []
    category = ''
    for label, strong in _fact_lines(block):
        if not category and not label and len(strong) == 1 and re.fullmatch(r'[A-ZÄÖÜ ]{3,20}', strong[0]):
            category = strong[0]                                   # "KONZERT", "OPER"
            continue
        if strong:
            names = [n for s in strong for n in split_names(s)]
            if fold(label) == 'von':                               # "von <b>Composer</b>"
                program.append((smart_case(' '.join(strong)), ''))
                continue
            if label and _WORK_RE.search(label) and len(strong) == 1:   # "Cellokonzert Nr. 1 <b>Haydn</b>"
                program.append((strong[0], label))
                continue
            if not label:
                continue
            words = [w for w in re.split(r'[\s,/&]+', label) if w and fold(w) not in ('und', 'et', 'e', 'and')]
            if len(words) > 1 and not all(known_role(w) is not None for w in words):
                if len(strong) == 1:                               # "Rumänische Volkstänze <b>Bartók</b>"
                    program.append((strong[0], label))
                continue
            role = known_role(label, names[0] if names else '')
            if role == '':
                continue
            if role is None:
                if len(label) > 25 or re.search(r'\d', label):
                    continue
                role = role_for(label)
            if role == 'Conductor' and category == 'OPER':
                names = names[:1]                                  # the production team follows the conductor
            for n in names:
                credits.append((role if role not in ('Orchestra', 'Ensemble', 'Choir') else (group_role(n) or role), n))
            continue
        plain = label
        if plain and len(plain) <= 80 and not re.search(r'(?i)\b(aus|mit|avec|with|koproduktion|management|sprache|übertitel)\b', plain):
            g = group_role(plain)
            if g:
                credits.append((g, plain))
    return credits, program


def fetch():
    today = today_zurich()
    items = parse_listing(get(LISTING))         # FetchError propagates: build reuses yesterday's events
    if not items:
        raise FetchError(LISTING, 'no performances found on the programme page')
    events = []
    for it in items:
        cats = {fold(c).strip() for c in it['category'].split(',')}
        cat = next((c for c in cats if c in KEEP), None)
        if not cat or 'ended' in cats:
            continue
        d, t = find_date(it['when']), find_time(re.sub(r'^.*?\b\d{4}\b', '', it['when']))
        if not d or not t:
            log.warning('%s: no date/time in %r', KEY, it['when'])
            continue
        start = local_iso(*d, *t)
        if to_zurich_datetime(start).date() < today:
            continue
        credits, program = [], []
        try:
            credits, program = parse_details(get(it['url']))
        except FetchError as err:
            log.warning('%s: no details for %s: %s', KEY, it['url'], err)
        program = [(c, w or it['title']) for c, w in program]
        kind = KEEP[cat] or infer_type(it['title'], credits, program=program)
        slug = it['url'].rstrip('/').rsplit('/', 1)[-1]
        try:
            events.append(make_event(
                KEY, f'{start[:10]}-{slug}', it['title'], start, city=CITY, venueName=VENUE, type=kind,
                series='Kultur im Podium', credits=credits, program=program, url=it['url'], ticketUrl=TICKETS,
                status='cancelled' if looks_cancelled(it['title']) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, it['url'], err)
    return events
