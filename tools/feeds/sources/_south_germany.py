"""Shared helpers for the Munich and Stuttgart readers (Münchner Philharmoniker, Münchener
Kammerorchester, Gärtnerplatztheater, Staatsoper Stuttgart, Stuttgarter Philharmoniker).

Not a reader itself: the registry skips modules whose name starts with '_'.
Only *facts* come out of here (towns, roles, people, start times); no description text.

Note for build.py --fresh-hours: a reader's codeHash covers only its own file and
common.py, so an edit here does not by itself invalidate yesterday's reused events.
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta

from common import clean, to_zurich_iso, today_zurich

from ._consent import fold, group_role, role_en

TZ = 'Europe/Berlin'
WINDOW_DAYS = 450


def local_iso(day, hh, mm):
    """German local date + time -> aware ISO string (Swiss offset, the feed's convention)."""
    return to_zurich_iso(datetime(day.year, day.month, day.day, int(hh), int(mm)), assume=TZ)


def in_window(day):
    """True for today .. today + 450 days (``day`` a date)."""
    today = today_zurich()
    return today <= day <= today + timedelta(days=WINDOW_DAYS)


# ---------------------------------------------------------------------------
# towns: German towns -> the English name Klang uses; anything abroad is skipped
# ---------------------------------------------------------------------------

_GERMAN = {
    'münchen': 'Munich', 'munich': 'Munich', 'stuttgart': 'Stuttgart', 'berlin': 'Berlin',
    'hamburg': 'Hamburg', 'frankfurt am main': 'Frankfurt', 'frankfurt': 'Frankfurt', 'köln': 'Cologne',
    'koeln': 'Cologne', 'cologne': 'Cologne', 'dresden': 'Dresden', 'leipzig': 'Leipzig',
    'düsseldorf': 'Düsseldorf', 'nürnberg': 'Nuremberg', 'nuremberg': 'Nuremberg', 'dortmund': 'Dortmund',
    'bochum': 'Bochum', 'bonn': 'Bonn', 'hannover': 'Hanover', 'bremen': 'Bremen',
    'baden-baden': 'Baden-Baden', 'ottobeuren': 'Ottobeuren', 'weingarten': 'Weingarten', 'erlangen': 'Erlangen',
    'bayreuth': 'Bayreuth', 'ravensburg': 'Ravensburg', 'weiden': 'Weiden', 'aschaffenburg': 'Aschaffenburg',
    'kempten': 'Kempten', 'ulm': 'Ulm', 'neu-ulm': 'Neu-Ulm', 'heidenheim': 'Heidenheim',
    'ludwigsburg': 'Ludwigsburg', 'villingen-schwenningen': 'Villingen-Schwenningen',
    'garmisch-partenkirchen': 'Garmisch-Partenkirchen', 'fürth': 'Fürth', 'waiblingen': 'Waiblingen',
    'trossingen': 'Trossingen', 'schwäbisch hall': 'Schwäbisch Hall', 'schwäbisch gmünd': 'Schwäbisch Gmünd',
    'neustadt an der weinstraße': 'Neustadt an der Weinstraße', 'bietigheim-bissingen': 'Bietigheim-Bissingen',
    'bietigheim': 'Bietigheim-Bissingen', 'bad vilbel': 'Bad Vilbel', 'backnang': 'Backnang', 'amberg': 'Amberg',
    'augsburg': 'Augsburg', 'regensburg': 'Regensburg', 'ingolstadt': 'Ingolstadt', 'würzburg': 'Würzburg',
    'bamberg': 'Bamberg', 'passau': 'Passau', 'landshut': 'Landshut', 'rosenheim': 'Rosenheim',
    'freising': 'Freising', 'dachau': 'Dachau', 'fürstenfeldbruck': 'Fürstenfeldbruck', 'starnberg': 'Starnberg',
    'tegernsee': 'Tegernsee', 'kloster benediktbeuern': 'Benediktbeuern', 'benediktbeuern': 'Benediktbeuern',
    'herrenchiemsee': 'Herrenchiemsee', 'füssen': 'Füssen', 'lindau': 'Lindau', 'friedrichshafen': 'Friedrichshafen',
    'konstanz': 'Konstanz', 'freiburg im breisgau': 'Freiburg', 'karlsruhe': 'Karlsruhe', 'mannheim': 'Mannheim',
    'heidelberg': 'Heidelberg', 'heilbronn': 'Heilbronn', 'esslingen': 'Esslingen', 'esslingen am neckar': 'Esslingen',
    'reutlingen': 'Reutlingen', 'tübingen': 'Tübingen', 'sindelfingen': 'Sindelfingen', 'böblingen': 'Böblingen',
    'leonberg': 'Leonberg', 'fellbach': 'Fellbach', 'kornwestheim': 'Kornwestheim', 'göppingen': 'Göppingen',
    'aalen': 'Aalen', 'pforzheim': 'Pforzheim', 'geislingen an der steige': 'Geislingen an der Steige',
    'schorndorf': 'Schorndorf', 'nürtingen': 'Nürtingen', 'biberach': 'Biberach', 'wiesbaden': 'Wiesbaden',
    'mainz': 'Mainz', 'darmstadt': 'Darmstadt', 'kassel': 'Kassel', 'saarbrücken': 'Saarbrücken',
    'weimar': 'Weimar', 'erfurt': 'Erfurt', 'chemnitz': 'Chemnitz', 'kiel': 'Kiel',
    'lübeck': 'Lübeck', 'münster': 'Münster', 'wuppertal': 'Wuppertal', 'duisburg': 'Duisburg',
    'gütersloh': 'Gütersloh', 'bielefeld': 'Bielefeld', 'braunschweig': 'Brunswick', 'wolfsburg': 'Wolfsburg',
    'kaiserslautern': 'Kaiserslautern', 'ludwigshafen': 'Ludwigshafen', 'coburg': 'Coburg',
    'schweinfurt': 'Schweinfurt', 'memmingen': 'Memmingen', 'kaufbeuren': 'Kaufbeuren',
    'neuburg an der donau': 'Neuburg an der Donau',
    'eichstätt': 'Eichstätt', 'straubing': 'Straubing', 'deggendorf': 'Deggendorf', 'traunstein': 'Traunstein',
    'bad reichenhall': 'Bad Reichenhall', 'bad kissingen': 'Bad Kissingen', 'bad tölz': 'Bad Tölz',
    'murnau': 'Murnau', 'mittenwald': 'Mittenwald', 'oberstdorf': 'Oberstdorf', 'wildbad kreuth': 'Kreuth',
    'gauting': 'Gauting', 'grünwald': 'Grünwald', 'unterföhring': 'Unterföhring', 'germering': 'Germering',
    'pullach': 'Pullach', 'grassau': 'Grassau', 'grünwald': 'Grünwald', 'günwald': 'Grünwald',
    'ismaning': 'Ismaning', 'garching': 'Garching', 'ottobrunn': 'Ottobrunn',
    'neubiberg': 'Neubiberg', 'unterhaching': 'Unterhaching', 'puchheim': 'Puchheim',
}
# names of places outside Germany as German sites write them (tours are left out)
_FOREIGN = (
    'wien', 'vienna', 'salzburg', 'erl', 'kufstein', 'bregenzer festspiele', 'st. pölten', 'graz', 'linz',
    'innsbruck', 'bregenz', 'grafenegg', 'österreich', 'austria',
    'zürich', 'zurich', 'luzern', 'lucerne', 'basel', 'bern', 'genf', 'genève', 'geneva', 'lausanne', 'olten',
    'st. gallen', 'gstaad', 'schweiz', 'switzerland', 'paris', 'aix-en-provence', 'la rochelle', 'lyon', 'strasbourg',
    'straßburg', 'frankreich', 'france', 'mailand', 'milano', 'milan', 'rom', 'roma', 'modena', 'genua', 'genova',
    'venedig', 'verona', 'turin', 'torino', 'italien', 'italy', 'amsterdam', 'rotterdam', 'den haag', 'utrecht',
    'brüssel', 'bruxelles', 'brussels', 'antwerpen', 'luxemburg', 'luxembourg', 'london', 'edinburgh', 'sheffield',
    'manchester', 'norwich', 'birmingham', 'glasgow', 'dublin', 'barcelona', 'madrid', 'lissabon', 'lisbon',
    'prag', 'praha', 'prague', 'budapest', 'warschau', 'warsaw', 'krakau', 'kopenhagen', 'stockholm', 'oslo',
    'helsinki', 'tokio', 'tokyo', 'osaka', 'seoul', 'peking', 'beijing', 'shanghai', 'taipeh', 'new york',
    'carnegie hall', 'miami', 'orlando', 'naples', 'west palm beach', 'chicago', 'boston', 'los angeles',
    'washington', 'usa', 'japan', 'china', 'korea', 'concertgebouw', 'musikverein', 'muziekgebouw', 'de doelen',
    'bozar', 'palais des beaux-arts', 'philharmonie de paris', 'scala', 'palau de la música', 'auditorio nacional',
    'kravis', 'arsht', 'dr. phillips',
)
_FOREIGN_RE = re.compile(r'(?<![\w-])(?:' + '|'.join(re.escape(fold(w)) for w in _FOREIGN)
                         + r')(?![\w-])')
_GERMAN_RE = re.compile(r'(?<![\w-])(' + '|'.join(re.escape(fold(w)) for w in sorted(_GERMAN, key=len, reverse=True))
                        + r')(?![\w-])')
_GERMAN_FOLDED = {fold(k): v for k, v in _GERMAN.items()}
# halls whose town is not in their name
_HALLS = (
    (r'elbphilharmonie|laeiszhalle', 'Hamburg'),
    (r'alte oper', 'Frankfurt'),
    (r'festspielhaus baden', 'Baden-Baden'),
    (r'konzerthaus dortmund', 'Dortmund'),
    (r'basilika ottobeuren', 'Ottobeuren'),
    (r'liederhalle|gustav-siegle-haus|theaterhaus stuttgart|staatsgalerie stuttgart', 'Stuttgart'),
    (r'heinrich-lades-halle', 'Erlangen'),
    (r'friedrichsforum', 'Bayreuth'),
    (r'max-reger-halle', 'Weiden'),
    (r'kultur- und kongresszentrum weingarten', 'Weingarten'),
    (r'isarphilharmonie|gasteig|prinzregententheater|herkulessaal|cuvillies|allerheiligen.?hofkirche|'
     r'pinakothek der moderne|odeonsplatz|munchner kunstlerhaus|munchner volkstheater|schwere reiter|'
     r'rote sonne|sudetendeutsches haus|muffathalle|gartnerplatztheater', 'Munich'),
)


def town(*texts):
    """The English town name for the first place named in ``texts``: 'Munich', 'Hamburg' …;
    'abroad' when the place is outside Germany; None when no known place is named."""
    for text in texts:
        t = fold(clean(text))
        if not t:
            continue
        for pattern, city in _HALLS:
            if re.search(pattern, t):
                return city
        g = _GERMAN_RE.search(t)
        f = _FOREIGN_RE.search(t)
        if f and (not g or f.start() < g.start()):
            return 'abroad'
        if g:
            return _GERMAN_FOLDED.get(g.group(1), g.group(1).title())
    return None


# ---------------------------------------------------------------------------
# roles: German role words -> English (on top of _consent.role_en)
# ---------------------------------------------------------------------------

_EXTRA_ROLES = {
    'dirigentin': 'Conductor', 'dirigat': 'Conductor', 'pianist': 'Piano', 'pianistin': 'Piano',
    'klavier und leitung': 'Piano & direction', 'dirigent und klavier': 'Piano & direction',
    'dirigent und pianist': 'Piano & direction', 'leitung und klavier': 'Piano & direction',
    'leitung und konzertmeister': 'Violin & direction', 'leitung und violine': 'Violin & direction',
    'violine und leitung': 'Violin & direction', 'konzertmeister und leitung': 'Violin & direction',
    'moderator': 'Presenter', 'moderatorin': 'Presenter', 'moderation': 'Presenter',
    'sprecherin': 'Narrator', 'sprecher': 'Narrator', 'erzähler': 'Narrator', 'erzählerin': 'Narrator',
    'mandoline': 'Mandolin', 'chor': 'Choir', 'chorleitung': 'Chorus master', 'choreinstudierung': '',
    'chordirektor': 'Chorus master', 'mezzosopranistin': 'Mezzo-soprano', 'sopranistin': 'Soprano',
    'altistin': 'Alto', 'tenor': 'Tenor', 'bariton': 'Baritone', 'bassbariton': 'Bass-baritone',
    'bassist': 'Bass', 'gitarrist': 'Guitar', 'organist': 'Organ', 'organistin': 'Organ',
    'schlagwerk': 'Percussion', 'percussion': 'Percussion', 'sandbilder': '', 'sandmalerei': '',
    'regie': 'Director', 'inszenierung': 'Director', 'choreographie': 'Choreographer',
    'choreografie': 'Choreographer', 'musikalische leitung': 'Conductor', 'musikalische einstudierung': '',
    'mitarbeit regie': '', 'regiemitarbeit': '', 'szenische einstudierung': '', 'bühne & kostüme': '',
    'bühne und kostüme': '', 'kostüme': '', 'bühne': '', 'licht': '', 'dramaturgie': '', 'video': '',
    'konzept': '', 'komposition': '', 'libretto': '', 'text': '', 'ausstattung': '', 'kinderchor': 'Choir',
    'continuo': 'Continuo', 'cembalo': 'Harpsichord', 'blockflöte': 'Recorder', 'akkordeon': 'Accordion',
    'harfe': 'Harp', 'trompete': 'Trumpet', 'posaune': 'Trombone', 'violoncello': 'Cello', 'kontrabass': 'Double bass',
    'saxophon': 'Saxophone', 'klarinette': 'Clarinet', 'oboe': 'Oboe', 'fagott': 'Bassoon', 'horn': 'Horn',
    'flöte': 'Flute', 'viola': 'Viola', 'violine': 'Violin', 'klavier': 'Piano', 'gesang': 'Voice',
    'mit': 'Performer', 'solist': 'Performer', 'solistin': 'Performer', 'solisten': 'Performer',
    'staging': 'Director', 'konzeption und staging': 'Director', 'konzept und staging': 'Director',
    'regie nach': '', 'staging und szenische mitarbeit': '', 'szenische leitung': 'Director',
    'szenische einrichtung': 'Director', 'chorleiter': 'Chorus master', 'chorleiterin': 'Chorus master',
}
_EXTRA_FOLDED = {fold(k): v for k, v in _EXTRA_ROLES.items()}
_STAGING_OFF = re.compile(r'(?i)^(?:mitarbeit|assistenz|regieassistenz|abendspielleitung|spielleitung|inspizienz|'
                          r'souffl|bühnenbild|kostüm|licht|video|dramaturg|ton\b|sounddesign|maske|requisite|'
                          r'produktionsleitung|künstlerische produktionsleitung|einstudierung|szenische einstudierung|'
                          r'mitarbeit|co-regie|ko-regie|bühne\b|ausstattung|choreografische mitarbeit|kampf|'
                          r'intimitäts|statisterie|live-elektronik|klangregie|puppen|figurenbau|maskenbild|perücken|projektion|'
                          r'co-bühnen|bühnenbildner|sound|animation|live-zeichnung|zeichnung|szene$|visuals|kamera)')
PLACEHOLDER_RE = re.compile(r'(?i)^(?:n\.?\s*n\.?|tba|t\.b\.a\.|tbd|noch offen|wird bekannt gegeben|n\.n\.)$')


def role(text, *, characters=False):
    """German role text -> English role; '' for an off-stage role (drop it); None when the
    text is no role word at all (in an opera: a character name; the caller decides)."""
    raw = re.sub(r'(?i)^solo-\s*', '', clean(text).strip(' ,;:'))     # 'Solo-Viola'
    if not raw:
        return None
    f = fold(raw)
    if f in _EXTRA_FOLDED:
        return _EXTRA_FOLDED[f]
    if _STAGING_OFF.match(raw):
        return ''
    if re.match(r'(?i)^(?:regie|inszenierung)\b(?!assist|mitarbeit)', raw):   # 'Regie und Mitarbeit Puppendesign'
        return 'Director'
    r = role_en(raw)
    if r is not None:
        return r
    first = fold(raw.split()[0]).strip(' ,;:')            # 'Dirigent Montalbetti', 'Klavier (Gast)'
    if first in ('dirigent', 'dirigentin', 'leitung'):
        return 'Conductor'
    return None


def dedupe_credits(credits):
    """Keep the first credit of each name ('Lonquich, Leitung und Klavier' + 'Lonquich, Leitung')."""
    seen, out = set(), []
    for r, n in credits:
        k = name_key(n)
        if k and k not in seen:
            seen.add(k)
            out.append((r, n))
    return out


def credit(name, role_text='', *, opera=False):
    """(role, name) for a performer, None for off-stage people or placeholders.
    In an opera a character name stays the role ('Lucia'); elsewhere an unknown role word
    becomes 'Performer'."""
    n = clean(name).strip(' ,;:')
    if not n or PLACEHOLDER_RE.match(n):
        return None
    if not clean(role_text):
        return (group_role(n) or 'Performer', n)
    r = role(role_text)
    if r == '':
        return None
    if r is None:
        rt = clean(role_text).strip(' ,;:')
        if opera and len(rt) <= 100:
            return (rt, n)
        return (group_role(n) or 'Performer', n)
    if r == 'Performer' and group_role(n):
        r = group_role(n)
    if opera and r in ('Narrator', 'Presenter') and fold(role_text).strip() in ('sprecher', 'sprecherin', 'erzähler'):
        return (clean(role_text).strip(' ,;:'), n)              # 'Sprecher' is a part in Die Zauberflöte
    return (r, n)


# ---------------------------------------------------------------------------
# what to skip (children's, school, talks, tours of the house …)
# ---------------------------------------------------------------------------

SKIP_RE = re.compile(
    r'(?i)kinderkonzert|kindergartenkonzert|kitakonzert|kita-konzert|familienkonzert|familienvorstellung|'
    r'schulkonzert|schulvorstellung|für schulklassen|jugendkonzert|krabbel|babykonzert|mini-?konzert|'
    r'konzert für junges publikum|für junges publikum|frag die profis|kinderoper|für kinder|'
    r'führung|theaterführung|einblicke|workshop|einführungsmatinee|einführung|werkstattgespräch|'
    r'künstlergespräch|gesprächskonzert für schulen|probenbesuch|offene probe|öffentliche probe|'
    r'öffentliche generalprobe|generalprobe|kostümverkauf|libretti lesen|lesung|podcast|hip-?hop|'
    r'pop-gala|opernball|sing-?along|mitsingen|offenes singen|tanz-workshop|tanzabend|milonga|'
    r'premierenfieber|spielzeitpräsentation|gala-rahmenprogramm|opernlab|stammtisch|preview|'
    r'comedian harmonists|mnozil brass|tee&techno|tee & techno')


def skip_title(*texts):
    """True when the title or labels say it is not a concert for Klang."""
    return any(SKIP_RE.search(clean(t)) for t in texts if t)


GERMAN_MONTHS = {
    'jan': 1, 'januar': 1, 'jänner': 1, 'feb': 2, 'februar': 2, 'mär': 3, 'märz': 3, 'mrz': 3, 'apr': 4,
    'april': 4, 'mai': 5, 'jun': 6, 'juni': 6, 'jul': 7, 'juli': 7, 'aug': 8, 'august': 8, 'sep': 9,
    'sept': 9, 'september': 9, 'okt': 10, 'oktober': 10, 'nov': 11, 'november': 11, 'dez': 12, 'dezember': 12,
}


def season_year(month, *, today=None):
    """The year of a day given without a year in a season listing (Aug .. Jul): from August on
    it is the current season's first year, before August the next year's."""
    t = today or today_zurich()
    first = t.year if t.month >= 8 else t.year - 1
    return first if month >= 8 else first + 1


def name_key(text):
    """'Igor Strawinsky' -> 'igor strawinsky' (for comparing names)."""
    return re.sub(r'[^a-z0-9]+', ' ', fold(clean(text))).strip()


def parse_day(text):
    """'29.10.2026' / '29.10.26' -> date or None."""
    m = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{2,4})', text or '')
    if not m:
        return None
    y = int(m.group(3))
    y = y + 2000 if y < 100 else y
    try:
        return date(y, int(m.group(2)), int(m.group(1)))
    except ValueError:
        return None


def parse_time(text):
    """'19.30 Uhr' / '19:30' / '20 Uhr' -> (hh, mm) or None."""
    t = clean(text)
    m = re.search(r'(\d{1,2})[.:](\d{2})', t)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = re.search(r'(\d{1,2})\s*Uhr', t)
    if m:
        return int(m.group(1)), 0
    return None
