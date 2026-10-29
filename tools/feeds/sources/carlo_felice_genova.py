"""Teatro Carlo Felice, Genoa: opera, symphony and chamber concerts, ballet.

    https://carlofelice.it/wp-json/wp/v2/season                     seasons (taxonomy)
    https://carlofelice.it/wp-json/wp/v2/discipline                 genres (taxonomy)
    https://carlofelice.it/wp-json/wp/v2/show?season=N&per_page=100 the season's shows (link, title, genre)
    https://carlofelice.it/spettacolo/<slug>/                       one page per show: dates, place, cast, works

The site's "Spettacoli" page is filled by JavaScript; its WordPress REST API (allowed by
robots.txt) lists the shows of a season with their genre, but no dates, so each show page is read:
a table of performances ("VE 21/05/2027 (Prima) | Ore 20:00 | ticket link", Genoa local time),
"Dove:" (the place), and paragraphs "Role<br><strong>Name</strong>", "<strong>Composer</strong><br>
<em>Work</em>" and "<strong>Orchestra e Coro del Teatro Carlo Felice di Genova</strong>". A
character with two singers ("<strong>Franco Vassallo<br>Dimitri Platanias</strong> (22, 29)") gives
the last one the dates in brackets and the first one the other dates.

Show pages are read incrementally (_italy_north.read_pages): a show the previous feed already
has keeps its performances unless it plays within two weeks or is due for its weekly re-read.

Kept genres: Opera, Sinfonica, Concerto, Musica da camera, Coro, Balletto/Danza (only with a
conductor or orchestra credited), Liguria Musica. Skipped: Education, Attività culturali (talks,
guided tours, presentations), Eventi ospiti (pop, Disney, Peanuts), Musical, the children's choir
and Teatro della Gioventù series, and titles that are talks or family formats.

Checked against the website on 29 Oct 2026: 80 shows in season 2026/2027, 35 in kept genres,
67 performances;
Nabucco 21 May 2027 20:00 (Sesto Quatrini; Franco Vassallo except 22 and 29 May), Beethoven 200_1
28 Jan 2027 20:00 (Carlo Tenan, Uri Caine; Šostakovič 9 and Diabelli Variations).
"""
from __future__ import annotations

import html as _html
import re

from common import clean, get_json, infer_type, log, looks_cancelled, make_event, to_zurich_iso, today_zurich

from ._italy_north import credit, date_notes, fold, group_role, house_groups, nice_name, read_pages, role_en, \
    skip_title

KEY = 'carlo_felice_genova'
NAME = 'Teatro Carlo Felice'
SITE = 'https://carlofelice.it/'
ATTRIBUTION = 'Source: Teatro Carlo Felice Genova (carlofelice.it)'
KIND = 'venue'
COUNTRY = 'italy'
MAX_REQUESTS = 80              # 2 taxonomies + 1-2 show lists + one page per show (~35 a season)
TIME_LIMIT = 600

API = 'https://carlofelice.it/wp-json/wp/v2'
CITY = 'Genoa'
TZ = 'Europe/Rome'

_KEEP = {'opera': 'opera', 'sinfonica': 'concert', 'concerto': 'concert', 'musica da camera': 'chamber',
         'coro': 'concert', 'balletto': 'ballet', 'danza': 'ballet', 'liguria musica': 'concert'}
_TOWNS = ('Recco', 'Camogli', 'Chiavari', 'Rapallo', 'Sestri Levante', 'Savona', 'La Spezia', 'Sanremo', 'Lavagna',
          'Santa Margherita Ligure', 'Portofino')


# ---------------------------------------------------------------------------
# show pages
# ---------------------------------------------------------------------------

def _paragraphs(html):
    body = re.search(r'<h1[^>]*>.*?</h1>(.*?)(?:Guarda tutti gli spettacoli|$)', html, re.S)
    return re.findall(r'<p[^>]*>(.*?)</p>', body.group(1) if body else '', re.S)


def parse_details(html):
    """-> {'people': [(role, name, notes, others)], 'groups': [...], 'works': [...], 'composer': str}"""
    out = {'people': [], 'groups': [], 'works': [], 'composer': ''}
    for para in _paragraphs(html):
        parts = [p for p in re.split(r'<br\s*/?>', para)]
        bold = re.search(r'<strong>(.*?)</strong>(.*)$', para, re.S)
        text = clean(para)
        if not text or len(text) > 200:
            continue
        if bold and not clean(para[:para.find('<strong>')]):
            # "<strong>Composer</strong><br><em>Work</em>", "<strong>Group</strong>" or
            # "<strong>Orchestra …</strong><br>Maestro del Coro – Name"
            heads = [clean(x) for x in re.split(r'<br\s*/?>', bold.group(1)) if clean(x)]
            rest = [clean(x) for x in re.split(r'<br\s*/?>', bold.group(2)) if clean(x)]
            pairs = [re.match(r'^(.{2,40}?)\s+[–-]\s+(.+)$', x) for x in rest]
            role_lines = [m for m in pairs if m and role_en(m.group(1)) not in (None, 'Performer')]
            groupish = [h for h in heads if group_role(h) or re.search(r'(?i)ballo|ballet|dance|danza|company', h)]
            if groupish or (rest and len(role_lines) == len(rest)):
                for h in heads:
                    if group_role(h):
                        out['groups'] += house_groups(h)
                i = 0
                while i < len(rest):
                    x, m = rest[i], pairs[i]
                    if m and role_en(m.group(1)) not in (None, 'Performer'):
                        out['people'].append((m.group(1), nice_name(m.group(2)), None, False))
                    elif role_en(x) not in (None, 'Performer') and i + 1 < len(rest):
                        out['people'].append((x, nice_name(rest[i + 1]), None, False))   # "Maestro del Coro" / name
                        i += 1
                    elif group_role(x):
                        out['groups'] += house_groups(x)
                    i += 1
            elif rest and re.match(r'(?i)coreografi', rest[0]):
                continue                                            # a dance piece, not a work
            elif rest:
                out['works'].append((nice_name(' '.join(heads)), ' – '.join(rest)))
            continue
        if not bold:
            if re.search(r'(?i)orchestra|\bcoro\b', text) and len(text) < 90 and not re.search(r'\d', text):
                out['groups'] += house_groups(text)
            continue
        role = clean(para[:para.find('<strong>')])
        names = [clean(x) for x in re.split(r'<br\s*/?>', bold.group(1)) if clean(x)]
        _, notes = date_notes(f'x {clean(bold.group(2))}') if clean(bold.group(2)) else ('', None)
        if re.match(r'(?i)^musica( di)?$', role):
            out['composer'] = nice_name(' '.join(names))
            continue
        for i, name in enumerate(names):
            if notes is None or len(names) == 1:
                out['people'].append((role, nice_name(name), notes, False))
            elif i == len(names) - 1:
                out['people'].append((role, nice_name(name), notes, False))
            else:
                out['people'].append((role, nice_name(name), notes, True))     # every date except the noted ones
    return out


def _sings(notes, others, day):
    if notes is None:
        return True
    hit = (day[0], day[1]) in notes or (None, day[1]) in notes
    return not hit if others else hit


def parse_show(html, url, meta):
    h = html or ''
    place = re.search(r'<b>Dove:</b>\s*(?:<br\s*/?>)?\s*(.*?)</div>', h, re.S)
    venue = clean(place.group(1)) if place else 'Teatro Carlo Felice'
    city = next((t for t in _TOWNS if t.lower() in venue.lower()), CITY)
    d = parse_details(h)
    kind = meta['kind']
    events = []
    rows = re.findall(r'<tr[^>]*>\s*<td[^>]*>([A-Z]{2}\s+(\d\d)/(\d\d)/(\d{4})[^<]*)(?:<p[^>]*>(.*?)</p>)?\s*</td>\s*'
                      r'<td[^>]*>\s*Ore\s+(\d{1,2})[:.](\d\d)\s*</td>\s*<td[^>]*>(.*?)</td>\s*</tr>', h, re.S)
    for label, dd, mm, yyyy, turno, hh, mi, cell in rows:
        local = f'{yyyy}-{mm}-{dd}T{int(hh):02d}:{mi}'
        day = (int(mm), int(dd))
        credits = list(d['groups'])
        for role, name, notes, others in d['people']:
            if _sings(notes, others, day):
                c = credit(role, name)
                if c:
                    credits.append(c)
        if kind == 'ballet' and not any(r in ('Conductor', 'Orchestra') for r, _ in credits):
            log.info('carlo_felice_genova: dance without live music, skipped: %s', meta['title'])
            return []
        program = d['works'] or ([(d['composer'], meta['title'])] if d['composer'] and kind in ('opera', 'ballet') else [])
        ticket = re.search(r'href="(https://[^"]*vivaticket[^"]*)"', cell)
        sid = f"{url.rstrip('/').split('/')[-1]}-{local[:10]}-{local[11:].replace(':', '')}"
        try:
            events.append(make_event(
                KEY, sid, meta['title'], to_zurich_iso(local, assume=TZ), city=city, venueName=venue,
                type=('vocal-opera' if kind == 'opera' else 'orchestral' if kind == 'ballet'
                      else infer_type(meta['title'], credits, program) or ('chamber' if kind == 'chamber' else None)),
                series=meta.get('series'), credits=credits, program=program,
                ticketUrl=_html.unescape(ticket.group(1)) if ticket else url, url=url,
                status='cancelled' if looks_cancelled(label) or looks_cancelled(turno or '') else 'scheduled'))
        except ValueError as err:
            log.warning('carlo_felice_genova %s: skipped: %s', sid, err)
    return events


# ---------------------------------------------------------------------------
# seasons -> shows
# ---------------------------------------------------------------------------

def fetch():
    today = today_zurich()
    seasons = get_json(f'{API}/season?per_page=100&_fields=id,name,count')
    first = today.year if today.month >= 8 else today.year - 1        # the season running now, and the next
    current = [s for s in seasons if re.match(r'^\d{4}/\d{2,4}$', s.get('name', ''))
               and int(s['name'][:4]) in (first, first + 1)]
    disciplines = {d['id']: fold(d['name']) for d in get_json(f'{API}/discipline?per_page=100&_fields=id,name')}
    metas, skipped = {}, {}
    for s in current:
        for page in (1, 2):
            shows = get_json(f"{API}/show?season={s['id']}&per_page=100&page={page}"
                             f"&_fields=id,link,title,discipline")
            for sh in shows:
                genres = [disciplines.get(i, '') for i in sh.get('discipline') or []]
                kind = next((_KEEP[g] for g in genres if g in _KEEP), None)
                title = clean(_html.unescape((sh.get('title') or {}).get('rendered', '')))
                if not kind:
                    skipped['/'.join(genres) or 'none'] = skipped.get('/'.join(genres) or 'none', 0) + 1
                    continue
                if skip_title(title):
                    skipped['talk / family'] = skipped.get('talk / family', 0) + 1
                    continue
                metas[sh['link']] = {'title': title, 'kind': kind,
                                     'series': next((g.capitalize() for g in genres if g in _KEEP), None)
                                     if kind != 'opera' else None}
            if len(shows) < 100:
                break
    if skipped:
        log.info('carlo_felice_genova: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    events, read, reused = read_pages(KEY, list(metas), lambda html, url: parse_show(html, url, metas[url]))
    log.info('carlo_felice_genova: %d show page(s) read, %d reused, %d performances', read, reused, len(events))
    return events
