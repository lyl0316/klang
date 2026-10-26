// Klang service worker: makes the installed app open offline.
// Network-first for Klang's own files (so updates show immediately), with a cached fallback.
// Google Fonts are cached; Apple (iTunes) data, artwork and the 30-second previews are never cached
// here (previews stream from Apple; full pieces open in Apple Music Classical / Apple Music). The real
// listings (data/concerts.json) are not precached: they are fetched network-first like any own file,
// and feed.js also keeps a copy for an instant, offline start.
const CACHE = 'klang-shell-v6';
// Every file the app needs, so the installed app opens offline after the first visit.
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-180.png',
  './css/app.css',
  './css/area-concert.css',
  './css/area-concerts.css',
  './css/area-pages.css',
  './css/area-personal.css',
  './css/listening.css',
  './css/parity-concerts.css',
  './css/parity-discover.css',
  './css/parity-pages.css',
  './css/parity-palette.css',
  './css/parity-personal.css',
  './css/shell.css',
  './css/theme.css',
  './css/zh.css',
  './js/applemusic.js',
  './js/assistant-engine.js',
  './js/feed.js',
  './js/i18n.js',
  './js/ics.js',
  './js/main.js',
  './js/music.js',
  './js/repo.js',
  './js/store.js',
  './js/time.js',
  './js/util.js',
  './js/ui/components.js',
  './js/ui/listen.js',
  './js/ui/player.js',
  './js/ui/preview.js',
  './js/ui/save.js',
  './js/ui/sheet.js',
  './js/i18n/zh-concert.js',
  './js/i18n/zh-concerts.js',
  './js/i18n/zh-names.js',
  './js/i18n/zh-pages.js',
  './js/i18n/zh-personal.js',
  './js/i18n/zh-player.js',
  './js/i18n/zh-shell.js',
  './js/content/bios.js',
  './js/content/editorials.js',
  './js/content/guides-more-1.js',
  './js/content/guides-more-2.js',
  './js/content/guides-more-3.js',
  './js/content/guides-more-4.js',
  './js/content/guides.js',
  './js/content/portraits.js',
  './js/data/cities.js',
  './js/data/countries.js',
  './js/data/generate.js',
  './js/data/names.js',
  './js/data/repertoire.js',
  './js/data/venues.js',
  './js/views/activity.js',
  './js/views/assistant.js',
  './js/views/concert.js',
  './js/views/concerts.js',
  './js/views/discover.js',
  './js/views/editorial.js',
  './js/views/entity.js',
  './js/views/library.js',
  './js/views/map.js',
  './js/views/me.js',
  './js/views/settings.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return; // Apple data/artwork and links: straight to network
  if (isFont) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    })));
    return;
  }
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))));
});
