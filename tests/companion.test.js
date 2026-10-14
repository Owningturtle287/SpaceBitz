import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompanionBrain,reactionForMessage,companionPlacement,companionMotion} from '../src/ui/companion-state.js';
const state=()=>({save:{},scene:'system',selected:{id:'earth'},terminalExpanded:false});
test('docked companion stays asleep through action events and wakes only with terminal',()=>{
  const brain=createCompanionBrain(),s=state();brain.react('concern',0);assert.equal(brain.update(s,20),'sleep');
  s.terminalExpanded=true;assert.equal(brain.update(s,30),'wake');s.terminalExpanded=false;assert.equal(brain.update(s,40),'sleep');s.selected=null;assert.equal(brain.update(s,50),'hidden');
});
test('action reactions expire, warnings outrank chatter, travel and scanning follow real state',()=>{
  const brain=createCompanionBrain(),s={...state(),terminalExpanded:true};brain.update(s,0);
  brain.react('concern',100);brain.react('input',200);assert.equal(brain.update(s,300),'concern');
  s.autopilot={};assert.equal(brain.update(s,4000),'travel');s.autopilot=null;assert.equal(brain.update(s,4100),'celebrate');
  s.terminal={finished:false};assert.equal(brain.update(s,8000),'scan');brain.react('input',8050);s.warpUntil=9000;assert.equal(brain.update(s,8100),'warp');
  brain.react('concern',8150);assert.equal(brain.update(s,8200),'concern');
  assert.equal(reactionForMessage('Sample secured · added to logbook'),'celebrate');assert.equal(reactionForMessage('Storage is full'),'concern');
});
test('companion sits above terminal and clear of right camera in compact and open layouts',()=>{
  const camera={x:791,y:108,width:53,height:174},view={width:844,height:390};
  for(const open of [false,true]){
    const card={x:641,y:open?115:300,width:200,height:open?272:87},p=companionPlacement(card,card,view,[camera],[],open);
    assert.ok(p.x>=6&&p.x+p.width<=838&&p.y-p.height>=6);assert.ok(p.x+p.width<=camera.x||p.y<=camera.y||p.y-p.height>=camera.y+camera.height);assert.equal(p.y,card.y);
  }
  const tiny={x:400,y:42,width:200};const p=companionPlacement(tiny,tiny,{width:667,height:375},[],[],true);assert.equal(p.height,36);assert.equal(p.y-p.height,6);
});

test('default poses face forward, selective turns and arm raises stop with reduced motion',()=>{
  for(const pose of ['idle','sleep','input','wake','greet','celebrate','complete','concern','clear','stretch','warp']){
    for(const now of [250,1000,1400,4200])assert.equal(companionMotion(pose,now).turn,0,pose);
  }
  for(const pose of ['glance','scan','travel'])assert.ok([250,500,1000,1400].some(now=>companionMotion(pose,now).turn!==0),pose);
  assert.equal(companionMotion('idle',1000).lift,0);assert.ok(companionMotion('celebrate',1000).lift>=18);
  assert.deepEqual(companionMotion('celebrate',1000,true),{bob:0,turn:0,lift:0});
});
