import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {makeSystem,bodyPosition,orbitalElements,position,TAU} from '../model.js';
import {outermostPlanet,systemDrive,systemFitZoom} from '../navigation.js';
import {giantProfile,giantColor,ringSprites,ringCacheStats} from '../giants.js';
import {celestialSprite} from '../celestial.js';

// Image buffers exercise real raster generation without adding runtime libraries.
globalThis.document={createElement(){const canvas={width:0,height:0,pixels:null};canvas.getContext=()=>({
  createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:image=>{canvas.pixels=image.data;}
});return canvas;}};
const sol=makeSystem('sol'),body=name=>sol.planets.flatMap(p=>[p,...p.moons]).find(p=>p.name===name);
const close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);

test('requested Saturn and Uranus satellites have sourced sizes, periods, ordered radii and stable existing phases',()=>{
  assert.deepEqual(body('Saturn').moons.map(m=>m.name),['Enceladus','Tethys','Dione','Rhea','Titan','Iapetus']);
  assert.deepEqual(body('Uranus').moons.map(m=>m.name),['Ariel','Umbriel','Titania','Oberon']);
  for(const [name,diameter,days,km]of [['Tethys',1062,1.887802,294660],['Dione',1123,2.736915,377400],['Rhea',1528,4.5175,527040],['Iapetus',1469,79.330183,3560850],
    ['Ariel',1158,2.520379,190900],['Umbriel',1169.4,4.144176,266000],['Titania',1577.8,8.705867,436300],['Oberon',1522.8,13.463234,583500]]){
    const m=body(name);assert.equal(m.diameter,diameter);assert.equal(m.period,days);assert.equal(m.orbitKm,km);assert.equal(m.solid,true);
    close(Math.abs(m.rotationDays),days);assert.equal(systemDrive(bodyPosition(body(m.parent.split(':')[1]),0,sol),m,sol,0,m.parent),'orbit');
  }
  assert.equal(body('Enceladus').phase,.5);assert.equal(body('Titan').phase,2.9);
  assert.ok(orbitalElements(body('Ariel')).inclination>Math.PI/2);
});

test('Pluto and Charon share a physical barycentre, elliptical inclined orbit and synchronous retrograde spin',()=>{
  const pluto=body('Pluto'),charon=body('Charon');
  assert.equal(pluto.kind,'dwarf-planet');assert.equal(pluto.diameter,2376.6);assert.equal(charon.diameter,1212);
  assert.equal(charon.orbitKm,19596);assert.equal(pluto.rotationDays,-6.3872);assert.equal(charon.rotationDays,-6.3872);
  const orbit=orbitalElements(pluto);close(orbit.e,.24880766);close(orbit.inclination*180/Math.PI,17.14175);
  for(const days of [0,10,300,90560]){
    const p=bodyPosition(pluto,days,sol),c=bodyPosition(charon,days,sol),b=position(pluto,days),share=pluto.barycentricMoon.massFraction;
    close(p.x+(c.x-p.x)*share,b.x);close(p.y+(c.y-p.y)*share,b.y);
    const relative=position(charon,days);close(c.x-p.x,relative.x);close(c.y-p.y,relative.y);
  }
  assert.equal(outermostPlanet(sol).name,'Neptune');
  assert.ok(systemFitZoom(sol,900,600)<systemFitZoom({...sol,planets:sol.planets.slice(0,-1)},900,600));
});

test('giant artwork changes do not alter pre-update generated world/save geometry',()=>{
  const shape=s=>({star:[s.star.id,s.star.mass,s.star.diameter,s.star.rotationDays],planets:s.planets.map(p=>[p.id,p.kind,p.type,p.au,p.diameter,p.period,p.phase,p.rotationDays,p.solid,p.moons.map(m=>[m.id,m.diameter,m.orbitKm,m.period,m.phase,m.rotationDays,m.solid])])});
  const fixtures=Array.from({length:80},(_,i)=>shape(makeSystem('save-fixture-'+i)));
  assert.equal(createHash('sha256').update(JSON.stringify(fixtures)).digest('hex'),'7d36b7790c9f5501bdaca5c675297883b11923ef1323b2609cc25a6be141b485');
});

test('Sol rings use measured radial dimensions, Saturn divisions and faint Jupiter dust',()=>{
  const j=body('Jupiter'),s=body('Saturn'),u=body('Uranus'),n=body('Neptune');
  assert.equal(j.rings.outerKm,129100);assert.ok(j.rings.bands.every(b=>b.alpha<.1));
  assert.equal(s.rings.outerKm,140612);assert.equal(s.rings.bands[2].outer,117570);assert.equal(s.rings.bands[3].inner,122050);
  assert.ok(s.rings.outerKm/(s.diameter/2)>2.41&&s.rings.outerKm/(s.diameter/2)<2.42);
  assert.equal(u.rings.outerKm,51149+58.1/2);assert.equal(n.rings.outerKm,62933+15/2);
  assert.ok(u.rings.bands.filter(b=>b.narrow).every(b=>b.outer-b.inner<60));
  for(const b of [j,s,u,n])assert.ok(b.moons[0].orbitKm>b.rings.outerKm);
});

test('Jupiter vortex has a feathered oval footprint and giant cloud maps wrap without a longitude seam',()=>{
  const p=body('Jupiter').atmosphere,spot=p.storms.find(s=>s.redSpot),clean={...p,storms:[spot]};
  const center=giantColor(clean,spot.lon,spot.lat),corner=giantColor(clean,spot.lon+spot.sx/Math.cos(spot.lat),spot.lat+spot.sy);
  assert.ok(center[0]-center[1]>corner[0]-corner[1]+10,'Storm corners must blend into clouds, not form a rectangle');
  for(const name of ['Jupiter','Saturn','Uranus','Neptune'])for(const lat of [-1.4,-.4,0,.6,1.4]){
    const a=giantColor(body(name).atmosphere,0,lat),b=giantColor(body(name).atmosphere,TAU,lat);
    a.forEach((v,i)=>{assert.ok(v>=0&&v<=255);close(v,b[i],1e-7);});
  }
});

test('theoretical atmospheres are deterministic, temperature-gated and retain common Sol-like clouds',()=>{
  const cold={id:'test:giant',type:'gas',diameter:90000,au:6};
  assert.deepEqual(giantProfile(cold),giantProfile(cold));
  assert.equal(giantProfile({...cold,au:.1}).family,'clear');
  assert.equal(giantProfile({...cold,au:.04}).family,'alkali');
  assert.equal(giantProfile({...cold,au:.01}).family,'silicate');
  let ammonia=0,methane=0;
  for(let i=0;i<300;i++){
    const p=giantProfile({...cold,id:'population:'+i,diameter:55000});
    if(p.family==='ammonia')ammonia++;if(p.family==='methane')methane++;
    assert.ok(['ammonia','methane','haze'].includes(p.family));
  }
  assert.ok(ammonia>30&&methane>100);
});

test('pixel giant sprites rotate visibly, preserve an opaque disk and use bounded raster dimensions',()=>{
  const j=body('Jupiter'),a=celestialSprite(j,0,{x:-1,y:-1}),b=celestialSprite(j,j.rotationDays/4,{x:-1,y:-1});
  assert.equal(a.width,128);assert.equal(a.height,128);assert.notDeepEqual(a.pixels,b.pixels);
  assert.equal(a.pixels[3],0);assert.equal(a.pixels[(64*128+64)*4+3],255);
  assert.equal(celestialSprite(j,0,{x:-1,y:-1}),a);
});

test('ring rasters split front/back without overlapping pixels, preserve the major gap and bound caching',()=>{
  const s=body('Saturn'),sprites=ringSprites(s,{x:-1,y:-1});
  assert.equal(sprites.front.width,384);assert.equal(sprites.back.height,384);
  let back=0,front=0;
  for(let i=3;i<sprites.front.pixels.length;i+=4){
    assert.ok(!(sprites.front.pixels[i]&&sprites.back.pixels[i]));
    if(sprites.front.pixels[i])front++;if(sprites.back.pixels[i])back++;
  }
  assert.ok(front>10000&&back>10000);
  const at=(radius,angle)=>{
    const x=Math.round(192+radius*Math.cos(angle)/s.rings.outerKm*192),y=Math.round(192+radius*Math.sin(angle)/s.rings.outerKm*192);
    return sprites.front.pixels[(y*384+x)*4+3]+sprites.back.pixels[(y*384+x)*4+3];
  };
  assert.equal(at(120000,s.rings.angle),0);assert.ok(at(112000,s.rings.angle)>150);
  for(let i=0;i<40;i++)ringSprites({...s,id:'cache:ring:'+i},{x:1,y:1});
  assert.equal(ringCacheStats().frames,24);
});
