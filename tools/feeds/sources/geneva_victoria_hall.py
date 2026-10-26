"""Victoria Hall, Geneva: the Ville de Genève agenda of the hall (open data).

Source: the city's "Agenda du Victoria Hall" dataset on opendata.swiss, published through
OpenAgenda (agenda 36135579). Licence: open use, the source must be given (ATTRIBUTION).
Read via OpenAgenda's public JSON export (one request per 100 events). Each OpenAgenda
event can have several timings; every timing becomes one Klang concert.

Facts kept: title, date/time (timings are UTC with 'Z'), hall, performers with roles and
works (parsed from the structured head of the long description: '**Name** role' and
'**Composer**' + '_Work_' lines), ticket link, cancelled status. The prose is never copied.
The hall also hosts jazz/pop shows and ceremonies; those are dropped.
"""
from __future__ import annotations

import re

from common import FetchError, clean, log, make_event, to_zurich_datetime, to_zurich_iso, today_zurich
from ._geneva import (CREATIVE, OA_STATUS_CANCELLED, OA_STATUS_ONLINE, concert_type, duration_minutes, fold,
                     group_role, oa_tags, oa_text, oa_ticket_url, on_date, openagenda_events,
                     parse_programme_markdown, role_en, stable_ids, swiss_city)

KEY = 'geneva_victoria_hall'
NAME = 'Victoria Hall, Genève (Ville de Genève)'
SITE = 'https://victoriahall.geneve.ch/'
ATTRIBUTION = ('Source: Ville de Genève – Agenda du Victoria Hall (opendata.swiss, via OpenAgenda). '
               'Licence: open use, source must be given.')
KIND = 'venue'
MAX_REQUESTS = 6
TIME_LIMIT = 180

AGENDA_UID = 36135579

# shows that are not classical concerts (title / subtitle / description words, accent-folded)
_EXCLUDE = re.compile(r'\b(ceremonie|remise des (diplomes|prix)|conference|visite|atelier|assemblee|'
                      r'soiree dansante|bal|stand-up|spectacle d.humour)\b')
_NON_CLASSICAL = re.compile(r'\b(jazz|pop|rock|pop-rock|chanson|chansons francaises|variete|varietes|crooners?|'
                            r'hip-hop|rap|gospel|soul|funk|reggae|electro|humou?r|humoriste|comedie musicale|'
                            r'cabaret|fado|musique portugaise|world music|blues|metal)\b')
_CLASSICAL = re.compile(r'(classique|opera|orchestr|symphon|philharm|sinfoniet|quatuor|sonate|concerto|recital|'
                        r'baroque|choeur|messe\b|requiem|cantate|oratorio|lieder|passion)')
_SERIES = re.compile(r'(grands interpretes|pour-cent|migros|concerts? du dimanche|classics|saison)', re.I)


def _without_groups(text, credits, *, title=False):
    """Accent-folded text minus performer and group names: 'POP! – Concert de Noël de l'Orchestre
    de Chambre de Genève' must not count as classical just because an orchestra plays it.
    ``title``: also drop title segments that name a group."""
    t = fold(text)
    names = {fold(c['name']) for c in credits}
    for seg in re.split(r'\s*(?:;|\|| [–—-] |,)\s*', text) if title else []:
        if group_role(seg):
            names.add(fold(seg.strip()))
    for n in sorted(names, key=len, reverse=True):
        if len(n) >= 4:
            t = t.replace(n, ' ')
    return re.sub(r"\b(l'|de l'|du |de la |des )?(orchestre|orchestra|symphonic|symphonique)\b", ' ', t)


def _is_classical(head, md, credits, program):
    h = fold(head)
    if _EXCLUDE.search(h):
        return False
    hg = _without_groups(head, credits, title=True)
    if _NON_CLASSICAL.search(hg) and not _CLASSICAL.search(hg):
        return False                                 # 'POP! – Concert de Noël de l'OCG', jazz trio ...
    body_raw = fold(md[:2000])
    body = _without_groups(md[:2000], credits)
    if not program and _NON_CLASSICAL.search(body) and not _CLASSICAL.search(body):
        return False                                 # film tunes + pop-rock covers with an orchestra
    evidence = bool(program) or bool(_CLASSICAL.search(h)) or any(
        c['role'] in ('Orchestra', 'Choir', 'Chorus master') or 'Conductor' in c['role'] for c in credits)
    if evidence:
        return True
    if _NON_CLASSICAL.search(body_raw):
        return False
    return bool(credits) or bool(_CLASSICAL.search(body_raw))


def title_and_series(title, subtitle, tags):
    """OpenAgenda 'sous-titre' is either a series ('Les Grands Interprètes 3') or part of the
    concert's name ('Gli Angeli Genève' + 'Passion selon saint Jean')."""
    title, subtitle = clean(title), clean(subtitle)
    series = None
    if subtitle and _SERIES.search(fold(subtitle)):
        series = re.sub(r'\s*\d+\s*$', '', subtitle).replace('Migros-Pour-cent-culturel-Classics',
                                                              'Migros-Pour-cent-culturel Classics')
    elif subtitle:
        ft, fs = fold(title), fold(subtitle)
        if fs in ft:
            pass
        elif fs.startswith(ft):
            title = subtitle
        else:
            title = f'{title} – {subtitle}'
    if not series and 'concert-du-dimanche' in tags:
        series = 'Concerts du dimanche'
    return title, series


def trim_title(title, credits):
    """'Opéra Carmen de Bizet – Orchestre Concertus; Ensemble Vocal Orphée; …, direction' ->
    'Opéra Carmen de Bizet': trailing segments that only repeat the line-up are dropped
    (Klang lists performers separately). Titles that *are* the performers stay as they are."""
    parts = re.split(r'\s*;\s*|\s+[–—]\s+', title)
    if len(parts) < 2:
        return title
    names = [fold(c['name']) for c in credits]

    def performer_like(seg):
        f = fold(seg).strip()
        if not f:
            return True
        if any(f == n or (len(f) >= 3 and f in n) for n in names):
            return True
        m = re.match(r'^(.+?),\s*([^,]+)$', seg)
        return bool(m and role_en(m.group(2).strip(' .')) not in (None, CREATIVE))

    if performer_like(parts[0]):
        return title                                  # 'Emmanuel Pahud; Éric Le Sage': the title is the line-up
    keep = list(parts)
    while len(keep) > 1 and performer_like(keep[-1]):
        keep.pop()
    if len(keep) == len(parts):
        return title
    # rebuild with the original separators of the kept head
    head_len = len(' – '.join(keep))
    out = title
    for sep_pos in range(len(title)):
        candidate = title[:sep_pos]
        if re.sub(r'\s*;\s*|\s+[–—]\s+', '|', candidate) == '|'.join(keep):
            out = candidate
            break
    return out.strip(' ;–—-') if head_len else title


_NAME_SMALL = {'de', 'du', 'des', 'la', 'le', 'les', 'et', 'der', 'die', 'das', 'di', 'del', 'della', 'von', 'van',
               'of', 'the', 'and', 'y', 'e', 'a'}


def _title_groups(title, credits):
    """Groups named only in the title ('Gewandhausorchester Leipzig', '… – Orchestre de la
    Suisse Romande') -> extra Orchestra/Choir/Ensemble credits. Only segments that read as a
    name: not 'L'OSR invite le Berner …', 'Concert de Noël de l'Orchestre …', nor one that
    merely contains a group already credited ('Violonissimo & Camerata Contrepoint')."""
    have = {fold(c['name']) for c in credits}
    extra = []
    for part in re.split(r'\s*(?:;|\||&|\s[–—-]\s|,)\s*', title):
        part = part.strip()
        role = group_role(part)
        f = fold(part)
        if not role or not 3 <= len(part) <= 70 or not part[:1].isupper() or re.search(r'\d', part):
            continue
        if any(f in h or h in f for h in have if len(h) >= 4):
            continue
        if re.match(r'(concert|recital|gala|soiree|festival|hommage|cycle|saison)\b', f):
            continue
        tokens = part.split()
        first = next((i for i, w in enumerate(tokens) if group_role(w)), 0)
        if any(w[:1].islower() and fold(w) not in _NAME_SMALL for w in tokens[:first]):
            continue                                 # a sentence, not a name: 'L'OSR invite le Berner …orchester'
        extra.append({'role': role, 'name': part})
        have.add(f)
    return extra


def convert(ev, *, key, today, default_city='Genève', keep=None, parse_kw=None, program_hint=None, kind_hint=None,
            url_of=None):
    """One OpenAgenda event -> list of Klang concerts (one per future timing). Shared with the
    Grand Théâtre reader. ``keep(ev, head, md, credits, program)`` decides whether to keep it."""
    uid = ev.get('uid')
    title_fr = oa_text(ev.get('title'))
    if not uid or not title_fr:
        return []
    status_code = ev.get('status')
    if status_code == OA_STATUS_ONLINE or ev.get('attendanceMode') == 2:
        return []                                    # online only
    custom = ev.get('custom') if isinstance(ev.get('custom'), dict) else {}
    subtitle = oa_text(custom.get('sous-titre'))
    tags = oa_tags(ev)
    md = oa_text(ev.get('longDescription'))
    credits, program = parse_programme_markdown(md, **(parse_kw or {}))
    if program_hint:
        program = program or program_hint(ev, md)
    head = f'{title_fr} {subtitle}'
    if keep is not None and not keep(ev, head, md, credits, program):
        log.debug('%s: skipped %s %r', key, uid, title_fr)
        return []
    credits = credits + _title_groups(title_fr, credits)
    title, series = title_and_series(trim_title(title_fr, credits), subtitle, tags)
    kind = (kind_hint(ev, md) if kind_hint else None) or concert_type(title, credits, program, subtitle)
    venue = clean(ev.get('locationName') or (ev.get('location') or {}).get('name'))
    city = swiss_city(ev.get('city') or (ev.get('location') or {}).get('city')) or default_city
    url = (url_of(ev) if url_of else None) or ev.get('canonicalUrl') or ev.get('permalink')
    ticket = oa_ticket_url(ev)
    cancelled = status_code in OA_STATUS_CANCELLED
    published_duration = duration_minutes(md)       # 'Durée totale approximative de 1h45'

    rows = []
    for t in ev.get('timings') or []:
        try:
            start = to_zurich_datetime(t['start'], assume='UTC')
        except (KeyError, TypeError, ValueError):
            continue
        if start.date() < today:
            continue
        end = None
        try:
            end = to_zurich_datetime(t['end'], assume='UTC') if t.get('end') else None
        except ValueError:
            end = None
        rows.append({'start': start, 'end': end})
    stable_ids(rows, key=lambda r: uid)
    out = []
    for r in rows:
        minutes = published_duration
        if minutes is None and r['end'] is not None:
            minutes = (r['end'] - r['start']).total_seconds() / 60
            if not 45 <= minutes <= 360:            # e.g. a 30-minute placeholder for a recital
                minutes = None
        try:
            out.append(make_event(
                key, r['sid'], title, to_zurich_iso(r['start']),
                durationMin=minutes, city=city, venueName=venue, type=kind,
                series=series, credits=on_date(credits, r['start']), program=program, ticketUrl=ticket, url=url,
                status='cancelled' if cancelled else None))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', key, uid, err)
    return out


def _keep(ev, head, md, credits, program):
    tags = oa_tags(ev)
    if tags and not tags & {'concert', 'opera', 'recital'}:
        return False
    return _is_classical(head, md, credits, program)


def fetch():
    today = today_zurich()
    events = []
    raw = openagenda_events(AGENDA_UID)            # FetchError propagates: build reuses yesterday
    if not raw:
        raise FetchError(f'https://openagenda.com/agendas/{AGENDA_UID}/events.json', 'export returned no events')
    for ev in raw:
        try:
            events.extend(convert(ev, key=KEY, today=today, keep=_keep))
        except Exception as err:                    # one odd listing must not lose the rest
            log.warning('%s: skipped event %s: %s: %s', KEY, ev.get('uid'), type(err).__name__, err)
    return events
