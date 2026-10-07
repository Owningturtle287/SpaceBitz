export const TERMINAL_HISTORY_LIMIT=80;
// Entries are plain text and bounded independently of object records.
export function addTerminalEntry(history,text,kind='message'){
  const value=String(text).trim().slice(0,512);
  if(!value)return null;
  const entry={text:value,kind:kind==='input'?'input':'message'};
  history.push(entry);
  if(history.length>TERMINAL_HISTORY_LIMIT)history.splice(0,history.length-TERMINAL_HISTORY_LIMIT);
  return entry;
}
