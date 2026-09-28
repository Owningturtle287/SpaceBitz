import {TAU, DAY_MS, EPOCH, currentDays, advanceDays, rotationAngle, clamp, hash, rng, orbitRadius, visualRadius,
  habitableZone, makeSystem, bodyPosition, galaxyStars, starName, starAppearance, orbitPoint, orbitalElements} from './model.js';
import {DEFAULT_SETTINGS,normalizeSettings} from './settings.js';
import {TerrainRenderer} from './terrain.js';
import {paintShip,paintAstronaut} from './sprites.js';
import {updateMotion,navigationTarget} from './motion.js';
import {celestialSprite} from './celestial.js';
import {paintStellarSurface} from './stellar.js';
import {canvasContextOptions,clearFrame,backgroundPosition,strokeEllipse,circleGeometry,fillAnnulus,fillDisk,drawImageInView,lineInView} from './rendering.js';
import {SURFACE_UNIT,CHART_UNIT,LANDER_SIZE,sceneUnit,gridCell,gridStride,formatDistance,formatCoordinates,formatSystemKm,formatDiameter} from './scale.js';
import {migrateLayout,systemFitZoom,travelSpeed,centerZoomAt} from './navigation.js';

const $ = id => document.getElementById(id);
const canvas = $('sky');
const ctx = canvas.getContext('2d', canvasContextOptions(navigator.userAgent));
const SAVE_KEY = 'spacebitz:field:v1';
const SETTINGS_KEY = 'spacebitz:field:settings';
const settings = normalizeSettings({
  reducedMotion:window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  ...readJSON(SETTINGS_KEY,{})});
const terrain=new TerrainRenderer();
const musicAudio=$('soundtrackAudio');
let musicStarted=false,musicUnlockHandler=null;

function clearMusicUnlock(){
  if(!musicUnlockHandler)return;
  document.removeEventListener('pointerdown',musicUnlockHandler);
  document.removeEventListener('keydown',musicUnlockHandler);
  musicUnlockHandler=null;
}
function armMusicUnlock(){
  if(musicUnlockHandler||!settings.music)return;
  musicUnlockHandler=()=>{
    clearMusicUnlock();
    if(settings.music&&musicAudio.paused)playMusic();
  };
  document.addEventListener('pointerdown',musicUnlockHandler,{passive:true,once:true});
  document.addEventListener('keydown',musicUnlockHandler,{passive:true,once:true});
}
function playMusic(){
  if(!settings.music)return;
  musicAudio.volume=settings.volume;
  let result;
  try{result=musicAudio.play();}
  catch{armMusicUnlock();return;}
  if(result?.then)result.then(clearMusicUnlock).catch(armMusicUnlock);
}
function beginMusic(){
  if(musicStarted)return;
  musicStarted=true;
  musicAudio.loop=true;
  try{musicAudio.currentTime=0;}catch{}
  playMusic();
}
function stopMusic(){
  clearMusicUnlock();
  musicAudio.pause();
  try{musicAudio.currentTime=0;}catch{}
}
function applyMusicSetting(){
  musicAudio.volume=settings.volume;
  if(!settings.music){stopMusic();return;}
  if(musicStarted&&musicAudio.paused){try{musicAudio.currentTime=0;}catch{}playMusic();}
}
beginMusic();

const CHANGELOG=[
  {version:'1.5.2',items:["Added a saved GRID ON/OFF toggle beside coordinates and in Settings; the grid defaults off while selected squares and waypoint routes remain usable.", "Coordinates now display whole metres, light-seconds or light-years. Celestial diameters always display kilometres; travel-distance conversions are unchanged.", "Warp Drive stays pulled to the right throughout interstellar travel and returns on entering a system.", "Set panel and control backgrounds to 25% opacity while retaining solid labels, icons and joystick thumb. Shifted landscape joystick and warp controls nearer the lower corners.", "Rebuilt the Center reticle and added a smooth, interruptible ship zoom after immediate system-camera centering, respecting reduced motion.", "Corrected sideways walking contact and swing phases, articulated the knees, and replaced sideways front/back boots with centred toe and heel details."]},
  {version:'1.5.1',items:[
    'Fixed oversized orbit and zone drawing after the physical-scale update: only visible screen-space arcs, shading, selection rings and dashed routes are submitted to the renderer.',
    'Cropped enlarged planet and star textures before drawing, explicitly reset each frame to opaque space, and removed the redundant full-screen background texture.',
    'Fixed WebKit high-DPI startup scaling with its verified software canvas path; other browsers retain accelerated rendering.',
    'Reduced stellar texture work and reused consecutive animation frames while retaining smooth convection, evolving spots and flares.',
    'Decoupled background-star drift from ship movement, station keeping, camera panning and zoom. Background stars follow their own paths.',
    'Redesigned Warp Drive with a red pixel knob, shaded metal base and a pivoting handle that pulls during engagement.',
    'Added bounded-rendering regression tests and Chromium/WebKit startup, zoom, screen-clearing and warp checks as deployment gates. Existing saves and fixed distance scales are retained.',
  ]},
  {version:'1.5.0',items:[
    'Made menus, panels and controls smaller and translucent, with stepped pixel corners. Coordinates now sit directly below the clock with matching styling.',
    'Rebuilt Warp Drive as an animated lever with engagement and transit states, including a reduced-motion alternative.',
    'Made the standing astronaut one-third of the parked ship’s visible height. Each surface square matches that height and permanently represents one metre.',
    'Added selectable coordinate squares and Go Here navigation, including highlighted destinations, distance readouts and exact waypoint arrival.',
    'Standardized surface measurements to metres/kilometres, system measurements to light-seconds/AU (500 ls per AU), and chart measurements to light-years. Removed the units preference.',
    'Tripled Sol’s visual radius, corrected its mean diameter to 1,391,400 km, and applied one linear physical scale to every star, planet, moon and orbital distance.',
    'Added JPL orbital inclinations/nodes and matching projected elliptical paths, physical moon orbital distances, a Fit System command, Focus View, wider zoom and faster long-distance travel.',
    'Added smoothly blended stellar convection, small growing/fading sunspots and occasional flare animation. Stellar activity timing is artistic; Sol planet positions are approximate and moon phases remain illustrative.',
    'Migrated older compressed-space ship positions safely while retaining discoveries, logbooks, surface locations and chart progress.'
  ]},
  {version:'1.4.0',items:[
    'Unified the main menu, universe generator, flight HUD, settings, saves, logbook and detail dialogs with crisp 16-bit panels, pixel lettering and cyan/amber controls.',
    'Introduced an original stepped-color SpaceBitz pixel wordmark and bundled the new title/font for offline play.',
    'Redesigned the astronaut with an ivory helmet, amber visor, coral stripe, antenna and teal life-support pack.',
    'Added eight distinct walking poses in every facing direction, with opposing arm swings, boot lifts, body bounce and a dedicated idle stance; cadence follows distance traveled.',
    'Fixed camera zoom scaling for the astronaut, its shadow, flying ships, parked lander and surface samples.'
  ]},
  {version:'1.3.6',items:[
    'Replaced the old Chart control with a dedicated retro Warp Drive button in the bottom-right for entering the interstellar layer.',
    'Moved the voyage Log directly under Settings and restyled both as a compact upper-right utility stack.',
    'Moved Center beside the joystick and added Right, Above, Custom drag and Hidden placement options in Settings.',
    'Custom Center placement can be dragged anywhere in the game view and is saved locally for future sessions.'
  ]},
  {version:'1.3.5',items:[
    'Moved the soundtrack startup attempt to the earliest main-menu initialization and enabled native autoplay; the two-second lead-in remains baked into the track.',
    'Removed the off-center teal nebula/backlight from the game background for a clean black starfield.',
    'Moved the system chart into the top-left header, removed the SpaceBitz in-game brand and bottom system-status strip, and simplified the travel card to name, action and Info.',
    'Restyled the bottom navigation controls and Settings button with a more cohesive pixel-space interface.'
  ]},
  {version:'1.3.4',items:[
    'Replaced the corrupted/truncated repository MP3 with a soundtrack generated fresh during every Pages deployment.',
    'The deployment now verifies soundtrack size and duration before publishing, preventing an incomplete audio file from going live.',
    'Removed JavaScript song timers and ended-event playlist scheduling; the intro now uses one native looping audio element with its two-second lead-in baked into the file.',
    'Mobile browsers that block audible autoplay still require the first user interaction; that browser restriction cannot be bypassed reliably.'
  ]},
  {version:'1.3.3',items:[
    'Rebuilt music playback from scratch around one persistent HTML audio element instead of the previous soundtrack player class.',
    'Removed music from the service-worker cache and bypassed all audio/range requests so mobile browsers can stream the track normally.',
    'Music now has only one lifecycle: wait two seconds at the menu, play the full track, wait two seconds after it ends, then advance to the next playlist entry.',
    'No game scene, panel, planet selection, visibility change or normal control can pause, restart or reschedule the song.'
  ]},
  {version:'1.3.2',items:[
    'Removed gesture-driven audio priming and visibility pause/resume behavior that could make the soundtrack repeatedly stop and restart on mobile.',
    'Music now uses one timer, one audio element and one ended event: wait two seconds, play once, wait two seconds, repeat.',
    'If browser autoplay is blocked, only one temporary user-gesture listener is installed and removed immediately after playback succeeds.'
  ]},
  {version:'1.3.1',items:[
    'Simplified music playback to one continuous playlist lifecycle: two-second startup delay, full song playback, two-second gap, then the next song.',
    'The intro song now begins from the main menu and is no longer restarted by entering a universe, changing scenes, selecting worlds or returning to the menu.',
    'Removed native audio looping; repeats are now driven only by the track-ended event so every repeat gets the intended two-second pause.',
    'Added a browser autoplay unlock fallback while keeping one audio element and one playback state.'
  ]},
  {version:'1.3.0',items:[
    'Added the separately designed soft-synth soundtrack as the game’s single looping music file, controlled by the existing music and volume settings.',
    'Converted the system navigator into a collapsed dropdown that stays in the upper-left and away from the touch joystick.',
    'Removed the on-screen zoom control panel while preserving pinch, wheel and keyboard zoom.',
    'Planet and moon names now appear in the orbital view only when selected; the system star can remain labeled by default.'
  ]},
  {version:'1.2.9',items:[
    'Removed the soundtrack playback engine and all music startup, scheduling, resume and visibility hooks.',
    'Removed the music module and music-specific tests so no legacy or replacement melody can play anywhere in the game.',
    'Kept the existing music and volume Settings controls as inactive placeholders for a future separately designed soundtrack.'
  ]},
  {version:'1.2.8',items:[
    'Rebuilt the soundtrack from the original uploaded melody reference at its native 0.60-second note timing, preserving the tune while removing recorded noise/static.',
    'Replaced overlapping per-note oscillators with one continuous melody oscillator so a second copy of the song cannot layer underneath the first.',
    'Added a warmer harmonic tone, cleaner note separation, gentle low-pass filtering and compression for higher perceived volume without clipping.'
  ]},
  {version:'1.2.7',items:[
    'Redesigned the orbital HUD into a slimmer system navigator and compact target card so more of the system remains visible.',
    'Condensed planet and moon rows, target metrics, labels and actions while preserving the same navigation and detail controls.',
    'Improved portrait and landscape phone layouts so the target card, joystick and system rail occupy less of the play field.'
  ]},
  {version:'1.2.6',items:[
    'Hardened soundtrack playback so every voyage restart cancels all existing schedulers and active voices before one delayed copy starts.',
    'Set travelable star rarity to 50% red, 20% orange, 20% yellow, 9% white and 1% blue while keeping chart/system colors identical.',
    'Upgraded interstellar stars with smoother colored halos, bright cores and subtle non-crosshair shimmer.',
    'Added a landscape-first rotating phone layout plus Auto, Landscape and Portrait orientation preferences.'
  ]},
  {version:'1.2.5',items:[
    'Reworked soundtrack startup so each voyage begins the melody once from note one after a two-second delay, with no action-driven duplicate starts.',
    'Weighted travelable star colors toward real stellar rarity: red dwarfs dominate, orange/yellow stars are less common, white stars are uncommon and blue stars are rare.',
    'Made each travelable star use the exact same deterministic spectral color in the interstellar chart and its system view.'
  ]},
  {version:'1.2.4',items:[
    'Removed crosshair flares from stars in both system and interstellar views.',
    'Compacted Settings, added miles/AU display choices, improved visual defaults, preferred time zones and accelerated/real-time clock modes.',
    'New voyages now begin at the current real date/time; Sol uses a date-driven low-precision Kepler ephemeris and real sidereal spin rates.',
    'Replaced oversized stellar dark regions with small procedural sunspots that slowly emerge and fade.',
    'Improved soundtrack startup retries while retaining first-interaction fallback for browsers that enforce autoplay restrictions.'
  ]},
  {version:'1.2.3',items:[
    'Refined the SpaceBitz title with cleaner pixel-space detailing, removed the vertical side rails and restyled the version label without a border.',
    'Sped up only the main-menu fly-through starfield while leaving in-game background-star speed unchanged.',
    'Disabled native double-tap page zoom while preserving the game canvas pinch zoom.',
    'Improved close-planet rendering performance with cheaper large-body halos, better texture-frame cache reuse, zoom-aware orbit rendering and aggressive off-screen stellar-glow culling.'
  ]},
  {version:'1.2.2',items:[
    'Redesigned the SpaceBitz wordmark with sharper pixel-space detailing, more breathing room above the menu buttons and a clear version badge.',
    'Simplified the universe creation screen by removing redundant descriptive, status, version and device text.',
    'Changed menu and in-game background stars to a fresh procedural sky each session while preserving the same sky during that session.',
    'Expanded star colors into more saturated red, yellow, orange, white and blue families.'
  ]},
  {version:'1.2.1',items:[
    'Streamlined the main menu by removing the extra explorer tagline, subtitle, descriptive copy and footer status text.',
    'Raised the SpaceBitz title, removed menu button numbers and centered the Start Game, Multiplayer and Settings labels.'
  ]},
  {version:'1.2',items:[
    'Introduced the two-stage retro main menu with Start Game, Multiplayer placeholder and Settings.',
    'Opened the menu layout so more of the starfield remains visible and shifted outer space toward near-black.',
    'Made menu and in-game starfields faster with stronger depth, quicker brightness-only twinkle and richer retro pixel-art square, circle and diamond star sprites.',
    'Music now defaults on for new players, with audio controls kept inside Settings.'
  ]},
  {version:'1.1',items:[
    'Restored the original soundtrack and expanded sound, sky, display and control settings.',
    'Refined the retro moving sky, simulation clock, celestial scale, terrain rendering and character sprites.',
    'Improved responsive/mobile navigation, stellar details and orbital/deployment checks.'
  ]},
  {version:'1.0',items:[
    'Launched the responsive, installable SpaceBitz Field Edition.',
    'Added procedural star systems, orbiting worlds, exploration, landing, star-chart travel and local save support.',
    'Established the core flight HUD, logbook, touch/keyboard controls and offline app shell.'
  ]}
];
const state = {save:null, system:null, scene:'menu', selected:null, camera:{x:0,y:0}, zoom:1,
  panUntil:0, centerZoom:null, autopilot:null, keys:new Set(), joy:{x:0,y:0}, stars:[], width:0,height:0,dpr:1,
  last:performance.now(), lastUI:0, elapsed:0, fps:60, particles:[], textureCache:new Map(),
  waypoint:null,hoverCell:null,warpUntil:0,stellarSeconds:0,focusBody:null,shipMotion:{heading:-Math.PI/2,thrust:0},actorMotion:{direction:'down',steps:0},followBody:null};
const loadSaves = () => {
  const value=readJSON(SAVE_KEY, []);
  return Array.isArray(value)?value.filter(s=>s && s.id && s.seed):[];
};
function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{toast('Settings could not be saved on this device.');}}
let centerDrag=null,centerSuppressClick=false;
function applyCenterButtonLayout(){
  const btn=$('homeButton');if(!btn)return;
  const mode=settings.centerButton||'right';
  btn.hidden=mode==='hidden';
  btn.dataset.centerPosition=mode;
  btn.classList.toggle('center-custom',mode==='custom');
  if(mode==='hidden')return;
  requestAnimationFrame(()=>{
    const bw=btn.offsetWidth||54,bh=btn.offsetHeight||48;
    let cx,cy;
    if(mode==='custom'){
      cx=window.innerWidth*(settings.centerX/100);
      cy=window.innerHeight*(settings.centerY/100);
    }else{
      const joy=$('joystick'),r=joy?.getBoundingClientRect();
      if(r&&r.width>0&&r.height>0){
        if(mode==='above'){cx=r.left+r.width/2;cy=r.top-bh/2-10;}
        else{cx=r.right+bw/2+10;cy=r.top+r.height/2;}
      }else{
        cx=24+bw/2;cy=window.innerHeight-24-bh/2;
      }
    }
    cx=clamp(cx,bw/2+6,window.innerWidth-bw/2-6);
    cy=clamp(cy,bh/2+6,window.innerHeight-bh/2-6);
    btn.style.left=cx+'px';btn.style.top=cy+'px';
    btn.style.right='auto';btn.style.bottom='auto';btn.style.transform='translate(-50%,-50%)';
  });
}
function applySettings(){
  document.body.dataset.controls=settings.controls;
  document.body.dataset.reducedMotion=String(settings.reducedMotion);
  document.body.dataset.orientation=settings.orientation;
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
  const now=performance.now();
  if(now-lastSingleTouchEnd<320)e.preventDefault();
  lastSingleTouchEnd=now;
},{passive:false});
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
function applyOrientationPreference(){
  document.body.dataset.orientation=settings.orientation;
  const orientation=globalThis.screen?.orientation;
  if(!orientation)return Promise.resolve(false);
  try{
    if(settings.orientation==='auto'){
      orientation.unlock?.();
      return Promise.resolve(true);
    }
    if(typeof orientation.lock!=='function')return Promise.resolve(false);
    return Promise.resolve(orientation.lock(settings.orientation)).then(()=>true).catch(()=>false);
  }catch{return Promise.resolve(false);}
}
function fit() {
  const rect = canvas.getBoundingClientRect();
  state.width=rect.width; state.height=rect.height;
  state.dpr=settings.resolution==='auto'?Math.min(window.devicePixelRatio||1,2):Number(settings.resolution);
  canvas.width=Math.round(rect.width*state.dpr); canvas.height=Math.round(rect.height*state.dpr);
  ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
  const targetStarCount=Math.max(110,Math.min(400,Math.round(rect.width*rect.height/2600)));
  if(!state.stars.length)state.stars=Array.from({length:targetStarCount},makeBackgroundStar);
  else if(state.stars.length<targetStarCount)state.stars.push(...Array.from({length:targetStarCount-state.stars.length},makeBackgroundStar));
  else if(state.stars.length>targetStarCount)state.stars.length=targetStarCount;
}
window.addEventListener('resize',()=>{fit();applyCenterButtonLayout();});
window.addEventListener('orientationchange',()=>setTimeout(()=>{fit();updateUI();applyCenterButtonLayout();},120),{passive:true});
globalThis.screen?.orientation?.addEventListener?.('change',()=>setTimeout(()=>{fit();updateUI();applyCenterButtonLayout();},80));
applySettings();
function start(save) {
  state.save=save; state.scene=save.scene || 'system';
  state.system=makeSystem(save.currentSystem || save.homeSeed);
  save.currentSystem=state.system.seed;
  save.chart ||= {x:0,y:0}; save.ship ||= {x:0,y:0};
  save.surface ||= {x:0,y:0}; save.discoveries ||= []; save.log ||= [];
  save.days=Number.isFinite(save.days)?save.days:currentDays();
  if(settings.timeMode==='realtime')save.days=currentDays();
  migrateLayout(save,state.system);save.route||=[];
  if(state.scene==='surface' && !findBody(save.landed)?.solid){state.scene='system';save.scene='system';save.landed=null;}
  state.selected=null;state.waypoint=null;state.hoverCell=null;state.warpUntil=0;state.focusBody=null;state.centerZoom=null; state.autopilot=null;state.followBody=null;state.panUntil=0;
  state.shipMotion={heading:-Math.PI/2,thrust:0};state.actorMotion={direction:'down',steps:0};
  state.zoom=state.scene==='chart'?1:state.scene==='surface'?1.3:.85;
  if(state.scene==='chart') state.camera={...save.chart};
  else if(state.scene==='surface') state.camera={...save.surface};
  else state.camera={...save.ship};
  $('welcome').classList.remove('visible'); $('app').hidden=false;
  applyOrientationPreference();
  applyCenterButtonLayout();
  keepStationNearShip();persist(); updateUI();
}
function create(sol=false) {
  const name=$('universeName').value.trim().slice(0,40) || 'My Universe';
  const seed=($('universeSeed').value.trim() || (crypto.randomUUID?.() || Math.random().toString(36).slice(2))).slice(0,64);
  const homeSeed=sol?'sol':'home:'+seed;
  const system=makeSystem(homeSeed);
  const home=sol?system.planets[2]:system.planets.find(p=>p.type==='temperate') || system.planets.find(p=>p.solid) || system.planets[0];
  const startDays=currentDays(),h=bodyPosition(home,startDays,system);
  const save={id:crypto.randomUUID?.()||String(Date.now()),name,seed,homeSeed,currentSystem:homeSeed,
    scene:'system',ship:{x:h.x+visualRadius(home.diameter)+70,y:h.y},chart:{x:0,y:0},
    surface:{x:0,y:0},landed:null,days:startDays,discoveries:[],log:[],layoutVersion:3,updated:Date.now()};
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
$('multiplayerGame').onclick=()=>toast('Multiplayer is coming in a future update.');
$('newGame').onclick=()=>create(false); $('solGame').onclick=()=>create(true);
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
        surface:{x:0,y:0},landed:null,layoutVersion:3,days:Number.isFinite(raw.days)?raw.days:currentDays(),
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

function select(object) { state.waypoint=null;state.hoverCell=null;state.selected=object; state.autopilot=null;updateUI(); }
function keepStationNearShip(){
  if(state.scene!=='system')return;
  const ship=state.save.ship;
  const near=allBodies().map(body=>{const p=bodyPosition(body,state.save.days,state.system);return {body,p,d:Math.hypot(ship.x-p.x,ship.y-p.y)};})
    .filter(v=>v.d<visualRadius(v.body.diameter)+100).sort((a,b)=>a.d-b.d)[0];
  if(near)state.followBody={id:near.body.id,x:ship.x-near.p.x,y:ship.y-near.p.y};
}
function markDiscovery(body) {
  if(state.save.discoveries.includes(body.id)) return;
  state.save.discoveries.push(body.id);
  state.save.log.unshift({name:body.name,action:'First landing',days:state.save.days});
  toast(`First landing on ${body.name} · added to logbook`);persist();
}
function enterChart() {
  state.waypoint=null;state.hoverCell=null;state.focusBody=null;state.centerZoom=null;state.panUntil=0;
  state.followBody=null;state.shipMotion.thrust=0;
  const star=currentStar();state.scene='chart';state.selected=star;
  state.save.scene='chart';state.save.chart={x:star.x+38,y:star.y+30};
  state.camera={...state.save.chart};state.zoom=1;state.autopilot=null;persist();updateUI();
}
function enterSystem(star) {
  state.waypoint=null;state.hoverCell=null;state.focusBody=null;state.centerZoom=null;state.panUntil=0;
  state.followBody=null;state.shipMotion.thrust=0;
  state.system=makeSystem(star.seed);state.save.currentSystem=star.seed;
  state.scene='system';state.save.scene='system';state.selected=null;
  const first=state.system.planets[0],pos=bodyPosition(first,state.save.days,state.system);
  state.save.ship={x:pos.x+visualRadius(first.diameter)+60,y:pos.y+40};state.camera={...state.save.ship};
  state.zoom=.85;state.autopilot=null;state.save.chart={x:star.x,y:star.y};
  state.save.log.unshift({name:state.system.name,action:'Entered system',days:state.save.days});
  if(state.save.route.at(-1)!==star.seed)state.save.route.push(star.seed);
  state.save.route=state.save.route.slice(-40);
  keepStationNearShip();toast(`Entering the ${state.system.name} system`);persist();updateUI();
}
function enterSurface(body) {
  state.waypoint=null;state.hoverCell=null;state.focusBody=null;state.centerZoom=null;state.panUntil=0;
  if(!body.solid){toast('No solid surface here. Explore one of its moons.');return;}
  state.followBody=null;state.actorMotion={direction:'down',steps:0};
  state.selected=null;state.scene='surface';state.save.scene='surface';state.save.landed=body.id;
  state.save.surface={x:50,y:35};state.camera={...state.save.surface};state.zoom=1.3;
  state.autopilot=null;markDiscovery(body);persist();updateUI();
}
function launch() {
  state.waypoint=null;state.hoverCell=null;state.focusBody=null;state.centerZoom=null;state.panUntil=0;
  state.shipMotion={heading:-Math.PI/2,thrust:0};state.followBody=null;
  const body=findBody(state.save.landed);
  if(body){const p=bodyPosition(body,state.save.days,state.system);
    state.save.ship={x:p.x+visualRadius(body.diameter,body.kind)+44,y:p.y+12};}
  state.scene='system';state.save.scene='system';state.save.landed=null;
  state.camera={...state.save.ship};state.selected=body||null;state.zoom=.95;
  keepStationNearShip();toast('Launch complete. The stars are yours.');persist();updateUI();
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
  state.centerZoom=null;
  if(state.waypoint){
    state.panUntil=0;state.followBody=null;
    state.autopilot={type:'waypoint',x:state.waypoint.x,y:state.waypoint.y};
    toast('Course set · '+formatCoordinates(state.waypoint,state.scene));updateUI();return;
  }
  if(state.scene==='surface'){
    const sample=nearestSample();const d=sample?Math.hypot(sample.x-state.save.surface.x,sample.y-state.save.surface.y):Infinity;
    if(d<SURFACE_UNIT){state.save.discoveries.push(sample.id);state.save.log.unshift({name:findBody(state.save.landed)?.name||'World',action:'Sample collected',days:state.save.days});
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
    state.autopilot={type:'body',id:body.id,arrivalZoom:Math.min(1,100/(visualRadius(body.diameter)+20))};toast(`Course set for ${body.name}`);return;
  }
  const star=state.selected;
  if(!star){select(currentStar());return;}
  const distance=Math.hypot(star.x-state.save.chart.x,star.y-state.save.chart.y);
  if(distance<38){enterSystem(star);return;}
  state.autopilot={type:'star',id:star.seed};toast(`Jump course set for ${starName(star.seed)}`);
}
$('primaryAction').onclick=primary;
$('secondaryAction').onclick=()=>{
  if(state.waypoint){state.waypoint=null;state.autopilot=null;updateUI();}
  else showDetails(state.selected);
};
$('mapButton').onclick=()=>{
  if(state.scene==='surface'||state.warpUntil)return;
  resetInput();state.autopilot=null;state.centerZoom=null;
  state.warpUntil=performance.now()+(settings.reducedMotion?120:650);
  updateUI();
};
$('systemFit').onclick=()=>{
  state.focusBody=null;state.centerZoom=null;
  state.camera={x:0,y:0};state.zoom=systemFitZoom(state.system,state.width,state.height,state.save.days);
  state.panUntil=Infinity;$('systemChart').classList.remove('open');
  $('systemChartContent').hidden=true;$('systemChartToggle').setAttribute('aria-expanded','false');
};
$('gridToggle').onclick=()=>{settings.showGrid=!settings.showGrid;saveSettings();updateUI();};
$('homeButton').onclick=()=>{
  if(centerSuppressClick){centerSuppressClick=false;return;}
  state.panUntil=0;state.autopilot=null;state.focusBody=null;state.centerZoom=null;
  if(state.scene==='system'){
    const to=Math.max(state.zoom,1.3);
    if(settings.reducedMotion)state.zoom=to;
    else if(to>state.zoom)state.centerZoom={from:state.zoom,to,elapsed:0,duration:650};
  }
  state.camera={...(state.scene==='surface'?state.save.surface:state.scene==='chart'?state.save.chart:state.save.ship)};
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
  if(centerDrag.moved){centerSuppressClick=true;saveSettings();toast('Center control position saved');}
  centerDrag=null;document.body.classList.remove('center-editing');
};
$('homeButton').addEventListener('pointerup',finishCenterDrag);
$('homeButton').addEventListener('pointercancel',finishCenterDrag);
$('journalButton').onclick=showJournal;
$('zoneToggle').onclick=()=>{settings.zone=!settings.zone;saveSettings();updateUI();};
$('systemChartToggle').onclick=()=>{
  const panel=$('systemChart'),content=$('systemChartContent'),open=!panel.classList.contains('open');
  panel.classList.toggle('open',open);content.hidden=!open;
  $('systemChartToggle').setAttribute('aria-expanded',String(open));
};
function zoom(factor){state.centerZoom=null;state.zoom=clamp(state.zoom*factor,state.scene==='system'?.000001:state.scene==='surface'?.65:.34,state.scene==='system'?128:2.4);}

function addMetric(parent,label,value) {
  const div=document.createElement('div');div.className='metric';
  const a=document.createElement('span'),b=document.createElement('strong');a.textContent=label;b.textContent=value;div.append(a,b);parent.append(div);
}
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
  $('modeLabel').textContent=scene==='chart'?'SECTOR / STAR CHART':scene==='surface'?'EXPEDITION / SURFACE':'ORBITAL / SYSTEM';
  $('placeLabel').textContent=scene==='chart'?'The Reach':scene==='surface'?findBody(state.save.landed)?.name||'Surface':sys.name;
  $('hint').textContent=scene==='chart'?'Select a star, then set a jump course.':scene==='surface'?'Tap a 1 m square, then GO HERE. Collect samples and return to your lander.':`${sys.star.type} STAR · ${sys.planets.length} PLANETS`;
  $('zoneLegend').hidden=scene!=='system';$('zoneToggle').textContent=settings.zone?'ON':'OFF';$('zoneToggle').setAttribute('aria-pressed',String(settings.zone));
  const list=$('bodyList'),listKey=`${scene}:${sys.seed}:${sel?.id||''}`;
  if(state.listKey!==listKey){
    const scroll=list.scrollLeft;list.replaceChildren();
    if(scene==='system')for(const body of [sys.star,...allBodies()]){
      const b=document.createElement('button');b.className='body-entry'+(body.kind==='moon'?' moon':'')+(sel?.id===body.id?' active':'');
      b.style.setProperty('--dot',body.color);b.innerHTML='<span class="body-dot"></span>';
      const name=document.createElement('span');name.textContent=body.name;const au=document.createElement('small');au.textContent=body.kind==='star'?'STAR':formatDistance(orbitalElements(body,state.save.days).a,'system');
      b.append(name,au);b.onclick=()=>{select(body);$('systemChart').classList.remove('open');$('systemChartContent').hidden=true;$('systemChartToggle').setAttribute('aria-expanded','false');};list.append(b);
    }
    list.scrollLeft=scroll;state.listKey=listKey;
  }
  $('bodyList').hidden=scene!=='system';$('systemFit').hidden=scene!=='system';
  let title='',action='SELECT',details=false;
  if(scene==='surface'){
    const body=findBody(state.save.landed),sample=nearestSample();
    const near=sample&&Math.hypot(sample.x-state.save.surface.x,sample.y-state.save.surface.y)<SURFACE_UNIT;
    const landerNear=Math.hypot(state.save.surface.x,state.save.surface.y)<62;
    title=body?.name||'Surface';
    action=near?'COLLECT SAMPLE':landerNear?'LAUNCH':'RETURN TO LANDER';
  } else if(scene==='chart'){
    title=sel?starName(sel.seed):'';
    const distance=sel?Math.hypot(sel.x-state.save.chart.x,sel.y-state.save.chart.y):0;
    action=!sel?'SELECT STAR':distance<38?'ENTER SYSTEM':'JUMP';
    details=Boolean(sel);
  } else if(sel?.kind==='star'){
    title=sel.name;action='SELECT WORLD';details=true;
  } else if(sel){
    title=sel.name;details=true;
    const p=bodyPosition(sel,state.save.days,sys),distance=Math.hypot(p.x-state.save.ship.x,p.y-state.save.ship.y);
    action=distance<visualRadius(sel.diameter,sel.kind)+48?(sel.solid?'LAND':'NO SOLID SURFACE'):'TRAVEL';
  }
  const pos=scene==='surface'?state.save.surface:scene==='chart'?state.save.chart:state.save.ship;
  let destination=scene==='surface'?{x:0,y:0}:scene==='chart'?sel:sel?.kind==='star'?{x:0,y:0}:sel?bodyPosition(sel,state.save.days,sys):null;
  if(state.waypoint){title=scene==='surface'?'SURFACE SITE':'COORDINATE';action=state.autopilot?.type==='waypoint'?'MOVING…':'GO HERE';details=true;destination=state.waypoint;}
  $('targetCard').hidden=scene!=='surface'&&!sel&&!state.waypoint;
  $('targetName').textContent=title||'Target';
  $('targetDistance').textContent=destination?(state.waypoint?formatCoordinates(destination,scene)+' / ':'')+formatDistance(Math.hypot(destination.x-pos.x,destination.y-pos.y),scene)+(scene==='surface'&&!state.waypoint?' TO LANDER':' AWAY'):'';
  $('primaryAction').textContent=action;
  $('secondaryAction').hidden=!details;$('secondaryAction').textContent=state.waypoint?'CLEAR':'INFO';
  $('primaryAction').disabled=action==='NO SOLID SURFACE'||(state.autopilot?.type==='waypoint');
  const warp=$('mapButton'),warpLabel=warp.querySelector('.warp-label'),warpSub=warp.querySelector('.warp-sub');
  const returning=scene==='chart',engaged=state.warpUntil>0||state.autopilot?.type==='star';
  warpLabel.textContent='WARP DRIVE';
  warpSub.textContent=state.warpUntil?'ENGAGING':state.autopilot?.type==='star'?'IN TRANSIT':returning?'LOCAL SYSTEM':'INTERSTELLAR';
  warp.dataset.warpMode=returning?'return':'warp';warp.classList.toggle('engaged',Boolean(engaged));
  warp.classList.toggle('latched',returning); // Physical lever stays right while in interstellar space.
  warp.setAttribute('aria-busy',String(Boolean(engaged)));
  warp.setAttribute('aria-label',returning?'Engage Warp Drive to local system':'Engage Warp Drive to interstellar chart');
  warp.disabled=scene==='surface'||state.warpUntil>0;
  $('homeButton').setAttribute('aria-label',scene==='system'?'Center on ship and zoom in':scene==='surface'?'Center on explorer':'Center on ship');
  $('gridToggle').textContent=settings.showGrid?'GRID ON':'GRID OFF';
  $('gridToggle').setAttribute('aria-pressed',String(settings.showGrid));
  $('gridToggle').setAttribute('aria-label',settings.showGrid?'Hide coordinate grid':'Show coordinate grid');
  $('clock').textContent=formatGameDate();
  $('clock').title=(settings.timeMode==='realtime'?'Real-time 1:1':'Accelerated · 1 real minute = 1 game hour')+' · '+preferredTimeZone()+(settings.paused&&settings.timeMode!=='realtime'?' · paused':'');
  $('telemetry').hidden=!settings.showCoords&&!settings.showFPS;
  $('telemetry').textContent=[settings.showCoords?formatCoordinates(pos,scene):'',settings.showFPS?`${Math.round(state.fps)} FPS`:''].filter(Boolean).join('  /  ');
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
    detailTile(grid,'DISTANCE',formatDistance(Math.hypot(body.x-state.save.chart.x,body.y-state.save.chart.y),'chart'));
  }else if(body.kind==='star'){
    detailTile(grid,'SPECTRAL CLASS',body.type);detailTile(grid,'DIAMETER',diameterText(body.diameter));
    detailTile(grid,'SOLAR MASS',body.mass.toFixed(2)+' M☉');detailTile(grid,'LUMINOSITY',body.luminosity.toFixed(2)+' L☉');
  }else{
    detailTile(grid,'DIAMETER',diameterText(body.diameter));detailTile(grid,'ORBIT PERIOD',body.period.toFixed(2)+' days');
    detailTile(grid,'TYPE',body.type.toUpperCase());detailTile(grid,body.kind==='moon'?'HOST':'ORBIT SEMIMAJOR AXIS',body.kind==='moon'?findBody(body.parent)?.name||'Planet':formatDistance(orbitalElements(body,state.save.days).a,'system'));
    if(body.kind==='moon')detailTile(grid,'ORBIT SEMIMAJOR AXIS',formatSystemKm(body.orbitKm));
  }
  if(state.scene==='system'){
    const position=body.kind==='star'?{x:0,y:0}:bodyPosition(body,state.save.days,state.system);
    detailTile(grid,'DISTANCE FROM SHIP',formatDistance(Math.hypot(position.x-state.save.ship.x,position.y-state.save.ship.y),'system'));
    detailTile(grid,'COORDINATES',formatCoordinates(position,'system'));
  }
  if(body.rotationDays)detailTile(grid,'ROTATION',(Math.abs(body.rotationDays)*24).toFixed(1)+' h'+(body.rotationDays<0?' · retrograde':''));
  box.append(grid);
  const note=document.createElement('p');note.textContent=state.scene==='chart'?'Chart coordinates and distances are always light-years. Origin: your home system. Stars and routes here are a procedural map.':
    'System origin: the star. One coordinate unit is one light-second; 500 ls = 1 AU. Bodies and orbits share a linear physical scale. Hollow beacons locate bodies too small to see. Sol planets use approximate JPL elements; moon phases and generated systems are illustrative.';
  box.append(note);
  if(state.scene==='system'){
    const focus=document.createElement('button');focus.className='button subtle';focus.textContent='FOCUS VIEW';
    focus.onclick=()=>{closeModal();state.centerZoom=null;state.focusBody=body.id;state.camera=body.kind==='star'?{x:0,y:0}:bodyPosition(body,state.save.days,state.system);state.zoom=clamp(Math.min(state.width,state.height)*.25/visualRadius(body.diameter),.000001,128);state.panUntil=Infinity;};box.append(focus);
  }
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
    const date=document.createElement('small');date.textContent=formatGameDate(new Date(EPOCH+entry.days*DAY_MS),true);item.append(date);box.append(item);
  }if(!state.save.log.length){const empty=document.createElement('p');empty.textContent='Your discoveries will appear here.';box.append(empty);}
  setModal('CAPTAIN’S LOG','Voyage logbook',box);
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
    const sync=()=>{if(kind==='range')value.textContent=key==='volume'?Math.round(settings[key]*100)+'%':String(settings[key]);};sync();
    input.addEventListener(kind==='range'?'input':'change',()=>{
      settings[key]=kind==='checkbox'?input.checked:typeof DEFAULT_SETTINGS[key]==='number'?Number(input.value):input.value;
      if(key==='pixelSize')terrain.clear();
      if(key==='timeMode'&&state.save&&settings.timeMode==='realtime')state.save.days=currentDays();
      sync();saveSettings();applySettings();
      if(key==='music'||key==='volume')applyMusicSetting();
      if(key==='orientation')applyOrientationPreference();
      if(key==='centerButton'&&settings.centerButton==='custom')toast('Close Settings, then drag CENTER anywhere you want.');
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
  control('showFPS','Frame rate','checkbox');control('showCoords','Coordinates','checkbox');control('showGrid','Coordinate grid','checkbox');
  control('reducedMotion','Reduce motion','checkbox');

  heading('Controls');
  control('controls','Input mode','select',[['auto','Automatic'],['touch','Touch joystick'],['desktop','Keyboard / mouse']]);
  control('orientation','Screen orientation','select',[['landscape','Landscape · preferred'],['portrait','Portrait · lock'],['auto','Follow device']]);
  control('joyX','Joystick position (%)','range',[8,92,1]);control('joyOffset','Joystick height (px)','range',[-70,120,1]);
  control('centerButton','Center button','select',[['right','Right of joystick'],['above','Above joystick'],['custom','Custom · drag in game'],['hidden','Hidden']]);
  control('cheats','Instant travel','checkbox');

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
    save.onclick=()=>{persist();closeModal();state.scene='menu';state.save=null;state.keys.clear();$('app').hidden=true;$('welcome').classList.add('visible');showMenuStage('main');renderSaves();};box.append(save);
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
  if(state.autopilot.type==='waypoint')return {x:state.autopilot.x,y:state.autopilot.y};
  if(state.autopilot.type==='body'){const b=findBody(state.autopilot.id);return b?bodyPosition(b,state.save.days,state.system):null;}
  if(state.autopilot.type==='star'){const s=starAt(state.autopilot.id);return {x:s.x,y:s.y};}
  return null;
}
function update(dt,clockDt=dt) {
  if(!state.save || $('modal').classList.contains('visible'))return;
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
  if(manual){state.centerZoom=null;let speed=state.scene==='surface'?SURFACE_UNIT*2.2:state.scene==='chart'?CHART_UNIT*4.5:Math.max(260,260/state.zoom);
    if(state.scene==='surface'&&terrain.sampler(findBody(state.save.landed))(p.x,p.y).water)speed*=.45;
    p.x+=dx/Math.max(1,magnitude)*speed*dt/1000;p.y+=dy/Math.max(1,magnitude)*speed*dt/1000;
    state.autopilot=null;state.followBody=null;state.panUntil=0;
  }else if(state.autopilot){const destination=targetPoint();
    if(destination){
      const goal=state.scene==='system'?navigationTarget(p,destination,visualRadius(state.system.star.diameter,'star')):destination;
      const vx=goal.x-p.x,vy=goal.y-p.y,d=Math.hypot(vx,vy),remaining=Math.hypot(destination.x-p.x,destination.y-p.y);
      if(state.scene==='system'&&state.autopilot.type==='body'){
        const desired=Math.min(state.autopilot.arrivalZoom||1,Math.min(state.width,state.height)*.6/Math.max(1,remaining));
        state.zoom+=(desired-state.zoom)*(1-Math.exp(-dt/220));
      }
      const isWaypoint=state.autopilot.type==='waypoint';
      const arrival=isWaypoint?0:state.scene==='system'?visualRadius(findBody(state.autopilot.id)?.diameter||10000,findBody(state.autopilot.id)?.kind)+38:state.scene==='chart'?22:32;
      if(remaining<=arrival+.2){
        if(isWaypoint){p.x=destination.x;p.y=destination.y;state.waypoint=null;}
        if(state.scene==='system'&&!isWaypoint)state.followBody={id:state.autopilot.id,x:p.x-destination.x,y:p.y-destination.y};
        state.autopilot=null;updateUI();toast(isWaypoint?'Coordinate reached':state.scene==='chart'?'Star reached · enter the system':state.scene==='surface'?'Lander reached':'Orbit achieved · station keeping active');
      }else if(d>0){const step=Math.min(goal===destination?remaining-arrival:d,(travelSpeed(state.scene,remaining)*(state.scene==='surface'&&terrain.sampler(findBody(state.save.landed))(p.x,p.y).water?.45:1))*dt/1000);
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
  if(state.centerZoom&&state.scene==='system'){
    const animation=state.centerZoom;animation.elapsed+=dt;
    const progress=settings.reducedMotion?1:animation.elapsed/animation.duration;
    state.zoom=centerZoomAt(animation.from,animation.to,progress);state.camera={...p};
    if(progress>=1)state.centerZoom=null;
  }else if(state.scene==='system'&&state.focusBody&&state.panUntil===Infinity){
    const body=findBody(state.focusBody);
    if(body)state.camera=bodyPosition(body,state.save.days,state.system);
    else if(state.focusBody===state.system.star.id)state.camera={x:0,y:0};
  }else if(performance.now()>state.panUntil){const ease=1-Math.exp(-dt/145);state.camera.x+=(p.x-state.camera.x)*ease;state.camera.y+=(p.y-state.camera.y)*ease;}
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
  const cell=state.waypoint||state.hoverCell;
  if(cell){
    const p=screen(cell.x-unit/2,cell.y-unit/2),size=unit*state.zoom;
    ctx.fillStyle=state.waypoint?'#ffcf6926':'#91e9d41a';ctx.strokeStyle=state.waypoint?'#ffcf69':'#8ee9d4';
    const right=Math.min(state.width,p.x+size),bottom=Math.min(state.height,p.y+size),left=Math.max(0,p.x),top=Math.max(0,p.y);
    if(right>left&&bottom>top)ctx.fillRect(left,top,right-left,bottom-top);
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
function drawBodyOrbit(body,days,host={x:0,y:0}){
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
function drawOrbit(x,y,r,color='#a3bed3') {
  const p=screen(x,y),sr=r*state.zoom;if(sr<1)return;
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1;ctx.globalAlpha=.22;
  strokeEllipse(ctx,circleGeometry(p.x,p.y,sr),state.width,state.height);ctx.restore();
}

function label(text,x,y,selected=false) {
  ctx.font="10px 'SpaceBitz Pixel',monospace";
  ctx.textAlign='center';ctx.textBaseline='middle';const width=ctx.measureText(text).width+18;
  ctx.fillStyle=selected?'#264b59e8':'#0b1b30d9';ctx.strokeStyle=selected?'#6fe1cf80':'#64829750';
  ctx.beginPath();ctx.rect(Math.round(x-width/2),Math.round(y)-12,Math.round(width),23);ctx.fill();ctx.stroke();
  ctx.fillStyle=selected?'#e8fff9':'#c3d5e2';ctx.fillText(text,x,y);
}
function drawSelection(x,y,r,now) {
  ctx.save();ctx.strokeStyle='#8ff5d9';ctx.lineWidth=1.5;
  ctx.setLineDash([12,9]);ctx.lineDashOffset=settings.reducedMotion?0:-now*.02;
  strokeEllipse(ctx,circleGeometry(x,y,r+11),state.width,state.height);ctx.restore();
}

function drawStar(x,y,r,color,now,body=null) {
  const w=state.width,h=state.height,maxDim=Math.max(w,h);
  if(r<1.5){ctx.strokeStyle=color;ctx.lineWidth=1;ctx.strokeRect(Math.round(x)-3,Math.round(y)-3,6,6);return;}
  const coreVisible=x+r>0&&x-r<w&&y+r>0&&y-r<h;
  const nearViewport=x>-maxDim*.7&&x<w+maxDim*.7&&y>-maxDim*.7&&y<h+maxDim*.7;
  if(!coreVisible&&!nearViewport)return;

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

  if(!coreVisible)return;
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
}
function drawPlanet(body,p,now,worldPos) {
  const sr=visualRadius(body.diameter,body.kind)*state.zoom;
  if(p.x<-sr-100||p.x>state.width+sr+100||p.y<-sr-100||p.y>state.height+sr+100)return;
  const r=sr;const selected=state.selected?.id===body.id;
  if(r<1.5){
    // Hollow navigation beacon, not a larger physical disk.
    ctx.strokeStyle=body.color;ctx.lineWidth=1;ctx.strokeRect(Math.round(p.x)-2,Math.round(p.y)-2,4,4);
    if(selected){drawSelection(p.x,p.y,4,now);label(body.name,p.x,p.y-23,true);}return;
  }
  if(body.name==='Saturn' || (body.type==='gas'&&hash(body.id)%3===0)){
    ctx.save();ctx.strokeStyle='#d6cbad88';ctx.lineWidth=Math.min(64,Math.max(2,r*.16));
    const c=Math.cos(-.31),s=Math.sin(-.31);
    strokeEllipse(ctx,{x:p.x,y:p.y,ux:r*1.85*c,uy:r*1.85*s,vx:-r*.48*s,vy:r*.48*c},state.width,state.height);ctx.restore();
  }
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
  drawImageInView(ctx,celestialSprite(body,state.save.days,worldPos),p.x-r,p.y-r,2*r,2*r,state.width,state.height);ctx.restore();
  ctx.strokeStyle='#d9f8fb42';ctx.lineWidth=1;strokeEllipse(ctx,circleGeometry(p.x,p.y,r),state.width,state.height);
  if(selected){drawSelection(p.x,p.y,r,now);label(body.name,p.x,p.y-r-25,true);}
}
function drawSystem(now) {
  const sys=state.system,days=state.save.days,zone=habitableZone(sys.star.luminosity);
  drawCoordinateGrid();
  const center=screen(0,0);
  if(settings.zone){
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
  drawStar(center.x,center.y,visualRadius(sys.star.diameter,'star')*state.zoom,sys.star.color,now,sys.star);
  if(state.selected?.id===sys.star.id)drawSelection(center.x,center.y,visualRadius(sys.star.diameter,'star')*state.zoom,now);
  if(settings.labels&&center.x>-60&&center.x<state.width+60&&center.y>-60&&center.y<state.height+60)label(sys.star.name,center.x,center.y-visualRadius(sys.star.diameter,'star')*state.zoom-25);
  for(const planet of sys.planets){const pos=bodyPosition(planet,days,sys);drawPlanet(planet,screen(pos.x,pos.y),now,pos);
    for(const moon of planet.moons){const mp=bodyPosition(moon,days,sys);drawPlanet(moon,screen(mp.x,mp.y),now,mp);}}
  if(state.autopilot?.type==='body'){const body=findBody(state.autopilot.id);if(body){const end=bodyPosition(body,days,sys),a=screen(state.save.ship.x,state.save.ship.y),b=screen(end.x,end.y);
    ctx.strokeStyle='#77e2d586';ctx.lineWidth=1;ctx.setLineDash([5,8]);ctx.beginPath();lineInView(ctx,a,b,state.width,state.height);ctx.stroke();ctx.setLineDash([]);}}
  const ship=screen(state.save.ship.x,state.save.ship.y);paintShip(ctx,ship.x,ship.y,state.shipMotion,now,42,false,state.zoom);
}
function drawChartStar(x,y,r,color,now,seed){
  const phase=(hash(seed)%6283)/1000;
  const pulse=settings.reducedMotion?1:.94+.06*Math.sin(now*.0018+phase);
  const haloR=r*4.6;
  ctx.save();
  ctx.globalAlpha=pulse;
  const halo=ctx.createRadialGradient(x,y,0,x,y,haloR);
  halo.addColorStop(0,'#ffffff');
  halo.addColorStop(.10,color);
  halo.addColorStop(.32,color+'a8');
  halo.addColorStop(.68,color+'42');
  halo.addColorStop(1,color+'00');
  ctx.fillStyle=halo;circle(x,y,haloR);ctx.fill();
  ctx.globalAlpha=1;
  ctx.fillStyle=color;circle(x,y,r*1.18);ctx.fill();
  ctx.fillStyle='#ffffff';circle(x,y,Math.max(1.25,r*.48));ctx.fill();
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
    const starColor=starAppearance(star.seed).color;
    drawChartStar(p.x,p.y,star.id==='origin'?7:4.5,starColor,now,star.seed);
    if(state.selected?.seed===star.seed){drawSelection(p.x,p.y,9,now);label(starName(star.seed),p.x,p.y-27,true);}
    else if(star.id==='origin')label(starName(star.seed)+' · HOME',p.x,p.y-26);
  }
  if(state.autopilot?.type==='star'){const s=starAt(state.autopilot.id);const a=screen(state.save.chart.x,state.save.chart.y),b=screen(s.x,s.y);
    ctx.strokeStyle='#76dac680';ctx.lineWidth=1;ctx.setLineDash([5,7]);ctx.beginPath();lineInView(ctx,a,b,state.width,state.height);ctx.stroke();ctx.setLineDash([]);}
  const ship=screen(state.save.chart.x,state.save.chart.y);paintShip(ctx,ship.x,ship.y,state.shipMotion,now,36,false,state.zoom);
  ctx.font="9px 'SpaceBitz Pixel',monospace";ctx.fillStyle='#91b1be';ctx.fillText('LOCAL SECTOR  /  LIGHT-YEARS',state.width/2,Math.max(70,state.height*.14));
}
function drawGround(now) {
  const body=findBody(state.save.landed);if(!body)return;
  terrain.draw(ctx,body,state.camera,state.zoom,state.width,state.height,settings.pixelSize);
  drawCoordinateGrid();
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
  if(Math.hypot(lander.x-state.width/2,lander.y-state.height/2)>125){
    const a=Math.atan2(lander.y-state.height/2,lander.x-state.width/2),r=Math.min(state.width,state.height)*.3;
    const x=state.width/2+Math.cos(a)*r,y=state.height/2+Math.sin(a)*r;
    ctx.fillStyle='#8ee9d5';ctx.font="10px 'SpaceBitz Pixel',monospace";ctx.textAlign='center';ctx.fillText('⌖ LANDER',x,y);
  }
}
function frame(now) {
  const realDt=Math.max(0,now-state.last),dt=Math.min(100,realDt);state.last=now;
  if(realDt>0)state.fps+=(1000/realDt-state.fps)*.06;
  if(!document.hidden){
    if(state.save){update(dt,realDt);if(!$('modal').classList.contains('visible')&&!settings.reducedMotion)state.stellarSeconds+=dt/1000;}
    backdrop(now);ctx.save();
    try{
      if(state.scene==='system')drawSystem(now);
      else if(state.scene==='chart')drawChart(now);
      else if(state.scene==='surface')drawGround(now);
    }finally{ctx.restore();}
    if(state.save && now-state.lastUI>300){state.lastUI=now;updateUI();}
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange',()=>{
  state.last=performance.now();
  if(document.hidden){resetInput();persist();}
});
window.addEventListener('pagehide',()=>{stopMusic();persist();});

// Pointer picking and camera panning. A tap selects; a drag pans; two fingers pinch.
const pointers=new Map();let gesture=null;
canvas.addEventListener('pointerdown',e=>{if(!state.save||$('modal').classList.contains('visible'))return;
  canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1)gesture={x:e.clientX,y:e.clientY,moved:false};
  if(pointers.size===2){gesture=null;const [a,b]=[...pointers.values()];state.pinch=Math.hypot(a.x-b.x,a.y-b.y);}
});
canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)){
    if(state.save&&!$('modal').classList.contains('visible')&&e.pointerType==='mouse'){
      const rect=canvas.getBoundingClientRect();state.hoverCell=gridCell(world(e.clientX-rect.left,e.clientY-rect.top),state.scene);
    }return;
  }const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()],dist=Math.hypot(a.x-b.x,a.y-b.y);
    if(state.pinch)zoom(dist/state.pinch);state.hoverCell=null;state.pinch=dist;return;}
  if(gesture){if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>7)gesture.moved=true;
    if(gesture.moved){state.centerZoom=null;state.hoverCell=null;state.camera.x-=(e.clientX-old.x)/state.zoom;state.camera.y-=(e.clientY-old.y)/state.zoom;
      state.panUntil=performance.now()+2500;}}
});
function pick(e){const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
  if(state.scene==='system'){
    const matches=allBodies().map(body=>{const pos=bodyPosition(body,state.save.days,state.system),p=screen(pos.x,pos.y);
      return {body,d:Math.hypot(x-p.x,y-p.y),radius:visualRadius(body.diameter,body.kind)*state.zoom};})
      .filter(v=>v.d<Math.max(20,v.radius+10)).sort((a,b)=>a.d-b.d);
    if(matches.length){select(matches[0].body);return;}
    else{const star=screen(0,0);if(Math.hypot(x-star.x,y-star.y)<Math.max(24,visualRadius(state.system.star.diameter,'star')*state.zoom+8)){select(state.system.star);return;}}
  }else if(state.scene==='chart'){
    const match=nearbyStars().map(star=>{const p=screen(star.x,star.y);return {star,d:Math.hypot(x-p.x,y-p.y)};})
      .filter(v=>v.d<26).sort((a,b)=>a.d-b.d)[0];if(match){select(match.star);return;}
  }
  const cell=gridCell(world(x,y),state.scene);
  if(state.scene==='system'&&Math.hypot(cell.x,cell.y)<visualRadius(state.system.star.diameter)+24){toast('Choose a coordinate outside the star.');return;}
  state.waypoint=cell;state.selected=null;state.autopilot=null;state.hoverCell=null;updateUI();
}
canvas.addEventListener('pointerleave',()=>{state.hoverCell=null;});
canvas.addEventListener('pointerup',e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);
  if(gesture&&!gesture.moved&&pointers.size===0)pick(e);gesture=null;state.pinch=null;});
canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;state.pinch=null;});
canvas.addEventListener('wheel',e=>{if(!state.save)return;e.preventDefault();zoom(e.deltaY<0?1.12:1/1.12);},{passive:false});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if($('modal').classList.contains('visible'))closeModal();else if(state.waypoint){state.waypoint=null;state.autopilot=null;updateUI();}else if(!$('universeMenuStage').hidden&&!state.save)showMenuStage('main');return;}
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
