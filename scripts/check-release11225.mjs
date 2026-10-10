import assert from 'node:assert/strict';

export async function checkRelease11225(page,engine){
  const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const capture=async tag=>{
    const png=await page.screenshot({path:`.qa/${engine}-11225-${tag}.png`});
    if(engine==='webkit'&&process.env.QA_LAYOUT_PREVIEW==='true'){const data=png.toString('base64');for(let i=0;i<data.length;i+=6000)console.log(`QA_PREVIEW:11225-${tag}:${i/6000}:${data.slice(i,i+6000)}`);}
  };
  const arrowTap=async()=>{const r=await page.locator('.mission-chevron').boundingBox();await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);};
  await page.evaluate(async()=>{const g=window.__game,{DEFAULT_SETTINGS}=await import('/settings.js');Object.assign(g.settings,DEFAULT_SETTINGS,{music:false,paused:true,controls:'touch',reducedMotion:false});g.create(true);g.launch();g.applySettings();});
  const taps=[];
  for(const physical of [{width:844,height:390},{width:390,height:844},{width:640,height:360}]){
    await page.setViewportSize(physical);
    await page.waitForFunction(v=>window.__game.state.width===Math.max(v.width,v.height)&&window.__game.state.height===Math.min(v.width,v.height),physical);
    await settle();
    for(let i=0;i<6;i++){await arrowTap();assert.equal(await page.locator('#systemChartToggle').getAttribute('aria-expanded'),String(i%2===0),'A single rapid arrow tap did not toggle exactly once');}
    const hit=await page.evaluate(async()=>{
      const {viewport:v,gameRect}=await import('/viewport.js'),e=document.getElementById('systemChartToggle'),r=gameRect(e),x=r.left+r.width/2,y=r.bottom+10,point=v.rotated?{x:v.physicalWidth-y+v.left,y:x+v.top}:{x:x+v.left,y:y+v.top};
      return {...point,id:document.elementFromPoint(point.x,point.y)?.closest('button')?.id};
    });
    assert.equal(hit.id,'systemChartToggle','The thin tab lacks a larger touch target');
    await page.touchscreen.tap(hit.x,hit.y);assert.equal(await page.locator('#systemChartToggle').getAttribute('aria-expanded'),'true');await arrowTap();
    const style=await page.locator('#systemChartToggle').evaluate(e=>({outline:getComputedStyle(e).outlineStyle,arrow:parseFloat(getComputedStyle(e.querySelector('.mission-chevron')).fontSize),height:e.clientHeight}));
    assert.equal(style.outline,'none');assert.ok(style.arrow>=26);assert.equal(style.height,28);taps.push({physical,...style});
  }
  await page.setViewportSize({width:844,height:390});await settle();
  await page.locator('#systemChartToggle').evaluate(e=>{
    const r=e.getBoundingClientRect(),event=(type,x,more={})=>e.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:91,pointerType:'touch',button:0,clientX:x,clientY:r.top+10,...more}));
    event('pointerdown',r.left+30);event('pointermove',r.left+37);event('pointerup',r.left+37);
  });
  assert.equal(await page.locator('#systemChartToggle').getAttribute('aria-expanded'),'true','Small finger movement cancelled the tap');await arrowTap();
  await page.locator('#systemChartToggle').evaluate(e=>{for(const type of ['pointerdown','pointercancel','pointerup'])e.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:92,button:0}));});
  assert.equal(await page.locator('#systemChartToggle').getAttribute('aria-expanded'),'false','Cancelled tap opened the chart');
  await page.locator('#systemChartToggle').evaluate(e=>{for(const [type,x]of [['pointerdown',0],['pointermove',30],['pointerup',30]])e.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:93,button:0,clientX:x}));});
  assert.equal(await page.locator('#systemChartToggle').getAttribute('aria-expanded'),'false','Dragging opened the chart');
  await page.locator('#systemChartToggle').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#systemChartToggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Space');assert.equal(await page.locator('#systemChartToggle').getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#systemChartToggle').evaluate(e=>getComputedStyle(e).outlineStyle),'none');await capture('chart');
  assert.equal(await page.locator('#targetCollapsedDistance').count(),0);
  const layouts=[];
  for(const physical of [{width:844,height:390},{width:390,height:844},{width:667,height:375},{width:375,height:667},{width:640,height:360}]){
    await page.setViewportSize(physical);
    await page.waitForFunction(v=>window.__game.state.width===Math.max(v.width,v.height)&&window.__game.state.height===Math.min(v.width,v.height),physical);
    await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=true;g.settings.terminalResizeHandles=true;g.state.terminalSize=null;g.applySettings();g.clearTerminal();g.select(g.state.system.planets.find(p=>p.name==='Earth'));g.showDetails(g.state.selected);g.updateTerminal(performance.now());for(let i=0;i<15;i++)g.notify('Earlier reply '+i);});
    await settle();
    await page.locator('#secondaryAction').click();await settle();
    const distance=await page.evaluate(async()=>{const {gameRect}=await import('/viewport.js'),e=document.getElementById('targetDistance'),r=gameRect(e),name=gameRect(document.getElementById('targetStatus')),card=gameRect(document.getElementById('targetCard'));return {text:e.textContent,inData:e.parentElement.classList.contains('terminal-meta'),visible:!e.hidden&&r.height>0,clear:r.top>=name.bottom&&r.bottom<=card.bottom-2};});
    assert.match(distance.text,/AWAY$/);assert.ok(distance.inData&&distance.visible&&distance.clear,JSON.stringify({physical,distance}));
    if(physical.width===844)await capture('distance');
    await page.locator('#secondaryAction').click();await settle();
    await page.locator('#terminalScreen').evaluate(e=>{e.scrollTop=0;e.dispatchEvent(new Event('wheel'));});
    await page.locator('#terminalInput').focus();
    await page.waitForFunction(()=>{const e=document.getElementById('terminalScreen');return !document.getElementById('terminalKeyboard').hidden&&e.clientHeight>20&&e.scrollHeight-e.scrollTop-e.clientHeight<1;});
    // New replies must resume following even after the reader scrolled back.
    await page.locator('#terminalScreen').evaluate(e=>{e.scrollTop=0;e.dispatchEvent(new Event('wheel'));});
    await page.evaluate(()=>window.__game.notify('Newest reply'));await settle();
    const layout=await page.evaluate(async()=>{
      const {gameRect}=await import('/viewport.js'),screen=document.getElementById('terminalScreen'),r=gameRect(screen),keys=gameRect(document.getElementById('terminalKeyboard')),input=gameRect(document.getElementById('terminalInputBar')),entry=document.querySelector('.terminal-history-entry.message:last-child'),range=document.createRange();range.selectNodeContents(entry);const native=range.getBoundingClientRect(),{gamePoint}=await import('/viewport.js'),a=gamePoint({clientX:native.left,clientY:native.top}),b=gamePoint({clientX:native.right,clientY:native.bottom});
      return {bottomGap:screen.scrollHeight-screen.scrollTop-screen.clientHeight,textTop:Math.min(a.y,b.y),textBottom:Math.max(a.y,b.y),screenTop:r.top,screenBottom:r.bottom,keyboardTop:keys.top,inputTop:input.top,visibleHeight:screen.clientHeight};
    });
    assert.ok(layout.bottomGap<1&&layout.textTop>=layout.screenTop&&layout.textBottom<=layout.screenBottom&&layout.screenBottom<=layout.inputTop&&layout.screenBottom<=layout.keyboardTop,JSON.stringify({physical,layout}));layouts.push({physical,...layout});
    if(physical.width===844)await capture('keyboard');
    await page.locator('#terminalScreen').evaluate(e=>{e.scrollTop=0;e.dispatchEvent(new Event('wheel'));});
    await page.evaluate(()=>window.__game.scheduleTerminalLayout());await settle();assert.equal(await page.locator('#terminalScreen').evaluate(e=>e.scrollTop),0,'Layout interrupted reading without new output');
    await page.keyboard.type('pilot entry');await settle();assert.ok(await page.locator('#terminalScreen').evaluate(e=>e.scrollHeight-e.scrollTop-e.clientHeight<1),'Typing did not return to newest output');
    await page.keyboard.press('Enter');await settle();assert.equal(await page.locator('.terminal-history-entry.input').last().textContent(),'> pilot entry');assert.ok(await page.locator('#terminalScreen').evaluate(e=>e.scrollHeight-e.scrollTop-e.clientHeight<1),'Submitting did not return to newest output');
  }
  await page.setViewportSize({width:844,height:390});await settle();
  const immediate=await page.evaluate(()=>{const g=window.__game;g.clearTerminal();g.settings.reducedMotion=false;g.applySettings();g.showDetails(g.state.system.planets.find(p=>p.name==='Earth'));g.updateTerminal(g.state.terminal.start+100);const typing=!g.state.terminal.finished;g.notify('Immediate reply');const reply=g.state.terminalEntries.at(-1);return {typing,finished:g.state.terminal.finished,hidden:reply.node.hidden,text:reply.node.textContent};});
  assert.ok(immediate.typing&&immediate.finished&&!immediate.hidden,JSON.stringify(immediate));assert.equal(immediate.text,'STATUS : Immediate reply');
  return {taps,singleTouchActivation:true,fingerMovement:true,cancellation:true,keyboardActivation:true,distanceInData:true,layouts,immediateReply:true};
}
