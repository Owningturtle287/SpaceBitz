import assert from 'node:assert/strict';

export async function checkRelease11217(page,engine){
  const tap=async id=>{const button=page.locator('#'+id);await button.click({trial:true});const r=await button.boundingBox();assert.ok(r,id+' has no bounds');await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);};
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{
    const g=window.__game;g.settings.controls='touch';g.settings.reducedMotion=false;g.state.followShip=false;g.state.centerZoom=null;
    g.enterChart();g.applySettings();window.__qaPause=false;g.frame(performance.now());
    // Model the reported iPhone failure: touch/pointer events still arrive,
    // but Safari's subsequent compatibility click does not reach the action.
    // Real touchscreen input must operate the dashboard in this condition.
    window.__blockCompatibilityClick=true;
    document.addEventListener('click',e=>{
      if(window.__blockCompatibilityClick&&e.isTrusted){e.preventDefault();e.stopImmediatePropagation();}
    },{capture:true});
  });
  await page.waitForFunction(()=>document.body.dataset.scene==='chart'&&getComputedStyle(document.getElementById('travelControls')).opacity!=='0');
  await tap('followShipButton');
  await page.waitForFunction(()=>window.__game.state.followShip,undefined,{timeout:5000});
  await tap('followShipButton');
  assert.equal(await page.locator('#followShipButton').getAttribute('aria-pressed'),'false');
  await tap('homeButton');await page.waitForFunction(()=>window.__game.state.centerReady);
  await tap('secondaryAction');await page.waitForFunction(()=>window.__game.state.terminalExpanded);
  await page.waitForFunction(()=>{const e=document.getElementById('secondaryAction'),r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e;});
  await tap('secondaryAction');assert.equal(await page.evaluate(()=>window.__game.state.terminalExpanded),false);
  await tap('settingsOpen');assert.equal(await page.locator('#modal').isVisible(),true);
  await tap('modalClose');assert.equal(await page.locator('#modal').isVisible(),false);
  await tap('journalButton');assert.equal(await page.locator('#journal').isVisible(),true);
  await page.waitForFunction(()=>!document.getElementById('journalPanel').getAnimations().some(a=>a.playState==='running'||a.playState==='pending'));
  await page.evaluate(()=>{
    window.__logTouchTrace=[];
    for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,e=>{
      if(window.__logTouchTrace.length>=12)return;
      const button=e.target.closest?.('button'),hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('button');
      window.__logTouchTrace.push({type,button:button?.id,hit:hit?.id,trusted:e.isTrusted,inert:button?.closest('[inert]')?.id,hidden:button?.closest('[hidden]')?.id});
    },{capture:true});
  });
  await tap('journalClose');
  try{await page.waitForFunction(()=>!window.__game.state.journalOpen);}
  catch(error){console.log('11217 log touch diagnostic',await page.evaluate(()=>({trace:window.__logTouchTrace,open:window.__game.state.journalOpen,animations:document.getElementById('journalPanel').getAnimations().map(a=>({state:a.playState,time:a.currentTime})),hidden:document.getElementById('journal').hidden})));throw error;}
  const before=await page.evaluate(()=>Math.hypot(window.__game.state.selected.x-window.__game.state.save.chart.x,window.__game.state.selected.y-window.__game.state.save.chart.y));
  await tap('primaryAction');
  await page.waitForFunction(d=>Math.hypot(window.__game.state.selected.x-window.__game.state.save.chart.x,window.__game.state.selected.y-window.__game.state.save.chart.y)<d,before);
  await page.waitForFunction(()=>!window.__game.state.autopilot);
  assert.equal(await page.locator('#flightSpeed').inputValue(),'2');
  await page.screenshot({path:`.qa/${engine}-11217-touch-actions.png`});
  await tap('primaryAction');assert.equal(await page.evaluate(()=>window.__game.state.scene),'system');
  await page.evaluate(async()=>{window.__blockCompatibilityClick=false;window.__qaPause=true;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  // A normal browser click following a touch must not toggle the action twice.
  await page.evaluate(()=>{const g=window.__game;g.enterChart();g.state.followShip=false;g.state.centerZoom=null;g.updateUI();});
  await page.waitForFunction(()=>{const e=document.getElementById('secondaryAction'),r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e;});
  await tap('followShipButton');assert.equal(await page.locator('#followShipButton').getAttribute('aria-pressed'),'true');
  await tap('followShipButton');assert.equal(await page.locator('#followShipButton').getAttribute('aria-pressed'),'false');
  await tap('secondaryAction');assert.equal(await page.evaluate(()=>window.__game.state.terminalExpanded),true);
  await page.waitForFunction(()=>{const e=document.getElementById('secondaryAction'),r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e;});
  await tap('secondaryAction');assert.equal(await page.evaluate(()=>window.__game.state.terminalExpanded),false);
  // Keyboard activation remains native even immediately after a touch.
  await page.locator('#followShipButton').press('Enter');assert.equal(await page.locator('#followShipButton').getAttribute('aria-pressed'),'true');
  await page.locator('#followShipButton').click();assert.equal(await page.locator('#followShipButton').getAttribute('aria-pressed'),'false');
  await page.evaluate(()=>{
    const button=document.getElementById('followShipButton'),r=button.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    const pointer=(type,dx=0)=>button.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:41,button:0,clientX:x+dx,clientY:y}));
    pointer('pointerdown');pointer('pointermove',20);pointer('pointerup');
    if(button.getAttribute('aria-pressed')!=='false')throw Error('Dragging over a button activated it');
    pointer('pointerdown');pointer('pointercancel');pointer('pointerup');
    if(button.getAttribute('aria-pressed')!=='false')throw Error('Cancelled touch activated a button');
    button.disabled=true;pointer('pointerdown');pointer('pointerup');button.disabled=false;
    if(button.getAttribute('aria-pressed')!=='false')throw Error('Disabled button accepted a touch');
  });
  await page.evaluate(()=>{
    const g=window.__game,button=document.getElementById('homeButton'),r=button.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    g.settings.centerButton='custom';
    // Pointer capture requires a hardware pointer; the deterministic drag
    // fixture exercises the same bubbling events without claiming one.
    const capture=button.setPointerCapture;button.setPointerCapture=()=>{};
    try{
      for(const [type,dx]of [['pointerdown',0],['pointermove',25],['pointerup',25]])button.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:42,button:0,clientX:x+dx,clientY:y}));
    }finally{button.setPointerCapture=capture;}
    g.settings.centerButton='right';g.state.centerZoom=null;g.state.centerReady=false;g.state.followShip=false;g.state.camera.x+=100;g.applySettings();
  });
  await tap('homeButton');assert.equal(await page.evaluate(()=>window.__game.state.centerZoom?.centerAction),'pan','A previous touch drag swallowed the next Center press');
  return {touchActionsWithoutCompatibilityClicks:true,noDuplicateTouchActions:true,keyboardAfterTouch:true,mouseAfterTouch:true,dragAndCancellationSafe:true};
}
