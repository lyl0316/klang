"""Bregenzer Festspiele: the summer festival's operas and orchestral concerts (Next.js site).

    https://bregenzerfestspiele.com/de                        main menu: the productions
    https://bregenzerfestspiele.com/de/<section>/<slug>       one page per production

Pages are rendered on the server with their data in the React payload
(``self.__next_f.push([1, "…"])`` rows). The main menu lists the productions under "Oper
und Musiktheater" and "Konzert"; every production page carries an info box with the date
("TERMIN<br>26. Juli 2027 – 19.30 Uhr<br>Festspielhaus, Großer Saal", or "PREMIERE …" for
an opera), the programme ("<strong>Composer</strong><br>Work" under "Zum Programm") and the
cast ("Dirigent<br><strong>Name</strong>" under "Besetzung", the orchestra as a bold line).

Limitation: the list of all performances of a production (the spielplan) is loaded by
the page's script from code in /_next/static/chunks/app/, which robots.txt disallows, and
the ticket shop (ticket.bregenzerfestspiele.com) disallows all robots. So only the dates
printed on the production pages are known: every orchestral concert (one date each), but
for an opera only its premiere. Checked against the website on 29 Oct 2026 (Wiener
Symphoniker / Domingo Hindoyan 26.7.2027 19.30 Festspielhaus, Großer Saal: Nielsen,
Hillborg, Bartók, Martin Fröst; Penthesilea premiere 21.7.2027 19.30; La traviata premiere
22.7.2027 21.15 Seebühne).

The legal notice forbids copying the site's content for commercial purposes; Klang is
non-commercial and republishes facts only (date, time, title, hall, performers, works, links).

Skipped: guided tours, introductions, the pages "Karten & Besuch", "Über uns" etc.
"""
from __future__ import annotations

import json
import re
from datetime import datetime

from common import FetchError, clean, get, infer_type, log, looks_cancelled, make_event, to_zurich_iso, today_zurich

from ._austria_west import credit, order_credits, program_from_html

KEY = 'bregenzer_festspiele'
NAME = 'Bregenzer Festspiele'
SITE = 'https://bregenzerfestspiele.com/de'
ATTRIBUTION = 'Source: Bregenzer Festspiele (bregenzerfestspiele.com)'
KIND = 'festival'
COUNTRY = 'austria'
MAX_REQUESTS = 40
TIME_LIMIT = 300

BASE = 'https://bregenzerfestspiele.com'
HOME = BASE + '/de'
TZ = 'Europe/Vienna'
CITY = 'Bregenz'
WINDOW_DAYS = 450
MAX_PAGES = 30

_SECTIONS = re.compile(r'^/de/(?!einblicke|karten-besuch|ueber-uns|unterstuetzer-freunde|presse|jobs|newsletter|'
                       r'webcam|magazin|festspielzeit|oeffnungszeiten|impressum|datenschutz|agb|barrierefreiheit|'
                       r'vertriebspartner)[a-z0-9-]+/[a-z0-9/-]+$')
_SKIP_TITLE = re.compile(r'führung|fuehrung|einführung|einfuehrung|vortrag|workshop|kinder|familie|probe\b', re.I)
_MONTHS = {'januar': 1, 'jänner': 1, 'februar': 2, 'märz': 3, 'april': 4, 'mai': 5, 'juni': 6, 'juli': 7,
           'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'dezember': 12}
_DATE_RE = re.compile(r'(\d{1,2})\.\s*([A-Za-zäÄ]+)\s+(\d{4})\s*[–—-]\s*(\d{1,2})[.:](\d{2})\s*Uhr', re.I)


# ---------------------------------------------------------------------------
# React server payload
# ---------------------------------------------------------------------------

_PUSH_RE = re.compile(r'self\.__next_f\.push\((\[.*?\])\)\s*</script>', re.S)


def rsc_rows(page):
    """{row id: JSON value or text} from the page's React payload."""
    stream = ''
    for m in _PUSH_RE.finditer(page or ''):
        try:
            arr = json.loads(m.group(1))
        except ValueError:
            continue
        if len(arr) > 1 and arr[0] == 1 and isinstance(arr[1], str):
            stream += arr[1]
    data = stream.encode('utf-8')
    rows, pos = {}, 0
    while pos < len(data):
        colon = data.find(b':', pos)
        if colon < 0:
            break
        rid = data[pos:colon].decode('ascii', 'replace').strip()
        if not re.fullmatch(r'[0-9a-f]+', rid):
            nl = data.find(b'\n', pos)
            pos = len(data) if nl < 0 else nl + 1
            continue
        m = re.match(rb'T([0-9a-f]+),', data[colon + 1:colon + 12])
        if m:                                              # text row: 'T<hex byte length>,<text>'
            start = colon + 1 + len(m.group(0))
            end = start + int(m.group(1), 16)
            rows[rid] = data[start:end].decode('utf-8', 'replace')
            pos = end
            continue
        nl = data.find(b'\n', colon)
        end = len(data) if nl < 0 else nl
        raw = data[colon + 1:end].decode('utf-8', 'replace')
        try:
            rows[rid] = json.loads(raw)
        except ValueError:
            rows[rid] = raw
        pos = end + 1
    return rows


def _walk(node):
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from _walk(v)
    elif isinstance(node, list):
        for v in node:
            yield from _walk(v)


def _text(value, rows):
    """A rich-text value, following '$<id>' references to text rows."""
    if isinstance(value, str) and re.fullmatch(r'\$[0-9a-f]+', value):
        ref = rows.get(value[1:])
        return ref if isinstance(ref, str) else ''
    return value if isinstance(value, str) else ''


def _values(items, rows):
    return ' '.join(_text(x.get('value'), rows) for x in items or [] if isinstance(x, dict))


def menu_links(page):
    out = []
    for row in rsc_rows(page).values():
        for node in _walk(row):
            url = node.get('url')
            if isinstance(url, str) and _SECTIONS.match(url) and url not in out and 'langcode' in node:
                out.append(url)
    return out


def production(page):
    """-> {'title', 'subtitle', 'section', 'info', 'groups': [(label, html)], 'id'} or None."""
    rows = rsc_rows(page)
    for row in rows.values():
        for node in _walk(row):
            if node.get('type') != 'produktionsseite' or 'inhalt' not in node:
                continue
            groups = []
            for g in _walk([node.get('inhalt'), node.get('inhalt_mit_hintergrund')]):
                if g.get('type') != 'gruppe':
                    continue
                label = clean(_values(g.get('text_links'), rows))
                parts = [_values(x.get('text'), rows) for x in g.get('gruppeninhalt') or [] if isinstance(x, dict)]
                groups.append((label, ' '.join(p for p in parts if p)))
            crumbs = node.get('breadcrumb') or []
            sections = [clean(c.get('title')) for c in crumbs[1:-1] if isinstance(c, dict)]
            return {'title': clean(node.get('title') or (crumbs[-1].get('title') if crumbs else '')),
                    'subtitle': clean(node.get('untertitel')), 'id': str(node.get('produktion') or ''),
                    'info': _values(node.get('infotext'), rows), 'groups': groups,
                    'section': sections[-1] if sections else ''}
    return None


# ---------------------------------------------------------------------------
# facts
# ---------------------------------------------------------------------------

def dates_from_info(info_html):
    """-> [(label, 'YYYY-MM-DDTHH:MM', place)] from the info box."""
    out = []
    for para in re.findall(r'<p>(.*?)</p>', info_html or '', re.S):
        lines = [clean(x) for x in re.split(r'<br\s*/?>', para)]
        lines = [x for x in lines if x]
        if not lines:
            continue
        label = lines[0] if not _DATE_RE.search(lines[0]) else ''
        found = []
        place = ''
        for line in lines:
            m = _DATE_RE.search(line)
            if m:
                month = _MONTHS.get(m.group(2).lower())
                if month:
                    found.append(f'{int(m.group(3)):04d}-{month:02d}-{int(m.group(1)):02d}T'
                                 f'{int(m.group(4)):02d}:{m.group(5)}')
            elif line != label and found and not place:
                place = line
        for when in found:
            out.append((label, when, place))
    return out


def credits_from_group(html, *, opera=False):
    """'Dirigent<br><strong>Name</strong>' pairs and bold-only lines (the orchestra, a choir
    with 'Leitung: Name' below)."""
    out = []
    for para in re.findall(r'<p[^>]*>(.*?)</p>', html or '', re.S):
        lines = re.split(r'<br\s*/?>', para)
        i = 0
        while i < len(lines):
            line = lines[i]
            text = clean(line)
            bold = re.fullmatch(r'\s*(?:<a [^>]*>)?\s*<strong>(.*?)</strong>\s*(?:</a>)?\s*', line, re.S)
            if not text or re.search(r'bekannt gegeben|statisterie', text, re.I):
                i += 1
                continue
            if bold:                                        # a group or a person without a role
                c = credit('', clean(bold.group(1)), opera=opera)
                if c:
                    out.append(c)
            elif i + 1 < len(lines) and re.search(r'<strong>', lines[i + 1]):
                c = credit(text, clean(lines[i + 1]), opera=opera)        # 'Klarinette' + '<strong>Name'
                if c:
                    out.append(c)
                i += 1
            else:
                m = re.match(r'^(Leitung|Musikalische Leitung|Dirigent(?:in)?)\s*:\s*(.+)$', text)
                if m and out and out[-1][0] == 'Choir':
                    pass                                    # the chorus master: not a performer here
                elif m:
                    c = credit(m.group(1), m.group(2), opera=opera)
                    if c:
                        out.append(c)
            i += 1
    return out


def _venue(place):
    p = clean(place)
    low = p.lower()
    if low.startswith('festspielhaus'):
        return f'Festspielhaus Bregenz{p[len("Festspielhaus"):]}'
    if low.startswith('seebühne'):
        return 'Seebühne Bregenz'
    if low.startswith('werkstattbühne'):
        return f'Festspielhaus Bregenz, {p}'
    return p or 'Bregenzer Festspiele'


def fetch():
    today = today_zurich()
    links = menu_links(get(HOME))[:MAX_PAGES]                # FetchError propagates
    log.info('%s: %d production page(s) in the menu', KEY, len(links))
    events = []
    for link in links:
        try:
            prod = production(get(BASE + link))
        except FetchError as err:
            log.warning('%s %s: %s', KEY, link, err)
            continue
        if not prod or not prod['title'] or _SKIP_TITLE.search(prod['title']):
            continue
        opera = link.startswith('/de/oper')
        groups = prod['groups']
        program, credits = [], []
        for label, html in groups:
            low = label.lower()
            if 'programm' in low:
                program += program_from_html(html)
            elif 'besetzung' in low or 'leading team' in low or 'mitwirkende' in low:
                credits += credits_from_group(html, opera=opera)
        credits = order_credits(credits)
        title = prod['title']
        if not opera and prod['subtitle']:
            title = f'{prod["subtitle"]} | {title}'
        if opera and prod['subtitle'] and not program:
            program = [(prod['subtitle'], prod['title'])]
        kind = 'vocal-opera' if opera else (infer_type(title, credits, program) or 'orchestral')
        series = prod['section'] if prod['section'] and prod['section'].lower() not in ('startseite',) else None
        for label, when, place in dates_from_info(prod['info']):
            if re.search(r'probe|einführung', label, re.I):
                continue
            day = datetime.strptime(when[:10], '%Y-%m-%d').date()
            if not 0 <= (day - today).days <= WINDOW_DAYS:
                continue
            try:
                events.append(make_event(
                    KEY, f'{prod["id"] or link.rsplit("/", 1)[-1]}-{when.replace("-", "").replace(":", "").replace("T", "")}',
                    title, to_zurich_iso(when, assume=TZ), city=CITY, venueName=_venue(place), type=kind,
                    series=series, credits=credits, program=program, ticketUrl=None, url=BASE + link,
                    status='cancelled' if looks_cancelled(title) or looks_cancelled(label) else 'scheduled'))
            except ValueError as err:
                log.warning('%s %s: skipped: %s', KEY, link, err)
    return events
