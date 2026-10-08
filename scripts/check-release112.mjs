import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
export async function checkRelease112(page,engine){
  // Prevent pagehide autosave from replacing the deliberately overflowing fixture.
  await page.evaluate(async()=>{const g=window.__game;await g.persist();const fixture=structuredClone(g.state.save);g.state.save=null;const {createVoyageStore}=await import('/voyage-database.js'),store=createVoyageStore();try{await store.importSaves(Array.from({length:30},(_,i)=>({...fixture,id:'layout-'+i,seed:'layout-'+i,name:'Saved voyage '+i,updated:Date.now()})));}finally{store.close();}});
  await page.reload();await page.locator('#startGame').click();
  await page.waitForFunction(()=>document.getElementById('savedGames').children.length>=30);
  for(const viewport of [{width:844,height:390},{width:667,height:375},{width:1024,height:768}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(120);
    const layout=await page.evaluate(()=>{const list=document.getElementById('savedGames'),stage=document.getElementById('universeMenuStage'),card=document.querySelector('.welcome-card');list.scrollTop=list.scrollHeight;return {viewport:[innerWidth,innerHeight],listCount:list.children.length,listHeight:list.clientHeight,listContent:list.scrollHeight,columnsHeight:document.querySelector('.generation-columns').clientHeight,columnRows:getComputedStyle(document.querySelector('.generation-columns')).gridTemplateRows,listScroll:list.scrollTop,stageOverflow:stage.scrollHeight-stage.clientHeight,cardOverflow:card.scrollHeight-card.clientHeight,bodyOverflow:document.scrollingElement.scrollHeight-innerHeight};});
    assert.ok(layout.listScroll>100,JSON.stringify(layout));assert.ok(layout.stageOverflow<=1&&layout.cardOverflow<=1&&layout.bodyOverflow<=1,JSON.stringify(layout));
    await page.screenshot({path:`.qa/${engine}-generation-${viewport.width}x${viewport.height}.png`});
    await page.locator('#scientificMode').uncheck();await page.locator('#generationOptions').click();
    const editor=await page.evaluate(()=>{const column=document.querySelector('.generation-column').getBoundingClientRect(),buttons=[...document.querySelectorAll('.editor-actions button')].map(e=>e.getBoundingClientRect());return {columnBottom:column.bottom,scrollTop:document.querySelector('.generation-column').scrollTop,bottom:Math.max(...buttons.map(r=>r.bottom)),left:Math.min(...buttons.map(r=>r.left)),right:Math.max(...buttons.map(r=>r.right))};});
    assert.ok(editor.scrollTop===0&&editor.bottom<=editor.columnBottom+1&&editor.left>=0&&editor.right<=viewport.width,JSON.stringify(editor));
    await page.screenshot({path:`.qa/${engine}-custom-${viewport.width}x${viewport.height}.png`});
    await page.locator('#generationEditor').getByRole('button',{name:'CANCEL',exact:true}).click();await page.locator('#scientificMode').check();
  }
  await page.setViewportSize({width:844,height:390});
  await page.locator('#scientificMode').check();await page.locator('#scientificDefaults summary').click();await page.locator('#scientificPool').selectOption('family');
  assert.ok((await page.locator('#scientificValues').innerText()).includes('20.000000%'));
  assert.equal(await page.locator('#generationOptions').isVisible(),false);await page.locator('#scientificDefaults summary').click();
  await page.locator('#scientificMode').uncheck();await page.locator('#generationOptions').click();
  const input=page.locator('input[data-pool="family"][data-type="brown"]');await input.fill('21');assert.equal(await page.locator('#applyGeneration').isDisabled(),true);
  await page.getByRole('button',{name:'RESTORE SCIENTIFIC DEFAULTS',exact:true}).click();assert.equal(await page.locator('#applyGeneration').isDisabled(),false);await page.locator('#applyGeneration').click();await page.locator('#scientificMode').check();
  await page.evaluate(async()=>{const {createVoyageStore}=await import('/voyage-database.js'),store=createVoyageStore();try{for(const save of await store.list())if(save.id.startsWith('layout-'))await store.remove(save.id,save.revision);}finally{store.close();}});await page.locator('#solGame').click();await page.waitForFunction(()=>window.__game.state.scene==='surface');
  const early=await page.evaluate(()=>{const g=window.__game;globalThis.__qaPause=true;g.settings.reducedMotion=false;g.launch();g.select(g.state.system.star);g.showDetails(g.state.selected);g.updateTerminal(g.state.terminal.start+40);return {text:g.state.terminal.node.textContent,length:g.state.terminal.text.length,count:g.state.terminal.count};});
  assert.ok(early.text.length>0&&early.text.length<early.length,JSON.stringify(early));
  await page.evaluate(()=>{const g=window.__game;g.updateTerminal(performance.now()+9000);g.positionContext();});
  await page.waitForTimeout(220);
  assert.ok((await page.locator('#terminalOutput').innerText()).includes('Home System'));assert.equal(await page.locator('#targetCard details').count(),0);
  const terminal=await page.locator('#terminalScreen').evaluate(e=>({overflow:e.scrollHeight>e.clientHeight,background:getComputedStyle(document.getElementById('targetCard')).backgroundColor}));assert.ok(terminal.overflow);assert.equal(terminal.background,'rgb(3, 17, 13)');
  await page.locator('#terminalScreen').evaluate(e=>{e.scrollTop=100;});assert.ok(await page.locator('#terminalScreen').evaluate(e=>e.scrollTop>0));
  await page.screenshot({path:`.qa/${engine}-terminal-star.png`});
  for(const name of ['Earth','Moon','Pluto']){await page.evaluate(name=>{const g=window.__game,b=g.state.system.planets.flatMap(p=>[p,...p.moons]).find(b=>b.name===name);g.select(b);g.showDetails(b);g.settings.reducedMotion=true;g.updateTerminal(performance.now());g.positionContext();},name);assert.ok((await page.locator('#terminalOutput').innerText()).includes('DIAMETER'));}
  await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=false;g.state.camera={...g.state.save.ship};g.positionContext();});
  const before=await page.locator('#contextActions').boundingBox();await page.evaluate(()=>{const g=window.__game;g.state.camera.x+=100;g.positionContext();});await page.waitForTimeout(100);const after=await page.locator('#contextActions').boundingBox();assert.ok(before&&after&&after.x>=0&&after.y>=0&&after.x+after.width<=844&&after.y+after.height<=390);
  await page.locator('#cancelTravel').click();assert.equal(await page.locator('#contextActions').isVisible(),false);assert.equal(await page.locator('#targetCard').isVisible(),false);
  const rendering=await page.evaluate(async()=>{
    const g=window.__game,s=g.state,{defaults,makeStar}=await import('/universe.js'),{makeSystem,bodyPosition,visualRadius}=await import('/model.js'),{systemFitZoom,systemMinZoom,systemExtent}=await import('/navigation.js'),{SYSTEM_SHIP_SIZE,SHIP_PIXEL_HEIGHT,SYSTEM_PX_PER_KM,SHIP_FOCUS_ZOOM}=await import('/scale.js');
    const {paintBrownAtmosphere,paintCompact,substellarCacheStats}=await import('/substellar.js');
    function config(family,multiple='single',subtype='ordinary'){const c=defaults(false);for(const k of Object.keys(c.pools.family))c.pools.family[k]=k===family?100:0;for(const k of Object.keys(c.pools.multiplicity))c.pools.multiplicity[k]=k===multiple?100:0;for(const k of Object.keys(c.pools.neutron))c.pools.neutron[k]=k===subtype?100:0;Object.assign(c.pools.speculative,defaults(true).pools.speculative);return c;}
    const wide=makeSystem('huge-quad',config('giant','quad'));for(const b of wide.binaries)b.au*=1e6;
    s.system=wide;s.scene='system';s.save.generation=wide.generation;s.selected=wide.star;s.followBody=null;s.autopilot=null;s.camera={x:0,y:0};s.save.currentSystem=wide.seed;s.zoom=systemFitZoom(wide,s.width,s.height);g.backdrop(0);g.drawSystem(0);
    if(s.zoom>=1e-8||systemMinZoom(wide,s.width,s.height)>=s.zoom)throw Error('Wide system has a fixed zoom floor');
    for(const star of wide.stars){const p=bodyPosition(star,s.save.days,wide);if((Math.hypot(p.x,p.y)+visualRadius(star.diameter))*s.zoom>Math.min(s.width,s.height)/2)throw Error('Wide star excluded');}
    const trueLength=SYSTEM_SHIP_SIZE*SHIP_PIXEL_HEIGHT/40/SYSTEM_PX_PER_KM;if(Math.abs(trueLength-1)>1e-12)throw Error('Ship scale incorrect');
    s.system=makeSystem('sol',defaults());s.save.generation=defaults();s.save.currentSystem='sol';s.camera={...s.save.ship};s.zoom=SHIP_FOCUS_ZOOM;g.backdrop(0);g.drawSystem(0);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=320;const ctx=canvas.getContext('2d');
    const results=[],montage=document.createElement('canvas');montage.width=960;montage.height=640;const out=montage.getContext('2d');
    for(const [index,[family,subtype]]of [['brown','ordinary'],['ns','pulsar'],['ns','magnetar'],['giant','ordinary'],['supergiant','ordinary'],['protostar','ordinary']].entries()){
      const system=makeSystem('motion-'+family+subtype,config(family,'single',subtype)),body=system.star;
      function render(seconds,reduced=false){ctx.fillStyle='#000';ctx.fillRect(0,0,320,320);if(family==='brown')paintBrownAtmosphere(ctx,body,160,160,95,seconds,reduced,320,320);else if(family==='ns')paintCompact(ctx,body,160,160,12,seconds,reduced,320,320);else {s.system=system;s.selected=null;s.camera=bodyPosition(body,s.save.days,system);s.zoom=95/visualRadius(body.diameter);s.stellarSeconds=seconds;g.settings.reducedMotion=reduced;g.backdrop(seconds*1000);g.drawSystem(seconds*1000);const sky=document.getElementById('sky'),dpr=s.dpr;ctx.drawImage(sky,sky.width/2-160*dpr,sky.height/2-160*dpr,320*dpr,320*dpr,0,0,320,320);}return ctx.getImageData(0,0,320,320).data;}
      const a=render(1),b=render(9),still=render(1,true),later=render(90,true);let changed=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])changed++;
      if(changed<100)throw Error('Static '+family+'/'+subtype);if(!still.every((v,i)=>v===later[i]))throw Error('Reduced motion changes '+family);
      render(9);out.drawImage(canvas,index%3*320,Math.floor(index/3)*320);results.push({family,subtype,changed});
    }
    const brownMontage=document.createElement('canvas');brownMontage.width=960;brownMontage.height=320;const clouds=brownMontage.getContext('2d');clouds.fillStyle='#000';clouds.fillRect(0,0,960,320);
    for(const [index,[mass,ageYears]]of [[.05,1e8],[.05,4e9],[.015,1e10]].entries()){const body=makeStar('class-'+index,'Clouds','brown','L',{mass,ageYears});paintBrownAtmosphere(clouds,body,160+index*320,150,110,9,false,960,320);clouds.fillStyle='#84ba98';clouds.font='12px monospace';clouds.textAlign='center';clouds.fillText(body.type+' / '+body.temperature+' K',160+index*320,300);}
    g.settings.reducedMotion=false;return {results,extent:systemExtent(wide),caches:substellarCacheStats(),image:montage.toDataURL(),brownImage:brownMontage.toDataURL()};
  });
  await writeFile(`.qa/${engine}-release112-activity.png`,Buffer.from(rendering.image.split(',')[1],'base64'));delete rendering.image;
  await writeFile(`.qa/${engine}-brown-classes.png`,Buffer.from(rendering.brownImage.split(',')[1],'base64'));delete rendering.brownImage;
  assert.ok(rendering.caches.frames<=4);return {terminal,rendering};
}
