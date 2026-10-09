// Generated from CHANGELOG.md by npm run release:sync.
export const CHANGELOG=[
  {
    "version": "1.12.24",
    "items": [
      "Removed the chart tab's inner curve and corner tail, retaining its 28px thickness and the screen-fitting top-right outer arc above a straight bottom edge. Enlarged the dropdown arrow.",
      "Made the chart and its scrollbar slide smoothly from behind the tab's bottom edge over 640ms. Raised Settings and Center on System by 4px.",
      "Showed the selected target's live distance beside Open Terminal when collapsed, using the same ship/target positions and scene units as the expanded readout without taking space from the object summary."
    ]
  },
  {
    "version": "1.12.23",
    "items": [
      "Slowed Log closing to 720ms with gentle acceleration, proportional scaling toward its button and a later fade. Repeated close taps preserve the running animation; interrupted opening and reduced motion remain supported.",
      "Slowed the System Chart dropdown to 640ms and removed content stretching. Fitted its 28px text-and-arrow band around the top-right screen corner with concentric inner and outer arcs.",
      "Halved the terminal input cursor width and positioned it before revealing it after focus and pointer selection settle. Kept it aligned during typing, selection, native input scrolling, font changes and terminal resizing.",
      "Added Chromium and WebKit regression checks for curved tab geometry across orientations, animation continuity, cursor position across frames and reduced motion."
    ]
  },
  {
    "version": "1.12.22",
    "items": [
      "Prevented terminal focus from invoking mobile keyboard zoom: touch input uses the pixel keyboard, while physical typing, selection, deletion and paste remain available. Kept the focused field at least 16px without changing terminal history character settings.",
      "Compensated browser visual-viewport scale and offsets in both rendering and pointer input so focus zoom cannot strand the terminal off screen or leave the canvas black. Disabled automatic text inflation during rotation.",
      "Entered fullscreen from Play/Continue gestures and requested landscape locking where supported, with fullscreen installation metadata and the existing landscape fallback for other browsers. Browser and OS status-bar rotation remains outside game control on iPhone Safari.",
      "Replaced the system chart mode labels with a slim place-name tab while retaining its fluid dropdown and accessible touch target.",
      "Made the log shrink smoothly toward its button, clear its background immediately on closing, reveal the dashboard beneath it and handle interrupted animations without jumping."
    ]
  },
  {
    "version": "1.12.21",
    "items": [
      "Narrowed the clock/date panel from its right edge and added current distances from each planet to its host star and each moon to its host planet.",
      "Fixed the missing first travel-trail leg by retaining the departure system before entering a new system.",
      "Kept star, planet and moon log filters exclusive to object surveys; safely reindexed older status events without changing saved voyages or survey data.",
      "Replaced native saved-game deletion prompts with themed, keyboard- and touch-accessible confirmation dialogs.",
      "Made Settings and the Log cover the full viewport with opaque backgrounds, rounded screen-fitting corners and safe-area padding.",
      "Kept rendering, responsive layout and pointer input in one landscape coordinate space, with a rotated fallback when native orientation locking is unavailable. Coalesced viewport changes, handled visual viewport changes, avoided unnecessary canvas resets and restored lost rendering contexts.",
      "Added a fluid system chart opening animation, a dashboard-height Speed Control panel and a larger cyan joystick with concentric dashboard corner geometry."
    ]
  },
  {
    "version": "1.12.20",
    "items": [
      "Place Terminal and System Chart scrollbars on explicit right-edge rails, reserve text space beside them, and support dragging, touch and keyboard scrolling.",
      "Show only a selected star's name and main type in Deep Space. Full Object Data is surveyed inside its system; brief lookups preserve existing full log records.",
      "Fill the screen with the voyage log, keep filters and character settings, and render object/item visuals beside their records using the game's pixel artwork. Preserve visual identities in backups and recover older survey identities.",
      "Make survey expansion a touch-safe button so stars, planets and moons open and close in Deep Space even when Safari omits its compatibility click.",
      "Put time to the left of the date on one row and raise coordinates into a shorter top-left panel."
    ]
  },
  {
    "version": "1.12.19",
    "items": [
      "Store voyages and archived log entries in an atomic database, migrate existing progress without eviction, save history incrementally and prevent stale windows from overwriting newer voyages. Conflicting copies can be exported, reloaded or kept separately.",
      "Accept large valid save exports, retain complete archived history in backups and preserve station keeping across real-time reloads, including older saves.",
      "Pause terminal output during app, orientation and panel interruptions; queue status and typed input behind an unfinished survey instead of skipping its animation.",
      "Page the log, expand survey data on demand, retain reading positions and expanded surveys, apply independent label fonts and remove duplicate event/status recordings.",
      "Enable Instant Travel, honor Travel Trail in Deep Space, clear interrupted canvas gestures and centralize layer transition resets.",
      "Report app-update failures, add a manual update check, fetch fresh shell assets on installation and verify changed game assets through an actual offline update.",
      "Consolidate obsolete and overridden interface styles and verify the fixes in Chromium and WebKit."
    ]
  },
  {
    "version": "1.12.18",
    "items": [
      "Keep newly entered star systems active when a delayed Warp slider event arrives. Speed input now belongs to the layer where its pointer, keyboard or accessibility interaction began, including repeat visits and loaded voyages.",
      "Consume the complete compatibility mouse sequence after a handled touch, even if system entry moves the dashboard or enables another control underneath it. Start the interval after the first render; fresh pointer and keyboard actions remain immediately available.",
      "Verify first entry into three different systems, automatic star travel, repeat entry, late Warp input, Follow/Center and deliberate keyboard/touch speed changes in Chromium and WebKit."
    ]
  },
  {
    "version": "1.12.17",
    "items": [
      "Activate buttons directly on touch release so iPhone/iPad flight actions, terminal, camera controls and menus still work when Safari omits its compatibility click. Consume duplicate clicks, preserve mouse and keyboard input, and keep drags, joystick controls and resize grips separate from taps.",
      "Remove the document-wide rapid-touch cancellation. Canvas gestures and UI buttons already prevent double-tap zoom through their touch-action styles.",
      "Verify Deep Space Follow, Center, Terminal, Settings, Log, star travel and system entry with compatibility clicks deliberately suppressed, then check normal taps activate only once."
    ]
  },
  {
    "version": "1.12.16",
    "items": [
      "Activate the green travel lever for automatic target selections after launching and entering Deep Space. Exercise Follow, Center, travel, log closing and immediate Warp exits through native touch input with the real game loop running.",
      "Enlarge the date/time and coordinate text in a narrower, 180px top-left panel, with date, time and coordinate axes on separate lines.",
      "Center the terminal header controls vertically, reduce the visible white-arrow frames while retaining their touch area, and show Clear Terminal only when the terminal is open."
    ]
  },
  {
    "version": "1.12.15",
    "items": [
      "Keep the Deep Space speed slider fixed at Warp. Ignore stale lower-speed inputs, clear completed warp transitions, and allow rapid touch activation of Center and Follow immediately after exiting a system. Re-enter systems through the green target travel control.",
      "Generate object surveys only with the selected object's terminal open. Pause hidden output, save surveys after their visible output finishes, and follow new output down the screen without rewinding completed records.",
      "Align Clear and Close Terminal to the right of the top border and remove the compact terminal's border label.",
      "Round all Settings and Log menu corners. Remove the log animation's snaking line while retaining its centered growth from the dashboard button.",
      "Add All, Stars, Planets, Moons, Items and Status Updates filters above the log's records, preserving categories through save/import/export and recognizing older surveys.",
      "Place Terminal and System Chart scrollbars at their right borders, with reserved space between their text and the scroll tracks."
    ]
  },
  {
    "version": "1.12.14",
    "items": [
      "Keep Warp selected throughout Deep Space camera actions and layer departure; bound joystick and Follow placement so they cannot overlap the speed slider.",
      "Replace separate object/message sections with a chronological terminal stream of object records, action status and submitted text. Clear Terminal clears only the screen, preserving the saved voyage log. Completed output no longer rewinds to the beginning.",
      "Use a fixed TERMINAL border title and an Object selected summary with the object name and main type when compact. Keep object headers and status messages at a consistent larger character size, independent of device resizing, while retaining the current object-data size.",
      "Add framed, 44-pixel terminal resize grips near the top-left, with touch, pointer capture and keyboard sizing. Place Clear Terminal beside Close Terminal and move the full-size object focus control between Cancel and the green travel lever.",
      "Organize Settings into Audio & sky, Clock, View, Controls, Terminal, Log and Voyage tabs. Add independent data, label, header, status and input character sizes plus master text-size controls.",
      "Save object surveys and action status in the voyage log. Object surveys expand on demand and retain the latest record per object across save, export and import.",
      "Open the green terminal-styled log along a branching connection from its dashboard button to a centered, adjustable panel. The log closes the terminal and system chart, keeps dashboard buttons stationary during its animation, pauses flight and respects reduced motion. Log sizing and text styles have their own settings."
    ]
  },
  {
    "version": "1.12.13",
    "items": [
      "Action notifications and submitted terminal text share a bounded plain-text terminal history instead of a floating toast. Menu actions use the same terminal-style console.",
      "Object Data headings include the selected name. Body radius fields are removed; orbital periods explicitly use Earth days, and rotations use Earth days/hours/minutes, retaining fractional-minute precision for compact stars.",
      "Landscape-only play replaces portrait controls and orientation preferences. Turning the device upright pauses gameplay behind a rotate prompt.",
      "A blue/yellow/purple tapered three-position flight slider replaces the Warp Drive lever. Orbit and Hyperspace control manual system flight; automatic transfers retain their own drive selection. Deep Space always uses Warp Drive.",
      "The terminal scrollbar sits near the right rim, resize handles move to the upper-left corner, and Cancel is centered above the green travel lever. The date/coordinate and system-chart panels follow the upper screen corners; Settings sits beside the date/coordinates.",
      "Browser coverage now checks the current landscape flight deck, terminal history/input, drive transitions, resized device contours and rotation guard."
    ]
  },
  {
    "version": "1.12.12",
    "items": [
      "Voyage storage never evicts older saves. Failed saves keep the session open, corrupt stored records are protected, and imports/restoration validate dates and coordinates before use.",
      "Planet, terrain, weather and ring caches distinguish different voyages with matching seeded IDs. Adaptive surface tiles retain a bounded working set at wide viewport sizes; cached rock/vegetation placements avoid resampling unchanged scenery every frame.",
      "Surface samples can be collected only once. Legacy barren-system saves migrate safely, and focused terminal header buttons no longer block keyboard flight.",
      "Dwarf planets have an explicit classification and separate terminal/chart counts. Pluto is identified consistently; Charon and other satellites remain moons. The model does not infer dwarf status from diameter alone.",
      "Service-worker updates wait until Save & Main Menu. Audio respects visibility, the checked-in full soundtrack is available in local development, and updates preserve active gameplay.",
      "Separated terminal/dashboard, music, storage and release controllers; removed obsolete UI and duplicate CSS declarations. Release metadata and offline assets are checked automatically.",
      "Deployment publishes only runtime assets. Added storage, migration, classification, cache, native audio and offline/update regressions alongside Chromium/WebKit and mobile layout checks."
    ]
  },
  {
    "version": "1.12.11",
    "items": [
      "The joystick casing fills its dashboard row up to the upper rim, with its lower curve and highlights contained inside the bottom border.",
      "The fully opened terminal keeps its compact lower-right contour. Keyboard and Backspace controls clear the curve while text remains above the phone home indicator."
    ]
  },
  {
    "version": "1.12.10",
    "items": [
      "The joystick sits lower against the dashboard corner, with concentric curves instead of a gap above the phone inset.",
      "The compact terminal casing extends down and right to follow the dashboard rim. Its text and neighboring controls remain above the phone home indicator; the expanded terminal keeps its normal layout."
    ]
  },
  {
    "version": "1.12.9",
    "items": [
      "A shorter 68px flight deck centers its instruments vertically, with a wider corner-fitted joystick and a full-size labeled Follow button. Narrow screens wrap full-size controls into two rows.",
      "Terminal and Log sit slightly inward from the screen edge; the compact device follows the lower corner curve. Travel and Cancel slide straight horizontally when the terminal expands.",
      "Follow returns smoothly two seconds after the last pan, preserving zoom. Custom device sizes and saved voyages remain compatible."
    ]
  },
  {
    "version": "1.12.8",
    "items": [
      "A smaller default flight deck and larger rounded lower corners fit phone screens. The compact terminal sits flush with the dashboard rim, closer to the landscape right edge.",
      "Travel and Cancel slide above the compact terminal and beside its expanded screen. A smaller green pixel lever moves forward/backward; object names remain beside objects.",
      "Planet and moon surface coordinates now require two taps, like space coordinates. New Universe starts with an empty name field; custom dashboard sizes and voyage data are preserved."
    ]
  },
  {
    "version": "1.12.7",
    "items": [
      "Warp Drive and Log keep their left-to-right order while sliding beside the terminal, with larger flight controls and a lower dock near the right edge.",
      "Dashboard height and terminal width/height scaling are saved in Settings. Dashboard and terminal resize arrows are independently opt-in and hidden by default.",
      "Rounded lower dashboard corners respect phone safe areas. Date/time moves left; the system chart and its left-side Fit control move right beside Settings. Opening the chart or terminal closes the other."
    ]
  },
  {
    "version": "1.12.6",
    "items": [
      "Lowered flight controls into one transparent dashboard with a stepped metal rim; portrait controls remain inside a compact second row.",
      "A narrow terminal opens at its minimum width beside the screen edge. Larger Terminal/Log launchers swap corners; Log slides beside Warp Drive when a terminal is visible.",
      "Empty space coordinates require a double tap and use an unfilled frame. Object picking, surface taps, Follow, keyboard input and saved voyages remain compatible."
    ]
  },
  {
    "version": "1.3.6",
    "items": [
      "Replaced the old Chart control with a dedicated retro Warp Drive button in the bottom-right for entering the interstellar layer.",
      "Moved the voyage Log directly under Settings and restyled both as a compact upper-right utility stack.",
      "Moved Center beside the joystick and added Right, Above, Custom drag and Hidden placement options in Settings.",
      "Custom Center placement can be dragged anywhere in the game view and is saved locally for future sessions."
    ]
  },
  {
    "version": "1.3.5",
    "items": [
      "Moved the soundtrack startup attempt to the earliest main-menu initialization and enabled native autoplay; the two-second lead-in remains baked into the track.",
      "Removed the off-center teal nebula/backlight from the game background for a clean black starfield.",
      "Moved the system chart into the top-left header, removed the SpaceBitz in-game brand and bottom system-status strip, and simplified the travel card to name, action and Info.",
      "Restyled the bottom navigation controls and Settings button with a more cohesive pixel-space interface."
    ]
  },
  {
    "version": "1.3.4",
    "items": [
      "Replaced the corrupted/truncated repository MP3 with a soundtrack generated fresh during every Pages deployment.",
      "The deployment now verifies soundtrack size and duration before publishing, preventing an incomplete audio file from going live.",
      "Removed JavaScript song timers and ended-event playlist scheduling; the intro now uses one native looping audio element with its two-second lead-in baked into the file.",
      "Mobile browsers that block audible autoplay still require the first user interaction; that browser restriction cannot be bypassed reliably."
    ]
  },
  {
    "version": "1.3.3",
    "items": [
      "Rebuilt music playback from scratch around one persistent HTML audio element instead of the previous soundtrack player class.",
      "Removed music from the service-worker cache and bypassed all audio/range requests so mobile browsers can stream the track normally.",
      "Music now has only one lifecycle: wait two seconds at the menu, play the full track, wait two seconds after it ends, then advance to the next playlist entry.",
      "No game scene, panel, planet selection, visibility change or normal control can pause, restart or reschedule the song."
    ]
  },
  {
    "version": "1.3.2",
    "items": [
      "Removed gesture-driven audio priming and visibility pause/resume behavior that could make the soundtrack repeatedly stop and restart on mobile.",
      "Music now uses one timer, one audio element and one ended event: wait two seconds, play once, wait two seconds, repeat.",
      "If browser autoplay is blocked, only one temporary user-gesture listener is installed and removed immediately after playback succeeds."
    ]
  },
  {
    "version": "1.3.1",
    "items": [
      "Simplified music playback to one continuous playlist lifecycle: two-second startup delay, full song playback, two-second gap, then the next song.",
      "The intro song now begins from the main menu and is no longer restarted by entering a universe, changing scenes, selecting worlds or returning to the menu.",
      "Removed native audio looping; repeats are now driven only by the track-ended event so every repeat gets the intended two-second pause.",
      "Added a browser autoplay unlock fallback while keeping one audio element and one playback state."
    ]
  },
  {
    "version": "1.3.0",
    "items": [
      "Added the separately designed soft-synth soundtrack as the game’s single looping music file, controlled by the existing music and volume settings.",
      "Converted the system navigator into a collapsed dropdown that stays in the upper-left and away from the touch joystick.",
      "Removed the on-screen zoom control panel while preserving pinch, wheel and keyboard zoom.",
      "Planet and moon names now appear in the orbital view only when selected; the system star can remain labeled by default."
    ]
  },
  {
    "version": "1.2.9",
    "items": [
      "Removed the soundtrack playback engine and all music startup, scheduling, resume and visibility hooks.",
      "Removed the music module and music-specific tests so no legacy or replacement melody can play anywhere in the game.",
      "Kept the existing music and volume Settings controls as inactive placeholders for a future separately designed soundtrack."
    ]
  },
  {
    "version": "1.2.8",
    "items": [
      "Rebuilt the soundtrack from the original uploaded melody reference at its native 0.60-second note timing, preserving the tune while removing recorded noise/static.",
      "Replaced overlapping per-note oscillators with one continuous melody oscillator so a second copy of the song cannot layer underneath the first.",
      "Added a warmer harmonic tone, cleaner note separation, gentle low-pass filtering and compression for higher perceived volume without clipping."
    ]
  },
  {
    "version": "1.2.7",
    "items": [
      "Redesigned the orbital HUD into a slimmer system navigator and compact target card so more of the system remains visible.",
      "Condensed planet and moon rows, target metrics, labels and actions while preserving the same navigation and detail controls.",
      "Improved portrait and landscape phone layouts so the target card, joystick and system rail occupy less of the play field."
    ]
  },
  {
    "version": "1.2.6",
    "items": [
      "Hardened soundtrack playback so every voyage restart cancels all existing schedulers and active voices before one delayed copy starts.",
      "Set travelable star rarity to 50% red, 20% orange, 20% yellow, 9% white and 1% blue while keeping chart/system colors identical.",
      "Upgraded interstellar stars with smoother colored halos, bright cores and subtle non-crosshair shimmer.",
      "Added a landscape-first rotating phone layout plus Auto, Landscape and Portrait orientation preferences."
    ]
  },
  {
    "version": "1.2.5",
    "items": [
      "Reworked soundtrack startup so each voyage begins the melody once from note one after a two-second delay, with no action-driven duplicate starts.",
      "Weighted travelable star colors toward real stellar rarity: red dwarfs dominate, orange/yellow stars are less common, white stars are uncommon and blue stars are rare.",
      "Made each travelable star use the exact same deterministic spectral color in the interstellar chart and its system view."
    ]
  },
  {
    "version": "1.2.4",
    "items": [
      "Removed crosshair flares from stars in both system and interstellar views.",
      "Compacted Settings, added miles/AU display choices, improved visual defaults, preferred time zones and accelerated/real-time clock modes.",
      "New voyages now begin at the current real date/time; Sol uses a date-driven low-precision Kepler ephemeris and real sidereal spin rates.",
      "Replaced oversized stellar dark regions with small procedural sunspots that slowly emerge and fade.",
      "Improved soundtrack startup retries while retaining first-interaction fallback for browsers that enforce autoplay restrictions."
    ]
  },
  {
    "version": "1.2.3",
    "items": [
      "Refined the SpaceBitz title with cleaner pixel-space detailing, removed the vertical side rails and restyled the version label without a border.",
      "Sped up only the main-menu fly-through starfield while leaving in-game background-star speed unchanged.",
      "Disabled native double-tap page zoom while preserving the game canvas pinch zoom.",
      "Improved close-planet rendering performance with cheaper large-body halos, better texture-frame cache reuse, zoom-aware orbit rendering and aggressive off-screen stellar-glow culling."
    ]
  },
  {
    "version": "1.2.2",
    "items": [
      "Redesigned the SpaceBitz wordmark with sharper pixel-space detailing, more breathing room above the menu buttons and a clear version badge.",
      "Simplified the universe creation screen by removing redundant descriptive, status, version and device text.",
      "Changed menu and in-game background stars to a fresh procedural sky each session while preserving the same sky during that session.",
      "Expanded star colors into more saturated red, yellow, orange, white and blue families."
    ]
  },
  {
    "version": "1.2.1",
    "items": [
      "Streamlined the main menu by removing the extra explorer tagline, subtitle, descriptive copy and footer status text.",
      "Raised the SpaceBitz title, removed menu button numbers and centered the Start Game, Multiplayer and Settings labels."
    ]
  },
  {
    "version": "1.2",
    "items": [
      "Introduced the two-stage retro main menu with Start Game, Multiplayer placeholder and Settings.",
      "Opened the menu layout so more of the starfield remains visible and shifted outer space toward near-black.",
      "Made menu and in-game starfields faster with stronger depth, quicker brightness-only twinkle and richer retro pixel-art square, circle and diamond star sprites.",
      "Music now defaults on for new players, with audio controls kept inside Settings."
    ]
  },
  {
    "version": "1.1",
    "items": [
      "Restored the original soundtrack and expanded sound, sky, display and control settings.",
      "Refined the retro moving sky, simulation clock, celestial scale, terrain rendering and character sprites.",
      "Improved responsive/mobile navigation, stellar details and orbital/deployment checks."
    ]
  },
  {
    "version": "1.0",
    "items": [
      "Launched the responsive, installable SpaceBitz Field Edition.",
      "Added procedural star systems, orbiting worlds, exploration, landing, star-chart travel and local save support.",
      "Established the core flight HUD, logbook, touch/keyboard controls and offline app shell."
    ]
  },
  {
    "version": "1.12.5",
    "items": [
      "Moving target labels and action strips track without repeated CSS easing, retaining their placement until an obstruction requires a change.",
      "Follow persists through zoom. Panning temporarily inspects the scene; five seconds after the last drag, the view smoothly returns at the current zoom. Explicitly switching Follow off freezes the camera.",
      "Follow is half the Center control size and sits beside it. Warp Drive rests to the left of the terminal, gliding horizontally with its width.",
      "Textured pixel-metal flight deck plates and square bolts frame the lower controls and block accidental coordinate picks.",
      "Pixel typography throughout menus, telemetry, logs and terminal data, including custom glyphs for symbol keys, navigation arrows and scientific units; white arrow handles resize the expanded terminal by sliding.",
      "Immediate keyboard press response and held-key repeat, separate Caps Lock and symbol Shift, slash, Enter, a blinking input cursor, and Delete at the input bar's right edge. Drafts remain available for future commands."
    ]
  },
  {
    "version": "1.12.4",
    "items": [
      "Completing the second Center zoom enables ship/explorer following, including orbital station keeping. A small pixel tracking toggle below Center enables following at the current zoom or stops it; camera gestures stop following. Center and Warp retain their positions.",
      "Target action, green arrow and red X begin immediately and glide upward over 0.55 seconds, with immediate reduced-motion controls.",
      "Narrowed the collapsed terminal to 280px while retaining the expanded two-column screen. Added a thin stepped metallic casing and metallic header.",
      "Renamed Open Terminal / Close Terminal. Added a terminal launcher to the left of Log, including access without selecting a target. Both utilities follow the device edge.",
      "Added a fixed input deck and pixel keyboard with rapid touchscreen typing and physical-keyboard support, shift, deletion, selection replacement, space, clear and done. Text drafts remain when opening/closing; command execution is reserved for a later release. Readable 16px input prevents focus zoom.",
      "Preserved generation, saves, physical station keeping and rendering limits; updated cache/version/docs and Chromium/WebKit mobile regressions."
    ]
  },
  {
    "version": "1.12.3",
    "items": [
      "Replaced home outlines with small, solid green pixel house icons above the visible objects. Their fixed screen size stays small at every zoom; the home star remains marked only in Deep Space and the home planet in system view.",
      "Removed automatic camera following and zoom changes during manual movement, routes and arrival. Station keeping, travel speeds and collision avoidance are preserved.",
      "Center now smoothly pans to the ship/explorer at the current zoom over 1.3 seconds. After centering completes, another press smoothly zooms in. Center preserves an active route; camera gestures interrupt it and reset the two-step action. Reduced motion performs each step immediately.",
      "Removed the half-second selection delay. Transparent pixel action/X panels begin their smooth reveal at the same time as the name.",
      "Updated cache/version/docs and Chromium/WebKit regressions for unchanged travel views, two-step Center, route continuity, immediate actions and solid home icons."
    ]
  },
  {
    "version": "1.12.2",
    "items": [
      "Balanced the doorless home outline proportions while keeping the star/planet visible. The home-star marker now appears only in Deep Space; the home-world marker remains in system view.",
      "Narrowed the two-column Object Data terminal, compacted its header and reduced the distance font. Target selection smoothly reveals the terminal upward; Log rests at bottom-right when closed and follows above its top-right edge when open.",
      "Finished typing smoothly returns records to the beginning. Wheel, touch, pointer or keyboard interaction cancels that automatic scroll. Reduced motion reveals the terminal and complete record immediately.",
      "Added stepped pixel outlines without changing transparent target panel content boxes. Replaced glyphs with pixel red X/green arrow artwork; the arrow continuously follows the ship-to-target travel direction.",
      "Preserved saves, generation and bounded rendering; extended Chromium/WebKit coverage for transitions, terminal rewind, home-marker layers and coordinate heading."
    ]
  },
  {
    "version": "1.12.1",
    "items": [
      "Prevented mobile input-focus zoom with readable 16px text controls, preserving browser page zoom. Camera pans now remain where placed until ship movement, travel or Center.",
      "Added a faint temperature-dependent system-view glow to brown dwarfs. Doorless green home outlines frame the actual star/planet without covering its body or adding an interior roof line.",
      "Expanded the fixed generation workstation; rarity names wrap, all decimal values remain visible, and scientific/custom pages fit available height instead of a fixed five-row limit. Saved voyages retain independent scrolling.",
      "Docked the opaque Object Data terminal at the bottom, opening upward into a wider two-column record. Smaller Settings and Log controls; Log follows above the terminal’s top-right corner.",
      "Replaced bulky projected actions with transparent framed names and a compact action/red × strip that slides up after 0.5 seconds. Coordinate squares use a green arrow/red ×; interstellar Jump is now Warp Drive.",
      "Removed the floating Deep Space/light-years heading. Preserved generated systems, save geometry, science, bounded rendering and reduced-motion behavior; extended Chromium/WebKit regressions."
    ]
  },
  {
    "version": "1.12.0",
    "items": [
      "Rebalanced Scientific Mode to the planned stellar-family census: 20% brown dwarfs, 5% white dwarfs and 0.1% neutron stars, with genuinely rare massive main-sequence and short-lived evolved stars. Pulsars/magnetars are conditional active neutron-star subtypes, with documented uncertain population estimates.",
      "Linked brown-dwarf cooling, L/T/Y chemistry, radius and luminosity; added burgundy atmospheric bands, turbulent clouds and dim cooler subclasses. Added spin-linked blue pulsar beams/loops, irregular magnetar bursts, accreting young-star disks/jets and post-AGB envelopes.",
      "Scaled stellar convection, spot groups and limb plasma to stellar radius, rotation and magnetic activity. Quiet stars retain quiet intervals; giants evolve large cells. Pixel textures, interpolation, caches and effects remain bounded and respect reduced motion.",
      "Moved Scientific Mode and customization into a fixed two-column New Universe screen. Scientific tables are inspectable and locked; independent numerical custom tables must each total exactly 100%. Saved voyages scroll inside their own column, including stacked portrait layouts.",
      "Replaced all object fact dialogs with an opaque universal green retro terminal: header Focus View/Info, incremental typing, cursor, scrolling and immediate reduced-motion output. Stars, planets, moons, coordinates and surface targets share the framework; logs remain opaque.",
      "Moved travel/interaction actions and Cancel beside projected targets, with smooth movement, viewport bounds and HUD avoidance. Renamed the interstellar layer Deep Space and replaced persistent home labels with small green house outlines. Home status never boosts stellar diameter.",
      "Made System Fit and minimum zoom depend on the entire hierarchy and orbital envelope. Very wide binaries/triples/quadruples remain frameable. Set the system spacecraft to 1 km with unchanged artwork, locator support and enough close-up zoom to inspect its detail.",
      "Froze v1.11 generation for existing voyages; retained older identities, orbital geometry, home, positions, routes and discoveries. New rules apply to new v3 voyages. Major planet/moon realism remains deferred.",
      "Updated offline cache, visible/package version, scientific documentation and Chromium/WebKit regression gates, including mobile viewport layouts and rendering stress coverage."
    ]
  },
  {
    "version": "1.11.0",
    "items": [
      "Added deterministic, physically linked stellar families from main sequence through giants and compact remnants; black holes and quasars remain excluded.",
      "Added default Scientific Mode and a new-universe percentage-text editor. Each independent table must total exactly 100%; invalid inputs cannot be applied. Speculative candidates are custom-only and explicitly labeled.",
      "Added moving detached binary/triple/quadruple hierarchies, companion selection/travel, S-type and P-type planetary placement with conservative stability/envelope margins, and safe entry into barren systems.",
      "Added temperature-based star colors, family-specific pixel surfaces/activity, wind envelopes, pulsation and compact-remnant motifs; interstellar color/brightness/multiplicity cues match.",
      "Made info/log panels opaque; removed atlas/origin boilerplate; added header Focus View/telemetry, centered stellar family, expandable facts and Sol comparisons, temperature, gravity, age, uncertain stellar-end estimates, metallicity, radiation, winds and habitable-zone radii/diameters.",
      "Stored generation settings per voyage and validated them on import. Legacy voyages retain original generated geography. Planet/moon artwork and detailed environmental adaptations are planned for a later release.",
      "Documented science sources, agreed encounter weights, approximate models and scientific limitations in `docs/stars.md`."
    ]
  },
  {
    "version": "1.10.0",
    "items": [
      "Gas and ice giants now have animated winds: cloud belts flow in opposing directions, filaments shift and local vortices swirl independently of planetary rotation.",
      "Jupiter has a persistent red-orange Great Red Spot with a darker heart and breathing oval shape, alongside Oval BA and a string of pale ovals.",
      "Saturn has northern white-storm outbreaks with cloud tails and a corrected north-pole hexagon. Uranus gets bright cloud outbreaks; Neptune has evolving dark vortices and bright companion clouds.",
      "Generated giants receive deterministic jet widths, wind directions, storm populations, hemisphere-aware vortex spin and occasional long-lived giant storms. Scientific inspirations and artistic probabilities are documented.",
      "Weather renews smoothly to prevent stretched cloud textures, uses bounded low-resolution interpolated frames, respects Reduce motion and is included in offline caching. Weather timing is accelerated for visibility; physical sizes, orbits and existing voyage identities stay unchanged."
    ]
  },
  {
    "version": "1.9.0",
    "items": [
      "Rebuilt giant planets with pixel cloud belts, turbulent whirls, feathered oval storms and improved palettes. Jupiter's rectangular mark is gone; Uranus and Neptune use researched blue-green colors.",
      "Replaced broad placeholder rings with layered pixel bands, gaps, front/back occlusion and shadows, using measured Sol ring radii. Jupiter now has faint dust rings; Saturn retains its broad icy rings, with narrow Uranus/Neptune rings.",
      "Generated giants now use deterministic temperature/cloud-based appearances, including Sol-like clouds, pale water clouds and methane haze. Appearance and ring rarity weights are documented game choices; world identities and orbital geometry remain save-compatible.",
      "Added Tethys, Dione, Rhea and Iapetus to Saturn, and Ariel, Umbriel, Titania and Oberon to Uranus, with sourced diameters, orbital distances/periods and projected mean orbital planes.",
      "Added landable dwarf planet Pluto and Charon, with an inclined eccentric mean orbit, synchronous retrograde spins and motion around their shared barycenter. System Fit includes Pluto; entering Sol still arrives beside Neptune.",
      "World information now includes cloud families, ring extent, eccentricity and inclination, and distinguishes explorable moons and dwarf planets. Bounded textures/caches and browser stress coverage protect extreme-zoom rendering."
    ]
  },
  {
    "version": "1.8.1",
    "items": [
      "Made the tiny system ship locator a narrow isosceles triangle with a longer forward tip, still aligned with the ship heading and shown only below four pixels.",
      "System travel now centers the camera on the ship at departure and tracks its integrated position every frame, preventing distant Hyperdrive approaches from leaving the viewport as zoom increases.",
      "System arrival zoom now stays centered on the ship throughout the close-up instead of panning from a lagging camera position."
    ]
  },
  {
    "version": "1.8.0",
    "items": [
      "The tiny system ship triangle now rotates with the ship’s heading while its label stays upright, and appears only below a four-pixel ship size.",
      "Rebuilt system stars as animated pixel surfaces with stronger circulating convection, evolving bright granules and dark channels, and irregular sunspot groups that emerge, grow and fade.",
      "Replaced thin vector flare loops with broad, curling pixel plasma extrusions that share the star’s palette and blend into its limb. Larger eruptions grow and subside between quiet intervals.",
      "Kept stellar rendering bounded with two texture resolutions, six interpolated keyframes per second, four cached stars and cropped drawing at extreme zoom. Reduced-motion stars remain still; physical sizes and travel behavior are unchanged."
    ]
  },
  {
    "version": "1.7.2",
    "items": [
      "Replaced the tiny onscreen system ship box with a triangular outline, retaining the SHIP label and offscreen directional arrows.",
      "Completed journeys now ease into a close-up centered on the ship over 1.3 seconds, including after manual overview zoom during travel. Surface arrival centers on the explorer at maximum zoom; fresh gestures can interrupt the animation.",
      "System Fit now animates from the exact current camera position and zoom, smoothly combining the zoom-out and pan into the full-system view without snapping to the star first. Reduced-motion mode remains immediate."
    ]
  },
  {
    "version": "1.7.1",
    "items": [
      "Hyperdrive now travels at a fixed 0.5 AU per second between planets and to stars. Local transfers between a planet and its moons, or sibling moons, use Orbit Drive at 0.1 light-seconds per second; the drive stays fixed for the journey.",
      "Fixed endless engine firing on arrival at a receding planet: arrival and station keeping now engage on the same movement step, before the orbit advances again.",
      "Manual zoom now overrides the travel camera for the rest of that journey. Panning and System Fit remain usable during travel.",
      "Restored the tiny onscreen ship marker in system view. Light-blue offscreen arrows now locate the ship in system and interstellar views and the lander on surfaces, replacing the old surface locator label.",
      "System Fit now eases to the full orbital view over 2.6 seconds, supports interruption, and changes instantly with reduced motion."
    ]
  },
  {
    "version": "1.7.0",
    "items": [
      "Replaced the dropdown Fit System text button with a small orbital-centering icon beside the system chart; its accessible label remains available to assistive technology.",
      "Made in-game Settings opaque and positioned the compact interaction panel in the bottom-right corner in both orientations.",
      "Replaced ship locators with a light-blue edge arrow shown only when the ship is offscreen; removed the onscreen marker and text.",
      "Surface Center now animates to the full 2.4× maximum zoom, retaining the 1.3-second duration and reduced-motion behavior.",
      "Increased star, planet, moon and orbital geometry by 10× while preserving listed diameters, numerical distances, physical proportions, surface metre scale and ship sprite sizes. Existing system ship positions migrate once to keep the same coordinates.",
      "Renamed system travel Hyperdrive and set its velocity to 0.25 AU per second, with arrival clamping and stellar avoidance. Manual maneuver speed retains its pre-update physical rate.",
      "Entering a system now places the ship in station keeping beside the planet with the outermost orbit, including Neptune in Sol. New games still begin on their home planet."
    ]
  },
  {
    "version": "1.6.0",
    "items": [
      "New voyages begin landed beside the ship on their home planet, recorded in the logbook and retained in saves. Sol begins on Earth.",
      "Modern save imports restore the current system, scene, all positions, home planet, discoveries, log and route as a separate voyage. Malformed locations are rejected; legacy imports retain migration support.",
      "Manual flight speed no longer depends on zoom. Settings offers Maneuver and Cruise modes plus an optional speed readout.",
      "Unified traveling feedback, destination distance and a Cancel action across planet, star, surface, waypoint and warp travel. Escape also cancels active travel.",
      "Added bounded ship locators when the true-scale sprite is tiny or offscreen. Stellar arrival now says Holding, accurately describing its stationary position.",
      "Custom control placement avoids visible panels, enlarged compact action targets, improved Warp Drive lettering and reduced notification size/duration.",
      "Interstellar stars gently dim at individual rates. System stars use evolving spherical granulation, small sunspots, warm flare kernels and breathing limb plasma arcs, with bounded caches and reduced-motion support.",
      "Added save, navigation, placement and animation regression tests and a 1,200-frame multi-system browser stress check. Physical-device thermal/battery testing remains a separate manual check."
    ]
  },
  {
    "version": "1.5.3",
    "items": [
      "Moved the grid toggle exclusively into Settings, preserving its saved value and off-by-default behavior.",
      "Doubled Center zoom duration to 1.3 seconds and added the same interruptible zoom on planet/moon surfaces; immediate centering and reduced-motion support remain.",
      "Placed a compact lever-only Warp Drive control beside Center, with its label beneath; hidden on surfaces and still latched right in interstellar view.",
      "Moved landscape interaction actions into a narrower bottom-right panel.",
      "Combined date/time, integer coordinates and FPS into one brighter, bold adaptive panel; each field can be toggled in Settings, and the panel disappears when all are hidden.",
      "Replaced the surface Expedition label/dropdown with the world name and general planet/moon facts. World information dropdowns and dialogs are opaque; other panels retain their translucent styling.",
      "Enabled travel to system stars, stopping on the near side outside the stellar disk with an appropriate arrival zoom and stable holding position."
    ]
  },
  {
    "version": "1.5.2",
    "items": [
      "Added a saved GRID ON/OFF toggle beside coordinates and in Settings; the grid defaults off while selected squares and waypoint routes remain usable.",
      "Coordinates now display whole metres, light-seconds or light-years. Celestial diameters always display kilometres; travel-distance conversions are unchanged.",
      "Warp Drive stays pulled to the right throughout interstellar travel and returns on entering a system.",
      "Set panel and control backgrounds to 25% opacity while retaining solid labels, icons and joystick thumb. Shifted landscape joystick and warp controls nearer the lower corners.",
      "Rebuilt the Center reticle and added a smooth, interruptible ship zoom after immediate system-camera centering, respecting reduced motion.",
      "Corrected sideways walking contact and swing phases, articulated the knees, and replaced sideways front/back boots with centred toe and heel details."
    ]
  },
  {
    "version": "1.5.1",
    "items": [
      "Fixed oversized orbit and zone drawing after the physical-scale update: only visible screen-space arcs, shading, selection rings and dashed routes are submitted to the renderer.",
      "Cropped enlarged planet and star textures before drawing, explicitly reset each frame to opaque space, and removed the redundant full-screen background texture.",
      "Fixed WebKit high-DPI startup scaling with its verified software canvas path; other browsers retain accelerated rendering.",
      "Reduced stellar texture work and reused consecutive animation frames while retaining smooth convection, evolving spots and flares.",
      "Decoupled background-star drift from ship movement, station keeping, camera panning and zoom. Background stars follow their own paths.",
      "Redesigned Warp Drive with a red pixel knob, shaded metal base and a pivoting handle that pulls during engagement.",
      "Added bounded-rendering regression tests and Chromium/WebKit startup, zoom, screen-clearing and warp checks as deployment gates. Existing saves and fixed distance scales are retained."
    ]
  },
  {
    "version": "1.5.0",
    "items": [
      "Reduced menu, panel, joystick and button dimensions; added translucent backgrounds and stepped pixel corners. Moved coordinates beneath the clock using the same visual treatment.",
      "Replaced Warp Drive's icon with a lever, animated engagement and transit lamp; included reduced-motion behavior and duplicate-activation protection.",
      "Made the standing astronaut one-third of the parked ship's visible height and adjusted walking cadence for the smaller character.",
      "Added fixed 1 m surface squares, 1 ls system squares and 1 ly chart squares. Select a square, choose **Go Here**, and arrive at its exact centre. Selected cells, routes, coordinates and distances stay attached to world space while panning/zooming.",
      "Removed selectable units: surfaces always use m/km, systems use ls/AU with exactly 500 ls per AU, and the chart uses ly. Detail panels now show physical orbital distances and distance from the ship.",
      "Tripled Sol's visual radius, corrected its mean diameter to 1,391,400 km, and applied a common linear scale to stellar/planetary/moon diameters and orbit distances. Tiny bodies use separate hollow location beacons.",
      "Added JPL inclination/node terms and matching projected elliptical paths, physical satellite semimajor axes/eccentricities, **Fit System**, **Focus View**, extended zoom, station keeping and accelerated long-distance navigation. Planet positions remain approximate; moon phases and procedural systems remain illustrative.",
      "Added smoothly blended stellar convection, small evolving spots and occasional flare kernels/loops. Visual activity is artistically accelerated, with spot diameters capped below 28,000 km; reduced motion freezes it.",
      "Migrated old compressed-space ship positions once, preserving discoveries, logs, surface locations and chart progress. Updated the offline shell for the new modules."
    ]
  },
  {
    "version": "1.4.0",
    "items": [
      "Restyled the main menu, universe generator, saved voyages, flight HUD, touch controls, settings, logbook, details and notifications with one 16-bit palette, square pixel frames and beveled controls.",
      "Added an original, stepped-color SpaceBitz wordmark and a locally bundled pixel display font. Kept longer text and input values in readable monospace type.",
      "Consolidated the previous layers of UI overrides into a shared responsive stylesheet, including portrait and short landscape layouts, keyboard focus and reduced-motion support.",
      "Included both new art assets in the updated offline cache.",
      "Redesigned the astronaut with an ivory helmet, amber visor, coral stripe, antenna and teal life-support backpack.",
      "Added eight walk poses for each of four facing directions: opposing arm swings, boot lifts, passing poses and body bounce, with a separate neutral idle stance.",
      "Linked animation cadence to distance traveled, so slower movement also slows the gait.",
      "Fixed camera scaling for the astronaut and shadow, orbital and interstellar ships, parked lander and surface samples. Zooming out now reduces their apparent size with the world."
    ]
  }
];
