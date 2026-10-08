import test from 'node:test';
import assert from 'node:assert/strict';
import {recordAction,recordObject,recordEvent,logCategory,restoreLogEntry,LOG_FILTERS} from '../voyage-log.js';
import {logObjectReference,normalizeLogVisual} from '../log-objects.js';
import {addTerminalEntry,TERMINAL_HISTORY_LIMIT} from '../terminal-history.js';
import {normalizeSettings} from '../settings.js';
import {interfaceFonts} from '../interface-fonts.js';
import {importVoyage} from '../saves.js';

test('log filters retain survey categories across saves and recognize legacy records',()=>{
  assert.deepEqual(LOG_FILTERS.map(([key])=>key),['all','star','planet','moon','item','status']);
  for(const [type,category] of [['Yellow dwarf','star'],['Planet / gas','planet'],['Dwarf planet / rock','planet'],['Moon / rock','moon'],['Surface sample','item']]){
    const legacy={kind:'object',name:'Object',objectKey:'object',type,data:'Object Data',days:1};
    assert.equal(logCategory(legacy),category);assert.equal(restoreLogEntry(legacy,1).category,category);
  }
  assert.equal(logCategory({action:'Sample collected'}),'item');assert.equal(logCategory({kind:'action',action:'Course reached'}),'status');
  const save={days:1,log:[]};recordObject(save,{key:'star',name:'Test',type:'Unknown',category:'star',text:'Object Data'});
  assert.equal(restoreLogEntry(save.log[0],1).category,'star');
});

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
test('object and item visual identities survive backups without retaining unvalidated fields',()=>{
  const save={days:1,log:[]},visual={system:'galaxy:g-2,4:0',id:'galaxy:g-2,4:0:star',kind:'star'};
  recordObject(save,{key:'star',name:'Test star',type:'Yellow dwarf',category:'star',text:'MASS : 1',visual});
  assert.deepEqual(restoreLogEntry(save.log[0],1).visual,visual);
  recordEvent(save,{name:'Moon',action:'First landing',category:'moon',visual:{system:'sol',id:'sol:Earth:Moon',kind:'moon'}});
  assert.equal(logCategory(save.log[0]),'status');assert.deepEqual(restoreLogEntry(save.log[0],1),save.log[0]);
  assert.equal(normalizeLogVisual({system:'sol',id:'moon',kind:'script'}),undefined);
  assert.deepEqual(normalizeLogVisual({...visual,url:'untrusted'}),visual);
});
test('older survey references recover complete seeds containing colons, and status entries stay unillustrated',()=>{
  const save={currentSystem:'sol',homeSeed:'sol'},seed='galaxy:g-2,4:0';
  assert.deepEqual(logObjectReference({objectKey:seed+':'+seed+':star'},save),{system:seed,id:seed+':star'});
  assert.deepEqual(logObjectReference({objectKey:'sol:sol:Earth'},save),{system:'sol',id:'sol:Earth'});
  assert.deepEqual(logObjectReference({objectKey:'sol:Earth'},save),{system:'sol',id:'sol:Earth'});
  assert.equal(logCategory({name:'Earth',action:'Home planet · voyage started'}),'status');
  assert.equal(logCategory({name:'Sol',action:'Entered system'}),'status');
  assert.equal(logCategory({kind:'action',action:'Warp Drive engaged'}),'status');
});
