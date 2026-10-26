from pathlib import Path
from html.parser import HTMLParser
import json,re,sys
root=Path(__file__).resolve().parents[1]
html_files=list(root.glob('*.html'))
class P(HTMLParser):
    def __init__(self): super().__init__(); self.links=[]; self.ids=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if 'id' in d:self.ids.append(d['id'])
        for k in ('href','src'):
            if k in d:self.links.append(d[k])

def check(name,cond,detail=''):
    rows.append((name,bool(cond),detail))
rows=[]
for f in html_files:
    p=P(); p.feed(f.read_text(errors='replace'))
    dup={x for x in p.ids if p.ids.count(x)>1}
    check(f'{f.name}: unique IDs',not dup,','.join(sorted(dup)))
    missing=[]
    for u in p.links:
        if not u or u.startswith(('#','http:','https:','mailto:','data:','javascript:')): continue
        target=(f.parent/u.split('#')[0].split('?')[0])
        if not target.exists(): missing.append(u)
    check(f'{f.name}: local links/assets resolve',not missing,', '.join(missing[:10]))

mw=(root/'marswalk.html').read_text()
lm=(root/'live-map.html').read_text()
check('no visible Safest label','name: "Safest"' not in mw)
check('missing terrain not zero-filled','G.sand[i] = x.sand ?? 0' not in mw and 'G.risk[i] = x.risk ?? 1' not in mw)
check('MarsWalk real/fallback terrain disclosure','USGS CTX DTM' in mw and 'explicit synthetic fallback' in mw and 'human-safety certification' in mw)
check('import report discloses mapped cell/source','mappedCell' in mw and 'snapDistanceM' in mw and 'terrainSource' in mw)
check('Jezero USGS center corrected','CENTER=[18.41,77.69]' in lm)
check('Neretva center corrected','NERETVA=[18.55,77.20]' in lm)
check('Mars-specific export schema',"schema:'tour-de-mars-mission-selection-v1'" in lm and "tour-de-mars-mission.json" in lm)
check('no GeoJSON export claim','Export selection GeoJSON' not in lm and 'tour-de-mars-mission.geojson' not in lm)
check('data-source registry parses', bool(json.loads((root/'data-source-registry.json').read_text())['sources']))
check('audit report exists',(root/'AUDIT_REPORT.md').exists())

fails=[r for r in rows if not r[1]]
for n,ok,d in rows: print(('PASS' if ok else 'FAIL')+'\t'+n+((' — '+d) if d else ''))
print(f'TOTAL\t{len(rows)-len(fails)}/{len(rows)} passed')
sys.exit(1 if fails else 0)
