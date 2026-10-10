const kinds=new Set(['star','planet','dwarf-planet','moon','sample','lander','coordinate']);
export function normalizeLogVisual(value){
  if(!value||!kinds.has(value.kind)||typeof value.system!=='string'||!value.system||value.system.length>512||typeof value.id!=='string'||!value.id||value.id.length>750)return;
  return {system:value.system,id:value.id,kind:value.kind};
}
export function logObjectReference(entry,save){
  const visual=normalizeLogVisual(entry.visual);if(visual)return visual;
  const key=entry.objectKey;if(typeof key!=='string')return;
  // Survey keys historically join a system seed and its already-prefixed body
  // ID. Seeds themselves can contain colons, so splitting on ':' loses identity.
  for(let i=key.indexOf(':');i>=0;i=key.indexOf(':',i+1)){
    const seed=key.slice(0,i);if(seed&&key.startsWith(seed+':'+seed+':'))return {system:seed,id:key.slice(i+1)};
  }
  for(const seed of new Set([save.currentSystem,save.homeSeed]))if(seed&&key.startsWith(seed+':'))return {system:seed,id:key};
}
