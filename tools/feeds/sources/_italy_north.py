"""Shared helpers for the northern-Italian readers (Milan, Turin, Venice, Verona, Genoa):
teatro_alla_scala, sinfonica_milano, quartetto_milano, teatro_regio_torino, osn_rai,
teatro_la_fenice, arena_di_verona, carlo_felice_genova.

Not a reader itself: the registry skips modules whose name starts with '_'.
Only *facts* come out of here (role names, people, dates, works); never description text.

- role_en / credit / group_role: Italian role words ("direttore", "pianoforte", "mezzosoprano",
  "maestro del coro" …) -> Klang's English roles; off-stage people (regia, scene, luci …) -> None.
- nice_name: "DANIELE RUSTIONI" -> "Daniele Rustioni" (names printed in capitals).
- date_notes / plays_on: the per-date cast notes Italian houses print after a name
  ("(20, 24, 27 ott.; 3 nov.)", "(13, 15, 18 novembre 2026)", "(22, 29)", "22/11").
- it_date: "giovedì 3 dicembre 2026" / "3 dic. 2026" -> date.
- with_details: incremental detail pages (one per production) on top of common.previous_event /
  refresh_due, the way tonhalle.py and opernhaus_zurich.py do it.

Note for build.py: a reader's codeHash covers only its own file and common.py, so an edit
here does not by itself mark yesterday's details as stale.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date

from common import (BudgetExceeded, FetchError, clean, event_id, get, log, make_event, previous_event,
                    previous_events, refresh_due, requests_left, today_zurich)


def fold(text):
    """'Chœur Opéra Zürich' -> 'choeur opera zurich' (for matching only)."""
    s = unicodedata.normalize('NFKD', str(text or '')).replace('œ', 'oe').replace('ß', 'ss')
    s = ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()
    return s.replace('’', "'").replace('‘', "'")


# ---------------------------------------------------------------------------
# dates
# ---------------------------------------------------------------------------

MONTHS = {
    'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4, 'maggio': 5, 'giugno': 6, 'luglio': 7,
    'agosto': 8, 'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12,
    'gen': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'mag': 5, 'giu': 6, 'lug': 7, 'ago': 8, 'set': 9, 'sett': 9,
    'ott': 10, 'nov': 11, 'dic': 12,
}
_MONTH_RX = '|'.join(sorted(MONTHS, key=len, reverse=True))
_DATE_RE = re.compile(rf'(\d{{1,2}})\s*(?:°|º)?\s+({_MONTH_RX})\.?\s+(\d{{4}})', re.I)


def it_date(text):
    """First 'D monthname YYYY' in the text -> date, else None."""
    m = _DATE_RE.search(fold(clean(text)))
    if not m:
        return None
    try:
        return date(int(m.group(3)), MONTHS[m.group(2).lower()], int(m.group(1)))
    except ValueError:
        return None


def it_dates(text):
    """Every 'D monthname YYYY' in the text, in order."""
    out = []
    for m in _DATE_RE.finditer(fold(clean(text))):
        try:
            out.append(date(int(m.group(3)), MONTHS[m.group(2).lower()], int(m.group(1))))
        except ValueError:
            pass
    return out


_NOTE_RE = re.compile(r'\(\s*((?:\d{1,2}(?:\s*[,;e]\s*|\s+|/\d{1,2})?)+(?:[a-z]{3,9}\.?\s*(?:\d{4})?)?'
                      r'(?:\s*[;,]\s*(?:\d{1,2}(?:\s*[,;e]\s*|\s+)?)+(?:[a-z]{3,9}\.?\s*(?:\d{4})?)?)*)\s*\)\s*$')


def date_notes(text):
    """The dates a performer is announced for, from a note after the name, and the name
    without it. '(20, 24, 27 ott.; 3, 5, 8 nov.)' -> {(10, 20), (10, 24), (10, 27), (11, 3), …};
    '(22, 29)' -> {(None, 22), (None, 29)} (days of the production's month(s)). No note -> None."""
    t = clean(text)
    m = _NOTE_RE.search(fold(t))
    if not m:
        return t, None
    body = m.group(1)
    out = set()
    for seg in re.split(r'\s*;\s*', body):
        mon = re.search(rf'({_MONTH_RX})\.?', seg)
        month = MONTHS[mon.group(1)] if mon else None
        for d in re.findall(r'\b(\d{1,2})\b(?!\d)', re.sub(r'\d{4}', ' ', seg)):
            if 1 <= int(d) <= 31:
                out.add((month, int(d)))
    if not out:
        return t, None
    return t[:m.start()].strip(' ,;–-'), out


def plays_on(notes, day):
    """True when ``day`` (a date) is one of the dates in ``notes`` (None = every date)."""
    if notes is None:
        return True
    return (day.month, day.day) in notes or (None, day.day) in notes


# ---------------------------------------------------------------------------
# names and roles
# ---------------------------------------------------------------------------

_PARTICLES = {'de', 'di', 'da', 'del', 'della', 'van', 'von', 'der', 'den', 'du', 'la', 'le', 'dos', 'das', 'y', 'e'}


def nice_name(name):
    """'DANIELE RUSTIONI' -> 'Daniele Rustioni', 'MYUNG-WHUN CHUNG' -> 'Myung-Whun Chung';
    names already in mixed case are kept."""
    n = clean(name).strip(' ,;:*')
    letters = [c for c in n if c.isalpha()]
    if not letters or (any(c.islower() for c in letters) and any(c.isupper() for c in letters)):
        return n
    words = []
    for i, w in enumerate(n.split()):
        lw = w.lower()
        if i and lw in _PARTICLES:
            words.append(lw)
            continue
        words.append(re.sub(r"(^|[-'.])(\w)", lambda m: m.group(1) + m.group(2).upper(), lw))
    return ' '.join(words)


ROLE_WORDS = {
    'direttore': 'Conductor', 'direttrice': 'Conductor', "direttore d'orchestra": 'Conductor',
    "direttrice d'orchestra": 'Conductor', 'maestro concertatore': 'Conductor', 'maestro concertatore e direttore': 'Conductor',
    'concertatore e direttore': 'Conductor', 'direzione': 'Conductor', 'direzione musicale': 'Conductor',
    'direttore musicale': 'Conductor', 'dirige': 'Conductor', 'conductor': 'Conductor', 'maestro': 'Conductor',
    'maestro del coro': 'Chorus master', 'maestra del coro': 'Chorus master', 'direttore del coro': 'Chorus master',
    'maestro del coro di voci bianche': 'Chorus master', 'chorus master': 'Chorus master',
    'pianoforte': 'Piano', 'piano': 'Piano', 'pianista': 'Piano', 'fortepiano': 'Fortepiano',
    'violino': 'Violin', 'violini': 'Violin', 'viole': 'Viola', 'violoncelli': 'Cello', 'pianoforti': 'Piano',
    'violino i': 'Violin', 'violino ii': 'Violin', 'primo violino': 'Violin', 'secondo violino': 'Violin',
    'violino solista': 'Violin', 'violin': 'Violin', 'viola': 'Viola', "viola d'amore": "Viola d'amore",
    'viola da gamba': 'Viola da gamba', 'violoncello': 'Cello', 'cello': 'Cello', 'contrabbasso': 'Double bass',
    'flauto': 'Flute', 'flauto dolce': 'Recorder', 'ottavino': 'Piccolo', 'oboe': 'Oboe', 'corno inglese': 'Cor anglais',
    'clarinetto': 'Clarinet', 'clarinetto basso': 'Bass clarinet', 'fagotto': 'Bassoon', 'controfagotto': 'Contrabassoon',
    'corno': 'Horn', 'tromba': 'Trumpet', 'trombone': 'Trombone', 'tuba': 'Tuba', 'saxofono': 'Saxophone',
    'sassofono': 'Saxophone', 'arpa': 'Harp', 'chitarra': 'Guitar', 'liuto': 'Lute', 'tiorba': 'Theorbo',
    'mandolino': 'Mandolin', 'organo': 'Organ', 'clavicembalo': 'Harpsichord', 'cembalo': 'Harpsichord',
    'fisarmonica': 'Accordion', 'maestro al cembalo': 'Harpsichord', 'maestro al fortepiano': 'Fortepiano', 'bandoneon': 'Bandoneon', 'percussioni': 'Percussion', 'timpani': 'Timpani',
    'marimba': 'Marimba', 'vibrafono': 'Vibraphone', 'celesta': 'Celesta', 'elettronica': 'Electronics',
    'live electronics': 'Electronics',
    'soprano': 'Soprano', 'mezzosoprano': 'Mezzo-soprano', 'mezzo-soprano': 'Mezzo-soprano', 'mezzo': 'Mezzo-soprano',
    'contralto': 'Contralto', 'alto': 'Alto', 'controtenore': 'Countertenor', 'contraltista': 'Countertenor',
    'sopranista': 'Countertenor', 'tenore': 'Tenor', 'baritono': 'Baritone', 'basso-baritono': 'Bass-baritone',
    'bassbaritono': 'Bass-baritone', 'basso baritono': 'Bass-baritone', 'basso': 'Bass', 'voce': 'Voice',
    'canto': 'Voice', 'voci': 'Voice',
    'voce recitante': 'Narrator', 'voce narrante': 'Narrator', 'narratore': 'Narrator', 'narratrice': 'Narrator',
    'attore': 'Narrator', 'attrice': 'Narrator', 'recitante': 'Narrator', 'lettura': 'Narrator', 'letture': 'Narrator',
    'presentatore': 'Presenter', 'presenta': 'Presenter', 'conduce': 'Presenter', 'introduzione': 'Presenter',
    'relatore': 'Presenter',
    'orchestra': 'Orchestra', 'coro': 'Choir', 'ensemble': 'Ensemble', 'quartetto': 'Ensemble',
    'primo ballerino': 'Dancer', 'prima ballerina': 'Dancer', 'étoile': 'Dancer', 'etoile': 'Dancer',
    'solista': 'Soloist', 'solisti': 'Soloist', 'interprete': 'Performer',
}
OFFSTAGE_WORDS = ('regia', 'regista', 'scene', 'scenografia', 'scenografo', 'costumi', 'costumista', 'luci', 'light',
                  'coreografia', 'coreografo', 'coreografa', 'coreografie', 'drammaturgia', 'video', 'movimenti',
                  'assistente', 'allestiment', 'progetto', 'ideazione', 'testi', 'testo', 'libretto', 'musica di',
                  'musica', 'musiche', 'traduzione', 'sound', 'suono', 'proiezioni', 'disegno', 'maestro collaboratore',
                  'maestri collaboratori', 'direttore allestimenti', 'direttore di scena', 'maestro di sala',
                  'consulenza', 'cura', 'produzione', 'ripresa', 'sopratitoli', 'design', 'animazioni', 'trucco',
                  'parrucco', 'ballerin', 'ibretto', 'coordinat', 'corpo di ballo', 'compagnia di ballo', 'mimo', 'figuranti', 'trama',
                  'nuovo allestimento', 'coproduzione', 'durata', 'location', 'lingua', 'tipo di spettacolo',
                  'sottotitoli', 'direttore artistico', 'direzione artistica', 'compagnia', 'company director')
VOICES = ('Soprano', 'Mezzo-soprano', 'Alto', 'Contralto', 'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass')

_FOLDED = {fold(k): v for k, v in ROLE_WORDS.items()}


def role_en(text):
    """Italian role text -> English role; None for off-stage roles; 'Performer' when unknown
    (e.g. an opera character)."""
    t = re.sub(r'\s*\([^)]*\)', '', fold(clean(text))).strip(' ,;:.-–')
    if not t:
        return 'Performer'
    if t in _FOLDED:
        return _FOLDED[t]
    parts = [p.strip() for p in re.split(r'\s*(?:,|/|&|\be\b)\s*', t) if p.strip()]
    mapped, off = [], 0
    for p in parts:
        p = re.sub(r'\s+(?:solista|i|ii|1|2)$', '', p)
        if p in _FOLDED:
            mapped.append(_FOLDED[p])
        elif any(w in p for w in OFFSTAGE_WORDS):
            off += 1
        else:
            mapped.append('Performer')
    if len(mapped) > 1 and 'Performer' in mapped:
        mapped = [m for m in mapped if m != 'Performer']
    if not mapped:
        return None if off else 'Performer'
    if off and mapped == ['Performer']:
        return None
    if 'Conductor' in mapped and len(mapped) > 1:          # "maestro concertatore e violino"
        rest = [m for m in mapped if m != 'Conductor']
        return ' & '.join(dict.fromkeys(rest)) + ' & direction'
    return ' & '.join(dict.fromkeys(mapped))


_CHOIR_RE = re.compile(r'\bcoro\b|\bcori\b|choir|chorus|chor\b|choeur|kammerchor|singers|vokal|vocal ensemble|cappella\b|'
                       r'voci bianche|schola cantorum|\bcantori\b')
_ORCH_RE = re.compile(r'orchestr|filarmonica|philharm|sinfonica\b|symphon|sinfoniett|camerata|kammerorchester|'
                      r'musiciens du|les talens|barockorchester|ensemble orchestral|accademia bizantina|il giardino armonico|'
                      r'europa galante|freiburger|concerto italiano|la scintilla|il pomo d|academy of')
_ENS_RE = re.compile(r'ensemble|quartett|quartet|quatuor|\btrio\b|quintet|sestetto|sextet|settimino|ottetto|octet|'
                     r'cameristi|solisti|consort|\bduo\b|\bband\b|collegium|accademia|brass|fiati|archi\b|players|'
                     r'professori|musicisti')


def group_role(name):
    """'Orchestra' / 'Choir' / 'Ensemble' when the name is obviously a group, else None."""
    n = fold(name)
    choir, orch = _CHOIR_RE.search(n), _ORCH_RE.search(n)
    if re.search(r'professori|solisti|musicisti|cameristi|prime parti|membri|members', n):
        return 'Ensemble'
    if choir and not orch:
        return 'Choir'
    if orch:
        return 'Orchestra'
    if _ENS_RE.search(n):
        return 'Ensemble'
    return None


_PLACEHOLDER_RE = re.compile(r'(?i)^(?:n\.?\s*n\.?|tba|t\.b\.a\.|tbd|da definire|da annunciare|da stabilire|in definizione|'
                             r'cast in definizione|cast coming soon|cast cooming soon|coming soon|\?+|-+)$')


def credit(role_text, name):
    """(English role, name) for a performer, None for off-stage people and placeholders.
    A group name ("Orchestra e Coro del Teatro …") keeps its group role."""
    n = nice_name(name)
    if not n or _PLACEHOLDER_RE.match(n) or len(n) > 120:
        return None
    if role_text is None or not clean(role_text).strip(' ,;:'):
        return (group_role(n) or 'Performer', n)
    role = role_en(role_text)
    if role is None:
        return None
    if role in ('Performer', 'Orchestra', 'Choir', 'Ensemble', 'Soloist'):
        g = group_role(n)
        if g:
            return (g, n)
    return (role, n)


_GROUP_WORDS = (('corpo di ballo', None), ('coro di voci bianche', 'Choir'), ('coro voci bianche', 'Choir'),
                ('orchestra', 'Orchestra'), ('coro', 'Choir'), ('ballo', None), ('tecnici', None))


def house_groups(text):
    """'Orchestra e Coro del Teatro alla Scala' -> [('Orchestra', 'Orchestra del Teatro alla Scala'),
    ('Choir', 'Coro del Teatro alla Scala')]; 'Corpo di Ballo e Orchestra del Teatro alla Scala' ->
    the orchestra only; any other line -> [(group_role, line)] or []."""
    t = clean(text).replace('\xa0', ' ')
    m = re.match(r"^((?:orchestra|coro di voci bianche|coro|corpo di ballo|ballo|tecnici)"
                 r"(?:\s*(?:,|\be\b)\s*(?:orchestra|coro di voci bianche|coro|corpo di ballo|ballo|tecnici))*)\s+"
                 r"((?:del|della|dello|dei|delle|di)\b\s*.+|dell['’]\s*.+|(?!e\b)\w.+)$", t, re.I)
    if not m:
        g = group_role(t)
        return [(g, t)] if g else []
    out = []
    for w in re.split(r'\s*(?:,|\be\b)\s*', m.group(1), flags=re.I):
        role = dict(_GROUP_WORDS).get(w.lower().strip())
        if role:
            out.append((role, f'{w.strip()[0].upper()}{w.strip()[1:].lower()} {m.group(2).strip()}'))
    return out


def minutes(text):
    """'2 ore e 6 minuti circa' / '3 ore e 50 minuti' / '63' ca.' / 'Ca. 1 h 25 min' -> minutes or None."""
    t = fold(clean(text))
    m = re.search(r'(\d+)\s*(?:ore|ora|h)\b(?:\s*(?:e\s*)?(\d+)\s*(?:minuti|min|\'|’))?', t)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2) or 0)
    m = re.search(r'(\d{2,3})\s*(?:minuti|min\b|\'|’)', t)
    return int(m.group(1)) if m else None


def split_names(text):
    """'Ekaterina Bakanova / Lucrezia Drei' -> ['Ekaterina Bakanova', 'Lucrezia Drei'] (a ';' or '/'
    inside a date note in brackets does not split)."""
    out, depth, cur = [], 0, ''
    t = clean(text)
    i = 0
    while i < len(t):
        ch = t[i]
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth = max(0, depth - 1)
        if depth == 0 and (ch == ';' or (ch == '/' and t[i - 1:i] == ' ' and t[i + 1:i + 2] == ' ')):
            out.append(cur)
            cur = ''
        else:
            cur += ch
        i += 1
    out.append(cur)
    return [x.strip() for x in out if x.strip()]


# ---------------------------------------------------------------------------
# which events to keep
# ---------------------------------------------------------------------------

SKIP_TITLE_RE = re.compile(
    r'visita guidata|visite guidate|\bvisita\b|\btour\b|guida all.opera|incontro con|incontri? |conferenz|presentazione|'
    r'prima delle prime|lezione|laboratori|workshop|per i bambini|per bambini|bambini|ragazzi|famiglie|famiglia|'
    r'\bscuol|scolastic|riservato alle scuole|open day|prova aperta|prove aperte|anteprima giovani|proiezion|'
    r'\bfilm\b|cinema|mostra\b|aperitiv|halloween|caccia al tesoro|baby|kids|junior|piccoli|'
    r'letture e note|talk\b|masterclass|master class|audizion|book ?city|libro|tribute to|in concerto pop', re.I)


def skip_title(text):
    return bool(SKIP_TITLE_RE.search(fold(clean(text))))


# ---------------------------------------------------------------------------
# incremental detail pages
# ---------------------------------------------------------------------------

REUSED_FIELDS = ('credits', 'program', 'venueName', 'type', 'series', 'durationMin')


def with_details(key, cands, read_page, apply, *, near_days=14, every_days=7, first=None):
    """Read one detail page per production, reusing what the previous feed knows.

    ``cands``: dicts with 'sid', 'title', 'start' (ISO), 'page' (detail URL or None).
    ``read_page(html, url)`` -> parsed data; ``apply(cand, data)`` fills the candidate.
    A candidate whose previous-feed record (same id, start, title; common.previous_event) has
    credits or a programme gets ``cand['prev']``; a page all of whose candidates have one is
    read only when common.refresh_due says so (concerts within ``near_days``, else about every
    ``every_days`` days). Pages with new candidates go first (``first(cand)`` sorts within that
    tier, default: soonest), each page once. Sets ``cand['detailed']``. -> pages read."""
    pages = {}
    for c in cands:
        c.setdefault('detailed', False)
        prev = previous_event(event_id(key, c['sid']), c['start'], title=c['title'])
        c['prev'] = prev if prev and (prev.get('credits') or prev.get('program')) else None
        if c.get('page'):
            pages.setdefault(c['page'], []).append(c)
    tiers = []
    for url, group in pages.items():
        soon = min(c['start'] for c in group)
        if any(c['prev'] is None for c in group):
            tiers.append((0, min((first(c) if first else c['start']) for c in group), url))
        elif refresh_due(url, soon, near_days=near_days, every_days=every_days):
            tiers.append((1, soon, url))
    tiers.sort()
    read = 0
    for _, _, url in tiers:
        if requests_left() <= 0:
            log.info('%s: request cap reached, %d detail page(s) left for a later run', key, len(tiers) - read)
            break
        try:
            data = read_page(get(url), url)
        except BudgetExceeded as err:
            log.warning('%s: stopped reading detail pages: %s', key, err.reason)
            break
        except FetchError as err:
            log.warning('%s: detail page failed: %s', key, err)
            continue
        read += 1
        for c in pages[url]:
            try:
                apply(c, data)
                c['detailed'] = True
            except (ValueError, KeyError, TypeError) as err:      # a page we cannot read: keep the listing
                log.warning('%s %s: detail not applied: %s', key, c['sid'], err)
    return read


def reuse(c):
    """The previous feed's details for a candidate not read this run: dict of REUSED_FIELDS."""
    prev = c.get('prev') or {}
    out = {}
    for k in REUSED_FIELDS:
        if prev.get(k):
            out[k] = prev[k]
    if 'credits' in out:
        out['credits'] = [(x.get('role'), x.get('name')) for x in out['credits'] if isinstance(x, dict)]
    if 'program' in out:
        out['program'] = [(x.get('composer'), x.get('title')) for x in out['program'] if isinstance(x, dict)]
    return out


# ---------------------------------------------------------------------------
# sites whose dates are only on the detail pages: reuse whole pages
# ---------------------------------------------------------------------------

_EVENT_FIELDS = ('durationMin', 'city', 'venueName', 'type', 'series', 'credits', 'program', 'ticketUrl', 'url', 'status')


def previous_by_page(key):
    """The previous feed's events of this source, grouped by their 'url' (the detail page)."""
    out = {}
    for e in previous_events(key):
        out.setdefault(e.get('url'), []).append(e)
    return out


def remake(key, e):
    """make_event() again from a previous-feed record (its id, title, start and fields)."""
    return make_event(key, e['id'], e['title'], e['start'], **{k: e[k] for k in _EVENT_FIELDS if e.get(k)})


def read_pages(key, urls, parse, *, near_days=14, every_days=7, order=None):
    """For sites whose performances (dates) are only on detail pages: read each page in ``urls``
    unless the previous feed already has its performances and common.refresh_due says it can
    wait (pages playing within ``near_days`` days are read every run, the others about every
    ``every_days`` days). New pages first (``order(url)`` sorts them), then due ones.
    ``parse(html, url)`` -> list of events. -> (events, pages read, pages reused)."""
    prev = previous_by_page(key)
    now = today_zurich().isoformat()
    todo, events, reused = [], [], 0
    for url in urls:
        old = [e for e in prev.get(url, []) if e.get('start', '')[:10] >= now]
        if not old:
            todo.append((0, order(url) if order else '', url))
        elif refresh_due(url, min(e['start'] for e in old), near_days=near_days, every_days=every_days):
            todo.append((1, min(e['start'] for e in old), url))
        else:
            events += [remake(key, e) for e in old]
            reused += 1
    todo.sort()
    read = 0
    for i, (_, _, url) in enumerate(todo):
        old = [e for e in prev.get(url, []) if e.get('start', '')[:10] >= now]
        if requests_left() <= 0:
            log.info('%s: request cap reached, %d page(s) left for a later run', key, len(todo) - i)
            events += [remake(key, e) for e in old]
            continue
        try:
            got = parse(get(url), url)
            read += 1
        except BudgetExceeded as err:
            log.warning('%s: stopped reading pages: %s', key, err.reason)
            events += [remake(key, e) for e in old]
            continue
        except FetchError as err:
            log.warning('%s: page failed: %s', key, err)
            events += [remake(key, e) for e in old]
            continue
        events += got
    return events, read, reused
