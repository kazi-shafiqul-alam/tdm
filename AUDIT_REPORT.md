# Tour de Mars — Scientific Data Validation and Integration Audit

> **Historical note:** This report records the project state before the Problem 1 real-terrain pipeline was added. For the current terrain architecture and validation status, see `REAL_TERRAIN_IMPLEMENTATION.md` and `PROBLEM1_TEST_REPORT.md`.


**Audit date:** 22 October 2026  
**Status:** prototype audit; not an operational or human-EVA certification.

## Verified functionality
- The live atlas requests documented NASA/JPL Mars Trek WMTS layers using current layer IDs.
- Pan/zoom, layer switching, coordinate selection, local persistence, Mars-sphere distance measurement, MarsWalk handoff and Mars-specific JSON export are implemented.
- MarsWalk executes Dijkstra-based routing over its embedded grid, supports multiple ordered stops, compares objectives, computes a reverse walkback map, applies a return-budget constraint at every path point, and builds a report from the calculated route.
- Environmental fields remain unknown unless data are actually loaded.

## Verified sources versus integration
`data-source-registry.json` records exact integrated Mars Trek layer IDs and the verified source families planned for the next data pipeline. HiRISE DTM, CRISM MTRDR, THEMIS and MEDA are verified sources, but they are **not yet integrated into the current MarsWalk grid**.

## Simulated / unverified inputs
- 50×50 MarsWalk grid, 100 m cell spacing (5 km × 5 km): synthetic demonstration data.
- Elevation, p90 slope, sand, risk, science and mineral values: synthetic.
- Rover-story overlay: illustrative, not verified traverse geometry.
- 2–8 h resource budget: simplified time/resource proxy, not oxygen consumption.
- Walking-speed and hazard thresholds: model assumptions, not NASA EVA standards.
- MEDA temperature / Jezero radiation: not loaded; UI remains Unknown.

## Confirmed corrections
1. Jezero center corrected from the previous project reference to USGS Gazetteer 18.41°N, 77.69°E; reference rim radius 23.76 km from the 47.52 km listed diameter.
2. Neretva Vallis corrected to USGS Gazetteer center 18.55°N, 77.20°E.
3. Visible “Safest”/human-safe language changed to model-specific terminology.
4. Imported map coordinates are now preserved in the mission report while the synthetic routing cell and any snap offset are separately disclosed.
5. Missing terrain/risk inputs no longer become numeric defaults; affected cells are excluded. Missing science remains unknown and receives no science reward.
6. Planetary export changed from RFC-7946-like GeoJSON to a Mars-specific JSON schema declaring body, coordinate convention, and `[longitude, latitude]` order.
7. “Suit air” changed to a demonstration EVA time/resource budget.
8. Rover overlay is visibly labelled illustrative.

## Spatial alignment / resolution findings
The global Mars Trek layers used are documented as global equirectangular Mars visualization layers; Mars Trek reports EPSG::104905 for these global layers. Atlas measurement uses Mars sphere radius 3,396,190 m and is great-circle distance, not terrain distance.

The MarsWalk demo metadata declares `+proj=eqc +lat_ts=18.4 +lon_0=77.5 +R=3396190` and 100 m cell spacing. The map-to-grid transform is mathematically defined, but **scientific co-registration is not established** because the cell values are synthetic. The 100 m number is route-graph spacing, not the resolution of an integrated source dataset.

## Route / resource findings
- Passable cells use an eight-neighbor graph; diagonal corner-cutting past blocked cells is prevented.
- Dijkstra computes route legs.
- Edge time is direction-aware through elevation difference and includes a synthetic sand slowdown.
- Objective cost inflates time using terrain cost and may discount it using synthetic science; science discount is bounded so costs stay positive.
- Reverse Dijkstra computes fastest modeled walkback time to the habitat.
- At every route point: `elapsed + T_home + reserve <= budget`.

These are real calculations over demo values; they are not evidence that a returned path is safe for people.

## Environmental audit
Current behavior is scientifically conservative: no invented live weather, no invented Jezero radiation. MEDA is a verified historical Jezero archive but no specific sol is loaded. Any future use should identify exact sol, product/collection, units and timestamps and be labelled historical/replay.

## Field-note references
All four pages retain numbered claims and reference lists. During this audit, authoritative NASA/PDS/USGS pages and representative DOI records were independently retrieved across Jezero, Gale, Olympus Mons and Valles Marineris. Examples include `10.1126/science.abo2196`, `10.1029/2023JE008187`, `10.1029/2019JE006011`, `10.1126/science.abl4051`, `10.1126/science.1242777`, `10.1126/science.1243480`, `10.1016/j.epsl.2017.04.021`, `10.1029/2006JE002826`, and `10.1029/2006GL026396`. No missing citation was fabricated.

The local test environment has no outbound DNS, so an automated request to every external link could not be performed. Link availability that was not independently retrieved via the audit research is therefore an ongoing monitoring concern, not claimed as permanently verified.

## Remaining limitations
1. No co-registered Jezero HiRISE/THEMIS/CRISM routing grid yet.
2. No exact terrain source product IDs bound to the 5 km demo region.
3. Human-performance parameters are assumptions.
4. Rover traverse is illustrative.
5. No historical MEDA sol loaded.
6. No radiation planning model.
7. Global map imagery cannot substitute for rover-scale terrain measurements.
8. External source URLs need periodic monitoring.

## Prioritized next phase
1. Freeze a 5 km × 5 km Jezero box based on actual overlap of a released HiRISE DTM and CRISM targeted observation.
2. Record exact product IDs, labels, CRS, units, footprints and checksums.
3. Reproject/clip to one local Mars CRS; verify alignment visually and numerically.
4. Compute slope at native DTM resolution, then aggregate; preserve nodata.
5. Add a verified THEMIS thermal-inertia product or a transparently traced sand-polygon fallback.
6. Process CRISM summary parameters with names from the exact product label and retain no-coverage cells.
7. Replace illustrative rover overlay with a verified public Perseverance traverse.
8. Rerun route tests on generated data; use rover behavior only as a sanity check, not human ground truth.
9. Add MEDA historical replay only after selecting exact sol/product.

## Official documentation used
- NASA/JPL Mars Trek API: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars
- HiRISE DTM: https://www.uahirise.org/dtm/about.php and https://www.uahirise.org/dtm/howto.php
- PDS CRISM: https://pds-geosciences.wustl.edu/missions/mro/crism.htm
- PDS MOLA MEGDR: https://pds-geosciences.wustl.edu/missions/mgs/megdr.html
- THEMIS: https://themis.asu.edu/factsheet
- PDS MEDA: https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html
- USGS Planetary Nomenclature: https://planetarynames.wr.usgs.gov/
