export class SoundtrackPlayer {
  constructor(src){
    this.audio=new Audio(src);
    this.audio.loop=false;
    this.audio.preload='auto';
    this.audio.playsInline=true;
    this.enabled=true;
    this.volume=.75;
    this.timer=null;
    this.started=false;
    this.attempting=false;
    this.blocked=false;
    this.unlockInstalled=false;
    this.unlockHandler=()=>this.unlock();

    this.audio.addEventListener?.('ended',()=>this.onEnded());
  }

  configure(enabled,volume){
    const wasEnabled=this.enabled;
    this.enabled=Boolean(enabled);
    this.volume=Math.max(0,Math.min(1,Number(volume)||0));
    this.audio.volume=this.volume;

    if(!this.enabled){
      this.clearTimer();
      this.removeUnlock();
      this.blocked=false;
      this.attempting=false;
      this.audio.pause();
      this.audio.currentTime=0;
      return;
    }

    if(!wasEnabled&&this.started){
      this.audio.currentTime=0;
      this.schedule(2);
    }
  }

  begin(delaySeconds=2){
    if(this.started)return;
    this.started=true;
    if(!this.enabled)return;
    this.audio.currentTime=0;
    this.schedule(delaySeconds);
  }

  schedule(delaySeconds=2){
    this.clearTimer();
    if(!this.started||!this.enabled)return;
    this.timer=setTimeout(()=>{
      this.timer=null;
      this.playFromStart();
    },Math.max(0,delaySeconds)*1000);
  }

  playFromStart(){
    if(!this.started||!this.enabled||this.attempting)return;
    this.attempting=true;
    this.blocked=false;
    try{this.audio.currentTime=0;}catch{}
    this.audio.volume=this.volume;

    let attempt;
    try{attempt=this.audio.play();}
    catch{
      this.attempting=false;
      this.blocked=true;
      this.installUnlock();
      return;
    }

    if(attempt?.then){
      attempt.then(()=>{
        this.attempting=false;
        this.blocked=false;
        this.removeUnlock();
      }).catch(()=>{
        this.attempting=false;
        this.blocked=true;
        this.installUnlock();
      });
    }else{
      this.attempting=false;
      this.blocked=false;
      this.removeUnlock();
    }
  }

  onEnded(){
    if(!this.started||!this.enabled)return;
    this.blocked=false;
    this.attempting=false;
    this.removeUnlock();
    this.audio.currentTime=0;
    this.schedule(2);
  }

  installUnlock(){
    if(this.unlockInstalled||!globalThis.document)return;
    this.unlockInstalled=true;
    document.addEventListener('pointerdown',this.unlockHandler,{passive:true,once:true});
    document.addEventListener('keydown',this.unlockHandler,{passive:true,once:true});
    document.addEventListener('touchend',this.unlockHandler,{passive:true,once:true});
  }

  removeUnlock(){
    if(!this.unlockInstalled||!globalThis.document)return;
    this.unlockInstalled=false;
    document.removeEventListener('pointerdown',this.unlockHandler);
    document.removeEventListener('keydown',this.unlockHandler);
    document.removeEventListener('touchend',this.unlockHandler);
  }

  unlock(){
    this.removeUnlock();
    if(!this.blocked||!this.started||!this.enabled)return;
    this.playFromStart();
  }

  stop(){
    this.started=false;
    this.clearTimer();
    this.removeUnlock();
    this.blocked=false;
    this.attempting=false;
    this.audio.pause();
    this.audio.currentTime=0;
    this.audio.volume=this.volume;
  }

  clearTimer(){
    if(this.timer!==null){clearTimeout(this.timer);this.timer=null;}
  }
}
