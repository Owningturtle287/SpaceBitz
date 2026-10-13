import {viewport,gamePoint,gameRect} from '../core/viewport.js';
import {overlaps} from './hud.js';

// Apple iPhone 14 dimensional drawing: display 64.58 mm wide, cutout
// 26.79 mm wide and 5.58 mm deep. At 390 pt this is about 162 x 34 pt.
// https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-14.pdf
export const IPHONE14_CAMERA={displayWidth:390,span:162,depth:34,clearance:6};
export const cameraAreas=[];
export function cameraRectangles(view,safe={},device={}){
  const {physicalWidth:w,physicalHeight:h}=view;
  if(!w||!h)return [];
  const iphone=Boolean(device.iphone),short=Math.min(w,h),screenShort=device.screenShort||short;
  // Browser chrome can crop either end of the short axis. Include that unknown
  // offset in the local guard instead of reserving a full-width side strip.
  const span=Math.min(short,Math.ceil(IPHONE14_CAMERA.span*screenShort/390+Math.max(0,screenShort-short)+12));
  const fallback=iphone&&screenShort>=360?Math.ceil(IPHONE14_CAMERA.depth*screenShort/390):0;
  const edges=[];
  if(h>w){if(safe.top||fallback)edges.push(['top',Math.max(safe.top||0,fallback)]);}
  else if(safe.left||safe.right||fallback){
    // Safari's legacy angle is 90 with the camera left and -90 with it right.
    // Its Screen Orientation API uses the opposite positive-angle convention.
    const side=device.legacyAngle===90?'left':device.legacyAngle===-90?'right':device.angle===270?'left':device.angle===90?'right':null;
    if(side)edges.push([side,Math.max(safe[side]||0,fallback,iphone?Math.max(safe.left||0,safe.right||0):0)]);
    else for(const side of ['left','right'])if(safe[side]||fallback)edges.push([side,Math.max(safe[side]||0,fallback)]);
  }
  return edges.filter(([,depth])=>depth>0).map(([side,depth])=>{
    depth=Math.min(short,depth+6);
    const r=side==='top'?{x:(w-span)/2,y:0,width:span,height:depth}:side==='left'?{x:0,y:(h-span)/2,width:depth,height:span}:{x:w-depth,y:(h-span)/2,width:depth,height:span};
    const point=(x,y)=>gamePoint({clientX:view.left+x/(view.scale||1),clientY:view.top+y/(view.scale||1)},view),a=point(r.x,r.y),b=point(r.x+r.width,r.y+r.height);
    return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y),side};
  });
}
export function cameraFit(rect,areas){
  if(rect.width<=0||rect.height<=0)return null;
  const hit=areas.find(a=>overlaps(rect,a,0)&&(a.x<=rect.x||a.x+a.width>=rect.x+rect.width));
  if(!hit)return null;
  const side=hit.x<=rect.x?'left':'right',w=rect.width,h=rect.height;
  const depth=Math.min(w-1,side==='left'?hit.x+hit.width-rect.x:rect.x+w-hit.x);
  const radius=Math.min(8,depth/2),start=Math.max(0,hit.y-rect.y-radius*2),end=Math.min(h,hit.y+hit.height-rect.y+radius*2);
  const x=n=>Math.round((side==='left'?n:w-n)*100)/100,n=v=>Math.round(v*100)/100;
  let contour=`M${x(start?0:depth)} ${n(start)}`;
  if(start)contour+=` Q${x(0)} ${n(start+radius)} ${x(radius)} ${n(start+radius)} H${x(depth-radius)} Q${x(depth)} ${n(start+radius)} ${x(depth)} ${n(start+radius*2)}`;
  contour+=` V${n(end===h?h:end-radius*2)}`;
  if(end<h)contour+=` Q${x(depth)} ${n(end-radius)} ${x(depth-radius)} ${n(end-radius)} H${x(radius)} Q${x(0)} ${n(end-radius)} ${x(0)} ${n(end)}`;
  const clip=`M${x(start?0:depth)} 0 ${start?`V${n(start)}`:''} ${contour.replace(/^M[^ ]+ [^ ]+ /,'')} ${end<h?`V${n(h)}`:''} H${x(w)} V0 Z`;
  return {side,depth,clip,contour};
}

export function createCameraLayout({$,onChange=()=>{}}){
  const svgNS='http://www.w3.org/2000/svg',outlines=new Map();let frame=0,last='';
  const set=(el,key,value)=>{if(el.style.getPropertyValue(key)!==value)el.style.setProperty(key,value);};
  const fit=(element,rect)=>{
    const shape=cameraFit(rect,cameraAreas);let outline=outlines.get(element);
    if(shape&&!outline){
      const path=document.createElementNS(svgNS,'path');path.classList.add('camera-contour');
      if(element instanceof SVGElement){element.append(path);outline={svg:element,path};}
      else {const svg=document.createElementNS(svgNS,'svg');svg.classList.add('camera-outline');svg.setAttribute('aria-hidden','true');svg.append(path);element.append(svg);outline={svg,path};}
      outlines.set(element,outline);
    }
    set(element,'clip-path',shape?`path('${shape.clip}')`:'');
    if(outline){if(outline.svg!==element)outline.svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);outline.path.setAttribute('d',shape?.contour||'');}
    return shape;
  };
  const probe=$('cameraProbe');
  function update(){
    frame=0;
    const css=getComputedStyle(probe),safe={left:parseFloat(css.paddingLeft)||0,right:parseFloat(css.paddingRight)||0,top:parseFloat(css.paddingTop)||0,bottom:parseFloat(css.paddingBottom)||0};
    const device={iphone:/iPhone/.test(navigator.userAgent),screenShort:Math.min(screen.width,screen.height),legacyAngle:globalThis.orientation,angle:screen.orientation?.angle};
    cameraAreas.splice(0,cameraAreas.length,...cameraRectangles(viewport,safe,device));
    set(document.documentElement,'--camera-menu-left',cameraAreas.filter(a=>a.x===0).reduce((v,a)=>Math.max(v,a.width),0)+'px');
    set(document.documentElement,'--camera-menu-right',cameraAreas.filter(a=>a.x+a.width>=viewport.width-1).reduce((v,a)=>Math.max(v,a.width),0)+'px');
    const rect=e=>{const r=gameRect(e);return {x:r.left,y:r.top,width:r.width,height:r.height};};
    const header=rect($('systemChartFrame')),tab=rect($('systemChartToggle')),readout=rect($('flightReadout')),chart=$('systemChart');
    fit($('systemChartFrame'),header);
    const leftInset=r=>cameraFit(r,cameraAreas)?.side==='left'?cameraFit(r,cameraAreas).depth:0;
    set(chart,'--camera-tab-left',Math.max(10,leftInset(tab))+'px');set(chart,'--camera-readout-left',Math.max(20,leftInset(readout))+'px');
    const reveal=$('systemChartContent').parentElement.parentElement,content=$('systemChartContent');
    const dropdown=$('systemChartContent').hidden?null:fit(reveal,rect(reveal));
    if(content.hidden)fit(reveal,{x:0,y:0,width:0,height:0});
    set(content,'--camera-chart-left',Math.max(6,dropdown?.side==='left'?dropdown.depth+2:0)+'px');
    const card=$('targetCard'),terminal=card.hidden?null:fit(card,rect(card));
    if(card.hidden)fit(card,{x:0,y:0,width:0,height:0});
    card.classList.toggle('camera-fitted',Boolean(terminal));set(card,'--camera-terminal-inset',terminal?terminal.depth+2+'px':'0px');
    const travel=rect($('travelControls')),dock=$('terminalDock'),dockRight=parseFloat(getComputedStyle(dock).right)||0;
    const rail=cameraAreas.filter(a=>a.x+a.width>=viewport.width-1&&a.y<travel.y+travel.height&&a.y+a.height>travel.y).reduce((v,a)=>Math.max(v,viewport.width-a.x-dockRight+2),0);
    set(dock,'--camera-travel-right',rail+'px');
    const joy=rect($('joystick')),joyLeft=cameraAreas.filter(a=>a.x===0&&a.y<joy.y+joy.height&&a.y+a.height>joy.y).reduce((v,a)=>Math.max(v,a.x+a.width+2),0);
    set(document.documentElement,'--camera-joy-left',joyLeft+'px');
    const signature=JSON.stringify([cameraAreas,rail,joyLeft]);if(signature!==last){last=signature;onChange();}
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const observer=new ResizeObserver(schedule);
  for(const id of ['gameViewport','systemChart','systemChartFrame','flightReadout','systemChartContent','targetCard','terminalScreen','travelControls','joystick'])observer.observe($(id));
  for(const sensor of probe.children)observer.observe(sensor);
  observer.observe(probe,{box:'border-box'});
  const modes=new MutationObserver(schedule);for(const id of ['systemChart','targetCard','terminalDock','travelControls','app'])modes.observe($(id),{attributes:true,attributeFilter:['hidden','class']});
  window.addEventListener('orientationchange',schedule,{passive:true});screen.orientation?.addEventListener?.('change',schedule);
  window.addEventListener('resize',schedule,{passive:true});globalThis.visualViewport?.addEventListener('resize',schedule);globalThis.visualViewport?.addEventListener('scroll',schedule);
  schedule();return {schedule};
}
