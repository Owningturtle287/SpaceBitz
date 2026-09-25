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
    this.hidden=false;
    this.waitingForGesture=false;
    this.primed=false;
    this.unlocked=false;
    this.resumeMode='none';

    this.audio.addEventListener?.('ended',()=>this.onEnded());

    this.gestureHandler=()=>this.onGesture();
    if(globalThis.document){
      document.addEventListener('pointerdown',this.gestureHandler,{passive:true});
      document.addEventListener('keydown',this.gestureHandler,{passive:true});
      document.addEventListener('touchend',this.gestureHandler,{passive:true});
    }
  }

  configure(enabled,volume){
    const wasEnabled=this.enabled;
    this.enabled=Boolean(enabled);
    this.volume=Math.max(0,Math.min(1,Number(volume)||0));

    if(!this.primed)this.audio.volume=this.volume;

    if(!this.enabled){
      this.clearTimer();
      this.waitingForGesture=false;
      this.primed=false;
      this.audio.pause();
      this.audio.currentTime=0;
      return;
    }

    if(!wasEnabled && this.started){
      this.audio.currentTime=0;
      this.schedule(2);
      this.primeIfPossible();
    }
  }

  begin(delaySeconds=2){
    if(this.started)return;
    this.started=true;
    this.audio.currentTime=0;
    if(!this.enabled||this.hidden)return;
    this.schedule(delaySeconds);
  }

  schedule(delaySeconds=2){
    this.clearTimer();
    if(!this.started||!this.enabled||this.hidden)return;
    this.waitingForGesture=false;
    this.timer=setTimeout(()=>{
      this.timer=null;
      this.playFromStart();
    },Math.max(0,delaySeconds)*1000);
  }

  onEnded(){
    if(!this.started||!this.enabled||this.hidden)return;
    this.audio.currentTime=0;
    this.schedule(2);
  }

  playFromStart(){
    if(!this.started||!this.enabled||this.hidden)return;
    try{this.audio.currentTime=0;}catch{}
    this.audio.volume=this.volume;

    if(!this.audio.paused){
      this.primed=false;
      this.unlocked=true;
      this.waitingForGesture=false;
      return;
    }

    const attempt=this.audio.play();
    if(attempt?.then){
      attempt.then(()=>{
        this.unlocked=true;
        this.primed=false;
        this.waitingForGesture=false;
      }).catch(()=>{
        this.waitingForGesture=true;
        this.primed=false;
      });
    }
  }

  playCurrent(){
    if(!this.started||!this.enabled||this.hidden)return;
    this.audio.volume=this.volume;
    const attempt=this.audio.play();
    if(attempt?.then){
      attempt.then(()=>{
        this.unlocked=true;
        this.waitingForGesture=false;
      }).catch(()=>{this.waitingForGesture=true;});
    }
  }

  primeIfPossible(){
    if(this.unlocked||!this.started||!this.enabled||this.hidden||this.timer===null||!this.audio.paused)return;
    this.audio.volume=0;
    const attempt=this.audio.play();
    if(attempt?.then){
      attempt.then(()=>{
        if(this.timer!==null){
          this.primed=true;
        }else{
          this.audio.pause();
          this.audio.currentTime=0;
          this.audio.volume=this.volume;
        }
      }).catch(()=>{
        this.audio.volume=this.volume;
      });
    }
  }

  onGesture(){
    if(this.unlocked||!this.started||!this.enabled||this.hidden)return;
    if(this.timer!==null){
      this.primeIfPossible();
      return;
    }
    if(this.waitingForGesture)this.playFromStart();
  }

  visibility(hidden){
    hidden=Boolean(hidden);
    if(hidden===this.hidden)return;
    this.hidden=hidden;

    if(hidden){
      if(this.timer!==null)this.resumeMode='delay';
      else if(!this.audio.paused&&!this.audio.ended)this.resumeMode='track';
      else this.resumeMode=this.started&&this.enabled?'delay':'none';
      this.clearTimer();
      this.audio.pause();
      this.primed=false;
      this.waitingForGesture=false;
      return;
    }

    if(!this.enabled||!this.started)return;
    const mode=this.resumeMode;
    this.resumeMode='none';
    if(mode==='track'&&this.audio.currentTime>0&&!this.audio.ended)this.playCurrent();
    else this.schedule(2);
  }

  stop(){
    this.started=false;
    this.clearTimer();
    this.waitingForGesture=false;
    this.primed=false;
    this.audio.pause();
    this.audio.currentTime=0;
    this.audio.volume=this.volume;
  }

  clearTimer(){
    if(this.timer!==null){clearTimeout(this.timer);this.timer=null;}
  }
}
