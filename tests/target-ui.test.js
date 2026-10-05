import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinateHeading} from '../target-ui.js';

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
