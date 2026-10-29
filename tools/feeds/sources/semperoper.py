"""Semperoper Dresden: opera, operetta, ballet and the house's recitals and soirées from the
Semperoper's own season calendar, with the cast of every evening from the production pages.

    https://www.semperoper.de/spielplan.html                               the whole season
    https://www.semperoper.de/spielplan/stuecke/stid/<slug>/<id>.html      one page per production

The calendar page embeds the full season as JSON (``document.NIS__SCHEDULE``: performance id,
production id, title, Unix start, genre, venue code; ~445 entries, Aug 2026 – Aug 2027, past
ones included) and renders the first 30 entries as HTML; the rest is loaded by script from a
URL we do not use. A production page carries one schema.org Event JSON-LD block per coming
performance (start with offset, status, ticket link, composer as "performer") and, per
performance, the evening's team and cast ("Musikalische Leitung", characters, choir and
orchestra). Production pages cost one request each and are read incrementally: a performance
the previous feed already has with its cast (same id, start and title) keeps it; the request cap
goes to productions still missing a cast, soonest first, then to productions playing in the next
two weeks and a fixed share of the others (each about once a week). A production page needs its
URL slug, which the JSON lacks: it comes from the calendar's 30 rendered entries, from the
previous feed, or from the overview pages "Oper & mehr", "Semperoper Ballett" and "Semper
Matinéen & Soiréen" (read only while a production's slug is unknown; ~3 requests).

The concerts of the Sächsische Staatskapelle (genre 2) are left to the reader
``staatskapelle_dresden``, whose pages list their programmes. Skipped: Junge Szene and other
children's formats (genres 31, 39, 43), the musical (genre 33), guided tours, "Kostprobe",
talks ("Aktenzeichen", symposia), the Semper Bar (cabaret and jazz), the opera ball, award
ceremonies, open days, guest performances elsewhere ("Gastspielort") and ballets without live
music (no "Musikalische Leitung" on the production page). A performance whose production page
cannot be read keeps the calendar's facts (title, time, venue). On 29 Oct 2026 the ballets
"Carmen", "Cinderella", "Parts and Pieces", "Different Grounds" and "Wings and Feathers" listed
no conductor (music from recordings, or not announced yet) and were left out until one appears. Only facts are taken (date,
time, title, venue, people, composer, links); never descriptions or images.
Checked against the website on 29 Oct 2026.
"""
from __future__ import annotations

import html as _html
import json
import re

from common import (BudgetExceeded, FetchError, clean, event_id, get, jsonld_events, log, looks_cancelled, make_event,
                    previous_event, previous_events, refresh_due, requests_left, to_zurich_datetime, today_zurich)

from ._saxony import berlin_iso, cast_credits, skip_reason, voice_role

KEY = 'semperoper'
NAME = 'Semperoper Dresden'
SITE = 'https://www.semperoper.de/'
ATTRIBUTION = 'Source: Semperoper Dresden (semperoper.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 90              # 1 calendar + ~3 overview pages + ~50 production pages
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 14
REFRESH_EVERY_DAYS = 7

BASE = 'https://www.semperoper.de'
CALENDAR = BASE + '/spielplan.html'
OVERVIEWS = (BASE + '/spielplan-tickets/oper-mehr.html', BASE + '/die-semperoper/semperoper-ballett.html',
             BASE + '/spielplan-tickets/semper-matineen-und-soireen.html')
CITY = 'Dresden'

GENRE_OPERA, GENRE_CONCERT, GENRE_BALLET, GENRE_EXTRA, GENRE_OPERETTA = 1, 2, 3, 5, 35
_KEEP_GENRES = {GENRE_OPERA, GENRE_BALLET, GENRE_EXTRA, GENRE_OPERETTA}
# genre 5 ('Extras') is mostly not concerts: keep only these
_EXTRA_KEEP = re.compile(r'(?i)soir[ée]e|liederabend|chorkonzert|rezital|recital|kammerkonzert|konzert\b|'
                         r'hochschule f[üu]r musik')
_EXTRA_SKIP = re.compile(r'(?i)semper bar|aktenzeichen|kostprobe|auftakt!|spaziergang|fenster aus jazz|opernball|'
                         r'verleihung|dresdance|treffpunkt|familientag|tag der offenen')

_VENUES = {
    'SSO': 'Semperoper Dresden', 'SSO2': 'Semperoper Dresden', 'SEMPER2': 'Semperoper Dresden, Semper Zwei',
    'FOYER': 'Semperoper Dresden, Rundfoyer', 'Rundfoyer': 'Semperoper Dresden, Rundfoyer',
    'KULTURPAL': 'Kulturpalast Dresden, Konzertsaal', 'Schlosskapelle': 'Schlosskapelle des Dresdner Residenzschlosses',
    'Hellerau': 'Festspielhaus Hellerau', 'Frauenkirche': 'Frauenkirche Dresden', 'DFK1': 'Frauenkirche Dresden',
    'Staatsoperette': 'Staatsoperette Dresden', 'Schauspielhaus_Kleines_Haus': 'Staatsschauspiel Dresden, Kleines Haus',
    'HistA': 'Semperoper Dresden', 'DDNeustadt': None, 'Gastspielort': None, 'Kleiner_Ballettsaal': None,
}


def _title(text):
    """'Liederabend: __Winterreise__ mit …' -> 'Liederabend: »Winterreise« mit …'."""
    t = clean(text)
    t = re.sub(r'__(.+?)__', lambda m: f'»{m.group(1).strip()}«', t)
    return clean(t.replace('__', ''))


def _venue(code):
    """Venue code(s) of the calendar ('SSO,SSO2') -> venue name, or None (not in Dresden / unknown)."""
    for part in clean(code).split(','):
        if part in _VENUES:
            return _VENUES[part]
    return 'Semperoper Dresden' if not code else None


def parse_calendar(page_html):
    """-> (performances, slugs): the season JSON and {production id: slug} of the rendered entries."""
    h = page_html or ''
    perfs = []
    m = re.search(r'document\.NIS__SCHEDULE\s*=\s*', h)
    if m:
        try:
            data, _ = json.JSONDecoder().raw_decode(h[m.end():])
        except ValueError:
            data = []
        perfs = [d for d in data if isinstance(d, dict) and not d.get('isInterferer') and d.get('sospuid')]
    return perfs, slugs_in(h)


def slugs_in(page_html):
    return {int(i): s for s, i in re.findall(r'/spielplan/stuecke/stid/([a-z0-9][a-z0-9_-]*)/(\d+)\.html', page_html or '')}


def _prod_url(slug, sostuid):
    return f'{BASE}/spielplan/stuecke/stid/{slug}/{sostuid}.html'


_ITEM_RE = re.compile(r'<li><span class="ni-cast-item-label[^"]*">(.*?)</span>\s*<span class="person_link '
                      r'ni-cast-item-link">(.*?)</span></li>', re.S)


def parse_production(page_html):
    """-> {'composer': str, 'perfs': {sospuid: {'start', 'status', 'ticket', 'team', 'cast', 'groups', 'venue'}}}"""
    h = page_html or ''
    out = {'composer': '', 'perfs': {}}
    for ev in jsonld_events(h):
        m = re.search(r'#a_(\d+)', clean(ev.get('url')))
        if not m:
            continue
        perf = out['perfs'].setdefault(int(m.group(1)), {'team': [], 'cast': [], 'groups': [], 'venue': ''})
        perf['start'] = clean(ev.get('startDate'))
        perf['status'] = clean(ev.get('eventStatus'))
        offer = ev.get('offers') if isinstance(ev.get('offers'), dict) else {}
        url = clean(offer.get('url'))
        perf['ticket'] = url if url.startswith('http') else None
        performer = ev.get('performer') if isinstance(ev.get('performer'), dict) else {}
        name = re.sub(r'^von\s+', '', clean(performer.get('name')))
        if name and not out['composer']:
            out['composer'] = name
    sub = re.search(r'<h1[^>]*>.*?</h1>\s*<div class="order-2 ni-subtitle">(.*?)</div>', h, re.S)
    if sub and clean(sub.group(1)) and len(clean(sub.group(1))) < 90:
        out['composer'] = clean(sub.group(1))           # 'Albert Lortzing', 'Pietro Mascagni · Ruggero Leoncavallo'
    blocks = re.split(r'<div class="accordion-item ni-event-item', h)[1:]
    for block in blocks:
        m = re.search(r'id="ni_ev_(\d+)"', block)
        if not m:
            continue
        perf = out['perfs'].setdefault(int(m.group(1)), {'team': [], 'cast': [], 'groups': [], 'venue': '',
                                                         'start': '', 'status': '', 'ticket': None})
        venue = re.search(r'<div class="ni-event-venue"[^>]*>\s*<span[^>]*>(.*?)</span>', block, re.S)
        if venue:
            perf['venue'] = clean(venue.group(1))
        team = re.search(r'<div class="ni-cast-section ni-cast-it">(.*?)</ul>', block, re.S)
        stars = re.search(r'<div class="ni-cast-section ni-cast-stars">(.*?)</ul>', block, re.S)
        extra = re.search(r'<div class="ni-cast-additional">(.*?)</div>\s*</div>', block, re.S)
        perf['team'] = [(clean(_html.unescape(a)), clean(_html.unescape(b))) for a, b in
                        _ITEM_RE.findall(team.group(1) if team else '')]
        perf['cast'] = [(clean(_html.unescape(a)), clean(_html.unescape(b))) for a, b in
                        _ITEM_RE.findall(stars.group(1) if stars else '')]
        perf['groups'] = [clean(_html.unescape(g)) for g in
                          re.findall(r'<span class="ni-cast-item-link">(.*?)</span>', extra.group(1) if extra else '', re.S)
                          if clean(g)]
    return out


def _credits(kind, perf):
    """Team, cast and groups of one evening -> [(role, name)]. Team entries count only when their
    label is a musical or staging role ('Musikalische Leitung', 'Inszenierung'); 'Chor' there is
    the chorus master. A cast entry 'Mit: A, B, C' lists several singers."""
    people = []
    for label, name in perf.get('team') or []:
        if re.match(r'(?i)^(?:kinder|jugend|extra|zusatz)?chor$|chorleitung|einstudierung|nach$|mitarbeit', label):
            continue
        if voice_role(label):
            people.append((label, name))
    for label, name in perf.get('cast') or []:
        names = [n.strip() for n in name.split(',')] if ',' in name and len(name) > 30 else [name]
        if kind == 'concert' and re.match(r'(?i)^mit$', label):
            label = 'Solist'
        for n in names:
            people.append((label if kind != 'concert' or voice_role(label) else 'Solist', n))
    for g in perf.get('groups') or []:
        people.append(('', g))
    return cast_credits(people, kind='ballet' if kind == 'ballet' else ('opera' if kind == 'opera' else 'concert'))


def _ballet_music(perf):
    """The composer(s) a ballet's team lists under 'Musik'."""
    for label, name in perf.get('team') or []:
        if re.match(r'(?i)^musik$', label):
            return [n.strip() for n in re.split(r'\s*,\s*|\s+und\s+', name) if n.strip()]
    return []


def _kind(genre):
    return {GENRE_OPERA: 'opera', GENRE_OPERETTA: 'opera', GENRE_BALLET: 'ballet'}.get(genre, 'concert')


def _type(kind, title, credits):
    if kind == 'opera':
        return 'vocal-opera'
    roles = {r for r, _ in credits}
    if kind == 'ballet':
        return 'vocal-opera' if 'Choir' in roles else 'orchestral'
    if re.search(r'(?i)liederabend|winterreise', title) or (roles & {'Piano'} and len(credits) <= 3 and
                                                           roles & {'Soprano', 'Mezzo-soprano', 'Tenor', 'Baritone', 'Bass'}):
        return 'recital'
    if 'Choir' in roles or re.search(r'(?i)chor', title):
        return 'vocal-opera'
    if 'Orchestra' in roles:
        return 'orchestral'
    return 'chamber' if len(credits) >= 2 else None


def fetch():
    page = get(CALENDAR)
    perfs, slugs = parse_calendar(page)
    if not perfs:
        raise FetchError(CALENDAR, 'season JSON (NIS__SCHEDULE) not found')
    for prev in previous_events(KEY):
        m = re.search(r'/stid/([a-z0-9][a-z0-9_-]*)/(\d+)\.html', prev.get('url') or '')
        if m:
            slugs.setdefault(int(m.group(2)), m.group(1))

    today = today_zurich()
    cands, skipped = [], {}
    for p in perfs:
        genre = p.get('genre')
        title = _title(p.get('st_title'))
        if genre not in _KEEP_GENRES:
            why = 'staatskapelle (other reader)' if genre == GENRE_CONCERT else f'genre {genre}'
            skipped[why] = skipped.get(why, 0) + 1
            continue
        if genre == GENRE_EXTRA and (_EXTRA_SKIP.search(title) or not _EXTRA_KEEP.search(title)):
            skipped['extra (not a concert)'] = skipped.get('extra (not a concert)', 0) + 1
            continue
        why = skip_reason(title)
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        try:
            local = to_zurich_datetime(int(p.get('datum_uhrzeit')))
        except (TypeError, ValueError):
            continue
        if local.date() < today:
            continue
        venue = _venue(p.get('venue'))
        if not venue:
            skipped['elsewhere / unknown venue'] = skipped.get('elsewhere / unknown venue', 0) + 1
            continue
        cands.append({'perf': int(p['sospuid']), 'prod': int(p.get('sostuid') or 0), 'genre': genre,
                      'kind': _kind(genre), 'title': title, 'start': berlin_iso(local), 'venue': venue,
                      'detail': None, 'reused': None, 'composer': ''})
    if skipped:
        log.info('semperoper: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    for c in cands:
        prev = previous_event(event_id(KEY, c['perf']), c['start'], title=c['title'])
        if prev and prev.get('credits'):
            c['reused'] = prev

    by_prod = {}
    for c in cands:
        by_prod.setdefault(c['prod'], []).append(c)

    def tier(prod):
        group = by_prod[prod]
        if any(c['reused'] is None for c in group):
            return 0
        if refresh_due(prod, min(c['start'] for c in group), near_days=REFRESH_NEAR_DAYS,
                       every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    wanted = sorted((p for p in by_prod if tier(p) is not None), key=lambda p: (tier(p), min(c['start'] for c in by_prod[p])))
    if any(p not in slugs for p in wanted):
        for url in OVERVIEWS:
            if requests_left() <= len(wanted) // 2:
                break
            try:
                slugs.update({k: v for k, v in slugs_in(get(url)).items() if k not in slugs})
            except FetchError as err:
                log.warning('semperoper: overview %s failed: %s', url, err)
            if all(p in slugs for p in wanted):
                break
    read, missing = 0, 0
    for prod in wanted:
        if prod not in slugs:
            missing += 1
            continue
        if requests_left() <= 0:
            break
        try:
            d = parse_production(get(_prod_url(slugs[prod], prod)))
        except BudgetExceeded as err:
            log.warning('semperoper: stopped reading production pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('semperoper: production %s failed: %s', prod, err)
            continue
        read += 1
        live = any(re.search(r'(?i)musikalische leitung|dirigent', label) for p in d['perfs'].values()
                   for label, _ in p.get('team') or []) or any(
                   re.search(r'(?i)staatskapelle|orchester', g) for p in d['perfs'].values() for g in p.get('groups') or [])
        composer = d['composer'] if 'semperoper' not in d['composer'].lower() else ''
        for c in by_prod[prod]:
            c['composer'] = composer
            c['detail'] = d['perfs'].get(c['perf'])
            c['live'] = live
    log.info('semperoper: %d production page(s) read, %d production(s) without a known page; %d performances',
             read, missing, len(cands))

    events, dropped = [], 0
    for c in cands:
        d = c['detail']
        url = _prod_url(slugs[c['prod']], c['prod']) + f'#a_{c["perf"]}' if c['prod'] in slugs else CALENDAR
        ticket, status, venue = None, '', c['venue']
        if d:
            credits = _credits(c['kind'], d)
            program = []
            if c['kind'] == 'opera' and c['composer']:
                composers = [x.strip() for x in re.split(r'\s*[·/&]\s*', c['composer']) if x.strip()]
                works = [x.strip() for x in re.split(r'\s+&\s+', c['title'])]
                if len(composers) == 1:
                    program = [(composers[0], c['title'])]
                elif len(works) == len(composers):        # 'Cavalleria rusticana & Pagliacci'
                    program = list(zip(composers, works))
                else:
                    program = [(x, '') for x in composers]
            if c['kind'] == 'ballet':
                music = _ballet_music(d)
                program = [(music[0], c['title'])] if len(music) == 1 else [(m, '') for m in music]
            ticket, status = d.get('ticket'), d.get('status') or ''
            if d.get('venue') and c['venue'].startswith('Semperoper') and 'semper zwei' in d['venue'].lower():
                venue = 'Semperoper Dresden, Semper Zwei'
            live = c.get('live') or any(r in ('Conductor', 'Orchestra') for r, _ in credits)
        elif c['reused']:
            prev = c['reused']
            credits = [(x.get('role'), x.get('name')) for x in prev.get('credits') or []]
            program = [(x.get('composer') or '', x.get('title') or '') for x in prev.get('program') or []]
            ticket = prev.get('ticketUrl')
            live = True
        else:
            credits, program, live = [], [], c['kind'] != 'ballet'
        if c['kind'] == 'ballet' and not live:
            dropped += 1                                # danced to a recording, or not known yet
            continue
        cancelled = looks_cancelled(c['title']) or 'cancel' in status.lower()
        try:
            events.append(make_event(
                KEY, c['perf'], c['title'], c['start'], city=CITY, venueName=venue,
                type=_type(c['kind'], c['title'], credits), credits=credits, program=program,
                ticketUrl=ticket, url=url, status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('semperoper %s: skipped: %s', c['perf'], err)
    if dropped:
        log.info('semperoper: %d ballet performance(s) without known live music left out', dropped)
    return events
