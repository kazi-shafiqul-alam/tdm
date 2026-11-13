# Tour de Mars — 240-second local-judging video

**Challenge:** [Interplanetary Survival Guide: Martian Map](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/?tab=resources)  
**Team:** 6bit_Larry  
**Demo URL once deployed:** `/marswalk.html?demo=1`  
**Use the real CTX DEM path for the final recording whenever possible.** The fallback rehearsal is explicitly *illustrative*; it cannot demonstrate measured slope, hazards or verified safe routes.

## Before recording

1. Extract the ZIP to a new folder. Do not record from the older `main` or `test` Vercel deployments until this build is deployed there.
2. On Windows double-click `start_demo.bat` (Python required), or in that folder run `python -m http.server 8080` and open `http://localhost:8080/marswalk.html?demo=1` in a desktop browser. You can also deploy the folder to a **new Vercel preview**; the URL will be `<your-domain>/marswalk.html?demo=1`.
3. Check the **source badge** before narration. If it says **REAL TERRAIN READY**, the route is CTX-derived. If it says **REHEARSAL / NOT TERRAIN-VERIFIED**, demonstrate the UI and oxygen *scenario* only; NEVER claim that route slopes or hazard avoidance have been validated.
4. For a real terrain demo, first obtain the official Jezero CTX GeoTIFF, then run `python tools/build_terrain.py /path/to/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif`. Reload the site. `data/terrain-grid.js` must stop being `null`, and the map must display **REAL TERRAIN READY**. This real dataset is **not** included in the ZIP.
5. In rehearsal mode, the **Load Demo EVA** button creates a sample base and two stops automatically, calculates a *geometric* walkback and model oxygen scenario, populates the comparison table and enables Replay/JSON. Online Mars Trek basemap tiles should load when internet access allows; if not, the UI shows a labeled geographic coordinate grid, **not fabricated NASA imagery**.
6. Use 1600×900 or 1920×1080 if possible. Use browser full screen, enlarge font if needed, record screen and microphone. Put the final uploaded video link on the NASA/Local Lead submission pages as instructed.

## Suggested narration + actions (maximum 240 seconds)

### 0:00–0:40 — Team, challenge, and the problem

**Show:** Homepage hero, brief, then scroll to the MarsWalk call-to-action.  
**Say:** “We are team 6bit_Larry, working on NASA Space Apps Challenge 2026: *Interplanetary Survival Guide — Martian Map*. Our team is MD. Zahidul Islam Navil, Shuaib Mahfooz, Kazi Shafiqul Alam, Syed Shahriar Mustafa, Shihab Uddin Bhuiyan, and Md Ishtiaque Hossain. An astronaut on Mars needs more than a picture of a crater. They need to choose science destinations, understand terrain, and have a clear plan for getting home.”

### 0:40–1:20 — Our solution and authoritative sources

**Show:** Enter MarsWalk, point to the map provenance/source panel and basemap selector.  
**Say:** “We built MarsWalk, a custom mission-planning interface focused on Jezero Crater. The visual map is connected to NASA/JPL Mars Trek's WMTS imagery from HiRISE, CTX, and MOLA/HRSC. Separately, our verified-terrain workflow uses the USGS/NASA Mars 2020 CTX Digital Terrain Model. We do not derive elevation from image brightness. Our original contribution is the mission-point interface, route objectives, and walkback oxygen model.”

### 1:20–2:25 — Working application

**Show:** Click **Load Demo EVA** (if not already loaded). Point to base B and stops S1/S2. Select **Fast**, **Safe**, **Balanced**, **Science**, click **Compare All Four**, show the table.  
**Say if REAL TERRAIN READY:** “The verified DEM is converted into 100-meter cells, each with elevation, slope and passability summaries. We compare four routing objectives: Fast, Safe, Balanced, and Science. Science uses contextual mission-interest waypoints; it is not a measured CRISM mineral-abundance map.”  
**Say if REHEARSAL MODE:** “This is a clearly labeled rehearsal of the interactive workflow. The base, stops, route geometry and configurable oxygen calculation work, but because the official CTX elevation file is not loaded here, slope and terrain hazards are deliberately marked unverified. The scientifically grounded route comparison is enabled once that dataset is processed.”

### 2:25–3:18 — Return reserve, replay, and transparency

**Show:** Life-support settings, walkback margin, **Replay walk**, then **Export JSON** or **Print report**.  
**Say:** “MarsWalk models oxygen already consumed and the amount needed for the return to base, retaining an adjustable reserve. These are scenario assumptions, not flight-certified NASA life-support limits. The route can be replayed and exported with its assumptions and source status, so the calculation can be inspected rather than trusted as a black box.”

### 3:18–4:00 — Science, relevance, and closing

**Show:** Atlas or Jezero field note, then Data Audit and official resource links. End on MarsWalk map.  
**Say:** “Our NASA data sources support the map; the Tour de Mars layer turns those sources into decisions. The data audit distinguishes measured imagery and elevations from assumptions and future data layers such as CRISM, THEMIS, and MEDA. This is a prototype for planning a science-rich Marswalk, not operational astronaut navigation. Our next step is to validate every route against the actual CTX terrain and extend the science and environmental data integration. Thank you.”

## Mandatory checks from the Bangladesh participants guide

- The 240-second local video should be **under four minutes**, show a **working demo**, name **NASA data usage explicitly**, and introduce the team (subject to the guide's under-18 privacy rule).
- Credit any third-party footage/graphics and all AI assistance. Add English subtitles.
- Test the YouTube link in an incognito window. Submit to the Local Lead's form and Drive folder according to their confirmed schedule.

## What is and is not demonstrated

| Feature | Real verified CTX available | Rehearsal mode without CTX |
|---|---|---|
| Interactive coordinate map & points | Yes | Yes |
| NASA/JPL WMTS imagery (network needed) | Yes, when tiles load | Yes, when tiles load; otherwise coordinate grid |
| Distance & oxygen scenario | Yes (modeled) | Yes (flat-ground modeled / illustrative) |
| CTX elevation and measured slopes | Yes | **No** |
| Safe/Balanced/Science terrain-aware differentiation | Yes, based on DTM | **No — unvalidated route display only** |
| Replay, route comparison interface, JSON export | Yes | Yes, with `previewOnly=true` and disclosure |

**Do not use an illustrative route map to make NASA-derived terrain-safety claims.**
