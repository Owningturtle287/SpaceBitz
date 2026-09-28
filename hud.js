const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function overlaps(a,b,gap=6){return a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;}
export function placeControls(desired,size,viewport,obstacles){
  const fit=p=>({x:clamp(p.x,8,viewport.width-size.width-8),y:clamp(p.y,8,viewport.height-size.height-8),...size});
  const candidates=[desired];
  const xs=[8,viewport.width-size.width-8,desired.x],ys=[8,viewport.height-size.height-8,desired.y];
  for(const b of obstacles){xs.push(b.x-size.width-8,b.x+b.width+8);ys.push(b.y-size.height-8,b.y+b.height+8);}
  for(const x of xs)for(const y of ys)candidates.push({x,y});
  return candidates.map(fit).sort((a,b)=>{
    const score=p=>obstacles.filter(o=>overlaps(p,o)).length*1e9+Math.hypot(p.x-desired.x,p.y-desired.y);
    return score(a)-score(b);
  })[0];
}
export function locatorPoint(x,y,width,height){
  const margin=24,cx=width/2,cy=height/2,dx=x-cx,dy=y-cy;
  const off=x<margin||x>width-margin||y<margin||y>height-margin;
  const ratio=off?Math.min((cx-margin)/Math.max(.001,Math.abs(dx)),(cy-margin)/Math.max(.001,Math.abs(dy))):1;
  return {x:off?cx+dx*ratio:x,y:off?cy+dy*ratio:y,angle:Math.atan2(dy,dx),off};
}
export function paintLocator(ctx,x,y,size,width,height){
  const p=locatorPoint(x,y,width,height);if(!p.off&&size>=8)return;
  ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.strokeStyle='#adffe9';ctx.lineWidth=1.5;
  ctx.fillStyle='#071522cc';ctx.fillRect(-9,-9,18,18);
  if(p.off){ctx.rotate(p.angle);ctx.beginPath();ctx.moveTo(-4,-5);ctx.lineTo(5,0);ctx.lineTo(-4,5);ctx.stroke();ctx.rotate(-p.angle);}
  else{ctx.strokeRect(-6,-6,12,12);ctx.fillStyle='#dffff1';ctx.fillRect(-1,-1,2,2);}
  ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle='#bdffe9';ctx.fillText('SHIP',0,19);ctx.restore();
}
