# Tour de Mars — New Experience (2026)

A ground-up redesign of the Tour de Mars website and MarsWalk planner. The nine earlier prototype ZIPs were used as reference only; this build uses a new visual system and a new MarsWalk architecture.

## Run it

Serve the folder over HTTP (recommended because the browser terrain loader uses modules and range requests):

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/`.

## MarsWalk real-terrain modes

MarsWalk does **not** contain a synthetic production terrain fallback.

1. **Bundled real terrain (best for demos):** download the official USGS Mars 2020 Jezero CTX DTM named `JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif`, then run:

   ```bash
   python tools/build_terrain.py /path/to/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif
   ```

   This replaces `data/terrain-grid.js` with a derived 2,500-cell real-terrain grid. Commit that small derived file with the site so judging does not depend on venue internet.

2. **Browser live load:** press **Retry official DEM** in MarsWalk. The app uses GeoTIFF.js and the official USGS/PDS-hosted CTX DTM to build the same 100 m grid and caches it in the browser.

3. **Local GeoTIFF:** if cross-origin range requests are blocked, press **Load local GeoTIFF** and choose the official CTX DTM from disk. The same calculations run locally in the browser.

## Numerical model

- 5 × 5 km Jezero mission zone; 50 × 50 cells at 100 m.
- Elevation from the CTX DTM; slope calculated at a 20 m working resolution then summarized per cell.
- Cell passability requires ≥80% elevation coverage and p90 slope ≤25°.
- Terrain cost = 80% normalized p90 slope + 20% normalized local relief.
- Eight-neighbor route graph with diagonal corner-cutting blocked.
- Direction-aware walking time responds to signed elevation grade and terrain cost.
- Four transparent objectives: Fast, Safe, Balanced, Science.
- Oxygen walkback rule is evaluated along the route using user-adjustable scenario inputs.

Oxygen and suited-walking values are **not NASA flight standards or medical guidance**. Science context in this build is **not CRISM mineral abundance**; it is a contextual mission-interest layer and is labeled accordingly throughout the UI.

## Main files

- `index.html` — redesigned story / project site.
- `marswalk.html`, `marswalk.js`, `marswalk.css` — mission-control planner.
- `data-audit.html` — provenance and model disclosure.
- `data/terrain-grid.js` — optional precomputed *real* terrain grid; null until built.
- `tools/build_terrain.py` — offline real-DTM preprocessor.

## External data endpoints used

- NASA/JPL Mars Trek: `https://trek.nasa.gov/mars/`
- USGS Mars 2020 CTX DTM page: `https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_hi_rise_and_ctx_digital_terrain_model_mosaic`
- CTX DTM GeoTIFF: `https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif`

## Demo reliability recommendation

Before judging, run the offline terrain builder and ship the derived `data/terrain-grid.js`. That keeps the map imagery online when available, while the numerical route planner remains functional even if the venue connection cannot reach the DEM host.

## Field notes and 2026-10-30 visual update

The homepage now links to four full scientific field-note pages:

- `field-jezero.html`
- `field-gale.html`
- `field-olympus.html`
- `field-valles.html`

They reproduce the supplied field-note content, including observation basis, uncertainties, NASA/PDS resources, and references. Each page also displays a prominent disclosure that the note is an AI-assisted remote research synthesis using NASA spacecraft/rover observations, archived mission data, and cited peer-reviewed literature — not a physical field visit.

The supplied `gale crater.jpg` and `olympus mons.jpg` are included locally as the Gale and Olympus feature images. Jezero and Valles use credited NASA/JPL imagery from official NASA/JPL image hosts. The homepage system map uses PIA23976 (Jezero regions), and the MarsWalk promo uses PIA26754 (Perseverance orbital route context).

The Tour de Mars team emblem from the earlier prototype has been restored in the site branding. The NASA Space Apps Challenge logo is linked to the official Space Apps website from the homepage and field-note branding.

Team role labels follow the requested final wording. The supplied project materials do not contain actual email addresses, so the known team contact handles from the prior prototype are retained rather than inventing email addresses.


## Organizer-provided resource integration (2026-11-13)

The latest organizer resource pack is now represented explicitly in the site:

- **NASA/JPL Mars Trek** — remains the visual basemap source for Jezero HiRISE/CTX and global MOLA + HRSC imagery.
- **USGS-NASA Planetary Geologic Mapping interactive maps** — linked from Atlas, MarsWalk, and the data audit as standardized geologic context. Geologic-map colors are not treated as elevation or route cost.
- **NASA Curiosity proposed-path map** — used as a route-communication reference. MarsWalk now adds directional chevrons to its computed route and keeps numbered stops visible on the terrain backdrop.
- **NASA Worldview** — explicitly labeled as an Earth-observation visualization reference only; it is not used as Mars data.
- **Mars Perseverance Raw Images Gallery** — linked from the Jezero field note and resource section for surface-level context.

Organizer resource URLs:

- `https://trek.nasa.gov/mars/`
- `https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars`
- `https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/`
- `https://worldview.earthdata.nasa.gov/`
- `https://mars.nasa.gov/mars2020/multimedia/raw-images/`

The organizer document also notes that NASA does not endorse non-U.S.-Government entities and that participants must comply with data-use parameters on non-U.S.-Government sites.

### MarsWalk provenance UI refinement

MarsWalk now makes the data/application boundary visible directly on the map: the selected visual basemap is labeled as **NASA/JPL Mars Trek**, terrain is labeled as the **USGS/NASA Mars 2020 CTX DTM**, and route/EVA analysis is labeled as the **Tour de Mars project model**. Direct links to NASA Mars Trek and USGS Mars geology are available from the map without replacing the custom MarsWalk experience.
