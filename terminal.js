import {stellarRows,years} from './star-info.js';
import {habitableZone,orbitalElements} from './model.js';
import {formatCoordinates,formatDistance,formatSystemKm,formatDiameter} from './scale.js';
const number=(v,d=3)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d}):'Unknown';
export function rotationText(days){const seconds=Math.abs(days)*86400;return seconds<60?number(seconds,6)+' s':seconds<86400?number(seconds/3600)+' h':number(seconds/86400)+' days';}
export function terminalLines(object,system,context={}){
  const {days=0,scene='system',position={x:0,y:0},ship={x:0,y:0},homeSystem=false,homeWorld=false}=context;
  const rows=[];const add=(key,value)=>rows.push(key+' : '+value);
  if(homeSystem)add('STATUS','Home System');if(homeWorld)add('STATUS','Home World');
  if(object.kind==='star'){
    for(const row of stellarRows(object,system))add(row.key,row.value);
    add('LUMINOSITY CLASS',object.luminosityClass||(/Ia|III|IV|V/.exec(object.type)?.[0])||'Not applicable');
    add('RADIUS',formatDiameter(object.diameter/2));
    const zone=habitableZone(object.luminosity);add('HABITABLE INNER BOUNDARY',number(zone.inner)+' AU');add('HABITABLE OUTER BOUNDARY',number(zone.outer)+' AU');
    add('ESTIMATED REMAINING LIFETIME',object.remainingYears?years(object.remainingYears):'Already a remnant / not predicted');
    add('ROTATION PERIOD',rotationText(object.rotationDays));
    add('WIND MASS LOSS',Number.isFinite(object.windMassLoss)?object.windMassLoss.toExponential(2)+' M☉/yr':'Not modelled');
    add('MULTIPLICITY',system.multiplicity||'Single');
    add('ORBITAL RELATIONSHIP',system.architecture||'Single-star orbits');
    add('COMPANION RELATIONSHIP',object.id===system.star.id?'Primary': 'Companion of '+system.star.name);
    add('PLANET COUNT',system.planets.length);
    if(object.subtype)add('NEUTRON SUBTYPE',object.subtype);
    if(object.remnantAgeYears)add('REMNANT AGE',years(object.remnantAgeYears));
    if(object.fieldGauss)add('MAGNETIC FIELD',object.fieldGauss.toExponential(2)+' G');
    if(object.cloudChemistry)add('ATMOSPHERE',object.cloudChemistry);
    for(const pair of system.binaries||[])if(pair.members.includes(object.id)){add('PAIR '+pair.id.split(':').at(-1).toUpperCase(),number(pair.au)+' AU / e '+number(pair.eccentricity)+' / '+number(pair.orbitalInclination)+' deg / '+number(pair.period)+' days / q '+number(pair.mu/(1-pair.mu)));add('PAIR MEMBERS',pair.members.map(id=>system.stars.find(star=>star.id===id)?.name||id).join(' + '));}
  }else if(['planet','moon','dwarf-planet'].includes(object.kind)){
    const orbit=orbitalElements(object,days);
    add('TYPE',object.kind+' / '+object.type);add('DIAMETER',formatDiameter(object.diameter));add('RADIUS',formatDiameter(object.diameter/2));
    add('ORBIT PERIOD',number(object.period)+' days');add('ROTATION PERIOD',rotationText(object.rotationDays)+(object.rotationDays<0?' / retrograde':''));
    add('SEMIMAJOR AXIS',object.kind==='moon'?formatSystemKm(object.orbitKm):formatDistance(orbit.a,'system'));
    add('ECCENTRICITY',number(orbit.e,5));add('INCLINATION',number(orbit.inclination*180/Math.PI)+' deg');
    if(object.parent)add('HOST',system.planets.find(p=>p.id===object.parent)?.name||object.parent);
    if(object.moons)add('MOON COUNT',object.moons.length);
    if(object.atmosphere){add('CLOUDS',object.atmosphere.label);add('WEATHER',object.atmosphere.wind.label);add('FEATURES',object.atmosphere.features.join(' / ')||'None recorded');}
    if(object.rings)add('RING OUTER RADIUS',formatDiameter(object.rings.outerKm));
    add('SURFACE',object.solid?'Solid / landable':'No solid surface');
  }else {add('TARGET',object.kind==='lander'?'Local landing shuttle':object.kind==='sample'?'Surface sample':'Coordinate square');}
  rows.push('');add('COORDINATES',formatCoordinates(position,scene));add('DISTANCE FROM SHIP',formatDistance(Math.hypot(position.x-ship.x,position.y-ship.y),scene));
  return ['SPACEBITZ / OBJECT TELEMETRY','',...rows,'','> END OF RECORD'].join('\n');
}
// Each record starts independently; rendering is driven by elapsed time rather
// than timers. Short pauses at section boundaries, at most six seconds per record.
export function typedLength(text,elapsed,reducedMotion=false){
  if(reducedMotion)return text.length;
  const speed=Math.max(240,text.length/5),budget=Math.max(0,elapsed)*speed;let cost=0;
  for(let i=0;i<text.length;i++){cost+=text[i]==='\n'&&text[i+1]==='\n'?speed*.08:1;if(cost>budget)return i;}
  return text.length;
}
