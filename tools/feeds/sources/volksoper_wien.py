"""Volksoper Wien: operas, operettas and concerts from the house's own calendar.

    https://www.volksoper.at/sitemap.xml                                the season's month pages
    https://www.volksoper.at/spielplan/november-2026.de.html            one page per month
    https://www.volksoper.at/rest/event-v3/get-besetzung?eventId=<id>   one performance's cast (JSON)
    https://www.volksoper.at/produktion/<slug>.<id>.de.html             one performance's page

The month pages (found in the sitemap; "jänner-2027" is spelt with the umlaut) list each
performance with schema.org microdata (startDate/endDate with offset), title, a genre line
("Operette von Franz Lehár", "Musikdrama von Richard Strauss", "Ein Musical-Vaudeville …",
"Ballett von …"), the stage (Volksoper, Balkon-Foyer, Probebühne …), the ticket link, badges
("Ausverkauft") and the link to the performance's page, whose number is the performance id.
The cast of a performance (conductor and the characters' singers, or the players of a
concert) is the small JSON the page's "Besetzung & Details" button loads. Only those facts
are taken, never the synopses.

Requests: the sitemap and ~10 month pages, one page for each production without a genre
line (to see whether it is a concert), and the cast JSON incrementally with what is left
(cap 150): a performance the previous feed has with its cast (same id, start and title)
keeps it (also an empty cast not announced yet), so the requests go to performances not seen before, nearest first, then to the
next week's and a fixed share of the others (each about every two weeks), to pick up cast
changes. A performance not reached yet is listed with the composer from its genre line only.

As asked for Klang, only operas, operettas and concerts are taken: musicals, plays with
music ("Ein Stück mit Musik"), ballets (Wiener Staatsballett; a ballet "mit Gesang" paired
with an opera is kept), family/children's shows, Austro-pop, talks and salons, soirées,
presentations and guided tours are skipped. An entry without a genre line is kept when its
page lists musicians only (conductor, voices, instruments: e.g. the orchestra's chamber
concerts in the Balkon-Foyer); characters mean a show. A guest appearance named
"<Place>: <title>" (StudioV! in the Lutherische Stadtkirche) is listed at that place, and the
orchestra's concerts in the Konzerthaus at the Konzerthaus.

The server sometimes refuses a connection (seen 29 Oct 2026); common.get retries it.

Checked against the website on 29 Oct 2026 (Der Zarewitsch 3 Nov, Salome 8 Nov, Die
Fledermaus 13 Nov, Wien—Paris und retour 26 Nov).
"""
from __future__ import annotations

import html as _html
import re
from datetime import timedelta

from common import (BudgetExceeded, FetchError, clean, event_id, get, get_json, infer_type, log, looks_cancelled,
                    make_event, previous_event, refresh_due, requests_left, to_zurich_datetime, today_zurich)

from ._vienna import CITY, credit, fold, month_number, order_credits, role

KEY = 'volksoper_wien'
NAME = 'Volksoper Wien'
SITE = 'https://www.volksoper.at/'
ATTRIBUTION = 'Source: Volksoper Wien (volksoper.at)'
KIND = 'venue'
COUNTRY = 'austria'
MAX_REQUESTS = 150
TIME_LIMIT = 900
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 14
WINDOW_DAYS = 450

BASE = 'https://www.volksoper.at'
SITEMAP = BASE + '/sitemap.xml'
CAST = BASE + '/rest/event-v3/get-besetzung?eventId={id}'

_KEEP_RE = re.compile(r'\boper\b|operette|musikdrama|singspiel|spieloper|opera buffa|dramma giocoso|dramma per musica|'
                      r'op[ée]ra comique|\boratorium|konzert|liederabend|requiem|\bmesse\b|vokalmusik|kammermusik|'
                      r'chor(?:musik|konzert)|mit gesang', re.I)
_SKIP_RE = re.compile(r'musical|ballett(?!.*mit gesang)|st[üu]ck mit musik|schauspiel|familie|f[üu]r junges publikum|'
                      r'f[üu]r kinder|kinder|zeitzeugen|gespr[äa]ch|salon\b|soir[ée]e|f[üu]hrung|einf[üu]hrung|'
                      r'workshop|lesung|singt edith|chanson|kabarett|\btanz|austro-?pop|\bpop\b|pr[äa]sentation|'
                      r'werkstatt|probe\b|wird noch bekannt', re.I)
_STAGES = {
    'volksoper': 'Volksoper Wien',
    'balkon-foyer': 'Volksoper Wien, Balkon-Foyer',
    'probebuhne der volksoper': 'Volksoper Wien, Probebühne',
    'kasino am schwarzenbergplatz': 'Kasino am Schwarzenbergplatz',
    'konzerthaus': 'Wiener Konzerthaus',
    'musikverein': 'Musikverein Wien',
}


# ---------------------------------------------------------------------------
# month pages
# ---------------------------------------------------------------------------

def month_urls(sitemap, today, last):
    out = []
    for url, slug, year in re.findall(r'<loc>\s*(https://www\.volksoper\.at/spielplan/([^<\s./-]+)-(\d{4})\.de\.html)\s*</loc>',
                                      sitemap or ''):
        m = month_number(slug)
        if m and (today.year, today.month) <= (int(year), m) <= (last.year, last.month):
            out.append(((int(year), m), url))
    return [u for _, u in sorted(set(out))]


def parse_month(page_html):
    """-> list of performance dicts (raw facts) from one month page."""
    out = []
    for a in re.findall(r'<article(.*?)</article>', page_html or '', re.S):
        start = re.search(r'itemprop="startDate"\s+content="([^"]+)"', a)
        prod = re.search(r'href="(https://www\.volksoper\.at/produktion/[^"]+?\.(\d+)\.de\.html)"', a)
        prodid = re.search(r'filter\[production\]=(\d+)', a)
        title = re.search(r'itemprop="name">(.*?)</h2>', a, re.S)
        if not start or not prod or not title:
            continue
        end = re.search(r'itemprop="endDate"\s+content="([^"]+)"', a)
        loc = re.search(r'<span class="event-location">(.*?)</span>', a, re.S)
        ticket = re.search(r'href="(https://tickets\.volksoper\.at/[^"]+)"', a)
        out.append({
            'start': start.group(1), 'end': end.group(1) if end else None,
            'prod_url': prod.group(1), 'eid': prod.group(2), 'prodid': prodid.group(1) if prodid else prod.group(2),
            'title': clean(title.group(1)),
            'lines': [clean(x) for x in re.findall(r'<p class="event-description[^"]*">(.*?)</p>', a, re.S) if clean(x)],
            'stage': clean(loc.group(1)) if loc else '',
            'ticket': _html.unescape(ticket.group(1)) if ticket else None,
            'alert': ' '.join(clean(x) for x in re.findall(r'class="event-(?:alert|badge)[^"]*"[^>]*>(.*?)</', a, re.S)),
            'text': clean(a),
        })
    return out


def classify(p):
    """'keep' | 'skip' | 'maybe' (decided by the production page)."""
    text = ' '.join([p['title']] + p['lines'][:1])
    if _SKIP_RE.search(text) and not re.search(r'konzert', p['title'], re.I):
        return 'skip'
    if _KEEP_RE.search(text):
        return 'keep'
    return 'maybe'


# ---------------------------------------------------------------------------
# production page and cast JSON
# ---------------------------------------------------------------------------

def _name(fragment):
    return clean(re.sub(r'<[^>]+>', ' ', fragment))


def parse_production(page_html):
    """-> {'events': {start ISO[:16]: event id}, 'cast_date': 'YYYY-MM-DD' or None,
    'cast': [(role text, name)], 'team': [(role text, name)], 'genre': first text line}"""
    h = page_html or ''
    events = {}
    for eid, body in re.findall(r'<div id="(\d{6,})">(.*?)</button>', h, re.S):
        s = re.search(r'itemprop="startDate"\s+content="([^"]+)"', body)
        if s:
            events[s.group(1)[:16]] = eid
    cast_date, cast = None, []
    rem = re.search(r'<div class="event-cast-remaining[^"]*">\s*<h2[^>]*>\s*Besetzung am\s+(\d{1,2})\.\s*([A-Za-zäÄ]+)\s+(\d{4})'
                    r'(.*?)(?=<div class="event-cast-remaining|<div id="event-dates|<div id="event-media|'
                    r'<div id="event-plot|<div id="events-related|$)', h, re.S)
    if rem:
        m = month_number(rem.group(2))
        if m:
            cast_date = f'{int(rem.group(3)):04d}-{m:02d}-{int(rem.group(1)):02d}'
        for r, n in re.findall(r'<dt[^>]*class="[^"]*role[^"]*"[^>]*>(.*?)</dt>\s*<dd[^>]*>(.*?)</dd>', rem.group(4), re.S):
            if _name(n):
                cast.append((clean(r), _name(n)))
    team = []
    lead = re.search(r'<div class="event-cast-leading[^"]*">(.*?)(?=<div class="event-cast-remaining|<div id="event-|$)', h, re.S)
    for r, n in re.findall(r'<span class="role">(.*?)</span>\s*<span class="name">(.*?)</span>\s*</p>', lead.group(1) if lead else '', re.S):
        if _name(n):
            team.append((clean(r), _name(n)))
    h1 = re.search(r'<h1[^>]*>.*?</h1>(.*?)<(?:div|h2)', h, re.S)
    return {'events': events, 'cast_date': cast_date, 'cast': cast, 'team': team,
            'genre': clean(h1.group(1))[:200] if h1 else ''}


def parse_cast_json(data):
    """-> [(role text, name)] from get-besetzung."""
    out = []
    cast = (data or {}).get('cast') or {}
    groups = cast.values() if isinstance(cast, dict) else [cast]
    for group in groups:
        for c in group or []:
            if isinstance(c, dict) and clean(c.get('name')):
                out.append((clean(c.get('info')), clean(c.get('name'))))
    return out


def credits_from(cast, team, kind):
    lead, people, staging = [], [], []
    for label, name in team:
        f = fold(label)
        if 'choreogra' in f and kind == 'opera':
            staging.append(('Choreographer', name))
        elif re.match(r'(inszenierung|regie)', f) and kind == 'opera':
            staging.append(('Director', name))
        elif re.match(r'musikalische leitung|dirigent', f):
            lead.append(('Conductor', name))
    for label, name in cast:
        f = fold(label)
        if re.match(r'musikalische leitung|dirigent', f):
            lead.append(('Conductor', name))
            continue
        if re.search(r'live animation|schauspiel|t[aä]nzer|statist|sprechrolle', f) or re.match(r'(von und )?mit$', f):
            continue
        c = credit(name, label.replace('Violocello', 'Violoncello'), opera=(kind == 'opera'))
        if c and c[0] not in ('Director', 'Choreographer'):
            people.append(c)
    return order_credits(lead + people + staging)


def _composer_of(segment):
    m = re.search(r'\bvon\s+(.+)$', segment)
    if not m:
        return None
    # 'Arthur Sullivan und W. S. Gilbert', 'Kurt Weill & Bertolt Brecht': the composer comes first
    return re.split(r'\s+(?:und|&)\s+', m.group(1).strip())[0].strip(' ,')


def _program(lines, title):
    """[(composer, work)] from the genre line ('Operette von Franz Lehár'); a double bill
    ('A / B' with 'Ballett mit Gesang von … / Oper von …') gives one line per work."""
    for line in lines[:2]:
        if not re.search(r'oper|operette|musikdrama|singspiel|dramma|gesang', line, re.I):
            continue
        segs, titles = [x.strip() for x in line.split(' / ')], [x.strip() for x in title.split(' / ')]
        if len(segs) > 1 and len(segs) == len(titles):
            out = [(_composer_of(sg), t) for sg, t in zip(segs, titles)]
            return [(c, t) for c, t in out if c]
        c = _composer_of(line)
        return [(c, title)] if c else []
    return []


def _venue(p):
    m = re.match(r'^([^:]{4,50}?(?:kirche|saal|haus|palais|kasino|dom|museum))\s*:\s*(.+)$', p['title'], re.I)
    if m:
        return clean(m.group(1)), clean(m.group(2)).strip('"„“ ')
    return _STAGES.get(fold(p['stage']), f"Volksoper Wien, {p['stage']}" if p['stage'] else 'Volksoper Wien'), p['title']


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def _is_music(prod):
    """A production page whose cast is musicians only (conductor, singers by voice,
    instrumentalists, groups): a concert. Characters (a show or play) make it not one."""
    roles = [role(r) for r, _ in prod['cast']]
    known = [r for r in roles if r]
    return bool(known) and all(r is not None for r in roles) and not any(r in ('Director', 'Choreographer') for r in known)


def fetch():
    today = today_zurich()
    last = today + timedelta(days=WINDOW_DAYS)
    urls = month_urls(get(SITEMAP), today, last)       # FetchError propagates
    perfs, seen = [], set()
    for url in urls:
        try:
            page = get(url)
        except BudgetExceeded:
            raise
        except FetchError as err:
            log.warning('%s: %s failed: %s', KEY, url, err)
            continue
        for p in parse_month(page):
            try:
                day = to_zurich_datetime(p['start']).date()
            except ValueError:
                continue
            if today <= day <= last and p['eid'] not in seen:
                seen.add(p['eid'])
                perfs.append(p)
    skipped = {}

    def skip(why):
        skipped[why] = skipped.get(why, 0) + 1

    # entries without a genre line: one production page per production decides
    verdict, pages, page_cast = {}, 0, {}
    cands = []
    for p in sorted(perfs, key=lambda p: p['start']):
        c = classify(p)
        if c == 'skip':
            skip('not opera/operetta/concert')
            continue
        if c == 'maybe':
            if p['prodid'] not in verdict:
                try:
                    prod = parse_production(get(p['prod_url']))
                    pages += 1
                    verdict[p['prodid']] = _is_music(prod) and not _SKIP_RE.search(prod['genre'])
                    if prod['cast_date'] and prod['cast']:
                        page_cast[(p['prodid'], prod['cast_date'])] = prod['cast']
                except BudgetExceeded as err:
                    log.warning('%s: stopped reading production pages: %s', KEY, err.reason)
                    verdict[p['prodid']] = False
                except FetchError as err:
                    log.warning('%s: production page failed: %s', KEY, err)
                    verdict[p['prodid']] = False
            if not verdict[p['prodid']]:
                skip('no music listed')
                continue
        text = ' '.join([p['title']] + p['lines'][:1])
        kind = 'opera' if re.search(r'\boper\b|operette|musikdrama|singspiel|spieloper', text, re.I) else 'concert'
        venue, title = _venue(p)
        c = {'p': p, 'kind': kind, 'venue': venue, 'title': title, 'cast': None, 'reused': None}
        prev = previous_event(event_id(KEY, p['eid']), p['start'], title=title)
        if prev:                                        # its cast may still be empty (not announced yet)
            c['reused'] = [(x.get('role'), x.get('name')) for x in prev.get('credits') or []]
        cands.append(c)

    def tier(c):
        if c['reused'] is None:
            return 0
        if refresh_due(c['p']['eid'], c['p']['start'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    read = 0
    for c in sorted((c for c in cands if tier(c) is not None), key=lambda c: (tier(c), c['p']['start'])):
        if requests_left() <= 0:
            break
        try:
            c['cast'] = parse_cast_json(get_json(CAST.format(id=c['p']['eid'])))
            read += 1
        except BudgetExceeded as err:
            log.warning('%s: stopped reading casts: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: cast failed: %s', KEY, c['p']['eid'], err)

    events = []
    for c in cands:
        p = c['p']
        if not c['cast'] and (p['prodid'], p['start'][:10]) in page_cast:
            c['cast'] = page_cast[(p['prodid'], p['start'][:10])]      # a one-off concert: its page has the players
        if c['cast'] is not None:
            credits = credits_from(c['cast'], [], c['kind'])
        else:
            credits = c['reused'] or []        # None: not read yet
        program = _program(p['lines'], c['title']) if c['kind'] == 'opera' else []
        kind = 'vocal-opera' if c['kind'] == 'opera' else infer_type(c['title'], credits, program)
        cancelled = looks_cancelled(p['title']) or looks_cancelled(p['alert'])
        try:
            events.append(make_event(
                KEY, p['eid'], c['title'], p['start'], end=p['end'], city=CITY, venueName=c['venue'], type=kind,
                credits=credits, program=program, ticketUrl=p['ticket'], url=p['prod_url'],
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, p['eid'], err)
    log.info('%s: %d month pages, %d production pages, %d casts read, %d reused, %d without cast yet; skipped %s',
             KEY, len(urls), pages, read, sum(1 for c in cands if c['reused'] is not None and c['cast'] is None),
             sum(1 for c in cands if c['reused'] is None and c['cast'] is None),
             ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())) or 'none')
    return events
