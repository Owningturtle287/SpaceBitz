import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createTerrainSampler} from '../terrain.js';
import {makeSystem} from '../model.js';
import {turnToward,updateMotion,navigationTarget} from '../motion.js';
import {normalizeSettings} from '../settings.js';

test('terrain is deterministic, continuous at chunk edges, and has a dry landing site',()=>{
  const body=makeSystem('sol').planets[2],a=createTerrainSampler(body),b=createTerrainSampler(body);
  for(const [x,y]of [[0,0],[191.99,300],[-192,500],[3000,-70]])assert.deepEqual(a(x,y),b(x,y));
  for(const y of [-1000,-192,0,192,1000])assert.ok(Math.abs(a(191.999,y).height-a(192.001,y).height)<.0001);
  assert.equal(a(0,0).water,false);
  const samples=Array.from({length:80},(_,i)=>a(i*89-3200,i*37).height);
  assert.ok(Math.max(...samples)-Math.min(...samples)>.15);
});
test('ships turn the short way and walking frames only advance on movement',()=>{
  const angle=turnToward(Math.PI-.1,-Math.PI+.1,100);
  assert.ok(angle>Math.PI-.1&&angle<Math.PI+.1);
  const motion={heading:0,steps:0,thrust:0};updateMotion(motion,0,-10,100);
  assert.equal(motion.direction,'up');assert.equal(motion.steps,10);assert.ok(motion.heading<0);assert.ok(motion.thrust>0);
  updateMotion(motion,0,0,500);assert.equal(motion.moving,false);assert.equal(motion.steps,10);assert.ok(motion.thrust<.01);
});
test('autopilot can cross a system while avoiding the enlarged star',()=>{
  const ship={x:-2000,y:0},goal={x:2000,y:0};let closest=Infinity;
  for(let i=0;i<1500&&Math.hypot(ship.x-goal.x,ship.y-goal.y)>10;i++){
    const aim=navigationTarget(ship,goal,700),dx=aim.x-ship.x,dy=aim.y-ship.y,d=Math.hypot(dx,dy),step=Math.min(d,8);
    ship.x+=dx/d*step;ship.y+=dy/d*step;closest=Math.min(closest,Math.hypot(ship.x,ship.y));
  }
  assert.ok(closest>700);assert.ok(Math.hypot(ship.x-goal.x,ship.y-goal.y)<10);
});
test('old time-speed settings cannot restore accelerated orbits',()=>{
  const value=normalizeSettings({speed:30,volume:4,joyX:-10,controls:'mobile',units:'mi'});
  assert.equal('speed' in value,false);assert.equal(value.volume,1);assert.equal(value.joyX,8);assert.equal(value.controls,'auto');assert.equal(value.units,'mi');
});
test('every offline shell entry and module dependency exists',()=>{
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  const shell=sw.match(/const SHELL=\[([^\]]+)\]/)[1].match(/'([^']+)'/g).map(s=>s.slice(1,-1));
  for(const path of shell)assert.ok(existsSync(new URL('../'+path,import.meta.url)),path);
  for(const file of ['main.js','celestial.js','terrain.js']){
    const text=readFileSync(new URL('../'+file,import.meta.url),'utf8');
    for(const match of text.matchAll(/from '(.+?)'/g))assert.ok(shell.includes(match[1]),match[1]+' not cached');
  }
});
