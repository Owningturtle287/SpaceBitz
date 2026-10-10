import {celestialSprite} from '../rendering/celestial.js';
import {paintStellarSurface} from '../rendering/stellar.js';
import {paintBrownGlow,paintBrownAtmosphere,paintCompact} from '../rendering/substellar.js';
import {ringSprites,paintRings} from '../rendering/giants.js';
import {paintShip} from '../rendering/sprites.js';
import {logObjectReference} from './log-objects.js';
import {logCategory} from './voyage-log.js';

export function createLogPreview(entry,save,getSystem){
  const ref=logObjectReference(entry,save),category=logCategory(entry);
  let body,kind=ref?.kind;
  const seeds=ref?[ref.system]:[...new Set([save.currentSystem,save.homeSeed])];
  if(!['sample','lander','coordinate'].includes(kind))for(const seed of seeds){
    const system=getSystem(seed),bodies=[...(system.stars||[system.star]),...system.planets.flatMap(p=>[p,...p.moons])];
    body=bodies.find(b=>ref?b.id===ref.id:b.name===entry.name);if(body)break;
  }
  kind=body?.kind||kind||(category==='item'?'sample':category);
  const figure=document.createElement('figure'),canvas=document.createElement('canvas');figure.className='journal-preview';figure.dataset.kind=kind;
  canvas.width=canvas.height=80;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',entry.name+' · '+kind+' visual');figure.append(canvas);
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;const x=40,y=40,days=entry.days||0;
  if(kind==='sample'){
    ctx.fillStyle='#153c47';ctx.fillRect(20,26,36,34);ctx.fillStyle='#377e9a';ctx.fillRect(24,20,28,36);
    ctx.fillStyle='#6cddc8';ctx.fillRect(30,14,12,44);ctx.fillRect(42,25,8,27);ctx.fillStyle='#d6ffe1';ctx.fillRect(32,18,4,28);
  }else if(kind==='lander')paintShip(ctx,x,y,{heading:-Math.PI/2},0,32,true,1);
  else if(kind==='coordinate'){
    ctx.strokeStyle='#8ee9d4';ctx.lineWidth=2;ctx.strokeRect(20,20,40,40);ctx.fillStyle='#b7ffd0';ctx.fillRect(38,28,4,24);ctx.fillRect(28,38,24,4);
  }else if(kind==='star'){
    if(body?.family==='brown'){paintBrownGlow(ctx,body,x,y,23,80,80);paintBrownAtmosphere(ctx,body,x,y,23,0,true,80,80);}
    else if(['ns','magnetar','quark','boson'].includes(body?.family))paintCompact(ctx,body,x,y,12,0,true,80,80);
    else {ctx.fillStyle=body?.color||'#ffc879';ctx.beginPath();ctx.arc(x,y,23,0,Math.PI*2);ctx.fill();if(body)paintStellarSurface(ctx,body,x,y,23,0,days,true,80,80);else{ctx.fillStyle='#fff1b7';ctx.fillRect(30,23,12,10);}}
  }else {
    body||={id:'log:'+entry.id,kind:'planet',type:'rock',color:'#8194ab',rotationDays:1};
    const radius=body.rings?Math.min(26,34/(body.rings.outerKm/(body.diameter/2))):26,position={x:1000,y:0},rings=ringSprites(body,position);
    paintRings(ctx,rings,'back',x,y,radius,80,80);ctx.drawImage(celestialSprite(body,days,position),x-radius,y-radius,radius*2,radius*2);paintRings(ctx,rings,'front',x,y,radius,80,80);
  }
  return figure;
}
