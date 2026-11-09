#!/usr/bin/env node
// Small feed for the iPhone widget (klang-widget.js), written by the daily build:
//
//   node tools/widget/widget-feed.mjs [--feed data/concerts.json] [--out data/widget.json] [--days 4] [--today YYYY-MM-DD]
//
// The full feed is about 10 MB, too big for a widget to download and read. This writes today (in
// Zurich) and the next days only. Several days are kept, not just tomorrow, so the widget still has
// tomorrow's list when the daily build runs late or fails.
//
// The listings go through Klang's own modules (js/feed.js, js/repo.js), so every row carries exactly
// the concert id and city id the app uses: the widget can show the same place as the Concerts tab
// (Me › iPhone widget sends it) and a tap opens the right concert page. Node's standard library only;
// js/package.json tells Node that Klang's .js files are ES modules.
//
// Row fields: i (Klang concert id), d (day), t (HH:MM), n (title), v (venue as listed),
// c (Klang's city name), y (Klang's city id), k (country id; 'switzerland' for Swiss concerts).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const feedPath = arg('--feed', path.join(ROOT, 'data', 'concerts.json'));
const outPath = arg('--out', path.join(ROOT, 'data', 'widget.json'));
const days = Math.max(1, Number(arg('--days', 4)) || 4);

// Klang keeps personal data in localStorage; its modules get an empty one that is thrown away.
// (Newer Node versions have their own localStorage; if it can't be replaced, Klang's storage helper
// in js/util.js already copes without one.)
const mem = new Map();
try {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, String(v)); },
      removeItem: (k) => { mem.delete(k); },
      clear: () => mem.clear(),
      key: (i) => [...mem.keys()][i] ?? null,
      get length() { return mem.size; },
    },
  });
} catch { /* see above */ }

const load = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const feed = await load('js/feed.js');
const repo = await load('js/repo.js');
const time = await load('js/time.js');

const data = JSON.parse(fs.readFileSync(feedPath, 'utf8'));
feed.setFeed(data, { persist: false });
repo.rebuild();

const today = arg('--today', time.todayKey());
const wanted = Array.from({ length: days }, (_, i) => time.addDays(today, i));
const want = new Set(wanted);
const raw = new Map((data.concerts || []).map((c) => [c.id, c]));

const rows = repo.allConcerts()
  .filter((c) => c.feedId && want.has(c.day) && c.status !== 'cancelled')
  .map((c) => {
    const r = raw.get(c.feedId) || {};
    return {
      i: c.id,
      d: c.day,
      t: String(c.start || '').slice(11, 16),
      n: c.title || '',
      v: r.venueName || '',
      c: repo.city(c.cityId)?.name || r.city || '',
      y: c.cityId || '',
      k: c.country || 'switzerland',
    };
  })
  .sort((a, b) => a.d.localeCompare(b.d) || a.t.localeCompare(b.t) || a.n.localeCompare(b.n));

const out = {
  generatedAt: new Date().toISOString(),
  feedGeneratedAt: data.generatedAt || null,
  days: wanted,
  concerts: rows,
};
fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`widget.json: ${rows.length} concerts for ${wanted[0]} to ${wanted[wanted.length - 1]}`);
