# Stellar universes — v1.11.0

This release focuses on **stars**. Planet/moon surfaces, detailed compositions,
atmospheric histories, geology and magnetic environments will be upgraded later.
Their present visual categories remain in use; orbital placement, Kepler periods,
irradiation reference, giant likelihood and moon Hill limits now follow their host.

## Population controls

Scientific Mode is checked on the main menu by default. Turning it off reveals
Universe Generation. Percentage **text inputs**, with up to six decimal places,
must total exactly 100 in **each independent table**. Apply is disabled otherwise;
values are never silently normalized. Cancel discards edits. Restore Scientific
Defaults restores the locked reference pools, including 100% ordinary objects.

The main-sequence primary pool is M 74%, K 14%, G 7%, F 3%, A 1.2%, B 0.7%, O 0.1%.
The primary-family pool is main sequence 90%, subgiant 1.5%, red giant/red clump
3.7%, AGB 0.15%, supergiant 0.03%, LBV/hypergiant 0.005%, Wolf–Rayet 0.005%, white
dwarf 4.57%, neutron star/pulsar 0.039%, magnetar 0.001%. Young stars, post-AGB
cores, hot subdwarfs and brown dwarfs are available with zero initial weights.
Subtypes such as supergiant color and pulsar status follow their family model.

These are the **agreed game encounter priors**, not a completeness-corrected
Galactic census. The B/O weights are intentionally more discoverable than a
volume-limited real population. Scientific Mode means evidence-informed physical
compatibility and no speculative objects, not exact reproduction of the Milky Way.
Main-sequence percentages are conditional on that primary-family draw; the pools
must not be added together. Companion types are derived, not independent draws.

Multiplicity reference weights are single 72%, binary 23%, triple 4%, quadruple
1%. In Scientific Mode, multiple/single odds are conditioned on initial primary
mass (0.8× for low-mass dwarfs, 2× solar-like, increasing to 14× for massive stars;
0.4× for neutron-star remnants to approximate disruption). These factors are game
priors, not fitted observed frequencies. Custom Mode uses the entered proportions
literally. All four components are individually selectable and travelable.

Scientific Mode never draws speculative candidates. The initial **custom**
speculative preset is ordinary 99.9998%, Thorne–Żytkow candidate 0.0001%, quark-star
candidate 0.0001%, with future blue/black dwarfs, primordial Population III, dark
stars and boson stars initially zero. All are labeled speculative if enabled;
future/primordial models are not presented as verified present-day objects.
Black holes, quasars and quasistars are not implemented. Speculative models are
illustrative encounters, not scientific predictions of their structure or odds.

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

Evolved families use broad, physically plausible temperature/radius/current-mass
ranges. This is **not a MESA/MIST stellar-evolution calculation**. Near-end stages
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

The panel distinguishes **next evolution** (e.g. core hydrogen exhaustion) from
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

Temperature drives restrained warm-to-blue-white palettes; Sol is warm white,
not saturated yellow. Cool stars show evolving magnetic spots and plasma motifs;
giants have larger convection cells, AGB/supergiant/LBV brightness pulsation;
hot stars have lower-contrast surfaces, WR/AGB/young-star wind/envelope motifs;
white dwarfs have compact smooth photospheres without solar flares; neutron stars
and magnetars have symbolic polar beams. Cool brown dwarfs are faint, not bright
red suns. Visual motion is slowed/accelerated artistically and frozen by Reduce
motion. Photosphere diameter remains the numerical physical size.

The interstellar map is symbolic, **not physical stellar disk scale**. It uses the
same primary color, logarithmically compressed bolometric brightness cues and
colored companion pips. It does not simulate observed flux at each chart distance.
Star info and voyage log are opaque; details have header Focus View/telemetry,
centered stellar family, expandable descriptions, rarity context and Sol references.

Generation configuration is stored per new voyage and validated on import. Old
voyages without a v2 profile retain their v1 star/planet identities, positions,
distribution and geometry. Start a new voyage to explore the new stellar universe;
main-menu changes never rewrite existing saves. Barren starting systems place the
ship near the primary instead of inventing a home world. Renderer and chart caches
are bounded; offline shell includes all new modules.
