import assert from 'node:assert/strict';

export async function checkRelease11231(page,engine){
  const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
  const capture=async tag=>{
    const png=await page.screenshot({path:`.qa/${engine}-11231-${tag}.png`});
    if(engine==='webkit'&&process.env.QA_LAYOUT_PREVIEW==='true'){const data=png.toString('base64');for(let i=0;i<data.length;i+=6000)console.log(`QA_PREVIEW:11231-${tag}:${i/6000}:${data.slice(i,i+6000)}`);}
  };
  await page.evaluate(async()=>{
    window.__cameraOriginal=[{object:window,key:'orientation'},{object:navigator,key:'userAgent'},{object:screen,key:'width'},{object:screen,key:'height'}].map(item=>({...item,descriptor:Object.getOwnPropertyDescriptor(item.object,item.key)}));
    window.__cameraOriginalAgent=navigator.userAgent;
    const g=window.__game,{DEFAULT_SETTINGS}=await import('/src/core/settings.js');Object.assign(g.settings,DEFAULT_SETTINGS,{music:false,paused:true,controls:'touch',reducedMotion:true,showClock:true,showCoords:true});g.create(true);g.launch();g.applySettings();
  });
  const layouts=[];
  for(const layout of [
    {name:'no-camera',width:844,height:390},
    {name:'iphone14-left',width:844,height:390,left:47,right:47,bottom:21,angle:90},
    {name:'iphone14-right',width:844,height:390,left:47,right:47,bottom:21,angle:-90},
    {name:'unknown-side',width:844,height:390,left:47,right:47,bottom:21},
    {name:'portrait-fallback',width:390,height:844,top:47,bottom:34,angle:0},
    {name:'larger-camera',width:393,height:852,top:59,bottom:34,angle:0},
    {name:'short-browser-chrome',width:844,height:320,left:47,right:47,bottom:21,angle:90,screenShort:390},
    {name:'iphone14-inset-fallback',width:844,height:390,angle:-90,iphone:true},
    {name:'small-screen',width:640,height:360,right:47,bottom:21,angle:-90}
  ]){
    await page.setViewportSize({width:layout.width,height:layout.height});
    await page.evaluate(layout=>{
      for(const side of ['left','right','top','bottom'])document.documentElement.style.setProperty('--device-safe-'+side,(layout[side]||0)+'px');
      Object.defineProperty(window,'orientation',{configurable:true,value:layout.angle});Object.defineProperty(navigator,'userAgent',{configurable:true,value:layout.iphone?'iPhone AppleWebKit Safari':window.__cameraOriginalAgent});
      Object.defineProperty(screen,'width',{configurable:true,value:layout.screenShort||Math.min(layout.width,layout.height)});Object.defineProperty(screen,'height',{configurable:true,value:Math.max(layout.width,layout.height)});
      window.dispatchEvent(new Event('orientationchange'));
    },layout);
    await page.waitForFunction(v=>window.__game.state.width===Math.max(v.width,v.height)&&window.__game.state.height===Math.min(v.width,v.height),layout);await settle();
    await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.settings.terminalResizeHandles=false;g.settings.terminalWidthScale=100;g.settings.dashboardHeight=68;g.applySettings();g.select(g.state.system.planets.find(p=>p.name==='Earth'));g.updateUI();});await settle();
    const check=async ids=>{
      const result=await page.evaluate(async ids=>{
        const {viewport:v,gameRect}=await import('/src/core/viewport.js'),{cameraAreas}=await import('/src/ui/camera-layout.js'),{overlaps}=await import('/src/ui/hud.js');
        const read=e=>{const r=gameRect(e);return {x:r.left,y:r.top,width:r.width,height:r.height};};
        const fields=ids.map(id=>{
          const e=document.querySelector(id.startsWith('.')||id.startsWith('[')?id:'#'+id),r=read(e);
          // Overlay backgrounds fill the screen; inspect the padded area where
          // their controls/text paint, rather than that background's border box.
          if(['journalFilters','journalContent','.journal-pagination'].includes(id)){const c=getComputedStyle(e),l=parseFloat(c.paddingLeft),right=parseFloat(c.paddingRight),top=parseFloat(c.paddingTop),b=parseFloat(c.paddingBottom);r.x+=l;r.y+=top;r.width-=l+right;r.height-=top+b;}
          return {id,...r,inside:r.width>0&&r.height>0&&r.x>=-.2&&r.y>=-.2&&r.x+r.width<=v.width+.2&&r.y+r.height<=v.height+.2,clear:!cameraAreas.some(a=>overlaps(r,a,0))};
        });
        const raw=document.getElementById('gameViewport').getBoundingClientRect();return {fields,areas:cameraAreas.map(a=>({...a})),root:{left:raw.left,top:raw.top,width:raw.width,height:raw.height},canvas:read(document.getElementById('sky')),view:{width:v.width,height:v.height}};
      },ids);
      assert.equal(result.root.left,0);assert.equal(result.root.top,0);assert.equal(result.root.width,layout.width);assert.equal(result.root.height,layout.height);
      assert.deepEqual(result.canvas,{x:0,y:0,width:Math.max(layout.width,layout.height),height:Math.min(layout.width,layout.height)});
      assert.ok(result.fields.every(f=>f.inside&&f.clear),JSON.stringify({layout,result}));return result;
    };
    const compact=await check(['clockTime','clockDate','coordsReadout','settingsOpen','systemFit','joystick','navigationControls','mapButton','secondaryAction','cancelTravel','focusSelected','primaryAction','targetStatus','targetDistance']);
    const chartBounds=await page.locator('#systemChart').evaluate(async e=>{const {gameRect}=await import('/src/core/viewport.js'),r=gameRect(e);return {left:r.left,width:r.width};});
    assert.equal(chartBounds.left,3);assert.ok(chartBounds.width>=218&&chartBounds.width<=248,JSON.stringify({layout,chartBounds}));
    if(layout.name==='iphone14-left')assert.equal(compact.areas[0].x,0);
    if(layout.name==='iphone14-right')assert.equal(compact.areas[0].x,791);
    if(layout.name==='no-camera')assert.equal(compact.areas.length,0);
    const arrow=await page.locator('.mission-chevron').boundingBox();await page.touchscreen.tap(arrow.x+arrow.width/2,arrow.y+arrow.height/2);
    assert.equal(await page.locator('#systemChartToggle').getAttribute('aria-expanded'),'true');await settle();
    await page.locator('#systemChartScrollbar').press('Home');await settle();
    await check(['systemChartScrollbar','.body-entry']);
    // The recess removes panel hit testing inside the camera while leaving
    // the full-width canvas beneath it. Scroll remains usable beside the cutout.
    const holes=await page.evaluate(async()=>{
      const {viewport:v}=await import('/src/core/viewport.js'),{cameraAreas}=await import('/src/ui/camera-layout.js');
      return cameraAreas.map(a=>{const x=a.x+a.width/2,y=a.y+a.height/2,p=v.rotated?{x:v.physicalWidth-y+v.left,y:x+v.top}:{x:x+v.left,y:y+v.top};return document.elementFromPoint(p.x,p.y)?.closest('button,input,.mission-content')?.id||null;});
    });assert.ok(holes.every(id=>id===null),JSON.stringify({layout,holes}));
    await page.locator('#systemChartScrollbar').press('End');assert.ok(await page.locator('#systemChartContent').evaluate(e=>e.scrollTop>0));
    if(layout.name==='iphone14-left')await capture('full-width-fitted-chart');
    await page.locator('#systemChartToggle').click();await settle();await page.locator('#secondaryAction').click();await settle();
    await page.evaluate(()=>{const g=window.__game;g.frame(performance.now());g.appendTerminalEntry('Camera scroll fixture\n'+Array.from({length:40},(_,i)=>'Visible line '+i).join('\n'),'input',{log:false});});await settle();
    await check(['terminalClear','secondaryAction','terminalInputBar','targetStatus','targetDistance','cancelTravel','focusSelected','primaryAction','terminalScrollbar']);
    await page.locator('#terminalKeyboardToggle').click();await settle();await check(['terminalKeyboard','terminalInputBar','terminalScreen','[data-key="P"]','[data-key="Enter"]','[data-key="/"]','joystick','navigationControls','mapButton']);
    await page.locator('[data-key="Clear"]').click();await page.locator('[data-key="A"]').click();assert.match(await page.locator('#terminalInput').inputValue(),/a/i);await page.locator('[data-key="Clear"]').click();
    await page.locator('#focusSelected').click();assert.equal(await page.evaluate(()=>window.__game.state.focusBody),await page.evaluate(()=>window.__game.state.system.planets.find(p=>p.name==='Earth').id));
    await settle();await check(['joystick','navigationControls']);
    if(layout.name==='iphone14-right'){
      await capture('full-width-fitted-terminal');
      await page.evaluate(()=>{const g=window.__game;g.settings.terminalResizeHandles=true;g.settings.terminalWidthScale=60;g.state.terminalSize=null;g.applySettings();});await settle();
      await check(['terminalResizeTop','terminalResizeLeft','terminalClear','secondaryAction','terminalKeyboard','terminalInputBar']);
      await page.evaluate(()=>{const g=window.__game;g.settings.terminalResizeHandles=false;g.settings.terminalWidthScale=100;g.applySettings();});await settle();
    }
    await page.locator('#secondaryAction').click();await settle();
    await page.locator('#settingsOpen').click();await settle();await check(['modalClose','.settings-tabs','.settings-pane:not([hidden])']);await page.locator('#modalClose').click();
    await page.locator('#journalButton').click();await settle();await check(['journalClose','journalFilters','journalContent','.journal-pagination']);await page.locator('#journalClose').click();await settle();
    layouts.push({name:layout.name,fullWidth:Math.max(layout.width,layout.height),cameraAreas:compact.areas});
  }
  // The camera-free closed rail and the open rail keep the original fluid
  // horizontal motion; no intermediate animation frame can enter the camera.
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>{
    for(const side of ['left','right','bottom'])document.documentElement.style.setProperty('--device-safe-'+side,(side==='bottom'?21:47)+'px');Object.defineProperty(window,'orientation',{configurable:true,value:-90});window.dispatchEvent(new Event('orientationchange'));
    const g=window.__game;Object.assign(g.settings,{reducedMotion:false,terminalResizeHandles:false,terminalWidthScale:100});g.applySettings();g.select(g.state.system.planets.find(p=>p.name==='Earth'));g.updateUI();
  });
  // Selection has its own 550ms entrance. Finish it before measuring the
  // terminal toggle; otherwise its final fraction looks like vertical drift.
  await page.locator('#travelControls .context-action-row').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));
  await settle();
  for(const phase of ['open','close']){
    const samples=await page.evaluate(async()=>{
      const {gameRect}=await import('/src/core/viewport.js'),{cameraAreas}=await import('/src/ui/camera-layout.js'),{overlaps}=await import('/src/ui/hud.js'),ids=['cancelTravel','focusSelected','primaryAction'];
      const read=()=>ids.map(id=>{const r=gameRect(document.getElementById(id)),a={x:r.left,y:r.top,width:r.width,height:r.height};return {...a,clear:!cameraAreas.some(o=>overlaps(a,o,0))};});const out=[read()],begin=performance.now();document.getElementById('secondaryAction').click();
      while(performance.now()-begin<360){await new Promise(r=>requestAnimationFrame(r));out.push(read());}return out;
    });
    for(let i=0;i<3;i++){assert.ok(samples.every(row=>row[i].clear),JSON.stringify({phase,samples}));assert.ok(Math.max(...samples.map(row=>Math.abs(row[i].y-samples[0][i].y)))<.2,JSON.stringify({phase,samples}));}
  }
  await page.evaluate(()=>{
    for(const side of ['left','right','top','bottom'])document.documentElement.style.removeProperty('--device-safe-'+side);
    for(const {object,key,descriptor}of window.__cameraOriginal){if(descriptor)Object.defineProperty(object,key,descriptor);else delete object[key];}delete window.__cameraOriginal;delete window.__cameraOriginalAgent;window.dispatchEvent(new Event('orientationchange'));
  });await settle();
  return {layouts,fullViewportRestored:true,localCurvedRecesses:true,sideTracksOrientation:true,touchAndScroll:true,horizontalAnimationClear:true};
}
