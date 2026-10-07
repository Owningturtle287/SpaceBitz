import assert from 'node:assert/strict';

export async function checkRelease11215(page,engine){
  const settle=async()=>page.evaluate(async()=>{for(const id of ['terminalDock','terminalPocket','travelControls','mapButton','journalButton','journalPanel'])for(const a of document.getElementById(id).getAnimations({subtree:true}))if(Number.isFinite(a.effect.getComputedTiming().endTime))a.finish();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);window.__game.positionContext();});
  const exits=[];
  for(const viewport of [{width:667,height:375},{width:844,height:390},{width:1024,height:768}]){
    await page.setViewportSize(viewport);
    for(const joyX of [16,92])for(const button of ['homeButton','followShipButton']){
      await page.evaluate(async joyX=>{const g=window.__game,{makeSystem}=await import('/model.js');g.cancelTarget();g.state.scene='system';g.state.system=makeSystem('sol');g.state.save.currentSystem='sol';g.state.followShip=false;g.state.followBody=null;g.state.save.ship={x:1e7,y:1e7};Object.assign(g.settings,{reducedMotion:false,paused:true,joyX,centerButton:'right',controls:'touch'});g.applySettings();},joyX);await settle();
      // Complete a real slider-initiated exit, then tap before moving the ship.
      await page.locator('#flightSpeed').evaluate(e=>{e.value='2';e.dispatchEvent(new Event('input',{bubbles:true}));});
      await page.evaluate(()=>{const g=window.__game;g.state.warpUntil=performance.now()-1;g.update(1,0);});
      await page.evaluate(()=>new Promise(requestAnimationFrame));
      const position=await page.locator('#'+button).boundingBox();
      await page.touchscreen.tap(position.x+position.width/2,position.y+position.height/2);
      await page.evaluate(()=>{const g=window.__game;g.update(1300,0);g.updateUI();});
      assert.equal(await page.evaluate(()=>window.__game.state.scene),'chart');
      assert.equal(await page.evaluate(button=>Boolean(button==='homeButton'?window.__game.state.centerReady:window.__game.state.followShip),button),true,'Immediate camera tap did not activate');
      assert.equal(await page.evaluate(()=>window.__game.state.warpUntil),0);
      assert.equal(await page.locator('#flightSpeed').inputValue(),'2');assert.equal(await page.locator('#flightSpeed').isDisabled(),true);
      // A delayed input event from the old slider also cannot re-enter a system.
      await page.locator('#flightSpeed').evaluate(e=>{e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));});
      await page.evaluate(()=>window.__game.update(1300,0));
      assert.equal(await page.evaluate(()=>window.__game.state.scene),'chart');assert.equal(await page.evaluate(()=>window.__game.state.warpUntil),0);
      exits.push({viewport,joyX,button});
    }
  }
  // Entry is still available through the green target control.
  await page.evaluate(()=>{const g=window.__game;g.state.save.chart={x:g.state.selected.x,y:g.state.selected.y};g.primary();});
  assert.equal(await page.evaluate(()=>window.__game.state.scene),'system');
  await page.evaluate(()=>{const g=window.__game;g.clearTerminal();g.settings.joyX=16;g.settings.reducedMotion=false;g.state.terminalSize={width:264,height:180};g.applySettings();g.state.save.log=[];g.select(g.state.system.planets.find(p=>p.name==='Earth'));});await settle();
  assert.equal(await page.locator('#targetName').innerText(),'');
  assert.equal(await page.locator('#terminalMessages .terminal-record').count(),0);
  assert.equal(await page.evaluate(()=>window.__game.state.save.log.length),0);
  await page.locator('#secondaryAction').click();await settle();
  await page.evaluate(()=>{const g=window.__game;g.updateTerminal(g.state.terminal.start+200);});
  const partial=await page.evaluate(()=>window.__game.state.terminal.count);assert.ok(partial>0);
  assert.equal(await page.evaluate(()=>window.__game.state.save.log.length),0,'An unfinished survey was logged');
  await page.locator('#secondaryAction').click();
  await page.evaluate(()=>{const g=window.__game;g.updateTerminal(performance.now()+10000);g.notify('Hidden status');});
  assert.equal(await page.evaluate(()=>window.__game.state.terminal.count),partial,'Hidden output advanced');
  assert.equal(await page.evaluate(()=>window.__game.state.save.log.some(e=>e.kind==='object')),false);
  await page.locator('#secondaryAction').click();await settle();
  await page.evaluate(()=>{const g=window.__game;g.updateTerminal(g.state.terminal.start+15000);});
  assert.equal(await page.evaluate(()=>window.__game.state.save.log.filter(e=>e.kind==='object').length),1);
  const tail=await page.locator('#terminalScreen').evaluate(e=>({top:e.scrollTop,max:e.scrollHeight-e.clientHeight}));
  assert.ok(tail.top>0&&Math.abs(tail.top-tail.max)<2,JSON.stringify(tail));
  await page.evaluate(()=>{const g=window.__game;g.select(g.state.system.star);g.updateTerminal(performance.now()+20000);});
  assert.equal(await page.evaluate(()=>window.__game.state.save.log.filter(e=>e.kind==='object').length),1,'Selecting an unseen star created a survey');
  await page.locator('#secondaryAction').click();await page.evaluate(()=>{const g=window.__game;g.updateTerminal(g.state.terminal.start+15000);});
  await page.evaluate(()=>{const g=window.__game,earth=g.state.system.planets.find(p=>p.name==='Earth');g.select(earth.moons[0]);g.showDetails(g.state.selected);g.updateTerminal(g.state.terminal.start+15000);g.enterSurface(earth);g.select({kind:'sample',id:'qa:sample',name:'Surface sample',x:0,y:0});g.showDetails(g.state.selected);g.updateTerminal(g.state.terminal.start+15000);g.launch();g.notify('Visible status');g.showJournal();});await settle();
  assert.equal(await page.locator('#journalBranch').count(),0);
  assert.deepEqual(await page.locator('#journalFilters button').allTextContents(),['All','Stars','Planets','Moons','Items','Status Updates']);
  const filters={};
  for(const [name,category] of [['Stars','star'],['Planets','planet'],['Moons','moon'],['Items','item'],['Status Updates','status']]){
    await page.locator('#journalFilters').getByRole('button',{name,exact:true}).click();
    const categories=await page.locator('.journal-entry').evaluateAll(es=>es.map(e=>e.dataset.category));
    assert.ok(categories.length>0&&categories.every(c=>c===category),JSON.stringify({name,categories}));filters[name]=categories.length;
  }
  await page.locator('#journalFilters').getByRole('button',{name:'All',exact:true}).click();
  assert.equal(await page.locator('.journal-entry').count(),Object.values(filters).reduce((a,b)=>a+b,0));
  const corners=await page.locator('#journalPanel').evaluate(e=>{const s=getComputedStyle(e);return [s.borderTopLeftRadius,s.borderTopRightRadius,s.borderBottomLeftRadius,s.borderBottomRightRadius];});assert.ok(corners.every(c=>parseFloat(c)>=12));
  await page.evaluate(()=>window.__game.closeJournal());await settle();
  await page.evaluate(()=>{const g=window.__game;g.state.terminalSize=null;g.showDetails(g.state.system.star);g.updateTerminal(g.state.terminal.start+15000);g.settings.terminalResizeHandles=true;g.applySettings();});
  const layouts=[];
  for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:667,height:375}]){
    await page.setViewportSize(viewport);await settle();
    const geometry=await page.evaluate(()=>{const rect=id=>document.getElementById(id).getBoundingClientRect(),card=rect('targetCard'),screen=rect('terminalScreen'),close=rect('secondaryAction'),clear=rect('terminalClear');return {screenGap:card.right-screen.right,closeGap:card.right-close.right,buttonOrder:clear.right<=close.left,contentRight:document.querySelector('.terminal-record:last-of-type')?.getBoundingClientRect().right,screenRight:screen.right};});
    assert.ok(geometry.screenGap>=1&&geometry.screenGap<=3&&geometry.closeGap>=4&&geometry.closeGap<=10&&geometry.buttonOrder,JSON.stringify({viewport,geometry}));
    assert.ok(geometry.contentRight<geometry.screenRight-8,JSON.stringify(geometry));layouts.push({viewport,geometry});
    await page.screenshot({path:`.qa/${engine}-11215-terminal-${viewport.width}.png`});
    await page.evaluate(()=>window.__game.showJournal());await settle();await page.locator('#journalFilters').getByRole('button',{name:'Stars',exact:true}).click();await page.locator('.object-survey summary').first().click();await settle();
    await page.screenshot({path:`.qa/${engine}-11215-log-${viewport.width}.png`});
    await page.locator('#journalFilters').getByRole('button',{name:'All',exact:true}).click();
    await page.evaluate(()=>window.__game.closeJournal());await settle();
    await page.locator('#settingsOpen').click();
    const rounded=await page.locator('.modal-card').evaluate(e=>({radius:getComputedStyle(e).borderTopLeftRadius,clip:getComputedStyle(e).clipPath}));assert.ok(parseFloat(rounded.radius)>=12&&rounded.clip==='none');
    await page.screenshot({path:`.qa/${engine}-11215-settings-${viewport.width}.png`});await page.locator('#modalClose').click();
    await page.locator('#systemChartToggle').click();await settle();
    const chart=await page.locator('#systemChartContent').evaluate(e=>({gutter:getComputedStyle(e).scrollbarGutter,padding:getComputedStyle(e).paddingRight,listRight:document.getElementById('bodyList').getBoundingClientRect().right,edge:e.getBoundingClientRect().right}));assert.equal(chart.gutter,'stable');assert.equal(chart.padding,'2px');assert.ok(chart.edge-chart.listRight>=10);
    await page.screenshot({path:`.qa/${engine}-11215-chart-${viewport.width}.png`});
    await page.locator('#systemChartToggle').click();await page.evaluate(()=>{const g=window.__game;g.showDetails(g.state.system.star);g.updateTerminal(g.state.terminal.start+15000);});
  }
  return {immediateExitCameraActions:exits,visibleSurveysOnly:true,outputFollowsTail:true,filters,roundedMenus:true,edgeScrollbars:layouts};
}
