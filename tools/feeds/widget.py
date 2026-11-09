#!/usr/bin/env python3
"""Small feed for the iPhone home screen widget (tools/widget/klang-widget.js).

    python3 tools/feeds/widget.py [--feed data/concerts.json] [--out data/widget.json] [--days 4]

The full feed is about 10 MB, too big for a widget to download and read. This writes the next few
days only (today in Zurich plus the following days), with the fields a widget row shows: date,
time, title, venue, city, country and the Klang id (a tap opens the concert in Klang). Cancelled
concerts are left out. Several days are kept, not just tomorrow, so the widget still has tomorrow's
list when the daily build runs late or fails. Standard library only.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ZURICH = ZoneInfo('Europe/Zurich')


def slim(feed: dict, today: str, days: int) -> dict:
    """Concerts from `today` (YYYY-MM-DD) through the next `days - 1` days, in widget form."""
    start = datetime.strptime(today, '%Y-%m-%d').date()
    wanted = {(start + timedelta(days=i)).isoformat() for i in range(days)}
    rows = []
    for c in feed.get('concerts', []):
        when = c.get('start') or ''
        if when[:10] not in wanted or c.get('status') == 'cancelled':
            continue
        rows.append({
            'i': c.get('id') or '',
            'd': when[:10],
            't': when[11:16],
            'n': c.get('title') or '',
            'v': c.get('venueName') or '',
            'c': c.get('city') or '',
            'k': c.get('country') or 'switzerland',
        })
    rows.sort(key=lambda r: (r['d'], r['t'], r['n']))
    return {
        'generatedAt': datetime.now(ZURICH).isoformat(timespec='seconds'),
        'feedGeneratedAt': feed.get('generatedAt'),
        'days': sorted(wanted),
        'concerts': rows,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--feed', default=os.path.join(ROOT, 'data', 'concerts.json'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'data', 'widget.json'))
    ap.add_argument('--days', type=int, default=4)
    ap.add_argument('--today', help='YYYY-MM-DD (default: today in Zurich)')
    a = ap.parse_args()
    with open(a.feed, encoding='utf-8') as f:
        feed = json.load(f)
    out = slim(feed, a.today or datetime.now(ZURICH).date().isoformat(), a.days)
    with open(a.out, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print(f"widget.json: {len(out['concerts'])} concerts for {out['days'][0]} to {out['days'][-1]}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
