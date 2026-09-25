import test from 'node:test';
import assert from 'node:assert/strict';
import {Soundtrack,MELODY,NOTE_SECONDS} from '../music.js';

const param=()=>({
  value:0,events:[],
  setValueAtTime(value,time){this.value=value;this.events.push(['set',value,time]);},
  linearRampToValueAtTime(value,time){this.value=value;this.events.push(['ramp',value,time]);},
  setTargetAtTime(value,time,constant){this.value=value;this.events.push(['target',value,time,constant]);}
});
const node=()=>({
  frequency:param(),Q:param(),gain:param(),detune:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),
  connect(){},disconnect(){},start(){this.started=(this.started||0)+1;},stop(){this.stopped=(this.stopped||0)+1;},setPeriodicWave(){this.wave=true;}
});
function audioHarness(state='suspended'){
  const created={oscillators:[],gains:[],intervals:0,timeouts:new Map(),nextId:1,intervalFn:null};
  class AudioContext{
    constructor(){this.state=state;this.currentTime=10;this.destination={};}
    resume(){this.state='running';return Promise.resolve();}
    suspend(){this.state='suspended';return Promise.resolve();}
    createGain(){const n=node();created.gains.push(n);return n;}
    createOscillator(){const n=node();created.oscillators.push(n);return n;}
    createBiquadFilter(){return node();}
    createDynamicsCompressor(){return node();}
    createPeriodicWave(){return {};}
  }
  return {AudioContext,created};
}

test('uploaded original melody phrase and timing are preserved',()=>{
  assert.deepEqual(MELODY,[60,64,67,64,62,67,59,67,57,60,64,60,57,60,65,60]);
  assert.equal(NOTE_SECONDS,.60);
});

test('rapid voyage starts collapse to one delayed single-oscillator playback',async t=>{
  const {AudioContext,created}=audioHarness('suspended');globalThis.window={AudioContext};t.after(()=>{delete globalThis.window;});
  t.mock.method(globalThis,'setTimeout',(fn,ms)=>{const id=created.nextId++;created.timeouts.set(id,{fn,ms});return id;});
  t.mock.method(globalThis,'clearTimeout',id=>created.timeouts.delete(id));
  t.mock.method(globalThis,'setInterval',fn=>{created.intervals++;created.intervalFn=fn;return 77;});
  t.mock.method(globalThis,'clearInterval',()=>{});
  const music=new Soundtrack();
  music.startFromBeginning(2);music.startFromBeginning(2);music.startFromBeginning(2);
  await Promise.resolve();await Promise.resolve();
  assert.equal(created.timeouts.size,1);
  const pending=[...created.timeouts.values()][0];assert.equal(pending.ms,2000);
  assert.equal(created.oscillators.length,0);assert.equal(created.intervals,0);
  pending.fn();
  assert.equal(created.oscillators.length,1);assert.equal(created.intervals,1);assert.equal(music.generation,3);
});

test('the entire melody uses one oscillator and note envelopes finish before the next note',t=>{
  const {AudioContext,created}=audioHarness('running');globalThis.window={AudioContext};t.after(()=>{delete globalThis.window;});
  t.mock.method(globalThis,'setTimeout',fn=>{fn();return 1;});t.mock.method(globalThis,'clearTimeout',()=>{});
  t.mock.method(globalThis,'setInterval',fn=>{created.intervals++;created.intervalFn=fn;return 9;});
  t.mock.method(globalThis,'clearInterval',()=>{});
  const music=new Soundtrack();music.startFromBeginning(0);
  assert.equal(created.oscillators.length,1);
  for(let i=0;i<12;i++){music.context.currentTime+=.6;created.intervalFn();}
  assert.equal(created.oscillators.length,1);
  const ramps=music.toneGain.gain.events.filter(e=>e[0]==='ramp'&&e[1]===0);
  assert.ok(ramps.length>1);
  const firstStart=music.toneGain.gain.events.find(e=>e[0]==='set'&&e[1]===0)[2];
  assert.ok(ramps[0][2]-firstStart<NOTE_SECONDS);
});

test('restarting playback destroys the prior oscillator before a new one can start',t=>{
  const {AudioContext,created}=audioHarness('running');globalThis.window={AudioContext};t.after(()=>{delete globalThis.window;});
  const pending=[];
  t.mock.method(globalThis,'setTimeout',(fn,ms)=>{pending.push(fn);return pending.length;});
  t.mock.method(globalThis,'clearTimeout',()=>{});
  t.mock.method(globalThis,'setInterval',()=>22);t.mock.method(globalThis,'clearInterval',()=>{});
  const music=new Soundtrack();music.startFromBeginning(2);pending.shift()();
  const first=created.oscillators[0];assert.equal(created.oscillators.length,1);
  music.startFromBeginning(2);
  assert.equal(first.stopped,1);
  assert.equal(created.oscillators.length,1);
  pending.shift()();
  assert.equal(created.oscillators.length,2);
  assert.equal(created.oscillators.filter(o=>!o.stopped).length,1);
});

test('configure alone never starts music',()=>{
  const {AudioContext,created}=audioHarness('running');globalThis.window={AudioContext};
  try{const music=new Soundtrack();music.configure(true,.8);assert.equal(created.oscillators.length,0);assert.equal(music.active,false);}
  finally{delete globalThis.window;}
});
