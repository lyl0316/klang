"""Teatro La Fenice, Venice: opera, concerts, ballet and chamber music (Teatro La Fenice,
Teatro Malibran, Sale Apollinee) from the theatre's own calendar.

    https://www.teatrolafenice.it/calendario/        every performance of the current and next year (~0.9 MB)
    https://www.teatrolafenice.it/event/<slug>/      one page per production / concert

The calendar is one static page: a row per day (``data-list-id="MM-DD-YYYY"``) with one block per
performance: time (Venice local), category ("Opera 2026/27", "Concerti 2026/ 27", "Danza 2026/27",
"Musikàmera", "Ex Novo Ensemble" …), title, place and the link to the event page. wp-json answers
403, so the HTML is used.

Event pages (one request per production, read incrementally: a performance the previous feed
already has with its cast or programme keeps them; new productions first, then those playing in
the next two weeks and a weekly share of the others) are free text: "Direttore <strong>Name</strong>",
"<strong>Name</strong>, violino", a character name followed by "<strong>Singer</strong> (13, 15, 18
novembre 2026)" (each performance gets the singers announced for its date), "Orchestra e Coro del
Teatro La Fenice", and a PROGRAMMA block of "<strong>Composer</strong>" + work lines. The
per-date ticket link (vivaticket, ``data=YYYYMMDD``) is taken when the page lists it.

Skipped: talks (conferenze, Percorsi della danza), Fenice Education and school shows, children's
operas (the page says "opera per bambini", "Tariffa famiglia" or "programmazione Education", e.g.
Piccolo Orso, L'arca di Noè), the "Under 35" performances (sold to under-35s only), jazz/pop/
guest events (Veneto Jazz, "evento in collaborazione", "Altri"), tours (tournée), book
presentations, and ballets whose page names no conductor or orchestra (recorded music).

Checked against the website on 29 Oct 2026: 162 calendar performances from today, 125 kept
(Fedora 13 Nov 19:00 with Maria Agresta on 13/15/18/20/22 Nov and Rachele Stanisci on 14/17/19,
Frizza inaugural concert 28 Nov 20:00 with the Perosi programme, Joshua Bell 12 Nov 20:00 at the
Malibran, Les Étoiles 12 Dec with Paolo Paroni conducting).
"""
from __future__ import annotations

import html as _html
import re

from common import clean, get, infer_type, log, looks_cancelled, make_event, to_zurich_datetime, to_zurich_iso, \
    today_zurich

from ._italy_north import credit, date_notes, fold, group_role, house_groups, nice_name, plays_on, reuse, \
    role_en, with_details

KEY = 'teatro_la_fenice'
NAME = 'Teatro La Fenice'
SITE = 'https://www.teatrolafenice.it/'
ATTRIBUTION = 'Source: Teatro La Fenice (teatrolafenice.it)'
KIND = 'venue'
COUNTRY = 'italy'
MAX_REQUESTS = 80              # 1 calendar + one page per production (~40 a season)
TIME_LIMIT = 600

CALENDAR = 'https://www.teatrolafenice.it/calendario/'
CITY = 'Venice'
TZ = 'Europe/Rome'

_KEEP_CAT = re.compile(r'^(opera|concerti|danza \d|musikamera|ex novo ensemble)', re.I)
_PLACES = {
    'teatro la fenice': 'Teatro La Fenice', 'teatro malibran': 'Teatro Malibran',
    'sale apollinee': 'Teatro La Fenice, Sale Apollinee', 'basilica di san marco': 'Basilica di San Marco',
    'piazza san marco': 'Piazza San Marco',
}


# ---------------------------------------------------------------------------
# calendar
# ---------------------------------------------------------------------------

def parse_calendar(page):
    out = []
    for row in re.split(r'<div class="sn_calendar_block_list_row ', page or '')[1:]:
        m = re.match(r'[^"]*" data-list-month="\d+" data-list-year="\d+" data-list-id="(\d\d)-(\d\d)-(\d{4})"', row)
        if not m:
            continue
        day = f'{m.group(3)}-{m.group(1)}-{m.group(2)}'
        for g in re.split(r'class="sn_calendar_block_list_row_group_i"', row)[1:]:
            tm = re.search(r'class="time">\s*(\d{1,2}[:.]\d{2})', g)
            cat = re.search(r'class="category">(.*?)</div>', g, re.S)
            title = re.search(r'class="title">(.*?)</div>', g, re.S)
            place = re.search(r'class="place">(.*?)</div>', g, re.S)
            link = re.search(r'<a href="([^"]+)"', g)
            if not (tm and title and link):
                continue
            out.append({'day': day, 'time': tm.group(1).replace('.', ':'), 'cat': clean(cat.group(1)) if cat else '',
                        'title': clean(title.group(1)), 'place': clean(place.group(1)) if place else '',
                        'url': _html.unescape(link.group(1))})
    return out


# ---------------------------------------------------------------------------
# event pages
# ---------------------------------------------------------------------------

_BOLD = r'<(?:strong|b)\b[^>]*>'
_UNBOLD = r'</(?:strong|b)>'


def _lines(fragment):
    f = re.sub(r'(?is)<(script|style|svg)\b.*?</\1>', ' ', fragment)
    f = re.sub(r'(?i)(<br\s*/?>|</p>|<p[^>]*>|</h\d>|<h\d[^>]*>|<hr\s*/?>|</div>|<div[^>]*>|\|)', '\n', f)
    # a bold run broken by a line break ("<strong>Name<br /></strong>") ends on the same line
    f = re.sub(rf'({_BOLD})([^<\n]*)\n\s*({_UNBOLD})', r'\1\2\3\n', f)
    return [ln.strip() for ln in f.split('\n') if clean(ln)]


def _bold(line):
    m = re.search(rf'^(.*?){_BOLD}(.*?){_UNBOLD}(.*)$', line, re.S)
    if not m:
        return None
    return clean(m.group(1)), clean(m.group(2)), clean(m.group(3))


def _is_role(text):
    r = role_en(text)
    return r not in (None, 'Performer')


def _group(text, out):
    t = nice_name(text)
    if len(t) < 90 and not re.search(r'\d|\bop\.|\bper\b', t) and group_role(t):
        out['groups'] += house_groups(t)
        return True
    return False


def _people(lines, out):
    pending, last_bold = None, None
    for ln in lines:
        text = clean(ln)
        if len(text) > 140 or re.search(r'(?i)€|biglietter|vendit|acquist|durata|intervallo|ingresso|informazioni|'
                                        r'diretta su|foto ©|in coproduzione|allestimento|ruoli mancanti|'
                                        r'in collaborazione', text):
            pending = last_bold = None
            continue
        b = _bold(ln)
        if b is None:
            if last_bold and _is_role(text):                # "<strong>Name</strong>" + "violino" on the next line
                out['people'].append((text, nice_name(last_bold), None))
            elif _group(text, out):
                pending = None
            elif len(text) <= 60 and not re.search(r'\d', text) and not text.endswith('.'):
                pending = text                              # a character name; the singer follows
            last_bold = None
            continue
        before, name, after = b
        last_bold = None
        if not name:
            continue
        name_n, notes = date_notes(f'{name} {after}' if after.startswith('(') else name)
        if re.match(r'(?i)^musica di\b', before):
            out['composer'] = nice_name(f'{before[9:]} {name}'.strip())
        elif before and _is_role(name) and not _is_role(before):      # "Clémentine Margaine <strong>mezzosoprano</strong>"
            out['people'].append((name, nice_name(before), None))
        elif before:
            out['people'].append((before, nice_name(name_n), notes))
            pending = None
        elif after.startswith(','):
            out['people'].append((after.lstrip(', '), nice_name(name_n), notes))
        elif after and not after.startswith('(') and _is_role(after):  # "<strong>Joshua Bell</strong> violino"
            out['people'].append((after, nice_name(name_n), notes))
        elif pending is not None:
            out['people'].append((pending, nice_name(name_n), notes))     # keep the character for the next singer
        elif not _group(name, out):
            last_bold = name


_LIFE = re.compile(r'\s*\(\s*\d{4}\s*(?:[-–]\s*\d{4})?\s*\)')


def _programme(lines):
    works, composer, current = [], None, None
    for ln in lines:
        text = clean(ln)
        b = _bold(ln)
        plain_composer = (b is None and _LIFE.search(text) and _LIFE.sub('', text).strip()
                          and not re.search(r'[,;:]', _LIFE.sub('', text)) and len(text) < 90)
        if (b and not b[0] and b[1] and not re.search(r'\d{4}|ore\s+\d', b[1])) or plain_composer:
            composer = nice_name(_LIFE.sub('', b[1] if b else text).strip())
            current = None
            rest = re.sub(r'^[\s–—-]+', '', b[2]) if b else ''
            if rest:
                current = rest
                works.append([composer, rest])
            continue
        if not composer or not text or re.match(r'(?i)^(in occasione|nel \d|prima esecuzione|commissione|edizione|'
                                                r'versione|revisione|trascrizione di|a cura di)', text):
            continue
        if current is None:
            current = text
            works.append([composer, text])
        elif text[:1].islower() or text.startswith('('):
            works[-1][1] = f'{works[-1][1]} {text}'
        else:
            works[-1][1] = f'{works[-1][1]}; {text}'
    return [tuple(w) for w in works]


def parse_event(page, url=None):
    """-> {'people': [(role, name, notes)], 'groups': [(role, name)], 'works': [...], 'composer': str|None,
           'children': bool, 'tickets': {YYYYMMDD: url}}"""
    h = page or ''
    out = {'people': [], 'groups': [], 'works': [], 'composer': None, 'children': False, 'tickets': {}}
    for link, ymd in re.findall(r'href="(https://[^"]*vivaticket[^"]*data=(\d{8})[^"]*)"', h):
        out['tickets'].setdefault(ymd, _html.unescape(link))
    sec = re.search(r'<section class="sn_text_aside"(.*?)</section>', h, re.S)
    body = sec.group(1) if sec else ''
    low = fold(clean(body))
    out['children'] = bool(re.search(r'opera per bambini|tariffa famiglia|programmazione education|per le scuole|'
                                     r'riservato alle scuole|fenice education', low))
    left = re.search(r'sn_text_aside_tx">(.*?)<div class="col-xs-12', body, re.S)
    right = re.search(r'sn_text_aside_side">(.*)', body, re.S)
    if left:
        _people(_lines(left.group(1)), out)
    if right:
        head = re.search(r'<h2>(.*?)</h2>', right.group(1), re.S)
        block = re.search(r'sn_block_text[^"]*">(.*?)(?:<div class="sn_block sn_block_downloads|$)', right.group(1), re.S)
        lines = _lines(block.group(1)) if block else []
        composer_lines = sum(1 for ln in lines if _bold(ln) is None and _LIFE.search(clean(ln)))
        if (head and 'PROGRAMMA' in clean(head.group(1)).upper()) or composer_lines >= 2:
            out['works'] = _programme(lines)
        else:
            _people(lines, out)
    return out


# ---------------------------------------------------------------------------
# performances -> events
# ---------------------------------------------------------------------------

def _apply(c, d):
    day = to_zurich_datetime(c['start']).date()
    credits = list(d['groups'])
    for role, name, notes in d['people']:
        if plays_on(notes, day):
            cr = credit(role, name)
            if cr:
                credits.append(cr)
    c['credits'] = credits
    if d['works']:
        c['program'] = d['works']
    elif d['composer'] and c['kind'] in ('opera', 'danza'):
        c['program'] = [(d['composer'], c['title'])]
    c['children'] = d['children']
    c['ticket'] = d['tickets'].get(day.strftime('%Y%m%d')) or c['ticket']
    c['live'] = any(r in ('Conductor', 'Orchestra') for r, _ in credits)


def _type(c):
    if c['kind'] == 'opera':
        return 'vocal-opera'
    if c['kind'] == 'danza':
        return 'orchestral'
    return infer_type(c['title'], c['credits'], c['program']) or ('chamber' if c['kind'] == 'chamber' else 'orchestral')


def fetch():
    today = today_zurich().isoformat()
    rows = parse_calendar(get(CALENDAR))
    log.info('teatro_la_fenice: %d calendar performances', len(rows))
    cands, skipped = [], {}

    def skip(why):
        skipped[why] = skipped.get(why, 0) + 1

    for r in rows:
        if r['day'] < today:
            continue
        cat = fold(r['cat'])
        if not _KEEP_CAT.match(cat):
            skip(r['cat'] or 'no category')
            continue
        if re.search(r'(?i)riservato alle scuole|incontro con|percorsi della|presentazione', r['title']):
            skip('school / talk')
            continue
        place = _PLACES.get(fold(r['place']))
        if not place:
            skip(f"elsewhere ({r['place']})")
            continue
        kind = ('opera' if cat.startswith('opera') else 'danza' if cat.startswith('danza') else
                'chamber' if cat.startswith(('musikamera', 'ex novo')) else 'concert')
        slug = re.sub(r'^.*/event/|/$', '', r['url'])
        c = {'sid': f"{slug}-{r['day']}-{r['time'].replace(':', '')}", 'title': r['title'],
             'start': to_zurich_iso(f"{r['day']}T{r['time']}", assume=TZ), 'url': r['url'], 'page': r['url'],
             'kind': kind, 'venue': place, 'series': r['cat'] if kind in ('concert', 'chamber') else None,
             'credits': [], 'program': [], 'children': False, 'live': None, 'ticket': None,
             'cancelled': looks_cancelled(r['title'])}
        cands.append(c)
    if skipped:
        log.info('teatro_la_fenice: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))

    read = with_details(KEY, cands, parse_event, _apply,
                        first=lambda c: ('0' if c['kind'] == 'danza' else '1') + c['start'])
    log.info('teatro_la_fenice: %d event page(s) read', read)

    events = []
    for c in cands:
        if not c['detailed'] and c.get('prev'):
            old = reuse(c)
            c['credits'] = old.get('credits') or c['credits']
            c['program'] = old.get('program') or c['program']
            c['live'] = True
        if c['children']:
            log.info('teatro_la_fenice %s: children / education, skipped: %s', c['sid'], c['title'])
            continue
        if c['kind'] == 'danza' and not c['live']:
            log.info('teatro_la_fenice %s: dance without live music (or not read yet), skipped: %s', c['sid'], c['title'])
            continue
        try:
            events.append(make_event(
                KEY, c['sid'], c['title'], c['start'], city=CITY, venueName=c['venue'], type=_type(c),
                series=c['series'], credits=c['credits'], program=c['program'], ticketUrl=c['ticket'],
                url=c['url'], status='cancelled' if c['cancelled'] else 'scheduled'))
        except ValueError as err:
            log.warning('teatro_la_fenice %s: skipped: %s', c['sid'], err)
    return events
