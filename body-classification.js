// IAU B5: a dwarf planet is round, directly orbits the Sun, has not cleared
// its orbital neighbourhood, and is not a satellite. Diameter alone is insufficient.
export const RECOGNIZED_DWARF_PLANETS=Object.freeze(['Ceres','Pluto','Haumea','Makemake','Eris']);
export function bodyKind(body){
  if(body.kind==='moon'||body.parent)return 'moon';
  if(body.id?.startsWith('sol:')&&RECOGNIZED_DWARF_PLANETS.includes(body.name))return 'dwarf-planet';
  // For synthetic extrasolar bodies this is a model analogue, not an IAU designation.
  if(body.classification?.round===true&&body.classification?.orbitsStar===true&&body.classification?.clearedOrbit===false)return 'dwarf-planet';
  return body.kind;
}
export const bodyLabel=body=>({'dwarf-planet':'Dwarf planet',planet:'Planet',moon:'Moon',star:'Star',sample:'Surface sample',lander:'Lander',coordinate:'Coordinate'}[bodyKind(body)]||body.kind);
export function bodyCounts(system){
  return system.planets.reduce((counts,body)=>{
    const kind=bodyKind(body);if(kind==='planet')counts.planets++;if(kind==='dwarf-planet')counts.dwarfPlanets++;
    counts.moons+=body.moons?.length||0;return counts;
  },{planets:0,dwarfPlanets:0,moons:0});
}
