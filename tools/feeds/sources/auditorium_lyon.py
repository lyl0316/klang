"""Auditorium – Orchestre national de Lyon: the hall's season programme (HTML).

    https://www.auditorium-lyon.com/fr/programmation              listing, ?type=All&saison=N&page=P
    https://www.auditorium-lyon.com/fr/saison-2026-27/<cat>/<slug> one page per production

The listing (Drupal view, 15 productions a page, ~14 pages a season) gives each
production's category ("Symphonique | Orchestre national de Lyon", "Musique de chambre |
Salle Molière (Lyon 5e)", "Hors les murs | Grenoble (38)"), its title and its dates without
year or time ("jeu. 12 nov | sam. 14 nov"). The times, the hall ("Lieu": Grande Salle,
Salle Molière, Chapelle …), the programme and the performers with their roles are only on
the production page ("Jeu. 12 nov 2026 à 20h"), so production pages are read
incrementally: a production whose listed dates are unchanged since the previous feed keeps
the concerts read on an earlier run (re-read when it plays within 10 days, otherwise about
once a week). The requests left after the listing (cap 120) go to productions not read yet,
nearest first; on a first run the farthest ones may wait for a later run. The JSON-LD on
the production pages only names the first date, so it is not used.

Skipped: children's, school and family concerts, workshops (ateliers), talks
(conférences), guided tours, ciné-concerts, jazz / chanson / rap / world-music nights
(category), the amateur recital, and tours abroad ("Bruxelles (Belgique)"). Concerts "Hors
les murs" in another French town are kept with that town as the city.

The site's legal notice reserves reproduction of its content; Klang republishes facts only
(date, time, title, hall, performers, works, links back). Checked against the website on
29 Oct 2026.
"""
from __future__ import annotations

import html as _html
import re
from datetime import date

from common import BudgetExceeded, FetchError, clean, get, log, looks_cancelled, make_event, requests_left, today_zurich

from ._france_regions import (concert_type, credits_from, fold, fr_month, is_skipped, paris_iso, previous_by_url, rebuild,
                              reuse_listed, year_for)

KEY = 'auditorium_lyon'
NAME = 'Auditorium – Orchestre national de Lyon'
SITE = 'https://www.auditorium-lyon.com/'
ATTRIBUTION = 'Source: Auditorium – Orchestre national de Lyon (auditorium-lyon.com)'
KIND = 'venue'
COUNTRY = 'france'
MAX_REQUESTS = 120             # ~14 listing pages + production pages (common.MAX_REQUESTS_CAP is 150)
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 10
REFRESH_EVERY_DAYS = 7

BASE = 'https://www.auditorium-lyon.com'
LISTING = BASE + '/fr/programmation'
PAGE = LISTING + '?type=All&saison={season}&page={page}'
MAX_PAGES = 25
CITY = 'Lyon'
VENUE = 'Auditorium de Lyon'

# listing categories (first part of "Symphonique | Orchestre national de Lyon") -> kind; None = skip
_CATEGORIES = {
    'symphonique': 'orchestral', 'musique de chambre': 'chamber', 'recital': 'recital', 'ensemble invite': None,
    'formation invitee': None, 'orgue': None, 'opera en concert': 'vocal-opera', 'jeunes talents': None,
    'pause-dejeuner': 'orchestral', 'afterwork': 'orchestral', 'gratuit': None, 'concert': None,
    'choeurs et voix': 'vocal-opera', 'baroque': None,
}
_SKIP_CATEGORY = re.compile(r'jazz|chanson|rap\b|musiques? (?:du monde|actuelles)|amateur|cine|conference|rencontre|'
                            r'atelier|famille|scolaire|individuels|visite|bebe|projection')
_ABROAD = re.compile(r'\((?:belgique|suisse|allemagne|italie|espagne|royaume-uni|pays-bas|autriche|luxembourg|'
                     r'japon|chine|coree|etats-unis|usa)\)', re.I)


# ---------------------------------------------------------------------------
# listing
# ---------------------------------------------------------------------------

def parse_listing(page_html):
    """-> [{'href', 'category', 'title', 'days': [(month, day)]}] for one listing page."""
    out = []
    for art in re.findall(r'(?s)<article class="event\b.*?</article>', page_html or ''):
        href = re.search(r'href="(/fr/[^"]+)"', art)
        title = re.search(r'(?s)<h4[^>]*>(.*?)</h4>', art)
        if not (href and title):
            continue
        cat = re.search(r'(?s)<h3>(.*?)</h3>', art)
        when = re.search(r'(?s)class="event-date[^"]*">(.*?)</div>', art)
        days = []
        for d, mon in re.findall(r'(\d{1,2})\s+([a-zéû]+)\.?', clean(when.group(1)) if when else '', re.I):
            mo = fr_month(mon)
            if mo:
                days.append((mo, int(d)))
        out.append({'href': _html.unescape(href.group(1)), 'category': clean(cat.group(1)) if cat else '',
                    'title': clean(title.group(1)), 'days': days})
    return out


def _last_page(page_html):
    nums = [int(n) for n in re.findall(r'[?&](?:amp;)?page=(\d+)', page_html or '')]
    return max(nums) if nums else 0


def _seasons(page_html):
    sel = re.search(r'(?s)<select[^>]*name="saison"[^>]*>(.*?)</select>', page_html or '')
    return [v for v in re.findall(r'<option value="(\d+)"', sel.group(1))] if sel else []


def read_listing():
    """All productions of the seasons offered in the listing's season filter."""
    first = get(LISTING)                                   # FetchError propagates
    seasons = _seasons(first) or ['']
    rows, seen = [], set()
    for i, season in enumerate(seasons):
        pages = []
        if i == 0:
            pages.append(first)
            last = _last_page(first)
            start = 1
        else:
            try:
                pages.append(get(PAGE.format(season=season, page=0)))
            except FetchError as err:
                log.warning('auditorium_lyon: season %s failed: %s', season, err)
                continue
            last, start = _last_page(pages[0]), 1
        for n in range(start, min(last, MAX_PAGES) + 1):
            if requests_left() <= 5:
                log.warning('auditorium_lyon: request cap reached in the listing at page %d', n)
                break
            try:
                pages.append(get(PAGE.format(season=season, page=n)))
            except FetchError as err:
                log.warning('auditorium_lyon: listing page %d failed: %s', n, err)
        for p in pages:
            for row in parse_listing(p):
                if row['href'] not in seen:
                    seen.add(row['href'])
                    rows.append(row)
    return rows


def listed_dates(row, today):
    """The listing's (month, day) pairs as dates: the year comes from the season in the URL
    ('/fr/saison-2026-27/…': August to December 2026, January to July 2027)."""
    m = re.search(r'/saison-(\d{4})-(\d{2})/', row['href'])
    out = []
    for mo, d in row['days']:
        if m:
            y = int(m.group(1)) if mo >= 8 else int(m.group(1)[:2] + m.group(2))
        else:
            y = year_for(mo, d, today)
        try:
            out.append(date(y, mo, d))
        except ValueError:
            continue
    return out


def classify(row):
    """-> (kind or None, city or None, reason-to-skip or None)."""
    parts = [p.strip() for p in row['category'].split('|')]
    cat = fold(parts[0]) if parts else ''
    cat_all = fold(row['category'])
    if _SKIP_CATEGORY.search(cat_all) or is_skipped(row['title'], row['category']):
        return None, None, 'not a concert / family / talk / non-classical'
    if cat not in _CATEGORIES and not re.search(r'symphon|chambre|recital|orgue|opera|choeur', cat):
        return None, None, f'category {parts[0]!r}'
    city = CITY
    if 'hors les murs' in cat_all:
        if _ABROAD.search(row['category']):
            return None, None, 'tour abroad'
        place = next((p for p in parts if re.search(r'\(\d{2}\)$', p)), '')
        if place:
            city = re.sub(r'\s*\(\d{2}\)$', '', place).strip()
    elif _ABROAD.search(row['category']):
        return None, None, 'tour abroad'
    return _CATEGORIES.get(cat), city, None


# ---------------------------------------------------------------------------
# production page
# ---------------------------------------------------------------------------

_DATE_RE = re.compile(r'(\d{1,2})\s+([a-zéû]+)\.?\s+(\d{4})\s+à\s+(\d{1,2})\s*h\s*(\d{2})?', re.I)


def parse_detail(page_html):
    """-> {'dates': [(y, mo, d, hh, mi)], 'hall', 'works': [(composer, title)], 'people': [(label, name)],
           'ticket', 'alert'}"""
    h = page_html or ''
    out = {'dates': [], 'hall': '', 'works': [], 'people': [], 'ticket': None, 'alert': ''}
    dd = re.search(r'(?s)<dt>\s*Dates?\s*</dt>\s*<dd>(.*?)</dd>', h)
    for line in re.split(r'<br\s*/?>', dd.group(1) if dd else ''):
        m = _DATE_RE.search(clean(line))
        if m:
            mo = fr_month(m.group(2))
            if mo:
                out['dates'].append((int(m.group(3)), mo, int(m.group(1)), int(m.group(4)), int(m.group(5) or 0)))
    hall = re.search(r'(?s)<dt>\s*Lieu\s*</dt>\s*<dd>(.*?)</dd>', h)
    out['hall'] = clean(hall.group(1)) if hall else ''
    prog = re.search(r'(?s)id="accordeon_programme"(.*?)</ul>', h)
    for li in re.findall(r'(?s)<li\b[^>]*class="tr[^"]*"[^>]*>(.*?)</li>', prog.group(1) if prog else ''):
        name = re.search(r'(?s)class="td name">(.*?)</div>', li)
        cells = re.findall(r'(?s)<div class="td">(.*?)</div>', li)
        composer = clean(name.group(1)) if name else ''
        title = clean(cells[0]) if cells else ''
        if composer or title:
            out['works'].append((composer, title))
    dist = re.search(r'(?s)id="accordeon_distribution"(.*?)</ul>', h)
    for nm, label in re.findall(r'(?s)<div class="tr">\s*<div class="td name">(.*?)</div>\s*<div class="td">(.*?)</div>',
                                dist.group(1) if dist else ''):
        if clean(nm):
            out['people'].append((clean(label), clean(nm)))
    t = re.search(r'href="(https://billetterie\.auditorium-lyon\.com/[^"]+)"', h)
    out['ticket'] = _html.unescape(t.group(1)) if t else None
    alert = re.search(r'(?s)<!-- Bandeau alerte -->(.*?)<!-- End Bandeau alerte -->', h)
    out['alert'] = clean(alert.group(1)) if alert else ''
    return out


def _venue(hall, city):
    h = re.sub(r'\s*\([^)]*\d{5}[^)]*\)', '', clean(hall)).strip()      # 'Salle Molière (20 quai de Bondy 69005 Lyon)'
    h = re.sub(r'\s*/\s*[^/]*\(\d{2}\)\s*$', '', h).strip()             # "L'Atrium / Tassin-la-Demi-Lune (69)"
    if city != CITY:
        return h or None
    if not h:
        return VENUE
    if re.search(r'(?i)grande salle|^auditorium', h):
        return f'{VENUE}, Grande salle'
    if re.search(r'(?i)moli[eè]re', h):
        return 'Salle Molière'
    if re.search(r'(?i)proton|chapelle', h) and 'auditorium' not in h.lower():
        return f'{VENUE}, {h}'
    return h


def _sid(href, y, mo, d, hh, mi):
    slug = href.rstrip('/').rsplit('/', 1)[-1]
    return f'{slug}-{y:04d}{mo:02d}{d:02d}{hh:02d}{mi:02d}'


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def fetch():
    today = today_zurich()
    rows = read_listing()
    prev = previous_by_url(KEY)
    cands, skipped = [], {}
    for row in rows:
        kind, city, why = classify(row)
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        days = listed_dates(row, today)
        if days and max(days) < today:
            continue
        url = BASE + row['href']
        cands.append({'row': row, 'kind': kind, 'city': city, 'url': url})
    if skipped:
        log.info('auditorium_lyon: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    def first_day(c):
        ds = [x for x in listed_dates(c['row'], today) if x >= today]
        return min(ds) if ds else date.max

    cands.sort(key=first_day)
    events, read, reused = [], 0, 0
    for c in cands:
        row, url = c['row'], c['url']
        listed = {(x.month, x.day) for x in listed_dates(row, today) if x >= today}
        old = reuse_listed(prev.get(url), row['title'], today, days=listed, refresh_key=url,
                           near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS)
        if old is not None:
            for e in old:
                try:
                    events.append(rebuild(KEY, e))
                except (ValueError, TypeError) as err:
                    log.warning('auditorium_lyon: previous record %s unusable: %s', e.get('id'), err)
            reused += 1
            continue
        if requests_left() <= 0:
            old = prev.get(url)
            if old:                                      # keep what an earlier run read
                for e in old:
                    if e['start'][:10] >= today.isoformat():
                        try:
                            events.append(rebuild(KEY, e))
                        except (ValueError, TypeError):
                            pass
            continue
        try:
            d = parse_detail(get(url))
        except BudgetExceeded as err:
            log.warning('auditorium_lyon: stopped reading production pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('auditorium_lyon: %s failed: %s', url, err)
            continue
        read += 1
        credits = credits_from(d['people'])
        works = d['works']
        cancelled_all = looks_cancelled(row['title']) or looks_cancelled(d['alert'])
        kind = c['kind']
        players = [r for r, _ in credits if r not in ('Orchestra', 'Choir', 'Ensemble', 'Presenter', 'Narrator')]
        if re.search(r'(?i)orgue', row['category']) and players and set(players) <= {'Organ'}:
            kind = 'recital'                              # an organ recital ('Petit concert d’orgue')
        elif kind == 'orchestral' and not any(r in ('Orchestra', 'Conductor') for r, _ in credits):
            kind = None                                   # 'Concert découverte' without the orchestra
        elif kind == 'recital' and len(players) > 2:
            kind = None
        ctype = concert_type(row['title'], credits, works, kind)
        for (y, mo, dd, hh, mi) in d['dates']:
            if date(y, mo, dd) < today:
                continue
            try:
                events.append(make_event(
                    KEY, _sid(row['href'], y, mo, dd, hh, mi), row['title'], paris_iso(y, mo, dd, hh, mi),
                    city=c['city'], venueName=_venue(d['hall'], c['city']), type=ctype, credits=credits,
                    program=works, ticketUrl=d['ticket'], url=url,
                    status='cancelled' if cancelled_all else 'scheduled'))
            except ValueError as err:
                log.warning('auditorium_lyon: %s skipped: %s', url, err)
    log.info('auditorium_lyon: %d productions kept, %d pages read, %d reused from the previous feed',
             len(cands), read, reused)
    return events
