import assert from 'node:assert/strict';

export async function checkRelease11211(page,engine){
  const settle=async()=>{await page.waitForTimeout(350);await page.evaluate(async()=>{for(const id of ['terminalDock','terminalPocket','travelControls'])for(const a of document.getElementById(id).getAnimations({subtree:true}))if(Number.isFinite(a.effect.getComputedTiming().endTime))a.finish();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});};
  const layouts=[];
  for(const viewport of [{width:1440,height:900,bottom:0,right:0},{width:844,height:390,bottom:21,right:47},{width:667,height:375,bottom:21,right:47},{width:390,height:844,bottom:34,right:0},{width:320,height:568,bottom:0,right:0}]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await page.evaluate(async({bottom,right})=>{
      const g=window.__game,{makeSystem,visualRadius}=await import('/model.js');globalThis.__qaPause=true;
      g.cancelTarget();g.state.scene='system';g.state.system=makeSystem('sol');g.state.terminalSize=null;g.state.camera={x:0,y:0};g.state.zoom=45/visualRadius(g.state.system.star.diameter);
      Object.assign(g.settings,{controls:'touch',centerButton:'right',joyX:16,joyOffset:0,dashboardHeight:68,terminalWidthScale:100,terminalHeightScale:100,reducedMotion:false,terminalResizeHandles:false});
      document.documentElement.style.setProperty('--dashboard-safe-bottom',bottom+'px');document.getElementById('terminalDock').style.setProperty('--deck-safe-right',right+'px');g.applySettings();g.select(g.state.system.star);g.backdrop(0);g.drawSystem(0);
    },viewport);await settle();
    const base=await page.evaluate(()=>{
      const r=id=>document.getElementById(id).getBoundingClientRect().toJSON(),joy=r('joystick'),deck=r('dashboardBase'),card=r('targetCard'),row=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dashboard-row-height')),wrap=document.body.classList.contains('deck-wrap');
      return {joy,deck,card,top:wrap?innerHeight-row-parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dashboard-safe-bottom')):deck.top,shadow:getComputedStyle(document.getElementById('joystick')).boxShadow,radius:getComputedStyle(document.getElementById('targetCard')).borderBottomRightRadius,thumb:r('stick')};
    });
    assert.ok(Math.abs(base.joy.top-base.top-3)<.1&&Math.abs(base.deck.bottom-base.joy.bottom-4)<.1&&base.shadow.split(/, (?![^()]*\))/).every(s=>s.includes('inset'))&&base.thumb.width===32&&base.thumb.height===32,JSON.stringify({viewport,base}));
    await page.locator('#secondaryAction').click();await settle();
    const inspect=()=>page.evaluate(()=>{
      const card=document.getElementById('targetCard'),r=card.getBoundingClientRect(),radius=parseFloat(getComputedStyle(card).borderBottomRightRadius),safe=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dashboard-safe-bottom'));
      const keys=[...document.querySelectorAll('#terminalInputBar button,#terminalKeyboard:not([hidden]) button')],pointFits=(x,y)=>x>=r.left+2&&x<=r.right-2&&y>=r.top+2&&y<=r.bottom-2&&(x<=r.right-radius||y<=r.bottom-radius||Math.hypot(x-r.right+radius,y-r.bottom+radius)<=radius-2);
      const clear=keys.every(button=>{const b=button.getBoundingClientRect();return [[b.left+4,b.top+4],[b.right-4,b.top+4],[b.left+4,b.bottom-4],[b.right-4,b.bottom-4]].every(([x,y])=>pointFits(x,y)&&document.elementFromPoint(x,y)?.closest('button')===button);});
      const wrap=document.body.classList.contains('deck-wrap'),fold=wrap?parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dashboard-height')):0,bar=document.getElementById('terminalInputBar').getBoundingClientRect();
      return {radius:radius+'px',card:r.toJSON(),clear,safeInput:keys.every(b=>b.getBoundingClientRect().bottom<=innerHeight-safe-fold),inputWidth:document.getElementById('terminalInput').getBoundingClientRect().width,screen:document.getElementById('terminalScreen').clientHeight,barTop:bar.top,keyboard:!document.getElementById('terminalKeyboard').hidden};
    });
    const closedKeyboard=await inspect();assert.ok(closedKeyboard.radius===base.radius&&closedKeyboard.clear&&closedKeyboard.safeInput&&closedKeyboard.inputWidth>=70&&closedKeyboard.screen>=35,JSON.stringify({viewport,closedKeyboard}));
    await page.locator('#terminalKeyboardToggle').click();await settle();
    const openKeyboard=await inspect();assert.ok(openKeyboard.keyboard&&openKeyboard.radius===base.radius&&openKeyboard.clear&&openKeyboard.safeInput&&openKeyboard.screen>=35,JSON.stringify({viewport,openKeyboard}));
    await page.locator('#terminalInput').fill('abc');await page.locator('#terminalDelete').click();assert.equal(await page.locator('#terminalInput').inputValue(),'ab');
    await page.screenshot({path:`.qa/${engine}-11211-keyboard-${viewport.width}.png`});
    await page.locator('[data-key="Enter"]').click();await settle();
    const scrolling=await page.evaluate(()=>{const g=window.__game;g.updateTerminal(g.state.terminal.start+15000);const screen=document.getElementById('terminalScreen'),bar=document.getElementById('terminalInputBar'),before=bar.getBoundingClientRect().top;screen.scrollTop=screen.scrollHeight;return before===bar.getBoundingClientRect().top;});assert.ok(scrolling,'Curved input deck moved with text scrolling');
    layouts.push({viewport,base,closedKeyboard,openKeyboard});
    if(viewport.width===844){
      await page.evaluate(()=>{window.__game.settings.terminalResizeHandles=true;window.__game.updateUI();});await settle();
      const before=await page.locator('#targetCard').boundingBox();
      await page.locator('#terminalResizeLeft').press('ArrowLeft');await settle();await page.locator('#terminalResizeTop').press('ArrowDown');await settle();
      const after=await page.locator('#targetCard').boundingBox();assert.ok(Math.abs(after.width-before.width-12)<.1&&Math.abs(after.height-before.height+12)<.1,JSON.stringify({before,after}));
      await page.locator('#terminalResizeLeft').press('ArrowRight');await settle();await page.locator('#terminalResizeTop').press('ArrowUp');await settle();
      const restored=await page.locator('#targetCard').boundingBox();assert.ok(Math.abs(restored.width-before.width)<.1&&Math.abs(restored.height-before.height)<.1,'Phone inset accumulated during terminal resizing');
    }
  }
  await page.evaluate(()=>{document.documentElement.style.removeProperty('--dashboard-safe-bottom');document.getElementById('terminalDock').style.removeProperty('--deck-safe-right');const g=window.__game;g.cancelTarget();g.state.terminalSize=null;g.settings.terminalResizeHandles=false;g.applySettings();});
  return {layouts};
}
