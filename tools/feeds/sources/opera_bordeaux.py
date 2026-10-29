"""Opéra national de Bordeaux (Grand-Théâtre, Auditorium): opera, concerts of the Orchestre
national Bordeaux Aquitaine, chamber music, baroque and ballet with live music (HTML).

    https://www.opera-bordeaux.com/saison?page=N        the season listing (12 productions a page)
    https://www.opera-bordeaux.com/node/<id>            one page per production

The listing (Drupal view; past productions drop off it) gives the title, category (Opéra,
Orchestre, Musique de chambre, Baroque et instruments d'époque, Danse, Temps forts …), the
date or date range ("du 09/11/2026 au 17/11/2026") and the hall. The production page adds
each performance (``<time datetime="2026-11-09T19:00:00Z">`` – UTC, checked against "09 Nov
2026 à 20H00" next to it), the cast under role headings (names are written in lower case
and shown capitalised by the site's CSS, so they are re-capitalised here) and, for
concerts, the programme ("Programme" then "Composer, *Work*" lines). The site's calendar
page loads its data by script from /themes/, which robots.txt forbids; it is not used.
Production pages are read incrementally: a production whose listed date range is unchanged
since the previous feed keeps the performances read on an earlier run (re-read when it
plays within 10 days, otherwise about once a week).

Skipped: the "Temps forts" umbrella pages (festival themes listing other productions),
children's / family / school formats, workshops, talks, guided tours, film screenings, and
ballets without live music (no conductor and no orchestra credited). The site's legal
notice forbids reproducing its content without consent; Klang republishes facts only
(date, time, title, hall, performers, works, links back). Checked against the website on
29 Oct 2026.
"""
from __future__ import annotations

import html as _html
import re
from datetime import date

from common import (BudgetExceeded, FetchError, clean, get, log, looks_cancelled, make_event, requests_left,
                    to_zurich_iso, today_zurich)

from ._france_regions import (concert_type, credits_from, fold, is_skipped, name_case, previous_by_url, rebuild,
                              reuse_listed)

KEY = 'opera_bordeaux'
NAME = 'Opéra national de Bordeaux'
SITE = 'https://www.opera-bordeaux.com/'
ATTRIBUTION = 'Source: Opéra national de Bordeaux (opera-bordeaux.com)'
KIND = 'venue'
COUNTRY = 'france'
MAX_REQUESTS = 150
TIME_LIMIT = 900
REFRESH_NEAR_DAYS = 10
REFRESH_EVERY_DAYS = 7

BASE = 'https://www.opera-bordeaux.com'
LISTING = BASE + '/saison'
PAGE = BASE + '/saison?page={page}'
MAX_PAGES = 20
CITY = 'Bordeaux'

_KINDS = {'opera': 'opera', 'orchestre': 'orchestral', 'musique de chambre': 'chamber',
          "baroque et instruments d'epoque": None, 'danse': 'ballet', 'recital': 'recital', 'voix': None,
          'concert': None, 'jazz': 'skip', 'musiques du monde': 'skip', 'temps forts': 'skip'}
_SKIP_CAT = re.compile(r'jeune public|famille|atelier|conference|rencontre|visite|cinema|projection|temps forts|'
                       r'jazz|musiques? (?:du monde|actuelles)|scolaire|exposition|evenement')
_VENUES = {'grand-theatre': 'Grand-Théâtre de Bordeaux', 'auditorium': 'Auditorium de Bordeaux'}
_KNOWN_GROUPS = {
    'orchestre national bordeaux aquitaine': 'Orchestre National Bordeaux Aquitaine',
    "choeur de l'opera national de bordeaux": "Chœur de l'Opéra National de Bordeaux",
    "ballet de l'opera national de bordeaux": "Ballet de l'Opéra National de Bordeaux",
}


# ---------------------------------------------------------------------------
# listing
# ---------------------------------------------------------------------------

_DMY = re.compile(r'(\d{2})/(\d{2})/(\d{4})')


def parse_listing(page_html):
    """-> [{'node', 'title', 'category', 'days': [date], 'hall', 'ticket'}]"""
    out = []
    for card in re.split(r'card--a-la-une', page_html or '')[1:]:
        node = re.search(r'href="(/node/\d+)"', card)
        title = re.search(r'(?s)<h4[^>]*>(.*?)</h4>', card)
        if not (node and title):
            continue
        cats = [clean(c) for c in re.findall(r'(?s)link-txt">\s*(.*?)\s*</span>', card)]
        cats = [c for c in cats if c and not re.match(r'(?i)aller à la page', c)]
        infos = [clean(x) for x in re.findall(r'(?s)<div\s+class="info-icon">.*?</span>\s*(.*?)\s*</div>', card)]
        days = []
        for x in infos:
            for d, m, y in _DMY.findall(x):
                try:
                    days.append(date(int(y), int(m), int(d)))
                except ValueError:
                    pass
        hall = next((x for x in infos if x and not _DMY.search(x)), '')
        ticket = re.search(r'href="(https://billetterie\.opera-bordeaux\.com/[^"]+)"', card)
        out.append({'node': node.group(1), 'title': clean(title.group(1)), 'category': cats[0] if cats else '',
                    'days': days, 'hall': hall, 'ticket': _html.unescape(ticket.group(1)) if ticket else None})
    return out


def _last_page(page_html):
    nums = [int(n) for n in re.findall(r'href="\?page=(\d+)"', page_html or '')]
    return max(nums) if nums else 0


# ---------------------------------------------------------------------------
# production page
# ---------------------------------------------------------------------------

def parse_detail(page_html):
    """-> {'starts': [iso], 'rows': [(label, name)], 'works': [(composer, title)], 'url', 'notes': {iso: text}}"""
    h = page_html or ''
    out = {'starts': [], 'rows': [], 'works': [], 'url': None, 'notes': {}}
    canon = re.search(r'<link rel="canonical" href="([^"]+)"', h)
    out['url'] = canon.group(1) if canon else None
    dates = re.search(r'(?s)<span>dates de représentation</span>(.*?)(?:<span>distribution</span>|<span>services</span>|'
                      r'data-title="distribution"|data-title="services")', h)
    for dt, label in re.findall(r'<time datetime="([^"]+)">([^<]*)</time>', dates.group(1) if dates else ''):
        try:
            iso = to_zurich_iso(dt)
        except ValueError:
            continue
        if iso not in out['starts']:
            out['starts'].append(iso)
    dist = re.search(r'(?s)<span>distribution</span>(.*?)(?:<span>services</span>|data-title="services"|'
                     r'<span>autour du spectacle</span>|<span>infos</span>)', h)
    label = ''
    for cls, text in re.findall(r'(?s)<h5\s+class="heading heading--underline([^"]*)"\s*>\s*<span>(.*?)</span>',
                                dist.group(1) if dist else ''):
        text = clean(text)
        if not text:
            continue
        if ' h5 ' in f' {cls} ':
            name = _KNOWN_GROUPS.get(fold(text), None) or name_case(text)
            out['rows'].append((label, name))
        else:
            label = text
    prog = re.search(r'(?s)<strong>\s*Programme\s*</strong>\s*<br\s*/?>(.*?)</p>', h)
    for line in re.split(r'<br\s*/?>', prog.group(1) if prog else ''):
        m = re.match(r'(?s)\s*<strong>(.*?)</strong>(.*)$', line)
        if m:
            composer = clean(m.group(1)).strip(' ,:')
            work = clean(m.group(2)).strip(' ,')
            if composer:
                out['works'].append((composer, work))
        elif clean(line) and out['works'] and not out['works'][-1][1]:
            out['works'][-1] = (out['works'][-1][0], clean(line))
    return out


def _venue(hall):
    h = clean(hall)
    return _VENUES.get(fold(h).replace(' ', '-'), h or None)


def _kind(category):
    c = fold(category).strip()
    if _SKIP_CAT.search(c):
        return 'skip'
    return _KINDS.get(c, None)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def fetch():
    today = today_zurich()
    first = get(LISTING)
    pages = [first]
    for n in range(1, min(_last_page(first), MAX_PAGES) + 1):
        try:
            pages.append(get(PAGE.format(page=n)))
        except FetchError as err:
            log.warning('opera_bordeaux: listing page %d failed: %s', n, err)
    rows, seen = [], set()
    for p in pages:
        for r in parse_listing(p):
            if r['node'] not in seen:
                seen.add(r['node'])
                rows.append(r)
    prev = previous_by_url(KEY)
    events, read, reused, skipped = [], 0, 0, 0
    for r in sorted(rows, key=lambda r: min(r['days']) if r['days'] else date.max):
        kind = _kind(r['category'])
        if kind == 'skip' or is_skipped(r['title'], r['category']):
            skipped += 1
            continue
        if r['days'] and max(r['days']) < today:
            continue
        url = BASE + r['node']
        span = ((r['days'][0].month, r['days'][0].day), (r['days'][-1].month, r['days'][-1].day)) if r['days'] else None
        prev_events = prev.get(url) or []
        old = reuse_listed(prev_events, r['title'], today, span=span, refresh_key=url,
                           near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS)
        if old is not None:
            for e in old:
                try:
                    events.append(rebuild(KEY, e))
                except (ValueError, TypeError):
                    pass
            reused += 1
            continue
        if requests_left() <= 0:
            for e in prev_events:
                if e['start'][:10] >= today.isoformat():
                    try:
                        events.append(rebuild(KEY, e))
                    except (ValueError, TypeError):
                        pass
            continue
        try:
            d = parse_detail(get(url))
        except BudgetExceeded as err:
            log.warning('opera_bordeaux: stopped reading production pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('opera_bordeaux: %s failed: %s', url, err)
            continue
        read += 1
        mode = {'opera': 'opera', 'ballet': 'ballet'}.get(kind, 'concert')
        credits = credits_from(d['rows'], mode)
        if kind == 'ballet' and not any(c in ('Conductor', 'Orchestra') for c, _ in credits):
            continue                                            # ballet to recorded music
        hint = {'opera': 'vocal-opera', 'ballet': 'orchestral', 'chamber': 'chamber',
                'orchestral': 'orchestral', 'recital': 'recital'}.get(kind)
        ctype = concert_type(r['title'], credits, d['works'], hint)
        cancelled = looks_cancelled(r['title'])
        for start in d['starts']:
            if start[:10] < today.isoformat():
                continue
            day = date(int(start[:4]), int(start[5:7]), int(start[8:10]))
            credits = credits_from(d['rows'], mode, day=day)      # 'Escamillo (les 13 et 15 novembre)'
            sid = f"{r['node'].rsplit('/', 1)[-1]}-{start[:4]}{start[5:7]}{start[8:10]}{start[11:13]}{start[14:16]}"
            try:
                events.append(make_event(
                    KEY, sid, r['title'], start, city=CITY, venueName=_venue(r['hall']), type=ctype, credits=credits,
                    program=d['works'], ticketUrl=r['ticket'], url=url,
                    status='cancelled' if cancelled else 'scheduled'))
            except ValueError as err:
                log.warning('opera_bordeaux: %s skipped: %s', url, err)
    log.info('opera_bordeaux: %d listing rows (%d skipped), %d pages read, %d reused', len(rows), skipped, read, reused)
    return events
