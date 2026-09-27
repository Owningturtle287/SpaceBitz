import {ASTRONAUT_SCALE} from './scale.js';
const cache=new Map();
function makeSprite(key,width,height,paint) {
  if(cache.has(key))return cache.get(key);
  const c=document.createElement('canvas');c.width=width;c.height=height;
  paint(c.getContext('2d'));cache.set(key,c);return c;
}
export function shipSprite() {
  return makeSprite('ship',32,40,g=>{
    const box=(color,x,y,w,h)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
    // Arrowhead courier: pointed nose, swept wings, twin aft engines.
    box('#071a2a',14,1,4,4);box('#102b40',12,5,8,24);
    box('#1d4154',7,17,18,15);box('#071a2a',3,25,26,9);
    box('#6a93a7',4,24,5,8);box('#a9cdd2',6,20,5,9);
    box('#6a93a7',23,24,5,8);box('#a9cdd2',21,20,5,9);
    box('#e3efe4',14,4,4,4);box('#d5e9df',12,8,8,20);
    box('#f1f6e7',13,8,2,12);box('#87a6b1',18,12,2,18);
    box('#244b62',13,12,6,10);box('#60cbd1',14,13,4,7);box('#bef7e9',14,13,2,3);
    box('#d6aa64',9,25,3,6);box('#d6aa64',20,25,3,6);
    box('#345264',12,29,8,3);box('#0b2233',8,32,5,5);box('#0b2233',19,32,5,5);
    box('#91bdd0',8,32,5,2);box('#91bdd0',19,32,5,2);
    box('#b36b53',4,29,2,3);box('#b36b53',26,29,2,3);
  });
}
// Eight poses per stride: contact, recoil, passing and lift, on each foot.
// The neutral stance is separate so stopping never leaves a boot in mid-air.
export const WALK_FRAMES=8;
export const WALK_CYCLE_DISTANCE=48*ASTRONAUT_SCALE/1.25;
const SUIT={outline:'#081426',shadow:'#3d5973',mid:'#93b5c2',light:'#eaf0dd',
  white:'#fff8e5',teal:'#54cbbc',red:'#ee795a',gold:'#ffce70',visor:'#54384b'};
const POSES=[
  {stride:-3,lift:0,bob:0,arm:3}, {stride:-2,lift:1,bob:1,arm:2},
  {stride:0,lift:2,bob:0,arm:0}, {stride:2,lift:1,bob:-1,arm:-2},
  {stride:3,lift:0,bob:0,arm:-3}, {stride:2,lift:-1,bob:1,arm:-2},
  {stride:0,lift:-2,bob:0,arm:0}, {stride:-2,lift:-1,bob:-1,arm:2}
];
const IDLE_POSE={stride:0,lift:0,bob:0,arm:0};
export function astronautFrame(motion) {
  return motion.moving?Math.floor((motion.steps||0)/WALK_CYCLE_DISTANCE*WALK_FRAMES)%WALK_FRAMES:-1;
}
export function astronautSprite(direction='down',frame=-1) {
  if(!['up','down','left','right'].includes(direction))direction='down';
  frame=Number.isFinite(frame)&&frame>=0?Math.floor(frame)%WALK_FRAMES:-1;
  return makeSprite(`suit:${direction}:${frame}`,32,40,g=>{
    const box=(color,x,y,w,h)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
    const p=frame<0?IDLE_POSE:POSES[frame],c=SUIT;
    const side=direction==='left'||direction==='right',back=direction==='up';
    if(direction==='left'){g.translate(32,0);g.scale(-1,1);}
    const leg=(x,offset,lift,far=false)=>{
      const y=27-lift;
      box(c.outline,x+offset-1,y,7,11);
      box(far?c.shadow:c.mid,x+offset,y,5,7);
      box(far?c.mid:c.light,x+offset,y,3,5);
      box(c.red,x+offset,y+5,5,2);
      box(c.outline,x+offset-1,y+8,8,3);
      box(far?c.shadow:c.mid,x+offset,y+8,6,1);
    };
    const arm=(x,swing,far=false)=>{
      const y=19+p.bob;
      if(side){
        // A bent, fixed-length arm swings from its shoulder in profile.
        const elbow=x+Math.round(swing/2),hand=x+swing,raise=Math.abs(swing)>1?1:0;
        box(c.outline,x-1,y,6,6);box(far?c.mid:c.light,x,y,4,5);
        box(c.outline,elbow-1,y+4,6,5);box(far?c.shadow:c.mid,elbow,y+4,4,4);
        box(c.outline,hand-1,y+7-raise,6,5);box(c.red,hand,y+7-raise,4,3);
        box(c.teal,x,y+1,4,2);return;
      }
      box(c.outline,x-1,y,6,10+swing);
      box(far?c.mid:c.light,x,y,4,7+swing);
      box(far?c.shadow:c.teal,x,y+2,4,2);
      box(c.red,x,y+6+swing,4,3);
      box(c.outline,x,y+9+swing,4,1);
    };
    // Rear limb and backpack silhouette, then the near-side body and arm.
    if(side){
      arm(18,-p.arm,true);
      leg(14,-p.stride,Math.max(0,p.lift),true);
      box(c.outline,5,16+p.bob,9,14);box(c.shadow,6,17+p.bob,6,11);
      box(c.teal,6,18+p.bob,2,6);box(c.red,6,25+p.bob,6,2);
      leg(13,p.stride,Math.max(0,-p.lift));
    }else{
      box(c.outline,7,17+p.bob,19,12);box(c.shadow,8,18+p.bob,17,9);
      leg(10,0,Math.max(0,p.lift)+(p.stride<0?1:0),back);
      leg(17,0,Math.max(0,-p.lift)+(p.stride>0?1:0),!back);
      arm(5,p.arm,true);arm(23,-p.arm);
    }
    box(c.outline,9,17+p.bob,14,13);
    box(c.mid,10,18+p.bob,12,10);box(c.light,11,18+p.bob,8,8);
    box(c.white,11,18+p.bob,3,5);box(c.shadow,20,20+p.bob,2,8);
    box(c.teal,10,25+p.bob,12,2);box(c.outline,10,28+p.bob,12,2);
    if(back){
      box(c.outline,11,19+p.bob,10,9);box(c.shadow,12,20+p.bob,8,7);
      box(c.mid,12,20+p.bob,6,3);box(c.teal,13,21+p.bob,4,1);
      box(c.gold,13,25+p.bob,5,1);
    }else if(!side){
      box(c.outline,14,20+p.bob,6,4);box(c.teal,15,21+p.bob,2,1);
      box(c.red,18,21+p.bob,1,1);box(c.gold,16,25+p.bob,3,2);
    }
    // Oversized ivory helmet, coral center stripe, amber wraparound visor,
    // asymmetric antenna and teal life-support pack give the explorer an identity.
    const h=p.bob;
    box(c.outline,8,4+h,16,15);box(c.outline,5,7+h,22,9);
    box(c.mid,8,5+h,16,13);box(c.light,6,8+h,20,7);
    box(c.light,9,5+h,13,12);box(c.white,9,5+h,10,2);
    box(c.red,15,5+h,3,3);box(c.white,7,8+h,2,3);
    box(c.shadow,9,16+h,14,2);box(c.light,11,16+h,9,1);
    box(c.outline,7,1+h,2,5);box(c.teal,7,1+h,2,2);
    if(back){
      box(c.mid,9,9+h,13,6);box(c.shadow,11,12+h,9,2);
      box(c.red,15,7+h,3,7);box(c.gold,20,10+h,3,2);
    }else{
      const vx=side?14:9,vw=side?12:15;
      box(c.visor,vx,8+h,vw,7);box('#bd7250',vx+1,9+h,vw-2,5);
      box(c.gold,vx+1,9+h,vw-2,3);box('#fff0b0',vx+1,9+h,side?4:6,1);
      box('#fff7dd',vx+1,10+h,2,2);box('#86505a',vx+3,13+h,vw-4,1);
    }
    box(c.outline,side?10:5,10+h,3,5);box(c.teal,side?10:5,11+h,2,3);
    if(side)arm(15,p.arm);
  });
}
export function paintShip(ctx,x,y,motion,now,size=42,parked=false,zoom=1) {
  ctx.save();ctx.translate(Math.round(x),Math.round(y));
  ctx.rotate(parked?0:(motion.heading||0)+Math.PI/2);
  const unit=size/40*zoom;ctx.scale(unit,unit);ctx.imageSmoothingEnabled=false;
  if(!parked && motion.thrust>.05){
    const flame=Math.round((5+Math.sin(now*.045)*2)*motion.thrust+4);
    for(const engine of [-5.5,5.5]){
      ctx.fillStyle='#297bba';ctx.fillRect(engine-3,14,6,flame+3);
      ctx.fillStyle='#63ded6';ctx.fillRect(engine-2,14,4,flame);
      ctx.fillStyle='#efffd9';ctx.fillRect(engine-1,14,2,Math.max(2,flame-3));
    }
  }
  ctx.drawImage(shipSprite(),-16,-20);ctx.restore();
}
export function paintAstronaut(ctx,x,y,motion,zoom=1) {
  ctx.save();ctx.imageSmoothingEnabled=false;
  // Feet are the world-space anchor. Scale the entire sprite and shadow once.
  ctx.translate(Math.round(x),Math.round(y));ctx.scale(ASTRONAUT_SCALE*zoom,ASTRONAUT_SCALE*zoom);
  ctx.fillStyle='#071a2866';ctx.fillRect(-10,-1,20,3);ctx.fillRect(-7,-2,14,5);
  ctx.drawImage(astronautSprite(motion.direction||'down',astronautFrame(motion)),-16,-37);
  ctx.restore();
}
