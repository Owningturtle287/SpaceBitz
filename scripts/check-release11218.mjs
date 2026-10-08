import assert from 'node:assert/strict';

export async function checkRelease11218(page,engine){
  const tap=async id=>{const el=page.locator('#'+id);await el.click({trial:true});const r=await el.boundingBox();await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);};
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{const g=window.__game;Object.assign(g.settings,{controls:'touch',reducedMotion:false,paused:true,centerButton:'right'});g.applySettings();window.__qaPause=false;g.frame(performance.now());});
  const visits=[];
  for(const index of [0,1,2,0]){
    await page.evaluate(async index=>{
      const g=window.__game,{galaxyStars}=await import('/model.js');
      g.enterChart();const star=galaxyStars(g.state.save.seed,4+index,3)[0];
      g.select(star);g.state.save.chart={x:star.x+(index===1?100:10),y:star.y};g.state.camera={...g.state.save.chart};g.updateUI();
    },index);
    const seed=await page.evaluate(()=>window.__game.state.selected.seed);
    await tap('primaryAction');
    if(index===1){
      // Travel to a distant star through the real game loop, then enter it.
      await page.waitForFunction(()=>!window.__game.state.autopilot);
      await tap('primaryAction');
    }
    assert.equal(await page.evaluate(()=>window.__game.state.save.currentSystem),seed);
    assert.equal(await page.evaluate(()=>window.__game.state.scene),'system');
    // A queued range event from Deep Space must not become a new Warp command
    // merely because the green lever has now enabled the system's speed slider.
    await page.locator('#flightSpeed').evaluate(e=>{e.value='2';e.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForTimeout(900);
    const arrival=await page.evaluate(()=>({scene:window.__game.state.scene,seed:window.__game.state.save.currentSystem,warpUntil:window.__game.state.warpUntil}));
    assert.equal(arrival.scene,'system','Late Warp input ejected the ship from a new system: '+JSON.stringify(arrival));
    assert.equal(arrival.warpUntil,0);assert.equal(arrival.seed,seed);visits.push(arrival);
    if(index===2)await page.screenshot({path:`.qa/${engine}-11218-new-system-arrival.png`});
    await tap('followShipButton');
    await tap('homeButton');
    assert.equal(await page.evaluate(()=>window.__game.state.scene),'system');
    // A new, deliberate range interaction must remain available immediately.
    await page.locator('#flightSpeed').press('Home');
    await page.locator('#flightSpeed').press('ArrowRight');
    assert.equal(await page.locator('#flightSpeed').inputValue(),'1');
    const slider=page.locator('#flightSpeed');await slider.click({trial:true});const r=await slider.boundingBox();
    await page.touchscreen.tap(r.x+r.width-3,r.y+r.height/2);
    await page.waitForFunction(()=>window.__game.state.scene==='chart');
    assert.equal(await page.locator('#flightSpeed').inputValue(),'2');
  }
  assert.equal(new Set(visits.slice(0,3).map(v=>v.seed)).size,3);
  assert.equal(visits[3].seed,visits[0].seed);
  await page.screenshot({path:`.qa/${engine}-11218-system-transitions.png`});
  await page.evaluate(async()=>{window.__qaPause=true;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  return {newSystemsRemainEntered:visits,cameraControlsKeepSystem:true,deliberateKeyboardAndTouchWarp:true};
}
