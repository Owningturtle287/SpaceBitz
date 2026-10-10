// Fit readable, variable-height entries to the fixed generation workstation.
export function rarityPages(heights,available,gap=0){
  const pages=[];let start=0,used=0;
  for(let i=0;i<heights.length;i++){
    const size=Math.max(1,heights[i]);
    if(i>start&&used+gap+size>Math.max(1,available)){pages.push([start,i]);start=i;used=0;}
    used+=(i>start?gap:0)+size;
  }
  if(heights.length)pages.push([start,heights.length]);
  return pages;
}
