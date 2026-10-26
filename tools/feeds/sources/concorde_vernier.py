"""Concorde espace culture, Vernier (Châtelaine): the classical-music performances of the new
cultural centre's season (it replaces Vernier's Salle du Lignon season from autumn 2026).

    https://www.concorde.ch/fr/programmation/calendrier?type=1780996657&...[limit]=200   one request
    https://www.concorde.ch/fr/programmation/saison-2026-2027/<slug>                   one per kept production

The calendar page loads its rows through the same URL its "Voir plus" button calls
(TYPO3 plugin "calendarlistajax", a plain GET with offset and limit); one call with a
large limit returns every performance: date ("Sa 07.11.26"), local time ("14h30"),
title, genre badges ("Musique classique", "Opéra-ballet", "Jeune public" ...) and hall.
Rows tagged as classical music or opera are kept, children's formats are not. The
production page adds the line-up ("Avec l'Orchestre de Chambre de Genève et ...") and the
subtitle. Only these facts are taken.

Terms: the legal notice says the site's content may not be reproduced without Concorde's
prior written permission. Only facts (dates, times, titles, performers) and a link back
are republished; this site is on the list for a courtesy/permission email.
robots.txt asks for Crawl-delay 5 (honoured) and only blocks ?type=98, ?id= and ?L=0 URLs.
"""
from __future__ import annotations

import re
from urllib.parse import urljoin

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, \
    today_zurich
from ._westsouth import fold, group_role, infer_type, local_iso

KEY = 'concorde_vernier'
NAME = 'Concorde espace culture, Vernier'
SITE = 'https://www.concorde.ch/'
ATTRIBUTION = 'Source: Concorde espace culture, Vernier (concorde.ch)'
KIND = 'venue'
MAX_REQUESTS = 12
TIME_LIMIT = 150

BASE = 'https://www.concorde.ch'
PLUGIN = 'tx_concordeevents_calendarlistajax'
CALENDAR = (BASE + '/fr/programmation/calendrier?type=1780996657'
            f'&{PLUGIN}%5Bcontroller%5D=Calendar&{PLUGIN}%5Baction%5D=listAjax'
            f'&{PLUGIN}%5Blimit%5D=200&{PLUGIN}%5Boffset%5D=0')
CITY = 'Vernier'
KEEP = {'musique classique', 'opera-ballet', 'opera', 'operette', 'recital'}
DROP = {'jeune public', 'participatif', 'cine-concert', 'atelier'}


def parse_calendar(html):
    """-> [{'date': (y, m, d), 'time': (h, m), 'title', 'url', 'cats', 'hall'}]."""
    out = []
    for row in (html or '').split('<div class="row calendar-item">')[1:]:
        date = re.search(r'class="col-6 col-lg-1 date">\s*(.*?)\s*</div>', row, re.S)
        time = re.search(r'class="col-6 col-lg-1 time">\s*(.*?)\s*</div>', row, re.S)
        link = re.search(r'<h3 class="calendar-item-title">\s*<a href="([^"]+)">(.*?)</a>', row, re.S)
        if not date or not time or not link:
            continue
        d = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{2,4})', clean(date.group(1)))
        t = re.search(r'(\d{1,2})\s*[h:]\s*(\d{2})?', clean(time.group(1)))
        if not d or not t:
            continue
        y = int(d.group(3))
        cats = [clean(c) for c in re.findall(r'cat-itm-label badge">(.*?)</span>', row, re.S)]
        hall = re.findall(r'class="col-[^"]*(?:place|location|space|lieu)[^"]*">\s*(.*?)\s*</div>', row, re.S)
        out.append({'date': (y + 2000 if y < 100 else y, int(d.group(2)), int(d.group(1))),
                    'time': (int(t.group(1)), int(t.group(2) or 0)), 'title': clean(link.group(2)),
                    'url': urljoin(BASE, link.group(1)), 'cats': cats,
                    'hall': clean(hall[0]) if hall else None})
    return out


def parse_production(html):
    """Production page -> (subtitle, credits)."""
    text_lines = [clean(x) for x in re.split(r'<[^>]+>', re.sub(r'<(script|style)\b.*?</\1>', ' ', html or '', flags=re.S))]
    lines = [x for x in text_lines if x]
    subtitle = None
    if 'Réserver' in lines and 'Dates & tarifs' in lines:
        i = lines.index('Dates & tarifs')
        if i + 1 < len(lines) and len(lines[i + 1]) <= 90:
            subtitle = lines[i + 1]
    credits = []
    if 'Avec' in lines:
        k = lines.index('Avec')
        text = lines[k + 1] if k + 1 < len(lines) else ''
        if re.fullmatch(r"(?i)l['’]|la|le|les", text) and k + 2 < len(lines):   # "l'" split off by a tag
            text = f'{text}{lines[k + 2]}'
        for part in re.split(r'\s+et\s+|,\s*', text):
            name = re.sub(r"^(?:l['’]|la |le |les )", '', part.strip(' .'), flags=re.I)
            name = name[:1].upper() + name[1:]
            if group_role(name) and len(name) <= 70:
                credits.append((group_role(name), name))
    return subtitle, credits


def fetch():
    today = today_zurich()
    rows = parse_calendar(get(CALENDAR))         # FetchError propagates: build reuses yesterday's events
    if not rows:
        raise FetchError(CALENDAR, 'no calendar rows')
    details = {}
    events = []
    for r in rows:
        cats = {fold(c) for c in r['cats']}
        if not (cats & KEEP) or (cats & DROP):
            continue
        if r['date'] < (today.year, today.month, today.day):
            continue
        if r['url'] not in details and requests_left() > 0:
            try:
                details[r['url']] = parse_production(get(r['url']))
            except FetchError as err:
                log.warning('%s: no page for %s: %s', KEY, r['url'], err)
        subtitle, credits = details.get(r['url'], (None, []))
        title = f"{r['title']} – {subtitle}" if subtitle and fold(subtitle) not in fold(r['title']) else r['title']
        start = local_iso(*r['date'], *r['time'])
        kind = 'vocal-opera' if cats & {'opera-ballet', 'opera', 'operette'} else (infer_type(title, credits) or 'orchestral')
        slug = r['url'].rstrip('/').rsplit('/', 1)[-1]
        try:
            events.append(make_event(
                KEY, f'{slug}-{start[:16].replace("-", "").replace(":", "").replace("T", "")}', title, start,
                city=CITY, venueName=f"Concorde, {r['hall']}" if r['hall'] else 'Concorde espace culture',
                type=kind, credits=credits, url=r['url'], ticketUrl=r['url'],
                status='cancelled' if looks_cancelled(title) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, slug, err)
    return events
