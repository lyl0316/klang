"""Shared helpers for the Paris readers (Philharmonie de Paris, Opéra national de Paris,
Théâtre des Champs-Élysées, Radio France, Opéra Comique, Salle Gaveau, La Seine Musicale).

Not a reader itself: the registry skips modules whose name starts with '_'.
Only *facts* come out of here (dates, role names, people, works, places); no description text.

Note for build.py --fresh-hours: a reader's codeHash covers only its own file and
common.py, so an edit here does not by itself invalidate yesterday's reused events.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime

from common import clean, to_zurich_iso

PARIS_TZ = 'Europe/Paris'


def fold(text):
    """'Chœur de l’Opéra' -> "choeur de l'opera" (lower-case, no accents) for matching only."""
    s = unicodedata.normalize('NFKD', str(text or '')).replace('œ', 'oe').replace('Œ', 'oe').replace('æ', 'ae')
    s = s.replace('ß', 'ss')
    s = ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()
    return s.replace('’', "'").replace('‘', "'")


# ---------------------------------------------------------------------------
# dates and times
# ---------------------------------------------------------------------------

MONTHS = {
    'janvier': 1, 'janv': 1, 'jan': 1, 'fevrier': 2, 'fevr': 2, 'fev': 2, 'mars': 3, 'avril': 4, 'avr': 4,
    'mai': 5, 'juin': 6, 'juillet': 7, 'juil': 7, 'aout': 8, 'septembre': 9, 'sept': 9, 'sep': 9,
    'octobre': 10, 'oct': 10, 'novembre': 11, 'nov': 11, 'decembre': 12, 'dec': 12,
}
WEEKDAYS = {'lundi': 0, 'mardi': 1, 'mercredi': 2, 'jeudi': 3, 'vendredi': 4, 'samedi': 5, 'dimanche': 6}
_MONTH_ALT = '|'.join(sorted(MONTHS, key=len, reverse=True))
DATE_RE = re.compile(r'\b(\d{1,2})(?:er)?\.?\s+(' + _MONTH_ALT + r')\.?\s+(\d{4})\b')
TIME_RE = re.compile(r'\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?(?!\d)')


def month_number(word):
    """'novembre' / 'nov.' / 'Décembre' -> 11 / 11 / 12, or None."""
    return MONTHS.get(fold(word).strip('. '))


def find_date(text):
    """First 'day month year' in ``text`` ('vendredi 6 novembre 2026', '1er mars 2027') -> (y, m, d) or None."""
    m = DATE_RE.search(fold(text))
    if not m:
        return None
    try:
        return date(int(m.group(3)), month_number(m.group(2)), int(m.group(1))).timetuple()[:3]
    except (TypeError, ValueError):
        return None


def find_time(text):
    """First clock time ('20h', '19h30', '20H00', '20:30') -> (hh, mm) or None."""
    m = TIME_RE.search(fold(text))
    if not m:
        return None
    return int(m.group(1)), int(m.group(2) or 0)


def paris_iso(y, mo, d, hh, mi):
    """Paris wall-clock time -> Klang's ISO start (Swiss time, same offset as Paris)."""
    return to_zurich_iso(datetime(int(y), int(mo), int(d), int(hh), int(mi)), assume=PARIS_TZ)


def year_for(day, month, weekday=None, around=None):
    """The year of a date printed without one ('vendredi 27 novembre'): the year whose
    weekday matches (if given), closest to ``around`` (a date, default today)."""
    around = around or date.today()
    best = None
    for y in (around.year - 1, around.year, around.year + 1, around.year + 2):
        try:
            d = date(y, month, day)
        except ValueError:
            continue
        if weekday is not None and d.weekday() != weekday:
            continue
        if best is None or abs((d - around).days) < abs((best - around).days):
            best = d
    return best.year if best else None


_PARTICLES = {'de', 'du', 'des', 'la', 'le', 'les', 'von', 'van', 'der', 'den', 'da', 'di', 'del', 'della', 'et', 'y'}


def smart_case(text):
    """'Félix BENATI' -> 'Félix Benati', 'R. SCHUMANN' -> 'R. Schumann', 'J.-S. BACH' -> 'J.-S. Bach'.
    Words not printed in capitals are kept; one- or two-letter capitals (initials, 'II') too."""
    out = []
    for i, w in enumerate(clean(text).split(' ')):
        letters = [c for c in w if c.isalpha()]
        if len(letters) > 2 and all(c.isupper() for c in letters):
            low = w.lower()
            if i > 0 and low in _PARTICLES:
                out.append(low)
                continue
            w = re.sub(r"(^|[-'’(])(\w)", lambda m: m.group(1) + m.group(2).upper(), low)
        out.append(w)
    return ' '.join(out)


# ---------------------------------------------------------------------------
# roles (French -> Klang's English role names)
# ---------------------------------------------------------------------------

OFFSTAGE = object()     # marker: a creative-team role Klang does not list (set, costumes, light ...)

ROLE_RULES = tuple((re.compile(p), r) for p, r in (
    (r"chef(?:fe)? (?:de|des) ch(?:oe|œ)urs?|chef de choeur|chef des choeurs|direction (?:du|des) choeurs?|"
     r"preparat\w* (?:du|des) choeurs?|chorus ?master", 'Chorus master'),
    (r'mise en scene|mise en espace|metteu[rs]e? en scene|stage director|realisation scenique', 'Director'),
    (r'choregraph|choreograph', 'Choreographer'),
    (r'decor|costume|lumiere|eclairag|scenograph|dramaturg|video|\bson\b|sonorisation|assistan|maquillage|'
     r'chef de chant|repetit|etudes musicales|regisseu|arrangement|orchestration|transcription|'
     r'perruque|collaboration artistique|conception|production|livret|libretto|\btextes?\b|adaptation|traduction|'
     r'surtitr|realisation sonore|electronique ircam|ircam|informatique musicale|regie|design|graphi|illustr|'
     r'dessin|animation|mapping|creation lumiere|habill', OFFSTAGE),
    (r'direction musicale|^direction$|^dir\.?$|direction et |et direction|^direction |chef d.orchestre|'
     r'cheffe d.orchestre|^chef$|^cheffe$|conductor', 'Conductor'),
    (r'violon solo|premier violon solo', 'Violin'),
    (r'mezzo', 'Mezzo-soprano'),
    (r'soprano', 'Soprano'),
    (r'contre-?tenor|countertenor|haute-contre|contreténor', 'Countertenor'),
    (r'baryton-?basse|basse-?baryton|bass-?baritone', 'Bass-baritone'),
    (r'baryton|baritone', 'Baritone'),
    (r'tenor|ténor', 'Tenor'),
    (r'viole de gambe|viola da gamba|\bgambe\b', 'Viola da gamba'),
    (r'contrebasse|double bass', 'Double bass'),
    (r'violoncelle|cello', 'Cello'),
    (r'\balto\b(?!.*(?:voix|chant))|\bviola\b', 'Viola'),
    (r'violon|violin', 'Violin'),
    (r'pianoforte|fortepiano', 'Fortepiano'),
    (r'piano', 'Piano'),
    (r'clavecin|harpsichord', 'Harpsichord'),
    (r'orgue|organ\b', 'Organ'),
    (r'\bharpe\b|\bharp\b', 'Harp'),
    (r'theorbe|theorbo|\b(?:archi)?luth\b|\blute\b', 'Lute'),
    (r'guitare|guitar', 'Guitar'),
    (r'accordeon|accordion|bandoneon', 'Accordion'),
    (r'flutes? a bec|recorder', 'Recorder'),
    (r'flute', 'Flute'),
    (r'hautbois|oboe', 'Oboe'),
    (r'cor anglais', 'Cor anglais'),
    (r'clarinette|clarinet', 'Clarinet'),
    (r'basson|bassoon', 'Bassoon'),
    (r'saxophone', 'Saxophone'),
    (r'trompette|trumpet', 'Trumpet'),
    (r'trombone', 'Trombone'),
    (r'\btuba\b', 'Tuba'),
    (r'\bcor\b|\bhorn\b', 'Horn'),
    (r'timbales|timpani', 'Timpani'),
    (r'percussion|marimba|vibraphone|\bbatterie\b|\bdrums?\b', 'Percussion'),
    (r'cymbalum|cimbalom', 'Cimbalom'),
    (r'mandolin', 'Mandolin'),
    (r'\balto\b|contralto', 'Alto'),
    (r'\bbasse\b|\bbass\b', 'Bass'),
    (r'recitant|narrat|lecture|\blu par\b', 'Narrator'),
    (r'voix|\bchant\b|vocals?\b|voice', 'Voice'),
    (r'comedien|actor|actrice|acteur|\bjeu\b', 'Actor'),
    (r'danse|danseu[rs]e?|dancer', 'Dancer'),
    (r'presentation|animateur|animatrice|\bhost\b|maitre de ceremonie', 'Host'),
    (r'ch(?:oe|œ)ur|choir|maitrise', 'Choir'),
    (r'orchestre|orchestra', 'Orchestra'),
    (r'ensemble|quatuor|quartet|trio\b|quintette|quintet', 'Ensemble'),
    (r'composit|composer|musique\b', 'Composer'),
))

_GROUP_PATTERNS = (
    ('Choir', re.compile(r"ch(?:oe|œ)ur|chorus|\bchor\b|choir|\bcoro\b|koor\b|vokalensemble|vocal ensemble|ensemble vocal|"
                         r"singers|maitrise|\bvoces\b|\bvocal\b|madrigal|cantoria|capella reial|les elements|aedes|"
                         r"accentus|vox luminis|collegium vocale|sequenza 9\.3")),
    ('Orchestra', re.compile(r'orchest|sinfoniet|symphoni|philharmon|sinfonie|camerata|kammerphilharmonie|'
                             r'les siecles|staatskapelle|gewandhaus|concertgebouw|academy of|filarmonica|sinfonica|'
                             r'les musiciens du louvre|le concert d.astree|le concert des nations|les talens lyriques|'
                             r'il pomo d.oro|le poeme harmonique|insula|la chambre philharmonique|les dissonances|'
                             r'freiburger barock|akademie fur alte|english baroque|les ambassadeurs|le cercle de l.harmonie|'
                             r'consuelo|pasdeloup|lamoureux|colonne|ondif|les forces majeures|le palais royal')),
    ('Ensemble', re.compile(r'ensemble|quatuor|quartett|quartetto|quartet|\btrio\b|quintette|quintett|quintet|'
                            r'sextuor|sextet|septuor|octuor|oktett|consort|\bduo\b|collegium|brass|cuivres|'
                            r'solistes|soloists|musiciens|musicians|players|band\b|le concert de la loge|'
                            r'les surprises|cappella mediterranea|klangforum|intercontemporain|eic\b|les arts florissants|'
                            r'pygmalion|le concert spirituel|la tempete|apollo.s fire|l.arpeggiata')),
)


def group_role(name):
    """'Orchestra' / 'Choir' / 'Ensemble' when the name is obviously a group, else None."""
    f = fold(name)
    hits = [role for role, rx in _GROUP_PATTERNS if rx.search(f)]
    if not hits:
        return None
    if re.search(r"^(?:les |des )?(?:musiciens|solistes|membres|artistes)\b", f):
        return 'Ensemble'              # "Musiciens de l'Orchestre de Paris": players from an orchestra
    if 'Choir' in hits and 'Orchestra' in hits:
        # "Orchestre et Chœur de ..." is the orchestra; "Chœur de l'Orchestre de Paris" a choir
        i_orch = f.find('orchest')
        m = _GROUP_PATTERNS[0][1].search(f)
        if i_orch < 0 or (m and m.start() < i_orch):
            return 'Choir'
        return 'Orchestra'
    return hits[0]


def role_en(label, name=''):
    """Klang's English role for a French role label: 'direction' -> 'Conductor', 'violon et
    direction' -> 'Violin & direction', 'piano' -> 'Piano'. None for creative-team roles
    (set, costumes, light, staging assistants ...). A label that is no known role (an opera
    character, a free text) -> 'Performer'; an empty label -> the group role of the name or
    'Performer'."""
    f = fold(clean(label)).strip(' ,;:-–·•()')
    f = re.sub(r'\s+', ' ', f)
    if f and re.search(r'\bdirection\b', f) and not re.search(r'musicale|mise en scene|ch(?:oe|œ)ur|artistique', f):
        rest = re.sub(r'\bdirection\b|\b(et|au|du|de la|a la|depuis le|depuis la)\b|[,&/+]', ' ', f).strip()
        if rest:
            for rx, role in ROLE_RULES:
                if rx.search(rest):
                    if role not in (None, OFFSTAGE, 'Conductor', 'Orchestra', 'Ensemble', 'Choir', 'Director',
                                    'Choreographer', 'Composer', 'Host', 'Chorus master'):
                        return role + ' & direction'
                    break
    if f:
        for rx, role in ROLE_RULES:
            if rx.search(f):
                if role is OFFSTAGE:
                    return None
                if role in ('Orchestra', 'Ensemble', 'Choir') and name:
                    return group_role(name) or role
                return role
    if name:
        g = group_role(name)
        if g:
            return g
    return 'Performer'


_PLACEHOLDER_RE = re.compile(r'(?i)^(?:n\.?\s*n\.?|tba|t\.b\.a\.|tbd|a confirmer|à confirmer|distribution en cours|'
                             r'distribution a venir|distribution à venir)$')


def is_placeholder(name):
    return bool(_PLACEHOLDER_RE.match(clean(name).strip(' .')))


def credit(name, label=''):
    """(role, name) or None for a performer line; creative-team roles and placeholders give None."""
    name = clean(name).strip(' ,;:•')
    if not name or is_placeholder(name):
        return None
    role = role_en(label, name)
    return (role, name) if role else None


# ---------------------------------------------------------------------------
# what to skip
# ---------------------------------------------------------------------------

SKIP_RE = re.compile(
    r'jeune public|\ben famille\b|concerts? en famille|\bfamilles?\b|pour enfants|\benfants?\b|\bdes \d+ ans\b|'
    r'a partir de \d+ ans|\b\d+\s*-\s*\d+ ans\b|\bbebes?\b|eveil musical|conte musical|scolaires?|\becoles?\b(?! de)|'
    r'\batelier|masterclass|master class|masterclasse|visite|\bconference|rencontre|table ronde|bord de scene|'
    r'colloque|forum|\bcinema\b|projection|repetition publique|repetitions? ouvertes?|generale publique|'
    r'exposition|vernissage|avant-concert|cle d.ecoute|cles d.ecoute|\byoga\b|chorale participative|'
    r'participati|karaoke|\bbal\b|dj set|brunch|apero|aperitif|soiree dansante|toi toi toi|podcast|'
    r'emission en public|lecture-spectacle')


def is_not_a_concert(text):
    """True for children's/family/school formats, workshops, talks, visits, cinema, rehearsals ..."""
    return bool(SKIP_RE.search(fold(text)))


# ---------------------------------------------------------------------------
# places
# ---------------------------------------------------------------------------

# towns of Île-de-France and France Klang lists, by folded name or postal-code prefix
_TOWNS = ('Paris', 'Boulogne-Billancourt', 'Gennevilliers', 'Versailles', 'Aubervilliers', 'Antony', 'Lieusaint',
          'Poissy', 'Romainville', 'Saint-Denis', 'Le Port-Marly', 'Rungis', 'Lyon', 'Strasbourg', 'Toulouse',
          'Bordeaux', 'Lille', 'Marseille', 'Nantes', 'Rennes', 'Rouen', 'Caen', 'Metz', 'Nancy', 'Dijon',
          'Besançon', 'Grenoble', 'Montpellier', 'Nice', 'Aix-en-Provence', 'Avignon', 'Reims', 'Amiens',
          'Tourcoing', 'Orléans', 'Tours', 'Poitiers', 'Limoges', 'Clermont-Ferrand', 'Saint-Étienne', 'Le Havre',
          'Angers', 'Brest', 'Pau', 'Perpignan', 'Annecy', 'Évian-les-Bains', 'Massy', 'Créteil', 'Nanterre',
          'Saint-Quentin-en-Yvelines', 'Meudon', 'Montreuil', 'Vincennes', 'Pantin', 'Ivry-sur-Seine')
TOWNS = {fold(t): t for t in _TOWNS}
_FOREIGN = {
    'bale': 'Basel', 'basel': 'Basel', 'geneve': 'Geneva', 'zurich': 'Zürich', 'lausanne': 'Lausanne', 'berne': 'Bern',
    'vienne': 'Vienna', 'wien': 'Vienna', 'londres': 'London', 'london': 'London', 'berlin': 'Berlin',
    'munich': 'Munich', 'hambourg': 'Hamburg', 'cologne': 'Cologne', 'francfort': 'Frankfurt', 'amsterdam': 'Amsterdam',
    'bruxelles': 'Brussels', 'luxembourg': 'Luxembourg', 'madrid': 'Madrid', 'barcelone': 'Barcelona',
    'milan': 'Milan', 'rome': 'Rome', 'new york': 'New York', 'tokyo': 'Tokyo', 'salzbourg': 'Salzburg',
    'baden-baden': 'Baden-Baden', 'dortmund': 'Dortmund', 'essen': 'Essen', 'dresde': 'Dresden', 'leipzig': 'Leipzig',
    'anvers': 'Antwerp', 'gand': 'Ghent', 'rotterdam': 'Rotterdam', 'utrecht': 'Utrecht', 'eindhoven': 'Eindhoven',
    'seoul': 'Seoul', 'pekin': 'Beijing', 'shanghai': 'Shanghai', 'taipei': 'Taipei',
}


def town_in(text):
    """The French town Klang lists that ``text`` names (a venue line, an address), else None."""
    f = fold(text)
    m = re.search(r'\b(75|92|93|94|78|91|95|77)\d{3}\s+([a-z\'\- ]+)', f)
    if m:
        if m.group(1) == '75':
            return 'Paris'
        town = m.group(2).strip()
        return TOWNS.get(town, town.title())
    for key in sorted(TOWNS, key=len, reverse=True):
        if re.search(r"(?<![\w-])%s(?![\w-])" % re.escape(key), f):
            return TOWNS[key]
    return None


def abroad(text):
    """The foreign city (English name) ``text`` names, else None."""
    f = fold(text)
    for key, city in _FOREIGN.items():
        if re.search(r"(?<![\w-])%s(?![\w-])" % re.escape(key), f):
            return city
    return None
