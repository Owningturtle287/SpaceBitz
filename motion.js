export function turnToward(angle,target,dt) {
  const difference=Math.atan2(Math.sin(target-angle),Math.cos(target-angle));
  return angle+difference*(1-Math.exp(-dt/85));
}
export function updateMotion(motion,dx,dy,dt) {
  const distance=Math.hypot(dx,dy);
  motion.moving=distance>.005;
  if(motion.moving){
    motion.heading=turnToward(motion.heading||0,Math.atan2(dy,dx),dt);
    motion.direction=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
    motion.steps=(motion.steps||0)+distance;
  }
  const target=motion.moving?Math.min(1,distance/Math.max(.001,dt)*5):0;
  motion.thrust=(motion.thrust||0)+(target-(motion.thrust||0))*(1-Math.exp(-dt/100));
  return motion;
}
export function navigationTarget(position,goal,starRadius) {
  const dx=goal.x-position.x,dy=goal.y-position.y,length=dx*dx+dy*dy;
  if(!length)return goal;
  const t=Math.max(0,Math.min(1,-(position.x*dx+position.y*dy)/length));
  if(Math.hypot(position.x+t*dx,position.y+t*dy)>starRadius+38)return goal;
  const start=Math.atan2(position.y,position.x),end=Math.atan2(goal.y,goal.x);
  const difference=Math.atan2(Math.sin(end-start),Math.cos(end-start));
  const angle=start+(difference>=0?1:-1)*.4,radius=starRadius+150;
  return {x:Math.cos(angle)*radius,y:Math.sin(angle)*radius};
}
