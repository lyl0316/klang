// "Now listening" — a full-height view in Sheng's player style (tinted from the artwork, grabber /
// swipe down to close, big artwork, composer kicker, title, performers), opened from the dock's mini
// player. Klang plays no audio itself: this shows the piece last sent to Apple Music Classical /
// Apple Music (applemusic.js keeps it, with the rest of a Play-all run) and offers
//   ▶ Play in <app>  — open the piece again (a real link: on an iPhone the tap opens the app)
//   Save             — Library → Albums and/or one of your playlists (ui/save.js)
//   Whole album      — the recording's album, start to finish
//   Up next          — the rest of a Play-all run, each a link of its own
//   Clear            — forget Now listening
// Listens are logged on your timeline automatically (applemusic.noteOpened → store.logListen).
//
// export openPlayer()     — idempotent; opened by the mini player in main.js (and the Assistant).
// export postedListens()  — listens posted from the old in-app player (read-only, newest
//   first); activity.js still shows them. New listens live on the timeline instead.

import { h, icon, clear, toast, storage, normalize } from '../util.js';
import { artwork } from '../music.js';
import {
  listening, onListening, clearListening, listenLink, makePiece, albumURL, searchURL, playApp, playAppName, APPLE_CREDIT,
} from '../applemusic.js';
import * as store from '../store.js';
import * as repo from '../repo.js';
import { openSaveSheet } from './save.js';
import { href, withFace } from './components.js';

const POSTS_KEY = 'klang.activity.posts.v1';

// ---------- listens posted by the old player (kept read-only for activity.js) ----------
export function postedListens() {
  const v = storage.get(POSTS_KEY, []);
  return Array.isArray(v) ? v.filter((p) => p && p.trackId != null && p.at) : [];
}

// ---------- helpers ----------
// Replace an element's children, skipping null/false and flattening arrays.
function fill(el, ...kids) {
  clear(el);
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k);
  return el;
}

// A link that was just tapped must stay in the page until the tap has handed its URL over, so
// repaints caused by the tap (Now listening changes) wait for the next task.
const later = (fn) => setTimeout(fn, 0);

function composerOf(p) {
  const w = p.workId ? repo.work(p.workId) : null;
  const byWork = w ? repo.composer(w.composerId) : null;
  if (byWork) return byWork;
  if (!p.composer) return null;
  const n = normalize(p.composer);
  return repo.allComposers().find((c) => normalize(c.name) === n) || null;
}

function savedSomewhere(p) {
  if (p.collectionId && store.hasAlbum(p.collectionId)) return true;
  return store.userPlaylists().some((pl) => store.isInPlaylist(pl.id, p.id));
}

const wholeAlbum = (p) => makePiece({
  kind: 'album', title: p.album || p.title, composer: p.composer, artist: p.artist, album: p.album || p.title,
  collectionId: p.collectionId, artwork: p.artwork, year: p.year,
});

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

// ---------- the view ----------
let ui = null;

export function openPlayer() {
  if (ui) {
    ui.focus();
    return ui;
  }
  if (!listening().current) {
    toast(`Nothing playing — tap Listen on a work or concert to play it in ${playAppName()}`);
    return null;
  }
  ui = createView();
  return ui;
}

function createView() {
  const prevFocus = document.activeElement;
  const scrollY = window.scrollY;
  const prevOverflow = document.body.style.overflow;
  let L = listening();
  let closed = false;
  let artKey = null;
  let tintToken = 0;

  // --- elements (Sheng: only the grabber at the top; tap or swipe down to close) ---
  const grab = h('button', { class: 'np-grab', type: 'button', 'aria-label': 'Close Now listening', onclick: () => close() });
  const label = h('div', { class: 'nl-label' });
  const art = h('div', { class: 'np-art' });
  const kicker = h('div', { class: 'np-kicker' });
  const titleEl = h('div', { class: 'np-title' });
  const perfEl = h('div', { class: 'np-perf' });
  const albumEl = h('div', { class: 'np-move nl-album' });
  const actions = h('div', { class: 'nl-actions' });
  const fields = h('div', { class: 'nl-fields' });
  const queueEl = h('section', { class: 'nl-queue', 'aria-label': 'Up next' });
  const foot = h('div', { class: 'nl-foot' });
  const inner = h('div', { class: 'np-inner nl-inner' },
    h('div', { class: 'np-top' }, grab),
    label,
    h('div', { class: 'np-art-wrap' }, art),
    h('div', { class: 'np-meta' }, h('div', { class: 'np-text' }, kicker, titleEl, perfEl, albumEl)),
    actions, fields, queueEl, foot);
  const root = h('div', { class: 'np nl', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Now listening', tabindex: '-1' }, inner);

  document.body.append(root);
  document.body.style.overflow = 'hidden';
  root.getBoundingClientRect(); // commit the off-screen position so the slide-up animates
  requestAnimationFrame(() => root.classList.add('open'));

  // --- painting ---
  function paint() {
    const p = L.current;
    if (!p) return;
    const app = playAppName();
    const composer = composerOf(p);
    const isAlbum = p.kind === 'album';

    label.textContent = 'Now listening';
    if (artKey !== (p.artwork || '')) {
      artKey = p.artwork || '';
      const big = artwork(p.artwork, 600) || p.artwork;
      clear(art).append(big
        ? h('img', { src: big, alt: `Cover of ${p.album || p.title}`, onerror: (e) => e.target.replaceWith(icon('music', 56)) })
        : icon('music', 56));
      paintTint(p.artwork);
    }
    kicker.textContent = composer?.name || p.composer || (isAlbum ? 'Album' : 'Recording');
    titleEl.textContent = p.title || '';
    titleEl.title = p.title || '';
    perfEl.textContent = p.artist || '';
    albumEl.textContent = !isAlbum && p.album ? [p.album, p.year].filter(Boolean).join(' · ') : '';

    // ▶ Play in <app> (with the queue, so ⏭ keeps working) · Save · Whole album
    const saved = savedSomewhere(p);
    fill(actions,
      listenLink(p, [icon('play', 18), h('span', {}, `Play in ${app}`)], {
        cls: 'nl-play', queue: L.queue, index: L.index, label: `Play ${p.title} in ${app}`,
      }),
      h('p', { class: 'nl-caption' },
        `Plays in full in ${app} with your subscription. `,
        h('button', {
          type: 'button', class: 'nl-swap',
          onclick: () => {
            const to = playApp() === 'music' ? 'classical' : 'music';
            store.setPref('playIn', to);
            toast(`Pieces now open in ${playAppName(to)}`);
          },
        }, `Use ${playAppName(playApp() === 'music' ? 'classical' : 'music')} instead`)),
      h('div', { class: 'nl-row' },
        h('button', {
          type: 'button', class: ['nl-pill', saved && 'on'], 'aria-label': `Save ${p.title} to your Library`,
          onclick: () => watchSheet(openSaveSheet(p)),
        }, icon(saved ? 'check' : 'plus', 16), saved ? 'Saved' : 'Save'),
        !isAlbum && p.collectionId
          ? listenLink(wholeAlbum(p), [icon('album', 16), h('span', {}, 'Whole album')], {
            cls: 'nl-pill', label: `Play the whole album ${p.album || ''} in ${app}`.replace(/\s+/g, ' '),
          })
          : null));

    // Work / Album / Composer
    const work = p.workId ? repo.work(p.workId) : null;
    fill(fields,
      !isAlbum ? field('Work', work ? h('a', { href: href.work(work.id) }, p.title) : p.title) : null,
      p.album ? field('Album', h('span', {}, p.album, p.year ? h('span', { class: 'nl-dim' }, ` · ${p.year}`) : null)) : null,
      composer
        ? field('Composer', h('a', { class: 'nl-composer', href: href.composer(composer.id) },
          withFace(h('span', { class: 'np-composer' }), composer.name, composer.id), h('span', {}, composer.name)))
        : p.composer ? field('Composer', p.composer) : null);

    paintQueue();

    fill(foot,
      h('button', {
        type: 'button', class: 'nl-clear',
        onclick: () => {
          clearListening();
          toast('Now listening cleared');
        },
      }, 'Clear Now listening'),
      h('p', { class: 'np-credit' }, APPLE_CREDIT, ' ',
        h('a', { href: p.collectionId ? albumURL(p.collectionId, null, 'classical') : searchURL(`${p.composer || ''} ${p.title}`.trim(), 'classical'), target: '_blank', rel: 'noopener' }, 'Apple Music Classical'),
        ' · ',
        h('a', { href: p.collectionId ? albumURL(p.collectionId, null, 'music') : searchURL(`${p.composer || ''} ${p.title}`.trim(), 'music'), target: '_blank', rel: 'noopener' }, 'Apple Music')));
  }

  function field(k, v) {
    return h('div', { class: 'np-field' }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v));
  }

  // Up next: the rest of a Play-all run. Each row opens that piece (and keeps the run going).
  function paintQueue() {
    const after = L.queue.slice(L.index + 1);
    if (!after.length) {
      fill(queueEl, L.queue.length > 1
        ? h('p', { class: 'nl-qempty' }, 'That was the last piece of this run.')
        : null);
      return;
    }
    const app = playAppName();
    fill(queueEl,
      h('h3', { class: 'nl-qlabel' }, 'Up next', h('span', { class: 'nl-dim' }, ` · ${after.length}`)),
      after.map((q, k) => {
        const i = L.index + 1 + k;
        return h('div', { class: 'nl-qrow' },
          listenLink(q, [
            q.artwork
              ? h('img', { src: q.artwork, alt: '', onerror: (e) => e.target.replaceWith(h('span', { class: 'ph' }, icon('music', 16))) })
              : h('span', { class: 'ph' }, icon('music', 16)),
            h('span', { class: 'grow' },
              h('span', { class: 't' }, q.title),
              h('span', { class: 's' }, [q.composer, q.artist].filter(Boolean).join(' · '))),
            icon('external', 15, 'go'),
          ], { cls: 'nl-qmain', queue: L.queue, index: i, label: `Play ${q.title} in ${app}` }),
          h('button', {
            type: 'button', class: 'nl-qsave', 'aria-label': `Save ${q.title} to your Library`,
            onclick: () => watchSheet(openSaveSheet(q)),
          }, icon('plus', 16)));
      }));
  }

  function paintTint(url) {
    const token = ++tintToken;
    artTint(url).then((t) => {
      if (closed || token !== tintToken) return;
      if (t) {
        root.style.setProperty('--np-c1', t.c1);
        root.style.setProperty('--np-c2', t.c2);
      } else {
        root.style.removeProperty('--np-c1');
        root.style.removeProperty('--np-c2');
      }
    });
  }

  // A sheet opened over this view resets body scrolling when it closes; keep the page behind still.
  function watchSheet(sheet) {
    if (!sheet?.el) return;
    const mo = new MutationObserver(() => {
      if (sheet.el.isConnected) return;
      mo.disconnect();
      if (!closed) document.body.style.overflow = 'hidden';
    });
    mo.observe(document.body, { childList: true });
  }

  // --- swipe down to close ---
  let drag = null;
  root.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || root.scrollTop > 0) return;
    if (e.target.closest('button:not(.np-grab), a, input, select')) return;
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

  // --- keyboard, navigation (Work / Composer links leave the view) ---
  function onKey(e) {
    if (e.key === 'Escape' && !document.querySelector('.sheet.open')) close();
  }
  const onHash = () => close({ navigating: true });
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', onHash);

  // --- live updates ---
  const unsubListening = onListening((snap) => {
    L = snap;
    later(() => {
      if (closed) return;
      if (!L.current) close();
      else paint();
    });
  });
  const unsubStore = store.subscribe((topic) => {
    if (!closed && (topic === 'prefs' || topic === 'library')) later(() => !closed && paint());
  });

  function close({ navigating = false } = {}) {
    if (closed) return;
    closed = true;
    unsubListening();
    unsubStore();
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

  paint();
  const api = {
    el: root,
    close: () => close(),
    focus: () => grab.focus({ preventScroll: true }),
  };
  requestAnimationFrame(() => grab.focus({ preventScroll: true }));
  return api;
}
