// Body language is local and cosmetic; it never changes flight or terminal data.
const reactions={wake:[1100,2],greet:[1900,2],input:[1500,3],complete:[2200,3],celebrate:[2600,4],concern:[2800,5],clear:[1300,3],select:[1300,1]};
export function reactionForMessage(text){
  if(/failed|could not|error|quota|storage is full|no solid surface|interrupted/i.test(text))return 'concern';
  if(/first landing|sample secured|launch complete|arriv|reached|collected|imported/i.test(text))return 'celebrate';
  return 'input';
}
export function createCompanionBrain(){
  let active=null,wasOpen=false,previousTravel=false;
  return {
    react(kind,now){const spec=reactions[kind];if(!spec)return;if(active&&now<active.until&&active.priority>spec[1])return;active={kind,until:now+spec[0],priority:spec[1]};},
    update(state,now){
      const open=Boolean(state.terminalExpanded);
      if(open&&!wasOpen){active={kind:'wake',until:now+1100,priority:2};}
      wasOpen=open;
      const travel=Boolean(state.autopilot||state.warpUntil);
      if(previousTravel&&!travel&&open)this.react('celebrate',now);previousTravel=travel;
      if(!state.save||state.scene==='menu')return 'hidden';
      if(!open)return state.selected||state.waypoint?'sleep':'hidden';
      if(active&&now<active.until&&active.kind==='concern')return active.kind;
      if(state.warpUntil)return 'warp';
      if(active&&now<active.until&&active.priority>=3)return active.kind;
      if(state.autopilot)return 'travel';
      if(active&&now<active.until)return active.kind;
      if(state.terminal&&!state.terminal.finished)return 'scan';
      const phase=now%16000;
      return phase<180?'blink':phase>11000&&phase<12700?'glance':phase>14000&&phase<15000?'stretch':'idle';
    }
  };
}
export function companionPlacement(card,pocket,view,areas=[],obstacles=[],open=false){
  // Only the top 52 of 72 sprite rows are exposed when awake; relaxed hands
  // and the lower torso stay behind the terminal. Sleep exposes half the head.
  const anchor=Math.max(card.y,pocket.y),height=open?Math.max(8,Math.min(116,card.y-6)):Math.min(42,Math.max(8,card.y-6));
  const width=open?height*64/52:132;
  const clamp=x=>Math.max(6,Math.min(view.width-width-6,x));
  const top=anchor-height,center=card.x+(card.width-width)/2;
  const overlap=(x,o,pad=0)=>x<o.x+o.width+pad&&x+width>o.x-pad&&top<o.y+o.height+pad&&anchor>o.y-pad;
  // Extra room covers the width transition while the head/body are revealed.
  const candidates=[center,...areas.filter(a=>overlap(center,a,4)).flatMap(a=>[a.x-width-4,a.x+a.width+4]),card.x+6,card.x+card.width-width-6].map(clamp);
  const x=candidates.find(x=>!areas.some(o=>overlap(x,o,4))&&!obstacles.some(o=>overlap(x,o)))??clamp(card.x+6);
  return {x,y:anchor,width,height};
}
export function companionMotion(pose,now,reduced=false){
  if(reduced)return {bob:0,turn:0,lift:0};
  const t=now/1000;
  // Idle, listening and expressive reactions address the player head-on.
  const turn=['glance','scan','travel'].includes(pose)?Math.round(Math.sin(t*(pose==='scan'?3:1.8))*2):0;
  const raised=['wake','greet','celebrate','complete','stretch'].includes(pose);
  return {bob:Math.round(Math.sin(t*(pose==='sleep'?1.6:2.2))),turn,lift:raised?20+Math.round(Math.sin(t*(pose==='celebrate'?9:4))*2):0};
}
