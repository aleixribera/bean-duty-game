'use strict';
// Offline 4v4 simulation. Navigation uses a clearance-tested ground-floor grid.
BD.Match=class {
 constructor(range,player,random=Math.random){
  this.range=range;this.player=player;this.random=random;this.nodes=new Map();
  for(let x=-20;x<=20;x++)for(let z=-32;z<=32;z++){
   if(!range.solids.some(b=>b.y+b.h/2>.25&&b.y-b.h/2<1.9&&range.overlaps(b,x,z,.42)))this.nodes.set(`${x},${z}`,{x,z});
  }
  this.reset();
 }
 reset(){this.state='ready';this.score=[0,0];this.time=0;this.feed=[];this.traces=[];this.range.targets=[];
  this.actors=Array.from({length:8},(_,i)=>({id:i,name:i===0?'YOU':['','ROOK','NOVA','ECHO','VIPER','GHOST','WOLF','ASH'][i],team:i<4?0:1,human:i===0,kills:0,deaths:0,pos:{},ground:0,height:1.7}));
  for(const a of this.actors)this.spawn(a);
 }
 spawn(a){
  const z=a.team===0?29:-29,candidates=[-18,-8,0,8,18].map(x=>({x,z}));
  candidates.sort((p,q)=>this.safety(q,a)-this.safety(p,a));const p=candidates[0];
  a.pos={x:p.x,y:1.7,z:p.z};a.hp=100;a.dead=0;a.shield=1.5;a.ammo=30;a.reload=0;a.cooldown=.4+this.random()*.5;a.path=[];a.repath=0;a.target=null;a.flash=0;a.ground=0;a.height=1.7;
  a.hurt=-10;a.controller=new BD.Player();a.controller.pos=a.pos;a.controller.yaw=a.team===0?0:Math.PI;
  a.lane=[-17,0,17][a.id%3];a.phase=a.team===0?0:2;a.goal=null;a.memory=null;a.think=this.random()*.2;a.reaction=0;a.burst=0;a.recoil=0;a.strafe=this.random()<.5?-1:1;a.maneuver=0;a.stuck=0;a.mode='patrol';
  if(a.human){const p=this.player;p.pos=a.pos;p.ground=p.eyeGround=p.vx=p.vz=p.vy=p.speed=p.bob=p.swayX=p.swayY=0;p.height=1.7;p.grounded=true;p.yaw=0;p.pitch=0;p.keys.clear();this.onRespawn?.();}
 }
 safety(p,a){const enemies=this.actors.filter(b=>b!==a&&b.team!==a.team&&b.hp>0);const allies=this.actors.filter(b=>b!==a&&b.team===a.team&&b.hp>0);return Math.min(80,...enemies.map(b=>Math.hypot(p.x-b.pos.x,p.z-b.pos.z)))-allies.reduce((s,b)=>s+Math.max(0,5-Math.hypot(p.x-b.pos.x,p.z-b.pos.z))*10,0);}
 nearest(p){let best,dist=Infinity;for(const n of this.nodes.values()){const d=(n.x-p.x)**2+(n.z-p.z)**2;if(d<dist){dist=d;best=n;}}return best;}
 route(from,to){const start=this.nearest(from),end=this.nearest(to),key=n=>`${n.x},${n.z}`,queue=[start],previous=new Map([[key(start),null]]);let found=false;
  for(let i=0;i<queue.length;i++){const n=queue[i];if(n===end){found=true;break;}for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const k=`${n.x+dx},${n.z+dz}`;if(this.nodes.has(k)&&!previous.has(k)){previous.set(k,n);queue.push(this.nodes.get(k));}}}
  if(!found)return [];const path=[];for(let n=end;n;n=previous.get(key(n)))path.push(n);return path.reverse();
 }
 wallDistance(o,d){let distance=150;for(const b of this.range.solids){const n=this.range.intersect(o,d,b,{x:b.w,y:b.h,z:b.d});if(n!==null)distance=Math.min(distance,n);}return distance;}
 visible(a,b){const target={x:b.pos.x,y:b.pos.y-.3,z:b.pos.z},v={x:target.x-a.pos.x,y:target.y-a.pos.y,z:target.z-a.pos.z},length=Math.hypot(v.x,v.y,v.z);return length<42&&this.wallDistance(a.pos,{x:v.x/length,y:v.y/length,z:v.z/length})>=length-.4;}
 shoot(a,dir){if(this.state!=='playing'||a.hp<=0)return null;let distance=this.wallDistance(a.pos,dir),hit=null;
  for(const b of this.actors){if(b===a||b.hp<=0)continue;for(const part of [{y:b.pos.y+.05,w:.46,h:.46,head:true},{y:b.pos.y-.65,w:.7,h:.95,head:false}]){const n=this.range.intersect(a.pos,dir,{x:b.pos.x,y:part.y,z:b.pos.z},{x:part.w,y:part.h,z:.55});if(n!==null&&n<distance){distance=n;hit={target:b,head:part.head,distance:n};}}}
  a.flash=.09;if(!a.human)this.onBotShot?.(a);this.traces.push({from:{...a.pos},to:{x:a.pos.x+dir.x*distance,y:a.pos.y+dir.y*distance,z:a.pos.z+dir.z*distance},life:.07,team:a.team});
  if(!hit||hit.target.team===a.team||hit.target.shield>0)return null;
  const b=hit.target;b.hp=Math.max(0,b.hp-(hit.head?34:17));b.hurt=this.time;hit.kill=b.hp===0;
  if(hit.kill){a.kills++;b.deaths++;b.dead=3;this.score[a.team]++;this.feed.unshift({text:`${a.name}  ›  ${b.name}`,team:a.team,time:this.time});this.feed=this.feed.slice(0,4);if(this.score[a.team]>=30){this.state='finished';this.winner=a.team;}}
  return hit;
 }
 update(dt){if(this.state!=='playing')return;this.time+=dt;this.traces=this.traces.filter(t=>(t.life-=dt)>0);
  for(const a of this.actors){if(this.state!=='playing')break;if(a.hp<=0){a.dead-=dt;if(a.dead<=0)this.spawn(a);continue;}a.shield=Math.max(0,a.shield-dt);a.flash=Math.max(0,a.flash-dt);
   if(a.human){a.pos=this.player.pos;a.ground=this.player.ground;a.height=this.player.height;if(this.time-(a.hurt??-10)>5)a.hp=Math.min(100,a.hp+dt*12);continue;}
   this.updateBot(a,dt);
  }
 }
 angle(v){return Math.atan2(Math.sin(v),Math.cos(v));}
 perceive(a,b){const yaw=Math.atan2(-(b.pos.x-a.pos.x),-(b.pos.z-a.pos.z));return Math.abs(this.angle(yaw-a.controller.yaw))<1.25&&this.visible(a,b);}
 updateBot(a,dt){
  const c=a.controller;a.cooldown-=dt;a.repath-=dt;a.think-=dt;a.maneuver-=dt;a.reaction-=dt;a.recoil*=Math.exp(-7*dt);
  if(this.time-a.hurt>5)a.hp=Math.min(100,a.hp+dt*12);
  if(a.reload>0){a.reload=Math.max(0,a.reload-dt);if(a.reload===0)a.ammo=30;}
  // Decisions only use visible opponents and a short-lived last-seen snapshot.
  if(a.think<=0){a.think=.12+this.random()*.1;
   const seen=this.actors.filter(b=>b.team!==a.team&&b.hp>0&&this.perceive(a,b));
   const next=seen.includes(a.target)?a.target:seen.sort((b,d)=>Math.hypot(b.pos.x-a.pos.x,b.pos.z-a.pos.z)-Math.hypot(d.pos.x-a.pos.x,d.pos.z-a.pos.z))[0];
   if(next!==a.target){a.reaction=.28+this.random()*.25;a.burst=0;}a.target=next||null;
   if(next)a.memory={x:next.pos.x,y:next.pos.y-.45,z:next.pos.z,until:this.time+2.8};
   if(a.memory&&a.memory.until<this.time)a.memory=null;
  }
  const t=a.target,sees=t&&t.hp>0&&this.perceive(a,t);let mx=0,mz=0,aim=null;
  if(sees){aim={x:t.pos.x,y:t.pos.y-.45,z:t.pos.z};a.memory={...aim,until:this.time+2.8};a.mode=a.reload>0?'reload':'engage';
   const dx=t.pos.x-a.pos.x,dz=t.pos.z-a.pos.z,d=Math.hypot(dx,dz)||1;
   if(a.maneuver<=0){a.strafe=this.random()<.5?-1:1;a.maneuver=.8+this.random()*1.4;}
   const advance=a.reload>0||a.hp<35||d<8?-1:d>18?1:0;
   mx=dx/d*advance+dz/d*a.strafe*.65;mz=dz/d*advance-dx/d*a.strafe*.65;
  }else{
   a.mode=a.memory?'search':'patrol';
   if(a.memory)aim=a.memory;
   if(!a.goal||Math.hypot(a.goal.x-a.pos.x,a.goal.z-a.pos.z)<2){
    const zs=[18,0,-18,0];a.phase=(a.phase+1)%4;a.goal={x:a.lane+(this.random()-.5)*3,z:zs[a.phase]};a.repath=0;
   }
   if(a.repath<=0){a.path=this.route(a.pos,a.memory||a.goal);a.repath=.7+this.random()*.6;}
   while(a.path.length&&Math.hypot(a.path[0].x-a.pos.x,a.path[0].z-a.pos.z)<.5)a.path.shift();
   if(a.path.length){mx=a.path[0].x-a.pos.x;mz=a.path[0].z-a.pos.z;const d=Math.hypot(mx,mz);mx/=d;mz/=d;}
   if(!aim&&a.path.length)aim={x:a.pos.x+mx*5,y:a.pos.y,z:a.pos.z+mz*5};
  }
  // Local separation applies during both travel and firefights, including around the player.
  for(const b of this.actors){if(b===a||b.hp<=0)continue;let dx=a.pos.x-b.pos.x,dz=a.pos.z-b.pos.z,d=Math.hypot(dx,dz);if(d<1.8){if(d<.01){dx=a.id<b.id?-1:1;dz=.3;d=Math.hypot(dx,dz);}const push=(1.8-d)*1.5;mx+=dx/d*push;mz+=dz/d*push;}}
  if(aim){const dx=aim.x-a.pos.x,dy=aim.y-a.pos.y,dz=aim.z-a.pos.z;
   const yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));
   c.yaw+=BD.clamp(this.angle(yaw-c.yaw),-2.7*dt,2.7*dt);c.pitch+=BD.clamp(pitch-c.pitch,-1.8*dt,1.8*dt);
  }
  c.keys.clear();const localX=mx*Math.cos(c.yaw)-mz*Math.sin(c.yaw),localZ=mx*Math.sin(c.yaw)+mz*Math.cos(c.yaw);
  if(localX>.2)c.keys.add('KeyD');if(localX<-.2)c.keys.add('KeyA');if(localZ>.2)c.keys.add('KeyS');if(localZ<-.2)c.keys.add('KeyW');
  if(!sees&&!a.memory&&a.hp>40&&localZ<-.8&&Math.abs(localX)<.3)c.keys.add('ShiftLeft');
  if(sees&&a.hp<35&&a.reload===0)c.keys.add('KeyC');
  const old={...a.pos};c.update(dt,sees?1:0,{step(){}},this.range);a.ground=c.ground;a.height=c.height;
  a.stuck=Math.hypot(a.pos.x-old.x,a.pos.z-old.z)<dt*.2&&c.keys.size?a.stuck+dt:0;
  if(a.stuck>.7){a.goal=null;a.memory=null;a.path=[];a.repath=0;a.strafe*=-1;a.lane=[-17,0,17][Math.floor(this.random()*3)];a.stuck=0;}
  if(a.reload<=0&&(a.ammo===0||(!sees&&a.ammo<12))){a.reload=1.55;a.burst=0;}
  if(sees&&a.reaction<=0&&a.cooldown<=0&&a.reload<=0&&!c.sprinting){
   const dx=aim.x-a.pos.x,dy=aim.y-a.pos.y,dz=aim.z-a.pos.z;
   const error=Math.abs(this.angle(Math.atan2(-dx,-dz)-c.yaw))+Math.abs(Math.atan2(dy,Math.hypot(dx,dz))-c.pitch);
   if(error<.12){
    const spread=.012+Math.min(c.speed,4)*.004;
    const dir=c.direction(c.pitch+a.recoil+(this.random()-.5)*spread,c.yaw+(this.random()-.5)*spread);
    // Check the actual bore ray for teammates before pulling the trigger.
    const blocked=this.actors.some(b=>b!==a&&b.team===a.team&&b.hp>0&&this.range.intersect(a.pos,dir,{x:b.pos.x,y:b.pos.y-.55,z:b.pos.z},{x:1,y:1.8,z:1})!==null);
    if(!blocked){this.shoot(a,dir);a.ammo--;a.recoil+=.018;if(a.burst<=0)a.burst=2+Math.floor(this.random()*3);a.burst--;a.cooldown=a.burst>0?.1:.3+this.random()*.35;}
   }
  }
 }
 draw(r){for(const a of this.actors){if(a.human||a.hp<=0)continue;
   const {x,y,z}=a.pos,c=a.team===0?[.2,.65,.96]:[.95,.28,.2],dark=[.14,.18,.2],p=a.controller,yaw=p.yaw;
   const box=(sx,sy,sz,w,h,d,color,rx=0)=>r.box(x+sx*Math.cos(yaw)+sz*Math.sin(yaw),y+sy,z-sx*Math.sin(yaw)+sz*Math.cos(yaw),w,h,d,color,rx,yaw);
   box(0,-.65,0,.7,.85,.5,c);box(0,.05,0,.44,.44,.44,a.shield>0?[.95,.9,.55]:c);
   const leg=Math.max(.25,a.height-.95),stride=Math.sin(p.bob)*Math.min(.45,p.speed*.09);
   for(const side of [-1,1]){box(side*.19,-a.height+leg/2,0,.24,leg,.28,dark,stride*side);box(side*.43,-.55,-.12,.2,.6,.25,c,-.65);}
   // The weapon and muzzle follow the same yaw/pitch that generates the shot ray.
   const dir=p.direction(p.pitch+a.recoil),lift=a.reload>0?-.3:0;
   r.box(x+dir.x*.45,y+dir.y*.45+lift,z+dir.z*.45,.16,.16,.7,dark,p.pitch+a.recoil,yaw);
   box(0,.55,0,.65,.07,.08,c);
   if(a.flash>0)r.box(x+dir.x*.85,y+dir.y*.85,z+dir.z*.85,.2,.2,.2,[1,.85,.35]);
  }
  for(const t of this.traces)for(let i=1;i<=12;i++){const f=i/12;r.box(BD.mix(t.from.x,t.to.x,f),BD.mix(t.from.y,t.to.y,f),BD.mix(t.from.z,t.to.z,f),.035,.035,.035,t.team===0?[.6,.85,1]:[1,.65,.3]);}
 }
};

