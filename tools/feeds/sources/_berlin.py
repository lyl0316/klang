"""Shared helpers for the Berlin readers (Berliner Philharmoniker, Konzerthaus, Staatsoper,
Deutsche Oper, Komische Oper, Pierre Boulez Saal, ROC Berlin). Not a reader: modules whose
name starts with '_' are skipped by the registry.

Only facts are handled here: role names, people, venues, towns and dates. No description text.
"""
from __future__ import annotations

import re
from datetime import datetime

from common import clean, to_zurich_iso

from ._consent import Spacer, fold, group_role, looks_like_person, role_en

CITY = 'Berlin'
TZ = 'Europe/Berlin'


def berlin_iso(value):
    """A naive Berlin wall-clock time (datetime or 'YYYY-MM-DD HH:MM[:SS]' / ISO) -> aware ISO.
    A value carrying an offset is converted as it is."""
    if isinstance(value, str):
        value = value.strip().replace(' ', 'T', 1)
    return to_zurich_iso(value, assume=TZ)


def berlin_local(y, mo, d, hh, mi):
    return to_zurich_iso(datetime(int(y), int(mo), int(d), int(hh), int(mi)), assume=TZ)


MONTHS = {
    'januar': 1, 'jan': 1, 'jänner': 1, 'februar': 2, 'feb': 2, 'märz': 3, 'mär': 3, 'mrz': 3, 'maerz': 3,
    'april': 4, 'apr': 4, 'mai': 5, 'juni': 6, 'jun': 6, 'juli': 7, 'jul': 7, 'august': 8, 'aug': 8,
    'september': 9, 'sep': 9, 'sept': 9, 'oktober': 10, 'okt': 10, 'november': 11, 'nov': 11,
    'dezember': 12, 'dez': 12,
    'january': 1, 'february': 2, 'march': 3, 'may': 5, 'june': 6, 'july': 7, 'october': 10, 'oct': 10,
    'december': 12, 'dec': 12,
}


def month_number(word):
    return MONTHS.get(clean(word).lower().rstrip('.'))


# ---------------------------------------------------------------------------
# roles
# ---------------------------------------------------------------------------

_EXTRA_ROLES = {
    'musikalische leitung': 'Conductor', 'künstlerische leitung': 'Conductor', 'dirigentin': 'Conductor',
    'leitung': 'Conductor', 'chorleiter': 'Chorus master', 'chorleiterin': 'Chorus master',
    'choreinstudierung': '', 'einstudierung': '',
    'violoncello': 'Cello', 'barockvioloncello': 'Baroque cello', 'barockvioline': 'Baroque violin',
    'schlaginstrumente': 'Percussion', 'schlagwerk': 'Percussion', 'live-elektronik': 'Electronics',
    'elektronik': 'Electronics', 'klangregie': 'Sound direction', 'countertenor': 'Countertenor',
    'altus': 'Countertenor', 'knabensopran': 'Treble', 'sprecherin': 'Narrator', 'sprecher': 'Narrator',
    'erzählerin': 'Narrator', 'erzähler': 'Narrator', 'moderation': 'Presenter', 'moderatorin': 'Presenter',
    'moderator': 'Presenter', 'streichquartett': 'Ensemble', 'klaviertrio': 'Ensemble', 'quartett': 'Ensemble',
    'kammerensemble': 'Ensemble', 'bläserensemble': 'Ensemble', 'ensemble für alte musik': 'Ensemble',
    'orchester': 'Orchestra', 'chor': 'Choir', 'kinderchor': 'Choir', 'jugendchor': 'Choir',
    'kammerchor': 'Choir', 'solist': 'Soloist', 'solistin': 'Soloist', 'solisten': 'Soloist',
    'konzertmeister': 'Concertmaster', 'konzertmeisterin': 'Concertmaster', 'stimmen': 'Voice',
    'stimme': 'Voice', 'gesang': 'Voice', 'vocals': 'Vocals', 'violine und leitung': 'Violin & direction',
    'regie': 'Director', 'inszenierung': 'Director', 'choreografie': 'Choreographer',
    'choreographie': 'Choreographer', 'choreografische leitung': 'Choreographer',
    'choreographische leitung': 'Choreographer', 'komparserie': '', 'statisterie': '', 'bassklarinette': 'Bass clarinet', 'piccolo': 'Piccolo',
    'englischhorn': 'Cor anglais', 'kontrabass': 'Double bass', 'theorbe': 'Theorbo', 'laute': 'Lute',
    'blockflöte': 'Recorder', 'traversflöte': 'Baroque flute', 'naturhorn': 'Natural horn',
    'hammerflügel': 'Fortepiano', 'orgel': 'Organ', 'cembalo': 'Harpsichord', 'akkordeon': 'Accordion',
    'harfe': 'Harp', 'gitarre': 'Guitar', 'mandoline': 'Mandolin', 'viola da gamba': 'Viola da gamba',
    'zink': 'Cornett', 'posaune': 'Trombone', 'trompete': 'Trumpet', 'pauken': 'Timpani',
    'harfenist': 'Harp', 'harfenistin': 'Harp', 'pianist': 'Piano', 'pianistin': 'Piano', 'cellist': 'Cello',
    'cellistin': 'Cello', 'geiger': 'Violin', 'geigerin': 'Violin', 'bratschist': 'Viola', 'bratschistin': 'Viola',
    'organist': 'Organ', 'organistin': 'Organ', 'sopranistin': 'Soprano', 'altistin': 'Alto', 'sänger': 'Voice',
    'sängerin': 'Voice', 'flötist': 'Flute', 'flötistin': 'Flute', 'klarinettist': 'Clarinet',
    'klarinettistin': 'Clarinet', 'oboist': 'Oboe', 'oboistin': 'Oboe', 'hornist': 'Horn', 'hornistin': 'Horn',
    'trompeter': 'Trumpet', 'trompeterin': 'Trumpet', 'schlagzeuger': 'Percussion', 'schlagzeugerin': 'Percussion',
    'gitarrist': 'Guitar', 'gitarristin': 'Guitar', 'cembalist': 'Harpsichord', 'cembalistin': 'Harpsichord',
    'kontrabassist': 'Double bass', 'kontrabassistin': 'Double bass', 'fagottist': 'Bassoon',
    'fagottistin': 'Bassoon', 'akkordeonist': 'Accordion', 'akkordeonistin': 'Accordion', 'mezzosopranistin': 'Mezzo-soprano',
    'chorleitung': 'Chorus master', 'einstudierung chor': '', 'violine & leitung': 'Violin & direction',
}
_FOLDED_EXTRA = {fold(k): v for k, v in _EXTRA_ROLES.items()}
# roles of people who are not performers (dropped) - checked as substrings of the folded role
_OFFSTAGE_PARTS = ('buhne', 'kostum', 'licht', 'dramaturg', 'video', 'ausstattung', 'regieassist', 'abendspielleit',
                   'spielleitung', 'einstudierung', 'choreinstudierung', 'sounddesign', 'tondesign', 'konzept',
                   'mitarbeit', 'assistenz', 'inspizienz', 'souffl', 'maske', 'produktionsleitung', 'technik',
                   'animation', 'projektion', 'text', 'libretto', 'ubersetzung', 'ubertitel', 'fassung',
                   'arrangement', 'komposition', 'bearbeitung', 'idee', 'kurator', 'szenische einrichtung',
                   'raum', 'design', 'grafik', 'puppen', 'kampfchoreo', 'coach', 'repetitor', 'korrepetit',
                   'stucke', 'statister', 'komponist', 'kuration', 'kurator')
_INSTRUMENTISH = re.compile(r'(phon|flöte|flote|horn|tuba|geige|violin|viola|bass|harfe|klavier|orgel|trompete|'
                            r'posaune|cello|gitarre|schlagzeug|zither|hackbrett|laute|akkordeon|elektronik|keyboard|'
                            r'synthesizer|marimba|vibraphon|celesta|sopran|tenor|bariton|alt$|stimme|gesang|oud|'
                            r'kanun|duduk|kora|piano|percussion|drums|oboe|fagott|klarinette)', re.I)


def role_de(text):
    """German (or English) role text -> English role. '' for an off-stage role (drop the
    person); None when the text is not a role at all (e.g. a character in an opera)."""
    raw = re.sub(r'\s*\([^)]*\)', '', clean(text)).strip(' ,;:.–-')
    if not raw:
        return None
    f = fold(raw)
    if f in _FOLDED_EXTRA:
        return _FOLDED_EXTRA[f]
    r = role_en(raw)
    if r is not None:
        return r
    if any(p in f for p in _OFFSTAGE_PARTS):
        return ''
    # 'Theorbe, Leitung' / 'Violine und musikalische Leitung' / 'Sopran 2'
    parts = [p.strip() for p in re.split(r'\s*(?:,|/|&|\+|\bund\b)\s*', re.sub(r'\s+(?:[IVX]{1,3}|\d)\.?$', '', raw))
             if p.strip()]
    mapped = []
    for p in parts:
        fp = fold(p)
        m = _FOLDED_EXTRA.get(fp)
        if m is None:
            m = role_en(p)
        if m is None and re.search(r'leitung$', fp) and not re.search(r'choreo|spiel|abend|produktion|technisch|'
                                                                     r'kunstler|organisation|projekt|chor', fp):
            m = 'Conductor'
        if m is None:
            return None
        if m:
            mapped.append(m)
    if not mapped:
        return ''
    mapped = list(dict.fromkeys(mapped))
    if 'Conductor' in mapped and len(mapped) > 1:
        return ' & '.join(m for m in mapped if m != 'Conductor') + ' & direction'
    return ' & '.join(mapped)


_KAPELLE_RE = re.compile(r'(?i)(?:staats|hof|kur)kapelle|\bkapelle\b|capella|cappella|ensemble modern|'
                         r'akademie für alte musik|lautten compagney|kammerakademie|concerto köln|\bbrass\b')


def group_of(name):
    """'Orchestra' / 'Choir' / 'Ensemble' for a group's name, else None (adds Berlin's
    'Staatskapelle' etc. to _consent.group_role)."""
    g = group_role(name)
    if g:
        return g
    n = clean(name)
    if re.search(r'(?i)(?:staats|hof)kapelle', n):
        return 'Orchestra'
    if _KAPELLE_RE.search(n):
        return 'Ensemble'
    return None


_PLACEHOLDER_RE = re.compile(r'(?i)^(?:n\.?\s*n\.?|tba|t\.b\.a\.|tbd|noch offen|wird bekannt gegeben|u\.\s*a\.)$')


def credit(role_text, name, *, opera=False):
    """(role, name) for one performer, or None (off-stage people, placeholders).
    In an opera an unknown role is the character the singer sings (kept as the role)."""
    name = clean(name).strip(' ,;:')
    if not name or _PLACEHOLDER_RE.match(name) or len(name) > 120:
        return None
    rt = clean(role_text).strip(' ,;:')
    if not rt:
        return (group_of(name) or 'Performer', name)
    r = role_de(rt)
    if r == '':
        return None
    if r in ('Director', 'Choreographer'):
        return (r, name) if opera else None
    if r is None:
        if opera and len(rt) <= 60:
            return (rt, name)                       # a character: 'Tosca', 'Cavaradossi'
        if _INSTRUMENTISH.search(fold(rt)) and len(rt) <= 40:
            return (rt[:1].upper() + rt[1:], name)  # an instrument the table does not know
        return (group_of(name) or 'Performer', name)
    if r in ('Orchestra', 'Choir', 'Ensemble'):
        return (group_of(name) or r, name)
    return (r, name)


# ---------------------------------------------------------------------------
# venues and towns
# ---------------------------------------------------------------------------

# hall names -> Klang's venueName (house first, then the hall), checked on the folded text
_VENUES = (
    (r'kammermusiksaal', 'Philharmonie Berlin, Kammermusiksaal'),
    (r'philharmonie.*gross|gross.*philharmonie', 'Philharmonie Berlin, Großer Saal'),
    (r'^philharmonie( berlin)?$|^berliner philharmonie$', 'Philharmonie Berlin'),
    (r'konzerthaus.*werner-otto|^werner-otto-saal$', 'Konzerthaus Berlin, Werner-Otto-Saal'),
    (r'konzerthaus.*kleiner saal', 'Konzerthaus Berlin, Kleiner Saal'),
    (r'konzerthaus.*grosser saal', 'Konzerthaus Berlin, Großer Saal'),
    (r'konzerthaus.*musikclub', 'Konzerthaus Berlin, Musikclub'),
    (r'^konzerthaus( berlin)?$', 'Konzerthaus Berlin'),
    (r'haus des rundfunks.*(grosser )?sendesaal|^grosser sendesaal', 'Haus des Rundfunks, Großer Sendesaal'),
    (r'^haus des rundfunks$', 'Haus des Rundfunks'),
    (r'pierre boulez saal.*mozart', 'Pierre Boulez Saal, Mozart Auditorium'),
    (r'pierre boulez saal.*foyer', 'Pierre Boulez Saal, Foyer'),
    (r'^pierre boulez saal$', 'Pierre Boulez Saal'),
    (r'staatsoper unter den linden.*apollo|^apollosaal', 'Staatsoper Unter den Linden, Apollosaal'),
    (r'staatsoper unter den linden.*(alter orchesterprobensaal|probensaal)', 'Staatsoper Unter den Linden, Alter Orchesterprobensaal'),
    (r'^staatsoper( unter den linden)?$', 'Staatsoper Unter den Linden'),
    (r'^deutsche oper berlin$|deutsche oper.*grosses haus', 'Deutsche Oper Berlin'),
    (r'deutsche oper.*tischlerei', 'Deutsche Oper Berlin, Tischlerei'),
    (r'deutsche oper.*foyer', 'Deutsche Oper Berlin, Foyer'),
    (r'schillertheater', None),                     # keep the Komische Oper's wording
)


def venue_name(text):
    """Klang's venueName for a Berlin hall as a site names it; unknown halls stay as written."""
    t = clean(text).strip(' ,')
    f = re.sub(r'\s+', ' ', fold(t).replace('ß', 'ss').replace(' - ', ' ').replace(' – ', ' ').replace(',', ' '))
    for rx, name in _VENUES:
        if re.search(rx, f):
            return name or t
    return t


# German towns (as written in German) -> the usual English name; anything else German keeps its name
_GERMAN_TOWNS = {
    'berlin': 'Berlin', 'potsdam': 'Potsdam', 'münchen': 'Munich', 'muenchen': 'Munich', 'köln': 'Cologne',
    'koeln': 'Cologne', 'hamburg': 'Hamburg', 'frankfurt': 'Frankfurt', 'frankfurt am main': 'Frankfurt',
    'frankfurt/main': 'Frankfurt', 'dresden': 'Dresden', 'leipzig': 'Leipzig', 'stuttgart': 'Stuttgart',
    'düsseldorf': 'Düsseldorf', 'duesseldorf': 'Düsseldorf', 'baden-baden': 'Baden-Baden', 'bonn': 'Bonn',
    'hannover': 'Hanover', 'nürnberg': 'Nuremberg', 'nuernberg': 'Nuremberg', 'essen': 'Essen',
    'dortmund': 'Dortmund', 'bremen': 'Bremen', 'wiesbaden': 'Wiesbaden', 'mainz': 'Mainz',
    'freiburg': 'Freiburg', 'heidelberg': 'Heidelberg', 'braunschweig': 'Brunswick', 'magdeburg': 'Magdeburg',
    'weimar': 'Weimar', 'erfurt': 'Erfurt', 'halle': 'Halle', 'chemnitz': 'Chemnitz', 'rostock': 'Rostock',
    'kiel': 'Kiel', 'lübeck': 'Lübeck', 'luebeck': 'Lübeck', 'schwerin': 'Schwerin', 'cottbus': 'Cottbus',
    'frankfurt (oder)': 'Frankfurt (Oder)', 'brandenburg': 'Brandenburg an der Havel',
    'brandenburg an der havel': 'Brandenburg an der Havel', 'neuruppin': 'Neuruppin', 'chorin': 'Chorin',
    'rheinsberg': 'Rheinsberg', 'bad saarow': 'Bad Saarow', 'eberswalde': 'Eberswalde', 'wittenberg': 'Wittenberg',
    'lutherstadt wittenberg': 'Wittenberg', 'dessau': 'Dessau', 'bayreuth': 'Bayreuth', 'augsburg': 'Augsburg',
    'regensburg': 'Regensburg', 'würzburg': 'Würzburg', 'karlsruhe': 'Karlsruhe', 'mannheim': 'Mannheim',
    'aachen': 'Aachen', 'münster': 'Münster', 'bochum': 'Bochum', 'wuppertal': 'Wuppertal', 'kassel': 'Kassel',
    'göttingen': 'Göttingen', 'ludwigsburg': 'Ludwigsburg', 'schwetzingen': 'Schwetzingen',
    'bad kissingen': 'Bad Kissingen', 'ingolstadt': 'Ingolstadt', 'gera': 'Gera', 'jena': 'Jena',
    'greifswald': 'Greifswald', 'stralsund': 'Stralsund', 'neubrandenburg': 'Neubrandenburg',
    'heringsdorf': 'Heringsdorf', 'peenemünde': 'Peenemünde', 'görlitz': 'Görlitz', 'bautzen': 'Bautzen',
    'meißen': 'Meissen', 'oldenburg': 'Oldenburg', 'osnabrück': 'Osnabrück', 'bielefeld': 'Bielefeld',
    'gütersloh': 'Gütersloh', 'paderborn': 'Paderborn', 'hamm': 'Hamm', 'recklinghausen': 'Recklinghausen',
    'gelsenkirchen': 'Gelsenkirchen', 'duisburg': 'Duisburg', 'kleve': 'Kleve', 'koblenz': 'Koblenz',
    'trier': 'Trier', 'saarbrücken': 'Saarbrücken', 'ulm': 'Ulm', 'friedrichshafen': 'Friedrichshafen',
    'konstanz': 'Konstanz', 'garmisch-partenkirchen': 'Garmisch-Partenkirchen', 'passau': 'Passau',
    'kloster eberbach': 'Eltville', 'eltville': 'Eltville', 'rheingau': 'Rheingau', 'hitzacker': 'Hitzacker',
    'lüneburg': 'Lüneburg', 'celle': 'Celle', 'wolfsburg': 'Wolfsburg', 'hildesheim': 'Hildesheim',
    'gohrde': 'Göhrde', 'neuhardenberg': 'Neuhardenberg', 'kremmen': 'Kremmen', 'zossen': 'Zossen',
    'falkensee': 'Falkensee', 'oranienburg': 'Oranienburg', 'kleinmachnow': 'Kleinmachnow',
    'bernau': 'Bernau bei Berlin', 'fürstenwalde': 'Fürstenwalde', 'luckenwalde': 'Luckenwalde',
    'mittenwalde': 'Mittenwalde', 'werder': 'Werder (Havel)', 'stahnsdorf': 'Stahnsdorf', 'teltow': 'Teltow',
}
# other countries: a performance there is skipped
_ABROAD_RE = re.compile(
    r'\b(?:wien|wiener|vienna|salzburg|salzburger|murcia|sevilla|seville|castellón|castellon|valencia|bilbao|bari|neapel|palermo|catania|genf|lugano|zürcher|madrid|graz|linz|innsbruck|bregenz|grafenegg|luzern|lucerne|zürich|zurich|basel|bern|genf|'
    r'geneva|gstaad|verbier|paris|lyon|aix-en-provence|strasbourg|straßburg|toulouse|bordeaux|lille|marseille|'
    r'mailand|milano|milan|rom|roma|rome|neapel|napoli|turin|torino|genua|verona|venedig|venezia|florenz|firenze|'
    r'bologna|parma|london|edinburgh|amsterdam|brüssel|brussels|bruxelles|antwerpen|luxemburg|luxembourg|madrid|'
    r'barcelona|lissabon|lisbon|prag|praha|prague|warschau|warsaw|krakau|kraków|breslau|wrocław|danzig|gdańsk|'
    r'stettin|szczecin|posen|poznań|budapest|bratislava|ljubljana|zagreb|kopenhagen|copenhagen|stockholm|oslo|'
    r'helsinki|tallinn|riga|vilnius|athen|athens|istanbul|tel aviv|jerusalem|new york|carnegie|chicago|boston|'
    r'washington|los angeles|san francisco|toronto|montreal|tokyo|tokio|osaka|seoul|peking|beijing|shanghai|'
    r'hongkong|hong kong|taipei|singapur|singapore|sydney|melbourne|abu dhabi|dubai|doha|muscat|bukarest|sofia|'
    r'belgrad|kyiv|kiew|odessa|lemberg|lwiw|monte carlo|monaco|dublin|glasgow|manchester|birmingham|bergen|'
    r'göteborg|malmö|aarhus|rotterdam|den haag|utrecht|eindhoven|gent|brügge|luzern|lugano|ascona|andermatt|'
    r'österreich|austria|schweiz|switzerland|frankreich|france|italien|italy|spanien|spain|polen|poland|'
    r'tschechien|czech|ungarn|hungary|niederlande|netherlands|belgien|belgium|dänemark|denmark|schweden|sweden|'
    r'norwegen|norway|finnland|finland|grossbritannien|großbritannien|england|uk\b|usa\b|japan|china|korea|'
    r'taiwan|australien|australia|tournee|tour\b|gastspielreise|festivaltournee|asienreise|asientournee)\b', re.I)


def abroad(text):
    """True when a place/title points to a performance outside Germany."""
    return bool(_ABROAD_RE.search(clean(text)))


def german_town(text):
    """The English name of a German town named in ``text`` (as a whole word), or None."""
    f = clean(text).lower()
    best = None
    for de, en in _GERMAN_TOWNS.items():
        if re.search(rf'(?<![\w-]){re.escape(de)}(?![\w-])', f):
            if best is None or len(de) > len(best[0]):
                best = (de, en)
    return best[1] if best else None


# ---------------------------------------------------------------------------
# what to skip (titles, categories)
# ---------------------------------------------------------------------------

SKIP_RE = re.compile(
    r'(?:^|[^a-zäöüß]|vor-|nach\(t\)|nacht|haus|bühnen|theater|familien-?|kinder|kostüm|sonder|spezial)f(?:ü|u|ue)hrung|guided tour|backstage|workshop|werkstatt(?!konzert)|schulkonzert|schulvorstellung|'
    r'schüler|schueler|für schulen|kinderkonzert|kinder-?konzert|familienkonzert|familien-?|für kinder|fuer kinder|'
    r'kinderoper|babykonzert|krabbel|elternzeitkonzert|mini-?konzert|kita|einführung|einfuehrung|werkeinführung|'
    r'gespräch|gespraech|podium|talk\b|lesung|vortrag|symposium|konferenz|ausstellung|exhibition|kino\b|film\b|'
    r'filmpremiere|offene probe|probenbesuch|öffentliche probe|open rehearsal|generalprobe|matinee zur|'
    r'premierenmatinee|einblick|soiree zur|preview|nachgespräch|tag der offenen|sommerfest|party|disco|'
    r'\bball\b|silvesterparty|yoga|meditation|tanzkurs|mitsingen|singalong|sing-along|stammtisch|empfang|'
    r'gottesdienst|tanzworkshop|live-übertragung|liveübertragung|übertragung|public viewing|für alle - live|ballettschule|artistikschule|tanzakademie|probe\b|sitzkissen|(?<![a-zäöüß])kinder\b|für familien|für die ganze familie|famil', re.I)

POP_RE = re.compile(r'\b(jazz|pop|rock|hip-?hop|rap|techno|electro|elektro|dj\b|comedy|kabarett|musical|chanson|'
                    r'schlager|blues|soul|funk|reggae|tango argentino|boogie|swing|big ?band|gospel|singer-?songwriter|'
                    r'filmmusik|film music|game music|videospiel|anime|tribute|world music|weltmusik|flamenco|'
                    r'klezmer|fado|crossover|lounge)\b', re.I)


# words that say an evening is a classical concert (for listings that give no programme)
CLASSICAL_RE = re.compile(r'orchest|sinfoni|symphon|philharmon|kammerorchester|quartett|quartet|trio\b|quintett|'
                          r'\bchor\b|chöre|choir|kantorei|sängerknaben|oratori|kantate|messe\b|requiem|passion|'
                          r'magnificat|klavierabend|rezital|recital|liederabend|kammermusik|lunchkonzert|sonate|'
                          r'bach|mozart|beethoven|brahms|schubert|händel|haydn|vivaldi|tschaikowsk|mahler|bruckner|'
                          r'barock|orgel|cembalo|violin|ensemble|hochschule|akademie|konzertchor|singakademie|'
                          r'kammerchor|weihnachtsoratorium|neujahrskonzert|festkonzert|sinfoniekonzert', re.I)


def skip_title(text):
    return bool(SKIP_RE.search(clean(text)))


def is_pop(text):
    return bool(POP_RE.search(clean(text)))


# ---------------------------------------------------------------------------
# works
# ---------------------------------------------------------------------------

_INTERVAL_RE = re.compile(r'^\W*(?:\*+|pause|-+\s*pause\s*-+|konzertpause)\W*$', re.I)


def is_interval(text):
    return bool(_INTERVAL_RE.match(clean(text)))


__all__ = ['CITY', 'TZ', 'berlin_iso', 'berlin_local', 'MONTHS', 'month_number', 'role_de', 'credit',
           'venue_name', 'abroad', 'german_town', 'skip_title', 'is_pop', 'is_interval', 'fold', 'group_role', 'group_of',
           'looks_like_person', 'SKIP_RE', 'POP_RE', 'Spacer', 'CLASSICAL_RE']
