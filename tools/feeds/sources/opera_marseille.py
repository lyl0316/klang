"""Opéra de Marseille and Théâtre de l'Odéon (Ville de Marseille): opera, operetta, concerts of
the Orchestre philharmonique de Marseille, chamber music and recitals (HTML).

    https://opera-odeon.marseille.fr/programmation?page=N        listing, 12 productions a page
    https://opera-odeon.marseille.fr/programmation/<slug>        one page per production

(opera-marseille.fr is not used by the city any more; the house's pages live on the city's
Drupal site opera-odeon.marseille.fr.) The listing gives each production's category,
title (in capitals), "auteur" line (composer or subtitle, also in capitals), place and every
performance ("29/10/2026 - 20:00", local time; its ``datetime`` attribute is true UTC). The
production page's text adds the programme ("**COMPOSER**" then the works) and the
performers ("**Direction musicale** Michele SPOTTI", "**Violon** Giuseppe GIBBONI",
"Orchestre et Chœur de l'Opéra de Marseille"); names and titles written in capitals are
re-capitalised. On the production page the ``datetime`` attributes are local time marked
"Z" (wrongly), so the dates are taken from the listing. Production pages are read
incrementally: a production whose listed performances the previous feed already has with
their cast or programme (same id, start and title) keeps them (re-read when it plays within
10 days, otherwise about once a week).

Kept: Opéra, Opérette, Offenbach, Concert symphonique, Concert musique de chambre, Piano à
l'Opéra, Récital, Art vocal, Création musicale. Skipped: theatre, talks (conférences),
dance-school shows and dance without live music, "spectacles musicaux" (musicals), and
children's formats. Facts only (date, time, title, place, performers, works, links);
checked against the website on 29 Oct 2026.
"""
from __future__ import annotations

import html as _html
import re
from datetime import date

from common import (BudgetExceeded, FetchError, clean, get, log, looks_cancelled, make_event, requests_left,
                    today_zurich)

from ._france_regions import (concert_type, credits_from, fold, group_role, is_skipped, name_case, paris_iso,
                              reusable)

KEY = 'opera_marseille'
NAME = 'Opéra de Marseille – Théâtre de l’Odéon'
SITE = 'https://opera-odeon.marseille.fr/'
ATTRIBUTION = 'Source: Opéra de Marseille / Ville de Marseille (opera-odeon.marseille.fr)'
KIND = 'venue'
COUNTRY = 'france'
MAX_REQUESTS = 80
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 10
REFRESH_EVERY_DAYS = 7

BASE = 'https://opera-odeon.marseille.fr'
LISTING = BASE + '/programmation'
PAGE = BASE + '/programmation?page={page}'
MAX_PAGES = 15
CITY = 'Marseille'

_KINDS = {'opera': 'opera', 'operette': 'opera', 'offenbach': 'opera', 'concert symphonique': 'orchestral',
          'concert musique de chambre': 'chamber', "piano a l'opera": 'recital', 'recital': 'recital',
          'art vocal': None, 'creation musicale': None}
_GENERIC_TITLE = re.compile(r"^(?:concert de l'orchestre philharmonique de marseille|recital du midi|"
                            r"concert|recital)$")


# ---------------------------------------------------------------------------
# listing
# ---------------------------------------------------------------------------

_WHEN = re.compile(r'(\d{2})/(\d{2})/(\d{4})\s*-\s*(\d{1,2}):(\d{2})')


def parse_listing(page_html):
    """-> [{'href', 'category', 'title', 'auteur', 'place', 'starts': [(y, mo, d, hh, mi)]}]"""
    h = re.sub(r'(?s)<!--.*?-->', '', page_html or '')
    out = []
    for item in re.split(r'<div class="views-view-responsive-grid__item">', h)[1:]:
        href = re.search(r'href="(/programmation/[^"]+)"', item)
        title = re.search(r'(?s)views-field-title"><span class="field-content">(.*?)</span>', item)
        if not (href and title):
            continue
        cat = re.search(r'(?s)field-categorie-principale"><div class="field-content">(.*?)</div>', item)
        auteur = re.search(r'(?s)field-auteur"><div class="field-content">(.*?)</div>', item)
        place = re.search(r'(?s)field-lieu2"><div class="field-content">(.*?)</div>', item)
        starts = [tuple(int(x) for x in (y, mo, d, hh, mi))
                  for d, mo, y, hh, mi in _WHEN.findall(clean(re.sub(r'<br\s*/?>', ' | ', item)))]
        out.append({'href': _html.unescape(href.group(1)), 'category': clean(cat.group(1)) if cat else '',
                    'title': clean(title.group(1)), 'auteur': clean(auteur.group(1)) if auteur else '',
                    'place': clean(place.group(1)) if place else '', 'starts': starts})
    return out


def _last_page(page_html):
    nums = [int(n) for n in re.findall(r'href="\?page=(\d+)"', page_html or '')]
    return max(nums) if nums else 0


# ---------------------------------------------------------------------------
# production page
# ---------------------------------------------------------------------------

_NOT_COMPOSER = re.compile(r"\b(?:opera|operette|acte|actes|production|coproduction|coproductions|tarif|accessibilite|"
                           r"renseignements|reservations?|creation|livret|nouvelle|ballet|duree|entracte|"
                           r"programme|partenariat|corealisation|en|de|du|avec|spectacle)\b")
_STOP = re.compile(r'^(?:accessibilit|renseignements|tarif|informations|billetterie)')


def parse_detail(page_html):
    """-> {'works': [(composer, title)], 'rows': [(label, name)], 'ticket'}"""
    h = re.sub(r'(?s)<!--.*?-->', '', page_html or '')
    m = re.search(r'(?s)block-field-blocknodeprogrammationbody.*?field--name-body[^>]*>(.*?)</div>\s*</div>', h)
    body = m.group(1) if m else ''
    body = re.sub(r'(?s)<blockquote>.*?</blockquote>', '', body)
    lines = [x for x in re.split(r'<br\s*/?>|</p>\s*<p[^>]*>|</?p[^>]*>', body)]
    works, rows, composer = [], [], ''
    for raw in lines:
        text = clean(raw)
        if not text:
            composer = '' if not works or works[-1][0] != composer else composer
            continue
        if _STOP.match(fold(text)):
            break
        sm = re.match(r'(?s)\s*<strong>(.*?)</strong>(.*)$', raw)
        if sm:
            head, rest = clean(sm.group(1)).strip(' :'), clean(sm.group(2)).strip(' :')
            letters = [c for c in head if c.isalpha()]
            if letters and not any(c.islower() for c in letters) and not rest:
                if not _NOT_COMPOSER.search(fold(head)) and len(head.split()) <= 6 and not re.search(r'\d', head):
                    composer = name_case(head)              # 'PAUL DUKAS', 'JOHANN SEBASTIAN BACH / FRANZ LISZT'
                else:
                    composer = ''
                continue
            if rest and len(head) <= 70:
                for n in re.split(r'\s*,\s*|\s+et\s+(?=[A-ZÉ])', rest):
                    n = n.strip()
                    if n and len(n) <= 80:
                        rows.append((head, name_case(n)))
                composer = ''
            continue
        if composer:
            works.append((composer, text))
        elif group_role(text) and len(text) <= 90:
            rows.append(('', text))                        # 'Orchestre et Chœur de l’Opéra de Marseille'
    t = re.search(r'href="(https://billetterie\.marseille\.fr/[^"]+)"', h)
    return {'works': works, 'rows': rows, 'ticket': _html.unescape(t.group(1)) if t else None}


def _title(row):
    raw = row['title']
    letters = [c for c in raw if c.isalpha()]
    if letters and sum(c.isupper() for c in letters) > 0.6 * len(letters):
        raw = raw.upper()                              # 'CONCERT De l'ORCHESTRE …' -> all capitals first
    t = name_case(raw)
    if _GENERIC_TITLE.match(fold(t)) and row['auteur']:
        t = f"{t} – {name_case(row['auteur'])}"
    return t


def _venue(place):
    p = clean(place)
    f = fold(p)
    if f.startswith("theatre de l'odeon"):
        return "Théâtre de l'Odéon"
    if f.startswith('opera de marseille') and 'foyer' not in f:
        return 'Opéra de Marseille'
    return p or None


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
            log.warning('opera_marseille: listing page %d failed: %s', n, err)
    rows, seen = [], set()
    for p in pages:
        for r in parse_listing(p):
            if r['href'] not in seen:
                seen.add(r['href'])
                rows.append(r)
    events, read, reused, skipped = [], 0, 0, 0
    for r in rows:
        cat = fold(r['category']).strip()
        if cat not in _KINDS or is_skipped(r['title'], r['category'], r['auteur']):
            skipped += 1
            continue
        kind = _KINDS[cat]
        title = _title(r)
        url = BASE + r['href']
        starts = [(s, paris_iso(*s)) for s in r['starts'] if paris_iso(*s)[:10] >= today.isoformat()]
        if not starts:
            continue
        slug = r['href'].rstrip('/').rsplit('/', 1)[-1]
        perfs = [(f"{slug}-{y:04d}{mo:02d}{d:02d}{hh:02d}{mi:02d}", iso, title) for (y, mo, d, hh, mi), iso in starts]
        old = reusable(KEY, perfs, url, near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS)
        info = None
        if old is None:
            if requests_left() <= 0:
                continue
            try:
                info = parse_detail(get(url))
                read += 1
            except BudgetExceeded as err:
                log.warning('opera_marseille: stopped reading production pages: %s', err.reason)
                break
            except FetchError as err:
                log.warning('opera_marseille: %s failed: %s', url, err)
                continue
        else:
            reused += 1
        for sid, iso, _ in perfs:
            if info is not None:
                credits = credits_from(info['rows'], 'opera' if kind == 'opera' else 'concert',
                                       day=date(int(iso[:4]), int(iso[5:7]), int(iso[8:10])))
                works = info['works']
                if kind == 'opera' and not works and r['auteur'] and len(r['auteur'].split()) <= 4 and \
                        not re.match(r"(?i)(?:les?|la|l['’]|compagnie|cie)\b", r['auteur']):
                    works = [(name_case(r['auteur']), name_case(r['title']))]
                if kind == 'orchestral' and not any(c == 'Orchestra' for c, _ in credits) and \
                        'philharmonique de marseille' in fold(r['title']):
                    credits.append(('Orchestra', 'Orchestre philharmonique de Marseille'))
                hint = {'opera': 'vocal-opera', 'orchestral': 'orchestral', 'chamber': 'chamber',
                        'recital': 'recital'}.get(kind)
                ctype = concert_type(title, credits, works, hint)
                ticket = info['ticket']
            else:
                prev = old[sid]
                credits = [(c.get('role'), c.get('name')) for c in prev.get('credits') or []]
                works = [(w.get('composer'), w.get('title')) for w in prev.get('program') or []]
                ctype, ticket = prev.get('type'), prev.get('ticketUrl')
            try:
                events.append(make_event(
                    KEY, sid, title, iso, city=CITY, venueName=_venue(r['place']), type=ctype, credits=credits,
                    program=works, ticketUrl=ticket, url=url,
                    status='cancelled' if looks_cancelled(r['title']) else 'scheduled'))
            except ValueError as err:
                log.warning('opera_marseille: %s skipped: %s', url, err)
    log.info('opera_marseille: %d listing rows (%d skipped), %d pages read, %d reused', len(rows), skipped, read,
             reused)
    return events
