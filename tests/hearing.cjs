const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.window=global;
for(const f of ['math','player','range','match'])vm.runInThisContext(fs.readFileSync(`${__dirname}/../src/${f}.js`,'utf8'));
function setup(listenerId=1,shooterId=4){
 const m=new BD.Match(new BD.Range(),new BD.Player(),()=>.5);m.state='playing';
 for(const a of m.actors){a.hp=0;a.dead=999;}
 const a=m.actors[listenerId],b=m.actors[shooterId];
 for(const [actor,z]of [[a,8],[b,20]]){actor.hp=100;actor.shield=0;actor.pos={x:18,y:1.7,z};actor.controller.pos=actor.pos;}
 a.controller.yaw=0;a.think=0;
 return {m,a,b};
}
// Player and bot shots alert either team, even outside the listener's field of view.
for(const [listener,shooter]of [[1,4],[4,0],[4,1]]){
 const {m,a,b}=setup(listener,shooter);
 assert.equal(m.perceive(a,b),false,'shooter starts behind the bot');
 m.shoot(b,{x:0,y:0,z:1});
 assert.ok(a.sound);assert.equal(a.target,null,'hearing alone does not acquire a target');
 const yaw=a.controller.yaw;m.updateBot(a,1/60);
 assert.ok(Math.abs(m.angle(a.controller.yaw-yaw))>0,'bot turns toward the gunshot');
 assert.equal(a.ammo,30,'bot cannot fire on sound alone');
 for(let i=0;i<150&&!a.target;i++){m.time+=1/60;m.updateBot(a,1/60);}
 assert.equal(a.target,b,'turning toward gunfire reveals the shooter');
 assert.ok(a.reaction>0,'visual acquisition retains the reaction delay');
 assert.equal(a.sound,null,'visual contact clears the sound investigation');
}
{
 const {m,a,b}=setup();a.pos={x:-4,y:1.7,z:8};a.controller.pos=a.pos;b.pos={x:-4,y:1.7,z:-8};a.controller.yaw=Math.PI;
 a.target=b; // A target reference may remain briefly after sight is lost.
 m.shoot(b,{x:0,y:0,z:-1});assert.ok(a.sound,'stale visual targets do not suppress hearing');
 const sound={...a.sound};b.pos.x=15;m.time=.1;m.shoot(b,{x:0,y:0,z:-1});
 assert.deepEqual(a.sound,sound,'bursts preserve a fixed approximate location');
 b.pos.x=-4;
 for(let i=0;i<90;i++){m.time+=1/60;m.updateBot(a,1/60);assert.equal(a.target,null,'cover prevents acquisition');}
 assert.equal(a.ammo,30,'bots do not shoot through cover based on sound');
 m.time=6;m.updateBot(a,1/60);assert.equal(a.sound,null,'sound expires');
}
{
 const {m,a,b}=setup();a.controller.yaw=Math.PI;a.target=b;
 m.shoot(b,{x:0,y:0,z:1});assert.equal(a.sound,null,'visible combat takes priority');
 a.target=null;b.team=a.team;m.shoot(b,{x:0,y:0,z:1});assert.equal(a.sound,null,'friendly shots are ignored');
 b.team=1-a.team;b.pos.z=33;m.shoot(b,{x:0,y:0,z:1});assert.equal(a.sound,null,'shots beyond 24 metres are ignored');
 b.pos.z=32;m.shoot(b,{x:0,y:0,z:1});assert.ok(a.sound,'shots at 24 metres are audible');
 m.spawn(a);assert.equal(a.sound,null,'respawn clears alerts');
 a.hp=0;b.pos={...a.pos,z:a.pos.z-3};m.shoot(b,{x:0,y:0,z:1});assert.equal(a.sound,null,'dead bots ignore sounds');
}
console.log('Passed: rear gunfire detection, both teams, player shots, reaction delay, cover, sound snapshots, range, priority and respawn.');
