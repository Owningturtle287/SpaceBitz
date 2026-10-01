# Giant planets and the extended Sol system (v1.9)

The game uses physical kilometres/AU for diameters and orbital distances, with the existing common visual scale. New artwork does not enlarge numerical body sizes or move existing generated worlds. Jupiter's old rectangular Great Red Spot and hash-assigned broad ring are replaced by an oval vortex and faint dust rings.

## Reflected-light appearance

Jupiter has ochre belts, cream zones, curled cloud filaments, pale ovals and a southern red vortex about 17,000 km wide. This is a stylized storm, not a prediction of the Great Red Spot's current size or longitude. Saturn has softer golden bands, occasional cloud ovals and a polar hexagon motif. Uranus has low-contrast methane haze and a bright polar hood, with its atmosphere and rings drawn sideways. Neptune has a slightly bluer blue-green palette, stronger cloud lanes and a dark vortex; historical dark spots are inspiration, not a claim that one particular storm still exists.

- [NASA Jupiter facts](https://science.nasa.gov/jupiter/jupiter-facts/)
- [Oxford: reconstructed Uranus and Neptune colors](https://www.ox.ac.uk/news/2024-01-05-new-images-reveal-what-neptune-and-uranus-really-look-0), based on Hubble STIS/MUSE spectra. Neptune is only slightly bluer than Uranus; the old strongly saturated Voyager blue was enhanced.
- [NASA: ice-giant haze and color](https://science.nasa.gov/solar-system/planets/neptune/why-uranus-and-neptune-are-different-colors/)

Generated appearances use an independent deterministic seed, preserving world geometry, types, moon phases and save IDs. An approximate equilibrium temperature, 278 K × luminosity^0.25 / sqrt(AU) × 0.7^0.25, gates cloud families. Cool giants can resemble Jupiter/Saturn, have amber haze, or have methane-rich blue-green appearances; warmer cloudy worlds favor pale water clouds. Sparse-cloud, alkali and silicate classes are available to the appearance model at higher temperatures, but existing generation still places giants beyond the temperate band rather than adding hot Jupiters or replacing landable worlds.

The temperature/cloud interpretation follows [Sudarsky, Burrows & Pinto (2000)](https://arxiv.org/abs/astro-ph/9910504) and [Hu (2014)](https://arxiv.org/abs/1412.7582). Methane/haze/cloud abundance, gravity and irradiation all affect actual spectra; temperature alone cannot establish a world's color. The within-class probabilities, small-giant methane preference, and ring probabilities are **game priors, not measured real-world color or exoring frequencies**. There is no established census of giant-planet visible colors or exoring occurrence from which exact rarity weights could be derived. Under 150 K, small giants have a 62% methane appearance prior; other cases favor ammonia clouds over amber haze at 70:30. From 150–350 K, water-cloud appearances have a 72% prior. Broad icy rings have a 12% prior, narrow rings an additional 28%; most generated giants are unringed.

## Rings

Ring radii come from the NASA PDS Ring-Moon Systems Node tables: [Jupiter](https://pds-rings.seti.org/jupiter/jupiter_rings_table.html), [Saturn](https://pds-rings.seti.org/saturn/saturn_rings_table.html), [Uranus](https://pds-rings.seti.org/uranus/uranus_rings_table.html), [Neptune](https://pds-rings.seti.org/neptune/neptune_rings_table.html).

Saturn's D/C/B/A/F components extend to 140,612 km from its center, approximately 2.415 times the mean planet radius. The 117,570–122,050 km Cassini Division and selected smaller gaps separate radial bands. Jupiter's represented dust components span 100,000–129,100 km and are much fainter. Uranus's ten principal narrow ringlets include epsilon at 51,149 km with a 58.1 km mean width; Neptune includes faint inner bands and the 62,933 km Adams ring with an arc motif.

Ring layers are rasterized behind/in front of their host, with radial density waves, restrained palettes and a planetary shadow. Radial positions and broad widths share the body scale. Ring brightness is enhanced for legibility, and unresolved narrow ringlets use soft one-texel hints. Presentation tilts are fixed artistic viewing angles, not a date-specific observer geometry. Extremely faint outer dust sheets are omitted. Generated broad rings are an icy Roche-region-inspired arrangement within approximately 2.45 planet radii, not known observed exoring systems.

## Added bodies

NASA sources: [Saturnian satellites](https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturniansatfact.html), [Uranian satellites](https://nssdc.gsfc.nasa.gov/planetary/factsheet/uraniansatfact.html), [Pluto/Charon](https://nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html). [JPL physical parameters](https://ssd.jpl.nasa.gov/sats/phys_par/) supports the post-New Horizons Pluto radius, 1,188.3 km. Satellite diameters are mean/equivalent values rounded where the NASA sheet lists triaxial dimensions.

| Body | Diameter (km) | Host distance (km) | Orbital period (Earth days) | Eccentricity |
| --- | ---: | ---: | ---: | ---: |
| Tethys | 1,062 | 294,660 | 1.887802 | 0 |
| Dione | 1,123 | 377,400 | 2.736915 | 0.0022 |
| Rhea | 1,528 | 527,040 | 4.517500 | 0.0010 |
| Iapetus | 1,469 | 3,560,850 | 79.330183 | 0.0283 |
| Ariel | 1,158 | 190,900 | 2.520379 | 0.0012 |
| Umbriel | 1,169.4 | 266,000 | 4.144176 | 0.0039 |
| Titania | 1,577.8 | 436,300 | 8.705867 | 0.0011 |
| Oberon | 1,522.8 | 583,500 | 13.463234 | 0.0014 |
| Charon | 1,212 | 19,596 | 6.3872 | 0 |

Pluto is a landable **dwarf planet**, diameter 2,376.6 km, with a retrograde 6.3872-day rotation. Its J2000 mean heliocentric elements are a = 39.48168677 AU, e = 0.24880766, inclination = 17.14175°, ascending node = 110.30347°, longitude of perihelion = 224.06676°, and mean longitude = 238.92881°. The mean longitude advances with NASA's quoted 90,560-day period. This is a two-body mean approximation, separate from the JPL Table 1 approximation used for the eight planets. Charon and Pluto move around their common barycenter using NASA masses of 1.586 and 13.03 × 10^21 kg; their mutual separation stays physical. Pluto's pale heart and Charon's reddish polar region are stylized from [NASA Pluto](https://science.nasa.gov/dwarf-planets/pluto/facts/) and [Charon](https://science.nasa.gov/dwarf-planets/pluto/moons/charon/) descriptions. Charon is the explorable companion; Pluto's four smaller moons are not included in this update.

New moon planes use [JPL mean reference-plane poles/elements](https://ssd.jpl.nasa.gov/sats/elem/sep.html), converted from ICRF into the map's ecliptic plane. Uranus's sideways equatorial system, Iapetus's different plane, and Charon's retrograde plane are preserved. Existing moons retain their pre-update positions/phases for continuity. Synchronous spin magnitudes match moon periods. Moon phases and presentation meridians are illustrative; precession and full gravitational interactions are not integrated, and none of these are live Horizons ephemerides. Listed inclinations to the host equator are NASA mean values and may differ slightly from JPL's more recent local Laplace-plane fits.

The Sol chart now contains eight planets, Pluto and nineteen explorable moons. System Fit includes Pluto's aphelion. Entry from interstellar travel still starts beside Neptune, the outermost planet. All added worlds are selectable, travelable, landable and compatible with voyage discovery/save IDs.

## Rendering limits

Giant maps are 320×160; projected giant disks are 128×128. Rocky/icy disks retain 80×80. All use nearest-neighbor drawing. Ring rasters are 384×384 front/back layers, cropped to the viewport before drawing at extreme zoom. Caches remain bounded to 48 maps, 160 body frames and 24 ring pairs. Tests check cloud seams, the oval storm footprint, physical ring radii, barycentric motion, save geometry, cache limits, every added landing/launch, and browser rendering at up to 128× zoom.
