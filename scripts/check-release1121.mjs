import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
export async function checkRelease1121(page,engine){
  await page.evaluate(()=>{window.__game.state.save=null;localStorage.removeItem('spacebitz:field:v1');});await page.reload();await page.locator('#startGame').click();
  const layouts=[];
  for(const viewport of [{width:844,height:390},{width:390,height:844},{width:375,height:667},{width:1024,height:768},{width:1440,height:900}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(150);
    await page.locator('#universeName').fill('Viewport check');await page.locator('#universeSeed').fill('stable-input');
    assert.deepEqual(await page.evaluate(()=>({scale:visualViewport.scale,fonts:['universeName','universeSeed'].map(id=>parseFloat(getComputedStyle(document.getElementById(id)).fontSize))})),{scale:1,fonts:[16,16]});
    await page.locator('#scientificDefaults summary').click();await page.waitForTimeout(100);
    const scientific=new Set();let sciencePages=0;
    do {
      const rows=await page.locator('.scientific-value:visible').evaluateAll(rows=>rows.map(row=>{
        const r=row.getBoundingClientRect(),n=row.children[0],v=row.children[1],b=v.getBoundingClientRect(),list=row.parentElement.getBoundingClientRect(),buttons=document.querySelector('#generationFields .welcome-actions').getBoundingClientRect();
        if(r.bottom>list.bottom+1||list.bottom>buttons.top+1||b.right>list.right+1||n.scrollWidth>n.clientWidth+1||getComputedStyle(n).textOverflow==='ellipsis')throw Error('Clipped scientific rarity: '+row.textContent+' '+JSON.stringify({bottom:r.bottom,listBottom:list.bottom,buttonsTop:buttons.top,viewport:[innerWidth,innerHeight]}));
        return n.textContent;
      }));rows.forEach(row=>scientific.add(row));sciencePages++;
      if(await page.locator('#scientificNext').isDisabled())break;await page.locator('#scientificNext').click();
    }while(sciencePages<20);
    assert.equal(scientific.size,12);await page.screenshot({path:`.qa/${engine}-1121-scientific-${viewport.width}.png`});
    await page.locator('#scientificDefaults summary').click();await page.locator('#scientificMode').uncheck();await page.locator('#generationOptions').click();
    const custom=new Set();let customPages=0,maxRows=0;
    do {
      const rows=await page.locator('.rarity-row:visible').evaluateAll(rows=>rows.map(row=>{
        const r=row.getBoundingClientRect(),list=row.parentElement.getBoundingClientRect(),input=row.querySelector('input');
        if(r.bottom>list.bottom+1||parseFloat(getComputedStyle(input).fontSize)<16||row.children[0].scrollWidth>row.children[0].clientWidth+1)throw Error('Clipped custom rarity: '+row.textContent+' '+JSON.stringify({bottom:r.bottom,listBottom:list.bottom,font:getComputedStyle(input).fontSize,label:[row.children[0].scrollWidth,row.children[0].clientWidth],viewport:[innerWidth,innerHeight]}));
        return row.children[0].textContent;
      }));rows.forEach(row=>custom.add(row));maxRows=Math.max(maxRows,rows.length);customPages++;
      const next=page.locator('#generationEditor .editor-pages button[aria-label="Next rarity entries"]');if(await next.isDisabled())break;await next.click();
    }while(customPages<20);
    assert.equal(custom.size,12);if(viewport.width>=700&&viewport.height>=768)assert.ok(maxRows>5,`Unused space: ${maxRows} rows at ${viewport.width}`);
    const overflow=await page.evaluate(()=>({page:document.scrollingElement.scrollHeight-innerHeight,stage:document.getElementById('universeMenuStage').scrollHeight-document.getElementById('universeMenuStage').clientHeight}));assert.ok(overflow.page<=1&&overflow.stage<=1,JSON.stringify(overflow));
    await page.screenshot({path:`.qa/${engine}-1121-custom-${viewport.width}.png`});
    layouts.push({viewport,sciencePages,customPages,maxRows});await page.locator('#generationEditor').getByRole('button',{name:'CANCEL',exact:true}).click();await page.locator('#scientificMode').check();
  }
  await page.setViewportSize({width:844,height:390});await page.locator('#solGame').click();await page.waitForFunction(()=>window.__game.state.scene==='surface');
  await page.evaluate(()=>{const g=window.__game;globalThis.__qaPause=true;g.launch();g.state.autopilot=null;g.state.centerZoom=null;g.state.focusBody=null;g.state.panUntil=Infinity;g.state.camera={x:0,y:0};g.state.zoom=.1;g.select(g.state.system.star);g.frame(performance.now());});
  assert.equal(await page.locator('#contextActions').evaluate(e=>e.classList.contains('ready')),false);
  await page.waitForTimeout(600);assert.equal(await page.locator('#contextActions').evaluate(e=>e.classList.contains('ready')),true);
  assert.equal(await page.locator('#cancelTravel svg').getAttribute('shape-rendering'),'crispEdges');assert.equal(await page.locator('#cancelTravel').getAttribute('aria-label'),'Cancel target');assert.equal(await page.locator('#contextName').innerText(),'Sol');
  assert.equal(await page.locator('#contextName').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
  await page.evaluate(()=>window.__game.positionContext());await page.screenshot({path:`.qa/${engine}-1121-actions.png`});
  for(const viewport of [{width:844,height:390},{width:390,height:844},{width:375,height:667},{width:1440,height:900}]){
    await page.setViewportSize(viewport);
    await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=true;g.select(g.state.system.star);g.showDetails(g.state.selected);g.updateTerminal(performance.now());g.updateUI();g.frame(performance.now());});await page.waitForTimeout(250);
    const layout=await page.evaluate(()=>{
      const card=document.getElementById('targetCard'),r=card.getBoundingClientRect(),log=document.getElementById('journalButton').getBoundingClientRect(),screen=document.getElementById('terminalScreen'),out=document.getElementById('terminalOutput');
      return {bottom:r.bottom,right:r.right,top:r.top,width:r.width,logBottom:log.bottom,logRight:log.right,columns:getComputedStyle(out).gridTemplateColumns.split(' ').length,overflow:screen.scrollWidth-screen.clientWidth,fonts:parseFloat(getComputedStyle(out).fontSize),text:out.textContent};
    });
    assert.ok(Math.abs(layout.bottom-(viewport.height-4))<=1);assert.ok(layout.top>=60&&layout.logBottom<layout.top&&Math.abs(layout.logRight-layout.right)<=1);assert.equal(layout.columns,2);assert.ok(layout.overflow<=1);assert.ok(layout.text.startsWith('Object Data\n')&&!layout.text.includes('SPACEBITZ /'));assert.ok(layout.text.includes('DISTANCE FROM SHIP'));
    await page.screenshot({path:`.qa/${engine}-1121-terminal-${viewport.width}.png`});
  }
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{const g=window.__game;g.cancelTarget();g.settings.reducedMotion=false;g.state.camera={x:0,y:0};g.state.zoom=.1;g.state.panUntil=0;});
  await page.mouse.move(420,190);await page.mouse.down();await page.mouse.move(520,235,{steps:5});await page.mouse.up();
  const camera=await page.evaluate(()=>{const g=window.__game;g.update(8000,0);if(g.state.panUntil!==Infinity)throw Error('Pan still times out');return {...g.state.camera};});
  await page.waitForTimeout(2800);assert.deepEqual(await page.evaluate(()=>{window.__game.update(8000,0);return {...window.__game.state.camera};}),camera);
  const manual=await page.evaluate(()=>{const g=window.__game;g.state.joy.x=.5;g.update(100,0);g.state.joy.x=0;return {pan:g.state.panUntil,camera:{...g.state.camera}};});assert.equal(manual.pan,0);assert.notDeepEqual(manual.camera,camera);
  // Pick an empty square; its green arrow and red X remain compact and cancellable.
  await page.evaluate(()=>{const g=window.__game;g.state.camera={x:1e7,y:1e7};g.state.panUntil=Infinity;g.state.centerZoom=null;g.state.zoom=.1;});
  await page.mouse.click(420,190);await page.waitForTimeout(650);await page.evaluate(()=>{window.__game.frame(performance.now());window.__game.positionContext();});
  assert.equal(await page.locator('#coordinateArrow').isVisible(),true);assert.equal(await page.locator('#coordinateArrow').getAttribute('shape-rendering'),'crispEdges');assert.equal(await page.locator('#primaryAction').getAttribute('aria-label'),'Go Here');
  const controls=await page.locator('#contextActions').boundingBox();assert.ok(controls.width<70&&controls.height<40);
  await page.screenshot({path:`.qa/${engine}-1121-coordinate.png`});await page.locator('#cancelTravel').click();assert.equal(await page.locator('#contextActions').isVisible(),false);
  const art=await page.evaluate(async()=>{
    const {paintHomeMarker}=await import('/presentation.js'),{paintBrownGlow,paintBrownAtmosphere}=await import('/substellar.js'),{makeStar}=await import('/universe.js');
    const canvas=document.createElement('canvas');canvas.width=960;canvas.height=320;const ctx=canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,960,320);
    const halos=[];
    for(const [i,[mass,ageYears]]of [[.05,1e8],[.05,4e9],[.015,1e10]].entries()){
      const body=makeStar('halo-'+i,'Clouds','brown','L',{mass,ageYears}),x=160+i*320;
      paintBrownGlow(ctx,body,x,160,60,960,320);const halo=ctx.getImageData(x+68,160,1,1).data;halos.push(halo[0]+halo[1]+halo[2]);
      paintBrownAtmosphere(ctx,body,x,160,60,0,true,960,320);const before=[...ctx.getImageData(x,160,1,1).data];paintHomeMarker(ctx,x,160,60,960,320);if(before.some((v,j)=>v!==ctx.getImageData(x,160,1,1).data[j]))throw Error('Home outline covers the object');
      ctx.font='13px monospace';ctx.textAlign='center';ctx.fillStyle='#85c69b';ctx.fillText(body.type+' / '+body.temperature+' K',x,280);
    }
    if(!(halos[0]>halos[1]&&halos[1]>halos[2]&&halos[2]>0))throw Error('Brown halo brightness does not follow temperature: '+halos);
    const g=window.__game;g.enterChart();g.state.selected={seed:'far-warp',x:g.state.save.chart.x+1000,y:g.state.save.chart.y+1000};g.updateUI();if(document.getElementById('primaryAction').textContent!=='WARP DRIVE')throw Error('Jump label remains');
    return {image:canvas.toDataURL(),halos};
  });
  await writeFile(`.qa/${engine}-1121-home-glow.png`,Buffer.from(art.image.split(',')[1],'base64'));return {layouts,halos:art.halos};
}
