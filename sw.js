// Written for Rolehack by Lucas Ruiz, 2026-09-26.
//
// The installed app's service worker: every file the page needs, cached at
// install, so Rolehack starts with no server running.  build.sh stamps the
// version from the files' contents; a changed build installs a new cache on
// the next launch that can reach the server, and the old one goes once the
// new one is active.  It never reloads a page: a game in progress keeps
// running on the files it started with.

const VERSION = 'fbb43b304524';
// the cache is named for the channel the worker serves (channel.js: the
// preview channel lives under /preview/), so the live page's worker and the
// preview's share the origin's cache storage without touching each other
const CHANNEL = /\/preview\/sw\.js$/.test(self.location.pathname) ? 'rhpreview' : 'rolehack';
const CACHE = `${CHANNEL}-${VERSION}`;
const FILES = [
  './', 'index.html', 'rolehack.css', 'manifest.json',
  'web.js', 'overlay.js', 'commands.js', 'prefs.js', 'doll.js', 'feedback.js', 'layout.js', 'viewer.js', 'input.js', 'channel.js', 'glide.js', 'defaults.nh', 'build.json',
  'sounds/key-tactile.ogg',
  'nethack.js', 'nethack.wasm', 'tiles.png', 'tiles.json',
  'fonts/VT323-Regular.ttf', 'fonts/IBMPlexSansCondensed-SemiBold.ttf', 'fonts/AtkinsonHyperlegibleNext-Variable.ttf',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith(`${CHANNEL}-`) && k !== CACHE)
      .map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// the cache first; the network only for what it lacks
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE)
    .then((c) => c.match(e.request, { ignoreSearch: true }))
    .then((hit) => hit || fetch(e.request)));
});
