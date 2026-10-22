const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.window=global;
for(const f of ['math','player','range','match'])vm.runInThisContext(fs.readFileSync(`${__dirname}/../src/${f}.js`,'utf8'));
function duel(){
 let seed=42;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const m=new BD.Match(new BD.Range(),new BD.Player(),random);m.state='playing';
 for(const actor of m.actors){actor.hp=0;actor.dead=999;}
 const a=m.actors[1],b=m.actors[4];
 for(const [actor,z]of [[a,4],[b,-4]]){actor.hp=100;actor.shield=0;actor.pos={x:0,y:1.7,z};actor.controller.pos=actor.pos;}
 a.controller.yaw=.8;a.think=0;a.cooldown=0;
 return {m,a,b};
}
// A mouse-like turn ramps up, brakes into alignment, and cannot reverse instantly.
for(const fps of [30,60,144]){
 const {m,a}=duel(),c=a.controller,dt=1/fps;let previousYaw=0,previousPitch=0;
 for(let i=0;i<fps*2;i++){
  const yaw=c.yaw,pitch=c.pitch;m.smoothAim(a,0,-.1,dt);
  assert.ok(Math.abs(a.turnYaw-previousYaw)<=9*dt+1e-9,'bounded yaw acceleration');
  assert.ok(Math.abs(a.turnPitch-previousPitch)<=6*dt+1e-9,'bounded pitch acceleration');
  assert.ok(Math.abs(m.angle(c.yaw-yaw))<=1.9*dt+1e-9,'bounded yaw speed');
  assert.ok(Math.abs(c.pitch-pitch)<=1.3*dt+1e-9,'bounded pitch speed');
  previousYaw=a.turnYaw;previousPitch=a.turnPitch;
 }
 assert.ok(Math.abs(c.yaw)<.001&&Math.abs(c.pitch+.1)<.001,'settles accurately at every frame rate');
 c.yaw=Math.PI-.03;a.turnYaw=0;m.smoothAim(a,-Math.PI+.03,-.1,dt);
 assert.ok(a.turnYaw>0,'takes the short turn across the yaw seam');
 a.turnYaw=1;m.smoothAim(a,c.yaw-1,c.pitch,dt);
 assert.ok(a.turnYaw>0,'direction reversal brakes before turning back');
}
{
 const {m,a,b}=duel();a.controller.update=()=>{};
 let firstShot=null,shots=0;
 m.shoot=()=>{firstShot??=m.time;shots++;};
 for(let i=0;i<60*5;i++){
  m.time+=1/60;const yaw=a.aimYaw,pitch=a.aimPitch;m.updateBot(a,1/60);
  assert.ok(Math.abs(a.aimYaw-yaw)<.009,'horizontal corrections stay continuous');
  assert.ok(Math.abs(a.aimPitch-pitch)<.0065,'vertical corrections stay continuous');
  if(m.time<.55)assert.equal(shots,0,'never fires during initial reaction');
 }
 assert.ok(firstShot>=.55&&firstShot<1.8,'takes time to acquire but remains responsive');
 assert.ok(shots>=8,'settled bot continues firing effective bursts');
 b.pos.x=4;a.controller.yaw=0;a.turnYaw=0;a.cooldown=0;
 const before=shots;m.time+=1/60;m.updateBot(a,1/60);
 assert.equal(shots,before,'holds fire when a target suddenly leaves the sights');
 assert.equal(a.aimSteady,0,'a new alignment must settle again');
 m.spawn(a);
 for(const field of ['turnYaw','turnPitch','aimSteady','moveX','moveZ','aimYawGoal','aimPitchGoal'])assert.equal(a[field],0,'respawn clears motion state');
}
// Smooth aim must still track a strafing opponent, rather than only stationary targets.
for(const fps of [30,60,144]){
 const {m,a,b}=duel();a.controller.yaw=0;a.controller.update=()=>{};
 let shots=0,hits=0;
 m.shoot=(actor,dir)=>{shots++;if(m.range.intersect(actor.pos,dir,{x:b.pos.x,y:b.pos.y-.65,z:b.pos.z},{x:.7,y:.95,z:.55})!==null)hits++;};
 for(let i=0;i<fps*20;i++){m.time+=1/fps;b.pos.x=2*Math.sin(m.time*.8);m.updateBot(a,1/fps);}
 assert.ok(shots>25,'tracks a moving opponent without holding fire indefinitely');
 assert.ok(hits/shots>.4,'moving targets remain threatened at every frame rate');
}
{
 const {m,a}=duel();a.controller.yaw=0;a.pos.z=8;a.approach=true;
 m.updateBot(a,1/60);const input={...a.controller.moveInput};
 assert.ok(Math.hypot(input.x,input.z)>0&&Math.hypot(input.x,input.z)<.2,'movement accelerates gradually');
 a.pos.z=4;m.updateBot(a,1/60);
 assert.equal(a.approach,false);assert.ok(Math.hypot(a.controller.moveInput.x,a.controller.moveInput.z)>0,'stopping eases out');
 a.pos.z=6;m.updateBot(a,1/60);assert.equal(a.approach,false,'small range changes do not restart movement');
}
console.log('Passed: smooth turns at 30/60/144 fps, wraparound, braking, continuous aim error, deliberate effective firing, movement easing and respawn resets.');
