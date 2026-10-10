// v2 universe generation. Separate percentage pools: these are documented game
// priors, not a measured census of every evolutionary stage of the Milky Way.
export const GENERATION_VERSION=2;
export const POPULATIONS={
  spectral:{label:'MAIN-SEQUENCE SPECTRAL CLASSES',note:'Conditional on a main-sequence primary. Evolved stars use their actual temperature and chemistry.',entries:[['M','M · red dwarf',74],['K','K · orange dwarf',14],['G','G · yellow dwarf',7],['F','F · yellow-white dwarf',3],['A','A · white main-sequence star',1.2],['B','B · blue-white dwarf',.7],['O','O · blue massive dwarf',.1]]},
  family:{label:'STELLAR FAMILIES',note:'Primary-object distribution. Short evolutionary phases are rare. Zero-weight families can be enabled in Custom Mode.',entries:[['main','Main sequence',90],['subgiant','Subgiant',1.5],['giant','Red giant / red clump',3.7],['agb','AGB giant',.15],['supergiant','Blue / yellow / red supergiant',.03],['lbv','Hypergiant / luminous blue variable',.005],['wr','Wolf–Rayet',.005],['wd','White dwarf remnant',4.57],['ns','Neutron star / pulsar',.039],['magnetar','Magnetar',.001],['protostar','Protostar / young accreting star',0],['postagb','Post-AGB / planetary-nebula core',0],['subdwarf','Hot subdwarf / stripped helium star',0],['brown','Brown dwarf · substellar',0]]},
  multiplicity:{label:'SYSTEM MULTIPLICITY',note:'Reference proportions: 72% single, 23% binary, 4% triple, 1% quadruple. Stars in a system share age and initial metallicity.',entries:[['single','Single',72],['binary','Binary',23],['triple','Triple',4],['quad','Quadruple · hierarchical',1]]},
  speculative:{label:'SPECULATIVE DISCOVERIES',note:'Custom Mode only. These are fictional encounter weights, not scientific occurrence rates. Future/primordial objects are explicitly flagged.',entries:[['ordinary','Ordinary catalogue',99.9998],['tzo','Thorne–Żytkow candidate',.0001],['quark','Quark / strange-star candidate',.0001],['blueDwarf','Future blue dwarf',0],['blackDwarf','Future black dwarf',0],['popIII','Primordial Population III',0],['dark','Dark-star candidate',0],['boson','Boson-star candidate',0]]}
};
export function defaults(scientific=true){return {version:GENERATION_VERSION,scientific,pools:Object.fromEntries(Object.entries(POPULATIONS).map(([k,g])=>[k,Object.fromEntries(g.entries.map(([id,,v])=>[id,scientific&&k==='speculative'?(id==='ordinary'?100:0):v]))]))};}
// Fixed decimal arithmetic: a displayed total of 100% is exactly 100%. Never
// normalize silently or alter a player's entered percentages.
export function percentUnits(value){
  const text=String(value).trim();
  if(!/^\d+(?:\.\d{1,6})?$/.test(text))return null;
  const [whole,fraction='']=text.split('.'),n=Number(whole)*1e6+Number(fraction.padEnd(6,'0'));
  return Number.isSafeInteger(n)&&n>=0&&n<=100e6?n:null;
}
export function validateGeneration(config){
  const errors=[];
  if(config?.version!==GENERATION_VERSION||typeof config.scientific!=='boolean')errors.push('Unsupported universe generation settings.');
  for(const [key,group]of Object.entries(POPULATIONS)){
    const pool=config?.pools?.[key];let total=0,invalid=false;
    for(const [id]of group.entries){const v=percentUnits(pool?.[id]);if(v===null)invalid=true;else total+=v;}
    if(invalid)errors.push(`${group.label}: enter percentages from 0 to 100 with up to six decimal places.`);
    else if(total!==100e6)errors.push(`${group.label}: total must be exactly 100% (currently ${total/1e6}%).`);
    if(pool&&Object.keys(pool).some(id=>!group.entries.some(e=>e[0]===id)))errors.push(`${group.label}: unknown entry.`);
  }
  return errors;
}
export function checkedGeneration(config){
  const errors=validateGeneration(config);if(errors.length)throw Error(errors[0]);
  const result=defaults(config.scientific);
  // Scientific Mode always uses the locked baseline. The speculative pool is
  // retained as a custom preset but not sampled when scientific is true.
  if(!config.scientific)for(const key of Object.keys(POPULATIONS))for(const [id]of POPULATIONS[key].entries)result.pools[key][id]=Number(config.pools[key][id]);
  return result;
}
export function choose(pool,random){let n=random()*100,last;for(const [id,v]of Object.entries(pool)){if(v<=0)continue;last=id;n-=v;if(n<0)return id;}return last;}
export function randomFor(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const between=(r,a,b)=>a+(b-a)*r(),logBetween=(r,a,b)=>a*(b/a)**r(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const normal=r=>Math.sqrt(-2*Math.log(Math.max(1e-9,r())))*Math.cos(r()*Math.PI*2);
const SUN_DIAMETER=1391400,SUN_T=5772,AU=149597870.7;
export const SOL_REFERENCE={temperature:SUN_T,mass:1,luminosity:1,radiusSolar:1,gravity:274.2,ageYears:4.57e9,rotationDays:25.05,metallicity:0,windSpeed:450,windMassLoss:2e-14};
// Compact interpolation anchors inspired by the Pecaut–Mamajek mean dwarf
// sequence. Effective T and bolometric L stay linked through Stefan–Boltzmann.
const SEQUENCE=[[.08,2400,.105],[.16,3000,.19],[.4,3500,.4],[.6,3950,.6],[.8,5100,.78],[1,5772,1],[1.2,6300,1.3],[1.6,7200,1.7],[2.2,9700,2.2],[3.4,12300,2.9],[7.3,20600,4.1],[18,31500,7.3],[35,39500,10.3],[60,44900,13.5]];
function dwarfValues(m){
  let j=1;while(j<SEQUENCE.length-1&&SEQUENCE[j][0]<m)j++;
  const a=SEQUENCE[j-1],b=SEQUENCE[j],t=clamp(Math.log(m/a[0])/Math.log(b[0]/a[0]),0,1);
  return {temperature:a[1]*(b[1]/a[1])**t,radiusSolar:a[2]*(b[2]/a[2])**t};
}
const MASS_RANGE={M:[.08,.49],K:[.51,.84],G:[.86,1.09],F:[1.11,1.65],A:[1.67,2.35],B:[2.4,16.8],O:[17,60]};
export function spectralType(t,luminosityClass='V'){
  const bounds=[['O',30000,50000],['B',10000,30000],['A',7500,10000],['F',6000,7500],['G',5200,6000],['K',3700,5200],['M',2300,3700]];
  const [letter,lo,hi]=bounds.find(([,lo])=>t>=lo)||bounds.at(-1);
  return letter+clamp(Math.floor((hi-t)/(hi-lo)*10),0,9)+luminosityClass;
}
// Approximate RGB blackbody-inspired palette, deliberately restrained: Sol
// emits white light, not saturated yellow. Cool photospheres are warm tinted.
export function temperatureColor(t){
  const anchors=[[300,[15,12,20]],[1800,[175,64,41]],[3000,[255,151,99]],[4000,[255,196,143]],[5772,[255,237,212]],[7500,[244,245,255]],[11000,[203,220,255]],[30000,[158,194,255]],[100000,[144,183,255]]];
  let i=1;while(i<anchors.length-1&&t>anchors[i][0])i++;
  const [lo,a]=anchors[i-1],[hi,b]=anchors[i],f=clamp((t-lo)/(hi-lo),0,1);
  return '#'+a.map((v,k)=>Math.round(v+(b[k]-v)*f).toString(16).padStart(2,'0')).join('');
}
export function mainLifetime(m){const d=dwarfValues(m),l=d.radiusSolar**2*(d.temperature/SUN_T)**4;return Math.max(3e6,1e10*m/l)*(m<.35?1.8:1);}
function completeStar(s,r){
  s.temperature=Math.round(s.temperature);s.diameter=s.radiusSolar*SUN_DIAMETER;
  s.luminosity=s.radiusSolar**2*(s.temperature/SUN_T)**4;
  s.gravity=274.2*s.mass/s.radiusSolar**2;
  s.color=temperatureColor(s.temperature);
  s.type=s.type||spectralType(s.temperature,s.luminosityClass||'V');s.spectral=s.type[0];
  s.familyLabel=s.family==='main'?({M:'Red dwarf',K:'Orange dwarf',G:'Yellow dwarf',F:'Yellow-white dwarf',A:'White main-sequence star',B:'Blue-white dwarf',O:'Blue massive dwarf'}[s.spectral]||'Main-sequence star'):s.familyLabel;
  const hot=s.temperature>8000,compact=['wd','ns','magnetar','quark','boson'].includes(s.family),evolved=['giant','agb','supergiant','lbv','tzo'].includes(s.family);
  if(s.rotationDays===undefined)s.rotationDays=compact?(s.family==='wd'?.05+r()*2:between(r,1,8)/86400):hot?between(r,.5,5):evolved?between(r,70,700):between(r,8,45)*Math.sqrt(Math.max(.08,s.ageYears/4.57e9));
  const magnetic=r()<.07;
  s.activity=s.family==='magnetar'?4:compact?.12:hot?(magnetic?.8:.06):clamp((25/Math.max(.1,s.rotationDays))**1.4*(s.spectral==='M'?1.8:1),.12,4);
  s.magnetic=compact?(s.family==='magnetar'?'Extreme intrinsic field':s.family==='ns'||s.family==='quark'?'Strong intrinsic field':'Weak or strong · seeded remnant field'):hot?(magnetic?'Organized fossil field':'No strong organized field assigned'):s.activity>1.8?'Active dynamo · frequent flares':s.activity<.4?'Quiet dynamo':'Moderate dynamo';
  // UV is an approximate blackbody energy fraction, not an observed flux.
  s.uvFraction=blackbodyFraction(s.temperature,100,400);
  s.xrayFraction=compact?(['ns','magnetar','quark'].includes(s.family)?.01:.000001):hot?1e-7:clamp(1e-6*s.activity**2,1e-8,1e-3);
  s.windSpeed=compact?0:hot?between(r,1000,3000):evolved?between(r,10,100):between(r,300,800);
  s.windMassLoss=compact?0:s.family==='wr'||s.family==='lbv'?logBetween(r,1e-6,1e-4):evolved?logBetween(r,1e-10,1e-5):hot?logBetween(r,1e-11,1e-6):2e-14*s.activity;
  s.uncertaintyYears=s.remainingYears?Math.max(1e5,s.remainingYears*.25):null;
  s.visual={granulation:compact?0:hot?.18:evolved?1.8:1,spots:compact||hot&&!magnetic?0:clamp(s.activity*.75,.05,2),prominences:compact?0:hot?(magnetic?.3:.05):clamp(s.activity,.1,2),pulsation:['agb','supergiant','lbv','protostar','tzo'].includes(s.family)?.07:0};
  if(['brown','blackDwarf','boson'].includes(s.family)){s.visual.spots=0;s.visual.prominences=0;}
  return s;
}
export function blackbodyFraction(t,loNm,hiNm){
  let sum=0;const a=1.4387769e7/(hiNm*t),b=Math.min(100,1.4387769e7/(loNm*t)),n=100,dx=(b-a)/n;
  if(a>=b)return 0;for(let i=0;i<n;i++){const x=a+(i+.5)*dx;sum+=x**3/Math.expm1(x)*dx;}return clamp(sum/(Math.PI**4/15),0,1);
}
export function makeStar(seed,name,family='main',spectral='G',options={}){
  const r=randomFor('stellar:v2:'+seed),s={id:seed,name,kind:'star',family,metallicity:options.metallicity??clamp(-.05+normal(r)*.2,-1.5,.5),provenance:options.speculative?'Speculative model':'Approximate stellar model'};
  const sample=(a,b)=>between(r,a,b);let initialMass;
  if(family==='main'){
    const range=MASS_RANGE[spectral]||MASS_RANGE.G;s.mass=options.mass??logBetween(r,...range);initialMass=s.mass;
    Object.assign(s,dwarfValues(s.mass));s.luminosityClass='V';
    const life=mainLifetime(s.mass);s.ageYears=options.ageYears??sample(Math.min(1e7,life*.01),Math.min(life*.85,13.5e9));
    // Metallicities perturb T/R coherently, rather than selecting a new random color.
    s.temperature*=10**(-s.metallicity*.025);s.radiusSolar*=1+.12*s.ageYears/life;
    if(options.mass===undefined){const tBounds={M:[2300,3699],K:[3700,5199],G:[5200,5999],F:[6000,7499],A:[7500,9999],B:[10000,29999],O:[30000,50000]};s.temperature=clamp(s.temperature,...tBounds[spectral]);}
    s.remainingYears=Math.max(1e5,life-s.ageYears);s.endEvent='Core hydrogen exhaustion';
  }else if(['giant','subgiant','agb','postagb','subdwarf'].includes(family)){
    initialMass=options.mass??sample(1.0,4);s.mass=initialMass*(family==='postagb'?.22:.92);
    const ranges={subgiant:[4500,6400,1.8,5],giant:[3300,5100,8,70],agb:[2500,3500,100,400],postagb:[30000,100000,.2,1],subdwarf:[22000,45000,.12,.3]},v=ranges[family];
    s.temperature=sample(v[0],v[1]);s.radiusSolar=logBetween(r,v[2],v[3]);
    s.familyLabel={subgiant:'Subgiant',giant:r()<.35?'Red-clump giant':'Red giant',agb:r()<.15?'Carbon-rich AGB giant':'AGB giant',postagb:'Post-AGB core',subdwarf:'Hot subdwarf'}[family];
    if(family==='postagb')s.mass=sample(.53,.85);if(family==='subdwarf')s.mass=sample(.43,.55);
    s.ageYears=mainLifetime(initialMass)*sample(1.02,1.12);s.remainingYears=family==='postagb'?sample(1e4,1e5):family==='agb'?sample(1e5,2e6):sample(1e7,3e8);
    s.luminosityClass=family==='subgiant'?'IV':family==='subdwarf'?'VI':'III';
    s.endEvent=family==='subgiant'?'Giant phase':family==='subdwarf'?'Helium exhaustion':'Envelope loss → white dwarf';
  }else if(['supergiant','lbv','wr','tzo'].includes(family)){
    initialMass=sample(family==='tzo'?8:15,family==='lbv'?70:40);s.mass=initialMass*(family==='wr'?.35:.7);
    const hot=family==='wr'||family==='lbv',t=family==='tzo'?sample(3000,4000):hot?sample(family==='wr'?40000:10000,family==='wr'?110000:25000):[sample(3300,4200),sample(5000,7500),sample(12000,25000)][Math.floor(r()*3)];
    s.temperature=t;const l=logBetween(r,3e4,8e5);s.radiusSolar=Math.sqrt(l)/(t/SUN_T)**2;
    s.familyLabel={supergiant:t<4500?'Red supergiant':t<10000?'Yellow supergiant':'Blue supergiant',lbv:'Luminous blue variable / hypergiant',wr:'Wolf–Rayet',tzo:'Thorne–Żytkow candidate'}[family];
    s.type=family==='wr'?['WN','WC','WO'][Math.floor(r()*3)]+' · stripped':' ';if(s.type===' ')delete s.type;
    s.luminosityClass='Ia';s.ageYears=mainLifetime(initialMass)*sample(1.02,1.15);s.remainingYears=sample(1e5,1e6);s.endEvent='Core collapse · outcome uncertain';
  }else if(family==='wd'){
    initialMass=options.initialMass??sample(1,5);s.mass=clamp(.109*initialMass+.394,.5,1.2);s.radiusSolar=.0112*Math.sqrt((1.44/s.mass)**(2/3)-(s.mass/1.44)**(2/3));
    s.ageYears=options.ageYears??mainLifetime(initialMass)+sample(1e8,Math.max(1e8,13.5e9-mainLifetime(initialMass)));const cooling=Math.max(1e6,s.ageYears-mainLifetime(initialMass));s.temperature=clamp(10000*(cooling/1e9)**(-.25)*sample(.85,1.15),3800,60000);s.familyLabel='White dwarf remnant';s.type=r()<.8?'DA':'DB';s.endEvent='Already a remnant · gradual cooling';
  }else if(['ns','magnetar','quark'].includes(family)){
    initialMass=options.initialMass??sample(10,22);s.mass=sample(1.2,2.1);s.radiusSolar=sample(10,14)/696350;s.temperature=logBetween(r,2e5,1e6);
    s.familyLabel=family==='magnetar'?'Magnetar':family==='quark'?'Quark / strange-star candidate':r()<.6?'Pulsar':'Neutron star';s.type=family==='quark'?'QS':family==='magnetar'?'NS · magnetar':'NS';s.ageYears=mainLifetime(initialMass)+sample(1e4,1e8);s.endEvent='Already a remnant · cooling / spin-down';
  }else if(family==='brown'||family==='blackDwarf'){
    s.mass=family==='brown'?sample(.015,.07):sample(.5,1.0);s.radiusSolar=family==='brown'?.1:.01;s.temperature=family==='brown'?logBetween(r,350,2200):sample(40,200);
    s.ageYears=family==='brown'?sample(1e8,12e9):1e15;s.familyLabel=family==='brown'?'Brown dwarf · substellar':'Black dwarf · future remnant';s.type=family==='brown'?(s.temperature>1300?'L':s.temperature>500?'T':'Y'):'Dark remnant';s.endEvent='Cooling · no present fusion lifetime';
  }else if(family==='protostar'){
    s.mass=sample(.2,3);initialMass=s.mass;s.radiusSolar=sample(2,8);s.temperature=sample(2800,6500);s.ageYears=sample(1e4,3e6);s.remainingYears=sample(1e5,3e6);s.familyLabel='Protostar / pre-main-sequence';s.endEvent='Stable core hydrogen fusion';s.luminosityClass=' · young';
  }else if(family==='blueDwarf'){
    s.mass=sample(.15,.3);initialMass=s.mass;s.radiusSolar=sample(.2,.35);s.temperature=sample(6500,9000);s.ageYears=2e12;s.remainingYears=sample(1e11,1e12);s.familyLabel='Blue dwarf · future model';s.endEvent='Fusion exhaustion';
  }else if(family==='popIII'||family==='dark'){
    initialMass=sample(30,100);s.mass=initialMass;s.radiusSolar=family==='dark'?sample(500,1500):sample(8,20);s.temperature=family==='dark'?sample(5000,10000):sample(40000,70000);s.ageYears=sample(1e5,2e6);s.remainingYears=sample(1e5,2e6);s.metallicity=-5;s.familyLabel=family==='dark'?'Dark-star candidate':'Population III · primordial model';s.endEvent='Model-dependent collapse';
  }else{ // boson: no established stellar surface or population model
    s.mass=sample(.1,3);s.radiusSolar=.00003;s.temperature=0;s.ageYears=sample(1e9,12e9);s.familyLabel='Boson-star candidate';s.type='Exotic compact model';s.endEvent='Unknown · no verified evolution';
  }
  s.initialMass=initialMass||s.mass;if(options.ageYears!==undefined)s.ageYears=options.ageYears;
  if(options.metallicity===undefined&&!['popIII','dark'].includes(family))s.metallicity=clamp(s.metallicity-.025*(s.ageYears/1e9-4.57),-1.5,.5);
  return completeStar(s,r);
}
export function solFacts(star){return {...star,...SOL_REFERENCE,family:'main',familyLabel:'Yellow dwarf',spectral:'G',initialMass:1,remainingYears:5e9,uncertaintyYears:1e9,endEvent:'Core hydrogen exhaustion',magnetic:'Moderate dynamo · 11-year activity cycle',activity:1,uvFraction:blackbodyFraction(SUN_T,100,400),xrayFraction:1e-6,visual:{granulation:1,spots:.75,prominences:1,pulsation:0},provenance:'Sol reference observations'};}
export function stabilityLimit(a,e,mu,circumbinary=false){
  // Holman & Wiegert (1999), coplanar test-particle fits within their fitted e range.
  return a*(circumbinary?1.6+5.1*e-2.22*e*e+4.12*mu-4.27*e*mu-5.09*mu*mu+4.61*e*e*mu*mu:.464-.38*mu-.631*e+.586*mu*e+.15*e*e-.198*mu*e*e);
}
export function makeArchitecture(seed,name,config){
  const r=randomFor('architecture:v2:'+seed),pools=config.scientific?defaults().pools:config.pools;
  const speculative=config.scientific?'ordinary':choose(pools.speculative,r),family=speculative==='ordinary'?choose(pools.family,r):speculative;
  const primary=makeStar(seed+':star',name,family,choose(pools.spectral,r),{speculative:speculative!=='ordinary'});
  // Custom input probabilities are literal. Scientific reference proportions
  // are conditioned on primary mass: massive stars are much more often multiple.
  let multiplicity=pools.multiplicity;
  if(config.scientific){const factor=['ns','magnetar'].includes(primary.family)?.4:primary.initialMass<.6?.8:primary.initialMass<1.3?2:primary.initialMass<3?3.5:primary.initialMass<8?7:14;const weights=Object.fromEntries(Object.entries(multiplicity).map(([k,v])=>[k,v*(k==='single'?1:factor)])),sum=Object.values(weights).reduce((a,b)=>a+b,0);multiplicity=Object.fromEntries(Object.entries(weights).map(([k,v])=>[k,v/sum*100]));}
  const count={single:1,binary:2,triple:3,quad:4}[choose(multiplicity,r)];
  const stars=[primary];
  for(let i=1;i<count;i++){
    // Coeval lower-initial-mass companions, never randomly assigned red giants
    // next to a newborn star. Restrict to non-interacting, detached architectures.
    const mass=clamp(primary.initialMass*between(r,.12,.9),.08,60),age=primary.ageYears;
    const companion=age<mainLifetime(mass)?makeStar(seed+':star'+i,name+' '+String.fromCharCode(65+i),'main','M',{mass,ageYears:age,metallicity:primary.metallicity}):makeStar(seed+':star'+i,name+' '+String.fromCharCode(65+i),mass>8?'ns':'wd','G',{initialMass:mass,ageYears:age,metallicity:primary.metallicity});
    stars.push(companion);
  }
  if(count>1)primary.name=name+' A';
  const binaries=[];let nodes=stars.map(s=>({id:s.id,mass:s.mass,members:[s.id],reach:s.diameter/2/AU}));
  // A close pair or a wide pair; triples are (AB)+C, quadruples ((AB)+C)+D.
  while(nodes.length>1){
    const left=nodes.shift(),right=nodes.shift(),index=binaries.length,e=between(r,.02,.5);
    const minA=(left.reach+right.reach)*8/(1-e),close=index===0&&r()<.4;
    const a=Math.max(minA,index===0?(close?logBetween(r,.08,.8):logBetween(r,30,300)):left.reach*logBetween(r,18,30));
    const id=seed+':pair'+index,b={id,left:left.id,right:right.id,mass:left.mass+right.mass,mu:right.mass/(left.mass+right.mass),au:a,eccentricity:e,period:365.256*Math.sqrt(a**3/(left.mass+right.mass)),phase:r()*Math.PI*2,periapsis:r()*Math.PI*2,orbitalInclination:between(r,0,8),orbitalNode:r()*360,kind:'binary',members:[...left.members,...right.members]};
    binaries.push(b);nodes.unshift({id,mass:b.mass,members:b.members,reach:a*(1+e)+left.reach+right.reach});
  }
  const inner=binaries[0],circumbinary=!!inner&&inner.au<3&&primary.family==='main';
  const hostId=circumbinary?inner.id:primary.id,hostMass=circumbinary?inner.mass:primary.mass;
  let minAU=primary.diameter/2/AU*4,maxAU=Infinity;
  if(circumbinary)minAU=Math.max(minAU,stabilityLimit(inner.au,inner.eccentricity,inner.mu,true)*1.25);
  else if(inner)maxAU=stabilityLimit(inner.au,inner.eccentricity,inner.mu,false)*.75;
  if(binaries.length>1){const outer=binaries[1];maxAU=Math.min(maxAU,stabilityLimit(outer.au,outer.eccentricity,outer.mu,false)*.6);}
  const hostLuminosity=circumbinary?stars.slice(0,2).reduce((n,s)=>n+s.luminosity,0):primary.luminosity;
  return {star:primary,stars,binaries,rootId:nodes[0].id,multiplicity:['Single','Binary','Triple','Quadruple'][count-1],architecture:circumbinary?'P-type · circumbinary':count>1?'S-type · circumprimary':'Single-star orbits',hostId,hostMass,hostLuminosity,minAU,maxAU,generation:config};
}
