"""Bühnen Bern: the Berner Symphonieorchester's concerts from buehnenbern.ch.

The concerts page (buehnenbern.ch/spielplan/konzerte/) lists each concert programme with
its date range. Each programme page has the individual dates ("Spieldaten": day, time and
hall, ticket link), the line-up ("Künstler*innen", name and function), the works and the
approximate length. One request per programme (about a dozen a season).

Guest performances elsewhere in Switzerland (e.g. Victoria Hall, Genf) are kept with their
own city; dates abroad, public rehearsals ("Öffentliche Probe") and school performances are
skipped.
"""
from __future__ import annotations

import html as htmllib
import re
import unicodedata
from urllib.parse import urljoin

from common import (FetchError, clean, get, guess_type, log, looks_cancelled, make_event, to_zurich_iso,
                    today_zurich)

KEY = 'buehnen_bern'
NAME = 'Bühnen Bern (Berner Symphonieorchester)'
SITE = 'https://buehnenbern.ch/'
ATTRIBUTION = 'Source: Bühnen Bern (buehnenbern.ch)'
KIND = 'orchestra'
TIME_LIMIT = 240

BASE = 'https://buehnenbern.ch'
LISTING = BASE + '/spielplan/konzerte/'
ORCHESTRA = 'Berner Symphonieorchester'
SKIP_RE = re.compile(r'in concert|game|gaming|film|einfuhrung|workshop|fuhrung|probe\b|generalprobe|schulkonzert')
CITY_HINTS = (('genf', 'Genève'), ('geneve', 'Genève'), ('geneva', 'Genève'), ('zurich', 'Zürich'), ('basel', 'Basel'),
              ('luzern', 'Luzern'), ('lausanne', 'Lausanne'), ('biel', 'Biel'), ('thun', 'Thun'),
              ('fribourg', 'Fribourg'), ('solothurn', 'Solothurn'), ('interlaken', 'Interlaken'), ('gstaad', 'Gstaad'))
ABROAD_RE = re.compile(r'\b(deutschland|germany|frankreich|france|italien|italy|osterreich|austria|wien|vienna|paris|'
                       r'berlin|munchen|hamburg|london|mailand|milano|madrid|amsterdam|prag|tokio|new york)\b')

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
                      r'choir|choeur|camerata|consort|kantorei|vokal|singknaben|sangerknaben|\bband\b|\bduo\b|solisten\b', re.I)
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
    if re.search(r'chor|choir|choeur|kantorei|vokal|vocal|singers|singknaben|sangerknaben|gesangverein', n):
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


def _roles(label, name):
    """'Violine und Leitung' -> ['Violin', 'Conductor']; a single label -> [its role]."""
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


def _productions(html):
    out = []
    for it in re.findall(r'<div class="cp-play-teaser-item[^"]*">(.*?)<div class="ticket-info">', html, re.S):
        h3 = re.search(r'<h3>(.*?)</h3>', it, re.S)
        link = re.search(r'href="([^"]+)" class="link-box"', it)
        info = re.search(r'class="added-info">(.*?)</div>', it, re.S)
        division = re.search(r'class="font-size-small division">(.*?)</div>', it, re.S)
        if not (h3 and link):
            continue
        dates = re.findall(r'(\d{2})\.(\d{2})\.(\d{4})', info.group(1) if info else '')
        last = max((f'{y}-{m}-{d}' for d, m, y in dates), default=None)
        out.append({'title': clean(h3.group(1)), 'url': urljoin(BASE, htmllib.unescape(link.group(1))),
                    'last': last, 'division': clean(division.group(1)) if division else ''})
    return out


def _section(html, heading):
    """HTML of the accordion section whose <h2> is `heading` (up to the next section)."""
    m = re.search(r'<h2>\s*' + re.escape(heading) + r'\s*</h2>(.*?)(?=<div id="[^"]+" class="cp-mob-only-acc-item|<footer)', html, re.S)
    return m.group(1) if m else ''


def _program(html):
    out = []
    block = _section(html, 'Programm')
    for para in re.findall(r'<p>(.*?)</p>', block, re.S):
        composer, buf = None, []
        lines = [ln for ln in re.split(r'<br\s*/?>', para) if clean(ln)]
        timed = any(_DUR_RE.search(clean(ln)) for ln in lines)
        for line in lines:
            text = clean(line)
            strong = re.search(r'<strong>(.*?)</strong>', line, re.S)
            if strong:
                if composer and buf:
                    out.append((composer, _work(' '.join(buf))))
                name = clean(strong.group(1))
                name = re.sub(r'\s*\(\s*\*?\s*\d{4}(?:\s*[–-]\s*\d{0,4})?\s*\)', '', name).strip()
                rest = clean(re.sub(r'<strong>.*?</strong>', ' ', line, flags=re.S))
                composer, buf = name or None, [rest] if rest else []
                continue
            if not composer or len(text) > 200 or re.match(r'(pause|ca\.|dauer)', text, re.I):
                continue
            buf.append(text)
            # a work ends with its playing time "(35')"; without those, every line is a work
            if not timed or _DUR_RE.search(text):
                out.append((composer, _work(' '.join(buf))))
                buf = []
        if composer and buf:
            out.append((composer, _work(' '.join(buf))))
    return [(c, t) for c, t in out if t]


_DUR_RE = re.compile(r"\(\s*(?:ca\.\s*)?\d+\s*['’′]\s*\)\s*$")


def _work(text):
    """'Symphonie Nr. 2 D-Dur op. 73 (1877) (40')' -> 'Symphonie Nr. 2 D-Dur op. 73 (1877)'"""
    return re.sub(r"\s*\(\s*(?:ca\.\s*)?\d+\s*['’′]\s*\)\s*$", '', text).strip()


def _cast(html):
    credits = []
    block = _section(html, 'Künstler*innen') or _section(html, 'Künstler')
    for item in re.findall(r'<div class="el-ensemble-item">(.*?)</div>\s*</div>', block, re.S):
        name = re.search(r'<h3 class="name">(.*?)</h3>', item, re.S)
        func = re.search(r'<p class="function">(.*?)</p>', item, re.S)
        name = clean(name.group(1)) if name else ''
        for role in (_roles(clean(func.group(1)) if func else '', name) if name else []):
            credits.append((role, name))
    return credits


def _duration(html):
    m = re.search(r'icon-hour"></i>\s*ca\.\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*min)?', html)
    if not m or not (m.group(1) or m.group(2)):
        return None
    return int(m.group(1) or 0) * 60 + int(m.group(2) or 0)


def _dates(html):
    out = []
    block = _section(html, 'Spieldaten')
    for item in re.split(r'<div class="cp-calendar-item', block)[1:]:
        date = re.search(r'class="h3 date">\s*(\d{2})\.(\d{2})\.(\d{4})', item)
        time = re.search(r'class="h3 time">\s*(\d{1,2})[:.](\d{2})', item)
        loc = re.search(r'class="font-size-small location">(.*?)</div>', item, re.S)
        name = re.search(r'class="h3 play-name">(.*?)</div>', item, re.S)
        infos = [clean(x) for x in re.findall(r'class="font-size-small info-text">(.*?)</div>', item, re.S)]
        ticket = re.search(r'href="(https://tickets\.buehnenbern\.ch/[^"]+)"', item)
        if not (date and time):
            continue
        d, mo, y = date.groups()
        out.append({'date': f'{y}-{mo}-{d}', 'time': f'{int(time.group(1)):02d}:{time.group(2)}',
                    'location': clean(loc.group(1)) if loc else '', 'name': clean(name.group(1)) if name else '',
                    'infos': infos, 'ticket': htmllib.unescape(ticket.group(1)) if ticket else None,
                    'cancelled': looks_cancelled(clean(item))})
    return out


def _venue(location):
    """'Casino Bern Grosser Saal' -> ('Casino Bern, Grosser Saal', 'Bern'); 'Victoria Hall, Genf' -> ('Victoria Hall', 'Genève')"""
    loc = clean(location)
    f = _fold(loc)
    for hint, city in CITY_HINTS:
        if re.search(r'\b' + hint + r'\b', f):
            name = re.sub(r',?\s*\b(genf|geneve|genève|geneva)\b\s*$', '', loc, flags=re.I).strip(' ,') or loc
            return name, city
    m = re.match(r'^(Casino Bern|Stadttheater(?: Bern)?|Vidmar(?:hallen)?)\s+(.+)$', loc)
    if m:
        return f'{m.group(1)}, {m.group(2)}', 'Bern'
    return loc or None, 'Bern'


def fetch():
    today = today_zurich().isoformat()
    events = []
    productions = [p for p in _productions(get(LISTING))       # FetchError propagates
                   if (p['last'] or today) >= today and not SKIP_RE.search(_fold(p['title']))]
    for prod in productions:
        try:
            page = get(prod['url'])
        except FetchError as err:
            log.warning('%s: no details for %s: %s', KEY, prod['url'], err)
            continue
        credits = _cast(page)
        if not any(n == ORCHESTRA for _, n in credits) and _fold(prod['division']).startswith('berner symphonie'):
            credits.append(('Orchestra', ORCHESTRA))
        program = _program(page)
        duration = _duration(page)
        slug = prod['url'].rstrip('/').rsplit('/', 1)[-1]
        for d in _dates(page):
            if d['date'] < today or ABROAD_RE.search(_fold(d['location'])):
                continue
            if any(re.search(r'probe\b|generalprobe|schulkonzert|schulvorstellung', _fold(x)) for x in d['infos']):
                continue                                       # public rehearsals, school performances
            venue, city = _venue(d['location'])
            series = next((x for x in d['infos'] if re.search(r'konzert|abo|zyklus|reihe', x, re.I)
                           and not re.search(r'einfuhrung|einführung', x, re.I)), None)
            title = d['name'] or prod['title']
            kind = 'vocal-opera' if guess_type(title + ' ' + ' '.join(t for _, t in program)) == 'vocal-opera' \
                and re.search(r'chor|oper|carmina|requiem|messe', _fold(title)) else infer_type(title, credits)
            try:
                events.append(make_event(
                    KEY, f"{slug}-{d['date']}-{d['time'].replace(':', '')}", title,
                    to_zurich_iso(f"{d['date']}T{d['time']}:00"), durationMin=duration,
                    city=city, venueName=venue, type=kind, series=series,
                    credits=credits, program=program, ticketUrl=d['ticket'], url=prod['url'],
                    status='cancelled' if d['cancelled'] else 'scheduled'))
            except ValueError as err:
                log.warning('%s: skipped %s %s: %s', KEY, slug, d['date'], err)
    return events
