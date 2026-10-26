# Tour de Mars — New Design 2 · Scientific Validation Audit

This is a new design build based on **shu. new design 1.docx**, with the existing Tour de Mars exploration, field-note, NASA-map, and MarsWalk functions preserved.

## Design changes applied
- Website name stays **Tour de Mars** on one line wherever space allows.
- Replaced the previous sketched-cat header/footer mark with the supplied **cat astronaut** emblem.
- Headings and interface labels use **Space Grotesk**; editorial/body copy uses **Playfair Display** on the main website.
- Reworked the landing hero so the supplied Mars/cat-astronaut image covers the full background and all hero copy sits in front of it.
- Moved the NASA Space Apps Challenge mark to the upper-right area of the hero and prepared a transparent-background version for the site.
- Added a centered project-stat strip to match the requested centered information treatment.
- Kept the four featured Mars destinations and the corrected Olympus Mons image.
- Kept the Jezero atlas/map flow and field-note pages.
- Preserved MarsWalk and its route/resource interactions.
- Expanded the team layout to six editable roles: Team Lead, Researcher 1, Researcher 2, Developer 1, Developer 2, and Content Strategy.
- Simplified the footer and increased spacing between Explore, Atlas, NASA App, and MarsWalk.

## Pages
- `index.html` — redesigned landing page.
- `site.html?site=jezero|gale|olympus|valles` — scientific field-note pages.
- `live-map.html` — NASA/JPL Mars Trek explorer and mission-selection bridge.
- `marswalk.html` — MarsWalk route-planning prototype.

## Run locally
```bash
python -m http.server 8000
```
Then open `http://localhost:8000`.

NASA-hosted imagery, Mars Trek tiles, and Google Fonts require an internet connection. Local assets such as the hero image, cat astronaut emblem, transparent Space Apps mark, and Olympus Mons image are included in `assets/`.

## Verification performed
- Checked local HTML links and asset references.
- Checked duplicate HTML IDs.
- Ran JavaScript syntax checks on `site.js`, `detail.js`, and the inline scripts in `live-map.html` and `marswalk.html`.

## Scientific transparency
Tour de Mars and MarsWalk are research/education prototypes, not operational NASA tools or certified human-EVA navigation systems. Where live NASA imagery or mission sources are used, the interface keeps source context and model limitations visible.


## New Design 2: scientific audit pass
This revision follows `shu. new design 2.docx`. The visual design is preserved while source provenance, coordinate references, route claims, missing-data behavior and test coverage are audited.

Added: `audit.html`, `data-source-registry.json`, `AUDIT_REPORT.md`, `TEST_REPORT.md`, and `tests/`.

**Historical New Design 2 boundary:** At that revision, NASA/JPL Mars Trek supplied real geographic visualization while the 5 km MarsWalk grid remained synthetic. Problem 1 now adds the real CTX terrain path described below.

## New Design 3: final QA and challenge-readiness pass

This revision follows `shu. new design 3.docx`. It preserves the visual identity and focuses on final reliability, provenance/state correctness, edge-case behavior, accessibility safeguards, performance/security review and honest readiness reporting.

### Important fixes
- Atlas → MarsWalk imports no longer silently fall back to the example mission when an imported base is invalid.
- Imported coordinates, mapped demo cells and route-report provenance remain synchronized after reorder, removal, reset and replanning.
- Unsupported/out-of-footprint or disconnected stops are reported with reasons instead of being silently substituted.
- The exact synthetic MarsWalk model footprint is shown on the Atlas.
- Added structured MarsWalk report JSON export and print-friendly report output.
- Added explicit map-library failure states and local Leaflet CSS.
- Improved keyboard focus styling and mobile-menu ARIA/Escape behavior.
- Reduced oversized local image payloads.

### Run locally
From the project directory:

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/index.html
```

Do not rely on `file://` for the final demo. The Atlas requires network access to NASA/JPL Mars Trek tiles. In this package Leaflet JavaScript is also loaded from a CDN; `vendor/leaflet/leaflet.css` is local.

### Deploy
This is a static site: deploy the directory as-is to GitHub Pages, Netlify, Cloudflare Pages, another static web host, or a normal HTTPS web server. No backend, database or private API key is required.

Before judging, verify from the public URL that:
1. all local assets return HTTP 200;
2. the browser can load the Leaflet JavaScript CDN;
3. NASA/JPL Mars Trek tiles load through the event/network policy;
4. Atlas → MarsWalk handoff and report export work in the actual browser;
5. no console errors appear on the key pages.

### Tests

```bash
node tests/route-tests.js
python3 tests/static-audit.py
python3 tests/qa-regression.py
```

Expected results for this package:
- Route engine: **13 / 13 PASS**
- Scientific/static audit: **20 / 20 PASS**
- Final QA regression: **51 / 51 PASS**

JavaScript syntax checks are also expected to pass. See `TEST_REPORT.md` for the exact scope and the browser tests that remain blocked/not tested.

### Final QA documents
- `FINAL_QA_REPORT.md` — executive readiness summary, fixes, status table and limitations.
- `TEST_REPORT.md` — reproducible test results and blocked/not-tested items.
- `DATA_INVENTORY.md` — real/derived/synthetic/unknown separation.
- `DEMO_CHECKLIST.md` — final live-browser/network rehearsal checklist.
- `AUDIT_REPORT.md` — New Design 2 scientific validation audit retained for traceability.
- `data-source-registry.json` — machine-readable source/provenance registry.

### Readiness boundary
The offline/static test suites pass, but this execution environment blocked full Chromium navigation. Therefore real desktop/tablet/mobile rendering, live Mars Trek behavior and assistive-technology interaction are **not claimed as passed** here. Run `DEMO_CHECKLIST.md` on the actual presentation machine.


## Problem 1: real MarsWalk terrain path

This revision addresses the synthetic-terrain disconnect identified by QA without redesigning the site. It selects the USGS **Mars 2020 Terrain Relative Navigation CTX DTM Mosaic** (20 m nominal posts; DOI `10.5066/P906QQT8`) for the existing Jezero route footprint.

The included pipeline:

```bash
python -m pip install -r pipeline/requirements.txt
python pipeline/build_all.py
```

reads the exact GeoTIFF, preserves nodata, reprojects only the existing 5 km footprint into the MarsWalk local Mars CRS, computes slope on a 20 m working grid, aggregates to the existing 100 m route graph, and writes `data/terrain_grid.json` plus `data/terrain_hillshade.png`. MarsWalk automatically switches to this real terrain grid when it exists.

If the real grid is absent, the previous grid is retained only as an **explicit synthetic fallback**. Science priority, walking speed and resource budget remain separately labelled demonstrations/model assumptions.

This ChatGPT sandbox could verify the official USGS source and its coverage but could not DNS-resolve the official GeoTIFF hosts, so the official raster itself is not bundled in this ZIP. Do not claim the deployed build is using real terrain until `pipeline/build_all.py` succeeds and the MarsWalk terrain panel shows **Real terrain active**.

Current automated results:
- Terrain processing fixture: **9/9 PASS**
- Source metadata/coverage: **8/8 PASS**
- Route engine: **16/16 PASS**
- Scientific/static audit: **20/20 PASS**
- QA regression: **51/51 PASS**
- Python and JavaScript syntax checks: **PASS**

See `REAL_TERRAIN_IMPLEMENTATION.md` and `PROBLEM1_TEST_REPORT.md`.
"# tdm" 
