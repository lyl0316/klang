"""Theater Chur: classical concerts on the theatre's stage (Klassik Forum Chur recitals, visiting
orchestras, Kammerphilharmonie Graubünden galas).

    https://www.theaterchur.ch/programm              the season calendar (date, title, genre, page)
    https://www.theaterchur.ch/programm/<slug>       one page per production

The calendar lists every date with its genre ("Musik", "Schauspiel", "Tanz" ...). For each "Musik"
production the page gives each performance's date and local start ("Mi, 02.12.2026 / 19.30 Uhr")
with its ticket link, the programme ("<strong>Composer</strong> (dates) work") and the people
("Violine: Daria Zappa Matesic", "Zürcher Kammerorchester"). Only productions that look classical
(a programme with composers' life dates, or classical roles) are kept, which leaves out pop,
cabaret and songwriter evenings. The description is prose and is not used.
"""
from __future__ import annotations

import html as htmllib
import re

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, today_zurich
from ._east import (NOT_A_CONCERT, find_date, find_time, fold, group_role, infer_type, is_group, local_iso, role_for)

KEY = 'theater_chur'
NAME = 'Theater Chur'
SITE = 'https://www.theaterchur.ch/'
ATTRIBUTION = 'Source: Theater Chur (theaterchur.ch)'
KIND = 'venue'
MAX_REQUESTS = 25
TIME_LIMIT = 150

LISTING = 'https://www.theaterchur.ch/programm'
CLASSICAL_ROLES = {'Conductor', 'Violin', 'Viola', 'Cello', 'Double bass', 'Piano', 'Harpsichord', 'Organ', 'Flute',
                   'Oboe', 'Clarinet', 'Bassoon', 'Horn', 'Trumpet', 'Harp', 'Soprano', 'Mezzo-soprano', 'Alto',
                   'Tenor', 'Baritone', 'Bass', 'Orchestra'}
NOT_CLASSICAL = re.compile(r'elvis|tribute|comedy|kabarett|cabaret|pop\b|rock\b|band\b|songwriter|pollina|mundart|musical')


def _productions(page):
    out = {}
    for tipo, href, title, genre in re.findall(
            r'<li class="[^"]*" data-tc="[^"]+" data-tipo="([^"]+)">\s*<time datetime="[^"]+">.*?<a href="([^"]+)"[^>]*>\s*'
            r'<h5>(.*?)</h5>\s*<span>(.*?)</span>', page, re.S):
        genre = clean(re.sub(r'<small.*?</small>', ' ', genre, flags=re.S))
        if fold(genre) not in ('musik', 'konzert', 'klassik', 'oper'):
            continue
        out.setdefault(htmllib.unescape(href), clean(re.sub(r'(?s)<svg.*?</svg>', '', title)))
    return out


def _details(url):
    page = get(url)
    perfs = []
    lst = re.search(r'<ol class="auflistung-vorstellungen".*?</ol>', page, re.S)
    for uid, body in re.findall(r'<li\s+data-vcal="([^"]+)"[^>]*>(.*?)</li>', lst.group(0) if lst else '', re.S):
        ticket = re.search(r'href="(https?://tickets\.[^"]+)"', body)
        text = clean(re.sub(r'(?s)<svg.*?</svg>', ' ', body))
        day = re.search(r'\d{1,2}\.\d{1,2}\.\d{4}', text)
        perfs.append({'uid': uid, 'date': find_date(text), 'time': find_time(text[day.end():]) if day else None,
                      'ticket': htmllib.unescape(ticket.group(1)) if ticket else None,
                      'cancelled': looks_cancelled(text)})
    program, composers = [], set()
    for composer, rest in re.findall(r'<p><strong>([^<]+)</strong>\s*(.*?)</p>', page, re.S):
        rest, composer = clean(rest), clean(composer)
        m = re.match(r'\(\s*[*†]?\s*\d{4}(?:\s*[–-]\s*\d{4})?\s*\)\s*(.+)$', rest)
        if not m and composer in composers and rest:        # the same composer again, without life dates
            m = re.match(r'(.+)$', rest)
        if m:
            work = re.sub(r'\s*\d+′\s*$', '', m.group(1)).strip()
            work = re.sub(r'\s+(?:\(ohne Bezeichnung\)\s*)?[A-ZÄÖÜ][^|()]*(?:\s\|\s[^|()]+)+$', '', work)  # movements
            program.append((composer, work))
            composers.add(composer)
    if not program:                                         # '<p>Composer (*1995)<br>Work (2026)</p>'
        for para in re.findall(r'<p>(.*?)</p>', page, re.S):
            parts = [clean(x) for x in re.split(r'<br\s*/?>', para)]
            m = re.match(r'^([^()<>]{3,80}?(?:\([^()]*\))?)\s*\(\s*[*†]?\s*\d{4}(?:\s*[–-]\s*\d{4})?\s*\)$', parts[0])
            if m and len(parts) > 1 and parts[1]:
                program.append((m.group(1).strip(), re.sub(r'\s*\d+′\s*$', '', parts[1]).strip()))
    credits = []
    bet = re.search(r'<div class="beteiligte">(.*?)</div>', page, re.S)
    for para in re.findall(r'<p>(.*?)</p>', bet.group(1) if bet else '', re.S):
        text = clean(para)
        if ':' in text:
            label, names = text.split(':', 1)
            for name in re.split(r',|\bund\b|/', names):
                name = name.strip()
                role = role_for(label, name) if name else None
                if role:
                    credits.append((role, name))
        elif text:
            text = re.sub(r'\s*\([^)]*\)', '', text).strip()      # "(Einstudierung …)"
            credits.append((group_role(text) if is_group(text) else 'Performer', text))
    links = re.search(r'<div class="\s*websites">(.*?)</div>', page, re.S)
    named = {fold(n) for _, n in credits}
    for name in re.findall(r'<a\b[^>]*>(.*?)</a>', links.group(1) if links else '', re.S):
        name = clean(name)
        if name and is_group(name) and fold(name) not in named:  # "Weitere Infos: Ensemble ö!"
            credits.append((group_role(name), name))
    return {'perfs': perfs, 'program': program, 'credits': credits}


def fetch():
    today = today_zurich()
    productions = _productions(get(LISTING))               # FetchError propagates
    events = []
    for url, title in productions.items():
        if NOT_A_CONCERT.search(fold(title)) or NOT_CLASSICAL.search(fold(title)):
            continue
        if requests_left() <= 0:
            break
        try:
            d = _details(url)
        except FetchError as err:
            log.warning('%s: no page for %s: %s', KEY, url, err)
            continue
        roles = {r for r, _ in d['credits']}
        if not d['program'] and not roles & CLASSICAL_ROLES:
            continue                                        # not a classical concert
        kind = infer_type(title, d['credits'])
        if kind == 'orchestral' and 'Orchestra' not in roles and 'Ensemble' in roles:
            kind = 'chamber'                                # a conducted new-music ensemble
        for p in d['perfs']:
            if not (p['date'] and p['time']):
                continue
            start = local_iso(*p['date'], *p['time'])
            if to_zurich_datetime(start).date() < today:
                continue
            try:
                events.append(make_event(
                    KEY, p['uid'], title, start, city='Chur', venueName='Theater Chur',
                    type=kind, credits=d['credits'], program=d['program'],
                    ticketUrl=p['ticket'], url=url, status='cancelled' if p['cancelled'] else 'scheduled'))
            except ValueError as err:
                log.warning('%s: skipped %s: %s', KEY, p['uid'], err)
    return events
