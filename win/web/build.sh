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
mkdir -p targets/web/fonts targets/web/sounds
export PYTHONDONTWRITEBYTECODE=1
python3 win/web/tiles.py targets/web
python3 win/web/icons.py targets/web
cp targets/wasm/nethack.js targets/wasm/nethack.wasm win/web/index.html \
   win/web/rolehack.css win/web/web.js win/web/overlay.js win/web/commands.js \
   win/web/prefs.js win/web/doll.js win/web/feedback.js win/web/layout.js \
   win/web/viewer.js win/web/input.js win/web/channel.js win/web/manifest.json win/web/defaults.nh targets/web/
cp win/web/fonts/* targets/web/fonts/
cp win/web/sounds/* targets/web/sounds/
# what the page was built from, for the page's own "source" link (the NGPL
# asks that whoever gets the program can get its source); the commit's own
# date, not the build's, so an unchanged rebuild keeps its cache version
commit=$(git rev-parse HEAD); short=$(git rev-parse --short HEAD)
branch=$(git rev-parse --abbrev-ref HEAD)
cdate=$(git show -s --format=%cd --date=short HEAD)
dirty=; [ -n "$(git status --porcelain --untracked-files=no)" ] && dirty=1
cat > targets/web/build.json <<EOF
{ "commit": "$commit", "short": "$short${dirty:++}", "branch": "$branch", "date": "$cdate",
  "source": "https://github.com/Lukrepository/Rolehack/tree/$commit" }
EOF
touch targets/web/.nojekyll
# the installed app's cache is named for what is in it, so a changed build
# replaces it and an unchanged one leaves it alone
version=$(cd targets/web && find . -type f ! -name sw.js | sort | xargs cat | md5sum | cut -c1-12)
sed "s/__VERSION__/$version/" win/web/sw.js > targets/web/sw.js
echo "App version $version"
echo "Built $top/targets/web/"
# The preview channel (doc/RELEASING.md): the same build, served under /preview/
# with its own storage (win/web/channel.js), so a build can be tried on a phone
# before it goes live.  Only the name and the title differ, so an installed
# preview app says what it is; it gets its own cache version for the same reason.
rm -rf targets/web-preview
cp -r targets/web targets/web-preview
sed -i 's/"name": "Rolehack"/"name": "Rolehack preview"/; s/"short_name": "Rolehack"/"short_name": "Preview"/' targets/web-preview/manifest.json
sed -i 's#<title>Rolehack</title>#<title>Rolehack preview</title>#' targets/web-preview/index.html
pversion=$(cd targets/web-preview && find . -type f ! -name sw.js | sort | xargs cat | md5sum | cut -c1-12)
sed "s/__VERSION__/$pversion/" win/web/sw.js > targets/web-preview/sw.js
echo "Preview version $pversion"
echo "Built $top/targets/web-preview/"
