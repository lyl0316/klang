"""Shared helpers for the readers of central and southern Italian houses (Santa Cecilia and
the Opera in Rome, the Maggio Musicale Fiorentino, the Teatro Comunale di Bologna and the
Teatro Regio di Parma).

Not a reader itself: the registry skips modules whose name starts with '_'.
Only *facts* come out of here (role names, people, works, dates); never description text.

Italian theatre sites print cast and programme as loosely formatted HTML: "role <b>Name</b>"
lines, "<b>Composer</b> Work" lines, bold group names ("Orchestra e Coro del Teatro …") and
a closing paragraph of prose. ``paragraphs`` turns such a fragment into lines of
(kind, text) segments and ``parse_block`` reads credits and works from them.

Note for build.py --fresh-hours: a reader's codeHash covers only its own file and
common.py, so an edit here does not by itself invalidate yesterday's reused events.
"""
from __future__ import annotations

import html as _html
import re
import unicodedata
from datetime import datetime

from common import clean, infer_type, to_zurich_iso

ROME = 'Europe/Rome'


def fold(text):
    """'Opéra di Roma’' -> "opera di roma'" (for matching only)."""
    s = unicodedata.normalize('NFKD', str(text or '')).replace('ß', 'ss')
    s = ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()
    return s.replace('’', "'").replace('‘', "'")


# ---------------------------------------------------------------------------
# dates
# ---------------------------------------------------------------------------

MONTHS = {
    'gennaio': 1, 'gen': 1, 'febbraio': 2, 'feb': 2, 'marzo': 3, 'mar': 3, 'aprile': 4, 'apr': 4,
    'maggio': 5, 'mag': 5, 'giugno': 6, 'giu': 6, 'luglio': 7, 'lug': 7, 'agosto': 8, 'ago': 8,
    'settembre': 9, 'set': 9, 'sett': 9, 'ottobre': 10, 'ott': 10, 'novembre': 11, 'nov': 11,
    'dicembre': 12, 'dic': 12,
    'january': 1, 'jan': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6, 'jun': 6,
    'july': 7, 'jul': 7, 'august': 8, 'aug': 8, 'september': 9, 'sep': 9, 'october': 10, 'oct': 10,
    'november': 11, 'december': 12, 'dec': 12,
}


def month_number(word):
    """'Novembre' / 'nov' / 'November' -> 11, else None."""
    w = fold(word).strip(' .')
    return MONTHS.get(w) or MONTHS.get(w[:3]) if w else None


def rome_iso(y, m, d, hh, mm):
    """Local Italian wall-clock time -> Klang's ISO start (Swiss offset)."""
    return to_zurich_iso(datetime(int(y), int(m), int(d), int(hh), int(mm)), assume=ROME)


# ---------------------------------------------------------------------------
# roles: Italian role words -> Klang's English role names
# ---------------------------------------------------------------------------

ROLE_WORDS = {
    # conducting
    'direttore': 'Conductor', 'direttrice': 'Conductor', 'direzione': 'Conductor', 'dirige': 'Conductor',
    'maestro concertatore e direttore': 'Conductor', 'maestro concertatore': 'Conductor',
    'maestra concertatrice e direttrice': 'Conductor', 'maestra concertatrice': 'Conductor',
    'direttore musicale': 'Conductor', "direttore d'orchestra": 'Conductor', 'concertatore': 'Conductor',
    'direzione musicale': 'Conductor', 'conductor': 'Conductor', 'maestro al cembalo e direttore': 'Harpsichord & direction',
    'maestro del coro': 'Chorus master', 'maestra del coro': 'Chorus master', 'direttore del coro': 'Chorus master',
    'maestro del coro di voci bianche': 'Chorus master', 'maestra del coro di voci bianche': 'Chorus master',
    'maestro del coro voci bianche': 'Chorus master', 'maestra del coro voci bianche': 'Chorus master',
    'maestro del coro di voci bianche e giovanile': 'Chorus master', 'direttore del coro di voci bianche': 'Chorus master',
    # staging that Klang keeps
    'regia': 'Director', 'regista': 'Director', 'regia e coreografia': 'Director & choreographer',
    'coreografia': 'Choreographer', 'coreografie': 'Choreographer', 'coreografo': 'Choreographer',
    'coreografa': 'Choreographer', 'regia, scene e costumi': 'Director', 'regia e scene': 'Director',
    'regia, scene, costumi e luci': 'Director', 'regia e luci': 'Director',
    # keyboards
    'pianoforte': 'Piano', 'piano': 'Piano', 'pianista': 'Piano', 'pianoforti': 'Piano', 'fortepiano': 'Fortepiano',
    'clavicembalo': 'Harpsichord', 'cembalo': 'Harpsichord', 'organo': 'Organ', 'fisarmonica': 'Accordion',
    'bandoneon': 'Bandoneon', 'celesta': 'Celesta', 'tastiere': 'Keyboards',
    # strings
    'violino': 'Violin', 'violini': 'Violin', 'violinista': 'Violin', 'viola': 'Viola', 'violoncello': 'Cello',
    'violoncellista': 'Cello', 'violoncelli': 'Cello', 'contrabbasso': 'Double bass', 'viola da gamba': 'Viola da gamba',
    'arpa': 'Harp', 'chitarra': 'Guitar', 'liuto': 'Lute', 'tiorba': 'Theorbo', 'mandolino': 'Mandolin',
    'cimbalom': 'Cimbalom', 'violino barocco': 'Baroque violin',
    # winds
    'flauto': 'Flute', 'flauto dolce': 'Recorder', 'ottavino': 'Piccolo', 'oboe': 'Oboe', 'corno inglese': 'Cor anglais',
    'clarinetto': 'Clarinet', 'clarinetto basso': 'Bass clarinet', 'fagotto': 'Bassoon', 'corno': 'Horn',
    'tromba': 'Trumpet', 'trombone': 'Trombone', 'tuba': 'Tuba', 'sassofono': 'Saxophone', 'sax': 'Saxophone',
    # percussion
    'percussioni': 'Percussion', 'percussione': 'Percussion', 'timpani': 'Timpani', 'marimba': 'Marimba',
    'vibrafono': 'Vibraphone', 'batteria': 'Drums',
    # voices
    'soprano': 'Soprano', 'mezzosoprano': 'Mezzo-soprano', 'mezzo-soprano': 'Mezzo-soprano', 'mezzo': 'Mezzo-soprano',
    'contralto': 'Contralto', 'controtenore': 'Countertenor', 'contraltista': 'Countertenor', 'sopranista': 'Countertenor',
    'tenore': 'Tenor', 'baritono': 'Baritone', 'basso-baritono': 'Bass-baritone', 'basso baritono': 'Bass-baritone',
    'bassbaritono': 'Bass-baritone', 'basso': 'Bass', 'voce': 'Voice', 'voci': 'Voice', 'canto': 'Voice',
    'voce solista': 'Voice', 'cantante': 'Voice', 'soprani': 'Soprano', 'mezzosoprani': 'Mezzo-soprano',
    'tenori': 'Tenor', 'baritoni': 'Baritone', 'bassi': 'Bass', 'contralti': 'Contralto',
    # speaking
    'voce recitante': 'Narrator', 'voce narrante': 'Narrator', 'narratore': 'Narrator', 'narratrice': 'Narrator',
    'attore': 'Narrator', 'attrice': 'Narrator', 'lettura': 'Narrator', 'letture': 'Narrator', 'recitazione': 'Narrator',
    'con': 'Performer', 'artista ospite': 'Dancer', 'artisti ospiti': 'Dancer', 'primo ballerino': 'Dancer',
    'prima ballerina': 'Dancer', 'étoile': 'Dancer', 'presenta': 'Presenter', 'conduce': 'Presenter', 'presentatore': 'Presenter', 'presentatrice': 'Presenter',
    'primo violino': 'Concertmaster', 'violino di spalla': 'Concertmaster',
    # groups
    'orchestra': 'Orchestra', 'coro': 'Choir', 'coro di voci bianche': 'Choir', 'voci bianche': 'Choir',
    'ensemble': 'Ensemble', 'quartetto': 'Ensemble', 'trio': 'Ensemble', 'compagnia': 'Ensemble',
    'corpo di ballo': 'Ensemble',
    # English (some sites mix)
    'violin': 'Violin', 'cello': 'Cello', 'flute': 'Flute', 'tenor': 'Tenor', 'baritone': 'Baritone',
    'bass': 'Bass', 'harpsichord': 'Harpsichord', 'organ': 'Organ', 'guitar': 'Guitar', 'harp': 'Harp',
    'clarinet': 'Clarinet', 'trumpet': 'Trumpet', 'horn': 'Horn', 'percussion': 'Percussion', 'voice': 'Voice',
    'narrator': 'Narrator', 'choir': 'Choir', 'director': 'Director', 'choreography': 'Choreographer',
}
# people behind the scenes: not credited
OFFSTAGE_RE = re.compile(
    r'^(?:scen[ae]|scrittura|immagini|costum|luci\b|light|disegno luci|video|proiezion|drammaturg|assistent|collaborat|movimenti|'
    r'maestro d.armi|maestri? collaborator|maestro al fortepiano|maestro alle luci|maestro preparatore|'
    r'allestimento|progetto|ideazione|concept|testo|testi|libretto|traduzione|sovratitol|elaborazion|'
    r'trascrizion|orchestrazion|arrangiament|adattamento|riduzione|consulen|cura|a cura|realizzazione|'
    r'costruzion|sound|suono|fonica|amplific|regia del suono|regia video|regista collaborat|'
    r'ripresa|coreografia ripresa|ripresa coreograf|regia ripresa|aiuto|direttore di scena|direttore dell.allestimento|'
    r'direttore tecnico|direttore artistico|sovrintend|produzione|coproduzione|in collaborazione|'
    r'responsabile|direttore di palcoscenico|maestro dei ballabili|ballerin|danzator|solisti|primi ballerini|'
    r'etoile|étoile|interpreti|personaggi|maestro del coro di sala|mimi|figurant|acrobat|ospiti|'
    r'opera realizzata|realizzat|direttrice di compagnia|direttore di compagnia|coordinat|nell.ambito)', re.I)
# a role that names an instrument or voice keeps its Italian name when it is not in ROLE_WORDS
_INSTRUMENTISH = re.compile(r'(fono|flauto|corno|tromba|trombone|violino|viola|cello|basso|arpa|piano|organo|liuto|'
                            r'chitarra|percussion|clarinetto|fagotto|oboe|soprano|tenore|baritono|contralto|voce)$')
_VOICE_IN_PARENS = re.compile(r'\((soprano|mezzosoprano|mezzo-soprano|contralto|controtenore|tenore|baritono|'
                              r'basso|basso-baritono|attore|attrice|voce recitante|ruolo muto)\)', re.I)


def _norm_role(text):
    t = clean(text).replace('’', "'").strip(' ,;:–-').lower()
    t = re.sub(r'\s+', ' ', t)
    return t


def role_en(text, *, characters=True, loose=False):
    """Italian role text -> English role; None for off-stage people or text that is not a role.

    'direttore' -> 'Conductor', 'violino e direttore' -> 'Violin & direction',
    'Canio (tenore)' -> 'Canio' (a character; only when ``characters``), 'Scene e Luci' -> None.
    An unknown word that is not plausibly a character name gives None."""
    raw = clean(text).strip(' ,;:–-')
    if not raw or len(raw) > 60 or ':' in raw or re.search(r'\d{3}|https?:|@', raw):
        return None
    t = re.sub(r'\s+(?:\d+|i{1,3}|iv)$', '', _norm_role(raw))        # 'Soprano II'
    if t in ROLE_WORDS:
        return ROLE_WORDS[t]
    if OFFSTAGE_RE.match(t):
        return None
    voice = _VOICE_IN_PARENS.search(raw)
    base = re.sub(r'\s*\([^)]*\)\s*', ' ', raw).strip(' ,;:–-')
    tb = _norm_role(base)
    if tb in ROLE_WORDS:
        return ROLE_WORDS[tb]
    parts = [p for p in re.split(r'\s*(?:,|/|&|\be\b|\band\b)\s*', tb) if p]
    mapped, offstage = [], 0
    for p in parts:
        p = re.sub(r'\s*\d+$', '', p)
        if p in ROLE_WORDS:
            mapped.append(ROLE_WORDS[p])
        elif OFFSTAGE_RE.match(p) or p in ('luci', 'scene', 'costumi'):
            offstage += 1
        elif _INSTRUMENTISH.search(p) and len(p.split()) <= 3:
            mapped.append(p[:1].upper() + p[1:])
        else:
            mapped = None
            break
    if mapped is not None and not mapped and offstage:
        return None
    if mapped:
        if 'Conductor' in mapped and len(mapped) > 1:
            return ' & '.join(m for m in mapped if m != 'Conductor') + ' & direction'
        return ' & '.join(dict.fromkeys(mapped))
    if not characters:
        return None
    # a character in an opera ("Andrea Chénier", "Nedda (soprano)", "Mrs. Alice Ford", "La mulatta Bersi")
    if voice or (base and (base[0].isupper() or loose) and len(base.split()) <= 7 and not re.search(r'[!?]$', base)):
        return base
    return None


# ---------------------------------------------------------------------------
# groups
# ---------------------------------------------------------------------------

_GROUP_WORDS = (
    ('orchestra', 'Orchestra'), ('filarmonica', 'Orchestra'), ('sinfonica', 'Orchestra'), ('orchester', 'Orchestra'),
    ('orchestre', 'Orchestra'), ('philharmoni', 'Orchestra'), ('symphony', 'Orchestra'), ('sinfonieorchester', 'Orchestra'),
    ('camerata', 'Orchestra'), ('voci bianche', 'Choir'), ('coro', 'Choir'), ('choir', 'Choir'), ('chorus', 'Choir'),
    ('chor', 'Choir'), ('choeur', 'Choir'), ('cantori', 'Choir'), ('vocal ensemble', 'Choir'), ('singers', 'Choir'),
    ('corpo di ballo', 'Ensemble'), ('balletto', 'Ensemble'), ('ballet', 'Ensemble'), ('compagnia', 'Ensemble'),
    ('company', 'Ensemble'), ('ensemble', 'Ensemble'), ('quartetto', 'Ensemble'), ('quartet', 'Ensemble'),
    ('quatuor', 'Ensemble'), ('quartett', 'Ensemble'), ('trio', 'Ensemble'), ('quintetto', 'Ensemble'),
    ('quintet', 'Ensemble'), ('consort', 'Ensemble'), ('soloists', 'Ensemble'), ('solisti', 'Ensemble'),
    ('baroque', 'Ensemble'), ('barocca', 'Ensemble'), ('accademia', 'Ensemble'), ('academy', 'Ensemble'),
    ('collegium', 'Ensemble'), ('hesperion', 'Ensemble'), ('capella reial', 'Choir'), ('cappella', 'Ensemble'),
    ('capella', 'Ensemble'), ('juniorchestra', 'Orchestra'), ('musiciens', 'Ensemble'), ('academia', 'Ensemble'), ('filarmonici', 'Ensemble'),
    ('jugendorchester', 'Orchestra'), ('orchestre', 'Orchestra'), ('kammerorchester', 'Orchestra'),
    ('les arts florissants', 'Ensemble'), ('il pomo d', 'Ensemble'), ('concerto italiano', 'Ensemble'), ('band', 'Ensemble'),
)


def group_role(name):
    """'Orchestra' / 'Choir' / 'Ensemble' when the name is obviously a group, else None."""
    f = fold(name)
    first = None
    for word, role in _GROUP_WORDS:
        m = re.search(rf'(?<![a-z]){re.escape(word)}', f)
        if m and (first is None or m.start() < first[0]):
            first = (m.start(), role)
    if first is None:
        return None
    if re.search(r'(?<![a-z])orchest|filarmonic|philharm|sinfonic|symphon', f) and first[1] == 'Choir' and \
            not re.match(r'(?:coro|choir|chor)\b', f):
        return 'Orchestra'
    return first[1]


_GROUP_LIST_RE = re.compile(
    r"^((?:orchestra|coro(?: di voci bianche| voci bianche| maschile| femminile)?|voci bianche|corpo di ballo|coro giovanile|"
    r"[ée]toiles|primi ballerini|solisti)(?:\s*(?:,|\be\b)\s*(?:orchestra|coro(?: di voci bianche| voci bianche| maschile| femminile)?|"
    r"voci bianche|corpo di ballo|coro giovanile|[ée]toiles|primi ballerini|solisti))+)\s+"
    r"((?:del|della|dello|dell['’]|dei|degli|di)\b.*|dell['’].*)$", re.I)


def split_groups(name):
    """'Orchestra e Coro del Teatro dell’Opera di Roma' -> [('Orchestra', 'Orchestra del Teatro …'),
    ('Choir', 'Coro del Teatro …')]; a single group -> [(role, name)]; not a group -> []."""
    n = clean(name).strip(' ,;')
    if fold(n) in ('orchestra', 'coro', 'choir', 'ensemble', 'orchestra e coro', 'compagnia'):
        return []                                  # a heading, not a name ('ORCHESTRA' above its name)
    m = _GROUP_LIST_RE.match(n)
    if m:
        out = []
        tail = m.group(2)
        for part in re.split(r'\s*(?:,|\be\b)\s*', m.group(1)):
            p = part.strip()
            pf = fold(p)
            if pf.startswith('orchestra'):
                out.append(('Orchestra', f'{p} {tail}'))
            elif pf.startswith('coro') or pf.startswith('voci bianche'):
                out.append(('Choir', f'{p} {tail}'))
            elif pf.startswith('corpo di ballo'):
                out.append(('Ensemble', f'{p} {tail}'))
        return out
    role = group_role(n)
    return [(role, n)] if role else []


_PERSON_RE = re.compile(r"^(?:[A-ZÀ-ÖØ-Þ][\w’'.-]*|d[aei]|de|del|della|di|van|von|der|le|la|du|y|bin|al|zu)"
                        r"(?:\s+(?:[A-ZÀ-ÖØ-Þ][\w’'.-]*|d[aei]|de|del|della|di|van|von|der|den|le|la|du|y|bin|al|zu|"
                        r"[A-ZÀ-ÖØ-Þ]\.))*$")


def looks_like_person(text, max_words=5):
    """'Maki Namekawa', 'Lucas e Arthur Jussen' (False), 'Ton Koopman' -> plausibly one person's name."""
    t = clean(text).strip(' ,;')
    if not t or len(t) > 60 or not 2 <= len(t.split()) <= max_words:
        return False
    if t.isupper() and len(t) > 4:
        t = t.title()
    return bool(_PERSON_RE.match(t)) and not group_role(t)


# ---------------------------------------------------------------------------
# loosely formatted HTML -> lines of (kind, text) segments
# ---------------------------------------------------------------------------

_BLOCK_END_RE = re.compile(r'(?i)</(?:p|div|li|h[1-6]|tr|dd|dt|ul|ol|section|table)\s*>|<(?:p|div|li|h[1-6]|tr|ul|ol|hr|section|table)\b[^>]*>')


def _bold_br(m):
    """A line break inside a bold run: the next part starting in lower case continues the
    name ('Orchestra e Coro<br>dell’Accademia …'); one starting with a capital is a new line
    ('Coro del Teatro …<br>Les musiciens du Prince', 'COMPAGNIA …<br>IL BALLETTO DI PARMA')."""
    inner = m.group(1)
    pieces = re.split(r'(?i)\s*<br\s*/?>\s*', inner)
    if len(pieces) == 1:
        return m.group(0)
    lines = [pieces[0]]
    for p in pieces[1:]:
        t, prev = clean(p), clean(lines[-1])
        if t and prev and (t[0].isupper() or t[0].isdigit()):
            lines.append(p)                              # 'Coro del Teatro …<br>Les musiciens du Prince'
        else:
            lines[-1] = f'{lines[-1]} {p}'              # 'Orchestra e Coro<br>dell’Accademia …'
    return '<br>'.join(f'<strong>{p}</strong>' for p in lines)


def paragraphs(fragment):
    """HTML fragment -> list of paragraphs; a paragraph is a list of lines; a line is a list of
    (kind, text) with kind 'b' (bold), 'i' (italic) or 't' (plain)."""
    h = fragment or ''
    h = re.sub(r'(?is)<(script|style|iframe|figure|noscript)\b.*?</\1\s*>', ' ', h)
    h = re.sub(r'(?is)<img\b[^>]*>', ' ', h)
    h = re.sub(r'(?i)<(/?)b\b[^>]*>', r'<\1strong>', h)
    h = re.sub(r'(?i)<strong\b[^>]*>', '<strong>', h)
    h = re.sub(r'(?i)<(/?)i\b[^>]*>', r'<\1em>', h)
    h = re.sub(r'(?i)<em\b[^>]*>', '<em>', h)
    h = re.sub(r'(?i)<br\b[^>]*>', '<br>', h)
    for _ in range(2):
        h = re.sub(r'(?i)((?:\s*<br>)+)\s*</strong>', r'</strong>\1', h)       # 'Name<br></strong>' -> line end
        h = re.sub(r'(?i)<strong>((?:\s*<br>)+)', r'\1<strong>', h)
    h = re.sub(r'(?is)<strong>(.*?)</strong>', _bold_br, h)
    out = []
    for block in _BLOCK_END_RE.split(h):
        para = []
        for part in re.split(r'(?i)<br>', block):
            segs, bold, ital = [], 0, 0
            for tok in re.split(r'(?i)(</?strong>|</?em>|<[^>]*>)', part):
                if not tok:
                    continue
                low = tok.lower()
                if low == '<strong>':
                    bold += 1
                elif low == '</strong>':
                    bold = max(0, bold - 1)
                elif low == '<em>':
                    ital += 1
                elif low == '</em>':
                    ital = max(0, ital - 1)
                elif tok.startswith('<'):
                    continue
                else:
                    text = _html.unescape(tok).replace('\xa0', ' ').replace('​', '')
                    if not text:
                        continue
                    kind = 'b' if bold else 'i' if ital else 't'
                    if segs and segs[-1][0] == kind:
                        segs[-1] = (kind, segs[-1][1] + text)
                    elif segs and not text.strip():
                        segs[-1] = (segs[-1][0], segs[-1][1] + text)
                    else:
                        segs.append((kind, text))
            line = [(k, re.sub(r'\s+', ' ', t).strip()) for k, t in segs]
            line = [(k, t) for k, t in line if t]
            # a lone bold space or punctuation is not a segment
            line = [(k, t) for k, t in line if re.search(r'\w', t) or k == 't']
            if line:
                para.append(line)
        if para:
            out.append(para)
    return out


def tidy(text):
    """Undo the spaces put between joined segments: '( Canto di lode )' -> '(Canto di lode)'."""
    s = clean(text)
    s = re.sub(r'([(\[“«‘])\s+', r'\1', s)
    s = re.sub(r'\s+([)\]”»,.;:!?])', r'\1', s)
    return s


def line_text(line):
    return tidy(' '.join(t for _, t in line))


_DAYS_RE = re.compile(r'^[\s\d,;/e()\.:–-]*\d[\s\d,;/e()\.:–-]*$')


def days_of(text):
    """'17, 23, 26 /' -> {17, 23, 26}; '19 (20.30), 20' -> {19, 20}; '' -> None."""
    t = re.sub(r'\([^)]*\)', ' ', text or '')
    nums = {int(n) for n in re.findall(r'(?<![\d.])(\d{1,2})(?![\d.])', t) if 1 <= int(n) <= 31}
    return nums or None


def _strip_days(text):
    """'4, 6 giugno /' -> ' /': day numbers and month names removed."""
    t = re.sub(r'\([^)]*\)', ' ', text or '')
    t = re.sub(r'\b\d{1,2}\b', ' ', t)
    t = re.sub(r'(?i)\b(?:' + '|'.join(sorted((k for k in MONTHS if len(k) > 3), key=len, reverse=True)) + r')\b', ' ', t)
    return re.sub(r'\s+', ' ', t)


def credit_pairs(line):
    """A line like [t'soprano', b'Elsa Benoit', t'maestro del coro', b'Andrea Secchi'] ->
    [(role_text, name, days)]; names separated by '/' share the role; day lists after a
    name ('17, 23 /') say on which days of the month that singer sings."""
    out, role = [], None
    pending = None                          # (role, name) waiting for its days
    for kind, text in line:
        if kind == 'b':
            names = [n.strip(' ,;') for n in re.split(r'\s*/\s*', text) if n.strip(' ,;')]
            for n in names:
                if pending:
                    out.append(pending + (None,))
                pending = (role, n)
        else:
            stripped = text.strip()
            if pending and _DAYS_RE.match(stripped.strip('/ ').strip() or 'x'):
                out.append(pending + (days_of(stripped),))
                pending = None
                continue
            if pending:
                out.append(pending + (None,))
                pending = None
            r = stripped.strip(' /,;')
            if r.startswith(','):
                r = r[1:]
            role = r or role
    if pending:
        out.append(pending + (None,))
    return [(r, n, d) for r, n, d in out if n]


# ---------------------------------------------------------------------------
# credits and works from a cast/programme block
# ---------------------------------------------------------------------------

_CAST_HEAD_RE = re.compile(r'(?i)^(?:personaggi(?:\s+e)?\s+interpreti|interpreti|personaggi|cast|artisti ospiti|'
                           r'con|solisti|protagonisti)\s*:?$')
_SKIP_LINE_RE = re.compile(
    r'(?i)^(?:nuov[oa] (?:allestimento|produzione)|allestimento|produzione|coproduzione|in coproduzione|'
    r'in collaborazione|con il (?:sostegno|contributo|patrocinio)|con la partecipazione|sostenuto|realizzato|'
    r'con sovratitoli|sovratitoli|durata|prima esecuzione|ingresso|acquista|info|biglietti|in occasione|'
    r'manifesto|foto|immagine|il concerto [eè] sostenuto|in diretta|trasmess|ripres[oa]|registrat|'
    r'opera in forma di concerto|in forma di concerto|concerto straordinario|prima rappresentazione|'
    r'dedicat|inediti|un progetto|progetto|edizione critica|versione|musiche di repertorio|programma)')
_MUSIC_BY_RE = re.compile(r'(?i)^(?:musica|musiche)(?:\s+di)?$')
_PROSE_STOP_RE = re.compile(r'(?i)^(?:video|guida all.ascolto|ascolta|scopri|leggi|per informazioni|note di sala|'
                            r'incontro con il pubblico|in caso il video)')


def _is_prose(para):
    """A paragraph of running text (a description): long plain text, not a credit list."""
    plain = ' '.join(t for line in para for k, t in line if k != 'b')
    if len(plain) > 220 and len(para) <= 3:
        return True
    return any(len(t) > 160 and k == 't' for line in para for k, t in line)


def _title_case(text):
    """'ORCHESTRA GIOVANILE “LUIGI CHERUBINI”' -> 'Orchestra Giovanile “Luigi Cherubini”' (all-caps only)."""
    t = clean(text)
    if not (t.isupper() and len(t) > 3):
        return t
    small = {'di', 'del', 'della', 'dello', 'dell', 'dei', 'degli', 'e', 'da', 'de', 'la', 'il', 'lo', 'le', 'in', 'a'}
    words = []
    for i, w in enumerate(t.lower().split()):
        core = re.sub(r'^[^\w]+', '', w)
        if i and core in small:
            words.append(w)
            continue
        if not (i and re.match(r"(?:dell|dall|nell|sull|all|l|d|un)['’]", core)):
            w = re.sub(r'^([^\w]*)(\w)', lambda m: m.group(1) + m.group(2).upper(), w)
        w = re.sub(r"(['’])(\w)", lambda m: m.group(1) + m.group(2).upper(), w)     # dell'Opera
        words.append(w)
    return ' '.join(words)


def parse_block(paras, title='', *, characters=True, stop_at_prose=True):
    """Read credits and works from ``paragraphs(...)`` output.

    -> {'credits': [(role, name, days)], 'program': [(composer, work)], 'groups_upper': bool}
    Lines handled: 'role <b>Name</b>' (several per line, '/' alternates with day lists),
    '<b>Composer</b> Work', '<b>Composer</b>' followed by plain work lines, bold group names
    ('Orchestra e Coro del …'), 'Musica di <b>Composer</b>', 'PERSONAGGI E INTERPRETI'
    (characters follow). Prose paragraphs end the block once something was read."""
    credits, program = [], []
    header = None                 # a composer printed alone above its works
    section = None                # an all-caps work title above its credits (ballet evenings)
    in_cast = False
    title_key = re.sub(r'[^a-z0-9]+', '', fold(title))
    done = False
    for para in paras:
        if done:
            break
        if (len(para) == 1 and _is_prose(para)) or (para and _PROSE_STOP_RE.match(line_text(para[0]))):
            if stop_at_prose and (credits or program):
                break
            continue
        header = None
        for idx, line in enumerate(para):
            text = line_text(line)
            if not text:
                continue
            if any(k == 't' and len(t) > 160 for k, t in line) or _PROSE_STOP_RE.match(text):
                if stop_at_prose and (credits or program):
                    done = True
                    break
                continue
            if _CAST_HEAD_RE.match(text):
                in_cast = True
                header = None
                continue
            if _SKIP_LINE_RE.match(text) and not any(k == 'b' for k, _ in line[1:2]):
                header = None
                if re.search(r'(?i)produzione|collaborazione|sostegno|contributo|patrocinio', text):
                    break                          # 'in coproduzione con' + one bold partner per line
                continue
            kinds = [k for k, _ in line]
            first_kind, first_text = line[0]
            if first_kind == 'b':
                rest = line[1:]
                rest_text = tidy(' '.join(t for _, t in rest))
                if not rest:
                    name = first_text.strip(' ,;')
                    if re.match(r"(?i)^(?:del|della|dello|dei|degli|dell['’])\b", name) and credits \
                            and credits[-1][0] in ('Orchestra', 'Choir', 'Ensemble'):
                        r0, n0, d0 = credits.pop()                  # 'JuniOrchestra' / 'dell’Accademia …'
                        credits.extend((r, n, d0) for r, n in (split_groups(f'{n0} {name}') or [(r0, f'{n0} {name}')]))
                        continue
                    key = re.sub(r'[^a-z0-9]+', '', fold(name))
                    if key and key == title_key:
                        continue
                    groups = split_groups(_title_case(name))
                    if groups:
                        credits.extend((r, n, None) for r, n in groups)
                        header = None
                        continue
                    if name.isupper() and len(name) > 3:
                        section = _title_case(name)     # 'AFTERNOON OF A FAUN' above its credits
                        header = None
                        continue
                    nxt = para[idx + 1] if idx + 1 < len(para) else None
                    if nxt and nxt[0][0] in 'ti' and not any(k == 'b' for k, _ in nxt) and not re.search(r'\d{4}', name) \
                            and role_en(line_text(nxt), characters=False) is None and not _SKIP_LINE_RE.match(line_text(nxt)):
                        header = name                   # '<b>Hisaishi</b>' then one work per line
                        continue
                    if looks_like_person(name):
                        credits.append(('Performer', _title_case(name), None))
                    continue
                if rest_text.startswith(','):            # '<b>Thomas Guggeis</b>, direttore'
                    role = role_en(rest_text[1:], characters=False)
                    if role:
                        credits.append((role, first_text.strip(' ,'), None))
                    continue
                if len(rest) == 1 and _norm_role(rest_text) in ROLE_WORDS and looks_like_person(first_text):
                    credits.append((ROLE_WORDS[_norm_role(rest_text)], first_text.strip(' ,'), None))   # '<b>Name</b> violino'
                    continue
                plain = [t for k, t in rest if k != 'b']
                if len(kinds) > 2 and all(re.fullmatch(r'(?:e|and|,|/|&)?', _strip_days(t).strip(' ,/')) for t in plain) \
                        and all(looks_like_person(t) for k, t in line if k == 'b'):
                    # '<b>Marianela Nuñez</b> e <b>Patricio Revé</b> 4, 6 giugno /'
                    names, days = [], None
                    for k, t in line:
                        if k == 'b':
                            names.append(t.strip(' ,'))
                        elif days_of(t):
                            credits.extend(('Performer', n, days_of(t)) for n in names)
                            names = []
                    credits.extend(('Performer', n, None) for n in names)
                    continue
                if _DAYS_RE.match(rest_text):            # '<b>Paul Marque</b> 17, 19 (20.30), 20'
                    credits.append(('Performer', first_text.strip(' ,'), days_of(rest_text)))
                    continue
                if 'b' in kinds[1:] and rest and rest[0][0] == 't' and role_en(rest[0][1], characters=False):
                    # '<b>Name</b> soprano <b>Name2</b>' is unusual; read the pairs after the first name
                    credits.extend((role_en(r, characters=characters), n, d) for r, n, d in credit_pairs(rest)
                                   if role_en(r, characters=characters))
                    continue
                composer = first_text.strip(' ,:')
                work = clean(rest_text).strip(' ,:')
                if composer and work and not _SKIP_LINE_RE.match(composer) and len(composer) <= 60 \
                        and not re.search(r'\d{4}', composer):
                    program.append((composer, work))
                header = None
                continue
            if 'b' in kinds:
                for role_text, name, days in credit_pairs(line):
                    if _MUSIC_BY_RE.match(clean(role_text or '')):
                        for composer in re.split(r'\s*(?:,|\be\b)\s*', name):
                            if composer.strip():
                                program.append((composer.strip(), section or ''))
                        continue
                    role = role_en(role_text or '', characters=characters and (in_cast or bool(role_text)),
                                   loose=in_cast)
                    if role is None:
                        continue
                    if role in ('Orchestra', 'Choir', 'Ensemble'):
                        groups = split_groups(name)
                        credits.extend((r, n, days) for r, n in (groups or [(role, name)]))
                    else:
                        names = [x.strip() for x in re.split(r'\s*,\s*', name)]
                        if len(names) > 1 and all(looks_like_person(x) for x in names):
                            credits.extend((role, _title_case(x), days) for x in names)
                        else:
                            credits.append((role, _title_case(name), days))
                header = None
                continue
            # plain / italic line
            if header and (first_kind == 't' or len(line) > 1):
                program.append((header, text))
                continue
    return {'credits': credits, 'program': program}


def credits_for_day(credits, day):
    """[(role, name, days)] -> [(role, name)] for one performance on day-of-month ``day``:
    a singer listed with days sings on those days, one listed without days on the others."""
    by_role = {}
    for role, name, days in credits:
        by_role.setdefault(role, []).append((name, days))
    out = []
    for role, people in by_role.items():
        chosen = [n for n, d in people if d and day in d]
        if not chosen:
            dated = [n for n, d in people if d]
            undated = [n for n, d in people if not d]
            chosen = undated if (undated or day is None) else []
            if day is None and dated and not undated:
                chosen = [n for n, _ in people]
        if not chosen and len(people) == 1:
            chosen = [people[0][0]]
        out.extend((role, n) for n in chosen)
    return out


def all_credits(credits):
    return [(r, n) for r, n, _ in credits]


_SACRED_RE = re.compile(r'(?i)oratori|requiem|\bmessa\b|\bmass\b|\bmissa\b|\bmesse\b|cantata|kantate|passione|passion\b|'
                        r'stabat mater|magnificat|te deum|vespri|gloria\b|salmo|psalm|elias|messiah|creazione|sch[öo]pfung')


def concert_type(title, credits, program):
    """Klang's type for a concert: a choir with a sacred or choral work -> 'vocal-opera', else
    common.infer_type (title words, then the groups and players credited)."""
    roles = {r for r, _ in credits}
    works = ' '.join(f'{c} {w}' for c, w in program)
    if 'Choir' in roles and _SACRED_RE.search(f'{title} {works}'):
        return 'vocal-opera'
    return infer_type(title, credits, program)


def strip_life_dates(name):
    """'Vincenzo Bellini (1801-1835)' -> 'Vincenzo Bellini'."""
    return re.sub(r'\s*\(\s*\d{4}\s*(?:[-–]\s*\d{0,4})?\s*\)\s*$', '', clean(name))
