# SpaceBitz

An installable retro space exploration game. Start in our Solar System or generate a seeded galaxy, visit planets and moons, collect samples, and keep a voyage logbook.

## Play

[Play SpaceBitz](https://owningturtle287.github.io/SpaceBitz/).

For local development, serve this directory with `python3 -m http.server 8000` and open `http://localhost:8000`. There is no build step or external runtime dependency.

- Tap a world or choose it from the system list. **Travel** flies toward it; **Land** becomes available nearby. Gas and ice giants have no solid landing surface; explore their moons.
- **Star chart** opens nearby generated systems. Select a star, travel to it, then enter its system.
- Use WASD / arrow keys or the touch joystick. Drag to pan; pinch, scroll, or use + / − to zoom. **⌗** fits the system; **Recenter** follows the ship.
- Collect glowing surface samples and return to the lander to launch. Your logbook records first landings and samples.
- Settings are available in the startup menu and in game: music and volume, star drift and twinkle, orbit and Goldilocks overlays, labels, travel trails, coordinates, FPS, distance units, terrain detail, rendering resolution, input mode, joystick placement, pause, and optional instant travel.
- The original 48 BPM melody plays continuously through the menu and gameplay. Where autoplay is blocked, the first tap or keypress starts audio; the menu also has an **Enable music** button. Music pauses while the app is hidden.

## Clock and astronomical model

**One real minute equals one game hour.** Earth rotates once in **24 real minutes**. Its 365.256-day orbit takes about **6.09 real days of active play**, and the Moon's 27.322-day orbit takes about **10.93 real hours**. Time pauses in menus, while the app is hidden, and when the simulation-clock pause option is enabled. Ship travel remains fast enough to explore comfortably.

Sol uses approximate real diameters in kilometres, semimajor axes in AU, orbital periods, and rotation periods. Earth's rotation is deliberately rounded to 24 hours to match the game clock; other bodies use approximate sidereal rotations, including retrograde Venus and Uranus. Moons rotate synchronously; Triton's orbit and rotation are retrograde. Surface lighting and globe textures follow the same clock.

Procedural systems use stellar mass, a mass-to-the-3.5-power luminosity estimate, Kepler orbital periods, and a temperate band proportional to the square root of luminosity. Generated moon periods use estimated host mass and physical orbital distance, with conservative Hill-radius limits. This is a circular-orbit exploration model, not an N-body simulation. The green band is an **irradiance guide**, not a guarantee of breathable air or liquid water.

Orbital distances are compressed logarithmically for navigation. All body radii share a mildly compressed diameter scale: the Sun appears about seven times Jupiter's radius and more than fifty times Earth's. Small moons retain a visibility floor and generous hit targets. Physical values appear in **Details**. Navigation routes around the enlarged star.

## Art and terrain

The moving pixel starfield and twinkle effects remain visible behind the startup console. Spacecraft turn toward their actual travel direction, with thrust-linked twin engines. The astronaut has four facing directions and movement-driven walk cycles.

Terrain samples continuous, seeded noise in world coordinates: warped continents, coasts, moisture bands, mountain ridges, crater depressions, and biome palettes. Small cached raster chunks keep rendering efficient without repeating tile boundaries. Pixel density is adjustable. Landing sites have a small dry clearing; water slows movement.

## Saves and installation

Progress autosaves locally. **Save & Main Menu** and **Export Save** are in Settings; import is on the startup screen. Existing Field Edition saves retain discoveries and get a safe ship-position migration for the enlarged system. Older `spacebitz:saves` exports can be imported as new universes; old terrain and exact positions do not carry over. Storage is device specific; clearing site data deletes local saves, so export important voyages.

On Android Chrome, use **Install app** from the browser menu or the in-game installation prompt. On iPhone Safari, choose **Share → Add to Home Screen**. The installed progressive web app works offline after its first complete online load; this repository does not ship a native APK or IPA.

GitHub Pages deploys automatically from `main`. For a fork, enable **Settings → Pages → Build and deployment → GitHub Actions**, then run **Deploy SpaceBitz**. HTTPS is required for installation and offline caching outside localhost.

## Development and checks

Run `npm test` (Node's built-in test runner; no package installation required).

- `model.js`: deterministic generation, physical periods, clock, display scaling.
- `terrain.js` / `celestial.js`: continuous pixel terrain and rotating spherical body textures.
- `motion.js` / `sprites.js`: navigation, movement state, ship and astronaut art.
- `music.js` / `settings.js`: soundtrack lifecycle and validated preferences.
- `main.js`: input, game state, UI, canvas scenes, autosave.
- `sw.js`: app-shell cache scoped to this app, including every runtime module.

Tests cover clock ratios, planetary and lunar periods, scale and orbital clearance, deterministic terrain and chunk continuity, ship steering and star avoidance, settings migration, audio scheduling, and offline asset completeness. Browser checks supplement these; automated checks do not simulate every phone or browser's audio policy.

Reference values: [NASA planetary fact sheets](https://nssdc.gsfc.nasa.gov/planetary/factsheet/). Browser audio behavior: [MDN autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
