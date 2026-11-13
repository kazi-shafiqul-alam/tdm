#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
printf 'Starting Tour de Mars demo at http://localhost:%s/marswalk.html?demo=1\n' "$PORT"
python3 -m http.server "$PORT"
