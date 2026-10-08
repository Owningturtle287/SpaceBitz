export function collectSample(save,sample,worldName){
  if(save.discoveries.includes(sample.id))return false;
  save.discoveries.push(sample.id);
  recordEvent(save,{name:worldName,action:'Sample collected',category:'item',visual:{system:save.currentSystem,id:sample.id,kind:'sample'}});return true;
}
import {recordEvent} from './voyage-log.js';
