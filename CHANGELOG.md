# Changelog

## 1.7.2 — 2026-09-29

- Replaced the tiny onscreen system ship box with a triangular outline, retaining the SHIP label and offscreen directional arrows.
- Completed journeys now ease into a close-up centered on the ship over 1.3 seconds, including after manual overview zoom during travel. Surface arrival centers on the explorer at maximum zoom; fresh gestures can interrupt the animation.
- System Fit now animates from the exact current camera position and zoom, smoothly combining the zoom-out and pan into the full-system view without snapping to the star first. Reduced-motion mode remains immediate.

## 1.7.1 — 2026-09-29

- Hyperdrive now travels at a fixed 0.5 AU per second between planets and to stars. Local transfers between a planet and its moons, or sibling moons, use Orbit Drive at 0.1 light-seconds per second; the drive stays fixed for the journey.
- Fixed endless engine firing on arrival at a receding planet: arrival and station keeping now engage on the same movement step, before the orbit advances again.
- Manual zoom now overrides the travel camera for the rest of that journey. Panning and System Fit remain usable during travel.
- Restored the tiny onscreen ship marker in system view. Light-blue offscreen arrows now locate the ship in system and interstellar views and the lander on surfaces, replacing the old surface locator label.
- System Fit now eases to the full orbital view over 2.6 seconds, supports interruption, and changes instantly with reduced motion.

## 1.7.0 — 2026-09-28

- Replaced the dropdown Fit System text button with a small orbital-centering icon beside the system chart; its accessible label remains available to assistive technology.
- Made in-game Settings opaque and positioned the compact interaction panel in the bottom-right corner in both orientations.
- Replaced ship locators with a light-blue edge arrow shown only when the ship is offscreen; removed the onscreen marker and text.
- Surface Center now animates to the full 2.4× maximum zoom, retaining the 1.3-second duration and reduced-motion behavior.
- Increased star, planet, moon and orbital geometry by 10× while preserving listed diameters, numerical distances, physical proportions, surface metre scale and ship sprite sizes. Existing system ship positions migrate once to keep the same coordinates.
- Renamed system travel Hyperdrive and set its velocity to 0.25 AU per second, with arrival clamping and stellar avoidance. Manual maneuver speed retains its pre-update physical rate.
- Entering a system now places the ship in station keeping beside the planet with the outermost orbit, including Neptune in Sol. New games still begin on their home planet.

## 1.6.0 — 2026-09-28

- New voyages begin landed beside the ship on their home planet, recorded in the logbook and retained in saves. Sol begins on Earth.
- Modern save imports restore the current system, scene, all positions, home planet, discoveries, log and route as a separate voyage. Malformed locations are rejected; legacy imports retain migration support.
- Manual flight speed no longer depends on zoom. Settings offers Maneuver and Cruise modes plus an optional speed readout.
- Unified traveling feedback, destination distance and a Cancel action across planet, star, surface, waypoint and warp travel. Escape also cancels active travel.
- Added bounded ship locators when the true-scale sprite is tiny or offscreen. Stellar arrival now says Holding, accurately describing its stationary position.
- Custom control placement avoids visible panels, enlarged compact action targets, improved Warp Drive lettering and reduced notification size/duration.
- Interstellar stars gently dim at individual rates. System stars use evolving spherical granulation, small sunspots, warm flare kernels and breathing limb plasma arcs, with bounded caches and reduced-motion support.
- Added save, navigation, placement and animation regression tests and a 1,200-frame multi-system browser stress check. Physical-device thermal/battery testing remains a separate manual check.

## 1.5.3 — 2026-09-28

- Moved the grid toggle exclusively into Settings, preserving its saved value and off-by-default behavior.
- Doubled Center zoom duration to 1.3 seconds and added the same interruptible zoom on planet/moon surfaces; immediate centering and reduced-motion support remain.
- Placed a compact lever-only Warp Drive control beside Center, with its label beneath; hidden on surfaces and still latched right in interstellar view.
- Moved landscape interaction actions into a narrower bottom-right panel.
- Combined date/time, integer coordinates and FPS into one brighter, bold adaptive panel; each field can be toggled in Settings, and the panel disappears when all are hidden.
- Replaced the surface Expedition label/dropdown with the world name and general planet/moon facts. World information dropdowns and dialogs are opaque; other panels retain their translucent styling.
- Enabled travel to system stars, stopping on the near side outside the stellar disk with an appropriate arrival zoom and stable holding position.

## 1.5.2 — 2026-09-28

- Added a saved GRID ON/OFF toggle beside coordinates and in Settings; the grid defaults off while selected squares and waypoint routes remain usable.
- Coordinates now display whole metres, light-seconds or light-years. Celestial diameters always display kilometres; travel-distance conversions are unchanged.
- Warp Drive stays pulled to the right throughout interstellar travel and returns on entering a system.
- Set panel and control backgrounds to 25% opacity while retaining solid labels, icons and joystick thumb. Shifted landscape joystick and warp controls nearer the lower corners.
- Rebuilt the Center reticle and added a smooth, interruptible ship zoom after immediate system-camera centering, respecting reduced motion.
- Corrected sideways walking contact and swing phases, articulated the knees, and replaced sideways front/back boots with centred toe and heel details.

## 1.5.1 — 2026-09-27

- Fixed oversized orbit and zone drawing after the physical-scale update: only visible screen-space arcs, shading, selection rings and dashed routes are submitted to the renderer.
- Cropped enlarged planet and star textures before drawing, explicitly reset each frame to opaque space, and removed the redundant full-screen background texture.
- Fixed WebKit high-DPI startup scaling with its verified software canvas path; other browsers retain accelerated rendering.
- Reduced stellar texture work and reused consecutive animation frames while retaining smooth convection, evolving spots and flares.
- Decoupled background-star drift from ship movement, station keeping, camera panning and zoom. Background stars follow their own paths.
- Redesigned Warp Drive with a red pixel knob, shaded metal base and a pivoting handle that pulls during engagement.
- Added bounded-rendering regression tests and Chromium/WebKit startup, zoom, screen-clearing and warp checks as deployment gates. Existing saves and fixed distance scales are retained.

## 1.5.0 — 2026-09-27

- Reduced menu, panel, joystick and button dimensions; added translucent backgrounds and stepped pixel corners. Moved coordinates beneath the clock using the same visual treatment.
- Replaced Warp Drive's icon with a lever, animated engagement and transit lamp; included reduced-motion behavior and duplicate-activation protection.
- Made the standing astronaut one-third of the parked ship's visible height and adjusted walking cadence for the smaller character.
- Added fixed 1 m surface squares, 1 ls system squares and 1 ly chart squares. Select a square, choose **Go Here**, and arrive at its exact centre. Selected cells, routes, coordinates and distances stay attached to world space while panning/zooming.
- Removed selectable units: surfaces always use m/km, systems use ls/AU with exactly 500 ls per AU, and the chart uses ly. Detail panels now show physical orbital distances and distance from the ship.
- Tripled Sol's visual radius, corrected its mean diameter to 1,391,400 km, and applied a common linear scale to stellar/planetary/moon diameters and orbit distances. Tiny bodies use separate hollow location beacons.
- Added JPL inclination/node terms and matching projected elliptical paths, physical satellite semimajor axes/eccentricities, **Fit System**, **Focus View**, extended zoom, station keeping and accelerated long-distance navigation. Planet positions remain approximate; moon phases and procedural systems remain illustrative.
- Added smoothly blended stellar convection, small evolving spots and occasional flare kernels/loops. Visual activity is artistically accelerated, with spot diameters capped below 28,000 km; reduced motion freezes it.
- Migrated old compressed-space ship positions once, preserving discoveries, logs, surface locations and chart progress. Updated the offline shell for the new modules.

## 1.4.0 — 2026-09-27

### Visual refresh

- Restyled the main menu, universe generator, saved voyages, flight HUD, touch controls, settings, logbook, details and notifications with one 16-bit palette, square pixel frames and beveled controls.
- Added an original, stepped-color SpaceBitz wordmark and a locally bundled pixel display font. Kept longer text and input values in readable monospace type.
- Consolidated the previous layers of UI overrides into a shared responsive stylesheet, including portrait and short landscape layouts, keyboard focus and reduced-motion support.
- Included both new art assets in the updated offline cache.

### Explorer and movement

- Redesigned the astronaut with an ivory helmet, amber visor, coral stripe, antenna and teal life-support backpack.
- Added eight walk poses for each of four facing directions: opposing arm swings, boot lifts, passing poses and body bounce, with a separate neutral idle stance.
- Linked animation cadence to distance traveled, so slower movement also slows the gait.
- Fixed camera scaling for the astronaut and shadow, orbital and interstellar ships, parked lander and surface samples. Zooming out now reduces their apparent size with the world.

Earlier release notes remain available in **Settings → Change log**.
