import {LOG_FILTERS,logCategory,LOG_PAGE_SIZE} from './voyage-log.js';

export function createLogDevice({state,settings,$,formatDate,resetInput,updateUI,closeSystemChart,setTerminalKeyboard,pauseTerminalOutput,readPage,createPreview}){
  const overlay=$('journal'),panel=$('journalPanel');
  let previousFocus=null,serial=0,closing=false;
  let filter='all';
  let renderSerial=0,displayedView=null;
  const views=new Map(),pager=document.createElement('div');pager.className='journal-pagination';
  const newer=document.createElement('button'),older=document.createElement('button'),pageLabel=document.createElement('span');
  newer.type=older.type='button';newer.textContent='NEWER';older.textContent='OLDER';pager.append(newer,pageLabel,older);$('journalContent').after(pager);
  function view(){const key=state.save.id+':'+filter;if(!views.has(key))views.set(key,{page:0,scroll:0,expanded:new Set()});return views.get(key);}
  function remember(){if(displayedView)displayedView.scroll=$('journalContent').scrollTop;}
  newer.onclick=()=>{remember();view().page=Math.max(0,view().page-1);view().scroll=0;render();};
  older.onclick=()=>{remember();view().page++;view().scroll=0;render();};
  const filters=$('journalFilters');
  for(const [value,label] of LOG_FILTERS){
    const button=document.createElement('button');button.type='button';button.className='journal-filter';button.textContent=label;button.dataset.filter=value;button.setAttribute('aria-pressed',String(value===filter));
    button.onclick=()=>{remember();filter=value;render();};filters.append(button);
  }
  const reduced=()=>settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  function applySize(){
    panel.style.width=innerWidth+'px';panel.style.height=innerHeight+'px';
  }
  async function render(){
    const token=++renderSerial,save=state.save,reading=view(),content=$('journalContent');
    $('journalSummary').textContent=save.discoveries.length+' discoveries · '+save.name;
    content.setAttribute('aria-busy','true');newer.disabled=older.disabled=true;
    for(const button of filters.children)button.setAttribute('aria-pressed',String(button.dataset.filter===filter));
    let entries,total;
    try{({entries,total}=await readPage(save,filter,reading.page*LOG_PAGE_SIZE,LOG_PAGE_SIZE));}
    catch(error){if(token!==renderSerial)return;content.textContent=error.message;content.removeAttribute('aria-busy');pageLabel.textContent='';return;}
    if(token!==renderSerial||save!==state.save||!state.journalOpen)return;
    if(reading.page&&reading.page*LOG_PAGE_SIZE>=total){reading.page=Math.max(0,Math.ceil(total/LOG_PAGE_SIZE)-1);render();return;}
    content.replaceChildren();displayedView=reading;
    for(const [index,entry]of entries.entries()){
      const row=document.createElement('article');row.className='journal-entry';
      const item=entry.kind==='object'?document.createElement('details'):row;
      if(entry.kind==='object'){item.className='object-survey';row.append(item);}else row.classList.add('action');
      const id=entry.id||entry.objectKey||String(reading.page*LOG_PAGE_SIZE+index);row.dataset.entryId=id;
      const category=logCategory(entry);row.dataset.category=category;
      if(category!=='status'){row.classList.add('visual-entry');row.prepend(createPreview(entry,save));}
      const heading=document.createElement(entry.kind==='object'?'summary':'div');heading.className='journal-entry-heading';
      const title=document.createElement('span');title.textContent=entry.kind==='object'?entry.name+' · '+entry.type:entry.kind==='action'?entry.action:entry.action+' · '+entry.name;
      const date=document.createElement('time');date.textContent=formatDate(entry.days);
      if(entry.kind==='object'){
        const button=document.createElement('button');button.type='button';button.className='journal-survey-toggle';button.setAttribute('aria-label','Toggle '+entry.name+' data');button.append(title,date);heading.append(button);item.append(heading);
        const unfold=()=>{
          button.setAttribute('aria-expanded',String(item.open));
          if(item.open){reading.expanded.add(id);if(!item.querySelector('.journal-object-data'))item.append(objectData(entry.data));}
          else reading.expanded.delete(id);
        };
        button.onclick=e=>{e.preventDefault();e.stopPropagation();item.open=!item.open;unfold();};
        heading.onclick=e=>{e.preventDefault();if(!e.target.closest('button'))button.click();};
        item.open=reading.expanded.has(id);item.addEventListener('toggle',unfold);unfold();
      }else{heading.append(title,date);item.append(heading);}
      content.append(row);
    }
    if(!content.childElementCount){const empty=document.createElement('p');empty.className='journal-empty';empty.textContent=filter==='all'?'Object surveys and voyage actions will appear here.':'No '+LOG_FILTERS.find(([value])=>value===filter)[1].toLowerCase()+' recorded yet.';content.append(empty);}
    content.removeAttribute('aria-busy');newer.disabled=reading.page===0;older.disabled=(reading.page+1)*LOG_PAGE_SIZE>=total;
    pageLabel.textContent=total?`${reading.page*LOG_PAGE_SIZE+1}–${Math.min((reading.page+1)*LOG_PAGE_SIZE,total)} / ${total}`:'0 entries';
    requestAnimationFrame(()=>{if(token===renderSerial)content.scrollTop=reading.scroll;});
  }
  function objectData(text){
    const record=document.createElement('pre');record.className='journal-object-data';
    for(const [index,line]of String(text).split('\n').entries()){
      if(index)record.append(document.createTextNode('\n'));
      const colon=line.indexOf(' : '),row=document.createElement('span');row.className=index===0?'journal-data-title':'journal-data-line';
      if(colon>=0){const label=document.createElement('span');label.className='journal-data-key';label.textContent=line.slice(0,colon+3);row.append(label,document.createTextNode(line.slice(colon+3)));}
      else row.textContent=line;
      record.append(row);
    }return record;
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
    pauseTerminalOutput();state.journalOpen=true;state.terminalExpanded=false;setTerminalKeyboard(false);$('terminalInput').blur();
    document.body.classList.add('journal-open');$('app').inert=true;$('targetCard').inert=true;
    $('journalButton').setAttribute('aria-expanded','true');overlay.hidden=false;applySize();render();updateUI();
    $('journalClose').focus({preventScroll:true});if(!reduced())animate(true);
  }
  function close(immediate=false){
    if(!state.journalOpen&&overlay.hidden)return;
    remember();renderSerial++;
    const token=++serial;closing=true;
    const finish=()=>{
      if(token!==serial)return;
      closing=false;state.journalOpen=false;overlay.hidden=true;document.body.classList.remove('journal-open');$('app').inert=Boolean(state.landscapeBlocked||state.saveConflict);$('targetCard').inert=false;
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
  window.addEventListener('resize',()=>{if(state.journalOpen){if(closing){close(true);return;}applySize();for(const a of panel.getAnimations())a.cancel();origin();}});
  return {open,close,applySize};
}
