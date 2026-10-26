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

The site's terms ask for consent before its content is reproduced. Klang republishes
facts only (date, time, title, church, performers, links back).
"""
from __future__ import annotations

import re

from common import FetchError, clean, get_json, guess_type, log, looks_cancelled, make_event, to_zurich_iso

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
