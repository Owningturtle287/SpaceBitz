import {hash,TAU,rotationAngle} from './model.js';
import {noise} from './terrain.js';

const maps=new Map(),frames=new Map();
const cap=(n,a,b)=>Math.max(a,Math.min(b,n));
function surfaceMap(body){
  if(maps.has(body.id))return maps.get(body.id);
  const width=192,height=96,pixels=new Uint8ClampedArray(width*height*3),seed=hash(body.id);
  const base=body.color.match(/\w\w/g).map(h=>parseInt(h,16));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const latitude=(y/height-.5)*Math.PI,longitude=x/width*TAU;
    const nx=Math.cos(longitude)*Math.cos(latitude),ny=Math.sin(longitude)*Math.cos(latitude),nz=Math.sin(latitude);
    const n=noise(nx*3.8+nz*.4+5,ny*3.8+nz*1.2+5,seed);
    const fine=noise(nx*18+nz*3+22,ny*18+nz*7+22,seed+11);
    let color;
    if(body.kind==='star'){
      const spots=n<.22?.40:1;
      color=base.map((v,i)=>cap(v*(.85+fine*.28)*spots+(i===0?14:0),0,255));
    }else if(['gas','ice-giant'].includes(body.type)){
      const bands=.82+.13*Math.sin(latitude*42+n*2)+fine*.11;
      color=base.map(v=>v*bands);
      if(body.name==='Jupiter' && nx>.60 && ny>.15 && nz>-.32 && nz<-.13)color=[173,108,76];
    }else if(body.type==='temperate'){
      color=n>.47?(n>.71?[142,139,99]:[57+n*38,106+n*52,72+fine*30]):[33+fine*16,77+n*58,130+n*66];
      if(Math.abs(nz)>.92)color=[208,226,218];
      if(fine>.76)color=color.map(v=>v*.4+216*.6);
    }else{
      const brightness=.64+n*.48+fine*.18;color=base.map(v=>v*brightness);
      if(body.type==='ice')color=color.map(v=>v*.55+215*.45);
    }
    const i=(y*width+x)*3;for(let k=0;k<3;k++)pixels[i+k]=Math.round(color[k]/4)*4;
  }
  const map={width,height,pixels};maps.set(body.id,map);
  if(maps.size>48)maps.delete(maps.keys().next().value);
  return map;
}
export function celestialSprite(body,days,worldPosition={x:0,y:0}) {
  const rotation=((rotationAngle(body,days)%TAU)+TAU)%TAU;
  const lightAngle=Math.atan2(-worldPosition.y,-worldPosition.x);
  const frame=Math.floor(rotation/TAU*256),light=Math.round(lightAngle/TAU*128);
  const key=`${body.id}:${frame}:${light}`;
  if(frames.has(key))return frames.get(key);
  const map=surfaceMap(body),size=body.kind==='star'?144:80;
  const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),img=g.createImageData(size,size);
  const lx=Math.cos(lightAngle)*.88,ly=Math.sin(lightAngle)*.88,lz=.47;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=(x+.5-size/2)/(size/2),ny=(y+.5-size/2)/(size/2),r2=nx*nx+ny*ny;
    if(r2>1)continue;const nz=Math.sqrt(1-r2);
    const lon=Math.atan2(nx,nz)+rotation,lat=Math.asin(ny);
    const u=Math.floor(((lon/TAU+1)%1)*map.width),v=cap(Math.floor((lat/Math.PI+.5)*map.height),0,map.height-1);
    const source=(v*map.width+u)*3,index=(y*size+x)*4;
    const shade=body.kind==='star'?.77+nz*.23:.19+Math.max(0,nx*lx+ny*ly+nz*lz)*.85;
    for(let k=0;k<3;k++)img.data[index+k]=map.pixels[source+k]*shade;
    img.data[index+3]=255;
  }
  g.putImageData(img,0,0);frames.set(key,c);
  if(frames.size>80)frames.delete(frames.keys().next().value);
  return c;
}
