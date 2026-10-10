import assert from 'node:assert/strict';

export async function checkRelease11226(page,engine){
  const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const capture=async tag=>{
    const png=await page.screenshot({path:`.qa/${engine}-11226-${tag}.png`});
    if(engine==='webkit'&&process.env.QA_LAYOUT_PREVIEW==='true'){const data=png.toString('base64');for(let i=0;i<data.length;i+=6000)console.log(`QA_PREVIEW:11226-${tag}:${i/6000}:${data.slice(i,i+6000)}`);}
  };
  await page.evaluate(async()=>{const g=window.__game,{DEFAULT_SETTINGS}=await import('/src/core/settings.js');Object.assign(g.settings,DEFAULT_SETTINGS,{music:false,paused:true,controls:'touch',reducedMotion:false});g.create(true);g.launch();g.applySettings();});
  const layouts=[],motions=[];
  for(const physical of [{width:844,height:390},{width:390,height:844},{width:667,height:375},{width:640,height:360}]){
    await page.setViewportSize(physical);
    await page.waitForFunction(v=>window.__game.state.width===Math.max(v.width,v.height)&&window.__game.state.height===Math.min(v.width,v.height),physical);
    await settle();
    const control=await page.evaluate(async()=>{
      const {viewport:v,gameRect}=await import('/src/core/viewport.js'),button=document.getElementById('systemChartToggle'),tab=gameRect(button),frame=document.getElementById('systemChartFramePath'),path=document.getElementById('systemChartButtonPath'),box=path.getBBox(),outer=frame.getBBox(),r=parseFloat(getComputedStyle(button).borderTopRightRadius),w=button.clientWidth,t=button.clientHeight;
      const points=[{x:box.x+8,y:t/2},{x:w-r+Math.sqrt((r-1)**2-(r-t+6)**2)-6,y:t-6}];
      return {radius:r,arcRadius:Number(path.getAttribute('d').match(/ A([\d.]+)/)[1]),width:box.width,height:box.height,stroke:getComputedStyle(path).stroke,sharedArc:path.getAttribute('d').split(' A')[1].split(' H')[0]===frame.getAttribute('d').split(' A')[1].split(' H')[0],rightError:Math.abs(box.x+box.width-outer.x-outer.width),arrowInside:path.isPointInFill(new DOMPoint(document.querySelector('.mission-chevron').offsetLeft+20,t/2)),points:points.map(p=>{const x=tab.left+p.x,y=tab.top+p.y;return v.rotated?{x:v.physicalWidth-y+v.left,y:x+v.top}:{x:x+v.left,y:y+v.top};})};
    });
    assert.ok(control.width>=44&&Math.abs(control.height-26)<.02&&control.sharedArc&&Math.abs(control.arcRadius-control.radius+1)<.02&&control.rightError<.02&&control.arrowInside,JSON.stringify({physical,control}));assert.equal(control.stroke,'rgb(239, 200, 90)');
    for(const p of control.points){await page.touchscreen.tap(p.x,p.y);assert.equal(await page.locator('#systemChartToggle').getAttribute('aria-expanded'),'true');await page.touchscreen.tap(p.x,p.y);assert.equal(await page.locator('#systemChartToggle').getAttribute('aria-expanded'),'false');}
    if(physical.width===844)await capture('chart-button');
    await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=true;g.applySettings();g.select({...g.state.system.planets.find(p=>p.name==='Earth'),name:'Rhea-851 I'});g.updateUI();});await settle();
    const compact=await page.evaluate(async()=>{
      const {gameRect}=await import('/src/core/viewport.js'),card=gameRect(document.getElementById('targetCard')),deck=gameRect(document.getElementById('dashboardBase')),status=document.getElementById('targetStatus'),name=gameRect(status),distance=gameRect(document.getElementById('targetDistance'));
      return {topGap:card.top-deck.top,bottomGap:deck.bottom-card.bottom,summary:status.textContent,summaryFits:status.scrollHeight<=status.clientHeight+1,dataFits:distance.top>=name.bottom&&distance.bottom<=card.bottom-2,controlsClear:gameRect(document.getElementById('primaryAction')).bottom<=card.top};
    });
    assert.ok(Math.abs(compact.topGap)<.2&&compact.bottomGap>=2&&compact.summaryFits&&compact.dataFits&&compact.controlsClear,JSON.stringify({physical,compact}));assert.match(compact.summary,/Rhea-851 I/);layouts.push({physical,control,compact});
    if(physical.width===844)await capture('flush-terminal');
    await page.evaluate(()=>{window.__game.settings.reducedMotion=false;window.__game.applySettings();});await settle();
    // Record the whole transition, including the frame where the mode changes.
    // An end-position check alone cannot catch a jump followed by a correction.
    for(const phase of ['open','close','interrupt']){
      const frames=await page.evaluate(async phase=>{
        const {gameRect}=await import('/src/core/viewport.js'),ids=['cancelTravel','primaryAction','focusSelected'],read=()=>ids.map(id=>{const r=gameRect(document.getElementById(id));return {x:r.left,y:r.top};}),samples=[read()],start=performance.now();
        document.getElementById('secondaryAction').click();let reversed=false;
        while(performance.now()-start<360){await new Promise(r=>requestAnimationFrame(r));samples.push(read());if(phase==='interrupt'&&!reversed&&performance.now()-start>=90){document.getElementById('secondaryAction').click();reversed=true;}}
        return samples;
      },phase);
      for(let button=0;button<3;button++){
        const samples=frames.map(f=>f[button]),drift=Math.max(...samples.map(s=>Math.abs(s.y-samples[0].y)));assert.ok(drift<.2,JSON.stringify({physical,phase,button,drift,samples}));
        if(phase!=='interrupt'){
          assert.ok(Math.abs(samples.at(-1).x-samples[0].x)>100,'Controls did not slide sideways');
          const direction=phase==='open'?-1:1;assert.ok(samples.slice(1).every((s,i)=>direction*(s.x-samples[i].x)>=-.4),JSON.stringify({physical,phase,button,samples}));
        }
      }
      motions.push({physical,phase,frames:frames.length,verticalDrift:Math.max(...frames.flatMap(f=>f.map((p,i)=>Math.abs(p.y-frames[0][i].y))))});
    }
    assert.equal(await page.locator('#secondaryAction').getAttribute('aria-expanded'),'false');
  }
  await page.setViewportSize({width:844,height:390});await settle();
  // Safe-area padding, a resized dashboard and large chosen terminal fonts
  // must not make the closed card grow upward again.
  const preferences=[];
  for(const dashboardHeight of [68,110]){
    const result=await page.evaluate(async dashboardHeight=>{const g=window.__game;document.documentElement.style.setProperty('--dashboard-safe-bottom','21px');Object.assign(g.settings,{dashboardHeight,terminalFontMode:'master',terminalFontSize:18,reducedMotion:true});g.applySettings();g.updateUI();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const {gameRect}=await import('/src/core/viewport.js'),card=gameRect(document.getElementById('targetCard')),deck=gameRect(document.getElementById('dashboardBase')),distance=gameRect(document.getElementById('targetDistance'));return {topGap:card.top-deck.top,dataFits:distance.bottom<=card.bottom-2};},dashboardHeight);
    assert.ok(Math.abs(result.topGap)<.2&&result.dataFits,JSON.stringify({dashboardHeight,result}));preferences.push({dashboardHeight,...result});
  }
  await page.evaluate(()=>document.documentElement.style.removeProperty('--dashboard-safe-bottom'));
  return {layouts,motions,preferences,curveFittedButton:true,flushTerminal:true,horizontalMotion:true};
}
