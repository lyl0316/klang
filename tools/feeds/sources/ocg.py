"""L'Orchestre de Chambre de Genève (OCG): the orchestra's season calendar (HTML).

1. https://locg.ch/fr/calendrier lists the coming events: date ('27 oct. 2026 — 21h', or a
   range without time '30 - 31 oct. 2026'), hall, title, ticket link, some artists with roles
   and a tag line ('Hommage à Géza Anda', 'Ciné-concert', ...).
2. Each event page adds the category ('Concert à l'abo', 'Musique de chambre/Midi aux Salons',
   'Autres concerts', 'En Famille à l'OCG', 'Participation culturelle' ...), every performance
   with its time ('Vendredi 30 oct. 2026 — 19h30') and ticket link, the full line-up, the works
   ('<li><strong>Composer,</strong> <em>Work</em></li>') and the hall's postcode + city.
   Event pages are read earliest first while the request budget lasts; the lunchtime series
   ('Passons aux Salons', 'Concert sur le pouce') are taken from the listing alone.

Dropped: fashion shows, improvised theatre, hip-hop nights, pop/jazz evenings ('Concert de Noël –
POP !'), school projects with pupils, family workshops, theatre co-productions and anything outside
Switzerland. Descriptions are never copied (the event text is only searched for 'élèves').
"""
from __future__ import annotations

import re
from datetime import date, datetime

from common import (BudgetExceeded, FetchError, ZURICH, clean, get, log, looks_cancelled, make_event,
                    requests_left, to_zurich_iso, today_zurich)
from ._geneva import (CREATIVE, concert_type, fold, fr_month, group_role, is_placeholder, looks_like_name, role_en,
                      stable_ids, swiss_city, voice_context)

KEY = 'ocg'
NAME = "L'Orchestre de Chambre de Genève"
SITE = 'https://locg.ch/'
ATTRIBUTION = "Source: L'Orchestre de Chambre de Genève (locg.ch)"
KIND = 'orchestra'
MAX_REQUESTS = 55
TIME_LIMIT = 400

BASE = 'https://locg.ch'
LIST_URL = BASE + '/fr/calendrier'
OCG = "L'Orchestre de Chambre de Genève"

# titles / tag lines / categories that are not concerts (accent-folded)
_NOT_CONCERT = re.compile(r"(defile|improvisation|hip-hop|\brap\b|inauguration|journee d|theatre d|comedie de geneve|"
                          r"participation culturelle|atelier|conference|visite|masterclass|le dimanche c.est famille|"
                          r"en famille a l.ocg|\bbal\b|soiree dansante)")
# pop / jazz / crossover evenings of the orchestra ('Concert de Noël – POP !': Stevie Wonder, Quincy Jones)
_NON_CLASSICAL = re.compile(r'(\bpop\b|\bjazz\b|crossover|\bvariete|\bcomedie musicale\b)')
_LUNCH = re.compile(r'^(passons aux salons|concert sur le pouce)')
_CHAMBER = re.compile(r'(musique de chambre|midi aux salons|passons aux salons|concert sur le pouce)')
_GENRE_TAGS = re.compile(r'^(cine-concert|concert dessine|opera|opera en version de concert|opera jeune public|recital)\b')
_KNOWN_GENEVA = ('victoria hall', 'batiment des forces motrices', 'la cite bleue', 'les salons', 'bibliotheque de la cite',
                 'concorde espace culture', 'institut florimont', 'restaurant le lyrique', 'les 6 toits', 'theatre equilibre',
                 'auditorium ansermet', 'salle des fetes de carouge', 'comedie de geneve', 'head', 'grand theatre')
_WEEKDAYS = r'(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)'


# ---------------------------------------------------------------------------
# dates
# ---------------------------------------------------------------------------

_ONE = re.compile(r'^(\d{1,2})(?:er)?\s+([a-zéûè]+)\.?\s+(\d{4})(?:\s*[—–-]\s*(\d{1,2})\s*h\s*(\d{2})?)?$', re.I)
_RANGE = re.compile(r'^(\d{1,2})(?:er)?(?:\s+([a-zéûè]+)\.?)?\s*-\s*(\d{1,2})(?:er)?\s+([a-zéûè]+)\.?\s+(\d{4})$', re.I)


def parse_when(text):
    """'27 oct. 2026 — 21h' -> (date, (21, 0)); '6 nov. 2026' -> (date, None);
    '30 - 31 oct. 2026' -> (date(30 oct), None) as the first day of a range; None if unreadable."""
    t = clean(re.sub(rf'^{_WEEKDAYS}\s+', '', clean(text), flags=re.I))
    m = _ONE.match(t)
    if m:
        month = fr_month(m.group(2))
        if not month:
            return None
        try:
            d = date(int(m.group(3)), month, int(m.group(1)))
        except ValueError:
            return None
        return d, ((int(m.group(4)), int(m.group(5) or 0)) if m.group(4) else None)
    m = _RANGE.match(t)
    if m:
        month = fr_month(m.group(2) or m.group(4))
        if not month:
            return None
        try:
            return date(int(m.group(5)), month, int(m.group(1))), None
        except ValueError:
            return None
    return None


# ---------------------------------------------------------------------------
# listing
# ---------------------------------------------------------------------------

def _first(pattern, text, flags=re.S):
    m = re.search(pattern, text, flags)
    return clean(m.group(1)) if m else ''


def parse_listing(html_text):
    start = html_text.find('aositems')
    end = html_text.find('Evénements passés', start)
    if end < 0:
        end = html_text.find('Ev&eacute;nements pass', start)
    block = html_text[start:end if end > 0 else len(html_text)]
    items = []
    for chunk in block.split('<div class="flex flex-col gap-5 group">')[1:]:
        slug = re.search(r'href="/fr/calendrier/([^"?#/]+)"', chunk)
        if not slug:
            continue
        artists = []
        for m in re.finditer(r'<div class="font-bold">(.*?)</div>\s*(?:<div class="italic">(.*?)</div>)?', chunk, re.S):
            artists.append((clean(m.group(1)), clean(m.group(2) or '')))
        tickets = re.search(r'<a class="button white"\s+href="(https?://[^"]+)"', chunk)
        items.append({
            'slug': slug.group(1),
            'when': _first(r'<div class="text-xl font-bold">(.*?)</div>', chunk),
            'venue': _first(r'<div class="text-xl italic">(.*?)</div>', chunk),
            'title': _first(r'<h3[^>]*>(.*?)</h3>', chunk),
            'tag': _first(r'<div class="text-xl">([^<>]+)</div>', chunk),
            'artists': artists,
            'ticket': tickets.group(1) if tickets else None,
        })
    return items


# ---------------------------------------------------------------------------
# event page
# ---------------------------------------------------------------------------

def people_and_text(html_text):
    """The event's own column (line-up + text), used only for yes/no checks, never copied."""
    a = html_text.find('<div class="container mx-auto lg:flex gap-20')
    b = html_text.find('<div class="w-[350px]', a)
    return html_text[a:b] if a >= 0 and b > a else ''


def _work_title(fragment):
    """'<em>Thaïs</em>, opéra en 3 actes, Livret de Louis Gallet, d’après …' -> 'Thaïs, opéra en 3 actes';
    'Concerto pour piano n°23, KV 488, par Illia Ovcharenko' -> 'Concerto pour piano n°23, KV 488'."""
    title = clean(fragment)
    title = re.sub(r'\s+([,:;])', r'\1', title).strip(' ,:;')
    title = re.sub(r',?\s+par\s+[A-ZÀ-Ý].*$', '', title).strip(' ,')
    title = re.sub(r"(?i),\s*(livret|d['’]apr[èe]s)\b.*$", '', title).strip(' ,')
    return title[:200]


def parse_event_page(html_text):
    out = {'category': '', 'perfs': [], 'artists': [], 'program': [], 'city': '', 'venue': '', 'tag': ''}
    m = re.search(r'<h1 class="text-3xl[^"]*">(.*?)</h1>\s*(?:<h2 class="text-xl">(.*?)</h2>)?', html_text, re.S)
    h1 = clean(m.group(1)) if m else ''
    if m:
        out['category'] = clean(m.group(2) or '')
        head = [clean(x) for x in re.split(r'<br\s*/?>', m.group(1))]
        out['head_when'] = head[0] if head else ''
        out['venue'] = head[1] if len(head) > 1 else ''
    a = html_text.find('<div class="container mx-auto lg:flex gap-20')
    b = html_text.find('<div  class="text-content">', a)
    if b < 0:
        b = html_text.find('class="text-content"', a)
    people = html_text[a:b] if a >= 0 and b > a else ''
    for m in re.finditer(r'<(?:div|a)\b[^>]*class="font-bold[^"]*"[^>]*>(.*?)</(?:div|a)>\s*(?:<div class="italic">(.*?)</div>)?',
                         people, re.S):
        out['artists'].append((clean(m.group(1)), clean(m.group(2) or '')))
    out['tag'] = _first(r'<div class="mb-7 text-xl">([^<>]+)</div>', html_text[a:] if a >= 0 else '')
    out['cancelled'] = looks_cancelled(f"{h1} {out['category']}")
    # school projects ('la rencontre des élèves de l'Institut Florimont et … de l'OCG'): only a flag is kept
    out['school'] = bool(re.search(r'\beleves\b|\bscolaires?\b', fold(clean(people_and_text(html_text)))))
    # works: the list after a 'Programme' heading ('<h2>Programme&nbsp;</h2>'); a composer may carry a
    # nested list of works: '<li><strong>Fazil Say</strong><ul><li><em>Silk road</em>, op. 4</li>…</ul></li>'
    pm = re.search(r'<(h\d|p)[^>]*>\s*(?:<strong>)?(?:\s|&nbsp;)*Programme(?:\s|&nbsp;)*(?:</strong>)?\s*</\1>(.*?)'
                   r'(?:<h\d|<div\s+class="programmation)', html_text, re.S | re.I)
    if pm:
        body = pm.group(2)
        items = re.split(r'<li\b[^>]*>', body)[1:] if '<li' in body else re.findall(r'<p[^>]*>(.*?)</p>', body, re.S)
        current = None                                    # composer of a nested list
        for chunk in items:
            item = re.split(r'</li>|<ul', chunk)[0]
            sm = re.match(r'\s*<strong>(.*?)</strong>(.*)$', item, re.S)
            if sm:
                composer, title = clean(sm.group(1)).strip(' ,'), _work_title(sm.group(2))
                ok = composer and ',' not in composer and looks_like_name(composer, max_words=8)
                current = composer if ok and '<ul' in chunk else None
                if ok and '<ul' not in chunk:         # with a nested list, its items are the works
                    out['program'].append({'composer': composer, 'title': title})
            elif current:
                title = _work_title(item)
                if title:
                    out['program'].append({'composer': current, 'title': title})
            if '</ul>' in chunk:
                current = None
    # the cast behind the 'Distribution' toggle: '<li><strong>Amina Edris,</strong> Thaïs</li>'
    dm = re.search(r'togglegroup">\s*Distribution\s*</a>(.*?)</ul>', html_text, re.S)
    if dm:
        for li in re.findall(r'<li[^>]*>(.*?)</li>', dm.group(1), re.S):
            sm = re.match(r'\s*<strong>(.*?)</strong>(.*)$', li, re.S)
            if sm:
                name = clean(sm.group(1)).strip(' ,')
                role = re.sub(r'^\s*\([^)]*\)\s*', '', clean(sm.group(2)).strip(' ,')).strip(' ,')
                cm = re.match(r'(?i)direction\s+(.+)$', role)
                if cm and group_role(name):           # 'Chœur du Grand Théâtre de Genève, direction Mark Biggins'
                    out['artists'] += [(name, ''), (cm.group(1), 'chef de chœur')]
                else:
                    out['artists'].append((name, role))
    # performances in the ticket box
    box = html_text[html_text.find('>Billets<'):html_text.find('concert_details_box_info')] if '>Billets<' in html_text else ''
    for pm2 in re.finditer(r'<a\b[^>]*href="([^"]+)"[^>]*>\s*<span[^>]*>(.*?)</span>', box, re.S):
        out['perfs'].append((clean(pm2.group(2)), pm2.group(1)))
    for sp in re.findall(r"<span class='py-4'>(.*?)</span>|<div class=\"\s*py-4\s*\"\s*>(.*?)</div>", box, re.S):
        sp = clean(sp[0] or sp[1])
        if sp and not any(sp == p[0] for p in out['perfs']):
            out['perfs'].append((sp, None))     # performances without an online ticket link
    info = html_text[html_text.find('concert_details_box_info'):]
    cm = re.search(r'<div>\s*(\d{4})\s+([^<]+?)\s*</div>', info[:3000])
    if cm:
        out['city'] = clean(cm.group(2))
    return out


# ---------------------------------------------------------------------------
# fetch
# ---------------------------------------------------------------------------

_VOICE_ROLES = {'Soprano', 'Mezzo-soprano', 'Contralto', 'Alto', 'Countertenor', 'Tenor', 'Baritone', 'Bass-baritone',
                'Bass', 'Voice', 'Performer'}


def _credits(artists):
    """Line-up -> credits. A singer listed twice (top line-up 'Amina Edris, soprano' and the opera's
    'Distribution' 'Amina Edris, Thaïs') keeps one credit, with the character as role."""
    voices = voice_context([r for _, r in artists])
    out, by_name = [], {}
    for name, role_text in artists:
        if not name or len(name) > 80 or is_placeholder(name):
            continue
        role = role_en(role_text, voices=voices) if role_text else None
        if role is CREATIVE:
            continue
        if role is None:
            role = group_role(name) or ('Performer' if not role_text else (role_text[0].upper() + role_text[1:])[:40])
        prev = by_name.get(fold(name))
        if prev is not None:
            if prev['role'] in _VOICE_ROLES and role not in _VOICE_ROLES and role not in ('Orchestra', 'Choir', 'Ensemble'):
                prev['role'] = role
            continue
        by_name[fold(name)] = c = {'role': role, 'name': name}
        out.append(c)
    return out


def fetch():
    today = today_zurich()
    items = parse_listing(get(LIST_URL))     # FetchError propagates: build reuses yesterday
    if not items:
        raise FetchError(LIST_URL, 'no events found in the calendar page (layout changed?)')

    candidates = []
    for it in items:
        w = parse_when(it['when'])
        if not w:
            log.info('ocg: unreadable date %r (%s)', it['when'], it['title'])
            continue
        if w[0] < today and not re.search(r'\s-\s', it['when']):
            continue
        if _NOT_CONCERT.search(fold(f"{it['title']} {it['tag']}")):
            continue
        it['first_day'], it['time'] = w
        candidates.append(it)

    # event pages: items without a time first (needed), then by date; lunch series from the listing
    def priority(it):
        return (0 if it['time'] is None else 1, it['first_day'])
    pages = {}
    for it in sorted(candidates, key=priority):
        if _LUNCH.match(fold(it['title'])) and it['time'] is not None:
            continue
        if requests_left() <= 0:
            log.info('ocg: request budget used up; some events without event page')
            break
        try:
            pages[it['slug']] = parse_event_page(get(f"{BASE}/fr/calendrier/{it['slug']}"))
        except BudgetExceeded:
            break
        except FetchError as err:
            log.warning('ocg: event page %s: %s', it['slug'], err)

    rows = []
    for it in candidates:
        page = pages.get(it['slug'], {})
        category = page.get('category', '')
        tag = page.get('tag') or it['tag']
        if _NOT_CONCERT.search(fold(f'{category} {tag}')):
            log.debug('ocg: skipped %s (%s)', it['title'], category)
            continue
        if _NON_CLASSICAL.search(fold(f"{it['title']} {category} {tag}")) or page.get('school'):
            log.debug('ocg: skipped %s (pop/jazz or school project)', it['title'])
            continue
        perfs = []
        for text, link in page.get('perfs', []):
            w = parse_when(text)
            if w and w[1]:
                perfs.append((w[0], w[1], link))
        if not perfs:
            w = parse_when(page.get('head_when', '')) if page else None
            if w and w[1]:
                perfs.append((w[0], w[1], it['ticket']))
            elif it['time']:
                perfs.append((it['first_day'], it['time'], it['ticket']))
        if not perfs:
            log.info('ocg: no performance time for %s (%s)', it['title'], it['when'])
            continue
        venue = page.get('venue') or it['venue']
        city = swiss_city(page['city']) if page.get('city') else None
        if not city:
            if page.get('city'):
                log.info('ocg: skipped %s: %s is not a known Swiss city', it['title'], page['city'])
                continue
            if any(k in fold(venue) for k in _KNOWN_GENEVA):
                city = 'Genève'
            else:
                log.info('ocg: skipped %s: unknown venue %r', it['title'], venue)
                continue
        for day, (hh, mm), link in perfs:
            if day < today:
                continue
            rows.append({'it': it, 'page': page, 'category': category, 'tag': tag, 'venue': venue, 'city': city,
                         'start': datetime(day.year, day.month, day.day, hh, mm, tzinfo=ZURICH), 'ticket': link})

    stable_ids(rows, key=lambda r: r['it']['slug'])
    events = []
    for r in rows:
        it, page = r['it'], r['page']
        credits = _credits(page.get('artists') or it['artists'])
        program = page.get('program') or []
        cat = fold(f"{r['category']} {it['title']}")
        chamber = bool(_CHAMBER.search(cat))
        if not chamber and not any(c['role'] == 'Orchestra' for c in credits) and page:
            credits.append({'role': 'Orchestra', 'name': OCG})
        tag = r['tag']
        series = None
        if tag and not _GENRE_TAGS.match(fold(tag)) and fold(tag) not in fold(r['venue']):
            if group_role(tag):                               # 'Chœur de Pontverre', 'La Psalette de Genève'
                credits.insert(0, {'role': group_role(tag), 'name': tag})
            elif re.search(r'\bchoeur\b', fold(r['category'])) and looks_like_name(tag, max_words=6):
                credits.insert(0, {'role': 'Choir', 'name': tag})   # category 'Choeur' + 'Cerle Bach' (the choir)
            elif looks_like_name(tag, max_words=4) and not page.get('artists'):
                credits.insert(0, {'role': 'Performer', 'name': tag})
            else:
                series = tag
        if not series:
            lunch = _LUNCH.match(fold(it['title']))
            cats = [c.strip() for c in r['category'].split('/') if c.strip()]
            named = [c for c in cats if fold(c) not in ('autres concerts', 'choeur', 'musique de chambre')]
            if lunch:
                series = 'Passons aux Salons' if lunch.group(1).startswith('passons') else 'Concert sur le pouce'
            elif named:
                series = named[-1]
        ftag = fold(tag)
        if chamber:
            kind = 'chamber'
        elif ftag.startswith('opera'):
            kind = 'vocal-opera'
        else:
            kind = concert_type(it['title'], credits, program, tag) or ('orchestral' if page else None)
        title = it['title']
        if series and 'concours' in fold(series) and fold(series) not in fold(title):
            title = f'{series} – {title}'                   # 'Demi-Finale 1' -> '80e Concours de Genève – Demi-Finale 1'
        url = f"{BASE}/fr/calendrier/{it['slug']}"
        cancelled = page.get('cancelled') or looks_cancelled(f"{it['title']} {tag}")
        try:
            events.append(make_event(
                KEY, r['sid'], title, to_zurich_iso(r['start']),
                city=r['city'], venueName=r['venue'], type=kind, series=series, credits=credits, program=program,
                ticketUrl=r['ticket'] or it['ticket'] or url, url=url,
                status='cancelled' if cancelled else None))
        except ValueError as err:
            log.warning('ocg: skipped %s: %s', it['slug'], err)
    return events
