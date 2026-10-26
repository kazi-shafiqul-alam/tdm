# Tour de Mars — Current data inventory

> Updated for Problem 1 real-terrain integration. Earlier QA documents describe the state before this terrain pipeline was added.

This inventory separates source observations/products, derived calculations, model estimates, simulations, and unknown values.

| Item | Classification | Current use | Important limitation |
|---|---|---|---|
| NASA/JPL Mars Trek WMTS layers | Real processed visualization | Atlas geographic context and selection | Rendered tiles are not numeric elevation/slope inputs |
| USGS Mars 2020 TRN CTX DTM mosaic | Real processed source product | **Primary MarsWalk terrain source after `pipeline/build_all.py`** | Official GeoTIFF is not bundled; must be downloaded/rebuilt |
| DTM elevation in 20 m local working raster | Source-derived after reprojection/resampling | Directional grade + route-cell elevation | Bilinear resampling does not create new source detail |
| Mean/p90 slope | Derived calculation | Passability + terrain-cost model | Calculated from reprojected elevation; not a direct instrument measurement |
| 100 m route grid | Derived spatial aggregation | Route graph | 100 m is graph spacing, not source resolution |
| Terrain-cost score | Model estimate | Lower-terrain-cost/balanced objectives | Project normalization of p90 slope; not a NASA safety probability |
| Passability threshold | Model rule | Excludes missing terrain and cells over configured p90 slope threshold | 25° threshold is a prototype assumption, not an operational EVA limit |
| Legacy 50×50 terrain grid | Simulated demonstration | **Fallback only** if the real terrain grid is absent | Never presented as NASA-derived in fallback mode |
| Science-priority/mineral values | Simulated demonstration | Science-priority and balanced route variants | Not yet generated from CRISM |
| Rover-story overlay | Illustrative | Storytelling | Not a spatially validated Perseverance traverse |
| Great-circle distance in Atlas | Derived calculation | Atlas measurement | Spherical surface distance, not terrain-following |
| Dijkstra route geometry | Derived calculation | MarsWalk | Scientific quality depends on active terrain mode and assumptions |
| Direction-aware travel time | Model estimate | Route comparison/report | Uses an illustrative speed relationship, not validated astronaut performance |
| EVA/air/resource budget | Simulated/model estimate | Return-feasibility demonstration | Time/resource proxy; not oxygen consumption or a NASA operational limit |
| Temperature/radiation/dust/live conditions | Unknown / not integrated | UI should remain unknown or disabled | No invented live readings |

## Active-mode rule

MarsWalk tries `data/terrain_grid.json` first and accepts it only when `meta.terrain_mode` is `real`. When present, elevation, slope, passability and terrain cost come from the processed USGS CTX DTM path. If it is absent, the legacy terrain grid is loaded as an explicitly labelled synthetic fallback.

The package produced in this execution environment ships in **fallback mode** because the sandbox could not resolve either verified official GeoTIFF host. Run `python pipeline/build_all.py` on a normal networked machine to generate the real grid; then serve the site through HTTP.

See `REAL_TERRAIN_IMPLEMENTATION.md`, `PROBLEM1_TEST_REPORT.md`, and `data-source-registry.json` for exact provenance and tests.
