// Reflected-light giant atmospheres and ring dimensions. See docs/astronomy.md.
// Appearance RNG is separate from world generation: recoloring never moves worlds.
import {rng,hash,TAU} from './model.js';
import {noise} from './terrain.js';
import {drawImageInView} from './rendering.js';

const rgb=hex=>hex.match(/\w\w/g).map(h=>parseInt(h,16));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*Math.max(0,Math.min(1,t)));
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const palettes={
  ammonia:['#796052','#bd9672','#e5c9a4','#f3e4cb'],
  golden:['#a28d65','#cdb681','#e5d3a3','#f4e8c7'],
  water:['#7d919b','#b6c9cd','#e0e9e6','#faf5df'],
  methane:['#538c9b','#7db6bf','#add5d5','#d0e7df'],
  haze:['#806756','#b6916f','#d6b68b','#ebd1ac'],
  clear:['#394f72','#607d9d','#89a6bf','#bdcfda'],
  alkali:['#5b4143','#8f6257','#b88765','#d7b285'],
  silicate:['#777d8d','#adb0b4','#d5cfbd','#f0e5cb']
};

export function giantProfile(body,star={luminosity:1}){
  if(!['gas','ice-giant'].includes(body.type))return null;
  const r=rng('atmosphere:'+body.id),sol=body.id.startsWith('sol:');
  const temperature=Math.round(278*Math.pow(star.luminosity,.25)/Math.sqrt(body.au)*Math.pow(.7,.25));
  let family,label,contrast,tilt=0;
  if(sol){
    const types={Jupiter:['ammonia','Ammonia clouds · ochre belts',1.0,0],Saturn:['golden','Ammonia haze · golden bands',.53,-.31],
      Uranus:['methane','Methane · thick pale haze',.16,1.36],Neptune:['methane','Methane · blue-green clouds',.46,.12]};
    [family,label,contrast,tilt]=types[body.name];
  }else{
    // Temperature gates are inspired by reflected-light models, not a census
    // of observed colors. Within a class these are explicit artistic priors.
    if(temperature<150){family=body.diameter<65000&&r()<.62?'methane':r()<.70?'ammonia':'haze';}
    else if(temperature<350)family=r()<.72?'water':'haze';
    else if(temperature<900)family='clear';
    else if(temperature<1500)family='alkali';else family='silicate';
    label={ammonia:'Ammonia clouds',methane:'Methane-rich haze',water:'Water clouds',haze:'Clouds · amber haze',clear:'Sparse clouds',alkali:'Alkali absorption',silicate:'Silicate clouds'}[family];
    contrast=.45+r()*.50;tilt=(r()-.5)*.85;
  }
  const colors=palettes[family].map(rgb);
  if(sol&&body.name==='Neptune')colors.forEach(c=>{c[0]-=7;c[2]+=5;});
  const storms=[];
  const count=sol&&body.name==='Uranus'?3:sol&&body.name==='Saturn'?7:14;
  for(let i=0;i<count;i++)storms.push({lon:r()*TAU,lat:(r()-.5)*2.15,sx:.045+r()*.08,sy:.022+r()*.036,
    color:colors[r()<.68?3:0],strength:(.30+r()*.40)*(sol&&body.name==='Uranus'?.35:1),spin:r()<.5?-1:1});
  if(sol&&body.name==='Jupiter')storms.push({lon:.64,lat:.38,sx:.12,sy:.067,color:rgb('#bc6b4c'),strength:.95,spin:-1,redSpot:true});
  if(sol&&body.name==='Neptune')storms.push({lon:.75,lat:.38,sx:.13,sy:.064,color:rgb('#486f83'),strength:.80,spin:-1});
  return {family,label,temperature,colors,contrast,tilt,storms,seed:hash(body.id),polarHexagon:sol&&body.name==='Saturn',polarHaze:sol&&body.name==='Uranus'};
}

export function giantColor(profile,lon,lat){
  const {seed,colors,contrast}=profile;
  const c=Math.cos(lat),nx=Math.cos(lon)*c,ny=Math.sin(lon)*c,nz=Math.sin(lat);
  const cloud=noise(nx*7+12+nz*2,ny*7+12+nz*3,seed);
  const fine=noise(nx*28+40+nz*7,ny*28+40+nz*9,seed+19);
  const warp=.026*Math.sin(lon*7+lat*17)+.035*(cloud-.5);
  const belt=(Math.sin((lat+warp)*28)+.36*Math.sin((lat+warp)*63+cloud*2))*.5+.5;
  let color=mix(colors[1],belt>.5?colors[3]:colors[0],Math.abs(belt-.5)*1.65*contrast);
  const filaments=Math.sin((lat+warp)*122+Math.sin(lon*15)*.9+cloud*5);
  color=mix(color,colors[2],(.12+fine*.18)*contrast);
  color=color.map(v=>v*(1+filaments*.035*contrast+(fine-.5)*.08*contrast));
  for(const storm of profile.storms){
    const dx=wrap(lon-storm.lon)*Math.cos(storm.lat)/storm.sx,dy=(lat-storm.lat)/storm.sy;
    if(Math.abs(dx)>1.65||Math.abs(dy)>1.65)continue;
    const d=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
    const edge=1-smooth(.90,1.50,d),spiral=.5+.5*Math.sin(angle*storm.spin*3-d*15+cloud*3);
    if(d>1.5)continue;
    // Feathered oval core, curling pale rim and spiral cloud lanes: no rectangle.
    const core=1-smooth(.66,1.12,d);
    color=mix(color,colors[3],edge*(1-core)*(.28+spiral*.32)*storm.strength);
    const vortex=mix(storm.color,colors[2],spiral*(storm.redSpot?.27:.30));
    color=mix(color,vortex,core*storm.strength);
  }
  if(profile.polarHaze)color=mix(color,colors[3],smooth(.76,1.46,Math.abs(lat))*.48);
  if(profile.polarHexagon){
    const boundary=1.20+.018*Math.cos(lon*6);
    color=mix(color,colors[0],smooth(boundary,boundary+.05,Math.abs(lat))*.32);
  }
  return color.map(v=>Math.max(0,Math.min(255,v)));
}

// Radii are km from the planet center. Alpha is enhanced for pixel readability,
// not an optical-depth measurement. Invisible outer dust sheets are omitted.
const band=(inner,outer,alpha,color)=>({inner,outer,alpha,color:rgb(color)});
const narrow=(radius,width,alpha,color)=>({...band(radius-width/2,radius+width/2,alpha,color),narrow:true});
export function ringProfile(body){
  if(!['gas','ice-giant'].includes(body.type))return null;
  let bands,angle=-.31,squash=.43;
  if(body.id==='sol:Saturn')bands=[band(66900,74491,.06,'#978b78'),band(74491,91975,.36,'#b6ae97'),band(91975,117570,.94,'#e5d6b6'),
    band(122050,136770,.76,'#c8bfa9'),band(139826,140612,.36,'#e4d7bc')];
  else if(body.id==='sol:Jupiter'){angle=0;squash=.18;bands=[band(100000,122400,.025,'#968677'),band(122400,129100,.095,'#b2a08a')];}
  else if(body.id==='sol:Uranus'){angle=1.36;squash=.52;bands=[band(37850,41350,.025,'#7f858a'),...[41838,42234,42571,44718,45661,47176,47627,48300,50024,51149].map((radius,i)=>narrow(radius,[1.53,2.28,2.33,8.46,9.49,1.6,2.15,4.6,2.3,58.1][i],i===9?.58:.26,'#9ba39e'))];}
  else if(body.id==='sol:Neptune'){angle=.12;squash=.40;bands=[band(41000,43000,.03,'#7f8b92'),narrow(53200,100,.18,'#929b99'),band(53200,57200,.025,'#7f8b92'),narrow(62933,15,.20,'#a1aaa8')];bands.at(-1).arcs=true;}
  else if(body.id.startsWith('sol:'))return null;
  else{
    const r=rng('rings:'+body.id),roll=r(),radius=body.diameter/2;
    // Unknown exoring occurrence: broad icy rings are deliberately uncommon.
    if(roll<.12){const outer=radius*(2.15+r()*.30),gap=radius*(1.88+r()*.10);
      bands=[band(radius*1.25,radius*1.48,.20,'#9eaaaf'),band(radius*1.48,gap,.80,'#d9d4c1'),band(gap+radius*.07,outer,.62,r()<.5?'#bebdb4':'#c3b2a0')];}
    else if(roll<.40){bands=[narrow(radius*1.75,radius*.035,.16,'#a3a6a2'),narrow(radius*2.02,radius*.013,.24,'#b4b5ad')];}
    else return null;
    angle=(r()-.5)*1.7;squash=.24+r()*.38;
  }
  return {bands,angle,squash,outerKm:Math.max(...bands.map(b=>b.outer)),gaps:body.id==='sol:Saturn'?[[77748,77926],[87343,87610],[133423,133745],[136487,136522]]:[]};
}

const ringFrames=new Map();
export function ringSprites(body,worldPos={x:0,y:0}){
  const profile=body.rings;if(!profile)return null;
  const light=Math.round(Math.atan2(-worldPos.y,-worldPos.x)/TAU*32),key=body.id+':'+light;
  if(ringFrames.has(key))return ringFrames.get(key);
  const size=384,outer=profile.outerKm/(body.diameter/2),unit=2*outer/size;
  const canvases=[document.createElement('canvas'),document.createElement('canvas')];
  const contexts=canvases.map(c=>{c.width=c.height=size;return c.getContext('2d');}),images=contexts.map(g=>g.createImageData(size,size));
  const ca=Math.cos(profile.angle),sa=Math.sin(profile.angle),depth=Math.sqrt(1-profile.squash**2);
  const la=light/32*TAU,lx=Math.cos(la)*.88,ly=Math.sin(la)*.88,lz=.47;
  const radiusKm=body.diameter/2,binKm=unit*radiusKm;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const px=(x+.5-size/2)*unit,py=(y+.5-size/2)*unit;
    const u=px*ca+py*sa,v=(-px*sa+py*ca)/profile.squash;
    const distance=Math.hypot(u,v)*radiusKm;
    if(profile.gaps.some(([a,b])=>distance>=a&&distance<b))continue;
    let b=profile.bands.find(b=>b.narrow?Math.abs(distance-(b.inner+b.outer)/2)<Math.max((b.outer-b.inner)/2,binKm*.48):distance>=b.inner&&distance<b.outer);
    if(!b)continue;
    const theta=Math.atan2(v,u),z=v*depth;
    const waves=.78+.10*Math.sin(distance/550)+.07*Math.sin(distance/170)+.04*Math.sin(theta*19+distance/320);
    const alongLight=px*lx+py*ly+z*lz;
    const shadow=alongLight<0&&alongLight*alongLight>u*u+v*v-1;
    const shade=shadow?.28:.86+.14*Math.cos(theta-la);
    let alpha=b.alpha*waves;
    // Subpixel ringlets have a soft one-texel hint, never a broad filled annulus.
    if(b.narrow)alpha*=.55+.45*Math.min(1,(b.outer-b.inner)/binKm);
    if(b.arcs)alpha*=.35+.65*smooth(.83,.98,Math.cos(theta-.6));
    const image=images[v>=0?1:0],i=(y*size+x)*4;
    for(let k=0;k<3;k++)image.data[i+k]=Math.round(b.color[k]*shade/4)*4;
    image.data[i+3]=Math.round(alpha*255);
  }
  contexts.forEach((g,i)=>g.putImageData(images[i],0,0));
  const result={back:canvases[0],front:canvases[1],outer};ringFrames.set(key,result);
  if(ringFrames.size>24)ringFrames.delete(ringFrames.keys().next().value);
  return result;
}
export function paintRings(ctx,sprites,layer,x,y,r,width,height){
  if(!sprites)return;
  const extent=r*sprites.outer;
  ctx.save();ctx.imageSmoothingEnabled=false;
  drawImageInView(ctx,sprites[layer],x-extent,y-extent,extent*2,extent*2,width,height);ctx.restore();
}
export const ringCacheStats=()=>({frames:ringFrames.size});
