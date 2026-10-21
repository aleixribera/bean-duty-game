const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
global.window = global;
for (const name of ['math', 'player', 'rifle-model', 'weapon']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../src', name + '.js'), 'utf8'));
}
const audio = { shot() {}, reload() {} };
const make = () => {
  const weapon = new BD.Weapon(audio, () => {});
  weapon.ads = 1;
  weapon.aiming = true;
  return weapon;
};
const player = new BD.Player();
const weapon = make();
const before = weapon.pose(player);
weapon.fire(0);
assert.deepEqual(weapon.pose(player), before, 'shot causes no position discontinuity');
let maximumStep = 0, peak = 0, peakTime = 0, previousY = .5;
for (let frame = 1; frame <= 144; frame++) {
  weapon.update(1 / 144, frame / 144, false);
  const y = weapon.screenAim(player, 16 / 9).y;
  maximumStep = Math.max(maximumStep, Math.abs(y - previousY) * 1080);
  previousY = y;
  if (weapon.borePitch.x > peak) { peak = weapon.borePitch.x; peakTime = frame / 144; }
}
assert.ok(peakTime >= .05 && peakTime <= .075, 'readable 50–75 ms rise');
assert.ok(peak < .005, 'single-shot rifle rise below 0.29 degrees');
assert.ok(maximumStep < 1.6, '144 Hz aim motion remains under 1.6 pixels per frame at 1080p');
assert.ok(Math.abs(weapon.borePitch.x) < 1e-6, 'settles without oscillation');

function simulate(frameTimes) {
  const w = make(), shots = [];
  w.onShot = () => shots.push({ t: w.recoilTime, pitch: w.borePitch.x });
  w.trigger(0);
  let previous = 0;
  for (const now of frameTimes) {
    w.update(now - previous, now, false);
    previous = now;
  }
  w.held = false;
  return { shots, pitch: w.borePitch.x, yaw: w.boreYaw.x };
}
const seconds = 1.5;
const regular = hz => Array.from({ length: seconds * hz }, (_, i) => (i + 1) / hz);
const reference = simulate(regular(60));
const jitter = [];
let time = 0;
for (let i = 0; time < seconds; i++) {
  time = Math.min(seconds, time + [1 / 144, 1 / 90, 1 / 165, 1 / 110][i % 4]);
  jitter.push(time);
}
for (const frames of [regular(144), regular(240), jitter]) {
  const run = simulate(frames);
  assert.equal(run.shots.length, 16, '600 RPM including initial shot');
  run.shots.forEach((shot, i) => {
    assert.ok(Math.abs(shot.t - i * .1) < 1e-8, 'stable shot deadlines');
    assert.ok(Math.abs(shot.pitch - reference.shots[i].pitch) < 1e-8, 'same recoil at each bullet');
  });
  assert.ok(Math.abs(run.pitch - reference.pitch) < 1e-8, 'refresh-independent pitch');
  assert.ok(Math.abs(run.yaw - reference.yaw) < 1e-8, 'refresh-independent lateral pattern');
}

// Compare old/new single-shot springs to quantify strength rather than guessing.
const old = new BD.Spring(13), next = new BD.Spring(16);
old.kick(.018, .48);
next.kick(0, .18);
let oldPeak = old.x, newPeak = next.x;
for (let i = 0; i < 1000; i++) {
  old.update(.001); next.update(.001);
  oldPeak = Math.max(oldPeak, old.x); newPeak = Math.max(newPeak, next.x);
}
const reduction = (1 - newPeak / oldPeak) * 100;
assert.ok(reduction > 75, 'substantially gentler than previous recoil');
const paused = make();
paused.trigger(0);
paused.update(.04, .04, false);
paused.held = false;
const frozen = paused.borePitch.x;
paused.rebaseClock(10);
assert.equal(paused.borePitch.x, frozen, 'pause does not advance recoil');
paused.update(.01, 10.01, false);
assert.equal(paused.shots, 1, 'resume never replays paused shots');
console.log(`Passed: continuous rise, ${(reduction).toFixed(1)}% lower peak, ${(peakTime * 1000).toFixed(1)} ms peak, ${maximumStep.toFixed(2)} px/frame at 144 Hz; matching 60/144/240 Hz + jitter, pause and 600 RPM.`);
