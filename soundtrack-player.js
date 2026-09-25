export class SoundtrackPlayer {
  constructor(src){
    this.audio=new Audio(src);
    this.audio.loop=true;
    this.audio.preload='auto';
    this.audio.playsInline=true;
    this.enabled=true;
    this.volume=.75;
    this.timer=null;
    this.generation=0;
  }
  configure(enabled,volume){
    this.enabled=Boolean(enabled);
    this.volume=Math.max(0,Math.min(1,Number(volume)||0));
    if(!this.enabled){
      this.clearTimer();
      this.audio.pause();
      this.audio.currentTime=0;
      return;
    }
    if(!this.audio.paused)this.audio.volume=this.volume;
  }
  start(delaySeconds=2){
    const generation=++this.generation;
    this.clearTimer();
    this.audio.pause();
    this.audio.currentTime=0;
    if(!this.enabled)return;
    this.audio.volume=0;
    const promise=this.audio.play();
    if(promise?.catch)promise.catch(()=>{});
    this.timer=setTimeout(()=>{
      this.timer=null;
      if(generation!==this.generation||!this.enabled)return;
      try{this.audio.currentTime=0;}catch{}
      this.audio.volume=this.volume;
      if(this.audio.paused){
        const retry=this.audio.play();
        if(retry?.catch)retry.catch(()=>{});
      }
    },Math.max(0,delaySeconds)*1000);
  }
  startNow(){
    this.start(0);
  }
  stop(){
    this.generation++;
    this.clearTimer();
    this.audio.pause();
    this.audio.currentTime=0;
    this.audio.volume=this.volume;
  }
  clearTimer(){
    if(this.timer!==null){clearTimeout(this.timer);this.timer=null;}
  }
}
