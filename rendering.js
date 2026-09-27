// Keep GPU paths in screen space. Physical orbits can be millions of pixels
// wide; clipping the canvas alone does not bound tessellation or dash generation.
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function clipSegment(a,b,width,height,pad=2){
  const dx=b.x-a.x,dy=b.y-a.y;let lo=0,hi=1;
  const p=[-dx,dx,-dy,dy],q=[a.x+pad,width+pad-a.x,a.y+pad,height+pad-a.y];
  for(let i=0;i<4;i++){
    if(p[i]===0){if(q[i]<0)return null;continue;}
    const t=q[i]/p[i];if(p[i]<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
    if(lo>hi)return null;
  }
  return [{x:a.x+lo*dx,y:a.y+lo*dy},{x:a.x+hi*dx,y:a.y+hi*dy}];
}
export function lineInView(ctx,a,b,width,height){
  const line=clipSegment(a,b,width,height);if(!line)return;
  ctx.moveTo(line[0].x,line[0].y);ctx.lineTo(line[1].x,line[1].y);
}
export function ellipseInView(e,width,height,pad=3){
  const {x,y,ux,uy,vx,vy}=e;
  if(![x,y,ux,uy,vx,vy,width,height].every(Number.isFinite))return [];
  const cuts=[0,TAU],rx=Math.hypot(ux,vx),ry=Math.hypot(uy,vy);
  if(x+rx<-pad||x-rx>width+pad||y+ry<-pad||y-ry>height+pad)return [];
  const intersect=(a,b,c)=>{
    const radius=Math.hypot(a,b);if(!radius||Math.abs(c)>radius)return;
    const phase=Math.atan2(b,a),angle=Math.acos(clamp(c/radius,-1,1));
    for(const t of [phase-angle,phase+angle])cuts.push((t%TAU+TAU)%TAU);
  };
  for(const edge of [-pad,width+pad])intersect(ux,vx,edge-x);
  for(const edge of [-pad,height+pad])intersect(uy,vy,edge-y);
  cuts.sort((a,b)=>a-b);
  const at=t=>({x:x+ux*Math.cos(t)+vx*Math.sin(t),y:y+uy*Math.cos(t)+vy*Math.sin(t)});
  // Subpixel chord error, evaluated only on the visible angular intervals.
  const radius=Math.hypot(ux,uy,vx,vy),step=Math.min(Math.PI/12,Math.sqrt(2/Math.max(1,radius)));
  const paths=[];
  for(let i=1;i<cuts.length;i++){
    const start=cuts[i-1],end=cuts[i],p=at((start+end)/2);
    if(end-start<1e-12||p.x<-pad||p.x>width+pad||p.y<-pad||p.y>height+pad)continue;
    const count=Math.min(512,Math.max(1,Math.ceil((end-start)/step))),path=[];
    for(let j=0;j<=count;j++){
      const p=at(start+(end-start)*j/count);
      path.push({x:clamp(p.x,-pad,width+pad),y:clamp(p.y,-pad,height+pad)});
    }
    paths.push(path);
  }
  return paths;
}
export function strokeEllipse(ctx,e,width,height){
  ctx.beginPath();
  for(const path of ellipseInView(e,width,height,Math.min(64,ctx.lineWidth/2+2))){
    ctx.moveTo(path[0].x,path[0].y);for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].y);
  }
  ctx.stroke();
}
export const circleGeometry=(x,y,r)=>({x,y,ux:r,uy:0,vx:0,vy:r});
export function circleRange(x,y,width,height){
  return {min:Math.hypot(x-clamp(x,0,width),y-clamp(y,0,height)),
    max:Math.max(...[[0,0],[width,0],[0,height],[width,height]].map(([a,b])=>Math.hypot(x-a,y-b)))};
}
export function fillAnnulus(ctx,x,y,inner,outer,width,height){
  const range=circleRange(x,y,width,height);
  if(outer<range.min||inner>range.max)return;
  if(outer>=range.max&&inner<=range.min){ctx.fillRect(0,0,width,height);return;}
  // Faint zone shading uses bounded 2px scanlines, including close-up views.
  for(let row=0;row<height;row+=2){
    const dy=row+1-y;if(Math.abs(dy)>=outer)continue;
    const span=Math.sqrt(Math.max(0,(outer-dy)*(outer+dy))),left=Math.max(0,x-span),right=Math.min(width,x+span);
    if(right<=left)continue;
    const hole=Math.abs(dy)<inner?Math.sqrt(Math.max(0,(inner-dy)*(inner+dy))):0;
    const paint=(a,b)=>{if(b>a)ctx.fillRect(a,row,b-a,Math.min(2,height-row));};
    if(hole){paint(left,Math.min(right,x-hole));paint(Math.max(left,x+hole),right);}else paint(left,right);
  }
}
export function fillDisk(ctx,x,y,r,width,height){
  if(r<0||!Number.isFinite(r))return;
  if(r<=Math.max(width,height)*2){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
  else fillAnnulus(ctx,x,y,0,r,width,height);
}
export function drawImageInView(ctx,image,x,y,width,height,viewWidth,viewHeight){
  const left=Math.max(0,x),top=Math.max(0,y),right=Math.min(viewWidth,x+width),bottom=Math.min(viewHeight,y+height);
  if(right<=left||bottom<=top||width<=0||height<=0)return;
  ctx.drawImage(image,(left-x)/width*image.width,(top-y)/height*image.height,
    (right-left)/width*image.width,(bottom-top)/height*image.height,left,top,right-left,bottom-top);
}
export function clearFrame(ctx,width,height,dpr=1){
  // Explicitly discard the previous frame's native transform before applying DPR.
  ctx.resetTransform();
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  ctx.shadowBlur=0;ctx.shadowColor='transparent';ctx.filter='none';ctx.setLineDash([]);
  ctx.fillStyle='#000104';ctx.fillRect(0,0,width,height);
}
export function backgroundPosition(star,now,width,height,drift=true){
  const motion=drift?now*.004*star.speed:0;
  return {x:((star.x*width+motion)%width+width)%width,y:((star.y*height+motion*.22)%height+height)%height};
}
