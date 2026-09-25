import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../main.js',import.meta.url),'utf8');

test('flight HUD uses top-left system chart with no in-game brand or bottom status strip',()=>{
  assert.doesNotMatch(index,/class="brand"/);
  assert.doesNotMatch(index,/id="statusText"/);
  assert.match(index,/<header class="topbar">[\s\S]*id="systemChart"/);
  assert.match(index,/class="main-controls glass nav-dock"/);
  assert.match(index,/class="settings-glyph"/);
});

test('target card is intentionally minimal',()=>{
  assert.match(index,/id="targetName"/);
  assert.match(index,/id="primaryAction"/);
  assert.match(index,/id="secondaryAction"/);
  assert.doesNotMatch(index,/id="targetMetrics"|id="targetText"|id="targetTag"|id="targetGlyph"/);
  assert.doesNotMatch(main,/\$('targetMetrics'\)|\$('targetText'\)|\$('targetTag'\)|\$('targetGlyph'\)/);
});

test('background contains no offset nebula/backlight',()=>{
  assert.doesNotMatch(main,/w\*\.7,h\*\.4|#338e9c|\bneb\b/);
  assert.match(main,/b\.fillStyle='#000104'/);
});
