import assert from 'node:assert/strict';

async function checkTracking(page){
  await page.setViewportSize({width:844,height:390});
  const tracking=await page.evaluate(async()=>{
    const g=window.__game,s=g.state,{makeSystem,bodyPosition}=await import('/model.js');
    globalThis.__qaPause=true;g.cancelTarget();s.system=makeSystem('sol');s.scene='system';s.save.currentSystem=s.save.homeSeed='sol';
    s.keys.clear();s.joy={x:0,y:0};s.focusBody=s.centerZoom=s.followBody=s.autopilot=null;s.followShip=false;s.centerReady=false;
    g.settings.reducedMotion=false;g.settings.paused=false;g.settings.timeMode='accelerated';g.settings.centerButton='right';g.applySettings();
    const earth=s.system.planets.find(p=>p.name==='Earth'),p=bodyPosition(earth,s.save.days,s.system);
    s.save.ship={x:p.x+100,y:p.y};s.followBody={id:earth.id,x:100,y:0};s.camera={x:p.x+2000,y:p.y-2000};s.zoom=.01;
    document.getElementById('homeButton').click();g.update(1300,1300);
    if(s.zoom!==.01||s.followShip||!s.centerReady)throw Error('First Center must preserve zoom and leave following off');
    document.getElementById('homeButton').click();g.update(650,650);if(s.followShip)throw Error('Following started before the second zoom finished');g.update(650,650);
    if(!s.followShip||s.centerReady)throw Error('Second Center did not enable following');
    const before=s.save.ship.x,z=s.zoom;g.update(2000,2000);
    if(s.save.ship.x===before||s.camera.x!==s.save.ship.x||s.camera.y!==s.save.ship.y||s.zoom!==z)throw Error('Camera did not follow orbital station keeping');
    g.updateUI();if(document.getElementById('followShipButton').getAttribute('aria-pressed')!=='true')throw Error('Follow state not shown');
    document.getElementById('followShipButton').click();const stopped=JSON.stringify(s.camera);g.update(2000,2000);
    if(s.followShip||JSON.stringify(s.camera)!==stopped)throw Error('Follow off did not freeze the camera');
    document.getElementById('followShipButton').click();g.update(650,650);
    if(s.zoom!==z||s.followShip||!s.centerZoom)throw Error('Follow toggle changed zoom or skipped easing');g.update(650,650);g.update(500,500);
    if(!s.followShip||s.camera.x!==s.save.ship.x||s.zoom!==z)throw Error('Follow toggle failed to enable at the current zoom');
    g.zoom(.9);const zoomed=JSON.stringify(s.camera);g.update(500,500);
    if(!s.followShip||s.camera.x!==s.save.ship.x||s.camera.y!==s.save.ship.y)throw Error('Zoom stopped following');document.getElementById('followShipButton').click();
    g.settings.reducedMotion=true;g.applySettings();document.getElementById('followShipButton').click();
    if(!s.followShip||s.centerZoom||s.camera.x!==s.save.ship.x)throw Error('Reduced-motion follow is not immediate');
    document.getElementById('followShipButton').click();g.settings.reducedMotion=false;g.settings.paused=true;g.applySettings();
    return {orbitMoves:true,secondCenterFollows:true,togglePreservesZoom:true,manualOverride:true,reduced:true};
  });
  await page.waitForTimeout(350);
  const controls=await page.evaluate(()=>{
    const rect=id=>document.getElementById(id).getBoundingClientRect(),c=rect('homeButton'),w=rect('mapButton'),f=rect('followShipButton');
    return {center:c.toJSON(),warp:w.toJSON(),follow:f.toJSON(),centered:Math.abs((f.left+f.right-c.left-c.right)/2)};
  });
  assert.ok(controls.follow.left>=controls.center.right&&controls.follow.width===controls.center.width&&controls.follow.height===controls.center.height&&controls.follow.bottom<=390,JSON.stringify(controls));
  assert.equal(controls.follow.left-controls.center.right,6);assert.ok(controls.warp.bottom<=390&&controls.warp.left>=0);
  const immediate=await page.evaluate(()=>{
    const g=window.__game;g.select(g.state.system.star);g.positionContext();const row=document.querySelector('.context-action-row'),s=getComputedStyle(row);
    return {ready:document.getElementById('contextActions').classList.contains('ready'),delay:s.transitionDelay,duration:s.transitionDuration,offset:new DOMMatrix(s.transform).m42};
  });
  assert.ok(immediate.ready&&immediate.delay.split(',').every(v=>parseFloat(v)===0)&&immediate.duration.includes('0.55s')&&immediate.offset>0,JSON.stringify(immediate));
  await page.waitForTimeout(180);const middle=await page.locator('.context-action-row').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42);
  assert.ok(middle>0&&middle<immediate.offset,'Action glide finished too quickly');await page.waitForTimeout(450);
  await page.locator('.context-action-row').evaluate(e=>{for(const a of e.getAnimations())if(Number.isFinite(a.effect.getComputedTiming().endTime))a.finish();});
  assert.equal(await page.locator('.context-action-row').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42),0);
  await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.updateUI();});await page.waitForTimeout(350);
  assert.equal(await page.locator('#targetCard').isVisible(),false);
  await page.locator('#terminalButton').click();await page.waitForTimeout(350);
  const standalone=await page.evaluate(()=>{
    const g=window.__game;g.updateTerminal(g.state.terminal.start+12000);const card=document.getElementById('targetCard'),log=document.getElementById('journalButton').getBoundingClientRect(),launcher=document.getElementById('terminalButton').getBoundingClientRect();
    return {name:document.getElementById('targetName').textContent,selected:g.state.selected,waypoint:g.state.waypoint,contextHidden:document.getElementById('contextActions').hidden,focusHidden:document.getElementById('focusSelected').hidden,expanded:card.classList.contains('expanded'),text:document.getElementById('terminalOutput').textContent,logLeft:log.left,launcherHidden:getComputedStyle(document.getElementById('terminalButton')).visibility==='hidden',warpLeft:document.getElementById('mapButton').getBoundingClientRect().left,logBottom:log.bottom};
  });
  assert.ok(standalone.expanded&&!standalone.selected&&!standalone.waypoint&&standalone.contextHidden&&standalone.focusHidden&&standalone.text.includes('READY')&&standalone.launcherHidden&&standalone.logLeft>standalone.warpLeft&&standalone.logBottom<=386,JSON.stringify(standalone));
  assert.equal(await page.locator('#secondaryAction').textContent(),'Close Terminal');
  await page.locator('#secondaryAction').click();await page.waitForTimeout(350);assert.equal(await page.locator('#targetCard').isVisible(),false);
  return {tracking,controls,immediate,standalone};
}

async function checkInput(page,engine){
  await page.setViewportSize({width:1440,height:900});
  await page.evaluate(async()=>{
    const g=window.__game,s=g.state,{makeSystem,bodyPosition}=await import('/model.js');
    globalThis.__qaPause=true;g.cancelTarget();s.scene='system';s.system=makeSystem('sol');s.save.currentSystem=s.save.homeSeed='sol';
    s.keys.clear();s.joy={x:0,y:0};s.centerZoom=s.focusBody=s.followBody=s.autopilot=null;s.followShip=true;s.followPanRemaining=0;s.centerReady=false;
    g.settings.reducedMotion=false;g.settings.paused=false;g.settings.timeMode='accelerated';g.settings.controls='touch';g.settings.centerButton='right';
    const earth=s.system.planets.find(p=>p.name==='Earth'),p=bodyPosition(earth,s.save.days,s.system);
    s.save.ship={x:p.x+100,y:p.y};s.followBody={id:earth.id,x:100,y:0};s.camera={...s.save.ship};s.zoom=.8;
    g.applySettings();g.select(earth);
  });await page.waitForTimeout(400);
  const anchors=await page.evaluate(async()=>{
    const g=window.__game,s=g.state,{bodyPosition}=await import('/model.js'),element=document.getElementById('contextActions'),offsets=[];
    for(let i=0;i<30;i++){
      g.update(16,16);g.positionContext();const r=element.getBoundingClientRect(),p=bodyPosition(s.selected,s.save.days,s.system);
      offsets.push([r.x-(s.width/2+(p.x-s.camera.x)*s.zoom),r.y-(s.height/2+(p.y-s.camera.y)*s.zoom)]);
    }
    const deviation=Math.max(...offsets.map(o=>Math.hypot(o[0]-offsets[0][0],o[1]-offsets[0][1])));
    if(deviation>.1)throw Error('Moving target anchor jitter '+deviation);
    if(getComputedStyle(element).transitionDuration!=='0s')throw Error('Target overlay still lags the object');
    g.zoom(.7);g.update(500,500);if(!s.followShip||s.camera.x!==s.save.ship.x||s.camera.y!==s.save.ship.y)throw Error('Zoom disabled Follow');
    return {deviation,zoom:s.zoom,following:s.followShip};
  });
  await page.mouse.move(1000,220);await page.mouse.wheel(0,300);await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>window.__game.state.followShip),true,'Wheel zoom disabled Follow');
  // Drag with real input; the last move restarts the entire inspection window.
  await page.mouse.move(1000,220);await page.mouse.down();await page.mouse.move(1080,250,{steps:4});await page.mouse.up();
  const inspection=await page.evaluate(()=>{
    const g=window.__game,s=g.state,panned={...s.camera},z=s.zoom;
    if(!s.followShip||s.followPanRemaining!==2000)throw Error('Pan switched Follow off');
    g.update(1900,0);if(s.camera.x!==panned.x||s.camera.y!==panned.y||s.followPanRemaining!==100)throw Error('Follow returned early');
    return {panned,z};
  });
  await page.mouse.move(1000,220);await page.mouse.down();await page.mouse.move(1030,245);await page.mouse.up();
  const resume=await page.evaluate(()=>{
    const g=window.__game,s=g.state,from={...s.camera},z=s.zoom;
    g.update(1999,0);if(s.followPanRemaining!==1||s.camera.x!==from.x)throw Error('Last pan did not reset timeout');
    g.update(1,0);if(s.centerZoom?.centerAction!=='resume'||s.camera.x!==from.x)throw Error('Return skipped easing');
    g.update(650,0);if(s.camera.x===from.x||s.camera.x===s.save.ship.x||s.zoom!==z)throw Error('Return was not fluid at the current zoom');
    g.update(650,0);g.update(500,500);if(!s.followShip||s.camera.x!==s.save.ship.x||s.camera.y!==s.save.ship.y||s.zoom!==z)throw Error('Follow did not resume');
    document.getElementById('followShipButton').click();const stopped={...s.camera};g.update(10000,10000);
    if(s.followShip||s.camera.x!==stopped.x||s.camera.y!==stopped.y)throw Error('Explicit Follow off was ignored');
    g.settings.paused=true;g.cancelTarget();g.applySettings();return {lastPanResets:true,easing:true,zoom:z,offFreezes:true};
  });await page.waitForTimeout(400);
  const deck=await page.evaluate(()=>{
    const base=document.getElementById('dashboardBase').getBoundingClientRect();return {x:innerWidth/2,y:base.top+12};
  });await page.mouse.click(deck.x,deck.y);
  assert.equal(await page.evaluate(()=>Boolean(window.__game.state.selected||window.__game.state.waypoint)),false,'Dashboard tap selected space');
  await page.evaluate(()=>{const g=window.__game;g.settings.centerButton='custom';g.settings.centerX=72;g.settings.centerY=22;g.applyCenterButtonLayout();});await page.waitForTimeout(150);
  assert.equal(await page.locator('.dashboard-controls').count(),0,'Separate control plates remain');
  await page.mouse.click(700,250);await page.mouse.click(700,250);assert.equal(await page.evaluate(()=>Boolean(window.__game.state.selected||window.__game.state.waypoint)),true,'The dashboard blocked the open scene');
  await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.settings.centerButton='right';g.applyCenterButtonLayout();});await page.waitForTimeout(350);
  await page.locator('#terminalButton').click();await page.waitForTimeout(400);await page.locator('#terminalInput').focus();await page.waitForTimeout(400);
  for(const mode of ['Shift','CapsLock'])if(await page.locator(`[data-key="${mode}"]`).getAttribute('aria-pressed')==='true')await page.locator(`[data-key="${mode}"]`).click();
  await page.locator('[data-key="Clear"]').click();
  await page.locator('[data-key="CapsLock"]').click();await page.locator('[data-key="A"]').click();assert.equal(await page.locator('#terminalInput').inputValue(),'A');
  await page.locator('[data-key="Shift"]').click();await page.locator('[data-key="Q"]').click();await page.locator('[data-key="/"]').click();assert.equal(await page.locator('#terminalInput').inputValue(),'A!/');await page.screenshot({path:`.qa/${engine}-1125-symbols.png`});
  await page.locator('#terminalDelete').click();assert.equal(await page.locator('#terminalInput').inputValue(),'A!');
  await page.locator('[data-key="Shift"]').click();await page.locator('[data-key="CapsLock"]').click();await page.locator('[data-key="Clear"]').click();
  const fast=await page.evaluate(()=>{
    const key=document.querySelector('[data-key="A"]');
    for(let i=0;i<24;i++){key.dispatchEvent(new PointerEvent('pointerdown',{pointerId:800+i,button:0,bubbles:true}));key.dispatchEvent(new PointerEvent('pointerup',{pointerId:800+i,bubbles:true}));}
    return document.getElementById('terminalInput').value;
  });assert.equal(fast,'a'.repeat(24),'Rapid key presses lost or doubled text');
  const key=await page.locator('[data-key="B"]').boundingBox();await page.mouse.move(key.x+key.width/2,key.y+key.height/2);await page.mouse.down();await page.waitForTimeout(470);await page.mouse.up();
  const held=await page.locator('#terminalInput').inputValue();assert.ok(held.endsWith('bb'),'Holding a key did not repeat');await page.waitForTimeout(150);assert.equal(await page.locator('#terminalInput').inputValue(),held,'Released key kept repeating');
  const keyboard=await page.evaluate(()=>{
    const r=e=>e.getBoundingClientRect(),a=r(document.querySelector('[data-key="A"]')),caps=r(document.querySelector('[data-key="CapsLock"]')),l=r(document.querySelector('[data-key="L"]')),slash=r(document.querySelector('[data-key="/"]')),del=r(document.getElementById('terminalDelete')),bar=r(document.getElementById('terminalInputBar'));
    return {capsAlign:Math.abs(caps.left-a.left),slashAlign:Math.abs(slash.left-l.left),deleteRight:Math.abs(del.right-bar.right),cursor:getComputedStyle(document.getElementById('terminalInputCaret')).animationName,cursorVisible:!document.getElementById('terminalInputCaret').hidden};
  });assert.ok(keyboard.capsAlign<1&&keyboard.slashAlign<1&&keyboard.deleteRight<1&&keyboard.cursor==='terminal-blink'&&keyboard.cursorVisible,JSON.stringify(keyboard));
  await page.locator('[data-key="Enter"]').click();
  await page.evaluate(()=>{const g=window.__game;g.settings.terminalResizeHandles=true;g.updateUI();});
  const before=await page.locator('#targetCard').boundingBox(),left=await page.locator('#terminalResizeLeft').boundingBox();
  await page.mouse.move(left.x+left.width/2,left.y+left.height/2);await page.mouse.down();await page.mouse.move(left.x+left.width/2-90,left.y+left.height/2,{steps:6});await page.mouse.up();await page.waitForTimeout(400);
  const wider=await page.locator('#targetCard').boundingBox();assert.ok(Math.abs(wider.width-before.width-90)<2,'Width handle did not widen');
  const nextLeft=await page.locator('#terminalResizeLeft').boundingBox();await page.mouse.move(nextLeft.x+nextLeft.width/2,nextLeft.y+nextLeft.height/2);await page.mouse.down();await page.mouse.move(nextLeft.x+nextLeft.width/2+90,nextLeft.y+nextLeft.height/2,{steps:6});await page.mouse.up();await page.waitForTimeout(400);
  const narrower=await page.locator('#targetCard').boundingBox();assert.ok(Math.abs(narrower.width-before.width)<2,'Width handle did not return to the minimum');
  const top=await page.locator('#terminalResizeTop').boundingBox();await page.mouse.move(top.x+top.width/2,top.y+top.height/2);await page.mouse.down();await page.mouse.move(top.x+top.width/2,top.y+top.height/2+90,{steps:6});await page.mouse.up();await page.waitForTimeout(400);
  const shorter=await page.locator('#targetCard').boundingBox();assert.ok(Math.abs(shorter.height-narrower.height+90)<2,'Height handle did not slide');
  await page.evaluate(()=>{const g=window.__game;g.cancelTarget();Object.assign(g.settings,{terminalResizeHandles:false,terminalWidthScale:100,terminalHeightScale:100});g.state.terminalSize=null;g.applySettings();});
  return {anchors,resume,keyboard,rapidKeys:24};
}

async function checkCoordinates(page){
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{
    const g=window.__game;g.cancelTarget();g.state.scene='system';g.state.camera={x:1e7,y:1e7};g.state.save.ship={...g.state.camera};g.state.zoom=.1;g.updateUI();
  });await page.waitForTimeout(350);
  const picked=()=>page.evaluate(()=>Boolean(window.__game.state.waypoint));
  await page.mouse.click(350,160);assert.equal(await picked(),false,'One space tap selected a coordinate');
  assert.equal(await page.locator('#targetCard').isVisible(),false,'First tap opened terminal');
  const hover=await page.evaluate(()=>{
    const g=window.__game,ctx=document.getElementById('sky').getContext('2d'),stroke=ctx.stroke,fill=ctx.fillRect;let strokes=0,fills=0;
    ctx.stroke=function(...a){strokes++;return stroke.apply(this,a);};ctx.fillRect=function(...a){fills++;return fill.apply(this,a);};
    try{g.drawCoordinateGrid();return {strokes,fills};}finally{ctx.stroke=stroke;ctx.fillRect=fill;}
  });assert.deepEqual(hover,{strokes:0,fills:0});
  await page.mouse.click(350,160);assert.equal(await picked(),true,'Second space tap did not select');
  const frame=await page.evaluate(()=>{
    const g=window.__game,ctx=document.getElementById('sky').getContext('2d'),stroke=ctx.stroke,fill=ctx.fillRect;let strokes=0,fills=0;
    ctx.stroke=function(...a){strokes++;return stroke.apply(this,a);};ctx.fillRect=function(...a){fills++;return fill.apply(this,a);};
    try{g.drawCoordinateGrid();return {strokes,fills};}finally{ctx.stroke=stroke;ctx.fillRect=fill;}
  });assert.ok(frame.strokes>=2&&frame.fills===0,JSON.stringify(frame));
  await page.evaluate(()=>window.__game.cancelTarget());
  await page.touchscreen.tap(350,160);assert.equal(await picked(),false,'One touch selected a coordinate');
  await page.touchscreen.tap(350,160);assert.equal(await picked(),true,'Touch release cleared the first tap');
  await page.evaluate(()=>window.__game.cancelTarget());
  await page.mouse.click(350,160);await page.mouse.click(410,160);assert.equal(await picked(),false,'Separate taps confirmed a coordinate');
  await page.evaluate(()=>{window.__game.state.coordinateTap.time-=600;});await page.mouse.click(410,160);assert.equal(await picked(),false,'Expired tap confirmed a coordinate');
  await page.evaluate(()=>window.__game.zoom(1.1));await page.mouse.click(410,160);assert.equal(await picked(),false,'Zoom retained a pending tap');
  await page.mouse.move(410,160);await page.mouse.down();await page.mouse.move(430,170);await page.mouse.up();await page.mouse.click(430,170);assert.equal(await picked(),false,'Pan retained a pending tap');
  await page.evaluate(()=>window.__game.cancelTarget());
  const deck=await page.locator('#dashboardBase').boundingBox();await page.mouse.click(600,deck.y+8);await page.mouse.click(600,deck.y+8);assert.equal(await picked(),false,'Transparent dashboard allowed coordinate picking');
  await page.evaluate(async()=>{const g=window.__game,{visualRadius}=await import('/model.js');g.cancelTarget();g.state.camera={x:0,y:0};g.state.zoom=45/visualRadius(g.state.system.star.diameter);g.updateUI();});
  await page.mouse.click(422,195);assert.equal(await page.evaluate(()=>window.__game.state.selected?.kind),'star','Object required two taps');
  await page.evaluate(()=>{const g=window.__game;g.enterChart();g.cancelTarget();g.state.camera={x:0,y:0};g.state.zoom=1;g.drawChart(0);});await page.waitForTimeout(350);
  const empty=await page.evaluate(()=>{
    const s=window.__game.state,stars=window.__game.nearbyStars();
    for(let y=140;y<250;y+=30)for(let x=200;x<500;x+=30)if(stars.every(star=>Math.hypot(x-s.width/2-(star.x-s.camera.x)*s.zoom,y-s.height/2-(star.y-s.camera.y)*s.zoom)>32))return {x,y};
    throw Error('No empty chart fixture');
  });
  await page.mouse.click(empty.x,empty.y);assert.equal(await picked(),false);await page.mouse.click(empty.x,empty.y);assert.equal(await picked(),true,'Deep Space did not accept double tap');
  await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.enterSurface(g.state.system.planets.find(p=>p.name==='Earth'));g.cancelTarget();g.state.camera={x:1e7,y:1e7};g.updateUI();});await page.waitForTimeout(350);
  await page.mouse.click(350,160);assert.equal(await picked(),false,'Surface selected after one tap');await page.mouse.click(350,160);assert.equal(await picked(),true,'Surface coordinate did not accept two taps');
  await page.evaluate(()=>window.__game.cancelTarget());
  return {frame,doubleTapBothSpaceLayers:true,dashboardBlocksPicking:true};
}

async function checkSurfaces(page,settle){
  // Coordinates are framed only after confirmation on both kinds of solid surface.
  const surfaces=[];
  for(const bodyName of ['Earth','Moon']){
    await page.evaluate(bodyName=>{const g=window.__game,body=[...g.state.system.planets,...g.state.system.planets.flatMap(p=>p.moons||[])].find(b=>b.name===bodyName);if(!body)throw Error('Missing surface fixture '+bodyName);g.enterSurface(body);g.cancelTarget();g.state.camera={x:1e7,y:1e7};g.state.zoom=1;g.updateUI();},bodyName);await settle();
    await page.touchscreen.tap(350,160);assert.equal(await page.evaluate(()=>Boolean(window.__game.state.waypoint)),false,'One '+bodyName+' surface tap selected travel');
    const strokes=await page.evaluate(()=>{const g=window.__game,ctx=document.getElementById('sky').getContext('2d'),stroke=ctx.stroke;let count=0;ctx.stroke=(...args)=>{count++;return stroke.apply(ctx,args);};try{g.drawCoordinateGrid();}finally{ctx.stroke=stroke;}return count;});assert.equal(strokes,0,'Unconfirmed surface showed a selection frame');
    await page.touchscreen.tap(350,160);assert.equal(await page.evaluate(()=>Boolean(window.__game.state.waypoint)),true);await settle();
    assert.equal(await page.locator('#travelControls').isVisible(),true);assert.equal(await page.locator('#contextActions').isVisible(),false);assert.equal(await page.locator('#primaryAction').getAttribute('aria-label'),'Go Here');
    await page.locator('#primaryAction').click();await settle();
    const active=await page.evaluate(()=>{const g=window.__game,m=new DOMMatrix(getComputedStyle(document.querySelector('.travel-handle')).transform);return {type:g.state.autopilot?.type,x:m.m41,y:m.m42,busy:document.getElementById('primaryAction').getAttribute('aria-busy')};});
    assert.ok(active.type==='waypoint'&&active.x===0&&active.y<0&&active.busy==='true',JSON.stringify(active));
    await page.locator('#cancelTravel').click();assert.equal(await page.evaluate(()=>Boolean(window.__game.state.waypoint||window.__game.state.autopilot)),false);assert.equal(await page.locator('#travelControls').isVisible(),false);
    surfaces.push({bodyName,active});
  }
  await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=true;g.applySettings();g.state.waypoint={x:1e7+100,y:1e7+100};g.updateUI();});await settle();
  const reduced=await page.locator('.travel-controls').evaluate(e=>getComputedStyle(e).transitionDuration);assert.equal(reduced,'0s');
  await page.evaluate(()=>window.__game.cancelTarget());
  return {surfaces,reduced};
}

export async function checkRelease11213(page,engine){
  const settle=async()=>{await page.waitForTimeout(350);await page.evaluate(async()=>{for(const id of ['terminalDock','terminalPocket','travelControls','journalButton','mapButton'])for(const a of document.getElementById(id).getAnimations({subtree:true}))if(Number.isFinite(a.effect.getComputedTiming().endTime))a.finish();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);window.__game.positionContext();window.__game.frame(performance.now());});};
  const tracking=await checkTracking(page),input=await checkInput(page,engine),coordinates=await checkCoordinates(page),surfaces=await checkSurfaces(page,settle);
  await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>window.__game.state.width===844);
  await page.evaluate(async()=>{const g=window.__game,{makeSystem}=await import('/model.js');g.cancelTarget();g.state.scene='system';g.state.system=makeSystem('sol');g.state.save.currentSystem=g.state.save.homeSeed='sol';g.state.autopilot=g.state.followBody=g.state.centerZoom=null;g.state.followShip=false;g.state.keys.clear();g.state.joy={x:0,y:0};g.state.save.ship={x:1e7,y:1e7};g.state.camera={...g.state.save.ship};g.state.zoom=.1;Object.assign(g.settings,{paused:true,controls:'touch',centerButton:'right',joyOffset:0,joyX:16,reducedMotion:false,dashboardHeight:68,terminalWidthScale:100,terminalHeightScale:100,terminalResizeHandles:false,dashboardResizeHandle:false});g.state.terminalSize=null;g.applySettings();});
  const setSpeed=async value=>page.locator('#flightSpeed').evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));},value);
  await setSpeed(0);
  const speeds=[];
  for(const [stage,mode] of [[0,'orbit'],[1,'hyper']]){
    await setSpeed(stage);
    speeds.push(await page.evaluate(async mode=>{const g=window.__game,s=g.state,{manualSpeed}=await import('/navigation.js');const x=s.save.ship.x;s.keys.add('d');g.update(1000,0);s.keys.clear();if(Math.abs(s.save.ship.x-x-manualSpeed('system',mode))>1e-7)throw Error('Manual flight speed wrong');if(g.settings.flightMode!==mode)throw Error('Slider did not change flight preference');return {mode,distance:s.save.ship.x-x};},mode));
  }
  await page.evaluate(async()=>{const g=window.__game,s=g.state,{bodyPosition}=await import('/model.js');const earth=s.system.planets.find(p=>p.name==='Earth'),moon=earth.moons[0];s.save.ship=bodyPosition(earth,s.save.days,s.system);g.select(moon);g.primary();g.updateUI();if(s.autopilot.drive!=='orbit'||g.settings.flightMode!=='hyper')throw Error('Automatic moon transfer did not override manual speed');});
  assert.equal(await page.locator('#flightSpeed').isDisabled(),true);assert.equal(await page.locator('#flightSpeed').inputValue(),'0');
  await page.evaluate(()=>{window.__game.cancelTarget();window.__game.updateUI();});
  await setSpeed(2);assert.equal(await page.locator('#mapButton').getAttribute('aria-busy'),'true');
  await page.evaluate(()=>{const g=window.__game;g.state.warpUntil=performance.now()-1;g.update(1,0);});
  assert.equal(await page.evaluate(()=>window.__game.state.scene),'chart');assert.equal(await page.locator('#flightSpeed').inputValue(),'2');
  await page.evaluate(async()=>{const g=window.__game,{manualSpeed}=await import('/navigation.js');const x=g.state.save.chart.x;g.state.keys.add('d');g.update(1000,0);g.state.keys.clear();if(Math.abs(g.state.save.chart.x-x-manualSpeed('chart','orbit'))>1e-7)throw Error('Deep Space did not use Warp speed');});
  // System entry is explicit travel; the Deep Space slider cannot return us.
  await page.evaluate(()=>{const g=window.__game;g.state.save.chart={x:g.state.selected.x,y:g.state.selected.y};g.primary();});await setSpeed(0);
  await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.notify('Course test recorded in the terminal');g.updateUI();});
  assert.equal(await page.locator('#toast').count(),0);assert.match(await page.locator('#targetStatus').innerText(),/Course test recorded/);
  await page.locator('#secondaryAction').click();await settle();
  await page.locator('#terminalInput').fill('<b>pilot entry</b>');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#terminalInput').inputValue(),'');assert.equal(await page.locator('#terminalMessages b').count(),0);
  assert.match(await page.locator('#terminalMessages').innerText(),/> <b>pilot entry<\/b>/);
  const priorEntries=await page.locator('#terminalMessages .input').count();
  await page.locator('#terminalInput').fill('virtual entry');await page.locator('#terminalInput').focus();await settle();await page.locator('[data-key="Enter"]').click();
  assert.equal(await page.locator('#terminalInput').inputValue(),'');assert.equal(await page.locator('#terminalMessages .input').count(),priorEntries+1,'Keyboard entries should echo exactly once');
  const history=await page.locator('#terminalMessages').innerText();
  await page.locator('#secondaryAction').click();await settle();
  assert.equal(await page.locator('#targetCard').isVisible(),false,'Closing a notification-only terminal should restore its launcher');
  await page.locator('#terminalButton').click();await settle();
  assert.equal(await page.locator('#terminalMessages').innerText(),history,'Closing the standalone device erased its history');
  await page.evaluate(()=>{const g=window.__game;g.select(g.state.system.planets.find(p=>p.name==='Earth'));g.showDetails(g.state.selected);g.updateTerminal(g.state.terminal.start+15000);});await settle();
  assert.ok((await page.locator('#terminalMessages').innerText()).includes(history),'Selecting an object erased terminal history');
  const layouts=[];
  for(const viewport of [{width:1440,height:900,bottom:0,right:0},{width:844,height:390,bottom:21,right:47},{width:667,height:375,bottom:21,right:47}]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});await page.waitForFunction(v=>window.__game.state.width===v.width&&window.__game.state.height===v.height,viewport);
    await page.evaluate(({bottom,right})=>{document.documentElement.style.setProperty('--dashboard-safe-bottom',bottom+'px');document.getElementById('terminalDock').style.setProperty('--deck-safe-right',right+'px');const g=window.__game;g.cancelTarget();g.state.terminalSize=null;g.applySettings();},viewport);
    for(const phase of ['closed','compact','expanded','keyboard']){
      await page.evaluate(phase=>{const g=window.__game;if(phase==='compact')g.select(g.state.system.star);if(phase==='expanded')g.showDetails(g.state.selected);if(phase==='keyboard')document.getElementById('terminalInput').focus();g.updateTerminal(performance.now()+15000);g.updateUI();},phase);await settle();
      const fit=await page.evaluate(phase=>{
        const r=id=>document.getElementById(id).getBoundingClientRect().toJSON(),deck=r('dashboardBase'),card=r('targetCard'),joy=r('joystick'),nav=r('navigationControls'),speed=r('mapButton'),log=r('journalButton'),term=r('terminalButton'),travel=r('travelControls'),lever=r('primaryAction'),cancel=r('cancelTravel'),clock=r('flightReadout'),settings=r('settingsOpen'),chart=r('systemChart'),system=r('systemFit');
        const overlap=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5,inside=a=>a.left>=0&&a.right<=innerWidth&&a.top>=deck.top&&a.bottom<=deck.bottom;
        const controls=[joy,nav,speed,log,...(phase==='closed'?[term]:[])],screen=document.getElementById('terminalScreen'),bar=r('terminalInputBar'),keyboard=r('terminalKeyboard');
        const radius=parseFloat(getComputedStyle(document.getElementById('targetCard')).borderBottomRightRadius);
        const pointFits=(x,y)=>x<=card.right-radius||y<=card.bottom-radius||Math.hypot(x-card.right+radius,y-card.bottom+radius)<=radius-2;
        const keys=[...document.querySelectorAll('#terminalInputBar button,#terminalKeyboard:not([hidden]) button')];
        const curveClear=phase!=='expanded'&&phase!=='keyboard'||keys.every(button=>{const b=button.getBoundingClientRect();return [[b.left+4,b.top+4],[b.right-4,b.bottom-4]].every(([x,y])=>pointFits(x,y)&&document.elementFromPoint(x,y)?.closest('button')===button);});
        const before=bar.top;screen.scrollTop=screen.scrollHeight;
        return {deck,card,joy,nav,speed,log,term,travel,lever,cancel,clock,chart,contained:controls.every(inside)&&(phase==='closed'||phase==='expanded'||phase==='keyboard'||inside(card)),clear:controls.every((a,i)=>controls.slice(i+1).every(b=>!overlap(a,b)))&&(phase==='closed'||controls.every(a=>!overlap(a,card))),curveClear,barFixed:before===r('terminalInputBar').top,screenHeight:screen.clientHeight,overflow:screen.scrollWidth-screen.clientWidth,scrollbarGap:card.right-(r('terminalScreen').right),keyboardFits:phase!=='keyboard'||keyboard.bottom<=card.bottom,topOrder:clock.right<=settings.left&&system.right<=chart.left,rounded:parseFloat(getComputedStyle(document.getElementById('flightReadout')).borderTopLeftRadius)>0&&parseFloat(getComputedStyle(document.getElementById('systemChart')).borderTopRightRadius)>0,fonts:['terminalOutput','terminalInput','clock','coordsReadout'].every(id=>getComputedStyle(document.getElementById(id)).fontFamily.includes('SpaceBitz Pixel'))};
      },phase);
      assert.ok(fit.contained&&fit.clear&&fit.topOrder&&fit.rounded&&fit.fonts&&fit.keyboardFits&&fit.curveClear,JSON.stringify({viewport,phase,fit}));
      assert.ok(Math.abs(fit.joy.top-fit.deck.top-3)<.2&&Math.abs(fit.deck.bottom-fit.joy.bottom-4)<.2,'Joystick overlaps dashboard rim');
      if(phase!=='closed')assert.ok(Math.abs(fit.card.right-viewport.width+3)<.2&&Math.abs(fit.card.bottom-viewport.height+3)<.2,JSON.stringify(fit));
      if(phase==='expanded'||phase==='keyboard')assert.ok(fit.barFixed&&fit.screenHeight>=35&&fit.overflow<=1&&fit.scrollbarGap<=6,JSON.stringify(fit));
      if(phase==='compact'||phase==='expanded')assert.ok(Math.abs((fit.cancel.left+fit.cancel.right-fit.lever.left-fit.lever.right)/2)<.2&&fit.cancel.bottom<=fit.lever.top,JSON.stringify(fit));
      layouts.push({viewport,phase,terminal:fit.card,screen:fit.screenHeight});await page.screenshot({path:`.qa/${engine}-11213-${phase}-${viewport.width}.png`});
      if(phase==='keyboard')await page.locator('[data-key="Enter"]').click();
    }
  }
  await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>window.__game.state.width===844);
  await page.evaluate(()=>{document.documentElement.style.removeProperty('--dashboard-safe-bottom');document.getElementById('terminalDock').style.removeProperty('--deck-safe-right');const g=window.__game;g.settings.terminalResizeHandles=true;g.settings.dashboardResizeHandle=true;g.state.terminalSize=null;g.applySettings();});await settle();
  const arrows=await page.evaluate(()=>{const r=id=>document.getElementById(id).getBoundingClientRect(),card=r('targetCard'),top=r('terminalResizeTop'),left=r('terminalResizeLeft');return {top:top.left-card.left,left:left.top-card.top};});
  assert.ok(arrows.top<55&&arrows.left<55,JSON.stringify(arrows));
  // Persisted, keyboard-accessible device sizing remains independent of steering.
  const before=await page.locator('#targetCard').boundingBox();await page.locator('#terminalResizeLeft').press('ArrowLeft');await settle();await page.locator('#terminalResizeTop').press('ArrowDown');await settle();
  const after=await page.locator('#targetCard').boundingBox();assert.ok(Math.abs(after.width-before.width-12)<1&&Math.abs(after.height-before.height+12)<1,JSON.stringify({before,after}));
  await page.locator('#dashboardResize').press('ArrowUp');await settle();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spacebitz:field:settings')).dashboardHeight),80);
  await page.locator('#dashboardResize').press('ArrowDown');await page.evaluate(()=>{const g=window.__game;g.settings.terminalResizeHandles=false;g.settings.dashboardResizeHandle=false;g.applySettings();});
  await page.locator('#systemChartToggle').click();assert.equal(await page.locator('#targetCard').isVisible(),false);assert.equal(await page.locator('#systemChartContent').isVisible(),true);
  await page.locator('#terminalButton').click();assert.equal(await page.locator('#systemChartContent').isVisible(),false);
  await page.evaluate(()=>{const g=window.__game;g.state.keys.add('d');g.settings.paused=false;window.__orientationShip={...g.state.save.ship};window.__orientationDays=g.state.save.days;});
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>window.__game.state.landscapeBlocked);
  assert.equal(await page.locator('#landscapeGate').isVisible(),true);assert.equal(await page.locator('#app').evaluate(e=>e.inert),true);
  await page.evaluate(()=>{const g=window.__game;g.update(10000,10000);if(JSON.stringify(g.state.save.ship)!==JSON.stringify(window.__orientationShip)||g.state.save.days!==window.__orientationDays||g.state.keys.size)throw Error('Portrait guard allowed voyage motion or retained steering');});
  await page.screenshot({path:`.qa/${engine}-11213-rotate-prompt.png`});
  await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>!window.__game.state.landscapeBlocked);assert.equal(await page.locator('#landscapeGate').isVisible(),false);
  await page.evaluate(()=>{const g=window.__game;g.cancelTarget();Object.assign(g.settings,{reducedMotion:true,paused:true,terminalWidthScale:100,terminalHeightScale:100});g.state.terminalSize=null;g.applySettings();document.getElementById('terminalButton').click();g.updateTerminal(performance.now());});
  assert.equal(await page.locator('#mapButton').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  assert.equal(await page.evaluate(()=>window.__game.state.terminal.count===window.__game.state.terminal.text.length),true);
  await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.settings.reducedMotion=false;g.applySettings();});
  return {tracking,input,coordinates,surfaces,speeds,echoAndPlainText:true,messageHistoryPreserved:true,layouts,arrows,landscapeGuard:true};
}
