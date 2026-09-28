// Real browser regression gate. Test hooks exist only in the intercepted response.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
const root=resolve(new URL('..',import.meta.url).pathname),engine=process.env.BROWSER||'chromium';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff':'font/woff','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=createServer(async(req,res)=>{
  try{
    const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
    if(!path.startsWith(root+'/'))throw new Error('Invalid path');
    res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(await readFile(path));
  }catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await ({chromium,webkit}[engine]).launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,serviceWorkers:'block'});
  page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('spacebitz:field:settings',JSON.stringify({music:false,paused:true,controls:'touch',resolution:'2',showCoords:true})));
  await page.route('**/main.js',async route=>{
    const response=await route.fetch();let source=await response.text();
    source=source.replaceAll('requestAnimationFrame(frame);','if(!globalThis.__qaPause)requestAnimationFrame(frame);');
    source=source.replace('}finally{ctx.restore();}',"}finally{ctx.restore();globalThis.__lastFrame={width:state.width,height:state.height,dpr:state.dpr,ship:state.save?screen(state.save.ship.x,state.save.ship.y):null,transform:ctx.getTransform().toString()};}");
    source+='\nwindow.__game={state,settings,frame,backdrop,drawSystem,update,updateUI,create,start,select,showDetails,enterSurface,drawGround,drawCoordinateGrid,launch,closeModal,zoom};';
    await route.fulfill({response,body:source});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.locator('#startGame').click();
  const started=Date.now();await page.locator('#solGame').click();
  await page.waitForFunction(()=>window.__game?.state.scene==='system'&&window.__game.state.lastUI>0);
  const startupMs=Date.now()-started;assert.ok(startupMs<10000,`Startup stalled: ${startupMs}ms`);
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  await page.evaluate(async()=>{window.__qaPause=true;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  const initial=await page.evaluate(()=>{
    const c=document.getElementById('sky'),g=c.getContext('2d'),s=window.__game.state,r=c.getBoundingClientRect(),m=g.getTransform();
    const image=c.toDataURL(),pixels=g.getImageData(c.width/2-20,c.height/2-30,40,60).data;let shipPixels=0;
    for(let i=0;i<pixels.length;i+=4)if(pixels[i+1]>90&&pixels[i+2]>90)shipPixels++;
    return {width:s.width,height:s.height,dpr:s.dpr,canvasWidth:c.width,canvasHeight:c.height,rect:{width:r.width,height:r.height},transform:[m.a,m.b,m.c,m.d,m.e,m.f],lastFrame:window.__lastFrame,shipPixels,image};
  });
  await mkdir('.qa',{recursive:true});await writeFile(`.qa/${engine}-canvas.png`,Buffer.from(initial.image.split(',')[1],'base64'));
  delete initial.image;assert.deepEqual(initial.transform,[2,0,0,2,0,0]);
  assert.equal(initial.canvasWidth,initial.width*initial.dpr);assert.equal(initial.width,initial.rect.width);
  assert.ok(initial.shipPixels>200,`Ship missing from the viewport centre on startup: ${JSON.stringify(initial)}`);
  await page.screenshot({path:`.qa/${engine}-sol.png`});
  assert.equal(await page.locator('#gridToggle').getAttribute('aria-pressed'),'false');
  const controls=await page.evaluate(()=>{
    const alpha=id=>getComputedStyle(document.getElementById(id)).backgroundColor;
    const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom};};
    return {panels:['systemChartToggle','clock','telemetry','joystick','homeButton','mapButton'].map(alpha),thumb:alpha('stick'),joy:rect('joystick'),warp:rect('mapButton')};
  });
  for(const fill of controls.panels)assert.match(fill,/, 0\.25\)$/,fill);
  assert.ok(!controls.thumb.startsWith('rgba'),controls.thumb);
  assert.ok(controls.joy.left<100&&390-controls.joy.bottom<=7);
  assert.ok(844-controls.warp.right<=7&&390-controls.warp.bottom<=7);
  await page.locator('#gridToggle').click();
  assert.equal(await page.locator('#gridToggle').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spacebitz:field:settings')).showGrid),true);
  await page.locator('#settingsOpen').click();assert.equal(await page.locator('#setting-showGrid').isChecked(),true);
  await page.locator('#setting-showGrid').uncheck();await page.evaluate(()=>window.__game.closeModal());
  assert.equal(await page.locator('#gridToggle').getAttribute('aria-pressed'),'false');
  await page.evaluate(()=>{
    const g=window.__game,s=g.state; s.followBody=null;s.camera={x:0,y:0};s.zoom=.00001;
    document.getElementById('homeButton').click();
    if(s.camera.x!==s.save.ship.x||s.camera.y!==s.save.ship.y||s.zoom!==.00001)throw new Error('Center must snap before zooming');
    g.update(325,0);if(!(s.zoom>.00001&&s.zoom<1.3))throw new Error('No intermediate zoom');
    g.update(325,0);if(Math.abs(s.zoom-1.3)>1e-9||s.centerZoom)throw new Error('Zoom did not finish');
    s.zoom=.001;document.getElementById('homeButton').click();g.zoom(.5);
    if(s.centerZoom)throw new Error('Manual zoom did not cancel animation');
    g.settings.reducedMotion=true;document.getElementById('homeButton').click();
    if(s.zoom!==1.3||s.centerZoom)throw new Error('Reduced-motion zoom must be immediate');g.settings.reducedMotion=false;
    const earth=s.system.planets.find(p=>p.name==='Earth');g.showDetails(earth);
    const tile=[...document.querySelectorAll('.detail-tile')].find(e=>e.textContent.includes('DIAMETER'));
    if(!tile.textContent.includes('12,742 km'))throw new Error('Diameter not kilometres');g.closeModal();
    g.enterSurface(earth);g.updateUI();
    if(/\d+\.\d+/.test(document.getElementById('telemetry').textContent))throw new Error('Fractional coordinates');
    const c=document.getElementById('sky'),ctx=c.getContext('2d');
    g.backdrop(1000);g.drawGround(1000);g.drawCoordinateGrid();const off=c.toDataURL();
    g.settings.showGrid=true;g.backdrop(1000);g.drawGround(1000);g.drawCoordinateGrid();
    if(c.toDataURL()===off)throw new Error('Grid toggle did not change raster');
    g.settings.showGrid=false;s.waypoint={x:0,y:0,size:18.6};g.drawCoordinateGrid();
    s.waypoint=null;g.backdrop(1000);g.drawGround(1000);g.updateUI();
  });
  await page.screenshot({path:`.qa/${engine}-surface.png`});
  await page.evaluate(()=>window.__game.launch());
  const results=await page.evaluate(async()=>{
    const g=window.__game,{state,settings}=g,canvas=document.getElementById('sky'),ctx=canvas.getContext('2d');
    const {bodyPosition,makeSystem,visualRadius,orbitRadius,habitableZone}=await import('/model.js');
    const pixels=()=>ctx.getImageData(0,0,canvas.width,canvas.height).data;
    g.backdrop(1000);const before=pixels();
    state.camera={x:1e9,y:-1e9};ctx.globalAlpha=.1;ctx.globalCompositeOperation='lighter';ctx.shadowBlur=40;
    g.backdrop(1000);const after=pixels();
    if(!before.every((value,i)=>value===after[i]))throw new Error('Background changed with ship/camera or left stale pixels');
    const sol=makeSystem('sol'),cases=[];
    for(const name of ['Earth','Jupiter','Saturn'])for(const zoom of [.85,12,128]){
      const body=sol.planets.find(p=>p.name===name),p=bodyPosition(body,state.save.days,sol);
      cases.push({name:`${name}-${zoom}`,system:sol,camera:p,zoom,selected:body});
    }
    for(const zoom of [.1,128])cases.push({name:`Sol-${zoom}`,system:sol,camera:{x:0,y:0},zoom});
    const zone=habitableZone(1);cases.push({name:'zone-edge',system:sol,camera:{x:orbitRadius(zone.inner),y:0},zoom:.85});
    cases.push({name:'full-system',system:sol,camera:{x:0,y:0},zoom:.00001});
    const generated=makeSystem('render-regression'),home=generated.planets[0];
    cases.push({name:'generated-start',system:generated,camera:bodyPosition(home,state.save.days,generated),zoom:.85});
    const reports=[];
    for(const c of cases){
      state.system=c.system;state.scene='system';state.camera=c.camera;state.zoom=c.zoom;state.selected=c.selected||null;
      state.save.ship={x:c.camera.x+100/state.zoom,y:c.camera.y+100/state.zoom};
      const times=[];
      for(let i=0;i<24;i++){
        state.stellarSeconds=30+i/30;const t=performance.now();g.backdrop(1000+i*16);ctx.save();g.drawSystem(1000+i*16);ctx.restore();
        // Force raster completion so the timing includes deferred canvas work.
        ctx.getImageData(0,0,1,1);times.push(performance.now()-t);
      }
      const sorted=times.slice(1).sort((a,b)=>a-b);reports.push({name:c.name,coldMs:times[0],p95Ms:sorted[Math.floor(sorted.length*.95)]});
      if(reports.at(-1).p95Ms>250)throw new Error(`Rendering stalled: ${JSON.stringify(reports.at(-1))}`);
      if(c.name==='Earth-0.85'){
        const data=pixels();let white=0,transparent=0;
        for(let i=0;i<data.length;i+=4){if(data[i]>245&&data[i+1]>245&&data[i+2]>245)white++;if(data[i+3]!==255)transparent++;}
        if(white>canvas.width*canvas.height*.05||transparent)throw new Error('White/transparent corruption in Sol startup view');
      }
    }
    state.system=sol;state.camera={x:0,y:0};state.zoom=.1;state.selected=sol.star;state.panUntil=Infinity;
    state.followBody=null;state.save.ship={x:visualRadius(sol.star.diameter)+100,y:0};g.updateUI();g.backdrop(1000);g.drawSystem(1000);
    return reports;
  });
  await page.screenshot({path:`.qa/${engine}-star.png`});
  await page.locator('#mapButton').screenshot({path:`.qa/${engine}-lever-idle.png`});
  await page.locator('#mapButton').click();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('#mapButton').getAttribute('aria-busy'),'true');
  await page.locator('#mapButton').screenshot({path:`.qa/${engine}-lever-engaged.png`});
  await page.evaluate(()=>{const g=window.__game;g.state.warpUntil=performance.now()-1;g.update(16,0);});
  assert.equal(await page.evaluate(()=>window.__game.state.scene),'chart');
  assert.equal(await page.locator('#mapButton').evaluate(e=>e.classList.contains('latched')),true);
  assert.equal(await page.locator('#mapButton').getAttribute('aria-busy'),'false');
  await page.waitForTimeout(350);await page.locator('#mapButton').screenshot({path:`.qa/${engine}-lever-latched.png`});
  await page.locator('#mapButton').click();
  await page.evaluate(()=>{const g=window.__game;g.state.warpUntil=performance.now()-1;g.update(16,0);});
  assert.equal(await page.locator('#mapButton').evaluate(e=>e.classList.contains('latched')),false);
  await page.evaluate(()=>{window.__game.state.warpUntil=0;window.__game.create(false);window.__game.frame(performance.now());});
  assert.equal(await page.evaluate(()=>window.__game.state.scene),'system');
  await page.reload();await page.locator('#startGame').click();await page.locator('.load-save').first().click();
  await page.waitForFunction(()=>window.__game?.state.scene==='system'&&window.__game.state.lastUI>0);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
  await page.screenshot({path:`.qa/${engine}-portrait.png`});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({engine,startupMs,initial,reports:results},null,2));
}finally{await browser.close();server.close();}
