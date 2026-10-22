const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.window=global;
for(const f of ['math','player','range','match'])vm.runInThisContext(fs.readFileSync(`${__dirname}/../src/${f}.js`,'utf8'));
function accuracy(distance,speed=0){
 let seed=42;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const m=new BD.Match(new BD.Range(),new BD.Player(),random);m.state='playing';
 for(const actor of m.actors)actor.hp=0;
 const a=m.actors[1],b=m.actors[4];
 a.hp=b.hp=100;a.pos={x:0,y:1.7,z:distance/2};b.pos={x:0,y:1.7,z:-distance/2};
 a.controller.pos=a.pos;a.controller.yaw=0;a.controller.speed=speed;
 // Isolate aim from navigation and damage, retaining real perception and shot geometry.
 a.controller.update=()=>{};
 let shots=0,hits=0;
 m.shoot=(actor,dir)=>{
  shots++;
  if([{y:b.pos.y+.05,w:.46,h:.46},{y:b.pos.y-.65,w:.7,h:.95}].some(part=>{
   const n=m.range.intersect(actor.pos,dir,{x:b.pos.x,y:part.y,z:b.pos.z},{x:part.w,y:part.h,z:.55});
   return n!==null&&n<m.wallDistance(actor.pos,dir);
  }))hits++;
 };
 for(let frame=0;frame<60*180;frame++){m.time+=1/60;m.updateBot(a,1/60);}
 assert.ok(shots>150,'bots still fire regularly');
 m.spawn(a);assert.equal(a.aimYaw,0);assert.equal(a.aimPitch,0);assert.equal(a.aimErrorTime,0,'respawn resets aim error');
 return hits/shots;
}
const close=accuracy(8),far=accuracy(24),moving=accuracy(24,4);
assert.ok(close>.6,'close-range bots remain a threat');
assert.ok(far>.1&&far<.7,'distant shots include hits and substantial misses');
assert.ok(close>far+.2,'angular error makes distance matter');
assert.ok(moving<far,'movement further reduces accuracy');
console.log(`Passed: bot aim accuracy close ${(close*100).toFixed(1)}%, far ${(far*100).toFixed(1)}%, moving ${(moving*100).toFixed(1)}%; respawn resets error.`);
