"""Philharmonie de Paris and Cité de la musique: the classical part of the agenda.

    https://philharmoniedeparis.fr/fr/agenda-ajax?genreGps=1%2B2%2B3%2B5&op=init     agenda (JSON + HTML)
    https://philharmoniedeparis.fr/fr/agenda-ajax?genreGps=…&page=N&lastDate=…&lastGroup=…&weekends=…&op=next
    https://philharmoniedeparis.fr/fr/activite/<kind>/<eid>-<slug>?itemId=<pid>          one page per event

The agenda page itself is an empty form; the site's script fills it from ``agenda-ajax``
(GET, JSON: ``content`` = HTML cards, ``moreEvents``, ``lastDate``, ``lastGroup``,
``weekends``, ``periods``), about a month of cards per answer; the next answer is asked with
the previous one's values and ``page=N`` (exactly as the "Jours suivants" button does).
The agenda is read twice with the site's genre filter: the classical genres (1 baroque,
2 symphonic, 3 recital/chamber, 5 contemporary), then 4 "Voix", which also holds chanson,
gnawa and world music, so a card found only there is kept only when its category is a
classical one ("Concert vocal", "Opéra en concert", "Récital vocal" …). Jazz, pop, world
music and dance are not asked for.

A card gives the performance id (``data-performance-eid``), the event id, a Unix
``data-timestamp`` (checked against the printed "20h00": the true start), category,
title, a subtitle (performers and composers in one line) and the hall. The event page has
the programme ("program-composer" / "program-title"), the cast ("distrib-title",
", direction") and one schema.org MusicEvent with the hall's address. Event pages cost one
request each and are read incrementally: a performance the previous feed already has
with its cast or works (same id, start and title) keeps them; the requests left after the
agenda (cap 150) go to events still missing details, soonest first, then to events within
two weeks and a fixed share of the others (each about once a week). Until its page is
read, a concert is listed without cast and works. Checked against the website on
29 Oct 2026 (Chamber Orchestra of Europe / Pappano 6 Nov 20h00 Grande salle Pierre
Boulez; Bruce Liu 3 Nov 20h00; Britten's War Requiem 26 and 27 Nov 20h00). Pages of
other events that share an event id (several dates of one programme) are read once.

Halls: Grande salle Pierre Boulez, Salle des concerts, Amphithéâtre, Le Studio,
Salle de conférence (Philharmonie / Cité de la musique, Paris 19e). Events the Philharmonie
presents elsewhere (Grande Halle de La Villette, Fondation Fiminco in Romainville) keep the
place's name and the town of the event page's address.

Skipped: children's and family formats, workshops, guided tours, museum visits and the
"Musicien au Musée" demonstrations, listening keys (Clé d'écoute), pre-concert talks,
conferences, exhibitions, dance performances and pop, rap, jazz, world music.
"""
from __future__ import annotations

import re
import urllib.parse

from common import BudgetExceeded, FetchError, clean, event_id, get, get_json, guess_type, jsonld_events, log, \
    looks_cancelled, make_event, previous_event, refresh_due, requests_left, to_zurich_datetime, to_zurich_iso, \
    today_zurich

from ._paris import abroad, credit, fold, group_role, is_not_a_concert, town_in

KEY = 'philharmonie_paris'
NAME = 'Philharmonie de Paris'
SITE = 'https://philharmoniedeparis.fr/'
ATTRIBUTION = 'Source: Philharmonie de Paris – Cité de la musique (philharmoniedeparis.fr)'
KIND = 'venue'
COUNTRY = 'france'
MAX_REQUESTS = 150
TIME_LIMIT = 900
REFRESH_NEAR_DAYS = 14
REFRESH_EVERY_DAYS = 7

BASE = 'https://philharmoniedeparis.fr'
AJAX = BASE + '/fr/agenda-ajax'
STREAMS = (('classical', '1+2+3+5'), ('voix', '4'))
MAX_PAGES = 20                 # per stream; about 6 are needed
CITY = 'Paris'

# categories of the cards that are concerts; anything else ("Visite", "Atelier", "Conte musical") is skipped
_CONCERT_CAT = re.compile(r'(?i)^(?:concert|r[ée]cital|musique de chambre|op[ée]ra|spectacle|oratorio|cin[ée]-concert|'
                          r'concert-lecture|concert vocal|concert symphonique)')
_VOCAL_CAT = re.compile(r'(?i)^(?:concert vocal|op[ée]ra|r[ée]cital vocal|oratorio|concert symphonique|musique de chambre|'
                        r'r[ée]cital)')
_SKIP_CAT = re.compile(r'(?i)famille|enfant|\bans\)|atelier|visite|conte|cl[ée] d.[ée]coute|avant-concert|conf[ée]rence|'
                       r'rencontre|colloque|forum|formation|exposition|mus[ée]e|projection|film|performance|danse|'
                       r'pratique|chorale|jeune public|scolaire|[ée]lectrochoc|apr[èe]s-concert|bal\b|soir[ée]e dansante')
_POP_RE = re.compile(r'(?i)\bjazz\b|\bpop\b|\brap\b|hip-hop|\bfolk\b|chanson|gnaoua|gnawa|reggae|soul\b|blues|'
                     r'\belectro\b|\bdj\b|musiques? du monde|world')
_HALLS = {
    'grande salle pierre boulez': 'Philharmonie de Paris, Grande salle Pierre Boulez',
    'salle des concerts': 'Cité de la musique, Salle des concerts',
    'amphitheatre': 'Cité de la musique, Amphithéâtre',
    'le studio': 'Philharmonie de Paris, Le Studio',
    'salle de conference': 'Philharmonie de Paris, Salle de conférence',
    'musee de la musique': 'Cité de la musique, Musée de la musique',
    'rue musicale': 'Cité de la musique, Rue musicale',
}


# ---------------------------------------------------------------------------
# agenda
# ---------------------------------------------------------------------------

def _ajax_url(genres, state=None, page=1):
    q = [('genreGps', genres)]
    if state:
        q += [('page', str(page)), ('lastDate', state['lastDate']), ('lastGroup', str(state['lastGroup']))]
        if state.get('weekends'):
            q.append(('weekends', state['weekends']))
        if state.get('periods'):
            q.append(('periods', state['periods']))
        q.append(('op', 'next'))
    else:
        q.append(('op', 'init'))
    return AJAX + '?' + urllib.parse.urlencode(q, quote_via=urllib.parse.quote, safe='')


def parse_cards(content):
    """-> list of card dicts from one agenda answer's HTML."""
    out = []
    for m in re.finditer(r'<article data-performance-eid="(\d+)" data-event-eid="(\d+)"[^>]*data-timestamp="(\d+)"[^>]*>'
                         r'(.*?)</article>', content or '', re.S):
        pid, eid, ts, body = m.groups()
        g = lambda rx: clean(re.search(rx, body, re.S).group(1)) if re.search(rx, body, re.S) else ''
        href = re.search(r'href="(/fr/activite/[^"]+)"', body)
        out.append({'pid': pid, 'eid': eid, 'ts': int(ts), 'category': g(r'EventCard-category[^>]*>(.*?)</p>'),
                    'title': g(r'class="EventCard-title[^"]*">(.*?)</(?:h4|div|h3)>'),
                    'subtitle': g(r'EventCard-subtitle[^>]*>(.*?)</p>'),
                    'place': g(r'EventCard-place[^>]*>(.*?)</p>'),
                    'href': href.group(1).replace('&amp;', '&') if href else None,
                    'cancelled': looks_cancelled(g(r'EventCard-availability[^>]*>(.*?)</div>\s*</div>')) or
                    looks_cancelled(g(r'EventCard-category[^>]*>(.*?)</p>'))})
    # the time printed above each card, to check the timestamp
    times = re.findall(r'agendaTimer-time[^"]*">\s*(\d{1,2})h(\d{2})\s*</div>\s*</div>\s*<article data-performance-eid="(\d+)"',
                       content or '')
    printed = {pid: (int(h), int(mi)) for h, mi, pid in times}
    for c in out:
        c['printed'] = printed.get(c['pid'])
    return out


def _read_stream(name, genres, cards):
    """Read every page of one genre stream into ``cards`` (pid -> card)."""
    state, n = None, 0
    for page in range(1, MAX_PAGES + 1):
        if requests_left() <= 0:
            log.warning('philharmonie_paris: request cap reached in the %s agenda', name)
            break
        try:
            data = get_json(_ajax_url(genres, state, page))
        except FetchError:
            if state is None:
                raise                                       # the first page must work
            log.warning('philharmonie_paris: %s agenda page %d failed', name, page)
            break
        got = parse_cards(data.get('content'))
        for c in got:
            c['streams'] = cards.get(c['pid'], {}).get('streams', set()) | {name}
            cards.setdefault(c['pid'], c)['streams'] = c['streams']
        n += len(got)
        if not data.get('moreEvents') or not got:
            break
        state = data
    log.info('philharmonie_paris: %s agenda: %d cards', name, n)


# ---------------------------------------------------------------------------
# event page
# ---------------------------------------------------------------------------

def parse_event(page):
    """-> {'works': [(composer, title)], 'cast': [(name, role)], 'address': str, 'place': str,
           'status': str, 'duration': int|None}."""
    h = page or ''
    out = {'works': [], 'cast': [], 'address': '', 'place': '', 'status': ''}
    prog = re.search(r'<div class="event-program(.*?)(?:program-more-button|<div class="event-page-content-right)', h, re.S)
    block = prog.group(1) if prog else ''
    for detail in re.findall(r'<div class="program-detail[^"]*">(.*?)(?=<div class="program-distrib|<div class="program-stage|$)',
                             block, re.S):
        for comp, rest in re.findall(r'<div class="program-composer">(.*?)</div>(.*?)(?=<div class="program-composer">|$)',
                                     detail, re.S):
            titles = [clean(t) for t in re.findall(r'<div class="program-title">(.*?)</div>', rest, re.S) if clean(t)]
            for t in titles or ['']:
                out['works'].append((clean(comp), t))
    for line in re.findall(r'<div class="distrib-line">(.*?)</div>', block, re.S):
        name = re.search(r'<span class="distrib-title">(.*?)</span>', line, re.S)
        roles = re.search(r'<span class="distrib-roles">(.*?)</span>', line, re.S)
        if name and clean(name.group(1)):
            out['cast'].append((clean(name.group(1)), clean(roles.group(1)).lstrip(', ') if roles else ''))
    for ev in jsonld_events(h):
        loc = ev.get('location') or {}
        if isinstance(loc, dict):
            out['place'] = clean(loc.get('name'))
            addr = loc.get('address')
            out['address'] = clean(addr if isinstance(addr, str) else ' '.join(str(v) for v in (addr or {}).values()))
        out['status'] = str(ev.get('EventStatus') or ev.get('eventStatus') or '')
        break
    return out


def credits_from(cast):
    out = []
    for name, role in cast:
        if re.match(r'(?i)^direction\s+\S', role) and group_role(name):     # 'Chœur …, direction Lionel Sow'
            g = group_role(name)
            out.append((g, name))
            out.append(('Chorus master' if g == 'Choir' else 'Conductor', clean(role[len('direction'):])))
            continue
        if re.match(r'(?i)^avec (?:la participation|le concours)', name):
            continue
        c = credit(name, role)
        if c and c[0] not in ('Director', 'Choreographer', 'Composer'):
            out.append(c)
    return out


# ---------------------------------------------------------------------------
# cards -> events
# ---------------------------------------------------------------------------

def _venue(place, page_place='', address=''):
    """(venueName, city) for a card's hall."""
    p = clean(place) or clean(page_place)
    f = fold(p)
    for key, name in _HALLS.items():
        if key in f:
            return name, CITY
    if not p:
        return 'Philharmonie de Paris', CITY
    if abroad(p) or abroad(address):
        return p, None
    town = town_in(address) or town_in(p)
    if not town and re.search(r'(?i)la villette|philharmonie|cit[ée] de la musique', p):
        town = CITY
    return p, town


def _start(card):
    local = to_zurich_datetime(card['ts'])
    if card.get('printed') and (local.hour, local.minute) != card['printed']:
        log.warning('philharmonie_paris %s: timestamp %s is %s but the agenda shows %02d:%02d; using the agenda',
                    card['pid'], card['ts'], local.strftime('%H:%M'), *card['printed'])
        local = local.replace(hour=card['printed'][0], minute=card['printed'][1])
    return to_zurich_iso(local)


def _keep(card):
    cat, title = card['category'], card['title']
    if not card['href']:
        return 'no page'
    if _SKIP_CAT.search(cat) or is_not_a_concert(cat):
        return 'not a concert (%s)' % cat.split('(')[0].strip()
    if not _CONCERT_CAT.search(cat):
        return 'not a concert (%s)' % cat.split('(')[0].strip()
    if 'classical' not in card['streams'] and not _VOCAL_CAT.search(cat):
        return 'voice but not classical'
    if _POP_RE.search(title + ' ' + card['subtitle']) and not re.search(r'(?i)symphoni|orchestre|quatuor|piano', title):
        return 'pop / jazz / world'
    if is_not_a_concert(title):
        return 'not a concert (title)'
    return None


def _type(cat, title, credits, works):
    c = fold(cat)
    if c.startswith(('opera', 'concert vocal', 'oratorio')):
        return 'vocal-opera'
    if c.startswith('recital vocal'):
        return 'recital'
    if c.startswith('recital'):
        return 'recital'
    if c.startswith('concert symphonique'):
        return 'orchestral'
    if c.startswith('musique de chambre'):
        return 'chamber'
    roles = [r for r, _ in credits]
    if 'Choir' in roles:
        return 'vocal-opera'
    if 'Orchestra' in roles or 'Conductor' in roles:
        return 'orchestral'
    return guess_type(title + ' ' + ' '.join(t for _, t in works)) or None


def fetch():
    cards = {}
    for name, genres in STREAMS:
        _read_stream(name, genres, cards)
    today = today_zurich()
    cands, skipped = [], {}
    for card in cards.values():
        why = _keep(card)
        if not why:
            card['start'] = _start(card)
            if to_zurich_datetime(card['start']).date() < today:
                why = 'past'
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        prev = previous_event(event_id(KEY, card['pid']), card['start'], title=card['title'])
        card['prev'] = prev if prev and (prev.get('credits') or prev.get('program')) else None
        cands.append(card)
    log.info('philharmonie_paris: %d cards, %d concerts; skipped %s', len(cards), len(cands),
             ', '.join(f'{v} {k}' for k, v in sorted(skipped.items(), key=lambda kv: -kv[1])))

    by_event = {}
    for c in cands:
        by_event.setdefault(c['eid'], []).append(c)

    def tier(eid):
        group = by_event[eid]
        if any(c['prev'] is None for c in group):
            return 0
        if refresh_due(eid, min(c['start'] for c in group), near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    order = sorted((e for e in by_event if tier(e) is not None), key=lambda e: (tier(e), min(c['start'] for c in by_event[e])))
    pages = {}
    for eid in order:
        if requests_left() <= 0:
            break
        first = min(by_event[eid], key=lambda c: c['start'])
        try:
            pages[eid] = parse_event(get(BASE + first['href']))
        except BudgetExceeded as err:
            log.warning('philharmonie_paris: stopped reading event pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('philharmonie_paris: event %s failed: %s', eid, err)
    log.info('philharmonie_paris: %d event page(s) read of %d events; %d still without details', len(pages),
             len(by_event), sum(1 for e in by_event if e not in pages and any(c['prev'] is None for c in by_event[e])))

    events = []
    for c in cands:
        page = pages.get(c['eid'])
        credits, works, cancelled = [], [], c['cancelled'] or looks_cancelled(c['title'])
        venue, city = _venue(c['place'])
        if page:
            credits, works = credits_from(page['cast']), page['works']
            venue, city = _venue(c['place'], page['place'], page['address'])
            if len(by_event[c['eid']]) == 1 and re.search(r'(?i)cancel', page['status']):
                cancelled = True
        elif c['prev']:
            credits = [(x.get('role'), x.get('name')) for x in c['prev'].get('credits') or []]
            works = [(p.get('composer'), p.get('title')) for p in c['prev'].get('program') or []]
            venue, city = c['prev'].get('venueName') or venue, c['prev'].get('city') or city
        if not city:
            log.info('philharmonie_paris %s: place unknown or abroad, skipped: %s (%s)', c['pid'], c['title'], venue)
            continue
        try:
            events.append(make_event(
                KEY, c['pid'], c['title'], c['start'], city=city, venueName=venue,
                type=_type(c['category'], c['title'], credits, works), credits=credits, program=works,
                url=BASE + c['href'], ticketUrl=BASE + c['href'],
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('philharmonie_paris %s: skipped: %s', c['pid'], err)
    return events
