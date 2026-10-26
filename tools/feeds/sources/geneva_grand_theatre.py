"""Grand Théâtre de Genève: its operas, concerts and recitals, from gtg.ch, completed by the
Ville de Genève agenda (open data).

1. gtg.ch (WordPress). The production pages of the current and the next season are the
   children of the season page ('/saison-26-27/'); one REST call returns them all with their
   content HTML. Each page has the list of performances (weekday, day, month, time and the
   ticketing perfId; the year is inferred from the weekday and the years the page names),
   an 'Infos et distribution' block ('**Direction musicale** Name', '**Figaro** Name',
   recitals as '**Name**, role', 'Au Bâtiment des Forces Motrices', 'Durée 3h30') and, for
   some recitals, a 'Programme' list. Kept: pages in the Opéra, Récital or Concert
   categories (and uncategorised pages that read as an opera or concert, e.g. a concert
   version co-produced with another house). Dropped: dance, L'Autre Scène / young audience
   and GT Autrement (talks, tours, parties).
2. OpenAgenda agenda 92123953 (the city's 'Agenda du Grand Théâtre' on opendata.swiss, open
   licence, source must be given). Its events link to the gtg.ch page; an OpenAgenda timing
   that gtg.ch also lists is dropped (gtg.ch has the full cast), the others are kept.

Co-productions at La Cité Bleue are left to the cite_bleue reader.
Ids follow the Geneva rule (_geneva.stable_ids): '<slug>-YYYYMMDD' for gtg.ch performances
(plus '-HHMM' when a production plays twice that day), '<OpenAgenda uid>-YYYYMMDD' for
listings only OpenAgenda has. The OSR and the OCG list the productions they play in; the
build merges those (same city, venue and start).
Only facts are read: no synopsis, essay, quote or image.
"""
from __future__ import annotations

import html as htmllib
import re
from datetime import date, datetime, timedelta

from common import (FetchError, ZURICH, clean, get_json, log, looks_cancelled, make_event, to_zurich_iso,
                    today_zurich)
from ._geneva import (concert_type, duration_minutes, fold, fr_month, group_role, looks_like_name, oa_tags, oa_text,
                      on_date, openagenda_events, parse_programme_markdown, stable_ids)
from .geneva_victoria_hall import convert

KEY = 'geneva_grand_theatre'
NAME = 'Grand Théâtre de Genève'
SITE = 'https://www.gtg.ch/'
ATTRIBUTION = ('Source: Grand Théâtre de Genève (gtg.ch); Ville de Genève – Agenda du Grand Théâtre de Genève '
               '(opendata.swiss, via OpenAgenda; licence: open use, source must be given).')
KIND = 'venue'
MAX_REQUESTS = 10
TIME_LIMIT = 240

AGENDA_UID = 92123953
WP = 'https://www.gtg.ch/wp-json/wp/v2/pages'

# WordPress category ids (French and English twins) of www.gtg.ch
_MUSIC_CATS = {311, 329, 313, 661, 303, 321}          # Opéra / Opera, Récital, Concert
_OPERA_CATS = {311, 329}
_RECITAL_CATS = {313, 661}
_CONCERT_CATS = {303, 321}
_OTHER_CATS = {301, 319, 657, 691,                     # Ballet, Danse
               659, 699, 307, 317,                     # L'Autre Scène, Jeune public
               665, 669, 305, 331, 333, 335, 309, 327}  # GT Autrement, infos, news, La plage

_MUSIC_TAGS = {'opera', 'concert', 'recital', 'recitals'}
_COMPOSER_RE = re.compile(r"\b(?i:op[ée]ra(?:-comique| bouffe)?|op[ée]rette|oratorio|drame lyrique|trag[ée]die lyrique|"
                          r"com[ée]die lyrique|com[ée]die musicale|th[ée][âa]tre musical|singspiel|zarzuela|"
                          r"production sc[ée]nique[^.]{0,40}?)\s+(?:de|d['’])\s*"
                          r"([A-ZÀ-Ý][\w’'.\-]+(?:\s+(?:[A-ZÀ-Ý][\w’'.\-]+|de|da|di|von|van|der|del|du|le|la)){0,4})")
_STAGE_RE = re.compile(r"\b(?i:op[ée]ra|oratorio|drame lyrique|trag[ée]die lyrique|com[ée]die lyrique|op[ée]rette|"
                       r"th[ée][âa]tre musical|com[ée]die musicale|singspiel|production sc[ée]nique)\b")
# co-productions played at a hall whose own reader lists them (La Cité Bleue gives 19:30 where
# gtg.ch says 20:00 for 'Smile!', so the build could not merge the two)
_HOSTED_ELSEWHERE = {'la cite bleue', 'cite bleue'}
_WEEKDAYS = {'lun': 0, 'mar': 1, 'mer': 2, 'jeu': 3, 'ven': 4, 'sam': 5, 'dim': 6}


# ---------------------------------------------------------------------------
# OpenAgenda (as before)
# ---------------------------------------------------------------------------

def _keep(ev, head, md, credits, program):
    tags = oa_tags(ev)
    if not tags & _MUSIC_TAGS:
        return False                                 # ballet, tours, talks, theatre ...
    if 'enfants-et-famille' in tags and 'tous-publics' not in tags:
        return False                                 # children-only shows
    if re.search(r'\b(visite|conference|atelier|rencontre|masterclass)\b', fold(head)):
        return False
    return True


_SET_OF_RE = re.compile(r"^((?i:lieder|m[ée]lodies|airs|chansons|[œo]euvres|pi[èe]ces|sonates|cantates))\s+(?:de|d['’])\s*"
                       r"([A-ZÀ-Ý][\w’'.\-]+(?:\s+(?:[A-ZÀ-Ý][\w’'.\-]+|de|da|di|von|van|der|del|du|le|la)){0,4}?)"
                       r"(\s+(?:sur|pour|d['’]apr[èe]s|extraits?)\b.*)?$")


def _program(ev, md):
    """'Opéra de Wolfgang Amadeus Mozart' (short description or a '###' heading, never the prose)
    -> [(composer, title)]. A recital's italic line '_Lieder de Franz Schubert sur des poèmes de
    J. W. von Goethe_' (before any prose) -> Schubert: 'Lieder sur des poèmes de J. W. von Goethe'."""
    headings = [l for l in md.split('\n') if l.lstrip().startswith('#')]
    for text in [oa_text(ev.get('description'))] + headings:
        m = _COMPOSER_RE.search(clean(text.replace('*', ' ').replace('#', ' ')))
        if m:
            return [{'composer': m.group(1).strip(), 'title': oa_text(ev.get('title'))}]
    for line in md.split('\n'):
        line = line.strip().rstrip('\\').strip()
        if len(clean(line)) > 110:
            break                                    # prose starts: stop
        if line.startswith('_') and line.endswith('_'):
            m = _SET_OF_RE.match(clean(line.strip('_')))
            if m:
                return [{'composer': m.group(2), 'title': f"{m.group(1)}{m.group(3) or ''}"}]
    return []


def _kind(ev, md):
    tags = oa_tags(ev)
    if 'opera' in tags:
        return 'vocal-opera'
    text = fold(f"{oa_text(ev.get('description'))} {md[:300]}")
    if 'recital' in text:
        return 'recital'
    return None


def _url(ev):
    reg = ev.get('registrationUrl') or ''
    return reg if re.match(r'https?://(www\.)?gtg\.ch/', reg) else None


def _openagenda(today):
    events = []
    for ev in openagenda_events(AGENDA_UID):
        try:
            events.extend(convert(ev, key=KEY, today=today, keep=_keep,
                                  parse_kw={'role_first_section': 'distribution'},
                                  program_hint=_program, kind_hint=_kind, url_of=_url))
        except Exception as err:                    # one odd listing must not lose the rest
            log.warning('%s: skipped event %s: %s: %s', KEY, ev.get('uid'), type(err).__name__, err)
    return events


# ---------------------------------------------------------------------------
# gtg.ch production pages
# ---------------------------------------------------------------------------

def _season_slugs(today):
    first = today.year if today.month >= 7 else today.year - 1
    return [f'saison-{y % 100:02d}-{(y + 1) % 100:02d}' for y in (first, first + 1)]


def _lines(fragment):
    """Content HTML -> text lines, bold kept as '**…**' and italics as '_…_' per line (a <strong>
    that spans a <br> is closed and reopened, so every line is self-contained)."""
    s = re.sub(r'<(script|style)\b.*?</\1>', ' ', fragment, flags=re.S | re.I)
    s = re.sub(r'<img\b[^>]*>', ' ', s, flags=re.I)
    s = re.sub(r'<br\s*/?>|</p>|<p\b[^>]*>|</?div\b[^>]*>|</?h\d\b[^>]*>|</?li\b[^>]*>', '\n', s, flags=re.I)
    s = re.sub(r'<(strong|b)\b[^>]*>', '\x01', s, flags=re.I)
    s = re.sub(r'</(strong|b)>', '\x02', s, flags=re.I)
    s = re.sub(r'<(em|i)\b[^>]*>', '\x03', s, flags=re.I)
    s = re.sub(r'</(em|i)>', '\x04', s, flags=re.I)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = htmllib.unescape(s).replace('\xa0', ' ').replace(' ', ' ')
    out, bold, ital = [], False, False
    for raw in s.split('\n'):
        line = ''
        if bold:
            line += '**'
        if ital:
            line += '_'
        for ch in raw:
            if ch == '\x01':
                if not bold:
                    line += '**'
                bold = True
            elif ch == '\x02':
                if bold:
                    line += '**'
                bold = False
            elif ch == '\x03':
                if not ital:
                    line += '_'
                ital = True
            elif ch == '\x04':
                if ital:
                    line += '_'
                ital = False
            else:
                line += ch
        if ital:
            line += '_'
        if bold:
            line += '**'
        line = re.sub(r'\s+', ' ', line).strip()
        line = line.replace('****', '').replace('** **', ' ')     # adjacent bold runs
        line = re.sub(r'\*\*\s*\*\*', ' ', line)
        line = re.sub(r'\*\*(\s+)', r'\1**', line) if line.count('**') % 2 == 0 else line
        line = re.sub(r'(?<=\S)(\s+)\*\*(?=\s|$|[,.;:])', r'**\1', line)
        line = re.sub(r'\s+', ' ', line).replace('** **', ' ').replace('__', '').strip()
        if line and line not in ('**', '_', '****'):
            out.append(line)
    return out


def _plain(line):
    return clean(line.replace('**', '').replace('_', ' '))


_ROLE_LABEL = re.compile(r"(direction( musicale| du choeur)?|chef(fe)?( d'orchestre| de choeur)?|piano|violon\w*|"
                         r"violoncelle|alto|soprano|mezzo-soprano|tenor|baryton|basse|contre-tenor|orgue|clavecin)$")
_CREATIVE_LABEL = re.compile(r"\b(sonore|son|conception|creation|production|coproduction|corealisation|surtitr\w*|"
                             r"mise en|scenograph\w*|costum\w*|lumieres?|choregraph\w*|dramaturg\w*|videos?|"
                             r"assistan\w*|collaboration|maquillage|perruques?|traduction|adaptation|livret)\b")


def _distribution_md(lines):
    """Lines of the 'Infos et distribution' block -> Markdown for parse_programme_markdown."""
    out, i = [], 0
    while i < len(lines):
        line = lines[i]
        p = fold(_plain(line))
        if re.match(r"(avec le soutien|en partenariat|partenaires?\b|mecenes?\b)", p):
            break                                                # sponsors follow
        if re.match(r"(coproduction|co-production|corealisation|production d|nouvelle production)", p):
            i += 1
            continue
        if p == 'distribution':
            out.append('### Distribution')
            i += 1
            continue
        # '**Direction musicale**' + 'Marc Leroy-Calatayud' on the next line
        m = re.fullmatch(r'\*\*([^*]+)\*\*', line)
        if m and i + 1 < len(lines) and '**' not in lines[i + 1] and looks_like_name(_plain(lines[i + 1])) \
                and len(_plain(lines[i + 1]).split()) >= 2 and _ROLE_LABEL.match(fold(m.group(1)).strip()):
            line = f'**{m.group(1).strip()}** {_plain(lines[i + 1])}'
            i += 1
        # 'direction Mark Biggins' under a choir
        m = re.fullmatch(r'(?i)(direction|chef(?:fe)? de ch(?:œ|oe)ur)\s+([A-ZÀ-Ý].+)', _plain(line))
        if m and '**' not in line and looks_like_name(m.group(2)):
            line = f'**{m.group(2)}** direction'
        # '**Pauline Buet**, violoncelle / **David Violi**, piano' -> two lines
        parts = re.split(r'\s+/\s*(?=\*\*)', line)
        for part in parts:
            bm = re.match(r'\*\*([^*]+)\*\*\s*(.*)$', part)
            if bm and _CREATIVE_LABEL.search(fold(bm.group(1))) and not bm.group(2).startswith(','):
                continue                                         # '**Création sonore** X'
            if bm and bm.group(2) and not bm.group(2).startswith(','):
                # alternating cast without dates: 'Tilo Nest / Paul Herwig' -> 'Tilo Nest | Paul Herwig'
                rest = re.sub(r'\s+/\s+', ' | ', bm.group(2))
                rest = re.sub(r'\)\s*,\s*(?=[A-ZÀ-Ý])', ') | ', rest)      # 'A (13, 15 déc.), B (18 déc.)'
                part = f'**{bm.group(1).strip()}** {rest}'
            out.append(part)
        i += 1
    return '\n'.join(out)


_VOICE_ROLES = {'Soprano', 'Mezzo-soprano', 'Contralto', 'Alto', 'Countertenor', 'Tenor', 'Baritone',
                'Bass-baritone', 'Bass'}


def _split_groups(name):
    """'Chœur du Grand Théâtre de Genève Geneva Camerata' (two groups run together on one line)
    -> ['Chœur du Grand Théâtre de Genève', 'Geneva Camerata']; anything else -> [name]."""
    words = name.split()
    for k in range(len(words) - 2, 1, -1):                       # shortest right-hand group first
        left, right = ' '.join(words[:k]), ' '.join(words[k:])
        if words[k][:1].isupper() and words[k - 1][:1].isupper() and group_role(left) and group_role(right):
            return [left, right]
    return [name]


def _fix_credits(credits):
    """French 'Alto' among other voices is the alto voice, not the viola; split run-together groups."""
    voices = {c['role'] for c in credits} & _VOICE_ROLES
    out = []
    for c in credits:
        if c['role'] == 'Viola' and len(voices) >= 2:
            c = dict(c, role='Alto')
        if c['role'] in ('Choir', 'Orchestra', 'Ensemble'):
            out.extend({'role': group_role(n) or c['role'], 'name': n} for n in _split_groups(c['name']))
            continue
        out.append(c)
    return out


def _work_lines(lines):
    """The 'Programme' list of a recital page: 'Franz Schubert (1797-1828)' + '_Ganymed_, op. 19 …'."""
    program, composer, on = [], None, False
    for line in lines:
        p = _plain(line)
        fp = fold(p)
        if not on:
            on = fp in ('programme', 'au programme')
            continue
        if re.match(r'(avec le soutien|coproduction|corealisation|partenaire)', fp) or len(p) > 160:
            break
        if fp in ('entracte', 'pause') or re.match(r'^[ivx]+\.\s', p, re.I):
            continue                                             # interval, movements of a cycle
        name = re.sub(r'\s*\(\s*(?:né[e]? en\s*)?\d{4}\s*[-–]?\s*(?:\d{4})?\s*\)\s*$', '', p).strip()
        if not line.startswith('_') and looks_like_name(name, max_words=6) and len(name.split()) >= 2:
            composer = name
            continue
        if line.startswith('_') and composer:
            title = clean(re.sub(r'(?<![\w])_|_(?![\w])', '', line.replace('**', '')))
            title = re.sub(r',\s*(?:1[6-9]|20)\d{2}\s*$', '', title).strip(' ,;')     # year of composition
            if title:
                program.append({'composer': composer, 'title': title})
    return program


def _head_work(lines, page_title):
    """(composer, work title, is_stage_work) from the head of the infos block:
    '_Le nozze di Figaro_' + 'Opéra de Wolfgang Amadeus Mozart', 'Oratorio de Georg Friedrich Haendel',
    '_Symphonie n° 9 en ré_ mineur, op. 125 de Ludwig van Beethoven',
    'Lieder de Franz Schubert sur des poèmes de J. W. von Goethe'."""
    original = None
    for line in lines[:8]:
        p = _plain(line)
        if re.match(r'\d{1,2}(er)?\b', p):                       # the dates: the head is over
            break
        if original is None and line.lstrip('*').startswith('_'):
            original = clean(re.sub(r'\([^)]*\)', '', p)).strip(' ,') or None
            if original and fold(original) == fold(page_title):
                original = None
        m = _COMPOSER_RE.search(p)
        if m:
            return m.group(1).strip(), original or page_title, True
        m = _SET_OF_RE.match(p)
        if m:
            return m.group(2), f"{m.group(1)}{m.group(3) or ''}", False
        m = re.match(r"^(.{6,120}?)\s+(?:de|d['’])\s*([A-ZÀ-Ý][\w’'.\-]+(?:\s+(?:[A-ZÀ-Ý][\w’'.\-]+|de|da|di|von|van|"
                     r"der|del|du)){1,4})$", p)
        if m and re.search(r'\b(symphonie|concerto|messe|requiem|cantate|sonate|quatuor|suite|passion|op\.|bwv|kv)\b',
                           fold(m.group(1))):
            return m.group(2), m.group(1).strip(' ,'), False
    return None, None, False


def _venue(lines):
    for line in lines:
        p = _plain(line)
        m = re.match(r"^(?:au|aux|à|a)\s+(.{3,80})$", p, re.I)
        if m and not re.search(r'\d', p):
            name = re.sub(r"^[lL]['’]\s*", '', m.group(1).strip(' .'))   # 'À l’Opéra des Nations'
            return name[:1].upper() + name[1:]
    return None


def _year(day, month, weekday, years, today):
    """Year of 'dim. 24 janv.': the weekday decides among the years around today (it repeats only
    every 5–6 years); without a weekday, the first of the page's years that is not long past."""
    candidates = sorted(set(years) | {today.year, today.year + 1})
    hits = []
    for y in candidates:
        try:
            d = date(y, month, day)
        except ValueError:
            continue
        if weekday is not None and d.weekday() != weekday:
            continue
        hits.append(d)
    if not hits:
        return None
    future = [d for d in hits if d >= today - timedelta(days=60)]
    return (future or hits)[0]


_ITEM_RE = re.compile(r'<div\b([^>]*\bclass="item[^"]*"[^>]*)>\s*<span>(.*?)</span>', re.S)


def _performances(content, years, today):
    out = []
    for attrs, label in _ITEM_RE.findall(content):
        text = clean(label)
        m = re.match(r"(?i)(lun|mar|mer|jeu|ven|sam|dim)\w*\.?\s+(\d{1,2})(?:er)?\s+([a-zéû]+)\.?\s*[-–]\s*(\d{1,2})[:h](\d{2})",
                     text)
        if not m:
            continue
        month = fr_month(m.group(3))
        if not month:
            continue
        d = _year(int(m.group(2)), month, _WEEKDAYS.get(m.group(1).lower()), years, today)
        if d is None:
            continue
        start = datetime(d.year, d.month, d.day, int(m.group(4)), int(m.group(5)), tzinfo=ZURICH)
        perf = re.search(r'perfId=(\d+)', attrs)
        url = re.search(r'data-url="([^"]+)"', attrs)
        ticket = htmllib.unescape(url.group(1)) if url else None
        if ticket and (not re.match(r'https?://', ticket) or ticket.endswith('#')):
            ticket = None
        title_attr = re.search(r'data-title="([^"]*)"', attrs)
        out.append({'start': start, 'perf': perf.group(1) if perf else None, 'ticket': ticket,
                    'cancelled': looks_cancelled(f"{text} {title_attr.group(1) if title_attr else ''}"),
                    'full': 'data-complet="1"' in attrs})
    return out


def _infos_block(content):
    """The HTML of the first 'texte main' block after the 'Infos et distribution' tab title."""
    i = content.find('Infos et distribution')
    i = content.find('Infos et distribution', i + 1) if i >= 0 else -1
    start = content.find('<div class="texte main">', i if i >= 0 else 0)
    if start < 0:
        return ''
    end = content.find('</div>', start)
    return content[start:end if end > 0 else None]


def _keep_page(page, lines, has_dates):
    cats = set(page.get('categories') or [])
    if cats & _MUSIC_CATS:
        return True
    if cats & _OTHER_CATS:
        return False
    # uncategorised: an opera / concert version with dates
    text = fold(' '.join(_plain(l) for l in lines[:12]))
    return has_dates and bool(re.search(r"\b(opera|oratorio|version de concert|recital|concert)\b", text))


def _page_events(page, today):
    content = (page.get('content') or {}).get('rendered') or ''
    title = clean(htmllib.unescape((page.get('title') or {}).get('rendered') or ''))
    slug = page.get('slug') or ''
    link = page.get('link') or None
    if not content or not title or not slug:
        return []
    block = _infos_block(content)
    lines = _lines(block)
    years = {int(y) for y in re.findall(r'\b(20\d{2})\b', ' '.join(_plain(l) for l in lines))}
    perfs = _performances(content, years, today)
    if not _keep_page(page, lines, bool(perfs)):
        log.debug('%s: skipped page %s', KEY, slug)
        return []
    perfs = [p for p in perfs if p['start'].date() >= today]
    if not perfs:
        return []
    credits, program = parse_programme_markdown(_distribution_md(lines), role_first_section='distribution')
    credits = [c for c in credits if not _CREATIVE_LABEL.search(fold(c['role']))]
    composer, work, stage = _head_work(lines, title)
    head = [{'composer': composer, 'title': work or title}] if composer else []
    program = _work_lines(lines) or head or program
    credits = _fix_credits(credits)
    cats = set(page.get('categories') or [])
    if cats & _CONCERT_CATS:
        kind = 'orchestral' if any(c['role'] == 'Orchestra' or 'Conductor' in c['role'] for c in credits) \
            else concert_type(title, credits, program)
    elif cats & _OPERA_CATS or stage:
        kind = 'vocal-opera'
    elif cats & _RECITAL_CATS:
        kind = 'recital'
    else:
        kind = concert_type(title, credits, program)
    venue = _venue(lines) or 'Grand Théâtre de Genève'
    if fold(venue) in _HOSTED_ELSEWHERE:
        log.debug('%s: %s is listed by its host venue', KEY, slug)
        return []
    minutes = duration_minutes(' '.join(_plain(l) for l in lines))
    stable_ids(perfs, key=lambda r: slug)
    out = []
    for p in perfs:
        try:
            out.append(make_event(
                KEY, p['sid'], title, to_zurich_iso(p['start']),
                durationMin=minutes, city='Genève', venueName=venue, type=kind,
                credits=on_date(credits, p['start']), program=program,
                ticketUrl=p['ticket'] or link, url=link,
                status='cancelled' if p['cancelled'] else None))
        except ValueError as err:
            log.warning('%s: skipped %s %s: %s', KEY, slug, p['start'], err)
    return out


def _gtg(today):
    seasons = get_json(f"{WP}?slug={','.join(_season_slugs(today))}&_fields=id,slug,link")
    if not isinstance(seasons, list) or not seasons:
        raise FetchError(WP, 'no season page found')
    events = []
    for season in seasons:
        pages = get_json(f"{WP}?parent={int(season['id'])}&per_page=100"
                         f"&_fields=id,slug,link,title,categories,content")
        if not isinstance(pages, list):
            raise FetchError(WP, f"unexpected answer for season {season.get('slug')}")
        for page in pages:
            try:
                events.extend(_page_events(page, today))
            except Exception as err:                # one odd page must not lose the rest
                log.warning('%s: skipped page %s: %s: %s', KEY, page.get('slug'), type(err).__name__, err)
    return events


def _path(url):
    m = re.match(r'https?://(?:www\.)?gtg\.ch(/[^?#]*)', url or '')
    return m.group(1).rstrip('/') if m else None


def fetch():
    today = today_zurich()
    events = _gtg(today)                            # FetchError propagates: build reuses yesterday
    try:
        agenda = _openagenda(today)
    except FetchError as err:                       # gtg.ch already has the house's own listings
        log.warning('%s: OpenAgenda export failed, gtg.ch only: %s', KEY, err)
        agenda = []
    # an OpenAgenda timing that gtg.ch lists too (same page, start within 20 minutes) is dropped
    seen = [(_path(e.get('url')), datetime.fromisoformat(e['start'])) for e in events]
    for ev in agenda:
        path, start = _path(ev.get('url')), datetime.fromisoformat(ev['start'])
        dup = any(abs((start - s).total_seconds()) <= 1200 and (path is None or p is None or p == path)
                  for p, s in seen)
        if not dup:
            events.append(ev)
    if not events:
        raise FetchError(SITE, 'no performances found on gtg.ch or OpenAgenda')
    return events
