import {viewport,gameRect} from '../core/viewport.js';
import {cameraAreas} from './camera-layout.js';
import {createCompanionBrain,companionPlacement} from './companion-state.js';
export {reactionForMessage} from './companion-state.js';

// Measured alpha bounds of the generated atlas, in its native 1254px square.
const regions={head:[57,65,637,571],chest:[729,229,462,434],left:[256,722,233,490],right:[793,722,232,490]};
export function createTerminalCompanion({state,settings,$}){
  const stage=$('terminalCompanion'),canvas=$('companionCanvas'),ctx=canvas.getContext('2d'),brain=createCompanionBrain(),parts={};
  let ready=false,lastPaint=-Infinity,lastPlace=-Infinity,lastPose='',lastScene=state.scene;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const image=new Image();image.src=new URL('../../assets/terminal-companion.png',import.meta.url).href;
  image.onload=()=>{
    for(const [name,[x,y,w,h]]of Object.entries(regions)){
      const part=document.createElement('canvas');part.width=name==='head'?96:name==='chest'?50:20;part.height=Math.round(part.width*h/w);
      const c=part.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(image,x,y,w,h,0,0,part.width,part.height);parts[name]=part;
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
    ctx.clearRect(0,0,120,132);ctx.imageSmoothingEnabled=false;
    const still=settings.reducedMotion||reducedMotion.matches;
    const t=still?0:now/1000,bob=still?0:Math.round(Math.sin(t*(pose==='sleep'?1.6:2.2)));
    const wave=['wake','greet','celebrate','complete','stretch'].includes(pose),speed=pose==='celebrate'?9:4;
    // Integer offsets keep the small pixel sprite crisp. Body and hands reveal
    // beneath the head as the terminal rises; the closed stage clips them out.
    ctx.drawImage(parts.chest,35,79+bob);
    const arm=(name,x,angle)=>{ctx.save();ctx.translate(x,86+bob);ctx.rotate(angle);ctx.drawImage(parts[name],-10,0);ctx.restore();};
    arm('left',30,wave?(still?-.2:-.3+Math.sin(t*speed)*.25):0);
    arm('right',90,wave?(still?.2:.3-Math.sin(t*speed)*.25):0);
    const headY=bob+(pose==='input'?Math.round(Math.sin(t*5)):0);
    ctx.drawImage(parts.head,12,headY);
    // Visor occupies x37..89, y48..70 on the downsampled head.
    const cyan=pose==='concern'?'#ffd27b':'#8efff4',dark='#031321';
    const eyeY=pose==='sleep'?45:52+headY,shift=pose==='glance'?Math.round(Math.sin(t*2)*3):pose==='scan'?Math.round(Math.sin(t*4)*2):0;
    ctx.fillStyle=cyan;
    if(pose==='sleep'||pose==='blink'){
      for(const x of [44,70]){ctx.fillRect(x,eyeY,12,2);if(pose==='sleep')ctx.fillRect(x+2,eyeY+2,8,1);}
    }else if(['celebrate','complete','greet'].includes(pose)){
      for(const x of [44,70]){ctx.fillRect(x,eyeY+3,3,3);ctx.fillRect(x+3,eyeY,6,3);ctx.fillRect(x+9,eyeY+3,3,3);}
    }else{
      const wide=pose==='warp'||pose==='wake',h=wide?13:pose==='concern'?5:10;
      for(const x of [46,72]){ctx.fillRect(x+shift,eyeY,8,h);ctx.fillRect(x+shift+2,eyeY-2,4,h+4);ctx.fillStyle='#e6fffb';ctx.fillRect(x+shift+2,eyeY,2,3);ctx.fillStyle=cyan;}
    }
    if(pose!=='sleep'&&pose!=='blink'){
      const mouthY=70+headY;ctx.fillStyle=cyan;
      if(pose==='warp'){ctx.fillRect(60,mouthY-3,7,6);ctx.fillStyle=dark;ctx.fillRect(62,mouthY-1,3,2);}
      else if(pose==='concern'){ctx.fillRect(56,mouthY,4,2);ctx.fillRect(60,mouthY-2,8,2);ctx.fillRect(68,mouthY,4,2);}
      else if(pose==='input'||pose==='scan'){ctx.fillRect(56,mouthY,14,2+Math.round((Math.sin(t*10)+1)*1.5));}
      else{ctx.fillRect(57,mouthY-2,3,2);ctx.fillRect(60,mouthY,8,2);ctx.fillRect(68,mouthY-2,3,2);}
    }
    if(pose==='sleep'&&!still&&now%7500>5000){ctx.fillStyle='#68c2c2';ctx.fillRect(101,13,6,1);ctx.fillRect(105,14,2,1);ctx.fillRect(103,15,2,1);ctx.fillRect(101,16,6,1);}
    if(pose==='travel'||pose==='warp'){ctx.fillStyle='#77fff0';ctx.fillRect(52,126,16,2);if(!still)ctx.fillRect(56,128,8,now%160<80?3:1);}
    if(pose==='clear'){ctx.fillStyle='#8efff4';ctx.fillRect(33,Math.round(94+Math.sin(t*4)*13),54,2);}
    if(pose==='celebrate'&&!still){ctx.fillStyle='#ffd27b';for(let i=0;i<3;i++)ctx.fillRect(8+i*49,20+Math.round((t*12+i*18)%45),2,2);}
  }
  function update(now){
    const blocked=document.hidden||!state.save||state.scene==='menu'||state.journalOpen||$('modal').classList.contains('visible')||$('systemChart').classList.contains('open')||$('targetCard').hidden;
    const pose=brain.update(state,now);stage.hidden=blocked||!ready||pose==='hidden';
    if(stage.hidden){lastPose='';return;}
    if(state.scene!==lastScene){brain.react('greet',now);lastScene=state.scene;}
    stage.dataset.pose=state.terminalExpanded?'awake':'sleep';stage.dataset.emote=pose;
    if(now-lastPlace>=100||pose!==lastPose){place();lastPlace=now;}if(now-lastPaint>=50||pose!==lastPose){draw(pose,now);lastPaint=now;lastPose=pose;}
  }
  return {update,react:(kind)=>{const now=performance.now();brain.react(kind,now);update(now);},place};
}
