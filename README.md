# Bean Duty — Nuketown graybox

Open `bean-duty.html` in a modern desktop browser, then click **Start Match**. No dependencies, build, assets, or installation. WebGL, pointer lock, and Web Audio must be available. If your browser restricts local files, run `node server.cjs` and open http://127.0.0.1:5173.

WASD move; mouse looks; left mouse fires (hold for automatic); right mouse aims; Shift + W sprints; Space jumps; C holds crouch; R reloads; Escape pauses. Explore two opposing two-story houses, open garages, backyards, side lanes, and the central bus/truck street. Offline 4v4 team deathmatch fills the seven empty slots with bots: you and three blue allies against four red enemies. First team to 30 kills wins. Bots navigate ground-floor doors and lanes, acquire visible opponents, shoot cover-aware hitscan rounds, reload, and respawn. The player can use the upstairs rooms. Friendly fire is off. Everyone respawns after 3 seconds with 1.5 seconds of protection. Player health regenerates after 5 seconds without damage. Escape pauses the whole match; the results screen lists all eight players and offers a rematch. Body hits do 17 damage; headshots do 34: six body shots or three headshots eliminate a full-health opponent. Magazine: 30, unlimited reserve, 1.55 second reload.

## Code map

- `src/game.js`: composition, input, pointer lock, HUD, animation loop.
- `src/match.js`: teams, ground navigation, bot combat, respawns, scoring and match lifecycle.
- `src/renderer.js`: native WebGL rendering, static map batches grouped by color, and separate viewmodel pass.
- `src/math.js`: matrix helpers and analytic critically damped springs.
- `src/player.js`: accelerated movement, jump/crouch, look and inertia.
- `src/weapon.js`: cadence, 45 ms click buffer, ADS, recoil and shared bullet/sight direction.
- `src/rifle-model.js`: detailed graybox rifle, transparent holographic glass and fixed reticle.
- `src/range.js`: suburban map geometry, wall sliding, stairs, vertical collision, target lifecycle, and cover-aware ray/box hits.
- `src/audio.js`: gesture-unlocked synthesized shots, hits and footsteps.
- `styles.css`: interface. `bean-duty.html`: markup and script composition only.

Classic scripts use one `BD` namespace to support direct file opening without module fetch restrictions. No CDN requests. Recoil uses velocity-only impulses with continuous position and an analytic damped settle; camera and weapon springs are independent. ADS takes 165 ms, changes vertical FOV 90° → 70°, and scales sensitivity to 0.6. Hipfire has mild spread; fully aimed shots have none. Hitscan and audio run in the mousedown handler. Automatic and buffered shots use fixed 100 ms deadlines, integrating recoil to each deadline and then to the render timestamp. Their visible/audio feedback still occurs on the first available browser frame, not hard real-time. Hitmarker lasts 85 ms. Audio is generated in memory; volume defaults to 50%.

This is an offline bot match with no networking, bullet ballistics, or external art. Map geometry and target hits use metres. This is an approximate, primitive-only recreation of Nuketown’s core layout, with no imported game assets. Geometry is uploaded once and rendered in color batches; no textures, dynamic shadows, or external dependencies. The existing rifle behavior is preserved.

Run checks with `node tests/logic.cjs`, `node tests/map.cjs`, `node tests/optics.cjs`, and `node tests/recoil.cjs`. Map checks cover doors, garages, flanks, walls, perimeter, bus collision, stair ascent/descent, upstairs jumping, and bullet occlusion.

The holographic sight uses a thin open hood and a single transparent lens surface. Its ring/dot reticle stays fixed at the center of the glass. The entire rifle and optic rotate upward around a shoulder-side pivot during recoil. ADS bullets and the HUD aim marker follow the projected dot, including sway and recoil. World and weapon rendering use the same field of view to keep the reticle and bullet aligned throughout ADS. There is no aim assist or target magnetism.

Angular bore recoil now affects both the rifle and hitscan direction, independently of rearward model punch and camera recoil. Every shot samples the current sight direction before applying its own kick; sustained fire therefore climbs unless the player compensates. Hipfire retains spread. Run `node tests/optics.cjs` for projection/recoil regression checks. Open `tests/optic-preview.html` to inspect rested ADS, recoil, eye offset and hip views without pointer lock.

Run `node tests/match.cjs` for bot navigation, damage, cover, friendly fire, respawns, and a deterministic full-match simulation. The server accepts a PORT environment variable if 5173 is occupied.

Bots now patrol separate lanes and use the same accelerated character movement, wall collision, sprint and crouch controls as the player. They strafe in fights, back off to reload or when hurt, separate from nearby characters, and choose a new route when stuck. Their ground-floor navigation still does not plan upstairs routes. Bodies, walking legs and rifles follow their movement and aim.

Awareness requires line of sight within a forward field of view; lost opponents leave only a short-lived last-seen position. Bots have reaction delays and bounded aim speed, and shoot along their actual weapon direction with movement spread, recoil and short bursts. Both teams use identical bot rules, with the player's 17 body / 34 head damage, 30-round magazine, 1.55-second reload and delayed health regeneration. Teammates block shots and bots hold fire when their bore ray crosses an ally. Run `node tests/bots.cjs` for perception, aim, fairness, spacing, collision and three seeded full-match checks.

