import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../main.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');

test('music is one native looping audio element with no JS song timer or ended scheduler',()=>{
  assert.match(index,/id="soundtrackAudio"[^>]*\bautoplay\b[^>]*\bloop\b|id="soundtrackAudio"[^>]*\bloop\b[^>]*\bautoplay\b/);
  assert.match(index,/nostalgic_melody_soft_synth\.mp3/);
  assert.doesNotMatch(main,/SoundtrackPlayer|musicTimer|scheduleMusic|addEventListener\('ended'/);
  assert.match(main,/musicAudio\.play\(\)/);
});

test('deployment builds and validates the full soundtrack before publishing',()=>{
  assert.match(workflow,/python scripts\/build_soundtrack\.py/);
  assert.match(workflow,/libmp3lame -b:a 96k/);
  assert.match(workflow,/test "\$\{BYTES\}" -gt 700000/);
  assert.match(workflow,/DURATION/);
});

test('service worker bypasses audio and range streaming',()=>{
  assert.doesNotMatch(sw,/nostalgic_melody_soft_synth\.mp3/);
  assert.match(sw,/event\.request\.headers\.has\('range'\)/);
  assert.match(sw,/url\.pathname\.includes\('\/audio\/'\)/);
});
