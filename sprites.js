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
export function astronautSprite(direction='down',frame=0) {
  return makeSprite(`suit:${direction}:${frame}`,24,34,g=>{
    const box=(color,x,y,w,h)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
    const stride=[0,1,0,-1][frame%4],side=direction==='left'||direction==='right',back=direction==='up';
    if(direction==='left'){g.translate(24,0);g.scale(-1,1);}
    box('#061924',7,29+stride,5,3);box('#061924',13,29-stride,5,3);
    box('#7d9dad',8,24+stride,4,6);box('#d0dfdc',13,24-stride,4,6);
    box('#173e54',6,15,13,11);box('#b6cac9',8,15,10,11);
    box('#e0e9d7',8,15,3,10);box('#7da1ac',16,17,3,7);
    box('#d4aa68',8,24,10,2);
    box('#0c2a3d',6,4,13,3);box('#15354a',4,7,17,8);box('#15354a',7,15,11,2);
    box('#e4e5d0',7,5,11,2);box('#e4e5d0',5,7,15,7);box('#b3c8c9',7,14,11,2);
    if(back){box('#7797a5',8,7,9,6);box('#d6a562',10,6,5,2);
      box('#1b3f55',8,17,10,7);box('#5c8d9b',9,17,7,5);box('#74e3cb',11,18,3,1);
    }else{
      box('#0b2b43',side?12:7,8,side?8:11,5);
      box('#3495b3',side?14:8,8,side?5:9,4);
      box('#90e2de',side?17:8,8,side?2:5,1);box('#f5ffe6',side?18:8,9,1,1);
      if(side){box('#244559',5,17,5,8);box('#7a9da8',6,17,3,6);}
      else{box('#36596a',11,17,5,4);box('#72dfc9',12,18,2,1);}
    }
    box('#97b8bd',side?16:4,17-stride,4,7);box('#294858',side?16:4,23-stride,4,3);
    if(!side){box('#cfddce',18,17+stride,3,7);box('#294858',18,23+stride,3,3);}
  });
}
export function paintShip(ctx,x,y,motion,now,size=42,parked=false) {
  ctx.save();ctx.translate(Math.round(x),Math.round(y));
  ctx.rotate(parked?0:(motion.heading||0)+Math.PI/2);
  const unit=size/40;ctx.scale(unit,unit);ctx.imageSmoothingEnabled=false;
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
export function paintAstronaut(ctx,x,y,motion) {
  const frame=motion.moving?Math.floor((motion.steps||0)/7)%4:0;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#071a2866';ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y)+17,12,4,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(astronautSprite(motion.direction||'down',frame),Math.round(x)-18,Math.round(y)-28,36,51);
  ctx.restore();
}
