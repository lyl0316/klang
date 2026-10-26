"""Verbier Festival: the summer festival's Mainstage and Academy concerts.

The programme page (https://verbierfestival.com/programme/) lists every show of the current
edition as an <article class="js-show-teaser"> with its category term (data-term), venue,
labels (style, title, orchestra, composers), a calendar link (/ical.php?...startTime=
20260717T183000&endTime=...&eventLocation=...) in Swiss local time, the show page
(/show/vf2026-07-17-1830/) and the ticket link. Each show page adds the cast with roles
("Distribution") and the works ("Programme"); those are fetched while the request budget and
time limit allow (robots.txt asks for Crawl-delay: 10). Between editions the page still
shows the last (past) edition, so the reader returns 0 events until the next programme is
published (the 2027 programme is announced for 6 November 2026).

Kept: Mainstage and Academy concerts in Verbier / Le Châble. Skipped: UNLTD (crossover,
jazz, world music), VF KiDS (family shows), talks, public rehearsals, masterclasses, the
Jukebox, live cinema broadcasts of a concert, "seats on stage" duplicates and anything at the
Shenzhen edition.
"""
from __future__ import annotations

import html as _html
import re
import unicodedata
import urllib.parse
from common import (BudgetExceeded, FetchError, clean, get, guess_type, log, looks_cancelled,
                    make_event, requests_left, to_zurich_iso, today_zurich)

KEY = 'verbier'
NAME = 'Verbier Festival'
SITE = 'https://verbierfestival.com/'
ATTRIBUTION = 'Source: Verbier Festival (verbierfestival.com)'
KIND = 'festival'
MAX_REQUESTS = 60
TIME_LIMIT = 900          # Crawl-delay 10 s: about 85 requests fit; the cap of 60 stops first

PROGRAMME_URL = 'https://verbierfestival.com/programme/'

KEEP_TERMS = ('mainstage', 'academy')
SKIP_TERMS = ('unltd', 'kids', 'talks', 'repetitions', 'jukebox', 'windows')
SKIP_WORDS = re.compile(r'(diffusion|depuis la sc[eè]ne|masterclass|master class|\btalks?\b|r[ée]p[ée]tition|'
                        r'jukebox|listening session|conf[ée]rence|workshop|shenzhen|深圳)', re.I)

STYLE_TYPES = {
    'symphonique': 'orchestral', 'musique de chambre': 'chamber', 'opera': 'vocal-opera',
    'lyrique': 'vocal-opera', 'recital': 'recital', 'piano': 'recital', 'violon': 'recital',
}
STYLE_LABELS = set(STYLE_TYPES) | {'concert', 'spectacle'}

ROLES = [
    (r'^(direction|direction musicale|chef d.orchestre|cheffe d.orchestre|conductor)$', 'Conductor'),
    (r'^(piano|pianoforte)$', 'Piano'), (r'^violon$', 'Violin'), (r'^alto$', 'Viola'),
    (r'^violoncelle$', 'Cello'), (r'^contrebasse$', 'Double bass'), (r'^fl[uû]te$', 'Flute'),
    (r'^hautbois$', 'Oboe'), (r'^clarinette$', 'Clarinet'), (r'^basson$', 'Bassoon'), (r'^cor$', 'Horn'),
    (r'^trompette$', 'Trumpet'), (r'^trombone$', 'Trombone'), (r'^tuba$', 'Tuba'), (r'^harpe$', 'Harp'),
    (r'^clavecin$', 'Harpsichord'), (r'^orgue$', 'Organ'), (r'^percussions?$', 'Percussion'),
    (r'^timbales$', 'Timpani'), (r'^guitare$', 'Guitar'), (r'^mandoline$', 'Mandolin'),
    (r'^accord[ée]on$', 'Accordion'), (r'^ondes martenot$', 'Ondes Martenot'),
    (r'^soprano$', 'Soprano'), (r'^mezzo-?soprano$', 'Mezzo-soprano'), (r'^(contr)?alto \(voix\)$|^contralto$', 'Alto'),
    (r'^t[ée]nor$', 'Tenor'), (r'^baryton$', 'Baritone'), (r'^baryton-basse$', 'Bass-baritone'),
    (r'^basse$', 'Bass'), (r'^contre-?t[ée]nor$', 'Countertenor'), (r'^r[ée]citant(e)?$', 'Narrator'),
    (r'^mise en sc[eè]ne$|^mise en espace$', 'Stage director'),
    (r'^(chef|cheffe) de ch(œ|oe)ur$', 'Chorus master'),
    (r'^ch(œ|oe)ur$', 'Choir'), (r'^ensemble$', 'Ensemble'), (r'^orchestre$', 'Orchestra'),
]
CHOIR_RE = re.compile(r'(ch(œ|oe)ur|vokalensemble|choir|chorus|\bchor\b|\bcoro\b|voices|singers|cappella|atelier lyrique)', re.I)
ORCH_RE = re.compile(r'(orchestr|philharm|symphon|sinfoni|camerata)', re.I)

SMALL_WORDS = {'de', 'du', 'des', 'la', 'le', 'les', 'et', 'à', 'au', 'aux', 'en', 'sur', 'pour',
               'von', 'van', 'der', 'den', 'di', 'da', 'del', 'della', 'y', 'of', 'the', 'and', 'with'}
ACRONYMS = {'VF', 'VFO', 'VFCO', 'VFJO', 'UNLTD', 'OSR', 'OCL', 'CD', 'DJ', 'USA', 'UK'}


# ---------------------------------------------------------------------------
# text helpers
# ---------------------------------------------------------------------------

def _fold(s):
    s = unicodedata.normalize('NFKD', s or '')
    return re.sub(r'\s+', ' ', ''.join(c for c in s if not unicodedata.combining(c)).lower()).strip()


def _is_shouting(s):
    letters = [c for c in s if c.isalpha()]
    return bool(letters) and sum(c.isupper() for c in letters) / len(letters) > 0.8


def _cap(word):
    return '-'.join(p[:1].upper() + p[1:].lower() for p in word.split('-'))


def smart_case(s, names=()):
    """Re-case an ALL-CAPS title. Parts that match a cast name ('ESA-PEKKA SALONEN') take the
    cast's spelling ('Esa-Pekka Salonen'); other words are capitalised."""
    if not _is_shouting(s):
        return s
    lookup = {_fold(n): n for n in names}
    parts = []
    for part in re.split(r'(\s+/\s+|\s+-\s+|\s*:\s+)', s):
        if re.fullmatch(r'\s+/\s+|\s+-\s+|\s*:\s+', part or ''):
            parts.append(part)
            continue
        core = part.rstrip('.… ')
        tail = part[len(core):]
        if _fold(core) in lookup:
            parts.append(lookup[_fold(core)] + tail)
            continue
        words = []
        for i, w in enumerate(core.split()):
            lw = w.lower()
            m = re.match(r"^([dl])['’](.+)$", lw)
            if w in ACRONYMS or (re.fullmatch(r'[IVX]+', w) and len(w) <= 4):
                words.append(w)
            elif m:
                words.append((m.group(1).upper() if i == 0 else m.group(1)) + "'" + _cap(m.group(2)))
            elif i > 0 and lw in SMALL_WORDS:
                words.append(lw)
            else:
                words.append(_cap(w))
        parts.append(' '.join(words) + tail)
    return ''.join(parts)


def _role(text):
    t = _fold(clean(text))
    if not t:
        return None
    for rx, out in ROLES:
        if re.search(rx, t):
            return out
    return None


def _group_role(name):
    if CHOIR_RE.search(name):
        return 'Choir'
    if ORCH_RE.search(name):
        return 'Orchestra'
    return 'Ensemble'


# ---------------------------------------------------------------------------
# programme page
# ---------------------------------------------------------------------------

def _term_names(page):
    """data-term-id -> filter value ('103' -> 'mainstage-fr') from the filter form."""
    out = {}
    for m in re.finditer(r'<input\b[^>]*>', page):
        tag = m.group(0)
        tid = re.search(r'data-term-id="(\d+)"', tag)
        val = re.search(r'\bvalue="([^"]*)"', tag)
        # child (style) filters repeat their parent's data-term-id: keep the parent's name
        if tid and val and 'js-parent-term-filter' in tag:
            out.setdefault(tid.group(1), val.group(1).lower())
    return out


def _label(body, cls):
    m = re.search(r'class="teaser-displayed__' + cls + r'"[^>]*>(.*?)</(?:div|small|h5|h6|p)>', body, re.S)
    return clean(m.group(1)) if m else ''


FR_MONTHS = {'janvier': 1, 'fevrier': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6, 'juillet': 7,
             'aout': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11, 'decembre': 12}


def _text_times(text):
    """'vendredi 17 juillet 2026 18:30 à 20:45' -> ('2026-07-17T18:30:00', '2026-07-17T20:45:00')."""
    m = re.search(r'(\d{1,2})\s+([a-zéèûô]+)\s+(\d{4})\s+(\d{1,2})[:h](\d{2})(?:\s*(?:à|-|–)\s*(\d{1,2})[:h](\d{2}))?',
                  text, re.I)
    if not m or _fold(m.group(2)) not in FR_MONTHS:
        return None, None
    d = f'{m.group(3)}-{FR_MONTHS[_fold(m.group(2))]:02d}-{int(m.group(1)):02d}'
    start = f'{d}T{int(m.group(4)):02d}:{m.group(5)}:00'
    end = f'{d}T{int(m.group(6)):02d}:{m.group(7)}:00' if m.group(6) else None
    return start, end


def _compact(value):
    m = re.fullmatch(r'(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?', (value or '').strip())
    return f'{m.group(1)}-{m.group(2)}-{m.group(3)}T{m.group(4)}:{m.group(5)}:00' if m else None


def _listing(page):
    terms = _term_names(page)
    items = []
    for m in re.finditer(r'<article\b([^>]*)>(.*?)</article>', page, re.S):
        attrs, body = m.group(1), m.group(2)
        if 'js-show-teaser' not in attrs:
            continue
        term = re.search(r'data-term="(\d+)"', attrs)
        venue_slug = re.search(r'data-venue="([^"]*)"', attrs)
        title_m = re.search(r'teaser-displayed__labels-title">\s*(?:<a[^>]*>)?(.*?)</', body, re.S)
        show = re.search(r'href="(https://verbierfestival\.com/show/[^"]+)"', body)
        buy = re.search(r'class="btn btn--buy[^"]*"\s+href="([^"]+)"', body)
        cal = re.search(r'href="/ical\.php\?([^"]+)"', body)
        q = urllib.parse.parse_qs(_html.unescape(cal.group(1)), keep_blank_values=True) if cal else {}
        loc = re.search(r'class="teaser-displayed__location"[^>]*>(.*?)</p>', body, re.S)
        start = _compact((q.get('startTime') or [''])[0])
        end = _compact((q.get('endTime') or [''])[0])
        text_start, text_end = _text_times(clean(loc.group(1)) if loc else '')
        if text_start and start and text_start != start:
            log.warning('%s: calendar link %s and page text %s disagree; using the page text', KEY, start, text_start)
            start, end = text_start, text_end or end
        start, end = start or text_start, end or text_end
        venue = (q.get('eventLocation') or [''])[0].strip()
        if not venue and loc:
            vm = re.search(r'&mdash;(?:&nbsp;)?\s*(.*?)\s*$', loc.group(1), re.S)
            venue = clean(vm.group(1)) if vm else ''
        items.append({
            'term': terms.get(term.group(1), term.group(1)) if term else '',
            'venue_slug': venue_slug.group(1) if venue_slug else '',
            'caption': _label(body, 'caption'),
            'style': _label(body, 'labels-suptitle'),
            'title': clean(title_m.group(1)) if title_m else '',
            'highlight': _label(body, 'labels-highlight'),
            'subtitle': _label(body, 'labels-subtitle'),
            'url': _html.unescape(show.group(1)) if show else None,
            'ticket': _html.unescape(buy.group(1)) if buy else None,
            'start': start, 'end': end, 'venue': clean(venue),
        })
    return items


def _wanted(item):
    term = item['term'] or ''
    if term and any(term.startswith(t) for t in SKIP_TERMS):
        return False
    if term and not any(term.startswith(t) for t in KEEP_TERMS) and not term.isdigit():
        return False
    text = ' '.join([item['title'], item['caption'], item['style'], item['venue'], item['subtitle']])
    if SKIP_WORDS.search(text):
        return False
    return bool(item['title'] and item['start'])


# ---------------------------------------------------------------------------
# show page
# ---------------------------------------------------------------------------

def _distribution(page):
    i = page.find('distribution-content')
    if i < 0:
        return []
    seg = page[i:page.find('</ul>', i) + 5 if page.find('</ul>', i) > 0 else i + 20000]
    out = []
    for li in re.findall(r'<li\b[^>]*>(.*?)</li>', seg, re.S):
        href = re.search(r'href="([^"]+)"', li)
        name = re.search(r'<strong>(.*?)</strong>', li, re.S) or re.search(r'<a[^>]*>(.*?)</a>', li, re.S)
        if not name:
            continue
        name = clean(name.group(1))
        role_text = clean(re.sub(r'(?s).*</a>', '', li)) if '</a>' in li else ''
        if not name:
            continue
        if href and '/orchestra/' in href.group(1) and not role_text:
            out.append((_group_role(name) if CHOIR_RE.search(name) or ORCH_RE.search(name) else 'Ensemble', name))
            continue
        role = _role(role_text)
        if role in ('Choir', 'Ensemble', 'Orchestra'):
            role = _group_role(name) if role == 'Ensemble' else role
        several = [_role(r) for r in re.split(r'\s*,\s*|\s+et\s+', role_text)] if not role else []
        if role:
            out.append((role, name))
        elif len(several) > 1 and all(several):          # "violon, alto"
            out.extend((r, name) for r in several)
        elif role_text:
            # opera characters ('Fiordiligi') and other roles are kept as written
            out.append((role_text[:1].upper() + role_text[1:], name))
        else:
            out.append(('Performer', name))
    return out


_NOTE_RE = re.compile(r'^(entracte|concert sans entracte|concert surtitr|surtitr|programme sous r[ée]serve|'
                      r'programme annonc|remise d|proclamation|c[ée]r[ée]monie|'
                      r'dur[ée]e|pause|bis\b|en fran[cç]ais|chant[ée] en|avec\b|\()', re.I)
# movement lines under a work ("I. Allegro non troppo", "2. Adagio") belong to that work
_MOVEMENT_RE = re.compile(r'^(?:[IVX]{1,5}|\d{1,2})\s*[.)]\s+\S')


def _composer_line(line):
    """'JOHANNES BRAHMS (1833–1897)' -> 'Johannes Brahms', else None.
    'BURT BACHARACH (1928–2023) & HAL DAVID (1921–2012)' -> 'Burt Bacharach & Hal David'."""
    parts = re.split(r'\s*&\s*|\s+(?:et|and)\s+', line)
    if len(parts) > 1 and all(re.search(r'\(\s*\d{4}[^)]*\)\s*$', p) for p in parts):
        names = [_composer_line(p) for p in parts]
        return ' & '.join(names) if all(names) else None
    m = re.match(r"^\s*([^\d()«»\"]+?)\s*(\(\s*\d{4}[^)]*\))?\s*$", line)
    if not m or len(m.group(1).strip()) < 3:
        return None
    name = m.group(1).strip(' ,;:')
    if not _is_shouting(name):            # "Johannes Brahms (1833-1897)" in normal case
        ok = m.group(2) and 1 <= len(name.split()) <= 5 and all(w[:1].isupper() or w in SMALL_WORDS for w in name.split())
        return name if ok else None
    if not m.group(2) and (len(name.split()) < 2 or len(name.split()) > 5 or any(c.islower() for c in name)):
        return None                        # an all-caps word such as "ENTRACTE" is not a composer
    return smart_case(name)


def _programme(page):
    i = page.find('class="program-content"')
    if i < 0:
        return []
    end = page.find('program-toggle', i)
    end = page.rfind('<', i, end) if end > 0 else i + 30000      # stop before that tag opens
    seg = page[page.find('>', i) + 1:end]
    seg = re.sub(r'(?i)<br\s*/?>|</p>|</li>', '\n', seg)
    out, composer = [], None
    for raw in seg.split('\n'):
        line = clean(raw)
        if not line:
            continue
        name = _composer_line(line)
        if name:
            composer = name
            continue
        if composer is None or _NOTE_RE.search(line) or re.match(r'^[–—-]\s', line) or \
                _MOVEMENT_RE.match(line) or len(line) > 160:
            continue                       # notes, movements and prose are not works
        work = re.sub(r'\s+([,;])', r'\1', re.sub(r'\s*[«»“”]\s*', ' ', line)).strip(' "')
        if work:
            out.append((composer, work))
    return out


# ---------------------------------------------------------------------------
# fetch
# ---------------------------------------------------------------------------

def fetch():
    today = today_zurich().isoformat()
    page = get(PROGRAMME_URL)              # a failure here propagates (build reuses old events)
    items, seen = [], set()
    for it in _listing(page):
        if not _wanted(it) or it['start'][:10] < today:
            continue
        key = (it['start'], _fold(it['venue']))
        if key in seen:                     # e.g. "seats on stage" for the same concert
            continue
        seen.add(key)
        items.append(it)
    items.sort(key=lambda x: x['start'])

    events, details_on = [], True
    for it in items:
        cast, works = [], []
        if details_on and it['url'] and requests_left() > 0:
            try:
                detail = get(it['url'])
                cast, works = _distribution(detail), _programme(detail)
            except BudgetExceeded:
                details_on = False
                log.info('%s: budget used up; remaining shows from the programme page only', KEY)
            except FetchError as e:
                log.warning('%s: %s: %s', KEY, it['url'], e)
            except Exception as e:  # a strange show page must not lose the event
                log.warning('%s: could not read %s: %s', KEY, it['url'], e)
        try:
            events.append(_event(it, cast, works))
        except ValueError as e:
            log.warning('%s: skipped %s: %s', KEY, it.get('url') or it['title'], e)
    return events


PARTICLES = {'de', 'di', 'da', 'del', 'van', 'von', 'der', 'le', 'la', 'du', 'des', 'y', 'e'}
NOT_A_NAME = re.compile(r'(academy|presents|concert|prix|festival|hommage|soir[ée]e|gala|surprise|'
                        r'anniversaire|c[ée]r[ée]monie|ouverture|cl[oô]ture|diffusion|live|programme)', re.I)
GROUP_WORDS = re.compile(r'(ensemble|quartet|quatuor|quartett|trio|quintet|orchestr|ch(œ|oe)ur|choir|'
                         r'consort|camerata|sinfoni|brass|cuivres|vokal|voices|singers)', re.I)


def _subtitle_composers(subtitle):
    """'Bartók, Kodály, El-Shawan' -> composer-only programme entries (only for plain name lists)."""
    t = (subtitle or '').strip()
    if not t or re.search(r'\d|[.!?:;«»()]', t):
        return []
    parts = [p.strip() for p in re.split(r',|&|\s+et\s+|\s+and\s+', t) if p.strip()]
    for p in parts:
        words = p.split()
        if not 1 <= len(words) <= 3:
            return []
        if any(not w[:1].isupper() and w.lower() not in PARTICLES for w in words):
            return []
    return [(smart_case(p), '') for p in parts]


def _title_names(it):
    """Performers named in a title like 'ESA-PEKKA SALONEN / LUCAS DEBARGUE' (no roles known)."""
    style = _fold(it['style'])
    parts = [p.strip().rstrip('.… ') for p in re.split(r'\s+/\s+', it['title'])]
    if style.startswith('opera') or (len(parts) < 2 and not style.startswith(('piano', 'recital', 'violon'))):
        return []
    out = []
    for part in parts:
        if not part or re.search(r'\d', part) or NOT_A_NAME.search(part) or not _is_shouting(part):
            continue
        if GROUP_WORDS.search(part):
            out.append((_group_role(part) if (CHOIR_RE.search(part) or ORCH_RE.search(part)) else 'Ensemble',
                        smart_case(part)))
        elif 2 <= len(part.split()) <= 4:
            out.append(('Performer', smart_case(part)))
    return out


def _event(it, cast, works):
    names = [n for _, n in cast]
    title = smart_case(it['title'], names)
    credits = list(cast)
    if not credits:                       # show page not read: use the programme page labels
        if it['highlight']:
            credits.append((_group_role(it['highlight']), smart_case(it['highlight'])))
        credits.extend(_title_names(it))
    elif it['highlight'] and not any(_fold(n) == _fold(it['highlight']) for n in names):
        credits.append((_group_role(it['highlight']), it['highlight']))
    program = list(works) or _subtitle_composers(it['subtitle'])

    style = _fold(it['style'].split('|')[0])
    kind = STYLE_TYPES.get(style)
    if any(r == 'Orchestra' for r, _ in credits) and kind not in ('vocal-opera',):
        kind = 'orchestral'
    kind = kind or guess_type(' '.join([it['style'], it['title'], it['highlight']]))

    label = ''
    style_parts = [p.strip() for p in it['style'].split('|')]
    extra = [p for p in style_parts if _fold(p) not in STYLE_LABELS]
    if extra:
        label = extra[0][:1].upper() + extra[0][1:]
    series = f'Verbier Festival · {label}' if label else 'Verbier Festival'

    venue = it['venue'] or None
    city = 'Le Châble' if venue and 'saint-marc' in _fold(venue) else 'Verbier'
    slug = (it['url'] or '').rstrip('/').rsplit('/', 1)[-1] or f"{it['start']}-{it['venue_slug']}"
    status = 'cancelled' if looks_cancelled(it['caption']) or looks_cancelled(it['title']) else None
    return make_event(
        KEY, slug, title, to_zurich_iso(it['start']), end=to_zurich_iso(it['end']) if it['end'] else None,
        city=city, venueName=venue, type=kind, series=series, credits=credits, program=program,
        ticketUrl=it['ticket'], url=it['url'], status=status)
