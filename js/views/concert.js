// Concert detail (#/concert/:id), mirroring Sheng's concert page in order and look:
//  1. floating back · share (share sheet: Share…, Copy link, Add to calendar, Hide) over a header
//     band: bold centred sans title, grey series, gold Swiss date ("Wed, Dec 2, 7:30 PM") plus the
//     viewer's own clock when their time zone differs, "Duration: ≈ N min", gold "City | Venue ☆"
//  2. action bar (5 square tiles): Listen · Program · Notes · Podcasts · Ticket — jump to sections,
//     greyed out when there is nothing to show
//  3. ♡ Save + Going (upcoming) / ♡ Save + Attended (started) and the private review
//  4. Listen carousel: one big card per programme work (chosen recording, Listen + Versions),
//     ▶ Play all, "Add playlist to my Library", iTunes credit
//  5. red pill "Program": roles table + works · 6. red pill "Program book": one chapter per work
//     with a chapter rail and a full-screen reader (double-tap)
//  7. PODCASTS (Apple Podcasts episodes) · 8. FEATURED ARTISTS (composers + performers with ♡)
//  9. Report a problem (then the demo / import note)
// Personal only: marks, review, favourites and the playlist live on this device; nothing is social.
// Demo performers are invented, so the Program book has no performer chapters.

import { h, icon, clear, toast, download, plural, normalize } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { isPast, relDayLabel, TZ } from '../time.js';
import { buildICS } from '../ics.js';
import {
  player, playerState, artwork, searchAlbums, searchPodcasts,
  classicalAlbumURL, classicalSearchURL, appleMusicSearchURL, ITUNES_CREDIT,
} from '../music.js';
import { openSheet } from '../ui/sheet.js';
import { openVersionsSheet, chosenTracks, searchTerm } from '../ui/listen.js';
import '../ui/player.js'; // side effect: lets the full player record each queue for "Up next"
import { href, emptyState, followButton, avatar, venueLabel, cityLabel } from '../ui/components.js';
import { GUIDES, WIDELY_LOVED, HOOKS } from '../content/guides.js';
import { goBack } from '../main.js';

const SEARCH_LIMIT = 25; // same limit as ui/listen.js, so the Versions sheet reuses the cached search
const PODCAST_WORKS = 2; // search podcasts for the first two works
const PODCAST_PER_WORK = 2;
const PODCAST_MAX = 3;

const MARKS = [
  { kind: 'saved', iconName: 'heart', off: 'Save', on: 'Saved', toastOn: 'Saved to My Concerts', toastOff: 'Removed from Saved' },
  { kind: 'going', iconName: 'ticket', off: 'Going', on: 'Going', toastOn: 'Marked as Going', toastOff: 'No longer Going' },
  { kind: 'attended', iconName: 'ticket', off: 'Attended', on: 'Attended', toastOn: 'Marked as Attended — add your review', toastOff: 'Removed from Attended' },
];

const GENRE_LABELS = {
  chamber: 'Chamber music', concerto: 'Concerto', opera: 'Opera', orchestral: 'Orchestral work', piano: 'Piano music',
  sacred: 'Sacred music', solo: 'Solo work', song: 'Songs', symphony: 'Symphony',
};

// ---------- small helpers ----------
const itemKey = (it, i) => it.work?.id || `item-${i}`;
const sameId = (a, b) => a != null && b != null && String(a) === String(b);
const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const scrollBehavior = () => (reduceMotion() ? 'auto' : 'smooth');
const jumpTo = (el) => el?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
const extAttrs = { target: '_blank', rel: 'noopener' };

function viewerTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

// "Wed, Dec 2, 7:30 PM" in the given time zone (year added when it isn't this year).
function fmtWhen(iso, timeZone) {
  const d = new Date(iso);
  try {
    const yearOfDate = (x) => new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }).format(x);
    const withYear = yearOfDate(d) !== yearOfDate(new Date());
    const date = new Intl.DateTimeFormat('en-US', {
      timeZone, weekday: 'short', month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}),
    }).format(d);
    const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(d);
    return `${date}, ${time}`;
  } catch {
    return d.toLocaleString();
  }
}

// "New York time: Wed, Dec 2, 1:30 PM" — only when the viewer's clock differs from Swiss time.
function viewerTimeLine(iso) {
  const tz = viewerTimeZone();
  if (!tz || tz === TZ) return null;
  const mine = fmtWhen(iso, tz);
  if (mine === fmtWhen(iso, TZ)) return null;
  return `${tz.split('/').pop().replace(/_/g, ' ')} time: ${mine}`;
}

function durationMinutes(c, items) {
  if (c.durationMin) return c.durationMin;
  const music = items.reduce((s, it) => s + (it.work?.minutes || 0), 0);
  return music || null;
}

function shareURL(c) {
  return `${location.href.split('#')[0]}${href.concert(c.id)}`;
}

function whereLine(c) {
  return [venueLabel(c), cityLabel(c)].filter(Boolean).join(', ');
}

async function copyText(text, ok = 'Link copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(ok);
  } catch {
    toast('Couldn’t copy — use the address bar link');
  }
}

async function shareConcert(c) {
  const url = shareURL(c);
  const text = `${c.title} — ${fmtWhen(c.start, TZ)} (Swiss time), ${whereLine(c)}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: c.title, text, url });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }
  copyText(`${text}\n${url}`);
}

function programLine(it) {
  return [it.composerName, [it.title, it.catalog].filter(Boolean).join(', ')].filter(Boolean).join(': ');
}

function addToCalendar(c, items) {
  const ics = buildICS([{
    concert: c,
    venueName: venueLabel(c),
    cityName: cityLabel(c),
    programLines: items.map(programLine),
    creditLines: (c.credits || []).map((cr) => `${cr.role}: ${cr.name}`),
  }], { reminderDays: store.pref('reminderDays') || [] });
  download(`klang-${String(c.id).replace(/[^a-z0-9-]+/gi, '-')}.ics`, ics, 'text/calendar');
  const days = store.pref('reminderDays') || [];
  toast(days.length ? `Calendar file ready · reminders ${days.map((d) => `${d}d`).join(' & ')} before` : 'Calendar file ready');
}

function toggleHide(c) {
  const now = store.toggleHidden(c.id);
  toast(now ? 'Hidden from your lists — undo in Me › Hidden concerts' : 'Shown in your lists again');
}

// Plain text + _italic_ -> nodes
function inline(text) {
  const out = [];
  const re = /_([^_\n]+)_/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(h('em', {}, m[1]));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const paragraphs = (text) => String(text || '').split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);

// SF Symbols look-alikes used by Sheng's concert page (static, trusted markup)
const SYM = {
  listen: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M9.8 7.9v8.2l6.6-4.1z" style="fill: var(--cp-sym-cut, #2a2a2e)" stroke="none"/>',
  program: '<circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none"/><path d="M9 6h12M9 12h12M9 18h12"/>',
  notes: '<path d="M5 4.6A2.6 2.6 0 0 1 7.6 2H19v15.2H7.6A2.6 2.6 0 0 0 5 19.4z" fill="currentColor" stroke="none"/><path d="M5 19.4A2.6 2.6 0 0 0 7.6 22H19v-4.8"/>',
  podcasts: '<path d="M3 10.5v3M6.5 8v8M10 4.5v15M13.5 7v10M17 9.5v5M20.5 11v2"/>',
  ticket: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><rect x="6.5" y="8.6" width="11" height="6.8" rx="1"/>',
  report: '<path d="M8.2 5.6a8 8 0 1 0 7.6 0"/><path d="M12 3v7"/>',
  versions: '<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5"/><path d="M4 3.5v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.6L20 15.5"/><path d="M20 20.5v-5h-5"/>',
  listenRing: '<circle cx="12" cy="12" r="7.2" stroke-width="1.9"/><path d="M10.4 9.3v5.4l4.3-2.7z" fill="currentColor" stroke="none"/>',
};
function sym(name, size = 20, sw = 1.9) {
  return h('span', {
    class: 'icon',
    'aria-hidden': 'true',
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${SYM[name]}</svg>`,
  });
}

function expandIcon() {
  return h('span', {
    class: 'icon',
    'aria-hidden': 'true',
    html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  });
}

// ---------- 1. header band ----------
function venueStar(venue) {
  const btn = followButton('venue', venue.id, { labelOn: '', labelOff: '', iconName: 'star' });
  btn.setAttribute('aria-label', `Favourite venue: ${venue.name}`);
  btn.title = 'Favourite this venue';
  return h('span', { class: 'venue-follow' }, btn);
}

function headBand(c, items, bar) {
  const city = c.cityId ? repo.city(c.cityId) : null;
  const venue = c.venueId ? repo.venue(c.venueId) : null;
  const cancelled = c.status === 'cancelled';
  const mins = durationMinutes(c, items);
  const other = viewerTimeLine(c.start);
  const hiddenNote = h('div', { class: 'cp-hidden-note', hidden: true });
  const paintHidden = () => {
    const on = store.isHidden(c.id);
    hiddenNote.hidden = !on;
    clear(hiddenNote);
    if (on) {
      hiddenNote.append(icon('eyeoff', 14), h('span', {}, 'Hidden from your lists'),
        h('button', { type: 'button', onclick: () => toggleHide(c) }, 'Show again'));
    }
  };
  paintHidden();
  const el = h('header', { class: 'cp-head' },
    h('h1', { class: ['cp-title', cancelled && 'is-cancelled'] }, c.title),
    c.series ? h('div', { class: 'cp-series' }, c.series) : null,
    h('div', { class: 'cp-when' }, h('time', { datetime: c.start }, fmtWhen(c.start, TZ))),
    other ? h('div', { class: 'cp-when-sub' }, other) : null,
    mins ? h('div', { class: 'cp-when-sub' }, `Duration: ≈ ${mins} min`) : null,
    h('div', { class: 'cp-where' },
      city ? h('a', { href: href.city(city.id) }, city.name) : null,
      city ? h('span', { class: 'sep', 'aria-hidden': 'true' }, '|') : null,
      h('span', { class: 'cp-venue' },
        venue ? h('a', { href: href.venue(venue.id) }, venueLabel(c)) : h('span', {}, venueLabel(c)),
        venue ? venueStar(venue) : null)),
    cancelled ? h('p', { class: 'concert-alert' }, 'This concert has been cancelled. Check with the venue about tickets or a new date.') : null,
    hiddenNote,
    bar.el);
  return { el, paintHidden };
}

// ---------- 2. action bar ----------
function actionBar(c) {
  const tile = (label, symName) => h('button', { type: 'button', class: 'cp-act' }, sym(symName, 22), h('span', {}, label));
  const tiles = {
    listen: tile('Listen', 'listen'),
    program: tile('Program', 'program'),
    notes: tile('Notes', 'notes'),
    podcasts: tile('Podcasts', 'podcasts'),
    ticket: c.ticketUrl
      ? h('a', { class: 'cp-act', href: c.ticketUrl, ...extAttrs, 'aria-label': 'Tickets (opens the organiser’s site)' }, sym('ticket', 22), h('span', {}, 'Ticket'))
      : tile('Ticket', 'ticket'),
  };
  const el = h('nav', { class: 'cp-actions', 'aria-label': 'Concert sections' }, Object.values(tiles));
  function set(key, on, target = null) {
    const t = tiles[key];
    if (!t || t.tagName === 'A') return;
    t.disabled = !on;
    t.classList.toggle('off', !on);
    if (target !== null) t.onclick = () => jumpTo(target);
  }
  set('listen', false);
  set('program', false);
  set('notes', false);
  set('podcasts', false);
  if (!c.ticketUrl) set('ticket', false);
  return { el, set };
}

// ---------- 3. marks + review ----------
// Like Sheng: upcoming concerts offer Save + Going; once a concert has started, Save + Attended.
// A mark that is already set is always shown so it can be undone.
function markButtons(c, m, started) {
  const wanted = started ? ['saved', 'attended'] : ['saved', 'going'];
  return h('div', { class: 'mark-row' }, MARKS.filter((def) => wanted.includes(def.kind) || m[def.kind]).map((def) => {
    const on = !!m[def.kind];
    const locked = def.kind === 'attended' && !on && (!started || c.status === 'cancelled');
    return h('button', {
      type: 'button',
      class: ['btn', 'small', def.kind, on && 'on'],
      dataset: { mark: def.kind },
      'aria-pressed': on ? 'true' : 'false',
      disabled: locked,
      title: locked ? (c.status === 'cancelled' ? 'This concert was cancelled' : 'Available once the concert has started') : null,
      onclick: () => {
        const now = store.toggleMark(c.id, def.kind);
        toast(now ? def.toastOn : def.toastOff);
      },
    }, icon(def.iconName, 15), on ? def.on : def.off);
  }));
}

function starsStatic(n) {
  return h('div', { class: 'stars-static', role: 'img', 'aria-label': `${n} out of 5 stars` },
    [1, 2, 3, 4, 5].map((i) => icon('star', 17, i <= n ? 'on' : 'off')));
}

function reviewCard(c, items, m, keepSheet) {
  const favIndex = m.favoriteWorkId ? items.findIndex((it, i) => itemKey(it, i) === m.favoriteWorkId) : -1;
  const fav = favIndex >= 0 ? items[favIndex] : null;
  const has = !!(m.rating || m.note || fav || m.encores);
  return h('div', { class: 'note-card review-card' },
    h('div', { class: 'head' },
      h('div', { class: 'kicker' }, 'Your review'),
      h('button', { class: 'btn small', type: 'button', onclick: () => openReviewSheet(c, items, keepSheet) }, icon(has ? 'notes' : 'star', 15), has ? 'Edit' : 'Write a review')),
    has
      ? [
        m.rating ? starsStatic(m.rating) : null,
        fav ? h('div', { class: 'line' }, h('b', {}, 'Favourite piece: '), [fav.composerShort, fav.title].filter(Boolean).join(': ')) : null,
        m.encores ? h('div', { class: 'line' }, h('b', {}, 'Encores: '), m.encores) : null,
        m.note ? h('div', { class: 'quote' }, m.note) : null,
        h('div', { class: 'private' }, 'Private · saved on this device only'),
      ]
      : h('div', { class: 'line' }, 'How was it? Rate it, pick your favourite piece and note the encores. Only you can see it.'));
}

function reviewHint(c, started) {
  if (c.status === 'cancelled') return h('div', { class: 'mark-hint' }, h('b', {}, 'Cancelled'), 'There’s nothing to review for this date.');
  if (!started) return null;
  return h('div', { class: 'mark-hint' }, h('b', {}, 'You haven’t reviewed this performance yet'), 'Mark it as Attended to leave a review');
}

function openReviewSheet(c, items, keepSheet) {
  const m = store.markOf(c.id);
  let rating = m.rating || 0;

  const stars = h('div', { class: 'stars', role: 'radiogroup', 'aria-labelledby': 'rv-rating' });
  const paintStars = () => clear(stars).append(...[1, 2, 3, 4, 5].map((i) => h('button', {
    type: 'button',
    class: i <= rating ? 'on' : '',
    role: 'radio',
    'aria-checked': i === rating ? 'true' : 'false',
    'aria-label': `${i} star${i === 1 ? '' : 's'}`,
    onclick: () => {
      rating = rating === i ? 0 : i;
      paintStars();
    },
  }, icon('star', 30))));
  paintStars();

  const fav = h('select', { class: 'input', id: 'rv-fav' },
    h('option', { value: '' }, 'No favourite'),
    items.map((it, i) => h('option', { value: itemKey(it, i) }, [it.composerShort, it.title].filter(Boolean).join(': '))));
  fav.value = m.favoriteWorkId || '';
  const encores = h('input', { class: 'input', id: 'rv-enc', type: 'text', autocomplete: 'off', placeholder: 'e.g. Chopin: Nocturne Op. 9 No. 2' });
  encores.value = m.encores || '';
  const note = h('textarea', { class: 'input', id: 'rv-note', rows: '4', placeholder: 'What stayed with you?' });
  note.value = m.note || '';

  const body = h('div', { class: 'review-form' },
    h('div', { class: 'field' }, h('label', { id: 'rv-rating' }, 'Rating'), stars),
    items.length ? h('div', { class: 'field' }, h('label', { for: 'rv-fav' }, 'Favourite piece'), fav) : null,
    h('div', { class: 'field' }, h('label', { for: 'rv-enc' }, 'Encores'), encores),
    h('div', { class: 'field' }, h('label', { for: 'rv-note' }, 'Private note'), note));

  const hadReview = !!(m.rating || m.note || m.favoriteWorkId || m.encores);
  const save = h('button', { class: 'btn primary block', type: 'button' }, 'Save review');
  const footer = h('div', {}, save,
    hadReview ? h('button', {
      class: 'btn small review-clear',
      type: 'button',
      onclick: () => {
        store.setReview(c.id, { rating: null, favoriteWorkId: null, encores: null, note: null });
        sheet.close();
        toast('Review cleared');
      },
    }, 'Clear review') : null,
    h('div', { class: 'hint' }, 'Stored only on this device · included in your backup'));
  const sheet = keepSheet(openSheet({ title: 'Your review', subtitle: `${c.title} · ${relDayLabel(c.day)}`, body, footer }));
  save.onclick = () => {
    store.setReview(c.id, {
      rating: rating || null,
      favoriteWorkId: (items.length && fav.value) || null,
      encores: encores.value.trim() || null,
      note: note.value.trim() || null,
    });
    sheet.close();
    toast('Review saved');
  };
}

// ---------- 4. listen carousel ----------
// One entry per distinct programme work. Imported listings without a matching repertoire work
// get a lightweight stand-in, so their pieces can still be searched on Apple Music.
function listenEntries(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    let work = it.work;
    if (!work) {
      if (!it.title) continue;
      const key = normalize(`${it.composerShort} ${it.title}`).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
      work = {
        id: `x-${key}`,
        composerId: it.composer?.id || null,
        title: it.title,
        catalog: it.catalog,
        q: [it.composerShort || it.composerName, it.title, it.catalog].filter(Boolean).join(' '),
      };
    }
    if (seen.has(work.id)) continue;
    seen.add(work.id);
    out.push({
      it,
      work,
      real: !!it.work,
      label: [it.composerShort || it.composerName, it.title].filter(Boolean).join(': '),
      albums: null,
      chosen: null,
      error: null,
      loading: false,
      tracks: null,
      trackIds: null,
      tracksPromise: null,
      tracksToken: 0,
      busy: false,
      visible: false,
    });
  }
  return out;
}

function listenBlock(c, entries, ctx) {
  if (!entries.length) return null;

  const pickChosen = (e) => {
    const id = store.listenChoice(e.work.id);
    return e.albums.find((a) => sameId(a.id, id)) || e.albums[0] || null;
  };

  // ----- tracks of the chosen version (prefetched for visible cards, so Listen plays on tap) -----
  function ensureTracks(e) {
    if (e.tracks) return Promise.resolve(e.tracks);
    if (e.tracksPromise) return e.tracksPromise;
    const token = ++e.tracksToken;
    e.tracksPromise = chosenTracks(e.work)
      .then(({ tracks }) => {
        if (token !== e.tracksToken) return e.tracks || [];
        // Tag previews with the programme work so the player's Info view can name it.
        e.tracks = e.real ? tracks.map((t) => (t.workId ? t : { ...t, workId: e.work.id })) : tracks;
        e.trackIds = new Set(tracks.map((t) => String(t.id)));
        return tracks;
      })
      .catch(() => {
        if (token === e.tracksToken) e.tracksPromise = null;
        return null;
      })
      .then((res) => {
        if (ctx.alive()) paintButtons(e);
        return res;
      });
    return e.tracksPromise;
  }

  const tracksFor = async (e) => (await ensureTracks(e)) || [];

  function startTracks(tracks) {
    if (!tracks.length) {
      toast('No previews on this recording — try another version');
      return;
    }
    player.play(tracks[0], tracks);
  }

  function listenTo(e) {
    const st = playerState();
    if (st.track && e.trackIds?.has(String(st.track.id))) {
      player.toggle();
      return;
    }
    if (e.tracks) {
      startTracks(e.tracks);
      return;
    }
    e.busy = true;
    paintButtons(e);
    ensureTracks(e).then((tracks) => {
      e.busy = false;
      if (!ctx.alive()) return;
      paintButtons(e);
      if (tracks == null) toast('Couldn’t reach Apple Music — try again');
      else startTracks(tracks);
    });
  }

  function applyChosen(e) {
    if (!e.albums) return;
    const next = pickChosen(e);
    if (sameId(next?.id, e.chosen?.id)) return;
    e.chosen = next;
    e.tracks = null;
    e.trackIds = null;
    e.tracksPromise = null;
    e.tracksToken += 1;
    paintCard(e);
    if (e.visible && e.chosen) ensureTracks(e);
  }

  async function loadAlbums(e) {
    e.loading = true;
    e.error = null;
    paintCard(e);
    try {
      e.albums = await searchAlbums(searchTerm(e.work), SEARCH_LIMIT);
    } catch (err) {
      e.albums = null;
      e.error = err || new Error('failed');
    }
    e.loading = false;
    if (!ctx.alive()) return;
    if (e.albums) e.chosen = pickChosen(e);
    paintCard(e);
    reportStatus();
    if (e.visible && e.chosen) ensureTracks(e);
  }

  function reportStatus() {
    ctx.setListenReady(entries.some((e) => e.albums && e.albums.length));
  }

  // ----- card -----
  function buildCard(e) {
    e.coverEl = h('div', { class: 'cp-lc-cover' });
    e.metaEl = h('div', { class: 'cp-lc-meta' });
    e.ringEl = h('span', { class: 'ring' }, sym('listenRing', 22));
    e.listenBtn = h('button', { type: 'button', class: 'cp-lc-btn cp-lc-listen', disabled: true, onclick: () => listenTo(e) },
      e.ringEl, h('span', { class: 'lbl' }, 'Listen'));
    const versionsBtn = h('button', {
      type: 'button',
      class: 'cp-lc-btn',
      'aria-label': `Versions: all recordings of ${e.label}`,
      onclick: () => ctx.keepSheet(openVersionsSheet(e.work, (a) => {
        if (!e.albums) e.albums = [a];
        else if (!e.albums.some((x) => sameId(x.id, a.id))) e.albums = [a, ...e.albums];
        applyChosen(e);
        reportStatus();
      })),
    }, h('span', { class: 'ring' }, sym('versions', 21, 2.1)), h('span', { class: 'lbl' }, 'Versions'));
    e.el = h('article', { class: 'cp-lc', role: 'listitem', 'aria-label': e.label },
      h('div', { class: 'cp-lc-comp' }, e.it.composerShort || e.it.composerName || ' '),
      h('div', { class: 'cp-lc-work' }, [e.work.title, e.work.catalog].filter(Boolean).join(', ')),
      e.coverEl,
      e.metaEl,
      h('div', { class: 'cp-lc-actions' }, e.listenBtn, versionsBtn));
    paintCard(e);
    return e.el;
  }

  function placeholderArt() {
    return h('div', { class: 'cp-lc-art ph' }, icon('music', 34));
  }

  function paintCard(e) {
    clear(e.coverEl);
    clear(e.metaEl);
    if (e.loading || (!e.albums && !e.error)) {
      e.coverEl.append(h('div', { class: 'cp-lc-art skeleton', 'aria-hidden': 'true' }));
      e.metaEl.append(h('div', { class: 'skeleton cp-lc-skel' }), h('div', { class: 'skeleton cp-lc-skel short' }),
        h('span', { class: 'sr-only' }, 'Loading recordings…'));
    } else if (e.error && !e.albums) {
      e.coverEl.append(placeholderArt());
      e.metaEl.append(h('div', { class: 'cp-lc-artist' }, 'Couldn’t load recordings'),
        h('button', { type: 'button', class: 'cp-lc-retry', onclick: () => loadAlbums(e) }, 'Try again'));
    } else if (!e.chosen) {
      e.coverEl.append(placeholderArt());
      e.metaEl.append(h('div', { class: 'cp-lc-artist' }, 'No recordings found on Apple Music'),
        h('a', { class: 'cp-lc-album', href: classicalSearchURL(searchTerm(e.work)), ...extAttrs }, 'Search Apple Music Classical'));
    } else {
      const a = e.chosen;
      e.coverEl.append(h('button', {
        type: 'button',
        class: 'cp-lc-art-btn',
        'aria-label': `Play previews: ${a.artist}, ${a.title}`,
        onclick: () => listenTo(e),
      }, a.artwork ? h('img', { class: 'cp-lc-art', src: artwork(a.artwork, 600), alt: '', loading: 'lazy' }) : placeholderArt()));
      e.metaEl.append(h('div', { class: 'cp-lc-artist' }, a.artist),
        h('a', { class: 'cp-lc-album', href: classicalAlbumURL(a.id), ...extAttrs, title: 'Open in Apple Music Classical' },
          a.title || ''));
    }
    paintButtons(e);
  }

  function paintButtons(e) {
    if (!e.listenBtn) return;
    const st = playerState();
    const current = !!st.track && !!e.trackIds?.has(String(st.track.id));
    const playing = current && st.playing;
    e.listenBtn.disabled = !e.chosen || e.busy || (!!e.tracks && !e.tracks.length);
    e.listenBtn.classList.toggle('busy', e.busy);
    e.listenBtn.classList.toggle('current', current);
    e.listenBtn.setAttribute('aria-label', `${playing ? 'Pause' : 'Listen to'} ${e.label}`);
    e.ringEl.replaceChildren(playing ? icon('pause', 13) : sym('listenRing', 22));
  }

  // ----- carousel -----
  const carousel = h('div', { class: 'cp-carousel', role: 'list', 'aria-label': 'Recordings of the programme' },
    entries.map(buildCard));

  if (typeof IntersectionObserver === 'function') {
    const byEl = new Map(entries.map((e) => [e.el, e]));
    const io = new IntersectionObserver((list) => {
      for (const en of list) {
        const e = byEl.get(en.target);
        if (!e) continue;
        e.visible = en.isIntersecting;
        if (e.visible && e.chosen) ensureTracks(e);
      }
    }, { root: carousel, threshold: 0.35 });
    entries.forEach((e) => io.observe(e.el));
    ctx.observe(io);
  } else {
    entries.forEach((e) => { e.visible = true; });
  }

  // ----- Play all -----
  let playAllBusy = false;
  const playAllLabel = h('span', {}, 'Play all');
  const playAllBtn = h('button', { type: 'button', class: 'cp-playall', 'aria-label': 'Play previews of the whole programme' },
    icon('play', 14), playAllLabel);
  playAllBtn.onclick = async () => {
    if (playAllBusy) return;
    const ready = entries.every((e) => e.tracks || (e.albums && !e.albums.length) || (e.error && !e.albums));
    let queue;
    if (ready) {
      queue = entries.flatMap((e) => e.tracks || []);
    } else {
      playAllBusy = true;
      playAllBtn.disabled = true;
      playAllLabel.textContent = 'Lining up…';
      const lists = await Promise.all(entries.map(tracksFor));
      playAllBusy = false;
      if (!ctx.alive()) return;
      playAllBtn.disabled = false;
      playAllLabel.textContent = 'Play all';
      queue = lists.flat();
    }
    if (!queue.length) {
      toast('No previews found for this programme');
      return;
    }
    if (playerState().track?.id === queue[0].id) player.stop();
    player.play(queue[0], queue);
    toast(`Playing ${plural(queue.length, 'preview')} in programme order`);
  };

  // ----- Add playlist to my Library -----
  const playlistId = `concert-${c.id}`;
  const playlistRecord = () => ({
    id: playlistId,
    name: c.title,
    concertId: c.id,
    items: entries.map((e) => ({
      workId: e.real ? e.work.id : null,
      collectionId: e.chosen?.id ?? null,
      title: e.work.title,
      composer: e.it.composerShort || e.it.composerName || '',
      artist: e.chosen?.artist || null,
      artwork: e.chosen?.artwork || null,
    })),
  });
  const plInput = h('input', { type: 'checkbox' });
  plInput.checked = store.hasPlaylist(playlistId);
  plInput.addEventListener('change', () => {
    const on = store.togglePlaylist(playlistRecord());
    plInput.checked = on;
    toast(on ? 'Playlist added to your Library' : 'Playlist removed from your Library');
  });
  const plRow = h('label', { class: 'cp-playlist' }, plInput, h('span', {}, 'Add playlist to my Library'),
    h('span', { class: 'n' }, plural(entries.length, 'work')));

  const term0 = searchTerm(entries[0].work);
  const el = h('section', { class: 'cp-listen', 'aria-label': 'Listen' },
    carousel,
    h('div', { class: 'cp-listen-foot' },
      entries.length ? playAllBtn : null,
      plRow,
      h('p', { class: 'cp-credit' }, ITUNES_CREDIT, ' ',
        h('a', { href: classicalSearchURL(term0), ...extAttrs }, 'Apple Music Classical'), ' · ',
        h('a', { href: appleMusicSearchURL(term0), ...extAttrs }, 'Apple Music'))));

  entries.forEach(loadAlbums);

  let lastSig = '';
  return {
    el,
    onListenChoice() {
      entries.forEach(applyChosen);
    },
    onPlayer(st) {
      const sig = `${st.track?.id ?? ''}|${st.playing}`;
      if (sig === lastSig) return;
      lastSig = sig;
      entries.forEach(paintButtons);
    },
    paintPlaylist() {
      plInput.checked = store.hasPlaylist(playlistId);
    },
  };
}

// ---------- 5. program ----------
function rolesTable(credits) {
  const groups = new Map();
  for (const cr of credits) {
    if (!groups.has(cr.role)) groups.set(cr.role, []);
    groups.get(cr.role).push(cr);
  }
  const dl = h('dl', { class: 'cp-roles' });
  for (const [role, list] of groups) {
    dl.append(
      h('dt', {}, `${role}:`),
      h('dd', {}, list.map((cr) => h('div', {},
        cr.artistId && repo.artist(cr.artistId) ? h('a', { href: href.artist(cr.artistId) }, cr.name) : cr.name))));
  }
  return dl;
}

function workRow(it) {
  const comp = it.composerShort || it.composerName;
  const title = [it.title || 'Work to be announced', it.catalog].filter(Boolean).join(', ');
  const inner = [
    h('div', { class: 'main' },
      comp ? h('div', { class: 'comp' }, comp) : null,
      h('div', { class: 'work' }, title)),
    it.work ? icon('chevron', 16, 'chev') : null,
  ];
  return it.work
    ? h('a', { class: 'cp-work', href: href.work(it.work.id), 'aria-label': `${comp ? `${comp}: ` : ''}${title} — work page` }, inner)
    : h('div', { class: 'cp-work' }, inner);
}

function programSection(c, items) {
  const credits = c.credits || [];
  const sec = h('section', { class: 'cp-section cp-program' }, h('h2', { class: 'pill-label' }, 'Program'));
  if (!credits.length && !items.length) {
    sec.append(h('p', { class: 'cp-tba' }, 'Performers and programme to be announced.'));
    return sec;
  }
  if (credits.length) sec.append(rolesTable(credits));
  sec.append(items.length ? h('div', { class: 'cp-works' }, items.map(workRow)) : h('p', { class: 'cp-tba' }, 'Programme to be announced.'));
  return sec;
}

// ---------- 6. program book ----------
function guideFor(workId) {
  const g = GUIDES ? GUIDES[workId] : null;
  if (typeof g === 'string') return g;
  if (g && typeof g.text === 'string') return g.text;
  return null;
}

function hookFor(workId) {
  const own = HOOKS && HOOKS[workId];
  if (typeof own === 'string' && own) return own.replace(/^\s*listen for\s+/i, '');
  for (const list of Object.values(WIDELY_LOVED || {})) {
    if (!Array.isArray(list)) continue;
    const hit = list.find((x) => x && x.workId === workId);
    const text = hit && (hit.hook || hit.listenFor || hit.why);
    // guides.js hooks are full sentences starting "Listen for…"; the chapter adds its own bold label.
    if (typeof text === 'string' && text) return text.replace(/^\s*listen for\s+/i, '');
  }
  return null;
}

function factsOf(w, comp, it) {
  return [
    ['Composer', comp ? `${comp.name} (${comp.died ? `${comp.born}–${comp.died}` : `b. ${comp.born}`})` : it.composerName],
    ['Year', w.year ? String(w.year) : null],
    ['Catalogue', w.catalog],
    ['Length', w.minutes ? `about ${w.minutes} minutes` : null],
    ['Form', GENRE_LABELS[w.genre] || null],
  ].filter(([, v]) => v);
}

function bookChapters(c, items) {
  const chapters = [];
  const seen = new Set();
  for (const it of items) {
    const w = it.work;
    if (!w || seen.has(w.id)) continue;
    seen.add(w.id);
    const comp = it.composer || repo.composer(w.composerId) || null;
    const guide = guideFor(w.id);
    chapters.push({
      kicker: it.composerShort || comp?.short || '',
      title: [w.title, w.catalog].filter(Boolean).join(', '),
      pill: w.title,
      composer: comp,
      paragraphs: guide ? paragraphs(guide) : paragraphs(w.blurb),
      hook: hookFor(w.id),
      facts: factsOf(w, comp, it),
      workId: w.id,
    });
  }
  // Imported listings may carry the organiser's own programme notes (demo notes only repeat the blurbs).
  if (!c.demo && c.notes) {
    chapters.push({ kicker: 'From the organiser', title: 'Programme notes', pill: 'Programme notes', composer: null, paragraphs: paragraphs(c.notes), hook: null, facts: [], workId: null });
  }
  return chapters.filter((ch) => ch.paragraphs.length || ch.facts.length);
}

function chapterEl(ch, i, full) {
  return h('section', { class: ['cp-ch', full && 'full'], dataset: { i: String(i) } },
    full && ch.composer ? avatar(ch.composer.name, false, ch.composer.id) : null,
    ch.kicker ? h('div', { class: 'cp-ch-kicker' }, ch.kicker) : null,
    h(full ? 'h2' : 'h3', { class: 'cp-ch-title' }, ch.title),
    h('div', { class: 'cp-ch-body' },
      ch.paragraphs.map((p) => h('p', {}, inline(p))),
      ch.hook ? h('p', { class: 'cp-ch-hook' }, h('b', {}, 'Listen for '), ch.hook) : null,
      // Sheng's chapters are prose only; the key facts only fill in when there is no essay
      !ch.paragraphs.length && ch.facts.length ? h('dl', { class: 'cp-ch-facts' }, ch.facts.map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])) : null));
}

function programBook(c, items, ctx) {
  const chapters = bookChapters(c, items);
  if (!chapters.length) return null;

  const chapterEls = chapters.map((ch, i) => chapterEl(ch, i, false));
  const scroller = h('div', { class: 'cp-book-scroll', tabindex: '0', role: 'region', 'aria-label': 'Program book · double-tap for full screen' }, chapterEls);
  const dots = chapters.map((ch, i) => h('button', {
    type: 'button',
    class: 'cp-rail-dot',
    'aria-label': `Chapter ${i + 1}: ${ch.pill}`,
    onclick: () => goTo(i),
  }, String(i + 1)));
  const rail = h('nav', { class: 'cp-rail', 'aria-label': 'Chapters' }, dots);
  const hint = h('div', { class: 'cp-book-hint', 'aria-hidden': 'true' }, 'Double-tap for full screen');
  const fullBtn = h('button', { type: 'button', class: 'cp-book-full', 'aria-label': 'Read the program book full screen', onclick: () => openReader(active) }, expandIcon());
  const card = h('div', { class: 'cp-book-card' }, scroller, hint, fullBtn);

  let active = -1;
  function setActive(i) {
    if (i === active) return;
    active = i;
    dots.forEach((d, j) => {
      d.classList.toggle('on', j === i);
      if (j === i) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
  }
  setActive(0);

  function measure() {
    const top = scroller.scrollTop;
    if (top > 0 && top + scroller.clientHeight >= scroller.scrollHeight - 4) {
      setActive(chapterEls.length - 1);
      return;
    }
    let idx = 0;
    chapterEls.forEach((el, i) => {
      if (el.offsetTop - 48 <= top) idx = i;
    });
    setActive(idx);
  }
  let raf = 0;
  scroller.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      measure();
    });
  }, { passive: true });

  function goTo(i, behavior = scrollBehavior()) {
    const el = chapterEls[i];
    if (!el) return;
    scroller.scrollTo({ top: Math.max(0, el.offsetTop - 2), behavior });
    setActive(i);
  }

  // ----- hint + double-tap -----
  let hintTimer = 0;
  let lastOpen = 0;
  function showHint() {
    hint.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = ctx.later(() => hint.classList.remove('show'), 1600);
  }
  let touch = null;
  let lastTap = 0;
  scroller.addEventListener('touchstart', (ev) => {
    const t = ev.touches[0];
    touch = ev.touches.length === 1 ? { x: t.clientX, y: t.clientY, at: Date.now() } : null;
  }, { passive: true });
  scroller.addEventListener('touchend', (ev) => {
    const t = ev.changedTouches[0];
    if (!touch || !t || Math.hypot(t.clientX - touch.x, t.clientY - touch.y) > 12 || Date.now() - touch.at > 350) {
      lastTap = 0;
      return;
    }
    const now = Date.now();
    if (now - lastTap < 320) {
      ev.preventDefault();
      lastTap = 0;
      openReader(active);
    } else {
      lastTap = now;
    }
  }, { passive: false });
  scroller.addEventListener('dblclick', (ev) => {
    if (ev.target.closest('a, button')) return;
    ev.preventDefault();
    openReader(active);
  });
  scroller.addEventListener('click', (ev) => {
    if (ev.target.closest('a, button')) return;
    ctx.later(() => {
      if (Date.now() - lastOpen > 700 && !readerOpen) showHint();
    }, 340);
  });
  if (typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver((list) => {
      if (list.some((en) => en.isIntersecting)) {
        io.disconnect();
        showHint();
      }
    }, { threshold: 0.6 });
    io.observe(card);
    ctx.observe(io);
  }

  // ----- full-screen reader -----
  let readerOpen = false;
  function openReader(start) {
    if (readerOpen) return;
    readerOpen = true;
    lastOpen = Date.now();
    hint.classList.remove('show');
    let idx = Math.max(0, start);
    const pills = h('div', { class: 'cp-rd-pills', role: 'tablist', 'aria-label': 'Chapters' });
    const onKey = (e) => {
      if (e.key === 'ArrowRight' && idx < chapters.length - 1) show(idx + 1);
      else if (e.key === 'ArrowLeft' && idx > 0) show(idx - 1);
    };
    const sheet = ctx.keepSheet(openSheet({
      title: 'Program book',
      subtitle: c.title,
      body: h('div'),
      footer: chapters.length > 1 ? pills : null,
      onClose: () => {
        readerOpen = false;
        document.removeEventListener('keydown', onKey);
      },
    }));
    sheet.el.classList.add('cp-reader');
    const bodyEl = sheet.el.querySelector('.sheet-body');
    function show(i) {
      idx = i;
      sheet.setBody(chapterEl(chapters[i], i, true));
      if (bodyEl) bodyEl.scrollTop = 0;
      clear(pills).append(...chapters.map((ch, j) => h('button', {
        type: 'button',
        role: 'tab',
        class: ['cp-rd-pill', j === i && 'on'],
        'aria-selected': j === i ? 'true' : 'false',
        onclick: () => show(j),
      }, ch.pill)));
      requestAnimationFrame(() => {
        const on = pills.querySelector('.on');
        if (on) pills.scrollLeft = Math.max(0, on.offsetLeft - (pills.clientWidth - on.offsetWidth) / 2);
      });
      goTo(i, 'auto');
    }
    document.addEventListener('keydown', onKey);
    if (bodyEl) {
      let sx = null;
      bodyEl.addEventListener('touchstart', (ev) => {
        const t = ev.touches[0];
        sx = ev.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
      }, { passive: true });
      bodyEl.addEventListener('touchend', (ev) => {
        const t = ev.changedTouches[0];
        if (!sx || !t) return;
        const dx = t.clientX - sx.x;
        const dy = t.clientY - sx.y;
        sx = null;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        if (dx < 0 && idx < chapters.length - 1) show(idx + 1);
        else if (dx > 0 && idx > 0) show(idx - 1);
      }, { passive: true });
    }
    show(idx);
  }

  const el = h('section', { class: 'cp-section cp-bookwrap' },
    h('h2', { class: 'pill-label' }, 'Program book'),
    h('div', { class: 'cp-book' }, chapters.length > 1 ? rail : null, card));
  return { el };
}

// ---------- 7. podcasts ----------
function composerKey(name) {
  return normalize(name || '').replace(/^[a-z]\.\s*/, '').split(/\s+/)[0] || '';
}

// Short search title: the quoted name if there is one ("Wachet auf…"), else the title without
// the key for numbered works ("Symphony No. 9 in D minor" -> "Symphony No. 9").
function podcastTitle(t) {
  const q = /[“"«]([^”"»]+)[”"»]/.exec(t || '');
  if (q) return q[1];
  let base = String(t || '').split(/[(,:;]/)[0].trim();
  if (/No\.\s*\d/.test(base)) base = base.replace(/\s+in\s+[A-G]\b.*$/i, '').trim();
  return base || t;
}

function podcastsSection(entries, ctx) {
  const list = h('div', { class: 'cp-pods' });
  const el = h('section', { class: 'cp-section cp-podcasts', hidden: true },
    h('h2', { class: 'caps-label' }, 'Podcasts'), list);
  const picks = entries.slice(0, PODCAST_WORKS);
  (async () => {
    const seen = new Set();
    const found = [];
    for (const e of picks) {
      const comp = e.it.composerShort || e.it.composerName || '';
      const key = composerKey(comp);
      let res = [];
      try {
        res = await searchPodcasts(`${comp} ${podcastTitle(e.work.title)}`.trim(), 10);
      } catch {
        continue;
      }
      if (!ctx.alive()) return;
      let n = 0;
      for (const ep of res) {
        if (n >= PODCAST_PER_WORK || found.length >= PODCAST_MAX) break;
        if (!ep.url || !ep.title || seen.has(ep.id)) continue;
        if (key && !normalize(`${ep.title} ${ep.show} ${ep.description}`).includes(key)) continue;
        seen.add(ep.id);
        found.push(ep);
        n += 1;
      }
    }
    if (!ctx.alive() || !found.length) return;
    list.append(...found.map((ep) => h('a', { class: 'cp-pod', href: ep.url, ...extAttrs, 'aria-label': `${ep.title} — ${ep.show} (Apple Podcasts)` },
      ep.artwork ? h('img', { src: ep.artwork, alt: '', loading: 'lazy' }) : h('span', { class: 'ph' }, icon('podcast', 20)),
      h('span', { class: 'main' }, h('span', { class: 't' }, ep.title), h('span', { class: 's' }, ep.show || 'Apple Podcasts')),
      icon('chevron', 16))));
    el.hidden = false;
    ctx.setPodcastsReady(el);
  })();
  return el;
}

// ---------- 8. featured artists ----------
function artistsSection(c, items) {
  const composers = [...new Map(items.filter((it) => it.composer).map((it) => [it.composer.id, it.composer])).values()];
  const seen = new Set();
  const performers = (c.credits || []).filter((cr) => {
    const key = cr.artistId || cr.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!composers.length && !performers.length) return null;
  const chip = (cr) => {
    if (!cr.artistId || !repo.artist(cr.artistId)) return h('span', { class: 'cp-person plain' }, cr.name);
    const fav = followButton('artist', cr.artistId, { labelOn: '', labelOff: '', iconName: 'heart' });
    fav.setAttribute('aria-label', `Favourite ${cr.name}`);
    return h('span', { class: 'cp-person' }, h('a', { href: href.artist(cr.artistId) }, cr.name), fav);
  };
  return h('section', { class: 'cp-section cp-artists' },
    h('h2', { class: 'caps-label' }, 'Featured artists'),
    composers.length ? h('div', { class: 'cp-composers' }, composers.map((comp) =>
      h('a', { class: 'cp-composer', href: href.composer(comp.id) }, avatar(comp.name, false, comp.id), h('span', {}, comp.name)))) : null,
    performers.length ? h('div', { class: 'chip-wrap cp-performers' }, performers.map(chip)) : null);
}

// ---------- 9. related lists, notes, report ----------
function sourceNote(c) {
  if (c.demo) {
    return h('div', { class: 'demo-banner concert-source' }, icon('sparkle', 16),
      h('div', {}, 'Demo listing: the venue and works are real, the performers are invented and this concert isn’t taking place. ',
        h('a', { href: '#/me/data' }, 'Import real listings'), ' or turn demo data off.'));
  }
  if (c.source === 'import' || c.source === 'feed') {
    const url = c.sourceUrl || c.url;
    return h('div', { class: 'demo-banner concert-source' }, icon('upload', 16),
      h('div', {}, 'Imported listing. Check times and programme with the organiser',
        url ? [' — ', h('a', { href: url, ...extAttrs }, 'open the original')] : null, '.'));
  }
  return null;
}

function listingText(c, items) {
  return [
    c.title,
    c.series || null,
    `${fmtWhen(c.start, TZ)} (Swiss time)`,
    whereLine(c),
    items.length ? `Programme: ${items.map(programLine).join('; ')}` : null,
    (c.credits || []).length ? `Performers: ${c.credits.map((cr) => `${cr.role}: ${cr.name}`).join('; ')}` : null,
    shareURL(c),
  ].filter(Boolean).join('\n');
}

function openReport(c, items, keepSheet) {
  const imported = c.source === 'import' || c.source === 'feed';
  const url = c.sourceUrl || c.url;
  let sheet = null;
  const action = (iconName, label, fn) => h('button', {
    type: 'button',
    class: 'row-item cp-menu-row',
    onclick: () => {
      sheet?.close();
      fn();
    },
  }, h('span', { class: 'lead-icon' }, icon(iconName, 18)), h('div', { class: 'main' }, h('div', { class: 't' }, label)));
  const intro = c.demo
    ? 'This is a demo listing. The venue and the works are real, but the performers are invented and the concert isn’t taking place, so there is nothing to correct here.'
    : imported
      ? 'This listing comes from a calendar file or feed that you imported on this device, so any mistake is in that source.'
      : 'Klang keeps everything on this device and has no server, so it can’t forward a report.';
  const steps = c.demo
    ? ['Turn demo concerts off, or import real listings from a venue’s calendar, in Me › Data.']
    : [
      'Check the date, time and programme with the organiser — copy the details below to send them.',
      'Correct the source calendar or feed, then import it again in Me › Data.',
      'Or hide this concert so it no longer shows up in your lists.',
    ];
  const body = h('div', { class: 'cp-sheet-text' },
    h('p', {}, intro),
    h('ul', {}, steps.map((s) => h('li', {}, s))),
    h('div', { class: 'group' },
      action('notes', 'Copy listing details', () => copyText(listingText(c, items), 'Listing details copied')),
      url ? action('external', 'Open the original listing', () => window.open(url, '_blank', 'noopener')) : null,
      action('eyeoff', store.isHidden(c.id) ? 'Show this concert again' : 'Hide this concert', () => toggleHide(c)),
      action('gear', 'Manage data', () => { location.hash = '#/me/data'; })));
  sheet = keepSheet(openSheet({
    title: 'Report a problem',
    subtitle: c.title,
    body,
    footer: h('div', { class: 'hint' }, 'Nothing is sent from this page.'),
  }));
}

function openMenu(c, items, keepSheet) {
  let sheet = null;
  const row = (iconName, label, fn) => h('button', {
    type: 'button',
    class: 'row-item cp-menu-row',
    onclick: () => {
      sheet?.close();
      fn();
    },
  }, h('span', { class: 'lead-icon' }, icon(iconName, 18)), h('div', { class: 'main' }, h('div', { class: 't' }, label)));
  // Sheng's top bar has only Back and Share; Klang's extra actions sit in the share sheet.
  const body = h('div', { class: 'group' },
    navigator.share ? row('share', 'Share…', () => shareConcert(c)) : null,
    row('notes', 'Copy link', () => copyText(shareURL(c))),
    row('calendar', 'Add to calendar', () => addToCalendar(c, items)),
    row('eyeoff', store.isHidden(c.id) ? 'Show this concert again' : 'Hide this concert', () => toggleHide(c)));
  sheet = keepSheet(openSheet({ title: 'Share', subtitle: `${c.title} · ${relDayLabel(c.day)}`, body }));
}

// ---------- page ----------
export function render({ id } = {}) {
  const c = id ? repo.concert(id) : null;
  if (!c) {
    return {
      title: 'Concert',
      back: true,
      body: emptyState('calendar', 'Concert not found',
        'It may have been removed, or demo concerts are turned off in Settings.',
        h('a', { class: 'btn small', href: '#/concerts' }, 'Browse concerts')),
    };
  }

  let alive = true;
  const sheets = new Set();
  const observers = [];
  const timers = new Set();
  const keepSheet = (s) => {
    if (s) sheets.add(s);
    return s;
  };

  const items = repo.programItems(c);
  const started = isPast(c.start);
  const entries = listenEntries(items);
  const bar = actionBar(c);

  const ctx = {
    alive: () => alive,
    keepSheet,
    observe: (io) => observers.push(io),
    later(fn, ms) {
      const t = setTimeout(() => {
        timers.delete(t);
        if (alive) fn();
      }, ms);
      timers.add(t);
      return t;
    },
    setListenReady: (on) => bar.set('listen', on),
    setPodcastsReady: (el) => bar.set('podcasts', true, el),
  };

  const head = headBand(c, items, bar);

  // personal marks + review (live)
  const marksEl = h('div', { class: 'concert-marks cp-marks' });
  const paintMarks = () => {
    const m = store.markOf(c.id);
    const focused = marksEl.contains(document.activeElement) ? document.activeElement.dataset?.mark : null;
    clear(marksEl).append(...[
      markButtons(c, m, started),
      m.attended ? reviewCard(c, items, m, keepSheet) : reviewHint(c, started)].filter(Boolean));
    if (focused) marksEl.querySelector(`[data-mark="${focused}"]`)?.focus();
  };
  paintMarks();

  const listen = listenBlock(c, entries, ctx);
  const programEl = programSection(c, items);
  const book = programBook(c, items, ctx);
  const podcastsEl = podcastsSection(entries, ctx);

  if (listen) bar.set('listen', false, listen.el);
  bar.set('program', true, programEl);
  if (book) bar.set('notes', true, book.el);

  const topbar = h('div', { class: 'cp-topbar' },
    h('button', { class: 'cp-fab', type: 'button', 'aria-label': 'Back', onclick: () => goBack() }, icon('back', 20)),
    h('div', { class: 'cp-topbar-r' },
      h('button', { class: 'cp-fab', type: 'button', 'aria-label': 'Share concert', 'aria-haspopup': 'dialog', onclick: () => openMenu(c, items, keepSheet) }, icon('share', 18))));

  const body = h('div', { class: 'concert-page cp-page' },
    topbar,
    head.el,
    marksEl,
    listen?.el,
    programEl,
    book?.el,
    podcastsEl,
    artistsSection(c, items),
    h('div', { class: 'cp-report-wrap' },
      h('button', { type: 'button', class: 'cp-report', onclick: () => openReport(c, items, keepSheet) }, sym('report', 16, 2.2), 'Report a problem')),
    sourceNote(c));

  const unsubStore = store.subscribe((topic) => {
    if (!alive) return;
    if (topic === 'marks') paintMarks();
    else if (topic === 'hidden') head.paintHidden();
    else if (topic === 'listen') listen?.onListenChoice();
    else if (topic === 'library') listen?.paintPlaylist();
  });
  const unsubPlayer = listen ? player.subscribe((st) => alive && listen.onPlayer(st)) : () => {};

  return {
    title: c.title,
    header: false, // like Sheng: floating back / share buttons over the header band
    body,
    cleanup() {
      alive = false;
      unsubStore();
      unsubPlayer();
      observers.forEach((io) => io.disconnect());
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      [...sheets].forEach((s) => s.close());
      sheets.clear();
    },
  };
}
