"""Wiener Konzerthaus: concerts in the Konzerthaus's halls from the house's own event pages.

    https://konzerthaus.at/sitemap-events.xml                     every upcoming event (id, slug)
    https://konzerthaus.at/de/programm-und-karten/<slug>/<id>     one event page

robots.txt forbids every URL with a query and the site's JSON API (``/*/api/``), and the
programme page shows only ten events (the rest come from that API). So the reader takes the
event list from the sitemap (one request; German and English URL of ~300 upcoming events)
and reads the event pages. Each page has one schema.org Event in JSON-LD (start with offset,
end, hall in ``location.name``, performers with German ``roleName``, ticket link,
``eventStatus``) and, server-rendered, the genre labels ("Orchester", "Kammermusik",
"Literatur", "Junges Publikum" ...) and the programme (composer + work, "Pause" in between).
Only these facts are taken, never the texts.

The pages cost one request each and are read incrementally: an event the previous feed has
(same id, still in the sitemap) is kept as it was, and is read again when it is in the next
week or on a fixed rotation (each about every three weeks), so a moved date or new cast is
picked up within three weeks at the latest. The requests left after the sitemap (cap 150) go
first to events not seen before, then to the due re-reads. Events not seen before are taken
in id order (the site numbers events as they are announced), starting each day at a
different point of that list: events not for Klang (pop, jazz, comedy, literature, about 40%
of the unknown ones) never get into the previous feed and are read again on every pass, so
without the moving start they would use up every run's requests. The slug already tells the
children's series and guided tours, which are never read. Expect three or four daily runs
before every concert of the season is in the feed.

``eventStatus`` is "EventPostponed" on many ordinary concerts whose presale has not opened
yet (checked on 29 Oct 2026: Belcea Quartet 27 Jan 2027, Das Rheingold 1 May 2027), so only
"EventCancelled" or "abgesagt" in the page head mark a cancellation.

The legal notice asks for consent before texts, data or pictures are reproduced; Klang
republishes facts only (date, time, title, hall, performers, works, links back).

Skipped: children's and school formats (Junges Publikum, piccolo, Allez hop!, Concertino,
Mini hop, Schulkonzert, Sing-along, Vorhören!, Klangmobile), guided tours, talks and
introductions ("plus" events, Gespräch/Vortrag/Einführung), literature, comedy, jazz,
pop/rock, world music, brass/crossover and Wienerlied, unless a classical label (Orchester, Kammermusik, Chor/Oratorium/Oper, Lied,
Klavier, Alte Musik, Neue Musik ...) is also given. An event without labels (a hired hall)
is kept when an orchestra, choir, conductor or classical singer is credited; a "Film" concert
is kept when an orchestra plays it.

Checked against the website on 29 Oct 2026 (Wiener Symphoniker/Koopman 2 Nov, Belcea
Quartet 27 Jan, Christmas in Vienna 16 Dec, Lars Eidinger 8 Nov skipped as literature).
"""
from __future__ import annotations

import html as _html
import re

from common import (BudgetExceeded, FetchError, clean, event_id, get, infer_type, jsonld_events, log, looks_cancelled,
                    make_event, previous_events, refresh_due, requests_left, today_zurich, to_zurich_datetime)

from ._vienna import CITY, credit, fold, order_credits

KEY = 'wiener_konzerthaus'
NAME = 'Wiener Konzerthaus'
SITE = 'https://konzerthaus.at/'
ATTRIBUTION = 'Source: Wiener Konzerthaus (konzerthaus.at)'
KIND = 'venue'
COUNTRY = 'austria'
MAX_REQUESTS = 150             # 1 sitemap + event pages
TIME_LIMIT = 1200
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 21

BASE = 'https://konzerthaus.at'
SITEMAP = BASE + '/sitemap-events.xml'

# event slugs that are never for Klang (no request is spent on them)
_SKIP_SLUG_RE = re.compile(
    r'^(?:piccolo|allez-hop|mini-hop|concertino|schulkonzert|sing-along|kindergarten|soundchat|vorhoren|vorhoeren|'
    r'klangmobile|babykonzert|plus-)|backstage|f(?:ue|u)hrung|katalogpr(?:ae|a)sentation|probenbesuch|gespr(?:ae|a)ch', re.I)
_CLASSICAL_LABELS = re.compile(r'orchester|kammermusik|chor|oratorium|oper|lied|klavier|solist|alte musik|neue musik|'
                               r'barock|orgel|streichquartett|klassik|zeitgen', re.I)
_CHILD_LABELS = re.compile(r'junges publikum|kinder|familie|schule', re.I)
_OTHER_LABELS = re.compile(r'jazz|pop|rock|comedy|kabarett|literatur|lesung|welt|global|wienerlied|volksmusik|'
                           r'chanson|gespr[äa]ch|vortrag|einf[üu]hrung|film|tanz|electronic|elektronik|songwriter', re.I)
_TALK_TITLE_RE = re.compile(r'einf[üu]hrung|gespr[äa]ch|vortrag|f[üu]hrung|backstage|workshop|lesung\b', re.I)


# ---------------------------------------------------------------------------
# sitemap
# ---------------------------------------------------------------------------

def parse_sitemap(xml):
    """-> {id: url} for the German event pages."""
    out = {}
    for url in re.findall(r'<loc>\s*(https://konzerthaus\.at/de/programm-und-karten/[^<\s]+/(\d+))\s*</loc>', xml or ''):
        out.setdefault(url[1], _html.unescape(url[0]))
    return out


# ---------------------------------------------------------------------------
# event page
# ---------------------------------------------------------------------------

def parse_page(page_html):
    """-> dict of facts from one event page, or None without a JSON-LD Event."""
    evs = jsonld_events(page_html)
    if not evs:
        return None
    ev = evs[0]
    h = page_html or ''
    main = h[h.find('<main'):] if '<main' in h else h
    title = clean(ev.get('name'))
    head = re.search(r'<h1[^>]*event-detail__hero--title[^>]*>(.*?)</h1>', main, re.S)
    if head and clean(head.group(1)):
        title = clean(head.group(1))
    labels = [clean(x) for x in re.findall(r'<span[^>]*class="event-label"[^>]*>(.*?)</span>', main, re.S)]
    loc = ev.get('location') if isinstance(ev.get('location'), dict) else {}
    addr = loc.get('address') if isinstance(loc.get('address'), dict) else {}
    performers = []
    for p in ev.get('performer') or []:
        if isinstance(p, dict) and clean(p.get('name')):
            performers.append((clean(p.get('name')), clean(p.get('roleName'))))
    works = []
    booklet = re.search(r'<ul class="event-program-booklet">(.*?)</ul>', main, re.S)
    for item in re.findall(r'<li class="event-program-booklet__item">(.*?)</li>', booklet.group(1) if booklet else '', re.S):
        group = re.search(r'<div class="event-program-booklet__group"><span class="text-body">(.*?)</span>(.*)', item, re.S)
        if not group:
            continue                                    # 'Pause' or a note
        composer = clean(group.group(1))
        titles = [clean(x) for x in re.findall(r'<span class="text-body-secondary-small">(.*?)</span>', group.group(2), re.S)]
        if not composer:
            continue                                    # a line of text ('… liest und singt …'), not a work
        for t in titles or ['']:
            works.append((composer, t))
    offers = ev.get('offers') or []
    offers = offers if isinstance(offers, list) else [offers]
    ticket = next((o.get('url') for o in offers if isinstance(o, dict) and o.get('url')), None)
    hero = re.search(r'event-detail__hero(.*?)event-casts', main, re.S)
    status = str(ev.get('eventStatus') or '')
    return {
        'title': title, 'start': ev.get('startDate'), 'end': ev.get('endDate'),
        'hall': clean(loc.get('name')), 'locality': clean(addr.get('addressLocality')),
        'street': clean(addr.get('streetAddress')), 'country': clean(addr.get('addressCountry')),
        'labels': labels, 'performers': performers, 'works': works, 'ticket': ticket,
        'cancelled': status.endswith('EventCancelled') or bool(hero and re.search(r'(?i)\babgesagt\b|entfällt', clean(hero.group(1)))),
    }


def classify(d):
    """None if the event is for Klang, else the reason to skip it."""
    labels = ' | '.join(d['labels'])
    if _CHILD_LABELS.search(labels):
        return 'children'
    if _TALK_TITLE_RE.search(d['title']) and not re.search(r'konzert', d['title'], re.I):
        return 'talk / tour'
    roles = {r for r, _ in _credits(d)}
    if _CLASSICAL_LABELS.search(labels):
        return None
    if re.search(r'(?i)\bfilm', labels) and 'Orchestra' in roles and not re.search(r'(?i)jazz|pop|rock', labels):
        return None                                     # film music played by an orchestra
    if _OTHER_LABELS.search(labels):
        return 'not classical'
    if roles & {'Orchestra', 'Choir', 'Conductor', 'Soprano', 'Mezzo-soprano', 'Tenor', 'Baritone', 'Bass',
                'Countertenor', 'Alto'}:
        return None
    if d['works'] and infer_type(d['title'], _credits(d), d['works']):
        return None
    return 'no classical label'


def _credits(d):
    return order_credits([c for c in (credit(n, r) for n, r in d['performers']) if c])


def _venue(d):
    """-> (venueName, city) or (None, None) for a performance abroad."""
    hall = d['hall'] or 'Großer Saal'
    loc = fold(d['locality'])
    if not loc or loc in ('wien', 'vienna') or 'lothringerstr' in fold(d['street']):
        if 'lothringerstr' in fold(d['street']) or not d['street']:
            return f'Wiener Konzerthaus, {hall}', CITY
        return hall, CITY
    if d['country'] and d['country'].upper() not in ('AT', 'AUT', 'ÖSTERREICH', 'AUSTRIA'):
        return None, None
    return hall, d['locality']


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def _from_previous(prev):
    """make_event keyword arguments rebuilt from a previous feed record."""
    return dict(
        city=prev.get('city'), venueName=prev.get('venueName'), type=prev.get('type'), series=prev.get('series'),
        durationMin=prev.get('durationMin'),
        credits=[(x.get('role'), x.get('name')) for x in prev.get('credits') or []],
        program=[(x.get('composer') or '', x.get('title') or '') for x in prev.get('program') or []],
        ticketUrl=prev.get('ticketUrl'), url=prev.get('url'), status=prev.get('status'))


def fetch():
    today = today_zurich()
    pages = parse_sitemap(get(SITEMAP))                 # FetchError propagates
    prev = {}
    for e in previous_events(KEY):
        sid = str(e.get('id', '')).rsplit('-', 1)[-1]
        prev[sid] = e
    skipped_slug = {k for k, u in pages.items() if _SKIP_SLUG_RE.search(u.rstrip('/').split('/')[-2])}
    todo_new, todo_due, keep = [], [], {}
    for sid, url in pages.items():
        if sid in skipped_slug:
            continue
        p = prev.get(sid)
        if p is None or event_id(KEY, sid) != p.get('id'):
            todo_new.append(sid)
            continue
        try:
            past = to_zurich_datetime(p['start']).date() < today
        except (ValueError, KeyError, TypeError):
            past = True
        if past:
            continue
        keep[sid] = p
        if refresh_due(sid, p.get('start'), near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            todo_due.append(sid)
    todo_new.sort(key=int)
    todo_due.sort(key=lambda s: keep[s].get('start') or '')
    # Events never kept (not yet read, or not for Klang and so never in the previous feed) are
    # read in a window that moves along the id list from run to run, so that the ones not for
    # Klang at the front cannot use up every run's requests.
    chunk = max(1, requests_left() - len(todo_due))
    if len(todo_new) > chunk:
        cycles = -(-len(todo_new) // chunk)
        start = (today.toordinal() % cycles) * chunk
        todo_new = todo_new[start:] + todo_new[:start]

    read, skipped, events = {}, {}, {}
    for sid in todo_new + todo_due:
        if requests_left() <= 0:
            break
        try:
            d = parse_page(get(pages[sid]))
        except BudgetExceeded as err:
            log.warning('%s: stopped reading event pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: event page failed: %s', KEY, sid, err)
            continue
        if d is None:
            log.warning('%s %s: no JSON-LD event on the page', KEY, sid)
            continue
        read[sid] = d
        why = classify(d)
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            log.debug('%s %s skipped (%s): %s %s', KEY, sid, why, d['title'], d['labels'])
            keep.pop(sid, None)
            continue
        venue, city = _venue(d)
        if not city:
            skipped['abroad'] = skipped.get('abroad', 0) + 1
            keep.pop(sid, None)
            continue
        credits = _credits(d)
        try:
            events[sid] = make_event(
                KEY, sid, d['title'], d['start'], end=d['end'], city=city, venueName=venue,
                type=infer_type(d['title'], credits, d['works']), credits=credits, program=d['works'],
                ticketUrl=d['ticket'], url=pages[sid],
                status='cancelled' if d['cancelled'] or looks_cancelled(d['title']) else 'scheduled')
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, sid, err)
        keep.pop(sid, None)
    reused = 0
    for sid, p in keep.items():
        try:
            events[sid] = make_event(KEY, sid, p.get('title'), p.get('start'), **_from_previous(p))
            reused += 1
        except (ValueError, TypeError) as err:
            log.warning('%s %s: previous record unusable: %s', KEY, sid, err)
    unread = len([s for s in todo_new if s not in read])
    log.info('%s: %d events in the sitemap (%d skipped by slug); %d pages read, %d reused, %d not read yet; '
             'skipped %s', KEY, len(pages), len(skipped_slug), len(read), reused, unread,
             ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())) or 'none')
    return list(events.values())
