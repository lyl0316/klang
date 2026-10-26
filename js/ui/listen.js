// Shared "Listen" block (work pages), modelled on Sheng's Listen carousel, plus the Versions sheet
// (also used by the concert page). Recordings ("versions") of a work come from the free iTunes
// Search API; you choose one (remembered per work). Two ways to listen (ui/preview.js):
//   ▶ Preview — Apple's 30-second preview, played inside Klang (music.js; streamed only);
//   Apple Music Classical ↗ — the full recording in Apple Music Classical / Apple Music
//   (applemusic.js), played with the listener's own subscription.
// Save puts the piece or its album in the Library (ui/save.js).
//
// Apple terms: every block shows the iTunes preview credit plus links to Apple Music Classical / Apple Music.
//
// API:
//   listenSection(work, { title = 'Listen' }) -> HTMLElement   (lazy: loads when scrolled near)
//   openVersionsSheet(work, onChoose, { current, firstAsDefault }) (rail of all recordings; `current`
//                                                              = id of the recording the page shows)
//   `work` is a repertoire work, or a stand-in for a programme line the repertoire doesn't know:
//   { id, title, q (search text), composerName?, catalog?, keys? (catalogue keys, see catalogKeys) }
// Extras:
//   searchTerm(work), matchWorkTracks(work, tracks), catalogKeys(text),
//   previewQueue(tracks, { work, composer, album }) -> albumTracks() tracks ready for the preview player,
//   chosenTracks(work) -> Promise<{ album, tracks, matched }>  (the work's tracks of the chosen version)
//   chosenPiece(work)  -> Promise<piece>                       (that version as a playable piece)

import { h, icon, clear, toast, normalize } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { searchAlbums, albumTracks, fmtDuration, ITUNES_CREDIT } from '../music.js';
import {
  albumURL, searchURL, listenLink, onListening, makePiece, workPiece, albumPiece, playApp, playAppName,
} from '../applemusic.js';
import { openSaveSheet, saveButton } from './save.js';
import { openSheet } from './sheet.js';
import { sectionHead } from './components.js';
import { previewButton, classicalButton } from './preview.js';
import { t, tn, isZh, composerShort } from '../i18n.js';

const SEARCH_LIMIT = 25; // one cached search serves both the carousel and the Versions sheet
const CAROUSEL_MAX = 10;
const TRACKS_COLLAPSED = 6;

// ---------- helpers ----------
export function searchTerm(work) {
  const comp = repo.composer(work.composerId);
  return work.q || [comp?.short, work.title].filter(Boolean).join(' ');
}

// "Beethoven · Symphony No. 5" / "贝多芬 · Symphony No. 5" (shown); composerOf() is the stored name.
function workLabel(work) {
  const comp = repo.composer(work.composerId);
  return [comp ? composerShort(comp) : work.composerName, work.title].filter(Boolean).join(' · ');
}

const composerOf = (work) => repo.composer(work.composerId)?.short || work.composerName || null;

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

// Your version of the work (remembered per work), else `current` (the recording a page shows), else
// the first one found — unless `firstAsDefault` is false.
function pickChosen(work, albums, { current = null, firstAsDefault = true } = {}) {
  const id = store.listenChoice(work.id) ?? current;
  return albums.find((a) => sameId(a.id, id)) || (firstAsDefault ? albums[0] || null : null);
}

// Space-padded token string, so `includes(' op 12 ')` respects word boundaries.
const tok = (s) => ` ${normalize(s || '').replace(/[^a-z0-9]+/g, ' ').trim()} `;

// Catalogue numbers in a title as listed: "Sinfonie Nr. 6 F-Dur, op. 68" -> ['Op. 68'];
// "Die Zauberflöte KV 620" -> ['KV 620', 'K. 620'] (Apple's track titles use either).
const CATALOG = /\b(op(?:us|\.)?|bwv|kv|k\.|hwv|rv|hob\.?\s*[ivx]+[:/]?|d\.?|wq|woo|sz|bb|trv|mwv\s*[a-z]{0,2})\s*(\d+[a-z]?(?:\s*(?:nr\.?|no\.?)\s*\d+)?)/gi;
export function catalogKeys(text) {
  const out = [];
  for (const m of String(text || '').matchAll(CATALOG)) {
    const pre = m[1].replace(/\.$/, '').toLowerCase();
    const num = m[2];
    if (pre === 'd' && !/^\d{2,3}$/.test(num)) continue; // "D 960", not "D-Dur"
    const label = /^op/.test(pre) ? `Op. ${num}` : `${m[1].replace(/\.$/, '')} ${num}`;
    out.push(label);
    if (pre === 'kv') out.push(`K. ${num}`);
    if (pre === 'k') out.push(`KV ${num}`);
  }
  return [...new Set(out)];
}

function workKeys(work) {
  const keys = [];
  if (work.catalog) keys.push(tok(work.catalog)); // "BWV 248" -> " bwv 248 "
  for (const k of work.keys || []) keys.push(tok(k));
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

// albumTracks() tracks with a preview, as entries for the preview player (music.js preview): each keeps
// its own title/artist and carries the piece fields (workId, composer, collectionId, trackId…) so the
// player can open the same recording in Apple Music Classical. Build them once per recording and
// reuse the same objects: the preview player compares tracks by identity.
export function previewQueue(tracks, { work = null, composer = null, album = null } = {}) {
  return (tracks || []).filter((tr) => tr && tr.preview).map((tr) => ({
    ...tr,
    kind: 'piece',
    trackId: tr.id,
    workId: work?.id || null,
    workTitle: work?.title || null,
    composer: composer || null,
    collectionId: album?.id ?? null,
    album: album?.title || tr.album || '',
    artwork: album?.artwork || tr.artwork || null,
    year: album?.year || '',
  }));
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

// Apple's terms: previews are credited and shown with a link to Apple Music.
function creditLine(term) {
  return h('p', { class: 'listen-credit' }, t(ITUNES_CREDIT), isZh() ? '' : ' ',
    h('a', { href: searchURL(term, 'classical'), target: '_blank', rel: 'noopener' }, t('Search Apple Music Classical')), ' · ',
    h('a', { href: searchURL(term, 'music'), target: '_blank', rel: 'noopener' }, 'Apple Music'));
}

const otherApp = () => (playApp() === 'music' ? 'classical' : 'music');


// ---------- Listen section ----------
export function listenSection(work, { title = 'Listen' } = {}) {
  const term = searchTerm(work);
  const label = workLabel(work);
  const comp = composerOf(work);
  const root = h('section', { class: 'section listen-section', dataset: { work: work.id } });
  const body = h('div', { class: 'listen-body' });
  root.append(sectionHead(t(title)), body);

  const carousel = h('div', { class: 'h-scroll listen-carousel', 'aria-label': t('Recordings of {title}', { title: label }) });
  const now = h('div', { class: 'listen-now' });
  const trackList = h('div', { class: 'track-list' });
  const actions = h('div', { class: 'listen-actions' });

  let albums = null;
  let chosen = null;
  let allTracks = [];
  let workMatch = null;
  let pvTracks = []; // preview entries of the listed tracks (same objects for the preview queue)
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
      h('p', { class: 'sr-only', role: 'status' }, t('Loading recordings…')));
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
      paintError();
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

  function paintError() {
    clear(body).append(h('div', { class: 'listen-msg' },
      h('p', {}, t('Couldn’t load recordings.')),
      h('div', { class: 'listen-actions' },
        h('button', { class: 'btn small', type: 'button', onclick: load }, t('Try again')),
        extLink(t('Search Apple Music Classical'), searchURL(term, 'classical'))),
      creditLine(term)));
  }

  function paintEmpty() {
    clear(body).append(h('div', { class: 'listen-msg' },
      h('p', {}, t('No recordings of this work found on Apple Music.')),
      h('div', { class: 'listen-actions' },
        extLink(t('Search Apple Music Classical'), searchURL(term, 'classical')),
        extLink('Apple Music', searchURL(term, 'music'), 'music', t('Search Apple Music'))),
      creditLine(term)));
  }

  // ----- carousel of versions -----
  function albumCard(a) {
    const on = !!chosen && sameId(a.id, chosen.id);
    const name = `${a.artist}: ${a.title}${a.year ? `, ${a.year}` : ''}`;
    return h('button', {
      class: ['album-card', on && 'chosen'],
      type: 'button',
      dataset: { id: String(a.id) },
      'aria-pressed': on ? 'true' : 'false',
      'aria-label': on ? t('{name} (chosen version)', { name }) : name,
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
      const all = tn(albums.length, 'All {n} version', 'All {n} versions');
      carousel.append(h('button', { class: 'album-card', type: 'button', onclick: openVersions, 'aria-label': all },
        h('div', { class: 'art more' }, icon('list', 26)),
        h('div', { class: 't' }, all),
        h('div', { class: 's' }, t('Choose a recording'))));
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
      h('span', { class: 'k' }, t('Selected')),
      h('span', { class: 'v' }, h('b', {}, chosen.artist), chosen.title ? ` · ${chosen.title}` : ''));
  }

  // ▶ Preview (here) · Apple Music Classical ↗ (full) · Save · Versions · the album in the other app
  function paintActions() {
    if (!chosen) return;
    const p = listenPiece();
    const other = otherApp();
    clear(actions).append(
      previewButton({
        resolve: () => (tracksReady && pvTracks.length ? { track: pvTracks[0], queue: pvTracks } : null),
        cls: 'btn small',
        label: t('Play a 30-second preview of {title}', { title: label }),
      }),
      classicalButton(p, { cls: 'btn small' }),
      saveButton(p),
      h('button', { class: 'btn small', type: 'button', onclick: openVersions, 'aria-label': t('Versions: {count}', { count: tn(albums.length, '{n} recording', '{n} recordings') }) },
        icon('list', 15), t('Versions'), h('span', { class: 'count' }, albums.length)),
      extLink(playAppName(other), albumURL(chosen.id, null, other), other === 'music' ? 'music' : 'external', t('Open the album in {app}', { app: playAppName(other) })));
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
    pvTracks = [];
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
        h('p', {}, t('Couldn’t load the tracks of this recording.')),
        h('div', { class: 'listen-actions' },
          h('button', { class: 'btn small', type: 'button', onclick: loadTracks }, t('Try again')),
          extLink(t('Open the album'), albumURL(album.id)))));
    }
    paintActions();
  }

  function paintTracks() {
    const list = listedTracks();
    pvTracks = previewQueue(list, { work: work.id && !String(work.id).startsWith('x-') ? work : null, composer: comp, album: chosen });
    clear(trackList);
    if (!list.length) {
      trackList.append(h('p', { class: 'listen-msg' }, t('No tracks listed for this recording.')));
      return;
    }
    const key = mode === 'work' && workMatch ? workMatch.key : null;
    const visible = expanded ? list : list.slice(0, TRACKS_COLLAPSED);
    for (const tr of visible) trackList.append(trackRow(tr, key));
    const more = [];
    if (list.length > TRACKS_COLLAPSED) {
      more.push(h('button', { class: 'btn small', type: 'button', 'aria-expanded': expanded ? 'true' : 'false', onclick: () => { expanded = !expanded; paintTracks(); } },
        expanded ? t('Show fewer') : tn(list.length, 'Show all {n} track', 'Show all {n} tracks')));
    }
    if (workMatch && workMatch.tracks.length < allTracks.length) {
      more.push(h('button', { class: 'btn small', type: 'button', onclick: () => { mode = mode === 'work' ? 'album' : 'work'; expanded = false; paintTracks(); paintActions(); } },
        mode === 'work' ? t('Whole album · {n}', { n: allTracks.length }) : t('Only this work')));
    }
    if (more.length) trackList.append(h('div', { class: 'track-more' }, more));
    paintCurrent();
  }

  // Each track: ▶ its preview here (the rest of the list follows), the name opens it in Apple Music.
  function trackRow(tr, key) {
    const name = movementLabel(tr.title || '', key);
    const inWork = !!workMatch && workMatch.tracks.includes(tr);
    const p = makePiece({
      title: tr.title || name, composer: inWork ? comp : null, workId: inWork ? work.id : null,
      artist: tr.artist || chosen.artist || '', album: chosen.title || tr.album || '',
      collectionId: chosen.id, trackId: tr.id, artwork: chosen.artwork || tr.artwork || null, year: chosen.year || '',
    });
    const pv = pvTracks.find((x) => x.id === tr.id) || null;
    return h('div', { class: 'track-row', dataset: { id: String(tr.id) } },
      previewButton({
        resolve: () => (pv ? { track: pv, queue: pvTracks.slice(pvTracks.indexOf(pv)) } : null),
        cls: 'play',
        label: t('Play a 30-second preview of {title}', { title: name }),
      }),
      listenLink(p, h('span', { class: 'tt', title: tr.title }, name,
        tr.artist && tr.artist !== chosen.artist ? h('span', { class: 'ta' }, tr.artist) : null),
      { cls: 'track-open', label: t('Play {title} in full in {app}', { title: name, app: playAppName() }) }),
      h('span', { class: 'd' }, fmtDuration(tr.durationMs)));
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
// Tap a cover to make it your version (remembered per work). Under each cover: ▶ Preview plays that
// recording's 30-second previews here, ↗ opens it in full in Apple Music Classical / Apple Music, and
// + Save puts it in the Library.
export function openVersionsSheet(work, onChoose, { current = null, firstAsDefault = true } = {}) {
  const term = searchTerm(work);
  const comp = composerOf(work);
  const known = !!work.id && !String(work.id).startsWith('x-'); // a repertoire work (not a stand-in)
  let closed = false;
  const body = h('div', { class: 'versions' },
    h('div', { class: 'versions-grid', 'aria-busy': 'true' }, Array.from({ length: 9 }, () => h('div', { class: 'skeleton version-skel' }))));
  const sheet = openSheet({
    title: workLabel(work),
    subtitle: t('Versions · All recordings'),
    body,
    footer: creditLine(term),
    onClose: () => { closed = true; },
  });
  sheet.el.classList.add('versions-sheet'); // Sheng: kicker above the title, two-row rail of covers

  const pieces = new Map(); // album id -> piece (upgraded to start at the work once its tracks are known)
  const queues = new Map(); // album id -> preview entries of the work's tracks (else the album's first tracks)
  const lookups = new Map(); // album id -> Promise of those entries

  function tracksOf(a) {
    const id = String(a.id);
    if (!lookups.has(id)) {
      lookups.set(id, albumTracks(a.id).then(({ tracks }) => {
        const m = matchWorkTracks(work, tracks);
        const q = previewQueue(m?.tracks?.length ? m.tracks : tracks.slice(0, 40), { work: known ? work : null, composer: comp, album: a });
        queues.set(id, q);
        if (m?.tracks?.length) pieces.set(id, workPiece(known ? work : { title: work.title }, comp, a, m.tracks[0]));
        return { q, matched: !!m?.tracks?.length };
      }).catch((err) => { lookups.delete(id); throw err; }));
    }
    return lookups.get(id);
  }

  const openLink = (piece) => classicalButton(piece, { cls: 'version-act open', compact: true });

  function versionCard(a, on) {
    const piece = workPiece(known ? work : { title: work.title }, comp, a, null);
    pieces.set(String(a.id), piece);
    const who = `${a.artist}${a.year ? ` (${a.year})` : ''}`;
    return h('div', { class: ['version-card', on && 'chosen'], role: 'listitem', dataset: { id: String(a.id) } },
      h('button', {
        class: 'version-pick',
        type: 'button',
        'aria-pressed': on ? 'true' : 'false',
        'aria-label': t(on ? '{name} (your version)' : '{name} — make it your version', { name: `${a.artist}${a.year ? `, ${a.year}` : ''}: ${a.title}` }),
        onclick: () => {
          store.setListenChoice(work.id, a.id);
          onChoose?.(a);
          sheet.close();
          if (!on) toast(t('Your version: {artist}', { artist: a.artist }));
        },
      },
      a.artwork ? h('img', { src: a.artwork, alt: '', loading: 'lazy' }) : h('div', { class: 'ph' }, icon('music', 22)),
      h('div', { class: 't' }, a.artist),
      h('div', { class: 's' }, [a.year, a.title].filter(Boolean).join(' · '))),
      h('div', { class: 'version-acts' },
        previewButton({
          resolve: () => {
            const q = queues.get(String(a.id));
            if (q) return q.length ? { track: q[0], queue: q } : null;
            return tracksOf(a).then(({ q: list }) => (list.length ? { track: list[0], queue: list } : null));
          },
          cls: 'version-act pv',
          label: t('Play a 30-second preview of {name}’s recording', { name: who }),
        }),
        openLink(piece),
        h('button', {
          class: 'version-act save',
          type: 'button',
          'aria-label': t('Save {name}’s recording to your Library', { name: who }),
          onclick: () => openSaveSheet(pieces.get(String(a.id)) || piece),
        }, icon('plus', 11), h('span', {}, t('Save')))));
  }

  function paint(albums) {
    const chosen = pickChosen(work, albums, { current, firstAsDefault });
    clear(body).append(
      h('p', { class: 'versions-count' }, tn(albums.length, '{n} recording · tap a cover to make it your version', '{n} recordings · tap a cover to make it your version')),
      h('div', { class: 'versions-grid', role: 'list' }, albums.map((a) => versionCard(a, sameId(a.id, chosen?.id)))));
    // Every Preview / Open / Save starts at the work itself once that album's tracks are known: on
    // compilation albums track 1 is often another piece. Your version first, then the rest in order.
    const order = chosen ? [chosen, ...albums.filter((a) => !sameId(a.id, chosen.id))] : albums;
    (async () => {
      for (const a of order.slice(0, 12)) {
        if (closed) return;
        let matched = false;
        try { ({ matched } = await tracksOf(a)); } catch { /* keep the album link */ }
        if (closed || !matched) continue;
        const old = body.querySelector(`.version-card[data-id="${CSS.escape(String(a.id))}"] .version-act.open`);
        if (!old) continue;
        const next = openLink(pieces.get(String(a.id)));
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
        extLink(t('Search Apple Music Classical'), searchURL(term, 'classical')),
        extLink('Apple Music', searchURL(term, 'music'), 'music', t('Search Apple Music')))));
  }

  searchAlbums(term, SEARCH_LIMIT)
    .then((albums) => (albums.length ? paint(albums) : paintMessage(t('No recordings of this work found on Apple Music.'))))
    .catch(() => paintMessage(t('Couldn’t load recordings.')));
  return sheet;
}
