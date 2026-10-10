import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createTerrainSampler} from '../src/rendering/terrain.js';
import {makeSystem} from '../src/universe/model.js';
import {turnToward,updateMotion,navigationTarget} from '../src/flight/motion.js';
import {normalizeSettings} from '../src/core/settings.js';

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
  assert.equal('speed' in value,false);assert.equal(value.volume,1);assert.equal(value.joyX,8);assert.equal(value.controls,'auto');assert.equal('units' in value,false);
});
test('the complete runtime dependency graph is cached at its nested paths',()=>{
  const root=new URL('../',import.meta.url),sw=readFileSync(new URL('sw.js',root),'utf8');
  const shell=sw.match(/const SHELL=\[([^\]]+)\]/)[1].match(/'([^']+)'/g).map(s=>s.slice(1,-1));
  const cached=new Set(shell.map(path=>new URL(path,root).href));
  for(const path of shell)assert.ok(existsSync(new URL(path,root)),path);
  const visited=new Set(),queue=[new URL('src/main.js',root)];
  while(queue.length){
    const file=queue.pop();if(visited.has(file.href))continue;visited.add(file.href);
    assert.ok(cached.has(file.href),file.href+' not cached');
    const source=readFileSync(file,'utf8');
    for(const [,spec] of source.matchAll(/from ['"]([^'"]+)['"]/g)){
      const dependency=new URL(spec,file);assert.ok(cached.has(dependency.href),dependency.href+' not cached');queue.push(dependency);
    }
  }
  assert.equal(visited.size,shell.filter(path=>path.endsWith('.js')).length,'Unused runtime modules must not be shipped');
  for(const path of shell.filter(path=>path.endsWith('.css'))){
    const file=new URL(path,root),source=readFileSync(file,'utf8');
    for(const [,spec] of source.matchAll(/url\(['"]([^'"]+)['"]\)/g))if(!spec.startsWith('data:'))assert.ok(cached.has(new URL(spec,file).href),spec+' not cached');
  }
});

test('grid starts hidden for new and legacy preferences and remembers an explicit choice',()=>{
  assert.equal(normalizeSettings().showGrid,false);
  assert.equal(normalizeSettings({version:7}).showGrid,false);
  assert.equal(normalizeSettings({showGrid:true}).showGrid,true);
  assert.equal(normalizeSettings({showGrid:false}).showGrid,false);
});

test('device sizing preferences migrate safely, bound dimensions and keep resize arrows opt-in',()=>{
  const legacy=normalizeSettings({version:10});
  assert.equal(legacy.dashboardHeight,68);assert.equal(legacy.terminalWidthScale,100);assert.equal(legacy.terminalHeightScale,100);
  assert.equal(legacy.dashboardResizeHandle,false);assert.equal(legacy.terminalResizeHandles,false);
  assert.equal(normalizeSettings({version:11,dashboardHeight:80}).dashboardHeight,68);
  assert.equal(normalizeSettings({version:11,dashboardHeight:180}).dashboardHeight,180);
  assert.equal(normalizeSettings({version:12,dashboardHeight:74}).dashboardHeight,68);
  assert.equal(normalizeSettings({version:13,dashboardHeight:74}).dashboardHeight,74);
  assert.equal(normalizeSettings({version:12,dashboardHeight:80}).dashboardHeight,80);
  const saved=normalizeSettings({dashboardHeight:180,terminalWidthScale:125,terminalHeightScale:80,dashboardResizeHandle:true,terminalResizeHandles:true});
  assert.equal(saved.dashboardHeight,180);assert.equal(saved.terminalWidthScale,125);assert.equal(saved.terminalHeightScale,80);
  assert.equal(saved.dashboardResizeHandle,true);assert.equal(saved.terminalResizeHandles,true);
  const invalid=normalizeSettings({dashboardHeight:999,terminalWidthScale:NaN,terminalHeightScale:-3,dashboardResizeHandle:'true'});
  assert.equal(invalid.dashboardHeight,260);assert.equal(invalid.terminalWidthScale,100);assert.equal(invalid.terminalHeightScale,40);assert.equal(invalid.dashboardResizeHandle,false);
});
