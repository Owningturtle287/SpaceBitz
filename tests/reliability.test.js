import test from 'node:test';
import assert from 'node:assert/strict';
import {SAVE_KEY,readVoyages,writeVoyages,persistVoyage,saveBeforeExit} from '../src/storage/voyage-storage.js';
import {importVoyage,restoreVoyage,MAX_GAME_DAYS} from '../src/storage/saves.js';
import {collectSample} from '../src/universe/exploration.js';
import {bodyKind,bodyCounts,RECOGNIZED_DWARF_PLANETS} from '../src/universe/body-classification.js';
import {makeSystem,bodyPosition,rng} from '../src/universe/model.js';
import {defaults} from '../src/universe/universe.js';
import {migrateLayout} from '../src/flight/navigation.js';
import {terminalLines} from '../src/terminal/terminal.js';
import {TerrainRenderer,createTerrainSampler} from '../src/rendering/terrain.js';
import {celestialSprite} from '../src/rendering/celestial.js';
import {createUpdateCoordinator,registerAppWorker} from '../src/core/pwa.js';
import {createMusicController} from '../src/core/audio.js';
const storage=()=>({data:new Map(),getItem(key){return this.data.get(key)??null;},setItem(key,text){if(this.full)throw Object.assign(Error('full'),{name:'QuotaExceededError'});this.data.set(key,text);}});
const voyage=(id='id')=>({id,name:'Voyage',seed:id,homeSeed:'sol',currentSystem:'sol',days:123,layoutVersion:4,scene:'system',ship:{x:1234,y:2345},surface:{x:3,y:4},chart:{x:5,y:6},route:['sol'],discoveries:[],log:[]});

test('creating a ninth voyage and importing more than eight never evict stored voyages',()=>{
  const store=storage();for(let i=0;i<12;i++)persistVoyage(store,voyage(String(i)),i);
  const originals=readVoyages(store);assert.equal(originals.length,12);
  writeVoyages(store,Array.from({length:12},(_,i)=>voyage('import-'+i)));
  assert.equal(readVoyages(store).length,24);for(const save of originals)assert.deepEqual(readVoyages(store).find(s=>s.id===save.id),save);
});
test('quota failure leaves the stored list and active voyage intact and blocks exit',()=>{
  const store=storage(),save=voyage();persistVoyage(store,save,123);const before=store.getItem(SAVE_KEY);store.full=true;let exited=false;
  const persist=()=>{try{return persistVoyage(store,save,456);}catch{return false;}};
  assert.equal(saveBeforeExit(persist,()=>{exited=true;}),false);assert.equal(exited,false);assert.equal(save.updated,123);assert.equal(store.getItem(SAVE_KEY),before);
  store.full=false;assert.equal(saveBeforeExit(persist,()=>{exited=true;}),true);assert.equal(exited,true);
});
test('corrupt storage is never replaced by an empty list',()=>{
  for(const text of ['{broken','{"saves":[]}']){const store=storage();store.data.set(SAVE_KEY,text);assert.throws(()=>persistVoyage(store,voyage()));assert.equal(store.getItem(SAVE_KEY),text);}
  const store=storage();store.data.set(SAVE_KEY,JSON.stringify([{original:'unknown-format'}]));writeVoyages(store,[voyage()]);assert.deepEqual(readVoyages(store)[1],{original:'unknown-format'});
});
test('restoration validates clocks, logs and positions without mutating the original',()=>{
  for(const days of [Number.MAX_VALUE,Infinity,null,NaN,MAX_GAME_DAYS+1])assert.throws(()=>restoreVoyage({...voyage(),days}));
  assert.throws(()=>restoreVoyage({...voyage(),log:[{name:'Earth',days:Number.MAX_VALUE}]}));
  assert.throws(()=>restoreVoyage({...voyage(),ship:{x:1e15,y:0}}));
  const original={...voyage(),updated:42,extra:'future-field',discoveries:['same','same']};const restored=restoreVoyage(original);
  assert.equal(restored.id,original.id);assert.equal(restored.updated,42);assert.equal(restored.extra,'future-field');assert.deepEqual(restored.ship,original.ship);assert.deepEqual(restored.discoveries,['same']);assert.equal(original.discoveries.length,2);
  for(const days of [-MAX_GAME_DAYS,MAX_GAME_DAYS])for(const body of makeSystem('sol').planets)assert.ok(Object.values(bodyPosition(body,days,makeSystem('sol'))).every(Number.isFinite));
});
test('legacy barren systems migrate beside their primary rather than throwing',()=>{
  const generation=defaults(false);for(const key in generation.pools.family)generation.pools.family[key]=key==='wd'?100:0;
  let system;for(let i=0;i<100;i++){system=makeSystem('barren-migration-'+i,generation);if(!system.planets.length)break;}assert.equal(system.planets.length,0);
  const raw={...voyage(),currentSystem:system.seed,homeSeed:system.seed,generation,layoutVersion:1};const save=restoreVoyage(raw);migrateLayout(save,system);assert.equal(save.layoutVersion,4);assert.ok(Number.isFinite(save.ship.x));
  const imported=importVoyage({seed:'old',homeSeed:system.seed,generation},'copy');assert.deepEqual(imported.generation,generation);assert.ok(Number.isFinite(imported.ship.x));
});
test('a selected sample can be collected only once, including repeated activations',()=>{
  const save=voyage(),sample={id:'sample-1'};assert.equal(collectSample(save,sample,'Earth'),true);assert.equal(collectSample(save,sample,'Earth'),false);
  assert.equal(save.log.length,1);assert.deepEqual(save.discoveries,['sample-1']);
});
test('dwarf classification follows recognition or explicit dynamical evidence, never size alone',()=>{
  for(const name of RECOGNIZED_DWARF_PLANETS)assert.equal(bodyKind({id:'sol:'+name,name,kind:'planet'}),'dwarf-planet');
  const evidence={round:true,orbitsStar:true,clearedOrbit:false};
  assert.equal(bodyKind({kind:'planet',classification:evidence}),'dwarf-planet');
  for(const diameter of [100,1000,2376.6,4000,19000])assert.equal(bodyKind({kind:'planet',diameter}),'planet');
  assert.equal(bodyKind({id:'sol:Pluto:Charon',name:'Charon',kind:'moon',classification:evidence}),'moon');
  const sol=makeSystem('sol'),counts=bodyCounts(sol),text=terminalLines(sol.star,sol);
  assert.equal(counts.planets,8);assert.equal(counts.dwarfPlanets,1);assert.ok(counts.moons>0);
  assert.equal((text.match(/^PLANET COUNT : 8$/gm)||[]).length,1);assert.match(text,/DWARF PLANET COUNT : 1/);
  assert.match(terminalLines(sol.planets.find(p=>p.name==='Pluto'),sol),/TYPE : Dwarf planet/);
  assert.match(terminalLines(sol.planets.find(p=>p.name==='Pluto').moons[0],sol),/TYPE : Moon/);
});
test('same seeded body ID in separate generation profiles never shares terrain or planet frames',()=>{
  const previous=globalThis.document;globalThis.document={createElement:()=>({getContext(){return {createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}};}})};
  try{const desert={id:'same',kind:'planet',type:'desert',color:'#d38d67',rotationDays:1},rock={...desert,type:'rock',color:'#a7a7b7'};
    const terrain=new TerrainRenderer();assert.deepEqual(terrain.sampler(rock)(100,100),createTerrainSampler(rock)(100,100));assert.notDeepEqual(terrain.sampler(desert)(100,100),terrain.sampler(rock)(100,100));
    assert.notEqual(celestialSprite(desert,0),celestialSprite(rock,0));assert.equal(celestialSprite(rock,0),celestialSprite(rock,0));
  }finally{globalThis.document=previous;}
});
test('wide surface viewports reuse all warm tiles within the bounded cache',()=>{
  const previous=globalThis.document;let built=0;globalThis.document={createElement:()=>{built++;return {getContext(){return {createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}};}};}};
  const ctx={save(){},restore(){},drawImage(){}};
  try{for(const [width,height]of [[844,390],[1920,1080],[2560,1440],[3840,2160]]){
    const terrain=new TerrainRenderer(),body={id:'wide'+width,type:'rock'};
    // Tile caching is the concern here; the deterministic sampler is tested above.
    terrain.sampler=()=>()=>({color:[115,125,130]});terrain.draw(ctx,body,{x:50,y:35},.65,width,height,2);const cold=built;
    for(let i=0;i<5;i++)terrain.draw(ctx,body,{x:50,y:35},.65,width,height,2);
    assert.equal(built,cold,width+' warm view rebuilt tiles');assert.ok(terrain.cache.size<=96);for(const tile of terrain.cache.values())assert.ok(tile.width<=96&&tile.height<=96);
  }}finally{globalThis.document=previous;}
});
test('worker updates wait for a safe menu and reload only once',()=>{
  let safe=false,reloads=0,activated=0;const update=createUpdateCoordinator({isSafe:()=>safe,reload:()=>reloads++});
  update.waiting({waiting:{postMessage:message=>{assert.equal(message.type,'SKIP_WAITING');activated++;}}});assert.equal(activated,0);update.changed();assert.equal(reloads,0);
  safe=true;assert.equal(update.apply(),true);assert.equal(reloads,1);update.apply();assert.equal(reloads,1);
  safe=false;const waiting=createUpdateCoordinator({isSafe:()=>safe,reload:()=>reloads++});waiting.waiting({waiting:{postMessage:()=>activated++}});assert.equal(activated,0);safe=true;waiting.apply();assert.equal(activated,1);
});
test('cached surface scenery retains its original seeded placement and has bounded storage',()=>{
  const terrain=new TerrainRenderer(),body=makeSystem('sol').planets[2],sample=createTerrainSampler(body);
  for(let cy=-5;cy<=5;cy++)for(let cx=-8;cx<=8;cx++){
    const r=rng(`props:${body.id}:${cx},${cy}`);let expected=null;
    if(r()>=.38){const x=(cx+r())*110,y=(cy+r())*110,t=sample(x,y);if(!t.water&&Math.hypot(x,y)>=85){const tree=t.biome==='forest'&&r()<.65;expected={x,y,tree,size:tree?null:3+Math.floor(r()*5)};}}
    assert.deepEqual(terrain.prop(body,cx,cy),expected);
  }
  let samples=0;terrain.sampler=()=>()=>{samples++;return {water:false,biome:'plain'};};terrain.props.clear();
  for(let i=0;i<5000;i++)terrain.prop(body,i,0);assert.equal(terrain.props.size,2048);
  const cold=samples;for(let i=4000;i<5000;i++)terrain.prop(body,i,0);assert.equal(samples,cold);
  terrain.clear();assert.equal(terrain.props.size,0);
});
test('native music pauses on hiding, resumes without rewinding and respects mute',async()=>{
  const document={hidden:false,addEventListener(){},removeEventListener(){}},settings={music:true,volume:.4},audio={paused:true,currentTime:9,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};
  const music=createMusicController(audio,settings,document);music.beginMusic();await Promise.resolve();audio.currentTime=17;document.hidden=true;music.setVisibility(true);assert.equal(audio.paused,true);assert.equal(audio.currentTime,17);
  document.hidden=false;music.setVisibility(false);assert.equal(audio.paused,false);assert.equal(audio.currentTime,17);settings.music=false;music.applyMusicSetting();music.setVisibility(false);assert.equal(audio.paused,true);
});
test('a first worker claim is quiet and a later same-session update is deferred safely',async()=>{
  let safe=false,reloads=0;const listeners={},registration={addEventListener(){}};
  const sw={controller:null,addEventListener:(name,fn)=>{listeners[name]=fn;},register:()=>Promise.resolve(registration)};
  const apply=registerAppWorker({serviceWorker:sw,isSafe:()=>safe,reload:()=>reloads++});await Promise.resolve();
  sw.controller={version:1};listeners.controllerchange();assert.equal(reloads,0);
  sw.controller={version:2};listeners.controllerchange();assert.equal(reloads,0);
  safe=true;apply();assert.equal(reloads,1);
});
