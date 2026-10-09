import assert from 'node:assert/strict';

export async function checkRelease11219(page,engine){
  const database=await checkDatabase(page);
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(async()=>{
    const g=window.__game,{DEFAULT_SETTINGS}=await import('/settings.js');
    Object.assign(g.settings,DEFAULT_SETTINGS,{paused:true,controls:'touch',music:false,reducedMotion:false});
    g.create(true);g.launch();await g.persist();g.clearTerminal();
    g.select(g.state.system.planets.find(p=>p.name==='Earth'));g.showDetails(g.state.selected);g.applySettings();
    g.updateTerminal(g.state.terminal.start+100);
  });
  const queued=await page.evaluate(()=>{
    const g=window.__game,r=g.state.terminal,before=r.count;
    g.notify('Queued status');g.appendTerminalEntry('Queued input','input');
    return {before,after:r.count,queued:g.state.terminalEntries.slice(-2).every(e=>e.node.hidden),finished:r.finished};
  });assert.equal(queued.before,queued.after);assert.equal(queued.queued,true);assert.equal(queued.finished,false);
  await page.locator('#systemChartToggle').click();
  assert.equal(await page.evaluate(()=>Number.isFinite(window.__game.state.terminalEntries[0].pausedAt)),true);
  assert.equal(await page.evaluate(()=>{const g=window.__game;g.notify('Status while viewing the chart');return g.state.terminalEntries.at(-1).node.hidden;}),true);
  await page.waitForTimeout(450);await page.locator('#systemChartToggle').click();
  await page.evaluate(()=>{const g=window.__game;g.showDetails(g.state.selected);g.updateTerminal(performance.now());});
  assert.equal(await page.evaluate(()=>window.__game.state.terminal.finished),false);
  const background=await page.evaluate(()=>{
    const g=window.__game,r=g.state.terminal;
    Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
    const paused=r.pausedAt,before=paused-r.start;delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
    g.updateTerminal(paused+10000);return {before,after:paused+10000-r.start,finished:r.finished};
  });assert.ok(Math.abs(background.before-background.after)<.001,JSON.stringify(background));assert.equal(background.finished,false);
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.getElementById('gameViewport').dataset.rotated==='true');
  assert.equal(await page.evaluate(()=>window.__game.state.width>window.__game.state.height),true);
  await page.setViewportSize({width:844,height:390});
  await page.waitForFunction(()=>document.getElementById('gameViewport').dataset.rotated==='false');
  await page.evaluate(()=>{const g=window.__game;g.updateTerminal(performance.now());g.updateTerminal(g.state.terminal.start+20000);});
  assert.equal(await page.evaluate(()=>window.__game.state.terminalEntries.slice(-2).every(e=>!e.node.hidden)),true);
  await page.evaluate(async()=>{
    const g=window.__game,{recordAction}=await import('/voyage-log.js');for(let i=0;i<250;i++)recordAction(g.state.save,'History '+i);
    // Put this survey on the newest page, then test lazy expansion and font tokens.
    g.clearTerminal();g.showDetails(g.state.selected);g.updateTerminal(g.state.terminal.start+10000);
    g.settings.logLabelFont=14;g.settings.logDataFont=9;g.settings.reducedMotion=true;g.applySettings();await g.persist();g.showJournal();
  });
  await page.getByRole('button',{name:'All',exact:true}).click();
  // Clicking the current filter refreshes the page asynchronously while its
  // previous rows remain visible. Wait before selecting a survey from that page.
  await page.waitForFunction(()=>!document.getElementById('journalContent').hasAttribute('aria-busy')&&document.querySelectorAll('.journal-entry').length===80);
  const survey=page.locator('.object-survey').filter({hasText:/Earth ·/});
  assert.equal(await survey.locator('.journal-object-data').count(),0);await survey.locator('summary').click();
  await page.waitForFunction(()=>Boolean(document.querySelector('.object-survey[open] .journal-data-key')));
  assert.equal(await survey.locator('.journal-data-key').first().evaluate(e=>getComputedStyle(e).fontSize),'14px');
  await page.locator('#journalContent').evaluate(e=>{e.scrollTop=130;});
  const scroll=await page.locator('#journalContent').evaluate(e=>e.scrollTop);
  await page.getByRole('button',{name:'Stars',exact:true}).click();await page.waitForFunction(()=>!document.getElementById('journalContent').hasAttribute('aria-busy'));
  await page.getByRole('button',{name:'All',exact:true}).click();await page.waitForFunction(()=>Boolean(document.querySelector('.object-survey[open]')));
  await page.waitForFunction(expected=>document.getElementById('journalContent').scrollTop===expected,scroll);
  await page.locator('#journalClose').click();await page.locator('#journalButton').click();
  await page.waitForFunction(expected=>document.querySelector('.object-survey[open]')&&document.getElementById('journalContent').scrollTop===expected,scroll);
  await page.getByRole('button',{name:'OLDER',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.journal-pagination span').textContent.startsWith('81–'));
  assert.equal(await page.locator('.journal-entry').count(),80);
  await page.locator('#journalClose').click();
  const instant=await page.evaluate(()=>{
    const g=window.__game;g.clearTerminal();g.cancelTarget();g.state.save.ship={x:10000000,y:10000000};
    g.state.waypoint={x:20000000,y:20000000};g.settings.cheats=false;g.primary();g.update(16,0);
    const normal=Boolean(g.state.autopilot);g.settings.cheats=true;g.update(16,0);
    return {normal,instant:!g.state.autopilot,position:g.state.save.ship};
  });assert.equal(instant.normal,true);assert.equal(instant.instant,true);assert.deepEqual(instant.position,{x:20000000,y:20000000});
  const trails=await page.evaluate(()=>{
    const g=window.__game;g.enterChart();g.state.autopilot={type:'star',id:g.state.save.homeSeed};g.state.save.route=[];
    const ctx=document.getElementById('sky').getContext('2d'),old=ctx.stroke;let calls=0;ctx.stroke=function(...args){calls++;return old.apply(this,args);};
    try{g.settings.travelLines=false;g.drawChart(0);const off=calls;calls=0;g.settings.travelLines=true;g.drawChart(0);return {off,on:calls};}finally{ctx.stroke=old;g.state.autopilot=null;}
  });assert.equal(trails.on-trails.off,1);
  await page.evaluate(()=>{const g=window.__game;g.state.camera={x:0,y:0};g.state.zoom=1;g.cancelTarget();g.frame(performance.now());});
  await page.mouse.move(420,180);await page.mouse.down();assert.equal(await page.evaluate(()=>window.__game.inputPointerCount()),1);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();
  assert.equal(await page.evaluate(()=>window.__game.inputPointerCount()),0);
  await page.touchscreen.tap(422,195);assert.equal(await page.evaluate(()=>window.__game.state.selected.seed),'sol');
  await page.screenshot({path:`.qa/${engine}-11219-flight-and-history.png`});
  return {database,queuedTerminal:true,interruptionPause:true,pagedLog:true,lazySurveys:true,preservedLogPosition:true,labelFonts:true,instantTravel:true,travelTrail:true,interruptedGestureCleared:true};
}

async function checkDatabase(page){
  const context=await page.context().browser().newContext({viewport:{width:844,height:390},serviceWorkers:'block'}),test=await context.newPage();
  const base={id:'legacy-large',name:'Large history',seed:'audit',homeSeed:'sol',currentSystem:'sol',scene:'system',ship:{x:1000000,y:1000000},surface:{x:0,y:0},chart:{x:0,y:0},days:200,layoutVersion:4,discoveries:['sol:Earth'],route:[],log:[]};
  base.log=Array.from({length:4100},(_,i)=>({name:'Ship status',action:'Archived '+i+' '+'.'.repeat(500),days:200}));
  const originals=[base,{...base,id:'legacy-other',name:'Other voyage',log:[]}];
  await test.addInitScript(originals=>{if(!localStorage.getItem('qa-seeded')){localStorage.setItem('spacebitz:field:v1',JSON.stringify(originals));localStorage.setItem('qa-seeded','yes');}localStorage.setItem('spacebitz:field:settings',JSON.stringify({music:false,paused:true,controls:'touch'}));},originals);
  try{
    await test.goto(page.url());await test.locator('#startGame').click();await test.waitForFunction(()=>document.querySelectorAll('.load-save').length===2);
    const result=await test.evaluate(async()=>{
      const {createVoyageStore}=await import('/voyage-database.js'),{recordAction,recordObject}=await import('/voyage-log.js'),{importVoyage}=await import('/saves.js');
      const a=createVoyageStore(),b=createVoyageStore();
      try{
        const list=await a.list();if(list.length!==2||localStorage.getItem('spacebitz:field:v1')!==null)throw Error('Legacy migration did not complete');
        const first=await a.load('legacy-large');if(first.log.length!==200)throw Error('Working log is not bounded');
        const exported=await a.exportSave(first),text=JSON.stringify(exported,null,2);if(text.length<=2_000_000||exported.log.length!==4100)throw Error('Full history missing from large export');
        window.__largeBackup=text;
        let writes=0;const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='history')writes++;return put.apply(this,args);};
        try{
          await a.save(first);if(writes!==0)throw Error('Unchanged archived history was rewritten');
          recordAction(first,'One new action');await a.save(first);if(writes!==1)throw Error('Save did not write only the new action');
        }finally{IDBObjectStore.prototype.put=put;}
        const tabA=await a.load(first.id),tabB=await b.load(first.id);tabA.discoveries.push('discovery-a');tabB.discoveries.push('discovery-b');
        const outcomes=await Promise.allSettled([a.save(tabA),b.save(tabB)]);
        if(outcomes.filter(r=>r.status==='fulfilled').length!==1||outcomes.filter(r=>r.status==='rejected'&&r.reason.name==='VoyageConflictError').length!==1)throw Error('Concurrent transactions did not reject a stale copy');
        const latest=await a.load(first.id);if(latest.discoveries.includes('discovery-a')===latest.discoveries.includes('discovery-b'))throw Error('Progress from the winning window was overwritten');
        recordObject(latest,{key:'sol:Earth',name:'Earth',type:'Planet',category:'planet',text:'Object Data: Earth\nDIAMETER : 12,742 km'});await a.save(latest);
        recordObject(latest,{key:'sol:Earth',name:'Earth',type:'Planet',category:'planet',text:'Object Data: Earth\nDIAMETER : 12,742 km\nSTATUS : updated'});await a.save(latest);
        const surveys=await a.page(first.id,'planet');if(surveys.total!==1||!surveys.entries[0].data.includes('updated'))throw Error('Archived survey was duplicated or not updated');
        const original=JSON.stringify(await a.load('legacy-other'));await a.importSaves([importVoyage(exported,'large-copy')]);
        if(JSON.stringify(await a.load('legacy-other'))!==original)throw Error('Import changed another voyage');
        return {migrated:2,archivedEntries:exported.log.length,exportBytes:text.length,incrementalWrites:true,atomicConflict:true,surveyReplacement:true};
      }finally{a.close();b.close();}
    });
    // Exercise the actual file-input import, not just the conversion helper.
    const backup=await test.evaluate(()=>window.__largeBackup);await test.locator('#importFile').setInputFiles({name:'large-save.json',mimeType:'application/json',buffer:Buffer.from(backup)});
    await test.waitForFunction(()=>document.querySelectorAll('.load-save').length===4);
    await test.locator('.load-save').filter({hasText:'Other voyage'}).click();await test.waitForFunction(()=>!document.getElementById('app').hidden);
    await test.evaluate(async()=>{
      const {createVoyageStore}=await import('/voyage-database.js'),store=createVoyageStore();try{window.__beforeQuota=JSON.stringify(await store.load('legacy-other'));}finally{store.close();}
      window.__quotaPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='voyages')throw Object.assign(Error('Test quota failure'),{name:'QuotaExceededError'});return window.__quotaPut.apply(this,args);};
    });
    await test.locator('#settingsOpen').click();await test.getByRole('button',{name:'SAVE & MAIN MENU',exact:true}).click();
    await test.locator('#settingsSaveStatus').waitFor();assert.match(await test.locator('#settingsSaveStatus').innerText(),/Storage is full/);
    assert.equal(await test.locator('#app').evaluate(e=>!e.hidden),true);
    assert.equal(await test.locator('#settingsOpen').isVisible(),true);
    const quotaSafe=await test.evaluate(async()=>{
      IDBObjectStore.prototype.put=window.__quotaPut;delete window.__quotaPut;
      const {createVoyageStore}=await import('/voyage-database.js'),store=createVoyageStore();try{return window.__beforeQuota===JSON.stringify(await store.load('legacy-other'));}finally{store.close();}
    });assert.equal(quotaSafe,true);await test.locator('#modalClose').click();
    await test.evaluate(async()=>{const {createVoyageStore}=await import('/voyage-database.js'),store=createVoyageStore();try{const copy=await store.load('legacy-other');copy.ship.x+=123;await store.save(copy);}finally{store.close();}});
    await test.getByRole('heading',{name:'Voyage updated elsewhere'}).waitFor();
    await test.getByRole('button',{name:'KEEP AS SEPARATE VOYAGE',exact:true}).click();
    await test.waitForFunction(()=>!document.getElementById('modal').classList.contains('visible')&&!document.getElementById('app').inert);
    const recovery=await test.evaluate(async()=>{const {createVoyageStore}=await import('/voyage-database.js'),store=createVoyageStore();try{const saves=await store.list();return saves.some(s=>s.name==='Other voyage · copy');}finally{store.close();}});
    assert.equal(recovery,true);return {...result,largeFileInputImport:true,quotaRollback:true,visibleSaveFailure:true,conflictRecovery:true};
  }finally{await context.close();}
}
