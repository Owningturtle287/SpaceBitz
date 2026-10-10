import assert from 'node:assert/strict';

export async function checkRelease11222(page,engine){
  const tap=async locator=>{await locator.click({trial:true});const r=await locator.boundingBox();await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);};
  const capture=async name=>{
    const png=await page.screenshot({path:`.qa/${engine}-11222-${name}.png`});
    if(engine==='webkit'&&process.env.QA_LAYOUT_PREVIEW==='true'){
      const data=png.toString('base64');for(let i=0;i<data.length;i+=6000)console.log(`QA_PREVIEW:11222-${name}:${i/6000}:${data.slice(i,i+6000)}`);
    }
  };
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(async()=>{const g=window.__game,{DEFAULT_SETTINGS}=await import('/src/core/settings.js');Object.assign(g.settings,DEFAULT_SETTINGS,{music:false,paused:true,controls:'touch',reducedMotion:true});g.create(true);g.applySettings();});
  const tabs=[];
  for(const scene of ['surface','system','chart']){
    await page.evaluate(scene=>{const g=window.__game;if(scene==='system')g.launch();if(scene==='chart')g.enterChart();g.updateUI();},scene);
    const tab=await page.locator('#systemChartToggle').evaluate(e=>({text:e.textContent.trim(),height:document.querySelector('.mission-toggle-copy').offsetHeight,name:document.getElementById('placeLabel').textContent,labels:document.querySelectorAll('#modeLabel,.mission-toggle .eyebrow').length}));
    assert.equal(tab.name,scene==='surface'?'Earth':scene==='system'?'Sol':'Deep Space');assert.equal(tab.labels,0);assert.ok(tab.height===28,JSON.stringify(tab));tabs.push(tab);
    await tap(page.locator('#systemChartToggle'));
    if(scene==='surface'){assert.equal(await page.locator('#terminalScreen').isVisible(),true);assert.match(await page.evaluate(()=>window.__game.state.terminal.text),/Object Data: Earth/);}
    else{assert.equal(await page.locator('#systemChartContent').isVisible(),true);await tap(page.locator('#systemChartToggle'));}
  }
  const layouts=[];
  for(const physical of [{width:844,height:390},{width:390,height:844},{width:844,height:390}]){
    await page.setViewportSize(physical);
    await page.waitForFunction(v=>window.__game.state.width===Math.max(v.width,v.height)&&window.__game.state.height===Math.min(v.width,v.height),physical);
    await page.evaluate(()=>{const g=window.__game;g.settings.terminalInputFont=6;g.settings.terminalFontMode='individual';g.applySettings();g.clearTerminal();g.showDetails(g.state.selected);g.updateTerminal(performance.now());document.getElementById('terminalInput').value='';});
    await tap(page.locator('#terminalInput'));await page.locator('#terminalKeyboard').waitFor({state:'visible'});
    assert.equal(await page.locator('#terminalInput').evaluate(e=>e.readOnly),true);assert.ok(await page.locator('#terminalInput').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));
    const layout=await page.evaluate(async()=>{
      const {viewport:v,gameRect}=await import('/src/core/viewport.js'),g=window.__game;g.frame(performance.now());
      const r=gameRect(document.getElementById('targetCard')),canvas=document.getElementById('sky'),data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      return {scale:v.scale,inside:r.left>=0&&r.top>=0&&r.right<=v.width&&r.bottom<=v.height,painted:data.some((value,i)=>i%4===3&&value>0),dimensions:[g.state.width,g.state.height]};
    });
    assert.equal(layout.scale,1);assert.equal(layout.inside,true);assert.equal(layout.painted,true);layouts.push(layout);
    await tap(page.locator('[data-key="Q"]'));await tap(page.locator('[data-key="W"]'));assert.equal(await page.locator('#terminalInput').inputValue(),'qw');
    assert.equal(await page.locator('#terminalInput').evaluate(e=>document.activeElement===e),true,'Pixel keys lost terminal input focus');
    await page.keyboard.press('Backspace');await page.keyboard.type('A');assert.equal(await page.locator('#terminalInput').inputValue(),'qA');
    await page.locator('#terminalInput').evaluate(e=>{e.setSelectionRange(0,1);const data=new DataTransfer();data.setData('text/plain','<b>\n');e.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});
    assert.equal(await page.locator('#terminalInput').inputValue(),'<b> A');
    if(physical.width===844)await capture('keyboard');
    await page.keyboard.press('Enter');assert.equal(await page.locator('#terminalInput').inputValue(),'');assert.equal(await page.locator('.terminal-history-entry.input').last().textContent(),'> <b> A');assert.equal(await page.locator('.terminal-history-entry.input b').count(),0);
    assert.equal(await page.locator('.terminal-history-entry.input').last().evaluate(e=>getComputedStyle(e).fontSize),'6px');
  }
  // Reproduce a browser's scale/offset changes without relying on desktop
  // Playwright to implement iOS's native focus zoom. Cover both orientations.
  const zooms=[];
  for(const physical of [{width:844,height:390},{width:390,height:844}]){
    await page.setViewportSize(physical);
    const zoom=await page.evaluate(async physical=>{
      const original=Object.getOwnPropertyDescriptor(window,'visualViewport'),native=window.visualViewport;
      Object.defineProperty(window,'visualViewport',{configurable:true,value:{width:physical.width/2,height:physical.height/2,scale:2,offsetLeft:80,offsetTop:35}});
      window.dispatchEvent(new Event('resize'));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const {viewport:v,gameRect,gamePoint}=await import('/src/core/viewport.js'),root=document.getElementById('gameViewport'),box=root.getBoundingClientRect(),terminal=document.getElementById('targetCard'),r=terminal.getBoundingClientRect(),logical=gameRect(terminal),point=gamePoint({clientX:(r.left+r.right)/2,clientY:(r.top+r.bottom)/2});
      window.__game.frame(performance.now());const canvas=document.getElementById('sky'),data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      const result={width:v.width,height:v.height,box:[box.left,box.top,box.width,box.height],point:[point.x,point.y],center:[logical.left+logical.width/2,logical.top+logical.height/2],painted:data.some((value,i)=>i%4===3&&value>0)};
      if(original)Object.defineProperty(window,'visualViewport',original);else{delete window.visualViewport;if(window.visualViewport!==native)throw Error('Visual viewport restoration failed');}
      window.dispatchEvent(new Event('resize'));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return result;
    },physical);
    assert.equal(zoom.width,844);assert.equal(zoom.height,390);assert.deepEqual(zoom.box,[80,35,physical.width/2,physical.height/2]);assert.deepEqual(zoom.point,zoom.center);assert.equal(zoom.painted,true);zooms.push(zoom);
  }
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=false;g.applySettings();g.showJournal();});
  await page.waitForFunction(()=>!document.getElementById('journalPanel').getAnimations().length);await capture('log');
  await tap(page.locator('#journalClose'));
  const animation=await page.evaluate(async()=>{
    const panel=document.getElementById('journalPanel'),overlay=document.getElementById('journal'),a=panel.getAnimations()[0];a.pause();a.currentTime=150;
    const {gameRect}=await import('/src/core/viewport.js'),button=gameRect(document.getElementById('journalButton')),frames=a.effect.getKeyframes(),m=new DOMMatrix(frames.at(-1).transform);
    const result={background:getComputedStyle(overlay).backgroundColor,duration:a.effect.getTiming().duration,midScale:new DOMMatrix(getComputedStyle(panel).transform).a,target:[panel.offsetWidth/2+m.e,panel.offsetHeight/2+m.f],button:[button.left+button.width/2,button.top+button.height/2],deck:getComputedStyle(document.getElementById('terminalPocket')).visibility};a.play();return result;
  });
  assert.equal(animation.background,'rgba(0, 0, 0, 0)');assert.equal(animation.deck,'visible');assert.ok(animation.midScale>0&&animation.midScale<1);assert.deepEqual(animation.target,animation.button);await page.locator('#journal').waitFor({state:'hidden'});
  // Closing before opening finishes must start from the visible size, not jump.
  await page.evaluate(()=>{const g=window.__game;g.showJournal();const a=document.getElementById('journalPanel').getAnimations()[0];a.pause();a.currentTime=100;});
  const interrupted=await page.evaluate(()=>{const panel=document.getElementById('journalPanel'),before=getComputedStyle(panel).transform;window.__game.closeJournal(false);const first=panel.getAnimations()[0].effect.getKeyframes()[0].transform;return {before,first};});
  assert.deepEqual(DOMMatrixValues(interrupted.before),DOMMatrixValues(interrupted.first));await page.locator('#journal').waitFor({state:'hidden'});
  const native=await page.evaluate(async()=>{
    const {enterLandscape}=await import('/src/core/viewport.js'),root=document.documentElement,orientation=screen.orientation;
    const fs=Object.getOwnPropertyDescriptor(root,'requestFullscreen'),enabled=Object.getOwnPropertyDescriptor(document,'fullscreenEnabled'),lock=orientation&&Object.getOwnPropertyDescriptor(orientation,'lock'),calls=[];
    Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:true});Object.defineProperty(root,'requestFullscreen',{configurable:true,value:async options=>calls.push(['fullscreen',options.navigationUI])});
    if(orientation)Object.defineProperty(orientation,'lock',{configurable:true,value:async value=>calls.push(['lock',value])});await enterLandscape();
    Object.defineProperty(root,'requestFullscreen',{configurable:true,value:async()=>{throw Error('Unsupported');}});await enterLandscape();
    if(fs)Object.defineProperty(root,'requestFullscreen',fs);else delete root.requestFullscreen;if(enabled)Object.defineProperty(document,'fullscreenEnabled',enabled);else delete document.fullscreenEnabled;
    if(orientation){if(lock)Object.defineProperty(orientation,'lock',lock);else delete orientation.lock;}return calls;
  });
  assert.deepEqual(native,[['fullscreen','hide'],['lock','landscape'],['lock','landscape']]);
  return {tabs,touchKeyboard:true,physicalTypingAndPaste:true,layouts,zooms,logAnimation:animation,interruptedLog:true,nativeLandscapeFallback:true};
}

// Parse the CSS matrices outside the browser for an exact interrupted-frame check.
function DOMMatrixValues(value){return value==='none'?[1,0,0,1,0,0]:value.match(/\(([^)]+)\)/)[1].split(',').map(Number);}
