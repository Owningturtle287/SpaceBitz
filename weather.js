// A bounded visual model of zonal advection and local vortices, not a GCM.
// Weather timing is accelerated independently of astronomical orbital time.
import {TAU,rotationAngle} from './model.js';
import {giantColor} from './giants.js';
import {drawImageInView} from './rendering.js';

const FPS=6,LIMIT=6,maps=new Map(),geometry=new Map(),frames=new Map();
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const wrap=v=>Math.atan2(Math.sin(v),Math.cos(v));
function bounded(cache,key,value){cache.set(key,value);if(cache.size>LIMIT)cache.delete(cache.keys().next().value);return value;}

export function giantWind(profile,latitude){
  const {speed,jets,equator}=profile.wind;
  const equatorial=Math.exp(-((latitude/.26)**2));
  return speed*equator*(.72*Math.cos(latitude*jets)+.28*equatorial)*Math.pow(Math.max(0,Math.cos(latitude)),.4);
}

export function giantStorms(profile,seconds=0){
  const storms=[];
  for(const s of profile.storms){
    const age=((seconds/s.cycle+s.phase)%1+1)%1;
    const life=s.persistent?1:age<s.active?Math.sin(Math.PI*age/s.active)**2:0;
    const stretch=1+s.aspect*Math.sin(seconds*.075+s.phase*TAU);
    const lon=s.lon+(giantWind(profile,s.lat)*.12+s.drift)*seconds;
    const storm={...s,lon:wrap(lon),lat:s.lat+(s.redSpot?0:.008*Math.sin(seconds*.03+s.phase*TAU)),
      sx:s.sx*stretch,sy:s.sy/stretch,life,swirl:seconds*s.turn+s.phase*TAU};
    storms.push(storm);
    if(s.companion)storms.push({...storm,lon:wrap(lon+.17),lat:storm.lat-.095,sx:s.sx*.73,sy:s.sy*.34,
      color:profile.colors[3],strength:.92,redSpot:false,companion:false,swirl:storm.swirl*.7});
    if(s.tail)storms.push({...storm,lon:wrap(lon+.27+life*.11),sx:s.sx*(1+life*.55),sy:s.sy*.55,
      strength:s.strength*.54,tail:false,swirl:storm.swirl*.6});
  }
  return storms;
}

function cloudMap(body){
  if(maps.has(body.id))return maps.get(body.id);
  const width=320,height=160,pixels=new Uint8ClampedArray(width*height*3),profile={...body.atmosphere,storms:[]};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const color=giantColor(profile,x/width*TAU,(y/height-.5)*Math.PI),i=(y*width+x)*3;
    for(let k=0;k<3;k++)pixels[i+k]=Math.round(color[k]/4)*4;
  }
  return bounded(maps,body.id,{width,height,pixels});
}

function sphere(body,size){
  const key=body.id+':'+size;if(geometry.has(key))return geometry.get(key);
  const count=size*size,lat=new Float32Array(count),lon=new Float32Array(count),flow=new Float32Array(count),normal=new Float32Array(count*3),indices=[];
  const ca=Math.cos(body.atmosphere.tilt),sa=Math.sin(body.atmosphere.tilt);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,nx=(x+.5-size/2)/(size/2),ny=(y+.5-size/2)/(size/2),r2=nx*nx+ny*ny;
    if(r2>1)continue;
    const nz=Math.sqrt(1-r2),tx=nx*ca+ny*sa,ty=-nx*sa+ny*ca;
    lat[i]=Math.asin(clamp(ty,-1,1));lon[i]=Math.atan2(tx,nz);flow[i]=giantWind(body.atmosphere,lat[i]);
    normal[i*3]=nx;normal[i*3+1]=ny;normal[i*3+2]=nz;indices.push(i);
  }
  return bounded(geometry,key,{lat,lon,flow,normal,indices:new Uint16Array(indices)});
}

// Bilinear lookup moves cloud detail smoothly between pixel cells. The output
// remains a small, nearest-neighbor disk when scaled onto the game canvas.
function sample(map,lon,lat,data,index,shade,weight=1){
  const u=((lon/TAU%1)+1)%1*map.width,v=clamp((lat/Math.PI+.5)*map.height,0,map.height-1);
  const x=Math.floor(u),y=Math.floor(v),fx=u-x,fy=v-y,next=(x+1)%map.width;
  const a=(y*map.width+x)*3,b=(y*map.width+next)*3,c=(Math.min(y+1,map.height-1)*map.width+x)*3,d=c+(next-x)*3;
  for(let k=0;k<3;k++){
    const color=((map.pixels[a+k]*(1-fx)+map.pixels[b+k]*fx)*(1-fy)+(map.pixels[c+k]*(1-fx)+map.pixels[d+k]*fx)*fy)*shade;
    data[index+k]=weight===1?color:data[index+k]*(1-weight)+color*weight;
  }
}

function makeFrame(body,seconds,rotation,lightAngle,size){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size),data=image.data;
  const shape=sphere(body,size),map=cloudMap(body),profile=body.atmosphere,shades=new Float32Array(size*size);
  const lx=Math.cos(lightAngle)*.88,ly=Math.sin(lightAngle)*.88,lz=.47;
  // Two renewing material layers bound accumulated shear. Each one is invisible
  // at its reset, so cloud renewal never snaps or stretches into endless stripes.
  const cycle=36,age=seconds%cycle,other=(seconds+cycle/2)%cycle;
  const triangle=1-Math.abs(age/(cycle/2)-1),blend=triangle*triangle*(3-2*triangle);
  for(const i of shape.indices){
    const lon=shape.lon[i]+rotation;
    const wave=profile.wind.wave*Math.sin(lon*6+profile.wind.phase+seconds*.24)*Math.cos(shape.lat[i]);
    const shade=.19+Math.max(0,shape.normal[i*3]*lx+shape.normal[i*3+1]*ly+shape.normal[i*3+2]*lz)*.85;
    shades[i]=shade;
    sample(map,lon-shape.flow[i]*(other-cycle/2),shape.lat[i]+wave,data,i*4,shade);
    sample(map,lon-shape.flow[i]*(age-cycle/2),shape.lat[i]+wave,data,i*4,shade,blend);
    data[i*4+3]=255;
  }
  const R=size/2,ct=Math.cos(profile.tilt),st=Math.sin(profile.tilt);
  for(const storm of giantStorms(profile,seconds)){
    if(storm.life<.008)continue;
    const longitude=wrap(storm.lon-rotation),depth=Math.cos(longitude)*Math.cos(storm.lat);
    if(depth<-.2)continue;
    const tx=Math.sin(longitude)*Math.cos(storm.lat),ty=Math.sin(storm.lat);
    const cx=R+(tx*ct-ty*st)*R,cy=R+(tx*st+ty*ct)*R;
    // Conservative projected bounds; actual membership is checked in spherical
    // coordinates so spots clip at the limb and remain oval at every heading.
    const extent=Math.max(storm.sx,storm.sy)*R*1.9;
    for(let y=Math.max(0,Math.floor(cy-extent));y<Math.min(size,cy+extent);y++)for(let x=Math.max(0,Math.floor(cx-extent));x<Math.min(size,cx+extent);x++){
      const i=y*size+x,p=i*4;if(!data[p+3])continue;
      const dx=wrap(shape.lon[i]+rotation-storm.lon)*Math.cos(storm.lat)/storm.sx,dy=(shape.lat[i]-storm.lat)/storm.sy;
      if(Math.abs(dx)>1.6||Math.abs(dy)>1.6)continue;
      const d=Math.hypot(dx,dy);if(d>1.55)continue;
      const angle=Math.atan2(dy,dx),lane=.5+.5*Math.sin(angle*3*storm.spin-d*14-storm.swirl);
      const core=1-smooth(.68,1.14,d),rim=(1-smooth(.93,1.55,d))*(1-core);
      const intensity=storm.life*storm.strength,shade=shades[i];
      for(let k=0;k<3;k++){
        const bright=profile.colors[3][k]*shade;
        const rimMix=rim*(.36+lane*.32)*intensity;
        let color=data[p+k]*(1-rimMix)+bright*rimMix;
        const vortex=(storm.color[k]*(1-lane*.24)+profile.colors[2][k]*lane*.24)*shade;
        const coreMix=core*intensity;color=color*(1-coreMix)+vortex*coreMix;
        if(storm.redSpot){
          // A red-orange collar, darker heart and winding pale lanes make the
          // persistent landmark recognizable without reinstating the old block.
          const eye=(1-smooth(.12,.48,d))*.22;
          color=color*(1-eye)+[178,57,40][k]*shade*eye;
        }
        data[p+k]=color;
      }
    }
  }
  ctx.putImageData(image,0,0);return canvas;
}

export function paintGiantAtmosphere(ctx,body,x,y,r,seconds,days,worldPos={x:0,y:0},reducedMotion=false,width=ctx.canvas.width,height=ctx.canvas.height){
  if(!body.atmosphere||r<1.5||x+r<0||x-r>width||y+r<0||y-r>height)return;
  const time=reducedMotion?0:Math.max(0,seconds),rotation=reducedMotion?0:rotationAngle(body,days),size=r<56?96:128;
  const light=Math.round(Math.atan2(-worldPos.y,-worldPos.x)/TAU*48),lightAngle=light/48*TAU;
  const tick=Math.floor(time*FPS),key=body.id+':'+size+':'+light+':'+reducedMotion;
  let pair=frames.get(key);
  if(!pair||pair.tick!==tick||Math.abs(wrap(rotation-pair.rotation))>.025){
    const current=pair?.tick===tick-1&&Math.abs(wrap(rotation-pair.rotation))<=.025?pair.next:makeFrame(body,tick/FPS,rotation,lightAngle,size);
    pair={tick,rotation,current,next:reducedMotion?current:makeFrame(body,(tick+1)/FPS,rotation,lightAngle,size),blend:pair?.blend};
    bounded(frames,key,pair);
  }
  if(!pair.blend){pair.blend=document.createElement('canvas');pair.blend.width=pair.blend.height=size;}
  const g=pair.blend.getContext('2d'),fraction=time*FPS-tick,mix=reducedMotion?0:fraction*fraction*(3-2*fraction);
  g.clearRect(0,0,size,size);g.globalCompositeOperation='source-over';g.globalAlpha=1-mix;g.drawImage(pair.current,0,0);
  g.globalCompositeOperation='lighter';g.globalAlpha=mix;g.drawImage(pair.next,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';
  ctx.save();ctx.imageSmoothingEnabled=false;drawImageInView(ctx,pair.blend,x-r,y-r,2*r,2*r,width,height);ctx.restore();
}
export const giantWeatherCacheStats=()=>({maps:maps.size,geometry:geometry.size,frames:frames.size});
