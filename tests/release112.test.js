import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {defaults,makeStar,percentUnits,checkedGeneration} from '../universe.js';
import {defaults as oldDefaults} from '../universe-v2.js';
import {makeSystem,bodyPosition,visualRadius} from '../model.js';
import {systemFitZoom,systemMinZoom,systemExtent} from '../navigation.js';
import {terminalLines,typedLength} from '../terminal.js';
import {contextPosition} from '../target-ui.js';
import {chartStyle} from '../presentation.js';
import {compactState} from '../substellar.js';
import {stellarActivity,stellarProminences} from '../stellar.js';
import {SYSTEM_SHIP_SIZE,SHIP_PIXEL_HEIGHT,SYSTEM_PX_PER_KM,SHIP_FOCUS_ZOOM,SYSTEM_MAX_ZOOM} from '../scale.js';
import {importVoyage} from '../saves.js';
const force=(pool,id)=>{const c=defaults(false);for(const key of Object.keys(c.pools[pool]))c.pools[pool][key]=key===id?100:0;c.pools.speculative={...defaults(true).pools.speculative};return c;};
test('release population tables balance exactly and neutron activity is conditional',()=>{
  const c=defaults();for(const pool of Object.values(c.pools))assert.equal(Object.values(pool).reduce((sum,v)=>sum+percentUnits(v),0),100e6);
  assert.equal(c.pools.family.main,73.245345);assert.equal(c.pools.family.brown,20);assert.equal(c.pools.family.ns,.1);assert.equal(c.pools.family.magnetar,undefined);
  assert.equal(c.pools.spectral.B,.04);assert.equal(c.pools.spectral.O,.00013);assert.ok(c.pools.neutron.pulsar<1&&c.pools.neutron.magnetar<c.pools.neutron.pulsar);
  for(const type of ['ordinary','pulsar','magnetar']){const config=force('family','ns');for(const k of Object.keys(config.pools.neutron))config.pools.neutron[k]=k===type?100:0;const s=makeSystem('neutron-'+type,config).star;assert.equal(s.family,'ns');assert.equal(s.subtype,type);assert.ok(s.diameter>=20&&s.diameter<=28);}
});
test('v1.11 voyage generation is byte-for-byte equivalent at portable numerical precision',()=>{
  const systems=Array.from({length:60},(_,i)=>makeSystem('preserve-v2-'+i,oldDefaults(i%2===0)));
  const fingerprint=createHash('sha256').update(JSON.stringify(systems,(k,v)=>typeof v==='number'?Number(v.toPrecision(11)):v)).digest('hex');
  assert.equal(fingerprint,'742ac226f7d3bf5f3dc068b3de6eeb41724688a4e24bb375c8f073ed9a411f01');
  const raw={seed:'legacy',homeSeed:'preserve-v2-1',generation:oldDefaults(false),scene:'system',layoutVersion:4,ship:{x:12,y:34},surface:{x:3,y:4},chart:{x:99,y:-5},route:['preserve-v2-2'],homePlanet:null,discoveries:['old'],log:[]};
  const restored=importVoyage(raw,'copy');assert.deepEqual(restored.generation,checkedGeneration(raw.generation));assert.deepEqual(restored.ship,raw.ship);assert.deepEqual(restored.route,raw.route);
});
test('brown dwarf cooling links mass, age, radius, class, luminosity and atmosphere',()=>{
  const young=makeStar('cool','Test','brown','L',{mass:.05,ageYears:1e8}),old=makeStar('cool','Test','brown','L',{mass:.05,ageYears:1e10});
  assert.ok(old.temperature<young.temperature&&old.luminosity<young.luminosity);assert.ok(old.radiusSolar<=young.radiusSolar);assert.equal(old.visual.spots,0);assert.equal(old.visual.granulation,0);
  const classes=new Set();for(let i=0;i<200;i++){const b=makeStar('cloud-'+i,'Test','brown');classes.add(b.type[0]);assert.ok(b.mass<.08&&b.radiusSolar<.15);assert.ok(b.cloudChemistry);assert.ok(b.rotationDays*24>=2&&b.rotationDays*24<=20);}
  assert.deepEqual([...classes].sort(),['L','T','Y']);
});
test('every hierarchy and orbital envelope fits even far below the former zoom floor',()=>{
  for(const type of ['single','binary','triple','quad'])for(let i=0;i<25;i++){
    const system=makeSystem('fit-'+type+i,force('multiplicity',type));if(type==='quad')for(const pair of system.binaries)pair.au*=1e6;
    const zoom=systemFitZoom(system,390,844),min=systemMinZoom(system,390,844);assert.ok(min<zoom);assert.ok(systemExtent(system)*zoom<195);
    for(const days of [0,100,10000])for(const star of system.stars){const p=bodyPosition(star,days,system);assert.ok((Math.hypot(p.x,p.y)+visualRadius(star.diameter))*zoom<195);}
    if(type==='quad')assert.ok(zoom<1e-8);
  }
});
test('one-kilometre ship retains detail and the camera can resolve its full sprite',()=>{
  assert.ok(Math.abs(SYSTEM_SHIP_SIZE*SHIP_PIXEL_HEIGHT/40/SYSTEM_PX_PER_KM-1)<1e-12);assert.equal(SYSTEM_SHIP_SIZE*SHIP_FOCUS_ZOOM,40);assert.ok(SYSTEM_MAX_ZOOM>SHIP_FOCUS_ZOOM);
});
test('terminal outputs universal facts, conditional home status and independently typed records',()=>{
  const system=makeSystem('sol',defaults()),earth=system.planets[2],moon=earth.moons[0];
  const star=terminalLines(system.star,system,{homeSystem:true});for(const key of ['Home System','STELLAR FAMILY','RADIUS','TEMPERATURE','ROTATION PERIOD','COORDINATES','DISTANCE FROM SHIP','MULTIPLICITY','UV OUTPUT'])assert.ok(star.includes(key));
  assert.ok(terminalLines(earth,system,{homeWorld:true}).includes('Home World'));assert.ok(terminalLines(moon,system).includes('HOST : Earth'));
  assert.equal(typedLength(star,0),0);assert.ok(typedLength(star,.1)>0&&typedLength(star,.1)<star.length);assert.equal(typedLength(star,8),star.length);assert.equal(typedLength(star,0,true),star.length);
});
test('context controls remain bounded for offscreen astronomical selections',()=>{
  for(const target of [{x:2,y:3},{x:385,y:840},{x:1e14,y:-1e14},{x:195,y:422}]){
    const p=contextPosition(target,100,{width:180,height:34},{width:390,height:844},[{x:0,y:0,width:120,height:120}]);assert.ok(p.x>=0&&p.y>=0&&p.x+180<=390&&p.y+34<=844);
  }
});
test('home status cannot change chart size and cold brown dwarfs remain dim',()=>{
  const sun=makeSystem('sol',defaults()).star;assert.deepEqual(chartStyle(sun),chartStyle({...sun,home:true}));assert.ok(chartStyle({...sun,radiusSolar:100,luminosity:1e5}).radius>chartStyle(sun).radius);
  assert.ok(chartStyle(makeStar('cold','Cold','brown','Y',{mass:.015,ageYears:1e10})).brightness<.1);
});
test('pulsar phase follows listed real spin and magnetar bursts are irregular',()=>{
  const pulsar=makeStar('pulse','Pulse','ns','NS',{subtype:'pulsar'}),period=pulsar.rotationDays*86400;
  assert.ok(Math.abs(compactState(pulsar,period/4).phase-Math.PI/2)<1e-12);assert.equal(compactState(pulsar,100,true).phase,0);
  const magnetar=makeStar('burst','Burst','ns','NS',{subtype:'magnetar'});assert.ok(compactState(magnetar,0).magnetar);const bursts=Array.from({length:200},(_,i)=>compactState(magnetar,i*.13).burst);assert.ok(bursts.some(b=>b>0)&&bursts.some(b=>b===0));
});
test('giant cells, spots and eruptions scale to their star and activity has quiet intervals',()=>{
  const giant=makeStar('giant','Giant','giant'),dwarf=makeStar('dwarf','Dwarf','main','M');assert.ok(giant.activityModel.cellScale>dwarf.activityModel.cellScale);
  const activeGiant={...giant,visual:{...giant.visual,spots:1}};const spots=Array.from({length:20},(_,i)=>stellarActivity(activeGiant,i*10)).flat();assert.ok(spots.some(s=>s.diameterKm>28000));
  const quiet={...giant,activityModel:{...giant.activityModel,flareRate:.03},visual:{...giant.visual,prominences:.03}};
  let quietFrames=0;for(let i=0;i<1000;i++)if(stellarProminences(quiet,i).every(p=>p.life===0))quietFrames++;assert.ok(quietFrames>700);
});
