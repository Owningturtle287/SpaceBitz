// SpaceBitz's original 48 BPM melody, preserved from v0.0.98.
const PHRASE = [60,64,67,64,62,67,59,67,57,60,64,60,57,60,65,60];
export const MELODY = [...Array.from({length:6},()=>PHRASE).flat(),null,null,null,null,null];

export class Soundtrack {
  constructor(onStatus=()=>{}) {
    this.onStatus=onStatus;this.enabled=true;this.volume=.65;this.context=null;
    this.timer=null;this.step=0;this.nextTime=0;this.hidden=false;this.active=false;
    this.generation=0;this.voices=new Set();
  }
  configure(enabled,volume) {
    this.enabled=enabled;this.volume=volume;
    if(this.master && this.context?.state!=='closed')
      this.master.gain.setTargetAtTime(enabled?volume*.215:0,this.context.currentTime,.03);
    if(!enabled)this.stop();
  }
  ensure() {
    if(this.context)return true;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){this.onStatus('unavailable');return false;}
    try{
      this.context=new Audio({latencyHint:'playback'});this.master=this.context.createGain();
      this.master.gain.value=this.enabled?this.volume*.215:0;
      this.master.connect(this.context.destination);
      this.context.onstatechange=()=>{
        if(this.context.state!=='running')this.onStatus(this.enabled?'ready':'off');
      };
      return true;
    }catch{this.onStatus('unavailable');return false;}
  }
  startFromBeginning(delaySeconds=2) {
    if(!this.enabled||this.hidden)return;
    const generation=++this.generation;
    this.clearScheduler();this.cancelVoices();
    this.active=true;this.step=0;this.nextTime=0;
    if(!this.ensure()){this.active=false;return;}
    const begin=()=>{
      if(generation!==this.generation||!this.active||!this.enabled||this.hidden)return;
      this.schedule(delaySeconds,generation);
    };
    if(this.context.state==='running'){begin();return;}
    this.onStatus('ready');
    this.context.resume().then(begin).catch(()=>{
      if(generation===this.generation){this.active=false;this.onStatus('ready');}
    });
  }
  schedule(delaySeconds=.06,generation=this.generation) {
    if(this.timer!==null||generation!==this.generation||!this.active)return;
    const c=this.context;
    if(!this.enabled||this.hidden||c.state!=='running')return;
    this.nextTime=c.currentTime+Math.max(0,delaySeconds);
    const tick=()=>{
      if(generation!==this.generation||!this.active||!this.enabled||this.hidden||c.state!=='running'){
        this.clearScheduler();return;
      }
      if(this.nextTime<c.currentTime-.2)this.nextTime=c.currentTime+.04;
      while(this.nextTime<c.currentTime+.18){
        this.note(MELODY[this.step++%MELODY.length],this.nextTime,generation);
        this.nextTime+=.625;
      }
    };
    this.timer=setInterval(tick,75);tick();this.onStatus('playing');
  }
  resume() {
    if(!this.active||!this.enabled||this.hidden||!this.ensure())return;
    const generation=this.generation,begin=()=>{
      if(generation===this.generation&&this.active&&this.enabled&&!this.hidden)this.schedule(.06,generation);
    };
    if(this.context.state==='running')begin();
    else this.context.resume().then(begin).catch(()=>this.onStatus('ready'));
  }
  note(midi,time,generation=this.generation) {
    if(midi===null||generation!==this.generation)return;
    const c=this.context,o=c.createOscillator(),g=c.createGain(),filter=c.createBiquadFilter();
    const lfo=c.createOscillator(),depth=c.createGain();
    const voice={o,lfo,g,filter,depth,done:false};
    const cleanup=()=>{
      if(voice.done)return;voice.done=true;this.voices.delete(voice);
      for(const node of [o,lfo,g,filter,depth])try{node.disconnect();}catch{}
    };
    voice.cleanup=cleanup;this.voices.add(voice);
    o.type='sine';o.frequency.value=440*2**((midi-69)/12);
    lfo.frequency.value=4.5;depth.gain.value=4;lfo.connect(depth);depth.connect(o.detune);
    filter.type='lowpass';filter.frequency.value=1100;filter.Q.value=.4;
    g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(1,time+.012);
    g.gain.linearRampToValueAtTime(.6,time+.112);g.gain.linearRampToValueAtTime(0,time+.72);
    o.connect(g);g.connect(filter);filter.connect(this.master);
    o.onended=cleanup;
    o.start(time);lfo.start(time);o.stop(time+.74);lfo.stop(time+.74);
  }
  cancelVoices() {
    for(const voice of [...this.voices]){
      try{voice.o.stop();}catch{}try{voice.lfo.stop();}catch{}
      voice.cleanup?.();
    }
    this.voices.clear();
  }
  clearScheduler() {
    if(this.timer!==null){clearInterval(this.timer);this.timer=null;}
  }
  stop() {
    this.active=false;this.generation++;this.step=0;this.nextTime=0;
    this.clearScheduler();this.cancelVoices();
    this.onStatus(this.enabled?'ready':'off');
  }
  visibility(hidden) {
    this.hidden=hidden;
    if(hidden){
      this.clearScheduler();this.cancelVoices();
      this.context?.suspend().catch(()=>{});
    }else this.resume();
  }
}
