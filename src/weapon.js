'use strict';

// Prototype tuning, not extracted Call of Duty values. Velocity-only impulses
// preserve positional continuity; 1 / frequency is the isolated kick peak time.
BD.RIFLE_RECOIL = Object.freeze({
  pitchFrequency: 16,
  pitchImpulse: .18,
  yawFrequency: 18,
  yawImpulse: .006,
  cameraFrequency: 18,
  cameraImpulse: .055,
  kickFrequency: 28,
  kickImpulse: .45,
  rollFrequency: 22,
  rollImpulse: .012
});

BD.Weapon = class {
  constructor(audio, onShot) {
    this.audio = audio;
    this.onShot = onShot;
    const tuning = BD.RIFLE_RECOIL;
    this.camera = new BD.Spring(tuning.cameraFrequency);
    this.kick = new BD.Spring(tuning.kickFrequency);
    this.roll = new BD.Spring(tuning.rollFrequency);
    this.borePitch = new BD.Spring(tuning.pitchFrequency);
    this.boreYaw = new BD.Spring(tuning.yawFrequency);
    this.recoilTime = null;
    this.lastShotTime = -Infinity;
    this.burstShot = 0;
    this.ammo = 30;
    this.nextShot = this.bufferUntil = 0;
    this.held = this.aiming = false;
    this.ads = this.reloadLeft = this.flash = this.shots = 0;
  }

  trigger(now) {
    this.held = true;
    if (this.reloadLeft > 0) return;
    if (now >= this.nextShot) this.fire(now);
    else if (this.nextShot - now <= .045) this.bufferUntil = this.nextShot + .045;
  }

  fire(now) {
    if (this.reloadLeft > 0) return;
    if (this.ammo === 0) { this.reload(); return; }
    this.advanceRecoil(now);
    this.ammo--;
    this.shots++;
    this.nextShot = now + .1;
    this.bufferUntil = 0;
    this.flash = .035;
    this.audio.shot();
    // Fire through the current sight BEFORE applying this shot's recoil.
    this.onShot();
    if (now - this.lastShotTime > .25) this.burstShot = 0;
    this.burstShot++;
    this.lastShotTime = now;
    const tuning = BD.RIFLE_RECOIL;
    const lateral = Math.sin(this.burstShot * .55);
    this.camera.kick(0, tuning.cameraImpulse);
    this.borePitch.kick(0, tuning.pitchImpulse);
    this.boreYaw.kick(0, lateral * tuning.yawImpulse);
    this.kick.kick(0, tuning.kickImpulse);
    this.roll.kick(0, lateral * tuning.rollImpulse);
  }

  reload() {
    if (this.reloadLeft > 0 || this.ammo === 30) return;
    this.reloadLeft = 1.55;
    this.bufferUntil = 0;
    this.audio.reload(0);
  }

  resetRecoil() {
    for (const spring of [this.camera, this.kick, this.roll, this.borePitch, this.boreYaw]) spring.x = spring.v = 0;
    this.recoilTime = null;
    this.lastShotTime = -Infinity;
    this.burstShot = 0;
  }

  advanceRecoil(now) {
    const dt = this.recoilTime === null ? 0 : Math.max(0, now - this.recoilTime);
    for (const spring of [this.camera, this.kick, this.roll, this.borePitch, this.boreYaw]) spring.update(dt);
    this.recoilTime = now;
  }

  rebaseClock(now) {
    // Pause/resume must not advance springs or replay missed automatic shots.
    if (this.recoilTime !== null) {
      const shift = now - this.recoilTime;
      this.nextShot += shift;
      this.lastShotTime += shift;
    }
    this.recoilTime = now;
  }

  update(dt, now, sprint) {
    const aim = this.aiming && !sprint && this.reloadLeft <= 0;
    this.ads = BD.clamp(this.ads + (aim ? 1 : -1) * dt / .165, 0, 1);
    this.flash = Math.max(0, this.flash - dt);
    if (this.reloadLeft > 0) {
      const before=1.55-this.reloadLeft;this.reloadLeft -= dt;const after=1.55-this.reloadLeft;for(const [stage,at] of [[1,.75],[2,1.2]])if(before<at&&after>=at)this.audio.reload(stage);
      if (this.reloadLeft <= 0) {
        this.reloadLeft = 0;
        this.ammo = 30;

      }
    } else if (!sprint) {
      // Integrate at each shot deadline, then at the render time. Advancing the
      // cooldown from a late render frame made 600 RPM drift with refresh rate.
      let deadline = Math.max(this.nextShot, now - dt, this.recoilTime ?? now - dt);
      while (deadline <= now + 1e-9 && (this.held || (this.bufferUntil > 0 && this.bufferUntil >= deadline))) {
        this.fire(deadline);
        if (this.reloadLeft > 0) break;
        deadline = this.nextShot;
      }
    }
    this.advanceRecoil(now);
  }

  pose(player) {
    const ads = this.ads * this.ads * (3 - 2 * this.ads);
    const bob = .009 * Math.min(player.speed / 4.5, 1) * (1 - ads * .9);
    const reload = this.reloadLeft > 0 ? Math.sin(this.reloadLeft / 1.55 * Math.PI) : 0;
    const sprint=(player.sprintBlend||0)*(1-ads),lean=(player.strafeLean||0)*(1-ads*.8);
    const base = BD.mat.transform(
      BD.mix(.23, 0, ads) - player.swayX * (1 - ads * .65) + Math.sin(player.bob) * bob - lean*.6,
      BD.mix(-.25, -.18, ads) + player.swayY * (1 - ads * .65) + Math.sin(player.bob * 2) * bob * .6 - reload * .3 - sprint*.09 + (player.landing?.x||0)*.5,
      -.55 + this.kick.x + reload * .12,
      1, 1, 1, reload * .6 - sprint*.25, sprint*.2,
      this.roll.x - player.swayX * 1.2 + reload * .3 + lean + sprint*.2
    );
    // Rotate the entire assembly around a shoulder-side pivot. The optic rises
    // with the receiver instead of the dot sliding up a nearly stationary hood.
    const recoil = BD.mat.multiply(
      BD.mat.transform(0, -.18, .1),
      BD.mat.multiply(
        BD.mat.transform(0, 0, 0, 1, 1, 1, this.borePitch.x, this.boreYaw.x),
        BD.mat.transform(0, .18, -.1)
      )
    );
    return BD.mat.multiply(recoil, base);
  }

  localAim(player) {
    const pose = this.pose(player);
    const dot = BD.RifleModel.reticle();
    const point = [0, 1, 2].map(i =>
      pose[i] * dot.x + pose[4 + i] * dot.y + pose[8 + i] * dot.z + pose[12 + i]);
    const length = Math.hypot(...point);
    const ads = this.ads * this.ads * (3 - 2 * this.ads);
    // Hip fire follows the bore; ADS converges on the actual visible dot.
    return {
      x: BD.mix(-pose[8], point[0] / length, ads),
      y: BD.mix(-pose[9], point[1] / length, ads),
      z: BD.mix(-pose[10], point[2] / length, ads)
    };
  }

  view(player) {
    const motion=player.cameraMotion;
    return {
      pitch:BD.clamp(player.pitch+this.camera.x+(motion?.pitch??0),-1.5,1.5),
      yaw:player.yaw,
      // A small shoulder twist and lens pulse make bursts felt without shake.
      roll:(motion?.roll??0)+this.roll.x*.65*(1-.65*this.ads),
      fov:BD.mix(90,70,this.ads)+((motion?.fov??0)+this.camera.x*65)*(1-this.ads)
    };
  }

  shotDirection(player, random = Math.random) {
    const aim = this.localAim(player);
    const spread = (1 - this.ads) * (.003 + player.speed * .0015);
    const local = { x: aim.x + (random() - .5) * spread, y: aim.y + (random() - .5) * spread, z: aim.z };
    const {pitch,roll} = this.view(player);
    const rolledX=local.x*Math.cos(roll)-local.y*Math.sin(roll);
    local.y=local.x*Math.sin(roll)+local.y*Math.cos(roll);
    local.x=rolledX;
    // Inverse camera view rotation; no duplicated pitch approximation.
    const y = local.y * Math.cos(pitch) - local.z * Math.sin(pitch);
    const z = local.y * Math.sin(pitch) + local.z * Math.cos(pitch);
    const x = local.x * Math.cos(player.yaw) + z * Math.sin(player.yaw);
    const worldZ = -local.x * Math.sin(player.yaw) + z * Math.cos(player.yaw);
    const length = Math.hypot(x, y, worldZ);
    return { x: x / length, y: y / length, z: worldZ / length };
  }

  screenAim(player, aspect) {
    const aim = this.localAim(player);
    const focal = 1 / Math.tan(this.fov(player) * Math.PI / 360);
    return {
      x: .5 - aim.x / aim.z * focal / aspect * .5,
      y: .5 + aim.y / aim.z * focal * .5
    };
  }

  fov(player) { return this.view(player).fov; }

  draw(renderer, player) {
    renderer.viewmodel();
    BD.RifleModel.draw(renderer, this.pose(player), this.flash, this.reloadLeft>0?(1.55-this.reloadLeft)/1.55:0);
  }
};
