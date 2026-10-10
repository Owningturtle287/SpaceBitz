import assert from 'node:assert/strict';

export async function checkRelease11214(page,engine){
  const settleLog=async()=>page.evaluate(async()=>{for(const a of document.getElementById('journalPanel').getAnimations({subtree:true}))if(Number.isFinite(a.effect.getComputedTiming().endTime))a.finish();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
  const settle=async()=>{await page.waitForTimeout(350);await page.evaluate(async()=>{for(const id of ['terminalDock','terminalPocket','travelControls','mapButton','journalButton'])for(const a of document.getElementById(id).getAnimations({subtree:true}))if(Number.isFinite(a.effect.getComputedTiming().endTime))a.finish();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});};
  await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=false;g.settings.paused=true;g.settings.controls='touch';g.settings.joyX=92;g.settings.centerButton='right';g.enterChart();g.applySettings();});
  const follow=[];
  for(const viewport of [{width:667,height:375},{width:844,height:390},{width:1024,height:768}]){
    await page.setViewportSize(viewport);await settle();
    const layout=await page.evaluate(()=>{const r=id=>document.getElementById(id).getBoundingClientRect(),f=r('followShipButton'),speed=r('mapButton');return {gap:speed.left-f.right,hit:document.elementFromPoint(f.left+f.width/2,f.top+f.height/2)?.closest('button')?.id};});
    assert.ok(layout.gap>=6&&layout.hit==='followShipButton',JSON.stringify({viewport,layout}));
    for(let i=0;i<3;i++){
      await page.locator('#followShipButton').click();
      await page.evaluate(()=>{const g=window.__game;g.update(1300,0);g.updateUI();});
      assert.equal(await page.locator('#flightSpeed').inputValue(),'2');
      assert.equal(await page.evaluate(()=>window.__game.state.scene),'chart');
      assert.equal(await page.evaluate(()=>window.__game.state.warpUntil),0);
    }
    follow.push({viewport,layout});
  }
  // Lower detents cannot depart Deep Space, including stale range events.
  await page.locator('#flightSpeed').evaluate(e=>{e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#followShipButton').click();assert.equal(await page.locator('#flightSpeed').inputValue(),'2');
  await page.evaluate(()=>{const g=window.__game;g.state.save.chart={x:g.state.selected.x,y:g.state.selected.y};g.primary();g.cancelTarget();g.settings.joyX=16;g.settings.reducedMotion=false;g.applySettings();g.clearTerminal();const earth=g.state.system.planets.find(p=>p.name==='Earth');g.select(earth);g.showDetails(earth);g.updateTerminal(g.state.terminal.start+100);g.notify('Survey queued after Earth');});
  await settle();
  assert.equal(await page.locator('#targetName').innerText(),'TERMINAL');
  await page.locator('#terminalInput').click();await page.locator('#terminalInput').fill('<b>pilot entry</b>');await page.keyboard.press('Enter');
  await page.evaluate(()=>{const g=window.__game;const moon=g.state.system.planets.find(p=>p.name==='Earth').moons[0];g.select(moon);g.showDetails(moon);g.updateTerminal(g.state.terminal.start+10000);});await settle();
  const stream=await page.evaluate(()=>[...document.getElementById('terminalMessages').children].map(e=>({kind:e.classList.contains('terminal-record')?'record':e.classList.contains('input')?'input':'message',text:e.textContent})));
  assert.deepEqual(stream.map(e=>e.kind),['record','message','input','record']);
  assert.match(stream[0].text,/Object Data: Earth/);assert.match(stream[1].text,/Survey queued/);assert.match(stream[2].text,/<b>pilot entry<\/b>/);assert.match(stream[3].text,/Object Data: Moon/);
  assert.equal(await page.locator('#terminalMessages b').count(),0);
  const scrolling=await page.evaluate(()=>{const g=window.__game,s=document.getElementById('terminalScreen');s.scrollTop=s.scrollHeight;const tail=s.scrollTop;g.updateTerminal(g.state.terminal.start+20000);const stable=s.scrollTop,wanted=Math.floor(tail/2);s.scrollTop=wanted;g.updateTerminal(g.state.terminal.start+30000);return {tail,stable,wanted,reading:s.scrollTop};});
  assert.ok(scrolling.tail>0&&scrolling.tail===scrolling.stable&&scrolling.reading===scrolling.wanted&&scrolling.wanted<scrolling.tail,JSON.stringify(scrolling));
  await page.locator('#secondaryAction').click();await settle();
  assert.match(await page.locator('#targetStatus').innerText(),/Object selected: Moon.*Moon/i);
  await page.locator('#secondaryAction').click();await settle();
  const logBeforeClear=await page.evaluate(()=>JSON.stringify(window.__game.state.save.log));
  await page.locator('#terminalClear').click();
  assert.equal(await page.locator('#terminalMessages').innerText(),'');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__game.state.save.log)),logBeforeClear);
  await page.evaluate(()=>{const g=window.__game;g.showDetails(g.state.system.planets.find(p=>p.name==='Earth'));g.updateTerminal(g.state.terminal.start+10000);g.notify('Character size stays fixed');g.settings.terminalResizeHandles=true;g.applySettings();});await settle();
  const fonts=()=>page.evaluate(()=>({header:getComputedStyle(document.querySelector('.terminal-title .terminal-value')).fontSize,data:getComputedStyle(document.querySelector('.terminal-field .terminal-value')).fontSize,status:getComputedStyle(document.querySelector('.terminal-history-entry.message')).fontSize}));
  const beforeFonts=await fonts();assert.deepEqual(beforeFonts,{header:'11px',data:'9px',status:'11px'});
  for(const id of ['terminalResizeTop','terminalResizeLeft']){
    const grip=await page.locator('#'+id).evaluate(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,hit:document.elementFromPoint(r.left+6,r.top+r.height/2)?.closest('button')?.id};});
    assert.ok(grip.width>=44&&grip.height>=44&&grip.hit===id,JSON.stringify(grip));
  }
  await page.locator('#terminalResizeLeft').press('ArrowLeft');await page.locator('#terminalResizeTop').press('ArrowDown');await settle();assert.deepEqual(await fonts(),beforeFonts);
  await page.locator('#settingsOpen').click();
  assert.equal(await page.getByRole('tab').count(),7);assert.equal(await page.getByRole('tabpanel').filter({visible:true}).count(),1);
  await page.getByRole('tab',{name:'Terminal',exact:true}).click();
  const setRange=async(id,value)=>page.locator('#setting-'+id).evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},value);
  await setRange('terminalDataFont',12);await setRange('terminalHeaderFont',14);await setRange('terminalStatusFont',13);
  await page.locator('#setting-terminalFontMode').selectOption('master');await setRange('terminalFontSize',15);
  assert.equal(await page.locator('#setting-terminalDataFont').isDisabled(),true);
  assert.deepEqual(await fonts(),{header:'15px',data:'15px',status:'15px'});
  await page.locator('#setting-terminalFontMode').selectOption('individual');assert.deepEqual(await fonts(),{header:'14px',data:'12px',status:'13px'});
  await page.getByRole('tab',{name:'Log',exact:true}).click();await setRange('logHeaderFont',12);
  await page.locator('#modalClose').click();await settle();
  const rects=()=>page.evaluate(()=>Object.fromEntries(['joystick','navigationControls','mapButton','journalButton'].map(id=>[id,document.getElementById(id).getBoundingClientRect().toJSON()])));
  const deckBefore=await rects();await page.locator('#journalButton').click();await settleLog();
  assert.equal(await page.locator('#journal').isVisible(),true);assert.equal(await page.locator('#targetCard').isVisible(),false);assert.equal(await page.locator('#systemChartContent').isVisible(),false);
  assert.deepEqual(await rects(),deckBefore,'Log animation moved dashboard controls');
  const centered=await page.locator('#journalPanel').evaluate(e=>{const r=e.getBoundingClientRect();return {x:(r.left+r.right)/2-innerWidth/2,y:(r.top+r.bottom)/2-innerHeight/2,left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
  assert.ok(Math.abs(centered.x)<1&&Math.abs(centered.y)<1&&centered.left===0&&centered.right===1024,JSON.stringify(centered));
  const survey=page.locator('.object-survey').filter({has:page.locator('summary').filter({hasText:/^Earth ·/})});assert.equal(await survey.count(),1);
  await survey.locator('summary').click();await settleLog();assert.match(await survey.locator('pre').innerText(),/DIAMETER : 12,742 km/);
  assert.equal(await survey.locator('pre').evaluate(e=>getComputedStyle(e).opacity),'1');
  assert.equal(await page.locator('#journalTitle').evaluate(e=>getComputedStyle(e).fontSize),'12px');
  await survey.locator('button').press('Enter');assert.equal(await survey.evaluate(e=>e.open),false);
  assert.equal(await page.evaluate(()=>Boolean(window.__game.state.keys.size)),false);
  const saved=await page.evaluate(async()=>{const g=window.__game,{importVoyage}=await import('/src/storage/saves.js');const copy=importVoyage(JSON.parse(JSON.stringify(g.state.save)),'copy');return {surveys:copy.log.filter(e=>e.kind==='object').map(e=>e.name),status:copy.log.some(e=>e.action==='Survey queued after Earth')};});
  assert.ok(saved.surveys.includes('Earth')&&saved.surveys.includes('Moon')&&saved.status);
  await page.keyboard.press('Escape');await settleLog();assert.equal(await page.locator('#journal').isVisible(),false);
  await page.evaluate(async()=>{const g=window.__game,{DEFAULT_SETTINGS}=await import('/src/core/settings.js');Object.assign(g.settings,DEFAULT_SETTINGS,{paused:true,controls:'touch',terminalResizeHandles:true});g.state.terminalSize=null;g.applySettings();g.clearTerminal();g.showDetails(g.state.system.planets.find(p=>p.name==='Earth'));g.updateTerminal(g.state.terminal.start+10000);g.notify('Survey complete · saved in voyage log');});
  for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:667,height:375}]){
    await page.setViewportSize(viewport);await settle();
    await page.locator('#terminalScreen').evaluate(e=>{e.scrollTop=0;});
    await page.screenshot({path:`.qa/${engine}-11214-terminal-${viewport.width}.png`});
    await page.locator('#journalButton').click();await settleLog();await page.locator('.object-survey summary').first().click();await settleLog();
    await page.screenshot({path:`.qa/${engine}-11214-log-${viewport.width}.png`});
    await page.evaluate(()=>window.__game.closeJournal());await settle();
    await page.locator('#settingsOpen').click();await page.getByRole('tab',{name:'Terminal',exact:true}).click();
    await page.screenshot({path:`.qa/${engine}-11214-settings-${viewport.width}.png`});await page.locator('#modalClose').click();
    await page.evaluate(()=>{const g=window.__game;g.showDetails(g.state.system.planets.find(p=>p.name==='Earth'));g.updateTerminal(g.state.terminal.start+10000);});
  }
  await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=true;g.applySettings();g.showJournal();if(document.getElementById('journalPanel').getAnimations().length)throw Error('Reduced-motion log animated');g.closeJournal();});
  return {follow,chronologicalStream:true,clearKeepsLog:true,fontsIndependent:true,centeredLog:true,savedSurveys:true,noRewind:true};
}
