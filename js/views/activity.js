// Activity tab — modelled on Sheng's Activity tab (SPEC §3.8, screens activity-01…05), personal
// only: no other users, following people, messages, reactions or comments. Everything shown here
// lives on this device.
//
//   #/activity          profile row (name from Me · Following N › · bell → #/notifications) ·
//                       My concerts (Attended / Saved / Going) · My Favorites (Composers / Artists /
//                       Works) · Timeline (your activity)
//   #/activity/<list>   attended | saved | going | composers | artists | works | venues | cities |
//                       following (venues and cities you follow with ☆, searchable — Sheng's Following)
//
// "Listened to …" entries are pieces Klang sent to Apple Music Classical / Apple Music
// (applemusic.js); tapping one opens it there again. Klang itself plays no audio.

import { h, icon, clear, toast, download, plural, normalize, storage } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { buildICS } from '../ics.js';
import { href, concertCard, emptyState, avatar, initials, cityLabel } from '../ui/components.js';
import { todayKey, dayKeyOf, daysBetween, isPast, monthShort, dayNum, yearOf, timeOf } from '../time.js';
import { unreadCount as notificationsUnread } from './me.js';
import { makePiece, listenLink, playAppName } from '../applemusic.js';

const MARK_PILLS = [
  { kind: 'attended', label: 'Attended', iconName: 'check' },
  { kind: 'saved', label: 'Saved', iconName: 'heart' },
  { kind: 'going', label: 'Going', iconName: 'ticket' },
];

const FAVS = [
  { list: 'composers', kind: 'composer', label: 'Composers', one: 'composer', page: 'composer' },
  { list: 'artists', kind: 'artist', label: 'Artists', one: 'artist', page: 'performer' },
  { list: 'works', kind: 'work', label: 'Works', one: 'work', page: 'work' },
  { list: 'venues', kind: 'venue', label: 'Venues', one: 'venue', page: 'venue', follow: true },
  { list: 'cities', kind: 'city', label: 'Cities', one: 'city', many: 'cities', page: 'city', follow: true },
];
// Sheng's My Favorites row has exactly three pills; venues and cities (followed with ☆) live
// under "Following N ›" in the profile row instead.
const FAV_PILLS = FAVS.filter((f) => !f.follow);
const FOLLOW_KINDS = FAVS.filter((f) => f.follow);
const followingCount = () => FOLLOW_KINDS.reduce((n, f) => n + store.followed(f.kind).length, 0);

const MARK_TITLES = { attended: 'Attended', saved: 'Saved', going: 'Going' };
const TIMELINE_PAGE = 30;

// ---------- small helpers ----------
const ended = (c) => isPast(c.start, c.durationMin || 120);
const byStart = (a, b) => a.start.localeCompare(b.start);
const byStartDesc = (a, b) => b.start.localeCompare(a.start);
const venueName = (c) => repo.venue(c.venueId)?.name || c.venueName || '';
const leadIcon = (name) => h('span', { class: 'lead-icon' }, icon(name, 18));
const upLabel = (n) => (n ? `${n.toLocaleString('en-US')} upcoming` : 'Nothing upcoming');
const dayOf = (c) => c.day || dayKeyOf(c.start);

function dateLabel(k) {
  return `${monthShort(k)} ${dayNum(k)}${yearOf(k) !== yearOf(todayKey()) ? `, ${yearOf(k)}` : ''}`;
}

// "Nov 3 · 19:30"
function concertWhen(c) {
  return `${dateLabel(dayOf(c))} · ${timeOf(c.start)}`;
}

// "Just now" / "12 min ago" / "3 h ago" / "Yesterday" / "4 days ago" / "Oct 12"
function ago(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.floor(min / 60)} h ago`;
  const k = dayKeyOf(iso);
  const d = daysBetween(k, todayKey());
  if (d <= 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  return dateLabel(k);
}

function ratingStars(rating) {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return h('div', { class: 'rating-stars', role: 'img', 'aria-label': `Rated ${n} out of 5` },
    Array.from({ length: 5 }, (_, i) => icon('star', 14, i < n ? 'on' : '')));
}

function prettyId(id) {
  return String(id).replace(/^(artist|venue)-(import-)?/, '').replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function markedConcerts(kind) {
  const ids = store.markedIds(kind);
  const list = ids.map((id) => repo.concert(id)).filter(Boolean);
  return { list, missing: ids.length - list.length };
}

function missingNote(missing) {
  if (!missing) return null;
  return h('p', { class: 'act-note' },
    `${plural(missing, 'marked concert')} ${missing === 1 ? 'isn’t' : 'aren’t'} in the current listings (demo concerts off or imports removed).`);
}

// ---------- favourites: name, link, lead visual and a lazily computed subtitle ----------
function favInfo(kind, id, cityCounts = null) {
  const up = (opts) => upLabel(repo.upcoming(opts).length);
  if (kind === 'composer') {
    const c = repo.composer(id);
    if (c) {
      return {
        name: c.name, short: c.short || c.name, to: href.composer(id), lead: () => avatar(c.name, true, id),
        sub: () => [c.died ? `${c.born}–${c.died}` : `b. ${c.born}`, up({ composerId: id })].join(' · '),
      };
    }
  } else if (kind === 'artist') {
    const a = repo.artist(id);
    if (a) {
      return {
        name: a.name, short: a.name, to: href.artist(id), lead: () => avatar(a.name, true),
        sub: () => [a.role, up({ artistId: id })].filter(Boolean).join(' · '),
      };
    }
  } else if (kind === 'work') {
    const w = repo.work(id);
    if (w) {
      const comp = repo.composer(w.composerId);
      return {
        name: w.title, short: w.title, composer: comp?.short || '', to: href.work(id), lead: () => leadIcon('music'),
        sub: () => [comp?.short, w.catalog, up({ workId: id })].filter(Boolean).join(' · '),
      };
    }
  } else if (kind === 'venue') {
    const v = repo.venue(id);
    if (v) {
      return {
        name: v.name, short: v.name, to: href.venue(id), lead: () => leadIcon('map'),
        sub: () => [repo.city(v.cityId)?.name, up({ venueId: id })].filter(Boolean).join(' · '),
      };
    }
  } else if (kind === 'city') {
    const c = repo.city(id);
    if (c) {
      return {
        name: c.name, short: c.name, to: href.city(id), lead: () => leadIcon('pin'),
        sub: () => [repo.cantonName(c.canton), upLabel(cityCounts ? cityCounts.get(id) || 0 : repo.upcoming({ cityIds: [id] }).length)].filter(Boolean).join(' · '),
      };
    }
  }
  const name = prettyId(id);
  return { name, short: name, to: null, lead: () => leadIcon('heart'), sub: () => 'Not in the current listings' };
}

// ---------- bell: unread in-app notifications ----------
// Same source as #/notifications (me.js listNotifications + store read state), so the red dot
// clears exactly when the Notifications page has been opened (it marks everything shown as read).
function unreadCount() {
  try {
    return notificationsUnread();
  } catch (err) {
    console.error(err);
    return 0;
  }
}

// ---------- root: profile, My concerts, My Favorites, Timeline ----------
function profileRow() {
  const name = String(store.pref('profileName') || '').trim();
  const photo = store.pref('avatar');
  const unread = unreadCount();
  const following = followingCount();
  return h('div', { class: 'act-top' },
    h('a', { class: 'act-avatar', href: '#/me', 'aria-label': 'Me and settings' },
      typeof photo === 'string' && photo.startsWith('data:image/')
        ? h('img', { src: photo, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' } })
        : name ? initials(name).toUpperCase().slice(0, 2) : icon('person', 26)),
    h('div', { class: 'act-who' },
      h('a', { class: 'act-name', href: '#/me' }, name || 'Me'),
      h('a', { class: 'act-edit', href: '#/activity/following', 'aria-label': `Following ${following}: venues and cities` },
        `Following ${following.toLocaleString('en-US')}`, icon('chevron', 12))),
    h('a', {
      class: 'act-bell',
      href: '#/notifications',
      'aria-label': unread ? `Notifications, ${unread} new` : 'Notifications',
    }, icon('bell', 22), unread ? h('i', { class: 'act-dot' }) : null));
}

// Sheng's Going glyph: a filled amber ticket with a cut-out centre.
function goingGlyph(size) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="3.2" fill="currentColor"/><rect x="7" y="9.2" width="10" height="5.6" rx="1.2" fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="1.6"/></svg>`;
  return span;
}

function markPill({ kind, label, iconName }) {
  const n = store.markedIds(kind).length;
  return h('a', { class: 'act-pill', href: `#/activity/${kind}`, 'aria-label': `${label}: ${n}` },
    h('span', { class: `act-ic ${kind}` }, kind === 'going' ? goingGlyph(17) : icon(iconName, kind === 'attended' ? 11 : 15)),
    h('span', { class: 'l' }, label),
    n ? h('span', { class: 'n' }, n.toLocaleString('en-US')) : null);
}

function favPill(def) {
  const n = store.followed(def.kind).length;
  return h('a', { class: 'act-pill', href: `#/activity/${def.list}`, 'aria-label': `Favourite ${def.label.toLowerCase()}: ${n}` },
    h('span', { class: 'l' }, def.label),
    n ? h('span', { class: 'n' }, n.toLocaleString('en-US')) : null);
}

// ----- timeline -----
// An entry stays in your story while it is still true (unsaving a concert drops "Saved …").
function stillTrue(e) {
  switch (e.type) {
    case 'saved':
    case 'going':
    case 'attended':
      return store.isMarked(e.id, e.type);
    case 'review': {
      const m = store.markOf(e.id);
      return !!(m.rating || m.note || m.favoriteWorkId || m.encores);
    }
    case 'favorite':
      return store.isFollowing(e.kind, e.id);
    case 'library':
      return store.hasAlbum(e.id);
    case 'playlist':
      return store.hasPlaylist(e.id);
    case 'listen':
      return true;
    default:
      return false; // hidden concerts and unknown types stay out of the timeline
  }
}

function openFromLibrary(kind, item) {
  import('./library.js')
    .then((m) => (kind === 'album' ? m.openAlbumSheet(item) : m.openPlaylistSheet(item)))
    .catch((err) => {
      console.error(err);
      location.hash = kind === 'album' ? '#/library/albums' : '#/library/playlists';
    });
}

function describeEntry(e) {
  if (['saved', 'going', 'attended', 'review'].includes(e.type)) {
    const c = repo.concert(e.id);
    if (!c) return null;
    const verb = { saved: 'Saved', going: 'Going to', attended: 'Attended', review: 'Reviewed' }[e.type];
    const venue = venueName(c);
    const m = e.type === 'review' ? store.markOf(e.id) : null;
    const note = m ? String(m.note || '').trim() : '';
    return {
      tone: e.type,
      iconName: { saved: 'heart', going: 'ticket', attended: 'check', review: 'star' }[e.type],
      to: href.concert(c.id),
      text: [verb, ' ', h('b', {}, c.title), venue ? [' at ', venue] : null],
      sub: [h('span', { class: 'when' }, concertWhen(c)), cityLabel(c) || null],
      extra: m ? [m.rating ? ratingStars(m.rating) : null, note ? h('p', { class: 'tl-quote' }, note) : null] : null,
    };
  }
  if (e.type === 'favorite') {
    const def = FAVS.find((f) => f.kind === e.kind);
    const info = favInfo(e.kind, e.id);
    if (!def || !info.to) return null;
    return {
      tone: 'favorite',
      iconName: def.follow ? 'star' : 'heart',
      to: info.to,
      text: e.kind === 'work'
        ? ['Liked ', h('b', {}, info.composer ? `${info.composer}: ${info.name}` : info.name)]
        : def.follow
          ? ['Followed ', h('b', {}, info.name)]
          : ['Added ', h('b', {}, info.name), ` to your favourite ${(def.many || `${def.one}s`)}`],
      sub: null,
    };
  }
  if (e.type === 'library') {
    const a = store.libraryAlbums().find((x) => String(x.id) === String(e.id));
    if (!a) return null;
    return {
      tone: 'library',
      iconName: 'album',
      onClick: () => openFromLibrary('album', a),
      text: ['Added the album ', h('b', {}, a.title || e.label || 'Untitled'), ' to your Library'],
      sub: a.artist ? [a.artist] : null,
      thumb: a.artwork || null,
    };
  }
  if (e.type === 'playlist') {
    const p = store.libraryPlaylists().find((x) => x.id === e.id);
    if (!p) return null;
    const n = Array.isArray(p.items) ? p.items.length : 0;
    const own = p.kind === 'user';
    return {
      tone: 'library',
      iconName: 'playlist',
      onClick: () => openFromLibrary('playlist', p),
      text: own
        ? ['Created the playlist ', h('b', {}, p.name || e.label || 'Playlist')]
        : ['Added the playlist ', h('b', {}, p.name || e.label || 'Playlist'), ' to your Library'],
      sub: [`Playlist · ${plural(n, own ? 'piece' : 'work')}`],
    };
  }
  if (e.type === 'listen') {
    const piece = makePiece({
      id: e.id, kind: e.kind === 'album' ? 'album' : 'piece', title: e.label || 'a recording',
      composer: e.composer || null, artist: e.artist || '', collectionId: e.collectionId || null,
      trackId: e.trackId || null, artwork: e.artwork || null,
    });
    return listenEntry(piece, e.app);
  }
  return null;
}

// "Listened to <piece> · <app>": tap to open it again in Apple Music Classical / Apple Music.
function listenEntry(piece, app = null) {
  return {
    tone: 'listen',
    iconName: 'headphones',
    piece,
    text: ['Listened to ', h('b', {}, piece.title), app ? ` · ${app}` : null],
    sub: [piece.composer && piece.composer !== piece.title ? piece.composer : null, piece.artist || null],
    thumb: piece.artwork || null,
  };
}

// Listens posted from the old in-app player (klang.activity.posts.v1, kept in backups) still show;
// they now open in Apple Music too.
const POSTS_KEY = 'klang.activity.posts.v1';
const albumIdOf = (url) => /\/album\/(?:[^/?#]+\/)?(\d+)/.exec(String(url || ''))?.[1] || null;

function postedListens() {
  const v = storage.get(POSTS_KEY, []);
  return Array.isArray(v) ? v.filter((p) => p && p.trackId != null && p.at) : [];
}

function postedEntry(p) {
  const piece = makePiece({
    title: p.work || p.title || 'a recording', composer: p.composer || null, artist: p.artist || '',
    album: p.album || '', collectionId: p.collectionId || albumIdOf(p.url), trackId: p.trackId, artwork: p.artwork || null,
  });
  return { ...listenEntry(piece), at: p.at };
}

function timelineEntries() {
  const seen = new Set();
  const out = postedListens().map(postedEntry);
  for (const e of store.timeline()) {
    if (!e || !e.type || e.id == null) continue;
    const key = `${e.type}|${e.kind}|${e.id}`;
    if (seen.has(key)) continue; // newest first: keep the most recent of repeated actions
    seen.add(key);
    if (!stillTrue(e)) continue;
    const v = describeEntry(e);
    if (v) out.push({ ...v, at: e.at });
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function tlItem(v) {
  const kids = [
    h('span', { class: `tl-ic ${v.tone}` }, icon(v.iconName, 15)),
    h('div', { class: 'tl-main' },
      h('div', { class: 'tl-text' }, v.text),
      v.sub && v.sub.filter(Boolean).length
        ? h('div', { class: 'tl-sub' }, v.sub.filter(Boolean).map((s, i) => [i ? h('span', { class: 'sep' }, '·') : null, s]))
        : null,
      v.extra,
      h('div', { class: 'tl-ago' }, ago(v.at))),
    v.thumb ? h('img', { class: 'tl-thumb', src: v.thumb, alt: '', loading: 'lazy' }) : null,
  ];
  // a listen is a real link, so the tap itself hands the piece to the Music / Classical app
  if (v.piece) return listenLink(v.piece, kids, { cls: 'tl-item', label: `Listen again to ${v.piece.title} in ${playAppName()}` });
  const tag = v.to ? 'a' : 'button';
  return h(tag, { class: 'tl-item', href: v.to || null, type: tag === 'button' ? 'button' : null, onclick: v.onClick || null }, kids);
}

function timelineEmpty() {
  return h('div', { class: 'act-soft-empty' },
    h('h3', {}, 'Nothing here yet'),
    h('p', {}, 'Save concerts, like works, enjoy recordings — your musical story unfolds here.'));
}

function renderRoot() {
  const body = h('div', { class: 'act-page' });
  const tlWrap = h('div', { class: 'tl-wrap' });
  let shown = TIMELINE_PAGE;

  function paintTimeline() {
    const entries = timelineEntries();
    if (!entries.length) {
      clear(tlWrap).append(timelineEmpty());
      return;
    }
    clear(tlWrap).append(...[
      h('div', { class: 'tl' }, entries.slice(0, shown).map(tlItem)),
      entries.length > shown
        ? h('button', {
          class: 'btn small tl-more',
          type: 'button',
          onclick: () => {
            shown += TIMELINE_PAGE;
            paintTimeline();
          },
        }, `Show more · ${(entries.length - shown).toLocaleString('en-US')}`)
        : null].filter(Boolean));
  }

  function paint() {
    clear(body).append(
      profileRow(),
      h('h2', { class: 'act-h' }, 'My concerts'),
      h('div', { class: 'act-pills' }, MARK_PILLS.map(markPill)),
      h('h2', { class: 'act-h' }, 'My Favorites'),
      h('div', { class: 'act-pills' }, FAV_PILLS.map(favPill)),
      h('h2', { class: 'act-h' }, 'Timeline', h('small', {}, 'Your activity')),
      tlWrap);
    paintTimeline();
  }

  let later = 0;
  const unsub = store.subscribe((topic) => {
    if (['marks', 'follows', 'library', 'notifications', 'prefs'].includes(topic)) paint();
    // a new "Listened to …" (tapping a listen link): repaint after the tap has been handled
    else if (topic === 'timeline') {
      clearTimeout(later);
      later = setTimeout(paint, 0);
    }
  });
  const onPosts = () => paint();
  window.addEventListener('klang:posts', onPosts);
  paint();
  return {
    title: 'Activity',
    header: false,
    body,
    cleanup() {
      unsub();
      clearTimeout(later);
      window.removeEventListener('klang:posts', onPosts);
    },
  };
}

// ---------- Saved / Going ----------
function icsEntry(c) {
  return {
    concert: c,
    venueName: venueName(c),
    cityName: cityLabel(c),
    programLines: repo.programItems(c).map((p) =>
      [p.composerName, [p.title, p.catalog].filter(Boolean).join(', ')].filter(Boolean).join(' — ')).filter(Boolean),
    creditLines: (c.credits || []).map((cr) => (cr.role ? `${cr.role}: ${cr.name}` : cr.name)).filter(Boolean),
  };
}

function exportCalendar(kind) {
  const list = markedConcerts(kind).list.filter((c) => !ended(c)).sort(byStart);
  if (!list.length) {
    toast(kind === 'going' ? 'Mark upcoming concerts as Going to export them' : 'Save upcoming concerts to export them');
    return;
  }
  const reminderDays = (store.pref('reminderDays') || []).map(Number).filter((d) => d > 0);
  download(`klang-${kind}-${todayKey()}.ics`, buildICS(list.map(icsEntry), { reminderDays }), 'text/calendar');
  toast(`${plural(list.length, 'concert')} exported${reminderDays.length ? ' with reminders' : ''}`);
}

function pastItem(c) {
  const attended = store.isMarked(c.id, 'attended');
  return h('div', { class: 'act-past' },
    concertCard(c, { showDate: true }),
    h('div', { class: 'act-followup' },
      h('span', {}, attended ? 'You were there' : 'Were you there?'),
      h('button', {
        class: ['btn', 'small', attended && 'on'],
        type: 'button',
        'aria-pressed': attended ? 'true' : 'false',
        onclick: () => {
          const on = store.toggleMark(c.id, 'attended');
          toast(on ? 'Marked as attended — rate it on the concert page' : 'Removed from Attended');
        },
      }, icon('check', 14), 'Attended')));
}

function marksBody(kind) {
  const { list, missing } = markedConcerts(kind);
  if (!list.length) {
    return [
      kind === 'saved'
        ? emptyState('heart', 'No saved concerts', 'Browse the calendar and save concerts.')
        : emptyState('ticket', 'No concerts marked Going', 'Browse the calendar and save concerts.'),
      missingNote(missing),
    ];
  }
  const upcoming = list.filter((c) => !ended(c)).sort(byStart);
  const past = list.filter(ended).sort(byStartDesc);
  return [
    h('p', { class: 'result-line' },
      h('span', {}, plural(upcoming.length, 'upcoming concert')),
      h('span', {}, past.length ? `${past.length.toLocaleString('en-US')} past` : '')),
    upcoming.length
      ? h('div', { class: 'concert-list flat' }, upcoming.map((c) => concertCard(c, { showDate: true })))
      : h('p', { class: 'act-note' }, 'Nothing coming up. ', h('a', { href: '#/concerts' }, 'Browse the calendar')),
    past.length ? [h('div', { class: 'caps-label act-label' }, 'Past'), h('div', { class: 'concert-list flat' }, past.map(pastItem))] : null,
    missingNote(missing),
  ];
}

// ---------- Attended: your concert diary with stars and notes ----------
function attendedCard(c) {
  const m = store.markOf(c.id);
  const day = dayOf(c);
  // concert.js stores a work id, or "item-<index>" for programme lines without a work page (imports)
  const favItem = /^item-(\d+)$/.exec(m.favoriteWorkId || '');
  const fromItem = favItem ? repo.programItems(c)[Number(favItem[1])] : null;
  const fav = m.favoriteWorkId
    ? (repo.work(m.favoriteWorkId) || (fromItem && fromItem.title ? { title: fromItem.title, composerShort: fromItem.composerShort } : null))
    : null;
  const favComposer = fav?.composerId ? repo.composer(fav.composerId) : null;
  const favWho = favComposer?.short || fav?.composerShort || '';
  const encores = Array.isArray(m.encores) ? m.encores.filter(Boolean).join('; ') : String(m.encores || '').trim();
  const note = String(m.note || '').trim();
  const hasReview = !!(m.rating || fav || encores || note);
  return h('article', { class: 'attended-card' },
    h('a', { class: 'attended-head', href: href.concert(c.id) },
      h('div', { class: 'date-block' },
        h('div', { class: 'd' }, dayNum(day)),
        h('div', { class: 'm' }, monthShort(day)),
        h('div', { class: 'y' }, yearOf(day))),
      h('div', { class: 'main' },
        h('div', { class: 't' }, c.title),
        h('div', { class: 's' }, [venueName(c), cityLabel(c)].filter(Boolean).join(' · '))),
      icon('chevron', 16, 'faint')),
    hasReview ? h('div', { class: 'attended-review' },
      m.rating ? ratingStars(m.rating) : null,
      fav ? h('div', { class: 'attended-line' }, icon('heart', 14),
        h('span', {}, h('b', {}, 'Favourite '), favWho ? `${favWho} — ${fav.title}` : fav.title)) : null,
      encores ? h('div', { class: 'attended-line' }, icon('music', 14), h('span', {}, h('b', {}, 'Encores '), encores)) : null,
      note ? h('p', { class: 'attended-note' }, note.length > 240 ? `${note.slice(0, 240).trimEnd()}…` : note) : null) : null,
    h('a', { class: 'attended-edit', href: href.concert(c.id) },
      icon(hasReview ? 'notes' : 'star', 14), hasReview ? 'Edit review' : 'Rate it · pick your favourite piece'));
}

function stat(n, label) {
  return h('div', { class: 'stat' }, h('b', {}, n.toLocaleString('en-US')), h('span', {}, label));
}

function attendedBody() {
  const { list, missing } = markedConcerts('attended');
  if (!list.length) {
    return [emptyState('flag', 'No attended concerts', 'Browse the calendar and save concerts.'), missingNote(missing)];
  }
  const done = [...list].sort(byStartDesc);
  const cities = new Set(done.map((c) => c.cityId).filter(Boolean));
  const composers = new Set();
  for (const c of done) {
    for (const p of repo.programItems(c)) {
      const key = p.composer?.id || normalize(p.composerName);
      if (key) composers.add(key);
    }
  }
  const years = new Set(done.map((c) => yearOf(dayOf(c))));
  const items = [];
  let lastYear = null;
  for (const c of done) {
    const y = yearOf(dayOf(c));
    if (years.size > 1 && y !== lastYear) {
      const n = done.filter((x) => yearOf(dayOf(x)) === y).length;
      items.push(h('div', { class: 'mine-year' }, h('span', {}, y), h('span', { class: 'n' }, plural(n, 'concert'))));
      lastYear = y;
    }
    items.push(attendedCard(c));
  }
  return [
    h('div', { class: 'stat-row act-stats' },
      stat(done.length, done.length === 1 ? 'concert' : 'concerts'),
      stat(cities.size, cities.size === 1 ? 'city' : 'cities'),
      stat(composers.size, composers.size === 1 ? 'composer heard' : 'composers heard')),
    h('div', { class: 'act-attended' }, items),
    missingNote(missing),
  ];
}

function renderMarks(kind) {
  const body = h('div', { class: 'act-sub' });
  const paint = () => clear(body).append(...[kind === 'attended' ? attendedBody() : marksBody(kind)].flat(2).filter(Boolean));
  const unsub = store.subscribe((topic) => {
    if (topic === 'marks') paint();
  });
  paint();
  return {
    title: MARK_TITLES[kind],
    back: true,
    actions: kind === 'attended' ? [] : [
      h('button', {
        class: 'icon-btn',
        type: 'button',
        'aria-label': `Add upcoming ${kind === 'going' ? 'Going' : 'saved'} concerts to your calendar`,
        title: 'Add to calendar (.ics)',
        onclick: () => exportCalendar(kind),
      }, icon('calendar', 18)),
    ],
    body,
    cleanup() {
      unsub();
    },
  };
}

// ---------- favourites lists ----------
// star = followed venue / city (☆ like Sheng's venue star); heart = favourite composer / artist / work
function favRow(kind, id, info, star = false) {
  const row = h('div', { class: 'row-item act-fav-row' });
  const offLabel = star ? `Unfollow ${info.name}` : `Remove ${info.name} from favourites`;
  const onLabel = star ? `Follow ${info.name} again` : `Add ${info.name} back to favourites`;
  const btn = h('button', { class: ['act-fav', 'on', star && 'star'], type: 'button', 'aria-pressed': 'true', 'aria-label': offLabel }, icon(star ? 'star' : 'heart', 19));
  btn.addEventListener('click', () => {
    const on = store.toggleFollow(kind, id);
    btn.classList.toggle('on', on);
    row.classList.toggle('dim', !on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? offLabel : onLabel);
    if (star) toast(on ? `Following ${info.name} again` : `Unfollowed ${info.name} — tap ☆ to undo`);
    else toast(on ? `${info.name} is back in your favourites` : `Removed ${info.name} — tap ♥ to undo`);
  });
  row.append(
    info.lead(),
    h(info.to ? 'a' : 'div', { class: 'main', href: info.to },
      h('div', { class: 't' }, info.name),
      h('div', { class: 's' }, info.sub())),
    btn);
  return row;
}

function renderFavs(def) {
  const ids = store.followed(def.kind);
  const many = def.many || `${def.one}s`;
  let body;
  if (!ids.length) {
    body = h('div', { class: 'act-sub' },
      emptyState('heart', `No favourite ${many}`, `Tap ♥ on a ${def.page}’s page to add it here.`));
  } else {
    const cityCounts = def.kind === 'city' ? repo.cityCounts() : null;
    const rows = ids
      .map((id) => ({ id, info: favInfo(def.kind, id, cityCounts) }))
      .sort((a, b) => a.info.name.localeCompare(b.info.name))
      .map(({ id, info }) => favRow(def.kind, id, info, !!def.follow));
    body = h('div', { class: 'act-sub' },
      h('p', { class: 'result-line' }, h('span', {}, plural(ids.length, def.one, many)), h('span', {}, 'Only on this device')),
      h('div', { class: 'act-favs' }, rows));
  }
  // No live re-render here: an unfavourited row stays (dimmed) so one more tap undoes it.
  return { title: def.label, back: true, body };
}

// ---------- Following: venues and cities you follow (Sheng: search field + list) ----------
function renderFollowing() {
  const cityCounts = repo.cityCounts();
  // Snapshot: an unfollowed row stays (dimmed) so one more tap undoes it.
  const entries = FOLLOW_KINDS.flatMap((def) => store.followed(def.kind)
    .map((id) => ({ def, id, info: favInfo(def.kind, id, def.kind === 'city' ? cityCounts : null) })));
  const listEl = h('div', { class: 'act-favs' });
  const input = h('input', {
    type: 'search', placeholder: 'Search', 'aria-label': 'Search the venues and cities you follow',
    autocomplete: 'off', enterkeyhint: 'search', spellcheck: 'false',
  });
  function paint() {
    const raw = input.value.trim();
    const q = normalize(raw);
    clear(listEl);
    if (!entries.length) {
      listEl.append(h('div', { class: 'act-follow-empty' },
        h('p', {}, 'You aren’t following anything yet'),
        h('small', {}, 'Tap ♡ on a venue or city page, or ☆ next to a venue on a concert, to follow it.')));
      return;
    }
    const hits = entries.filter((e) => !q || normalize(e.info.name).includes(q));
    if (!hits.length) {
      listEl.append(h('div', { class: 'act-follow-empty' }, h('p', {}, `Nothing matches “${raw}”`)));
      return;
    }
    for (const def of FOLLOW_KINDS) {
      const rows = hits.filter((e) => e.def === def).sort((a, b) => a.info.name.localeCompare(b.info.name));
      if (!rows.length) continue;
      listEl.append(h('div', { class: 'caps-label act-follow-label' }, def.label),
        ...rows.map((e) => favRow(def.kind, e.id, e.info, true)));
    }
  }
  input.addEventListener('input', paint);
  paint();
  return {
    title: 'Following',
    back: true,
    body: h('div', { class: 'act-sub act-following' },
      h('label', { class: 'search-box act-search' }, icon('search', 16, 'faint'), input),
      listEl),
  };
}

// ---------- view ----------
export function render({ list } = {}) {
  if (list === 'following') return renderFollowing();
  if (list && MARK_TITLES[list]) return renderMarks(list);
  const fav = FAVS.find((f) => f.list === list);
  if (fav) return renderFavs(fav);
  return renderRoot();
}
