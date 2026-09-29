import test from 'node:test';
import assert from 'node:assert/strict';
import {importVoyage} from '../saves.js';
import {SYSTEM_VISUAL_SCALE} from '../scale.js';
import {makeSystem} from '../model.js';
import {manualSpeed,outermostPlanet} from '../navigation.js';
import {placeControls,overlaps,locatorPoint,paintLocator} from '../hud.js';
import {chartBrightness} from '../stellar.js';
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
  assert.equal(manualSpeed('system','maneuver'),260*SYSTEM_VISUAL_SCALE);
  assert.ok(manualSpeed('system','cruise')>manualSpeed('system','maneuver'));
  assert.equal(manualSpeed('surface','cruise'),manualSpeed('surface','maneuver'));
});
test('custom controls move clear of panels and remain inside rotated viewports',()=>{
  for(const viewport of [{width:844,height:390},{width:390,height:844}]){
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
