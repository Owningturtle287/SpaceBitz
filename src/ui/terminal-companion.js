import {viewport,gameRect} from '../core/viewport.js';
import {cameraAreas} from './camera-layout.js';
import {createCompanionBrain,companionPlacement,companionMotion} from './companion-state.js';
export {reactionForMessage} from './companion-state.js';

// Measured alpha bounds of the simplified, front-facing 1254px atlas.
const regions={head:[38,92,673,567],chest:[732,263,470,429],left:[265,757,222,438],right:[767,757,223,438]};
const palette=['06131e','173440','355a65','71949b','b6c5bb','f4f2dc','fff8e7','12525c','187c81','26b9b1','79eee0','d2fff0','886533','e2b455'].map(hex=>[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)));
export function createTerminalCompanion({state,settings,$}){
  const stage=$('terminalCompanion'),canvas=$('companionCanvas'),ctx=canvas.getContext('2d'),brain=createCompanionBrain(),parts={};
  const face=document.createElement('canvas');face.width=52;face.height=44;const faceContext=face.getContext('2d');
  let ready=false,lastPaint=-Infinity,lastPlace=-Infinity,lastPose='',lastScene=state.scene,armLift=0,headTurn=0;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const image=new Image();image.src=new URL('../../assets/terminal-companion.png',import.meta.url).href;
  image.onload=()=>{
    for(const [name,[x,y,w,h]]of Object.entries(regions)){
      const part=document.createElement('canvas');part.width=name==='head'?52:name==='chest'?26:10;part.height=Math.round(part.width*h/w);
      const c=part.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(image,x,y,w,h,0,0,part.width,part.height);
      // Flatten the generated artwork to a small console palette once, on load.
      const pixels=c.getImageData(0,0,part.width,part.height),data=pixels.data;
      for(let i=0;i<data.length;i+=4){
        if(data[i+3]<128){data[i+3]=0;continue;}
        let best=palette[0],distance=Infinity;
        for(const color of palette){const d=color.reduce((sum,v,j)=>sum+(v-data[i+j])**2,0);if(d<distance){best=color;distance=d;}}
        data.set(best,i);data[i+3]=255;
      }
      c.putImageData(pixels,0,0);parts[name]=part;
    }
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
    ctx.clearRect(0,0,64,72);ctx.imageSmoothingEnabled=false;
    const still=settings.reducedMotion||reducedMotion.matches,{bob,turn,lift}=companionMotion(pose,now,still),t=still?0:now/1000;
    // Ease arm raises and occasional head turns without ever smoothing pixels.
    const ease=still?1:1-Math.exp(-Math.max(0,Math.min(100,now-lastPaint))/120);
    armLift+=(lift-armLift)*ease;headTurn+=(turn-headTurn)*ease;
    const raised=Math.round(armLift),yaw=Math.round(headTurn),headY=bob+(pose==='sleep'?-10:0);
    ctx.drawImage(parts.chest,19,40+bob);
    const arms=()=>{ctx.drawImage(parts.left,8-Math.round(raised/4),43+bob-raised);ctx.drawImage(parts.right,46+Math.round(raised/4),43+bob-raised);};
    if(!raised)arms();
    // This mild yaw is reserved for scanning/travel/glances; the default is a
    // symmetric front view. Draw the visor in the same head coordinate space.
    const f=faceContext;f.clearRect(0,0,52,44);f.drawImage(parts.head,0,0);
    const cyan=pose==='concern'?'#e2b455':'#79eee0',eyeY=27;f.fillStyle=cyan;
    if(pose==='sleep'||pose==='blink'){
      for(const x of [17,32]){f.fillRect(x,eyeY,6,1);if(pose==='sleep')f.fillRect(x+1,eyeY+1,4,1);}
    }else if(['celebrate','complete','greet'].includes(pose)){
      for(const x of [17,32]){f.fillRect(x,eyeY+1,2,2);f.fillRect(x+2,eyeY,2,1);f.fillRect(x+4,eyeY+1,2,2);}
    }else{
      const h=pose==='warp'||pose==='wake'?7:pose==='concern'?3:5;
      for(const x of [17,32]){f.fillRect(x+yaw,eyeY,6,h);f.fillRect(x+yaw+1,eyeY-1,4,1);}
    }
    if(pose!=='sleep'&&pose!=='blink'){
      if(pose==='warp'){f.fillRect(25,34,4,3);f.fillStyle='#06131e';f.fillRect(26,35,2,1);}
      else if(pose==='concern'){f.fillRect(23,35,2,1);f.fillRect(25,34,4,1);f.fillRect(29,35,2,1);}
      else if(pose==='input'||pose==='scan'){f.fillRect(23,34,8,1+Math.round((Math.sin(t*10)+1)/2));}
      else{f.fillRect(23,33,2,1);f.fillRect(25,34,4,1);f.fillRect(29,33,2,1);}
    }
    ctx.drawImage(face,6+yaw,headY,52-Math.abs(yaw),44);
    if(raised)arms();
    if(pose==='sleep'&&!still&&now%7500>5000){ctx.fillStyle='#71949b';ctx.fillRect(58,5,4,1);ctx.fillRect(60,6,1,1);ctx.fillRect(59,7,1,1);ctx.fillRect(58,8,4,1);}
    if(pose==='travel'||pose==='warp'){ctx.fillStyle='#79eee0';ctx.fillRect(23,49,18,1);if(!still)ctx.fillRect(29,50,6,now%160<80?2:1);}
    if(pose==='clear'){ctx.fillStyle='#79eee0';ctx.fillRect(18,Math.round(44+Math.sin(t*4)*3),28,1);}
    if(pose==='celebrate'&&!still){ctx.fillStyle='#e2b455';for(let i=0;i<3;i++)ctx.fillRect(2+i*29,8+Math.round((t*6+i*9)%26),1,1);}
  }
  function update(now){
    const blocked=document.hidden||!state.save||state.scene==='menu'||state.journalOpen||$('modal').classList.contains('visible')||$('systemChart').classList.contains('open')||$('targetCard').hidden;
    const pose=brain.update(state,now);stage.hidden=blocked||!ready||pose==='hidden';
    if(stage.hidden){lastPose='';return;}
    if(state.scene!==lastScene){brain.react('greet',now);lastScene=state.scene;}
    stage.dataset.pose=state.terminalExpanded?'awake':'sleep';stage.dataset.emote=pose;
    if(now-lastPlace>=100||pose!==lastPose){place();lastPlace=now;}
    if(now-lastPaint>=50||pose!==lastPose){draw(pose,now);lastPaint=now;lastPose=pose;}
  }
  return {update,react:(kind)=>{const now=performance.now();brain.react(kind,now);update(now);},place};
}
