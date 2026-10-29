"""Shared helpers for the readers of eastern Austria (Graz, Linz, Eisenstadt, Grafenegg):
musikverein_graz, oper_graz, styriarte, brucknerhaus_linz, landestheater_linz,
esterhazy_eisenstadt, grafenegg.

Not a reader itself: the registry skips modules whose name starts with '_'.
Only facts come out of here (roles, names, works, dates); never description text.
"""
from __future__ import annotations

import re
from datetime import datetime

from common import (BudgetExceeded, FetchError, clean, event_id, log, previous_event, refresh_due, requests_left,
                    to_zurich_iso)

from ._consent import fold, group_role, has_life_dates, looks_like_person, role_en, strip_life_dates

VIENNA = 'Europe/Vienna'

MONTHS = {
    'jan': 1, 'jän': 1, 'jaen': 1, 'feb': 2, 'mär': 3, 'mae': 3, 'mar': 3, 'apr': 4, 'mai': 5, 'may': 5,
    'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'okt': 10, 'oct': 10, 'nov': 11, 'dez': 12, 'dec': 12,
}


def month_number(word):
    """'Jänner' / 'J&auml;nner' / 'März' / 'Nov' -> 1 / 1 / 3 / 11, or None."""
    w = clean(word).lower().strip('. ')
    return MONTHS.get(w[:3]) or MONTHS.get(fold(w)[:3]) or MONTHS.get(fold(w)[:4])


def local_iso(y, m, d, hh, mm):
    """Austrian wall-clock time -> Klang's ISO start (Swiss offset; the same zone rules)."""
    return to_zurich_iso(datetime(int(y), int(m), int(d), int(hh), int(mm)), assume=VIENNA)


def year_for(day, month, today):
    """A date printed without a year ('09.11.'): the next such date from ``today`` on
    (a date up to 7 days back counts as this year, for an event that has just begun)."""
    for y in (today.year, today.year + 1):
        try:
            d = datetime(y, month, day).date()
        except ValueError:
            continue
        if (d - today).days >= -7:
            return y
    return today.year + 1


# ---------------------------------------------------------------------------
# performers
# ---------------------------------------------------------------------------

PLACEHOLDER_RE = re.compile(r'(?i)^(?:n\.?\s*n\.?|tba|t\.b\.a\.|tbd|noch offen|wird bekannt gegeben|folgt)$')
EXTRA_ROLES = {
    'dirigentin': 'Conductor', 'dirigenten': 'Conductor', 'orchesterleitung': 'Conductor', 'nachdirigat': None,
    'musikalische leitung & klavier': 'Piano & direction', 'chorleiter': 'Chorus master',
    'chorleiterin': 'Chorus master', 'chorleitung': 'Chorus master', 'choreinstudierung': None,
    'violinen': 'Violin', 'kontratenor': 'Countertenor', 'counter': 'Countertenor', 'cemballo': 'Harpsichord',
    'organistin': 'Organ', 'pianist': 'Piano', 'pianistin': 'Piano', 'sängerin': 'Voice', 'sänger': 'Voice',
    'gitarristin': 'Guitar', 'gitarrist': 'Guitar', 'geigerin': 'Violin', 'geiger': 'Violin',
    'cellist': 'Cello', 'cellistin': 'Cello', 'moderatorin': 'Presenter', 'moderator': 'Presenter',
    'mezzosopranistin': 'Mezzo-soprano', 'sopranistin': 'Soprano', 'altistin': 'Alto', 'bassist': 'Bass',
    'chor': 'Choir', 'orchester': 'Orchestra', 'klavier & dirigent': 'Piano & direction',
    'violine & leitung': 'Violin & direction', 'gesangssolist:innen': 'Voice', 'gesangssolisten': 'Voice',
    'solist:innen': 'Soloist', 'solisten': 'Soloist', 'vokalsolist:innen': 'Voice',
    'violine und leitung': 'Violin & direction',
    'erzählerin': 'Narrator', 'erzähler': 'Narrator', 'rezitation': 'Narrator', 'lesung': 'Narrator',
    'schlagwerk': 'Percussion', 'multipercussion': 'Percussion', 'drums': 'Percussion', 'tanz': None,
    'intendant': None, 'intendantin': None, 'dramaturg': None, 'dramaturgin': None,
    'regie': None, 'inszenierung': None, 'choreographie': None, 'choreografie': None, 'bühne': None,
    'kostüme': None, 'licht': None, 'video': None, 'dramaturgie': None, 'ausstattung': None,
}


_MORE_CHOIRS = re.compile(r'(?i)singverein|chorverein|chorvereinigung|kantorei|voces\b|vocal(?:ensemble|isten)|'
                          r'cappella|capella|sängerknaben|singakademie|madrigal')
_MORE_ENSEMBLES = re.compile(r'(?i)concentus|musicus|consort|hofkapelle|\bkapelle\b|collegium|accademia|camerata|'
                             r'ensemble|quartet|quartett|quatuor|trio\b|\bduo\b|brass|harmonie|\bband\b|players')


def group_of(name):
    """'Orchestra' / 'Choir' / 'Ensemble' for a group's name, else None (_consent.group_role, plus a
    few more words for choirs and period-instrument ensembles)."""
    g = group_role(name)
    if g:
        return g
    if _MORE_CHOIRS.search(name or ''):
        return 'Choir'
    if _MORE_ENSEMBLES.search(name or ''):
        return 'Ensemble'
    return None


def role_of(text):
    """German role text -> English role; None for an off-stage role (director, costumes ...);
    '' when the text is not a role at all (e.g. an opera character)."""
    t = clean(text).strip(' ,;:|')
    if not t:
        return ''
    low = re.sub(r'\s+', ' ', t.lower())
    if low in EXTRA_ROLES:
        return EXTRA_ROLES[low]
    if re.search(r'regie|inszen|choreo|dramaturg|kostüm|bühnenbild|licht|ausstattung|assisten|souffl|inspiz|'
                 r'video|sounddesign|einstudierung|mitarbeit', low):
        return None
    r = role_en(t)
    if r is None:
        bare = re.sub(r'\s+(?:[IVX]{1,3}|\d)\.?$', '', t)            # 'Sopran 2', 'Violine II'
        if bare != t:
            r = role_en(bare)
    if r is None:
        return ''
    if r == '':
        return None
    if r in ('Director', 'Choreographer'):
        return None
    return r


def credit(name, role_text='', *, character_ok=False):
    """(role, name) for a performer, or None (off-stage people, placeholders).
    ``character_ok``: an unknown role is an opera character and is kept as the role."""
    name = clean(name).strip(' ,;:|')
    if not name or PLACEHOLDER_RE.match(name) or len(name) > 90:
        return None
    if not clean(role_text):
        return (group_of(name) or 'Performer', name)
    r = role_of(role_text)
    if r is None:
        return None
    if r == '':
        role_text = clean(role_text).strip(' ,;:|')
        if group_of(name):
            return (group_of(name), name)
        if character_ok and len(role_text) <= 50:
            return (role_text, name)
        return ('Performer', name)
    return (r, name)


def credits_split(name, role_text='', *, character_ok=False):
    """credit() for 'A, B, C | Sopran' too: several names sharing one role."""
    names = [name]
    if role_text and ',' in name and role_of(role_text):
        parts = [p.strip() for p in name.split(',')]
        if all(looks_like_person(p) for p in parts if p):
            names = [p for p in parts if p]
    return [c for c in (credit(n, role_text, character_ok=character_ok) for n in names) if c]


def credits_from_pairs(pairs, *, character_ok=False):
    out, seen = [], set()
    for name, role_text in pairs:
        c = credit(name, role_text, character_ok=character_ok)
        if c and (c[0], c[1]) not in seen:
            seen.add((c[0], c[1]))
            out.append(c)
    return out


def name_role_line(line):
    """'Alexandre Kantorow, Klavier' / 'Wayne Marshall | Klavier & Dirigent' -> (name, role text),
    or (line, '') when the line is just a name (or a group)."""
    s = clean(line).strip(' ,;|')
    if '|' in s:                                        # 'Werner Güra | Evangelist': always name | role
        name, _, role = s.partition('|')
        if name.strip() and role.strip():
            return name.strip(' ,;'), role.strip(' ,;')
    for sep in (' – ', ','):
        if sep in s:
            name, _, role = s.partition(sep)
            name, role = name.strip(' ,;|'), role.strip(' ,;|')
            if name and role and role_of(role) != '':      # a role word (or an off-stage role)
                return name, role
    return s, ''


def _role_line(line):
    name, role = name_role_line(line)
    return (name, role) if role and role_of(role) is not None and composer_like(name) else None


def performers_paragraph(lines):
    """True when a block of lines is the cast ('Alexandra Dovgan, Klavier' / 'Grazer Philharmoniker'),
    i.e. at least one line is 'Name, role' and every line is that, a group, or a placeholder."""
    lines = [clean(x) for x in lines if clean(x)]
    if not lines or not any(_role_line(x) for x in lines):
        return False
    return all(_role_line(x) or group_role(x) or composer_like(x) or PLACEHOLDER_RE.match(x.split(',')[0].strip())
               for x in lines)


def performer_lines(lines):
    out = []
    for line in (clean(x) for x in lines):
        if not line or PLACEHOLDER_RE.match(line.split(',')[0].strip()):
            continue                                    # 'N. N., Trompete'
        pair = _role_line(line)
        c = credit(*pair) if pair else credit(line)
        if c and c not in out:
            out.append(c)
    return out


# ---------------------------------------------------------------------------
# programme
# ---------------------------------------------------------------------------

_PARTICLES = {'von', 'van', 'de', 'der', 'den', 'di', 'da', 'del', 'della', 'la', 'le', 'du', 'des', 'y', 'e',
              'zu', 'ten', 'dos', 'af', 'bin', 'ibn', 'al', 'el'}
_NOT_NAME_WORDS = re.compile(
    r'(?i)\b(kompositionen|arrangements?|werke|lieder|arien|musik|programm|auswahl|ausschnitte|zugabe|pause|konzert|'
    r'sinfonie|symphonie|sonate|suite|ouvertüre|trio|quartett|dauer|beginn|ende|einführung|tickets?|preise?|eintritt|'
    r'vorstellung|uraufführung|teil|tunes|songs?|traditionals?|volkslieder|theme|allegro|andante|adagio|largo|presto|'
    r'moderato|menuett|finale|scherzo|rondo|mitwirkende|besetzung|moderation|leitung|opernstudio|the|of|and|it|be|'
    r'had|is|im|am|zum|zur|aus|für|mit|auf|und|oder|nach)\b')


def composer_like(text):
    """'Ludwig van Beethoven', 'Pjotr Iljitsch Tschaikowsky', 'C. P. E. Bach' -> True;
    'Melodien aus bekannten Musicals' -> False. (A composer line in a programme.)"""
    t = strip_life_dates(clean(text)).strip(' ,')
    if not t or len(t) > 60 or re.search(r'[\d:;,!?»«„“"/()\[\]]', t) or re.match(r'[IVX]+\.?\s', t):
        return False
    if _NOT_NAME_WORDS.search(t):
        return False
    words = t.replace('-', ' ').split()
    if not 1 <= len([w for w in words if w.lower() not in _PARTICLES]) <= 4:
        return False
    if any(role_en(w) for w in words if len(w) > 3):
        return False                                    # 'Violoncello und Klavier', 'Grazer Philharmoniker' is fine
    return all(w[0].isupper() or w.lower() in _PARTICLES or w[0] in "'’(" for w in words) and t[0].isupper()


def work_line(line):
    """'Johannes Brahms: Konzert für Klavier und Orchester Nr. 1 d-Moll op. 15' -> (composer, work), or None."""
    s = clean(line).strip(' ,;')
    m = re.match(r'^([^:]{3,60}?)\s*:\s*(\S.+)$', s)
    if not m:
        return None
    composer = strip_life_dates(m.group(1))
    work = clean(m.group(2))
    if not composer_like(composer) or group_role(composer):
        return None
    if role_of(work):                                   # 'Russell McGregor: Violine, Dirigent und Moderation'
        return None
    return composer, work


_SECTION_RE = re.compile(r'^(?:[IVX]+\.\s|\d+\.\s*(?:teil|part)\b)|:$')
_EXCERPTS_RE = re.compile(r'(?i)^(?:daraus|auszüge|ausschnitte daraus|zugaben?)\b.*:?$')
_NOT_WORK_RE = re.compile(r'(?i)^(?:[-–—/ ]*pause[-–—/ ]*|konzertende\b.*|ende\b.*ca\..*|ca\. \d.*|\(?fragmente.*)$')


def is_prose(fragment):
    """A paragraph of running text (a description), not a programme or cast list."""
    text = clean(fragment)
    lines = [clean(x) for x in re.split(r'(?i)<br\s*/?>', fragment or '') if clean(x)]
    sentences = len(re.findall(r'[a-zäöüß]{3}[.!?]\s+[A-ZÄÖÜ]|[a-zäöüß]{3}[.!?]$', text))
    return len(text) > 200 and (sentences >= 2 or max((len(x.split()) for x in lines), default=0) > 14)


def program_from_lines(lines):
    """Works from programme lines in reading order, as the halls print them:

        Composer                    (a name on its own line)
        Work title                  (the following lines, up to the next name / blank line)
        Composer: Work   or   Composer – Work

    A blank line ends a work (a title after it without a new name is another work of the same
    composer), section headings ('II. SLAWISCHE TÄNZE', 'Teil 1:') reset, and an excerpt list
    ('daraus:') is skipped up to the next blank line. -> [(composer, work)]"""
    out, composer, work, skipping, last = [], None, [], False, None

    def flush():
        if composer and work:
            out.append((composer, clean(' '.join(work)).strip(' ,')))

    for raw in list(lines) + ['']:
        line = clean(raw).strip()
        if len(line.split()) > 14:                      # a long line: a work with its notes, or prose
            if composer and not work:
                work.append(re.split(r'\s+[–—]\s+|\s+\[', line)[0])
                continue
            line = ''
        if not line:
            flush()
            if work:
                last = composer                         # a further work of the same composer may follow
            composer, work, skipping = (composer if not work else None), [], False
            continue
        if skipping or _NOT_WORK_RE.match(line):
            continue
        if _EXCERPTS_RE.match(line):
            flush()
            composer, work, skipping = None, [], True
            continue
        pair = work_line(line)
        if not pair:
            m = re.match(r'^(.{3,60}?)\s+[–—-]\s+(\S.*)$', line)
            if m and composer_like(m.group(1)) and not role_of(m.group(2)):
                pair = (strip_life_dates(m.group(1)), m.group(2))
        if pair:
            flush()
            out.append(pair)
            composer, work = None, []
            continue
        if _SECTION_RE.search(line) or (line.upper() == line and len(line) > 4 and not re.search(r'\d', line)):
            flush()
            composer, work, last = None, [], None
            continue
        if composer_like(line) and (composer is None or work or has_life_dates(line)):
            flush()
            composer, work = strip_life_dates(line), []
            continue
        if composer is None and last and len(line.split()) <= 12 and not re.search(r'[a-zäöüß]\.$', line):
            composer = last                             # '<em>Fancy Free</em> Ballett-Suite' after a blank line
        if composer:
            work.append(line)
    return [(c, w) for c, w in out if c and w]


# ---------------------------------------------------------------------------
# detail pages, read incrementally
# ---------------------------------------------------------------------------

def has_details(prev):
    """The previous feed's record carries what a detail page adds (performers or works)."""
    return bool(prev.get('credits') or prev.get('program'))


def read_details(key, items, fetch, *, usable=has_details, near_days=7, every_days=7, reserve=0):
    """Read detail pages incrementally.

    ``items``: dicts with 'sid', 'start' (ISO), 'title' and 'page' (the detail page URL; several
    performances may share one page). A performance whose previous record (same id, start and
    title; common.previous_event) is ``usable`` can keep it. Pages are read in this order while
    requests are left (above ``reserve``): pages with a performance not known yet (soonest
    first), then pages due for a re-read (common.refresh_due: within ``near_days`` or about once
    every ``every_days`` days). ``fetch(page)`` returns the parsed details or raises FetchError.

    -> (details: {page: result}, previous: {sid: previous record})"""
    pages, previous = {}, {}
    for it in items:
        if not it.get('page'):
            continue
        pages.setdefault(it['page'], []).append(it)
        prev = previous_event(event_id(key, it['sid']), it['start'], title=it.get('title'))
        if prev and usable(prev):
            previous[it['sid']] = prev
    order = []
    for page, its in pages.items():
        first = min(it['start'] for it in its)
        if any(it['sid'] not in previous for it in its):
            order.append((0, first, page))
        elif refresh_due(page, first, near_days=near_days, every_days=every_days):
            order.append((1, first, page))
    order.sort()
    details = {}
    for _, _, page in order:
        if requests_left() <= reserve:
            break
        try:
            details[page] = fetch(page)
        except BudgetExceeded as err:
            log.warning('%s: stopped reading detail pages: %s', key, err.reason)
            break
        except FetchError as err:
            log.warning('%s: detail page failed: %s', key, err)
    log.info('%s: %d of %d detail page(s) read (%d due), %d performance(s) can reuse earlier details',
             key, len(details), len(pages), len(order), len(previous))
    return details, previous


def prev_credits(prev):
    return [(c.get('role'), c.get('name')) for c in (prev or {}).get('credits') or [] if c.get('name')]


def prev_program(prev):
    return [(p.get('composer') or '', p.get('title') or '') for p in (prev or {}).get('program') or []]
