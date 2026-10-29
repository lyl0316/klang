"""Rundfunk Orchester und Chöre Berlin (ROC): the concerts of the Rundfunk-Sinfonieorchester Berlin
(RSB), the Deutsches Symphonie-Orchester Berlin (DSO), the Rundfunkchor Berlin and the RIAS
Kammerchor, from ROC's common calendar.

    https://www.roc-berlin.de/kalender/                           every published concert (one page)
    https://www.roc-berlin.de/konzerte/<slug>/concert/<id>/       one page per concert

The calendar page lists the whole published season (about 180 concerts): title, date and
time, place, the ensemble (text and logo), the composers' surnames, labels (Sinfoniekonzert,
Chorkonzert, Kammermusik, Kinderkonzert …) and the ticket link; a schema.org ItemList gives
each concert's startDate. That startDate carries "+00:00" but is Berlin local time ("Sonntag,
20 Uhr" = "T20:00:00+00:00"; checked against the website on 29 Oct 2026), so the offset is
ignored and the time read as Berlin time.

The concert pages add the programme (composer / work), the performers with their roles
("Dalia Stasevska, Dirigentin") and the place's town (JSON-LD address). They are read
incrementally (one request each): a concert the previous feed already has (same id, start
and title, the composers listed still in its programme) keeps what was read, and only concerts
in the next week and a fixed share of the others (about weekly) are read again. Concerts at an
unknown place are read first (the page names the town); the rest nearest first.

Skipped: children's and family concerts (label Kinderkonzert, Rapauke, Dornröschen …),
sing-alongs, the Symphonic Mob, film concerts, circus shows, jazz/electronic evenings
(Jazzik), lounge formats, and concerts abroad (tours to Austria, Italy, Spain, Hungary …).
Concerts elsewhere in Germany keep their town (Cologne, Hamburg, Munich …).
"""
from __future__ import annotations

import html as _html
import re

from common import (BudgetExceeded, FetchError, clean, event_id, get, infer_type, jsonld_events, log,
                    looks_cancelled, make_event, previous_event, refresh_due, requests_left)

from ._berlin import abroad, berlin_iso, credit, german_town, is_interval, is_pop, skip_title, venue_name

KEY = 'roc_berlin'
NAME = 'Rundfunk Orchester und Chöre Berlin (RSB, DSO, Rundfunkchor, RIAS Kammerchor)'
SITE = 'https://www.roc-berlin.de/'
ATTRIBUTION = 'Source: ROC Berlin (roc-berlin.de)'
KIND = 'orchestra'
COUNTRY = 'germany'
MAX_REQUESTS = 150
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 7

BASE = 'https://www.roc-berlin.de'
LISTING = BASE + '/kalender/'

_SKIP_RE = re.compile(r'rapauke|dornröschen|mitsing|symphonic mob|spontanorchester|filmkonzert|circus|zirkus|'
                      r'roncalli|jazzik|reimagined|lounge|im zoo\b|kinderkünste', re.I)
_SKIP_LABELS = {'kinderkonzert'}
# places known to be in Berlin (the calendar rarely names the town)
_BERLIN_PLACE_RE = re.compile(r'berlin|haus des rundfunks|philharmonie(?! essen| köln| münchen| hamburg)|'
                              r'^konzerthaus$|konzerthaus berlin|gemäldegalerie|villa elisabeth|tempodrom|clärchens|'
                              r'ballhaus wedding|fotografiska|kühlhaus|silent green|radialsystem|heimathafen|'
                              r'theater im delphi|uber arena|zoologischer garten|potsdamer platz|geheimes staatsarchiv|'
                              r'udk|universität der künste|berliner dom|gethsemanekirche|zeiss-großplanetarium|'
                              r'exploratorium|tangoloft|museum für fotografie|nikolaikirche spandau|'
                              r'kaiser-wilhelm-gedächtnis|pierre boulez saal|staatsoper|komische oper|deutsche oper|'
                              r'emmauskirche|passionskirche|apostel-paulus|st\. afra|rosenkranz-basilika|'
                              r'kirche st\. marien', re.I)
_ENSEMBLES = {
    'rsb': 'Rundfunk-Sinfonieorchester Berlin', 'dso': 'Deutsches Symphonie-Orchester Berlin',
    'rchb': 'Rundfunkchor Berlin', 'rias': 'RIAS Kammerchor Berlin',
}


def parse_listing(page_html):
    """-> list of concert dicts from the calendar page."""
    h = page_html or ''
    starts = {}
    for ev in jsonld_events(h):
        url = str(ev.get('url') or '')
        m = re.search(r'/concert/(\d+)/?$', url)
        if m and ev.get('startDate'):
            starts[m.group(1)] = str(ev['startDate'])
    out = []
    parts = re.split(r'<div id="concert_(\d+)" class="ConcertListItem', h)
    for i in range(1, len(parts), 2):
        cid, c = parts[i], parts[i + 1]
        title = re.search(r'ConcertListItem-Title">\s*<span>(.*?)</span>', c, re.S)
        link = re.search(r'<a href="([^"]+/concert/\d+/?)"', c)
        if not title or not link:
            continue
        loc = re.search(r'ConcertListItem-location">(.*?)</span>', c, re.S)
        tm = re.search(r'ConcertListItem-time">(.*?)</span>', c, re.S)
        ens = re.search(r'ConcertListItem-ensemble">(.*?)</span>', c, re.S)
        comp = re.search(r'ConcertListItem-composer">(.*?)</span>', c, re.S)
        labels = re.search(r'ConcertListItem-Labels">(.*?)</div>', c, re.S)
        ticket = re.search(r'ConcertListItem-Meta-Action[^"]*"\s+href="([^"]+)"', c)
        out.append({
            'id': cid,
            'title': clean(title.group(1)),
            'url': _html.unescape(link.group(1)),
            'place': clean(loc.group(1)) if loc else '',
            'time_text': clean(tm.group(1)) if tm else '',
            'ensemble': clean(ens.group(1)) if ens else '',
            'logos': re.findall(r'#logo_(\w+)', c),
            'composers': [x.strip() for x in clean(comp.group(1)).split(',') if x.strip()] if comp else [],
            'labels': [clean(x) for x in re.findall(r'<a[^>]*>(.*?)</a>', labels.group(1), re.S)] if labels else [],
            'ticket': _html.unescape(ticket.group(1)) if ticket else None,
            'start_raw': starts.get(cid),
        })
    return out


def parse_detail(page_html):
    """-> {'works': [(composer, work)], 'people': [(role text, name)], 'town': str|None, 'cancelled': bool}."""
    h = page_html or ''
    out = {'works': [], 'people': [], 'town': None, 'cancelled': False, 'ensembles': []}
    for w in re.findall(r'<div class="ProductionContent-Work">(.*?)</div>', h, re.S):
        lines = [clean(x) for x in re.split(r'<br\s*/?>', w)]
        lines = [x for x in lines if x]
        if not lines or is_interval(lines[0]):
            continue
        composer, work = (lines[0], ' '.join(lines[1:])) if len(lines) > 1 else ('', lines[0])
        out['works'].append((composer, work))
    for p in re.findall(r'<span class="ProductionContent-Contributer">(.*?)</span>', h, re.S):
        text = clean(p)
        if not text:
            continue
        name, _, role = text.rpartition(',')
        if not name:
            name, role = role, ''
        out['people'].append((role.strip(), name.strip()))
    out['ensembles'] = [clean(x) for x in re.findall(r'<span class="ProductionContent-Ensemble">(.*?)</span>', h, re.S)]
    for ev in jsonld_events(h):
        loc = ev.get('location') if isinstance(ev.get('location'), dict) else {}
        addr = loc.get('address') if isinstance(loc.get('address'), dict) else {}
        out['town'] = clean(addr.get('addressLocality')) or None
        out['country'] = clean(addr.get('addressCountry')) or None
        geo = loc.get('geo') if isinstance(loc.get('geo'), dict) else {}
        try:
            out['geo'] = (float(geo['latitude']), float(geo['longitude']))
        except (KeyError, TypeError, ValueError):
            out['geo'] = None
        status = str(ev.get('eventStatus') or '')
        out['cancelled'] = bool(re.search(r'cancel|postpon', status, re.I))
        break
    return out


def _start(c):
    raw = c.get('start_raw') or ''
    m = re.match(r'(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})', raw)
    if not m:
        return None
    hh, mm = m.group(2), m.group(3)
    t = re.search(r'(\d{1,2})(?:[.:](\d{2}))?\s*Uhr', c['time_text'])
    if t and (int(t.group(1)), int(t.group(2) or 0)) != (int(hh), int(mm)):
        log.warning('%s %s: listing says %s, JSON-LD %s:%s; using the listing', KEY, c['id'], c['time_text'], hh, mm)
        hh, mm = f'{int(t.group(1)):02d}', f'{int(t.group(2) or 0):02d}'
    return berlin_iso(f'{m.group(1)}T{hh}:{mm}')          # the "+00:00" is wrong: Berlin local time


def _town(place):
    """('Berlin' | German town | None for unknown, abroad flag)."""
    if abroad(place):
        return None, True
    town = german_town(place)
    if town and town != 'Berlin' and not _BERLIN_PLACE_RE.search(re.sub(r'(?i)berlin-\w+', 'Berlin', place)):
        return town, False
    if town == 'Berlin' or _BERLIN_PLACE_RE.search(place):
        return 'Berlin', False
    return town, False


def _in_germany(lat, lon):
    # a rough box; Austria and Switzerland inside it are caught by the place names (abroad())
    return 47.2 <= lat <= 55.1 and 5.8 <= lon <= 15.1


def _in_berlin(lat, lon):
    return 52.33 <= lat <= 52.68 and 13.08 <= lon <= 13.77


def _name_key(text):
    from ._berlin import fold
    return re.sub(r'[^a-z0-9]+', ' ', fold(clean(text))).strip()


def _listing_matches(c, prev):
    composers = ' | '.join(_name_key(p.get('composer')) for p in prev.get('program') or [])
    return all(_name_key(x) and _name_key(x) in composers for x in c['composers'])


def _type(c, credits, works):
    labels = {x.lower() for x in c['labels']}
    roles = {r for r, _ in credits}
    if 'chorkonzert' in labels or 'Choir' in roles and 'Orchestra' not in roles:
        return 'vocal-opera'
    if 'kammermusik' in labels:
        return 'chamber'
    if 'Choir' in roles:
        return 'vocal-opera'
    if 'sinfoniekonzert' in labels or 'Orchestra' in roles:
        return 'orchestral'
    return infer_type(c['title'], credits, works)


def fetch():
    concerts = parse_listing(get(LISTING))
    skipped, cands = {}, []

    def skip(why, c):
        skipped[why] = skipped.get(why, 0) + 1
        log.debug('%s: skipped (%s): %s %s', KEY, why, c.get('start_raw'), c['title'])

    for c in concerts:
        text = f"{c['title']} {c['place']}"
        if skip_title(c['title']) or _SKIP_RE.search(text) or _SKIP_LABELS & {x.lower() for x in c['labels']}:
            skip('children / sing-along / film / show', c)
            continue
        if is_pop(c['title']):
            skip('jazz / pop', c)
            continue
        start = _start(c)
        if not start:
            skip('no date', c)
            continue
        town, away = _town(c['place'])
        if away:
            skip('abroad', c)
            continue
        c.update(start=start, town=town, detail=None, reused=None)
        cands.append(c)

    # concert pages, incrementally
    order = []
    for c in cands:
        prev = previous_event(event_id(KEY, c['id']), c['start'], title=c['title'])
        if prev and _listing_matches(c, prev) and prev.get('city') and \
                not refresh_due(c['id'], c['start'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS):
            c['reused'] = prev
            continue
        order.append(c)
    order.sort(key=lambda c: (c['town'] is not None, c['start']))
    read = 0
    for c in order:
        if requests_left() <= 0:
            break
        try:
            c['detail'] = parse_detail(get(c['url']))
            read += 1
        except BudgetExceeded as err:
            log.warning('%s: stopped reading concert pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: concert page failed: %s', KEY, c['id'], err)

    events = []
    for c in cands:
        d, prev = c['detail'], c['reused']
        city = c['town']
        if d:
            country = (d.get('country') or '').lower()
            geo = d.get('geo')
            if (country and country not in ('deutschland', 'germany', 'de')) or (geo and not _in_germany(*geo)):
                skip('abroad', c)
                continue
            if geo and _in_berlin(*geo):
                city = 'Berlin'
            if d.get('town'):
                city = city or german_town(d['town']) or d['town']
            credits = [x for x in (credit(r, n) for r, n in d['people']) if x]
            works = d['works']
        elif prev:
            city = city or prev.get('city')
            credits = [(x.get('role'), x.get('name')) for x in prev.get('credits') or []]
            works = [(p.get('composer') or '', p.get('title') or '') for p in prev.get('program') or []]
        else:
            credits, works = [], [(x, '') for x in c['composers']]
        if not city:
            skip('place unknown (page not read yet)', c)
            continue
        if not any(r in ('Orchestra', 'Choir', 'Ensemble') for r, _ in credits):
            # the listing's ensemble (or logo) plays even when the page does not credit it
            groups = [c['ensemble']] if c['ensemble'] else [_ENSEMBLES[x] for x in c['logos'] if x in _ENSEMBLES]
            for g in groups:
                if re.match(r'(?i)(mitglieder|stipendiat|akademist|kammermusikensembles|musikenthusiast)', g):
                    credits.append(('Ensemble', g))
                elif g not in {n for _, n in credits}:
                    credits += [x for x in [credit('', g)] if x]
        if city == 'Berlin' and re.fullmatch(r'(?i)haus des rundfunks', c['place']):
            venue = 'Haus des Rundfunks'
        else:
            venue = venue_name(c['place'])
        cancelled = bool(d and d.get('cancelled')) or looks_cancelled(c['title'])
        try:
            events.append(make_event(
                KEY, c['id'], c['title'], c['start'], city=city, venueName=venue,
                type=_type(c, credits, works), credits=credits, program=works, ticketUrl=c['ticket'], url=c['url'],
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, c['id'], err)
    if skipped:
        log.info('%s: skipped %s', KEY, ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    log.info('%s: %d concert page(s) read, %d reused from the previous feed', KEY, read,
             sum(1 for c in cands if c['reused'] and not c['detail']))
    return events
