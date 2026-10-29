"""Stuttgarter Philharmoniker: the orchestra's season list (HTML).

    https://www.stuttgarter-philharmoniker.de/konzertprogramm-aktuell.html   the season, one page
    https://www.stuttgarter-philharmoniker.de/<n>.html                         one page per concert

The season page lists every concert (about 120): ``<time datetime="2026-10-30T19:30:00TCET">``
(Stuttgart local time; the "TCET" suffix is not an offset and is ignored), "19:30 | Ulm"
(town or hall), the title and link, a line of composers in capitals ("RAVEL | MOZART |
TSCHAIKOWSKY") or a subtitle, "mit … unter Leitung von …", the series as a CSS class
(dgr = Die große Reihe, sextett = Sinfonische Horizonte, terzett = Klassik Highlights,
philpops, beethoven) and alerts ("Ausverkauft", "fällt aus"; a cancelled entry also has the
class ``canceled``). The concert page adds the town and hall, the works ("<b>RAVEL</b>
Le Tombeau de Couperin"), the performers with their instrument, the conductor, the series
("Alle Konzerte der Reihe: On Tour") and the ticket link. Concert pages are read
incrementally (cap 100): a concert the previous feed already has with its works (same id,
start and title) keeps them; the requests left go to concerts still missing them, soonest
first, then to concerts in the next week and a fixed share of the others (each about every
two weeks). Composers are printed in capitals on the site and are given in title case
("C. P. E. Bach", "Dvořák").

The imprint does not allow links to single pages of the site ("Eine Verlinkung einzelner
Seiten aus diesem Webauftritt ist nicht gestattet … nur der gesamte Auftritt"), so every
event links to the site's home page; the ticket link is the seller's (Eventim etc.).
Facts only (date, time, hall, performers, works).

Generic titles ("Konzert in Ulm", "Kultur am Nachmittag", "Carte blanche") get the line
below them ("Konzert in Ulm: Ravel | Mozart | Tschaikowsky"). Tours: German towns are kept
with their English name; concerts abroad (France, the UK, Italy, Zürich) are left out.

Skipped: children's, family and school concerts, open rehearsals (entries without a page),
film concerts, the pops series (philharmonic pops), gipsy-jazz and the Nachtschwärmer
classical/jazz crossover evenings. Checked against the website on 29 Oct 2026: 119 entries,
68 kept (11 abroad, 40 children/film/pops/jazz).
"""
from __future__ import annotations

import html as _html
import re
from datetime import date

from common import (BudgetExceeded, FetchError, clean, event_id, get, infer_type, log, looks_cancelled, make_event,
                    previous_event, refresh_due, requests_left)

from ._south_germany import credit, dedupe_credits, in_window, local_iso, name_key, skip_title, town

KEY = 'stuttgarter_philharmoniker'
NAME = 'Stuttgarter Philharmoniker'
SITE = 'https://www.stuttgarter-philharmoniker.de/'
ATTRIBUTION = 'Source: Stuttgarter Philharmoniker (stuttgarter-philharmoniker.de)'
KIND = 'orchestra'
COUNTRY = 'germany'
MAX_REQUESTS = 100
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 14

BASE = 'https://www.stuttgarter-philharmoniker.de/'
LISTING = BASE + 'konzertprogramm-aktuell.html'
ORCHESTRA = 'Stuttgarter Philharmoniker'
SERIES = {'dgr': 'Die große Reihe', 'sextett': 'Sinfonische Horizonte', 'terzett': 'Klassik Highlights',
          'beethoven': 'Beethoven-Tage', 'philpops': 'philharmonic pops'}

_SKIP_RE = re.compile(r'(?i)kinder|familie|schul|kita|filmkonzert|live in concert|tribute to|gipsy|jazz|'
                      r'nachtschwärmer|philharmonic pops|öffentliche probe|probe\b')
_GENERIC_RE = re.compile(r'(?i)^(?:(?:orchester|kammer|neujahrs|film)?konzert in\b|kultur am nachmittag$|carte blanche$|'
                         r'konzert in bildern$|opernfestspiele heidenheim|mittendrin$|konzert der kulturgemeinschaft$)')
_PARTICLES = {'von', 'van', 'de', 'der', 'den', 'di', 'da', 'du', 'la', 'le', 'und'}


def _text(fragment):
    return clean(_html.unescape(fragment or ''))


def title_case(text):
    """'C. P. E. BACH' -> 'C. P. E. Bach', 'MENDELSSOHN BARTHOLDY' -> 'Mendelssohn Bartholdy'.
    Words that are not all capitals are kept."""
    out = []
    for w in clean(text).split():
        if w.isupper() and len(w) > 1 and not re.fullmatch(r'[A-Z]\.', w):
            low = w.lower()
            w = low if low in _PARTICLES and out else '-'.join(p[:1].upper() + p[1:] for p in low.split('-'))
        out.append(w)
    return ' '.join(out)


# ---------------------------------------------------------------------------
# season page
# ---------------------------------------------------------------------------

def parse_listing(page_html):
    rows = []
    for item in re.split(r'<div class="item ', page_html or '')[1:]:
        classes = item[:item.find('"')].split()
        when = re.search(r'<time datetime="(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})', item)
        loc = re.search(r'<div class="timelocation">\s*\d{1,2}:\d{2}\s*\|\s*([^<]*?)\s*(?:<|$)', item)
        head = re.search(r'<h2><a href="(\d+)\.html">(.*?)</a>\s*(?:<span>(.*?)</span>)?', item, re.S)
        details = re.search(r'<div class="item-details">\s*<p>(.*?)</p>', item, re.S)
        if not when:
            continue
        y, mo, d, hh, mi = (int(x) for x in when.groups())
        rows.append({
            'id': head.group(1) if head else None, 'classes': classes,
            'day': date(y, mo, d), 'time': (hh, mi),
            'location': _text(loc.group(1)) if loc else '',
            'title': _text(head.group(2)) if head else '',
            'line': _text(head.group(3)) if head and head.group(3) else '',
            'details': _text(details.group(1)) if details else '',
            'alerts': [_text(a) for a in re.findall(r'<span class="alert">(.*?)</span>', item, re.S)],
        })
    return rows


def _listing_people(text):
    """'mit Magdalene Ho unter Leitung von Ruth Reinhardt' -> [('Performer', 'Magdalene Ho'), ('Conductor', …)]"""
    out = []
    m = re.search(r'(?i)unter (?:der )?leitung von\s+(?:festspieldirektor\s+)?([^,.]+?)(?:,|\.|$)', text)
    if m:
        out.append(('Conductor', m.group(1).strip()))
    m = re.match(r'(?i)^mit\s+(.+?)\s+(?:unter|in kooperation|und den|und dem)\b', text)
    if m and not re.search(r'(?i)chor|orchester|mitglieder|absolvent|gewinner|dem |den |der ', m.group(1)):
        for name in re.split(r',\s*|\s+und\s+', m.group(1)):
            if 2 <= len(name.split()) <= 4:
                out.append(('Performer', name.strip()))
    return out


# ---------------------------------------------------------------------------
# concert pages
# ---------------------------------------------------------------------------

_BOLD_RE = re.compile(r'<(b|strong)>(.*?)</\1>', re.S)


def _composer_name(text):
    """'C. P. E. BACH' -> 'C. P. E. Bach'; None when the bold text is no composer name."""
    t = _text(text).strip(' ,:')
    if not t or t.upper() != t or len(t.split()) > 5 or re.search(
            r'\d|:|\bzum\b|\bvon\b|[„“"»«]|suite|musik|konzert|ouvert', t, re.I):
        return None                                         # the site prints composers in capitals
    return title_case(t)


def _works(block):
    out, pending = [], None
    for p in re.findall(r'<(?:p|h3)>(.*?)</(?:p|h3)>', block, re.S):
        von = re.search(r'(?i)\bvon\s*<(b|strong)>(.*?)</\1>', p, re.S)
        if pending and von:                                   # '<b>LOHENGRIN</b>' + 'Oper … von <b>RICHARD WAGNER</b>'
            comp = _composer_name(von.group(2))
            if comp:
                out.append((comp, pending))
            pending = None
            continue
        bold = _BOLD_RE.search(p)
        if not bold:
            continue
        comp = _composer_name(bold.group(2))
        rest = _text(p[bold.end():])
        if rest.startswith(',') or re.search(r'\boder\b', rest):
            continue                                          # 'BRAHMS, DVOŘÁK … oder SCHUMANN': a choice, no work
        if comp and rest:
            out.append((comp, rest))
        elif comp and not rest and not re.search(r'<br', p[bold.end():]):
            pending = title_case(_text(bold.group(2))) if not out else None   # a work title on its own
    return out


def _artists(block):
    out = []
    for li in re.findall(r'<li>(.*?)</li>', block, re.S):
        for part in re.split(r'<br\s*/?>', li):
            bold = _BOLD_RE.search(part)
            if not bold:
                continue
            before, name, after = _text(part[:bold.start()]), _text(bold.group(2)), _text(part[bold.end():])
            role = before or after
            m = re.match(r'(.+?)\s+-\s+(.+)$', name)                # 'Kai Kluge - Christus (' + 'Tenor)'
            if m:
                name = m.group(1)
                voice = re.search(r'\(?\s*([^()]+?)\s*\)', f'{m.group(2)}{after}')
                role = voice.group(1) if voice else m.group(2)
            for n in re.split(r'\s*/\s*', name):
                if n and not re.search(r'(?i)solist\*?innen|solisten der', n):
                    out.append((n, role.strip(' ()')))
    return out


def parse_detail(page_html):
    """-> {'town', 'hall', 'works': [(composer, title)], 'performers': [(name, role)], 'series', 'ticket'}"""
    h = page_html or ''
    out = {'town': '', 'hall': '', 'works': [], 'performers': [], 'series': '', 'ticket': None}
    addr = re.search(r'<div itemprop="address">(.*?)</div>\s*</div>', h, re.S)
    if addr:
        a = addr.group(1)
        town_p = re.search(r'<p>(.*?)</p>', a, re.S)
        if town_p:
            out['town'] = _text(town_p.group(1))
            a = a[town_p.end():]
        out['hall'] = _text(re.split(r'<br\s*/?>|\(bei', a)[0])
    ticket = re.search(r'<a href="(https?://[^"]+)"[^>]*class="onlineticket', h)
    if ticket:
        out['ticket'] = _html.unescape(ticket.group(1))
    prog = re.search(r'<div id="program"[^>]*>(.*?)</div>', h, re.S)
    if prog:
        out['works'] = _works(prog.group(1))
    artists = re.search(r'<div id="artists">(.*?)</div>', h, re.S)
    if artists:
        out['performers'] = _artists(artists.group(1))
    series = re.search(r'Alle Konzerte der Reihe:\s*(?:<br\s*/?>)?\s*<span[^>]*>(.*?)</span>', h, re.S)
    if series:
        out['series'] = _text(series.group(1))
    return out


# ---------------------------------------------------------------------------
# rows -> events
# ---------------------------------------------------------------------------

def _title(r):
    line = title_case(r['line']) if r['line'] else ''
    if line and _GENERIC_RE.search(r['title']):
        return f"{r['title']}: {line}"
    return r['title'] or line


def _listing_matches(r, prev):
    cast = {name_key(x.get('name')) for x in prev.get('credits') or []}
    return all(name_key(n) in cast for _, n in _listing_people(r['details']))


def fetch():
    rows = parse_listing(get(LISTING))                      # FetchError propagates
    cands, skipped = [], {}

    def skip(why):
        skipped[why] = skipped.get(why, 0) + 1

    for r in rows:
        if not in_window(r['day']):
            skip('outside the window')
            continue
        if not r['id']:
            skip('no concert page (open rehearsal, pops)')
            continue
        text = ' '.join([r['title'], r['line'], r['details']])
        if 'philpops' in r['classes'] or skip_title(r['title'], r['line']) or _SKIP_RE.search(
                f"{r['title']} {r['line']}"):
            skip('children / film / pops / jazz')
            continue
        city = town(r['location'], r['title']) or 'Stuttgart'
        if city == 'abroad':
            skip('abroad')
            continue
        r.update(city=city, start=local_iso(r['day'], *r['time']), text=text)
        cands.append(r)
    if skipped:
        log.info('%s: %d listed; skipped %s', KEY, len(rows), ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    for r in cands:
        prev = previous_event(event_id(KEY, r['id']), r['start'], title=_title(r))
        if prev and prev.get('program') and _listing_matches(r, prev):
            r['prev'] = prev

    def tier(r):
        if not r.get('prev'):
            return 0
        if refresh_due(r['id'], r['start'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    read = 0
    for r in sorted((r for r in cands if tier(r) is not None), key=lambda r: (tier(r), r['start'])):
        if requests_left() <= 0:
            break
        try:
            r['detail'] = parse_detail(get(f"{BASE}{r['id']}.html"))
            read += 1
        except BudgetExceeded as err:
            log.warning('%s: stopped reading concert pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: concert page failed: %s', KEY, r['id'], err)
    log.info('%s: %d concert page(s) read, %d concerts reuse earlier details', KEY, read,
             sum(1 for r in cands if r.get('prev') and not r.get('detail')))

    events = []
    for r in cands:
        d, prev = r.get('detail'), r.get('prev')
        venue, city, ticket = None, r['city'], None
        if d:
            credits = [x for x in (credit(n, role) for n, role in d['performers']) if x]
            program = d['works']
            series = d['series'] or SERIES.get(r['classes'][0])
            ticket = d['ticket']
            if d['town']:
                c = town(d['town'], d['hall'])
                if c == 'abroad':
                    continue
                city = c or d['town']
            venue = d['hall'] or None
            if venue and d['town'] and city != 'Stuttgart' and d['town'].lower() not in venue.lower():
                venue = f"{venue}, {d['town']}"
        elif prev:
            credits = [(x.get('role'), x.get('name')) for x in prev.get('credits') or []]
            program = [(x.get('composer') or '', x.get('title') or '') for x in prev.get('program') or []]
            series = prev.get('series')
            venue, ticket = prev.get('venueName'), prev.get('ticketUrl')
            city = prev.get('city') or city
        else:
            credits = _listing_people(r['details'])
            program = [(title_case(c), '') for c in r['line'].split('|')
                       if re.fullmatch(r"[A-ZÄÖÜÁÉÍÓÚŘŠČŽÈÀÇ.\s'’-]+", c.strip() or 'x')] if '|' in r['line'] or (
                r['line'].isupper() and len(r['line'].split()) <= 3) else []
            series = SERIES.get(r['classes'][0])
            venue = r['location'] if not town(r['location']) or re.search(r'(?i)liederhalle|siegle', r['location']) \
                else None
        if venue and re.fullmatch(r'(?i)liederhalle', venue):
            venue = 'Liederhalle Stuttgart'
        credits = dedupe_credits(credits)
        opera = bool(re.search(r'(?i)opernfestspiele|lohengrin|\boper\b', r['text']))
        if not program and re.fullmatch(r"([A-ZÄÖÜ.' -]+?)\s*·\s*(.+)", r['line']):   # 'WAGNER · LOHENGRIN'
            c, w = re.fullmatch(r"([A-ZÄÖÜ.' -]+?)\s*·\s*(.+)", r['line']).groups()
            program = [(title_case(c), title_case(w))]
        chamber = bool(re.search(r'(?i)kammermusik|kammerkonzert|carte blanche', r['text']))
        if not any(n == ORCHESTRA for _, n in credits) and not chamber:
            credits.append(('Orchestra', ORCHESTRA))
        ctype = 'vocal-opera' if opera and 'LAST NIGHT' not in r['title'] else infer_type(
            r['title'], credits, program, series, solo_rule=False)
        if chamber and ctype in (None, 'orchestral'):
            ctype = 'chamber'
        cancelled = 'canceled' in r['classes'] or any(looks_cancelled(a) for a in r['alerts'])
        try:
            events.append(make_event(
                KEY, r['id'], _title(r), r['start'], city=city, venueName=venue, type=ctype,
                series=series, credits=credits, program=program, ticketUrl=ticket, url=SITE,
                status='cancelled' if cancelled else None))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, r['id'], err)
    return events
