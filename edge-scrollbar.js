import {viewport,gamePoint,gameRect} from './viewport.js';
// Native iOS overlay indicators can sit inside flex-panel text. Keep the rail
// outside the scrolling content and position it against that panel's right rim.
export function createEdgeScrollbar(scroller,{container=scroller.parentElement,id,label,onScrollIntent=()=>{}}={}){
  const rail=document.createElement('div'),thumb=document.createElement('div');
  rail.id=id;rail.className='edge-scrollbar';rail.tabIndex=0;rail.hidden=true;
  rail.setAttribute('role','scrollbar');rail.setAttribute('aria-orientation','vertical');
  rail.setAttribute('aria-controls',scroller.id);rail.setAttribute('aria-label',label);
  rail.setAttribute('aria-valuemin','0');thumb.className='edge-scrollbar-thumb';rail.append(thumb);container.append(rail);
  scroller.classList.add('edge-scroll-content');
  let frame=0,drag=null;
  function update(){
    frame=0;const r=gameRect(scroller),p=gameRect(container),max=scroller.scrollHeight-scroller.clientHeight;
    rail.hidden=scroller.hidden||container.hidden||r.height===0||max<=1;if(rail.hidden)return;
    rail.style.left=(r.left+scroller.clientLeft+scroller.clientWidth-p.left-container.clientLeft-14)+'px';
    rail.style.top=(r.top+scroller.clientTop-p.top-container.clientTop+3)+'px';
    const height=Math.max(0,scroller.clientHeight-6),size=Math.min(height,Math.max(24,height*scroller.clientHeight/scroller.scrollHeight));
    rail.style.height=height+'px';thumb.style.height=size+'px';thumb.style.top=(height-size)*Math.min(1,Math.max(0,scroller.scrollTop/max))+'px';
    rail.setAttribute('aria-valuemax',String(Math.round(max)));rail.setAttribute('aria-valuenow',String(Math.round(scroller.scrollTop)));
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  function move(y,offset){const r=gameRect(rail),travel=r.height-thumb.offsetHeight;scroller.scrollTop=travel>0?(y-r.top-offset)/travel*(scroller.scrollHeight-scroller.clientHeight):0;update();}
  rail.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();onScrollIntent();rail.focus({preventScroll:true});rail.setPointerCapture(e.pointerId);const r=gameRect(thumb);drag={id:e.pointerId,offset:e.target===thumb?gamePoint(e).y-r.top:r.height/2};move(gamePoint(e).y,drag.offset);};
  rail.onpointermove=e=>{if(drag?.id===e.pointerId){e.preventDefault();move(gamePoint(e).y,drag.offset);}};
  const finish=e=>{if(drag?.id===e.pointerId)drag=null;};rail.onpointerup=rail.onpointercancel=rail.onlostpointercapture=finish;
  rail.onkeydown=e=>{const delta={ArrowDown:32,ArrowUp:-32,PageDown:scroller.clientHeight*.85,PageUp:-scroller.clientHeight*.85}[e.key];if(delta===undefined&&!['Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();onScrollIntent();scroller.scrollTop=e.key==='Home'?0:e.key==='End'?scroller.scrollHeight:scroller.scrollTop+delta;update();};
  scroller.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  const sizes=new ResizeObserver(schedule);sizes.observe(scroller);sizes.observe(container);
  const content=new MutationObserver(schedule);content.observe(scroller,{attributes:true,childList:true,characterData:true,subtree:true});
  const panel=new MutationObserver(schedule);panel.observe(container,{attributes:true,attributeFilter:['hidden','class','style']});
  schedule();return {update:schedule};
}
