"""Tonhalle Düsseldorf: the hall's calendar (its own series, the Düsseldorfer Symphoniker,
and the concerts of guest promoters), classical concerts only.

    https://www.tonhalle.de/api/events?type=dynamic&size=500&from=0    every upcoming project (JSON)
    https://www.tonhalle.de/veranstaltung/<series>/<id>-<slug>           one page per date

The site is an Inertia/React app. Its own front end reads the event list from
``/api/events`` (robots.txt allows it): one entry per project with its dates as real UTC
ISO strings ("2026-11-06T19:00:00+00:00" = 20:00 in Düsseldorf; checked against the
event pages' "20:00 Konzertbeginn" and their calendar entry on 29 Oct 2026), the title,
subtitle, the link of the first date (its path names the series) and the ticket link.
About 170 projects / 270 dates.

Performers, works and the hall are only on the date's own page (JSON in
``<script data-page="app">``: ``contributors.top`` = performers with their role,
``contributors.middle`` = composer + work, ``iconTextList`` = series, start, hall,
promoter). Dates of one project can have different programmes (Bamberger Symphoniker:
Beethoven 1–3 one night, 4–5 the next), so every date's page is read, incrementally: a date
the previous feed already has (same start, same title) keeps its details and is read
again only when it is within a week or due on a fixed two-week rotation
(common.refresh_due). The first page of a project lists the URLs of all its dates; the
numeric id in that URL is the event id. Pages left unread when the request cap is reached
are read on later runs; a date of the hall's own classical series that is still unread is
published with its title, time and link only.

Classical filter: the hall's own children's/family series (Plutino, Sterntaler,
Himmelblau, Sternschnuppen, Junior-Sternzeichen, Familienmusikfest, Ultraschall, school
formats), guided tours, comedy ("… geht ins Konzert"), the Virtuosen-Varieté and the
#IGNITION game/pop shows are skipped from the list alone. Guest promoters' concerts
("Komet") and the mixed Heinersdorff/special series are read and kept only when the page
lists composers' works or credits an orchestra, choir or conductor (or a free-text
programme names a classical composer); pop/jazz/tribute/musical/comedy titles are skipped
without reading the page. Readings with orchestra and no works (a moderator credited,
"Krimi-Abend") and sing-alongs are skipped. No terms on tonhalle.de forbid automated
reading (AGB and Impressum checked 29 Oct 2026).
"""
from __future__ import annotations

import json
import re

from common import (BudgetExceeded, FetchError, clean, get, get_json, log, looks_cancelled, make_event,
                    previous_events, refresh_due, requests_left, same_title, to_zurich_iso, today_zurich)

from ._consent import group_role, looks_like_person, role_en

KEY = 'tonhalle_duesseldorf'
NAME = 'Tonhalle Düsseldorf'
SITE = 'https://www.tonhalle.de/'
ATTRIBUTION = 'Source: Tonhalle Düsseldorf (tonhalle.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 140             # 1 for the list, the rest for date pages
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 14

BASE = 'https://www.tonhalle.de'
API = BASE + '/api/events?type=dynamic&size=500&from={offset}'
CITY = 'Düsseldorf'
HALL = 'Tonhalle Düsseldorf'

# series (path segment of the event link)
_SKIP_SERIES = {
    'fuehrungenguided-tours', 'plutino', 'sterntaler', 'himmelblau', 'ultraschall', 'sternschnuppen',
    'junior-sternzeichen', 'familienmusikfest', 'comedy-geht-ins-konzert', 'virtuosen-variete', 'ignition',
    'kleine-tonhalle', 'lauschpause',
}
_SKIP_SERIES_RE = re.compile(r'macht-schule|kita|familie|kinder|fuehrung')
# the hall's own classical series: kept even before their page has been read
_CLASSICAL_SERIES = {
    'sternzeichen', 'meisterkonzerte', 'piano-solo', 'raumstation', 'supernova', 'das-symphonische-palais',
    'na-hoern-sie-mal', 'big-bang-junge-tonhalle', 'relaxed-perfomances', 'cafe-konzert', 'fixsterne',
}
_SKIP_TITLE = re.compile(r'(?i)(?<!auf)führung|guided tour|singen\b|mitsingen|familien|für kinder|kita|schulen|'
                         r'für \d+\s*-\s*\d+ jahre|ab \d+ jahren|yoga|workshop|lesung')
_POP_HINT = re.compile(r'(?i)\btour\b|tour 20|tribute|\bshow\b|musical|comedy|kabarett|live in concert|the music of|'
                       r'the sound of|best of|abba|beatles|queen\b|bee gees|james bond|star wars|morricone|vangelis|'
                       r'gospel|tonies|loriot|\bjazz|big band|pop meets|rock the|filmmusik|film-?szenen|unplugged|'
                       r'volks-rock|chanson|happy 20\d\d|schluss jetzt|nuhr|krimi|\bdj\b|\bband\b|palast orchester')
_COMPOSER_HINT = re.compile(r'Bach|Mozart|Beethoven|Schubert|Schumann|Brahms|Chopin|Händel|Haendel|Vivaldi|Haydn|'
                            r'Tschaikowsky|Dvořák|Dvorak|Mahler|Bruckner|Verdi|Puccini|Wagner|Strauss|Strauß|Pärt|'
                            r'Debussy|Ravel|Rachmaninow|Schostakowitsch|Mendelssohn|Liszt|Bruch|Sibelius')
_CLASSICAL_ROLES = {
    'Conductor', 'Piano', 'Fortepiano', 'Harpsichord', 'Organ', 'Violin', 'Viola', 'Cello', 'Double bass', 'Harp',
    'Lute', 'Theorbo', 'Flute', 'Recorder', 'Oboe', 'Clarinet', 'Bassoon', 'Horn', 'Trumpet', 'Trombone', 'Tuba',
    'Soprano', 'Mezzo-soprano', 'Alto', 'Contralto', 'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass',
    'Baroque violin', 'Viola da gamba', 'Timpani', 'Concertmaster', 'Cor anglais',
}
_CHOIR_NAME_RE = re.compile(r'(?i)spatzen|sängerknaben|knabenchor|thomanerchor|kreuzchor|mädchenchor')
_OFFSTAGE_RE = re.compile(r'(?i)regie|szeni|ausstattung|bühne|licht|kostüm|dramaturg|einstudierung|konzept|video|'
                          r'choreinstudierung|text|idee|produktion')


# ---------------------------------------------------------------------------
# parsing
# ---------------------------------------------------------------------------

def _num_id(url):
    m = re.search(r'/(\d+)-[^/]*/?$', url or '')
    return m.group(1) if m else None


def _series_slug(link):
    parts = (link or '').strip('/').split('/')
    return parts[1] if len(parts) >= 3 and parts[0] == 'veranstaltung' else ''


def parse_page(page_html):
    """-> {'title', 'subTitle', 'dates': {iso_local: url}, 'icons': {icon: text}, 'top', 'middle', 'cta'}."""
    m = re.search(r'<script data-page="app" type="application/json">(.*?)</script>', page_html or '', re.S)
    if not m:
        raise ValueError('no Inertia page data')
    ev = json.loads(m.group(1)).get('props', {}).get('event') or {}
    dates = {}
    for d in ev.get('dates') or []:
        try:
            dates[to_zurich_iso(d['isoDateString'])] = d.get('url')
        except (KeyError, ValueError, TypeError):
            continue
    icons = {}
    for i in ev.get('iconTextList') or []:
        icons.setdefault(i.get('icon'), clean(i.get('text')))
    contrib = ev.get('contributors') or {}
    return {
        'title': clean(ev.get('title')), 'subTitle': clean(ev.get('subTitle')), 'date': ev.get('date'),
        'dates': dates, 'icons': icons, 'cta': ev.get('ctaUrl'),
        'top': [(clean(x.get('text')), clean(x.get('info'))) for x in contrib.get('top') or [] if clean(x.get('text'))],
        'middle': [(clean(x.get('text')), clean(x.get('info'))) for x in contrib.get('middle') or []],
    }


def _credit(name, info):
    """(role, name) or None for off-stage people."""
    if not info:
        if _CHOIR_NAME_RE.search(name):
            return ('Choir', name)
        return (group_role(name) or 'Performer', name)
    r = role_en(info)
    if r == '':
        return None
    if r is None:
        if _OFFSTAGE_RE.search(info):
            return None
        if re.search(r'(?i)moderation|sprecher|erzähl', info):
            return ('Presenter', name)
        g = group_role(name)
        if g and not looks_like_person(name, max_words=3):
            return (g, name)
        r = info[:1].upper() + info[1:] if len(info) <= 40 else 'Performer'
    return (r, name)


def details(d):
    """-> (credits, program, free_text) from a parsed page."""
    credits = [c for c in (_credit(n, i) for n, i in d['top']) if c]
    conductors = [c for c in credits if c[0] == 'Conductor']
    credits = conductors + [c for c in credits if c[0] != 'Conductor']
    program = [(c, t) for c, t in d['middle'] if c and t]
    free = ' '.join(t for c, t in d['middle'] if not c and t)
    return credits, program, free


def _role_parts(role):
    return set(re.split(r'\s*&\s*', role or ''))


def is_classical(d, credits, program, free):
    """Classical evidence on a page: composers' works, an orchestra/choir/conductor, or a free-text
    programme naming a classical composer; not a reading with orchestra and no works."""
    roles = [r for r, _ in credits]
    text = f"{d['title']} {d['subTitle']} {free}"
    if _POP_HINT.search(text):
        return False
    if program:
        return True
    if any(r == 'Presenter' for r in roles):
        return False                                     # 'Kein Mucks!': a Krimi-Abend with orchestra
    if any(r in ('Orchestra', 'Choir', 'Conductor') for r in roles):
        return True
    if free and _COMPOSER_HINT.search(free):
        return True
    return False


def _venue(marker):
    p = clean(marker)
    if not p:
        return HALL
    if re.search(r'(?i)saal|rotunde|foyer|tonhalle', p) and 'palais' not in p.lower():
        return p if p.lower().startswith('tonhalle') else f'{HALL}, {p}'
    return re.sub(r',\s*[^,]*(?:str\.|straße|strasse|platz|allee|weg\b).*$', '', p, flags=re.I)


def _type(series, credits):
    """'Das symphonische Palais' is the Symphoniker's chamber series (its title says 'symphonisch')."""
    if series == 'das-symphonische-palais' and not any(r == 'Orchestra' for r, _ in credits):
        return 'chamber'
    return None


def _series_label(d):
    label = d['icons'].get('price-flag') or ''
    label = re.split(r'\s+[–-]\s*', label)[0].strip()
    return None if not label or label.lower() == 'komet' else label


def _check_time(d, start):
    """The page's 'HH:MM Konzertbeginn' wins over the list's start when they differ."""
    m = re.search(r'(\d{1,2})[:.](\d{2})\s*Konzertbeginn', d['icons'].get('alarm') or '')
    if not m:
        return start
    hh, mm = int(m.group(1)), int(m.group(2))
    if (int(start[11:13]), int(start[14:16])) != (hh, mm):
        log.warning('%s: list says %s, page says %02d:%02d Konzertbeginn; using the page', KEY, start, hh, mm)
        return to_zurich_iso(f'{start[:10]}T{hh:02d}:{mm:02d}:00', assume='Europe/Berlin')
    return start


# ---------------------------------------------------------------------------
# fetch
# ---------------------------------------------------------------------------

def _projects():
    out, offset = [], 0
    for _ in range(10):
        data = get_json(API.format(offset=offset))
        out += data.get('events') or []
        offset = data.get('nextOffset')
        if not offset:
            break
    return out


def _prev_index():
    idx = {}
    for p in previous_events(KEY):
        try:
            idx.setdefault(to_zurich_iso(p['start']), []).append(p)
        except (KeyError, ValueError):
            continue
    return idx


def _find_prev(idx, start, title):
    for p in idx.get(start, []):
        if same_title(p.get('title'), title):
            return p
    return None


def _from_prev(p, cancelled):
    fields = {k: p.get(k) for k in ('durationMin', 'city', 'venueName', 'type', 'series', 'ticketUrl', 'url')}
    fields['credits'] = [(c.get('role'), c.get('name')) for c in p.get('credits') or []]
    fields['program'] = [(c.get('composer'), c.get('title')) for c in p.get('program') or []]
    sid = p['id'][len(KEY) + 1:]
    return make_event(KEY, sid, p['title'], p['start'], status='cancelled' if cancelled else p.get('status'),
                      **{k: v for k, v in fields.items() if v not in (None, '', [])})


def fetch():
    projects = _projects()
    if not projects:
        raise FetchError(API, 'no events in the list (API changed?)')
    today = today_zurich().isoformat()
    cands, skipped = [], {}

    def skip(why):
        skipped[why] = skipped.get(why, 0) + 1

    for pr in projects:
        link, title, sub = pr.get('link') or '', clean(pr.get('title')), clean(pr.get('subTitle'))
        series = _series_slug(link)
        if not title or series in _SKIP_SERIES or _SKIP_SERIES_RE.search(series):
            skip('tour/family/comedy series')
            continue
        if _SKIP_TITLE.search(f'{title} {sub}'):
            skip('tour/family/sing-along title')
            continue
        if series not in _CLASSICAL_SERIES and _POP_HINT.search(f'{title} {sub}'):
            skip('pop/jazz/show (list)')
            continue
        for iso in pr.get('isoDateStrings') or []:
            try:
                start = to_zurich_iso(iso)
            except ValueError:
                continue
            if start[:10] < today:
                continue
            cands.append({'project': pr, 'link': link, 'title': title, 'sub': sub, 'series': series,
                          'start': start, 'first': (pr.get('isoDateStrings') or [None])[0] == iso})
    cands.sort(key=lambda c: c['start'])

    idx = _prev_index()
    pages, date_urls = {}, {}           # url -> parsed page / project link -> {start: url}
    stop = False

    def read(url):
        nonlocal stop
        if url in pages:
            return pages[url]
        if stop or requests_left() <= 0:
            stop = True
            return None
        try:
            d = parse_page(get(BASE + url))
        except BudgetExceeded as err:
            log.warning('%s: stopped reading pages: %s', KEY, err.reason)
            stop = True
            return None
        except (FetchError, ValueError) as err:
            log.warning('%s: page %s failed: %s', KEY, url, err)
            pages[url] = None
            return None
        pages[url] = d
        return d

    events, reused, unread = [], 0, 0
    for c in cands:
        cancelled = looks_cancelled(f"{c['title']} {c['sub']}")
        prev = _find_prev(idx, c['start'], c['title'])
        if prev and prev.get('url') and not refresh_due(prev['id'], c['start'], near_days=REFRESH_NEAR_DAYS,
                                                         every_days=REFRESH_EVERY_DAYS):
            try:
                events.append(_from_prev(prev, cancelled))
                reused += 1
                continue
            except (ValueError, TypeError, KeyError) as err:
                log.info('%s: previous record unusable (%s), reading the page', KEY, err)
        url = None
        if c['link'] not in date_urls:
            first = read(c['link'])
            if first is not None:
                date_urls[c['link']] = first['dates']
        url = date_urls.get(c['link'], {}).get(c['start'])
        if not url and prev:
            url = re.sub(r'^https?://[^/]+', '', prev.get('url') or '') or None
        if not url and c['first']:
            url = c['link']
        d = read(url) if url else None
        if d is None:
            if prev:
                try:
                    events.append(_from_prev(prev, cancelled))
                    reused += 1
                    continue
                except (ValueError, TypeError, KeyError):
                    pass
            if c['series'] in _CLASSICAL_SERIES and url and _num_id(url):
                unread += 1
                try:
                    events.append(make_event(KEY, _num_id(url), c['title'], c['start'], city=CITY, venueName=HALL,
                                             ticketUrl=c['project'].get('ticketLink'), url=BASE + url,
                                             status='cancelled' if cancelled else 'scheduled'))
                except ValueError as err:
                    log.warning('%s: skipped %s: %s', KEY, c['title'], err)
            else:
                skip('page not read yet (uncertain series)')
            continue
        credits, program, free = details(d)
        if c['series'] not in _CLASSICAL_SERIES and not is_classical(d, credits, program, free):
            skip('not classical (page)')
            continue
        start = _check_time(d, c['start'])
        cancelled = cancelled or any(looks_cancelled(t) for t in d['icons'].values())
        try:
            events.append(make_event(
                KEY, _num_id(url) or url, d['title'] or c['title'], start, city=CITY,
                venueName=_venue(d['icons'].get('marker')), series=_series_label(d), credits=credits,
                type=_type(c['series'], credits),
                program=program, ticketUrl=d.get('cta') or c['project'].get('ticketLink'), url=BASE + url,
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, c['title'], err)
    log.info('%s: %d projects, %d dates considered, %d events (%d pages read, %d reused, %d without details); '
             'skipped %s', KEY, len(projects), len(cands), len(events), sum(1 for v in pages.values() if v),
             reused, unread, skipped)
    return events
