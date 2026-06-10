const CACHE_NAME = 'prado-ia-v18-mobile-premium';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./manifest.json','./icon-192.png','./icon-512.png',
  './assets/teams/river.svg',
  './assets/teams/penarol.svg',
  './assets/teams/orlando.svg',
  './assets/teams/nacional.svg',
  './assets/teams/lanus.svg',
  './assets/teams/inter-miami.svg',
  './assets/teams/goias.svg',
  './assets/teams/flamengo.svg',
  './assets/teams/everton.svg',
  './assets/teams/danubio.svg',
  './assets/teams/crb.svg',
  './assets/teams/colo-colo.svg',
  './assets/teams/cienciano.svg',
  './assets/teams/cali.svg',
  './assets/teams/bahia.svg',
  './assets/teams/alianza.svg'];
self.addEventListener('install', event => { self.skipWaiting(); event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => { event.respondWith(fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); return response; }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))); });
