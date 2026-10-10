// An update must never reload an active voyage, including when another tab
// activates a worker. Apply it only after the player has safely reached the menu.
export function createUpdateCoordinator({isSafe,reload,onReady=()=>{}}){
  let registration=null,changed=false,reloading=false,notified=false;
  const ready=()=>{if(!notified){notified=true;onReady();}};
  const apply=()=>{
    if(!isSafe()||reloading)return false;
    if(changed){reloading=true;reload();return true;}
    if(registration?.waiting){registration.waiting.postMessage({type:'SKIP_WAITING'});return true;}
    return false;
  };
  return {
    apply,
    waiting(value){registration=value;if(!apply())ready();},
    changed(){changed=true;if(!apply())ready();}
  };
}
export function registerAppWorker({serviceWorker,url='./sw.js',isSafe,reload,onReady,onError=()=>{}}){
  const update=createUpdateCoordinator({isSafe,reload,onReady});
  let controlled=Boolean(serviceWorker.controller);
  serviceWorker.addEventListener('controllerchange',()=>{
    if(controlled)update.changed();else controlled=Boolean(serviceWorker.controller);
  });
  const observed=new WeakSet();
  const register=()=>serviceWorker.register(url).then(registration=>{
    const observe=worker=>{
      if(!worker||observed.has(worker))return;observed.add(worker);
      let installed=['installed','activating','activated'].includes(worker.state);
      const changed=()=>{
        if(['installed','activating','activated'].includes(worker.state))installed=true;
        if(worker.state==='installed'&&serviceWorker.controller&&registration.waiting)update.waiting(registration);
        if(worker.state==='redundant'&&!installed)onError(Error('The new app files could not be installed. Try again when online.'));
      };
      worker.addEventListener('statechange',changed);changed();
    };
    if(registration.waiting)update.waiting(registration);
    registration.addEventListener('updatefound',()=>observe(registration.installing));
    observe(registration.installing);return registration;
  }).catch(error=>{onError(error);return null;});
  let pending=register();
  const apply=update.apply;
  apply.check=async()=>{
    let registration=await pending;if(!registration)registration=await (pending=register());if(!registration)return;
    try{await registration.update();if(registration.waiting)update.waiting(registration);return Boolean(registration.waiting);}
    catch(error){onError(error);}
  };
  return apply;
}
