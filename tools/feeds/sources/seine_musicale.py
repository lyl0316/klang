"""La Seine Musicale (Île Seguin, Boulogne-Billancourt): its classical programme only.

    https://www.laseinemusicale.com/programmation/?genre[]=130&genre[]=193&paged=N   listing, 16 a page
    https://www.laseinemusicale.com/spectacles-concerts/<slug>/                       one page per show

The listing is asked with the site's own genre filter: 130 "Musique classique" and 193
"Opéra et oratorio" (the hall's other genres are pop, musicals, comedy, dance …). It gives
the show links only (dates as free text: "Les 12 & 14 novembre 2026"), so every show page
is read on every run (about 60 requests). A show page has the series ("Les Grandes
Œuvres", "Le Classique du Dimanche", "Vous trouvez ça classique ?"), the title, one
ticket button per performance with ``data-meeting-date="2026-11-03 20:30:00"`` (Paris
time; checked against the website on 29 Oct 2026: "mardi 03 Nov 2026 - 20:30") and
``data-type`` (in_sell, sold out …), the "Distribution" ("<strong>Name</strong>,
<em>role</em>") and the "Programme" ("<strong>Composer</strong>, <em>Work</em>"). The hall
(Auditorium Patrick Devedjian or Grande Seine) is read from the ticket link. Only facts are
taken, no presentation texts.

The CGU allow personal use of the content and ask for consent before extraction for
commercial ends; Klang is personal and non-commercial and republishes facts only, with
links back.

City: Boulogne-Billancourt (Klang lists it in Île-de-France next to Paris).

Skipped: the dinners with the artists, workshops (SeineLab, Zygel's "Atelier de
Jean-François"), children's and family shows, talks.
"""
from __future__ import annotations

import re
from datetime import date

from common import FetchError, clean, get, guess_type, log, looks_cancelled, make_event, requests_left, today_zurich

from ._paris import credit, fold, group_role, is_not_a_concert, paris_iso, smart_case

KEY = 'seine_musicale'
NAME = 'La Seine Musicale'
SITE = 'https://www.laseinemusicale.com/'
ATTRIBUTION = 'Source: La Seine Musicale (laseinemusicale.com)'
KIND = 'venue'
COUNTRY = 'france'
MAX_REQUESTS = 100
TIME_LIMIT = 600

BASE = 'https://www.laseinemusicale.com'
LISTING = BASE + '/programmation/?genre%5B0%5D=130&genre%5B1%5D=193&paged={n}'
MAX_PAGES = 10
CITY = 'Boulogne-Billancourt'
VENUE = 'La Seine Musicale'

_SKIP_TITLE = re.compile(r'(?i)d[îi]ner|atelier|seinelab|zygel|conf[ée]rence|rencontre|visite|brunch|karaok')


def parse_listing(page):
    """-> list of show URLs (in listing order, no duplicates)."""
    urls = re.findall(r'<a href="(https://www\.laseinemusicale\.com/spectacles-concerts/[^"]+)" class="card', page or '')
    return list(dict.fromkeys(urls))


def _pairs(fragment):
    """'<strong>A</strong>, <em>B<br /></em><strong>C</strong>' -> [('A', 'B'), ('C', '')]; text of the
    block only up to the next sub-heading (<h6>)."""
    s = re.split(r'(?i)<h6', fragment or '')[0]
    s = re.sub(r'(?i)<(/?)b>', r'<\1strong>', s)
    s = re.sub(r'(?is)<strong>(.*?)</strong>', lambda m: '<br />'.join(f'<strong>{p}</strong>' if clean(p) else ''
                                                                      for p in re.split(r'(?i)<br\s*/?>', m.group(1))), s)
    out = []
    for line in re.split(r'(?i)<br\s*/?>|</p>', s):
        strong = ' '.join(clean(x) for x in re.findall(r'(?is)<strong>(.*?)</strong>', line)).strip(' ,')
        rest = clean(re.sub(r'(?is)<strong>.*?</strong>', ' ', line)).strip(' ,–-:')
        if strong or rest:
            out.append((strong, rest))
    return out


def _name_like(text, max_words=5):
    words = clean(text).replace('·', ' ').split()
    return 0 < len(words) <= max_words and all(w[:1].isupper() or w.lower() in ('van', 'von', 'de', 'di', 'da', 'del',
                                                                                    'der', 'la', 'le', "d'")
                                                for w in words) and not re.search(r'\d', text)


def works_from(pairs):
    """Programme lines -> [(composer, work)]: '<b>Ravel</b>, Le Tombeau', 'BEETHOVEN · Symphonie
    Pastorale', 'R. SCHUMANN' followed by its works, 'Ludwig van Beethoven, Septuor …'."""
    out, composer = [], ''
    for strong, rest in pairs:
        line = clean(f'{strong} {rest}') if strong and rest else (strong or rest)
        if re.search(r'(?i)playlist|^\d+(?:e|ème|ère|er) partie|^avec des (?:oe|œ)uvres|chor[ée]graphie|mise en sc[èe]ne|myst[èe]re|entracte|'
                     r'^œuvres de|^oeuvres de|^programme', line):
            continue
        if strong and rest and _name_like(strong):
            composer = smart_case(strong.rstrip(','))
            out.append((composer, rest))
            continue
        m = re.match(r"^(.{2,40}?)\s*(?:·|•|:|,|–)\s+(.+)$", line)
        if m and _name_like(m.group(1)):
            composer = smart_case(m.group(1))
            out.append((composer, m.group(2)))
            continue
        if _name_like(line, 4) and (line.upper() == line or strong):
            composer = smart_case(line)                  # 'R. SCHUMANN' heading its works
            continue
        if composer:
            out.append((composer, line))
    return out


def parse_show(page):
    """-> {'title', 'series', 'cast': [(name, role)], 'works': [(composer, work)],
           'meetings': [(datetime-str, type, ticket url)]}."""
    h = page or ''
    out = {'title': '', 'series': '', 'cast': [], 'works': [], 'meetings': []}
    head = re.search(r'<div class="widget__entry">\s*(?:<a\s+href="[^"]*format[^"]*"><span>(.*?)</span></a>)?\s*<h4>(.*?)</h4>',
                     h, re.S)
    if head:
        out['series'], out['title'] = clean(head.group(1)), clean(head.group(2))
    else:
        t = re.search(r'<h1[^>]*>(.*?)</h1>', h, re.S)
        out['title'] = clean(t.group(1)) if t else ''
    for title, body in re.findall(r'<h6>(.*?)</h6>\s*</?div[^>]*>?\s*(?:<div class="editor[^"]*">)?(.*?)</div>', h, re.S):
        t = fold(clean(title))
        if t.startswith('distribution'):
            out['cast'] = _pairs(body)
        elif t.startswith('programme'):
            out['works'] = works_from(_pairs(body))
    for m in re.finditer(r'<a\s+(?:href="([^"]*)"\s+)?data-type="([^"]*)"[^>]*?data-meeting-date="(\d{4}-\d{2}-\d{2} \d{2}:\d{2})',
                         h, re.S):
        out['meetings'].append((m.group(3), m.group(2), m.group(1) or ''))
    if not out['meetings']:
        for m in re.finditer(r'data-meeting-date="(\d{4}-\d{2}-\d{2} \d{2}:\d{2})', h):
            out['meetings'].append((m.group(1), '', ''))
    return out


def _hall(ticket):
    t = fold(ticket)
    if 'auditorium' in t:
        return VENUE + ', Auditorium Patrick Devedjian'
    if 'grande_seine' in t or 'grande-seine' in t:
        return VENUE + ', Grande Seine'
    return VENUE


def credits_from(cast):
    out = []
    for name, role in cast:
        if not name:
            continue
        if re.search(r'(?i)avant-concert|starting block', role):
            continue
        names = [name] if group_role(name) else [n for n in re.split(r'\s*,\s*|\s+et\s+', name) if n]
        for nm in names:
            nm = smart_case(nm)
            c = credit(nm, role) if role else (group_role(nm) or 'Performer', nm)
            if c and c[0] not in ('Director', 'Choreographer', 'Composer'):
                out.append(c)
    voices = {'Soprano', 'Mezzo-soprano', 'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone', 'Bass', 'Voice'}
    if any(r in voices for r, _ in out):
        out = [('Alto' if r == 'Viola' else r, n) for r, n in out]     # 'alto' among singers is the voice
    return out


def _type(series, title, credits, works):
    roles = [r for r, _ in credits]
    g = guess_type(title)
    if g == 'vocal-opera' or 'Choir' in roles:
        return 'vocal-opera'
    if 'Orchestra' in roles or 'Conductor' in roles:
        return 'orchestral'
    if g:
        return g
    if re.search(r'(?i)piano et musique de chambre', series):
        return 'recital' if len([r for r in roles if r not in ('Narrator', 'Host')]) == 1 else 'chamber'
    return guess_type(' '.join(w for _, w in works))


def fetch():
    urls = []
    for n in range(1, MAX_PAGES + 1):                      # paged=0 and paged=1 are the same page
        try:
            got = parse_listing(get(LISTING.format(n=n)))
        except FetchError:
            if n == 1:
                raise                                      # the first page must work
            break
        new = [u for u in got if u not in urls]
        if not new:
            break
        urls += new
    log.info('seine_musicale: %d classical shows listed', len(urls))

    today = today_zurich()
    events, skipped = [], {}
    for url in urls:
        if requests_left() <= 0:
            log.warning('seine_musicale: request cap reached before %s', url)
            break
        try:
            show = parse_show(get(url))
        except FetchError as err:
            log.warning('seine_musicale: %s failed: %s', url, err)
            continue
        title = show['title'] or url.rstrip('/').rsplit('/', 1)[-1]
        if _SKIP_TITLE.search(title) or is_not_a_concert(title) or is_not_a_concert(show['series']) or \
                _SKIP_TITLE.search(show['series']):
            skipped['not a concert'] = skipped.get('not a concert', 0) + len(show['meetings'] or [1])
            continue
        credits = credits_from(show['cast'])
        works = [(c, w) for c, w in show['works'] if c or w]
        kind = _type(show['series'], title, credits, works)
        slug = url.rstrip('/').rsplit('/', 1)[-1]
        for when, dtype, ticket in dict.fromkeys(show['meetings']):
            y, mo, d = (int(x) for x in when[:10].split('-'))
            if date(y, mo, d) < today:
                continue
            start = paris_iso(y, mo, d, int(when[11:13]), int(when[14:16]))
            try:
                events.append(make_event(
                    KEY, f'{slug}-{when[:10].replace("-", "")}-{when[11:13]}{when[14:16]}', title, start,
                    city=CITY, venueName=_hall(ticket), type=kind, series=show['series'], credits=credits,
                    program=works, url=url, ticketUrl=ticket or url,
                    status='cancelled' if looks_cancelled(dtype) or re.search(r'(?i)cancel|annul', dtype) or
                    looks_cancelled(title) else 'scheduled'))
            except ValueError as err:
                log.warning('seine_musicale %s: skipped: %s', slug, err)
    if skipped:
        log.info('seine_musicale: skipped %s', ', '.join(f'{v} {k}' for k, v in skipped.items()))
    return events
