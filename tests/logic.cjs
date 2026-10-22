const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
global.window=global;
for(const file of ['math','range','rifle-model','weapon','player'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../src',file+'.js'),'utf8'));
const range=new BD.Range(),origin={x:0,y:1.05,z:-25},direction={x:0,y:0,z:-1};
for(let i=0;i<5;i++)assert.equal(range.shoot(origin,direction).kill,false);
assert.equal(range.shoot(origin,direction).kill,true);
assert.equal(range.shoot(origin,direction),null);range.update(1.7);assert.equal(range.targets[0].hp,100);
const headHit=range.shoot({x:0,y:1.75,z:-25},direction);
assert.equal(headHit.head,true);assert.equal(headHit.kill,false);
assert.equal(range.shoot({x:0,y:1.75,z:-25},direction).kill,false);
assert.equal(range.shoot({x:0,y:1.75,z:-25},direction).kill,true);
const audio={shot(){},reload(){}},weapon=new BD.Weapon(audio,()=>{});
weapon.trigger(1);assert.equal(weapon.ammo,29);weapon.held=false;
weapon.trigger(1.09);weapon.held=false;assert.equal(weapon.ammo,29);weapon.update(.01,1.1,false);assert.equal(weapon.ammo,28);
weapon.trigger(1.11);weapon.held=false;weapon.update(.1,1.21,false);assert.equal(weapon.ammo,28);
weapon.reload();weapon.trigger(2);assert.equal(weapon.ammo,28);weapon.held=false;weapon.update(1.6,3,false);assert.equal(weapon.ammo,30);
weapon.aiming=true;weapon.update(.165,4,false);assert.equal(weapon.ads,1);
const spring=new BD.Spring(25);spring.kick(.05,2);for(let i=0;i<120;i++)spring.update(1/120);assert.ok(Math.abs(spring.x)<.00001);
console.log('Passed: target damage, headshots, respawn, cadence, click buffer, rejected early click, reload, ADS, spring settle.');

// Aim input must interrupt sprint before the ADS transition has started.
const runner=new BD.Player(),runningAudio={shot(){},reload(){},step(){}},runningWeapon=new BD.Weapon(runningAudio,()=>{});
runner.keys.add('KeyW');runner.keys.add('ShiftLeft');
runner.update(1/120,0,runningAudio);
assert.equal(runner.sprinting,true);
runningWeapon.aiming=true;
for(let i=0;i<24;i++){
  runner.update(1/120,runningWeapon.ads,runningAudio,undefined,runningWeapon.aiming);
  assert.equal(runner.sprinting,false,'held aim overrides held sprint, including the first frame');
  runningWeapon.update(1/120,(i+1)/120,runner.sprinting);
}
assert.equal(runningWeapon.ads,1,'aim reaches full ADS while sprint key stays held');
runningWeapon.aiming=false;
for(let i=0;i<30;i++){
  runner.update(1/120,runningWeapon.ads,runningAudio,undefined,runningWeapon.aiming);
  runningWeapon.update(1/120,(i+25)/120,runner.sprinting);
}
assert.equal(runner.sprinting,true,'held sprint resumes after releasing aim');
console.log('Passed: aim interrupts sprint, stays aimed with Shift held, and sprint resumes on release.');
