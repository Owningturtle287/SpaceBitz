import {makeSystem,bodyPosition,visualRadius,currentDays} from './model.js';
import {checkedGeneration} from './universe.js';
const seedValue=(value,label)=>{
  if(typeof value!=='string'||!value.length||value.length>180)throw Error(`Invalid ${label}.`);
  return value;
};
const point=(value,label)=>{
  if(!value||!Number.isFinite(value.x)||!Number.isFinite(value.y)||Math.abs(value.x)>1e14||Math.abs(value.y)>1e14)throw Error(`Invalid ${label} coordinates.`);
  return {x:value.x,y:value.y};
};
export function importVoyage(raw,id,now=Date.now()){
  if(!raw||typeof raw!=='object')throw Error('Unrecognized save format.');
  const seed=seedValue(raw.seed,'universe seed');
  const homeSeed=seedValue(raw.homeSeed||raw.originSeed||(raw.startOnEarth?'sol':'home:'+seed),'home system');
  const common={id,name:String(raw.name||'Imported universe').slice(0,40),seed,homeSeed,
    days:Number.isFinite(raw.days)?raw.days:currentDays(now),updated:now,
    discoveries:Array.isArray(raw.discoveries)?raw.discoveries.filter(x=>typeof x==='string'):[],
    log:Array.isArray(raw.log)?raw.log.filter(x=>x&&typeof x.name==='string').map(x=>({...x})):[]};
  if(raw.generation!==undefined)common.generation=checkedGeneration(raw.generation);
  // Field-format saves restore every location and exploration field. Import as a
  // separate voyage so a backup never silently replaces the existing original.
  if(raw.layoutVersion!==undefined){
    if(![1,2,3,4].includes(raw.layoutVersion))throw Error('This save uses an unsupported layout version.');
    const currentSystem=seedValue(raw.currentSystem||homeSeed,'current system'),system=makeSystem(currentSystem,common.generation);
    if(!['system','surface','chart'].includes(raw.scene))throw Error('Invalid saved scene.');
    const bodies=system.planets.flatMap(p=>[p,...p.moons]);
    if(raw.scene==='surface'&&!bodies.find(b=>b.id===raw.landed)?.solid)throw Error('The saved landing world is not available.');
    return {...common,currentSystem,scene:raw.scene,ship:point(raw.ship,'ship'),surface:point(raw.surface,'surface'),chart:point(raw.chart,'chart'),
      landed:raw.landed??null,layoutVersion:raw.layoutVersion,
      homePlanet:typeof raw.homePlanet==='string'?raw.homePlanet:null,
      route:Array.isArray(raw.route)?raw.route.map(s=>seedValue(s,'route system')):[]};
  }
  const system=makeSystem(homeSeed),body=system.planets[0],p=bodyPosition(body,common.days,system);
  return {...common,currentSystem:homeSeed,scene:'system',ship:{x:p.x+visualRadius(body.diameter)+70,y:p.y},
    chart:{x:0,y:0},surface:{x:0,y:0},landed:null,homePlanet:null,route:[],layoutVersion:4};
}
