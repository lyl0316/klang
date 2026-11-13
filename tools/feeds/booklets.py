"""Programme booklets: the link to the organiser's own programme booklet (Programmheft, programme
de salle), where a concert's page offers one. Klang keeps the link only, as ``bookletUrl``; the
booklet's text is never fetched or copied.

Organisers put the booklet on a concert's page a few days before the evening (Tonhalle: "at least
one week before"). So after a source was read, build.py calls ``add_booklets()``: for that
source's concerts in the next ``WINDOW_DAYS`` (14) days it reads the concert's own page (``url``) and
looks for the booklet link, at most ``MAX_PAGES`` pages per source and run, nearest concerts
first. A link found on an earlier run is kept from the previous feed; with requests to spare,
the nearest of those pages are read again, so a replaced file is noticed. The requests go
through ``common.get`` like every other one (robots.txt, one at a time per host), with a budget
of their own, and a failure here never fails the source.

Only the sources in ``RULES`` are looked at: those whose concert pages were seen to carry a
booklet link (survey of 13 Nov 2026, one or two pages per source). To add one, open a concert
page a few days ahead, check what the link looks like, and add the key with ``{}`` (the usual
wording is enough) or with a rule:

    text  regex the link's words must match instead of the usual wording (``BOOKLET_RE``)
    pdf   True: only links to a PDF count
    html  regex over the page's HTML whose group 1 is the link, for links without words

Left out on purpose: sites with one page for all booklets (Gewandhaus, Dresdner Philharmonie,
Mozarteum), season brochures, librettos, cast sheets and posters.
"""
from __future__ import annotations

import html as html_lib
import logging
import re
from datetime import timedelta
from urllib.parse import unquote, urldefrag, urljoin, urlsplit

import common

log = logging.getLogger('feeds.booklets')

WINDOW_DAYS = 14      # concerts from today to today + 14 days
MAX_PAGES = 15        # concert pages read per source and run
SECONDS = 150         # time limit of the booklet pass per source

RULES = {
    # Switzerland
    'tonhalle': {'html': r'<a\b[^>]*\bclass="programm"[^>]*\bhref="([^"]+)"'},
    'argovia_philharmonic': {},
    'bach_stiftung': {},
    'camerata_bern': {},
    'cnz': {},
    'concerts_fribourg': {},
    'musikkollegium': {},
    'musique_cdf': {'text': r'^programme$', 'pdf': True},
    'ocl': {},
    'osr': {'text': r'^programme$', 'pdf': True},
    # Austria
    'oper_graz': {},
    'styriarte': {},
    'tiroler_landestheater': {},
    # Germany
    'frauenkirche_dresden': {},
    'komische_oper_berlin': {},
    'muenchner_philharmoniker': {},
    'staatskapelle_dresden': {},
    'staatsoper_berlin': {},
    # France
    'capitole_toulouse': {},
    'opera_lyon': {'html': r'(https:(?:\\u002F|/){2}api\.opera-lyon\.com(?:\\u002F|/)files(?:\\u002F|/)[0-9a-f]+(?:\\u002F|/)prog[^"\'\\)\s]*\.pdf)'},
    'philharmonie_paris': {},
    'radio_france': {},
    'seine_musicale': {},
}

# the usual wording of a booklet link (German, French, Italian, English)
BOOKLET_RE = re.compile(
    r'programm\s?heft(?!e)|programmbuch|abendprogramm|digitales programm|'
    r'programme de salle|programme du soir|programma di sala|libretto di sala|'
    r'program(?:me)? (?:book|booklet)', re.I)
# ... but not ordering a printed one, advertising in it, or the page of all booklets
NOT_BOOKLET_RE = re.compile(r'\bbestell|\babonn|\bcommande|\bwerbung|\binser|\barchiv|\balle\s|\btous les|\bkiosque', re.I)
_INDEX_PATH_RE = re.compile(r'/(?:programmhefte|digitale-programmhefte|programmes?|kiosque(?:/.*)?|mediathek)/?$', re.I)
_SHARE_RE = re.compile(r'facebook\.|twitter\.|x\.com/|pinterest\.|linkedin\.|whatsapp|t\.me/|mailto:|javascript:|tel:', re.I)
_VIEWER_RE = re.compile(r'\.pdf(?:$|[?#])|[?&][a-z]+=[^&]*\.pdf|calameo\.com|issuu\.com|yumpu\.com', re.I)
_A_RE = re.compile(r'<a\b([^>]*)>(.*?)</a\s*>', re.I | re.S)
_ATTR_RE = r'\b%s\s*=\s*(?:"([^"]*)"|\'([^\']*)\')'
_URLDEFENSE_RE = re.compile(r'^https://urldefense\.com/v3/__(.+?)__;', re.I)


def _attr(attrs, name):
    m = re.search(_ATTR_RE % name, attrs, re.I)
    return html_lib.unescape(m.group(1) if m.group(1) is not None else m.group(2)).strip() if m else ''


def _is_pdf(url):
    return bool(re.search(r'\.pdf(?:$|[?#])|[?&][a-z]+=[^&]*\.pdf', unquote(url), re.I))


def _resolve(href, page_url):
    """An absolute http(s) link, or None. A mail gateway's wrapper (urldefense) is removed."""
    href = (href or '').strip()
    if not href or href.startswith('#') or _SHARE_RE.search(href):
        return None
    url = urljoin(page_url, href)
    m = _URLDEFENSE_RE.match(url)
    if m:
        url = m.group(1)
    if not re.match(r'https?://[^/\s]+\.[a-z]{2,}', url, re.I) or len(url) > 600 or re.search(r'\s', url):
        return None
    # the page itself (a tab or an anchor on it) is not a booklet
    if urldefrag(url)[0].rstrip('/') == urldefrag(page_url)[0].rstrip('/'):
        return None
    return url


def find_booklet(page_html, page_url, rule=None):
    """The booklet link on a concert page, or None. ``rule``: see the module docstring."""
    rule = rule or {}
    if not page_html:
        return None
    if rule.get('html'):
        m = re.search(rule['html'], page_html, re.I | re.S)
        if not m:
            return None
        raw = html_lib.unescape(m.group(1)).replace('\\u002F', '/').replace('\\/', '/')
        return _resolve(raw, page_url)
    wording = re.compile(rule['text'], re.I) if rule.get('text') else BOOKLET_RE
    found = []
    for m in _A_RE.finditer(page_html):
        attrs, inner = m.group(1), m.group(2)
        url = _resolve(_attr(attrs, 'href'), page_url)
        if not url:
            continue
        pdf = _is_pdf(url)
        if rule.get('pdf') and not pdf:
            continue
        # the link's words: its text, its title, and the description of a picture inside it
        words = [common.clean(inner), _attr(attrs, 'title'), _attr(attrs, 'aria-label')]
        words += [html_lib.unescape(a or b) for a, b in re.findall(_ATTR_RE % 'alt', inner, re.I)]
        text = ' '.join(w for w in words if w).strip()
        named = bool(wording.search(text))
        # a PDF whose file name says so counts too (a button with a picture only)
        if not named and not rule.get('text') and pdf:
            named = bool(BOOKLET_RE.search(unquote(urlsplit(url).path).replace('_', ' ').replace('-', ' ')))
        viewer = bool(_VIEWER_RE.search(unquote(url)))    # a PDF, or a page-turning viewer
        if not named or NOT_BOOKLET_RE.search(text) or (not viewer and _INDEX_PATH_RE.search(urlsplit(url).path)):
            continue
        found.append((0 if viewer else 1, len(found), url))
    return min(found)[2] if found else None


def add_booklets(key, events, today=None):
    """Set ``bookletUrl`` on this source's near concerts (see the module docstring). Changes the
    event dicts in place and returns (links, pages_read). Never raises."""
    rule = RULES.get(key)
    if rule is None or not events:
        return 0, 0
    try:
        today = today or common.today_zurich()
        first, last = today.isoformat(), (today + timedelta(days=WINDOW_DAYS)).isoformat()
        near = [e for e in events if e.get('url') and e.get('status') != 'cancelled'
                and first <= str(e.get('start'))[:10] <= last]
        near.sort(key=lambda e: e['start'])
        known = {}                 # page -> link kept from the previous feed
        for e in near:
            prev = common.previous_event(e['id'], e['start'])
            if prev and prev.get('bookletUrl') and prev.get('url') == e['url']:
                known.setdefault(e['url'], prev['bookletUrl'])
        pages = list(dict.fromkeys(e['url'] for e in near))
        # pages without a link first, then the known ones again (a booklet file can be replaced)
        todo = [u for u in pages if u not in known] + [u for u in pages if u in known]
        seen, read = {}, 0
        with common.source_budget(key, max_requests=MAX_PAGES, seconds=SECONDS):
            for url in todo[:MAX_PAGES]:
                try:
                    page = common.get(url)
                except common.BudgetExceeded:
                    break
                except common.FetchError as e:
                    log.info('%s: booklet page not read: %s', key, e)
                    continue
                read += 1
                seen[url] = find_booklet(page, url, rule)
        links = 0
        for e in near:
            link = seen[e['url']] if e['url'] in seen else known.get(e['url'])
            if link:
                e['bookletUrl'] = link
                links += 1
            else:
                e.pop('bookletUrl', None)
        return links, read
    except Exception as e:  # noqa: BLE001 - booklets are an extra; the source's concerts stay
        log.warning('%s: booklet pass failed: %s: %s', key, type(e).__name__, e)
        return 0, 0
