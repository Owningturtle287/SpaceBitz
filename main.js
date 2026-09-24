import {TAU, DAY_MS, EPOCH, advanceDays, rotationAngle, clamp, hash, rng, orbitRadius, visualRadius,
  habitableZone, makeSystem, bodyPosition, galaxyStars, starName} from './model.js';
import {Soundtrack} from './music.js';
import {DEFAULT_SETTINGS,normalizeSettings} from './settings.js';
import {TerrainRenderer} from './terrain.js';
import {paintShip,paintAstronaut} from './sprites.js';
import {updateMotion,navigationTarget} from './motion.js';
import {celestialSprite} from './celestial.js';

const $ = id => document.getElementById(id);
const canvas = $('sky');
const ctx = canvas.getContext('2d', {alpha:false});
const SAVE_KEY = 'spacebitz:field:v1';
const SETTINGS_KEY = 'spacebitz:field:settings';
const settings = normalizeSettings({music:readJSON('spacebitz:musicEnabled',true),
  reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  ...readJSON(SETTINGS_KEY,{})});
const terrain=new TerrainRenderer();
const music=new Soundtrack(status=>{
  $('menuMusic').textContent=status==='playing'?'♪ MUSIC ON':status==='off'?'♪ MUSIC OFF':status==='unavailable'?'♪ AUDIO UNAVAILABLE':'♪ ENABLE MUSIC';
  $('menuMusic').dataset.status=status;
});
const state = {save:null, system:null, scene:'menu', selected:null, camera:{x:0,y:0}, zoom:1,
  panUntil:0, autopilot:null, keys:new Set(), joy:{x:0,y:0}, stars:[], width:0,height:0,dpr:1,
  last:performance.now(), lastUI:0, elapsed:0, fps:60, particles:[], textureCache:new Map(),
  shipMotion:{heading:-Math.PI/2,thrust:0},actorMotion:{direction:'down',steps:0},followBody:null};
const loadSaves = () => {
  const value=readJSON(SAVE_KEY, []);
  return Array.isArray(value)?value.filter(s=>s && s.id && s.seed):[];
};
function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{toast('Settings could not be saved on this device.');}}
function applySettings(){
  document.body.dataset.controls=settings.controls;
  document.body.dataset.reducedMotion=String(settings.reducedMotion);
  document.documentElement.style.setProperty('--joy-x',settings.joyX+'%');
  document.documentElement.style.setProperty('--joy-offset',settings.joyOffset+'px');
  music.configure(settings.music,settings.volume);fit();updateUI();
}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#menuMusic'))music.start();},{capture:true,passive:true});
document.addEventListener('keydown',()=>music.start(),{capture:true});
$('menuMusic').onclick=()=>{
  if($('menuMusic').dataset.status==='ready'){music.start();return;}
  settings.music=!settings.music;saveSettings();music.configure(settings.music,settings.volume);
};
function persist() {
  if (!state.save) return;
  state.save.updated = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify([state.save,...loadSaves().filter(s=>s.id!==state.save.id)].slice(0,8))); }
  catch { toast('Storage is full. This voyage could not be saved.'); }
}
function toast(message) {
  $('toast').textContent = message; $('toast').classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(()=>$('toast').classList.remove('show'),2900);
}
function allBodies() { return state.system?.planets.flatMap(p=>[p,...p.moons]) || []; }
function findBody(id) { return allBodies().find(p=>p.id===id); }
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
function fit() {
  const rect = canvas.getBoundingClientRect();
  state.width=rect.width; state.height=rect.height;
  state.dpr=settings.resolution==='auto'?Math.min(window.devicePixelRatio||1,2):Number(settings.resolution);
  canvas.width=Math.round(rect.width*state.dpr); canvas.height=Math.round(rect.height*state.dpr);
  ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
  state.stars=Array.from({length:Math.max(110,Math.min(400,Math.round(rect.width*rect.height/2600)))},(_,i)=>{
    const r=rng('background:'+i);return {x:r(),y:r(),size:r()<.7?1:2,alpha:.25+r()*.6,phase:r()*TAU,depth:r(),speed:.4+r(),color:r()};
  });
}
window.addEventListener('resize',fit); applySettings();
function start(save) {
  state.save=save; state.scene=save.scene || 'system';
  state.system=makeSystem(save.currentSystem || save.homeSeed);
  save.currentSystem=state.system.seed;
  save.chart ||= {x:0,y:0}; save.ship ||= {x:0,y:0};
  save.surface ||= {x:0,y:0}; save.discoveries ||= []; save.log ||= [];
  save.days=Number.isFinite(save.days)?save.days:0;
  if(save.layoutVersion!==2 && state.scene==='system'){
    const nearest=state.system.planets.map(p=>{const a=p.phase+TAU*save.days/p.period,r=160+275*Math.log1p(p.au*2);
      return {p,d:Math.hypot(Math.cos(a)*r-save.ship.x,Math.sin(a)*r-save.ship.y)};}).sort((a,b)=>a.d-b.d)[0].p;
    const pos=bodyPosition(nearest,save.days,state.system);save.ship={x:pos.x+visualRadius(nearest.diameter)+60,y:pos.y};
  }
  save.layoutVersion=2;save.route||=[];
  if(state.scene==='surface' && !findBody(save.landed)?.solid){state.scene='system';save.scene='system';save.landed=null;}
  state.selected=null; state.autopilot=null;state.followBody=null;state.panUntil=0;
  state.shipMotion={heading:-Math.PI/2,thrust:0};state.actorMotion={direction:'down',steps:0};
  state.zoom=state.scene==='chart'?1:state.scene==='surface'?1.3:.85;
  if(state.scene==='chart') state.camera={...save.chart};
  else if(state.scene==='surface') state.camera={...save.surface};
  else state.camera={...save.ship};
  $('welcome').classList.remove('visible'); $('app').hidden=false;
  persist(); updateUI();
}
function create(sol=false) {
  const name=$('universeName').value.trim().slice(0,40) || 'My Universe';
  const seed=($('universeSeed').value.trim() || (crypto.randomUUID?.() || Math.random().toString(36).slice(2))).slice(0,64);
  const homeSeed=sol?'sol':'home:'+seed;
  const system=makeSystem(homeSeed);
  const home=sol?system.planets[2]:system.planets.find(p=>p.type==='temperate') || system.planets.find(p=>p.solid) || system.planets[0];
  const h=bodyPosition(home,0,system);
  const save={id:crypto.randomUUID?.()||String(Date.now()),name,seed,homeSeed,currentSystem:homeSeed,
    scene:'system',ship:{x:h.x+visualRadius(home.diameter)+70,y:h.y},chart:{x:0,y:0},
    surface:{x:0,y:0},landed:null,days:0,discoveries:[],log:[],layoutVersion:2,updated:Date.now()};
  start(save); select(home); toast(`Welcome to ${system.name}. Select a world to chart a course.`);
}
function renderSaves() {
  const list=$('savedGames'); list.replaceChildren(); const saves=loadSaves();
  if(!saves.length){const el=document.createElement('div');el.className='empty-saves';el.textContent='No voyages saved yet.';list.append(el);return;}
  for(const save of saves){
    const row=document.createElement('div');row.className='save-row';
    const play=document.createElement('button');play.className='load-save';
    play.textContent=save.name || 'Unnamed Universe';play.title='Continue '+play.textContent;
    play.onclick=()=>start(save);
    const date=document.createElement('small');date.textContent=new Date(save.updated||Date.now()).toLocaleDateString();
    const del=document.createElement('button');del.className='delete-save';del.textContent='✕';del.setAttribute('aria-label','Delete '+play.textContent);
    del.onclick=()=>{if(!confirm(`Delete “${save.name}” from this device?`))return;
      localStorage.setItem(SAVE_KEY,JSON.stringify(loadSaves().filter(s=>s.id!==save.id)));renderSaves();};
    row.append(play,date,del);list.append(row);
  }
}
renderSaves(); $('newGame').onclick=()=>create(false); $('solGame').onclick=()=>create(true);
$('importButton').onclick=()=>$('importFile').click();
$('importFile').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    if(file.size>2_000_000)throw Error('Save file is too large.');
    const value=JSON.parse(await file.text());
    const source=Array.isArray(value)?value:(Array.isArray(value.saves)?value.saves:[value]);
    const converted=source.slice(0,8).map(raw=>{
      if(typeof raw.seed!=='string'||raw.seed.length>64)throw Error('Unrecognized save format.');
      const seed=raw.seed,homeSeed=raw.homeSeed||raw.originSeed||(raw.startOnEarth?'sol':'home:'+seed);
      if(typeof homeSeed!=='string'||homeSeed.length>150)throw Error('Invalid system seed.');
      const system=makeSystem(homeSeed),body=system.planets[0],p=bodyPosition(body,0,system);
      return {id:crypto.randomUUID?.()||String(Date.now()+Math.random()),name:String(raw.name||'Imported universe').slice(0,40),
        seed,homeSeed,currentSystem:homeSeed,scene:'system',ship:{x:p.x+80,y:p.y+20},chart:{x:0,y:0},
        surface:{x:0,y:0},landed:null,layoutVersion:2,days:Number.isFinite(raw.days)?raw.days:0,
        discoveries:Array.isArray(raw.discoveries)?raw.discoveries.filter(x=>typeof x==='string').slice(0,1000):[],
        log:Array.isArray(raw.log)?raw.log.filter(x=>x&&typeof x.name==='string').slice(0,100):[],updated:Date.now()};
    });
    if(!converted.length)throw Error('No voyages found.');
    localStorage.setItem(SAVE_KEY,JSON.stringify([...converted,...loadSaves()].slice(0,8)));
    renderSaves();toast(`Imported ${converted.length} voyage${converted.length===1?'':'s'}.`);
  }catch(error){toast(error.message||'Could not import this save.');}
  e.target.value='';
};
let installPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installButton').hidden=false;});
$('installButton').onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installButton').hidden=true;}};
if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  const wasControlled=!!navigator.serviceWorker.controller;let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(wasControlled&&!reloading){reloading=true;persist();location.reload();}
  });
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}

function select(object) { state.selected=object; state.autopilot=null;state.followBody=null; updateUI(); }
function markDiscovery(body) {
  if(state.save.discoveries.includes(body.id)) return;
  state.save.discoveries.push(body.id);
  state.save.log.unshift({name:body.name,action:'First landing',days:state.save.days});
  toast(`First landing on ${body.name} · added to logbook`);persist();
}
function enterChart() {
  state.followBody=null;state.shipMotion.thrust=0;
  const star=currentStar();state.scene='chart';state.selected=star;
  state.save.scene='chart';state.save.chart={x:star.x+38,y:star.y+30};
  state.camera={...state.save.chart};state.zoom=1;state.autopilot=null;persist();updateUI();
}
function enterSystem(star) {
  state.followBody=null;state.shipMotion.thrust=0;
  state.system=makeSystem(star.seed);state.save.currentSystem=star.seed;
  state.scene='system';state.save.scene='system';state.selected=null;
  const first=state.system.planets[0],pos=bodyPosition(first,state.save.days,state.system);
  state.save.ship={x:pos.x+60,y:pos.y+40};state.camera={...state.save.ship};
  state.zoom=.85;state.autopilot=null;state.save.chart={x:star.x,y:star.y};
  state.save.log.unshift({name:state.system.name,action:'Entered system',days:state.save.days});
  if(state.save.route.at(-1)!==star.seed)state.save.route.push(star.seed);
  state.save.route=state.save.route.slice(-40);
  toast(`Entering the ${state.system.name} system`);persist();updateUI();
}
function enterSurface(body) {
  if(!body.solid){toast('No solid surface here. Explore one of its moons.');return;}
  state.followBody=null;state.actorMotion={direction:'down',steps:0};
  state.scene='surface';state.save.scene='surface';state.save.landed=body.id;
  state.save.surface={x:50,y:35};state.camera={...state.save.surface};state.zoom=1.3;
  state.autopilot=null;markDiscovery(body);persist();updateUI();
}
function launch() {
  state.shipMotion={heading:-Math.PI/2,thrust:0};state.followBody=null;
  const body=findBody(state.save.landed);
  if(body){const p=bodyPosition(body,state.save.days,state.system);
    state.save.ship={x:p.x+visualRadius(body.diameter,body.kind)+44,y:p.y+12};}
  state.scene='system';state.save.scene='system';state.save.landed=null;
  state.camera={...state.save.ship};state.selected=body||null;state.zoom=.95;
  toast('Launch complete. The stars are yours.');persist();updateUI();
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
  if(!state.save)return;
  if(state.scene==='surface'){
    const sample=nearestSample();const d=sample?Math.hypot(sample.x-state.save.surface.x,sample.y-state.save.surface.y):Infinity;
    if(d<36){state.save.discoveries.push(sample.id);state.save.log.unshift({name:findBody(state.save.landed)?.name||'World',action:'Sample collected',days:state.save.days});
      toast('Sample secured · added to logbook');persist();updateUI();return;}
    if(Math.hypot(state.save.surface.x,state.save.surface.y)<62){launch();return;}
    state.autopilot={type:'surface',x:0,y:0};toast('Returning to lander');return;
  }
  if(state.scene==='system'){
    if(!state.selected || state.selected.kind==='star'){select(state.system.planets[0]);return;}
    const body=state.selected,pos=bodyPosition(body,state.save.days,state.system);
    const dist=Math.hypot(pos.x-state.save.ship.x,pos.y-state.save.ship.y);
    if(dist<visualRadius(body.diameter,body.kind)+48){enterSurface(body);return;}
    state.panUntil=0;state.followBody=null;
    state.autopilot={type:'body',id:body.id};toast(`Course set for ${body.name}`);return;
  }
  const star=state.selected;
  if(!star){select(currentStar());return;}
  const distance=Math.hypot(star.x-state.save.chart.x,star.y-state.save.chart.y);
  if(distance<38){enterSystem(star);return;}
  state.autopilot={type:'star',id:star.seed};toast(`Jump course set for ${starName(star.seed)}`);
}
$('primaryAction').onclick=primary;
$('secondaryAction').onclick=()=>showDetails(state.selected);
$('mapButton').onclick=()=>state.scene==='chart'?enterSystem(currentStar()):state.scene==='surface'?toast('Launch before opening the star chart.'):enterChart();
$('homeButton').onclick=()=>{state.panUntil=0;state.autopilot=null;
  state.camera={...(state.scene==='surface'?state.save.surface:state.scene==='chart'?state.save.chart:state.save.ship)};};
$('journalButton').onclick=showJournal;
$('zoneToggle').onclick=()=>{settings.zone=!settings.zone;saveSettings();updateUI();};
$('zoomIn').onclick=()=>zoom(1.22);$('zoomOut').onclick=()=>zoom(1/1.22);
$('fitSystem').onclick=()=>{
  if(state.scene!=='system')return;
  const outer=Math.max(...state.system.planets.map(p=>orbitRadius(p.au,state.system.star)+(p.moons.at(-1)?.orbitPx||visualRadius(p.diameter))))+60;
  state.camera={x:0,y:0};state.panUntil=Infinity;
  state.zoom=clamp(Math.min(state.width*.44,state.height*.37)/outer,.025,1);
  updateUI();
};
function zoom(factor){state.zoom=clamp(state.zoom*factor,state.scene==='system'?.025:state.scene==='surface'?.65:.34,2.4);$('zoomLabel').textContent=Math.round(state.zoom*100)+'%';}

function addMetric(parent,label,value) {
  const div=document.createElement('div');div.className='metric';
  const a=document.createElement('span'),b=document.createElement('strong');a.textContent=label;b.textContent=value;div.append(a,b);parent.append(div);
}
function diameterText(km){return Math.round(settings.units==='mi'?km/1.609344:km).toLocaleString()+' '+settings.units;}
function updateUI() {
  if(!state.save)return;
  const scene=state.scene,sys=state.system,sel=state.selected;
  $('modeLabel').textContent=scene==='chart'?'SECTOR / STAR CHART':scene==='surface'?'EXPEDITION / SURFACE':'SYSTEM / ORBITAL VIEW';
  $('placeLabel').textContent=scene==='chart'?'The Reach':scene==='surface'?findBody(state.save.landed)?.name||'Surface':sys.name;
  $('hint').textContent=scene==='chart'?'Select a star, then set a jump course.':scene==='surface'?'Collect samples and return to your lander.':`${sys.star.type} STAR · ${sys.planets.length} PLANETS`;
  $('zoneLegend').hidden=scene!=='system';$('zoneToggle').textContent=settings.zone?'VISIBLE':'HIDDEN';$('zoneToggle').setAttribute('aria-pressed',String(settings.zone));
  const list=$('bodyList'),listKey=`${scene}:${sys.seed}:${sel?.id||''}`;
  if(state.listKey!==listKey){
    const scroll=list.scrollLeft;list.replaceChildren();
    if(scene==='system')for(const body of allBodies()){
      const b=document.createElement('button');b.className='body-entry'+(body.kind==='moon'?' moon':'')+(sel?.id===body.id?' active':'');
      b.style.setProperty('--dot',body.color);b.innerHTML='<span class="body-dot"></span>';
      const name=document.createElement('span');name.textContent=body.name;const au=document.createElement('small');au.textContent=body.kind==='moon'?'MOON':body.au.toFixed(2)+' AU';
      b.append(name,au);b.onclick=()=>select(body);list.append(b);
    }
    list.scrollLeft=scroll;state.listKey=listKey;
  }
  $('bodyList').hidden=scene!=='system';
  const metric=$('targetMetrics');metric.replaceChildren();
  let title,text,tag,action,glyph,details=false;
  if(scene==='surface'){
    const body=findBody(state.save.landed),sample=nearestSample();
    const near=sample&&Math.hypot(sample.x-state.save.surface.x,sample.y-state.save.surface.y)<36;
    const landerNear=Math.hypot(state.save.surface.x,state.save.surface.y)<62;
    title=body?.name||'Surface';tag='SURFACE EXPEDITION';glyph='◆';
    text=near?'A mineral signature is within reach.':landerNear?'Your lander is nearby. Move to a glowing sample or launch.':'Explore the terrain. The beacon marks your lander.';
    action=near?'COLLECT SAMPLE':landerNear?'LAUNCH':'RETURN TO LANDER';
    addMetric(metric,'COLLECTED',String(state.save.discoveries.filter(id=>id.startsWith(body.id+':sample')).length));
    addMetric(metric,'TO LANDER',Math.round(Math.hypot(state.save.surface.x,state.save.surface.y))+' m');
  } else if(scene==='chart'){
    title=sel?starName(sel.seed):'Star chart';tag='JUMP NAVIGATION';glyph='✦';
    const distance=sel?Math.hypot(sel.x-state.save.chart.x,sel.y-state.save.chart.y):0;
    text=sel?'Travel to this star to enter its planetary system.':'Tap a star to chart a jump.';
    action=!sel?'SELECT A STAR':distance<38?'ENTER SYSTEM':'JUMP TO STAR';
    if(sel){addMetric(metric,'DISTANCE',Math.round(distance)+' units');addMetric(metric,'CLASS',makeSystem(sel.seed).star.type);details=true;}
  } else if(sel?.kind==='star'){
    title=sel.name;tag='STELLAR PRIMARY';glyph='✦';details=true;
    text='This star powers the orbital clock and sets the temperate band.';
    action='SELECT A WORLD';
    addMetric(metric,'CLASS',sel.type);addMetric(metric,'DIAMETER',Math.round(sel.diameter).toLocaleString()+' km');
  } else if(sel){
    title=sel.name;tag=sel.kind==='moon'?'NATURAL SATELLITE':'PLANETARY TARGET';glyph=sel.type==='gas'?'◌':'◉';details=true;
    const zone=habitableZone(sys.star.luminosity),inhab=sel.kind==='planet'&&sel.au>=zone.inner&&sel.au<=zone.outer;
    text=inhab?'Inside the temperate orbit band. Surface conditions still vary.':sel.kind==='moon'?'A small world orbiting its parent planet.':'Select a course, then descend when you reach orbit.';
    const p=bodyPosition(sel,state.save.days,sys);const distance=Math.hypot(p.x-state.save.ship.x,p.y-state.save.ship.y);
    action=distance<visualRadius(sel.diameter,sel.kind)+48?(sel.solid?'LAND':'NO SOLID SURFACE'):'TRAVEL TO '+sel.name.toUpperCase();
    if(!sel.solid)text='A giant atmosphere with no solid ground. Explore its moons for a landing site.';
    addMetric(metric,'DIAMETER',diameterText(sel.diameter));
    addMetric(metric,sel.kind==='moon'?'ORBIT':'YEAR',sel.period<100?sel.period.toFixed(1)+' days':Math.round(sel.period)+' days');
    if(inhab)addMetric(metric,'ZONE','TEMPERATE');
  } else {title='Chart a course';tag='FLIGHT COMPUTER';glyph='✧';text='Tap a world or pick one from the system list.';action='SELECT A WORLD';}
  $('targetName').textContent=title;$('targetTag').textContent=tag;$('targetText').textContent=text;$('targetGlyph').textContent=glyph;
  $('primaryAction').textContent=action;$('secondaryAction').hidden=!details;
  $('primaryAction').disabled=action==='NO SOLID SURFACE';
  $('fitSystem').hidden=scene!=='system';
  $('mapButton').querySelector('span').textContent=scene==='chart'?'RETURN TO SYSTEM':'STAR CHART';
  $('mapButton').disabled=scene==='surface';
  const date=new Date(EPOCH+state.save.days*DAY_MS);
  $('clock').textContent=date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',timeZone:'UTC'}).toUpperCase()+' '+date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
  $('clock').title='1 real minute = 1 game hour'+(settings.paused?' · paused':'');
  $('statusText').textContent=scene==='chart'?'JUMP DRIVE // ONLINE':scene==='surface'?'SUIT // NOMINAL':`SYSTEM // ${sys.name.toUpperCase()}`;
  $('zoomLabel').textContent=Math.round(state.zoom*100)+'%';
  const pos=scene==='surface'?state.save.surface:scene==='chart'?state.save.chart:state.save.ship;
  $('telemetry').hidden=!settings.showCoords&&!settings.showFPS;
  $('telemetry').textContent=[settings.showCoords?`X ${Math.round(pos.x)} · Y ${Math.round(pos.y)}`:'',settings.showFPS?`${Math.round(state.fps)} FPS`:''].filter(Boolean).join('  /  ');
}
function setModal(eyebrow,title,content) {
  state.previousFocus=document.activeElement;resetInput();
  $('modalEyebrow').textContent=eyebrow;$('modalTitle').textContent=title;
  $('modalContent').replaceChildren(content);$('modal').hidden=false;$('modal').classList.add('visible');
  $('modalClose').focus();
}
function closeModal(){$('modal').hidden=true;$('modal').classList.remove('visible');state.previousFocus?.focus();}
$('modalClose').onclick=closeModal;$('modal').onclick=e=>{if(e.target===$('modal'))closeModal();};
function detailTile(grid,key,value){const tile=document.createElement('div');tile.className='detail-tile';const a=document.createElement('small'),b=document.createElement('strong');a.textContent=key;b.textContent=value;tile.append(a,b);grid.append(tile);}
function showDetails(body) {
  if(!body)return;const box=document.createElement('div');const grid=document.createElement('div');grid.className='detail-grid';
  if(state.scene==='chart'){
    const sys=makeSystem(body.seed);detailTile(grid,'SPECTRAL CLASS',sys.star.type);detailTile(grid,'SOLAR MASS',sys.star.mass.toFixed(2)+' M☉');
    detailTile(grid,'LUMINOSITY',sys.star.luminosity.toFixed(2)+' L☉');detailTile(grid,'PLANETS',String(sys.planets.length));
  }else if(body.kind==='star'){
    detailTile(grid,'SPECTRAL CLASS',body.type);detailTile(grid,'DIAMETER',diameterText(body.diameter));
    detailTile(grid,'SOLAR MASS',body.mass.toFixed(2)+' M☉');detailTile(grid,'LUMINOSITY',body.luminosity.toFixed(2)+' L☉');
  }else{
    detailTile(grid,'DIAMETER',diameterText(body.diameter));detailTile(grid,'ORBIT PERIOD',body.period.toFixed(2)+' days');
    detailTile(grid,'TYPE',body.type.toUpperCase());detailTile(grid,body.kind==='moon'?'HOST':'DISTANCE',body.kind==='moon'?findBody(body.parent)?.name||'Planet':body.au.toFixed(3)+' AU');
  }
  if(body.rotationDays)detailTile(grid,'ROTATION',(Math.abs(body.rotationDays)*24).toFixed(1)+' h'+(body.rotationDays<0?' · retrograde':''));
  box.append(grid);
  const note=document.createElement('p');note.textContent=state.scene==='chart'?'Stellar systems use mass based luminosity and Kepler orbital periods. This chart uses game distances for travel.':
    'Physical values are shown here. On screen, body sizes and orbital distances are compressed for navigation; the temperate band marks possible liquid water from stellar light alone, not guaranteed habitability.';
  box.append(note);
  if(settings.cheats && (state.scene==='chart'||body.kind!=='star')){const jump=document.createElement('button');jump.className='button subtle';jump.textContent='INSTANT TRAVEL';
    jump.onclick=()=>{closeModal();if(state.scene==='chart')enterSystem(body);else if(body.kind!=='star'){
      const pos=bodyPosition(body,state.save.days,state.system);state.save.ship={x:pos.x+visualRadius(body.diameter,body.kind)+35,y:pos.y};state.camera={...state.save.ship};state.panUntil=0;state.zoom=1;updateUI();}
    };box.append(jump);}
  setModal('ATLAS / OBJECT DETAILS',state.scene==='chart'?starName(body.seed):body.name,box);
}
function showJournal() {
  const box=document.createElement('div');const p=document.createElement('p');p.textContent=`${state.save.discoveries.length} discoveries recorded in ${state.save.name}.`;
  box.append(p);for(const entry of state.save.log.slice(0,30)){
    const item=document.createElement('div');item.className='log-item';item.textContent=`${entry.action} · ${entry.name}`;
    const date=document.createElement('small');date.textContent=new Date(EPOCH+entry.days*DAY_MS).toLocaleDateString('en-GB',{timeZone:'UTC'});item.append(date);box.append(item);
  }if(!state.save.log.length){const empty=document.createElement('p');empty.textContent='Your discoveries will appear here.';box.append(empty);}
  setModal('CAPTAIN’S LOG','Voyage logbook',box);
}
function openSettings(){
  const box=document.createElement('div');box.className='settings-content';
  const intro=document.createElement('p');intro.textContent='1 real minute = 1 game hour. Earth rotates once in 24 real minutes. Time pauses in menus and while the app is in the background.';box.append(intro);
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
    const sync=()=>{if(kind==='range')value.textContent=key==='volume'?Math.round(settings[key]*100)+'%':String(settings[key]);};sync();
    input.addEventListener(kind==='range'?'input':'change',()=>{
      settings[key]=kind==='checkbox'?input.checked:typeof DEFAULT_SETTINGS[key]==='number'?Number(input.value):input.value;
      if(key==='pixelSize')terrain.clear();sync();saveSettings();applySettings();
    });
    const wrap=document.createElement('span');wrap.className='setting-value';wrap.append(input);if(kind==='range')wrap.append(value);row.append(wrap);box.append(row);
  }
  heading('Sound & sky');control('music','Original soundtrack','checkbox');control('volume','Music volume','range',[0,1,.05]);
  control('starMotion','Moving starfield','checkbox');control('twinkle','Star twinkle','checkbox');control('reducedMotion','Reduce decorative motion','checkbox');
  heading('View & display');control('orbits','Orbit paths','checkbox');control('zone','Goldilocks zone','checkbox');control('labels','Planet & moon labels','checkbox');
  control('travelLines','Star chart travel trail','checkbox');control('showCoords','Coordinates','checkbox');control('showFPS','Frame rate','checkbox');
  control('units','Distance units','select',[['km','Kilometres'],['mi','Miles']]);
  control('pixelSize','Terrain detail','select',[[2,'Fine pixels'],[3,'Balanced'],[4,'Low power']]);
  control('resolution','Canvas resolution','select',[['auto','Automatic'],['1','1× · low power'],['2','2× · sharp']]);
  heading('Controls');control('controls','Input mode','select',[['auto','Automatic'],['touch','Touch joystick'],['desktop','Keyboard / mouse']]);
  control('joyX','Joystick position (%)','range',[8,92,1]);control('joyOffset','Joystick height (px)','range',[-70,120,1]);
  const hint=document.createElement('p');hint.textContent='WASD / arrows to move · Space to interact · drag to pan · pinch or + / − to zoom · ⌗ to fit the whole system.';box.append(hint);
  heading('Voyage');control('paused','Pause simulation clock','checkbox');control('cheats','Enable instant travel in Details','checkbox');
  if(state.save){
    const save=document.createElement('button');save.className='button subtle';save.textContent='SAVE & MAIN MENU';
    save.onclick=()=>{persist();closeModal();state.scene='menu';state.save=null;state.keys.clear();$('app').hidden=true;$('welcome').classList.add('visible');renderSaves();};box.append(save);
    const exportButton=document.createElement('button');exportButton.className='button subtle';exportButton.textContent='EXPORT SAVE';
    exportButton.onclick=()=>{persist();const blob=new Blob([JSON.stringify(state.save,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='spacebitz-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};box.append(exportButton);
  }
  setModal('FLIGHT OPTIONS','Settings',box);
}
$('settingsOpen').onclick=openSettings;$('menuSettings').onclick=openSettings;

function targetPoint() {
  if(!state.autopilot)return null;
  if(state.autopilot.type==='surface')return {x:0,y:0};
  if(state.autopilot.type==='body'){const b=findBody(state.autopilot.id);return b?bodyPosition(b,state.save.days,state.system):null;}
  if(state.autopilot.type==='star'){const s=starAt(state.autopilot.id);return {x:s.x,y:s.y};}
  return null;
}
function update(dt,clockDt=dt) {
  if(!state.save || $('modal').classList.contains('visible'))return;
  state.save.days=advanceDays(state.save.days,clockDt,settings.paused);
  const dx=Number(state.keys.has('ArrowRight')||state.keys.has('d'))-Number(state.keys.has('ArrowLeft')||state.keys.has('a'))+state.joy.x;
  const dy=Number(state.keys.has('ArrowDown')||state.keys.has('s'))-Number(state.keys.has('ArrowUp')||state.keys.has('w'))+state.joy.y;
  const magnitude=Math.hypot(dx,dy), manual=magnitude>.08;
  const p=state.scene==='surface'?state.save.surface:state.scene==='chart'?state.save.chart:state.save.ship;
  const before={...p};
  if(manual){let speed=state.scene==='surface'?90:state.scene==='chart'?180:260;
    if(state.scene==='surface'&&terrain.sampler(findBody(state.save.landed))(p.x,p.y).water)speed*=.45;
    p.x+=dx/Math.max(1,magnitude)*speed*dt/1000;p.y+=dy/Math.max(1,magnitude)*speed*dt/1000;
    state.autopilot=null;state.followBody=null;state.panUntil=0;
  }else if(state.autopilot){const destination=targetPoint();
    if(destination){
      const goal=state.scene==='system'?navigationTarget(p,destination,visualRadius(state.system.star.diameter,'star')):destination;
      const vx=goal.x-p.x,vy=goal.y-p.y,d=Math.hypot(vx,vy),remaining=Math.hypot(destination.x-p.x,destination.y-p.y);
      const arrival=state.scene==='system'?visualRadius(findBody(state.autopilot.id)?.diameter||10000,findBody(state.autopilot.id)?.kind)+38:state.scene==='chart'?22:32;
      if(remaining<=arrival+.2){
        if(state.scene==='system')state.followBody={id:state.autopilot.id,x:p.x-destination.x,y:p.y-destination.y};
        state.autopilot=null;updateUI();toast(state.scene==='chart'?'Star reached · enter the system':state.scene==='surface'?'Lander reached':'Orbit achieved · station keeping active');
      }else if(d>0){const step=Math.min(goal===destination?remaining-arrival:d,(state.scene==='surface'?110:state.scene==='chart'?360:500)*dt/1000);
        p.x+=vx/d*step;p.y+=vy/d*step;state.panUntil=0;}
    }else state.autopilot=null;
  }else if(state.scene==='system'&&state.followBody){
    const body=findBody(state.followBody.id);if(body){const pos=bodyPosition(body,state.save.days,state.system);p.x=pos.x+state.followBody.x;p.y=pos.y+state.followBody.y;}
  }
  if(state.scene==='system'){
    const safe=visualRadius(state.system.star.diameter,'star')+22,d=Math.hypot(p.x,p.y);
    if(d<safe){const a=Math.atan2(p.y,p.x);p.x=Math.cos(a)*safe;p.y=Math.sin(a)*safe;}
  }
  const motion=state.scene==='surface'?state.actorMotion:state.shipMotion;
  updateMotion(motion,p.x-before.x,p.y-before.y,dt);
  if(state.followBody && !manual && !state.autopilot){motion.thrust=0;motion.moving=false;}
  if(performance.now()>state.panUntil){const ease=1-Math.exp(-dt/145);state.camera.x+=(p.x-state.camera.x)*ease;state.camera.y+=(p.y-state.camera.y)*ease;}
  state.elapsed+=dt;
  if(state.elapsed>4500){state.elapsed=0;persist();}
}

// Canvas painting: physical orbital periods in the model, compressed sizes in the view.
const circle=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU);};
const screen=(x,y)=>({x:state.width/2+(x-state.camera.x)*state.zoom,y:state.height/2+(y-state.camera.y)*state.zoom});
const world=(x,y)=>({x:(x-state.width/2)/state.zoom+state.camera.x,y:(y-state.height/2)/state.zoom+state.camera.y});
function backdrop(now) {
  const {width:w,height:h}=state;
  const grad=ctx.createRadialGradient(w*.5,h*.42,10,w*.5,h*.42,Math.max(w,h)*.9);
  grad.addColorStop(0,'#080b12');grad.addColorStop(.55,'#03050a');grad.addColorStop(1,'#000104');
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  ctx.save();ctx.globalAlpha=.11;const neb=ctx.createRadialGradient(w*.7,h*.4,15,w*.7,h*.4,w*.48);
  neb.addColorStop(0,'#338e9c');neb.addColorStop(1,'#338e9c00');ctx.fillStyle=neb;ctx.fillRect(0,0,w,h);ctx.restore();
  const drift=settings.starMotion&&!settings.reducedMotion;
  for(const star of state.stars){
    let x,y,z=star.depth;
    if(state.scene==='menu'){
      if(drift)z=((star.depth-now*.000019*star.speed)%1+1)%1;
      x=w/2+(star.x-.5)*w*.75/(z+.25);y=h/2+(star.y-.5)*h*.75/(z+.25);
    }else{
      const motion=drift?now*.002*star.speed:0;
      x=((star.x*w-state.camera.x*.025*(1+z)+motion)%w+w)%w;
      y=((star.y*h-state.camera.y*.025*(1+z)+motion*.22)%h+h)%h;
    }
    if(x<0||x>w||y<0||y>h)continue;
    const twinkle=settings.twinkle&&!settings.reducedMotion?.55+.45*Math.sin(now*.002*star.speed+star.phase):.85;
    const alpha=clamp(star.alpha*twinkle+(1-z)*.18,.1,1),size=Math.max(1,Math.round(star.size*(1.9-z)));
    x=Math.round(x/2)*2;y=Math.round(y/2)*2;
    ctx.fillStyle=`rgba(${star.color<.15?'137,197,230':star.color>.9?'255,218,153':'210,232,232'},${alpha})`;
    ctx.fillRect(x,y,size,size);
    if(size>=3&&twinkle>.83){ctx.globalAlpha=.45;ctx.fillRect(x-2,y+1,size+4,1);ctx.fillRect(x+1,y-2,1,size+4);ctx.globalAlpha=1;}
  }
}
function drawOrbit(x,y,r,color='#a3bed3') {
  const p=screen(x,y);ctx.strokeStyle=color;ctx.lineWidth=1;ctx.globalAlpha=.22;
  circle(p.x,p.y,r*state.zoom);ctx.stroke();ctx.globalAlpha=1;
}
function label(text,x,y,selected=false) {
  ctx.font=`${selected?'600':'500'} 11px 'Space Grotesk',sans-serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';const width=ctx.measureText(text).width+18;
  ctx.fillStyle=selected?'#264b59e8':'#0b1b30d9';ctx.strokeStyle=selected?'#6fe1cf80':'#64829750';
  ctx.beginPath();ctx.roundRect(x-width/2,y-12,width,23,6);ctx.fill();ctx.stroke();
  ctx.fillStyle=selected?'#e8fff9':'#c3d5e2';ctx.fillText(text,x,y);
}
function drawSelection(x,y,r,now) {
  ctx.save();ctx.translate(x,y);ctx.rotate(settings.reducedMotion?0:now*.00035);ctx.strokeStyle='#8ff5d9';ctx.lineWidth=1.5;
  ctx.setLineDash([12,9]);circle(0,0,r+11);ctx.stroke();ctx.setLineDash([]);ctx.restore();
}
function drawStar(x,y,r,color,now,body=null) {
  if(x<-r*4||x>state.width+r*4||y<-r*4||y>state.height+r*4)return;
  const glow=ctx.createRadialGradient(x,y,0,x,y,r*3.6);
  glow.addColorStop(0,color+'c9');glow.addColorStop(.28,color+'69');glow.addColorStop(1,color+'00');
  ctx.fillStyle=glow;circle(x,y,r*3.6);ctx.fill();
  ctx.save();ctx.globalAlpha=.4+.08*Math.sin(now*.002);
  ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-r*3,y);ctx.lineTo(x+r*3,y);ctx.moveTo(x,y-r*3);ctx.lineTo(x,y+r*3);ctx.stroke();ctx.restore();
  const core=ctx.createRadialGradient(x-r*.3,y-r*.3,0,x,y,r);
  core.addColorStop(0,'#fffefa');core.addColorStop(.55,color);core.addColorStop(1,'#bd6552');ctx.fillStyle=core;circle(x,y,r);ctx.fill();
  if(body){ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(celestialSprite(body,state.save.days),x-r,y-r,r*2,r*2);ctx.restore();}
}
function drawPlanet(body,p,now) {
  const sr=visualRadius(body.diameter,body.kind)*state.zoom;
  if(p.x<-sr-100||p.x>state.width+sr+100||p.y<-sr-100||p.y>state.height+sr+100)return;
  const r=Math.max(3,sr);const selected=state.selected?.id===body.id;
  if(body.name==='Saturn' || (body.type==='gas'&&hash(body.id)%3===0)){
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.31);ctx.strokeStyle='#d6cbad88';ctx.lineWidth=Math.max(2,r*.16);
    ctx.beginPath();ctx.ellipse(0,0,r*1.85,r*.48,0,0,TAU);ctx.stroke();ctx.restore();
  }
  ctx.save();ctx.shadowColor=body.color;ctx.shadowBlur=Math.min(30,r*.7);circle(p.x,p.y,r);ctx.fillStyle=body.color;ctx.fill();ctx.restore();
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(celestialSprite(body,state.save.days,bodyPosition(body,state.save.days,state.system)),p.x-r,p.y-r,2*r,2*r);ctx.restore();
  ctx.strokeStyle='#d9f8fb42';ctx.lineWidth=1;circle(p.x,p.y,r);ctx.stroke();
  if(selected){drawSelection(p.x,p.y,r,now);label(body.name,p.x,p.y-r-25,true);}
  else if(settings.labels&&(state.zoom>.35 || body.kind==='planet'))label(body.name,p.x,p.y-r-17);
}
function drawSystem(now) {
  const sys=state.system,days=state.save.days,zone=habitableZone(sys.star.luminosity);
  const center=screen(0,0);
  if(settings.zone){ctx.save();ctx.fillStyle='#67e5ad0b';ctx.strokeStyle='#6de6ad36';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(center.x,center.y,orbitRadius(zone.outer,sys.star)*state.zoom,0,TAU);
    ctx.arc(center.x,center.y,orbitRadius(zone.inner,sys.star)*state.zoom,0,TAU,true);
    ctx.fill('evenodd');ctx.setLineDash([3,7]);circle(center.x,center.y,orbitRadius(zone.inner,sys.star)*state.zoom);ctx.stroke();
    circle(center.x,center.y,orbitRadius(zone.outer,sys.star)*state.zoom);ctx.stroke();ctx.restore();}
  if(settings.orbits)for(const planet of sys.planets){drawOrbit(0,0,orbitRadius(planet.au,sys.star));
    const host=bodyPosition(planet,days,sys);
    for(const moon of planet.moons)drawOrbit(host.x,host.y,moon.orbitPx,'#9ebcc4');
  }
  drawStar(center.x,center.y,visualRadius(sys.star.diameter,'star')*state.zoom,sys.star.color,now,sys.star);
  if(state.selected?.id===sys.star.id)drawSelection(center.x,center.y,visualRadius(sys.star.diameter,'star')*state.zoom,now);
  if(settings.labels&&center.x>-60&&center.x<state.width+60&&center.y>-60&&center.y<state.height+60)label(sys.star.name,center.x,center.y-visualRadius(sys.star.diameter,'star')*state.zoom-25);
  for(const planet of sys.planets){const pos=bodyPosition(planet,days,sys);drawPlanet(planet,screen(pos.x,pos.y),now);
    for(const moon of planet.moons){const mp=bodyPosition(moon,days,sys);drawPlanet(moon,screen(mp.x,mp.y),now);}}
  if(state.autopilot?.type==='body'){const body=findBody(state.autopilot.id);if(body){const end=bodyPosition(body,days,sys),a=screen(state.save.ship.x,state.save.ship.y),b=screen(end.x,end.y);
    ctx.strokeStyle='#77e2d586';ctx.lineWidth=1;ctx.setLineDash([5,8]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);}}
  const ship=screen(state.save.ship.x,state.save.ship.y);paintShip(ctx,ship.x,ship.y,state.shipMotion,now);
}
function drawChart(now) {
  const stars=nearbyStars();
  if(settings.travelLines && state.save.route.length>1){ctx.save();ctx.strokeStyle='#8ebcab50';ctx.setLineDash([3,7]);ctx.beginPath();
    state.save.route.forEach((seed,i)=>{const star=starAt(seed),p=screen(star.x,star.y);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.stroke();ctx.restore();}
  for(const star of stars){const p=screen(star.x,star.y);if(p.x<-45||p.x>state.width+45||p.y<-45||p.y>state.height+45)continue;
    const type=star.seed==='sol'?'#ffcf7d':['#ff9d8d','#f5dfab','#c2daff'][hash(star.seed)%3];
    drawStar(p.x,p.y,star.id==='origin'?7:4,type,now);
    if(state.selected?.seed===star.seed){drawSelection(p.x,p.y,9,now);label(starName(star.seed),p.x,p.y-27,true);}
    else if(star.id==='origin')label(starName(star.seed)+' · HOME',p.x,p.y-26);
  }
  if(state.autopilot?.type==='star'){const s=starAt(state.autopilot.id);const a=screen(state.save.chart.x,state.save.chart.y),b=screen(s.x,s.y);
    ctx.strokeStyle='#76dac680';ctx.lineWidth=1;ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);}
  const ship=screen(state.save.chart.x,state.save.chart.y);paintShip(ctx,ship.x,ship.y,state.shipMotion,now,36);
  ctx.font='10px DM Mono,monospace';ctx.fillStyle='#91b1be';ctx.fillText('LOCAL SECTOR  /  DISTANCES ARE GAME UNITS',state.width/2,Math.max(70,state.height*.14));
}
function drawGround(now) {
  const body=findBody(state.save.landed);if(!body)return;
  terrain.draw(ctx,body,state.camera,state.zoom,state.width,state.height,settings.pixelSize);
  const sampleTerrain=terrain.sampler(body),cell=110;
  const hw=state.width/state.zoom/2,hh=state.height/state.zoom/2;
  // Sparse, independently placed vegetation and rocks. Placement is keyed to
  // world space, not to the terrain cache or the visible screen.
  for(let cy=Math.floor((state.camera.y-hh)/cell)-1;cy<=Math.floor((state.camera.y+hh)/cell)+1;cy++)
    for(let cx=Math.floor((state.camera.x-hw)/cell)-1;cx<=Math.floor((state.camera.x+hw)/cell)+1;cx++){
      const rand=rng(`props:${body.id}:${cx},${cy}`);if(rand()<.38)continue;
      const wx=(cx+rand())*cell,wy=(cy+rand())*cell,t=sampleTerrain(wx,wy);
      if(t.water||Math.hypot(wx,wy)<85)continue;
      const p=screen(wx,wy),z=state.zoom,tree=t.biome==='forest'&&rand()<.65;
      ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(z,z);
      ctx.fillStyle='#0d243447';ctx.fillRect(-5,2,14,4);
      if(tree){
        ctx.fillStyle='#4f493b';ctx.fillRect(-2,-2,4,9);
        ctx.fillStyle='#244c43';ctx.fillRect(-9,-13,18,9);ctx.fillRect(-6,-18,12,17);
        ctx.fillStyle='#4d8054';ctx.fillRect(-6,-17,9,9);ctx.fillRect(-9,-11,10,5);
        ctx.fillStyle='#83a868';ctx.fillRect(-4,-16,5,3);
      }else{
        const size=3+Math.floor(rand()*5);ctx.fillStyle='#414d53';ctx.fillRect(-size,-size,size*2,size+4);
        ctx.fillStyle=body.type==='desert'?'#bf9466':'#a5b1b2';ctx.fillRect(-size,-size,size+3,3);
        ctx.fillStyle=body.type==='desert'?'#86634f':'#687f88';ctx.fillRect(-size+2,-size+3,size*2-2,size-1);
      }
      ctx.restore();
    }
  const lander=screen(0,0);paintShip(ctx,lander.x,lander.y,{},now,62,true);
  const astronaut=screen(state.save.surface.x,state.save.surface.y);
  paintAstronaut(ctx,astronaut.x,astronaut.y,state.actorMotion);
  const sunlight=Math.cos(rotationAngle(body,state.save.days)-(body.phase||0));
  ctx.fillStyle=`rgba(6,16,44,${.08+(1-sunlight)*.18})`;ctx.fillRect(0,0,state.width,state.height);
  for(const sample of surfaceSamples()){
    if(state.save.discoveries.includes(sample.id))continue;const p=screen(sample.x,sample.y);
    if(p.x<0||p.x>state.width||p.y<0||p.y>state.height)continue;
    const pulse=settings.reducedMotion?1:.8+.2*Math.sin(now*.004+hash(sample.id));
    ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.globalAlpha=pulse;
    ctx.shadowColor='#60e9cd';ctx.shadowBlur=12;
    ctx.fillStyle='#377e9a';ctx.fillRect(-5,-3,10,8);ctx.fillStyle='#6cddc8';ctx.fillRect(-3,-8,6,13);
    ctx.fillStyle='#d6ffe1';ctx.fillRect(-2,-6,2,7);ctx.restore();
  }
  if(Math.hypot(lander.x-state.width/2,lander.y-state.height/2)>125){
    const a=Math.atan2(lander.y-state.height/2,lander.x-state.width/2),r=Math.min(state.width,state.height)*.3;
    const x=state.width/2+Math.cos(a)*r,y=state.height/2+Math.sin(a)*r;
    ctx.fillStyle='#8ee9d5';ctx.font='11px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText('⌖ LANDER',x,y);
  }
}
function frame(now) {
  const realDt=Math.max(0,now-state.last),dt=Math.min(100,realDt);state.last=now;
  if(realDt>0)state.fps+=(1000/realDt-state.fps)*.06;
  if(!document.hidden){
    if(state.save)update(dt,realDt);
    ctx.setTransform(state.dpr,0,0,state.dpr,0,0);backdrop(now);
    if(state.scene==='system')drawSystem(now);
    else if(state.scene==='chart')drawChart(now);
    else if(state.scene==='surface')drawGround(now);
    if(state.save && now-state.lastUI>300){state.lastUI=now;updateUI();}
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange',()=>{state.last=performance.now();music.visibility(document.hidden);if(document.hidden){resetInput();persist();}});
window.addEventListener('pagehide',persist);

// Pointer picking and camera panning. A tap selects; a drag pans; two fingers pinch.
const pointers=new Map();let gesture=null;
canvas.addEventListener('pointerdown',e=>{if(!state.save||$('modal').classList.contains('visible'))return;
  canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1)gesture={x:e.clientX,y:e.clientY,moved:false};
  if(pointers.size===2){gesture=null;const [a,b]=[...pointers.values()];state.pinch=Math.hypot(a.x-b.x,a.y-b.y);}
});
canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()],dist=Math.hypot(a.x-b.x,a.y-b.y);
    if(state.pinch)zoom(dist/state.pinch);state.pinch=dist;return;}
  if(gesture){if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>7)gesture.moved=true;
    if(gesture.moved){state.camera.x-=(e.clientX-old.x)/state.zoom;state.camera.y-=(e.clientY-old.y)/state.zoom;
      state.panUntil=performance.now()+2500;}}
});
function pick(e){const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
  if(state.scene==='system'){
    const matches=allBodies().map(body=>{const pos=bodyPosition(body,state.save.days,state.system),p=screen(pos.x,pos.y);
      return {body,d:Math.hypot(x-p.x,y-p.y),radius:visualRadius(body.diameter,body.kind)*state.zoom};})
      .filter(v=>v.d<Math.max(20,v.radius+10)).sort((a,b)=>a.d-b.d);
    if(matches.length)select(matches[0].body);
    else{const star=screen(0,0);if(Math.hypot(x-star.x,y-star.y)<Math.max(24,visualRadius(state.system.star.diameter,'star')*state.zoom+8))select(state.system.star);}
  }else if(state.scene==='chart'){
    const match=nearbyStars().map(star=>{const p=screen(star.x,star.y);return {star,d:Math.hypot(x-p.x,y-p.y)};})
      .filter(v=>v.d<26).sort((a,b)=>a.d-b.d)[0];if(match)select(match.star);
  }
}
canvas.addEventListener('pointerup',e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);
  if(gesture&&!gesture.moved&&pointers.size===0)pick(e);gesture=null;state.pinch=null;});
canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;state.pinch=null;});
canvas.addEventListener('wheel',e=>{if(!state.save)return;e.preventDefault();zoom(e.deltaY<0?1.12:1/1.12);},{passive:false});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if($('modal').classList.contains('visible'))closeModal();return;}
  if($('modal').classList.contains('visible')){
    if(e.key==='Tab'){
      const focusable=[...$('modal').querySelectorAll('button,input,select,a[href]')].filter(el=>!el.disabled&&!el.hidden);
      const first=focusable[0],last=focusable.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }return;
  }
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  if(!state.save)return;
  const k=e.key.length===1?e.key.toLowerCase():e.key;
  if(k===' '&&['BUTTON','A'].includes(document.activeElement?.tagName))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' ','+','-','='].includes(k))e.preventDefault();
  if(k==='+'||k==='=')zoom(1.2);else if(k==='-')zoom(1/1.2);else if(k===' '){if(!e.repeat)primary();}
  else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(k))state.keys.add(k);
});
window.addEventListener('keyup',e=>state.keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
window.addEventListener('blur',resetInput);
const joy=$('joystick'),stick=$('stick');let joyPointer=null;
function resetInput(){state.keys.clear();state.joy={x:0,y:0};joyPointer=null;stick.style.setProperty('--jx','0px');stick.style.setProperty('--jy','0px');}
function moveJoy(e){const r=joy.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;
  const limit=r.width*.33,d=Math.hypot(x,y),scale=d>limit?limit/d:1;
  state.joy={x:x*scale/limit,y:y*scale/limit};stick.style.setProperty('--jx',x*scale+'px');stick.style.setProperty('--jy',y*scale+'px');}
joy.addEventListener('pointerdown',e=>{if(joyPointer!==null)return;joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);moveJoy(e);});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)moveJoy(e);});
function releaseJoy(e){if(e.pointerId!==joyPointer)return;joyPointer=null;state.joy={x:0,y:0};stick.style.setProperty('--jx','0px');stick.style.setProperty('--jy','0px');}
joy.addEventListener('pointerup',releaseJoy);joy.addEventListener('pointercancel',releaseJoy);
joy.addEventListener('lostpointercapture',releaseJoy);
