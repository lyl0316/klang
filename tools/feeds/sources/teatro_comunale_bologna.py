"""Teatro Comunale di Bologna: opera, concerts and the Accademia from the two season lists
and the event pages (HTML + schema.org JSON-LD).

    https://www.tcbo.it/stagione-presente/      this season (one page, every event)
    https://www.tcbo.it/stagione-futura/        next season (one page, every event)
    https://www.tcbo.it/evento/<kind>/<slug>/   one event: JSON-LD per performance + cast

Each list card gives the event page, tags ("Opera", "Concerti", "Sinfonica", "Accademia",
"Danza", "Eventi", "Disney Concerts", "La stanza della musica" …), the title, the dates as
text ("30, 31 marzo · 1, 2, 3, 4 aprile 2027") and the venue. The event page has one
TheaterEvent/MusicEvent JSON-LD block per performance (startDate with offset, eventStatus,
location, ticket offer) and the cast in structured cards: "Direttore / Roberto Abbado",
"Mezzosoprano / Dalila / Ekaterina Semenchuk" (voice, character, singer), with one cast tab
per date when casts alternate; concerts add the programme ("work / di Composer"). Only
those facts are taken, never descriptions.

Event pages cost one request each (about 60 a year) and are read incrementally: an event
whose dates in the list are exactly the dates the previous feed has for it keeps those
performances; the requests left go to events not seen before (soonest first), then to
events in the next two weeks and a fixed share of the others (each about once a week).

robots.txt: "User-agent: *" allowed (Cloudflare's managed block disallows AI crawlers such
as ClaudeBot/GPTBot by name and sets "Content-Signal: search=yes, ai-train=no"; Klang is a
plain listing that links back, not AI training). No terms about reuse were found.

Skipped: family and children's formats ("La stanza della musica", Pierino e il lupo),
Disney film concerts, pop shows ("Eventi" without classical tags, e.g. Opera Guccini),
school performances, and dance without a conductor or orchestra credited (recorded music).
While the Teatro Comunale is being renovated (reopening 14 Feb 2027) most performances are
at the Teatro Auditorium Manzoni; Accademia concerts elsewhere in and around Bologna keep
their own town.

Checked against the website on 29 Oct 2026 (Samson et Dalila 13/15 Nov, Chauhan/Brunello
6 Nov 20:30, Musica vocale da camera 1 on 20 Feb, and the list dates of Bolton, Madama
Butterfly 30 Mar–4 Apr and Carmen 7–14 May: dates, times, venues, casts and works match).
"""
from __future__ import annotations

import html as _html
import re
from datetime import date

from common import (BudgetExceeded, FetchError, clean, get, jsonld_events, log, make_event,
                    previous_events, refresh_due, requests_left, to_zurich_iso, today_zurich)

from ._italy_centre import ROME, concert_type, fold, month_number, role_en, split_groups, strip_life_dates

KEY = 'teatro_comunale_bologna'
NAME = 'Teatro Comunale di Bologna'
SITE = 'https://www.tcbo.it/'
ATTRIBUTION = 'Source: Fondazione Teatro Comunale di Bologna (tcbo.it)'
KIND = 'venue'
COUNTRY = 'italy'
# Off: tcbo.it's robots.txt shuts out ClaudeBot / anthropic-ai by name (checked 29 Oct 2026), the same
# AI-crawler block for which concerts_romainmotier is off. Turn on only with the theatre's consent.
ENABLED = False
MAX_REQUESTS = 90              # 2 lists + one page per event (~60 a year)
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 14
REFRESH_EVERY_DAYS = 7

BASE = 'https://www.tcbo.it'
LISTS = (BASE + '/stagione-presente/', BASE + '/stagione-futura/')
CITY = 'Bologna'

_SKIP_TAGS = {'la stanza della musica', 'disney concerts', 'visite guidate', 'educational', 'scuole', 'famiglie'}
_KEEP_TAGS = {'opera', 'concerti', 'sinfonica', 'camera', 'gioia', 'accademia', 'danza'}
_SKIP_TITLE_RE = re.compile(r'pierino e il lupo|live in concert|disney|per le scuole|famiglie|bambini|visita', re.I)
_TOWN_RE = re.compile(r'\b(San Giovanni in Persiceto|Imola|Modena|Ferrara|Reggio Emilia|Ravenna|Cesena|Forl[iì]|'
                      r'Rimini|Casalecchio di Reno|San Lazzaro di Savena|Budrio|Pieve di Cento|Cento)\b')


# ---------------------------------------------------------------------------
# season lists
# ---------------------------------------------------------------------------

def card_dates(text):
    """'30, 31 marzo · 1, 2, 3, 4 aprile 2027' -> sorted list of dates (empty if unreadable)."""
    t = clean(text)
    years = [int(y) for y in re.findall(r'\b(20\d{2})\b', t)]
    if not years:
        return []
    out = []
    segments = [s for s in re.split(r'\s*·\s*', t) if s.strip()]
    parsed = []
    for seg in segments:
        m = re.search(r'([A-Za-zàèéìòù]+)(?:\s+(20\d{2}))?\s*$', seg.strip())
        mo = month_number(m.group(1)) if m else None
        if not mo:
            continue
        days = [int(d) for d in re.findall(r'\b(\d{1,2})\b', seg[:m.start()])]
        parsed.append([days, mo, int(m.group(2)) if m.group(2) else None])
    year = years[-1]
    for item in reversed(parsed):              # a segment without a year takes the next one's
        if item[2] is None:
            item[2] = year
        year = item[2] if item[2] else year
    for i in range(len(parsed) - 1):
        if parsed[i][2] == parsed[i + 1][2] and parsed[i][1] > parsed[i + 1][1]:
            parsed[i][2] -= 1                  # '30, 31 dicembre · 1 gennaio 2027'
    for days, mo, y in parsed:
        for d in days:
            try:
                out.append(date(y, mo, d))
            except ValueError:
                pass
    return sorted(set(out))


def parse_list(page):
    out = []
    for card in re.split(r'class="border-stroke flex h-full flex-col gap-4', page or '')[1:]:
        link = re.search(r'href="(https://www\.tcbo\.it/evento/[^"]+)"', card)
        if not link:
            continue
        tags = [fold(clean(x)) for x in re.findall(r'uppercase[^"]*">([^<]+)</p>', card)]
        title = re.search(r'<h3[^>]*>\s*(.*?)\s*</h3>', card, re.S)
        ps = [clean(p) for p in re.findall(r'<p class="font-sans text-\[18px\][^>]*>\s*(.*?)\s*</p>', card, re.S)]
        out.append({'url': _html.unescape(link.group(1)), 'tags': tags, 'title': clean(title.group(1)) if title else '',
                    'when': ps[0] if ps else '', 'place': ps[1] if len(ps) > 1 else '',
                    'dates': card_dates(ps[0]) if ps else []})
    return out


def _slug(url):
    m = re.search(r'/evento/[^/]+/([^/]+)/?$', url)
    return m.group(1) if m else url


def _wanted(c):
    tags = set(c['tags'])
    if tags & _SKIP_TAGS or _SKIP_TITLE_RE.search(c['title']):
        return False
    return bool(tags & _KEEP_TAGS)


# ---------------------------------------------------------------------------
# event pages
# ---------------------------------------------------------------------------

def _strip_attrs(h):
    h = re.sub(r'(?is)<(script|style|svg|noscript)\b.*?</\1\s*>|<!--.*?-->|<img[^>]*>', ' ', h or '')
    return re.sub(r'<(/?\w+)(?:\s[^>]*)?>', r'<\1>', h)


_CARD_RE = re.compile(r'<span>\s*<span>([^<]*)</span>\s*(?:<span>([^<]*)</span>\s*)?<span>([^<]*)</span>\s*</span>\s*</a>', re.S)
_CARD_NOLINK_RE = re.compile(r'<li>\s*<span>\s*<span>([^<]*)</span>\s*(?:<span>([^<]*)</span>\s*)?<span>([^<]*)</span>\s*</span>\s*</li>', re.S)


def _cards(fragment):
    """People cards in a fragment -> [(role, name)]."""
    out = []
    for a, b, c in _CARD_RE.findall(fragment) + _CARD_NOLINK_RE.findall(fragment):
        a, b, c = clean(a), clean(b), clean(c)
        if not c:
            continue
        if b:                                     # 'Mezzosoprano / Dalila / Ekaterina Semenchuk'
            role = b
        else:
            role = role_en(a, characters=False)
            if role in ('Orchestra', 'Choir', 'Ensemble'):
                out.extend(split_groups(c) or [(role, c)])
                continue
        if role:
            out.append((role, c))
    return out


def parse_detail(page):
    h = _strip_attrs(page)
    raw = page or ''
    per_date = {}                                 # cast tabs: one panel per date when casts alternate
    for idx, iso in re.findall(r'id="cast-tab-(\d+)"[^>]*>\s*<time datetime="(\d{4}-\d{2}-\d{2})"', raw):
        m = re.search(r'id="cast-panel-' + idx + r'"[^>]*>(.*?)</ul>', raw, re.S)
        if m:
            per_date[iso] = _cards(_strip_attrs(m.group(1) + '</ul>'))
    # everything else: direction, soloists, orchestra and choir (outside the cast panels)
    common_part = re.sub(r'(?s)<div[^>]*id="cast-panel-\d+".*?</ul>\s*</div>', ' ', raw)
    main = common_part[common_part.find('<main'):]
    aside = main.find('data-event-aside')
    main = main[:aside] if aside > 0 else main
    credits = _cards(_strip_attrs(main))
    program = []
    prog = re.search(r'<h2>Programma</h2>(.*?)</section>', h, re.S)
    for li in re.findall(r'<li>(.*?)</li>', prog.group(1) if prog else '', re.S):
        work = re.search(r'<h3>(.*?)</h3>', li, re.S)
        comp = re.search(r'<p>\s*di\s+(.*?)</p>', li, re.S)
        if work:
            program.append((strip_life_dates(comp.group(1)) if comp else '', clean(work.group(1))))
    composer = re.search(r'<dt>\s*(?:Compositore|Musica|Musiche)\s*</dt>\s*<dd>(.*?)</dd>', h, re.S)
    composers = [strip_life_dates(x) for x in re.split(r'(?i)<br\s*/?>', composer.group(1))] if composer else []
    if len([c for c in composers if c]) == 1:
        program = [(c or composers[0], w) for c, w in program]
    perfs = []
    for ev in jsonld_events(page):
        start = ev.get('startDate')
        if not start:
            continue
        loc = ev.get('location') if isinstance(ev.get('location'), dict) else {}
        addr = loc.get('address') if isinstance(loc.get('address'), dict) else {}
        offers = ev.get('offers') if isinstance(ev.get('offers'), dict) else {}
        perfs.append({'start': start, 'status': ev.get('eventStatus'), 'venue': clean(loc.get('name')),
                      'town': clean(addr.get('addressLocality')), 'ticket': offers.get('url'),
                      'name': clean(ev.get('name'))})
    return {'credits': credits, 'per_date': per_date, 'program': program, 'composers': [c for c in composers if c],
            'perfs': perfs}


def _city(venue, town, place):
    t = fold(town)
    if t in ('bologna', ''):
        m = _TOWN_RE.search(f'{venue} {place}')
        return m.group(1) if m else CITY
    return clean(town)


def _type(tags, title, credits, program):
    """-> (type or None, skip reason or None)"""
    tags = set(tags)
    roles = {r for r, _ in credits}
    if 'opera' in tags:
        return 'vocal-opera', None
    if 'danza' in tags:
        return ('orchestral', None) if roles & {'Conductor', 'Orchestra'} else (None, 'dance without live music')
    return concert_type(title, credits, program), None


def _reuse(card):
    """The previous feed's performances of this event when they are exactly the list's dates."""
    url = card['url']
    prev = [e for e in previous_events(KEY) if e.get('url') == url]
    if not prev or not card['dates']:
        return None
    today = today_zurich()
    want = {d for d in card['dates'] if d >= today}
    have = {date.fromisoformat(e['start'][:10]) for e in prev if e['start'][:10] >= today.isoformat()}
    return prev if want == have and want else None


def fetch():
    today = today_zurich()
    cards, seen = [], set()
    for i, url in enumerate(LISTS):
        try:
            page = get(url)
        except FetchError as err:
            if i == 0:
                raise
            log.warning('teatro_comunale_bologna: %s failed: %s', url, err)
            continue
        for c in parse_list(page):
            if c['url'] in seen:
                continue
            seen.add(c['url'])
            cards.append(c)
    wanted = [c for c in cards if _wanted(c) and (not c['dates'] or c['dates'][-1] >= today)]
    log.info('teatro_comunale_bologna: %d events listed, %d kept', len(cards), len(wanted))

    order, reused = [], {}
    for c in wanted:
        prev = _reuse(c)
        first = c['dates'][0].isoformat() + 'T20:00:00+01:00' if c['dates'] else None
        if prev:
            reused[c['url']] = prev
            if refresh_due(_slug(c['url']), first, near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
                order.append((1, c['dates'][0] if c['dates'] else today, c))
        else:
            order.append((0, c['dates'][0] if c['dates'] else today, c))
    order.sort(key=lambda x: (x[0], x[1]))

    events, read = [], set()
    for _, _, c in order:
        if requests_left() <= 0:
            break
        try:
            d = parse_detail(get(c['url']))
        except BudgetExceeded as err:
            log.warning('teatro_comunale_bologna: stopped reading event pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('teatro_comunale_bologna %s: event page failed: %s', _slug(c['url']), err)
            continue
        read.add(c['url'])
        program = d['program'] or [(x, '') for x in d['composers']]
        if 'opera' in c['tags'] and not d['program'] and len(d['composers']) == 1:
            program = [(d['composers'][0], c['title'])]
        kind, why = _type(c['tags'], c['title'], d['credits'] + [x for v in d['per_date'].values() for x in v], program)
        if why:
            log.info('teatro_comunale_bologna %s: %s, skipped', _slug(c['url']), why)
            continue
        for perf in d['perfs']:
            try:
                start = to_zurich_iso(perf['start'], assume=ROME)
            except ValueError:
                continue
            credits = list(d['credits'])
            cast = d['per_date'].get(start[:10]) or (next(iter(d['per_date'].values())) if len(d['per_date']) == 1 else [])
            leaders = [x for x in credits if x[0] in ('Conductor', 'Director', 'Choreographer')]
            others = [x for x in credits if x not in leaders]
            credits = leaders + cast + others
            venue = perf['venue'] or c['place'] or 'Teatro Comunale di Bologna'
            if fold(venue) == 'teatro comunale':
                venue = 'Teatro Comunale di Bologna'
            try:
                events.append(make_event(
                    KEY, f"{_slug(c['url'])}-{start[:16].replace('-', '').replace(':', '')}", c['title'], start,
                    city=_city(venue, perf['town'], c['place']), venueName=venue, type=kind, credits=credits,
                    program=program, ticketUrl=perf['ticket'], url=c['url'], status=perf['status']))
            except ValueError as err:
                log.warning('teatro_comunale_bologna %s: skipped a date: %s', _slug(c['url']), err)
    for url, prev in reused.items():
        if url not in read:
            events.extend(prev)
    log.info('teatro_comunale_bologna: %d event page(s) read, %d event(s) reused from the previous feed',
             len(read), sum(1 for u in reused if u not in read))
    return events
