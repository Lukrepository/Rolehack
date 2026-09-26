#!/bin/bash
# Build the Rolehack web page: the core as WebAssembly (sys/libnh, win/shim)
# and the page in win/web, assembled in targets/web/.
# Needs the Emscripten SDK; EMSDK defaults to $HOME/emsdk.
set -e
top=$(cd "$(dirname "$0")/../.." && pwd)
. "${EMSDK:-$HOME/emsdk}/emsdk_env.sh" >/dev/null 2>&1
cd "$top/sys/unix"
sh setup.sh hints/linux.500 >/dev/null
cd "$top"
# make doesn't notice changed compiler flags; "./build.sh clean" starts over
[ "$1" = clean ] && rm -rf targets/wasm
# the Linux hints set a desktop HACKDIR after cross-pre1 sets "/"
make CROSS_TO_WASM=1 HACKDIR=/ PREFIX= all
mkdir -p targets/web
python3 win/web/tiles.py targets/web
cp targets/wasm/nethack.js targets/wasm/nethack.wasm \
   win/web/index.html win/web/web.js win/web/doll.js targets/web/
echo "Built $top/targets/web/"
