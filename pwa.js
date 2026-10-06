// An update must never reload an active voyage, including when another tab
// activates a worker. Apply it only after the player has safely reached the menu.
export function createUpdateCoordinator({isSafe,reload,onReady=()=>{}}){
  let registration=null,changed=false,reloading=false;
  const apply=()=>{
    if(!isSafe()||reloading)return false;
    if(changed){reloading=true;reload();return true;}
    if(registration?.waiting){registration.waiting.postMessage({type:'SKIP_WAITING'});return true;}
    return false;
  };
  return {
    apply,
    waiting(value){registration=value;if(!apply())onReady();},
    changed(){changed=true;if(!apply())onReady();}
  };
}
export function registerAppWorker({serviceWorker,url='./sw.js',isSafe,reload,onReady}){
  const update=createUpdateCoordinator({isSafe,reload,onReady});
  const controlled=Boolean(serviceWorker.controller);
  serviceWorker.addEventListener('controllerchange',()=>{if(controlled)update.changed();});
  serviceWorker.register(url).then(registration=>{
    if(registration.waiting)update.waiting(registration);
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;
      worker?.addEventListener('statechange',()=>{
        if(worker.state==='installed'&&serviceWorker.controller&&registration.waiting)update.waiting(registration);
      });
    });
  }).catch(()=>{});
  return update.apply;
}
