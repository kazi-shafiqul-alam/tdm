# Tour de Mars

<p align="center">
  <img src="./favicon.png" alt="Tour de Mars astronaut cat mascot" width="240" />
</p>

### Explore Mars. Plan the walk. Understand the risk.

**Tour de Mars** is a web-based Mars exploration and extravehicular activity (EVA) planning prototype by **Team 6bit_Larry**, developed for the **2026 NASA Space Apps Challenge**.

**Challenge:** [Interplanetary Survival Guide: Martian Map](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/)  
**Live Demo:** [https://tour-de-mars.vercel.app/](https://tour-de-mars.vercel.app/)  
**MarsWalk Planner (Live):** [https://tour-de-mars.vercel.app/marswalk.html](https://tour-de-mars.vercel.app/marswalk.html)  
**240s Presentation Video:** [https://youtu.be/hznaf08VCDU](https://youtu.be/hznaf08VCDU)  
**Source Repository:** [https://github.com/pengvil/Tour-de-Mars](https://github.com/pengvil/Tour-de-Mars)  

> **Deployment note:** The live application is hosted on Vercel. For local execution and offline demonstration, follow the instructions in the [Getting started](#getting-started) section below.

> **Terrain status (checked November 14, 2026):** The repository includes the precomputed Jezero CTX terrain grid in `data/terrain-grid.js`. It contains **2,500 cells**, of which **2,487 pass** the project's modeled coverage/slope thresholds. Re-running `tools/build_terrain.py` on the supplied CTX raster reproduced the same grid cells and statistics. This is a reproducibility check against the supplied raster, not independent certification of its original download provenance.

## Overview

What if astronauts could plan a Marswalk using genuine spacecraft imagery, compare possible routes, identify scientific destinations, and estimate whether their modeled oxygen reserve would allow a return to base?

Tour de Mars explores that question through a set of connected experiences:

- **MarsWalk:** an interactive EVA mission-planning interface centered on Jezero Crater.
- **Mars Atlas:** a global visual map of notable Martian locations.
- **Field Notes:** research-based explorations of Jezero Crater, Gale Crater, Olympus Mons, and Valles Marineris.
- **Data Audit:** source attribution, computational assumptions, limitations, and reproducibility information.

The project combines **official NASA/JPL map imagery**, a **bundled terrain grid derived from the USGS/NASA Jezero CTX elevation product**, and **our own route-planning and life-support scenario models**. The terrain pipeline can also regenerate the grid from the original GeoTIFF. It is an educational and research prototype, **not** an operational astronaut navigation system.

## Features

| Feature | What it does |
| --- | --- |
| NASA Mars Trek map | Displays Jezero HiRISE and CTX orbital mosaics and global MOLA/HRSC context using real WMTS tiles. |
| Interactive mission points | Choose a base camp, add science stops, inspect map coordinates, and work inside a 5 × 5 km Jezero planning area. |
| Terrain processing | Loads a bundled CTX-derived 50 × 50 grid; computes elevation, slope, relief, coverage, and modeled terrain-cost summaries from the official DTM. |
| Four route objectives | Compare **Fast**, **Safe**, **Balanced**, and **Science** routing with different optimization weights. |
| Oxygen/walkback model | Estimates scenario-dependent walking time, oxygen usage, and return-to-base reserve. |
| Route comparison and replay | Inspect alternatives, replay the planned traverse, and examine model outcomes. |
| Export/report | Export mission-planning results and inspect the reported source and model assumptions. |
| Research content | Explore planetary geology through the Mars Atlas and scientific Field Notes. |

### How the route planner works

MarsWalk loads a precomputed CTX-derived terrain grid for a **5 km × 5 km** planning zone divided into **50 × 50 cells** (2,500 cells, each 100 m wide). The source DTM has approximately 20 m posts; `tools/build_terrain.py` reprojects the elevation raster to a 20 m working grid, then computes 100 m cell summaries for an eight-neighbor route graph.

**Reproduced grid statistics:** 2,500 cells with data, **2,487 modeled passable** and 13 outside the passability limits; **median cell p90 slope 3.193°**; elevation range (cell means) **−2,622.839 m to −2,450.936 m**. These numbers describe the processed 5 × 5 km study area and model thresholds; they are **not** mission-certified hazard or safety measurements.

The implementation uses the following disclosed rules and assumptions:

- Terrain summaries include slope and relief. A cell is considered passable when it meets the configured coverage and slope thresholds (at least **80% elevation coverage** and **90th-percentile slope ≤ 25°** in the documented version).
- Routing adjusts cost weights depending on whether the user prioritizes time, modeled terrain safety, balance, or contextual scientific interest.
- The **Science** objective currently favors **named mission-interest waypoints**. It does **not** analyze measured CRISM mineral abundance.
- The oxygen/walkback model uses **user-adjustable scenario assumptions**, not NASA flight-certified consumption rates or operational limits.

**Important:** A route is *not* terrain-validated merely because NASA satellite imagery appears beneath it. The MarsWalk status must display **REAL TERRAIN READY**, with the bundled or successfully processed official CTX DTM loaded. If terrain fails to load, the explicitly labeled *illustrative/map-only rehearsal* is not based on measured slopes or terrain hazards. Even with CTX-derived measurements, the calculated passability and safety scores are simplified **model outputs**, not a certified safe route.

## NASA data and scientific provenance

| Source | How the project uses it | Status |
| --- | --- | --- |
| [NASA/JPL Mars Trek](https://trek.nasa.gov/mars/) — [WMTS service documentation](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) | Live orbital imagery tiles inside the custom MarsWalk and Atlas renderers. | **Direct integration** |
| **MRO HiRISE — Jezero controlled orthomosaic** | Detailed orbital image basemap for Jezero exploration. | **Direct WMTS map layer** |
| **MRO CTX — Jezero controlled orthomosaic** | Wider-area Jezero orbital image basemap. | **Direct WMTS map layer** |
| **MOLA / Mars Express HRSC blended color-shaded product** | Global Mars visual and relief context; the HRSC component originates with ESA's Mars Express mission. | **Direct WMTS map layer** |
| [USGS/NASA Mars 2020 Jezero CTX DTM](https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif) | Numerical elevation source for the derived grid: elevation, p90 slope, relief, coverage, modeled passability, and terrain-cost calculations. | **Derived 2,500-cell grid bundled in the repository** |
| [USGS/NASA interactive geologic maps](https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars) | Geologic context and interpretation. | **Reference / external map** |
| [Perseverance raw-image gallery](https://mars.nasa.gov/mars2020/multimedia/raw-images/) | Ground-level Jezero context for research and visual comparisons. | **Reference** |
| [Curiosity's proposed route up Mount Sharp](https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/) | An example of presenting annotated traverses and science destinations; not route input for Jezero. | **Design/reference** |
| [NASA Worldview](https://worldview.earthdata.nasa.gov/) | Earth-observation visualization reference; **not** a Mars imagery/terrain/weather service. | **Reference only** |

> **What is not yet a measured route input:** CRISM mineral abundance, THEMIS thermal hazards, and Perseverance MEDA weather data. These may be discussed as scientific context or future integrations, but the current routing engine must not be described as processing them.

NASA/JPL, USGS, and ESA are credited for their respective data products. Tour de Mars is an independent Space Apps project; its presence in the challenge does **not** imply NASA or agency endorsement. Respect the original hosts' licensing, attribution, and data-use requirements.

## Getting started

You can explore the project immediately via the live web deployment or run it locally:

- **Live Website:** [https://tour-de-mars.vercel.app/](https://tour-de-mars.vercel.app/)
- **MarsWalk Mission Control:** [https://tour-de-mars.vercel.app/marswalk.html](https://tour-de-mars.vercel.app/marswalk.html)
- **240-Second Presentation Video:** [https://youtu.be/hznaf08VCDU](https://youtu.be/hznaf08VCDU)

The site is a **static HTML/CSS/JavaScript** application. There is no build step and nothing to install to run the website itself.

### 1. Run locally

**Requirements:** [Git](https://git-scm.com/), a modern browser (Chrome, Edge, Firefox), an internet connection (the map tiles stream from NASA Mars Trek), and any one of Python 3, Node.js, or VS Code for the local server.

Clone the repository and start a local server from the project root (the folder that contains `index.html`):

```bash
git clone https://github.com/pengvil/Tour-de-Mars.git
cd Tour-de-Mars
```

Then use **one** of these:

```bash
# Option A: Python (macOS/Linux)
python3 -m http.server 8080

# Option A: Python (Windows)
py -m http.server 8080

# Option B: Node.js
npx serve -l 8080 .
```

**Option C: VS Code.** Install the *Live Server* extension, open the `Tour-de-Mars` folder, right-click `index.html`, and choose **Open with Live Server**.

Open [http://localhost:8080](http://localhost:8080) (Live Server uses its own port, usually 5500) and select **MarsWalk**, or go straight to [http://localhost:8080/marswalk.html](http://localhost:8080/marswalk.html).

Use a local HTTP server rather than double-clicking the HTML files; opening them directly via `file://` can block scripts and data loading. To stop the server, press `Ctrl + C` in the terminal.

The map imagery loads from NASA Mars Trek over the internet. Browser-based terrain loading may additionally require access to the USGS/PDS GeoTIFF host and the GeoTIFF.js module CDN.

### 2. Enable verified terrain routing (recommended)

**Already done in this repository:** `data/terrain-grid.js` is populated from the Jezero CTX GeoTIFF. On a successful load, MarsWalk displays **REAL TERRAIN READY** and **Bundled precomputed CTX grid**. You do **not** need to regenerate the grid just to run the project.

To **rebuild or audit the grid**, use the original Jezero CTX DTM and the included processing script.

Install the preprocessing dependencies:

```bash
python -m pip install -r requirements-terrain.txt
```

Download the official [Jezero CTX DTM GeoTIFF](https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif) if you do not already have it (it may be saved as `.tif` or `.tiff`), then run from the repository root (`Tour-de-Mars/`):

```bash
python tools/build_terrain.py "/path/to/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif"
```

This generates/replaces the derived 50 × 50 grid in `data/terrain-grid.js`. **Use only a genuine CTX DTM as input.** The script computes cell statistics from the supplied TIFF rather than inventing synthetic elevation. Verify source provenance, output, and MarsWalk's real-terrain status before presenting the results as CTX-derived.

**For deployment:** Commit `data/terrain-grid.js` (the compact output). Keep the source GeoTIFF as a local preprocessing input; **do not commit or deploy it with the static website**.

### 3. Alternative terrain-loading methods

If the build supports them, MarsWalk also provides:

1. **Retry official DEM:** request the CTX GeoTIFF from the configured USGS/PDS-hosted endpoint and process it in the browser using GeoTIFF.js.
2. **Load local GeoTIFF:** choose a previously downloaded *official* CTX DTM from disk when cross-origin or range requests prevent online loading.

If terrain loading fails, the orbital map may still render, but **verified terrain-based route calculations should not be claimed**. The Quick Start panel updates its message when the real grid is ready, and its map-only sample remains explicitly labeled as illustrative when data is unavailable.

## Project structure

```text
.
├── index.html                 # Project homepage and team
├── marswalk.html              # EVA planning interface
├── marswalk.js                # Mars Trek tiles, terrain handling, routing, replay
├── marswalk.css               # MarsWalk styles
├── atlas.html                 # Mars Atlas
├── atlas.js                   # Global Mars Trek imagery and map behavior
├── data-audit.html            # Data sources and limitations
├── field-jezero.html          # Jezero Crater field note
├── field-gale.html            # Gale Crater field note
├── field-olympus.html         # Olympus Mons field note
├── field-valles.html          # Valles Marineris field note
├── assets/                    # Local site imagery and team assets
├── data/
│   └── terrain-grid.js        # Bundled CTX-derived 50 × 50 terrain grid
├── tools/
│   └── build_terrain.py       # Offline terrain preprocessing
├── requirements-terrain.txt   # Python terrain-preprocessing dependencies
└── README.md
```

The exact directory layout of the GitHub `main` branch may differ slightly from the tree above. The README lives at the repository root, alongside `index.html`.

## Technologies

- **Frontend:** HTML5, CSS3, vanilla JavaScript, Canvas-based interactive mapping.
- **NASA imagery:** NASA/JPL Mars Trek **Web Map Tile Service (WMTS)**.
- **Numerical terrain input:** USGS/NASA Mars 2020 CTX Digital Terrain Model (GeoTIFF).
- **Raster processing:** [GeoTIFF.js](https://github.com/geotiffjs/geotiff.js) in the browser; [Rasterio](https://rasterio.readthedocs.io/) and [NumPy](https://numpy.org/) for offline preprocessing.
- **Version control and deployment:** Git/GitHub and Vercel.
- **Planning algorithms:** custom JavaScript terrain-cost route search, waypoint objectives, and modeled oxygen walkback checks.

## Team — 6bit_Larry

| Member | Project role |
| --- | --- |
| **MD. Zahidul Islam Navil** | Team Leader & Developer |
| **Shuaib Mahfooz** | Researcher & Developer |
| **Kazi Shafiqul Alam** | Researcher & Developer |
| **Sayed Shahriar Mustafa** | Research Assistant |
| **Shihab Uddin Bhuiyan** | QA & Testing Assistant |
| **Md. Ishtiaque Hossain** | QA & Testing Assistant |

The roles above describe the team's areas of work; they are not intended to claim individual authorship of particular source files or scientific findings without an accompanying contribution record.

## AI assistance and transparency

**OpenAI ChatGPT** was used as a development-assistance tool for research organization, code drafting and review, UI iteration, troubleshooting, documentation, technical explanations, and presentation preparation. Representative requests included reviewing organizer-provided NASA resources, assessing whether the custom map should be replaced by Mars Trek, and designing a more reliable demonstration.

**Anthropic Claude** was also used to assist with presentation and slide preparation. Team members should separately disclose any other AI tools used in final code, imagery, audio, or video. AI-generated visual/audio assets included in global judging materials must be labeled and disclosed according to the submission form requirements.

AI assistance was applied to public scientific descriptions, project source code, draft content, and team-provided instructions. **AI outputs are not NASA measurements**, are not independently validated scientific results, and are not used as a live generative-AI route engine.

The Field Notes are **AI-assisted literature syntheses**, not records of physical field visits. Their source papers and limitations are listed on the individual pages.

## Scientific references

Selected peer-reviewed papers already cited by the site's Field Notes:

1. Brown, A. J., Viviano, C. E., & Goudge, T. A. (2020). [Olivine-Carbonate Mineralogy of the Jezero Crater Region](https://doi.org/10.1029/2019JE006011). *Journal of Geophysical Research: Planets*.
2. Mangold, N., et al. (2021). [Perseverance rover reveals an ancient delta-lake system and flood deposits at Jezero crater, Mars](https://doi.org/10.1126/science.abl4051). *Science*.
3. Farley, K. A., et al. (2022). [Aqueously altered igneous rocks sampled on the floor of Jezero crater, Mars](https://doi.org/10.1126/science.abo2196). *Science*.
4. Grotzinger, J. P., et al. (2014). [A habitable fluvio-lacustrine environment at Yellowknife Bay, Gale crater, Mars](https://doi.org/10.1126/science.1242777). *Science*.
5. Bleacher, J. E., et al. (2007). [Olympus Mons, Mars: Inferred changes in late Amazonian aged effusive activity from lava flow mapping of Mars Express High Resolution Stereo Camera data](https://doi.org/10.1029/2006JE002826). *Journal of Geophysical Research: Planets*.
6. Andrews-Hanna, J. C. (2012). [The formation of Valles Marineris: 1. Tectonic architecture and the relative roles of extension and subsidence](https://doi.org/10.1029/2011JE003953). *Journal of Geophysical Research: Planets*.

These papers support the **scientific background in the Field Notes**; they are not directly ingested by MarsWalk's numerical route planner. Additional mission archives, publications, map credits, and image sources are documented on the relevant Field Note pages and in the [Data Audit](data-audit.html).

## Scope, limitations, and roadmap

**Current scope:** a proof-of-concept map and EVA planning application. NASA imagery is authentic, and the bundled terrain grid contains CTX-derived elevation and slope summaries that reproduced from the supplied GeoTIFF. Measured terrain is available only when that grid is actually loaded. Oxygen, pace, science-interest scoring, passability thresholds, and route weights are scenario or heuristic models.

**Potential next steps:**

- Validate the CTX-derived terrain grid and route outputs against reference terrain profiles and repeatable test cases.
- Integrate additional *verified* science/environmental layers (for example CRISM, THEMIS, and MEDA) only with correct data lineage, resolution, units, and timestamps.
- Improve operational constraints such as communications, illumination, EVA duration, return reserves, and uncertainty.
- Add broader automated browser tests, accessibility checks, and mobile QA.

**Safety statement:** Tour de Mars is not a flight-certified EVA navigation tool, a Mars weather service, or medical/life-support guidance.

## Credits and usage

- Planetary images, mosaics, elevation datasets, and mission descriptions retain their **NASA/JPL, USGS, ESA, and original instrument-team** attributions.
- Third-party photography, graphics, templates, and other assets must be used only within their applicable license/permission terms and credited to their original creators.
- NASA and the NASA Space Apps Challenge do **not** endorse this independent student project.
- The public source repository and its assets may have different reuse terms. **Do not assume the project has a software license unless the repository includes a `LICENSE` file.**

---

**Built by Team 6bit_Larry for the 2026 NASA Space Apps Challenge — The Next Frontier.**
