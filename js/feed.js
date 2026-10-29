// Klang's real concert listings: data/concerts.json, built every morning by tools/feeds from the
// venues' and orchestras' own websites (see tools/feeds/README.md). Never Sheng's data, never demo data.
//
//   feedConcerts()   raw feed concerts (upcoming from the last fetch + the last 120 days kept for Look back)
//   feedInfo()       { generatedAt, fetchedAt, sources: [{ key, name, site, attribution, count, ok, error }],
//                      count, loaded, error } — for attribution ("Listings from …") and Data & imports
//   sourceInfo(key)  one source of the feed ({ key, name, site, attribution, … }) or null
//   loadFeed()       fetch the feed (no HTTP cache), keep a copy in localStorage ('klang.feed.v1') for an
//                    instant, offline start; resolves to { ok, changed, added, error }
//   refreshFeed()    same, for pull to refresh
//   startFeed()      on app start: refresh, and again whenever the app comes back after more than 6 hours
//   pullToRefresh()  the Concerts list's pull to refresh: refreshes the feed and the saved import URL
//                    (settings.refreshSavedFeed); resolves to the number of new concerts (or null)
//
// A refresh that changes the listings emits the store topic 'feed' (repo rebuilds, the page repaints).

import * as store from './store.js';
import { storage } from './util.js';
import { todayKey, addDays, dayKeyOf } from './time.js';

export const FEED_URL = new URL('../data/concerts.json', import.meta.url).href; // next to index.html
const KEY = 'klang.feed.v1';
export const KEEP_PAST_DAYS = 120; // past concerts kept for Look back
const STALE_MS = 6 * 3600 * 1000;
// The copy shares localStorage's quota with the user's own data (klang.v1), so it is stored compactly
// and capped; if the feed outgrows the cap only the coming months (down to two weeks, with five
// countries' listings) are kept (the service worker still has the whole file for offline use).
const MAX_CACHE_CHARS = 1_500_000;

let feed = readCache();
let lastError = null;
let inflight = null;

const validStart = (s) => typeof s === 'string' && !Number.isNaN(Date.parse(s));

function clean(c) {
  if (!c || typeof c !== 'object' || !c.id || !c.title || !validStart(c.start)) return null;
  return c;
}

// ----- compact localStorage copy: one array per concert -----
const pairs = (list, a, b) => (list || []).flatMap((x) => [x?.[a] || '', x?.[b] || '']);
const unpairs = (flat, a, b) => {
  const out = [];
  for (let i = 0; i + 1 < (flat || []).length; i += 2) out.push({ [a]: flat[i], [b]: flat[i + 1] });
  return out;
};
function pack(c) {
  return [c.id, c.source || '', c.title, c.start, c.durationMin || 0, c.city || '', c.venueName || '', c.type || '', c.series || '',
    pairs(c.credits, 'role', 'name'), pairs(c.program, 'composer', 'title'), c.ticketUrl || '',
    c.url && c.url === c.ticketUrl ? '=' : (c.url || ''), c.status && c.status !== 'scheduled' ? c.status : ''];
}
function unpack(a) {
  const [id, source, title, start, durationMin, city, venueName, type, series, credits, program, ticketUrl, url, status] = a;
  const c = { id, source, title, start, city, venueName, credits: unpairs(credits, 'role', 'name'), program: unpairs(program, 'composer', 'title'), status: status || 'scheduled' };
  if (durationMin) c.durationMin = durationMin;
  if (type) c.type = type;
  if (series) c.series = series;
  if (ticketUrl) c.ticketUrl = ticketUrl;
  if (url) c.url = url === '=' ? ticketUrl : url;
  return c;
}

function readCache() {
  try {
    const v = storage.get(KEY, null);
    if (!v || typeof v !== 'object' || v.v !== 2 || !Array.isArray(v.c)) return null;
    const concerts = v.c.map((a) => clean(Array.isArray(a) ? unpack(a) : null)).filter(Boolean);
    return { generatedAt: v.generatedAt || null, fetchedAt: v.fetchedAt || null, window: v.window || null, sources: Array.isArray(v.sources) ? v.sources : [], concerts };
  } catch {
    return null;
  }
}

function writeCache(f) {
  const today = todayKey();
  for (const days of [null, 240, 120, 60, 30, 14]) {
    const list = days == null ? f.concerts : f.concerts.filter((c) => dayKeyOf(c.start) <= addDays(today, days));
    const text = JSON.stringify({ v: 2, generatedAt: f.generatedAt, fetchedAt: f.fetchedAt, window: f.window, sources: f.sources, c: list.map(pack), trimmedTo: days });
    if (text.length > MAX_CACHE_CHARS) continue;
    try {
      localStorage.setItem(KEY, text);
      return true;
    } catch {
      /* quota: try a shorter copy */
    }
  }
  storage.remove(KEY);
  return false;
}

export const feedConcerts = () => feed?.concerts || [];

export function feedInfo() {
  return {
    generatedAt: feed?.generatedAt || null,
    fetchedAt: feed?.fetchedAt || null,
    sources: feed?.sources || [],
    count: feed?.concerts?.length || 0,
    loaded: !!feed,
    error: lastError,
  };
}

export function sourceInfo(key) {
  return (feed?.sources || []).find((s) => s.key === key) || null;
}

export const hasFeed = () => !!feed;

// Validate a downloaded feed and merge in the past concerts of the previous copy.
export function mergeFeed(data, previous = feed, today = todayKey()) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.concerts)) throw new Error('Not a Klang feed');
  const fresh = data.concerts.map(clean).filter(Boolean);
  const ids = new Set(fresh.map((c) => c.id));
  const from = addDays(today, -KEEP_PAST_DAYS);
  const past = (previous?.concerts || []).filter((c) => !ids.has(c.id) && dayKeyOf(c.start) < today && dayKeyOf(c.start) >= from);
  const sources = Array.isArray(data.sources) ? data.sources.filter((s) => s && s.key) : [];
  // sources of kept past concerts that are no longer in the feed keep their attribution
  const known = new Set(sources.map((s) => s.key));
  for (const s of previous?.sources || []) {
    if (!known.has(s.key) && past.some((c) => c.source === s.key)) { sources.push({ ...s, count: 0, past: true }); known.add(s.key); }
  }
  return {
    generatedAt: data.generatedAt || null,
    fetchedAt: new Date().toISOString(),
    window: data.window || null,
    sources,
    concerts: [...past, ...fresh].sort((a, b) => a.start.localeCompare(b.start)),
  };
}

// Replace the in-memory feed (tests, or a feed loaded some other way) and notify the app.
export function setFeed(data, { persist = true } = {}) {
  const before = new Set(feedConcerts().map((c) => c.id));
  const changed = !feed || JSON.stringify(feed.concerts) !== JSON.stringify(data.concerts) || JSON.stringify(feed.sources) !== JSON.stringify(data.sources);
  feed = data;
  if (persist) writeCache(feed);
  const added = feed.concerts.filter((c) => !before.has(c.id)).length;
  if (changed) store.notify('feed');
  return { changed, added };
}

export function loadFeed() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(FEED_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const merged = mergeFeed(await res.json());
      lastError = null;
      const wasEmpty = !feed;
      const { changed, added } = setFeed(merged);
      return { ok: true, changed, added: wasEmpty ? 0 : added, error: null };
    } catch (err) {
      lastError = String(err?.message || err);
      return { ok: false, changed: false, added: 0, error: lastError };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export const refreshFeed = () => loadFeed();

// Pull to refresh on the Concerts list (concerts.js): the feed and the saved import URL, in parallel.
export async function pullToRefresh() {
  const [f, imported] = await Promise.all([
    refreshFeed(),
    import('./views/settings.js').then((m) => (m.refreshSavedFeed ? m.refreshSavedFeed() : null)).catch(() => null),
  ]);
  if (!f.ok && imported == null) return null;
  return (f.added || 0) + (imported || 0);
}

let started = false;
export function startFeed() {
  if (started) return;
  started = true;
  loadFeed();
  const maybeRefresh = () => {
    if (document.visibilityState !== 'visible') return;
    const at = Date.parse(feed?.fetchedAt || '') || 0;
    if (Date.now() - at > STALE_MS) loadFeed();
  };
  document.addEventListener('visibilitychange', maybeRefresh);
  window.addEventListener('pageshow', (e) => { if (e.persisted) maybeRefresh(); });
}
