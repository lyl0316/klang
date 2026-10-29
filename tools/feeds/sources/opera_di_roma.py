"""Teatro dell'Opera di Roma: opera, ballet and concerts from the house's season list and
production pages (HTML).

    https://www.operaroma.it/wp-admin/admin-ajax.php?action=stagione&lang=it   every production
    https://www.operaroma.it/spettacoli/<slug>/                                one production

The season page (/stagione/) loads its list with a POST to admin-ajax.php; the same
handler answers a plain GET with the list of every production of every season (about 475,
one 800 kB request), sorted by date, each with its genre ("Opere", "Balletti", "Concerti",
"Opere in Concerto", "Eventi Speciali", "Caracalla Festival", "Circo Massimo" …), its
date range ("17 Gennaio - 26 Gennaio 2027"; single dates sometimes without a year: the
year of the entry before it, as the list is chronological) and its venue. Productions
running from today on are read on their own page (one request each, about 25 per season,
so all are read every run; if the request cap stops the reader, the previous feed's
performances of a production not read are kept):

- "Le date": one line per performance ("domenica 17 Gen ORE 19:00 Turno a", ticket link),
  under "Prima rappresentazione" / "Le repliche"; the year comes from the production's
  date range. "Anteprima giovani" (a preview for under-30s) and "Turno scuole" (school
  performances) are skipped.
- "ruoli": "Direttore" / "Regia" / "Coreografia" headings, then lines "role <b>Name</b>";
  alternating singers carry the days they sing ("Ivan Gyngazov 17, 23, 26 / Martin
  Muehle 19, 21"), so each performance gets that evening's cast. Concerts list works as
  "<b>Composer</b> <i>Work</i>". Only those facts are taken, never descriptions.

The site's legal page reserves all content (copyright, L. 248/00) and allows non-commercial
use such as reporting ("cronaca"); Klang republishes facts only (date, time, title, venue,
performers, works, links back). robots.txt answers 404 (everything allowed).

Skipped: prose theatre ("Teatro"), the summer festival's pop concerts and film concerts
(Circo Massimo / Caracalla Festival unless also listed as opera or ballet), the ballet
school's shows and open lessons, school performances, ballets without a conductor
(recorded music or the ballet school, e.g. Lo schiaccianoci at the Teatro Nazionale) and
"Eventi Speciali" without conductor or works (readings and plays with incidental music).

Checked against the website on 29 Oct 2026 (Goecke/Robbins/Bausch 5–8 Nov, The Rake's
Progress, Barbablù 4 Dec, Il lago dei cigni 17–31 Dec, Andrea Chénier 17–26 Jan: dates,
times, conductors and casts per date match).
"""
from __future__ import annotations

import html as _html
import re
from datetime import date, timedelta

from common import (BudgetExceeded, FetchError, clean, get, log, looks_cancelled, make_event,
                    previous_events, requests_left, today_zurich)

from ._italy_centre import concert_type, credits_for_day, fold, month_number, paragraphs, parse_block, rome_iso

KEY = 'opera_di_roma'
NAME = "Teatro dell'Opera di Roma"
SITE = 'https://www.operaroma.it/'
ATTRIBUTION = "Source: Teatro dell'Opera di Roma (operaroma.it)"
KIND = 'venue'
COUNTRY = 'italy'
MAX_REQUESTS = 70              # the list + one page per coming production (~25-35)
TIME_LIMIT = 600

BASE = 'https://www.operaroma.it'
LIST_URL = BASE + '/wp-admin/admin-ajax.php?action=stagione&lang=it'
CITY = 'Rome'
WINDOW_DAYS = 450

_KEEP_GENRES = {'opere', 'balletti', 'concerti', 'opere in concerto', 'eventi speciali'}
_SKIP_TITLE_RE = re.compile(r'scuola di danza|lezione aperta|spettacolo di fine anno|in concerto$|'
                            r'visite? guidat|incontr[oi]\b|conferenz|laboratori', re.I)
_SKIP_SECTION_RE = re.compile(r'anteprima|scuol|giovani|prova', re.I)


# ---------------------------------------------------------------------------
# the production list
# ---------------------------------------------------------------------------

_RANGE_RE = re.compile(r'(\d{1,2})\s+([A-Za-zàèéìòù]+)(?:\s+(\d{4}))?(?:\s*[-–]\s*(\d{1,2})\s+([A-Za-zàèéìòù]+)\s+(\d{4}))?')


def parse_list(page, today):
    """-> list of productions {url, slug, title, genres, venue, first, last} (dates or None)."""
    out = []
    year = None
    prev_month = None
    for it in re.findall(r'<li class="spettacolo">(.*?)</li>\s*(?=<li class="spettacolo">|</ul>)', page or '', re.S):
        link = re.search(r'<a class="title" href="([^"]+)">(.*?)</a>', it, re.S)
        if not link:
            continue
        url = _html.unescape(link.group(1))
        title = clean(re.sub(r'(?i)<br\s*/?>', ' – ', link.group(2)))
        terms = re.search(r'class="terms">(.*?)</div>', it, re.S)
        genres = [fold(clean(x)) for x in re.findall(r'>([^<]+)</a>', terms.group(1))] if terms else []
        when = re.search(r'class="date">(.*?)</div>', it, re.S)
        when = clean(when.group(1)) if when else ''
        venue = re.search(r'class="location">(.*?)</div>', it, re.S)
        venue = clean(venue.group(1)) if venue else ''
        first = last = None
        m = _RANGE_RE.search(when)
        if m:
            d1, m1, y1, d2, m2, y2 = m.groups()
            mo1, mo2 = month_number(m1), month_number(m2) if m2 else None
            if mo1:
                if y2:                                       # '27 Novembre - 5 Dicembre 2026'
                    y_end = int(y2)
                    y_start = int(y1) if y1 else (y_end - 1 if mo2 and mo1 > mo2 else y_end)
                elif y1:
                    y_start = y_end = int(y1)
                else:                                        # '4 Dicembre': the year of the entry before
                    y_start = year if year else today.year
                    if prev_month and mo1 < prev_month - 6:
                        y_start += 1
                    y_end = y_start
                try:
                    first = date(y_start, mo1, int(d1))
                    last = date(y_end, mo2, int(d2)) if (d2 and mo2) else first
                except ValueError:
                    first = last = None
                if first:
                    year, prev_month = last.year, last.month
        slug = re.search(r'/spettacoli/([^/]+)/?', url)
        out.append({'url': url, 'slug': slug.group(1) if slug else url, 'title': title, 'genres': genres,
                    'venue': venue, 'first': first, 'last': last})
    return out


def _wanted(p, today):
    if not p['first'] or p['last'] < today or p['first'] > today + timedelta(days=WINDOW_DAYS):
        return False
    if not set(p['genres']) & _KEEP_GENRES:
        return False                                         # theatre, pop concerts, film concerts
    if _SKIP_TITLE_RE.search(p['title']):
        return False
    return True


# ---------------------------------------------------------------------------
# production pages
# ---------------------------------------------------------------------------

_LI_RE = re.compile(r'<li class="([^"]*)">(.*?)</li>', re.S)


def parse_dates(page, first, last):
    """-> list of {start, day, ticket, note, cancelled} for the production's performances."""
    out, seen = [], set()
    for sec in re.finditer(r'<h4>(.*?)</h4>\s*<ul class="datelist">(.*?)</ul>', page or '', re.S):
        heading = clean(sec.group(1))
        if _SKIP_SECTION_RE.search(heading):
            continue
        for cls, li in _LI_RE.findall(sec.group(2)):
            day = re.search(r'class="giorno">\s*(\d{1,2})', li)
            mon = re.search(r'class="mese">\s*([^<]+)<', li)
            tm = re.search(r'ORE\s*(\d{1,2})[:.](\d{2})', li)
            turno = re.search(r'<span>\s*([^<]*)</span>', li)
            turno = clean(turno.group(1)) if turno else ''
            if not (day and mon and tm):
                continue
            if re.search(r'scuol', turno, re.I):
                continue
            mo = month_number(mon.group(1))
            if not mo:
                continue
            d = int(day.group(1))
            y = first.year if (first.year == last.year or mo >= first.month) else last.year
            try:
                start = rome_iso(y, mo, d, int(tm.group(1)), int(tm.group(2)))
            except ValueError:
                continue
            if start in seen:                                # 'SAN SILVESTRO ALL'OPERA' repeats a date
                continue
            seen.add(start)
            buy = re.search(r'<a class="buy" href="([^"]+)"', li)
            note = re.search(r'titolo-personalizzato">(.*?)</h4>', li, re.S)
            text = clean(li)
            out.append({'start': start, 'day': d, 'ticket': _html.unescape(buy.group(1)) if buy else None,
                        'note': clean(note.group(1)) if note else '',
                        'cancelled': looks_cancelled(text) or 'annull' in cls.lower()})
    return out


def parse_detail(page, title):
    i = (page or '').find('<div class="post-meta">')
    j = (page or '').find('<div class="arrow-bottom">', i)
    frag = page[i:j] if i >= 0 and j > i else ''
    frag = re.sub(r'(?is)<h4>(.*?)</h4>\s*<span class="persone">(.*?)</span>', r'<p>\1 <strong>\2</strong></p>', frag)
    block = parse_block(paragraphs(frag), title, stop_at_prose=False)
    venue = re.search(r'<h3>Dove</h3>.*?<h3>(.*?)</h3>', page or '', re.S)
    program = []
    for composer, work in block['program']:
        program.append((composer, work))
    return {'credits': block['credits'], 'program': program, 'venue': clean(venue.group(1)) if venue else ''}


def _kind(genres, credits, title, program):
    roles = {r for r, _, _ in credits}
    g = set(genres)
    if 'balletti' in g and not ({'opere', 'opere in concerto'} & g):
        return 'orchestral' if 'Conductor' in roles else None     # None: no live music, skipped
    if {'opere', 'opere in concerto'} & g:
        return 'vocal-opera'
    if not g & {'concerti'} and 'Conductor' not in roles and not program:
        return None                                   # a reading or play with incidental music
    return concert_type(title, [(r, n) for r, n, _ in credits], program) or 'mixed'


def fetch():
    today = today_zurich()
    page = get(LIST_URL)                                     # FetchError propagates
    prods = [p for p in parse_list(page, today) if _wanted(p, today)]
    log.info('opera_di_roma: %d coming productions', len(prods))
    events, unread = [], []
    for p in prods:
        if requests_left() <= 0:
            unread.append(p)
            continue
        try:
            detail_page = get(p['url'])
        except BudgetExceeded as err:
            log.warning('opera_di_roma: stopped reading production pages: %s', err.reason)
            unread.append(p)
            continue
        except FetchError as err:
            log.warning('opera_di_roma %s: production page failed: %s', p['slug'], err)
            unread.append(p)
            continue
        d = parse_detail(detail_page, p['title'])
        kind = _kind(p['genres'], d['credits'], p['title'], d['program'])
        if kind is None:
            log.info('opera_di_roma %s: no conductor (recorded music or a play), skipped', p['slug'])
            continue
        program = d['program']
        if kind == 'vocal-opera' and program and len({c for c, _ in program}) == 1 and all(not w for _, w in program):
            program = [(program[0][0], p['title'])]                  # 'Musica di Giuseppe Verdi' -> the opera
        program = [(c, w) for c, w in program if c]
        venue = d['venue'] or p['venue'] or 'Teatro Costanzi'
        for perf in parse_dates(detail_page, p['first'], p['last']):
            credits = credits_for_day(d['credits'], perf['day'])
            title = p['title'] + (f" – {perf['note'].title()}" if perf['note'] else '')
            try:
                events.append(make_event(
                    KEY, f"{p['slug']}-{perf['start'][:16].replace(':', '').replace('-', '')}", title, perf['start'],
                    city=CITY, venueName=venue, type=kind, credits=credits, program=program,
                    ticketUrl=perf['ticket'], url=p['url'], status='cancelled' if perf['cancelled'] else None))
            except ValueError as err:
                log.warning('opera_di_roma %s: skipped a date: %s', p['slug'], err)
    if unread:
        urls = {p['url'] for p in unread}
        kept = [e for e in previous_events(KEY) if e.get('url') in urls]
        log.warning('opera_di_roma: %d production page(s) not read; kept %d performance(s) from the previous feed',
                    len(unread), len(kept))
        events.extend(kept)
    return events
