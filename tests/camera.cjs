const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.window=global;
for(const name of ['math','player','rifle-model','weapon'])vm.runInThisContext(fs.readFileSync(`${__dirname}/../src/${name}.js`,'utf8'));
const audio={step(){},shot(){},reload(){}};
function run(hz,ads=0){
 const p=new BD.Player();p.keys.add('KeyW');p.keys.add('KeyD');p.keys.add('ShiftLeft');
 let maxRoll=0,maxPitch=0;
 for(let i=0;i<hz*2;i++){p.update(1/hz,ads,audio);maxRoll=Math.max(maxRoll,Math.abs(p.cameraMotion.roll));maxPitch=Math.max(maxPitch,Math.abs(p.cameraMotion.pitch));}
 return {p,maxRoll,maxPitch};
}
const reference=run(120);
for(const hz of [30,60,144,240]){
 const r=run(hz);
 assert.ok(r.maxRoll<.014&&r.maxPitch<.012,'restrained movement');
 assert.ok(Math.abs(r.p.cameraMotion.fov-reference.p.cameraMotion.fov)<.03,'consistent sprint FOV');
 assert.ok(Math.abs(r.p.cameraMotion.roll-reference.p.cameraMotion.roll)<.001,'consistent lean');
 r.p.keys.clear();for(let i=0;i<hz*3;i++)r.p.update(1/hz,0,audio);
 assert.ok(Math.abs(r.p.cameraMotion.roll)<1e-6&&Math.abs(r.p.cameraMotion.pitch)<1e-6,'stopping settles');
}
assert.ok(run(120,1).maxRoll<reference.maxRoll*.3,'ADS steadies movement');
const p=reference.p,w=new BD.Weapon(audio,()=>{});
w.camera.x=.003;w.roll.x=.0006;
for(const ads of [0,.5,1])for(const pitch of [-1.44,.6,1.44]){
 w.ads=ads;p.pitch=pitch;p.yaw=.8;
 p.cameraMotion.pitch=.006;p.cameraMotion.roll=-.012;p.cameraMotion.fov=3;
 const v=w.view(p),ray=w.shotDirection(p,()=>.5),m=BD.mat.view({x:0,y:0,z:0},v.yaw,v.pitch,v.roll);
 const local=[0,1,2].map(i=>m[i]*ray.x+m[i+4]*ray.y+m[i+8]*ray.z);
 const focal=1/Math.tan(v.fov*Math.PI/360),screen=w.screenAim(p,16/9);
 assert.ok(Math.abs(screen.x-(.5-local[0]/local[2]*focal/(16/9)*.5))<1e-6,'bullet aligns horizontally');
 assert.ok(Math.abs(screen.y-(.5+local[1]/local[2]*focal*.5))<1e-6,'bullet aligns vertically');
}
const jumper=new BD.Player();jumper.keys.add('Space');let landed=false,peak=0;
for(let i=0;i<240;i++){const airborne=!jumper.grounded;jumper.update(1/120,0,audio);if(airborne&&jumper.grounded)landed=true;if(landed)peak=Math.max(peak,Math.abs(jumper.cameraMotion.pitch));}
assert.ok(landed&&peak>.0002&&peak<.01,'soft landing response');
w.resetRecoil();w.fire(0);w.advanceRecoil(1/18);assert.ok(w.camera.x>.001&&w.camera.x<.002,'readable but gentle shooting kick');
for(const hz of [30,60,144,240]){
 const shooter=new BD.Player(),gun=new BD.Weapon(audio,()=>{});
 gun.trigger(0);
 for(let i=1;i<=hz*2;i++){
  gun.update(1/hz,i/hz,false);
  const view=gun.view(shooter);
  assert.ok(Math.abs(view.roll)<.001,'automatic shoulder roll stays below .06 degrees');
  assert.ok(view.fov>=90&&view.fov<90.2,'automatic lens pulse stays subtle');
 }
 gun.held=false;
 for(let i=1;i<=hz*2;i++)gun.update(1/hz,2+i/hz,false);
 assert.ok(Math.abs(gun.view(shooter).fov-90)<1e-6,'shooting lens pulse settles');
 gun.ads=1;gun.camera.x=.003;
 assert.equal(gun.view(shooter).fov,70,'ADS removes shooting lens pulse');
}
const launch=new BD.Player();launch.keys.add('Space');launch.update(1/120,0,audio);
assert.ok(launch.cameraMotion.pitch>0,'jump has a gentle lift');
launch.resetCamera();assert.equal(launch.takeoff.x,0);assert.equal(launch.takeoff.v,0);
p.resetCamera();assert.equal(p.cameraMotion.roll,0);assert.equal(p.cameraMotion.fov,0);
console.log('Passed: camera restraint, ADS damping, settling, landing, shooting, 30–240 Hz and bullet/projection alignment.');
