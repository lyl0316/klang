// User state — personal only, stored on this device (localStorage):
// concert marks (saved / going / attended + private review), favourites ("follows"),
// library (albums, concert / article playlists and your own playlists of pieces), hidden concerts,
// personal activity timeline (incl. pieces opened in Apple Music), preferences (region, reminders,
// appearance, Play in, New Year mode …), assistant history, article ratings and read notifications.
// Browse filters are session-only.

import { storage } from './util.js';

const KEY = 'klang.v1';
const TIMELINE_MAX = 300;
const ASSISTANT_TTL_MS = 3 * 24 * 3600 * 1000; // like Sheng: conversations clear after 3 days

export const REMINDER_DEFAULTS = {
  openingSoon: true, // 7 days and 1 day before a saved concert
  openingSoonLimit: 'unlimited',
  castChanges: true, // performers or programme of a saved concert changed (imported feeds)
  reschedule: true, // time / venue changes and cancellations for saved concerts
  favoriteWorkOnStage: true, // a work you like gets a new performance
  favoriteWorkLimit: 'unlimited',
  newRecordingMatch: true, // a new recording of a work you like (Apple Music chart)
  newRecordingLimit: 'unlimited',
  dailyContent: true, // a work or a page of music history each morning
  eveningLive: true, // a major work being performed live tonight
  postEventReview: true, // invitation to review a concert you attended
};

const DEFAULTS = () => ({
  marks: {}, // concertId -> { saved, going, attended, rating, note, favoriteWorkId, encores, updatedAt }
  follows: { venue: [], city: [], composer: [], artist: [], work: [] },
  prefs: {
    showDemo: true,
    playIn: 'classical', // 'classical' (Apple Music Classical) or 'music' (Apple Music)
    reminderDays: [7, 1],
    homeCityId: null,
    regionCityIds: [], // "Your region": default Location filter (empty = all Switzerland)
    theme: 'system',
    podcastApp: 'apple',
    newYearMode: false,
    profileName: '',
    reminders: { ...REMINDER_DEFAULTS },
  },
  imports: [], // concerts imported from .ics / JSON feeds
  listenChoice: {}, // workId -> chosen Apple Music collectionId ("Versions")
  library: { albums: [], playlists: [] },
  hidden: [], // concert ids hidden from lists
  timeline: [], // { type, kind, id, label, at }
  notificationsRead: [],
  assistant: [], // conversations { id, at, messages: [{ role, text, data }] }
  articleRatings: {},
  dismissed: {}, // one-off banners / tips
});

let state = load();
const listeners = new Set();

function load() {
  const saved = storage.get(KEY, null);
  const base = DEFAULTS();
  if (!saved || typeof saved !== 'object') return base;
  const prefs = { ...base.prefs, ...(saved.prefs || {}) };
  prefs.reminders = { ...REMINDER_DEFAULTS, ...((saved.prefs && saved.prefs.reminders) || {}) };
  return {
    ...base,
    ...saved,
    follows: { ...base.follows, ...(saved.follows || {}) },
    prefs,
    library: { ...base.library, ...(saved.library || {}) },
  };
}

function persist() {
  storage.set(KEY, state);
}

function emit(topic) {
  for (const fn of listeners) fn(topic);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ----- personal activity timeline -----
// type: saved | going | attended | review | favorite | library | playlist | hidden | listen
function logActivity(entry) {
  state.timeline.unshift({ ...entry, at: new Date().toISOString() });
  if (state.timeline.length > TIMELINE_MAX) state.timeline.length = TIMELINE_MAX;
}

export function timeline() {
  return [...state.timeline];
}

// ----- marks: saved / going / attended -----
export const MARK_KINDS = ['saved', 'going', 'attended'];

export function markOf(concertId) {
  return state.marks[concertId] || {};
}

export function isMarked(concertId, kind) {
  return !!state.marks[concertId]?.[kind];
}

export function toggleMark(concertId, kind) {
  const m = { ...(state.marks[concertId] || {}) };
  m[kind] = !m[kind];
  m.updatedAt = new Date().toISOString();
  setMarkRecord(concertId, m);
  if (m[kind]) logActivity({ type: kind, kind: 'concert', id: concertId });
  persist();
  emit('marks');
  return m[kind];
}

export function setReview(concertId, patch) {
  const m = { ...(state.marks[concertId] || {}), ...patch, updatedAt: new Date().toISOString() };
  setMarkRecord(concertId, m);
  logActivity({ type: 'review', kind: 'concert', id: concertId });
  persist();
  emit('marks');
}

function setMarkRecord(concertId, m) {
  const meaningful = MARK_KINDS.some((k) => m[k]) || m.rating || m.note || m.favoriteWorkId || m.encores;
  if (meaningful) state.marks[concertId] = m;
  else delete state.marks[concertId];
  persist();
}

export function markedIds(kind) {
  return Object.entries(state.marks).filter(([, m]) => m[kind]).map(([id]) => id);
}

// ----- favourites ("follows"): venue / city / composer / artist / work -----
export function isFollowing(kind, id) {
  return state.follows[kind]?.includes(id) || false;
}

export function toggleFollow(kind, id) {
  const list = state.follows[kind] || (state.follows[kind] = []);
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else {
    list.push(id);
    logActivity({ type: 'favorite', kind, id });
  }
  persist();
  emit('follows');
  return i < 0;
}

export function followed(kind) {
  return [...(state.follows[kind] || [])];
}

export function followCount() {
  return Object.values(state.follows).reduce((s, l) => s + l.length, 0);
}

// ----- library: albums (Apple Music recordings) + concert playlists -----
// album: { id (collectionId), title, artist, artwork, url, year, workId? }
// playlist: { id, name, concertId?, items: [{ workId, collectionId? , title, composer }] }
export function libraryAlbums() {
  return [...state.library.albums];
}

export function libraryPlaylists() {
  return [...state.library.playlists];
}

export function hasAlbum(id) {
  return state.library.albums.some((a) => String(a.id) === String(id));
}

export function toggleAlbum(album) {
  const i = state.library.albums.findIndex((a) => String(a.id) === String(album.id));
  if (i >= 0) state.library.albums.splice(i, 1);
  else {
    state.library.albums.unshift({ ...album, addedAt: new Date().toISOString() });
    logActivity({ type: 'library', kind: 'album', id: String(album.id), label: album.title });
  }
  persist();
  emit('library');
  return i < 0;
}

export function hasPlaylist(id) {
  return state.library.playlists.some((p) => p.id === id);
}

export function togglePlaylist(playlist) {
  const i = state.library.playlists.findIndex((p) => p.id === playlist.id);
  if (i >= 0) state.library.playlists.splice(i, 1);
  else {
    state.library.playlists.unshift({ ...playlist, addedAt: new Date().toISOString() });
    logActivity({ type: 'playlist', kind: 'playlist', id: playlist.id, label: playlist.name });
  }
  persist();
  emit('library');
  return i < 0;
}

// ----- your own playlists of pieces (kind 'user'); concert and article playlists use togglePlaylist -----
// A playlist item is a piece (see applemusic.js): { id, kind, title, composer, workId, artist, album,
// collectionId, trackId, artwork, year }.
export function userPlaylists() {
  return state.library.playlists.filter((p) => p.kind === 'user');
}

export function playlist(id) {
  return state.library.playlists.find((p) => p.id === id) || null;
}

export function createPlaylist(name, firstItem = null) {
  const clean = String(name || '').trim().slice(0, 80) || 'New playlist';
  const now = new Date().toISOString();
  const pl = { id: `pl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: clean, kind: 'user', items: firstItem ? [{ ...firstItem, addedAt: now }] : [], addedAt: now, updatedAt: now };
  state.library.playlists.unshift(pl);
  logActivity({ type: 'playlist', kind: 'playlist', id: pl.id, label: pl.name });
  persist();
  emit('library');
  return pl;
}

export function isInPlaylist(playlistId, itemId) {
  return !!playlist(playlistId)?.items?.some((it) => it.id === itemId);
}

// Adds the item, or removes it if it's already there. Returns true when the item is now in the playlist.
export function togglePlaylistItem(playlistId, item) {
  const pl = playlist(playlistId);
  if (!pl) return false;
  pl.items = pl.items || [];
  const i = pl.items.findIndex((it) => it.id === item.id);
  if (i >= 0) pl.items.splice(i, 1);
  else pl.items.push({ ...item, addedAt: new Date().toISOString() });
  pl.updatedAt = new Date().toISOString();
  persist();
  emit('library');
  return i < 0;
}

export function moveInPlaylist(playlistId, itemId, delta) {
  const pl = playlist(playlistId);
  if (!pl) return;
  const i = pl.items.findIndex((it) => it.id === itemId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= pl.items.length) return;
  [pl.items[i], pl.items[j]] = [pl.items[j], pl.items[i]];
  persist();
  emit('library');
}

export function renamePlaylist(id, name) {
  const pl = playlist(id);
  const clean = String(name || '').trim().slice(0, 80);
  if (!pl || !clean) return;
  pl.name = clean;
  pl.updatedAt = new Date().toISOString();
  persist();
  emit('library');
}

export function deletePlaylist(id) {
  const i = state.library.playlists.findIndex((p) => p.id === id);
  if (i < 0) return;
  state.library.playlists.splice(i, 1);
  persist();
  emit('library');
}

// A piece sent to Apple Music (applemusic.js) — shown as "Listened to …" on the timeline.
export function logListen(piece, appName = 'Apple Music') {
  if (!piece) return;
  const last = state.timeline[0];
  if (last && last.type === 'listen' && last.id === piece.id && Date.now() - Date.parse(last.at) < 10 * 60 * 1000) return;
  logActivity({ type: 'listen', kind: piece.kind || 'piece', id: piece.id, label: piece.title, composer: piece.composer || null, artist: piece.artist || null, artwork: piece.artwork || null, collectionId: piece.collectionId || null, trackId: piece.trackId || null, workId: piece.workId || null, album: piece.album || null, year: piece.year || null, app: appName });
  persist();
  emit('timeline');
}

// ----- hidden concerts -----
export function isHidden(concertId) {
  return state.hidden.includes(concertId);
}

export function toggleHidden(concertId) {
  const i = state.hidden.indexOf(concertId);
  if (i >= 0) state.hidden.splice(i, 1);
  else state.hidden.push(concertId);
  persist();
  emit('hidden');
  return i < 0;
}

export function hiddenIds() {
  return [...state.hidden];
}

// ----- preferences -----
export function pref(key) {
  return state.prefs[key];
}

export function setPref(key, value) {
  state.prefs[key] = value;
  persist();
  emit('prefs');
}

export function reminderPref(key) {
  return state.prefs.reminders[key];
}

export function setReminderPref(key, value) {
  state.prefs.reminders = { ...state.prefs.reminders, [key]: value };
  persist();
  emit('reminders');
}

// ----- imported concerts -----
export function getImports() {
  return state.imports;
}

export function setImports(list) {
  state.imports = list;
  persist();
  emit('data');
}

// ----- chosen recording per work -----
export function listenChoice(workId) {
  return state.listenChoice[workId];
}

export function setListenChoice(workId, collectionId) {
  state.listenChoice[workId] = collectionId;
  persist();
  emit('listen');
}

// ----- notifications (computed in-app; only the read state is stored) -----
export function isNotificationRead(id) {
  return state.notificationsRead.includes(id);
}

export function markNotificationsRead(ids) {
  const set = new Set(state.notificationsRead);
  for (const id of ids) set.add(id);
  state.notificationsRead = [...set].slice(-500);
  persist();
  emit('notifications');
}

// ----- assistant conversations (kept 3 days, like Sheng) -----
export function assistantConversations() {
  const now = Date.now();
  const kept = state.assistant.filter((c) => now - new Date(c.at).getTime() < ASSISTANT_TTL_MS);
  if (kept.length !== state.assistant.length) {
    state.assistant = kept;
    persist();
  }
  return [...kept];
}

export function saveAssistantConversation(conv) {
  const i = state.assistant.findIndex((c) => c.id === conv.id);
  if (i >= 0) state.assistant[i] = conv;
  else state.assistant.unshift(conv);
  state.assistant = state.assistant.slice(0, 50);
  persist();
  emit('assistant');
}

export function clearAssistantConversations() {
  state.assistant = [];
  persist();
  emit('assistant');
}

// ----- article ratings & dismissed tips -----
export function articleRating(id) {
  return state.articleRatings[id] || 0;
}

export function setArticleRating(id, n) {
  state.articleRatings[id] = n;
  persist();
  emit('articles');
}

export function isDismissed(key) {
  return !!state.dismissed[key];
}

export function dismiss(key) {
  state.dismissed[key] = true;
  persist();
  emit('dismissed');
}

// ----- backup / restore -----
// Listens posted from the old in-app player (activity.js still shows them) travel with the backup.
const POSTS_KEY = 'klang.activity.posts.v1';
const postsChanged = () => { try { window.dispatchEvent(new CustomEvent('klang:posts')); } catch { /* no window */ } };

export function exportUserData() {
  const posts = storage.get(POSTS_KEY, []);
  return JSON.stringify({ app: 'klang', version: 2, exportedAt: new Date().toISOString(), ...state, posts: Array.isArray(posts) ? posts : [] }, null, 2);
}

export function importUserData(json) {
  const data = JSON.parse(json);
  if (data.app !== 'klang') throw new Error('Not a Klang backup file');
  const base = DEFAULTS();
  state = {
    ...base,
    marks: data.marks || {},
    follows: { ...base.follows, ...(data.follows || {}) },
    prefs: { ...base.prefs, ...(data.prefs || {}), reminders: { ...REMINDER_DEFAULTS, ...((data.prefs && data.prefs.reminders) || {}) } },
    imports: data.imports || [],
    listenChoice: data.listenChoice || {},
    library: { ...base.library, ...(data.library || {}) },
    hidden: data.hidden || [],
    timeline: data.timeline || [],
    articleRatings: data.articleRatings || {},
  };
  persist();
  if (Array.isArray(data.posts)) { storage.set(POSTS_KEY, data.posts); postsChanged(); }
  emit('data');
}

export function resetAll() {
  state = DEFAULTS();
  persist();
  storage.set(POSTS_KEY, []);
  postsChanged();
  emit('data');
}

// ----- session browse filters (Concerts tab) -----
// Like Sheng: "Featured only" is on by default; Location starts from "Your region".
export const filters = {
  day: null, // 'YYYY-MM-DD' jump target, or null for today
  cityIds: [...(state.prefs.regionCityIds || [])], // empty = all of Switzerland
  types: [], // empty = all types
  featuredOnly: true,
  following: false, // only concerts linked to favourite venues / cities / composers / performers / works
  lookBack: false, // true when browsing past concerts
};

export function setFilters(patch) {
  Object.assign(filters, patch);
  emit('filters');
}
