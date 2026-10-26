"""J. S. Bach-Stiftung St. Gallen: the monthly Bach cantata concerts in Trogen (AR) and the
foundation's other concerts (St. Gallen, Teufen, Mels, KKL Luzern ...).

    https://bachstiftung.ch/konzerte-tickets/        one listing with every upcoming date

The listing gives the date ("13. November 2026"), the place ("Trogen (AR) // Evang. Kirche"),
the start ("Beginn: 19.00 Uhr"), the title, the event page and the ticket link. Each concert
page adds the performers ("Dorothee Mields, Sopran", "Rudolf Lutz, Leitung"). The site's
"all concerts" .ics export is empty, and the WordPress REST type 'konzert' has no dates, so the
HTML is read. Concerts abroad (Vaduz, Berlin, Vienna, Eisenach ...), the tour summaries, school
concerts (Kulturknirpse), the artist talks ("Zu Gast bei Rudolf Lutz"), the late-night and
poetry soirées are skipped. The works introduction (Werkeinführung, 17.30) is not a separate event.

Terms: the site's terms reserve all rights in texts, images and music and forbid any use beyond
private use; only facts (date, time, place, title, performers, works, link) are republished.
"""
from __future__ import annotations

import html as htmllib
import re

from common import FetchError, clean, get, log, looks_cancelled, make_event, requests_left, to_zurich_datetime, today_zurich
from ._east import NOT_A_CONCERT, find_date, find_time, fold, infer_type, local_iso, looks_foreign, name_role_line

KEY = 'bach_stiftung'
NAME = 'J. S. Bach-Stiftung St. Gallen'
SITE = 'https://bachstiftung.ch/'
ATTRIBUTION = 'Source: J. S. Bach-Stiftung St. Gallen (bachstiftung.ch)'
KIND = 'ensemble'
MAX_REQUESTS = 40
TIME_LIMIT = 240

LISTING = 'https://bachstiftung.ch/konzerte-tickets/'
BACH = 'Johann Sebastian Bach'
SKIP = re.compile(r'zu gast bei|artist talk|tournee:|harald schmidt')
PLACES = {        # how the site names a place -> (venue, town)
    'st. mangen': ('Kirche St. Mangen', 'St. Gallen'),
    'kultur- und kongresszentrum': ('KKL Luzern', 'Luzern'),
}


def _items(page):
    out = []
    for blk in re.split(r'<li class="[^"]*fr-event-card', page)[1:]:
        blk = blk.split('</li>', 1)[0]
        date = re.search(r'article-card-juliet__category">([^<]*)<', blk)
        place = re.search(r'>Ort:\s*([^<]*)<', blk)
        begin = re.search(r'>Beginn:\s*([^<]*)<', blk)
        title = re.search(r'<h3[^>]*>(.*?)</h3>', blk, re.S)
        text = re.search(r'</h3>\s*<p[^>]*>(.*?)</p>', blk, re.S)
        more = re.search(r'href="(https://bachstiftung\.ch/konzerte-tickets/[^"]+)"', blk)
        ticket = re.search(r'href="([^"]+)"[^>]*>\s*Tickets kaufen', blk)
        if not (date and title and more):
            continue
        out.append({
            'date': clean(date.group(1)), 'place': clean(place.group(1)) if place else '',
            'begin': clean(begin.group(1)) if begin else '', 'title': clean(title.group(1)),
            'text': clean(text.group(1)) if text else '', 'url': htmllib.unescape(more.group(1)),
            'ticket': htmllib.unescape(ticket.group(1)) if ticket else None,
        })
    return out


def _place(text):
    """'Trogen (AR) // Evang. Kirche' -> ('Evang. Kirche Trogen', 'Trogen');
    'Verrucano Mels // CH' -> ('Verrucano', 'Mels')."""
    left, _, right = (s.strip() for s in text.partition('//'))
    left_plain = re.sub(r'\s*\([A-Z]{2}\)\s*', ' ', left).strip()
    for key, value in PLACES.items():
        if key in fold(text):
            return value
    if re.fullmatch(r'[A-Z]{2}', right or ''):              # 'Verrucano Mels // CH'
        words = left_plain.split()
        return (' '.join(words[:-1]) or left_plain), words[-1]
    venue = right.split(',')[0].strip() if right else ''
    if venue and fold(left_plain) not in fold(venue) and re.match(r'(evang|ref|kath)\.? ?kirche|kirche$', fold(venue)):
        venue = f'{venue} {left_plain}'
    return (venue or None), left_plain or None


def _program(title, text):
    if re.search(r'\bBWV\b', title):
        parts = re.split(r'\s+und\s+(?=(?:Motette\s+)?BWV)', title)
        return [(BACH, re.sub(r'\s+', ' ', p).strip()) for p in parts if p.strip()]
    m = re.match(r'J\.\s*S\.\s*Bach:\s*(.+)$', text)
    if m:
        return [(BACH, m.group(1).strip())]
    return []


def _credits(page):
    i = page.find('Künstlerinnen &amp; Künstler')
    if i < 0:
        i = page.find('Künstlerinnen & Künstler')
    if i < 0:
        return []
    block = page[i:].split('</div>', 1)[0]
    credits = []
    for raw in re.split(r'<br\s*/?>|</p>', block)[0:]:
        line = clean(raw)
        if not line or 'Künstler' in line:
            continue
        m = re.match(r'Chor\s*(?:&|und)\s*Orchester\s+(der .+)$', line)
        if m:
            credits += [('Choir', f'Chor {m.group(1)}'), ('Orchestra', f'Orchester {m.group(1)}')]
            continue
        pair = name_role_line(line)
        if pair:
            if pair[0] != 'Conductor' and re.search(r'\bleitung\b', fold(line)):
                credits.append(('Conductor', pair[1]))      # "Rudolf Lutz, Leitung & Cembalo" conducts the Mass
            credits.append(pair)
    return credits


def fetch():
    today = today_zurich()
    events = []
    for it in _items(get(LISTING)):                         # FetchError propagates
        if not it['begin'] or SKIP.search(fold(it['title'])) or NOT_A_CONCERT.search(fold(it['title'] + ' ' + it['text'])):
            continue
        if looks_foreign(it['place']) or looks_foreign(it['title']):
            continue
        ymd, hm = find_date(it['date']), find_time(it['begin'])
        if not ymd or not hm:
            continue
        start = local_iso(*ymd, *hm)
        if to_zurich_datetime(start).date() < today:
            continue
        venue, city = _place(it['place'])
        credits = []
        if requests_left() > 0:
            try:
                credits = _credits(get(it['url']))
            except FetchError as err:
                log.warning('%s: no performers for %s: %s', KEY, it['url'], err)
        program = _program(it['title'], it['text'])
        kind = 'vocal-opera' if re.search(r'\bBWV\s*(?!10[4-6]\d)\d', it['title']) or re.search(
            r'messe|passion|kantate|motette|magnificat|oratorium', fold(it['title'] + ' ' + it['text'])) else None
        slug = it['url'].rstrip('/').rsplit('/', 1)[-1]
        try:
            events.append(make_event(
                KEY, slug, it['title'], start, city=city, venueName=venue,
                type=kind or infer_type(it['title'], credits), series='Bachkantate' if 'trogen' in fold(it['place']) and program else None,
                credits=credits, program=program, ticketUrl=it['ticket'], url=it['url'],
                status='cancelled' if looks_cancelled(it['title'] + ' ' + it['text']) else 'scheduled'))
        except ValueError as err:
            log.warning('%s: skipped %s: %s', KEY, slug, err)
    return events
