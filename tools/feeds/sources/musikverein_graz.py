"""Musikverein für Steiermark, Graz: the season's concerts (iCal export + WordPress REST + concert pages).

    https://musikverein-graz.at/wp-content/themes/s4-theme/ics/alle-konzerte.php     every coming concert
    https://musikverein-graz.at/wp-json/wp/v2/konzerte?include=…&_fields=id,link,title   links and titles
    https://musikverein-graz.at/konzerte/<dd-mm-yyyy-…>/                              one page per concert

The site's calendar page is filled by a POST to admin-ajax, which we never send. Its
"In Kalender exportieren" iCal file lists every coming concert instead: UID
``konzert-<post id>@musikverein-graz.at``, start and end in UTC, the hall (LOCATION) and
"Zyklus: …" (the series) in DESCRIPTION. One REST request (the post ids of the iCal file)
gives each concert's page and its title "[16.11.2026] • Orchesterkonzert • Emmanuel
Tjeknavorian, Grazer Philharmoniker, Alexandra Dovgan", whose last part is the title used
here (the iCal SUMMARY drops the line breaks between the names).

The performers (name + "musikalische Leitung", "Klavier" …) and the works ("<strong>Ludwig van
Beethoven: </strong>Klavierkonzert Nr. 5 …") are only on the concert page, so those pages are
read incrementally (_austria_east.read_details): a concert the previous feed already has with
its performers or works (same id, start and title) keeps them; new concerts are read first,
then the ones due for a re-read (the next week's every run, the others about once a week).

The concerts take place in the Congress Graz: "Stefaniensaal" and "Kammermusiksaal" become
"Congress Graz, Stefaniensaal" / "Congress Graz, Kammermusiksaal" (the names Oper Graz uses
for the same halls, so build.py can merge the Grazer Philharmoniker's concerts).

Skipped: the "Familien- und Schulkonzerte" series, "Musikverein entdecken!" (an open day),
the open rehearsals ("Probe:Hören", only mentioned in the page text, never listed) and the
jazz lounge after the "Klassik um 6" concerts (not credited).

Checked against the website on 29 Oct 2026: 48 entries in the iCal file, 39 concerts kept;
times (19.30 = 18:30Z in winter), halls, performers and works match the concert pages.
"""
from __future__ import annotations

import html as _html
import re

from common import (FetchError, clean, get, get_json, log, looks_cancelled, make_event, parse_ics, same_title,
                    to_zurich_iso)

from ._austria_east import credits_from_pairs, prev_credits, prev_program, read_details
from ._consent import looks_like_person

KEY = 'musikverein_graz'
NAME = 'Musikverein für Steiermark'
SITE = 'https://musikverein-graz.at/'
ATTRIBUTION = 'Source: Musikverein für Steiermark (musikverein-graz.at)'
KIND = 'venue'
COUNTRY = 'austria'
MAX_REQUESTS = 80              # 2 for the iCal file and the REST titles, the rest for concert pages
TIME_LIMIT = 600

BASE = 'https://musikverein-graz.at'
ICS = BASE + '/wp-content/themes/s4-theme/ics/alle-konzerte.php'
REST = BASE + '/wp-json/wp/v2/konzerte?include={ids}&_fields=id,link,title&per_page=100'
CITY = 'Graz'

_SKIP_SERIES = re.compile(r'(?i)familien|schul|kinder')
_SKIP_TITLE = re.compile(r'(?i)schulkonzert|für schulen|für familie|mitmach|musikverein entdecken|führung|'
                         r'kinderkonzert|familienkonzert|probe:?hören|offene probe')
_HALLS = {
    'stefaniensaal': 'Congress Graz, Stefaniensaal',
    'kammermusiksaal': 'Congress Graz, Kammermusiksaal',
}


def venue(location):
    loc = clean(location)
    low = loc.lower()
    for word, name in _HALLS.items():
        if word in low:
            return name
    if not loc or low in ('musikverein graz', 'musikverein'):
        return 'Musikverein Graz'
    return loc


def rest_title(rendered):
    """'[16.11.2026] • Orchesterkonzert • A, B, C' -> 'A, B, C'; '[17.11.2026] Musikverein entdecken!' -> …"""
    t = clean(_html.unescape(rendered or ''))
    t = re.sub(r'^\[[\d.]+\]\s*', '', t)
    parts = [p.strip() for p in re.split(r'\s*•\s*', t) if p.strip()]
    title = ', '.join(parts[1:]) if len(parts) >= 2 else (parts[0] if parts else t)   # parts[0]: the series
    return re.sub(r'\s*,\s*', ', ', re.sub(r'\s{2,}', ' ', title)).strip(' ,')


def join_heading(lines):
    """The <h1> lines -> one title: names separated by commas, a word broken at a hyphen re-joined
    ('ORF-Radio-' + 'Symphonieorchester Wien'), other line breaks as spaces."""
    out = ''
    for line in (x for x in lines if x):
        if not out:
            out = line
        elif out.endswith('-'):
            out += line
        elif out.endswith(',') or (looks_like_person(out.rsplit(',', 1)[-1]) and looks_like_person(line)):
            out = out.rstrip(',') + ', ' + line
        else:
            out += ' ' + line
    return out


# ---------------------------------------------------------------------------
# concert page
# ---------------------------------------------------------------------------

def parse_detail(page_html):
    """-> {'credits': [(role, name)], 'program': [(composer, work)], 'ticket': url, 'hall': text}"""
    h = page_html or ''
    out = {'credits': [], 'program': [], 'ticket': None, 'hall': None, 'heading': None}
    h1 = re.search(r'<h1>(.*?)</h1>', h, re.S)
    if h1:
        out['heading'] = join_heading([clean(x) for x in re.split(r'<br\s*/?>', h1.group(1))])
    box = re.search(r'<div class="kuenstler">(.*?)</div>', h, re.S)
    pairs = []
    for name, role in re.findall(r'<span class="kuenstler_name">(.*?)</span>\s*<span class="funktion">(.*?)</span>',
                                 box.group(1) if box else '', re.S):
        if re.search(r'(?i)lounge|aperitif', clean(role)):
            continue                                    # the jazz lounge after / the short concert before
        pairs.append((clean(name), clean(role)))
    out['credits'] = credits_from_pairs(pairs)
    hall = re.search(r'<span class="ort">[^<]*</span>\s*(.*?)</p>', h, re.S)
    out['hall'] = clean(hall.group(1)) if hall else None
    ticket = re.search(r'href="(https://musikverein-graz\.jetticket\.net/webshop/webticket/shop\?event=\d+[^"]*)"', h)
    out['ticket'] = _html.unescape(ticket.group(1)) if ticket else None
    prog = re.search(r'<div class="programm[^"]*"[^>]*>(.*?)<div class="row termine', h, re.S)
    body = re.sub(r'(?s)<ul class="iconsNeu.*?</ul>', '', prog.group(1)) if prog else ''
    for para in re.findall(r'<p[^>]*>(.*?)</p>', body, re.S):
        if '<strong' not in para and len(clean(para)) > 150:
            break                                       # the prose starts: the programme is above it
        for line in re.split(r'<br\s*/?>', para):
            m = re.match(r'\s*(?:</?(?:em|i|span|b)\b[^>]*>\s*)*<strong>(.*?)</strong>(.*)$', line.strip(), re.S)
            if not m:
                continue
            head, work = clean(m.group(1)), clean(m.group(2))
            if work.startswith(':'):                    # '<strong>Name</strong>: Work'
                head, work = head + ':', work[1:].strip()
            if not head.endswith(':') or not work:
                continue                                # a heading in bold, not 'Composer: work'
            composer = head.rstrip(' :')
            if re.search(r'(?i)probe|hören|mit freundlicher|unterstützung|pause', composer):
                continue
            out['program'].append((composer, work))
    return out


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def fetch():
    entries = parse_ics(get(ICS, accept='text/calendar, text/plain;q=0.9, */*;q=0.5'))
    rows = []
    for e in entries:
        m = re.match(r'konzert-(\d+)@', e['uid'] or '')
        if not m:
            continue
        series = ''
        sm = re.search(r'Zyklus:\s*(.+)', e['description'] or '')
        if sm:
            series = clean(sm.group(1))
        rows.append({'sid': m.group(1), 'summary': clean(e['summary']), 'start': to_zurich_iso(e['start']),
                     'end': e['end'], 'location': e['location'], 'series': series,
                     'note': clean(e['description']), 'status': e['status']})
    links = {}
    if rows:
        try:
            for p in get_json(REST.format(ids=','.join(r['sid'] for r in rows))):
                links[str(p.get('id'))] = (p.get('link'), rest_title((p.get('title') or {}).get('rendered')))
        except FetchError as err:
            log.warning('musikverein_graz: REST titles failed: %s', err)
    kept, skipped = [], 0
    for r in rows:
        link, title = links.get(r['sid'], (None, None))
        r['title'] = title or r['summary']
        r['page'] = link
        if _SKIP_SERIES.search(r['series']) or _SKIP_TITLE.search(f"{r['title']} {r['summary']}"):
            skipped += 1
            continue
        kept.append(r)
    log.info('musikverein_graz: %d iCal entries, %d skipped (family/school/open day)', len(rows), skipped)
    details, previous = read_details(KEY, kept, lambda url: parse_detail(get(url)))
    events = []
    for r in kept:
        d, prev = details.get(r['page']), previous.get(r['sid'])
        title = r['title']
        better = (d or {}).get('heading') or (prev or {}).get('title')
        if better and same_title(better, title):
            title = better                              # the same words, with the commas the REST title lost
        credits = d['credits'] if d else prev_credits(prev)
        program = d['program'] if d else prev_program(prev)
        ticket = (d or {}).get('ticket') or (prev or {}).get('ticketUrl')
        cancelled = (r['status'] == 'cancelled' or looks_cancelled(r['title']) or looks_cancelled(r['summary'])
                     or looks_cancelled(r['note']))
        try:
            events.append(make_event(
                KEY, r['sid'], title, r['start'], end=r['end'], city=CITY,
                venueName=venue((d or {}).get('hall') or r['location']), series=r['series'],
                credits=credits, program=program, ticketUrl=ticket, url=r['page'] or SITE,
                status='cancelled' if cancelled else 'scheduled'))
        except ValueError as err:
            log.warning('musikverein_graz %s: skipped: %s', r['sid'], err)
    return events
