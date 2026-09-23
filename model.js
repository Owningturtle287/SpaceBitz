// Pure, deterministic orbital model. Distances are AU, diameters are km and
// simulation time is days. Only the drawing layer uses compressed screen sizes.
export const TAU = Math.PI * 2;
export const DAY_MS = 86400000;
export const EPOCH = Date.UTC(2026, 0, 1);
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
export function orbitRadius(au) { return 160 + 275 * Math.log1p(au * 2); }
export function visualRadius(km, kind = 'planet') {
  // Keep stars visibly larger than even gas giants while retaining their ordering.
  if (kind === 'star') return clamp(39 * Math.pow(km / 1392700, .22), 38, 55);
  if (kind === 'moon') return clamp(3.5 + 3.7 * Math.sqrt(km / 12742), 4, 12);
  return clamp(5 + 8 * Math.sqrt(km / 12742), 6, 37);
}
export function habitableZone(luminosity) {
  return { inner: .95 * Math.sqrt(luminosity), outer: 1.67 * Math.sqrt(luminosity) };
}
export function periodDays(au, solarMass) { return 365.256 * Math.sqrt(au ** 3 / solarMass); }
export function position(body, days, mass = 1) {
  const angle = body.phase + TAU * days / (body.period || periodDays(body.au, mass));
  const radius = body.kind === 'moon' ? body.orbitPx : orbitRadius(body.au);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
export function bodyPosition(body, days, system) {
  const p = position(body, days, system.star.mass);
  if (body.kind !== 'moon') return p;
  const host = system.planets.find(planet => planet.id === body.parent);
  const h = position(host, days, system.star.mass);
  return { x: h.x + p.x, y: h.y + p.y };
}
const SOL = [
  ['Mercury', .387, 4879, '#aeb3b9', 'rock'],
  ['Venus', .723, 12104, '#dfbc82', 'desert'],
  ['Earth', 1, 12742, '#4f9fe8', 'temperate'],
  ['Mars', 1.524, 6779, '#da8060', 'desert'],
  ['Jupiter', 5.203, 139820, '#dcb994', 'gas'],
  ['Saturn', 9.537, 116460, '#e1cb98', 'gas'],
  ['Uranus', 19.191, 50724, '#9be1e4', 'ice-giant'],
  ['Neptune', 30.07, 49244, '#648bdf', 'ice-giant']
];
const SOL_MOONS = {
  Earth: [['Moon', 3475, 27.32, 38]],
  Mars: [['Phobos', 23, .319, 22], ['Deimos', 12, 1.263, 33]],
  Jupiter: [['Io', 3643, 1.769, 50], ['Europa', 3122, 3.551, 65], ['Ganymede', 5268, 7.155, 83], ['Callisto', 4821, 16.69, 104]],
  Saturn: [['Enceladus', 504, 1.37, 46], ['Titan', 5150, 15.95, 72]],
  Neptune: [['Triton', 2707, 5.877, 54]]
};
export function makeSystem(seed) {
  if (seed === 'sol') {
    const planets = SOL.map(([name, au, diameter, color, type], i) => ({
      id: `sol:${name}`, name, kind: 'planet', type, au, diameter, color,
      phase: i * 2.39996 + .3, period: periodDays(au, 1),
      moons: (SOL_MOONS[name] || []).map(([moon, d, period, orbitPx], j) => ({
        id: `sol:${name}:${moon}`, parent: `sol:${name}`, name: moon, kind: 'moon',
        type: 'rock', diameter: d, color: '#b8bec5', orbitPx,
        period, phase: j * 2.4 + .5
      }))
    }));
    return { seed, name: 'Sol', star: { id:'sol:star', name:'Sol', kind:'star', mass:1, luminosity:1, diameter:1392700, color:'#ffcf7d', type:'G2V' }, planets };
  }
  const r = rng('system:' + seed);
  const types = [
    { type:'M', mass:.32, color:'#ff917c' }, { type:'K', mass:.73, color:'#ffbc85' },
    { type:'G', mass:1.02, color:'#ffda9d' }, { type:'F', mass:1.25, color:'#f9edd5' },
    { type:'A', mass:1.65, color:'#bfdcff' }
  ];
  const spectral = types[Math.min(types.length - 1, Math.floor(r() * types.length))];
  const mass = spectral.mass * (.91 + r() * .18);
  const luminosity = Math.pow(mass, 3.5);
  const star = { id:seed + ':star', name:starName(seed), kind:'star', mass, luminosity,
    diameter: Math.round(1392700 * mass ** .8), color:spectral.color, type:spectral.type + 'V' };
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
      const orbitPx = visualRadius(diameter) + 23 + j*20;
      planet.moons.push({id:`${id}:m${j}`,parent:id,name:`${planet.name}-${String.fromCharCode(97+j)}`,
        kind:'moon',type:'rock',diameter:Math.round(480+r()*3500),orbitPx,
        // Periods increase with orbital radius and shrink with host mass.
        period:(2.2+j*3.1)*Math.sqrt(12742/diameter),phase:r()*TAU,color:'#aebac9'});
    }
    planets.push(planet);
  }
  return {seed,name:star.name,star,planets};
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
