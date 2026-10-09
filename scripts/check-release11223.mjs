import assert from 'node:assert/strict';

export async function checkRelease11223(page,engine){
  await page.evaluate(()=>{const g=window.__game;g.create(true);g.launch();Object.assign(g.settings,{music:false,paused:true,controls:'touch',reducedMotion:false});g.applySettings();});
  const corners=[];
  for(const physical of [{width:844,height:390},{width:390,height:844},{width:1024,height:768},{width:640,height:360}]){
    await page.setViewportSize(physical);
    await page.waitForFunction(v=>window.__game.state.width===Math.max(v.width,v.height)&&window.__game.state.height===Math.min(v.width,v.height),physical);
    await page.waitForTimeout(80);
    const corner=await page.evaluate(async()=>{
      const {viewport,gameRect}=await import('/viewport.js'),button=document.getElementById('systemChartToggle'),r=parseFloat(getComputedStyle(button).borderTopRightRadius),box=gameRect(button),path=document.getElementById('systemChartFramePath'),w=button.clientWidth,t=parseFloat(getComputedStyle(document.getElementById('systemChart')).getPropertyValue('--chart-thickness'));
      const inside=(x,y)=>path.isPointInFill(new DOMPoint(x,y));
      const copy=document.querySelector('.mission-toggle-copy'),arrow=document.querySelector('.mission-chevron');
      return {radius:r,center:[box.right-r,box.top+r],screenCenter:[viewport.width-(r+3),r+3],insets:[viewport.width-box.right,box.top],thickness:t,textHeight:copy.offsetHeight,straightBand:inside(12,t/2)&&!inside(12,t+3),arcBand:inside(w-r+(r-3)/Math.SQRT2,r-(r-3)/Math.SQRT2)&&!inside(w-r+(r-t-3)/Math.SQRT2,r-(r-t-3)/Math.SQRT2),textFits:copy.offsetWidth>0&&copy.offsetLeft+copy.offsetWidth<=arrow.offsetLeft};
    });
    assert.ok(corner.center.every((n,i)=>Math.abs(n-corner.screenCenter[i])<.1),JSON.stringify(corner));
    assert.deepEqual(corner.insets,[3,3]);assert.equal(corner.thickness,28);assert.equal(corner.textHeight,28);assert.ok(corner.straightBand&&corner.arcBand&&corner.textFits,JSON.stringify(corner));corners.push(corner);
  }
  await page.setViewportSize({width:844,height:390});
  await page.locator('#systemChartToggle').click();
  const dropdown=await page.locator('#systemChartContent').evaluate(e=>{
    const a=e.getAnimations()[0];a.pause();a.currentTime=320;const style=getComputedStyle(e),m=new DOMMatrix(style.transform);const result={duration:a.effect.getTiming().duration,scale:[m.a,m.d],opacity:Number(style.opacity)};a.play();return result;
  });
  assert.ok(dropdown.duration>=600);assert.deepEqual(dropdown.scale,[1,1]);assert.ok(dropdown.opacity>0&&dropdown.opacity<1);
  await page.locator('#systemChartContent').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));
  const png=await page.screenshot({path:`.qa/${engine}-11223-chart.png`});
  if(engine==='webkit'&&process.env.QA_LAYOUT_PREVIEW==='true'){const data=png.toString('base64');for(let i=0;i<data.length;i+=6000)console.log(`QA_PREVIEW:11223-chart:${i/6000}:${data.slice(i,i+6000)}`);}
  await page.locator('#systemChartToggle').click();
  await page.evaluate(()=>window.__game.showJournal());
  await page.waitForFunction(()=>!document.getElementById('journalPanel').getAnimations().length);
  const log=await page.evaluate(()=>{
    const g=window.__game,panel=document.getElementById('journalPanel');g.closeJournal(false);const a=panel.getAnimations()[0];a.pause();a.currentTime=150;g.closeJournal(false);
    const m=new DOMMatrix(getComputedStyle(panel).transform),result={duration:a.effect.getTiming().duration,scale:[m.a,m.d],retained:panel.getAnimations()[0]===a,time:a.currentTime};a.play();return result;
  });
  assert.ok(log.duration>=700);assert.equal(log.scale[0],log.scale[1]);assert.equal(log.retained,true);assert.equal(log.time,150);
  await page.locator('#journal').waitFor({state:'hidden'});
  await page.evaluate(()=>{const g=window.__game;g.clearTerminal();g.showDetails(g.state.system.star);});
  const caretSamples=await page.evaluate(async()=>{
    const input=document.getElementById('terminalInput'),caret=document.getElementById('terminalInputCaret'),measure=document.createElement('canvas').getContext('2d'),samples=[];
    async function frames(label){for(let i=0;i<8;i++){await new Promise(r=>requestAnimationFrame(r));if(caret.hidden)continue;const style=getComputedStyle(input);measure.font=style.font||`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;const expected=input.offsetLeft+input.clientLeft+parseFloat(style.paddingLeft)+measure.measureText(input.value.slice(0,input.selectionStart)).width-input.scrollLeft;samples.push({label,error:Math.abs(parseFloat(caret.style.left)-expected),width:parseFloat(getComputedStyle(caret).width),font:parseFloat(style.fontSize),selection:input.selectionStart});}}
    input.value='alpha beta';input.setSelectionRange(input.value.length,input.value.length);caret.style.left='0px';input.focus({preventScroll:true});await frames('focus');
    input.value='long draft '.repeat(12);input.setSelectionRange(input.value.length,input.value.length);input.dispatchEvent(new Event('input',{bubbles:true}));await frames('long input');
    input.setSelectionRange(3,3);document.dispatchEvent(new Event('selectionchange'));await frames('move left');
    input.setSelectionRange(2,5);document.dispatchEvent(new Event('selectionchange'));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const selectedHidden=caret.hidden;
    input.blur();input.setSelectionRange(input.value.length,input.value.length);input.focus({preventScroll:true});await frames('refocus');
    window.__game.settings.terminalInputFont=24;window.__game.settings.terminalFontMode='individual';window.__game.applySettings();await frames('font resize');
    return {samples,selectedHidden,scrolled:input.scrollLeft>0};
  });
  assert.equal(caretSamples.selectedHidden,true);assert.equal(caretSamples.scrolled,true);
  for(const label of ['focus','long input','move left','refocus','font resize'])assert.ok(caretSamples.samples.some(s=>s.label===label),'No visible cursor after '+label);
  for(const sample of caretSamples.samples){assert.ok(sample.error<=1,JSON.stringify(sample));assert.equal(sample.width,sample.font/2);}
  await page.screenshot({path:`.qa/${engine}-11223-caret.png`});
  await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=true;g.applySettings();g.closeJournal();document.getElementById('terminalInput').blur();document.getElementById('terminalKeyboardToggle').click();document.getElementById('systemChartToggle').click();});
  assert.equal(await page.locator('#systemChartContent').evaluate(e=>e.getAnimations().length),0);
  await page.evaluate(()=>{document.getElementById('systemChartToggle').click();window.__game.showJournal();window.__game.closeJournal(false);});
  assert.equal(await page.locator('#journal').isVisible(),false);
  return {corners,dropdown,log,caretFrames:caretSamples.samples.length,reducedMotion:true};
}
