"""Frauenkirche Dresden: concerts and church music in the Frauenkirche, from the church's own
calendar and concert pages.

    https://www.frauenkirche-dresden.de/api/events                     the next ~30 days, all events
    https://www.frauenkirche-dresden.de/musik                          selected concerts, ~14 months
    https://www.frauenkirche-dresden.de/musikjahr-2027                 the 2027 season's concerts
    https://www.frauenkirche-dresden.de/kalender/eventleser/<alias>    one page per concert

robots.txt closes the calendar's month/day/category/search parameters, its detail and category
paths (/kalender/detail/, /kalender/category/) and the iCal export, so the calendar API is read
without parameters only: it returns the coming ~30 days (services, open church, talks and
"Kirchenmusik & Konzerte", category 2, which is kept). Concerts further ahead come from the two
concert overview pages (title, start with offset, series line, link). The concert's own page
(/kalender/eventleser/…, not closed by robots.txt) adds the programme ("Programm": composer +
work; movement lines are dropped), the cast ("Besetzung": role + name), the room and the ticket
link; it is read incrementally (a concert whose previous record, same id/start/title, has its
cast keeps it; then concerts in the next week and a fixed share of the others are re-read).
Only facts are taken (date, time, title, room, people, works, links); never the descriptions.

During testing some requests were refused ("Connection refused"; seen with other sites from the
same machine too); common.get's retries (5 s, 15 s) always got through. A first run that reads
every concert page (~60) takes about 4-5 minutes; later runs read ~10 pages.

Skipped: services and devotions (also "Orgelandacht"/"Wort & Orgelklang"), open church, guided
tours, talks and readings, children's formats. Titles are written as the site writes them
(some in capitals, e.g. "MOZART – Requiem"). Checked against the website on 29 Oct 2026.
"""
from __future__ import annotations

import html as _html
import re

from common import (BudgetExceeded, FetchError, clean, event_id, get, get_json, jsonld_events, log, looks_cancelled,
                    make_event, previous_event, previous_events, refresh_due, requests_left, today_zurich, to_zurich_datetime)

from ._saxony import berlin_iso, cast_credits, group_role, looks_like_person, skip_reason, strip_life_dates

KEY = 'frauenkirche_dresden'
NAME = 'Frauenkirche Dresden'
SITE = 'https://www.frauenkirche-dresden.de/'
ATTRIBUTION = 'Source: Stiftung Frauenkirche Dresden (frauenkirche-dresden.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 90
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 10

BASE = 'https://www.frauenkirche-dresden.de'
API = BASE + '/api/events'
PAGES = (BASE + '/musik', BASE + '/musikjahr-2027')
DETAIL = BASE + '/kalender/eventleser/{alias}'
CITY = 'Dresden'
CONCERTS = 2                       # tpl_categoryId of "Kirchenmusik & Konzerte"

_SKIP_TITLE = re.compile(r'(?i)orgelandacht|wort (?:&|und) orgelklang|vesper|gebet|segen|taize|taizé|'
                         r'nachtcaf[ée]|kirchenf[üu]hrung|friedensgebet')
_TITLE_PREFIX = re.compile(r'(?i)^(?:prof\.\s*|dr\.\s*)*(?:frauenkirchen?\w*|kreuz\w*|thomas\w*)?(?:kantor(?:in)?|'
                           r'organist(?:in)?|pfarrer(?:in)?)\s+')


def _alias_id(alias):
    m = re.search(r'-(\d{5,})$', alias or '')
    return m.group(1) if m else alias


def parse_teasers(page_html):
    """Concerts of an overview page -> [{'alias', 'start' (None when the page gives no date),
    'title', 'series', 'ticket'}]. Three layouts: list teasers (date, series line, title,
    ticket), slider elements (date, title) and teaser boxes (title only)."""
    out, seen = [], set()
    h = page_html or ''
    for block in re.split(r'<div class="(?:event layout_teaser|ce_ct_sliderElement event|ce_ct_teaserBox)', h)[1:]:
        alias = re.search(r'href="(?:https://www\.frauenkirche-dresden\.de)?/kalender/eventleser/([a-z0-9-]+)"', block)
        if not alias or alias.group(1) in seen:
            continue
        start = re.search(r'<time datetime="(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}[^"]*)"', block)
        title = re.search(r'<h[23][^>]*>(.*?)</h[23]>', block, re.S)
        series = re.search(r'<div class="uebertitel">(.*?)</div>', block, re.S)
        ticket = re.search(r'href="(https://[^"]*reservix[^"]*)"', block)
        if not title or not clean(title.group(1)):
            continue
        seen.add(alias.group(1))
        out.append({'alias': alias.group(1), 'start': start.group(1) if start else None,
                    'title': clean(title.group(1)), 'series': clean(series.group(1)) if series else '',
                    'ticket': _html.unescape(ticket.group(1)) if ticket else None})
    return out


def parse_api(data):
    """The calendar API -> concert rows like parse_teasers()."""
    out = []
    for day in (data or {}).get('results', {}).values() if isinstance((data or {}).get('results'), dict) else []:
        for items in (day or {}).values():
            for e in items or []:
                if not isinstance(e, dict) or e.get('tpl_categoryId') != CONCERTS:
                    continue
                if not e.get('datetime') or not e.get('alias'):
                    continue
                out.append({'alias': e['alias'], 'start': e['datetime'], 'title': clean(e.get('title')),
                            'series': clean(e.get('tpl_uebertitel')), 'ticket': None,
                            'subtitle': clean(e.get('tpl_untertitel'))})
    return out


def parse_detail(page_html):
    """-> {'works': [(composer, title)], 'people': [(role, name)], 'room': str, 'ticket': url, 'status': str,
           'start': ISO from JSON-LD, 'title': str}"""
    h = page_html or ''
    out = {'works': [], 'people': [], 'room': '', 'ticket': None, 'status': '', 'start': None, 'title': ''}
    prog = re.search(r'<p class="periodsOfTime">(.*?)</p>', h, re.S)
    for span in re.findall(r'<span>(.*?)</span>', prog.group(1) if prog else '', re.S):
        comp = re.search(r'<strong>(.*?)</strong>', span, re.S)
        composer = strip_life_dates(clean(comp.group(1))) if comp else ''
        rest = span[comp.end():] if comp else span
        lines = [clean(x) for x in re.split(r'<br\s*/?>', rest) if clean(x)]
        if re.match(r'(?i)^werke von\b', clean(span)):
            for c in re.split(r'\s*,\s*|\s+und\s+', composer):
                if c:
                    out['works'].append((c, ''))
            continue
        if composer and lines:
            out['works'].append((composer, lines[0].rstrip(' ,')))
            for extra in lines[1:]:                     # a second work, not a movement line
                if re.search(r'\b(?:op\.|BWV|KV|Hob\.|WoO|RV|HWV|BuxWV)\s*\S', extra) and not re.search(r'\s[-–]\s', extra):
                    out['works'].append((composer, extra.rstrip(' ,')))
        elif composer and looks_like_person(composer, 7):
            out['works'].append((composer, ''))
    cast = re.search(r'<p class="cast">(.*?)</p>', h, re.S)
    for line in re.split(r'<br\s*/?>', cast.group(1) if cast else ''):
        name = re.search(r'<strong>(.*?)</strong>', line, re.S)
        if not name:
            continue
        role = clean(line[:name.start()])
        person = _TITLE_PREFIX.sub('', clean(name.group(1)))
        person = re.sub(r'^(?:Prof\.|Dr\.)\s+', '', person)
        if re.search(r'(?i)wort|gebet|segen|liturg|predigt|begr[üu](?:ß|ss)ung', role):
            continue                                    # the pastor's part
        names = [n.strip() for n in person.split(',')] if ',' in person and not group_role(person) else [person]
        for n in names:
            if n:
                out['people'].append((role, n))
    room = re.search(r'<p class="location">\s*<strong[^>]*>.*?</strong>(.*?)</p>', h, re.S)
    out['room'] = clean(room.group(1)) if room else ''
    ticket = re.search(r'<a href="(https://[^"]+)"[^>]*class="btn ticket-link"', h)
    out['ticket'] = _html.unescape(ticket.group(1)) if ticket else None
    for ev in jsonld_events(h):
        out['status'] = clean(ev.get('eventStatus'))
        out['start'] = clean(ev.get('startDate')) or None
        out['title'] = clean(ev.get('name'))
        break
    return out


def _venue(room):
    """'Hauptraum' -> 'Frauenkirche Dresden'; 'Unterkirche (Zugang über Eingänge B und F)' ->
    'Frauenkirche Dresden, Unterkirche'."""
    r = re.split(r'\s*(?:\(|,|\büber\b|\bZugang\b|\bEingang\b|\bEingänge\b)', clean(room))[0].strip()
    if not r or r.lower() == 'hauptraum':
        return 'Frauenkirche Dresden'
    return f'Frauenkirche Dresden, {r}'


def _type(title, credits, works):
    roles = {r for r, _ in credits}
    text = ' '.join([title] + [t for _, t in works]).lower()
    if 'Choir' in roles or re.search(r'requiem|oratorium|passion|messe|kantate|magnificat|vesper', text):
        return 'vocal-opera'
    if 'Orchestra' in roles:
        return 'orchestral'
    players = [r for r in roles if r not in ('Presenter', 'Narrator', 'Conductor')]
    if len([1 for r, _ in credits if r not in ('Presenter', 'Narrator')]) == 1:
        return 'recital'
    if 'Ensemble' in roles or len(players) >= 2:
        return 'chamber'
    return None


def fetch():
    rows = {}
    try:
        for r in parse_api(get_json(API)):
            rows.setdefault(r['alias'], r)
    except FetchError as err:
        log.warning('frauenkirche_dresden: calendar API failed: %s', err)
    for url in PAGES:
        try:
            for r in parse_teasers(get(url)):
                prev = rows.get(r['alias'])
                if prev:
                    prev['ticket'] = prev.get('ticket') or r['ticket']
                    prev['series'] = prev.get('series') or r['series']
                    prev['start'] = prev.get('start') or r['start']
                else:
                    rows[r['alias']] = r
        except FetchError as err:
            if not rows:
                raise
            log.warning('frauenkirche_dresden: %s failed: %s', url, err)

    # a concert listed without its date: the previous feed's date, else its page (below)
    known = {e.get('id'): e for e in previous_events(KEY)}
    undated = []
    for r in rows.values():
        if not r.get('start'):
            prev = known.get(event_id(KEY, _alias_id(r['alias'])))
            if prev and not refresh_due(r['alias'], prev.get('start')):
                r['start'] = prev.get('start')
            else:
                undated.append(r)
    for r in undated:
        if requests_left() <= 0:
            break
        try:
            d = parse_detail(get(DETAIL.format(alias=r['alias'])))
        except FetchError as err:
            log.warning('frauenkirche_dresden %s: page failed: %s', r['alias'], err)
            continue
        r['start'], r['detail'] = d['start'], d

    today = today_zurich()
    cands, skipped = [], {}
    for r in rows.values():
        title = r['title']
        why = skip_reason(title, r.get('series'), r.get('subtitle')) or (_SKIP_TITLE.search(title) and 'devotion')
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        if not r.get('start'):
            continue
        try:
            start = berlin_iso(r['start'])
        except ValueError:
            continue
        if to_zurich_datetime(start).date() < today:
            continue
        c = dict(r, sid=_alias_id(r['alias']), start_iso=start, detail=r.get('detail'), reused=None)
        prev = previous_event(event_id(KEY, c['sid']), start, title=title)
        if prev and prev.get('credits'):
            c['reused'] = prev
        cands.append(c)
    if skipped:
        log.info('frauenkirche_dresden: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    def tier(c):
        if c['reused'] is None:
            return 0
        if refresh_due(c['sid'], c['start_iso'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    order = sorted((c for c in cands if c['detail'] is None and tier(c) is not None),
                   key=lambda c: (tier(c), c['start_iso']))
    read = 0
    for c in order:
        if requests_left() <= 0:
            break
        try:
            c['detail'] = parse_detail(get(DETAIL.format(alias=c['alias'])))
            read += 1
        except BudgetExceeded as err:
            log.warning('frauenkirche_dresden: stopped reading concert pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('frauenkirche_dresden %s: page failed: %s', c['alias'], err)
    log.info('frauenkirche_dresden: %d concerts, %d concert page(s) read (+%d for undated ones)', len(cands), read,
             len(undated))

    events = []
    for c in sorted(cands, key=lambda c: c['start_iso']):
        d = c['detail']
        if d:
            credits = cast_credits(d['people'])
            works, venue, ticket, status = d['works'], _venue(d['room']), d['ticket'] or c.get('ticket'), d['status']
        elif c['reused']:
            prev = c['reused']
            credits = [(x.get('role'), x.get('name')) for x in prev.get('credits') or []]
            works = [(x.get('composer') or '', x.get('title') or '') for x in prev.get('program') or []]
            venue, ticket, status = prev.get('venueName') or 'Frauenkirche Dresden', prev.get('ticketUrl'), ''
        else:
            credits, works, venue, ticket, status = [], [], 'Frauenkirche Dresden', c.get('ticket'), ''
        cancelled = looks_cancelled(c['title']) or 'cancel' in status.lower()
        try:
            events.append(make_event(
                KEY, c['sid'], c['title'], c['start_iso'], city=CITY, venueName=venue,
                type=_type(c['title'], credits, works), series=c.get('series') or None,
                credits=credits, program=works, ticketUrl=ticket, url=DETAIL.format(alias=c['alias']),
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('frauenkirche_dresden %s: skipped: %s', c['sid'], err)
    return events
