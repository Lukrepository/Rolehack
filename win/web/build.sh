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
# what the build is made from.  build.json (below) names it for the page's own
# "source" link (the NGPL asks that whoever gets the program can get its
# source), and the game names it too: date.c takes the commit and branch from
# the flags date.o is compiled with, for #version and #versionshort (and the
# branch for the status line, with showvers).
commit=$(git rev-parse HEAD); short=$(git rev-parse --short HEAD)
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" = HEAD ]; then
  # a detached checkout, as a deploy from a merged commit often is: the branch
  # that holds exactly this commit, here or on a remote, when only one does
  names=$( { git for-each-ref --points-at HEAD --format='%(refname:lstrip=2)' refs/heads
             git for-each-ref --points-at HEAD --format='%(refname:lstrip=3)' refs/remotes
           } | grep -vx HEAD | sort -u)
  if [ -n "$names" ] && [ "$(printf '%s\n' "$names" | wc -l)" -eq 1 ]; then branch=$names; fi
fi
cdate=$(git show -s --format=%cd --date=short HEAD)
dirty=; [ -n "$(git status --porcelain --untracked-files=no)" ] && dirty=1
# make rebuilds date.o only when a core source file changes, so a commit that
# changes nothing there (a merge, a page-only change) kept the names of
# whatever commit date.o was last built at.  Rebuild it whenever the names
# differ from the ones it holds; an unchanged rebuild keeps it, and with it the
# same nethack.wasm and the same cache version.  (include/date.h plays no
# part: makedefs writes it for reference only, and nothing includes it.)
stamp="$commit${dirty:++} $branch"
[ "$(cat targets/wasm/date.stamp 2>/dev/null)" = "$stamp" ] || rm -f targets/wasm/date.o
# the Linux hints set a desktop HACKDIR after cross-pre1 sets "/"; GIT_HASH and
# GIT_BRANCH replace what the hints would ask git for
make CROSS_TO_WASM=1 HACKDIR=/ PREFIX= GIT_HASH="$commit${dirty:++}" GIT_BRANCH="$branch" all
echo "$stamp" > targets/wasm/date.stamp
mkdir -p targets/web/fonts targets/web/sounds
export PYTHONDONTWRITEBYTECODE=1
python3 win/web/tiles.py targets/web
python3 win/web/icons.py targets/web
cp targets/wasm/nethack.js targets/wasm/nethack.wasm win/web/index.html \
   win/web/rolehack.css win/web/web.js win/web/overlay.js win/web/commands.js \
   win/web/prefs.js win/web/doll.js win/web/feedback.js win/web/layout.js \
   win/web/viewer.js win/web/input.js win/web/channel.js win/web/glide.js win/web/manifest.json win/web/defaults.nh targets/web/
cp win/web/fonts/* targets/web/fonts/
cp win/web/sounds/* targets/web/sounds/
# what the page was built from (named above); the commit's own date, not the
# build's, so an unchanged rebuild keeps its cache version
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
