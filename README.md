# SpaceBitz

An installable retro space exploration game. Start on Earth or a generated home planet, visit planets, dwarf planets and moons, collect samples, and keep a voyage logbook.

## Play

[Play SpaceBitz](https://owningturtle287.github.io/SpaceBitz/).

For local development, serve this directory with `python3 -m http.server 8000` and open `http://localhost:8000`. There is no build step or external runtime dependency.

- New games start on their home planet beside the lander. Select the lander and choose **Launch** to explore space; the planet remains identified as home in its information and voyage log.
- Tap a world or choose it from the system list. **Hyperdrive** flies toward it at **0.5 AU/s**; trips within a planet’s moon system use **Orbit Drive at 0.1 ls/s**. The drive is chosen at departure and stays fixed. **Land** becomes available nearby. Gas and ice giants have no solid landing surface; explore their moons.
- Select the central star and choose **Hyperdrive** to approach its near side and stop outside the stellar disk.
- The **flight-speed slider**, beside the terminal, selects Orbit, Hyperspace or Warp Drive in system view. Deep Space holds it at Warp; use the green target control to enter a selected system. Warp Drive opens nearby generated systems. Select a star, travel to it, then enter its system beside its outermost planet (Neptune for Sol).
- Use WASD / arrow keys or the touch joystick. System flight speed is independent of zoom: select **Orbit (0.1 ls/s)** or **Hyperspace (0.5 AU/s)** on the slider for free flight. Automatic travel chooses its own appropriate drive. Deep Space always uses **Warp Drive (9 ly/s)**. The optional speed readout is in Settings. Active travel shows a pixel red **X**; Escape also cancels. Drag to pan; pinch, scroll, or use + / − to zoom. The **orbital-centering icon beside the system chart** fits the orbital map; **Center** smoothly pans to the ship or surface explorer at your current zoom over 1.3 seconds. Press again after centering completes to zoom in and follow the moving ship (to 2.4× on surfaces/Deep Space). The full-size labeled Follow toggle beside Center starts or stops following at the current zoom. Zoom keeps Follow enabled; panning temporarily inspects the scene, then smoothly returns two seconds after the last drag without changing zoom. Reduced motion makes each step immediate.
- Collect glowing surface samples and return to the lander to launch. Your logbook records first landings and samples.
- Settings are available in the startup menu and in game: music and volume, star drift and twinkle, orbit and Goldilocks overlays, labels, travel trails, coordinates, coordinate grid, FPS, terrain detail, rendering resolution, input mode, joystick placement, pause, and optional instant travel.
- The original soft-synth melody plays continuously through the menu and gameplay. Where autoplay is blocked, the first tap or keypress starts audio. Music pauses while the app is hidden.

## Giant worlds and the extended Sol system

Version **1.12.15** keeps Deep Space fixed at Warp, including immediate Center/Follow taps after system exit. Surveys output only while their terminal is visible, and completed surveys enter the filterable log. Settings and Log use rounded menus, terminal controls align right, and scrollbars sit beside the panel borders. Landscape-only play pauses behind a rotate prompt when upright. Existing generated identities, orbital geometry, routes and discoveries are preserved. See [CHANGELOG.md](CHANGELOG.md) for the complete release history.

New Universe contains default-on Scientific Mode, inspectable rarity tables and exact-total numerical custom settings beside the independently scrolling saved-voyage list. Names start blank. Objects use single-tap selection; empty coordinate squares in both space layers and planet/moon surfaces require two nearby taps. Selection outlines frame the square without filling it.

The red Cancel X, full-size object Focus button and green travel lever form a vertical stack beside the terminal. The compact border has no title; the compact summary identifies the selected object and its main type. **Open Terminal** begins the selected object's visible Object Data output in the same chronological stream as status messages and submitted text. Closing the terminal pauses output; surveys enter the saved log once their visible output finishes. New output scrolls down as it types. Output stays where it finishes, and scrolling back to read is respected. **Clear Terminal**, beside Close Terminal, clears the screen while keeping saved log records. Its keyboard, input and Backspace remain at the bottom. Object records display diameter and name their subject in the data heading. Orbit periods use Earth days; rotation periods use Earth days, hours and minutes. Optional 44-pixel arrow grips support touch, pointer and keyboard resizing. Panel dimensions do not change character sizes.

The voyage **Log** preserves action status and the latest Object Data survey for each object. Tap or click a survey to expand its snapshot beside the object's pixel visual; items have visuals too. Use All, Stars, Planets, Moons, Items or Status Updates to filter records. Log grows from its dashboard button to fill the screen, without moving the dashboard controls during its animation. It closes the terminal and system chart and pauses flight while open. Settings has seven category tabs, with Terminal sizing and independent Terminal/Log character sizes plus a master size option. Master mode preserves individual choices for when you switch back. Deep Space terminal lookups show only the selected star's name and main type; enter its system and open that star's terminal to record its full survey. Brief lookups do not replace previously saved full surveys.

The transparent dashboard keeps the joystick, full-size Center/Follow controls, the speed slider, Log and Terminal launchers inside its metallic rim. Its rounded lower corners and terminal casing account for phone safe areas. A small solid green house marks the home star in Deep Space and the home world in system view; selected status also identifies them.

The v1.9 artwork rebuilds the gas/ice giants with pixel cloud belts, curled storms and distinct reflected-light palettes. Rings have radial detail, major gaps, planetary shadows and physical radii; Jupiter’s dust rings are faint. Generated colors follow temperature/cloud models with documented artistic rarity weights.

Saturn now includes **Tethys, Dione, Rhea and Iapetus** alongside Enceladus and Titan. Uranus includes **Ariel, Umbriel, Titania and Oberon**. **Pluto and Charon** are landable, with their own artwork, an inclined eccentric heliocentric orbit and shared barycentric motion. The chart counts Pluto as a dwarf planet. System Fit includes it; entering Sol still arrives beside Neptune.

See [astronomical sources and model limits](docs/astronomy.md) for data, appearance probabilities and rendering bounds.

## Clock and astronomical model

In accelerated mode, **one real minute equals one game hour**. Earth rotates once in approximately **24 real minutes**. Its 365.256-day orbit takes about **6.09 real days of active play**, and the Moon's 27.322-day orbit takes about **10.93 real hours**. Accelerated time pauses in menus, while the app is hidden, and when the simulation-clock pause option is enabled. Real-time mode follows the current date and time. Ship travel remains fast enough to explore comfortably.

Sol uses approximate real diameters in kilometres, semimajor axes in AU, orbital periods, and sidereal rotation periods, including retrograde Venus and Uranus. Moons rotate synchronously; Triton's orbit and rotation are retrograde. Surface lighting and globe textures follow the same clock.

Procedural systems use stellar mass, a mass-to-the-3.5-power luminosity estimate, Kepler orbital periods, and a temperate band proportional to the square root of luminosity. Generated moon periods use estimated host mass and physical orbital distance, with conservative Hill-radius limits. Sol uses elliptical orbits; generated systems use circular Kepler orbits. Gravitational interactions are not simulated. The green band is an **irradiance guide**, not a guarantee of breathable air or liquid water.

Body diameters and system orbit distances now use **one linear physical scale**, enlarged tenfold in v1.7 for stars, planets, moons and orbital distances together. Numerical diameters and AU/light-second distances are unchanged; the system spacecraft now uses a physical length of 1 km, with the full original sprite and a separate locator when tiny. Sol's mean diameter is 1,391,400 km; planets and moons retain their physical proportions to it. Tiny bodies get hollow navigation beacons rather than inflated physical disks. Sol planet positions include the JPL Table 1 eccentricity, inclination and ascending node, projected into the map; the Earth entry approximates the Earth–Moon barycentre. These approximate elements are intended for 1800–2050. Moon semimajor axes and eccentricities are physical. New satellites use projected JPL mean orbital planes; existing moon positions remain compatible. Phases are illustrative, not a live ephemeris. Pluto uses a separate NASA mean ellipse with a physical Pluto–Charon barycenter. Generated systems retain deterministic Kepler periods and Hill-sphere limits.

Use the **orbital-centering icon beside the system chart** for the full orbital map, the terminal’s **Focus View** button to inspect a body, and **Center** to return to your ship. The wider zoom range accommodates both true orbital spacing and small moons. System Fit pans and zooms from your current view over 2.6 seconds (instant with reduced motion). With following off, manual movement, routes and arrival preserve your camera position and zoom. Center first pans smoothly to the ship without changing zoom; after it finishes, a second press zooms in. It preserves an active route; completing the second zoom enables following. The tracking toggle smoothly centers at the current zoom before following, or freezes the view when switched off. Focus View and System Fit stop following and reset the two-step Center action. Pinch/wheel zoom preserves Follow; panning returns smoothly two seconds after the last drag when Follow is enabled, without changing zoom. Hyperdrive covers a straight AU in two seconds; the final step stops at the arrival boundary, and avoidance paths may take longer; ship speed is a gameplay convenience, not a real spacecraft velocity.

## Coordinates and fixed units

| Scene | One square | Origin | Distance display |
| --- | --- | --- | --- |
| Surface | 1 metre, matching the standing astronaut's visible height | Landing ship | m, then km at 1,000 m |
| System | 1 light-second | Central star | ls, then AU at 500 ls |
| Interstellar chart | 1 light-year | Home system | ly |

The **500 light-seconds = 1 AU** convention is intentionally rounded for the game. Physical diameters and orbits are stored in kilometres/AU; the system's light-second conversion uses AU/500 consistently. The standard cannot be changed in Settings. Coordinates use +X right and +Y down, rounded to whole base units (m, ls or ly) without decimal places. Body diameters always display kilometres. The grid defaults off; use **Settings → Coordinate grid** to toggle it. The choice is saved. Selected squares and routes remain visible with the grid off. On zoomed-out views, intermediate grid lines are skipped for legibility without changing the underlying unit. The chart is procedural, not a map of real nearby stars.

Double-tap/click empty space or a planet/moon surface to frame a coordinate, then engage the green travel lever beside the terminal. A single tap selects celestial objects, samples and landers. Selected areas have an unfilled outline rather than a tinted interior. The target panel shows the location and remaining distance. The pixel red **X**, Escape, or manual movement cancels the route; arrival stops at the exact square centre. Tapping celestial objects still selects those objects. Coordinates appear directly beneath the clock with matching styling.

## Art and terrain

The compact translucent panels use stepped pixel corners. The speed slider uses three pixel detents over a widening stepped taper: light-blue Orbit at its narrow tip, yellow Hyperspace in the middle and purple Warp at its widest end. Reduced motion removes control transitions.

The explorer's standing height is exactly one-third of the local landing shuttle's visible height. The 1 km spacecraft standard applies to physical system flight; the surface shuttle uses the existing metre-scale artwork, and the Deep Space map uses symbolic spacecraft/star markers. Four facing directions each have eight distance-driven poses and a separate idle stance. The astronaut, shadow, ships, lander and samples scale with camera zoom.

Stellar surfaces show circulating pixel convection, bright granules, dark channels and evolving sunspot groups. Broad, curling plasma extrusions share the surface palette and grow and recede at the limb. Spot groups and eruptions scale with radius, rotation and magnetic activity; giant structures can exceed 28,000 km. Brown dwarfs use atmospheric clouds rather than solar granulation. Pulsar phase follows its listed spin period, with exposure-averaged fast beams when the display cannot resolve individual rotations. Activity timing is artistically accelerated and does not predict real solar weather. Reduced-motion mode freezes that visual activity.

Terrain samples continuous, seeded noise in world coordinates, using small cached raster chunks. Pixel density is adjustable. Landing sites have a dry clearing; water slows both manual walking and waypoint travel.

Background stars drift independently of the ship and camera. System orbit paths and zone shading are clipped to the viewport before drawing; close-up body textures are source-cropped so true physical distances never become enormous GPU paths or raster targets. Each frame clears opaque space before the scene is drawn. WebKit uses its software canvas path to avoid an observed high-DPI first-frame scaling failure; other engines retain their accelerated path.

HUD and menu backgrounds are 25% opaque; labels, icons and the joystick thumb remain solid. The universal object terminal and voyage log are opaque. On surfaces, the upper-left world name opens that same terminal and Warp Drive is hidden. Pixel-framed object labels follow projected positions; travel controls stay beside the terminal, whose content scrolls independently. Reduced motion shows the complete record immediately. In-game Settings is opaque. The speed slider shows the current drive, including automatic transfers, and remains on Warp in Deep Space. Date/time, coordinates and FPS share a brighter, bold panel that fits its visible fields; each can be toggled in Settings, and disabling all three hides the panel. An offscreen ship has a light-blue directional arrow at the screen edge. System view retains a narrow heading-aligned isosceles SHIP marker with a sharp forward tip only when its onscreen sprite is under four pixels tall. On surfaces the offscreen arrow points to the parked lander, replacing the old LANDER label; there is no surface locator while the lander is onscreen. Custom navigation controls avoid visible HUD panels, and action notifications appear in the terminal. The explorer uses connected knee/boot artwork, a grounded backward stance and lifted forward return, with centred front/back feet.

## Saves and installation

Version 1.12.19 migrates existing voyages into an atomic IndexedDB database. Each voyage and archived log entry is stored separately; autosaves write only changed history. The active voyage keeps its latest 200 entries in memory, while the Log reads 80 entries per page and expands survey text on demand. Older history remains available in the log and in complete exports. Log filters and reopening retain reading position and expanded surveys. Status messages wait behind unfinished terminal surveys, and interrupted output resumes after returning to the app, landscape or terminal.

If two windows edit the same voyage, the stale window pauses before it can replace newer progress. It offers Reload Saved Voyage, Keep As Separate Voyage and Export This Copy. Modern exports include all archived history and have no arbitrary 2 MB import cutoff. Station keeping is saved with its target and offset, so real-time reloads preserve the ship's position relative to its moving planet, moon or star. Older saves infer that relationship using their saved date.

Instant Travel completes automatic routes immediately and shortens Warp engagement; it leaves manual flight speeds unchanged. Travel Trail applies to both previous routes and active Deep Space courses. Settings → Voyage includes Check for Update; update installation failures appear in the terminal. Shell installations fetch fresh assets and updates remain deferred until the voyage is safely saved and the menu is clear of dialogs.

Progress autosaves locally. New voyages and imports never evict older voyages. If storage is full, Save & Main Menu keeps the voyage open so it can be exported. Invalid stored data is preserved and rejected on restoration; damaged storage is never overwritten with an empty list. **Save & Main Menu** and **Export Save** are in Settings; import is on the startup screen. Existing saves retain discoveries, logbooks, local surface locations and chart progress. Modern exported saves import as a separate voyage with their scene, current system, all positions, home planet and exploration history intact. Invalid modern locations are rejected rather than silently resetting the voyage. Ships saved in the old compressed system are safely repositioned beside their nearest legacy planet on first load; this migration runs once. Version 1.7 also scales existing system ship positions tenfold once, retaining the same numerical coordinates and leaving surface/chart positions and exploration history intact. Older `spacebitz:saves` exports can be imported as new universes; old terrain and exact positions do not carry over. Storage is device specific; clearing site data deletes local saves, so export important voyages.

On Android Chrome, use **Install app** from the browser menu or the in-game installation prompt. On iPhone Safari, choose **Share → Add to Home Screen**. The installed progressive web app caches the playable app shell after its first complete online load; the checked-in soundtrack is cached with the app shell; this repository does not ship a native APK or IPA.

GitHub Pages deploys automatically from `main`. For a fork, enable **Settings → Pages → Build and deployment → GitHub Actions**, then run **Deploy SpaceBitz**. HTTPS is required for installation and offline caching outside localhost.

## Development and checks

Run `npm test` (Node's built-in test runner; no package installation required). Run `npm run check:release` and `npm run build` to validate and stage the runtime-only `dist/` bundle. For browser checks, install `playwright@1.58.2` without saving it, run `npx playwright install chromium webkit`, then `npm run test:browser` and `npm run test:pwa` with `BROWSER=chromium` or `BROWSER=webkit`.

The full 68-second MP3 and pixel artwork are checked in; local play needs no generation step. For asset authoring, install `tools/requirements.txt`; `npm run assets:font` builds every original and extension glyph from `tools/pixel_glyphs.py`. `npm run assets:audio` requires ffmpeg and rebuilds the full soundtrack. Generated WAV files and test/build outputs are ignored.

- `model.js`: deterministic generation, physical periods, clock, display scaling.
- `terrain.js` / `celestial.js`: continuous pixel terrain and rotating spherical body textures.
- `motion.js` / `navigation.js` / `sprites.js`: movement, travel, save migration and character/ship art.
- `scale.js`: fixed units, grid snapping and distance formatting.
- `universe.js` / `universe-v2.js`: current stellar science and frozen v1.11 generation.
- `stellar.js` / `substellar.js`: blended stellar activity, atmospheric brown dwarfs and compact-star beams.
- `terminal.js` / `terminal-device.js` / `terminal-history.js`: universal Object Data, keyboard and dashboard/device layout.
- `body-classification.js`: shared planet/dwarf-planet/moon labels and counts.
- `target-ui.js` / `presentation.js`: double-tap confirmation, projected labels and home/chart markers.
- `rendering.js`: bounded screen-space geometry, clipped textures, frame clearing and independent star drift.
- `saves.js` / `voyage-storage.js` / `voyage-database.js`: validated restoration, migration, revision checks and atomic voyage/history storage.
- `flight-state.js`: shared layer resets and persistent station keeping.
- `body-cache.js` / `exploration.js`: cache identity and idempotent sample collection.
- `hud.js`: control placement and ship locators.
- `settings.js` / `audio.js`: validated preferences and native soundtrack lifecycle.
- `flight-drive.js`: drive detents and landscape play guard.
- `voyage-log.js` / `log-device.js`: saved survey snapshots, action history and centered log interaction.
- `interface-fonts.js`: separate Terminal and Log text-size tokens, independent of panel geometry.
- `main.js`: game state, input and canvas scene orchestration.
- `style.css`, `styles-base.css`, `styles-devices.css`, `styles-flight.css`, `styles-terminal.css`: common theme, tabbed Settings and device styling.
- `CHANGELOG.md` and `package.json`: authoritative history and version; `changelog.js`, visible version and worker metadata are generated by `npm run release:sync`.
- `sw.js`: app-shell cache scoped to this app, including every runtime module.
- `assets/`: original pixel lettering and title, rebuilt with `python tools/build-retro-assets.py` (optional development dependency: `fonttools`; no runtime dependency).

Node tests cover deterministic generation, preserved legacy systems, orbital geometry, cache isolation, sample idempotence, storage failure, migration and classification. GitHub Actions runs Chromium and WebKit regressions across desktop and landscape mobile layouts, repeated rotation of the landscape viewport, simulated phone safe areas, terminal/keyboard interactions and rendering stress tests. Warm rendering uses a 50 ms p95 CI budget; adaptive terrain tiles remain at most 96×96 pixels with a 128-entry cache. The unmodified production bundle also exercises native MP3 playback, a deferred service-worker update, cached reload and voyage restoration with the origin server shut down. Chromium additionally enables network-offline emulation; WebKit avoids that flag because of [Playwright's service-worker emulation bug](https://github.com/microsoft/playwright/issues/42775). These checks do not measure a physical phone's GPU, thermal behavior or audio policy.

Reference values: [NASA planetary fact sheets](https://nssdc.gsfc.nasa.gov/planetary/factsheet/). Browser audio behavior: [MDN autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).

Scale references: [NASA Sun facts](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html), [JPL approximate planetary positions](https://ssd.jpl.nasa.gov/planets/approx_pos.html), [JPL satellite mean elements](https://ssd.jpl.nasa.gov/sats/elem/sep.html). Full release history: [CHANGELOG.md](CHANGELOG.md) and **Settings → Change log**.

## Release 1.6 stellar animation and performance

Interstellar star brightness changes gently and independently, respecting Twinkle and Reduce Motion. System surface and flare pixels share a padded texture, generated at six keyframes per second and smoothly blended. Two bounded resolutions, a four-star cache and clipped drawing protect extreme-zoom rendering performance.

The browser gate exercises 1,200 rendered frames across 20 generated systems, checking render time and cache bounds in Chromium and WebKit, in addition to startup, surface launch, save restoration, travel cancellation and extreme zoom checks. This is a repeatable desktop-browser stress check, not evidence of physical-phone thermal or battery performance.

For physical-device validation: play for 15 minutes on iPhone Safari and Android Chrome with FPS enabled, rotate several times, visit multiple worlds, approach a star and zoom through the full range. Compare frame rate at the beginning and end, check device heat and responsiveness, and verify that backgrounding/resuming preserves the voyage. Export a backup before clearing site data.

The game keeps a landscape coordinate space during device rotation. Native orientation locking is attempted where supported; other browsers rotate the game surface without switching to a portrait layout. Settings and the Log fill the viewport, cover the game and keep controls inside screen corners and safe areas. Object categories contain survey data only; travel and landing updates appear under Status Updates. Planet and moon records include the current distance from their host.

Touch terminal input uses the built-in pixel keyboard and does not open the phone keyboard. Physical keyboards can still type and paste. The focused input has a 16px minimum to avoid browser focus zoom; submitted text retains its chosen character size. Play/Continue enters fullscreen and locks landscape on browsers that support those APIs. Installed launches request fullscreen as well. iPhone Safari can still animate its own status bar during rotation; the game cannot disable OS interface rotation.

Version 1.12.23 refines panel motion: the Log returns to its button over 720ms without stretching, and the System Chart unfolds over 640ms. Its thin 28px text-and-arrow band follows concentric top-right screen arcs. The terminal input cursor is half-width and waits for focus and selection to settle before appearing. Reduced motion keeps panel actions immediate.

Version 1.12.24 gives the System Chart tab a flat bottom and only an outer top-right curve, while retaining its thin height. The larger arrow opens a chart that slides out from the tab's bottom edge. Settings and Center on System sit slightly higher. A collapsed terminal now shows the selected target's live distance beside Open Terminal.
