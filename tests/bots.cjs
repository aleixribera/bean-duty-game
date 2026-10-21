const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.window=global;
for(const f of ['math','player','range','match'])vm.runInThisContext(fs.readFileSync(`${__dirname}/../src/${f}.js`,'utf8'));
function setup(seed=42){const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);const m=new BD.Match(new BD.Range(),new BD.Player(),random);m.state='playing';return m;}
function duel(){const m=setup();for(const a of m.actors){a.hp=0;a.dead=999;}const a=m.actors[1],b=m.actors[4];for(const [actor,z]of [[a,8],[b,-8]]){actor.hp=100;actor.shield=0;actor.pos={x:0,y:1.7,z};actor.controller.pos=actor.pos;}a.controller.yaw=0;a.think=0;a.cooldown=0;return {m,a,b};}
{
 const {m,a,b}=duel();assert.ok(m.perceive(a,b));a.controller.yaw=Math.PI;assert.equal(m.perceive(a,b),false,'no rear vision');
 a.pos.x=b.pos.x=-4;a.controller.yaw=0;assert.equal(m.perceive(a,b),false,'bus blocks perception');
 m.updateBot(a,1/60);assert.equal(a.target,null);assert.equal(a.memory,null,'hidden opponents do not supply destinations');
}
{
 const {m,a,b}=duel();m.updateBot(a,1/60);assert.equal(a.target,b);assert.equal(a.ammo,30,'acquisition has reaction delay');
 a.controller.yaw=.8;a.think=1;a.reaction=0;const yaw=a.controller.yaw;m.updateBot(a,1/60);
 assert.ok(Math.abs(a.controller.yaw-yaw)<=2.7/60+.00001,'turn rate is bounded');assert.equal(a.ammo,30,'cannot fire sideways at a target');
 b.pos.x=-4;b.pos.z=-8;a.pos.x=-4;const memory={...a.memory};m.updateBot(a,1/60);assert.deepEqual(a.memory,memory,'occluded target does not update remembered location');
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
console.log('Passed: perception, reaction, bounded aim, memory, fair damage/reload, separation, collision and full matches.');
