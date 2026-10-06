import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinateHeading,isCoordinateDoubleTap} from '../target-ui.js';

test('space and surface confirmation requires two nearby taps in the same scene and time window',()=>{
  const first={x:100,y:200,scene:'system',time:1000};
  assert.equal(isCoordinateDoubleTap(null,first),false);
  assert.equal(isCoordinateDoubleTap(first,{...first,x:112,y:205,time:1250}),true);
  assert.equal(isCoordinateDoubleTap(first,{...first,time:1500}),true);
  const surface={...first,scene:'surface'};
  assert.equal(isCoordinateDoubleTap(surface,{...surface,time:1200}),true);
  assert.equal(isCoordinateDoubleTap(surface,{...first,time:1200}),false);
  for(const next of [{...first,time:1501},{...first,time:999},{...first,x:140},{...first,scene:'chart'}])assert.equal(isCoordinateDoubleTap(first,next),false);
});

test('coordinate arrow follows travel vectors in every quadrant and after ship movement',()=>{
  for(const ship of [{x:0,y:0},{x:152,y:-230}])for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0],[3,-4],[-3,-4],[3,4],[-3,4]]){
    const angle=coordinateHeading(ship,{x:ship.x+dx,y:ship.y+dy})*Math.PI/180,length=Math.hypot(dx,dy);
    assert.ok(Math.abs(Math.sin(angle)-dx/length)<1e-12);
    assert.ok(Math.abs(-Math.cos(angle)-dy/length)<1e-12);
  }
  const p={x:12,y:34};
  assert.equal(coordinateHeading(p,p),0);
  assert.equal(coordinateHeading(p,p,Math.PI/2),180);
});

test('moving target keeps its side until it reaches an obstruction',async()=>{
  const {contextPosition}=await import('../target-ui.js'),size={width:100,height:50},viewport={width:800,height:600};
  let target={x:400,y:40},previous=contextPosition(target,12,size,viewport);
  assert.equal(previous.side,1);
  for(let y=41;y<180;y+=.25){const next=contextPosition({x:400,y},12,size,viewport,[],previous);assert.equal(next.side,1);assert.ok(Math.abs(next.x-previous.x)<1e-9);assert.ok(Math.abs(next.y-previous.y-.25)<1e-9||y===41);previous=next;}
  const obstructed=contextPosition({x:400,y:180},12,size,viewport,[{x:420,y:140,width:130,height:80}],previous);
  assert.notEqual(obstructed.side,1);
  assert.ok(obstructed.x>=8&&obstructed.x+100<=792&&obstructed.y>=8&&obstructed.y+50<=592);
});


test('an extreme-zoom fallback returns beside the object when the object fits again',async()=>{
  const {contextPosition}=await import('../target-ui.js'),size={width:100,height:50},viewport={width:800,height:600};
  const far=contextPosition({x:400,y:300},2000,size,viewport);assert.equal(far.side,-1);
  const nearby=contextPosition({x:400,y:300},12,size,viewport,[],far);
  assert.equal(nearby.side,0);assert.equal(nearby.y,226);
});
