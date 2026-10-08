import assert from 'node:assert/strict';

export async function checkRelease11220(page,engine){
  const migratedFilters=await checkOldLogIndex(page);
  const tap=async locator=>{await locator.click({trial:true});const r=await locator.boundingBox();assert.ok(r);await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);};
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(async()=>{
    const g=window.__game,{DEFAULT_SETTINGS}=await import('/settings.js');
    Object.assign(g.settings,DEFAULT_SETTINGS,{music:false,paused:true,controls:'touch',reducedMotion:true});
    g.create(true);g.launch();g.clearTerminal();g.applySettings();
    const earth=g.state.system.planets.find(p=>p.name==='Earth');
    for(const body of [earth,earth.moons[0],g.state.system.star]){g.select(body);g.showDetails(body);g.updateTerminal(performance.now());}
    const {recordEvent}=await import('/voyage-log.js');recordEvent(g.state.save,{name:'Surface sample',action:'Sample collected',category:'item',visual:{system:'sol',id:'sol:Earth:sample:qa',kind:'sample'}});
    await g.persist();window.__fullStarSurvey=g.state.save.log.find(e=>e.kind==='object'&&e.category==='star').data;
  });
  const layouts=[];
  for(const viewport of [{width:667,height:375},{width:844,height:390},{width:1024,height:768}]){
    await page.setViewportSize(viewport);await page.waitForFunction(v=>window.__game.state.width===v.width&&window.__game.state.height===v.height,viewport);
    await page.locator('#terminalScrollbar').waitFor({state:'visible'});
    const terminal=await page.evaluate(()=>{
      const rect=id=>document.getElementById(id).getBoundingClientRect(),screen=rect('terminalScreen'),thumb=document.querySelector('#terminalScrollbar .edge-scrollbar-thumb').getBoundingClientRect(),record=document.querySelector('.terminal-record:last-of-type').getBoundingClientRect();
      return {gap:screen.right-thumb.right,clear:thumb.left-record.right,native:getComputedStyle(document.getElementById('terminalScreen')).scrollbarWidth};
    });assert.ok(terminal.gap>=2&&terminal.gap<=8&&terminal.clear>=4,JSON.stringify({viewport,terminal}));assert.equal(terminal.native,'none');
    await page.locator('#terminalScrollbar').press('Home');assert.equal(await page.locator('#terminalScreen').evaluate(e=>e.scrollTop),0);
    await page.locator('#terminalScrollbar').press('End');assert.ok(await page.locator('#terminalScreen').evaluate(e=>e.scrollTop>0));
    assert.equal(await page.evaluate(()=>window.__game.state.terminal.followOutput),false);
    const clock=await page.evaluate(()=>{const rect=id=>document.getElementById(id).getBoundingClientRect(),time=rect('clockTime'),date=rect('clockDate'),coords=rect('coordsReadout'),panel=rect('flightReadout');return {sameRow:Math.abs((time.top+time.bottom-date.top-date.bottom)/2)<2,timeLeft:time.right<=date.left,height:panel.height,coordsTop:coords.top,timeBottom:time.bottom,overflow:document.getElementById('flightReadout').scrollWidth>document.getElementById('flightReadout').clientWidth};});
    assert.ok(clock.sameRow&&clock.timeLeft&&clock.height<65&&clock.coordsTop-clock.timeBottom<6&&!clock.overflow,JSON.stringify({viewport,clock}));
    if(viewport.width===844)await page.screenshot({path:`.qa/${engine}-11220-terminal.png`});
    await page.locator('#systemChartToggle').click();await page.locator('#systemChartScrollbar').waitFor({state:'visible'});
    const chart=await page.evaluate(()=>{const screen=document.getElementById('systemChartContent').getBoundingClientRect(),thumb=document.querySelector('#systemChartScrollbar .edge-scrollbar-thumb').getBoundingClientRect(),list=document.getElementById('bodyList').getBoundingClientRect();return {gap:screen.right-thumb.right,clear:thumb.left-list.right};});
    assert.ok(chart.gap>=2&&chart.gap<=8&&chart.clear>=4,JSON.stringify({viewport,chart}));
    await page.locator('#systemChartScrollbar').press('End');assert.ok(await page.locator('#systemChartContent').evaluate(e=>e.scrollTop>0));
    if(viewport.width===844)await page.screenshot({path:`.qa/${engine}-11220-chart.png`});
    await page.locator('#systemChartToggle').click();await page.evaluate(()=>{const g=window.__game;g.showDetails(g.state.selected);});
    layouts.push({viewport,terminal,chart,clock});
  }
  await page.setViewportSize({width:844,height:390});
  const brief=await page.evaluate(async()=>{const g=window.__game;g.enterChart();g.clearTerminal();g.showDetails(g.state.selected);g.updateTerminal(performance.now());await g.persist();return {text:g.state.terminal.text,survey:Boolean(g.state.terminal.survey),preserved:g.state.save.log.find(e=>e.kind==='object'&&e.category==='star').data===window.__fullStarSurvey};});
  assert.equal(brief.text.split('\n').filter(Boolean).length,2);assert.match(brief.text,/^Object Data: Sol\n\nTYPE : Yellow dwarf$/);assert.equal(brief.survey,false);assert.equal(brief.preserved,true);
  // Emulate Safari delivering pointer events without a compatibility click.
  await page.evaluate(()=>{window.__qaBlockLogClick=true;document.addEventListener('click',e=>{if(window.__qaBlockLogClick&&e.isTrusted){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});});
  await tap(page.locator('#journalButton'));await page.waitForFunction(()=>document.querySelectorAll('.object-survey').length===3);
  for(const name of ['Sol','Earth','Moon']){
    const survey=page.locator('.object-survey').filter({has:page.locator('.journal-survey-toggle').filter({hasText:name+' ·'})});
    await survey.scrollIntoViewIfNeeded();await tap(survey.locator('button'));
    assert.equal(await survey.evaluate(e=>e.open),true,name+' did not open in Deep Space');assert.match(await survey.locator('pre').innerText(),/DIAMETER : /);
    await tap(survey.locator('button'));assert.equal(await survey.evaluate(e=>e.open),false,name+' did not close in Deep Space');
  }
  await page.evaluate(()=>window.__qaBlockLogClick=false);
  const visuals=await page.locator('.journal-entry').evaluateAll(rows=>rows.map(row=>({category:row.dataset.category,visual:!!row.querySelector('.journal-preview canvas'),painted:row.querySelector('canvas')?Array.from(row.querySelector('canvas').getContext('2d').getImageData(0,0,80,80).data).some((v,i)=>i%4===3&&v>0):false})));
  assert.ok(visuals.every(row=>row.category==='status'?!row.visual:row.visual&&row.painted),JSON.stringify(visuals));assert.ok(visuals.some(row=>row.category==='item'&&row.visual));
  const star=page.locator('.object-survey').filter({hasText:'Sol ·'});await star.scrollIntoViewIfNeeded();await star.locator('button').press('Enter');assert.equal(await star.evaluate(e=>e.open),true);await star.locator('button').press('Space');assert.equal(await star.evaluate(e=>e.open),false);
  const fullScreens=[];
  for(const viewport of [{width:667,height:375},{width:844,height:390},{width:1440,height:900}]){
    await page.setViewportSize(viewport);await page.waitForFunction(v=>{const r=document.getElementById('journalPanel').getBoundingClientRect();return r.x===0&&r.y===0&&r.width===v.width&&r.height===v.height;},viewport);
    assert.equal(await page.locator('#journalContent').evaluate(e=>e.scrollWidth>e.clientWidth),false);
    await page.locator('#journalContent').evaluate(e=>e.scrollTop=0);await page.screenshot({path:`.qa/${engine}-11220-log-${viewport.width}.png`});fullScreens.push(viewport);
  }
  await page.locator('#journalClose').click();await page.evaluate(()=>{const g=window.__game;g.state.save.chart={x:g.state.selected.x,y:g.state.selected.y};g.primary();g.clearTerminal();g.select(g.state.system.star);g.showDetails(g.state.selected);g.updateTerminal(performance.now());});
  assert.match(await page.locator('.terminal-record:last-of-type').innerText(),/MASS : /);
  return {layouts,migratedFilters,deepSpaceBrief:true,preservedFullSurvey:true,touchExpandCollapse:true,keyboardExpandCollapse:true,paintedObjectAndItemVisuals:true,fullScreens,inSystemFullData:true};
}

async function checkOldLogIndex(page){
  const context=await page.context().browser().newContext({viewport:{width:844,height:390},serviceWorkers:'block'});
  try{
    await context.addInitScript(()=>{
      localStorage.setItem('spacebitz:field:settings',JSON.stringify({music:false,paused:true}));
      const request=indexedDB.open('spacebitz-voyages',1);
      request.onupgradeneeded=()=>{
        const db=request.result,core=db.createObjectStore('voyages',{keyPath:'id'}),history=db.createObjectStore('history',{keyPath:['voyageId','id']});
        history.createIndex('voyage','voyageId');history.createIndex('order',['voyageId','sequence']);history.createIndex('category',['voyageId','categoryIndex','sequence']);
        db.createObjectStore('migration').put({originals:[]},'spacebitz:field:v1');
        core.put({id:'old-index',name:'Old log',seed:'sol',revision:7,logCount:2});
        for(const [sequence,name,action]of [[1,'Earth','First landing'],[2,'Sol','Entered system']])history.put({voyageId:'old-index',id:'old-'+sequence,sequence,name,action,days:1,categoryIndex:'status',custom:'retained'});
      };
      request.onsuccess=()=>request.result.close();
    });
    const test=await context.newPage();await test.goto(page.url());
    const result=await test.evaluate(async()=>{const {createVoyageStore}=await import('/voyage-database.js'),store=createVoyageStore();try{return {core:(await store.list())[0],all:await store.page('old-index'),stars:await store.page('old-index','star'),planets:await store.page('old-index','planet'),status:await store.page('old-index','status')};}finally{store.close();}});
    assert.equal(result.core.revision,7);assert.equal(result.all.total,2);assert.ok(result.all.entries.every(e=>e.custom==='retained'));
    assert.equal(result.stars.total,1);assert.equal(result.planets.total,1);assert.equal(result.status.total,0);return true;
  }finally{await context.close();}
}
