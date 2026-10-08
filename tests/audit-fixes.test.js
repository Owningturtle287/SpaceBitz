import test from 'node:test';
import assert from 'node:assert/strict';
import {persistVoyage,readVoyages,saveBeforeExit,SAVE_KEY} from '../voyage-storage.js';
import {recordAction,recordObject,pendingLogEntries,acknowledgeLogEntries,RECENT_LOG_LIMIT} from '../voyage-log.js';
import {makeSystem,bodyPosition,visualRadius} from '../model.js';
import {stationAnchor,applyStationAnchor,resetFlightContext} from '../flight-state.js';
import {importVoyage} from '../saves.js';
import {registerAppWorker} from '../pwa.js';
const memory=()=>({data:new Map(),getItem(k){return this.data.get(k)??null;},setItem(k,v){this.data.set(k,v);}});
const voyage=()=>({id:'audit',name:'Audit',seed:'audit',homeSeed:'sol',currentSystem:'sol',scene:'system',ship:{x:1000,y:0},surface:{x:0,y:0},chart:{x:0,y:0},days:200,layoutVersion:4,discoveries:[],route:[],log:[]});

test('a stale voyage cannot replace another window’s discoveries or a deleted voyage',()=>{
  const storage=memory(),save=voyage();persistVoyage(storage,save,1);
  const a=structuredClone(save),b=structuredClone(save);a.discoveries.push('new-discovery');recordAction(a,'New discovery');persistVoyage(storage,a,2);
  const before=storage.getItem(SAVE_KEY);assert.throws(()=>persistVoyage(storage,b,3),{name:'VoyageConflictError'});
  assert.equal(storage.getItem(SAVE_KEY),before);assert.deepEqual(readVoyages(storage)[0].discoveries,['new-discovery']);
  storage.setItem(SAVE_KEY,'[]');assert.throws(()=>persistVoyage(storage,a),{name:'VoyageConflictError'});
});
test('Save and Main Menu waits for asynchronous persistence and keeps failures open',async()=>{
  let resolve,exits=0;const pending=new Promise(r=>resolve=r),result=saveBeforeExit(()=>pending,()=>exits++);
  assert.equal(exits,0);resolve(false);assert.equal(await result,false);assert.equal(exits,0);
  assert.equal(await saveBeforeExit(async()=>true,()=>exits++),true);assert.equal(exits,1);
});
test('archiving bounds the working log while retaining newer changes made during a write',()=>{
  const save=voyage();for(let i=0;i<350;i++)recordAction(save,'Event '+i);
  const batch=pendingLogEntries(save);assert.equal(batch.length,350);
  recordObject(save,{key:'earth',name:'Earth',type:'Planet',text:'Old data'});const first=pendingLogEntries(save);
  recordObject(save,{key:'earth',name:'Earth',type:'Planet',text:'New data'});
  acknowledgeLogEntries(save,first);assert.equal(save.log.length,RECENT_LOG_LIMIT);
  assert.deepEqual(pendingLogEntries(save).map(e=>e.data),['New data']);
});
test('large valid backup histories import intact, including their order and identifiers',()=>{
  const raw=voyage();for(let i=0;i<4000;i++)recordAction(raw,'Status '+i+' '+'.'.repeat(500));
  const text=JSON.stringify(raw,null,2);assert.ok(Buffer.byteLength(text)>2_000_000);
  const imported=importVoyage(JSON.parse(text),'copy');assert.deepEqual(imported.log,raw.log);
});
test('station keeping follows Earth across a real-time resume and survives backup restoration',()=>{
  const save=voyage(),system=makeSystem('sol'),earth=system.planets.find(p=>p.name==='Earth'),position=bodyPosition(earth,save.days,system);
  save.ship={x:position.x+visualRadius(earth.diameter)+60,y:position.y};
  const anchor=stationAnchor(save,system);assert.equal(anchor.id,earth.id);
  save.station={system:system.seed,...anchor};save.days+=1;applyStationAnchor(save,system,anchor);
  const moved=bodyPosition(earth,save.days,system);assert.ok(Math.abs(save.ship.x-moved.x-anchor.x)<1e-7);assert.ok(Math.abs(save.ship.y-moved.y-anchor.y)<1e-7);
  const copy=importVoyage(save,'copy');assert.deepEqual(copy.station,save.station);
  assert.throws(()=>importVoyage({...save,station:{...save.station,id:'missing'}},'copy'));
});
test('layer changes clear stale transitions and advance the input context together',()=>{
  const state={flightContext:2,save:{scene:'chart'},shipMotion:{thrust:1},warpUntil:123,autopilot:{type:'star'},waypoint:{x:1,y:2},followBody:{id:'earth'},terminal:{},terminalExpanded:true};
  resetFlightContext(state,'system');assert.equal(state.flightContext,3);assert.equal(state.scene,'system');assert.equal(state.save.scene,'system');
  for(const field of ['autopilot','waypoint','followBody','terminal','centerZoom'])assert.equal(state[field],null);
  assert.equal(state.warpUntil,0);assert.equal(state.terminalExpanded,false);assert.equal(state.shipMotion.thrust,0);
});
test('updates already installing at registration completion are observed and errors are reported',async()=>{
  const listeners={},worker={state:'installing',addEventListener:(name,fn)=>listeners[name]=fn};let ready=0,reloads=0;
  const registration={installing:worker,waiting:null,addEventListener(){},update:async()=>{throw Error('offline');}};
  const errors=[],serviceWorker={controller:{},addEventListener(){},register:async()=>registration};
  const apply=registerAppWorker({serviceWorker,isSafe:()=>false,reload:()=>reloads++,onReady:()=>ready++,onError:e=>errors.push(e.message)});
  await Promise.resolve();await Promise.resolve();registration.waiting={postMessage(){}};worker.state='installed';listeners.statechange();listeners.statechange();
  assert.equal(ready,1);assert.equal(reloads,0);await apply.check();assert.deepEqual(errors,['offline']);
});
