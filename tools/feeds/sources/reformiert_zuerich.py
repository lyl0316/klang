"""Reformierte Kirche Zürich: concerts in the city's Reformed churches (Grossmünster,
Fraumünster, St. Peter, Predigerkirche, Wasserkirche, Neumünster, Johanneskirche …).

    https://reformiert-zuerich.ch/api/v1/erpkg/events/?areas=3&current=true&page_size=100&page=N
        every upcoming event in the "Musik" area, all church districts (about 4 pages)
    https://reformiert-zuerich.ch/api/v1/erpkg/events/?church_district=KK_1&current=true&page_size=100&q=Konzert
        city-centre concerts that are not tagged "Musik" (one page)

The JSON has ``key_data.begin``/``end`` with the Swiss offset, the church/room in
``elements`` (class_type 1 = place, 9 = person "Name (Funktion)"), and audience/area tags
in ``publications``. Event pages are https://reformiert-zuerich.ch/event/<slug>/.

Kept: concerts only. Dropped: services and devotions even with music (Gottesdienst,
Andacht, Evensong), rehearsals, sing-alongs, children's and family formats, guided tours,
talks, workshops, musicals, parties, and gospel/jodel/band events. Only facts are used
(title, time, church, the musicians named in ``elements``); the descriptions are not read.

An event without a church in ``elements`` (an outside organiser's concert, e.g. "Weihnachtskonzert
bei Kerzenlicht") links to the organiser's page for details. That page is fetched (at most
three per run, robots.txt obeyed) only to find which church the event's date is in: the
church must be one of the city's Reformed churches named below, near that date. Nothing
else is taken from it.

The site's terms ask for consent before its content is reproduced. Klang republishes
facts only (date, time, title, church, performers, links back).
"""
from __future__ import annotations

import re

from common import (FetchError, clean, get, get_json, guess_type, log, looks_cancelled, make_event, requests_left,
                    to_zurich_datetime, to_zurich_iso)

from ._consent import fold, group_role, looks_like_person, role_en

KEY = 'reformiert_zuerich'
NAME = 'Reformierte Kirche Zürich'
SITE = 'https://reformiert-zuerich.ch/'
ATTRIBUTION = 'Source: Reformierte Kirche Zürich (reformiert-zuerich.ch). Facts only; details there.'
KIND = 'venue'
MAX_REQUESTS = 12
TIME_LIMIT = 180

API = 'https://reformiert-zuerich.ch/api/v1/erpkg/events/'
MUSIC = API + '?areas=3&current=true&page={n}&page_size=100'
CENTRE = API + '?church_district=KK_1&current=true&page=1&page_size=100&q=Konzert'
EVENT_URL = 'https://reformiert-zuerich.ch/event/{slug}/'
MAX_PAGES = 8

_SERVICE_TAGS = {'gottesdienst', 'gottesdienst / andacht', 'gottesdienst & feier', 'andacht', 'feier'}
_DROP_RE = re.compile(
    r'gottesdienst|andacht|evensong|abendmahl|predigt|segnung|\bfeier\b|chorprobe|bandprobe|\bprobe\b|'
    r'singe mit|mitsing|sing-?along|\bsingen\b|singwoche|offenes? |pop-?up|kinder|familie|\bkids\b|'
    r'f[üu]hrung|werkstatt|vortrag|gespr[äa]ch|kurs\b|workshop|musical|party|marionett|mittagessen|'
    r'gloggi|halloween|gospel|jodel|jodler|generationsband|\bband\b|heilsarmee|weihnachtsspiel|krippenspiel|'
    r'meditation|tanz|surprise am mittag', re.I)     # 'Surprise am Mittag' also books stand-up comedy
# a short devotion with music ('… Orgelmusik, einem Gedanken und einem Segen …'), read from the
# subtitle for classification only (the text itself is never republished)
_DEVOTION_RE = re.compile(r'\bsegen\b|gebet|andacht|gottesdienst|liturgi|predigt', re.I)
_CONCERT_RE = re.compile(
    r'konzert|orgel|kantate|kantaten|oratori|requiem|passion|messe\b|liederabend|lieder\b|quartett|quartet|trio\b|'
    r'\bduo\b|ensemble|chor\b|chorkonzert|kantorei|kammer|sinfon|orchest|cembalo|am mittag|matinee|abendmusik|'
    r'serenade|winterreise|vocal|a cap+ella|recital|rezital|klavier|piano|violin|cello|kerzenlicht|stabat|'
    r'magnificat|bach\b|mozart|händel|haendel|vivaldi|barock|alte musik|musik\b|morgenmusik|sinfonietta|cantus', re.I)


def _title(e):
    t = clean((e.get('texts') or {}).get('title') or e.get('display_name'))
    # 'Richard Vardigans | Oper mal anders 14.00 & 16.30 h' -> drop the clock times
    t = re.sub(r'\s*\d{1,2}[.:]\d{2}(?:\s*(?:&|und|,)\s*\d{1,2}[.:]\d{2})*\s*h\b\.?', '', t)
    t = re.sub(r'\s*\|\s*$', '', t).strip(' |')
    return t


def _subtitle(e):
    return clean((e.get('texts') or {}).get('short_title'))


def _tags(e):
    return {fold(p.get('name')) for p in e.get('publications') or [] if isinstance(p, dict)}


def is_concert(e):
    title, sub = _title(e), _subtitle(e)
    if _tags(e) & _SERVICE_TAGS and not re.search(r'konzert', title, re.I):
        return False
    text = f'{title} {sub}'
    if _DROP_RE.search(text):
        return False
    if not re.search(r'konzert', text, re.I) and \
            _DEVOTION_RE.search(clean((e.get('texts') or {}).get('subtitle'))):
        return False
    return bool(_CONCERT_RE.search(text))


def _place_and_people(e):
    place, people = None, []
    for el in e.get('elements') or []:
        if not isinstance(el, dict):
            continue
        name = clean(el.get('name'))
        m = re.match(r'^(.+?)\s*\(([^()]+)\)$', name)
        if el.get('class_type') == 1 and place is None and not m:
            place = name
        elif m:
            r = role_en(m.group(2))
            if m.group(2).lower() in ('musiker', 'musikerin', 'musik'):
                r = 'Performer'
            if r:
                people.append((r, m.group(1)))
    return _venue(place), people


_CLERGY_RE = re.compile(r'^(pfr\.?|pfarrer(in)?|pfarrperson|sozialdiakon|diakon|frau dr\.?|herr dr\.?|moderation)\b', re.I)
_MUSIC_TITLE_RE = re.compile(r'^(kantor(in)?|organist(in)?|kirchenmusiker(in)?|musikalische leitung:?)\s+', re.I)
_GENERIC_RE = re.compile(r'^(vokal)?solist|^orchester mit|^musiker|^student|^chor$|^ensemble$|^gäste', re.I)


def _text_people(text):
    """The performer line of an event ('Kantorei St. Peter • Kantorin Deborah Züger, Leitung',
    'Mitwirkende: Trio X | João Bastos – Flöte | …') -> [(role, name)]. Prose is ignored: the
    line must be a list ('•' or '|') of 'Name, Rolle' items or group names."""
    t = clean(text)
    t = re.sub(r'(?i)^mitwirkende\s*:\s*', '', t)
    if not t or not re.search(r'[•|]', t):
        return []
    out = []
    for seg in re.split(r'\s*[•|]\s*', t):
        for part in re.split(r'\s+&\s+(?=[^,–—]+[,–—])', seg):
            part = part.strip(' .;')
            if not part or len(part) > 90 or _CLERGY_RE.match(part):
                continue
            part = _MUSIC_TITLE_RE.sub('', part)
            m = re.match(r'^([^,–—]+?)\s*(?:,|–|—|\s-\s)\s*([^,–—]+)$', part)
            if m:
                name, r = m.group(1).strip(), role_en(m.group(2))
                g = group_role(name)
                if r and g and r in ('Conductor', 'Orchestra', 'Choir', 'Ensemble'):
                    out.append((g, name))            # 'Jugendsymphonie-Orchester X, Leitung'
                elif r and not g and looks_like_person(name, max_words=5):
                    out.append((r, name))
                continue
            g = group_role(part)
            if g and not _GENERIC_RE.search(part) and len(part) <= 60 and part[:1].isupper():
                out.append((g, part))
    return out


def _venue(place):
    """'Grossmünster, Kirche' -> 'Grossmünster'; 'Lavaterhaus - Lavatersaal' -> 'Lavaterhaus, Lavatersaal'."""
    if not place or re.search(r'siehe beschreibung', place, re.I):
        return None
    p = re.sub(r',\s*Kirche$', '', place)
    p = re.sub(r'\s+-\s+(Kirchenschiff|Kirche)$', '', p)
    p = re.sub(r'\s+-\s+', ', ', p)
    return p


# the Reformed churches of Zürich, as this reader names them elsewhere
_CHURCHES = (
    (r'fraum[üu]nster', 'Fraumünster'), (r'grossm[üu]nster', 'Grossmünster'), (r'st\.?\s*peter', 'Kirche St. Peter'),
    (r'predigerkirche|predigern', 'Predigerkirche'), (r'wasserkirche', 'Wasserkirche'),
    (r'neum[üu]nster', 'Kirche Neumünster'), (r'johanneskirche', 'Johanneskirche'), (r'pauluskirche', 'Pauluskirche'),
    (r'markuskirche', 'Markuskirche, Seebach'), (r'kirche enge', 'Kirche Enge'), (r'kirche fluntern', 'Kirche Fluntern'),
    (r'kirche unterstrass', 'Kirche Unterstrass'), (r'kirche oberstrass', 'Kirche Oberstrass'),
    (r'kirche letten', 'Kirche Letten'), (r'kirche st\.?\s*jakob', 'Kirche St. Jakob'), (r'kirche leimbach', 'Kirche Leimbach'),
    (r'alte kirche wollishofen', 'Alte Kirche Wollishofen'), (r'kirche b[üu]hl', 'Kirche Bühl Wiedikon'),
    (r'thomaskirche', 'Thomaskirche Im Gut'), (r'lavaterhaus', 'Lavaterhaus'),
)
_DE_MONTHS = ('januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober',
              'november', 'dezember')
MAX_ORGANISER_PAGES = 3


def _links(node):
    """External links in the API's rich-text ``description`` (a list of nodes)."""
    out = []
    if isinstance(node, list):
        for n in node:
            out += _links(n)
    elif isinstance(node, dict):
        attrs = node.get('attrs') if isinstance(node.get('attrs'), dict) else {}
        href = attrs.get('href')
        if node.get('type') == 'a' and isinstance(href, str) and href.startswith('http') \
                and 'reformiert-zuerich.ch' not in href:
            out.append(href)
        out += _links(node.get('children'))
    return out


def church_on_date(page, start):
    """The Zürich Reformed church named right after the event's date on an organiser's page
    ('Donnerstag, 10. Dezember 2026, 20.00 Uhr Fraumünster Zürich'), else None."""
    text = clean(re.sub(r'(?is)<(script|style)\b.*?</\1>', ' ', page or ''))
    day = start.day
    dates = [rf'\b0?{day}\.\s*{_DE_MONTHS[start.month - 1]}\s+{start.year}', rf'\b0?{day}\.0?{start.month}\.(?:{start.year}|{start.year % 100})\b']
    for d in dates:
        for m in re.finditer(d, text, re.I):
            window = text[m.end():m.end() + 80]
            window = re.split(r'\b\d{1,2}\.\s*[A-Za-zä]+\s+\d{4}|\b\d{1,2}\.\d{1,2}\.\d{2,4}', window)[0]  # up to the next date
            for rx, name in _CHURCHES:
                if re.search(rx, window, re.I):
                    return name
    return None


def _type(title, sub, credits):
    text = f'{title} {sub}'
    if re.search(r'orgel', text, re.I):
        return 'recital'
    if re.search(r'chor|kantorei|vocal|a cap+ella|cantus|kantate|oratori|requiem|passion|messe\b|magnificat', text, re.I):
        return 'vocal-opera'
    t = guess_type(text)
    if t:
        return t
    roles = {r for r, _ in credits}
    if 'Orchestra' in roles:
        return 'orchestral'
    return None


def _results(url):
    data = get_json(url)
    if not isinstance(data, dict) or not isinstance(data.get('results'), list):
        raise FetchError(url, 'unexpected API answer')
    return data


def fetch():
    rows, n = [], 1
    data = _results(MUSIC.format(n=n))             # FetchError -> reuse yesterday's events
    rows += data['results']
    while data.get('next') and n < MAX_PAGES:
        n += 1
        try:
            data = _results(MUSIC.format(n=n))
        except FetchError as err:
            log.warning('%s: page %d failed: %s', KEY, n, err)
            break
        rows += data['results']
    try:
        rows += _results(CENTRE)['results']
    except FetchError as err:
        log.warning('%s: city-centre query failed: %s', KEY, err)

    events, seen, skipped = [], set(), 0
    organiser_pages = {}

    def organiser_church(e):
        start = to_zurich_datetime(e['key_data']['begin'])
        for href in _links((e.get('texts') or {}).get('description'))[:1]:
            if href not in organiser_pages:
                if len(organiser_pages) >= MAX_ORGANISER_PAGES or requests_left() <= 1:
                    return None
                try:
                    organiser_pages[href] = get(href)
                except FetchError as err:
                    log.info('%s: organiser page unavailable: %s', KEY, err)
                    organiser_pages[href] = ''
            return church_on_date(organiser_pages[href], start)
        return None

    for e in rows:
        if not isinstance(e, dict) or e.get('id') in seen:
            continue
        seen.add(e.get('id'))
        kd = e.get('key_data') or {}
        if not kd.get('begin') or not is_concert(e):
            skipped += 1
            continue
        title, sub = _title(e), _subtitle(e)
        venue, people = _place_and_people(e)
        if not venue and not clean((e.get('address') or {}).get('street')):
            venue = organiser_church(e)                # 'Weihnachtskonzert bei Kerzenlicht' -> 'Fraumünster'
        city = clean((e.get('address') or {}).get('location')) or 'Zürich'
        credits = []
        for r, name in people + _text_people((e.get('texts') or {}).get('text')):
            credits.append((r if r != 'Performer' else (group_role(name) or 'Performer'), name))
        slug = e.get('slug') or f"event-{e['id']}"
        series = None
        line = clean((e.get('texts') or {}).get('subtitle'))
        if re.match(r'(?i)konzertreihe\b', title) and line and len(line) <= 90 and \
                not re.search(r'[.!?]\s', line) and not sub:
            # 'Konzertreihe Predigern' is the series; its one-line name says which concert it is
            series, title = title, line
        try:
            events.append(make_event(
                KEY, str(e['id']), title, to_zurich_iso(kd['begin']), end=kd.get('end'), city=city,
                venueName=venue, type=_type(title, sub, credits), series=series, credits=credits,
                url=EVENT_URL.format(slug=slug),
                status='cancelled' if looks_cancelled(f'{title} {sub}') else None))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, e.get('id'), err)
    log.info('%s: %d events read, %d concerts kept, %d skipped', KEY, len(seen), len(events), skipped)
    return events
