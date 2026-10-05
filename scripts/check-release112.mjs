import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
export async function checkRelease112(page,engine){
  await page.evaluate(()=>{localStorage.setItem('spacebitz:field:v1',JSON.stringify(Array.from({length:30},(_,i)=>({id:'layout-'+i,seed:'layout-'+i,name:'Saved voyage '+i,updated:Date.now()}))));});
  await page.reload();await page.locator('#startGame').click();
  for(const viewport of [{width:844,height:390},{width:390,height:844},{width:375,height:667},{width:1024,height:768}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(120);
    const layout=await page.evaluate(()=>{const list=document.getElementById('savedGames'),stage=document.getElementById('universeMenuStage'),card=document.querySelector('.welcome-card');list.scrollTop=list.scrollHeight;return {listScroll:list.scrollTop,stageOverflow:stage.scrollHeight-stage.clientHeight,cardOverflow:card.scrollHeight-card.clientHeight,bodyOverflow:document.scrollingElement.scrollHeight-innerHeight};});
    assert.ok(layout.listScroll>100,JSON.stringify(layout));assert.ok(layout.stageOverflow<=1&&layout.cardOverflow<=1&&layout.bodyOverflow<=1,JSON.stringify(layout));
    await page.screenshot({path:`.qa/${engine}-generation-${viewport.width}x${viewport.height}.png`});
  }
  await page.setViewportSize({width:844,height:390});
  await page.locator('#scientificMode').check();await page.locator('#scientificDefaults summary').click();await page.locator('#scientificPool').selectOption('family');
  assert.ok((await page.locator('#scientificValues').innerText()).includes('20.000000%'));
  assert.equal(await page.locator('#generationOptions').isVisible(),false);await page.locator('#scientificDefaults summary').click();
  await page.locator('#scientificMode').uncheck();await page.locator('#generationOptions').click();
  const input=page.locator('input[data-pool="family"][data-type="brown"]');await input.fill('21');assert.equal(await page.locator('#applyGeneration').isDisabled(),true);
  await page.getByRole('button',{name:'RESTORE SCIENTIFIC DEFAULTS',exact:true}).click();assert.equal(await page.locator('#applyGeneration').isDisabled(),false);await page.locator('#applyGeneration').click();await page.locator('#scientificMode').check();
  await page.evaluate(()=>localStorage.removeItem('spacebitz:field:v1'));await page.locator('#solGame').click();await page.waitForFunction(()=>window.__game.state.scene==='surface');
  await page.evaluate(()=>{const g=window.__game;g.launch();g.select(g.state.system.star);g.showDetails(g.state.selected);g.state.terminal.start=performance.now();g.updateTerminal(performance.now()+40);});
  const early=await page.locator('#terminalOutput').innerText();assert.ok(early.length>0&&early.length<200);
  await page.evaluate(()=>{const g=window.__game;g.updateTerminal(performance.now()+9000);g.positionContext();});
  assert.ok((await page.locator('#terminalOutput').innerText()).includes('Home System'));assert.equal(await page.locator('#targetCard details').count(),0);
  const terminal=await page.locator('#terminalScreen').evaluate(e=>({overflow:e.scrollHeight>e.clientHeight,background:getComputedStyle(document.getElementById('targetCard')).backgroundColor}));assert.ok(terminal.overflow);assert.equal(terminal.background,'rgb(3, 17, 13)');
  await page.locator('#terminalScreen').evaluate(e=>{e.scrollTop=100;});assert.ok(await page.locator('#terminalScreen').evaluate(e=>e.scrollTop>0));
  await page.screenshot({path:`.qa/${engine}-terminal-star.png`});
  for(const name of ['Earth','Moon','Pluto']){await page.evaluate(name=>{const g=window.__game,b=g.state.system.planets.flatMap(p=>[p,...p.moons]).find(b=>b.name===name);g.select(b);g.showDetails(b);g.settings.reducedMotion=true;g.updateTerminal(performance.now());g.positionContext();},name);assert.ok((await page.locator('#terminalOutput').innerText()).includes('DIAMETER'));}
  await page.evaluate(()=>{const g=window.__game;g.settings.reducedMotion=false;g.state.camera={...g.state.save.ship};g.positionContext();});
  const before=await page.locator('#contextActions').boundingBox();await page.evaluate(()=>{const g=window.__game;g.state.camera.x+=100;g.positionContext();});await page.waitForTimeout(100);const after=await page.locator('#contextActions').boundingBox();assert.ok(before&&after&&after.x>=0&&after.y>=0&&after.x+after.width<=844&&after.y+after.height<=390);
  await page.locator('#cancelTravel').click();assert.equal(await page.locator('#contextActions').isVisible(),false);assert.equal(await page.locator('#targetCard').isVisible(),false);
  const rendering=await page.evaluate(async()=>{
    const g=window.__game,s=g.state,{defaults}=await import('/universe.js'),{makeSystem,bodyPosition,visualRadius}=await import('/model.js'),{systemFitZoom,systemMinZoom,systemExtent}=await import('/navigation.js'),{SYSTEM_SHIP_SIZE,SHIP_PIXEL_HEIGHT,SYSTEM_PX_PER_KM,SHIP_FOCUS_ZOOM}=await import('/scale.js');
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
      function render(seconds,reduced=false){ctx.clearRect(0,0,320,320);if(family==='brown')paintBrownAtmosphere(ctx,body,160,160,95,seconds,reduced,320,320);else if(family==='ns')paintCompact(ctx,body,160,160,12,seconds,reduced,320,320);else {s.system=system;s.camera=bodyPosition(body,s.save.days,system);s.zoom=95/visualRadius(body.diameter);s.stellarSeconds=seconds;g.settings.reducedMotion=reduced;g.backdrop(seconds*1000);g.drawSystem(seconds*1000);ctx.drawImage(document.getElementById('sky'),document.getElementById('sky').width/2-160,document.getElementById('sky').height/2-160,320,320,0,0,320,320);}return ctx.getImageData(0,0,320,320).data;}
      const a=render(1),b=render(9),still=render(1,true),later=render(90,true);let changed=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])changed++;
      if(changed<100)throw Error('Static '+family+'/'+subtype);if(!still.every((v,i)=>v===later[i]))throw Error('Reduced motion changes '+family);
      render(9);out.drawImage(canvas,index%3*320,Math.floor(index/3)*320);results.push({family,subtype,changed});
    }
    g.settings.reducedMotion=false;return {results,extent:systemExtent(wide),caches:substellarCacheStats(),image:montage.toDataURL()};
  });
  await writeFile(`.qa/${engine}-release112-activity.png`,Buffer.from(rendering.image.split(',')[1],'base64'));delete rendering.image;
  assert.ok(rendering.caches.frames<=4);return {terminal,rendering};
}
