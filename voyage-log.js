// The recent in-memory log is a working set. Older entries remain in the database.
export const RECENT_LOG_LIMIT=200;
export const LOG_PAGE_SIZE=80;
const changes=new WeakMap(),initialized=new WeakSet();let serial=0;
function changed(save,entry){
  initializeLog(save);
  entry.id=entry.kind==='object'?'object:'+entry.objectKey:entry.id||(globalThis.crypto?.randomUUID?.()||'event:'+Date.now()+':'+ ++serial);
  entry.sequence=++save.logSequence;let pending=changes.get(save);
  if(!pending)changes.set(save,pending=new Map());pending.set(entry.id,entry);return entry;
}
export function initializeLog(save){
  if(initialized.has(save))return;initialized.add(save);
  save.logSequence=Math.max(Number.isSafeInteger(save.logSequence)&&save.logSequence>=0?save.logSequence:0,save.log.length);
  for(const [index,entry]of save.log.entries()){
    entry.id=entry.kind==='object'?'object:'+entry.objectKey:entry.id||'legacy:'+index;
    entry.sequence||=save.log.length-index;
    save.logSequence=Math.max(save.logSequence,entry.sequence);
  }
}
export function pendingLogEntries(save,all=false){
  initializeLog(save);
  return [...(all?new Map([...save.log].reverse().map(e=>[e.id,e])):changes.get(save)||new Map()).values()];
}
export function acknowledgeLogEntries(save,entries){
  const pending=changes.get(save);for(const entry of entries)if(pending?.get(entry.id)===entry)pending.delete(entry.id);
  save.log=save.log.slice(0,RECENT_LOG_LIMIT);
}
export function recordEvent(save,{name,action,kind,category}){
  if(!save)return;save.logSequence||=0;
  const entry=changed(save,{name,action,days:save.days,...kind&&{kind},...category&&{category}});
  save.log.unshift(entry);return entry;
}
export function recordAction(save,text){
  const action=String(text).trim().slice(0,512);if(!save||!action)return;
  return recordEvent(save,{kind:'action',name:'Ship status',action});
}
export const LOG_FILTERS=Object.freeze([['all','All'],['star','Stars'],['planet','Planets'],['moon','Moons'],['item','Items'],['status','Status Updates']]);
export function logCategory(entry){
  if(entry.kind!=='object')return /sample|item/i.test(entry.action)?'item':'status';
  if(['star','planet','moon','item'].includes(entry.category))return entry.category;
  if(entry.category==='dwarf-planet')return 'planet';
  if(entry.category)return 'item';
  // Older survey snapshots have only their displayed object type.
  if(/^(dwarf )?planet\b/i.test(entry.type))return 'planet';
  if(/^moon\b/i.test(entry.type))return 'moon';
  if(/^(landing shuttle|surface sample|coordinate)/i.test(entry.type))return 'item';
  return 'star';
}
export function recordObject(save,{key,name,type,category,text}){
  if(!save)return;
  const prior=save.log.findIndex(entry=>entry.kind==='object'&&entry.objectKey===key);
  const entry={kind:'object',objectKey:key,name,type,action:'Object survey',data:text.slice(0,32768),days:save.days};
  entry.category=logCategory({...entry,category});
  if(prior>=0)save.log.splice(prior,1);
  save.logSequence||=0;changed(save,entry);save.log.unshift(entry);return entry;
}
export function restoreLogEntry(entry,days){
  const result={name:entry.name.slice(0,180),action:typeof entry.action==='string'?entry.action.slice(0,512):'Discovery',days};
  if(entry.kind==='object'&&typeof entry.objectKey==='string'&&typeof entry.data==='string')Object.assign(result,{kind:'object',objectKey:entry.objectKey.slice(0,720),type:typeof entry.type==='string'?entry.type.slice(0,180):'Object',data:entry.data.slice(0,32768)});
  else if(entry.kind==='action')result.kind='action';
  if(result.kind==='object')result.category=logCategory(entry);
  if(typeof entry.id==='string'&&entry.id.length<=750)result.id=entry.id;
  if(Number.isSafeInteger(entry.sequence)&&entry.sequence>0)result.sequence=entry.sequence;
  return result;
}
