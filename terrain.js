import {hash,clamp} from './model.js';

// All samples use global world coordinates. Cache chunks never determine terrain,
// so coastlines, ridges and shadows continue across every chunk boundary.
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
function lattice(x,y,seed) {
  let n=Math.imul(x,374761393)^Math.imul(y,668265263)^seed;
  n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;
}
export function noise(x,y,seed) {
  const ix=Math.floor(x),iy=Math.floor(y),tx=smooth(x-ix),ty=smooth(y-iy);
  return mix(mix(lattice(ix,iy,seed),lattice(ix+1,iy,seed),tx),
    mix(lattice(ix,iy+1,seed),lattice(ix+1,iy+1,seed),tx),ty);
}
function fbm(x,y,seed,octaves=4) {
  let sum=0,weight=0,amplitude=.5;
  for(let i=0;i<octaves;i++){sum+=noise(x,y,seed+i*7919)*amplitude;weight+=amplitude;
    x*=2.03;y*=2.03;amplitude*=.5;}
  return sum/weight;
}
const palettes={
  temperate:{deep:[18,48,83],water:[35,91,121],sand:[165,155,101],low:[51,99,70],high:[106,125,88],rock:[132,134,122],snow:[201,222,214]},
  desert:{deep:[70,60,57],water:[96,83,65],sand:[184,139,85],low:[155,107,70],high:[198,154,100],rock:[111,80,65],snow:[213,177,125]},
  rock:{deep:[43,50,63],water:[57,65,77],sand:[99,104,112],low:[90,100,112],high:[139,145,150],rock:[164,164,155],snow:[187,197,199]},
  ice:{deep:[26,56,88],water:[48,98,129],sand:[114,154,166],low:[149,186,193],high:[194,215,210],rock:[89,128,151],snow:[222,238,225]}
};
export function createTerrainSampler(body) {
  const seed=hash('geology:'+body.id),type=palettes[body.type]?body.type:'rock',pal=palettes[type];
  const rocky=type==='rock',sea=type==='temperate'?.43:type==='ice'?.36:-1;
  function elevation(x,y) {
    const wx=x+(noise(x*.0014,y*.0014,seed+31)-.5)*340;
    const wy=y+(noise(x*.0014,y*.0014,seed+67)-.5)*340;
    let h=fbm(wx*.0011,wy*.0011,seed,5);
    const ridge=1-Math.abs(noise(wx*.004,wy*.004,seed+100)*2-1);
    h+=ridge*ridge*.11;
    if(rocky){
      // Seeded impact craters with bowls and raised rims. Neighbour cells are
      // sampled too, so an impact never ends at an arbitrary square boundary.
      const cell=360,cx=Math.floor(x/cell),cy=Math.floor(y/cell);
      for(let j=cy-1;j<=cy+1;j++)for(let i=cx-1;i<=cx+1;i++){
        const chance=lattice(i,j,seed+303);if(chance<.62)continue;
        const px=(i+lattice(i,j,seed+306))*cell,py=(j+lattice(i,j,seed+307))*cell;
        const radius=32+lattice(i,j,seed+308)*100,d=Math.hypot(x-px,y-py)/radius;
        if(d<1.3)h+=d<.78?-.14*(1-(d/.78)**2):.07*Math.exp(-(((d-1)*9)**2));
      }
    }
    // A small dry landing site blends into the surrounding terrain.
    const landing=1-smooth(clamp(Math.hypot(x,y)/160,0,1));
    return mix(h,Math.max(h,sea+.09),landing);
  }
  return function sample(x,y) {
    const h=elevation(x,y),moisture=fbm(x*.003,y*.003,seed+991,3);
    let a,b,t,biome;
    if(h<sea){a=pal.deep;b=pal.water;t=clamp((h-(sea-.2))/.2,0,1);biome='water';}
    else if(h<sea+.027){a=pal.sand;b=pal.low;t=(h-sea)/.027;biome='shore';}
    else if(h>.72){a=pal.rock;b=pal.snow;t=clamp((h-.72)*6,0,1);biome='ridge';}
    else{a=pal.low;b=pal.high;t=clamp((h-.38)*2.4,0,1);biome=moisture>.54&&type==='temperate'?'forest':'plain';}
    const slope=(elevation(x+6,y)-h)*5-(elevation(x,y+6)-h)*3;
    const grain=(lattice(Math.floor(x/3),Math.floor(y/3),seed+772)-.5)*7;
    const shade=clamp(1-slope,.68,1.25);
    const color=a.map((v,i)=>clamp(Math.round((mix(v,b[i],t)*shade+grain)/5)*5,0,255));
    return {height:h,moisture,biome,water:h<sea,color};
  };
}
export class TerrainRenderer {
  constructor(){this.cache=new Map();this.samplers=new Map();this.chunkSize=192;}
  sampler(body){if(!this.samplers.has(body.id)){
    if(this.samplers.size>=8)this.samplers.delete(this.samplers.keys().next().value);
    this.samplers.set(body.id,createTerrainSampler(body));}return this.samplers.get(body.id);}
  clear(){this.cache.clear();}
  chunk(body,cx,cy,pixel) {
    const key=`${body.id}:${cx},${cy}:${pixel}`;
    if(this.cache.has(key))return this.cache.get(key);
    const size=this.chunkSize/pixel,c=document.createElement('canvas');c.width=c.height=size;
    const g=c.getContext('2d'),img=g.createImageData(size,size),sample=this.sampler(body);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const color=sample(cx*this.chunkSize+(x+.5)*pixel,cy*this.chunkSize+(y+.5)*pixel).color;
      const i=(y*size+x)*4;img.data[i]=color[0];img.data[i+1]=color[1];img.data[i+2]=color[2];img.data[i+3]=255;
    }
    g.putImageData(img,0,0);this.cache.set(key,c);
    if(this.cache.size>128)this.cache.delete(this.cache.keys().next().value);
    return c;
  }
  draw(ctx,body,camera,zoom,width,height,pixel=3) {
    const size=this.chunkSize,halfW=width/(2*zoom),halfH=height/(2*zoom);
    const left=Math.floor((camera.x-halfW)/size),right=Math.floor((camera.x+halfW)/size);
    const top=Math.floor((camera.y-halfH)/size),bottom=Math.floor((camera.y+halfH)/size);
    ctx.save();ctx.imageSmoothingEnabled=false;
    for(let cy=top;cy<=bottom;cy++)for(let cx=left;cx<=right;cx++){
      const x=Math.round(width/2+(cx*size-camera.x)*zoom),y=Math.round(height/2+(cy*size-camera.y)*zoom);
      const endX=Math.round(width/2+((cx+1)*size-camera.x)*zoom),endY=Math.round(height/2+((cy+1)*size-camera.y)*zoom);
      ctx.drawImage(this.chunk(body,cx,cy,pixel),x,y,endX-x,endY-y);
    }
    ctx.restore();
  }
}
