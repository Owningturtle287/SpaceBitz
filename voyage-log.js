// Object surveys retain the most recent snapshot for each object, independent
// of the clearable, bounded terminal screen. Event history remains chronological.
export function recordAction(save,text){
  const action=String(text).trim().slice(0,512);if(!save||!action)return;
  const entry={kind:'action',name:'Ship status',action,days:save.days};
  save.log.unshift(entry);return entry;
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
  save.log.unshift(entry);return entry;
}
export function restoreLogEntry(entry,days){
  const result={name:entry.name.slice(0,180),action:typeof entry.action==='string'?entry.action.slice(0,512):'Discovery',days};
  if(entry.kind==='object'&&typeof entry.objectKey==='string'&&typeof entry.data==='string')Object.assign(result,{kind:'object',objectKey:entry.objectKey.slice(0,720),type:typeof entry.type==='string'?entry.type.slice(0,180):'Object',data:entry.data.slice(0,32768)});
  else if(entry.kind==='action')result.kind='action';
  if(result.kind==='object')result.category=logCategory(entry);
  return result;
}
