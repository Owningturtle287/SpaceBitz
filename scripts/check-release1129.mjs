import assert from 'node:assert/strict';

export async function checkRelease1129(page,engine){
  await page.evaluate(async()=>{
    const g=window.__game,{makeSystem,visualRadius}=await import('/model.js');globalThis.__qaPause=true;
    g.cancelTarget();g.state.scene='system';g.state.system=makeSystem('sol');g.state.save.currentSystem='sol';g.state.terminalSize=null;
    g.state.camera={x:0,y:0};g.state.zoom=45/visualRadius(g.state.system.star.diameter);
    Object.assign(g.settings,{controls:'touch',centerButton:'right',joyX:16,joyOffset:0,dashboardHeight:68,terminalWidthScale:100,terminalHeightScale:100,reducedMotion:false,paused:true});g.applySettings();
  });
  const settle=async()=>{await page.waitForTimeout(320);await page.evaluate(async()=>{for(const id of ['terminalDock','terminalPocket','travelControls','journalButton','mapButton'])for(const a of document.getElementById(id).getAnimations({subtree:true}))if(Number.isFinite(a.effect.getComputedTiming().endTime))a.finish();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});};
  const layouts=[];
  for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:667,height:375},{width:390,height:844},{width:375,height:667},{width:320,height:568}]){
    await page.setViewportSize(viewport);
    for(const phase of ['closed','compact','expanded']){
      await page.evaluate(phase=>{const g=window.__game;g.cancelTarget();if(phase!=='closed')g.select(g.state.system.star);if(phase==='expanded')g.showDetails(g.state.selected);g.updateUI();g.backdrop(0);g.drawSystem(0);},phase);await settle();
      const fit=await page.evaluate(()=>{
        const r=id=>document.getElementById(id).getBoundingClientRect().toJSON(),deck=r('dashboardBase'),card=r('targetCard'),joy=r('joystick'),center=r('homeButton'),follow=r('followShipButton'),warp=r('mapButton'),log=r('journalButton'),term=r('terminalButton'),wrap=document.body.classList.contains('deck-wrap');
        const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top,inside=a=>a.left>=0&&a.right<=innerWidth&&a.top>=deck.top&&a.bottom<=deck.bottom;
        const visible=!document.getElementById('targetCard').hidden,controls=[joy,center,follow,warp,log,...(visible?[]:[term])],cy=a=>(a.top+a.bottom)/2;
        const row=+getComputedStyle(document.documentElement).getPropertyValue('--dashboard-row-height').replace('px',''),lower=innerHeight-row/2,upper=lower-row-4;
        return {deck,card,joy,center,follow,warp,log,term,wrap,contained:controls.every(inside),clear:controls.every((a,i)=>controls.slice(i+1).every(b=>!overlap(a,b)))&&(!visible||controls.every(a=>!overlap(a,card))),centered:controls.every(a=>Math.min(Math.abs(cy(a)-lower),wrap?Math.abs(cy(a)-upper):Infinity)<1),label:document.querySelector('.follow-label').textContent,rounded:getComputedStyle(document.getElementById('joystick')).borderBottomLeftRadius!=='0px'&&getComputedStyle(document.getElementById('targetCard')).borderBottomRightRadius!=='0px'};
      });
      assert.ok(fit.contained&&fit.clear&&fit.centered&&fit.rounded&&fit.joy.width===96&&fit.joy.height===64&&fit.center.width===56&&fit.center.height===52&&fit.follow.width===56&&fit.follow.height===52&&fit.label==='FOLLOW',JSON.stringify({viewport,phase,fit}));
      assert.ok(fit.warp.width>=(viewport.width<=600?60:64)&&fit.log.width===(phase==='closed'?44:32)&&viewport.width-(phase==='closed'?fit.term.right:fit.card.right)>=6,JSON.stringify(fit));
      if(phase==='compact')assert.ok(fit.card.height===66&&Math.abs(fit.card.bottom-viewport.height+2)<1&&(fit.wrap||Math.abs(fit.card.top-fit.deck.top)<1),JSON.stringify(fit));
      layouts.push({viewport,phase,deck:fit.deck.height,joystick:fit.joy,terminal:fit.card});await page.screenshot({path:`.qa/${engine}-1129-${phase}-${viewport.width}.png`});
    }
  }
  // Sample the actual concurrent device and action transitions, opening AND closing.
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>{const g=window.__game;g.select(g.state.system.star);});await settle();
  const paths=[];
  for(const opening of [true,false]){
    const path=await page.evaluate(opening=>{
      const g=window.__game,controls=document.getElementById('travelControls'),rect=()=>controls.getBoundingClientRect(),samples=[{x:rect().left,y:rect().top}];
      document.getElementById('secondaryAction').click();
      const animations=['terminalDock','terminalPocket','travelControls'].flatMap(id=>document.getElementById(id).getAnimations()).filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime));
      if(!animations.some(a=>a.transitionProperty==='right'))throw Error('Actions did not animate horizontally');
      for(const a of animations)a.pause();
      for(const fraction of [.1,.3,.6,.9,1]){for(const a of animations)a.currentTime=a.effect.getComputedTiming().endTime*fraction;samples.push({x:rect().left,y:rect().top});}
      for(const a of animations)a.finish();return {opening,samples};
    },opening);
    const first=path.samples[0];assert.ok(path.samples.every((p,i)=>Math.abs(p.y-first.y)<.1&&(!i||(opening?p.x<=path.samples[i-1].x:p.x>=path.samples[i-1].x))),JSON.stringify(path));paths.push(path);await settle();
  }
  const jr=await page.locator('#joystick').boundingBox();await page.mouse.move(jr.x+jr.width/2,jr.y+jr.height/2);await page.mouse.down();await page.mouse.move(jr.x+jr.width+80,jr.y+jr.height+80);
  const thumb=await page.evaluate(()=>{const r=id=>document.getElementById(id).getBoundingClientRect(),a=r('joystick'),b=r('stick'),j=window.__game.state.joy;return {inside:b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom,signal:Math.hypot(j.x,j.y)};});assert.ok(thumb.inside&&Math.abs(thumb.signal-1)<.00001,JSON.stringify(thumb));await page.mouse.up();assert.equal(await page.evaluate(()=>Math.hypot(window.__game.state.joy.x,window.__game.state.joy.y)),0);
  // Check the shorter timer in all layers, resetting it with another real drag.
  const following=[];
  for(const scene of ['system','chart','surface']){
    await page.evaluate(scene=>{const g=window.__game;g.cancelTarget();if(scene==='chart')g.enterChart();else if(scene==='surface')g.enterSurface(g.state.system.planets.find(p=>p.name==='Earth'));else g.state.scene='system';g.state.followShip=true;g.state.followPanRemaining=0;g.state.centerZoom=g.state.autopilot=g.state.followBody=null;g.settings.paused=true;g.state.zoom=1;g.updateUI();},scene);await settle();
    const pan=async()=>{await page.mouse.move(410,160);await page.mouse.down();await page.mouse.move(450,180,{steps:3});await page.mouse.up();};await pan();
    assert.equal(await page.evaluate(()=>window.__game.state.followPanRemaining),2000);await page.evaluate(()=>window.__game.update(1900,0));await pan();
    const result=await page.evaluate(()=>{const g=window.__game,s=g.state,from={...s.camera},zoom=s.zoom;g.update(1999,0);const waiting=s.followPanRemaining===1&&s.camera.x===from.x&&s.camera.y===from.y;g.update(1,0);const eased=s.centerZoom?.centerAction==='resume';g.update(650,0);const mid={...s.camera};g.update(650,0);const pos=s.scene==='surface'?s.save.surface:s.scene==='chart'?s.save.chart:s.save.ship;return {scene:s.scene,waiting,eased,mid,from,done:s.followShip&&!s.centerZoom&&s.camera.x===pos.x&&s.camera.y===pos.y,sameZoom:s.zoom===zoom};});assert.ok(result.waiting&&result.eased&&result.done&&result.sameZoom,JSON.stringify(result));following.push(result);
  }
  await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.state.followShip=false;g.applySettings();});return {layouts,paths,thumb,following};
}
