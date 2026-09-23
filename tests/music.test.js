import test from 'node:test';
import assert from 'node:assert/strict';
import {Soundtrack,MELODY} from '../music.js';

test('original melody is preserved with the inaudible invalid MIDI tail repaired as rests',()=>{
  assert.equal(MELODY.length,101);
  assert.deepEqual(MELODY.slice(0,16),[60,64,67,64,62,67,59,67,57,60,64,60,57,60,65,60]);
  assert.ok(MELODY.every(n=>n===null||(n>=0&&n<=127)));
});
test('repeated startup gestures share one music scheduler and mute clears it',async t=>{
  let scheduled=0,cleared=0;
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}});
  const node=()=>({frequency:param(),Q:param(),gain:param(),detune:param(),connect(){},disconnect(){},start(){},stop(){}});
  class AudioContext{
    constructor(){this.state='suspended';this.currentTime=0;this.destination={};}
    resume(){this.state='running';return Promise.resolve();}
    suspend(){this.state='suspended';return Promise.resolve();}
    createGain(){return node();}createOscillator(){return node();}createBiquadFilter(){return node();}
  }
  globalThis.window={AudioContext};
  t.after(()=>{delete globalThis.window;});
  t.mock.method(globalThis,'setInterval',()=>{scheduled++;return 42;});
  t.mock.method(globalThis,'clearInterval',()=>{cleared++;});
  const music=new Soundtrack();music.start();music.start();music.start();await Promise.resolve();
  assert.equal(scheduled,1);music.configure(false,.65);assert.equal(cleared,1);
  music.start();assert.equal(scheduled,1);
});
