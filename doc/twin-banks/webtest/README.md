# The browser suites, as they ran

These are the Playwright suites and probes that checked the twin-banks redesign in a real browser, with real touches, against a local copy of the page. They ran in the cloud session that built the redesign (2 to 4 October 2026; the release research's reproductions on 5 October). They are kept here as they ran, so the work can be checked again and built on. Lucas asked for them to be saved on 6 October 2026.

They are not yet runnable as they stand. Making them run on every change is Stage 0 work in the release plan ("Checks running automatically on every change").

## What is here

| folder | what |
|---|---|
| `suites/` | The session's `webtest/` folder: one folder per stage and per review round. [`suites/FINAL.md`](suites/FINAL.md) is the final report, with every result and how each suite was run. The final suites are in `suites/final/` (`screens.mjs`, `play.mjs`, `turns.mjs`, `classic.mjs`, `skins.mjs`, `travel-probe.mjs`, `all.sh`, `own.sh`), and the tap sweeps in `suites/layers/tester/taps.mjs`. |
| `repro/` | The release research's reproductions (5 October). `web/saves.mjs` and `saves2.mjs` show that a game restored from its checkpoint skips the save-version check, and what a refused save looks like (release plan B2; findings WEB-01 and WEB-02). The rest cover boot failures (`fail*.mjs`), updates (`sw.mjs`), the desktop keyboard (`desk.mjs`, `ext*.mjs`), the first visit and roles (`first.mjs`, `roles.mjs`) and timing. `verify-web/` holds the second reviewer's re-runs. |
| `probes/` | Smaller probes: the glass's band (`hyst/`), the guided tour's checks (`tour/`), and the design's verification rounds (`verify-v2/`, `verify-player/`). |
| `websync.sh` | The helper every suite calls first. It copies the page files from the checkout over a deployed build and serves it on port 8766. |
| `copies/` | What the suites served or tested in place of the current files: see "Copies" below. |

## How they ran

- **Node 22 and Playwright 1.56.1**, installed globally. The scripts import `/usr/local/lib/node_modules/playwright/index.mjs` and launch Chromium from `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- **Paths are the session's own.** The scripts name the session's scratch folder (`/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/...`, which held `suites/` as `scratchpad/webtest/`) and the checkout at `/home/user/Rolehack`. To run one elsewhere, change those two paths.
- **The page under test** was the deployed build's core (`nethack.js` and `nethack.wasm` from `gh-pages`, unchanged since `ec134a7`), with the checkout's page files copied over it by `websync.sh`, served on `http://localhost:8766/`. No Emscripten was needed.
- **Older builds for comparison** were served on other ports: 8768, 8772, 8782 and 8791 for the "head" sites of earlier stages, and 8795 for `ec134a7` (`suites/final/base-site/`). `FINAL.md` says which suite used which.
- **Densities.** Most suites take the device pixel ratio as their first argument: 1 or 2.4375 (Lucas's phone).

## What was left out

- Logs, run summaries, screenshots and videos: about 7,300 files, 1.8 GB. `FINAL.md` quotes the results that matter.
- Large run outputs: recorded taps, layout snapshots and screen dumps.
- Third-party documentation the research read (GitHub's Pages docs, MDN's storage page, browser-compatibility data).
- Copies of the page and of its node tests, which are recorded rather than kept (below).

## Copies

Many suites served a copy of the page as it stood at an earlier commit, sometimes with a small patch: for example, a site with the near-miss guard switched off, to show that a check fails without it. The mutation checks (`suites/layoutjs/mutants*/`, `suites/*/mut/`) ran the node tests against a copy of `layout.js` with one deliberate bug each, to show the tests catch it. These copies are not kept. [`copies/manifest.json`](copies/manifest.json) lists each one with the commit it matches. Where the copy differed from that commit, the difference is in `copies/<path>.diff`. For a mutant's `layout.js`, that diff is the deliberate bug; its test files were the working copies of the day. To rebuild one:

    git show <commit>:win/web/<file> > <file>
    patch <file> < doc/twin-banks/webtest/copies/<path>.diff    # only where a diff is listed

All 245 copies are listed: 180 match a commit exactly, and 65 match one with a diff. The core (`nethack.js`, `nethack.wasm`) is not listed: it is the `gh-pages` build's, unchanged since `ec134a7`.

Leaving the test copies out also keeps this folder clear of the node test runner: run the node tests as the docs do, with a path (`node --test win/web/test/`).

The selection, the manifest and the diffs were made by a script that walked the session's scratch folder on 6 October 2026. Nothing in `suites/`, `repro/` or `probes/` was edited.
