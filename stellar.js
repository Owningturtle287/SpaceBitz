import {hash,TAU,rotationAngle} from './model.js';
import {noise} from './terrain.js';
import {drawImageInView} from './rendering.js';
const unit=seed=>(hash(seed)%1000000)/1000000;
const cache=new Map(),FPS=6;
const smooth=x=>x*x*(3-2*x);
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
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const nx=(x+.5-SIZE/2)/(SIZE/2),ny=(y+.5-SIZE/2)/(SIZE/2),r2=nx*nx+ny*ny;
    if(r2>1)continue;
    const nz=Math.sqrt(1-r2),lat=Math.asin(ny);
    const lon=Math.atan2(nx,nz)+rotation+seconds*.004*(1-.24*ny*ny);
    const sx=Math.cos(lon)*Math.cos(lat),sy=Math.sin(lon)*Math.cos(lat);
    const drift=seconds*.015;
    const flow=noise(sx*13+ny*3+drift,sy*13+ny*7-drift*.4,seed);
    const fine=noise(sx*39+ny*11-drift*.6,sy*39+ny*17+drift*.35,seed+11);
    const shade=(.78+flow*.20+fine*.15)*(.78+.22*nz),p=(y*SIZE+x)*4;
    for(let k=0;k<3;k++)image.data[p+k]=Math.min(255,base[k]*shade+(k===0?12:0));
    image.data[p+3]=255;
  }
  g.putImageData(image,0,0);
  g.save();g.beginPath();g.arc(SIZE/2,SIZE/2,SIZE/2,0,TAU);g.clip();
  for(const spot of stellarActivity(body,seconds)){
    const lon=spot.longitude-rotation-seconds*.004*(1-.24*Math.sin(spot.latitude)**2);
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
  const size=r<80?64:128,tick=Math.floor(t*FPS),key=`${body.id}:${size}`;
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
  // Bright, smoothly growing flare kernels plus occasional low limb loops.
  for(const region of stellarActivity(body,t)){
    if(region.flare<.005)continue;
    const lon=region.longitude-rotation-t*.004,z=Math.cos(lon)*Math.cos(region.latitude);
    if(z<=0)continue;
    const px=x+Math.sin(lon)*Math.cos(region.latitude)*r,py=y+Math.sin(region.latitude)*r;
    const extent=Math.min(Math.max(width,height),r*(.006+.025*region.flare));
    if(px+extent*4<0||px-extent*4>width||py+extent*4<0||py-extent*4>height)continue;
    ctx.save();ctx.globalAlpha=region.flare*.8;ctx.strokeStyle='#ffbe6b';ctx.lineWidth=Math.max(.5,r*.0015);
    const angle=Math.atan2(py-y,px-x);
    ctx.translate(px,py);ctx.rotate(angle);
    ctx.beginPath();ctx.moveTo(0,-extent*.6);ctx.bezierCurveTo(extent*3,-extent,extent*3,extent,0,extent*.6);ctx.stroke();
    ctx.fillStyle='#fff2c1';ctx.beginPath();ctx.ellipse(0,0,extent*.22,extent*.5,0,0,TAU);ctx.fill();ctx.restore();
  }
}
