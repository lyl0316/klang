"""Oper Graz: opera, operetta, ballet with live music and the house's concerts (one calendar page).

    https://oper-graz.buehnen-graz.com/spielplan/kalender/          every performance of the season
    https://oper-graz.buehnen-graz.com/produktion/<slug>/           one page per production (concerts)

The calendar page carries the whole season (the month and category filters only hide entries
in the browser). Each <article> is one performance: its category (``event-cat-oper`` …), a
label ("Oper Premiere", "Konzert"), the production link, title, composer line, date
("So. 01.11.2026"), time ("15:00 bis ca. 17:00"), room, the ticket link with the
performance id (``vorstellungsId=…``, used as the id; an entry without a ticket link, e.g.
a concert sold by the Musikverein, gets "<production post id>-<date><time>") and the evening's cast
("Musikalische Leitung: …", "Mimì: …"), which is taken as listed: conductor, singers by
character, chorus. Directors, designers and dancers are left out.

Concert programmes ("Ludwig van Beethoven<br>Sinfonie Nr. 9 …") and the orchestra and choirs
are only on the production page, which is read for concerts only, incrementally
(_austria_east.read_details): a concert the previous feed already has with its performers
or works keeps them; new ones are read first, then the ones due for a re-read.

Ballet is kept only when the evening's cast names a "Musikalische Leitung" (live orchestra;
Romeo und Julia), the others are danced to recorded music or not cast yet. The halls of the
Congress Graz get the names the musikverein_graz reader uses ("Congress Graz,
Stefaniensaal"), so build.py merges the Grazer Philharmoniker's concerts there.

Skipped: musicals (house productions and guest shows), family musicals, OperAktiv! (children,
schools, workshops, community dance), Drumherum (guided tours, "Bühnenzauber", introductions
"Kostprobe", "Vor der Premiere", "Nachklang"), galas, pop/comedy guest shows, closed
performances ("Geschlossene Vorstellung") and the free 15-minute "Espressokonzerte" in the
café (their weekly programme is only in running text).

Checked against the website on 29 Oct 2026: 294 entries, 105 kept (8 opera/operetta
productions, Romeo und Julia, 22 concerts); dates, times, rooms and casts match the
calendar, programmes and orchestras the production pages.
"""
from __future__ import annotations

import html as _html
import re

from common import clean, get, log, looks_cancelled, make_event

from ._austria_east import (credit, is_prose, local_iso, performer_lines, performers_paragraph, prev_credits,
                            prev_program, program_from_lines, read_details)
from ._consent import group_role, looks_like_person

KEY = 'oper_graz'
NAME = 'Oper Graz'
SITE = 'https://oper-graz.buehnen-graz.com/'
ATTRIBUTION = 'Source: Oper Graz (oper-graz.buehnen-graz.com)'
KIND = 'venue'
COUNTRY = 'austria'
MAX_REQUESTS = 60              # 1 calendar page + concert production pages
TIME_LIMIT = 600

BASE = 'https://oper-graz.buehnen-graz.com'
CALENDAR = BASE + '/spielplan/kalender/'
CITY = 'Graz'

_ROOMS = (
    (r'stefaniensaal', 'Congress Graz, Stefaniensaal'),
    (r'kammermusiksaal', 'Congress Graz, Kammermusiksaal'),
    (r'hauptb[üu]hne', 'Oper Graz, Hauptbühne'),
    (r'studiob[üu]hne', 'Oper Graz, Studiobühne'),
    (r'caf[ée] stolz', 'Oper Graz, Café Stolz'),
    (r'malersaal', 'Oper Graz, Malersaal'),
    (r'ballettsaal', 'Oper Graz, Ballettsaal'),
    (r'galeriefoyer', 'Oper Graz, Galeriefoyer'),
)
_KINDS = {'event-cat-oper': 'opera', 'event-cat-operette': 'opera', 'event-cat-konzert': 'concert',
          'event-cat-kammerkonzert': 'concert', 'event-cat-ballett': 'ballet'}
_SKIP_TITLE = re.compile(r'(?i)familien|kinder|sitzkissen|schul|baby|concerteen|mitspielen|lehrling|f[üu]hrung|'
                         r'espressokonzert|'
                         r'b[üu]hnenzauber|kostprobe|nachklang|vor der premiere|ballett inside|gala|redoute|'
                         r'musiktheaterclub|f[üu]r alle')
_SKIP_LABEL = re.compile(r'(?i)geschlossene vorstellung|familienmusical|musical|operaktiv|drumherum')


def room(text):
    t = clean(text)
    for rx, name in _ROOMS:
        if re.search(rx, t, re.I):
            return name
    return t or 'Oper Graz'


# ---------------------------------------------------------------------------
# calendar
# ---------------------------------------------------------------------------

_ART_RE = re.compile(r'<article\b[^>]*class="event filter-item ([^"]*)"[^>]*>(.*?)</article>', re.S)


def parse_calendar(page_html):
    rows = []
    for cls, body in _ART_RE.findall(page_html or ''):
        cat = next((c for c in cls.split() if c.startswith('event-cat-')), '')
        label = re.search(r'<span class="pre__title">(.*?)</span>\s*<a', body, re.S)
        href = re.search(r'<a href="(/produktion/[^"]+)"', body)
        title = re.search(r'<h3>(.*?)</h3>', body, re.S)
        sub = re.search(r'<p class="sub__title">(.*?)</p>', body, re.S)
        data = re.search(r'<p class="data"><b>(.*?)</b>', body, re.S)
        ticket = re.search(r'href="(https://ticketzentrum\.buehnen-graz\.com/shop\?vorstellungsId=(\d+))"', body)
        post = re.search(r'\bevent-(\d+)\b', cls)
        if not (title and data):
            continue
        lines = [clean(x) for x in re.split(r'<br\s*/?>', data.group(1)) if clean(x)]
        date = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{4})', lines[0] if lines else '')
        time = re.search(r'(\d{1,2}):(\d{2})', lines[1] if len(lines) > 1 else '')
        cast = []
        for li in re.findall(r'<li>(.*?)</li>', ''.join(re.findall(r'<ul class="contibutors-list">(.*?)</ul>',
                                                                      body, re.S)), re.S):
            m = re.match(r'\s*<span>(.*?)</span>(.*)$', li, re.S)
            if m:
                cast.append((clean(m.group(1)).rstrip(':').strip(), clean(m.group(2))))
            else:
                cast.append(('', clean(li).strip(' ,')))
        rows.append({
            'cat': cat, 'label': clean(label.group(1)) if label else '', 'title': clean(title.group(1)),
            'sub': clean(sub.group(1)) if sub else '', 'page': BASE + _html.unescape(href.group(1)) if href else None,
            'date': date.groups() if date else None, 'time': time.groups() if time else None,
            'room': lines[2] if len(lines) > 2 else '', 'ticket': _html.unescape(ticket.group(1)) if ticket else None,
            'sid': ticket.group(2) if ticket else None, 'post': post.group(1) if post else None, 'cast': cast,
            'text': clean(re.sub(r'<div class="bottom block-accordion.*', '', body, flags=re.S)),
        })
    return rows


def cast_credits(kind, cast):
    """The evening's cast -> [(role, name)]: conductor, singers by character, chorus."""
    out = []
    for role_text, name in cast:
        r = clean(role_text)
        low = r.lower()
        if (low in ('chor', 'chorleitung', 'choreinstudierung') or low.startswith(('singschul', 'kinderchor'))) \
                and looks_like_person(name) and not group_role(name):
            out.append(('Chorus master', name))
            continue
        if kind == 'ballet' and low not in ('musikalische leitung', 'dirigent', 'dirigentin', 'orchester'):
            continue                                    # dancers and the creative team
        if low in ('ensemble', 'es tanzen', 'tänzer', 'tänzerin') or 'tänzer' in low or low.startswith('es tanz'):
            continue
        c = credit(name, r, character_ok=(kind == 'opera'))
        if c:
            out.append(c)
    return out


# ---------------------------------------------------------------------------
# production page (concerts)
# ---------------------------------------------------------------------------

def parse_production(page_html):
    """-> {'credits': [(role, name)], 'program': [(composer, work)]} from a concert's production page."""
    h = page_html or ''
    out = {'credits': [], 'program': []}
    content = re.search(r'<div id="primary"[^>]*>(.*?)<h2[^>]*>\s*Vorstellungen', h, re.S)
    lines = []
    for para in re.findall(r'<p>(.*?)</p>', content.group(1) if content else '', re.S):
        if is_prose(para):
            break                                       # the description begins
        para_lines = [clean(x) for x in re.split(r'<br\s*/?>', para)]
        if performers_paragraph(para_lines):            # 'Alexandra Dovgan, Klavier<br>Grazer Philharmoniker'
            for c in performer_lines(para_lines):
                if c not in out['credits']:
                    out['credits'].append(c)
            lines.append('')
            continue
        lines += para_lines + ['']
    out['program'] = program_from_lines(lines)
    cast = re.search(r'<div class="tab-content">(.*?)</div>', h, re.S)       # "Besetzung"
    block = cast.group(1) if cast else ''
    for li in re.findall(r'<li>(.*?)</li>', block, re.S):
        m = re.search(r'<span class="role">(.*?)</span>(.*)$', li, re.S)
        if m:
            c = credit(clean(m.group(2)), clean(m.group(1)).rstrip(':'))
        else:
            name = clean(li).strip(' ,')
            c = (group_role(name) or 'Performer', name) if name else None
        if c and c not in out['credits']:
            out['credits'].append(c)
    return out


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def _type(kind, title, credits):
    if kind == 'opera':
        return 'vocal-opera'
    if kind == 'ballet':
        return 'orchestral'
    roles = {r for r, _ in credits}
    if 'Orchestra' in roles:
        return 'orchestral'                             # '… Soirée im Kammermusiksaal' is the orchestra
    if re.match(r'(?i)kammerkonzert\b', title) and 'Choir' not in roles:
        return 'chamber'
    return None                                         # concerts: build.py infers it from the facts


def fetch():
    rows = parse_calendar(get(CALENDAR))
    kept, skipped = [], {}
    for r in rows:
        kind = _KINDS.get(r['cat'])
        why = None
        if not kind:
            why = r['cat'] or 'no category'
        elif _SKIP_LABEL.search(r['label']) or _SKIP_TITLE.search(r['title']):
            why = 'family/tour/talk'
        elif not (r['date'] and r['time']) or not (r['sid'] or r['post']):
            why = 'no id or time'
        elif kind == 'ballet' and not any(c[0] == 'Conductor' for c in cast_credits('ballet', r['cast'])):
            why = 'ballet without live music'
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        d, mo, y = r['date']
        if not r['sid']:                                # no ticket link (sold elsewhere): production + date
            r['sid'] = f"{r['post']}-{int(y):04d}{int(mo):02d}{int(d):02d}{int(r['time'][0]):02d}{r['time'][1]}"
        r['kind'] = kind
        r['start'] = local_iso(y, mo, d, *r['time'])
        kept.append(r)
    log.info('oper_graz: %d calendar entries, %d kept; skipped %s', len(rows), len(kept),
             ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())))
    concerts = [r for r in kept if r['kind'] == 'concert']
    details, previous = read_details(KEY, concerts, lambda url: parse_production(get(url)), every_days=7)
    events = []
    for r in kept:
        credits = cast_credits(r['kind'], r['cast'])
        program = []
        if r['kind'] == 'opera' and looks_like_person(r['sub'], max_words=4):
            program = [(r['sub'], r['title'])]
        if r['kind'] == 'concert':
            d, prev = details.get(r['page']), previous.get(r['sid'])
            more = d['credits'] if d else prev_credits(prev)
            for c in more:                              # the production page's cast, unless already listed
                if not any(c[1] == n or n in c[1] for _, n in credits):
                    credits.append(c)
            program = d['program'] if d else prev_program(prev)
        series = None
        if r['kind'] == 'concert':
            series = r['sub'] if r['sub'] and not looks_like_person(r['sub']) and len(r['sub']) < 60 else None
        try:
            events.append(make_event(
                KEY, r['sid'], r['title'], r['start'], city=CITY, venueName=room(r['room']),
                type=_type(r['kind'], r['title'], credits), series=series, credits=credits, program=program,
                ticketUrl=r['ticket'], url=r['page'] or CALENDAR,
                status='cancelled' if looks_cancelled(r['text']) else 'scheduled'))
        except ValueError as err:
            log.warning('oper_graz %s: skipped: %s', r['sid'], err)
    return events
