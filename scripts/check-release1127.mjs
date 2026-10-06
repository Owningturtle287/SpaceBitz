import assert from 'node:assert/strict';

export async function checkRelease1127(page,engine){
  await page.setViewportSize({width:1440,height:900});
  await page.evaluate(async()=>{
    const g=window.__game,{makeSystem,visualRadius}=await import('/model.js');globalThis.__qaPause=true;
    g.cancelTarget();g.state.scene='system';g.state.system=makeSystem('sol');g.state.save.currentSystem='sol';g.state.terminalSize=null;
    g.state.camera={x:0,y:0};g.state.zoom=45/visualRadius(g.state.system.star.diameter);
    document.getElementById('terminalInput').value='';
    Object.assign(g.settings,{controls:'touch',centerButton:'right',joyX:16,joyOffset:0,dashboardHeight:80,terminalWidthScale:100,terminalHeightScale:100,dashboardResizeHandle:false,terminalResizeHandles:false,reducedMotion:false});
    g.applySettings();g.select(g.state.system.star);g.showDetails(g.state.selected);
  });await page.waitForTimeout(400);
  assert.equal(await page.locator('#terminalResizeTop').isVisible(),false);assert.equal(await page.locator('#terminalResizeLeft').isVisible(),false);assert.equal(await page.locator('#dashboardResize').isVisible(),false);
  // The chart hides the whole terminal while retaining the selected target.
  await page.locator('#systemChartToggle').click();assert.equal(await page.locator('#targetCard').isVisible(),false);assert.equal(await page.locator('#systemChartContent').isVisible(),true);
  await page.locator('#terminalButton').click();assert.equal(await page.locator('#systemChartContent').isVisible(),false);assert.equal(await page.locator('#targetCard').isVisible(),true);
  await page.locator('#systemChartToggle').click();
  await page.locator('#bodyList .body-entry').first().click();assert.equal(await page.locator('#systemChartContent').isVisible(),false);assert.equal(await page.locator('#targetCard').isVisible(),true);
  await page.locator('#secondaryAction').click();await page.waitForTimeout(400);
  await page.locator('#settingsOpen').click();
  const setRange=async(id,value)=>page.locator('#setting-'+id).evaluate((input,value)=>{input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));},value);
  assert.equal(await page.locator('#setting-terminalResizeHandles').isChecked(),false);assert.equal(await page.locator('#setting-dashboardResizeHandle').isChecked(),false);
  await setRange('dashboardHeight',160);await setRange('terminalWidthScale',120);await setRange('terminalHeightScale',80);
  await page.locator('#setting-terminalResizeHandles').check();await page.locator('#setting-dashboardResizeHandle').check();await page.locator('#modalClose').click();await page.waitForTimeout(450);
  const initial=await page.evaluate(()=>({deck:document.getElementById('dashboardBase').getBoundingClientRect().height,terminal:document.getElementById('targetCard').getBoundingClientRect().toJSON(),saved:JSON.parse(localStorage.getItem('spacebitz:field:settings'))}));
  assert.equal(initial.deck,160);assert.ok(Math.abs(initial.terminal.width-316.8)<1&&Math.abs(initial.terminal.height-504)<1,JSON.stringify(initial));
  assert.equal(initial.saved.dashboardHeight,160);assert.equal(initial.saved.terminalWidthScale,120);assert.equal(initial.saved.terminalHeightScale,80);
  for(const id of ['terminalResizeTop','terminalResizeLeft','dashboardResize'])assert.equal(await page.locator('#'+id).isVisible(),true);
  const keyboardResize=await page.evaluate(()=>{
    const g=window.__game,handle=document.getElementById('dashboardResize');g.state.keys.clear();
    handle.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));const raised=g.settings.dashboardHeight,steering=g.state.keys.size;
    handle.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));return {raised,steering,restored:g.settings.dashboardHeight};
  });assert.deepEqual(keyboardResize,{raised:172,steering:0,restored:160});
  const drag=async(id,dx,dy)=>{const r=await page.locator('#'+id).boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+dx,r.y+r.height/2+dy,{steps:6});await page.mouse.up();await page.waitForTimeout(350);};
  await drag('terminalResizeLeft',-48,0);await drag('terminalResizeTop',0,-36);await drag('dashboardResize',0,-28);
  const resized=await page.evaluate(()=>({deck:document.getElementById('dashboardBase').getBoundingClientRect().height,terminal:document.getElementById('targetCard').getBoundingClientRect().toJSON(),saved:JSON.parse(localStorage.getItem('spacebitz:field:settings'))}));
  assert.ok(Math.abs(resized.deck-188)<1&&Math.abs(resized.terminal.width-364.8)<1&&Math.abs(resized.terminal.height-540)<1,JSON.stringify(resized));
  assert.ok(resized.saved.terminalWidthScale>initial.saved.terminalWidthScale&&resized.saved.terminalHeightScale>initial.saved.terminalHeightScale&&resized.saved.dashboardHeight===188);
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(400);
  assert.ok(Math.abs((await page.locator('#targetCard').boundingBox()).height-390*.7*resized.saved.terminalHeightScale/100)<1,'Rotation did not apply the saved height scale');
  await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(400);
  await page.locator('#settingsOpen').click();await page.locator('#setting-terminalResizeHandles').uncheck();await page.locator('#setting-dashboardResizeHandle').uncheck();await page.locator('#modalClose').click();
  for(const id of ['terminalResizeTop','terminalResizeLeft','dashboardResize'])assert.equal(await page.locator('#'+id).isVisible(),false);
  await page.evaluate(()=>{const g=window.__game;g.state.terminalSize=null;g.applySettings();});await page.waitForTimeout(350);
  assert.ok(Math.abs((await page.locator('#targetCard').boundingBox()).width-resized.terminal.width)<1,'Saved width preference did not reconstruct the device');
  const layouts=[];
  for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:667,height:375},{width:390,height:844},{width:375,height:667},{width:320,height:568}]){
    await page.setViewportSize(viewport);
    for(const expanded of [false,true]){
      await page.evaluate(expanded=>{
        const g=window.__game;Object.assign(g.settings,{dashboardHeight:80,terminalWidthScale:100,terminalHeightScale:100});g.state.terminalSize=null;g.cancelTarget();g.select(g.state.system.star);if(expanded)g.showDetails(g.state.selected);g.applySettings();
        if(expanded){g.updateTerminal(g.state.terminal.start+12000);g.updateTerminal(g.state.terminal.start+14000);}g.backdrop(0);g.drawSystem(0);
      },expanded);await page.waitForTimeout(400);
      await page.evaluate(async()=>{for(const id of ['terminalDock','terminalPocket','journalButton','mapButton'])for(const a of document.getElementById(id).getAnimations())a.finish();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);window.__game.positionContext();});
      const fit=await page.evaluate(()=>{
        const r=id=>document.getElementById(id).getBoundingClientRect().toJSON(),card=r('targetCard'),deck=r('dashboardBase'),joy=r('joystick'),center=r('homeButton'),follow=r('followShipButton'),warp=r('mapButton'),log=r('journalButton'),clock=r('flightReadout'),chart=r('systemChart'),system=r('systemFit'),settings=r('settingsOpen');
        const inside=a=>a.left>=deck.left&&a.right<=deck.right&&a.top>=deck.top&&a.bottom<=deck.bottom,overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
        const controls=[joy,center,follow,warp,log];
        return {card,deck,joy,warp,log,contained:controls.every(inside)&&(window.__game.state.terminalExpanded||inside(card)),clear:controls.every((a,i)=>controls.slice(i+1).every(b=>!overlap(a,b)))&&controls.every(a=>!overlap(a,card)),vertical:Math.abs((joy.top+joy.bottom-center.top-center.bottom)/2)<1&&Math.abs((joy.top+joy.bottom-follow.top-follow.bottom)/2)<1,topOrder:clock.right<=system.left&&system.right<=chart.left&&chart.right<=settings.left,topFits:clock.left>=0&&settings.right<=innerWidth,rounded:parseFloat(getComputedStyle(document.getElementById('dashboardBase')).borderBottomRightRadius)>0&&getComputedStyle(document.getElementById('dashboardBase')).borderTopRightRadius==='0px',arrowHidden:document.getElementById('terminalResizeTop').hidden&&document.getElementById('dashboardResize').hidden};
      });
      assert.ok(fit.contained&&fit.clear&&fit.vertical&&fit.topOrder&&fit.topFits&&fit.rounded&&fit.arrowHidden&&fit.warp.right<fit.log.left&&fit.log.right<fit.card.left&&viewport.width-fit.card.right<=2&&Math.abs(fit.card.bottom-viewport.height+2)<1,JSON.stringify({viewport,expanded,fit}));
      assert.ok(fit.joy.width>=(viewport.width<700&&viewport.height>viewport.width?44:viewport.width<=600?60:64)&&fit.warp.width>=(viewport.width<=600?60:64),JSON.stringify(fit));
      layouts.push({viewport,expanded,width:fit.card.width,deck:fit.deck.height});await page.screenshot({path:`.qa/${engine}-1127-${expanded?'open':'compact'}-${viewport.width}.png`});
    }
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const g=window.__game;g.settings.terminalWidthScale=240;g.settings.terminalHeightScale=40;g.state.terminalSize=null;g.applySettings();});
  await page.locator('#terminalInput').focus();await page.waitForTimeout(400);
  const extreme=await page.evaluate(()=>({card:document.getElementById('targetCard').getBoundingClientRect().toJSON(),screen:document.getElementById('terminalScreen').clientHeight,keyboard:document.getElementById('terminalKeyboard').getBoundingClientRect().bottom}));
  assert.ok(extreme.card.left>=0&&extreme.card.right<=390&&extreme.screen>=35&&extreme.keyboard<=extreme.card.bottom,JSON.stringify(extreme));
  await page.screenshot({path:`.qa/${engine}-1127-scaled-keyboard.png`});
  await page.locator('[data-key="Enter"]').click();await page.evaluate(()=>{const g=window.__game;g.cancelTarget();Object.assign(g.settings,{dashboardHeight:80,terminalWidthScale:100,terminalHeightScale:100});g.state.terminalSize=null;g.applySettings();});
  return {defaultHandlesHidden:true,mutuallyExclusivePanels:true,initial,resized,layouts,extreme};
}
