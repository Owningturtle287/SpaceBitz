export const DEFAULT_SETTINGS=Object.freeze({
  version:12,music:true,volume:.75,zone:true,orbits:true,labels:true,
  starMotion:true,twinkle:true,reducedMotion:false,showClock:true,showCoords:true,showGrid:false,showFPS:false,showSpeed:false,flightMode:'maneuver',
  travelLines:true,controls:'auto',joyX:16,joyOffset:0,pixelSize:2,
  resolution:'2',paused:false,cheats:false,timeMode:'accelerated',timeZone:'local',orientation:'landscape',
  centerButton:'right',centerX:29,centerY:76,
  dashboardHeight:74,dashboardResizeHandle:false,terminalWidthScale:100,terminalHeightScale:100,terminalResizeHandles:false
});
export function normalizeSettings(raw={}) {
  if(!raw||typeof raw!=='object')raw={};
  const out={...DEFAULT_SETTINGS};
  for(const key of Object.keys(out))if(typeof out[key]==='boolean'&&typeof raw[key]==='boolean')out[key]=raw[key];
  for(const [key,min,max] of [['volume',0,1],['joyX',8,92],['joyOffset',-70,120],['centerX',2,98],['centerY',2,98],['dashboardHeight',74,260],['terminalWidthScale',60,240],['terminalHeightScale',40,130]])
    if(Number.isFinite(raw[key]))out[key]=Math.min(max,Math.max(min,raw[key]));
  for(const [key,values] of [
    ['controls',['auto','touch','desktop']],['flightMode',['maneuver','cruise']],
    ['resolution',['auto','1','2']],['pixelSize',[2,3,4]],['timeMode',['accelerated','realtime']],
    ['orientation',['auto','landscape','portrait']],['centerButton',['right','above','custom','hidden']]
  ]) if(values.includes(raw[key]))out[key]=raw[key];
  if(typeof raw.timeZone==='string'&&raw.timeZone.length<=80)out.timeZone=raw.timeZone;
  // Lower the previous default while retaining deliberately resized dashboards.
  if(raw.version===11&&raw.dashboardHeight===80)out.dashboardHeight=DEFAULT_SETTINGS.dashboardHeight;
  return out;
}
