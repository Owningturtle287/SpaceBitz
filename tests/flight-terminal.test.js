import test from 'node:test';
import assert from 'node:assert/strict';
import {addTerminalEntry,TERMINAL_HISTORY_LIMIT} from '../terminal-history.js';
import {flightStage,isLandscape} from '../flight-drive.js';
import {rotationText,terminalLines} from '../terminal.js';
import {makeSystem} from '../model.js';
import {normalizeSettings,DEFAULT_SETTINGS} from '../settings.js';

test('terminal history rejects blank submissions, retains plain text and bounds repeated messages',()=>{
  const history=[];assert.equal(addTerminalEntry(history,'   ','input'),null);
  const entry=addTerminalEntry(history,' <img src=x onerror=alert(1)> ','input');
  assert.deepEqual(entry,{text:'<img src=x onerror=alert(1)>',kind:'input'});
  for(let i=0;i<100;i++)addTerminalEntry(history,'Action '+i);
  assert.equal(history.length,TERMINAL_HISTORY_LIMIT);assert.equal(history.at(-1).text,'Action 99');
  assert.equal(history[0].text,'Action 20');assert.equal(addTerminalEntry(history,'x'.repeat(600)).text.length,512);
});
test('flight detents show the active automatic drive and Deep Space always uses Warp',()=>{
  assert.equal(flightStage('system','orbit'),0);assert.equal(flightStage('system','hyper'),1);
  assert.equal(flightStage('system','hyper',{drive:'orbit'}),0);
  assert.equal(flightStage('system','orbit',{drive:'hyper'}),1);
  assert.equal(flightStage('chart','orbit',{drive:'orbit'}),2);
  assert.equal(isLandscape(844,390),true);assert.equal(isLandscape(390,844),false);
});
test('legacy speed preferences migrate and the retired orientation preference is discarded',()=>{
  assert.equal(normalizeSettings({flightMode:'cruise',orientation:'portrait'}).flightMode,'hyper');
  assert.equal(normalizeSettings({flightMode:'maneuver'}).flightMode,'orbit');
  assert.equal('orientation' in normalizeSettings({orientation:'portrait'}),false);
  assert.equal('orientation' in DEFAULT_SETTINGS,false);
});
test('rotation units retain compact-star precision and carry at hour/day boundaries',()=>{
  assert.equal(rotationText(1),'1 Earth days / 0 hours / 0 minutes');
  assert.equal(rotationText(1.5),'1 Earth days / 12 hours / 0 minutes');
  assert.equal(rotationText((59.9999999)/1440),'0 Earth days / 1 hours / 0 minutes');
  assert.equal(rotationText((1439.9999999)/1440),'1 Earth days / 0 hours / 0 minutes');
  assert.match(rotationText(-.1),/0 Earth days \/ 2 hours \/ 24 minutes/);
  assert.equal(rotationText(.01/86400),'0.00016667 Earth minutes');
  assert.equal(rotationText(NaN),'Unknown');
});
test('every celestial record names its object and exposes diameter without body radius',()=>{
  const system=makeSystem('sol'),earth=system.planets.find(b=>b.name==='Earth');
  for(const object of [system.star,...system.planets,...system.planets.flatMap(b=>b.moons||[])]){
    const text=terminalLines(object,system);
    assert.ok(text.startsWith('Object Data: '+object.name+'\n'));assert.ok(text.includes('DIAMETER : '));
    assert.ok(!/RADIUS : /.test(text));assert.match(text,/ROTATION PERIOD : .*Earth (days|minutes)/);
  }
  assert.ok(terminalLines(earth,system).includes('ORBIT PERIOD : 365.256 Earth days'));
});
