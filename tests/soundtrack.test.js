import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundtrackPlayer} from '../soundtrack-player.js';

class FakeAudio {
  constructor(src){
    this.src=src;this.loop=false;this.preload='';this.playsInline=false;
    this.volume=1;this.currentTime=0;this.paused=true;this.ended=false;this.playCount=0;
    this.listeners=new Map();
  }
  addEventListener(name,fn){this.listeners.set(name,fn);}
  emit(name){this.listeners.get(name)?.();}
  play(){this.paused=false;this.ended=false;this.playCount++;return Promise.resolve();}
  pause(){this.paused=true;}
}

function timerHarness(t){
  const timers=new Map();let next=1;
  t.mock.method(globalThis,'setTimeout',(fn,ms)=>{const id=next++;timers.set(id,{fn,ms});return id;});
  t.mock.method(globalThis,'clearTimeout',id=>timers.delete(id));
  return timers;
}

test('menu begin waits two seconds, plays once, then ended waits two seconds before replay',async t=>{
  globalThis.Audio=FakeAudio;t.after(()=>{delete globalThis.Audio;});
  const timers=timerHarness(t);
  const player=new SoundtrackPlayer('./audio/test.mp3');
  player.configure(true,.72);
  player.begin(2);

  assert.equal(player.audio.loop,false);
  assert.equal(timers.size,1);
  assert.equal([...timers.values()][0].ms,2000);
  assert.equal(player.audio.playCount,0);

  const first=[...timers.entries()][0];timers.delete(first[0]);first[1].fn();
  await Promise.resolve();
  assert.equal(player.audio.playCount,1);
  assert.equal(player.audio.volume,.72);

  player.audio.ended=true;player.audio.paused=true;player.audio.emit('ended');
  assert.equal(timers.size,1);
  assert.equal([...timers.values()][0].ms,2000);
  assert.equal(player.audio.playCount,1);

  const second=[...timers.entries()][0];timers.delete(second[0]);second[1].fn();
  await Promise.resolve();
  assert.equal(player.audio.playCount,2);
  assert.equal(player.audio.currentTime,0);
});

test('volume changes do not restart or interrupt current playback',async t=>{
  globalThis.Audio=FakeAudio;t.after(()=>{delete globalThis.Audio;});
  const timers=timerHarness(t);
  const player=new SoundtrackPlayer('track.mp3');
  player.begin(0);
  const pending=[...timers.entries()][0];timers.delete(pending[0]);pending[1].fn();
  await Promise.resolve();
  assert.equal(player.audio.playCount,1);
  assert.equal(player.audio.paused,false);

  player.configure(true,.4);
  assert.equal(player.audio.playCount,1);
  assert.equal(player.audio.paused,false);
  assert.equal(player.audio.volume,.4);
  assert.equal(timers.size,0);
});

test('music setting can stop playback and re-enable it with a fresh two-second delay',async t=>{
  globalThis.Audio=FakeAudio;t.after(()=>{delete globalThis.Audio;});
  const timers=timerHarness(t);
  const player=new SoundtrackPlayer('track.mp3');
  player.begin(0);
  const first=[...timers.entries()][0];timers.delete(first[0]);first[1].fn();
  await Promise.resolve();

  player.configure(false,.5);
  assert.equal(player.audio.paused,true);
  assert.equal(player.audio.currentTime,0);
  assert.equal(timers.size,0);

  player.configure(true,.5);
  assert.equal(timers.size,1);
  assert.equal([...timers.values()][0].ms,2000);
});

test('visibility pauses the song and resumes the same position instead of restarting it',async t=>{
  globalThis.Audio=FakeAudio;t.after(()=>{delete globalThis.Audio;});
  const timers=timerHarness(t);
  const player=new SoundtrackPlayer('track.mp3');
  player.begin(0);
  const pending=[...timers.entries()][0];timers.delete(pending[0]);pending[1].fn();
  await Promise.resolve();
  player.audio.currentTime=12.5;

  player.visibility(true);
  assert.equal(player.audio.paused,true);
  assert.equal(player.audio.currentTime,12.5);

  player.visibility(false);
  await Promise.resolve();
  assert.equal(player.audio.currentTime,12.5);
  assert.equal(player.audio.paused,false);
});
