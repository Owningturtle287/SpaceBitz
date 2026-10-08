import {SAVE_KEY,readVoyages,writeVoyages,persistVoyage,deleteVoyage,checkRevision} from './voyage-storage.js';
import {initializeLog,pendingLogEntries,acknowledgeLogEntries,logCategory,LOG_PAGE_SIZE,RECENT_LOG_LIMIT} from './voyage-log.js';

export const VOYAGE_DATABASE='spacebitz-voyages';
const requestResult=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
const completed=transaction=>new Promise((resolve,reject)=>{transaction.oncomplete=resolve;transaction.onabort=()=>reject(transaction.error||Error('Voyage could not be saved.'));});
const coreSave=save=>{const {log,...core}=save;return core;};
const historyEntry=record=>{const {voyageId,categoryIndex,...entry}=record;return entry;};

// Each voyage and history entry has its own record. A transaction checks the
// loaded revision before writing, so stale windows never replace newer progress.
export function createVoyageStore({indexedDB=globalThis.indexedDB,legacyStorage=globalThis.localStorage,keyRange=globalThis.IDBKeyRange}={}){
  if(!indexedDB)return legacyStore(legacyStorage);
  let database;
  const ready=new Promise((resolve,reject)=>{
    const request=indexedDB.open(VOYAGE_DATABASE,1);
    request.onupgradeneeded=()=>{
      const db=request.result;db.createObjectStore('voyages',{keyPath:'id'});
      const log=db.createObjectStore('history',{keyPath:['voyageId','id']});
      log.createIndex('voyage','voyageId');log.createIndex('order',['voyageId','sequence']);
      log.createIndex('category',['voyageId','categoryIndex','sequence']);
      db.createObjectStore('migration');
    };
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(Error('Close the other SpaceBitz window to finish opening saved voyages.'));
    request.onsuccess=()=>{database=request.result;database.onversionchange=()=>database.close();resolve(database);};
  }).then(async db=>{
    // Commit the complete legacy snapshot before removing the old storage key.
    // Concurrent first loads recheck the migration marker in this transaction.
    const tx=db.transaction(['voyages','history','migration'],'readwrite'),done=completed(tx);
    try{
      const migrated=await requestResult(tx.objectStore('migration').get(SAVE_KEY));
      if(!migrated){
        const originals=readVoyages(legacyStorage);
        for(const raw of originals){
          if(!raw||typeof raw.id!=='string')continue;
          const save=structuredClone(raw);save.log||=[];initializeLog(save);
          const voyages=tx.objectStore('voyages');
          if(await requestResult(voyages.get(save.id)))continue;
          for(const entry of pendingLogEntries(save,true))putLog(tx,save.id,entry);
          voyages.put({...coreSave(save),revision:1,logCount:save.log.length});
        }
        // Preserve unrecognized legacy entries too, for recovery rather than eviction.
        tx.objectStore('migration').put({originals},SAVE_KEY);
      }
      await done;
      if(!migrated)try{legacyStorage.removeItem(SAVE_KEY);}catch{}
      return db;
    }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
  });
  // Consumers report errors; suppress an unhandled startup rejection until then.
  ready.catch(()=>{});
  function putLog(tx,id,entry){tx.objectStore('history').put({...entry,voyageId:id,categoryIndex:logCategory(entry)});}
  function range(id,filter){return filter==='all'?keyRange.bound([id,0],[id,Number.MAX_SAFE_INTEGER]):keyRange.bound([id,filter,0],[id,filter,Number.MAX_SAFE_INTEGER]);}
  async function list(){const db=await ready,tx=db.transaction('voyages');return (await requestResult(tx.objectStore('voyages').getAll())).sort((a,b)=>(b.updated||0)-(a.updated||0));}
  async function load(id){
    const db=await ready,tx=db.transaction(['voyages','history']);
    const [core,history]=await Promise.all([requestResult(tx.objectStore('voyages').get(id)),historyPage(tx,id,'all',0,RECENT_LOG_LIMIT)]);
    if(!core)throw Error('This voyage is no longer saved on this device.');
    return {...core,log:history.entries};
  }
  async function save(voyage,now=Date.now()){
    const db=await ready,entries=pendingLogEntries(voyage,!voyage.revision),snapshot=coreSave(structuredClone({...voyage,log:[]}));
    const tx=db.transaction(['voyages','history'],'readwrite'),done=completed(tx);
    let revision,logCount;
    try{
      const voyages=tx.objectStore('voyages'),stored=await requestResult(voyages.get(voyage.id));checkRevision(stored,snapshot);
      revision=(stored?.revision||0)+1;
      for(const entry of entries)putLog(tx,voyage.id,structuredClone(entry));
      logCount=await requestResult(tx.objectStore('history').index('voyage').count(voyage.id));
      voyages.put({...snapshot,revision,updated:now,logCount});await done;
    }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
    voyage.revision=revision;voyage.updated=now;voyage.logCount=logCount;acknowledgeLogEntries(voyage,entries);return true;
  }
  async function importSaves(saves){
    const db=await ready,tx=db.transaction(['voyages','history'],'readwrite'),done=completed(tx);
    try{
      for(const save of saves){
        if(await requestResult(tx.objectStore('voyages').get(save.id)))throw Error('A voyage with this identity already exists.');
        for(const entry of pendingLogEntries(save,true))putLog(tx,save.id,entry);
        tx.objectStore('voyages').put({...coreSave(save),revision:1,logCount:save.log.length});
      }await done;
    }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
  }
  async function remove(id,revision){
    const db=await ready,tx=db.transaction(['voyages','history'],'readwrite'),done=completed(tx);
    try{
      const stored=await requestResult(tx.objectStore('voyages').get(id));checkRevision(stored,{revision});
      tx.objectStore('voyages').delete(id);
      tx.objectStore('history').index('voyage').openCursor(id).onsuccess=e=>{const c=e.target.result;if(c){c.delete();c.continue();}};
      await done;
    }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
  }
  async function historyPage(tx,id,filter,offset,limit){
    const index=tx.objectStore('history').index(filter==='all'?'order':'category'),bounds=range(id,filter);
    const count=requestResult(index.count(bounds));
    const entries=await new Promise((resolve,reject)=>{
      const result=[],request=index.openCursor(bounds,'prev');let skipped=false;
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const cursor=request.result;if(!cursor||result.length===limit){resolve(result);return;}
        if(offset&&!skipped){skipped=true;cursor.advance(offset);return;}
        result.push(historyEntry(cursor.value));cursor.continue();
      };
    });return {entries,total:await count};
  }
  async function page(id,filter='all',offset=0,limit=LOG_PAGE_SIZE){return historyPage((await ready).transaction('history'),id,filter,offset,limit);}
  async function exportSave(voyage){
    const db=await ready,tx=db.transaction('history');
    const records=await requestResult(tx.objectStore('history').index('voyage').getAll(voyage.id));
    const log=new Map(records.map(r=>[r.id,historyEntry(r)]));
    for(const entry of pendingLogEntries(voyage,!voyage.revision))log.set(entry.id,entry);
    const {revision,logCount,...result}=voyage;
    return {...result,log:[...log.values()].sort((a,b)=>b.sequence-a.sequence)};
  }
  return {ready,list,load,save,importSaves,remove,page,exportSave,close:()=>database?.close()};
}
function legacyStore(storage){
  return {ready:Promise.resolve(),list:async()=>readVoyages(storage),load:async id=>{const save=readVoyages(storage).find(s=>s?.id===id);if(!save)throw Error('This voyage is no longer saved.');return save;},
    save:async(save,now)=>persistVoyage(storage,save,now),importSaves:async saves=>writeVoyages(storage,saves),remove:async id=>deleteVoyage(storage,id),
    page:async(id,filter='all',offset=0,limit=LOG_PAGE_SIZE)=>{const log=(readVoyages(storage).find(s=>s?.id===id)?.log||[]).filter(e=>filter==='all'||logCategory(e)===filter);return {entries:log.slice(offset,offset+limit),total:log.length};},
    exportSave:async save=>save,close(){}};
}
