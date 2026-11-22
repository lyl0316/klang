#!/usr/bin/env python3
"""Archive of past concerts for the app's Look back (added 23 Nov 2026).

    python3 tools/feeds/past.py --feed data/concerts.json \\
        --previous https://lyl0316.github.io/klang/data/concerts.json \\
        --site https://lyl0316.github.io/klang/ --out-dir data/past

The daily feed (concerts.json) starts today, so a phone could only look back at the days it happened
to keep in its own copy (js/feed.js). This keeps the past on the site instead:

  data/past/index.json     {"generatedAt", "from", "to", "months": {"2026-11": 412, ...}}
  data/past/YYYY-MM.json   {"month", "concerts": [...]}  (the same concert records as concerts.json)

Each run reads the published archive (--site), adds the concerts of the previous published feed
(--previous) whose day is before today (Zurich, the new feed's own day), keeps the last KEEP_DAYS
days (the app's KEEP_PAST_DAYS) and writes the files. A concert in the previous feed replaces the
archive's copy (a late cancellation wins).

GitHub Pages replaces the whole site on every deploy, so a file this script doesn't write is gone.
That's why it stops (exit 2, so nothing is deployed) when the published archive or feed can't be read
after five tries, instead of writing a shorter archive. A missing archive (404) is a first run.
Standard library only.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import date, timedelta

KEEP_DAYS = 120  # js/feed.js KEEP_PAST_DAYS
UA = 'KlangConcertBot/1.0 (+https://lyl0316.github.io/klang/; personal, non-commercial)'


class Unreadable(Exception):
    pass


def fetch_json(src, missing_ok=False):
    """JSON from a URL or a file. None when missing_ok and it doesn't exist (404 / no file)."""
    if not src.startswith(('http://', 'https://')):
        if not os.path.exists(src):
            if missing_ok:
                return None
            raise Unreadable(f'{src}: no such file')
        with open(src, encoding='utf-8') as f:
            return json.load(f)
    last = None
    for attempt in range(5):
        try:
            req = urllib.request.Request(src, headers={'User-Agent': UA, 'Cache-Control': 'no-cache'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404 and missing_ok:
                return None
            last = f'HTTP {e.code}'
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as e:
            last = f'{type(e).__name__}: {e}'
        time.sleep(10 * (attempt + 1))  # GitHub Pages sometimes answers 503 for a few seconds
    raise Unreadable(f'{src}: {last}')


def months_between(first: str, last: str):
    y, m = int(first[:4]), int(first[5:7])
    out = []
    while f'{y:04d}-{m:02d}' <= last[:7]:
        out.append(f'{y:04d}-{m:02d}')
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out


def build_archive(old_months, previous, today: str, keep_days=KEEP_DAYS):
    """old_months: {month: [concert, ...]} from the published archive; previous: the previous feed.
    Returns {month: [concert, ...]} with every concert from today - keep_days up to yesterday."""
    first = (date.fromisoformat(today) - timedelta(days=keep_days)).isoformat()
    by_id = {}
    for concerts in old_months.values():
        for c in concerts:
            if isinstance(c, dict) and c.get('id') and c.get('start'):
                by_id[c['id']] = c
    for c in (previous or {}).get('concerts') or []:
        if isinstance(c, dict) and c.get('id') and str(c.get('start', ''))[:10] < today:
            by_id[c['id']] = c  # the newer copy wins
    months = {}
    for c in by_id.values():
        day = str(c['start'])[:10]
        if first <= day < today:
            months.setdefault(day[:7], []).append(c)
    for m in months:
        months[m].sort(key=lambda c: (c['start'], c['id']))
    return months


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--feed', required=True, help='the new concerts.json (its generatedAt gives today)')
    ap.add_argument('--previous', required=True, help='the published concerts.json (URL or file)')
    ap.add_argument('--site', required=True, help='the published site, where data/past/ lives (URL or folder)')
    ap.add_argument('--out-dir', required=True)
    ap.add_argument('--keep-days', type=int, default=KEEP_DAYS)
    a = ap.parse_args(argv)

    try:
        feed = fetch_json(a.feed)
        today = str(feed.get('generatedAt') or '')[:10]
        if len(today) != 10:
            raise Unreadable(f'{a.feed}: no generatedAt')
        previous = fetch_json(a.previous)
        base = a.site.rstrip('/') + '/data/past/'
        index = fetch_json(base + 'index.json', missing_ok=True) or {}
        old = {}
        for m in sorted((index.get('months') or {}).keys()):
            data = fetch_json(base + f'{m}.json', missing_ok=False)
            old[m] = data.get('concerts') or []
    except Unreadable as e:
        print(f'past.py: {e}; nothing written, so the published archive is not replaced by a shorter one.', file=sys.stderr)
        return 2

    months = build_archive(old, previous, today, a.keep_days)
    os.makedirs(a.out_dir, exist_ok=True)
    for m, concerts in months.items():
        with open(os.path.join(a.out_dir, f'{m}.json'), 'w', encoding='utf-8') as f:
            json.dump({'month': m, 'concerts': concerts}, f, ensure_ascii=False, separators=(',', ':'))
    days = sorted(str(c['start'])[:10] for cs in months.values() for c in cs)
    out = {
        'generatedAt': feed.get('generatedAt'),
        'from': days[0] if days else None,
        'to': days[-1] if days else None,
        'months': {m: len(months[m]) for m in sorted(months)},
    }
    with open(os.path.join(a.out_dir, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, separators=(',', ':'))
    total = sum(out['months'].values())
    print(f'past: {total} concerts from {out["from"]} to {out["to"]} in {len(months)} month file(s)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
