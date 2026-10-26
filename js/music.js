// Apple Music via the free, keyless iTunes Search / Lookup API (country=CH).
// - searchAlbums(): recordings ("versions") of a work
// - albumTracks(): movements of a recording, each with a 30-second preview
// - player: streams previews in-app; full playback = "Open in Apple Music (Classical)".
//
// Apple's terms (performance-partners.apple.com/search-api): previews are streamed only
// (never downloaded or cached), shown with a link to Apple Music and the credit
// "provided courtesy of iTunes". Search/lookup *metadata* may be cached, so responses are
// cached in localStorage for 7 days and calls are throttled under ~20 requests/minute.
// The full Apple Music API (work/movement fields, full playback in-browser) needs the paid
// Apple Developer Program (USD 99/yr) and is not used. Apple Music Classical has no public
// API; we only deep-link to classical.music.apple.com (opens the Classical app on iOS).

import { storage } from './util.js';

const API = 'https://itunes.apple.com';
const COUNTRY = 'CH';
const CACHE_KEY = 'klang.itunes.v1';
const TTL = 7 * 24 * 3600 * 1000;
const MAX_ENTRIES = 300;
const MAX_PER_MINUTE = 18;

let cache = storage.get(CACHE_KEY, {});
const inflight = new Map();
const recent = [];

function cacheGet(key) {
  const e = cache[key];
  if (e && Date.now() - e.t < TTL) return e.v;
  return undefined;
}

function cachePut(key, v) {
  cache[key] = { t: Date.now(), v };
  const keys = Object.keys(cache);
  if (keys.length > MAX_ENTRIES) {
    keys.sort((a, b) => cache[a].t - cache[b].t).slice(0, keys.length - MAX_ENTRIES).forEach((k) => delete cache[k]);
  }
  storage.set(CACHE_KEY, cache);
}

async function throttle() {
  for (;;) {
    const now = Date.now();
    while (recent.length && now - recent[0] > 60000) recent.shift();
    if (recent.length < MAX_PER_MINUTE) {
      recent.push(now);
      return;
    }
    await new Promise((r) => setTimeout(r, 60000 - (now - recent[0]) + 50));
  }
}

async function getJSON(path, params) {
  const qs = new URLSearchParams({ country: COUNTRY, ...params }).toString();
  const key = `${path}?${qs}`;
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    await throttle();
    let json;
    try {
      const res = await fetch(`${API}${path}?${qs}`);
      if (!res.ok) throw new Error(`Apple Music lookup failed (${res.status})`);
      json = await res.json();
    } catch (err) {
      // CORS support is undocumented; JSONP (callback=) is Apple's documented cross-site method.
      json = await jsonp(`${API}${path}?${qs}`);
    }
    cachePut(key, json);
    return json;
  })();
  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}

let jsonpSeq = 0;
function jsonp(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const name = `__klangJsonp${++jsonpSeq}`;
    const script = document.createElement('script');
    const done = () => {
      delete window[name];
      script.remove();
      clearTimeout(timer);
    };
    const timer = setTimeout(() => {
      done();
      reject(new Error('Apple Music did not respond'));
    }, timeoutMs);
    window[name] = (data) => {
      done();
      resolve(data);
    };
    script.onerror = () => {
      done();
      reject(new Error('Could not reach Apple Music'));
    };
    script.src = `${url}&callback=${name}`;
    document.head.append(script);
  });
}

export function artwork(url, size = 300) {
  return url ? url.replace(/\/\d+x\d+bb\./, `/${size}x${size}bb.`) : null;
}

export async function searchAlbums(term, limit = 12) {
  const json = await getJSON('/search', { term, media: 'music', entity: 'album', limit: String(limit) });
  return (json.results || [])
    .filter((r) => r.collectionId)
    .map((r) => ({
      id: r.collectionId,
      title: r.collectionName,
      artist: r.artistName,
      artwork: artwork(r.artworkUrl100, 300),
      year: r.releaseDate ? r.releaseDate.slice(0, 4) : '',
      url: r.collectionViewUrl,
      trackCount: r.trackCount,
    }));
}

export async function albumTracks(collectionId) {
  const json = await getJSON('/lookup', { id: String(collectionId), entity: 'song', limit: '200' });
  const results = json.results || [];
  const album = results.find((r) => r.wrapperType === 'collection');
  const tracks = results
    .filter((r) => r.wrapperType === 'track')
    .map((r) => ({
      id: r.trackId,
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName,
      artwork: artwork(r.artworkUrl100, 300),
      preview: r.previewUrl,
      durationMs: r.trackTimeMillis,
      url: r.trackViewUrl,
      disc: r.discNumber,
      track: r.trackNumber,
    }))
    .sort((a, b) => (a.disc - b.disc) || (a.track - b.track));
  return {
    album: album && { id: album.collectionId, title: album.collectionName, artist: album.artistName, artwork: artwork(album.artworkUrl100, 600), url: album.collectionViewUrl, year: album.releaseDate?.slice(0, 4) },
    tracks,
  };
}

// Albums by a composer (iTunes composerTerm search), newest first when `newest` is true.
export async function composerAlbums(composerName, { limit = 25, newest = false } = {}) {
  const json = await getJSON('/search', { term: composerName, media: 'music', entity: 'album', attribute: 'composerTerm', limit: String(limit) });
  const list = (json.results || []).filter((r) => r.collectionId).map((r) => ({
    id: r.collectionId,
    title: r.collectionName,
    artist: r.artistName,
    artwork: artwork(r.artworkUrl100, 300),
    year: r.releaseDate ? r.releaseDate.slice(0, 4) : '',
    releaseDate: r.releaseDate || '',
    url: r.collectionViewUrl,
    trackCount: r.trackCount,
  }));
  return newest ? list.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)) : list;
}

// Apple's Swiss "Classical" album chart (legacy iTunes RSS, genre 5), used for "New on Record".
export async function classicalChart(limit = 20) {
  const key = `chart:${limit}`;
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;
  await throttle();
  const res = await fetch(`https://itunes.apple.com/ch/rss/topalbums/limit=${limit}/genre=5/json`);
  if (!res.ok) throw new Error(`Apple chart unavailable (${res.status})`);
  const json = await res.json();
  const list = (json.feed?.entry || []).map((e) => ({
    id: e.id?.attributes?.['im:id'],
    title: e['im:name']?.label,
    artist: e['im:artist']?.label,
    artwork: artwork((e['im:image'] || []).slice(-1)[0]?.label, 300),
    releaseDate: e['im:releaseDate']?.label || '',
    year: (e['im:releaseDate']?.label || '').slice(0, 4),
    url: e.link?.attributes?.href || (e.id?.label || ''),
  })).filter((a) => a.id);
  cachePut(key, list);
  return list;
}

// Apple Podcasts episodes about a work (iTunes podcastEpisode search). Links open Apple Podcasts.
export async function searchPodcasts(term, limit = 6) {
  const json = await getJSON('/search', { term, media: 'podcast', entity: 'podcastEpisode', limit: String(limit) });
  return (json.results || []).map((r) => ({
    id: r.trackId,
    title: r.trackName,
    show: r.collectionName,
    artwork: r.artworkUrl160 || r.artworkUrl600 || r.artworkUrl60,
    date: (r.releaseDate || '').slice(0, 10),
    url: r.trackViewUrl,
    durationMs: r.trackTimeMillis,
    description: r.shortDescription || r.description || '',
  }));
}

export const appleMusicSearchURL = (term) => `https://music.apple.com/ch/search?term=${encodeURIComponent(term)}`;
// Apple Music Classical web links (same album IDs as Apple Music; open the Classical app on iOS)
export const classicalSearchURL = (term) => `https://classical.music.apple.com/ch/search?term=${encodeURIComponent(term)}`;
export const classicalAlbumURL = (collectionId) => `https://classical.music.apple.com/ch/album/${collectionId}`;
export const ITUNES_CREDIT = 'Recordings and 30-second previews provided courtesy of iTunes. Full tracks need an Apple Music subscription.';

export const fmtDuration = (ms) => {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ---------- preview player ----------
const listeners = new Set();
const audio = typeof Audio !== 'undefined' ? new Audio() : null;
let current = null; // track object
let queue = [];

function emit() {
  for (const fn of listeners) fn(playerState());
}

export function playerState() {
  return {
    track: current,
    playing: !!audio && !audio.paused && !!current,
    progress: audio && audio.duration ? audio.currentTime / audio.duration : 0,
    hasNext: queue.indexOf(current) >= 0 && queue.indexOf(current) < queue.length - 1,
  };
}

export const player = {
  subscribe(fn) {
    listeners.add(fn);
    fn(playerState());
    return () => listeners.delete(fn);
  },
  play(track, list = null) {
    if (!audio || !track?.preview) return;
    if (list) queue = list.filter((t) => t.preview);
    if (current?.id !== track.id) {
      current = track;
      audio.src = track.preview;
    }
    audio.play().catch(() => emit());
    emit();
  },
  toggle() {
    if (!audio || !current) return;
    if (audio.paused) audio.play().catch(() => emit());
    else audio.pause();
  },
  next() {
    const i = queue.indexOf(current);
    if (i >= 0 && i < queue.length - 1) player.play(queue[i + 1]);
  },
  stop() {
    if (!audio) return;
    audio.pause();
    current = null;
    emit();
  },
};

if (audio) {
  audio.preload = 'none';
  for (const ev of ['play', 'pause', 'timeupdate']) audio.addEventListener(ev, emit);
  audio.addEventListener('ended', () => {
    const st = playerState();
    if (st.hasNext) player.next();
    else emit();
  });
}
