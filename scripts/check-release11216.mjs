import assert from 'node:assert/strict';

export async function checkRelease11216(page,engine){
  const tap=async id=>{const r=await page.locator('#'+id).boundingBox();assert.ok(r,id+' has no bounds');await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);};
  const inspect=()=>page.evaluate(()=>{
    const g=window.__game,s=g.state;
    const controls=Object.fromEntries(['followShipButton','primaryAction','homeButton','flightSpeed'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return [id,{disabled:e.disabled,hidden:e.hidden,rect:{x:r.x,y:r.y,width:r.width,height:r.height},hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button,input')?.id,opacity:getComputedStyle(e.parentElement).opacity}];}));
    return {scene:s.scene,follow:s.followShip,centerAction:s.centerZoom?.centerAction,autopilot:s.autopilot,warpUntil:s.warpUntil,appInert:document.getElementById('app').inert,ready:document.getElementById('travelControls').classList.contains('ready'),activeElement:document.activeElement.id,controls};
  });
  // Keep the real animation loop running: delayed UI refreshes must not undo a
  // press, and automatic star selection must enable the actual touch controls.
  await page.evaluate(()=>{window.__qaPause=false;window.__game.frame(performance.now());});
  const range=await page.locator('#flightSpeed').boundingBox();
  await page.touchscreen.tap(range.x+range.width-3,range.y+range.height/2);
  await page.waitForFunction(()=>window.__game.state.scene==='chart');
  await page.waitForTimeout(600);
  const before=await inspect();
  await tap('followShipButton');await page.waitForTimeout(1550);
  const afterFollow=await inspect();
  await tap('primaryAction');await page.waitForTimeout(100);
  const afterGreen=await inspect();
  console.log('11216 touch diagnostic',JSON.stringify({before,afterFollow,afterGreen}));
  await page.screenshot({path:`.qa/${engine}-11216-deep-space.png`});
  await page.evaluate(async()=>{window.__qaPause=true;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  assert.equal(afterFollow.follow,true,'Follow did not activate after a native slider exit');
  assert.ok(afterGreen.autopilot||afterGreen.scene==='system','Green travel lever did not activate after automatic star selection');
  return {nativeDeepSpaceControls:{before,afterFollow,afterGreen}};
}
