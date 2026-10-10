const CACHE='spacebitz-field-v1.12.30';
const SHELL=['./','./index.html','./src/core/audio.js','./src/core/pwa.js','./src/core/scale.js','./src/core/settings.js','./src/core/viewport.js','./src/flight/flight-drive.js','./src/flight/flight-state.js','./src/flight/motion.js','./src/flight/navigation.js','./src/generated/changelog.js','./src/journal/log-device.js','./src/journal/log-objects.js','./src/journal/log-preview.js','./src/journal/voyage-log.js','./src/main.js','./src/rendering/body-cache.js','./src/rendering/celestial.js','./src/rendering/giants.js','./src/rendering/presentation.js','./src/rendering/rendering.js','./src/rendering/sprites.js','./src/rendering/stellar.js','./src/rendering/substellar.js','./src/rendering/terrain.js','./src/rendering/weather.js','./src/storage/saves.js','./src/storage/voyage-database.js','./src/storage/voyage-storage.js','./src/terminal/terminal-device.js','./src/terminal/terminal-history.js','./src/terminal/terminal.js','./src/ui/edge-scrollbar.js','./src/ui/hud.js','./src/ui/interface-fonts.js','./src/ui/rarity-ui.js','./src/ui/target-ui.js','./src/ui/touch-buttons.js','./src/universe/body-classification.js','./src/universe/exploration.js','./src/universe/legacy/universe-v2.js','./src/universe/model.js','./src/universe/star-info.js','./src/universe/universe.js','./styles/base.css','./styles/devices.css','./styles/flight.css','./styles/index.css','./styles/layout.css','./styles/terminal.css','./assets/spacebitz-pixel.woff','./assets/spacebitz-title.svg','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
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
