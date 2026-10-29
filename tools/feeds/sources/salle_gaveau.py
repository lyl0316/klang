"""Salle Gaveau (Paris 8e): recitals, chamber music, baroque and symphonic concerts.

    https://sallegaveau.com/                           home page: every coming event (one request)
    https://sallegaveau.com/event-pro/<slug>/          one page per event

The home page carries two listings: a year/month calendar (only one event per day, titles
upper-cased) and the "À l'affiche" carousel, which has every coming event with its date
("05 Mar. 2027"), time ("20:30"), title, link and categories ("Concerts symphoniques",
"Récitals de piano", "Musique baroque", "En Famille", "Les Clash", "Jazz à Gaveau" …).
The reader takes the carousel (checked against the calendar on 29 Oct 2026: every
calendar event is in it).

robots.txt asks for a Crawl-delay of 10 seconds, and the site answered HTTP 429 (Retry-After
120 s) after about 50 event pages in a row on 29 Oct 2026, so a run reads at most ~55 event
pages and stops at the first 429 (the rest wait for the next run). The event page adds the works
("Programme": "<b>Composer</b> • <em>Work</em>") and the performers ("Interprètes":
"<b>Name</b> • <em>role</em>"). Event pages are read incrementally: a concert the previous
feed already has with its cast or works (same id, start and title) keeps them, and the
time left goes to concerts still missing details, soonest first, then to those within two
weeks and a fixed share of the others (each about every two weeks). An ensemble listed with
a soloist's instrument ("Orchestre Consuelo • violon", a slip on the site) is credited as
the ensemble. Checked against the website on 29 Oct 2026 (Tchaikovsky – Concerto pour
violon, 5 Mar 2027 20h30: Pierre Fouchenneret, Orchestre Consuelo, Victor
Julien-Laferrière).

Skipped: family and baby concerts (En Famille, Bébé Concert, Concert Doudou, contes
musicaux), the "Clash" crossover evenings (classics against pop, rap, rock), the jazz
series (Jazz à Gaveau) and chanson evenings.
"""
from __future__ import annotations

import re
from datetime import date

from common import BudgetExceeded, FetchError, clean, event_id, get, guess_type, log, looks_cancelled, make_event, \
    previous_event, refresh_due, requests_left, today_zurich

from ._paris import credit, fold, group_role, is_not_a_concert, paris_iso

KEY = 'salle_gaveau'
NAME = 'Salle Gaveau'
SITE = 'https://www.sallegaveau.com/'
ATTRIBUTION = 'Source: Salle Gaveau (sallegaveau.com)'
KIND = 'venue'
COUNTRY = 'france'
MAX_REQUESTS = 60              # crawl-delay 10 s; the site answered HTTP 429 after ~50 pages in a row
TIME_LIMIT = 1200
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 14

HOME = 'https://sallegaveau.com/'                 # www. redirects here
VENUE = 'Salle Gaveau'
CITY = 'Paris'

_MONTHS = {'jan': 1, 'fev': 2, 'mar': 3, 'avr': 4, 'mai': 5, 'juin': 6, 'juil': 7, 'aou': 8, 'sep': 9, 'oct': 10,
           'nov': 11, 'dec': 12}
_SKIP_CATS = re.compile(r'(?i)en famille|les clash|jazz')
_SKIP_TITLE = re.compile(r'(?i)\bclash\b|b[ée]b[ée] concert|doudou|conte musical|chante aznavour|\bjazz\b|'
                         r'chanson fran|stand-?up|humour')
_CAT_TYPES = (
    (r'concerts symphoniques', 'orchestral'), (r'r[ée]citals de piano', 'recital'), (r'r[ée]citals lyriques', 'recital'),
    (r'musique de chambre', 'chamber'),
)


def parse_home(page):
    """-> list of {slug, url, title, date:(y,m,d), time:(h,m), cats} from the carousel."""
    out, seen = [], set()
    for item in re.split(r'<div data-id="\d+" class="item item\d+', page or '')[1:]:
        href = re.search(r'href="(https://sallegaveau\.com/event-pro/([^"/]+)/?)"', item)
        day = re.search(r'<div class="day">\s*(\d{1,2})\s+([A-Za-zéûÉ]+)\.?\s+(\d{4})\s*</div>', item)
        tm = re.search(r'class="timeevent">\s*(\d{1,2})[:h](\d{2})', item)
        title = re.search(r'<div class="item-title"><h3>(.*?)</h3>', item, re.S)
        if not (href and day and tm and title):
            continue
        mo = _MONTHS.get(fold(day.group(2))[:4].rstrip('.')) or _MONTHS.get(fold(day.group(2))[:3])
        if not mo:
            continue
        key = (href.group(2), day.groups(), tm.groups())
        if key in seen:
            continue
        seen.add(key)
        out.append({'slug': href.group(2), 'url': href.group(1).rstrip('/') + '/', 'title': clean(title.group(1)),
                    'date': (int(day.group(3)), mo, int(day.group(1))), 'time': (int(tm.group(1)), int(tm.group(2))),
                    'cats': [re.sub(r'^N\s+', '', clean(c)) for c in re.findall(r'taxonomy-name">(.*?)</div>', item)]})
    return out


def _pairs(fragment):
    """'<span class="ultra-gras">A</span> • <em>B</em><br' lines -> [(A, B)]."""
    out = []
    for line in re.split(r'(?i)<br\b\s*/?>?|</p>', fragment or ''):
        a = re.search(r'<span class="ultra-gras">(.*?)</span>', line, re.S)
        if not a or not clean(a.group(1)):
            continue
        rest = line[a.end():]
        b = re.search(r'<em>(.*?)</em>', rest, re.S)
        b = clean(b.group(1)) if b else clean(re.sub(r'.*?•', '', clean(rest), count=1))
        out.append((clean(a.group(1)), b.strip(' •')))
    return out


def parse_event(page):
    """-> {'title', 'works': [(composer, work)], 'cast': [(name, role)], 'cancelled': bool}."""
    h = page or ''
    out = {'title': '', 'works': [], 'cast': [], 'cancelled': False}
    t = re.search(r'<h1[^>]*>(.*?)</h1>', h, re.S)
    out['title'] = clean(t.group(1)) if t else ''
    prog = re.search(r'>Programme</p>(.*?)(?:<p class="edit-titre-font-operetta">|<hr)', h, re.S)
    if prog:
        out['works'] = _pairs(prog.group(1))
    cast = re.search(r'>Interpr[èe]tes</p>(.*?)(?:<p class="edit-titre-font-operetta">|<hr)', h, re.S)
    if cast:
        out['cast'] = _pairs(cast.group(1))
    out['cancelled'] = bool(re.search(r'(?i)>\s*(?:concert |spectacle )?(?:annul[ée]e?|report[ée]e?)\s*<', h))
    return out


def credits_from(cast):
    out = []
    for name, role in cast:
        g = group_role(name)
        if g and (not role or credit(name, role)[0] not in ('Orchestra', 'Choir', 'Ensemble', 'Conductor')):
            if not (role and re.search(r'(?i)direction', role)):
                out.append((g, name))                       # 'Orchestre Consuelo • violon': the orchestra
                continue
        c = credit(name, role)
        if c and c[0] not in ('Director', 'Choreographer', 'Composer'):
            out.append(c)
    return out


def _type(cats, title, credits, works):
    roles = [r for r, _ in credits]
    text = ' '.join(cats)
    if re.search(r'(?i)baroque', text):
        if 'Choir' in roles or guess_type(title) == 'vocal-opera':
            return 'vocal-opera'
    if guess_type(title) == 'vocal-opera' or 'Choir' in roles:
        return 'vocal-opera'
    for rx, kind in _CAT_TYPES:
        if re.search(rx, fold(text)):
            return kind
    if 'Orchestra' in roles or 'Conductor' in roles:
        return 'orchestral'
    return guess_type(title + ' ' + ' '.join(w for _, w in works))


def fetch():
    items = parse_home(get(HOME))                      # FetchError propagates: build reuses the previous feed
    today = today_zurich()
    cands, skipped = [], {}
    for it in items:
        why = None
        if any(_SKIP_CATS.search(c) for c in it['cats']):
            why = 'family / crossover / jazz'
        elif _SKIP_TITLE.search(it['title']) or is_not_a_concert(it['title']):
            why = 'not a classical concert'
        elif date(*it['date']) < today:
            why = 'past'
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        y, mo, d = it['date']
        it['start'] = paris_iso(y, mo, d, *it['time'])
        it['sid'] = f"{it['slug']}-{y:04d}{mo:02d}{d:02d}"
        prev = previous_event(event_id(KEY, it['sid']), it['start'], title=it['title'])
        it['prev'] = prev if prev and (prev.get('credits') or prev.get('program')) else None
        cands.append(it)
    log.info('salle_gaveau: %d events on the home page, %d kept; skipped %s', len(items), len(cands),
             ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())) or 'none')

    def tier(it):
        if it['prev'] is None:
            return 0
        if refresh_due(it['sid'], it['start'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    pages = {}
    for it in sorted((i for i in cands if tier(i) is not None), key=lambda i: (tier(i), i['start'])):
        if requests_left() <= 0:
            break
        try:
            pages[it['sid']] = parse_event(get(it['url']))
        except BudgetExceeded as err:
            log.warning('salle_gaveau: stopped reading event pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('salle_gaveau %s: event page failed: %s', it['sid'], err)
            if getattr(err, 'status', None) == 429:
                break                                       # the site asks us to slow down: next run
    log.info('salle_gaveau: %d event page(s) read; %d concerts still without details', len(pages),
             sum(1 for i in cands if i['sid'] not in pages and not i['prev']))

    events = []
    for it in cands:
        page = pages.get(it['sid'])
        credits, works, cancelled = [], [], looks_cancelled(it['title'])
        if page:
            credits, works = credits_from(page['cast']), page['works']
            names = {fold(n) for _, n in credits}
            m = re.match(r'^(.+?)\s+[–-]\s+(piano|violon|violoncelle|guitare|harpe|clavecin|orgue)\b', it['title'], re.I)
            for c, w in list(works):                        # 'Grzegorz Niemczuk • piano' in the programme block
                if w and credit(c, w) and credit(c, w)[0] not in ('Performer', 'Composer') and fold(c) in fold(it['title']):
                    works.remove((c, w))
                    if fold(c) not in names:
                        credits.append(credit(c, w))
            if not credits and m:
                credits = [credit(m.group(1), m.group(2))]
            cancelled = cancelled or page['cancelled']
        elif it['prev']:
            credits = [(x.get('role'), x.get('name')) for x in it['prev'].get('credits') or []]
            works = [(p.get('composer'), p.get('title')) for p in it['prev'].get('program') or []]
        try:
            events.append(make_event(
                KEY, it['sid'], it['title'], it['start'], city=CITY, venueName=VENUE,
                type=_type(it['cats'], it['title'], credits, works), series=None,
                credits=credits, program=works, url=it['url'], ticketUrl=it['url'],
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('salle_gaveau %s: skipped: %s', it['sid'], err)
    return events
