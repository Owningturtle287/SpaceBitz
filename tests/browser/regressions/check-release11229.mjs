import assert from 'node:assert/strict';

export async function checkRelease11229(page,engine){
  const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const capture=async tag=>{
    const png=await page.screenshot({path:`.qa/${engine}-11229-${tag}.png`});
    if(engine==='webkit'&&process.env.QA_LAYOUT_PREVIEW==='true'){const data=png.toString('base64');for(let i=0;i<data.length;i+=6000)console.log(`QA_PREVIEW:11229-${tag}:${i/6000}:${data.slice(i,i+6000)}`);}
  };
  await page.evaluate(async()=>{const g=window.__game,{DEFAULT_SETTINGS}=await import('/src/core/settings.js');Object.assign(g.settings,DEFAULT_SETTINGS,{music:false,paused:true,controls:'touch',reducedMotion:true});g.create(true);g.launch();g.applySettings();});
  const read=()=>page.evaluate(async()=>{
    const {gameRect}=await import('/src/core/viewport.js'),r=id=>gameRect(document.getElementById(id)),status=document.getElementById('targetStatus'),distance=document.getElementById('targetDistance'),screen=document.getElementById('terminalScreen'),meta=status.parentElement,card=r('targetCard'),identity=r('targetStatus'),away=r('targetDistance'),data=r('terminalScreen');
    const fits=e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1;
    return {text:status.textContent,distance:distance.textContent,visible:identity.height>0&&getComputedStyle(status).display!=='none',fits:fits(status)&&fits(distance)&&fits(meta),ordered:away.top>=identity.bottom&&identity.top>=gameRect(document.querySelector('.terminal-head')).bottom,contained:identity.left>=card.left&&identity.right<=card.right&&away.right<=card.right&&away.bottom<=data.top,screenHeight:screen.clientHeight,summaryTop:identity.top,screenTop:data.top,atBottom:screen.scrollHeight-screen.clientHeight-screen.scrollTop<1};
  });
  const layouts=[];
  for(const physical of [{width:844,height:390},{width:390,height:844},{width:667,height:375},{width:640,height:360},{width:1440,height:900}]){
    await page.setViewportSize(physical);
    await page.waitForFunction(v=>window.__game.state.width===Math.max(v.width,v.height)&&window.__game.state.height===Math.min(v.width,v.height),physical);
    for(const kind of ['planet','star'])for(const large of [false,true]){
      const expected=await page.evaluate(async({kind,large})=>{
        const g=window.__game,{objectType}=await import('/src/terminal/terminal.js');
        document.getElementById('terminalInput').blur();document.getElementById('terminalKeyboard').hidden=true;
        document.getElementById('targetCard').classList.remove('keyboard-open');
        g.state.terminalSize={width:200,height:170};Object.assign(g.settings,{terminalResizeHandles:true,terminalFontMode:large?'master':'individual',terminalFontSize:18});g.applySettings();
        const object=kind==='planet'?{...g.state.system.planets.find(p=>p.name==='Earth'),name:'Kepler-654 VIII',type:'Temperate ocean'}:{...g.state.system.star,name:'Kepler-1076543 B',familyLabel:'Luminous blue variable / hypergiant'};
        g.select(object);g.showDetails(object);g.updateTerminal(g.state.terminal.start+30000);g.notify('Latest reply');return object.name+' · '+objectType(object);
      },{kind,large});await settle();
      const expanded=await read();assert.equal(expanded.text,expected);assert.ok(expanded.visible&&expanded.fits&&expanded.ordered&&expanded.contained&&expanded.screenHeight>=35,JSON.stringify({physical,kind,large,expanded}));assert.match(expanded.distance,/AWAY$/);
      // Scrolling survey history must leave identity and live distance fixed.
      await page.locator('#terminalScreen').evaluate(e=>{e.scrollTop=0;e.dispatchEvent(new Event('wheel'));});await settle();const scrolled=await read();assert.equal(scrolled.summaryTop,expanded.summaryTop);assert.equal(scrolled.screenTop,expanded.screenTop);
      await page.locator('#terminalInput').focus();await settle();const keyboard=await read();assert.equal(keyboard.text,expected);assert.ok(keyboard.fits&&keyboard.ordered&&keyboard.contained&&keyboard.screenHeight>=35&&keyboard.atBottom,JSON.stringify({physical,kind,large,keyboard}));
      layouts.push({physical,kind,large,expandedHeight:expanded.screenHeight,keyboardHeight:keyboard.screenHeight});
      if(physical.width===844&&kind==='star'&&large)await capture('narrow-keyboard');
    }
  }
  // The same selection resolver supplies names/types on the surface, in deep
  // space and for coordinate waypoints, so no previous target can linger.
  const selections=[];
  await page.setViewportSize({width:844,height:390});
  for(const scene of ['surface','system','chart','waypoint']){
    const expected=await page.evaluate(async scene=>{
      const g=window.__game,{objectType}=await import('/src/terminal/terminal.js');g.cancelTarget();g.state.terminalSize=null;Object.assign(g.settings,{terminalResizeHandles:false,terminalFontMode:'individual'});g.applySettings();
      if(scene==='surface'){g.enterSurface(g.state.system.planets.find(p=>p.name==='Earth'));g.select({kind:'sample',id:'qa:readout-sample',name:'Surface sample',x:12,y:7});}
      else {if(g.state.scene==='surface')g.launch();if(scene==='chart')g.enterChart();else if(g.state.scene==='chart')g.enterSystem({seed:g.state.save.homeSeed,...g.state.save.chart});if(scene==='waypoint'){g.cancelTarget();g.state.waypoint={x:10000,y:20000};}else if(scene==='system')g.select(g.state.system.star);}
      g.showDetails(g.state.selected);g.updateUI();let object=scene==='waypoint'?{kind:'coordinate',name:'Coordinate'}:g.state.selected;if(scene==='chart'){const {makeSystem}=await import('/src/universe/model.js');object=makeSystem(object.seed).star;}return object.name+' · '+objectType(object);
    },scene);await settle();const summary=await read();assert.equal(summary.text,expected);assert.ok(summary.visible&&summary.fits&&summary.ordered&&summary.contained,JSON.stringify({scene,summary}));selections.push({scene,text:summary.text});
  }
  await capture('complete-readout');
  return {layouts,selections,fullIdentity:true,fixedWhileScrolling:true,keyboardOutputVisible:true};
}
