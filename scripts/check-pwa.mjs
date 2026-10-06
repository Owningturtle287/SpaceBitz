// Test the unmodified production bundle, with the service worker enabled.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let playwright;
try{playwright=require('playwright');}catch{playwright=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');}
const root=resolve(new URL('../dist/',import.meta.url).pathname),engine=process.env.BROWSER||'chromium';
let revision=0;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff':'font/woff','.mp3':'audio/mpeg','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
  try{
    const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
    if(!path.startsWith(root+'/'))throw Error('Invalid path');
    let content=await readFile(path);
    if(path.endsWith('/sw.js')){res.setHeader('Cache-Control','no-store');if(revision)content=Buffer.from(content.toString().replace(/const CACHE='([^']+)'/,"const CACHE='$1-pwa-update'"));}
    res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(content);
  }catch{res.statusCode=404;res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await playwright[engine].launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:844,height:390},serviceWorkers:'allow'}),page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.locator('#startGame').click();
  await page.waitForFunction(()=>{const a=document.getElementById('soundtrackAudio');return a&&!a.paused&&a.currentTime>.2&&a.duration>67.5&&a.duration<68.5;});
  const audio=await page.locator('#soundtrackAudio').evaluate(a=>({duration:a.duration,volume:a.volume,currentTime:a.currentTime}));
  await page.locator('#solGame').click();await page.waitForFunction(()=>!document.getElementById('app').hidden);
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  const cache=await page.evaluate(async()=>{const names=await caches.keys(),cache=await caches.open(names.find(n=>n.startsWith('spacebitz-field-')));return (await cache.keys()).map(r=>new URL(r.url).pathname);});
  assert.ok(cache.some(p=>p.endsWith('/terminal-device.js')));assert.ok(cache.some(p=>p.endsWith('/styles-devices.css')));
  let navigations=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
  revision=1;await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
  await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
  assert.equal(navigations,0);assert.equal(await page.locator('#app').isVisible(),true);
  await page.evaluate(()=>{window.__pwaBeforeUpdate=true;});
  await page.locator('#settingsOpen').click();await page.getByRole('button',{name:'SAVE & MAIN MENU',exact:true}).click();
  await page.waitForFunction(()=>window.__pwaBeforeUpdate===undefined&&document.getElementById('app').hidden);
  await page.waitForFunction(async()=> (await caches.keys()).some(k=>k.endsWith('-pwa-update')));
  assert.ok(navigations>=1,'Menu must apply the deferred update');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spacebitz:field:v1')));assert.equal(saved.length,1);assert.equal(saved[0].homePlanet,'sol:Earth');
  await context.setOffline(true);await page.reload();await page.locator('#startGame').click();await page.locator('.load-save').click();
  await page.waitForFunction(()=>!document.getElementById('app').hidden);assert.equal(await page.locator('#targetName').count(),1);
  assert.equal(await page.locator('#universeName').count(),1);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({engine,audio,offlineAssets:cache.length,updateDeferred:true,offlineRestored:true}));await context.close();
}finally{await browser.close();server.close();}
