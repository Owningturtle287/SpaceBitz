export function collectSample(save,sample,worldName){
  if(save.discoveries.includes(sample.id))return false;
  save.discoveries.push(sample.id);
  save.log.unshift({name:worldName,action:'Sample collected',days:save.days});return true;
}
