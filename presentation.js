import {lineInView} from './rendering.js';
export function chartStyle(star){
  const luminosity=Math.max(1e-12,star.luminosity||1e-12),radius=star.radiusSolar||star.diameter/1391400;
  const size=Math.max(1.5,Math.min(9,3.5+Math.log10(luminosity)*.65+Math.log10(Math.max(.00001,radius))*.45));
  return {radius:size,brightness:star.family==='brown'?Math.max(.045,Math.min(.55,(star.temperature/2300)**2)):Math.max(.15,Math.min(1,.75+Math.log10(luminosity)*.09)),color:star.color};
}
export function paintHomeMarker(ctx,x,y,radius=6,width=ctx.canvas.width,height=ctx.canvas.height){
  const r=Math.max(7,radius+5),points=[[-r,r],[-r,-r],[0,-r*1.6],[r,-r],[r,r],[-r,r]].map(([dx,dy])=>({x:Math.round(x+dx),y:Math.round(y+dy)}));
  ctx.save();ctx.strokeStyle='#75ee98';ctx.lineWidth=1;ctx.setLineDash([]);ctx.beginPath();
  for(let i=1;i<points.length;i++)lineInView(ctx,points[i-1],points[i],width,height);
  ctx.stroke();ctx.restore();
}
