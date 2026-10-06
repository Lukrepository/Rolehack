# Twin banks on the web port: the final integration pass

4 October 2026.  Branch `claude/exciting-pascal-afplud`: the 15 commits since `ec134a7` (up to `003e336`), and this pass's one fix, `ce38b67`.  Checked against `design/v2/DESIGN.md` (v2 with its CHANGES of 2 and 3 October) and `design/v2/spec.json`.  Nothing was pushed.

## In short

Twin banks work on every screen of the spec.  At all 15 screens of `spec.json`, at density 1 and 2.4375, in a new game each time, every key sits where `layout()` puts it, to 0.014 CSS px; nothing overlaps; nothing comes inside a key's 12 dp halo except by a fraction of a device pixel; no console error.  On the screens seen both ways, the whole page (keys, map, glass, bands, panels) matches `spec.json` to 0.5 dp.  Two minutes of real play on Lucas's phone went through with no error at each density.  The device was turned 13 times in each run: once in the middle of a fight with Fight armed, and once more before that fight was over.  Classic still works, and is unchanged pixel for pixel wherever the earlier stages compared it.

The numbers:

| check | result |
|---|---|
| `node --test win/web/test/` | 147 of 147 pass |
| the design's gate, `checks/sweep.mjs` on the repo's `layout.js` | 73,470 layouts, 0 issues |
| every `spec.json` screen in a new game (`final/screens.mjs`) | 25 captures a density, 464 of 464 checks at each |
| two minutes of play on Lucas's phone (`final/play.mjs`) | 24 of 24 at each density |
| the device turned with something up (`final/turns.mjs`) | 15 of 15 at each density |
| classic, played and switched (`final/classic.mjs`) | 12 of 12 at each density |
| the tap sweeps (`layers/tester/taps.mjs`, 12 runs) | 95,976 real touches, 0 wrong |
| every earlier stage's suite and the reviewers' probes (`final/all.sh`: 5 lanes of 226 runs, the 12 tap sweeps, and the panels' suites again after the fix, 41 runs) | all pass, except the known and explained failures below |

**One breakage was found and fixed** (commit `ce38b67`, `web.js` only, twin banks only).  The tablet stage's message log, scrolled back, should keep the line at its top.  It did not in two cases:
- Once the history was full (256 messages) it moved on one line with every new message.
- A turn that re-wrapped its top line put the next line at the top.

The tablet stage's own re-check probes (`tabrecheck/drift.mjs`, `log.mjs`) show both.  They now pass, and so does every suite that fills, moves or scrolls a panel.

What is missing is listed under "Deviations":
- a few smaller parts of the design that no stage built: edge tells, the Fullscreen item, the grip lift, anchor, combat-thumb and left-hand settings, the sharp tile filter;
- desktop mode, which Lucas deferred.

## What works

Everything below was checked in Chromium with real CDP touches (or a mouse where a mouse is the input), at density 1 and 2.4375 unless said.

- **The rule on the page.** The page's spec is exactly `layout()`'s, run in node with the page's own settings, at all 25 captures a density.  `layout.js` passes its 147 node tests and the design's CI gate (`checks/sweep.mjs` on the repo's `layout.js`: 73,470 layouts in 10 sections, 0 issues).
- **The banks.** Each key's keycap is at its layout rect to at most 0.0138 CSS px; each hit cell answers a tap at the keycap's centre.  Every key is the same distance from its own bottom corner in landscape and portrait, through every turn of the device in the play test and in the screens test.
- **Parity of the map.** One map cell per device, both ways: 13.41 dp on Lucas's phone once it has been seen both ways (34x21 cells in landscape, 32.4x21 in portrait), 12 dp at 360x640, 13.87 at 412-wide phones, 12.82 at 390-wide, 12.5 on the 1024x768 tablet (the whole level in landscape, 60.8x21 in portrait).
- **The header and panels.** Bands at the layout's rects, stacked on phones and side by side on tablets; HP/Pw bars where there is room; the message log under the map in portrait and the log and inventory in the tray on tablets and large windows; a monitor's level grown past 24 dp (31.5 dp at 2560x1440).
- **The tap drift is gone.** In every play run the click sent for a travel tap deep in the map named the cell tapped, and the hero set off toward it.  In one run the game stopped the travel a step short, as it does before the branch too.
- **The near-miss guard.** In the play runs, a map tap in the confirm ring previewed and did not travel, and a map tap with Fight armed disarmed it and sent nothing.  The guard's other rules (halo snap and swallow, the seams, the 120 and 200 ms rules, the ghost deck and its habits) are the layers stage's suites, passing below.
- **Drawers.** WORLD's drawer opens 420x274 inside the map on Lucas's phone, in three columns; a tap beside it closes it and sends nothing; its items run.
- **Layers.** SEARCH held 700 ms kept its count layer; ↑ set SEARCH ×5 (×10 by ↗ on the turned pad); SEARCH then sent `5s`.  The HERE layer, the CONTEXT stairs, the FLICK legend and the habit guards are covered by the layers stage's suites (passing, below).
- **Combat.** COMBAT arms Fight (the pad turns red, ARMED lights); the pad's direction then sends F and the direction (`Fh`, `Fj` in the final runs).  Armed Fight survives a turn of the device, and the pad in the new orientation aims it.
- **Turning the device while something is up** (new `turns.mjs`, 15/15 at each density): the inventory window, Settings, a y/n question with its answers on the pad (Pray), farlook's getpos with the pad moving the cursor, a sticky count layer, the WORLD drawer (it moves inside the portrait map) and a command held in hand all stay up across the turn and still answer.
- **Lucas's decisions** are in as given: Long rest swiped up out of REST; an empty pin's tap opens its picker; the map's free drag, locked and centred only at rest; Pray on the 380 ms hold of SACRIFICE (a 420 ms hold asked "Are you sure you want to pray?" in the play runs, and No on the pad answered it); "Layout: twin banks / classic" in Settings, twin by default.
- **Classic.** A new game in classic: no twin key, the case scaled as always, today's viewport meta, no permanent inventory, no `paranoid_confirmation` line in the options file; its pad walks; a map tap travels; turned both ways.  Switched to twin banks and back at run time through MENU, Settings and DONE, by touch, the game goes on in each.  Pixel and rect comparisons of classic against the commits before the twin stages pass, apart from the known raster noise below.
- **Skins**: light, GameCube, caseless and amber phosphor with key letters on the labels all draw twin banks with no console error (screenshots below).
- **The rest of the earlier suites**, listed under "Test results".

## What does not work, or needs a decision

- **Fixed in this pass:** the message log scrolled back lost its line with a full history, and on a turn that re-wrapped its top line (`ce38b67`; above, and "Test results").
- **Nothing else broken was found.**  Every other failure in the suites is one of these, listed one by one under "Test results":
  - a check the design has since overtaken;
  - a known flaky screenshot tile;
  - a question for Lucas that the design already records;
  - the game's dice in a script that does not allow for them.
- **For Lucas to decide** (DESIGN.md CHANGES, 3 October):
  - the 3440x1440 panels sit under the map rather than beside it;
  - whether the glass choice gets a hysteresis band.  CHANGES lists its steps: 1000x598 -> 600, 1280x634 -> 636, 966 -> 968 wide.  `screens/resize.mjs` meets two of them in a dragged window, at 1000x456..464 and 1000x600, and reports them as 4 failed checks at each density.
- **The first portrait visit in a fresh browser** on Lucas's phone (443x939 with no landscape seen yet) uses a 14.68 dp cell (29.6x21 cells) until the phone is turned once; then 13.41 dp in both orientations.  The design says so (sections 2 and 16, risk 7); seen here exactly.  The keys are the same either way.
- **Farlook's first use** opens the game's getpos help in a text window, so a pad tap does nothing until its OK is tapped.  This is the game's own behaviour and is the same in classic and on the page before the branch (`ec134a7`, checked on port 8795).
- **A classic map tap** sometimes stops after a step or two (2 of 4 times before the branch, 1 of 4 after, in `travel-probe.mjs`): the game interrupts travel, the page sent the click.  Not a regression.

## Deviations from DESIGN.md (v2), and why

Deferred or left by decision:

1. **Desktop mode is not built** (section 4's desk, section 12's input-mode machine, the 40 dp dock, the key legends, the Ctrl+; prefix, `data-input`, the "Controls" setting, "hide the dock", test 7's prefix check).  Lucas deferred it on 2026-10-03; DESIGN.md's CHANGES records it.  A mouse window gets the touch tier its size gives: at 1280x800, 1920x1080 and 2560x1440 the page draws the tablet tier with phone-size banks in the corners, as the "today" rows of section 4 say, and `spec.json`'s mouse specs (the desk) are not what the page draws.  `layout.js` keeps the desk, and its tests still check it.
2. **3440x1440** puts the log and the inventory under the map, between the banks, not beside it (CHANGES, "For Lucas to decide").
3. **The glass ranking has no hysteresis band** (CHANGES, "For Lucas to decide").

Built differently, with the reason:

4. **`paranoid_confirmation:+Remove`** is appended by `web.js` `start()` for a game started in twin banks, and `defaults.nh` only carries it as a comment.  That is v2's section 16 (round 2: B3), so that classic plays as before; the stage's task text had asked for the line in `defaults.nh`.  A game restored from a save keeps the confirmations it was saved with.
5. **`viewport-fit=cover`** is written into the viewport meta at run time while the layout is twin, and removed for classic; `index.html` is unchanged (section 16, B3).
6. **MENU opens Settings**, as it always has, not a drawer.  Section 9 and the layout's drawer pop-up name MENU with WORLD and GAME as drawers; the page kept classic's MENU (Settings is a full-window form, not in the map's drawer rect).
7. **A re-layout re-places every key** and keeps the state by a snapshot (armed Fight, open layers and drawers, a command in hand, REST's swipe), rather than moving only the glass when only the glass changed (section 16).  Simpler, and correct across every turn tested; panels are not refilled when they do not move.
8. **Device pixels.** Bands and the canvas are snapped to whole device pixels, so at density 2.4375 an edge can come up to half a device pixel inside a key's 12 dp halo: the closest measured was 11.84 dp (844x390).  The halos are laid out from the layout's own rects and stand over the canvas (#keys is above #glass), so the guard still owns that sliver.
9. **Classic keeps a pre-existing bug**: holding a drawer item to pin it never worked in classic (the hold closes the drawer under the finger).  The layers stage fixed it for twin banks only (`spendTouch`), to leave classic unchanged.

Not built (no stage had them; each is small or optional):

10. **Edge tells** (section 11): no marker on the map's edge for a monster just outside the panned view.
11. **The Fullscreen item in MENU on Android and the Add to Home Screen hint on iPhone** (section 16).
12. **The settings the rule already takes but the page does not offer**: grip lift (sections 4, 13, 17 Q8), the anchor rule's "physical corners" (section 13), `combatThumb: 'L'` (section 17 Q3) and the left-handed mirror.  `layout.js` and its tests handle all four; the page always passes the defaults.  Adding the geometry ones (grip lift, anchor) is a Settings row and a pass-through; the thumb and hand ones also need the overlay's bearings, pins and ghost spots mirrored, so they are larger.
13. **The sharp tile filter** for non-integer multiples of 16 px (section 11): tiles are drawn nearest-neighbour at every scale, as before the branch.
14. **The map drawn dimmed under the halos in caseless mode** (section 11, a "may").
15. **The nameplate on the MENU screen's title** (section 10): the case's hood and lip are gone in twin banks, and the Settings title still reads "Settings".
16. **The opt-in key counter** (section 17, Q5).

## Screenshots

All under `webtest/final/shots/`, each at `@1` and `@2.4375`:

- **Every spec screen, in a new game:** `screen-<W>x<H>-<how>@<dpr>.png`.
  - Phones and the tablet pair: `landscape-new`, `portrait-turned`, `portrait-new`, `landscape-turned`, for 896x443/443x939, 640x360/360x640, 915x412/412x915, 844x390/390x844 and 1024x768/768x1024.
  - Touch: `touch-new` for 1180x820 and 1366x768.
  - Mouse, the tablet tier: `mouse-new` for 1280x800, 1920x1080 and 2560x1440.
- **The two-minute play:** `play-00-start` to `play-11-end`.  Among them:
  - `play-04-count-layer`: SEARCH's count layer;
  - `play-06-armed-landscape`, `play-07-armed-portrait`: Fight armed, then the turn mid-fight;
  - `play-08-fight-portrait`, `play-09-fight-end`;
  - `play-10-pray-asked`.
- **Turning with something up:** `turns-*-P`.
- **Classic:** `classic-landscape`, `classic-portrait`, `classic-switched-twin`, `classic-switched-back`.
- **Skins:** `skin-{light,gamecube,caseless,keys-labels}-{896x443,443x939}@1.png`.

## Test results

Logs: `webtest/final/logs/<lane>-<name>.log`, one line a run in `logs/<lane>.sum`.  "x2" means at density 1 and 2.4375.  The lanes ran side by side, the tap sweeps two at a time beside them.  A failure marked with a letter is explained after the tables.

**This pass's own checks** (`webtest/final/`):

| suite | result |
|---|---|
| `screens.mjs` 1 / 2.4375 | 25 captures each, in 15 new games: each phone and tablet pair begun in each orientation and turned once (20 captures), and 5 single windows.  464/464 checks each.<br>• Keycap against layout: worst 0.0138 px.<br>• Clearance of map, bands and panels from a key: at least 12.00 dp at 1x, 11.84 dp at 2.4375 (deviation 8).<br>• On every "seen both ways" screen, everything matches `spec.json` to 0.5 dp.  The only difference is the fresh 443x939 portrait's map and log (the guessed budget, as designed). |
| `play.mjs` 1 / 2.4375 | 24/24 each.<br>• 122 s of play each; 13 turns of the device each.<br>• Game turn 1 to 162 and 1 to 166.<br>• 8 and 6 monsters killed, in 11 and 7 attack rounds, 5 and 4 of them through COMBAT.<br>• Guard log: one ring preview and one Fight disarm each.<br>• Questions met on the walk (a trap door) answered No on the pad.<br>• No console error. |
| `turns.mjs` 1 / 2.4375 | 15/15 each. |
| `classic.mjs` 1 / 2.4375 | 12/12 each. |
| `skins.mjs` 1 | light, GameCube, caseless, amber with key letters: twin banks, no console error. |
| `travel-probe.mjs` | Classic's travel taps on `ec134a7` and on HEAD, 4 games each: the click names the cell tapped every time.  The game stops travel short 2 times before the branch and 1 time after it. |

**Node and the rule:** `node --test win/web/test/` 147/147.  `RH_LAYOUT=<repo>/layout.js node checks/sweep.mjs`: 73,470 layouts, 0 issues in all 10 sections.

**The core stage (tap drift, `layout.js`):**

| suite | result |
|---|---|
| `tapdrift`: `taps hfx` | 18/18 centres, 72/72 near corners |
| `tapdrift`: `travel`, `dprchange`, `zoomcheck` | pass |
| `review2`: `sw` | offline boot ok |
| `review2`: `taps`, `dprchange`, `zoomcheck` | pass |
| `review2`: `screen` | twin 175/176 (a) |
| `fix3`: `dprchange`, `zoomcheck`, twin and classic | pass |
| `fix3`: `canvaspx` | pass |
| `fix3`: `screen` | twin 175/176 (a), classic 87/87 |
| `layoutjs/browser` | ran clean |
| `fix2/smoke` | ran clean |

**The banks stage:**

| suite | result |
|---|---|
| `banks/rects` x2 | ALL PASS |
| `banks/behave` | 896x443 24/24 and 443x939 22/22, x2 |
| `banks/extra` | 22/24 (b) |
| `banks/classic` x2 | ALL PASS |
| `banks`: `split`, `split-turned`, `switchglass`, `answers`, `newgame-classic` | pass |
| `fix3/ghostclick`, `fix3/ghostclick2` | 9/9 each |
| `fix3/minor` x2 | 10/10 |
| `fix3/ghostretire`, `rev/ghostretire` | retired after 3 clean sessions; kept in portrait |
| `rev`: `budget`, `est`, `drawer`, `mouse`, `newgame`, `orphans`, `paranoid`, `perf`, `restore2`, `smoke` | pass, no errors |
| `rev/variants` | bad 0, worst 0.014 |
| `rev/switch`, `rev/switch2` | 0 structural differences; 640x360's screenshot not identical (c) |
| `twin/rects` x2 | every window matches `layout()` |
| `twin/behave` | 3 failed at 1x, 2 at 2.4375 (d) |
| `twin/extra` | 2 failed (b) |
| `twin/classic` after and compare | rects identical |
| `twin/smoke` | ran clean |

**The header stage:**

| suite | result |
|---|---|
| `header`: `header`, `more`, `more-turn`, `map`, x2 | ALL PASS |
| `header/classic` | 1x: 2 failures (c); 2.4375: ALL PASS |
| `header`: `taps`, `chips` | ALL PASS |
| `header/tester/rects` and `variants.sh`, x2 | 0 failures in 60 states each, every variant |
| `header/tester/more` x2 | 0 failures in 26 windows |
| `header/tester/more-turn` x2 | 0 failures in 16 runs |
| `header/tester/edges` x2 | 0 failures in 44 windows |
| `header/tester/gestures` x2 | 0 failures in 14 windows |
| `header/tester/taps` | 0 failures in 2,051 and 2,070 judged taps |
| `header/tester/classic` | 14 failures in 11 windows at 1x, 4 in 3 at 2.4375 (e) |
| `header/tester`: `cellswitch`, `bandtaps`, `rotate-p` | 0 failures |
| `header/fix/paging` x2 | 238 runs, 0 failed |
| `header/fix/chipsplace` x2 | 504 placements, 0 windows failed |
| `header/fix/guard` x2 | 57/57 |
| `header/fix/barlabels` x2 | 0 failed |
| `hadv`: `blank1`, `blank`, `pagefull`, `hidden` | `blank`: 39 turned cases, 0 bad; the others as before |
| `hdr-adv`: `moreturn2` P and L, `turnidle`, `whole`, `chipghost3` | pass |
| `header/tester/probe-switch` | as before |
| `hfix2/killturn` x2 | the newest message whole after the turn |
| `hfix2/qsplit`, plain and `MODE=msg`, x2 | 128 runs each, 0 lose a question that fits |
| `hfix2/qmore` x2 | 7/8 (f) |
| `hfix2/samepage` x2 | 288 runs, 0 failed |
| `hfix2/classicturn` | 144 and 96 runs, 0 differ from HEAD |
| `hfix2/sweep` | 526 and 317 turned runs, 0 failed |
| `hfix2/eat` x2 | 0 failures |

**The layers stage:**

| suite | result |
|---|---|
| `layers`: `hitgrid`, `guard`, `layers`, `habits`, x2 | PASS |
| `layers/classic` | 482 and 481 "failures" (g) |
| `layers/tester/rects` x2 | 476/476 |
| `layers/tester/layers` x2 | 392/392 |
| `layers/tester/states` x2 | 166/166 |
| `layers/tester/extra` x2 | 65/65 |
| `layers/tester/popsweep` x2 | 465/465 |
| `layers/tester/classic` x2 | 40/40 |
| `layers/tester/taps` | 12 runs (896x443, 443x939, 360x640 and 390x844, at 1x with no contact radius, 2.4375 with none and 1x with 16 px): 48/48 checks.  95,976 touches, 0 hard or soft misses. |

**The tablet stage:**

| suite | result |
|---|---|
| `tablet`: `tablet`, `panels`, `resize`, x2 | ALL PASS |
| `tablet/compare` x2 | ALL SAME |
| `tablet/classic` x2, 20 windows | ALL PASS |
| `tablet`: `snap`, `voids` | as before |
| `screens/screens` x2 | 306/306 |
| `screens/panels` x2 | 68/68 |
| `screens/resize` | 4 checks fail at each density (h); one more at 2.4375 in the lane, which passes when run alone, twice (`final/recheck/resize-2.4375-*.log`) |
| `screens/phones` | 1x: 101/102 (i); 2.4375: 102/102 |
| `screens/classic` x2 | 56/56 |
| `screens/extras` | 73/73 and 69/69 |
| `screens/rotate` x2 | 27/27 |
| `screens/mapclick` x2 | 17/17 |
| `screens/wheel` x2 | 8/8 |
| `screens/monitor` x2 | 4/4 |
| `tabfix/fixes`, `tabfix/dcheck`, x2 | 0 fail |

**The reviewers' probes** (lane L5; compared with the same probes' logs in `layers/rc/logs/restx.sum` and `tabrecheck/`):

| probe | result |
|---|---|
| `rvlayers`: `guardrad`, `probe` at 896x443 and 443x939, `perf` | PASS; no console errors; rebuild median 6.6 ms |
| `lrev`: `fat` x2, `pins` | the same as before |
| `layers/fin`: `pins`, `busy`, `lit` | 8/8, 8/8, 10/10 |
| `recheck`: `budget`, `budget-dpr`, `ghostclick`, `ghostclick-dpr`, `menudone` | the same as before (PASS) |
| `header-review`: `classic`, `gest`, `moreturn`, `probe`, `textscale` | no errors; the same values |
| `layers/tester`: `idleprobe`, `stickprobe`, `flickprobe` | as before (a sticky count layer drops at 4 s idle) |
| `tablet-review`: `z2`, `z3`, `z4`, `z9`, `z10`, `z11`, x2 | no errors.  The output was the same before and after the fix, apart from decimals. |
| `tabrecheck`: `chips` and `inv`, x2 | all pass |
| `tabrecheck/log` x2 | 2 FAIL each before the fix (j); all pass after it |
| `tabrecheck/drift` | a full history's log MOVED 5 lines before the fix (j); kept after it |
| `tabrecheck/ring`, `tabrev/portrait` | as before |

**After the fix** (lane `fix`, both densities), every suite that fills, moves or scrolls a panel was run again:
- `tabrecheck` `log`, `inv`, `chips`, `drift`: all pass;
- `tabfix` `fixes`, `dcheck`: 0 fail;
- `tablet` `panels`, `tablet`, `resize`: ALL PASS;
- `screens` `screens` 306/306, `panels` 68/68, `rotate` 27/27, `wheel` 8/8, `monitor` 4/4, `classic` 56/56;
- `tablet-review` z-probes: the same output.

This pass's own checks (`own.sh`) were all run again on the fixed page; the table above gives those results.

**The known failures, explained.**  Each was compared with the same suite's log from the last re-check (`tabrecheck/lanes/logs/`, `layers/rc/logs/`) and matches it, except where said.

- **(a)** One random tap at 1280x800 (mouse) lands 18 dp above the left bank's top row, in the confirm ring.  It previews instead of sending a click, which is the guard as designed (section 6).  The script predates the guard.
- **(b)** `mouse-dock` 1366x768 and 1920x1080 expect the desk's 40 dp dock.  Desktop mode is deferred (deviation 1).
- **(c)** Classic's screenshots differ in one 256 px raster tile of the case (x 5..254, y 255..508): 16,890 pixels at 360x640 and 2,321 at 390x844.  Every rect is identical.  Both windows re-run alone: identical.  HEAD against HEAD (`SELF=1`) shows the same 16,890-pixel tile at 360x640.  This is raster noise (`final/recheck`).
- **(d)** "taps outside the map never reach it" (443x939, cased and caseless) is the banks stage's expectation that a tap in the halo reaches nothing.  The layers stage made the halo snap within 8 dp to the key (section 6).  At 1x a third: "COMBAT layer: Kick, then a direction" sent `^D l` correctly; the game then asked "Really attack Hachi?", because the pet stood where the kick aimed, and the script's own Esc answered it.  This depends on the game's dice, not on the page.
- **(e)** That suite's HEAD (port 8769) is the commit before the header stage, so "the options file differs from HEAD's", by the twin lines and comments added since.  After a run-time switch on the tablet window, the empty panes layer (`#panes`, `pointer-events: none`) is still in the DOM.  Pixel differences: 0 everywhere.  The same as the last re-check.
- **(f)** The one open limit the header stage left: a question longer than a 2-row band on 360x640 in landscape is not whole at the end.
- **(g)** The classic part of `layers/classic` is identical at every window: rects, pixels, options file, meta, walking, and the run-time switch.  The exception is (c)'s tile at 360x640 at 1x.  The 481 "failures" are its last part, which holds the twin keycaps to HEAD's keys on port 8768.  It was written when 8768 served the commit before the layers stage, whose key element was the keycap.  8768 now serves `8e3ebda`, whose key element is the hit cell, so all 13 windows x 37 keys differ by construction.  The last re-check left this suite out of its lanes.
- **(h)** The glass ranking's steps, which DESIGN.md's CHANGES leave for Lucas: the drawn cell turns back at 1000x456..464 (16 -> 15 dp) and 1000x600 (16 -> 12 dp) in a dragged window.
- **(i)** 5 pixels at the glass's rounded corner at 443x939 (x 433-438, y 561-563).  The tester recorded HEAD alternating between the same two renderings.
- **(j)** Fixed in `ce38b67`.  Once the history was full (256 messages), each new message dropped its oldest line from the log's top, and the panel was redrawn at the same scrollTop: a log scrolled back moved on one line a message.  A turn that re-wrapped the top line (62 px tall in the tablet's tray, 21 px in the portrait glass) put back its 22 px offset clamped to the line's end, so the next line came to the top.

## How to run it again

From `webtest/final/`:

- **Setup.** `all.sh` and `own.sh` sync the working tree first (`scratchpad/websync.sh`, port 8766).  For the single scripts, run `websync.sh` yourself.
- **This pass's own checks.**
  - `./own.sh` runs all of them at both densities and writes `own.sum`.
  - One at a time: `node screens.mjs <dpr>` (every `spec.json` screen), `node play.mjs <dpr> [seconds]`, `node turns.mjs <dpr>`, `node classic.mjs <dpr>`, `node skins.mjs <dpr>`.
- **The earlier stages' suites.** `bash all.sh L1|L2|L3|L4|L5|fix` runs one lane; `./taps.sh [parallel]` runs the tap sweeps.  Logs go to `logs/<lane>-<name>.log`, with one line a run in `logs/<lane>.sum`.
  - The lanes need the head sites still up on ports 8768, 8772, 8782 and 8791.
- **Classic travel, before and after the branch.** `node travel-probe.mjs <origin>`; `base-site/` holds `ec134a7`'s page files, served on port 8795.
