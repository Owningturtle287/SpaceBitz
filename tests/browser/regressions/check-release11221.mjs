import assert from 'node:assert/strict';

export async function checkRelease11221(page,engine){
  const tap=async locator=>{await locator.click({trial:true});const r=await locator.boundingBox();await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);};
  const capture=async name=>{
    const image=await page.screenshot({path:`.qa/${engine}-11221-${name}.png`});
    if(engine==='webkit'&&process.env.QA_LAYOUT_PREVIEW==='true'){
      const data=image.toString('base64');for(let i=0;i<data.length;i+=6000)console.log(`QA_PREVIEW:${name}:${i/6000}:${data.slice(i,i+6000)}`);
    }
  };
  await page.setViewportSize({width:844,height:390});
  const trail=await page.evaluate(async()=>{
    const g=window.__game,{DEFAULT_SETTINGS}=await import('/src/core/settings.js');Object.assign(g.settings,DEFAULT_SETTINGS,{music:false,paused:true,controls:'touch',reducedMotion:true});
    g.create(true);g.launch();g.enterChart();const first=g.nearbyStars().find(s=>s.seed!==g.state.save.homeSeed);g.enterSystem(first);
    const route=[...g.state.save.route];g.enterChart();
    const ctx=document.getElementById('sky').getContext('2d'),stroke=ctx.stroke;let calls=0;ctx.stroke=function(...args){calls++;return stroke.apply(this,args);};
    g.settings.travelLines=false;g.drawChart(0);const off=calls;calls=0;g.settings.travelLines=true;g.drawChart(0);const count=calls-off;ctx.stroke=stroke;g.enterSystem({seed:'sol',x:0,y:0});
    const earth=g.state.system.planets.find(p=>p.name==='Earth');
    g.clearTerminal();for(const body of [earth,earth.moons[0],g.state.system.star]){g.select(body);g.showDetails(body);g.updateTerminal(performance.now());}
    await g.persist();return {route,home:g.state.save.homeSeed,first:first.seed,count,id:g.state.save.id};
  });
  assert.deepEqual(trail.route,[trail.home,trail.first]);assert.equal(trail.count,1);
  const layouts=[];
  for(const physical of [{width:844,height:390},{width:390,height:844},{width:667,height:375},{width:375,height:667},{width:1024,height:768},{width:768,height:1024},{width:600,height:600},{width:844,height:390}]){
    await page.setViewportSize(physical);
    await page.waitForFunction(v=>{const g=window.__game;return g.state.width===Math.max(v.width,v.height)&&g.state.height===Math.min(v.width,v.height)&&document.getElementById('gameViewport').dataset.rotated===String(v.height>v.width);},physical);
    await page.evaluate(async()=>{const g=window.__game;g.frame(performance.now());await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    await page.waitForFunction(()=>['homeButton','followShipButton','flightSpeed','secondaryAction'].every(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2)?.closest('button,input')?.id===id;}));
    const layout=await page.evaluate(async()=>{
      const {gameRect}=await import('/src/core/viewport.js'),g=window.__game,el=id=>document.getElementById(id),r=id=>gameRect(el(id)),deck=r('dashboardBase'),joy=r('joystick'),terminal=r('targetCard'),speed=r('mapButton');
      const radius=id=>parseFloat(getComputedStyle(el(id)).borderBottomLeftRadius),rightRadius=id=>parseFloat(getComputedStyle(el(id)).borderBottomRightRadius),d=radius('dashboardBase');
      const controls=['homeButton','followShipButton','flightSpeed','secondaryAction'].map(id=>{const e=el(id),a=e.getBoundingClientRect();return {id,hit:document.elementFromPoint((a.left+a.right)/2,(a.top+a.bottom)/2)?.closest('button,input')?.id};});
      const canvas=el('sky'),m=canvas.getContext('2d').getTransform(),image=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      return {width:g.state.width,height:g.state.height,canvas:[canvas.width,canvas.height],dpr:g.state.dpr,matrix:[m.a,m.b,m.c,m.d,m.e,m.f],painted:image.some((value,i)=>i%4===3&&value>0),clock:r('flightReadout').width,clockOverflow:el('flightReadout').scrollWidth>el('flightReadout').clientWidth,speedTop:speed.top-deck.top,speedBottom:speed.bottom-deck.bottom,joyWidth:joy.width,joyCenter:[joy.left+radius('joystick')-(deck.left+d),joy.bottom-radius('joystick')-(deck.bottom-d)],terminalCenter:[terminal.right-rightRadius('targetCard')-(deck.right-d),terminal.bottom-rightRadius('targetCard')-(deck.bottom-d)],controls};
    });
    assert.equal(layout.width,Math.max(physical.width,physical.height));assert.deepEqual(layout.canvas,[layout.width*layout.dpr,layout.height*layout.dpr]);assert.deepEqual(layout.matrix,[layout.dpr,0,0,layout.dpr,0,0]);assert.ok(layout.painted);
    assert.ok(layout.clock<=155&&!layout.clockOverflow,JSON.stringify(layout));assert.ok(Math.abs(layout.speedTop)<1&&Math.abs(layout.speedBottom)<1,JSON.stringify(layout));assert.ok(layout.joyWidth>=108);
    assert.ok([...layout.joyCenter,...layout.terminalCenter].every(n=>Math.abs(n)<1.1),JSON.stringify(layout));assert.ok(layout.controls.every(c=>c.hit===c.id),JSON.stringify(layout));
    // Pointer movement follows the landscape axis even when CSS rotates the UI.
    const drag=await page.evaluate(async()=>{const {viewport:v,gameRect}=await import('/src/core/viewport.js'),r=gameRect(document.getElementById('joystick')),x=r.left+r.width/2,y=r.top+r.height/2,point=(x,y)=>v.rotated?{x:v.physicalWidth-y+v.left,y:x+v.top}:{x:x+v.left,y:y+v.top};return {a:point(x,y),b:point(x+16,y)};});
    await page.mouse.move(drag.a.x,drag.a.y);await page.mouse.down();await page.mouse.move(drag.b.x,drag.b.y);
    const steer=await page.evaluate(()=>({...window.__game.state.joy}));assert.ok(steer.x>0&&Math.abs(steer.y)<.01,JSON.stringify({physical,steer}));await page.mouse.up();
    const pan=await page.evaluate(async()=>{const {viewport:v}=await import('/src/core/viewport.js'),x=v.width*.35,y=Math.max(90,v.height*.35),point=(x,y)=>v.rotated?{x:v.physicalWidth-y+v.left,y:x+v.top}:{x:x+v.left,y:y+v.top};return {a:point(x,y),b:point(x+12,y),before:window.__game.state.camera.x};});
    await page.mouse.move(pan.a.x,pan.a.y);await page.mouse.down();assert.equal(await page.evaluate(()=>window.__game.inputPointerCount()),1);await page.mouse.move(pan.b.x,pan.b.y);await page.mouse.up();
    assert.ok(await page.evaluate(before=>window.__game.state.camera.x<before,pan.before));assert.equal(await page.evaluate(()=>window.__game.inputPointerCount()),0);
    await page.evaluate(()=>window.__game.frame(performance.now()));
    if(physical.width===844&&layouts.length===0)await capture('dashboard');
    await tap(page.locator('#settingsOpen'));
    const settings=await page.locator('.modal-card').evaluate(e=>{const r=e.getBoundingClientRect(),overlay=document.getElementById('modal'),close=document.getElementById('modalClose'),b=close.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,background:getComputedStyle(overlay).backgroundColor,rounded:parseFloat(getComputedStyle(e).borderTopLeftRadius),hit:document.elementFromPoint((b.left+b.right)/2,(b.top+b.bottom)/2)?.closest('button')?.id,overflow:e.scrollWidth>e.clientWidth};});
    assert.ok(Math.abs(settings.x)<1&&Math.abs(settings.y)<1&&Math.abs(settings.width-physical.width)<1&&Math.abs(settings.height-physical.height)<1,JSON.stringify(settings));assert.ok(settings.rounded>=36&&!settings.overflow);assert.equal(settings.background,'rgb(16, 30, 50)');assert.equal(settings.hit,'modalClose');
    if(physical.width===844&&layouts.length===0)await capture('settings');await tap(page.locator('#modalClose'));
    await tap(page.locator('#journalButton'));await page.waitForFunction(()=>!document.getElementById('journalContent').hasAttribute('aria-busy'));
    const log=await page.locator('#journalPanel').evaluate(e=>{const r=e.getBoundingClientRect(),b=document.getElementById('journalClose').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,background:getComputedStyle(document.getElementById('journal')).backgroundColor,hit:document.elementFromPoint((b.left+b.right)/2,(b.top+b.bottom)/2)?.closest('button')?.id};});
    assert.ok(Math.abs(log.x)<1&&Math.abs(log.y)<1&&Math.abs(log.width-physical.width)<1&&Math.abs(log.height-physical.height)<1,JSON.stringify(log));assert.equal(log.background,'rgb(3, 17, 13)');assert.equal(log.hit,'journalClose');
    for(const filter of ['star','planet','moon']){await tap(page.locator(`[data-filter="${filter}"]`));await page.waitForFunction(value=>document.querySelector(`[data-filter="${value}"]`).getAttribute('aria-pressed')==='true',filter);await page.waitForFunction(()=>!document.getElementById('journalContent').hasAttribute('aria-busy'));assert.equal(await page.locator('.journal-entry.action').count(),0);assert.equal(await page.locator('.object-survey').count(),1);}
    await tap(page.locator('[data-filter="all"]'));await page.waitForFunction(()=>document.querySelector('[data-filter="all"]').getAttribute('aria-pressed')==='true');await page.waitForFunction(()=>!document.getElementById('journalContent').hasAttribute('aria-busy'));
    if(physical.width===844&&layouts.length===0)await capture('log');await tap(page.locator('#journalClose'));layouts.push({physical,...layout});
  }
  await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=false;g.applySettings();});await tap(page.locator('#systemChartToggle'));
  const animation=await page.locator('.mission-drop-sheet').evaluate(e=>e.getAnimations().map(a=>({name:a.animationName,duration:a.effect.getTiming().duration})));assert.ok(animation.some(a=>a.name==='chart-unfold'&&a.duration>=300));await page.locator('.mission-drop-sheet').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));await tap(page.locator('#systemChartToggle'));
  await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=true;g.applySettings();g.openSettings();});
  await page.getByRole('button',{name:'SAVE & MAIN MENU',exact:true}).click();await page.waitForFunction(()=>window.__game.state.save===null);await page.locator('#startGame').click();
  const row=page.locator(`[data-voyage-id="${trail.id}"]`);await row.waitFor();const count=await page.locator('.save-row').count();const native=[];page.on('dialog',dialog=>{native.push(dialog.message());dialog.dismiss();});
  await tap(row.locator('.delete-save'));assert.equal(await page.locator('#modal').getAttribute('role'),'alertdialog');assert.equal(await page.getByRole('button',{name:'KEEP VOYAGE'}).evaluate(e=>e===document.activeElement),true);
  await page.getByRole('button',{name:'KEEP VOYAGE'}).click();assert.equal(await page.locator('.save-row').count(),count);
  await tap(row.locator('.delete-save'));await page.getByRole('button',{name:'DELETE VOYAGE',exact:true}).click();await row.waitFor({state:'detached'});assert.equal(await page.locator('.save-row').count(),count-1);assert.deepEqual(native,[]);
  return {firstTravelLeg:true,surveyOnlyFilters:true,themedDeletion:true,chartAnimation:true,layouts};
}
