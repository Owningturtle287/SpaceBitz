export const TERMINAL_HISTORY_LIMIT=80;
// Every generated item shares one chronological, clearable screen stream.
export function addTerminalEntry(history,text,kind='message'){
  const value=String(text).trim().slice(0,kind==='record'?32768:512);
  if(!value)return null;
  const entry={text:value,kind:kind==='record'?'record':kind==='input'?'input':'message'};
  history.push(entry);
  if(history.length>TERMINAL_HISTORY_LIMIT)history.splice(0,history.length-TERMINAL_HISTORY_LIMIT);
  return entry;
}
