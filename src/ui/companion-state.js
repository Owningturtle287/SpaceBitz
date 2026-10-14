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
      if(active&&now<active.until&&active.priority>=3)return active.kind;
      if(state.warpUntil)return 'warp';
      if(state.autopilot)return 'travel';
      if(active&&now<active.until)return active.kind;
      if(state.terminal&&!state.terminal.finished)return 'scan';
      const phase=now%16000;
      return phase<180?'blink':phase>11000&&phase<12700?'glance':phase>14000&&phase<15000?'stretch':'idle';
    }
  };
}
export function companionPlacement(card,pocket,view,areas=[],obstacles=[],open=false){
  const anchor=Math.max(card.y,pocket.y),height=open?Math.max(8,Math.min(124,card.y-6)):Math.min(40,Math.max(8,card.y-6));
  const width=open?height*120/132:100;
  const clamp=x=>Math.max(6,Math.min(view.width-width-6,x));
  const candidates=[card.x+(card.width-width)/2,card.x+6,card.x+card.width-width-6,...areas.flatMap(a=>[a.x-width-4,a.x+a.width+4])].map(clamp);
  const top=anchor-height,overlap=(x,o)=>x<o.x+o.width&&x+width>o.x&&top<o.y+o.height&&anchor>o.y;
  const x=candidates.find(x=>![...areas,...obstacles].some(o=>overlap(x,o)))??candidates[1];
  return {x,y:anchor,width,height};
}
