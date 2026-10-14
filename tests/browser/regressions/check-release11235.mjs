import assert from 'node:assert/strict';
export async function checkRelease11235(page,engine){
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{const g=window.__game;Object.assign(g.settings,{reducedMotion:true,terminalWidthScale:100,terminalResizeHandles:false});g.applySettings();g.select(g.state.system.planets.find(p=>p.name==='Earth'));g.frame(performance.now());});
  await page.waitForFunction(()=>document.getElementById('terminalCompanion').dataset.ready==='true');
  await page.waitForFunction(()=>!document.getElementById('terminalCompanion').hidden);
  assert.equal(await page.locator('#terminalCompanion').getAttribute('data-emote'),'sleep');
  const sleep=await page.locator('#terminalCompanion').evaluate(e=>({height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width,pointer:getComputedStyle(e).pointerEvents}));
  assert.equal(sleep.height,66);assert.equal(sleep.pointer,'none');
  const breathing=await page.evaluate(async()=>{
    const g=window.__game,c=document.getElementById('companionCanvas'),ctx=c.getContext('2d'),{companionAnimation,COMPANION:C}=await import('/src/ui/companion-animation.js'),now=performance.now(),frames=[];
    g.settings.reducedMotion=false;
    for(const offset of [100,900,1700,2500,3300,4100,4900,5700]){
      const time=now+offset;g.companion.update(time);const pixels=ctx.getImageData(0,0,c.width,c.height).data,frame=companionAnimation('sleep',offset,time),eyeY=C.headY+frame.bob+27;
      let top=c.height;for(let y=0;y<c.height;y++)if(Array.from(pixels.slice(y*c.width*4,(y+1)*c.width*4)).some((v,i)=>i%4===3&&v)){top=y;break;}
      const flat=[0,1,2].map(d=>{const data=ctx.getImageData(C.headX+17,eyeY-1+d,7,1).data;return Array.from(data).filter((v,i)=>i%4===0&&v===121).length;});
      frames.push({top,sprite:document.getElementById('terminalCompanion').dataset.sprite,flat,alpha:Array.from(pixels).filter((v,i)=>i%4===3).join(',')});
    }
    g.settings.reducedMotion=true;g.companion.update(now+6000);return {clear:frames.every(f=>f.top>=2),flat:frames.every(f=>f.flat[0]===0&&f.flat[1]===7&&f.flat[2]===0),sprites:new Set(frames.map(f=>f.sprite)).size,shapes:new Set(frames.map(f=>f.alpha)).size};
  });assert.ok(breathing.clear&&breathing.flat&&breathing.sprites===2&&breathing.shapes>=2,JSON.stringify(breathing));
  const sleepy=await page.screenshot({path:`.qa/${engine}-11235-sleep.png`});
  if(engine==='webkit'&&process.env.QA_LAYOUT_PREVIEW==='true'){const data=sleepy.toString('base64');for(let i=0;i<data.length;i+=6000)console.log(`QA_PREVIEW:11235-sleep:${i/6000}:${data.slice(i,i+6000)}`);}
  await page.locator('#secondaryAction').click();
  await page.waitForFunction(()=>document.getElementById('terminalCompanion').dataset.pose==='awake');
  await page.waitForFunction(()=>{const r=document.getElementById('terminalCompanion').getBoundingClientRect(),card=document.getElementById('targetCard').getBoundingClientRect();return r.height>45&&Math.abs(r.bottom-card.top)<1;});
  const open=await page.evaluate(async()=>{
    const {gameRect}=await import('/src/core/viewport.js'),r=gameRect(document.getElementById('terminalCompanion')),card=gameRect(document.getElementById('targetCard'));
    const pixels=document.getElementById('companionCanvas').getContext('2d').getImageData(26,49,32,11).data;
    const c=document.getElementById('companionCanvas'),full=gameRect(c);
    return {native:[c.width,c.height],width:r.width,canvasBottom:full.bottom,top:r.top,bottom:r.bottom,cardTop:card.top,height:r.height,torsoPainted:pixels.some((v,i)=>i%4===3&&v>0)};
  });assert.ok(open.top>=5&&open.height>sleep.height&&Math.abs(open.bottom-open.cardTop)<1&&!open.torsoPainted,JSON.stringify(open));
  assert.deepEqual(open.native,[84,60]);assert.ok(open.width===sleep.width&&open.canvasBottom>open.bottom+10,JSON.stringify(open));
  const restingShoulders=await page.locator('#terminalCompanion').getAttribute('data-shoulders');
  const png=await page.screenshot({path:`.qa/${engine}-11235-awake.png`});
  if(engine==='webkit'&&process.env.QA_LAYOUT_PREVIEW==='true'){const data=png.toString('base64');for(let i=0;i<data.length;i+=6000)console.log(`QA_PREVIEW:11235-awake:${i/6000}:${data.slice(i,i+6000)}`);}
  await page.locator('#terminalKeyboardToggle').click();await page.locator('[data-key=H]').click();await page.locator('[data-key=I]').click();await page.locator('[data-key=Enter]').click();
  assert.equal(await page.locator('#terminalCompanion').getAttribute('data-emote'),'input');
  await page.locator('#terminalClear').click();assert.equal(await page.locator('#terminalCompanion').getAttribute('data-emote'),'clear');
  await page.evaluate(()=>window.__game.notify('First landing on Earth',{log:false}));assert.equal(await page.locator('#terminalCompanion').getAttribute('data-emote'),'celebrate');
  const raised=await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=false;const now=performance.now();for(const offset of [250,500,750])g.companion.update(now+offset);return document.getElementById('terminalCompanion').dataset.emote;});assert.equal(raised,'celebrate');
  const raisedShoulders=await page.locator('#terminalCompanion').getAttribute('data-shoulders');assert.notEqual(raisedShoulders,restingShoulders,'gestures must change shoulder sprite frames');
  const wave=await page.screenshot({path:`.qa/${engine}-11235-wave.png`});
  if(engine==='webkit'&&process.env.QA_LAYOUT_PREVIEW==='true'){const data=wave.toString('base64');for(let i=0;i<data.length;i+=6000)console.log(`QA_PREVIEW:11235-wave:${i/6000}:${data.slice(i,i+6000)}`);}
  await page.evaluate(()=>{window.__game.settings.reducedMotion=true;window.__game.notify('No solid surface here.',{log:false});});assert.equal(await page.locator('#terminalCompanion').getAttribute('data-emote'),'concern');
  const stable=await page.evaluate(()=>{const g=window.__game,c=document.getElementById('companionCanvas'),now=performance.now(),read=()=>Array.from(c.getContext('2d').getImageData(0,0,84,60).data).join(',');g.companion.update(now);const a=read();g.companion.update(now+200);return a===read();});assert.ok(stable);
  await page.locator('#secondaryAction').click();await page.waitForFunction(()=>document.getElementById('terminalCompanion').dataset.emote==='sleep');
  await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.frame(performance.now());});assert.ok(await page.locator('#terminalCompanion').evaluate(e=>e.hidden));
  return {sleep,open,inputAndActionReactions:true,reducedMotionStable:true};
}
