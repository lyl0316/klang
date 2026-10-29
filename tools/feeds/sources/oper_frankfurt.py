"""Oper Frankfurt: operas, Museumskonzerte (Sinfoniekonzerte), chamber music, Liederabende and the
house's other concerts from its own Spielplan (HTML).

    https://oper-frankfurt.de/de/spielplan/                          this month from today, month slider
    https://oper-frankfurt.de/de/spielplan/?datum=YYYY-MM&lang=100   one month (robots.txt allows queries)
    https://oper-frankfurt.de/de/spielplan/<slug>/?id_datum=N        one page per performance

A month page lists every performance: the day (the month and year come from the page's
``datum``), the title, the composer of an opera (``<h4>``) or a subtitle, "19.30 Uhr,
Opernhaus" and labels (Premiere, Restkarten …). ``id_datum`` is the performance id. The
performance page ("Ihre Auswahl") repeats date, start, duration ("ca. 3 Std., inkl. 1 Pause")
and place, and has that evening's cast ("Besetzung": ``<dt>role</dt><dd>name</dd>``, opera
singers listed by character, the orchestra/choir as a plain line below) and, for concerts, the
programme (``<p><strong>Composer</strong> 1756–1791<br>Work</p>``). Only these facts are
taken, never descriptions or press quotes.

Performance pages cost one request each and are read incrementally: a performance that the
previous feed already has with details read from its page (same id and start) keeps them. The
requests left after the ~10 month pages (cap 150) go to performances not read yet, nearest
first, then to those playing in the next 14 days and a fixed share of the others (each about
every two weeks), to pick up cast changes. On 29 Oct 2026: 186 performances; a first run reads
140 pages (150 requests, ~4 min), later runs about 40 requests (~1 min). A performance not
read yet is listed with the month page's facts (title, composer and opera as programme, place,
time; the singers of a Liederabend from its title). Opera singers are credited with their
character as the role ("Ottone", "Amelia"), as the site gives no voice types.

Checked against the website on 29 Oct 2026: month pages Oct 2026 – Jun 2027 (July empty); the
landing page shows this month from today and runs on into the next one without saying so, so
every month is read from its ``?datum=`` page and a day lower than the one before moves on a month;
times are local Frankfurt time; Liederabend titles are "Name (Stimmfach) / Name (Klavier)";
the Kammermusik entries all have the title "Kammermusik", so the subtitle is added ("Kammermusik
– Zwei Oktette"); the Sinfoniekonzerte (Museumskonzerte) play in the Alte Oper Frankfurt, which
the site names without a hall. A Liederabend's programme is only a linked PDF (not read).
Impressum: layout, graphics, images and texts are protected by copyright; Klang republishes
facts only (date, time, title, place, performers, works, links back). No AGB clause on
automated reading.

Skipped: guided tours (Führungen), workshops, Oper für Kinder, Opernkarussell, family
workshops, child care (Kinderbetreuung), Sneak in / Opera Next Level (youth visits),
Oper extra / Oper im Dialog (introductions, talks), Friedman in der Oper (talks), Flutlicht
(football screening), the Silvesterfeier (party) and events meeting at a "Treffpunkt".
"""
from __future__ import annotations

import re
import urllib.parse
from datetime import datetime, timedelta

from common import (BudgetExceeded, FetchError, clean, event_id, get, log, looks_cancelled, make_event,
                    previous_event, refresh_due, requests_left, to_zurich_iso, today_zurich)

from ._consent import group_role, role_en, strip_life_dates

KEY = 'oper_frankfurt'
NAME = 'Oper Frankfurt'
SITE = 'https://oper-frankfurt.de/'
ATTRIBUTION = 'Source: Oper Frankfurt (oper-frankfurt.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 150             # ~10 month pages, the rest for performance pages
TIME_LIMIT = 900
REFRESH_NEAR_DAYS = 14         # performance pages this close are read again every run
REFRESH_EVERY_DAYS = 14        # the others again about every two weeks (common.refresh_due)
WINDOW_DAYS = 450
MAX_MONTHS = 16

BASE = 'https://oper-frankfurt.de'
LISTING = BASE + '/de/spielplan/'
MONTH = LISTING + '?datum={ym}&lang=100'
CITY = 'Frankfurt'
TZ = 'Europe/Berlin'

_VENUES = {
    'opernhaus': 'Oper Frankfurt, Opernhaus',
    'holzfoyer': 'Oper Frankfurt, Holzfoyer',
}

_SKIP_RE = re.compile(
    r'f[üu]hrung|workshop|kinderbetreuung|oper extra|oper im dialog|oper f[üu]r kinder|opernkarussell|'
    r'opera next level|sneak in|friedman in der oper|flutlicht|silvester|gespr[äa]ch|lesung|familien|'
    r'zukunftsbilder|br[üu]che\.|kinderkonzert|probe\b', re.I)
_KIDS_RE = re.compile(r'f[üu]r kinder|f[üu]r junge menschen|von \d+ bis \d+ jahren', re.I)
# subtitle lines that are sales notes, not part of the title
_NOTE_RE = re.compile(r'^(?:vorverkauf|verkauf nur|der eintritt|eintritt|anschlie(?:ß|ss)end|kostenlos|'
                      r'f[üu]r kinder|f[üu]r junge|zum letzten|wieder im|anmeldung)', re.I)
_VOICE_TITLE_RE = re.compile(r'\((?:sopran|mezzosopran|alt|tenor|bariton|bass|bassbariton|countertenor)\)', re.I)


# ---------------------------------------------------------------------------
# month pages
# ---------------------------------------------------------------------------

def _lines(fragment):
    """'<span>A<br>B <em>C</em><br></span>' -> ['A', 'B C']."""
    parts = re.split(r'(?i)<br\s*/?>', fragment or '')
    return [x for x in (clean(p) for p in parts) if x]


def _page_month(page_html):
    """(year, month) of a month page: the active slider entry."""
    m = re.search(r'<li class="active"><a href="\?datum=(\d{4})-(\d{2})', page_html or '')
    return (int(m.group(1)), int(m.group(2))) if m else None


def _months(page_html):
    return list(dict.fromkeys(re.findall(r'href="\?datum=(\d{4}-\d{2})&', page_html or '')))


def parse_month(page_html):
    """-> list of entry dicts from one month page."""
    ym = _page_month(page_html)
    if not ym:
        return []
    out, (year, month), last_day = [], ym, 0
    for chunk in re.split(r'<div class="repertoire-element', page_html)[1:]:
        chunk = chunk.split('<p class="repertoire-button-top')[0]
        href = re.search(r'<a href="([^"]*id_datum=(\d+))"', chunk)
        day = re.search(r'class="col col-date[^"]*">\s*\w*\s*<span>(\d{1,2})</span>', chunk)
        title = re.search(r'<h3>(.*?)</h3>', chunk, re.S)
        meta = re.search(r'<span class="meta">(.*?)</span>', chunk, re.S)
        if not (href and day and title and meta):
            continue
        h4 = re.search(r'</h3>\s*<h4>(.*?)</h4>', chunk, re.S)
        sub = re.search(r'</h3>\s*<div>(.*?)</div>', chunk, re.S)
        pre = re.search(r'<strong class="u-upper">(.*?)</strong>', chunk, re.S)
        tm = re.match(r'\s*(\d{1,2})[.:](\d{2})\s*Uhr\s*,?\s*(.*)$', clean(meta.group(1)))
        labels = [clean(x) for x in re.findall(r'<span class="label[^"]*">(.*?)</span>', chunk, re.S)]
        ticket = re.search(r'<a href="(https?://[^"]+)"[^>]*target="ticketing"', chunk)
        if int(day.group(1)) < last_day:               # the list ran on into the next month
            year, month = (year + 1, 1) if month == 12 else (year, month + 1)
        last_day = int(day.group(1))
        out.append({
            'id': href.group(2),
            'url': urllib.parse.urljoin(LISTING, clean(href.group(1))),
            'date': (year, month, int(day.group(1))),
            'time': (int(tm.group(1)), int(tm.group(2))) if tm else None,
            'place': clean(tm.group(3)) if tm else clean(meta.group(1)),
            'title': ' '.join(_lines(title.group(1))),
            'composer': clean(h4.group(1)) if h4 else '',
            'sub': _lines(sub.group(1)) if sub else [],
            'pre': clean(pre.group(1)) if pre else '',
            'labels': [x for x in labels if x],
            'ticket': clean(ticket.group(1)) if ticket else None,
        })
    return out


# ---------------------------------------------------------------------------
# performance pages
# ---------------------------------------------------------------------------

_MONTHS_DE = {'januar': 1, 'februar': 2, 'märz': 3, 'maerz': 3, 'april': 4, 'mai': 5, 'juni': 6, 'juli': 7,
              'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'dezember': 12}
_LIFE_DATES_RE = re.compile(r'^\s*(?:\*\s*)?\d{3,4}\s*(?:[–—-]\s*\d{0,4})?\s*$|^\s*geb\.\s*\d{4}')
_CATALOGUE_RE = re.compile(r'\b(?:op\.|opus|KV|BWV|D|Hob\.|HWV|RV|WoO|Wq|BuxWV|TWV|S\.|Sz\.|JW)\s*\d|'
                           r'\b(?:Nr\.|No\.)\s*\d|[A-H](?:is|es|s)?-(?:Dur|Moll|dur|moll)\b')
_WORK_NOTE_RE = re.compile(r'^(?:\(|arrangement|bearbeitung|verbindende|zusammenstellung|text\b|nach\b|'
                           r'orchestriert|instrumentiert|uraufführung|deutsche erstaufführung)', re.I)


def _duration(text):
    t = clean(text).lower()
    for frac, dec in (('½', '.5'), ('¾', '.75'), ('¼', '.25')):
        t = t.replace(' ' + frac, dec).replace(frac, dec)
    t = re.split(r'inkl|pause|nach|,|hausöffnung', t)[0]       # "ca. 3 Std., inkl. 1 Pause nach 1 Std. 25 Min."
    h = re.search(r'(\d*(?:[.,]\d+)?)\s*std', t)
    m = re.search(r'(\d+)\s*min', t)
    if not h and not m:
        return None
    hours = h.group(1).replace(',', '.') if h else ''
    total = (float(hours) * 60 if hours and hours != '.' else 0) + (int(m.group(1)) if m else 0)
    return int(total) or None


def _cast_role(dt):
    """English role for a cast line's label; '' for off-stage; a character name stays as it is."""
    label = clean(dt).strip(' :')
    low = label.lower()
    if re.match(r'chor(?:leitung|einstudierung)', low):
        return 'Chorus master'
    if re.match(r'tänzer|tanz\b|tänzerin', low):
        return 'Dancer'
    if 'szenische leitung' in low or 'spielleitung' in low or 'regieassistenz' in low:
        return ''
    if re.match(r'musikalische leitung|dirigent', low):
        return 'Conductor'                              # "Musikalische Leitung, Cembalo"
    role = role_en(label)
    if role is None:                                    # an opera character ("Ottone", "Ehefrau",
        return label.split(',')[0].strip()[:60] or 'Performer'   # "Elias Heuziger, ein herzkranker Junge")
    return role


def parse_detail(page_html):
    """-> {'date': (y, m, d) | None, 'time': (h, m) | None, 'duration', 'place',
           'credits': [(role, name)], 'works': [(composer, title)]}."""
    h = page_html or ''
    out = {'date': None, 'time': None, 'duration': None, 'place': '', 'credits': [], 'works': []}
    info = re.search(r'id="infodata"(.*?)</section>', h, re.S)
    if info:
        pairs = re.findall(r'<dt>(.*?)</dt>\s*<dd>(.*?)</dd>', info.group(1), re.S)
        for dt, dd in pairs:
            label, value = clean(dt).lower(), clean(dd)
            dm = re.match(r'(\d{1,2})\.\s*([A-Za-zäÄ]+)\s+(\d{4})$', value)
            if dm and dm.group(2).lower() in _MONTHS_DE:
                out['date'] = (int(dm.group(3)), _MONTHS_DE[dm.group(2).lower()], int(dm.group(1)))
            elif label == 'beginn':
                tm = re.match(r'(\d{1,2})[.:](\d{2})', value)
                if tm:
                    out['time'] = (int(tm.group(1)), int(tm.group(2)))
            elif label == 'dauer':
                out['duration'] = _duration(value)
            elif label == 'ort':
                out['place'] = value
    cast = re.search(r'id="castdata"(.*?)</section>', h, re.S)
    if cast:
        body = cast.group(1)
        for dt, dd in re.findall(r'<dt>(.*?)</dt>\s*<dd>(.*?)</dd>', body, re.S):
            role = _cast_role(dt)
            if not role:
                continue
            dd = re.sub(r'<span class="deg">.*?</span>', '', dd)
            for name in re.split(r'\s*/\s*', clean(dd)):
                name = name.strip(' ,;°*')
                if name and not re.match(r'(?i)n\.?\s*n\.?$|tba$', name):
                    # "Chor: Giulio Ferré" names the chorus master, the choir itself is a line below
                    r = 'Chorus master' if role == 'Choir' and not group_role(name) else role
                    if r == 'Orchestra' and group_role(name) == 'Ensemble':
                        r = 'Ensemble'                  # "Orchester: Ensemble Modern"
                    out['credits'].append((r, name))
        for p in re.findall(r'<p>(.*?)</p>', body, re.S):
            for line in _lines(re.sub(r'<span class="deg">.*?</span>', '', p)):
                g = group_role(line)
                if g and len(line) < 80 and not re.search(r'mitglied des|spielt auf|instrumente', line, re.I):
                    out['credits'].append((g, line))
    out['works'] = parse_works(h)
    return out


def parse_works(page_html):
    """Programme lines of a concert page: a paragraph that starts with the composer in bold
    followed by the life dates, then the work(s) on the next line(s)."""
    m = re.search(r'veranstaltung-detail textpage"(.*?)(?:<section class="partner-logos"|<aside)', page_html or '', re.S)
    if not m:
        return []
    works = []
    for p in re.findall(r'<p>(.*?)</p>', m.group(1), re.S):
        head = re.match(r'\s*<strong>(.*?)</strong>(.*?)(?:<br\s*/?>|$)(.*)', p, re.S)
        if not head:
            continue
        composer, dates = clean(head.group(1)), clean(head.group(2))
        if not composer or not _LIFE_DATES_RE.match(dates or ''):
            continue
        composer = strip_life_dates(composer)
        lines = [ln for ln in _lines(head.group(3)) if not _WORK_NOTE_RE.match(ln)]
        titles = []
        for ln in lines:
            if not titles:
                titles.append(ln)
            elif ln.lower().startswith('aus:') or titles[-1].endswith(':') or \
                    (_CATALOGUE_RE.search(ln) and not _CATALOGUE_RE.search(titles[-1])):
                titles[-1] = f'{titles[-1]} {ln}' if titles[-1].endswith(':') or ln.lower().startswith('aus:') \
                    else f'{titles[-1]} – {ln}'
            elif _CATALOGUE_RE.search(ln) and _CATALOGUE_RE.search(titles[-1]):
                titles.append(ln)                       # a second work of the same composer
        if not titles:
            works.append((composer, ''))
        for t in titles:
            works.append((composer, re.sub(r'\s+', ' ', t).strip(' ,')))
    return works


# ---------------------------------------------------------------------------
# entries -> candidates
# ---------------------------------------------------------------------------

def _venue(place):
    p = clean(place)
    return _VENUES.get(p.lower(), p)


def _sub_text(entry):
    return ' '.join(x for x in entry['sub'] if not _NOTE_RE.match(x))


def _classify(e):
    """-> (title, type, series, listing credits, listing programme) or None to skip."""
    title, sub, comp = e['title'], _sub_text(e), e['composer']
    if _SKIP_RE.search(title) or _SKIP_RE.search(e['pre']) or re.match(r'(?i)treffpunkt', e['place']):
        return None
    if _KIDS_RE.search(' '.join(e['sub'])) and not comp:
        return None
    if comp:                                           # an opera: "<h3>Ottone</h3><h4>Händel</h4>"
        composers = [c.strip() for c in re.split(r'\s+[-–/&]\s+|\s+und\s+', comp) if c.strip()]
        program = [(composers[0], title)] if len(composers) == 1 else [(c, '') for c in composers]
        return title, 'vocal-opera', None, [], program
    low = title.lower()
    if 'sinfoniekonzert' in low or 'museumskonzert' in low:
        return title, 'orchestral', 'Museumskonzert', [('Orchestra', 'Frankfurter Opern- und Museumsorchester')], []
    if low.strip() == 'kammermusik':
        return (f'Kammermusik – {sub}' if sub else 'Kammermusik'), 'chamber', 'Kammermusik', [], []
    if _VOICE_TITLE_RE.search(title):                  # "Kelsey Lauritano (Mezzosopran) / Alden Gatt (Klavier)"
        credits = []
        for name, role in re.findall(r'([^/()]+?)\s*\(([^)]+)\)', title):
            credits.append((role_en(role) or 'Performer', name.strip(' /')))
        return title, 'recital', 'Liederabend', credits, []
    if low.startswith('happy new ears'):
        return (f'Happy New Ears – {sub}' if sub else title), None, 'Happy New Ears', [], []
    if low.startswith('oper to go'):
        return (f'{title} – {sub}' if sub else title), 'vocal-opera', 'Oper to go', [], []
    if low.startswith('soiree des opernstudios'):
        return title, 'vocal-opera', 'Opernstudio', [], []
    if low.startswith('intermezzo'):
        return title, None, 'Intermezzo', [], []
    return (f'{title} – {sub}' if sub and len(sub) < 80 else title), None, None, [], []


def _start(date, time):
    y, m, d = date
    return to_zurich_iso(datetime(y, m, d, time[0], time[1]), assume=TZ)


def _prepare(entries):
    today = today_zurich()
    last = today + timedelta(days=WINDOW_DAYS)
    out, skipped = [], {}
    for e in entries:
        what = _classify(e)
        if what is None:
            skipped['not a concert'] = skipped.get('not a concert', 0) + 1
            continue
        if not e['time']:
            skipped['no time'] = skipped.get('no time', 0) + 1
            continue
        try:
            day = datetime(*e['date']).date()
        except ValueError:
            continue
        if not today <= day <= last:
            continue
        title, kind, series, credits, program = what
        out.append({'e': e, 'id': e['id'], 'title': title, 'type': kind, 'series': series,
                    'credits': list(credits), 'program': list(program), 'start': _start(e['date'], e['time']),
                    'venue': _venue(e['place']), 'duration': None, 'detailed': False, 'reused': False,
                    'cancelled': looks_cancelled(e['title']) or any(looks_cancelled(x) for x in e['labels'] + e['sub'])})
    if skipped:
        log.info('%s: skipped %s', KEY, ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    return out


def _reuse(cands):
    for c in cands:
        prev = previous_event(event_id(KEY, c['id']), c['start'])
        if not prev or not (prev.get('durationMin') or len(prev.get('credits') or []) > len(c['credits'])):
            continue                                    # never read from its page
        c['credits'] = [(x.get('role'), x.get('name')) for x in prev.get('credits') or [] if x.get('name')]
        works = [(p.get('composer') or '', p.get('title') or '') for p in prev.get('program') or []]
        if works:
            c['program'] = works
        c['duration'] = prev.get('durationMin')
        c['reused'] = True


def _apply(c, d):
    c['detailed'] = True
    if d['date'] and d['time'] and d['date'] == c['e']['date'] and d['time'] != c['e']['time']:
        log.info('%s %s: listing says %s, page says %s; using the page', KEY, c['id'], c['e']['time'], d['time'])
        c['start'] = _start(d['date'], d['time'])
    if d['duration']:
        c['duration'] = d['duration']
    credits = d['credits']
    if c['series'] == 'Museumskonzert' and not any(r == 'Orchestra' for r, _ in credits):
        credits = credits + [('Orchestra', 'Frankfurter Opern- und Museumsorchester')]
    if credits:
        c['credits'] = credits
    if d['works'] and c['type'] != 'vocal-opera':
        c['program'] = d['works']


def _enrich(cands):
    order = []
    for c in cands:
        if not c['reused']:
            order.append((0, c['start'], c))
        elif refresh_due(c['id'], c['start'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            order.append((1, c['start'], c))
    order.sort(key=lambda x: (x[0], x[1]))
    read = 0
    for _, _, c in order:
        if requests_left() <= 0:
            break
        try:
            d = parse_detail(get(c['e']['url']))
        except BudgetExceeded as err:
            log.warning('%s: stopped reading performance pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: performance page failed: %s', KEY, c['id'], err)
            continue
        read += 1
        _apply(c, d)
    log.info('%s: %d performance page(s) read, %d reused, %d of %d still without details', KEY, read,
             sum(1 for c in cands if c['reused'] and not c['detailed']),
             sum(1 for c in cands if not c['reused'] and not c['detailed']), len(cands))


def fetch():
    # The landing page shows the current month from today on and runs on into the next month;
    # every month (the current one too) is read from its own page, so each day has its month.
    first = get(LISTING)                                # FetchError -> build.py reuses yesterday
    entries, seen_months = [], set()
    for ym in _months(first)[:MAX_MONTHS]:
        if ym in seen_months:
            continue
        seen_months.add(ym)
        try:
            entries += parse_month(get(MONTH.format(ym=ym)))
        except BudgetExceeded:
            break
        except FetchError as err:
            log.warning('%s: month %s failed: %s', KEY, ym, err)
    if not entries:
        raise FetchError(LISTING, 'no performances found (layout changed?)')
    unique = {}
    for e in entries:
        unique.setdefault(e['id'], e)
    cands = _prepare(unique.values())
    _reuse(cands)
    _enrich(cands)
    events = []
    for c in cands:
        e = c['e']
        try:
            events.append(make_event(
                KEY, c['id'], c['title'], c['start'], city=CITY, venueName=c['venue'], type=c['type'],
                series=c['series'], credits=c['credits'], program=c['program'], durationMin=c['duration'],
                ticketUrl=e['ticket'], url=e['url'], status='cancelled' if c['cancelled'] else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, c['id'], err)
    return events
