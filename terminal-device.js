import {viewport,gamePoint,gameRect} from './viewport.js';
import {bodyPosition,visualRadius,clamp} from './model.js';
import {terminalLines,typedLength,objectType} from './terminal.js';
import {contextPosition} from './target-ui.js';
import {formatCoordinates,SYSTEM_MAX_ZOOM} from './scale.js';
import {systemMinZoom} from './navigation.js';
import {addTerminalEntry} from './terminal-history.js';

export function createTerminalDevice({state,settings,$,chartSystem,select,updateUI,closeSystemChart,closeJournal,recordLog,resetInput,saveSettings,applyCenterButtonLayout,screen}){
state.terminalEntries=[];
function canViewOutput(){return !document.hidden&&state.terminalExpanded&&!state.journalOpen&&!state.landscapeBlocked&&!$('targetCard').hidden&&!$('terminalScreen').hidden&&!$('modal').classList.contains('visible');}
function pauseTerminalOutput(now=performance.now()){
  const record=state.terminal;if(record&&!record.finished&&record.pausedAt==null)record.pausedAt=now;
}
function releaseTerminalQueue(){
  for(const entry of state.terminalEntries)if(entry.afterRecord){delete entry.afterRecord;if(entry.node)entry.node.hidden=false;}
}
function atBottom(){const screen=$('terminalScreen');return screen.scrollHeight-screen.scrollTop-screen.clientHeight<24;}
function renderRecord(record,count){
  record.count=count;
  for(const row of record.lines){const visible=count>row.offset,text=row.text.slice(0,Math.max(0,count-row.offset)),split=row.colon<0?0:Math.min(text.length,row.colon+3);row.node.hidden=!visible;row.key.textContent=text.slice(0,split);row.value.textContent=text.slice(split);}
  record.finished=count===record.text.length;
  if(record.finished)for(const entry of state.terminalEntries)if(entry.afterRecord===record&&entry.node)entry.node.hidden=false;
  if(record.finished&&record.survey&&!record.logged&&canViewOutput()){recordLog?.(record.survey);record.logged=true;}
}
function appendTerminalEntry(text,kind='message',{log=true}={}){
  const follow=atBottom();
  const entry=addTerminalEntry(state.terminalEntries,text,kind);if(!entry)return;
  const record=state.terminal||state.terminalEntries.findLast(e=>e.kind==='record'&&e.key===state.terminalRecordKey);
  if(record&&!record.finished)entry.afterRecord=record;
  if(kind==='message'){state.terminalNotice=entry.text;if(log)recordLog?.({kind:'action',text:entry.text});}
  renderTerminalHistory();
  if(state.terminalExpanded&&follow)requestAnimationFrame(()=>{$('terminalScreen').scrollTop=$('terminalScreen').scrollHeight;});
  if(!state.save){
    $('menuTerminal').hidden=false;
    $('menuTerminalMessages').replaceChildren(...state.terminalEntries.slice(-2).map(terminalEntryNode));
  }else updateUI();
  return entry;
}
function terminalEntryNode(entry){
  if(entry.node){entry.node.hidden=Boolean(entry.afterRecord&&!entry.afterRecord.finished);return entry.node;}
  const node=document.createElement('div');node.className='terminal-history-entry '+entry.kind;
  node.textContent=(entry.kind==='input'?'> ':'STATUS : ')+entry.text;node.hidden=Boolean(entry.afterRecord&&!entry.afterRecord.finished);entry.node=node;return node;
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
function selectedSummary(){
  if(!state.selected&&!state.waypoint)return '';
  const {object}=selectedRecord();return 'Object selected: '+object.name+' · '+objectType(object);
}
function buildTerminal(){
  if(!state.save||!state.terminalExpanded||state.journalOpen||state.landscapeBlocked||state.terminalCleared)return;const record=selectedRecord();
  const key=state.scene+':'+record.system.seed+':'+(record.object.id||state.selected?.seed||state.waypoint&&formatCoordinates(state.waypoint,state.scene)||'ship');
  const prior=state.terminalEntries.findLast(entry=>entry.kind==='record'&&entry.key===key);
  if(state.terminalRecordKey===key&&prior){state.terminal=prior;if(prior.pausedAt!=null){prior.start+=performance.now()-prior.pausedAt;prior.pausedAt=null;}return;}
  let text=terminalLines(record.object,record.system,{days:state.save.days,scene:state.scene,position:record.position,ship:record.ship,homeSystem:state.scene==='chart'?state.selected?.seed===state.save.homeSeed:state.save.currentSystem===state.save.homeSeed&&record.object.kind==='star',homeWorld:record.object.id===state.save.homePlanet});
  if(!state.selected&&!state.waypoint)text='Ship Terminal\n\nSTATUS : READY\nLAYER : '+(state.scene==='chart'?'Deep Space':state.scene==='surface'?'Surface':'System')+'\nPOSITION : '+formatCoordinates(record.ship,state.scene)+'\nVOYAGE : '+state.save.name+'\n\nSelect an object or area to retrieve its data.';
  const entry=addTerminalEntry(state.terminalEntries,text,'record');Object.assign(entry,{key,start:performance.now(),count:-1,followOutput:true});state.terminal=entry;state.terminalRecordKey=key;
  const output=document.createElement('div');output.className='terminal-record terminal-data';entry.node=output;let offset=0;
  entry.lines=entry.text.split('\n').map((text,index)=>{
    const node=document.createElement('div'),colon=text.indexOf(' : '),key=document.createElement('span'),value=document.createElement('span');
    node.className=!text?'terminal-break':index===0?'terminal-title':colon<0?'terminal-note':'terminal-field';
    key.className='terminal-key';value.className='terminal-value';node.append(key,value);node.hidden=true;output.append(node);
    const row={text,offset,node,key,value,colon};offset+=text.length+1;return row;
  });renderTerminalHistory();
  if(state.scene!=='chart'&&(state.selected||state.waypoint))entry.survey={kind:'object',key:record.system.seed+':'+(record.object.id||key),name:record.object.name,type:objectType(record.object),category:record.object.kind,text:entry.text,visual:{system:record.system.seed,id:record.object.id||'coordinate',kind:record.object.kind}};
  $('terminalScreen').scrollTop=$('terminalScreen').scrollHeight;
}
function clearTerminal(){
  state.terminalEntries.length=0;state.terminal=null;state.terminalRecordKey=null;state.terminalNotice=null;state.terminalCleared=true;
  renderTerminalHistory();$('terminalScreen').scrollTop=0;updateUI();
}
function showDetails(body){
  closeJournal?.();closeSystemChart();
  if(body&&body!==state.selected&&body.kind!=='coordinate')select(body);
  state.terminalCleared=false;state.terminalExpanded=true;buildTerminal();updateUI();
}
function toggleTerminal(){
  if(!state.save)return;
  state.terminalExpanded=!state.terminalExpanded;
  if(state.terminalExpanded){closeJournal?.();closeSystemChart();buildTerminal();}
  else {
    pauseTerminalOutput();
    $('terminalInput').blur();setTerminalKeyboard(false);
    if(!state.selected&&!state.waypoint&&!state.autopilot&&!state.warpUntil)state.terminalNotice=null;
  }
  updateUI();
}
$('terminalClear').onclick=clearTerminal;
let terminalShift=false,terminalCaps=false;
const heldTerminalKeys=new Map();
function stopTerminalKeys(){for(const press of heldTerminalKeys.values()){clearTimeout(press.delay);clearInterval(press.repeat);}heldTerminalKeys.clear();}
function setTerminalKeyboard(visible){
  if(!visible)stopTerminalKeys();
  $('terminalKeyboard').hidden=!visible;$('targetCard').classList.toggle('keyboard-open',visible);
  $('terminalKeyboardToggle').setAttribute('aria-expanded',String(visible));$('terminalKeyboardToggle').setAttribute('aria-label',visible?'Hide terminal keyboard':'Show terminal keyboard');
  scheduleTerminalLayout();scheduleInputCaret();
}
const terminalSymbols={'Q':'!','W':'@','E':'#','R':'$','T':'%','Y':'^','U':'&','I':'*','O':'(','P':')','A':'-','S':'_','D':'=','F':'+','G':'[','H':']','J':'{','K':'}','L':'\\','Z':';','X':':','C':"'",'V':'"','B':',','N':'.','M':'?'};
function terminalCharacter(key){return terminalShift?(terminalSymbols[key]||key):terminalCaps?key:key.toLowerCase();}
function editTerminalInput(text,from,end){
  const input=$('terminalInput');
  if(input.value.length-(end-from)+text.length>input.maxLength)return;
  input.setRangeText(text,from,end,'end');input.dispatchEvent(new Event('input',{bubbles:true}));
}
function terminalKey(key){
  const input=$('terminalInput'),start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
  if(key==='Shift'||key==='CapsLock'){if(key==='Shift')terminalShift=!terminalShift;else terminalCaps=!terminalCaps;renderTerminalKeyboard();return;}
  if(key==='Enter'){submitTerminalInput();setTerminalKeyboard(false);input.blur();return;}
  if(key==='Clear'){input.value='';input.setSelectionRange(0,0);input.dispatchEvent(new Event('input',{bubbles:true}));return;}
  const from=key==='Backspace'&&start===end?Math.max(0,start-1):start;
  const text=key==='Backspace'?'':key==='Space'?' ':terminalCharacter(key);
  editTerminalInput(text,from,end);
}
function bindTerminalKey(button,key){
  let pointerClickPending=false,lastPointerRelease=-Infinity;
  const restoreFocus=()=>{if(!$('terminalKeyboard').hidden)$('terminalInput').focus({preventScroll:true});};
  button.onpointerdown=e=>{
    if(e.button!==0)return;e.preventDefault();e.stopPropagation();pointerClickPending=true;lastPointerRelease=performance.now();if(e.isTrusted)button.setPointerCapture?.(e.pointerId);terminalKey(key);
    if(['Shift','CapsLock','Enter','Clear'].includes(key))return;
    const press={delay:setTimeout(()=>{press.repeat=setInterval(()=>terminalKey(key),55);terminalKey(key);},350)};
    heldTerminalKeys.set(e.pointerId,press);
  };
  const release=e=>{lastPointerRelease=performance.now();if(e.type==='pointercancel')pointerClickPending=false;const press=heldTerminalKeys.get(e.pointerId);if(press){clearTimeout(press.delay);clearInterval(press.repeat);heldTerminalKeys.delete(e.pointerId);}if(e.type==='pointerup')restoreFocus();};
  button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;
  // Assistive technology and physical keyboard activation have no preceding pointer press.
  button.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')pointerClickPending=false;};
  button.onclick=e=>{
    // Chromium touch clicks can have detail=0 too. Consume the click belonging to
    // the press already handled above, including after a long held-key repeat.
    if(pointerClickPending&&e.isTrusted&&performance.now()-lastPointerRelease<750){pointerClickPending=false;restoreFocus();return;}
    if(e.detail===0)terminalKey(key);restoreFocus();
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
let caretFrame=0,caretSettle=0,caretPointer=null;
function scheduleInputCaret(hide=false){
  if(hide){$('terminalInputCaret').hidden=true;caretSettle=2;}
  if(caretFrame)return;
  caretFrame=requestAnimationFrame(()=>{
    caretFrame=0;
    if(caretPointer!==null)return;
    if(caretSettle>0){caretSettle--;scheduleInputCaret();return;}
    updateInputCaret();
  });
}
function updateInputCaret(){
  const input=$('terminalInput'),caret=$('terminalInputCaret');
  if(!state.terminalExpanded||document.activeElement!==input||input.selectionStart!==input.selectionEnd||!input.clientWidth){caret.hidden=true;return;}
  const style=getComputedStyle(input);
  // Some browsers omit the computed font shorthand when longhands differ.
  inputMeasure.font=style.font||`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const measured=inputMeasure.measureText(input.value.slice(0,input.selectionStart)).width;
  const left=parseFloat(style.paddingLeft),right=parseFloat(style.paddingRight),width=parseFloat(getComputedStyle(caret).width);
  const available=Math.max(0,input.clientWidth-left-right-width);
  if(measured-input.scrollLeft>available)input.scrollLeft=measured-available;
  else if(measured<input.scrollLeft)input.scrollLeft=measured;
  // Position before revealing: focus, selection and native scrolling must
  // settle before a newly visible cursor can be painted at its default origin.
  caret.style.left=(input.offsetLeft+input.clientLeft+left+measured-input.scrollLeft)+'px';
  caret.hidden=false;
}
renderTerminalKeyboard();bindTerminalKey($('terminalDelete'),'Backspace');
// inputmode=none alone does not reliably suppress iOS focus zoom/keyboard.
// A touch-focused read-only field still supports selection and our pixel keys.
// Physical keyboards and paste are handled below without invoking the OS keyboard.
$('terminalInput').readOnly=matchMedia('(pointer:coarse)').matches;
$('terminalInput').onpointerdown=e=>{const input=$('terminalInput');caretPointer=e.pointerId;scheduleInputCaret(true);input.readOnly=e.pointerType!=='mouse';if(input.readOnly)input.focus({preventScroll:true});};
for(const event of ['pointerup','pointercancel'])document.addEventListener(event,e=>{if(e.pointerId===caretPointer){caretPointer=null;scheduleInputCaret();}});
$('terminalInput').onfocus=()=>{scheduleInputCaret(true);resetInput();setTerminalKeyboard(true);};
$('terminalInput').onblur=()=>{caretPointer=null;$('terminalInputCaret').hidden=true;};
$('terminalInput').oninput=()=>scheduleInputCaret();
$('terminalInput').onscroll=()=>scheduleInputCaret();
$('terminalInput').onkeydown=e=>{
  const input=$('terminalInput');
  if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();e.stopPropagation();if(e.key==='Enter'&&!e.repeat)submitTerminalInput();setTerminalKeyboard(false);input.blur();return;}
  if(input.readOnly&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.isComposing){
    const start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
    if(e.key.length===1){e.preventDefault();e.stopPropagation();editTerminalInput(e.key,start,end);}
    else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();e.stopPropagation();editTerminalInput('',e.key==='Backspace'&&start===end?Math.max(0,start-1):start,e.key==='Delete'&&start===end?Math.min(input.value.length,end+1):end);}
  }
  scheduleInputCaret();
};
$('terminalInput').onpaste=e=>{
  const input=$('terminalInput');if(!input.readOnly)return;e.preventDefault();
  const start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
  editTerminalInput((e.clipboardData?.getData('text/plain')||'').replace(/[\r\n]/g,' ').slice(0,input.maxLength-input.value.length+end-start),start,end);
};
document.addEventListener('selectionchange',()=>{if(document.activeElement===$('terminalInput'))scheduleInputCaret();});
document.fonts.ready.then(()=>scheduleInputCaret());
window.addEventListener('blur',stopTerminalKeys);
$('terminalKeyboardToggle').onclick=()=>{const open=$('terminalKeyboard').hidden;if(open)$('terminalInput').focus({preventScroll:true});setTerminalKeyboard(open);};

// Resizing is bounded to the viewport and applies only to the expanded device.
let terminalResize=null;
function terminalResizeSize(){
  const r=gameRect($('targetCard')),dock=getComputedStyle($('terminalDock'));
  const safe=gameRect($('dashboardBase')).height-parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dashboard-height'));
  return {width:r.width-Math.max(0,parseFloat(dock.right)-3),height:r.height-safe+1};
}
function terminalLimits(){
  const joyRect=gameRect($('joystick'));
  const reserve=Math.max(370,joyRect.width?joyRect.right+272:0);
  const maxWidth=Math.max(200,viewport.width-reserve);
  return {minWidth:Math.min(200,maxWidth),maxWidth,maxHeight:Math.max(170,viewport.height-88)};
}
function applyTerminalSize(){
  $('targetCard').classList.toggle('terminal-large-data',(settings.terminalFontMode==='master'?settings.terminalFontSize:settings.terminalDataFont)>12);
  const dock=$('terminalDock'),limits=terminalLimits();
  dock.style.setProperty('--terminal-max-width',limits.maxWidth+'px');
  const collapsed=clamp(240*settings.terminalWidthScale/100,limits.minWidth,limits.maxWidth);
  dock.style.setProperty('--terminal-collapsed-width',collapsed+'px');
  const expanded=clamp(state.terminalSize?.width??264*settings.terminalWidthScale/100,limits.minWidth,limits.maxWidth);
  dock.style.setProperty('--terminal-expanded-width',expanded+'px');
  const terminalWidth=$('targetCard').hidden?94:state.terminalExpanded?expanded:collapsed;
  document.documentElement.style.setProperty('--deck-joy-max',Math.max(6,viewport.width-terminalWidth-($('targetCard').hidden?338:390))+'px');
  const height=clamp(state.terminalSize?.height??viewport.height*.7*settings.terminalHeightScale/100,Math.min($('terminalKeyboard').hidden?170:310,limits.maxHeight),limits.maxHeight);
  dock.style.setProperty('--terminal-user-height',height+'px');
  for(const id of ['terminalResizeTop','terminalResizeLeft'])$(id).hidden=!state.terminalExpanded||!settings.terminalResizeHandles;
}
function resizeTerminal(width,height){
  const limits=terminalLimits();state.terminalSize={width:clamp(width,limits.minWidth,limits.maxWidth),height:clamp(height,Math.min($('terminalKeyboard').hidden?170:310,limits.maxHeight),limits.maxHeight)};
  settings.terminalWidthScale=clamp(state.terminalSize.width/264*100,60,240);settings.terminalHeightScale=clamp(state.terminalSize.height/(viewport.height*.7)*100,40,130);
  applyTerminalSize();scheduleTerminalLayout();scheduleInputCaret();
}
for(const [id,axis] of [['terminalResizeTop','height'],['terminalResizeLeft','width']]){
  const handle=$(id);
  handle.onpointerdown=e=>{if(e.button!==0||!settings.terminalResizeHandles)return;e.preventDefault();e.stopPropagation();handle.setPointerCapture(e.pointerId);terminalResize={id:e.pointerId,axis,x:gamePoint(e).x,y:gamePoint(e).y,...terminalResizeSize()};$('terminalDock').classList.add('resizing');};
  handle.onpointermove=e=>{if(!terminalResize||e.pointerId!==terminalResize.id)return;const r=terminalResize;resizeTerminal(r.width+(axis==='width'?r.x-gamePoint(e).x:0),r.height+(axis==='height'?r.y-gamePoint(e).y:0));};
  const finish=e=>{if(e.pointerId!==terminalResize?.id)return;terminalResize=null;$('terminalDock').classList.remove('resizing');saveSettings();scheduleTerminalLayout();};
  handle.onpointerup=finish;handle.onpointercancel=finish;handle.onlostpointercapture=finish;
  handle.onkeydown=e=>{const direction={ArrowLeft:1,ArrowUp:1,ArrowRight:-1,ArrowDown:-1}[e.key];if(!direction||!settings.terminalResizeHandles)return;e.preventDefault();e.stopPropagation();const r=terminalResizeSize();resizeTerminal(r.width+(axis==='width'?direction*12:0),r.height+(axis==='height'?direction*12:0));saveSettings();};
}
let dashboardResize=null;
const dashboardHandle=$('dashboardResize');
dashboardHandle.onpointerdown=e=>{if(e.button!==0||!settings.dashboardResizeHandle)return;e.preventDefault();e.stopPropagation();dashboardHandle.setPointerCapture(e.pointerId);dashboardResize={id:e.pointerId,y:gamePoint(e).y,height:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dashboard-height'))};};
dashboardHandle.onpointermove=e=>{if(e.pointerId!==dashboardResize?.id)return;settings.dashboardHeight=clamp(dashboardResize.height+dashboardResize.y-gamePoint(e).y,68,260);layoutDashboard();applyCenterButtonLayout();};
const finishDashboardResize=e=>{if(e.pointerId!==dashboardResize?.id)return;dashboardResize=null;saveSettings();};
dashboardHandle.onpointerup=finishDashboardResize;dashboardHandle.onpointercancel=finishDashboardResize;
dashboardHandle.onkeydown=e=>{const direction={ArrowUp:1,ArrowDown:-1}[e.key];if(!direction||!settings.dashboardResizeHandle)return;e.preventDefault();e.stopPropagation();settings.dashboardHeight=clamp(settings.dashboardHeight+direction*12,68,260);saveSettings();layoutDashboard();applyCenterButtonLayout();};
function layoutDashboard(){
  const row=Math.max(68,Math.min(settings.dashboardHeight+(settings.joyOffset||0),viewport.height*.5));
  const height=Math.max(row,settings.centerButton==='above'?136:68);
  document.documentElement.style.setProperty('--dashboard-row-height',row+'px');
  document.documentElement.style.setProperty('--dashboard-height',height+'px');
  $('terminalDock').style.setProperty('--terminal-compact-height',(row-2)+'px');
  dashboardHandle.hidden=!settings.dashboardResizeHandle;
}
function onDashboard(x,y){
  if($('app').hidden)return false;
  return ['dashboardBase','terminalDock'].some(id=>{const element=$(id);if(element.hidden)return false;const r=gameRect(element);return r.width&&r.height&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});
}
function focusSelected(){
  if(!state.save)return;const {object,position}=selectedRecord();state.centerZoom=null;state.centerReady=false;state.followShip=false;
  if(state.scene==='chart'){state.zoom=2.4;state.focusBody=null;}
  else if(state.scene==='system'){state.zoom=clamp(Math.min(state.width,state.height)*.24/Math.max(visualRadius(object.diameter||1),.001),systemMinZoom(state.system,state.width,state.height,state.save.days),SYSTEM_MAX_ZOOM);state.focusBody=object.id||null;}
  else state.zoom=2.4;
  state.camera={x:position.x,y:position.y};state.panUntil=Infinity;
}
function updateTerminal(now){
  if(!state.terminal)return;
  const record=state.terminal,screen=$('terminalScreen');
  if(!canViewOutput()){pauseTerminalOutput(now);return;}
  if(record.pausedAt!=null){record.start+=now-record.pausedAt;record.pausedAt=null;}
  const count=Math.max(record.count,typedLength(record.text,(now-record.start)/1000,settings.reducedMotion));
  if(count===record.count)return;renderRecord(record,count);
  if(record.followOutput)screen.scrollTop=screen.scrollHeight;
}
for(const event of ['wheel','touchmove','pointerdown'])$('terminalScreen').addEventListener(event,()=>{if(state.terminal)state.terminal.followOutput=false;},{passive:true});
function positionContext(){
  if($('contextActions').hidden||!state.save)return;const record=selectedRecord(),target=screen(record.position.x,record.position.y),element=$('contextActions');
  const homeIcon=state.scene==='chart'?state.selected?.seed===state.save.homeSeed:state.scene==='system'&&record.object.id===state.save.homePlanet;
  const radius=(state.scene==='system'?visualRadius(record.object.diameter||0)*state.zoom:state.scene==='chart'?8:10)+(homeIcon?16:0);
  const obstacles=['terminalPocket','travelControls','systemChart','systemFit','flightReadout','settingsOpen','journalButton','joystick','navigationControls','mapButton','dashboardBase'].map($).filter(e=>e&&!e.hidden).map(e=>{const r=gameRect(e);return {x:r.x,y:r.y,width:r.width,height:r.height};}).filter(r=>r.width&&r.height);
  const place=contextPosition(target,radius,{width:element.offsetWidth,height:element.offsetHeight},{width:state.width,height:state.height},obstacles,state.contextPlacement);state.contextPlacement=place;element.style.transform=`translate(${place.x}px,${place.y}px)`;
}
function layoutTerminalDock(){
  if(state.journalOpen)return;
  const visible=state.journalOpen?state.journalDeckTarget:!$('targetCard').hidden;$('terminalDock').classList.toggle('has-target',visible);
  $('terminalDock').classList.toggle('terminal-expanded',Boolean(state.terminalExpanded));
  applyTerminalSize();layoutDashboard();
  $('terminalPocket').style.height=(visible?gameRect($('targetCard')).height:0)+'px';
}
let terminalLayoutFrame=0;
function scheduleTerminalLayout(){
  if(terminalLayoutFrame)return;
  // Defer ancestor sizing until the next frame, outside nested observer delivery.
  terminalLayoutFrame=requestAnimationFrame(()=>{
    terminalLayoutFrame=0;layoutTerminalDock();
    const height=gameRect($('terminalPocket')).height;
    document.documentElement.style.setProperty('--terminal-height',height+'px');applyCenterButtonLayout();scheduleInputCaret();
  });
}
const terminalObserver=new ResizeObserver(scheduleTerminalLayout);
terminalObserver.observe($('targetCard'));terminalObserver.observe($('terminalPocket'));
return {showDetails,toggleTerminal,buildTerminal,clearTerminal,pauseTerminalOutput,releaseTerminalQueue,selectedSummary,setTerminalKeyboard,appendTerminalEntry,applyTerminalSize,scheduleTerminalLayout,layoutTerminalDock,layoutDashboard,onDashboard,focusSelected,updateTerminal,positionContext};
}
