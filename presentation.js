export function chartStyle(star){
  const luminosity=Math.max(1e-12,star.luminosity||1e-12),radius=star.radiusSolar||star.diameter/1391400;
  const size=Math.max(1.5,Math.min(9,3.5+Math.log10(luminosity)*.65+Math.log10(Math.max(.00001,radius))*.45));
  return {radius:size,brightness:star.family==='brown'?Math.max(.045,Math.min(.55,(star.temperature/2300)**2)):Math.max(.15,Math.min(1,.75+Math.log10(luminosity)*.09)),color:star.color};
}
export function paintHomeMarker(ctx,x,y,radius=6){
  const r=Math.min(12,Math.max(7,radius+5));ctx.save();ctx.strokeStyle='#75ee98';ctx.lineWidth=1;ctx.setLineDash([]);
  ctx.beginPath();ctx.moveTo(Math.round(x-r),Math.round(y+r));ctx.lineTo(Math.round(x-r),Math.round(y-r/3));ctx.lineTo(Math.round(x),Math.round(y-r));ctx.lineTo(Math.round(x+r),Math.round(y-r/3));ctx.lineTo(Math.round(x+r),Math.round(y+r));ctx.lineTo(Math.round(x+3),Math.round(y+r));ctx.lineTo(Math.round(x+3),Math.round(y+r-5));ctx.lineTo(Math.round(x-3),Math.round(y+r-5));ctx.lineTo(Math.round(x-3),Math.round(y+r));ctx.closePath();ctx.stroke();ctx.restore();
}
