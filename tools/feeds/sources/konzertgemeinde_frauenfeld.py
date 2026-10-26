"""Konzertgemeinde Frauenfeld: the subscription concerts in the Casino Frauenfeld.

    https://www.konzertgemeinde.ch/konzerte/saisonprogramm_2026_2027    the season on one page

The season page lists each concert as "N. Abonnementskonzert", then "Mittwoch, 28. Oktober 2026,
Casino, 19.30 Uhr", the ensemble or programme name in bold, and the performers ("<b>Kenneth
Henderson</b>, Horn"). The page name carries the season, so the reader also tries next season's
page name and the "Konzerte" page links. One or two requests per run.

Skipped: the family concert and the introductions ("Einführung: 18.45 Uhr").
"""
from __future__ import annotations

import re

from common import FetchError, clean, get, log, looks_cancelled, make_event, to_zurich_datetime, today_zurich
from ._east import find_date, find_time, fold, group_role, infer_type, is_group, local_iso, role_for

KEY = 'konzertgemeinde_frauenfeld'
NAME = 'Konzertgemeinde Frauenfeld'
SITE = 'https://www.konzertgemeinde.ch/'
ATTRIBUTION = 'Source: Konzertgemeinde Frauenfeld (konzertgemeinde.ch)'
KIND = 'venue'
MAX_REQUESTS = 4
TIME_LIMIT = 60

BASE = 'https://www.konzertgemeinde.ch'
SEASON = BASE + '/konzerte/saisonprogramm_{}_{}'
HEAD = re.compile(r'^(\d+)\.\s*(abonnementskonzert|extrakonzert|sonderkonzert)$|^(familienkonzert)$', re.I)
VENUES = {'casino': 'Casino Frauenfeld'}


def _lines(page):
    m = re.search(r'<main\b.*?</main>', page, re.S)
    s = m.group(0) if m else page
    s = re.sub(r'<strong>(.*?)</strong>', lambda x: '\x01' + x.group(1) + '\x02', s, flags=re.S)
    s = re.sub(r'(?i)<br\s*/?>|</?(p|div|li|h[1-6])\b[^>]*>', '\n', s)
    out = []
    for raw in s.split('\n'):
        line = clean(raw)
        if line.replace('\x01', '').replace('\x02', '').strip():
            out.append(line)
    return out


def _plain(line):
    return line.replace('\x01', '').replace('\x02', '').strip(' ,')


def _concerts(page):
    blocks, cur = [], None
    for line in _lines(page):
        m = HEAD.match(_plain(line))
        if m:
            cur = {'n': m.group(1), 'kind': fold(m.group(2) or m.group(3)), 'lines': []}
            blocks.append(cur)
        elif cur is not None:
            cur['lines'].append(line)
    return blocks


def fetch():
    today = today_zurich()
    y = today.year if today.month >= 7 else today.year - 1
    pages = []
    for a, b in ((y, y + 1), (y + 1, y + 2)):
        try:
            pages.append(get(SEASON.format(a, b)))
        except FetchError as err:
            if a == y:
                raise
            log.info('%s: no page for season %s/%s yet (%s)', KEY, a, b, err)
    events = []
    for page in pages:
        for blk in _concerts(page):
            if blk['kind'] == 'familienkonzert':
                continue
            date_line = next((l for l in blk['lines'] if find_date(_plain(l))), None)
            if not date_line:
                continue
            text = _plain(date_line)
            ymd = find_date(text)
            day = re.search(r'\d{4}', text)
            hm = find_time(text[day.end():]) if day else None
            if not hm:
                continue
            start = local_iso(*ymd, *hm)
            if to_zurich_datetime(start).date() < today:
                continue
            parts = [p.strip() for p in text.split(',')]
            hall = parts[2] if len(parts) >= 4 else 'Casino'
            title, credits = None, []
            for line in blk['lines'][blk['lines'].index(date_line) + 1:]:
                plain = _plain(line)
                if re.match(r'(einfuhrung|ein konzert|programm)', fold(plain)):
                    continue
                m = re.match(r'^\x01([^\x01\x02]+?)\s*,?\s*\x02\s*,?\s*(.+)$', line)
                if m and len(m.group(2)) < 40:
                    name, label = clean(m.group(1)).strip(' ,'), clean(m.group(2))
                elif ',' in plain and len(plain.split(',', 1)[1]) < 40 and not plain.startswith('«'):
                    name, label = (s.strip() for s in plain.split(',', 1))
                else:
                    name, label = None, None
                if name and label:
                    tail = re.match(r'^([A-ZÄÖÜ][\w\-]+(?:\s+[A-ZÄÖÜ][\w\-]+)*)\s+(\S+)$', label)
                    if tail and role_for(tail.group(1)) == 'Performer' and role_for(tail.group(2)) not in (None, 'Performer'):
                        name, label = f'{name} {tail.group(1)}', tail.group(2)   # '<b>Juan Carlos Escobar</b> Ossa Viola'
                    role = role_for(label, name)
                    if role:
                        credits.append((role, name))
                    continue
                if title is None:
                    title = plain
                    if is_group(plain) and not re.search(r'freunde|&', fold(plain)):
                        credits.insert(0, (group_role(plain), plain))
            if not title:
                names = [n for r, n in credits if r not in ('Orchestra', 'Choir', 'Ensemble')][:2]
                title = ' & '.join(names) or f"{blk['n']}. Abonnementskonzert"
            try:
                events.append(make_event(
                    KEY, f"{start[:10]}-{blk['n'] or 'x'}", title, start, city='Frauenfeld',
                    venueName=VENUES.get(fold(hall), hall), type=infer_type(title, credits),
                    series=f"{blk['n']}. Abonnementskonzert" if blk['n'] else None, credits=credits,
                    url=SEASON.format(*((y, y + 1) if page is pages[0] else (y + 1, y + 2))),
                    status='cancelled' if looks_cancelled(' '.join(_plain(l) for l in blk['lines'])) else 'scheduled'))
            except ValueError as err:
                log.warning('%s: skipped %s: %s', KEY, title, err)
    return events
