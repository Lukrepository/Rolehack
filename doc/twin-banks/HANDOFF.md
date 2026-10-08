# Handoff: the portrait/landscape redesign is built

For the Claude workspace "Portrait/landscape UI redesign" in Lucas's Nethack_fork project, and for anyone else who picks up the web port's touch layout. Written on 6 October 2026 by the cloud session that built it (https://claude.ai/code/session_01Dgv3E1gUjAwvSmojZmYB4f).

**This file is on `web`** (merged on 6 October 2026), so once you sync (section 2) it is in your checkout. The cloud session may update it first on its own branch, `claude/exciting-pascal-afplud`. To read the latest at any time:

    git fetch origin
    git show origin/web:doc/twin-banks/HANDOFF.md
    # if this prints anything, a newer version is waiting on the cloud session's branch:
    git log --oneline origin/web..origin/claude/exciting-pascal-afplud -- doc/twin-banks/HANDOFF.md

## In short

- **The redesign you were set up to do is done.** It is designed, built, tested, merged into `web` and live. Its name is **twin banks**: each thumb owns one 3×6 bank of keys in its own bottom corner, the same in both orientations, and the map takes the rest of the screen.
- **Where it is.** `web` at merge commit `34a0abd` (PR [#1](https://github.com/Lukrepository/Rolehack/pull/1), merged 5 October 2026 at 02:40 UTC; the release plan calls it 4 October, Lucas's evening). Live at https://lukrepository.github.io/Rolehack/ from `gh-pages` commit `636e6d9`.
- **Lucas has played it** on his tablet and his phone and is happy with it. Classic is still there, one setting away.
- **Your job is to build on it, not to redo it.** Read section 2 before you run anything. An old checkout, a rebuild from it, or any forced push can quietly put the live page back to the old layout.

## 1. How this came about

- On 29 September the session "Portrait/landscape UI redesign" on Lucas's computer (`session_01XUiAdBEzDUhWCNfghwqN4G`) hit its usage limit partway through the redesign. Lucas took his original prompt to a cloud session, which has the same title. He chose to **start again from that session's plan, not its files**, which he said were incomplete ("the research briefs and initial review documents of our current build"). The cloud session found that the earlier session had pushed nothing. If you are a different workspace, this history is that session's.
- The cloud session audited the old build, researched the question and designed the layout. Lucas read and approved the design on 2 October and asked for it to be built, which took five stages, from 2 to 4 October. The audit and research in `doc/twin-banks/` replace any earlier briefs or reviews.
- **Lucas's goals**, from his prompt:
  - Each control stays in the same place in portrait and landscape: no key changes thumbs, and INVENTORY and the combat flick key no longer move.
  - The map gets more room, at only a small cost in ergonomics: "not a huge amount. we still want to comfortably use the d-pad reliably".
  - On larger screens the layout grows sensibly, with no empty voids.
  - The page knows each player's screen: "we want to make sure that we know the screen size of the users on the web version, and serve the appropriately ratio controls".
- **Where the idea comes from.** Lucas's 24 September portrait board had "twin pads": two banks side by side, each ending in a pad under a thumb. The code describing his 23 September terminal-mode canvas already speaks of "a bank each side". The cloud session's 29 September proposal, "Twin corner banks", extended that board to both orientations, and three independent judges picked it over four other concepts.
- **The Layout Parity canvas** (https://claude.ai/artifact/Jnw6UnvRssJgVWb2frLYPK) was started by the earlier session. It now holds its Main board plus 15 boards from the cloud session, showing the rule as it stood on 2 October. `DESIGN.md` is newer: it adds the 3 October desktop deferral and the 4 October glass band. If you ever publish to that canvas, read it first, so the 15 boards aren't lost.

## 2. Before you change anything: sync safely

Your clone may still be at `ec134a7` (the last commit before the redesign) or older, and it may hold work of your own. Keep both. Work in Git Bash or WSL, in the Rolehack clone. Type branch names exactly as written, in lowercase.

1. **Look first.**
   - Run `git remote -v`. `origin` should be `https://github.com/Lukrepository/Rolehack`, with or without `.git`. If it is anything else, stop and ask Lucas.
   - Run `git status --short --branch --ignored`, `git branch -vv`, `git stash list` and `git log --oneline --branches --not --remotes`.
   - Stashes and other local branches are safe where they are. Don't pop, drop or clear them.
   - Ignored files you want to keep, such as a `.orig` or `.bak` copy, are not saved by git. Copy them out of the clone by hand.
2. **Bookmark where you are**, locally: `git branch backup/before-twin-sync`.
3. **Keep your own unfinished work** on its own branch, if step 1 showed any: `git switch -c room/portrait-landscape-wip`, then `git add -A`, then `git commit -m "Room work kept before syncing with twin banks"`.
   If a branch of either name exists from an earlier try, use a new name, such as `backup/before-twin-sync-2`. Never use `-f` or `-C` here: they would move the bookmark.
4. **Fetch:** `git fetch origin --prune`.
5. **Bring `web` up to date, fast-forward only:** `git switch web`, then `git merge --ff-only origin/web`. If it refuses, read the message:
   - **"would be overwritten"** means step 3 missed some of your files. Run `git switch room/portrait-landscape-wip`, `git add -A` and `git commit -m "More room work"`, then do step 5 again. Never delete those files, run `git clean`, or drop a stash.
   - **"Not possible to fast-forward"** means your local `web` has commits of its own. Keep them under another name and take a fresh `web`: `git branch -m web room/old-web`, then `git branch --unset-upstream room/old-web`, then `git switch web`. Git makes a new `web` from `origin/web`. Don't follow Git's suggestions to pull, merge or rebase. Tell Lucas in one line afterwards; there is nothing for him to decide.
6. **Confirm the work is there:** `git merge-base --is-ancestor 34a0abd HEAD && echo present || echo MISSING`. It must print `present`. If it prints `MISSING`, stop: don't build, deploy or push, and tell Lucas.
7. **An old local `gh-pages`**, if you have one, must not be pushed or pulled by name. Rename it: `git branch -m gh-pages room/old-gh-pages`, then `git branch --unset-upstream room/old-gh-pages`. Don't delete it.
8. **Run the checks** (section 6). Then read `doc/twin-banks/README.md` and the CHANGES at the top of `DESIGN.md`.
9. **Only then look at your own work against it.** To see your own changes and nothing else, use three dots: `git diff --stat origin/web...room/portrait-landscape-wip`. If you made no WIP branch, use `backup/before-twin-sync`. If step 5 renamed your `web`, also look at `room/old-web`. With two dots, the diff lists the whole redesign as if you had deleted it.
10. **Bring pieces across** on a new branch from the twin-banks `web`: `git switch -c room/<piece> origin/web`.
    - A file that is only yours (not on `web`): `git restore --source=room/portrait-landscape-wip -- <path>`.
    - A change to a file both sides have: `git diff origin/web...room/portrait-landscape-wip -- <file> | git apply --3way`.
    - Your own version of a file twin banks replaced, such as an earlier `win/web/layout.js`: read it with `git show room/portrait-landscape-wip:<path>` and port ideas by hand.
    - Don't cherry-pick your WIP commit whole, and never resolve a conflict with `--ours` or `--theirs`.
    - Run the checks after each piece.

## 3. After syncing: what to do first

1. **Your own plan and briefs** are kept on your `room/*` branches. Don't delete them, and don't carry on with them. Anything in them that `DESIGN.md` doesn't cover, offer to Lucas as a numbered suggestion.
2. **Back up your kept work on GitHub**, as new branches, never forced. Run `git push -u origin room/portrait-landscape-wip`, and the same for `room/old-web` or `backup/before-twin-sync` if they hold commits nobody else has.
3. **Write Lucas a short numbered note.** Say what you found, where your old work is kept, and which open items from section 8 you could take. Ask which he wants first. Start nothing that changes the page until he answers. Ask him to update this workspace's instructions from "do the redesign" to "build on twin banks".
4. **Two workspaces may now be working.** Lucas plans to keep using the cloud session for some work too. It pushes only to `claude/exciting-pascal-afplud`. Do your work on your own `room/*` branches from `origin/web`, and bring it into `web` through a pull request, as #1 was. Merge only after the checks pass and Lucas has said yes to the change. Before you start a piece of work or deploy, run `git fetch` and look for new commits on `origin/web`, `origin/gh-pages` and `origin/claude/exciting-pascal-afplud`. Ask Lucas which workspace takes which task.
5. **Leave alone unless Lucas asks:**
   - the Layout Parity canvas;
   - the release-plan doc;
   - the Android repositories (RolehackDroid and RolehackFront);

## 4. What is there

All of the redesign is in the web port (`win/web/`) and its docs (`doc/twin-banks/`). Nothing outside them changed, so the C/Lua core and the WebAssembly build are the same as at `ec134a7`. The Android repositories were only read, never changed.

| file | what |
|---|---|
| `win/web/layout.js` (new) | The rule: one function, `layout(W, H, pointer, settings)`, places every key, the glass, the map, the bands and the panels for any window. Plain module, no DOM. |
| `win/web/viewer.js` (new) | What the page knows beyond the window: the remembered space budget per display mode, size classes with a ±24 dp band, and the glass's 24 dp band. |
| `win/web/overlay.js` | The twin board built from `layout()`; the near-miss guard (12 dp halos, seams, the confirm ring, the ghost deck); the layers on the pad (count, HERE, stairs, COMBAT, FLICK, pins); drawers; and the Settings "Layout" row. |
| `win/web/web.js` | The tap-drift fix for both layouts (a map tap reaches the cell drawn under it), the bands at the rule's places, `--More--` paging, the map-tap guards, and the log and inventory panels on tablets. |
| `win/web/prefs.js`, `rolehack.css`, `commands.js`, `feedback.js`, `defaults.nh` | New settings (`layout: 'twin'`, `mapCell`, `zoomFactor`, the budget, the ghost deck), the twin styles, the HERE drawer, a tick haptic, and comments. |
| `win/web/build.sh`, `win/web/sw.js` | They now ship and cache `layout.js` and `viewer.js`. A `build.sh` from `ec134a7` leaves them out, and the page breaks. |
| `win/web/test/` | Node tests: the rule against 15 golden screens and six variants, the edge windows, the budget, the size classes and the glass band. |
| `doc/twin-banks/` | `README.md` (index, checks, Lucas's decisions), `DESIGN.md` (the design, with CHANGES), `RESEARCH.md`, `AUDIT.md`, `BUILD.md` (the integration report and what was built differently), `figures/`, `checks/` and `harness/`. Also `webtest/`, the browser suites as they ran (section 8). |

Players switch layouts under MENU → Settings → "Layout: twin banks / classic". Twin is the default. A window too square for twin banks, such as a split screen, shows classic without changing the setting.

## 5. Lucas's decisions: don't change them without asking him

They are recorded in `doc/twin-banks/README.md` ("Decisions") and in `DESIGN.md`'s CHANGES.

- **Long rest** is swiped up out of REST (2 October). He let the design's choice stand over his earlier rule, a swipe toward the screen's edge.
- **An empty pin's tap** opens its picker (2 October).
- **The map** drags freely, and locks and centres only at rest (his rule of 27 September).
- **Pray** is a hold of SACRIFICE (his choice of 23 September: tap to sacrifice, hold to pray), at the code's existing 380 ms hold, not the 800 ms the design proposed.
- **"Layout: twin banks / classic"** in Settings: twin by default, classic unchanged.
- **Desktop mode was deferred** (3 October) and **is built since 7 October** (`room/desktop-mode`; DESIGN's CHANGES, "Desktop mode is built", holds his answers): the dock under the map with the mouse or the keyboard in use, key letters, the Ctrl+; prefix, and switching by the input in use (`win/web/input.js`).
- **3440×1440 stays as it is** (4 October): the map spans the window, and the panels sit under it.
- **The glass gets a 24 dp band** (4 October), so the map doesn't jump when a window sits at a step.

Whose call each was: Lucas let the design's Long rest and empty-pin choices stand, asked to skip desktop mode, kept 3440×1440 as it is, and approved the proposed glass band. The map rule is his from 27 September. Pray carries over his 23 September choice at the existing hold time. The twin/classic setting was the cloud session's proposal; he has not objected, and on 5 October he asked to make sure classic stays.

## 6. How to check it is intact

From the top of the checkout. Nothing needs installing. You need node 20.19 or later in the 20 line, or 22.7 or later (23 and 24 are fine). Node 21 and 22.0 to 22.6 can't load `layout.js` as a module. Check with `node --version`.

| command | expected |
|---|---|
| `git merge-base --is-ancestor 34a0abd HEAD && echo present` | `present` |
| `git diff --shortstat ec134a7 34a0abd` | `50 files changed, 75588 insertions(+), 149 deletions(-)` |
| `node --test win/web/test/` | `# fail 0`, with `# tests 149` on node 22 or later. Node 20 also counts `index.js` and `edge-cli.mjs`, so it shows 151. About 3 s. |
| `node doc/twin-banks/checks/sweep.mjs` | `sweep: 73470 screen layouts in 10 sections, 0 issues` (about 75 s on node 22) |
| `node doc/twin-banks/checks/drag.mjs` | `134985 dragged layouts ... 0 issues` (about 17 s on node 22, 45 s on node 20) |
| `git fetch origin && git merge-base --is-ancestor 12bda73 origin/gh-pages && git merge-base --is-ancestor 636e6d9 origin/gh-pages && echo kept` | `kept`: every build since 28 September is still in the live branch's history |

`BUILD.md` says 147 tests: that count is from before the glass band, which added two. Until 6 October, `sweep.mjs` and `drag.mjs` couldn't start under Windows node, because they imported a plain `C:\` path; `checks/lib.mjs` now imports by file URL. That fix hasn't been tried on a real Windows machine, so if either check stops at its first import, run it in WSL.

To see the page exactly as it is live: `git fetch origin && mkdir -p ../rh-site && git archive origin/gh-pages | tar -x -C ../rh-site`, then `python3 -m http.server 8123 --directory ../rh-site` (on Windows, `py -3 -m http.server 8123 --directory ../rh-site`), and open http://localhost:8123/. In Chrome's device toolbar, Lucas's phone is 896×443 and 443×939 at a pixel ratio of 2.4375.

## 7. Rules that keep the work safe

- **Never rewrite or delete a shared branch.** In any push to `web`, `gh-pages`, `claude/exciting-pascal-afplud` or `before-twin-banks`, don't use `--force`, `-f`, `--force-with-lease`, `--force-if-includes`, `--mirror`, `--delete`, a `:branch` refspec or a `+` refspec. (The `+` in your fetch settings is fine.)
  - If a push of your branch is rejected: fetch, rebase your own branch onto `origin/web`, run the checks, and push again.
  - If a deploy's push to `gh-pages` is rejected, someone deployed in the meantime. Run the deploy again from the top.
- **Don't rewrite the rule or the board from your own brief.** `DESIGN.md` is the spec; extend the code that is there. A candidate `layout.js` must pass `RH_LAYOUT=<candidate> node doc/twin-banks/checks/sweep.mjs` (0 issues) and `drag.mjs` before it replaces `win/web/layout.js`. Don't regenerate the golden fixtures to make a change pass.
- **When merging, never take one side wholesale** for anything under `win/web/`. Never check files out from `before-twin-banks` or `ec134a7` to "start clean".
- **Keep the bookmarks.**
  - `before-twin-banks` (at `ec134a7`) marks the last state before the redesign. Never commit to it or move it.
  - `claude/exciting-pascal-afplud` is the cloud session's working branch. Its work reaches `web` through pull requests, as #1 did. Don't delete it.
- **Changes outside `win/web/` need a real build.** Release plan B2 (protecting saves) changes both game cores, and D26 may move the web onto newer DevTeam code. Either means a full `win/web/build.sh` with the Emscripten SDK, which Lucas's machine can run and the cloud session can't. Don't start B2 or any core change until Lucas has answered D26.
- **Page-only changes** can be tried without Emscripten by laying `win/web/` over the live build's core. The recipe is `doc/twin-banks/webtest/websync.sh`. It names the cloud session's folders and port 8766, so change those first. It is valid only while nothing outside `win/web/` changes.
- **On Windows, build and deploy from a clone made inside WSL**:
  - Make it with `cd ~ && git clone https://github.com/Lukrepository/Rolehack && cd Rolehack`.
  - Bring your own branches across with `git fetch /mnt/c/<path to your Windows clone> 'refs/heads/room/*:refs/heads/room/*' 'refs/heads/backup/*:refs/heads/backup/*'`, then run section 6 there.
  - The repo has `* text=auto`, so a Git for Windows checkout has CRLF line endings, and a CRLF `build.sh` fails under bash. Setting `core.autocrlf=input` on that checkout doesn't rewrite files already checked out.
  - Windows folders ignore case, so `Web` and `web` can collide: type branch names exactly.

### Deploying (only when Lucas asks)

Until 28 September, each deploy force-pushed a new commit with no history over `gh-pages` (11 times), so every older build vanished. Since then deploys have been ordinary commits on top, so `12bda73`, `7a06b5e` and `636e6d9` can all still be restored.

1. **Build** in the WSL clone, on a clean checkout of exactly what you mean to publish, which must contain `34a0abd`. `build.sh` never empties `targets/web`, so clear it first: `rm -rf targets/web && sh win/web/build.sh`.
2. **Deploy** by running this whole block as one command, from inside that clone. Each check stops it with a message, and then nothing is pushed:

```bash
bash -euo pipefail <<'DEPLOY'
SRC=$(git rev-parse --show-toplevel)
PAGES="$(dirname "$SRC")/rh-pages"
git -C "$SRC" fetch -q origin
git -C "$SRC" merge-base --is-ancestor 34a0abd HEAD || { echo "STOP: this checkout lacks twin banks (34a0abd)"; exit 1; }
for f in index.html layout.js viewer.js build.json .nojekyll; do
  test -e "$SRC/targets/web/$f" || { echo "STOP: targets/web/$f is missing; rebuild"; exit 1; }
done
grep -q "\"commit\": \"$(git -C "$SRC" rev-parse HEAD)\"" "$SRC/targets/web/build.json" || { echo "STOP: targets/web was built from another commit; rebuild"; exit 1; }
if grep -q '"short": "[0-9a-f]*+"' "$SRC/targets/web/build.json"; then echo "STOP: built from uncommitted changes; commit, then rebuild"; exit 1; fi
git -C "$SRC" worktree remove --force "$PAGES" 2>/dev/null || true
git -C "$SRC" worktree prune
git -C "$SRC" worktree add -q --detach "$PAGES" origin/gh-pages
git -C "$PAGES" rm -rq .
cp -r "$SRC/targets/web/." "$PAGES/"
git -C "$PAGES" add -A
git -C "$PAGES" commit -q -m "Rolehack web build from $(git -C "$SRC" rev-parse --short=9 HEAD)"
git -C "$PAGES" merge-base --is-ancestor 636e6d9 HEAD || { echo "STOP: not on top of the live history"; exit 1; }
git -C "$PAGES" push -q origin HEAD:gh-pages
git -C "$SRC" worktree remove "$PAGES"
echo "deployed $(git -C "$SRC" rev-parse --short=9 HEAD)"
DEPLOY
```

It works only on a temporary folder beside the clone, `rh-pages`, built from `origin/gh-pages`, never from a local `gh-pages`, and it changes folders only with `git -C`. Don't run its lines one at a time: `git rm -rq .` in the wrong folder deletes your source. If it stops, read the message; don't add `-f`. It was tested on a copy of the repository with a stand-in for GitHub. A good build went on top of the live history, and a missing file, a stale build and an uncommitted build were each refused with nothing pushed.

## 8. What is still open

- **The release plan**, with Lucas's next steps, is a doc on claude.ai: https://claude.ai/code/artifact/c7d9a178-a06d-4431-898a-46b2b8ff51ff.
  - Its blockers, B1 to B20, are web and Android work for a public release. The biggest are protecting saves across updates (B2), a place to report bugs (B4) and ForkFront's licence (B11).
  - Lucas is still answering its "This week" list: the ForkFront authors' reply, which keys his backup holds, three decisions (D1 the permanent address, D6 the fork network, D26 which game code the web uses), and turning on Actions for RolehackDroid.
  - Its "Claude" tasks are not yet assigned to a workspace. Ask Lucas which are yours.
- **Not built yet** (`BUILD.md`, "Deviations" 1 and 10 to 16):
  - edge tells;
  - Settings rows for the grip lift, the anchor, left-handed play and COMBAT on the other thumb, which the rule already supports;
  - the sharp tile filter;
  - a few smaller items.

  Build these on what is there.
- **Waiting on Lucas's own playtesting:** the default map cell (`mapCell: 'columns'` now, with "rows" as the alternative), and the other on-device tests in `DESIGN.md` section 18.
- **No automated test ran outside Chromium.** Every suite ran in Playwright's Chromium. Lucas has tried the page on his own tablet and phone, but which browser he used isn't recorded. A full touch-only play-through on a device, and Firefox and iPhone sessions, are still to come (release plan B10).
- **The saved browser suites** are in `doc/twin-banks/webtest/`.
  - They still name the cloud session's paths, ports and global Playwright install, so they don't run as they stand. Their README says how they ran.
  - Start with `doc/twin-banks/webtest/README.md`.
- **Twin banks on Android** is out of scope so far (`DESIGN.md`, "Android, later"). Release plan D13, still open for Lucas, recommends classic at launch and twin banks later as a setting.
  - The Android app is the NetHack community's work: gurrhack's NetHack-Android and its ForkFront interface, carried on by JodiJodington, with Lucas's Rolehack changes on top.
- **Known quirks, not bugs:**
  - A fresh browser's first portrait visit on Lucas's phone uses a 14.68 dp cell until the phone is turned once; after that it is 13.41 dp.
  - A classic map tap sometimes stops after a step or two, because the game interrupts travel, as it did before the redesign.
  - The live `build.json` names `76ea578` on `claude/exciting-pascal-afplud`, whose tree is identical to `34a0abd`.

## 9. Working with Lucas

- He isn't a programmer and doesn't review code. His feedback is about play: what feels off, bugs, and how it plays on his tablet and his phone (896×443 dp landscape and 443×939 portrait, at a pixel ratio of 2.4375).
- Write to him in short, plain sentences, explain any technical word, and give concrete numbers. He likes screenshots when a stage lands.
- He answers numbered questions with numbered answers. Ask before anything that changes what players get, and record his answers in `DESIGN.md`'s CHANGES.
- He cares about backups and about credit. Classic must stay one tap away, history is never rewritten, and the Android app is credited to the NetHack community.

## 10. Links

| what | where |
|---|---|
| The live page | https://lukrepository.github.io/Rolehack/ |
| PR #1, the redesign | https://github.com/Lukrepository/Rolehack/pull/1 |
| Release plan (doc) | https://claude.ai/code/artifact/c7d9a178-a06d-4431-898a-46b2b8ff51ff |
| A beginner's tour of how the page lays out the screen (its live drawing isn't confirmed to load inside the artifact viewer) | https://claude.ai/artifact/TfKZSP7pGueBbkyLy86gU6 |
| Layout Parity canvas (boards as of 2 October) | https://claude.ai/artifact/Jnw6UnvRssJgVWb2frLYPK |
| Layout Evidence, the 29 September audit and research (replaced by `AUDIT.md` and `RESEARCH.md`) | https://claude.ai/artifact/NvJaCQyVZLR2ASnHHq616H |
| The cloud session that built it | https://claude.ai/code/session_01Dgv3E1gUjAwvSmojZmYB4f |

The claude.ai pages are private to Lucas unless he shares them.
