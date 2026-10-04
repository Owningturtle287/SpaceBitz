import {POPULATIONS,SOL_REFERENCE,solFacts,defaults} from './universe.js';
import {habitableZone} from './model.js';
const n=(v,d=2)=>!Number.isFinite(v)?'Unknown':v!==0&&(Math.abs(v)<.001||Math.abs(v)>=1e8)?v.toExponential(2):v.toLocaleString('en-US',{maximumFractionDigits:d});
export const years=v=>v>=1e12?n(v/1e12)+' trillion yr':v>=1e9?n(v/1e9)+' billion yr':v>=1e6?n(v/1e6)+' million yr':n(v,0)+' yr';
export function starFacts(star){
  if(star.temperature!==undefined)return star;
  if(star.id==='sol:star')return solFacts(star);
  const radius=star.diameter/1391400;
  return {...star,radiusSolar:radius,temperature:5772*(star.luminosity/radius**2)**.25,gravity:274.2*star.mass/radius**2,family:'main',familyLabel:({M:'Red dwarf',K:'Orange dwarf',G:'Yellow dwarf',F:'Yellow-white dwarf',A:'White main-sequence star',B:'Blue-white dwarf'}[star.type[0]]||'Legacy main-sequence star'),provenance:'Legacy universe · original assignments retained'};
}
export function stellarRows(star,system){
  const s=starFacts(star),config=system.generation,pools=config?.pools||defaults().pools;
  const legacy=!config,companion=star.id!==system.star.id;
  const familyWeight=s.family==='main'?(pools.family.main*(pools.spectral[s.type[0]]||0)/100):(pools.family[s.family]||0);
  const rarity=legacy?'Legacy universe: original distribution retained.':companion?'This companion is derived from coeval mass/age, not independently drawn from primary-star rarity tables.':s.id==='sol:star'?'Sol is a fixed reference system, not a random draw.':`${n(familyWeight,6)}% of ordinary primary draws${s.family==='main'?' (main-sequence × spectral-class probabilities)':' in this family pool; subtypes are model-derived'}.`;
  const zone=habitableZone(s.luminosity),solZone=habitableZone(1),rows=[];
  const add=(key,value,explanation,sol)=>rows.push({key,value,explanation,sol});
  add('STELLAR FAMILY',s.familyLabel,'The physical family and evolutionary stage. A yellow dwarf is not the same as a white dwarf remnant. '+rarity,'Yellow dwarf · main sequence');
  const spectralRarity=s.family==='main'&&!legacy?`${n(pools.spectral[s.type[0]]??0,6)}% of main-sequence primary draws; subclasses are temperature-derived.`:'Evolved and remnant classifications are derived from temperature / chemistry, not the main-sequence percentage pool.';
  add('SPECTRAL CLASS',s.type,'O → B → A → F → G → K → M orders ordinary photospheres from hottest to coolest. Digits refine temperature; V means dwarf, IV subgiant, III giant, Ia supergiant. DA/DB describe white-dwarf atmospheres; WN/WC/WO describe Wolf–Rayet chemistry. '+spectralRarity,'G2V');
  add('DIAMETER',n(s.diameter,0)+' km',`Physical photosphere diameter: ${n(s.radiusSolar)} solar radii. The same kilometre scale is used for stars, planets, and orbits; tiny bodies use navigation beacons.`,n(1391400,0)+' km · 1 R☉');
  add('MASS',n(s.mass)+' M☉','Present stellar mass in solar masses. It controls orbital periods and surface gravity; an evolved object may have lost much of its initial mass.', '1 M☉');
  add('TEMPERATURE',n(s.temperature,0)+' K','Effective surface temperature, not core temperature. Temperature and radius determine bolometric luminosity through the Stefan–Boltzmann law; warm/blue-white palettes follow this value.',n(SOL_REFERENCE.temperature,0)+' K');
  add('SURFACE GRAVITY',n(s.gravity)+' m/s²','GM/R² at the photosphere. Compact-remnant values are Newtonian reference estimates; relativistic corrections are not simulated.','274.2 m/s² · about 28 Earth g');
  add('LUMINOSITY',n(s.luminosity)+' L☉','Total radiated energy across all wavelengths. This is not the visible-light brightness at the ship; distance and spectrum matter.', '1 L☉');
  add('GOLDILOCKS ZONE',n(zone.inner)+' – '+n(zone.outer)+' AU',`Approximate inner / outer orbital radii for this star alone (orbit diameters ${n(zone.inner*2)} – ${n(zone.outer*2)} AU). This luminosity-scaled reference is not proof of habitability. For hot stars/remnants it is extrapolated; companions and orbital stability can invalidate it.`,'0.95 – 1.67 AU radii · 1.90 – 3.34 AU diameters');
  add('AGE',Number.isFinite(s.ageYears)?years(s.ageYears):'Not recorded','Approximate time since formation. System companions share the same age and initial metallicity. Synthetic stellar models carry much greater uncertainty than a precise-looking number implies.','About 4.57 billion yr');
  const isRemnant=['wd','ns','magnetar','quark','blackDwarf','boson'].includes(s.family);
  const time=s.remainingYears,remaining=Number.isFinite(time)?years(time):'Not predicted';
  const event=s.endEvent||'Not modelled in legacy universe';
  add('NEXT EVOLUTION',event+(time?' · ~'+remaining:''),'The next major evolutionary transition. Main-sequence exhaustion is not instant death: a star can continue fusion in later phases. Remnants have already reached their stellar end state.','Red-giant transition in roughly 5 billion yr');
  const death=time?(s.family==='main'?time+mainPostSequence(s):time):null;
  const uncertainty=death?Math.max(s.uncertaintyYears||0,death*.3,1e5):null;
  add('LIKELY STELLAR END',isRemnant?'Already a remnant':death?'~'+years(death)+' from now ± '+years(uncertainty):'Unknown',death?`Approximate end of ordinary stellar fusion, not disappearance. Estimated calendar year ≈ ${n(Math.round((2026+death)/1e5)*1e5,0)} CE, uncertainty at least ±${years(uncertainty)}. This is a simplified model estimate, not an exact forecast; mass transfer is not simulated.`:'No meaningful future death date is established for a cooling remnant or this unconfirmed model.','White-dwarf remnant after its giant phases, on a roughly billion-year-uncertain timescale');
  add('METALLICITY',Number.isFinite(s.metallicity)?(s.metallicity>=0?'+':'')+n(s.metallicity)+' [Fe/H]':'Not recorded','Initial iron-to-hydrogen abundance relative to Sol on a logarithmic scale. +0.3 is about twice solar. Higher metallicity increases the game prior for giant-planet formation; surface chemistry of evolved stars can differ.','0.00 [Fe/H]');
  add('ROTATION',Number.isFinite(s.rotationDays)?(s.rotationDays<1/24?n(s.rotationDays*86400,3)+' s':n(s.rotationDays)+' days'):'Not recorded','Reference rotation period. Cool-star dynamo activity depends on rotation and age. Surface differential rotation and detailed braking are simplified.','25.05 days · equatorial sidereal');
  add('MAGNETIC ACTIVITY',s.magnetic||'Not modelled','Cool stars can generate dynamo fields and magnetic spots/flares. Hot stars need not have a solar-style dynamo. Remnant fields follow different physics. No detected organized field does not mean literally zero magnetism.','Moderate dynamo · ~11-year spot cycle');
  add('UV OUTPUT',Number.isFinite(s.uvFraction)?n(s.uvFraction*100)+'% of bolometric L':'Not modelled','Approximate blackbody energy fraction at 100–400 nm. Real spectra, lines, flares and chromospheres differ. This is an intrinsic emission estimate, not UV dose at a planet.',n(solFacts({}).uvFraction*100)+'% blackbody reference');
  add('X-RAY OUTPUT',Number.isFinite(s.xrayFraction)?n(s.xrayFraction*s.luminosity)+' L☉':'Not modelled','Illustrative activity-linked X-ray luminosity estimate, not a measured spectrum. Active cool stars, compact remnants and quiet/hot photospheres use different priors.','~10⁻⁶ L☉ reference · highly variable');
  add('STELLAR WIND',s.windSpeed?`~${n(s.windSpeed,0)} km/s`:'No ordinary plasma wind model',`Characteristic wind speed; mass loss ${s.windMassLoss?n(s.windMassLoss)+' M☉/yr':'not modelled'}. Evolved stars can have slow dense winds; hot massive stars fast radiatively driven winds. Neutron-star particle winds are not described by this ordinary-star model.`,`~450 km/s · ~2×10⁻¹⁴ M☉/yr`);
  add('SYSTEM',system.multiplicity||'Single','Number of stellar components, including compact companions. '+(legacy?'Legacy single-star architecture.':`Primary-system reference weight ${n(pools.multiplicity[{Single:'single',Binary:'binary',Triple:'triple',Quadruple:'quad'}[system.multiplicity]]??0,6)}%. ${config.scientific?'Scientific Mode conditions this on primary mass: massive stars are more often multiple. ':''}Detached hierarchical Keplerian approximation, not full N-body dynamics.`),'Single star');
  add('PLANET ARCHITECTURE',system.architecture||'Single-star orbits','S-type planets orbit one star; P-type planets orbit a binary barycenter. Safety margins use coplanar binary stability fits. Habitable-zone illumination and orbit stability are separate questions. Planet/moon surfaces will be upgraded in a later release.','Planets orbit Sol');
  add('PLANETS',String(system.planets.filter(p=>p.kind==='planet').length),'Generated count reflects available stable orbital space, the host and evolutionary context. It is not a claim that every real star has planets; barren and remnant systems can have none.','8 planets + Pluto (dwarf planet)');
  if(system.binaries?.length)for(const [i,b]of system.binaries.entries()){
    add('COMPANION ORBIT '+(i+1),n(b.au)+' AU · e '+n(b.eccentricity,3),`Pair hierarchy ${b.members.map(id=>system.stars.find(s=>s.id===id)?.name).join(' + ')}. Semimajor separation ${n(b.au)} AU, period ${n(b.period)} days, inclination ${n(b.orbitalInclination)}°, mass ratio q=${n(b.mu/(1-b.mu),3)}. Orbits can be viewed and companions selected in the system navigator.`,'No stellar companion');
  }
  if(system.binaries?.length){const combined=habitableZone(system.hostLuminosity);add('HOST ZONE / STABILITY',n(combined.inner)+' – '+n(combined.outer)+' AU',`Host luminosity ${n(system.hostLuminosity)} L☉; conservative allowed planet radius ${n(system.minAU)} – ${Number.isFinite(system.maxAU)?n(system.maxAU):'unbounded'} AU. Close-pair light is approximated by combined luminosity; detailed eclipses and climate are not simulated.`,`${n(solZone.inner)} – ${n(solZone.outer)} AU · single-star reference`);}
  return rows;
}
function mainPostSequence(s){return Math.min(s.ageYears+s.remainingYears,1e10)*.12;}
