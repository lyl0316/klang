"""Grand Théâtre de Genève: operas and recitals from the Ville de Genève agenda (open data).

Source: the city's Grand Théâtre agenda on opendata.swiss, published through OpenAgenda
(agenda 92123953), same open licence as the Victoria Hall dataset (source must be given).
During the renovation the house plays at the Bâtiment des Forces Motrices (BFM); the
agenda gives the actual venue of each production.

Kept: operas, concerts and recitals ('opera' / 'concert' tags). Dropped: ballet, guided
tours, talks, workshops and children-only shows. Each timing is one Klang concert.
Credits come from the 'Distribution' block ('**Direction musicale** Name', '**Figaro** Name')
or, for recitals, from '**Name,** role' lines; the creative team is left out.
"""
from __future__ import annotations

import re

from common import FetchError, clean, log, today_zurich
from ._geneva import fold, oa_tags, oa_text, openagenda_events
from .geneva_victoria_hall import convert

KEY = 'geneva_grand_theatre'
NAME = 'Grand Théâtre de Genève (Ville de Genève)'
SITE = 'https://www.gtg.ch/'
ATTRIBUTION = ('Source: Ville de Genève – Agenda du Grand Théâtre de Genève (opendata.swiss, via OpenAgenda). '
               'Licence: open use, source must be given.')
KIND = 'venue'
MAX_REQUESTS = 6
TIME_LIMIT = 180

AGENDA_UID = 92123953

_MUSIC_TAGS = {'opera', 'concert', 'recital', 'recitals'}
_OTHER_TAGS = {'danse', 'ballet', 'visite-commentee', 'visite', 'conference', 'rencontre', 'atelier',
               'spectacle-theatre', 'theatre', 'exposition', 'projection', 'cinema'}
_COMPOSER_RE = re.compile(r"\b(?i:op[ée]ra(?:-comique| bouffe)?|op[ée]rette|oratorio|drame lyrique|trag[ée]die lyrique|"
                          r"com[ée]die lyrique|singspiel|zarzuela)\s+(?:de|d['’])\s*"
                          r"([A-ZÀ-Ý][\w’'.\-]+(?:\s+(?:[A-ZÀ-Ý][\w’'.\-]+|de|da|di|von|van|der|del|du|le|la)){0,4})")


def _keep(ev, head, md, credits, program):
    tags = oa_tags(ev)
    if not tags & _MUSIC_TAGS:
        return False                                 # ballet, tours, talks, theatre ...
    if 'enfants-et-famille' in tags and 'tous-publics' not in tags:
        return False                                 # children-only shows
    if re.search(r'\b(visite|conference|atelier|rencontre|masterclass)\b', fold(head)):
        return False
    return True


_SET_OF_RE = re.compile(r"^((?i:lieder|m[ée]lodies|airs|chansons|[œo]euvres|pi[èe]ces|sonates|cantates))\s+(?:de|d['’])\s*"
                       r"([A-ZÀ-Ý][\w’'.\-]+(?:\s+(?:[A-ZÀ-Ý][\w’'.\-]+|de|da|di|von|van|der|del|du|le|la)){0,4}?)"
                       r"(\s+(?:sur|pour|d['’]apr[èe]s|extraits?)\b.*)?$")


def _program(ev, md):
    """'Opéra de Wolfgang Amadeus Mozart' (short description or a '###' heading, never the prose)
    -> [(composer, title)]. A recital's italic line '_Lieder de Franz Schubert sur des poèmes de
    J. W. von Goethe_' (before any prose) -> Schubert: 'Lieder sur des poèmes de J. W. von Goethe'."""
    headings = [l for l in md.split('\n') if l.lstrip().startswith('#')]
    for text in [oa_text(ev.get('description'))] + headings:
        m = _COMPOSER_RE.search(clean(text.replace('*', ' ').replace('#', ' ')))
        if m:
            return [{'composer': m.group(1).strip(), 'title': oa_text(ev.get('title'))}]
    for line in md.split('\n'):
        line = line.strip().rstrip('\\').strip()
        if len(clean(line)) > 110:
            break                                    # prose starts: stop
        if line.startswith('_') and line.endswith('_'):
            m = _SET_OF_RE.match(clean(line.strip('_')))
            if m:
                return [{'composer': m.group(2), 'title': f"{m.group(1)}{m.group(3) or ''}"}]
    return []


def _kind(ev, md):
    tags = oa_tags(ev)
    if 'opera' in tags:
        return 'vocal-opera'
    text = fold(f"{oa_text(ev.get('description'))} {md[:300]}")
    if 'recital' in text:
        return 'recital'
    return None


def _url(ev):
    reg = ev.get('registrationUrl') or ''
    return reg if re.match(r'https?://(www\.)?gtg\.ch/', reg) else None


def fetch():
    today = today_zurich()
    raw = openagenda_events(AGENDA_UID)            # FetchError propagates: build reuses yesterday
    if not raw:
        raise FetchError(f'https://openagenda.com/agendas/{AGENDA_UID}/events.json', 'export returned no events')
    events = []
    for ev in raw:
        try:
            events.extend(convert(ev, key=KEY, today=today, keep=_keep,
                                  parse_kw={'role_first_section': 'distribution'},
                                  program_hint=_program, kind_hint=_kind, url_of=_url))
        except Exception as err:                    # one odd listing must not lose the rest
            log.warning('%s: skipped event %s: %s: %s', KEY, ev.get('uid'), type(err).__name__, err)
    return events
