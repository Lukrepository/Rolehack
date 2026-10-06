#!/bin/bash
# Copy the web port's page files from the Rolehack checkout over the deployed
# build (same commit's nethack.wasm), so page-only changes can be tested
# without Emscripten. Serves on http://localhost:8766/ if nothing is there yet.
set -e
SP=/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad
SRC=/home/user/Rolehack/win/web
DST=$SP/testsite
for f in "$SRC"/*.js "$SRC"/*.css "$SRC"/index.html "$SRC"/manifest.json "$SRC"/defaults.nh; do
  [ -f "$f" ] && cp "$f" "$DST/"
done
cp "$SRC"/fonts/* "$DST/fonts/" 2>/dev/null || true
sed "s/__VERSION__/dev$(date +%s)/" "$SRC/sw.js" > "$DST/sw.js"
if ! curl -s -o /dev/null http://localhost:8766/index.html; then
  (cd "$DST" && nohup python3 -m http.server 8766 >/dev/null 2>&1 &)
  sleep 1
fi
echo "synced $SRC -> $DST; serving http://localhost:8766/"
