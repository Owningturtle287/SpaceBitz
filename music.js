// SpaceBitz soundtrack rebuilt from the original nostalgic_melody.wav reference.
// The source phrase is 16 notes with a 0.60 second note interval.
export const MELODY=[60,64,67,64,62,67,59,67,57,60,64,60,57,60,65,60];
export const NOTE_SECONDS=.60;

export class Soundtrack {
  constructor(onStatus=()=>{}) {
    this.onStatus=onStatus;this.enabled=true;this.volume=.75;this.context=null;
    this.master=null;this.filter=null;this.compressor=null;this.tone=null;this.toneGain=null;
    this.timer=null;this.delayTimer=null;this.step=0;this.nextTime=0;this.hidden=false;this.active=false;this.generation=0;
  }
  configure(enabled,volume) {
    this.enabled=enabled;this.volume=volume;
    if(this.master&&this.context?.state!=='closed')
      this.master.gain.setTargetAtTime(enabled?volume*.34:0,this.context.currentTime,.03);
    if(!enabled)this.stop();
  }
  ensure() {
    if(this.context)return true;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){this.onStatus('unavailable');return false;}
    try{
      const c=this.context=new Audio({latencyHint:'playback'});
      this.master=c.createGain();this.filter=c.createBiquadFilter();this.compressor=c.createDynamicsCompressor();
      this.master.gain.value=this.enabled?this.volume*.34:0;
      this.filter.type='lowpass';this.filter.frequency.value=1900;this.filter.Q.value=.25;
      this.compressor.threshold.value=-20;this.compressor.knee.value=16;this.compressor.ratio.value=3;
      this.compressor.attack.value=.004;this.compressor.release.value=.12;
      this.filter.connect(this.compressor);this.compressor.connect(this.master);this.master.connect(c.destination);
      c.onstatechange=()=>{if(c.state!=='running')this.onStatus(this.enabled?'ready':'off');};
      return true;
    }catch{this.onStatus('unavailable');return false;}
  }
  createTone(generation=this.generation) {
    if(this.tone||generation!==this.generation||!this.context)return !!this.tone;
    const c=this.context,o=c.createOscillator(),g=c.createGain();
    const real=new Float32Array([0,0,0,0,0]),imag=new Float32Array([0,1,.16,.055,.018]);
    if(typeof c.createPeriodicWave==='function'&&typeof o.setPeriodicWave==='function')
      o.setPeriodicWave(c.createPeriodicWave(real,imag));
    else o.type='sine';
    g.gain.value=0;o.connect(g);g.connect(this.filter);
    o.start(c.currentTime);
    this.tone=o;this.toneGain=g;
    return true;
  }
  stopTone() {
    const o=this.tone,g=this.toneGain;this.tone=null;this.toneGain=null;
    if(o){try{o.stop();}catch{}try{o.disconnect();}catch{}}
    if(g)try{g.disconnect();}catch{}
  }
  startFromBeginning(delaySeconds=2) {
    if(!this.enabled||this.hidden)return;
    const generation=++this.generation;
    this.clearDelay();this.clearScheduler();this.stopTone();
    this.active=true;this.step=0;this.nextTime=0;
    if(!this.ensure()){this.active=false;return;}
    const armDelay=()=>{
      if(generation!==this.generation||!this.active||!this.enabled||this.hidden)return;
      this.clearDelay();
      this.delayTimer=setTimeout(()=>{
        this.delayTimer=null;
        if(generation!==this.generation||!this.active||!this.enabled||this.hidden)return;
        this.createTone(generation);this.schedule(.035,generation);
      },Math.max(0,delaySeconds)*1000);
      this.onStatus('ready');
    };
    if(this.context.state==='running'){armDelay();return;}
    this.onStatus('ready');
    this.context.resume().then(armDelay).catch(()=>{
      if(generation===this.generation){this.active=false;this.onStatus('ready');}
    });
  }
  schedule(delaySeconds=.035,generation=this.generation) {
    if(this.timer!==null||generation!==this.generation||!this.active||!this.tone)return;
    const c=this.context;if(!this.enabled||this.hidden||c.state!=='running')return;
    this.nextTime=c.currentTime+Math.max(0,delaySeconds);
    const tick=()=>{
      if(generation!==this.generation||!this.active||!this.enabled||this.hidden||c.state!=='running'||!this.tone){
        this.clearScheduler();return;
      }
      if(this.nextTime<c.currentTime-.18)this.nextTime=c.currentTime+.035;
      while(this.nextTime<c.currentTime+.18){
        this.note(MELODY[this.step++%MELODY.length],this.nextTime,generation);
        this.nextTime+=NOTE_SECONDS;
      }
    };
    this.timer=setInterval(tick,70);tick();this.onStatus('playing');
  }
  note(midi,time,generation=this.generation) {
    if(generation!==this.generation||!this.tone||!this.toneGain)return;
    const hz=440*2**((midi-69)/12),freq=this.tone.frequency,gain=this.toneGain.gain;
    freq.setValueAtTime(hz,time);
    gain.setValueAtTime(0,time);
    gain.linearRampToValueAtTime(1,time+.014);
    gain.linearRampToValueAtTime(.72,time+.105);
    gain.setValueAtTime(.72,time+.445);
    gain.linearRampToValueAtTime(0,time+.56);
  }
  resume() {
    if(!this.active||!this.enabled||this.hidden||!this.ensure())return;
    const generation=this.generation,begin=()=>{
      if(generation!==this.generation||!this.active||!this.enabled||this.hidden)return;
      if(!this.tone)this.createTone(generation);
      this.schedule(.035,generation);
    };
    if(this.context.state==='running')begin();
    else this.context.resume().then(begin).catch(()=>this.onStatus('ready'));
  }
  clearDelay() {
    if(this.delayTimer!==null){clearTimeout(this.delayTimer);this.delayTimer=null;}
  }
  clearScheduler() {
    if(this.timer!==null){clearInterval(this.timer);this.timer=null;}
  }
  stop() {
    this.active=false;this.generation++;this.step=0;this.nextTime=0;
    this.clearDelay();this.clearScheduler();this.stopTone();
    this.onStatus(this.enabled?'ready':'off');
  }
  visibility(hidden) {
    this.hidden=hidden;
    if(hidden){
      this.clearScheduler();
      if(this.toneGain&&this.context)this.toneGain.gain.setValueAtTime(0,this.context.currentTime);
      this.context?.suspend().catch(()=>{});
    }else this.resume();
  }
}
