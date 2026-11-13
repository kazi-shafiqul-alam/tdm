# Organizer Resource Update — 2026-11-13

This build was reviewed against the organizer-provided `shu. provided resource.docx` and each linked resource was visited before changes were made.

## Resource-by-resource decisions

1. **NASA/JPL Mars Trek** — already the correct source for the project’s Jezero HiRISE/CTX controlled basemaps and global MOLA + HRSC context. Kept as the primary visual map source and made its role clearer in the homepage, Atlas, MarsWalk, data audit, and README.
2. **USGS-NASA Planetary Geologic Mapping interactive maps** — added as the official standardized geologic-map reference in the homepage resources section, Atlas, MarsWalk references, and data audit. The site explicitly does **not** convert geologic colors/units into elevation or route cost.
3. **NASA Curiosity proposed path up Mount Sharp** — used as a route-communication reference, not as Jezero route data. MarsWalk keeps numbered base/stops and now adds directional chevrons along the generated route; the data audit explains the distinction.
4. **NASA Worldview** — explicitly labeled as an **Earth-observation reference only**. It is not used as Mars imagery, Mars terrain, Mars weather, or Mars routing data.
5. **Mars Perseverance Raw Images Gallery** — added as a direct Jezero surface-imagery reference from the homepage resources section, Jezero field note, and data audit.

## Files changed

- `index.html`, `app.css` — new organizer-resource section and updated navigation/section numbering.
- `atlas.html`, `atlas.css` — added Mars Trek + USGS/NASA geologic-map resource links and provenance wording.
- `marswalk.html`, `marswalk.js` — added organizer-resource references and directional route chevrons inspired by NASA’s annotated route-map example.
- `data-audit.html`, `audit.css` — added a complete organizer-resource ledger and clarified what is used vs. contextual/reference-only.
- `field-jezero.html` — added Perseverance raw-image gallery access.
- `field-gale.html` — added the official Curiosity proposed-route example.
- `README.md` — documented the new resource integration and data-use distinction.

## Validation

- JavaScript syntax checked with Node (`app.js`, `atlas.js`, `marswalk.js`).
- All HTML files parsed successfully with Python’s HTML parser.
- The five organizer URLs were verified as reachable/current during the update.

The numerical MarsWalk terrain pipeline is unchanged: it still requires the official Jezero CTX DTM and does not fabricate a synthetic production terrain fallback.

## MarsWalk follow-up refinement

After reviewing whether the custom MarsWalk map should be replaced by the organizer-provided NASA interactive map, the existing architecture was retained. MarsWalk already renders official NASA/JPL Mars Trek WMTS tiles directly. The follow-up change therefore focuses on provenance rather than replacement: an on-map source panel, dynamic basemap labeling, direct NASA Mars Trek / USGS geology links, and a visual data-lineage explanation now separate official source data from Tour de Mars routing and EVA-model logic.
