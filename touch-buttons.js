// iPhone taps can deliver pointer events without the later compatibility click.
// Activate ordinary buttons on touch release and consume that tap's native click
// if the browser delivers one. Mouse and keyboard activation remain native.
export function enableTouchButtons(root){
  const presses=new Map(),handled=new WeakMap();
  const buttonAt=target=>{
    const button=target?.closest?.('button');
    return button&&!button.matches('.terminal-resize,.pixel-key,#terminalDelete')?button:null;
  };
  const available=button=>button.isConnected&&!button.disabled&&!button.closest('[hidden],[inert]');
  root.addEventListener('pointerdown',e=>{
    const button=buttonAt(e.target);
    if(!button)return;
    if(e.pointerType!=='touch'){handled.delete(button);return;}
    if(e.button!==0||!available(button))return;
    presses.set(e.pointerId,{button,x:e.clientX,y:e.clientY,moved:false});
  });
  root.addEventListener('pointermove',e=>{
    const press=presses.get(e.pointerId);
    if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>12)press.moved=true;
  },{passive:true});
  root.addEventListener('pointercancel',e=>{
    const press=presses.get(e.pointerId);if(press)handled.set(press.button,performance.now());
    presses.delete(e.pointerId);
  });
  root.addEventListener('pointerup',e=>{
    const press=presses.get(e.pointerId);if(!press)return;
    presses.delete(e.pointerId);
    const {button}=press;
    handled.set(button,performance.now());
    if(press.moved||!available(button))return;
    // Implicit touch capture can send release to the original button after the
    // finger or an animated panel has moved away. Treat that as a cancelled tap.
    if(buttonAt(root.elementFromPoint(e.clientX,e.clientY))!==button)return;
    e.preventDefault();button.focus({preventScroll:true});button.click();
  },{passive:false});
  root.addEventListener('click',e=>{
    const button=buttonAt(e.target),time=button&&handled.get(button);
    // Safari can label a touch-generated click as mouse, or give it detail=0.
    // Match the button handled above instead of relying on those event fields.
    if(e.isTrusted&&time!=null&&performance.now()-time<1000){e.preventDefault();e.stopImmediatePropagation();}
  },{capture:true});
  root.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){const button=buttonAt(e.target);if(button)handled.delete(button);}
  },{capture:true});
  root.defaultView?.addEventListener('blur',()=>presses.clear());
}
