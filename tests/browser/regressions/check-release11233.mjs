import assert from 'node:assert/strict';
export async function checkRelease11233(page,engine){
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{const g=window.__game;Object.assign(g.settings,{reducedMotion:true,terminalWidthScale:100,terminalResizeHandles:false});g.applySettings();g.select(g.state.system.planets.find(p=>p.name==='Earth'));g.frame(performance.now());});
  await page.waitForFunction(()=>document.getElementById('terminalCompanion').dataset.ready==='true');
  await page.waitForFunction(()=>!document.getElementById('terminalCompanion').hidden);
  assert.equal(await page.locator('#terminalCompanion').getAttribute('data-emote'),'sleep');
  const sleep=await page.locator('#terminalCompanion').evaluate(e=>({height:e.getBoundingClientRect().height,pointer:getComputedStyle(e).pointerEvents}));
  assert.equal(sleep.height,40);assert.equal(sleep.pointer,'none');
  await page.screenshot({path:`.qa/${engine}-11233-sleep.png`});
  await page.locator('#secondaryAction').click();
  await page.waitForFunction(()=>document.getElementById('terminalCompanion').dataset.pose==='awake');
  await page.waitForFunction(()=>{const r=document.getElementById('terminalCompanion').getBoundingClientRect(),card=document.getElementById('targetCard').getBoundingClientRect();return r.height>45&&Math.abs(r.bottom-card.top)<1;});
  const open=await page.evaluate(async()=>{
    const {gameRect}=await import('/src/core/viewport.js'),r=gameRect(document.getElementById('terminalCompanion')),card=gameRect(document.getElementById('targetCard'));
    const pixels=document.getElementById('companionCanvas').getContext('2d').getImageData(0,88,120,42).data;
    return {top:r.top,bottom:r.bottom,cardTop:card.top,height:r.height,bodyPainted:pixels.some((v,i)=>i%4===3&&v>0)};
  });assert.ok(open.top>=5&&open.height>sleep.height&&Math.abs(open.bottom-open.cardTop)<1&&open.bodyPainted,JSON.stringify(open));
  const png=await page.screenshot({path:`.qa/${engine}-11233-awake.png`});
  if(engine==='webkit'&&process.env.QA_LAYOUT_PREVIEW==='true'){const data=png.toString('base64');for(let i=0;i<data.length;i+=6000)console.log(`QA_PREVIEW:11233-awake:${i/6000}:${data.slice(i,i+6000)}`);}
  await page.locator('#terminalInput').fill('Hello scout');await page.locator('#terminalInput').press('Enter');
  assert.equal(await page.locator('#terminalCompanion').getAttribute('data-emote'),'input');
  await page.locator('#terminalClear').click();assert.equal(await page.locator('#terminalCompanion').getAttribute('data-emote'),'clear');
  await page.evaluate(()=>window.__game.notify('First landing on Earth',{log:false}));assert.equal(await page.locator('#terminalCompanion').getAttribute('data-emote'),'celebrate');
  await page.evaluate(()=>window.__game.notify('No solid surface here.',{log:false}));assert.equal(await page.locator('#terminalCompanion').getAttribute('data-emote'),'concern');
  const stable=await page.evaluate(()=>{const g=window.__game,c=document.getElementById('companionCanvas'),now=performance.now(),read=()=>Array.from(c.getContext('2d').getImageData(0,0,120,132).data).join(',');g.companion.update(now);const a=read();g.companion.update(now+200);return a===read();});assert.ok(stable);
  await page.locator('#secondaryAction').click();await page.waitForFunction(()=>document.getElementById('terminalCompanion').dataset.emote==='sleep');
  await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.frame(performance.now());});assert.ok(await page.locator('#terminalCompanion').evaluate(e=>e.hidden));
  return {sleep,open,inputAndActionReactions:true,reducedMotionStable:true};
}
