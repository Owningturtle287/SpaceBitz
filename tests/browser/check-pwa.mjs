// Exercise production code, service-worker upgrades and offline saved voyages.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,posix} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let playwright;
try{playwright=require('playwright');}catch{playwright=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');}
const root=resolve(new URL('../../dist/',import.meta.url).pathname),engine=process.env.BROWSER||'chromium';
// Start with the previous flat URL layout, using the same production files.
// This exercises installed-cache migration without checking in duplicate fixtures.
const worker=await readFile(resolve(root,'sw.js'),'utf8');
const shell=worker.match(/const SHELL=\[([^\]]+)\]/)[1].match(/'([^']+)'/g).map(s=>s.slice(1,-1)).filter(p=>p!=='./');
const flatPath=path=>path.startsWith('src/')?posix.basename(path):path==='styles/index.css'?'style.css':path.startsWith('styles/')?'styles-'+posix.basename(path):path==='icons/icon.svg'?'icon.svg':path;
const flatToCurrent=new Map(shell.map(p=>[flatPath(p.slice(2)),p.slice(2)]));
const legacyReference=(actual,spec)=>{
  if(!spec.startsWith('.'))return spec;
  const target=posix.normalize(posix.join(posix.dirname(actual),spec));
  const relative=posix.relative(posix.dirname(flatPath(actual)),flatPath(target));
  return relative.startsWith('.')?relative:'./'+relative;
};
let revision=0;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff':'font/woff','.mp3':'audio/mpeg','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
  try{
    const requested=new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html').slice(1);
    const actual=revision?requested:(flatToCurrent.get(requested)||requested),path=resolve(root,actual);
    if(!path.startsWith(root+'/'))throw Error('Invalid path');
    let content=await readFile(path);
    if(!revision){
      let source=content.toString();
      if(actual==='sw.js')source=source.replace(/const CACHE='([^']+)'/,"const CACHE='$1-flat-layout'").replace(/^const SHELL=.*;$/m,'const SHELL='+JSON.stringify(['./',...shell.map(p=>'./'+flatPath(p.slice(2)))]).replaceAll('\"',"'")+';');
      else if(actual.endsWith('.js'))source=source.replace(/(from\s*['"])(\.[^'"]+)(['"])/g,(_,a,spec,b)=>a+legacyReference(actual,spec)+b);
      else if(actual.endsWith('.css'))source=source.replace(/url\((['"])([^'"]+)\1\)/g,(_,q,spec)=>'url('+q+legacyReference(actual,spec)+q+')');
      else if(actual==='index.html')source=source.replace(/(\b(?:src|href)=['"])(\.\/[^'"]+)(['"])/g,(_,a,spec,b)=>a+'./'+flatPath(spec.slice(2))+b);
      if(actual.endsWith('.js')||actual.endsWith('.css')||actual==='index.html')content=Buffer.from(source);
    }
    res.setHeader('Cache-Control',path.endsWith('/sw.js')?'no-store':'public, max-age=3600');
    if(path.endsWith('/sw.js')&&revision)content=Buffer.from(content.toString().replace(/const CACHE='([^']+)'/,"const CACHE='$1-pwa-update'"));
    if(path.endsWith('/main.js')&&revision)content=Buffer.from(content.toString()+"\nwindow.__updatedGameAsset='revision-2';\n");
    if(path.endsWith('/index.html')&&revision)content=Buffer.from(content.toString().replace('</head>','<meta name="spacebitz-qa-revision" content="revision-2"></head>'));
    if(path.endsWith('/styles/terminal.css')&&revision)content=Buffer.from(content.toString()+"\n:root{--qa-updated-style:revision-2}\n");
    res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(content);
  }catch{res.statusCode=404;res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await playwright[engine].launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:844,height:390},serviceWorkers:'allow'}),page=await context.newPage();
  const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error('Production error:',error.message);});page.setDefaultTimeout(20000);
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.locator('#startGame').click();
  await page.waitForFunction(()=>{const a=document.getElementById('soundtrackAudio');return a&&!a.paused&&a.currentTime>.2&&a.duration>67.5&&a.duration<68.5;});
  const audio=await page.locator('#soundtrackAudio').evaluate(a=>({duration:a.duration,volume:a.volume,currentTime:a.currentTime}));
  await page.locator('#solGame').click();await page.waitForFunction(()=>!document.getElementById('app').hidden);
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  const cache=await page.evaluate(async()=>{const names=await caches.keys(),cache=await caches.open(names.find(n=>n.startsWith('spacebitz-field-')));return (await cache.keys()).map(r=>new URL(r.url).pathname);});
  assert.ok(cache.some(p=>p.endsWith('/terminal-device.js')));assert.ok(cache.some(p=>p.endsWith('/styles-devices.css')));
  assert.equal(await page.locator('script[type=module]').getAttribute('src'),'./main.js');
  let navigations=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
  revision=1;await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
  await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
  assert.equal(navigations,0);assert.equal(await page.evaluate(()=>!document.getElementById('app').hidden),true);
  await page.evaluate(()=>{window.__pwaBeforeUpdate=true;});
  await page.locator('#settingsOpen').click();await page.getByRole('button',{name:'SAVE & MAIN MENU',exact:true}).click();
  await page.waitForFunction(()=>window.__pwaBeforeUpdate===undefined&&document.getElementById('app').hidden);
  await page.waitForFunction(async()=> (await caches.keys()).some(k=>k.endsWith('-pwa-update')));
  assert.ok(navigations>=1,'Menu must apply the deferred update');
  assert.equal(await page.locator('script[type=module]').getAttribute('src'),'./src/main.js');
  const nestedCache=await page.evaluate(async()=>{const cache=await caches.open((await caches.keys()).find(k=>k.endsWith('-pwa-update')));return (await cache.keys()).map(r=>new URL(r.url).pathname);});
  assert.ok(nestedCache.includes('/src/terminal/terminal-device.js')&&nestedCache.includes('/styles/devices.css'));
  assert.equal(nestedCache.includes('/main.js'),false);
  const saved=await page.evaluate(async()=>{const {createVoyageStore}=await import('./src/storage/voyage-database.js'),store=createVoyageStore();try{return await store.list();}finally{store.close();}});assert.equal(saved.length,1);assert.equal(saved[0].homePlanet,'sol:Earth');
  const assertUpdated=async()=>{
    assert.equal(await page.evaluate(()=>window.__updatedGameAsset),'revision-2');
    assert.equal(await page.locator('meta[name="spacebitz-qa-revision"]').getAttribute('content'),'revision-2');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--qa-updated-style').trim()),'revision-2');
  };await assertUpdated();
  // WebKit's offline flag rejects even cache-only service-worker responses
  // (https://github.com/microsoft/playwright/issues/42775). Stop the origin in
  // both engines; Chromium additionally exercises the network-offline flag.
  const origin=page.url();
  await new Promise(done=>{server.close(done);server.closeAllConnections();});
  assert.equal(server.listening,false);
  await assert.rejects(fetch(origin),'The origin must be unavailable');
  if(engine==='chromium')await context.setOffline(true);
  const offlineResponse=await page.reload();
  assert.equal(offlineResponse.status(),200);assert.equal(offlineResponse.fromServiceWorker(),true);
  await assertUpdated();
  await page.locator('#startGame').click();await page.locator('.load-save').click();
  await page.waitForFunction(()=>!document.getElementById('app').hidden);assert.equal(await page.locator('#targetName').count(),1);
  assert.equal(await page.locator('#universeName').count(),1);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({engine,audio,offlineAssets:cache.length,changedGameAssets:true,flatLayoutUpgrade:true,updateDeferred:true,originUnavailable:true,offlineRestored:true}));await context.close();
}finally{await browser.close();server.close();}
