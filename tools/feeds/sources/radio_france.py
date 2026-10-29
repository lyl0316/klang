"""Radio France: the concerts of the Orchestre National de France, the Orchestre
Philharmonique de Radio France, the Chœur and the Maîtrise, and the guests of the Maison de
la Radio et de la Musique (Auditorium, Studio 104), also when they play elsewhere.

    https://www.maisondelaradioetdelamusique.fr/agenda?genre[]=…&page=N    agenda, 12 cards a page
    https://www.maisondelaradioetdelamusique.fr/evenement/<slug>?s=<id>    one page per performance

The agenda is asked with the site's own genre filter for the classical genres
(symphonique 1207, opéra 1212, baroque 1208, chorale 1211, récital et musique de chambre
1210, orgue 1214, création contemporaine 1215; not jazz, pop, film music, Fip or the
children's concerts) and read page by page until a page has no card or the 450-day window
ends (about 20 pages). A card gives the session id (``?s=``), the date (``data-date``),
weekday and time ("Mercredi 20h00"), the type ("Concert", "Concert-fiction"), title,
conductor ("Jaap Van Zweden direction") and the place ("Maison de la Radio et de la
Musique - Auditorium", "Théâtre des Champs-Élysées", "Stadtcasino, Bâle").

robots.txt asks for a Crawl-delay of 10 seconds (and shuts out a few AI crawlers by name,
not this reader), so a run is slow: the agenda alone takes about 4 minutes. The event
page adds the works ("Le programme": composer, works), the soloists with their
instruments, the ensembles ("Formation") and the conductor, plus one schema.org MusicEvent
(start with offset, address, eventStatus). Event pages are read incrementally: a
performance the previous feed already has with its cast or works (same id, start and
title) keeps them, and the time left after the agenda goes to performances still missing
details, soonest first, then to those within two weeks and a fixed share of the others
(each about every two weeks). Until its page is read, a concert keeps the conductor from
the card. Checked against the website on 29 Oct 2026 (Berlioz, Symphonie fantastique –
van Zweden / Capuçon, 4 Nov 20h00, Auditorium; Manon Lescaut at the Théâtre des
Champs-Élysées 2, 5 and 7 Nov).

Cards at a place outside France (the orchestras' tours: "Stadtcasino, Bâle") are left out;
a place whose town the card does not name waits for its event page (JSON-LD address).

Skipped: concert-fictions (radio drama with music), children's and school concerts,
public broadcasts, talks, workshops, guided tours.
"""
from __future__ import annotations

import re
import urllib.parse
from datetime import date, timedelta

from common import BudgetExceeded, FetchError, clean, event_id, get, guess_type, jsonld_events, log, looks_cancelled, \
    make_event, previous_event, refresh_due, requests_left, to_zurich_iso, today_zurich

from ._paris import PARIS_TZ, abroad, credit, fold, group_role, is_not_a_concert, paris_iso, town_in

KEY = 'radio_france'
NAME = 'Radio France'
SITE = 'https://www.maisondelaradioetdelamusique.fr/'
ATTRIBUTION = 'Source: Radio France – Maison de la Radio et de la Musique (maisondelaradioetdelamusique.fr)'
KIND = 'venue'
COUNTRY = 'france'
MAX_REQUESTS = 110             # crawl-delay 10 s: ~25 agenda pages + ~80 event pages fit in the time limit
TIME_LIMIT = 1200
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 14

BASE = 'https://www.maisondelaradioetdelamusique.fr'
GENRES = ('1207', '1212', '1208', '1211', '1210', '1214', '1215')
MAX_PAGES = 40
WINDOW_DAYS = 450
CITY = 'Paris'
HOUSE = 'Maison de la Radio et de la Musique'

_SKIP_TYPES = re.compile(r'(?i)concert-fiction|jeune public|[ée]mission|rencontre|atelier|visite|masterclass')
_PARIS_PLACES = re.compile(r"(?i)maison de la radio|th[ée][âa]tre des champs|philharmonie|cit[ée] de la musique|"
                           r"op[ée]ra comique|op[ée]ra-comique|salle gaveau|[ée]glise saint|cath[ée]drale notre-dame|"
                           r"sainte-chapelle|ch[âa]telet|bouffes du nord|th[ée][âa]tre de la ville|op[ée]ra bastille|"
                           r"palais garnier|mus[ée]e d.orsay|louvre|invalides|madeleine|saint-eustache|saint-sulpice|"
                           r"biblioth[èe]que nationale de france|champ de mars|tour eiffel|grand palais|op[ée]ra de paris")


def _agenda_url(page):
    q = [('genre[]', g) for g in GENRES]
    if page:
        q.append(('page', str(page)))
    return BASE + '/agenda?' + urllib.parse.urlencode(q)


def parse_agenda(page):
    """-> list of card dicts from one agenda page."""
    out = []
    for card in re.split(r'<div class="position-relative observable-event', page or '')[1:]:
        href = re.search(r'href="(/evenement/[^"?]+)\?s=(\d+)"', card)
        day = re.search(r'data-date="(\d{4})-(\d{2})-(\d{2})"', card)
        if not (href and day):
            continue
        g = lambda rx: clean(re.search(rx, card, re.S).group(1)) if re.search(rx, card, re.S) else ''
        when = g(r'<div class="Small">\s*(.*?)</div>')
        tm = re.search(r'(\d{1,2})h(\d{2})?', when)
        out.append({'sid': href.group(2), 'path': href.group(1), 'date': tuple(int(x) for x in day.groups()),
                    'time': (int(tm.group(1)), int(tm.group(2) or 0)) if tm else None,
                    'type': g(r'field_event_type">(.*?)</div>'), 'title': g(r'<h2[^>]*>(.*?)</h2>'),
                    'conductor': g(r'field_conductor">(.*?)</div>'), 'place': g(r'class="Small location">(.*?)</div>')})
    return out


def parse_event(page):
    """-> {'works', 'soloists', 'formations', 'conductors', 'address', 'place', 'start', 'status'}."""
    h = page or ''
    out = {'works': [], 'cast': [], 'address': '', 'place': '', 'start': None, 'status': ''}
    for blk in re.findall(r'paragraph--type--pg-evt-composer[^>]*>(.*?)</div>\s*</div>\s*</div>', h, re.S):
        comp = re.search(r'<div class="Bolder-L">(.*?)</div>', blk, re.S)
        works = [clean(w) for w in re.findall(r'<span>(.*?)</span>', blk.split('P-small', 1)[1] if 'P-small' in blk else '',
                                               re.S) if clean(w)]
        if comp and clean(comp.group(1)):
            for w in works or ['']:
                out['works'].append((clean(comp.group(1)), w))
    for kind, blk in re.findall(r'paragraph--type--pg-evt-(soloist|condtr)[^>]*>(.*?)</div>\s*</div>\s*</div>', h, re.S):
        name = re.search(r'<div class="Bolder-L">(.*?)</div>', blk, re.S)
        role = re.search(r'<div class="P-small">(.*?)(?:</div>|$)', blk, re.S)
        if name and clean(name.group(1)):
            r = clean(role.group(1)) if role else ''
            out['cast'].append((clean(name.group(1)), r or ('direction' if kind == 'condtr' else '')))
    formations = re.findall(r'vocabulary-event-formation">\s*<div class="field field--name-name[^>]*>(.*?)</div>', h, re.S)
    for name in reversed(list(dict.fromkeys(clean(n) for n in formations))):
        if clean(name):
            out['cast'].insert(0, (clean(name), ''))
    for ev in jsonld_events(h):
        loc = ev.get('location') or {}
        if isinstance(loc, dict):
            out['place'] = clean(loc.get('name'))
            addr = loc.get('address')
            out['address'] = clean(addr if isinstance(addr, str) else ' '.join(str(v) for v in (addr or {}).values()))
        out['status'] = str(ev.get('eventStatus') or '')
        try:
            out['start'] = to_zurich_iso(ev.get('startDate'), assume=PARIS_TZ)
        except (TypeError, ValueError):
            pass
        break
    return out


def _venue(place, address=''):
    """(venueName, city or None, known) for a card's or page's place."""
    p = clean(place)
    m = re.match(r'(?i)^maison de la radio(?: et de la musique)?\s*[-–]\s*(.+)$', p)
    if m:
        return f'{HOUSE}, {clean(m.group(1))}', CITY, True
    if re.match(r'(?i)^maison de la radio', p):
        return HOUSE, CITY, True
    if abroad(p) or (address and abroad(address) and not town_in(address)):
        return p, None, True
    town = town_in(address) if address else None
    if not town and ',' in p:
        tail = clean(p.rsplit(',', 1)[1])
        town = town_in(tail) or (tail if re.fullmatch(r"[A-ZÉ][\w'’-]+(?:[ -][\w'’-]+){0,3}", tail) and
                                 not _PARIS_PLACES.search(tail) else None)
    town = town or town_in(p)
    if not town and _PARIS_PLACES.search(p):
        town = CITY
    if town:
        return p, town, True
    return p, None, False


def _credits(cast):
    out = []
    for name, role in cast:
        if not role:
            out.append((group_role(name) or 'Performer', name))
            continue
        c = credit(name, role)
        if c and c[0] not in ('Director', 'Choreographer', 'Composer'):
            out.append(c)
    return out


def _card_credits(card):
    m = re.match(r'^(.*?)\s+(direction|chef de ch(?:oe|œ)ur)\s*$', card['conductor'], re.I)
    if m and clean(m.group(1)):
        return [credit(m.group(1), m.group(2))]
    return []


def _type(title, credits, works):
    roles = [r for r, _ in credits]
    t = guess_type(title)
    if t == 'vocal-opera' or 'Choir' in roles:
        return 'vocal-opera'
    if 'Orchestra' in roles or 'Conductor' in roles:
        return 'orchestral'
    if t:
        return t
    players = [r for r in roles if r not in ('Narrator', 'Host', 'Actor')]
    if len(players) == 1:
        return 'recital'
    if 'Ensemble' in roles or len(players) >= 2:
        return 'chamber'
    return guess_type(' '.join(w for _, w in works))


def fetch():
    today = today_zurich()
    end = today + timedelta(days=WINDOW_DAYS)
    cards = {}
    for n in range(MAX_PAGES):
        if requests_left() <= 0:
            log.warning('radio_france: request cap reached in the agenda at page %d', n)
            break
        try:
            got = parse_agenda(get(_agenda_url(n)))
        except BudgetExceeded as err:
            log.warning('radio_france: stopped reading the agenda: %s', err.reason)
            break
        except FetchError:
            if n == 0:
                raise                                       # the first page must work
            log.warning('radio_france: agenda page %d failed', n)
            continue
        if not got:
            break
        for c in got:
            cards.setdefault(c['sid'], c)
        if date(*got[-1]['date']) > end:
            break
    log.info('radio_france: %d cards in the agenda', len(cards))

    cands, skipped = [], {}
    for c in cards.values():
        why = None
        if not c['time']:
            why = 'no time'
        elif _SKIP_TYPES.search(c['type']) or is_not_a_concert(c['type'] + ' ' + c['title']):
            why = 'not a concert'
        elif not today <= date(*c['date']) <= end:
            why = 'outside the window'
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        c['start'] = paris_iso(*c['date'], *c['time'])
        c['venue'], c['city'], c['known'] = _venue(c['place'])
        if c['known'] and not c['city']:
            skipped['abroad'] = skipped.get('abroad', 0) + 1
            continue
        prev = previous_event(event_id(KEY, c['sid']), c['start'], title=c['title'])
        c['prev'] = prev if prev and (prev.get('credits') or prev.get('program')) and prev.get('city') else None
        cands.append(c)
    log.info('radio_france: %d concerts; skipped %s', len(cands),
             ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())) or 'none')

    def tier(c):
        if not c['known'] and not c['prev']:
            return 0
        if c['prev'] is None:
            return 1
        if refresh_due(c['sid'], c['start'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            return 2
        return None

    order = sorted((c for c in cands if tier(c) is not None), key=lambda c: (tier(c), c['start']))
    pages = {}
    for c in order:
        if requests_left() <= 0:
            break
        try:
            pages[c['sid']] = parse_event(get(f"{BASE}{c['path']}?s={c['sid']}"))
        except BudgetExceeded as err:
            log.warning('radio_france: stopped reading event pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('radio_france %s: event page failed: %s', c['sid'], err)
    log.info('radio_france: %d event page(s) read; %d concerts still without details', len(pages),
             sum(1 for c in cands if c['sid'] not in pages and not c['prev']))

    events = []
    for c in cands:
        page = pages.get(c['sid'])
        credits, works, venue, city = _card_credits(c), [], c['venue'], c['city']
        cancelled = looks_cancelled(c['title']) or looks_cancelled(c['type'])
        if page:
            credits = _credits(page['cast']) or credits
            works = page['works']
            if not c['known'] or page['address']:
                v, town, known = _venue(page['place'] or c['place'], page['address'])
                if known:
                    city = town
                    if not c['known']:
                        venue = v
            cancelled = cancelled or bool(re.search(r'(?i)cancel|postpon', page['status']))
        elif c['prev']:
            credits = [(x.get('role'), x.get('name')) for x in c['prev'].get('credits') or []]
            works = [(p.get('composer'), p.get('title')) for p in c['prev'].get('program') or []]
            city = city or c['prev'].get('city')
            venue = c['prev'].get('venueName') or venue
        if not city:
            log.info('radio_france %s: place unknown or abroad, skipped: %s (%s)', c['sid'], c['title'], c['place'])
            continue
        try:
            events.append(make_event(
                KEY, c['sid'], c['title'], c['start'], city=city, venueName=venue,
                type=_type(c['title'], credits, works), credits=credits, program=works,
                url=f"{BASE}{c['path']}?s={c['sid']}", ticketUrl=f"{BASE}{c['path']}?s={c['sid']}",
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('radio_france %s: skipped: %s', c['sid'], err)
    return events
