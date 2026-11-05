/* COMETS HQ PWA shell cache: never cache private API responses. */
const CACHE='comets-hq-v7-0-8-shell';
const ASSETS=['./','./index.html','./live.js','./ui.js','./polish.css','./manifest.webmanifest','./comets-logo.png','./apple-touch-icon.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('comets-hq-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const r=event.request;if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;
 const path=new URL(r.url).pathname;
 if(!ASSETS.some(a=>new URL(a,self.registration.scope).pathname===path))return;
 event.respondWith(fetch(r).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(r,copy)))}return response}).catch(async()=>await caches.match(r,{ignoreSearch:true})||Response.error()));
});
