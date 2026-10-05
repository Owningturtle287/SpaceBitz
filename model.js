// Pure, deterministic orbital model. Distances are AU, diameters are km and
// simulation time is days. Celestial sizes and orbit distances share one linear scale.
import {AU_KM,SYSTEM_PX_PER_KM,SUN_DIAMETER_KM} from './scale.js';
import {giantProfile,ringProfile} from './giants.js';
import {makeArchitecture,solFacts,randomFor,GENERATION_VERSION} from './universe.js';
export const TAU = Math.PI * 2;
export const DAY_MS = 86400000;
export const EPOCH = Date.UTC(2026, 0, 1);
export const J2000_OFFSET_DAYS = 9496.5;
// Accelerated clock: 60 real seconds = 1 game hour; 1,440 real seconds = 1 Earth day.
export const REAL_MS_PER_GAME_DAY = 1_440_000;
export const currentDays = (now=Date.now()) => (now-EPOCH)/DAY_MS;
export function advanceDays(days, elapsedMs, paused = false) {
  return days + (paused ? 0 : Math.max(0, elapsedMs) / REAL_MS_PER_GAME_DAY);
}
export function rotationAngle(body, days) {
  return ((body.rotationPhase ?? body.phase ?? 0) + TAU * days / (body.rotationDays || 1)) % TAU;
}
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function hash(value) {
  let h = 2166136261;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function rng(seed) {
  let a = hash(seed);
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function orbitRadius(au) { return au*AU_KM*SYSTEM_PX_PER_KM; }
export function visualRadius(km) { return km*.5*SYSTEM_PX_PER_KM; }
export function habitableZone(luminosity) {
  return { inner: .95 * Math.sqrt(luminosity), outer: 1.67 * Math.sqrt(luminosity) };
}
export function periodDays(au, solarMass) { return 365.256 * Math.sqrt(au ** 3 / solarMass); }
const DEG=Math.PI/180;
export function orbitalElements(body,days=0){
  if(body.ephemeris){
    const e=body.ephemeris,T=(J2000_OFFSET_DAYS+days)/36525;
    const value=key=>e[key][0]+e[key][1]*T;
    return {a:orbitRadius(value('a')),e:value('e'),peri:value('p')*DEG,
      inclination:value('I')*DEG,node:value('node')*DEG,M:(value('L')-value('p'))*DEG};
  }
  return {a:body.kind==='moon'?body.orbitKm*SYSTEM_PX_PER_KM:orbitRadius(body.au),
    e:body.eccentricity||0,peri:body.periapsis||0,inclination:(body.orbitalInclination||0)*DEG,node:(body.orbitalNode||0)*DEG,
    M:body.phase+(body.orbitDirection||1)*TAU*days/body.period};
}
export function orbitPoint(body,days,eccentricAnomaly){
  const o=orbitalElements(body,days),E=eccentricAnomaly;
  const x=o.a*(Math.cos(E)-o.e),y=o.a*Math.sqrt(1-o.e*o.e)*Math.sin(E);
  const w=o.peri-o.node,cw=Math.cos(w),sw=Math.sin(w),cn=Math.cos(o.node),sn=Math.sin(o.node),ci=Math.cos(o.inclination);
  return {x:(cw*cn-sw*sn*ci)*x+(-sw*cn-cw*sn*ci)*y,
    y:(cw*sn+sw*cn*ci)*x+(-sw*sn+cw*cn*ci)*y};
}
export function position(body,days){
  const o=orbitalElements(body,days),M=((o.M%TAU)+TAU)%TAU;let E=M;
  for(let i=0;i<8;i++)E-=(E-o.e*Math.sin(E)-M)/(1-o.e*Math.cos(E));
  return orbitPoint(body,days,E);
}
export function bodyPosition(body, days, system) {
  if(body.kind==='star')return stellarPositions(system,days)[body.id]||{x:0,y:0};
  const p = position(body, days, system.star.mass, system.star);
  if (body.kind !== 'moon') {
    if(body.barycentricMoon){
      const companion=body.moons.find(m=>m.id===body.barycentricMoon.id),relative=position(companion,days);
      return {x:p.x-relative.x*body.barycentricMoon.massFraction,y:p.y-relative.y*body.barycentricMoon.massFraction};
    }
    const center=body.orbitHost?stellarPositions(system,days)[body.orbitHost]:null;
    return center?{x:p.x+center.x,y:p.y+center.y}:p;
  }
  const host = system.planets.find(planet => planet.id === body.parent);
  const h = bodyPosition(host, days, system);
  return { x: h.x + p.x, y: h.y + p.y };
}
// Recursive Keplerian hierarchy: stars and pair barycenters move coherently.
// Detached coplanar approximation, not a full N-body gravitational integration.
export function stellarPositions(system,days=0){
  if(!system.binaries?.length)return Object.fromEntries((system.stars||[system.star]).map(s=>[s.id,{x:0,y:0}]));
  const result={},nodes=new Map([...system.stars,...system.binaries].map(n=>[n.id,n]));
  function visit(id,center){
    result[id]=center;const node=nodes.get(id);if(node.kind!=='binary')return;
    const relative=position(node,days),left=nodes.get(node.left),right=nodes.get(node.right);
    visit(left.id,{x:center.x-relative.x*right.mass/node.mass,y:center.y-relative.y*right.mass/node.mass});
    visit(right.id,{x:center.x+relative.x*left.mass/node.mass,y:center.y+relative.y*left.mass/node.mass});
  }
  visit(system.rootId,{x:0,y:0});return result;
}
export function orbitCenter(body,days,system){return body.orbitHost?stellarPositions(system,days)[body.orbitHost]||{x:0,y:0}:{x:0,y:0};}
const SOL = [
  ['Mercury', .387098, 4879, '#aeb3b9', 'rock'],
  ['Venus', .723332, 12104, '#dfbc82', 'desert'],
  ['Earth', 1.000000, 12742, '#4f9fe8', 'temperate'],
  ['Mars', 1.523679, 6779, '#da8060', 'desert'],
  ['Jupiter', 5.20260, 139820, '#dcb994', 'gas'],
  ['Saturn', 9.55491, 116460, '#e1cb98', 'gas'],
  ['Uranus', 19.2184, 50724, '#9be1e4', 'ice-giant'],
  ['Neptune', 30.1104, 49244, '#82bac5', 'ice-giant'],
  ['Pluto', 39.48168677, 2376.6, '#c4a99c', 'ice']
];
const SOL_PERIODS={Mercury:87.9691,Venus:224.701,Earth:365.25636,Mars:686.980,
  Jupiter:4332.589,Saturn:10759.22,Uranus:30685.4,Neptune:60189,Pluto:90560};
const SOL_EPHEMERIS={
  Mercury:{I:[7.00497902, -0.00594749],node:[48.33076593, -0.12534081],a:[.38709927,.00000037],e:[.20563593,.00001906],L:[252.25032350,149472.67411175],p:[77.45779628,.16047689]},
  Venus:{I:[3.39467605, -0.0007889],node:[76.67984255, -0.27769418],a:[.72333566,.00000390],e:[.00677672,-.00004107],L:[181.97909950,58517.81538729],p:[131.60246718,.00268329]},
  Earth:{I:[-1.531e-05, -0.01294668],node:[0, 0],a:[1.00000261,.00000562],e:[.01671123,-.00004392],L:[100.46457166,35999.37244981],p:[102.93768193,.32327364]},
  Mars:{I:[1.84969142, -0.00813131],node:[49.55953891, -0.29257343],a:[1.52371034,.00001847],e:[.09339410,.00007882],L:[-4.55343205,19140.30268499],p:[-23.94362959,.44441088]},
  Jupiter:{I:[1.30439695, -0.00183714],node:[100.47390909, 0.20469106],a:[5.20288700,-.00011607],e:[.04838624,-.00013253],L:[34.39644051,3034.74612775],p:[14.72847983,.21252668]},
  Saturn:{I:[2.48599187, 0.00193609],node:[113.66242448, -0.28867794],a:[9.53667594,-.00125060],e:[.05386179,-.00050991],L:[49.95424423,1222.49362201],p:[92.59887831,-.41897216]},
  Uranus:{I:[0.77263783, -0.00242939],node:[74.01692503, 0.04240589],a:[19.18916464,-.00196176],e:[.04725744,-.00004397],L:[313.23810451,428.48202785],p:[170.95427630,.40805281]},
  Neptune:{I:[1.77004347, 0.00035372],node:[131.78422574, -0.00508664],a:[30.06992276,.00026291],e:[.00859048,.00005105],L:[-55.12002969,218.45945325],p:[44.96476227,-.32241464]},
  // NASA J2000 mean elements, advanced at the quoted mean period. This is a
  // two-body Pluto approximation, not JPL's 1800–2050 planet element table.
  Pluto:{I:[17.14175,0],node:[110.30347,0],a:[39.48168677,0],e:[.24880766,0],L:[238.92881,360*36525/90560],p:[224.06676,0]}
};
// Mean satellite distances (km) and eccentricities; phases are illustrative,
// not a Horizons ephemeris. JPL satellite mean elements and NASA Moon facts.
const SOL_MOONS = {
  Earth: [['Moon',3475,27.321661,384400,.0549]],
  Mars: [['Phobos',23,.31891023,9375,.0151],['Deimos',12,1.26244,23457,.00033]],
  Jupiter: [['Io',3643,1.769138,421800,.004],['Europa',3122,3.551181,671100,.009],
    ['Ganymede',5268,7.154553,1070400,.001],['Callisto',4821,16.689018,1882700,.007]],
  // Append rather than insert: existing Enceladus/Titan phases stay unchanged.
  Saturn: [['Enceladus',504,1.370218,238400,.005],['Titan',5150,15.945448,1221900,.029],
    ['Tethys',1062,1.887802,294660,0,1.86],['Dione',1123,2.736915,377400,.0022,.02],
    ['Rhea',1528,4.517500,527040,.001,.35],['Iapetus',1469,79.330183,3560850,.0283,14.72]],
  Uranus: [['Ariel',1158,2.520379,190900,.0012,.04],['Umbriel',1169.4,4.144176,266000,.0039,.13],
    ['Titania',1577.8,8.705867,436300,.0011,.08],['Oberon',1522.8,13.463234,583500,.0014,.07]],
  Neptune: [['Triton',2707,5.876854,354800,0]],
  Pluto: [['Charon',1212,6.3872,19596,0,.00005]]
};
// JPL mean reference-plane poles in ICRF (RA/Dec), plus local inclination/node.
// Convert the pole to the ecliptic used by the map. Phases remain illustrative;
// nodal/apsidal precession and three-body perturbations are not integrated.
function moonPlane(ra,dec,inclination=0,node=0){
  ra*=DEG;dec*=DEG;inclination*=DEG;node*=DEG;
  const n=[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)];
  const a=[-Math.sin(ra),Math.cos(ra),0],b=[-Math.sin(dec)*Math.cos(ra),-Math.sin(dec)*Math.sin(ra),Math.cos(dec)];
  const pole=n.map((v,i)=>v*Math.cos(inclination)+(a[i]*Math.sin(node)-b[i]*Math.cos(node))*Math.sin(inclination));
  const obliquity=23.43928*DEG,y=pole[1]*Math.cos(obliquity)+pole[2]*Math.sin(obliquity),z=-pole[1]*Math.sin(obliquity)+pole[2]*Math.cos(obliquity);
  return {orbitalInclination:Math.acos(clamp(z,-1,1))/DEG,orbitalNode:Math.atan2(pole[0],-y)/DEG};
}
const SOL_MOON_PLANES={Tethys:moonPlane(40.6,83.5,1.1,273),Dione:moonPlane(40.6,83.5),Rhea:moonPlane(40.6,83.5,.3,133.7),Iapetus:moonPlane(288.7,78.9,7.6,86.5),
  Ariel:moonPlane(77.3,15.2),Umbriel:moonPlane(77.3,15.2,.1,174.8),Titania:moonPlane(77.3,15.2,.1,29.5),Oberon:moonPlane(77.3,15.2,.1,76.8),Charon:moonPlane(132.99,-6.16)};
const STELLAR_CLASSES=[
  {max:.50,type:'M',mass:.32,color:'#ff5c54'},
  {max:.70,type:'K',mass:.73,color:'#ff9845'},
  {max:.90,type:'G',mass:1.02,color:'#ffd75a'},
  {max:.96,type:'F',mass:1.25,color:'#f7f9ff'},
  {max:.99,type:'A',mass:1.65,color:'#f7f9ff'},
  {max:1.00,type:'B',mass:5.0,color:'#78a8ff'}
];
function proceduralStar(seed,r){
  const roll=r(),spectral=STELLAR_CLASSES.find(entry=>roll<entry.max)||STELLAR_CLASSES.at(-1);
  const mass=spectral.mass*(.91+r()*.18),luminosity=Math.pow(mass,3.5);
  return {id:seed+':star',name:starName(seed),kind:'star',mass,luminosity,
    diameter:Math.round(SUN_DIAMETER_KM*mass**.8),color:spectral.color,type:spectral.type+'V'};
}
export function starAppearance(seed,generation=null){
  if(generation?.version>=2){
    if(seed==='sol')return solFacts({id:'sol:star',name:'Sol',kind:'star',type:'G2V',diameter:SUN_DIAMETER_KM});
    return makeArchitecture(seed,starName(seed),generation).star;
  }
  if(seed==='sol')return {color:'#ffd75a',type:'G2V',mass:1,luminosity:1,diameter:SUN_DIAMETER_KM};
  return proceduralStar(seed,rng('system:'+seed));
}
export function makeSystem(seed,generation=null) {
  if(seed!=='sol'&&generation?.version>=2)return makeModernSystem(seed,generation);
  if (seed === 'sol') {
    const planets = SOL.map(([name, au, diameter, color, type], i) => ({
      id: `sol:${name}`, name, kind: name==='Pluto'?'dwarf-planet':'planet', type, au, diameter, color,
      phase: i * 2.39996 + .3, period: SOL_PERIODS[name], ephemeris:SOL_EPHEMERIS[name],
      moons: (SOL_MOONS[name] || []).map(([moon, d, period, orbitKm, eccentricity, equatorialInclination], j) => ({
        id: `sol:${name}:${moon}`, parent: `sol:${name}`, name: moon, kind: 'moon',
        type: 'rock', diameter: d, color: {Tethys:'#dddcd1',Dione:'#c8c8c4',Rhea:'#c4c3bd',Iapetus:'#b0a293',Ariel:'#c7c9ca',Umbriel:'#777a80',Titania:'#b7b4b1',Oberon:'#9d9694',Charon:'#a5a5ac'}[moon]||'#b8bec5', orbitKm, eccentricity,
        period, phase: j * 2.4 + .5,equatorialInclination,
        ...SOL_MOON_PLANES[moon]
      })).sort((a,b)=>a.orbitKm-b.orbitKm)
    }));
    const system=completeSystem({ seed, name: 'Sol', star: { id:'sol:star', name:'Sol', kind:'star', mass:1, luminosity:1, diameter:SUN_DIAMETER_KM, color:'#ffd75a', type:'G2V' }, planets });
    if(generation?.version>=2){system.star=solFacts(system.star);system.stars=[system.star];system.binaries=[];system.rootId=system.star.id;system.multiplicity='Single';system.architecture='Single-star orbits';system.hostId=system.star.id;system.hostLuminosity=1;system.hostMass=1;system.generation=generation;}
    return system;
  }
  const r = rng('system:' + seed);
  const star=proceduralStar(seed,r),mass=star.mass,luminosity=star.luminosity;
  const zone = habitableZone(luminosity);
  const count = 4 + Math.floor(r() * 4);
  const planets = [];
  let au = .24 * Math.sqrt(luminosity) + .08;
  for (let i = 0; i < count; i++) {
    au *= 1.35 + r() * .43;
    const type = au > zone.outer * 1.4 && r() < .42 ? 'gas' :
      au < zone.inner * .75 ? (r() < .6 ? 'rock' : 'desert') :
      au <= zone.outer && r() < .64 ? 'temperate' : (r() < .45 ? 'ice' : 'rock');
    const diameter = Math.round(type === 'gas' ? 45000 + r()*95000 : 3200 + r()*16000);
    const palette = {gas:['#d7b38d','#d9c6a6'],temperate:['#5aa8bd','#78bd85'],desert:['#e0aa78','#d38d67'],ice:['#a4d7e5','#c3cde6'],rock:['#a7a7b7','#b88f83']};
    const id = `${seed}:p${i}`;
    const planet = { id, name:`${star.name} ${roman(i+1)}`, kind:'planet', type, au,
      period:periodDays(au,mass), diameter, phase:r()*TAU, color:palette[type][Math.floor(r()*2)], moons:[] };
    const n = type === 'gas' ? 2 + Math.floor(r()*2) : (r() < .42 ? 1 : 0);
    for (let j = 0; j < n; j++) {

      planet.moons.push({id:`${id}:m${j}`,parent:id,name:`${planet.name}-${String.fromCharCode(97+j)}`,
        kind:'moon',type:'rock',diameter:Math.min(Math.round(diameter*.4),Math.round(480+r()*3500)),
        // Periods increase with orbital radius and shrink with host mass.
        period:(2.2+j*3.1)*Math.sqrt(12742/diameter),phase:r()*TAU,color:'#aebac9'});
    }
    planets.push(planet);
  }
  return completeSystem({seed,name:star.name,star,planets});
}
function makeModernSystem(seed,generation){
  const r=randomFor('planets:v'+generation.version+':'+seed),system={seed,name:starName(seed),...makeArchitecture(seed,starName(seed),generation),planets:[]};
  const {star,hostLuminosity,hostMass}=system,zone=habitableZone(hostLuminosity);
  // Preserve existing planet art until the dedicated planet/moon release.
  // Evolved survivors begin outside a conservative former stellar envelope.
  const remnant=['wd','ns','magnetar','quark','boson','blackDwarf'].includes(star.family);
  const evolved=['giant','agb','postagb','supergiant','lbv','wr','tzo'].includes(star.family);
  let au=Math.max(system.minAU,.15*Math.sqrt(hostLuminosity)+.025,remnant?2:0,evolved?star.initialMass*.8:0);
  const giantChance=clamp(.22*10**(star.metallicity*.8)*(star.mass<.6?.5:1),.03,.65);
  const count=remnant?(r()<.35?1+Math.floor(r()*3):0):star.family==='protostar'?Math.floor(r()*3):2+Math.floor(r()*6);
  for(let i=0;i<count;i++){
    au*=1.55+r()*.4;if(au>system.maxAU)break;
    const type=au>zone.outer*1.4&&r()<giantChance?'gas':au<zone.inner*.75?(r()<.6?'rock':'desert'):au<=zone.outer&&r()<.64?'temperate':r()<.45?'ice':'rock';
    const diameter=Math.round(type==='gas'?45000+r()*95000:3200+r()*16000),id=`${seed}:p${i}`;
    const palette={gas:'#d7b38d',temperate:'#5aa8bd',desert:'#d38d67',ice:'#c3cde6',rock:'#a7a7b7'};
    const p={id,name:`${system.name} ${roman(i+1)}`,kind:'planet',type,au,period:periodDays(au,hostMass),diameter,phase:r()*TAU,color:palette[type],eccentricity:r()*.08,orbitalInclination:r()*3,orbitalNode:r()*360,periapsis:r()*TAU,orbitHost:system.hostId,hostMass,moons:[]};
    // Account for eccentric apocenter/pericenter as well as semimajor axis.
    if(au*(1-p.eccentricity)<system.minAU||au*(1+p.eccentricity)>system.maxAU)continue;
    const n=type==='gas'?2+Math.floor(r()*2):r()<.42?1:0;
    for(let j=0;j<n;j++)p.moons.push({id:`${id}:m${j}`,parent:id,name:`${p.name}-${String.fromCharCode(97+j)}`,kind:'moon',type:'rock',diameter:Math.min(Math.round(diameter*.4),Math.round(480+r()*3500)),period:2+j*3,phase:r()*TAU,color:'#aebac9'});
    system.planets.push(p);
  }
  return completeSystem(system);
}
function completeSystem(system) {
  // Approximate sidereal rotation periods in Earth days.
  const spins = {Mercury:58.646,Venus:-243.025,Earth:.99726968,Mars:1.025957,
    Jupiter:.41354,Saturn:.444,Uranus:-.71833,Neptune:.67125,Pluto:-6.3872};
  system.star.rotationDays ??= system.seed === 'sol' ? 25.05 : 10 + rng('spin:'+system.seed)()*30;
  for (const p of system.planets) {
    const r=rng('rotation:'+p.id);
    p.rotationDays=system.seed==='sol'?spins[p.name]:p.type==='gas'?.3+r()*.4:.65+r()*2;
    if(system.seed==='sol'&&p.name==='Earth')p.rotationPhase=100.66085856687278*DEG;
    p.solid=!['gas','ice-giant'].includes(p.type);
    if(p.id==='sol:Pluto')p.barycentricMoon={id:'sol:Pluto:Charon',massFraction:1.586/(13.03+1.586)};
    p.atmosphere=giantProfile(p,system.hostLuminosity?{...system.star,luminosity:system.hostLuminosity}:system.star);p.rings=ringProfile(p);
    if(p.atmosphere)p.color='#'+p.atmosphere.colors[2].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
    p.moons=p.moons.filter((m,index)=>{
      m.orbitDirection=m.name==='Triton'?-1:1;
      if(system.seed!=='sol'){
        const massEarth=(p.diameter/12742)**3*(p.type==='gas'?.24:.95);
        const hillKm=p.au*149597870.7*Math.cbrt(massEarth*3.003e-6/(3*(p.hostMass||system.star.mass)));
        const minimum=p.diameter*1.8,maximum=hillKm*.35;
        if(maximum<minimum)return false;
        const desired=p.diameter*(9+index*20+r()*12);
        if(index>0&&desired>maximum)return false;
        m.orbitKm=clamp(desired,minimum,maximum);
        m.period=TAU*Math.sqrt(m.orbitKm**3/(398600.44*massEarth))/86400;
      }
      m.orbitPx=m.orbitKm*SYSTEM_PX_PER_KM;
      m.rotationDays=m.period*m.orbitDirection*(['Uranus','Pluto'].includes(p.name)?-1:1); // synchronous; retrograde equatorial systems
      m.solid=true;
      return true;
    });
  }
  return system;
}
export function roman(n) { return ['I','II','III','IV','V','VI','VII','VIII'][n-1] || String(n); }
export function starName(seed) {
  if (seed === 'sol') return 'Sol';
  const r = rng('name:' + seed);
  const starts = ['Astra','Vega','Kepler','Lyra','Altair','Cygni','Orion','Helion','Nadir','Eos','Rhea','Caelum'];
  return `${starts[Math.floor(r()*starts.length)]}-${100 + Math.floor(r()*900)}`;
}
export function galaxyStars(seed, cx, cy) {
  const r = rng(`galaxy:${seed}:${cx},${cy}`);
  const count = 2 + Math.floor(r()*3);
  return Array.from({length:count}, (_,i) => ({
    id:`${seed}:g${cx},${cy}:${i}`, seed:`${seed}:g${cx},${cy}:${i}`,
    x:(cx+r())*330, y:(cy+r())*330
  }));
}
