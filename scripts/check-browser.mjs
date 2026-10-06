// Real browser regression gate. Test hooks exist only in the intercepted response.
import assert from 'node:assert/strict';
import {checkRelease112} from './check-release112.mjs';
import {checkRelease1121} from './check-release1121.mjs';
import {checkRelease1122} from './check-release1122.mjs';
import {checkRelease1123} from './check-release1123.mjs';
import {checkRelease1125} from './check-release1125.mjs';
import {checkRelease1126} from './check-release1126.mjs';
import {checkRelease1127} from './check-release1127.mjs';
import {checkRelease1124} from './check-release1124.mjs';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{playwright=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');}
const {chromium,webkit}=playwright;
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
const browser=await ({chromium,webkit}[engine]).launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH&&engine==='chromium'?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--no-zygote','--single-process','--disable-gpu']}: {})});
try{
  const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,serviceWorkers:'block'});
  page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('spacebitz:field:settings',JSON.stringify({music:false,paused:true,controls:'touch',resolution:'2',showCoords:true})));
  await page.route('**/main.js',async route=>{
    const response=await route.fetch();let source=await response.text();
    source=source.replaceAll('requestAnimationFrame(frame);','if(!globalThis.__qaPause)requestAnimationFrame(frame);');
    source=source.replace('}finally{ctx.restore();}',"}finally{ctx.restore();globalThis.__lastFrame={width:state.width,height:state.height,dpr:state.dpr,ship:state.save?screen(state.save.ship.x,state.save.ship.y):null,transform:ctx.getTransform().toString()};}");
    source+='\nwindow.__game={state,settings,frame,backdrop,drawSystem,drawChart,update,updateUI,create,start,select,showDetails,enterSystem,enterChart,enterSurface,drawGround,drawCoordinateGrid,nearbyStars,launch,closeModal,zoom,terrain,applyCenterButtonLayout,primary,cancelTravel,cancelTarget,positionContext,updateTerminal,focusSelected,applySettings};';
    await route.fulfill({response,body:source});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  assert.equal(await page.locator('#mainMenuStage #scientificMode').count(),0);
  await page.locator('#startGame').click();
  assert.equal(await page.locator('#scientificMode').isChecked(),true);
  assert.equal(await page.locator('#generationOptions').isVisible(),false);
  await page.locator('#scientificMode').uncheck();await page.locator('#generationOptions').click();await page.locator('#generationEditor select').selectOption('spectral');
  const m=page.locator('input[data-pool="spectral"][data-type="M"]'),k=page.locator('input[data-pool="spectral"][data-type="K"]');
  await m.fill('76.559869');assert.equal(await page.locator('#applyGeneration').isDisabled(),true);
  await k.fill('13.580001');assert.equal(await page.locator('#applyGeneration').isDisabled(),false);
  await k.fill('NaN');assert.equal(await page.locator('#applyGeneration').isDisabled(),true);
  await k.fill('13.580001');await page.screenshot({path:`.qa/${engine}-generation-editor.png`}).catch(()=>{});
  await page.locator('#applyGeneration').click();
  await page.reload();assert.equal(await page.locator('#scientificMode').isChecked(),false);
  await page.locator('#startGame').click();
  await page.locator('#scientificMode').check();
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
  assert.ok(initial.shipPixels>3,`Ship missing from the viewport centre on startup: ${JSON.stringify(initial)}`);
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
  assert.ok(controls.warp.width>controls.center.width&&controls.warp.height>controls.center.height);
  assert.ok(controls.warp.left>=0&&controls.warp.right<=844&&controls.warp.bottom<=390);
  assert.ok(controls.target.right<=844&&controls.target.bottom<=390&&controls.target.width<=430);
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
  await page.evaluate(async()=>{
    const {SHIP_FOCUS_ZOOM}=await import('/scale.js');
    const g=window.__game,s=g.state; s.followBody=null;s.centerReady=false;s.camera={x:0,y:0};s.zoom=.00001;
    const origin={...s.camera};document.getElementById('homeButton').click();
    if(s.camera.x!==origin.x||s.camera.y!==origin.y||s.zoom!==.00001||s.centerZoom?.centerAction!=='pan')throw new Error('Center must ease without changing zoom');
    g.update(650,0);if(s.zoom!==.00001||s.camera.x===origin.x&&s.camera.y===origin.y||s.camera.x===s.save.ship.x&&s.camera.y===s.save.ship.y)throw new Error('Center has no intermediate pan');
    g.update(650,0);if(s.zoom!==.00001||s.centerZoom||!s.centerReady||s.camera.x!==s.save.ship.x||s.camera.y!==s.save.ship.y)throw new Error('First Center changed zoom or failed to finish');
    document.getElementById('homeButton').click();g.update(650,0);if(!(s.zoom>.00001&&s.zoom<SHIP_FOCUS_ZOOM))throw new Error('Second Center has no intermediate zoom');
    g.update(650,0);if(Math.abs(s.zoom-SHIP_FOCUS_ZOOM)>1e-9||s.centerZoom)throw new Error('Second Center zoom did not finish');
    s.zoom=.001;document.getElementById('homeButton').click();document.getElementById('homeButton').click();g.zoom(.5);
    if(s.centerZoom||s.centerReady)throw new Error('Manual zoom did not reset Center');
    g.settings.reducedMotion=true;const z=s.zoom;document.getElementById('homeButton').click();
    if(s.zoom!==z||s.centerZoom||!s.centerReady)throw new Error('Reduced-motion first Center changed zoom');
    document.getElementById('homeButton').click();if(s.zoom!==SHIP_FOCUS_ZOOM||s.centerZoom)throw new Error('Reduced-motion second Center must zoom immediately');g.settings.reducedMotion=false;s.followShip=false;
    const earth=s.system.planets.find(p=>p.name==='Earth');g.showDetails(earth);
    g.updateTerminal(performance.now()+9000);
    if(!document.getElementById('terminalOutput').textContent.includes('12,742 km'))throw new Error('Diameter not kilometres');
    if(getComputedStyle(document.getElementById('targetCard')).backgroundColor!=='rgb(3, 17, 13)')throw new Error('World terminal is not opaque');
    g.enterSurface(earth);g.updateUI();
    if(!document.getElementById('mapButton').hidden||!document.getElementById('modeLabel').hidden)throw new Error('Surface still has warp/expedition label');
    g.showDetails(earth);g.updateTerminal(performance.now()+9000);const info=document.getElementById('terminalOutput');
    for(const fact of ['12,742 km','365.256 days','MOON COUNT','ROTATION'])if(!info.textContent.includes(fact))throw new Error('Missing terminal fact '+fact);
    s.zoom=.65;s.camera={x:999,y:999};document.getElementById('homeButton').click();
    if(s.camera.x!==999||s.centerZoom?.centerAction!=='pan')throw new Error('Surface Center snapped');
    g.update(1300,0);if(s.zoom!==.65||s.camera.x!==s.save.surface.x||!s.centerReady)throw new Error('Surface Center changed zoom');
    document.getElementById('homeButton').click();g.update(650,0);if(!(s.zoom>.65&&s.zoom<2.4))throw new Error('Surface second press has no intermediate zoom');
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
    const g=window.__game,s=g.state;s.followShip=false;g.launch();
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
    const travelCamera={...s.camera};
    for(let i=0;i<4000&&s.autopilot;i++){g.update(16,16);if(s.camera.x!==travelCamera.x||s.camera.y!==travelCamera.y||s.zoom!==manualZoom)throw new Error('Orbit Drive moved the camera');}
    if(s.autopilot||s.followBody?.id!==moon.id)throw new Error('Moon transfer never arrived');
    if(s.centerZoom)throw new Error('Arrival started an automatic camera animation');
    g.update(1300,1300);
    if(s.zoom!==manualZoom||s.centerZoom||s.camera.x!==travelCamera.x||s.camera.y!==travelCamera.y)throw new Error('Arrival changed the camera');
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
    const g=window.__game,s=g.state;s.followShip=false;g.launch();
    const {visualRadius}=await import('/model.js'),r=visualRadius(s.system.star.diameter);
    const camera={...s.camera},zoom=s.zoom;g.select(s.system.star);document.getElementById('primaryAction').click();
    if(s.autopilot?.type!=='stellar')throw new Error('Star travel unavailable');
    for(let i=0;i<3000&&s.autopilot;i++){
      g.update(16,0);if(Math.hypot(s.save.ship.x,s.save.ship.y)<r+38)throw new Error('Star approach entered the stellar disk');
    }
    if(s.autopilot||document.getElementById('primaryAction').textContent!=='HOLDING')throw new Error('Star travel did not arrive');
    const parked={...s.save.ship};g.update(1300,0);
    if(s.zoom!==zoom||s.centerZoom||s.camera.x!==camera.x||s.camera.y!==camera.y)throw new Error('Star arrival changed the camera');
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
      if(s.camera.x!==0||s.camera.y!==0||s.zoom!==.95)throw new Error('Departure changed the camera');
      let steps=0;
      while(s.autopilot&&steps++<7000){
        g.update(dt,dt);
        if(s.camera.x!==0||s.camera.y!==0||s.zoom!==.95)throw new Error('Far travel changed the camera');
      }
      if(s.autopilot||s.followBody?.id!==to.id)throw new Error('Long travel did not arrive');
      for(let i=0;i<82;i++){
        g.update(16,16);
        if(s.camera.x!==0||s.camera.y!==0||s.zoom!==.95)throw new Error('Arrival changed the camera');
      }
      if(s.centerZoom)throw new Error('Arrival started camera motion');
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
      if(s.centerZoom)throw new Error('Waypoint arrival started camera motion');
      g.update(1300,0);
      if(s.zoom!==(scene==='system'?.00001:.65)||s.camera.x!==p.x+100||s.camera.y!==p.y+100)throw new Error('Waypoint arrival changed the camera in '+scene);
    }
    // An explicit manual zoom remains in place after arrival.
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
    for(const name of ['Earth','Jupiter','Saturn','Uranus','Neptune','Pluto'])for(const zoom of [.85,12,128]){
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
  const giants=await page.evaluate(async()=>{
    const {makeSystem,bodyPosition,TAU}=await import('/model.js'),{celestialSprite}=await import('/celestial.js');
    const {ringSprites,paintRings}=await import('/giants.js'),{paintGiantAtmosphere}=await import('/weather.js');
    const sol=makeSystem('sol'),all=sol.planets.flatMap(p=>[p,...p.moons]);
    const preview=document.createElement('canvas');preview.width=1560;preview.height=960;
    const ctx=preview.getContext('2d');ctx.fillStyle='#040d14';ctx.fillRect(0,0,1560,960);ctx.imageSmoothingEnabled=false;
    ['Jupiter','Saturn','Uranus','Neptune','Pluto','Charon'].forEach((name,i)=>{
      const body=all.find(b=>b.name===name),x=i%3*520+260,y=Math.floor(i/3)*480+205,r=name==='Saturn'?100:name==='Uranus'?96:140;
      const rotation=name==='Jupiter'?.64:name==='Pluto'?.75:.5,days=(rotation-body.phase)/TAU*body.rotationDays,pos={x:-1,y:-1};
      const rings=ringSprites(body,pos);paintRings(ctx,rings,'back',x,y,r,1560,960);
      if(body.atmosphere)paintGiantAtmosphere(ctx,body,x,y,r,12,days,pos,false,1560,960);
      else ctx.drawImage(celestialSprite(body,days,pos),x-r,y-r,r*2,r*2);
      paintRings(ctx,rings,'front',x,y,r,1560,960);
      ctx.font='18px SpaceBitzPixel, monospace';ctx.textAlign='center';ctx.fillStyle='#a3e6df';ctx.fillText(name.toUpperCase(),x,y+210);
    });
    const g=window.__game,s=g.state,visited=[];
    s.system=sol;s.save.currentSystem='sol';
    for(const name of ['Tethys','Dione','Rhea','Iapetus','Ariel','Umbriel','Titania','Oberon','Pluto','Charon']){
      const body=all.find(b=>b.name===name);g.select(body);g.showDetails(body);
      if(!(g.updateTerminal(performance.now()+9000),document.getElementById('terminalOutput').textContent).includes(Math.round(body.diameter).toLocaleString('en-US')))throw new Error('Missing factual diameter for '+name);
      g.closeModal();g.enterSurface(body);if(s.save.landed!==body.id)throw new Error('Cannot land on '+name);
      g.backdrop(1000);g.drawGround(1000);g.launch();
      if(s.scene!=='system'||s.selected.id!==body.id||s.followBody.id!==body.id)throw new Error('Cannot launch beside '+name);
      const p=bodyPosition(body,s.save.days,sol);if(!Number.isFinite(p.x+p.y))throw new Error('Invalid orbit for '+name);
      visited.push(name);
    }
    s.scene='system';s.save.scene='system';s.save.landed=null;s.selected=sol.star;s.camera={x:0,y:0};s.zoom=.1;s.followBody=null;s.centerZoom=null;
    s.save.ship={x:sol.star.diameter*.02,y:0};g.updateUI();
    return {image:preview.toDataURL(),visited};
  });
  await writeFile(`.qa/${engine}-giant-planets.png`,Buffer.from(giants.image.split(',')[1],'base64'));delete giants.image;
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
  // This save/portrait fixture needs a landable home. Random new universes can
  // legitimately be barren; that startup/entry path has separate coverage below.
  await page.evaluate(()=>{document.getElementById('universeSeed').value='browser-start-2';window.__game.state.warpUntil=0;window.__game.create(false);window.__game.frame(performance.now());});
  assert.equal(await page.evaluate(()=>window.__game.state.scene),'surface');
  await page.reload();await page.locator('#startGame').click();await page.locator('.load-save').first().click();
  await page.waitForFunction(()=>window.__game?.state.scene==='surface'&&window.__game.state.lastUI>0);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
  await page.screenshot({path:`.qa/${engine}-portrait.png`});
  await page.evaluate(()=>{const g=window.__game;g.select({id:'lander',name:'Lander',kind:'lander',x:0,y:0});});
  const portraitPanel=await page.locator('#targetCard').boundingBox();
  assert.ok(portraitPanel.y>=0&&portraitPanel.y+portraitPanel.height<=844&&portraitPanel.x+portraitPanel.width<=390);
  await page.evaluate(()=>{window.__game.launch();window.__game.frame(performance.now());});
  await page.screenshot({path:`.qa/${engine}-portrait-system.png`});
  await page.evaluate(()=>{window.__qaPause=true;});
  const starsV2=await page.evaluate(async()=>{
    const g=window.__game,s=g.state,{defaults}=await import('/universe.js'),{makeSystem,bodyPosition,visualRadius}=await import('/model.js');
    const reports=[],montage=document.createElement('canvas');montage.width=1000;montage.height=750;const out=montage.getContext('2d');
    const types=['main','subgiant','giant','agb','supergiant','lbv','wr','wd','ns','pulsar','magnetar','brown'];
    for(const [index,type]of types.entries()){
      const config=defaults(false);for(const k of Object.keys(config.pools.family))config.pools.family[k]=k===(['pulsar','magnetar'].includes(type)?'ns':type)?100:0;for(const k of Object.keys(config.pools.speculative))config.pools.speculative[k]=k==='ordinary'?100:0;
      for(const k of Object.keys(config.pools.multiplicity))config.pools.multiplicity[k]=k==='triple'?100:0;
      if(['ns','pulsar','magnetar'].includes(type))for(const k of Object.keys(config.pools.neutron))config.pools.neutron[k]=k===(type==='ns'?'ordinary':type)?100:0;
      const system=makeSystem('browser-v2-'+type,config);s.system=system;s.save.generation=config;s.save.currentSystem=system.seed;s.scene='system';s.followBody=null;s.autopilot=null;s.centerZoom=null;s.focusBody=null;s.selected=system.star;s.panUntil=Infinity;
      const position=bodyPosition(system.star,s.save.days,system);s.camera={...position};s.save.ship={x:position.x+visualRadius(system.star.diameter)*1.2+150,y:position.y};s.zoom=100/visualRadius(system.star.diameter);
      g.updateUI();s.stellarSeconds=24;g.backdrop(1000);g.drawSystem(1000);
      // Freeze each frame's pixels before the source canvas is repainted.
      // WebKit can defer canvas-to-canvas copies until the montage is exported.
      const c=document.getElementById('sky'),tile=document.createElement('canvas');tile.width=tile.height=460;
      tile.getContext('2d').putImageData(c.getContext('2d').getImageData(Math.round(c.width/2)-230,Math.round(c.height/2)-230,460,460),0,0);
      out.drawImage(tile,0,0,460,460,index%4*250,Math.floor(index/4)*250,250,250);out.fillStyle='#8ee9d4';out.font='12px monospace';out.fillText(system.star.familyLabel.slice(0,31),index%4*250+8,Math.floor(index/4)*250+238);
      g.showDetails(system.star);g.updateTerminal(performance.now()+9000);const panel=document.getElementById('targetCard');
      if(getComputedStyle(panel).backgroundColor!=='rgb(3, 17, 13)')throw Error('Star terminal not opaque');
      if(!document.getElementById('focusSelected')||!panel.textContent.includes('DISTANCE FROM SHIP')||!panel.textContent.includes(system.star.familyLabel))throw Error('Missing terminal facts/focus');
      if(panel.querySelector('details'))throw Error('Old expandable facts remain');
      g.closeModal();g.select(system.stars[1]);g.primary();for(let i=0;i<5000&&s.autopilot;i++)g.update(100,0);if(s.autopilot)throw Error('Companion travel never arrives: '+type);
      const parked=bodyPosition(system.stars[1],s.save.days,system);if(Math.hypot(s.save.ship.x-parked.x,s.save.ship.y-parked.y)<visualRadius(system.stars[1].diameter))throw Error('Companion arrival inside star');
      reports.push({family:type,temperature:system.star.temperature,diameter:system.star.diameter,stars:system.stars.length,planets:system.planets.length});
    }
    return {reports,image:montage.toDataURL()};
  });
  await writeFile(`.qa/${engine}-stellar-catalogue.png`,Buffer.from(starsV2.image.split(',')[1],'base64'));delete starsV2.image;
  await page.evaluate(()=>window.__game.showDetails(window.__game.state.system.star));
  await page.screenshot({path:`.qa/${engine}-stellar-info-portrait.png`});
  const overflow=await page.locator('#targetCard').evaluate(e=>e.scrollWidth>e.clientWidth);assert.equal(overflow,false);
  await page.evaluate(()=>window.__game.closeModal());await page.locator('#journalButton').click();
  assert.equal(await page.locator('.modal-card').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(16, 30, 50)');await page.evaluate(()=>window.__game.closeModal());
  const v2Soak=await page.evaluate(async()=>{
    const g=window.__game,s=g.state,{defaults}=await import('/universe.js'),{makeSystem,bodyPosition,visualRadius}=await import('/model.js'),{stellarCacheStats}=await import('/stellar.js');
    const times=[];for(let i=0;i<360;i++){
      if(i%60===0){const c=defaults(false),family=['main','giant','agb','wr','wd','ns'][i/60];for(const k of Object.keys(c.pools.family))c.pools.family[k]=k===family?100:0;for(const k of Object.keys(c.pools.neutron))c.pools.neutron[k]=k==='magnetar'?100:0;for(const k of Object.keys(c.pools.multiplicity))c.pools.multiplicity[k]=k==='quad'?100:0;s.system=makeSystem('v3-soak-'+i,c);s.save.generation=c;s.save.currentSystem=s.system.seed;s.selected=null;s.scene='system';}
      const p=bodyPosition(s.system.star,s.save.days,s.system);s.camera=p;s.zoom=100/visualRadius(s.system.star.diameter);s.stellarSeconds=i/30;const begin=performance.now();g.backdrop(i*33);g.drawSystem(i*33);times.push(performance.now()-begin);if(i%12===0)await new Promise(r=>requestAnimationFrame(r));
    }
    g.enterChart();for(let i=0;i<30;i++){s.camera={x:i*300,y:i*200};g.backdrop(1000);g.drawChart(1000);}
    g.showDetails(s.selected);g.closeModal();
    times.sort((a,b)=>a-b);const stats={frames:times.length,p95Ms:times[Math.floor(times.length*.95)],cache:stellarCacheStats()};if(stats.cache.frames>4||stats.p95Ms>250)throw Error('v2 stellar performance limit exceeded '+JSON.stringify(stats));return stats;
  });
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
  const weather=await page.evaluate(async()=>{
    const {makeSystem,TAU}=await import('/model.js'),{paintGiantAtmosphere,giantWeatherCacheStats}=await import('/weather.js');
    const sol=makeSystem('sol'),c=document.createElement('canvas');c.width=c.height=320;const ctx=c.getContext('2d');
    const montage=document.createElement('canvas');montage.width=1280;montage.height=1280;const m=montage.getContext('2d');
    m.fillStyle='#040d14';m.fillRect(0,0,1280,1280);m.imageSmoothingEnabled=false;
    const delta=(a,b)=>{
      let sum=0,changing=0,count=0;
      for(let y=0;y<320;y++)for(let x=0;x<320;x++)if(Math.hypot(x-160,y-160)<118){
        const p=(y*320+x)*4,d=Math.abs(a[p]-b[p])+Math.abs(a[p+1]-b[p+1])+Math.abs(a[p+2]-b[p+2]);
        sum+=d;changing+=d>6;count++;
      }
      return {mean:sum/count/3,fraction:changing/count};
    };
    const reports=[];
    for(const [row,name] of ['Jupiter','Saturn','Uranus','Neptune'].entries()){
      const body=sol.planets.find(b=>b.name===name),days=(.64-body.phase)/TAU*body.rotationDays;
      const render=(t,reduced=false,d=days)=>{
        ctx.clearRect(0,0,320,320);paintGiantAtmosphere(ctx,body,160,160,130,t,d,{x:-1,y:-1},reduced,320,320);
        return ctx.getImageData(0,0,320,320).data;
      };
      const activity=delta(render(0),render(8));
      if(activity.mean<.6||activity.fraction<.08)throw new Error('Giant winds are too static '+name+' '+JSON.stringify(activity));
      let continuity=0;
      for(const t of [8,18,36,72])continuity=Math.max(continuity,delta(render(t-.002),render(t+.002)).mean);
      if(continuity>1)throw new Error('Giant clouds snap at keyframe/material reset '+name);
      const still=render(0,true),later=render(180,true,days+3);
      if(!still.every((v,i)=>v===later[i]))throw new Error('Reduced-motion giant changes '+name);
      if(still[3]||still[(160*320+160)*4+3]<254)throw new Error('Giant disk opacity/clipping failed '+name);
      for(const [col,t] of [0,8,20,40].entries()){
        render(t);m.drawImage(c,col*320,row*320);m.font='16px SpaceBitzPixel, monospace';m.textAlign='center';m.fillStyle='#a3e6df';
        m.fillText(name.toUpperCase()+' / '+t+'s',col*320+160,row*320+310);
      }
      reports.push({name,activity,continuity});
    }
    // Exercise both raster levels and eviction across more than six worlds.
    for(let seed=0;seed<16;seed++)for(const body of makeSystem('weather-cache-'+seed).planets.filter(p=>p.atmosphere)){
      for(const r of [25,130]){ctx.clearRect(0,0,320,320);paintGiantAtmosphere(ctx,body,160,160,r,45,123,{x:-1,y:-1});}
    }
    const caches=giantWeatherCacheStats();if(Object.values(caches).some(n=>n>6))throw new Error('Giant weather cache grew '+JSON.stringify(caches));
    return {reports,caches,image:montage.toDataURL()};
  });
  await writeFile(`.qa/${engine}-giant-weather.png`,Buffer.from(weather.image.split(',')[1],'base64'));delete weather.image;
  const soak=await page.evaluate(async()=>{
    const g=window.__game,s=g.state,{makeSystem,bodyPosition}=await import('/model.js');
    const {stellarCacheStats}=await import('/stellar.js'),{celestialCacheStats}=await import('/celestial.js'),{ringCacheStats}=await import('/giants.js'),{giantWeatherCacheStats}=await import('/weather.js');
    const ctx=document.getElementById('sky').getContext('2d'),times=[],started=performance.now();
    for(let i=0;i<1200;i++){
      if(i%60===0){s.system=makeSystem('soak-'+i/60);s.save.currentSystem=s.system.seed;s.scene='system';s.selected=null;s.followBody=null;s.autopilot=null;}
      const nearStar=i%120<60;s.zoom=nearStar?.08:12;
      const giant=s.system.planets.find(p=>p.atmosphere)||s.system.planets[0];
      s.camera=nearStar?{x:0,y:0}:bodyPosition(giant,s.save.days,s.system);
      s.stellarSeconds=i/30;s.save.ship={x:s.camera.x+300,y:s.camera.y};
      const start=performance.now();g.backdrop(i*33);g.drawSystem(i*33);ctx.getImageData(0,0,1,1);times.push(performance.now()-start);
      if(i%10===0)await new Promise(r=>requestAnimationFrame(r));
    }
    times.sort((a,b)=>a-b);
    const stats={frames:1200,elapsedMs:performance.now()-started,p95Ms:times[1140],maxMs:times.at(-1),stellar:stellarCacheStats(),celestial:celestialCacheStats(),rings:ringCacheStats(),weather:giantWeatherCacheStats()};
    if(stats.p95Ms>250||stats.stellar.frames>4||stats.celestial.frames>160||stats.celestial.maps>48||stats.rings.frames>24||Object.values(stats.weather).some(n=>n>6))throw new Error('Soak exceeded render/cache bounds '+JSON.stringify(stats));
    return stats;
  });
  const barren=await page.evaluate(async()=>{
    const g=window.__game,{defaults}=await import('/universe.js'),{makeSystem}=await import('/model.js'),generation=defaults(false);for(const k of Object.keys(generation.pools.family))generation.pools.family[k]=k==='wd'?100:0;for(const k of Object.keys(generation.pools.multiplicity))generation.pools.multiplicity[k]=k==='single'?100:0;
    let seed,system;for(let i=0;i<50;i++){seed='barren-'+i;system=makeSystem(seed,generation);if(!system.planets.length)break;}if(system.planets.length)throw Error('No barren fixture');
    const save={...g.state.save,generation,currentSystem:seed,scene:'system',landed:null,homePlanet:null};g.start(save);g.enterSystem({seed,x:0,y:0});g.drawSystem(0);g.showDetails(system.star);g.closeModal();if(g.state.save.ship.x!==g.state.camera.x)throw Error('Barren entry not centered');return {seed,scene:g.state.scene};
  });
  const release112=await checkRelease112(page,engine);
  const release1121=await checkRelease1121(page,engine);
  const release1124=await checkRelease1124(page,engine);
  const release1122=await checkRelease1122(page,engine);
  const release1123=await checkRelease1123(page,engine);
  const release1125=await checkRelease1125(page,engine);
  const release1126=await checkRelease1126(page,engine);
  const release1127=await checkRelease1127(page,engine);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({engine,startupMs,initial,release112,release1121,release1122,release1123,release1124,release1125,release1126,release1127,reports:results,giants,stellar,starsV2,v2Soak,barren,weather,soak},null,2));
}finally{await browser.close();server.close();}
