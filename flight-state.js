import {bodyPosition,visualRadius} from './model.js';
import {SYSTEM_VISUAL_SCALE} from './scale.js';

// Layer changes share one reset, including the input context used by the slider.
export function resetFlightContext(state,scene){
  state.flightContext++;
  Object.assign(state,{coordinateTap:null,terminal:null,terminalRecordKey:null,terminalExpanded:false,followPanRemaining:0,
    waypoint:null,focusBody:null,centerZoom:null,centerReady:false,panUntil:0,followBody:null,
    warpUntil:0,autopilot:null,contextPlacement:null});
  state.shipMotion.thrust=0;
  if(scene){state.scene=scene;state.save.scene=scene;}
}
const bodies=system=>system.planets.flatMap(p=>[p,...p.moons]);
export function stationAnchor(save,system){
  if(save.scene!=='system')return null;
  if(save.station?.system===system.seed){
    const body=[...bodies(system),...(system.stars||[system.star])].find(b=>b.id===save.station.id);
    if(body)return {id:body.id,x:save.station.x,y:save.station.y};
  }
  // Infer older saves using their saved date, before advancing the real-time clock.
  return bodies(system).map(body=>{const p=bodyPosition(body,save.days,system);return {body,p,d:Math.hypot(save.ship.x-p.x,save.ship.y-p.y)};})
    .filter(v=>v.d<visualRadius(v.body.diameter)+100*SYSTEM_VISUAL_SCALE).sort((a,b)=>a.d-b.d)
    .map(v=>({id:v.body.id,x:save.ship.x-v.p.x,y:save.ship.y-v.p.y}))[0]||null;
}
export function applyStationAnchor(save,system,anchor){
  if(!anchor)return;
  const body=[...bodies(system),...(system.stars||[system.star])].find(b=>b.id===anchor.id);if(!body)return;
  const p=bodyPosition(body,save.days,system);save.ship={x:p.x+anchor.x,y:p.y+anchor.y};
}
