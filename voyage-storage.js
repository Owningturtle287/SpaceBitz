// Each write is atomic. Never evict another voyage to make room for a new one.
export const SAVE_KEY='spacebitz:field:v1';
export function readVoyages(storage,key=SAVE_KEY){
  const text=storage.getItem(key);
  if(text===null)return [];
  let saves;try{saves=JSON.parse(text);}catch{throw Error('Saved voyages could not be read. Export or recover the stored data before saving.');}
  if(!Array.isArray(saves))throw Error('The saved-voyage list is damaged. It has not been overwritten.');
  return saves;
}
export function mergeVoyages(existing,incoming){
  const ids=new Set(incoming.map(save=>save.id));
  return [...incoming,...existing.filter(save=>!ids.has(save?.id))];
}
export function writeVoyages(storage,incoming,key=SAVE_KEY){
  const saves=mergeVoyages(readVoyages(storage,key),incoming);
  storage.setItem(key,JSON.stringify(saves));return saves;
}
export function persistVoyage(storage,save,now=Date.now()){
  const updated={...save,updated:now};writeVoyages(storage,[updated]);
  save.updated=now;return true;
}
export function deleteVoyage(storage,id){
  storage.setItem(SAVE_KEY,JSON.stringify(readVoyages(storage).filter(save=>save?.id!==id)));
}
export function saveBeforeExit(save,exit){if(!save())return false;exit();return true;}
