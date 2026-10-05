# Stellar universes — v1.12.0

This release focuses on stars and substellar objects. Major planet/moon texture,
composition, climate, geology and radiation-environment work is deferred. Their
present categories remain supported, with existing host-relative Kepler orbits,
stability margins and moon Hill limits.

## Population controls

Scientific Mode is checked by default inside **New Universe**, rather than the
main menu. Its expandable reference view shows locked percentages. Disabling it
reveals numerical custom settings and a custom-distribution warning. Each separate
pool must total exactly **100.000000%**; decimal validation uses integer
millionths of a percent, never silent normalization. Restore Scientific Defaults
restores every reference pool, including 100% ordinary speculative selections.

These are the requested, evidence-informed **generation priors**. Their six
places support exact totals and rare encounters; they are not measurement
precision or a complete, selection-corrected Galactic census. Primary objects,
stars, systems, volume-limited samples and flux-limited catalogues have different
denominators. In particular, brown-dwarf abundance remains uncertain.

| Primary stellar/substellar family | Scientific weight |
| --- | ---: |
| Main sequence | 73.245345% |
| Brown dwarf | 20.000000% |
| White dwarf | 5.000000% |
| Subgiant | 0.900000% |
| Red giant / red clump | 0.750000% |
| AGB giant | 0.001000% |
| Supergiant | 0.000500% |
| LBV / hypergiant | 0.000050% |
| Wolf–Rayet | 0.000005% |
| Protostar / young accreting star | 0.003000% |
| Post-AGB / planetary-nebula core | 0.000100% |
| Neutron star | 0.100000% |
| **Total** | **100.000000%** |

Only after a main-sequence primary is drawn is its spectral pool sampled:

| Class | Conditional weight |
| --- | ---: |
| M | 76.559870% |
| K | 13.580000% |
| G | 6.210000% |
| F | 2.980000% |
| A | 0.630000% |
| B | 0.040000% |
| O | 0.000130% |
| **Total** | **100.000000%** |

M is the balancing remainder. These reproduce the requested approximate local
population proportions; they remove v1.11's deliberately elevated B/O encounters.
Family and spectral percentages must not be added together. Companion families
are derived from coeval mass/age, rather than another primary draw.

The independent multiplicity reference is 72% single, 23% binary, 4% triple and
1% hierarchical quadruple. Scientific Mode conditions non-single/single odds on
primary initial mass: 0.35× brown dwarfs, 0.4× neutron stars, 0.7× below 0.6 M☉,
1.7× below 1.3 M☉, 3× below 3 M☉, 6× below 8 M☉, and 12× above. The aggregate
therefore differs from the reference; these factors approximate the observed
mass trend, rather than claiming a fitted multiplicity census. Custom Mode uses
entered multiplicity proportions literally. See
[Duchêne & Kraus (2013)](https://arxiv.org/abs/1303.3028).

Scientific Mode never draws speculative objects. The separate custom preset is
ordinary 99.9998%, Thorne–Żytkow candidate 0.0001%, quark-star candidate 0.0001%,
with other future/primordial/exotic models initially zero. Enabled speculative
objects are labeled explicitly. Black holes, quasars and quasistars are excluded.

## Conditional neutron-star activity

Draw a neutron star first, then use this **independent conditional table**:

| Present active subtype | Fraction of neutron stars |
| --- | ---: |
| Quiet / non-active remnant | 99.949900% |
| Active pulsar | 0.050000% |
| Active magnetar | 0.000100% |
| **Total** | **100.000000%** |

These are approximate design estimates of present visible activity, not fractions
of all stars, birth fractions or radio detectability from a particular observer.
The selected orders of magnitude infer a large accumulated Galactic neutron-star
population and much smaller short-lived active populations. Population and
luminosity-cut assumptions vary widely: e.g.
[Ferrario & Wickramasinghe (2006)](https://arxiv.org/abs/astro-ph/0601258)
model roughly 447,000 active radio pulsars above their luminosity threshold and
24 magnetars. [Beniamini et al. (2019)](https://arxiv.org/abs/1903.06718)
find a potentially large magnetar **birth** fraction and rapid field decay; a
large birth fraction is compatible with a tiny present active fraction. Our
conditional percentages are an uncertain inference, not values measured directly
by those papers. Combined with the 0.1% neutron-family prior, active pulsars occur
in about one of two million primary draws, active magnetars about one billion.
Custom settings can force these objects for inspection without altering saves.

Neutron-star body diameters are 20–28 km. Young active remnants have hotter
surfaces; old quiet remnants cool. Pulsars rotate in 0.003–3 seconds; active
magnetars in 2–12 seconds, with stronger fields and irregular bursts. The model
links cooling temperature and X-ray blackbody fraction, with a small illustrative
active nonthermal contribution. These are compact population models, not cooling
tracks, general relativity or magnetosphere simulations.

## Brown-dwarf cooling and atmosphere

Substellar masses span 0.013–0.075 M☉. Age and mass jointly determine cooling
temperature and radius; luminosity follows Stefan–Boltzmann. Younger objects
are larger and warmer at fixed mass. The approximate temperature classification
is L at 1300–2300 K, T at 500–1300 K and Y below 500 K. Clouds follow silicate/iron,
methane/sulfide and cold ammonia-bearing chemistry respectively. Rotation spans
2–20 hours; auroral fields can exist despite weak photospheric coupling. There
are no hydrogen-burning solar granules or solar-style spot/flare textures.
The compact power-law cooling approximation is inspired by the relationships
reviewed in [Burrows et al. (2001)](https://arxiv.org/abs/astro-ph/0103383), rather
than reproducing a tabulated atmosphere/evolution grid. Deuterium burning,
metallicity-dependent class boundaries and detailed spectra are not integrated.

## Linked physical model

Main-sequence mass–temperature–radius anchors follow the mean dwarf sequence in
[Pecaut & Mamajek](https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt).
Interpolation is compact and approximate, not the full table or an isochrone fit.
Subclasses follow effective temperature; the luminosity suffix distinguishes
dwarf V, subgiant IV, giant III and supergiant Ia. White-dwarf DA/DB and Wolf–Rayet
WN/WC/WO classes describe chemistry, not ordinary O–M temperature classification.
Brown dwarfs use L/T/Y approximations and are explicitly substellar.

For every generated radiating body, L/L☉ = (R/R☉)²(T/5772 K)⁴ and g = 274.2 M/R²
m/s². Diameters and orbits use the existing shared kilometre scale. Compact-star
gravity is a Newtonian reference, not a general-relativistic solution. Sol keeps
its previous 1,391,400-km diameter and planetary ephemerides, with 5772 K, 1 L☉,
1 M☉, about 4.57 Gyr, 25.05-day rotation and solar-relative [Fe/H]=0.

Evolved families use a shared evolutionary-phase coordinate to link expansion
and temperature, with initial mass setting the scale. Post-AGB luminosity follows
a simple core-mass relation; massive-star luminosity scales with initial mass. This is **not a MESA/MIST stellar-evolution calculation**. Near-end stages
remain statistical reference objects rather than actively exploding or changing
family during a play session. Ages are bounded by the present Universe in
Scientific Mode. Companion formation ages and initial metallicities match.
Lower-initial-mass companions remain on the main sequence or become appropriate
remnants when their reference lifetime has elapsed. Compact binaries are detached:
mass transfer, accretion disks, common-envelope evolution and supernova kicks are
not dynamically integrated. White dwarfs cool with elapsed remnant time.

Initial [Fe/H] has a broad approximately solar-centered distribution with a weak
age trend. The rotation/activity relationship is simplified; cool-star dynamos,
organized fossil fields in some hot stars and compact-remnant fields are distinct.
No organized field assigned does not mean literally no magnetism. UV (100–400 nm)
is a blackbody fraction; X-rays and wind mass-loss/speed are approximate
activity/family priors, not measured spectra or a radiation-hazard simulation.

The terminal distinguishes **next evolution** (e.g. core hydrogen exhaustion) from
**likely stellar end** (end of ordinary fusion, not disappearance). Calendar-year
estimates are rounded to 100,000-year increments, but uncertainties are at least
30% of the remaining stellar-end timescale and can be billions/trillions of years.
They are not defensible ±100,000-year forecasts. Already-dead remnants have no
invented future death date. See [NASA stellar types](https://science.nasa.gov/universe/stars/types/)
and [MIST](https://mist.science/) for real evolutionary tracks and their complexity.

## Orbital architecture

Detached pairs use eccentric Keplerian relative orbits with moving mass-weighted
barycenters. Triples are (AB)+C; quadruples are ((AB)+C)+D, with wide hierarchical
separation and low mutual inclinations. Close suitable pairs can host P-type
circumbinary planets; wide systems use S-type circumprimary planets. Planet
positions follow their host star or pair barycenter, rather than the map origin.

Stability boundaries use [Holman & Wiegert (1999)](https://arxiv.org/abs/astro-ph/9809315)
coplanar test-particle fits in their eccentricity domain, with added safety margins
and a conservative outer-companion restriction. Finite stellar envelopes,
eccentric planet pericenters/apocenters and moon Hill limits are checked. This is
not a proof of multi-gigayear N-body stability, and planets around secondary stars
are not generated in this release. Stars and planets may be absent from some
orbital regions; a barren system is valid and can be entered without a crash.

The reference habitable zone is 0.95–1.67 × sqrt(L/L☉) AU **orbital radii**.
Corresponding orbit diameters are twice those values. Close binaries use summed
host luminosity; wide systems use primary illumination. This is a bolometric
reference, extrapolated for hot/evolved/compact stars, not a detailed spectrum-aware
climate calculation or proof of habitability. Eclipses, secondary irradiation and
atmospheric survival need the later planet/environment work.

Multiplicity depends strongly on mass in reality:
[Duchêne & Kraus (2013)](https://arxiv.org/abs/1303.3028).
The local census also depends on which objects and systems are counted:
[Reylé et al. (2021)](https://arxiv.org/abs/2104.14972).

## Rendering, UI and saved voyages

Temperature drives stellar color, luminosity brightness and radius a compressed
size contribution in Deep Space. The chart is symbolic rather than physical disk
scale and does not simulate distance-dependent observed flux. **Home status has
no size or brightness multiplier.** Balanced green pixel house outlines mark home; the home star is marked only in Deep Space, while its planet is marked in system view.
Home System / Home World appears in selection telemetry without permanent labels.

Photospheric animation uses radius-scaled convection, rotational circulation,
magnetic spot groups and connected limb plasma. Cool K/M dynamo activity depends
on a simplified Rossby-number relation; slow quiet stars have long quiet flare
intervals. Sun-like structures are finer than giant/supergiant cells. Hot stars
use restrained structures and seeded organized fields rather than ubiquitous
cool sunspots. White dwarfs have smooth cooling photospheres. Accreting young
stars carry dust/disk/jets and uneven brightness; post-AGB cores have thin envelopes.
Family, age, radius, temperature, mass and rotation contribute to the model;
this is illustrative activity rather than predicted stellar weather.

Brown-dwarf burgundy, copper and violet atmospheric bands develop turbulent
streaks and changing broad cloud structures. Cooler T/Y objects become dimmer.
Pulsars use tilted rotating blue/cyan beam cones and magnetic loops. Their phase
uses the **listed real spin period**; periods too fast for the display use multiple
exposure samples so aliasing does not imply a slow rotation. Magnetars instead
have irregular violet bursts, intensified loops and less regular beams. The
physical neutron-star disk remains small; surrounding emission is visual effects.
The supplied pulsar/brown-dwarf images inform palette and motifs, expressed in
original code-rendered pixel artwork rather than copied image textures.

Activity textures stay at 96 or 192 pixels, six keyframes per second with blending
and four-object cache bounds. Compact-star effects use bounded geometry and
viewport clipping. Reduced motion freezes surface/cloud/magnetosphere motion and
shows terminal text immediately with a static cursor. Giant-planet weather and
other existing bounded renderer caches retain their earlier limits.

All objects use an opaque green terminal with name, Focus View, Info, status and
distance. Info expands upward and types telemetry with brief section pauses;
its own screen scrolls and smoothly returns to the beginning when typing finishes.
Manual wheel, touch or keyboard reading interrupts this return. The narrower
terminal reveals upward from the bottom, with a compact header and two columns;
Log rests at bottom-right when closed and follows above its edge when open.
Stellar output includes physical, evolutionary, magnetic,
radiation, habitable-zone and orbital data. Planet/moon data uses the same framework
without adding the deferred environment overhaul. Actions plus Cancel follow
selected targets, avoid HUD controls and clamp inside the viewport. Coordinates,
surface samples and the lander share this selection flow. Voyage logs are opaque.

System Fit uses a conservative all-phase envelope: hierarchical stellar offsets,
companion orbit apocenters, photospheres, planetary orbits and moon extents. Manual
minimum zoom is derived from that envelope too, with no fixed floor preventing
wide systems from fitting. The spacecraft in system flight is **1 km** long;
its original detailed sprite is retained, the locator handles subpixel sizes,
and Center can zoom close enough to inspect it. Local surface landers remain
metre-scale shuttles; chart symbols are not physical body scale.

New universes store **generation version 3** and their own validated settings.
The frozen `universe-v2.js` reproduces v1.11 stars, distributions, RNG namespaces
and orbital geometry; version-2 voyages retain their entire old configuration.
Voyages without a profile continue the earlier version-1 generator. No migration
rewrites existing stars, home, positions, route or discoveries. The frozen-v2
fingerprint test compares 60 systems with results from the original v1.11 code.
Start a new voyage to see the new population model. Barren systems remain valid.

Node and Chromium/WebKit checks cover the tables, forced rare families/subtypes,
restoration, wide hierarchies, projected actions, terminal typing/scrolling,
opaque panels, reduced motion, 1 km scale, mobile portrait/landscape layouts and
render/cache stress. Desktop engine tests do not establish real-device battery,
thermal, audio-policy or GPU behavior; the README retains physical-device checks.
