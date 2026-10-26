"""Casino Bern: classical concerts from the hall's own culture programme.

    https://www.casinobern.ch/kulturprogramm/          one request: every event date of the season
    https://www.casinobern.ch/programm/<slug>/         one request per event page: start time,
                                                       room, ticket link, artists and works

The programme list gives dates (no times), titles, the promoter and a category. Each event
page lists its performances ("plays") with door time, start, approximate end and room, then
"Künstler*innen" ("Name, Rolle") and "Programm" (composer with life dates, then works).
Only those facts are taken; the promoters' texts are never copied. The event JSON-LD shows
only the first performance and labels Swiss time as +0000, so it is not used.

Casino Bern hosts many promoters. Kept: concerts with classical evidence on the event page
(works with composers, or a conductor / orchestra / instrumental or vocal soloists).
Skipped before any page is fetched: film-music and pop/rock shows, open rehearsals, family
concerts, talks and items without a concert category or classical keyword.

robots.txt asks for ``Crawl-Delay: 10`` on a line before the ``User-agent`` group, which
common.get() does not apply; this reader keeps 10 s between its own requests itself.

The site's terms ask for consent before its content is reproduced. Klang republishes
facts only (date, time, title, room, performers, works, links back).
"""
from __future__ import annotations

import html as _html
import re
import urllib.parse
from datetime import datetime, timedelta

from common import (BudgetExceeded, FetchError, clean, get, guess_type, log, looks_cancelled, make_event,
                    requests_left, to_zurich_iso, today_zurich)

from ._consent import (Spacer, fold, group_role, has_life_dates, looks_like_person, role_en, strip_life_dates,
                       strip_minutes)

KEY = 'casino_bern'
NAME = 'Casino Bern'
SITE = 'https://www.casinobern.ch/'
ATTRIBUTION = 'Source: Casino Bern (casinobern.ch). Facts only; details and tickets via casinobern.ch.'
KIND = 'venue'
MAX_REQUESTS = 60
TIME_LIMIT = 900
CRAWL_DELAY = 10

LISTING = 'https://www.casinobern.ch/kulturprogramm/'
CITY = 'Bern'

# shows that are not classical concerts, or not concerts at all (title, subtitles, slug)
_SKIP_RE = re.compile(
    r'film|movie|kino|star wars|game of thrones|house of the dragon|morricone|hans zimmer|john williams|hollywood|'
    r'home alone|harry potter|disney|pop meets|\bpop\b|\brock\b|freddie mercury|\babba\b|beatles|musical\b|'
    r'comedy|kabarett|lesung|vortrag|zeitgedanken|zukunftstag|öffentliche probe|oeffentliche probe|offene probe|'
    r'familienkonzert|kinderkonzert|erlebnistag|brummt|sing ?mit ?uns|singmituns|mitsing|tribute|tanzschule|ball\b|'
    r'gastro|brunch|dinner|silvesterparty|party\b', re.I)
# a list item without the "Konzert" category needs one of these to be looked at
_CLASSICAL_RE = re.compile(
    r'sinfoni|symphon|orchest|philharm|kammer|quartett|quintett|trio\b|chor\b|chor\s|chöre|choir|requiem|messe\b|'
    r'oratori|passion|kantate|mozart|beethoven|bach\b|haydn|schubert|brahms|vivaldi|händel|haendel|strau(ss|ß)|'
    r'rezital|recital|liederabend|klavierabend|klavier|violin|cello|oper\b|opera|klassik|barock|konzert', re.I)
_CLASSICAL_ROLES = {'Conductor', 'Orchestra', 'Choir', 'Ensemble', 'Piano', 'Violin', 'Viola', 'Cello', 'Double bass',
                    'Harp', 'Organ', 'Harpsichord', 'Flute', 'Oboe', 'Clarinet', 'Bassoon', 'Horn', 'Trumpet',
                    'Trombone', 'Soprano', 'Mezzo-soprano', 'Alto', 'Contralto', 'Countertenor', 'Tenor', 'Baritone',
                    'Bass-baritone', 'Bass', 'Fortepiano', 'Guitar', 'Lute', 'Recorder', 'Percussion', 'Timpani'}


# ---------------------------------------------------------------------------
# programme list
# ---------------------------------------------------------------------------

def parse_listing(page_html):
    """-> [{'page', 'date' (date), 'title', 'subtitles', 'categories'}] in page order."""
    out = []
    for m in re.finditer(r'<article data-terms=[^>]*>(.*?)</article>', page_html or '', re.S):
        a = m.group(1)
        link = re.search(r'<header class="title">.*?<a href="([^"#]+)(?:#(\d{2})-(\d{2})-(\d{4}))?"', a, re.S)
        when = re.search(r'<time>\s*\w*,?\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*</time>', a, re.S)
        h4 = re.search(r'<h4>(.*?)</h4>', a, re.S)
        if not link or not (when or link.group(2)) or not h4:
            continue
        if when:
            d, mo, y = int(when.group(1)), int(when.group(2)), int(when.group(3))
        else:
            d, mo, y = int(link.group(2)), int(link.group(3)), int(link.group(4))
        cats = re.search(r'<div class="categories">(.*?)</div>', a, re.S)
        out.append({
            'page': _html.unescape(link.group(1)),
            'date': (y, mo, d),
            'title': clean(h4.group(1)),
            'subtitles': [clean(s) for s in re.findall(r'<span class="event-subtitle">(.*?)</span>', a, re.S) if clean(s)],
            'categories': clean(re.sub(r'<[^>]+>', ' | ', cats.group(1))) if cats else '',
        })
    return out


def is_candidate(item):
    text = ' '.join([item['title']] + item['subtitles'] + [item['page'].rstrip('/').rsplit('/', 1)[-1]])
    if _SKIP_RE.search(text):
        return False
    if re.search(r'konzert', item['categories'], re.I):
        return True
    return bool(_CLASSICAL_RE.search(text))


# ---------------------------------------------------------------------------
# event page
# ---------------------------------------------------------------------------

def _hhmm(text):
    m = re.search(r'(\d{1,2})[:.](\d{2})', text or '')
    return (int(m.group(1)), int(m.group(2))) if m else None


def parse_plays(page_html):
    """-> [{'date': (y, m, d), 'start': (h, m), 'end': (h, m)|None, 'room', 'ticket', 'promoter', 'flags'}]"""
    out = []
    for m in re.finditer(r'<article>\s*<h4[^>]*data-hash="(\d{2})-(\d{2})-(\d{4})"[^>]*>(.*?)</article>',
                         page_html or '', re.S):
        block = m.group(4)
        rows = {clean(k).lower(): v for k, v in re.findall(r'<th>(.*?)</th>\s*<td>(.*?)</td>', block, re.S)}
        start = _hhmm(clean(rows.get('start', '')))
        if not start:
            continue
        end = _hhmm(clean(rows.get('ende ca.', rows.get('ende', ''))))
        ticket = re.search(r'<a[^>]+href="([^"]+)"[^>]*>\s*Tickets\s*</a>', block, re.S)
        label = re.search(r'<span class="add-line">(.*?)</span>', block, re.S)
        out.append({
            'label': clean(label.group(1)) if label else '',
            'date': (int(m.group(3)), int(m.group(2)), int(m.group(1))),
            'start': start, 'end': end,
            'room': clean(rows.get('raum', '')),
            'promoter': clean(rows.get('veranstalter', '')),
            'ticket': _untrack(_html.unescape(ticket.group(1))) if ticket else None,
            'flags': clean(block),
        })
    return out


def _untrack(url):
    """Drop analytics parameters (_gl, gclid, utm_* …) that some promoters' ticket links carry."""
    parts = urllib.parse.urlsplit(url)
    if not parts.query:
        return url
    keep = [(k, v) for k, v in urllib.parse.parse_qsl(parts.query, keep_blank_values=True)
            if not re.match(r'(?i)^(_gl|_ga|gclid|fbclid|utm_\w+|ref2?|mc_\w+)$', k)]
    return urllib.parse.urlunsplit(parts._replace(query=urllib.parse.urlencode(keep)))


def _sections(page_html):
    """{heading text: html until the next h2} for the editorial blocks of an event page."""
    out = {}
    parts = re.split(r'<h2[^>]*class="wp-block-heading"[^>]*>(.*?)</h2>', page_html or '', flags=re.S)
    for i in range(1, len(parts) - 1, 2):
        head = clean(parts[i])
        body = parts[i + 1]
        cut = re.search(r'<footer|class="cabe-highlights|Kulturprogramm Highlights|<h2', body)
        out.setdefault(head, body[:cut.start()] if cut else body)
    return out


def _lines(fragment):
    text = re.sub(r'\s+', ' ', fragment or '')
    text = re.sub(r'(?is)<figure.*?</figure>', ' ', text)
    text = re.sub(r'(?i)<br\s*/?>|</p>|</li>|</h[3-6]>', '\n', text)
    return [clean(x) for x in text.split('\n') if clean(x)]


def _split_names(text):
    return [n.strip() for n in re.split(r'\s*(?:,|\bund\b|&|/)\s*', text) if n.strip()]


def _bad_name(name):
    return bool(re.search(r'\*|^name\b|tba\b|n\.\s?n\.|folgt|\d', name, re.I))


def parse_artists(fragment):
    """'Krzysztof Urbański, Dirigent' lines -> [(role, name)]."""
    credits = []
    for line in _lines(fragment):
        if len(line) > 160 or re.search(r'[©®]|\bfoto\b|\bphoto\b', line, re.I):
            continue
        m = re.match(r'^(.+)\s*(?:,|–|—| - )\s*([^,–—]+)$', line)          # 'Name, Rolle' (last comma)
        if m:
            a, b = m.group(1).strip(' ,'), m.group(2).strip()
            r = role_en(b)
            if r is not None:
                if r:
                    for n in ([a] if r in ('Orchestra', 'Choir', 'Ensemble') else _split_names(a)):
                        if not _bad_name(n) and looks_like_person(n, max_words=8):
                            g = group_role(n)
                            credits.append((g if r in ('Orchestra', 'Choir', 'Ensemble') and g else r, n))
                continue
        if m and role_en(m.group(1)) and role_en(m.group(2)) is None \
                and looks_like_person(m.group(2).strip(), max_words=6):          # 'Orchester, Name'
            r = role_en(m.group(1))
            name = m.group(2).strip()
            g = group_role(name)
            credits.append((g if r in ('Orchestra', 'Choir', 'Ensemble') and g else r, name))
            continue
        m = re.match(r'^([^:]{2,40}):\s*(.+)$', line)                          # 'Leitung: Name, Name'
        if m:
            r = role_en(m.group(1))
            if r:
                for n in _split_names(m.group(2)):
                    if not _bad_name(n) and looks_like_person(n, max_words=6):
                        credits.append((r, n))
                continue
        gm = re.match(r'(?i)^(?:musizierende\s+)?([^:]{2,30}):\s*(.+)$', line)       # 'Vokalensemble: tempo d'affetto'
        if gm and group_role(gm.group(1)) and not role_en(gm.group(1)) and len(gm.group(2)) <= 60:
            credits.append((group_role(gm.group(1)), gm.group(2).strip()))
            continue
        g = group_role(line)
        if g and len(line) <= 80 and not line.endswith('.') and not _bad_name(line):
            parts = re.split(r'\s+&\s+', line)
            if len(parts) > 1 and all(group_role(x) for x in parts):          # 'GAIA Kammerorchester & Vokalensemble X'
                credits += [(group_role(x), x) for x in parts]
            else:
                credits.append((g, line))
    # 'Vokalensemble tempo d'affetto' and 'tempo d'affetto' are the same group
    groups = [n for r, n in credits if r in ('Orchestra', 'Choir', 'Ensemble')]
    return [(r, n) for r, n in credits if r not in ('Orchestra', 'Choir', 'Ensemble') or
            not any(o != n and fold(o).endswith(' ' + fold(n)) for o in groups)]


_LIFE_SPAN_RE = re.compile(r'\(\s*(?:\*\s*(\d{4})|(\d{4})\s*[-–—]\s*(\d{4}|heute|today|present))\s*\)', re.I)


def is_composer_head(line):
    """'Johannes Brahms (1833–1897)', 'Beat Furrer (*1956)', 'A (1910-1991) & B (1907-2007)'."""
    spans = list(_LIFE_SPAN_RE.finditer(line or ''))
    if not spans:
        return False
    for m in spans:
        if m.group(2) and m.group(3).isdigit() and not 15 <= int(m.group(3)) - int(m.group(2)) <= 110:
            return False                                   # '(1854–1859)' is a composition period
    name = re.sub(r'\s+,', ',', strip_life_dates(line)).strip(' ,')
    if not name:
        return False
    for part in re.split(r'\s*(?:&|,|/|\bund\b)\s*', name):
        # each composer is a name: 'Ludwig van Beethoven', not 'Schweizer Volksmusik aus der Sammlung von …'
        if not looks_like_person(part, max_words=5) or \
                any(w[:1].islower() and w not in _PARTICLES for w in part.split()):
            return False
    return True


_PARTICLES = {'van', 'von', 'de', 'da', 'di', 'du', 'la', 'le', 'del', 'della', 'der', 'den', 'ten', 'ter', 'y',
              'e', 'des', 'dos', 'das', 'zu', "d'", 'bin', 'al', 'el'}
_KEY_START_RE = re.compile(r'^(?:[A-Ha-h](?:is|es|s)?-(?:Dur|Moll|dur|moll)\b|op\.\s*\d|KV\s*\d|BWV\s*\d|Hob\.)')
_CONT_RE = re.compile(r'(?i)(\bvon|\bund|\bby|\bnach|\bfür|\bf[üu]r|\baus|\bmit|\bde|\bet|\band|,|:|–|-)$')
_NOTE_RE = re.compile(r'(?i)^(pause|ende|dauer|zugabe|programm|änderung|ca\.|konzert mit|apéro|weitere|arr\.|bearb|'
                      r'instrumentiert|für |aus:|uraufführung|auftragswerk|traditional|solist)|vorbehalten|'
                      r'stunden|minuten')
_MOVEMENT_RE = re.compile(r'(?i)^(?:[IVX]+\.|\d+\.)\s|^(allegro|andante|adagio|presto|largo|moderato|scherzo|finale|'
                          r'menuett|menuetto|rondo|vivace|lento|grave|allegretto|andantino|larghetto|introitus|kyrie|'
                          r'gloria|credo|sanctus|benedictus|agnus dei|sequenz|offertorium|communio|lacrimosa|'
                          r'dies irae|intermezzo|tempo di)\b[^«»]{0,40}$')


def _paragraphs(fragment):
    text = re.sub(r'\s+', ' ', fragment or '')
    text = re.sub(r'(?is)<figure.*?</figure>', ' ', text)
    out = []
    for para in re.split(r'(?i)</p>|</li>|</ul>|</h[3-6]>', text):
        lines = [clean(x) for x in re.split(r'(?i)<br\s*/?>', para) if clean(x)]
        if lines:
            out.append(lines)
    return out


def parse_program(fragment):
    """Paragraphs that start with 'Composer (1833–1897)' and list works -> [(composer, work)].
    Anything else (traditional pieces, notes, prose, movement lists) is left out."""
    program = []
    for lines in _paragraphs(fragment):
        head = lines[0]
        if not is_composer_head(head):
            continue
        composer = re.sub(r'\s+,', ',', strip_life_dates(head)).strip(' ,')
        prev = None
        for line in lines[1:]:
            if is_composer_head(line):                      # the next composer in the same paragraph
                composer, prev = re.sub(r'\s+,', ',', strip_life_dates(line)).strip(' ,'), None
                continue
            if prev is not None and (_CONT_RE.search(prev) or _KEY_START_RE.match(line)) and \
                    len(prev) + len(line) < 250:
                # 'Eine Nacht auf dem kahlen Berge (1867), vervollständigt und orchestriert von'
                # + 'Nikolai Rimski-Korsakow (1886) (14′)'
                c, w = program[-1]
                program[-1] = (c, f'{prev} {line}')
                prev = program[-1][1]
                continue
            if len(line) > 250 or _NOTE_RE.search(line) or _MOVEMENT_RE.search(line):
                continue
            if len(re.findall(r'[a-zäöüé]{2}[.!?]\s+[A-ZÄÖÜ][a-zäöüé]', line)) >= 2:
                continue                                    # a sentence, not a work title
            program.append((composer, line))
            prev = line
    program = [(c, _work(t)) for c, t in program]
    return [(c, t) for c, t in program if t]


def _work(text):
    t = strip_minutes(text)
    t = re.sub(r'\s*\((?:\d{4}(?:\s*[-–/]\s*\d{2,4})?|ca\.\s*\d{4}|UA[^)]*)\)\s*$', '', t)
    return strip_minutes(t).strip(' ,;')


def concert_type(title, page_title, credits, program):
    roles = [r.split(' & ')[0] for r, _ in credits]
    works = ' '.join(w for _, w in program)
    if re.search(r'liederabend|lieder ?abend', f'{title} {page_title}', re.I):
        return 'recital'
    if 'Choir' in roles or re.search(r'requiem|\bmesse\b|oratori|passion|kantate|carmina burana|stabat|magnificat',
                                     f'{title} {page_title} {works}', re.I) \
            or re.search(r'\boper\b|\bopera\b|chorkonzert|\bchor\b|choir', f'{title} {page_title}', re.I):
        return 'vocal-opera'
    if 'Orchestra' in roles or 'Conductor' in roles:
        return 'orchestral'
    players = [r for r in roles if r not in ('Presenter', 'Narrator', 'Ensemble')]
    if 'Ensemble' in roles or len(players) >= 3:
        return 'chamber'
    if players:
        return 'recital'
    return guess_type(f'{title} {page_title}')


def is_classical(credits, program, text):
    if program:
        return True
    if any(r.split(' & ')[0] in _CLASSICAL_ROLES for r, _ in credits):
        return True
    return bool(re.search(r'sinfoni|symphon|orchest|philharm|kammermusik|requiem|oratori|rezital|liederabend|'
                          r'strau(ss|ß)|walzer|mozart|beethoven|vivaldi|haydn|schubert|brahms|tschaikowsk|'
                          r'bach\b|händel|chopin|dvo[řr][áa]k|rachmaninow', text, re.I))


def _series(subtitles, promoter):
    for s in subtitles:
        if s and fold(s) != fold(promoter) and len(s) <= 70 and not re.search(r',.*,', s):
            return s
    return None


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def fetch():
    spacer = Spacer(CRAWL_DELAY)
    spacer.wait()
    listing = parse_listing(get(LISTING))           # FetchError -> reuse yesterday's events
    if not listing:
        raise FetchError(LISTING, 'no programme entries found (layout changed?)')
    today = today_zurich()
    items = [i for i in listing if datetime(*i['date']).date() >= today]
    cands = [i for i in items if is_candidate(i)]

    pages, first = [], {}
    for i in cands:
        if i['page'] not in first:
            first[i['page']] = i['date']
            pages.append(i['page'])
    pages.sort(key=lambda p: first[p])

    events, skipped, read = [], {}, 0
    for page in pages:
        if requests_left() <= 0:
            skipped['request cap'] = skipped.get('request cap', 0) + 1
            continue
        try:
            spacer.wait()
            page_html = get(page)
            read += 1
        except BudgetExceeded:
            skipped['request cap'] = skipped.get('request cap', 0) + 1
            continue
        except FetchError as err:
            log.warning('%s: event page failed: %s', KEY, err)
            continue
        sections = _sections(page_html)
        credits, program = [], []
        for head, body in sections.items():
            if re.match(r'(?i)(künstler|kuenstler|mitwirkende|besetzung|interpret|artists)', head):
                credits += parse_artists(body)
            elif re.match(r'(?i)(programm|werke|program)\b', head):
                program += parse_program(body)
        h1 = re.search(r'<h1[^>]*>(.*?)</h1>', page_html, re.S)
        page_title = clean(h1.group(1)) if h1 else ''
        mine = [i for i in cands if i['page'] == page]
        text = ' '.join([page_title] + [i['title'] + ' ' + ' '.join(i['subtitles']) for i in mine])
        if _SKIP_RE.search(page_title) or not is_classical(credits, program, text):
            skipped['not classical'] = skipped.get('not classical', 0) + len(mine)
            continue
        plays = parse_plays(page_html)
        # list items and plays of the same day are in the same order; a play whose list item
        # was not a candidate (e.g. an open rehearsal on the same page) is left out
        by_day = {}
        for i in items:
            if i['page'] == page:
                by_day.setdefault(i['date'], []).append(i)
        slug = page.rstrip('/').rsplit('/', 1)[-1]
        seen_days = {}
        for p in plays:
            day_items = by_day.get(p['date'], [])
            k = seen_days.get(p['date'], 0)
            seen_days[p['date']] = k + 1
            item = day_items[k] if k < len(day_items) else (day_items[0] if day_items else None)
            if datetime(*p['date']).date() < today:
                continue
            if item is not None and not is_candidate(item):
                continue
            if _SKIP_RE.search(re.split(r'Türöffnung|Start\b', p['flags'])[0]):
                continue                                  # the play's own label, e.g. 'öffentliche Probe – …'
            if item is None and _SKIP_RE.search(page_title):
                continue
            title = (item['title'] if item else page_title) or page_title
            if _SKIP_RE.search(title):
                continue
            y, mo, d = p['date']
            start = datetime(y, mo, d, *p['start'])
            end = None
            if p['end']:
                end = datetime(y, mo, d, *p['end'])
                if end <= start:
                    end += timedelta(days=1)
            room = p['room']
            venue = f'Casino Bern, {room}' if room and 'casino' not in fold(room) else (room or 'Casino Bern')
            series = _series(item['subtitles'] if item else [], p['promoter'])
            p_credits, p_program = list(credits), list(program)
            if p['label'] and re.search(r'(?i)musik punkt 10|kurzkonzert', p['label']):
                # a short morning format ('Musik Punkt 10 – Respighis Rom'): only the works by the
                # composers named in its label, without the concerto and its soloists (the page
                # lists the full evening programme)
                lab = fold(p['label'])
                p_program = [(c, w) for c, w in program if fold(c.split()[-1])[:4] in lab and
                             not re.search(r'(?i)konzert f[üu]r|concerto|(klavier|violin|cello)konzert', w)]
                p_credits = [(r, n) for r, n in credits if r in ('Conductor', 'Orchestra', 'Choir', 'Ensemble')]
            if not any(r in ('Orchestra', 'Ensemble', 'Choir') for r, _ in p_credits) and \
                    group_role(p['promoter']) == 'Orchestra':
                p_credits.append(('Orchestra', p['promoter']))      # an orchestra presenting its own concert
            kind = concert_type(title, page_title, p_credits, p_program)
            cancelled = looks_cancelled(f'{title} {p["label"]}')
            try:
                events.append(make_event(
                    KEY, f'{slug}-{start:%Y%m%d-%H%M}', title, to_zurich_iso(start, assume='Europe/Zurich'),
                    end=to_zurich_iso(end, assume='Europe/Zurich') if end else None,
                    city=CITY, venueName=venue, type=kind, series=series, credits=p_credits, program=p_program,
                    url=f'{page}#{d:02d}-{mo:02d}-{y}', ticketUrl=p['ticket'],
                    status='cancelled' if cancelled else None))
            except ValueError as err:
                log.warning('%s: skipped %s: %s', KEY, slug, err)
    log.info('%s: %d list items (%d upcoming, %d candidates), %d event pages read, %d events; skipped %s',
             KEY, len(listing), len(items), len(cands), read, len(events), skipped)
    return events
