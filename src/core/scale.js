// Immutable scene scales. Display preferences never change these conversions.
export const AU_KM=149597870.7;
export const LIGHT_SECONDS_PER_AU=500; // Intentional SpaceBitz convention.
export const SUN_DIAMETER_KM=1391400;
// v1.7: enlarge all system geometry tenfold; physical data and ship art stay unchanged.
export const SYSTEM_VISUAL_SCALE=10;
export const SYSTEM_MIN_ZOOM=1e-8;
export const HYPERDRIVE_AU_PER_SECOND=.5;
export const ORBIT_DRIVE_LS_PER_SECOND=.1;
export const SOL_RADIUS=SYSTEM_VISUAL_SCALE*3*12*Math.pow(1392700/12742,.85);
export const SYSTEM_PX_PER_KM=SOL_RADIUS/(SUN_DIAMETER_KM/2);
export const SYSTEM_UNIT=AU_KM/LIGHT_SECONDS_PER_AU*SYSTEM_PX_PER_KM;
export const CHART_UNIT=40; // one light-year on the procedural star chart
export const LANDER_SIZE=62;
export const SHIP_PIXEL_HEIGHT=36; // occupied rows 1..36 in the 40px sprite
export const SHIP_LENGTH_KM=1;
export const SYSTEM_SHIP_SIZE=SHIP_LENGTH_KM*SYSTEM_PX_PER_KM*40/SHIP_PIXEL_HEIGHT;
export const SYSTEM_MAX_ZOOM=100/SYSTEM_SHIP_SIZE;
export const SHIP_FOCUS_ZOOM=40/SYSTEM_SHIP_SIZE;
export const ASTRONAUT_PIXEL_HEIGHT=37; // occupied rows 1..37 in the idle sprite
export const SURFACE_UNIT=LANDER_SIZE/40*SHIP_PIXEL_HEIGHT/3; // one metre
export const ASTRONAUT_SCALE=SURFACE_UNIT/ASTRONAUT_PIXEL_HEIGHT;
export const sceneUnit=scene=>scene==='surface'?SURFACE_UNIT:scene==='chart'?CHART_UNIT:SYSTEM_UNIT;
export function gridCell(point,scene){
  const size=sceneUnit(scene),gx=Math.floor(point.x/size+.5),gy=Math.floor(point.y/size+.5);
  return {gx,gy,x:gx*size,y:gy*size,size};
}
const number=(n,digits=1)=>Number(n.toFixed(digits)).toLocaleString('en-US',{maximumFractionDigits:digits});
export function formatDistance(worldDistance,scene){
  const n=worldDistance/sceneUnit(scene),abs=Math.abs(n);
  if(scene==='chart')return number(n,2)+' ly';
  if(scene==='surface')return abs+1e-9>=1000?number(n/1000,2)+' km':number(n,1)+' m';
  return abs+1e-9>=LIGHT_SECONDS_PER_AU?number(n/LIGHT_SECONDS_PER_AU,3)+' AU':number(n,abs<.001?8:abs<1?5:3)+' ls';
}
export function formatCoordinates(point,scene){
  // Coordinates identify individual squares, even beyond a km or AU boundary.
  const unit=sceneUnit(scene),suffix=scene==='surface'?'m':scene==='chart'?'ly':'ls';
  const integer=n=>(Math.round(n/unit)||0).toLocaleString('en-US',{maximumFractionDigits:0});
  return `X ${integer(point.x)} ${suffix} · Y ${integer(point.y)} ${suffix}`;
}
export const formatDiameter=km=>Math.round(km).toLocaleString('en-US')+' km';
export const formatSystemKm=km=>formatDistance(km*SYSTEM_PX_PER_KM,'system');
export function gridStride(scene,zoom){
  // Only skip lines when zoomed out; the underlying square never changes units.
  return Math.max(1,10**Math.ceil(Math.log10(12/(sceneUnit(scene)*zoom))));
}
