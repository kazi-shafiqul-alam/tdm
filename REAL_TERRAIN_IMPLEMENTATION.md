# Tour de Mars — Problem 1: real terrain integration

## Status

The synthetic-only terrain architecture has been replaced with a **real-data-first terrain path**. MarsWalk now attempts to load `data/terrain_grid.json`, and it accepts that file only when it is explicitly marked `terrain_mode: "real"`. If the processed real grid is absent, MarsWalk uses the previous grid only as an **explicit synthetic fallback** and says so in the interface and mission report.

The official USGS GeoTIFF could not be downloaded inside the ChatGPT execution sandbox because outbound DNS resolution to the official file hosts is blocked. Therefore this package does **not** claim that the final acceptance criterion “real terrain values demonstrably reach the route engine” was completed in this sandbox. The processing and route-integration path is implemented and tested with a controlled projected GeoTIFF fixture; run the two commands in **Build the real terrain grid** on a normal internet-connected machine to activate the real source values.

## Before → after architecture

**Previous flow**

`NASA Mars Trek visual tiles → user chooses lat/lon → local 5 km grid → synthetic elevation/risk/science → Dijkstra route → report`

The visual map was real NASA/JPL imagery/context, but its terrain did not feed the route model.

**New flow**

`USGS Mars 2020 CTX DTM GeoTIFF → reproject into MarsWalk local Mars CRS at 20 m → source-derived elevation + derived slope → 100 m route cells → passability + modeled terrain cost → existing Dijkstra/walkback engine → route/report`

`NASA Mars Trek WMTS → geographic visual context / user selection → same planetocentric, east-positive location → route-grid cell`

`Legacy synthetic grid → explicit fallback only if real processed grid is unavailable`

Science-priority values are still a separate simulated demonstration layer. They are not represented as CTX measurements.

## Selected terrain dataset

**Product:** Mars 2020 Terrain Relative Navigation CTX DTM Mosaic  
**File:** `JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif`  
**Producer:** USGS Astrogeology / Mars Reconnaissance Orbiter CTX terrain-relative-navigation products  
**DOI:** `10.5066/P906QQT8`  
**Nominal post/pixel spacing:** 20 m  
**Published raster size:** 1596 × 1512, one elevation band  
**Published coverage:** 77.1605°E–77.699°E, 18.211°N–18.7212°N  
**Vertical units:** metres  
**Coordinate convention:** planetocentric latitude, positive-east longitude  
**Projection:** Mars equirectangular/equidistant cylindrical, latitude of true scale 0°, central longitude 0°, Mars radius 3,396,190 m  
**Control:** MOLA-controlled context described by the USGS release  
**License/reuse:** USGS data release / CC0 1.0; cite the authors and release.

Official landing/documentation page:  
`https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic`

Exact USGS file URL:  
`https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif`

Verified USGS Astrogeology/ASC PDS mirror listing:  
`https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/index.html`

Exact mirror object:  
`https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif`

### Why this product

The configured MarsWalk footprint is approximately **77.3933226°E–77.4822204°E, 18.3889593°N–18.4733123°N**, so it lies inside the published CTX DTM coverage. The ~20 m product is materially better suited to a 5 km interactive prototype than global MOLA elevation for local terrain variation, while being much smaller and simpler to reproduce than a multi-product HiRISE mosaic. The website still uses a 100 m route graph for speed and explanation; this is **route-cell spacing**, not a claim that the source has 100 m independent resolution or that resampling creates new detail.

## Coordinate transformation and alignment

MarsWalk already used this local metric CRS:

`+proj=eqc +lat_ts=18.4 +lat_0=0 +lon_0=77.5 +x_0=0 +y_0=0 +R=3396190 +units=m +no_defs`

The source DTM is read from its embedded GeoTIFF CRS instead of assuming a CRS. `rasterio`/PROJ reprojects the source into that local Mars equirectangular CRS at a 20 m working spacing. The route area is exactly the existing 50 × 50 cell grid with 100 m cells: x = −6000…−1000 m and y = 1,090,000…1,095,000 m in the local CRS.

Atlas/Mars Trek locations use planetocentric latitude and east-positive longitude. The website projects them onto the same local sphere (R = 3,396,190 m) before identifying a route cell. The metadata test independently transforms all four route-grid corners back to longitude/latitude and verifies that the whole footprint is inside the published CTX coverage.

Precise pixel-by-pixel visual registration against live Mars Trek tiles was **not tested in a browser in this execution environment**. Mars Trek tiles remain visual context; the CTX GeoTIFF is the numeric terrain source.

## Terrain processing

`pipeline/build_real_terrain.py` performs the following:

1. Opens the exact source GeoTIFF and requires a CRS, one band, plausible published dimensions and ~20 m pixels.
2. Reprojects only the 5 km route footprint to the existing local Mars CRS at 20 m, using bilinear resampling for elevation.
3. Preserves nodata as `NaN`.
4. Computes slope in **degrees** from the metric 20 m elevation grid. A slope sample is valid only with a complete 3 × 3 finite neighborhood.
5. Aggregates each 5 × 5 group of working pixels into one 100 m route cell: mean elevation, mean slope, 90th-percentile slope, and source coverage fraction.
6. Blocks cells with <80% elevation coverage, missing p90 slope, or p90 slope >25°.
7. Computes a project **terrain-cost model** by linearly scaling p90 slope from 0 at ≤5° to 1 at ≥25°. This is not a NASA hazard probability or EVA safety standard.
8. Writes reusable `data/terrain_grid.json` and a derived `data/terrain_hillshade.png`.

The route engine consumes `terrain_cost` as its terrain weighting and uses source-derived elevation for directional grade in its illustrative travel-time model. It does not require the old synthetic `sand` or `risk` fields in real mode. Unknown terrain is not traversable.

## Build the real terrain grid

From the project directory:

```bash
python -m pip install -r pipeline/requirements.txt
python pipeline/build_all.py
python -m http.server 8000
```

Then open:

`http://localhost:8000/marswalk.html`

If automated downloading is blocked on your network, download the **exact GeoTIFF named above** from either verified USGS URL and place it here:

`data/raw/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif`

Then run:

```bash
python pipeline/build_real_terrain.py
python -m http.server 8000
```

MarsWalk will display a green **USGS CTX DTM · REAL TERRAIN** status only when `data/terrain_grid.json` exists and is explicitly marked as a real build. Otherwise it displays the fallback status and does not present fallback cell values as NASA-derived.

## Remaining modeled/simulated values

The following are intentionally **not** claimed as direct NASA terrain observations:

- Science-priority scores and mineral labels: simulated demonstration values pending CRISM integration.
- Route terrain-cost score: derived/model value from p90 slope, not a safety probability.
- Suited walking-speed relationship and route duration: illustrative estimate.
- EVA/resource/air budget and reserve: configurable demonstration model, not a NASA operational limit.
- Rover-story overlay: illustrative, not a spatially validated Perseverance traverse.
- Temperature, radiation, dust and dynamic environmental conditions: not loaded as live values.

See `PROBLEM1_TEST_REPORT.md` for what was actually run and what remains blocked.
