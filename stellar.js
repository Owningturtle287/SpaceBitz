import {hash,TAU,rotationAngle} from './model.js';
import {noise} from './terrain.js';
import {drawImageInView} from './rendering.js';
const unit=seed=>(hash(seed)%1000000)/1000000;
const cache=new Map(),FPS=6,PAD=1.38;
const smooth=x=>x*x*(3-2*x),clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function chartBrightness(seed,seconds){
  const phase=unit(seed)*TAU;
  return .9+.045*Math.sin(seconds*.61+phase)+.025*Math.sin(seconds*1.13+phase*3)+.015*Math.sin(seconds*.23+phase*7);
}
const spheres=new Map();
function sphere(size){
  if(spheres.has(size))return spheres.get(size);
  const points=[],radius=size/(2*PAD);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=(x+.5-size/2)/radius,ny=(y+.5-size/2)/radius,rho=Math.hypot(nx,ny);
    if(rho<=PAD)points.push((y*size+x)*4,nx,ny,Math.sqrt(Math.max(0,1-rho*rho)),rho,Math.atan2(ny,nx));
  }
  const result=new Float32Array(points);spheres.set(size,result);return result;
}
export function stellarActivity(body,seconds){
  if(body.visual?.spots===0)return [];
  return Array.from({length:9},(_,i)=>{
    const seed=body.id+':activity:'+i,cycle=60+unit(seed)*55;
    const age=((seconds/cycle+unit(seed+':phase'))%1+1)%1;
    const envelope=age<.8?Math.sin(Math.PI*age/.8)**2:0;
    const flareCycle=40+unit(seed+':flare')*35;
    const flareAge=((seconds+unit(seed+':offset')*flareCycle)%flareCycle+flareCycle)%flareCycle;
    const duration=7+unit(seed+':duration')*4;
    return {longitude:unit(seed+':lon')*TAU,latitude:(unit(seed+':lat')-.5)*1.15,
      diameterKm:(body.visual?body.diameter*(.006+unit(seed+':size')*.017)*body.visual.spots:7000+unit(seed+':size')*21000)*envelope,
      life:envelope,flare:flareAge<duration?Math.sin(Math.PI*flareAge/duration)**2:0};
  });
}
// A few sustained eruptions at a time, with quiet intervals per active region.
// Their reach is an art scale, separate from every physical diameter in the UI.
export function stellarProminences(body,seconds){
  if(body.visual?.prominences===0)return [];
  return Array.from({length:6},(_,i)=>{
    const seed=body.id+':prominence:'+i,cycle=32+unit(seed)*28,duration=9+unit(seed+':duration')*6;
    const age=((seconds+unit(seed+':phase')*cycle)%cycle+cycle)%cycle;
    const life=(age<duration?Math.sin(Math.PI*age/duration)**2:0)*Math.min(1,body.visual?.prominences??1);
    return {angle:unit(seed+':angle')*TAU+Math.sin(seconds*.07+i)*.035,
      life,height:(.2+unit(seed+':height')*.14)*life,width:.10+unit(seed+':width')*.09,
      bend:(unit(seed+':bend')-.5)*.55,phase:unit(seed+':grain')*TAU};
  });
}
function makeFrame(body,seconds,rotation,SIZE){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;
  const g=canvas.getContext('2d'),image=g.createImageData(SIZE,SIZE),data=image.data,seed=hash(body.id);
  const base=body.color.match(/\w\w/g).map(h=>parseInt(h,16));
  const compact=body.visual?.granulation===0,scale=body.visual?.granulation||1,pulse=1+(body.visual?.pulsation||0)*Math.sin(seconds*.8+seed%11);
  const points=sphere(SIZE),angle=rotation+seconds*.025,ca=Math.cos(angle),sa=Math.sin(angle),drift=seconds*.26;
  const plumes=stellarProminences(body,seconds).filter(p=>p.life>.005);
  for(let i=0;i<points.length;i+=6){
    const p=points[i],nx=points[i+1],ny=points[i+2],nz=points[i+3],rho=points[i+4],a=points[i+5];
    if(rho>1){
      if(compact)continue;
      const h=rho-1,rim=.012+.018*noise(Math.cos(a)*27+seconds*.4,Math.sin(a)*27,seed+31);
      let energy=h<rim?.55*(1-h/rim):0;
      for(const plume of plumes){
        if(h>plume.height||plume.height<=0)continue;
        const rise=h/plume.height;
        const center=plume.angle+plume.bend*rise*rise;
        const delta=Math.atan2(Math.sin(a-center),Math.cos(a-center));
        const width=plume.width*(1-rise*.7)*( .85+.15*Math.sin(rise*22-seconds*1.8+plume.phase));
        // Broad roots split into ragged, curling fingers of hotter plasma.
        const shape=clamp(1-Math.abs(delta)/width),grain=noise(nx*45-seconds*.65,ny*45+seconds*.3,seed+51);
        const strength=shape*(.64+.36*grain)*Math.pow(1-rise,.3);
        energy=Math.max(energy,strength*plume.life);
      }
      if(energy<.06)continue;
      const hot=clamp((energy-.3)*1.6);
      for(let k=0;k<3;k++)data[p+k]=Math.round(clamp(base[k]*(.65+energy*.45)+hot*65,0,255)/4)*4;
      data[p+3]=Math.round(255*clamp(energy*3));continue;
    }
    if(compact){
      const shade=(.72+.28*nz)*(body.family==='wd'?.96:1),hot=(.4+.6*nz)*22;
      for(let k=0;k<3;k++)data[p+k]=Math.round(clamp(base[k]*shade+hot,0,255)/4)*4;
      data[p+3]=255;continue;
    }
    const sx=nx*ca+nz*sa,sz=nz*ca-nx*sa;
    const warp=noise(sx*7+drift*.25,ny*7+sz*3-drift*.12,seed)-.5;
    const flow=noise((sx*21+sz*11)/scale+warp*2+drift,ny*21/scale-drift*.48,seed+3);
    const eddy=noise((ny*29+sz*9)/scale+drift*.6,(sz*23+sx*7)/scale-drift*.7,seed+7);
    const fine=noise(sx*61+sz*19-drift,ny*61+sz*13+drift*.8,seed+11);
    const cell=flow*.64+eddy*.36,channels=clamp((.47-cell)*2.6);
    const shade=(.68+cell*.5+fine*.16-channels*.24)*(.73+.27*nz);
    const heat=clamp((cell-.52)*3)*85*(body.family==='brown'?Math.min(1,(body.temperature/2200)**4):body.family==='blackDwarf'||body.family==='boson'?0:1);
    const contrast=body.temperature>8000?.45:1;
    for(let k=0;k<3;k++)data[p+k]=Math.round(clamp((base[k]*(1+(shade-1)*contrast)+heat*contrast+(k===0?12*contrast:0))*pulse,0,255)/4)*4;
    data[p+3]=255;
  }
  // Pixel-rasterized active groups: irregular penumbra, dark umbra and small
  // companion spots. No antialiased ellipses or double-faded subpixel dots.
  const R=SIZE/(2*PAD);
  for(const [index,spot]of stellarActivity(body,seconds).entries()){
    const lon=spot.longitude-rotation-seconds*.025*(1-.24*Math.sin(spot.latitude)**2);
    const depth=Math.cos(lon)*Math.cos(spot.latitude);if(depth<=.05||spot.life<.06)continue;
    const cx=SIZE/2+Math.sin(lon)*Math.cos(spot.latitude)*R,cy=SIZE/2+Math.sin(spot.latitude)*R;
    const radius=spot.diameterKm/body.diameter*R;
    for(let j=0;j<3;j++){
      const spread=(j-1)*radius*1.8,x0=cx+spread*depth,y0=cy+spread*.35;
      const ry=Math.max(.6, radius*(j===1?2.8:1.35)),rx=ry*Math.max(.3,depth);
      for(let y=Math.max(0,Math.floor(y0-ry*1.4));y<Math.min(SIZE,y0+ry*1.4);y++)for(let x=Math.max(0,Math.floor(x0-rx*1.4));x<Math.min(SIZE,x0+rx*1.4);x++){
        const p=(y*SIZE+x)*4;if(data[p+3]===0||Math.hypot(x+.5-SIZE/2,y+.5-SIZE/2)>R)continue;
        const rough=.85+.3*noise(x*.8+seconds*.06,y*.8,seed+index*7);
        const d=Math.hypot((x+.5-x0)/rx,(y+.5-y0)/ry)/rough;
        if(d>1.3)continue;
        const dark=(d<.52?.94:d<.9?.64:.22)*smooth(clamp(spot.life*3));
        for(let k=0;k<3;k++)data[p+k]=data[p+k]*(1-dark)+[36,23,30][k]*dark;
      }
    }
  }
  g.putImageData(image,0,0);return canvas;
}
export function paintStellarSurface(ctx,body,x,y,r,seconds,days,reducedMotion=false,width=ctx.canvas.width,height=ctx.canvas.height){
  const extent=r*PAD;
  if(r<1||x+extent<0||x-extent>width||y+extent<0||y-extent>height)return;
  const t=reducedMotion?0:seconds,rotation=reducedMotion?0:rotationAngle(body,days);
  const size=r<80?96:192,tick=Math.floor(t*FPS),key=`${body.id}:${body.color}:${body.family||'legacy'}:${size}:${reducedMotion}`;
  let pair=cache.get(key);
  if(!pair||pair.tick!==tick){
    const current=pair?.tick===tick-1?pair.next:makeFrame(body,tick/FPS,rotation,size);
    pair={tick,current,blend:pair?.blend,next:reducedMotion?current:makeFrame(body,(tick+1)/FPS,rotation,size)};
    cache.set(key,pair);if(cache.size>4)cache.delete(cache.keys().next().value);
  }
  ctx.save();ctx.imageSmoothingEnabled=false;
  // Blend keyframes before compositing: translucent flare silhouettes must fade
  // away as well as grow, without ghost remnants of the previous frame.
  if(!pair.blend){pair.blend=document.createElement('canvas');pair.blend.width=pair.blend.height=size;}
  const g=pair.blend.getContext('2d'),mix=reducedMotion?0:smooth(t*FPS-tick);
  g.clearRect(0,0,size,size);g.globalCompositeOperation='source-over';g.globalAlpha=1-mix;g.drawImage(pair.current,0,0);
  g.globalCompositeOperation='lighter';g.globalAlpha=mix;g.drawImage(pair.next,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';
  drawImageInView(ctx,pair.blend,x-extent,y-extent,extent*2,extent*2,width,height);
  ctx.restore();
}
export const stellarCacheStats=()=>({frames:cache.size,geometry:spheres.size});
