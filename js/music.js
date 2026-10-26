// Apple Music via the free, keyless iTunes Search / Lookup API (country=CH).
// - searchAlbums(): recordings ("versions") of a work
// - albumTracks(): movements of a recording (track ids for deep links)
// - Klang plays no audio: Listen opens Apple Music Classical / Apple Music (applemusic.js).
//
// Apple's terms (performance-partners.apple.com/search-api): show results with a link to Apple Music.
// Search/lookup *metadata* may be cached, so responses are cached in localStorage for 7 days and calls
// are throttled under ~20 requests/minute. No audio is streamed or stored by Klang.
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
  // No media=music: with an iPhone user agent Apple answers that with a 301 to musics:// (the Music
  // app), which a web page can't follow. entity=album alone returns the same albums everywhere.
  const json = await getJSON('/search', { term, entity: 'album', limit: String(limit) });
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
      durationMs: r.trackTimeMillis,
      url: r.trackViewUrl,
      preview: r.previewUrl || null, // 30-second preview (streamed only — never cached, Apple's terms)
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
  const json = await getJSON('/search', { term: composerName, entity: 'album', attribute: 'composerTerm', limit: String(limit) });
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
export const ITUNES_CREDIT = '30-second previews provided courtesy of iTunes. Pieces play in full in Apple Music Classical or Apple Music, with your own subscription.';

export const fmtDuration = (ms) => {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ---------- 30-second previews, played inside Klang ----------
// preview.play(track, queue?)  track = an albumTracks() track (needs .preview), optionally extended with
//                              piece fields (workId, composer, collectionId…) so the UI can offer
//                              "Open in Apple Music Classical" for the same recording.
// preview.unlock()             call synchronously in a tap handler BEFORE awaiting anything (e.g. a
//                              track lookup): iOS only lets audio start from a user gesture.
// preview.toggle() / next() / stop(); preview.subscribe(fn) -> unsubscribe; previewState().
const previewListeners = new Set();
const audio = typeof Audio !== 'undefined' ? new Audio() : null;
let pvTrack = null;
let pvQueue = [];
let pvError = null;
const SILENCE = 'data:audio/mp4;base64,AAAAHGZ0eXBNNEEgAAACAE00QSBpc29taXNvMgAAAAhmcmVlAAAAG21kYXQhEAUgpBv/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export function previewState() {
  const i = pvQueue.indexOf(pvTrack);
  return {
    track: pvTrack,
    playing: !!audio && !!pvTrack && !audio.paused,
    progress: audio && audio.duration ? audio.currentTime / audio.duration : 0,
    elapsed: audio ? audio.currentTime || 0 : 0,
    duration: audio && Number.isFinite(audio.duration) ? audio.duration : 30,
    hasNext: i >= 0 && i < pvQueue.length - 1,
    next: i >= 0 ? pvQueue[i + 1] || null : null,
    error: pvError,
  };
}

function emitPreview() {
  const st = previewState();
  for (const fn of previewListeners) fn(st);
}

function mediaSession(track) {
  try {
    if (!('mediaSession' in navigator) || !track) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || '', artist: track.artist || '', album: track.album || '',
      artwork: track.artwork ? [{ src: track.artwork, sizes: '300x300', type: 'image/jpeg' }] : [],
    });
    navigator.mediaSession.setActionHandler('nexttrack', previewState().hasNext ? () => preview.next() : null);
  } catch { /* optional */ }
}

export const preview = {
  subscribe(fn) {
    previewListeners.add(fn);
    fn(previewState());
    return () => previewListeners.delete(fn);
  },
  unlock() {
    if (!audio || !audio.paused) return;
    try {
      audio.src = SILENCE;
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    } catch { /* ignore */ }
  },
  play(track, queue = null) {
    if (!audio || !track?.preview) return false;
    if (queue) pvQueue = queue.filter((t) => t && t.preview);
    if (!pvQueue.includes(track)) pvQueue = [track];
    pvError = null;
    if (pvTrack !== track || audio.src !== track.preview) {
      pvTrack = track;
      audio.src = track.preview;
    }
    const p = audio.play();
    if (p && p.catch) p.catch((err) => { pvError = err?.name || 'error'; emitPreview(); });
    mediaSession(track);
    emitPreview();
    return true;
  },
  toggle() {
    if (!audio || !pvTrack) return;
    if (audio.paused) {
      const p = audio.play();
      if (p && p.catch) p.catch(() => emitPreview());
    } else audio.pause();
  },
  next() {
    const i = pvQueue.indexOf(pvTrack);
    if (i >= 0 && i < pvQueue.length - 1) preview.play(pvQueue[i + 1]);
  },
  stop() {
    if (!audio) return;
    audio.pause();
    pvTrack = null;
    pvQueue = [];
    emitPreview();
  },
};

if (audio) {
  audio.preload = 'none';
  for (const ev of ['play', 'pause', 'timeupdate', 'loadedmetadata']) audio.addEventListener(ev, () => { if (pvTrack) emitPreview(); });
  audio.addEventListener('error', () => { if (pvTrack && audio.src === pvTrack.preview) { pvError = 'unavailable'; emitPreview(); } });
  audio.addEventListener('ended', () => {
    if (previewState().hasNext) preview.next();
    else emitPreview();
  });
}

