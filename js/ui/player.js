// "Now listening" — a full-height view in Sheng's player style (tinted from the artwork, grabber /
// swipe down to close, big artwork, composer kicker, title, performers), opened from the dock's mini
// player. It has two modes:
//   Preview        a 30-second preview playing inside Klang (music.js preview): ▶/❚❚, progress with
//                  time left, ⏭ next, Up next (the rest of the preview queue) and "Play in full in
//                  Apple Music Classical ↗" for the same recording. Previews are streamed only; Apple's
//                  credit "30-second previews provided courtesy of iTunes" links to Apple Music.
//   Now listening  the piece last sent to Apple Music Classical / Apple Music (applemusic.js keeps it,
//                  with the rest of a Play-all run): ▶ Play in <app> (a real link), ▶ Preview, Save,
//                  Whole album, Up next, Clear.
// Listens are logged on your timeline automatically (applemusic.noteOpened → store.logListen).
//
// export openPlayer()     — idempotent; opened by the mini player in main.js (and the Assistant).
// export postedListens()  — listens posted from the old in-app player (read-only, newest first).
// Preview helpers shared by the personal screens (Library, Activity, Assistant):
// export previewOf(piece)          → Promise<{ track, queue } | null> for preview.js previewButton({ resolve })
// export pieceOfTrack(track)       → the piece (applemusic.js) of a previewed track, for Classical links / Save
// export playAllButton({ resolve }) → "▶ Play all": previews a whole list in order (music.js preview queue)
// export previewCredit(href)       → Apple's credit line for previews, with a link to Apple Music

import { h, icon, clear, toast, storage, normalize } from '../util.js';
import {
  artwork, preview, previewState, searchAlbums, albumTracks, ITUNES_CREDIT,
} from '../music.js';
import {
  listening, onListening, clearListening, listenLink, makePiece, albumURL, searchURL, playApp, playAppName, APPLE_CREDIT,
} from '../applemusic.js';
import * as store from '../store.js';
import * as repo from '../repo.js';
import { openSaveSheet } from './save.js';
import { href, withFace } from './components.js';
import { previewButton } from './preview.js';
import { searchTerm, matchWorkTracks } from './listen.js';
import { t, composerName, isZh } from '../i18n.js';

const POSTS_KEY = 'klang.activity.posts.v1';
const APPLE_MUSIC_HOME = 'https://music.apple.com/ch/';

// ---------- listens posted by the old player (kept read-only for activity.js) ----------
export function postedListens() {
  const v = storage.get(POSTS_KEY, []);
  return Array.isArray(v) ? v.filter((p) => p && p.trackId != null && p.at) : [];
}

// ---------- previews of pieces ----------
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const left = (st) => fmt(Math.max(0, (st.duration || 30) - (st.elapsed || 0)));

// Preview lookups are iTunes metadata (cached by music.js); the resolved tracks are kept for the
// session so a piece always previews the same track objects.
const pvCache = new Map();
const PV_MAX = 200;

// music.js keeps its preview queue private: remember the queue each of our tracks was started with,
// so the Now-listening view can show Up next.
const queues = new WeakMap();
function remember(queue) {
  for (const x of queue) queues.set(x, queue);
  return queue;
}
export function previewQueueOf(track) {
  if (!track) return [];
  const q = queues.get(track);
  if (q) return q;
  const st = previewState();
  return st.track === track && st.next ? [track, st.next] : [track];
}

// A piece's 30-second preview: its own track on its album (else the work's first movement, else
// the album's first track), queued with the rest of the work — or of the album for a whole album.
export function previewOf(piece) {
  if (!piece) return Promise.resolve(null);
  const key = [piece.kind, piece.collectionId, piece.trackId, piece.workId, piece.title, piece.composer].join('|');
  if (pvCache.has(key)) return pvCache.get(key);
  const p = (async () => {
    const w = piece.workId ? repo.work(piece.workId) : null;
    let collectionId = piece.collectionId || null;
    if (!collectionId) {
      const term = w ? searchTerm(w) : [piece.composer, piece.title, piece.artist].filter(Boolean).join(' ');
      if (!term) return null;
      const albums = await searchAlbums(term, w ? 25 : 5); // 25: the same cached search as Listen
      if (!albums.length) return null;
      const chosen = w ? store.listenChoice(w.id) : null;
      collectionId = (albums.find((a) => chosen != null && String(a.id) === String(chosen)) || albums[0]).id;
    }
    const { album, tracks } = await albumTracks(collectionId);
    if (!tracks.length) return null;
    const own = piece.kind !== 'album' && piece.trackId != null ? tracks.find((x) => String(x.id) === String(piece.trackId)) : null;
    let group;
    if (piece.kind === 'album') group = tracks;
    else {
      const m = w ? matchWorkTracks(w, tracks) : null;
      group = m && (!own || m.tracks.includes(own)) ? m.tracks : [own || tracks[0]];
    }
    const extra = {
      collectionId, composer: piece.composer || null, workId: piece.workId || null,
      year: album?.year || piece.year || '', pieceTitle: piece.title || null,
    };
    const queue = group.filter((x) => x.preview).map((x) => ({ ...x, ...extra, artwork: x.artwork || album?.artwork || piece.artwork || null }));
    if (!queue.length) return null;
    remember(queue);
    const track = (own && queue.find((x) => x.id === own.id)) || queue[0];
    return { track, queue };
  })();
  pvCache.set(key, p);
  p.then((r) => { if (!r) pvCache.delete(key); }, () => pvCache.delete(key)); // retry later
  if (pvCache.size > PV_MAX) pvCache.delete(pvCache.keys().next().value);
  return p;
}

// Tracks straight from albumTracks() (they carry .preview) as preview tracks with piece fields.
export function previewTracks(tracks, extra = {}) {
  return remember((tracks || []).filter((x) => x && x.preview)
    .map((x) => ({ ...x, collectionId: extra.collectionId ?? x.collectionId ?? null, ...extra, artwork: x.artwork || extra.artwork || null })));
}

// The piece of a previewed track: "Play in full" opens this very track in Apple Music Classical.
export function pieceOfTrack(tr) {
  if (!tr) return null;
  return makePiece({
    title: tr.title || '', composer: tr.composer || null, workId: tr.workId || null, artist: tr.artist || '',
    album: tr.album || '', collectionId: tr.collectionId || null, trackId: tr.id ?? null, artwork: tr.artwork || null, year: tr.year || '',
  });
}

// Keep a button painted from the preview state until it has left the page.
function followPreview(el, paint) {
  const unsub = preview.subscribe((st) => {
    if (!el.isConnected && el.dataset.mounted) { unsub(); return; }
    if (el.isConnected) el.dataset.mounted = '1';
    paint(st);
  });
}

// "▶ Play all": the whole list previewed in order. resolve() returns the queue (an array of tracks
// with .preview), or a Promise of it; the tap unlocks audio first (iOS needs the gesture).
export function playAllButton({ resolve, label = null, cls = '' } = {}) {
  let mine = null;
  let loading = false;
  const btn = h('button', { type: 'button', class: ['pv-btn', 'pv-all', cls] });
  function paint(st = previewState()) {
    const on = !!mine && mine.includes(st.track);
    const i = on ? mine.indexOf(st.track) : -1;
    btn.classList.toggle('on', on && st.playing);
    btn.classList.toggle('loading', loading);
    btn.setAttribute('aria-label', on && st.playing ? t('Pause the preview') : t('Preview the whole list, 30 seconds of each piece'));
    btn.replaceChildren(icon(loading ? 'music' : on && st.playing ? 'pause' : 'play', 13),
      h('span', { class: 'pv-t' }, on
        ? (st.playing ? `${left(st)}${mine.length > 1 ? ` · ${i + 1}/${mine.length}` : ''}` : t('Resume'))
        : label || t('Play all')));
  }
  followPreview(btn, paint);
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const st = previewState();
    if (mine && mine.includes(st.track)) { preview.toggle(); return; }
    let res;
    try { res = resolve?.(); } catch { res = null; }
    const start = (queue) => {
      const list = (Array.isArray(queue) ? queue : queue?.queue || []).filter((x) => x && x.preview);
      if (!list.length) { toast(t('No previews for these pieces')); return; }
      mine = remember(list);
      preview.play(list[0], list);
    };
    if (res && typeof res.then === 'function') {
      preview.unlock();
      loading = true;
      paint();
      res.then(start, () => toast(t('Couldn’t load the preview'))).finally(() => { loading = false; paint(); });
    } else start(res);
  });
  return btn;
}

// Apple's credit for previews (Apple's terms: a link to Apple Music next to the previews).
export function previewCredit(link = APPLE_MUSIC_HOME, cls = 'listen-credit pv-credit') {
  return h('p', { class: cls }, t(ITUNES_CREDIT), isZh() ? '' : ' ',
    h('a', { href: link, target: '_blank', rel: 'noopener' }, t('Apple Music')), isZh() ? '' : '.');
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
  return repo.allComposers().find((c) => normalize(c.name) === n || normalize(c.short) === n) || null;
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
  if (!listening().current && !previewState().track) {
    toast(t('Nothing playing — tap Listen on a work or concert to play it in {app}', { app: t(playAppName()) }));
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
  let mode = null; // 'preview' | 'listening'
  let pvKey = null; // the preview track the view was last drawn for

  // --- elements (Sheng: only the grabber at the top; tap or swipe down to close) ---
  const grab = h('button', { class: 'np-grab', type: 'button', 'aria-label': t('Close Now listening'), onclick: () => close() });
  const label = h('div', { class: 'nl-label' });
  const art = h('div', { class: 'np-art' });
  const kicker = h('div', { class: 'np-kicker' });
  const titleEl = h('div', { class: 'np-title' });
  const perfEl = h('div', { class: 'np-perf' });
  const albumEl = h('div', { class: 'np-move nl-album' });
  const transport = h('div', { class: 'nl-transport' });
  const actions = h('div', { class: 'nl-actions' });
  const fields = h('div', { class: 'nl-fields' });
  const queueEl = h('section', { class: 'nl-queue', 'aria-label': t('Up next') });
  const foot = h('div', { class: 'nl-foot' });
  const inner = h('div', { class: 'np-inner nl-inner' },
    h('div', { class: 'np-top' }, grab),
    label,
    h('div', { class: 'np-art-wrap' }, art),
    h('div', { class: 'np-meta' }, h('div', { class: 'np-text' }, kicker, titleEl, perfEl, albumEl)),
    transport, actions, fields, queueEl, foot);
  const root = h('div', { class: 'np nl', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('Now listening'), tabindex: '-1' }, inner);

  document.body.append(root);
  document.body.style.overflow = 'hidden';
  root.getBoundingClientRect(); // commit the off-screen position so the slide-up animates
  requestAnimationFrame(() => root.classList.add('open'));

  // --- shared painting ---
  function paintArt(url, alt) {
    if (artKey === (url || '')) return;
    artKey = url || '';
    const big = artwork(url, 600) || url;
    clear(art).append(big
      ? h('img', { src: big, alt, onerror: (e) => e.target.replaceWith(icon('music', 56)) })
      : icon('music', 56));
    paintTint(url);
  }

  function field(k, v) {
    return h('div', { class: 'np-field' }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v));
  }

  function composerField(p) {
    const composer = composerOf(p);
    if (composer) {
      const name = composerName(composer);
      return field(t('Composer'), h('a', { class: 'nl-composer', href: href.composer(composer.id) },
        withFace(h('span', { class: 'np-composer' }), composer.name, composer.id), h('span', {}, name)));
    }
    return p.composer ? field(t('Composer'), p.composer) : null;
  }

  function paint() {
    if (closed) return;
    const st = previewState();
    const next = st.track ? 'preview' : 'listening';
    if (next === 'listening' && !L.current) { close(); return; }
    mode = next;
    root.classList.toggle('nl-pv', mode === 'preview');
    if (mode === 'preview') paintPreview(st);
    else paintListening();
  }

  // --- preview mode ---
  const prog = h('div', { class: 'nl-prog' }, h('i'));
  const tEl = h('span', { class: 'nl-time' });
  const lEl = h('span', { class: 'nl-time' });
  const playBtn = h('button', { type: 'button', class: 'nl-pp', onclick: () => preview.toggle() });
  const nextBtn = h('button', { type: 'button', class: 'nl-skip', 'aria-label': t('Next preview'), onclick: () => preview.next() }, icon('forward', 22));

  function paintPreview(st) {
    const tr = st.track;
    const piece = pieceOfTrack(tr);
    const composer = composerOf(piece);
    pvKey = tr;
    label.textContent = t('30-second preview');
    paintArt(tr.artwork, t('Cover of {title}', { title: tr.album || tr.title }));
    kicker.textContent = composer ? composerName(composer) : tr.composer || tr.artist || '';
    titleEl.textContent = tr.title || '';
    titleEl.title = tr.title || '';
    perfEl.textContent = tr.artist || '';
    albumEl.textContent = [tr.album, tr.year].filter(Boolean).join(' · ');
    fill(transport,
      h('div', { class: 'nl-progwrap' }, prog, h('div', { class: 'nl-times' }, tEl, lEl)),
      h('div', { class: 'nl-buttons' }, h('span', { class: 'nl-skip ghost', 'aria-hidden': 'true' }), playBtn, nextBtn));
    tickPreview(st);

    const app = t(playAppName());
    const saved = savedSomewhere(piece);
    const q = previewQueueOf(tr);
    const i = q.indexOf(tr);
    fill(actions,
      listenLink(piece, [icon('external', 17), h('span', {}, t('Play in full in {app}', { app }))], {
        cls: 'nl-play nl-full', queue: q.length > 1 ? q.map(pieceOfTrack) : null, index: Math.max(0, i),
        label: t('Play {title} in full in {app}', { title: piece.title, app }),
        onOpen: () => preview.stop(),
      }),
      h('div', { class: 'nl-row' },
        h('button', {
          type: 'button', class: ['nl-pill', saved && 'on'], 'aria-label': t('Save {title} to your Library', { title: piece.title }),
          onclick: () => watchSheet(openSaveSheet(piece)),
        }, icon(saved ? 'check' : 'plus', 16), saved ? t('Saved') : t('Save')),
        h('button', {
          type: 'button', class: 'nl-pill', onclick: () => { preview.stop(); toast(t('Preview stopped')); },
        }, icon('close', 15), t('Stop preview'))));

    const work = piece.workId ? repo.work(piece.workId) : null;
    fill(fields,
      work ? field(t('Work'), h('a', { href: href.work(work.id) }, work.title)) : tr.pieceTitle && tr.pieceTitle !== tr.title ? field(t('Work'), tr.pieceTitle) : null,
      tr.album ? field(t('Album'), h('span', {}, tr.album, tr.year ? h('span', { class: 'nl-dim' }, ` · ${tr.year}`) : null)) : null,
      composerField(piece));

    // Up next: the rest of the preview queue; a tap plays that preview.
    const after = i >= 0 ? q.slice(i + 1) : [];
    fill(queueEl, after.length ? [
      h('h3', { class: 'nl-qlabel' }, t('Up next'), h('span', { class: 'nl-dim' }, ` · ${after.length}`)),
      after.map((x) => h('div', { class: 'nl-qrow' },
        h('button', { type: 'button', class: 'nl-qmain', onclick: () => preview.play(x), 'aria-label': t('Preview {title}', { title: x.title }) },
          x.artwork
            ? h('img', { src: x.artwork, alt: '', onerror: (e) => e.target.replaceWith(h('span', { class: 'ph' }, icon('music', 16))) })
            : h('span', { class: 'ph' }, icon('music', 16)),
          h('span', { class: 'grow' }, h('span', { class: 't' }, x.title), h('span', { class: 's' }, [x.artist].filter(Boolean).join(' · '))),
          icon('play', 13, 'go')),
        listenLink(pieceOfTrack(x), icon('external', 15), { cls: 'nl-qsave', label: t('Play {title} in full in {app}', { title: x.title, app }), onOpen: () => preview.stop() }))),
    ] : null);

    fill(foot, previewCredit(tr.collectionId ? albumURL(tr.collectionId, tr.id, 'music') : APPLE_MUSIC_HOME, 'np-credit'));
  }

  function tickPreview(st) {
    if (!st.track) return;
    const p = Math.max(0, Math.min(1, st.progress || 0));
    prog.firstChild.style.width = `${(p * 100).toFixed(1)}%`;
    tEl.textContent = fmt(st.elapsed || 0);
    lEl.textContent = `-${left(st)}`;
    playBtn.replaceChildren(icon(st.playing ? 'pause' : 'play', 30));
    playBtn.setAttribute('aria-label', st.playing ? t('Pause the preview') : t('Play the preview'));
    nextBtn.disabled = !st.hasNext;
  }

  // --- Now listening mode ---
  function paintListening() {
    const p = L.current;
    if (!p) return;
    const app = t(playAppName());
    const composer = composerOf(p);
    const isAlbum = p.kind === 'album';
    pvKey = null;

    label.textContent = t('Now listening');
    paintArt(p.artwork, t('Cover of {title}', { title: p.album || p.title }));
    kicker.textContent = composer ? composerName(composer) : p.composer || (isAlbum ? t('Album') : t('Recording'));
    titleEl.textContent = p.title || '';
    titleEl.title = p.title || '';
    perfEl.textContent = p.artist || '';
    albumEl.textContent = !isAlbum && p.album ? [p.album, p.year].filter(Boolean).join(' · ') : '';
    fill(transport);

    // ▶ Play in <app> (with the queue, so ⏭ keeps working) · ▶ Preview · Save · Whole album
    const saved = savedSomewhere(p);
    fill(actions,
      listenLink(p, [icon('play', 18), h('span', {}, t('Play in {app}', { app }))], {
        cls: 'nl-play', queue: L.queue, index: L.index, label: t('Play {title} in {app}', { title: p.title, app }),
      }),
      h('p', { class: 'nl-caption' },
        t('Plays in full in {app} with your subscription.', { app }), ' ',
        h('button', {
          type: 'button', class: 'nl-swap',
          onclick: () => {
            const to = playApp() === 'music' ? 'classical' : 'music';
            store.setPref('playIn', to);
            toast(t('Pieces now open in {app}', { app: t(playAppName(to)) }));
          },
        }, t('Use {app} instead', { app: t(playAppName(playApp() === 'music' ? 'classical' : 'music')) }))),
      h('div', { class: 'nl-row' },
        previewButton({ resolve: () => previewOf(p), cls: 'nl-pill nl-pv-btn', label: t('Play a 30-second preview') }),
        h('button', {
          type: 'button', class: ['nl-pill', saved && 'on'], 'aria-label': t('Save {title} to your Library', { title: p.title }),
          onclick: () => watchSheet(openSaveSheet(p)),
        }, icon(saved ? 'check' : 'plus', 16), saved ? t('Saved') : t('Save')),
        !isAlbum && p.collectionId
          ? listenLink(wholeAlbum(p), [icon('album', 16), h('span', {}, t('Whole album'))], {
            cls: 'nl-pill', label: t('Play the whole album {album} in {app}', { album: p.album || '', app }),
          })
          : null));

    // Work / Album / Composer
    const work = p.workId ? repo.work(p.workId) : null;
    fill(fields,
      !isAlbum ? field(t('Work'), work ? h('a', { href: href.work(work.id) }, p.title) : p.title) : null,
      p.album ? field(t('Album'), h('span', {}, p.album, p.year ? h('span', { class: 'nl-dim' }, ` · ${p.year}`) : null)) : null,
      composerField(p));

    paintQueue();

    fill(foot,
      h('button', {
        type: 'button', class: 'nl-clear',
        onclick: () => {
          clearListening();
          toast(t('Now listening cleared'));
        },
      }, t('Clear Now listening')),
      h('p', { class: 'np-credit' }, t(APPLE_CREDIT), isZh() ? '' : ' ',
        h('a', { href: p.collectionId ? albumURL(p.collectionId, null, 'classical') : searchURL(`${p.composer || ''} ${p.title}`.trim(), 'classical'), target: '_blank', rel: 'noopener' }, t('Apple Music Classical')),
        ' · ',
        h('a', { href: p.collectionId ? albumURL(p.collectionId, null, 'music') : searchURL(`${p.composer || ''} ${p.title}`.trim(), 'music'), target: '_blank', rel: 'noopener' }, t('Apple Music'))));
  }

  // Up next: the rest of a Play-all run. Each row opens that piece (and keeps the run going).
  function paintQueue() {
    const after = L.queue.slice(L.index + 1);
    if (!after.length) {
      fill(queueEl, L.queue.length > 1
        ? h('p', { class: 'nl-qempty' }, t('That was the last piece of this run.'))
        : null);
      return;
    }
    const app = t(playAppName());
    fill(queueEl,
      h('h3', { class: 'nl-qlabel' }, t('Up next'), h('span', { class: 'nl-dim' }, ` · ${after.length}`)),
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
          ], { cls: 'nl-qmain', queue: L.queue, index: i, label: t('Play {title} in {app}', { title: q.title, app }) }),
          h('button', {
            type: 'button', class: 'nl-qsave', 'aria-label': t('Save {title} to your Library', { title: q.title }),
            onclick: () => watchSheet(openSaveSheet(q)),
          }, icon('plus', 16)));
      }));
  }

  function paintTint(url) {
    const token = ++tintToken;
    artTint(url).then((tint) => {
      if (closed || token !== tintToken) return;
      if (tint) {
        root.style.setProperty('--np-c1', tint.c1);
        root.style.setProperty('--np-c2', tint.c2);
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
      if (mode !== 'preview') paint();
    });
  });
  // Preview ticks only move the progress; a new track (or the end of the preview) redraws.
  const unsubPreview = preview.subscribe((st) => {
    if (closed) return;
    if (st.track && mode === 'preview' && st.track === pvKey) { tickPreview(st); return; }
    later(() => !closed && paint());
  });
  const unsubStore = store.subscribe((topic) => {
    if (!closed && (topic === 'prefs' || topic === 'library')) later(() => !closed && paint());
  });

  function close({ navigating = false } = {}) {
    if (closed) return;
    closed = true;
    unsubListening();
    unsubPreview();
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
