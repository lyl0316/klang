// Library tab — modelled on Sheng's Library tab (SPEC §3.9, screens library-01…03). Sheng shows
// the user's Apple Music library, which needs paid MusicKit; Klang keeps its own on-device
// library instead: Apple Music albums you add (store.toggleAlbum) and concert programmes saved as
// playlists (store.togglePlaylist). Albums play as 30-second iTunes previews with links to
// Apple Music / Apple Music Classical for full playback.
//
//   #/library            Albums › · Playlists › · Recently added
//   #/library/albums     "My albums"    — sort (Recently added / Title / Artist) + search
//   #/library/playlists  "My playlists" — sort (Recently added / Title) + search
//
// Exports (also used by the Activity timeline): openAlbumSheet(album), openPlaylistSheet(playlist)

import { h, icon, clear, toast, storage, normalize, plural } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { openSheet } from '../ui/sheet.js';
import { href, emptyState } from '../ui/components.js';
import { chosenTracks, matchWorkTracks } from '../ui/listen.js';
import '../ui/player.js'; // side effect: lets the full player record each queue for "Up next"
import {
  searchAlbums, albumTracks, player, playerState, artwork,
  appleMusicSearchURL, classicalAlbumURL, classicalSearchURL, ITUNES_CREDIT, fmtDuration,
} from '../music.js';

const RECENT_MAX = 20;
const SORT_KEY = 'klang.library.sort';
const ART_KEY = 'klang.library.art.v1';
const ART_TTL = 30 * 24 * 3600 * 1000;
const ART_MAX = 400;
const SORTS = {
  albums: [['recent', 'Recently added'], ['title', 'Title'], ['artist', 'Artist']],
  playlists: [['recent', 'Recently added'], ['title', 'Title']],
};

const sameId = (a, b) => a != null && b != null && String(a) === String(b);
const byText = (a, b) => String(a || '').localeCompare(String(b || ''), 'en', { sensitivity: 'base' });
const itemsOf = (p) => (Array.isArray(p?.items) ? p.items : []);
const playlistSub = (p) => `Playlist · ${plural(itemsOf(p).length, 'work')}`;

const extLink = (label, url, iconName = 'external', ariaLabel = null) =>
  h('a', { class: 'btn small', href: url, target: '_blank', rel: 'noopener', 'aria-label': ariaLabel }, icon(iconName, 14), label);

function creditLine(url, label) {
  return h('p', { class: 'listen-credit' }, ITUNES_CREDIT, ' ',
    h('a', { href: url, target: '_blank', rel: 'noopener' }, label), '.');
}

// ---------- artwork memory for generated playlist covers ----------
// Artwork URLs are iTunes metadata (cacheable); previews themselves are never stored.
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

// ---------- album sheet: tracks as previews + Apple Music links ----------
export function openAlbumSheet(album) {
  const id = album.id;
  const term = [album.artist, album.title].filter(Boolean).join(' ');
  let tracks = [];
  let closed = false;
  let unsub = null;

  const tracksEl = h('div', { class: 'track-list lib-tracks' }, [0, 1, 2, 3].map(() => h('div', { class: 'skeleton listen-skel-row' })));
  const playBtn = h('button', { class: 'btn small primary', type: 'button', disabled: true, onclick: playAll }, icon('play', 13), 'Play');
  const libBtn = h('button', { class: 'btn small lib-remove', type: 'button', onclick: toggleInLibrary });
  const amLink = extLink('Apple Music', album.url || appleMusicSearchURL(term), 'music', 'Open in Apple Music');

  function paintLibBtn() {
    const on = store.hasAlbum(id);
    libBtn.classList.toggle('add', !on);
    libBtn.replaceChildren(icon(on ? 'minus' : 'plus', 14), on ? 'Remove from Library' : 'Add to Library');
  }

  function toggleInLibrary() {
    const on = store.toggleAlbum(album);
    toast(on ? 'Added to Library' : 'Removed from Library');
    paintLibBtn();
  }

  const body = h('div', { class: 'lib-sheet' },
    h('div', { class: 'lib-sheet-head' }, albumCover(album, 'cv-xl', true)),
    h('div', { class: 'listen-actions lib-actions' },
      playBtn,
      amLink,
      extLink('Apple Music Classical', classicalAlbumURL(id), 'external', 'Open in Apple Music Classical')),
    tracksEl,
    h('div', { class: 'lib-sheet-foot' }, libBtn));
  paintLibBtn();

  const sheet = openSheet({
    title: album.title || 'Album',
    subtitle: [album.artist, album.year].filter(Boolean).join(' · ') || null,
    body,
    footer: creditLine(classicalAlbumURL(id), 'Open in Apple Music Classical'),
    onClose: () => {
      closed = true;
      unsub?.();
    },
  });

  function trackRow(t) {
    return h('div', { class: 'track-row', dataset: { id: String(t.id), name: t.title || '' } },
      h('span', { class: 'tn' }, t.track || ''),
      h('button', {
        class: 'play', type: 'button', disabled: !t.preview,
        'aria-label': t.preview ? `Play preview: ${t.title}` : `No preview: ${t.title}`,
        onclick: () => {
          const st = playerState();
          if (st.track && sameId(st.track.id, t.id)) player.toggle();
          else player.play(t, tracks);
        },
      }, icon('play', 13)),
      h('div', { class: 'tt', title: t.title }, t.title,
        t.artist && album.artist && t.artist !== album.artist ? h('div', { class: 'ta' }, t.artist) : null),
      h('span', { class: 'd' }, fmtDuration(t.durationMs)));
  }

  function paintPlaying(st) {
    for (const row of tracksEl.querySelectorAll('.track-row')) {
      const isCurrent = !!st.track && String(st.track.id) === row.dataset.id;
      const playing = isCurrent && st.playing;
      row.classList.toggle('current', isCurrent);
      row.classList.toggle('playing', playing);
      const btn = row.querySelector('.play');
      if (!btn || btn.disabled) continue;
      btn.replaceChildren(icon(playing ? 'pause' : 'play', 13));
      btn.setAttribute('aria-label', `${playing ? 'Pause' : 'Play preview'}: ${row.dataset.name}`);
    }
  }

  function playAll() {
    const list = tracks.filter((t) => t.preview);
    if (!list.length) {
      toast('No previews on this album');
      return;
    }
    const st = playerState();
    if (st.track && list.some((t) => sameId(t.id, st.track.id))) {
      if (!st.playing) player.toggle();
      return;
    }
    player.play(list[0], list);
  }

  function load() {
    clear(tracksEl).append(...[0, 1, 2, 3].map(() => h('div', { class: 'skeleton listen-skel-row' })));
    albumTracks(id).then((res) => {
      if (closed) return;
      tracks = res.tracks || [];
      if (!album.url && res.album?.url) amLink.href = res.album.url;
      if (res.album?.artwork) rememberArt(String(id), res.album.artwork);
      clear(tracksEl);
      if (!tracks.length) {
        tracksEl.append(h('p', { class: 'listen-msg' }, 'Apple Music lists no tracks for this album in Switzerland.'));
      } else {
        tracksEl.append(...tracks.map(trackRow));
      }
      playBtn.disabled = !tracks.some((t) => t.preview);
      if (!unsub) unsub = player.subscribe(paintPlaying);
      else paintPlaying(playerState());
    }).catch((err) => {
      if (closed) return;
      clear(tracksEl).append(h('div', { class: 'listen-msg' },
        h('p', {}, `Couldn’t load the tracks${err?.message ? ` — ${err.message}` : ''}.`),
        h('div', { class: 'listen-actions' }, h('button', { class: 'btn small', type: 'button', onclick: load }, 'Try again'))));
    });
  }
  load();
  return sheet;
}

// ---------- playlist sheet: the concert programme, one recording per work ----------
const resolved = new Map(); // item key -> Promise<{ album, tracks } | null> (session only)
const itemKey = (it) => `${it.workId || ''}|${it.collectionId || ''}|${it.composer || ''}|${it.title || ''}`;

function itemTerm(it) {
  const w = it.workId ? repo.work(it.workId) : null;
  const comp = w ? repo.composer(w.composerId) : null;
  return w?.q || [comp?.short || it.composer, w?.title || it.title].filter(Boolean).join(' ');
}

// Find a recording of a playlist entry: the album saved with it, else the work's chosen
// version (Listen), else the first iTunes search hit. Only tracks with previews count.
function resolveItem(it) {
  const key = itemKey(it);
  if (resolved.has(key)) return resolved.get(key);
  const p = (async () => {
    const w = it.workId ? repo.work(it.workId) : null;
    let album = null;
    let tracks = [];
    if (it.collectionId) {
      const res = await albumTracks(it.collectionId);
      album = res.album;
      const m = w ? matchWorkTracks(w, res.tracks) : null;
      tracks = m ? m.tracks : res.tracks;
    } else if (w) {
      ({ album, tracks } = await chosenTracks(w));
    } else {
      const term = itemTerm(it);
      if (!term) return null;
      const albums = await searchAlbums(term, 5);
      if (!albums.length) return null;
      album = albums[0];
      tracks = (await albumTracks(album.id)).tracks;
    }
    tracks = (tracks || []).filter((t) => t.preview);
    if (!tracks.length) return null;
    const art = album?.artwork || tracks[0].artwork;
    if (art) {
      if (album?.id) rememberArt(String(album.id), art);
      if (it.workId) rememberArt(`work:${it.workId}`, art);
    }
    return { album, tracks };
  })();
  resolved.set(key, p);
  p.catch(() => resolved.delete(key)); // let a later tap retry after a network error
  return p;
}

export function openPlaylistSheet(playlist) {
  const p = playlist;
  const items = itemsOf(p);
  const concert = p.concertId ? repo.concert(p.concertId) : null;
  const state = items.map(() => ({ status: 'idle', res: null })); // idle | loading | ready | none
  const rows = [];
  let closed = false;
  let playRun = 0;
  let unsub = null;

  const status = h('p', { class: 'pl-status', role: 'status' });
  const playBtn = h('button', { class: 'btn small primary', type: 'button', disabled: !items.length, onclick: playAll }, icon('play', 13), 'Play');
  const libBtn = h('button', { class: 'btn small lib-remove', type: 'button', onclick: toggleInLibrary });
  const firstTerm = items.length ? itemTerm(items[0]) : p.name || '';

  function paintLibBtn() {
    const on = store.hasPlaylist(p.id);
    libBtn.classList.toggle('add', !on);
    libBtn.replaceChildren(icon(on ? 'minus' : 'plus', 14), on ? 'Remove' : 'Add to Library');
  }

  function toggleInLibrary() {
    const on = store.togglePlaylist(p);
    toast(on ? 'Playlist added to Library' : 'Playlist removed from Library');
    paintLibBtn();
  }

  function itemRow(it, i) {
    const w = it.workId ? repo.work(it.workId) : null;
    const comp = w ? repo.composer(w.composerId) : null;
    const composerName = comp?.name || it.composer || '';
    const title = w?.title || it.title || 'Untitled';
    const rec = h('div', { class: 'pl-rec' });
    const ext = h('span', { class: 'pl-slot' });
    const btn = h('button', { class: 'play', type: 'button', 'aria-label': `Play ${title}`, onclick: () => playItem(i) }, icon('play', 13));
    const text = h('div', { class: 'txt' },
      composerName ? h('div', { class: 'pl-comp' }, composerName) : null,
      h('div', { class: 'pl-title' }, title),
      rec);
    const main = w
      ? h('a', { class: 'pl-main', href: href.work(w.id), onclick: () => sheet.close() }, text, icon('chevron', 15))
      : h('div', { class: 'pl-main' }, text);
    const row = h('div', { class: 'pl-item', dataset: { i: String(i) } }, h('span', { class: 'pl-n' }, i + 1), main, ext, btn);
    rows[i] = { row, rec, ext, btn, title };
    return row;
  }

  function paintRow(i) {
    const r = rows[i];
    const s = state[i];
    if (!r) return;
    r.row.classList.toggle('loading', s.status === 'loading');
    r.row.classList.toggle('none', s.status === 'none');
    if (s.status === 'ready' && s.res.album) {
      const a = s.res.album;
      r.rec.textContent = [a.artist, a.year].filter(Boolean).join(' · ');
      if (!r.ext.firstChild && a.id) {
        r.ext.append(h('a', { class: 'pl-ext', href: classicalAlbumURL(a.id), target: '_blank', rel: 'noopener', 'aria-label': `Open ${r.title} in Apple Music Classical` }, icon('external', 14)));
      }
    } else if (s.status === 'none') {
      r.rec.textContent = 'No preview found';
    }
  }

  async function resolveRow(i) {
    const s = state[i];
    if (s.status === 'ready') return s.res;
    if (s.status === 'none') return null;
    s.status = 'loading';
    paintRow(i);
    let res = null;
    try {
      res = await resolveItem(items[i]);
    } catch (err) {
      res = null;
      s.status = 'idle'; // network error: allow another try
      const r = rows[i];
      if (!closed && r) {
        r.row.classList.remove('loading');
        r.rec.textContent = 'Couldn’t reach Apple Music — tap ▶ to retry';
      }
      return null;
    }
    s.res = res;
    s.status = res ? 'ready' : 'none';
    if (!closed) {
      paintRow(i);
      paintPlaying(playerState());
    }
    return res;
  }

  async function playItem(i) {
    const st = playerState();
    const s = state[i];
    if (st.track && s.res?.tracks.some((t) => sameId(t.id, st.track.id))) {
      player.toggle();
      return;
    }
    const res = await resolveRow(i);
    if (closed) return;
    if (!res) {
      toast(state[i].status === 'none' ? 'No preview found for this work' : 'Couldn’t reach Apple Music');
      return;
    }
    player.play(res.tracks[0], res.tracks);
  }

  // Play: the first track of each work, queued in programme order as recordings are found.
  async function playAll() {
    const run = ++playRun;
    const queue = [];
    let started = false;
    playBtn.disabled = true;
    for (let i = 0; i < items.length; i += 1) {
      if (closed || run !== playRun) return;
      status.textContent = `Finding recordings… ${i + 1}/${items.length}`;
      const res = await resolveRow(i);
      if (closed || run !== playRun) return;
      const first = res?.tracks[0];
      if (!first) continue;
      queue.push(first);
      if (!started) {
        player.play(first, queue.slice());
        started = true;
      } else {
        const st = playerState();
        if (st.playing && st.track && queue.some((t) => sameId(t.id, st.track.id))) {
          player.play(st.track, queue.map((t) => (sameId(t.id, st.track.id) ? st.track : t)));
        }
      }
    }
    playBtn.disabled = false;
    const missing = items.length - queue.length;
    status.textContent = !started
      ? 'No previews found for these works.'
      : `${plural(queue.length, 'work')} queued — first movement of each${missing ? ` · ${missing} without a preview` : ''}`;
  }

  function paintPlaying(st) {
    rows.forEach((r, i) => {
      if (!r) return;
      const res = state[i].res;
      const isCurrent = !!st.track && !!res && res.tracks.some((t) => sameId(t.id, st.track.id));
      const playing = isCurrent && st.playing;
      r.row.classList.toggle('current', isCurrent);
      r.row.classList.toggle('playing', playing);
      r.btn.replaceChildren(icon(playing ? 'pause' : 'play', 13));
      r.btn.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${r.title}`);
    });
  }

  const body = h('div', { class: 'lib-sheet' },
    h('div', { class: 'lib-sheet-head' }, playlistCover(p, 'cv-xl')),
    concert
      ? h('a', { class: 'pl-from', href: href.concert(concert.id), onclick: () => sheet.close() },
        'From the concert ', h('b', {}, concert.title), icon('chevron', 13))
      : null,
    h('div', { class: 'listen-actions lib-actions' }, playBtn, libBtn),
    status,
    items.length
      ? h('div', { class: 'pl-items' }, items.map(itemRow))
      : h('p', { class: 'listen-msg pl-none' }, 'This playlist has no works.'));
  paintLibBtn();

  const sheet = openSheet({
    title: p.name || 'Playlist',
    subtitle: playlistSub(p),
    body,
    footer: creditLine(classicalSearchURL(firstTerm || 'classical'), 'Search Apple Music Classical'),
    onClose: () => {
      closed = true;
      playRun += 1;
      unsub?.();
    },
  });
  unsub = player.subscribe(paintPlaying);
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
      : [x.name, ...itemsOf(x).flatMap((it) => [it.title, it.composer, it.workId ? repo.work(it.workId)?.title : null])];
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
        h('span', { class: 's' }, 'Playlist')));
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
    body: h('div', { class: 'lib-page lib-sub' }, searchWrap, countEl, listEl),
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
