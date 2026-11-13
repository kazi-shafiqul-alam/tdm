# Demo candidate QA summary — 13 November 2026

## Confirmed in sandbox browser with external services blocked

- MarsWalk initial interface loaded and displayed a correct terrain-unavailable state.
- `Load Demo EVA` successfully seeded a base and two science-context destinations and drew a sample geographic route.
- Fast, Safe, Balanced, and Science buttons all remained interactive and the comparison table rendered four rows. The preview rows carry `n/a` in terrain cost because no CTX elevation was loaded.
- Replay advanced elapsed time and the O₂ scenario readout.
- JSON export produced `marswalk-route-YYYY-MM-DD.json`; export includes `previewOnly: true` and `verifiedTerrain: false` in the fallback.
- No JavaScript `pageerror` events in this browser test.
- A 390 px-wide mobile view loaded the same sample route.
- JavaScript syntax and all HTML files checked successfully.
- Separately, `tools/build_terrain.py` was tested against a small **synthetic TEST-ONLY** GeoTIFF outside this project folder. It generated 2,500 cells, confirming the offline preprocessor executes. **This test-only GeoTIFF and its output are NOT included or represented as USGS measurements.**

## Not yet verified in this environment

- Actual NASA WMTS tile availability and image loading from `trek.nasa.gov` — external network was unavailable in the browser test. The code retains its live official tile URLs.
- Actual CTX USGS/PDS remote GeoTIFF download and processing — external network was unavailable. The delivered `data/terrain-grid.js` remains `window.TDM_TERRAIN_GRID = null`.
- Scientific terrain-aware result with the official CTX DTM — requires the official downloaded file or a correct precomputed real grid.
- Deployment to the team's GitHub `main`/`test` branches or Vercel: **not performed**.

**Conclusion:** The interface and explicitly labeled fallback presentation are browser-tested. Scientific terrain validation remains blocked on obtaining and processing the official DEM; the package does not fake that step.
