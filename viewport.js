// All rendering, layout and pointer input share one landscape coordinate space.
// Browser orientation locks are optional; rotation never changes the game layout.
export const viewport={width:0,height:0,physicalWidth:0,physicalHeight:0,left:0,top:0,rotated:false};
export function landscapeSize(width,height){return {width:Math.max(width,height),height:Math.min(width,height),rotated:height>width};}
export function gamePoint(event,view=viewport){
  const x=event.clientX-view.left,y=event.clientY-view.top;
  return view.rotated?{x:y,y:view.physicalWidth-x}:{x,y};
}
export function gameRect(element){
  const r=element.getBoundingClientRect(),a=gamePoint({clientX:r.left,clientY:r.top}),b=gamePoint({clientX:r.right,clientY:r.bottom});
  const left=Math.min(a.x,b.x),top=Math.min(a.y,b.y),right=Math.max(a.x,b.x),bottom=Math.max(a.y,b.y);
  return {x:left,y:top,left,top,right,bottom,width:right-left,height:bottom-top};
}
export function refreshViewport(){
  const visual=globalThis.visualViewport,unscaled=!visual||Math.abs(visual.scale-1)<.01;
  const physicalWidth=Math.round(Math.min(innerWidth,unscaled&&visual?visual.width:innerWidth));
  const physicalHeight=Math.round(Math.min(innerHeight,unscaled&&visual?visual.height:innerHeight));
  if(physicalWidth<1||physicalHeight<1)return false;
  const next={...landscapeSize(physicalWidth,physicalHeight),physicalWidth,physicalHeight,left:unscaled&&visual?visual.offsetLeft:0,top:unscaled&&visual?visual.offsetTop:0};
  const changed=Object.keys(next).some(key=>next[key]!==viewport[key]);
  if(!changed)return false;Object.assign(viewport,next);
  const root=document.getElementById('gameViewport'),style=document.documentElement.style;
  root.dataset.rotated=String(viewport.rotated);root.style.left=viewport.left+'px';root.style.top=viewport.top+'px';
  style.setProperty('--view-width',viewport.width+'px');style.setProperty('--view-height',viewport.height+'px');style.setProperty('--view-min',viewport.height+'px');
  root.style.transform=viewport.rotated?`translateX(${physicalWidth}px) rotate(90deg)`:'translate(0,0)';
  const sides=viewport.rotated?{left:'top',right:'bottom',top:'right',bottom:'left'}:{left:'left',right:'right',top:'top',bottom:'bottom'};
  for(const [side,deviceSide]of Object.entries(sides))style.setProperty('--safe-'+side,`env(safe-area-inset-${deviceSide},0px)`);
  return true;
}
export function watchViewport(onChange){
  let frame=0;
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(refreshViewport())onChange();});};
  window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule,{passive:true});
  globalThis.screen?.orientation?.addEventListener?.('change',schedule);
  globalThis.visualViewport?.addEventListener('resize',schedule);globalThis.visualViewport?.addEventListener('scroll',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshViewport();onChange();}});
  new ResizeObserver(schedule).observe(document.documentElement);
  refreshViewport();return schedule;
}
