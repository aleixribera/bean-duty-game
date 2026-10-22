const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');global.window=global;
for(const f of ['math','player','range','match','rifle-model','weapon','audio'])vm.runInThisContext(fs.readFileSync(`${__dirname}/../src/${f}.js`,'utf8'));
const range=new BD.Range(),match=new BD.Match(range,new BD.Player());range.solids=[];match.state='playing';
function shot(distance,human=true){for(const a of match.actors)a.hp=0;const a=match.actors[human?0:1],b=match.actors[4];a.hp=b.hp=100;a.pos={x:0,y:1.05,z:0};b.pos={x:0,y:1.7,z:-distance};b.shield=0;return match.shoot(a,{x:0,y:0,z:-1}).target;}
assert.equal(shot(10).hp,75);assert.equal(shot(36).hp,83);assert.equal(shot(10,false).hp,83);assert.equal(shot(36,false).hp,86);
let b=shot(10);assert.deepEqual(b.hitDirection,{x:0,y:0,z:-1});const a=match.actors[0];for(let i=0;i<3;i++)match.shoot(a,{x:0,y:0,z:-1});assert.equal(b.hp,0);assert.equal(b.dead,3);
let boxes=0;const renderer={box(){boxes++;}};match.draw(renderer);assert.ok(boxes>0,'collapse remains rendered');match.traces=[];b.dead=1;boxes=0;match.draw(renderer);assert.equal(boxes,0,'corpse expires');
for(let i=0;i<100;i++)range.impact(a.pos,{x:0,y:0,z:-1},10);assert.ok(range.impacts.length<=210);range.update(1);assert.equal(range.impacts.length,0);
const stages=[],w=new BD.Weapon({reload(stage){stages.push(stage);},shot(){}},()=>{});w.ammo=3;w.reload();w.update(.8,.8,false);assert.equal(w.ammo,3);w.update(.8,1.6,false);assert.equal(w.ammo,30);assert.deepEqual(stages,[0,1,2]);
const audio=new BD.Audio(),listener=new BD.Player();let pan;audio.shot=(gain,value)=>{pan=value;assert.ok(gain<.28);};audio.enemyShot({x:10,z:0},listener);assert.ok(pan>0);listener.yaw=Math.PI;audio.enemyShot({x:10,z:0},listener);assert.ok(pan<0);
console.log('Passed: close/far player and bot damage, flinch direction, corpse lifetime, bounded impacts, staged reload and listener-relative stereo.');
