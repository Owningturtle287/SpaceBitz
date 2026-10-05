import {placeControls} from './hud.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function coordinateHeading(ship,target,fallback=-Math.PI/2){
  const dx=target.x-ship.x,dy=target.y-ship.y;
  // The pixel glyph points up; world +Y and CSS rotation both point down/clockwise.
  return (Math.hypot(dx,dy)>1e-9?Math.atan2(dy,dx):fallback)*180/Math.PI+90;
}
export function contextPosition(target,radius,size,viewport,obstacles=[]){
  const margin=8,w=Math.min(size.width,viewport.width-margin*2),h=size.height;
  const x=clamp(target.x,margin,viewport.width-margin),y=clamp(target.y,margin,viewport.height-margin);
  const gap=Math.min(Math.max(radius,8),Math.max(viewport.width,viewport.height))+12;
  const candidates=[{x:x-w/2,y:y-gap-h},{x:x+gap,y:y-h/2},{x:x-w/2,y:y+gap},{x:x-w-gap,y:y-h/2}];
  const rect=candidates.find(p=>p.x>=margin&&p.y>=margin&&p.x+w<=viewport.width-margin&&p.y+h<=viewport.height-margin&&!obstacles.some(o=>p.x<o.x+o.width+4&&p.x+w>o.x-4&&p.y<o.y+o.height+4&&p.y+h>o.y-4));
  return rect||placeControls({x:clamp(candidates[0].x,margin,viewport.width-w-margin),y:clamp(candidates[0].y,margin,viewport.height-h-margin)},{width:w,height:h},viewport,obstacles);
}
