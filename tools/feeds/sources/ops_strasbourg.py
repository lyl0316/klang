"""Orchestre philharmonique de Strasbourg: the orchestra's concert agenda (HTML).

    https://philharmonique.strasbourg.eu/agenda?…_delta=200&…   one listing page (Liferay search portlet)
    https://philharmonique.strasbourg.eu/detail-evenement/-/entity/id/<id>/<slug>   one page per concert

The agenda is the city of Strasbourg's Liferay portal; its search portlet takes the date
window and page size in the URL, so one request lists every concert from today to
today+450 days (~80 entries): date without year ("Le 06 novembre", "Du 16 décembre au 17
décembre"), title, typology ("Concert symphonique", "Musique de chambre", "Concert
décentralisé - …", "Concert symphonique - Tournée", "Jeune public", "Conférence" …),
composers and performers. robots.txt only forbids the site-wide search page (/recherche),
not this agenda. The concert page adds the representations ("Le 16 déc." + "20h - 22h"),
the programme ("Composer<br><em>Work</em>"), the distribution ("Direction : Name, Piano :
Name" or "Name ROLE, …") and the hall ("Lieu"); it is read incrementally: a concert whose
listed dates are unchanged since the previous feed keeps what an earlier run read
(re-read when it plays within 10 days, otherwise about once a week). Years are not printed:
the listing only shows coming concerts, so a date is the next one on or after today.

Kept: symphonic and chamber concerts in Strasbourg, the New Year concerts, and concerts in
other French towns ("Concert symphonique à Marckolsheim", "Concert à Metz"; the town from the
title). Skipped: young-audience concerts, Babyproms, workshops, talks (conférences
d'avant-concert), open days, ciné-concerts, tours abroad (United Kingdom, Germany), and the
Opéra national du Rhin productions the orchestra plays in (read by opera_du_rhin).

Facts only (date, time, title, hall, performers, works, links); the site's legal notice
protects its content and databases. Checked against the website on 29 Oct 2026.
"""
from __future__ import annotations

import html as _html
import re
from datetime import date, timedelta

from common import BudgetExceeded, FetchError, clean, get, log, looks_cancelled, make_event, requests_left, today_zurich

from ._france_regions import (concert_type, credits_from, fold, fr_month, is_skipped, name_case, paris_iso,
                              previous_by_url, rebuild, reuse_listed, year_for)

KEY = 'ops_strasbourg'
NAME = 'Orchestre philharmonique de Strasbourg'
SITE = 'https://philharmonique.strasbourg.eu/'
ATTRIBUTION = 'Source: Orchestre philharmonique de Strasbourg (philharmonique.strasbourg.eu)'
KIND = 'orchestra'
COUNTRY = 'france'
MAX_REQUESTS = 100
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 10
REFRESH_EVERY_DAYS = 7

BASE = 'https://philharmonique.strasbourg.eu'
_P = '_eu_strasbourg_portlet_search_asset_v2_SearchAssetPortlet'
LISTING = (BASE + '/agenda?p_p_id=eu_strasbourg_portlet_search_asset_v2_SearchAssetPortlet&p_p_lifecycle=0'
           '&p_p_state=normal&p_p_mode=view'
           f'&{_P}_orderByCol=dates_Number_sortable&{_P}_orderByType=asc&{_P}_paginate=true'
           f'&{_P}_className=eu.strasbourg.service.agenda.model.Event'
           f'&{_P}_fromDay={{fd}}&{_P}_fromMonth={{fm}}&{_P}_fromYear={{fy}}'
           f'&{_P}_toDay={{td}}&{_P}_toMonth={{tm}}&{_P}_toYear={{ty}}&{_P}_cur=1&{_P}_delta=300')
WINDOW_DAYS = 450
CITY = 'Strasbourg'

_SKIP_TYPOLOGY = re.compile(r'jeune public|babyproms|atelier|conference|cine-concert|opera national du rhin|'
                            r'rencontres? instrumentales?|repetition|visite')
_FOREIGN = re.compile(r'royaume-uni|allemagne|suisse|belgique|luxembourg|birmingham|basingstoke|bristol|londres|'
                      r'nottingham|offenburg|ludwigsbourg|ludwigsburg|baden-baden|karlsruhe|stuttgart|freiburg|'
                      r'fribourg-en-brisgau|bale\b|basel|munich|berlin|vienne \(autriche\)|tokyo|seoul')


# ---------------------------------------------------------------------------
# listing
# ---------------------------------------------------------------------------

def parse_listing(page_html):
    """-> [{'href', 'id', 'when', 'title', 'typology', 'composers', 'names'}]"""
    out = []
    for href, card in re.findall(r'(?s)<a href="(/detail-evenement/[^"]+)" class="ops-card[^"]*">(.*?)</a>',
                                 page_html or ''):
        m = re.search(r'/id/(\d+)/', href)
        title = re.search(r'(?s)<h3>(.*?)</h3>', card)
        if not (m and title):
            continue
        when = re.search(r'(?s)<time>(.*?)</time>', card)
        typ = re.search(r'(?s)ops-typologie">(.*?)</span>', card)
        out.append({'href': _html.unescape(href), 'id': m.group(1), 'title': clean(title.group(1)),
                    'when': clean(when.group(1)) if when else '', 'typology': clean(typ.group(1)) if typ else ''})
    return out


def listed_days(when, today):
    """'Le 06 novembre' -> [date]; 'Du 16 décembre au 17 décembre' -> [first, last]."""
    out = []
    for d, mon in re.findall(r'(\d{1,2})\s+([a-zéû]+)', when or '', re.I):
        mo = fr_month(mon)
        if mo:
            try:
                out.append(date(year_for(mo, int(d), today), mo, int(d)))
            except ValueError:
                pass
    return out


def place_of(row):
    """-> (city or None, reason) from the typology and title."""
    typ, title = fold(row['typology']), row['title']
    if _FOREIGN.search(fold(f'{title} {typ}')):
        return None, 'tour abroad'
    if 'tournee' in typ or 'decentralise' in typ:
        m = re.search(r"(?:\bà|(?i:\bau festival de|\bfestival de))\s+([A-ZÉÈ][\w’'\- ]+?)\s*(?:\||$)", title)
        if not m:
            return None, 'tour, place unknown'
        town = m.group(1).strip()
        return town, None
    return CITY, None


# ---------------------------------------------------------------------------
# concert page
# ---------------------------------------------------------------------------

_TIME_RE = re.compile(r'(\d{1,2})\s*h\s*(\d{2})?(?:\s*-\s*(\d{1,2})\s*h\s*(\d{2})?)?', re.I)


def parse_detail(page_html, today):
    """-> {'dates': [(date, hh, mi, end_hh, end_mi)], 'works', 'people': [(label, name)], 'hall', 'ticket'}"""
    h = page_html or ''
    out = {'dates': [], 'works': [], 'people': [], 'hall': '', 'ticket': None, 'typology': ''}
    reps = re.search(r'(?s)id="ops-representations"(.*?)id="ops-description"', h)
    for item in re.findall(r'(?s)<div class="ops-item">(.*?)</div>\s*(?=<div class="ops-item">|</div>)',
                           reps.group(1) if reps else ''):
        day = re.search(r'(?s)<time>(.*?)</time>', item)
        hours = re.search(r'(?s)ops-horaires">(.*?)</div>', item)
        ds = listed_days(clean(day.group(1)) if day else '', today)
        tm = _TIME_RE.search(clean(hours.group(1)) if hours else '')
        if ds and tm:
            out['dates'].append((ds[0], int(tm.group(1)), int(tm.group(2) or 0),
                                 int(tm.group(3)) if tm.group(3) else None, int(tm.group(4) or 0)))
    prog = re.search(r'(?s)ops-title-infos">Programme</span>(.*?)</div>', h)
    for p in re.findall(r'(?s)<p>(.*?)</p>', prog.group(1) if prog else ''):
        lines = [clean(x) for x in re.split(r'<br\s*/?>', p) if clean(x)]
        if not lines:
            continue
        if len(lines) == 1:
            out['works'].append((lines[0], '') if not re.search(r'[«"]|\bop\.|n°', lines[0]) else ('', lines[0]))
        else:
            out['works'].append((lines[0], ' – '.join(lines[1:])))
    dist = re.search(r'(?s)ops-title-infos">Distribution</span>(.*?)</div>', h)
    out['people'] = parse_distribution(clean(re.sub(r'<br\s*/?>|</p>', ' | ', dist.group(1))) if dist else '')
    hall = re.search(r'(?s)ops-title-infos">Lieu</span>\s*<address>(.*?)</address>', h)
    out['hall'] = clean(hall.group(1)) if hall else ''
    t = re.search(r'href="(https://indiv\.themisweb\.fr/[^"]+)"[^>]*class="ops-ticket"', h)
    out['ticket'] = _html.unescape(t.group(1)) if t else None
    return out


_ROLE_TAIL = re.compile(r"\s+((?:(?:et|&)\s+)?(?:direction|musique|piano|pianos|violons?|altos?|violoncelles?|"
                        r"contrebasses?|flûtes?|flute|piccolo|hautbois|clarinettes?|bassons?|cors?|trompettes?|"
                        r"trombones?|tuba|harpes?|percussions?|timbales|guitare|orgue|clavecin|accordéon|vibraphone|"
                        r"marimba|batterie|saxophones?|soprano|mezzo-soprano|mezzo|alto|contralto|ténor|tenor|baryton|basse|"
                        r"récitante?|présentation|conteuse?|chant|voix|dessins?(?: en direct)?|cymbalum|célesta|"
                        r"et|en|direct|clarinette basse|cor anglais)(?:\s|$))+$", re.I)


def parse_distribution(text):
    """'Direction : Aziz Shokhakimov, Piano : Mikhaïl Pletnev' / 'Antony HERMUS direction,
    Alexandre KANTOROW piano' / 'A et B violons, C alto' -> [(label, name)]."""
    out = []
    t = clean(text).strip(' |')
    if not t:
        return out
    for seg in [s.strip() for s in re.split(r'\s*\|\s*', t) if s.strip()]:
        if ':' in seg:
            pieces = re.split(r'\s*[,;]\s*|\s+-\s+', seg)
            label = ''
            for piece in pieces:
                if ':' in piece:
                    label, _, names = piece.partition(':')
                    label, names = label.strip(), names.strip()
                else:
                    names = piece.strip()
                    if not label:
                        out.append(('', name_case(names)))
                        continue
                for n in re.split(r'\s+et\s+', names):
                    if n.strip():
                        out.append((label, name_case(n.strip())))
            continue
        parsed = []
        for piece in re.split(r'\s*,\s*', seg):
            m = _ROLE_TAIL.search(piece)
            if m and m.start() > 0:
                label = re.sub(r'^(?:et|&)\s+', '', m.group(0).strip())
                names = piece[:m.start()].strip()
            else:
                label, names = '', piece.strip()
            parsed.append([label, names])
        # 'Olivier GARBAN, Nicolas HUGON, Pierre PORO et Marie VIARD violoncelles': the role
        # printed once after the last name belongs to the names before it too
        for i in range(len(parsed) - 2, -1, -1):
            if not parsed[i][0] and parsed[i + 1][0] and re.search(r'\b[A-ZÀ-Ý]{2,}', parsed[i][1]):
                parsed[i][0] = parsed[i + 1][0]
        for label, names in parsed:
            if re.match(r'(?i)^(?:musicien|musicienne|membres|artistes|solistes)', names):
                out.append(('', names))
                continue
            if label and fold(names).startswith(fold(label.split()[0]) + ' '):
                names = names[len(label.split()[0]):].strip()        # 'Piano Marie STOECKLÉ piano'
            for n in re.split(r'\s+et\s+|(?<=[A-ZÀ-Ý]{2})\s+(?=[A-ZÀ-Ý][a-zà-ÿ])', names):
                n = n.strip()
                if n:
                    out.append((label, name_case(n)))
    return out


def _venue(hall, city):
    h = clean(hall)
    if city != CITY:
        return h or None
    if not h:
        return 'Palais de la Musique et des Congrès'
    return h


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def fetch():
    today = today_zurich()
    last = today + timedelta(days=WINDOW_DAYS)
    page = get(LISTING.format(fd=today.day, fm=today.month - 1, fy=today.year,      # Liferay months are 0-based
                              td=last.day, tm=last.month - 1, ty=last.year))
    rows = parse_listing(page)
    prev = previous_by_url(KEY)
    events, skipped, read, reused = [], {}, 0, 0
    cands = []
    for row in rows:
        typ = fold(row['typology'])
        if not typ or _SKIP_TYPOLOGY.search(typ) or is_skipped(row['title'], row['typology']):
            skipped['not a concert / young audience / talk / ONR'] = skipped.get(
                'not a concert / young audience / talk / ONR', 0) + 1
            continue
        city, why = place_of(row)
        if not city:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        days = listed_days(row['when'], today)
        cands.append((min(days) if days else date.max, row, city, days))
    if skipped:
        log.info('ops_strasbourg: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    for _, row, city, days in sorted(cands, key=lambda c: c[0]):
        url = BASE + row['href']
        span = ((days[0].month, days[0].day), (days[-1].month, days[-1].day)) if days else None
        old = reuse_listed(prev.get(url), row['title'], today, span=span, refresh_key=url,
                           near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS)
        if old is not None:
            for e in old:
                try:
                    events.append(rebuild(KEY, e))
                except (ValueError, TypeError) as err:
                    log.warning('ops_strasbourg: previous record %s unusable: %s', e.get('id'), err)
            reused += 1
            continue
        if requests_left() <= 0:
            for e in prev.get(url) or []:
                if e['start'][:10] >= today.isoformat():
                    try:
                        events.append(rebuild(KEY, e))
                    except (ValueError, TypeError):
                        pass
            continue
        try:
            d = parse_detail(get(url), today)
        except BudgetExceeded as err:
            log.warning('ops_strasbourg: stopped reading concert pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('ops_strasbourg: %s failed: %s', url, err)
            continue
        read += 1
        credits = credits_from(d['people'])
        if re.search(r'symphonique|nouvel an', fold(row['typology'])) and \
                not any(r in ('Orchestra', 'Ensemble') for r, _ in credits):
            credits.append(('Orchestra', NAME))          # the orchestra's own symphonic concert
        hint = 'chamber' if 'musique de chambre' in fold(row['typology']) else None
        if 'symphonique' in fold(row['typology']) or 'nouvel an' in fold(row['typology']):
            hint = 'orchestral'
        ctype = concert_type(row['title'], credits, d['works'], hint)
        cancelled = looks_cancelled(row['title'])
        for (day, hh, mi, ehh, emi) in d['dates']:
            if day < today:
                continue
            start = paris_iso(day.year, day.month, day.day, hh, mi)
            end = paris_iso(day.year, day.month, day.day, ehh, emi) if ehh is not None and ehh > hh else None
            try:
                events.append(make_event(
                    KEY, f"{row['id']}-{day:%Y%m%d}{hh:02d}{mi:02d}", row['title'], start, end=end, city=city,
                    venueName=_venue(d['hall'], city), type=ctype, credits=credits, program=d['works'],
                    ticketUrl=d['ticket'], url=url, status='cancelled' if cancelled else 'scheduled'))
            except ValueError as err:
                log.warning('ops_strasbourg: %s skipped: %s', url, err)
    log.info('ops_strasbourg: %d listing rows, %d concerts kept, %d pages read, %d reused', len(rows), len(cands),
             read, reused)
    return events
