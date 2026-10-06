import assert from 'node:assert/strict';

export async function checkRelease11210(page,engine){
  await page.evaluate(async()=>{
    const g=window.__game,{makeSystem}=await import('/model.js');globalThis.__qaPause=true;
    g.cancelTarget();g.state.scene='system';g.state.system=makeSystem('sol');g.state.terminalSize=null;
    Object.assign(g.settings,{controls:'touch',centerButton:'right',joyX:16,joyOffset:0,dashboardHeight:68,terminalWidthScale:100,terminalHeightScale:100,reducedMotion:false});g.applySettings();
  });
  const settle=async()=>{await page.waitForTimeout(350);await page.evaluate(async()=>{for(const id of ['terminalDock','terminalPocket','travelControls'])for(const a of document.getElementById(id).getAnimations({subtree:true}))if(Number.isFinite(a.effect.getComputedTiming().endTime))a.finish();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});};
  const layouts=[];
  for(const viewport of [{width:844,height:390,bottom:21,right:47},{width:667,height:375,bottom:21,right:47},{width:390,height:844,bottom:34,right:0},{width:320,height:568,bottom:0,right:0}]){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await page.evaluate(({bottom,right})=>{document.documentElement.style.setProperty('--dashboard-safe-bottom',bottom+'px');document.getElementById('terminalDock').style.setProperty('--deck-safe-right',right+'px');const g=window.__game;g.cancelTarget();g.select(g.state.system.star);g.applySettings();g.backdrop(0);g.drawSystem(0);},viewport);await settle();
    const fit=await page.evaluate(()=>{
      const r=id=>document.getElementById(id).getBoundingClientRect().toJSON(),deck=r('dashboardBase'),joy=r('joystick'),card=r('targetCard'),meta=document.querySelector('.terminal-meta').getBoundingClientRect(),radius=(id,corner)=>getComputedStyle(document.getElementById(id))[corner].split(' ').map(parseFloat),R=radius('dashboardBase','borderBottomRightRadius')[0],j=radius('joystick','borderBottomLeftRadius'),t=radius('targetCard','borderBottomRightRadius');
      const centers={deckLeft:{x:deck.left+R,y:deck.bottom-R},joystick:{x:joy.left+j[0],y:joy.bottom-(j[1]??j[0])},deckRight:{x:deck.right-R,y:deck.bottom-R},terminal:{x:card.right-t[0],y:card.bottom-(t[1]??t[0])}};
      const safe=+getComputedStyle(document.documentElement).getPropertyValue('--dashboard-safe-bottom').replace('px',''),row=+getComputedStyle(document.documentElement).getPropertyValue('--dashboard-row-height').replace('px',''),wrap=document.body.classList.contains('deck-wrap'),overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
      const controls=['homeButton','followShipButton','mapButton','journalButton'].map(r);
      return {deck,joy,card,centers,safe,row,wrap,clear:controls.every(a=>!overlap(a,card)),textSafe:meta.bottom<=innerHeight-safe-2,controlsSafe:controls.every(a=>a.bottom<=innerHeight-safe),topAligned:Math.abs(card.top-(wrap?innerHeight-safe-row:deck.top))<.1};
    });
    for(const [a,b] of [['deckLeft','joystick'],['deckRight','terminal']])assert.ok(Math.abs(fit.centers[a].x-fit.centers[b].x)<.1&&Math.abs(fit.centers[a].y-fit.centers[b].y)<.1,JSON.stringify({viewport,fit}));
    assert.ok(fit.clear&&fit.textSafe&&fit.controlsSafe&&fit.topAligned&&fit.joy.width===96&&fit.joy.height===fit.row+viewport.bottom-7&&Math.abs(fit.card.right-viewport.width+3)<.1&&Math.abs(fit.card.bottom-viewport.height+3)<.1&&Math.abs(fit.card.height-(fit.row+viewport.bottom-3))<.1,JSON.stringify({viewport,fit}));
    await page.screenshot({path:`.qa/${engine}-11210-compact-${viewport.width}.png`});
    await page.evaluate(()=>window.__game.showDetails(window.__game.state.selected));await settle();
    const expanded=await page.locator('#targetCard').evaluate(e=>{const a=e.getBoundingClientRect(),deck=document.getElementById('dashboardBase').getBoundingClientRect(),safe=+getComputedStyle(document.documentElement).getPropertyValue('--dashboard-safe-bottom').replace('px','');return {right:innerWidth-a.right,bottom:innerHeight-a.bottom,safe,deckHeight:deck.height-safe,wrap:document.body.classList.contains('deck-wrap'),radius:getComputedStyle(e).borderBottomRightRadius};});
    assert.ok(Math.abs(expanded.right-3)<.1&&Math.abs(expanded.bottom-(3+(expanded.wrap?expanded.deckHeight:0)))<.1&&parseFloat(expanded.radius)>30,JSON.stringify(expanded));layouts.push({viewport,fit,expanded});
  }
  await page.evaluate(()=>{document.documentElement.style.removeProperty('--dashboard-safe-bottom');document.getElementById('terminalDock').style.removeProperty('--deck-safe-right');window.__game.cancelTarget();window.__game.applySettings();});
  return {layouts};
}
