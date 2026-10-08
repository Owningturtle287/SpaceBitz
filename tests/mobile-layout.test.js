import test from 'node:test';
import assert from 'node:assert/strict';
import {landscapeSize,gamePoint} from '../viewport.js';
import {recordTravel} from '../navigation.js';
import {logCategory} from '../voyage-log.js';
import {makeSystem,bodyPosition} from '../model.js';
import {terminalLines} from '../terminal.js';
import {formatDistance} from '../scale.js';

test('landscape layout and pointer coordinates stay coherent after physical rotation',()=>{
  assert.deepEqual(landscapeSize(844,390),{width:844,height:390,rotated:false});
  assert.deepEqual(landscapeSize(390,844),{width:844,height:390,rotated:true});
  const normal={physicalWidth:844,left:4,top:8,rotated:false};
  const rotated={physicalWidth:390,left:4,top:8,rotated:true};
  assert.deepEqual(gamePoint({clientX:124,clientY:68},normal),{x:120,y:60});
  assert.deepEqual(gamePoint({clientX:334,clientY:128},rotated),{x:120,y:60});
});
test('the first travel leg connects its departure, without duplicate arrivals or unbounded history',()=>{
  const save={route:[]};recordTravel(save,'home','first');assert.deepEqual(save.route,['home','first']);
  recordTravel(save,'first','first');assert.deepEqual(save.route,['home','first']);
  recordTravel(save,'first','second');assert.deepEqual(save.route,['home','first','second']);
  const old={};recordTravel(old,'already-away','next');assert.deepEqual(old.route,['already-away','next']);
  for(let i=0;i<45;i++)recordTravel(save,'second','star-'+i);
  assert.equal(save.route.length,40);assert.equal(save.route.at(-1),'star-44');
});
test('object filters exclude status events even with categories saved by older releases',()=>{
  for(const category of ['star','planet','moon']){
    assert.equal(logCategory({category,name:'Body',action:'Entered system'}),'status');
    assert.equal(logCategory({kind:'action',category,name:'Body',action:'First landing'}),'status');
    assert.equal(logCategory({kind:'object',category,type:'Body'}),category);
  }
  assert.equal(logCategory({kind:'action',action:'Sample collected'}),'item');
});
test('host distances use current orbital positions and the correct parent',()=>{
  const system=makeSystem('sol'),planet=system.planets.find(p=>p.name==='Earth'),moon=planet.moons.find(m=>m.name==='Moon');
  for(const days of [0,137])for(const [body,host,label]of [[planet,system.star,'HOST STAR'],[moon,planet,'HOST PLANET']]){
    const p=bodyPosition(body,days,system),h=bodyPosition(host,days,system);
    const expected=formatDistance(Math.hypot(p.x-h.x,p.y-h.y),'system'),data=terminalLines(body,system,{days});
    assert.ok(data.includes((body.parent?'HOST':label)+' : '+host.name));assert.ok(data.includes('DISTANCE FROM '+label+' : '+expected));
  }
});
