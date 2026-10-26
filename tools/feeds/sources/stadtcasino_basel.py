"""Stadtcasino Basel: classical concerts from the hall's programme.

The listing (stadtcasino-basel.ch/de/programm/veranstaltungen/?c=1, the "Klassik" rubric)
shows day and month, title, subtitle, ticket link and event page, but no year, start time
or hall. Those are on the event page ("Beginn 19.30 h", "Musiksaal"), together with a
free-text line-up and programme that is read conservatively (lines like "<b>Name,</b>
Violine" and "<b>Composer</b> / work title").

About 90 classical dates a season but at most 60 requests per run: event pages are fetched
for new dates first and then for the soonest ones. A date whose page is not fetched this
run keeps the facts it had in the previously published Klang feed (read once per run;
set KLANG_FEEDS_PREVIOUS=none to skip that); a date that was never fetched is left out
until a later run reaches it.

Skipped: public rehearsals, school concerts, film/pop/crossover shows and galas. The
Sinfonieorchester Basel's own concerts are kept but fetched last: the `sob` reader usually
lists them too, and build.py's de-duplication keeps the orchestra's record.
"""
from __future__ import annotations

import html as htmllib
import os
import re
import unicodedata
from datetime import date, timedelta
from urllib.parse import urljoin

from common import (FetchError, clean, get, get_json, guess_type, log, looks_cancelled, make_event,
                    requests_left, to_zurich_iso, today_zurich)

KEY = 'stadtcasino_basel'
NAME = 'Stadtcasino Basel'
SITE = 'https://www.stadtcasino-basel.ch/'
ATTRIBUTION = 'Source: Stadtcasino Basel (stadtcasino-basel.ch)'
KIND = 'venue'
TIME_LIMIT = 300

BASE = 'https://www.stadtcasino-basel.ch'
LISTING = BASE + '/de/programm/veranstaltungen/?c=1'
PREVIOUS_FEED = 'https://lyl0316.github.io/klang/data/concerts.json'
VENUE = 'Stadtcasino Basel'
SKIP_RE = re.compile(r'generalprobe|poschner probiert|schulkonzert|in concert|filmmusik|\bfilm\b|cinema|pop meets|star wars|james bond|home alone|'
                     r'disney|einaudi|tango|40 fingers|branduardi|\bproms\b|\bgala\b|balkan|mnozil|symphonic rock|'
                     r'harry potter|\bqueen\b|\babba\b|musical|blind symphony|comedy|lesung|vortrag|kayhan kalhor')
SOB_TICKETS = re.compile(r'sinfonieorchesterbasel\.ch', re.I)
SERIES_RE = re.compile(r'^(amg\b|kg-|volkssinfonie|kammermusik basel|kammermusik um halb acht|sunday concerts|'
                       r'mizmorim)', re.I)
MONTHS = {'jan': 1, 'feb': 2, 'mar': 3, 'mär': 3, 'maer': 3, 'apr': 4, 'mai': 5, 'may': 5, 'jun': 6, 'jul': 7,
          'aug': 8, 'sep': 9, 'okt': 10, 'oct': 10, 'nov': 11, 'dez': 12, 'dec': 12}

# ---------------------------------------------------------------------------
# roles (German labels -> Klang's English roles) and a type guess from the line-up
# ---------------------------------------------------------------------------

ROLE_RULES = tuple((re.compile(p), r) for p, r in (
    (r'vortrag|referent|vortragende|gesprach|talk\b|lecture', 'Speaker'),
    (r'chorleitung|choreinstudierung|einstudierung|chordirektor|chorus ?master', 'Chorus master'),
    (r'leitung|dirigent|conductor|\bdirection\b', 'Conductor'),
    (r'konzertmeister', 'Violin'),
    (r'quartett|quartet|quintett|quintet|sextett|sextet|oktett|octet|ensemble|\btrio\b', 'Ensemble'),
    (r'saxophon', 'Saxophone'),
    (r'mezzo', 'Mezzo-soprano'),
    (r'sopran', 'Soprano'),
    (r'countertenor|\baltus\b', 'Countertenor'),
    (r'bass-?bariton', 'Bass-baritone'),
    (r'bariton|baryton', 'Baritone'),
    (r'tenor', 'Tenor'),
    (r'kontrabass|double bass', 'Double bass'),
    (r'violoncell|cell[oi]', 'Cello'),
    (r'viola\b|violen\b|bratsche', 'Viola'),
    (r'violl?in|geige', 'Violin'),
    (r'hammerklavier|fortepiano', 'Fortepiano'),
    (r'klavier|piano|flugel', 'Piano'),
    (r'cembalo|harpsichord', 'Harpsichord'),
    (r'orgel|organ\b', 'Organ'),
    (r'harfe|harp\b', 'Harp'),
    (r'laute|theorbe|lute\b', 'Lute'),
    (r'gitarre|guitar', 'Guitar'),
    (r'akkordeon|accordion|bandoneon', 'Accordion'),
    (r'blockflote|recorder', 'Recorder'),
    (r'flote|flute', 'Flute'),
    (r'oboe', 'Oboe'),
    (r'englischhorn|cor anglais', 'Cor anglais'),
    (r'klarinette|clarinet', 'Clarinet'),
    (r'fagott|bassoon', 'Bassoon'),
    (r'trompete|trumpet', 'Trumpet'),
    (r'posaune|trombone', 'Trombone'),
    (r'tuba', 'Tuba'),
    (r'horn', 'Horn'),
    (r'pauke|timpani', 'Timpani'),
    (r'schlagzeug|perkussion|percussion', 'Percussion'),
    (r'\balt\b|\balto\b', 'Alto'),
    (r'\bbass\b', 'Bass'),
    (r'stimme|gesang|sanger|vocals?\b|voice', 'Voice'),
    (r'sprecher|erzahler|rezitation|narrat|lesung', 'Narrator'),
    (r'moderation|moderator|host\b', 'Host'),
    (r'chor|choir|vokalensemble', 'Choir'),
    (r'orchester|orchestra', 'Orchestra'),
    (r'\bband\b', 'Ensemble'),
    (r'regie|inszenierung|stage director|szenische', 'Director'),
    (r'choreogra', 'Choreographer'),
    (r'tanz|dance', 'Dancer'),
    (r'schauspiel|actor|actress', 'Actor'),
    (r'puppenspiel', 'Puppeteer'),
    (r'komposition|komponist|composer', 'Composer'),
    (r'arrangement|bearbeitung', 'Arranger'),
    (r'solist', 'Soloist'),
    (r'^spiel$|mitwirkende|^besetzung$|interpret', 'Performer'),
    (r'buhne|kostum|licht|dramaturg|produktion|video|maske|ausstattung|technik|sounddesign|'
     r'textfassung|konzept|idee|assistenz|inspizienz|souffl', None),       # crew: not listed
))
GROUP_RE = re.compile(r'orchest|sinfoni|symphon|philharm|kollegium|collegium|gesangverein|ensemble|quartet|quartett|\btrio\b|quintet|\bchor|chor\b|'
                      r'choir|choeur|camerata|consort|kantorei|[ck]antorey|cantorei|capp?ella|vokal|singknaben|sangerknaben|\bband\b|\bduo\b|solisten\b|'
                      r'\bconcert\b|\bconcerto\b|academy|akademie|sinfonietta|\bbarock\b|\bbaroque\b|\bcetra\b|florissants|giardino', re.I)
VOICES = {'Soprano', 'Mezzo-soprano', 'Alto', 'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass', 'Voice'}
INSTRUMENT_ROLES = {'Violin', 'Viola', 'Cello', 'Double bass', 'Piano', 'Fortepiano', 'Harpsichord', 'Organ', 'Harp', 'Lute',
                    'Guitar', 'Accordion', 'Recorder', 'Flute', 'Oboe', 'Cor anglais', 'Clarinet', 'Bassoon', 'Saxophone',
                    'Trumpet', 'Trombone', 'Tuba', 'Horn', 'Timpani', 'Percussion', 'Soprano', 'Mezzo-soprano', 'Alto',
                    'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass', 'Voice'}
NON_PLAYING = {'Speaker', 'Conductor', 'Chorus master', 'Director', 'Choreographer', 'Composer', 'Arranger', 'Host'}


def _fold(text):
    s = unicodedata.normalize('NFKD', str(text or '')).replace('ß', 'ss')
    return ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()


def _group_role(name):
    n = _fold(name)
    if re.match(r'(ensemble|solist|mitglieder|members|musiker)', n):
        return 'Ensemble'
    if 'orchest' in n:
        return 'Orchestra'
    if re.search(r'chor|choir|choeur|kantorei|[ck]antorey|cantorei|vokal|vocal|singers|singknaben|sangerknaben|gesangverein', n):
        return 'Choir'
    if re.search(r'sinfoni|symphon|philharm|camerata|kollegium|collegium|streicher', n):
        return 'Orchestra'
    return 'Ensemble'


def role_for(label, name=''):
    """Klang role for a German/English role label, or None for crew we do not list."""
    f = _fold(clean(label))
    if f:
        for rx, role in ROLE_RULES:
            if rx.search(f):
                if role in ('Performer', 'Soloist') and name and GROUP_RE.search(_fold(name)):
                    return _group_role(name)
                if role == 'Orchestra' and re.match(r'(musiker|cellist|mitglied|solist|blaser|streicher|members)', _fold(name)):
                    return 'Ensemble'                     # 'Cellist*innen des SOB': players of the orchestra
                return role
    if name and GROUP_RE.search(_fold(name)):
        return _group_role(name)
    if f and len(f) <= 30:
        return clean(label)[0].upper() + clean(label)[1:]
    return 'Performer'


def infer_type(title, credits, hint=None):
    """orchestral / chamber / recital / vocal-opera from title and line-up (None if unsure)."""
    t = guess_type(title)
    if t == 'vocal-opera':
        return t
    roles = [r for r, _ in credits]
    if 'Conductor' in roles or 'Orchestra' in roles:
        return 'orchestral' if 'Choir' not in roles else 'vocal-opera'
    if 'Choir' in roles:
        return 'vocal-opera'
    players = [r for r in roles if r not in NON_PLAYING]
    if len(players) == 1 and players[0] not in ('Ensemble', 'Performer'):
        return 'recital'
    if len(players) == 2 and (set(players) & VOICES) and 'Piano' in players:
        return 'recital'
    if 2 <= len(players) <= 9 or 'Ensemble' in roles:
        return 'chamber'
    return t or hint


def _month(text):
    t = _fold(text)[:3]
    return MONTHS.get(t) or MONTHS.get(_fold(text)[:4])


def _items(html, today):
    """Listing entries in page order; the year is inferred from the running month sequence."""
    out = []
    body = html.split('tiles-wrapper', 1)[1] if 'tiles-wrapper' in html else html
    year, last_month = today.year, None
    for block in re.split(r'<div class="event">', body)[1:]:
        day = re.search(r'class="day">(.*?)</span>', block, re.S)
        mon = re.search(r'class="month">(.*?)</span>', block, re.S)
        link = re.search(r'<a href="([^"]+)">\s*<h2>(.*?)</h2>\s*(?:<p>(.*?)</p>)?', block, re.S)
        if not (day and mon and link):
            continue
        try:
            d, m = int(clean(day.group(1))), _month(clean(mon.group(1)))
        except ValueError:
            continue
        if not m:
            continue
        if last_month is not None and m < last_month:
            year += 1
        elif last_month is None and date(year, m, 1) < date(today.year, today.month, 1) - timedelta(days=200):
            year += 1
        last_month = m
        try:
            day_ = date(year, m, d)
        except ValueError:
            continue
        ticket = re.search(r'href="(https?://[^"]+)"[^>]*>\s*Tickets', block)
        url = urljoin(BASE, htmllib.unescape(link.group(1)))
        out.append({'url': url, 'sid': url.rstrip('/').rsplit('/', 1)[-1], 'day': day_,
                    'title': clean(link.group(2)), 'subtitle': clean(link.group(3) or ''),
                    'ticket': htmllib.unescape(ticket.group(1)) if ticket else None,
                    'cancelled': looks_cancelled(clean(block))})
    return out


_PERSON_RE = re.compile(r"^[A-ZÀ-ÖØ-Þ][\w'’.\-]+(?:\s+(?:von|van|de|da|di|del|der|le|la|y|zu|[A-ZÀ-ÖØ-Þ][\w'’.\-]+)){1,4}$")
_NN_RE = re.compile(r'^(n\.?\s*n\.?|tba|tbd|nn|weitere)$', re.I)
_DATES_RE = re.compile(r'^\(?\s*\*?\s*\d{4}\s*(?:[–-]\s*(?:\d{4})?)?\s*\)?$')


_ROLE_STEMS = ('solo', 'und', 'leitung', 'dirig', 'musikalisch', 'violin', 'viola', 'violen', 'violoncell', 'cello', 'kontrabass',
               'klavier', 'piano', 'flot', 'oboe', 'klarinett', 'fagott', 'horn', 'trompet', 'posaun', 'tuba', 'harfe',
               'orgel', 'cembalo', 'gitarre', 'schlagzeug', 'perkussion', 'sopran', 'mezzo', 'alt', 'tenor', 'bariton',
               'bass', 'gesang', 'stimme', 'sprecher', 'moderation', 'akkordeon', 'saxophon', 'laute', 'blockflot',
               'hammer', 'fortepiano', 'konzertmeist', 'countertenor', 'kontratenor', 'continuo', 'chor', 'erzahl',
               'rezit', 'einstudier', 'marimba', 'vibraphon', 'theorb', 'bandoneon', 'englischhorn', 'pauke')


def _role_text(text):
    """'Tenor (Evangelist)' -> 'Tenor': a part in brackets after a role label is the singer's
    part. Brackets with digits ('(1925)') belong to a work title and are kept."""
    text = text or ''
    m = re.fullmatch(r'\s*([^()]{2,40}?)\s*\(([^()\d]{2,40})\)\s*[:,]?\s*', text)
    return (m.group(1) if m else text).strip(' :,')


_WORK_WORDS = re.compile(r'trio|quartett|quintett|sextett|oktett|konzert|sonate|sonatine|stuck|suite|variation|fantasi|'
                         r'sinfonie|symphonie|lieder|werke|opus|\bop\b|partita|serenade|rhapsod|ballade|etude|prelude|nocturne')


def _roles(label, name):
    """'Hammerklavier und Leitung' -> ['Fortepiano', 'Conductor']; a single label -> [its role]."""
    label = _role_text(label)
    parts = [p.strip() for p in re.split(r'\s+(?:und|&)\s+|\s*/\s*', clean(label)) if p.strip()]
    if len(parts) > 1 and all(any(rx.search(_fold(p)) for rx, _ in ROLE_RULES) for p in parts):
        roles = []
        for p in parts:
            r = role_for(p, name)
            if r and r not in roles:
                roles.append(r)
        return roles
    role = role_for(label, name)
    return [role] if role else []


def _is_role_label(text):
    """'Solo-Violine und Leitung:' / 'Violoncello' - a line that only names a role."""
    text = _role_text(text)
    if _WORK_WORDS.search(_fold(text)):           # 'Klaviertrio', 'Violinkonzert': a work, not a role
        return False
    words = re.findall(r'[a-z]+', _fold(text))
    return 0 < len(words) <= 5 and all(w.startswith(_ROLE_STEMS) for w in words) and len(text) <= 45


def _lineup(html):
    """-> credits, program from the free-text columns (conservative)."""
    credits, program = [], []
    body = html.split('<div class="searchable">', 1)[1] if '<div class="searchable">' in html else ''
    body = body.split('<div class="event detail">', 1)[0]
    # '<strong><br>Ferruccio Busoni</strong>': move line breaks out of bold text first
    body = re.sub(r'(<(?:strong|b)\b[^>]*>)((?:\s|<br\s*/?>)+)', r'\2\1', body)
    body = re.sub(r'((?:\s|<br\s*/?>)+)(</(?:strong|b)>)', r'\2\1', body)
    paras = re.findall(r'<p\b[^>]*>(.*?)</p>', body, re.S)
    composer = None
    for para in paras:
        if len(clean(para)) > 160:                     # prose: never copied, ends a composer's works
            composer = None
            continue
        for line in re.split(r'<br\s*/?>', para):
            text = clean(line)
            if not text:
                continue
            strong = clean(' '.join(re.findall(r'<(?:strong|b)\b[^>]*>(.*?)</(?:strong|b)>', line, re.S)))
            rest = clean(re.sub(r'<(strong|b)\b[^>]*>.*?</\1>', ' ', line, flags=re.S))
            if strong:
                name = strong.strip(' ,-–:')                # '<b>Antonio Vivaldi - </b>Die vier Jahreszeiten'
                tail = rest.strip(' ,')
                if _NN_RE.match(name):                      # '<b>N. N.</b>, Klavier': not announced yet
                    composer = None
                    continue
                if tail and not _DATES_RE.match(tail) and len(tail) <= 40 and ',' in (strong + ' ' + rest)[:len(strong) + 3]:
                    roles = _roles(tail, name)           # '<b>Silvia Careddu, </b>Flöte'
                    if roles and (_is_role_label(tail) or roles[0] in ('Choir', 'Orchestra', 'Ensemble', 'Chorus master')):
                        parts = [p.strip() for p in name.split(',') if p.strip()]
                        names = parts if len(parts) > 1 and all(_PERSON_RE.match(p) for p in parts) else [name]
                        m = re.fullmatch(r'([^,\s]+(?:\s+[^,\s]+)*),\s*([^,\s]+)', name) if len(names) == 1 else None
                        if m:                             # 'Elvekjær, Jens' / 'Jens Peter, Maintz'
                            names = [f'{m.group(2)} {m.group(1)}' if ' ' not in m.group(1) else f'{m.group(1)} {m.group(2)}']
                        for n in names:                   # '<b>Lora Markova, Wojciech Koprowski,</b> Violine'
                            if not _NN_RE.match(n):
                                credits.extend((role, n) for role in roles)
                        composer = None
                        continue
                m = re.fullmatch(r'(.{3,60}?),\s*([^,]{3,40})', name) if not tail else None
                if m and _PERSON_RE.match(m.group(1)) and _is_role_label(m.group(2)):
                    for role in _roles(m.group(2), m.group(1)):   # '<b>Christian Knüsel, Dirigent</b>'
                        credits.append((role, m.group(1)))
                    composer = None
                    continue
                if GROUP_RE.search(_fold(name)) and not tail and len(name.split()) <= 6 and not re.search(r'\s[–-]\s|[.!?]$', name):
                    credits.append((_group_role(name), name))         # not a bold tagline ('Festlich beschwingt – ...')
                    composer = None
                    continue
                if _PERSON_RE.match(name) and tail and _is_role_label(tail):
                    for role in _roles(tail, name):       # '<b>Ilya Gringolts</b> Violine und Leitung'
                        credits.append((role, name))
                    composer = None
                    continue
                if _PERSON_RE.match(name) and (not tail or _DATES_RE.match(tail) or re.match(r'^\(?\s*geb\.', tail)):
                    composer = name                       # '<b>Joseph Haydn</b> (1732–1809)'
                    continue
                if _PERSON_RE.match(name) and tail and composer is None and len(tail) <= 120:
                    program.append((name, tail))          # '<b>Charles Ives</b> Unanswered Question' on one line
                    continue
                composer = None
                continue
            if re.match(r'^\(?\s*(geb\.|\*)?\s*\d{4}\b', text) or re.match(r'^(konzert)?dauer\b', text, re.I) or \
                    re.match(r'^(ur|erst|schweizer erst|europäische erst)aufführung\b|^auftragswerk|^kompositionsauftrag', text, re.I):
                continue                                  # '(geb. 1972)', 'Konzertdauer: ca. 95 min', 'Uraufführung'
            if composer and _is_role_label(text):         # '<b>Vladik Otaryan</b><br>Solo-Violine und Leitung:'
                for role in _roles(text, composer):
                    credits.append((role, composer))
                composer = None
                continue
            m = re.fullmatch(r'(.+?)\s+\(?\*?\s*\d{4}\s*[–-]\s*(?:\d{4})?\s*\)?', text)
            if m and _PERSON_RE.match(m.group(1)):        # 'Dmitrij Schostakowitsch 1906-1975' without bold
                composer = m.group(1)
                continue
            if composer and len(text) <= 160 and not re.match(r'^(\d{1,2}[.:]\d{2}\s*uhr|in kooperation|pause)', text, re.I):
                if re.match(r'^[a-zäöüéè]', text):           # 'Seis diferencias' + 'sobre «O gloriosa Domina»'
                    if program and program[-1][0] == composer and len(program[-1][1]) + len(text) < 200:
                        program[-1] = (composer, f'{program[-1][1]} {text}')
                    continue
                program.append((composer, text))
    return credits, program


def _details(url):
    html = get(url)
    d = html.split('<div class="event detail">', 1)[1] if '<div class="event detail">' in html else ''
    m = re.search(r'col-md-6 text-center">(.*?)</ul>', d, re.S)
    block = m.group(1) if m else ''
    day = re.search(r'class="day">\s*(\d{1,2})\s*</span>', block)
    month = re.search(r'class="month">\s*([A-Za-zÄÖÜäöü]+)\s+(\d{4})\s*</span>', block)
    lis = [clean(x) for x in re.findall(r'<li>(.*?)</li>', block, re.S)]
    t = next((re.search(r'(\d{1,2})[.:](\d{2})', x) for x in lis if re.match(r'beginn', x, re.I)), None)
    hall = next((x for x in lis if re.search(r'saal|foyer|quartier|halle|hof\b', x, re.I)), None)
    start = None
    if day and month and t and _month(month.group(1)):
        start = to_zurich_iso(f'{int(month.group(2)):04d}-{_month(month.group(1)):02d}-{int(day.group(1)):02d}'
                              f'T{int(t.group(1)):02d}:{t.group(2)}:00')
    credits, program = _lineup(html)
    h1 = re.search(r'<h1>(.*?)</h1>', html, re.S)
    return {'start': start, 'hall': hall, 'credits': credits, 'program': program,
            'cancelled': bool(re.search(r'\b(abgesagt|annulliert|fällt aus)\b', clean(h1.group(1) if h1 else ''), re.I))}


_ORCH_TITLE_RE = re.compile(r'orchest|philharm|sinfoni|symphon|camerata|chamber academy|barockorchester')


def _type(title, credits):
    """infer_type, but an orchestra named in the title makes it orchestral (soloist + orchestra)."""
    kind = infer_type(title, credits)
    if kind in (None, 'recital', 'chamber') and _ORCH_TITLE_RE.search(_fold(title)) and \
            not re.search(r'quartet|quartett|trio\b|ensemble\b|solisten sextett|sextett', _fold(title)):
        return 'orchestral'
    return kind


def _previous():
    """This reader's events in the last published feed, by event URL (rolling detail cache)."""
    src = os.environ.get('KLANG_FEEDS_PREVIOUS', PREVIOUS_FEED).strip()
    if not src or src.lower() in ('none', 'off', 'no'):
        return {}
    try:
        if re.match(r'https?://', src, re.I):
            data = get_json(src)
        else:
            import json
            with open(src, encoding='utf-8') as f:
                data = json.load(f)
    except (FetchError, OSError, ValueError) as err:
        log.info('%s: no previous feed to reuse (%s)', KEY, err)
        return {}
    out = {}
    for e in (data.get('concerts') or []) if isinstance(data, dict) else []:
        if isinstance(e, dict) and e.get('source') == KEY and e.get('url') and e.get('start'):
            out[(e['url'], e['start'][:10])] = e
    return out


def _title(it):
    if it['subtitle'] and SERIES_RE.match(it['subtitle']):
        return it['title'], it['subtitle']
    if it['subtitle'] and _fold(it['subtitle']) not in _fold(it['title']):
        return f"{it['title']} – {it['subtitle']}", None
    return it['title'], None


def fetch():
    today = today_zurich()
    items, seen = [], set()
    for it in _items(get(LISTING), today):           # FetchError propagates
        text = _fold(' '.join([it['title'], it['subtitle']]))
        if it['day'] < today or SKIP_RE.search(text):
            continue
        if (it['url'], it['day']) in seen:
            continue
        if any(u == it['url'] for u, _ in seen):         # one page used for two dates: keep the ids apart
            it = dict(it, sid=f"{it['sid']}-{it['day'].isoformat()}")
        seen.add((it['url'], it['day']))
        items.append(it)

    previous = _previous() if items else {}
    # new dates first (the orchestra's own concerts last: the `sob` reader usually has them, and
    # build.py keeps its record), then the soonest known ones again to pick up changes
    order = sorted(items, key=lambda it: ((it['url'], it['day'].isoformat()) in previous,
                                          bool(it['ticket'] and SOB_TICKETS.search(it['ticket'])), it['day']))
    fetched = {}
    for it in order:
        if requests_left() <= 0:
            break
        try:
            fetched[(it['url'], it['day'])] = _details(it['url'])
        except FetchError as err:
            log.warning('%s: no details for %s: %s', KEY, it['url'], err)

    events = []
    for it in sorted(items, key=lambda it: it['day']):
        title, series = _title(it)
        det = fetched.get((it['url'], it['day']))
        if det is None:
            old = previous.get((it['url'], it['day'].isoformat()))
            if old is None:
                continue                                 # no start time known yet
            try:
                events.append(make_event(
                    KEY, it['sid'], title, old['start'], durationMin=old.get('durationMin'),
                    city=old.get('city') or 'Basel', venueName=old.get('venueName') or VENUE,
                    type=old.get('type'), series=series, credits=old.get('credits'), program=old.get('program'),
                    ticketUrl=it['ticket'] or old.get('ticketUrl'), url=it['url'],
                    status='cancelled' if it['cancelled'] or old.get('status') == 'cancelled' else 'scheduled'))
            except ValueError as err:
                log.warning('%s: skipped %s: %s', KEY, it['sid'], err)
            continue
        if not det['start']:
            log.warning('%s: no start time on %s', KEY, it['url'])
            continue
        start = det['start']
        if start[5:10] == it['day'].isoformat()[5:10] and start[:4] != it['day'].isoformat()[:4]:
            log.warning('%s: listing year guessed %s but page says %s (%s)', KEY, it['day'], start, it['url'])
        elif start[:10] != it['day'].isoformat():        # one page for two dates: the listing's day, the page's time
            log.warning('%s: listing day %s but page says %s (%s)', KEY, it['day'], start, it['url'])
            start = to_zurich_iso(f"{it['day'].isoformat()}T{start[11:16]}:00")
        venue = f"{VENUE}, {det['hall']}" if det['hall'] else VENUE
        try:
            events.append(make_event(
                KEY, it['sid'], title, start, city='Basel', venueName=venue,
                type=_type(title, det['credits']), series=series,
                credits=det['credits'], program=det['program'], ticketUrl=it['ticket'], url=it['url'],
                status='cancelled' if it['cancelled'] or det['cancelled'] else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, it['sid'], err)
    return events
