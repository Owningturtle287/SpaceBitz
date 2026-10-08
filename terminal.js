import {stellarRows,starFacts,years} from './star-info.js';
import {habitableZone,orbitalElements,bodyPosition} from './model.js';
import {formatCoordinates,formatDistance,formatSystemKm,formatDiameter} from './scale.js';
import {bodyKind,bodyLabel} from './body-classification.js';
const number=(v,d=3)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d}):'Unknown';
export function objectType(object){
  if(object.kind==='star')return object.familyLabel||starFacts(object).familyLabel||object.type+' star';
  if(['planet','moon','dwarf-planet'].includes(bodyKind(object)))return bodyLabel(object)+(object.type?' / '+object.type:'');
  return object.kind==='lander'?'Landing shuttle':object.kind==='sample'?'Surface sample':'Coordinate square';
}
export function rotationText(days){
  if(!Number.isFinite(days))return 'Unknown';
  let minutes=Math.abs(days)*1440;
  if(minutes<1)return number(minutes,8)+' Earth minutes';
  minutes=Math.round(minutes*1000)/1000;
  const wholeDays=Math.floor(minutes/1440),hours=Math.floor(minutes/60)%24,remainder=minutes%60;
  return wholeDays+' Earth days / '+hours+' hours / '+number(remainder,3)+' minutes';
}
export function terminalLines(object,system,context={}){
  const {days=0,scene='system',position={x:0,y:0},ship={x:0,y:0},homeSystem=false,homeWorld=false}=context;
  if(scene==='chart'&&object.kind==='star')return 'Object Data: '+object.name+'\n\nTYPE : '+objectType(object);
  const rows=[];const add=(key,value)=>rows.push(key+' : '+value);
  if(homeSystem)add('STATUS','Home System');if(homeWorld)add('STATUS','Home World');
  if(object.kind==='star'){
    for(const row of stellarRows(object,system))if(row.key!=='ROTATION')add(row.key,row.value);
    add('LUMINOSITY CLASS',object.luminosityClass||(/Ia|III|IV|V/.exec(object.type)?.[0])||'Not applicable');
    const zone=habitableZone(object.luminosity);add('HABITABLE INNER BOUNDARY',number(zone.inner)+' AU');add('HABITABLE OUTER BOUNDARY',number(zone.outer)+' AU');
    add('ESTIMATED REMAINING LIFETIME',object.remainingYears?years(object.remainingYears):'Already a remnant / not predicted');
    add('ROTATION PERIOD',rotationText(object.rotationDays));
    add('WIND MASS LOSS',Number.isFinite(object.windMassLoss)?object.windMassLoss.toExponential(2)+' M☉/yr':'Not modelled');
    add('MULTIPLICITY',system.multiplicity||'Single');
    add('ORBITAL RELATIONSHIP',system.architecture||'Single-star orbits');
    add('COMPANION RELATIONSHIP',object.id===system.star.id?'Primary': 'Companion of '+system.star.name);
    if(object.subtype)add('NEUTRON SUBTYPE',object.subtype);
    if(object.remnantAgeYears)add('REMNANT AGE',years(object.remnantAgeYears));
    if(object.fieldGauss)add('MAGNETIC FIELD',object.fieldGauss.toExponential(2)+' G');
    if(object.cloudChemistry)add('ATMOSPHERE',object.cloudChemistry);
    for(const pair of system.binaries||[])if(pair.members.includes(object.id)){add('PAIR '+pair.id.split(':').at(-1).toUpperCase(),number(pair.au)+' AU / e '+number(pair.eccentricity)+' / '+number(pair.orbitalInclination)+' deg / '+number(pair.period)+' Earth days / q '+number(pair.mu/(1-pair.mu)));add('PAIR MEMBERS',pair.members.map(id=>system.stars.find(star=>star.id===id)?.name||id).join(' + '));}
  }else if(['planet','moon','dwarf-planet'].includes(bodyKind(object))){
    const orbit=orbitalElements(object,days);
    add('TYPE',bodyLabel(object)+' / '+object.type);add('DIAMETER',formatDiameter(object.diameter));
    if(bodyKind(object)==='dwarf-planet')add('CLASSIFICATION',object.id.startsWith('sol:')?'IAU dwarf planet / not orbit-clearing / not a satellite':'Model dwarf-planet analogue / round / not orbit-clearing');
    add('ORBIT PERIOD',number(object.period)+' Earth days');add('ROTATION PERIOD',rotationText(object.rotationDays)+(object.rotationDays<0?' / retrograde':''));
    add('SEMIMAJOR AXIS',object.kind==='moon'?formatSystemKm(object.orbitKm):formatDistance(orbit.a,'system'));
    add('ECCENTRICITY',number(orbit.e,5));add('INCLINATION',number(orbit.inclination*180/Math.PI)+' deg');
    const host=object.parent?system.planets.find(p=>p.id===object.parent):(system.stars||[system.star]).find(star=>star.id===object.orbitHost)||system.star;
    if(host){
      const location=bodyPosition(object,days,system),center=bodyPosition(host,days,system);
      add(object.parent?'HOST':'HOST STAR',host.name);
      add(object.parent?'DISTANCE FROM HOST PLANET':'DISTANCE FROM HOST STAR',formatDistance(Math.hypot(location.x-center.x,location.y-center.y),'system'));
    }
    if(object.moons)add('MOON COUNT',object.moons.length);
    if(object.atmosphere){add('CLOUDS',object.atmosphere.label);add('WEATHER',object.atmosphere.wind.label);add('FEATURES',object.atmosphere.features.join(' / ')||'None recorded');}
    if(object.rings)add('RING OUTER DIAMETER',formatDiameter(object.rings.outerKm*2));
    add('SURFACE',object.solid?'Solid / landable':'No solid surface');
  }else {add('TARGET',object.kind==='lander'?'Local landing shuttle':object.kind==='sample'?'Surface sample':'Coordinate square');}
  rows.push('');add('COORDINATES',formatCoordinates(position,scene));add('DISTANCE FROM SHIP',formatDistance(Math.hypot(position.x-ship.x,position.y-ship.y),scene));
  return ['Object Data: '+(object.name||'Coordinate'),'',...rows,'','> END OF RECORD'].join('\n');
}
// Each record starts independently; rendering is driven by elapsed time rather
// than timers. Short pauses at section boundaries, at most six seconds per record.
export function typedLength(text,elapsed,reducedMotion=false){
  if(reducedMotion)return text.length;
  const speed=Math.max(240,text.length/5),budget=Math.max(0,elapsed)*speed;let cost=0;
  for(let i=0;i<text.length;i++){cost+=text[i]==='\n'&&text[i+1]==='\n'?speed*.08:1;if(cost>budget)return i;}
  return text.length;
}
