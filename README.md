# SpaceBitz

An installable retro space exploration game. Start in our Solar System or generate a seeded galaxy, visit planets and moons, collect samples, and keep a voyage logbook.

## Play

[Play SpaceBitz](https://owningturtle287.github.io/SpaceBitz/).

For local development, serve this directory with `python3 -m http.server 8000` and open `http://localhost:8000`. There is no build step or external runtime dependency.

- Tap a world or choose it from the system list. **Travel** flies toward it; **Land** becomes available nearby. Gas and ice giants have no solid landing surface; explore their moons.
- **Star chart** opens nearby generated systems. Select a star, travel to it, then enter its system.
- Use WASD / arrow keys or the touch joystick. Drag to pan; pinch, scroll, or use + / − to zoom. **Fit System** in the system dropdown fits the orbital map; **Center** follows the ship.
- Collect glowing surface samples and return to the lander to launch. Your logbook records first landings and samples.
- Settings are available in the startup menu and in game: music and volume, star drift and twinkle, orbit and Goldilocks overlays, labels, travel trails, coordinates, FPS, terrain detail, rendering resolution, input mode, joystick placement, pause, and optional instant travel.
- The original 48 BPM melody plays continuously through the menu and gameplay. Where autoplay is blocked, the first tap or keypress starts audio; the menu also has an **Enable music** button. Music pauses while the app is hidden.

## Clock and astronomical model

In accelerated mode, **one real minute equals one game hour**. Earth rotates once in approximately **24 real minutes**. Its 365.256-day orbit takes about **6.09 real days of active play**, and the Moon's 27.322-day orbit takes about **10.93 real hours**. Accelerated time pauses in menus, while the app is hidden, and when the simulation-clock pause option is enabled. Real-time mode follows the current date and time. Ship travel remains fast enough to explore comfortably.

Sol uses approximate real diameters in kilometres, semimajor axes in AU, orbital periods, and sidereal rotation periods, including retrograde Venus and Uranus. Moons rotate synchronously; Triton's orbit and rotation are retrograde. Surface lighting and globe textures follow the same clock.

Procedural systems use stellar mass, a mass-to-the-3.5-power luminosity estimate, Kepler orbital periods, and a temperate band proportional to the square root of luminosity. Generated moon periods use estimated host mass and physical orbital distance, with conservative Hill-radius limits. Sol uses elliptical orbits; generated systems use circular Kepler orbits. Gravitational interactions are not simulated. The green band is an **irradiance guide**, not a guarantee of breathable air or liquid water.

Body diameters and system orbit distances now use **one linear physical scale**, calibrated so Sol's drawn radius is three times its v1.4 radius. Sol's mean diameter is 1,391,400 km; planets and moons retain their physical proportions to it. Tiny bodies get hollow navigation beacons rather than inflated physical disks. Sol planet positions include the JPL Table 1 eccentricity, inclination and ascending node, projected into the map; the Earth entry approximates the Earth–Moon barycentre. These approximate elements are intended for 1800–2050. Moon semimajor axes and eccentricities are physical, but their orbital planes/phases are illustrative, not a live ephemeris. Generated systems retain deterministic Kepler periods and Hill-sphere limits.

Use **Fit System** in the system dropdown for the full orbital map, **Info → Focus View** to inspect a body, and **Center** to return to your ship. The wider zoom range accommodates both true orbital spacing and small moons. Travel automatically cruises and brakes across long system distances; ship speed is a gameplay convenience, not a real spacecraft velocity.

## Coordinates and fixed units

| Scene | One square | Origin | Distance display |
| --- | --- | --- | --- |
| Surface | 1 metre, matching the standing astronaut's visible height | Landing ship | m, then km at 1,000 m |
| System | 1 light-second | Central star | ls, then AU at 500 ls |
| Interstellar chart | 1 light-year | Home system | ly |

The **500 light-seconds = 1 AU** convention is intentionally rounded for the game. Physical diameters and orbits are stored in kilometres/AU; the system's light-second conversion uses AU/500 consistently. The standard cannot be changed in Settings. Coordinates use +X right and +Y down. On zoomed-out views, intermediate grid lines are skipped for legibility without changing the underlying unit. The chart is procedural, not a map of real nearby stars.

Tap/click empty terrain or space to highlight a square, then choose **Go Here**. The target panel shows the location and remaining distance. **Clear**, Escape, or manual movement cancels the route; arrival stops at the exact square centre. Tapping celestial objects still selects those objects. Coordinates appear directly beneath the clock with matching styling.

## Art and terrain

The compact translucent panels use stepped pixel corners. Warp Drive uses a red pixel knob on a shaded metal base: its handle pivots during engagement, lights during transit and returns when complete. Reduced-motion mode keeps its state changes without pulsing animation.

The explorer's standing height is exactly one-third of the parked ship's visible height. Four facing directions each have eight distance-driven poses and a separate idle stance. The astronaut, shadow, ships, lander and samples scale with camera zoom.

Stellar surfaces show slowly drifting convection with smoothly blended frames, small active-region sunspots that grow/fade, bright flare kernels and occasional loops. Stellar texture frames are reused and blended at a bounded resolution. Spot diameters stay below 28,000 km. Activity timing is artistically accelerated to remain visible during play; it does not predict real solar weather. Reduced-motion mode freezes that visual activity.

Terrain samples continuous, seeded noise in world coordinates, using small cached raster chunks. Pixel density is adjustable. Landing sites have a dry clearing; water slows both manual walking and waypoint travel.

Background stars drift independently of the ship and camera. System orbit paths and zone shading are clipped to the viewport before drawing; close-up body textures are source-cropped so true physical distances never become enormous GPU paths or raster targets. Each frame clears opaque space before the scene is drawn. WebKit uses its software canvas path to avoid an observed high-DPI first-frame scaling failure; other engines retain their accelerated path.

## Saves and installation

Progress autosaves locally. **Save & Main Menu** and **Export Save** are in Settings; import is on the startup screen. Existing saves retain discoveries, logbooks, local surface locations and chart progress. Ships saved in the old compressed system are safely repositioned beside their nearest legacy planet on first load; this migration runs once. Older `spacebitz:saves` exports can be imported as new universes; old terrain and exact positions do not carry over. Storage is device specific; clearing site data deletes local saves, so export important voyages.

On Android Chrome, use **Install app** from the browser menu or the in-game installation prompt. On iPhone Safari, choose **Share → Add to Home Screen**. The installed progressive web app works offline after its first complete online load; this repository does not ship a native APK or IPA.

GitHub Pages deploys automatically from `main`. For a fork, enable **Settings → Pages → Build and deployment → GitHub Actions**, then run **Deploy SpaceBitz**. HTTPS is required for installation and offline caching outside localhost.

## Development and checks

Run `npm test` (Node's built-in test runner; no package installation required).

- `model.js`: deterministic generation, physical periods, clock, display scaling.
- `terrain.js` / `celestial.js`: continuous pixel terrain and rotating spherical body textures.
- `motion.js` / `navigation.js` / `sprites.js`: movement, travel, save migration and character/ship art.
- `scale.js`: fixed units, grid snapping and distance formatting.
- `stellar.js`: smoothly blended convection, sunspots and flares.
- `rendering.js`: bounded screen-space geometry, clipped textures, frame clearing and independent star drift.
- `settings.js`: validated preferences; native soundtrack lifecycle is in `main.js`.
- `main.js`: input, game state, UI, canvas scenes, autosave.
- `sw.js`: app-shell cache scoped to this app, including every runtime module.
- `assets/`: original pixel lettering and title, rebuilt with `python tools/build-retro-assets.py` (optional development dependency: `fonttools`; no runtime dependency).

Tests cover clock ratios, planetary and lunar periods, scale and orbital clearance, deterministic terrain and chunk continuity, ship steering and star avoidance, settings migration, audio scheduling, and offline asset completeness. GitHub Actions runs `scripts/check-browser.mjs` in Chromium and WebKit before deploying, covering Sol/generated startup, save loading, close-up zoom, background independence, opaque clearing and warp engagement. Browser screenshots are attached to the workflow run. These desktop engines do not simulate every phone's GPU or audio policy.

Reference values: [NASA planetary fact sheets](https://nssdc.gsfc.nasa.gov/planetary/factsheet/). Browser audio behavior: [MDN autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).

Scale references: [NASA Sun facts](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html), [JPL approximate planetary positions](https://ssd.jpl.nasa.gov/planets/approx_pos.html), [JPL satellite mean elements](https://ssd.jpl.nasa.gov/sats/elem/sep.html). Full release history: [CHANGELOG.md](CHANGELOG.md) and **Settings → Change log**.
