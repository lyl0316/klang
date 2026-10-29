"""Thomaskirche Leipzig: motets and cantatas of the Thomanerchor, organ vespers and concerts in
Bach's church, from the church's own calendar (Kirchgemeinde St. Thomas).

    https://www.thomaskirche.org/erleben/kalender                     page 1, 10 events
    https://www.thomaskirche.org/erleben/kalender?…[currentPage]=N&cHash=…   the next pages

The calendar lists ~210 coming events, 10 per page (~22 pages; robots.txt allows the pager's
cHash links, they are followed as the site prints them). Each entry has schema.org microdata
(startDate in local time without offset), a category ("Musik in Bachs Kirche", "Konzert",
"Gottesdienst" …), the title, a subtitle and a short text that lists the performers one per
line ("Thomaskantor Andreas Reize, Leitung", "Ivo Mrvelj, Orgel", "THOMANERCHOR Leipzig") and the
works ("Johann Sebastian Bach (1685–1750): Fuge G-Dur, BWV 541/2", "Bach-Kantate: „…“ BWV 80").
Only those lines are taken (performers and works); prose, prices and notes are ignored. No
detail pages are read.

The Thomanerchor's own site (thomanerchor.de) has an iCal feed, but its performer text runs
together without separators; the church's calendar is the cleaner official source and covers
every motet and concert in the Thomaskirche (the choir's tours elsewhere are left out).

Kept: motets (Friday 18:00 and Saturday 15:00, with Bach cantata on Saturdays), organ vespers,
concerts. Skipped: services ("Gottesdienst"), devotions, prayers, guided tours, talks and
children's formats. Motets in the Gewandhausorchester's calendar are the same events
(build.py merges them by venue and time). Checked against the website on 29 Oct 2026.
"""
from __future__ import annotations

import html as _html
import re

from common import BudgetExceeded, FetchError, clean, get, log, looks_cancelled, make_event, requests_left

from ._saxony import berlin_iso, cast_credits, group_role, looks_like_person, skip_reason, strip_life_dates, voice_role

KEY = 'thomaskirche_leipzig'
NAME = 'Thomaskirche Leipzig'
SITE = 'https://www.thomaskirche.org/'
ATTRIBUTION = 'Source: Thomaskirche Leipzig – Kirchgemeinde St. Thomas (thomaskirche.org)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 40
TIME_LIMIT = 300

BASE = 'https://www.thomaskirche.org'
CALENDAR = BASE + '/erleben/kalender'
MAX_PAGES = 35
CITY = 'Leipzig'

_SKIP_CATEGORY = re.compile(r'(?i)gottesdienst|andacht|gebet|f[üu]hrung|vortrag|gespr[äa]ch|kinder|familie|'
                            r'gemeinde|seelsorge|ausstellung|lesung')
_SKIP_TITLE = re.compile(r'(?i)gottesdienst|andacht|gebet|abendmahl|taufe|f[üu]hrung|vortrag|lesung|'
                         r'kinder|familie|mitsing|offenes singen|tag der offenen|singt euch ein|pr[üu]fungskonzert')
_CLERGY_RE = re.compile(r'(?i)pfarrer|pfarrerin|superintendent|bischof|prediger|lektor|liturg|diakon|vikar')
_TITLE_WORD = re.compile(r'(?i)^(?:thomaskantor(?:in)?|thomasorganist(?:in)?|assistenzorganist(?:in)?|'
                         r'kantor(?:in)?|organist(?:in)?|kmd|lkmd|prof\.|dr\.)\s+')


def _person_line(line):
    """One performer line -> (German role, name) or None.
    'Thomaskantor Andreas Reize, Leitung' / 'Ivo Mrvelj, Orgel' / 'Assistenzorganist Ivo Mrvelj' /
    'Sopran: Name' / 'THOMANERCHOR Leipzig'."""
    t = clean(line).strip(' ,;')
    if not t or len(t) > 90 or _CLERGY_RE.search(t) or re.search(r'(?i)\bf[üu]r\b|\d|programm|tickets?\b|eintritt', t):
        return None
    m = re.match(r'^(.+?),\s*([^,]+)$', t)
    if m and voice_role(m.group(2)) is not None and voice_role(m.group(2)) != '':
        name = _TITLE_WORD.sub('', _TITLE_WORD.sub('', m.group(1).strip()))
        return (m.group(2).strip(), name) if looks_like_person(name, 7) or group_role(name) else None
    m = re.match(r'^([A-ZÄÖÜa-zäöü -]{3,30}):\s*(.+)$', t)
    if m and voice_role(m.group(1)):
        return (m.group(1).strip(), m.group(2).strip())
    m = re.match(r'(?i)^(thomasorganist(?:in)?|assistenzorganist(?:in)?|organist(?:in)?)\s+(.+)$', t)
    if m:
        return ('Orgel', _TITLE_WORD.sub('', m.group(2)))
    m = re.match(r'(?i)^(thomaskantor(?:in)?|kantor(?:in)?)\s+(.+)$', t)
    if m:
        return ('Leitung', m.group(2).strip())
    if group_role(t) or re.search(r'(?i)thomanerchor|gewandhausorchester|musiker des', t):
        return ('', t)
    return None


_WORK_RE = re.compile(r'^(?P<composer>[A-ZÄÖÜ][^:()]{2,60}?)\s*(?:\([^)]*\d{3,4}[^)]*\))?\s*:\s*(?P<work>\S.{2,})$')
_CANTATA_RE = re.compile(r'(?i)^(?:bach-)?kantate\b\s*:?\s*(.+)$')


def _work_line(line):
    t = clean(line).strip(' ,;')
    if not t or len(t) > 220:
        return None
    m = _CANTATA_RE.match(t)
    if m:
        return ('Johann Sebastian Bach' if re.search(r'BWV', t) else '', clean(m.group(1)))
    m = _WORK_RE.match(t)
    if m:
        composer = strip_life_dates(m.group('composer'))
        if looks_like_person(composer, 6) and not voice_role(composer) and not re.search(
                r'(?i)programm|mitwirkende|tickets?|orgelwerke|eintritt|hinweis|\bort\b|preise?|leitung|vorverkauf|'
                r'abendkasse|\btext\b|karten|veranstalter|einlass|dauer', composer):
            return (composer, clean(m.group('work')))
    return None


def parse_page(page_html):
    """-> (events, pager links) of one calendar page."""
    h = page_html or ''
    events = []
    for item in re.split(r'<div class="event-item"', h)[1:]:
        start = re.search(r'itemprop="startDate" content="(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})"', item)
        title = re.search(r'<h2 class="title[^"]*"[^>]*>(.*?)</h2>', item, re.S)
        link = re.search(r'href="(/erleben/detail-veranstaltung/event/(\d+)/(\d+))"', item)
        if not (start and title and link):
            continue
        category = re.search(r'<h5 class="category">(.*?)</h5>', item, re.S)
        subtitle = re.search(r'<p class="subtitle">(.*?)</p>', item, re.S)
        place = re.search(r'itemprop="name">\s*\|?\s*([^<]+)</span>', item)
        teaser = re.search(r'<p class="event-item__text event-item__teaser"[^>]*>(.*?)</p>', item, re.S)
        lines = [clean(x) for x in re.split(r'<br\s*/?>', teaser.group(1) if teaser else '')]
        people, works = [], []
        for line in lines:
            w = _work_line(line)
            if w:
                works.append(w)
                continue
            p = _person_line(line)
            if p:
                people.append(p)
        events.append({
            'id': f'{link.group(2)}-{link.group(3)}', 'url': BASE + link.group(1), 'start': start.group(1),
            'title': clean(re.sub(r'<span[^>]*></span>', '', title.group(1))),
            'category': clean(category.group(1)) if category else '',
            'subtitle': clean(subtitle.group(1)) if subtitle else '',
            'place': clean(place.group(1)).strip(' |') if place else '', 'people': people, 'works': works,
            'text': clean(teaser.group(1)) if teaser else '',
        })
    pager = [_html.unescape(u) for u in re.findall(r'href="(/erleben/kalender\?[^"]*currentPage[^"]*)"', h)]
    return events, pager


def _page_no(url):
    m = re.search(r'currentPage%5D=(\d+)|currentPage\]=(\d+)', url)
    return int(m.group(1) or m.group(2)) if m else 1


def _venue(place):
    p = clean(place)
    if not p or re.match(r'(?i)^thomaskirche$', p):
        return 'Thomaskirche Leipzig'
    if re.search(r'(?i)thomaskirche', p):
        return f'Thomaskirche Leipzig, {re.sub(r"(?i)thomaskirche[,: -]*", "", p).strip()}'.rstrip(', ')
    return f'{p}, Leipzig' if 'leipzig' not in p.lower() else p


def _type(ev, credits):
    roles = {r for r, _ in credits}
    text = f"{ev['title']} {ev['subtitle']}".lower()
    if re.search(r'orgelvesper|orgelkonzert|orgelmusik', text) or roles == {'Organ'}:
        return 'recital'
    if 'Choir' in roles or re.search(r'motette|kantate|oratori|passion|messe|requiem|chor', text):
        return 'vocal-opera'
    if re.search(r'orgel', text) or roles == {'Organ'}:
        return 'recital'
    if 'Orchestra' in roles:
        return 'orchestral'
    if 'Ensemble' in roles or len(credits) >= 2:
        return 'chamber'
    return 'recital' if len(credits) == 1 else None


def fetch():
    first = get(CALENDAR)
    rows, pager = parse_page(first)
    todo = {}
    for u in pager:
        todo.setdefault(_page_no(u), u)
    done = {1}
    while todo:
        n = min(todo)
        url = todo.pop(n)
        if n in done or n > MAX_PAGES:
            continue
        if requests_left() <= 0:
            log.warning('thomaskirche_leipzig: request cap reached before page %d', n)
            break
        try:
            evs, more = parse_page(get(BASE + url))
        except BudgetExceeded as err:
            log.warning('thomaskirche_leipzig: stopped at page %d: %s', n, err.reason)
            break
        except FetchError as err:
            log.warning('thomaskirche_leipzig: page %d failed: %s', n, err)
            done.add(n)
            continue
        done.add(n)
        rows.extend(evs)
        for u in more:
            k = _page_no(u)
            if k not in done:
                todo.setdefault(k, u)
    log.info('thomaskirche_leipzig: %d page(s), %d events', len(done), len(rows))

    events, skipped, seen = [], {}, set()
    for ev in rows:
        if ev['id'] in seen:
            continue
        seen.add(ev['id'])
        why = ((_SKIP_CATEGORY.search(ev['category']) and f"category {ev['category']}")
               or (_SKIP_TITLE.search(ev['title']) and 'service / not a concert')
               or skip_reason(ev['title'], ev['subtitle']))
        if not why and not re.search(r'(?i)musik|konzert|motette|orgel|kantate|chor', ev['category'] + ev['title']):
            why = f"category {ev['category'] or 'none'}"
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        credits = cast_credits(ev['people'])
        title = ev['title']
        if ev['subtitle'] and len(title) < 12 and len(ev['subtitle']) < 80 and not re.search(r'(?i)motette', title):
            title = f"{title}: {ev['subtitle']}"
        elif ev['subtitle'] and re.match(r'(?i)^orgelvesper', ev['subtitle']):
            title = f"{title} – Orgelvesper"
        try:
            events.append(make_event(
                KEY, ev['id'], title, berlin_iso(ev['start']), city=CITY, venueName=_venue(ev['place']),
                type=_type(ev, credits), series=ev['category'] or None, credits=credits, program=ev['works'],
                url=ev['url'], status='cancelled' if looks_cancelled(f"{ev['title']} {ev['subtitle']}") else 'scheduled'))
        except ValueError as err:
            log.warning('thomaskirche_leipzig %s: skipped: %s', ev['id'], err)
    if skipped:
        log.info('thomaskirche_leipzig: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    return events
