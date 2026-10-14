// Frame timing and shoulder poses are independent of rendering and game logic.
export const COMPANION={width:84,height:60,headWidth:52,headHeight:44,headX:16,headY:3,sleepRows:32,awakeRows:52,scale:132/64,shoulderY:34,leftShoulder:16,rightShoulder:68};
export const ARM_ANGLES=Array.from({length:29},(_,i)=>(i-14)*10);
const gestures={
  wake:{duration:1100,left:[0,0,10,20,10,0],right:[0,0,-10,-20,-10,0]},
  greet:{duration:1900,left:[0,10,10,10,0],right:[0,-20,-50,-90,-110,-80,-110,-80,-50,-20,0]},
  complete:{duration:2200,left:[0,20,40,60,60,40,20,0],right:[0]},
  celebrate:{duration:2600,left:[0,20,50,80,110,110,90,110,90,70,40,10,0],right:[0,-20,-50,-80,-110,-110,-90,-110,-90,-70,-40,-10,0]},
  stretch:{duration:1000,left:[0,30,60,100,120,120,90,50,10,0],right:[0,-30,-60,-100,-120,-120,-90,-50,-10,0]},
  clear:{duration:1300,left:[0,20,50,60,40,20,0],right:[0]}
};
function sequence(values,age,duration){
  const position=Math.min(values.length-1,Math.max(0,age)/duration*(values.length-1)),i=Math.floor(position);
  return values[i]+((values[i+1]??values[i])-values[i])*(position-i);
}
export function armFrameIndex(angle){return Math.max(0,Math.min(ARM_ANGLES.length-1,Math.round(angle/10)+14));}
export function approachShoulder(current,target,elapsed){return current+Math.sign(target-current)*Math.min(Math.abs(target-current),Math.max(0,Math.min(100,elapsed))*.24);}
export function companionAnimation(pose,age,now,reduced=false){
  const t=reduced?0:now/1000,phase=reduced?0:Math.floor(age/120),sleepPhase=reduced?0:Math.floor(now/800)%8;
  let head='front',expression='open',left=0,right=0;
  if(pose==='sleep'){head=[0,1,2,7].includes(sleepPhase)?'sleepOut':'sleepIn';expression='sleep';}
  else if(pose==='blink')expression='blink';
  else if(['celebrate','complete','greet'].includes(pose))expression=phase%2?'happy':'smile';
  else if(pose==='wake'){head='alert';expression=reduced?'open':age<200?'sleep':age<400?'half':age<700?'open':'wide';}
  else if(pose==='concern'){expression='concern';left=-10;right=10;}
  else if(pose==='warp'){head='alert';expression='surprise';left=40;right=-40;}
  else if(pose==='input')expression=phase%2?'talk':'open';
  else if(pose==='scan'){head=reduced?'front':Math.floor(age/900)%2?'right':'left';expression=phase%2?'talk':'open';left=20;}
  else if(pose==='travel'){head=reduced?'front':Math.floor(age/1800)%3===1?'left':'front';left=20;right=-20;}
  else if(pose==='glance')head=reduced?'front':age<650?'left':age<1200?'right':'front';
  const gesture=gestures[pose];
  if(gesture&&!reduced){left=sequence(gesture.left,age,gesture.duration);right=sequence(gesture.right,age,gesture.duration);}
  if(reduced){left=0;right=0;}
  return {head,expression,bob:reduced?0:Math.round(Math.sin(t*(pose==='sleep'?1.2:2))),left,right,arms:pose!=='sleep'};
}
// Both the mount and the tip use this one rigid shoulder rotation. There is no
// elbow, wrist, hand translation or independent forearm movement.
export function shoulderTip(x,y,angle){const r=angle*Math.PI/180;return {x:x-Math.sin(r)*14,y:y+Math.cos(r)*14};}
