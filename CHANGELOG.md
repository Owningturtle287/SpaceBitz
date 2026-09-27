# Changelog

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
