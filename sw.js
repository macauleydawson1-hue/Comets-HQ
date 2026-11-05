/* COMETS HQ PWA shell cache: never cache private API responses. */
const CACHE='comets-hq-v7-0-1-shell';
const ASSETS=['./','./index.html','./live.js','./manifest.webmanifest','./assets/comets-logo.png','./assets/apple-touch-icon.png','./apple-touch-icon.png','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('comets-hq-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const r=event.request;if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;const path=new URL(r.url).pathname;if(!ASSETS.some(a=>path.endsWith(a.replace('./','/'))))return;event.respondWith(fetch(r).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(r,copy))}return response}).catch(()=>caches.match(r)))});
