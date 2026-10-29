"""Gewandhaus zu Leipzig: concerts in the Gewandhaus (Großer Saal, Mendelssohn-Saal) and the
Gewandhausorchester's evenings elsewhere (Oper Leipzig, Thomaskirche, guest concerts in
Germany), from the house's own calendar.

    https://www.gewandhausorchester.de/d/<YYYY-MM-DD>/      10 events from that day on

The calendar is a TYPO3 list of 10 events per page; its "more" links carry a cHash, which
robots.txt closes, so the reader walks the date pages instead: it starts today and asks for the
day of the last event on the page until it passes today + 450 days or the calendar ends (~60
pages for a season; a day with more than ten events would be cut, which has not been seen).
Every event teaser holds all the facts: id, date and time ("19.30 Uhr"), hall, series ("Grosse
Concerte", "Kammermusik", "Orgel" …), title line, performers with roles in italics ("Andris
Nelsons <i>Dirigent</i>"), the full programme ("Composer — Work" lines; "Pause" dropped), the
promoter ("Veranstalter") and the ticket link. No detail pages are needed. Only facts are
taken, never the descriptions.

The title of an event whose heading is a list of performers is the line above it (e.g.
"Orgelkonzert zum Buß- und Bettag"); all-capitals titles of opera evenings ("LA BOHÈME") are
written in title case. Opera evenings of the Gewandhausorchester ("Veranstalter: Oper Leipzig")
and the Thomaskirche motets are kept with the venue names the readers oper_leipzig and
thomaskirche_leipzig use, so build.py merges them.

Skipped: guided tours, children's and family formats ("Gewandhaus für Kinder", "Klassik
airleben" picnics are kept only when a programme is listed), talks, rentals by other promoters
without any listed programme or performers (pop, schlager, shows: Helmut Lotti, Mireille
Mathieu …), and guest concerts abroad. Checked against the website on 29 Oct 2026.
"""
from __future__ import annotations

import html as _html
import re
from datetime import date, timedelta

from common import BudgetExceeded, FetchError, clean, get, log, looks_cancelled, make_event, requests_left, today_zurich

from ._saxony import cast_credits, german_town, local_dt, skip_reason, strip_life_dates

KEY = 'gewandhaus_leipzig'
NAME = 'Gewandhaus zu Leipzig'
SITE = 'https://www.gewandhausorchester.de/'
ATTRIBUTION = 'Source: Gewandhaus zu Leipzig (gewandhausorchester.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 110
TIME_LIMIT = 900
WINDOW_DAYS = 450

BASE = 'https://www.gewandhausorchester.de'
DAY_URL = BASE + '/d/{day}/'
CITY = 'Leipzig'

_HALLS = (
    (r'^gro(?:ß|ss)er saal$', 'Gewandhaus zu Leipzig, Großer Saal', CITY),
    (r'^mendelssohn-saal$', 'Gewandhaus zu Leipzig, Mendelssohn-Saal', CITY),
    (r'^schumann-eck$', 'Gewandhaus zu Leipzig, Schumann-Eck', CITY),
    (r'foyer', 'Gewandhaus zu Leipzig, Foyer', CITY),
    (r'^opernhaus$|^oper leipzig$', 'Oper Leipzig, Opernhaus', CITY),
    (r'musikalische kom', 'Oper Leipzig, Musikalische Komödie', CITY),
    (r'^thomaskirche', 'Thomaskirche Leipzig', CITY),
    (r'^nikolaikirche', 'Nikolaikirche Leipzig', CITY),
    (r'k[öo]lner philharmonie', 'Kölner Philharmonie', 'Cologne'),
    (r'elbphilharmonie', 'Elbphilharmonie Hamburg', 'Hamburg'),
    (r'^philharmonie berlin|berliner philharmonie', 'Philharmonie Berlin', 'Berlin'),
)
_SKIP_SERIES = re.compile(r'(?i)f[üu]hrung|kinder|familie|schule|jugend')
_SKIP_TITLE = re.compile(r'(?i)lauschkonzert|weihnachtssingen|karneval der tiere|krieg\. stell')


def _hall(name, title):
    """-> (venueName, city or None). A guest concert ('Gastspiel … in Hamburg') is placed by the
    town its title names; one abroad, or in a town not recognised, gets None (skipped)."""
    n = clean(name)
    low = n.lower()
    for rx, hall, city in _HALLS:
        if re.search(rx, low):
            return hall, city
    guest = re.match(r'(?i)^(?:gastspiel|tournee|konzertreise)', clean(title))
    if guest:
        where = re.search(r'(?i)\bin\s+([^,;|]+)$', clean(title))
        return (n or clean(title)), german_town(where.group(1) if where else n, default=None)
    return (n or 'Gewandhaus zu Leipzig'), german_town(n, default=CITY)


def _title_case(t):
    if t.isupper() and len(t) > 3:
        small = {'Der', 'Die', 'Das', 'Und', 'Von', 'Im', 'In', 'Am', 'Zum', 'Zur', 'Mit'}
        words = [w.capitalize() for w in t.lower().split(' ')]
        return ' '.join(w if i == 0 or w not in small else w.lower() for i, w in enumerate(words))
    return t


def _split_top(text, sep=','):
    """Split at ``sep`` outside parentheses and <i>…</i>."""
    parts, depth, cur, i = [], 0, '', 0
    while i < len(text):
        if text.startswith('<i>', i):
            j = text.find('</i>', i)
            j = len(text) if j < 0 else j + 4
            cur += text[i:j]
            i = j
            continue
        ch = text[i]
        depth += ch == '('
        depth -= ch == ')' and depth > 0
        if ch == sep and depth == 0:
            parts.append(cur)
            cur = ''
        else:
            cur += ch
        i += 1
    parts.append(cur)
    return parts


def _performers(html_line):
    """'Gewandhausorchester, Andris Nelsons <i>Dirigent</i>, Grieg Quartett (A <i>Violine</i>, …)'
    -> [(German role or '', name)]; a group's members in brackets follow the group."""
    out = []
    for part in _split_top(html_line or ''):
        inner = re.search(r'\((.*)\)', part, re.S)
        if inner and '<i>' in inner.group(1):
            group = clean(part[:inner.start()])
            if group:
                out.append(('', group))
            out.extend(_performers(inner.group(1)))
            continue
        role = re.search(r'<i>(.*?)</i>', part, re.S)
        name = clean(re.sub(r'<i>.*?</i>', '', part, flags=re.S))
        if name.count('(') != name.count(')'):
            name = name.strip(' ()')
        if name:
            out.append((clean(role.group(1)) if role else '', name))
    return out


def parse_page(page_html):
    """-> list of event dicts from one calendar page."""
    out = []
    for chunk in re.split(r'<div class="event-list__item', page_html or '')[1:]:
        chunk = re.sub(r'(?is)<(script|style|svg)\b.*?</\1>', ' ', chunk)
        sid = re.search(r'id="event-(\d+)"', chunk)
        day = re.search(r'id="csConcertsDate\d+" datetime="(\d{4}-\d{2}-\d{2})"', chunk)
        tm = re.search(r'<span class="event-teaser__time">\s*(\d{1,2})(?:[.:](\d{2}))?\s*Uhr', chunk)
        if not (sid and day and tm):
            continue
        eid = sid.group(1)
        hall = re.search(r'<span class="event-teaser__time">.*?</span>\s*(?:<br\s*/?>)?\s*([^<]+?)\s*</p>', chunk, re.S)
        h2 = re.search(rf'id="csConcertsTitle{eid}"[^>]*>(.*?)</h[12]>', chunk, re.S)
        heading = re.sub(r'<span class="h-only-screenreader-text">.*?</span>', '', h2.group(1), flags=re.S) if h2 else ''
        before = chunk[:h2.start()] if h2 else chunk
        series = re.findall(r'<p class="text-highlight text-highlight--color-primary[^"]*">(.*?)</p>', before, re.S)
        sub = re.findall(r'<p class="h-color-highlight-primary h-no-margin-bottom">(.*?)</p>', before, re.S)
        after = chunk[h2.end():] if h2 else ''
        line = re.match(r'\s*<p>(.*?)</p>', after, re.S)
        details = re.search(rf'id="csConcertsDetails-level-1-{eid}"[^>]*>(.*?)</div>', chunk, re.S)
        works = []
        for p in re.findall(r'<p>(.*?)</p>', details.group(1) if details else '', re.S):
            t = clean(p)
            m = re.match(r'^(.+?)\s+[—–]\s+(.+)$', t)
            if m and not re.match(r'(?i)^pause$', t):
                works.append((strip_life_dates(m.group(1)), clean(m.group(2))))
        heading_people = _performers(heading) if '<i>' in heading else []
        line_html = line.group(1) if line and not re.search(r'(?i)werke von|preise:', clean(line.group(1))) else ''
        people = heading_people + _performers(line_html)
        organizer = re.search(r'<p>\s*Veranstalter:\s*(.*?)</p>', chunk, re.S)
        ticket = re.search(r'href="(https://tickets?\.[^"]+)"', chunk)
        link = re.search(rf'href="(/veranstaltung/[^"]*-{eid}/)"', chunk)
        status = ' '.join(clean(x) for x in re.findall(r'event-teaser__mobile-button">(.*?)</span>', chunk, re.S))
        out.append({
            'id': eid, 'day': day.group(1), 'hh': int(tm.group(1)), 'mm': int(tm.group(2) or 0),
            'hall': clean(hall.group(1)) if hall else '', 'heading': clean(heading),
            'heading_is_people': bool(heading_people), 'series': clean(series[0]) if series else '',
            'subtitle': clean(sub[0]) if sub else '', 'people': people, 'works': works,
            'organizer': clean(organizer.group(1)) if organizer else '',
            'ticket': _html.unescape(ticket.group(1)) if ticket else None, 'status': status,
            'url': BASE + link.group(1) if link else BASE + '/',
        })
    return out


def _title(ev):
    if ev['heading_is_people'] and ev['subtitle']:
        t = ev['subtitle']
    elif ev['heading_is_people']:
        t = ', '.join(n for _, n in ev['people'][:3])
    else:
        t = ev['heading']
    return _title_case(clean(t))


def _type(ev, credits):
    roles = {r for r, _ in credits}
    series = ev['series'].lower()
    text = f"{ev['heading']} {ev['subtitle']} {series}".lower()
    if 'oper' in ev['subtitle'].lower() or 'oper leipzig' in ev['organizer'].lower():
        return 'vocal-opera'
    if 'choir' in roles or 'Choir' in roles or 'chöre' in series or 'motette' in text or 'kantate' in text:
        return 'vocal-opera'
    if 'kammermusik' in series:
        return 'chamber'
    if 'Orchestra' in roles:
        return 'orchestral'
    if series in ('orgel', 'klaviermusik') or len([r for r in roles if r not in ('Presenter', 'Narrator')]) == 1:
        return 'recital'
    return None


def fetch():
    today = today_zurich()
    last = today + timedelta(days=WINDOW_DAYS)
    day, seen, rows, pages = today, set(), [], 0
    while day <= last:
        if requests_left() <= 0:
            log.warning('gewandhaus_leipzig: request cap reached at %s', day)
            break
        try:
            page = get(DAY_URL.format(day=day.isoformat()))
        except BudgetExceeded as err:
            log.warning('gewandhaus_leipzig: stopped at %s: %s', day, err.reason)
            break
        except FetchError as err:
            if pages == 0:
                raise
            log.warning('gewandhaus_leipzig: %s failed: %s', day, err)
            day += timedelta(days=1)
            continue
        pages += 1
        found = parse_page(page)
        new = [e for e in found if e['id'] not in seen]
        if not found or not new:
            break                                       # the calendar ends here
        for e in new:
            seen.add(e['id'])
            rows.append(e)
        latest = max(date.fromisoformat(e['day']) for e in found)
        day = latest if latest > day else day + timedelta(days=1)
    log.info('gewandhaus_leipzig: %d page(s), %d events up to %s', pages, len(rows),
             max((e['day'] for e in rows), default='-'))

    events, skipped = [], {}
    for ev in rows:
        title = _title(ev)
        d = date.fromisoformat(ev['day'])
        why = (skip_reason(title, ev['subtitle'], ev['heading']) or (_SKIP_SERIES.search(ev['series']) and 'family/tour')
               or (_SKIP_TITLE.search(title) and 'children / sing-along'))
        if not why and ev['hh'] < 12 and (d.weekday() < 5 or 'entdecken' in ev['series'].lower()) and \
                not re.search(r'(?i)motette', title):
            why = 'school / morning performance'
        if not why and ev['hh'] < 12 and re.match(r'(?i)^thomaskirche', ev['hall']):
            why = 'service in the Thomaskirche'
        if not why and not ev['works'] and not ev['people'] and not ev['series']:
            why = 'other promoter, no programme'
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        venue, city = _hall(ev['hall'], title)
        if not city:
            skipped['abroad'] = skipped.get('abroad', 0) + 1
            continue
        if d < today:
            continue
        credits = cast_credits(ev['people'], kind='opera' if 'oper leipzig' in ev['organizer'].lower() else 'concert')
        cancelled = looks_cancelled(title) or looks_cancelled(ev['status'])
        try:
            events.append(make_event(
                KEY, ev['id'], title, local_dt(d, ev['hh'], ev['mm']), city=city, venueName=venue,
                type=_type(ev, credits), series=ev['series'] or None, credits=credits, program=ev['works'],
                ticketUrl=ev['ticket'], url=ev['url'],
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('gewandhaus_leipzig %s: skipped: %s', ev['id'], err)
    if skipped:
        log.info('gewandhaus_leipzig: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    return events
