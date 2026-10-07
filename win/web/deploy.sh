#!/bin/bash
# Publish the web page to GitHub Pages: the live channel (the site's root) or the
# preview channel (/preview/), each without touching the other.  doc/RELEASING.md
# says when to run it; doc/twin-banks/HANDOFF.md has the rules it keeps.
#
#   win/web/deploy.sh [--channel live|preview] [--remote NAME] [--push | --bundle FILE]
#
# It builds the checkout as it stands (bash, with the Emscripten environment
# loaded), refuses a build from uncommitted changes or from a tree without the
# twin banks, makes one ordinary commit on top of the remote's gh-pages in a
# temporary worktree beside the clone (rh-pages), and then either pushes it
# (--push: a fast-forward, never forced) or writes it to a bundle (--bundle) for
# a clone that holds the credentials.  Nothing is pushed if any check fails.
set -euo pipefail

CHANNEL=live; REMOTE=origin; PUSH=; BUNDLE=
while [ $# -gt 0 ]; do
  case "$1" in
    --channel) CHANNEL="$2"; shift 2 ;;
    --remote) REMOTE="$2"; shift 2 ;;
    --push) PUSH=1; shift ;;
    --bundle) BUNDLE="$2"; shift 2 ;;
    *) echo "unknown option $1"; exit 2 ;;
  esac
done
case "$CHANNEL" in live|preview) ;; *) echo "STOP: --channel is live or preview"; exit 2 ;; esac
[ -n "$PUSH" ] || [ -n "$BUNDLE" ] || { echo "STOP: say --push or --bundle FILE"; exit 2; }

SRC=$(git rev-parse --show-toplevel)
cd "$SRC"
git remote get-url "$REMOTE" >/dev/null || { echo "STOP: no remote $REMOTE"; exit 1; }
git fetch -q "$REMOTE"
test -z "$(git status --porcelain --untracked-files=no)" || { echo "STOP: uncommitted changes; commit first"; exit 1; }
HEAD=$(git rev-parse HEAD)
git merge-base --is-ancestor 34a0abd HEAD || { echo "STOP: this checkout lacks twin banks (34a0abd)"; exit 1; }

# the build, under bash: build.sh's sh is dash, which cannot source emsdk_env.sh
if ! command -v emcc >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  . "${EMSDK:-$HOME/emsdk}/emsdk_env.sh" >/dev/null 2>&1 || { echo "STOP: no Emscripten (EMSDK=$HOME/emsdk)"; exit 1; }
fi
rm -rf targets/web targets/web-preview
bash win/web/build.sh
OUT=targets/web; [ "$CHANNEL" = preview ] && OUT=targets/web-preview
for f in index.html layout.js viewer.js channel.js build.json; do
  test -e "$OUT/$f" || { echo "STOP: $OUT/$f is missing"; exit 1; }
done
grep -q "\"commit\": \"$HEAD\"" "$OUT/build.json" || { echo "STOP: $OUT was built from another commit"; exit 1; }
if grep -q '"short": "[0-9a-f]*+"' "$OUT/build.json"; then echo "STOP: built from uncommitted changes"; exit 1; fi

# the pages commit, in a temporary worktree from the remote's gh-pages
PAGES="$(dirname "$SRC")/rh-pages"
git worktree remove --force "$PAGES" 2>/dev/null || true
git worktree prune
git worktree add -q --detach "$PAGES" "$REMOTE/gh-pages"
if [ "$CHANNEL" = live ]; then
  # everything at the root goes, the preview channel stays
  git -C "$PAGES" rm -rq -- . ':(exclude)preview' 2>/dev/null || true
  cp -r "$SRC/targets/web/." "$PAGES/"
  touch "$PAGES/.nojekyll"
else
  git -C "$PAGES" rm -rq -- preview 2>/dev/null || true
  rm -rf "$PAGES/preview"
  mkdir -p "$PAGES/preview"
  cp -r "$SRC/targets/web-preview/." "$PAGES/preview/"
fi
git -C "$PAGES" add -A
if git -C "$PAGES" diff --cached --quiet; then echo "nothing to deploy: the $CHANNEL channel already holds this build"; git worktree remove --force "$PAGES"; exit 0; fi
git -C "$PAGES" commit -q -m "Rolehack $CHANNEL build from $(git rev-parse --short=9 HEAD)"
git -C "$PAGES" merge-base --is-ancestor 636e6d9 HEAD || { echo "STOP: not on top of the live history"; exit 1; }
NEW=$(git -C "$PAGES" rev-parse HEAD)
git -C "$PAGES" log --oneline -2
if [ -n "$PUSH" ]; then
  git -C "$PAGES" push -q "$REMOTE" HEAD:gh-pages
  echo "deployed the $CHANNEL channel from $(git rev-parse --short=9 HEAD) as gh-pages $(git rev-parse --short=9 "$NEW")"
else
  # a bundle needs a named ref on its positive side
  git update-ref refs/heads/room/pages-deploy "$NEW"
  git bundle create "$BUNDLE" "$REMOTE/gh-pages..room/pages-deploy"
  git branch -D room/pages-deploy >/dev/null
  echo "bundled the $CHANNEL channel's pages commit $(git rev-parse --short=9 "$NEW") to $BUNDLE; push it as a fast-forward to gh-pages"
fi
git worktree remove --force "$PAGES"
