import {hash,TAU,rotationAngle} from './model.js';
import {noise} from './terrain.js';
import {drawImageInView} from './rendering.js';
const unit=seed=>(hash(seed)%1000000)/1000000;
const cache=new Map(),FPS=6;
const smooth=x=>x*x*(3-2*x);
export function chartBrightness(seed,seconds){
  const phase=unit(seed)*TAU;
  return .9+.045*Math.sin(seconds*.61+phase)+.025*Math.sin(seconds*1.13+phase*3)+.015*Math.sin(seconds*.23+phase*7);
}
const spheres=new Map();
function sphere(size){
  if(spheres.has(size))return spheres.get(size);
  const points=[];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=(x+.5-size/2)/(size/2),ny=(y+.5-size/2)/(size/2),r2=nx*nx+ny*ny;
    if(r2<=1)points.push((y*size+x)*4,nx,ny,Math.sqrt(1-r2));
  }
  const result=new Float32Array(points);spheres.set(size,result);return result;
}
export function stellarActivity(body,seconds){
  return Array.from({length:7},(_,i)=>{
    const seed=body.id+':activity:'+i,cycle=95+unit(seed)*100;
    const age=((seconds/cycle+unit(seed+':phase'))%1+1)%1;
    const envelope=age<.78?Math.sin(Math.PI*age/.78)**2:0;
    const flareCycle=46+unit(seed+':flare')*39;
    const flareAge=((seconds+unit(seed+':offset')*flareCycle)%flareCycle+flareCycle)%flareCycle;
    const duration=6+unit(seed+':duration')*3;
    return {longitude:unit(seed+':lon')*TAU,latitude:(unit(seed+':lat')-.5)*.9,
      // Typical small active-region spots, in km; never giant dark hemispheres.
      diameterKm:(4000+unit(seed+':size')*24000)*envelope,
      life:envelope,flare:flareAge<duration?Math.sin(Math.PI*flareAge/duration)**2:0};
  });
}
function makeFrame(body,seconds,rotation,SIZE){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;
  const g=canvas.getContext('2d'),image=g.createImageData(SIZE,SIZE),seed=hash(body.id);
  const base=body.color.match(/\w\w/g).map(h=>parseInt(h,16));
  const points=sphere(SIZE),angle=rotation+seconds*.008,ca=Math.cos(angle),sa=Math.sin(angle),drift=seconds*.045;
  // Rotating spherical coordinates and mixed projections avoid diagonal bands.
  for(let i=0;i<points.length;i+=4){
    const p=points[i],nx=points[i+1],ny=points[i+2],nz=points[i+3];
    const sx=nx*ca+nz*sa,sz=nz*ca-nx*sa;
    const warp=noise(sx*6+drift*.18,ny*6+sz*3,seed)-.5;
    const flow=(noise(sx*17+sz*9+warp+drift,ny*17-drift*.31,seed+3)+noise(ny*19+sz*7,sz*17+sx*5-drift*.45,seed+7))*.5;
    const fine=noise(sx*49+sz*21-drift*.7,ny*49+sz*13+drift*.6,seed+11);
    const granule=Math.pow(flow,.7),channels=Math.max(0,.43-flow)*.8;
    const shade=(.59+granule*.52+fine*.16-channels)*(.7+.3*nz);
    const heat=Math.max(0,flow-.59)*75;
    for(let k=0;k<3;k++)image.data[p+k]=Math.min(255,base[k]*shade+heat+(k===0?10:0));
    image.data[p+3]=255;
  }
  g.putImageData(image,0,0);
  g.save();g.beginPath();g.arc(SIZE/2,SIZE/2,SIZE/2,0,TAU);g.clip();
  for(const spot of stellarActivity(body,seconds)){
    const lon=spot.longitude-rotation-seconds*.008*(1-.24*Math.sin(spot.latitude)**2);
    const depth=Math.cos(lon)*Math.cos(spot.latitude);if(depth<=0||spot.life<.03)continue;
    const x=SIZE/2+Math.sin(lon)*Math.cos(spot.latitude)*SIZE/2,y=SIZE/2+Math.sin(spot.latitude)*SIZE/2;
    const r=spot.diameterKm/body.diameter*SIZE/2;
    g.globalAlpha=spot.life*.64;g.fillStyle='#67382c';g.beginPath();g.ellipse(x,y,r*Math.max(.15,depth),r,0,0,TAU);g.fill();
    g.globalAlpha=spot.life*.85;g.fillStyle='#241e29';g.beginPath();g.ellipse(x,y,r*.45*Math.max(.15,depth),r*.45,0,0,TAU);g.fill();
  }
  g.restore();return canvas;
}
export function paintStellarSurface(ctx,body,x,y,r,seconds,days,reducedMotion=false,width=ctx.canvas.width,height=ctx.canvas.height){
  if(r<1||x+r<0||x-r>width||y+r<0||y-r>height)return;
  const t=reducedMotion?0:seconds,rotation=reducedMotion?0:rotationAngle(body,days);
  const size=r<80?64:128,tick=Math.floor(t*FPS),key=`${body.id}:${size}:${reducedMotion}`;
  let pair=cache.get(key);
  if(!pair||pair.tick!==tick){
    const current=pair?.tick===tick-1?pair.next:makeFrame(body,tick/FPS,rotation,size);
    pair={tick,current,next:reducedMotion?current:makeFrame(body,(tick+1)/FPS,rotation,size)};
    cache.set(key,pair);if(cache.size>4)cache.delete(cache.keys().next().value);
  }
  ctx.save();ctx.imageSmoothingEnabled=false;
  drawImageInView(ctx,pair.current,x-r,y-r,r*2,r*2,width,height);
  ctx.globalAlpha=smooth(t*FPS-tick);
  if(ctx.globalAlpha>0)drawImageInView(ctx,pair.next,x-r,y-r,r*2,r*2,width,height);
  ctx.restore();
  if(reducedMotion)return;
  // Low, breathing tongues of plasma around the limb. Skip giant offscreen
  // disks instead of submitting unbounded geometry at extreme zoom.
  if(r>=10&&r<Math.max(width,height)*2){
    ctx.save();ctx.strokeStyle=body.color;ctx.lineWidth=Math.min(3,Math.max(.6,r*.003));
    for(let i=0;i<18;i++){
      const a=i*TAU/18+unit(body.id+':rim:'+i)*.14,life=.5+.5*Math.sin(t*.38+i*2.4);
      const reach=r*(.016+.028*life),px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;
      if(px<-reach||px>width+reach||py<-reach||py>height+reach)continue;
      ctx.globalAlpha=.12+life*.25;ctx.beginPath();
      ctx.moveTo(x+Math.cos(a-.015)*r,y+Math.sin(a-.015)*r);
      ctx.quadraticCurveTo(x+Math.cos(a+.012)*(r+reach*2),y+Math.sin(a+.012)*(r+reach*2),x+Math.cos(a+.027)*r,y+Math.sin(a+.027)*r);ctx.stroke();
    }
    ctx.restore();
  }
  // Bright, smoothly growing flare kernels plus occasional low limb loops.
  for(const region of stellarActivity(body,t)){
    if(region.flare<.005)continue;
    const lon=region.longitude-rotation-t*.008,z=Math.cos(lon)*Math.cos(region.latitude);
    if(z<=0)continue;
    const px=x+Math.sin(lon)*Math.cos(region.latitude)*r,py=y+Math.sin(region.latitude)*r;
    const extent=Math.min(120,r*(.004+.032*region.flare));
    if(px+extent*4<0||px-extent*4>width||py+extent*4<0||py-extent*4>height)continue;
    ctx.save();ctx.globalAlpha=region.flare*.8;ctx.strokeStyle='#ffbe6b';ctx.lineWidth=Math.min(4,Math.max(.5,r*.0015));
    const angle=Math.atan2(py-y,px-x);
    ctx.translate(px,py);ctx.rotate(angle);
    ctx.beginPath();ctx.moveTo(0,-extent*.6);ctx.bezierCurveTo(extent*(1+2*(1-z)),-extent,extent*(1+2*(1-z)),extent,0,extent*.6);ctx.stroke();
    ctx.globalAlpha=region.flare*.32;ctx.lineWidth=Math.min(9,ctx.lineWidth*3);ctx.stroke();
    ctx.fillStyle='#fff2c1';ctx.beginPath();ctx.ellipse(0,0,extent*.22,extent*.5,0,0,TAU);ctx.fill();ctx.restore();
  }
}
export const stellarCacheStats=()=>({frames:cache.size,geometry:spheres.size});
