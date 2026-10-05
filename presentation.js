export function chartStyle(star){
  const luminosity=Math.max(1e-12,star.luminosity||1e-12),radius=star.radiusSolar||star.diameter/1391400;
  const size=Math.max(1.5,Math.min(9,3.5+Math.log10(luminosity)*.65+Math.log10(Math.max(.00001,radius))*.45));
  return {radius:size,brightness:star.family==='brown'?Math.max(.045,Math.min(.55,(star.temperature/2300)**2)):Math.max(.15,Math.min(1,.75+Math.log10(luminosity)*.09)),color:star.color};
}
export function paintHomeMarker(ctx,x,y,radius=6,width=ctx.canvas.width,height=ctx.canvas.height){
  // A fixed ten-pixel silhouette sits clear of the upper limb at every zoom.
  const left=Math.round(x-5),top=Math.round(y-Math.max(3,radius)-16);
  if(left+10<0||left>width||top+10<0||top>height)return;
  const points=[[0,4],[1,4],[1,3],[2,3],[2,2],[3,2],[3,1],[4,1],[4,0],[6,0],[6,1],[7,1],[7,2],[8,2],[8,3],[9,3],[9,4],[10,4],[10,5],[9,5],[9,10],[1,10],[1,5],[0,5]];
  ctx.save();ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.fillStyle='#75ee98';ctx.beginPath();ctx.moveTo(left+points[0][0],top+points[0][1]);
  for(const [dx,dy]of points.slice(1))ctx.lineTo(left+dx,top+dy);
  ctx.closePath();ctx.fill();ctx.restore();
}
export function paintPixelFrame(ctx,x,y,width,height){
  const left=Math.round(x)+.5,top=Math.round(y)+.5,right=left+Math.round(width)-1,bottom=top+Math.round(height)-1;
  const points=[[left+4,top],[right-4,top],[right-4,top+2],[right-2,top+2],[right-2,top+4],[right,top+4],[right,bottom-4],[right-2,bottom-4],[right-2,bottom-2],[right-4,bottom-2],[right-4,bottom],[left+4,bottom],[left+4,bottom-2],[left+2,bottom-2],[left+2,bottom-4],[left,bottom-4],[left,top+4],[left+2,top+4],[left+2,top+2],[left+4,top+2]];
  ctx.beginPath();ctx.moveTo(...points[0]);for(const point of points.slice(1))ctx.lineTo(...point);ctx.closePath();ctx.stroke();
}
