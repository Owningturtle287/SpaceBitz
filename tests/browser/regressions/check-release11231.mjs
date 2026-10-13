import assert from 'node:assert/strict';

export async function checkRelease11231(page,engine){
  const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const capture=async tag=>{
    const png=await page.screenshot({path:`.qa/${engine}-11231-${tag}.png`});
    if(engine==='webkit'&&process.env.QA_LAYOUT_PREVIEW==='true'){const data=png.toString('base64');for(let i=0;i<data.length;i+=6000)console.log(`QA_PREVIEW:11231-${tag}:${i/6000}:${data.slice(i,i+6000)}`);}
  };
  await page.evaluate(async()=>{const g=window.__game,{DEFAULT_SETTINGS}=await import('/src/core/settings.js');Object.assign(g.settings,DEFAULT_SETTINGS,{music:false,paused:true,controls:'touch',reducedMotion:true,showClock:true,showCoords:true});g.create(true);g.launch();g.applySettings();});
  const layouts=[];
  for(const layout of [
    {name:'left-camera',width:844,height:390,left:47,bottom:21},
    {name:'right-camera',width:844,height:390,right:47,bottom:21},
    {name:'both-landscape-edges',width:844,height:390,left:47,right:47,bottom:21},
    {name:'portrait-camera',width:390,height:844,top:47,bottom:34},
    {name:'island-portrait',width:393,height:852,top:59,bottom:34},
    {name:'android-cutout',width:915,height:412,left:32,bottom:24},
    {name:'small-cutout-screen',width:568,height:320,left:32,bottom:20}
  ]){
    await page.setViewportSize({width:layout.width,height:layout.height});
    // Override the probe's physical CSS inputs, not the inner game padding.
    // Deliberately avoid applySettings/refreshViewport: the observer must react
    // even when the phone flips the cutout side without changing dimensions.
    await page.evaluate(layout=>{for(const side of ['left','right','top','bottom'])document.documentElement.style.setProperty('--device-safe-'+side,(layout[side]||0)+'px');},layout);
    const physicalWidth=layout.width-(layout.left||0)-(layout.right||0),physicalHeight=layout.height-(layout.top||0)-(layout.bottom||0);
    await page.waitForFunction(({w,h,left,top})=>{const g=window.__game,r=document.getElementById('gameViewport').getBoundingClientRect();return g.state.width===Math.max(w,h)&&g.state.height===Math.min(w,h)&&Math.abs(r.left-left)<.1&&Math.abs(r.top-top)<.1;},{w:physicalWidth,h:physicalHeight,left:layout.left||0,top:layout.top||0});await settle();
    const read=ids=>page.evaluate(ids=>{
      const bounds=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};},root=bounds(document.getElementById('gameViewport'));
      const fields=ids.map(id=>{const e=document.querySelector(id.startsWith('.')?id:'#'+id),r=bounds(e);return {id,...r,inside:r.width>0&&r.height>0&&r.left>=root.left-.2&&r.top>=root.top-.2&&r.right<=root.right+.2&&r.bottom<=root.bottom+.2};});
      return {root,fields,canvas:bounds(document.getElementById('sky')),innerInsets:['left','right','top','bottom'].map(side=>getComputedStyle(document.documentElement).getPropertyValue('--safe-'+side).trim())};
    },ids);
    const check=async ids=>{const fit=await read(ids);assert.ok(fit.fields.every(f=>f.inside),JSON.stringify({layout,fit}));assert.equal(fit.root.width,physicalWidth);assert.equal(fit.root.height,physicalHeight);assert.deepEqual(fit.canvas,fit.root);assert.ok(fit.innerInsets.every(value=>value==='0px'));return fit;};
    await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.select(g.state.system.planets.find(p=>p.name==='Earth'));g.updateUI();});await settle();
    await check(['systemChart','clockTime','clockDate','coordsReadout','systemChartToggle','settingsOpen','systemFit','joystick','navigationControls','mapButton','targetCard','secondaryAction','cancelTravel','focusSelected','primaryAction']);
    // A tap through the inset/rotated physical surface still maps into the chart.
    const arrow=await page.locator('.mission-chevron').boundingBox();await page.touchscreen.tap(arrow.x+arrow.width/2,arrow.y+arrow.height/2);
    assert.equal(await page.locator('#systemChartToggle').getAttribute('aria-expanded'),'true');await settle();await check(['systemChartContent','systemChartScrollbar']);
    if(layout.name==='left-camera')await capture('left-camera-chart');
    await page.locator('#systemChartToggle').click();await settle();
    await page.locator('#secondaryAction').click();await settle();
    await check(['targetCard','terminalClear','secondaryAction','terminalInputBar','targetStatus','targetDistance','cancelTravel','focusSelected','primaryAction']);
    await page.locator('#terminalKeyboardToggle').click();await settle();await check(['targetCard','terminalKeyboard','terminalInputBar','terminalScreen']);
    // Use a real key press and Focus tap, not a programmatic button invocation.
    await page.locator('[data-key="Clear"]').click();await page.locator('[data-key="A"]').click();assert.match(await page.locator('#terminalInput').inputValue(),/a/i);
    await page.locator('[data-key="Clear"]').click();
    await page.locator('#focusSelected').click();assert.equal(await page.evaluate(()=>window.__game.state.focusBody),await page.evaluate(()=>window.__game.state.system.planets.find(p=>p.name==='Earth').id));
    if(layout.name==='right-camera')await capture('right-camera-terminal');
    await page.locator('#secondaryAction').click();await settle();
    await page.locator('#settingsOpen').click();await settle();await check(['modalClose','.settings-tabs']);await page.locator('#modalClose').click();
    await page.locator('#journalButton').click();await settle();await check(['journalClose','journalFilters','.journal-pagination']);await page.locator('#journalClose').click();await settle();
    layouts.push({name:layout.name,physicalWidth,physicalHeight});
  }
  // Changing CSS safe values alone must restore the full viewport as well.
  await page.evaluate(()=>{for(const side of ['left','right','top','bottom'])document.documentElement.style.removeProperty('--device-safe-'+side);});
  await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>window.__game.state.width===844&&window.__game.state.height===390);
  return {layouts,wholeSurfaceSafe:true,cutoutSideUpdates:true,rotatedTouchTargets:true,terminalAndOverlays:true};
}
