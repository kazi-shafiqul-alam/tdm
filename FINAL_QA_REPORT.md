# Tour de Mars — Final Quality Assurance & Challenge Readiness Report

> **Historical note:** This report records the project state before the Problem 1 real-terrain pipeline was added. For the current terrain architecture and validation status, see `REAL_TERRAIN_IMPLEMENTATION.md` and `PROBLEM1_TEST_REPORT.md`.


**Revision:** New Design 3  
**Date:** 22 October 2026  
**Scope:** Independent final QA of the New Design 2 prototype, preserving the established visual design while testing and repairing user workflows, route-state integrity, data honesty, accessibility safeguards, deployment dependencies, and demo readiness.

## Executive summary

The core **offline application logic and static integration are in substantially better condition after this pass**. The automated route engine now passes 13 controlled cases, the previous scientific/static audit still passes 20 checks, and a new final-QA regression suite passes 51 checks. JavaScript syntax validation also passes for the site, atlas, field-note, and MarsWalk code.

The most important repaired issue was **state/provenance synchronization between the Atlas and MarsWalk**. Previously, an imported Atlas location could leave stale coordinate metadata attached after editing or restarting a mission. That could make a later report appear to describe a different source selection than the route actually used. The import, reorder, remove, reset, and example-mission flows now keep provenance synchronized.

The Atlas-to-MarsWalk handoff also no longer silently converts an invalid import into the example mission. A base outside the synthetic routing footprint is rejected explicitly. Stops that cannot be represented by the demo model are omitted with an explanation (outside coverage, duplicate cell, same cell as base, or disconnected from the base). The interface states that the real selected Mars coordinate is being mapped to a **synthetic demonstration grid**, not to a measured NASA terrain cell.

**Readiness status: CONDITIONAL / DEMO-CANDIDATE.** The reproducible offline checks pass, but a full network-enabled browser rehearsal could not be completed in this execution environment because Chromium navigation is blocked by administrator policy. Live NASA/JPL Mars Trek tile availability, responsive rendering at real viewport sizes, and final keyboard/screen-reader behavior must therefore be rehearsed on the actual presentation machine before judging. This report does not claim operational or scientific validation.

## Priority issues found and fixes applied

### P0 — Route-report provenance could become stale after an Atlas import

**User impact:** A judge could import a coordinate, modify/restart the mission, and later see old imported-coordinate metadata associated with a new route.

**Affected component:** `marswalk.html` mission state, destination removal/reordering, reset/example flows, report generation.

**Fix:** Imported metadata is now part of synchronized mission state. Removal and reordering update both destinations and provenance. `startOver()` and `loadExample()` clear stale imported metadata and rejected-import records. Reports are generated from the current mission state only.

**Retest:** Passed source-level regression checks and repeated route-engine tests.

### P0 — Failed Atlas imports could silently fall back to the example mission

**User impact:** An invalid or unsupported real coordinate could appear to have produced a successful route when the application had actually substituted the demonstration mission.

**Affected component:** `marswalk.html` import initialization.

**Fix:** Import now has three explicit outcomes: no import requested, import succeeded, or import attempted and failed. A failed import leaves the user in a recoverable selection state and displays the reason; it does **not** load the example mission.

**Retest:** Passed QA regression checks for failed import behavior.

### P1 — Out-of-coverage and rejected imported stops lacked complete explanations

**User impact:** A user could not tell why a selected Atlas point was not used by MarsWalk.

**Affected components:** `live-map.html`, `marswalk.html`.

**Fix:** The Atlas shows the exact synthetic MarsWalk footprint. A base outside it is blocked from handoff. Imported stops are evaluated and rejected with a specific reason when necessary: outside/no routable cell within the allowed mapping distance, same demo cell as base, duplicate demo cell, or disconnected from base. Rejected selections appear in the mission report.

**Retest:** Passed QA regression checks.

### P1 — Coordinate entry errors could fail too quietly

**User impact:** Invalid latitude/longitude could appear to do nothing.

**Affected component:** `live-map.html`.

**Fix:** Coordinate-entry status is now an ARIA live region with explicit validation/error feedback. The mission-selection summary is also announced politely.

**Retest:** Passed static QA checks.

### P1 — MarsWalk report had no structured export and weak print behavior

**User impact:** A judge could inspect the report on screen but had no clear way to retain a traceable route summary.

**Affected component:** `marswalk.html`.

**Fix:** Added a structured JSON report export (`tour-de-mars-marswalk-report-v1`) containing the objective, route summary, selected coordinates, mapped cells and snapping information, rejected selections, resource/return metrics, assumptions, and traceability notes. Added a print action and print-specific layout. Neither action pretends to produce a PDF automatically.

**Retest:** Passed QA regression checks. Actual print-dialog appearance remains part of the browser-rehearsal requirement.

### P1 — Map library failure could prevent an understandable recovery state

**User impact:** If the external Leaflet JavaScript failed before map initialization, the application could fail before displaying a useful map error.

**Affected component:** `live-map.html`.

**Fix:** Leaflet CSS is now bundled locally. A failed Leaflet JavaScript load triggers a visible map-unavailable state, disables map controls, and explicitly states that no coordinate/route result is being fabricated.

**Remaining limitation:** Leaflet JavaScript itself remains CDN-hosted in this package because this execution environment could not retrieve the official distribution file into the build. The final presentation machine therefore still needs network access to load Leaflet unless the team vendors `leaflet.js` before deployment.

### P2 — Mobile navigation and keyboard recovery could be clearer

**User impact:** Keyboard users could open the mobile menu without a reliable Escape-close path or updated accessible state.

**Affected component:** `site.js` and shared site styles.

**Fix:** The menu now updates `aria-expanded`, changes the accessible open/close label, closes after navigation, and closes with Escape. Shared `:focus-visible` styling was strengthened for links, buttons, inputs, and selects.

**Retest:** Passed source-level QA checks. Real assistive-technology testing remains not performed.

### P2 — Avoidable image payload

**User impact:** Slower initial loading, especially on mobile or weak venue networks.

**Affected assets:** cat-astronaut emblem and Olympus Mons image.

**Fix:** Resized the oversized raster assets while retaining practical display resolution. The cat emblem is now 800×800; Olympus Mons is constrained to a 1600 px-wide source.

**Retest:** Asset-size thresholds pass the QA regression suite.

## First-time judge journey

| Step | Result | Notes |
|---|---|---|
| Understand purpose from landing page | PASS (static/content) | Purpose, Explore/Atlas/MarsWalk CTAs and prototype framing are present. |
| Open global Mars Atlas | PASS (static) / BLOCKED (live browser) | Page and layer code are present; live rendering could not be exercised in the sandbox browser. |
| Inspect Jezero layers | PASS (static) / BLOCKED (live service) | Three Mars Trek visualization layers are wired and clearly described as context layers. |
| Select a location and inspect information | PASS (code-path/static) | Coordinate selection, known-feature matching, and status output are present. |
| Open a field note | PASS (local link audit) | Local field-note links resolve. |
| Add a location to MarsWalk | PASS (state/logic regression) | Base validation, stop import and provenance handling are checked. |
| Choose base, destination, objective | PASS (route tests/static) | Controls and state logic present. |
| Calculate route and inspect explanation | PASS (route engine) | Controlled route cases pass; model remains synthetic. |
| Check return/resource estimates | PASS (route tests) | Return-budget constraint is explicitly tested. |
| Generate report | PASS (source/static) | Current-state report + JSON export implemented. |
| Return to Atlas/change selection | PASS (local navigation/state code) | Handoff remains available; live browser transition not exercised. |

## Difficult and unusual cases

| Case | Status | Evidence / result |
|---|---|---|
| No location selected | PASS | Atlas handoff and MarsWalk report actions show recoverable empty-state behavior. |
| Identical start/destination | PASS | Added route-engine test; handled deterministically without fabricating distance. |
| Destination outside supported footprint | PASS | Base blocked; unsupported stops are rejected and reported. |
| Missing elevation/slope/terrain data | PASS | Cells with required terrain inputs missing remain unavailable, not zero-risk. |
| Unavailable map tile / network | PARTIAL | Application has visible error/fallback paths; live network outage simulation was blocked by browser policy. |
| Unreachable destination | PASS | Controlled test passes and import rejects disconnected cells. |
| Multiple stops | PASS | Route test passes; order is respected. |
| Reordered destinations | PASS | Route test plus provenance synchronization check pass. |
| Resource budget violation | PASS | Controlled test passes. |
| Outbound feasible / return infeasible | PASS | Controlled test verifies walkback constraint rejects it. |
| Empty route report | PASS | Export/print actions require a calculated route. |
| Very short route | PASS | Added controlled test. |
| Long route | PASS | Added route-geometry/distance test (>1 km). |
| Repeated route calculations | PASS | 50 repeated calculations remain deterministic in the controlled test. |
| Rapid real layer switching | NOT TESTED | Requires a functioning browser + networked Mars Trek session. |

## Science and data honesty check

### Real / externally sourced visualization data

- **NASA/JPL Mars Trek WMTS:** real external map visualization layers used by the Atlas. These are context/imagery products; they are **not** presented as MarsWalk local terrain measurements.
- **USGS Gazetteer reference coordinates:** used for known-location reference points such as Jezero.
- **NASA/PDS/mission documentation and field-note references:** cited as external scientific sources; they support explanatory content but are not automatically converted into per-cell MarsWalk inputs.

### Derived calculations implemented by the prototype

- Mars-sphere great-circle map measurement using the documented Mars radius used by the application.
- Local equirectangular coordinate mapping from the selected Mars coordinate into the demonstration model.
- Dijkstra route calculations over the embedded grid, including destination order and no diagonal corner cutting.
- Direction-aware modeled travel cost, terrain-cost/science objective variants, reverse-Dijkstra walkback map, return-budget feasibility and mission-report summaries.

These calculations are real software calculations, but their current local grid inputs are synthetic, so the outputs remain **demonstration model results**.

### Synthetic / illustrative values

- The 50×50, 100 m-spacing, roughly 5 km×5 km MarsWalk terrain/science grid.
- Per-cell elevation, p90 slope, sand, terrain cost/risk, science score, and mineral labels in that grid.
- The rover overlay shown in the demonstration planner.
- Demonstration resource/time budget and reserve settings.

### Unknown / unavailable in the current build

- A co-registered HiRISE/CTX terrain-derived local grid for this MarsWalk footprint.
- A Jezero THEMIS-derived loose-surface layer integrated into route calculation.
- CRISM-derived per-cell mineral/science values integrated into route calculation.
- A verified rover traverse mapped into the same grid.
- A loaded historical MEDA sol for the scenario.
- Validated Jezero radiation planning values.
- Operational human-EVA safety thresholds, suit consumables, communications, illumination, thermal and medical constraints.

## Spatial alignment and resolution findings

The global Atlas and the MarsWalk model are deliberately separate scales. Mars Trek supplies global/regional context in a Mars equirectangular coordinate system. The MarsWalk demonstration covers a small model footprint with 100 m cell spacing. That 100 m spacing is **not a claim that the NASA source data have 100 m validated resolution**. The current route model does not yet contain a co-registered raster stack built from released HiRISE/CTX, THEMIS and CRISM products.

When an Atlas coordinate enters MarsWalk, the original latitude/longitude remains visible. The software maps it to the demonstration grid and records the mapped cell and offset. That mapping is a model transform, not evidence that a measured NASA cell exists at the mapped location.

## Performance and security review

### Findings

- No obvious API keys, access tokens, passwords, private local paths, or embedded credentials were found by the final QA regression scan.
- The site remains static-hostable; there is no required backend or secret-bearing server component.
- Large local image payloads were reduced.
- Leaflet CSS is local. Leaflet JavaScript remains an external dependency.
- NASA Mars Trek imagery is intentionally external and therefore network-dependent.
- Google Fonts and some NASA-hosted images are external; system/local fallbacks should remain usable if those cosmetic resources fail, but a final offline rehearsal is recommended.

### Deployment implication

The site can be served from a normal static web host. However, the interactive Atlas requires outbound HTTPS access to the Mars Trek tile service and, in this revision, to the Leaflet JavaScript CDN. Do not present the Atlas as guaranteed offline functionality.

## Test summary

| Test group | Status | Result |
|---|---|---|
| Route-engine controlled tests | PASSED | 13 / 13 |
| Existing scientific/static audit | PASSED | 20 / 20 |
| New final-QA regression suite | PASSED | 51 / 51 |
| JavaScript syntax checks | PASSED | Local JS and extracted inline scripts parse with Node |
| Local link/asset checks | PASSED | Covered by static/QA suites |
| Live Chromium first-time journey | BLOCKED | Chromium navigation blocked by environment policy (`ERR_BLOCKED_BY_ADMINISTRATOR`) |
| Live Mars Trek service rendering | BLOCKED | Requires allowed browser/network execution |
| Tablet/mobile rendered-layout inspection | NOT TESTED | Source breakpoints reviewed; real viewport rendering still required |
| Screen reader / assistive-technology session | NOT TESTED | ARIA/focus changes are source-reviewed only |
| Deployment to a public host | NOT TESTED | No public deployment was performed from this environment |

## Remaining limitations

1. **Scientific inputs remain synthetic for MarsWalk.** This is the largest limitation and must remain visible during judging.
2. **No operational human safety validation.** A computed route is not an astronaut-safe route.
3. **No live environmental feed.** MEDA and radiation values remain unknown unless a specific historical dataset is deliberately loaded and documented.
4. **No browser-rendered QA in this environment.** A real-device/network rehearsal is mandatory before the event.
5. **Leaflet JavaScript remains CDN-dependent.** Vendor it locally if offline resilience is important.
6. **Mars Trek availability is external.** Network/service outages need to be demonstrated gracefully.
7. **Field-note citations are not a substitute for per-cell data integration.** Scientific reading content and route model inputs must remain conceptually separate.

## Prioritized next development phase

1. Run the included live-demo checklist on the actual presentation laptop and event network; record any visual/browser failures and fix them first.
2. Vendor Leaflet JavaScript locally to remove an avoidable CDN dependency.
3. Select an exact Jezero study box with overlapping released terrain and CRISM coverage; record product IDs and provenance.
4. Build a reproducible local processing pipeline that generates the route grid from measured/processed source products while preserving nodata and uncertainty.
5. Replace illustrative rover/science/environmental values only when exact source products and alignment are verified.
6. Re-run the same 13 route tests, 20 scientific/static checks, and 51 QA checks after every data-pipeline replacement.
7. Add real browser end-to-end tests once the deployment target and network behavior are known.

## Conclusion

The prototype is **more robust and more honest than New Design 2**, and its offline route logic/static integration pass the available automated checks. It should nevertheless be described as a **research and education prototype using real NASA map context plus a synthetic local route model**. Final challenge readiness depends on a successful network-enabled browser rehearsal on the actual demo hardware and on maintaining that data-status distinction throughout the presentation.
