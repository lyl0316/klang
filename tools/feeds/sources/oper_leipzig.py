"""Oper Leipzig: opera, operetta (Musikalische Komödie), ballet and concerts from the house's own
event API (the JSON its programme page is built from).

    https://www.oper-leipzig.de/de/api/events/?page=N          10 performances per page

The API (robots.txt only closes /ls/) lists every coming performance of the three houses
(Opernhaus, Musikalische Komödie, Leipziger Ballett) with start/end (with offset), title,
composer ("writer"), stage, branch, ticket status and link, and the cast and team of that very
evening (``cast_objs`` / ``productionteam_objs``). So one run reads ~45 pages and no
detail pages. ``page_size`` is ignored by the server. Only facts are taken (date, time, title,
stage, people and their roles, links); never the descriptions.

Kept: opera, operetta, ballet with live music (an orchestra in the evening's cast), concerts and
galas of the house. Skipped: musicals (the Musikalische Komödie plays both: an evening there
is kept only when its composer is an operetta composer or it is a concert/gala, since the API has
no genre field), Junge Oper Leipzig and other children's/education formats, guided tours,
introductions, matinées, "Kostprobe", after-show formats (Absacker, Venusnächte, Poetry Slam),
rentals to other promoters ("Vermietung") and ballets without an orchestra (danced to
recordings). Guest performances elsewhere keep their place when it is in Germany.

The house orchestra of the opera is the Gewandhausorchester, which also lists these evenings
on gewandhausorchester.de ("In der Oper"); build.py merges the two by venue and time.
Checked against the website on 29 Oct 2026 (434 performances in the API, Oct 2026 – Jul 2027).
"""
from __future__ import annotations

import re

from common import BudgetExceeded, FetchError, clean, get_json, log, looks_cancelled, make_event, requests_left

from ._saxony import berlin_iso, cast_credits, german_town, skip_reason

KEY = 'oper_leipzig'
NAME = 'Oper Leipzig'
SITE = 'https://www.oper-leipzig.de/'
ATTRIBUTION = 'Source: Oper Leipzig (oper-leipzig.de)'
KIND = 'venue'
COUNTRY = 'germany'
MAX_REQUESTS = 60              # ~45 API pages of 10 performances
TIME_LIMIT = 400

BASE = 'https://www.oper-leipzig.de'
API = BASE + '/de/api/events/?page={n}'
MAX_PAGES = 58
CITY = 'Leipzig'

_SKIP_BRANCH = {'vermietung', 'sonstige', 'education', 'junge oper leipzig'}
_SKIP_TITLE = re.compile(r'(?i)matin[ée]e|venusn[äa]chte|poetry slam|schreib:maschine|quick change|spurensuche|'
                         r'roter teppich|weihnachtsbaumschm|nachhall|vorspann|klischee|kleinsten|babykonzert|'
                         r'klassik f[üu]r kinder|lauschkonzert|training plus|onboarding|backstage|welttanztag|'
                         r'out of the box|spitze!|pirouette|zusammen!|in mir singt ein lied')
# composers whose stage works the Musikalische Komödie plays as operetta (everything else there is a musical)
_OPERETTA_RE = re.compile(r'(?i)leh[áa]r|strau(?:ß|ss)|offenbach|k[áa]lm[áa]n|benatzky|mill[öo]cker|zeller|supp[ée]|'
                          r'lincke|abraham|stolz|f[ae]ll\b|kollo|heuberger|planquette|ziehrer|jessel|k[üu]nneke|'
                          r'nedbal|oscar straus|sullivan|messager|herv[ée]|lecocq|dost[aá]l|raymond|j[ae]ssel')
_CONCERT_RE = re.compile(r'(?i)konzert|gala|sinfoni|symphon|liederabend|rezital|recital|requiem|oratori')


def _name(p):
    return clean(' '.join(x for x in (p.get('first_name'), p.get('last_name')) if x))


def _people(objs):
    out = []
    for o in objs or []:
        role = clean(((o or {}).get('role_obj') or {}).get('name'))
        for p in (o or {}).get('persons_objs') or []:
            n = _name(p or {})
            if n:
                out.append((role, n))
    return out


def _venue(ev):
    """-> (venueName, city). The houses as 'Oper Leipzig, Opernhaus' / 'Oper Leipzig, Musikalische
    Komödie' (plus the room, e.g. '– Konzertfoyer'); other places in Leipzig as named."""
    stage = clean((ev.get('stage_obj') or {}).get('fe_name') or (ev.get('stage_obj') or {}).get('name'))
    low = stage.lower()
    if not stage or low in ('opernhaus', 'oper leipzig'):
        return 'Oper Leipzig, Opernhaus', CITY
    if low == 'musikalische komödie':
        return 'Oper Leipzig, Musikalische Komödie', CITY
    if 'venussaal' in low or 'musikalische komödie' in low:
        room = re.sub(r'(?i)\s*musikalische komödie\s*', ' ', stage).strip() or 'Venussaal'
        return f'Oper Leipzig, Musikalische Komödie – {room}', CITY
    if 'opernhaus' in low:
        room = re.sub(r'(?i)\s*opernhaus\s*', ' ', stage).strip()
        return f'Oper Leipzig, Opernhaus – {room}', CITY
    town = german_town(stage, default=CITY)
    return stage, town


def classify(ev):
    """-> 'opera' | 'ballet' | 'concert' | None (skip), with the reason for a skip."""
    title = clean(ev.get('title'))
    subtitle = clean(ev.get('subtitle'))
    branch = clean(ev.get('branch_name')).lower()
    category = clean((ev.get('activitycategory_obj') or {}).get('name')).lower()
    writer = clean(ev.get('writer'))
    if ev.get('is_junge_oper_leipzig'):
        return None, 'junge oper'
    if branch in _SKIP_BRANCH:
        return None, f'branch {branch}'
    if category.startswith('sonst'):
        return None, 'other event'
    why = skip_reason(title, subtitle) or (_SKIP_TITLE.search(title) and 'format')
    if why:
        return None, why
    team = [r.lower() for r, _ in _people(ev.get('productionteam_objs'))]
    cast = _people(ev.get('cast_objs'))
    has_orchestra = any(re.search(r'(?i)orchester|kapelle', f'{r} {n}') for r, n in cast)
    if branch == 'leipziger ballett' or re.search(r'(?i)\(ballett\)|^ballett$', f'{title} {subtitle}'):
        if not has_orchestra and 'musikalische leitung' not in team:
            return None, 'ballet without live music'
        return 'ballet', None
    if branch == 'musikalische komödie':
        if _CONCERT_RE.search(f'{title} {subtitle}'):
            return 'concert', None
        if writer and _OPERETTA_RE.search(writer):
            return 'opera', None
        return None, 'musical'
    if _CONCERT_RE.search(f'{title} {subtitle}') and not writer:
        return 'concert', None
    return 'opera', None


def _program(kind, title, writer):
    """The composer(s) from the 'writer' field: 'Giacomo Puccini' for an opera; for a ballet
    the part after the choreographer ('Andreas Heise / Ruggero Leoncavallo, Carl Orff')."""
    writer = clean(writer).replace('\u200a', ' ')
    if not writer or len(writer) > 120:
        return []
    if kind == 'opera':
        return [(writer, title)] if '/' not in writer and len(writer) < 60 else []
    if kind == 'ballet' and '/' in writer:
        names = [re.sub(r'(?i)\s+u\.\s*a\.?$', '', n).strip(' .') for n in re.split(r'\s*,\s*|\s+und\s+',
                                                                                    writer.split('/', 1)[1])]
        names = [n for n in names if n and len(n) < 50]
        if len(names) == 1:
            return [(names[0], title)]
        return [(n, '') for n in names]
    return []


def _type(kind, title, credits):
    roles = {r for r, _ in credits}
    if kind == 'opera':
        return 'vocal-opera'
    if kind == 'ballet':
        return 'vocal-opera' if roles & {'Soprano', 'Tenor', 'Baritone', 'Choir'} else 'orchestral'
    if roles & {'Soprano', 'Mezzo-soprano', 'Alto', 'Tenor', 'Baritone', 'Bass', 'Choir', 'Voice'}:
        return 'vocal-opera'
    if 'Orchestra' in roles:
        return 'orchestral'
    return None


def fetch():
    rows, n, total = [], 1, None
    while n <= MAX_PAGES:
        if requests_left() <= 0:
            log.warning('oper_leipzig: request cap reached at page %d', n)
            break
        try:
            data = get_json(API.format(n=n))
        except BudgetExceeded as err:
            log.warning('oper_leipzig: stopped at page %d: %s', n, err.reason)
            break
        except FetchError as err:
            if n == 1:
                raise
            log.warning('oper_leipzig: page %d failed: %s', n, err)
            if getattr(err, 'status', None) == 404:
                break
            n += 1
            continue
        total = data.get('count', total)
        rows.extend(data.get('results') or [])
        if not data.get('next'):
            break
        n += 1
    log.info('oper_leipzig: %d page(s), %d of %s performances', n, len(rows), total)

    events, skipped = [], {}
    for ev in rows:
        kind, why = classify(ev)
        if not kind:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        if ev.get('is_past'):
            continue
        venue, city = _venue(ev)
        if not city:
            skipped['abroad'] = skipped.get('abroad', 0) + 1
            continue
        people = _people(ev.get('productionteam_objs')) + _people(ev.get('cast_objs'))
        credits = cast_credits(people, kind='opera' if kind == 'opera' else ('ballet' if kind == 'ballet' else 'concert'))
        title = clean(ev.get('title'))
        writer = clean(ev.get('writer'))
        program = _program(kind, title, writer)
        slug = ((ev.get('slug') or {}).get('de')) or ''
        url = f'{BASE}/de/programm/{slug}/{ev.get("production")}' if slug and ev.get('production') else BASE + '/de/programm'
        status = clean(ev.get('ticket_status'))
        cancelled = (looks_cancelled(title) or looks_cancelled(clean(ev.get('subtitle')))
                     or bool(re.search(r'(?i)cancel|abgesagt|entf', status)))
        try:
            events.append(make_event(
                KEY, ev.get('id'), title, berlin_iso(ev.get('start')), end=ev.get('end'),
                city=city, venueName=venue, type=_type(kind, title, credits),
                credits=credits, program=program,
                ticketUrl=ev.get('ticket_link') or None, url=url,
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('oper_leipzig %s: skipped: %s', ev.get('id'), err)
    if skipped:
        log.info('oper_leipzig: skipped %s', ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    return events
