import {viewport,gameRect} from '../core/viewport.js';
import {cameraAreas} from './camera-layout.js';
import {createCompanionBrain,companionPlacement} from './companion-state.js';
import {COMPANION as C,ARM_ANGLES,armFrameIndex,approachShoulder,companionAnimation} from './companion-animation.js';
export {reactionForMessage} from './companion-state.js';

// Native alpha bounds from the eight-component 1774 × 887 transparent atlas.
// Align the blank visors at row 25, rather than stretching the sleeping heads.
const regions={front:[28,127,416,337,52,2],sleepIn:[470,153,421,311,52,4],sleepOut:[912,170,417,300,52,5],alert:[1346,115,414,348,52,0],right:[79,524,365,314,46,4],left:[486,524,364,314,46,4],leftArm:[1072,569,143,266,10,0],rightArm:[1450,568,143,267,10,0]};
const palette=['06131e','173440','355a65','71949b','b6c5bb','f4f2dc','fff8e7','12525c','187c81','26b9b1','79eee0','d2fff0','886533','e2b455'].map(hex=>[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)));
function pixelCanvas(width,height){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').imageSmoothingEnabled=false;return canvas;}
function flatten(canvas){
  const ctx=canvas.getContext('2d'),pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
  for(let i=0;i<data.length;i+=4){
    if(data[i+3]<128){data[i+3]=0;continue;}
    let best=palette[0],distance=Infinity;
    for(const color of palette){const d=color.reduce((sum,v,j)=>sum+(v-data[i+j])**2,0);if(d<distance){best=color;distance=d;}}
    data.set(best,i);data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
}
function faceFrame(head,expression,direction){
  const frame=pixelCanvas(C.headWidth,C.headHeight),f=frame.getContext('2d');f.drawImage(head,0,0);
  const cyan=expression==='concern'?'#e2b455':'#79eee0',shift=direction==='left'?-5:direction==='right'?4:0,eyeY=27;
  f.fillStyle=cyan;
  if(expression==='sleep'||expression==='blink')for(const x of [17,32])f.fillRect(x+shift,eyeY,7,1);
  else if(expression==='happy'||expression==='smile')for(const x of [17,32]){f.fillRect(x+shift,eyeY+1,2,1);f.fillRect(x+shift+2,eyeY,3,1);f.fillRect(x+shift+5,eyeY+1,2,1);}
  else{const h=expression==='half'?2:expression==='concern'?3:['wide','surprise'].includes(expression)?7:5;for(const x of [17,32]){f.fillRect(x+shift,eyeY,6,h);if(h>3)f.fillRect(x+shift+1,eyeY-1,4,1);}}
  if(!['sleep','blink'].includes(expression)){
    if(expression==='surprise'){f.fillRect(25+shift,34,4,3);f.fillStyle='#06131e';f.fillRect(26+shift,35,2,1);}
    else if(expression==='concern'){f.fillRect(23+shift,35,2,1);f.fillRect(25+shift,34,4,1);f.fillRect(29+shift,35,2,1);}
    else if(expression==='talk')f.fillRect(23+shift,34,8,2);
    else{f.fillRect(23+shift,33,2,1);f.fillRect(25+shift,34,4,1);f.fillRect(29+shift,33,2,1);}
  }
  return frame;
}
function armFrames(arm){
  return ARM_ANGLES.map(angle=>{
    const frame=pixelCanvas(40,40),ctx=frame.getContext('2d');
    // Rasterize once about the circular socket at (5,4). Every runtime pose
    // selects a crisp sprite frame; it never rotates or translates a forearm.
    ctx.translate(20,20);ctx.rotate(angle*Math.PI/180);ctx.drawImage(arm,-5,-4);ctx.resetTransform();flatten(frame);return frame;
  });
}
export function createTerminalCompanion({state,settings,$}){
  const stage=$('terminalCompanion'),canvas=$('companionCanvas'),ctx=canvas.getContext('2d'),brain=createCompanionBrain(),parts={},faces={},arms={};
  let ready=false,lastPaint=-Infinity,lastPlace=-Infinity,lastPose='',lastScene=state.scene,poseStarted=0,leftAngle=0,rightAngle=0;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const image=new Image();image.src=new URL('../../assets/terminal-companion.png',import.meta.url).href;
  image.onload=()=>{
    for(const [name,[x,y,w,h,width,offsetY]]of Object.entries(regions)){
      const height=Math.round(width*h/w),isArm=name.endsWith('Arm'),part=pixelCanvas(isArm?width:C.headWidth,isArm?height:C.headHeight);
      part.getContext('2d').drawImage(image,x,y,w,h,isArm?0:Math.round((C.headWidth-width)/2),offsetY,width,height);flatten(part);parts[name]=part;
    }
    const expressions=['open','sleep','blink','half','wide','happy','smile','concern','surprise','talk'];
    for(const name of ['front','sleepIn','sleepOut','alert','left','right'])for(const expression of expressions)faces[name+'/'+expression]=faceFrame(parts[name],expression,name);
    arms.left=armFrames(parts.leftArm);arms.right=armFrames(parts.rightArm);
    ready=true;stage.dataset.ready='true';update(performance.now());
  };
  image.onerror=()=>{stage.hidden=true;};
  function place(){
    if(stage.hidden)return;
    const card=gameRect($('targetCard')),pocket=gameRect($('terminalPocket'));
    const obstacles=['systemChart','settingsOpen','systemFit','travelControls','navigationControls'].map($).filter(e=>e&&!e.hidden).map(gameRect);
    const p=companionPlacement(card,pocket,viewport,cameraAreas,obstacles,Boolean(state.terminalExpanded));
    for(const [key,value]of Object.entries({left:p.x,top:p.y,width:p.width,height:p.height})){const text=value+'px';if(stage.style[key]!==text)stage.style[key]=text;}
  }
  const observer=new ResizeObserver(place);for(const id of ['targetCard','terminalPocket','gameViewport'])observer.observe($(id));
  function draw(pose,now){
    ctx.clearRect(0,0,C.width,C.height);ctx.imageSmoothingEnabled=false;
    const still=settings.reducedMotion||reducedMotion.matches,frame=companionAnimation(pose,Math.max(0,now-poseStarted),now,still),elapsed=Number.isFinite(lastPaint)?now-lastPaint:50;
    leftAngle=still?0:approachShoulder(leftAngle,frame.left,elapsed);rightAngle=still?0:approachShoulder(rightAngle,frame.right,elapsed);
    const headY=C.headY+frame.bob;
    // Positive head padding reserves the entire outline through every breath.
    // Only the stage's lower edge occludes the sleeping face behind the device.
    ctx.drawImage(faces[frame.head+'/'+frame.expression],C.headX,headY);
    if(frame.arms){
      const shoulderY=headY+C.shoulderY;
      ctx.drawImage(arms.left[armFrameIndex(leftAngle)],C.leftShoulder-20,shoulderY-20);
      ctx.drawImage(arms.right[armFrameIndex(rightAngle)],C.rightShoulder-20,shoulderY-20);
    }
    stage.dataset.sprite=frame.head+'/'+frame.expression;stage.dataset.shoulders=[armFrameIndex(leftAngle),armFrameIndex(rightAngle)].join(',');
  }
  function update(now){
    const blocked=document.hidden||!state.save||state.scene==='menu'||state.journalOpen||$('modal').classList.contains('visible')||$('systemChart').classList.contains('open')||$('targetCard').hidden;
    const pose=brain.update(state,now);stage.hidden=blocked||!ready||pose==='hidden';
    if(stage.hidden){lastPose='';leftAngle=rightAngle=0;return;}
    if(state.scene!==lastScene){brain.react('greet',now);lastScene=state.scene;}
    stage.dataset.pose=state.terminalExpanded?'awake':'sleep';stage.dataset.emote=pose;
    if(pose!==lastPose)poseStarted=now;
    if(now-lastPlace>=50||pose!==lastPose){place();lastPlace=now;}
    if(now-lastPaint>=1000/30||pose!==lastPose){draw(pose,now);lastPaint=now;lastPose=pose;}
  }
  return {update,react:(kind)=>{const now=performance.now();if(brain.react(kind,now)&&kind===lastPose)poseStarted=now;update(now);},place};
}
