"""Società del Quartetto di Milano: its season at the Conservatorio (Sala Verdi, Sala Puccini)
and its other series in Milan (Casa Verdi, Villa Necchi, museums).

    https://www.quartettomilano.it/calendario-eventi/              upcoming events, first 20
    https://www.quartettomilano.it/wp-json/micdrop/v1/get-posts?options[…]   the same list, next pages
    https://www.quartettomilano.it/event-item/<slug>/              one page per event

The calendar's "Prossimi eventi" block (a theme shortcode, 20 per page, ascending) shows day,
month, title and place but no year or time; its "load more" button asks the theme's GET endpoint
(``micdrop/v1/get-posts``) with the block's own ``data-options``, which is what is sent here for
page 2 onwards. Each event page has the facts: "Data: 03/11/2026", "Orario: 20:30" (Milan local
time), "Location: Sala Verdi, Via Conservatorio 12, Milano", the performers ("<strong>Gregor
Meyer</strong> direttore", "<strong>A</strong> e <strong>B</strong> pianoforte") and the
PROGRAMMA tab ("<strong>Brahms</strong><br><em>Neue Liebeslieder op. 65</em>"; composers are often
given by surname only, as on the site).

Event pages are read incrementally (_italy_north.read_pages): an event the previous feed already
has keeps its record unless it is within two weeks or due for its weekly re-read.

Skipped: the educational series (Quartetto Educational), "Incontra l'artista" meetings and open
rehearsals (prova aperta), and events whose page gives no date or time.

Checked against the website on 29 Oct 2026: 20 + 11 upcoming events listed, 28 kept (RIAS
Kammerchor 3 Nov 20:30 Sala Verdi with Gregor Meyer; Trio Philìa 3 Dec 16:30 at Casa Verdi;
Quartetto Ébène 17 Nov 20:30).
"""
from __future__ import annotations

import html as _html
import json
import re
import urllib.parse

from common import FetchError, clean, get, get_json, infer_type, log, looks_cancelled, make_event, to_zurich_iso

from ._italy_north import credit, group_role, nice_name, read_pages, role_en, skip_title

KEY = 'quartetto_milano'
NAME = 'Società del Quartetto di Milano'
SITE = 'https://www.quartettomilano.it/'
ATTRIBUTION = 'Source: Società del Quartetto di Milano (quartettomilano.it)'
KIND = 'venue'                 # a presenter: its concerts are by visiting artists
COUNTRY = 'italy'
MAX_REQUESTS = 70              # 1 calendar + 1-2 list pages + one page per event (~30)
TIME_LIMIT = 600

BASE = 'https://www.quartettomilano.it'
CALENDAR = BASE + '/calendario-eventi/'
MORE = BASE + '/wp-json/micdrop/v1/get-posts'
CITY = 'Milan'
TZ = 'Europe/Rome'
_VENUES = {'sala verdi': 'Conservatorio di Milano, Sala Verdi', 'sala puccini': 'Conservatorio di Milano, Sala Puccini'}
_SKIP = re.compile(r'(?i)incontra l.artista|prova aperta|educational|lezione|conferenza|presentazione')


# ---------------------------------------------------------------------------
# list
# ---------------------------------------------------------------------------

def _links(fragment):
    return [_html.unescape(u) for u in re.findall(r'qodef-e-title-link" href="([^"]+)"', fragment or '')]


def _flat(prefix, value, out):
    if isinstance(value, dict):
        for k, v in value.items():
            _flat(f'{prefix}[{k}]', v, out)
    elif isinstance(value, list):
        for i, v in enumerate(value):
            _flat(f'{prefix}[{i}]', v, out)
    else:
        out.append((prefix, str(value)))


def upcoming():
    page = get(CALENDAR)
    start = page.find('eventi-prossimi&quot;')
    end = page.find('eventi-passati&quot;', start)
    block = page[start:end if end > 0 else len(page)]
    urls = _links(block)
    m = None
    for opts in re.findall(r'data-options="(\{[^"]*\})"', page):
        if 'eventi-prossimi' in opts:
            m = json.loads(_html.unescape(opts))
    if m:
        try:
            last = int(m.get('max_pages_num') or 1)
        except ValueError:
            last = 1
        for n in range(2, min(last, 5) + 1):
            m['next_page'] = str(n)
            pairs = []
            _flat('options', m, pairs)
            pairs.append(('wpml_language', 'it'))
            try:
                data = get_json(f'{MORE}?{urllib.parse.urlencode(pairs)}')
            except FetchError as err:
                log.warning('quartetto_milano: list page %d failed: %s', n, err)
                break
            more = _links(((data or {}).get('data') or {}).get('html', ''))
            if not more:
                break
            urls += more
    return list(dict.fromkeys(urls))


# ---------------------------------------------------------------------------
# event pages
# ---------------------------------------------------------------------------

def _info(h, cls):
    m = re.search(rf'qodef-info--{cls}">.*?qodef-e-info-content">(.*?)</span>', h, re.S)
    return clean(m.group(1)) if m else ''


def _people(fragment):
    """(role, name) pairs from free text like '<strong>A</strong> violino<strong><br>B</strong> viola' or
    '<strong>A</strong>, <strong>B</strong> solisti': each run of bold names takes the role text after it."""
    out = []
    f = re.sub(r'(?is)(<strong[^>]*>)(.*?)(</strong>)',
               lambda m: m.group(1) + re.sub(r'(?i)<br\s*/?>', ' ', m.group(2)) + m.group(3), fragment)
    f = re.sub(r'(?i)<br\s*/?>|</p>|</h\d>', '\n', f)
    for line in f.split('\n'):
        names = []
        for tok in re.split(r'(?is)(<strong[^>]*>.*?</strong>)', line):
            text = clean(tok)
            if tok.lower().startswith('<strong'):
                if text.strip(' ,;&') and text.strip(' ,;&').lower() != 'e':
                    names.append(text.strip(' ,;'))
                continue
            role = re.sub(r'^(?:e|and|&)\s+|^[\s,;&]+', '', text).strip(' ,;')
            if not names or not role or role.lower() in ('e', 'and', '&'):
                continue
            if len(role) < 50 and role_en(role) is not None:
                out += [(role, n) for n in names]
            names = []
        for n in names:                               # bold names with no role after them
            out.append((None, n))
    return [(r, n) for r, n in out if r is not None or group_role(n)]


def _programme(h):
    tab = re.search(r'<div[^>]*class="elementor-tab-content[^"]*"[^>]*>(.*?)</div>', h, re.S)
    works = []
    for para in re.findall(r'<p[^>]*>(.*?)</p>', tab.group(1) if tab else '', re.S):
        m = re.match(r'\s*<strong[^>]*>(.*?)</strong>(.*)$', para, re.S)
        if not m or '€' in para:
            continue
        composer = nice_name(m.group(1))
        for w in re.split(r'(?i)<br\s*/?>', m.group(2)):
            if clean(w):
                works.append((composer, clean(w)))
    return works


def parse_event(html, url):
    h = html or ''
    title = re.search(r'<h1[^>]*>(.*?)</h1>', h, re.S) or re.search(r'<title>(.*?)</title>', h, re.S)
    title = re.sub(r'\s*[•|–-]\s*Quartetto Milano\s*$', '', clean(title.group(1))) if title else ''
    day = re.match(r'(\d\d)/(\d\d)/(\d{4})', _info(h, 'date'))
    time = re.match(r'(\d{1,2})[:.](\d\d)', _info(h, 'time'))
    cat_block = re.search(r'qodef-info--event-types">(.*?)</div>', h, re.S)
    cat_list = [clean(x) for x in re.findall(r'<a [^>]*>(.*?)</a>', cat_block.group(1) if cat_block else '', re.S)]
    cats = ', '.join(c for c in cat_list if not re.match(r'(?i)eventi (prossimi|passati)|highlight', c))
    if not (title and day and time):
        log.info('quartetto_milano: no date/time, skipped: %s', url)
        return []
    if _SKIP.search(title) or _SKIP.search(cats) or _SKIP.search(url) or skip_title(title):
        log.info('quartetto_milano: not a concert, skipped: %s', title)
        return []
    location = _info(h, 'location')
    first = location.split(',')[0].strip()
    venue = _VENUES.get(first.lower(), first or 'Milano')
    city = CITY if re.search(r'(?i)milano|^$', location) or ',' not in location else location.split(',')[-1].strip()
    body = re.search(r'About the tour</p>(.*?)elementor-widget-tabs', h, re.S)
    people = []
    for role, name in _people(body.group(1) if body else ''):
        c = credit(role, name)
        if c:
            people.append(c)
    works = _programme(h)
    ticket = re.search(r'qodef-e-tickets-link[^>]*>\s*<a [^>]*href="([^"]+)"', h)
    local = f'{day.group(3)}-{day.group(2)}-{day.group(1)}T{int(time.group(1)):02d}:{time.group(2)}'
    sid = f"{url.rstrip('/').split('/')[-1]}-{local[:10]}"
    try:
        return [make_event(
            KEY, sid, title, to_zurich_iso(local, assume=TZ), city=city, venueName=venue,
            type=infer_type(title, people, works) or 'chamber',
            series=cats or None,
            credits=people, program=works, ticketUrl=(_html.unescape(ticket.group(1)) if ticket and re.search(r'vivaticket|quartettomilano', ticket.group(1))
                       else url), url=url,
            status='cancelled' if looks_cancelled(title) or looks_cancelled(cats) else 'scheduled')]
    except ValueError as err:
        log.warning('quartetto_milano %s: skipped: %s', sid, err)
        return []


def fetch():
    urls = [u for u in upcoming() if not _SKIP.search(u)]
    log.info('quartetto_milano: %d upcoming events listed', len(urls))
    events, read, reused = read_pages(KEY, urls, parse_event)
    log.info('quartetto_milano: %d event page(s) read, %d reused', read, reused)
    return events
