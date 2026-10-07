// Text sizes are independent of panel geometry. Master mode preserves custom sizes.
export function interfaceFonts(settings,prefix='terminal'){
  const master=settings[prefix+'FontMode']==='master'?settings[prefix+'FontSize']:null;
  const names=prefix==='terminal'?['Data','Label','Header','Status','Input']:['Data','Label','Header','Status'];
  return Object.fromEntries(names.map(name=>[name.toLowerCase(),master??settings[prefix+name+'Font']]));
}
export function applyInterfaceFonts(settings,root=document.documentElement){
  for(const prefix of ['terminal','log'])for(const [name,size] of Object.entries(interfaceFonts(settings,prefix)))root.style.setProperty('--'+prefix+'-'+name+'-font',size+'px');
}
