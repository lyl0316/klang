"""Shared helpers for the Geneva readers (Victoria Hall, Grand Théâtre, OSR, OCG).

Not a reader itself: the registry skips modules whose name starts with '_'.
Everything here is about *facts* only (dates, venues, performers and their roles,
works); no description text is ever returned.

Note for build.py --fresh-hours: a reader's codeHash covers only its own file and
common.py, so an edit here does not by itself invalidate yesterday's reused events.
"""
from __future__ import annotations

import re
import unicodedata

from common import as_list, clean, get_json, guess_type, requests_left

# ---------------------------------------------------------------------------
# text helpers
# ---------------------------------------------------------------------------


def fold(text):
    """'Chœur Opéra' -> 'choeur opera' (lower-case, no accents) for matching only."""
    s = unicodedata.normalize('NFKD', str(text or '')).replace('œ', 'oe').replace('Œ', 'oe').replace('æ', 'ae')
    s = ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()
    return s.replace('’', "'").replace('‘', "'")


FR_MONTHS = {
    'janvier': 1, 'janv': 1, 'jan': 1, 'fevrier': 2, 'fevr': 2, 'fev': 2, 'mars': 3, 'mar': 3,
    'avril': 4, 'avr': 4, 'mai': 5, 'juin': 6, 'juillet': 7, 'juil': 7, 'aout': 8, 'septembre': 9,
    'sept': 9, 'sep': 9, 'octobre': 10, 'oct': 10, 'novembre': 11, 'nov': 11, 'decembre': 12, 'dec': 12,
}


def fr_month(word):
    return FR_MONTHS.get(fold(word).strip('. '))


_DURATION_RE = re.compile(r'dur[ée]e[^0-9]{0,40}?(?:(\d{2,3})\s*min|(\d{1,2})\s*h(?:eures?)?\s*(\d{1,2})?)', re.I)


def duration_minutes(text):
    """'Durée totale approximative de 2h10' -> 130, 'Durée 3h30' -> 210, 'Durée 1h' -> 60."""
    m = _DURATION_RE.search(text or '')
    if not m:
        return None
    if m.group(1):
        return int(m.group(1))
    return int(m.group(2)) * 60 + int(m.group(3) or 0)


# ---------------------------------------------------------------------------
# cities: Klang shows the city, and tours abroad must be dropped
# ---------------------------------------------------------------------------

# French exonyms -> the local name Klang uses
CITY_NAMES = {
    'geneve': 'Genève', 'geneva': 'Genève', 'genf': 'Genève', 'bale': 'Basel', 'basel': 'Basel',
    'berne': 'Bern', 'bern': 'Bern', 'lucerne': 'Luzern', 'luzern': 'Luzern', 'zurich': 'Zürich',
    'lausanne': 'Lausanne', 'rolle': 'Rolle', 'la chaux-de-fonds': 'La Chaux-de-Fonds', 'sion': 'Sion',
    'neuchatel': 'Neuchâtel', 'fribourg': 'Fribourg', 'montreux': 'Montreux', 'vevey': 'Vevey',
    'martigny': 'Martigny', 'verbier': 'Verbier', 'gstaad': 'Gstaad', 'saanen': 'Saanen', 'lugano': 'Lugano',
    'winterthur': 'Winterthur', 'st-gall': 'St. Gallen', 'saint-gall': 'St. Gallen', 'yverdon-les-bains': 'Yverdon-les-Bains',
    'nyon': 'Nyon', 'morges': 'Morges', 'bulle': 'Bulle', 'delemont': 'Delémont', 'bienne': 'Biel/Bienne',
    'biel': 'Biel/Bienne', 'monthey': 'Monthey', 'sierre': 'Sierre', 'vernier': 'Vernier',
    # communes of the Geneva agglomeration that Klang has no city for: listed under Genève
    'carouge': 'Genève', 'lancy': 'Genève', 'petit-lancy': 'Genève', 'grand-lancy': 'Genève',
    'le grand-saconnex': 'Genève', 'grand-saconnex': 'Genève', 'chene-bougeries': 'Genève', 'chene-bourg': 'Genève',
    'meyrin': 'Genève', 'onex': 'Genève', 'thonex': 'Genève', 'plan-les-ouates': 'Genève', 'chatelaine': 'Genève',
    'cologny': 'Genève', 'veyrier': 'Genève', 'bernex': 'Genève', 'satigny': 'Genève', 'versoix': 'Genève',
    'les acacias': 'Genève', 'petit-saconnex': 'Genève', 'confignon': 'Genève', 'collonge-bellerive': 'Genève',
    'coppet': 'Coppet', 'gland': 'Gland', 'payerne': 'Payerne', 'romont': 'Romont', 'porrentruy': 'Porrentruy',
    'le locle': 'Le Locle', 'aigle': 'Aigle', 'champery': 'Champéry', 'crans-montana': 'Crans-Montana',
    'zermatt': 'Zermatt', 'locarno': 'Locarno', 'ascona': 'Ascona', 'chur': 'Chur', 'zug': 'Zug',
    'aarau': 'Aarau', 'baden': 'Baden', 'solothurn': 'Solothurn', 'soleure': 'Solothurn', 'thun': 'Thun',
    'thoune': 'Thun', 'schaffhouse': 'Schaffhausen', 'schaffhausen': 'Schaffhausen', 'andermatt': 'Andermatt',
    'interlaken': 'Interlaken', 'davos': 'Davos', 'st. moritz': 'St. Moritz', 'saint-moritz': 'St. Moritz',
    'pully': 'Pully',
    'renens': 'Renens', 'ecublens': 'Ecublens', 'epalinges': 'Epalinges', 'mies': 'Mies', 'nendaz': 'Nendaz',
}


def swiss_city(name):
    """Normalised Swiss city name, or None when the place is unknown / abroad."""
    f = fold(name).strip(' .,')
    f = re.sub(r'\s+', ' ', f)
    if f in CITY_NAMES:
        return CITY_NAMES[f]
    f2 = re.sub(r'^\d{4}\s+', '', f)          # '1204 geneve'
    return CITY_NAMES.get(f2)


# ---------------------------------------------------------------------------
# roles (French programme credits -> Klang's English role names)
# ---------------------------------------------------------------------------

_ROLE_MAP = {
    # conducting
    'direction': 'Conductor', 'direction musicale': 'Conductor', 'dir': 'Conductor', 'chef': 'Conductor',
    'cheffe': 'Conductor', "chef d'orchestre": 'Conductor', "cheffe d'orchestre": 'Conductor',
    'chef principal': 'Conductor', 'cheffe principale': 'Conductor', 'chef invite': 'Conductor',
    'cheffe invitee': 'Conductor', 'conseiller artistique': None, 'conseillere artistique': None,
    'direction artistique': 'Conductor', 'chef assistant': 'Conductor', 'cheffe assistante': 'Conductor',
    'conductor': 'Conductor',
    'chef de choeur': 'Chorus master', 'cheffe de choeur': 'Chorus master', 'direction du choeur': 'Chorus master',
    'direction des choeurs': 'Chorus master', 'chef des choeurs': 'Chorus master', 'cheffe des choeurs': 'Chorus master',
    # keyboards
    'piano': 'Piano', 'piano solo': 'Piano', 'pianiste': 'Piano', 'pianoforte': 'Fortepiano', 'pianoforte ': 'Fortepiano',
    'fortepiano': 'Fortepiano', 'clavecin': 'Harpsichord', 'orgue': 'Organ', 'orgue positif': 'Organ',
    'celesta': 'Celesta', 'claviers': 'Keyboards', 'accordeon': 'Accordion', 'bandoneon': 'Bandoneon',
    # strings
    'violon': 'Violin', 'violon solo': 'Violin', 'violons': 'Violin', 'violoniste': 'Violin', 'alto solo': 'Viola',
    'violoncelle': 'Cello', 'violoncelle solo': 'Cello', 'violoncelles': 'Cello', 'contrebasse': 'Double bass',
    'viole de gambe': 'Viola da gamba', 'viole': 'Viola da gamba', 'harpe': 'Harp', 'guitare': 'Guitar',
    'luth': 'Lute', 'theorbe': 'Theorbo', 'mandoline': 'Mandolin', 'cymbalum': 'Cimbalom', 'basse electrique': 'Electric bass',
    # winds, brass, percussion
    'flute': 'Flute', 'flute traversiere': 'Flute', 'flute a bec': 'Recorder', 'piccolo': 'Piccolo',
    'hautbois': 'Oboe', "cor anglais": 'Cor anglais', 'clarinette': 'Clarinet', 'clarinette basse': 'Bass clarinet',
    'basson': 'Bassoon', 'contrebasson': 'Contrabassoon', 'saxophone': 'Saxophone', 'saxophones': 'Saxophone',
    'cor': 'Horn', 'trompette': 'Trumpet', 'trombone': 'Trombone', 'tuba': 'Tuba', 'euphonium': 'Euphonium',
    'percussion': 'Percussion', 'percussions': 'Percussion', 'timbales': 'Timpani', 'batterie': 'Drums',
    'marimba': 'Marimba', 'vibraphone': 'Vibraphone',
    # voices
    'soprano': 'Soprano', 'sopranos': 'Soprano', 'sop': 'Soprano', 'mezzo-soprano': 'Mezzo-soprano',
    'mezzo': 'Mezzo-soprano', 'mezzo soprano': 'Mezzo-soprano', 'contralto': 'Contralto', 'alt': 'Alto',
    'contre-tenor': 'Countertenor', 'contreténor': 'Countertenor', 'contretenor': 'Countertenor',
    'haute-contre': 'Countertenor', 'tenor': 'Tenor', 'tenors': 'Tenor', 'ten': 'Tenor', 'baryton': 'Baritone',
    'baryton-basse': 'Bass-baritone', 'basse': 'Bass', 'basses': 'Bass', 'bas': 'Bass', 'basse chantante': 'Bass',
    'voix': 'Voice', 'chant': 'Voice', 'chanteur': 'Voice', 'chanteuse': 'Voice', 'vocals': 'Voice',
    # others on stage
    'recitant': 'Narrator', 'recitante': 'Narrator', 'narrateur': 'Narrator', 'narratrice': 'Narrator',
    'recit': 'Narrator', 'conteur': 'Narrator', 'conteuse': 'Narrator', 'comedien': 'Actor', 'comedienne': 'Actor',
    'presentation': 'Presenter', 'presentateur': 'Presenter', 'presentatrice': 'Presenter', 'evangeliste': 'Evangelist',
    'danse': 'Dance', 'danseur': 'Dance', 'danseuse': 'Dance', 'animation': None,
    # groups
    'choeur': 'Choir', 'choeurs': 'Choir', 'ensemble vocal': 'Choir', 'orchestre': 'Orchestra', 'ensemble': 'Ensemble',
    'quatuor': 'Ensemble',
    # creative team: not performers -> dropped
    'musique': None, 'livret': None, 'texte': None, 'textes': None, 'composition': None, 'compositions': None,
    'arrangement': None, 'arrangements': None, 'orchestration': None, 'mise en scene': None, 'mise en espace': None,
    'scenographie': None, 'decors': None, 'costumes': None, 'lumieres': None, 'lumiere': None, 'choregraphie': None,
    'dramaturgie': None, 'dramaturgie musicale': None, 'video': None, 'videos': None, 'conception': None,
    'creation': None, 'realisation': None, 'auteur': None, 'autrice': None, 'production': None, 'son': None,
    'assistant': None, 'assistante': None, 'collaboration artistique': None, 'idee originale': None,
    'chorégraphe associé': None, 'choregraphe associe': None, 'assistants choregraphiques': None, 'scenographie et lumieres': None,
    'scenographie, costumes': None, 'dessin': None, 'illustration': None, 'illustrations': None, 'film': None,
    'scenographe': None, 'costumier': None, 'costumiere': None, 'eclairagiste': None, 'metteur en scene': None,
    'metteuse en scene': None, 'choregraphe': None, 'dramaturge': None, 'videaste': None, 'realisateur': None,
    'realisatrice': None, 'librettiste': None, 'compositeur': None, 'compositrice': None, 'ingenieur du son': None,
}
_VOICES = ('Soprano', 'Mezzo-soprano', 'Contralto', 'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass')
CREATIVE = object()   # marker returned by role_en for creative-only roles
# creative-team words in a role label not listed above ('réalisation vidéo', 'collaboration à la vidéo')
_CREATIVE_WORDS = re.compile(r"\b(mise en (scene|espace)|scenograph\w*|costum\w*|lumieres?|eclairag\w*|dramaturg\w*|"
                             r"videos?|choregraph\w*|realisation|collaboration|assistan\w*|conception|decors?|livret|"
                             r"surtitr\w*|traduction|maquillage|perruques?|regie|graphisme|photographi\w*|creation lumiere)\b")
_PLACEHOLDER = re.compile(r"^(n\.?\s*n\.?|t\.?b\.?[ac]\.?|a (confirmer|venir|determiner|preciser)|distribution a venir|"
                          r"en cours|inconnu)$")


def is_placeholder(name):
    """'N.N.', 'TBA', 'à confirmer' -> True: not a performer."""
    return bool(_PLACEHOLDER.match(fold(name).strip(' .,()')) or _PLACEHOLDER.match(fold(name).strip(' ,()')))


def _role_key(text):
    k = fold(text).strip(' .:;,–—-')
    k = re.sub(r'\s+', ' ', k)
    return k


def role_en(text, *, voices=False):
    """French role text -> English Klang role ('violon et direction' -> 'Violin & Conductor').
    Returns CREATIVE for creative-team-only roles (musique, livret, mise en scène ...),
    and None for text that does not look like a role at all."""
    raw = clean(text).strip(' –—-:,')
    if not raw or len(raw) > 70:
        return None
    paren = ''
    m = re.match(r'^(.*?)\s*(\([^)]*\))\s*$', raw)
    if m:
        raw, paren = m.group(1), m.group(2)
    key = _role_key(raw)
    if key in _ROLE_MAP:
        parts = [raw]
    else:
        parts = [p for p in re.split(r'\s*(?:,|&|/|\bet\b|\+)\s*', raw) if p.strip()]
    out, creative = [], False
    for p in parts:
        k = _role_key(p)
        if k == 'alto':
            out.append('Alto' if voices else 'Viola')
            continue
        if k in _ROLE_MAP:
            v = _ROLE_MAP[k]
            if v is None:
                creative = True
            elif v not in out:
                out.append(v)
            continue
        if _CREATIVE_WORDS.search(k):
            creative = True                  # 'réalisation vidéo', 'Collaboration à la vidéo'
            continue
        if re.fullmatch(r"[a-zà-ÿœ' -]{2,30}", p.strip(), re.I) and p.strip()[:1].islower():
            v = p.strip()
            v = v[0].upper() + v[1:]
            if v not in out:
                out.append(v)
            continue
        return None
    if not out:
        return CREATIVE if creative else None
    role = ' & '.join(out)
    if paren and not re.search(r'\d', paren):
        role += ' ' + paren
    return role


_ORCH_RE = re.compile(r"(orchest(re|ra|er)\b|\bsinfonietta\b|\bphilharmoni|\bsymphoni|\bsinfonie|\bcamerata\b|\bharmonie\b|\bstreicher\b)")
_CHOIR_RE = re.compile(r"(\bchoeurs?\b|chor\b|\bchorale\b|\bcoro\b|\bchoir\b|\bmaitrise\b|\bensemble vocal\b|\bpsall?ette\b|\bmotet\b|vokalensemble|\bvoices\b|\bsingers\b|\bchanteurs\b)")
_ENS_RE = re.compile(r"\b(ensemble|quatuor|quartet|quartett|quartetto|trio|quintette|quintet|sextuor|septuor|octuor|duo|consort|band|brass|cuivres|les musiciens|collegium|concerto|solistes de|solisten)\b")


def group_role(name):
    """'Orchestre de Chambre de Genève' -> 'Orchestra', 'Le Motet de Genève' -> 'Choir', ... else None."""
    f = fold(name)
    if _CHOIR_RE.search(f) and not re.search(r'\borchestre\b|\borchestra\b', f):
        return 'Choir'
    if _ORCH_RE.search(f):
        return 'Orchestra'
    if _CHOIR_RE.search(f):
        return 'Choir'
    if _ENS_RE.search(f):
        return 'Ensemble'
    return None


def voice_context(role_texts):
    """True when at least two different voice types appear (then French 'alto' is a voice)."""
    found = set()
    for t in role_texts:
        for part in re.split(r'\s*(?:,|&|/|\bet\b)\s*', fold(t)):
            v = _ROLE_MAP.get(part.strip(' .()'))
            if v in _VOICES:
                found.add(v)
    return len(found) >= 2


def looks_like_name(text, max_words=6):
    """'Johann Sebastian Bach', 'Leoš Janáček', 'Frédéric Chopin / Hayato Sumino' -> True."""
    t = clean(text).strip(' ,')
    if not t or len(t) > 70 or re.search(r'[.:;!?«»"]|\d', t):
        return False
    words = [w for w in re.split(r'[\s/]+', t) if w]
    if not 1 <= len(words) <= max_words:
        return False
    small = {'de', 'du', 'des', 'la', 'le', 'van', 'von', 'der', 'den', 'di', 'da', 'del', 'della', 'y', 'et', 'and', '&', "d'", 'ten', 'zu', 'bin', 'ibn', 'al'}
    caps = sum(1 for w in words if w[:1].isupper())
    return caps >= 1 and all(w[:1].isupper() or w.lower() in small or w[:2].lower() in ("d'", 'd’') for w in words)


def plausible_person(text):
    """Looser than looks_like_name, for performer names: 'Iván «Melón» Lewis', 'J. S. Doe'."""
    t = clean(text).strip(' ,')
    if not t or len(t) > 80 or re.search(r'[:;!?]|\d', t):
        return False
    words = t.split()
    return 1 <= len(words) <= 8 and t[:1].isupper()


def split_names(text):
    """'Emiliano Gonzalez Toro et Mathilde Etienne' -> two names (only when both look like names)."""
    t = clean(text).strip(' ,')
    parts = [p.strip(' ,') for p in re.split(r'\s+(?:et|&|and)\s+', t) if p.strip(' ,')]
    if len(parts) > 1 and all(looks_like_name(p) and len(p.split()) >= 2 for p in parts):
        return parts
    return [t]


# ---------------------------------------------------------------------------
# concert type
# ---------------------------------------------------------------------------

_GROUP_ROLES = ('Orchestra', 'Ensemble', 'Choir', 'Performer')


def concert_type(title, credits, program, extra=''):
    """Klang type from what we know: opera/oratorio words first, then the line-up."""
    head = guess_type(f'{title} {extra}')
    if head == 'vocal-opera':
        return head
    works = ' '.join(f"{p.get('title', '')}" for p in program or [])
    wtype = guess_type(works)
    roles = [c['role'] for c in credits or []]
    conductor = any('Conductor' in r for r in roles)
    orchestra = any(r == 'Orchestra' for r in roles)
    choir = any(r in ('Choir', 'Chorus master') for r in roles)
    voices = {r for r in roles if any(v in r for v in _VOICES)}
    if wtype == 'vocal-opera' and (choir or len(voices) >= 2):
        return 'vocal-opera'
    if len({r.split(' (')[0] for r in roles} & set(_VOICES)) >= 3:
        return 'vocal-opera'                 # an opera / oratorio in concert: three or more voice types
    if conductor or orchestra:
        return head if head in ('orchestral', 'vocal-opera') else 'orchestral'
    soloists = [c for c in credits or [] if c['role'] not in _GROUP_ROLES and c['role'] != 'Chorus master']
    if any(r == 'Ensemble' for r in roles) and not soloists:
        return head or 'chamber'
    if soloists:
        if len(soloists) <= 2 and not choir:
            return 'recital'
        if len(soloists) <= 9:
            return 'chamber'
    return head or wtype


# ---------------------------------------------------------------------------
# OpenAgenda (Ville de Genève datasets on opendata.swiss)
# ---------------------------------------------------------------------------

OA_STATUS_CANCELLED = {4, 6}        # 4 = reporté (postponed), 6 = annulé
OA_STATUS_ONLINE = 3                # moved online


def openagenda_events(agenda_uid, *, limit=100, max_pages=5):
    """All events of a public OpenAgenda agenda via its legacy JSON export (paginated)."""
    events, offset = [], 0
    for _ in range(max_pages):
        url = f'https://openagenda.com/agendas/{agenda_uid}/events.json?limit={limit}&offset={offset}'
        data = get_json(url)
        batch = data.get('events') or [] if isinstance(data, dict) else []
        events.extend(batch)
        total = int(data.get('total') or 0) if isinstance(data, dict) else 0
        offset += len(batch)
        if not batch or offset >= total or requests_left() <= 0:
            break
    return events


def oa_text(value, lang='fr'):
    """OpenAgenda multilingual field -> text in ``lang`` (fallback: any language)."""
    if isinstance(value, dict):
        for k in (lang, 'fr', 'en', 'de', 'it'):
            if value.get(k):
                return str(value[k])
        for v in value.values():
            if v:
                return str(v)
        return ''
    return str(value or '')


def oa_tags(ev):
    return {str(t.get('slug') or '').lower() for t in as_list(ev.get('tags')) if isinstance(t, dict)}


def oa_ticket_url(ev):
    if ev.get('registrationUrl'):
        return ev['registrationUrl']
    for r in as_list(ev.get('registration')):
        if isinstance(r, dict) and r.get('type') == 'link' and r.get('value'):
            return r['value']
    return None


def _md_strip(text):
    """Markdown inline -> plain text: '_Sonate_, op. 5' -> 'Sonate, op. 5'."""
    s = re.sub(r'\*\*', '', text)
    s = re.sub(r'(?<![\w])_|_(?![\w])', '', s)
    s = s.replace('\\*', '*').replace('\\_', '_')
    return clean(s)


def _work_title(line):
    t = _md_strip(line)
    t = re.sub(r'\s*\((?:env|environ|ca)\.?[^)]*\)', '', t)          # '(env. 40’)'
    t = re.sub(r'\s+', ' ', t).strip(' ,;')
    return t


_BOLD_SEG = re.compile(r'\*\*(.+?)\*\*')


def _bold_prefix(line):
    """'**A** & **B** sopranos' -> (['A', 'B'], 'sopranos', trailing_comma)
    '**Iván «Melón»** **Lewis** piano' -> (['Iván «Melón» Lewis'], 'piano', False). None if no bold prefix."""
    pos, names, current, joiner_pending = 0, [], None, False
    s = line.strip()
    if not s.startswith('**'):
        return None
    while True:
        m = _BOLD_SEG.match(s, pos)
        if not m:
            break
        seg = m.group(1).strip()
        if current is not None and not joiner_pending:
            current = f'{current} {seg}'
        else:
            if current is not None:
                names.append(current)
            current = seg
        pos = m.end()
        j = re.match(r'\s*(&|\bet\b|,)?\s*(?=\*\*)', s[pos:])
        if j and j.group(0) != '' and s[pos + j.end():].startswith('**'):
            joiner_pending = bool(j.group(1))
            pos += j.end()
            continue
        if s[pos:].startswith('**'):
            joiner_pending = False
            continue
        break
    if current is not None:
        names.append(current)
    rest = s[pos:]
    trailing_comma = any(n.rstrip().endswith(',') for n in names)
    names = [n.strip().rstrip(',').strip() for n in names]
    return names, rest.strip(), trailing_comma


def parse_programme_markdown(md, *, role_first_section=None):
    """Facts from an OpenAgenda long description (Markdown) of a Geneva concert.

    Victoria Hall style ('**Name** role' lines, then '**Composer**' + '_Work_' lines) and
    Grand Théâtre style ('### **Distribution**' with '**Role** Name' lines, recitals as
    '**Name,** role'). Returns (credits, program); prose is ignored, never returned.
    ``role_first_section``: a heading word (e.g. 'distribution') after which bold text is the
    role and the plain text the name, until the next heading.
    """
    lines = [re.sub(r'\\$', '', l.rstrip()).strip() for l in (md or '').replace('\r', '').split('\n')]
    role_texts = []
    for l in lines:
        bp = _bold_prefix(l) if l.startswith('**') else None
        if bp and bp[1]:
            role_texts.append(bp[1].strip(' –—-:,'))
    voices = voice_context(role_texts)

    credits, program = [], []
    composer = None            # current composer for following '_work_' lines
    music_by = None            # '**X** musique' -> composer of an orphan '_work_'
    in_role_first = False

    def add_credit(role, name):
        for n in split_names(name):
            dates = cast_dates(n)                                     # only on these dates
            n = re.sub(r'\s*\([^)]*\d[^)]*\)', '', n).strip(' ,')   # '(13, 15 et 17 décembre)'
            if n and not is_placeholder(n) and (plausible_person(n) or group_role(n)):
                credits.append(dict({'role': role, 'name': n}, **({'dates': dates} if dates else {})))

    last_mark, prev_roles = 0, []
    for i, line in enumerate(lines):
        prev_roles, last_mark = [c['role'] for c in credits[last_mark:]], len(credits)   # roles of the line above
        nxt = lines[i + 1] if i + 1 < len(lines) else ''
        if not line:
            composer = None
            continue
        if re.fullmatch(r'[-=]{3,}', line):          # setext heading underline
            continue
        heading = re.match(r'^#{1,6}\s*(.*)$', line)
        if heading:
            htext = fold(_md_strip(heading.group(1)))
            in_role_first = bool(role_first_section) and role_first_section in htext
            composer = None
            continue
        plain = _md_strip(line)
        if line.startswith('_') and not line.startswith('__'):
            title = _work_title(line)
            who = composer or music_by
            if who and title and len(title) <= 200:
                program.append({'composer': who, 'title': title})
            continue
        bp = _bold_prefix(line)
        if bp:
            names, rest, comma = bp
            rest = rest.strip()
            if rest.startswith((':', '!')) or any(len(n) > 80 for n in names):
                composer = None
                continue
            if in_role_first and not comma and rest and len(names) == 1:
                # '**Direction musicale** Marta Gardolińska' / '**Le Comte Almaviva** Jarrett Ott'
                label = names[0]
                role = role_en(label, voices=voices)
                if role is CREATIVE:
                    continue
                if role is None:
                    if not re.match(r"^[A-ZÀ-Ý]", label) or len(label) > 40:
                        continue
                    role = label                     # a character in an opera
                for person in re.split(r'\s*\|\s*', rest):
                    add_credit(role, person)
                continue
            if (not rest or rest.startswith('(')) and len(names) == 1 and nxt.startswith('_') \
                    and looks_like_name(names[0], max_words=8):
                composer = names[0]                  # '**Johannes Brahms**' + '_Symphonie_'
                continue
            if not rest:
                composer = None
                for n in names:
                    g = group_role(n)
                    if g and len(n) <= 80:
                        add_credit(g, n)
                continue
            role_text = rest.strip(' –—-:,')
            role = role_en(role_text, voices=voices)
            if role == 'Conductor' and 'Choir' in prev_roles and any(c['role'] == 'Conductor' for c in credits):
                role = 'Chorus master'               # '**Maîtrise …**' + '**X et Y** direction' after the conductor
            if role is CREATIVE:
                if re.search(r'\bmusique\b|\bcomposition\b', fold(role_text)) and len(names) == 1:
                    music_by = names[0]
                composer = None
                continue
            if role is None:
                # a character in a concert opera: '**Nikoloz Lagvilava** Nabucco'
                if re.fullmatch(r"[A-ZÀ-Ý][\w’'.\- ]{1,30}", role_text) and len(role_text.split()) <= 4:
                    role = role_text
                else:
                    composer = None
                    continue
            for n in names:
                add_credit(role, n)
            composer = None
            continue
        # plain text line
        m = re.match(r'^([^_*]{3,60}?)\s+_(.+)_\s*$', line)
        if m and looks_like_name(m.group(1)):        # 'Claude Debussy _La Mer_'
            program.append({'composer': clean(m.group(1)), 'title': _work_title(m.group(2))})
            composer = None
            continue
        m = re.match(r'^([^*]{2,30}?)\s*\*\*([^*]+)\*\*\s*$', line)
        if m:                                        # 'Ensemble vocal **La Psallette de Genève**'
            role = role_en(m.group(1))
            if role and role is not CREATIVE:
                add_credit(role, m.group(2))
            continue
        if looks_like_name(plain) and nxt.startswith('_'):
            composer = plain                         # 'Franz Schubert' + '_Die Forelle_'
            continue
        composer = None
        if len(plain) > 110:                         # prose: the facts block is over
            break
    return credits, program


def cast_dates(text):
    """'Jared Mac Werlein (18, 28 décembre 2026)' -> {(12, 18), (12, 28)}: the (month, day) dates a
    singer of an alternating cast appears on; None when the text carries no such date list."""
    m = re.search(r'\(([^)]*\d[^)]*)\)', text or '')
    if not m:
        return None
    pending, out = [], set()
    for tok in re.findall(r'\d+|[^\W\d_]+', m.group(1)):
        if tok.isdigit():
            if len(tok) <= 2:
                pending.append(int(tok))
            continue
        month = fr_month(tok)
        if month:
            out.update((month, d) for d in pending if 1 <= d <= 31)
            pending = []
    return out or None


def on_date(credits, day):
    """Credits for one performance: drops alternating-cast singers not on ``day`` (a date)."""
    return [{'role': c['role'], 'name': c['name']} for c in credits
            if not c.get('dates') or (day.month, day.day) in c['dates']]


def stable_ids(rows, key):
    """rows: list of dicts with 'start' (aware datetime) -> adds 'sid' = '<key>-YYYYMMDD'
    (plus '-HHMM' when the same key plays twice that day). Ids survive a time change."""
    by_day = {}
    for r in rows:
        by_day.setdefault((key(r), r['start'].date()), []).append(r)
    for (k, day), group in by_day.items():
        for r in group:
            sid = f'{k}-{day:%Y%m%d}'
            if len(group) > 1:
                sid += f"-{r['start']:%H%M}"
            r['sid'] = sid
    return rows


__all__ = [
    'fold', 'FR_MONTHS', 'fr_month', 'duration_minutes', 'CITY_NAMES', 'swiss_city', 'role_en', 'CREATIVE',
    'group_role', 'voice_context', 'looks_like_name', 'plausible_person', 'split_names', 'concert_type', 'openagenda_events',
    'oa_text', 'oa_tags', 'oa_ticket_url', 'parse_programme_markdown', 'stable_ids', 'OA_STATUS_CANCELLED',
    'OA_STATUS_ONLINE', 'is_placeholder', 'cast_dates', 'on_date',
]
