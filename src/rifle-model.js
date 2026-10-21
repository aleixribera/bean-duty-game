'use strict';

BD.RifleModel = {
  lens: { y: .18, z: -.11, halfWidth: .064, halfHeight: .047 },

  // Fixed in sight-local space: hood, glass and hologram recoil as one unit.
  reticle() {
    return { x: 0, y: this.lens.y, z: this.lens.z + .00045 };
  },

  draw(renderer, pose, flash) {
    const gl = renderer.gl;
    const graphite = [.24, .27, .28], metal = [.38, .41, .4], black = [.12, .15, .16];
    const tan = [.43, .44, .35];
    const box = (x, y, z, w, h, d, color) => {
      gl.uniformMatrix4fv(renderer.model, false, BD.mat.multiply(pose, BD.mat.transform(x, y, z, w, h, d)));
      gl.uniform3fv(renderer.color, color);
      gl.drawArrays(gl.TRIANGLES, 0, 36);
    };

    // Slim receiver, ventilated handguard, rail, controls and exposed muzzle.
    box(0, -.015, -.07, .085, .095, .32, graphite);
    box(0, -.061, -.025, .072, .025, .27, black);
    box(0, -.025, .18, .063, .075, .2, black);
    box(0, -.045, .29, .08, .12, .055, graphite);
    box(0, -.005, -.36, .072, .074, .25, metal);
    box(0, .008, -.55, .027, .027, .15, black);
    box(0, .008, -.645, .043, .041, .055, graphite);
    for (let z = -.44; z < -.25; z += .045) {
      box(.037, -.008, z, .003, .023, .027, black);
      box(-.037, -.008, z, .003, .023, .027, black);
    }
    for (let z = -.4; z < .065; z += .035) box(0, .045, z, .065, .012, .013, black);
    box(.044, .006, -.035, .004, .032, .08, black);
    box(.047, -.002, .023, .008, .012, .018, metal);
    box(-.047, -.009, .045, .014, .009, .028, metal);
    box(0, -.14, -.04, .057, .17, .085, graphite);
    for (let y = -.2; y < -.08; y += .035) box(.03, y, -.04, .003, .008, .068, black);
    box(0, -.13, .09, .052, .14, .063, tan);
    box(.055, -.13, .11, .078, .105, .14, tan);
    box(-.045, -.079, -.31, .09, .085, .13, tan);

    // Open-window holographic optic, without the obstructing front iron post.
    const lens = this.lens;
    box(0, .071, lens.z, .08, .038, .11, black);
    box(0, .112, lens.z, .144, .032, .065, graphite);
    box(-.071, lens.y, lens.z, .014, .115, .035, metal);
    box(.071, lens.y, lens.z, .014, .115, .035, metal);
    box(0, .235, lens.z, .144, .012, .035, metal);
    box(.082, .119, lens.z, .014, .022, .025, black);
    box(-.031, .112, lens.z + .034, .009, .009, .002, [.65, .76, .39]);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    const pane = (x, y, z, w, h, color, alpha, glow = 0) => {
      gl.uniform1f(renderer.alpha, alpha);
      gl.uniform1f(renderer.emissive, glow);
      gl.uniformMatrix4fv(renderer.model, false, BD.mat.multiply(pose, BD.mat.transform(x, y, z, w, h, .0001)));
      gl.uniform3fv(renderer.color, color);
      // Only one face is drawn, avoiding doubled tint through a transparent box.
      gl.drawArrays(gl.TRIANGLES, 24, 6);
    };
    pane(0, lens.y, lens.z, .128, .094, [.24, .67, .66], .065);
    pane(-.059, lens.y, lens.z + .0003, .002, .088, [.65, .92, .87], .16, 1);
    pane(0, .223, lens.z + .0003, .12, .0015, [.65, .92, .87], .12, 1);

    const reticle = this.reticle();
    const mark = (dx, dy, w, h, opacity) => {
      const x = reticle.x + dx, y = reticle.y + dy;
      // Clip each mark to the glass so the reticle never floats outside the hood.
      const left = Math.max(x - w / 2, -lens.halfWidth);
      const right = Math.min(x + w / 2, lens.halfWidth);
      const bottom = Math.max(y - h / 2, lens.y - lens.halfHeight);
      const top = Math.min(y + h / 2, lens.y + lens.halfHeight);
      if (right > left && top > bottom) {
        pane((left + right) / 2, (top + bottom) / 2, reticle.z - .00005, right - left, top - bottom, [1, .2, .095], opacity, 1);
      }
    };
    mark(0, 0, .0038, .0038, .13);
    mark(0, 0, .0013, .0013, 1);
    for (let i = 0; i < 40; i++) {
      const angle = i / 40 * Math.PI * 2;
      mark(Math.cos(angle) * .011, Math.sin(angle) * .011, .0011, .0011, .85);
    }
    mark(0, -.016, .001, .005, .8);
    gl.uniform1f(renderer.alpha, 1);
    gl.uniform1f(renderer.emissive, 0);
    gl.depthMask(true);
    gl.disable(gl.BLEND);

    if (flash > 0) {
      box(0, .008, -.69, .065, .055, .045, [1, .85, .43]);
      box(0, .008, -.735, .025, .025, .07, [1, .98, .77]);
    }
  }
};
