"""Wiener Staatsoper: opera, ballet and concerts from the house's monthly calendar.

    https://www.wiener-staatsoper.at/kalender/                      this month
    https://www.wiener-staatsoper.at/kalender/2026/november/        one page per month

Each month page lists every performance with the day and "19:00—22:00" (the year is in the
performance's own link: /kalender/detail/<production>/2026-11-12/), composer(s), title,
genre ("Oper", "Ballett", "Konzert", "Kinderoper", "Workshop" ...), hall, and the full cast
of that evening (an off-canvas panel: characters, then the musical and stage team). That is
all Klang needs, so no other page is read (about 10 requests a run). Only the facts are
taken, never the texts. Months are followed as the page links them, up to 450 days ahead.

robots.txt allows every user agent ("Allow: /") and blocks only named AI-training crawlers;
its Cloudflare content signal is search=yes, ai-train=no. Klang is a listing that links back
to each performance and trains no model.

Credits: for an opera the characters with their singers ("Graf Almaviva", name), the
conductor ("Musikalische Leitung"/"Dirigent") and the director ("Inszenierung"); for a
ballet only the conductor (dancers are not musical credits); for a concert the players with
their instrument. The rest of the team (stage, costumes, light, dramaturgy, assistants) is
left out.

Skipped: past performances of this month, children's operas and NEST youth productions for
schools ("Kinderoper", class "school"), workshops, symposia, quizzes, discussions, guided
tours, matinees/introductions ("Matinee zu …"), and ballets with no conductor listed (no
live music).

Checked against the website on 29 Oct 2026 (Otello 29 Oct, Nijinsky 30 Oct, L'Orfeo 31 Oct,
Solokonzert 12 Nov ...).
"""
from __future__ import annotations

import html as _html
import re
from datetime import date, timedelta

from common import BudgetExceeded, FetchError, clean, get, infer_type, log, looks_cancelled, make_event, today_zurich

from ._vienna import CITY, credit, fold, local_iso, order_credits, role

KEY = 'wiener_staatsoper'
NAME = 'Wiener Staatsoper'
SITE = 'https://www.wiener-staatsoper.at/'
ATTRIBUTION = 'Source: Wiener Staatsoper (wiener-staatsoper.at)'
KIND = 'venue'
COUNTRY = 'austria'
# Off: wiener-staatsoper.at's robots.txt shuts out ClaudeBot / anthropic-ai by name (checked 29 Oct 2026),
# the same AI-crawler block for which concerts_romainmotier is off. Turn on only with the house's consent.
ENABLED = False
MAX_REQUESTS = 30
TIME_LIMIT = 600
WINDOW_DAYS = 450

BASE = 'https://www.wiener-staatsoper.at'
FIRST = BASE + '/kalender/'

_GENRE_KEEP = re.compile(r'^(oper|ballett|konzert|liederabend|solokonzert|operette|oratorium|musiktheater)$', re.I)
_TITLE_SKIP = re.compile(r'matinee zu|einf[üu]hrung|(?<!ent)(?<!auf)f[üu]hrung|workshop|gespr[äa]ch|symposi|quiz|diskussion|'
                         r'probe\b|tag der offenen|opernball|kinder|schul', re.I)
_ROOMS = {
    'grosser saal': 'Wiener Staatsoper',
    'nest': 'NEST – Neue Staatsoper im Künstlerhaus',
}


# ---------------------------------------------------------------------------
# month page
# ---------------------------------------------------------------------------

def _month_links(page_html):
    """-> [(year, month_slug, url)] for the month pages the calendar links to."""
    out = []
    for y, slug in re.findall(r'href="/kalender/(\d{4})/([a-z]+)/"', page_html or ''):
        url = f'{BASE}/kalender/{y}/{slug}/'
        if (y, slug, url) not in out:
            out.append((y, slug, url))
    return out


_MONTH_NUM = {'januar': 1, 'jaenner': 1, 'jänner': 1, 'februar': 2, 'maerz': 3, 'märz': 3, 'april': 4, 'mai': 5,
              'juni': 6, 'juli': 7, 'august': 8, 'september': 9, 'oktober': 10, 'november': 11, 'dezember': 12}


def _people(block):
    """[(role text, [names])] from one role-type block of the cast panel; a row without a
    label continues the one above (several composers under 'Musik')."""
    out, last = [], ''
    for row in re.split(r'<div class="d-flex justify-content-between">', block)[1:]:
        label = re.search(r'<p>(.*?)</p>', row, re.S)
        names_html = row[label.end():] if label else row
        names = [clean(x) for x in re.findall(r'<a [^>]*>(.*?)</a>', names_html, re.S)]
        if not names:
            names = [clean(x) for x in re.findall(r'<(?:span|div)[^>]*>([^<]+)</(?:span|div)>', names_html) if clean(x)]
        if not names:
            plain = clean(names_html)
            names = [plain] if plain else []
        last = (clean(label.group(1)) if label else '') or last
        names = [n for n in names if n and n != 'Details']
        if names:
            out.append((last, names))
    return out


def parse_month(page_html):
    """-> list of performance dicts (raw facts) from one month page."""
    h = page_html or ''
    times = {}
    for m in re.finditer(r'<div class="sticky-date[^"]*" data-event="(eventItem\d+)">', h):
        body = h[m.end():m.end() + 800].split('sticky-date', 1)[0]
        t = re.search(r'production-time">\s*(\d{1,2}:\d{2})\s*(?:&mdash;|—|-)?\s*(\d{1,2}:\d{2})?', body)
        if t:
            times[m.group(1)] = (t.group(1), t.group(2))
    out = []
    parts = re.split(r'<div class="(event-list-item [^"]*)"\s+id="(eventItem\d+)">', h)
    for i in range(1, len(parts) - 2, 3):
        cls, eid, body = parts[i], parts[i + 1], parts[i + 2]
        body = re.split(r'<div class="event-group d-flex">', body)[0]
        link = re.search(r'href="(https://www\.wiener-staatsoper\.at/kalender/detail/[^"/]+/(\d{4})-(\d{2})-(\d{2})/)"', body)
        title = re.search(r'<h2 class="event-title">(.*?)</h2>', body, re.S)
        if not link or not title:
            continue
        lead = re.search(r'<span class="event-lead[^"]*">(.*?)</span>', body, re.S)
        genre = re.search(r'event-genre">(.*?)</span>', body, re.S)
        room = re.search(r'event-room">(.*?)</span>', body, re.S)
        k = re.search(r'<div class="role-type-K">(.*?)(?=<div class="role-type-L">|<div class="swiper-slide">|'
                      r'<div class="btn-row|<div class="swiper-navigation|$)', body, re.S)
        l = re.search(r'<div class="role-type-L">(.*?)(?=<div class="swiper-slide">|<div class="btn-row|'
                      r'<div class="swiper-navigation|$)', body, re.S)
        start, end = times.get(eid, (None, None))
        out.append({
            'eid': eid[len('eventItem'):], 'cls': cls.split(), 'url': _html.unescape(link.group(1)),
            'day': date(int(link.group(2)), int(link.group(3)), int(link.group(4))),
            'time': start, 'end': end, 'title': clean(title.group(1)),
            'composers': [c for c in (x.strip() for x in clean(lead.group(1)).split(',')) if c] if lead else [],
            'genre': clean(genre.group(1)) if genre else '', 'room': clean(room.group(1)) if room else '',
            'cast': _people(k.group(1)) if k else [], 'team': _people(l.group(1)) if l else [],
            'text': clean(re.sub(r'(?s)<div class="offcanvas.*', '', body)),
        })
    return out


# ---------------------------------------------------------------------------
# performance -> event
# ---------------------------------------------------------------------------

def _kind(p):
    g = fold(p['genre'])
    if 'school' in p['cls'] or 'kinder' in g:
        return None
    if _TITLE_SKIP.search(p['title']) and not re.search(r'konzert', p['title'], re.I):
        return None
    if re.search(r'(?i)generalprobe|hauptprobe|offene probe|schulvorstellung', p['text']):
        return None
    if not _GENRE_KEEP.match(g):
        return None
    if g == 'ballett' or 'ballet' in p['cls']:
        return 'ballet'
    if g in ('konzert', 'liederabend', 'solokonzert'):
        return 'concert'
    return 'opera'


def _credits(p, kind):
    lead, staging, cast = [], [], []
    for label, names in p['team']:
        f = fold(label)
        if re.match(r'(musikalische leitung|dirigent)', f):
            lead += [('Conductor', n) for n in names]
        elif re.match(r'chor', f) and not f.startswith('choreo'):
            continue                                    # chorus master of the house: not listed
        elif 'choreogra' in f:
            staging += [('Choreographer', n) for n in names]
        elif kind == 'opera' and re.match(r'(konzept (und|&) )?(inszenierung|regie)', f):
            staging += [('Director', n) for n in names]
    for label, names in p['cast']:
        if kind == 'ballet':
            if re.match(r'(?i)dirigent|musikalische leitung', label):
                lead += [('Conductor', n) for n in names]
            continue                                    # dancers
        r = role(label)
        if r in ('Conductor', 'Chorus master'):
            lead += [(r, n) for n in names]
            continue
        if r in ('Director', 'Choreographer', ''):
            continue
        if re.match(r'(?i)pianist(in)?$', label):
            cast += [('Piano', n) for n in names]
            continue
        if re.search(r'(?i)schauspieler|t[äa]nzer|\btanz\b|statist', label):
            continue                                    # actors and dancers are not musical credits
        for n in names:
            c = credit(n, label, opera=(kind == 'opera'))
            if c:
                cast.append(c)
    return order_credits(lead + cast + staging)


def _program(p, kind):
    """Opera: (composer, title) from the line above the title. Ballet: the composers listed
    under 'Musik' (the line above a ballet's title is its choreographer)."""
    if kind == 'ballet':
        music = [n for label, names in p['team'] if re.match(r'(?i)musik\b', label) for n in names]
        # 'Piotr I. Tschaikowski in einem Arrangement von Kurt-Heinz Stolze' -> the composer
        return [(re.sub(r'(?i)\s+(?:in (?:einem|einer|der)\s+)?(?:arrangement|bearbeitung|fassung|orchestrierung)\b.*$', '', n), '')
                for n in music]
    comps = p['composers']
    if not comps:
        return []
    titles = [t.strip() for t in p['title'].split('/')]
    if len(comps) > 1 and len(titles) == len(comps):
        return list(zip(comps, titles))
    if len(comps) == 1:
        return [(comps[0], p['title'])]
    return [(c, '') for c in comps]


def _venue(room):
    r = fold(room)
    if r in _ROOMS:
        return _ROOMS[r]
    return f'Wiener Staatsoper, {room}' if room else 'Wiener Staatsoper'


def fetch():
    today = today_zurich()
    last = today + timedelta(days=WINDOW_DAYS)
    first = get(FIRST)                                  # FetchError propagates
    pages = [first]
    for y, slug, url in _month_links(first):
        m = _MONTH_NUM.get(slug)
        if not m or (int(y), m) <= (today.year, today.month) or date(int(y), m, 1) > last:
            continue
        try:
            pages.append(get(url))
        except BudgetExceeded:
            raise
        except FetchError as err:
            log.warning('%s: %s failed: %s', KEY, url, err)
    perf, skipped = {}, {}
    for page in pages:
        for p in parse_month(page):
            if not (today <= p['day'] <= last) or 'past' in p['cls'] or re.match(r'(?i)keine vorstellung|geschlossen', p['title']):
                continue
            perf.setdefault(p['eid'], p)
    events = []
    for p in sorted(perf.values(), key=lambda p: (p['day'], p['time'] or '')):
        kind = _kind(p)
        if not kind:
            skipped[p['genre'] or 'no genre'] = skipped.get(p['genre'] or 'no genre', 0) + 1
            continue
        credits = _credits(p, kind)
        if kind == 'ballet' and p['team'] and not any(r == 'Conductor' for r, _ in credits):
            skipped['ballet without conductor'] = skipped.get('ballet without conductor', 0) + 1
            continue
        start = local_iso(p['day'], p['time'])
        if not start:
            skipped['no time yet'] = skipped.get('no time yet', 0) + 1
            continue
        end = local_iso(p['day'], p['end']) if p['end'] else None
        if kind in ('opera',):
            kind_type = 'vocal-opera'
        elif kind == 'ballet':
            kind_type = 'orchestral'
        else:
            kind_type = infer_type(p['title'], credits, _program(p, kind))
        try:
            events.append(make_event(
                KEY, p['eid'], p['title'], start, end=end, city=CITY, venueName=_venue(p['room']),
                type=kind_type, series='Ballett' if kind == 'ballet' else None, credits=credits,
                program=_program(p, kind), url=p['url'],
                status='cancelled' if looks_cancelled(p['title']) or re.search(r'(?i)\babgesagt\b', p['text'])
                else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, p['eid'], err)
    if skipped:
        log.info('%s: %d month pages; skipped %s', KEY, len(pages),
                 ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    return events
