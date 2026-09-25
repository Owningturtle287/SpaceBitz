import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundtrackPlayer} from '../soundtrack-player.js';

class FakeAudio {
  constructor(src){
    this.src=src;this.loop=false;this.preload='';this.playsInline=false;
    this.volume=1;this.currentTime=0;this.paused=true;this.ended=false;this.playCount=0;
    this.listeners=new Map();this.rejectNext=false;
  }
  addEventListener(name,fn){this.listeners.set(name,fn);}
  emit(name){this.listeners.get(name)?.();}
  play(){
    this.playCount++;
    if(this.rejectNext){this.rejectNext=false;this.paused=true;return Promise.reject(new Error('blocked'));}
    this.paused=false;this.ended=false;return Promise.resolve();
  }
  pause(){this.paused=true;}
}

function timerHarness(t){
  const timers=new Map();let next=1;
  t.mock.method(globalThis,'setTimeout',(fn,ms)=>{const id=next++;timers.set(id,{fn,ms});return id;});
  t.mock.method(globalThis,'clearTimeout',id=>timers.delete(id));
  return timers;
}

test('one simple cycle: two-second delay, one play, ended, two-second delay, one replay',async t=>{
  globalThis.Audio=FakeAudio;t.after(()=>{delete globalThis.Audio;});
  const timers=timerHarness(t);
  const player=new SoundtrackPlayer('track.mp3');
  player.configure(true,.75);
  player.begin(2);

  assert.equal(player.audio.loop,false);
  assert.equal(timers.size,1);
  assert.equal([...timers.values()][0].ms,2000);
  assert.equal(player.audio.playCount,0);

  let [id,pending]=[...timers.entries()][0];timers.delete(id);pending.fn();
  await Promise.resolve();
  assert.equal(player.audio.playCount,1);
  assert.equal(player.audio.paused,false);

  player.audio.paused=true;player.audio.ended=true;player.audio.emit('ended');
  assert.equal(timers.size,1);
  assert.equal([...timers.values()][0].ms,2000);
  assert.equal(player.audio.playCount,1);

  [id,pending]=[...timers.entries()][0];timers.delete(id);pending.fn();
  await Promise.resolve();
  assert.equal(player.audio.playCount,2);
  assert.equal(player.audio.paused,false);
});

test('volume changes never stop, restart or reschedule a playing song',async t=>{
  globalThis.Audio=FakeAudio;t.after(()=>{delete globalThis.Audio;});
  const timers=timerHarness(t);
  const player=new SoundtrackPlayer('track.mp3');
  player.begin(0);
  const [id,pending]=[...timers.entries()][0];timers.delete(id);pending.fn();
  await Promise.resolve();

  player.audio.currentTime=11.2;
  player.configure(true,.35);
  assert.equal(player.audio.playCount,1);
  assert.equal(player.audio.paused,false);
  assert.equal(player.audio.currentTime,11.2);
  assert.equal(player.audio.volume,.35);
  assert.equal(timers.size,0);
});

test('an autoplay rejection installs only one temporary unlock path and retries once on gesture',async t=>{
  globalThis.Audio=FakeAudio;t.after(()=>{delete globalThis.Audio;});
  const timers=timerHarness(t);
  const listeners=new Map();
  globalThis.document={
    addEventListener(name,fn){listeners.set(name,fn);},
    removeEventListener(name,fn){if(listeners.get(name)===fn)listeners.delete(name);}
  };
  t.after(()=>{delete globalThis.document;});

  const player=new SoundtrackPlayer('track.mp3');
  player.audio.rejectNext=true;
  player.begin(0);
  const [id,pending]=[...timers.entries()][0];timers.delete(id);pending.fn();
  await Promise.resolve();await Promise.resolve();

  assert.equal(player.audio.playCount,1);
  assert.equal(player.blocked,true);
  assert.equal(player.unlockInstalled,true);

  player.unlock();
  await Promise.resolve();
  assert.equal(player.audio.playCount,2);
  assert.equal(player.audio.paused,false);
  assert.equal(player.blocked,false);
  assert.equal(player.unlockInstalled,false);
});

test('turning music off is the only settings action that stops and rewinds playback',async t=>{
  globalThis.Audio=FakeAudio;t.after(()=>{delete globalThis.Audio;});
  const timers=timerHarness(t);
  const player=new SoundtrackPlayer('track.mp3');
  player.begin(0);
  const [id,pending]=[...timers.entries()][0];timers.delete(id);pending.fn();
  await Promise.resolve();
  player.audio.currentTime=9;

  player.configure(false,.5);
  assert.equal(player.audio.paused,true);
  assert.equal(player.audio.currentTime,0);
  assert.equal(timers.size,0);

  player.configure(true,.5);
  assert.equal(timers.size,1);
  assert.equal([...timers.values()][0].ms,2000);
});
