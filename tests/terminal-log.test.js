import test from 'node:test';
import assert from 'node:assert/strict';
import {recordAction,recordObject} from '../voyage-log.js';
import {addTerminalEntry,TERMINAL_HISTORY_LIMIT} from '../terminal-history.js';
import {normalizeSettings} from '../settings.js';
import {interfaceFonts} from '../interface-fonts.js';
import {importVoyage} from '../saves.js';

test('screen records, status and input retain generation order within one bounded stream',()=>{
  const screen=[];
  addTerminalEntry(screen,'Object Data: Earth\nDIAMETER : 12,742 km','record');
  addTerminalEntry(screen,'Orbit achieved');addTerminalEntry(screen,'pilot note','input');
  addTerminalEntry(screen,'Object Data: Moon','record');
  assert.deepEqual(screen.map(e=>e.kind),['record','message','input','record']);
  for(let i=0;i<100;i++)addTerminalEntry(screen,'Event '+i);
  assert.equal(screen.length,TERMINAL_HISTORY_LIMIT);
});
test('clearing the screen retains surveys and action history; re-survey replaces only that object',()=>{
  const save={days:1,log:[{name:'Home',action:'Voyage started',days:0}]},screen=[];
  recordObject(save,{key:'sol:Earth',name:'Earth',type:'Planet',text:'DIAMETER : 12,742 km'});
  recordAction(save,'Launch complete');save.days=2;
  recordObject(save,{key:'sol:Earth',name:'Earth',type:'Planet',text:'COORDINATES : X 50 LS'});
  recordObject(save,{key:'sol:Moon',name:'Moon',type:'Moon',text:'DIAMETER : 3,474.8 km'});
  addTerminalEntry(screen,'Launch complete');screen.length=0;
  assert.equal(save.log.length,4);assert.equal(save.log.filter(e=>e.objectKey==='sol:Earth').length,1);
  assert.equal(save.log.find(e=>e.objectKey==='sol:Earth').data,'COORDINATES : X 50 LS');
  assert.equal(save.log.find(e=>e.kind==='action').action,'Launch complete');
});
test('survey snapshots survive voyage export/import as plain text without changing prior discoveries',()=>{
  const raw={id:'v',name:'Survey',seed:'survey',homeSeed:'sol',currentSystem:'sol',scene:'system',layoutVersion:4,days:2,ship:{x:1,y:2},chart:{x:0,y:0},surface:{x:0,y:0},discoveries:['sol:Earth'],log:[]};
  recordObject(raw,{key:'sol:Earth',name:'Earth',type:'Planet',text:'Object Data: Earth\n<b>literal</b>\nDIAMETER : 12,742 km'});recordAction(raw,'Course reached');
  const copy=importVoyage(JSON.parse(JSON.stringify(raw)),'copy');
  assert.deepEqual(copy.log,raw.log);assert.deepEqual(copy.discoveries,raw.discoveries);
});
test('master text sizes preserve per-style choices and terminal/log settings stay independent',()=>{
  const settings=normalizeSettings({terminalDataFont:12,terminalHeaderFont:14,terminalFontMode:'master',terminalFontSize:15,logDataFont:8});
  assert.deepEqual(Object.values(interfaceFonts(settings)),[15,15,15,15,15]);
  assert.equal(interfaceFonts(settings,'log').data,8);
  settings.terminalFontMode='individual';assert.equal(interfaceFonts(settings).data,12);assert.equal(interfaceFonts(settings).header,14);
  const invalid=normalizeSettings({terminalDataFont:99,logFontSize:NaN,logWidthScale:-20,terminalFontMode:'bad'});
  assert.equal(invalid.terminalDataFont,18);assert.equal(invalid.logFontSize,11);assert.equal(invalid.logWidthScale,50);assert.equal(invalid.terminalFontMode,'individual');
});
