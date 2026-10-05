import assert from 'node:assert/strict';

export async function checkRelease1122(page,engine){
  await page.setViewportSize({width:1440,height:900});
  await page.evaluate(async()=>{
    const g=window.__game,{makeSystem,visualRadius}=await import('/model.js');
    globalThis.__qaPause=true;g.cancelTarget();g.settings.reducedMotion=false;g.applySettings();
    g.state.system=makeSystem('sol');g.state.save.currentSystem=g.state.save.homeSeed='sol';
    g.state.scene='system';g.state.save.homePlanet=null;g.state.autopilot=g.state.centerZoom=g.state.followBody=null;
    g.state.camera={x:0,y:0};g.state.zoom=45/visualRadius(g.state.system.star.diameter);g.state.panUntil=Infinity;
    g.updateUI();g.backdrop(0);g.drawSystem(0);
  });await page.waitForTimeout(350);
  const opening=await page.evaluate(async()=>{
    const g=window.__game,pocket=document.getElementById('terminalPocket'),log=document.getElementById('journalButton');
    const before=log.getBoundingClientRect().bottom;g.select(g.state.system.star);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    await new Promise(r=>setTimeout(r,60));
    return {before,after:log.getBoundingClientRect().bottom,height:pocket.getBoundingClientRect().height,full:document.getElementById('targetCard').getBoundingClientRect().height};
  });
  assert.ok(Math.abs(opening.before-896)<1,JSON.stringify(opening));
  assert.ok(opening.height>0&&opening.height<opening.full&&opening.after<opening.before,JSON.stringify(opening));
  await page.waitForTimeout(350);
  await page.evaluate(()=>window.__game.showDetails(window.__game.state.selected));await page.waitForTimeout(350);
  const typing=await page.evaluate(()=>{
    const g=window.__game,record=g.state.terminal,screen=document.getElementById('terminalScreen');
    for(let elapsed=0;elapsed<=8000;elapsed+=100){g.updateTerminal(record.start+elapsed);if(record.finished)break;}
    if(!record.rewind)throw Error('Finished record did not start scrolling to the beginning');
    const start=record.rewind.start,from=screen.scrollTop;g.updateTerminal(start+300);const halfway=screen.scrollTop;
    g.updateTerminal(start+650);const end=screen.scrollTop;g.updateTerminal(start+3000);
    return {from,halfway,end,stable:screen.scrollTop,full:record.count===record.text.length};
  });
  assert.ok(typing.full&&typing.from>0&&typing.halfway>0&&typing.halfway<typing.from&&typing.end===0&&typing.stable===0,JSON.stringify(typing));
  const layout=await page.evaluate(()=>{
    const card=document.getElementById('targetCard'),screen=document.getElementById('terminalScreen'),r=card.getBoundingClientRect(),log=document.getElementById('journalButton').getBoundingClientRect();
    return {width:r.width,header:screen.getBoundingClientRect().top-r.top,distance:parseFloat(getComputedStyle(document.getElementById('targetDistance')).fontSize),status:parseFloat(getComputedStyle(document.getElementById('targetStatus')).fontSize),overflow:screen.scrollWidth-screen.clientWidth,columns:getComputedStyle(document.getElementById('terminalOutput')).gridTemplateColumns.split(' ').length,logBottom:log.bottom,top:r.top};
  });
  assert.ok(layout.width<=600&&layout.header<64&&layout.distance<layout.status&&layout.overflow<=1&&layout.logBottom<layout.top,JSON.stringify(layout));assert.equal(layout.columns,2);
  await page.evaluate(()=>{const g=window.__game;g.positionContext();document.getElementById('contextActions').classList.add('ready');g.backdrop(0);g.drawSystem(0);});
  await page.screenshot({path:`.qa/${engine}-1122-terminal-desktop.png`});
  const reading=await page.evaluate(()=>{
    const g=window.__game,screen=document.getElementById('terminalScreen');g.showDetails(g.state.selected);const record=g.state.terminal;
    for(let elapsed=0;elapsed<=8000;elapsed+=100){g.updateTerminal(record.start+elapsed);if(record.finished)break;}
    const start=record.rewind.start;g.updateTerminal(start+150);screen.dispatchEvent(new WheelEvent('wheel',{deltaY:1}));screen.scrollTop=60;g.updateTerminal(start+4000);
    const manual=screen.scrollTop,cancelled=!record.rewind;
    g.settings.reducedMotion=true;g.applySettings();g.showDetails(g.state.selected);g.updateTerminal(performance.now());g.updateUI();
    return {manual,cancelled,reducedTop:screen.scrollTop,full:g.state.terminal.count===g.state.terminal.text.length,rewind:!!g.state.terminal.rewind};
  });assert.ok(reading.manual===60&&reading.cancelled&&reading.reducedTop===0&&reading.full&&!reading.rewind,JSON.stringify(reading));
  for(const viewport of [{width:844,height:390},{width:390,height:844},{width:375,height:667}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(100);await page.evaluate(()=>{const g=window.__game;g.updateUI();g.positionContext();g.backdrop(0);g.drawSystem(0);});
    const fits=await page.evaluate(()=>{const r=document.getElementById('targetCard').getBoundingClientRect(),screen=document.getElementById('terminalScreen'),log=document.getElementById('journalButton').getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,top:r.top,log:log.bottom,overflow:screen.scrollWidth-screen.clientWidth};});
    assert.ok(fits.left>=0&&fits.right<=viewport.width&&Math.abs(fits.bottom-viewport.height+4)<1&&fits.top>=60&&fits.log<fits.top&&fits.overflow<=1,JSON.stringify(fits));
    await page.screenshot({path:`.qa/${engine}-1122-terminal-${viewport.width}.png`});
  }
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=false;g.applySettings();});
  const closing=await page.evaluate(async()=>{
    const g=window.__game,pocket=document.getElementById('terminalPocket'),before=pocket.getBoundingClientRect().height;g.cancelTarget();
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    await new Promise(r=>setTimeout(r,60));
    return {before,mid:pocket.getBoundingClientRect().height,cardHidden:document.getElementById('targetCard').hidden};
  });assert.ok(closing.cardHidden&&closing.mid>0&&closing.mid<closing.before,JSON.stringify(closing));await page.waitForTimeout(350);
  assert.ok(Math.abs(await page.locator('#journalButton').evaluate(e=>e.getBoundingClientRect().bottom)-386)<1);
  const directions=await page.evaluate(()=>{
    const g=window.__game,arrow=document.getElementById('coordinateArrow'),directions=[];
    g.state.save.ship={x:1e7,y:1e7};g.state.camera={...g.state.save.ship};g.state.zoom=.1;
    for(const [dx,dy]of [[0,-100],[100,0],[0,100],[-100,0],[100,-100],[-100,-100],[100,100],[-100,100]]){
      g.state.waypoint={x:g.state.save.ship.x+dx,y:g.state.save.ship.y+dy};g.updateUI();g.positionContext();
      const matrix=new DOMMatrix(getComputedStyle(arrow).transform),length=Math.hypot(dx,dy);
      if(Math.abs(-matrix.c-dx/length)>.00001||Math.abs(-matrix.d-dy/length)>.00001)throw Error('Coordinate arrow points away from travel vector '+[dx,dy]);
      directions.push([-matrix.c,-matrix.d]);
    }
    g.state.save.ship.y+=200;g.positionContext();const matrix=new DOMMatrix(getComputedStyle(arrow).transform),target=g.state.waypoint,dx=target.x-g.state.save.ship.x,dy=target.y-g.state.save.ship.y,length=Math.hypot(dx,dy);
    if(Math.abs(-matrix.c-dx/length)>.00001||Math.abs(-matrix.d-dy/length)>.00001)throw Error('Arrow did not update with ship movement');
    document.getElementById('contextActions').classList.add('ready');g.backdrop(0);g.drawSystem(0);
    const frame=getComputedStyle(document.getElementById('primaryAction'),'::before'),button=document.getElementById('primaryAction').getBoundingClientRect();
    if(!frame.borderImageSource.includes('svg')||getComputedStyle(document.getElementById('primaryAction')).backgroundColor!=='rgba(0, 0, 0, 0)'||button.width!==28||button.height!==28)throw Error('Pixel frame changed the coordinate content box');
    return directions;
  });
  await page.waitForTimeout(350);await page.screenshot({path:`.qa/${engine}-1122-coordinate.png`});
  const markers=await page.evaluate(async()=>{
    const g=window.__game,{bodyPosition,visualRadius}=await import('/model.js'),ctx=document.getElementById('sky').getContext('2d'),fill=ctx.fill;let count=0;
    ctx.fill=function(...args){if(this.fillStyle==='#75ee98')count++;return fill.apply(this,args);};
    try{
      g.cancelTarget();g.settings.labels=false;g.state.scene='system';g.state.camera={x:0,y:0};g.state.zoom=45/visualRadius(g.state.system.star.diameter);g.state.save.homePlanet=null;g.drawSystem(0);const system=count;
      g.enterChart();g.cancelTarget();g.state.camera={x:0,y:0};g.state.zoom=1;count=0;g.backdrop(0);g.drawChart(0);const chart=count;
      g.state.scene='system';const earth=g.state.system.planets.find(b=>b.name==='Earth');g.state.save.homePlanet=earth.id;g.state.camera=bodyPosition(earth,g.state.save.days,g.state.system);g.state.zoom=30/visualRadius(earth.diameter);g.updateUI();count=0;g.backdrop(0);g.drawSystem(0);
      return {system,chart,planet:count};
    }finally{ctx.fill=fill;}
  });assert.deepEqual(markers,{system:0,chart:1,planet:1});
  await page.waitForTimeout(350);await page.screenshot({path:`.qa/${engine}-1122-home-world.png`});
  await page.evaluate(()=>{const g=window.__game;g.enterChart();g.cancelTarget();g.state.camera={x:0,y:0};g.backdrop(0);g.drawChart(0);});
  await page.waitForTimeout(350);await page.screenshot({path:`.qa/${engine}-1122-home-star.png`});
  return {opening,typing,layout,reading,closing,directions,markers};
}
