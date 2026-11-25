const CACHE_NAME = 'pawtal-shell-v3';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/detect.html',
  '/sources.html',
  '/manifest.json',
  '/styles.css',
  '/pet-ui.css',
  '/readable-ui.css',
  '/detect.css',
  '/sources.css',
  '/app.js',
  '/case-data.js',
  '/case-tools.js',
  '/matching.js',
  '/welcome.js',
  '/detect.js',
  '/sources.js',
  '/zone.js',
  '/poster-generator.mjs',
  '/hybrid-ranking.mjs',
  '/social-links.mjs',
  '/case-map.mjs',
  '/assets/icon-pawtal.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Network-first for HTML & JS/CSS so updates appear immediately, fallback to cache offline
  if (request.mode === 'navigate' || /\.(html|js|mjs|css|json)$/.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for static images & icons
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return res;
      });
    })
  );
});
