"""Zuger Sinfonietta: the orchestra's concerts in Zug, Cham, Unterägeri and elsewhere in canton Zug.

    https://zugersinfonietta.ch/konzerte/     the whole season in one page

Every date is a card with the series ("2. Abo-Konzert", "Mittagskonzert", "Klassik Plus"), the
title and event page, the date ("28.11.2026"), the local start ("19.30 Uhr"), the place
("Lorzensaal Cham", "Zug, Reformierte Kirche"), a one-line line-up ("Zuger Sinfonietta, Felix
Mildenberger (Leitung), Martin James Bartlett (Klavier)") and the ticket link. The card's
blurb is prose and is not used.

Each concert page then gives the full line-up ("Aufführende": "Felix Mildenberger <em>Leitung</em>")
and the works ("Programm": "<strong>Louise Farrenc (1804–1875)</strong>" + one work per line).
One request for the season plus one per concert page (a programme shared by several dates
is read once).

Skipped: the "Musikvermittlung" formats (school choirs, Musig-Döösli, family concerts) and
official functions (Dreikönigsanlass des Stadtrates).
"""
from __future__ import annotations

import html as htmllib
import re

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, today_zurich
from ._east import (NOT_A_CONCERT, PLACEHOLDER, find_date, find_time, fold, group_role, infer_type, is_group, local_iso,
                    parse_lineup, role_for)

KEY = 'zuger_sinfonietta'
NAME = 'Zuger Sinfonietta'
SITE = 'https://zugersinfonietta.ch/'
ATTRIBUTION = 'Source: Zuger Sinfonietta (zugersinfonietta.ch)'
KIND = 'orchestra'
MAX_REQUESTS = 30
TIME_LIMIT = 150

LISTING = 'https://zugersinfonietta.ch/konzerte/'
SKIP = re.compile(r'musikvermittlung|musig-doosli|dreikonigsanlass|stadtrat|karneval der tiere|weihnachtszauber|'
                  r'familien|kinder')


PLAYER_NOUN = re.compile(
    r'\b(Cellist|Pianist|Geiger|Violinist|Bratschist|Harfenist|Flötist|Klarinettist|Oboist|Organist|Gitarrist|'
    r'Trompeter|Hornist|Fagottist|Perkussionist|Schlagzeuger|Sopranistin|Mezzosopranistin|Altistin|Tenor|Bariton)'
    r'(?:in)?\s+([A-ZÄÖÜ][\w\-]+(?:\s+[A-ZÄÖÜ][\w\-]+){1,2})')
NOUN_ROLE = {'cellist': 'Cello', 'pianist': 'Piano', 'geiger': 'Violin', 'violinist': 'Violin', 'bratschist': 'Viola',
             'harfenist': 'Harp', 'flotist': 'Flute', 'klarinettist': 'Clarinet', 'oboist': 'Oboe', 'organist': 'Organ',
             'gitarrist': 'Guitar', 'trompeter': 'Trumpet', 'hornist': 'Horn', 'fagottist': 'Bassoon',
             'perkussionist': 'Percussion', 'schlagzeuger': 'Percussion', 'sopranistin': 'Soprano',
             'mezzosopranistin': 'Mezzo-soprano', 'altistin': 'Alto', 'tenor': 'Tenor', 'bariton': 'Baritone'}


def _prose_credits(lineup, credits):
    """'die schwedische Cellistin Annika Dobler' -> ('Cello', 'Annika Dobler'); 'Drei Musiker*innen der Zuger
    Sinfonietta' -> ('Ensemble', 'Musiker*innen der Zuger Sinfonietta')."""
    named = {fold(n) for _, n in credits}
    extra = []
    for noun, name in PLAYER_NOUN.findall(lineup):
        if fold(name) not in named:
            extra.append((NOUN_ROLE[fold(noun)], name))
    m = re.search(r'((?:[\w.]+\*innen|Musiker\w*) der Zuger Sinfonietta)', lineup)
    if m and fold(m.group(1)) not in named:
        extra.append(('Ensemble', m.group(1)))
    return credits + extra


VOCAL_WORK = re.compile(r'\b(oratorium|oratorio|messe|missa|passion|requiem|kantate|magnificat|stabat mater|te deum)\b')

TOWNS = ('Unterägeri', 'Oberägeri', 'Steinhausen', 'Hünenberg', 'Rotkreuz', 'Menzingen', 'Walchwil', 'Neuheim',
         'Risch', 'Baar', 'Cham', 'Zug', 'Luzern', 'Zürich', 'Einsiedeln', 'Schwyz')


def _place(text):
    """'Zug, Reformierte Kirche' -> ('Reformierte Kirche Zug', 'Zug'); 'Lorzensaal Cham' -> ('Lorzensaal Cham', 'Cham')."""
    town = next((t for t in TOWNS if re.search(r'\b%s\b' % re.escape(t), text)), None)
    if ',' in text:
        first, rest = (s.strip() for s in text.split(',', 1))
        if town == first or not town:
            return (rest if fold(first) in fold(rest) else f'{rest} {first}'), first
        if town == rest:                                    # 'Kirche St. Jakob, Cham'
            return (first if fold(town) in fold(first) else f'{first} {town}'), town
    if town:
        venue = re.sub(r'^%s\s+' % re.escape(town), '', text).strip(' ,')
        return (venue if fold(town) in fold(venue) else f'{venue} {town}'), town
    return text or None, 'Zug'


def _column(page, heading):
    """HTML of the column whose headline is ``heading`` ('Aufführende', 'Programm')."""
    m = re.search(r'<h2 class="headline-mod"><span>%s</span></h2>(.*?)(?=<div class="col |</div>\s*</div>)' % heading,
                  page, re.S)
    return m.group(1) if m else ''


def _split_label(line):
    """'Simon Gaudenz Leitung' -> ('Simon Gaudenz', 'Leitung'); 'Ensemble Voxus Chor' -> ('Ensemble Voxus', 'Chor');
    'Zuger Sinfonietta' -> ('Zuger Sinfonietta', ''). For pages that set the role without <em>."""
    words = line.split()
    for k in (1, 2):
        if len(words) <= k:
            break
        label, name = ' '.join(words[-k:]), ' '.join(words[:-k])
        if re.search(r'einstudierung|chorleitung', fold(label)):
            return name, label
        role = role_for(label, name)
        if role and role != 'Performer' and role_for(label) != 'Performer' and name[:1].isupper():
            return name, label
    return line, ''


def _detail_credits(page):
    """'Felix Mildenberger <em>Leitung</em>' / 'Zuger Sinfonietta' / 'Philipp Schmidlin <em>Einstudierung Chor</em>'
    (the <em> is sometimes left open over the <br>, or missing: 'Simon Gaudenz Leitung')."""
    out = []
    for raw in re.split(r'<br\s*/?>|</p>', _column(page, 'Aufführende')):
        raw = re.sub(r'^\s*(?:<p>)?\s*</em>', '', raw)
        if '<em>' in raw:
            before, after = raw.split('<em>', 1)
            name, label = clean(before), clean(after)
        else:
            name, label = _split_label(clean(raw))
        name = name.strip(' ,;')
        if not name or PLACEHOLDER.match(name) or len(name) > 80:
            continue
        if re.search(r'einstudierung|chorleitung', fold(label)):
            out.append(('Chorus master', name))
            continue
        role = role_for(label, name) if label else (group_role(name) if is_group(name) else 'Performer')
        if role:
            out.append((role, name))
    return out


def _detail_program(page):
    """'<strong>Franz Schubert (1797–1828)</strong>' + 'Fantasie f-Moll D 940 (…)' + 'Sinfonie h-Moll D 759 …'.
    Sub-lines ('Teile I–IV:', '-Teil I: «…»') are parts of the work above and are skipped."""
    program, composer = [], None
    col = _column(page, 'Programm')
    for raw in re.split(r'<br\s*/?>|</p>', col):
        strong = re.search(r'<strong>(.*?)</strong>', raw, re.S)
        if strong:
            composer = clean(re.sub(r'\s*\([^)]*\d{4}[^)]*\)\s*$', '', clean(strong.group(1)))) or None
            raw = raw[strong.end():]
        line = clean(raw)
        if not line or not composer:
            continue
        if line.startswith(('-', '–', '•', '(')) or line.endswith(':') or re.match(r'(?i)(teile?|satz|sätze)\b', line):
            continue
        program.append((composer, line))
    return program


def fetch():
    today = today_zurich()
    pages = {}

    def detail(url):
        if url not in pages:
            pages[url] = None
            if requests_left() > 1:
                try:
                    pages[url] = get(url)
                except FetchError as err:           # the card's facts are still good
                    log.warning('%s: %s', KEY, err)
        return pages[url] or ''

    page = get(LISTING)                                     # FetchError propagates
    events = []
    for card in re.split(r'<div class="concert">', page)[1:]:
        def field(name):
            m = re.search(r'<p class="concert-%s">(.*?)</p>' % name, card, re.S)
            return clean(m.group(1)) if m else ''
        link = re.search(r'<h2 class="concert-title">.*?href="([^"]+)"[^>]*>(.*?)</a>', card, re.S)
        if not link:
            continue
        title, url = clean(link.group(2)), htmllib.unescape(link.group(1))
        series, lineup, place = field('type'), field('shorttext'), field('place')
        ymd, hm = find_date(field('date')), find_time(field('time'))
        if not (ymd and hm):
            continue
        if SKIP.search(fold(f'{series} {title}')) or NOT_A_CONCERT.search(fold(f'{series} {title}')):
            continue
        start = local_iso(*ymd, *hm)
        if to_zurich_datetime(start).date() < today:
            continue
        venue, city = _place(place)
        credits = _prose_credits(lineup, parse_lineup(lineup))
        ticket = re.search(r'class="badge-tickets[^"]*" href="([^"]+)"', card)
        credits = [('Ensemble' if re.search(r'\*innen|musiker', fold(n)) else r, n) for r, n in credits]
        chamber = re.search(r'mittagskonzert|lunch|kammer', fold(series))
        kind = infer_type(f'{title} {series}', credits, 'chamber' if chamber else None)   # from the card's line-up
        if chamber and kind == 'orchestral':
            kind = 'chamber'
        page_html = detail(url)
        credits = _detail_credits(page_html) or credits
        program = _detail_program(page_html)
        if VOCAL_WORK.search(fold(' '.join(t for _, t in program))):
            kind = 'vocal-opera'                            # an oratorio, a mass, a passion
        slug = url.rstrip('/').rsplit('/', 1)[-1]
        try:
            events.append(make_event(
                KEY, f'{slug}-{start[:10]}', title, start, city=city, venueName=venue,
                type=kind, series=series or None, credits=credits, program=program,
                ticketUrl=htmllib.unescape(ticket.group(1)) if ticket else None, url=url,
                status='cancelled' if looks_cancelled(f'{title} {series}') else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, slug, err)
    return events
