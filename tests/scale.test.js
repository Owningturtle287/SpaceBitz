import test from 'node:test';
import assert from 'node:assert/strict';
import {AU_KM,SYSTEM_VISUAL_SCALE,SUN_DIAMETER_KM,SOL_RADIUS,SYSTEM_PX_PER_KM,SYSTEM_UNIT,SURFACE_UNIT,CHART_UNIT,ASTRONAUT_SCALE,ASTRONAUT_PIXEL_HEIGHT,LANDER_SIZE,SHIP_PIXEL_HEIGHT,gridCell,gridStride,formatDistance,formatCoordinates,formatSystemKm,formatDiameter} from '../src/core/scale.js';
import {makeSystem,visualRadius,orbitRadius,orbitalElements,orbitPoint,bodyPosition,TAU} from '../src/universe/model.js';
import {migrateLayout,travelSpeed,systemFitZoom,centerZoomAt,starApproachPoint,systemDrive,advanceToArrival,cameraViewAt} from '../src/flight/navigation.js';
import {navigationTarget} from '../src/flight/motion.js';
import {stellarActivity,stellarProminences} from '../src/rendering/stellar.js';
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);

test('one surface metre is one standing explorer high, exactly one-third of the parked ship',()=>{
  close(SURFACE_UNIT,ASTRONAUT_SCALE*ASTRONAUT_PIXEL_HEIGHT);
  close(SURFACE_UNIT*3,LANDER_SIZE/40*SHIP_PIXEL_HEIGHT);
  for(const scene of ['surface','system','chart']){
    const unit={surface:SURFACE_UNIT,system:SYSTEM_UNIT,chart:CHART_UNIT}[scene];
    assert.deepEqual(gridCell({x:unit*2.49,y:-unit*3.49},scene),{x:2*unit,y:-3*unit,gx:2,gy:-3,size:unit});
    assert.equal(gridCell({x:0,y:0},scene).gx,0);
    for(const zoom of [.000001,.65,1,128])assert.ok(gridStride(scene,zoom)>=1);
  }
});
test('distance boundaries and axes use immutable scene units, including tiny moons',()=>{
  assert.equal(formatDistance(SURFACE_UNIT*999,'surface'),'999 m');
  assert.equal(formatDistance(SURFACE_UNIT*1000,'surface'),'1 km');
  assert.equal(formatDistance(SYSTEM_UNIT*499,'system'),'499 ls');
  assert.equal(formatDistance(SYSTEM_UNIT*500,'system'),'1 AU');
  assert.equal(formatDistance(CHART_UNIT*2.5,'chart'),'2.5 ly');
  assert.equal(formatCoordinates({x:-SURFACE_UNIT,y:0},'surface'),'X -1 m · Y 0 m');
  assert.notEqual(formatSystemKm(12),'0 ls');
  close(orbitRadius(1),SYSTEM_UNIT*500);
});
test('all celestial sizes and orbital distances share one linear physical scale',()=>{
  const sol=makeSystem('sol');assert.equal(sol.star.diameter,SUN_DIAMETER_KM);
  close(visualRadius(sol.star.diameter),SOL_RADIUS);
  close(SOL_RADIUS,10*3*12*Math.pow(1392700/12742,.85));
  for(const p of sol.planets){
    close(visualRadius(p.diameter)/SOL_RADIUS,p.diameter/SUN_DIAMETER_KM);
    close(orbitRadius(p.au)/SYSTEM_PX_PER_KM,p.au*AU_KM,1e-5);
    for(const m of p.moons)close(m.orbitPx,m.orbitKm*SYSTEM_PX_PER_KM);
  }
  close(sol.planets[2].moons[0].orbitKm,384400);
  assert.ok(visualRadius(12)<1); // no inflated physical disk for tiny moons
});
test('orbital tracks use the same ellipse and projection as the body positions',()=>{
  const sol=makeSystem('sol');
  for(const body of sol.planets.flatMap(p=>[p,...p.moons])){
    const days=300,o=orbitalElements(body,days),M=((o.M%TAU)+TAU)%TAU;let E=M;
    for(let i=0;i<8;i++)E-=(E-o.e*Math.sin(E)-M)/(1-o.e*Math.cos(E));
    const p=orbitPoint(body,days,E),actual=bodyPosition(body,days,sol);
    if(body.barycentricMoon){
      const companion=bodyPosition(body.moons[0],days,sol);
      p.x-=(companion.x-actual.x)*body.barycentricMoon.massFraction;
      p.y-=(companion.y-actual.y)*body.barycentricMoon.massFraction;
    }
    const host=body.kind==='moon'?bodyPosition(sol.planets.find(p=>p.id===body.parent),days,sol):{x:0,y:0};
    close(p.x+host.x,actual.x);close(p.y+host.y,actual.y);
  }
  assert.ok(orbitalElements(sol.planets[0],0).inclination>.12);
});
test('old layout migration is idempotent and preserves exploration progress',()=>{
  const sol=makeSystem('sol'),save={layoutVersion:2,days:200,ship:{x:1800,y:300},surface:{x:81,y:-95},chart:{x:420,y:90},discoveries:['sol:Earth'],log:[{name:'Earth'}],scene:'surface'};
  const retained=JSON.stringify([save.surface,save.chart,save.discoveries,save.log]);migrateLayout(save,sol);
  assert.equal(save.layoutVersion,4);assert.equal(JSON.stringify([save.surface,save.chart,save.discoveries,save.log]),retained);
  assert.ok(Math.hypot(save.ship.x,save.ship.y)>SOL_RADIUS);
  const once=JSON.stringify(save);migrateLayout(save,sol);assert.equal(JSON.stringify(save),once);
});
test('true-scale travel crosses an AU and avoids large stars without tunnelling',()=>{
  for(const radius of [SOL_RADIUS,SOL_RADIUS*5]){
    const ship={x:-orbitRadius(1),y:0},goal={x:orbitRadius(1),y:0};let closest=Infinity;
    for(let i=0;i<3000&&Math.hypot(ship.x-goal.x,ship.y-goal.y)>.1;i++){
      const aim=navigationTarget(ship,goal,radius),dx=aim.x-ship.x,dy=aim.y-ship.y,d=Math.hypot(dx,dy);
      const step=Math.min(d,travelSpeed('system',Math.hypot(ship.x-goal.x,ship.y-goal.y))*.05);
      const before={...ship};ship.x+=dx/d*step;ship.y+=dy/d*step;
      const sx=ship.x-before.x,sy=ship.y-before.y,t=Math.max(0,Math.min(1,-(before.x*sx+before.y*sy)/(sx*sx+sy*sy)));
      closest=Math.min(closest,Math.hypot(before.x+t*sx,before.y+t*sy));
    }
    assert.ok(closest>radius);assert.ok(Math.hypot(ship.x-goal.x,ship.y-goal.y)<.1);
  }
  const z=systemFitZoom(makeSystem('sol'),900,600);assert.ok(z<.001&&z>=.000001);
});
test('stellar spots stay physically small, evolve continuously and produce occasional flares',()=>{
  const star=makeSystem('sol').star,first=stellarActivity(star,0),later=stellarActivity(star,30);
  assert.notDeepEqual(first,later);
  let flareCount=0;
  for(let t=0;t<300;t++){
    const a=stellarActivity(star,t),b=stellarActivity(star,t+.01);
    a.forEach((spot,i)=>{
      assert.ok(spot.diameterKm>=0&&spot.diameterKm<=28000);
      assert.ok(Math.abs(spot.diameterKm-b[i].diameterKm)<25);
      assert.ok(Math.abs(spot.flare-b[i].flare)<.01);
      if(spot.flare>.5)flareCount++;
    });
  }
  assert.ok(flareCount>0&&flareCount<300);
});

test('coordinates are whole base-grid units, while diameters always use kilometres',()=>{
  for(const [scene,unit,suffix] of [['surface',SURFACE_UNIT,'m'],['system',SYSTEM_UNIT,'ls'],['chart',CHART_UNIT,'ly']]){
    assert.equal(formatCoordinates({x:1500.2*unit,y:-2.8*unit},scene),`X 1,500 ${suffix} · Y -3 ${suffix}`);
    assert.equal(formatCoordinates({x:-.1*unit,y:.1*unit},scene),`X 0 ${suffix} · Y 0 ${suffix}`);
  }
  assert.equal(formatDiameter(12742),'12,742 km');
  assert.equal(formatDiameter(SUN_DIAMETER_KM),'1,391,400 km');
});
test('center zoom is bounded, monotonic and smooth over astronomical zoom ranges',()=>{
  for(const from of [.000001,.85,1.3]){
    let previous=from;
    for(let i=0;i<=100;i++){const z=centerZoomAt(from,1.3,i/100);assert.ok(z>=previous-1e-12&&z<=1.3+1e-12);previous=z;}
    close(centerZoomAt(from,1.3,-1),from);close(centerZoomAt(from,1.3,2),1.3);
  }
});

test('stellar approach stays on the near side and outside the avoidance envelope',()=>{
  for(const radius of [SOL_RADIUS,SOL_RADIUS*5])for(const angle of [0,1,3,-2]){
    const ship={x:Math.cos(angle)*radius*20,y:Math.sin(angle)*radius*20};
    const goal=starApproachPoint(ship,radius);
    assert.ok(Math.hypot(goal.x,goal.y)>radius+38);
    close(Math.atan2(goal.y,goal.x),angle);
    assert.equal(navigationTarget(ship,goal,radius),goal);
    for(let i=0;i<2000&&Math.hypot(ship.x-goal.x,ship.y-goal.y)>.2;i++){
      const dx=goal.x-ship.x,dy=goal.y-ship.y,d=Math.hypot(dx,dy),step=Math.min(d,travelSpeed('system',d)*.016);
      ship.x+=dx/d*step;ship.y+=dy/d*step;assert.ok(Math.hypot(ship.x,ship.y)>radius+38);
    }
    assert.ok(Math.hypot(ship.x-goal.x,ship.y-goal.y)<=.2);
  }
});

test('tenfold visual migration preserves numerical system positions exactly once',()=>{
  const oldUnit=SYSTEM_UNIT/SYSTEM_VISUAL_SCALE;
  const save={layoutVersion:3,ship:{x:oldUnit*120,y:-oldUnit*44},surface:{x:12,y:34},chart:{x:90,y:20},route:['sol'],homePlanet:'sol:Earth'};
  migrateLayout(save,makeSystem('sol'));
  assert.equal(formatCoordinates(save.ship,'system'),'X 120 ls · Y -44 ls');
  assert.deepEqual(save.surface,{x:12,y:34});assert.deepEqual(save.chart,{x:90,y:20});
  assert.deepEqual(save.route,['sol']);assert.equal(save.homePlanet,'sol:Earth');
  const once=JSON.stringify(save);migrateLayout(save,makeSystem('sol'));assert.equal(JSON.stringify(save),once);
});
test('hyperdrive is a constant half AU per second at short and long distances',()=>{
  for(const distance of [1,SYSTEM_UNIT,orbitRadius(1),orbitRadius(30)])close(travelSpeed('system',distance)/orbitRadius(1),.5);
  close(orbitRadius(1)/travelSpeed('system',orbitRadius(1)),2);
});

test('local planet/moon transfers use orbit drive, interplanetary and star trips use hyperdrive',()=>{
  const sol=makeSystem('sol'),earth=sol.planets.find(p=>p.name==='Earth'),moon=earth.moons[0],mars=sol.planets.find(p=>p.name==='Mars');
  const p=bodyPosition(earth,0,sol);
  assert.equal(systemDrive(p,moon,sol,0,earth.id),'orbit');
  assert.equal(systemDrive(bodyPosition(moon,0,sol),earth,sol,0,moon.id),'orbit');
  assert.equal(systemDrive(p,moon,sol),'orbit');
  assert.equal(systemDrive(p,mars,sol,0,earth.id),'hyper');
  assert.equal(systemDrive(p,sol.star,sol,0,earth.id),'hyper');
  assert.equal(systemDrive(bodyPosition(mars,0,sol),moon,sol,0,mars.id),'hyper');
  const jupiter=sol.planets.find(p=>p.name==='Jupiter');
  assert.equal(systemDrive(bodyPosition(jupiter.moons[0],0,sol),jupiter.moons[1],sol,0,jupiter.moons[0].id),'orbit');
  for(const distance of [1,SYSTEM_UNIT,orbitRadius(1)])close(travelSpeed('system',distance,'orbit')/SYSTEM_UNIT,.1);
});
test('arrival completes on the integrating frame even when the destination moves away each tick',()=>{
  const p={x:0,y:0},goal={x:100,y:0};let arrived=false;
  for(let i=0;i<10&&!arrived;i++){goal.x+=2;arrived=advanceToArrival(p,goal,10,100,.2);}
  assert.equal(arrived,true);close(goal.x-p.x,10);
  const near={x:1,y:2};assert.equal(advanceToArrival(near,{x:1,y:2},0,100,.1),true);
  const far={x:0,y:0};assert.equal(advanceToArrival(far,{x:100,y:0},10,10,1),false);close(far.x,10);
});

test('camera fly starts at the current view and smoothly pans and zooms to its destination',()=>{
  const from={x:9e8,y:-3e8},to={x:0,y:0};
  for(const [a,b]of [[1.3,1e-8],[1e-8,1.3],[1,1],[1,1.00000001]]){
    assert.deepEqual(cameraViewAt(from,to,a,b,0),{zoom:a,camera:from});
    assert.deepEqual(cameraViewAt(from,to,a,b,1),{zoom:b,camera:to});
    let previous=from.x;
    for(let t=.01;t<1;t+=.01){const view=cameraViewAt(from,to,a,b,t);assert.ok(view.camera.x<=previous&&view.camera.x>=0);assert.ok(view.zoom>=Math.min(a,b)&&view.zoom<=Math.max(a,b));previous=view.camera.x;}
  }
  const early=cameraViewAt(from,to,1.3,1e-8,.01);
  assert.ok(Math.abs(from.x-early.camera.x)*early.zoom<1,'Close-up must not whip across the system');
});

test('pixel prominences grow and recede continuously within a bounded stellar envelope',()=>{
  const body=makeSystem('sol').star;let large=0,quiet=0;
  for(let t=0;t<180;t+=.1){
    const regions=stellarProminences(body,t),next=stellarProminences(body,t+.016);
    regions.forEach((r,i)=>{assert.ok(r.height>=0&&r.height<=.34);assert.ok(Math.abs(next[i].height-r.height)<.005);if(r.height>.15)large++;if(r.life===0)quiet++;});
  }
  assert.ok(large>0&&quiet>large);
});
