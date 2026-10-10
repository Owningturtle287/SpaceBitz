import test from 'node:test';
import assert from 'node:assert/strict';
import {importVoyage} from '../src/storage/saves.js';
import {SYSTEM_UNIT,CHART_UNIT,ORBIT_DRIVE_LS_PER_SECOND,HYPERDRIVE_AU_PER_SECOND,LIGHT_SECONDS_PER_AU} from '../src/core/scale.js';
import {makeSystem} from '../src/universe/model.js';
import {manualSpeed,outermostPlanet} from '../src/flight/navigation.js';
import {placeControls,overlaps,locatorPoint,paintLocator} from '../src/ui/hud.js';
import {chartBrightness} from '../src/rendering/stellar.js';
const saved=scene=>({id:'original',name:'Away from home',seed:'voyage',homeSeed:'sol',currentSystem:'home:other',scene,
  ship:{x:931232,y:-22345},surface:{x:90,y:-185},chart:{x:-430,y:990},days:234.75,layoutVersion:3,
  landed:makeSystem('home:other').planets.find(p=>p.solid).id,homePlanet:'sol:Earth',
  route:['sol','home:other'],discoveries:['sol:Earth','sample:test'],log:[{name:'Earth',action:'Home',days:230}]});
test('modern export/import restores all scenes, coordinates, home planet and exploration exactly',()=>{
  for(const scene of ['surface','system','chart']){
    const raw=saved(scene),copy=JSON.parse(JSON.stringify(raw)),loaded=importVoyage(copy,'new-copy',123);
    for(const key of Object.keys(raw).filter(k=>k!=='id'))assert.deepEqual(loaded[key],raw[key],key);
    assert.equal(loaded.id,'new-copy');assert.equal(loaded.updated,123);assert.deepEqual(copy,raw);
  }
});
test('invalid modern positions and landing IDs are rejected rather than silently resetting progress',()=>{
  assert.throws(()=>importVoyage({...saved('system'),ship:{x:NaN,y:0}},'id'));
  assert.throws(()=>importVoyage({...saved('surface'),landed:'missing'},'id'));
  assert.throws(()=>importVoyage({...saved('system'),layoutVersion:99},'id'));
});
test('legacy import still migrates safely to the home system',()=>{
  const save=importVoyage({seed:'old',startOnEarth:true,discoveries:['old-fact']},'id',123);
  assert.equal(save.currentSystem,'sol');assert.equal(save.scene,'system');assert.equal(save.layoutVersion,4);
  assert.deepEqual(save.discoveries,['old-fact']);assert.ok(Number.isFinite(save.ship.x));
});
test('manual speeds are fixed by mode and independent of camera zoom',()=>{
  assert.equal(manualSpeed('system','orbit'),SYSTEM_UNIT*ORBIT_DRIVE_LS_PER_SECOND);
  assert.equal(manualSpeed('system','hyper'),SYSTEM_UNIT*LIGHT_SECONDS_PER_AU*HYPERDRIVE_AU_PER_SECOND);
  assert.equal(manualSpeed('chart','orbit'),CHART_UNIT*9);
  assert.equal(manualSpeed('surface','hyper'),manualSpeed('surface','orbit'));
});
test('custom controls move clear of panels and remain inside rotated viewports',()=>{
  for(const viewport of [{width:844,height:390},{width:667,height:375}]){
    const obstacles=[{x:20,y:20,width:170,height:70},{x:viewport.width-165,y:viewport.height-145,width:156,height:136}];
    for(const desired of [{x:22,y:22},{x:viewport.width-120,y:viewport.height-80},{x:-30,y:999}]){
      const p=placeControls(desired,{width:118,height:52},viewport,obstacles);
      assert.ok(p.x>=8&&p.y>=8&&p.x+p.width<=viewport.width-8&&p.y+p.height<=viewport.height-8);
      assert.ok(obstacles.every(o=>!overlaps(p,o)));
    }
  }
});
test('ship locator remains bounded for astronomical offscreen positions',()=>{
  for(const [x,y]of [[1e9,5e8],[-1e10,-1e10],[400,200]]){
    const p=locatorPoint(x,y,800,400);assert.ok(p.x>=16&&p.x<=784&&p.y>=16&&p.y<=384);
  }
  assert.equal(locatorPoint(400,200,800,400).off,false);
});
test('chart stars softly dim independently without abrupt frame changes',()=>{
  assert.notEqual(chartBrightness('sol',10),chartBrightness('other',10));
  let low=1,high=0;
  for(let t=0;t<120;t+=.1){const a=chartBrightness('sol',t);low=Math.min(low,a);high=Math.max(high,a);assert.ok(a>.8&&a<1);assert.ok(Math.abs(a-chartBrightness('sol',t+.016))<.002);}
  assert.ok(high-low>.08);
});

test('ship arrow is absent for tiny onscreen ships, including near screen edges',()=>{
  const ctx=new Proxy({}, {get(){return ()=>{throw Error('Onscreen locator should not draw');};}});
  for(const [x,y]of [[400,200],[1,1],[799,399]])paintLocator(ctx,x,y,.01,800,400);
  assert.equal(locatorPoint(-10,200,800,400).off,true);
});
test('system entry chooses the outermost orbit even if the planet list is reordered',()=>{
  const sol=makeSystem('sol');assert.equal(outermostPlanet(sol,200).name,'Neptune');
  sol.planets.reverse();assert.equal(outermostPlanet(sol,200).name,'Neptune');
  for(let i=0;i<40;i++){const sys=makeSystem('entry-'+i),outer=outermostPlanet(sys,200);assert.equal(outer.au,Math.max(...sys.planets.map(p=>p.au)));}
});

test('system locator restores the tiny onscreen ship marker while edge arrows remain offscreen only',()=>{
  const calls=[],ctx=new Proxy({}, {get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});
  paintLocator(ctx,400,200,.01,800,400,true);
  assert.equal(calls.filter(c=>c[0]==='lineTo').length,2);assert.ok(calls.some(c=>c[0]==='closePath'));assert.ok(!calls.some(c=>c[0]==='strokeRect'));assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]==='SHIP'));
  assert.ok(calls.some(c=>c[0]==='rotate'));calls.length=0;
  paintLocator(ctx,900,200,40,800,400,true);
  assert.ok(calls.some(c=>c[0]==='rotate'));assert.ok(!calls.some(c=>c[0]==='fillText'));
});

test('tiny ship triangle points along ship heading and waits until the sprite is dot-sized',()=>{
  const calls=[],ctx=new Proxy({}, {get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});
  for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2,.73]){
    calls.length=0;paintLocator(ctx,100,100,3.9,800,400,true,heading);
    assert.ok(calls.some(c=>c[0]==='rotate'&&c[1]===heading+Math.PI/2));
    assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]==='SHIP'));
  }
  for(const size of [4,6,11,42]){calls.length=0;paintLocator(ctx,100,100,size,800,400,true,0);assert.equal(calls.length,0);}
});
