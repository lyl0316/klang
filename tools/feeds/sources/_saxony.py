"""Shared helpers for the Saxony readers (Dresden and Leipzig): Semperoper, Staatskapelle
Dresden, Dresdner Philharmonie, Frauenkirche Dresden, Gewandhaus zu Leipzig, Oper Leipzig,
Thomaskirche Leipzig.

Not a reader itself: the registry skips modules whose name starts with '_'.
Only *facts* come out of here (role names, people, works, places); no description text.
"""
from __future__ import annotations

import re
from datetime import datetime

from common import clean, to_zurich_iso

from ._consent import fold, group_role, looks_like_person, role_en, strip_life_dates

__all__ = ['fold', 'group_role', 'looks_like_person', 'role_en', 'strip_life_dates', 'berlin_iso', 'SKIP_RE',
           'skip_reason', 'voice_role', 'cast_credits', 'split_work', 'german_town', 'is_placeholder', 'TZ']

TZ = 'Europe/Berlin'


def berlin_iso(value):
    """Naive German local time (datetime or ISO text) or an aware value -> Klang's ISO start."""
    return to_zurich_iso(value, assume=TZ)


def local_dt(day, hh, mm):
    """(date, hour, minute) -> ISO start in German local time."""
    return berlin_iso(datetime(day.year, day.month, day.day, int(hh), int(mm)))


# ---------------------------------------------------------------------------
# what is not a concert for Klang
# ---------------------------------------------------------------------------

SKIP_RE = re.compile(
    r'(?<!auf)(?<!ein)f[üu]hrung|schulkonzert|kinderkonzert|familienkonzert|familientag|f[üu]r kinder|'
    r'f[üu]r die ganze familie|kinderoper|krabbel|kita\b|\bkids\b|kapelle f[üu]r kids|phil zu entdecken|'
    r'mitsing|offenes singen|singen mit|workshop|werkstatt|einf[üu]hrung|kostprobe|probenbesuch|offene probe|'
    r'\bprobe\b|gespr[äa]ch|symposium|vortrag|lesung|literatur und musik|podium|diskussion|tag der offenen|'
    r'opernball|\bball\b|gala-?dinner|preisverleihung|verleihung|semper bar|absacker|aktenzeichen|'
    r'treffpunkt|stummfilm|film und musik|in concert\b|blockbuster|karaoke|comedy|kabarett|'
    r'lachmesse|party|disco|\bdj\b|jazz|blues brothers|schlager|musical\b|gottesdienst|andacht|'
    r'eins zu eins|mittendrin|offene kirche|kuppelaufstieg|ausstellung|nachwuchs|vorsingen|'
    r'b[üu]rgerchor|adventssingen|chortag|schulch[öo]re', re.I)


def skip_reason(*texts):
    """The matched skip word when any of ``texts`` names a format Klang leaves out, else None."""
    for t in texts:
        m = SKIP_RE.search(clean(t or ''))
        if m:
            return m.group(0).lower()
    return None


# ---------------------------------------------------------------------------
# people
# ---------------------------------------------------------------------------

_PLACEHOLDER_RE = re.compile(r'(?i)^(?:n\.?\s*n\.?|tba|t\.b\.a\.|tbd|noch offen|wird bekannt gegeben|mitwirkende|'
                             r'besetzung folgt|und andere|u\.\s?a\.|solisten|solistinnen|solist\*innen|gesangssolisten)$')
# 'Domkantor Adrian Büttemeier', 'Universitätsmusikdirektor David Timm', 'Prof. Jörg Faßmann'
_HONORIFIC_RE = re.compile(r'^(?:(?:Prof\.|Dr\.|KMD|LKMD)\s+)*(?:[A-ZÄÖÜ][a-zäöüß]*(?:kantor|kantorin|organist|organistin|'
                           r'musikdirektor|musikdirektorin)\s+)?(?:(?:Prof\.|Dr\.)\s+)*(?=\S+\s+\S)')
_STAFF_RE = re.compile(r'(?i)assistenz|regieassistenz|inspizienz|souffl|maske|technik|dramaturg|b[üu]hnenbild|'
                       r'kost[üu]m|licht|video|ausstattung|einstudierung|choreinstudierung|konzeption|idee|'
                       r'szenische einrichtung|regie und choreo|text\b|[üu]bertitel|sounds?\b|after-concert|kompars|statist|'
                       r'orchestrierung|associate')


_EXTRA_ROLES = (
    (re.compile(r'(?i)^(?:chefdirigent|gastdirigent|dirigent|leitung)\b'), 'Conductor'),
    (re.compile(r'(?i)moderation|gastgeber|moderator'), 'Presenter'),
    (re.compile(r'(?i)^(?:\d\.\s*)?pianist(?:in)?$'), 'Piano'),
    (re.compile(r'(?i)^cembalist(?:in)?$'), 'Harpsichord'),
    (re.compile(r'(?i)^schlagwerk(?:er|erin)?$|^perkussionist(?:in)?$'), 'Percussion'),
    (re.compile(r'(?i)^(?:streich|klavier|bl[äa]ser)?(?:quartett|quintett|trio|ensemble)$'), 'Ensemble'),
    (re.compile(r'(?i)^(?:thomas|assistenz|kirchen|dom)?organist(?:in)?$'), 'Organ'),
    (re.compile(r'(?i)^(?:solist(?:in|en)?|gesangssolist(?:in|en)?|soloist)$'), 'Performer'),
    (re.compile(r'(?i)^(?:coaching|regie|inszenierung und .*|.*design)$'), ''),
)


def is_placeholder(name):
    return bool(_PLACEHOLDER_RE.match(clean(name).strip(' ,.')))


def voice_role(desc):
    """role_en, also for numbered voices ('Sopran 2', 'Violine II'), voices with a part in
    brackets ('Tenor (Florestan)') and 'Dirigent (…)'. '' = off-stage, None = not role words."""
    d = clean(desc).strip(' ,;:')
    r = role_en(d)
    if r is None:
        bare = re.sub(r'\s*\([^)]*\)\s*', ' ', d).strip()
        bare = re.sub(r'\s+(?:[IVX]{1,3}|\d)\.?$', '', bare).strip()
        if bare and bare != d:
            r = role_en(bare)
    if r is None and re.search(r'(?i)[a-zäöü](?:en|n)$', d):    # plural: 'Trompeten', 'Violinen'
        for cut in (1, 2):
            r = role_en(d[:-cut])
            if r:
                break
    if r is None:
        for rx, role in _EXTRA_ROLES:
            if rx.search(d):
                r = role
                break
    if r is None and _STAFF_RE.search(d):
        r = ''
    return r


def cast_credits(people, kind='concert'):
    """[(desc, name)] -> [(role, name)] in Klang's order: conductors, soloists, groups, staging.
    ``kind``: 'concert', 'opera' (unknown role words are characters) or 'ballet' (dancers dropped)."""
    conductors, soloists, groups, staging = [], [], [], []
    expanded = []
    for desc, name in people:
        name = clean(name).strip(' ,;')
        parts = re.split(r'\s+(?:und|&)\s+', name)
        if len(parts) == 2 and not group_role(name) and all(looks_like_person(p) and len(p.split()) >= 2 for p in parts):
            expanded.extend((desc, p) for p in parts)    # 'Josef Jugashvili und Anna Gorgadze'
        else:
            expanded.append((desc, name))
    for desc, name in expanded:
        name = _HONORIFIC_RE.sub('', clean(name).strip(' ,;'))
        place = re.search(r'\s*\(([A-ZÄÖÜ][\w.-]*(?:,?\s+[A-ZÄÖÜ][\w.-]*)*)\)$', name)
        if place and not group_role(place.group(1)) and not re.search(r'(?i)chor|orchest|ensemble', place.group(1)):
            name = name[:place.start()]                  # 'Christoph Bossert (Würzburg)'
        desc = clean(desc).strip(' ,;:')
        if not name or len(name) > 90 or is_placeholder(name):
            continue
        r = voice_role(desc) if desc else None
        g = (group_role(name) or ('Choir' if re.search(r'(?i)chor(?!eo)', name) else None)
             or ('Ensemble' if re.search(r'(?i)(?:trio|quartett|quintett|sextett|septett|oktett|consort)\b', name) else None))
        if r == '':
            continue
        if not r and re.search(r'(?i)ballett|tanzensemble|tanzkompanie|dance company|kompars|statist', name):
            continue                                    # dancers and extras are not musical credits
        if r in ('Director', 'Choreographer'):
            if kind in ('opera', 'ballet'):
                staging.append((r, name))
            continue
        if r in ('Orchestra', 'Choir', 'Ensemble') or (not desc and g):
            groups.append((r if r in ('Orchestra', 'Choir', 'Ensemble') else g, name))
            continue
        if r == 'Conductor':
            conductors.append((r, name))
            continue
        if r in ('Narrator', 'Presenter') and kind == 'opera':
            r = None                                    # 'Sprecher' is a character in Die Zauberflöte
        if r is None:
            if kind == 'ballet':
                continue                                # dancers are not musical credits
            if g:
                groups.append((g, name))
            elif kind == 'opera' and desc and len(desc) <= 40:
                soloists.append((desc, name))           # a character in the opera
            elif looks_like_person(name):
                soloists.append(('Performer', name))
            continue
        soloists.append((r, name))
    out, seen = [], set()
    for c in conductors + soloists + groups + staging:
        k = (c[0].lower(), c[1].lower())
        if k not in seen:
            seen.add(k)
            out.append(c)
    return out


# ---------------------------------------------------------------------------
# works
# ---------------------------------------------------------------------------

_WORK_SEP_RE = re.compile(r'\s+[—–-]\s+|\s*:\s+')


def split_work(line):
    """'Antonín Dvořák — Konzert für Violoncello h-Moll' / 'J. S. Bach (1685–1750): Fuge G-Dur'
    -> (composer, title); (None, None) when the line is not 'composer <sep> work'."""
    t = clean(line).strip(' ,;')
    m = _WORK_SEP_RE.search(t)
    if not m:
        return None, None
    composer = strip_life_dates(t[:m.start()]).strip(' ,;')
    title = t[m.end():].strip(' ,;')
    if not composer or not title or len(composer) > 60 or not looks_like_person(composer, max_words=7):
        return None, None
    return composer, title


# ---------------------------------------------------------------------------
# places
# ---------------------------------------------------------------------------

_TOWNS = {
    'dresden': 'Dresden', 'leipzig': 'Leipzig', 'berlin': 'Berlin', 'münchen': 'Munich', 'munich': 'Munich',
    'hamburg': 'Hamburg', 'frankfurt': 'Frankfurt', 'köln': 'Cologne', 'cologne': 'Cologne',
    'stuttgart': 'Stuttgart', 'düsseldorf': 'Düsseldorf', 'chemnitz': 'Chemnitz', 'zwickau': 'Zwickau',
    'meißen': 'Meissen', 'meissen': 'Meissen', 'freiberg': 'Freiberg', 'bautzen': 'Bautzen', 'görlitz': 'Görlitz',
    'pirna': 'Pirna', 'radebeul': 'Radebeul', 'moritzburg': 'Moritzburg', 'gohrisch': 'Gohrisch',
    'torgau': 'Torgau', 'halle': 'Halle', 'weimar': 'Weimar', 'erfurt': 'Erfurt', 'eisenach': 'Eisenach',
    'weißenfels': 'Weissenfels', 'naumburg': 'Naumburg', 'potsdam': 'Potsdam', 'magdeburg': 'Magdeburg',
    'baden-baden': 'Baden-Baden', 'bayreuth': 'Bayreuth', 'nürnberg': 'Nuremberg', 'hannover': 'Hanover',
    'bremen': 'Bremen', 'bonn': 'Bonn', 'karlsruhe': 'Karlsruhe', 'mannheim': 'Mannheim', 'wiesbaden': 'Wiesbaden',
    'mainz': 'Mainz', 'kiel': 'Kiel', 'lübeck': 'Lübeck', 'rostock': 'Rostock', 'schwerin': 'Schwerin',
    'essen': 'Essen', 'dortmund': 'Dortmund', 'bochum': 'Bochum', 'wuppertal': 'Wuppertal',
    'regensburg': 'Regensburg', 'augsburg': 'Augsburg', 'würzburg': 'Würzburg', 'bamberg': 'Bamberg',
    'freiburg': 'Freiburg', 'heidelberg': 'Heidelberg', 'ulm': 'Ulm', 'kassel': 'Kassel', 'göttingen': 'Göttingen',
    'braunschweig': 'Braunschweig', 'wolfsburg': 'Wolfsburg', 'dessau': 'Dessau', 'wittenberg': 'Wittenberg',
    'gera': 'Gera', 'jena': 'Jena', 'altenburg': 'Altenburg', 'plauen': 'Plauen', 'annaberg': 'Annaberg-Buchholz',
    'bad elster': 'Bad Elster', 'mühlhausen': 'Mühlhausen', 'arnstadt': 'Arnstadt', 'köthen': 'Köthen',
    'grimma': 'Grimma', 'wurzen': 'Wurzen', 'borna': 'Borna', 'delitzsch': 'Delitzsch', 'rochlitz': 'Rochlitz',
}
_FOREIGN_RE = re.compile(r'(?i)\b(?:wien|vienna|salzburg|graz|linz|innsbruck|bregenz|z[üu]rich|basel|bern|luzern|'
                         r'genf|gen[èe]ve|paris|lyon|strasbourg|london|amsterdam|br[üu]ssel|brussels|prag|praha|'
                         r'prague|warschau|warszawa|krak[oó]w|breslau|wroc[lł]aw|budapest|rom|roma|mailand|milano|'
                         r'venedig|madrid|barcelona|lissabon|kopenhagen|stockholm|oslo|helsinki|tokio|tokyo|seoul|'
                         r'peking|beijing|shanghai|taipei|new york|chicago|boston|washington|los angeles|'
                         r'luxemburg|luxembourg|antwerpen|rotterdam|den haag|athen|istanbul|tel aviv|'
                         r'tschechien|polen|österreich|schweiz|frankreich|italien|spanien|japan|china|korea|usa|'
                         r'tournee|tour\b)')


def german_town(text, default=None):
    """English/usual name of the German town named in ``text``; None when it names a place
    abroad; ``default`` when no town is recognised."""
    t = clean(text)
    if not t:
        return default
    if _FOREIGN_RE.search(t):
        return None
    low = t.lower()
    for word, town in _TOWNS.items():
        if re.search(rf'(?<![\w-]){re.escape(word)}(?![\w-])', low):
            return town
    return default
