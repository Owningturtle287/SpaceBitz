import assert from 'node:assert/strict';
export async function checkRelease11212(page,engine){
  await page.setViewportSize({width:1920,height:1080});
  await page.waitForFunction(()=>window.__game.state.width===1920&&window.__game.state.height===1080);
  const terrain=await page.evaluate(async()=>{
    const g=window.__game,{makeSystem}=await import('/model.js'),s=g.state;
    globalThis.__qaPause=true;g.start({...s.save,currentSystem:'sol',scene:'surface',landed:'sol:Earth'});s.zoom=.65;s.camera={x:50,y:35};g.terrain.clear();g.settings.showGrid=false;
    let misses=0;const chunk=g.terrain.chunk.bind(g.terrain);g.terrain.chunk=(...args)=>{const size=g.terrain.cache.size,value=chunk(...args);if(g.terrain.cache.size>size)misses++;return value;};
    g.drawGround(0);const cold=misses,times=[];
    for(let i=0;i<90;i++){const start=performance.now();g.drawGround(i*16);times.push(performance.now()-start);}
    g.terrain.chunk=chunk;times.sort((a,b)=>a-b);
    if(misses!==cold)throw Error('Warm wide terrain regenerated tiles');
    const p95=times[Math.floor(times.length*.95)];if(p95>50)throw Error('Warm terrain exceeded the 50 ms CI budget: '+p95);
    return {width:s.width,height:s.height,tiles:g.terrain.cache.size,p95Ms:p95};
  });
  await page.setViewportSize({width:844,height:390});
  await page.waitForFunction(()=>window.__game.state.width===844&&window.__game.state.height===390);
  await page.evaluate(()=>{const g=window.__game;g.launch();g.select(g.state.system.star);g.updateUI();});
  await page.locator('#secondaryAction').focus();await page.keyboard.down('w');
  assert.equal(await page.evaluate(()=>window.__game.state.keys.has('w')),true);await page.keyboard.up('w');
  await page.locator('#secondaryAction').click();await page.locator('#terminalInput').focus();await page.keyboard.down('w');
  assert.equal(await page.evaluate(()=>window.__game.state.keys.has('w')),false);await page.keyboard.up('w');
  await page.evaluate(()=>{document.getElementById('terminalInput').blur();window.__game.cancelTarget();window.__game.updateUI();});
  // Actual Settings handler must keep the session open if localStorage rejects writes.
  await page.locator('#settingsOpen').click();
  await page.evaluate(()=>{window.__originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='spacebitz:field:v1')throw new DOMException('Test quota','QuotaExceededError');return window.__originalSetItem.call(this,key,value);};});
  await page.getByRole('button',{name:'SAVE & MAIN MENU',exact:true}).click();
  assert.equal(await page.evaluate(()=>Boolean(window.__game.state.save)),true);assert.equal(await page.locator('#modal').isVisible(),true);
  await page.evaluate(()=>{Storage.prototype.setItem=window.__originalSetItem;window.__game.closeModal();});
  // Keep browser tests self-contained; current voyage and restored geometry remain valid.
  await page.evaluate(()=>{const g=window.__game,pluto=g.state.system.planets.find(p=>p.name==='Pluto');g.select(pluto);g.showDetails(pluto);g.updateTerminal(performance.now()+10000);g.updateUI();});
  assert.match(await page.locator('#terminalOutput').innerText(),/Dwarf planet/i);
  await page.waitForTimeout(600);
  await page.evaluate(()=>{const g=window.__game;g.updateTerminal(performance.now()+11000);g.focusSelected();g.frame(performance.now());document.getElementById('toast').classList.remove('show');});
  await page.screenshot({path:`.qa/${engine}-11212-dwarf-terminal.png`});
  await page.evaluate(()=>window.__game.cancelTarget());
  return {terrain,quotaKeptSession:true,headerKeyboardFlight:true,inputBlocksFlight:true,dwarfTerminal:true};
}
