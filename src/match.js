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
 reset(){this.state='ready';this.score=[0,0];this.time=0;this.feed=[];this.traces=[];this.range.targets=[];this.range.impacts=[];
  this.actors=Array.from({length:8},(_,i)=>({id:i,name:i===0?'YOU':['','ROOK','NOVA','ECHO','VIPER','GHOST','WOLF','ASH'][i],team:i<4?0:1,human:i===0,kills:0,deaths:0,pos:{},ground:0,height:1.7}));
  for(const a of this.actors)this.spawn(a);
 }
 spawn(a){
  const z=a.team===0?29:-29,candidates=[-18,-8,0,8,18].map(x=>({x,z}));
  candidates.sort((p,q)=>this.safety(q,a)-this.safety(p,a));const p=candidates[0];
  a.pos={x:p.x,y:1.7,z:p.z};a.hp=100;a.dead=0;a.shield=1.5;a.ammo=30;a.reload=0;a.cooldown=.4+this.random()*.5;a.path=[];a.repath=0;a.target=null;a.flash=0;a.ground=0;a.height=1.7;
  a.hurt=-10;a.hitDirection={x:0,y:0,z:0};a.controller=new BD.Player();a.controller.pos=a.pos;a.controller.yaw=a.team===0?0:Math.PI;
  a.aimYaw=0;a.aimPitch=0;a.aimErrorTime=0;a.aimYawGoal=0;a.aimPitchGoal=0;
  a.turnYaw=0;a.turnPitch=0;a.aimSteady=0;a.moveX=0;a.moveZ=0;a.approach=false;
  a.lane=[-18,0,18][a.id%3];a.phase=0;a.goal=null;a.memory=null;a.sound=null;a.hearAfter=0;a.destination=null;a.progress=0;a.bestDistance=Infinity;a.think=this.random()*.2;a.reaction=0;a.burst=0;a.recoil=0;a.strafe=this.random()<.5?-1:1;a.maneuver=0;a.stuck=0;a.mode='patrol';
  if(a.human){const p=this.player;p.pos=a.pos;p.ground=p.eyeGround=p.vx=p.vz=p.vy=p.speed=p.bob=p.swayX=p.swayY=0;p.height=1.7;p.landing.x=p.landing.v=p.sprintBlend=p.strafeLean=0;p.grounded=true;p.yaw=0;p.pitch=0;p.keys.clear();this.onRespawn?.();}
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
  a.flash=.09;this.hearShot(a);if(!a.human)this.onBotShot?.(a);this.traces.push({from:{...a.pos},to:{x:a.pos.x+dir.x*distance,y:a.pos.y+dir.y*distance,z:a.pos.z+dir.z*distance},life:.07,team:a.team});
  if(distance<150)this.range.impact(a.pos,dir,distance,!!hit);
  if(!hit||hit.target.team===a.team||hit.target.shield>0)return null;
  const b=hit.target;const falloff=BD.clamp((distance-12)/23,0,1),damage=a.human?BD.mix(25,17,falloff):BD.mix(17,14,falloff);b.hp=Math.max(0,b.hp-damage*(hit.head?2:1));b.hurt=this.time;b.hitDirection={...dir};hit.kill=b.hp===0;
  if(hit.kill){a.kills++;b.deaths++;b.dead=3;this.score[a.team]++;this.feed.unshift({text:`${a.name}  ›  ${b.name}`,team:a.team,time:this.time});this.feed=this.feed.slice(0,4);if(this.score[a.team]>=30){this.state='finished';this.winner=a.team;}}
  return hit;
 }
 update(dt){if(this.state!=='playing')return;this.time+=dt;this.range.update(dt);this.traces=this.traces.filter(t=>(t.life-=dt)>0);
  for(const a of this.actors){if(this.state!=='playing')break;if(a.hp<=0){a.dead-=dt;if(a.dead<=0)this.spawn(a);continue;}a.shield=Math.max(0,a.shield-dt);a.flash=Math.max(0,a.flash-dt);
   if(a.human){a.pos=this.player.pos;a.ground=this.player.ground;a.height=this.player.height;if(this.time-(a.hurt??-10)>5)a.hp=Math.min(100,a.hp+dt*12);continue;}
   this.updateBot(a,dt);
  }
 }
 angle(v){return Math.atan2(Math.sin(v),Math.cos(v));}
 smoothAim(a,yaw,pitch,dt){
  const c=a.controller;
  // Small time steps keep acceleration and braking consistent across frame rates.
  for(let left=dt;left>0;){const step=Math.min(left,1/120);left-=step;
   const y=this.angle(yaw-c.yaw),p=pitch-c.pitch;
   a.turnYaw+=BD.clamp(BD.clamp(y*8,-1.9,1.9)-a.turnYaw,-9*step,9*step);
   a.turnPitch+=BD.clamp(BD.clamp(p*8,-1.3,1.3)-a.turnPitch,-6*step,6*step);
   c.yaw=this.angle(c.yaw+a.turnYaw*step);c.pitch=BD.clamp(c.pitch+a.turnPitch*step,-1.45,1.45);
  }
 }
 routeClear(a,p){
  const distance=Math.hypot(p.x-a.pos.x,p.z-a.pos.z),steps=Math.ceil(distance/.25);
  for(let i=1;i<=steps;i++){const f=i/steps,x=BD.mix(a.pos.x,p.x,f),z=BD.mix(a.pos.z,p.z,f);
   if(this.range.solids.some(b=>b.y+b.h/2>.25&&b.y-b.h/2<1.9&&this.range.overlaps(b,x,z,.42)))return false;
  }return true;
 }
 patrolGoal(a){
  // Advance through both backyards and change lanes at their open rear edges.
  const home=a.team===0?1:-1,other=[-18,0,18][([-18,0,18].indexOf(a.lane)+1)%3];
  const circuit=[[a.lane,26],[a.lane,8],[a.lane,-8],[a.lane,-26],[other,-26],[other,-8],[other,8],[other,26]];
  const [x,z]=circuit[a.phase];return {x,z:z*home};
 }
 hearShot(shooter){
  for(const a of this.actors){
   if(a.human||a.hp<=0||a.team===shooter.team||this.time<a.hearAfter)continue;
   if(a.target&&a.target.hp>0&&this.perceive(a,a.target))continue;
   if(Math.hypot(a.pos.x-shooter.pos.x,a.pos.y-shooter.pos.y,a.pos.z-shooter.pos.z)>24)continue;
   // Sound supplies an approximate, fixed location; it never acquires a target.
   const p=this.nearest({x:shooter.pos.x+(this.random()-.5)*6,z:shooter.pos.z+(this.random()-.5)*6});
   a.sound={x:p.x,y:shooter.pos.y-.45,z:p.z,lookUntil:this.time+2,until:this.time+5};a.hearAfter=this.time+5;
  }
 }
 perceive(a,b){const yaw=Math.atan2(-(b.pos.x-a.pos.x),-(b.pos.z-a.pos.z));return Math.abs(this.angle(yaw-a.controller.yaw))<1.25&&this.visible(a,b);}
 updateBot(a,dt){
  const c=a.controller;a.cooldown-=dt;a.repath-=dt;a.think-=dt;a.maneuver-=dt;a.reaction-=dt;a.recoil*=Math.exp(-7*dt);
  if(this.time-a.hurt>5)a.hp=Math.min(100,a.hp+dt*12);
  if(a.reload>0){a.reload=Math.max(0,a.reload-dt);if(a.reload===0)a.ammo=30;}
  // Decisions only use visible opponents and a short-lived last-seen snapshot.
  if(a.think<=0){a.think=.25+this.random()*.2;
   const seen=this.actors.filter(b=>b.team!==a.team&&b.hp>0&&this.perceive(a,b));
   const next=seen.includes(a.target)?a.target:seen.sort((b,d)=>Math.hypot(b.pos.x-a.pos.x,b.pos.z-a.pos.z)-Math.hypot(d.pos.x-a.pos.x,d.pos.z-a.pos.z))[0];
   if(next!==a.target){a.reaction=.55+this.random()*.4;a.burst=0;a.aimErrorTime=0;a.aimSteady=0;}a.target=next||null;
   if(next){a.memory={x:next.pos.x,y:next.pos.y-.45,z:next.pos.z,until:this.time+2.8};a.sound=null;}
   if(a.memory&&a.memory.until<this.time)a.memory=null;
  }
  const t=a.target,sees=t&&t.hp>0&&this.perceive(a,t);let mx=0,mz=0,aim=null;
  if(sees){aim={x:t.pos.x,y:t.pos.y-.45,z:t.pos.z};a.memory={...aim,until:this.time+2.8};a.mode=a.reload>0?'reload':'engage';
   const dx=t.pos.x-a.pos.x,dz=t.pos.z-a.pos.z,d=Math.hypot(dx,dz)||1;
   // Walk directly toward opponents, then plant to shoot. Only retreat at close range.
   // Commit to closing distance until in range; avoid stop/start chatter at one boundary.
   if(d>12)a.approach=true;else if(d<9)a.approach=false;
   const advance=d<5&&(a.reload>0||a.hp<35)?-1:a.approach?1:0;
   mx=dx/d*advance;mz=dz/d*advance;
  }else{
   if(a.memory&&(a.memory.until<=this.time||Math.hypot(a.memory.x-a.pos.x,a.memory.z-a.pos.z)<1.5))a.memory=null;
   if(a.sound&&(a.sound.until<=this.time||Math.hypot(a.sound.x-a.pos.x,a.sound.z-a.pos.z)<1.5))a.sound=null;
   if(!a.goal)a.goal=this.patrolGoal(a);
   if(Math.hypot(a.goal.x-a.pos.x,a.goal.z-a.pos.z)<1.2){a.phase=(a.phase+1)%8;a.goal=this.patrolGoal(a);}
   a.mode=a.memory?'search':a.sound?'investigate':'patrol';
   const destination=a.memory||a.sound||a.goal;
   if(a.destination!==destination){a.destination=destination;a.repath=0;a.progress=0;a.bestDistance=Infinity;}
   if(a.repath<=0){a.path=this.route(a.pos,destination);a.repath=1.2;}
   while(a.path.length&&Math.hypot(a.path[0].x-a.pos.x,a.path[0].z-a.pos.z)<.5)a.path.shift();
   // Skip grid zigzags only when the full character has clearance along the shortcut.
   for(let i=Math.min(5,a.path.length-1);i>0;i--)if(this.routeClear(a,a.path[i])){a.path.splice(0,i);break;}
   if(a.path.length){mx=a.path[0].x-a.pos.x;mz=a.path[0].z-a.pos.z;const d=Math.hypot(mx,mz);mx/=d;mz/=d;}
   // Look along the route so corners and doors enter the field of view naturally.
   if(a.path.length)aim={x:a.pos.x+mx*5,y:a.pos.y,z:a.pos.z+mz*5};
   // First turn toward the gunshot, including behind us; firing still needs sight.
   if(a.sound&&this.time<a.sound.lookUntil)aim=a.sound;
   const distance=Math.hypot(destination.x-a.pos.x,destination.z-a.pos.z);
   if(distance<a.bestDistance-.5){a.bestDistance=distance;a.progress=0;}else a.progress+=dt;
   // Detect pacing or oscillation as well as being completely stationary.
   if(a.progress>6){a.memory=null;a.sound=null;a.phase=(a.phase+1)%8;a.goal=this.patrolGoal(a);a.destination=null;a.path=[];a.repath=0;a.progress=0;}
  }
  // Local separation applies during both travel and firefights, including around the player.
  for(const b of this.actors){if(b===a||b.hp<=0)continue;let dx=a.pos.x-b.pos.x,dz=a.pos.z-b.pos.z,d=Math.hypot(dx,dz);if(d<1.8){if(d<.01){dx=a.id<b.id?-1:1;dz=.3;d=Math.hypot(dx,dz);}const push=(1.8-d)*1.5;mx+=dx/d*push;mz+=dz/d*push;}}
  if(aim){const dx=aim.x-a.pos.x,dy=aim.y-a.pos.y,dz=aim.z-a.pos.z;
   // Drift toward imperfect aim points instead of jumping between random offsets.
   // Angular error naturally makes distant targets harder to hit.
   if(sees){a.aimErrorTime-=dt;if(a.aimErrorTime<=0){a.aimYawGoal=(this.random()-.5)*.09;a.aimPitchGoal=(this.random()-.5)*.065;a.aimErrorTime=.35+this.random()*.35;}}
   const correction=1-Math.exp(-6*dt);
   a.aimYaw=BD.mix(a.aimYaw,sees?a.aimYawGoal:0,correction);a.aimPitch=BD.mix(a.aimPitch,sees?a.aimPitchGoal:0,correction);
   const yaw=Math.atan2(-dx,-dz)+(sees?a.aimYaw:0),pitch=Math.atan2(dy,Math.hypot(dx,dz))+(sees?a.aimPitch:0);
   this.smoothAim(a,yaw,pitch,dt);
  }else{
   this.smoothAim(a,c.yaw,c.pitch,dt);
  }
  c.keys.clear();const localX=mx*Math.cos(c.yaw)-mz*Math.sin(c.yaw),localZ=mx*Math.sin(c.yaw)+mz*Math.cos(c.yaw);
  if(localX>.2)c.keys.add('KeyD');if(localX<-.2)c.keys.add('KeyA');if(localZ>.2)c.keys.add('KeyS');if(localZ<-.2)c.keys.add('KeyW');
  // Sprint along forward travel routes, including searches and sound investigations.
  // Combat, reloading and sharp turns keep the weapon ready at walking speed.
  if(!sees&&a.reload<=0&&a.ammo>=12&&localZ<-.8&&Math.abs(localX)<.3)c.keys.add('ShiftLeft');
  // Continuous steering avoids keyboard direction flips as the view turns.
  const length=Math.max(1,Math.hypot(mx,mz)),steer=1-Math.exp(-10*dt);
  a.moveX=BD.mix(a.moveX,mx/length,steer);a.moveZ=BD.mix(a.moveZ,mz/length,steer);
  c.moveInput={x:a.moveX*Math.cos(c.yaw)-a.moveZ*Math.sin(c.yaw),z:a.moveX*Math.sin(c.yaw)+a.moveZ*Math.cos(c.yaw)};
  const old={...a.pos};c.update(dt,sees?1:0,{step(){}},this.range);a.ground=c.ground;a.height=c.height;
  a.stuck=Math.hypot(a.pos.x-old.x,a.pos.z-old.z)<dt*.2&&c.keys.size?a.stuck+dt:0;
  if(a.stuck>.7){a.phase=(a.phase+1)%8;a.goal=this.patrolGoal(a);a.memory=null;a.sound=null;a.destination=null;a.path=[];a.repath=0;a.strafe*=-1;a.stuck=0;}
  if(a.reload<=0&&(a.ammo===0||(!sees&&a.ammo<12))){a.reload=1.55;a.burst=0;}
  if(sees){
   const dx=aim.x-a.pos.x,dy=aim.y-a.pos.y,dz=aim.z-a.pos.z;
   const error=Math.abs(this.angle(Math.atan2(-dx,-dz)-c.yaw))+Math.abs(Math.atan2(dy,Math.hypot(dx,dz))-c.pitch);
   const tolerance=BD.clamp(.85/Math.hypot(dx,dz),.045,.12);
   a.aimSteady=error<tolerance&&Math.abs(a.turnYaw)<.65&&Math.abs(a.turnPitch)<.5?a.aimSteady+dt:0;
   if(a.aimSteady>=.14&&a.reaction<=0&&a.cooldown<=0&&a.reload<=0&&!c.sprinting){
    const spread=.04+Math.min(c.speed,4)*.008;
    const dir=c.direction(c.pitch+a.recoil+(this.random()-.5)*spread,c.yaw+(this.random()-.5)*spread);
    // Check the actual bore ray for teammates before pulling the trigger.
    const blocked=this.actors.some(b=>b!==a&&b.team===a.team&&b.hp>0&&this.range.intersect(a.pos,dir,{x:b.pos.x,y:b.pos.y-.55,z:b.pos.z},{x:1,y:1.8,z:1})!==null);
    if(!blocked){this.shoot(a,dir);a.ammo--;a.recoil+=.018;if(a.burst<=0)a.burst=2+Math.floor(this.random()*2);a.burst--;a.cooldown=a.burst>0?.16:.55+this.random()*.4;}
   }
  }else a.aimSteady=0;
 }
 draw(r){for(const a of this.actors){if(a.human||(a.hp<=0&&a.dead<1.9))continue;
   const dying=a.hp<=0,fall=dying?BD.clamp((3-a.dead)/.55,0,1):0,flinch=dying?0:Math.sin(BD.clamp((this.time-a.hurt)/.2,0,1)*Math.PI)*.075;
   const {x,y,z}=a.pos,c=a.team===0?[.2,.65,.96]:[.95,.28,.2],dark=[.14,.18,.2],p=a.controller,yaw=p.yaw;
   const tilt=fall*1.45;
   const box=(sx,sy,sz,w,h,d,color,rx=0)=>{const localY=(sy+a.height)*Math.cos(tilt)-sz*Math.sin(tilt)-a.height,localZ=(sy+a.height)*Math.sin(tilt)+sz*Math.cos(tilt);r.box(x+sx*Math.cos(yaw)+localZ*Math.sin(yaw)+a.hitDirection.x*flinch,y+localY,z-sx*Math.sin(yaw)+localZ*Math.cos(yaw)+a.hitDirection.z*flinch,w,h,d,color,rx+tilt,yaw);};
   box(0,-.65,0,.7,.85,.5,c);box(0,.05,0,.44,.44,.44,a.shield>0?[.95,.9,.55]:c);
   const leg=Math.max(.25,a.height-.95),stride=Math.sin(p.bob)*Math.min(.45,p.speed*.09);
   for(const side of [-1,1]){box(side*.19,-a.height+leg/2,0,.24,leg,.28,dark,stride*side);box(side*.43,-.55,-.12,.2,.6,.25,c,-.65);}
   // The weapon and muzzle follow the same yaw/pitch that generates the shot ray.
   if(dying)continue;
   const dir=p.direction(p.pitch+a.recoil),lift=a.reload>0?-.3:0;
   r.box(x+dir.x*.45,y+dir.y*.45+lift,z+dir.z*.45,.16,.16,.7,dark,p.pitch+a.recoil,yaw);
   box(0,.55,0,.65,.07,.08,c);
   if(a.flash>0)r.box(x+dir.x*.85,y+dir.y*.85,z+dir.z*.85,.2,.2,.2,[1,.85,.35]);
  }
  for(const t of this.traces)for(let i=1;i<=12;i++){const f=i/12;r.box(BD.mix(t.from.x,t.to.x,f),BD.mix(t.from.y,t.to.y,f),BD.mix(t.from.z,t.to.z,f),.035,.035,.035,t.team===0?[.6,.85,1]:[1,.65,.3]);}
 }
};

