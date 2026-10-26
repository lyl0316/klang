"""Shared helpers for the eastern/central Swiss readers (St. Gallen, Trogen, Lucerne, Chur,
Aarau, Zug, Bern ...). Not a reader: modules starting with '_' are skipped by the registry.

Only facts are handled here: role labels, names, dates and venue/city strings.
"""
from __future__ import annotations

import re
import unicodedata

from common import clean, guess_type, to_zurich_iso

# ---------------------------------------------------------------------------
# text
# ---------------------------------------------------------------------------


def fold(text):
    """'Zürich Opéra' -> 'zurich opera' (lower-case, accents removed, ß -> ss)."""
    s = unicodedata.normalize('NFKD', str(text or '')).replace('ß', 'ss')
    return ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()


# ---------------------------------------------------------------------------
# dates
# ---------------------------------------------------------------------------

MONTHS = {
    'januar': 1, 'jan': 1, 'janvier': 1, 'gennaio': 1, 'january': 1, 'janner': 1,
    'februar': 2, 'feb': 2, 'fevrier': 2, 'febbraio': 2, 'february': 2,
    'marz': 3, 'maerz': 3, 'mar': 3, 'mars': 3, 'marzo': 3, 'march': 3,
    'april': 4, 'apr': 4, 'avril': 4, 'aprile': 4,
    'mai': 5, 'may': 5, 'maggio': 5,
    'juni': 6, 'jun': 6, 'juin': 6, 'giugno': 6, 'june': 6,
    'juli': 7, 'jul': 7, 'juillet': 7, 'luglio': 7, 'july': 7,
    'august': 8, 'aug': 8, 'aout': 8, 'agosto': 8,
    'september': 9, 'sep': 9, 'sept': 9, 'septembre': 9, 'settembre': 9,
    'oktober': 10, 'okt': 10, 'oct': 10, 'octobre': 10, 'ottobre': 10, 'october': 10,
    'november': 11, 'nov': 11, 'novembre': 11,
    'dezember': 12, 'dez': 12, 'dec': 12, 'decembre': 12, 'dicembre': 12, 'december': 12,
}

_TIME_RE = re.compile(r'(?<!\d)([01]?\d|2[0-3])\s*[.:h]\s*([0-5]\d)(?!\d)')


def month_number(word):
    return MONTHS.get(fold(word).strip('. '))


def find_date(text):
    """First date in text: '13. November 2026', '13.11.2026', '13.11.26', '2026-11-13'
    -> (y, m, d) or None."""
    t = fold(clean(text))
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', t)
    if m:
        return int(m.group(1)), int(m.group(2)), int(m.group(3))
    m = re.search(r'(?<!\d)(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4}|\d{2})(?!\d)', t)
    if m:
        y = int(m.group(3))
        return (y + 2000 if y < 100 else y), int(m.group(2)), int(m.group(1))
    m = re.search(r'(?<!\d)(\d{1,2})\.?\s+([a-z]{3,9})\.?\s+(\d{4})', t)
    if m and month_number(m.group(2)):
        return int(m.group(3)), month_number(m.group(2)), int(m.group(1))
    return None


def find_time(text):
    """First time of day in text ('19.30 Uhr', '19:30', '19h30') -> (hh, mm) or None."""
    m = _TIME_RE.search(clean(text))
    return (int(m.group(1)), int(m.group(2))) if m else None


def local_iso(y, m, d, hh, mm):
    """Swiss local wall time -> ISO with the right offset."""
    return to_zurich_iso(f'{y:04d}-{m:02d}-{d:02d}T{hh:02d}:{mm:02d}:00')


# ---------------------------------------------------------------------------
# roles
# ---------------------------------------------------------------------------

CREW_RE = re.compile(
    r'buhne|buhnenbild|kostum|licht|dramaturg|video|maske|ausstattung|technik|sound|ton\b|'
    r'textfassung|konzept|idee|assistenz|inspizienz|souffl|einstudierung|chordirektor|chorleitung|'
    r'choreinstudierung|chorus ?master|produktion|management|fotograf|grafik|ubertitel|'
    r'korrepetition|repetitor|studienleitung|vermittlung|moderation|moderator|referent|einfuhrung|'
    r'gesprach|reflexion|lesung|szenografie|mitarbeit|regieassistenz|abendspielleitung|kamera|'
    r'libretto|text\b|ubersetzung|bearbeitung|arrangement|komposition|komponist|composer|'
    r'leitung kinderchor|projektleitung|gesamtleitung organisation')

ROLE_RULES = tuple((re.compile(p), r) for p, r in (
    (r'musikalische leitung|dirigent|dirigat|conductor|\bleitung\b|direction musicale|direzione|music director|'
     r'musikdirektor', 'Conductor'),
    (r'inszenierung|\bregie\b|stage director|mise en scene|regia', 'Director'),
    (r'choreogra', 'Choreographer'),
    (r'konzertmeister', 'Violin'),
    (r'mezzo', 'Mezzo-soprano'),
    (r'sopran', 'Soprano'),
    (r'countertenor|\baltus\b|counter-tenor', 'Countertenor'),
    (r'bass-?bariton', 'Bass-baritone'),
    (r'bariton', 'Baritone'),
    (r'tenor', 'Tenor'),
    (r'kontrabass|double bass|contrebasse|contrabbasso', 'Double bass'),
    (r'violoncello|cello', 'Cello'),
    (r'viola\b|bratsche|\balto\b(?= *$)', 'Viola'),
    (r'violin|geige|violon\b|violino', 'Violin'),
    (r'hammerklavier|fortepiano|hammerflugel', 'Fortepiano'),
    (r'klavier|piano|flugel|pianoforte', 'Piano'),
    (r'cembalo|harpsichord|clavecin', 'Harpsichord'),
    (r'orgel|organ\b|orgue|organo', 'Organ'),
    (r'harfe|harp\b|harpe|arpa', 'Harp'),
    (r'theorbe|theorbo', 'Theorbo'),
    (r'laute|lute\b|luth', 'Lute'),
    (r'gitarre|guitar|guitare|chitarra', 'Guitar'),
    (r'mandolin', 'Mandolin'),
    (r'akkordeon|accordion|accordeon|bandoneon', 'Accordion'),
    (r'blockflote|recorder|flute a bec', 'Recorder'),
    (r'flote|flute|flauto|traverso', 'Flute'),
    (r'englischhorn|cor anglais', 'Cor anglais'),
    (r'oboe|hautbois', 'Oboe'),
    (r'klarinette|clarinet|clarinette|clarinetto', 'Clarinet'),
    (r'fagott|bassoon|basson', 'Bassoon'),
    (r'saxo', 'Saxophone'),
    (r'trompete|trumpet|trompette|tromba', 'Trumpet'),
    (r'posaune|trombone', 'Trombone'),
    (r'tuba', 'Tuba'),
    (r'horn\b|\bcor\b|corno', 'Horn'),
    (r'pauke|timpani', 'Timpani'),
    (r'schlagzeug|perkussion|percussion|schlagwerk|marimba|vibraphon', 'Percussion'),
    (r'hackbrett|cimbalom|zither', 'Dulcimer'),
    (r'\balt\b|\balto\b|altistin|contralto', 'Alto'),
    (r'\bbass\b|\bbasso\b|\bbasse\b', 'Bass'),
    (r'stimme|gesang|sanger|vocals?\b|voice|voix|\bvoce\b|chanteu|cantante', 'Voice'),
    (r'sprecher|sprechen|erzahler|rezitation|narrat|recitant', 'Narrator'),
    (r'chor|choir|choeur|coro\b|vokalensemble|kantorei', 'Choir'),
    (r'orchester|orchestra|orchestre|philharmoni|sinfonietta|camerata', 'Orchestra'),
    (r'ensemble|quartett|quartet|quatuor|trio\b|quintett|quintet|\bband\b|\bduo\b', 'Ensemble'),
    (r'tanz|dance|danse|tanzer', 'Dancer'),
    (r'solist|soloist', 'Soloist'),
))

GROUP_RE = re.compile(
    r'orchest|sinfoni|symphon|philharm|ensemble|quartet|quartett|quatuor|cuarteto|quartetto|kwartet|\btrio\b|quintet|'
    r'\bchor|chor\b|cetra\b|accademia|il giardino|musica antiqua|\bconcerto\b|barockorchester|'
    r'choir|choeur|camerata|consort|kantorei|vokal|vocal|\bband\b|\bduo\b|solisten\b|sinfonietta|'
    r'capella|cappella|musici|akademie|academy|chamber|kammer|singers|sangerknaben|voices|tanzcompagnie|'
    r'tanzkompanie|ballett\b|kollegium|collegium|singkreis|\bcantus\b|\bscola\b|\bcantores\b|kammerchor|madchenchor|knabenchor|'
    r'concert-?verein|konzertverein')
VOICES = {'Soprano', 'Mezzo-soprano', 'Alto', 'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass', 'Voice'}
NON_PLAYING = {'Conductor', 'Director', 'Choreographer', 'Narrator', 'Dancer'}


def group_role(name):
    n = fold(name)
    if re.search(r'chor|choir|choeur|kantorei|vokal|vocal|singers|sangerknaben|voices|coro\b|singkreis|\bcantus\b|'
                 r'\bscola\b|\bcantores\b|stimmen\b', n):
        return 'Choir'
    if re.search(r'orchest|sinfoni|symphon|philharm|camerata|sinfonietta|kammerphil|kollegium|collegium|\bcetra\b|concert-?verein|konzertverein', n):
        return 'Orchestra'
    return 'Ensemble'


def is_group(name):
    return bool(GROUP_RE.search(fold(name)))


def role_for(label, name=''):
    """Klang role for a role label ('Musikalische Leitung', 'Violine', 'Sopran' ...), 'Performer'
    for an unknown label such as an opera character, or None for production crew."""
    f = fold(clean(label)).strip(' :-–')
    m = re.match(r'(?:musikalische )?leitung,? (?:und|&) (.+)$', f) or re.match(r'(.+?),? (?:und|&) (?:musikalische )?leitung$', f)
    if m and not re.search(r'regie|inszenierung|konzept|moderation', m.group(1)):
        return role_for(m.group(1), name)                 # "Leitung und Violine": directs from the violin
    if f:
        if re.match(r'(?:tanz|tanzer\w*|dance|danse)\b', f):
            return 'Dancer'                                 # "Tanz, Choreografische Mitarbeit und Text"
        if re.search(r'ballettkompanie|tanzkompanie|tanzcompagnie|dance company|compagnie de danse', f):
            return 'Ensemble'                               # "OtraDanza – Ballettkompanie"
        if re.search(r'assistenz|probenleitung|abendspielleitung', f):
            return None                                     # "Probenleitung und choreografische Assistenz"
        # an opera character can contain an instrument word ("Pianist"); crew first
        for rx, role in ROLE_RULES[:3]:
            if rx.search(f):
                return role
        if CREW_RE.search(f):
            return None
        for rx, role in ROLE_RULES[3:]:
            if rx.search(f):
                if role in ('Orchestra', 'Choir', 'Ensemble') and name and not is_group(name):
                    return 'Performer'
                return role
    if name and is_group(name):
        return group_role(name)
    return 'Performer'


def split_names(text):
    """'A, B und C' / 'A / B' -> ['A', 'B', 'C']."""
    out = []
    for part in re.split(r'\s*(?:,|;|/|\bund\b|\bet\b|\be\b|&|\+)\s*', clean(text)):
        part = part.strip(' .:-–')
        if len(part) > 2:
            out.append(part)
    return out


PLACEHOLDER = re.compile(r'^(?:n\.?\s?n\.?|tba|tbd|tbc|noch offen|folgt|wird bekannt gegeben)$', re.I)


def credits_from_pairs(pairs):
    """[(label, name)] -> [(role, name)] (crew dropped)."""
    out = []
    for label, name in pairs:
        name = clean(name).strip(' ,;:-–')
        if not name or PLACEHOLDER.match(name):
            continue
        role = role_for(label, name)
        if role:
            out.append((role, name))
    return out


def name_role_line(line):
    """'Rudolf Lutz, Leitung' / 'Anna Muster (Sopran)' / 'Sopran: Anna Muster' -> (role, name) or None."""
    line = clean(line).strip(' ,;')
    if not line or len(line) > 160:
        return None
    m = re.match(r'^(.+?)\s*\(([^()]+)\)$', line)
    if m:
        name, label = m.group(1), m.group(2)
    else:
        m = re.match(r'^([^:]{2,60}):\s*(.+)$', line)
        if m:
            label, name = m.group(1), m.group(2)
        else:
            m = re.match(r'^(.+?),\s*([^,]{2,60})$', line)
            if m:
                name, label = m.group(1), m.group(2)
            else:
                name, label = line, ''
    name = name.strip(' ,;:-–')
    if not name or PLACEHOLDER.match(name) or re.search(r'\d{3,}|https?:|@', name):
        return None
    role = role_for(label, name)
    return (role, name) if role else None


def infer_type(title, credits, hint=None):
    """orchestral / chamber / recital / vocal-opera from the title and line-up (or hint)."""
    t = guess_type(title)
    if t == 'vocal-opera':
        return t
    roles = [r for r, _ in credits]
    if 'Choir' in roles:
        return 'vocal-opera'
    if 'Conductor' in roles or 'Orchestra' in roles:
        return 'orchestral'
    players = [r for r in roles if r not in NON_PLAYING]
    if len(players) == 1 and players[0] not in ('Ensemble', 'Performer'):
        return 'recital'
    if len(players) == 2 and (set(players) & VOICES) and ('Piano' in players or 'Guitar' in players or 'Lute' in players):
        return 'recital'
    if 2 <= len(players) <= 9 or 'Ensemble' in roles:
        return 'chamber'
    return t or hint


# ---------------------------------------------------------------------------
# one-line line-ups
# ---------------------------------------------------------------------------

PERSON = re.compile(r"^[A-ZÄÖÜÉ][\w'’.\-]+(?:\s+(?:von|van|de|del|da|di|le|la)?\s*[A-ZÄÖÜÉ][\w'’.\-]+){1,3}$")


def _lineup_name(text):
    name = re.sub(r'^(?:und|mit|sowie|der|die|das|dem|den)\s+', '', text.strip(' ,&'), flags=re.I).strip()
    name = re.sub(r'^(?:der|die|das|dem|den)\s+', '', name, flags=re.I)
    name = re.sub(r'^(?:special guest|gast|mit)\s+', '', name, flags=re.I)
    if not name:
        return None
    if re.match(r'(ein|zwei|drei|vier|funf|sechs|mitglieder|musiker)', fold(name)):
        return None
    if is_group(name):
        return group_role(name), name
    if PERSON.match(name) and not re.search(r'schule|forderung|kanton|stadt|verein|gesellschaft|hochschule', fold(name)):
        return 'Performer', name
    return None


def parse_lineup(sub):
    """'mit A (Dirigent), B & C (Klaviere)' / 'Zuger Sinfonietta, D (Klavier) und E (Leitung)' -> [(role, name)]."""
    s = sub.split(' | ')[0].strip()
    credits = []
    if re.search(r'\bmit\s', s):
        head, s = re.split(r'\bmit\s+', s, 1)
        if is_group(head.strip(' ,')) and len(head) < 60:
            credits.append((group_role(head.strip(' ,')), head.strip(' ,')))
    pos = 0
    for m in re.finditer(r'\(([^()]+)\)', s):
        chunk = s[pos:m.start()]
        pos = m.end()
        parts = [p for p in re.split(r',|\bund\b', chunk) if p.strip()]
        if not parts:
            continue
        for extra in parts[:-1]:
            c = _lineup_name(extra)
            if c:
                credits.append(c)
        role = role_for(m.group(1))
        for name in re.split(r'\s*&\s*', parts[-1]):
            name = re.sub(r'^(?:und|mit|sowie|special guest|der|die|das)\s+', '', name.strip(' ,'), flags=re.I)
            if name and role:
                credits.append((role, name))
    for extra in re.split(r',|\bund\b', s[pos:]):
        c = _lineup_name(extra)
        if c:
            credits.append(c)
    return credits


# ---------------------------------------------------------------------------
# what is not a concert
# ---------------------------------------------------------------------------

NOT_A_CONCERT = re.compile(
    r'(?<!auf)fuhrung|workshop|\bkurs\b|\bkurse\b|theaterkurs|masterclass|meisterkurs|einfuhrung|'
    r'vortrag|(?<!konzert)gesprach(?!skonzert)|podium|lesung|\btalk\b|kinderkonzert|krabbel|familienkonzert|'
    r'schulkonzert|schulvorstellung|kulturknirpse|kinderstuck|familienstuck|\bgala\b|\bball\b|sinfonieball|'
    r'ausstellung|vernissage|\bkino\b|filmvorfuhrung|adventscafe|operncafe|kostprobe|'
    r'offentliche probe|probenbesuch|generalprobe|tag der offenen|kostumverkauf|preisverleihung|'
    r'philosophische soiree|einfuhrungssoiree|late.night|jugendtheaterclub|theaterclub|spielclub|'
    r'mitsingen|singalong|mitmach|kinder\s*\(|\bkids\b|\bbaby|nuggi|purzel|schuler')

FOREIGN_RE = re.compile(
    # '(DE)', '// AT': country codes, but not Swiss canton codes (BE, FR, LU ...)
    r'\((de|at|it|li|nl|uk|us|cz|pl|es)\)|//\s*(de|at|it|li)\b|deutschland|germany|osterreich|'
    r'austria|italien|italia|frankreich|france\b|liechtenstein|vaduz|berlin|wien|vienna|munchen|'
    r'hamburg|leipzig|eisenach|bonn\b|paris\b|london\b|milano|mailand|salzburg|bregenz|konstanz|'
    r'freiburg i|stuttgart|dresden|koln|frankfurt|amsterdam|prag|praha')


def looks_foreign(text):
    return bool(FOREIGN_RE.search(fold(text)))


# ---------------------------------------------------------------------------
# WordPress "The Events Calendar" (tribe) REST API and HTML-to-lines
# ---------------------------------------------------------------------------

def tribe_events(api, start_date, per_page=50, max_pages=5):
    """Raw events from ``<site>/wp-json/tribe/events/v1/events`` from ``start_date`` on.
    FetchError from the first page propagates (the source then counts as failed)."""
    from common import get_json
    out, page = [], 1
    while True:
        sep = '&' if '?' in api else '?'
        data = get_json(f'{api}{sep}start_date={start_date}&per_page={per_page}&page={page}')
        out += data.get('events') or []
        if page >= int(data.get('total_pages') or 1) or page >= max_pages:
            return out
        page += 1


def html_lines(fragment):
    """Visible text of an HTML fragment as a list of non-empty lines (block tags and <br> break lines;
    a line ending in ',' is joined with the next: 'Lucie Chartin,' + 'Sopran')."""
    s = re.sub(r'(?is)<(script|style|svg)\b.*?</\1>', ' ', fragment or '')
    s = re.sub(r'(?i)<br\s*/?>|</?(p|div|li|h[1-6]|tr|td|th|dd|dt|ul|ol|section|article)\b[^>]*>', '\n', s)
    lines = []
    for raw in s.split('\n'):
        line = clean(raw)
        if not line:
            continue
        if lines and lines[-1].endswith(','):
            lines[-1] = f'{lines[-1]} {line}'
        else:
            lines.append(line)
    return lines
