import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompanionBrain,reactionForMessage,companionPlacement} from '../src/ui/companion-state.js';
import {COMPANION,ARM_ANGLES,companionAnimation,shoulderTip,approachShoulder} from '../src/ui/companion-animation.js';
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

test('head scale is invariant when opening, closing or resizing the terminal',()=>{
  for(const height of [320,360,390,852]){
    const view={width:844,height},closed={x:600,y:height-68,width:240},open={x:530,y:Math.round(height*.3),width:310};
    const a=companionPlacement(closed,closed,view,[],[],false),b=companionPlacement(open,open,view,[],[],true);
    assert.equal(a.width,b.width);assert.ok(b.height>a.height);
  }
});
test('real sleeping head frames and purposeful gestures keep default expressions facing the player',()=>{
  const sleepHeads=new Set([0,800,1600,2400,3200,4000,4800,5600].map(now=>companionAnimation('sleep',now,now).head));
  assert.deepEqual(sleepHeads,new Set(['sleepOut','sleepIn']));
  for(const pose of ['idle','sleep','input','wake','greet','celebrate','complete','concern','clear','stretch','warp']){
    for(const age of [250,500,1000,1400])assert.ok(!['left','right'].includes(companionAnimation(pose,age,age).head),pose);
  }
  assert.equal(companionAnimation('glance',300,300).head,'left');assert.equal(companionAnimation('glance',900,900).head,'right');
  const wave=companionAnimation('greet',800,800);assert.ok(wave.right<-80&&wave.left<=10);
  const present=companionAnimation('complete',900,900);assert.ok(present.left>40&&present.right===0);
  const joy=companionAnimation('celebrate',1000,1000);assert.ok(joy.left>90&&joy.right===-joy.left);
  assert.equal(companionAnimation('sleep',0,0).expression,'sleep');assert.equal(companionAnimation('sleep',0,0).arms,false);
  const still=companionAnimation('celebrate',1000,1000,true);assert.equal(still.bob,0);assert.equal(still.left,0);assert.equal(still.right,0);
});
test('every arm frame follows a rigid shoulder arc within the canvas and settles without jumps',()=>{
  for(const x of [COMPANION.leftShoulder,COMPANION.rightShoulder])for(const angle of ARM_ANGLES){
    const y=COMPANION.headY+COMPANION.shoulderY,p=shoulderTip(x,y,angle);
    assert.ok(Math.abs(Math.hypot(p.x-x,p.y-y)-14)<1e-9);assert.ok(p.x>=0&&p.x<COMPANION.width&&p.y>=0&&p.y<COMPANION.height);
  }
  assert.equal(approachShoulder(110,0,50),98);assert.equal(approachShoulder(5,0,50),0);
  assert.equal(approachShoulder(0,110,-50),0);
});
