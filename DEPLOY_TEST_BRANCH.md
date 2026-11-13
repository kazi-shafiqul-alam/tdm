# Deploy this candidate without disturbing `main`

Repository supplied by the team: https://github.com/kazi-shafiqul-alam/tdm  
Current older production: https://tour-de-mars.vercel.app/  
Team's test deployment: https://tour-de-mars-test.vercel.app/

**This package does not automatically update GitHub or Vercel.** The two live URLs listed above may continue to serve older code until a new deployment happens.

## Easiest safe approach

1. Create a fresh Vercel preview project from the extracted folder, or make a backup branch off `test` before replacing any files.
2. Copy **all extracted site files** (`index.html`, `marswalk.html`, `marswalk.js`, `marswalk.css`, `data/`, `assets/`, `tools/` and related files) into the Vercel project's static site root. Do **not** copy the ZIP as one file or commit the extracted folder one directory too deep if the Vercel root expects `index.html` at root.
3. If using the team's repo, verify Vercel's **Root Directory** and **Production Branch** settings. A Vercel project linked to `test` should deploy that branch; leave `main` unchanged until you have explicitly tested this candidate.
4. Confirm the candidate site opens `/`, `/marswalk.html?demo=1`, `/data-audit.html`, and `/atlas.html` in a private browser window.
5. Click Load Demo EVA, compare all four modes, test replay and JSON export. Check the current terrain status; do not claim verified CTX data unless it says **REAL TERRAIN READY**.
6. Confirm the video records the **new preview URL** (or localhost) rather than either of the known older deployments.

## Example Git workflow (from your own computer)

```bash
# In your existing local checkout, after saving any uncommitted work:
git switch test
# Optional backup of the current beta state:
git branch backup/test-before-demo
# Copy the extracted website contents into your repository's *actual static site root*.
git status
# Review what changed before committing:
git diff --stat
git add .
git commit -m "Add 240-second MarsWalk presentation demo"
git push origin test
```

If the repository's real folder structure differs from this static ZIP, compare it first and keep its deployment configuration. **Do not use `git reset --hard`, force push, or delete unrelated files.**

## Verified data path

The bundle includes `tools/build_terrain.py`, not the actual large CTX GeoTIFF. To enable scientific terrain routing, run the script with your official downloaded CTX DTM. Its output is `data/terrain-grid.js`. Test the output locally before pushing it. No synthetic terrain grid should be published as verified USGS data.
