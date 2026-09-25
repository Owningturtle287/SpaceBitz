import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../main.js',import.meta.url),'utf8');
const settings=readFileSync(new URL('../settings.js',import.meta.url),'utf8');

test('flight HUD uses dedicated warp drive and upper-right log utility',()=>{
  assert.doesNotMatch(index,/class="brand"/);
  assert.doesNotMatch(index,/id="statusText"/);
  assert.match(index,/<header class="topbar">[\s\S]*id="systemChart"/);
  assert.match(index,/id="mapButton" class="warp-drive-button"/);
  assert.match(index,/class="warp-label">WARP DRIVE</);
  assert.match(index,/class="warp-sub">INTERSTELLAR</);
  assert.match(index,/class="utility-stack"[\s\S]*id="settingsOpen"[\s\S]*id="journalButton"/);
  assert.match(index,/class="log-glyph"/);
});

test('center button is separate from warp drive and supports saved placement modes',()=>{
  assert.match(index,/id="homeButton" class="center-button/);
  assert.match(settings,/centerButton:'right'/);
  assert.match(settings,/\['centerButton',\['right','above','custom','hidden'\]\]/);
  assert.match(main,/control\('centerButton','Center button'/);
  assert.match(main,/settings\.centerX/);
  assert.match(main,/settings\.centerY/);
  assert.match(main,/centerButton!=='custom'/);
});

test('target card is intentionally minimal',()=>{
  assert.match(index,/id="targetName"/);
  assert.match(index,/id="primaryAction"/);
  assert.match(index,/id="secondaryAction"/);
  assert.doesNotMatch(index,/id="targetMetrics"|id="targetText"|id="targetTag"|id="targetGlyph"/);
  assert.ok(!main.includes("$('targetMetrics')"));
  assert.ok(!main.includes("$('targetText')"));
  assert.ok(!main.includes("$('targetTag')"));
  assert.ok(!main.includes("$('targetGlyph')"));
});

test('background contains no offset nebula/backlight',()=>{
  assert.doesNotMatch(main,/w\*\.7,h\*\.4|#338e9c|\bneb\b/);
  assert.match(main,/b\.fillStyle='#000104'/);
});
