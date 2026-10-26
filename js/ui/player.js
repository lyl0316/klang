// Full-screen "Now playing", modelled on Sheng's player (screens player-01…05, SPEC §3.11):
// background tinted from the artwork, grabber / swipe down to close, big artwork, composer
// kicker, title, performers, ♡ (album → Library) and ••• menu (Add to library · Go to album ·
// Share Track), the "Post to your activity" tip, scrubber, transport, volume (where the browser
// allows it), and a bottom row with ⓘ (in-place track info), the composer, AirPlay and Up next.
// The first preview of a session also opens Sheng's "PREVIEW PLAYING · 30-second preview" sheet.
//
// export openPlayer()      — idempotent; opened by the mini player in main.js.
// export postedListens()   — tracks posted to your activity (newest first), read by activity.js.
//   They live on this device under POSTS_KEY; activity.js listens for the 'klang:posts' event.
//
// Notes for the integrator:
// - music.js is not modified. Its playerState() has no queue, so this module wraps
//   player.play() once (at import) to remember the list each play() call passes. Import this
//   module early (e.g. `import './ui/player.js'` in main.js) so the first queue is captured too;
//   otherwise "Up next" falls back to the album's tracks (looked up from the track's Apple URL).
// - Seeking isn't possible without the <audio> element; restart = stop() + play().
// - AirPlay (Safari only): the button shows when WebKitPlaybackTargetAvailabilityEvent exists.
//   The audio element is private to music.js, so the first transport call made from this
//   player briefly wraps HTMLMediaElement.prototype.play/pause to get a reference to it.
// - Apple terms: previews are streamed only; ITUNES_CREDIT and Apple Music links are shown.

import { h, icon, clear, toast, storage, normalize } from '../util.js';
import {
  player, playerState, albumTracks, artwork, classicalAlbumURL, classicalSearchURL, appleMusicSearchURL, ITUNES_CREDIT, fmtDuration,
} from '../music.js';
import * as store from '../store.js';
import * as repo from '../repo.js';
import { openSheet } from './sheet.js';
import { href, toggle, withFace } from './components.js';

const PREVIEW_SECONDS = 30;
const LOOP_KEY = 'klang.player.loop';
const VOLUME_KEY = 'klang.player.volume';
const POSTS_KEY = 'klang.activity.posts.v1';
const POSTS_MAX = 100;
const TIP_KEY = 'player-post-tip';
const UPSELL_KEY = 'klang.player.upsell-shown';
const AIRPLAY = typeof window !== 'undefined' && 'WebKitPlaybackTargetAvailabilityEvent' in window;
// iOS ignores HTMLMediaElement.volume (hardware buttons only): show the slider only where it works.
const VOLUME_OK = (() => {
  try {
    if (typeof Audio === 'undefined') return false;
    const a = new Audio();
    a.volume = 0.5;
    return Math.abs(a.volume - 0.5) < 0.01;
  } catch {
    return false;
  }
})();

// Glyphs util.icon lacks (same markup style).
const NP_GLYPHS = {
  postShare: '<path d="M12 14V3.5M8 7l4-4 4 4"/><path d="M8.5 10H6.5A1.5 1.5 0 0 0 5 11.5v7A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-2"/>',
  volLow: '<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" stroke="none"/>',
  volHigh: '<path d="M3 9.5h3.2L11 5.5v13l-4.8-4H3z" fill="currentColor" stroke="none"/><path d="M14.5 9a4 4 0 0 1 0 6M17 6.5a7.5 7.5 0 0 1 0 11"/>',
  album: '<path d="M8 3.6h8"/><rect x="5" y="6.8" width="14" height="13.6" rx="2.6"/>',
  airplayAudio: '<path d="M6.3 17.2a8.5 8.5 0 1 1 11.4 0"/><path d="M8.7 14.8a5 5 0 1 1 6.6 0"/><path d="M12 15.2l4.2 5.3H7.8z" fill="currentColor" stroke="none"/>',
  listBullet: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.6" cy="6.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.6" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.6" cy="17.5" r="1.2" fill="currentColor" stroke="none"/>',
  loop1: '<path d="M16.5 3l3 3-3 3"/><path d="M4.5 11V9.5A3.5 3.5 0 0 1 8 6h11.5"/><path d="M7.5 21l-3-3 3-3"/><path d="M19.5 13v1.5A3.5 3.5 0 0 1 16 18H4.5"/><path d="M11.4 10.4l1.3-.9v5" stroke-width="1.5"/>',
};
function glyph(name, size = 20) {
  if (!NP_GLYPHS[name]) return icon(name, size);
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${NP_GLYPHS[name]}</svg>`;
  return span;
}

const sameId = (a, b) => a != null && b != null && String(a) === String(b);
// Replace an element's children, skipping null/false and flattening arrays (native append
// would print "null" / "[object …]").
function fill(el, ...kids) {
  clear(el);
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k);
  return el;
}
const clamp01 = (x) => Math.max(0, Math.min(1, Number(x) || 0));
const fmtSecs = (s) => {
  const v = Math.max(0, Math.round(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
};

// ---------- queue capture (see notes above) ----------
// ---------- audio element reference (AirPlay, volume, loop) ----------
let mediaEl = null;
const savedVolume = () => {
  const v = Number(storage.get(VOLUME_KEY, 1));
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
};
function withAudio(fn) {
  const P = typeof HTMLMediaElement !== 'undefined' ? HTMLMediaElement.prototype : null;
  if (!P || mediaEl) return fn();
  const { play, pause } = P;
  const capture = (el) => {
    if (mediaEl) return;
    mediaEl = el;
    try {
      if (VOLUME_OK) el.volume = savedVolume();
      el.loop = !!storage.get(LOOP_KEY, false);
    } catch { /* ignore */ }
  };
  P.play = function capturePlay(...args) {
    capture(this);
    return play.apply(this, args);
  };
  P.pause = function capturePause(...args) {
    capture(this);
    return pause.apply(this, args);
  };
  try {
    return fn();
  } finally {
    P.play = play;
    P.pause = pause;
  }
}

let knownQueue = [];
if (!player.__klangQueueWrapped) {
  const originalPlay = player.play;
  player.play = function playAndRemember(track, list = null) {
    if (Array.isArray(list)) knownQueue = list.filter((t) => t && t.preview);
    return withAudio(() => originalPlay.call(player, track, list));
  };
  player.__klangQueueWrapped = true;
}

// ---------- album lookups (cached by music.js; resolved values kept here for sync access) ----------
const albumPromises = new Map();
const albumResolved = new Map();
const albumListeners = new Set();

function collectionIdOf(track) {
  if (!track) return null;
  if (track.collectionId) return String(track.collectionId);
  const m = /\/album\/(?:[^/?#]+\/)?(\d+)/.exec(track.url || '');
  return m ? m[1] : null;
}

// Track link "…/album/name/123?i=456&uo=4" -> album link "…/album/name/123?uo=4"
function albumURLOf(track) {
  if (!track?.url) return null;
  return track.url.replace(/([?&])i=\d+(&|$)/, (m, a, b) => (b ? a : '')).replace(/[?&]$/, '');
}

function loadAlbum(cid) {
  if (!cid) return Promise.resolve(null);
  if (!albumPromises.has(cid)) {
    albumPromises.set(cid, albumTracks(cid)
      .then((res) => {
        albumResolved.set(cid, res);
        for (const fn of albumListeners) fn(cid);
        return res;
      })
      .catch(() => {
        albumPromises.delete(cid);
        return null;
      }));
  }
  return albumPromises.get(cid);
}

// The list the current track is playing from: the captured queue, else the album's previews.
function queueFor(track) {
  if (!track) return [];
  if (knownQueue.some((t) => sameId(t.id, track.id))) return knownQueue;
  const res = albumResolved.get(collectionIdOf(track));
  const list = res ? res.tracks.filter((t) => t.preview) : [];
  if (list.some((t) => sameId(t.id, track.id))) return list;
  return [track];
}

const indexIn = (q, track) => q.findIndex((t) => sameId(t.id, track?.id));

// ---------- loop track (Sheng's "Loop track" = repeat the current preview) ----------
// Uses the audio element's own loop flag: 'ended' never fires, so music.js doesn't advance.
const loopOn = () => !!storage.get(LOOP_KEY, false);
const setLoop = (v) => {
  storage.set(LOOP_KEY, !!v);
  if (!mediaEl && playerState().track) withAudio(() => { player.toggle(); player.toggle(); });
  if (mediaEl) mediaEl.loop = !!v;
};

let suppressClose = false;
function restart(track, q) {
  const t = q.find((x) => sameId(x.id, track.id)) || track;
  suppressClose = true;
  try {
    withAudio(() => {
      player.stop();
      player.play(t, q.length ? q : null);
    });
  } finally {
    suppressClose = false;
  }
}

function playAt(q, i) {
  const t = q[i];
  if (!t) return;
  const cur = playerState().track;
  if (cur && sameId(cur.id, t.id)) restart(t, q);
  else withAudio(() => player.play(t, q));
}

// ---------- describing a track ----------
let composerIndex = null;
const tok = (s) => ` ${normalize(s || '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
function composers() {
  if (!composerIndex) {
    composerIndex = repo.allComposers().map((c) => ({
      c,
      full: tok(c.name),
      keys: [tok(c.name), tok(c.short), tok(c.short.replace(/^[A-Z]\.\s*/, '').replace(/\s+II$/, ''))].filter((k) => k.trim().length >= 3),
    }));
  }
  return composerIndex;
}

// Known composers named in `text`; a single full-name match wins over surname matches.
function composersIn(text) {
  const t = tok(text);
  if (t.trim().length < 3) return [];
  const full = composers().filter((x) => t.includes(x.full));
  if (full.length === 1) return [full[0].c];
  return composers().filter((x) => x.keys.some((k) => t.includes(k))).map((x) => x.c);
}

// The one known composer named in `text`, or null (none, or ambiguous like "Strauss").
function composerIn(text) {
  const hits = composersIn(text);
  return hits.length === 1 ? hits[0] : null;
}

function splitPerformers(artist) {
  const seen = new Set();
  return String(artist || '').split(/\s*(?:,|&|;|\/|\s\band\b\s)\s*/)
    .map((s) => s.trim()).filter((s) => s.length > 1 && !seen.has(s) && seen.add(s));
}

function describe(track) {
  const title = track.title || '';
  let composer = null;
  let composerName = track.composer || null;
  let rest = title;
  let known = null; // the repertoire work, when the preview came from a concert programme
  if (track.workId) {
    const w = repo.work(track.workId);
    known = w || null;
    const c = w && repo.composer(w.composerId);
    if (c) {
      composer = c;
      composerName = c.name;
    }
  }
  // "Massenet: Thaïs …" — strip a composer prefix (an ambiguous "Strauss:" stays as written)
  const m = /^([^:]{2,48}):\s+(.+)$/.exec(title);
  if (m && tok(m[1]).trim().split(' ').length <= 4) {
    const hits = composersIn(m[1]);
    if (hits.length) {
      if (hits.length === 1) composer = composer || hits[0];
      composerName = composerName || (hits.length === 1 ? hits[0].name : m[1].trim());
      rest = m[2];
    }
  }
  if (!composerName) {
    const am = /^([^:]{2,48}):/.exec(track.album || '');
    const c = (am && composerIn(am[1])) || composerIn(`${title} ${track.album || ''}`);
    if (c) {
      composer = c;
      composerName = c.name;
    }
  }
  let work = rest;
  let movement = null;
  const i = rest.indexOf(': ');
  if (i > 0) {
    work = rest.slice(0, i).trim();
    movement = rest.slice(i + 2).trim() || null;
  }
  if (known) work = known.title;
  return { composer, composerName, work, movement, performers: splitPerformers(track.artist) };
}

// ---------- artwork tint ----------
const tintCache = new Map();
function hslOf(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) hue = ((b - r) / d + 2) * 60;
    else hue = ((r - g) / d + 4) * 60;
  }
  return [hue, s, l];
}

function tintFrom(r, g, b) {
  const [hue, s, l] = hslOf(r, g, b);
  const sat = Math.min(s, 0.5) * 100;
  const light = Math.max(0.16, Math.min(0.3, l * 0.6)) * 100;
  return {
    c1: `hsl(${hue.toFixed(0)}, ${sat.toFixed(0)}%, ${light.toFixed(0)}%)`,
    c2: `hsl(${hue.toFixed(0)}, ${(sat * 0.85).toFixed(0)}%, ${(light * 0.5).toFixed(0)}%)`,
    menu: `hsla(${hue.toFixed(0)}, ${Math.min(sat, 30).toFixed(0)}%, ${(light + 12).toFixed(0)}%, 0.94)`,
  };
}

// Average colour of the artwork via a tiny canvas (CORS-enabled small rendition; null if tainted).
function artTint(url) {
  if (!url) return Promise.resolve(null);
  const small = artwork(url, 60) || url;
  if (tintCache.has(small)) return tintCache.get(small);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 6000);
    img.onload = () => {
      clearTimeout(timer);
      try {
        const n = 12;
        const canvas = document.createElement('canvas');
        canvas.width = n;
        canvas.height = n;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, n, n);
        const d = ctx.getImageData(0, 0, n, n).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let k = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 128) continue;
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
          k += 1;
        }
        resolve(k ? tintFrom(r / k, g / k, b / k) : null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = small;
  });
  tintCache.set(small, p);
  return p;
}

// ---------- "Post to your activity" (your own timeline, on this device) ----------
export function postedListens() {
  const v = storage.get(POSTS_KEY, []);
  return Array.isArray(v) ? v.filter((p) => p && p.trackId != null && p.at) : [];
}

function postListen(track, meta) {
  const list = postedListens().filter((p) => String(p.trackId) !== String(track.id));
  list.unshift({
    trackId: track.id, title: track.title || '', artist: track.artist || '', artwork: track.artwork || '',
    preview: track.preview || '', url: track.url || '', album: track.album || '', collectionId: collectionIdOf(track),
    composer: meta?.composerName || '', work: meta?.work || '', at: new Date().toISOString(),
  });
  if (list.length > POSTS_MAX) list.length = POSTS_MAX;
  const ok = storage.set(POSTS_KEY, list);
  window.dispatchEvent(new CustomEvent('klang:posts'));
  return ok;
}

// ---------- "PREVIEW PLAYING" sheet (player-01): once per session, when the first preview starts ----------
let upsellShown = (() => {
  try { return sessionStorage.getItem(UPSELL_KEY) === '1'; } catch { return false; }
})();
function maybeUpsell(st) {
  if (upsellShown || !st.playing || !st.track) return;
  upsellShown = true;
  try { sessionStorage.setItem(UPSELL_KEY, '1'); } catch { /* ignore */ }
  const t = st.track;
  let sheet = null;
  const body = h('div', { class: 'np-upsell-body' },
    h('div', { class: 'np-upsell-k' }, 'Preview playing'),
    h('h2', { class: 'np-upsell-t' }, `${PREVIEW_SECONDS}-second preview`),
    h('p', { class: 'np-upsell-p' }, `A ${PREVIEW_SECONDS}-second preview is playing. Open Apple Music to play full tracks with your own subscription.`),
    h('a', {
      class: 'btn primary block np-upsell-cta', href: t.url || appleMusicSearchURL(`${t.title || ''} ${t.artist || ''}`.trim()),
      target: '_blank', rel: 'noopener', onclick: () => sheet?.close(),
    }, 'Open in Apple Music'),
    h('button', { class: 'np-upsell-skip', type: 'button', onclick: () => sheet?.close() }, 'Just browse concerts'));
  const playerOpen = !!ui;
  sheet = openSheet({
    title: `${PREVIEW_SECONDS}-second preview`,
    body,
    onClose: () => {
      if (playerOpen && ui) document.body.style.overflow = 'hidden';
    },
  });
  sheet.el.classList.add('np-upsell');
}

// ---------- the player ----------
let ui = null;
player.subscribe(maybeUpsell);

export function openPlayer() {
  if (ui) {
    ui.focus();
    return ui;
  }
  if (!playerState().track) {
    toast('Nothing playing — open a concert or work and tap Listen');
    return null;
  }
  ui = createPlayer();
  return ui;
}

function createPlayer() {
  const prevFocus = document.activeElement;
  const scrollY = window.scrollY;
  const prevOverflow = document.body.style.overflow;

  let track = null;
  let meta = null;
  let info = false;
  let closed = false;
  let queueSheet = null;
  let repaintQueue = null;
  let tintToken = 0;
  let unsubPlayer = () => {};
  let unsubStore = () => {};

  // --- elements ---
  // Sheng shows only the grabber at the top (tap or swipe down to close).
  const grab = h('button', { class: 'np-grab', type: 'button', 'aria-label': 'Close player', onclick: () => close() });
  const art = h('div', { class: 'np-art' });
  const artWrap = h('div', { class: 'np-art-wrap' }, art);
  const thumb = h('div', { class: 'np-thumb' });
  const kicker = h('div', { class: 'np-kicker' });
  const titleEl = h('div', { class: 'np-title' });
  const moveEl = h('div', { class: 'np-move' });
  const perfEl = h('div', { class: 'np-perf' });
  const heart = h('button', { class: 'np-icon', type: 'button', onclick: toggleHeart });
  const moreBtn = h('button', {
    class: 'np-icon', type: 'button', 'aria-label': 'More', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
    onclick: () => toggleMenu(),
  }, icon('more', 22));
  const textCol = h('div', { class: 'np-text' }, kicker, titleEl, moveEl, perfEl);
  const metaRow = h('div', { class: 'np-meta' }, thumb, textCol, h('div', { class: 'np-acts' }, heart, moreBtn));
  const infoBox = h('div', { class: 'np-info' });
  const tipSlot = h('div', { class: 'np-tip-slot' });
  const bar = h('i');
  const barWrap = h('div', { class: 'np-bar', role: 'progressbar', 'aria-label': 'Preview position', 'aria-valuemin': '0', 'aria-valuemax': String(PREVIEW_SECONDS) }, bar);
  const tNow = h('span', {}, '0:00');
  const tLeft = h('span', {}, `-${fmtSecs(PREVIEW_SECONDS)}`);
  const scrub = h('div', { class: 'np-scrub' }, barWrap, h('div', { class: 'np-times' }, tNow, tLeft));
  const prevBtn = h('button', { class: 'np-tbtn', type: 'button', 'aria-label': 'Previous or restart', onclick: prev }, icon('rewind', 30));
  const playBtn = h('button', { class: 'np-tbtn big', type: 'button', onclick: () => withAudio(() => player.toggle()) });
  const nextBtn = h('button', { class: 'np-tbtn', type: 'button', 'aria-label': 'Next', onclick: next }, icon('forward', 30));
  const transport = h('div', { class: 'np-transport' }, prevBtn, playBtn, nextBtn);
  let volume = null;
  if (VOLUME_OK) {
    const range = h('input', { type: 'range', min: '0', max: '1', step: '0.01', value: String(savedVolume()), 'aria-label': 'Volume' });
    const paintRange = () => range.style.setProperty('--v', `${Math.round(Number(range.value) * 100)}%`);
    range.addEventListener('input', () => {
      const v = Number(range.value);
      storage.set(VOLUME_KEY, v);
      if (!mediaEl && playerState().track) withAudio(() => { player.toggle(); player.toggle(); });
      if (mediaEl) mediaEl.volume = v;
      paintRange();
    });
    paintRange();
    volume = h('div', { class: 'np-volume' }, glyph('volLow', 16), range, glyph('volHigh', 18));
  }
  const credit = h('p', { class: 'np-credit' });
  const infoBtn = h('button', { class: 'np-icon', type: 'button', 'aria-label': 'Track info', 'aria-pressed': 'false', onclick: toggleInfo }, icon('info', 22));
  const composerSlot = h('span', { class: 'np-composer-slot' });
  const airBtn = AIRPLAY ? h('button', { class: 'np-icon', type: 'button', 'aria-label': 'AirPlay', onclick: airplay }, glyph('airplayAudio', 23)) : null;
  const queueBtn = h('button', { class: 'np-icon', type: 'button', 'aria-label': 'Up next', onclick: openQueue }, glyph('listBullet', 23));
  const bottom = h('div', { class: 'np-bottom' }, infoBtn, composerSlot, airBtn, queueBtn);
  const menuEl = h('div', { class: 'np-menu', role: 'menu', hidden: true });
  const top = h('div', { class: 'np-top' }, grab);
  const inner = h('div', { class: 'np-inner' }, top, artWrap, metaRow, tipSlot, infoBox, scrub, transport, volume, credit, bottom, menuEl);
  const root = h('div', { class: 'np', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Now playing', tabindex: '-1' }, inner);

  document.body.append(root);
  document.body.style.overflow = 'hidden';
  root.getBoundingClientRect(); // commit the off-screen position so the slide-up animates
  requestAnimationFrame(() => root.classList.add('open'));

  // --- painting ---
  function albumObj() {
    const cid = collectionIdOf(track);
    if (!cid) return null;
    const a = albumResolved.get(cid)?.album;
    return {
      id: cid,
      title: a?.title || track.album || track.title,
      artist: a?.artist || track.artist,
      artwork: a?.artwork || artwork(track.artwork, 600),
      url: a?.url || albumURLOf(track),
      year: a?.year || '',
    };
  }

  function paintHeart() {
    const a = albumObj();
    heart.hidden = !a;
    const on = !!a && store.hasAlbum(a.id);
    heart.classList.toggle('on', on);
    heart.setAttribute('aria-pressed', on ? 'true' : 'false');
    heart.setAttribute('aria-label', on ? 'Remove album from Library' : 'Add album to Library');
    heart.replaceChildren(icon('heart', 22));
  }

  function toggleHeart() {
    const a = albumObj();
    if (!a) return;
    const added = store.toggleAlbum(a);
    toast(added ? 'Album added to your Library' : 'Album removed from your Library');
    paintHeart();
  }

  function field(k, v, cls = null) {
    return h('div', { class: ['np-field', cls] }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v));
  }

  function paintInfo() {
    const res = albumResolved.get(collectionIdOf(track));
    const discTracks = res ? res.tracks.filter((t) => (t.disc || 1) === (track.disc || 1)) : [];
    const discs = res ? new Set(res.tracks.map((t) => t.disc || 1)).size : 0;
    const trackNo = track.track
      ? `${track.track}${discTracks.length ? `/${discTracks.length}` : ''}${discs > 1 || (track.disc || 1) > 1 ? ` · Disc ${track.disc || 1}` : ''}`
      : null;
    const composerLink = meta.composer
      ? h('a', { href: href.composer(meta.composer.id), onclick: () => close({ navigating: true }) }, meta.composerName)
      : meta.composerName;
    fill(infoBox,
      field('Track', track.title || '—', 'main'),
      meta.composerName ? field('Composer', composerLink) : null,
      meta.performers.length ? field('Performers', h('div', { class: 'np-chips' }, meta.performers.map((p) =>
        h('a', { class: 'np-chip', href: appleMusicSearchURL(p), target: '_blank', rel: 'noopener', 'aria-label': `${p} in Apple Music` }, p, icon('chevron', 12))))) : null,
      meta.work && meta.work !== track.title ? field('Work', meta.work) : null,
      field('Album', res?.album?.title || track.album || '—'),
      trackNo ? field('Track no.', trackNo) : null);
  }

  function paintComposer() {
    clear(composerSlot);
    if (!meta.composer) return;
    composerSlot.append(withFace(h('a', {
      class: 'np-composer', href: href.composer(meta.composer.id), 'aria-label': `About ${meta.composer.name}`,
      onclick: () => close({ navigating: true }),
    }), meta.composer.name, meta.composer.id));
  }

  // Sheng's tip under ♡ / •••: "Post to your activity" (share glyph) with a dismiss ×.
  function paintTip() {
    clear(tipSlot);
    if (store.isDismissed(TIP_KEY)) return;
    const posted = postedListens().some((p) => String(p.trackId) === String(track.id));
    const pill = h('div', { class: ['np-tip', posted && 'done'] },
      h('button', {
        type: 'button', class: 'np-tip-main', disabled: posted,
        onclick: () => {
          if (postListen(track, meta)) {
            toast('Posted to your activity');
            paintTip();
          } else toast('Couldn’t save on this device');
        },
      }, posted ? icon('check', 14) : glyph('postShare', 15), posted ? 'Posted to your activity' : 'Post to your activity'),
      h('button', {
        type: 'button', class: 'np-tip-x', 'aria-label': 'Dismiss tip',
        onclick: () => {
          store.dismiss(TIP_KEY);
          clear(tipSlot);
        },
      }, icon('close', 12)));
    tipSlot.append(pill);
  }

  function paintCredit() {
    const cid = collectionIdOf(track);
    const term = `${meta.work || track.title} ${track.artist || ''}`.trim();
    fill(credit, ITUNES_CREDIT, ' ',
      h('a', { href: track.url || appleMusicSearchURL(term), target: '_blank', rel: 'noopener' }, 'Open in Apple Music'), ' · ',
      h('a', { href: cid ? classicalAlbumURL(cid) : classicalSearchURL(term), target: '_blank', rel: 'noopener' }, 'Apple Music Classical'));
  }

  function paintTint() {
    const token = ++tintToken;
    artTint(track.artwork).then((t) => {
      if (closed || token !== tintToken) return;
      if (t) {
        root.style.setProperty('--np-c1', t.c1);
        root.style.setProperty('--np-c2', t.c2);
        root.style.setProperty('--np-menu', t.menu);
      } else {
        root.style.removeProperty('--np-c1');
        root.style.removeProperty('--np-c2');
        root.style.removeProperty('--np-menu');
      }
    });
  }

  function paintTrack() {
    meta = describe(track);
    const big = artwork(track.artwork, 600) || track.artwork;
    clear(art).append(big ? h('img', { src: big, alt: `Cover of ${track.album || track.title}` }) : icon('music', 56));
    clear(thumb).append(track.artwork ? h('img', { src: track.artwork, alt: '' }) : icon('music', 22));
    kicker.textContent = meta.composerName || 'Preview';
    titleEl.textContent = meta.work || track.title || '';
    titleEl.title = track.title || '';
    moveEl.textContent = meta.movement || '';
    perfEl.textContent = track.artist || '';
    paintHeart();
    paintInfo();
    paintComposer();
    paintTip();
    paintCredit();
    paintTint();
    toggleMenu(false);
    const cid = collectionIdOf(track);
    if (cid && !albumResolved.has(cid)) loadAlbum(cid);
    repaintQueue?.();
  }

  function paintState(st) {
    root.classList.toggle('paused', !st.playing);
    playBtn.replaceChildren(icon(st.playing ? 'pause' : 'play', 40));
    playBtn.setAttribute('aria-label', st.playing ? 'Pause' : 'Play');
    const q = queueFor(track);
    const i = indexIn(q, track);
    const canNext = st.hasNext || (i >= 0 && i < q.length - 1);
    nextBtn.disabled = !canNext;
    const p = clamp01(st.progress);
    const secs = p * PREVIEW_SECONDS;
    bar.style.width = `${(p * 100).toFixed(2)}%`;
    barWrap.setAttribute('aria-valuenow', String(Math.round(secs)));
    tNow.textContent = fmtSecs(secs);
    tLeft.textContent = `-${fmtSecs(PREVIEW_SECONDS - secs)}`;
  }

  // --- transport ---
  function prev() {
    const st = playerState();
    if (!track) return;
    const q = queueFor(track);
    const i = indexIn(q, track);
    if (clamp01(st.progress) * PREVIEW_SECONDS > 3 || i <= 0) restart(track, q);
    else playAt(q, i - 1);
  }

  function next() {
    const st = playerState();
    if (!track) return;
    if (st.hasNext) {
      withAudio(() => player.next());
      return;
    }
    const q = queueFor(track);
    const i = indexIn(q, track);
    if (i >= 0 && i < q.length - 1) playAt(q, i + 1);
  }

  function airplay() {
    if (!mediaEl && playerState().track) {
      withAudio(() => {
        player.toggle();
        player.toggle();
      });
    }
    if (mediaEl && typeof mediaEl.webkitShowPlaybackTargetPicker === 'function') mediaEl.webkitShowPlaybackTargetPicker();
    else toast('AirPlay isn’t available in this browser');
  }

  // --- info mode ---
  function toggleInfo() {
    info = !info;
    root.classList.toggle('info', info);
    infoBtn.setAttribute('aria-pressed', info ? 'true' : 'false');
    if (info) paintInfo();
    root.scrollTop = 0;
  }

  // --- ••• menu ---
  function onOutside(e) {
    if (!menuEl.contains(e.target) && !moreBtn.contains(e.target)) toggleMenu(false);
  }

  function menuItem(ic, label, { sub = null, onClick = null, url = null } = {}) {
    const content = [glyph(ic, 18), h('span', { class: 'grow' }, label, sub ? h('small', {}, sub) : null)];
    if (url) {
      return h('a', { class: 'np-mi', role: 'menuitem', href: url, target: '_blank', rel: 'noopener', onclick: () => toggleMenu(false) }, content);
    }
    return h('button', { class: 'np-mi', role: 'menuitem', type: 'button', onclick: () => { toggleMenu(false); onClick?.(); } }, content);
  }

  // Sheng's ••• menu: Add to library · Go to album · Share Track (with the current position).
  // Apple Music links stay in the credit line under the controls and on the album sheet.
  function paintMenu() {
    const a = albumObj();
    const inLib = !!a && store.hasAlbum(a.id);
    const cid = collectionIdOf(track);
    const term = `${meta.work || track.title} ${track.artist || ''}`.trim();
    fill(menuEl,
      a ? menuItem(inLib ? 'minus' : 'plus', inLib ? 'Remove from library' : 'Add to library', { onClick: toggleHeart }) : null,
      a ? menuItem('album', 'Go to album', { onClick: goToAlbum })
        : menuItem('album', 'Go to album', { url: cid ? classicalAlbumURL(cid) : classicalSearchURL(term) }),
      h('div', { class: 'np-msep', role: 'separator' }),
      menuItem('share', 'Share Track', { sub: fmtSecs(clamp01(playerState().progress) * PREVIEW_SECONDS), onClick: shareTrack }));
  }

  // The album's own sheet (tracks as previews, Apple Music links) opens over the player.
  function goToAlbum() {
    const a = albumObj();
    if (!a) return;
    import('../views/library.js').then((m) => {
      if (closed) return;
      const sheet = m.openAlbumSheet(a);
      if (!sheet?.el) return;
      // the sheet resets body scrolling when it closes; keep the page behind the player still
      const mo = new MutationObserver(() => {
        if (sheet.el.isConnected) return;
        mo.disconnect();
        if (!closed) document.body.style.overflow = 'hidden';
      });
      mo.observe(document.body, { childList: true });
    }).catch((err) => {
      console.error(err);
      window.open(a.url || classicalAlbumURL(a.id), '_blank', 'noopener');
    });
  }

  function toggleMenu(force) {
    const open = force === undefined ? menuEl.hidden : !!force;
    if (!open) {
      if (!menuEl.hidden) {
        menuEl.hidden = true;
        moreBtn.setAttribute('aria-expanded', 'false');
      }
      document.removeEventListener('click', onOutside, true);
      return;
    }
    paintMenu();
    const r = moreBtn.getBoundingClientRect();
    const ir = inner.getBoundingClientRect();
    menuEl.style.top = `${r.bottom - ir.top + 6}px`;
    menuEl.style.right = `${Math.max(8, ir.right - r.right)}px`;
    menuEl.hidden = false;
    moreBtn.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onOutside, true);
    menuEl.querySelector('.np-mi')?.focus({ preventScroll: true });
  }

  async function shareTrack() {
    const url = track.url || appleMusicSearchURL(`${track.title} ${track.artist || ''}`);
    const text = `${meta.composerName ? `${meta.composerName}: ` : ''}${track.title}${track.artist ? ` — ${track.artist}` : ''}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: track.title, text, url });
      } catch {
        /* cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast('Link copied');
    } catch {
      toast('Couldn’t copy the link');
    }
  }

  // --- Up next ---
  function qRow(t, q, isNow) {
    const st = playerState();
    const thumbEl = t.artwork ? h('img', { src: t.artwork, alt: '' }) : h('span', { class: 'ph' }, icon('music', 16));
    const textEl = h('span', { class: 'grow' }, h('span', { class: 't' }, t.title), h('span', { class: 's' }, t.artist || ''));
    if (isNow) {
      // Sheng: equalizer on the left, the artwork on the right
      return h('div', { class: 'np-qrow now' },
        h('span', { class: ['np-eq', st.playing && 'on'], role: 'img', 'aria-label': st.playing ? 'Playing' : 'Paused' }, h('i'), h('i'), h('i')),
        textEl, thumbEl);
    }
    return h('button', { class: 'np-qrow', type: 'button', onclick: () => playAt(q, indexIn(q, t)) },
      thumbEl, textEl, h('span', { class: 'd' }, fmtDuration(t.durationMs)));
  }

  function openQueue() {
    if (queueSheet || !track) return;
    toggleMenu(false);
    const body = h('div', { class: 'np-queue' });
    let unsub = null;
    const paintQ = () => {
      if (!track) return;
      const q = queueFor(track);
      const i = indexIn(q, track);
      const after = i >= 0 ? q.slice(i + 1) : [];
      fill(body,
        h('div', { class: 'np-loop' },
          glyph('loop1', 24),
          h('div', { class: 'grow' }, h('div', { class: 't' }, 'Loop track')),
          toggle(loopOn(), (v) => {
            setLoop(v);
            paintState(playerState());
            paintQ();
          }, 'Loop track')),
        h('h3', { class: 'np-qlabel' }, 'Now playing'),
        qRow(track, q, true),
        after.length
          ? [h('h3', { class: 'np-qlabel' }, `Up next · ${after.length}`), after.map((t) => qRow(t, q, false))]
          : h('p', { class: 'np-qempty' }, loopOn()
            ? 'Loop track is on — this preview repeats.'
            : 'Nothing else queued. Pick a recording on a work or concert page and tap Listen.'));
    };
    queueSheet = openSheet({
      title: 'Up next',
      body,
      closeLabel: 'Done',
      footer: h('p', { class: 'np-credit in-sheet' }, ITUNES_CREDIT),
      onClose: () => {
        unsub?.();
        queueSheet = null;
        repaintQueue = null;
        if (!closed) document.body.style.overflow = 'hidden';
      },
    });
    queueSheet.el.classList.add('np-qsheet');
    repaintQueue = paintQ;
    let sig = '';
    unsub = player.subscribe((st) => {
      if (!st.track) return;
      const s = `${st.track.id}|${st.playing}|${st.hasNext}`;
      if (s === sig) return;
      sig = s;
      paintQ();
    });
  }

  // --- swipe down to close ---
  let drag = null;
  root.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || root.scrollTop > 0) return;
    if (e.target.closest('button:not(.np-grab), a, input, select, .np-bar, .np-menu, .np-info')) return;
    drag = { y: e.touches[0].clientY, dy: 0 };
  }, { passive: true });
  root.addEventListener('touchmove', (e) => {
    if (!drag) return;
    drag.dy = Math.max(0, e.touches[0].clientY - drag.y);
    if (drag.dy > 4) {
      root.classList.add('dragging');
      root.style.transform = `translateY(${drag.dy}px)`;
    }
  }, { passive: true });
  const endDrag = () => {
    if (!drag) return;
    const { dy } = drag;
    drag = null;
    root.classList.remove('dragging');
    root.style.transform = '';
    if (dy > 110) close();
  };
  root.addEventListener('touchend', endDrag);
  root.addEventListener('touchcancel', endDrag);

  // --- keyboard, navigation ---
  function onKey(e) {
    if (e.key !== 'Escape' || queueSheet) return;
    if (!menuEl.hidden) toggleMenu(false);
    else close();
  }
  const onHash = () => close({ navigating: true });
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', onHash);

  // --- live updates ---
  unsubPlayer = player.subscribe((st) => {
    if (closed) return;
    if (!st.track) {
      if (!suppressClose) close();
      return;
    }
    if (!track || !sameId(st.track.id, track.id)) {
      track = st.track;
      paintTrack();
    } else {
      track = st.track; // same preview restarted (maybe another copy of the track object)
    }
    paintState(st);
  });
  unsubStore = store.subscribe((topic) => {
    if (closed) return;
    if (topic === 'library') paintHeart();
  });
  const onAlbum = (cid) => {
    if (closed || !track || cid !== collectionIdOf(track)) return;
    paintHeart();
    if (info) paintInfo();
    paintState(playerState());
    repaintQueue?.();
  };
  albumListeners.add(onAlbum);

  function close({ navigating = false } = {}) {
    if (closed) return;
    closed = true;
    toggleMenu(false);
    queueSheet?.close();
    unsubPlayer();
    unsubStore();
    albumListeners.delete(onAlbum);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', onHash);
    root.classList.remove('open');
    document.body.style.overflow = prevOverflow;
    if (!navigating) {
      window.scrollTo(0, scrollY);
      if (prevFocus && typeof prevFocus.focus === 'function' && prevFocus.isConnected) prevFocus.focus({ preventScroll: true });
    }
    setTimeout(() => root.remove(), 340);
    ui = null;
  }

  const api = {
    el: root,
    close: () => close(),
    focus: () => grab.focus({ preventScroll: true }),
  };
  requestAnimationFrame(() => grab.focus({ preventScroll: true }));
  return api;
}
