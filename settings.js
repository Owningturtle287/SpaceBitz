export const DEFAULT_SETTINGS=Object.freeze({
  version:2,music:true,volume:.65,zone:true,orbits:true,labels:true,
  starMotion:true,twinkle:true,reducedMotion:false,showCoords:false,showFPS:false,
  travelLines:true,units:'km',controls:'auto',joyX:16,joyOffset:0,pixelSize:3,
  resolution:'auto',paused:false,cheats:false
});
export function normalizeSettings(raw={}) {
  if(!raw||typeof raw!=='object')raw={};
  const out={...DEFAULT_SETTINGS};
  for(const key of Object.keys(out))if(typeof out[key]==='boolean'&&typeof raw[key]==='boolean')out[key]=raw[key];
  for(const [key,min,max] of [['volume',0,1],['joyX',8,92],['joyOffset',-70,120]])
    if(Number.isFinite(raw[key]))out[key]=Math.min(max,Math.max(min,raw[key]));
  for(const [key,values] of [['units',['km','mi']],['controls',['auto','touch','desktop']],['resolution',['auto','1','2']],['pixelSize',[2,3,4]]])
    if(values.includes(raw[key]))out[key]=raw[key];
  // The old "days per second" preference is intentionally never carried over.
  return out;
}
