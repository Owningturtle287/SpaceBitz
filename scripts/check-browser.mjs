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
    source+='\nwindow.__game={state,settings,frame,backdrop,drawSystem,update,updateUI,create,start,select,showDetails,enterSurface,drawGround,drawCoordinateGrid,launch,closeModal,zoom,terrain,applyCenterButtonLayout,primary,cancelTravel};';
    await route.fulfill({response,body:source});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.locator('#startGame').click();
  const started=Date.now();await page.locator('#solGame').click();
  await page.waitForFunction(()=>window.__game?.state.scene==='surface'&&window.__game.state.lastUI>0);
  assert.equal(await page.evaluate(()=>window.__game.state.save.homePlanet),await page.evaluate(()=>window.__game.state.save.landed));
  await mkdir('.qa',{recursive:true});
  await page.screenshot({path:`.qa/${engine}-home-start.png`});
  await page.evaluate(()=>{window.__game.launch();window.__game.frame(performance.now());});
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
  assert.equal(await page.locator('#gridToggle').count(),0);
  assert.equal(await page.locator('#systemChartContent #systemFit').count(),0);
  assert.equal((await page.locator('#systemFit').innerText()).trim(),'');
  const fitStart=await page.evaluate(()=>({...window.__game.state.camera}));
  await page.locator('#systemFit').click();
  assert.deepEqual(await page.evaluate(()=>({...window.__game.state.camera})),fitStart);
  await page.evaluate(async()=>{
    const g=window.__game,s=g.state,{systemFitZoom}=await import('/navigation.js');
    const from=s.centerZoom.from,to=systemFitZoom(s.system,s.width,s.height,s.save.days);
    if(s.zoom!==from||s.centerZoom.duration!==2600)throw new Error('Fit zoom must animate slowly');
    const origin={...s.camera};
    g.update(1300,0);if(!(s.zoom<from&&s.zoom>to)||Math.hypot(s.camera.x,s.camera.y)>=Math.hypot(origin.x,origin.y)||Math.hypot(s.camera.x,s.camera.y)===0)throw new Error('Fit must pan and zoom from current view');
    g.update(1300,0);if(Math.abs(s.zoom-to)>1e-12||s.centerZoom||s.camera.x!==0||s.camera.y!==0)throw new Error('System fit incomplete');
    g.backdrop(1000);g.drawSystem(1000);
    document.getElementById('systemFit').click();g.zoom(.5);if(s.centerZoom)throw new Error('Fit animation did not cancel');
    g.settings.reducedMotion=true;document.getElementById('systemFit').click();
    if(s.zoom!==to||s.centerZoom)throw new Error('Reduced-motion fit must be immediate');g.settings.reducedMotion=false;
  });
  await page.screenshot({path:`.qa/${engine}-system-fit.png`});
  await page.evaluate(()=>{const g=window.__game;g.state.panUntil=0;g.state.zoom=.95;g.state.camera={...g.state.save.ship};});
  const controls=await page.evaluate(()=>{
    const alpha=id=>getComputedStyle(document.getElementById(id)).backgroundColor;
    const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,top:r.top,width:r.width,height:r.height};};
    return {panels:['systemChartToggle','flightReadout','joystick','homeButton','mapButton'].map(alpha),thumb:alpha('stick'),joy:rect('joystick'),center:rect('homeButton'),warp:rect('mapButton'),target:rect('targetCard')};
  });
  for(const fill of controls.panels)assert.match(fill,/, 0\.25\)$/,fill);
  assert.ok(!controls.thumb.startsWith('rgba'),controls.thumb);
  assert.ok(controls.joy.left<100&&390-controls.joy.bottom<=7);
  assert.equal(controls.warp.width,controls.center.width);assert.equal(controls.warp.height,controls.center.height);
  assert.ok(Math.abs(controls.warp.left-controls.center.right-6)<1);
  assert.ok(844-controls.target.right<=7&&390-controls.target.bottom<=7&&controls.target.width<=160);
  await page.locator('#settingsOpen').click();
  assert.equal(await page.locator('.modal-card').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(16, 30, 50)');
  assert.equal(await page.locator('#setting-showGrid').isChecked(),false);
  await page.locator('#setting-showGrid').check();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spacebitz:field:settings')).showGrid),true);
  await page.locator('#setting-showGrid').uncheck();await page.evaluate(()=>window.__game.closeModal());
  const readout=await page.evaluate(()=>{
    const g=window.__game,s=g.settings,p=document.getElementById('flightReadout'),full=p.getBoundingClientRect().height;
    s.showClock=false;s.showCoords=false;s.showFPS=true;g.updateUI();
    const small=p.getBoundingClientRect().height;
    if(document.getElementById('fpsReadout').hidden||!document.getElementById('clock').hidden||!document.getElementById('coordsReadout').hidden)throw new Error('Readout toggles failed');
    s.showFPS=false;g.updateUI();if(!p.hidden)throw new Error('Empty readout should disappear');
    s.showClock=true;s.showCoords=true;g.updateUI();return {full,small};
  });
  assert.ok(readout.small<readout.full);
  await page.evaluate(()=>{
    const g=window.__game,s=g.state; s.followBody=null;s.camera={x:0,y:0};s.zoom=.00001;
    document.getElementById('homeButton').click();
    if(s.camera.x!==s.save.ship.x||s.camera.y!==s.save.ship.y||s.zoom!==.00001)throw new Error('Center must snap before zooming');
    g.update(650,0);if(!(s.zoom>.00001&&s.zoom<1.3))throw new Error('No intermediate zoom');
    g.update(650,0);if(Math.abs(s.zoom-1.3)>1e-9||s.centerZoom)throw new Error('Zoom did not finish');
    s.zoom=.001;document.getElementById('homeButton').click();g.zoom(.5);
    if(s.centerZoom)throw new Error('Manual zoom did not cancel animation');
    g.settings.reducedMotion=true;document.getElementById('homeButton').click();
    if(s.zoom!==1.3||s.centerZoom)throw new Error('Reduced-motion zoom must be immediate');g.settings.reducedMotion=false;
    const earth=s.system.planets.find(p=>p.name==='Earth');g.showDetails(earth);
    const tile=[...document.querySelectorAll('.detail-tile')].find(e=>e.textContent.includes('DIAMETER'));
    if(!tile.textContent.includes('12,742 km'))throw new Error('Diameter not kilometres');
    if(getComputedStyle(document.querySelector('.modal-card')).backgroundColor!=='rgb(16, 30, 50)')throw new Error('World info is not opaque');g.closeModal();
    g.enterSurface(earth);g.updateUI();
    if(!document.getElementById('mapButton').hidden||!document.getElementById('modeLabel').hidden)throw new Error('Surface still has warp/expedition label');
    const info=document.getElementById('surfaceInfo');
    for(const fact of ['12,742 km','365.26 days','MOONS','ROTATION'])if(!info.textContent.includes(fact))throw new Error('Missing surface fact '+fact);
    s.zoom=.65;s.camera={x:999,y:999};document.getElementById('homeButton').click();
    if(s.camera.x!==s.save.surface.x||s.centerZoom.duration!==1300)throw new Error('Surface center did not snap/start');
    g.update(650,0);if(!(s.zoom>.65&&s.zoom<2.4))throw new Error('Surface zoom has no intermediate frame');
    g.update(650,0);if(Math.abs(s.zoom-2.4)>1e-9||s.centerZoom)throw new Error('Surface zoom failed');
    if(/\d+\.\d+/.test(document.getElementById('coordsReadout').textContent))throw new Error('Fractional coordinates');
    const c=document.getElementById('sky'),ctx=c.getContext('2d');
    g.backdrop(1000);g.drawGround(1000);g.drawCoordinateGrid();const off=c.toDataURL();
    g.settings.showGrid=true;g.backdrop(1000);g.drawGround(1000);g.drawCoordinateGrid();
    if(c.toDataURL()===off)throw new Error('Grid toggle did not change raster');
    g.settings.showGrid=false;s.waypoint={x:0,y:0,size:18.6};g.drawCoordinateGrid();
    s.waypoint=null;g.backdrop(1000);g.drawGround(1000);g.updateUI();
  });
  await page.screenshot({path:`.qa/${engine}-surface.png`});
  await page.locator('#systemChartToggle').click();
  await page.screenshot({path:`.qa/${engine}-surface-info.png`});
  await page.locator('#systemChartToggle').click();
  await page.evaluate(async()=>{
    const g=window.__game,s=g.state;g.launch();
    const {bodyPosition,visualRadius,makeSystem}=await import('/model.js');
    const {SYSTEM_UNIT}=await import('/scale.js');
    // Chase a receding planet: the old integrator reached the boundary but could
    // never acknowledge arrival after the next clock tick moved that boundary.
    g.settings.paused=false;g.settings.timeMode='accelerated';
    for(const seed of ['sol','arrival-regression'])for(const dt of [16,33,100]){
      s.system=makeSystem(seed);s.save.currentSystem=seed;
      const body=s.system.planets[0],p=bodyPosition(body,s.save.days,s.system),next=bodyPosition(body,s.save.days+dt/1440000,s.system);
      const dx=next.x-p.x,dy=next.y-p.y,d=Math.hypot(dx,dy),r=visualRadius(body.diameter)+100;
      s.followBody=null;s.save.ship={x:p.x-dx/d*r,y:p.y-dy/d*r};g.select(body);g.primary();
      if(!s.autopilot)throw new Error('Chase did not start');
      g.update(dt,dt);
      if(s.autopilot||s.followBody?.id!==body.id||s.shipMotion.thrust!==0)throw new Error('Receding planet never entered orbit');
      g.update(dt,dt);
      const parked=bodyPosition(body,s.save.days,s.system);
      if(Math.abs(Math.hypot(s.save.ship.x-parked.x,s.save.ship.y-parked.y)-(visualRadius(body.diameter)+38))>1e-5)throw new Error('Orbit did not hold');
    }
    s.system=makeSystem('sol');s.save.currentSystem='sol';
    const earth=s.system.planets.find(p=>p.name==='Earth'),moon=earth.moons[0],pos=bodyPosition(earth,s.save.days,s.system);
    s.save.ship={x:pos.x+visualRadius(earth.diameter)+44,y:pos.y};s.followBody={id:earth.id,x:visualRadius(earth.diameter)+44,y:0};
    g.select(moon);g.primary();
    if(s.autopilot?.drive!=='orbit'||document.getElementById('primaryAction').textContent!=='ORBIT DRIVE'||!document.getElementById('targetDistance').textContent.includes('0.1 ls/s'))throw new Error('Local transfer has wrong drive');
    const before={...s.save.ship};g.update(16,16);
    if(Math.abs(Math.hypot(s.save.ship.x-before.x,s.save.ship.y-before.y)/SYSTEM_UNIT-.1*.016)>1e-7)throw new Error('Orbit Drive speed wrong');
    g.zoom(.5);const manualZoom=s.zoom;g.update(16,16);
    if(s.zoom!==manualZoom)throw new Error('Travel overrides manual zoom');
    for(let i=0;i<4000&&s.autopilot;i++){g.update(16,16);if(s.camera.x!==s.save.ship.x||s.camera.y!==s.save.ship.y)throw new Error('Orbit Drive camera lost ship');}
    if(s.autopilot||s.followBody?.id!==moon.id)throw new Error('Moon transfer never arrived');
    if(!s.centerZoom||s.centerZoom.to<1.3)throw new Error('Manual travel zoom prevented arrival close-up');
    g.update(1300,1300);
    if(s.zoom<1.3||s.centerZoom||s.camera.x!==s.save.ship.x||s.camera.y!==s.save.ship.y)throw new Error('Arrival did not track moving ship into close-up');
    g.backdrop(1000);g.drawSystem(1000);
  });
  await page.screenshot({path:`.qa/${engine}-moon-arrival.png`});
  await page.evaluate(()=>{
    const g=window.__game,s=g.state,earth=s.system.planets.find(p=>p.name==='Earth');
    g.select(earth);g.primary();if(s.autopilot?.drive!=='orbit')throw new Error('Moon return must use Orbit Drive');g.cancelTravel();
    g.settings.paused=true;s.selected=earth;g.enterSurface(earth);
    s.camera={x:700,y:0};g.backdrop(1000);g.drawGround(1000);g.updateUI();
  });
  await page.screenshot({path:`.qa/${engine}-surface-ship-arrow.png`});
  await page.evaluate(async()=>{
    const g=window.__game,s=g.state;g.launch();
    const {visualRadius}=await import('/model.js'),r=visualRadius(s.system.star.diameter);
    g.select(s.system.star);document.getElementById('primaryAction').click();
    if(s.autopilot?.type!=='stellar')throw new Error('Star travel unavailable');
    for(let i=0;i<3000&&s.autopilot;i++){
      g.update(16,0);if(Math.hypot(s.save.ship.x,s.save.ship.y)<r+38)throw new Error('Star approach entered the stellar disk');
    }
    if(s.autopilot||document.getElementById('primaryAction').textContent!=='HOLDING')throw new Error('Star travel did not arrive');
    const parked={...s.save.ship};g.update(1300,0);
    if(s.zoom<1.3||s.centerZoom||s.camera.x!==parked.x||s.camera.y!==parked.y)throw new Error('Star arrival did not zoom onto ship');
    if(s.save.ship.x!==parked.x||s.save.ship.y!==parked.y)throw new Error('Stellar stop drifts');
    g.backdrop(1000);g.drawSystem(1000);
  });
  await page.screenshot({path:`.qa/${engine}-star-arrival.png`});
  await page.evaluate(async()=>{
    const g=window.__game,s=g.state,{bodyPosition,visualRadius}=await import('/model.js');
    const mercury=s.system.planets.find(p=>p.name==='Mercury'),neptune=s.system.planets.find(p=>p.name==='Neptune');
    for(const [from,to,dt]of [[mercury,neptune,16],[neptune,mercury,100]]){
      const pos=bodyPosition(from,s.save.days,s.system);s.followBody=null;s.save.ship={x:pos.x+visualRadius(from.diameter)+60,y:pos.y};
      s.camera={x:0,y:0};s.zoom=.95;g.select(to);g.primary();
      if(s.camera.x!==s.save.ship.x||s.camera.y!==s.save.ship.y)throw new Error('Travel did not center on departure');
      let steps=0;
      while(s.autopilot&&steps++<7000){
        g.update(dt,dt);
        if(s.camera.x!==s.save.ship.x||s.camera.y!==s.save.ship.y)throw new Error('Far-travel camera lagged behind ship');
      }
      if(s.autopilot||s.followBody?.id!==to.id)throw new Error('Long travel did not arrive');
      for(let i=0;i<82;i++){
        g.update(16,16);
        if(s.camera.x!==s.save.ship.x||s.camera.y!==s.save.ship.y)throw new Error('Arrival zoom let ship leave center');
      }
      if(s.centerZoom||s.zoom<1.3)throw new Error('Arrival close-up did not finish');
    }
    g.backdrop(1000);g.drawSystem(1000);g.updateUI();
  });
  await page.screenshot({path:`.qa/${engine}-long-travel-arrival.png`});

  await page.evaluate(()=>{
    const g=window.__game,s=g.state,saved={landed:s.save.landed,selected:s.selected,scene:s.scene,zoom:s.zoom,camera:{...s.camera},followBody:s.followBody,ship:{...s.save.ship},surface:{...s.save.surface},chart:{...s.save.chart}};
    for(const scene of ['system','surface','chart'])for(const reduced of [false,true]){
      s.scene=scene;s.selected=null;s.save.landed=scene==='surface'?'sol:Earth':null;g.settings.reducedMotion=reduced;s.zoom=scene==='system'?.00001:.65;s.followBody=null;
      const p=scene==='surface'?s.save.surface:scene==='chart'?s.save.chart:s.save.ship;
      s.camera={x:p.x+100,y:p.y+100};s.autopilot={type:'waypoint',x:p.x,y:p.y};
      g.update(16,0);if(s.autopilot)throw new Error('Waypoint not complete');
      if(!reduced&&!s.centerZoom)throw new Error('Arrival animation missing');
      g.update(1300,0);
      if(s.zoom<(scene==='surface'?2.4:1.3)||s.camera.x!==p.x||s.camera.y!==p.y)throw new Error('Arrival framing failed in '+scene);
    }
    // A fresh manual zoom must still interrupt an arrival transition.
    s.scene='system';g.settings.reducedMotion=false;s.zoom=.00001;
    s.autopilot={type:'waypoint',...s.save.ship};g.update(16,0);g.zoom(.5);const z=s.zoom;g.update(100,0);
    if(s.centerZoom||s.zoom!==z)throw new Error('Arrival zoom cannot be interrupted');
    s.save.landed=saved.landed;s.selected=saved.selected;s.scene=saved.scene;s.zoom=saved.zoom;s.camera=saved.camera;s.followBody=saved.followBody;
    s.save.ship=saved.ship;s.save.surface=saved.surface;s.save.chart=saved.chart;s.autopilot=null;s.waypoint=null;g.updateUI();
  });

  await page.evaluate(async()=>{
    const g=window.__game,s=g.state;
    const {importVoyage}=await import('/saves.js');
    const raw=JSON.parse(JSON.stringify(s.save)),copy=importVoyage(raw,'import-qa');g.start(copy);
    for(const key of ['currentSystem','scene','ship','surface','chart','route','homePlanet','discoveries'])if(JSON.stringify(copy[key])!==JSON.stringify(raw[key]))throw new Error('Import changed '+key);
    const far=s.system.planets.at(-1);g.select(far);g.primary();
    if(document.getElementById('primaryAction').textContent!=='HYPERDRIVE'||document.getElementById('cancelTravel').hidden)throw new Error('Travel controls missing');
    document.getElementById('cancelTravel').click();if(s.autopilot)throw new Error('Cancel failed');
    const movements=[];
    for(const zoom of [.01,1,20]){s.followBody=null;s.zoom=zoom;const x=s.save.ship.x;s.keys.add('d');g.update(100,0);s.keys.clear();movements.push(s.save.ship.x-x);}
    if(Math.max(...movements)-Math.min(...movements)>1e-7)throw new Error('Manual speed changes with zoom');
    g.settings.centerButton='custom';g.settings.centerX=90;g.settings.centerY=90;g.applyCenterButtonLayout();
  });
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const noOverlap=await page.evaluate(()=>{
    const a=document.getElementById('navigationControls').getBoundingClientRect(),b=document.getElementById('targetCard').getBoundingClientRect();
    return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;
  });assert.ok(noOverlap,'Custom controls overlap interaction panel');
  await page.evaluate(()=>{window.__game.settings.centerButton='right';window.__game.applyCenterButtonLayout();});
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
  assert.equal(await page.evaluate(()=>window.__game.state.selected.name),'Neptune');
  assert.equal(await page.evaluate(()=>window.__game.state.followBody.id),'sol:Neptune');
  await page.evaluate(()=>{window.__game.state.warpUntil=0;window.__game.create(false);window.__game.frame(performance.now());});
  assert.equal(await page.evaluate(()=>window.__game.state.scene),'surface');
  await page.reload();await page.locator('#startGame').click();await page.locator('.load-save').first().click();
  await page.waitForFunction(()=>window.__game?.state.scene==='surface'&&window.__game.state.lastUI>0);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
  await page.screenshot({path:`.qa/${engine}-portrait.png`});
  const portraitPanel=await page.locator('#targetCard').boundingBox();
  assert.ok(844-portraitPanel.y-portraitPanel.height<=7&&390-portraitPanel.x-portraitPanel.width<=7);
  await page.evaluate(()=>{window.__game.launch();window.__game.frame(performance.now());});
  await page.screenshot({path:`.qa/${engine}-portrait-system.png`});
  await page.evaluate(()=>{window.__qaPause=true;});
  const stellar=await page.evaluate(async()=>{
    const {paintStellarSurface,stellarProminences}=await import('/stellar.js'),{makeSystem}=await import('/model.js');
    const body=makeSystem('sol').star,c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
    const render=(t,reduced=false)=>{ctx.clearRect(0,0,512,512);paintStellarSurface(ctx,body,256,256,170,t,234,reduced,512,512);return ctx.getImageData(0,0,512,512).data;};
    const a=render(0),b=render(5);let changing=0,dark=0,core=0;
    for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(Math.hypot(x-256,y-256)<150){const p=(y*512+x)*4;core++;if(Math.abs(a[p]-b[p])+Math.abs(a[p+1]-b[p+1])>15)changing++;if(b[p]<90&&b[p+1]<90)dark++;}
    if(changing/core<.2)throw new Error('Stellar surface is too static');
    // Use an actual eruption peak; do not depend on the launch-time phase.
    let peak=0,height=0;for(let t=0;t<60;t+=.25){const h=Math.max(...stellarProminences(body,t).map(p=>p.height));if(h>height){height=h;peak=t;}}
    const plume=render(peak);let outside=0;
    for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(Math.hypot(x-256,y-256)>170*1.08&&plume[(y*512+x)*4+3]>50)outside++;
    if(outside<30)throw new Error('Pixel flares are missing or too small');
    const still=render(0,true),later=render(60,true);if(!still.every((v,i)=>v===later[i]))throw new Error('Reduced-motion star changes');
    let spots=dark;for(const t of [15,30,45]){const frame=render(t);let count=0;for(let y=130;y<382;y++)for(let x=130;x<382;x++){const p=(y*512+x)*4;if(frame[p+3]>250&&frame[p]<90&&frame[p+1]<90)count++;}spots=Math.max(spots,count);}
    if(spots<5)throw new Error('Sunspots are not visible');
    render(peak);return {changingFraction:changing/core,spots,outside,peak,image:c.toDataURL()};
  });
  await writeFile(`.qa/${engine}-stellar-overhaul.png`,Buffer.from(stellar.image.split(',')[1],'base64'));delete stellar.image;
  const soak=await page.evaluate(async()=>{
    const g=window.__game,s=g.state,{makeSystem,bodyPosition}=await import('/model.js');
    const {stellarCacheStats}=await import('/stellar.js'),{celestialCacheStats}=await import('/celestial.js');
    const ctx=document.getElementById('sky').getContext('2d'),times=[],started=performance.now();
    for(let i=0;i<1200;i++){
      if(i%60===0){s.system=makeSystem('soak-'+i/60);s.save.currentSystem=s.system.seed;s.scene='system';s.selected=null;s.followBody=null;s.autopilot=null;}
      const nearStar=i%120<60;s.zoom=nearStar?.08:12;
      s.camera=nearStar?{x:0,y:0}:bodyPosition(s.system.planets[0],s.save.days,s.system);
      s.stellarSeconds=i/30;s.save.ship={x:s.camera.x+300,y:s.camera.y};
      const start=performance.now();g.backdrop(i*33);g.drawSystem(i*33);ctx.getImageData(0,0,1,1);times.push(performance.now()-start);
      if(i%10===0)await new Promise(r=>requestAnimationFrame(r));
    }
    times.sort((a,b)=>a-b);
    const stats={frames:1200,elapsedMs:performance.now()-started,p95Ms:times[1140],maxMs:times.at(-1),stellar:stellarCacheStats(),celestial:celestialCacheStats()};
    if(stats.p95Ms>250||stats.stellar.frames>4||stats.celestial.frames>160||stats.celestial.maps>48)throw new Error('Soak exceeded render/cache bounds '+JSON.stringify(stats));
    return stats;
  });
  assert.deepEqual(errors,[]);console.log(JSON.stringify({engine,startupMs,initial,reports:results,stellar,soak},null,2));
}finally{await browser.close();server.close();}
