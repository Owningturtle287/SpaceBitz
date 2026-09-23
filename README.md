# SpaceBitz

A small, installable space exploration game. Start in our Solar System or generate a seeded galaxy. Visit planets and moons, collect surface samples, and keep a local logbook.

## Play

Open `index.html` through a local web server, for example `python3 -m http.server 8000`, and visit `http://localhost:8000`. The repository is a static app with no build step or external runtime dependencies.

- Tap a planet or choose it from the system list. **Travel** flies toward it; **Land** becomes available in orbit.
- **Star chart** opens nearby generated systems. Select a star, jump toward it, then enter its system.
- Move with WASD/arrow keys or the phone joystick. Drag to pan; pinch, scroll, or use the zoom buttons. Recenter returns the camera to the ship.
- Explore a surface, collect glowing samples, and return to the lander to launch. The logbook records first landings and samples.
- The game autosaves in this browser every few seconds and on page exit. Save & Main Menu is in Settings. Export your current voyage there for a backup; import it from the start screen. Old `spacebitz:saves` JSON exports can be imported as new universes, but the earlier terrain and exact ship position do not carry over because the simulation has changed. Browser storage is device specific; clearing site data deletes local saves.

## Model and deliberate game scaling

The Sol preset uses approximate real diameters in kilometres, semimajor axes in AU, and sidereal orbital and moon periods in days. Procedural systems choose a stellar mass; their luminosity scales as mass to the 3.5 power, the temperate band scales with the square root of luminosity, and years follow Kepler's third law. The green band is an **irradiance guide**, not a claim that a planet has breathable air or liquid water. Moon orbital periods in procedural systems are gameplay approximations.

Screen distances are log compressed and body radii are visually enlarged for selection. The star is kept larger than its planets, and moons have a minimum tap size. The star chart uses arbitrary travel units. Actual values live in the Details panel. Simulation speed is adjustable in Settings.

## Install on a phone

Host the app on HTTPS (GitHub Pages supports this). Enable **Settings → Pages → Build and deployment → GitHub Actions** on this repository, then run **Actions → Deploy SpaceBitz → Run workflow**. The workflow is already on `main` and will deploy future changes automatically. On Android Chrome, use the browser's **Install app** prompt or menu. On iPhone Safari, use **Share → Add to Home Screen**. After the first successful online load, the app shell works offline; progress is stored locally.

The repository does not ship a native APK or IPA. The installed app is a progressive web app and uses the browser's app shell and storage.

## Development

`model.js` is a pure deterministic orbital generator; `main.js` holds game state, input, canvas rendering and autosave. `style.css` supports small screens and safe areas. `sw.js` precaches the app shell. Run `node --test tests/model.test.js` for the orbital and generation checks.
