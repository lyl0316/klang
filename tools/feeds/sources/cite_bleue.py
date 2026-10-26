"""La Cité Bleue, Geneva: concerts, recitals and operas of the season, from the venue's own
site (a Nuxt app over a Kirby CMS).

    https://lacitebleue.ch/fr/evenements                 one request: this season's productions with tags
    https://lacitebleue.ch/fr/evenements/<season>/<slug> one request per kept production (about 25)

The list gives each production's tags (Concert, Récital, Opéra, Musique de chambre,
Cinéma, Atelier, SwissLab ...). A production page carries its state as Nuxt data: every
performance date with its local start time ("startdate", "starttime"), the hall when it
is not the Cité Bleue itself (e.g. Espace Concorde, Vernier), the duration, the main
credits (role + person) and the other credits; the works are read from the page's
"Programme" panel. Only these facts are taken; summaries and texts are not.

robots.txt: none (HTTP 404). The sales terms (CGV) say nothing about reusing listings.
Not read through OpenAgenda: the venue's own pages are the source.

Skipped: films, workshops, talks, SwissLab and family formats, circus, dance-only and
"opéra pop"/music-theatre shows.
"""
from __future__ import annotations

import re
from datetime import datetime

from common import FetchError, clean, get, log, make_event, requests_left, to_zurich_datetime, today_zurich
from ._westsouth import fold, group_role, infer_type, known_role, local_iso, nuxt_payload, role_for

KEY = 'cite_bleue'
NAME = 'La Cité Bleue, Genève'
SITE = 'https://lacitebleue.ch/'
ATTRIBUTION = 'Source: La Cité Bleue (lacitebleue.ch)'
KIND = 'venue'
TIME_LIMIT = 300

BASE = 'https://lacitebleue.ch'
LISTING = BASE + '/fr/evenements'
HOME_VENUE = 'La Cité Bleue'

KEEP_TAGS = {'concert', 'recital', 'opera', 'musique de chambre'}
DROP_TAGS = {'cinema', 'atelier', 'conference', 'swisslab', 'famille', 'jeune public', 'cirque', 'opera pop',
             'spectacle', 'film', 'rencontre', 'autour du spectacle'}
# halls the site names -> (venue, town)
_VENUES = (('concorde', ('Espace Concorde', 'Vernier')), ('eynard', ('Palais Eynard', 'Genève')),
           ('victoria hall', ('Victoria Hall', 'Genève')), ('cathedrale', ('Cathédrale Saint-Pierre', 'Genève')),
           ('bfm', ('Bâtiment des Forces Motrices', 'Genève')), ('forces motrices', ('Bâtiment des Forces Motrices', 'Genève')))


def parse_listing(html):
    """-> [(url, title, tags)] for the productions of the events page."""
    out, seen = [], set()
    for art in re.findall(r'<article\b.*?</article>', html or '', re.S):
        href = re.search(r'href="(/fr/evenements/\d{4}-\d{4}/[^"#?]+)"', art)
        title = re.search(r'<h3[^>]*>(.*?)</h3>', art, re.S)
        if not href or href.group(1) in seen:
            continue
        seen.add(href.group(1))
        tags = [clean(t) for t in re.findall(r'tag-badge-item__label[^>]*>(.*?)</span>', art, re.S)]
        out.append((BASE + href.group(1), clean(title.group(1)) if title else '', [t for t in tags if t]))
    return out


def keep(tags):
    f = {fold(t).strip() for t in tags}
    return bool(f & KEEP_TAGS) and not (f & DROP_TAGS)


def _page(payload):
    if not isinstance(payload, dict):
        return None
    state = payload.get('state') or {}
    page = state.get('$sapp.page') if isinstance(state, dict) else None
    if isinstance(page, dict) and page.get('eventDates') is not None:
        return page
    for v in (payload.get('data') or {}).values():            # fallback: the API result
        res = v.get('result') if isinstance(v, dict) else None
        if isinstance(res, dict) and res.get('eventDates') is not None:
            return res
    return None


def parse_program(html):
    """Works from the "Programme" panel. Layouts seen:
    - 'Composer (place, dates)' then '<em>Work</em>' lines, groups separated by a blank line;
    - song recitals: '(Singer) Composer / Lyricist' then '<em>Song</em>';
    - a '<strong>Section</strong>' heading above a group ('Prologue', 'Terre'), which is skipped;
    - one paragraph each: '<strong>Composer</strong>', '(place, dates)', 'Work'."""
    m = re.search(r'<span[^>]*>Programme</span>.*?<section[^>]*data-block-type="text"[^>]*>(.*?)</section>',
                  html or '', re.S)
    if not m:
        return []
    works, pending = [], None
    name_re = r"[A-ZÀ-Ý][\w'’.-]+(?: (?:de |van |von |du |le |la |y )?[A-ZÀ-Ý][\w'’.-]+){0,4}"
    for para in re.findall(r'<p>(.*?)</p>', m.group(1), re.S):
        # '<em>I wish it so<br></em><br>Guy Lafarge …': a closing tag between two <br> still ends the group
        para = re.sub(r'(?i)((?:<br\s*/?>\s*)+)(</(?:em|i|strong|b)>)', r'\2\1', para)
        for group in re.split(r'(?i)(?:<br\s*/?>\s*){2,}', para):
            lines = [x for x in re.split(r'(?i)<br\s*/?>', group) if clean(x)]
            if not lines:
                continue
            while len(lines) > 1 and re.fullmatch(r'\s*<strong>[^<]*</strong>\s*', lines[0]) \
                    and not re.search(r'\d{4}', lines[0]):
                lines = lines[1:]                                 # a section heading: 'Prologue', 'Vide / Plénitude'
            first = clean(lines[0]).strip('\u2060 ')
            if len(lines) == 1:                                   # the one-paragraph-each layout
                if re.fullmatch(r'\s*<strong>[^<]*</strong>\s*', lines[0]) and re.fullmatch(name_re, first):
                    pending = first
                elif re.fullmatch(r'\(.*\d{4}.*\)', first):
                    pass                                          # '(Hambourg, 1833 - Vienne, 1897)'
                elif pending and len(first) <= 200:
                    works.append((pending, first.lstrip('-–• ')))
                    pending = None
                continue
            pending = None
            # song recitals: '(Joséphine Baker) Georges Tabet / Augustin Lara' = (singer) composer / lyricist
            song = re.sub(r'^\([^)]*\)\s*', '', first).split(' / ')[0].strip()
            song = re.sub(r'\s*\((?!.*\d{4})[^)]*\)\s*$', '', song).strip()      # 'Francis Poulenc (Klavier Solo)'
            if '<em>' in lines[0]:
                continue
            if re.search(r'\(.*\d{4}.*\)', first):
                composer = re.sub(r'\s*\(.*$', '', first).strip()
            elif re.fullmatch(name_re, song) and ('<em>' in lines[1] or ' / ' in first):
                composer = song
            else:
                continue
            for ln in lines[1:]:
                if '<em>' in ln:
                    works.append((composer, clean(ln).lstrip('-–• ')))
            if not any(c == composer for c, _ in works):
                works.append((composer, ''))
    return works


def _role(label, name, opera):
    """Known role words map to Klang roles; in an opera an unknown label is the character
    sung (-> 'Performer'); elsewhere it is kept as given (an unusual instrument)."""
    label = clean(label)
    if not label:
        return group_role(name) or 'Performer'
    role = known_role(label, name)
    if role is not None:
        return role or None
    return 'Performer' if opera else role_for(label, name)


def _credits(page, opera=False):
    out = []
    for item in page.get('generiquePrincipal') or []:
        if not isinstance(item, dict):
            continue
        person = item.get('person') if isinstance(item.get('person'), dict) else {}
        name = clean(person.get('title') or item.get('name'))
        if name:
            role = _role(item.get('role') or '', name, opera)
            if role:
                out.append((role, name))
    for block in page.get('generiqueSecondaire') or []:
        content = (block.get('content') if isinstance(block, dict) else None) or {}
        # "generique-autolist" blocks keep their rows in "entriestext", "generique-list" blocks in "entries"
        for e in (content.get('entriestext') or []) + (content.get('entries') or []):
            name = clean(e.get('name')) if isinstance(e, dict) else ''
            if not name:
                continue
            label = clean(e.get('role'))
            m = re.match(r'^(.+?),\s*([^,]{3,30})$', name)
            if not label and m and known_role(m.group(2)):       # "Kaya Kato Møller, Violon"
                name, label = m.group(1), m.group(2)
            # the site sometimes has the two fields swapped ("name": "Chorégraphie", "role": "Mermoz Melchior")
            if label and (known_role(name) is not None or re.match(r'^[A-ZÀ-Ý][a-zà-ÿ]+(?: [a-zà-ÿ&]+)+$', name)) and \
                    re.fullmatch(r"[A-ZÀ-Ý][\w'’-]+(?: (?:&|et|de|von|van|da) )?(?: ?[A-ZÀ-Ý][\w'’-]+)+", label):
                name, label = label, name
            # secondary credits are mostly the production team: keep ensembles and known performing roles
            if not label:
                role = group_role(name) or 'Performer'
            else:
                role = known_role(label, name)
                if role is None and opera and re.fullmatch(r"[A-ZÀ-Ý][\w'’ -]{1,30}", label):
                    role = 'Performer'                        # a character sung in the opera
            if role:
                out.append((role, name))
    return out


def _duration(text):
    m = re.fullmatch(r'(\d{1,2}):(\d{2})', str(text or '').strip())
    return int(m.group(1)) * 60 + int(m.group(2)) if m else None


def _venue(name):
    n = clean(name)
    if not n:
        return HOME_VENUE, 'Genève'
    for frag, (venue, town) in _VENUES:
        if frag in fold(n):
            return n if len(n) > len(venue) else venue, town
    return n, 'Genève'


def fetch():
    today = today_zurich()
    productions = parse_listing(get(LISTING))      # FetchError propagates: build reuses yesterday's events
    if not productions:
        raise FetchError(LISTING, 'no productions on the events page')
    events = []
    for url, title, tags in productions:
        if not keep(tags) or requests_left() <= 0:
            continue
        try:
            html = get(url)
        except FetchError as err:
            log.warning('%s: no page for %s: %s', KEY, url, err)
            continue
        page = _page(nuxt_payload(html))
        if not page:
            log.warning('%s: no Nuxt data on %s', KEY, url)
            continue
        # the visible tags (and "freeTags"); "categoryTags" is broader (a recital can be filed under opera)
        ftags = {fold(t).strip() for t in tags} | {fold(t).replace('-', ' ') for t in page.get('freeTags') or []
                                                   if isinstance(t, str)}
        credits = _credits(page, opera='opera' in ftags)
        program = parse_program(html)
        name = clean(page.get('title')) or title
        if 'opera' in ftags:
            kind = 'vocal-opera'
        elif 'musique de chambre' in ftags:
            kind = 'chamber'
        else:
            kind = infer_type(name, credits, program=program) or ('recital' if 'recital' in ftags else None)
        venue, town = _venue(page.get('venue'))
        cancelled = 'annul' in fold(page.get('status') or '') or 'cancel' in fold(page.get('status') or '')
        for d in page.get('eventDates') or []:
            if not isinstance(d, dict) or not d.get('startdate') or not d.get('starttime'):
                continue
            try:
                day = datetime.strptime(d['startdate'], '%Y-%m-%d')
                hh, mi = (int(x) for x in str(d['starttime']).split(':')[:2])
                start = local_iso(day.year, day.month, day.day, hh, mi)
            except ValueError as err:
                log.warning('%s: bad date in %s: %s', KEY, url, err)
                continue
            if to_zurich_datetime(start).date() < today:
                continue
            slug = url.rstrip('/').rsplit('/', 1)[-1]
            try:
                events.append(make_event(
                    KEY, f"{slug}-{d['startdate']}-{hh:02d}{mi:02d}", name, start,
                    durationMin=_duration(page.get('idCardDuration')), city=town, venueName=venue, type=kind,
                    credits=credits, program=program, url=url, ticketUrl=url,
                    status='cancelled' if cancelled else 'scheduled'))
            except ValueError as err:
                log.warning('%s: skipped %s: %s', KEY, url, err)
    return events
