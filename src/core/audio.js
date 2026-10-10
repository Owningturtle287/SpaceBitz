export function createMusicController(musicAudio,settings,document){
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
  if(!settings.music||document.hidden)return;
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

function setVisibility(hidden){if(hidden){clearMusicUnlock();musicAudio.pause();}else if(musicStarted)playMusic();}
return {beginMusic,stopMusic,applyMusicSetting,setVisibility};
}
