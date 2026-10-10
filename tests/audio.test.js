import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const audio=readFileSync(new URL('../src/core/audio.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');

test('music is one native looping audio element with no JS song timer or ended scheduler',()=>{
  assert.match(index,/id="soundtrackAudio"[^>]*\bautoplay\b[^>]*\bloop\b|id="soundtrackAudio"[^>]*\bloop\b[^>]*\bautoplay\b/);
  assert.match(index,/nostalgic_melody_soft_synth\.mp3/);
  assert.doesNotMatch(main,/SoundtrackPlayer|musicTimer|scheduleMusic|addEventListener\('ended'/);
  assert.match(audio,/musicAudio\.play\(\)/);
});

test('the full soundtrack is checked in and deployment stages runtime assets only',()=>{
  assert.ok(statSync(new URL('../audio/nostalgic_melody_soft_synth.mp3',import.meta.url)).size>700000);
  assert.match(workflow,/npm run build/);
  assert.match(workflow,/path: dist/);
});

test('service worker bypasses audio and range streaming',()=>{
  assert.doesNotMatch(sw,/nostalgic_melody_soft_synth\.mp3/);
  assert.match(sw,/event\.request\.headers\.has\('range'\)/);
  assert.match(sw,/url\.pathname\.includes\('\/audio\/'\)/);
});
