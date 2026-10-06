import assert from 'node:assert/strict';

export async function checkRelease1126(page,engine){
  await page.evaluate(async()=>{
    const g=window.__game,s=g.state,{makeSystem}=await import('/model.js');
    globalThis.__qaPause=true;g.cancelTarget();s.scene='system';s.system=makeSystem('sol');s.save.currentSystem='sol';
    s.followShip=false;s.followBody=s.focusBody=s.centerZoom=s.autopilot=null;s.terminalSize=null;
    g.settings.controls='touch';g.settings.centerButton='right';g.settings.joyX=16;g.settings.joyOffset=0;g.settings.reducedMotion=false;g.settings.showGrid=false;g.applySettings();
    document.getElementById('terminalDock').style.removeProperty('--terminal-width');document.getElementById('terminalDock').style.removeProperty('--terminal-user-height');
  });
  const layouts=[];
  for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:667,height:375},{width:390,height:844},{width:375,height:667}]){
    await page.setViewportSize(viewport);
    for(const phase of ['closed','collapsed','expanded']){
      await page.evaluate(phase=>{
        const g=window.__game;g.cancelTarget();
        if(phase!=='closed'){g.select(g.state.system.star);if(phase==='expanded')g.showDetails(g.state.selected);}
        g.updateUI();g.backdrop(0);g.drawSystem(0);
      },phase);await page.waitForTimeout(450);
      await page.evaluate(async()=>{
        // The earlier gates verify the actual transitions. Settle this layout sample
        // explicitly so a busy WebKit renderer cannot leave it between widths.
        for(const id of ['terminalDock','terminalPocket','journalButton'])for(const animation of document.getElementById(id).getAnimations())animation.finish();
        await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
      });
      const fit=await page.evaluate(()=>{
        const r=id=>document.getElementById(id).getBoundingClientRect().toJSON(),base=r('dashboardBase'),card=r('targetCard'),joy=r('joystick'),nav=r('navigationControls'),warp=r('mapButton'),log=r('journalButton'),term=r('terminalButton');
        const visible=!document.getElementById('targetCard').hidden,expanded=window.__game.state.terminalExpanded;
        const inside=a=>a.left>=base.left&&a.right<=base.right&&a.top>=base.top&&a.bottom<=base.bottom;
        const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
        const controls=[joy,nav,warp,log,...(visible?[]:[term])];
        return {base,card,joy,nav,warp,log,term,transparent:getComputedStyle(document.getElementById('dashboardBase')).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(document.getElementById('dashboardBase')).backgroundImage==='none',contained:controls.every(inside)&&(!visible||expanded||inside(card)),clear:controls.every((a,i)=>controls.slice(i+1).every(b=>!overlap(a,b)))&&(!visible||controls.every(a=>!overlap(a,card))),right:innerWidth-card.right,aux:document.querySelectorAll('.dashboard-controls').length,launcherHidden:getComputedStyle(document.getElementById('terminalButton')).visibility==='hidden'};
      });
      assert.ok(fit.transparent&&fit.aux===0&&fit.contained&&fit.clear,JSON.stringify({viewport,phase,fit}));
      if(phase==='closed')assert.ok(fit.base.height<=(viewport.width<620?144:84)&&fit.term.width===44&&fit.log.width===44&&fit.term.left>fit.log.right&&viewport.width-fit.term.right<=12,JSON.stringify(fit));
      else{
        assert.ok(fit.right<=12&&fit.right>=0&&fit.warp.right<=fit.log.left&&Math.abs((fit.log.top+fit.log.bottom)/2-(fit.warp.top+fit.warp.bottom)/2)<1&&fit.launcherHidden,JSON.stringify(fit));
        assert.equal(fit.card.width,phase==='collapsed'?Math.min(240,Math.max(200,viewport.width-(viewport.width<620?116:330))):Math.min(264,Math.max(200,viewport.width-(viewport.width<620?102:330))));
        assert.ok(fit.base.height<(viewport.width<620?145:130),JSON.stringify(fit));
      }
      layouts.push({viewport,phase,height:fit.base.height,width:fit.card.width});
      await page.screenshot({path:`.qa/${engine}-1126-${phase}-${viewport.width}.png`});
    }
  }
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{
    const g=window.__game;g.cancelTarget();g.state.scene='system';g.state.camera={x:1e7,y:1e7};g.state.save.ship={...g.state.camera};g.state.zoom=.1;g.updateUI();
  });await page.waitForTimeout(350);
  const picked=()=>page.evaluate(()=>Boolean(window.__game.state.waypoint));
  await page.mouse.click(350,160);assert.equal(await picked(),false,'One space tap selected a coordinate');
  assert.equal(await page.locator('#targetCard').isVisible(),false,'First tap opened terminal');
  const hover=await page.evaluate(()=>{
    const g=window.__game,ctx=document.getElementById('sky').getContext('2d'),stroke=ctx.stroke,fill=ctx.fillRect;let strokes=0,fills=0;
    ctx.stroke=function(...a){strokes++;return stroke.apply(this,a);};ctx.fillRect=function(...a){fills++;return fill.apply(this,a);};
    try{g.drawCoordinateGrid();return {strokes,fills};}finally{ctx.stroke=stroke;ctx.fillRect=fill;}
  });assert.deepEqual(hover,{strokes:0,fills:0});
  await page.mouse.click(350,160);assert.equal(await picked(),true,'Second space tap did not select');
  const frame=await page.evaluate(()=>{
    const g=window.__game,ctx=document.getElementById('sky').getContext('2d'),stroke=ctx.stroke,fill=ctx.fillRect;let strokes=0,fills=0;
    ctx.stroke=function(...a){strokes++;return stroke.apply(this,a);};ctx.fillRect=function(...a){fills++;return fill.apply(this,a);};
    try{g.drawCoordinateGrid();return {strokes,fills};}finally{ctx.stroke=stroke;ctx.fillRect=fill;}
  });assert.ok(frame.strokes>=2&&frame.fills===0,JSON.stringify(frame));
  await page.evaluate(()=>window.__game.cancelTarget());
  await page.touchscreen.tap(350,160);assert.equal(await picked(),false,'One touch selected a coordinate');
  await page.touchscreen.tap(350,160);assert.equal(await picked(),true,'Touch release cleared the first tap');
  await page.evaluate(()=>window.__game.cancelTarget());
  await page.mouse.click(350,160);await page.mouse.click(410,160);assert.equal(await picked(),false,'Separate taps confirmed a coordinate');
  await page.evaluate(()=>{window.__game.state.coordinateTap.time-=600;});await page.mouse.click(410,160);assert.equal(await picked(),false,'Expired tap confirmed a coordinate');
  await page.evaluate(()=>window.__game.zoom(1.1));await page.mouse.click(410,160);assert.equal(await picked(),false,'Zoom retained a pending tap');
  await page.mouse.move(410,160);await page.mouse.down();await page.mouse.move(430,170);await page.mouse.up();await page.mouse.click(430,170);assert.equal(await picked(),false,'Pan retained a pending tap');
  await page.evaluate(()=>window.__game.cancelTarget());
  const deck=await page.locator('#dashboardBase').boundingBox();await page.mouse.click(600,deck.y+8);await page.mouse.click(600,deck.y+8);assert.equal(await picked(),false,'Transparent dashboard allowed coordinate picking');
  await page.evaluate(async()=>{const g=window.__game,{visualRadius}=await import('/model.js');g.cancelTarget();g.state.camera={x:0,y:0};g.state.zoom=45/visualRadius(g.state.system.star.diameter);g.updateUI();});
  await page.mouse.click(422,195);assert.equal(await page.evaluate(()=>window.__game.state.selected?.kind),'star','Object required two taps');
  await page.evaluate(()=>{const g=window.__game;g.enterChart();g.cancelTarget();g.state.camera={x:0,y:0};g.state.zoom=1;g.drawChart(0);});await page.waitForTimeout(350);
  const empty=await page.evaluate(()=>{
    const s=window.__game.state,stars=window.__game.nearbyStars();
    for(let y=140;y<250;y+=30)for(let x=200;x<500;x+=30)if(stars.every(star=>Math.hypot(x-s.width/2-(star.x-s.camera.x)*s.zoom,y-s.height/2-(star.y-s.camera.y)*s.zoom)>32))return {x,y};
    throw Error('No empty chart fixture');
  });
  await page.mouse.click(empty.x,empty.y);assert.equal(await picked(),false);await page.mouse.click(empty.x,empty.y);assert.equal(await picked(),true,'Deep Space did not accept double tap');
  await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.enterSurface(g.state.system.planets.find(p=>p.name==='Earth'));g.cancelTarget();g.state.camera={x:1e7,y:1e7};g.updateUI();});await page.waitForTimeout(350);
  await page.mouse.click(350,160);assert.equal(await picked(),false,'Surface selected after one tap');await page.mouse.click(350,160);assert.equal(await picked(),true,'Surface coordinate did not accept two taps');
  await page.evaluate(()=>window.__game.cancelTarget());
  return {layouts,firstTapIgnored:true,frame,doubleTapBothSpaceLayers:true,panZoomAndTimeoutReset:true,dashboardBlocksTaps:true,singleTapObjectsAndDoubleTapSurface:true};
}
