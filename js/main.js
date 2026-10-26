// App shell (mirrors Sheng): hash router, header, collapsing dock (tab bar + mini player), Now listening.
//
// View contract — every view module exports render functions (sync or async) returning:
//   { title: string,            // document title / centred header title
//     header?: false,           // hide the app header entirely (view draws its own top area)
//     largeTitle?: boolean,     // big serif title on the left (tab roots)
//     back?: boolean,           // show back button (pushed pages)
//     actions?: Node[],         // right-side header buttons
//     body: Node,               // page content
//     noPad?: boolean,          // full-bleed content
//     cleanup?: () => void }    // called when leaving the page
//
// Tabs (like Sheng): Discover · Concerts · Activity · Library · Search (Assistant).
// The dock shows the mini player above the full tab bar; when you scroll down it collapses
// into one pill: [current tab] [mini player] [search] — and expands again when you scroll up.
// Listening: the mini player shows a 30-second preview playing inside Klang (music.js preview), else
// "Now listening" — the piece last opened in Apple Music Classical / Apple Music (applemusic.js); the
// Now-listening view lives in ui/player.js.
//
// Listings: the real feed (feed.js) loads at start, again on pull to refresh and when the app comes
// back after 6 h; a change repaints the current page. Language: English or 简体中文 (i18n.js) — the
// shell and the current page are drawn again when the "lang" preference changes.

import { h, icon, clear, toast } from './util.js';
import * as store from './store.js';
import './repo.js'; // first, so the listings are rebuilt before the page repaints on 'feed' / 'data'
import * as feed from './feed.js';
import { t, lang, applyLang } from './i18n.js';
import { listening, onListening, listenLink, playAppName } from './applemusic.js';
import { preview, previewState } from './music.js';

const TABS = [
  { id: 'discover', label: 'Discover', icon: 'sparkle', path: '#/discover' },
  { id: 'concerts', label: 'Concerts', icon: 'calendar', path: '#/concerts' },
  { id: 'activity', label: 'Activity', icon: 'activity', path: '#/activity' },
  { id: 'library', label: 'Library', icon: 'library', path: '#/library' },
  { id: 'search', label: 'Search', icon: 'search', path: '#/search' },
];

const REDIRECTS = { home: 'discover', mine: 'activity', settings: 'me' };

const ROUTES = [
  { re: /^discover$/, tab: 'discover', load: () => import('./views/discover.js'), fn: 'render' },
  { re: /^concerts$/, tab: 'concerts', load: () => import('./views/concerts.js'), fn: 'render' },
  { re: /^activity(?:\/([a-z-]+))?$/, tab: 'activity', load: () => import('./views/activity.js'), fn: 'render', keys: ['list'] },
  { re: /^library(?:\/([a-z-]+))?$/, tab: 'library', load: () => import('./views/library.js'), fn: 'render', keys: ['section'] },
  { re: /^search$/, tab: 'search', load: () => import('./views/assistant.js'), fn: 'render' },
  { re: /^me$/, load: () => import('./views/me.js'), fn: 'render' },
  { re: /^me\/reminders$/, load: () => import('./views/me.js'), fn: 'renderReminders' },
  { re: /^me\/hidden$/, load: () => import('./views/me.js'), fn: 'renderHidden' },
  { re: /^me\/region$/, load: () => import('./views/me.js'), fn: 'renderRegion' },
  { re: /^me\/legal$/, load: () => import('./views/me.js'), fn: 'renderLegal' },
  { re: /^me\/data$/, load: () => import('./views/settings.js'), fn: 'render' },
  { re: /^notifications$/, load: () => import('./views/me.js'), fn: 'renderNotifications' },
  { re: /^map$/, load: () => import('./views/map.js'), fn: 'render' },
  { re: /^editorials(?:\/([a-z0-9-]+))?$/, load: () => import('./views/editorial.js'), fn: 'renderList', keys: ['composerId'] },
  { re: /^article\/(.+)$/, load: () => import('./views/editorial.js'), fn: 'renderArticle', keys: ['id'] },
  { re: /^concert\/(.+)$/, load: () => import('./views/concert.js'), fn: 'render', keys: ['id'] },
  { re: /^composer\/(.+)$/, load: () => import('./views/entity.js'), fn: 'renderComposer', keys: ['id'] },
  { re: /^work\/(.+)$/, load: () => import('./views/entity.js'), fn: 'renderWork', keys: ['id'] },
  { re: /^artist\/(.+)$/, load: () => import('./views/entity.js'), fn: 'renderArtist', keys: ['id'] },
  { re: /^venue\/(.+)$/, load: () => import('./views/entity.js'), fn: 'renderVenue', keys: ['id'] },
  { re: /^city\/(.+)$/, load: () => import('./views/entity.js'), fn: 'renderCity', keys: ['id'] },
];

applyLang();
const app = document.getElementById('app');
const header = h('header', { class: 'app-header' });
const view = h('main', { id: 'view', tabindex: '-1' });
const tabbar = h('nav', { class: 'tabbar', 'aria-label': t('Main') });
// A group, not a button: its ↗ / ⏭ are real links (see the mini player below).
const mini = h('div', { class: 'mini-player', role: 'group', 'aria-label': t('Now listening') });
const dockTab = h('a', { class: 'dock-tab', 'aria-label': t('Current tab') });
const dockSearch = h('a', { class: 'dock-search', href: '#/search', 'aria-label': t('Search') }, icon('search', 20));
const dock = h('div', { class: 'dock' }, dockTab, mini, dockSearch, tabbar);
app.append(header, view);
document.body.append(dock);

let currentTab = 'discover';
let cleanup = null;
const stack = [];
const scrollPos = new Map();

for (const tab of TABS) {
  tabbar.append(h('a', { href: tab.path, dataset: { tab: tab.id }, 'aria-label': t(tab.label) }, icon(tab.icon, 22), h('span', {}, t(tab.label))));
}

// Texts of the shell itself, again after a language change.
function paintShellText() {
  tabbar.setAttribute('aria-label', t('Main'));
  mini.setAttribute('aria-label', t('Now listening'));
  dockSearch.setAttribute('aria-label', t('Search'));
  for (const a of tabbar.querySelectorAll('a')) {
    const tab = TABS.find((x) => x.id === a.dataset.tab);
    a.setAttribute('aria-label', t(tab.label));
    a.querySelector('span:not(.icon)').textContent = t(tab.label);
  }
  paintTabs();
}

function paintTabs() {
  for (const a of tabbar.querySelectorAll('a')) {
    const on = a.dataset.tab === currentTab;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  const tab = TABS.find((x) => x.id === currentTab) || TABS[0];
  dockTab.href = tab.path;
  dockTab.setAttribute('aria-label', t(tab.label));
  dockTab.replaceChildren(icon(tab.icon, 20));
}

// tapping the active tab (or the collapsed tab button) pops back to the tab root
tabbar.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (a && a.dataset.tab === currentTab && location.hash === a.getAttribute('href')) window.scrollTo({ top: 0, behavior: 'smooth' });
});
dockTab.addEventListener('click', () => setCollapsed(false));

export function goBack() {
  if (stack.length > 1) history.back();
  else location.hash = TABS.find((tab) => tab.id === currentTab)?.path || '#/discover';
}

function renderHeader(v) {
  clear(header);
  header.hidden = v.header === false;
  if (v.header === false) return;
  header.className = `app-header ${v.largeTitle ? '' : 'solid'}`;
  if (v.back) header.append(h('div', { class: 'side' }, h('button', { class: 'icon-btn', 'aria-label': t('Back'), onclick: goBack }, icon('back', 20))));
  else if (!v.largeTitle) header.append(h('div', { class: 'side' }));
  header.append(h('div', { class: `title ${v.largeTitle ? 'left' : ''}` }, v.title || ''));
  header.append(h('div', { class: 'side wide' }, v.actions || []));
}

let renderToken = 0;
async function route() {
  let hash = location.hash.replace(/^#\/?/, '') || 'discover';
  const head = hash.split('/')[0];
  if (REDIRECTS[head]) {
    location.replace(`#/${REDIRECTS[head]}${hash.slice(head.length)}`);
    return;
  }
  const prevHash = stack[stack.length - 1];
  if (prevHash !== undefined) scrollPos.set(prevHash, window.scrollY);
  const isBack = stack.length > 1 && stack[stack.length - 2] === hash;
  if (isBack) stack.pop();
  else if (prevHash !== hash) stack.push(hash);
  if (stack.length > 60) stack.splice(0, stack.length - 60);
  await renderHash(hash, isBack ? scrollPos.get(hash) || 0 : 0);
}

async function renderHash(hash, scrollY) {
  const r = ROUTES.find((x) => x.re.test(hash)) || ROUTES[0];
  const m = hash.match(r.re) || [];
  const params = {};
  (r.keys || []).forEach((k, i) => { params[k] = m[i + 1] ? decodeURIComponent(m[i + 1]) : undefined; });
  if (r.tab) currentTab = r.tab;
  paintTabs();

  const token = ++renderToken;
  cleanup?.();
  cleanup = null;
  let v;
  try {
    const mod = await r.load();
    v = await mod[r.fn](params);
  } catch (err) {
    console.error(err);
    v = { title: t('Something went wrong'), back: true, body: h('div', { class: 'empty' }, h('h3', {}, t('Could not open this page')), h('p', {}, String(err.message || err))) };
  }
  if (token !== renderToken) {
    v.cleanup?.();
    return;
  }
  renderHeader(v);
  view.classList.toggle('no-pad', !!v.noPad);
  view.classList.toggle('no-header', v.header === false);
  clear(view).append(v.body);
  cleanup = v.cleanup || null;
  document.title = v.title ? `${v.title} · Klang` : 'Klang';
  window.scrollTo(0, scrollY);
  setCollapsed(false);
}

// Re-render the current page in place (keeps scroll), e.g. after data changes.
export function refresh() {
  const hash = stack[stack.length - 1] || location.hash.replace(/^#\/?/, '') || 'discover';
  return renderHash(hash, window.scrollY);
}

window.addEventListener('hashchange', route);
store.subscribe((topic) => {
  if (topic === 'data' || topic === 'feed') refresh();
  if (topic === 'prefs' && lang() !== lastLang) languageChanged();
});

// Language: 'auto' follows the phone, so a change of the system language counts too.
let lastLang = lang();
function languageChanged() {
  lastLang = lang();
  applyLang();
  paintShellText();
  paintMini();
  refresh();
}
window.addEventListener('languagechange', () => { if (lang() !== lastLang) languageChanged(); });

// ---------- collapsing dock ----------
let collapsed = false;
let lastY = window.scrollY;
function setCollapsed(on) {
  if (on === collapsed) return;
  collapsed = on;
  dock.classList.toggle('collapsed', on);
  document.body.classList.toggle('dock-collapsed', on);
}
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 40;
  if (nearBottom || y < 80) setCollapsed(false);
  else if (y > lastY + 6) setCollapsed(true);
  else if (y < lastY - 12) setCollapsed(false);
  lastY = y;
}, { passive: true });

// ---------- mini player: Preview, else Now listening ----------
// While a 30-second preview plays inside Klang (music.js preview): its track with ▶/❚❚, the time left,
// ⏭ (the next preview of the queue) and a thin progress line. Otherwise "Now listening": the piece
// last sent to Apple Music Classical / Apple Music with ↗ (open it again) and, during a Play-all run,
// ⏭ (open the next piece) — real <a> links from listenLink, so on an iPhone the tap itself hands the
// piece to the app. Idle: "Nothing playing". Tapping the rest of the mini player opens the
// Now-listening view (ui/player.js), which shows the preview or the piece.
const miniMain = h('button', { class: 'mp-main', type: 'button' });
let nowListening = listening();
let miniSig = '';
const fmtLeft = (st) => {
  const s = Math.max(0, (st.duration || 30) - (st.elapsed || 0));
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};
const artOf = (src) => (src
  ? h('img', { class: 'art', src, alt: '', onerror: (e) => e.target.replaceWith(h('span', { class: 'art idle' }, icon('music', 16))) })
  : h('span', { class: 'art idle' }, icon('music', 16)));

// preview mode: built once per track, then only the time, progress and ▶/❚❚ change
const mpSub = h('span', { class: 's' });
const mpPlay = h('button', { class: 'mp-btn mp-pp', type: 'button', onclick: () => preview.toggle() });
const mpNext = h('button', { class: 'mp-btn', type: 'button', onclick: () => preview.next() }, icon('forward', 16));
const mpProg = h('span', { class: 'progress', 'aria-hidden': 'true' }, h('i'));

function tickMini(st) {
  mpSub.textContent = [st.playing ? t('Preview · {time} left', { time: fmtLeft(st) }) : t('Preview paused'), st.track.artist].filter(Boolean).join(' · ');
  mpProg.firstChild.style.width = `${(Math.max(0, Math.min(1, st.progress || 0)) * 100).toFixed(1)}%`;
  mpPlay.replaceChildren(icon(st.playing ? 'pause' : 'play', 17));
  mpPlay.setAttribute('aria-label', st.playing ? t('Pause the preview') : t('Play the preview'));
}

function paintMini(L = nowListening) {
  nowListening = L;
  const st = previewState();
  if (st.track) {
    const sig = `pv|${st.track.id}|${st.hasNext}|${lang()}`;
    if (sig !== miniSig) {
      miniSig = sig;
      mini.classList.remove('idle');
      mini.classList.add('pv');
      mini.title = t('30-second preview');
      clear(miniMain).append(artOf(st.track.artwork),
        h('span', { class: 'meta' }, h('span', { class: 't' }, st.track.title || ''), mpSub));
      miniMain.setAttribute('aria-label', t('Preview: {title}. Show details', { title: st.track.title || '' }));
      mpNext.setAttribute('aria-label', st.next ? t('Next preview: {title}', { title: st.next.title || '' }) : t('Next preview'));
      clear(mini).append(...[miniMain, mpPlay, st.hasNext ? mpNext : null, mpProg].filter(Boolean));
    }
    tickMini(st);
    return;
  }
  miniSig = '';
  mini.classList.remove('pv');
  const cur = L.current;
  mini.classList.toggle('idle', !cur);
  clear(miniMain).append(artOf(cur?.artwork),
    h('span', { class: 'meta' },
      h('span', { class: 't' }, cur ? cur.title : t('Nothing playing')),
      cur ? h('span', { class: 's' }, cur.artist || cur.composer || t(playAppName())) : null));
  miniMain.setAttribute('aria-label', cur
    ? t('Now listening: {title}. Show details', { title: cur.artist ? `${cur.title}, ${cur.artist}` : cur.title })
    : t('Nothing playing'));
  if (!cur) {
    mini.removeAttribute('title');
    clear(mini).append(miniMain);
    return;
  }
  const app = t(playAppName());
  mini.title = t('Opened in {app}', { app });
  const parts = [
    miniMain,
    listenLink(cur, icon('external', 17), { cls: 'mp-btn', queue: L.queue, index: L.index, label: t('Open {title} again in {app}', { title: cur.title, app }) }),
  ];
  if (L.next) parts.push(listenLink(L.next, icon('forward', 16), { cls: 'mp-btn', queue: L.queue, index: L.index + 1, label: t('Next: {title}, in {app}', { title: L.next.title, app }) }));
  clear(mini).append(...parts);
}

paintMini();
// Repaint on the next task: the link just tapped must stay in the page until its URL is handed over.
// A piece just opened in Apple Music ends any in-app preview.
let lastOpenedAt = nowListening.at;
onListening((L) => setTimeout(() => {
  if (L.current && L.at !== lastOpenedAt && previewState().track) preview.stop();
  lastOpenedAt = L.at;
  paintMini(L);
}, 0));
preview.subscribe(() => paintMini());
store.subscribe((topic) => topic === 'prefs' && (miniSig = '', paintMini())); // links follow the "Play in" choice

mini.addEventListener('click', async (e) => {
  if (e.target.closest('a, .mp-btn')) return;
  if (!nowListening.current && !previewState().track) {
    toast(t('Nothing playing — tap Listen on a work or concert to play it in {app}', { app: t(playAppName()) }));
    return;
  }
  try {
    const mod = await import('./ui/player.js');
    mod.openPlayer();
  } catch (err) {
    console.error(err);
  }
});

// Appearance preference: 'system' | 'dark' | 'light'
function applyTheme() {
  const t = store.pref('theme') || 'system';
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}
applyTheme();
store.subscribe((topic) => topic === 'prefs' && applyTheme());

// Real listings: the copy from the last visit shows at once; on a first visit the page waits for the
// feed (at most a few seconds) rather than flashing "no concerts".
feed.startFeed();
if (!location.hash) location.replace('#/discover');
if (feed.hasFeed()) route();
else Promise.race([feed.loadFeed(), new Promise((r) => setTimeout(r, 4000))]).then(route);
