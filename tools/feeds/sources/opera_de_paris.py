"""Opéra national de Paris (Palais Garnier, Opéra Bastille): operas, ballets with the house
orchestra, concerts and recitals.

    https://www.operadeparis.fr/ajax/programming/saison-26-27?page=N         season listing (JSON)
    https://www.operadeparis.fr/saison-26-27/<genre>/<slug>/performances     a show's performances (JSON)
    https://www.operadeparis.fr/saison-26-27/<genre>/<slug>                  a show's page (cast)

The programme page is filled by the site's script from ``/ajax/programming/<season>``
(24 shows a page, ``meta.pagination``) with each show's genre ("Opéra", "Ballet", "Concert
et Récital", "Répétition", "Rencontre", "Jeune Public" …), title, subtitle (composer or
choreographers), venue and link. Each show's performances come from the JSON its page
asks for (``data-fetch-url`` = the show URL + ``/performances``): weekday, day, month
name and time ("vendredi", "27", "novembre", "19h30"), the venue and tags ("Première",
"Complet", "Dernière" …). The year is not given; it is the one in the season whose weekday
matches (checked against the website on 29 Oct 2026: Turandot, 11 performances 27 Nov –
27 Dec 2026 at the Opéra Bastille, 19h30 and Sunday 14h30). The listing and every show's
performances are read on every run.

The show page gives the cast ("team-list__item-name" / "-role", per section "Équipe
artistique" / "Distribution"), singers' date ranges ("(27 nov. > 12 déc.)": a singer is
credited only on the dates of their range), the ensembles in the note under the cast
("Orchestre et Chœurs de l'Opéra national de Paris") and, for a recital, the works
("Déroulé du concert"). Show pages are large and read incrementally: a performance the
previous feed already has with its cast (same id, start and title) keeps it; the requests
left (cap 150) go to shows with a performance still missing its cast, soonest first, then
to shows playing within two weeks and a fixed share of the others (each about once a
week). robots.txt asks for a Crawl-delay of 5 seconds, so a full run takes about 10
minutes.

Ballets are kept only when their page credits a conductor or the orchestra ("Direction
musicale", "Orchestre de l'Opéra"); until the page has been read once, a ballet is left
out. Skipped: public rehearsals, talks ("Toï toï toï"), young-audience shows and
workshops, guided tours, cinema/streaming, exhibitions, the dance school's demonstrations
and performances abroad.
"""
from __future__ import annotations

import re
from datetime import date

from common import BudgetExceeded, FetchError, clean, event_id, get, get_json, log, looks_cancelled, make_event, \
    previous_event, refresh_due, requests_left, today_zurich

from ._paris import WEEKDAYS, abroad, credit, fold, group_role, is_not_a_concert, month_number, paris_iso, town_in

KEY = 'opera_de_paris'
NAME = 'Opéra national de Paris'
SITE = 'https://www.operadeparis.fr/'
ATTRIBUTION = 'Source: Opéra national de Paris (operadeparis.fr)'
KIND = 'venue'
COUNTRY = 'france'
MAX_REQUESTS = 150
TIME_LIMIT = 1200
REFRESH_NEAR_DAYS = 14
REFRESH_EVERY_DAYS = 7

BASE = 'https://www.operadeparis.fr'
LISTING = BASE + '/ajax/programming/{season}?page={page}'
CITY = 'Paris'

_KEEP_GENRES = re.compile(r'(?i)^(?:op[ée]ra|ballet|concert|r[ée]cital|acad[ée]mie)')
_SKIP_TITLE = re.compile(r"(?i)r[ée]p[ée]tition|toï toï|toi toi|d[ée]monstrations? de l.[ée]cole|visite|conf[ée]rence|"
                         r"rencontre|atelier|cin[ée]ma|projection|exposition|gala d.ouverture|soir[ée]e de gala|"
                         r"parle-moi|mes parents et moi|jeune public|spectacle de l.[ée]cole de danse")
_VENUES = (
    (r'garnier', 'Palais Garnier'),
    (r'amphith[ée][âa]tre', 'Opéra Bastille, Amphithéâtre Olivier Messiaen'),
    (r'studio', 'Opéra Bastille, Studio'),
    (r'bastille', 'Opéra Bastille'),
)


# ---------------------------------------------------------------------------
# listing and performances
# ---------------------------------------------------------------------------

def _seasons(today):
    first = today.year if today.month >= 8 else today.year - 1
    return [f'saison-{first % 100:02d}-{(first + 1) % 100:02d}', f'saison-{(first + 1) % 100:02d}-{(first + 2) % 100:02d}']


def parse_listing(data):
    """-> (list of show dicts, total pages) from one /ajax/programming answer."""
    shows = []
    blocks = data.get('data') or []
    if isinstance(blocks, dict):
        blocks = list(blocks.values())
    for blk in blocks:
        items = list(blk.get('shows') or [])
        if blk.get('featured_show'):
            items.append(blk['featured_show'])
        for s in items:
            if isinstance(s, dict) and s.get('full_url'):
                shows.append({'id': str(s.get('id') or s.get('slug')), 'url': s['full_url'], 'title': clean(s.get('title')),
                              'subtitle': clean(s.get('sub_title')), 'genre': clean(s.get('genre')),
                              'sub_genre': clean(s.get('sub_genre')), 'venue': clean(s.get('venue')),
                              'season': s.get('season') or ''})
    pages = ((data.get('meta') or {}).get('pagination') or {}).get('total_pages') or 1
    return shows, int(pages)


def parse_performances(data, season):
    """-> list of {perf, date:(y,m,d), time:(h,m), venue, tags} from a show's /performances JSON."""
    out = []
    first = 2000 + int(season[:2]) if re.match(r'\d\d-\d\d', season or '') else today_zurich().year
    for r in ((data.get('body') or {}).get('rows') or []):
        d = r.get('date') or {}
        mo = month_number(d.get('month') or '')
        tm = re.search(r'(\d{1,2})\s*h\s*(\d{2})?', d.get('time') or '')
        try:
            day = int(d.get('dayNumber'))
        except (TypeError, ValueError):
            continue
        if not (mo and tm):
            continue
        wd = WEEKDAYS.get(fold(d.get('day') or '').strip())
        year = None
        for y in (first, first + 1, first + 2):
            try:
                cand = date(y, mo, day)
            except ValueError:
                continue
            if (wd is None and ((y == first and mo >= 8) or (y == first + 1 and mo < 8))) or \
                    (wd is not None and cand.weekday() == wd):
                year = y
                break
        if year is None:
            continue
        out.append({'perf': str(r.get('perfId') or r.get('dailyId')), 'date': (year, mo, day),
                    'time': (int(tm.group(1)), int(tm.group(2) or 0)),
                    'venue': clean((r.get('venue') or {}).get('text')),
                    'tags': [clean(t.get('text')) for t in r.get('tags') or [] if isinstance(t, dict) and t.get('text')]})
    return out


# ---------------------------------------------------------------------------
# show page
# ---------------------------------------------------------------------------

_RANGE_RE = re.compile(r'\(\s*(\d{1,2})\s*([a-zéû]+)?\.?\s*(?:>\s*(\d{1,2})\s*([a-zéû]+)?\.?)?\s*\)')


def _range(text, year_of):
    """'(27 nov. > 12 déc.)' / '(15 > 27 déc.)' / '(3 janv.)' -> (date_from, date_to) or None."""
    m = _RANGE_RE.search(fold(text))
    if not m:
        return None
    d1, m1, d2, m2 = m.groups()
    mo2 = month_number(m2) if m2 else None
    mo1 = month_number(m1) if m1 else mo2
    if not mo1:
        return None
    if not d2:
        mo2, d2 = mo1, d1
    try:
        a = date(year_of(mo1), mo1, int(d1))
        b = date(year_of(mo2 or mo1), mo2 or mo1, int(d2))
    except ValueError:
        return None
    return a, b


def parse_show(page):
    """-> {'people': [(section, name, role, range_text)], 'notes': [lines], 'works': [(composer, work)]}."""
    h = page or ''
    out = {'people': [], 'notes': [], 'works': []}
    casting = h[h.find('data-behavior="casting/main"'):] if 'data-behavior="casting/main"' in h else ''
    casting = casting[:casting.find('<section')] if '<section' in casting else casting
    for part in re.split(r'<p class="team-type[^"]*">', casting)[1:]:
        section = clean(part[:part.find('</p>')])
        for name, role, rng in re.findall(r'<span class="team-list__item-name">(.*?)</span>.*?'
                                          r'<span class="team-list__item-role">(.*?)</span>'
                                          r'(?:\s*<span class="team-list__item-date">(.*?)</span>)?', part, re.S):
            if clean(name):
                out['people'].append((section, clean(name), clean(role), clean(rng)))
    note = re.search(r'<p class="component-annotations__text[^"]*"[^>]*>(.*?)</p>', casting, re.S)
    if note:
        out['notes'] = [clean(x) for x in re.split(r'(?i)<br\s*/?>', note.group(1)) if clean(x)]
    for seq in re.findall(r'<div class="work-sequences[^"]*">(.*?)</div>\s*</div>', casting, re.S):
        kind = re.search(r'work-type">(.*?)</p>', seq, re.S)
        if not kind or not re.search(r'(?i)d[ée]roul[ée]|programme', clean(kind.group(1))):
            continue
        for title in re.findall(r'work-title">(.*?)</p>', seq, re.S):
            t = clean(title)
            m = re.search(r"(?:\bde|d['’])\s*([A-ZÉ][\w'’ .-]+)$", t)
            composer = m.group(1).strip() if m else ''
            notes = [clean(x) for x in re.split(r'(?i)<br\s*/?>|</p>', ''.join(re.findall(r'work-note">(.*?)(?:</div>|$)',
                                                                                         seq, re.S))) if clean(x)]
            if composer:
                out['works'] += [(composer, n) for n in notes] or [(composer, t[:m.start()].strip())]
            elif '/' in t and not notes:
                for c in re.split(r'\s*/\s*', t):          # 'Maurice Ravel / Thomas Adès / Edward Elgar'
                    if c:
                        out['works'].append((c, ''))
        break
    return out


def credits_for(show, perf_date, year_of, genre, title):
    """Credits and works for one performance (singers only within their date range)."""
    credits, composers = [], []
    for section, name, role, rng in show['people']:
        fr = fold(role)
        if re.search(r'^musique$|compositeur|compositrice|composition', fr):
            composers.append(name)
            continue
        if re.search(r'livret|librett|chor[ée]graph|mise en sc|d[ée]cors|costumes|lumi[èe]res|vid[ée]o|dramaturg|'
                     r'maquillage|assistant|conception|sc[ée]nograph|^d.apres|texte|son$', fr):
            continue
        if '(' in name:                                     # an artwork credited in the cast
            continue
        if rng:
            r = _range(rng, year_of)
            if r and not (r[0] <= perf_date <= r[1]):
                continue
        c = credit(name, role)
        if c and c[0] not in ('Director', 'Choreographer', 'Composer'):
            credits.append(c)
    for line in show['notes']:
        if re.search(r'(?i)production|coproduction|partenariat|avec le soutien|m[ée]c[ée]nat|surtitr|dur[ée]e|enregistr', line):
            continue
        for part in re.split(r'\s+/\s+', line):            # 'ADO / Maîtrise de l'Opéra national de Paris'
            part = re.sub(r"(?i)^avec\s+(?:l['’]|le |la |les )?", '', part).strip()     # "Avec l'Orchestre de …"
            part = part[:1].upper() + part[1:]
            g = group_role(part)
            if g and len(part) < 120:
                credits.append((g, part))
    if re.match(r'(?i)ballet', genre):                     # dancers are not credited, only the music
        credits = [(r, n) for r, n in credits if r in ('Conductor', 'Orchestra', 'Choir', 'Chorus master')]
    works = list(show['works'])
    if not works and len(composers) == 1 and re.match(r'(?i)op[ée]ra', genre):
        works = [(c, title) for c in composers]
    elif not works and composers:
        works = [(c, '') for c in composers]
    return credits, works


def _venue(text):
    f = fold(text)
    for rx, name in _VENUES:
        if re.search(rx, f):
            return name, CITY
    if abroad(text):
        return text, None
    paris = re.search(r"(?i)philharmonie|paris|maison de la radio|ath[ée]n[ée]e|ch[âa]telet|champs-[ée]lys[ée]es|"
                      r"op[ée]ra-comique|bouffes du nord", text or '')
    return text or 'Opéra national de Paris', town_in(text) or (CITY if paris else None)


def _type(genre, credits):
    g = fold(genre)
    if g.startswith('opera'):
        return 'vocal-opera'
    if g.startswith('ballet'):
        return 'orchestral'
    roles = [r for r, _ in credits]
    voices = {'Soprano', 'Mezzo-soprano', 'Alto', 'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass', 'Voice'}
    if 'Orchestra' in roles or 'Conductor' in roles:
        return 'orchestral'
    if 'Choir' in roles:
        return 'vocal-opera'
    players = [r for r in roles if r not in ('Narrator', 'Host', 'Actor')]
    if set(players) & voices and len(players) <= 3:
        return 'recital'
    if len(players) == 1:
        return 'recital'
    if players:
        return 'chamber'
    return None


# ---------------------------------------------------------------------------
# fetch
# ---------------------------------------------------------------------------

def fetch():
    today = today_zurich()
    shows = {}
    for season in _seasons(today):
        page, pages = 1, 1
        while page <= pages and page <= 10:
            try:
                got, pages = parse_listing(get_json(LISTING.format(season=season, page=page)))
            except FetchError as err:
                if season == _seasons(today)[0] and page == 1:
                    raise                                   # the current season must work
                log.info('opera_de_paris: %s page %d: %s', season, page, err)
                break
            for s in got:
                shows.setdefault(s['url'], s)
            page += 1
    keep, skipped = [], {}
    for s in shows.values():
        why = None
        if not _KEEP_GENRES.search(s['genre']) or re.search(r'(?i)jeune', s['genre'] + ' ' + s['sub_genre']):
            why = s['genre'] or 'other'
        elif _SKIP_TITLE.search(s['title']) or is_not_a_concert(s['title']):
            why = 'not a concert'
        if why:
            skipped[why] = skipped.get(why, 0) + 1
        else:
            keep.append(s)
    log.info('opera_de_paris: %d shows listed, %d kept; skipped %s', len(shows), len(keep),
             ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())) or 'none')

    cands = []
    for s in keep:
        if requests_left() <= 0:
            log.warning('opera_de_paris: request cap reached before the performances of %s', s['title'])
            break
        try:
            perfs = parse_performances(get_json(s['url'].rstrip('/') + '/performances'), s['season'])
        except BudgetExceeded as err:
            log.warning('opera_de_paris: stopped: %s', err.reason)
            break
        except FetchError as err:
            log.warning('opera_de_paris: performances of %s failed: %s', s['title'], err)
            continue
        for p in perfs:
            if date(*p['date']) < today:
                continue
            sid = f"{s['id']}-{p['perf']}"
            start = paris_iso(*p['date'], *p['time'])
            prev = previous_event(event_id(KEY, sid), start, title=s['title'])
            cands.append({'show': s, 'perf': p, 'sid': sid, 'start': start,
                          'prev': prev if prev and prev.get('credits') else None})

    by_show = {}
    for c in cands:
        by_show.setdefault(c['show']['url'], []).append(c)

    def tier(url):
        group = by_show[url]
        if any(c['prev'] is None for c in group):
            return 0
        if refresh_due(url, min(c['start'] for c in group), near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            return 1
        return None

    pages = {}
    for url in sorted((u for u in by_show if tier(u) is not None), key=lambda u: (tier(u), min(c['start'] for c in by_show[u]))):
        if requests_left() <= 0:
            break
        try:
            pages[url] = parse_show(get(url))
        except BudgetExceeded as err:
            log.warning('opera_de_paris: stopped reading show pages: %s', err.reason)
            break
        except FetchError as err:
            log.warning('opera_de_paris: show page %s failed: %s', url, err)
    log.info('opera_de_paris: %d performances of %d shows; %d show page(s) read', len(cands), len(by_show), len(pages))

    events = []
    for c in cands:
        s, p = c['show'], c['perf']
        season_first = 2000 + int(s['season'][:2]) if re.match(r'\d\d-\d\d', s['season'] or '') else today.year

        def year_of(mo, first=season_first):
            return first if mo >= 8 else first + 1

        page = pages.get(s['url'])
        credits, works = [], []
        if page:
            credits, works = credits_for(page, date(*p['date']), year_of, s['genre'], s['title'])
        elif c['prev']:
            credits = [(x.get('role'), x.get('name')) for x in c['prev'].get('credits') or []]
            works = [(w.get('composer'), w.get('title')) for w in c['prev'].get('program') or []]
        elif re.match(r'(?i)op[ée]ra', s['genre']) and s['subtitle'] and '|' not in s['subtitle']:
            works = [(s['subtitle'], s['title'])]
        if fold(s['genre']).startswith('ballet'):
            roles = {r for r, _ in credits}
            recorded = page and any(re.search(r'(?i)musique enregistr|bande[- ]son', n) for n in page['notes'])
            if recorded or not (roles & {'Conductor', 'Orchestra'}):
                log.info('opera_de_paris: ballet without (known) live music skipped: %s %s', s['title'], p['date'])
                continue
        venue, city = _venue(p['venue'] or s['venue'])
        if not city:
            log.info('opera_de_paris %s: place unknown or abroad, skipped: %s (%s)', c['sid'], s['title'], venue)
            continue
        cancelled = any(looks_cancelled(t) for t in p['tags']) or looks_cancelled(s['title'])
        try:
            events.append(make_event(
                KEY, c['sid'], s['title'], c['start'], city=city, venueName=venue, type=_type(s['genre'], credits),
                credits=credits, program=works, url=s['url'], ticketUrl=s['url'],
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('opera_de_paris %s: skipped: %s', c['sid'], err)
    return events
