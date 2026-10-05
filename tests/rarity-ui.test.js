import test from 'node:test';
import assert from 'node:assert/strict';
import {rarityPages} from '../rarity-ui.js';
test('rarity pages use available space and preserve wrapped entries without losing any rows',()=>{
  const heights=[30,30,45,30,60,30,30,30,45,30,30,30];
  for(const available of [80,180,400,1000]){
    const pages=rarityPages(heights,available,4);
    assert.deepEqual(pages.flatMap(([start,end])=>heights.slice(start,end)),heights);
    for(const [start,end]of pages)assert.ok(heights.slice(start,end).reduce((a,b)=>a+b,0)+(end-start-1)*4<=available||end-start===1);
  }
  assert.equal(rarityPages(heights,1000).length,1);
  assert.ok(rarityPages(heights,400).length<rarityPages(heights,180).length);
});
