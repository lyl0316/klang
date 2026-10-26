"""DomMusik St.Gallen: choir and organ concerts in the Cathedral (Kathedrale) St. Gallen.

    https://www.dommusik.ch/musik-konzerte/konzerte/     "Nächste Anlässe" (Verowa event list)

Each event in the list has its day (``data-date="20261122"``), title, local start and end
("16.00–18.00 Uhr"), place ("Kathedrale, St. Gallen", "Chor der Kathedrale") and its Verowa event
id (from the per-event iCal export link). The expandable text under each event often lists the
line-up ("<strong>DomChor, Collegium Vocale</strong>, Kimberly Brockman (Sopran), …, Domorganist
Christoph Schönfelder, Domkapellmeister Andreas Gut") and the works ("<strong>Max Reger (1873-1916)</strong>"
followed by a list of works, or "Dietrich Buxtehude (1637-1707) - Magnificat primi toni BuxWV 203");
only those facts are taken, the prose is skipped. Kept: concerts,
Abendmusik, organ series (Orgeltrost, Domorgelkonzerte, Orgelsommer), Nine Lessons and Carols.
Skipped: sing-alongs (Offenes Singen, Singtag), vespers, introductions, tours and talks. One request
per run.
"""
from __future__ import annotations

import re

from common import clean, get, log, looks_cancelled, make_event, to_zurich_datetime, today_zurich
from ._east import NOT_A_CONCERT, fold, group_role, is_group, local_iso, role_for

KEY = 'dommusik_st_gallen'
NAME = 'DomMusik St.Gallen'
SITE = 'https://www.dommusik.ch/'
ATTRIBUTION = 'Source: DomMusik St.Gallen (dommusik.ch)'
KIND = 'venue'
MAX_REQUESTS = 3
TIME_LIMIT = 60

LISTING = 'https://www.dommusik.ch/musik-konzerte/konzerte/'
KEEP = re.compile(r'konzert|abendmusik|orgel|organ|nine lessons|carols|passionsmusik|stiftsbibliothek|oratori|messe\b|'
                  r'requiem|kantate')
SKIP = re.compile(r'offenes singen|singtag|lieder-singen|liedersingen|vesper|nacht der lichter|podium|prasentation|'
                  r'einfuhrung|(?<!auf)fuhrung|gottesdienst')
PLACES = {'kathedrale, st. gallen': 'Kathedrale St. Gallen', 'chor der kathedrale': 'Kathedrale St. Gallen, Chor',
          'barocksaal stiftsbibliothek': 'Stiftsbibliothek St. Gallen, Barocksaal'}


_PERSON = r"[A-ZÄÖÜÉ][\w'’.\-]+(?:\s+(?:von|van|de|del|da|di|le|la)?\s*[A-ZÄÖÜÉ][\w'’.\-]+){1,3}"
# 'Domorganist Christoph Schönfelder' (German nouns are capitalised too, so: first name + surname only)
_TWO = r"[A-ZÄÖÜÉ][\w'’\-]+\s+(?:(?:von|van|de|du|di|da|le|la)\s+)?[A-ZÄÖÜÉ][\w'’\-]+"
_TITLED = ((re.compile(r'\bDomorganist(?:in)?\s+(%s)' % _TWO), 'Organ'),
           (re.compile(r'\bDomkapellmeister(?:in)?\s+(%s)' % _TWO), 'Conductor'),
           (re.compile(r'\bDomkantor(?:in)?\s+(%s)' % _TWO), 'Conductor'))
_LED_BY = re.compile(r'\bmit (?:der |dem |den )?([A-ZÄÖÜ][\w\- ]{2,40}?) unter der Leitung von (?:Dr\.\s*|Prof\.\s*)?(%s)' % _TWO)
_COMPOSER = re.compile(r"^(%s)\s*(?:\((?:\*\s*)?\d{2,4}\s*(?:[-–]\s*\d{0,4})?\s*\))?$" % _PERSON.replace('{1,3}', '{1,4}'))
_COMPOSER_WORK = re.compile(r"^(%s)\s*(?:\((?:\*\s*)?\d{2,4}\s*(?:[-–]\s*\d{0,4})?\s*\))?\s*(?:[-–]\s+|(?=«))(.{2,160})$"
                            % _PERSON.replace('{1,3}', '{1,4}'))
_PROSE = re.compile(r'[a-zäöüß]{2,}[.!?]\s+[A-ZÄÖÜ]|\b(wird|werden|ist|sind|Sie|wir|uns|unser|einmal|jährlich)\b')


def _blocks(html):
    """The text's <p> and <li> blocks in order: [('p'|'li', inner HTML)]."""
    return [(m.group(1).lower(), m.group(2)) for m in re.finditer(r'<(p|li)\b[^>]*>(.*?)</\1>', html or '', re.S | re.I)]


def details(html):
    """(credits, program) from an event's expandable text; prose and practical notes are skipped."""
    credits, program = [], []
    for _, inner in _blocks(html):
        for text in (clean(x) for x in re.split(r'<br\s*/?>', inner)):
            for rx, role in _TITLED:
                for name in rx.findall(text):
                    credits.append((role, name))
            for group, leader in _LED_BY.findall(text):
                credits.append((group_role(group) if is_group(group) else 'Ensemble', group.strip()))
                credits.append(('Conductor', leader))
    composer, last = None, None
    for tag, inner in _blocks(html):
        line = clean(inner).strip()
        if not line or re.match(r'(?i)(kollekte|türöffnung|tickets?\b|eintritt|programm noch offen|weitere informationen)', line):
            continue
        if re.fullmatch(r'\(.*\)', line):                      # '(Bearbeitung: Edwin H. Lemare)'
            continue
        if tag == 'p' and (len(line) > 150 or _PROSE.search(line)) and not re.search(r'\((sopran|alt|tenor|bass)', line, re.I):
            last = 'prose'
            continue
        if line.endswith(':'):
            last = 'heading'                                     # 'Programm:', 'Aus den Leipziger-Chorälen:'
            continue
        greg = re.match(r'(?i)<em>\s*gregorianisch\s*</em>\s*(.+)$', inner.strip())
        if greg:
            program.append(('Gregorianik', clean(greg.group(1))))
            last = 'work'
            continue
        if tag == 'p' and (',' in line or re.search(r'\((sopran|alt|tenor|bass|orgel|violine|cello|leitung)\)', line, re.I)) \
                and not _COMPOSER_WORK.match(line):
            found = False
            for item in (x.strip() for x in line.split(',')):
                m = re.match(r'^(%s)\s*\(([^()]+)\)$' % _PERSON, item)
                if m:
                    role = role_for(m.group(2), m.group(1))
                    if role:
                        credits.append((role, m.group(1)))
                        found = True
                elif is_group(item) and not re.search(r'\d', item) and len(item) <= 60:
                    credits.append((group_role(item), item))
                    found = True
                elif any(rx.match(item) for rx, _ in _TITLED):
                    found = True
            if found:
                last = 'credits'
                continue
        m = _COMPOSER_WORK.match(line)
        if tag == 'p' and m:
            program.append((m.group(1), m.group(2).strip()))
            composer, last = None, 'work'
            continue
        m = _COMPOSER.match(line)
        if tag == 'p' and m and (re.search(r'\(', line) or '<strong>' in inner):
            composer, last = m.group(1), 'composer'
            continue
        if tag == 'p' and '<strong>' in inner and clean(inner) == line and (is_group(line) or line.startswith('mit ')):
            if is_group(line) and len(line) <= 60 and not re.search(r'\d', line):
                credits.append((group_role(line), line))
            continue
        if tag == 'p' and is_group(line) and len(line) <= 40 and not re.search(r'\d|[.:!?]', line) \
                and composer is None and last != 'composer':
            credits.append((group_role(line), line))             # 'Collegium Vocale'
            continue
        if tag == 'li' and last in ('work', 'prose', 'credits', None):
            continue                                             # a movement of the work above
        if any(rx.search(line) for rx, _ in _TITLED) or line.startswith('mit '):
            continue
        who = composer or ('Johann Sebastian Bach' if re.search(r'\bBWV\b', line) else None)
        if who and len(line) <= 160:
            program.append((who, line))
            last = 'work' if tag == 'p' else 'list'
    seen, out = set(), []
    for r, n in credits:
        if fold(n) not in seen:
            seen.add(fold(n))
            out.append((r, n))
    return out, program


def fetch():
    today = today_zurich()
    page = get(LISTING)                                     # FetchError propagates
    events = []
    for item in re.split(r'<div class="event_list_item ', page)[1:]:
        day = re.search(r'data-date="(\d{4})(\d{2})(\d{2})"', item)
        title = re.search(r'class="event_title">(.*?)</span>', item, re.S)
        times = re.search(r'event-time-text">(.*?)</span>', item, re.S)
        place = re.search(r'event-location-room">(.*?)</span>', item, re.S)
        eid = re.search(r'/export/ical/(e\d+)', item)
        if not (day and title and times and eid):
            continue
        title = clean(title.group(1))
        f = fold(title)
        if not KEEP.search(f) or SKIP.search(f) or NOT_A_CONCERT.search(f):
            continue
        hm = re.findall(r'(\d{1,2})[.:](\d{2})', clean(times.group(1)))
        if not hm:
            continue
        ymd = tuple(int(x) for x in day.groups())
        start = local_iso(*ymd, int(hm[0][0]), int(hm[0][1]))
        if to_zurich_datetime(start).date() < today:
            continue
        end = local_iso(*ymd, int(hm[1][0]), int(hm[1][1])) if len(hm) > 1 else None
        if end and end <= start:
            end = None
        where = clean(place.group(1)) if place else 'Kathedrale, St. Gallen'
        text = re.search(r'<div class="long_description">(.*?)</div>', item, re.S)
        credits, program = details(text.group(1) if text else '')
        kind = 'recital' if re.search(r'orgel|organ', f) else (
            'vocal-opera' if re.search(r'chor|choral|carols|passion|abendmusik|oratori|messe|requiem|kantate', f) else None)
        if kind is None and any(r == 'Choir' for r, _ in credits):
            kind = 'vocal-opera'
        try:
            events.append(make_event(
                KEY, eid.group(1), title, start, end=end, city='St. Gallen',
                venueName=PLACES.get(fold(where), where), type=kind, credits=credits, program=program, url=LISTING,
                status='cancelled' if looks_cancelled(title) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, eid.group(1), err)
    return events
