const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
global.window=global;
for(const f of ['math','player','range'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../src',f+'.js'),'utf8'));
const map=new BD.Range(),audio={step(){}};
function walk(x,z,key,seconds,y=0){const p=new BD.Player();p.pos={x,y:y+1.7,z};p.ground=p.eyeGround=y;p.keys.add(key);for(let i=0;i<seconds*120;i++)p.update(1/120,0,audio,map);return p;}
assert.ok(walk(0,29,'KeyW',5).pos.z<10,'back and front doors are passable');
assert.ok(walk(-8.5,25,'KeyW',4).pos.z<10,'garage is passable');
assert.ok(walk(19,30,'KeyW',13).pos.z<-27,'side lane links backyards');
assert.ok(walk(0,16,'KeyD',3).pos.x<5.6,'house walls stop movement');
assert.ok(walk(-4,8,'KeyW',3).pos.z>5.2,'bus blocks movement');
assert.ok(walk(0,31,'KeyS',5).pos.z<33.6,'boundary blocks movement');
const upstairs=walk(4.85,21.4,'KeyW',2.5);assert.ok(upstairs.ground>=3,'stairs reach upper floor: '+upstairs.ground);assert.ok(upstairs.pos.z<12.5,'stairs reach landing');
const down=walk(4.85,12,'KeyS',2.8,3.1);assert.ok(down.ground<.3,'can descend stairs');
const jumper=new BD.Player();jumper.pos={x:0,y:4.8,z:16};jumper.ground=jumper.eyeGround=3.1;jumper.keys.add('Space');jumper.update(1/120,0,audio,map);assert.ok(jumper.vy>0,'jump works upstairs');
map.targets=[{x:-4,y:0,z:-8,hp:100,flash:0}];assert.equal(map.shoot({x:-4,y:1.7,z:8},{x:0,y:0,z:-1}),null,'bus blocks bullets');assert.equal(map.targets[0].hp,100);
map.targets=[{x:0,y:0,z:-5,hp:100,flash:0}];assert.ok(map.shoot({x:0,y:1.7,z:5},{x:0,y:0,z:-1}),'open street shots hit');
let draws=0;map.draw({createBatch(boxes){assert.ok(boxes.length<250);return boxes;},drawBatch(){draws++;},box(){}});assert.equal(draws,1);
console.log('Passed: doors, garages, flanks, walls, vehicles, perimeter, stairs up/down, upstairs jumping, shot occlusion and static batching.');
