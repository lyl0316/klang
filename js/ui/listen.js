// Shared "Listen" block (concert detail + work page), modelled on Sheng's Listen carousel.
// Recordings ("versions") of a work come from the free iTunes Search API; the chosen
// version's movements play as 30-second previews in the mini player; a Versions sheet lets
// you pick another recording (remembered per work); deep links go to Apple Music and
// Apple Music Classical for full playback.
//
// Apple terms: previews are streamed only (never downloaded or cached). Every block that
// plays previews shows ITUNES_CREDIT plus links to Apple Music / Apple Music Classical.
//
// API:
//   listenSection(work, { title = 'Listen' }) -> HTMLElement   (lazy: loads when scrolled near)
//   openVersionsSheet(work, onChoose)                          (grid of all recordings)
// Extras (used by the concert page's "Play all"):
//   searchTerm(work), chosenTracks(work) -> Promise<{ album, tracks }>, matchWorkTracks(work, tracks)

import { h, icon, clear, toast, normalize, plural } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import {
  searchAlbums, albumTracks, player, playerState,
  appleMusicSearchURL, classicalSearchURL, classicalAlbumURL, ITUNES_CREDIT, fmtDuration,
} from '../music.js';
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

// Tracks of the chosen recording that belong to the work (with previews only).
export async function chosenTracks(work) {
  const albums = await searchAlbums(searchTerm(work), SEARCH_LIMIT);
  const album = pickChosen(work, albums);
  if (!album) return { album: null, tracks: [] };
  const { tracks } = await albumTracks(album.id);
  const m = matchWorkTracks(work, tracks);
  return { album, tracks: (m ? m.tracks : tracks).filter((t) => t.preview) };
}

const extLink = (label, url, iconName = 'external', ariaLabel = null) =>
  h('a', { class: 'btn small', href: url, target: '_blank', rel: 'noopener', 'aria-label': ariaLabel }, icon(iconName, 14), label);

function creditLine(term) {
  return h('p', { class: 'listen-credit' }, ITUNES_CREDIT, ' ',
    h('a', { href: classicalSearchURL(term), target: '_blank', rel: 'noopener' }, 'Search Apple Music Classical'), '.');
}

// ---------- Listen section ----------
export function listenSection(work, { title = 'Listen' } = {}) {
  const term = searchTerm(work);
  const label = workLabel(work);
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
  let loading = false;
  let unsubs = [];
  let seenConnected = false;
  let lastSig = '';

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
      if (!alive() || topic !== 'listen' || !albums) return; // alive() first: unsubscribes on any topic once detached
      applyChoice(pickChosen(work, albums));
    }));
    unsubs.push(player.subscribe((st) => {
      if (!alive()) return;
      const sig = `${st.track?.id ?? ''}|${st.playing}`;
      if (sig === lastSig) return;
      lastSig = sig;
      paintPlaying(st);
    }));
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
        extLink('Search Apple Music Classical', classicalSearchURL(term))),
      creditLine(term)));
  }

  function paintEmpty() {
    clear(body).append(h('div', { class: 'listen-msg' },
      h('p', {}, 'No recordings of this work found on Apple Music.'),
      h('div', { class: 'listen-actions' },
        extLink('Search Apple Music Classical', classicalSearchURL(term)),
        extLink('Apple Music', appleMusicSearchURL(term), 'music', 'Search Apple Music')),
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

  function paintActions() {
    const playable = listedTracks().some((t) => t.preview);
    clear(actions).append(...[
      h('button', {
        class: 'btn small primary', type: 'button', disabled: !tracksReady || !playable,
        'aria-label': `Play previews of ${label}`, onclick: playListed,
      }, icon('play', 13), 'Listen'),
      h('button', { class: 'btn small', type: 'button', onclick: openVersions, 'aria-label': `Versions: ${plural(albums.length, 'recording')}` },
        icon('list', 15), 'Versions', h('span', { class: 'count' }, albums.length)),
      extLink('Apple Music Classical', classicalAlbumURL(chosen.id), 'external', 'Open in Apple Music Classical'),
      chosen.url ? extLink('Apple Music', chosen.url, 'music', 'Open in Apple Music') : null,
    ].filter(Boolean));
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
    paintActions();
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
          extLink('Open the album', album.url || classicalAlbumURL(album.id)))));
    }
    paintActions();
  }

  function paintTracks() {
    const list = listedTracks();
    clear(trackList);
    if (!list.length) {
      trackList.append(h('p', { class: 'listen-msg' }, 'This recording has no previews.'));
      return;
    }
    const key = mode === 'work' && workMatch ? workMatch.key : null;
    const visible = expanded ? list : list.slice(0, TRACKS_COLLAPSED);
    for (const t of visible) trackList.append(trackRow(t, list, key));
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
    lastSig = '';
    paintPlaying(playerState());
  }

  function trackRow(t, queue, key) {
    const name = movementLabel(t.title || '', key);
    return h('div', { class: 'track-row', dataset: { id: String(t.id), name } },
      h('button', {
        class: 'play', type: 'button', disabled: !t.preview,
        'aria-label': t.preview ? `Play preview: ${name}` : `No preview: ${name}`,
        onclick: () => {
          const st = playerState();
          if (st.track && sameId(st.track.id, t.id)) player.toggle();
          else player.play(t, queue);
        },
      }, icon('play', 13)),
      h('div', { class: 'tt', title: t.title }, name,
        t.artist && chosen && t.artist !== chosen.artist ? h('div', { class: 'ta' }, t.artist) : null),
      h('span', { class: 'd' }, fmtDuration(t.durationMs)));
  }

  function paintPlaying(st) {
    for (const row of trackList.querySelectorAll('.track-row')) {
      const isCurrent = !!st.track && String(st.track.id) === row.dataset.id;
      const playing = isCurrent && st.playing;
      row.classList.toggle('playing', playing);
      row.classList.toggle('current', isCurrent);
      const btn = row.querySelector('.play');
      if (!btn || btn.disabled) continue;
      btn.replaceChildren(icon(playing ? 'pause' : 'play', 13));
      btn.setAttribute('aria-label', `${playing ? 'Pause' : 'Play preview'}: ${row.dataset.name}`);
    }
  }

  function playListed() {
    const list = listedTracks().filter((t) => t.preview);
    if (!list.length) {
      toast('No previews on this recording');
      return;
    }
    const st = playerState();
    if (st.track && list.some((t) => sameId(t.id, st.track.id))) {
      if (!st.playing) player.toggle();
      return;
    }
    player.play(list[0], list);
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
export function openVersionsSheet(work, onChoose) {
  const term = searchTerm(work);
  const body = h('div', { class: 'versions' },
    h('div', { class: 'versions-grid', 'aria-busy': 'true' }, Array.from({ length: 9 }, () => h('div', { class: 'skeleton version-skel' }))));
  const sheet = openSheet({
    title: workLabel(work),
    subtitle: 'Versions · All recordings',
    body,
    footer: creditLine(term),
  });
  sheet.el.classList.add('versions-sheet'); // Sheng: kicker above the title, two-row rail of covers

  function paint(albums) {
    const chosenId = pickChosen(work, albums)?.id;
    clear(body).append(
      h('p', { class: 'versions-count', title: 'Tap one to make it your version' }, plural(albums.length, 'recording')),
      h('div', { class: 'versions-grid' }, albums.map((a) => {
        const on = sameId(a.id, chosenId);
        return h('button', {
          class: ['version-card', on && 'chosen'],
          type: 'button',
          'aria-pressed': on ? 'true' : 'false',
          'aria-label': `${a.artist}${a.year ? `, ${a.year}` : ''}: ${a.title}${on ? ' (chosen)' : ''}`,
          onclick: () => {
            store.setListenChoice(work.id, a.id);
            onChoose?.(a);
            sheet.close();
            if (!on) toast(`Your version: ${a.artist}`);
          },
        },
        a.artwork ? h('img', { src: a.artwork, alt: '', loading: 'lazy' }) : h('div', { class: 'ph' }, icon('music', 22)),
        h('div', { class: 't' }, a.artist),
        h('div', { class: 's' }, [a.year, a.title].filter(Boolean).join(' · ')));
      })));
  }

  function paintMessage(text) {
    clear(body).append(h('div', { class: 'listen-msg' },
      h('p', {}, text),
      h('div', { class: 'listen-actions' },
        extLink('Search Apple Music Classical', classicalSearchURL(term)),
        extLink('Apple Music', appleMusicSearchURL(term), 'music', 'Search Apple Music'))));
  }

  searchAlbums(term, SEARCH_LIMIT)
    .then((albums) => (albums.length ? paint(albums) : paintMessage('No recordings of this work found on Apple Music.')))
    .catch((err) => paintMessage(`Couldn’t load recordings${err?.message ? ` — ${err.message}` : ''}.`));
  return sheet;
}
