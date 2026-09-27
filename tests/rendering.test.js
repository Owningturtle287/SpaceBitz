import test from 'node:test';
import assert from 'node:assert/strict';
import {canvasContextOptions,ellipseInView,circleGeometry,clipSegment,fillAnnulus,drawImageInView,clearFrame,backgroundPosition} from '../rendering.js';

test('WebKit, including iOS browsers, uses the verified first-frame canvas path',()=>{
  for(const ua of ['AppleWebKit/605.1.15 Version/18 Safari/605.1.15','AppleWebKit/605.1.15 CriOS/145 Mobile','AppleWebKit/605.1.15 FxiOS/144 Mobile']){
    assert.deepEqual(canvasContextOptions(ua),{alpha:false,willReadFrequently:true});
  }
  for(const ua of ['AppleWebKit/537.36 Chrome/145 Safari/537.36','AppleWebKit/537.36 Chromium/145','Gecko/20100101 Firefox/145']){
    assert.deepEqual(canvasContextOptions(ua),{alpha:false,willReadFrequently:false});
  }
});

test('million-pixel orbits produce only bounded visible paths at every zoom',()=>{
  for(const radius of [20,400,400000,50000000]){
    const paths=ellipseInView(circleGeometry(450-radius,300,radius),900,600);
    assert.ok(paths.length>0);
    const points=paths.flat();assert.ok(points.length<520);
    for(const p of points){
      assert.ok(p.x>=-3&&p.x<=903&&p.y>=-3&&p.y<=603);
      assert.ok(Math.abs(Math.hypot(p.x-(450-radius),p.y-300)-radius)<.01);
    }
  }
  assert.deepEqual(ellipseInView(circleGeometry(450,300,50000000),900,600),[]);
  assert.deepEqual(ellipseInView(circleGeometry(-50000000,0,40),900,600),[]);
});
test('projected ellipses are clipped without dropping visible arcs',()=>{
  const paths=ellipseInView({x:450,y:300,ux:450,uy:180,vx:-100,vy:220},900,600);
  assert.ok(paths.flat().length>20);
  for(const p of paths.flat())assert.ok(p.x>=-3&&p.x<=903&&p.y>=-3&&p.y<=603);
});
test('dash generation never receives an offscreen interplanetary route',()=>{
  assert.deepEqual(clipSegment({x:-1e8,y:20},{x:1e8,y:20},900,600,0),[{x:0,y:20},{x:900,y:20}]);
  assert.equal(clipSegment({x:-1e8,y:-20},{x:1e8,y:-20},900,600,0),null);
});
test('zone shading fills only the viewport, even inside a huge annulus',()=>{
  const rects=[],ctx={fillRect:(...r)=>rects.push(r)};
  fillAnnulus(ctx,-400000,0,300000,500000,900,600);
  assert.deepEqual(rects,[[0,0,900,600]]);
  rects.length=0;fillAnnulus(ctx,-400000,0,500000,600000,900,600);assert.equal(rects.length,0);
  fillAnnulus(ctx,0,0,200,400,900,600);
  for(const [x,y,w,h]of rects)assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=900&&y+h<=600);
});
test('zoomed textures crop their source and destination before rasterization',()=>{
  const calls=[],ctx={drawImage:(...args)=>calls.push(args)},image={width:80,height:80};
  drawImageInView(ctx,image,-100000,-100000,200000,200000,900,600);
  assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(5),[0,0,900,600]);
  assert.ok(calls[0][3]<1&&calls[0][4]<1);
  drawImageInView(ctx,image,1000,0,200000,200000,900,600);assert.equal(calls.length,1);
});
test('frame clearing resets compositing and opacity before painting opaque space',()=>{
  const calls=[],ctx={resetTransform:()=>{},setTransform:(...args)=>calls.push(args),setLineDash:()=>{},fillRect:(...args)=>calls.push(args),globalAlpha:.1,globalCompositeOperation:'lighter',shadowBlur:50};
  clearFrame(ctx,900,600,2);
  assert.equal(ctx.globalAlpha,1);assert.equal(ctx.globalCompositeOperation,'source-over');assert.equal(ctx.shadowBlur,0);
  assert.equal(ctx.fillStyle,'#000104');assert.deepEqual(calls,[[2,0,0,2,0,0],[0,0,900,600]]);
});
test('background drift depends only on star, time and viewport',()=>{
  const star={x:.2,y:.4,speed:1},p=backgroundPosition(star,1000,1000,600);
  assert.deepEqual(p,{x:204,y:240.88});
  assert.deepEqual(backgroundPosition(star,100000,1000,600,false),{x:200,y:240});
  assert.deepEqual(backgroundPosition({...star,camera:{x:1e9,y:-1e9}},1000,1000,600),p);
});
