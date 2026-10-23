export const angleDelta = (from, to) => Math.atan2(Math.sin(to-from), Math.cos(to-from));

const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
function capsuleFraction(start,end,a,b,radius) {
  const d=sub(end,start),v=sub(b,a),w=sub(start,a),dd=dot(d,d),vv=dot(v,v);
  if(dd<1e-16)return 1;
  const projection=vv>1e-16?Math.max(0,Math.min(1,dot(w,v)/vv)):0;
  if(dot(sub(w,v.map(x=>x*projection)),sub(w,v.map(x=>x*projection)))<=radius*radius)return 1;
  let hit=1;
  const roots=(A,B,C,accept=()=>true)=>{
    const discriminant=B*B-4*A*C;
    if(A<=1e-16||discriminant<0)return;
    const root=(-B-Math.sqrt(discriminant))/(2*A);
    if(root>=0&&root<=hit&&accept(root))hit=root;
  };
  for(const center of [a,b]){const q=sub(start,center);roots(dd,2*dot(q,d),dot(q,q)-radius*radius);}
  if(vv>1e-16){const dv=dot(d,v),wv=dot(w,v);roots(dd-dv*dv/vv,2*(dot(w,d)-wv*dv/vv),dot(w,w)-wv*wv/vv-radius*radius,t=>{const u=(wv+t*dv)/vv;return u>=0&&u<=1;});}
  return hit<1?Math.max(.05,hit-.04):1;
}

// Swept camera against authored solid bounds and route capsules.
// Decorative marker poles and foliage do not block it. Persistent player
// transforms stay in Spatial.
export function cameraBoomFraction(start, end, objects) {
  let nearest = 1;
  for (const object of objects) {
    const visual = object.visual ?? object.metadata?.visual;
    if(visual?.shape==='route') {
      const path=(visual.path??[]).map(p=>[p[0],p[1]-.92,p[2]]);
      const radius=Math.max(.08,(visual.width??1)*.075)+.2;
      for(let i=1;i<path.length;i++)nearest=Math.min(nearest,capsuleFraction(start,end,path[i-1],path[i],radius));
      continue;
    }
    if (!['platform','zone','market','station','trunk','box','console','board','plate'].includes(visual?.shape)) continue;
    if (object.colorRole === 'hazard') continue;
    const center = object.position ?? object.transform?.position;
    if (!center || !visual.size) continue;
    const radius = .2, size = visual.size;
    let enter = 0, exit = 1, inside = true;
    for (let i=0;i<3;i++) {
      const lo=center[i]-size[i]/2-radius, hi=center[i]+size[i]/2+radius;
      inside &&= start[i]>=lo && start[i]<=hi;
      const delta = end[i]-start[i];
      if (Math.abs(delta)<1e-9) { if (start[i]<lo||start[i]>hi) { exit=-1; break; } }
      else { const a=(lo-start[i])/delta,b=(hi-start[i])/delta; enter=Math.max(enter,Math.min(a,b)); exit=Math.min(exit,Math.max(a,b)); }
    }
    if (!inside && enter<=exit && exit>=0 && enter>=0) nearest=Math.min(nearest,Math.max(.08,enter-.04));
  }
  return nearest;
}

export function followCamera({ player, yaw, pitch, previous, delta, objects = [], snap = false }) {
  const cp=Math.cos(pitch), forward=[-Math.sin(yaw)*cp,Math.sin(pitch),-Math.cos(yaw)*cp];
  const right=[Math.cos(yaw),0,-Math.sin(yaw)];
  const pivot=[player[0],player[1]+.35,player[2]];
  const desired=pivot.map((v,i)=>v-forward[i]*4.2+right[i]*.65+(i===1?1.05:0));
  const fraction=cameraBoomFraction(pivot,desired,objects);
  const collision=pivot.map((v,i)=>v+(desired[i]-v)*fraction);
  // Snap inward to prevent wall penetration; ease outward / normal following.
  const blend=snap||fraction<.98?1:1-Math.exp(-Math.max(0,delta)*16);
  const position=previous?previous.map((v,i)=>v+(collision[i]-v)*blend):collision;
  // Recheck the smoothed segment: following cannot slide the camera into a wall.
  const safe=cameraBoomFraction(pivot,position,objects);
  return { position:pivot.map((v,i)=>v+(position[i]-v)*safe), obstruction:1-fraction, distance:Math.hypot(...position.map((v,i)=>v-pivot[i])) };
}
