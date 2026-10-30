#!/usr/bin/env python3
"""Build the production MarsWalk 100 m terrain grid from the official Jezero CTX DTM.

Usage:
  python tools/build_terrain.py /path/to/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif

Output:
  data/terrain-grid.js

This script never creates synthetic terrain. It reprojects the supplied Mars CTX DTM
onto the same local equirectangular mission grid used by the browser planner.
"""
from __future__ import annotations
import argparse, json, math
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_origin
from rasterio.crs import CRS

R = 3396190.0
TILE = 100.0
ROWS = COLS = 50
WIDTH = HEIGHT = 5000.0
X0 = -6000.0
YTOP = 1095000.0
LON0 = 77.5
LAT_TS = 18.4
WORK_RES = 20.0
WORK_N = int(WIDTH / WORK_RES)
DST_CRS = CRS.from_proj4(f"+proj=eqc +lat_ts={LAT_TS} +lat_0=0 +lon_0={LON0} +x_0=0 +y_0=0 +R={R} +units=m +no_defs")
DST_TRANSFORM = from_origin(X0, YTOP, WORK_RES, WORK_RES)

SCIENCE = [
    ("Delta Front context", 18.4380, 77.4210, 1.00),
    ("Séítah context", 18.4210, 77.4410, 0.82),
    ("Three Forks context", 18.4310, 77.4280, 0.90),
    ("Delta Top context", 18.4500, 77.4080, 0.94),
]

def local_to_latlon(lx: float, ly: float):
    x = X0 + lx
    y = (YTOP - HEIGHT) + ly
    lat = math.degrees(y / R)
    lon = LON0 + math.degrees(x / (R * math.cos(math.radians(LAT_TS))))
    return lat, lon

def mars_distance(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2-lat1); dl = math.radians(lon2-lon1)
    q = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(min(1, math.sqrt(q)))

def sci_context(lat, lon):
    best, label = 0.0, None
    for name, alat, alon, strength in SCIENCE:
        d = mars_distance(lat, lon, alat, alon)
        score = strength * math.exp(-((d/480.0)**2))
        if score > best: best, label = score, name
    return min(1.0, best), (label if best >= 0.05 else None)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dtm", type=Path, help="Official Jezero CTX DTM GeoTIFF")
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[1] / "data" / "terrain-grid.js")
    args = ap.parse_args()
    if not args.dtm.exists(): raise SystemExit(f"Not found: {args.dtm}")

    work = np.full((WORK_N, WORK_N), np.nan, dtype=np.float32)
    with rasterio.open(args.dtm) as src:
        reproject(
            source=rasterio.band(src, 1), destination=work,
            src_transform=src.transform, src_crs=src.crs,
            src_nodata=src.nodata, dst_transform=DST_TRANSFORM, dst_crs=DST_CRS,
            dst_nodata=np.nan, resampling=Resampling.bilinear,
        )
        source_res = float(abs(src.res[0]))

    work[np.abs(work) > 1e20] = np.nan
    gy, gx = np.gradient(work.astype(np.float64), WORK_RES)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    slope[~np.isfinite(work)] = np.nan

    per = int(TILE / WORK_RES)
    cells, reliefs = [], []
    for tr in range(ROWS):
        for tc in range(COLS):
            z = work[tr*per:(tr+1)*per, tc*per:(tc+1)*per].ravel()
            s = slope[tr*per:(tr+1)*per, tc*per:(tc+1)*per].ravel()
            z = z[np.isfinite(z)]; s = s[np.isfinite(s)]
            coverage = z.size / (per*per)
            elev = float(np.mean(z)) if z.size else None
            p90 = float(np.percentile(s,90)) if s.size else None
            steep = float(np.mean(s>25)) if s.size else 1.0
            relief = float(np.percentile(z,90)-np.percentile(z,10)) if z.size else None
            if relief is not None: reliefs.append(relief)
            cells.append(dict(elev=elev,p90=p90,steepFrac=steep,relief=relief,coverage=coverage))

    relief_scale = max(1.0, float(np.percentile(reliefs,95))) if reliefs else 1.0
    for i,c in enumerate(cells):
        r,cx = divmod(i,COLS)
        lat,lon = local_to_latlon((cx+.5)*TILE, HEIGHT-(r+.5)*TILE)
        sci,label = sci_context(lat,lon)
        slope_score = 1.0 if c['p90'] is None else min(1,max(0,(c['p90']-5)/20))
        relief_score = 1.0 if c['relief'] is None else min(1,max(0,c['relief']/relief_scale))
        c['risk'] = .8*slope_score+.2*relief_score
        c['science'] = sci; c['scienceLabel'] = label
        c['ok'] = c['coverage'] >= .80 and c['p90'] is not None and c['p90'] <= 25
        for k in ('elev','p90','steepFrac','relief','coverage','risk','science'):
            if c[k] is not None: c[k] = round(float(c[k]),3)

    valid=[c for c in cells if c['p90'] is not None]
    passable=[c for c in cells if c['ok']]
    es=[c['elev'] for c in valid if c['elev'] is not None]
    ss=sorted(c['p90'] for c in valid)
    stats=dict(valid=len(valid),passable=len(passable),impassable=len(cells)-len(passable),
               medianSlope=round(float(np.percentile(ss,50)),3) if ss else None,
               p95Slope=round(float(np.percentile(ss,95)),3) if ss else None,
               minElev=round(min(es),3) if es else None,maxElev=round(max(es),3) if es else None)
    if len(passable) < 150: raise SystemExit("Validation failed: too few passable cells; check DTM coverage/projection.")

    out=dict(version=3,created=datetime.now(timezone.utc).isoformat(),source=args.dtm.name,
             sourceType='USGS Mars 2020 CTX DTM',sourceResolutionM=source_res,
             grid=dict(rows=ROWS,cols=COLS,tileM=TILE,localCrs=DST_CRS.to_proj4(),x0=X0,yTop=YTOP),
             methodology=dict(
                 slope='20 m working grid; central-difference slope; p90 summarized per 100 m cell',
                 passable='>=80% elevation coverage and p90 slope <=25°',
                 risk='modeled terrain cost = 0.80 normalized p90 slope + 0.20 normalized local relief',
                 science='context-only proximity to named Jezero waypoints; not a CRISM mineral measurement'),
             cells=cells,stats=stats)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text('window.TDM_TERRAIN_GRID = '+json.dumps(out,separators=(',',':'))+';\n',encoding='utf-8')
    print(f"Wrote {args.out} with {len(passable)} passable / {len(cells)} cells")

if __name__ == '__main__': main()
