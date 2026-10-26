// Listening, the free way: Klang plays no audio itself. Every Listen / Play opens the piece, or the
// whole album, in Apple Music Classical (or Apple Music, chosen in Me), which plays it in full with
// the listener's own subscription. The links are Apple's universal links: tapped on an iPhone they
// open the app; elsewhere they open Apple's web player.
//
// Also keeps "Now listening" on this device: the piece Klang last sent to Apple Music and the rest of
// a Play-all run, which the dock's mini player shows (tap ⏭ to open the next piece).
//
// A "piece" is one work in one recording, or a whole album (kind 'album'):
// { id, kind: 'piece' | 'album', title, composer, workId, artist, album, collectionId, trackId, artwork, year }

import { h, storage } from './util.js';
import * as store from './store.js';

const KEY = 'klang.listening.v1';
const QUEUE_MAX = 60;
const HOST = { classical: 'https://classical.music.apple.com', music: 'https://music.apple.com' };

export const PLAY_APPS = [['classical', 'Apple Music Classical'], ['music', 'Apple Music']];
export const playApp = () => (store.pref('playIn') === 'music' ? 'music' : 'classical');
export const playAppName = (app = playApp()) => (app === 'music' ? 'Apple Music' : 'Apple Music Classical');

export const APPLE_CREDIT = 'Recording details come from Apple’s iTunes Search API. Pieces play in full in Apple Music Classical or Apple Music, with your own subscription.';

// ---------- links ----------
export function albumURL(collectionId, trackId = null, app = playApp()) {
  const q = trackId != null && trackId !== '' ? `?i=${encodeURIComponent(trackId)}` : '';
  return `${HOST[app]}/ch/album/${encodeURIComponent(collectionId)}${q}`;
}

export function searchURL(term, app = playApp()) {
  return `${HOST[app]}/ch/search?term=${encodeURIComponent(term)}`;
}

export function pieceURL(p, app = playApp()) {
  if (p && p.collectionId) return albumURL(p.collectionId, p.kind === 'album' ? null : p.trackId, app);
  return searchURL([p?.composer, p?.title, p?.artist].filter(Boolean).join(' '), app);
}

// ---------- pieces ----------
export function pieceId(p) {
  if (p.kind === 'album') return `album:${p.collectionId}`;
  return `piece:${p.collectionId || 'search'}:${p.trackId ?? p.workId ?? p.title}`;
}

// A whole work in one recording keeps one id whether or not its first track is known yet, so saving
// it before and after the track lookup is the same piece (single movements keep their track ids).
export const workPieceId = (collectionId, workId) => `piece:${collectionId || 'search'}:${workId}`;

export function makePiece(fields) {
  const p = {
    kind: 'piece', title: '', composer: null, workId: null, artist: '', album: '',
    collectionId: null, trackId: null, artwork: null, year: '',
    ...fields,
  };
  p.id = fields.id || pieceId(p);
  return p;
}

// An album from searchAlbums()/albumTracks()/composerAlbums() as a whole-album piece.
export function albumPiece(album, extra = {}) {
  return makePiece({
    kind: 'album', title: album.title, artist: album.artist || '', album: album.title,
    collectionId: album.id ?? album.collectionId, artwork: album.artwork || null, year: album.year || '', ...extra,
  });
}

// A work as recorded on an album: `firstTrack` (optional) is the first movement's track.
export function workPiece(work, composerName, album, firstTrack = null) {
  return makePiece({
    ...(work.id ? { id: workPieceId(album?.id, work.id) } : {}),
    title: work.title, composer: composerName || null, workId: work.id || null,
    artist: album?.artist || firstTrack?.artist || '', album: album?.title || firstTrack?.album || '',
    collectionId: album?.id ?? null, trackId: firstTrack?.id ?? null,
    artwork: album?.artwork || firstTrack?.artwork || null, year: album?.year || '',
  });
}

// Plain data only (pieces are stored and compared by id).
const plain = (p) => {
  const out = {};
  for (const k of ['id', 'kind', 'title', 'composer', 'workId', 'artist', 'album', 'collectionId', 'trackId', 'artwork', 'year']) {
    if (p[k] != null && p[k] !== '') out[k] = p[k];
  }
  if (!out.kind) out.kind = 'piece';
  if (!out.id) out.id = pieceId(out);
  return out;
};
export const toPlain = plain;

// ---------- now listening ----------
const listeners = new Set();
let state = load();

function load() {
  const v = storage.get(KEY, null);
  return v && Array.isArray(v.queue) ? v : { queue: [], index: -1, at: null };
}

function save() {
  storage.set(KEY, state);
  const snap = listening();
  for (const fn of listeners) fn(snap);
}

export function listening() {
  const current = state.queue[state.index] || null;
  return { current, queue: [...state.queue], index: state.index, next: state.queue[state.index + 1] || null, at: state.at };
}

export function onListening(fn) {
  listeners.add(fn);
  fn(listening());
  return () => listeners.delete(fn);
}

export function clearListening() {
  state = { queue: [], index: -1, at: null };
  save();
}

// Record that queue[index] was just sent to Apple Music (and log it on the personal timeline).
export function noteOpened(queue, index = 0) {
  const all = (queue || []).filter(Boolean).map(plain);
  if (!all.length) return;
  // Long queues (box sets have 100+ tracks) keep a window around the piece being opened.
  const i = Math.max(0, Math.min(index, all.length - 1));
  const from = Math.max(0, Math.min(i - 10, all.length - QUEUE_MAX));
  const q = all.slice(from, from + QUEUE_MAX);
  state = { queue: q, index: i - from, at: new Date().toISOString() };
  save();
  store.logListen(state.queue[state.index], playAppName());
}

// A lookup finished after the tap (e.g. the 2nd work of a programme resolved its recording): upgrade
// matching queue entries that were still search links, so the mini player's ⏭ opens the real piece.
export function refineQueued(piece) {
  if (!piece?.collectionId || !state.queue.length) return;
  const p = plain(piece);
  let changed = false;
  state.queue = state.queue.map((q) => {
    if (q.collectionId || !p.workId || q.workId !== p.workId) return q;
    changed = true;
    return p;
  });
  if (changed) save();
}

// The way to play something: a real <a> link, so that on an iPhone the tap itself hands the URL to
// the Music / Classical app. The click only records Now listening. Pass queue + index to make the
// link part of a Play-all run (the mini player then offers the next piece).
export function listenLink(piece, children, { cls = '', queue = null, index = 0, label = null, onOpen = null } = {}) {
  return h('a', {
    class: cls,
    href: pieceURL(piece),
    target: '_blank',
    rel: 'noopener',
    'aria-label': label || `Play ${piece.title} in ${playAppName()}`,
    onclick: (e) => {
      e.stopPropagation();
      noteOpened(queue || [piece], queue ? index : 0);
      onOpen?.(piece);
    },
  }, children);
}

// For a tap that can't be a link (e.g. the mini player's ⏭). Call it synchronously from the tap:
// iOS only hands a URL to the app while the tap is still being handled.
export function openPiece(piece, queue = null, index = 0) {
  noteOpened(queue || [piece], queue ? index : 0);
  window.open(pieceURL(piece), '_blank', 'noopener');
}

export function openNext() {
  const L = listening();
  if (!L.next) return false;
  openPiece(L.next, L.queue, L.index + 1);
  return true;
}
