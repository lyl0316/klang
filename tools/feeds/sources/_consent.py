"""Shared helpers for the readers of venues whose terms ask for consent before reuse
(Opernhaus Zürich, Casino Bern, Kammerorchester Basel, OCL, Reformierte Kirche Zürich,
Sion Violon Musique).

Not a reader itself: the registry skips modules whose name starts with '_'.
Only *facts* come out of here (role names, people, works, places); no description text.

Note for build.py --fresh-hours: a reader's codeHash covers only its own file and
common.py, so an edit here does not by itself invalidate yesterday's reused events.
"""
from __future__ import annotations

import re
import time
import unicodedata

from common import clean


def fold(text):
    """'Chœur Opéra Zürich' -> 'choeur opera zurich' (for matching only)."""
    s = unicodedata.normalize('NFKD', str(text or '')).replace('œ', 'oe').replace('Œ', 'oe').replace('ß', 'ss')
    s = ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()
    return s.replace('’', "'").replace('‘', "'")


# ---------------------------------------------------------------------------
# roles: German / French / Italian role words -> Klang's English role names
# ---------------------------------------------------------------------------

ROLE_WORDS = {
    # conducting
    'leitung': 'Conductor', 'musikalische leitung': 'Conductor', 'dirigent': 'Conductor',
    'dirigentin': 'Conductor', 'dirigat': 'Conductor', 'chefdirigent': 'Conductor', 'chefdirigentin': 'Conductor',
    'gesamtleitung': 'Conductor', 'künstlerische leitung': 'Conductor', 'direction': 'Conductor',
    'direction musicale': 'Conductor', 'chef': "Conductor", "chef d'orchestre": 'Conductor', 'cheffe': 'Conductor',
    "cheffe d'orchestre": 'Conductor', 'direction artistique': 'Conductor', 'conductor': 'Conductor',
    'direzione': 'Conductor', 'chorleitung': 'Conductor', 'direction du choeur': 'Conductor',
    # keyboards
    'klavier': 'Piano', 'piano': 'Piano', 'pianoforte': 'Piano', 'flügel': 'Piano', 'hammerklavier': 'Fortepiano',
    'fortepiano': 'Fortepiano', 'cembalo': 'Harpsichord', 'clavecin': 'Harpsichord', 'harpsichord': 'Harpsichord',
    'orgel': 'Organ', 'orgue': 'Organ', 'organo': 'Organ', 'organ': 'Organ', 'organist': 'Organ', 'organistin': 'Organ',
    'akkordeon': 'Accordion', 'accordéon': 'Accordion', 'bandoneon': 'Bandoneon', 'bandonéon': 'Bandoneon',
    'celesta': 'Celesta',
    # strings
    'violine': 'Violin', 'geige': 'Violin', 'violon': 'Violin', 'violino': 'Violin', 'violin': 'Violin',
    'barockvioline': 'Baroque violin', 'viola': 'Viola', 'bratsche': 'Viola', 'alto': 'Viola',
    'violoncello': 'Cello', 'cello': 'Cello', 'violoncelle': 'Cello', 'barockcello': 'Baroque cello',
    'kontrabass': 'Double bass', 'contrebasse': 'Double bass', 'contrabbasso': 'Double bass',
    'viola da gamba': 'Viola da gamba', 'gambe': 'Viola da gamba', 'viole de gambe': 'Viola da gamba',
    'harfe': 'Harp', 'harpe': 'Harp', 'arpa': 'Harp', 'gitarre': 'Guitar', 'guitare': 'Guitar', 'chitarra': 'Guitar',
    'laute': 'Lute', 'luth': 'Lute', 'theorbe': 'Theorbo', 'théorbe': 'Theorbo', 'mandoline': 'Mandolin',
    'mandolino': 'Mandolin', 'cimbalom': 'Cimbalom', 'hackbrett': 'Dulcimer',
    # winds
    'flöte': 'Flute', 'querflöte': 'Flute', 'flûte': 'Flute', 'flauto': 'Flute', 'flute': 'Flute',
    'blockflöte': 'Recorder', 'flûte à bec': 'Recorder', 'oboe': 'Oboe', 'hautbois': 'Oboe',
    'englischhorn': 'Cor anglais', 'cor anglais': 'Cor anglais', 'klarinette': 'Clarinet', 'clarinette': 'Clarinet',
    'clarinetto': 'Clarinet', 'bassklarinette': 'Bass clarinet', 'fagott': 'Bassoon', 'basson': 'Bassoon',
    'fagotto': 'Bassoon', 'horn': 'Horn', 'cor': 'Horn', 'corno': 'Horn', 'trompete': 'Trumpet',
    'trompette': 'Trumpet', 'tromba': 'Trumpet', 'posaune': 'Trombone', 'trombone': 'Trombone', 'tuba': 'Tuba',
    'saxophon': 'Saxophone', 'saxofon': 'Saxophone', 'saxophone': 'Saxophone', 'sax': 'Saxophone',
    # percussion
    'schlagzeug': 'Percussion', 'perkussion': 'Percussion', 'percussion': 'Percussion', 'percussions': 'Percussion',
    'pauke': 'Timpani', 'pauken': 'Timpani', 'timbales': 'Timpani', 'marimba': 'Marimba',
    # voices
    'sopran': 'Soprano', 'soprano': 'Soprano', 'mezzosopran': 'Mezzo-soprano', 'mezzo-sopran': 'Mezzo-soprano',
    'mezzo-soprano': 'Mezzo-soprano', 'mezzo': 'Mezzo-soprano', 'alt': 'Alto', 'contralto': 'Contralto',
    'countertenor': 'Countertenor', 'contre-ténor': 'Countertenor', 'contreténor': 'Countertenor',
    'tenor': 'Tenor', 'ténor': 'Tenor', 'tenore': 'Tenor', 'bariton': 'Baritone', 'baryton': 'Baritone',
    'baritono': 'Baritone', 'baritone': 'Baritone', 'bassbariton': 'Bass-baritone', 'bass-bariton': 'Bass-baritone',
    'baryton-basse': 'Bass-baritone', 'bass': 'Bass', 'basse': 'Bass', 'basso': 'Bass',
    'gesang': 'Voice', 'stimme': 'Voice', 'voix': 'Voice', 'chant': 'Voice', 'vocals': 'Voice',
    # speaking
    'erzähler': 'Narrator', 'erzählerin': 'Narrator', 'sprecher': 'Narrator', 'sprecherin': 'Narrator',
    'rezitation': 'Narrator', 'lesung': 'Narrator', 'récitant': 'Narrator', 'récitante': 'Narrator',
    'narration': 'Narrator', 'narrateur': 'Narrator', 'narratrice': 'Narrator', 'moderation': 'Presenter',
    'konzertmeister': 'Concertmaster', 'konzertmeisterin': 'Concertmaster',
    # groups
    'orchester': 'Orchestra', 'orchestre': 'Orchestra', 'orchestra': 'Orchestra', 'chor': 'Choir',
    'choeur': 'Choir', 'chœur': 'Choir', 'coro': 'Choir', 'ensemble': 'Ensemble', 'kinderchor': 'Choir',
    # staging (kept for opera and ballet only)
    'inszenierung': 'Director', 'regie': 'Director', 'mise en scène': 'Director',
    'choreografie': 'Choreographer', 'choreographie': 'Choreographer', 'chorégraphie': 'Choreographer',
}
# roles of people who are not performers: dropped
OFFSTAGE = {
    'konzept', 'konzeption', 'dramaturgie', 'bühnenbild', 'bühne', 'kostüme', 'kostümbild', 'licht',
    'lichtgestaltung', 'lichtdesign', 'lichtkonzept', 'video', 'ton', 'sounddesign', 'ausstattung', 'szenarium',
    'choreinstudierung', 'einstudierung', 'komposition', 'musik', 'arrangement', 'bearbeitung', 'libretto',
    'konzeptionelle mitarbeit', 'bühnenbildmitarbeit', 'mitarbeit', 'statisten', 'statisterie', 'produktion',
    'scénographie', 'décors', 'costumes', 'lumières', 'dramaturgie', 'vidéo', 'texte', 'composition',
    'akrobat', 'akrobatin', 'artistin', 'artist', 'tanz', 'danse', 'ballett', 'juniorballett',
}
VOICES = ('Soprano', 'Mezzo-soprano', 'Alto', 'Contralto', 'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass')


def _parts(text):
    t = fold(clean(text)).strip(' ,;:.–-')
    t = re.sub(r'\s*\([^)]*\)', '', t).strip()
    return [p.strip(' .') for p in re.split(r'\s*(?:,|/|&|\+|\bund\b|\bet\b|\be\b|\band\b)\s*', t) if p.strip(' .')]


_FOLDED_WORDS = {fold(k): v for k, v in ROLE_WORDS.items()}
_FOLDED_OFF = {fold(k) for k in OFFSTAGE}


def role_en(text):
    """Role text (German/French/Italian) -> English role; '' for an off-stage role; None if
    the text is not made of role words at all (e.g. a character in an opera)."""
    raw = clean(text)
    if not raw:
        return None
    whole = fold(raw).strip(' ,;:.–-')
    if whole in _FOLDED_WORDS:
        return _FOLDED_WORDS[whole]
    if whole in _FOLDED_OFF:
        return ''
    parts = _parts(raw)
    if not parts:
        return None
    mapped, offstage = [], 0
    for p in parts:
        if p in _FOLDED_WORDS:
            mapped.append(_FOLDED_WORDS[p])
        elif p in _FOLDED_OFF or p.startswith(('dramaturg', 'kostüm', 'licht', 'bühnenbild', 'video')):
            offstage += 1
        else:
            return None
    if not mapped:
        return ''
    mapped = list(dict.fromkeys(mapped))
    if 'Director' in mapped or 'Choreographer' in mapped:
        return 'Choreographer' if 'Choreographer' in mapped else 'Director'
    if 'Conductor' in mapped and len(mapped) > 1:            # 'Violine und Leitung'
        return ' & '.join(m for m in mapped if m != 'Conductor') + ' & direction'
    return ' & '.join(mapped)


_CHOIR_RE = re.compile(r'(chor\b|chor\s|chöre|choir|chorus|choeur|\bcoro\b|vokalensemble|vocal ensemble|ensemble vocal|'
                       r'singers|sängerknaben|knabenchor|kantorei|cantorey|vocalisten|vokalisten|cantus|a cappella|maitrise|maîtrise|'
                       r'sing-?akademie|singakademie)', re.I)
_ORCH_RE = re.compile(r'(orchest|philharmon|sinfoniett|symphoniker|sinfoniker|camerata|harmonie\b|symphony|sinfonie-?orch)', re.I)
_ENS_RE = re.compile(r'(ensemble|quartett|quartet|quatuor|quartetto|\btrio\b|quintett|quintet|consort|collegium|\bduo\b|'
                     r'academy|akademie|players|solisten|solistes|sextett|septett|oktett|octuor|sextuor|septuor|brass)', re.I)


def group_role(name):
    """'Orchestra' / 'Choir' / 'Ensemble' when the name is obviously a group, else None."""
    n = clean(name)
    if re.search(r'musiker|mitglieder|members|musiciens', n, re.I):
        return 'Ensemble' if not _ORCH_RE.search(n) else 'Orchestra'
    choir = _CHOIR_RE.search(n)
    orch = _ORCH_RE.search(n)
    if choir and not re.search(r'orchest|sinfoniett|symphoniker|sinfoniker|camerata', n, re.I):
        return 'Choir'                                   # 'Philharmonischer Chor Brno' is a choir
    if orch:
        return 'Orchestra'
    if _ENS_RE.search(n):
        return 'Ensemble'
    return None


def looks_like_person(text, max_words=6):
    t = clean(text)
    if not t or len(t) > 70 or re.search(r'\d|http|www\.|@|[.!?:;]$|«|»', t):
        return False
    words = t.split()
    return 1 <= len(words) <= max_words and t[0].isupper()


# ---------------------------------------------------------------------------
# works: 'Ludwig van Beethoven (1770 – 1827)' -> 'Ludwig van Beethoven'
# ---------------------------------------------------------------------------

_LIFE_RE = re.compile(r'\s*[\(\[]\s*(?:\*|geb\.|né|née|b\.)?\s*\d{3,4}\s*(?:[-–—/]\s*\d{0,4}\s*)?[\)\]]\s*')
_MINUTES_RE = re.compile(r'\s*\(\s*(?:ca\.\s*)?\d{1,3}\s*(?:[′\'’]|min\.?|minutes?|Min\.?)\s*\)\s*$')


def strip_life_dates(text):
    """'Johannes Brahms (1833–1897)' -> 'Johannes Brahms'; '(*1956)' too."""
    return clean(_LIFE_RE.sub(' ', text or '')).strip(' ,:')


def strip_minutes(text):
    """'Symphonie Nr. 2 D-Dur op. 73 (1877) (40′)' -> 'Symphonie Nr. 2 D-Dur op. 73 (1877)'."""
    return clean(_MINUTES_RE.sub('', text or ''))


def has_life_dates(text):
    return bool(_LIFE_RE.search(text or ''))


# ---------------------------------------------------------------------------
# Switzerland: tours abroad must be dropped
# ---------------------------------------------------------------------------

SWISS_TOWNS = {fold(t): t for t in (
    'Zürich', 'Zurich', 'Basel', 'Bern', 'Luzern', 'Lucerne', 'Genève', 'Genf', 'Lausanne', 'Winterthur',
    'St. Gallen', 'St.Gallen', 'Lugano', 'Biel', 'Bienne', 'Biel/Bienne', 'Thun', 'Köniz', 'La Chaux-de-Fonds',
    'Fribourg', 'Freiburg', 'Schaffhausen', 'Chur', 'Neuchâtel', 'Vernier', 'Uster', 'Sion', 'Lancy', 'Emmen',
    'Zug', 'Yverdon-les-Bains', 'Kriens', 'Rapperswil-Jona', 'Rapperswil', 'Dübendorf', 'Dietikon', 'Montreux',
    'Frauenfeld', 'Wetzikon', 'Baar', 'Riehen', 'Meyrin', 'Wädenswil', 'Wettingen', 'Carouge', 'Renens',
    'Aarau', 'Allschwil', 'Horgen', 'Nyon', 'Bulle', 'Reinach', 'Vevey', 'Kreuzlingen', 'Wil', 'Bellinzona',
    'Locarno', 'Ascona', 'Olten', 'Solothurn', 'Baden', 'Liestal', 'Pratteln', 'Muttenz', 'Arlesheim',
    'Dornach', 'Rheinfelden', 'Brugg', 'Lenzburg', 'Zofingen', 'Langenthal', 'Burgdorf', 'Interlaken',
    'Gstaad', 'Saanen', 'Rougemont', 'Verbier', 'Martigny', 'Monthey', 'Sierre', 'Crans-Montana', 'Brig',
    'Visp', 'Zermatt', 'Davos', 'St. Moritz', 'Pontresina', 'Scuol', 'Ilanz', 'Disentis', 'Andermatt',
    'Engelberg', 'Stans', 'Sarnen', 'Schwyz', 'Einsiedeln', 'Altdorf', 'Glarus', 'Appenzell', 'Herisau',
    'Trogen', 'Teufen', 'Heiden', 'Rorschach', 'Arbon', 'Romanshorn', 'Weinfelden', 'Stein am Rhein',
    'Morges', 'Pully', 'Lutry', 'Payerne', 'Moudon', 'Romont', 'Estavayer-le-Lac', 'Murten', 'Morat',
    'Düdingen', 'Villars-sur-Glâne', 'Marly', 'Givisiez', 'Delémont', 'Porrentruy', 'Le Locle', 'Môtiers',
    'Aigle', 'Bex', 'Château-d\'Oex', 'Champéry', 'Ernen', 'Leukerbad', 'Meiringen', 'Spiez', 'Langnau',
    'Muri', 'Muri bei Bern', 'Ittigen', 'Ostermundigen', 'Gümligen', 'Thalwil', 'Küsnacht', 'Meilen', 'Stäfa',
    'Männedorf', 'Kilchberg', 'Adliswil', 'Opfikon', 'Kloten', 'Bülach', 'Regensdorf', 'Affoltern am Albis',
    'Oberengstringen', 'Schlieren', 'Zollikon', 'Uznach', 'Wattwil', 'Lichtensteig', 'Gossau', 'Flawil',
    'Uzwil', 'Hitzkirch', 'Sursee', 'Beromünster', 'Weggis', 'Vitznau', 'Brunnen', 'Küssnacht', 'Cham',
    'Steinhausen', 'Hünenberg', 'Oberägeri', 'Mendrisio', 'Chiasso', 'Riva San Vitale', 'Magadino', 'Brissago',
    'Sils', 'Samedan', 'Klosters', 'Flims', 'Laax', 'Arosa', 'Lenzerheide', 'Valbella', 'Bad Ragaz',
    'Wil SG', 'Lachen', 'Pfäffikon', 'Wohlen', 'Bremgarten', 'Mellingen', 'Laufenburg', 'Zurzach',
    'Bad Zurzach', 'Kaiserstuhl', 'Eglisau', 'Rheinau', 'Neuhausen am Rheinfall', 'Diessenhofen',
    'Sankt Gallen', 'Saint-Maurice', 'Saint-Ursanne', 'Ollon', 'Leysin', 'Villars-sur-Ollon', 'Saignelégier',
    'Tramelan', 'Saint-Imier', 'Moutier', 'La Neuveville', 'Nidau', 'Lyss', 'Aarberg', 'Münsingen',
    'Belp', 'Worb', 'Konolfingen', 'Hilterfingen', 'Oberhofen', 'Spiez', 'Frutigen', 'Adelboden',
    'Lenk', 'Zweisimmen', 'Grindelwald', 'Wengen', 'Mürren', 'Brienz', 'Ringgenberg',
)}


def swiss_town(name):
    """The town as written when ``name`` is a known Swiss town, else None."""
    f = fold(clean(name)).strip(' ,.')
    if f in SWISS_TOWNS:
        return clean(name).strip(' ,.')
    return None


# ---------------------------------------------------------------------------
# politeness helper for sites whose robots.txt asks for a Crawl-delay that
# common.get() cannot see (a Crawl-delay line before any User-agent group)
# ---------------------------------------------------------------------------

class Spacer:
    """Keeps at least ``seconds`` between the calls of ``wait()`` (in addition to common.get's
    own spacing). Used when robots.txt states a Crawl-delay outside any User-agent group."""

    def __init__(self, seconds):
        self.seconds = float(seconds)
        self.last = None

    def wait(self):
        if self.last is not None:
            left = self.seconds - (time.monotonic() - self.last)
            if left > 0:
                time.sleep(left)
        self.last = time.monotonic()
