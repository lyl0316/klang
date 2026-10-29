"""MuTh – Konzertsaal der Wiener Sängerknaben (Augarten, Vienna): concerts from the hall's calendar.

    https://muth.at/kalender/                      the whole season on one page
    https://muth.at/programm/<slug>-<date>/        one page per performance

The calendar page lists every performance of the season with day, "16:00 Uhr bis 17:00 Uhr",
title, subtitle, genre labels ("Kammermusik | Klassik", "Chormusik | Wiener Sängerknaben",
"Jazz | Neue Musik" …), format labels (audience: "Erwachsene", "Familie", "Kinder", "Schule
Primarstufe", "Eltern & Baby", "Vermittlung" …) and the ticket link. The performance page
adds the performers (name + role) and the programme ("FRANZ SCHUBERT Streichquintett C-Dur D
956": composer in capitals, then the work). Only those facts are taken, never the texts.

Performance pages are read incrementally: one the previous feed has (same id, start and
title) keeps its performers and works unless it is in the next week or due on a fixed
rotation (each about every two weeks). About 40 performances a season are for Klang, so a
run needs at most ~45 requests.

Kept: performances with a classical genre label (Klassik, Oper, Chormusik, Orchestermusik,
Kammermusik, Alte Musik, Neue Musik, Wiener Sängerknaben) and no pop/jazz/rock/world/dance/
show label, unless "Klassik" is also given. Skipped: school and kindergarten performances,
baby and toddler concerts, the "CLOSE UP" education series (Vermittlung), shows for children
with their families ("Kinder" + "Familie"), dance shows (Ballet of Lights), galas, jazz,
pop, world music and guest opera from other traditions.

Checked against the website on 29 Oct 2026 (Friday Afternoon 13 Nov, Minetti Quartett 12
Apr 2027, Gute Hirten 4 Dec, Candlelight 20 Nov).
"""
from __future__ import annotations

import html as _html
import re
from datetime import date, timedelta

from common import (BudgetExceeded, FetchError, clean, event_id, get, infer_type, log, looks_cancelled, make_event,
                    previous_event, refresh_due, requests_left, today_zurich)

from ._vienna import CITY, credit, local_iso, looks_like_person, month_number, order_credits

KEY = 'muth_wien'
NAME = 'MuTh – Konzertsaal der Wiener Sängerknaben'
SITE = 'https://muth.at/'
ATTRIBUTION = 'Source: MuTh – Konzertsaal der Wiener Sängerknaben (muth.at)'
KIND = 'venue'
COUNTRY = 'austria'
MAX_REQUESTS = 80
TIME_LIMIT = 600
REFRESH_NEAR_DAYS = 7
REFRESH_EVERY_DAYS = 14
WINDOW_DAYS = 450

CALENDAR = 'https://muth.at/kalender/'
VENUE = 'MuTh – Konzertsaal der Wiener Sängerknaben'

_CLASSICAL = re.compile(r'klassik|\boper\b|chormusik|orchestermusik|kammermusik|alte musik|neue musik|s[äa]ngerknaben', re.I)
_NOT_CLASSICAL = re.compile(r'\bpop\b|jazz|rock|world|tanz|show|performance|elektronik|musical', re.I)
_SKIP_FORMAT = re.compile(r'schule|kindergarten|eltern\s*&(?:amp;)?\s*baby|vermittlung', re.I)
_SKIP_TITLE = re.compile(r'schulvorstellung|\bgala\b|f[üu]hrung|workshop|allerj[üu]ngsten', re.I)


def parse_calendar(page_html):
    """-> list of performance dicts from the calendar page."""
    out = []
    for row in re.split(r'<div data-zyklus=', page_html or '')[1:]:
        link = re.search(r'href="(https://muth\.at/programm/([^"/]+)/)"', row)
        title = re.search(r'class="programm-title">(.*?)</div>', row, re.S)
        day = re.search(r'programm-date_start_converted">\s*\w*\s*(\d{1,2})\.', row)
        month = re.search(r'programm-date_start_month">(.*?)</div>', row, re.S)
        year = re.search(r'programm-date_start_year">\s*(\d{4})', row)
        hour = re.search(r'programm-date_start_hour">\s*(\d{1,2}[:.]\d{2})', row)
        if not (link and title and day and month and year and hour):
            continue
        m = month_number(clean(month.group(1)))
        if not m:
            continue
        end = re.search(r'programm-date_end_hour">\s*(\d{1,2}[:.]\d{2})', row)
        sub = re.search(r'class="programm-subtitle">(.*?)</div>', row, re.S)
        genre = re.search(r'class="programm-genre d-none d-lg-block">(.*?)</div>', row, re.S)
        fmt = re.search(r'class="programm-format d-none d-lg-block">(.*?)</div>', row, re.S)
        ticket = re.search(r'programm-ticket_button"><a href="([^"]+)"', row)
        out.append({
            'url': _html.unescape(link.group(1)), 'slug': link.group(2),
            'day': date(int(year.group(1)), m, int(day.group(1))), 'time': hour.group(1),
            'end': end.group(1) if end else None, 'title': clean(title.group(1)),
            'subtitle': clean(sub.group(1)) if sub else '', 'genre': clean(genre.group(1)) if genre else '',
            'format': clean(fmt.group(1)) if fmt else '',
            'ticket': _html.unescape(ticket.group(1)) if ticket else None,
        })
    return out


def classify(p):
    """None when the performance is for Klang, else the reason to skip it."""
    if _SKIP_TITLE.search(f"{p['title']} {p['slug']}"):
        return 'school / gala / tour'
    if _SKIP_FORMAT.search(p['format']):
        return 'school / education / babies'
    if re.search(r'kinder', p['format'], re.I) and re.search(r'familie', p['format'], re.I):
        return 'children and families'
    if not _CLASSICAL.search(p['genre']):
        return 'not classical'
    if _NOT_CLASSICAL.search(p['genre']) and not re.search(r'klassik', p['genre'], re.I):
        return 'not classical'
    return None


def _title_case(caps):
    words = []
    for w in caps.split():
        if w.lower() in ('van', 'von', 'de', 'der', 'di', 'da', 'du', 'la', 'le'):
            words.append(w.lower())
        else:
            words.append('-'.join(x[:1].upper() + x[1:].lower() for x in w.split('-')))
    return ' '.join(words)


def parse_detail(page_html):
    """-> {'performers': [(name, role)], 'works': [(composer, title)]}"""
    h = page_html or ''
    performers = re.findall(r'<span class="detail-termin_cast_name">(.*?)</span>\s*<span class="detail-termin-cast_role">(.*?)</span>',
                            h, re.S)
    works = []
    prog = re.search(r'<div class="detail-termin-programm">(.*?)</div>', h, re.S)
    for line in re.split(r'(?i)<br\s*/?>|</p>', prog.group(1) if prog else ''):
        line = clean(line)
        m = re.match(r"^((?:[A-ZÄÖÜÉÈÁÀÇŠŽČŘ][A-ZÄÖÜÉÈÁÀÇŠŽČŘ'’.\-]+\s+){1,4}?[A-ZÄÖÜÉÈÁÀÇŠŽČŘ][A-ZÄÖÜÉÈÁÀÇŠŽČŘ'’\-]+)\s+(\S.*)$", line)
        if m and not m.group(2).isupper():
            composer = _title_case(m.group(1))
            if looks_like_person(composer, max_words=5):
                works.append((composer, m.group(2).strip()))
    return {'performers': [(clean(n), clean(r)) for n, r in performers if clean(n)], 'works': works}


def _title(p):
    """The calendar's title; a series name alone ('KULTURMITTAG') gets the evening's subtitle."""
    if re.match(r'(?i)^kulturmittag$', p['title']) and p['subtitle']:
        return f"{p['title']}: {p['subtitle'].split('|')[0].strip()}"
    return p['title']


def fetch():
    today = today_zurich()
    last = today + timedelta(days=WINDOW_DAYS)
    perfs = [p for p in parse_calendar(get(CALENDAR)) if today <= p['day'] <= last]   # FetchError propagates
    skipped, cands = {}, []
    for p in perfs:
        why = classify(p)
        if why:
            skipped[why] = skipped.get(why, 0) + 1
            continue
        start = local_iso(p['day'], p['time'])
        if not start:
            continue
        c = {'p': p, 'start': start, 'credits': [], 'works': [], 'detailed': False, 'reused': False}
        prev = previous_event(event_id(KEY, p['slug']), start, title=_title(p))
        if prev:
            c['credits'] = [(x.get('role'), x.get('name')) for x in prev.get('credits') or []]
            c['works'] = [(x.get('composer') or '', x.get('title') or '') for x in prev.get('program') or []]
            c['reused'] = True
        cands.append(c)

    todo = [c for c in cands if not c['reused']
            or refresh_due(c['p']['slug'], c['start'], near_days=REFRESH_NEAR_DAYS, every_days=REFRESH_EVERY_DAYS)]
    read = 0
    for c in sorted(todo, key=lambda c: (c['reused'], c['start'])):
        if requests_left() <= 0:
            break
        try:
            d = parse_detail(get(c['p']['url']))
        except BudgetExceeded as err:
            log.warning('%s: stopped reading pages: %s', KEY, err.reason)
            break
        except FetchError as err:
            log.warning('%s %s: page failed: %s', KEY, c['p']['slug'], err)
            continue
        read += 1
        c['detailed'] = True
        c['credits'] = order_credits([x for x in (credit(n, r) for n, r in d['performers']) if x])
        c['works'] = d['works']

    events = []
    for c in cands:
        p = c['p']
        end = local_iso(p['day'], p['end']) if p['end'] else None
        title = _title(p)
        try:
            events.append(make_event(
                KEY, p['slug'], title, c['start'], end=end, city=CITY, venueName=VENUE,
                type=infer_type(title, c['credits'], c['works'], p['genre']),
                credits=c['credits'], program=c['works'], ticketUrl=p['ticket'], url=p['url'],
                status='cancelled' if looks_cancelled(f"{p['title']} {p['subtitle']}") else 'scheduled'))
        except ValueError as err:
            log.warning('%s %s: skipped: %s', KEY, p['slug'], err)
    log.info('%s: %d performances in the calendar, %d pages read, %d reused; skipped %s', KEY, len(perfs), read,
             sum(1 for c in cands if c['reused'] and not c['detailed']),
             ', '.join(f'{v} {k}' for k, v in sorted(skipped.items())) or 'none')
    return events
