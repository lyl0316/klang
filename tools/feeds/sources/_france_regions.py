"""Shared helpers for the readers of French regional houses (Lyon, Strasbourg / Colmar /
Mulhouse, Toulouse, Bordeaux, Marseille): auditorium_lyon, opera_lyon, ops_strasbourg,
opera_du_rhin, capitole_toulouse, opera_bordeaux, opera_marseille.

Not a reader itself: the registry skips modules whose name starts with '_'.
Only *facts* come out of here (dates, role names, people, works, places); never description
text. French role words are mapped with the Geneva readers' table (_geneva.role_en) plus a
few words those sites use that Geneva's do not.

Note for build.py --fresh-hours: a reader's codeHash covers only its own file and
common.py, so an edit here does not by itself invalidate yesterday's reused events.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import datetime

from common import clean, event_id, previous_event, refresh_due, to_zurich_iso, today_zurich

from ._geneva import _ROLE_MAP as _GENEVA_ROLES, CREATIVE, group_role as _geneva_group_role, is_placeholder, \
    role_en as _geneva_role_en

PARIS = 'Europe/Paris'

# ---------------------------------------------------------------------------
# text
# ---------------------------------------------------------------------------


def fold(text):
    """'Chœur de l'Opéra' -> "choeur de l'opera" (lower-case, no accents) for matching only."""
    s = unicodedata.normalize('NFKD', str(text or '')).replace('œ', 'oe').replace('Œ', 'oe').replace('æ', 'ae')
    s = ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()
    return s.replace('’', "'").replace('‘', "'")


_PARTICLES = {'de', 'du', 'des', 'la', 'le', 'les', 'von', 'van', 'der', 'den', 'da', 'di', 'del', 'della', 'et',
              'zu', 'y', 'e', 'and', 'of', 'the', 'pour', 'en', 'au', 'aux', 'à', 'a', 'für', 'und', 'sur', 'avec',
              'dans', 'un', 'une'}
_KEEP_UPPER = {'ONL', 'OPS', 'ONBA', 'ONCT', 'ONR', 'OnR', 'CNSMD', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI',
               'XII', 'XX', 'XXI', 'XIX', 'XVIII', 'XVII', 'BBC', 'USA', 'UK', 'DJ', 'CCN', 'JAVA', 'AONL', 'SWR',
               'NDR', 'WDR', 'BR', 'MDR', 'HR', 'ORF', 'RAI'}


def _cap_word(w, first):
    low = w.lower()
    if not first and low in _PARTICLES:
        return low
    parts = re.split(r"([-'’])", low)
    out = ''.join(p[:1].upper() + p[1:] if p not in "-'’" else p for p in parts)
    if not first and re.match(r"^[dl]['’]\w", low):        # d'Indy, l'Opéra
        out = low[0] + out[1:]
    return out


def name_case(text):
    """Fix the case of a name or title written in capitals or in lower case:
    'LE VILLI' -> 'Le Villi', 'evan rogister' -> 'Evan Rogister', 'Paolo ARRIVABENI' ->
    'Paolo Arrivabeni', "chœur de l'opéra national de bordeaux" -> "Chœur de l'Opéra National
    de Bordeaux". Text in normal mixed case is returned unchanged."""
    t = clean(text)
    letters = [c for c in t if c.isalpha()]
    if not letters:
        return t
    all_upper = not any(c.islower() for c in letters)
    all_lower = not any(c.isupper() for c in letters)
    words = t.split(' ')
    out = []
    for i, w in enumerate(words):
        core = w.strip('(),.;:«»"!?')
        if core in _KEEP_UPPER:
            out.append(w)
            continue
        wl = [c for c in w if c.isalpha()]
        if all_upper or all_lower:
            out.append(_cap_word(w, i == 0))
        elif len(wl) >= 2 and not any(c.islower() for c in wl):
            out.append(_cap_word(w, True))                 # 'Paolo ARRIVABENI' -> 'Arrivabeni'
        else:
            out.append(w)
    return ' '.join(out)


FR_MONTHS = {
    'janvier': 1, 'janv': 1, 'jan': 1, 'fevrier': 2, 'fevr': 2, 'fev': 2, 'feb': 2, 'mars': 3, 'mar': 3,
    'avril': 4, 'avr': 4, 'apr': 4, 'mai': 5, 'may': 5, 'juin': 6, 'jun': 6, 'juillet': 7, 'juil': 7, 'jul': 7,
    'aout': 8, 'aou': 8, 'aug': 8, 'septembre': 9, 'sept': 9, 'sep': 9, 'octobre': 10, 'oct': 10,
    'novembre': 11, 'nov': 11, 'decembre': 12, 'dec': 12, 'january': 1, 'february': 2, 'march': 3,
    'april': 4, 'june': 6, 'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
}


def fr_month(word):
    """'déc.' -> 12, 'Nov' -> 11, 'juillet' -> 7; None when not a month."""
    return FR_MONTHS.get(fold(word).strip('. '))


def paris_iso(y, mo, d, hh, mi):
    """Local French wall-clock time -> Klang's ISO start (Swiss offset)."""
    return to_zurich_iso(datetime(int(y), int(mo), int(d), int(hh), int(mi)), assume=PARIS)


def year_for(month, day, today=None):
    """The year of a date printed without one: the first (month, day) on or after today
    (a few days back are tolerated for a listing that still shows tonight's concert)."""
    today = today or today_zurich()
    for y in (today.year, today.year + 1):
        try:
            d = datetime(y, month, day).date()
        except ValueError:
            continue
        if (d - today).days >= -3:
            return y
    return today.year + 1


# ---------------------------------------------------------------------------
# what to skip
# ---------------------------------------------------------------------------

# children's / school / family formats, workshops, talks, tours, cinema, open rehearsals, exhibitions
SKIP_RE = re.compile(
    r"\b(scolaires?|en famille|famille|jeune public|enfants?|des \d+ (?:mois|ans)|de \d+ a \d+ ans|bebes?|tout-petits|"
    r"ateliers?|conferences?|conference-concert|rencontres? (?:avec|a la librairie)|table ronde|visites?|"
    r"guidee?s?|portes ouvertes|repetitions? (?:ouvertes?|publiques?)|classes? ouvertes?|projection|cinema|"
    r"cine-concert|cine concert|exposition|masterclass|master class|stage|bal\b|dj set|"
    r"tous en choeur|bulle musicale|eveil musical|apres-midi des familles|babyproms|relax\b|venez chanter|"
    r"chantez avec)")


def is_skipped(*texts):
    """True when a title/category says children's, school, family, workshop, talk, tour,
    cinema, open rehearsal or exhibition."""
    return bool(SKIP_RE.search(fold(' '.join(clean(t) for t in texts if t))))


# ---------------------------------------------------------------------------
# roles and credits
# ---------------------------------------------------------------------------

_EXTRA_ROLES = {
    'direction': 'Conductor', 'direction musicale': 'Conductor', 'chef d orchestre': 'Conductor',
    'chef de chant': None, 'pianiste': 'Piano', 'piano et direction': 'Piano & direction',
    'violon et direction': 'Violin & direction', 'clavecin et direction': 'Harpsichord & direction',
    'orgue et direction': 'Organ & direction', 'recitante': 'Narrator', 'recitant': 'Narrator',
    'chef des choeurs': 'Chorus master', 'cheffe des choeurs': 'Chorus master', 'chef de choeur': 'Chorus master',
    'cheffe de choeur': 'Chorus master', 'direction des choeurs': 'Chorus master', 'chef du choeur': 'Chorus master',
    'cheffe du choeur': 'Chorus master', 'mezzo-soprano': 'Mezzo-soprano', 'violons': 'Violin', 'altos': 'Viola',
    'violoncelles': 'Cello', 'contrebasses': 'Double bass', 'flutes': 'Flute', 'clarinettes': 'Clarinet',
    'trompettes': 'Trumpet', 'cors': 'Horn', 'hautbois': 'Oboe', 'bassons': 'Bassoon', 'trombones': 'Trombone',
    'percussions': 'Percussion', 'harpes': 'Harp', 'pianos': 'Piano', 'guitares': 'Guitar', 'presentation': 'Presenter',
    'saxophones': 'Saxophone', 'cymbalum': 'Cimbalom', 'orchestre': 'Orchestra', 'choeur': 'Choir', 'choeurs': 'Choir',
    'maitrise': 'Choir', 'ensemble': 'Ensemble', 'conception': None, 'mise en scene': None, 'decors': None,
    'scenographie': None, 'costumes': None, 'lumieres': None, 'choregraphie': 'Choreographer', 'video': None,
    'dramaturgie': None, 'chef assistant': None, 'cheffe assistante': None, 'assistant': None,
    'batterie': 'Drums', 'jeu': 'Actor', 'sopranos': 'Soprano', 'mezzo-sopranos': 'Mezzo-soprano',
    'tenors': 'Tenor', 'barytons': 'Baritone', 'soprani': 'Soprano', 'alti': 'Alto', 'tenori': 'Tenor',
    'bassi': 'Bass', 'mezzi': 'Mezzo-soprano', 'concert presente par': 'Presenter', 'presente par': 'Presenter',
    'presentation et direction': 'Conductor', 'responsable musicale': 'Conductor', 'responsable musical': 'Conductor', 'comedienne': 'Actor', 'comedien': 'Actor', 'guitare electrique': 'Electric guitar',
}
_STAFF_RE = re.compile(r"mise en|scenograph|decor|costum|lumiere|eclairag|video|dramaturg|assistan|collaborat|"
                       r"realisation|conception|surtitr|traduction|maquillage|perruque|regie|son\b|sound|livret|"
                       r"musique\b|composition|arrangement|orchestration|creation|production|coach|chef de chant|"
                       r"accompagnement artistique|danseu|danseur|figurant|comedien|acrobat|circassien|ballet\b")


def role_fr(text, *, voices=False):
    """French role label -> English role ('direction' -> 'Conductor', 'violon et direction' ->
    'Violin & direction'); CREATIVE for the creative team (mise en scène, costumes ...); None
    when the label is not a known role (e.g. an opera character)."""
    raw = clean(text).strip(' :,–—-')
    if not raw:
        return None
    raw = re.sub(r'\s*\((?:les?|le)\s[^)]*\)\s*$', '', raw)       # 'Direction musicale (les 14, 16 déc.)'
    k = re.sub(r'\s+', ' ', fold(raw).replace("'", ' ').replace('’', ' ')).strip(' .:')
    k2 = fold(raw).strip(' .:')
    if re.match(r'(?:direction musicale|chef d.orchestre|cheffe d.orchestre)\b', k):
        return 'Conductor'                                  # 'Direction musicale Chef de Choeur de la Maîtrise …'
    if re.search(r'choregraph|mise en (?:scene|espace)|scenograph|set design|costum|lumiere|dramaturg|coordination|'
                 r'collaboration|poemes?\b|textes?\b|livret|auteur|autrice|adaptation|realisation|conception|'
                 r'dessin|video|assiste|composition|reprise', k):
        return CREATIVE                                     # 'Direction artistique et chorégraphie', 'Poèmes'
    if re.match(r'(?:chef|cheffe|direction) (?:des|de|du) (?:choeurs?|maitrise)\b', k):
        return 'Chorus master'                              # 'Chef des Choeurs et de la Maîtrise'
    for key in (k, k2):
        if key in _EXTRA_ROLES:
            v = _EXTRA_ROLES[key]
            if v == 'Choreographer':
                return CREATIVE
            return CREATIVE if v is None else v
    r = _geneva_role_en(raw, voices=voices)
    if r is CREATIVE:
        return CREATIVE
    if r and not all(re.sub(r' \(.*\)$', '', p) in _KNOWN_ROLES for p in r.split(' & ')):
        r = None                        # _geneva echoes unknown lower-case words: not a role we know
    if r is None and _STAFF_RE.search(k):
        return CREATIVE
    return r


_KNOWN_ROLES = {v for v in list(_GENEVA_ROLES.values()) + list(_EXTRA_ROLES.values()) if v} | {'Alto', 'Viola'}


def group_role(name):
    """'Orchestre national de Lyon' -> 'Orchestra', 'Chœur de l'Opéra' -> 'Choir', 'Quatuor Ébène' -> 'Ensemble'."""
    n = fold(name)
    if re.search(r"\borchestre et (?:les )?choeurs?\b|\borchestre,? choeur", n):
        return 'Orchestra'
    if re.search(r'^(?:les )?(?:solistes|musiciens|membres|artistes) ', n):
        return 'Ensemble'
    if re.search(r'\bballet\b', n) and not re.search(r'orchest', n):
        return None
    if re.search(r'\borfeon\b|\bcoro\b|\bcoral\b|\bmaitrise\b', n):
        return 'Choir'
    return _geneva_group_role(name)


_DATE_NOTE_RE = re.compile(r"\s*\((?:les?|uniquement les?|seulement les?)\s+([^)]*?\d[^)]*)\)\s*$", re.I)


def date_note(label):
    """'Escamillo (les 13 et 15 novembre)' -> ('Escamillo', {(11, 13), (11, 15)});
    'Direction musicale (les 23, 29, 31 décembre et 3 janvier)' -> (..., {(12, 23), (12, 29), (12, 31), (1, 3)}).
    A label without such a note -> (label, None)."""
    m = _DATE_NOTE_RE.search(label or '')
    if not m:
        return label, None
    days, pending = set(), []
    for tok in re.findall(r"\d{1,2}|[A-Za-zÀ-ÿ]+\.?", m.group(1)):
        if tok.isdigit():
            pending.append(int(tok))
        else:
            mo = fr_month(tok)
            if mo:
                days.update((mo, d) for d in pending)
                pending = []
    if not days:
        return label, None
    return label[:m.start()].strip(), days


_NOT_NAME_RE = re.compile(r"^(?:distribution|en cours|a venir|a confirmer|programme|1re partie|2e partie|"
                          r"premiere partie|seconde partie|deuxieme partie)\b|\b(?:en cours|a venir|a confirmer)$")
# a group listed without a role: one word ('Pygmalion', 'Accentus') or 'Le/La/Les …' ('Le Concert d’Astrée')
_ENSEMBLE_NAME_RE = re.compile(r"^(?:[A-ZÀ-Ý][\w’'-]+|(?:Le|La|Les|L[’'])\s?[A-ZÀ-Ý][\w’' -]{1,40})$")

_VOICE_WORDS = {'soprano': 'Soprano', 'mezzo-soprano': 'Mezzo-soprano', 'mezzo': 'Mezzo-soprano', 'alto': 'Alto',
                'contralto': 'Contralto', 'contre-tenor': 'Countertenor', 'tenor': 'Tenor', 'baryton-basse': 'Bass-baritone',
                'baryton': 'Baritone', 'basse': 'Bass'}
_VOICE_IN_LABEL = re.compile(r'\b(mezzo-soprano|soprano|mezzo|contralto|contre-tenor|tenor|baryton-basse|baryton|alto|basse)'
                             r'\b(?:\s+solo)?')

_CHARACTER_OK = re.compile(r"^[A-ZÀ-ÖØ-Ý][\w’'\-. ,/éèêëàâîïôöûüçœ]{0,60}$")


def credits_from(rows, kind='concert', day=None):
    """rows: [(label, name)] as a cast list shows them (label may be '' for groups).
    -> [(role, name)] in Klang's order: conductors, soloists, groups. The creative team is
    dropped; in an opera ('opera') an unknown label is an opera character and is kept as the
    role ('Carmen', 'Don José'); in a ballet dancers are dropped. ``day`` (a date): a
    credit noted for other dates only ('Escamillo (les 13 et 15 novembre)') is left out."""
    conductors, soloists, groups = [], [], []
    labels = [l for l, _ in rows]
    voices = any(re.search(r'\b(?:soprano|mezzo|tenor|baryton|basse|contralto|contre-tenor)\b', fold(l)) for l in labels)
    for label, name in rows:
        name = name_case(clean(name).strip(' ,;*'))
        name = re.sub(r'\s*\*+$', '', re.sub(r'^(?:et|and|avec)\s+', '', name))
        words = [w for w in re.split(r'\s+', name) if fold(w) not in _PARTICLES and w[:1].isalpha()]
        if len(words) >= 4 and sum(1 for w in words if w[:1].isupper()) * 2 < len(words):
            continue                                    # a sentence, not a name ('Ballet en un prologue et six scènes')
        if not name or is_placeholder(name) or len(name) > 160 or name.endswith(':') or _NOT_NAME_RE.search(fold(name)):
            continue                                    # 'Musiciennes et musiciens de l’ONL :', 'Distribution en cours'

        label, only = date_note(clean(label).strip(' :,'))
        if only is not None and day is not None and (day.month, day.day) not in only:
            continue
        g = group_role(name)
        if not label:
            if g:
                groups.append((g, name))
            elif _ENSEMBLE_NAME_RE.match(name):
                groups.append(('Ensemble', name))      # 'Pygmalion', 'Le Concert d’Astrée' listed without a role
            elif kind != 'ballet':
                soloists.append(('Performer', name))
            continue
        r = role_fr(label, voices=voices)
        if r is CREATIVE:
            continue
        if not g and r not in ('Orchestra', 'Choir', 'Ensemble', 'Chorus master') and \
                re.match(r"^(?:Le|La|Les|L[’'])\s?[A-ZÀ-Ý]", name) and len(name.split()) <= 5:
            g = 'Ensemble'                              # 'Le Concert Spirituel', 'Les Talens Lyriques'
        if r in ('Orchestra', 'Choir', 'Ensemble') or (g in ('Orchestra', 'Choir') and r != 'Chorus master') or \
                (g and r not in (None, 'Chorus master', 'Conductor') and not re.search(r'&', r or '')):
            groups.append((g or r, name))               # 'Piano : Quatuor Danel' -> an ensemble
            continue
        if r == 'Conductor':
            conductors.append((r, name))
            continue
        if r == 'Chorus master':
            groups.append((r, name))
            continue
        if r is None and not g:
            v = _VOICE_IN_LABEL.search(fold(label))           # 'Ténor solo, Quatuor vocal', 'Baryton solo, L’Homme'
            if v and kind != 'opera':
                r = _VOICE_WORDS[v.group(1)]
            elif v and kind == 'opera' and re.match(r'^(?:tenor|baryton|soprano|mezzo|alto|basse|contralto)', fold(label)):
                r = _VOICE_WORDS[v.group(1)]
        if r is None:
            if kind == 'ballet':
                continue
            if g:
                groups.append((g, name))
            elif kind == 'opera' and _CHARACTER_OK.match(label) and len(label) <= 50:
                soloists.append((label, name))        # a character in the opera
            elif kind != 'opera':
                soloists.append(('Performer', name))
            continue
        if kind == 'ballet' and r in ('Dance', 'Actor'):
            continue
        soloists.append((r, name))
    return conductors + soloists + groups


def split_people(text):
    """'Kai Ono, Thomas Gautier' / 'A et B' -> names (only when each part looks like a name)."""
    t = clean(text).strip(' ,;')
    parts = [p.strip(' ,;') for p in re.split(r'\s*,\s*|\s+et\s+|\s*&\s*', t) if p.strip(' ,;')]
    if len(parts) > 1 and all(1 <= len(p.split()) <= 5 and p[:1].isupper() for p in parts):
        return parts
    return [t] if t else []


# ---------------------------------------------------------------------------
# concert type
# ---------------------------------------------------------------------------


_VOICE_ROLES = ('Soprano', 'Mezzo-soprano', 'Alto', 'Contralto', 'Countertenor', 'Tenor', 'Baritone',
                'Bass-baritone', 'Bass')


def concert_type(title, credits, works, hint=None):
    """Klang type of a concert: ``hint`` when given ('orchestral', 'chamber', 'recital',
    'vocal-opera'), else an oratorio / opera in concert when three or more voice types sing,
    else common.infer_type."""
    from common import infer_type
    roles = {r for r, _ in credits}
    if hint == 'recital' and roles & {'Orchestra', 'Choir', 'Ensemble'}:
        hint = None                                 # 'Les Dames du Chœur': a choir, not a recital
    if hint in ('vocal-opera', 'recital'):
        return hint
    if len(roles & set(_VOICE_ROLES)) >= 3 or ('Choir' in roles and roles & set(_VOICE_ROLES)):
        return 'vocal-opera'
    if hint:
        return hint
    return infer_type(title, credits, works)


def kind_type(kind):
    """Klang type for a production kind when it is clear: opera/operetta -> vocal-opera,
    ballet with live music -> orchestral, recital -> recital, chamber -> chamber."""
    return {'opera': 'vocal-opera', 'ballet': 'orchestral', 'recital': 'recital', 'chamber': 'chamber',
            'orchestral': 'orchestral', 'vocal': 'vocal-opera'}.get(kind)


# ---------------------------------------------------------------------------
# incremental detail pages
# ---------------------------------------------------------------------------


def reusable(key, perfs, prod_key, *, near_days=10, every_days=7):
    """Details read on an earlier run for a production, or None when its page must be read.

    ``perfs``: [(sid, start_iso, title)] of the production's listed performances. Every one
    must be in the previous feed (same id, start and title: common.previous_event) with the
    details a page gives (credits or programme), and the production must not be due for a
    re-read (common.refresh_due). -> {sid: previous event}."""
    out = {}
    for sid, start, title in perfs:
        prev = previous_event(event_id(key, sid), start, title=title)
        if not prev or not (prev.get('credits') or prev.get('program')):
            return None
        out[sid] = prev
    if not out:
        return None
    first = min(start for _, start, _ in perfs)
    if refresh_due(prod_key, first, near_days=near_days, every_days=every_days):
        return None
    return out


def previous_by_url(key):
    """The previous feed's events of a source, grouped by their page URL."""
    from common import previous_events
    out = {}
    for e in previous_events(key):
        if e.get('url'):
            out.setdefault(e['url'], []).append(e)
    return out


def reuse_listed(prev_events, title, today, *, days=None, span=None, refresh_key=None,
                 near_days=10, every_days=7):
    """The previous feed's future concerts of one production page, when a listing that
    shows dates without times still matches them, else None.

    ``days``: the listing's set of (month, day) dates (all of them must match exactly);
    ``span``: (first, last) (month, day) when the listing shows only a range. The titles
    must be the same, and no re-read may be due (common.refresh_due on ``refresh_key``)."""
    if not prev_events:
        return None
    future = sorted((e for e in prev_events if e.get('start', '')[:10] >= today.isoformat()),
                    key=lambda e: e['start'])
    if not future or any(e.get('title') != title for e in future):
        return None
    have = [(int(e['start'][5:7]), int(e['start'][8:10])) for e in future]
    if days is not None and set(days) != set(have):
        return None
    if span is not None and (have[0], have[-1]) != tuple(span):
        return None
    if days is None and span is None:
        return None
    if refresh_due(refresh_key or future[0].get('url'), future[0]['start'], near_days=near_days,
                   every_days=every_days):
        return None
    return future


def rebuild(key, e):
    """make_event() again from a previous feed record of this source."""
    from common import make_event
    fields = {k: e.get(k) for k in ('city', 'venueName', 'type', 'series', 'credits', 'program', 'ticketUrl', 'url',
                                    'status', 'durationMin')}
    sid = e['id'][len(key) + 1:]
    return make_event(key, sid, e['title'], e['start'], **{k: v for k, v in fields.items() if v not in (None, '', [])})
