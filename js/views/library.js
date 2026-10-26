// Library tab — modelled on Sheng's Library tab (SPEC §3.9, screens library-01…03). Sheng shows
// the user's Apple Music library, which needs paid MusicKit; Klang keeps its own on-device
// library instead: albums you save (store.toggleAlbum), your own playlists of pieces
// (store.createPlaylist, filled from the Save sheet in ui/save.js) and concert / article
// programmes saved as playlists (store.togglePlaylist).
//
// Listening (like the concert Listen cards): the round ▶ ring of each track or piece plays Apple's
// 30-second preview inside Klang (▶/❚❚ with the time left, ui/preview.js), and a small ↗ beside it
// opens the full piece in Apple Music Classical (or Apple Music, chosen in Me). "Play all" previews the
// whole album or playlist in order (music.js preview queue); "Apple Music Classical ↗" next to it
// opens the first piece — or the album — to play in full with your own subscription.
//
//   #/library            Albums › · Playlists › · Recently added
//   #/library/albums     "My albums"    — sort (Recently added / Title / Artist) + search
//   #/library/playlists  "My playlists" — New playlist… · sort (Recently added / Title) + search
//
// Exports (also used by the Activity timeline): openAlbumSheet(album), openPlaylistSheet(playlist)

import { h, icon, clear, toast, storage, normalize } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { openSheet } from '../ui/sheet.js';
import { href, emptyState } from '../ui/components.js';
import { searchTerm, matchWorkTracks } from '../ui/listen.js';
import { searchAlbums, albumTracks, artwork, fmtDuration, ITUNES_CREDIT } from '../music.js';
import {
  makePiece, albumPiece, workPieceId, albumURL, searchURL, listenLink, onListening, playAppName,
} from '../applemusic.js';
import { saveButton } from '../ui/save.js';
import { previewButton, classicalButton } from '../ui/preview.js';
import { previewOf, previewTracks, playAllButton } from '../ui/player.js';
import { t, tn, fmtN, isZh, composerName } from '../i18n.js';

const RECENT_MAX = 20;
const SORT_KEY = 'klang.library.sort';
const ART_KEY = 'klang.library.art.v1';
const ART_TTL = 30 * 24 * 3600 * 1000;
const ART_MAX = 400;
const SORTS = {
  albums: [['recent', 'Recently added'], ['title', 'Title'], ['artist', 'Artist']],
  playlists: [['recent', 'Recently added'], ['title', 'Title']],
};

const byText = (a, b) => String(a || '').localeCompare(String(b || ''), isZh() ? 'zh-Hans-CN' : 'en', { sensitivity: 'base' });
const itemsOf = (p) => (Array.isArray(p?.items) ? p.items : []);
const isUserList = (p) => p?.kind === 'user';
const playlistSub = (p) => `${t('Playlist')} · ${isUserList(p) ? tn(itemsOf(p).length, '{n} piece', '{n} pieces') : tn(itemsOf(p).length, '{n} work', '{n} works')}`;

// Under Play all: what the two buttons do.
const playCaption = () => h('p', { class: 'lib-play-in' }, t('▶ previews 30 seconds here · ↗ plays in full in {app}', { app: t(playAppName()) }));

// Apple's credit (30-second previews courtesy of iTunes), with links to both apps.
function creditLine(classicalURL, musicURL) {
  return h('p', { class: 'listen-credit' }, t(ITUNES_CREDIT), isZh() ? '' : ' ',
    h('a', { href: classicalURL, target: '_blank', rel: 'noopener' }, t('Apple Music Classical')), ' · ',
    h('a', { href: musicURL, target: '_blank', rel: 'noopener' }, t('Apple Music')), isZh() ? '' : '.');
}

// The two listening buttons of a row: the round ▶ ring previews here, ↗ opens the full piece.
function rowButtons(piece, resolve, { queue = null, index = 0 } = {}) {
  return [
    previewButton({ resolve, cls: 'play pv-ring', label: t('Preview {title}', { title: piece.title }) }),
    classicalButton(piece, { cls: 'pv-icon', compact: true, queue, index }),
  ];
}

// Values of the promises that settle within `ms` (a slow lookup doesn't hold up Play all).
function settledWithin(promises, ms) {
  const out = new Array(promises.length).fill(null);
  const all = Promise.all(promises.map((p, i) => Promise.resolve(p).then((v) => { out[i] = v; }, () => {})));
  return Promise.race([all, new Promise((r) => setTimeout(r, ms))]).then(() => out);
}

// ---------- artwork memory for generated playlist covers ----------
// Artwork URLs are iTunes metadata (cacheable); Klang never stores or streams audio.
let artCache = (() => {
  const v = storage.get(ART_KEY, {});
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
})();

function artGet(key) {
  const e = artCache[key];
  return e && Date.now() - e.t < ART_TTL ? e.u : null;
}

function rememberArt(key, url) {
  if (!key || !url || artCache[key]?.u === url) return;
  artCache[key] = { u: url, t: Date.now() };
  const keys = Object.keys(artCache);
  if (keys.length > ART_MAX) {
    keys.sort((a, b) => artCache[a].t - artCache[b].t).slice(0, keys.length - ART_MAX).forEach((k) => delete artCache[k]);
  }
  storage.set(ART_KEY, artCache);
}

function playlistArts(p) {
  const albumArt = new Map(store.libraryAlbums().map((a) => [String(a.id), a.artwork]));
  const out = [];
  for (const it of itemsOf(p)) {
    const ids = [it.collectionId, it.workId ? store.listenChoice(it.workId) : null].filter((x) => x != null).map(String);
    const url = it.artwork || ids.map((id) => albumArt.get(id) || artGet(id)).find(Boolean) || (it.workId ? artGet(`work:${it.workId}`) : null);
    if (url && !out.includes(url)) out.push(url);
    if (out.length === 4) break;
  }
  return out;
}

function hue(s) {
  let x = 0;
  for (const ch of String(s || '')) x = (x * 31 + ch.codePointAt(0)) % 360;
  return x;
}

function monogram(name) {
  const words = String(name || '').split(/[\s\-–—·:]+/).filter((w) => /^\p{L}/u.test(w));
  const m = words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return m || '♪';
}

// Generated cover: 2×2 of the first album arts when known, one art, or a gradient monogram.
function playlistCover(p, size = 'cv-sm') {
  const arts = playlistArts(p);
  if (arts.length >= 4) return h('div', { class: ['pl-cover', 'quad', size] }, arts.map((u) => h('img', { src: u, alt: '', loading: 'lazy' })));
  if (arts.length) return h('div', { class: ['pl-cover', size] }, h('img', { src: arts[0], alt: '', loading: 'lazy' }));
  const a = hue(p?.name || p?.id);
  return h('div', {
    class: ['pl-cover', 'gen', size],
    style: { background: `linear-gradient(135deg, hsl(${a}, 42%, 36%), hsl(${(a + 48) % 360}, 46%, 15%))` },
  }, h('span', {}, monogram(p?.name)));
}

function albumCover(a, size = 'cv-sm', big = false) {
  const src = big ? artwork(a?.artwork, 600) || a?.artwork : a?.artwork;
  return src
    ? h('div', { class: ['lib-cover', size] }, h('img', { src, alt: '', loading: 'lazy' }))
    : h('div', { class: ['lib-cover', 'ph', size] }, icon('album', big ? 40 : 22));
}

// A second link to the same piece (e.g. the title next to the round ▶): hidden from assistive
// tech and the tab order so each row is announced once.
function quietLink(a) {
  a.tabIndex = -1;
  a.setAttribute('aria-hidden', 'true');
  return a;
}

// Rename a playlist / name a new one: a small sheet with one field.
function nameSheet({ title, value = '', action, onSave }) {
  const input = h('input', {
    class: 'input', type: 'text', value, placeholder: t('Playlist name'), 'aria-label': t('Playlist name'),
    maxlength: '80', enterkeyhint: 'done', autocomplete: 'off',
  });
  const form = h('form', { class: 'save-new lib-name-form' }, input, h('button', { type: 'submit', class: 'btn small primary' }, action));
  const sheet = openSheet({ title, body: form });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sheet.close();
    onSave(input.value);
  });
  setTimeout(() => {
    input.focus();
    input.select();
  }, 60);
  return sheet;
}

// ---------- album sheet: tracks, each with ▶ preview and ↗ Apple Music Classical ----------
export function openAlbumSheet(album) {
  const id = album.id;
  const work = album.workId ? repo.work(album.workId) : null;
  const compName = work ? repo.composer(work.composerId)?.name || null : null;
  const whole = albumPiece(album, album.workId ? { workId: album.workId } : {});
  let closed = false;
  let now = null; // Now listening (applemusic.js)
  let pvList = null; // the album's preview tracks, once loaded (Play all and the rows share them)
  const pvExtra = () => ({ collectionId: id, year: album.year || '', artwork: album.artwork || null });

  const tracksEl = h('div', { class: 'track-list lib-tracks' }, [0, 1, 2, 3].map(() => h('div', { class: 'skeleton listen-skel-row' })));
  const libBtn = h('button', { class: 'btn small lib-remove', type: 'button', onclick: toggleInLibrary });

  function paintLibBtn() {
    const on = store.hasAlbum(id);
    libBtn.classList.toggle('add', !on);
    libBtn.replaceChildren(icon(on ? 'minus' : 'plus', 14), on ? t('Remove from Library') : t('Add to Library'));
  }

  function toggleInLibrary() {
    const on = store.toggleAlbum({
      id, title: album.title, artist: album.artist || '', artwork: album.artwork || null,
      url: album.url || null, year: album.year || '', workId: album.workId || null,
    });
    toast(on ? t('Added to Library') : t('Removed from Library'));
    paintLibBtn();
  }

  const body = h('div', { class: 'lib-sheet' },
    h('div', { class: 'lib-sheet-head' }, albumCover(album, 'cv-xl', true)),
    h('div', { class: 'listen-actions lib-actions' },
      playAllButton({
        resolve: () => pvList || albumTracks(id).then((res) => previewTracks(res.tracks || [], pvExtra())),
        cls: 'pv-primary', label: t('Play all'),
      }),
      classicalButton(whole, { cls: 'pv-lg' }),
      saveButton(whole, { cls: 'btn small lib-save', label: t('Save') })),
    playCaption(),
    tracksEl,
    h('div', { class: 'lib-sheet-foot' }, libBtn));
  paintLibBtn();

  const unsubLib = store.subscribe((topic) => {
    if (topic === 'library' && !closed) paintLibBtn();
  });
  const unsubNow = onListening((L) => {
    now = L.current;
    paintCurrent();
  });

  const sheet = openSheet({
    title: album.title || t('Album'),
    subtitle: [album.artist, album.year].filter(Boolean).join(' · ') || null,
    body,
    footer: creditLine(albumURL(id, null, 'classical'), albumURL(id, null, 'music')),
    onClose: () => {
      closed = true;
      unsubLib();
      unsubNow();
    },
  });

  // The track you last opened from Klang is highlighted.
  function paintCurrent() {
    for (const row of tracksEl.querySelectorAll('.track-row')) {
      row.classList.toggle('current', !!now && String(now.collectionId) === String(id) && String(now.trackId) === row.dataset.track);
    }
  }

  // [n] [▶ preview ring] [title ↗] [time] [↗] [＋]
  function trackRow(piece, tr, i, queue, pv) {
    const label = t('Play {title} in {app}', { title: tr.title, app: t(playAppName()) });
    const other = tr.artist && album.artist && tr.artist !== album.artist ? h('span', { class: 'ta' }, tr.artist) : null;
    const mine = pv.find((x) => x.id === tr.id) || null;
    return h('div', { class: 'track-row', dataset: { track: String(tr.id) } },
      h('span', { class: 'tn' }, tr.track || ''),
      mine
        ? previewButton({ resolve: () => ({ track: mine, queue: pv }), cls: 'play pv-ring', label: t('Preview {title}', { title: tr.title }) })
        : h('span', { class: 'play pv-ring off', title: t('No preview for this recording') }, icon('play', 12)),
      quietLink(listenLink(piece, [tr.title, other], { cls: 'tt', queue, index: i, label })),
      h('span', { class: 'd' }, fmtDuration(tr.durationMs)),
      classicalButton(piece, { cls: 'pv-icon', compact: true, queue, index: i }),
      saveButton(piece, { cls: 'icon-btn lib-tsave', iconOnly: true }));
  }

  function load() {
    clear(tracksEl).append(...[0, 1, 2, 3].map(() => h('div', { class: 'skeleton listen-skel-row' })));
    albumTracks(id).then((res) => {
      if (closed) return;
      const tracks = res.tracks || [];
      if (res.album?.artwork) rememberArt(String(id), res.album.artwork);
      clear(tracksEl);
      if (!tracks.length) {
        tracksEl.append(h('p', { class: 'listen-msg' }, t('Apple Music lists no tracks for this album in Switzerland.')));
        return;
      }
      // Tracks of the album's saved work carry its composer (for playlists and the timeline).
      const ofWork = new Set(work ? (matchWorkTracks(work, tracks)?.tracks || []).map((x) => x.id) : []);
      const queue = tracks.map((x) => makePiece({
        title: x.title, composer: ofWork.has(x.id) ? compName : null, workId: ofWork.has(x.id) ? work.id : null,
        artist: x.artist || album.artist || '', album: album.title || x.album || '', collectionId: id, trackId: x.id,
        artwork: x.artwork || album.artwork || null, year: album.year || res.album?.year || '',
      }));
      const pv = previewTracks(tracks, { ...pvExtra(), year: album.year || res.album?.year || '' });
      for (const x of pv) {
        if (ofWork.has(x.id)) Object.assign(x, { composer: compName, workId: work.id });
      }
      pvList = pv;
      tracksEl.append(...tracks.map((x, i) => trackRow(queue[i], x, i, queue, pv)));
      paintCurrent();
    }).catch((err) => {
      if (closed) return;
      clear(tracksEl).append(h('div', { class: 'listen-msg' },
        h('p', {}, t('Couldn’t load the tracks. The Apple Music Classical button still opens the album.')),
        h('div', { class: 'listen-actions' }, h('button', { class: 'btn small', type: 'button', onclick: load }, t('Try again')))));
      if (err) console.warn(err);
    });
  }
  load();
  return sheet;
}

// ---------- playlist sheet ----------
// Your own playlists hold pieces (applemusic.js); concert and article playlists hold one entry per
// work ({ workId, collectionId?, title, composer }). Entries that miss a recording or a track id are
// looked up in the background (iTunes metadata, cached), so their links open the exact piece; until
// then a tap opens the album, or a search in Apple Music — a tap never waits.
const resolved = new Map(); // entry key -> Promise<{ album, track } | null> (session only)
const itemKey = (it) => `${it.workId || ''}|${it.collectionId || ''}|${it.trackId || ''}|${it.composer || ''}|${it.title || ''}`;
const itemWork = (it) => (it.workId ? repo.work(it.workId) : null);

function itemTerm(it) {
  const w = itemWork(it);
  return w ? searchTerm(w) : [it.composer, it.title].filter(Boolean).join(' ');
}

function needsLookup(it) {
  if (it.kind === 'album') return false;
  if (it.collectionId && it.trackId) return false;
  return !it.collectionId || !!itemWork(it); // album known: only a work can be found inside it
}

// A recording for an entry: its saved album, else the work's chosen version (Versions), else the
// first iTunes search hit — and in it the first track of the work.
function resolveItem(it) {
  const key = itemKey(it);
  if (resolved.has(key)) return resolved.get(key);
  const p = (async () => {
    const w = itemWork(it);
    let collectionId = it.collectionId || (w ? store.listenChoice(w.id) : null);
    let album = null;
    if (!collectionId) {
      const term = itemTerm(it);
      if (!term) return null;
      const albums = await searchAlbums(term, w ? 25 : 5); // 25: the same cached search as Listen
      if (!albums.length) return null;
      [album] = albums;
      collectionId = album.id;
    }
    const res = await albumTracks(collectionId);
    album = { ...(album || {}), ...(res.album || {}), id: collectionId };
    const m = w ? matchWorkTracks(w, res.tracks || []) : null;
    const art = album.artwork || res.tracks?.[0]?.artwork;
    if (art) {
      rememberArt(String(collectionId), art);
      if (w) rememberArt(`work:${w.id}`, art);
    }
    return { album, track: m ? m.tracks[0] : null };
  })();
  resolved.set(key, p);
  p.catch(() => resolved.delete(key)); // let a later open retry after a network error
  return p;
}

// The piece an entry opens right now, from whatever is known so far.
function itemPiece(it, found = null) {
  const w = itemWork(it);
  const album = found?.album || null;
  const collectionId = it.collectionId ?? album?.id ?? (w ? store.listenChoice(w.id) : null) ?? null;
  // Older concert / article entries have no id: they are whole works (same id as applemusic.workPiece).
  const id = it.id || (it.workId && it.kind !== 'album' ? workPieceId(collectionId, it.workId) : null);
  return makePiece({
    ...(id ? { id } : {}),
    kind: it.kind === 'album' ? 'album' : 'piece',
    title: w?.title || it.title || t('Untitled'),
    composer: (w && repo.composer(w.composerId)?.name) || it.composer || null,
    workId: it.workId || null,
    artist: it.artist || album?.artist || '',
    album: it.album || album?.title || '',
    collectionId,
    trackId: it.trackId ?? found?.track?.id ?? null,
    artwork: it.artwork || album?.artwork || found?.track?.artwork || null,
    year: it.year || album?.year || '',
  });
}

export function openPlaylistSheet(playlist) {
  const id = playlist.id;
  const user = isUserList(playlist);
  let p = store.playlist(id) || playlist;
  let editing = false;
  let closed = false;
  let armTimer = null;
  let now = null;
  const found = new Map(); // entry key -> { album, track } | null
  const failed = new Set(); // entry keys whose lookup hit a network error

  const concert = p.concertId ? repo.concert(p.concertId) : null;
  const from = concert
    ? h('a', { class: 'pl-from', href: href.concert(concert.id), onclick: () => sheet.close() },
      `${t('From the concert')} `, h('b', {}, concert.title), icon('chevron', 13))
    : p.articleId
      ? h('a', { class: 'pl-from', href: `#/article/${encodeURIComponent(p.articleId)}`, onclick: () => sheet.close() },
        t('From the article'), icon('chevron', 13))
      : null;
  const head = h('div', { class: 'lib-sheet-head' });
  const actions = h('div', { class: 'listen-actions lib-actions' });
  const caption = h('div', { class: 'lib-caption-slot' });
  const list = h('div', { class: 'pl-items' });
  const foot = h('div', { class: 'lib-sheet-foot' });
  const firstTerm = itemsOf(p).length ? itemTerm(itemsOf(p)[0]) : p.name || 'classical';

  const sheet = openSheet({
    title: p.name || t('Playlist'),
    subtitle: playlistSub(p),
    body: h('div', { class: 'lib-sheet' }, head, from, actions, caption, list, foot),
    footer: creditLine(searchURL(firstTerm, 'classical'), searchURL(firstTerm, 'music')),
    onClose: () => {
      closed = true;
      clearTimeout(armTimer);
      unsubLib();
      unsubNow();
    },
  });

  const pieces = () => itemsOf(p).map((it) => itemPiece(it, found.get(itemKey(it))));

  function paintHeader() {
    const ti = sheet.el.querySelector('.sheet-header .t');
    const su = sheet.el.querySelector('.sheet-header .s');
    if (ti) ti.textContent = p.name || t('Playlist');
    if (su) su.textContent = playlistSub(p);
    sheet.el.setAttribute('aria-label', p.name || t('Playlist'));
    head.replaceChildren(playlistCover(p, 'cv-xl'));
  }

  function libButton() {
    const on = store.hasPlaylist(p.id);
    return h('button', {
      class: ['btn', 'small', 'lib-remove', !on && 'add'], type: 'button',
      onclick: () => {
        const added = store.togglePlaylist(p);
        toast(added ? t('Playlist added to Library') : t('Playlist removed from Library'));
        paint();
      },
    }, icon(on ? 'minus' : 'plus', 14), on ? t('Remove') : t('Add to Library'));
  }

  // Play all: 30 seconds of every piece in order (one preview each, the music.js preview queue);
  // "Apple Music Classical ↗" opens the first piece in full, with the rest queued for the mini
  // player's ⏭. The Play-all button is made once, so it keeps its state while lookups repaint.
  const playAll = playAllButton({
    cls: 'pv-primary', label: t('Play all'),
    resolve: () => settledWithin(pieces().map((piece) => previewOf(piece)), 8000)
      .then((rs) => rs.filter(Boolean).map((r) => r.track)),
  });
  function paintActions(ps) {
    const n = ps.length;
    const kids = [];
    if (n) {
      kids.push(playAll, classicalButton(ps[0], { cls: 'pv-lg', queue: ps, index: 0 }));
    }
    if (user) {
      if (n) {
        kids.push(h('button', {
          class: ['btn', 'small', editing && 'on'], type: 'button', 'aria-pressed': editing ? 'true' : 'false',
          onclick: () => {
            editing = !editing;
            paint();
          },
        }, editing ? t('Done') : t('Edit')));
      }
    } else {
      kids.push(libButton());
    }
    actions.replaceChildren(...kids);
    caption.replaceChildren(n ? playCaption() : '');
  }

  function recLine(it, piece) {
    const key = itemKey(it);
    if (it.kind === 'album') return [t('Album'), piece.artist, piece.year].filter(Boolean).join(' · ');
    if (piece.artist) return [piece.artist, piece.year].filter(Boolean).join(' · ');
    if (failed.has(key)) return t('Couldn’t reach Apple Music — ↗ searches {app}', { app: t(playAppName()) });
    if (found.has(key) && !found.get(key)) return t('No recording found — ↗ searches {app}', { app: t(playAppName()) });
    if (needsLookup(it)) return t('Finding a recording…');
    return '';
  }

  // Row preview buttons are kept per piece, so a preview keeps its ▶/❚❚ state across repaints.
  const pvButtons = new Map();
  function rowPreview(piece) {
    const key = `${piece.id}|${piece.collectionId || ''}|${piece.trackId || ''}`;
    if (!pvButtons.has(key)) {
      pvButtons.set(key, previewButton({ resolve: () => previewOf(piece), cls: 'play pv-ring', label: t('Preview {title}', { title: piece.title }) }));
    }
    return pvButtons.get(key);
  }

  function itemRow(it, i, ps) {
    const w = itemWork(it);
    const piece = ps[i];
    const n = ps.length;
    const label = t('Play {title} in {app}', { title: piece.title, app: t(playAppName()) });
    const comp = w ? repo.composer(w.composerId) : null;
    const text = h('div', { class: 'txt' },
      piece.composer ? h('div', { class: 'pl-comp' }, comp ? composerName(comp) : piece.composer) : null,
      h('div', { class: 'pl-title' }, piece.title),
      h('div', { class: 'pl-rec' }, recLine(it, piece)));
    let main;
    if (editing) main = h('div', { class: 'pl-main' }, text);
    else if (w) main = h('a', { class: 'pl-main', href: href.work(w.id), onclick: () => sheet.close() }, text, icon('chevron', 15));
    else main = quietLink(listenLink(piece, text, { cls: 'pl-main', queue: ps, index: i, label }));

    const right = [];
    if (editing) {
      right.push(
        h('button', {
          class: 'pl-move', type: 'button', disabled: i === 0, 'aria-label': t('Move {title} up', { title: piece.title }),
          onclick: () => store.moveInPlaylist(id, it.id, -1),
        }, h('span', { class: 'pl-up' }, icon('down', 16))),
        h('button', {
          class: 'pl-move', type: 'button', disabled: i === n - 1, 'aria-label': t('Move {title} down', { title: piece.title }),
          onclick: () => store.moveInPlaylist(id, it.id, 1),
        }, icon('down', 16)),
        h('button', {
          class: 'pl-remove', type: 'button', 'aria-label': t('Remove {title} from this playlist', { title: piece.title }),
          onclick: () => {
            store.togglePlaylistItem(id, it);
            toast(t('Removed from “{name}”', { name: p.name }));
          },
        }, icon('minus', 15)));
    } else {
      right.push(
        saveButton(piece, { cls: 'pl-save', iconOnly: true }),
        rowPreview(piece),
        classicalButton(piece, { cls: 'pv-icon', compact: true, queue: ps, index: i }));
    }
    return h('div', { class: ['pl-item', editing && 'editing'], dataset: { i: String(i) } },
      h('span', { class: 'pl-n' }, i + 1), main, ...right);
  }

  // The piece you last opened from Klang is highlighted. Only classes change here: the tapped
  // link must stay in the page while the tap is being handled.
  let shown = [];
  function paintCurrent() {
    for (const row of list.querySelectorAll('.pl-item')) {
      const piece = shown[Number(row.dataset.i)];
      row.classList.toggle('current', !!now && !!piece && now.id === piece.id);
    }
  }

  function paintFoot() {
    if (!user) {
      foot.replaceChildren();
      return;
    }
    const del = h('button', { class: 'btn small lib-remove pl-delete', type: 'button' }, t('Delete playlist'));
    del.addEventListener('click', () => {
      if (!del.classList.contains('armed')) {
        del.classList.add('armed');
        del.textContent = t('Tap again to delete');
        clearTimeout(armTimer);
        armTimer = setTimeout(() => {
          del.classList.remove('armed');
          del.textContent = t('Delete playlist');
        }, 4000);
        return;
      }
      const name = p.name;
      store.deletePlaylist(id); // the store event closes this sheet
      toast(t('Deleted “{name}”', { name }));
    });
    foot.replaceChildren(
      h('button', {
        class: 'btn small', type: 'button',
        onclick: () => nameSheet({
          title: t('Rename playlist'), value: p.name || '', action: t('Save'),
          onSave: (v) => {
            if (!v.trim()) return;
            store.renamePlaylist(id, v);
            toast(t('Playlist renamed'));
          },
        }),
      }, t('Rename')),
      del);
  }

  function paint() {
    if (closed) return;
    const its = itemsOf(p);
    const ps = pieces();
    shown = ps;
    if (!its.length) editing = false;
    paintHeader();
    paintActions(ps);
    list.replaceChildren(...(its.length
      ? its.map((it, i) => itemRow(it, i, ps))
      : [h('p', { class: 'listen-msg pl-none' }, user
        ? t('No pieces yet. Tap ＋ Save next to any recording or piece to add it here.')
        : t('This playlist has no works.'))]));
    paintFoot();
    paintCurrent();
  }

  // Look up the entries that still miss a recording or a track, one after another.
  async function lookUp() {
    for (const it of itemsOf(p)) {
      const key = itemKey(it);
      if (closed) return;
      if (!needsLookup(it) || found.has(key)) continue;
      try {
        found.set(key, await resolveItem(it));
        failed.delete(key);
      } catch {
        failed.add(key);
      }
      paint();
    }
  }

  const unsubLib = store.subscribe((topic) => {
    if (topic !== 'library' || closed) return;
    const live = store.playlist(id);
    if (live) p = live;
    else if (user) {
      sheet.close(); // deleted
      return;
    }
    paint();
    lookUp();
  });
  const unsubNow = onListening((L) => {
    now = L.current;
    paintCurrent();
  });
  paint();
  lookUp();
  return sheet;
}

// ---------- shared bits ----------
function storedSort(kind) {
  const all = storage.get(SORT_KEY, {});
  const v = all && typeof all === 'object' ? all[kind] : null;
  return SORTS[kind].some(([k]) => k === v) ? v : 'recent';
}

function saveSort(kind, value) {
  const all = storage.get(SORT_KEY, {});
  storage.set(SORT_KEY, { ...(all && typeof all === 'object' ? all : {}), [kind]: value });
}

// Sheng's row glyphs: a stacked album square and a music-note list (SF Symbols style).
const LIB_GLYPHS = {
  albums: '<path d="M8 3.6h8" stroke-width="1.7"/><rect x="5" y="6.8" width="14" height="13.6" rx="2.6" stroke-width="1.9"/>',
  playlists: '<path d="M3.5 6.5h9M3.5 11h9M3.5 15.5h6" stroke-width="1.9"/><path d="M17.5 17.2V5.2l3.6 1.2" stroke-width="1.9"/><circle cx="15.4" cy="17.4" r="2.4" fill="currentColor" stroke="none"/>',
};
function libGlyph(name, size = 18) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${LIB_GLYPHS[name] || ''}</svg>`;
  return span;
}

function navRow(to, iconName, label, n) {
  return h('a', { class: 'lib-row', href: to },
    h('span', { class: 'lib-ic' }, LIB_GLYPHS[iconName] ? libGlyph(iconName, 18) : icon(iconName, 17)),
    h('span', { class: 'grow' }, label),
    n ? h('span', { class: 'n' }, fmtN(n)) : null,
    icon('chevron', 16));
}

function recentTile(r) {
  if (r.type === 'album') {
    const a = r.item;
    return h('button', { class: 'lib-tile', type: 'button', onclick: () => openAlbumSheet(a), 'aria-label': `${t('Album')}${isZh() ? '：' : ': '}${a.title}${a.artist ? ` — ${a.artist}` : ''}` },
      albumCover(a, 'cv-lg'),
      h('div', { class: 't' }, a.title || t('Untitled')),
      h('div', { class: 's' }, a.artist || t('Album')));
  }
  const p = r.item;
  return h('button', { class: 'lib-tile', type: 'button', onclick: () => openPlaylistSheet(p), 'aria-label': `${t('Playlist')}${isZh() ? '：' : ': '}${p.name}` },
    playlistCover(p, 'cv-lg'),
    h('div', { class: 't' }, p.name || t('Playlist')),
    h('div', { class: 's' }, playlistSub(p)));
}

// "New playlist…": name it, then open it (fill it from any Save button).
function newPlaylist() {
  nameSheet({
    title: t('New playlist'), action: t('Create'),
    onSave: (name) => {
      const pl = store.createPlaylist(name);
      toast(`Created “${pl.name}”`);
      openPlaylistSheet(pl);
    },
  });
}

// ---------- Library root ----------
function renderRoot() {
  const body = h('div', { class: 'lib-page' });

  function paint() {
    const albums = store.libraryAlbums();
    const playlists = store.libraryPlaylists();
    const recent = [
      ...albums.map((a) => ({ type: 'album', item: a, at: String(a.addedAt || '') })),
      ...playlists.map((p) => ({ type: 'playlist', item: p, at: String(p.addedAt || '') })),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, RECENT_MAX);
    clear(body).append(
      h('nav', { class: 'lib-nav', 'aria-label': t('Library') },
        navRow('#/library/albums', 'albums', t('Albums'), albums.length),
        navRow('#/library/playlists', 'playlists', t('Playlists'), playlists.length)),
      h('h2', { class: 'lib-h' }, t('Recently added')),
      recent.length
        ? h('div', { class: 'lib-grid' }, recent.map(recentTile))
        : h('div', { class: 'lib-soft-empty' },
          h('h3', {}, t('Nothing added recently')),
          h('p', {}, t('Your library has no recent additions.'))));
  }

  const unsub = store.subscribe((topic) => {
    if (topic === 'library') paint();
  });
  paint();
  return {
    title: t('Library'),
    largeTitle: true,
    body,
    cleanup() {
      unsub();
    },
  };
}

// ---------- My albums / My playlists ----------
function renderList(kind) {
  const isAlbums = kind === 'albums';
  let sort = storedSort(kind);
  let q = '';

  const listEl = h('div', { class: 'lib-list' });
  const countEl = h('p', { class: 'result-line lib-count' });
  const input = h('input', {
    type: 'search',
    placeholder: isAlbums ? t('Search albums') : t('Search playlists'),
    'aria-label': isAlbums ? t('Search your albums') : t('Search your playlists'),
    autocomplete: 'off',
    enterkeyhint: 'search',
  });
  input.addEventListener('input', () => {
    q = input.value;
    paintList();
  });
  const searchWrap = h('div', { class: 'lib-search' }, h('label', { class: 'search-box' }, icon('search', 17, 'faint'), input));
  const sortBtn = h('button', { class: 'icon-btn lib-sort', type: 'button', onclick: cycleSort }, icon('sort', 18));
  const newRow = isAlbums ? null : h('button', { class: 'lib-item lib-new', type: 'button', onclick: newPlaylist },
    h('span', { class: 'lib-cover cv-sm lib-new-ic' }, icon('plus', 24)),
    h('span', { class: 'main' }, h('span', { class: 't' }, t('New playlist…'))));

  function sortLabel() {
    return t(SORTS[kind].find(([k]) => k === sort)?.[1] || 'Recently added');
  }

  function paintSortBtn() {
    sortBtn.setAttribute('aria-label', t('Sort: {sort}. Tap to change', { sort: sortLabel() }));
    sortBtn.title = t('Sorted by {sort}', { sort: isZh() ? sortLabel() : sortLabel().toLowerCase() });
  }

  function cycleSort() {
    const modes = SORTS[kind];
    const i = modes.findIndex(([k]) => k === sort);
    sort = modes[(i + 1) % modes.length][0];
    saveSort(kind, sort);
    paintSortBtn();
    toast(t('Sorted by {sort}', { sort: isZh() ? sortLabel() : sortLabel().toLowerCase() }));
    paintList();
  }

  function sorted(list) {
    const out = [...list];
    if (sort === 'title') out.sort((a, b) => byText(isAlbums ? a.title : a.name, isAlbums ? b.title : b.name));
    else if (sort === 'artist') out.sort((a, b) => byText(a.artist, b.artist) || byText(a.title, b.title));
    else out.sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || '')));
    return out;
  }

  function matches(x) {
    const needle = normalize(q.trim());
    if (!needle) return true;
    const hay = isAlbums
      ? [x.title, x.artist, x.year]
      : [x.name, ...itemsOf(x).flatMap((it) => [it.title, it.composer, it.artist, it.workId ? repo.work(it.workId)?.title : null])];
    return hay.some((s) => s && normalize(String(s)).includes(needle));
  }

  function albumRow(a) {
    return h('button', { class: 'lib-item', type: 'button', onclick: () => openAlbumSheet(a) },
      albumCover(a, 'cv-sm'),
      h('span', { class: 'main' },
        h('span', { class: 't' }, a.title || t('Untitled')),
        h('span', { class: 's' }, [a.artist, a.year].filter(Boolean).join(' · ') || t('Album'))));
  }

  function playlistRow(p) {
    return h('button', { class: 'lib-item', type: 'button', onclick: () => openPlaylistSheet(p) },
      playlistCover(p, 'cv-sm'),
      h('span', { class: 'main' },
        h('span', { class: 't' }, p.name || t('Playlist')),
        h('span', { class: 's' }, playlistSub(p))));
  }

  function paintList() {
    const all = isAlbums ? store.libraryAlbums() : store.libraryPlaylists();
    searchWrap.hidden = all.length === 0;
    countEl.hidden = all.length === 0;
    if (!all.length) {
      const empty = isAlbums
        ? emptyState('album', t('No albums yet'), t('Your library has no albums.'))
        : emptyState('playlist', t('No playlists yet'), t('Your library has no playlists.'));
      empty.querySelector('.icon')?.replaceWith(libGlyph(isAlbums ? 'albums' : 'playlists', 34));
      clear(listEl).append(empty);
      return;
    }
    const list = sorted(all.filter(matches));
    clear(countEl).append(
      h('span', {}, q.trim()
        ? t('{n} of {total}', { n: fmtN(list.length), total: isAlbums ? tn(all.length, '{n} album', '{n} albums') : tn(all.length, '{n} playlist', '{n} playlists') })
        : isAlbums ? tn(all.length, '{n} album', '{n} albums') : tn(all.length, '{n} playlist', '{n} playlists')),
      h('span', {}, sortLabel()));
    if (!list.length) {
      clear(listEl).append(h('p', { class: 'search-hint' }, t('Nothing matches “{q}”.', { q: q.trim() })));
      return;
    }
    clear(listEl).append(...list.map(isAlbums ? albumRow : playlistRow));
  }

  const unsub = store.subscribe((topic) => {
    if (topic === 'library') paintList();
  });
  paintSortBtn();
  paintList();
  return {
    title: isAlbums ? t('My albums') : t('My playlists'),
    back: true,
    actions: [sortBtn],
    body: h('div', { class: 'lib-page lib-sub' }, searchWrap, newRow, countEl, listEl),
    cleanup() {
      unsub();
    },
  };
}

// ---------- view ----------
export function render({ section } = {}) {
  if (section === 'albums' || section === 'playlists') return renderList(section);
  return renderRoot();
}
