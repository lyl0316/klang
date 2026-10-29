"""Shared helpers for the readers of western Austria (Salzburg, Innsbruck, Bregenz):
mozarteum_salzburg, mozarteumorchester, tiroler_landestheater, bregenzer_festspiele.

Not a reader itself: the registry skips modules whose name starts with '_'.
Only *facts* come out of here (role names, people, works); never description text.

Note for build.py --fresh-hours: a reader's codeHash covers only its own file and
common.py, so an edit here does not by itself invalidate yesterday's reused events.
"""
from __future__ import annotations

import html as _html
import re
import urllib.parse

from common import clean

from ._consent import ROLE_WORDS, fold, group_role, looks_like_person, role_en, strip_life_dates

# ---------------------------------------------------------------------------
# roles
# ---------------------------------------------------------------------------

# role texts of people who are not performers (staff, creative team, speakers at a talk)
_OFFSTAGE_RE = re.compile(
    r'konzept|gestaltung|regie|inszenierung|einrichtung|bühne|buehne|kostüm|kostuem|licht|dramaturg|libretto|'
    r'herstellung|projektleitung|design|director|manager|playwright|composer|komponist|arrangement|bearbeitung|'
    r'einstudierung|choreinstudierung|puppenspiel|professor|ausstattung|video|sounddesign|ton\b|produktion|'
    r'assistenz|inspizienz|souffl|maske|statist|choreogra|tanz\b|dance|text\b|übersetzung|uebersetzung|'
    r'künstlerische leitung|kuenstlerische leitung|presenting|szenisch|spielleitung|regieassistenz', re.I)
# a role word anywhere in the text, longest first ('Mozarts „Costa“-Violine' -> Violin)
_ROLE_KEYS = sorted(((fold(k), v) for k, v in ROLE_WORDS.items() if len(k) >= 4 and v not in ('Director', 'Choreographer')),
                    key=lambda kv: -len(kv[0]))
_EXTRA_INSTRUMENTS = {'ondes martenot': 'Ondes Martenot', 'ondes-martenot': 'Ondes Martenot', 'theremin': 'Theremin',
                      'glasharmonika': 'Glass harmonica', 'oud': 'Oud', 'duduk': 'Duduk', 'santur': 'Santur', 'kanun': 'Kanun', 'sitar': 'Sitar',
                      'erhu': 'Erhu', 'pipa': 'Pipa', 'koto': 'Koto', 'shakuhachi': 'Shakuhachi', 'zither': 'Zither',
                      'marimbaphon': 'Marimba', 'vibraphon': 'Vibraphone', 'traversflöte': 'Baroque flute',
                      'clavichord': 'Clavichord', 'clavichorde': 'Clavichord', 'mandola': 'Mandola'}
_GROUP_EXTRA_RE = re.compile(r'(?i)cuarteto|kwartet|quartetto|quatuor|ensemble|consort|\bduo\b|\btrio\b')
_CONDUCT_RE = re.compile(r'^(?:musikalische\s+)?leitung$|^dirigent(?:in)?$|^dirigat$|^conductor$', re.I)


def role_from_text(text, *, opera=False):
    """German/English role text -> (kind, role):
    ('skip', None) for staff / creative team; ('role', 'Violin'); ('character', 'Amelia') for
    a part in an opera; ('unknown', None) when the text says nothing usable."""
    t = clean(text).strip(' |,;:-–')
    t = re.sub(r'(?i)(?<=[a-zäöü])(?:duo|trio|quartett)$', '', t)      # 'Klavierduo' -> 'Klavier'
    if not t:
        return 'unknown', None
    if _CONDUCT_RE.match(t):
        return 'role', 'Conductor'
    if fold(t) in {fold(k) for k in _EXTRA_INSTRUMENTS}:
        return 'role', next(v for k, v in _EXTRA_INSTRUMENTS.items() if fold(k) == fold(t))
    r = role_en(t)
    if r == '':
        return 'skip', None
    if r in ('Director', 'Choreographer'):
        return ('role', r) if opera and r == 'Director' else ('skip', None)
    if r:
        return 'role', r
    first = re.split(r'\s*[,(]\s*', t)[0]                     # 'Sopran, Lilli Lehmann-Medaille 2025'
    if first and first != t:
        r = role_en(first)
        if r and r not in ('Director', 'Choreographer'):
            return 'role', r
    if _OFFSTAGE_RE.search(t):
        return 'skip', None
    f = fold(t)
    for key, value in _ROLE_KEYS:
        if re.search(r'(?<![a-z])' + re.escape(key) + r'(?![a-z])', f) or f.endswith(key):
            return 'role', value
    if opera and len(t) <= 40 and not re.search(r'\d', t):
        return 'character', t
    return 'unknown', None


def split_names(name):
    """'Yaara Tal & Andreas Groethuysen' -> both names, when every part is a person's name
    of at least two words; anything else (a group, 'Simon & Garfunkel Revival') stays whole."""
    parts = [p.strip() for p in re.split(r'\s+(?:&|und|and)\s+|\s*,\s*', clean(name)) if p.strip()]
    if len(parts) > 1 and all(len(p.split()) >= 2 and looks_like_person(p) and not group_role(p) for p in parts):
        return parts
    return [clean(name)]


def credit(role_text, name, *, opera=False):
    """(role, name) for a performer, or None for staff / an empty or placeholder name."""
    name = clean(name).strip(' ,;:')
    name = re.sub(r'(?i)(?:\s*,\s*|\s*/\s*|\s+(?:&|und|or|oder)\s+)(?:tba|tbd|n\.\s?n\.?|t\.b\.a\.)\.?$', '', name).strip()
    if not name or not re.search(r'[^\W\d_]', name) or len(name) > 90 \
            or re.fullmatch(r'(?i)n\.?\s*n\.?|tba|tbd|t\.b\.a\.|n/a', name):
        return None
    kind, role = role_from_text(role_text, opera=opera)
    if kind == 'skip':
        return None
    if kind in ('role', 'character'):
        return role, name
    return group_role(name) or ('Ensemble' if _GROUP_EXTRA_RE.search(name) else 'Performer'), name


def order_credits(credits):
    """Conductors first, then soloists, then groups; duplicates removed."""
    out, seen = [], set()
    rank = {'Conductor': 0, 'Orchestra': 2, 'Choir': 2, 'Ensemble': 2, 'Director': 3}
    for role, name in sorted(credits, key=lambda c: rank.get(c[0], 1)):
        key = (role, name.lower())
        if key not in seen:
            seen.add(key)
            out.append((role, name))
    return out


# ---------------------------------------------------------------------------
# programme: "<p><strong>Composer</strong><br>Work<br>Work</p>" blocks
# ---------------------------------------------------------------------------

_TOKEN_RE = re.compile(r'<(/?)([a-zA-Z0-9]+)[^>]*>|([^<]+)', re.S)
# lines under a composer that are notes on the work above, not works
_NOTE_RE = re.compile(
    r'^(?:fassung|bearbeitung|transkription|arrangement|arr\.|orchestrierung|instrumentierung|libretto|text\b|'
    r'opera buffa|opera seria|dramma|semiszenisch|konzertant|in (?:italienischer|deutscher|französischer|englischer) '
    r'sprache|mit (?:deutschen|englischen) übertiteln|vermutlich|uraufführung|ua\b|österreichische erstaufführung|'
    r'auftragswerk|dauer|pause\b|u\.\s?a\.?$|und andere|sowie\b|version\b|einrichtung|übertitel|'
    r'(?:dichtung|text|libretto|worte|musik) von\b|(?:oper|operette|singspiel|intermezzo|musiktheater|komödie|'
    r'tragödie|melodramma|drama)\w* in (?:\d+|einem|zwei|drei|vier|fünf|einer) )', re.I)
# a line that is prose or a ticket note: the programme ends there
_STOP_RE = re.compile(r'ermäßigung|ermaessigung|vorverkauf|erhältlich|erhaeltlich|tickets?\b|karten\b|einführung|'
                      r'einfuehrung|veranstalter|https?://|@', re.I)
_NOT_COMPOSER_RE = re.compile(r'(?i)^(?:programm|program|werke|kompositionen|dauer|hinweis|pause|besetzung|mitwirkende|'
                              r'leitung|zum programm|konzerteinführung|tickets?|preise?|achtung|neu|info)\b|'
                              r'familien|konzert\b|minuten|uhr\b|\bfür\b|:$')


def _segments(fragment):
    """HTML -> list of paragraphs, each a list of lines (text, all_bold) split at <br>."""
    paras, lines = [], []
    cur, bold_chars, plain_chars, depth = [], 0, 0, 0

    def end_line():
        nonlocal cur, bold_chars, plain_chars
        text = clean(_html.unescape(''.join(cur)))
        lines.append((text, bool(text) and bold_chars > 0 and plain_chars == 0))
        cur, bold_chars, plain_chars = [], 0, 0

    def end_para():
        nonlocal lines
        end_line()
        if any(t for t, _ in lines):
            paras.append(lines)
        lines = []

    for m in _TOKEN_RE.finditer(fragment or ''):
        closing, tag, text = m.group(1), (m.group(2) or '').lower(), m.group(3)
        if text is not None:
            cur.append(text)
            n = len(re.sub(r'\s|&nbsp;|[\-–—|]', '', text))
            if depth > 0:
                bold_chars += n
            else:
                plain_chars += n
        elif tag in ('strong', 'b'):
            depth = max(0, depth - 1) if closing else depth + 1
        elif tag == 'br':
            end_line()
        elif tag in ('p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'tr', 'table'):
            end_para()
        elif tag in ('em', 'i', 'span', 'a', 'sup', 'sub', 'u', 'small'):
            continue
    end_para()
    return paras


# a line that continues the work above: 'für Klavier solo', a nickname alone in quotes, the keys
_CONTINUATION_RE = re.compile(r'^(?:für|for|pour|per)\s|^[„“"«»‚‘\'][^„“"«»]+[“”"«»‘’\']$|^[A-H](?:is|es|s)?-(?:Dur|Moll|dur|moll)\b')


def _composer_name(text):
    name = strip_life_dates(text).strip(' ,;:-–')
    if not name or _NOT_COMPOSER_RE.search(name) or len(name) > 60 or group_role(name):
        return None
    if not looks_like_person(name, max_words=7) and not re.fullmatch(r'[A-ZÄÖÜ][\w.\'’ -]+', name):
        return None
    return name


def program_from_html(fragment, *, full_names=None):
    """Works from blocks of a bold composer line followed by plain lines with the works
    ('<strong>Mozart</strong><br>Requiem d-Moll KV 626<br>Fassung: Süßmayr'). Notes under a
    work (Fassung, Bearbeitung, Libretto …) are dropped, a line ending in ':' is joined with
    the next ('Aus Rigoletto:' + 'Arie der Gilda …'), and prose ends the block.
    ``full_names`` maps a bare surname used by the site ('Mozart') to the full name."""
    works = []
    for para in _segments(fragment):
        composer, pending, block_works = None, '', 0
        for text, bold in para:
            if not text:                                  # an empty line ends the block
                composer, pending = None, ''
                continue
            if bold:
                composer = _composer_name(text)
                pending, block_works = '', 0
                continue
            if not composer:
                continue
            if len(text) > 180 or _STOP_RE.search(text):
                composer = None
                continue
            line = re.sub(r'^[&+]\s*', '', text).strip()
            if pending:
                line = f'{pending} {line}'
                pending = ''
            elif _NOTE_RE.match(line):
                continue
            if line.endswith(':'):
                pending = line
                continue
            if works and works[-1][0] == composer and block_works and _CONTINUATION_RE.match(line):
                works[-1] = (composer, f'{works[-1][1]} {line}')     # 'für Klavier solo', '„Nickname“'
                continue
            line = re.sub(r'\s*/\s*(?:Concerto|Symphony|Sonata|Quartet)\b.*$', '', line)   # 'Konzert … / Concerto …'
            if line:
                works.append((composer, line))
                block_works += 1
    if full_names:
        works = [(full_names.get(c, c), t) for c, t in works]
    return works


# ---------------------------------------------------------------------------
# misc
# ---------------------------------------------------------------------------

def strip_tracking(url):
    """Drop Google/Facebook tracking parameters (_gl, _ga, utm_*, fbclid) from a link."""
    if not url:
        return None
    try:
        p = urllib.parse.urlsplit(url.strip())
    except ValueError:
        return None
    q = [(k, v) for k, v in urllib.parse.parse_qsl(p.query, keep_blank_values=True)
         if not re.match(r'(?i)_gl$|_ga|utm_|fbclid|gclid|mc_', k)]
    return urllib.parse.urlunsplit((p.scheme, p.netloc, p.path, urllib.parse.urlencode(q), ''))
