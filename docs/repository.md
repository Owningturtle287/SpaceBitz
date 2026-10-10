# Repository layout

SpaceBitz keeps its runtime source, styles, assets, checks and authoring tools separate. The game still runs as native browser modules without a bundler or a runtime dependency.

The v1.12.28 audit reduced root-level tracked files from **57 to 7**. All 43 game modules and six stylesheets are used. Moving them makes the repository easier to navigate; it does not by itself make the game download smaller or run faster.

## Files kept at the root

| File | Why it stays here |
| --- | --- |
| `index.html` | Default web entry page and asset links |
| `sw.js` | Offline worker must cover the full app from its root scope |
| `manifest.webmanifest` | Install identity, start URL, scope and icon references anchored to the app root |
| `package.json` | Version and standard commands used by npm and deployment |
| `README.md` | GitHub front page, play link and development instructions |
| `CHANGELOG.md` | Authoritative release history used to generate the in-game changelog |
| `.gitignore` | Repository-wide rules for generated files and local dependencies |

## Runtime code

`src/main.js` is the entry module and coordinates the game state, input and scenes. Supporting modules are grouped by responsibility. Their names and exports are preserved; relative imports follow the new locations.

| Folder | Responsibility | Modules |
| --- | --- | --- |
| `src/core/` | Audio lifecycle, settings, viewport, units and safe app updates | [audio.js](../src/core/audio.js), [pwa.js](../src/core/pwa.js), [scale.js](../src/core/scale.js), [settings.js](../src/core/settings.js), [viewport.js](../src/core/viewport.js) |
| `src/flight/` | Motion, navigation, drive detents and flight state | [flight-drive.js](../src/flight/flight-drive.js), [flight-state.js](../src/flight/flight-state.js), [motion.js](../src/flight/motion.js), [navigation.js](../src/flight/navigation.js) |
| `src/universe/` | Generation, physical model, classification, exploration and facts | [body-classification.js](../src/universe/body-classification.js), [exploration.js](../src/universe/exploration.js), [universe-v2.js](../src/universe/legacy/universe-v2.js), [model.js](../src/universe/model.js), [star-info.js](../src/universe/star-info.js), [universe.js](../src/universe/universe.js) |
| `src/rendering/` | Canvas geometry, cache identity, sprites, terrain, textures and weather | [body-cache.js](../src/rendering/body-cache.js), [celestial.js](../src/rendering/celestial.js), [giants.js](../src/rendering/giants.js), [presentation.js](../src/rendering/presentation.js), [rendering.js](../src/rendering/rendering.js), [sprites.js](../src/rendering/sprites.js), [stellar.js](../src/rendering/stellar.js), [substellar.js](../src/rendering/substellar.js), [terrain.js](../src/rendering/terrain.js), [weather.js](../src/rendering/weather.js) |
| `src/ui/` | HUD placement, target actions, fonts, touch buttons and scrollbars | [edge-scrollbar.js](../src/ui/edge-scrollbar.js), [hud.js](../src/ui/hud.js), [interface-fonts.js](../src/ui/interface-fonts.js), [rarity-ui.js](../src/ui/rarity-ui.js), [target-ui.js](../src/ui/target-ui.js), [touch-buttons.js](../src/ui/touch-buttons.js) |
| `src/terminal/` | Object data, message history, keyboard and terminal device | [terminal-device.js](../src/terminal/terminal-device.js), [terminal-history.js](../src/terminal/terminal-history.js), [terminal.js](../src/terminal/terminal.js) |
| `src/journal/` | Survey snapshots, saved action history, Log device and previews | [log-device.js](../src/journal/log-device.js), [log-objects.js](../src/journal/log-objects.js), [log-preview.js](../src/journal/log-preview.js), [voyage-log.js](../src/journal/voyage-log.js) |
| `src/storage/` | Validated restoration, migration and atomic voyage storage | [saves.js](../src/storage/saves.js), [voyage-database.js](../src/storage/voyage-database.js), [voyage-storage.js](../src/storage/voyage-storage.js) |
| `src/generated/` | Generated in-game release history | [changelog.js](../src/generated/changelog.js) |

`src/universe/legacy/universe-v2.js` is intentionally retained. Version 2 voyages use that frozen generator to recreate the same saved universe; deleting it would change or break existing voyages.

## Other folders

| Folder | Contents |
| --- | --- |
| `styles/` | `index.css` imports `base.css`, `devices.css`, `flight.css`, `terminal.css` and `layout.css` in their existing cascade order |
| `assets/` | Checked-in pixel font and title artwork |
| `audio/` | Checked-in complete soundtrack; authoring WAV files are ignored |
| `icons/` | SVG favicon and installable app PNG icons |
| `tests/` | Node unit and integration checks |
| `tests/browser/` | Game and production PWA browser checks |
| `tests/browser/regressions/` | Regression cases for previously shipped behavior, all invoked by the game check |
| `scripts/` | Release synchronization and runtime-only deployment build |
| `tools/` | Font, title, icon and soundtrack authoring; no tool is loaded by the game |
| `docs/` | Astronomy references and this layout guide |
| `.github/workflows/` | Browser validation and GitHub Pages deployment |

## Removed content

The obsolete `scripts/extend-pixel-font.py` was a one-time patcher for missing characters. The supported `tools/build-retro-assets.py` already builds both the original and extension glyphs from `tools/pixel_glyphs.py`, so the extra patcher is unnecessary. No active game module, asset, saved-game compatibility code or regression check was deleted.

## Builds and offline updates

`npm run release:sync` discovers JavaScript recursively in `src/` and CSS recursively in `styles/`, then updates the generated changelog, visible version and worker cache list. `npm run build` stages that complete shell plus the offline worker and soundtrack into `dist/`; tests, tools, documentation and local dependencies are excluded.

The dependency check walks the entire graph from `src/main.js`, verifies every module exists in the offline shell, rejects unused cached modules, and checks stylesheet and font references. Browser checks run against the game and the unmodified `dist/` bundle, including upgrading an installed cache from the previous flat file layout to the new nested layout, deferred updates, and restoring a saved voyage with the origin unavailable.

Run `npm test`, `npm run check:release` and `npm run build` locally. Browser commands remain `npm run test:browser` and `npm run test:pwa`.
