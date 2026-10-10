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
  const margin=16,cx=width/2,cy=height/2,dx=x-cx,dy=y-cy;
  const off=x<0||x>width||y<0||y>height;
  const ratio=off?Math.min((cx-margin)/Math.max(.001,Math.abs(dx)),(cy-margin)/Math.max(.001,Math.abs(dy))):1;
  return {x:off?cx+dx*ratio:x,y:off?cy+dy*ratio:y,angle:Math.atan2(dy,dx),off};
}
export function paintLocator(ctx,x,y,size,width,height,showTiny=false,heading=0){
  const p=locatorPoint(x,y,width,height);
  if(!p.off){
    if(!showTiny||size>=4)return;
    ctx.save();ctx.translate(Math.round(x),Math.round(y));
    ctx.save();ctx.rotate(heading+Math.PI/2);
    ctx.strokeStyle='#9cddff';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(5,6);ctx.lineTo(-5,6);ctx.closePath();ctx.stroke();ctx.restore();
    ctx.fillStyle='#d5f5ff';ctx.fillRect(-1,-1,2,2);
    ctx.font="9px 'SpaceBitz Pixel',monospace";ctx.textAlign='center';ctx.fillText('SHIP',0,-13);ctx.restore();return;
  }
  ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.rotate(p.angle);
  ctx.fillStyle='#9cddff';ctx.strokeStyle='#17384d';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-6,-6);ctx.lineTo(-3,0);ctx.lineTo(-6,6);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
