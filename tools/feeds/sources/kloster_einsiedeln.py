"""Kloster Einsiedeln: concerts and organ concerts in the abbey church and the abbey's Grosser Saal.

    https://www.kloster-einsiedeln.ch/agenda-kultur/kultur/vorschau-musiknews/konzerte
    https://www.kloster-einsiedeln.ch/agenda-kultur/kultur/vorschau-musiknews/orgelkonzerte

The abbey's music pages list each event with its date and local start (``<time datetime=...>``,
"So 29.11.2026, 17.15 Uhr"), the title, the performers ("mit dem Concento Stravagante") and the
place ("Klosterkirche", "Grosser Saal"). Only the categories "Konzerte" and "Orgelkonzerte" are read;
the feast-day services with music are worship, not concerts. Two requests per run.
"""
from __future__ import annotations

import html as htmllib
import re
from urllib.parse import urljoin

from common import FetchError, clean, get, log, looks_cancelled, make_event, to_zurich_datetime, today_zurich
from ._east import NOT_A_CONCERT, fold, group_role, infer_type, is_group, local_iso, parse_lineup

KEY = 'kloster_einsiedeln'
NAME = 'Kloster Einsiedeln'
SITE = 'https://www.kloster-einsiedeln.ch/'
ATTRIBUTION = 'Source: Kloster Einsiedeln (kloster-einsiedeln.ch)'
KIND = 'venue'
MAX_REQUESTS = 4
TIME_LIMIT = 60

BASE = 'https://www.kloster-einsiedeln.ch'
PAGES = (('konzerte', None), ('orgelkonzerte', 'recital'))
LIST = BASE + '/agenda-kultur/kultur/vorschau-musiknews/{}'
PLACES = {'klosterkirche': 'Klosterkirche Einsiedeln', 'grosser saal': 'Kloster Einsiedeln, Grosser Saal',
          'kloster einsiedeln': 'Kloster Einsiedeln', 'barocksaal': 'Kloster Einsiedeln, Barocksaal'}


def _performers(text):
    t = re.sub(r'^(?:mit\s+)?(?:dem|den|der|die|das)?\s*', '', text.strip(), flags=re.I)
    credits = parse_lineup(t)
    if not credits:
        for part in re.split(r'\s+und\s+|,\s*', t):
            part = part.strip()
            if part and is_group(part):
                credits.append((group_role(part), part))
    if re.match(r'mit (dem|den)\b', fold(text)):          # "mit dem Concento Stravagante": a group
        credits = [('Ensemble' if r == 'Performer' else r, n) for r, n in credits]
    return credits


def fetch():
    today = today_zurich()
    events, seen = [], set()
    for slug, hint in PAGES:
        try:
            page = get(LIST.format(slug))
        except FetchError:
            if slug == 'konzerte':
                raise
            continue
        page = page.split('category_navigation', 1)[-1]
        for art in re.split(r'<div class="article ', page)[1:]:
            link = re.search(r'href="([^"]+)"', art)
            title = re.search(r'itemprop="headline">(.*?)</span>', art, re.S)
            stamps = re.findall(r'<time[^>]*datetime="([^"]+)"', art)
            teaser = re.search(r'class="datetext_auflistung"[^>]*>(.*?)</div>', art, re.S)
            if not (link and title and len(stamps) >= 2):
                continue
            day = re.match(r'(\d{4})-(\d{2})-(\d{2})$', stamps[0])
            hm = re.search(r'(\d{1,2}):(\d{2})', stamps[1])
            if not (day and hm):
                continue
            url = urljoin(BASE, htmllib.unescape(link.group(1)))
            if url in seen:
                continue
            seen.add(url)
            title = clean(title.group(1))
            if NOT_A_CONCERT.search(fold(title)):
                continue
            start = local_iso(*(int(x) for x in day.groups()), int(hm.group(1)), int(hm.group(2)))
            if to_zurich_datetime(start).date() < today:
                continue
            lines = [clean(p) for p in re.findall(r'<p>(.*?)</p>', teaser.group(1) if teaser else '', re.S)]
            lines = [l for l in lines if l]
            who = lines[0] if lines else ''
            place = lines[1] if len(lines) > 1 else 'Klosterkirche'
            credits = _performers(who)
            kind = hint or infer_type(f'{title} {who}', credits)
            try:
                events.append(make_event(
                    KEY, url.rstrip('/').rsplit('/', 1)[-1], title, start, city='Einsiedeln',
                    venueName=PLACES.get(fold(place), f'{place}, Kloster Einsiedeln'), type=kind,
                    series='Orgelkonzert' if slug == 'orgelkonzerte' else None, credits=credits, url=url,
                    status='cancelled' if looks_cancelled(f'{title} {who}') else 'scheduled'))
            except ValueError as err:
                log.warning('%s: skipped %s: %s', KEY, url, err)
    return events
