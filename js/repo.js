// Read-only data access: merges demo concerts and imported listings, builds indexes
// and answers queries for every view.

import { CITIES, CANTONS } from './data/cities.js';
import { VENUES } from './data/venues.js';
import { COMPOSERS, WORKS } from './data/repertoire.js';
import { generateDemo, slug } from './data/generate.js';
import * as store from './store.js';
import { dayKeyOf, todayKey, monthKeyOf } from './time.js';
import { normalize } from './util.js';

const cityMap = new Map(CITIES.map((c) => [c.id, c]));
const composerMap = new Map(COMPOSERS.map((c) => [c.id, c]));
const workMap = new Map(WORKS.map((w) => [w.id, w]));
let venueMap = new Map();
let artistMap = new Map();
let concerts = [];
let concertMap = new Map();

export function rebuild() {
  const demo = store.pref('showDemo') ? generateDemo() : { concerts: [], artists: [] };
  venueMap = new Map(VENUES.map((v) => [v.id, v]));
  artistMap = new Map(demo.artists.map((a) => [a.id, a]));
  const imported = store.getImports().map(normalizeImported);
  concerts = [...demo.concerts, ...imported]
    .map((c) => ({ ...c, day: dayKeyOf(c.start) }))
    .sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
  concertMap = new Map(concerts.map((c) => [c.id, c]));
}

// Imported concerts may reference venues/artists that are not in our tables.
function normalizeImported(c) {
  const out = { ...c, demo: false, source: c.source || 'import' };
  if (!out.venueId && out.venueName) {
    const known = VENUES.find((v) => normalize(v.name) === normalize(out.venueName));
    if (known) out.venueId = known.id;
    else {
      const id = `venue-import-${slug(out.venueName)}`;
      if (!venueMap.has(id)) venueMap.set(id, { id, name: out.venueName, cityId: out.cityId || null, kind: 'hall', imported: true });
      out.venueId = id;
    }
  }
  if (!out.cityId && out.venueId) out.cityId = venueMap.get(out.venueId)?.cityId || null;
  out.credits = (out.credits || []).map((cr) => {
    if (cr.artistId) return cr;
    const id = `artist-import-${slug(cr.name)}`;
    if (!artistMap.has(id)) artistMap.set(id, { id, name: cr.name, kind: 'person', role: cr.role, imported: true });
    return { ...cr, artistId: id };
  });
  out.program = out.program || [];
  out.credits.length || (out.credits = []);
  out.type = out.type || 'mixed';
  out.status = out.status || 'scheduled';
  out.featured = !!out.featured;
  return out;
}

// ----- lookups -----
export const allConcerts = () => concerts;
export const concert = (id) => concertMap.get(id);
export const city = (id) => cityMap.get(id);
export const allCities = () => CITIES;
export const cantonName = (code) => CANTONS[code] || code;
export const venue = (id) => venueMap.get(id);
export const allVenues = () => [...venueMap.values()];
export const venuesOfCity = (cityId) => allVenues().filter((v) => v.cityId === cityId);
export const composer = (id) => composerMap.get(id);
export const allComposers = () => COMPOSERS;
export const work = (id) => workMap.get(id);
export const allWorks = () => WORKS;
export const worksOf = (composerId) => WORKS.filter((w) => w.composerId === composerId);
export const artist = (id) => artistMap.get(id);
export const allArtists = () => [...artistMap.values()];

// Program entries resolved for display: works from our repertoire, or raw text for imports.
export function programItems(c) {
  return (c.program || []).map((p) => {
    const w = p.workId ? workMap.get(p.workId) : null;
    const comp = composerMap.get(p.composerId || w?.composerId);
    return {
      work: w || null,
      composer: comp || null,
      composerName: comp?.name || p.composer || '',
      composerShort: comp?.short || p.composer || '',
      title: w?.title || p.title || '',
      catalog: w?.catalog || p.catalog || null,
    };
  });
}

export const isUpcoming = (c, today = todayKey()) => c.day >= today;

// ----- queries -----
// from/to are inclusive day keys. Empty arrays mean "no restriction".
export function query({
  from = null, to = null, cityIds = [], types = [], featuredOnly = false,
  venueId = null, composerId = null, workId = null, artistId = null, ids = null, includeHidden = false,
} = {}) {
  const citySet = cityIds.length ? new Set(cityIds) : null;
  const typeSet = types.length ? new Set(types) : null;
  const idSet = ids ? new Set(ids) : null;
  const hidden = includeHidden ? null : new Set(store.hiddenIds());
  return concerts.filter((c) =>
    (!hidden || !hidden.has(c.id)) &&
    (!from || c.day >= from) &&
    (!to || c.day <= to) &&
    (!citySet || citySet.has(c.cityId)) &&
    (!typeSet || typeSet.has(c.type)) &&
    (!featuredOnly || c.featured) &&
    (!venueId || c.venueId === venueId) &&
    (!composerId || c.program.some((p) => (p.composerId || workMap.get(p.workId)?.composerId) === composerId)) &&
    (!workId || c.program.some((p) => p.workId === workId)) &&
    (!artistId || c.credits.some((cr) => cr.artistId === artistId)) &&
    (!idSet || idSet.has(c.id)));
}

export function upcoming(opts = {}) {
  return query({ from: todayKey(), ...opts });
}

// cityId -> number of concerts matching the other filters (upcoming unless `from` given)
export function cityCounts(opts = {}) {
  const counts = new Map(CITIES.map((c) => [c.id, 0]));
  for (const c of query({ from: todayKey(), ...opts, cityIds: [] })) {
    if (c.cityId) counts.set(c.cityId, (counts.get(c.cityId) || 0) + 1);
  }
  return counts;
}

// 'YYYY-MM-DD' -> count, for the given filters (no date restriction)
export function dayCounts(opts = {}) {
  const counts = new Map();
  for (const c of query({ ...opts, from: null, to: null })) counts.set(c.day, (counts.get(c.day) || 0) + 1);
  return counts;
}

// 'YYYY-MM' -> count
export function monthCounts(opts = {}) {
  const counts = new Map();
  for (const c of query(opts)) {
    const m = monthKeyOf(c.day);
    counts.set(m, (counts.get(m) || 0) + 1);
  }
  return counts;
}

// ----- search -----
export function search(text, limit = 30) {
  const q = normalize(text.trim());
  if (q.length < 2) return { concerts: [], composers: [], works: [], artists: [], venues: [], cities: [] };
  const has = (s) => normalize(s).includes(q);
  const today = todayKey();
  const composers = COMPOSERS.filter((c) => has(c.name));
  const works = WORKS.filter((w) => has(w.title) || has(w.catalog || '') || has(`${composerMap.get(w.composerId)?.short} ${w.title}`)).slice(0, limit);
  const artists = allArtists().filter((a) => has(a.name)).slice(0, limit);
  const venues = allVenues().filter((v) => has(v.name)).slice(0, limit);
  const cities = CITIES.filter((c) => has(c.name) || has(CANTONS[c.canton] || ''));
  const matchedConcerts = concerts
    .filter((c) => c.day >= today)
    .filter((c) =>
      has(c.title) || has(c.series || '') ||
      c.credits.some((cr) => has(cr.name)) ||
      programItems(c).some((p) => has(p.title) || has(p.composerName)) ||
      has(venueMap.get(c.venueId)?.name || '') || has(cityMap.get(c.cityId)?.name || ''))
    .slice(0, limit);
  return { concerts: matchedConcerts, composers, works, artists, venues, cities };
}

rebuild();
store.subscribe((topic) => {
  if (topic === 'data' || topic === 'prefs') rebuild();
});
