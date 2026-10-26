# Problem 1 — terrain integration test report

## Executive result

The real-terrain pipeline, coordinate conversion, route-engine schema, missing-data policy, and fallback separation are implemented. The official source product and its coverage are verified. The official GeoTIFF itself could not be downloaded in the ChatGPT sandbox because the runtime cannot resolve the official USGS/ASC file hosts, so **actual-source raster-value validation and a real-value browser run are BLOCKED here**. The website therefore defaults to an explicit synthetic fallback until the pipeline is run on a normal connected machine.

## Automated tests run

| Area | Status | Result |
|---|---|---|
| Source metadata/config | Passed — 8/8 | Exact product filename, DOI, 20 m spacing, metres, coordinate convention, verified URLs and footprint coverage pinned. |
| Coverage math | Passed | Existing 5 km MarsWalk footprint independently transformed to lon/lat and found inside the published source bbox. |
| Processing fixture | Passed — 9/9 | Projected GeoTIFF fixture reprojected at 20 m, slope computed in degrees, elevation aggregated, nodata retained/blocked, hillshade and JSON generated. |
| Route engine regression | Passed — 16/16 | Existing route cases plus real-schema cases; real cells route without legacy sand/risk fields, terrain cost is consumed, elevation changes directional travel time, missing terrain blocks traversal. |
| Static integration | Passed — 20/20 | Pages/assets, registry, real/fallback disclosure, corrected coordinate handoff, report source metadata. |
| Final QA regression | Passed — 51/51 | Existing usability/state checks plus terrain-footprint terminology and real/fallback source disclosure. |
| Python/JavaScript syntax | Passed | Pipeline Python compiles; embedded routing/app JavaScript syntax checked. |

## Blocked

- **Official GeoTIFF download in this sandbox:** both verified exact USGS hostnames fail DNS resolution from the local runtime. This is an environment/network blocker, not evidence that the public URLs are invalid; the USGS directory/object was independently visible through web retrieval.
- **Actual-source sample comparison:** cannot compare processed grid values to source pixels until the official GeoTIFF is present locally.
- **Real-value live browser visualization:** cannot truthfully verify the CTX-derived route overlay in the browser without the generated official-source `data/terrain_grid.json`.

## Not tested here

- A human visual check against live Mars Trek tiles after building the official source on the presentation computer.
- Performance differences on very low-end mobile hardware with the real grid. The output terrain grid is small (2,500 route cells), so processing happens offline; the browser does not load the source GeoTIFF.

## Required final activation check

On an internet-connected computer, run:

```bash
python -m pip install -r pipeline/requirements.txt
python pipeline/build_all.py
python tests/source-metadata-tests.py
python tests/terrain-pipeline-tests.py
node tests/route-tests.js
python tests/static-audit.py
python tests/qa-regression.py
python -m http.server 8000
```

Open `http://localhost:8000/marswalk.html`, confirm the terrain panel says **USGS CTX DTM · REAL TERRAIN**, select several points inside the footprint, and verify the report lists the USGS dataset/DOI and source-derived elevation/derived p90 slope. Only then should the team state that the original synthetic-terrain problem is fully resolved in the deployed build.
