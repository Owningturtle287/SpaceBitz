import assert from 'node:assert/strict';

export async function checkRelease11216(page,engine){
  const tap=async id=>{const r=await page.locator('#'+id).boundingBox();assert.ok(r,id+' has no bounds');await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);};
  const inspect=()=>page.evaluate(()=>{
    const g=window.__game,s=g.state;
    const controls=Object.fromEntries(['followShipButton','primaryAction','homeButton','flightSpeed'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return [id,{disabled:e.disabled,hidden:e.hidden,rect:{x:r.x,y:r.y,width:r.width,height:r.height},hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button,input')?.id,opacity:getComputedStyle(e.parentElement).opacity}];}));
    return {scene:s.scene,follow:s.followShip,centerAction:s.centerZoom?.centerAction,autopilot:s.autopilot,warpUntil:s.warpUntil,distance:s.selected?Math.hypot(s.selected.x-s.save.chart.x,s.selected.y-s.save.chart.y):null,notice:s.terminalNotice,appInert:document.getElementById('app').inert,ready:document.getElementById('travelControls').classList.contains('ready'),activeElement:document.activeElement.id,controls};
  });
  // Keep the real animation loop running: delayed UI refreshes must not undo a
  // press, and automatic star selection must enable the actual touch controls.
  await page.evaluate(()=>{window.__qaPause=false;window.__game.frame(performance.now());});
  await page.locator('#flightSpeed').click({trial:true});
  await page.waitForFunction(()=>{const e=document.getElementById('flightSpeed'),r=e.getBoundingClientRect();return document.elementFromPoint(r.right-6,r.y+r.height/2)===e;});
  const range=await page.locator('#flightSpeed').boundingBox();
  await page.touchscreen.tap(range.x+range.width-6,range.y+range.height/2);
  try{await page.waitForFunction(()=>window.__game.state.scene==='chart');}catch(error){console.log('11216 failed warp tap',JSON.stringify(await inspect()));throw error;}
  await page.waitForTimeout(600);
  const before=await inspect();
  await tap('followShipButton');await page.waitForTimeout(1550);
  const afterFollow=await inspect();
  await tap('primaryAction');await page.waitForTimeout(100);
  const afterGreen=await inspect();
  console.log('11216 touch diagnostic',JSON.stringify({before,afterFollow,afterGreen}));
  await page.screenshot({path:`.qa/${engine}-11216-deep-space.png`});
  assert.equal(afterFollow.follow,true,'Follow did not activate after a native slider exit');
  assert.ok(afterGreen.autopilot||afterGreen.scene==='system'||afterGreen.distance<before.distance,'Green travel lever did not activate after automatic star selection');
  await page.waitForFunction(()=>!window.__game.state.autopilot);
  await tap('primaryAction');
  assert.equal(await page.evaluate(()=>window.__game.state.scene),'system','Green lever could not enter the reached system');
  await page.evaluate(async()=>{window.__qaPause=true;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  const layouts=[];
  for(const viewport of [{width:667,height:375},{width:844,height:390},{width:1024,height:768}]){
    await page.setViewportSize(viewport);
    await page.evaluate(()=>{const g=window.__game;g.state.followShip=false;g.state.centerZoom=null;g.settings.reducedMotion=false;g.settings.controls='touch';g.settings.terminalResizeHandles=true;g.applySettings();window.__qaPause=false;g.frame(performance.now());});
    await page.waitForTimeout(400);
    await page.locator('#flightSpeed').click({trial:true});
    await page.waitForFunction(()=>{const e=document.getElementById('flightSpeed'),r=e.getBoundingClientRect();return document.elementFromPoint(r.right-6,r.y+r.height/2)===e;});
    const input=await page.locator('#flightSpeed').boundingBox();
    await page.touchscreen.tap(input.x+input.width-6,input.y+input.height/2);
    await page.waitForFunction(()=>window.__game.state.scene==='chart');
    await tap('followShipButton');
    await page.waitForFunction(()=>window.__game.state.followShip);
    assert.equal(await page.locator('#flightSpeed').inputValue(),'2');
    await tap('homeButton');await page.waitForFunction(()=>window.__game.state.centerReady);
    assert.equal(await page.evaluate(()=>window.__game.state.scene),'chart');
    await page.evaluate(async()=>{window.__qaPause=true;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    assert.equal(await page.locator('#terminalClear').isVisible(),false);
    const summary=await page.evaluate(()=>({bottom:document.getElementById('targetStatus').getBoundingClientRect().bottom,edge:document.getElementById('targetCard').getBoundingClientRect().bottom}));
    assert.ok(summary.bottom<=summary.edge-2,'Closed terminal summary is clipped: '+JSON.stringify(summary));
    await tap('secondaryAction');
    // The pocket grows around its bottom-anchored device. Until that transition
    // finishes, the header can still be outside the ancestor's visible clip.
    // Wait for natural hit testing, rather than a wall-clock animation guess.
    const opening=await page.evaluate(()=>{const r=id=>{const e=document.getElementById(id),b=e.getBoundingClientRect();return {id,inert:e.inert,top:b.top,bottom:b.bottom,height:b.height,hit:document.elementFromPoint((b.left+b.right)/2,(b.top+b.bottom)/2)?.id};};return {appInert:document.getElementById('app').inert,card:r('targetCard'),pocket:r('terminalPocket'),header:r('terminalResizeTop')};});
    console.log('11216 terminal opening',JSON.stringify({viewport,opening}));
    await page.waitForFunction(()=>['terminalResizeTop','terminalResizeLeft','terminalClear','secondaryAction'].every(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')?.id===id;}),undefined,{timeout:5000});
    assert.equal(await page.locator('#terminalClear').isVisible(),true);
    const layout=await page.evaluate(()=>{
      const rect=id=>document.getElementById(id).getBoundingClientRect(),head=document.querySelector('#targetCard .terminal-head').getBoundingClientRect();
      const ids=['terminalResizeTop','terminalResizeLeft','terminalClear','secondaryAction'];
      const buttons=ids.map(id=>{const r=rect(id);return {id,center:(r.top+r.bottom)/2,hit:document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2)?.closest('button')?.id};});
      const readout=rect('flightReadout');return {buttons,headCenter:(head.top+head.bottom)/2,paddingTop:getComputedStyle(document.querySelector('#targetCard .terminal-head')).paddingTop,arrowFrame:(()=>{const s=getComputedStyle(document.getElementById('terminalResizeTop'),'::before');return parseFloat(s.width)+parseFloat(s.borderLeftWidth)+parseFloat(s.borderRightWidth);})(),readout:{width:readout.width,left:readout.left,overflow:document.getElementById('flightReadout').scrollWidth>document.getElementById('flightReadout').clientWidth,clockFont:getComputedStyle(document.getElementById('clock')).fontSize,coordsFont:getComputedStyle(document.getElementById('coordsReadout')).fontSize}};
    });
    await page.screenshot({path:`.qa/${engine}-11216-terminal-${viewport.width}.png`});
    assert.equal(layout.paddingTop,'0px');assert.equal(layout.arrowFrame,32);
    for(const b of layout.buttons){assert.ok(Math.abs(b.center-layout.headCenter)<=2,JSON.stringify({viewport,layout}));assert.equal(b.hit,b.id,JSON.stringify({viewport,layout}));}
    assert.ok(layout.readout.width<=180&&layout.readout.left<=4&&!layout.readout.overflow,JSON.stringify(layout));assert.equal(layout.readout.clockFont,'10px');assert.equal(layout.readout.coordsFont,'9px');
    const oldWidth=await page.locator('#targetCard').evaluate(e=>e.getBoundingClientRect().width);
    const grip=await page.locator('#terminalResizeLeft').boundingBox();await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await page.mouse.down();await page.mouse.move(grip.x+grip.width/2-12,grip.y+grip.height/2,{steps:4});await page.mouse.up();
    assert.ok(await page.locator('#targetCard').evaluate(e=>e.getBoundingClientRect().width)>oldWidth,'Smaller arrow could not resize by dragging');
    await tap('secondaryAction');assert.equal(await page.locator('#terminalClear').isVisible(),false);
    // The log must release the dashboard before camera and travel inputs resume.
    await tap('journalButton');await page.waitForTimeout(700);await tap('journalClose');await page.waitForFunction(()=>!window.__game.state.journalOpen);
    assert.equal(await page.locator('#app').evaluate(e=>e.inert),false);
    await page.evaluate(()=>{const g=window.__game;g.state.followShip=false;g.state.centerZoom=null;g.updateUI();});await tap('followShipButton');
    assert.equal(await page.evaluate(()=>window.__game.state.centerZoom?.centerAction),'follow');
    await page.evaluate(()=>{const g=window.__game;g.update(1300,0);window.__qaPause=false;g.frame(performance.now());});
    const beforeMove=await page.evaluate(()=>({...window.__game.state.save.chart})),joy=await page.locator('#joystick').boundingBox();
    await page.mouse.move(joy.x+joy.width/2,joy.y+joy.height/2);await page.mouse.down();await page.mouse.move(joy.x+joy.width-10,joy.y+joy.height/2);
    const held=await page.evaluate(()=>({...window.__game.state.joy}));assert.ok(held.x>0,'Joystick did not accept the pointer: '+JSON.stringify(held));
    await page.waitForFunction(x=>window.__game.state.save.chart.x>x,beforeMove.x,{timeout:5000});await page.mouse.up();
    const moved=await page.evaluate(async()=>{window.__qaPause=true;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const s=window.__game.state;return {position:s.save.chart,camera:s.camera,follow:s.followShip,joy:s.joy};});
    assert.ok(moved.position.x>beforeMove.x,'Joystick did not move the ship in Deep Space');assert.equal(moved.follow,true);assert.deepEqual(moved.camera,moved.position);assert.deepEqual(moved.joy,{x:0,y:0});
    await page.evaluate(()=>{const g=window.__game;g.state.save.chart={x:g.state.selected.x,y:g.state.selected.y};g.updateUI();});await tap('primaryAction');
    assert.equal(await page.evaluate(()=>window.__game.state.scene),'system');layouts.push({viewport,layout});
  }
  return {nativeDeepSpaceControls:{before,afterFollow,afterGreen},layouts};
}
