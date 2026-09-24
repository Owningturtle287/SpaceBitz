// SpaceBitz's original 48 BPM melody, preserved from v0.0.98.
const PHRASE = [60,64,67,64,62,67,59,67,57,60,64,60,57,60,65,60];
export const MELODY = [...Array.from({length:6},()=>PHRASE).flat(),null,null,null,null,null];
export class Soundtrack {
  constructor(onStatus=()=>{}) {
    this.onStatus=onStatus;this.enabled=true;this.volume=.65;this.context=null;
    this.timer=null;this.step=0;this.nextTime=0;this.hidden=false;
  }
  configure(enabled,volume) {
    this.enabled=enabled;this.volume=volume;
    if(this.master && this.context.state!=='closed')
      this.master.gain.setTargetAtTime(enabled?volume*.215:0,this.context.currentTime,.05);
    if(enabled)this.start();else this.pause();
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
        if(this.context.state==='running' && this.enabled && !this.hidden)this.schedule();
        else this.onStatus(this.enabled?'ready':'off');
      };
      return true;
    }catch{this.onStatus('unavailable');return false;}
  }
  start() {
    if(!this.enabled||this.hidden||!this.ensure())return;
    if(this.context.state==='running'){this.schedule();return;}
    // Attempt autoplay; a browser that requires interaction resumes from the
    // first pointer/key gesture. Never mark playback active while suspended.
    this.onStatus('ready');
    const resume=()=>this.context.resume().then(()=>{
      if(this.context.state==='running' && this.enabled && !this.hidden)this.schedule();
      else this.onStatus('ready');
    }).catch(()=>this.onStatus('ready'));
    resume();
    setTimeout(()=>{if(this.enabled&&!this.hidden&&this.context?.state==='suspended')resume();},250);
  }
  schedule() {
    if(this.timer!==null)return;
    const c=this.context;
    if(!this.enabled||this.hidden||c.state!=='running')return;
    this.nextTime=c.currentTime+.06;
    const tick=()=>{
      if(!this.enabled||this.hidden||c.state!=='running'){this.pause();return;}
      if(this.nextTime<c.currentTime-.2)this.nextTime=c.currentTime+.04;
      while(this.nextTime<c.currentTime+.18){
        this.note(MELODY[this.step++%MELODY.length],this.nextTime);
        this.nextTime+=.625;
      }
    };
    this.timer=setInterval(tick,75);tick();this.onStatus('playing');
  }
  note(midi,time) {
    if(midi===null)return;
    const c=this.context,o=c.createOscillator(),g=c.createGain(),filter=c.createBiquadFilter();
    const lfo=c.createOscillator(),depth=c.createGain();
    o.type='sine';o.frequency.value=440*2**((midi-69)/12);
    lfo.frequency.value=4.5;depth.gain.value=4;lfo.connect(depth);depth.connect(o.detune);
    filter.type='lowpass';filter.frequency.value=1100;filter.Q.value=.4;
    g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(1,time+.012);
    g.gain.linearRampToValueAtTime(.6,time+.112);g.gain.linearRampToValueAtTime(0,time+.72);
    o.connect(g);g.connect(filter);filter.connect(this.master);
    o.onended=()=>{o.disconnect();lfo.disconnect();depth.disconnect();g.disconnect();filter.disconnect();};
    o.start(time);lfo.start(time);o.stop(time+.74);lfo.stop(time+.74);
  }
  pause() {
    if(this.timer!==null){clearInterval(this.timer);this.timer=null;}
    this.onStatus(this.enabled?'ready':'off');
  }
  visibility(hidden) {
    this.hidden=hidden;
    if(hidden){this.pause();this.context?.suspend().catch(()=>{});}
    else this.start();
  }
}
