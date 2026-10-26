"""Opéra de Lausanne: operas, concerts and recitals from the season calendar.

The season page (https://www.opera-lausanne.ch/season/2026-27/) lists every production as a
"show-teaser" with its category, title, composer line and date range. Each production page
(/show/<slug>/) lists the individual performances ("date-booking": weekday, day, month+year,
time, ticket link), the running time ("Durée : 1h50") and the cast ("casting__role" /
"casting__name"). One request per production; robots.txt asks for Crawl-delay: 10, which
common.get() honours.

Kept: Opéra, Concert, Récital and Jeune public (children's opera) productions at the Opéra.
Skipped: ballet, "Médiation culturelle" (talks, backstage tours, workshops), subscriptions,
and the touring "Route Lyrique" until its venues are published.
"""
from __future__ import annotations

import html as _html
import re
from datetime import date

from common import (BudgetExceeded, FetchError, clean, get, log, looks_cancelled, make_event,
                    requests_left, to_zurich_iso, today_zurich)

KEY = 'opera_lausanne'
NAME = 'Opéra de Lausanne'
SITE = 'https://www.opera-lausanne.ch/'
ATTRIBUTION = 'Source: Opéra de Lausanne (opera-lausanne.ch)'
KIND = 'venue'
MAX_REQUESTS = 40
TIME_LIMIT = 900          # Crawl-delay 10 s: ~15 requests take ~2.5 minutes

BASE = 'https://www.opera-lausanne.ch'
CITY = 'Lausanne'
VENUE = 'Opéra de Lausanne'

# season-page category class -> Klang type (None = skip the production)
CATEGORIES = {
    'opera': 'vocal-opera',
    'concerts': None,          # decided per show (mostly vocal at an opera house)
    'recital': 'recital',
    'jeune-public': 'vocal-opera',
}
SKIP_CATEGORIES = {'ballet', 'conference', 'mediation', 'route-lyrique'}

MONTHS = {
    'janvier': 1, 'fevrier': 2, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6,
    'juillet': 7, 'aout': 8, 'août': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11,
    'decembre': 12, 'décembre': 12,
}
MONTHS_SHORT = {
    'jan': 1, 'fév': 2, 'fev': 2, 'feb': 2, 'mars': 3, 'mar': 3, 'avr': 4, 'apr': 4, 'mai': 5,
    'may': 5, 'juin': 6, 'jun': 6, 'juil': 7, 'jul': 7, 'août': 8, 'aout': 8, 'aug': 8,
    'sep': 9, 'sept': 9, 'oct': 10, 'nov': 11, 'déc': 12, 'dec': 12,
}

# cast roles: production team members that are not performers are left out
STAFF_ROLES = re.compile(
    r'^(d[ée]cors?|costumes?|lumi[eè]res?|dramaturgie|sc[ée]nographie|vid[ée]o|chor[ée]graphie|'
    r'assistant|collaboration|cr[ée]ation|conception|maquillage|perruques|son\b|surtitres?|'
    r'r[ée]alisation|r[ée]gie|production|coproduction|traduction|livret|[ée]ditions?|'
    r'arrangement|orchestration|dispositif|accessoires)', re.I)
ROLE_MAP = [
    (r'^direction musicale|^direction$|^chef d.orchestre|^cheffe d.orchestre', 'Conductor'),
    (r'^mise en sc[eè]ne|^mise en espace', 'Stage director'),
    (r'^(chef|cheffe) (de|du) ch(œ|oe)ur|^direction (de|du) ch(œ|oe)ur', 'Chorus master'),
    (r'^piano(forte)?$', 'Piano'), (r'^violon$', 'Violin'), (r'^violoncelle$', 'Cello'),
    (r'^clavecin$', 'Harpsichord'), (r'^harpe$', 'Harp'), (r'^guitare$', 'Guitar'),
    (r'^r[ée]citant(e)?$', 'Narrator'),
]
VOICES = [
    (r'^soprano$', 'Soprano'), (r'^mezzo-?soprano$', 'Mezzo-soprano'), (r'^(contr)?alto$', 'Alto'),
    (r'^t[ée]nor$', 'Tenor'), (r'^baryton$', 'Baritone'), (r'^baryton-basse$', 'Bass-baritone'),
    (r'^basse$', 'Bass'), (r'^contre-?t[ée]nor$', 'Countertenor'), (r'^piano$', 'Piano'),
    (r'^violon$', 'Violin'), (r'^violoncelle$', 'Cello'),
]
GROUP_RE = re.compile(r'(orchestr|sinfoniett|ensemble|ch(œ|oe)ur|\bch(oe|œ)rs?\b|ma[iî]trise|'
                      r'musiciens|quatuor|consort|camerata|choir|chorus|coro\b|cappella)', re.I)
CHOIR_RE = re.compile(r'(ch(œ|oe)ur|ma[iî]trise|choir|chorus|\bcoro\b|vokal|cappella)', re.I)
ORCH_RE = re.compile(r'(orchestr|sinfoniett|musiciens|philharm|symphon|camerata)', re.I)

SMALL_WORDS = {'de', 'du', 'des', 'la', 'le', 'les', 'et', 'à', 'au', 'aux', 'en', 'sur', 'pour',
               'par', 'un', 'une', 'ou', 'von', 'van', 'der', 'di', 'da', 'del', 'della', 'y'}


# ---------------------------------------------------------------------------
# small text helpers
# ---------------------------------------------------------------------------

def _text(fragment) -> str:
    return clean(fragment or '')


def _is_shouting(s) -> bool:
    letters = [c for c in s if c.isalpha()]
    return bool(letters) and sum(c.isupper() for c in letters) / len(letters) > 0.8


def _cap(word):
    return '-'.join(p[:1].upper() + p[1:].lower() for p in word.split('-'))


def smart_case(s) -> str:
    """'LES CAPULET ET LES MONTAIGU' -> 'Les Capulet et les Montaigu' (only for all-caps text)."""
    if not _is_shouting(s):
        return s
    out = []
    for i, w in enumerate(s.split()):
        lw = w.lower()
        m = re.match(r"^([dl])['’](.+)$", lw)
        if re.fullmatch(r'[IVXLC]+', w) and len(w) <= 4 and lw not in ('vil', 'mil', 'cil'):
            out.append(w)
        elif m:
            out.append((m.group(1).upper() if i == 0 else m.group(1)) + "'" + _cap(m.group(2)))
        elif i > 0 and lw in SMALL_WORDS:
            out.append(lw)
        else:
            out.append(_cap(w))
    return ' '.join(out)


def _fold(s):
    import unicodedata
    s = unicodedata.normalize('NFKD', s or '')
    return re.sub(r'[^a-z0-9]+', ' ', ''.join(c for c in s if not unicodedata.combining(c)).lower()).strip()


def _composer(line):
    """'Benjamin Britten (1913-1976)' -> 'Benjamin Britten'; '' when the line is not a composer."""
    m = re.match(r"^\s*(.+?)\s*\(\s*\d{4}\s*(?:[-–]\s*\d{0,4}\s*)?\)\s*$", line or '')
    return m.group(1).strip() if m else ''


def _map_role(role, table):
    r = role.strip().lower()
    for rx, out in table:
        if re.search(rx, r):
            return out
    return None


def _group_role(name):
    if CHOIR_RE.search(name):
        return 'Choir'
    if ORCH_RE.search(name):
        return 'Orchestra'
    return 'Ensemble'


# ---------------------------------------------------------------------------
# season page
# ---------------------------------------------------------------------------

def _season_label(today: date) -> str:
    start = today.year if today.month >= 8 else today.year - 1
    return f'{start}-{(start + 1) % 100:02d}'


def _teasers(page):
    """Yield dicts for every show-teaser on a season page."""
    parts = re.split(r'<div class="show-teaser ', page)[1:]
    for p in parts:
        classes = p[:p.find('"')].split()
        href = re.search(r'href="(https?://[^"]*/show/[^"]+)"', p)
        title = re.search(r'show-teaser__title">(.*?)</div>', p, re.S)
        if not href or not title:
            continue
        composers = [_text(x) for x in re.findall(r'show-teaser__composer">(.*?)</div>', p, re.S)]
        months = [_text(x) for x in re.findall(r'date__month">(.*?)</div>', p, re.S)]
        days = [_text(x) for x in re.findall(r'date__bubble">(.*?)</div>', p, re.S)]
        yield {
            'classes': classes,
            'url': _html.unescape(href.group(1)),
            'title': _text(title.group(1)),
            'composers': [c for c in composers if c],
            'last_month': months[-1] if months else None,
            'last_day': days[-1] if days else None,
        }


def _last_date(teaser, season):
    """Last performance date shown on the teaser, or None when it cannot be read."""
    try:
        start_year = int(season[:4])
        month = MONTHS_SHORT.get(_fold(teaser['last_month']).split()[0][:4]) or \
            MONTHS_SHORT.get(_fold(teaser['last_month'])[:3])
        day = int(re.sub(r'\D', '', teaser['last_day']))
        if not month:
            return None
        return date(start_year if month >= 8 else start_year + 1, month, day)
    except (TypeError, ValueError, IndexError, AttributeError):
        return None


# ---------------------------------------------------------------------------
# show page
# ---------------------------------------------------------------------------

def _performances(page):
    """[(start_iso, ticket_url, cancelled)] from the date-booking blocks of a show page."""
    out, seen = [], set()
    blocks = re.split(r'<div class="date-booking date-booking--', page)[1:]
    for b in blocks:
        b = b[:4000]
        day = re.search(r'date-booking__number">\s*(\d{1,2})', b)
        month = re.search(r'date-booking__month">\s*([^<]+?)\s*</div>', b)
        tm = re.search(r'date-booking__time">\s*(\d{1,2})\s*[:hH.]\s*(\d{2})', b)
        if not (day and month and tm):
            continue
        mm = re.match(r'([^\d\s]+)\s+(\d{4})', _text(month.group(1)).lower())
        if not mm or mm.group(1) not in MONTHS:
            continue
        try:
            d = date(int(mm.group(2)), MONTHS[mm.group(1)], int(day.group(1)))
            start = to_zurich_iso(f'{d.isoformat()}T{int(tm.group(1)):02d}:{tm.group(2)}:00')
        except ValueError:
            continue
        if start in seen:
            continue
        seen.add(start)
        ticket = re.search(r'href="(https?://[^"]+)"[^>]*class="btn date-booking__button', b) or \
            re.search(r'class="btn date-booking__button[^"]*"[^>]*href="(https?://[^"]+)"', b) or \
            re.search(r'href="(https?://[^"]*secutix[^"]*)"', b)
        block_text = _text(b[:b.find('</a>') if '</a>' in b else len(b)])
        out.append((start, _html.unescape(ticket.group(1)) if ticket else None, looks_cancelled(block_text)))
    return out


def _duration(page):
    """'Durée : 1h50' -> 110 (minutes), or None."""
    hours = re.search(r'show-hero__hours">(.*?)</div>', page, re.S)
    m = re.search(r'Dur[ée]e\s*:\s*(\d{1,2})\s*h\s*(\d{0,2})', _text(hours.group(1)) if hours else '')
    return int(m.group(1)) * 60 + int(m.group(2) or 0) if m else None


def _cast(page):
    """Credits from the 'Distribution' section: [(role, name)]."""
    i = page.find('id="distribution"')
    if i < 0:
        return []
    seg = page[i:]
    end = min([x for x in (seg.find('id="medias"'), seg.find('<footer')) if x > 0] or [len(seg)])
    seg = seg[:end]
    credits = []
    for m in re.finditer(r'<div class="casting"[^>]*>(.*?)(?=<div class="casting[" ]|<div class="casting-list|$)', seg, re.S):
        block = m.group(1)
        role = re.search(r'casting__role">(.*?)</div>', block, re.S)
        name = re.search(r'casting__name">(.*?)</div>', block, re.S)
        role = _text(role.group(1)) if role else ''
        if not name:
            continue
        raw = re.split(r'<br\s*/?>', name.group(1))[0]          # drop footnotes after <br>
        names = [n.strip(' *') for n in re.split(r'\s*/\s*', _text(raw).replace('*', '')) if n.strip(' *')]
        if not role:
            for n in names:
                is_group = GROUP_RE.search(n) or re.match(r"^(les|le|la|l['’]|the|i|il|gli)\s", n, re.I)
                credits.append((_group_role(n) if is_group else 'Performer', n))
            continue
        if STAFF_ROLES.search(role):
            continue
        extra = None
        both = re.match(r'^direction(?: musicale)?\s+et\s+(.+)$', role, re.I)
        if both:                                   # "Direction musicale et violon"
            mapped = 'Conductor'
            extra = _map_role(both.group(1), VOICES)
        else:
            mapped = _map_role(role, ROLE_MAP)
        for n in names:
            credits.append((mapped or role, n))
            if extra:
                credits.append((extra, n))
    # orchestra / choir (and chorus master) given as a centred note at the end of the cast,
    # one per line: "Orchestre de Chambre de Lausanne<br>Chœur de l'Opéra de Lausanne<br>
    # <strong>Chef de chœur</strong> Jacopo Facchini"
    for note in re.findall(r'<div class="casting-info">(.*?)</div>', seg, re.S):
        for para in re.findall(r'<p[^>]*>(.*?)</p>', note, re.S) or [note]:
            for line in re.split(r'<br\s*/?>', para):
                t = _text(line)
                if not t or len(t) > 90:
                    continue
                cm = re.match(r'^(?:chef|cheffe)\s+(?:de|du)\s+ch(?:œ|oe)urs?\s*:?\s*(.+)$', t, re.I)
                if cm:
                    credits.append(('Chorus master', cm.group(1).strip()))
                elif GROUP_RE.search(t) and not re.match(
                        r'^(premi[eè]re|[ée]ditions?|traduction|cr[ée]ation|nouvelle production|coproduction|'
                        r'production|en partenariat|avec le soutien|©)', t, re.I):
                    credits.append((_group_role(t), t))
    return credits


def _recital_credits(title, composer_line, hero_text):
    credits = []
    performer = re.sub(r'^\s*r[ée]cital\s+', '', title, flags=re.I).strip()
    voice = _map_role(composer_line or '', VOICES)
    if performer and performer.lower() != title.lower():
        credits.append((voice or 'Performer', performer))
    for m in re.finditer(r"avec\s+(.+?)\s+(?:au|à la|aux)\s+(piano|violon|violoncelle|clavecin|harpe|guitare)",
                         hero_text or '', re.I):
        credits.append((_map_role(m.group(2), VOICES) or 'Performer', m.group(1).strip()))
    return credits


def _recital_program(hero_text):
    """'Vaughan Williams, Dove, Schönberg, Mahler' -> composer-only programme entries."""
    t = (hero_text or '').strip()
    if not t or re.search(r'\d|[.;:!?]', t):
        return []
    parts = [p.strip() for p in re.split(r',|\bet\b|&', t) if p.strip()]
    if not parts or any(len(p.split()) > 3 or not p[:1].isupper() for p in parts):
        return []
    return [(p, '') for p in parts]


# ---------------------------------------------------------------------------
# fetch
# ---------------------------------------------------------------------------

def fetch():
    today = today_zurich()
    season = _season_label(today)
    try:
        first = get(f'{BASE}/season/{season}/')
    except BudgetExceeded:
        raise
    except FetchError as e:
        if e.status != 404:
            raise                         # let a failure of the main listing propagate
        # early August: the new season's page may not exist yet, so read the previous one
        season = f'{int(season[:4]) - 1}-{int(season[:4]) % 100:02d}'
        first = get(f'{BASE}/season/{season}/')
    pages = [(season, first)]
    i = first.find('season-nav__control--next')
    nxt = re.search(r'href="(https?://[^"]*/season/(\d{4}-\d{2})/)"', first[i:i + 800]) if i >= 0 else None
    if nxt and nxt.group(2) > season:
        try:
            pages.append((nxt.group(2), get(nxt.group(1))))
        except FetchError as e:
            log.warning('%s: next season page %s: %s', KEY, nxt.group(1), e)

    # proper-case titles from the mediation teasers ("Le Tour d'écrou") to fix ALL-CAPS titles
    case_map = {}
    shows, seen_urls = [], set()
    for season_label, page in pages:
        for t in _teasers(page):
            if not _is_shouting(t['title']):
                case_map.setdefault(_fold(t['title']), t['title'])
            cats = set(t['classes'])
            if cats & SKIP_CATEGORIES or not (cats & set(CATEGORIES)):
                continue
            if t['url'] in seen_urls:
                continue
            last = _last_date(t, season_label)
            if last is not None and last < today:
                continue
            seen_urls.add(t['url'])
            shows.append((t, cats))

    events = []
    for t, cats in shows:
        if requests_left() <= 0:
            log.warning('%s: request budget used up, %s not fetched', KEY, t['url'])
            break
        try:
            page = get(t['url'])
        except BudgetExceeded:
            log.warning('%s: budget exhausted before %s', KEY, t['url'])
            break
        except FetchError as e:
            log.warning('%s: %s: %s', KEY, t['url'], e)
            continue
        try:
            events.extend(_show_events(t, cats, page, case_map, today))
        except Exception as e:  # one odd page must not lose the rest
            log.warning('%s: could not read %s: %s', KEY, t['url'], e)
    return events


def _show_events(t, cats, page, case_map, today):
    slug = t['url'].rstrip('/').rsplit('/', 1)[-1]
    title = case_map.get(_fold(t['title'])) or smart_case(t['title'])
    composer_line = t['composers'][0] if t['composers'] else ''
    composer = _composer(composer_line)
    hero_fat = re.search(r'show-hero__text show-hero__text--fat">(.*?)</div>', page, re.S)
    hero = re.search(r'<div class="show-hero__text">(.*?)</div>', page, re.S)
    hero_fat = _text(hero_fat.group(1)) if hero_fat else ''
    hero = _text(hero.group(1)) if hero else ''

    if 'recital' in cats:
        kind = 'recital'
        credits = _recital_credits(title, composer_line, hero_fat)
        program = _recital_program(hero)
    else:
        kind = CATEGORIES.get(next((c for c in cats if c in CATEGORIES), ''), None) or 'vocal-opera'
        credits = _cast(page)
        program = [(composer, title)] if composer else []
    series = None
    if 'jeune-public' in cats:
        series = 'Jeune public'
    elif 'concerts' in cats and re.search(r'version concert', hero_fat, re.I):
        series = 'Opéra en version concert'
    elif 'recital' not in cats and composer_line and not composer:
        series = composer_line                 # e.g. "Finale régionale du concours de chant"

    duration = _duration(page)
    out = []
    for start, ticket, cancelled in _performances(page):
        if start[:10] < today.isoformat():
            continue
        try:
            out.append(make_event(
                KEY, f'{slug}-{start[:16].replace("-", "").replace(":", "").replace("T", "-")}', title, start,
                durationMin=duration, city=CITY, venueName=VENUE, type=kind, series=series,
                credits=credits, program=program, ticketUrl=ticket or None, url=t['url'],
                status='cancelled' if cancelled else None))
        except ValueError as e:
            log.warning('%s: skipped %s %s: %s', KEY, slug, start, e)
    if not out and not _performances(page):
        log.info('%s: %s lists no dated performances yet', KEY, t['url'])
    return out
