# Handoff: the portrait/landscape redesign is built

For the Claude workspace "Portrait/landscape UI redesign" in Lucas's Nethack_fork project, and for anyone else who picks up the web port's touch layout. Written on 6 October 2026 by the cloud session that built it (https://claude.ai/code/session_01Dgv3E1gUjAwvSmojZmYB4f).

## In short

- **The redesign you were set up to do is done.** It is designed, built, tested, merged into `web` and live. Its name is **twin banks**: each thumb owns one 3×6 bank of keys in its own bottom corner, the same in both orientations, and the map takes the rest of the screen.
- **Where it is.** `web` at merge commit `34a0abd` (PR [#1](https://github.com/Lukrepository/Rolehack/pull/1), merged 5 October 2026 at 02:40 UTC). Live at https://lukrepository.github.io/Rolehack/ from `gh-pages` commit `636e6d9`.
- **Lucas has played it** on his tablet and his phone and is happy with it. Classic is still there, one setting away.
- **Your job is to build on it, not to redo it.** Read section 2 before you run anything: an old checkout, a rebuild from it, or any `--force` can quietly put the live page back to the old layout.

## 1. How this came about

- On 29 September this room hit its usage limit partway through the redesign. Lucas took his original prompt to a cloud session and chose to **start again from this room's plan, not its files**, which he said were incomplete ("the research briefs and initial review documents of our current build"). The cloud session found that this room had pushed nothing.
- The cloud session then audited the old build, researched the question and designed the layout. Lucas read and approved the design on 2 October and asked for it to be built, which took five stages, from 2 to 4 October. The audit and research in `doc/twin-banks/` replace any earlier briefs or reviews in this room.
- **Lucas's goals**, from his prompt: each control stays in the same place in portrait and landscape (no key changing thumbs; INVENTORY and the combat flick key no longer move); the map gets more room at only a small cost in ergonomics ("not a huge amount. we still want to comfortably use the d-pad reliably"); and on larger screens the layout grows sensibly, with no empty voids.
- **The idea is partly Lucas's own.** His 24 September portrait board had "twin pads" (two banks side by side, each ending in a pad under a thumb), and his terminal-mode case already had "a bank each side". The cloud session's 29 September proposal, "Twin corner banks", extended that board to both orientations, and three independent judges picked it over four other concepts.
- **The Layout Parity canvas** (https://claude.ai/artifact/Jnw6UnvRssJgVWb2frLYPK), which this room started, now has 15 boards from the cloud session. They show the rule as it stood on 2 October; `doc/twin-banks/DESIGN.md` is newer: it adds the 3 October desktop deferral and the 4 October glass band.

## 2. Before you change anything: sync safely

Your clone may still be at `ec134a7` (the last commit before the redesign) or older, and it may hold work of your own. Keep both. In Git Bash or WSL, in the Rolehack clone (branch names are exact and lowercase):

1. **Look first.** `git status --short --branch`, `git branch -vv`, `git stash list`, `git log --oneline -3`. `origin` should be `https://github.com/Lukrepository/Rolehack`.
2. **Bookmark where you are**, locally: `git branch backup/before-twin-sync`
3. **Keep your own unfinished work** on its own branch, if step 1 showed any:
   `git switch -c room/portrait-landscape-wip`, then `git add -A`, then `git commit -m "Room work kept before syncing with twin banks"`
4. **Fetch:** `git fetch origin --prune`
5. **Move `web` forward, fast-forward only:** `git switch web`, then `git merge --ff-only origin/web`.
   If that refuses, your local `web` has commits of its own. **Do not force or reset.** They are safe on the backup branch; work from `git switch -c twin-sync origin/web` and ask Lucas before moving `web`.
6. **Confirm the work is there:** `git merge-base --is-ancestor 34a0abd HEAD && echo present || echo MISSING`. It must print `present`.
7. **Run the checks** (section 6). Then read `doc/twin-banks/README.md` and the CHANGES at the top of `DESIGN.md`.
8. **Only then compare your own work** with what is there: `git diff --stat web room/portrait-landscape-wip`. Bring pieces across on a new branch from `web`, by hand or with cherry-pick. Never copy a whole `win/web/layout.js`, `overlay.js`, `web.js`, `build.sh` or `sw.js` over the current one. Run the checks after each piece.

If your clone has an old local `gh-pages` branch, leave it alone; don't push it (section 5).

## 3. What is there

All of it is in the web port (`win/web/`) and its docs (`doc/twin-banks/`). Nothing outside them changed, so the C/Lua core and the WebAssembly build are the same as at `ec134a7`. The Android repositories were only read, never changed.

| file | what |
|---|---|
| `win/web/layout.js` (new) | The rule: one function, `layout(W, H, pointer, settings)`, places every key, the glass, the map, the bands and the panels for any window. Plain module, no DOM. |
| `win/web/viewer.js` (new) | What the page knows beyond the window: the remembered space budget per display mode, size classes with a ±24 dp band, and the glass's 24 dp band. |
| `win/web/overlay.js` | The twin board built from `layout()`, the near-miss guard (12 dp halos, seams, the confirm ring, the ghost deck), the layers on the pad (count, HERE, stairs, COMBAT, FLICK, pins), drawers, and the Settings "Layout" row. |
| `win/web/web.js` | The tap-drift fix for both layouts (a map tap reaches the cell drawn under it), the bands at the rule's places, `--More--` paging, the map-tap guards, and the log and inventory panels on tablets. |
| `win/web/prefs.js`, `rolehack.css`, `commands.js`, `feedback.js`, `defaults.nh` | New settings (`layout: 'twin'`, `mapCell`, `zoomFactor`, the budget, the ghost deck), twin styles, the HERE drawer, a tick haptic, comments. |
| `win/web/build.sh`, `win/web/sw.js` | Now ship and cache `layout.js` and `viewer.js`. A `build.sh` from `ec134a7` leaves them out, and the page breaks. |
| `win/web/test/` | Node tests: the rule against 15 golden screens and six variants, edge windows, the budget, the size classes and the glass band. |
| `doc/twin-banks/` | `README.md` (index, checks, Lucas's decisions), `DESIGN.md` (the design, with CHANGES), `RESEARCH.md`, `AUDIT.md`, `BUILD.md` (the integration report and what was built differently), `figures/`, `checks/`, `harness/`, and `webtest/` (the browser suites as they ran: see section 7). |

Players switch layouts under MENU → Settings → "Layout: twin banks / classic". Twin is the default. A window too square for twin banks (split screen, for example) shows classic without changing the setting.

## 4. Lucas's decisions: don't change them without asking him

They are recorded in `doc/twin-banks/README.md` ("Decisions") and in `DESIGN.md`'s CHANGES.

- **Long rest** is swiped up out of REST (2 October; he let the design's choice stand over his earlier "sideways").
- **An empty pin's tap** opens its picker (2 October).
- **The map** drags freely, and locks and centres only at rest (his rule of 27 September).
- **Pray** stays on the 380 ms hold of SACRIFICE, not the 800 ms the design proposed.
- **"Layout: twin banks / classic"** in Settings, twin by default, classic unchanged.
- **Desktop mode is deferred** (3 October): a mouse window gets the touch layout its size gives. He wants it built later: the dock, key legends, the Ctrl+; prefix, switching by input. The desk stays in `layout.js`, switched off.
- **3440×1440 stays as it is** (4 October): the map spans the window, and the panels sit under it.
- **The glass gets a 24 dp band** (4 October), so the map doesn't jump when a window sits at a step.

To be exact about whose call each was: Lucas made the Long rest, empty-pin, desktop, 3440×1440 and glass-band decisions himself, and the map rule is his own from 27 September. Pray at 380 ms carried over his own earlier code, and the twin/classic setting was the cloud session's proposal. He has not objected to either, and on 5 October he asked to make sure classic stays.

## 5. Rules that keep the work safe

- **Never `--force`, `-f` or a `+` refspec** on `web`, `gh-pages`, `claude/exciting-pascal-afplud` or `before-twin-banks`. If a push is rejected, fetch, fast-forward or rebase onto `origin/web`, run the checks, and push again.
- **Before any build:** `git merge-base --is-ancestor 34a0abd HEAD` must succeed, and `git status` must be clean (a dirty tree stamps `+` into `build.json`). After the build, `targets/web/layout.js` and `targets/web/viewer.js` must exist.
- **Deploy only when Lucas asks, and on top of the live branch, not as a fresh orphan.** Until 28 September each deploy force-pushed a new parentless commit over `gh-pages` (11 times), so every older build vanished. Since then the deploys have been ordinary commits on top, so `12bda73`, `7a06b5e` and `636e6d9` are all still there to roll back to. Do it like this:

      git fetch origin
      git worktree add --detach ../rh-pages origin/gh-pages    # the live branch, not an old local gh-pages
      cd ../rh-pages
      git rm -rq .
      cp -r ../Rolehack/targets/web/. .       # your clone's targets/web; the dot keeps .nojekyll
      git add -A
      git commit -m "Rolehack web build from <short commit>"
      git merge-base --is-ancestor 636e6d9 HEAD && git push origin HEAD:gh-pages

  The page's own files can be updated without Emscripten, as the cloud session did, by laying `win/web/` over the live build's core: see `doc/twin-banks/webtest/websync.sh`. That is valid only while nothing outside `win/web/` changes.
- **Don't rewrite the rule or the board from your own brief.** `DESIGN.md` is the spec; extend the code that is there. A candidate `layout.js` must pass `RH_LAYOUT=<candidate> node doc/twin-banks/checks/sweep.mjs` (0 issues) and `drag.mjs` before it replaces `win/web/layout.js`. Don't regenerate the golden fixtures to make a change pass.
- **When merging, never take your side wholesale** for anything under `win/web/`, and never check files out from `before-twin-banks` or `ec134a7` to "start clean".
- **Keep the bookmarks.** `before-twin-banks` (at `ec134a7`) marks the last state before the redesign; never commit to it or move it. Don't delete `claude/exciting-pascal-afplud`: it holds the saved browser suites, which are not on `web` yet.
- **On Windows,** build in WSL from a clone with LF line endings (a WSL-native clone, or `core.autocrlf=input`): the repo has `* text=auto`, and a CRLF `build.sh` fails under bash. Type branch names exactly: Windows folders ignore case, so `Web` and `web` can collide.

## 6. How to check it is intact

From the top of the checkout, with node 20.19 or later, or 22.7 or later (node 21 fails). Nothing needs installing.

| command | expected |
|---|---|
| `git merge-base --is-ancestor 34a0abd HEAD && echo present` | `present` |
| `git diff --shortstat ec134a7 34a0abd` | `50 files changed, 75588 insertions(+), 149 deletions(-)` |
| `node --test win/web/test/` | `# tests 149`, `# pass 149`, `# fail 0` (about 3 s) |
| `node doc/twin-banks/checks/sweep.mjs` | `sweep: 73470 screen layouts in 10 sections, 0 issues` (about 75 s) |
| `node doc/twin-banks/checks/drag.mjs` | `134985 dragged layouts ... 0 issues` (about 17 s) |
| `git log --oneline -3 origin/gh-pages` | `636e6d9`, `7a06b5e`, `12bda73` (or a newer build on top) |

To see the page exactly as it is live: `git archive origin/gh-pages | tar -x -C ../rh-site`, then `python3 -m http.server 8123 --directory ../rh-site`, and open http://localhost:8123/. In Chrome's device toolbar, 896×443 and 443×939 at a pixel ratio of 2.4375 is Lucas's phone.

`BUILD.md` says 147 tests: that count is from before the glass band, which added two.

## 7. What is still open

- **The release plan**, with Lucas's next steps, is a doc on claude.ai: https://claude.ai/code/artifact/c7d9a178-a06d-4431-898a-46b2b8ff51ff. Its blockers B1 to B20 are web and Android work for a public release. The biggest are protecting saves across updates (B2), a place to report bugs (B4) and ForkFront's licence (B11). Lucas is still answering its "This week" list: the ForkFront authors' reply, which keys his backup holds, three decisions (D1 the permanent address, D6 the fork network, D26 which game code the web uses), and turning on Actions for RolehackDroid.
- **Not built yet** (`BUILD.md`, "Deviations" 1 and 10 to 16): desktop mode; edge tells; Settings rows for the grip lift, anchor, left-handed and COMBAT-on-the-other-thumb options, which the rule already supports; the sharp tile filter; and a few smaller items. Build these on what is there.
- **Waiting on Lucas's own playtesting:** the default map cell (`mapCell: 'columns'` now; the "rows" option is the alternative) and the other on-device tests in `DESIGN.md` section 18.
- **Never tested outside Chromium.** Every automated test ran in Playwright's Chromium; Firefox, Safari and real touch on a device are still to come (release plan B10).
- **The saved browser suites** are in `doc/twin-banks/webtest/`, on `claude/exciting-pascal-afplud` only (commit `6494df8`), and not yet on `web`. They still name the cloud session's paths, ports and global Playwright install, so they don't run as they stand; their README says how they ran. Read them without checking out: `git show origin/claude/exciting-pascal-afplud:doc/twin-banks/webtest/README.md`.
- **Twin banks on Android** is later work (release plan D13; `DESIGN.md`, "Android, later"). The Android app is the NetHack community's: gurrhack's NetHack-Android and its ForkFront interface, carried on by JodiJodington, with Lucas's Rolehack changes on top. It keeps the classic interface Lucas ascended with.
- **Known quirks, not bugs:** a fresh browser's first portrait visit on Lucas's phone uses a 14.68 dp cell until the phone is turned once (13.41 dp after); a classic map tap sometimes stops travel a step short, as it did before; the live `build.json` names `76ea578` on `claude/exciting-pascal-afplud`, whose tree is identical to `34a0abd`.

## 8. Working with Lucas

- He isn't a programmer and doesn't review code. His feedback is about play: what feels off, bugs, his tablet and his phone (896×443 dp landscape and 443×939 portrait, at a pixel ratio of 2.4375).
- Write to him in short, plain sentences, explain any technical word, and give concrete numbers. He likes screenshots when a stage lands.
- He answers numbered questions with numbered answers. Ask before anything that changes what players get, and record his answers in `DESIGN.md`'s CHANGES.
- He cares about backups and about credit. Classic must stay one tap away, history is never rewritten, and the Android app's authors are the NetHack community's.

## 9. Links

| what | where |
|---|---|
| The live page | https://lukrepository.github.io/Rolehack/ |
| PR #1, the redesign | https://github.com/Lukrepository/Rolehack/pull/1 |
| Release plan (doc) | https://claude.ai/code/artifact/c7d9a178-a06d-4431-898a-46b2b8ff51ff |
| A beginner's tour of how the page lays out the screen | https://claude.ai/artifact/TfKZSP7pGueBbkyLy86gU6 |
| Layout Parity canvas (boards as of 2 October) | https://claude.ai/artifact/Jnw6UnvRssJgVWb2frLYPK |
| The cloud session that built it | https://claude.ai/code/session_01Dgv3E1gUjAwvSmojZmYB4f |

The claude.ai pages are private to Lucas unless he shares them.
