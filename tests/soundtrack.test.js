import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundtrackPlayer} from '../soundtrack-player.js';

class FakeAudio {
  constructor(src){this.src=src;this.loop=false;this.preload='';this.playsInline=false;this.volume=1;this.currentTime=0;this.paused=true;this.playCount=0;}
  play(){this.paused=false;this.playCount++;return Promise.resolve();}
  pause(){this.paused=true;}
}

test('soundtrack player uses one audio element and one pending delayed start',t=>{
  globalThis.Audio=FakeAudio;
  t.after(()=>{delete globalThis.Audio;});
  const timers=new Map();let next=1;
  t.mock.method(globalThis,'setTimeout',(fn,ms)=>{const id=next++;timers.set(id,{fn,ms});return id;});
  t.mock.method(globalThis,'clearTimeout',id=>timers.delete(id));
  const player=new SoundtrackPlayer('./audio/test.mp3');
  player.configure(true,.72);
  player.start(2);player.start(2);player.start(2);
  assert.equal(timers.size,1);
  assert.equal(player.audio.playCount,3);
  assert.equal(player.audio.volume,0);
  const pending=[...timers.values()][0];
  assert.equal(pending.ms,2000);
  pending.fn();
  assert.equal(player.audio.currentTime,0);
  assert.equal(player.audio.volume,.72);
  assert.equal(player.generation,3);
});

test('disabling or stopping always silences and rewinds the single track',t=>{
  globalThis.Audio=FakeAudio;
  t.after(()=>{delete globalThis.Audio;});
  t.mock.method(globalThis,'setTimeout',()=>1);
  t.mock.method(globalThis,'clearTimeout',()=>{});
  const player=new SoundtrackPlayer('track.mp3');
  player.start(2);
  player.configure(false,.5);
  assert.equal(player.audio.paused,true);
  assert.equal(player.audio.currentTime,0);
  player.configure(true,.5);
  player.startNow();
  player.stop();
  assert.equal(player.audio.paused,true);
  assert.equal(player.audio.currentTime,0);
});
