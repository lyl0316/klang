// Shared "Listen" block (work pages), modelled on Sheng's Listen carousel, plus the Versions sheet
// (also used by the concert page). Recordings ("versions") of a work come from the free iTunes
// Search API; you choose one (remembered per work). Klang plays no audio itself: Listen and every
// track open the piece in Apple Music Classical / Apple Music (applemusic.js), where it plays in full
// with the listener's own subscription. Save puts the piece or its album in the Library (ui/save.js).
//
// Apple terms: every block shows APPLE_CREDIT plus links to Apple Music Classical / Apple Music.
//
// API:
//   listenSection(work, { title = 'Listen' }) -> HTMLElement   (lazy: loads when scrolled near)
//   openVersionsSheet(work, onChoose)                          (rail of all recordings)
// Extras:
//   searchTerm(work), matchWorkTracks(work, tracks),
//   chosenTracks(work) -> Promise<{ album, tracks, matched }>  (the work's tracks of the chosen version)
//   chosenPiece(work)  -> Promise<piece>                       (that version as a playable piece)

import { h, icon, clear, toast, normalize, plural } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { searchAlbums, albumTracks, fmtDuration } from '../music.js';
import {
  APPLE_CREDIT, albumURL, searchURL, listenLink, onListening, makePiece, workPiece, albumPiece, playApp, playAppName,
} from '../applemusic.js';
import { openSaveSheet, saveButton } from './save.js';
import { openSheet } from './sheet.js';
import { sectionHead } from './components.js';

const SEARCH_LIMIT = 25; // one cached search serves both the carousel and the Versions sheet
const CAROUSEL_MAX = 10;
const TRACKS_COLLAPSED = 6;

// ---------- helpers ----------
export function searchTerm(work) {
  const comp = repo.composer(work.composerId);
  return work.q || [comp?.short, work.title].filter(Boolean).join(' ');
}

function workLabel(work) {
  const comp = repo.composer(work.composerId);
  return [comp?.short, work.title].filter(Boolean).join(' · ');
}

const composerOf = (work) => repo.composer(work.composerId)?.short || null;

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

function pickChosen(work, albums) {
  const id = store.listenChoice(work.id);
  return albums.find((a) => sameId(a.id, id)) || albums[0] || null;
}

// Space-padded token string, so `includes(' op 12 ')` respects word boundaries.
const tok = (s) => ` ${normalize(s || '').replace(/[^a-z0-9]+/g, ' ').trim()} `;

function workKeys(work) {
  const keys = [];
  if (work.catalog) keys.push(tok(work.catalog)); // "BWV 248" -> " bwv 248 "
  const base = (work.title || '').split(/[“”"«»《》(,:]/)[0]; // "Symphony No. 9" from longer titles
  if (base.trim().length >= 6) keys.push(tok(base));
  return keys.filter((k) => k.trim().length >= 3);
}

// Albums often hold several works: keep the tracks that belong to this one (by catalogue
// number, then by title). Returns { tracks, key } or null when nothing matches.
export function matchWorkTracks(work, tracks) {
  for (const key of workKeys(work)) {
    const hit = tracks.filter((t) => tok(t.title).includes(key));
    if (hit.length) return { tracks: hit, key };
  }
  return null;
}

// "Symphony No. 9 in D Minor, Op. 125: IV. Presto" -> "IV. Presto" (only when the prefix is this work)
function movementLabel(title, key) {
  const i = title.indexOf(': ');
  if (key && i > 0 && tok(title.slice(0, i)).includes(key)) {
    const rest = title.slice(i + 2).trim();
    if (rest.length > 1) return rest;
  }
  return title;
}

// Tracks of the chosen recording that belong to the work, or the whole album when none match.
// `matched` says they are the work's own tracks, so tracks[0] is its first movement.
export async function chosenTracks(work) {
  const albums = await searchAlbums(searchTerm(work), SEARCH_LIMIT);
  const album = pickChosen(work, albums);
  if (!album) return { album: null, tracks: [], matched: false };
  const { tracks } = await albumTracks(album.id);
  const m = matchWorkTracks(work, tracks);
  return { album, tracks: m ? m.tracks : tracks, matched: !!m };
}

// The chosen recording of a work as a piece: from its first movement when it can be found, else
// the album (or an Apple Music search when there is no recording at all).
export async function chosenPiece(work) {
  const { album, tracks, matched } = await chosenTracks(work);
  return workPiece(work, composerOf(work), album, matched ? tracks[0] : null);
}

const extLink = (label, url, iconName = 'external', ariaLabel = null) =>
  h('a', { class: 'btn small', href: url, target: '_blank', rel: 'noopener', 'aria-label': ariaLabel }, icon(iconName, 14), label);

function creditLine(term) {
  return h('p', { class: 'listen-credit' }, APPLE_CREDIT, ' ',
    h('a', { href: searchURL(term, 'classical'), target: '_blank', rel: 'noopener' }, 'Search Apple Music Classical'), ' · ',
    h('a', { href: searchURL(term, 'music'), target: '_blank', rel: 'noopener' }, 'Apple Music'), '.');
}

const otherApp = () => (playApp() === 'music' ? 'classical' : 'music');

// ---------- Listen section ----------
export function listenSection(work, { title = 'Listen' } = {}) {
  const term = searchTerm(work);
  const label = workLabel(work);
  const comp = composerOf(work);
  const root = h('section', { class: 'section listen-section', dataset: { work: work.id } });
  const body = h('div', { class: 'listen-body' });
  root.append(sectionHead(title), body);

  const carousel = h('div', { class: 'h-scroll listen-carousel', 'aria-label': `Recordings of ${label}` });
  const now = h('div', { class: 'listen-now' });
  const trackList = h('div', { class: 'track-list' });
  const actions = h('div', { class: 'listen-actions' });

  let albums = null;
  let chosen = null;
  let allTracks = [];
  let workMatch = null;
  let mode = 'work'; // 'work' = only this work's tracks, 'album' = whole album
  let expanded = false;
  let tracksReady = false;
  let trackToken = 0;
  let currentTrackId = null; // Now listening, when it is a track of this section
  let loading = false;
  let unsubs = [];
  let seenConnected = false;

  // Subscriptions end themselves once the section has left the page.
  function alive() {
    if (root.isConnected) {
      seenConnected = true;
      return true;
    }
    if (!seenConnected) return true; // not attached yet
    unsubs.forEach((u) => u());
    unsubs = [];
    return false;
  }

  function watch() {
    if (unsubs.length) return;
    unsubs.push(store.subscribe((topic) => {
      if (!alive() || !albums) return; // alive() first: unsubscribes on any topic once detached
      if (topic === 'listen') applyChoice(pickChosen(work, albums));
      else if (topic === 'prefs') { // links follow the "Play in" choice
        paintActions();
        if (tracksReady) paintTracks();
      }
    }));
    unsubs.push(onListening((L) => {
      if (!alive()) return;
      currentTrackId = L.current && L.current.kind !== 'album' ? L.current.trackId ?? null : null;
      paintCurrent();
    }));
  }

  // The piece Listen opens: the work from its first movement (the album until the tracks are in),
  // or the whole album while the whole album is listed.
  function listenPiece() {
    if (mode === 'album' && workMatch && workMatch.tracks.length < allTracks.length) return albumPiece(chosen);
    return workPiece(work, comp, chosen, workMatch?.tracks[0] || null);
  }

  function paintLoading() {
    clear(body).append(
      h('div', { class: 'h-scroll', 'aria-busy': 'true' },
        [0, 1, 2].map(() => h('div', { class: 'album-card' }, h('div', { class: 'art skeleton' }), h('div', { class: 'skeleton listen-skel-line' })))),
      h('p', { class: 'sr-only', role: 'status' }, 'Loading recordings…'));
  }

  async function load() {
    if (loading || albums) return;
    loading = true;
    paintLoading();
    try {
      albums = await searchAlbums(term, SEARCH_LIMIT);
    } catch (err) {
      albums = null;
      loading = false;
      paintError(err);
      return;
    }
    loading = false;
    if (!albums.length) {
      paintEmpty();
      return;
    }
    chosen = pickChosen(work, albums);
    clear(body).append(carousel, now, trackList, actions, creditLine(term));
    paintCarousel();
    paintNow();
    paintActions();
    watch();
    loadTracks();
  }

  function paintError(err) {
    clear(body).append(h('div', { class: 'listen-msg' },
      h('p', {}, `Couldn’t load recordings${err?.message ? ` — ${err.message}` : ''}.`),
      h('div', { class: 'listen-actions' },
        h('button', { class: 'btn small', type: 'button', onclick: load }, 'Try again'),
        extLink('Search Apple Music Classical', searchURL(term, 'classical'))),
      creditLine(term)));
  }

  function paintEmpty() {
    clear(body).append(h('div', { class: 'listen-msg' },
      h('p', {}, 'No recordings of this work found on Apple Music.'),
      h('div', { class: 'listen-actions' },
        extLink('Search Apple Music Classical', searchURL(term, 'classical')),
        extLink('Apple Music', searchURL(term, 'music'), 'music', 'Search Apple Music')),
      creditLine(term)));
  }

  // ----- carousel of versions -----
  function albumCard(a) {
    const on = !!chosen && sameId(a.id, chosen.id);
    return h('button', {
      class: ['album-card', on && 'chosen'],
      type: 'button',
      dataset: { id: String(a.id) },
      'aria-pressed': on ? 'true' : 'false',
      'aria-label': `${a.artist}: ${a.title}${a.year ? `, ${a.year}` : ''}${on ? ' (chosen version)' : ''}`,
      onclick: () => {
        if (on) return;
        applyChoice(a);
        store.setListenChoice(work.id, a.id);
      },
    },
    a.artwork ? h('img', { class: 'art', src: a.artwork, alt: '', loading: 'lazy' }) : h('div', { class: 'art more' }, icon('music', 26)),
    h('div', { class: 't' }, a.artist),
    h('div', { class: 's' }, [a.title, a.year].filter(Boolean).join(' · ')));
  }

  function paintCarousel() {
    let list = albums.slice(0, CAROUSEL_MAX);
    if (chosen && !list.some((a) => sameId(a.id, chosen.id))) list = [chosen, ...list.slice(0, CAROUSEL_MAX - 1)];
    clear(carousel).append(...list.map(albumCard));
    if (albums.length > list.length) {
      carousel.append(h('button', { class: 'album-card', type: 'button', onclick: openVersions, 'aria-label': `All ${albums.length} versions` },
        h('div', { class: 'art more' }, icon('list', 26)),
        h('div', { class: 't' }, `All ${albums.length} versions`),
        h('div', { class: 's' }, 'Choose a recording')));
    }
    requestAnimationFrame(() => {
      const el = carousel.querySelector('.album-card.chosen');
      if (!el || carousel.scrollWidth <= carousel.clientWidth) return;
      const left = el.offsetLeft - carousel.offsetLeft; // position inside the scroller
      const view = carousel.scrollLeft;
      if (left - 16 < view || left + el.offsetWidth > view + carousel.clientWidth) carousel.scrollLeft = Math.max(0, left - 16);
    });
  }

  function paintNow() {
    clear(now).append(
      h('span', { class: 'k' }, 'Selected'),
      h('span', { class: 'v' }, h('b', {}, chosen.artist), chosen.title ? ` · ${chosen.title}` : ''));
  }

  // Listen (in the chosen app) · Save · Versions · the album in the other app
  function paintActions() {
    if (!chosen) return;
    const p = listenPiece();
    const app = playAppName();
    const other = otherApp();
    clear(actions).append(
      listenLink(p, [icon('play', 13), p.kind === 'album' ? 'Play album' : 'Listen'], {
        cls: 'btn small primary',
        label: p.kind === 'album' ? `Play the whole album in ${app}` : `Listen to ${label} (${chosen.artist}) in ${app}`,
      }),
      saveButton(p),
      h('button', { class: 'btn small', type: 'button', onclick: openVersions, 'aria-label': `Versions: ${plural(albums.length, 'recording')}` },
        icon('list', 15), 'Versions', h('span', { class: 'count' }, albums.length)),
      extLink(playAppName(other), albumURL(chosen.id, null, other), other === 'music' ? 'music' : 'external', `Open the album in ${playAppName(other)}`));
  }

  function openVersions() {
    openVersionsSheet(work, (a) => applyChoice(a));
  }

  function applyChoice(a) {
    if (!a || (chosen && sameId(a.id, chosen.id))) return;
    if (albums && !albums.some((x) => sameId(x.id, a.id))) albums = [a, ...albums];
    chosen = a;
    if (!albums) return;
    paintCarousel();
    paintNow();
    loadTracks();
  }

  // ----- tracks of the chosen version -----
  function listedTracks() {
    return mode === 'work' && workMatch ? workMatch.tracks : allTracks;
  }

  async function loadTracks() {
    const token = ++trackToken;
    const album = chosen;
    allTracks = [];
    workMatch = null;
    mode = 'work';
    expanded = false;
    tracksReady = false;
    clear(trackList).append(...[0, 1, 2].map(() => h('div', { class: 'skeleton listen-skel-row' })));
    paintActions(); // Listen opens the album until the tracks are in
    try {
      const res = await albumTracks(album.id);
      if (token !== trackToken) return;
      allTracks = res.tracks;
      workMatch = matchWorkTracks(work, allTracks);
      if (!workMatch || workMatch.tracks.length === allTracks.length) mode = 'album';
      tracksReady = true;
      paintTracks();
    } catch (err) {
      if (token !== trackToken) return;
      clear(trackList).append(h('div', { class: 'listen-msg' },
        h('p', {}, 'Couldn’t load the tracks of this recording.'),
        h('div', { class: 'listen-actions' },
          h('button', { class: 'btn small', type: 'button', onclick: loadTracks }, 'Try again'),
          extLink('Open the album', albumURL(album.id)))));
    }
    paintActions();
  }

  function paintTracks() {
    const list = listedTracks();
    clear(trackList);
    if (!list.length) {
      trackList.append(h('p', { class: 'listen-msg' }, 'No tracks listed for this recording.'));
      return;
    }
    const key = mode === 'work' && workMatch ? workMatch.key : null;
    const visible = expanded ? list : list.slice(0, TRACKS_COLLAPSED);
    for (const t of visible) trackList.append(trackRow(t, key));
    const more = [];
    if (list.length > TRACKS_COLLAPSED) {
      more.push(h('button', { class: 'btn small', type: 'button', 'aria-expanded': expanded ? 'true' : 'false', onclick: () => { expanded = !expanded; paintTracks(); } },
        expanded ? 'Show fewer' : `Show all ${list.length} tracks`));
    }
    if (workMatch && workMatch.tracks.length < allTracks.length) {
      more.push(h('button', { class: 'btn small', type: 'button', onclick: () => { mode = mode === 'work' ? 'album' : 'work'; expanded = false; paintTracks(); paintActions(); } },
        mode === 'work' ? `Whole album · ${allTracks.length}` : 'Only this work'));
    }
    if (more.length) trackList.append(h('div', { class: 'track-more' }, more));
    paintCurrent();
  }

  // Each track is a link that opens the album at that track in Apple Music Classical / Apple Music.
  function trackRow(t, key) {
    const name = movementLabel(t.title || '', key);
    const inWork = !!workMatch && workMatch.tracks.includes(t);
    const p = makePiece({
      title: t.title || name, composer: inWork ? comp : null, workId: inWork ? work.id : null,
      artist: t.artist || chosen.artist || '', album: chosen.title || t.album || '',
      collectionId: chosen.id, trackId: t.id, artwork: chosen.artwork || t.artwork || null, year: chosen.year || '',
    });
    return h('div', { class: 'track-row', dataset: { id: String(t.id) } },
      listenLink(p, icon('play', 13), { cls: 'play', label: `Play ${name} in ${playAppName()}` }),
      h('div', { class: 'tt', title: t.title }, name,
        t.artist && t.artist !== chosen.artist ? h('div', { class: 'ta' }, t.artist) : null),
      h('span', { class: 'd' }, fmtDuration(t.durationMs)));
  }

  // Marks the track last opened in Apple Music (Now listening), if it is one of these.
  function paintCurrent() {
    for (const row of trackList.querySelectorAll('.track-row')) {
      row.classList.toggle('current', currentTrackId != null && row.dataset.id === String(currentTrackId));
    }
  }

  // ----- lazy start -----
  paintLoading();
  if (typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        load();
      }
    }, { rootMargin: '300px 0px' });
    io.observe(root);
  } else {
    load();
  }
  return root;
}

// ---------- Versions sheet ----------
// Tap a cover to make it your version (remembered per work). Under each cover: ▶ Play opens that
// recording in Apple Music Classical / Apple Music, + Save puts it in the Library.
export function openVersionsSheet(work, onChoose) {
  const term = searchTerm(work);
  const comp = composerOf(work);
  let closed = false;
  const body = h('div', { class: 'versions' },
    h('div', { class: 'versions-grid', 'aria-busy': 'true' }, Array.from({ length: 9 }, () => h('div', { class: 'skeleton version-skel' }))));
  const sheet = openSheet({
    title: workLabel(work),
    subtitle: 'Versions · All recordings',
    body,
    footer: creditLine(term),
    onClose: () => { closed = true; },
  });
  sheet.el.classList.add('versions-sheet'); // Sheng: kicker above the title, two-row rail of covers

  const playLink = (a, piece) => listenLink(piece, [icon('play', 10), h('span', {}, 'Play')], {
    cls: 'version-act play',
    label: `Play ${a.artist}’s recording${a.year ? ` (${a.year})` : ''} in ${playAppName()}`,
  });

  const pieces = new Map(); // album id -> piece (upgraded to start at the work once its tracks are known)
  function versionCard(a, on) {
    const piece = workPiece(work, comp, a, null);
    pieces.set(String(a.id), piece);
    return h('div', { class: ['version-card', on && 'chosen'], role: 'listitem', dataset: { id: String(a.id) } },
      h('button', {
        class: 'version-pick',
        type: 'button',
        'aria-pressed': on ? 'true' : 'false',
        'aria-label': `${a.artist}${a.year ? `, ${a.year}` : ''}: ${a.title}${on ? ' (your version)' : ' — make it your version'}`,
        onclick: () => {
          store.setListenChoice(work.id, a.id);
          onChoose?.(a);
          sheet.close();
          if (!on) toast(`Your version: ${a.artist}`);
        },
      },
      a.artwork ? h('img', { src: a.artwork, alt: '', loading: 'lazy' }) : h('div', { class: 'ph' }, icon('music', 22)),
      h('div', { class: 't' }, a.artist),
      h('div', { class: 's' }, [a.year, a.title].filter(Boolean).join(' · '))),
      h('div', { class: 'version-acts' },
        playLink(a, piece),
        h('button', {
          class: 'version-act save',
          type: 'button',
          'aria-label': `Save ${a.artist}’s recording${a.year ? ` (${a.year})` : ''} to your Library`,
          onclick: () => openSaveSheet(pieces.get(String(a.id)) || piece),
        }, icon('plus', 11), h('span', {}, 'Save'))));
  }

  function paint(albums) {
    const chosen = pickChosen(work, albums);
    clear(body).append(
      h('p', { class: 'versions-count' }, plural(albums.length, 'recording'), ' · tap a cover to make it your version'),
      h('div', { class: 'versions-grid', role: 'list' }, albums.map((a) => versionCard(a, sameId(a.id, chosen?.id)))));
    // Every Play / Save starts at the work itself once that album's tracks are known: on compilation
    // albums track 1 is often another piece. Your version first, then the rest in order, one at a time.
    const order = chosen ? [chosen, ...albums.filter((a) => !sameId(a.id, chosen.id))] : albums;
    (async () => {
      for (const a of order.slice(0, 12)) {
        if (closed) return;
        let m = null;
        try { m = matchWorkTracks(work, (await albumTracks(a.id)).tracks); } catch { /* keep the album link */ }
        if (closed || !m?.tracks?.length) continue;
        const piece = workPiece(work, comp, a, m.tracks[0]);
        pieces.set(String(a.id), piece);
        const old = body.querySelector(`.version-card[data-id="${CSS.escape(String(a.id))}"] .version-act.play`);
        if (!old) continue;
        const next = playLink(a, piece);
        const focused = document.activeElement === old;
        old.replaceWith(next);
        if (focused) next.focus({ preventScroll: true });
      }
    })();
  }

  function paintMessage(text) {
    clear(body).append(h('div', { class: 'listen-msg' },
      h('p', {}, text),
      h('div', { class: 'listen-actions' },
        extLink('Search Apple Music Classical', searchURL(term, 'classical')),
        extLink('Apple Music', searchURL(term, 'music'), 'music', 'Search Apple Music'))));
  }

  searchAlbums(term, SEARCH_LIMIT)
    .then((albums) => (albums.length ? paint(albums) : paintMessage('No recordings of this work found on Apple Music.')))
    .catch((err) => paintMessage(`Couldn’t load recordings${err?.message ? ` — ${err.message}` : ''}.`));
  return sheet;
}
