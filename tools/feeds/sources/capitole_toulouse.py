"""Toulouse: the Orchestre national du Capitole (onct.toulouse.fr) and the Opéra national du
Capitole (opera.toulouse.fr), from the two WordPress sites' own REST API.

    https://onct.toulouse.fr/wp-json/wp/v2/onct-events?per_page=100&page=N    concerts (Halle aux Grains …)
    https://opera.toulouse.fr/wp-json/wp/v2/onct-events?per_page=100&page=N   operas, ballets, recitals
    https://<site>/<slug>/                                                    page of a production with several dates

Both sites (one WordPress multisite, robots.txt: allow all) publish their events as the
custom post type ``onct-event``. Each post's meta gives the first performance's local date
and time (``onct-event-year/month/day/hour/minute``), the end of the last one, whether it
plays on one day only, and whether it is past; the taxonomies give the type (grand concert
symphonique, ciné-concert, concert en famille … / opéras, ballets, concerts, récitals) and
the place. A production with several dates lists them only on its page ("jeudi 3" +
"20:00 - 21:50" under "décembre 2026"), read incrementally: a production whose first and
last dates are unchanged since the previous feed keeps the dates read on an earlier run
(re-read when it plays within 10 days, otherwise about once a week). The performers and
works come from the post content (ARTISTES / PROGRAMME blocks on the orchestra's site;
"équipe artistique" / "distribution" / "programme" on the opera's), fetched for all
coming events in one request per site (``include=…``). Requests per run: ~10 list pages,
2 content, 2 place lists, plus the multi-date pages due.

Skipped: ciné-concerts, family concerts, past events, and ballets without live music (no
"Direction musicale" and no orchestra credited). Facts only (date, time, title, place,
performers, works, links); checked against the websites on 29 Oct 2026.
"""
from __future__ import annotations

import html as _html
import re
from datetime import date

from common import (BudgetExceeded, FetchError, clean, get, get_json, log, looks_cancelled, make_event,
                    requests_left, today_zurich)

from ._france_regions import (concert_type, credits_from, fold, fr_month, group_role, is_skipped, paris_iso,
                              previous_by_url, rebuild, reuse_listed)

KEY = 'capitole_toulouse'
NAME = 'Orchestre national & Opéra national du Capitole, Toulouse'
SITE = 'https://onct.toulouse.fr/'
ATTRIBUTION = 'Source: Orchestre national du Capitole (onct.toulouse.fr) and Opéra national du Capitole (opera.toulouse.fr)'
KIND = 'venue'
COUNTRY = 'france'
MAX_REQUESTS = 60
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 10
REFRESH_EVERY_DAYS = 7

SITES = (('onct', 'https://onct.toulouse.fr'), ('opera', 'https://opera.toulouse.fr'))
LIST = '{base}/wp-json/wp/v2/onct-events?per_page=100&page={page}&_fields=id,link,title,meta,class_list,onct-event-lieu'
CONTENT = '{base}/wp-json/wp/v2/onct-events?per_page=100&include={ids}&_fields=id,content'
PLACES = '{base}/wp-json/wp/v2/onct-event-lieu?per_page=100&include={ids}&_fields=id,name'
MAX_PAGES = 12
CITY = 'Toulouse'

_TYPE_KIND = {'grand-concert-symphonique': 'orchestral', 'concert-evenement': None, 'concert-fantaisie': None,
              'concert-zygel': None, 'happy-hour': None, 'operas': 'opera', 'ballets': 'ballet',
              'concerts': None, 'recitals': 'recital'}
_SKIP_TYPES = {'cine-concert', 'concert-en-famille'}


# ---------------------------------------------------------------------------
# REST API
# ---------------------------------------------------------------------------

def read_posts(base):
    out = []
    for page in range(1, MAX_PAGES + 1):
        try:
            batch = get_json(LIST.format(base=base, page=page))
        except FetchError as err:
            if page > 1 and getattr(err, 'status', None) == 400:      # past the last page
                break
            raise
        if not isinstance(batch, list):
            break
        out.extend(batch)
        if len(batch) < 100:
            break
    return out


def _classes(post, prefix):
    return [c[len(prefix):] for c in post.get('class_list') or [] if c.startswith(prefix)]


def _first_start(meta):
    try:
        return paris_iso(meta['onct-event-year'], meta['onct-event-month'], meta['onct-event-day'],
                         meta['onct-event-hour'], meta['onct-event-minute'])
    except (KeyError, TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# post content: artists and programme
# ---------------------------------------------------------------------------

_MARKERS = re.compile(r'^(artistes|equipe artistique|distribution|programme|autour du concert|autour du spectacle|'
                      r'saison \d{4}.*|abonnements?|en partenariat.*|infos pratiques|mecenat|partenaires?|changement de programme)$')


def _paragraphs(content):
    """-> [(kind, text)] for each <p> and <hr>: kind 'hr', 'S' (all bold), 'E' (italic role),
    'P' (plain), 'B' (bold composer + <br> lines)."""
    c = re.sub(r'(?s)<section class="gutenberg-partners.*?</section>', '', content or '')
    out = []
    for m in re.finditer(r'(?s)<hr\b[^>]*>|<h\d[^>]*>(.*?)</h\d>|<p\b[^>]*>(.*?)</p>', c):
        if m.group(0).startswith('<hr'):
            out.append(('hr', ''))
            continue
        if m.group(1) is not None:
            if clean(m.group(1)):
                out.append(('H', clean(m.group(1))))     # a heading starts or ends a block
            continue
        inner = m.group(2).strip()
        text = clean(inner)
        if not text:
            continue
        if re.search(r'<br\s*/?>', inner) and re.match(r'(?s)^\s*<strong>', inner):
            out.append(('B', inner))
        elif re.fullmatch(r'(?s)\s*(?:<strong>\s*)?<em>.*</em>(?:\s*</strong>)?\s*', inner) or \
                re.fullmatch(r'(?s)\s*<em>\s*<strong>.*</strong>\s*</em>\s*', inner):
            out.append(('E', text))
        elif re.fullmatch(r'(?s)\s*<strong>.*</strong>\s*', inner):
            out.append(('S', text))
        else:
            out.append(('P', text))
    return out


def parse_content(content):
    """-> {'people': [(label, name)], 'works': [(composer, title)]}"""
    paras = _paragraphs(content)
    sections, cur = {}, None
    for kind, text in paras:
        f = fold(text).strip(' :')
        if kind in ('P', 'S', 'H') and _MARKERS.match(f):
            cur = 'artists' if f in ('artistes', 'equipe artistique', 'distribution') else (
                'programme' if f == 'programme' else None)
            continue
        if kind in ('hr', 'H'):
            cur = None
            continue
        if cur:
            sections.setdefault(cur, []).append((kind, text))
    people = []
    toks = sections.get('artists', [])
    if any(k == 'E' for k, _ in toks):                     # the opera's format: role (italic) above names
        label = ''
        for k, t in toks:
            if k == 'E':
                label = t
            elif k == 'S':                                  # names are bold; plain text is a note
                for n in _split_names(t):
                    people.append((label, n))
    else:                                                  # the orchestra's format: name (bold) above role
        i = 0
        while i < len(toks):
            k, t = toks[i]
            if k == 'S':
                role = toks[i + 1][1] if i + 1 < len(toks) and toks[i + 1][0] == 'P' else ''
                for n in _split_names(t):
                    people.append((role, n))
                i += 2 if role else 1
            else:
                i += 1
    works, composer = [], ''
    for k, t in sections.get('programme', []):
        if k == 'B':
            parts = [clean(x) for x in re.split(r'<br\s*/?>', t)]
            composer = _LIFE_TAIL.sub('', parts[0]).strip()
            for w in parts[1:]:
                if w:
                    works.append((composer, w))
        elif k == 'S':
            composer = _LIFE_TAIL.sub('', t).strip()
        elif k in ('P', 'E') and composer:
            works.append((composer, t))
        elif k in ('P', 'E'):
            works.append(('', t))
    works = [(c, t) for c, t in works if _plausible_work(c, t)]
    return {'people': people, 'works': works}


_LIFE_TAIL = re.compile(r'\s*\([^)]*\d{4}[^)]*\)\s*$')


def _plausible_work(composer, title):
    """Drop programme lines that are notes, not works ('Samedi 6 février | 15h30', a sentence)."""
    if re.match(r'(?i)^(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b', title) or '|' in title:
        return False
    if len(title.split()) > 18 or len(composer.split()) > 7:
        return False
    if composer and re.search(r'[.:!?]$', composer):
        return False
    return True


def _split_names(text):
    t = clean(text).strip(' ,')
    parts = [p.strip() for p in re.split(r'\s*,\s*|\s+et\s+(?=[A-ZÉ])', t) if p.strip()]
    if len(parts) > 1 and all(1 <= len(p.split()) <= 5 for p in parts) and not group_role(t):
        return parts
    return [t]


# ---------------------------------------------------------------------------
# production page (several dates)
# ---------------------------------------------------------------------------

def parse_dates_page(page_html):
    """-> [(y, mo, d, hh, mi, end_hh, end_mi)] from the 'Horaires' block."""
    out = []
    for month, block in re.findall(r'(?s)<li class="splide__slide" data-month="([^"]+)">(.*?)</li>', page_html or ''):
        mm = re.match(r'\s*([^\s\d]+)\s+(\d{4})', clean(month))
        mo = fr_month(mm.group(1)) if mm else None
        if not mo:
            continue
        y = int(mm.group(2))
        for day, hour in re.findall(r'(?s)<p class="day">(.*?)</p>\s*<p class="hour">(.*?)</p>', block):
            d = re.search(r'(\d{1,2})', clean(day))
            h = re.match(r'\s*(\d{1,2})[:h](\d{2})(?:\s*-\s*(\d{1,2})[:h](\d{2}))?', clean(hour))
            if d and h:
                out.append((y, mo, int(d.group(1)), int(h.group(1)), int(h.group(2)),
                            int(h.group(3)) if h.group(3) else None, int(h.group(4) or 0)))
    return out


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def _venue(name):
    n = clean(name)
    f = fold(n)
    if 'halle aux grains' in f:
        return 'Halle aux Grains'
    if 'theatre du capitole' in f:
        return 'Théâtre du Capitole'
    return n or None


def fetch():
    today = today_zurich()
    prev = previous_by_url(KEY)
    events, read_pages, reused = [], 0, 0
    for site, base in SITES:
        try:
            posts = read_posts(base)
        except FetchError as err:
            if site == 'onct':
                raise
            log.warning('capitole_toulouse: %s list failed: %s', base, err)
            continue
        future = []
        for p in posts:
            meta = p.get('meta') or {}
            if meta.get('onct-event-past'):
                continue
            start = _first_start(meta)
            if not start:
                continue
            types = _classes(p, 'onct-event-type-')
            publics = _classes(p, 'onct-event-public-')
            title = clean(_html.unescape((p.get('title') or {}).get('rendered') or ''))
            if set(types) & _SKIP_TYPES or (publics and set(publics) <= {'jeune-public', 'en-famille'}) or \
                    is_skipped(title):
                continue
            future.append((start, p, types, title))
        if not future:
            continue
        ids = ','.join(str(p['id']) for _, p, _, _ in future)
        contents = {}
        try:
            for x in get_json(CONTENT.format(base=base, ids=ids)):
                contents[x['id']] = parse_content((x.get('content') or {}).get('rendered'))
        except (FetchError, TypeError, KeyError) as err:
            log.warning('capitole_toulouse: %s contents failed: %s', base, err)
        lieu_ids = sorted({i for _, p, _, _ in future for i in p.get('onct-event-lieu') or []})
        places = {}
        if lieu_ids:
            try:
                for x in get_json(PLACES.format(base=base, ids=','.join(map(str, lieu_ids)))):
                    places[x['id']] = clean(_html.unescape(x.get('name') or ''))
            except (FetchError, TypeError, KeyError) as err:
                log.warning('capitole_toulouse: %s places failed: %s', base, err)
        for start, p, types, title in sorted(future, key=lambda t: t[0]):
            meta, url = p['meta'], p.get('link')
            kind = next((_TYPE_KIND[t] for t in types if _TYPE_KIND.get(t)), None)
            info = contents.get(p['id'], {'people': [], 'works': []})
            credits = credits_from(info['people'], {'opera': 'opera', 'ballet': 'ballet'}.get(kind, 'concert'))
            if kind == 'ballet' and not any(r in ('Conductor', 'Orchestra') for r, _ in credits):
                continue                                   # ballet to recorded music
            if site == 'onct' and kind != 'recital' and not any(r == 'Orchestra' for r, _ in credits) and \
                    kind == 'orchestral':
                credits.append(('Orchestra', 'Orchestre national du Capitole'))
            ctype = concert_type(title, credits, info['works'],
                                 {'opera': 'vocal-opera', 'ballet': 'orchestral', 'recital': 'recital',
                                  'orchestral': 'orchestral'}.get(kind))
            venue = _venue(next((places.get(i) for i in p.get('onct-event-lieu') or [] if places.get(i)), ''))
            ticket = meta.get('onct-event-registration-link') or None
            status = 'cancelled' if looks_cancelled(title) else 'scheduled'
            common_fields = dict(city=CITY, venueName=venue or ('Halle aux Grains' if site == 'onct' else
                                                                 'Théâtre du Capitole'),
                                 type=ctype, credits=credits, program=info['works'], ticketUrl=ticket, url=url,
                                 status=status)
            if meta.get('onct-event-one-day', True):
                dur = meta.get('onct-event-duration')
                try:
                    events.append(make_event(KEY, f"{site}-{p['id']}-{start[:10].replace('-', '')}{start[11:13]}{start[14:16]}",
                                             title, start, durationMin=(dur / 60) if isinstance(dur, (int, float)) and
                                             dur else None, **common_fields))
                except ValueError as err:
                    log.warning('capitole_toulouse: %s skipped: %s', url, err)
                continue
            # several dates: the page lists them; reuse an earlier run's dates while the span is unchanged
            first = (int(start[5:7]), int(start[8:10]))
            end_ts = meta.get('onct-event-end-timestamp')
            last = None
            if isinstance(end_ts, (int, float)):
                from common import to_zurich_datetime
                e = to_zurich_datetime(int(end_ts))
                last = (e.month, e.day)
            old = reuse_listed(prev.get(url), title, today, span=(first, last) if last else None, refresh_key=url,
                               near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS)
            if old is not None:
                for e in old:
                    try:
                        events.append(rebuild(KEY, e))
                    except (ValueError, TypeError):
                        pass
                reused += 1
                continue
            if requests_left() <= 0:
                continue
            try:
                dates = parse_dates_page(get(url))
                read_pages += 1
            except BudgetExceeded as err:
                log.warning('capitole_toulouse: stopped reading pages: %s', err.reason)
                break
            except FetchError as err:
                log.warning('capitole_toulouse: %s failed: %s', url, err)
                continue
            for (y, mo, d, hh, mi, ehh, emi) in dates:
                s = paris_iso(y, mo, d, hh, mi)
                if s[:10] < today.isoformat():
                    continue
                end = paris_iso(y, mo, d, ehh, emi) if ehh is not None and ehh > hh else None
                fields = dict(common_fields)
                fields['credits'] = credits_from(info['people'], {'opera': 'opera', 'ballet': 'ballet'}.get(
                    kind, 'concert'), day=date(y, mo, d)) or credits
                fields['credits'] += [c for c in credits if c[0] == 'Orchestra' and c not in fields['credits']]
                try:
                    events.append(make_event(KEY, f"{site}-{p['id']}-{y:04d}{mo:02d}{d:02d}{hh:02d}{mi:02d}", title, s,
                                             end=end, **fields))
                except ValueError as err:
                    log.warning('capitole_toulouse: %s skipped: %s', url, err)
    log.info('capitole_toulouse: %d production pages read, %d reused', read_pages, reused)
    return events
