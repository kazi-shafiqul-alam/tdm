#!/usr/bin/env python3
"""Download the exact USGS Mars 2020 CTX TRN DTM selected for MarsWalk.

The script intentionally uses the published USGS file URL from terrain_config.json.
It never falls back to a similarly named file or to a rendered map tile.
"""
from __future__ import annotations
import argparse, json, sys, urllib.request
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
CFG=json.loads((HERE/'terrain_config.json').read_text())
SRC=CFG['source']

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--output', type=Path, default=ROOT/'data'/'raw'/SRC['filename'])
    ap.add_argument('--force', action='store_true')
    args=ap.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.exists() and not args.force:
        print(f'Already present: {args.output}')
        return 0
    tmp=args.output.with_suffix(args.output.suffix+'.part')
    urls=[SRC['url']] + ([SRC['mirror_url']] if SRC.get('mirror_url') else [])
    errors=[]
    for url in urls:
        print(f'Downloading exact verified USGS source:\n  {url}\n→ {args.output}')
        try:
            req=urllib.request.Request(url, headers={'User-Agent':'Tour-de-Mars/1.0 scientific prototype'})
            with urllib.request.urlopen(req, timeout=120) as r, tmp.open('wb') as f:
                total=int(r.headers.get('Content-Length') or 0); got=0
                while True:
                    b=r.read(1024*1024)
                    if not b: break
                    f.write(b); got+=len(b)
                    if total: print(f'  {got/total:6.1%}', end='\r', flush=True)
            if tmp.stat().st_size < 1_000_000:
                raise RuntimeError(f'downloaded file is unexpectedly small ({tmp.stat().st_size} bytes)')
            tmp.replace(args.output)
            print(f'\nSaved {args.output.stat().st_size/1024/1024:.1f} MiB')
            return 0
        except Exception as e:
            tmp.unlink(missing_ok=True); errors.append(f'{url}: {e}')
    print('ERROR: all exact verified source URLs failed:', file=sys.stderr)
    for e in errors: print('  '+e,file=sys.stderr)
    print('Download the exact GeoTIFF manually from either URL above and place it at:', file=sys.stderr)
    print(args.output, file=sys.stderr)
    return 2

if __name__=='__main__': raise SystemExit(main())
