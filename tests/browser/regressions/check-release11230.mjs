import assert from 'node:assert/strict';

export async function checkRelease11230(page,engine){
  const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const capture=async tag=>{
    const png=await page.screenshot({path:`.qa/${engine}-11230-${tag}.png`});
    if(engine==='webkit'&&process.env.QA_LAYOUT_PREVIEW==='true'){const data=png.toString('base64');for(let i=0;i<data.length;i+=6000)console.log(`QA_PREVIEW:11230-${tag}:${i/6000}:${data.slice(i,i+6000)}`);}
  };
  await page.evaluate(async()=>{const g=window.__game,{DEFAULT_SETTINGS}=await import('/src/core/settings.js');Object.assign(g.settings,DEFAULT_SETTINGS,{music:false,paused:true,controls:'touch',reducedMotion:true});g.create(true);g.launch();g.applySettings();});
  const layouts=[];
  for(const physical of [{width:844,height:390},{width:390,height:844},{width:667,height:375},{width:640,height:360},{width:568,height:320},{width:600,height:600},{width:1440,height:900}]){
    await page.setViewportSize(physical);
    await page.waitForFunction(v=>window.__game.state.width===Math.max(v.width,v.height)&&window.__game.state.height===Math.min(v.width,v.height),physical);
    for(const extras of [false,true]){
      await page.evaluate(extras=>{const g=window.__game;Object.assign(g.settings,{showClock:true,showCoords:true,showFPS:extras,showSpeed:extras});g.state.save.ship={x:123456789012,y:-987654321098};g.applySettings();g.updateUI();},extras);await settle();
      const fit=await page.evaluate(async()=>{
        const {viewport:v,gameRect}=await import('/src/core/viewport.js'),el=id=>document.getElementById(id),r=id=>gameRect(el(id)),panel=r('systemChart'),readout=r('flightReadout'),tab=r('systemChartToggle'),radius=parseFloat(getComputedStyle(el('systemChart')).borderTopLeftRadius),screenRadius=parseFloat(getComputedStyle(el('dashboardBase')).borderBottomLeftRadius),path=el('systemChartFramePath'),bounds=path.getBBox();
        const fields=['clockTime','clockDate','coordsReadout',...(window.__game.settings.showFPS?['fpsReadout']:[]),...(window.__game.settings.showSpeed?['speedReadout']:[])];
        const texts=fields.map(id=>{const e=el(id),a=r(id);return {id,text:e.textContent,visible:!e.hidden&&a.width>0&&a.height>0,fits:e.scrollWidth<=e.clientWidth+1&&a.left>=panel.left&&a.right<=panel.right&&a.bottom<=tab.top};});
        const control=el('systemChartButtonPath').getBBox(),arrow=gameRect(document.querySelector('.mission-chevron'));
        return {panel,readout,tab,texts,center:[panel.left+radius,panel.top+radius],screenCenter:[screenRadius,screenRadius],frameBottom:bounds.y+bounds.height,frameHeight:panel.height,goldSize:[control.width,control.height],arrowFits:arrow.left>=tab.left+control.x&&arrow.right<=tab.right-1,settingsClear:r('settingsOpen').left>=panel.right,centerClear:r('systemFit').left>=r('settingsOpen').right,inside:panel.right<v.width&&panel.bottom<v.height,clockFont:getComputedStyle(el('clock')).fontSize,coordsFont:getComputedStyle(el('coordsReadout')).fontSize};
      });
      assert.ok(fit.inside&&fit.texts.every(t=>t.visible&&t.fits)&&fit.readout.bottom<=fit.tab.top&&fit.tab.height===28&&fit.arrowFits&&fit.settingsClear&&fit.centerClear,JSON.stringify({physical,extras,fit}));
      assert.ok(fit.center.every((value,i)=>Math.abs(value-fit.screenCenter[i])<.1)&&Math.abs(fit.frameBottom-fit.frameHeight+1)<.1,JSON.stringify(fit));assert.equal(fit.clockFont,'10px');assert.equal(fit.coordsFont,'9px');assert.ok(fit.goldSize[0]>=44&&fit.goldSize[1]===26,JSON.stringify(fit));
      await page.locator('#systemChartToggle').click();await settle();
      const dropdown=await page.evaluate(async()=>{const {gameRect}=await import('/src/core/viewport.js'),r=id=>gameRect(document.getElementById(id)),card=r('systemChartContent'),tab=r('systemChartToggle'),deck=r('dashboardBase');return {leftGap:card.left-tab.left,topGap:card.top-tab.bottom,deckGap:deck.top-card.bottom,scrollable:document.getElementById('systemChartContent').scrollHeight>document.getElementById('systemChartContent').clientHeight};});
      assert.ok(Math.abs(dropdown.leftGap)<.1&&Math.abs(dropdown.topGap+1)<.1&&dropdown.deckGap>=6,JSON.stringify({physical,extras,dropdown}));assert.equal(dropdown.scrollable,true);
      if(physical.width===844&&!extras)await capture('open-left-console');
      await page.locator('#systemChartScrollbar').press('End');assert.ok(await page.locator('#systemChartContent').evaluate(e=>e.scrollTop>0));await page.locator('#systemChartToggle').click();
      layouts.push({physical,extras,width:fit.panel.width,height:fit.panel.height,dropdown});
    }
  }
  await page.setViewportSize({width:844,height:390});
  // Hiding coordinates/extras shortens the shared frame; a viewport-height
  // change at a fixed console width must still refresh the left-corner arc.
  await page.evaluate(()=>{const g=window.__game;Object.assign(g.settings,{showCoords:false,showFPS:false,showSpeed:false});g.applySettings();});await settle();
  const short=await page.locator('#systemChart').evaluate(e=>e.clientHeight);
  await page.setViewportSize({width:844,height:500});await settle();
  const arc=await page.evaluate(()=>{const chart=document.getElementById('systemChart'),r=parseFloat(getComputedStyle(chart).borderTopLeftRadius);return {css:r,path:Number(document.getElementById('systemChartFramePath').getAttribute('d').match(/ A([\d.]+)/)[1])};});assert.ok(Math.abs(arc.css-arc.path-1)<.02);
  await page.evaluate(()=>{const g=window.__game;g.settings.showCoords=true;g.applySettings();});await settle();assert.ok(await page.locator('#systemChart').evaluate(e=>e.clientHeight)>short);
  // Time/coordinate text is not a dropdown hit target. Settings still opens,
  // and the center control still closes an open chart and fits the system.
  await page.locator('#clockTime').click();assert.equal(await page.locator('#systemChartToggle').getAttribute('aria-expanded'),'false');
  await page.locator('#settingsOpen').click();assert.equal(await page.locator('#modal').isVisible(),true);await page.locator('#modalClose').click();
  await page.locator('#systemChartToggle').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#systemChartToggle').getAttribute('aria-expanded'),'true');
  await page.locator('#systemFit').click();assert.equal(await page.locator('#systemChartToggle').getAttribute('aria-expanded'),'false');
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=false;g.applySettings();});await page.locator('#systemChartToggle').click();
  const motion=await page.locator('.mission-drop-sheet').evaluate(e=>{const a=e.getAnimations()[0];return {duration:a.effect.getTiming().duration,first:a.effect.getKeyframes()[0].transform};});assert.equal(motion.duration,640);assert.equal(motion.first,'translateY(-100%)');await page.locator('.mission-drop-sheet').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));
  await capture('readable-left-console');await page.locator('#systemChartToggle').click();
  return {layouts,sharedLeftCurve:true,telemetryAboveDropdown:true,frameResizesWithReadout:true,keyboardAndTouchControls:true,motion};
}
