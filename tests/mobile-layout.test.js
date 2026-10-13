import test from 'node:test';
import assert from 'node:assert/strict';
import {landscapeSize,gamePoint,viewportSize} from '../src/core/viewport.js';
import {recordTravel} from '../src/flight/navigation.js';
import {logCategory} from '../src/journal/voyage-log.js';
import {makeSystem,bodyPosition} from '../src/universe/model.js';
import {terminalLines} from '../src/terminal/terminal.js';
import {formatDistance} from '../src/core/scale.js';

test('landscape layout and pointer coordinates stay coherent after physical rotation',()=>{
  assert.deepEqual(landscapeSize(844,390),{width:844,height:390,rotated:false});
  assert.deepEqual(landscapeSize(390,844),{width:844,height:390,rotated:true});
  const normal={physicalWidth:844,left:4,top:8,rotated:false};
  const rotated={physicalWidth:390,left:4,top:8,rotated:true};
  assert.deepEqual(gamePoint({clientX:124,clientY:68},normal),{x:120,y:60});
  assert.deepEqual(gamePoint({clientX:334,clientY:128},rotated),{x:120,y:60});
});
test('browser focus zoom and pan preserve the whole landscape surface and input axes',()=>{
  for(const [width,height]of [[844,390],[390,844]]){
    const v=viewportSize(width,height,{width:width/2,height:height/2,scale:2,offsetLeft:110,offsetTop:70});
    assert.equal(v.width,844);assert.equal(v.height,390);assert.equal(v.scale,2);
    const clientX=v.left+(v.rotated?v.physicalWidth-60:120)/2,clientY=v.top+(v.rotated?120:60)/2;
    assert.deepEqual(gamePoint({clientX,clientY},v),{x:120,y:60});
  }
  // Keyboard occlusion and toolbar changes still reduce the available area.
  assert.equal(viewportSize(844,390,{width:844,height:210,scale:1}).height,210);
  assert.deepEqual(viewportSize(844,390),{width:844,height:390,rotated:false,physicalWidth:844,physicalHeight:390,left:0,top:0,scale:1});
});
test('cutouts inset the entire landscape surface on either physical side',()=>{
  for(const safe of [{left:47,bottom:21},{right:47,bottom:21},{left:47,right:47,bottom:21}]){
    const v=viewportSize(844,390,undefined,safe);
    assert.equal(v.width,844-(safe.left||0)-(safe.right||0));assert.equal(v.height,369);
    assert.equal(v.left,safe.left||0);assert.equal(v.top,0);
    assert.deepEqual(gamePoint({clientX:v.left+120,clientY:v.top+60},v),{x:120,y:60});
  }
});
test('portrait cutouts and home indicators rotate with the same rendering and input origin',()=>{
  const v=viewportSize(390,844,undefined,{top:47,bottom:34});
  assert.equal(v.width,763);assert.equal(v.height,390);assert.equal(v.rotated,true);
  assert.equal(v.left,0);assert.equal(v.top,47);
  assert.deepEqual(gamePoint({clientX:v.left+v.physicalWidth-60,clientY:v.top+120},v),{x:120,y:60});
});
test('cutout avoidance composes with browser zoom, pan and keyboard occlusion',()=>{
  const v=viewportSize(844,390,{width:422,height:195,scale:2,offsetLeft:110,offsetTop:70},{left:47,right:47,bottom:21});
  assert.equal(v.width,750);assert.equal(v.height,369);assert.equal(v.left,133.5);assert.equal(v.top,70);
  assert.deepEqual(gamePoint({clientX:v.left+60,clientY:v.top+30},v),{x:120,y:60});
  assert.equal(viewportSize(844,390,{width:844,height:210,scale:1},{left:47,bottom:21}).height,189);
  assert.deepEqual(viewportSize(844,390,undefined,{left:0,right:0,top:0,bottom:0}),viewportSize(844,390));
});
test('invalid or excessive device insets cannot create negative viewport dimensions',()=>{
  const v=viewportSize(844,390,undefined,{left:NaN,right:-10,top:Infinity,bottom:9999});
  assert.equal(v.physicalWidth,844);assert.equal(v.physicalHeight,1);
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
