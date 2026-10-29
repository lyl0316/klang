"""Landestheater Linz: opera, operetta, ballet with live music and the Bruckner Orchester
Linz's concerts, from the theatre's own events API (the one its pages use).

    https://www.landestheater-linz.at/ltl-events-api?query=…        GraphQL, read with GET
    https://www.landestheater-linz.at/stuecke/detail?ref=<id>        one page per production

The calendar page (/termine) shows 100 dates and loads the rest with POST requests, which we
never send. Its cast pop-ups and the production pages read a GraphQL endpoint on the same
site instead (urql, GET for short queries); one ``events`` query without ids returns the
whole season (about 690 dates): name, start/end with offset, composer, branch ("Oper",
"Konzert" …), stage, the "cancelled" flag, the ticket link and, per date, the creative team
("Musikalische Leitung", "Chorleitung" …) and the cast by role ("Lohengrin: Marco Jentzsch").
Only conductor, chorus master and singers are kept; directors, designers and dancers not.

Concert dates carry no cast in the API; their programme and performers are on the
production page ("<b>Maurice Ravel</b> (1875–1937)<br><em>Ma mère l’Oye</em> …", "<b>Wayne
Marshall</b> <em>Dirigent</em>"), read for concerts only and incrementally
(_austria_east.read_details): a concert the previous feed already has with performers or
works keeps them; new ones first, then the ones due for a re-read.

Kept: Oper, Operette, Tanz only when a "Musikalische Leitung" is named (live music), the
Bruckner Orchester Linz's concerts (also listed by brucknerhaus_linz: same hall name, so
build.py merges them) and guest concerts whose title says concert, orchestra, consort,
ensemble, quartet, Lieder, piano or brass. Not kept: Schauspiel, Junges Theater, Musical,
Führungen, Theatervermittlung, Sonderveranstaltungen (children's concerts, galas, talks),
school, family and youth concerts, pop/cabaret guest shows, the open-air dates outside Linz
without a stage. A classical guest recital whose title only names the artists (e.g. a
singer & pianist) is missed by the title rule.

Checked against the website on 29 Oct 2026: 691 dates in the API, 117 kept (103
performances of 10 opera/operetta productions, 14 concert dates incl. the 5 BOL concerts);
dates and times match /termine, casts the cast pop-ups, programmes the production pages.
"""
from __future__ import annotations

import json
import re
import urllib.parse

from common import clean, get, get_json, log, looks_cancelled, make_event

from ._austria_east import (composer_like, credit, name_role_line, prev_credits, prev_program, program_from_lines,
                            read_details, role_of)
from ._consent import group_role, looks_like_person

KEY = 'landestheater_linz'
NAME = 'Landestheater Linz'
SITE = 'https://www.landestheater-linz.at/'
ATTRIBUTION = 'Source: Landestheater Linz – OÖ Theater und Orchester (landestheater-linz.at)'
KIND = 'venue'
COUNTRY = 'austria'
MAX_REQUESTS = 40              # 1 API request + concert production pages
TIME_LIMIT = 600

BASE = 'https://www.landestheater-linz.at'
API = BASE + '/ltl-events-api'
PRODUCTION = BASE + '/stuecke/detail?ref={ref}'
QUERY = ('query events($identifier: [Int]) { events(identifier: $identifier) { identifier name startDate endDate '
         'composer subTitle subjectOf branch { name } location { stageName locationName } additionalType '
         'additionalInfo isExternal ticketlink cancelled contributor { namedPosition actor { givenName familyName '
         'alternateName } } performer { roleName actor { givenName familyName alternateName } } } }')

_STAGES = (
    (r'gro(ß|ss)er saal brucknerhaus', 'Brucknerhaus Linz, Großer Saal'),
    (r'mittlerer saal brucknerhaus', 'Brucknerhaus Linz, Mittlerer Saal'),
    (r'gro(ß|ss)er saal musiktheater', 'Musiktheater Linz, Großer Saal'),
    (r'blackbox lounge', 'Musiktheater Linz, BlackBox Lounge'),
    (r'blackbox', 'Musiktheater Linz, BlackBox'),
    (r'orchestersaal', 'Musiktheater Linz, Orchestersaal'),
    (r'foyer musiktheater', 'Musiktheater Linz, Foyer'),
    (r'^schauspielhaus', 'Landestheater Linz, Schauspielhaus'),
    (r'^kammerspiele', 'Landestheater Linz, Kammerspiele'),
    (r'studiob[üu]hne', 'Landestheater Linz, Studiobühne'),
)
_GUEST_OK = re.compile(r'(?i)konzert|orchester|consort|quartett|quartet|ensemble|philharm|sinfon|symphon|kammer|'
                       r'lieder|klavier|brass\b|oper\b')
_GUEST_NO = re.compile(r'(?i)musical|mamma mia|raabe|palast orchester|blasmusik|blechhauf|comedy|kabarett|slam|'
                       r'theatre tour|lesung')
_SKIP_TITLE = re.compile(r'(?i)school|schul|familie|kinder|jugend|move\.?on|kuscheltier|lausch|topolina|'
                         r'f[üu]hrung|gala\b|foyer')
_CONDUCT = {'Musikalische Leitung': 'Conductor', 'Dirigent': 'Conductor', 'Dirigentin': 'Conductor',
            'Chorleitung': 'Chorus master'}


def stage(location):
    name = clean((location or {}).get('stageName'))
    for rx, venue in _STAGES:
        if re.search(rx, name, re.I):
            return venue
    return name or None


def _actor(a):
    name = clean(a.get('alternateName')) or clean(f"{a.get('givenName') or ''} {a.get('familyName') or ''}")
    return name


def api_credits(e):
    out = []
    for c in e.get('contributor') or []:
        role = _CONDUCT.get(clean(c.get('namedPosition')))
        if not role:
            continue                                    # director, designers, 'Nachdirigat' …
        for a in c.get('actor') or []:
            if _actor(a) and (role, _actor(a)) not in out:
                out.append((role, _actor(a)))
    for p in e.get('performer') or []:
        role_text = clean(p.get('roleName'))
        for a in p.get('actor') or []:
            c = credit(_actor(a), role_text, character_ok=True)
            if c and c not in out:
                out.append(c)
    return out


# ---------------------------------------------------------------------------
# production page (concerts)
# ---------------------------------------------------------------------------

def parse_production(page_html):
    h = page_html or ''
    info = re.search(r'St(?:&uuml;|ü)ckinfo(.*?)(?:<!--evo content|</section>)', h, re.S)
    block = info.group(1) if info else ''
    credits, lines = [], []
    for raw in re.split(r'(?i)<br\s*/?>|</p>|<p[^>]*>', block):
        raw = re.sub(r'(?i)</?span[^>]*>', '', raw).strip()
        line = clean(raw)
        m = re.match(r'<(b|strong)>([^<]+)</\1>\s*(?:[–|,-]\s*)?<em>([^<]+)</em>\s*$', raw)
        if m:                                           # '<b>Wayne Marshall</b> <em>Dirigent</em>'
            name, role = clean(m.group(2)), clean(m.group(3))
        elif re.fullmatch(r'<(b|strong)>([^<]+)</\1>', raw) and group_role(line):
            name, role = line, ''                       # '<strong>Johann Strauss Ensemble</strong>'
        else:
            name, role = name_role_line(line)
            if not role and ':' in line:
                name, _, role = (x.strip() for x in line.partition(':'))
        if name and (role and role_of(role) and composer_like(name) or not role and group_role(name)
                     and raw.startswith(('<b>', '<strong>'))):
            c = credit(name, role)
            if c and c not in credits:
                credits.append(c)
            lines.append('')
            continue
        lines.append('' if len(line.split()) > 25 else line)          # the description: not the programme
    return {'credits': credits, 'program': program_from_lines(lines)}


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def _kind(e):
    branch = clean((e.get('branch') or {}).get('name'))
    name = clean(e.get('name'))
    if branch in ('Oper', 'Operette'):
        return 'opera'
    if branch == 'Tanz':
        return 'ballet' if any(clean(c.get('namedPosition')) == 'Musikalische Leitung'
                               for c in e.get('contributor') or []) else None
    if branch == 'Konzert':
        return None if _SKIP_TITLE.search(name) else 'concert'
    if branch == 'Gastspiele':
        return 'concert' if _GUEST_OK.search(name) and not _GUEST_NO.search(name) \
            and not _SKIP_TITLE.search(name) else None
    return None


def fetch():
    url = API + '?' + urllib.parse.urlencode({'query': QUERY, 'operationName': 'events', 'variables': json.dumps({})})
    data = get_json(url)
    events_in = ((data or {}).get('data') or {}).get('events') or []
    rows = []
    for e in events_in:
        kind = _kind(e)
        if not kind or not e.get('identifier') or not e.get('startDate'):
            continue
        venue = stage(e.get('location'))
        if not venue:
            continue                                    # no stage: an open-air date outside Linz
        ref = clean(e.get('subjectOf'))
        rows.append({'sid': str(e['identifier']), 'title': clean(e.get('name')), 'start': e['startDate'],
                     'end': e.get('endDate'), 'kind': kind, 'venue': venue, 'e': e,
                     'page': PRODUCTION.format(ref=ref) if ref else None})
    log.info('landestheater_linz: %d dates in the API, %d kept', len(events_in), len(rows))
    concerts = [r for r in rows if r['kind'] == 'concert' and r['page']]
    details, previous = read_details(KEY, concerts, lambda u: parse_production(get(u)), every_days=7)
    out = []
    for r in rows:
        e = r['e']
        credits = api_credits(e)
        program = []
        composer = clean(e.get('composer'))
        if r['kind'] == 'opera' and composer and ',' not in composer and looks_like_person(composer, max_words=4):
            program = [(composer, r['title'])]
        if r['kind'] == 'concert':
            d, prev = details.get(r['page']), previous.get(r['sid'])
            for c in (d['credits'] if d else prev_credits(prev)):
                if c not in credits:
                    credits.append(c)
            program = d['program'] if d else prev_program(prev)
        typ = {'opera': 'vocal-opera', 'ballet': 'orchestral'}.get(r['kind'])
        series = None
        flags = [clean(x) for x in e.get('additionalType') or [] if clean(x)]
        if r['kind'] == 'concert' and re.match(r'#\w+', r['title']):
            series = 'Bruckner Orchester Linz'
        cancelled = bool(e.get('cancelled')) or looks_cancelled(r['title']) or any(looks_cancelled(x) for x in flags)
        try:
            out.append(make_event(
                KEY, r['sid'], r['title'], r['start'], end=r['end'], city='Linz', venueName=r['venue'], type=typ,
                series=series, credits=credits, program=program, ticketUrl=e.get('ticketlink'),
                url=r['page'] or SITE, status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('landestheater_linz %s: skipped: %s', r['sid'], err)
    return out
