import {TAU,bodyPosition,orbitalElements,visualRadius,orbitRadius} from '../universe/model.js';
import {SURFACE_UNIT,CHART_UNIT,SYSTEM_UNIT,SYSTEM_VISUAL_SCALE,SYSTEM_MIN_ZOOM,HYPERDRIVE_AU_PER_SECOND,ORBIT_DRIVE_LS_PER_SECOND,LIGHT_SECONDS_PER_AU} from '../core/scale.js';

export function centerZoomAt(from,to,progress){
  const t=Math.max(0,Math.min(1,progress)),ease=t*t*(3-2*t);
  if(t===0)return from;
  if(t===1)return to;
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
  return Math.min(width,height)*.42/systemExtent(system,days);
}
// Conservative all-phase bounds for every node, orbit and satellite. No fixed
// lower zoom can exclude a very wide hierarchy; fit and gesture bounds agree.
export function systemExtent(system,days=0){
  const stars=system.stars||[system.star],nodes=new Map([...stars,...(system.binaries||[])].map(n=>[n.id,n])),bounds=new Map();
  let reach=1;
  function visit(id,offset){
    const node=nodes.get(id);if(!node)return;bounds.set(id,offset);
    if(node.kind!=='binary'){reach=Math.max(reach,offset+visualRadius(node.diameter)*1.5);return;}
    const span=orbitRadius(node.au)*(1+node.eccentricity);
    visit(node.left,offset+span*node.mu);visit(node.right,offset+span*(1-node.mu));
  }
  visit(system.rootId||system.star.id,0);
  for(const body of system.planets){const o=orbitalElements(body,days),offset=bounds.get(body.orbitHost)||0;
    const moons=Math.max(0,...body.moons.map(m=>m.orbitKm*(1+(m.eccentricity||0))*visualRadius(2)+visualRadius(m.diameter)));
    reach=Math.max(reach,offset+o.a*(1+o.e)+Math.max(visualRadius(body.diameter),moons));}
  return reach;
}
export const systemMinZoom=(system,width,height,days=0)=>systemFitZoom(system,width,height,days)*.25;
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
  }).sort((a,b)=>a.d-b.d)[0]?.body||system.star;
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
export function manualSpeed(scene,mode='orbit'){
  return travelSpeed(scene,0,mode==='hyper'?'hyper':'orbit');
}

export function outermostPlanet(system,days=0){
  return system.planets.filter(body=>body.kind==='planet').reduce((outer,body)=>!outer||orbitalElements(body,days).a>orbitalElements(outer,days).a?body:outer,null);
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

// Seed the first leg with its departure system, including older empty routes.
export function recordTravel(save,departure,arrival){
  save.route||=[];
  if(!save.route.length&&departure)save.route.push(departure);
  if(arrival&&save.route.at(-1)!==arrival)save.route.push(arrival);
  save.route=save.route.slice(-40);
}
