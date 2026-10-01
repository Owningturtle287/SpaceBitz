import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSystem,TAU} from '../model.js';
import {giantProfile} from '../giants.js';
import {giantWind,giantStorms} from '../weather.js';

const sol=makeSystem('sol'),profile=name=>sol.planets.find(p=>p.name===name).atmosphere;
const angular=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

test('zonal flow alternates direction with latitude, favors known equatorial directions and slows at the poles',()=>{
  for(const name of ['Jupiter','Saturn','Uranus','Neptune']){
    const p=profile(name),winds=Array.from({length:31},(_,i)=>giantWind(p,-1.5+i*.1));
    assert.ok(winds.some(w=>w>0)&&winds.some(w=>w<0));
    assert.equal(Math.sign(giantWind(p,0)),['Jupiter','Saturn'].includes(name)?1:-1);
    assert.ok(Math.abs(giantWind(p,Math.PI/2))<1e-6);
    for(let lat=-1.5;lat<1.5;lat+=.01)assert.ok(Math.abs(giantWind(p,lat+.001)-giantWind(p,lat))<.002);
  }
});

test('Jupiter landmarks persist at southern latitudes and the Great Red Spot breathes without blinking out',()=>{
  const p=profile('Jupiter');assert.ok(p.features.includes('Great Red Spot')&&p.features.includes('Oval BA'));
  for(const t of [0,1,20,90,500,100000]){
    const spot=giantStorms(p,t).find(s=>s.redSpot),ba=giantStorms(p,t).find(s=>s.name==='Oval BA');
    assert.equal(spot.life,1);assert.equal(ba.life,1);assert.equal(spot.spin,-1);
    assert.ok(Math.abs(spot.lat*180/Math.PI-22)<.05);assert.ok(ba.lat>spot.lat);
    assert.ok(spot.sx>.11&&spot.sx<.14);assert.ok(spot.sy>.06&&spot.sy<.085);
  }
  assert.notEqual(giantStorms(p,0).find(s=>s.redSpot).sx,giantStorms(p,20).find(s=>s.redSpot).sx);
});

test('transient storms have quiet intervals and Neptune companion clouds share their vortex life cycle',()=>{
  for(const name of ['Saturn','Uranus','Neptune']){
    const p=profile(name),source=p.storms.find(s=>s.name),lives=[];
    for(let t=0;t<source.cycle*2;t++)lives.push(giantStorms(p,t).find(s=>s.name===source.name).life);
    assert.ok(lives.some(v=>v===0)&&lives.some(v=>v>.9),name);
  }
  const p=profile('Neptune');
  for(let t=0;t<200;t+=3){
    const pair=giantStorms(p,t).filter(s=>s.name==='Dark vortex');assert.equal(pair.length,2);
    assert.equal(pair[0].life,pair[1].life);assert.ok(pair[1].color[0]>pair[0].color[0]);
    assert.ok(pair[1].sy<pair[0].sy);
  }
});

test('storm advection, shape and emergence are continuous through cycle boundaries',()=>{
  for(const name of ['Jupiter','Saturn','Uranus','Neptune']){
    const p=profile(name);
    for(let t=0;t<300;t+=.9){
      const a=giantStorms(p,t),b=giantStorms(p,t+.016);
      a.forEach((s,i)=>{
        assert.ok(angular(s.lon,b[i].lon)<.001);assert.ok(Math.abs(s.life-b[i].life)<.004);
        assert.ok(Math.abs(s.sx-b[i].sx)<.001&&Math.abs(s.sy-b[i].sy)<.001);
        assert.ok(Number.isFinite(s.swirl)&&s.sx>0&&s.sy>0&&s.life>=0&&s.life<=1);
      });
    }
  }
});

test('procedural weather has stable seeded storm populations and diverse rotation/cloud-informed jets',()=>{
  const shapes=new Set(),counts=new Set(),spins=new Set();let large=0;
  for(let i=0;i<120;i++){
    const body={id:'weather-world:'+i,type:'gas',diameter:60000+i*400,au:6,rotationDays:.3+i%10*.04};
    const a=giantProfile(body),b=giantProfile(body);assert.deepEqual(a,b);
    shapes.add(a.wind.jets);counts.add(a.storms.length);
    for(const s of a.storms){spins.add(s.spin);if(s.sx>.15)large++;assert.ok(Math.abs(s.lat)>.19&&Math.abs(s.lat)<1.1);assert.ok(s.sy<s.sx);}
    assert.deepEqual(giantStorms(a,30),giantStorms(b,30));
  }
  assert.ok(shapes.size>=4&&counts.size>=8&&spins.size===2&&large>5);
});
