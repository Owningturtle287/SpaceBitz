import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../main.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('music uses one persistent HTML audio element and no legacy player class',()=>{
  assert.match(index,/id="soundtrackAudio"/);
  assert.match(index,/nostalgic_melody_soft_synth\.mp3/);
  assert.doesNotMatch(main,/SoundtrackPlayer|soundtrack\.start|soundtrack\.begin|soundtrack\.visibility/);
  assert.match(main,/musicAudio\.addEventListener\('ended'/);
  assert.match(main,/scheduleMusic\(2000\)/);
});

test('service worker never caches or intercepts audio range streaming',()=>{
  assert.doesNotMatch(sw,/nostalgic_melody_soft_synth\.mp3/);
  assert.match(sw,/event\.request\.headers\.has\('range'\)/);
  assert.match(sw,/url\.pathname\.includes\('\/audio\/'\)/);
});
