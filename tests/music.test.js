import test from 'node:test';
import assert from 'node:assert/strict';
import {Soundtrack,MELODY} from '../music.js';

test('original melody is preserved with the inaudible invalid MIDI tail repaired as rests',()=>{
  assert.equal(MELODY.length,101);
  assert.deepEqual(MELODY.slice(0,16),[60,64,67,64,62,67,59,67,57,60,64,60,57,60,65,60]);
  assert.ok(MELODY.every(n=>n===null||(n>=0&&n<=127)));
});
test('repeated voyage starts leave only one live two-second start and one scheduler',async t=>{
  let scheduled=0,nextTimer=1;
  const liveTimeouts=new Map();
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}});
  const node=()=>({frequency:param(),Q:param(),gain:param(),detune:param(),connect(){},disconnect(){},start(){},stop(){}});
  class AudioContext{
    constructor(){this.state='suspended';this.currentTime=10;this.destination={};}
    resume(){this.state='running';return Promise.resolve();}
    suspend(){this.state='suspended';return Promise.resolve();}
    createGain(){return node();}createOscillator(){return node();}createBiquadFilter(){return node();}
  }
  globalThis.window={AudioContext};t.after(()=>{delete globalThis.window;});
  t.mock.method(globalThis,'setTimeout',(fn,ms)=>{const id=nextTimer++;liveTimeouts.set(id,{fn,ms});return id;});
  t.mock.method(globalThis,'clearTimeout',id=>liveTimeouts.delete(id));
  t.mock.method(globalThis,'setInterval',()=>{scheduled++;return 42;});
  t.mock.method(globalThis,'clearInterval',()=>{});
  const music=new Soundtrack();
  music.startFromBeginning(2);music.startFromBeginning(2);music.startFromBeginning(2);
  await Promise.resolve();await Promise.resolve();
  assert.equal(liveTimeouts.size,1);
  const pending=[...liveTimeouts.values()][0];assert.equal(pending.ms,2000);
  assert.equal(scheduled,0);pending.fn();
  assert.equal(scheduled,1);assert.equal(music.generation,3);
});
test('restart explicitly cancels already-created voices before arming again',t=>{
  let stopped=0;
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}});
  const node=()=>({frequency:param(),Q:param(),gain:param(),detune:param(),connect(){},disconnect(){},start(){},stop(){stopped++;}});
  class AudioContext{
    constructor(){this.state='running';this.currentTime=4;this.destination={};}
    resume(){return Promise.resolve();}suspend(){return Promise.resolve();}
    createGain(){return node();}createOscillator(){return node();}createBiquadFilter(){return node();}
  }
  globalThis.window={AudioContext};t.after(()=>{delete globalThis.window;});
  t.mock.method(globalThis,'setTimeout',()=>11);t.mock.method(globalThis,'clearTimeout',()=>{});
  t.mock.method(globalThis,'setInterval',()=>77);t.mock.method(globalThis,'clearInterval',()=>{});
  const music=new Soundtrack();music.ensure();music.note(60,4.1,music.generation);
  assert.equal(music.voices.size,1);music.startFromBeginning(2);assert.equal(music.voices.size,0);assert.ok(stopped>=2);
});
test('configure alone never starts a soundtrack',()=>{
  let scheduled=0;globalThis.window={AudioContext:class{}};
  const original=globalThis.setInterval;globalThis.setInterval=()=>{scheduled++;return 1;};
  try{const music=new Soundtrack();music.configure(true,.8);assert.equal(scheduled,0);assert.equal(music.active,false);}
  finally{globalThis.setInterval=original;delete globalThis.window;}
});
