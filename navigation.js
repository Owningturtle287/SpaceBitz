import {TAU,bodyPosition,orbitalElements,visualRadius} from './model.js';
import {SURFACE_UNIT,CHART_UNIT,SYSTEM_UNIT} from './scale.js';

export function centerZoomAt(from,to,progress){
  const t=Math.max(0,Math.min(1,progress)),ease=t*t*(3-2*t);
  return from*Math.pow(to/from,ease);
}

export function systemFitZoom(system,width,height,days=0){
  const reach=Math.max(...system.planets.map(p=>{const o=orbitalElements(p,days);return o.a*(1+o.e)*1.1;}));
  return Math.max(.000001,Math.min(width,height)*.42/reach);
}
export function travelSpeed(scene,distance){
  if(scene==='surface')return SURFACE_UNIT*2.2;
  if(scene==='chart')return CHART_UNIT*9;
  // Cruise across true-scale systems in seconds, then brake for arrival.
  return Math.max(320,Math.min(SYSTEM_UNIT*1500,distance*1.5));
}
export function migrateLayout(save,system){
  if(save.layoutVersion===3)return save;
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
  save.layoutVersion=3;return save;
}

// Stop on the ship-facing side, clear of the stellar avoidance envelope.
export function starApproachPoint(ship,radius){
  const angle=Math.atan2(ship.y,ship.x),distance=radius*1.08+150;
  return {x:Math.cos(angle)*distance,y:Math.sin(angle)*distance};
}

// Manual control is a world-space speed; camera zoom never changes it.
export function manualSpeed(scene,mode='maneuver'){
  return scene==='surface'?SURFACE_UNIT*2.2:scene==='chart'?CHART_UNIT*4.5:mode==='cruise'?SYSTEM_UNIT*20:260;
}
