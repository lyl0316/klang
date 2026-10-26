"""Shared helpers for the Romandie / Ticino / Saanenland readers (Fribourg, Düdingen,
Neuchâtel, La Chaux-de-Fonds, Lutry, Gstaad/Saanen, Ascona ...).

Not a reader itself: the registry skips modules whose name starts with '_'.
Everything here deals with *facts* only (dates, venues, performers and their roles,
works); no description text is ever returned.

Note for build.py --fresh-hours: a reader's codeHash covers only its own file and
common.py, so an edit here does not by itself invalidate yesterday's reused events.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import datetime

from common import clean, guess_type, to_zurich_iso

# ---------------------------------------------------------------------------
# text and dates
# ---------------------------------------------------------------------------


def fold(text):
    """'Chœur Opéra' -> 'choeur opera' (lower-case, no accents) for matching only."""
    s = unicodedata.normalize('NFKD', str(text or '')).replace('œ', 'oe').replace('Œ', 'oe').replace('æ', 'ae')
    s = s.replace('ß', 'ss')
    s = ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()
    return s.replace('’', "'").replace('‘', "'")


MONTHS = {
    # French
    'janvier': 1, 'janv': 1, 'jan': 1, 'fevrier': 2, 'fevr': 2, 'fev': 2, 'mars': 3, 'avril': 4, 'avr': 4,
    'mai': 5, 'juin': 6, 'juillet': 7, 'juil': 7, 'aout': 8, 'septembre': 9, 'sept': 9, 'sep': 9,
    'octobre': 10, 'oct': 10, 'novembre': 11, 'nov': 11, 'decembre': 12, 'dec': 12,
    # German
    'januar': 1, 'jan.': 1, 'februar': 2, 'feb': 2, 'marz': 3, 'maerz': 3, 'april': 4, 'apr': 4,
    'juni': 6, 'juli': 7, 'august': 8, 'aug': 8, 'oktober': 10, 'dezember': 12, 'dez': 12,
    # Italian
    'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4, 'maggio': 5, 'giugno': 6, 'luglio': 7,
    'agosto': 8, 'settembre': 9, 'ottobre': 10, 'dicembre': 12,
    # English
    'january': 1, 'february': 2, 'march': 3, 'may': 5, 'june': 6, 'july': 7, 'october': 10,
    'december': 12, 'november': 11, 'september': 9,
}


def month_number(word):
    """'novembre' / 'Nov.' / 'März' / 'giugno' -> 11 / 11 / 3 / 6, or None."""
    w = fold(word).strip('. ')
    return MONTHS.get(w) or MONTHS.get(w + '.')


_MONTH_ALT = '|'.join(sorted({re.escape(k.rstrip('.')) for k in MONTHS}, key=len, reverse=True))
# "8 novembre 2026", "1er février 2027", "28. Oktober 2026", "3 dicembre 2026"
DATE_RE = re.compile(r'\b(\d{1,2})(?:er|ère|°)?\.?\s+(' + _MONTH_ALT + r')\.?\s+(\d{4})\b', re.I)
# "19h30", "17h", "19:30", "19.30 Uhr", "20h."
TIME_RE = re.compile(r'\b([01]?\d|2[0-3])\s*(?:h|:|\.(?=\d{2}\s*(?:uhr|h\b)))\s*([0-5]\d)?(?!\d)', re.I)


def find_date(text):
    """First 'day month year' in ``text`` -> (y, m, d) or None. Works on folded or plain text."""
    m = DATE_RE.search(fold(text))
    if not m:
        return None
    mo = month_number(m.group(2))
    if not mo:
        return None
    try:
        datetime(int(m.group(3)), mo, int(m.group(1)))
    except ValueError:
        return None
    return int(m.group(3)), mo, int(m.group(1))


def find_time(text):
    """First clock time in ``text`` -> (hh, mm) or None ('19h30', '17h', '19:30', '19.30 Uhr')."""
    m = TIME_RE.search(fold(text))
    if not m:
        return None
    return int(m.group(1)), int(m.group(2) or 0)


def local_iso(y, mo, d, hh, mi):
    """Swiss local wall-clock time -> ISO with the right offset."""
    return to_zurich_iso(datetime(int(y), int(mo), int(d), int(hh), int(mi)))


# ---------------------------------------------------------------------------
# names and roles
# ---------------------------------------------------------------------------

_PARTICLES = {'de', 'du', 'des', 'la', 'le', 'les', 'von', 'van', 'der', 'den', 'da', 'di', 'del', 'della', 'et',
              "d'", 'zu', 'y', 'e', 'and', 'of', 'the', 'pour', 'en', 'au', 'aux', 'à', 'a', 'für', 'und'}
_KEEP_UPPER = {'ESN', 'OSR', 'OCL', 'OCG', 'OCF', 'HEM', 'HEMU', 'NEC', 'SMCF', 'TOBS', 'BBC', 'OSI', 'RTS', 'II', 'III',
               'IV', 'VI', 'VII', 'VIII', 'IX', 'XII', 'NDR', 'SWR', 'WDR', 'MDR', 'BR', 'ORF', 'USA', 'UK', 'CH', 'KZO'}


def smart_case(text):
    """'ORCHESTRE PHILHARMONIQUE DE STRASBOURG' -> 'Orchestre Philharmonique de Strasbourg'.
    Text that is not all upper-case is returned unchanged."""
    t = clean(text)
    letters = [c for c in t if c.isalpha()]
    if not letters or any(c.islower() for c in letters):
        return t
    words = []
    for i, w in enumerate(t.split(' ')):
        core = w.strip('(),.;:«»"')
        if core in _KEEP_UPPER:
            words.append(w)
            continue
        low = w.lower()
        if i > 0 and low in _PARTICLES:
            words.append(low)
            continue
        # capitalise after hyphens and apostrophes: JEAN-LUC -> Jean-Luc, D'INDY -> d'Indy
        parts = re.split(r"([-'’])", low)
        out = ''.join(p[:1].upper() + p[1:] if p not in "-'’" else p for p in parts)
        if i > 0 and re.match(r"^d['’]", low):
            out = 'd' + out[1:]
        words.append(out)
    return ' '.join(words)


ROLE_RULES = tuple((re.compile(p), r) for p, r in (
    (r'chef de choeur|chef des choeurs|chorleitung|einstudierung|maestro del coro|chorus ?master|preparat\w* (?:du|des) choeurs?', 'Chorus master'),
    (r'mise en scene|mise en espace|metteu[rs]e? en scene|regie|inszenierung|regia|stage director|stage direction', 'Director'),
    (r'decor|costume|kostum|lumiere|\blicht|\bluci\b|buhne|scenograf|scenograph|dramaturg|video|\bson\b|\bton\b|assistant|'
     r'production|preparation|partenaire|partner|organisation|veranstalter|\btextes?\b|livret|libretto',
     None),
    (r'choregraph|choreograf|choreograph|coreograf', 'Choreographer'),
    (r'direction musicale|musikalische leitung|direzione musicale|^direction$|^dir\.?$|direction et |et direction|'
     r'^direction |leitung|dirigent|direttore|direttrice|direzione|conductor|chef d.orchestre|cheffe d.orchestre|^chef$', 'Conductor'),
    (r'konzertmeister|violon solo', 'Violin'),
    (r'mezzo', 'Mezzo-soprano'),
    (r'soprano|sopran', 'Soprano'),
    (r'contre-?tenor|countertenor|controtenore|haute-contre', 'Countertenor'),
    (r'bass-?bariton|baryton-?basse|basse-?baryton|bass-?baritone|basso-?baritono', 'Bass-baritone'),
    (r'baryton|bariton', 'Baritone'),
    (r'tenor|tenore|evangelist', 'Tenor'),
    (r'viole de gambe|viola da gamba|gambe\b|gamba\b', 'Viola da gamba'),
    (r'contrebasse|kontrabass|contrabbasso|double bass', 'Double bass'),
    (r'violoncelle|violoncello|cello', 'Cello'),
    (r'\balto\b(?!.*(?:voix|chant))|viola\b|bratsche', 'Viola'),
    (r'violon|violin|geige|violino', 'Violin'),
    (r'pianoforte|hammerklavier|fortepiano', 'Fortepiano'),
    (r'piano|klavier|pianoforte|flugel', 'Piano'),
    (r'clavecin|cembalo|harpsichord|clavicembalo', 'Harpsichord'),
    (r'orgue|orgel|organo|organ\b', 'Organ'),
    (r'\bharpe\b|\bharfe\b|\barpa\b|\bharp\b', 'Harp'),
    (r'theorbe|theorbo|tiorba|\b(?:archi)?luth\b|\blaute\b|liuto|\b(?:arch)?lute\b', 'Lute'),       # not the 'lute' in 'flute'
    (r'guitare|gitarre|chitarra|guitar', 'Guitar'),
    (r'accordeon|akkordeon|fisarmonica|accordion|bandoneon', 'Accordion'),
    (r'flutes? a bec|blockflote|flauto dolce|recorder', 'Recorder'),
    (r'flute|flote|flauto', 'Flute'),
    (r'hautbois|oboe', 'Oboe'),
    (r'cor anglais|englischhorn|corno inglese', 'Cor anglais'),
    (r'clarinette|klarinette|clarinetto|clarinet', 'Clarinet'),
    (r'basson|fagott|fagotto|bassoon', 'Bassoon'),
    (r'saxophone|saxophon|saxofono', 'Saxophone'),
    (r'trompette|trompete|tromba|trumpet', 'Trumpet'),
    (r'trombone|posaune', 'Trombone'),
    (r'\btuba\b', 'Tuba'),
    (r'\bcor\b|\bhorn\b|corno', 'Horn'),
    (r'timbales|pauke|timpani', 'Timpani'),
    (r'percussion|schlagzeug|perkussion|percussioni|marimba|vibraphone|\bbatterie\b|\bdrums?\b', 'Percussion'),
    (r'cymbalum|cimbalom', 'Cimbalom'),
    (r'mandolin', 'Mandolin'),
    (r'\balto\b|\balt\b|contralto|altiste', 'Alto'),
    (r'\bbasse\b|\bbass\b|\bbasso\b', 'Bass'),
    (r'recitant|narrat|erzahl|sprecher|voce recitante|recitante|lecture|lesung', 'Narrator'),
    (r'voix|chant\b|gesang|stimme|voce|vocals?\b|voice|^canto$', 'Voice'),
    (r'comedien|schauspiel|attore|attrice|actor|actress|jeu\b', 'Actor'),
    (r'danse|tanz|danza|dancer', 'Dancer'),
    (r'moderation|presentat|moderator|host\b', 'Host'),
    (r'choeur|chor\b|coro|choir', 'Choir'),
    (r'orchestre|orchester|orchestra', 'Orchestra'),
    (r'ensemble|quatuor|quartett|quartetto|quartet|trio\b|quintette|quintett|quintet', 'Ensemble'),
    (r'composit|komponist|compositore|composer', 'Composer'),
    (r'dessinat|illustrat', None),
))

_GROUP_PATTERNS = (
    ('Choir', re.compile(r'choeur|chorus|\bchor\b|chor\b|kantorei|\bcoro\b|choir|vokalensemble|vocal ensemble|'
                         r'ensemble vocal|singers|sangerknaben|maitrise|voces|vocal\b|cantabile|madrigal')),
    ('Orchestra', re.compile(r'orchest|sinfoniet|symphoni|philharmon|sinfonie|camerata|kammerphilharmonie|'
                             r'les siecles|musique des lumieres|capella|cappella|chamber players|baroque orchestra|'
                             r'freitagsakademie|il giardino|concerto koln|academy of|sinfonica|filarmonica|cameristi|barockorchester|'
                             r'les musiciens d|barocchisti|landwehr')),
    ('Ensemble', re.compile(r'ensemble|quatuor|quartett|quartetto|quartet|\btrio\b|quintette|quintett|quintet|'
                            r'sextuor|sextet|septuor|octuor|oktett|consort|\bduo\b|collegium|brass|cuivres|'
                            r'solistes|solisten|players|band\b|la cetra|fontana')),
)


def group_role(name):
    """'Orchestra' / 'Choir' / 'Ensemble' when the name is obviously a group, else None."""
    f = fold(name)
    hits = [role for role, rx in _GROUP_PATTERNS if rx.search(f)]
    if not hits:
        return None
    if 'Choir' in hits and 'Orchestra' in hits:
        # "Orchestre et Choeur de ..." is the orchestra; "Choeur symphonique", "Choeur de l'orchestre" a choir
        i_orch = f.find('orchest')
        m = _GROUP_PATTERNS[0][1].search(f)
        if i_orch < 0 or (m and m.start() < i_orch):
            return 'Choir'
        return 'Orchestra'
    return hits[0]


def _single_role(f):
    for rx, role in ROLE_RULES:
        if rx.search(f):
            return role, True
    return None, False


def role_for(label, name=''):
    """Klang role for a French/German/Italian/English role label, or None for crew we do
    not list (designers, dramaturgs, illustrators). 'direction et violon' / 'direction au
    piano' -> 'Violin & direction' / 'Piano & direction'."""
    f = fold(clean(label)).strip(' ,;:-–·')
    if f and re.search(r'direction|leitung|direzione', f) and not re.search(r'musicale|musikalische|mise en scene|chor|choeur|coro', f):
        rest = re.sub(r'\b(direction|leitung|direzione)\b|\b(et|und|e|au|am|al|du|vom|dal)\b|[,&/+]', ' ', f).strip()
        if rest:
            inst, found = _single_role(rest)
            if found and inst and inst not in ('Conductor', 'Orchestra', 'Ensemble', 'Choir', 'Director',
                                               'Choreographer', 'Composer', 'Host'):
                return inst + ' & direction'
    if f:
        for rx, role in ROLE_RULES:
            if rx.search(f):
                if role in ('Orchestra', 'Ensemble', 'Choir') and name:
                    return group_role(name) or role
                return role
    if name:
        g = group_role(name)
        if g:
            return g
    if f and len(f) <= 30 and not re.search(r'\d', f):
        lab = clean(label).strip(' ,;:-–·')
        return lab[:1].upper() + lab[1:]
    return 'Performer'


VOICES = {'Soprano', 'Mezzo-soprano', 'Alto', 'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass', 'Voice'}
NON_PLAYING = {'Conductor', 'Chorus master', 'Director', 'Choreographer', 'Composer', 'Host', 'Narrator', 'Actor',
               'Dancer'}


def infer_type(title, credits, hint=None, program=None):
    """orchestral / chamber / recital / vocal-opera from the title, line-up and works (None if unsure)."""
    t = guess_type(title)
    works = ' '.join(f'{c} {w}' for c, w in (program or []))
    roles = [r for r, _ in credits]
    if t == 'vocal-opera':
        # a title word like "Passion" misleads when line-up and works are purely instrumental
        if credits and program and not ('Choir' in roles or set(roles) & VOICES) and guess_type(works) != 'vocal-opera':
            t = None
        else:
            return t
    if (set(roles) & VOICES or 'Choir' in roles or not credits) and guess_type(works) == 'vocal-opera' and re.search(r'(?i)requiem|messe|mass\b|missa|oratori|passion|cantat|kantate|'
                                                        r'magnificat|stabat|op[ée]ra|oper\b|te deum|vespr', works):
        return 'vocal-opera'
    if 'Choir' in roles and not ('Orchestra' in roles and re.search(r'(?i)symphon|sinfoni', works + ' ' + str(title))):
        return 'vocal-opera'
    if 'Director' in roles and guess_type(works) == 'vocal-opera':
        return 'vocal-opera'                  # a staged work: "Orphée aux Enfers, opéra-bouffe" + metteur en scène
    if 'Orchestra' in roles or 'Conductor' in roles:
        return 'orchestral'
    players = [r for r in roles if r not in NON_PLAYING]
    if len(players) == 1 and players[0] not in ('Ensemble', 'Performer'):
        return 'recital'
    if len(players) == 2 and (set(players) & VOICES) and ({'Piano', 'Fortepiano', 'Guitar', 'Harpsichord', 'Lute'} & set(players)):
        return 'recital'
    if 'Ensemble' in roles or 2 <= len(players) <= 9:
        return t if t in ('chamber', 'recital') else 'chamber'
    return t or hint


KIDS_RE = re.compile(r'jeune public|\bfamilles?\b|pour enfants|\benfants\b|\bdes \d+ ans|\bab \d+ jahren|\bkinder\b|'
                     r'kinderkonzert|familienkonzert|\bfamilien|krabbel|\bbambini\b|per famiglie|scolaire|'
                     r'\becoles?\b|\bschul|workshop|\batelier|masterclass|master class|meisterkurs|visite guidee|'
                     r'\bfuhrung|\bconference|einfuhrung|bord de scene|table ronde|\bcinema\b|\bgala\b|\bball\b|'
                     r'repetition publique|repetition ouverte|offentliche probe|generalprobe|exposition|vernissage')


def is_not_a_concert(text):
    """True for children's/family/school formats, workshops, talks, galas, cinema ..."""
    return bool(KIDS_RE.search(fold(text)))


def known_role(label, name=''):
    """Like role_for, but only for labels that really are role words: returns the role,
    '' for crew we do not list, or None when ``label`` is not a known role at all
    (a composer's name, a heading ...)."""
    f = fold(clean(label)).strip(' ,;:-–·')
    if not f or len(f) > 60:
        return None
    for rx, role in ROLE_RULES:
        if rx.search(f):
            return role_for(label, name) or ''
    if re.fullmatch(r'solistes?|solisten?|solistin(?:nen)?|solisti|soloists?|interpretes?|interpretation|besetzung|mit|avec|con|with', f):
        return 'Performer'
    return None


def split_names(text):
    """'A, B et C' / 'A und B' / 'A / B' -> ['A', 'B', 'C']."""
    parts = re.split(r'\s*(?:,|/|;|\bet\b|\bund\b|\be\b|&)\s*', clean(text))
    return [p.strip(' .') for p in parts if p and len(p.strip(' .')) > 1]


def caps_words(text):
    """'Claire BOOTH' -> 'Claire Booth'; 'ADAM LALOUM piano' -> 'Adam Laloum piano'.
    Words printed in capitals are re-cased, the rest is kept."""
    t = clean(text)
    out = []
    run = []

    def flush():
        if run:
            out.append(smart_case(' '.join(run)))
            run.clear()

    for w in t.split(' '):
        letters = [c for c in w if c.isalpha()]
        if len(letters) > 1 and all(c.isupper() for c in letters) and w.strip('(),.;:«»"') not in _KEEP_UPPER:
            run.append(w)
        elif len(letters) == 1 and run and letters[0].isupper():   # "JEAN-S. BACH", "J. S."
            run.append(w)
        else:
            flush()
            out.append(w)
    flush()
    return ' '.join(out)


# ---------------------------------------------------------------------------
# Nuxt 3 pages: the state is serialised in <script id="__NUXT_DATA__"> (devalue format)
# ---------------------------------------------------------------------------

def nuxt_payload(html):
    """The decoded ``__NUXT_DATA__`` object of a Nuxt 3 page, or None."""
    import json
    m = re.search(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', html or '', re.S)
    if not m:
        return None
    try:
        data = json.loads(m.group(1))
    except ValueError:
        return None
    wrappers = {'ShallowReactive', 'Reactive', 'Ref', 'ShallowRef', 'EmptyRef', 'EmptyShallowRef', 'NuxtError'}
    memo = {}

    def res(i, depth=0):
        if not isinstance(i, int) or i < 0 or i >= len(data) or depth > 60:
            return None
        if i in memo:
            return memo[i]
        v = data[i]
        if isinstance(v, dict):
            out = memo[i] = {}
            for k, x in v.items():
                out[k] = res(x, depth + 1)
            return out
        if isinstance(v, list):
            if v and isinstance(v[0], str) and v[0] in wrappers:
                return res(v[1], depth + 1) if len(v) > 1 else None
            if v and isinstance(v[0], str) and v[0] in ('Date', 'RegExp', 'BigInt'):
                return v[1] if len(v) > 1 else None
            if v and isinstance(v[0], str) and v[0] in ('Set', 'Map'):
                return [res(x, depth + 1) for x in v[1:]]
            out = memo[i] = []
            out.extend(res(x, depth + 1) for x in v)
            return out
        return v

    return res(0)
