"""Pierre Boulez Saal, Berlin: the hall's own event list (one page).

    https://www.boulezsaal.de/de/events

The page embeds every upcoming event (about 110, the whole published season) as JSON in the
``:events`` attribute of its <event-calendar> element: title, start/end with offset, venue,
genres, the cast with instruments (``casts``) and the programme (``programs``: composer, work).
One request per run. Only those facts are taken, never the descriptions.

Checked against the website on 29 Oct 2026: 111 events, first 1 Nov 2026, last 13 Jun 2027;
start times with offset ("2026-11-01T16:00:00+01:00" = 16.00 on the page). "***" in the
programme is the interval and is dropped.

Skipped: jazz/improvised and Arabic/Persian music genres, family and baby concerts
("Elternzeitkonzert", genre "Kinder & Erwachsene"), workshops, readings (Akademie-Forum), films,
talks, and electronic sets without a programme (all performers on live electronics).
Kept: Akademie concerts of the Barenboim-Said Akademie, the West-Eastern Divan Orchestra in the
Philharmonie (also listed by the Berliner Philharmoniker; build.py merges them), the Boulez
Ensemble at Berghain.
"""
from __future__ import annotations

import html as _html
import json
import re

from common import clean, get, guess_type, log, make_event

from ._berlin import CITY, abroad, berlin_iso, credit, german_town, is_interval, is_pop, skip_title, venue_name

KEY = 'boulez_saal'
NAME = 'Pierre Boulez Saal'
SITE = 'https://www.boulezsaal.de/'
ATTRIBUTION = 'Source: Pierre Boulez Saal (boulezsaal.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 5
TIME_LIMIT = 120

BASE = 'https://www.boulezsaal.de'
LISTING = BASE + '/de/events'

_SKIP_GENRES = {'improvisierte musik & jazz', 'arabische & persische musik', 'kinder & erwachsene'}
_CLASSICAL_GENRES = {'vokal', 'klavier', 'quartett', 'duo', 'trio', 'solo', 'musik vor 1750', 'boulez ensemble',
                     'akademie-veranstaltung', 'ensemble & orchester'}
_ELECTRONIC_RE = re.compile(r'elektronik|electronic|\bdj\b|vocals', re.I)


def parse_events(page_html):
    """-> the list of event dicts embedded in the page (raw JSON objects)."""
    m = re.search(r'<event-calendar\b[^>]*?\s:events="([^"]*)"', page_html or '', re.S)
    if not m:
        m = re.search(r'<event-filter\b[^>]*?\s:events="([^"]*)"', page_html or '', re.S)
    if not m:
        return []
    try:
        data = json.loads(_html.unescape(m.group(1)))
    except ValueError as err:
        log.warning('%s: events JSON unreadable: %s', KEY, err)
        return []
    return data if isinstance(data, list) else []


_SMALL = {'der', 'die', 'das', 'des', 'dem', 'den', 'mit', 'und', 'von', 'für', 'im', 'in', 'am', 'an', 'zu',
          'aus', 'of', 'and', 'the', 'with', 'de', 'la', 'le', 'du', 'di', 'del', 'con'}


def _spelled(title, names):
    """The site writes titles in capitals ('SIR ANDRÁS SCHIFF & ENSEMBLE'). Words of performers'
    names take the cast's spelling, small words are lower-cased, other words capitalised;
    short words without a vowel stay as acronyms ('SDLW')."""
    t = clean(title)
    letters = re.sub(r'[^A-Za-zÀ-ÿĀ-žА-я]', '', t)
    if not letters or letters != letters.upper():
        return t
    known = {}
    for n in names:
        for w in re.findall(r"[^\s,&]+", clean(n)):
            known.setdefault(w.upper(), w)

    def word(m):
        w = m.group(0)
        if w in known:
            return known[w]
        low = w.lower()
        if low in _SMALL:
            return low
        if re.fullmatch(r'[IVX]+', w) or (len(w) <= 5 and not re.search(r'[AEIOUÄÖÜÉÈÀÁ]', w)):
            return w
        return '-'.join(p[:1].upper() + p[1:].lower() for p in w.split('-'))

    out = re.sub(r"[^\s,&:;()]+", word, t)
    return out[:1].upper() + out[1:]


def _credits(ev):
    out = []
    for c in (ev.get('casts') or {}).values() if isinstance(ev.get('casts'), dict) else ev.get('casts') or []:
        if not isinstance(c, dict):
            continue
        cr = credit(c.get('instrument'), c.get('name'))
        if cr:
            out.append(cr)
    return out


def _program(ev):
    out = []
    for p in ev.get('programs') or []:
        if not isinstance(p, dict):
            continue
        composer, title = clean(p.get('composerName')), clean(p.get('title'))
        if is_interval(composer) and is_interval(title):
            continue
        if not composer and not title:
            continue
        sub = clean(p.get('subTitle'))
        if sub and title and re.match(r'(?i)f(?:ü|u)r\b', sub) and sub.lower() not in title.lower() and len(sub) <= 80:
            title = f'{title} {sub}'             # the scoring ('für Männerchor a cappella'), not notes
        out.append((composer, title))
    return out


def _skip(ev, credits, program):
    genres = {clean(g.get('name')).lower() for g in ev.get('genres') or [] if isinstance(g, dict)}
    text = f"{ev.get('title')} {ev.get('subtitle') or ''}"
    if genres & _SKIP_GENRES:
        return 'jazz / world / family'
    if skip_title(text):
        return 'workshop / talk / film / family'
    if not program:
        roles = [r for r, _ in credits]
        if not genres or not (genres & _CLASSICAL_GENRES):
            return 'no programme, not a classical genre'
        if roles and all(_ELECTRONIC_RE.search(r) for r in roles):
            return 'electronic set'
        if is_pop(text):
            return 'pop / jazz'
    return None


def _type(ev, credits, program):
    genres = {clean(g.get('name')).lower() for g in ev.get('genres') or [] if isinstance(g, dict)}
    roles = [r for r, _ in credits]
    text = f"{ev.get('title')} {ev.get('subtitle') or ''}"
    if 'Choir' in roles:
        return 'vocal-opera'
    if 'Orchestra' in roles:
        return 'orchestral'
    if 'vokal' in genres:
        players = [n for r, n in credits if r not in ('Orchestra', 'Ensemble', 'Choir')]
        return 'recital' if len(players) <= 3 and not ('Ensemble' in roles) else 'vocal-opera'
    if genres & {'quartett', 'duo', 'trio'}:
        return 'chamber'
    if genres & {'klavier', 'solo'}:
        players = [n for r, n in credits if r not in ('Presenter', 'Narrator')]
        return 'recital' if len(players) == 1 else 'chamber'
    g = guess_type(text)
    if g:
        return g
    return 'chamber' if credits else None


def fetch():
    page = get(LISTING)
    raw = parse_events(page)
    if not raw:
        log.warning('%s: no events found on %s', KEY, LISTING)
    events, skipped = [], {}
    for ev in raw:
        if not isinstance(ev, dict) or not ev.get('id') or not ev.get('startDate'):
            continue
        credits = _credits(ev)
        program = _program(ev)
        why = _skip(ev, credits, program)
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        v = ev.get('venue') or {}
        place = clean(v.get('externalName') or v.get('externalNameShort') or 'Pierre Boulez Saal')
        city = clean(v.get('city')) or CITY
        if city.lower() != 'berlin':
            if abroad(f'{place} {city}'):
                skipped['abroad'] = skipped.get('abroad', 0) + 1
                continue
            city = german_town(city) or city
        else:
            city = CITY
        urls = ev.get('urls') or {}
        url = urls.get('detailPage')
        url = BASE + url if url and url.startswith('/') else url
        booking = (ev.get('currentBookingButtonConfig') or {}).get('href')
        ticket = booking if booking and booking.startswith('http') else urls.get('shopUrl')
        sell = ev.get('sellingStatus') or {}
        cancelled = bool(ev.get('isCancelled')) or bool(sell.get('isCanceled'))
        title = _spelled(ev.get('title'), [n for _, n in credits])
        try:
            events.append(make_event(
                KEY, ev['id'], title, berlin_iso(ev['startDate']),
                city=city, venueName=venue_name(place), type=_type(ev, credits, program),
                credits=credits, program=program, ticketUrl=ticket, url=url,
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, ev.get('id'), err)
    if skipped:
        log.info('%s: skipped %s', KEY, ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    return events
