// iPhone taps can deliver pointer events without the later compatibility click.
// Activate ordinary buttons on touch release and consume that tap's later mouse
// sequence, even if a layer/layout change retargets it to another control.
// Mouse and keyboard activation remain native.
export function enableTouchButtons(root){
  const presses=new Map(),view=root.defaultView||globalThis;
  let compatibilityTap=null;
  const consumeTap=()=>{
    const tap=compatibilityTap={until:Infinity};
    // A cold system's first render must not use up the suppression interval.
    view.requestAnimationFrame(()=>{if(compatibilityTap===tap)tap.until=view.performance.now()+1000;});
  };
  const buttonAt=target=>{
    const button=target?.closest?.('button');
    return button&&!button.matches('.terminal-resize,.pixel-key,#terminalDelete,#systemChartToggle')?button:null;
  };
  const available=button=>button.isConnected&&!button.disabled&&!button.closest('[hidden],[inert]');
  root.addEventListener('pointerdown',()=>{compatibilityTap=null;},{capture:true});
  root.addEventListener('pointerdown',e=>{
    const button=buttonAt(e.target);
    if(!button)return;
    if(e.pointerType!=='touch')return;
    if(e.button!==0||!available(button))return;
    presses.set(e.pointerId,{button,x:e.clientX,y:e.clientY,moved:false});
  });
  root.addEventListener('pointermove',e=>{
    const press=presses.get(e.pointerId);
    if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>12)press.moved=true;
  },{passive:true});
  root.addEventListener('pointercancel',e=>{
    if(presses.has(e.pointerId))consumeTap();
    presses.delete(e.pointerId);
  });
  root.addEventListener('pointerup',e=>{
    const press=presses.get(e.pointerId);if(!press)return;
    presses.delete(e.pointerId);
    const {button}=press;
    consumeTap();
    if(press.moved||!available(button))return;
    // Implicit touch capture can send release to the original button after the
    // finger or an animated panel has moved away. Treat that as a cancelled tap.
    if(buttonAt(root.elementFromPoint(e.clientX,e.clientY))!==button)return;
    e.preventDefault();button.focus({preventScroll:true});button.click();
  },{passive:false});
  for(const type of ['mousedown','mouseup','click'])root.addEventListener(type,e=>{
    // Suppress before mousedown can focus/adjust a newly enabled range. Native
    // touch clicks may be labeled mouse or detail=0; neither is a reliable test.
    if(e.isTrusted&&compatibilityTap&&view.performance.now()<compatibilityTap.until){e.preventDefault();e.stopImmediatePropagation();}
  },{capture:true});
  // New physical input is always allowed immediately, including a Warp tap.
  root.addEventListener('keydown',()=>{compatibilityTap=null;},{capture:true});
  view.addEventListener?.('blur',()=>{presses.clear();compatibilityTap=null;});
}
