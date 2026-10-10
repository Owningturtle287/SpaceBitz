export const FLIGHT_STAGES=Object.freeze(['orbit','hyper','warp']);
export function flightStage(scene,mode,autopilot){
  if(scene==='chart')return 2;
  if(autopilot)return autopilot.drive==='orbit'?0:1;
  return mode==='hyper'?1:0;
}
export function isLandscape(width,height){return width>=height;}
