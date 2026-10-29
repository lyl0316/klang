"""Staatsoper Hamburg: opera, ballet with live orchestra and the Philharmonisches
Staatsorchester's concerts from the house's own calendar (HTML).

    https://www.die-hamburgische-staatsoper.de/de/kalender      the whole season on one page
    https://www.die-hamburgische-staatsoper.de/de/programm/ballett/<id-slug>
                                         one page per ballet production (forwards to the
                                         hamburgballett. subdomain; robots.txt "Allow: /")

staatsoper-hamburg.de and staatsorchester-hamburg.de now only forward to
die-hamburgische-staatsoper.de (robots.txt there: "Allow: /"). The calendar page (about
3.4 MB) holds every performance of the season, day by day (October 2026 .. July 2027 when
checked against the website on 29 Oct 2026: 458 entries). Each entry has the date
("Fr 30.10.26") and time ("19:30", Hamburg local time), the room ("Staatsoper, Großes Haus",
"Elbphilharmonie, Großer Saal", "Kuppel Hamburg" …), a category (Oper / Ballett / Konzert, or
none for festival side events), the title and subtitle (the composer for an opera, the
choreographer for a ballet), the ticket-shop link and an .ics link whose number is the
performance id. Its fold-out adds that evening's facts: labelled credits ("Musikalische
Leitung", "Dirigent", "Violine", "Inszenierung" …), the cast ("Mit: …", names only, no
characters or voice types) and, for concerts, the programme (composer in capitals, work;
an opera's parts are printed the other way round: work, then composer; a ballet's are
piece, then choreographer). Only those facts are taken, never texts or images.

A ballet's "Mit:" list mixes dancers and musicians without roles, so the production page of
each ballet kept (about 11, read every run: 12 requests, ~20 s in all) supplies the
musicians' roles ("Musikalische Leitung", "Sänger", "Solo-Violine" …) and the composer of
each piece ("Musik"); dancers are left out, as in opernhaus_zurich. Without that page a
ballet keeps its groups, labelled credits and choreographer only. Opera singers are credited
as 'Performer' (the calendar names no characters or voice types).

Kept: operas (incl. opera stabile productions), ballets whose cast lists the orchestra or a
conductor (live music), the Philharmonic and chamber concerts (mostly in the Elbphilharmonie),
special concerts, the opera chorus' foyer concert series. Performances in Hamburg venues
outside the house (Elbphilharmonie, Laeiszhalle, Kuppel) keep the site's room name;
"Staatsoper, <room>" becomes "Staatsoper Hamburg, <room>".

Skipped: the "CLICK in" education entries and the supporting programme (guided tours,
workshops, rehearsal visits, introductions, talks, parties), the festival's cinema,
installation and workshop entries (no category), children's music theatre (age "ab 2/3/4"
or "für Kinder"), family concerts and the Schmidts Tivoli family show ("ab 6"), ballet-school
and youth-ballet evenings, ballets without the orchestra or a conductor in the cast (e.g.
guest companies, Kuppel summer run before its cast is out), guest performances elsewhere
("auswärtiges Gastspiel").

The page marked no performance as cancelled when checked; a title, label or ticket hint saying
"abgesagt"/"entfällt" (common.looks_cancelled) or a ticket status containing "cancel" marks it.
Composers are printed in capitals ("LUDWIG VAN BEETHOVEN") and are title-cased here.
"""
from __future__ import annotations

import re
from datetime import datetime

from common import BudgetExceeded, FetchError, clean, get, infer_type, log, looks_cancelled, make_event, to_zurich_iso
from ._consent import group_role, looks_like_person, role_en

KEY = 'staatsoper_hamburg'
NAME = 'Staatsoper Hamburg'
SITE = 'https://www.die-hamburgische-staatsoper.de/'
ATTRIBUTION = 'Source: Staatsoper Hamburg (die-hamburgische-staatsoper.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 40              # the calendar page + one page per ballet production (~12)
TIME_LIMIT = 300

BASE = 'https://www.die-hamburgische-staatsoper.de'
CALENDAR = BASE + '/de/kalender'
CITY = 'Hamburg'
TZ = 'Europe/Berlin'

_BLOCK_SPLIT = re.compile(r'<div class="block block--event block--event--calendar')
_SKIP_TITLE = re.compile(
    r'\bführung|werkstatt|workshop|meet the artists|kids only|club zone|croissant|familien|für kinder|kinderkonzert|'
    r'selbstgemacht|podiums|diskussion|talk\b|lesung|insider|tester|patenklassen|probenbesuch|generalprobe|'
    r'seminar|installation|party|kiki|politische perspektiven|alles lyrisch|eintauchen|ballettschule|'
    r'erste schritte|bundes\s*jugend\s*ballett|junge choreo|schulklassen|fortbildung|lab:|ta-ta-ta', re.I)
_STAGING = re.compile(r'inszenierung|regie|bühne|kostüm|licht|dramaturg|video|text\b|libretto|ausstattung', re.I)
_PARTICLES = {'van', 'von', 'de', 'da', 'di', 'del', 'della', 'der', 'du', 'la', 'le', 'des', 'dos', 'y', 'zu', 'ten'}


# ---------------------------------------------------------------------------
# parsing
# ---------------------------------------------------------------------------

def _first(rx, text, flags=re.S):
    m = re.search(rx, text, flags)
    return m.group(1) if m else ''


def _names(fragment):
    """Names in a credit cell: the linked names, else the comma-separated text."""
    linked = [clean(x) for x in re.findall(r'<a\b[^>]*>(.*?)</a>', fragment, re.S)]
    linked = [x for x in linked if x]
    if linked:
        return linked
    text = clean(fragment)
    return [p.strip() for p in re.split(r'\s*,\s*|\s+und\s+', text) if p.strip()]


def parse_block(block):
    """One calendar entry -> dict of raw facts (or None when it has no date/time)."""
    cls = re.match(r'[^"]*', block).group(0)
    main, _, rest = block.partition('class="event__controls')
    m = re.search(r'<span class="event__date">\s*\w+\s+(\d{1,2})\.(\d{1,2})\.(\d{2,4})\s*</span>\s*'
                  r'<span class="event__datetime">\s*(\d{1,2})[:.](\d{2})', main)
    if not m:
        return None
    d, mo, y, hh, mi = (int(x) for x in m.groups())
    y = y + 2000 if y < 100 else y
    href = _first(r'data-href="([^"]+)"', main)
    ics = re.search(r'href="(/de/programm/[^"]*/(\d+)\.ics)"', rest)
    ticket = re.search(r'<a\s*href="(https?://[^"]+)"\s*class="btn btn--standard"', rest)
    extra = rest.split('foldout__content__inner', 1)[1] if 'foldout__content__inner' in rest else ''
    tags = _first(r'<div class="extra__tags">(.*?)</div>', extra)
    infos = []
    for label, content in re.findall(r'<li class="production-infos__item">\s*<span class="label">(.*?)</span>\s*'
                                     r'<span class="content">(.*?)</span>\s*</li>', extra, re.S):
        infos.append((clean(label), _names(content)))
    mit = []
    for p in re.findall(r'<div class="extra__text">(.*?)</div>', extra, re.S):
        for para in re.findall(r'<p>(.*?)</p>', p, re.S) or [p]:
            if re.match(r'\s*Mit\s*:', clean(para)):
                mit += _names(re.sub(r'^\s*Mit\s*:\s*', '', para))
    parts = []
    for item in re.findall(r'<li class="extra__parts__list__item">(.*?)</li>', extra, re.S):
        head = re.sub(r'(?s)<mark>.*?</mark>', ' ', _first(r'__item__title">(.*?)</div>', item))   # 'ZEITENLOS ⁴⁶⁷³'
        composer = clean(head)
        works = [clean(_first(r'__item__subtitle">(.*?)</div>', item))]
        text = _first(r'__item__text">(.*?)</div>', item)
        if text:                                        # 'I. Adagio <br> aus Sinfonie Nr. 4 …<br> II. …'
            lines = []
            for line in (clean(x) for x in re.split(r'<br\s*/?>', text)):
                if not line:
                    continue
                if lines and re.match(r'(?i)aus\b', line):
                    lines[-1] = f'{lines[-1]} {line}'
                else:
                    lines.append(line)
            works += lines
        for work in works:
            if composer and work:
                parts.append((composer, work))
    return {
        'cls': cls,
        'start': datetime(y, mo, d, hh, mi),
        'href': href,
        'url': BASE + href if href.startswith('/') else (href or None),
        'id': ics.group(2) if ics else None,
        'category': clean(_first(r'<div class="event__category"><span>(.*?)</span>', main)),
        'location': clean(_first(r'<div class="event__location">(.*?)</div>', main)),
        'title': clean(_first(r'<div class="event__title">(.*?)</div>', main)),
        'subtitle': clean(_first(r'<div class="event__subtitle">(.*?)</div>', main)),
        'supporting': clean(_first(r'class="event__supportingprogram">(.*?)</(?:div|ul)>', main)),
        'premiere': 'event__premiere' in main,
        'hint': clean(_first(r'<div class="ticket-hint">(.*?)</div>', rest)),
        'status': _first(r'data-ticket-status="([^"]*)"', block),
        'ticket': ticket.group(1).replace('&amp;', '&') if ticket else None,
        'tags': clean(tags),
        'infos': infos,
        'mit': mit,
        'parts': parts,
    }


def parse_calendar(page_html):
    out = []
    for block in _BLOCK_SPLIT.split(page_html or '')[1:]:
        try:
            row = parse_block(block)
        except (ValueError, IndexError) as err:
            log.warning('%s: unreadable calendar entry: %s', KEY, err)
            continue
        if row:
            out.append(row)
    return out


# ---------------------------------------------------------------------------
# facts -> event
# ---------------------------------------------------------------------------

def _min_age(row):
    ages = [int(a) for a in re.findall(r'(?i)\bab\s+(\d{1,2})\s+jahr', f"{row['tags']} {row['subtitle']}")]
    return min(ages) if ages else None


def skip_reason(row):
    if 'clickin' in row['cls'] or 'supporting' in row['cls']:
        return 'education / supporting programme'
    if row['category'] not in ('Oper', 'Ballett', 'Konzert'):
        return 'festival side event (cinema, workshop, installation)'
    text = f"{row['title']} {row['subtitle']}"
    if _SKIP_TITLE.search(text):
        return 'not a performance / family'
    age = _min_age(row)
    if age is not None and age <= 6:
        return "children's format"
    if re.search(r'gastspiel', row['location'], re.I):
        return 'guest performance elsewhere'
    if row['category'] == 'Ballett':
        if not _live_music(row):
            return 'ballet without live orchestra'
    return None


def _venue(location):
    loc = clean(location)
    if not loc or re.search(r'wird noch bekannt|folgt', loc, re.I):
        return None
    m = re.match(r'(?i)staatsoper\s*,\s*(.+)$', loc)
    if m:
        return f'Staatsoper Hamburg, {m.group(1)}'
    if loc.lower() == 'staatsoper':
        return 'Staatsoper Hamburg'
    return loc


def _group(name):
    if re.match(r'(?i)(musiker|akademist|mitglieder|solist)\S*\s+(des|der)\b', name):
        return 'Ensemble'                              # 'Musiker:innen des Philharmonischen Staatsorchesters'
    if re.search(r'chor(akademie|\b)|\bchor', name, re.I) and not re.search(r'orchest', name, re.I):
        return 'Choir'                                 # 'Audi Jugendchorakademie' (not 'Patchornik')
    return group_role(name)


def _role(label, strict=False):
    """Label -> English role; '' for staging people we leave out, 'Director' for the stage director.
    ``strict``: None for a label that is no role word (a character on a production page)."""
    r = role_en(label)
    if r is not None:
        return r
    found = []
    for part in re.split(r'\s*,\s*|\s+und\s+|\s*/\s*', label):
        rp = role_en(part)
        if rp:
            found.append(rp)
    if found:
        return ' & '.join(dict.fromkeys(found))
    if re.search(r'inszenierung|regie', label, re.I):
        return 'Director'
    if _STAGING.search(label):
        return ''
    if re.search(r'quartett|quartet|trio|quintett|ensemble', label, re.I):
        return 'Ensemble'
    if not strict and label and len(label) <= 25 and label.lower() != 'mit':
        return label[:1].upper() + label[1:]          # an instrument the role table lacks ('Sheng')
    return None


def credits_for(row, musicians=None):
    """Conductors, soloists, cast, groups, then stage director / choreographer.

    ``musicians`` (ballets only): name -> role of the musicians on the production page. The
    calendar's "Mit:" list of a ballet names dancers and musicians alike; with the production
    page read, only the musicians are kept (dancers are not musical credits)."""
    leaders, soloists, groups, staging = [], [], [], []

    def person(name, role='Performer'):
        if musicians is not None:
            role = musicians.get(_key(name))
            if not role:
                return                                  # a dancer
        if role == 'Conductor' or role.endswith('& direction'):
            leaders.append((role, name))
        elif looks_like_person(name):
            soloists.append((role, name))

    for label, names in row['infos']:
        role = _role(label)
        for name in names:
            if not name:
                continue
            g = _group(name)
            if role is None or role == 'Performer' or label.lower() == 'mit':
                if g:
                    groups.append((g, name))
                else:
                    person(name)
            elif role == '':
                continue
            elif role in ('Director', 'Choreographer'):
                staging.append((role, name))
            elif role == 'Ensemble' or g:
                groups.append((g or 'Ensemble', name))
            elif role == 'Conductor' or role.endswith('& direction'):
                leaders.append((role, name))
            else:
                soloists.append((role, name))
    for name in row['mit']:
        g = _group(name)
        if g:
            groups.append((g, name))
        else:
            person(name)
    return leaders + soloists + groups + staging


def _key(name):
    return re.sub(r'\s+', ' ', clean(name)).strip().lower()


def _live_music(row):
    """A ballet with the orchestra (or another group) or a conductor in the evening's cast."""
    return any(r in ('Orchestra', 'Ensemble', 'Choir', 'Conductor') or r.endswith('& direction')
               for r, _ in credits_for(row))


def parse_production(page_html):
    """Ballet production page -> {'musicians': {name: role}, 'music': [(composer, piece)]}.
    'Musik' lines name the composer of each piece (foldout title) of the evening."""
    h = page_html or ''
    sec = h.split('data-section="besetzung"', 1)
    h = sec[1] if len(sec) > 1 else h
    h = re.split(r'<div class="block block--(?!production-credits)', h, 1)[0]
    musicians, music = {}, []
    for chunk in re.split(r'<summary>', h):
        piece = clean(_first(r'<span class="title">(.*?)</span>', chunk))
        for label, content in re.findall(r'<div class="label">(.*?)</div>\s*<div class="content[^"]*">(.*?)</div>',
                                         chunk, re.S):
            label = clean(label)
            names = [clean(x) for x in re.findall(r'<span>(.*?)</span>', content, re.S) if clean(x)]
            if re.match(r'(?i)musik$|komposition$', label):
                for n in names:
                    if piece and (n, piece) not in music:
                        music.append((n, piece))
                continue
            role = _role(label, strict=True)
            if re.match(r'(?i)sänger(in)?$', label):
                role = 'Voice'
            if not role or role in ('Director', 'Choreographer', 'Orchestra', 'Choir', 'Ensemble', 'Performer'):
                continue
            for n in names:
                if not _group(n) and looks_like_person(n):
                    musicians.setdefault(_key(n), role)
    return {'musicians': musicians, 'music': music}


def _cap_name(name):
    """'LUDWIG VAN BEETHOVEN' -> 'Ludwig van Beethoven' (only for names printed in capitals)."""
    if name != name.upper():
        return name
    words = []
    for i, w in enumerate(name.split()):
        lw = w.lower()
        if i and lw in _PARTICLES:
            words.append(lw)
        else:
            words.append('-'.join(p[:1].upper() + p[1:] for p in lw.split('-')))
    return re.sub(r"(['’])(\w)", lambda m: m.group(1) + m.group(2).upper(), ' '.join(words))


def program_for(row):
    if row['category'] == 'Ballett':
        return []                                     # the calendar's parts are (piece, choreographer)
    if row['parts']:
        if row['category'] == 'Oper':                 # an opera's parts are (work, composer)
            return [(c, w) for w, c in row['parts']]
        return [(_cap_name(c), w) for c, w in row['parts']]
    if row['category'] != 'Oper':
        return []
    sub = row['subtitle']
    if not sub or re.search(r'konzert|reihe|musiktheater|\d', sub, re.I):
        return []
    composers = [c.strip() for c in re.split(r'\s*/\s*', sub)][0]
    comp_list = [c.strip() for c in re.split(r'\s+&\s+', composers) if c.strip()]
    titles = [t.strip() for t in re.split(r'\s+&\s+', row['title']) if t.strip()]
    if not all(looks_like_person(c) for c in comp_list):
        return []
    if len(comp_list) > 1 and len(comp_list) == len(titles):
        return list(zip(comp_list, titles))
    return [(' & '.join(comp_list), row['title'])]


def _type(row, credits, program):
    if row['category'] == 'Oper':
        return 'vocal-opera'
    if row['category'] == 'Ballett':
        return 'orchestral'                           # ballet with the orchestra in the pit
    if re.search(r'kammerkonzert', row['title'], re.I):
        return 'chamber'
    if not program and all(r == 'Performer' for r, _ in credits):
        return 'mixed' if credits else None           # a special evening without programme or roles
    return infer_type(row['title'], credits, program, row['subtitle'])


def _series(row):
    t = row['title']
    if re.search(r'philharmonisches konzert', t, re.I):
        return 'Philharmonische Konzerte'
    if re.search(r'^\d+\.\s*kammerkonzert', t, re.I):
        return 'Kammerkonzerte'
    if row['category'] == 'Ballett':
        return 'Ballett'
    if re.search(r'chorkonzertreihe', row['subtitle'], re.I):
        return re.sub(r'\s*chorkonzertreihe\s*', '', row['subtitle'], flags=re.I).strip() or None
    return None


def _title(row):
    t = row['title']
    if re.match(r'^\d+\.\s*(philharmonisches|kammer)', t, re.I) and row['subtitle'] and \
            not re.search(r'einführung', row['subtitle'], re.I):
        return f"{t} – {row['subtitle']}"            # '3. Philharmonisches Konzert – ZEITENLOS¹³¹'
    return t


def _productions(rows):
    """Read the production page of every ballet kept (one request each)."""
    out = {}
    for href in dict.fromkeys(r['href'] for r in rows if r['category'] == 'Ballett' and r['href']):
        try:
            out[href] = parse_production(get(BASE + href))
        except BudgetExceeded as err:
            log.warning('%s: stopped reading production pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s: production page %s failed: %s', KEY, href, err)
    return out


def fetch():
    page = get(CALENDAR)                                  # FetchError -> build.py reuses yesterday
    rows = parse_calendar(page)
    if not rows:
        raise FetchError(CALENDAR, 'no calendar entries found (layout changed?)')
    kept, skipped = [], {}
    for row in rows:
        why = skip_reason(row)
        if why:
            skipped[why] = skipped.get(why, 0) + 1
        else:
            kept.append(row)
    productions = _productions(kept)
    events = []
    for row in kept:
        prod = productions.get(row['href']) if row['category'] == 'Ballett' else None
        musicians = prod['musicians'] if prod else ({} if row['category'] == 'Ballett' else None)
        credits = credits_for(row, musicians)
        program = program_for(row) or (prod['music'] if prod else [])
        sid = row['id'] or f"{row['href'].rstrip('/').rsplit('/', 1)[-1]}-{row['start']:%Y%m%d%H%M}"
        cancelled = (looks_cancelled(' '.join([row['title'], row['subtitle'], row['supporting'], row['hint']]))
                     or 'cancel' in row['status'].lower())
        try:
            events.append(make_event(
                KEY, sid, _title(row), to_zurich_iso(row['start'], assume=TZ), city=CITY,
                venueName=_venue(row['location']), type=_type(row, credits, program), series=_series(row),
                credits=credits, program=program, ticketUrl=row['ticket'], url=row['url'],
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, sid, err)
    log.info('%s: %d calendar entries, %d events, %d ballet production page(s) read; skipped %s', KEY, len(rows),
             len(events), len(productions), ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())) or 'none')
    return events
