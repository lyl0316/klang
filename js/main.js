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
// Klang plays no audio: the mini player shows "Now listening" — the piece last opened in Apple Music
// Classical / Apple Music (applemusic.js) — and the Now-listening view lives in ui/player.js.

import { h, icon, clear, toast } from './util.js';
import * as store from './store.js';
import { listening, onListening, listenLink, playAppName } from './applemusic.js';

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

const app = document.getElementById('app');
const header = h('header', { class: 'app-header' });
const view = h('main', { id: 'view', tabindex: '-1' });
const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Main' });
// A group, not a button: its ↗ / ⏭ are real links (see the mini player below).
const mini = h('div', { class: 'mini-player', role: 'group', 'aria-label': 'Now listening' });
const dockTab = h('a', { class: 'dock-tab', 'aria-label': 'Current tab' });
const dockSearch = h('a', { class: 'dock-search', href: '#/search', 'aria-label': 'Search' }, icon('search', 20));
const dock = h('div', { class: 'dock' }, dockTab, mini, dockSearch, tabbar);
app.append(header, view);
document.body.append(dock);

let currentTab = 'discover';
let cleanup = null;
const stack = [];
const scrollPos = new Map();

for (const t of TABS) {
  tabbar.append(h('a', { href: t.path, dataset: { tab: t.id }, 'aria-label': t.label }, icon(t.icon, 22), h('span', {}, t.label)));
}

function paintTabs() {
  for (const a of tabbar.querySelectorAll('a')) {
    const on = a.dataset.tab === currentTab;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  const t = TABS.find((x) => x.id === currentTab) || TABS[0];
  dockTab.href = t.path;
  dockTab.setAttribute('aria-label', t.label);
  dockTab.replaceChildren(icon(t.icon, 20));
}

// tapping the active tab (or the collapsed tab button) pops back to the tab root
tabbar.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (a && a.dataset.tab === currentTab && location.hash === a.getAttribute('href')) window.scrollTo({ top: 0, behavior: 'smooth' });
});
dockTab.addEventListener('click', () => setCollapsed(false));

export function goBack() {
  if (stack.length > 1) history.back();
  else location.hash = TABS.find((t) => t.id === currentTab)?.path || '#/discover';
}

function renderHeader(v) {
  clear(header);
  header.hidden = v.header === false;
  if (v.header === false) return;
  header.className = `app-header ${v.largeTitle ? '' : 'solid'}`;
  if (v.back) header.append(h('div', { class: 'side' }, h('button', { class: 'icon-btn', 'aria-label': 'Back', onclick: goBack }, icon('back', 20))));
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
    v = { title: 'Something went wrong', back: true, body: h('div', { class: 'empty' }, h('h3', {}, 'Could not open this page'), h('p', {}, String(err.message || err))) };
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
  if (topic === 'data') refresh();
  if (topic === 'prefs' && store.pref('showDemo') !== lastShowDemo) {
    lastShowDemo = store.pref('showDemo');
    refresh();
  }
});
let lastShowDemo = store.pref('showDemo');

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

// ---------- mini player: Now listening ----------
// Idle: "Nothing playing". Otherwise the piece last sent to Apple Music Classical / Apple Music with
// ↗ (open it again) and, during a Play-all run, ⏭ (open the next piece). Both are real <a> links
// from listenLink, so on an iPhone the tap itself hands the piece to the app. Tapping the rest of
// the mini player opens the Now-listening view.
const miniMain = h('button', { class: 'mp-main', type: 'button' });
let nowListening = listening();

function paintMini(L = nowListening) {
  nowListening = L;
  const cur = L.current;
  mini.classList.toggle('idle', !cur);
  clear(miniMain).append(
    cur?.artwork
      ? h('img', { class: 'art', src: cur.artwork, alt: '', onerror: (e) => e.target.replaceWith(h('span', { class: 'art idle' }, icon('music', 16))) })
      : h('span', { class: 'art idle' }, icon('music', 16)),
    h('span', { class: 'meta' },
      h('span', { class: 't' }, cur ? cur.title : 'Nothing playing'),
      cur ? h('span', { class: 's' }, cur.artist || cur.composer || playAppName()) : null));
  miniMain.setAttribute('aria-label', cur ? `Now listening: ${cur.title}${cur.artist ? `, ${cur.artist}` : ''}. Show details` : 'Nothing playing');
  if (!cur) {
    mini.removeAttribute('title');
    clear(mini).append(miniMain);
    return;
  }
  const app = playAppName();
  mini.title = `Opened in ${app}`;
  const parts = [
    miniMain,
    listenLink(cur, icon('external', 17), { cls: 'mp-btn', queue: L.queue, index: L.index, label: `Open ${cur.title} again in ${app}` }),
  ];
  if (L.next) parts.push(listenLink(L.next, icon('forward', 16), { cls: 'mp-btn', queue: L.queue, index: L.index + 1, label: `Next: ${L.next.title}, in ${app}` }));
  clear(mini).append(...parts);
}

paintMini();
// Repaint on the next task: the link just tapped must stay in the page until its URL is handed over.
onListening((L) => setTimeout(() => paintMini(L), 0));
store.subscribe((topic) => topic === 'prefs' && paintMini()); // links follow the "Play in" choice

mini.addEventListener('click', async (e) => {
  if (e.target.closest('a')) return;
  if (!nowListening.current) {
    toast(`Nothing playing — tap Listen on a work or concert to play it in ${playAppName()}`);
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

if (!location.hash) location.replace('#/discover');
route();
