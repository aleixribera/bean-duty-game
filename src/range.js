'use strict';
BD.Range=class {
 constructor(){
 this.boxes=[];this.solids=[];this.impacts=[];this.spawn={x:0,y:1.7,z:29};
 const grass=[.39,.49,.29],road=[.29,.31,.32],cream=[.79,.76,.62],wood=[.49,.39,.28],dark=[.22,.26,.27];
 const box=(x,y,z,w,h,d,c,solid=true)=>{const b={x,y,z,w,h,d,c};this.boxes.push(b);if(solid)this.solids.push(b);};
 box(0,-.25,0,44,.5,68,grass);box(0,.012,0,43,.024,15,road,false);
 for(const z of [-8,8])box(0,.05,z,43,.1,1.2,cream,false);
 for(let x=-19;x<21;x+=5)box(x,.03,0,2,.02,.12,cream,false);
 for(const x of [-22,22])box(x,2,0,.4,4,68,wood);
 for(const z of [-34,34])box(0,2,z,44,4,.4,wood);
 // Local +z points into each backyard. Openings are gaps in solid geometry.
 for(const s of [-1,1]){
 const z=16*s,col=s===1?[.77,.64,.32]:[.36,.65,.62];
 const b=(x,y,d,w,h,l,c=col,solid=true)=>box(x,y,z+d*s,w,h,l,c,solid);
 for(const x of [-6,6])b(x,1.5,0,.3,3,12);
 for(const d of [-6,6]){
 b(-3.8,1.5,d,4.4,3,.3);b(3.8,1.5,d,4.4,3,.3);b(0,2.7,d,3.2,.6,.3);
 b(0,3.45,d,12,.9,.3);b(0,5.55,d,12,.9,.3);
 for(const x of [-5.5,0,5.5])b(x,4.5,d,x===0?5:1,1.2,.3);
 }
 for(const x of [-6,6])b(x,4.5,0,.3,3,12);
 // The upper floor leaves a stairwell on the right, with a landing at the top.
 b(-1,3,0,10,.2,12,cream);b(5,3,-4.8,2,.2,2.4,cream);
 b(0,6.1,0,12.8,.3,12.8,dark);
 for(let i=0;i<15;i++)b(4.85,(i+1)*.1,4.8-i*.6,1.9,(i+1)*.2,.6,wood);
 b(-2,.5,1.8,2.4,1,1,wood);b(-3,3.55,1.5,1.8,.9,1,wood);
 b(-11,1.4,0,.3,2.8,12,cream);b(-8.5,2.9,0,5.3,.25,12.4,dark);
 for(const d of [-6,6]){b(-10.3,1.4,d,1.4,2.8,.3,cream);b(-6.7,1.4,d,1.4,2.8,.3,cream);b(-8.5,2.55,d,2.2,.5,.3,cream);}
 b(-12,1.1,12,4,2.2,3,wood);b(-12,2.3,12,4.4,.2,3.4,dark);
 b(10,.65,10,5,1.3,.3,cream);b(15,.65,3,.35,1.3,7,cream);
 b(12,.65,-5,2.5,1.3,2,wood);b(-16,.6,-1,2,1.2,3,wood);
 b(0,.02,10,3,.04,8,cream,false);
 }
 // School bus and moving truck split the central street into short sightlines.
 box(-4,1.25,0,3,2.5,10,[.87,.66,.22]);box(-4,2.65,0,3,.3,10,[.72,.53,.18]);
 for(const x of [-5.52,-2.48])for(const z of [-3,-1,1,3])box(x,2,z,.025,.7,1.4,[.23,.36,.4],false);
 box(-4,1.9,-5.02,2.5,.8,.025,[.23,.36,.4],false);
 box(4,1.7,-1,3.4,3.4,7,[.77,.76,.69]);box(4,1,4,3.1,2,3,[.58,.32,.25]);box(4,2.2,4,3.1,.6,2,[.58,.32,.25]);
 box(4,2.1,5.02,2.5,.7,.025,[.23,.36,.4],false);
 for(const x of [-5.55,-2.45,2.25,5.75])for(const z of [-3.3,3.3])box(x,.45,z,.25,.9,1.2,dark,false);
 box(13,.55,1,3,1.1,5,[.46,.57,.62]);box(13,1.25,1,2.8,.4,2.5,dark);
 this.targets=[{x:0,z:-29},{x:17,z:-17},{x:-17,z:17},{x:-3.5,z:-18,y:3.1},{x:3.5,z:18,y:3.1}].map(t=>({...t,y:t.y||0,hp:100,respawn:0,flash:0}));
 }
 reset(){for(const t of this.targets){t.hp=100;t.respawn=t.flash=0;}this.impacts=[];}
 update(dt){for(const t of this.targets){t.flash=Math.max(0,t.flash-dt);if(t.hp<=0){t.respawn-=dt;if(t.respawn<=0)t.hp=100;}}for(const p of this.impacts){p.life-=dt;p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;p.z+=(p.vz||0)*dt;if(p.vy!==undefined)p.vy-=4*dt;}this.impacts=this.impacts.filter(p=>p.life>0);}
 impact(origin,dir,distance,body=false){
  for(let i=0;i<7;i++)this.impacts.push({x:origin.x+dir.x*(distance-.035),y:origin.y+dir.y*(distance-.035),z:origin.z+dir.z*(distance-.035),vx:-dir.x*.6+Math.sin(i*2.4)*.8,vy:.4+(i%3)*.3,vz:-dir.z*.6+Math.cos(i*2.4)*.8,life:.18+i*.025,size:i<3?.025:.055,color:body?[.85,.72,.5]:i<3?[1,.87,.45]:[.58,.55,.48]});
  this.impacts=this.impacts.slice(-210);
 }
 intersect(o,d,c,s){let near=0,far=150;for(const a of ['x','y','z']){const lo=c[a]-s[a]/2,hi=c[a]+s[a]/2;if(Math.abs(d[a])<1e-7){if(o[a]<lo||o[a]>hi)return null;continue;}let a1=(lo-o[a])/d[a],a2=(hi-o[a])/d[a];if(a1>a2)[a1,a2]=[a2,a1];near=Math.max(near,a1);far=Math.min(far,a2);if(near>far)return null;}return near;}
 shoot(origin,dir){let nearest=150,result=null;for(const b of this.solids){const n=this.intersect(origin,dir,b,{x:b.w,y:b.h,z:b.d});if(n!==null&&n<nearest)nearest=n;}
 for(const t of this.targets){if(t.hp<=0)continue;for(const part of [{y:1.75,w:.42,h:.42,head:true},{y:1.05,w:.8,h:1,head:false}]){const n=this.intersect(origin,dir,{x:t.x,y:t.y+part.y,z:t.z},{x:part.w,y:part.h,z:.28});if(n!==null&&n<nearest){nearest=n;result={target:t,head:part.head,distance:n};}}}
 if(result){const t=result.target;t.hp-=result.head?34:17;t.flash=.08;result.kill=t.hp<=0;if(result.kill)t.respawn=1.6;}if(nearest<150)this.impacts.push({x:origin.x+dir.x*(nearest-.015),y:origin.y+dir.y*(nearest-.015),z:origin.z+dir.z*(nearest-.015),life:.15});return result;
 }
 overlaps(b,x,z,r=.28){return x+r>b.x-b.w/2&&x-r<b.x+b.w/2&&z+r>b.z-b.d/2&&z-r<b.z+b.d/2;}
 move(p,dx,dz,dt){
 // Substeps prevent tunneling. Separate axes allow sliding along walls.
 const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));
 for(let i=0;i<count;i++)for(const [axis,delta]of [['x',dx/count],['z',dz/count]]){
 const x=p.pos.x+(axis==='x'?delta:0),z=p.pos.z+(axis==='z'?delta:0);let floor=p.ground,blocked=false;
 for(const b of this.solids){if(!this.overlaps(b,x,z)||b.y+b.h/2<=p.ground+.001||b.y-b.h/2>=p.ground+p.height+.08)continue;const top=b.y+b.h/2;if(p.grounded&&top-p.ground<=.25)floor=Math.max(floor,top);else blocked=true;}
 if(!blocked&&floor>p.ground)blocked=this.solids.some(b=>this.overlaps(b,x,z)&&b.y-b.h/2<floor+p.height+.08&&b.y+b.h/2>floor+.001);
 if(!blocked){p.pos[axis]+=delta;p.ground=floor;}else if(axis==='x')p.vx=0;else p.vz=0;
 }
 const old=p.ground,next=old+p.vy*dt;let support=0,ceiling=Infinity;
 for(const b of this.solids){if(!this.overlaps(b,p.pos.x,p.pos.z))continue;const top=b.y+b.h/2,bottom=b.y-b.h/2;if(top<=old+.001)support=Math.max(support,top);if(bottom>=old+p.height+.01)ceiling=Math.min(ceiling,bottom);}
 p.ground=Math.max(support,next);p.grounded=p.ground<=support+.001;if(p.grounded)p.vy=0;
 if(p.ground+p.height+.08>ceiling){p.ground=Math.max(support,ceiling-p.height-.08);p.vy=Math.min(0,p.vy);}
 }
 draw(r){if(!this.batch)this.batch=r.createBatch(this.boxes);r.drawBatch(this.batch);for(const t of this.targets){if(t.hp<=0)continue;const c=t.flash>0?[1,.9,.6]:[.72,.29,.2];r.box(t.x,t.y+1.05,t.z,.8,1,.28,c);r.box(t.x,t.y+1.75,t.z,.42,.42,.28,c);}for(const p of this.impacts)r.box(p.x,p.y,p.z,(p.size||.05)*Math.min(1,p.life*10),(p.size||.05)*Math.min(1,p.life*10),(p.size||.05)*Math.min(1,p.life*10),p.color||[1,.93,.65]);}
};
