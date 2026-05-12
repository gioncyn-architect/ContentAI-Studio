// ═══════════════════════════════════════════════
//  ContentAI Studio — sw.js
//  Service Worker v1
// ═══════════════════════════════════════════════

const CACHE_NAME  = 'contentai-v1';
const CACHE_URLS  = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// Domains that should NEVER be cached (live API calls)
const BYPASS_HOSTS = [
  'api.groq.com',
  'generativelanguage.googleapis.com',
  'api.mistral.ai',
  'elevenlabs.io',
  'api.pexels.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// ── Install: cache all static assets ────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ─────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: stale-while-revalidate for assets,
//           network-only for API calls ────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always bypass external API / font requests
  if (BYPASS_HOSTS.some(host => url.hostname.includes(host))) return;

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        const networkFetch = fetch(event.request)
          .then(response => {
            if (response && response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => cached); // fallback to cache when offline

        // Return cached instantly, update in background
        return cached || networkFetch;
      })
    )
  );
});
