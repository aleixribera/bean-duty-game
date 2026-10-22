const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.window=global;
for(const f of ['math','player','range','match'])vm.runInThisContext(fs.readFileSync(`${__dirname}/../src/${f}.js`,'utf8'));
function setup(seed=42){const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);const m=new BD.Match(new BD.Range(),new BD.Player(),random);m.state='playing';return m;}
function duel(){const m=setup();for(const a of m.actors){a.hp=0;a.dead=999;}const a=m.actors[1],b=m.actors[4];for(const [actor,z]of [[a,8],[b,-8]]){actor.hp=100;actor.shield=0;actor.pos={x:0,y:1.7,z};actor.controller.pos=actor.pos;}a.controller.yaw=0;a.think=0;a.cooldown=0;return {m,a,b};}
// Both teams sprint on travel routes and lower their speed when combat needs the weapon.
for(const id of [1,4])for(const mode of ['patrol','search','investigate']){
 const m=setup(),a=m.actors[id],c=a.controller;
 for(const b of m.actors)if(b!==a)b.hp=0;
 a.pos={x:18,y:1.7,z:20};c.pos=a.pos;c.yaw=0;a.hp=30;a.hurt=m.time;
 const destination={x:18,z:8,until:10};
 a.goal=destination;if(mode==='search')a.memory=destination;if(mode==='investigate')a.sound=destination;
 for(let frame=0;frame<30;frame++)m.updateBot(a,1/60);
 assert.equal(a.mode,mode);assert.equal(c.sprinting,true,`${mode} allows sprinting on either team, including at low health`);
 assert.ok(c.speed>7&&c.speed<=7.5,'travel reaches the player sprint speed');
 const enemy=m.actors[a.team===0?4:1];enemy.hp=100;enemy.pos={x:a.pos.x,y:1.7,z:a.pos.z-6};a.think=0;
 m.updateBot(a,1/60);assert.equal(a.target,enemy);assert.equal(c.sprinting,false,'spotting an enemy interrupts an active sprint');
 enemy.hp=0;a.target=null;a.memory=null;a.think=0;
 a.reload=1;m.updateBot(a,1/60);assert.equal(c.sprinting,false,'reloading interrupts sprint');
 a.reload=0;a.ammo=0;m.updateBot(a,1/60);assert.equal(c.sprinting,false,'starting an empty-magazine reload prevents sprint');
 m.spawn(a);assert.ok(!a.controller.sprinting,'respawn clears sprint');
}
{
 const {m,a,b}=duel();assert.ok(m.perceive(a,b));a.controller.yaw=Math.PI;assert.equal(m.perceive(a,b),false,'no rear vision');
 a.pos.x=b.pos.x=-4;a.controller.yaw=0;assert.equal(m.perceive(a,b),false,'bus blocks perception');
 m.updateBot(a,1/60);assert.equal(a.target,null);assert.equal(a.memory,null,'hidden opponents do not supply destinations');
}
{
 const {m,a,b}=duel();m.updateBot(a,1/60);assert.equal(a.target,b);assert.equal(a.ammo,30,'acquisition has reaction delay');
 a.controller.yaw=.8;a.think=1;a.reaction=0;const yaw=a.controller.yaw;m.updateBot(a,1/60);
 assert.ok(Math.abs(a.controller.yaw-yaw)<=1.9/60+.00001,'turn rate is bounded');assert.equal(a.ammo,30,'cannot fire sideways at a target');
 b.pos.x=-4;b.pos.z=-8;a.pos.x=-4;const memory={...a.memory};m.updateBot(a,1/60);assert.deepEqual(a.memory,memory,'occluded target does not update remembered location');
}
{
 const {m,a,b}=duel();m.updateBot(a,1/60);
 assert.ok(a.reaction>=.55&&a.reaction<=.95,'new targets allow a forgiving reaction window');
 assert.ok(a.controller.keys.has('KeyW'),'approaches a distant opponent directly');
 assert.equal(a.controller.sprinting,false,'seeing an opponent keeps the weapon ready instead of sprinting');
 assert.ok(!a.controller.keys.has('KeyA')&&!a.controller.keys.has('KeyD'),'no automatic combat strafing');
 a.pos.z=0;b.pos.z=-8;a.controller.pos=a.pos;a.hp=30;
 m.updateBot(a,1/60);
 assert.equal(a.controller.keys.size,0,'holds position at shooting range without dodging or crouching');
 a.reload=1;a.pos.z=-4;m.updateBot(a,1/60);
 assert.ok(a.controller.keys.has('KeyS'),'can still back away to reload at close range');
}
{
 const {m,a,b}=duel();a.pos={x:0,y:1.7,z:5};b.pos={x:0,y:1.7,z:-5};
 const dy=-.65,dist=Math.hypot(10,dy);m.shoot(a,{x:0,y:dy/dist,z:-10/dist});assert.equal(b.hp,83,'bot body damage matches player');
 a.ammo=0;a.controller.pos=a.pos;m.updateBot(a,1/60);assert.equal(a.reload,1.55,'shared reload duration');
}
{
 const m=setup(),a=m.actors[1],b=m.actors[2];for(const other of m.actors)if(other!==a&&other!==b){other.hp=0;other.dead=999;}
 for(const actor of [a,b]){actor.pos={x:0,y:1.7,z:25};actor.controller.pos=actor.pos;actor.goal={x:0,z:25};}
 for(let i=0;i<90;i++)m.update(1/60);
 assert.ok(Math.hypot(a.pos.x-b.pos.x,a.pos.z-b.pos.z)>1,'overlapping allies separate');
}
// With no opponents, every lane assignment must complete a circuit and keep moving.
for(const id of [1,2,3,4,5,6]){
 const m=setup(),a=m.actors[id];for(const b of m.actors)if(b!==a)b.hp=0;
 const visited=new Set();let crossings=0,side=Math.sign(a.pos.z);
 for(let frame=0;frame<60*150;frame++){
  m.time+=1/60;m.updateBot(a,1/60);visited.add(a.phase);
  if(Math.abs(a.pos.z)>8&&Math.sign(a.pos.z)!==side){side=Math.sign(a.pos.z);crossings++;}
 }
 assert.equal(visited.size,8,`bot ${id} visits every patrol leg`);
 assert.ok(crossings>=2,`bot ${id} patrols both halves repeatedly`);
 assert.equal(a.target,null);assert.equal(a.mode,'patrol');
}
{
 const {m,a,b}=duel();a.pos.x=b.pos.x=-4; // The bus blocks sight, but nearby shots are audible.
 m.shoot(b,{x:0,y:0,z:-1});assert.ok(a.sound,'nearby enemy gunfire supplies a search location');
 assert.equal(a.target,null);assert.equal(a.memory,null,'sound does not grant visual knowledge');
 const sound={...a.sound};b.pos.x=15;m.time+=.1;m.shoot(b,{x:0,y:0,z:-1});
 assert.deepEqual(a.sound,sound,'investigation is a snapshot, not live enemy tracking');
 m.updateBot(a,1/60);assert.equal(a.mode,'investigate');
 m.time=6;m.updateBot(a,1/60);assert.equal(a.sound,null);assert.equal(a.mode,'patrol','expired sounds return to patrol');
 a.sound=null;a.hearAfter=0;b.pos={x:20,y:1.7,z:-30};m.shoot(b,{x:0,y:0,z:-1});assert.equal(a.sound,null,'distant gunfire is ignored');
 b.team=a.team;b.pos={x:a.pos.x,y:1.7,z:a.pos.z+3};m.shoot(b,{x:0,y:0,z:1});assert.equal(a.sound,null,'friendly gunfire is ignored');
}
{
 const m=setup(),a=m.actors[1];for(const b of m.actors)if(b!==a)b.hp=0;
 a.memory={x:a.pos.x,z:a.pos.z,until:10};a.repath=99;a.path=[];
 m.updateBot(a,1/60);assert.equal(a.memory,null);assert.equal(a.mode,'patrol');assert.ok(a.path.length,'reaching last-seen position immediately resumes the route');
 const phase=a.phase;a.progress=6.1;a.bestDistance=0;m.updateBot(a,1/60);
 assert.notEqual(a.phase,phase,'lack of progress advances the fallback route');
}
for(const seed of [1,42,9876]){
 const m=setup(seed);let frames=0,close=0,samples=0;
 while(m.state==='playing'&&frames<60*600){m.update(1/60);frames++;
  if(frames%60===0){for(const a of m.actors.filter(a=>!a.human&&a.hp>0)){
   assert.ok(Number.isFinite(a.pos.x+a.pos.y+a.pos.z));
   const overlaps=m.range.solids.filter(b=>b.y+b.h/2>a.ground+.26&&b.y-b.h/2<a.ground+a.height&&m.range.overlaps(b,a.pos.x,a.pos.z));
   assert.equal(overlaps.length,0,`controller respects walls: ${JSON.stringify({pos:a.pos,ground:a.ground,overlaps})}`);
   samples++;if(m.actors.some(b=>b!==a&&b.hp>0&&Math.hypot(a.pos.x-b.pos.x,a.pos.z-b.pos.z)<.65))close++;
  }}
 }
 assert.equal(m.state,'finished');assert.ok(m.actors.filter(a=>!a.human).every(a=>a.kills>0));assert.ok(close/samples<.1,'persistent crowding stays rare');
 console.log(`Seed ${seed}: ${m.score.join('-')} in ${Math.round(frames/60)}s; close-contact samples ${(100*close/samples).toFixed(1)}%.`);
}
console.log('Passed: patrol circuits, sound investigation, recovery, perception, reaction, bounded aim, memory, fair damage/reload, separation, collision and full matches.');
