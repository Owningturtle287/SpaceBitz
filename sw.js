const CACHE='spacebitz-field-v1.12.22';
const SHELL=['./','./index.html','./audio.js','./body-cache.js','./body-classification.js','./celestial.js','./changelog.js','./edge-scrollbar.js','./exploration.js','./flight-drive.js','./flight-state.js','./giants.js','./hud.js','./interface-fonts.js','./log-device.js','./log-objects.js','./log-preview.js','./main.js','./model.js','./motion.js','./navigation.js','./presentation.js','./pwa.js','./rarity-ui.js','./rendering.js','./saves.js','./scale.js','./settings.js','./sprites.js','./star-info.js','./stellar.js','./substellar.js','./target-ui.js','./terminal-device.js','./terminal-history.js','./terminal.js','./terrain.js','./touch-buttons.js','./universe-v2.js','./universe.js','./viewport.js','./voyage-database.js','./voyage-log.js','./voyage-storage.js','./weather.js','./style.css','./styles-base.css','./styles-devices.css','./styles-flight.css','./styles-layout.css','./styles-terminal.css','./assets/spacebitz-pixel.woff','./assets/spacebitz-title.svg','./manifest.webmanifest','./icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(path=>new Request(path,{cache:'reload'})))));
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('spacebitz-field-')&&k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!event.request.url.startsWith(self.registration.scope))return;
  const url=new URL(event.request.url);
  if(event.request.headers.has('range')||url.pathname.includes('/audio/'))return;
  // Only cache the finite app shell. Query strings must not create unbounded
  // runtime entries; non-shell resources pass straight through to the network.
  const shellURL=new URL(url);shellURL.search='';
  const allowed=SHELL.some(path=>new URL(path,self.registration.scope).href===shellURL.href);
  if(!allowed)return;
  const response=caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(shellURL.href);if(cached)return cached;
    const value=await fetch(event.request);if(value.ok)await cache.put(shellURL.href,value.clone());return value;
  });
  event.respondWith(response);
  event.waitUntil(response.then(()=>{}).catch(()=>{}));
});
