import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,validateGeneration,checkedGeneration,percentUnits,POPULATIONS,makeStar,makeArchitecture,temperatureColor,mainLifetime,stabilityLimit} from '../src/universe/universe.js';
import {makeSystem,stellarPositions,bodyPosition,orbitRadius} from '../src/universe/model.js';
import {stellarRows} from '../src/universe/star-info.js';
import {importVoyage} from '../src/storage/saves.js';
import {systemFitZoom} from '../src/flight/navigation.js';
const force=(group,type)=>{const c=defaults(false);for(const k of Object.keys(c.pools[group]))c.pools[group][k]=k===type?100:0;c.pools.speculative=Object.fromEntries(Object.keys(c.pools.speculative).map(k=>[k,k==='ordinary'?100:0]));return c;};
const close=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(a)),`${a} != ${b}`);

test('every independent percentage table totals exactly 100%; no implicit normalization',()=>{
  for(const scientific of [true,false])assert.deepEqual(validateGeneration(defaults(scientific)),[]);
  assert.equal(percentUnits('0.000001'),1);assert.equal(percentUnits('99.999999'),99999999);
  for(const input of ['-1','101','NaN','1e2','','1.0000001','0x64'])assert.equal(percentUnits(input),null);
  const c=defaults(false);c.pools.spectral.M='76.559869';assert.ok(validateGeneration(c).length);assert.throws(()=>checkedGeneration(c));
  c.pools.spectral.K='13.580001';assert.deepEqual(validateGeneration(c),[]);assert.equal(checkedGeneration(c).pools.spectral.M,76.559869);
});
test('scientific settings lock agreed baseline and exclude speculative types',()=>{
  const c=force('spectral','O');c.scientific=true;
  assert.equal(checkedGeneration(c).pools.spectral.M,76.55987);
  for(let i=0;i<1000;i++){const s=makeArchitecture('science-'+i,'Test',defaults());assert.doesNotMatch(s.star.provenance,/Speculative/);assert.ok(s.star.ageYears<13.8e9);assert.ok(!['black-hole','quasar'].includes(s.star.family));}
});
test('v3 stellar generation is deterministic and all principal physical values agree',()=>{
  for(const family of POPULATIONS.family.entries.map(e=>e[0]))for(let i=0;i<10;i++){
    const config=force('family',family),a=makeSystem(family+i,config),b=makeSystem(family+i,config);assert.deepEqual(a,b);
    for(const s of a.stars){for(const field of ['mass','diameter','radiusSolar','temperature','luminosity','gravity','ageYears'])assert.ok(Number.isFinite(s[field])&&s[field]>=0,family+' '+field);
      close(s.luminosity,s.radiusSolar**2*(s.temperature/5772)**4);close(s.gravity,274.2*s.mass/s.radiusSolar**2);assert.equal(s.color,temperatureColor(s.temperature));}
  }
});
test('each editable spectral class produces the selected physical main-sequence class',()=>{
  for(const [type]of POPULATIONS.spectral.entries){const c=force('spectral',type);c.pools.family=Object.fromEntries(Object.keys(c.pools.family).map(k=>[k,k==='main'?100:0]));
    for(let i=0;i<30;i++){const s=makeSystem(type+i,c).star;assert.equal(s.type[0],type);assert.ok(s.remainingYears>0);assert.ok(s.ageYears<mainLifetime(s.mass));}}
});
test('custom theoretical objects are flagged, future objects never pass as observed stars',()=>{
  for(const [type]of POPULATIONS.speculative.entries.filter(e=>e[0]!=='ordinary')){
    const c=defaults(false);for(const k of Object.keys(c.pools.speculative))c.pools.speculative[k]=k===type?100:0;
    const s=makeSystem('speculative-'+type,c).star;assert.equal(s.family,type);assert.match(s.provenance,/Speculative/);assert.ok(s.familyLabel.length);}
});
test('binary and higher hierarchies preserve mass barycenters with finite moving star positions',()=>{
  for(const type of ['binary','triple','quad'])for(let i=0;i<20;i++){
    const s=makeSystem('pair-'+type+i,force('multiplicity',type));assert.equal(s.stars.length,{binary:2,triple:3,quad:4}[type]);
    for(const days of [0,20,10000]){const positions=stellarPositions(s,days);let x=0,y=0;
      for(const star of s.stars){assert.equal(star.ageYears,s.star.ageYears);assert.equal(star.metallicity,s.star.metallicity);const p=bodyPosition(star,days,s);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));x+=p.x*star.mass;y+=p.y*star.mass;}
      const scale=Math.max(...s.stars.map(star=>Math.hypot(positions[star.id].x,positions[star.id].y)*star.mass));assert.ok(Math.abs(x)<scale*1e-12+1e-6);assert.ok(Math.abs(y)<scale*1e-12+1e-6);
      for(const pair of s.binaries){const a=positions[pair.left],b=positions[pair.right];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=orbitRadius(pair.au)*(1-pair.eccentricity)*.98);}
    }
  }
});
test('new planetary architecture honors stellar envelopes and binary stability margins',()=>{
  let sTypes=0,pTypes=0;
  for(let i=0;i<300;i++){
    const s=makeSystem('stable-'+i,force('multiplicity','triple'));if(s.architecture.startsWith('S'))sTypes++;else pTypes++;
    for(const p of s.planets){assert.ok(p.au*(1-p.eccentricity)>s.minAU);assert.ok(p.au*(1+p.eccentricity)<s.maxAU);close(p.period,365.256*Math.sqrt(p.au**3/s.hostMass));
      for(const days of [0,300]){const pos=bodyPosition(p,days,s);assert.ok(Number.isFinite(pos.x)&&Number.isFinite(pos.y));}}
    assert.ok(Number.isFinite(systemFitZoom(s,844,390))&&systemFitZoom(s,844,390)>0);
  }
  assert.ok(sTypes&&pTypes);close(stabilityLimit(1,0,.5,true),2.3875);
});
test('star panel carries every requested fact, dropdown explanation and Sol reference',()=>{
  const s=makeSystem('info',defaults()),rows=stellarRows(s.star,s);
  for(const key of ['STELLAR FAMILY','SPECTRAL CLASS','TEMPERATURE','MASS','SURFACE GRAVITY','LUMINOSITY','GOLDILOCKS ZONE','AGE','NEXT EVOLUTION','LIKELY STELLAR END','METALLICITY','MAGNETIC ACTIVITY','UV OUTPUT','X-RAY OUTPUT','STELLAR WIND','SYSTEM'])assert.ok(rows.some(r=>r.key===key));
  assert.ok(rows.every(r=>r.explanation&&r.sol));assert.equal(rows[0].key,'STELLAR FAMILY');assert.equal(rows.some(r=>['DISTANCE FROM SHIP','COORDINATES'].includes(r.key)),false);
  assert.match(rows.find(r=>r.key==='LIKELY STELLAR END').explanation,/uncertainty/);
});
test('Sol preserves existing orbital geometry while receiving consistent stellar reference facts',()=>{
  const legacy=makeSystem('sol'),modern=makeSystem('sol',defaults());assert.deepEqual(modern.planets,legacy.planets);
  assert.equal(modern.star.temperature,5772);assert.equal(modern.star.luminosity,1);assert.equal(modern.star.mass,1);assert.equal(modern.star.rotationDays,25.05);
});
test('generation profile survives export/import; invalid percentages are rejected',()=>{
  const system=makeSystem('home:test',defaults()),home=system.planets.find(p=>p.solid);
  const raw={seed:'test',homeSeed:'home:test',currentSystem:'home:test',scene:'system',layoutVersion:4,ship:{x:1000,y:0},surface:{x:0,y:0},chart:{x:0,y:0},landed:home?.id||null,generation:defaults()};
  const saved=importVoyage(raw,'id');assert.deepEqual(saved.generation,raw.generation);assert.deepEqual(makeSystem('home:test',saved.generation),system);
  const invalid=structuredClone(raw);invalid.generation.pools.family.main=99;assert.throws(()=>importVoyage(invalid,'bad'));
});
