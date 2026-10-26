#!/usr/bin/env python3
"""Build the MarsWalk route grid from the USGS Mars 2020 CTX TRN DTM.

Processing chain:
  official 20 m CTX GeoTIFF -> local Mars equirectangular 20 m raster ->
  slope in degrees -> 100 m route cells -> terrain_grid.json + hillshade PNG.

Science values are *not* derived here. If data/demo_science.json is present, its
legacy science-priority demonstration values are copied with an explicit
`simulated` provenance tag so terrain and science are never conflated.
"""
from __future__ import annotations
import argparse, json, math, os, sys, warnings
from pathlib import Path
import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import reproject, Resampling, transform_bounds
from pyproj import CRS, Transformer
from PIL import Image

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
CFG=json.loads((HERE/'terrain_config.json').read_text())
SRC=CFG['source']; GRID=CFG['route_grid']; MODEL=CFG['terrain_model']

LOCAL_CRS=CRS.from_proj4(GRID['crs_proj4'])
MARS_GEO=CRS.from_proj4(f"+proj=longlat +R={GRID['mars_radius_m']} +no_defs")

def finite_float(v, nd=3):
    return None if v is None or not np.isfinite(v) else round(float(v), nd)

def ramp(v, lo, hi):
    return float(np.clip((v-lo)/(hi-lo),0,1))

def slope_degrees(z: np.ndarray, pixel_m: float) -> np.ndarray:
    """Planar slope on the reprojected local metric grid. NaN boundaries stay NaN."""
    z=z.astype('float64', copy=False)
    gy,gx=np.gradient(z, pixel_m, pixel_m)
    s=np.degrees(np.arctan(np.hypot(gx,gy)))
    # np.gradient can produce a finite value adjacent to only partly known data.
    # Require a full 3x3 finite neighbourhood for a slope sample.
    valid=np.isfinite(z)
    padded=np.pad(valid,1,constant_values=False)
    full=np.ones(valid.shape,dtype=bool)
    for dr in range(3):
        for dc in range(3):
            full &= padded[dr:dr+valid.shape[0],dc:dc+valid.shape[1]]
    s[~full]=np.nan
    return s

def aggregate(arr, factor, fn):
    rows=arr.shape[0]//factor; cols=arr.shape[1]//factor
    a=arr[:rows*factor,:cols*factor].reshape(rows,factor,cols,factor).transpose(0,2,1,3).reshape(rows,cols,factor*factor)
    with np.errstate(all='ignore'), warnings.catch_warnings():
        warnings.simplefilter('ignore', RuntimeWarning)
        return fn(a,axis=2)

def hillshade(z, pixel_m):
    gy,gx=np.gradient(z.astype('float64'),pixel_m,pixel_m)
    slope=np.arctan(np.hypot(gx,gy)); aspect=np.arctan2(-gx,gy)
    az=np.deg2rad(315); alt=np.deg2rad(45)
    hs=np.sin(alt)*np.cos(slope)+np.cos(alt)*np.sin(slope)*np.cos(az-aspect)
    hs=np.clip((hs+0.15)/1.15,0,1)
    hs[~np.isfinite(z)]=np.nan
    return hs

def write_hillshade(z, out_path, pixel_m):
    hs=hillshade(z,pixel_m)
    # subdued neutral-Mars tint; alpha 0 for no data
    v=np.nan_to_num(hs,nan=0.0)
    lo=np.array([38,29,27.],dtype=float); hi=np.array([208,157,124.],dtype=float)
    rgb=(lo[None,None,:]+v[:,:,None]*(hi-lo)[None,None,:]).clip(0,255).astype('uint8')
    a=np.where(np.isfinite(hs),255,0).astype('uint8')
    Image.fromarray(np.dstack([rgb,a]),'RGBA').save(out_path,optimize=True)

def load_demo_science(n):
    p=ROOT/'data'/'demo_science.json'
    if not p.exists(): return [None]*n,[None]*n,[]
    d=json.loads(p.read_text())
    sci=[None]*n; mineral=[None]*n
    for i,x in enumerate(d.get('tiles',[])[:n]):
        sci[i]=x.get('sci'); mineral[i]=x.get('mineral')
    return sci,mineral,[int(x) for x in d.get('candidates',[]) if 0<=int(x)<n]

def validate_source(ds):
    if ds.count != 1: raise RuntimeError(f'expected a single-band DTM; found {ds.count} bands')
    if not ds.crs: raise RuntimeError('source GeoTIFF has no CRS; refusing to guess')
    if ds.width < 1000 or ds.height < 1000: raise RuntimeError(f'unexpected raster dimensions {ds.width}x{ds.height}')
    rx,ry=abs(ds.transform.a),abs(ds.transform.e)
    nominal=SRC['nominal_post_spacing_m']
    # The published projection is equidistant cylindrical at lat_ts=0. 20 m is the documented post spacing.
    if not (0.5*nominal <= rx <= 1.5*nominal and 0.5*nominal <= ry <= 1.5*nominal):
        raise RuntimeError(f'unexpected source pixel size {rx:g} x {ry:g} m (published nominal {nominal} m)')
    return rx,ry

def build(src_path:Path,out_json:Path,out_png:Path):
    tile=float(GRID['tile_m']); rows=int(GRID['rows']); cols=int(GRID['cols'])
    work=float(MODEL['working_pixel_m']); factor=round(tile/work)
    if abs(factor*work-tile)>1e-6: raise RuntimeError('route tile size must be an integer multiple of working pixel size')
    h=rows*tile; w=cols*tile
    work_rows=rows*factor; work_cols=cols*factor
    left=float(GRID['x0']); top=float(GRID['y0']); right=left+w; bottom=top-h
    dst_transform=from_origin(left,top,work,work)
    with rasterio.open(src_path) as ds:
        rx,ry=validate_source(ds)
        # Verify the intended route footprint intersects and is not being filled by extrapolation.
        src_bounds_local=transform_bounds(ds.crs,LOCAL_CRS,*ds.bounds,densify_pts=41)
        if not (src_bounds_local[0] <= left and src_bounds_local[2] >= right and src_bounds_local[1] <= bottom and src_bounds_local[3] >= top):
            print('WARNING: published/source raster bounds do not fully enclose the route grid; coverage cells will be blocked.',file=sys.stderr)
        src=ds.read(1,masked=True).astype('float32')
        src_data=src.filled(np.nan)
        z=np.full((work_rows,work_cols),np.nan,dtype='float32')
        reproject(source=src_data,destination=z,src_transform=ds.transform,src_crs=ds.crs,
                  src_nodata=np.nan,dst_transform=dst_transform,dst_crs=LOCAL_CRS,dst_nodata=np.nan,
                  resampling=Resampling.bilinear,num_threads=2)
        source_info={
          'driver':ds.driver,'width':ds.width,'height':ds.height,'count':ds.count,
          'crs_wkt':ds.crs.to_wkt(),'transform':list(ds.transform)[:6],'nodata':ds.nodata,
          'pixel_size_m':[rx,ry],'bounds_projected':list(ds.bounds)
        }
    sl=slope_degrees(z,work)
    elev=aggregate(z,factor,np.nanmean)
    p90=aggregate(sl,factor,lambda a,axis:np.nanpercentile(a,90,axis=axis))
    mean_slope=aggregate(sl,factor,np.nanmean)
    coverage=aggregate(np.isfinite(z).astype('float32'),factor,np.mean)
    n=rows*cols
    sci,minerals,candidates=load_demo_science(n)
    tiles=[]
    soft=float(MODEL['slope_soft_deg']); hard=float(MODEL['slope_hard_deg']); cov_min=float(MODEL['coverage_min_fraction'])
    for r in range(rows):
      for c in range(cols):
        i=r*cols+c; ev=elev[r,c]; pv=p90[r,c]; mv=mean_slope[r,c]; cv=coverage[r,c]
        known=np.isfinite(ev) and np.isfinite(pv) and cv>=cov_min
        ok=bool(known and pv<=hard)
        tc=ramp(pv,soft,hard) if known else None
        tiles.append({
          'id':f'JEZ-100-R{r:03d}-C{c:03d}',
          'elev':finite_float(ev,2),'p90':finite_float(pv,2),'slope':finite_float(mv,2),
          'coverage':finite_float(cv,3),'terrain_cost':finite_float(tc,4),'ok':ok,
          'sci':sci[i],'mineral':minerals[i],
          'terrain_provenance':'USGS CTX DTM source-derived / slope and cell statistics derived',
          'science_provenance':'simulated demonstration value' if sci[i] is not None else 'unknown'
        })
    to_geo=Transformer.from_crs(LOCAL_CRS,MARS_GEO,always_xy=True)
    corners=[]
    for x,y in [(left,bottom),(left,top),(right,bottom),(right,top)]:
        lon,lat=to_geo.transform(x,y); corners.append([lon,lat])
    bbox=[min(x[0] for x in corners),min(x[1] for x in corners),max(x[0] for x in corners),max(x[1] for x in corners)]
    out={
      'meta':{
        'schema_version':2,'terrain_mode':'real','region':GRID['region'],'tile_m':tile,'rows':rows,'cols':cols,
        'x0':left,'y0':top,'crs':GRID['crs_proj4'],'mars_radius_m':GRID['mars_radius_m'],
        'lonlat_bbox':bbox,
        'source':{**SRC,'observed_file_metadata':source_info},
        'processing':{
          'working_pixel_m':work,'reprojection':'bilinear elevation resampling into local Mars equirectangular metric grid',
          'slope':'degrees from gradient of reprojected 20 m elevation; requires complete 3x3 finite neighbourhood',
          'route_cell_aggregation':'100 m cells: mean elevation, mean slope, p90 slope, finite-elevation coverage fraction',
          'terrain_cost':MODEL['terrain_cost_method'],'passability':MODEL['passability_method'],
          'coverage_min_fraction':cov_min,'slope_soft_deg':soft,'slope_hard_deg':hard,
          'science':'legacy synthetic demonstration layer retained separately; not a NASA-derived terrain input'
        }
      },
      'candidates':candidates,
      'tiles':tiles
    }
    out_json.parent.mkdir(parents=True,exist_ok=True)
    out_json.write_text(json.dumps(out,separators=(',',':')))
    write_hillshade(z,out_png,work)
    if out_json.resolve() == (ROOT/'data'/'terrain_grid.json').resolve():
        status={'activeTerrain':'real_usgs_ctx','selectedSource':SRC['name'],'doi':SRC['doi'],'sourceFile':SRC['filename'],'terrainGrid':'data/terrain_grid.json','hillshade':'data/terrain_hillshade.png','classification':'source-derived elevation; calculated slope and terrain cost','note':'Generated from the verified USGS CTX DTM. Science-priority and EVA resource values remain separately labelled demonstrations/model assumptions.'}
        (ROOT/'data'/'terrain-status.json').write_text(json.dumps(status,indent=2)+'\n')
    valid=sum(1 for x in tiles if x['ok']); known=sum(1 for x in tiles if x['elev'] is not None and x['p90'] is not None)
    print(f'Wrote {out_json} ({known}/{n} cells with terrain, {valid}/{n} route-open under configured model)')
    print(f'Wrote {out_png}')
    return out

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--source',type=Path,default=ROOT/'data'/'raw'/SRC['filename'])
    ap.add_argument('--output',type=Path,default=ROOT/'data'/'terrain_grid.json')
    ap.add_argument('--hillshade',type=Path,default=ROOT/'data'/'terrain_hillshade.png')
    args=ap.parse_args()
    if not args.source.exists():
        print(f'ERROR: source GeoTIFF not found: {args.source}',file=sys.stderr)
        print('Run: python pipeline/fetch_ctx_dtm.py',file=sys.stderr)
        return 2
    try: build(args.source,args.output,args.hillshade)
    except Exception as e:
        print(f'ERROR: {e}',file=sys.stderr); return 3
    return 0

if __name__=='__main__': raise SystemExit(main())
