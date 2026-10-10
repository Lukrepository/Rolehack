# Releasing the web page

How a build of the web port reaches players, and how one is tried first. Written on 6 October 2026 with the preview channel (the release plan's D34). The rules that keep `web` and `gh-pages` safe are in `doc/twin-banks/HANDOFF.md`, section 7; this page is the steps.

## The two channels

| channel | address | storage | who |
|---|---|---|---|
| **live** | https://lukrepository.github.io/Rolehack/ | the browser's storage for the origin: games in the IndexedDB database `/save`, settings under `rh.`, the service worker's caches `rolehack-…` | players |
| **preview** | https://lukrepository.github.io/Rolehack/preview/ | the same origin, its own names: games in `/save-preview`, settings under `rhp.`, caches `rhpreview-…` | Lucas and testers, before a build goes live |

Both come from one build; only the preview copy's manifest name and title say "preview". One rule differs at run time: the preview page lets a tester into wizard (debug) mode, with `OPTIONS=playmode:debug` in Settings -> Your option lines, where the live page refuses it (sysconf's `WIZARDS`, opened to everyone for preview by `web.js`; `channel.js` `sysconfFor`). The page tells its channel from its own path (`win/web/channel.js`), so the two never touch each other's games, settings or caches, and can be open side by side. A preview game does not move to the live page (and should not: the live page may run older code). The device report in Settings starts with the channel and the address.

A browser updates a channel on the second visit: the first visit (or the first launch of an installed app) that reaches the server fetches the new version in the background, and the next one runs it. A game in progress is never switched under the player.

## Building

From the top of a checkout in WSL, under bash with the Emscripten SDK in `$HOME/emsdk` (`build.sh`'s `sh` is dash, which cannot load the SDK's environment):

    . ~/emsdk/emsdk_env.sh
    bash win/web/build.sh

It writes `targets/web/` (live) and `targets/web-preview/` (preview). `build.json` in each names the commit; a `+` after the short hash means the tree had uncommitted changes, and such a build is refused by the deploy.

## Trying a build before it goes live

1. Commit the work on a `room/<piece>` branch (the handoff's rule), so the build names a real commit.
2. `win/web/deploy.sh --channel preview --remote <fork> --push`, or `--bundle <file>` where the clone has no GitHub credentials (then fetch the bundle into a clone that has them and push the commit to `gh-pages` as an ordinary fast-forward).
3. Open https://lukrepository.github.io/Rolehack/preview/ on the phone; the second visit runs the new build. Check the device report's first field: `Rolehack <short> (<date>) preview`.
4. When it plays right, open the pull request into `web`, merge, and deploy the live channel the same way with `--channel live`.

On this PC, a local server serving `targets/web` (the `rolehack-web*` launch configurations, or `play-rolehack-web.cmd`) shows the live copy at its root and nothing at `/preview/`; a server serving a folder laid out like the site (`targets/site/` with `preview/` inside, see the test in the preview channel's pull request) shows both.

## Deploying the live channel

    win/web/deploy.sh --channel live --remote <fork> --push     # or --bundle <file>

The script builds the checkout as it stands, refuses a build from uncommitted changes or a tree without the twin banks (`34a0abd`), makes one ordinary commit on top of the remote's `gh-pages` in a temporary worktree beside the clone, keeps the other channel's files as they are, checks the commit sits on the live history (`636e6d9`), and only then pushes. Never force-push `gh-pages`: every build since 28 September 2026 is in its history and can be restored.

After a push, GitHub builds the site within a minute or two. Check with the repository's Actions tab ("pages build and deployment") and by fetching `build.json` from the address.

## What a release of the game core needs besides this

A change outside `win/web/` (the C core, the Lua levels) is a full build with the Emscripten SDK, which only a machine with the SDK can make; the cloud session cannot. The release plan's B2 (protecting saves across updates) and D26 (moving the web onto the Android app's game core) are such changes.
