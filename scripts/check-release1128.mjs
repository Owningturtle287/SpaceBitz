import assert from 'node:assert/strict';

export async function checkRelease1128(page,engine){
  await page.evaluate(async()=>{
    const g=window.__game,{makeSystem,visualRadius}=await import('/model.js');globalThis.__qaPause=true;
    g.cancelTarget();g.state.system=makeSystem('sol');g.state.save.currentSystem='sol';g.state.scene='system';
    g.state.camera={x:0,y:0};g.state.zoom=45/visualRadius(g.state.system.star.diameter);g.state.terminalSize=null;
    Object.assign(g.settings,{dashboardHeight:74,terminalWidthScale:100,terminalHeightScale:100,joyOffset:0,joyX:16,controls:'touch',centerButton:'right',reducedMotion:false});g.applySettings();
  });
  const settle=async()=>{await page.waitForTimeout(400);await page.evaluate(async()=>{for(const id of ['terminalDock','terminalPocket','travelControls','journalButton','mapButton'])for(const a of document.getElementById(id).getAnimations({subtree:true}))if(Number.isFinite(a.effect.getComputedTiming().endTime))a.finish();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);window.__game.positionContext();});};
  const layouts=[];
  for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:667,height:375},{width:390,height:844},{width:375,height:667},{width:320,height:568}]){
    await page.setViewportSize(viewport);
    for(const expanded of [false,true]){
      await page.evaluate(expanded=>{const g=window.__game;g.select(g.state.system.star);if(expanded)g.showDetails(g.state.selected);g.applySettings();g.backdrop(0);g.drawSystem(0);},expanded);await settle();
      const fit=await page.evaluate(()=>{
        const r=id=>document.getElementById(id).getBoundingClientRect().toJSON(),card=r('targetCard'),deck=r('dashboardBase'),travel=r('travelControls'),lever=r('primaryAction'),cancel=r('cancelTravel'),warp=r('mapButton'),name=r('contextActions');
        const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top,controls=['joystick','navigationControls','mapButton','journalButton'].map(r);
        return {card,deck,travel,lever,cancel,warp,name,clear:controls.every(a=>!overlap(a,travel))&&!overlap(card,travel),onScreen:travel.left>=0&&travel.right<=innerWidth&&travel.top>=60&&travel.bottom<=innerHeight,nameOnly:!document.getElementById('contextActions').querySelector('button'),pixel:document.querySelector('#primaryAction svg').getAttribute('shape-rendering')==='crispEdges',red:getComputedStyle(document.getElementById('cancelTravel')).backgroundImage.includes('88, 30, 43'),radius:parseFloat(getComputedStyle(document.getElementById('dashboardBase')).borderBottomRightRadius)};
      });
      assert.ok(fit.clear&&fit.onScreen&&fit.nameOnly&&fit.pixel&&fit.red&&fit.radius>=36&&fit.lever.width<fit.warp.width&&fit.lever.height<fit.warp.height,JSON.stringify({viewport,expanded,fit}));
      if(expanded)assert.ok(fit.travel.right<fit.card.left&&fit.travel.bottom>fit.card.top,JSON.stringify(fit));
      else assert.ok(Math.abs(fit.card.top-fit.deck.top)<1&&fit.travel.bottom<fit.card.top&&fit.deck.height===(viewport.width<700&&viewport.height>viewport.width?118:74),JSON.stringify(fit));
      layouts.push({viewport,expanded,deck:fit.deck.height,travel:fit.travel,terminal:fit.card});await page.screenshot({path:`.qa/${engine}-1128-${expanded?'open':'compact'}-${viewport.width}.png`});
    }
  }
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{document.getElementById('terminalDock').style.setProperty('--deck-safe-right','47px');const g=window.__game;g.select(g.state.system.star);});await settle();
  const safe=await page.locator('#targetCard').evaluate(e=>({right:innerWidth-e.getBoundingClientRect().right,top:e.getBoundingClientRect().top,deck:document.getElementById('dashboardBase').getBoundingClientRect().top}));
  assert.ok(safe.right<=8&&safe.right>=0&&Math.abs(safe.top-safe.deck)<1,JSON.stringify(safe));
  await page.evaluate(()=>document.getElementById('terminalDock').style.removeProperty('--deck-safe-right'));
  const slide=await page.evaluate(()=>{
    const g=window.__game,controls=document.getElementById('travelControls'),from=controls.getBoundingClientRect().left;g.showDetails(g.state.selected);void controls.offsetWidth;
    const a=controls.getAnimations().find(a=>a.transitionProperty==='right');if(!a)throw Error('Docked actions did not slide left');a.pause();a.currentTime=a.effect.getTiming().duration/2;
    const mid=controls.getBoundingClientRect().left;a.finish();return {from,mid,to:controls.getBoundingClientRect().left};
  });assert.ok(slide.to<slide.mid&&slide.mid<slide.from,JSON.stringify(slide));await settle();
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
  return {layouts,safe,slide,surfaces,reduced,selectionControlsDocked:true};
}
