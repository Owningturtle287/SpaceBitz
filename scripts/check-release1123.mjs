import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

export async function checkRelease1123(page,engine){
  await page.setViewportSize({width:844,height:390});
  const camera=await page.evaluate(async()=>{
    const g=window.__game,s=g.state,{makeSystem}=await import('/model.js');
    globalThis.__qaPause=true;g.cancelTarget();s.system=makeSystem('sol');s.save.currentSystem=s.save.homeSeed='sol';
    g.settings.paused=true;s.keys.clear();s.joy={x:0,y:0};s.followBody=null;s.focusBody=null;s.centerZoom=null;
    const results=[];
    for(const scene of ['system','surface','chart'])for(const reduced of [false,true]){
      s.scene=scene;s.save.landed=scene==='surface'?'sol:Earth':null;g.settings.reducedMotion=reduced;g.applySettings();
      const p=scene==='surface'?s.save.surface:scene==='chart'?s.save.chart:s.save.ship;
      p.x=1e7;p.y=1e7;s.camera={x:p.x+10000,y:p.y-10000};s.zoom=scene==='system'?.001:.65;
      s.selected=s.waypoint=null;s.centerZoom=null;s.centerReady=false;s.followShip=false;s.focusBody=s.followBody=null;s.panUntil=0;
      const view=()=>JSON.stringify({camera:s.camera,zoom:s.zoom}),before=view(),shipBefore=p.x;
      s.keys.add('d');g.update(100,0);s.keys.clear();if(view()!==before||p.x===shipBefore)throw Error('Manual movement changed view or did not move in '+scene);
      s.waypoint={x:p.x+100,y:p.y+100};g.primary();if(view()!==before||!s.autopilot)throw Error('Route departure changed view in '+scene);
      for(let i=0;i<1000&&s.autopilot;i++){g.update(100,0);if(view()!==before)throw Error('Route changed view in '+scene);}
      if(s.autopilot)throw Error('Coordinate route never arrived in '+scene);g.update(2000,0);if(view()!==before||s.centerZoom)throw Error('Arrival changed view in '+scene);
      const from={...s.camera},zoom=s.zoom;document.getElementById('homeButton').click();
      if(!reduced){
        if(s.camera.x!==from.x||s.camera.y!==from.y||s.zoom!==zoom||s.centerZoom?.centerAction!=='pan')throw Error('First Center snapped or zoomed in '+scene);
        document.getElementById('homeButton').click();if(s.centerZoom?.centerAction!=='pan')throw Error('Early repeat press skipped centering');
        g.update(650,0);if(s.zoom!==zoom||s.camera.x===from.x||s.camera.x===p.x)throw Error('Center has no smooth intermediate view in '+scene);g.update(650,0);
      }
      if(s.camera.x!==p.x||s.camera.y!==p.y||s.zoom!==zoom||!s.centerReady||s.centerZoom)throw Error('First Center failed to preserve zoom in '+scene);
      const settled={...s.camera};s.joy.x=.5;g.update(100,0);s.joy.x=0;
      if(s.camera.x!==settled.x||s.camera.y!==settled.y)throw Error('Center enabled ongoing auto-follow in '+scene);
      document.getElementById('homeButton').click();if(!reduced)g.update(1300,0);
      const {SHIP_FOCUS_ZOOM}=await import('/scale.js');
      if(s.zoom!==Math.max(zoom,scene==='system'?SHIP_FOCUS_ZOOM:2.4)||s.camera.x!==p.x||s.camera.y!==p.y||s.centerZoom||s.centerReady)throw Error('Second Center failed in '+scene);
      results.push({scene,reduced,firstZoom:zoom,secondZoom:s.zoom});
    }
    s.scene='chart';s.centerZoom=null;s.centerReady=false;s.followShip=false;s.selected=null;s.waypoint={x:s.save.chart.x+10000,y:s.save.chart.y};s.camera={x:s.save.chart.x-1000,y:s.save.chart.y-1000};s.zoom=.65;g.settings.reducedMotion=false;g.applySettings();
    g.primary();const route=s.autopilot;document.getElementById('homeButton').click();g.update(650,0);g.update(650,0);
    if(s.autopilot!==route||!s.centerReady||s.zoom!==.65||s.camera.x!==s.save.chart.x)throw Error('Center disrupted a running route');
    document.getElementById('homeButton').click();g.update(650,0);g.zoom(.5);const interrupted=JSON.stringify(s.camera),z=s.zoom;
    g.update(2000,0);if(JSON.stringify(s.camera)!==interrupted||s.zoom!==z||s.centerReady||s.centerZoom||s.autopilot!==route)throw Error('Gesture did not interrupt Center without cancelling route');
    g.cancelTarget();return results;
  });
  assert.equal(camera.length,6);
  const immediate=await page.evaluate(()=>{
    const g=window.__game;g.enterSystem({seed:'sol',x:0,y:0});g.settings.reducedMotion=false;g.applySettings();g.select(g.state.system.star);g.positionContext();
    const row=document.querySelector('.context-action-row');
    return {ready:document.getElementById('contextActions').classList.contains('ready'),opacity:+getComputedStyle(row).opacity,transition:getComputedStyle(row).transitionDuration,name:document.getElementById('contextName').textContent};
  });assert.ok(immediate.ready&&immediate.name==='Sol'&&immediate.opacity<1&&immediate.transition.includes('0.55s'),JSON.stringify(immediate));
  await page.waitForTimeout(100);assert.ok(await page.locator('.context-action-row').evaluate(e=>+getComputedStyle(e).opacity>0),'Actions still wait before appearing');
  await page.waitForTimeout(150);await page.evaluate(async()=>{const g=window.__game,{visualRadius}=await import('/model.js');g.state.camera={x:0,y:0};g.state.zoom=45/visualRadius(g.state.system.star.diameter);g.positionContext();g.backdrop(0);g.drawSystem(0);});
  await page.screenshot({path:`.qa/${engine}-1123-immediate-actions.png`});
  const icons=await page.evaluate(async()=>{
    const {paintHomeMarker}=await import('/presentation.js'),canvas=document.createElement('canvas');canvas.width=640;canvas.height=260;const ctx=canvas.getContext('2d');ctx.fillStyle='#020b0e';ctx.fillRect(0,0,640,260);const results=[];
    for(const [i,radius]of [10,35,70].entries()){
      const x=110+i*210,y=150;ctx.fillStyle='#69a5d8';ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();const before=[...ctx.getImageData(x,y,1,1).data];paintHomeMarker(ctx,x,y,radius,640,260);
      if(before.some((v,j)=>v!==ctx.getImageData(x,y,1,1).data[j]))throw Error('Home icon replaced the body');
      const pixels=ctx.getImageData(x-20,0,40,150-radius).data,green=[];
      for(let j=0;j<pixels.length;j+=4)if(pixels[j]===117&&pixels[j+1]===238&&pixels[j+2]===152)green.push({x:j/4%40,y:Math.floor(j/4/40)});
      if(green.length<50)throw Error('Home icon is not a solid green silhouette');
      const width=Math.max(...green.map(p=>p.x))-Math.min(...green.map(p=>p.x))+1,height=Math.max(...green.map(p=>p.y))-Math.min(...green.map(p=>p.y))+1,bottom=Math.max(...green.map(p=>p.y));
      if(width>12||height>12||bottom>=y-radius-3)throw Error('Home icon grew with the body or touched it');results.push({radius,width,height,pixels:green.length});
      ctx.font='12px monospace';ctx.fillStyle='#a8dccb';ctx.textAlign='center';ctx.fillText('Body radius '+radius+' px',x,245);
    }
    return {results,image:canvas.toDataURL()};
  });assert.equal(new Set(icons.results.map(x=>x.width+':'+x.height)).size,1);
  await writeFile(`.qa/${engine}-1123-solid-home-icons.png`,Buffer.from(icons.image.split(',')[1],'base64'));
  const homeLabel=await page.evaluate(async()=>{
    const g=window.__game,{bodyPosition,visualRadius}=await import('/model.js'),earth=g.state.system.planets.find(p=>p.name==='Earth');
    g.state.save.homePlanet=earth.id;g.state.camera=bodyPosition(earth,g.state.save.days,g.state.system);g.state.zoom=35/visualRadius(earth.diameter);g.select(earth);g.positionContext();
    const label=document.getElementById('contextName').getBoundingClientRect(),iconTop=g.state.height/2-35-16;
    g.backdrop(0);g.drawSystem(0);return {bottom:label.bottom,iconTop};
  });assert.ok(homeLabel.bottom<homeLabel.iconTop,JSON.stringify(homeLabel));
  await page.waitForTimeout(200);await page.screenshot({path:`.qa/${engine}-1123-home-world-selected.png`});
  return {camera,immediate,icons:icons.results};
}
