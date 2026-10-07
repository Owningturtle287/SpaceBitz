import {createMusicController} from './audio.js';
import {CHANGELOG} from './changelog.js';
import {TAU, DAY_MS, EPOCH, currentDays, advanceDays, rotationAngle, clamp, hash, rng, orbitRadius, visualRadius,
  habitableZone, makeSystem, bodyPosition, galaxyStars, starName, starAppearance, orbitPoint, orbitalElements,stellarPositions,orbitCenter} from './model.js';
import {defaults,POPULATIONS,validateGeneration,checkedGeneration,percentUnits} from './universe.js';
import {createTerminalDevice} from './terminal-device.js';
import {isCoordinateDoubleTap} from './target-ui.js';
import {rarityPages} from './rarity-ui.js';
import {paintBrownAtmosphere,paintBrownGlow,paintCompact} from './substellar.js';
import {chartStyle,paintHomeMarker,paintPixelFrame} from './presentation.js';
import {DEFAULT_SETTINGS,normalizeSettings} from './settings.js';
import {TerrainRenderer} from './terrain.js';
import {paintShip,paintAstronaut} from './sprites.js';
import {updateMotion,navigationTarget} from './motion.js';
import {celestialSprite} from './celestial.js';
import {ringSprites,paintRings} from './giants.js';
import {paintGiantAtmosphere} from './weather.js';
import {paintStellarSurface,chartBrightness} from './stellar.js';
import {canvasContextOptions,clearFrame,backgroundPosition,strokeEllipse,circleGeometry,fillAnnulus,fillDisk,drawImageInView,lineInView} from './rendering.js';
import {SURFACE_UNIT,CHART_UNIT,LANDER_SIZE,sceneUnit,gridCell,gridStride,formatDistance,formatCoordinates,formatDiameter,SYSTEM_VISUAL_SCALE,SYSTEM_SHIP_SIZE,SYSTEM_MAX_ZOOM,SHIP_FOCUS_ZOOM} from './scale.js';
import {migrateLayout,systemFitZoom,systemMinZoom,travelSpeed,centerZoomAt,cameraViewAt,starApproachPoint,manualSpeed,outermostPlanet,systemDrive,advanceToArrival} from './navigation.js';

import {importVoyage,restoreVoyage} from './saves.js';
import {readVoyages,writeVoyages,persistVoyage,deleteVoyage,saveBeforeExit} from './voyage-storage.js';
import {bodyLabel,bodyCounts} from './body-classification.js';
import {collectSample} from './exploration.js';
import {registerAppWorker} from './pwa.js';
import {FLIGHT_STAGES,flightStage,isLandscape} from './flight-drive.js';
import {placeControls,paintLocator} from './hud.js';

const $ = id => document.getElementById(id);
const canvas = $('sky');
const ctx = canvas.getContext('2d', canvasContextOptions(navigator.userAgent));
const SETTINGS_KEY = 'spacebitz:field:settings';
const GENERATION_KEY='spacebitz:universe:v3';
let universePreset=defaults(true),customPreset=defaults(false);
try{const stored=readJSON(GENERATION_KEY,null);if(stored){customPreset=checkedGeneration({...stored,scientific:false});universePreset=stored.scientific?defaults(true):customPreset;}}catch{}
const settings = normalizeSettings({
  reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  ...readJSON(SETTINGS_KEY,{})});
const terrain=new TerrainRenderer();
const musicAudio=$('soundtrackAudio');
const music=createMusicController(musicAudio,settings,document);
const {beginMusic,stopMusic,applyMusicSetting}=music;
beginMusic();


const state = {save:null, system:null, scene:'menu', selected:null, camera:{x:0,y:0}, zoom:1,
  panUntil:0, centerZoom:null, centerReady:false, followShip:false, followPanRemaining:0, autopilot:null, keys:new Set(), joy:{x:0,y:0}, stars:[], width:0,height:0,dpr:1,
  last:performance.now(), lastUI:0, elapsed:0, fps:60,
  waypoint:null,coordinateTap:null,warpUntil:0,stellarSeconds:0,focusBody:null,shipMotion:{heading:-Math.PI/2,thrust:0},actorMotion:{direction:'down',steps:0},followBody:null};
const {showDetails,toggleTerminal,buildTerminal,setTerminalKeyboard,appendTerminalEntry,applyTerminalSize,scheduleTerminalLayout,layoutTerminalDock,layoutDashboard,onDashboard,focusSelected,updateTerminal,positionContext}=createTerminalDevice({state,settings,$,chartSystem,select,updateUI,closeSystemChart,resetInput,saveSettings,applyCenterButtonLayout,screen:(x,y)=>screen(x,y)});
const loadSaves = () => {
  try{return readVoyages(localStorage).filter(s=>s&&typeof s.id==='string'&&typeof s.seed==='string');}
  catch(error){notify(error.message);return [];}
};
function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{notify('Settings could not be saved on this device.');}}
let centerDrag=null,centerSuppressClick=false;
function applyCenterButtonLayout(){
  const btn=$('homeButton'),group=$('navigationControls');if(!btn||!group)return;
  const mode=settings.centerButton||'right';
  btn.hidden=mode==='hidden';$('followShipButton').hidden=btn.hidden;btn.dataset.centerPosition=mode;
  btn.classList.toggle('center-custom',mode==='custom');
  requestAnimationFrame(()=>{
    layoutDashboard();
    const bw=btn.hidden?0:btn.offsetWidth,bh=group.offsetHeight||52,width=group.offsetWidth||118;
    const joyRect=$('joystick').getBoundingClientRect(),deck=$('dashboardBase').getBoundingClientRect();
    const row=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dashboard-row-height'));
    const safe=deck.height-parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dashboard-height'));
    let left=joyRect.width?joyRect.right+8:12;
    let top=innerHeight-safe-row/2-bh/2;
    if(mode==='above'){left=Math.max(6,joyRect.left+(joyRect.width-width)/2);top=joyRect.top-bh-8;}
    if(mode==='custom'){
      const desired={x:innerWidth*settings.centerX/100-bw/2,y:innerHeight*settings.centerY/100-bh/2};
      const obstacles=['joystick','terminalPocket','systemChart','systemFit','flightReadout','settingsOpen','journalButton','terminalButton','mapButton'].map($).filter(el=>el&&!el.hidden).map(el=>{const r=el.getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height};});
      const placed=placeControls(desired,{width,height:bh},{width:innerWidth,height:innerHeight},[...obstacles,{x:0,y:0,width:innerWidth,height:deck.top-4}]);left=placed.x;top=clamp(placed.y,deck.top+4,innerHeight-safe-bh-4);
    }
    group.style.left=left+'px';group.style.top=top+'px';
  });
}
function applySettings(){
  document.body.dataset.controls=settings.controls;
  document.body.dataset.reducedMotion=String(settings.reducedMotion);
  document.documentElement.style.setProperty('--joy-x',settings.joyX+'%');
  document.documentElement.style.setProperty('--joy-offset',settings.joyOffset+'px');
  musicAudio.volume=settings.volume;
  if(!settings.music)stopMusic();
  fit();updateUI();applyCenterButtonLayout();
}
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
let lastSingleTouchEnd=0;
document.addEventListener('touchend',e=>{
  if(e.touches.length||e.changedTouches.length!==1)return;
  // These controls disable double-tap zoom with touch-action; every key must click.
  if(e.target.closest?.('#terminalKeyboard, #terminalInputBar')){lastSingleTouchEnd=0;return;}
  const now=performance.now();
  if(now-lastSingleTouchEnd<320)e.preventDefault();
  lastSingleTouchEnd=now;
},{passive:false});
function persist() {
  if (!state.save) return true;
  try {persistVoyage(localStorage,state.save);persist.failedAt=0;return true;}
  catch(error) {
    if(!persist.failedAt||Date.now()-persist.failedAt>15000){notify(error.name==='QuotaExceededError'?'Storage is full. Voyage kept open; export it or free storage before leaving.':error.message);persist.failedAt=Date.now();}
    return false;
  }
}
function notify(message){appendTerminalEntry(message);}
function allBodies() { return state.system?.planets.flatMap(p=>[p,...p.moons]) || []; }
function systemStars(){return state.system?.stars||(state.system?[state.system.star]:[]);}
function findBody(id) { return [...allBodies(),...systemStars()].find(p=>p.id===id); }
function currentStar() { return starAt(state.save?.currentSystem || state.save?.homeSeed); }
function starAt(seed) {
  if (seed === state.save?.homeSeed) return {id:'origin',seed,x:0,y:0};
  const match = /:g(-?\d+),(-?\d+):\d+$/.exec(seed || '');
  if (!match) return {id:'origin',seed:state.save.homeSeed,x:0,y:0};
  return galaxyStars(state.save.seed, Number(match[1]), Number(match[2])).find(s=>s.seed===seed)
    || {id:'origin',seed:state.save.homeSeed,x:0,y:0};
}
function nearbyStars() {
  const x = state.camera.x, y = state.camera.y, span = Math.max(state.width,state.height)/state.zoom/2 + 400;
  const stars = [{id:'origin',seed:state.save.homeSeed,x:0,y:0}];
  for(let cy=Math.floor((y-span)/330);cy<=Math.floor((y+span)/330);cy++)
    for(let cx=Math.floor((x-span)/330);cx<=Math.floor((x+span)/330);cx++)
      stars.push(...galaxyStars(state.save.seed,cx,cy));
  return stars;
}
const STAR_PALETTE=[
  '255,78,78',
  '255,207,63',
  '255,139,52',
  '248,250,255',
  '94,174,255',
  '105,220,255'
];
const skyRandom=(()=>{
  const pool=new Uint32Array(256);let index=pool.length;
  return ()=>{
    if(index>=pool.length){
      if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(pool);
      else for(let i=0;i<pool.length;i++)pool[i]=Math.floor(Math.random()*0x100000000);
      index=0;
    }
    return pool[index++]/0x100000000;
  };
})();
function makeBackgroundStar(){
  const r=skyRandom;
  return {
    x:r(),y:r(),size:r()<.66?1:2,alpha:.38+r()*.58,phase:r()*TAU,depth:r(),speed:.4+r(),
    rgb:STAR_PALETTE[Math.floor(r()*STAR_PALETTE.length)],shape:Math.floor(r()*3)
  };
}
function requestLandscape(){
  const orientation=globalThis.screen?.orientation;
  if(!orientation)return Promise.resolve(false);
  try{
    if(typeof orientation.lock!=='function')return Promise.resolve(false);
    return Promise.resolve(orientation.lock('landscape')).then(()=>true).catch(()=>false);
  }catch{return Promise.resolve(false);}
}
function fit() {
  const rect = canvas.getBoundingClientRect();
  if(rect.width!==state.width||rect.height!==state.height)state.terminalSize=null;
  state.width=rect.width; state.height=rect.height;
  const blocked=!isLandscape(rect.width,rect.height);
  if(blocked&&!state.landscapeBlocked)queueMicrotask(resetInput);
  state.landscapeBlocked=blocked;$('landscapeGate').hidden=!blocked;
  for(const id of ['app','welcome','modal'])$(id).inert=blocked;
  state.dpr=settings.resolution==='auto'?Math.min(window.devicePixelRatio||1,2):Number(settings.resolution);
  canvas.width=Math.round(rect.width*state.dpr); canvas.height=Math.round(rect.height*state.dpr);
  ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
  const targetStarCount=Math.max(110,Math.min(400,Math.round(rect.width*rect.height/2600)));
  if(!state.stars.length)state.stars=Array.from({length:targetStarCount},makeBackgroundStar);
  else if(state.stars.length<targetStarCount)state.stars.push(...Array.from({length:targetStarCount-state.stars.length},makeBackgroundStar));
  else if(state.stars.length>targetStarCount)state.stars.length=targetStarCount;
}
window.addEventListener('resize',()=>{fit();applyTerminalSize();scheduleTerminalLayout();applyCenterButtonLayout();});
window.addEventListener('orientationchange',()=>setTimeout(()=>{fit();updateUI();applyCenterButtonLayout();},120),{passive:true});
globalThis.screen?.orientation?.addEventListener?.('change',()=>setTimeout(()=>{fit();updateUI();applyCenterButtonLayout();},80));
applySettings();
function start(save) {
  try{save=restoreVoyage(save);}catch(error){notify(error.message+' The stored voyage has not been changed.');return;}
  state.save=save; state.scene=save.scene || 'system';state.terminalNotice=null;state.terminalEntries.length=0;
  if(save.generation)save.generation=checkedGeneration(save.generation);
  state.system=makeSystem(save.currentSystem || save.homeSeed,save.generation);
  terrain.clear();state.sampleBody=null;state.samples=null;state.listKey=null;
  save.currentSystem=state.system.seed;
  save.chart ||= {x:0,y:0}; save.ship ||= {x:0,y:0};
  save.surface ||= {x:0,y:0}; save.discoveries ||= []; save.log ||= [];
  save.days=Number.isFinite(save.days)?save.days:currentDays();
  if(settings.timeMode==='realtime')save.days=currentDays();
  migrateLayout(save,state.system);save.route||=[];
  if(state.scene==='surface' && !findBody(save.landed)?.solid){state.scene='system';save.scene='system';save.landed=null;}
  state.coordinateTap=null;state.terminal=null;state.terminalExpanded=false;state.selected=null;state.waypoint=null;state.warpUntil=0;state.focusBody=null;state.centerZoom=null;state.centerReady=false;state.followShip=false;state.followPanRemaining=0; state.autopilot=null;state.followBody=null;state.panUntil=0;
  state.shipMotion={heading:-Math.PI/2,thrust:0};state.actorMotion={direction:'down',steps:0};
  state.zoom=state.scene==='chart'?1:state.scene==='surface'?1.3:.85;
  if(state.scene==='chart') state.camera={...save.chart};
  else if(state.scene==='surface') state.camera={...save.surface};
  else state.camera={...save.ship};
  $('welcome').classList.remove('visible'); $('app').hidden=false;
  requestLandscape();
  applyCenterButtonLayout();
  keepStationNearShip();persist(); updateUI();
}
function create(sol=false) {
  const name=$('universeName').value.trim().slice(0,40) || 'My Universe';
  const seed=($('universeSeed').value.trim() || (crypto.randomUUID?.() || Math.random().toString(36).slice(2))).slice(0,64);
  const homeSeed=sol?'sol':'home:'+seed;
  const generation=checkedGeneration(universePreset),system=makeSystem(homeSeed,generation);
  const home=sol?system.planets[2]:system.planets.find(p=>p.solid&&p.type==='temperate') || system.planets.find(p=>p.solid) || system.planets.flatMap(p=>p.moons).find(m=>m.solid);
  const startDays=currentDays(),h=home?bodyPosition(home,startDays,system):bodyPosition(system.star,startDays,system);
  const offset=visualRadius(home?.diameter||system.star.diameter)+150;
  const save={id:crypto.randomUUID?.()||String(Date.now()),name,seed,homeSeed,currentSystem:homeSeed,
    scene:home?'surface':'system',ship:{x:h.x+offset,y:h.y},chart:{x:0,y:0},generation,
    surface:{x:50,y:35},landed:home?.id||null,homePlanet:home?.id||null,days:startDays,discoveries:home?[home.id]:[],log:[{name:home?.name||system.name,action:home?'Home planet · voyage started':'Stellar survey started',days:startDays}],layoutVersion:4,updated:Date.now()};
  start(save);notify(home?`${home.name} · your home planet`:`${system.name} · no landable home world; stellar survey started`);
}
function renderSaves() {
  const list=$('savedGames'); list.replaceChildren(); const saves=loadSaves();
  if(!saves.length){const el=document.createElement('div');el.className='empty-saves';el.textContent='No voyages saved yet.';list.append(el);return;}
  for(const save of saves){
    const row=document.createElement('div');row.className='save-row';
    const play=document.createElement('button');play.className='load-save';
    play.textContent=save.name || 'Unnamed Universe';play.title='Continue '+play.textContent+(save.generation?' · '+(save.generation.scientific?'Scientific':'Custom')+' stellar universe':' · Legacy generation preserved; create a new voyage for v1.12 stars');
    play.onclick=()=>start(save);
    const date=document.createElement('small');date.textContent=new Date(save.updated||Date.now()).toLocaleDateString();
    const del=document.createElement('button');del.className='delete-save';del.textContent='✕';del.setAttribute('aria-label','Delete '+play.textContent);
    del.onclick=()=>{if(!confirm(`Delete “${save.name}” from this device?`))return;
      try{deleteVoyage(localStorage,save.id);renderSaves();}catch{notify('The voyage could not be deleted. Your stored data is unchanged.');}};
    row.append(play,date,del);list.append(row);
  }
}
function showMenuStage(stage='main'){
  const mainStage=$('mainMenuStage'),generationStage=$('universeMenuStage');
  const generation=stage==='generation';
  mainStage.hidden=generation;generationStage.hidden=!generation;
  if(generation){renderSaves();setTimeout(()=>$('universeName')?.focus(),0);}
  else setTimeout(()=>$('startGame')?.focus(),0);
}
renderSaves();
$('startGame').onclick=()=>showMenuStage('generation');
$('backToMain').onclick=()=>showMenuStage('main');
$('multiplayerGame').onclick=()=>notify('Multiplayer is coming in a future update.');
function updateUniverseMode(){
  $('scientificMode').checked=universePreset.scientific;
  $('generationOptions').hidden=universePreset.scientific;
  $('customUniverseWarning').hidden=universePreset.scientific;
}
$('scientificMode').onchange=()=>{
  universePreset=$('scientificMode').checked?defaults(true):checkedGeneration({...customPreset,scientific:false});
  try{localStorage.setItem(GENERATION_KEY,JSON.stringify({...customPreset,scientific:universePreset.scientific}));}catch{notify('Could not save generation preset.');}
  updateUniverseMode();
};
$('generationOptions').onclick=showGenerationOptions;
updateUniverseMode();
function fitRarities(container,page){
  const rows=[...container.children];for(const row of rows)row.hidden=false;
  const pages=rarityPages(rows.map(row=>row.getBoundingClientRect().height),container.clientHeight||Infinity,parseFloat(getComputedStyle(container).rowGap)||0);
  const active=rows.findIndex(row=>row.contains(document.activeElement));
  page=active<0?Math.min(page,pages.length-1):pages.findIndex(([start,end])=>active>=start&&active<end);
  page=Math.max(0,page);const [start,end]=pages[page]||[0,0];rows.forEach((row,index)=>row.hidden=index<start||index>=end);container.scrollTop=0;
  return {page,count:pages.length};
}
let scientificPage=0;
function layoutScientificValues(){
  const result=fitRarities($('scientificValues'),scientificPage);scientificPage=result.page;
  $('scientificPages').hidden=false;$('scientificPages').classList.toggle('single-page',result.count<=1);
  $('scientificPage').textContent=`${scientificPage+1} / ${result.count||1}`;$('scientificPrev').disabled=scientificPage===0;$('scientificNext').disabled=scientificPage>=result.count-1;
}
function renderScientificValues(){
  scientificPage=0;
  const key=$('scientificPool').value||'family',pool=defaults().pools[key];$('scientificValues').replaceChildren();
  for(const [id,label]of POPULATIONS[key].entries){const row=document.createElement('div');row.className='scientific-value';const name=document.createElement('span'),value=document.createElement('strong');name.textContent=label;name.title=label;value.textContent=pool[id].toFixed(6)+'%';row.append(name,value);$('scientificValues').append(row);}
  layoutScientificValues();
}
for(const [key,group]of Object.entries(POPULATIONS)){const option=document.createElement('option');option.value=key;option.textContent=group.label;$('scientificPool').append(option);}
$('scientificPool').value='family';$('scientificPool').onchange=renderScientificValues;renderScientificValues();
new ResizeObserver(layoutScientificValues).observe($('scientificValues'));
$('scientificDefaults').addEventListener('toggle',layoutScientificValues);
$('scientificPrev').onclick=()=>{scientificPage--;layoutScientificValues();};$('scientificNext').onclick=()=>{scientificPage++;layoutScientificValues();};
let generationObserver;
function showGenerationOptions(){
  if(universePreset.scientific)return;
  const box=$('generationEditor');box.replaceChildren();box.hidden=false;$('generationFields').hidden=true;
  const draft=structuredClone(customPreset);draft.scientific=false;
  const category=document.createElement('select');category.setAttribute('aria-label','Custom percentage category');
  for(const [key,group]of Object.entries(POPULATIONS)){const option=document.createElement('option');option.value=key;option.textContent=group.label;category.append(option);}
  category.value='family';const rows=document.createElement('div'),total=document.createElement('output'),error=document.createElement('p'),pages=document.createElement('div'),actions=document.createElement('div');
  rows.id='rarityInputs';total.className='rarity-total';total.setAttribute('aria-live','polite');error.className='generation-error';pages.className='editor-pages';actions.className='editor-actions';
  const prev=document.createElement('button'),next=document.createElement('button'),pageLabel=document.createElement('span');prev.textContent='←';next.textContent='→';prev.setAttribute('aria-label','Previous rarity entries');next.setAttribute('aria-label','Next rarity entries');prev.className=next.className='button subtle';pages.append(prev,pageLabel,next);
  const apply=document.createElement('button'),restore=document.createElement('button'),cancel=document.createElement('button');apply.id='applyGeneration';apply.textContent='APPLY';restore.textContent='RESTORE SCIENTIFIC DEFAULTS';cancel.textContent='CANCEL';apply.className='button primary';restore.className=cancel.className='button subtle';actions.append(apply,restore,cancel);
  generationObserver?.disconnect();box.append(category,rows,pages,total,error,actions);let page=0;
  function validate(){
    const key=category.value,values=POPULATIONS[key].entries.map(([id])=>percentUnits(draft.pools[key][id])),sum=values.includes(null)?null:values.reduce((a,b)=>a+b,0)/1e6;
    total.textContent=sum===null?'TOTAL: INVALID':`TOTAL: ${sum.toFixed(6)}% / 100%`;total.classList.toggle('invalid',sum!==100);
    const errors=validateGeneration(draft);apply.disabled=errors.length>0;error.textContent=errors[0]||'Every table totals exactly 100%.';
  }
  function render(){
    const key=category.value;rows.replaceChildren();
    for(const [id,label]of POPULATIONS[key].entries){const row=document.createElement('label');row.className='rarity-row';const name=document.createElement('span'),input=document.createElement('input'),unit=document.createElement('span');name.textContent=label;name.title=label;input.type='text';input.inputMode='decimal';input.maxLength=12;input.value=String(draft.pools[key][id]);input.dataset.pool=key;input.dataset.type=id;input.setAttribute('aria-label',label+' percentage');unit.textContent='%';input.oninput=()=>{draft.pools[key][id]=input.value;input.setAttribute('aria-invalid',String(percentUnits(input.value)===null));validate();};row.append(name,input,unit);rows.append(row);}
    validate();layout();
  }
  function layout(){const result=fitRarities(rows,page);page=result.page;pageLabel.textContent=`${page+1} / ${result.count||1}`;prev.disabled=page===0;next.disabled=page>=result.count-1;pages.classList.toggle('single-page',result.count<=1);}
  category.onchange=()=>{page=0;render();};prev.onclick=()=>{page--;layout();};next.onclick=()=>{page++;layout();};
  generationObserver=new ResizeObserver(layout);generationObserver.observe(rows);
  const close=()=>{generationObserver.disconnect();box.hidden=true;$('generationFields').hidden=false;};
  cancel.onclick=close;restore.onclick=()=>{Object.assign(draft,defaults(false));draft.pools=structuredClone(defaults(true).pools);render();};
  apply.onclick=()=>{if(validateGeneration(draft).length)return;customPreset=checkedGeneration(draft);universePreset=structuredClone(customPreset);try{localStorage.setItem(GENERATION_KEY,JSON.stringify(customPreset));}catch{notify('Could not save generation preset.');}close();updateUniverseMode();};render();
}
$('newGame').onclick=()=>create(false); $('solGame').onclick=()=>create(true);
$('importButton').onclick=()=>$('importFile').click();
$('importFile').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    if(file.size>2_000_000)throw Error('Save file is too large.');
    const value=JSON.parse(await file.text());
    const source=Array.isArray(value)?value:(Array.isArray(value.saves)?value.saves:[value]);
    const converted=source.map(raw=>importVoyage(raw,crypto.randomUUID?.()||String(Date.now()+Math.random())));
    if(!converted.length)throw Error('No voyages found.');
    writeVoyages(localStorage,converted);
    renderSaves();notify(`Imported ${converted.length} voyage${converted.length===1?'':'s'}.`);
  }catch(error){notify(error.message||'Could not import this save.');}
  e.target.value='';
};
let installPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installButton').hidden=false;});
$('installButton').onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installButton').hidden=true;}};
let applyPendingUpdate=()=>{};
if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>{
  applyPendingUpdate=registerAppWorker({serviceWorker:navigator.serviceWorker,isSafe:()=>!state.save,reload:()=>location.reload(),onReady:()=>notify('Update ready. It will apply after Save & Main Menu.')});
});

function beginSelection(){
  closeSystemChart();state.terminalNotice=null;state.coordinateTap=null;state.contextPlacement=null;
  const row=$('travelControls').querySelector('.context-action-row');row.style.transition='none';
  $('travelControls').classList.remove('ready');$('travelControls').hidden=false;
  $('contextActions').classList.remove('ready');
  $('contextActions').hidden=false;
  // Commit the starting pose now; the action strip animates on this same tap.
  void row.offsetHeight;row.style.transition='';
  $('contextActions').classList.add('ready');$('travelControls').classList.add('ready');
}
function select(object) { beginSelection();state.terminalNotice=null;state.terminal=null;state.terminalExpanded=false;state.waypoint=null;state.selected=object; state.autopilot=null;updateUI(); }
function keepStationNearShip(){
  if(state.scene!=='system')return;
  const ship=state.save.ship;
  const near=allBodies().map(body=>{const p=bodyPosition(body,state.save.days,state.system);return {body,p,d:Math.hypot(ship.x-p.x,ship.y-p.y)};})
    .filter(v=>v.d<visualRadius(v.body.diameter)+100*SYSTEM_VISUAL_SCALE).sort((a,b)=>a.d-b.d)[0];
  if(near)state.followBody={id:near.body.id,x:ship.x-near.p.x,y:ship.y-near.p.y};
}
function markDiscovery(body) {
  if(state.save.discoveries.includes(body.id)) return;
  state.save.discoveries.push(body.id);
  state.save.log.unshift({name:body.name,action:'First landing',days:state.save.days});
  notify(`First landing on ${body.name} · added to logbook`);persist();
}
function enterChart() {state.coordinateTap=null;state.terminal=null;state.terminalExpanded=false;state.followPanRemaining=0;
  state.waypoint=null;state.focusBody=null;state.centerZoom=null;state.centerReady=false;state.panUntil=0;
  state.followBody=null;state.shipMotion.thrust=0;
  const star=currentStar();state.scene='chart';state.selected=star;
  state.save.scene='chart';state.save.chart={x:star.x+38,y:star.y+30};
  state.camera={...state.save.chart};state.zoom=1;state.autopilot=null;persist();updateUI();
}
function enterSystem(star) {state.coordinateTap=null;state.terminal=null;state.terminalExpanded=false;state.followPanRemaining=0;
  state.waypoint=null;state.focusBody=null;state.centerZoom=null;state.centerReady=false;state.panUntil=0;
  state.followBody=null;state.shipMotion.thrust=0;
  state.system=makeSystem(star.seed,state.save.generation);state.save.currentSystem=star.seed;
  state.scene='system';state.save.scene='system';state.selected=null;
  const outer=outermostPlanet(state.system,state.save.days)||state.system.star,pos=bodyPosition(outer,state.save.days,state.system);
  const offset=visualRadius(outer.diameter)+60;
  state.save.ship={x:pos.x+offset,y:pos.y};state.camera={...state.save.ship};
  state.selected=outer;state.followBody={id:outer.id,x:offset,y:0};
  state.zoom=.85;state.autopilot=null;state.save.chart={x:star.x,y:star.y};
  state.save.log.unshift({name:state.system.name,action:'Entered system',days:state.save.days});
  if(state.save.route.at(-1)!==star.seed)state.save.route.push(star.seed);
  state.save.route=state.save.route.slice(-40);
  notify(`${state.system.name} · arriving at ${outer.name}`);persist();updateUI();
}
function enterSurface(body) {state.coordinateTap=null;state.terminal=null;state.terminalExpanded=false;state.followPanRemaining=0;
  state.waypoint=null;state.focusBody=null;state.centerZoom=null;state.centerReady=false;state.panUntil=0;
  if(!body.solid){notify('No solid surface here. Explore one of its moons.');return;}
  state.followBody=null;state.actorMotion={direction:'down',steps:0};
  state.selected=null;state.scene='surface';state.save.scene='surface';state.save.landed=body.id;
  state.save.surface={x:50,y:35};state.camera={...state.save.surface};state.zoom=1.3;
  state.autopilot=null;markDiscovery(body);persist();updateUI();
}
function launch() {state.coordinateTap=null;state.terminal=null;state.terminalExpanded=false;state.followPanRemaining=0;
  state.waypoint=null;state.focusBody=null;state.centerZoom=null;state.centerReady=false;state.panUntil=0;
  state.shipMotion={heading:-Math.PI/2,thrust:0};state.followBody=null;
  const body=findBody(state.save.landed);
  if(body){const p=bodyPosition(body,state.save.days,state.system);
    state.save.ship={x:p.x+visualRadius(body.diameter,body.kind)+44,y:p.y+12};}
  state.scene='system';state.save.scene='system';state.save.landed=null;
  state.camera={...state.save.ship};state.selected=body||null;state.zoom=.95;
  keepStationNearShip();notify('Launch complete. The stars are yours.');persist();updateUI();
}
function surfaceSamples() {
  const body=findBody(state.save.landed);const r=rng('samples:'+body?.id);
  if(state.sampleBody===body.id)return state.samples;
  const sample=terrain.sampler(body),items=[];
  for(let i=0;i<12;i++){
    let x,y;
    for(let attempt=0;attempt<40;attempt++){x=(r()-.5)*1450;y=(r()-.5)*1450;if(!sample(x,y).water)break;}
    items.push({id:`${body.id}:sample${i}`,x,y});
  }
  state.sampleBody=body.id;state.samples=items;return items;
}
function nearestSample() {
  if(state.scene!=='surface')return null;
  return surfaceSamples().filter(s=>!state.save.discoveries.includes(s.id))
    .sort((a,b)=>Math.hypot(a.x-state.save.surface.x,a.y-state.save.surface.y)-Math.hypot(b.x-state.save.surface.x,b.y-state.save.surface.y))[0]||null;
}
function primary() {
  if(!state.save||state.autopilot||state.warpUntil)return;
  state.centerZoom=null;state.centerReady=false;state.panUntil=Infinity;state.focusBody=null;
  if(state.waypoint){
    state.panUntil=0;state.followBody=null;
    state.autopilot={type:'waypoint',x:state.waypoint.x,y:state.waypoint.y};
    notify((state.scene==='system'?'Hyperdrive · ':'Course set · ')+formatCoordinates(state.waypoint,state.scene));updateUI();return;
  }
  if(state.scene==='surface'){
    const sample=state.selected?.kind==='sample'?state.selected:nearestSample();const d=sample?Math.hypot(sample.x-state.save.surface.x,sample.y-state.save.surface.y):Infinity;
    if(state.selected?.kind==='sample'&&d<SURFACE_UNIT){
      const collected=collectSample(state.save,sample,findBody(state.save.landed)?.name||'World');
      cancelTarget();if(collected){notify('Sample secured · added to logbook');persist();}updateUI();return;}
    if(state.selected?.kind!=='sample'&&Math.hypot(state.save.surface.x,state.save.surface.y)<62){launch();return;}
    state.autopilot={type:'surface',x:state.selected?.kind==='sample'?state.selected.x:0,y:state.selected?.kind==='sample'?state.selected.y:0};notify(state.selected?.kind==='sample'?'Course set to sample':'Returning to lander');updateUI();return;
  }
  if(state.scene==='system'){
    if(!state.selected){select(state.system.planets[0]||state.system.star);return;}
    if(state.selected.kind==='star'){
      const radius=visualRadius(state.selected.diameter),pos=bodyPosition(state.selected,state.save.days,state.system),local={x:state.save.ship.x-pos.x,y:state.save.ship.y-pos.y},goal=starApproachPoint(local,radius);
      state.panUntil=0;state.focusBody=null;state.followBody=null;
      state.autopilot={type:'stellar',id:state.selected.id,...goal};
      notify(`Hyperdrive to ${state.selected.name}`);updateUI();return;
    }
    const body=state.selected,pos=bodyPosition(body,state.save.days,state.system);
    const dist=Math.hypot(pos.x-state.save.ship.x,pos.y-state.save.ship.y);
    if(dist<visualRadius(body.diameter,body.kind)+48){enterSurface(body);return;}
    const drive=systemDrive(state.save.ship,body,state.system,state.save.days,state.followBody?.id);
    state.panUntil=0;state.followBody=null;
    state.autopilot={type:'body',id:body.id,drive};notify(`${drive==='orbit'?'Orbit Drive':'Hyperdrive'} to ${body.name}`);updateUI();return;
  }
  const star=state.selected;
  if(!star){select(currentStar());return;}
  const distance=Math.hypot(star.x-state.save.chart.x,star.y-state.save.chart.y);
  if(distance<38){enterSystem(star);return;}
  state.autopilot={type:'star',id:star.seed};notify(`Jump course set for ${starName(star.seed)}`);updateUI();
}
function cancelTravel(){state.coordinateTap=null;state.autopilot=null;state.warpUntil=0;state.waypoint=null;state.shipMotion.thrust=0;updateUI();}
function cancelTarget(){cancelTravel();state.terminalNotice=null;state.selected=null;state.terminal=null;state.terminalExpanded=false;updateUI();}
$('cancelTravel').onclick=cancelTarget;
$('primaryAction').onclick=primary;
$('secondaryAction').onclick=toggleTerminal;
$('terminalButton').onclick=toggleTerminal;
$('focusSelected').onclick=focusSelected;
function setFlightStage(value){
  if(!state.save||state.scene==='surface'||state.warpUntil||state.autopilot)return;
  const stage=Number(value);if(!Number.isInteger(stage)||!FLIGHT_STAGES[stage])return;
  if(stage<2){settings.flightMode=FLIGHT_STAGES[stage];saveSettings();}
  if(state.scene==='system'&&stage<2){notify((stage===0?'Orbit':'Hyperspace')+' free-flight speed selected');updateUI();return;}
  if(state.scene==='chart'&&stage===2)return;
  resetInput();state.autopilot=null;state.centerZoom=null;
  state.warpUntil=performance.now()+(settings.reducedMotion?120:650);
  notify(state.scene==='chart'?'Leaving Deep Space · entering local system':'Warp Drive engaged · entering Deep Space');
  updateUI();
}
$('flightSpeed').oninput=e=>setFlightStage(e.target.value);
$('systemFit').onclick=()=>{
  state.focusBody=null;state.centerZoom=null;state.centerReady=false;state.followShip=false;
  const to=systemFitZoom(state.system,state.width,state.height,state.save.days);
  if(settings.reducedMotion){state.zoom=to;state.camera={x:0,y:0};}
  else state.centerZoom={from:state.zoom,to,fromCamera:{...state.camera},elapsed:0,duration:2600,systemFit:true};

  state.panUntil=Infinity;$('systemChart').classList.remove('open');
  $('systemChartContent').hidden=true;$('systemChartToggle').setAttribute('aria-expanded','false');
};
$('homeButton').onclick=()=>{
  if(centerSuppressClick){centerSuppressClick=false;return;}
  if(!state.save||state.centerZoom?.centerAction)return;
  const zoomIn=state.centerReady,to=zoomIn?Math.max(state.zoom,state.scene==='system'?SHIP_FOCUS_ZOOM:2.4):state.zoom;
  state.panUntil=Infinity;state.focusBody=null;state.centerReady=false;state.followShip=false;state.followPanRemaining=0;
  const target=state.scene==='surface'?state.save.surface:state.scene==='chart'?state.save.chart:state.save.ship;
  if(settings.reducedMotion||(!zoomIn&&Math.hypot(target.x-state.camera.x,target.y-state.camera.y)*state.zoom<.5)){state.centerZoom=null;state.camera={...target};state.zoom=to;state.centerReady=!zoomIn;state.followShip=zoomIn;}
  else state.centerZoom={from:state.zoom,to,fromCamera:{...state.camera},elapsed:0,duration:1300,centerAction:zoomIn?'zoom':'pan'};
  updateUI();
};
$('followShipButton').onclick=()=>{
  if(!state.save)return;
  const following=state.followShip||state.centerZoom?.centerAction==='follow';
  state.centerZoom=null;state.centerReady=false;state.focusBody=null;state.panUntil=Infinity;state.followShip=false;state.followPanRemaining=0;
  if(!following){
    const target=state.scene==='surface'?state.save.surface:state.scene==='chart'?state.save.chart:state.save.ship;
    if(settings.reducedMotion){state.camera={...target};state.followShip=true;}
    else state.centerZoom={from:state.zoom,to:state.zoom,fromCamera:{...state.camera},elapsed:0,duration:1300,centerAction:'follow'};
  }
  updateUI();
};
$('homeButton').addEventListener('pointerdown',e=>{
  if(settings.centerButton!=='custom')return;
  centerDrag={id:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false};
  $('homeButton').setPointerCapture?.(e.pointerId);
  document.body.classList.add('center-editing');
  e.preventDefault();
});
$('homeButton').addEventListener('pointermove',e=>{
  if(!centerDrag||e.pointerId!==centerDrag.id)return;
  if(Math.hypot(e.clientX-centerDrag.startX,e.clientY-centerDrag.startY)>4)centerDrag.moved=true;
  settings.centerX=clamp(e.clientX/window.innerWidth*100,2,98);
  settings.centerY=clamp(e.clientY/window.innerHeight*100,2,98);
  applyCenterButtonLayout();
});
const finishCenterDrag=e=>{
  if(!centerDrag||e.pointerId!==centerDrag.id)return;
  if(centerDrag.moved){centerSuppressClick=true;saveSettings();notify('Center control position saved');}
  centerDrag=null;document.body.classList.remove('center-editing');
};
$('homeButton').addEventListener('pointerup',finishCenterDrag);
$('homeButton').addEventListener('pointercancel',finishCenterDrag);
$('journalButton').onclick=showJournal;
$('zoneToggle').onclick=()=>{settings.zone=!settings.zone;saveSettings();updateUI();};
function closeSystemChart(){
  $('systemChart').classList.remove('open');$('systemChartContent').hidden=true;$('systemChartToggle').setAttribute('aria-expanded','false');
}
$('systemChartToggle').onclick=()=>{
  if(state.scene==='surface'){select(findBody(state.save.landed));showDetails(state.selected);return;}
  const panel=$('systemChart'),content=$('systemChartContent'),open=!panel.classList.contains('open');
  if(open){state.terminalExpanded=false;state.terminal=null;$('terminalInput').blur();setTerminalKeyboard(false);}
  panel.classList.toggle('open',open);content.hidden=!open;
  $('systemChartToggle').setAttribute('aria-expanded',String(open));
  updateUI();
};
function zoom(factor){state.coordinateTap=null;const following=state.followShip||state.centerZoom?.centerAction==='follow';state.centerZoom=null;state.centerReady=false;state.followShip=following;state.zoom=clamp(state.zoom*factor,state.scene==='system'?systemMinZoom(state.system,state.width,state.height,state.save.days):state.scene==='surface'?.65:.34,state.scene==='system'?SYSTEM_MAX_ZOOM:2.4);if(following&&!state.followPanRemaining)state.camera={...(state.scene==='surface'?state.save.surface:state.scene==='chart'?state.save.chart:state.save.ship)};}

function diameterText(km){return formatDiameter(km);}
function localTimeZone(){return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}
function preferredTimeZone(){
  const zone=settings.timeZone==='local'?localTimeZone():settings.timeZone;
  try{new Intl.DateTimeFormat('en',{timeZone:zone}).format();return zone;}catch{return 'UTC';}
}
function gameDate(){return new Date(EPOCH+state.save.days*DAY_MS);}
function formatGameDate(date=gameDate(),dateOnly=false){
  const zone=preferredTimeZone();
  const day=date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:zone}).toUpperCase();
  if(dateOnly)return day;
  const time=date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:zone});
  return day+' '+time;
}
function updateUI() {
  if(!state.save)return;
  const scene=state.scene,sys=state.system,sel=state.selected;
  document.body.dataset.scene=scene;
  $('modeLabel').hidden=scene==='surface';
  $('modeLabel').textContent=scene==='chart'?'SECTOR / STAR CHART':'ORBITAL / SYSTEM';
  $('placeLabel').textContent=scene==='chart'?'Deep Space':scene==='surface'?findBody(state.save.landed)?.name||'Surface':sys.name;
  const {planets:planetCount,dwarfPlanets:dwarfCount}=bodyCounts(sys);
  $('hint').textContent=scene==='chart'?'Select a star, then engage Warp Drive.':scene==='surface'?'Double-tap a 1 m square, then use the green travel lever. Collect samples and return to your lander.':`${sys.star.type} STAR · ${planetCount} PLANETS${dwarfCount?` · ${dwarfCount} DWARF PLANET${dwarfCount===1?'':'S'}`:''}`;
  $('zoneLegend').hidden=scene!=='system';$('zoneToggle').textContent=settings.zone?'ON':'OFF';$('zoneToggle').setAttribute('aria-pressed',String(settings.zone));
  const list=$('bodyList'),listKey=`${scene}:${sys.seed}:${sel?.id||''}`;
  if(state.listKey!==listKey){
    const scroll=list.scrollLeft;list.replaceChildren();
    if(scene==='system')for(const body of [...systemStars(),...allBodies()]){
      const b=document.createElement('button');b.className='body-entry'+(body.kind==='moon'?' moon':'')+(sel?.id===body.id?' active':'');
      b.style.setProperty('--dot',body.color);b.innerHTML='<span class="body-dot"></span>';
      const name=document.createElement('span');name.textContent=body.name;const au=document.createElement('small');au.textContent=body.kind==='star'?'STAR':formatDistance(orbitalElements(body,state.save.days).a,'system');
      b.title=body.name+' · '+bodyLabel(body);b.setAttribute('aria-label',b.title);b.dataset.kind=body.kind;
      b.append(name,au);b.onclick=()=>{select(body);$('systemChart').classList.remove('open');$('systemChartContent').hidden=true;$('systemChartToggle').setAttribute('aria-expanded','false');};list.append(b);
    }
    list.scrollLeft=scroll;state.listKey=listKey;
  }
  $('bodyList').hidden=scene!=='system';$('systemFit').hidden=scene!=='system';
  let title='',action='SELECT',details=false;
  if(scene==='surface'){
    const body=findBody(state.save.landed);
    const landerNear=Math.hypot(state.save.surface.x,state.save.surface.y)<62;
    title=sel?.name||body?.name||'Surface';
    const sampleNear=sel?.kind==='sample'&&Math.hypot(sel.x-posSurface().x,sel.y-posSurface().y)<SURFACE_UNIT;
    action=sel?.kind==='sample'?(sampleNear?'COLLECT SAMPLE':'GO HERE'):landerNear?'LAUNCH':'RETURN';
  } else if(scene==='chart'){
    title=sel?starName(sel.seed):'';
    const distance=sel?Math.hypot(sel.x-state.save.chart.x,sel.y-state.save.chart.y):0;
    action=!sel?'SELECT STAR':distance<38?'ENTER SYSTEM':'WARP DRIVE';
    details=Boolean(sel);
  } else if(sel?.kind==='star'){
    const sp=bodyPosition(sel,state.save.days,sys);title=sel.name;action=state.autopilot?.type==='stellar'?'MOVING…':Math.hypot(state.save.ship.x-sp.x,state.save.ship.y-sp.y)<=visualRadius(sel.diameter)*1.08+151?'HOLDING':'TRAVEL';details=true;
  } else if(sel){
    title=sel.name;details=true;
    const p=bodyPosition(sel,state.save.days,sys),distance=Math.hypot(p.x-state.save.ship.x,p.y-state.save.ship.y);
    action=distance<visualRadius(sel.diameter,sel.kind)+48?(sel.solid?'LAND':'NO SOLID SURFACE'):'TRAVEL';
  }
  if(scene==='system'&&action==='TRAVEL')action=systemDrive(state.save.ship,sel,sys,state.save.days,state.followBody?.id)==='orbit'?'ORBIT DRIVE':'HYPERDRIVE';
  const pos=scene==='surface'?state.save.surface:scene==='chart'?state.save.chart:state.save.ship;
  let destination=scene==='surface'?(sel?.kind==='sample'?sel:{x:0,y:0}):scene==='chart'?sel:sel?bodyPosition(sel,state.save.days,sys):null;
  if(state.waypoint){title=scene==='surface'?'SURFACE SITE':'COORDINATE';action=state.autopilot?.type==='waypoint'?'MOVING…':'GO HERE';details=true;destination=state.waypoint;}
  const traveling=Boolean(state.autopilot||state.warpUntil);
  if(state.autopilot){
    action=scene==='system'?(state.autopilot.drive==='orbit'?'ORBIT DRIVE':'HYPERDRIVE'):'TRAVELING';destination=targetPoint();details=Boolean(sel)&&!state.waypoint;
    if(state.autopilot.type==='surface')title=sel?.kind==='sample'?sel.name:'LANDER';
  }
  if(state.warpUntil){title='WARP DRIVE';action='ENGAGING';destination=null;}
  $('cancelTravel').hidden=false;
  const hasTarget=Boolean(sel||state.waypoint||traveling);
  $('targetCard').hidden=$('systemChart').classList.contains('open')||(!hasTarget&&!state.terminalExpanded&&!state.terminalNotice);$('contextActions').hidden=!sel||Boolean(state.warpUntil);
  $('travelControls').hidden=!hasTarget||$('systemChart').classList.contains('open')||Boolean(state.warpUntil);
  $('targetName').textContent=title||'Ship Terminal';$('focusSelected').hidden=!sel&&!state.waypoint;
  $('targetStatus').textContent=state.waypoint?'Coordinate selected':scene==='chart'&&sel?.seed===state.save.homeSeed||scene==='system'&&sel?.kind==='star'&&state.save.currentSystem===state.save.homeSeed?'Home System':sel?.id===state.save.homePlanet?'Home World':traveling?'Course active':sel?.familyLabel||(sel?bodyLabel(sel):'Target selected');
  $('terminalScreen').hidden=!state.terminalExpanded;$('targetCard').classList.toggle('expanded',Boolean(state.terminalExpanded));
  $('terminalInputBar').hidden=!state.terminalExpanded;
  if(!hasTarget)$('targetStatus').textContent='Ready · '+(scene==='chart'?'Deep Space':scene==='surface'?'Surface':'System');
  if(!state.terminalExpanded&&state.terminalNotice)$('targetStatus').textContent=state.terminalNotice;
  if(!state.terminalExpanded){setTerminalKeyboard(false);if(document.activeElement===$('terminalInput'))$('terminalInput').blur();}
  if(state.terminalExpanded&&!state.terminal)buildTerminal();
  $('targetDistance').textContent=destination?(state.terminalExpanded&&state.waypoint?formatCoordinates(destination,scene)+' / ':'')+formatDistance(Math.hypot(destination.x-pos.x,destination.y-pos.y),scene)+(scene==='surface'&&sel?.kind==='lander'?' TO LANDER':' AWAY')+(scene==='system'&&state.autopilot?(state.autopilot.drive==='orbit'?' · 0.1 ls/s':' · 0.5 AU/s'):''):'';
  $('primaryActionLabel').textContent=action;$('primaryAction').classList.toggle('engaged',traveling);
  $('primaryAction').setAttribute('aria-busy',String(traveling));
  $('primaryAction').setAttribute('aria-label',action==='GO HERE'?'Go Here':action);
  $('contextName').textContent=title||'Target';$('contextActions').classList.toggle('coordinate',Boolean(state.waypoint));
  document.body.classList.toggle('terminal-visible',!$('targetCard').hidden);
  layoutTerminalDock();
  $('secondaryAction').hidden=false;$('secondaryAction').textContent=state.terminalExpanded?'Close Terminal':'Open Terminal';$('secondaryAction').setAttribute('aria-expanded',String(Boolean(state.terminalExpanded)));
  $('terminalButton').setAttribute('aria-expanded',String(Boolean(state.terminalExpanded)));$('terminalButton').setAttribute('aria-label',state.terminalExpanded?'Close Terminal':'Open Terminal');
  $('primaryAction').disabled=traveling||action==='NO SOLID SURFACE'||action==='HOLDING';
  const warp=$('mapButton');
  const wasHidden=warp.hidden;warp.hidden=scene==='surface';
  if(wasHidden!==warp.hidden)applyCenterButtonLayout();
  const stage=flightStage(scene,settings.flightMode,state.autopilot),engaged=state.warpUntil>0;
  const input=$('flightSpeed');input.value=stage;input.disabled=scene==='surface'||engaged||Boolean(state.autopilot);
  input.setAttribute('aria-valuetext',FLIGHT_STAGES[stage]==='hyper'?'Hyperspace':FLIGHT_STAGES[stage]==='warp'?'Warp Drive':'Orbit speed');
  warp.dataset.stage=stage;warp.setAttribute('aria-busy',String(engaged));
  $('flightSpeedLabel').textContent=(state.autopilot?'AUTO · ':'')+(engaged?'ENGAGING':stage===0?'ORBIT':stage===1?'HYPERSPACE':'WARP DRIVE');
  const centerLabel=(state.centerReady?'Zoom in on ':'Center on ')+(scene==='surface'?'explorer':'ship');
  $('homeButton').setAttribute('aria-label',centerLabel);$('homeButton').title=centerLabel;
  const following=state.followShip||state.centerZoom?.centerAction==='follow';
  $('followShipButton').setAttribute('aria-pressed',String(Boolean(following)));$('followShipButton').title=following?'Stop following ship':'Follow ship';$('followShipButton').setAttribute('aria-label',$('followShipButton').title);
  $('clock').textContent=formatGameDate();
  $('clock').title=(settings.timeMode==='realtime'?'Real-time 1:1':'Accelerated · 1 real minute = 1 game hour')+' · '+preferredTimeZone()+(settings.paused&&settings.timeMode!=='realtime'?' · paused':'');
  $('telemetry').hidden=!settings.showCoords&&!settings.showFPS;
  $('clock').hidden=!settings.showClock;
  $('coordsReadout').hidden=!settings.showCoords;$('coordsReadout').textContent=formatCoordinates(pos,scene);
  $('fpsReadout').hidden=!settings.showFPS;$('fpsReadout').textContent=`${Math.round(state.fps)} FPS`;
  const speedVisible=settings.showSpeed&&scene!=='surface';
  $('speedReadout').hidden=!speedVisible;$('speedReadout').textContent=(scene==='system'?(settings.flightMode==='hyper'?'HYPERSPACE':'ORBIT')+' · ':'')+formatDistance(manualSpeed(scene,settings.flightMode),scene)+'/s';
  $('telemetry').hidden=!settings.showCoords&&!settings.showFPS&&!speedVisible;
  $('flightReadout').hidden=!settings.showClock&&!settings.showCoords&&!settings.showFPS&&!speedVisible;
  applyCenterButtonLayout();
}
function setModal(eyebrow,title,content,opaque=false) {
  $('modal').querySelector('.modal-card').classList.toggle('opaque-panel',opaque);
  state.previousFocus=document.activeElement;resetInput();
  $('modalEyebrow').textContent=eyebrow;$('modalTitle').textContent=title;
  $('modalEyebrow').hidden=!eyebrow;
  $('modalContent').replaceChildren(content);$('modal').hidden=false;$('modal').classList.add('visible');
  $('modalClose').focus();
}
function closeModal(){$('modal').hidden=true;$('modal').classList.remove('visible');state.previousFocus?.focus();}
$('modalClose').onclick=closeModal;$('modal').onclick=e=>{if(e.target===$('modal'))closeModal();};
function posSurface(){return state.save.surface;}
function showJournal() {
  const box=document.createElement('div');const p=document.createElement('p');p.textContent=`${state.save.discoveries.length} discoveries recorded in ${state.save.name}.`;
  box.append(p);for(const entry of state.save.log.slice(0,30)){
    const item=document.createElement('div');item.className='log-item';item.textContent=`${entry.action} · ${entry.name}`;
    const date=document.createElement('small');date.textContent=formatGameDate(new Date(EPOCH+entry.days*DAY_MS),true);item.append(date);box.append(item);
  }if(!state.save.log.length){const empty=document.createElement('p');empty.textContent='Your discoveries will appear here.';box.append(empty);}
  setModal('CAPTAIN’S LOG','Voyage logbook',box,true);
}
function openSettings(){
  const box=document.createElement('div');box.className='settings-content settings-compact';
  const intro=document.createElement('p');intro.className='settings-intro';intro.textContent='Surface: 1 m per square. System: light-seconds (500 ls = 1 AU). Chart: light-years. Coordinates start at the lander, system star, or home system; +X is right and +Y is down.';box.append(intro);
  const heading=text=>{const h=document.createElement('h3');h.textContent=text;box.append(h);};
  function control(key,label,kind,options){
    const row=document.createElement('label');row.className='setting-row';
    const name=document.createElement('span');name.textContent=label;row.append(name);
    const input=document.createElement(kind==='select'?'select':'input');input.id='setting-'+key;
    if(kind==='select')for(const [value,label]of options){const opt=document.createElement('option');opt.value=value;opt.textContent=label;input.append(opt);}
    else input.type=kind;
    if(kind==='checkbox')input.checked=settings[key];
    else if(kind==='range'){input.min=options[0];input.max=options[1];input.step=options[2];input.value=settings[key];}
    else input.value=settings[key];
    const value=document.createElement('output');
    const sync=()=>{if(kind==='range')value.textContent=key==='volume'?Math.round(settings[key]*100)+'%':String(Math.round(settings[key]*100)/100);};sync();
    input.addEventListener(kind==='range'?'input':'change',()=>{
      settings[key]=kind==='checkbox'?input.checked:typeof DEFAULT_SETTINGS[key]==='number'?Number(input.value):input.value;
      if(key==='pixelSize')terrain.clear();
      if(key==='timeMode'&&state.save&&settings.timeMode==='realtime')state.save.days=currentDays();
      if(key==='terminalWidthScale'||key==='terminalHeightScale')state.terminalSize=null;
      sync();saveSettings();applySettings();
      if(key==='music'||key==='volume')applyMusicSetting();
      if(key==='centerButton'&&settings.centerButton==='custom')notify('Close Settings, then drag CENTER anywhere you want.');
    });
    const wrap=document.createElement('span');wrap.className='setting-value';wrap.append(input);if(kind==='range')wrap.append(value);row.append(wrap);box.append(row);
  }
  const zoneValues=(()=>{
    const local=localTimeZone(),all=typeof Intl.supportedValuesOf==='function'?Intl.supportedValuesOf('timeZone'):[];
    const values=[['local','Local device · '+local],['UTC','UTC']];
    for(const z of all)if(z!=='UTC'&&z!==local)values.push([z,z]);
    if(settings.timeZone!=='local'&&!values.some(([v])=>v===settings.timeZone))values.splice(1,0,[settings.timeZone,settings.timeZone]);
    return values;
  })();

  heading('Sound & sky');
  control('music','Soundtrack','checkbox');control('volume','Music volume','range',[0,1,.05]);
  control('starMotion','Moving stars','checkbox');control('twinkle','Star twinkle','checkbox');

  heading('Clock');
  control('timeMode','Clock speed','select',[['accelerated','Accelerated · 1 min = 1 hour'],['realtime','Real time · 1:1']]);
  control('timeZone','Time zone','select',zoneValues);

  control('paused','Pause accelerated clock','checkbox');

  heading('View');
  control('orbits','Orbit paths','checkbox');control('zone','Goldilocks zone','checkbox');
  control('labels','Body labels','checkbox');control('travelLines','Travel trail','checkbox');
  control('pixelSize','Terrain detail','select',[[2,'Fine · best'],[3,'Balanced'],[4,'Low power']]);
  control('resolution','Canvas quality','select',[['2','2× · best'],['auto','Automatic'],['1','1× · low power']]);
  control('showSpeed','Manual flight speed','checkbox');control('showClock','Date and time','checkbox');control('showFPS','Frame rate','checkbox');control('showCoords','Coordinates','checkbox');control('showGrid','Coordinate grid','checkbox');
  control('reducedMotion','Reduce motion','checkbox');

  heading('Controls');
  control('controls','Input mode','select',[['auto','Automatic'],['touch','Touch joystick'],['desktop','Keyboard / mouse']]);
  control('joyX','Joystick position (%)','range',[8,92,1]);control('joyOffset','Control row height offset (px)','range',[-70,120,1]);
  control('centerButton','Center button','select',[['right','Right of joystick'],['above','Above joystick'],['custom','Custom · drag in game'],['hidden','Hidden']]);
  control('cheats','Instant travel','checkbox');

  heading('Dashboard & terminal');
  control('dashboardHeight','Dashboard height (px)','range',[68,260,2]);
  control('dashboardResizeHandle','Show dashboard resize arrow','checkbox');
  control('terminalWidthScale','Terminal width (%)','range',[60,240,5]);
  control('terminalHeightScale','Terminal height (%)','range',[40,130,5]);
  control('terminalResizeHandles','Show terminal resize arrows','checkbox');
  const sizingNote=document.createElement('p');sizingNote.className='settings-intro';sizingNote.textContent='Sizes stay within the screen. Controls and the open keyboard set the minimum usable height. Resize arrows are optional; dragging them saves your preferred size.';box.append(sizingNote);

  const details=document.createElement('details');details.className='changelog-details';
  const summary=document.createElement('summary');summary.textContent='Change log';details.append(summary);
  const changelog=document.createElement('div');changelog.className='changelog';
  for(const release of CHANGELOG){
    const entry=document.createElement('section');entry.className='changelog-version';
    const title=document.createElement('h4');title.textContent='v'+release.version;entry.append(title);
    const list=document.createElement('ul');
    for(const note of release.items){const item=document.createElement('li');item.textContent=note;list.append(item);}
    entry.append(list);changelog.append(entry);
  }
  details.append(changelog);box.append(details);
  if(state.save){
    const save=document.createElement('button');save.className='button subtle';save.textContent='SAVE & MAIN MENU';
    save.onclick=()=>saveBeforeExit(persist,()=>{closeModal();state.scene='menu';state.save=null;state.keys.clear();$('app').hidden=true;$('welcome').classList.add('visible');showMenuStage('main');renderSaves();applyPendingUpdate();});box.append(save);
    const exportButton=document.createElement('button');exportButton.className='button subtle';exportButton.textContent='EXPORT SAVE';
    exportButton.onclick=()=>{persist();const blob=new Blob([JSON.stringify(state.save,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='spacebitz-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};box.append(exportButton);
  }
  setModal('FLIGHT OPTIONS','Settings',box,Boolean(state.save));
}
$('settingsOpen').onclick=openSettings;$('menuSettings').onclick=openSettings;

function targetPoint() {
  if(!state.autopilot)return null;
  if(state.autopilot.type==='surface')return {x:state.autopilot.x,y:state.autopilot.y};
  if(state.autopilot.type==='waypoint')return {x:state.autopilot.x,y:state.autopilot.y};
  if(state.autopilot.type==='stellar'){const b=findBody(state.autopilot.id)||state.system.star,pos=bodyPosition(b,state.save.days,state.system);return {x:pos.x+state.autopilot.x,y:pos.y+state.autopilot.y};}
  if(state.autopilot.type==='body'){const b=findBody(state.autopilot.id);return b?bodyPosition(b,state.save.days,state.system):null;}
  if(state.autopilot.type==='star'){const s=starAt(state.autopilot.id);return {x:s.x,y:s.y};}
  return null;
}
function update(dt,clockDt=dt) {
  if(!state.save || state.landscapeBlocked || $('modal').classList.contains('visible'))return;
  if(state.warpUntil){
    if(performance.now()>=state.warpUntil){state.warpUntil=0;state.scene==='chart'?enterSystem(currentStar()):enterChart();}
    return;
  }
  state.save.days=settings.timeMode==='realtime'?currentDays():advanceDays(state.save.days,clockDt,settings.paused);
  const dx=Number(state.keys.has('ArrowRight')||state.keys.has('d'))-Number(state.keys.has('ArrowLeft')||state.keys.has('a'))+state.joy.x;
  const dy=Number(state.keys.has('ArrowDown')||state.keys.has('s'))-Number(state.keys.has('ArrowUp')||state.keys.has('w'))+state.joy.y;
  const magnitude=Math.hypot(dx,dy), manual=magnitude>.08;
  const p=state.scene==='surface'?state.save.surface:state.scene==='chart'?state.save.chart:state.save.ship;
  const before={...p};
  if(manual){state.waypoint=null;state.focusBody=null;let speed=manualSpeed(state.scene,settings.flightMode);
    if(state.scene==='surface'&&terrain.sampler(findBody(state.save.landed))(p.x,p.y).water)speed*=.45;
    p.x+=dx/Math.max(1,magnitude)*speed*dt/1000;p.y+=dy/Math.max(1,magnitude)*speed*dt/1000;
    state.autopilot=null;state.followBody=null;state.panUntil=0;
  }else if(state.autopilot){const destination=targetPoint();
    if(destination){
      let goal=destination;
      if(state.scene==='system')for(const star of systemStars()){
        const center=bodyPosition(star,state.save.days,state.system),localP={x:p.x-center.x,y:p.y-center.y},localGoal={x:goal.x-center.x,y:goal.y-center.y};
        const avoided=navigationTarget(localP,localGoal,visualRadius(star.diameter));
        if(avoided!==localGoal)goal={x:avoided.x+center.x,y:avoided.y+center.y};
      }
      const remaining=Math.hypot(destination.x-p.x,destination.y-p.y);
      const isWaypoint=state.autopilot.type==='waypoint',isStellar=state.autopilot.type==='stellar';
      const arrival=isWaypoint||isStellar?0:state.scene==='system'?visualRadius(findBody(state.autopilot.id)?.diameter||10000,findBody(state.autopilot.id)?.kind)+38:state.scene==='chart'?22:state.selected?.kind==='sample'?SURFACE_UNIT*.5:32;
      const speed=travelSpeed(state.scene,remaining,state.autopilot.drive)*(state.scene==='surface'&&terrain.sampler(findBody(state.save.landed))(p.x,p.y).water?.45:1);
      const arrived=remaining<=arrival+.2 || (advanceToArrival(p,goal,goal===destination?arrival:0,speed,dt/1000)&&goal===destination);
      if(arrived){
        if(isWaypoint){p.x=destination.x;p.y=destination.y;state.waypoint=null;}
        if(state.scene==='system'&&!isWaypoint){const b=findBody(state.autopilot.id);if(b){const center=bodyPosition(b,state.save.days,state.system);state.followBody={id:b.id,x:p.x-center.x,y:p.y-center.y};}}
        state.autopilot=null;
        updateUI();notify(isStellar?'Holding position near star':isWaypoint?'Coordinate reached':state.scene==='chart'?'Star reached · enter the system':state.scene==='surface'?'Lander reached':'Orbit achieved · station keeping active');
      }
    }else state.autopilot=null;
  }else if(state.scene==='system'&&state.followBody){
    const body=findBody(state.followBody.id);if(body){const pos=bodyPosition(body,state.save.days,state.system);p.x=pos.x+state.followBody.x;p.y=pos.y+state.followBody.y;}
  }
  if(state.scene==='system'){
    for(const star of systemStars()){const center=bodyPosition(star,state.save.days,state.system),safe=visualRadius(star.diameter)+22,d=Math.hypot(p.x-center.x,p.y-center.y);
      if(d<safe){const a=Math.atan2(p.y-center.y,p.x-center.x);p.x=center.x+Math.cos(a)*safe;p.y=center.y+Math.sin(a)*safe;}}
  }
  const motion=state.scene==='surface'?state.actorMotion:state.shipMotion;
  updateMotion(motion,p.x-before.x,p.y-before.y,dt);
  if(state.followBody && !manual && !state.autopilot){motion.thrust=0;motion.moving=false;}
  if(state.followShip&&state.followPanRemaining>0){
    const wait=state.followPanRemaining;
    state.followPanRemaining=Math.max(0,wait-dt);
    if(!state.followPanRemaining)state.centerZoom={from:state.zoom,to:state.zoom,fromCamera:{...state.camera},elapsed:-Math.min(dt,wait),duration:1300,centerAction:'resume'};
  }
  if(state.centerZoom){
    const animation=state.centerZoom;animation.elapsed+=dt;
    const progress=settings.reducedMotion?1:animation.elapsed/animation.duration;
    const targetCamera=animation.systemFit?{x:0,y:0}:p;
    if(animation.fromCamera){
      const view=cameraViewAt(animation.fromCamera,targetCamera,animation.from,animation.to,progress);
      state.zoom=view.zoom;state.camera=view.camera;
    }else {state.zoom=centerZoomAt(animation.from,animation.to,progress);state.camera={...targetCamera};}
    if(progress>=1){state.centerZoom=null;if(animation.centerAction){state.centerReady=animation.centerAction==='pan';state.followShip=['zoom','follow','resume'].includes(animation.centerAction);state.followPanRemaining=0;updateUI();}}
  }else if(state.followShip&&!state.followPanRemaining){state.camera={...p};
  }else if(state.scene==='system'&&state.focusBody&&state.panUntil===Infinity){
    const body=findBody(state.focusBody);
    if(body)state.camera=bodyPosition(body,state.save.days,state.system);
    else if(state.focusBody===state.system.star.id)state.camera={x:0,y:0};
  }
  state.elapsed+=dt;
  if(state.elapsed>4500){state.elapsed=0;persist();}
}

// Canvas painting: a single linear physical scale for system bodies and orbits.
const circle=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU);};
const screen=(x,y)=>({x:state.width/2+(x-state.camera.x)*state.zoom,y:state.height/2+(y-state.camera.y)*state.zoom});
const world=(x,y)=>({x:(x-state.width/2)/state.zoom+state.camera.x,y:(y-state.height/2)/state.zoom+state.camera.y});
function drawCoordinateGrid(){
  const scene=state.scene,unit=sceneUnit(scene),stride=gridStride(scene,state.zoom),step=unit*stride;
  const halfW=state.width/state.zoom/2,halfH=state.height/state.zoom/2;
  const left=state.camera.x-halfW,top=state.camera.y-halfH;
  ctx.save();ctx.lineWidth=1;ctx.strokeStyle=scene==='surface'?'#c2f9e51a':'#85b8cb10';
  if(settings.showGrid){
  ctx.beginPath();
  for(let x=Math.ceil((left-unit/2)/step)*step+unit/2;x<left+halfW*2;x+=step){const p=screen(x,0);ctx.moveTo(Math.round(p.x)+.5,0);ctx.lineTo(Math.round(p.x)+.5,state.height);}
  for(let y=Math.ceil((top-unit/2)/step)*step+unit/2;y<top+halfH*2;y+=step){const p=screen(0,y);ctx.moveTo(0,Math.round(p.y)+.5);ctx.lineTo(state.width,Math.round(p.y)+.5);}
  ctx.stroke();
  }
  const cell=state.waypoint;
  if(cell){
    const p=screen(cell.x-unit/2,cell.y-unit/2),size=unit*state.zoom;
    ctx.strokeStyle=state.waypoint?'#ffcf69':'#8ee9d4';
    const corners=[p,{x:p.x+size,y:p.y},{x:p.x+size,y:p.y+size},{x:p.x,y:p.y+size}];
    ctx.beginPath();for(let i=0;i<4;i++)lineInView(ctx,corners[i],corners[(i+1)%4],state.width,state.height);ctx.stroke();
    if(size<10){const c=screen(cell.x,cell.y);ctx.strokeRect(c.x-5,c.y-5,10,10);}
    if(state.waypoint){
      const pos=scene==='surface'?state.save.surface:scene==='chart'?state.save.chart:state.save.ship,a=screen(pos.x,pos.y),b=screen(cell.x,cell.y);
      ctx.setLineDash([3,6]);ctx.beginPath();lineInView(ctx,a,b,state.width,state.height);ctx.stroke();
    }
  }
  ctx.restore();
}
function drawBodyOrbit(body,days,host=null){
  host ||= orbitCenter(body,days,state.system);
  const p0=orbitPoint(body,days,0),p1=orbitPoint(body,days,Math.PI),p2=orbitPoint(body,days,Math.PI/2);
  const cx=(p0.x+p1.x)/2,cy=(p0.y+p1.y)/2,c=screen(host.x+cx,host.y+cy),z=state.zoom;
  ctx.save();ctx.strokeStyle=body.kind==='moon'?'#9ebcc43b':'#a3bed33b';ctx.lineWidth=1;
  strokeEllipse(ctx,{x:c.x,y:c.y,ux:(p0.x-cx)*z,uy:(p0.y-cy)*z,vx:(p2.x-cx)*z,vy:(p2.y-cy)*z},state.width,state.height);
  ctx.restore();
}

function drawRetroPixelStar(x,y,size,shape,rgb){
  const s=Math.max(1,Math.round(size));
  if(s<=2){ctx.fillStyle=`rgb(${rgb})`;ctx.fillRect(x,y,s,s);return;}
  const u=Math.max(1,Math.round(s/5));
  const cx=x+2*u,cy=y+2*u;
  ctx.fillStyle=`rgb(${rgb})`;
  if(shape===0){
    ctx.fillRect(x+u,y+u,3*u,3*u);
  }else if(shape===1){
    ctx.fillRect(x+u,y,3*u,u);
    ctx.fillRect(x,y+u,5*u,3*u);
    ctx.fillRect(x+u,y+4*u,3*u,u);
  }else{
    ctx.fillRect(cx,y,u,u);
    ctx.fillRect(x+u,y+u,3*u,u);
    ctx.fillRect(x,y+2*u,5*u,u);
    ctx.fillRect(x+u,y+3*u,3*u,u);
    ctx.fillRect(cx,y+4*u,u,u);
  }
  ctx.fillStyle='rgba(255,255,255,.82)';
  ctx.fillRect(cx,cy,u,u);
}
function backdrop(now) {
  const {width:w,height:h}=state;
  clearFrame(ctx,w,h,state.dpr);
  const drift=settings.starMotion&&!settings.reducedMotion,step=1/state.dpr;
  for(const star of state.stars){
    let x,y,z=star.depth;
    if(state.scene==='menu'){
      if(drift)z=((star.depth-now*.000085*star.speed)%1+1)%1;
      x=w/2+(star.x-.5)*w*.72/(z+.12);y=h/2+(star.y-.5)*h*.72/(z+.12);
    }else{
      ({x,y}=backgroundPosition(star,now,w,h,drift));
    }
    if(x<-8||x>w+8||y<-8||y>h+8)continue;
    const twinkle=settings.twinkle&&!settings.reducedMotion?.6+.4*Math.sin(now*.00245*star.speed+star.phase):.88;
    const alpha=clamp(star.alpha*twinkle+(1-z)*(state.scene==='menu'?.32:.18),.08,1);
    const size=Math.max(1,Math.round(star.size*(state.scene==='menu'?(2.05+(1-z)*2.25):(1.9-z))));
    x=Math.round(x/step)*step;y=Math.round(y/step)*step;
    ctx.globalAlpha=alpha;
    drawRetroPixelStar(x,y,size,star.shape,star.rgb);
  }
  ctx.globalAlpha=1;
}

function label(text,x,y) {
  ctx.font="10px 'SpaceBitz Pixel',monospace";
  ctx.textAlign='center';ctx.textBaseline='middle';const width=ctx.measureText(text).width+18;
  ctx.strokeStyle='#64829750';
  paintPixelFrame(ctx,x-width/2,y-12,width,23);
  ctx.fillStyle='#c3d5e2';ctx.fillText(text,x,y);
}
function drawSelection(x,y,r,now) {
  ctx.save();ctx.strokeStyle='#8ff5d9';ctx.lineWidth=1.5;
  ctx.setLineDash([12,9]);ctx.lineDashOffset=settings.reducedMotion?0:-now*.02;
  strokeEllipse(ctx,circleGeometry(x,y,r+11),state.width,state.height);ctx.restore();
}

function drawStar(x,y,r,color,now,body=null) {
  const w=state.width,h=state.height,maxDim=Math.max(w,h);
  if(['ns','magnetar','quark'].includes(body?.family)){paintCompact(ctx,body,x,y,r,state.stellarSeconds,settings.reducedMotion,w,h);return;}
  if(body?.family==='brown'){paintBrownGlow(ctx,body,x,y,r,w,h);paintBrownAtmosphere(ctx,body,x,y,r,state.stellarSeconds,settings.reducedMotion,w,h);if(r>=1)return;}
  if(r<1.5){ctx.strokeStyle=color;ctx.lineWidth=1;ctx.strokeRect(Math.round(x)-3,Math.round(y)-3,6,6);return;}
  const coreVisible=x+r>0&&x-r<w&&y+r>0&&y-r<h;
  const nearViewport=x>-maxDim*.7&&x<w+maxDim*.7&&y>-maxDim*.7&&y<h+maxDim*.7;
  const plasmaVisible=x+r*1.38>0&&x-r*1.38<w&&y+r*1.38>0&&y-r*1.38<h;
  if(!plasmaVisible&&!nearViewport)return;

  if(r>maxDim*.32){
    // Close/large stars use a cheap clipped halo instead of a multi-thousand-pixel radial gradient.
    if(nearViewport){
      ctx.save();ctx.globalAlpha=.08;ctx.fillStyle=color;
      const haloR=Math.min(r*1.32,maxDim*.78);
      circle(x,y,haloR);ctx.fill();ctx.restore();
    }
  }else{
    const glowR=Math.min(r*3.2,maxDim*.72);
    const glow=ctx.createRadialGradient(x,y,0,x,y,glowR);
    glow.addColorStop(0,color+'b8');glow.addColorStop(.3,color+'5f');glow.addColorStop(1,color+'00');
    ctx.fillStyle=glow;circle(x,y,glowR);ctx.fill();
  }

  if(!coreVisible){if(body&&plasmaVisible)paintStellarSurface(ctx,body,x,y,r,state.stellarSeconds,state.save.days,settings.reducedMotion,w,h);return;}
  if(r>maxDim*.38){
    ctx.fillStyle=color;fillDisk(ctx,x,y,r,w,h);
  }else{
    const core=ctx.createRadialGradient(x-r*.3,y-r*.3,0,x,y,r);
    core.addColorStop(0,'#fffefa');core.addColorStop(.55,color);core.addColorStop(1,'#bd6552');
    ctx.fillStyle=core;circle(x,y,r);ctx.fill();
  }
  if(body){
    ctx.save();ctx.imageSmoothingEnabled=false;
    paintStellarSurface(ctx,body,x,y,r,state.stellarSeconds,state.save.days,settings.reducedMotion,w,h);ctx.restore();
  }
  if(body?.visual)drawStellarEnvironment(body,x,y,r,now);
}
function drawStellarEnvironment(body,x,y,r,now){
  if(r<3||r>Math.max(state.width,state.height)*2)return;
  const compact=['ns','magnetar','quark','boson'].includes(body.family),phase=settings.reducedMotion?0:state.stellarSeconds*.8;
  ctx.save();ctx.strokeStyle=body.color;ctx.fillStyle=body.color;
  if(body.family==='protostar'){
    const tilt=hash(body.id)%180*Math.PI/180,ct=Math.cos(tilt),st=Math.sin(tilt),reach=r*1.8;ctx.globalAlpha=.22;ctx.lineWidth=Math.max(1,r*.055);strokeEllipse(ctx,{x,y,ux:ct*reach,uy:st*reach,vx:-st*reach*.25,vy:ct*reach*.25},state.width,state.height);
    ctx.globalAlpha=.22;for(let i=0;i<36;i++){const a=i/36*TAU+phase*.11,dist=r*(1.3+.5*(hash(body.id+i)%100/100)),px=x+ct*Math.cos(a)*dist-st*Math.sin(a)*dist*.3,py=y+st*Math.cos(a)*dist+ct*Math.sin(a)*dist*.3;if(px>=0&&px<state.width&&py>=0&&py<state.height)ctx.fillRect(Math.round(px),Math.round(py),Math.max(1,Math.min(4,r*.03)),Math.max(1,Math.min(4,r*.03)));}
    if(hash(body.id)%10<7){ctx.globalAlpha=.09;for(let sign of [-1,1]){const end={x:x-st*r*3*sign,y:y+ct*r*3*sign};ctx.beginPath();lineInView(ctx,{x,y},end,state.width,state.height);ctx.stroke();}}
  }else if(compact&&body.family!=='boson'){
    // Symbolic slowed polar beams, not a physical radio-ray footprint.
    ctx.globalAlpha=body.family==='magnetar'?.22:.12;
    for(let i=0;i<2;i++){const a=phase+i*Math.PI,u={x:Math.cos(a),y:Math.sin(a)},v={x:-u.y,y:u.x};ctx.beginPath();ctx.moveTo(x+u.x*r,y+u.y*r);ctx.lineTo(x+u.x*r*4+v.x*r*.45,y+u.y*r*4+v.y*r*.45);ctx.lineTo(x+u.x*r*4-v.x*r*.45,y+u.y*r*4-v.y*r*.45);ctx.closePath();ctx.fill();}
  }else if(['wr','lbv','agb','postagb','supergiant','protostar'].includes(body.family)){
    const count=body.family==='wr'?4:3;
    for(let i=0;i<count;i++){ctx.globalAlpha=.045*(1-i/count);ctx.lineWidth=Math.max(2,r*.03);const reach=r*(1.45+i*.23+(settings.reducedMotion?0:.035*Math.sin(phase+i)));strokeEllipse(ctx,{x,y,ux:reach,uy:0,vx:0,vy:body.family==='protostar'?reach*.25:reach},state.width,state.height);}
  }
  ctx.restore();
}
function drawPlanet(body,p,now,worldPos) {
  const sr=visualRadius(body.diameter,body.kind)*state.zoom;
  const extent=sr*(body.rings?body.rings.outerKm/(body.diameter/2):1);
  if(p.x<-extent-100||p.x>state.width+extent+100||p.y<-extent-100||p.y>state.height+extent+100)return;
  const r=sr;const selected=state.selected?.id===body.id;
  if(r<1.5){
    // Hollow navigation beacon, not a larger physical disk.
    ctx.strokeStyle=body.color;ctx.lineWidth=1;ctx.strokeRect(Math.round(p.x)-2,Math.round(p.y)-2,4,4);
    if(body.id===state.save.homePlanet)paintHomeMarker(ctx,p.x,p.y,3,state.width,state.height);
    if(selected)drawSelection(p.x,p.y,4,now);return;
  }
  const rings=ringSprites(body,worldPos);
  paintRings(ctx,rings,'back',p.x,p.y,r,state.width,state.height);
  ctx.save();
  if(r<86){
    ctx.shadowColor=body.color;ctx.shadowBlur=Math.min(26,r*.62);
    circle(p.x,p.y,r);ctx.fillStyle=body.color;ctx.fill();
  }else{
    ctx.globalAlpha=.16;ctx.fillStyle=body.color;fillDisk(ctx,p.x,p.y,r+Math.min(14,r*.08),state.width,state.height);
    ctx.globalAlpha=1;fillDisk(ctx,p.x,p.y,r,state.width,state.height);
  }
  ctx.restore();
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(body.atmosphere)paintGiantAtmosphere(ctx,body,p.x,p.y,r,state.stellarSeconds,state.save.days,worldPos,settings.reducedMotion,state.width,state.height);
  else drawImageInView(ctx,celestialSprite(body,state.save.days,worldPos),p.x-r,p.y-r,2*r,2*r,state.width,state.height);
  ctx.restore();
  ctx.strokeStyle='#d9f8fb42';ctx.lineWidth=1;strokeEllipse(ctx,circleGeometry(p.x,p.y,r),state.width,state.height);
  paintRings(ctx,rings,'front',p.x,p.y,r,state.width,state.height);
  if(body.id===state.save.homePlanet)paintHomeMarker(ctx,p.x,p.y,r,state.width,state.height);
  if(selected)drawSelection(p.x,p.y,r,now);
}
function drawSystem(now) {
  const sys=state.system,days=state.save.days,zone=habitableZone(sys.hostLuminosity||sys.star.luminosity),positions=stellarPositions(sys,days),host=positions[sys.hostId]||{x:0,y:0};
  if(sys.generation){zone.inner=Math.max(zone.inner,sys.minAU||0);zone.outer=Math.min(zone.outer,sys.maxAU??Infinity);}
  drawCoordinateGrid();
  const center=screen(host.x,host.y);
  if(settings.zone&&zone.outer>zone.inner){
    const zoneInner=orbitRadius(zone.inner,sys.star),zoneOuter=orbitRadius(zone.outer,sys.star);
    ctx.save();ctx.fillStyle='#67e5ad0b';ctx.strokeStyle='#6de6ad36';ctx.lineWidth=1;
    fillAnnulus(ctx,center.x,center.y,zoneInner*state.zoom,zoneOuter*state.zoom,state.width,state.height);
    ctx.setLineDash([3,7]);
    strokeEllipse(ctx,circleGeometry(center.x,center.y,zoneInner*state.zoom),state.width,state.height);
    strokeEllipse(ctx,circleGeometry(center.x,center.y,zoneOuter*state.zoom),state.width,state.height);ctx.restore();
  }

  if(settings.orbits)for(const planet of sys.planets){
    drawBodyOrbit(planet,days);
    const host=bodyPosition(planet,days,sys),hostScreen=screen(host.x,host.y);
    const moonOrbitMargin=Math.max(state.width,state.height)*.75;
    if(hostScreen.x>-moonOrbitMargin&&hostScreen.x<state.width+moonOrbitMargin&&hostScreen.y>-moonOrbitMargin&&hostScreen.y<state.height+moonOrbitMargin)
      for(const moon of planet.moons)drawBodyOrbit(moon,days,host);
  }
  if(settings.orbits)for(const pair of sys.binaries||[]){
    const bary=positions[pair.id];
    for(const [id,sign,fraction]of [[pair.left,-1,pair.mu],[pair.right,1,1-pair.mu]]){
      const scaled={...pair,au:pair.au*fraction,periapsis:pair.periapsis+(sign<0?Math.PI:0)};drawBodyOrbit(scaled,days,bary);
    }
  }
  for(const star of systemStars()){
    const pos=positions[star.id]||{x:0,y:0},p=screen(pos.x,pos.y),r=visualRadius(star.diameter)*state.zoom;
    drawStar(p.x,p.y,r,star.color,now,star);
    if(state.selected?.id===star.id)drawSelection(p.x,p.y,Math.max(r,4),now);
    if(settings.labels&&state.selected?.id!==star.id&&p.x>-60&&p.x<state.width+60&&p.y>-60&&p.y<state.height+60)label(star.name,p.x,p.y-Math.max(r,4)-25);
  }
  for(const planet of sys.planets){const pos=bodyPosition(planet,days,sys);drawPlanet(planet,screen(pos.x,pos.y),now,pos);
    for(const moon of planet.moons){const mp=bodyPosition(moon,days,sys);drawPlanet(moon,screen(mp.x,mp.y),now,mp);}}
  if(settings.travelLines&&['body','stellar'].includes(state.autopilot?.type)){const end=targetPoint();if(end){const a=screen(state.save.ship.x,state.save.ship.y),b=screen(end.x,end.y);
    ctx.strokeStyle='#77e2d586';ctx.lineWidth=1;ctx.setLineDash([5,8]);ctx.beginPath();lineInView(ctx,a,b,state.width,state.height);ctx.stroke();ctx.setLineDash([]);}}
  const ship=screen(state.save.ship.x,state.save.ship.y);paintShip(ctx,ship.x,ship.y,state.shipMotion,now,SYSTEM_SHIP_SIZE,false,state.zoom);paintLocator(ctx,ship.x,ship.y,SYSTEM_SHIP_SIZE*state.zoom,state.width,state.height,true,state.shipMotion.heading);
}
function drawChartStar(x,y,r,color,now,seed,appearance={}){
  if(appearance.family==='ns'&&appearance.subtype!=='ordinary'){paintCompact(ctx,appearance,x,y,r*.4,settings.twinkle?now/1000:0,settings.reducedMotion,state.width,state.height);return;}
  const pulse=(settings.reducedMotion||!settings.twinkle?1:chartBrightness(seed,now/1000))*(chartStyle(appearance).brightness||1);
  const haloR=r*4.6;
  ctx.save();
  ctx.globalAlpha=pulse;
  const halo=ctx.createRadialGradient(x,y,0,x,y,haloR);
  halo.addColorStop(0,appearance.family==='brown'?color:'#ffffff');
  halo.addColorStop(.10,color);
  halo.addColorStop(.32,color+'a8');
  halo.addColorStop(.68,color+'42');
  halo.addColorStop(1,color+'00');
  ctx.fillStyle=halo;circle(x,y,haloR);ctx.fill();
  ctx.globalAlpha=pulse;
  ctx.fillStyle=color;circle(x,y,r*1.18);ctx.fill();
  ctx.fillStyle=appearance.family==='brown'?color:'#ffffff';circle(x,y,Math.max(.6,r*.48));ctx.fill();
  const q=Math.max(1,Math.round(r*.32)),d=Math.round(r*1.05);
  ctx.globalAlpha=.72*pulse;ctx.fillStyle=color;
  ctx.fillRect(Math.round(x-d-q/2),Math.round(y-d-q/2),q,q);
  ctx.fillRect(Math.round(x+d-q/2),Math.round(y+d-q/2),q,q);
  ctx.restore();
}
function drawChart(now) {
  drawCoordinateGrid();
  const stars=nearbyStars();
  if(settings.travelLines && state.save.route.length>1){ctx.save();ctx.strokeStyle='#8ebcab50';ctx.setLineDash([3,7]);ctx.beginPath();
    state.save.route.forEach((seed,i)=>{const star=starAt(seed),p=screen(star.x,star.y);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.stroke();ctx.restore();}
  for(const star of stars){const p=screen(star.x,star.y);if(p.x<-45||p.x>state.width+45||p.y<-45||p.y>state.height+45)continue;
    const appearance=chartAppearance(star.seed),starColor=appearance.color;
    const radius=chartStyle(appearance).radius;
    drawChartStar(p.x,p.y,radius,starColor,now,star.seed,appearance);
    if(appearance.companionColors?.length){ctx.save();for(const [i,color]of appearance.companionColors.entries()){ctx.fillStyle=color;ctx.fillRect(Math.round(p.x+radius+4+i*4),Math.round(p.y-1),2,2);}ctx.restore();}
    if(state.selected?.seed===star.seed)drawSelection(p.x,p.y,9,now);
    if(star.seed===state.save.homeSeed)paintHomeMarker(ctx,p.x,p.y,radius*1.18,state.width,state.height);
  }
  if(state.autopilot?.type==='star'){const s=starAt(state.autopilot.id);const a=screen(state.save.chart.x,state.save.chart.y),b=screen(s.x,s.y);
    ctx.strokeStyle='#76dac680';ctx.lineWidth=1;ctx.setLineDash([5,7]);ctx.beginPath();lineInView(ctx,a,b,state.width,state.height);ctx.stroke();ctx.setLineDash([]);}
  const ship=screen(state.save.chart.x,state.save.chart.y);paintShip(ctx,ship.x,ship.y,state.shipMotion,now,36,false,state.zoom);paintLocator(ctx,ship.x,ship.y,36*state.zoom,state.width,state.height);
}
const chartAppearanceCache=new Map(),chartSystems=new Map();
function chartSystem(seed){const key=seed+':'+JSON.stringify(state.save.generation||null);if(chartSystems.has(key))return chartSystems.get(key);const system=makeSystem(seed,state.save.generation);chartSystems.set(key,system);if(chartSystems.size>32)chartSystems.delete(chartSystems.keys().next().value);return system;}
function chartAppearance(seed){
  const generation=state.save?.generation,key=seed+':'+(generation?JSON.stringify(generation):'legacy');
  if(chartAppearanceCache.has(key))return chartAppearanceCache.get(key);
  let appearance=starAppearance(seed,generation);
  if(generation){const system=chartSystem(seed);appearance={...system.star,companionColors:system.stars.slice(1).map(s=>s.color)};}
  chartAppearanceCache.set(key,appearance);if(chartAppearanceCache.size>256)chartAppearanceCache.delete(chartAppearanceCache.keys().next().value);return appearance;
}
function drawGround(now) {
  const body=findBody(state.save.landed);if(!body)return;
  terrain.draw(ctx,body,state.camera,state.zoom,state.width,state.height,settings.pixelSize);
  drawCoordinateGrid();
  const cell=110;
  const hw=state.width/state.zoom/2,hh=state.height/state.zoom/2;
  // Sparse, independently placed vegetation and rocks. Placement is keyed to
  // world space, not to the terrain cache or the visible screen.
  for(let cy=Math.floor((state.camera.y-hh)/cell)-1;cy<=Math.floor((state.camera.y+hh)/cell)+1;cy++)
    for(let cx=Math.floor((state.camera.x-hw)/cell)-1;cx<=Math.floor((state.camera.x+hw)/cell)+1;cx++){
      const prop=terrain.prop(body,cx,cy,cell);if(!prop)continue;
      const p=screen(prop.x,prop.y),z=state.zoom,tree=prop.tree;
      ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(z,z);
      ctx.fillStyle='#0d243447';ctx.fillRect(-5,2,14,4);
      if(tree){
        ctx.fillStyle='#4f493b';ctx.fillRect(-2,-2,4,9);
        ctx.fillStyle='#244c43';ctx.fillRect(-9,-13,18,9);ctx.fillRect(-6,-18,12,17);
        ctx.fillStyle='#4d8054';ctx.fillRect(-6,-17,9,9);ctx.fillRect(-9,-11,10,5);
        ctx.fillStyle='#83a868';ctx.fillRect(-4,-16,5,3);
      }else{
        const size=prop.size;ctx.fillStyle='#414d53';ctx.fillRect(-size,-size,size*2,size+4);
        ctx.fillStyle=body.type==='desert'?'#bf9466':'#a5b1b2';ctx.fillRect(-size,-size,size+3,3);
        ctx.fillStyle=body.type==='desert'?'#86634f':'#687f88';ctx.fillRect(-size+2,-size+3,size*2-2,size-1);
      }
      ctx.restore();
    }
  const lander=screen(0,0);paintShip(ctx,lander.x,lander.y,{},now,LANDER_SIZE,true,state.zoom);
  const astronaut=screen(state.save.surface.x,state.save.surface.y);
  paintAstronaut(ctx,astronaut.x,astronaut.y,state.actorMotion,state.zoom);
  const sunlight=Math.cos(rotationAngle(body,state.save.days)-(body.phase||0));
  ctx.fillStyle=`rgba(6,16,44,${.08+(1-sunlight)*.18})`;ctx.fillRect(0,0,state.width,state.height);
  for(const sample of surfaceSamples()){
    if(state.save.discoveries.includes(sample.id))continue;const p=screen(sample.x,sample.y);
    if(p.x<0||p.x>state.width||p.y<0||p.y>state.height)continue;
    const pulse=settings.reducedMotion?1:.8+.2*Math.sin(now*.004+hash(sample.id));
    ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(state.zoom,state.zoom);ctx.globalAlpha=pulse;
    ctx.shadowColor='#60e9cd';ctx.shadowBlur=12;
    ctx.fillStyle='#377e9a';ctx.fillRect(-5,-3,10,8);ctx.fillStyle='#6cddc8';ctx.fillRect(-3,-8,6,13);
    ctx.fillStyle='#d6ffe1';ctx.fillRect(-2,-6,2,7);ctx.restore();
  }
  paintLocator(ctx,lander.x,lander.y,LANDER_SIZE*state.zoom,state.width,state.height);
}
function frame(now) {
  const realDt=Math.max(0,now-state.last),dt=Math.min(100,realDt);state.last=now;
  if(realDt>0)state.fps+=(1000/realDt-state.fps)*.06;
  if(!document.hidden&&!state.landscapeBlocked){
    if(state.save){update(dt,realDt);if(!$('modal').classList.contains('visible')&&!settings.reducedMotion)state.stellarSeconds+=dt/1000;}
    backdrop(now);ctx.save();
    try{
      if(state.scene==='system')drawSystem(now);
      else if(state.scene==='chart')drawChart(now);
      else if(state.scene==='surface')drawGround(now);
    }finally{ctx.restore();}
    if(state.save){positionContext();updateTerminal(now);}
    if(state.save && now-state.lastUI>300){state.lastUI=now;updateUI();}
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange',()=>{
  state.last=performance.now();
  music.setVisibility(document.hidden);
  if(document.hidden){resetInput();persist();}
});
window.addEventListener('pagehide',()=>{stopMusic();persist();});

// Objects use one tap, empty space uses two; a drag pans and two fingers pinch.
document.addEventListener('pointerdown',e=>{if(e.target!==canvas)state.coordinateTap=null;},{capture:true});
const pointers=new Map();let gesture=null;
canvas.addEventListener('pointerdown',e=>{if(onDashboard(e.clientX,e.clientY)||!state.save||$('modal').classList.contains('visible'))return;
  canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1)gesture={x:e.clientX,y:e.clientY,moved:false};
  if(pointers.size===2){state.coordinateTap=null;gesture=null;const [a,b]=[...pointers.values()];state.pinch=Math.hypot(a.x-b.x,a.y-b.y);}
});
canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()],dist=Math.hypot(a.x-b.x,a.y-b.y);
    if(state.pinch)zoom(dist/state.pinch);state.pinch=dist;return;}
  if(gesture){if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>7)gesture.moved=true;
    if(gesture.moved){state.coordinateTap=null;const following=state.followShip||state.centerZoom?.centerAction==='follow';state.centerZoom=null;state.centerReady=false;state.followShip=following;if(following)state.followPanRemaining=2000;state.camera.x-=(e.clientX-old.x)/state.zoom;state.camera.y-=(e.clientY-old.y)/state.zoom;
      state.panUntil=Infinity;state.focusBody=null;}}
});
function pick(e){if(onDashboard(e.clientX,e.clientY))return;const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
  if(state.scene==='system'){
    const matches=allBodies().map(body=>{const pos=bodyPosition(body,state.save.days,state.system),p=screen(pos.x,pos.y);
      return {body,d:Math.hypot(x-p.x,y-p.y),radius:visualRadius(body.diameter,body.kind)*state.zoom};})
      .filter(v=>v.d<Math.max(20,v.radius+10)).sort((a,b)=>a.d-b.d);
    if(matches.length){select(matches[0].body);return;}
    else for(const body of systemStars()){const pos=bodyPosition(body,state.save.days,state.system),star=screen(pos.x,pos.y);if(Math.hypot(x-star.x,y-star.y)<Math.max(24,visualRadius(body.diameter)*state.zoom+8)){select(body);return;}}
  }else if(state.scene==='chart'){
    const match=nearbyStars().map(star=>{const p=screen(star.x,star.y);return {star,d:Math.hypot(x-p.x,y-p.y)};})
      .filter(v=>v.d<26).sort((a,b)=>a.d-b.d)[0];if(match){select(match.star);return;}
  }
  if(state.scene==='surface'){const lander=screen(0,0);if(Math.hypot(x-lander.x,y-lander.y)<32*state.zoom){select({id:'lander',kind:'lander',name:'Lander',x:0,y:0});return;}for(const sample of surfaceSamples()){if(state.save.discoveries.includes(sample.id))continue;const p=screen(sample.x,sample.y);if(Math.hypot(x-p.x,y-p.y)<Math.max(15,10*state.zoom)){select({...sample,kind:'sample',name:'Surface sample'});return;}}}
  const cell=gridCell(world(x,y),state.scene);
  if(state.scene==='system'&&systemStars().some(s=>{const pos=bodyPosition(s,state.save.days,state.system);return Math.hypot(cell.x-pos.x,cell.y-pos.y)<visualRadius(s.diameter)+24;})){notify('Choose a coordinate outside the stars.');return;}
  const tap={x,y,scene:state.scene,time:performance.now()},confirmed=isCoordinateDoubleTap(state.coordinateTap,tap);
  state.coordinateTap=confirmed?null:tap;if(!confirmed)return;
  beginSelection();state.terminal=null;state.terminalExpanded=false;state.waypoint=cell;state.selected=null;state.autopilot=null;updateUI();
}
canvas.addEventListener('pointerup',e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);
  if(gesture&&!gesture.moved&&pointers.size===0)pick(e);gesture=null;state.pinch=null;});
canvas.addEventListener('pointercancel',e=>{state.coordinateTap=null;pointers.delete(e.pointerId);gesture=null;state.pinch=null;});
canvas.addEventListener('wheel',e=>{if(!state.save)return;e.preventDefault();zoom(e.deltaY<0?1.12:1/1.12);},{passive:false});
window.addEventListener('keydown',e=>{
  if(state.landscapeBlocked)return;
  if(e.key==='Escape'){if($('modal').classList.contains('visible'))closeModal();else if(state.autopilot||state.warpUntil||state.waypoint||state.selected){cancelTarget();}else if(!$('universeMenuStage').hidden&&!state.save)showMenuStage('main');return;}
  if($('modal').classList.contains('visible')){
    if(e.key==='Tab'){
      const focusable=[...$('modal').querySelectorAll('button,input,select,a[href]')].filter(el=>!el.disabled&&!el.hidden);
      const first=focusable[0],last=focusable.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }return;
  }
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable||document.activeElement?.closest('#terminalKeyboard'))return;
  if(!state.save)return;
  const k=e.key.length===1?e.key.toLowerCase():e.key;
  if(k===' '&&['BUTTON','A'].includes(document.activeElement?.tagName))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' ','+','-','='].includes(k))e.preventDefault();
  if(k==='+'||k==='=')zoom(1.2);else if(k==='-')zoom(1/1.2);else if(k===' '){if(!e.repeat)primary();}
  else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(k))state.keys.add(k);
});
window.addEventListener('keyup',e=>state.keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
window.addEventListener('blur',resetInput);
document.addEventListener('focusin',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.isContentEditable)resetInput();});
const joy=$('joystick'),stick=$('stick');let joyPointer=null;
function resetInput(){state.keys.clear();state.joy={x:0,y:0};joyPointer=null;stick.style.setProperty('--jx','0px');stick.style.setProperty('--jy','0px');}
function moveJoy(e){const r=joy.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;
  const rx=Math.max(1,(r.width-stick.offsetWidth)/2-5),ry=Math.max(1,(r.height-stick.offsetHeight)/2-5);
  const nx=x/rx,ny=y/ry,d=Math.hypot(nx,ny),scale=d>1?1/d:1;
  state.joy={x:nx*scale,y:ny*scale};stick.style.setProperty('--jx',nx*scale*rx+'px');stick.style.setProperty('--jy',ny*scale*ry+'px');}
joy.addEventListener('pointerdown',e=>{if(joyPointer!==null)return;joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);moveJoy(e);});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)moveJoy(e);});
function releaseJoy(e){if(e.pointerId!==joyPointer)return;joyPointer=null;state.joy={x:0,y:0};stick.style.setProperty('--jx','0px');stick.style.setProperty('--jy','0px');}
joy.addEventListener('pointerup',releaseJoy);joy.addEventListener('pointercancel',releaseJoy);
joy.addEventListener('lostpointercapture',releaseJoy);
