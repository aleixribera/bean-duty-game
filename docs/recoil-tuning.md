# Recoil tuning: readable, lighter motion

The previous rifle jumped instantly by 0.018 radians (1.03°), then received another 0.48 rad/s of upward velocity. It also jumped backward 35 mm and received a large camera impulse. Faster displays show more of the recovery, but cannot smooth an instantaneous position change.

## Research and limits

- [Treyarch, Black Ops 6 Season 04 patch notes](https://www.callofduty.com/au/en/patchnotes/2025/05/call-of-duty-black-ops-6-season-04-patch-notes) distinguish View Kick from Gun Kick and discuss predictable, controllable recoil patterns. This supports tuning camera movement separately from rifle movement.
- [Sledgehammer Games and Treyarch, MWIII Season 2 patch notes](https://www.callofduty.com/au/en/patchnotes/2024/02/call-of-duty-modern-warfare-iii-season-2-patch-notes) describe improving aiming precision, especially for mouse players, by reducing interfering motion and aligning bullet trajectory with the aiming indicator.

These sources describe design intent and tuning, not proprietary recoil equations or animation timings. The implementation below is our own adaptation. In particular, we preserve the requested fixed reticle inside the moving sight; we do not copy MWIII's centered hipfire rule.

## Implemented changes

- No positional recoil impulse on any axis. Immediate audio and hitscan remain; motion starts with velocity and rises continuously.
- Rifle pitch peaks about 62.5 ms after an isolated shot (9 frames at 144 Hz), then decays without spring overshoot. Angular peak is approximately 0.237°, about 85% below the previous 1.60° peak.
- Rearward motion is approximately 6 mm at its isolated peak, rather than the previous 35 mm instantaneous jump plus additional movement.
- Much quieter camera recoil, tuned separately from the rifle; tiny deterministic lateral motion replaces random roll kicks.
- Consecutive shots overlap smoothly. Each shot keeps its exact 100 ms simulation deadline instead of shifting the next deadline to a late render frame.
- Rifle, glass and reticle still move together. ADS bullets use the projected reticle position, so reduced recoil is still real recoil.

Values live in `BD.RIFLE_RECOIL` in `src/weapon.js`. The springs use closed-form critically damped integration, so dividing the same interval into different frame sizes produces the same result.

## Verification

`node tests/recoil.cjs` checks continuous positions at firing, peak timing and strength, shot ordering and 600 RPM, pause/resume, and matching recoil at 60/144/240 Hz plus uneven intervals. At 1080p, a stationary isolated ADS shot moves the sight by at most about 0.99 pixels between simulated 144 Hz frames (excluding the separately rendered camera motion).

`node tests/optics.cjs` checks bullet/reticle alignment through different camera angles and weapon poses, a recoil-caused miss at long range, and recovery. `node tests/logic.cjs` covers the remaining weapon/target behavior.

`tests/optic-preview.html` includes single-shot and burst playback without mouse capture. Simulated refresh-rate checks do not claim to measure the user's monitor or actual browser frame delivery.
