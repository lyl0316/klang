// Activity tab — modelled on Sheng's Activity tab (SPEC §3.8, screens activity-01…05), personal
// only: no other users, following people, messages, reactions or comments. Everything shown here
// lives on this device; the concerts are the real listings (repo.js).
//
//   #/activity          profile row (name from Me · Following N › · bell → #/notifications) ·
//                       My concerts (Attended / Saved / Going) · My Favorites (Composers / Artists /
//                       Works) · Timeline (your activity)
//   #/activity/<list>   attended | saved | going | composers | artists | works | venues | cities |
//                       following (venues and cities you follow with ☆, searchable — Sheng's Following)
//
// Marks on concerts that are no longer listed (old demo ids, a removed import, a listing taken down)
// are left out of the lists and the timeline, with a short note of how many.
// "Listened to …" entries are pieces sent to Apple Music Classical / Apple Music (applemusic.js); each
// offers ▶ Preview (30 seconds inside Klang) and "Apple Music Classical ↗" (the full piece).

import { h, icon, clear, toast, download, normalize, storage } from '../util.js';
import * as repo from '../repo.js';
import * as store from '../store.js';
import { buildICS } from '../ics.js';
import { href, concertCard, emptyState, avatar, initials, cityLabel } from '../ui/components.js';
import { todayKey, dayKeyOf, daysBetween, isPast, monthShort, dayNum, yearOf, timeOf } from '../time.js';
import { unreadCount as notificationsUnread } from './me.js';
import { makePiece } from '../applemusic.js';
import { previewButton, classicalButton } from '../ui/preview.js';
import { previewOf } from '../ui/player.js';
import {
  t, tn, fmtN, isZh, dayMonth, yearLabel, cityName, cantonName, composerName, composerShort, roleLabel,
} from '../i18n.js';

const MARK_PILLS = [
  { kind: 'attended', label: 'Attended', iconName: 'check' },
  { kind: 'saved', label: 'Saved', iconName: 'heart' },
  { kind: 'going', label: 'Going', iconName: 'ticket' },
];

// one / many: '{n} composer' / '{n} composers' (also the plural keys of the dictionary)
const FAVS = [
  { list: 'composers', kind: 'composer', label: 'Composers', one: '{n} composer', many: '{n} composers', empty: 'No favourite composers', hint: 'Tap ♥ on a composer’s page to add it here.' },
  { list: 'artists', kind: 'artist', label: 'Artists', one: '{n} artist', many: '{n} artists', empty: 'No favourite artists', hint: 'Tap ♥ on a performer’s page to add it here.' },
  { list: 'works', kind: 'work', label: 'Works', one: '{n} work', many: '{n} works', empty: 'No favourite works', hint: 'Tap ♥ on a work’s page to add it here.' },
  { list: 'venues', kind: 'venue', label: 'Venues', one: '{n} venue', many: '{n} venues', empty: 'No favourite venues', hint: 'Tap ♥ on a venue’s page to add it here.', follow: true },
  { list: 'cities', kind: 'city', label: 'Cities', one: '{n} city', many: '{n} cities', empty: 'No favourite cities', hint: 'Tap ♥ on a city’s page to add it here.', follow: true },
];
// Sheng's My Favorites row has exactly three pills; venues and cities (followed with ☆) live
// under "Following N ›" in the profile row instead.
const FAV_PILLS = FAVS.filter((f) => !f.follow);
const FOLLOW_KINDS = FAVS.filter((f) => f.follow);
const followingCount = () => FOLLOW_KINDS.reduce((n, f) => n + store.followed(f.kind).length, 0);

const MARK_TITLES = { attended: 'Attended', saved: 'Saved', going: 'Going' };
// Sheng's pills and list titles: 去过 · 收藏 · 想去 (the shell's "Saved" is the 已收藏 state)
const markTitle = (kind) => (kind === 'saved' && isZh() ? t('Save') : t(MARK_TITLES[kind]));
const TIMELINE_PAGE = 30;

// ---------- small helpers ----------
const ended = (c) => isPast(c.start, c.durationMin || 120);
const byStart = (a, b) => a.start.localeCompare(b.start);
const byStartDesc = (a, b) => b.start.localeCompare(a.start);
const byName = (a, b) => String(a).localeCompare(String(b), isZh() ? 'zh-Hans-CN' : 'en');
const venueName = (c) => repo.venue(c.venueId)?.name || c.venueName || '';
const cityOf = (c) => (repo.city(c.cityId) ? cityName(repo.city(c.cityId)) : cityLabel(c));
const leadIcon = (name) => h('span', { class: 'lead-icon' }, icon(name, 18));
const upLabel = (n) => (n ? t('{n} upcoming', { n: fmtN(n) }) : t('Nothing upcoming'));
const dayOf = (c) => c.day || dayKeyOf(c.start);

// A translated sentence with elements in it: rich('Saved {title} at {venue}', { title: h('b', …) }).
// In Chinese the template's spaces around a name only stay next to Latin text ("关注了 Tonhalle",
// "关注了苏黎世").
const HAN = /[\u3400-\u9fff]/;
const textOf = (v) => (v instanceof Node ? v.textContent : String(v ?? ''));
function rich(text, vars) {
  const parts = t(text).split(/(\{\w+\})/).filter(Boolean).map((part) => {
    const m = /^\{(\w+)\}$/.exec(part);
    return m && vars[m[1]] != null ? vars[m[1]] : part;
  });
  if (!isZh()) return parts;
  return parts.map((part, i) => {
    if (typeof part !== 'string') return part;
    let out = part;
    const prev = textOf(parts[i - 1]);
    const next = textOf(parts[i + 1]);
    if (i > 0 && HAN.test(prev.slice(-1)) && HAN.test(out.trimStart()[0] || '')) out = out.trimStart();
    if (i < parts.length - 1 && HAN.test(next[0] || '') && HAN.test(out.trimEnd().slice(-1))) out = out.trimEnd();
    return out;
  });
}

// "Nov 3" ("Nov 3, 2027") / "11月3日" ("2027年11月3日")
function dateLabel(k) {
  const other = yearOf(k) !== yearOf(todayKey());
  if (isZh()) return `${other ? yearLabel(yearOf(k)) : ''}${dayMonth(k)}`;
  return `${dayMonth(k)}${other ? `, ${yearOf(k)}` : ''}`;
}

// "Nov 3 · 19:30"
function concertWhen(c) {
  return `${dateLabel(dayOf(c))} · ${timeOf(c.start)}`;
}

// "Just now" / "12 min ago" / "3 h ago" / "Yesterday" / "4 days ago" / "Oct 12"
function ago(iso) {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '';
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return t('Just now');
  if (min < 60) return t('{n} min ago', { n: min });
  if (min < 24 * 60) return t('{n} h ago', { n: Math.floor(min / 60) });
  const k = dayKeyOf(iso);
  const d = daysBetween(k, todayKey());
  if (d <= 1) return t('Yesterday');
  if (d < 7) return tn(d, '{n} day ago', '{n} days ago');
  return dateLabel(k);
}

function ratingStars(rating) {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return h('div', { class: 'rating-stars', role: 'img', 'aria-label': t('Rated {n} out of 5', { n }) },
    Array.from({ length: 5 }, (_, i) => icon('star', 14, i < n ? 'on' : '')));
}

function prettyId(id) {
  return String(id).replace(/^(artist|venue|town)-(import-)?/, '').replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

// Marked concerts that are still listed; `missing` counts the others (never shown as concerts).
function markedConcerts(kind) {
  const ids = store.markedIds(kind);
  const list = ids.map((id) => repo.concert(id)).filter(Boolean);
  return { list, missing: ids.length - list.length };
}

function missingNote(missing) {
  if (!missing) return null;
  return h('p', { class: 'act-note' },
    tn(missing, '{n} marked concert is no longer in the listings, so it isn’t shown.', '{n} marked concerts are no longer in the listings, so they aren’t shown.'));
}

// ---------- favourites: name, link, lead visual and a lazily computed subtitle ----------
function favInfo(kind, id, cityCounts = null) {
  const up = (opts) => upLabel(repo.upcoming(opts).length);
  if (kind === 'composer') {
    const c = repo.composer(id);
    if (c) {
      return {
        name: composerName(c), short: composerShort(c), to: href.composer(id), lead: () => avatar(c.name, true, id),
        sub: () => [c.died ? `${c.born}–${c.died}` : t('b. {year}', { year: c.born }), up({ composerId: id })].join(' · '),
      };
    }
  } else if (kind === 'artist') {
    const a = repo.artist(id);
    if (a) {
      return {
        name: a.name, short: a.name, to: href.artist(id), lead: () => avatar(a.name, true),
        sub: () => [a.role ? roleLabel(a.role) : null, up({ artistId: id })].filter(Boolean).join(' · '),
      };
    }
  } else if (kind === 'work') {
    const w = repo.work(id);
    if (w) {
      const comp = repo.composer(w.composerId);
      return {
        name: w.title, short: w.title, composer: comp ? composerShort(comp) : '', to: href.work(id), lead: () => leadIcon('music'),
        sub: () => [comp ? composerShort(comp) : null, w.catalog, up({ workId: id })].filter(Boolean).join(' · '),
      };
    }
  } else if (kind === 'venue') {
    const v = repo.venue(id);
    if (v) {
      return {
        name: v.name, short: v.name, to: href.venue(id), lead: () => leadIcon('map'),
        sub: () => [repo.city(v.cityId) ? cityName(repo.city(v.cityId)) : null, up({ venueId: id })].filter(Boolean).join(' · '),
      };
    }
  } else if (kind === 'city') {
    const c = repo.city(id);
    if (c) {
      return {
        name: cityName(c), short: cityName(c), to: href.city(id), lead: () => leadIcon('pin'),
        sub: () => [c.canton ? cantonName(c.canton, repo.cantonName(c.canton)) : null,
          upLabel(cityCounts ? cityCounts.get(id) || 0 : repo.upcoming({ cityIds: [id] }).length)].filter(Boolean).join(' · '),
      };
    }
  }
  const name = prettyId(id);
  return { name, short: name, to: null, lead: () => leadIcon('heart'), sub: () => t('Not in the current listings') };
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
    h('a', { class: 'act-avatar', href: '#/me', 'aria-label': t('Me and settings') },
      typeof photo === 'string' && photo.startsWith('data:image/')
        ? h('img', { src: photo, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' } })
        : name ? initials(name).toUpperCase().slice(0, 2) : icon('person', 26)),
    h('div', { class: 'act-who' },
      h('a', { class: 'act-name', href: '#/me' }, name || t('Me')),
      h('a', { class: 'act-edit', href: '#/activity/following', 'aria-label': t('Following {n}: venues and cities', { n: following }) },
        t('Following {n}', { n: fmtN(following) }), icon('chevron', 12))),
    h('a', {
      class: 'act-bell',
      href: '#/notifications',
      'aria-label': unread ? t('Notifications, {n} new', { n: unread }) : t('Notifications'),
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

// Pills count only concerts still in the listings.
function markPill({ kind, label, iconName }) {
  const n = markedConcerts(kind).list.length;
  return h('a', { class: 'act-pill', href: `#/activity/${kind}`, 'aria-label': `${markTitle(kind)}: ${n}` },
    h('span', { class: `act-ic ${kind}` }, kind === 'going' ? goingGlyph(17) : icon(iconName, kind === 'attended' ? 11 : 15)),
    h('span', { class: 'l' }, markTitle(kind)),
    n ? h('span', { class: 'n' }, fmtN(n)) : null);
}

function favPill(def) {
  const n = store.followed(def.kind).length;
  return h('a', { class: 'act-pill', href: `#/activity/${def.list}`, 'aria-label': `${t(def.label)}: ${n}` },
    h('span', { class: 'l' }, t(def.label)),
    n ? h('span', { class: 'n' }, fmtN(n)) : null);
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

const MARK_PHRASES = {
  saved: ['Saved {title}', 'Saved {title} at {venue}'],
  going: ['Going to {title}', 'Going to {title} at {venue}'],
  attended: ['Attended {title}', 'Attended {title} at {venue}'],
  review: ['Reviewed {title}', 'Reviewed {title} at {venue}'],
};
const FAV_PHRASES = {
  composer: 'Added {name} to your favourite composers',
  artist: 'Added {name} to your favourite artists',
  work: 'Liked {name}',
};

function describeEntry(e) {
  if (['saved', 'going', 'attended', 'review'].includes(e.type)) {
    const c = repo.concert(e.id);
    if (!c) return null; // no longer listed
    const venue = venueName(c);
    const m = e.type === 'review' ? store.markOf(e.id) : null;
    const note = m ? String(m.note || '').trim() : '';
    return {
      tone: e.type,
      iconName: { saved: 'heart', going: 'ticket', attended: 'check', review: 'star' }[e.type],
      to: href.concert(c.id),
      text: rich(MARK_PHRASES[e.type][venue ? 1 : 0], { title: h('b', {}, c.title), venue }),
      sub: [h('span', { class: 'when' }, concertWhen(c)), cityOf(c) || null],
      extra: m ? [m.rating ? ratingStars(m.rating) : null, note ? h('p', { class: 'tl-quote' }, note) : null] : null,
    };
  }
  if (e.type === 'favorite') {
    const def = FAVS.find((f) => f.kind === e.kind);
    const info = favInfo(e.kind, e.id);
    if (!def || !info.to) return null;
    const name = e.kind === 'work' && info.composer ? `${info.composer}${isZh() ? '：' : ': '}${info.name}` : info.name;
    return {
      tone: 'favorite',
      iconName: def.follow ? 'star' : 'heart',
      to: info.to,
      text: rich(def.follow ? 'Followed {name}' : FAV_PHRASES[e.kind], { name: h('b', {}, name) }),
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
      text: rich('Added the album {title} to your Library', { title: h('b', {}, a.title || e.label || t('Untitled')) }),
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
      text: rich(own ? 'Created the playlist {name}' : 'Added the playlist {name} to your Library', { name: h('b', {}, p.name || e.label || t('Playlist')) }),
      sub: [`${t('Playlist')} · ${own ? tn(n, '{n} piece', '{n} pieces') : tn(n, '{n} work', '{n} works')}`],
    };
  }
  if (e.type === 'listen') {
    // a whole work in one recording has the id "piece:<album>:<work id>" (applemusic.workPieceId)
    const workId = /^piece:[^:]+:([a-z][\w-]*)$/.exec(e.id)?.[1];
    const piece = makePiece({
      id: e.id, kind: e.kind === 'album' ? 'album' : 'piece', title: e.label || t('a recording'),
      workId: workId && repo.work(workId) ? workId : null,
      composer: e.composer || null, artist: e.artist || '', collectionId: e.collectionId || null,
      trackId: e.trackId || null, artwork: e.artwork || null,
    });
    return listenEntry(piece, e.app);
  }
  return null;
}

// A stored composer name in the interface language when it is a composer Klang knows.
function composerLabel(name) {
  const n = normalize(name);
  const c = repo.allComposers().find((x) => normalize(x.name) === n || normalize(x.short) === n);
  return c ? composerName(c) : name;
}

// "Listened to <piece> · <app>", with ▶ Preview and "Apple Music Classical ↗" (the full piece).
function listenEntry(piece, app = null) {
  return {
    tone: 'listen',
    iconName: 'headphones',
    piece,
    text: [...rich('Listened to {title}', { title: h('b', {}, piece.title) }), app ? ` · ${t(app)}` : null],
    sub: [piece.composer && piece.composer !== piece.title ? composerLabel(piece.composer) : null, piece.artist || null],
    thumb: piece.artwork || null,
  };
}

// Listens posted from the old in-app player (klang.activity.posts.v1, kept in backups) still show.
const POSTS_KEY = 'klang.activity.posts.v1';
const albumIdOf = (url) => /\/album\/(?:[^/?#]+\/)?(\d+)/.exec(String(url || ''))?.[1] || null;

function postedListens() {
  const v = storage.get(POSTS_KEY, []);
  return Array.isArray(v) ? v.filter((p) => p && p.trackId != null && p.at) : [];
}

function postedEntry(p) {
  const piece = makePiece({
    title: p.work || p.title || t('a recording'), composer: p.composer || null, artist: p.artist || '',
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
    let v = null;
    try { v = describeEntry(e); } catch (err) { console.warn('timeline entry skipped', e, err); }
    if (v) out.push({ ...v, at: e.at });
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function tlItem(v) {
  const sub = v.sub && v.sub.filter(Boolean).length
    ? h('div', { class: 'tl-sub' }, v.sub.filter(Boolean).map((s, i) => [i ? h('span', { class: 'sep' }, '·') : null, s]))
    : null;
  const thumb = v.thumb ? h('img', { class: 'tl-thumb', src: v.thumb, alt: '', loading: 'lazy' }) : null;
  // a listen: ▶ Preview plays 30 s here; "Apple Music Classical ↗" is a real link, so the tap
  // itself hands the piece to the app
  if (v.piece) {
    return h('div', { class: 'tl-item tl-listen' },
      h('span', { class: `tl-ic ${v.tone}` }, icon(v.iconName, 15)),
      h('div', { class: 'tl-main' },
        h('div', { class: 'tl-text' }, v.text),
        sub,
        h('div', { class: 'pv-row tl-pv' },
          previewButton({ resolve: () => previewOf(v.piece), label: t('Preview {title}', { title: v.piece.title }) }),
          classicalButton(v.piece)),
        h('div', { class: 'tl-ago' }, ago(v.at))),
      thumb);
  }
  const kids = [
    h('span', { class: `tl-ic ${v.tone}` }, icon(v.iconName, 15)),
    h('div', { class: 'tl-main' }, h('div', { class: 'tl-text' }, v.text), sub, v.extra, h('div', { class: 'tl-ago' }, ago(v.at))),
    thumb,
  ];
  const tag = v.to ? 'a' : 'button';
  return h(tag, { class: 'tl-item', href: v.to || null, type: tag === 'button' ? 'button' : null, onclick: v.onClick || null }, kids);
}

function timelineEmpty() {
  return h('div', { class: 'act-soft-empty' },
    h('h3', {}, t('Nothing here yet')),
    h('p', {}, t('Save concerts, like works, enjoy recordings — your musical story unfolds here.')));
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
        }, t('Show more · {n}', { n: fmtN(entries.length - shown) }))
        : null].filter(Boolean));
  }

  function paint() {
    clear(body).append(
      profileRow(),
      h('h2', { class: 'act-h' }, t('My concerts')),
      h('div', { class: 'act-pills' }, MARK_PILLS.map(markPill)),
      h('h2', { class: 'act-h' }, t('My Favorites')),
      h('div', { class: 'act-pills' }, FAV_PILLS.map(favPill)),
      h('h2', { class: 'act-h' }, t('Timeline'), h('small', {}, t('Your activity'))),
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
    title: t('Activity'),
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
    cityName: repo.city(c.cityId)?.name || '', // the town's own name, so Maps finds it whatever the interface language
    programLines: repo.programItems(c).map((p) =>
      [p.composerName, [p.title, p.catalog].filter(Boolean).join(', ')].filter(Boolean).join(' — ')).filter(Boolean),
    creditLines: (c.credits || []).map((cr) => (cr.role ? `${cr.role}: ${cr.name}` : cr.name)).filter(Boolean),
  };
}

function exportCalendar(kind) {
  const list = markedConcerts(kind).list.filter((c) => !ended(c)).sort(byStart);
  if (!list.length) {
    toast(kind === 'going' ? t('Mark upcoming concerts as Going to export them') : t('Save upcoming concerts to export them'));
    return;
  }
  const reminderDays = (store.pref('reminderDays') || []).map(Number).filter((d) => d > 0);
  download(`klang-${kind}-${todayKey()}.ics`, buildICS(list.map(icsEntry), { reminderDays }), 'text/calendar');
  toast(`${tn(list.length, '{n} concert exported', '{n} concerts exported')}${reminderDays.length ? ` · ${t('with reminders')}` : ''}`);
}

function pastItem(c) {
  const attended = store.isMarked(c.id, 'attended');
  return h('div', { class: 'act-past' },
    concertCard(c, { showDate: true }),
    h('div', { class: 'act-followup' },
      h('span', {}, attended ? t('You were there') : t('Were you there?')),
      h('button', {
        class: ['btn', 'small', attended && 'on'],
        type: 'button',
        'aria-pressed': attended ? 'true' : 'false',
        onclick: () => {
          const on = store.toggleMark(c.id, 'attended');
          toast(on ? t('Marked as attended — rate it on the concert page') : t('Removed from Attended'));
        },
      }, icon('check', 14), t('Attended'))));
}

function marksBody(kind) {
  const { list, missing } = markedConcerts(kind);
  if (!list.length) {
    return [
      kind === 'saved'
        ? emptyState('heart', t('No saved concerts'), t('Browse the calendar and save concerts.'))
        : emptyState('ticket', t('No concerts marked Going'), t('Browse the calendar and save concerts.')),
      missingNote(missing),
    ];
  }
  const upcoming = list.filter((c) => !ended(c)).sort(byStart);
  const past = list.filter(ended).sort(byStartDesc);
  return [
    h('p', { class: 'result-line' },
      h('span', {}, tn(upcoming.length, '{n} upcoming concert', '{n} upcoming concerts')),
      h('span', {}, past.length ? t('{n} past', { n: fmtN(past.length) }) : '')),
    upcoming.length
      ? h('div', { class: 'concert-list flat' }, upcoming.map((c) => concertCard(c, { showDate: true })))
      : h('p', { class: 'act-note' }, t('Nothing coming up.'), ' ', h('a', { href: '#/concerts' }, t('Browse the calendar'))),
    past.length ? [h('div', { class: 'caps-label act-label' }, t('Past')), h('div', { class: 'concert-list flat' }, past.map(pastItem))] : null,
    missingNote(missing),
  ];
}

// ---------- Attended: your concert diary with stars and notes ----------
function attendedCard(c) {
  const m = store.markOf(c.id);
  const day = dayOf(c);
  // concert.js stores a work id, or "item-<index>" for programme lines without a work page
  const favItem = /^item-(\d+)$/.exec(m.favoriteWorkId || '');
  const fromItem = favItem ? repo.programItems(c)[Number(favItem[1])] : null;
  const fav = m.favoriteWorkId
    ? (repo.work(m.favoriteWorkId) || (fromItem && fromItem.title ? { title: fromItem.title, composerShort: fromItem.composer ? composerShort(fromItem.composer) : fromItem.composerShort } : null))
    : null;
  const favComposer = fav?.composerId ? repo.composer(fav.composerId) : null;
  const favWho = favComposer ? composerShort(favComposer) : fav?.composerShort || '';
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
        h('div', { class: 's' }, [venueName(c), cityOf(c)].filter(Boolean).join(' · '))),
      icon('chevron', 16, 'faint')),
    hasReview ? h('div', { class: 'attended-review' },
      m.rating ? ratingStars(m.rating) : null,
      fav ? h('div', { class: 'attended-line' }, icon('heart', 14),
        h('span', {}, h('b', {}, `${t('Favourite')} `), favWho ? `${favWho} — ${fav.title}` : fav.title)) : null,
      encores ? h('div', { class: 'attended-line' }, icon('music', 14), h('span', {}, h('b', {}, `${t('Encores')} `), encores)) : null,
      note ? h('p', { class: 'attended-note' }, note.length > 240 ? `${note.slice(0, 240).trimEnd()}…` : note) : null) : null,
    h('a', { class: 'attended-edit', href: href.concert(c.id) },
      icon(hasReview ? 'notes' : 'star', 14), hasReview ? t('Edit review') : t('Rate it · pick your favourite piece')));
}

function stat(n, label) {
  return h('div', { class: 'stat' }, h('b', {}, fmtN(n)), h('span', {}, label));
}

function attendedBody() {
  const { list, missing } = markedConcerts('attended');
  if (!list.length) {
    return [emptyState('flag', t('No attended concerts'), t('Browse the calendar and save concerts.')), missingNote(missing)];
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
      items.push(h('div', { class: 'mine-year' }, h('span', {}, yearLabel(y)), h('span', { class: 'n' }, tn(n, '{n} concert', '{n} concerts'))));
      lastYear = y;
    }
    items.push(attendedCard(c));
  }
  return [
    h('div', { class: 'stat-row act-stats' },
      stat(done.length, done.length === 1 ? t('concert') : t('concerts')),
      stat(cities.size, cities.size === 1 ? t('city') : t('cities')),
      stat(composers.size, composers.size === 1 ? t('composer heard') : t('composers heard'))),
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
    title: markTitle(kind),
    back: true,
    actions: kind === 'attended' ? [] : [
      h('button', {
        class: 'icon-btn',
        type: 'button',
        'aria-label': kind === 'going' ? t('Add upcoming Going concerts to your calendar') : t('Add upcoming saved concerts to your calendar'),
        title: t('Add to calendar (.ics)'),
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
  const vars = { name: info.name };
  const offLabel = star ? t('Unfollow {name}', vars) : t('Remove {name} from favourites', vars);
  const onLabel = star ? t('Follow {name} again', vars) : t('Add {name} back to favourites', vars);
  const btn = h('button', { class: ['act-fav', 'on', star && 'star'], type: 'button', 'aria-pressed': 'true', 'aria-label': offLabel }, icon(star ? 'star' : 'heart', 19));
  btn.addEventListener('click', () => {
    const on = store.toggleFollow(kind, id);
    btn.classList.toggle('on', on);
    row.classList.toggle('dim', !on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? offLabel : onLabel);
    if (star) toast(on ? t('Following {name} again', vars) : t('Unfollowed {name} — tap ☆ to undo', vars));
    else toast(on ? t('{name} is back in your favourites', vars) : t('Removed {name} — tap ♥ to undo', vars));
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
  let body;
  if (!ids.length) {
    body = h('div', { class: 'act-sub' }, emptyState('heart', t(def.empty), t(def.hint)));
  } else {
    const cityCounts = def.kind === 'city' ? repo.cityCounts() : null;
    const rows = ids
      .map((id) => ({ id, info: favInfo(def.kind, id, cityCounts) }))
      .sort((a, b) => byName(a.info.name, b.info.name))
      .map(({ id, info }) => favRow(def.kind, id, info, !!def.follow));
    body = h('div', { class: 'act-sub' },
      h('p', { class: 'result-line' }, h('span', {}, tn(ids.length, def.one, def.many)), h('span', {}, t('Only on this device'))),
      h('div', { class: 'act-favs' }, rows));
  }
  // No live re-render here: an unfavourited row stays (dimmed) so one more tap undoes it.
  return { title: t(def.label), back: true, body };
}

// ---------- Following: venues and cities you follow (Sheng: search field + list) ----------
function renderFollowing() {
  const cityCounts = repo.cityCounts();
  // Snapshot: an unfollowed row stays (dimmed) so one more tap undoes it.
  const entries = FOLLOW_KINDS.flatMap((def) => store.followed(def.kind)
    .map((id) => ({ def, id, info: favInfo(def.kind, id, def.kind === 'city' ? cityCounts : null) })));
  const listEl = h('div', { class: 'act-favs' });
  const input = h('input', {
    type: 'search', placeholder: t('Search'), 'aria-label': t('Search the venues and cities you follow'),
    autocomplete: 'off', enterkeyhint: 'search', spellcheck: 'false',
  });
  function paint() {
    const raw = input.value.trim();
    const q = normalize(raw);
    clear(listEl);
    if (!entries.length) {
      listEl.append(h('div', { class: 'act-follow-empty' },
        h('p', {}, t('You aren’t following anything yet')),
        h('small', {}, t('Tap ♡ on a venue or city page, or ☆ next to a venue on a concert, to follow it.'))));
      return;
    }
    const hits = entries.filter((e) => !q || normalize(e.info.name).includes(q) || normalize(prettyId(e.id)).includes(q));
    if (!hits.length) {
      listEl.append(h('div', { class: 'act-follow-empty' }, h('p', {}, t('Nothing matches “{q}”', { q: raw }))));
      return;
    }
    for (const def of FOLLOW_KINDS) {
      const rows = hits.filter((e) => e.def === def).sort((a, b) => byName(a.info.name, b.info.name));
      if (!rows.length) continue;
      listEl.append(h('div', { class: 'caps-label act-follow-label' }, t(def.label)),
        ...rows.map((e) => favRow(def.kind, e.id, e.info, true)));
    }
  }
  input.addEventListener('input', paint);
  paint();
  return {
    title: t('Following'),
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
