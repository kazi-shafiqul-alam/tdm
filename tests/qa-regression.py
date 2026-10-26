from pathlib import Path
from bs4 import BeautifulSoup
import json,re,sys
root=Path(__file__).resolve().parents[1]
checks=[]
def check(name,cond,detail=''):
    checks.append((name,bool(cond),detail))
    print(('PASS' if cond else 'FAIL')+'\t'+name+((' — '+detail) if detail else ''))

pages=['index.html','site.html','live-map.html','marswalk.html','audit.html']
for name in pages:
    p=root/name; soup=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
    check(f'{name}: language declared', soup.html and soup.html.get('lang')=='en')
    check(f'{name}: title in head', soup.head and soup.head.title is not None)
    check(f'{name}: viewport declared', soup.head and soup.head.find('meta',attrs={'name':'viewport'}) is not None)
    ids=[x.get('id') for x in soup.find_all(id=True)]
    check(f'{name}: unique IDs',len(ids)==len(set(ids)))
    missing=[]
    for tag,attr in [('a','href'),('img','src'),('script','src'),('link','href')]:
        for el in soup.find_all(tag):
            v=el.get(attr)
            if not v or v.startswith(('http://','https://','#','mailto:','data:','javascript:')): continue
            v=v.split('?',1)[0].split('#',1)[0]
            if not v: continue
            if not (root/v).exists(): missing.append(v)
    check(f'{name}: local references resolve',not missing,', '.join(sorted(set(missing))))

site_css=(root/'site.css').read_text()
site_js=(root/'site.js').read_text()
live=(root/'live-map.html').read_text()
mars=(root/'marswalk.html').read_text()

check('global pages have visible focus styling','focus-visible' in site_css)
check('mobile menu supports Escape','e.key===\'Escape\'' in site_js)
check('mobile menu updates accessible label','Close navigation' in site_js)
check('atlas coordinate errors are visible','coordStatus' in live and 'Enter a latitude from' in live)
check('atlas source-status is live announced','id="status" class="status" role="status" aria-live="polite"' in live)
check('atlas base name is HTML-escaped','${esc(mission.base.name' in live)
check('atlas shows MarsWalk terrain footprint','MarsWalk terrain footprint' in live and 'DEMO_BOUNDS' in live)
check('atlas blocks out-of-footprint base handoff','outside the dashed 5 km MarsWalk terrain footprint' in live)
check('atlas has graceful Leaflet failure state','Interactive map unavailable' in live and 'No route or coordinate result has been fabricated' in live)
check('atlas Leaflet CSS is local','vendor/leaflet/leaflet.css' in live)
check('MarsWalk clears stale imported metadata on reset','S.importedMeta = null; S.importRejects = []' in mars)
check('MarsWalk reports rejected imported selections','Not included from the imported selection' in mars)
check('MarsWalk failed import does not substitute example','if(imported===null) loadExample(); else if(imported===false)' in mars)
check('MarsWalk reorders stops in UI','data-up=' in mars and 'data-down=' in mars)
check('MarsWalk reorders imported metadata with stops','S.importedMeta.stops[a]' in mars)
check('MarsWalk exports calculated mission report','tour-de-mars-marswalk-report-v2' in mars and 'btn-export-report' in mars)
check('MarsWalk provides print report action','btn-print-report' in mars and 'window.print()' in mars)
check('MarsWalk toast is live announced','id="toast"' in mars and 'aria-live="polite"' in mars)
check('MarsWalk real/fallback disclosure remains visible','USGS CTX DTM' in mars and 'explicit synthetic fallback' in mars and 'human-safety certification' in mars)
check('missing science remains unknown',"x.sci==null?'unknown'" in mars)
check('missing terrain excluded rather than zero-filled','terrainKnown ? 1 : 0' in mars and 'NaN' in mars)

# no obvious credentials or developer-machine paths
secret_re=re.compile(r'(?i)(api[_-]?key\s*[=:]|password\s*[=:]|bearer\s+[A-Za-z0-9._-]{12,}|/Users/[^\s]+|[A-Za-z]:\\\\Users\\\\|/home/[^\s]+)')
hits=[]
for p in root.rglob('*'):
    if not p.is_file() or p == Path(__file__).resolve() or p.suffix.lower() in {'.png','.jpg','.jpeg','.webp','.zip','.pyc'} or '__pycache__' in p.parts: continue
    t=p.read_text(errors='ignore')
    for i,line in enumerate(t.splitlines(),1):
        if secret_re.search(line): hits.append(f'{p.relative_to(root)}:{i}')
check('no obvious secrets or private machine paths',not hits,', '.join(hits[:8]))

# source registry classifications
reg=json.loads((root/'data-source-registry.json').read_text())
serialized=json.dumps(reg).lower()
check('source registry distinguishes simulation/derived/source states', all(k in serialized for k in ['simulat','derived','processed']))

# performance: optimized large assets stay below QA limits
for rel,limit in [('assets/cat-astronaut.png',400_000),('assets/olympus-mons.jpg',600_000),('assets/hero-mars.jpeg',300_000)]:
    sz=(root/rel).stat().st_size
    check(f'{rel}: optimized size',sz<=limit,f'{sz/1024:.0f} KB <= {limit/1024:.0f} KB')

failed=[c for c in checks if not c[1]]
print(f'TOTAL\t{len(checks)-len(failed)}/{len(checks)} passed')
sys.exit(1 if failed else 0)
