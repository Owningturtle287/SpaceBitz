import test from 'node:test';
import assert from 'node:assert/strict';
import {enableTouchButtons} from '../touch-buttons.js';

// Model Safari's trusted compatibility events separately from the script click
// used to activate a released touch. They can arrive at a different control.
function fixture(){
  const listeners=new Map(),frames=[];
  let time=0,hit=null;
  const root={
    defaultView:{performance:{now:()=>time},requestAnimationFrame:fn=>frames.push(fn),addEventListener:()=>{}},
    addEventListener(type,fn,options){const list=listeners.get(type)||[];list.push({fn,capture:options?.capture});listeners.set(type,list);},
    elementFromPoint:()=>hit
  };
  function send(type,target,fields={}){
    const e={target,button:0,pointerType:'touch',pointerId:1,clientX:10,clientY:10,isTrusted:true,prevented:false,stopped:false,
      preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...fields};
    for(const {fn}of [...(listeners.get(type)||[])].sort((a,b)=>Number(Boolean(b.capture))-Number(Boolean(a.capture)))){fn(e);if(e.stopped)break;}
    return e;
  }
  function button(action=()=>{}){
    const b={isConnected:true,disabled:false,excluded:false,hidden:false,activations:0,
      closest:selector=>selector==='button'?b:b.hidden?b:null,
      matches:()=>b.excluded,focus:()=>{},
      click(){const e=send('click',b,{isTrusted:false});if(!e.prevented){b.activations++;action();}}
    };
    return b;
  }
  const touch=(button,fields={})=>{hit=button;send('pointerdown',button,fields);send('pointerup',button,fields);};
  enableTouchButtons(root);
  return {send,button,touch,range:{closest:()=>null},paint:()=>frames.splice(0).forEach(fn=>fn()),advance:ms=>{time+=ms;}};
}

test('one touch cannot activate the old button and a newly exposed speed slider',()=>{
  const f=fixture(),enter=f.button(()=>f.advance(2000));
  f.touch(enter);assert.equal(enter.activations,1);
  for(const type of ['mousedown','mouseup','click']){
    const event=f.send(type,f.range,{detail:0});
    assert.equal(event.prevented,true,type+' was retargeted after cold system entry');
    assert.equal(event.stopped,true);
  }
  assert.equal(f.send('click',enter).prevented,true);
  f.paint();f.advance(999);
  assert.equal(f.send('mousedown',f.range).prevented,true);
  f.advance(2);assert.equal(f.send('click',enter).prevented,false,'Standalone native/accessibility clicks remain available');
});

test('a fresh pointer action immediately allows another button or speed change',()=>{
  const f=fixture(),enter=f.button(),follow=f.button();
  f.touch(enter);f.touch(follow);assert.equal(follow.activations,1);
  f.send('pointerdown',f.range,{pointerType:'mouse'});
  f.paint(); // Earlier paint callbacks cannot re-arm consumption of an old tap.
  for(const type of ['mousedown','mouseup','click'])assert.equal(f.send(type,f.range).prevented,false);
});

test('keyboard activation immediately after touch is allowed',()=>{
  const f=fixture(),button=f.button();f.touch(button);
  f.send('keydown',button,{key:'Enter'});f.paint();
  assert.equal(f.send('click',button,{detail:0}).prevented,false);
});

test('cancelled and dragged button touches do not leak a compatibility activation',()=>{
  const f=fixture(),button=f.button();
  f.send('pointerdown',button);f.send('pointermove',button,{clientX:30});f.send('pointerup',button);
  assert.equal(button.activations,0);assert.equal(f.send('click',button).prevented,true);
  f.send('pointerdown',button);f.send('pointercancel',button);f.send('pointerup',button);
  assert.equal(button.activations,0);assert.equal(f.send('click',f.range).prevented,true);
});

test('disabled, hidden and dedicated gesture controls retain their own behavior',()=>{
  const f=fixture();
  for(const flag of ['disabled','hidden','excluded']){
    const button=f.button();button[flag]=true;f.touch(button);
    assert.equal(button.activations,0);assert.equal(f.send('click',button).prevented,false);
  }
});
