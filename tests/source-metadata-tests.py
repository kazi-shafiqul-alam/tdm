#!/usr/bin/env python3
from pathlib import Path
import json,sys
from pyproj import CRS,Transformer
ROOT=Path(__file__).resolve().parents[1]
cfg=json.loads((ROOT/'pipeline/terrain_config.json').read_text())
s=cfg['source']; g=cfg['route_grid']; checks=[]
def ck(n,c,d=''): checks.append((n,bool(c),d))
ck('exact USGS product filename pinned',s['filename']=='JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif')
ck('USGS DOI pinned',s['doi']=='10.5066/P906QQT8')
ck('nominal source spacing is 20 m',s['nominal_post_spacing_m']==20)
ck('source vertical unit is metres',s['vertical_units']=='m')
ck('coordinate convention is planetocentric/east-positive',s['latitude_type']=='planetocentric' and s['longitude_direction']=='positive east')
ck('official retrieval URLs are HTTPS USGS/ASC',s['url'].startswith('https://planetarymaps.usgs.gov/') and s['mirror_url'].startswith('https://asc-pds-services.s3.us-west-2.amazonaws.com/'))
# Independently project route corners back to geographic and prove configured footprint is inside published bbox.
local=CRS.from_proj4(g['crs_proj4']); geo=CRS.from_proj4(f"+proj=longlat +R={g['mars_radius_m']} +no_defs")
t=Transformer.from_crs(local,geo,always_xy=True)
left,top=g['x0'],g['y0']; right=left+g['cols']*g['tile_m']; bottom=top-g['rows']*g['tile_m']
pts=[t.transform(x,y) for x,y in [(left,bottom),(left,top),(right,bottom),(right,top)]]
rb=[min(p[0] for p in pts),min(p[1] for p in pts),max(p[0] for p in pts),max(p[1] for p in pts)]
sb=s['published_bbox_lonlat']
ck('configured 5 km route footprint lies inside published CTX coverage',sb[0]<=rb[0] and rb[2]<=sb[2] and sb[1]<=rb[1] and rb[3]<=sb[3],f'route bbox={rb}, source bbox={sb}')
ck('100 m route spacing is integer aggregation of 20 m working grid',g['tile_m']%cfg['terrain_model']['working_pixel_m']==0)
for n,ok,d in checks: print(('PASS' if ok else 'FAIL')+'\t'+n+((' — '+d) if d else ''))
f=[x for x in checks if not x[1]]
print(f'TOTAL\t{len(checks)-len(f)}/{len(checks)} passed')
raise SystemExit(1 if f else 0)
