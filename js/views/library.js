// Library tab — modelled on Sheng's Library tab (SPEC §3.9, screens library-01…03). Sheng shows
// the user's Apple Music library, which needs paid MusicKit; Klang keeps its own on-device
// library instead: albums you save (store.toggleAlbum), your own playlists of pieces
// (store.createPlaylist, filled from the Save sheet in ui/save.js) and concert / article
// programmes saved as playlists (store.togglePlaylist).
//
// Klang plays no audio: every Play / Play all opens the piece (album + first track) or the whole
// album in Apple Music Classical or Apple Music (applemusic.js, chosen in Me), where it plays in
// full with your own subscription.
//
//   #/library            Albums › · Playlists › · Recently added
//   #/library/albums     "My albums"    — sort (Recently added / Title / Artist) + search
//   #/library/playlists  "My playlists" — New playlist… · sort (Recently added / Title) + search
//
// Exports (also used by the Activity timeline): openAlbumSheet(album), openPlaylistSheet(playlist)

import { h, icon, clear, toast, storage, normalize, plural } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { openSheet } from '../ui/sheet.js';
import { href, emptyState } from '../ui/components.js';
import { searchTerm, matchWorkTracks } from '../ui/listen.js';
import { searchAlbums, albumTracks, artwork, fmtDuration } from '../music.js';
import {
  makePiece, albumPiece, workPieceId, albumURL, searchURL, listenLink, onListening, playAppName, APPLE_CREDIT,
} from '../applemusic.js';
import { saveButton } from '../ui/save.js';

const RECENT_MAX = 20;
const SORT_KEY = 'klang.library.sort';
const ART_KEY = 'klang.library.art.v1';
const ART_TTL = 30 * 24 * 3600 * 1000;
const ART_MAX = 400;
const SORTS = {
  albums: [['recent', 'Recently added'], ['title', 'Title'], ['artist', 'Artist']],
  playlists: [['recent', 'Recently added'], ['title', 'Title']],
};

const byText = (a, b) => String(a || '').localeCompare(String(b || ''), 'en', { sensitivity: 'base' });
const itemsOf = (p) => (Array.isArray(p?.items) ? p.items : []);
const isUserList = (p) => p?.kind === 'user';
const playlistSub = (p) => `Playlist · ${plural(itemsOf(p).length, isUserList(p) ? 'piece' : 'work')}`;

// Under every Play / Play all: where it plays.
const playCaption = (more = '') => h('p', { class: 'lib-play-in' }, `Plays in full in ${playAppName()}${more}`);

// Apple's credit, with links to both apps (Play uses the one chosen in Me).
function creditLine(classicalURL, musicURL) {
  return h('p', { class: 'listen-credit' }, APPLE_CREDIT, ' ',
    h('a', { href: classicalURL, target: '_blank', rel: 'noopener' }, 'Apple Music Classical'), ' · ',
    h('a', { href: musicURL, target: '_blank', rel: 'noopener' }, 'Apple Music'), '.');
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
    class: 'input', type: 'text', value, placeholder: 'Playlist name', 'aria-label': 'Playlist name',
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

// ---------- album sheet: tracks, each opening in Apple Music Classical / Apple Music ----------
export function openAlbumSheet(album) {
  const id = album.id;
  const work = album.workId ? repo.work(album.workId) : null;
  const composerName = work ? repo.composer(work.composerId)?.name || null : null;
  const whole = albumPiece(album, album.workId ? { workId: album.workId } : {});
  let closed = false;
  let now = null; // Now listening (applemusic.js)

  const tracksEl = h('div', { class: 'track-list lib-tracks' }, [0, 1, 2, 3].map(() => h('div', { class: 'skeleton listen-skel-row' })));
  const libBtn = h('button', { class: 'btn small lib-remove', type: 'button', onclick: toggleInLibrary });

  function paintLibBtn() {
    const on = store.hasAlbum(id);
    libBtn.classList.toggle('add', !on);
    libBtn.replaceChildren(icon(on ? 'minus' : 'plus', 14), on ? 'Remove from Library' : 'Add to Library');
  }

  function toggleInLibrary() {
    const on = store.toggleAlbum({
      id, title: album.title, artist: album.artist || '', artwork: album.artwork || null,
      url: album.url || null, year: album.year || '', workId: album.workId || null,
    });
    toast(on ? 'Added to Library' : 'Removed from Library');
    paintLibBtn();
  }

  const body = h('div', { class: 'lib-sheet' },
    h('div', { class: 'lib-sheet-head' }, albumCover(album, 'cv-xl', true)),
    h('div', { class: 'listen-actions lib-actions' },
      listenLink(whole, [icon('play', 13), 'Play album'], {
        cls: 'btn small primary lib-play', label: `Play the album ${album.title || ''} in ${playAppName()}`,
      }),
      saveButton(whole, { cls: 'btn small lib-save' })),
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
    title: album.title || 'Album',
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

  function trackRow(p, t, i, queue) {
    const label = `Play ${t.title} in ${playAppName()}`;
    const other = t.artist && album.artist && t.artist !== album.artist ? h('span', { class: 'ta' }, t.artist) : null;
    return h('div', { class: 'track-row', dataset: { track: String(t.id) } },
      h('span', { class: 'tn' }, t.track || ''),
      listenLink(p, icon('play', 13), { cls: 'play', queue, index: i, label }),
      quietLink(listenLink(p, [t.title, other], { cls: 'tt', queue, index: i, label })),
      h('span', { class: 'd' }, fmtDuration(t.durationMs)),
      saveButton(p, { cls: 'icon-btn lib-tsave', iconOnly: true }));
  }

  function load() {
    clear(tracksEl).append(...[0, 1, 2, 3].map(() => h('div', { class: 'skeleton listen-skel-row' })));
    albumTracks(id).then((res) => {
      if (closed) return;
      const tracks = res.tracks || [];
      if (res.album?.artwork) rememberArt(String(id), res.album.artwork);
      clear(tracksEl);
      if (!tracks.length) {
        tracksEl.append(h('p', { class: 'listen-msg' }, 'Apple Music lists no tracks for this album in Switzerland.'));
        return;
      }
      // Tracks of the album's saved work carry its composer (for playlists and the timeline).
      const ofWork = new Set(work ? (matchWorkTracks(work, tracks)?.tracks || []).map((t) => t.id) : []);
      const queue = tracks.map((t) => makePiece({
        title: t.title, composer: ofWork.has(t.id) ? composerName : null, workId: ofWork.has(t.id) ? work.id : null,
        artist: t.artist || album.artist || '', album: album.title || t.album || '', collectionId: id, trackId: t.id,
        artwork: t.artwork || album.artwork || null, year: album.year || res.album?.year || '',
      }));
      tracksEl.append(...tracks.map((t, i) => trackRow(queue[i], t, i, queue)));
      paintCurrent();
    }).catch((err) => {
      if (closed) return;
      clear(tracksEl).append(h('div', { class: 'listen-msg' },
        h('p', {}, `Couldn’t load the tracks${err?.message ? ` — ${err.message}` : ''}. Play album still opens it in ${playAppName()}.`),
        h('div', { class: 'listen-actions' }, h('button', { class: 'btn small', type: 'button', onclick: load }, 'Try again'))));
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
    title: w?.title || it.title || 'Untitled',
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
      'From the concert ', h('b', {}, concert.title), icon('chevron', 13))
    : p.articleId
      ? h('a', { class: 'pl-from', href: `#/article/${encodeURIComponent(p.articleId)}`, onclick: () => sheet.close() },
        'From the article', icon('chevron', 13))
      : null;
  const head = h('div', { class: 'lib-sheet-head' });
  const actions = h('div', { class: 'listen-actions lib-actions' });
  const caption = h('div', { class: 'lib-caption-slot' });
  const list = h('div', { class: 'pl-items' });
  const foot = h('div', { class: 'lib-sheet-foot' });
  const firstTerm = itemsOf(p).length ? itemTerm(itemsOf(p)[0]) : p.name || 'classical';

  const sheet = openSheet({
    title: p.name || 'Playlist',
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
    const t = sheet.el.querySelector('.sheet-header .t');
    const s = sheet.el.querySelector('.sheet-header .s');
    if (t) t.textContent = p.name || 'Playlist';
    if (s) s.textContent = playlistSub(p);
    sheet.el.setAttribute('aria-label', p.name || 'Playlist');
    head.replaceChildren(playlistCover(p, 'cv-xl'));
  }

  function libButton() {
    const on = store.hasPlaylist(p.id);
    return h('button', {
      class: ['btn', 'small', 'lib-remove', !on && 'add'], type: 'button',
      onclick: () => {
        const added = store.togglePlaylist(p);
        toast(added ? 'Playlist added to Library' : 'Playlist removed from Library');
        paint();
      },
    }, icon(on ? 'minus' : 'plus', 14), on ? 'Remove' : 'Add to Library');
  }

  // Play all: the first piece, with the rest queued — the mini player's ⏭ opens the next one.
  function paintActions(ps) {
    const n = ps.length;
    const kids = [];
    if (n) {
      kids.push(listenLink(ps[0], [icon('play', 13), 'Play all'], {
        cls: 'btn small primary pl-playall', queue: ps, index: 0,
        label: `Play all ${plural(n, user ? 'piece' : 'work')} in ${playAppName()}, starting with ${ps[0].title}`,
      }));
    }
    if (user) {
      if (n) {
        kids.push(h('button', {
          class: ['btn', 'small', editing && 'on'], type: 'button', 'aria-pressed': editing ? 'true' : 'false',
          onclick: () => {
            editing = !editing;
            paint();
          },
        }, editing ? 'Done' : 'Edit'));
      }
    } else {
      kids.push(libButton());
    }
    actions.replaceChildren(...kids);
    caption.replaceChildren(n ? playCaption(n > 1 ? ' · ⏭ in the player opens the next piece' : '') : '');
  }

  function recLine(it, piece) {
    const key = itemKey(it);
    if (it.kind === 'album') return ['Album', piece.artist, piece.year].filter(Boolean).join(' · ');
    if (piece.artist) return [piece.artist, piece.year].filter(Boolean).join(' · ');
    if (failed.has(key)) return `Couldn’t reach Apple Music — Play searches ${playAppName()}`;
    if (found.has(key) && !found.get(key)) return `No recording found — Play searches ${playAppName()}`;
    if (needsLookup(it)) return 'Finding a recording…';
    return '';
  }

  function itemRow(it, i, ps) {
    const w = itemWork(it);
    const piece = ps[i];
    const n = ps.length;
    const label = `Play ${piece.title} in ${playAppName()}`;
    const text = h('div', { class: 'txt' },
      piece.composer ? h('div', { class: 'pl-comp' }, piece.composer) : null,
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
          class: 'pl-move', type: 'button', disabled: i === 0, 'aria-label': `Move ${piece.title} up`,
          onclick: () => store.moveInPlaylist(id, it.id, -1),
        }, h('span', { class: 'pl-up' }, icon('down', 16))),
        h('button', {
          class: 'pl-move', type: 'button', disabled: i === n - 1, 'aria-label': `Move ${piece.title} down`,
          onclick: () => store.moveInPlaylist(id, it.id, 1),
        }, icon('down', 16)),
        h('button', {
          class: 'pl-remove', type: 'button', 'aria-label': `Remove ${piece.title} from this playlist`,
          onclick: () => {
            store.togglePlaylistItem(id, it);
            toast(`Removed from “${p.name}”`);
          },
        }, icon('minus', 15)));
    } else {
      right.push(
        saveButton(piece, { cls: 'pl-save', iconOnly: true }),
        listenLink(piece, icon('play', 13), { cls: 'play', queue: ps, index: i, label }));
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
    const del = h('button', { class: 'btn small lib-remove pl-delete', type: 'button' }, 'Delete playlist');
    del.addEventListener('click', () => {
      if (!del.classList.contains('armed')) {
        del.classList.add('armed');
        del.textContent = 'Tap again to delete';
        clearTimeout(armTimer);
        armTimer = setTimeout(() => {
          del.classList.remove('armed');
          del.textContent = 'Delete playlist';
        }, 4000);
        return;
      }
      const name = p.name;
      store.deletePlaylist(id); // the store event closes this sheet
      toast(`Deleted “${name}”`);
    });
    foot.replaceChildren(
      h('button', {
        class: 'btn small', type: 'button',
        onclick: () => nameSheet({
          title: 'Rename playlist', value: p.name || '', action: 'Save',
          onSave: (v) => {
            if (!v.trim()) return;
            store.renamePlaylist(id, v);
            toast('Playlist renamed');
          },
        }),
      }, 'Rename'),
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
        ? 'No pieces yet. Tap ＋ Save next to any recording or piece to add it here.'
        : 'This playlist has no works.')]));
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
    n ? h('span', { class: 'n' }, n.toLocaleString('en-US')) : null,
    icon('chevron', 16));
}

function recentTile(r) {
  if (r.type === 'album') {
    const a = r.item;
    return h('button', { class: 'lib-tile', type: 'button', onclick: () => openAlbumSheet(a), 'aria-label': `Album: ${a.title}${a.artist ? ` — ${a.artist}` : ''}` },
      albumCover(a, 'cv-lg'),
      h('div', { class: 't' }, a.title || 'Untitled'),
      h('div', { class: 's' }, a.artist || 'Album'));
  }
  const p = r.item;
  return h('button', { class: 'lib-tile', type: 'button', onclick: () => openPlaylistSheet(p), 'aria-label': `Playlist: ${p.name}` },
    playlistCover(p, 'cv-lg'),
    h('div', { class: 't' }, p.name || 'Playlist'),
    h('div', { class: 's' }, playlistSub(p)));
}

// "New playlist…": name it, then open it (fill it from any Save button).
function newPlaylist() {
  nameSheet({
    title: 'New playlist', action: 'Create',
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
      h('nav', { class: 'lib-nav', 'aria-label': 'Library' },
        navRow('#/library/albums', 'albums', 'Albums', albums.length),
        navRow('#/library/playlists', 'playlists', 'Playlists', playlists.length)),
      h('h2', { class: 'lib-h' }, 'Recently added'),
      recent.length
        ? h('div', { class: 'lib-grid' }, recent.map(recentTile))
        : h('div', { class: 'lib-soft-empty' },
          h('h3', {}, 'Nothing added recently'),
          h('p', {}, 'Your library has no recent additions.')));
  }

  const unsub = store.subscribe((topic) => {
    if (topic === 'library') paint();
  });
  paint();
  return {
    title: 'Library',
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
    placeholder: isAlbums ? 'Search albums' : 'Search playlists',
    'aria-label': isAlbums ? 'Search your albums' : 'Search your playlists',
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
    h('span', { class: 'main' }, h('span', { class: 't' }, 'New playlist…')));

  function sortLabel() {
    return SORTS[kind].find(([k]) => k === sort)?.[1] || 'Recently added';
  }

  function paintSortBtn() {
    sortBtn.setAttribute('aria-label', `Sort: ${sortLabel()}. Tap to change`);
    sortBtn.title = `Sorted by ${sortLabel().toLowerCase()}`;
  }

  function cycleSort() {
    const modes = SORTS[kind];
    const i = modes.findIndex(([k]) => k === sort);
    sort = modes[(i + 1) % modes.length][0];
    saveSort(kind, sort);
    paintSortBtn();
    toast(`Sorted by ${sortLabel().toLowerCase()}`);
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
        h('span', { class: 't' }, a.title || 'Untitled'),
        h('span', { class: 's' }, [a.artist, a.year].filter(Boolean).join(' · ') || 'Album')));
  }

  function playlistRow(p) {
    return h('button', { class: 'lib-item', type: 'button', onclick: () => openPlaylistSheet(p) },
      playlistCover(p, 'cv-sm'),
      h('span', { class: 'main' },
        h('span', { class: 't' }, p.name || 'Playlist'),
        h('span', { class: 's' }, playlistSub(p))));
  }

  function paintList() {
    const all = isAlbums ? store.libraryAlbums() : store.libraryPlaylists();
    searchWrap.hidden = all.length === 0;
    countEl.hidden = all.length === 0;
    if (!all.length) {
      const empty = isAlbums
        ? emptyState('album', 'No albums yet', 'Your library has no albums.')
        : emptyState('playlist', 'No playlists yet', 'Your library has no playlists.');
      empty.querySelector('.icon')?.replaceWith(libGlyph(isAlbums ? 'albums' : 'playlists', 34));
      clear(listEl).append(empty);
      return;
    }
    const list = sorted(all.filter(matches));
    clear(countEl).append(
      h('span', {}, q.trim() ? `${list.length.toLocaleString('en-US')} of ${plural(all.length, isAlbums ? 'album' : 'playlist')}` : plural(all.length, isAlbums ? 'album' : 'playlist')),
      h('span', {}, sortLabel()));
    if (!list.length) {
      clear(listEl).append(h('p', { class: 'search-hint' }, `Nothing matches “${q.trim()}”.`));
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
    title: isAlbums ? 'My albums' : 'My playlists',
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
