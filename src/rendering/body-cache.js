// Profiles are immutable after system generation. Object identity distinguishes
// different generations of the same seeded ID without serializing textures each frame.
const identities=new WeakMap();let nextIdentity=0;
export function bodyCacheKey(body){
  if(!identities.has(body))identities.set(body,++nextIdentity);
  return body.id+'@'+identities.get(body);
}
