import test from 'node:test';
import assert from 'node:assert/strict';
import {viewportSize,gamePoint} from '../src/core/viewport.js';
import {cameraRectangles,cameraFit,IPHONE14_CAMERA} from '../src/ui/camera-layout.js';
import {overlaps} from '../src/ui/hud.js';

test('iPhone 14 local camera profile follows the official drawing without shrinking the viewport',()=>{
  assert.equal(IPHONE14_CAMERA.span,Math.ceil(26.79/64.58*390));assert.equal(IPHONE14_CAMERA.depth,Math.ceil(5.58/64.58*390));
  const v=viewportSize(844,390),areas=cameraRectangles(v,{left:47,right:47},{iphone:true,screenShort:390,legacyAngle:90});
  assert.equal(v.width,844);assert.equal(v.height,390);assert.equal(v.left,0);assert.equal(v.top,0);
  assert.deepEqual(areas,[{x:0,y:108,width:53,height:174,side:'left'}]);
  assert.deepEqual(gamePoint({clientX:120,clientY:60},v),{x:120,y:60});
});
test('legacy and modern phone orientations select the correct camera side',()=>{
  const v=viewportSize(844,390),safe={left:47,right:47};
  for(const device of [{legacyAngle:90},{angle:270}])assert.equal(cameraRectangles(v,safe,device)[0].x,0);
  for(const device of [{legacyAngle:-90},{angle:90}])assert.equal(cameraRectangles(v,safe,device)[0].x,791);
  assert.equal(cameraRectangles(v,safe).length,2);
});
test('portrait fallback rotates only the camera obstacle, preserving full-screen input axes',()=>{
  const v=viewportSize(390,844),areas=cameraRectangles(v,{top:47},{screenShort:390});
  assert.equal(v.width,844);assert.equal(v.height,390);
  assert.deepEqual(areas,[{x:0,y:108,width:53,height:174,side:'top'}]);
  assert.deepEqual(gamePoint({clientX:330,clientY:120},v),{x:120,y:60});
});
test('unobstructed panels stay intact while intersecting panels gain a local curved recess',()=>{
  const areas=cameraRectangles(viewportSize(844,390),{left:47});
  assert.equal(cameraFit({x:3,y:3,width:287,height:85},areas),null);
  assert.equal(cameraFit({x:577,y:116,width:264,height:271},areas),null);
  const fit=cameraFit({x:3,y:87,width:287,height:230},areas);
  assert.equal(fit.side,'left');assert.equal(fit.depth,50);assert.match(fit.clip,/Q/);assert.match(fit.contour,/Q/);
  assert.equal(overlaps({x:3+fit.depth+2,y:108,width:200,height:170},areas[0],0),false);
  const right=cameraFit({x:577,y:116,width:264,height:271},cameraRectangles(viewportSize(844,390),{right:47}));
  assert.equal(right.side,'right');assert.equal(right.depth,50);assert.match(right.clip,/H0 V0 Z$/);
});
test('phone fallback and browser-chrome uncertainty remain local to the camera',()=>{
  const areas=cameraRectangles(viewportSize(844,320),{}, {iphone:true,screenShort:390,legacyAngle:-90});
  assert.equal(areas.length,1);assert.equal(areas[0].width,40);assert.equal(areas[0].height,244);
  assert.equal(cameraRectangles(viewportSize(844,390),{},{}).length,0);
});
test('zoom compensation retains the same camera guard in game coordinates',()=>{
  const v=viewportSize(844,390,{width:422,height:195,scale:2,offsetLeft:40,offsetTop:20});
  assert.deepEqual(cameraRectangles(v,{left:47},{screenShort:390}),cameraRectangles(viewportSize(844,390),{left:47},{screenShort:390}));
});
