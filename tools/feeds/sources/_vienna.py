"""Shared helpers for the Vienna readers (Wiener Konzerthaus, Musikverein Wien, Wiener
Staatsoper, Volksoper Wien, MuTh). Not a reader: modules starting with '_' are skipped by
the registry.

Only facts are handled here: role labels, names, dates, halls. Never descriptions.

Note for build.py --fresh-hours: a reader's codeHash covers only its own file and
common.py, so an edit here does not by itself invalidate yesterday's reused events.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import datetime

from common import clean, to_zurich_iso

from ._consent import group_role, looks_like_person, role_en

CITY = 'Vienna'
TZ = 'Europe/Vienna'


def fold(text):
    """'Großer Saal' -> 'grosser saal' (lower-case, accents removed, ß -> ss)."""
    s = unicodedata.normalize('NFKD', str(text or '')).replace('ß', 'ss')
    return ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()


# ---------------------------------------------------------------------------
# dates (Austrian German: 'Jänner', 'Feber')
# ---------------------------------------------------------------------------

MONTHS = {
    'janner': 1, 'januar': 1, 'jan': 1, 'jann': 1, 'january': 1,
    'feber': 2, 'februar': 2, 'feb': 2, 'february': 2,
    'marz': 3, 'maerz': 3, 'mar': 3, 'march': 3, 'mrz': 3,
    'april': 4, 'apr': 4,
    'mai': 5, 'may': 5,
    'juni': 6, 'jun': 6, 'june': 6,
    'juli': 7, 'jul': 7, 'july': 7,
    'august': 8, 'aug': 8,
    'september': 9, 'sep': 9, 'sept': 9,
    'oktober': 10, 'okt': 10, 'oct': 10, 'october': 10,
    'november': 11, 'nov': 11,
    'dezember': 12, 'dez': 12, 'dec': 12, 'december': 12,
}


def month_number(word):
    return MONTHS.get(fold(word).strip('. '))


def local_iso(day, hhmm):
    """(date, 'HH:MM' / 'HH.MM') in Vienna -> ISO with offset, or None."""
    m = re.match(r'^\s*(\d{1,2})[.:](\d{2})', hhmm or '')
    if not day or not m:
        return None
    hh, mm = int(m.group(1)), int(m.group(2))
    if hh > 23 or mm > 59:
        return None
    return to_zurich_iso(datetime(day.year, day.month, day.day, hh, mm), assume=TZ)






# ---------------------------------------------------------------------------
# roles
# ---------------------------------------------------------------------------

_EXTRA_ROLES = {
    'chorleiter': 'Chorus master', 'chorleiterin': 'Chorus master', 'chorleitung': 'Chorus master',
    'chordirektor': 'Chorus master', 'chordirektorin': 'Chorus master', 'künstlerische leitung und dirigent': 'Conductor', 'choreinstudierung': '',
    'spinett': 'Spinet', 'harmonium': 'Harmonium', 'keyboard': 'Keyboard', 'keyboards': 'Keyboard',
    'synthesizer': 'Synthesizer', 'ukulele': 'Ukulele', 'blockflöten': 'Recorder', 'flöten': 'Flute',
    'violine i': 'Violin', 'violine ii': 'Violin', 'viola da gamba': 'Viola da gamba',
    'bassklarinette': 'Bass clarinet', 'kontrabass': 'Double bass', 'zither': 'Zither',
    'vibraphon': 'Vibraphone', 'electronics': 'Electronics', 'elektronik': 'Electronics',
    'live-elektronik': 'Electronics', 'klangregie': '', 'regie': 'Director', 'inszenierung': 'Director',
    'tänzer': '', 'tänzerin': '', 'tanz': '', 'moderation': 'Presenter', 'moderator': 'Presenter',
    'moderatorin': 'Presenter', 'lesung': 'Narrator', 'rezitation': 'Narrator', 'sprecher': 'Narrator',
    'sprecherin': 'Narrator', 'schauspieler': 'Narrator', 'schauspielerin': 'Narrator', 'erzähler': 'Narrator',
    'erzählerin': 'Narrator', 'knabenchor': 'Choir', 'kinderchor': 'Choir', 'frauenchor': 'Choir',
    'männerchor': 'Choir', 'mädchenchor': 'Choir', 'vokalensemble': 'Choir', 'kammerchor': 'Choir',
    'kammerorchester': 'Orchestra', 'barockorchester': 'Orchestra', 'jugendorchester': 'Orchestra',
    'streichquartett': 'Ensemble', 'klaviertrio': 'Ensemble', 'klavierquartett': 'Ensemble',
    'bläserquintett': 'Ensemble', 'quartett': 'Ensemble', 'trio': 'Ensemble', 'quintett': 'Ensemble',
    'duo': 'Ensemble', 'band': 'Ensemble', 'big band': 'Ensemble', 'bigband': 'Ensemble',
    'sopransaxophon': 'Soprano saxophone', 'altsaxophon': 'Alto saxophone', 'tenorsaxophon': 'Tenor saxophone',
    'baritonsaxophon': 'Baritone saxophone', 'pauken': 'Timpani', 'perkussion': 'Percussion',
    'schlagwerk': 'Percussion', 'gitarre': 'Guitar', 'e-gitarre': 'Electric guitar', 'e-bass': 'Electric bass',
    'zink': 'Cornett', 'naturhorn': 'Natural horn', 'naturtrompete': 'Natural trumpet', 'traversflöte': 'Flute',
    'barockoboe': 'Oboe', 'chalumeau': 'Chalumeau', 'theorbe': 'Theorbo', 'lirone': 'Lirone',
    'konzertmeister': 'Concertmaster', 'konzertmeisterin': 'Concertmaster', 'leitung und violine': 'Violin & direction',
    'violine und leitung': 'Violin & direction', 'klavier und leitung': 'Piano & direction',
    'leitung und klavier': 'Piano & direction', 'cembalo und leitung': 'Harpsichord & direction',
    'dirigent und klavier': 'Piano & direction', 'musikalische leitung und klavier': 'Piano & direction',
    'chor- und orchesterleitung': 'Conductor', 'einstudierung': '', 'dramaturgie': '', 'ausstattung': '',
    'bühne': '', 'kostüme': '', 'licht': '', 'video': '', 'bühnenbild': '', 'choreographie': 'Choreographer',
    'choreografie': 'Choreographer', 'stimme': 'Voice', 'gesang': 'Voice', 'vocals': 'Voice',
}
_FOLDED_EXTRA = {fold(k): v for k, v in _EXTRA_ROLES.items()}
# an unknown role that still names an instrument or voice keeps its (German) name
_INSTRUMENTISH = re.compile(r'(phon|flöte|horn|tuba|geige|violine|viola|bass|harfe|klavier|orgel|trompete|posaune|'
                            r'cello|gitarre|schlagzeug|zither|hackbrett|laute|akkordeon|keyboard|synthesizer|marimba|'
                            r'celesta|sopran|tenor|bariton|stimme|gesang|klarinette|oboe|fagott)$', re.I)
PLACEHOLDER_RE = re.compile(r'(?i)^(?:n\.?\s*n\.?|tba|t\.b\.a\.|tbd|noch offen|wird bekannt gegeben|weitere .*)$')


def role(text):
    """German/English role text -> English role; '' for an off-stage role; None when the text
    is not a role word at all (e.g. an opera character)."""
    t = re.sub(r'\s*\([^)]*\)', '', clean(text)).strip(' ,;:')
    if not t:
        return None
    f = fold(t)
    if f in _FOLDED_EXTRA:
        return _FOLDED_EXTRA[f]
    f2 = re.sub(r'\s+(?:\d+|i{1,3}|iv)$', '', f)            # 'Sopran 2', 'Violine II'
    if f2 in _FOLDED_EXTRA:
        return _FOLDED_EXTRA[f2]
    r = role_en(t)
    if r is None and f2 != f:
        r = role_en(re.sub(r'\s+(?:\d+|[IV]{1,3})$', '', t))
    if r is None and _INSTRUMENTISH.search(t) and len(t) <= 30:
        return t[:1].upper() + t[1:]
    if r is None and re.search(r',|/|\bund\b|&', t):
        # 'Klavier, Spinett, Harmonium, Keyboard': every part a role word
        parts = [p.strip() for p in re.split(r'\s*(?:,|/|&|\bund\b)\s*', t) if p.strip()]
        mapped = [role(p) for p in parts]
        if parts and all(m is not None for m in mapped):
            mapped = [m for m in mapped if m]
            return ' & '.join(dict.fromkeys(mapped)) if mapped else ''
    return r


def credit(name, role_text, *, opera=False):
    """(role, name) for a performer, None for off-stage people / placeholders.
    For an opera a non-role text is the character ('Graf Almaviva'); otherwise 'Performer'
    (or the group's kind)."""
    name = clean(name).strip(' ,;:')
    if not name or PLACEHOLDER_RE.match(name) or len(name) > 120:
        return None
    if not clean(role_text):
        return (group_role(name) or 'Performer', name)
    r = role(role_text)
    if r == '':
        return None
    if r is None:
        if opera and len(clean(role_text)) <= 50:
            return (clean(role_text), name)
        return (group_role(name) or 'Performer', name)
    if r in ('Director', 'Choreographer') and not opera:
        return None
    if r in ('Choir & Orchestra', 'Orchestra & Choir'):
        r = 'Orchestra'                                 # one group that is both ('Dunedin Consort')
    return (r, name)


def order_credits(credits):
    """Conductor first, then soloists, then groups, then staging (Klang's usual order)."""
    lead = [c for c in credits if c[0] in ('Conductor', 'Chorus master')]
    groups = [c for c in credits if c[0] in ('Orchestra', 'Choir', 'Ensemble')]
    staging = [c for c in credits if c[0] in ('Director', 'Choreographer')]
    rest = [c for c in credits if c not in lead and c not in groups and c not in staging]
    out = []
    for c in lead + rest + groups + staging:
        if c not in out:
            out.append(c)
    return out



__all__ = ['CITY', 'TZ', 'fold', 'MONTHS', 'month_number', 'local_iso', 'role', 'credit', 'order_credits',
           'PLACEHOLDER_RE', 'group_role', 'looks_like_person']
