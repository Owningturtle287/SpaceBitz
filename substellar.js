import {hash,TAU} from './model.js';
import {noise} from './terrain.js';
import {drawImageInView,lineInView} from './rendering.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),frames=new Map();
function brownFrame(body,time,size){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const g=canvas.getContext('2d'),image=g.createImageData(size,size),seed=hash(body.id);
  const cls=body.type[0],light=clamp((body.temperature/2000)**2.5,.06,1),contrast=body.cloudContrast||.5;
  // Atmospheric differential flow, latitude bands and evolving curled cloud
  // structures; no solar granules, spots or disconnected flare pixels.
  const rotation=time*.18/(body.rotationDays*24),drift=time*.045;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=(x+.5-size/2)/(size/2),ny=(y+.5-size/2)/(size/2),d=nx*nx+ny*ny;if(d>1)continue;
    const nz=Math.sqrt(1-d),lat=Math.asin(ny),lon=Math.atan2(nx,nz)+rotation;
    const jet=Math.sin(lat*11)*drift,warp=noise(Math.cos(lon)*4+drift,lat*7,seed)-.5;
    const streak=noise((lon+jet+warp*.55)*14,lat*47+warp*3,seed+3);
    const eddy=noise(Math.cos(lon+jet)*5+warp,lat*8-drift*.5,seed+7);
    const band=.5+.25*Math.sin(lat*17+warp*4)+contrast*(streak-.5)+.32*(eddy-.5);
    const bright=clamp(band,0,1),shade=(.28+.72*nz)*light,pulse=1+.018*Math.sin(time*.7+seed);
    const dark=cls==='L'?[53,14,31]:cls==='T'?[27,12,33]:[13,11,20],warm=cls==='L'?[237,114,83]:cls==='T'?[137,68,110]:[66,48,71];
    const i=(y*size+x)*4;for(let k=0;k<3;k++)image.data[i+k]=Math.round((dark[k]+(warm[k]-dark[k])*bright)*shade*pulse/3)*3;image.data[i+3]=255;
  }g.putImageData(image,0,0);return canvas;
}
export function paintBrownAtmosphere(ctx,body,x,y,r,seconds,reducedMotion,width,height){
  if(r<1||x+r<0||y+r<0||x-r>width||y-r>height)return;
  const time=reducedMotion?0:seconds,tick=Math.floor(time*6),size=r<80?96:192,key=[body.id,body.type,body.temperature,body.rotationDays,body.cloudContrast,size,reducedMotion].join(':');
  let pair=frames.get(key);
  if(!pair||pair.tick!==tick){pair={tick,a:pair?.tick===tick-1?pair.b:brownFrame(body,tick/6,size),b:brownFrame(body,(tick+1)/6,size),blend:pair?.blend};frames.set(key,pair);if(frames.size>4)frames.delete(frames.keys().next().value);}
  if(!pair.blend){pair.blend=document.createElement('canvas');pair.blend.width=pair.blend.height=size;}
  const g=pair.blend.getContext('2d'),mix=reducedMotion?0:time*6-tick;g.clearRect(0,0,size,size);g.globalCompositeOperation='source-over';g.globalAlpha=1-mix;g.drawImage(pair.a,0,0);g.globalCompositeOperation='lighter';g.globalAlpha=mix;g.drawImage(pair.b,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';
  ctx.save();ctx.imageSmoothingEnabled=false;drawImageInView(ctx,pair.blend,x-r,y-r,r*2,r*2,width,height);ctx.restore();
}
export function compactState(body,seconds,reducedMotion=false){
  const period=Math.max(.001,Math.abs(body.rotationDays)*86400),phase=reducedMotion?0:TAU*((seconds%period)/period),magnetar=body.subtype==='magnetar'||body.family==='magnetar';
  const burst=reducedMotion?0:Math.max(0,Math.sin(seconds*1.73+hash(body.id)%31))**24*Math.max(0,Math.sin(seconds*.31+1));
  return {period,phase,magnetar,burst,pulse:reducedMotion?1:period<1/30?.85:.7+.3*Math.cos(phase)**8,tilt:body.magneticTilt||.6};
}
export function paintCompact(ctx,body,x,y,r,seconds,reducedMotion,width,height){
  const state=compactState(body,seconds,reducedMotion),active=body.subtype==='pulsar'||(!body.subtype&&body.familyLabel==='Pulsar')||state.magnetar||body.family==='quark';
  const effect=active?Math.min(Math.max(12,r*9),Math.max(width,height)*.65):Math.min(Math.max(3,r*1.4),Math.max(width,height)*.65);
  if(x+effect<0||x-effect>width||y+effect<0||y-effect>height)return;
  ctx.save();const color=state.magnetar?'#b282ff':'#70dfff';
  const glow=ctx.createRadialGradient(x,y,0,x,y,effect);glow.addColorStop(0,color+(active?'b0':'30'));glow.addColorStop(.3,color+'35');glow.addColorStop(1,color+'00');ctx.fillStyle=glow;ctx.fillRect(Math.max(0,x-effect),Math.max(0,y-effect),Math.min(width,x+effect)-Math.max(0,x-effect),Math.min(height,y+effect)-Math.max(0,y-effect));
  if(active){
    ctx.strokeStyle=color;ctx.lineWidth=state.magnetar?2:1;
    // Bounded sampled dipole loops rather than unbounded GPU ellipses.
    for(let loop=0;loop<4;loop++){ctx.globalAlpha=(state.magnetar?.42:.24)+state.burst*.3;ctx.beginPath();let previous=null;
      for(let j=0;j<=48;j++){const t=j/48*TAU,a=state.phase*(state.magnetar?.17:1)+loop*Math.PI/2,rad=effect*(.3+.45*Math.sin(t)**2),p={x:x+Math.cos(a)*Math.cos(t)*rad-Math.sin(a)*Math.sin(t)*rad*.33,y:y+Math.sin(a)*Math.cos(t)*rad+Math.cos(a)*Math.sin(t)*rad*.33};if(previous)lineInView(ctx,previous,p,width,height);previous=p;}ctx.stroke();}
    const samples=!reducedMotion&&state.period<1/30?4:1;
    for(let j=0;j<samples;j++)for(let pole=0;pole<2;pole++){
      const a=state.phase+state.tilt+pole*Math.PI+j*TAU/samples,spread=(body.beamWidth||.12)*(state.magnetar?1.8:1),u={x:Math.cos(a),y:Math.sin(a)},v={x:-u.y,y:u.x};
      ctx.globalAlpha=(state.magnetar?.07+state.burst*.28:.18*state.pulse)/samples;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+u.x*effect+v.x*effect*spread,y+u.y*effect+v.y*effect*spread);ctx.lineTo(x+u.x*effect-v.x*effect*spread,y+u.y*effect-v.y*effect*spread);ctx.closePath();ctx.fill();}
  }
  // The physical disk is never inflated. Subpixel objects retain a hollow beacon.
  ctx.globalAlpha=1;ctx.fillStyle=active?'#e8fbff':body.color;
  if(r>=1){const radius=Math.min(r,Math.max(width,height)*2);ctx.beginPath();ctx.arc(x,y,radius,0,TAU);ctx.fill();}
  else {ctx.strokeStyle=color;ctx.strokeRect(Math.round(x)-2,Math.round(y)-2,4,4);}
  ctx.restore();
}
export const substellarCacheStats=()=>({frames:frames.size});
