// All rendering, layout and pointer input share one landscape coordinate space.
// Browser orientation locks are optional; rotation never changes the game layout.
export const viewport={width:0,height:0,physicalWidth:0,physicalHeight:0,left:0,top:0,scale:1,rotated:false};
export function landscapeSize(width,height){return {width:Math.max(width,height),height:Math.min(width,height),rotated:height>width};}
export function viewportSize(width,height,visual,safe={}){
  const scale=Number.isFinite(visual?.scale)&&visual.scale>0?visual.scale:1;
  // VisualViewport dimensions are divided by browser zoom. Undo that division
  // for game layout, then compensate on the surface rather than losing its edges.
  const availableWidth=Math.round(Math.min(width,(visual?.width??width/scale)*scale));
  const availableHeight=Math.round(Math.min(height,(visual?.height??height/scale)*scale));
  const inset=(value,limit)=>Math.min(Math.max(0,Number(value)||0),Math.max(0,limit-1));
  const left=inset(safe.left,availableWidth),right=inset(safe.right,availableWidth-left);
  const top=inset(safe.top,availableHeight),bottom=inset(safe.bottom,availableHeight-top);
  const physicalWidth=availableWidth-left-right,physicalHeight=availableHeight-top-bottom;
  // Inset the shared canvas/UI surface before rotating it. Every rendered object
  // and hit target then uses the same unobstructed rectangle, in either direction.
  return {...landscapeSize(physicalWidth,physicalHeight),physicalWidth,physicalHeight,left:(visual?.offsetLeft||0)+left/scale,top:(visual?.offsetTop||0)+top/scale,scale};
}
export function gamePoint(event,view=viewport){
  const x=(event.clientX-view.left)*(view.scale||1),y=(event.clientY-view.top)*(view.scale||1);
  return view.rotated?{x:y,y:view.physicalWidth-x}:{x,y};
}
export function gameRect(element){
  const r=element.getBoundingClientRect(),a=gamePoint({clientX:r.left,clientY:r.top}),b=gamePoint({clientX:r.right,clientY:r.bottom});
  const left=Math.min(a.x,b.x),top=Math.min(a.y,b.y),right=Math.max(a.x,b.x),bottom=Math.max(a.y,b.y);
  return {x:left,y:top,left,top,right,bottom,width:right-left,height:bottom-top};
}
export function refreshViewport(){
  // Measure outside the transformed game surface. CSS env() follows the device's
  // physical edges; applying those values as inner padding misses edge controls.
  const probe=document.getElementById('viewportSafeArea'),css=probe&&getComputedStyle(probe);
  const safe=css?{left:parseFloat(css.paddingLeft),right:parseFloat(css.paddingRight),top:parseFloat(css.paddingTop),bottom:parseFloat(css.paddingBottom)}:{};
  const next=viewportSize(innerWidth,innerHeight,globalThis.visualViewport,safe);
  if(next.physicalWidth<1||next.physicalHeight<1)return false;
  const changed=Object.keys(next).some(key=>next[key]!==viewport[key]);
  if(!changed)return false;Object.assign(viewport,next);
  const root=document.getElementById('gameViewport'),style=document.documentElement.style;
  root.dataset.rotated=String(viewport.rotated);root.style.left=viewport.left+'px';root.style.top=viewport.top+'px';
  style.setProperty('--view-width',viewport.width+'px');style.setProperty('--view-height',viewport.height+'px');style.setProperty('--view-min',viewport.height+'px');
  root.style.transform=`scale(${1/viewport.scale}) `+(viewport.rotated?`translateX(${viewport.physicalWidth}px) rotate(90deg)`:'translate(0,0)');
  return true;
}
export async function enterLandscape(){
  // Fullscreen is requested while the Play/Continue tap still has user activation.
  // Browsers without this capability retain the same landscape CSS fallback.
  try{
    if(matchMedia('(pointer:coarse)').matches&&document.fullscreenEnabled&&!document.fullscreenElement)
      await document.documentElement.requestFullscreen({navigationUI:'hide'});
  }catch{}
  try{await globalThis.screen?.orientation?.lock?.('landscape');}catch{}
}
export function watchViewport(onChange){
  let frame=0;
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(refreshViewport())onChange();});};
  window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule,{passive:true});
  globalThis.screen?.orientation?.addEventListener?.('change',schedule);
  globalThis.visualViewport?.addEventListener('resize',schedule);globalThis.visualViewport?.addEventListener('scroll',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshViewport();onChange();}});
  const observer=new ResizeObserver(schedule);observer.observe(document.documentElement);
  // Safe insets can arrive after the resize event, or change without a size
  // change (flipping landscape sides, fullscreen, browser chrome). Watch padding.
  const probe=document.getElementById('viewportSafeArea');if(probe)observer.observe(probe,{box:'border-box'});
  refreshViewport();return schedule;
}
