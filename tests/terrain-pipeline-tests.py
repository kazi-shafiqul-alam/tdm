#!/usr/bin/env python3
"""Reproducible unit/integration tests for the real-terrain processing path.

These tests use an independently constructed GeoTIFF fixture in the published
Mars CTX projection so they can verify reprojection, slope units, nodata, and
100 m aggregation without pretending the fixture is the USGS science product.
Actual-source sample validation is tracked separately as BLOCKED when the
official GeoTIFF is unavailable in the execution environment.
"""
from pathlib import Path
import json, math, tempfile, sys
import numpy as np
import rasterio
from rasterio.transform import from_origin
from pyproj import CRS, Transformer

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'pipeline'))
import build_real_terrain as B

rows=[]
def test(name,fn):
    try: fn(); rows.append((name,True,''))
    except Exception as e: rows.append((name,False,str(e)))
def assert_(c,m):
    if not c: raise AssertionError(m)

SRC_CRS=CRS.from_user_input('ESRI:103885')
LOCAL=B.LOCAL_CRS
GEO=B.MARS_GEO
TO_SRC=Transformer.from_crs(GEO,SRC_CRS,always_xy=True)
LOCAL_TO_SRC=Transformer.from_crs(LOCAL,SRC_CRS,always_xy=True)

def make_fixture(path:Path):
    # Cover the published bbox with the published 1596x1512 shape and nominal 20 m pixels.
    west_lon,south_lat,east_lon,north_lat=B.SRC['published_bbox_lonlat']
    west,north=TO_SRC.transform(west_lon,north_lat)
    transform=from_origin(west,north,20,20)
    h,w=B.SRC['published_rows'],B.SRC['published_cols']
    rr,cc=np.indices((h,w),dtype='float32')
    xs=transform.c+(cc+0.5)*transform.a
    ys=transform.f+(rr+0.5)*transform.e
    # Independent analytic plane in source metric coordinates. Reprojection preserves a nearly planar surface.
    z=(-2500.0 + 0.020*(xs-xs.mean()) + 0.010*(ys-ys.mean())).astype('float32')
    # Create >100 m nodata patch around a known route-grid cell center.
    tile=B.GRID['tile_m']; r0=c0=25
    lx=B.GRID['x0']+(c0+0.5)*tile
    ly=B.GRID['y0']-(r0+0.5)*tile
    sx,sy=LOCAL_TO_SRC.transform(lx,ly)
    inv=~transform; pc,pr=inv*(sx,sy); pr=int(round(pr)); pc=int(round(pc))
    z[max(0,pr-5):min(h,pr+6),max(0,pc-5):min(w,pc+6)]=-9999.0
    profile=dict(driver='GTiff',height=h,width=w,count=1,dtype='float32',crs=SRC_CRS,
                 transform=transform,nodata=-9999.0,compress='deflate')
    with rasterio.open(path,'w',**profile) as ds: ds.write(z,1)
    return (r0,c0)

with tempfile.TemporaryDirectory() as td:
    td=Path(td); src=td/'fixture.tif'; out=td/'terrain.json'; png=td/'hillshade.png'
    bad_rc=make_fixture(src)
    built=B.build(src,out,png)

    test('fixture source metadata accepted', lambda: assert_(built['meta']['source']['observed_file_metadata']['width']==B.SRC['published_cols'],'width mismatch'))
    test('processed grid is marked real', lambda: assert_(built['meta']['terrain_mode']=='real','terrain_mode not real'))
    test('route grid preserves 50x50 at 100 m', lambda: assert_(built['meta']['rows']==50 and built['meta']['cols']==50 and built['meta']['tile_m']==100,'grid geometry mismatch'))
    test('working reprojection uses 20 m spacing', lambda: assert_(built['meta']['processing']['working_pixel_m']==20,'working pixel mismatch'))

    def slope_units():
        vals=np.array([x['p90'] for x in built['tiles'] if x['p90'] is not None])
        # Analytic source plane magnitude sqrt(.02^2+.01^2), about 1.28 deg.
        expected=math.degrees(math.atan(math.hypot(.02,.01)))
        med=float(np.median(vals))
        assert_(abs(med-expected)<0.25,f'median p90 {med:.3f} deg differs from analytic {expected:.3f} deg')
    test('slope is calculated in degrees with metric spacing',slope_units)

    def nodata_blocked():
        r,c=bad_rc; x=built['tiles'][r*50+c]
        assert_(x['coverage'] is None or x['coverage']<0.8 or x['p90'] is None or not x['ok'],f'nodata test cell unexpectedly ordinary: {x}')
        assert_(not x['ok'],'nodata/insufficient-coverage cell remained traversable')
    test('nodata remains identifiable and blocks route cell',nodata_blocked)

    def source_derived_elev():
        vals=[x['elev'] for x in built['tiles'] if x['elev'] is not None]
        assert_(len(vals)>2300,'too few source-derived elevation cells')
        assert_(max(vals)-min(vals)>20,'elevation field was flattened or zero-filled')
    test('elevation values survive reprojection/aggregation',source_derived_elev)
    test('hillshade derivative is generated', lambda: assert_(png.exists() and png.stat().st_size>100,'hillshade missing'))
    test('terrain JSON round-trips', lambda: assert_(json.loads(out.read_text())['meta']['terrain_mode']=='real','output json invalid'))

fails=[r for r in rows if not r[1]]
for n,ok,d in rows: print(('PASS' if ok else 'FAIL')+'\t'+n+((' — '+d) if d else ''))
print(f'TOTAL\t{len(rows)-len(fails)}/{len(rows)} passed')
raise SystemExit(1 if fails else 0)
