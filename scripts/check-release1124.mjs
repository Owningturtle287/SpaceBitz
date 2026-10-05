import assert from 'node:assert/strict';

export async function checkRelease1124(page,engine){
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
    if(s.followShip||JSON.stringify(s.camera)!==zoomed)throw Error('Manual camera control did not stop following');
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
  assert.ok(controls.follow.top>=controls.center.bottom&&controls.centered<1&&controls.follow.width<controls.center.width&&controls.follow.height<controls.center.height&&controls.follow.bottom<=390,JSON.stringify(controls));
  assert.equal(controls.warp.left-controls.center.right,6);assert.equal(controls.warp.top,controls.center.top);
  const immediate=await page.evaluate(()=>{
    const g=window.__game;g.select(g.state.system.star);g.positionContext();const row=document.querySelector('.context-action-row'),s=getComputedStyle(row);
    return {ready:document.getElementById('contextActions').classList.contains('ready'),delay:s.transitionDelay,duration:s.transitionDuration,offset:new DOMMatrix(s.transform).m42};
  });
  assert.ok(immediate.ready&&immediate.delay.split(',').every(v=>parseFloat(v)===0)&&immediate.duration.includes('0.55s')&&immediate.offset>0,JSON.stringify(immediate));
  await page.waitForTimeout(180);const middle=await page.locator('.context-action-row').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42);
  assert.ok(middle>0&&middle<immediate.offset,'Action glide finished too quickly');await page.waitForTimeout(450);
  assert.equal(await page.locator('.context-action-row').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42),0);
  await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.updateUI();});await page.waitForTimeout(350);
  assert.equal(await page.locator('#targetCard').isVisible(),false);
  await page.locator('#terminalButton').click();await page.waitForTimeout(350);
  const standalone=await page.evaluate(()=>{
    const g=window.__game;g.updateTerminal(g.state.terminal.start+12000);const card=document.getElementById('targetCard'),log=document.getElementById('journalButton').getBoundingClientRect(),launcher=document.getElementById('terminalButton').getBoundingClientRect();
    return {name:document.getElementById('targetName').textContent,selected:g.state.selected,waypoint:g.state.waypoint,contextHidden:document.getElementById('contextActions').hidden,focusHidden:document.getElementById('focusSelected').hidden,expanded:card.classList.contains('expanded'),text:document.getElementById('terminalOutput').textContent,logLeft:log.left,launcherRight:launcher.right,launcherBottom:launcher.bottom,logBottom:log.bottom};
  });
  assert.ok(standalone.expanded&&!standalone.selected&&!standalone.waypoint&&standalone.contextHidden&&standalone.focusHidden&&standalone.text.includes('READY')&&standalone.launcherRight<standalone.logLeft&&standalone.launcherBottom===standalone.logBottom,JSON.stringify(standalone));
  assert.equal(await page.locator('#secondaryAction').textContent(),'Close Terminal');
  await page.locator('#secondaryAction').click();await page.waitForTimeout(350);assert.equal(await page.locator('#targetCard').isVisible(),false);
  const layouts=[];
  for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:390,height:844},{width:375,height:667}]){
    await page.setViewportSize(viewport);
    await page.evaluate(async()=>{const g=window.__game,{visualRadius}=await import('/model.js');g.cancelTarget();g.state.camera={x:0,y:0};g.state.zoom=45/visualRadius(g.state.system.star.diameter);g.select(g.state.system.star);g.positionContext();g.backdrop(0);g.drawSystem(0);});
    await page.waitForTimeout(600);
    const compact=await page.locator('#targetCard').evaluate(e=>e.getBoundingClientRect().toJSON());assert.ok(compact.width<=280&&compact.width>=260,JSON.stringify(compact));
    assert.equal(await page.locator('#secondaryAction').textContent(),'Open Terminal');
    await page.screenshot({path:`.qa/${engine}-1124-collapsed-${viewport.width}.png`});
    await page.locator('#secondaryAction').click();await page.waitForTimeout(350);
    await page.evaluate(()=>{const g=window.__game;g.updateTerminal(g.state.terminal.start+12000);g.updateTerminal(g.state.terminal.start+13000);});
    await page.locator('#terminalInput').focus();await page.waitForTimeout(350);
    const fit=await page.evaluate(()=>{
      const card=document.getElementById('targetCard'),screen=document.getElementById('terminalScreen'),bar=document.getElementById('terminalInputBar'),keyboard=document.getElementById('terminalKeyboard'),r=card.getBoundingClientRect();
      const before=bar.getBoundingClientRect().top;screen.scrollTop=screen.scrollHeight;const after=bar.getBoundingClientRect().top;
      return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,keyboardBottom:keyboard.getBoundingClientRect().bottom,keyboardHidden:keyboard.hidden,screenHeight:screen.clientHeight,scrolls:screen.scrollHeight>screen.clientHeight,barFixed:before===after,overflow:card.scrollWidth-card.clientWidth,inputFont:parseFloat(getComputedStyle(document.getElementById('terminalInput')).fontSize),scale:visualViewport.scale,border:getComputedStyle(card).borderTopWidth};
    });
    assert.ok(fit.left>=0&&fit.right<=viewport.width&&fit.top>=60&&fit.bottom<=viewport.height&&fit.keyboardBottom<=fit.bottom&&fit.screenHeight>=35&&fit.scrolls&&fit.barFixed&&!fit.keyboardHidden&&fit.inputFont>=16&&fit.scale===1&&fit.overflow<=1&&fit.border==='2px',JSON.stringify({viewport,fit}));layouts.push({viewport,compactWidth:compact.width,...fit});
    await page.screenshot({path:`.qa/${engine}-1124-keyboard-${viewport.width}.png`});
    await page.locator('[data-key="Done"]').click();assert.equal(await page.locator('#terminalKeyboard').isVisible(),false);
  }
  await page.locator('#terminalInput').fill('draft');await page.locator('#terminalInput').focus();
  await page.locator('[data-key="Space"]').click();await page.locator('[data-key="A"]').click();
  assert.equal(await page.locator('#terminalInput').inputValue(),'draft a');
  await page.locator('[data-key="Shift"]').click();await page.locator('[data-key="B"]').click();assert.equal(await page.locator('#terminalInput').inputValue(),'draft aB');
  await page.locator('[data-key="Backspace"]').click();assert.equal(await page.locator('#terminalInput').inputValue(),'draft a');
  await page.locator('#terminalInput').evaluate(e=>e.setSelectionRange(0,5));await page.locator('[data-key="C"]').click();assert.equal(await page.locator('#terminalInput').inputValue(),'C a');
  await page.keyboard.type('wasd');assert.equal(await page.locator('#terminalInput').inputValue(),'Cwasd a');
  assert.equal(await page.evaluate(()=>window.__game.state.keys.size),0,'Typing also steered the ship');
  await page.keyboard.press('Enter');assert.equal(await page.locator('#terminalKeyboard').isVisible(),false);
  await page.locator('#secondaryAction').click();await page.waitForTimeout(350);await page.locator('#terminalButton').click();await page.waitForTimeout(350);
  assert.equal(await page.locator('#terminalInput').inputValue(),'Cwasd a','Closing lost the text draft');
  await page.locator('#terminalInput').focus();await page.locator('[data-key="Clear"]').click();assert.equal(await page.locator('#terminalInput').inputValue(),'');
  await page.locator('#terminalInput').fill('x'.repeat(128));await page.locator('[data-key="A"]').click();assert.equal((await page.locator('#terminalInput').inputValue()).length,128);
  await page.locator('[data-key="Done"]').click();
  await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.settings.reducedMotion=true;g.applySettings();document.getElementById('terminalButton').click();g.updateTerminal(performance.now());});
  const reduced=await page.evaluate(()=>({full:window.__game.state.terminal.count===window.__game.state.terminal.text.length,transition:getComputedStyle(document.getElementById('terminalButton')).transitionDuration}));assert.ok(reduced.full&&reduced.transition==='0s',JSON.stringify(reduced));
  return {tracking,controls,immediate,standalone,layouts,draftEditing:true,reduced};
}
