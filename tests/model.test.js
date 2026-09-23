import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSystem,habitableZone,periodDays,bodyPosition,visualRadius} from '../model.js';

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
  assert.ok(visualRadius(sol.star.diameter,'star')>visualRadius(sol.planets[4].diameter));
});
