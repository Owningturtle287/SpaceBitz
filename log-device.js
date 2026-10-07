import {clamp} from './model.js';
import {LOG_FILTERS,logCategory} from './voyage-log.js';

export function createLogDevice({state,settings,$,formatDate,resetInput,saveSettings,updateUI,closeSystemChart,setTerminalKeyboard}){
  const overlay=$('journal'),panel=$('journalPanel');
  let previousFocus=null,serial=0,resize=null,closing=false;
  let filter='all';
  const filters=$('journalFilters');
  for(const [value,label] of LOG_FILTERS){
    const button=document.createElement('button');button.type='button';button.className='journal-filter';button.textContent=label;button.dataset.filter=value;button.setAttribute('aria-pressed',String(value===filter));
    button.onclick=()=>{filter=value;render();};filters.append(button);
  }
  const reduced=()=>settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  function applySize(){
    panel.style.width=clamp(Math.min(660,innerWidth*.82)*settings.logWidthScale/100,Math.min(320,innerWidth-24),innerWidth-24)+'px';
    panel.style.height=clamp(innerHeight*.72*settings.logHeightScale/100,Math.min(180,innerHeight-24),innerHeight-24)+'px';
    for(const id of ['journalResizeWidth','journalResizeHeight'])$(id).hidden=!settings.logResizeHandles;
    panel.classList.toggle('has-resize',settings.logResizeHandles);
  }
  function render(){
    $('journalSummary').textContent=state.save.discoveries.length+' discoveries · '+state.save.name;
    const content=$('journalContent');content.replaceChildren();
    for(const button of filters.children)button.setAttribute('aria-pressed',String(button.dataset.filter===filter));
    for(const entry of state.save.log.filter(entry=>filter==='all'||logCategory(entry)===filter)){
      const item=document.createElement(entry.kind==='object'?'details':'article');item.className='journal-entry '+(entry.kind==='object'?'object-survey':'action');
      item.dataset.category=logCategory(entry);
      const heading=document.createElement(entry.kind==='object'?'summary':'div');heading.className='journal-entry-heading';
      const title=document.createElement('span');title.textContent=entry.kind==='object'?entry.name+' · '+entry.type:entry.kind==='action'?entry.action:entry.action+' · '+entry.name;
      const date=document.createElement('time');date.textContent=formatDate(entry.days);heading.append(title,date);item.append(heading);
      if(entry.kind==='object'){
        const record=document.createElement('pre');record.className='journal-object-data';record.textContent=entry.data;item.append(record);
      }
      content.append(item);
    }
    if(!content.childElementCount){const empty=document.createElement('p');empty.className='journal-empty';empty.textContent=filter==='all'?'Object surveys and voyage actions will appear here.':'No '+LOG_FILTERS.find(([value])=>value===filter)[1].toLowerCase()+' recorded yet.';content.append(empty);}
    content.scrollTop=0;
  }
  function origin(){
    const button=$('journalButton').getBoundingClientRect(),r=panel.getBoundingClientRect();
    const x=button.left+button.width/2,y=button.top+button.height/2,cx=r.left+r.width/2,cy=r.top+r.height/2;
    return {dx:x-cx,dy:y-cy};
  }
  function animate(opening){
    for(const a of panel.getAnimations())a.cancel();
    const {dx,dy}=origin();
    const frames=[{transform:`translate(${dx}px,${dy}px) scale(.06,.04)`,opacity:0},{transform:`translate(${dx*.24}px,${dy*.2}px) scale(.48,.12)`,opacity:.85,offset:.4},{transform:'translate(0,0) scale(1)',opacity:1}];
    const duration=opening?620:360;
    return panel.animate(opening?frames:[...frames].reverse(),{duration,easing:'cubic-bezier(.22,.7,.25,1)',fill:'none'});
  }
  function open(){
    if(!state.save)return;if(state.journalOpen){close();return;}
    serial++;closing=false;previousFocus=document.activeElement;resetInput();closeSystemChart();
    const dock=$('terminalDock');state.journalDeckTarget=dock.classList.contains('has-target');
    document.documentElement.style.setProperty('--journal-dock-width',dock.getBoundingClientRect().width+'px');
    state.journalOpen=true;state.terminalExpanded=false;setTerminalKeyboard(false);$('terminalInput').blur();
    document.body.classList.add('journal-open');$('app').inert=true;$('targetCard').inert=true;
    $('journalButton').setAttribute('aria-expanded','true');overlay.hidden=false;applySize();render();updateUI();
    $('journalClose').focus({preventScroll:true});if(!reduced())animate(true);
  }
  function close(immediate=false){
    if(!state.journalOpen&&overlay.hidden)return;
    const token=++serial;closing=true;
    const finish=()=>{
      if(token!==serial)return;
      closing=false;state.journalOpen=false;overlay.hidden=true;document.body.classList.remove('journal-open');$('app').inert=Boolean(state.landscapeBlocked);$('targetCard').inert=false;
      $('journalButton').setAttribute('aria-expanded','false');updateUI();
      if(previousFocus?.isConnected&&!previousFocus.closest('[hidden]'))previousFocus.focus({preventScroll:true});else $('journalButton').focus({preventScroll:true});
    };
    if(immediate||reduced()){for(const a of panel.getAnimations())a.cancel();finish();}
    else animate(false).finished.then(finish).catch(()=>{});
  }
  $('journalClose').onclick=()=>close();
  overlay.onclick=e=>{if(e.target===overlay)close();};
  overlay.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
    if(e.key!=='Tab')return;
    const items=[...overlay.querySelectorAll('button,summary,[tabindex="0"]')].filter(el=>!el.disabled&&!el.hidden&&el.getClientRects().length);
    const first=items[0],last=items.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
  for(const [id,axis] of [['journalResizeWidth','width'],['journalResizeHeight','height']]){
    const handle=$(id);
    handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();handle.setPointerCapture(e.pointerId);resize={id:e.pointerId,x:e.clientX,y:e.clientY,width:panel.offsetWidth,height:panel.offsetHeight};panel.classList.add('resizing');};
    function change(width,height){
      settings.logWidthScale=clamp(width/Math.min(660,innerWidth*.82)*100,50,140);settings.logHeightScale=clamp(height/(innerHeight*.72)*100,40,140);applySize();
    }
    handle.onpointermove=e=>{if(e.pointerId!==resize?.id)return;change(resize.width+(axis==='width'?2*(resize.x-e.clientX):0),resize.height+(axis==='height'?2*(resize.y-e.clientY):0));};
    const finish=e=>{if(e.pointerId!==resize?.id)return;resize=null;panel.classList.remove('resizing');saveSettings();};
    handle.onpointerup=handle.onpointercancel=handle.onlostpointercapture=finish;
    handle.onkeydown=e=>{const d={ArrowLeft:1,ArrowUp:1,ArrowRight:-1,ArrowDown:-1}[e.key];if(!d)return;e.preventDefault();e.stopPropagation();change(panel.offsetWidth+(axis==='width'?d*12:0),panel.offsetHeight+(axis==='height'?d*12:0));saveSettings();};
  }
  window.addEventListener('resize',()=>{if(state.journalOpen){if(closing){close(true);return;}applySize();for(const a of panel.getAnimations())a.cancel();origin();}});
  return {open,close,applySize};
}
