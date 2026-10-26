#!/usr/bin/env python3
from pathlib import Path
import subprocess,sys
here=Path(__file__).resolve().parent
for cmd in ([sys.executable,str(here/'fetch_ctx_dtm.py')],[sys.executable,str(here/'build_real_terrain.py')]):
    r=subprocess.run(cmd,cwd=here.parent)
    if r.returncode: raise SystemExit(r.returncode)
print('Real terrain build complete. Serve the project directory over HTTP and open marswalk.html.')
