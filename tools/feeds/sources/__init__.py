"""Registry of concert feed readers.

Every module in this package whose name does not start with '_' is a reader. It is found
automatically, so adding a source never needs an edit here. A reader module
``sources/<key>.py`` defines:

    KEY = '<key>'            # same as the module name; lower-case letters, digits, '_'
    NAME = 'Zürcher Kammerorchester'
    SITE = 'https://www.zko.ch/'
    ATTRIBUTION = 'Source: Zürcher Kammerorchester (zko.ch)'
    def fetch() -> list[dict]: ...   # list of common.make_event(...) results

and optionally:

    KIND = 'orchestra' | 'ensemble' | 'venue' | 'festival' | 'aggregator'   # default 'venue'
    PRIORITY = int           # overrides KIND when de-duplicating (higher wins)
    MAX_REQUESTS = int       # the per-run request cap (default common.MAX_REQUESTS, at most MAX_REQUESTS_CAP)
    TIME_LIMIT = int         # seconds for this source (build.py default 600, max 1200)
    ENABLED = False          # keep a reader in the tree without running it
    COUNTRY = 'austria'      # outside Switzerland: one of COUNTRIES (default 'switzerland');
                             # its events then name the city in English as Klang lists it
                             # ('Vienna', 'Munich', 'Cologne', 'Milan', 'Paris' …)
"""
from __future__ import annotations

import importlib
import os
import pkgutil
import re
import sys
import traceback
from dataclasses import dataclass
from typing import Optional

_HERE = os.path.dirname(os.path.abspath(__file__))
_FEEDS = os.path.dirname(_HERE)
if _FEEDS not in sys.path:          # readers do `from common import ...`
    sys.path.insert(0, _FEEDS)

import common  # noqa: E402

KIND_PRIORITY = {'orchestra': 30, 'ensemble': 30, 'venue': 20, 'festival': 20, 'aggregator': 10}
COUNTRIES = ('switzerland', 'austria', 'germany', 'france', 'italy')   # ids of js/data/countries.js
DEFAULT_TIME_LIMIT = 600
MAX_TIME_LIMIT = 1200


@dataclass
class Source:
    key: str
    name: str
    site: str
    attribution: str
    module: Optional[object] = None
    kind: str = 'venue'
    priority: int = KIND_PRIORITY['venue']
    max_requests: int = common.MAX_REQUESTS
    time_limit: int = DEFAULT_TIME_LIMIT
    enabled: bool = True
    country: str = 'switzerland'
    error: Optional[str] = None     # set when the module could not be loaded or is invalid

    def fetch(self):
        return self.module.fetch()


def module_names() -> list[str]:
    """Names of all reader modules in this package (no import)."""
    return sorted(m.name for m in pkgutil.iter_modules([_HERE])
                  if not m.name.startswith('_') and not m.ispkg)


def _load(name: str) -> Source:
    try:
        mod = importlib.import_module(f'{__name__}.{name}')
    except Exception:
        tb = traceback.format_exc(limit=3).strip().splitlines()
        return Source(key=name, name=name, site='', attribution='',
                      error=f'import failed: {tb[-1] if tb else "unknown error"}')
    problems = []
    for attr in ('KEY', 'NAME', 'SITE', 'ATTRIBUTION'):
        if not isinstance(getattr(mod, attr, None), str) or not getattr(mod, attr).strip():
            problems.append(f'{attr} missing')
    key = getattr(mod, 'KEY', name)
    if key != name:
        problems.append(f'KEY {key!r} differs from module name {name!r}')
    if not re.fullmatch(r'[a-z0-9][a-z0-9_]*', name):
        problems.append('module name must be lower-case letters, digits and _')
    if not callable(getattr(mod, 'fetch', None)):
        problems.append('fetch() missing')
    kind = getattr(mod, 'KIND', 'venue')
    if kind not in KIND_PRIORITY:
        problems.append(f'unknown KIND {kind!r}')
        kind = 'venue'
    country = getattr(mod, 'COUNTRY', 'switzerland')
    if country not in COUNTRIES:
        problems.append(f'unknown COUNTRY {country!r}')
        country = 'switzerland'
    try:
        priority = int(getattr(mod, 'PRIORITY', KIND_PRIORITY[kind]))
        max_requests = max(1, min(int(getattr(mod, 'MAX_REQUESTS', common.MAX_REQUESTS)), common.MAX_REQUESTS_CAP))
        time_limit = max(30, min(int(getattr(mod, 'TIME_LIMIT', DEFAULT_TIME_LIMIT)), MAX_TIME_LIMIT))
    except (TypeError, ValueError) as e:
        problems.append(f'bad PRIORITY/MAX_REQUESTS/TIME_LIMIT: {e}')
        priority, max_requests, time_limit = KIND_PRIORITY[kind], common.MAX_REQUESTS, DEFAULT_TIME_LIMIT
    return Source(key=name, name=str(getattr(mod, 'NAME', name)), site=str(getattr(mod, 'SITE', '')),
                  attribution=str(getattr(mod, 'ATTRIBUTION', '')), module=mod, kind=kind,
                  priority=priority, max_requests=max_requests, time_limit=time_limit,
                  enabled=bool(getattr(mod, 'ENABLED', True)), country=country,
                  error='; '.join(problems) or None)


def discover(only=None) -> list[Source]:
    """Load every reader (or just the keys in ``only``), sorted by key. Never raises for a
    broken reader: its Source has ``error`` set and ``module`` may be None."""
    names = module_names()
    if only:
        names = [n for n in names if n in set(only)]
    return [_load(n) for n in names]
