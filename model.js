// Pure, deterministic orbital model. Distances are AU, diameters are km and
// simulation time is days. Celestial sizes and orbit distances share one linear scale.
import {AU_KM,SYSTEM_PX_PER_KM,SUN_DIAMETER_KM} from './scale.js';
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
    e:body.eccentricity||0,peri:body.periapsis||0,inclination:0,node:0,
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
  const p = position(body, days, system.star.mass, system.star);
  if (body.kind !== 'moon') return p;
  const host = system.planets.find(planet => planet.id === body.parent);
  const h = position(host, days, system.star.mass, system.star);
  return { x: h.x + p.x, y: h.y + p.y };
}
const SOL = [
  ['Mercury', .387098, 4879, '#aeb3b9', 'rock'],
  ['Venus', .723332, 12104, '#dfbc82', 'desert'],
  ['Earth', 1.000000, 12742, '#4f9fe8', 'temperate'],
  ['Mars', 1.523679, 6779, '#da8060', 'desert'],
  ['Jupiter', 5.20260, 139820, '#dcb994', 'gas'],
  ['Saturn', 9.55491, 116460, '#e1cb98', 'gas'],
  ['Uranus', 19.2184, 50724, '#9be1e4', 'ice-giant'],
  ['Neptune', 30.1104, 49244, '#648bdf', 'ice-giant']
];
const SOL_PERIODS={Mercury:87.9691,Venus:224.701,Earth:365.25636,Mars:686.980,
  Jupiter:4332.589,Saturn:10759.22,Uranus:30685.4,Neptune:60189};
const SOL_EPHEMERIS={
  Mercury:{I:[7.00497902, -0.00594749],node:[48.33076593, -0.12534081],a:[.38709927,.00000037],e:[.20563593,.00001906],L:[252.25032350,149472.67411175],p:[77.45779628,.16047689]},
  Venus:{I:[3.39467605, -0.0007889],node:[76.67984255, -0.27769418],a:[.72333566,.00000390],e:[.00677672,-.00004107],L:[181.97909950,58517.81538729],p:[131.60246718,.00268329]},
  Earth:{I:[-1.531e-05, -0.01294668],node:[0, 0],a:[1.00000261,.00000562],e:[.01671123,-.00004392],L:[100.46457166,35999.37244981],p:[102.93768193,.32327364]},
  Mars:{I:[1.84969142, -0.00813131],node:[49.55953891, -0.29257343],a:[1.52371034,.00001847],e:[.09339410,.00007882],L:[-4.55343205,19140.30268499],p:[-23.94362959,.44441088]},
  Jupiter:{I:[1.30439695, -0.00183714],node:[100.47390909, 0.20469106],a:[5.20288700,-.00011607],e:[.04838624,-.00013253],L:[34.39644051,3034.74612775],p:[14.72847983,.21252668]},
  Saturn:{I:[2.48599187, 0.00193609],node:[113.66242448, -0.28867794],a:[9.53667594,-.00125060],e:[.05386179,-.00050991],L:[49.95424423,1222.49362201],p:[92.59887831,-.41897216]},
  Uranus:{I:[0.77263783, -0.00242939],node:[74.01692503, 0.04240589],a:[19.18916464,-.00196176],e:[.04725744,-.00004397],L:[313.23810451,428.48202785],p:[170.95427630,.40805281]},
  Neptune:{I:[1.77004347, 0.00035372],node:[131.78422574, -0.00508664],a:[30.06992276,.00026291],e:[.00859048,.00005105],L:[-55.12002969,218.45945325],p:[44.96476227,-.32241464]}
};
// Mean satellite distances (km) and eccentricities; phases are illustrative,
// not a Horizons ephemeris. JPL satellite mean elements and NASA Moon facts.
const SOL_MOONS = {
  Earth: [['Moon',3475,27.321661,384400,.0549]],
  Mars: [['Phobos',23,.31891023,9375,.0151],['Deimos',12,1.26244,23457,.00033]],
  Jupiter: [['Io',3643,1.769138,421800,.004],['Europa',3122,3.551181,671100,.009],
    ['Ganymede',5268,7.154553,1070400,.001],['Callisto',4821,16.689018,1882700,.007]],
  Saturn: [['Enceladus',504,1.370218,238400,.005],['Titan',5150,15.945448,1221900,.029]],
  Neptune: [['Triton',2707,5.876854,354800,0]]
};
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
export function starAppearance(seed){
  if(seed==='sol')return {color:'#ffd75a',type:'G2V',mass:1,luminosity:1,diameter:SUN_DIAMETER_KM};
  return proceduralStar(seed,rng('system:'+seed));
}
export function makeSystem(seed) {
  if (seed === 'sol') {
    const planets = SOL.map(([name, au, diameter, color, type], i) => ({
      id: `sol:${name}`, name, kind: 'planet', type, au, diameter, color,
      phase: i * 2.39996 + .3, period: SOL_PERIODS[name], ephemeris:SOL_EPHEMERIS[name],
      moons: (SOL_MOONS[name] || []).map(([moon, d, period, orbitKm, eccentricity], j) => ({
        id: `sol:${name}:${moon}`, parent: `sol:${name}`, name: moon, kind: 'moon',
        type: 'rock', diameter: d, color: '#b8bec5', orbitKm, eccentricity,
        period, phase: j * 2.4 + .5
      }))
    }));
    return completeSystem({ seed, name: 'Sol', star: { id:'sol:star', name:'Sol', kind:'star', mass:1, luminosity:1, diameter:SUN_DIAMETER_KM, color:'#ffd75a', type:'G2V' }, planets });
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
function completeSystem(system) {
  // Approximate sidereal rotation periods in Earth days.
  const spins = {Mercury:58.646,Venus:-243.025,Earth:.99726968,Mars:1.025957,
    Jupiter:.41354,Saturn:.444,Uranus:-.71833,Neptune:.67125};
  system.star.rotationDays = system.seed === 'sol' ? 25.05 : 10 + rng('spin:'+system.seed)()*30;
  for (const p of system.planets) {
    const r=rng('rotation:'+p.id);
    p.rotationDays=system.seed==='sol'?spins[p.name]:p.type==='gas'?.3+r()*.4:.65+r()*2;
    if(system.seed==='sol'&&p.name==='Earth')p.rotationPhase=100.66085856687278*DEG;
    p.solid=!['gas','ice-giant'].includes(p.type);
    p.moons=p.moons.filter((m,index)=>{
      m.orbitDirection=m.name==='Triton'?-1:1;
      if(system.seed!=='sol'){
        const massEarth=(p.diameter/12742)**3*(p.type==='gas'?.24:.95);
        const hillKm=p.au*149597870.7*Math.cbrt(massEarth*3.003e-6/(3*system.star.mass));
        const minimum=p.diameter*1.8,maximum=hillKm*.35;
        if(maximum<minimum)return false;
        const desired=p.diameter*(9+index*20+r()*12);
        if(index>0&&desired>maximum)return false;
        m.orbitKm=clamp(desired,minimum,maximum);
        m.period=TAU*Math.sqrt(m.orbitKm**3/(398600.44*massEarth))/86400;
      }
      m.orbitPx=m.orbitKm*SYSTEM_PX_PER_KM;
      m.rotationDays=m.period*m.orbitDirection; // tidally locked moons
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
