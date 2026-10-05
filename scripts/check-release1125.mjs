import assert from 'node:assert/strict';

export async function checkRelease1125(page,engine){
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
    if(!s.followShip||s.followPanRemaining!==5000)throw Error('Pan switched Follow off');
    g.update(4900,0);if(s.camera.x!==panned.x||s.camera.y!==panned.y||s.followPanRemaining!==100)throw Error('Follow returned early');
    return {panned,z};
  });
  await page.mouse.move(1000,220);await page.mouse.down();await page.mouse.move(1030,245);await page.mouse.up();
  const resume=await page.evaluate(()=>{
    const g=window.__game,s=g.state,from={...s.camera},z=s.zoom;
    g.update(4999,0);if(s.followPanRemaining!==1||s.camera.x!==from.x)throw Error('Last pan did not reset timeout');
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
  assert.equal(await page.locator('#dashboardControls').evaluate(e=>e.hidden),true,'Separated controls created an oversized blocking plate');
  await page.mouse.click(700,250);assert.equal(await page.evaluate(()=>Boolean(window.__game.state.selected||window.__game.state.waypoint)),true,'A custom control plate blocked the open scene');
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
  const before=await page.locator('#targetCard').boundingBox(),left=await page.locator('#terminalResizeLeft').boundingBox();
  await page.mouse.move(left.x+left.width/2,left.y+left.height/2);await page.mouse.down();await page.mouse.move(left.x+left.width/2+90,left.y+left.height/2,{steps:6});await page.mouse.up();await page.waitForTimeout(400);
  const narrower=await page.locator('#targetCard').boundingBox();assert.ok(Math.abs(narrower.width-before.width+90)<2,'Width handle did not slide');
  const top=await page.locator('#terminalResizeTop').boundingBox();await page.mouse.move(top.x+top.width/2,top.y+top.height/2);await page.mouse.down();await page.mouse.move(top.x+top.width/2,top.y+top.height/2+90,{steps:6});await page.mouse.up();await page.waitForTimeout(400);
  const shorter=await page.locator('#targetCard').boundingBox();assert.ok(Math.abs(shorter.height-narrower.height+90)<2,'Height handle did not slide');
  const layouts=[];
  for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:667,height:375},{width:390,height:844},{width:375,height:667}]){
    await page.setViewportSize(viewport);await page.evaluate(()=>{const g=window.__game;g.state.terminalSize=null;document.getElementById('terminalDock').style.removeProperty('--terminal-width');document.getElementById('terminalDock').style.removeProperty('--terminal-user-height');g.updateUI();g.updateTerminal(g.state.terminal.start+14000);});
    await page.locator('#terminalInput').focus();await page.waitForTimeout(500);
    const fit=await page.evaluate(()=>{
      const r=id=>document.getElementById(id).getBoundingClientRect(),t=r('targetCard'),w=r('mapButton'),f=r('followShipButton'),c=r('homeButton'),joy=r('joystick'),k=r('terminalKeyboard'),input=r('terminalInputBar');
      const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
      const fonts=['terminalOutput','terminalInput','terminalKeyboard','targetDistance','clock','coordsReadout'].every(id=>getComputedStyle(document.getElementById(id)).fontFamily.includes('SpaceBitz Pixel'));
      return {terminal:t.toJSON(),warp:w.toJSON(),follow:f.toJSON(),center:c.toJSON(),clear:w.right<t.left&&!overlap(w,f)&&!overlap(w,c)&&!overlap(w,joy),half:f.width===c.width/2&&f.height===c.height/2,side:Math.abs(f.left-c.right-6)<1,fonts,keyboardFits:k.bottom<=t.bottom,screenHeight:document.getElementById('terminalScreen').clientHeight,inputFixed:input.bottom<=k.top,overflow:document.getElementById('terminalScreen').scrollWidth-document.getElementById('terminalScreen').clientWidth};
    });
    assert.ok(fit.clear&&fit.half&&fit.side&&fit.fonts&&fit.keyboardFits&&fit.screenHeight>=35&&fit.inputFixed&&fit.overflow<=1&&fit.warp.left>=0&&fit.terminal.top>=60&&fit.terminal.right<=viewport.width,JSON.stringify({viewport,fit}));layouts.push({viewport,...fit});
    await page.screenshot({path:`.qa/${engine}-1125-dashboard-${viewport.width}.png`});
    await page.locator('[data-key="Enter"]').click();
  }
  await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.select(g.state.system.star);g.updateUI();});await page.waitForTimeout(400);
  const slide=await page.evaluate(()=>{
    const warp=document.getElementById('mapButton'),dock=document.getElementById('terminalDock'),start=warp.getBoundingClientRect().left;
    document.getElementById('secondaryAction').click();
    // getAnimations flushes style; capture and pause before a frame wait can finish it.
    const animation=dock.getAnimations().find(a=>a.transitionProperty==='width');
    if(!animation)throw Error('Terminal width did not animate '+JSON.stringify({start,end:warp.getBoundingClientRect().left,width:dock.getBoundingClientRect().width,expanded:window.__game.state.terminalExpanded,transition:getComputedStyle(dock).transition}));
    // Seek the browser's own transition so a busy headless runner cannot skip the sample.
    animation.pause();animation.currentTime=animation.effect.getComputedTiming().duration/2;
    const mid=warp.getBoundingClientRect().left;animation.finish();
    return {start,mid,end:warp.getBoundingClientRect().left};
  });
  assert.ok(slide.mid<slide.start&&slide.mid>slide.end,JSON.stringify(slide));
  await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=true;g.applySettings();document.getElementById('terminalInput').focus();});
  assert.equal(await page.locator('#terminalInputCaret').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.locator('[data-key="Enter"]').click();await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.settings.reducedMotion=false;g.applySettings();});
  return {anchors,inspection,resume,dashboardBlocksPicking:true,keyboard,rapidKeys:24,heldRepeat:true,resized:{before,narrower,shorter},layouts,slide};
}
