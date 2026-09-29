import {TAU,bodyPosition,orbitalElements,visualRadius} from './model.js';
import {SURFACE_UNIT,CHART_UNIT,SYSTEM_UNIT,SYSTEM_VISUAL_SCALE,SYSTEM_MIN_ZOOM,HYPERDRIVE_AU_PER_SECOND,ORBIT_DRIVE_LS_PER_SECOND,LIGHT_SECONDS_PER_AU} from './scale.js';

export function centerZoomAt(from,to,progress){
  const t=Math.max(0,Math.min(1,progress)),ease=t*t*(3-2*t);
  return from*Math.pow(to/from,ease);
}

// Couple pan to the changing visible world span. This avoids sweeping millions
// of world units across a close-up before the zoom has opened up the view.
export function cameraViewAt(fromCamera,toCamera,fromZoom,toZoom,progress){
  const t=Math.max(0,Math.min(1,progress)),ease=t*t*(3-2*t);
  if(t===1)return {zoom:toZoom,camera:{...toCamera}};
  const zoom=centerZoomAt(fromZoom,toZoom,t);
  const ratio=fromZoom/toZoom;
  const pan=Math.abs(ratio-1)<1e-6?ease:Math.max(0,Math.min(1,(fromZoom/zoom-1)/(ratio-1)));
  return {zoom,camera:{x:fromCamera.x+(toCamera.x-fromCamera.x)*pan,y:fromCamera.y+(toCamera.y-fromCamera.y)*pan}};
}

export function systemFitZoom(system,width,height,days=0){
  const reach=Math.max(...system.planets.map(p=>{const o=orbitalElements(p,days);return o.a*(1+o.e)*1.1;}));
  return Math.max(SYSTEM_MIN_ZOOM,Math.min(width,height)*.42/reach);
}
export function travelSpeed(scene,distance,drive='hyper'){
  if(scene==='surface')return SURFACE_UNIT*2.2;
  if(scene==='chart')return CHART_UNIT*9;
  // Constant world-space hyperdrive velocity. The final integration step clamps
  // to the arrival boundary, so nearby destinations cannot be overshot.
  return SYSTEM_UNIT*(drive==='orbit'?ORBIT_DRIVE_LS_PER_SECOND:LIGHT_SECONDS_PER_AU*HYPERDRIVE_AU_PER_SECOND);
}
export function migrateLayout(save,system){
  if(save.layoutVersion===4)return save;
  if(save.layoutVersion===3){
    save.ship={x:save.ship.x*SYSTEM_VISUAL_SCALE,y:save.ship.y*SYSTEM_VISUAL_SCALE};
    save.layoutVersion=4;return save;
  }
  // Preserve progress and local surface/chart locations. Rehome an old compressed
  // ship position beside its nearest legacy planet, never inside the larger star.
  const oldRadius=km=>Math.max(3,12*Math.pow(km/12742,.85));
  const ship=save.ship||{x:0,y:0},days=save.days||0;
  const nearest=system.planets.map(body=>{
    const o=orbitalElements(body,days),M=((o.M%TAU)+TAU)%TAU;let E=M;
    for(let i=0;i<8;i++)E-=(E-o.e*Math.sin(E)-M)/(1-o.e*Math.cos(E));
    const v=Math.atan2(Math.sqrt(1-o.e*o.e)*Math.sin(E),Math.cos(E)-o.e);
    const angle=body.ephemeris?v+o.peri:body.phase+TAU*days/body.period;
    const oldOrbit=save.layoutVersion===2?oldRadius(system.star.diameter)+180+900*Math.log1p(body.au*2):160+275*Math.log1p(body.au*2);
    const radius=oldOrbit*(body.ephemeris?1-o.e*Math.cos(E):1);
    return {body,d:Math.hypot(ship.x-Math.cos(angle)*radius,ship.y-Math.sin(angle)*radius)};
  }).sort((a,b)=>a.d-b.d)[0].body;
  const p=bodyPosition(nearest,days,system);
  save.ship={x:p.x+visualRadius(nearest.diameter)+60,y:p.y};
  save.layoutVersion=4;return save;
}

// Stop on the ship-facing side, clear of the stellar avoidance envelope.
export function starApproachPoint(ship,radius){
  const angle=Math.atan2(ship.y,ship.x),distance=radius*1.08+150;
  return {x:Math.cos(angle)*distance,y:Math.sin(angle)*distance};
}

// Manual control is a world-space speed; camera zoom never changes it.
export function manualSpeed(scene,mode='maneuver'){
  return scene==='surface'?SURFACE_UNIT*2.2:scene==='chart'?CHART_UNIT*4.5:mode==='cruise'?SYSTEM_UNIT*20:260*SYSTEM_VISUAL_SCALE;
}

export function outermostPlanet(system,days=0){
  return system.planets.reduce((outer,body)=>!outer||orbitalElements(body,days).a>orbitalElements(outer,days).a?body:outer,null);
}

// A local transfer stays in the same planet/moon family. Freeze the choice at
// departure so the speed never changes as the ship approaches its destination.
export function systemDrive(ship,target,system,days=0,sourceId=null){
  if(!target||target.kind==='star')return 'hyper';
  const host=target.kind==='moon'?system.planets.find(p=>p.id===target.parent):target;
  if(!host?.moons?.length)return 'hyper';
  const family=[host,...host.moons];
  if(sourceId)return family.some(b=>b.id===sourceId)?'orbit':'hyper';
  const center=bodyPosition(host,days,system);
  const reach=Math.max(visualRadius(host.diameter),...host.moons.map(m=>{const o=orbitalElements(m,days);return o.a*(1+o.e)+visualRadius(m.diameter);})) + 100*SYSTEM_VISUAL_SCALE;
  return Math.hypot(ship.x-center.x,ship.y-center.y)<=reach?'orbit':'hyper';
}

// Integrate and report arrival in this same frame, before an orbit can advance.
export function advanceToArrival(point,goal,arrival,speed,seconds){
  const dx=goal.x-point.x,dy=goal.y-point.y,d=Math.hypot(dx,dy);
  const remaining=Math.max(0,d-arrival),step=Math.min(remaining,speed*seconds);
  if(d>0){point.x+=dx/d*step;point.y+=dy/d*step;}
  return remaining<=step+.2;
}
