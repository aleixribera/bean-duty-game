const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.window=global;
for(const f of ['math','player','range','match'])vm.runInThisContext(fs.readFileSync(`${__dirname}/../src/${f}.js`,'utf8'));
let seed=12345;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const range=new BD.Range(),player=new BD.Player(),match=new BD.Match(range,player,random);
assert.equal(match.actors.length,8);assert.equal(match.actors.filter(a=>a.team===0).length,4);assert.equal(match.actors.filter(a=>!a.human).length,7);
const start=JSON.stringify(match.actors.map(a=>a.pos));match.update(1);assert.equal(JSON.stringify(match.actors.map(a=>a.pos)),start,'ready state is frozen');
for(const a of match.actors){assert.ok(match.nodes.has(`${a.pos.x},${a.pos.z}`),'spawn has clearance');assert.ok(match.route(a.pos,{x:18,z:-a.pos.z}).length>0,'opposing backyard reachable');}
match.state='playing';const a=match.actors[0],b=match.actors[4];a.pos={x:0,y:1.7,z:5};b.pos={x:0,y:1.7,z:-5};b.shield=0;
assert.equal(match.shoot(a,{x:0,y:0,z:-1}).kill,false,'first headshot is survivable');assert.equal(b.hp,50);assert.equal(match.score[0],0);
assert.ok(match.shoot(a,{x:0,y:0,z:-1}).kill,'second headshot eliminates');assert.equal(match.score[0],1);assert.equal(b.dead,3);assert.equal(match.shoot(a,{x:0,y:0,z:-1}),null,'dead targets cannot score twice');
match.spawn(b);b.pos={x:0,y:1.7,z:-5};b.shield=0;
const bodyDistance=Math.hypot(10,.65),bodyDirection={x:0,y:-.65/bodyDistance,z:-10/bodyDistance};
for(let i=0;i<3;i++)assert.equal(match.shoot(a,bodyDirection).kill,false,'first three body shots are survivable');
assert.equal(b.hp,25);assert.ok(match.shoot(a,bodyDirection).kill,'fourth body shot eliminates');assert.equal(match.score[0],2);
match.reset();match.state='playing';const friend=match.actors[1];match.actors[0].pos={x:0,y:1.7,z:5};friend.pos={x:0,y:1.7,z:-5};friend.shield=0;assert.equal(match.shoot(match.actors[0],{x:0,y:0,z:-1}),null);assert.equal(friend.hp,100,'no friendly fire');
match.actors[4].pos={x:-4,y:1.7,z:-8};match.actors[0].pos={x:-4,y:1.7,z:8};match.actors[4].shield=0;assert.equal(match.shoot(match.actors[0],{x:0,y:0,z:-1}),null,'bus occludes shots');
match.reset();match.state='playing';let frames=0;
while(match.state==='playing'&&frames<60*600){match.update(1/60);frames++;}
assert.equal(match.state,'finished','bots finish a match within ten simulation minutes');assert.equal(Math.max(...match.score),30);assert.ok(match.actors.some(a=>a.deaths>0));assert.ok(match.actors.filter(a=>!a.human).every(a=>a.kills>0),'every bot participates');
const score=[...match.score];match.update(10);assert.deepEqual(match.score,score,'finished match freezes');console.log(`Passed: teams, spawns, navigation, headshots, friendly fire, cover, respawn and completed ${score.join('-')} match in ${Math.round(frames/60)}s.`);
match.reset();assert.deepEqual(match.score,[0,0]);assert.ok(match.actors.every(a=>a.hp===100&&a.kills===0&&a.deaths===0));
