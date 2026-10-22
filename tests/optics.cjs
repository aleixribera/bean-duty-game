const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
global.window = global;
for (const file of ['math', 'player', 'rifle-model', 'weapon', 'range']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../src', file + '.js'), 'utf8'));
}
const player = new BD.Player();
const audio = { shot() {}, reload() {} };
const rifle = new BD.Weapon(audio, () => {});
rifle.ads = 1;
rifle.aiming = true;
const close = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-6, label);

// Reproject the actual bullet into camera space and compare with the glass dot.
for (const yaw of [0, .7, -2.2]) {
  for (const pitch of [0, .8, -1.44]) {
    for (const recoil of [0, .045, .09]) {
      player.yaw = yaw;
      player.pitch = pitch;
      player.swayX = .018;
      player.swayY = -.012;
      rifle.borePitch.x = recoil;
      rifle.boreYaw.x = .007;
      rifle.roll.x = .025;
      rifle.camera.x = .008;
      const pose = rifle.pose(player);
      const dot = BD.RifleModel.reticle(pose);
      close(dot.x, 0, 'reticle stays horizontally centered in the sight');
      close(dot.y, BD.RifleModel.lens.y, 'reticle stays vertically centered in the sight');
      const point = [0, 1, 2].map(i => pose[i] * dot.x + pose[4 + i] * dot.y + pose[8 + i] * dot.z + pose[12 + i]);
      const ray = rifle.shotDirection(player);
      const camera = rifle.view(player);
      const view = BD.mat.view({ x: 0, y: 0, z: 0 }, camera.yaw, camera.pitch, camera.roll);
      const local = [0, 1, 2].map(i => view[i] * ray.x + view[4 + i] * ray.y + view[8 + i] * ray.z);
      close(point[0] / -point[2], local[0] / -local[2], 'reticle matches bullet X');
      close(point[1] / -point[2], local[1] / -local[2], 'reticle matches bullet Y');
      close(Math.hypot(ray.x, ray.y, ray.z), 1, 'normalized ray');
    }
  }
}

// First shot is on target; recoil rises continuously and still changes aim.
const range = new BD.Range();
// Isolate the long-distance optics fixture from map cover.
range.solids=[];range.targets=[{x:6,y:0,z:-72,hp:100,flash:0,respawn:0}];
player.pos = { x: 6, y: 1.75, z: 3 };
player.yaw = player.pitch = player.swayX = player.swayY = 0;
rifle.resetRecoil();
const restedPose = rifle.pose(player);
const glassHeight = pose => pose[5] * BD.RifleModel.lens.y + pose[9] * BD.RifleModel.lens.z + pose[13];
assert.equal(range.shoot(player.pos, rifle.shotDirection(player)).head, true);
range.reset();
let firedRay;
rifle.onShot = () => { firedRay = rifle.shotDirection(player); };
rifle.fire(0);
close(glassHeight(rifle.pose(player)), glassHeight(restedPose), 'no instantaneous position jump');
rifle.update(.0625, .0625, false);
const kickedPose = rifle.pose(player);
assert.ok(glassHeight(kickedPose) > glassHeight(restedPose) + .002, 'whole sight rises smoothly');
assert.ok(kickedPose[13] > restedPose[13] + .002, 'receiver rises with the sight');
close(firedRay.y, 0, 'shot uses pre-kick sight');
assert.ok(rifle.shotDirection(player).y > .003, 'recoil raises next bullet');
assert.equal(range.shoot(player.pos, rifle.shotDirection(player)), null);
for (let i = 1; i <= 240; i++) rifle.update(1 / 120, .0625 + i / 120, false);
assert.ok(Math.abs(rifle.shotDirection(player).y) < .00001, 'recoil recovers');
console.log('Passed: optical/bullet alignment across 27 poses, normalized rays, recoil-caused miss, shot ordering, recovery.');
