#!/usr/bin/env python3
"""Health check for Klang's concert feed (data/concerts.json written by build.py).

    python3 tools/feeds/check.py [--feed PATH_OR_URL] [--previous PATH_OR_URL]
                                 [--max-age-hours 30] [--report data/feed-report.json]

Fails (exit 1) when:
  - the feed is missing or unreadable, or older than --max-age-hours;
  - a source's website could not be read two updates in a row, or could not be read and its
    events were lost (a one-day outage whose events were kept, or that had none, is a warning,
    and so is a new source's first failed run);
  - a source that had events before now returns none (the site has probably changed);
  - a source's count collapsed to under 30% of the previous feed (likely a parsing break).
Also lists Klang cities with no upcoming concerts (information only, not a failure).

Writes a JSON report (published next to the feed, read by the Mac reminder in tools/feeds/mac/)
and, inside GitHub Actions, a summary on the run page and `status=ok|fail` in $GITHUB_OUTPUT.
Standard library only.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(os.path.dirname(HERE))
UA = 'KlangConcertBot/1.0 (+https://lyl0316.github.io/klang/; feed health check)'


def load(src):
    if not src:
        return None
    try:
        if re.match(r'https?://', src):
            req = urllib.request.Request(src, headers={'User-Agent': UA, 'Cache-Control': 'no-cache'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        with open(src, encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:  # noqa: BLE001 — reported, not raised
        return {'_error': f'{type(e).__name__}: {e}'}


def klang_cities():
    """The 47 cities of js/data/cities.js (id, name)."""
    try:
        src = open(os.path.join(APP, 'js', 'data', 'cities.js'), encoding='utf-8').read()
        block = src.split('export const CITIES', 1)[1].split('];', 1)[0]
        return re.findall(r"id: '([^']+)', name: '([^']+)'", block)
    except Exception:  # noqa: BLE001
        return []


def norm(s):
    s = (s or '').lower()
    for a, b in (('ü', 'u'), ('ö', 'o'), ('ä', 'a'), ('é', 'e'), ('è', 'e'), ('â', 'a'), ('ô', 'o'), ('î', 'i'), ('ç', 'c')):
        s = s.replace(a, b)
    return re.sub(r'[^a-z]+', ' ', s).strip()


CITY_ALIASES = {'zurich': ['zurich'], 'geneva': ['geneve', 'geneva', 'genf'], 'lucerne': ['luzern', 'lucerne'],
                'basel': ['basel', 'bale'], 'bern': ['bern', 'berne'], 'st-gallen': ['st gallen', 'sankt gallen', 'saint gall'],
                'fribourg': ['fribourg', 'freiburg'], 'neuchatel': ['neuchatel'], 'sion': ['sion', 'sitten']}


def parse_time(s):
    try:
        return datetime.fromisoformat(str(s).replace('Z', '+00:00'))
    except Exception:  # noqa: BLE001
        return None


def check(feed, previous, max_age_hours):
    problems, warnings, info = [], [], []
    if not feed or '_error' in feed or not isinstance(feed.get('concerts'), list):
        problems.append(f"Feed missing or unreadable ({(feed or {}).get('_error', 'no concerts list')}).")
        return problems, warnings, info, {}
    now = datetime.now(timezone.utc)
    gen = parse_time(feed.get('generatedAt'))
    if not gen:
        problems.append('Feed has no generatedAt time.')
    else:
        age = (now - gen).total_seconds() / 3600
        info.append(f'Feed generated {gen.isoformat(timespec="minutes")} ({age:.1f} h ago).')
        if age > max_age_hours:
            problems.append(f'Feed is {age:.0f} h old (limit {max_age_hours} h): the daily update did not run or did not deploy.')

    prev = {s.get('key'): s for s in ((previous or {}).get('sources') or []) if isinstance(s, dict)}
    for s in feed.get('sources') or []:
        key, name, n = s.get('key'), s.get('name') or s.get('key'), s.get('count') or 0
        p = prev.get(key)
        pn = (p or {}).get('count') or 0
        if not s.get('ok'):
            how = f'kept {n} events from the previous day' if s.get('reused') and n else 'no events kept'
            msg = f'{name}: website could not be read ({s.get("error") or "error"}); {how}'
            # A site that is down for one day is not an alarm when nothing was lost: its events were
            # kept from the previous feed, or it had none. Two days in a row, or events lost, is.
            if p is None and prev:
                warnings.append(msg + '; a new source, it will try again on the next update.')
            elif p is None:
                problems.append(msg + '.')
            elif not p.get('ok'):
                problems.append(msg + '; it could not be read the day before either.')
            elif pn and not (s.get('reused') and n):
                problems.append(msg + f' (had {pn}).')
            else:
                warnings.append(msg + '; will try again on the next update.')
            continue
        if n == 0 and pn >= 5:
            problems.append(f'{name}: returned 0 events (had {pn}); the website has probably changed.')
        elif pn >= 10 and n < 0.3 * pn:
            problems.append(f'{name}: only {n} events (had {pn}); the reader may be broken.')
        elif n == 0:
            warnings.append(f'{name}: no events published right now.')

    concerts = feed['concerts']
    today = now.astimezone().date().isoformat()
    upcoming = [c for c in concerts if str(c.get('start', ''))[:10] >= today]
    by_city = {}
    for c in upcoming:
        if not c.get('country'):          # Klang's Swiss cities only
            by_city[norm(c.get('city'))] = by_city.get(norm(c.get('city')), 0) + 1
    empty = []
    for cid, name in klang_cities():
        keys = CITY_ALIASES.get(cid, [norm(name)])
        if not any(k in city for city in by_city for k in keys):
            empty.append(name)
    abroad = {}
    for c in upcoming:
        if c.get('country'):
            abroad[c['country']] = abroad.get(c['country'], 0) + 1
    stats = {'concerts': len(concerts), 'upcoming': len(upcoming), 'sources': len(feed.get('sources') or []),
             'sourcesOk': sum(1 for s in feed.get('sources') or [] if s.get('ok')), 'citiesWithoutConcerts': empty,
             'abroad': abroad}
    info.append(f"{stats['upcoming']} upcoming concerts from {stats['sourcesOk']}/{stats['sources']} sources.")
    if abroad:
        info.append('Outside Switzerland: ' + ', '.join(f'{k.title()} {n}' for k, n in sorted(abroad.items())) + '.')
    if empty:
        info.append(f'{len(empty)} Klang cities have no upcoming concerts in the feed: {", ".join(empty)}.')
    return problems, warnings, info, stats


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--feed', default=os.path.join(APP, 'data', 'concerts.json'))
    ap.add_argument('--previous', default=None, help='previous feed to compare counts with (path or URL)')
    ap.add_argument('--max-age-hours', type=float, default=30)
    ap.add_argument('--report', default=None, help='write a JSON report here')
    args = ap.parse_args(argv)

    feed = load(args.feed)
    previous = load(args.previous) if args.previous else None
    if previous and '_error' in previous:
        previous = None
    problems, warnings, info, stats = check(feed, previous, args.max_age_hours)
    status = 'fail' if problems else 'ok'
    report = {'checkedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'status': status,
              'problems': problems, 'warnings': warnings, 'info': info, 'stats': stats,
              'feedGeneratedAt': (feed or {}).get('generatedAt')}

    print(f'Klang feed check: {status.upper()}')
    for label, items in (('PROBLEM', problems), ('warning', warnings), ('info', info)):
        for it in items:
            print(f'  {label}: {it}')
    if args.report:
        os.makedirs(os.path.dirname(os.path.abspath(args.report)), exist_ok=True)
        with open(args.report, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=1)
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as f:
            f.write(f'status={status}\n')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as f:
            f.write(f'## Klang calendar check: {"✅ OK" if status == "ok" else "❌ FAILED"}\n\n')
            for label, items in (('Problems', problems), ('Warnings', warnings), ('Info', info)):
                if items:
                    f.write(f'**{label}**\n\n' + ''.join(f'- {x}\n' for x in items) + '\n')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
