// Read-only data access: builds Klang's concerts from the REAL listings (feed.js — the venues' and
// orchestras' own websites, refreshed daily) plus the user's own imports, builds indexes and answers
// queries for every view. There are no demo or invented concerts at run time (js/data/generate.js is
// used by the unit tests only).
//
// A concert from the feed:
//   { id: 'feed-<feed id>', feedId, title, series, start, day, durationMin|null, cityId, venueId, room,
//     type, featured, status, credits: [{ role, name, artistId }], program: [{ composer, title,
//     composerId?, workId? }], source, sourceName, sourceSite, sourceUrl (the event page), attribution,
//     ticketUrl, url }
// `featured` (what Sheng's default "Featured only" filter keeps): a real listing that names at least
// one performer or one piece — bare "event" entries without either are left to "All".
//
// Cities: the 47 Sheng cities (js/data/cities.js), the extra Swiss towns that have concerts, and a
// city of its own (no coordinates, `dynamic: true`) for any other town a listing names.
// Venues: the known venues (js/data/venues.js), else one made from the listing ({ dynamic: true }).

import { CITIES, CANTONS, EXTRA_CITIES } from './data/cities.js';
import { VENUES } from './data/venues.js';
import { COMPOSERS, WORKS } from './data/repertoire.js';
import * as store from './store.js';
import * as feed from './feed.js';
import { dayKeyOf, todayKey, monthKeyOf, addDays } from './time.js';
import { normalize } from './util.js';
import { slug, matchCity, matchVenue, matchProgramItem, workFromTitle, guessType } from './ics.js';

const baseCities = [...CITIES, ...EXTRA_CITIES];
const composerMap = new Map(COMPOSERS.map((c) => [c.id, c]));
const workMap = new Map(WORKS.map((w) => [w.id, w]));
let cityMap = new Map(baseCities.map((c) => [c.id, c]));
let venueMap = new Map();
let artistMap = new Map();
let concerts = [];
let concertMap = new Map();
let shownCities = CITIES;

// ----- normalising listings -----
function dynamicCity(name) {
  const clean = String(name || '').trim();
  if (!clean) return null;
  const id = `town-${slug(clean)}`;
  if (!cityMap.has(id)) cityMap.set(id, { id, name: clean, canton: null, lat: null, lon: null, dynamic: true });
  return id;
}

// The listing's town, preferring a known town named in the venue ("Verrucano Mels" listed under St. Gallen).
function cityFor(cityText, venueText) {
  const fromCity = cityText ? matchCity(cityText) : null;
  const fromVenue = venueText ? matchCity(venueText) : null;
  if (fromVenue && fromVenue !== fromCity && !(cityText && normalize(venueText).includes(normalize(cityText)))) return fromVenue;
  return fromCity || fromVenue || dynamicCity(cityText);
}

const CHURCH = /(kirche|church|eglise|temple|munster|cathedr|kathedr|basilique|basilica|kloster|abbatiale|abbaye|chapelle|kapelle|chiesa|collegiale|stiftskirche|\bdom\b|baselgia|predigern|fraumunster|grossmunster|klosterhof|cattedrale)/;
function venueKind(name) {
  const t = normalize(name);
  if (CHURCH.test(t)) return 'church';
  if (/\b(oper|opera|opernhaus)\b/.test(t)) return 'opera';
  if (/(theater|theatre|teatro)/.test(t)) return 'theatre';
  return 'hall';
}

const SEP = /^\s*(?:[,–—-]|\|)\s*/;
const reEsc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function venueFor(venueText, cityId) {
  const text = String(venueText || '').trim();
  if (!text) return { venueId: null, room: null };
  const known = matchVenue(text, cityId) || (!cityId ? matchVenue(text) : null);
  if (known) {
    // "Tonhalle Zürich – Kleiner Saal" → Tonhalle Zürich, room "Kleiner Saal" (but not ", Zürich")
    const n = normalize(text);
    const k = normalize(known.name);
    let room = n.startsWith(k) && n.length > k.length && SEP.test(text.slice(known.name.length)) ? text.slice(known.name.length).replace(SEP, '').trim() : null;
    if (room && matchCity(room)) room = null;
    return { venueId: known.id, room: room || null };
  }
  // "Evangelische Kirche, Arosa" in Arosa → "Evangelische Kirche"; "Kirche St. Jakob Cham" and
  // "Kirche St. Jakob" in Cham are one venue.
  const city = cityMap.get(cityId);
  let name = text;
  let key = text;
  if (city) {
    name = name.replace(new RegExp(`\\s*,\\s*${reEsc(city.name)}\\s*$`, 'i'), '') || text;
    const bare = normalize(name).replace(/[^a-z0-9]+/g, ' ').trim();
    const cityKey = normalize(city.name).replace(/[^a-z0-9]+/g, ' ').trim();
    key = bare.endsWith(` ${cityKey}`) ? bare.slice(0, -cityKey.length).trim() : bare;
  }
  const id = `venue-${slug(`${city?.name || ''} ${key}`)}`;
  if (!venueMap.has(id)) venueMap.set(id, { id, name, cityId: cityId || null, kind: venueKind(name), dynamic: true });
  return { venueId: id, room: null };
}

const ENSEMBLE_ROLE = /(orchestra|orchester|ensemble|choir|chor\b|choeur|chorus|quartet|quartett|quatuor|trio|consort|ballet|ballett|tanzerinnen|dancers|band|sinfonietta|kammerphilharmonie)/i;
function creditsFor(list) {
  const out = [];
  for (const cr of list || []) {
    if (!cr || !cr.name) continue;
    if (cr.artistId) { out.push(cr); continue; }
    const id = `artist-${slug(cr.name)}`;
    const role = cr.role || 'Performer';
    if (!artistMap.has(id)) {
      const ensemble = ENSEMBLE_ROLE.test(normalize(role)) && role !== 'Chorus master';
      artistMap.set(id, { id, name: cr.name, kind: ensemble ? 'ensemble' : 'person', role });
    }
    out.push({ role, name: cr.name, artistId: id });
  }
  return out;
}

function programFor(list, title) {
  const program = (list || []).map(matchProgramItem).filter((p) => p && (p.title || p.composer || p.workId || p.composerId));
  if (program.length) return program;
  // an opera / ballet listing without a programme, titled with the work ("Die Zauberflöte")
  const w = workFromTitle(title);
  return w ? [{ composerId: w.composerId, workId: w.id }] : [];
}

function normalizeFeedConcert(raw) {
  const cityId = cityFor(raw.city, raw.venueName);
  const { venueId, room } = venueFor(raw.venueName, cityId);
  const credits = creditsFor(raw.credits);
  const program = programFor(raw.program, raw.title);
  const src = feed.sourceInfo(raw.source);
  const text = [raw.title, raw.series, raw.venueName, ...program.map((p) => `${p.composer || ''} ${p.title || ''}`)].join(' ');
  return {
    id: `feed-${raw.id}`,
    feedId: raw.id,
    title: raw.title,
    series: raw.series || null,
    start: raw.start,
    durationMin: Number(raw.durationMin) > 0 ? Number(raw.durationMin) : null,
    cityId,
    venueId,
    room,
    type: raw.type || guessType(text),
    featured: credits.length > 0 || program.length > 0,
    status: raw.status || 'scheduled',
    credits,
    program,
    notes: null,
    source: raw.source || null,
    sourceName: src?.name || null,
    sourceSite: src?.site || null,
    attribution: src?.attribution || null,
    sourceUrl: raw.url || null,
    url: raw.url || null,
    ticketUrl: raw.ticketUrl || raw.url || null,
  };
}

// Concerts the user imported (.ics / JSON, Me › Data & imports).
function normalizeImported(c) {
  const out = { ...c, source: c.source || 'import', imported: true };
  delete out.demo;
  if (!out.cityId) out.cityId = cityFor(out.cityName || out.city || null, out.venueName || null);
  if (!out.venueId && out.venueName) Object.assign(out, venueFor(out.venueName, out.cityId));
  if (!out.cityId && out.venueId) out.cityId = venueMap.get(out.venueId)?.cityId || null;
  out.credits = creditsFor(out.credits);
  out.program = (out.program || []).map(matchProgramItem).filter(Boolean);
  out.type = out.type || 'mixed';
  out.status = out.status || 'scheduled';
  out.featured = !!out.featured || out.credits.length > 0 || out.program.length > 0;
  out.sourceName = out.sourceName || null;
  out.sourceUrl = out.sourceUrl || out.url || null;
  return out;
}

export function rebuild() {
  cityMap = new Map(baseCities.map((c) => [c.id, c]));
  venueMap = new Map(VENUES.map((v) => [v.id, v]));
  artistMap = new Map();
  const list = [];
  for (const raw of feed.feedConcerts()) {
    try { list.push(normalizeFeedConcert(raw)); } catch (err) { console.warn('feed concert skipped', raw?.id, err); }
  }
  for (const c of store.getImports()) {
    try { if (c && c.start && !Number.isNaN(Date.parse(c.start))) list.push(normalizeImported(c)); } catch { /* bad import */ }
  }
  const byId = new Map();
  for (const c of list) byId.set(c.id, { ...c, day: dayKeyOf(c.start) });
  concerts = [...byId.values()].sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
  concertMap = new Map(concerts.map((c) => [c.id, c]));
  const used = new Set(concerts.map((c) => c.cityId).filter(Boolean));
  shownCities = [
    ...CITIES,
    ...EXTRA_CITIES.filter((c) => used.has(c.id)),
    ...[...cityMap.values()].filter((c) => c.dynamic && used.has(c.id)).sort((a, b) => a.name.localeCompare(b.name)),
  ];
}

// ----- lookups -----
export const allConcerts = () => concerts;
export const concert = (id) => concertMap.get(id);
export const city = (id) => cityMap.get(id);
// The 47 Sheng cities, then extra Swiss towns that have concerts, then other towns the listings name.
export const allCities = () => shownCities;
export const cantonName = (code) => CANTONS[code] || code || '';
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

// Where the listings come from: { generatedAt, fetchedAt, sources: [{ key, name, site, attribution,
// count, ok, error }], count, loaded, error } (see feed.js).
export const feedInfo = () => feed.feedInfo();
// First day "Look back" can show: past concerts are kept for 120 days.
export const pastStart = (today = todayKey()) => addDays(today, -feed.KEEP_PAST_DAYS);

// Program entries resolved for display: works from our repertoire, or the listing's own text.
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
      rawTitle: p.title || null,
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

// cityId -> number of concerts matching the other filters (upcoming unless `from` given), for every
// city of allCities() (0 when none).
export function cityCounts(opts = {}) {
  const counts = new Map(shownCities.map((c) => [c.id, 0]));
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
  const cities = shownCities.filter((c) => has(c.name) || has(CANTONS[c.canton] || ''));
  const matchedConcerts = concerts
    .filter((c) => c.day >= today)
    .filter((c) =>
      has(c.title) || has(c.series || '') ||
      c.credits.some((cr) => has(cr.name)) ||
      programItems(c).some((p) => has(p.title) || has(p.composerName) || has(p.rawTitle || '')) ||
      has(venueMap.get(c.venueId)?.name || '') || has(cityMap.get(c.cityId)?.name || ''))
    .slice(0, limit);
  return { concerts: matchedConcerts, composers, works, artists, venues, cities };
}

rebuild();
store.subscribe((topic) => {
  if (topic === 'data' || topic === 'feed') rebuild();
});
