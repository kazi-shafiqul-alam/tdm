# Tour de Mars — New Design 3 Test Report

> **Historical note:** This report records the project state before the Problem 1 real-terrain pipeline was added. For the current terrain architecture and validation status, see `REAL_TERRAIN_IMPLEMENTATION.md` and `PROBLEM1_TEST_REPORT.md`.


This report records the reproducible final-QA tests executed for New Design 3. A PASS means the named local automated check actually ran successfully. Browser/network items that could not be executed are marked BLOCKED or NOT TESTED rather than inferred from source code.

## 1. Route-engine controlled tests — PASS (13/13)

Run:

```bash
node tests/route-tests.js
```

Cases:

1. Valid base + one destination — PASS
2. Multiple destinations — PASS
3. Reordered destinations — PASS
4. Unreachable / blocked destination — PASS
5. Missing terrain is treated as unavailable — PASS
6. Configured resource-budget violation — PASS
7. Outbound feasible but return infeasible — PASS
8. Competing terrain-cost and science-priority objectives — PASS
9. Reset / replan determinism — PASS
10. Identical start and destination — PASS
11. Very short reachable round trip — PASS
12. Long reachable route geometry — PASS
13. Fifty repeated route calculations remain deterministic — PASS

These tests exercise the routing logic against the embedded **synthetic demonstration grid**. They validate program behavior, not human Mars-EVA safety or the scientific validity of the synthetic values.

## 2. Scientific/static integration audit — PASS (20/20)

Run:

```bash
python3 tests/static-audit.py
```

Checks include local navigation/assets, duplicate IDs, missing-data safeguards, corrected landmark coordinates, Mars-specific selection export, source-registry integrity, scientific-label safeguards and audit-document presence.

## 3. Final QA regression suite — PASS (51/51)

Run:

```bash
python3 tests/qa-regression.py
```

Coverage includes:

- language/title/viewport metadata and unique IDs;
- local asset/reference integrity across the principal pages;
- visible focus styling and mobile navigation accessibility state;
- Atlas validation/error status, synthetic-footprint disclosure and map-library failure handling;
- MarsWalk import rejection, stale-provenance clearing, reorder/remove synchronization and failed-import behavior;
- report JSON export and print actions;
- simulation/missing-data language;
- source-registry classifications;
- basic secret/private-path scans;
- optimized local-image size thresholds.

## 4. JavaScript syntax — PASS

Node parser checks pass for:

- `site.js`
- `detail.js`
- the extracted inline script from `live-map.html`
- the extracted inline script from `marswalk.html`

## 5. Browser / external-service execution — BLOCKED

A Playwright/Chromium session was attempted against both a local HTTP server and local file URLs. Chromium returned `ERR_BLOCKED_BY_ADMINISTRATOR` in this execution environment, so the following are **not counted as passed**:

- actual desktop/tablet/mobile rendering;
- real click-through of the entire judge journey;
- live NASA/JPL Mars Trek tile loading and layer switching;
- simulated external-network outage behavior in a real browser;
- print-dialog visual output;
- assistive-technology/screen-reader behavior.

These checks must be performed on the actual demo/deployment machine.

## 6. External source verification performed separately

During the audit, current public documentation was retrieved for NASA/JPL Mars Trek, the USGS planetary nomenclature resource, PDS CRISM, PDS MEDA, THEMIS and MOLA. Some external pages/DOI endpoints could not be fetched reliably by the available web/runtime path, so this report does not claim perpetual availability of every citation.

## Status vocabulary

- **PASSED:** test executed and matched expected result.
- **FAILED:** test executed and did not match expected result.
- **BLOCKED:** execution environment prevented the test.
- **NOT TESTED:** test was outside the tools/environment available in this pass.

For issues, fixes and remaining limitations, see `FINAL_QA_REPORT.md`.
