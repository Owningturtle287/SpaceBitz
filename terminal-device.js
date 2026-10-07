import {bodyPosition,visualRadius,clamp} from './model.js';
import {terminalLines,typedLength} from './terminal.js';
import {contextPosition} from './target-ui.js';
import {formatCoordinates,SYSTEM_MAX_ZOOM} from './scale.js';
import {systemMinZoom} from './navigation.js';
import {addTerminalEntry} from './terminal-history.js';

export function createTerminalDevice({state,settings,$,chartSystem,select,updateUI,closeSystemChart,resetInput,saveSettings,applyCenterButtonLayout,screen}){
state.terminalEntries=[];
function appendTerminalEntry(text,kind='message'){
  const entry=addTerminalEntry(state.terminalEntries,text,kind);if(!entry)return;
  if(kind==='message')state.terminalNotice=entry.text;
  renderTerminalHistory();
  if(state.terminal){state.terminal.rewind=null;state.terminal.finished=true;}
  if(state.terminalExpanded)requestAnimationFrame(()=>{$('terminalScreen').scrollTop=$('terminalScreen').scrollHeight;});
  if(!state.save){
    $('menuTerminal').hidden=false;
    $('menuTerminalMessages').replaceChildren(...state.terminalEntries.slice(-2).map(terminalEntryNode));
  }else updateUI();
  return entry;
}
function terminalEntryNode(entry){
  const node=document.createElement('div');node.className='terminal-history-entry '+entry.kind;
  node.textContent=(entry.kind==='input'?'> ':'STATUS : ')+entry.text;return node;
}
function renderTerminalHistory(){
  $('terminalMessages').replaceChildren(...state.terminalEntries.map(terminalEntryNode));
}
function submitTerminalInput(){
  const input=$('terminalInput');if(!input.value.trim())return;
  appendTerminalEntry(input.value,'input');input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
}
function selectedRecord(){
  const chart=state.scene==='chart',selected=state.selected;
  const system=chart&&selected?.seed?chartSystem(selected.seed):state.system;
  const object=state.waypoint?{kind:'coordinate',name:'Coordinate'}:chart&&selected?.seed?system.star:selected||{kind:'coordinate',name:'Coordinate'};
  const position=state.waypoint|| (chart?selected:state.scene==='surface'?(selected?.kind==='sample'?selected:{x:0,y:0}):selected?bodyPosition(selected,state.save.days,system):null)||{x:0,y:0};
  const ship=state.scene==='surface'?state.save.surface:chart?state.save.chart:state.save.ship;
  return {object,system,position,ship};
}
function buildTerminal(){
  if(!state.save)return;const record=selectedRecord();
  state.terminal={text:terminalLines(record.object,record.system,{days:state.save.days,scene:state.scene,position:record.position,ship:record.ship,homeSystem:state.scene==='chart'?state.selected?.seed===state.save.homeSeed:state.save.currentSystem===state.save.homeSeed&&record.object.kind==='star',homeWorld:record.object.id===state.save.homePlanet}),start:performance.now(),count:-1};
  if(!state.selected&&!state.waypoint)state.terminal.text='Object Data: Ship Terminal\n\nSTATUS : READY\nLAYER : '+(state.scene==='chart'?'Deep Space':state.scene==='surface'?'Surface':'System')+'\nPOSITION : '+formatCoordinates(record.ship,state.scene)+'\nVOYAGE : '+state.save.name+'\n\nSelect an object or area to retrieve its data.';
  const output=$('terminalOutput');output.replaceChildren();let offset=0;
  state.terminal.lines=state.terminal.text.split('\n').map((text,index)=>{
    const node=document.createElement('div'),colon=text.indexOf(' : '),key=document.createElement('span'),value=document.createElement('span');
    node.className=!text?'terminal-break':index===0?'terminal-title':colon<0?'terminal-note':'terminal-field';
    key.className='terminal-key';value.className='terminal-value';node.append(key,value);node.hidden=true;output.append(node);
    const row={text,offset,node,key,value,colon};offset+=text.length+1;return row;
  });renderTerminalHistory();$('terminalScreen').scrollTop=0;
}
function showDetails(body){
  closeSystemChart();
  if(body&&body!==state.selected&&body.kind!=='coordinate')select(body);
  state.terminalExpanded=true;buildTerminal();updateUI();
}
function toggleTerminal(){
  if(!state.save)return;
  state.terminalExpanded=!state.terminalExpanded;
  if(state.terminalExpanded){closeSystemChart();buildTerminal();}
  else {
    $('terminalInput').blur();setTerminalKeyboard(false);
    if(!state.selected&&!state.waypoint&&!state.autopilot&&!state.warpUntil)state.terminalNotice=null;
  }
  updateUI();
}
let terminalShift=false,terminalCaps=false;
const heldTerminalKeys=new Map();
function stopTerminalKeys(){for(const press of heldTerminalKeys.values()){clearTimeout(press.delay);clearInterval(press.repeat);}heldTerminalKeys.clear();}
function setTerminalKeyboard(visible){
  if(!visible)stopTerminalKeys();
  $('terminalKeyboard').hidden=!visible;$('targetCard').classList.toggle('keyboard-open',visible);
  $('terminalKeyboardToggle').setAttribute('aria-expanded',String(visible));$('terminalKeyboardToggle').setAttribute('aria-label',visible?'Hide terminal keyboard':'Show terminal keyboard');
  scheduleTerminalLayout();updateInputCaret();
}
const terminalSymbols={'Q':'!','W':'@','E':'#','R':'$','T':'%','Y':'^','U':'&','I':'*','O':'(','P':')','A':'-','S':'_','D':'=','F':'+','G':'[','H':']','J':'{','K':'}','L':'\\','Z':';','X':':','C':"'",'V':'"','B':',','N':'.','M':'?'};
function terminalCharacter(key){return terminalShift?(terminalSymbols[key]||key):terminalCaps?key:key.toLowerCase();}
function terminalKey(key){
  const input=$('terminalInput'),start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
  if(key==='Shift'||key==='CapsLock'){if(key==='Shift')terminalShift=!terminalShift;else terminalCaps=!terminalCaps;renderTerminalKeyboard();return;}
  if(key==='Enter'){submitTerminalInput();setTerminalKeyboard(false);input.blur();return;}
  if(key==='Clear'){input.value='';input.setSelectionRange(0,0);input.dispatchEvent(new Event('input',{bubbles:true}));return;}
  const from=key==='Backspace'&&start===end?Math.max(0,start-1):start;
  const text=key==='Backspace'?'':key==='Space'?' ':terminalCharacter(key);
  if(input.value.length-(end-from)+text.length>input.maxLength)return;
  input.setRangeText(text,from,end,'end');input.dispatchEvent(new Event('input',{bubbles:true}));
}
function bindTerminalKey(button,key){
  let pointerClickPending=false,lastPointerRelease=-Infinity;
  button.onpointerdown=e=>{
    if(e.button!==0)return;e.preventDefault();e.stopPropagation();pointerClickPending=true;lastPointerRelease=performance.now();if(e.isTrusted)button.setPointerCapture?.(e.pointerId);terminalKey(key);
    if(['Shift','CapsLock','Enter','Clear'].includes(key))return;
    const press={delay:setTimeout(()=>{press.repeat=setInterval(()=>terminalKey(key),55);terminalKey(key);},350)};
    heldTerminalKeys.set(e.pointerId,press);
  };
  const release=e=>{lastPointerRelease=performance.now();if(e.type==='pointercancel')pointerClickPending=false;const press=heldTerminalKeys.get(e.pointerId);if(press){clearTimeout(press.delay);clearInterval(press.repeat);heldTerminalKeys.delete(e.pointerId);}};
  button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;
  // Assistive technology and physical keyboard activation have no preceding pointer press.
  button.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')pointerClickPending=false;};
  button.onclick=e=>{
    // Chromium touch clicks can have detail=0 too. Consume the click belonging to
    // the press already handled above, including after a long held-key repeat.
    if(pointerClickPending&&e.isTrusted&&performance.now()-lastPointerRelease<750){pointerClickPending=false;return;}
    if(e.detail===0)terminalKey(key);
  };
}
function renderTerminalKeyboard(){
  const keyboard=$('terminalKeyboard');
  if(!keyboard.childElementCount)for(const keys of ['1234567890','QWERTYUIOP','ASDFGHJKL',['CapsLock',...'ZXCVBNM','/'],['Shift','Space','Clear','Enter']]){
    const row=document.createElement('div');row.className='keyboard-row';
    for(const key of keys){const button=document.createElement('button');button.type='button';button.className='pixel-key';button.dataset.key=key;
      if(key==='Space')button.classList.add('space-key');bindTerminalKey(button,key);row.append(button);
    }keyboard.append(row);
  }
  for(const button of keyboard.querySelectorAll('button')){
    const key=button.dataset.key;button.textContent=key==='CapsLock'?'CAPS':key==='Shift'?'SHIFT':key.length===1?terminalCharacter(key):key.toUpperCase();
    button.setAttribute('aria-label',key==='Shift'?(terminalShift?'Switch to letters':'Switch to symbols'):key==='CapsLock'?'Caps Lock':key);
    if(key==='Shift'||key==='CapsLock')button.setAttribute('aria-pressed',String(key==='Shift'?terminalShift:terminalCaps));
  }
}
const inputMeasure=document.createElement('canvas').getContext('2d');
function updateInputCaret(){
  const input=$('terminalInput'),caret=$('terminalInputCaret');
  caret.hidden=!state.terminalExpanded||document.activeElement!==input||input.selectionStart!==input.selectionEnd;
  if(caret.hidden)return;
  const style=getComputedStyle(input);inputMeasure.font=style.font;
  const measured=inputMeasure.measureText(input.value.slice(0,input.selectionStart)).width;
  const available=input.clientWidth-12;
  if(measured-input.scrollLeft>available)input.scrollLeft=measured-available;
  else if(measured<input.scrollLeft)input.scrollLeft=measured;
  caret.style.left=(6+measured-input.scrollLeft)+'px';
}
renderTerminalKeyboard();bindTerminalKey($('terminalDelete'),'Backspace');
$('terminalInput').onfocus=()=>{resetInput();setTerminalKeyboard(true);};
$('terminalInput').onblur=updateInputCaret;
$('terminalInput').oninput=updateInputCaret;
$('terminalInput').onkeydown=e=>{if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();e.stopPropagation();if(e.key==='Enter'&&!e.repeat)submitTerminalInput();setTerminalKeyboard(false);$('terminalInput').blur();}else requestAnimationFrame(updateInputCaret);};
document.addEventListener('selectionchange',()=>{if(document.activeElement===$('terminalInput'))updateInputCaret();});
window.addEventListener('blur',stopTerminalKeys);
$('terminalKeyboardToggle').onclick=()=>{const open=$('terminalKeyboard').hidden;if(open)$('terminalInput').focus({preventScroll:true});setTerminalKeyboard(open);};

// Resizing is bounded to the viewport and applies only to the expanded device.
let terminalResize=null;
function terminalResizeSize(){
  const r=$('targetCard').getBoundingClientRect(),dock=getComputedStyle($('terminalDock'));
  const safe=$('dashboardBase').getBoundingClientRect().height-parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dashboard-height'));
  return {width:r.width-Math.max(0,parseFloat(dock.right)-3),height:r.height-safe+1};
}
function terminalLimits(){
  const joyRect=$('joystick').getBoundingClientRect();
  const reserve=Math.max(354,joyRect.width?joyRect.right+258:0);
  const maxWidth=Math.max(200,innerWidth-reserve);
  return {minWidth:Math.min(200,maxWidth),maxWidth,maxHeight:Math.max(170,innerHeight-88)};
}
function applyTerminalSize(){
  const dock=$('terminalDock'),limits=terminalLimits();
  dock.style.setProperty('--terminal-max-width',limits.maxWidth+'px');
  const collapsed=clamp(240*settings.terminalWidthScale/100,limits.minWidth,limits.maxWidth);
  dock.style.setProperty('--terminal-collapsed-width',collapsed+'px');
  const expanded=clamp(state.terminalSize?.width??264*settings.terminalWidthScale/100,limits.minWidth,limits.maxWidth);
  dock.style.setProperty('--terminal-expanded-width',expanded+'px');
  const terminalWidth=$('targetCard').hidden?94:state.terminalExpanded?expanded:collapsed;
  document.documentElement.style.setProperty('--deck-joy-max',Math.max(6,innerWidth-terminalWidth-($('targetCard').hidden?338:354))+'px');
  const height=clamp(state.terminalSize?.height??innerHeight*.7*settings.terminalHeightScale/100,Math.min($('terminalKeyboard').hidden?170:310,limits.maxHeight),limits.maxHeight);
  dock.style.setProperty('--terminal-user-height',height+'px');
  for(const id of ['terminalResizeTop','terminalResizeLeft'])$(id).hidden=!state.terminalExpanded||!settings.terminalResizeHandles;
}
function resizeTerminal(width,height){
  const limits=terminalLimits();state.terminalSize={width:clamp(width,limits.minWidth,limits.maxWidth),height:clamp(height,Math.min($('terminalKeyboard').hidden?170:310,limits.maxHeight),limits.maxHeight)};
  settings.terminalWidthScale=clamp(state.terminalSize.width/264*100,60,240);settings.terminalHeightScale=clamp(state.terminalSize.height/(innerHeight*.7)*100,40,130);
  applyTerminalSize();scheduleTerminalLayout();updateInputCaret();
}
for(const [id,axis] of [['terminalResizeTop','height'],['terminalResizeLeft','width']]){
  const handle=$(id);
  handle.onpointerdown=e=>{if(e.button!==0||!settings.terminalResizeHandles)return;e.preventDefault();e.stopPropagation();handle.setPointerCapture(e.pointerId);terminalResize={id:e.pointerId,axis,x:e.clientX,y:e.clientY,...terminalResizeSize()};$('terminalDock').classList.add('resizing');};
  handle.onpointermove=e=>{if(!terminalResize||e.pointerId!==terminalResize.id)return;const r=terminalResize;resizeTerminal(r.width+(axis==='width'?r.x-e.clientX:0),r.height+(axis==='height'?r.y-e.clientY:0));};
  const finish=e=>{if(e.pointerId!==terminalResize?.id)return;terminalResize=null;$('terminalDock').classList.remove('resizing');saveSettings();scheduleTerminalLayout();};
  handle.onpointerup=finish;handle.onpointercancel=finish;
  handle.onkeydown=e=>{const direction={ArrowLeft:1,ArrowUp:1,ArrowRight:-1,ArrowDown:-1}[e.key];if(!direction||!settings.terminalResizeHandles)return;e.preventDefault();e.stopPropagation();const r=terminalResizeSize();resizeTerminal(r.width+(axis==='width'?direction*12:0),r.height+(axis==='height'?direction*12:0));saveSettings();};
}
let dashboardResize=null;
const dashboardHandle=$('dashboardResize');
dashboardHandle.onpointerdown=e=>{if(e.button!==0||!settings.dashboardResizeHandle)return;e.preventDefault();e.stopPropagation();dashboardHandle.setPointerCapture(e.pointerId);dashboardResize={id:e.pointerId,y:e.clientY,height:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dashboard-height'))};};
dashboardHandle.onpointermove=e=>{if(e.pointerId!==dashboardResize?.id)return;settings.dashboardHeight=clamp(dashboardResize.height+dashboardResize.y-e.clientY,68,260);layoutDashboard();applyCenterButtonLayout();};
const finishDashboardResize=e=>{if(e.pointerId!==dashboardResize?.id)return;dashboardResize=null;saveSettings();};
dashboardHandle.onpointerup=finishDashboardResize;dashboardHandle.onpointercancel=finishDashboardResize;
dashboardHandle.onkeydown=e=>{const direction={ArrowUp:1,ArrowDown:-1}[e.key];if(!direction||!settings.dashboardResizeHandle)return;e.preventDefault();e.stopPropagation();settings.dashboardHeight=clamp(settings.dashboardHeight+direction*12,68,260);saveSettings();layoutDashboard();applyCenterButtonLayout();};
function layoutDashboard(){
  const row=Math.max(68,Math.min(settings.dashboardHeight+(settings.joyOffset||0),innerHeight*.5));
  const height=Math.max(row,settings.centerButton==='above'?136:68);
  document.documentElement.style.setProperty('--dashboard-row-height',row+'px');
  document.documentElement.style.setProperty('--dashboard-height',height+'px');
  $('terminalDock').style.setProperty('--terminal-compact-height',(row-2)+'px');
  dashboardHandle.hidden=!settings.dashboardResizeHandle;
}
function onDashboard(x,y){
  if($('app').hidden)return false;
  return ['dashboardBase','terminalDock'].some(id=>{const element=$(id);if(element.hidden)return false;const r=element.getBoundingClientRect();return r.width&&r.height&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});
}
function focusSelected(){
  if(!state.save)return;const {object,position}=selectedRecord();state.centerZoom=null;state.centerReady=false;state.followShip=false;
  if(state.scene==='chart'){state.zoom=2.4;state.focusBody=null;}
  else if(state.scene==='system'){state.zoom=clamp(Math.min(state.width,state.height)*.24/Math.max(visualRadius(object.diameter||1),.001),systemMinZoom(state.system,state.width,state.height,state.save.days),SYSTEM_MAX_ZOOM);state.focusBody=object.id||null;}
  else state.zoom=2.4;
  state.camera={x:position.x,y:position.y};state.panUntil=Infinity;
}
function updateTerminal(now){
  if(!state.terminalExpanded||!state.terminal)return;
  const record=state.terminal,screen=$('terminalScreen');
  if(record.rewind){
    const progress=settings.reducedMotion?1:clamp((now-record.rewind.start)/600,0,1);
    screen.scrollTop=record.rewind.from*(1-progress)**3;if(progress===1)record.rewind=null;
  }
  const count=Math.max(record.count,typedLength(record.text,(now-record.start)/1000,settings.reducedMotion));
  if(count===record.count)return;record.count=count;const atEnd=screen.scrollHeight-screen.scrollTop-screen.clientHeight<22;
  for(const row of record.lines){const visible=count>row.offset,text=row.text.slice(0,Math.max(0,count-row.offset)),split=row.colon<0?0:Math.min(text.length,row.colon+3);row.node.hidden=!visible;row.key.textContent=text.slice(0,split);row.value.textContent=text.slice(split)+(count>row.offset+row.text.length?'\n':'');}
  if(settings.reducedMotion)screen.scrollTop=0;else if(atEnd)screen.scrollTop=screen.scrollHeight;
  if(count===record.text.length&&!record.finished){record.finished=true;if(!settings.reducedMotion&&screen.scrollTop>0)record.rewind={from:screen.scrollTop,start:now};}
}
function positionContext(){
  if($('contextActions').hidden||!state.save)return;const record=selectedRecord(),target=screen(record.position.x,record.position.y),element=$('contextActions');
  const homeIcon=state.scene==='chart'?state.selected?.seed===state.save.homeSeed:state.scene==='system'&&record.object.id===state.save.homePlanet;
  const radius=(state.scene==='system'?visualRadius(record.object.diameter||0)*state.zoom:state.scene==='chart'?8:10)+(homeIcon?16:0);
  const obstacles=['terminalPocket','travelControls','systemChart','systemFit','flightReadout','settingsOpen','journalButton','joystick','navigationControls','mapButton','dashboardBase'].map($).filter(e=>e&&!e.hidden).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}).filter(r=>r.width&&r.height);
  const place=contextPosition(target,radius,{width:element.offsetWidth,height:element.offsetHeight},{width:state.width,height:state.height},obstacles,state.contextPlacement);state.contextPlacement=place;element.style.transform=`translate(${place.x}px,${place.y}px)`;
}
function layoutTerminalDock(){
  const visible=!$('targetCard').hidden;$('terminalDock').classList.toggle('has-target',visible);
  $('terminalDock').classList.toggle('terminal-expanded',Boolean(state.terminalExpanded));
  applyTerminalSize();layoutDashboard();
  $('terminalPocket').style.height=(visible?$('targetCard').getBoundingClientRect().height:0)+'px';
}
let terminalLayoutFrame=0;
function scheduleTerminalLayout(){
  if(terminalLayoutFrame)return;
  // Defer ancestor sizing until the next frame, outside nested observer delivery.
  terminalLayoutFrame=requestAnimationFrame(()=>{
    terminalLayoutFrame=0;layoutTerminalDock();
    const height=$('terminalPocket').getBoundingClientRect().height;
    document.documentElement.style.setProperty('--terminal-height',height+'px');applyCenterButtonLayout();
  });
}
const terminalObserver=new ResizeObserver(scheduleTerminalLayout);
terminalObserver.observe($('targetCard'));terminalObserver.observe($('terminalPocket'));
for(const event of ['wheel','touchstart','pointerdown','keydown'])$('terminalScreen').addEventListener(event,()=>{if(state.terminal)state.terminal.rewind=null;},{passive:true});

return {showDetails,toggleTerminal,buildTerminal,setTerminalKeyboard,appendTerminalEntry,applyTerminalSize,scheduleTerminalLayout,layoutTerminalDock,layoutDashboard,onDashboard,focusSelected,updateTerminal,positionContext};
}
