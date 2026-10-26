"""Théâtre du Martolet, Saint-Maurice: the classical concerts of its season (in the theatre
and in the Basilique de Saint-Maurice), from the theatre's own site (Wix).

    https://www.martolet.com/      one request: the season's shows are embedded as Wix data items

The home page carries the season as a Wix collection: per show the title, the date
("pratique": "2026-12-06") and local start time ("heure": "15:30:00.000"), the hall
("lieu"), the line-up ("sousTitre": ensembles and "NAME, role" lists), the works for some
concerts ("distribution": "Composer : Work" lines), the show page and the ticket link.
Only those facts are taken; the presentation texts are not.

The season is mostly theatre, comedy and chanson: only shows whose line-up names
classical forces (orchestra, choir, soloists with instrument or voice, conductor) are
kept; plays ("mise en scène", "texte", "de et avec") are not.

robots.txt: Wix default, everything allowed for this bot. The terms (conditions
générales) are about ticket sales and say nothing about reusing listings.
"""
from __future__ import annotations

import json
import re

from common import FetchError, clean, get, log, looks_cancelled, make_event, to_zurich_datetime, today_zurich
from ._westsouth import caps_words, fold, group_role, infer_type, known_role, local_iso

KEY = 'theatre_martolet'
NAME = 'Théâtre du Martolet, Saint-Maurice'
SITE = 'https://www.martolet.com/'
ATTRIBUTION = 'Source: Théâtre du Martolet (martolet.com)'
KIND = 'venue'
MAX_REQUESTS = 5
TIME_LIMIT = 90

HOME = 'https://www.martolet.com/'
CITY = 'Saint-Maurice'

_CLASSICAL_RE = re.compile(r'orchestre|orchestra|ensemble vocal|choeur|chorale|soprano|mezzo|alto\b|tenor|baryton|'
                           r'basse\b|violon|violoncelle|piano|orgue|clavecin|harpe|direction\b|requiem|messie|oratorio|'
                           r'cantate|symphon|concerto|messe\b')
_THEATRE_RE = re.compile(r'mise en scene|\btexte\b|auteur|comedie|de et avec|une piece|choregraphie|humour|'
                         r'seul en scene|seule en scene|chansons?\b|conception')


def _objects(html, key='"pratique":"'):
    """Every JSON object of the page that contains ``key`` (the Wix collection items)."""
    out, seen = [], set()
    for m in re.finditer(re.escape(key), html or ''):
        depth, i = 0, m.start()
        while i > 0:                                   # back to the "{" that opens the item
            c = html[i]
            if c == '}':
                depth += 1
            elif c == '{':
                if depth == 0:
                    break
                depth -= 1
            i -= 1
        depth, j, in_str, esc = 0, i, False, False
        while j < len(html):
            c = html[j]
            if in_str:
                if esc:
                    esc = False
                elif c == '\\':
                    esc = True
                elif c == '"':
                    in_str = False
            elif c == '"':
                in_str = True
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    break
            j += 1
        try:
            item = json.loads(html[i:j + 1])
        except ValueError:
            continue
        if isinstance(item, dict) and item.get('_id') not in seen:
            seen.add(item.get('_id'))
            out.append(item)
    return out


def credits_from(lineup):
    """'Ensemble Vocal de Saint-Maurice\\nAnaïs SOUCAILLE, violon solo, Daniela NUMICO, clavecin et
    orgue\\nCharles BARBIER, ténor et direction' -> [(role, name)]."""
    out = []
    for line in (lineup or '').split('\n'):
        line = clean(line)
        if not line:
            continue
        m = re.match(r'(?i)^solistes?\s*:\s*(.+)$', line)
        if m:
            out += [('Performer', caps_words(n.strip())) for n in re.split(r',|\bet\b', m.group(1)) if n.strip()]
            continue
        parts = [p.strip() for p in line.split(',') if p.strip()]
        if len(parts) >= 2:
            i = 0
            while i < len(parts):
                name = parts[i]
                role = known_role(parts[i + 1], name) if i + 1 < len(parts) else None
                if role is not None:
                    if role:
                        out.append((role, caps_words(name)))
                    i += 2
                else:
                    if group_role(name):
                        out.append((group_role(name), caps_words(name)))
                    i += 1
            continue
        if group_role(line):
            out.append((group_role(line), caps_words(line)))
    return out


def program_from(text):
    out = []
    for line in (text or '').split('\n'):
        m = re.match(r'^([A-ZÀ-Ý][^:]{1,40}?)\s*:\s*(.+)$', clean(line))
        if m and not re.search(r'(?i)mise en|texte|auteur|avec', m.group(1)):
            out.append((m.group(1).strip(), re.split(r'\s+[—–-]\s+avec\s', m.group(2))[0].strip()))
    return out


def fetch():
    today = today_zurich()
    items = _objects(get(HOME))                    # FetchError propagates: build reuses yesterday's events
    if not items:
        raise FetchError(HOME, 'no season items found on the home page')
    events = []
    for it in items:
        title = clean(it.get('title'))
        lineup = it.get('sousTitre') or ''
        extra = it.get('distribution') or ''
        facts = fold(f'{title} {lineup} {extra}')
        if not title or not _CLASSICAL_RE.search(facts) or _THEATRE_RE.search(facts):
            continue
        try:
            y, mo, d = (int(x) for x in str(it.get('pratique'))[:10].split('-'))
            hh, mi = (int(x) for x in str(it.get('heure'))[:5].split(':'))
            start = local_iso(y, mo, d, hh, mi)
        except (ValueError, TypeError) as err:
            log.warning('%s: no date/time for %r: %s', KEY, title, err)
            continue
        if to_zurich_datetime(start).date() < today:
            continue
        credits = credits_from(lineup)
        program = program_from(extra)
        dur = re.search(r'(\d+)\s*h\s*(\d{2})?', it.get('dure') or '')
        path = it.get('link-25-26-title') or ''
        try:
            events.append(make_event(
                KEY, it.get('_id') or f'{start}-{title}', re.sub(r'\s*\|\s*COMPLET\s*$', '', title, flags=re.I), start,
                durationMin=int(dur.group(1)) * 60 + int(dur.group(2) or 0) if dur else None,
                city=CITY, venueName=clean(it.get('lieu')) or 'Théâtre du Martolet',
                type=infer_type(title, credits, program=program), credits=credits, program=program,
                url=HOME.rstrip('/') + path if path.startswith('/') else HOME, ticketUrl=it.get('billetterie'),
                status='cancelled' if looks_cancelled(title) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %r: %s', KEY, title, err)
    return events
