import test from 'node:test';
import assert from 'node:assert/strict';
import {astronautFrame,astronautSprite,paintAstronaut,paintShip,WALK_FRAMES,WALK_CYCLE_DISTANCE} from '../sprites.js';
import {updateMotion} from '../motion.js';

// A tiny recording canvas checks the renderer's world-to-screen contract without
// adding browser/runtime dependencies to the game's existing Node test suite.
function recordingContext(){
  const calls=[];
  return new Proxy({calls},{get(target,key){
    if(key in target)return target[key];
    return (...args)=>calls.push([key,...args]);
  }});
}
globalThis.document={createElement(){
  const ctx=recordingContext();return {width:0,height:0,getContext:()=>ctx,ctx};
}};

test('walk cycle completes all eight poses in either frame rate and stops in a neutral stance',()=>{
  const frames=new Set(),motion={steps:0};
  for(let i=0;i<48;i++){updateMotion(motion,1,0,1000/90);frames.add(astronautFrame(motion));}
  assert.equal(frames.size,WALK_FRAMES);
  assert.equal(motion.steps,WALK_CYCLE_DISTANCE);
  assert.equal(astronautFrame(motion),0);
  const coarse={steps:0};for(let i=0;i<12;i++)updateMotion(coarse,4,0,4000/90);
  assert.equal(astronautFrame(coarse),astronautFrame(motion));
  updateMotion(motion,0,0,16);assert.equal(astronautFrame(motion),-1);
  const slow={steps:12,moving:true},fast={steps:24,moving:true};
  assert.equal(astronautFrame(slow),2);assert.equal(astronautFrame(fast),4);
});

test('each direction has eight distinct cached poses plus idle with no clipped pixels',()=>{
  for(const direction of ['up','down','left','right']){
    const poses=Array.from({length:9},(_,i)=>astronautSprite(direction,i-1));
    assert.equal(new Set(poses.map(p=>JSON.stringify(p.ctx.calls))).size,9,direction);
    for(let i=0;i<poses.length;i++){
      assert.equal(astronautSprite(direction,i-1),poses[i]);
      for(const [method,x,y,w,h]of poses[i].ctx.calls){
        if(method!=='fillRect')continue;
        assert.ok(x>=0&&y>=0&&x+w<=32&&y+h<=40,`${direction}, frame ${i-1}: ${x},${y},${w},${h}`);
      }
    }
  }
});

test('astronaut and shadow share one proportional camera transform and fixed foot anchor',()=>{
  for(const zoom of [.65,1,1.3,2.4]){
    const ctx=recordingContext();paintAstronaut(ctx,100,200,{direction:'down'},zoom);
    assert.deepEqual(ctx.calls.find(c=>c[0]==='translate'),['translate',100,200]);
    assert.deepEqual(ctx.calls.find(c=>c[0]==='scale'),['scale',1.25*zoom,1.25*zoom]);
    const scaleIndex=ctx.calls.findIndex(c=>c[0]==='scale');
    assert.ok(scaleIndex<ctx.calls.findIndex(c=>c[0]==='fillRect'));
    assert.deepEqual(ctx.calls.find(c=>c[0]==='drawImage').slice(2),[-16,-37]);
    assert.equal(ctx.calls.at(-1)[0],'restore');
  }
});

test('ships and engine plumes scale with the camera in all scenes without a size floor',()=>{
  for(const [size,parked]of [[42,false],[36,false],[62,true]])for(const zoom of [.025,.34,.65,1,2.4]){
    const ctx=recordingContext();paintShip(ctx,100,200,{heading:1,thrust:1},0,size,parked,zoom);
    assert.deepEqual(ctx.calls.find(c=>c[0]==='scale'),['scale',size/40*zoom,size/40*zoom]);
    assert.equal(ctx.calls.filter(c=>c[0]==='fillRect').length,parked?0:6);
    assert.equal(ctx.calls.at(-1)[0],'restore');
  }
});
