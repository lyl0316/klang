#!/usr/bin/env node
// Small feed for the iPhone widget (klang-widget.js), written by the daily build:
//
//   node tools/widget/widget-feed.mjs [--feed data/concerts.json] [--out data/widget.json] [--days 4]
//        [--alerts-out data/widget-alerts.json] [--alert-days 14] [--today YYYY-MM-DD]
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
//
// It also writes data/widget-alerts.json for the widget's favourite alerts (added 21 Nov 2026): the
// next 14 days, only concerts that name a composer, work or performer Klang knows, with the same row
// fields plus m (composer ids), w (work ids, repertoire and 'x-…'), a (artist ids). The widget matches
// them against the favourites Klang sent it (Me › iPhone widget) and posts a notification on the phone.
//
// The owner's first picks (21–22 Nov 2026; Luzerner Theater added 26 Nov), in both files: o: 1 = always
// in the notifications, whatever the chosen cities: every performance at Opernhaus Zürich, KKL Luzern or
// Luzerner Theater, and Martha Argerich in Basel or Bern; p = 2 for Martha Argerich in Switzerland (with
// f, her name as listed), 1 for the three houses, to put them first. The alerts file also holds every
// p 2 concert however far ahead; the widget announces those even without a ♥ when they are in the
// chosen cities or at the three houses.
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
const alertsPath = arg('--alerts-out', path.join(ROOT, 'data', 'widget-alerts.json'));
const alertDays = Math.max(1, Number(arg('--alert-days', 14)) || 14);

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

const FIRST_VENUES = new Set(['opernhaus-zurich', 'kkl-luzern', 'luzerner-theater']); // Luzerner Theater: 26 Nov 2026
const FIRST_ARTISTS = new Set(['artist-martha-argerich']);
const FIRST_ARTIST_CITIES = new Set(['basel', 'bern']); // Argerich here is in range whatever the cities
const firstArtists = (c) => (c.country ? [] : c.credits.filter((cr) => FIRST_ARTISTS.has(cr.artistId)));
const firstOf = (c) => (firstArtists(c).length ? 2 : FIRST_VENUES.has(c.venueId) ? 1 : 0);

const row = (c) => {
  const r = raw.get(c.feedId) || {};
  const p = firstOf(c);
  return {
    i: c.id,
    d: c.day,
    t: String(c.start || '').slice(11, 16),
    n: c.title || '',
    v: r.venueName || '',
    c: repo.city(c.cityId)?.name || r.city || '',
    y: c.cityId || '',
    k: c.country || 'switzerland',
    ...(p ? { p } : {}),
    ...(FIRST_VENUES.has(c.venueId) || (p === 2 && FIRST_ARTIST_CITIES.has(c.cityId)) ? { o: 1 } : {}),
    ...(p === 2 ? { f: [...new Set(firstArtists(c).map((cr) => cr.name))] } : {}),
  };
};
const byTime = (a, b) => a.d.localeCompare(b.d) || a.t.localeCompare(b.t) || a.n.localeCompare(b.n);
const live = (c) => c.feedId && c.status !== 'cancelled';

const rows = repo.allConcerts()
  .filter((c) => live(c) && want.has(c.day))
  .map(row)
  .sort(byTime);

const out = {
  generatedAt: new Date().toISOString(),
  feedGeneratedAt: data.generatedAt || null,
  days: wanted,
  concerts: rows,
};
fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`widget.json: ${rows.length} concerts for ${wanted[0]} to ${wanted[wanted.length - 1]}`);

// ----- favourite alerts: the same rule as Klang's "Following" filter (views/concerts.js) -----
const uniq = (list) => [...new Set(list.filter(Boolean))];
const alertEnd = time.addDays(today, alertDays - 1);
const alerts = repo.allConcerts()
  .filter((c) => live(c) && c.day >= today && (c.day <= alertEnd || firstOf(c) === 2))
  .map((c) => ({
    ...row(c),
    m: uniq(c.program.map((p) => p.composerId || repo.work(p.workId)?.composerId)),
    w: uniq(c.program.flatMap((p) => [p.workId, p.wkey])),
    a: uniq(c.credits.map((cr) => cr.artistId)),
  }))
  .filter((r) => r.m.length || r.w.length || r.a.length || r.p)
  .sort(byTime);
fs.writeFileSync(alertsPath, JSON.stringify({
  generatedAt: out.generatedAt,
  feedGeneratedAt: out.feedGeneratedAt,
  from: today,
  to: alertEnd,
  concerts: alerts,
}));
console.log(`widget-alerts.json: ${alerts.length} concerts for ${today} to ${alertEnd}`);
