# Tour de Mars — Live Judge Demo Checklist

Run this checklist on the **actual presentation laptop, browser, network and deployed URL**. Do not treat the automated source tests as a substitute for this rehearsal.

## Before the event

- [ ] Serve/deploy the folder over HTTP(S); do not open pages only through `file://`.
- [ ] Open `index.html` in the exact browser you will use for judging.
- [ ] Check browser console for errors on Home, Atlas, a field note, Data Audit and MarsWalk.
- [ ] Confirm NASA/JPL Mars Trek tiles load on the event network.
- [ ] Switch through all Atlas layers several times and verify controls remain responsive.
- [ ] Confirm the Leaflet JavaScript CDN is reachable, or vendor Leaflet locally before the demo.
- [ ] Test at desktop width and at least one narrow/mobile width for overflow/cropping.
- [ ] Navigate the primary controls with keyboard only and verify focus is visible.
- [ ] Confirm external field-note/reference links needed in the presentation open in a private window.
- [ ] Run all local automated tests:
  - `node tests/route-tests.js`
  - `python3 tests/static-audit.py`
  - `python3 tests/qa-regression.py`

## Full judge journey

- [ ] Landing page explains the project in under 20 seconds.
- [ ] Open the Atlas and identify Jezero plus another featured region.
- [ ] Select a coordinate and inspect its location/source panel.
- [ ] Open a field note and return to the Atlas.
- [ ] Choose a valid base inside the dashed MarsWalk demo footprint.
- [ ] Add at least two stops; include one stop the model rejects so you can show transparent error handling if useful.
- [ ] Send the selection to MarsWalk and verify the original coordinates remain visible.
- [ ] Reorder destinations and confirm the report order changes too.
- [ ] Compare at least two route objectives.
- [ ] Show distance, modeled duration, resource budget and return reserve.
- [ ] Explain that the route grid is synthetic and the NASA map context is real.
- [ ] Export the mission-report JSON and confirm the downloaded file opens.
- [ ] Print/preview the report if this is part of the presentation.
- [ ] Return to the Atlas, change the selection, and re-enter MarsWalk without stale values.

## Failure rehearsal

- [ ] Temporarily disable network and verify the Atlas shows a useful unavailable/error state rather than a fake success.
- [ ] Enter invalid coordinates and verify an explicit error message appears.
- [ ] Try a base outside the demo footprint and verify it is rejected rather than substituted.
- [ ] Try an unreachable/unsupported stop and verify its reason appears.
- [ ] Try a resource budget that cannot support the return and verify the route is rejected/explained.
- [ ] Clear/reset the plan and verify old imported coordinates do not remain in the report.

## Science communication reminders

- [ ] Say **“NASA/JPL Mars Trek visualization”** for the real map context.
- [ ] Say **“synthetic demonstration routing grid”** for the current MarsWalk local inputs.
- [ ] Say **“lowest modeled terrain cost”**, not “safest route.”
- [ ] Do not call MEDA values live unless a documented historical sol is actually loaded.
- [ ] Do not imply NASA endorsement, operational readiness or astronaut safety certification.
- [ ] If asked about a missing value, show it as unknown rather than filling it with zero.

## Backup plan

- [ ] Keep the entire site folder and ZIP on the laptop.
- [ ] Keep screenshots/video of the complete Atlas→MarsWalk journey available in case venue internet fails.
- [ ] Know where `FINAL_QA_REPORT.md`, `DATA_INVENTORY.md`, `TEST_REPORT.md`, and `data-source-registry.json` are located for judge questions.
