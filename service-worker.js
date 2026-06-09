const CACHE_NAME = "prado-sports-v17-clean";
const FILES = ["./index.html?v=17","./manifest.json","./icon-192.png","./icon-512.png"];
self.addEventListener("install", e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(FILES)))});
self.addEventListener("activate", e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null))));self.clients.claim()});
self.addEventListener("fetch", e=>{e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});
