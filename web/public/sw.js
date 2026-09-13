// Hand-written service worker (no next-pwa/Workbox) — Next.js 16 defaults
// to Turbopack and next-pwa/Serwist aren't confirmed compatible with it yet
// (Serwist's own docs note it "currently requires webpack configuration").
// Next.js's own official PWA guide (node_modules/next/dist/docs/.../
// progressive-web-apps.md) recommends exactly this: a plain public/sw.js,
// registered directly, no build-tool plugin. Scope is deliberately modest —
// docs/18-technical-architecture.md §7 only asks for "the dashboard loads
// (even to a you're-offline state)" plus push notifications, not a full
// offline-everything strategy.

// Bump the version whenever a cached shell asset changes, so `activate`
// purges the old copies. v2 dropped stale /api/auth responses; v3 ships the
// blue icons and offline page.
const SHELL_CACHE = 'sms-shell-v3';
const RUNTIME_CACHE = 'sms-runtime-v3';
const OFFLINE_URL = '/offline.html';

const SHELL_ASSETS = [OFFLINE_URL, '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never intercept mutations — those go through the Dexie queue, not the SW cache

  // Cross-origin API calls and everything under /api (NextAuth's csrf and
  // session endpoints, exports) are per-user and must always hit the
  // network. A cached /api/auth/csrf token stops matching the csrf cookie,
  // so every sign-in fails with MissingCSRF — which the login form can only
  // report as "Email or password is incorrect."
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Page navigations: network-first, cache the result for next time, fall
  // back to the last-cached version of that exact page, and only as a
  // last resort show the generic offline page (so a teacher who already
  // visited /teacher/attendance today still sees *something* useful, not
  // just a blank offline notice, if they lose connectivity mid-session).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ?? caches.match(OFFLINE_URL);
        }),
    );
    return;
  }

  // Static assets (icons, manifest, _next static chunks): cache-first, since
  // these are content-hashed/rarely change and a cache hit avoids a round
  // trip entirely, online or not. Anything else (e.g. RSC payload fetches)
  // is dynamic and goes straight to the network.
  if (!isStaticAsset(url.pathname)) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        }),
    ),
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    /\.(?:png|jpe?g|svg|ico|webp|webmanifest|woff2?)$/.test(pathname)
  );
}

// --- Push notifications ---

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'School Management System', body: event.data.text() };
  }

  const options = {
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(url));
        if (existing) return existing.focus();
        return self.clients.openWindow(url);
      }),
  );
});
