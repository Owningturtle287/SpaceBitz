export const DEFAULT_SETTINGS=Object.freeze({
  version:15,music:true,volume:.75,zone:true,orbits:true,labels:true,
  starMotion:true,twinkle:true,reducedMotion:false,showClock:true,showCoords:true,showGrid:false,showFPS:false,showSpeed:false,flightMode:'orbit',
  travelLines:true,controls:'auto',joyX:16,joyOffset:0,pixelSize:2,
  resolution:'2',paused:false,cheats:false,timeMode:'accelerated',timeZone:'local',
  centerButton:'right',centerX:29,centerY:76,
  dashboardHeight:68,dashboardResizeHandle:false,terminalWidthScale:100,terminalHeightScale:100,terminalResizeHandles:false,
  terminalFontMode:'individual',terminalFontSize:11,terminalDataFont:9,terminalLabelFont:7,terminalHeaderFont:11,terminalStatusFont:11,terminalInputFont:9,
  logWidthScale:100,logHeightScale:100,logResizeHandles:false,logFontMode:'individual',logFontSize:11,logDataFont:9,logLabelFont:7,logHeaderFont:11,logStatusFont:11
});
export function normalizeSettings(raw={}) {
  if(!raw||typeof raw!=='object')raw={};
  const out={...DEFAULT_SETTINGS};
  for(const key of Object.keys(out))if(typeof out[key]==='boolean'&&typeof raw[key]==='boolean')out[key]=raw[key];
  for(const [key,min,max] of [['volume',0,1],['joyX',8,92],['joyOffset',-70,120],['centerX',2,98],['centerY',2,98],['dashboardHeight',68,260],['terminalWidthScale',60,240],['terminalHeightScale',40,130],['logWidthScale',50,140],['logHeightScale',40,140],...Object.keys(out).filter(key=>/Font(Size)?$/.test(key)).map(key=>[key,6,18])])
    if(Number.isFinite(raw[key]))out[key]=Math.min(max,Math.max(min,raw[key]));
  for(const [key,values] of [
    ['controls',['auto','touch','desktop']],['flightMode',['orbit','hyper']],
    ['resolution',['auto','1','2']],['pixelSize',[2,3,4]],['timeMode',['accelerated','realtime']],
    ['centerButton',['right','above','custom','hidden']],['terminalFontMode',['individual','master']],['logFontMode',['individual','master']]
  ]) if(values.includes(raw[key]))out[key]=raw[key];
  if(typeof raw.timeZone==='string'&&raw.timeZone.length<=80)out.timeZone=raw.timeZone;
  if(raw.flightMode==='cruise')out.flightMode='hyper';
  // Lower the previous default while retaining deliberately resized dashboards.
  if(raw.version===11&&raw.dashboardHeight===80||raw.version===12&&raw.dashboardHeight===74)out.dashboardHeight=DEFAULT_SETTINGS.dashboardHeight;
  return out;
}
