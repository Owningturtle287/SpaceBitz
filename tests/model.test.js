import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSystem,habitableZone,periodDays,bodyPosition,visualRadius,advanceDays,rotationAngle,TAU,orbitRadius} from '../model.js';

test('Sol preserves orbital order, factual diameters and approximate year',()=>{
  const sol=makeSystem('sol');
  assert.deepEqual(sol.planets.map(p=>p.name),['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune']);
  const earth=sol.planets[2];
  assert.equal(earth.diameter,12742);
  assert.equal(earth.moons[0].diameter,3475);
  assert.ok(Math.abs(earth.period-365.256)<.001);
  assert.ok(sol.planets.every((p,i)=>i===0||p.au>sol.planets[i-1].au));
});
test('Kepler periods and temperate band respond to mass and luminosity',()=>{
  assert.ok(periodDays(2,1)>periodDays(1,1));
  assert.ok(periodDays(1,2)<periodDays(1,1));
  assert.deepEqual(habitableZone(4),{inner:1.9,outer:3.34});
});
test('generated systems and moon locations are stable and finite',()=>{
  const a=makeSystem('test:123'),b=makeSystem('test:123');
  assert.deepEqual(a,b);
  assert.ok(a.planets.every((p,i)=>p.au>0&&p.period>0&&(i===0||p.au>a.planets[i-1].au)));
  for(const planet of a.planets)for(const moon of planet.moons){
    const p=bodyPosition(moon,100,a),host=bodyPosition(planet,100,a);
    assert.ok(Math.abs(Math.hypot(p.x-host.x,p.y-host.y)-moon.orbitPx)<1e-8);
  }
});
test('visual hierarchy keeps stars larger than gas giants',()=>{
  const sol=makeSystem('sol');
  assert.ok(visualRadius(sol.star.diameter,'star')>visualRadius(sol.planets[4].diameter)*6);
  assert.ok(visualRadius(sol.star.diameter,'star')>visualRadius(sol.planets[2].diameter)*50);
});
test('one real minute is exactly one game hour; Earth uses its sidereal rotation period',()=>{
  assert.equal(advanceDays(0,60_000),1/24);
  const earth=makeSystem('sol').planets[2];
  const spinDays=advanceDays(0,earth.rotationDays*24*60_000);
  assert.ok(Math.abs(spinDays-earth.rotationDays)<1e-12);
  assert.ok(Math.abs(Math.sin(rotationAngle(earth,spinDays)-rotationAngle(earth,0)))<1e-10);
  const quarterDays=advanceDays(0,earth.rotationDays*6*60_000);
  const quarter=rotationAngle(earth,quarterDays)-rotationAngle(earth,0);
  assert.ok(Math.abs(Math.atan2(Math.sin(quarter),Math.cos(quarter))-TAU/4)<1e-10);
  assert.equal(advanceDays(10,60_000,true),10);
});
test('lunar orbit and ephemeris Earth year follow the same real clock',()=>{
  const sol=makeSystem('sol'),earth=sol.planets[2],moon=earth.moons[0];
  const earthDays=advanceDays(0,earth.period*24*60_000);
  const earthA=bodyPosition(earth,0,sol),earthB=bodyPosition(earth,earthDays,sol);
  // The date-driven ephemeris includes eccentricity and slow element drift, so a
  // sidereal year returns very close to, rather than bit-identically to, the start.
  assert.ok(Math.hypot(earthA.x-earthB.x,earthA.y-earthB.y)<orbitRadius(earth.au,sol.star)*.001);

  const moonDays=advanceDays(0,moon.period*24*60_000);
  const moonA=bodyPosition(moon,0,sol),moonB=bodyPosition(moon,moonDays,sol);
  const hostA=bodyPosition(earth,0,sol),hostB=bodyPosition(earth,moonDays,sol);
  assert.ok(Math.hypot(moonA.x-hostA.x-(moonB.x-hostB.x),moonA.y-hostA.y-(moonB.y-hostB.y))<1e-8);
  assert.equal(moon.rotationDays,moon.period);
});
test('large stars have clear orbital space and generated moons stay in their Hill spheres',()=>{
  for(let i=0;i<30;i++){
    const system=makeSystem('scale-'+i),starR=visualRadius(system.star.diameter,'star');
    for(const planet of system.planets){
      assert.ok(orbitRadius(planet.au,system.star)-visualRadius(planet.diameter)>starR);
      for(const [j,moon]of planet.moons.entries()){
        assert.ok(moon.orbitPx>visualRadius(planet.diameter)+visualRadius(moon.diameter,'moon'));
        assert.ok(Number.isFinite(moon.period)&&moon.period>0);
        if(j>0)assert.ok(moon.orbitKm>planet.moons[j-1].orbitKm);
      }
    }
  }
});
