# Guarded twin banks: the layout, v2

2 October 2026. For Lucas. The final design of 29 September (guarded twin banks), corrected after three independent verifiers (metrics and rules, engineering, player) and Lucas's decisions of 2 October, then again after a second round of two verifiers (the rule; behaviour and the spec) the same day. This copy replaces it; the earlier one is not kept in the repo.

Everything comes from one function, `layout(W, H, pointer, settings)`, in `win/web/layout.js`: a plain ES module with no imports, no DOM and no file reads, so the web page imports it as it is. It never throws, and every result says whether the page may draw it (`usable`; otherwise the page shows classic). The 15 scored screens are the web port's golden fixtures (`win/web/test/fixtures/spec.json`, with the variants beside it), and `node --test win/web/test/` holds the rule to them. One drawing per screen is in `figures/` (`spec.<W>x<H>.svg`). `checks/sweep.mjs` is the CI gate (`node doc/twin-banks/checks/sweep.mjs`), and `checks/drag.mjs` checks the glass's band the way the page uses it. The design's other checks, its hit maps and the verifiers' scripts stayed in the working session; the numbers they gave are in this document.

*In the repo (4 October 2026).* This is the design as the web build used it, with its CHANGES up to the build. `BUILD.md` beside it is the build's final integration report: what was checked, and where the page differs from this document. `RESEARCH.md` is the research brief and `AUDIT.md` the audit of the build before the redesign, both cited throughout as "the brief" and "the audit".
---

## CHANGES (v2, 2 October 2026)

### The status lines at the text metric, vanilla's `hitpointbar`, no HP/Pw bars (Lucas, 2026-10-08)

From Lucas's first laptop test of desktop mode (the status-lines brief, `status-lines-brief-2026-10-08.md` in the workspace): "the entire stat and status section needs to have larger text. the raw numbers are more valuable than seeing a bar", and, of the inverse-video name and title, "follow vanilla's hitpointbar option". His answers to the five questions put to him the same day:

1. **`hitpointbar` stays off in our defaults** ("ship as vanilla does"). The inverse-video bar behind the name and title is vanilla's option (default off; tty draws it when on), and both builds drew it always. The web now reads `iflags.wc2_hitpointbar` from the core each time the status is drawn (`winshim.c` `web_hitpointbar()`, `web.js` `statusHtml()`): a plain title unless the player turns the option on. Lucas's larger goal, for later: a better guide to the options menu (vanilla's own "all options" menu, perhaps with tooltips).
2. **The two thin HP and Pw bars are dropped for good**, no setting to keep them. They were this design's (section 10, the review of 2026-10-02), not vanilla's. `barsHtml()` and its CSS are gone; the rule no longer keeps 14 dp for them under a stacked status band, and `header()` has no `statusExtra`: that height goes back to the message rows (up to 4) and the log, as the rest of the spare does (section 9 of `layout.js`).
3. **The status lines are set at the text metric**, as the message rows are (the band font of 2026-09-28): an x-height of 9.5 CSS px in the text face, times the Text size setting and the system's text size, one message row per line, 3 lines (2 in compact, none hidden) plus the band's 3 dp above and 4 below. `textMetrics()` returns `statusH` as `STATUS_ROWS × msgRowH + STATUS_PAD × textScale`; `STATUS_H`, the rule's default, is 84.59 dp (48 until now, with 14.2 px text of a 5.7 px x-height, under the critical print size). **One setting for both bands:** "Message size" is renamed **Text size** and "Message font" **Text font**; the ids (`msgSize`, `msgFont`) are unchanged, so players' choices keep. Classic is unchanged (its status stays at the case's scale in the screen font).
4. **A line too long for a narrow band** (a phone in portrait: a long name and title with Dlvl, $ and T): the lines shrink together, as before, but only down to 80% of the text metric (the floor was 60% of the old size), and if that is not enough the rank title goes ("Rangeroni the Troglodyte" becomes "Rangeroni") and the lines are fitted again (`web.js` `renderStatus()`, `statusTitle()`). (a) first, then (b), as Lucas put it.
5. **The phone follows** (RolehackFront's `RhScreen`: the same always-on bar and the same small text), after this is on the preview channel and seen.

**What the taller band costs, by the rule** (`layout()`, the page's settings; the probe is in the layout session's notes):

| window | before | after |
|---|---|---|
| Lucas's phone, landscape 896x443 | map 456x282 (all 21 rows), 3 message rows (one spare), status 62 | map unchanged; 2 message rows, status 85 |
| his phone, portrait 443x939 | map 435x282, 4 rows, status 62, log 91 | map unchanged; the log loses 37 dp |
| tablets 1024x768, 1280x800, 1180x820 | whole level | unchanged (the header is side by side above the banks) |
| 1366x768 | whole level at 15 dp | whole level at 14 dp |
| 640x360 / 360x640 | map 280x239 / 352x182 | 280x202 / 352x146: about 3 rows fewer |
| 2752x1152, 2560x1080 | cells 33.5, 30 dp; void 8%, 10% | 32, 29 dp; 9.8%, 10.7% |
| an iPhone SE's Safari in portrait, 375x553 | twin banks, a 10-row map | twin banks with **two status lines** (below): three would leave a 7-row map, under the rule's 8x8 |
| **the desk** (merged the same day): Lucas's laptop, 1280x640 at density 1.5 | header 61 dp; cell 21 device px (14 dp), map 1120x294 | header 85 dp (the status stands beside the messages); cell 19 device px (12.67 dp), map 1013x266, the whole level |
| the desk in his Edge tab, 1272x588 | 12 dp, map 960x247 | 12 dp, map 960x223: 24 dp less of the level |
| the desk at 1366x768, 1920x1080, 1024x768 | | unchanged (the cell was never height-bound there) |

**The ranking's steps moved with the band** (the table of 2026-10-04): at 1000 wide the cell now steps at 624 tall (600 before), so the glass's band holds it to 648 up and 599 down; at 1366 wide the map moves above the banks at 717 (693), held to 744 and 692; 968 wide at 800 tall is unchanged. `viewer.test.mjs` holds the new numbers.

**Two hardenings the change exposed**, both in the rule or its helpers:
- **A guessed budget never turns a window the rule alone cannot lay out into twin banks** (`viewer.js` `worse()`): a first visit lays out as the window alone does (section 12, rule 1). It showed on the SE: alone unusable, the guess gave 44 dp keys.
- **A turn of the device keeps no glass, by construction**: the map's glass is remembered with its orientation (`classesOf()`), and `layout()` ignores a remembered glass from the other orientation (`glassOf()`, section 7). Until now that sentence held because no step lay within 24 dp of the fixtures' pairs.

**Fixtures.** The golden screens and the edge windows change for every screen (the status band's height and what follows it), so they were rewritten from the rule: `win/web/test/spec-cli.mjs` is new, the in-repo stand-in for the design's `layout-cli.mjs` (`win/web/test/README.md`); `edge-cli.mjs`'s `700x450 mouse` numbers moved (pad 33.89, gap 20.33: the desk's header grew too). The figures in `figures/` still show the 48 dp band. The checks: 157 tests, `sweep.mjs` and `drag.mjs` (results in the pull request).

**The lines give way before classic.** The sweep found 66 windows (of 73,470) that three lines at the text metric cost their twin banks, where the design promises that large text degrades and never costs the layout: small phones at 130 to 200% system text, the SE above, 360x640 with a grip lift, and near-square windows of 528 to 552 by 608 at 52 and 46 dp keys. So the status lines join the fit ladder as its last step: a window with no room for its lines drops one, then another (three, two, one: the page draws compact, then the HP line alone with the conditions beside it) before it falls back to classic, and `fit.statusLines` and `fit.reasons` say so ("two status lines: no room for 3"; "one status line: no room for more"). How many lines a touch window can hold is judged at the default key size, so that smaller keys never show less of the map than larger ones (the sweep's own rule). At the desk the count is part of the arrangement the band keeps (`info.desk.lines`, given back as `prevDesk`): a desk window 825 wide at 520 tall holds its stacked header only with two lines, and widened back past 826 it keeps the two-line stacked header for the band's 24 dp before the side-by-side header takes three again; without that, `desk.mjs` saw the header flip and flip back a dp apart. Hidden lines are nothing to drop. One corner stays classic: 360x640 with the screen font at Text size Larger and twice the system text (one status line alone is 104 dp there; the old 48 dp band at that size was 96), recorded as the sweep's one allowance in its text-size section. The sweep is back to 0 issues; `layout.test.mjs` holds the SE, a 360x640 at twice the system text, a window with room, the two settings that are not asked again, 480x600 at the three key sizes, and the desk. Built on the same day it was found, since the alternative was classic on windows that had twin banks the day before; Lucas can say otherwise.

### The messages screen, like Android's (Lucas, 2026-10-08)

### The desk on very wide screens, and within the safe insets (Lucas, 2026-10-08)


Lucas, after desktop mode was merged: "work on the 21:9 step and safe insets next. and we can plan on working on docked and hide-the-dock afterwards". Both are `layout.js` section 10, for the desk only (`checks/same.mjs`: every touch and pen layout identical).

- **The 21:9 ramp.**
  - **Before:** where 32 px tiles would leave strips wider than a panel (240 dp) beside the level, the desk's cap leapt to 48 px at one width. At 1440 tall the level went from 32 px to 38 px between 3055 and 3056 wide, and the log and the inventory left the strips beside the map for the dock row at the same pixel.
  - **Now:** the cap rises over the next 160 dp of width (`WIDE_RAMP`), as a tablet's does (`tabletCap`), so a window dragged wider grows the level a device pixel at a time. At 1440 tall: 32 px at 3056 wide, 35 at 3136, 37 at 3180, 40 at 3216, where the level fills the width. From there it is the cell the step gave (3440x1440: 42 px, as before). Text cells keep their cap, as before.
  - The golden fixtures' desk screens (16:9) and the sweep's ultrawide screens are past the ramp or short of it, so they are as they were.
  - **The cell drawn steps a device pixel at a time too.** A cell the band holds above the rule's own that stops fitting now gives way to the largest cell under it that still fits, not to the rule's own. A window dragged smaller meets every cell, as one dragged larger does. Inside the ramp the rule's own cell is held under the largest that fits by the cap, so falling to it skipped 2 to 4 device px at a pixel. The review of this change found it: a 3081-wide window made shorter went from 34 px to 32 at 1054 tall, where 33 fitted.
  - **The panels stay put while the cell is held.** Narrowing a window through the ramp, the band held the cell a pixel or two over the rule's own. At the held cell the strips beside the map fell just under a panel's 160 dp, so the log and the inventory left for the dock row and came back 11 dp on, when the cell stepped down. The review found it at 1088 to 1103 tall at dpr 1.25. The status lines' 24 dp taller header (#12) moved it onto the desk check's 1120 line, where the check caught it, on the two branches tried together before merging. Now a cell held above the rule's own gives way, to the largest that keeps them, where it would push out panels the last desk drew beside the map and the rule's own cell keeps there (`keep()`, with `besideAt()` from `deskPlan`). The panels are what the eye follows; the cell then changes where the rule's own already has.
- **The safe insets.** The desk ignored them, against §13's "the text bands always pad by the safe insets". Every part of the desk keeps at least 2 dp from the window's edges:
  - the glass round the bands and the map, 2 dp;
  - the header and the panels, 4;
  - the map's strips, 8;
  - the banks, 12, and their wells 6 less (2.8 at the narrowest usable, scaled-down dock).

  So an inset counts only beyond those 2 dp, as a cutout counts only beyond the margin that already clears it (§13). The desk is laid out in the window less what is left of the insets, and moved in by it.
  - With no inset past 2 dp it is the desk as it was, to the last digit.
  - With a notched iPhone's landscape insets (47/47/0/21), an iPad's with a keyboard (0/0/24/20), one side only, or all four at once, nothing of the desk reaches into them, the glass included.
  - The page already gave the desk its insets (`deskResult`, from `safeInsets()`); only the rule had to use them.
  - A first cut counted beyond 4 dp and left the glass, and a scaled-down dock's wells, up to 2 dp inside an inset (the review).
- **Checks.** `checks/desk.mjs` gains three issues and one variant:
  - **A step:** the cell changing by more than a device pixel between two windows of a drag with the same header arrangement, both the rule's own cell and the cell drawn.
  - **The insets:** anything of the desk within the safe insets, the glass included, checked in a run with insets on all four sides.
  - **A refinement of the band's "late" issue:** a panel or the legend is not late when it is still the rule's own pick at that window with the drawn cell held. In the ramp a wider window at the same cell has wider strips, so the panels beside the map still fit at the drawn cell, though they no longer did at that cell 24 dp behind. Without the refinement the check reported 18 such false issues, at dpr 2.4375.
  - **The band's issues compare drawn desks only.** An unusable desk shows the thumb banks and is never handed on as `prevDesk`. The inset run made a 483 dp desk unusable at 915 wide, and the check then read a header flip into it. The rule before this change does the same at 826x483 without insets; the check simply never walked that height.

  The rule before this change fails the check, and so do this change without its band and this change without the held cell's step down. `desk.test.mjs` holds the ramp's numbers, the drawn cell in a narrow-then-shorter drag, and the insets.
- **An adversarial review** (three reviewers, two skeptics a finding) found the drawn cell's 2–4 px drop, the 2 dp of glass in the insets, a test that could not fail (text cells at 1440 tall, where the height binds), and two untrue comments. All are fixed above.

### Desktop mode is built (Lucas, 2026-10-06 and 2026-10-07)

Lucas lifted the deferral of 3 October on 6 October ("I want it now"). It is for him, on a Windows touchscreen laptop with a mouse, a touchpad and a keyboard (Edge in a tab and installed), and for his uncle, who plays Firefox on a Mac and Safari on an iPhone. The decisions of record stand: twin banks stay the default with classic one setting away; a mouse or keyboard switches to the desk arrangement as §12 says; Ctrl+; is tested on each OS (test 7); nothing moves for a touch player. It is built on `room/desktop-mode` in three steps: (1) the input switch and the desk on the page, (2) the keyboard, (3) the rest of the rule. Steps 1 and 2 go into `web` together, so no player gets a desk without its key letters.

**Lucas's answers (2026-10-07) to the plan's questions:**
1. **His laptop** (its device report): the installed app is 1280x640, an Edge tab 1272x588, on a 1280x720 screen at density 1.5 with 10 touch points. Chromium reports `pointer: coarse` and no hover there although a mouse and a touchpad are in use, which is why §12 decides nothing from those queries. The device has no folded tablet posture, and its keyboard is always live. He plays with mouse clicks to travel and the keyboard's Esc.
2. **His uncle plays Firefox on a Mac.** Lucas keeps a list of things to ask him: `tester-requests-uncle-2026-10-07.md` in the workspace.
3. **The switch on a device that can touch** (§12 changes):
   - (a) typed keys alone only turn on the key letters; the mouse, the touchpad or the wheel is the automatic way to the desk. A device that cannot touch starts at the desk. ("Three game keys" ask for the desk only where no touch is possible.)
   - (b) a touch or a pen while the desk shows only brings the thumb banks back: it is consumed (no key, no travel, no panel), and the switch comes at its lift, never held back by the 3 s rule. (§12 had "the touch itself acts in the current layout".)
4. **A mouse window too short for the dock** gets the thumb banks, then classic (§12 sent an unusable desk to classic), with a 24 dp band at that edge so the board does not flip at a pixel. §14's bent rule 4 gains this case: the board moves between the dock and the corners when a mouse window's height crosses about 440 to 490 dp, past the band.
5. **Right-click.**
   - (a) On the map it looks at the square: the core's own second mouse button, `clicklook`, which uses no turn.
   - (b) On a key it does the key's hold where a hold opens something (a hub's layer, a macro's editor, the FLICK legend), and nothing on the pins, the equipment keys and SACRIFICE, whose holds empty the key or pray.
   - Built on `button === 2` with a mouse, never on `contextmenu`, which a long touch also fires. On a Mac, Ctrl+click is a right-click too.
6. **Drawer keys** (§9 changes): typing an item's own game key runs it and closes the drawer, keeping the muscle memory; only items with no game key of their own get numbers.
7. **The desk's keys keep their words**, with the keyboard key in the corner, whatever "Key labels" says. Rolehack's own keys are written `^;4`, NetHack's `^` for Ctrl as MSGS shows `^P`, not `⌃;4`.
8. **Typed keys while something opened by touch or the mouse is up:** with Fight armed, a typed direction fights; any other typed key closes the layer or drawer, or disarms, before it goes to the game; vi-keys pick a layer's places only when Ctrl+; opened it.
9. **"Docked" and "hide the dock" are postponed.** Lucas: keyboard-only players likely play NetHack's own terminal, which now runs natively on Windows, and it is "not a design space I want to intrude on unnecessarily". Until then the Controls setting has three values: automatic / thumb banks / mouse and keyboard.

**Decided in the plan, which Lucas let stand:**
- KEYS (the soft keyboard) has no Ctrl+; letter: a desk player has a real keyboard. `k` stays flick ↑, as §12's table has it (`layout.js`'s LEGEND gave it to KEYS too).
- The key after the prefix counts with Ctrl held or released, and is read as typed, so `f` (FLICK's tap) differs from `F` (COMBAT's layer). WORLD moves from `w` to `o` and the count layer from `n` to `x`: a browser tab cannot stop Ctrl+W (close the tab) or Ctrl+N (a new window). The prefix is a setting, Ctrl+; by default, matched by `code`, with AltGr excluded.
- The legends say what each key sends: REST `20.` (LEGEND's `20s` would search), SACRIFICE Alt+o (its hold, Pray, Alt+p), the pad centre `s` or `,`, a pin the key it holds.
- The near-miss guard is for thumbs. At the desk, with a mouse, there are no halos, seams, ghost deck or habit guards (the ring was already off for a mouse); the 200 ms after a window closes and the armed-Fight rule stay.
- The desk keeps its own wheel zoom for the page's visit: it opens on the whole level and never changes the thumb banks' `zoomFactor`.
- The remembered budget is the thumb banks' alone: a desk window neither uses nor teaches it (`deskLayout` never read it).
- Keyboard fixes in step 2: on a Mac the Cmd shortcuts are the browser's (Cmd+R reached the game as `r`, read) and Option+letter types the M- command; AltGr characters are characters, not M- commands.
- The rule's shortfalls at the desk are fixed in `layout.js`, for the desk only (every touch and pen layout stays identical, and a check holds it so): the cell in whole device pixels (a `dpr` input, 1 by default); a panning map never wider than the level; a 24 dp band for the desk's arrangement; later, the 21:9 ramp and the safe insets.

**As built (2026-10-07, `room/desktop-mode`).**
- `win/web/input.js` (new, node-tested): the switch, and the keys (the Mac's Cmd and Option, AltGr, the prefix and its table). `overlay.js` feeds it from the window's capture phase and lays out the desk; `web.js` routes the keyboard through the prefix and the "typed key meets what is open" rule, and right-click on the map looks (`mod: 2`).
- `layout.js`, desk only: `dpr` (the cell in whole device pixels: Lucas's 1280x640 at density 1.5 gets 21 device px, 14 dp, the whole level; his 1272x588 tab pans at 18 device px, 12 dp, its map 960 dp, the level's width, where it was 1256); `prevDesk` / `info.desk` (the band: each part of the arrangement changes 24 dp after the rule's own step on the way up, where it stops fitting on the way down, and every cell size is shown on a drag); LEGEND as decided. `checks/desk.mjs` drags desk windows and fails a rule without the band, without whole device pixels or with a map wider than the level; `checks/same.mjs` holds every non-mouse layout identical to the rule before (117,903 layouts).
- Three independent reviews of the page's steps, and two of the rule, found real bugs, all fixed before this record: Firefox on a Mac reports AltGraph while Option is held (Option+o gave a stray character); a drawer's hidden numbers ran items; the wheel that asked for the desk changed the thumb banks' zoom; a consumed touch's click filter dropped other taps; arrows did not pick a keyboard layer's places; the band ran up to 184 dp wide; the desk check could not fail.
- Classic is unchanged: the right-click rules and the context-menu guard are twin banks' only. Ctrl with anything but a letter (Ctrl+- and Ctrl+=, the page's zoom) is the browser's again in both layouts: it reached the game as - and =.

**Open, for Lucas's eye on a real screen:**
- On short, wide windows (about 440 to 590 dp tall, from 1320 wide) the log and the inventory now stand tall and narrow beside the 960 dp map (187 dp at 1366x585) instead of in the dock row beside a map wider than the level.
- A window dragged taller shows every cell size, one change per 21/dpr dp: more changes than before, none undone when the drag turns back.
- With Android's text cells at about 1040 wide, the key legend has room in the dock row at one cell only; the band hides it in a drag, a first layout there shows it (a rule quirk, left as it is).
- Not testable here: whether Firefox on a touchscreen that gives its touches only as mouse events (a Surface, by Mozilla's own notes) would be taken for a mouse (Settings, Controls, Thumb banks is the way out); whether a Mac's Option+e, an accent key, makes the next letter arrive accented (on the uncle's list).

**Lucas's first test on his laptop (2026-10-08), in an Edge tab.**
- **Passed:**
  - the touchpad's scroll brings the desk;
  - a touch brings the thumb banks back and does nothing else;
  - typed keys only light the key letters (`:` three times; "the board didnt change");
  - the prefix table ("all worked as described");
  - right-click looks ("it was cool to right click all over the map safely").
- **Two bugs, fixed:**
  - The click that switched to the desk landed on the new layout. The desk was drawn on its press, before the button came up, so the click travelled to, or looked at, another square.
  - The key letters printed over REST ×20's and SACRIFICE's words.
- **His decisions:**
  1. **The banks stand at the dock row's outer edges, with the log and the inventory between them, always.** "On my touch screen it would be better if the banks were on the outside edge of their row"; "messages and inventory between them, yes. Im leaning towards the mouse and keyboard view being edges always". §4's dock and panels below say how. **The golden fixtures' 22 desk screens were rewritten for it, at his word** ("yes, update the 22 desk screens"): three per variant, and `edge.json`'s 700x450 mouse. `layout-cli.mjs`, which wrote them, is not in the repo, so they came from `win/web/layout.js`. Every touch screen and every other field of the files is byte for byte as it was. In the desk screens only the banks' x, the popups, the panels, the wells and the source line moved, and the keys' descriptions now carry the legend decided on 7 October (`^;o`, `M-o`, `20.`, `s`, KEYS none), which the fixture test does not compare.
  2. **A board that changes by itself names itself.** It shows for 3 s at the top of the map, on automatic switches only, and takes no click. The words come first, as the Controls setting names them ("front-loading": "No smoking", not "Smoking not allowed"); this is his pick of the short form: "**Mouse and keyboard** · Settings › Controls" and "**Thumb banks** · Settings › Controls". A switch the window cannot draw (too short for the desk) says nothing.
  3. **A click that switches to the desk still does what it does.** "Travel by clicking is one of the desktop's best features."
  4. **The status lines go to the layout session** (`status-lines-brief-2026-10-08.md` in the workspace): the name-and-title bar follows vanilla's `hitpointbar`, shipping off as vanilla does ("ship as vanilla does"); the HP and Pw bars go ("the raw numbers are more valuable than seeing a bar"); and the lines grow as the message band did.

### The save era (Lucas, 2026-10-06; the release plan's B2, first piece, for D26 and D4)

Before `main()` runs, the core says its save signature (`win/shim/winshim.c` `web_save_signature()`: what `check_version()` compares in a save, the version number with EDITLEVEL, the feature bits and the entity count, plus the struct-size bytes `store_critical_bytes()` writes), and the page mounts the saves from the store named for it (`web.js` `mountSaves()`, `channel.js` `saveDbFor()`): the first era keeps `/save` (and `/save-preview`), a later one gets `/save-<tag>`. So a build whose format differs never opens, recovers or re-stamps an older game: `recover_savefile()` checks no version, and `store_version()` would stamp the rebuilt save with the running build's. The era that last wrote a channel's saves is kept in the settings (`saveEra`); a build of another era that finds games it cannot read says so once and keeps them aside (D4: an update never deletes a game; the earlier version to be published at its own address). `src/version.c` gains `get_critical_size_byte()`; the page runs `main()` itself (`noInitialRun`, `callMain`) after the mount. The device report carries the era's tag after the build (`core <tag>`).

### The preview channel (Lucas, 2026-10-06; the release plan's D34)

The same site under `/preview/`, where a build is tried on a phone before it goes live. One origin, so everything a page keeps is named by its channel (`win/web/channel.js`, read from the page's own path): the saves' IndexedDB database (`/save-preview`, the IDBFS mount that names it, with `/save` a link to it so the core's playground is unchanged), the settings prefix (`rhp.`), the one-page lock, and the service worker's cache prefix (`rhpreview-`). A preview build can never touch the live page's games or settings, and the two can be open side by side. `build.sh` writes `targets/web-preview/` beside `targets/web/` (the manifest's name and the title say "preview"); `win/web/deploy.sh` publishes either channel to its own place on `gh-pages` without touching the other. The device report now starts with the channel and the page's address. `doc/RELEASING.md` has the steps.

### The drawers scroll from a key (Lucas, 2026-10-06)

Lucas: on Android a drawer scrolls even when the finger lands on an item, as its scroll view takes a drag past the touch slop; on the web a drag had to start in the gaps. The cause: a key is `touch-action: none`, and the browser decides panning by the elements between the touched one and its scroll container (Pointer Events 3, section 8.2), so a touch that began on a key could never pan the grid, while a touch in a gap saw the grid's own `pan-y`. `overlay.js` `bindDrawerScroll()`: the drawer grid listens in the capture phase, before the key's handlers; a drag past 8 dp (Android's touch slop) cancels the key's press and hold timer (`key.cancelGesture`) and scrolls the grid itself, by each move's delta in the layer's own px (classic scales the layer), from rest under the finger (the slop comes off the first delta); a fling on release is read over the last 100 ms of moves, none after a 40 ms pause, at most 8 px/ms, friction 0.94 per 16 ms, and it stops at an edge, on the wheel, or when the drawer closes. A touch that lands on a moving list only stops it. A finger that leaves the key sideways by more than the slop drops the tap and the pin. The lift is heard at the window, so a key removed under the finger (a hold that pinned it) cannot leave the drag armed, and opening or closing the drawer resets it. A drawer key's press waits 100 ms (`bindHold` `pressDelay`, a View's tap timeout in a scroll view), so a scroll never flashes or clicks the key, and a cancelled gesture gives no release feedback. The grid's `touch-action` is `none`, so script and browser never both scroll it; the mouse wheel scrolls it as before, and a mouse drag on the scrollbar is left to the browser. Both layouts, since the drawer is one piece of code (§9). Reviewed by three independent passes before the merge (pointer-event semantics, regressions, feel against Android's ScrollView and VelocityTracker).

### The device report (Lucas, 2026-10-06)

Lucas's fourth goal was to know the screens the page meets ("we want to make sure that we know the screen size of the users on the web version"), and the page sends nothing anywhere: no server, no telemetry (`AUDIT.md`, §12). So Settings now ends with a **device report**, one line a player copies or shares and sends to Lucas, built by `deviceReport()` in `viewer.js` from the facts `overlay.js` gathers when Settings opens (`deviceFacts()`): the build; the window (CSS px, orientation), the screen, the pixel ratio, the browser and system named coarsely (Client Hints, else the user agent, for the reader only: the layout still never reads it), the display mode, the touch points, the `pointer` and `any-pointer` features, `hover`, the text size, the safe insets; then the layout shown (and, for a window shown as classic, the first reason why), the tier, the key size set and drawn, the right columns where they narrowed, the map cell, the cells shown and whether the level is whole, the glass and whether the header stands over the banks, the budget used (seen, guessed or none) and its figures, the fit and its first reason, the map cell setting, the zoom factor, the style and the case. A window shown as classic reports classic's key size, tile and scale instead. A fact the page could not get reads as `?`; the fields keep one order, so two lines compare field by field; `win/web/test/report.test.mjs` holds the format. The button is "Share report" where the browser has a share sheet (`navigator.canShare`), else "Copy report"; it keeps Settings open and answers in the form's hint line; where neither works, it selects the line for a manual copy. Nothing is sent by the page itself, and nothing is stored.

### Lucas's decisions of 4 October 2026, and the glass's band

**3440x1440 stays as it is** (Lucas, 2026-10-04): the level spans the window at 42.5 dp, with the log and the inventory between the banks under it. Few ultrawide monitors are used like a tablet, so the aspect ratio matters little.

**The glass has a band** (Lucas, 2026-10-04), as the tiers have (`layout.js` section 7, `GLASS_BAND`, 24 dp). The ranking has steps a window can sit on, and dragging across one swapped the cell or moved the map at every pixel either side. The page now keeps the glass it last drew (the map's, and the one the device cell was decided in; `viewer.js` keeps them with the tiers) while the ranking still picks it somewhere within 24 dp of the window. Turning the device keeps nothing, since no window 24 dp away picked the old glass. In a window dragged a pixel at a time:

| step | before | with the band |
|---|---|---|
| 1000 wide, 600 tall: a 16.47 dp cell, or 12 dp and the level's full width | at 600 up, 599 down | at 624 up, 575 down |
| 1280 wide, 636 tall: 20 dp or 12 | at 636 up, 635 down | at 666 up, 606 down |
| 800 tall, 968 wide: the level panning at 16.8 dp, or whole at 12 | at 968 up, 967 down | at 992 up, 967 down |
| 1366 wide: the map between the banks, or above them | at 693 up, 692 down | at 721 up, 668 down |

Some notes on how the band behaves:
- **It picks among the window's own glasses.** Every glass is clear of the keys, so no key moves for it, and the band costs a little of the level at most.
- **It never keeps the whole level under the cell's floor.** So that side of the 968 step has no band.
- **It never costs a window its twin banks.** A kept glass too narrow for the drawer yields to the ranking (600x620).
- **It can keep twin banks the ranking would lose.** Where the ranking's own pick is unusable but the kept glass is not, the page keeps the kept glass (3 windows near 600x600 with 46 or 52 dp keys).

The checks:
- `layout()` without what the page keeps is the ranking as before: the gate passes unchanged (73,470 layouts, 0 issues).
- `checks/drag.mjs` drags windows of 480–2000 by 320–1000 dp four dp at a time, in five variants (134,985 layouts). The band keeps another glass at 11,748 of them, with 0 issues under the design's checks and no key moved.

The steps themselves remain: the cell still drops from 16.47 to 12 dp where the whole level's width first wins, 24 dp later than before.


### The tablet stage on the web (3 October 2026)

**Desktop mode is deferred (Lucas, 2026-10-03).** The page lays out every window as for touch, whatever the pointer: a mouse or keyboard player gets the phone or tablet tier that the window's size gives, with phone-size banks in the bottom corners. The desk (§4's last class, section 10 of `layout.js`, the dock, the legends, the Ctrl+; prefix and the input-mode machine of §12) is kept in the rule and its checks, unused by the page, for when desktop mode is built. The size classes and their ±24 dp bands (§4, §12) are built (`viewer.js`), and so are the message log and inventory panels (§4, §11): the inventory is the core's permanent inventory (`perm_invent`, mode `full`, gold included), turned on only for a game started in twin banks.

**What changed in the rule.** A monitor's window is a tablet now, and the tablet's 24 dp cap left it mostly black: the level at 24 dp in a 2560x1440 window left 52% of it void, 3440x1440 62%. So:
1. **The monitor's cap.** Where a 24 dp level would leave strips beside it wider than a panel (240 dp), the cap rises: over the next 160 dp of glass width it moves to the cell that fills the width, which it then follows up to 48 dp (the desk's widest). It is continuous in the width. A first cut switched to 48 dp at once, and a window dragged across 2408 dp wide went from 24 to 30 dp and moved the log at every pixel either side (the reviews, 2026-10-03). No tablet reaches 24 dp, so tablets are unchanged.
2. **A monitor turned to portrait** shares the device cell no further than a level as wide as its own glass, and never under 24 dp: 1440x2560 keeps 24 dp and 60 columns (its landscape cell, 31.5 dp, showed 45). This is the one place where the two orientations may differ in cell, and only past 24 dp, which no phone or tablet reaches.
3. **A tie between glasses** that both show the whole level at the same cell goes to the glass above the banks, which leaves the tray and the glass under the level to the panels (5120x2160: 14% void instead of 52%).
4. **Panels beside the level** in the column between the banks when the level is narrower than it by a panel (160 dp) and a 12 dp gap a side: 32:9 (5120x1440), as the desk flanks its map.

| window (tablet tier, any pointer) | cell | glass | panels | void |
|---|---|---|---|---|
| 1280x800 | 15.5 | above, header side by side, 3 rows | log and inventory in the tray, 416 dp each | 10.8% |
| 1920x1080 | 23.5 | above, 2 rows | log under the map (136 dp), inventory in the tray | 6.9% |
| 2560x1440 | 31.5 | above, 2 rows | log under the map (328 dp), inventory in the tray | 4.8% |
| 3440x1440 | 42.5 | above, 4 rows | log and inventory in the tray, 1496 dp each | 7.7% |
| 5120x1440 | 48 | between | log and inventory beside the level, 408 dp each | 24.3% |
| 1440x2560 | 24 | above, 3 rows | log under the map, inventory in the tray | 3.3% |

**Decided since** (Lucas, 2026-10-04; see the first entry above): 3440x1440 stays as it is, with the log and the inventory under the level; the glass ranking's steps (1000x598 → 600 tall: 16.5 dp to 12; 1280x634 → 636 and 1366x654 → 656: 20 to 12; 966 → 968 wide at 768 to 900 tall: part of the level to the whole level at 12 dp) get a band of their own, as the tiers have.

### Round 2: the second verifiers (2 October 2026)

Two more verifiers checked round 1, one the rule and one the behaviour and the spec. Every blocker and major issue held up when re-checked and is fixed, and so are the minor ones. Lucas's decisions of 2 October stand: Long rest swiped up, an empty pin's tap opens its picker, the free drag that locks only at rest, Pray on the 380 ms SACRIFICE hold, and "Layout: twin banks / classic" defaulting to twin. Nothing moved on Lucas's phone: 0 thumb switches, 0 moves, 36 of 36 both ways, every control where the final put it.

**What changed in the rule (round 2)**
1. **The glass ranking.** "All 21 rows" now means within half a cell of them, and it outranks more cells only while it shows at least 70% of the rival's cells. 960x600 keeps its 34×21 column (714 cells against the strip's 993, 0.72). The Pixel Fold inner screen (841x701) gets 68.8×21 at full width instead of a 33×21 column, and the iPad mini split half (561x744) 46×20.6 instead of 10×21.
2. **Smaller keys never show less, by construction.** When the ranking's own pick at 46 or 52 dp keys would show fewer cells or less map than the next larger key size, the larger size's glass (its kind and its message rows) is laid out at the smaller keys instead. Smaller keys also never make the bank stand taller (the bottom offset, then the pad gap, hand back the excess), and never push the header over the banks lower. 0 of 1,061,627 non-degraded windows (280–2400 dp, step 2, default settings) show less at a smaller key size; neither do the five variants over 1,591,328 layouts (the verifier's `dense.mjs`).
3. **An unusable result.** `layout()` now says whether the page may draw what it returns. It returns `usable: false` with `fit.level: 'unusable'` whenever:
   - a key would sit off screen, on another key or on the map;
   - a band or panel would cover a key;
   - the map would show under 8×8 cells;
   - there is no room for the 200×88 dp drawer, where MENU, WORLD and GAME open.

   The page then shows classic for that window (§12). Near-square windows land there: Lucas's phone in split screen (443x460), and squares under about 650 dp. Every real phone, foldable, split view and tablet in the verifiers' lists stays usable. A degraded but usable spec is drawn as given (§12). `collisions()` is exported for the page and the checks.
4. **The budget guard checks both axes** in either orientation: a window narrower than `budget.w` or shorter than `budget.h` lays out without the budget. A 400x363 window under a 443-wide budget once stacked the banks on each other.
5. **The reasons tell the truth.** The text is blamed for lost message rows only when it is larger than the defaults; otherwise the reason says the window is too small. A glass under 120 dp now sets `fit.level: 'degraded'` (it said 'full').
6. **`anchor: 'safe'` with grip lift.** The bottom inset's share and the lift are clamped together against the window, so no key leaves the screen. iPhone 12 mini landscape with 40 dp of lift: REST was at y −7, now 4.
7. **The web's x-height.** The default is the web's own 9.5 CSS px (Lucas, 2026-09-28, `overlay.js` `MSG_X`); `textMetrics({xHeight})` takes Android's 10. A default row is 25.86 dp, the page's own figure.
8. **A map that does not show the whole level is never wider than its 80 columns.** The map area stops where the level does.
9. **The hit model: the action pad's seams swallow.** The seam between two action-pad keycaps (the drawn gap, widened to at least 8 dp) swallows, with a tick, instead of tiling across. On Lucas's phone and on the 390- and 412-dp classes, COMBAT→CONTEXT is back to today's rate. At 360 dp it is 2.6% against today's 1.7%: the stated price of 58 dp pad keys plus a 24 dp gap at that width (§6).

**What changed in behaviour and the spec (round 2)**
- **Fight armed.** Armed Fight counts as "a tap would travel", so the guards stay on. Any map tap while Fight is armed disarms it and is consumed; it never travels (§6).
- **Layers and direction prompts.** With a layer open, a map tap only closes the layer and is consumed, as today's scrim does. In a direction prompt (Fire, a pin or a place that asks a direction) the core drops clicks, so a map tap answers nothing. The guards now step aside only at --More--, in getpos, and in menus and text windows (§6).
- **The stairs from CONTEXT take a second tap.** This holds whether CONTEXT's one action is Ascend or Descend or its sticky HERE is up, so a near miss of COMBAT can never change level (§8).
- **Dimmed HERE places.** A dimmed place swallows the tap (§8).
- **The ghost deck.** A catch is now a preview the player did not confirm, and a session is defined, so the deck retires for a player who travels by tapping (§6). During the switch it also covers two old habits: the pad-centre radial's lift-and-tap and the pray hold on the old SACRIFICE spot (§15).
- **Classic stays unchanged.**
  - Twin gets its own zoom key, `zoomFactor`, which starts at 1×; classic's `zoom` (CSS px) is untouched.
  - `viewport-fit=cover` is set only for twin.
  - The `paranoid_confirmation` line is appended by `start()` only for twin (§16).
- **The desk prefix is Ctrl+;**, because Ctrl+Space and the chords tried after it switch input sources on macOS and ChromeOS (§12).
- **Four contradictions fixed.**
  - The gap arithmetic (§6, item 4).
  - The 120 ms rule now applies to ring taps only, in §6 and in the P8 row.
  - The 34-column claim is qualified: "where the 12 dp floor allows".
  - Dimmed places now say what a tap on them does.

**Harness (round 2):** `v2: 0 thumb switches / 0 moves>10mm / 36 of 36 | map 32.4% / 29.5% | smallest pad key 58.0 dp | void 4.4%`, the same headline. On Lucas's phone the landscape void falls from 11.4% to 10.2% (today 10.7%), because each message row is 1.36 dp shorter. The phones' maps grow by 0.3–0.5 points (§2).

**The gate (round 2):** `checks/sweep.mjs` runs 73,470 layouts in ten sections with 0 issues. That includes 2,715 unusable results, all in sections 7 and 10, where they are allowed. On round-1 v2 (`../v2-round1/layout.js`) the gate reports 5,451 issues in six sections; on the final, 11,488 in all ten.

Rule verifier (`verify2/`):

| # | issue | outcome |
|---|---|---|
| R1 | major: ranking "all 21 rows" strictly first picks a column about 120 dp wide over a full-width map; smaller keys can then show less | **Fixed** (rule items 1, 2). Map share at 58 / 52 / 46 dp keys, with the round-1 figures:<br>• 561x744: 32.8 / 33.4 / 33.4% (58 dp was 7.3%)<br>• 540x720: 30.6 / 33.0 / 34.5% (52 dp was 8.8%)<br>• 841x701: 35.9% at every size (58 dp was 17.1%)<br>• 829x690: 34.9 / 36.2 / 36.2% (58 dp was 17.1%)<br>The verifier's `mono.mjs` finds 0 of 1,061,627 non-degraded windows (step 2) where the map shrinks; it found 238 of 66,789 at step 8. `cells.mjs` finds 0 of 38,675 windows under 70% of the final's cells and area (was 519 of 39,055). Sweep §2 adds dense grids, 480–1000 × 600–960 dp and 1000–2000 × 320–480 in every variant (21,795 windows), and §1 adds 540x720, 561x744, 690x829 and 701x841. The verifier's own `dense.mjs` (1,591,328 variant layouts) now finds no usable window where the map shrinks; its remaining flags are all on unusable results, which the page never draws. |
| R2 | major: near-square windows return a spec with no map and the status over REST; nothing says to fall back to classic; the budget guard checks one axis | **Fixed** (rule items 3–5, §12). 443x460, 460x443, 412x450 and 400x363 (with its budget) come back unusable, and the page shows classic. Sweep §7 adds every window from 320 to 520 dp (step 8) at all three key sizes, plus eleven budget edge cases: each must be usable and clean, or unusable. §10 checks every usable result with `lib.mjs` `drawable()`, independently of `layout.js`. |
| R3 | minor: `anchor: 'safe'` with grip lift pushes the top row off screen | **Fixed** (rule item 6). Sweep §6 adds lift 0–80 dp × `safe` × bottom insets on iPhone 12 mini, 14, 15 Pro Max and 640x360. |
| R4 | minor: `layout.js` sizes rows at a 10 dp x-height; the web uses 9.5 | **Fixed** (rule item 7); §10 and §17 Q12 corrected. |

Behaviour verifier (`../../verify-v2-work/`):

| # | issue | outcome |
|---|---|---|
| B1 | major: the guards switch off while a key is armed, and on the web a map tap then travels | **Fixed** (§6, §16).<br>• Armed Fight keeps every guard on, and a map tap disarms it without travelling.<br>• With a layer open, a map tap closes the layer and is consumed.<br>• In a direction prompt, a map tap answers nothing: `web.js` `nextKey()` drops clicks, and the map gives no direction.<br>• Pass-through is narrowed to --More--, getpos and menus or text windows.<br>• In caseless mode the halo stays an invisible hit layer over the canvas. |
| B2 | major: within-bank misfires on the action pad double, triple at 360 dp; COMBAT→CONTEXT brings back P4's Descend | **Fixed** (rule item 9, §6, §8, §14 bent 6). The seams swallow, and the stairs from CONTEXT take a second tap. COMBAT→CONTEXT (today / round 1 / now):<br>• Lucas's phone: 0.52 / 1.11 / 0.52%<br>• 412: 0.82 / 1.68 / 0.79%<br>• 390: 1.12 / 2.33 / 1.08%<br>• 360: 1.69 / 4.82 / 2.57%<br>Aimed at CONTEXT, another action key fires at 360 dp: today 6.85%, round 1 13.16%, now 6.68%. At every size a tap aimed at COMBAT hits it more often than today. In-bank rates are in §6 and `checks/nearmiss.mjs`. |
| B3 | major: three §16 changes also hit classic, and the zoom change breaks it | **Fixed** (§11, §12, §16).<br>• `zoomFactor` is twin's own key; it starts at 1×, deliberately not seeded from `zoom`, so test 5 sees the default cell.<br>• Classic's `zoom` is never rewritten.<br>• `viewport-fit=cover` is written into the viewport meta only for twin.<br>• The `paranoid_confirmation` line is appended by `start()` only for twin, so `defaults.nh` stays as it is. |
| B4 | minor: the ghost deck may never retire; "session" is undefined | **Fixed** (§6, item 8).<br>• A catch is a preview not confirmed by a second tap on the same cell.<br>• A session starts at a page load or a new game and ends after 30 minutes without input. It counts only once 100 turns have been played in it. |
| B5 | minor: two old habits now fire keys or travel | **Fixed** (§15; §6, item 8). Both habits are listed, and while the ghost deck is active it guards them:<br>• A pad-centre hold that lifts without a slide flashes "HERE: slide". For 1.5 s, a tap on any of the old radial's five node spots is swallowed with that flash.<br>• A hold of 380 ms or more on the old SACRIFICE spot flashes an arrow to SACRIFICE, and the next pad tap within 1.5 s is swallowed. |
| B6 | minor: E23's replacement chords are themselves input-source shortcuts | **Fixed** (§12). The prefix is now **Ctrl+;**, the key right of L by `KeyboardEvent.code` whatever the layout prints on it, and it stays configurable. It is on none of the published ChromeOS, macOS or Windows shortcut lists we found. Test 7 checks it on each OS before shipping. |
| B7 | minor: four places where DESIGN.md contradicts itself | **Fixed:**<br>• §6 item 4 now says 16 dp past the key's edge, 4 dp past its halo.<br>• The 120 ms rule covers ring taps only, in §6 item 7 and the P8 row alike.<br>• The 34-column claim reads "where the 12 dp floor allows" (§1, §11).<br>• A dimmed HERE place swallows the tap (§8). |

---

### Lucas's decisions (2026-10-02)

| decision | where it lands |
|---|---|
| Long rest is swiped **up** out of REST (the design's choice stands). | §8, §13, §14 |
| An **empty** pin key's tap opens its picker (the design's choice stands). | §5, §8 |
| The map may be dragged along an axis where the level fits (his 2026-09-27 rule, `web.js` `placeView`); it locks and centres only at rest. | §11 |
| Pray stays on his **380 ms** hold of SACRIFICE, not 800 ms. | §5, §8, §14 |
| A setting **"Layout: twin banks / classic"** (prefs key `layout: twin\|classic`), default twin. Classic keeps working unchanged. | §12, §16 |

### What changed in the rule (round 1)

1. **A pure module.** `layout.js` (the rule) and `layout-cli.mjs` (the node side: specs, variants, tables). `layout()` is total: below the space for the chosen pad size the pad steps 58 → 52 → 46 dp (Lucas's floor), then the right bank's columns narrow to 40 dp (degraded), then everything gives (degraded). Every result carries `usable` and `fit: {level, pad, padSetting, rightColumns, degraded, reasons}`; since round 2 a window with no room for twin banks and a map is `usable: false` and the page shows classic.
2. **The header sits in the glass by default.** On phones the text header now stacks at the top of the map's glass between the banks, so no band ever comes near a key. It moves over the banks only when that shows more of the level (or with `mapCell: 'rows'`), only side by side, decided on the width left after side insets and a cutout, spanning the screen from 4 dp in (independent of the margins), and always 12 dp clear of every key.
3. **The default map cell shows today's columns.** On phones the device cell is the one that shows at least 34 of the level's 80 columns in landscape (today's count on Lucas's phone) where the 12 dp floor allows (a landscape map at least 408 dp wide), with all 21 rows where they fit, never under 12 dp: 13.4 dp on Lucas's phone, 34×21 cells in landscape and 32×21 in portrait. Spare height becomes message rows (up to 4), the HP/Pw bars and, after that, a message log. The earlier "fill 21 landscape rows" cell is the setting `mapCell: 'rows'` (17.8 dp, 25.6×21). The cell is decided at 58 dp keys, so smaller keys only ever add columns.
4. **At least 24 dp between the banks in portrait**, paid first by the right bank's columns (never under 44 dp). The two 12 dp halos never meet, so every point of a bank and its halo resolves the same in both orientations.
5. **Cutouts, insets, grip lift and text size are inputs, and none can put a key off screen or a band over a key.** A cutout or inset counts only beyond the margin that already clears it, never in the bottom offset. Grip lift is part of the fit and clamped. The message row height (face, Message size, the system's text size) is an input.
6. **The guards act only when a tap would travel** (§6). The ghost deck previews instead of swallowing, and retires after three sessions with no unconfirmed preview (round 2 defines a catch and a session). Map taps are swallowed 200 ms after any drawer, modal or menu closes.
7. **Layers.** The pad-centre hold opens the HERE layer slide-only; count layers close on lift unless held 600 ms or more; a hold on Long rest opens its counts; since round 2 the stairs from CONTEXT take a second tap (§8).
8. **Big screens.** The 960x600 class shows all 21 rows; text cells and 21:9 desks keep the void under today's (§11).

**Harness:** `v2: 0 thumb switches / 0 moves>10mm / 36 of 36 | map 32.4% / 29.5% | smallest pad key 58.0 dp | void 4.4%` (the earlier final: map 42.5% / 38.6%; today: 20.7% / 35.1%). The map share fell because the default cell is smaller: the map now shows 34×21 cells in landscape and 32×21 in portrait where the earlier final showed 26×21 and 25×21 (today 34×17 and 24×21). §2 explains the two measures.

### The verifiers' issues, one by one (round 1)

The figures in these rows are the current ones (after round 2).

Metrics and rules (`../final/verify-metrics-rules.md`):

| # | issue | outcome |
|---|---|---|
| M1 | blocker: side insets stack the over-the-banks header onto 6–12 keys | **Fixed.** Over-the-banks is decided on the width after side insets and a cutout; the header spans 4 dp from the safe edges whatever the margins; it is dropped when it would stack or come within 12 dp of a key, and phones keep it in the glass by default. Sweep §4 (iPhone 14/15/15 Pro Max, 47/59/62 dp, three anchors, one- and two-sided): 0 issues. |
| M2 | `avoidCutout` throws at 360/390 dp and raises the bottom offset | **Fixed.** The margin becomes max(margin, depth): only the depth beyond the margin is added; the bottom offset uses the margin without the cutout; a cutout too deep for the pad steps it down (360 dp with a 24 dp cutout: 46 dp keys) instead of throwing. Sweep §5 (8/24/30 dp at 360/390/412, every variant): 0 issues. |
| M3 | smaller keys give less map on 390/393 phones | **Fixed.** The header's width no longer depends on the margins, and the map cell is decided at 58 dp keys, so freed width becomes columns. Round 2 makes it hold by construction (CHANGES, round 2, item 2). Sweep §2: cells and map share never fall as keys shrink (260 screen/variant cases and dense grids of 21,795 windows). 844x390: 38.9 / 37.1 / 37.1% at 46 / 52 / 58 dp. |
| M4 | grip lift ignored by the fit | **Fixed.** Lift is part of the bottom offset in the height check and the header-over room, clamped to what the height allows (71 dp on Lucas's phone). Sweep §6 (0/20/40/80 on phones and tablets): 0 issues. |
| M5 | portrait near misses land on the other thumb's bank; hit cells differ between orientations | **Fixed.** At least 24 dp between the banks (44.7 dp right columns at 360, 53.3 at 390, 55.3 at 412). The hit model now resolves identically in both orientations over every bank and its halo, on every pair the sweep runs (was up to 6,073 dp² at 360x640). Cross-bank misfires (§6): 0.10% from the pad and 0.40% into it at 360 (were 0.62% and 1.45%). |
| M6 | the halo overlaps the tappable bands | **Fixed.** No band or panel comes within 12 dp of a key (part of the fit; checked by the sweep on every screen); inside 12 dp of a keycap the halo wins. |
| M7 | 960x600 shows a 12.5-row strip; §11 misstated the rule | **Fixed.** Glass candidates rank the whole level, then all 21 rows (since round 2: within half a row, and only while they show 70% of the rival's cells), then cells. 960x600 now shows 34×21 at 15.3 dp between the banks with the log and inventory over the banks; 600x960 shows 39×21. §11 states the rule as coded. |
| M8 | void on ultrawide; text cells worse than today at 1440p | **Fixed.** The desk cap is on the cell's width (text cells may stand 57 dp tall); on 21:9 and wider, tiles may grow to 48 px; the log and inventory flank the map when the strips beside it are 160 dp or more. Void: 3440x1440 3.2% (text cells 7.7%), 2560x1440 text cells 8.2% (was 22.4%); every mouse screen tested is under today's 21.8%. |
| M9 | the edge-gesture distances hold only on Lucas's phone | **Fixed in the text** (§7, §13): sideways drags start at least 55 dp from a side edge (78 dp to the key's centre) on every phone and key size; 84 dp (113) on Lucas's phone. |
| M10 | Long rest's count layer has no trigger | **Fixed.** Once Long rest is swiped in, a hold on it opens its counts, ×100 to ×400 (§8). |
| M11 | the CI gate cannot see issues 1–5 | **Fixed.** `checks/sweep.mjs` now runs 73,470 layouts in ten sections (§2; 5,862 in round 1) and checks parity both ways with the 3 dp margin, bearings, order, hit-model parity, insets, cutouts, lift, text sizes, bands near keys and the map against key size. Run on the earlier rule (`RH_LAYOUT=../final/layout.mjs`) it reports 11,488 issues, in every section, and 5,451 on round-1 v2. |

Engineering (`../final/verify-engineering.md`):

| # | issue | outcome |
|---|---|---|
| E1 | `layout()` throws under about 344 dp | **Fixed.** Total: the pad steps, then the right columns narrow, then a degraded best fit with its reason (640x336 and 600x330: 46 dp keys; 700x320: right columns 41 dp, degraded; 1024x300: 14 dp between the banks, degraded); a window with no room for twin banks and a map is unusable and the page shows classic (round 2). Sweep §7 and §10 (3,000 seeded random windows and settings, nonsense included). |
| E2 | S and L differ between orientations on real windows | **Rule side done:** `layout()` takes the remembered budget `{w, h, l}` and the remembered landscape side insets; uneven pairs (915x388/412x891, 830x390/390x860 and five more) keep parity with it (sweep §3). The web keys the budget by display mode (§12). Feeding it from `onSizeChanged`: **Android, later**. |
| E3 | no display-cutout mode; landscape parity unmeasured | **Android, later** (SHORT_EDGES, then measure Lucas's view at 0°, 90° and 270°). The rule's `avoidCutout` is fixed (M2). |
| E4 | `NHW_Map` centres on both axes and never clamps | Web: `placeView` already clamps; per Lucas (2026-09-27) a drag stays free along an axis that fits, and the view locks and centres only at rest (§11). `NHW_Map`: **Android, later**. |
| E5 | the ring and ghost deck cannot live in an overlay view on Android | Web: they live in `web.js`'s map tap path (`glassGestures`), as §16 already said. Android (`NHW_Map.UI.onTouched`): **Android, later**. |
| E6 | the header needs `RhScreen` split | Largely moot: phones keep the header stacked in the glass, which is the shape `RhScreen` and the web's `#glass` already have. The split is needed only for `mapCell: 'rows'`; **Android, later**. |
| E7 | `layout.mjs` not shareable; no test infrastructure | **Fixed** (layout.js + layout-cli.mjs). Web: add `layout.js` to `build.sh`'s copy list and `sw.js`'s `FILES` (§16); `checks/sweep.mjs` is the node gate (no dependencies). `RhLayout.java`, JUnit, the JSON asset sync: **Android, later**. |
| E8 | text size is not an input | **Fixed.** `msgRowH` and `statusH` (or `text: {msgFont, msgSize, textScale}` through `textMetrics()`) are inputs. Sweep §8: both faces × Message size 0.85–1.4 × system text 0.85–2. |
| E9 | Long rest's upward swipe reverses an owner decision | **Kept**, by Lucas's decision of 2026-10-02 (swipe up). |
| E10 | the empty pin's tap reverses an owner decision | **Kept**, by Lucas's decision of 2026-10-02 (a tap opens the picker). |
| E11 | "locks when the level fits" contradicts the free pan | **Fixed** as Lucas's rule: a drag may move the map along an axis that fits; lock and centre only at rest (§11). |
| E12 | bubbling listeners cannot see key presses | **Written in** (§12): the input-mode machine listens in the capture phase. |
| E13 | `visualViewport` as the size source | **Written in** (§12): W and H from the `svh` root's ResizeObserver; `visualViewport` only lifts forms; no re-layout while an input has focus or a pointer is down. |
| E14 | one budget cannot serve tab, installed and fullscreen | **Written in** (§12): the budget is keyed by `display-mode` and the fullscreen state. |
| E15 | inventory panel work | Web: turn `perm_invent` on and route `WIN_INVEN` to the panel, no core change (§16). Android (`and_update_inventory`, JNI, a view): **Android, later**. |
| E16 | edge tells need hostility the glyphs do not carry | Web: any non-pet monster at first; a hostile flag from the window ports later (§11). Android: **later**. |
| E17 | the overview collides with pinch | **Written in** (§11): both pointers still within 10 dp for 250 ms = overview; a spread change over 12 dp = pinch; the zoom is written on lift. |
| E18 | the ghost deck blocks four landscape rows | **Fixed** (§6): it previews (flash and outline; a second tap on the same cell acts), only when a tap would travel, and retires after three sessions with no unconfirmed preview (round 2). |
| E19 | `configChanges` lacks `navigation`, `density`, `uiMode` | **Android, later.** |
| E20 | the dp map cell on Android needs font-metric inversion and zoom migration | **Android, later.** `cellAspect` takes the measured aspect. |
| E21 | Control scale must split geometry dp from text dp | **Android, later.** |
| E22 | FLICK: the legend is the only edit route; `FLICK_MIN` 14 | **Fixed** (§7): `FLICK_MIN` stays 26 dp; the legend nodes are targets while FLICK is held and while assigning. |
| E23 | Ctrl+Space is ChromeOS's input switch; the layer name pill draws over keys | **Fixed:** the prefix is Ctrl+; on every OS (round 2: round 1's Ctrl+Option+Space and Ctrl+Shift+Space also switch input sources) (§12); the pill draws inside the map, never over a key, and is a checked pop-up in the spec (§8). |

Player (`../final/verify-player.md`):

| # | issue | outcome |
|---|---|---|
| P1 | the map guards eat --More--, farlook and targeting taps; the ghost deck blanks four rows | **Fixed** (§6): halo swallow, confirm ring and ghost deck act only when a tap would travel, and pass taps through at --More--, in getpos (farlook, travel, targeting) and in menus or text windows; with Fight armed or a layer open a map tap is consumed instead (round 2). The ghost deck previews; it retires after three sessions with no unconfirmed preview. On Lucas's phone in portrait the map now ends 107 dp above the banks, so there is no ring there at all. |
| P2 | Take off, Remove and Swap act at once over the action pad | **Fixed for T and R:** the twin layout adds `OPTIONS=paranoid_confirmation:+Remove` to the game's options, appended by `web.js` `start()` only for twin so classic is unchanged (round 2) (the `+` keeps the defaults pray, swim and trap; `src/options.c` `optfn_paranoid_confirmation`), so T and R always ask and Pray stays confirmed. The rows stay where they are (Lucas). Swap still acts: 0.52% of taps aimed at LOOK on Lucas's phone (§16 risks). |
| P3 | 360–390 portrait banks meet; a walking tap can arm Fire | **Fixed** (D): at least 24 dp between the banks. Pad → other bank 0.10% at 360 and 0.09% at 390; bank → pad 0.40% and 0.17% (were 0.62% and 1.45% / 0.60%). PIN 2 stays Fire: every phone now has the minimum gap. |
| P4 | sticky pad layers capture the next walking tap (↓ = Descend) | **Fixed** (§8): the pad-centre hold opens HERE slide-only (lifting without a slide closes it); count layers close on lift unless the hold lasted 600 ms; CONTEXT's tap with several actions still opens HERE sticky. Since round 2 its ↑ Ascend and ↓ Descend, and CONTEXT's own stairs action, take a second tap, because a near miss of COMBAT can land on CONTEXT. |
| P5 | the default cell shows fewer columns than today | **Fixed** (F): the columns cell, 34×21 in landscape on Lucas's phone (today 34×17), 32×21 in portrait (today 24×21); spare height to message rows, bars and a log; `mapCell: 'rows'` keeps the bigger glyphs. |
| P6 | Pray at 800 ms is a habit trap | **Fixed:** Lucas's 380 ms hold stays. The habit on the old SACRIFICE spot (now REST in landscape, GAME in portrait) is guarded during the switch (round 2, §15). |
| P7 | Long rest's swipe direction | **Kept** (swipe up), by Lucas's decision of 2026-10-02. |
| P8 | nothing blocks taps after a drawer or modal closes | **Fixed** (§6): map taps are swallowed for 200 ms after any drawer, modal or menu closes, and ring taps for 120 ms after a key lifts. |

### Android, later

The Android build (RolehackFront, RolehackDroid) is out of scope for this round. What it will need, from the verifiers:
- Port `layout.js` to `RhLayout.java` with golden tests against `spec.json` and `variants/` (E7); add JUnit to the lib; one JSON asset for the tables and constants, synced by a script.
- Feed the budget `{w, h, l}` and the landscape side insets from `onSizeChanged`, keyed by the fullscreen/immersive state (E2).
- `layoutInDisplayCutoutMode = SHORT_EDGES`, `avoidCutout` from `DisplayCutout` rotated for the other orientation; measure Lucas's view at 0°, 90° and 270° before trusting parity (E3). With SHORT_EDGES his landscape window should be 939 wide, as portrait is tall, and the budget then changes nothing.
- `NHW_Map`: per-axis lock and clamp at rest, a free drag (E4); the ring, the 120/200 ms rules and the ghost-deck preview in `UI.onTouched`, fed the ring rects and the last key-up time through `NH_State` (E5); a dp base cell by font-metric inversion and the zoom as a factor, with migration (E20); the overview rule (E17).
- `RhScreen` split only if `mapCell: 'rows'` ships on Android (E6).
- `configChanges` gains `navigation|density|uiMode` (E19); `RhTheme.textDp()` for the Control scale (E21); `and_update_inventory` for the panel (E15); a hostile flag for edge tells (E16).
- Pray stays at `PRAY_HOLD_MS` 380; `FLICK_MIN` stays 26.

---

## 1. The rule

Each thumb owns one bank of keys, 3 columns by 6 rows, anchored to its own bottom corner. Every size and offset in a bank is computed only from the device's short side and long side (in a browser tab, from the portrait width, landscape height and landscape width the device has shown), the input in use and the player's settings. Nothing depends on the orientation, so a phone's two orientations get identical banks by construction.

The movement pad keeps the player's key size (46, 52 or 58 dp) wherever it fits. When the width is short, the right bank's columns give way first (never under 44 dp), then the gaps and margins, in a fixed order; at least 24 dp always separate the banks in portrait; the gap between pad keys never drops below 3 dp. Only on a short side under about 358 dp (58 dp keys) does the pad step down, 58 → 52 → 46. Below what 46 dp keys need, the result is marked degraded and says why; `layout()` never throws. A window with no room for twin banks and a map (one that shows 8×8 cells and holds the drawer), such as a near-square split screen, comes back unusable, and the page shows classic there.

Each bank carries a 12 dp guard halo, and no band, panel or map comes inside it. The map takes the rectangle the banks leave that shows the most of the level at the device's one map cell: between the banks at full height, or above them at full width. On phones that cell shows at least today's 34 columns in landscape where the 12 dp floor allows (a landscape map at least 408 dp wide), with all 21 rows where they fit. It is set once per device, from the landscape geometry at 58 dp keys, so a rotation never changes the glyph size and smaller keys only add columns. The text header stacks at the top of the glass; it moves over the banks only when that shows more rows. Height the level does not need becomes message rows, status bars or panels, never moved keys. With a mouse in use, the same two banks shrink to 40 dp and dock under the whole level.

```
 896 x 443, landscape (Lucas's phone)                        443 x 939, portrait
 +--------------------------------------------------------+   +--------------------------------+
 |                  : MESSAGES 3 rows    :                 |   | MESSAGES 4 rows                |
 |[REST][WRLD][SAC ]: STATUS 3 lines     :[M2  ][KEYS][M3 ]|   | STATUS 3 lines + HP/Pw bars    |
 |[GAME][ M1 ][MENU]:+------------------+:[Wear][PutO][Wld]|   |   MAP 435 x 282: 32 x 21 at    |
 |[MSGS][DROP][pin1]:|  MAP 456 x 282   |:[TOff][Rmv ][Swp]|   |   the same 13.4 dp cell        |
 |[ y  ][ k  ][ u  ]:|  34 x 21 cells   |:[pin2][FLCK][LOK]|   |--------------------------------|
 |[ h  ][ .  ][ l  ]:|  at 13.4 dp      |:[CMBT][CTXT][EAT]|   | message log (the history)      |
 |[ b  ][ j  ][ n  ]:+------------------+:[INV ][SRCH][APL]|   |[REST][WRLD][SAC ] [M2][KEYS][M3]|
 +--------------------------------------------------------+   |[GAME][ M1 ][MENU] [Wear][PO][Wd]|
   ':' = 12 dp halo (snap within 8, swallow beyond),          |[MSGS][DROP][pin1] [TOff][Rm][Sw]|
   then a 20 dp confirm ring inside the map                    |[ y  ][ k  ][ u  ] [pin2][FL][LK]|
                                                              |[ h  ][ .  ][ l  ] [CMBT][CX][EA]|
 Each bank: 190 x 350 dp, 18 dp from the side and bottom      |[ b  ][ j  ][ n  ] [INV ][SR][AP]|
 edges. Rows 0-2: 58 dp, rows 3-4: 48 dp, strip: 44 dp.       +--------------------------------+
```

Schematic, not to scale. The drawings to scale are `spec.896x443.svg` and `spec.443x939.svg`.

---

## 2. Harness headline

```
v2 (guarded twin banks):    0 thumb switches / 0 moves>10mm / 36 of 36 trained taps on the same key (896x443/443x939) | map 32.4% / 29.5% (896x443 / 443x939) | smallest pad key 58.0 dp (640x360) | void 4.4% (1920x1080)
final, 29 September:        0 thumb switches / 0 moves>10mm / 36 of 36 trained taps on the same key (896x443/443x939) | map 42.5% / 38.6% (896x443 / 443x939) | smallest pad key 58.0 dp (640x360) | void 4.4% (1920x1080)
baseline (current build):   5 thumb switches / 8 moves>10mm / 18 of 36 trained taps on the same key (896x443/443x939) | map 20.7% / 35.1% (896x443 / 443x939) | smallest pad key 43.6 dp (640x360) | void 21.8% (1920x1080)
```

The spec has no errors and no warnings. On all 15 screens: no overlaps, no key on the map or off screen, no touch target under 44 dp, no pop-up over a key or outside the map, no band or panel within 12 dp of a key, no key beyond 75 mm. The scored screens of each orientation pair are laid out with the pair's remembered budget, as both builds lay out once a device has been seen both ways (§12); only Lucas's phone is uneven (896 wide in landscape, 939 tall in portrait), and without the budget its first portrait session uses a 14.7 dp cell instead of 13.4 until he rotates once. The banks are the same either way.

**Parity.** All five orientation pairs score 0 thumb switches, 0 moves, 0 bearing changes, 0 order swaps, and 36 of 36 trained taps both ways, including with the 3 dp margin. The weighted break total is 0.00 (baseline 51.38 on Lucas's phone, 80.74 on the tablet). The hit model (§6) resolves every point of each bank and its halo the same in both orientations.

**Variants** (`variants/`, each scored by the harness): combat-left and left-handed score the same headline; Android's text cells 37.0% / 33.7% (52.8×21 and 50.4×21 cells at a 15.35 dp cell); 46 dp keys 37.5% / 29.5%, 52 dp keys 34.9% / 29.5% (smaller keys add landscape columns at the same cell); `mapCell: 'rows'` 43.0% / 39.1% (the earlier final's bigger glyphs).

**How to read the map number.** `mapArea` is where cells are drawn (SPEC.md), so the share follows the cell's size, not how much of the level shows. The v2 default cell is smaller than the final's, so its share is smaller while it shows more of the level:

| | landscape 896x443 | portrait 443x939 | cells shown L / P |
|---|---|---|---|
| baseline (web) | 20.7% (12 dp tiles) | 35.1% | 34×17 = 578 / 24×21 = 504 |
| final, 29 September (17.6 dp) | 42.5% | 38.6% | 26×21 = 546 / 25×21 = 525 |
| **v2**, 13.4 dp | **32.4%** | **29.5%** | **34×21 = 714 / 32×21 = 680** |
| v2 with `mapCell: 'rows'` (17.8 dp) | 43.0% | 39.1% | 25.6×21 / 24.4×21 |
| v2 with Android's text cell (15.35 dp tall) | 37.0% | 33.7% | 52.8×21 / 50.4×21 (today about 55×15) |

**Per screen** (this / baseline, from `spec.report.md`):

| screen | map % | cells shown | void % | smallest pad dp | pad pitch dp | smallest other dp | small targets | pop-ups over keys | beyond 75 mm |
|---|---|---|---|---|---|---|---|---|---|
| 896x443 | 32.4 / 20.7 | 34×21 | 10.2 / 10.7 | 58 / 58 | 66 | 44 / 28 | 0 / 7 | 0 / 7 | 0 / 0 |
| 443x939 | 29.5 / 35.1 | 32×21 | 4.3 / 9.2 | 58 / 58 | 66 | 44 / 36 | 0 / 8 | 0 / 13 | 0 / 0 |
| 640x360 | 29.1 / 19.6 | 23×20 | 4.4 / 10.0 | **58 / 43.6** | 61 | 44 / 21 | 0 / 33 | 0 / 8 | 0 / 0 |
| 360x640 | 27.9 / 21.8 | 29×15 | 2.3 / 7.4 | 58 / 47.2 | 61 | 44 / 29.3 | 0 / 18 | 0 / 13 | 0 / 0 |
| 915x412 | 38.9 / 19.9 | 36×21 | 7.9 / 9.8 | 58 / 57.6 | 64 | 44 / 27.8 | 0 / 7 | 0 / 0 | 0 / 0 |
| 412x915 | 31.2 / 37.4 | 29×21 | 2.5 / 8.5 | 58 / 54.1 | 64 | 44 / 33.6 | 0 / 8 | 0 / 0 | 0 / 0 |
| 844x390 | 37.1 / 19.0 | 35×21 | 7.1 / 9.2 | 58 / 54.5 | 62 | 44 / 26.3 | 0 / 7 | 0 / 0 | 0 / 0 |
| 390x844 | 31.3 / 35.5 | 30×21 | 7.7 / 8.0 | 58 / 51.2 | 62 | 44 / 31.8 | 0 / 18 | 0 / 0 | 0 / 0 |
| 1024x768 | 33.4 / 35.9 | whole | 6.2 / 26.2 | 58 / 58 | 66 | 44 / 28 | 0 / 7 | 0 / 5 | 0 / **16** |
| 768x1024 | 25.4 / 41.3 | 61×21 | 4.0 / 20.0 | 58 / 58 | 66 | 44 / 36 | 0 / 8 | 0 / 10 | 0 / 2 |
| 1180x820 | 36.5 / – | whole | 6.9 | 58 | 66 | 44 | 0 | 0 | 0 |
| 1366x768 touch | 36.0 / 44.3 | whole | 10.3 / 23.0 | 58 / 58 | 66 | 44 / 28 | 0 / 7 | 0 / 0 | 0 / 16 |
| 1280x800 mouse | 36.9 / – | whole | 5.8 | 40 | 46 | 30 | n/a | 0 | n/a |
| 1920x1080 mouse | 42.9 / 58.1 | whole | 4.4 / 21.8 | 40 / 58 | 46 | 30 / 28 | n/a | 0 / 0 | n/a |
| 2560x1440 mouse | 43.8 / – | whole | 3.4 | 40 | 46 | 30 | n/a | 0 | n/a |

**The void on Lucas's phone.** In landscape the header stacks in the glass, so the 63 dp over each bank is empty: 10.2% void, a little under today's 10.7% (11.4% in round 1, before the message rows took the web's own 9.5 CSS px x-height). That space is the price of never squeezing the banks for text: the header over the banks would show no more of the level at the new cell, and §4 keeps it for when it does.

**Checks beyond the harness** (all in `checks/`, all re-runnable):

| check | result |
|---|---|
| `sweep.mjs`, the CI gate: ten sections, 73,470 layouts (below) | **0 issues** (2,715 unusable results, all in sections 7 and 10, where the page shows classic). On the earlier rules (`RH_LAYOUT=<path>`): the final 11,488 issues, in every section; round-1 v2 5,451, in six. |
| `nearmiss.mjs`: tap scatter σ 2.3 mm under the hit model, 200,000 taps a key, seeded | other bank: 0.00% in landscape on every phone; in portrait 0.05% on Lucas's phone, pad → bank 0.09–0.10% and bank → pad 0.12–0.40% at 360–412. PIN 2 → Take off 0.52% (Lucas) to 1.30% (360). Inside the action pad, COMBAT → CONTEXT 0.52% (Lucas) to 2.57% (360) (§6). A pad tap travelling the map: 0 in 200,000; landing in the ring (a preview): 0.20–0.25% in landscape, none in portrait. |
| `tab.mjs`: Lucas's phone in a Chrome tab (896x363 / 443x859); iPhones | with the budget 36 of 36 and the pad centre at 113, 113 in fullscreen and in the tab; without it 12 of 36. iPhone 14/15/15 Pro Max: `physical` 36 of 36; `auto` and `safe` 0 of 36 with the landscape banks 6.2–8.1 mm inward (the known break, §13). |
| `guard.mjs`: key-to-map distance; keys next to the pad | ≥ 12 dp on every touch screen (107 dp in portrait on Lucas's phone). Only MSGS, DROP and PIN 1 (a view, a prompt, a picker) sit within 16 dp of the pad. |
| `transfer.mjs`: today's tap spots on the new layout | portrait 30 of 36 hit their key (all 18 tier-A keys); landscape 18 of 36. Five old deck spots land on the map, where the ghost deck previews (§6); the six old header spots now hit nothing. |
| `voidnp.mjs`: big-screen void with panels counted as void | 1920x1080: 47.4% (panels 43.1% of the screen). The panels are the honest price of a 3.8:1 level on a 16:9 screen. |

The sweep's sections:

| § | what | screens |
|---|---|---|
| 1 | 46/52/58 dp × {default, left-handed, combat-left, text cells, `mapCell: 'rows'`} over 13 phones, 7 tablets and 4 foldables or split views (540x720, 561x744, 690x829, 701x841) in both orientations, 4 touch laptops, 11 mouse screens; every pair by the harness (0/0/0/0, 36 of 36 both ways with the 3 dp margin) and by hit-model parity; every screen by the harness's checks plus: usable and drawable, no band or panel over or within 12 dp of a key, pop-ups inside the map, a drawer, ≥ 12 dp key-to-map, mouse void under 21.8% | 880 |
| 2 | the map never shrinks as the keys shrink: cells and map share, 46 ≥ 52 ≥ 58, on every matrix screen and variant (260), and on dense grids of windows 480–1000 × 600–960 dp (step 8) and 1000–2000 × 320–480 (steps 16 and 8) in every variant (21,795 windows, 3 key sizes each); a window usable at one size stays usable at the smaller ones | 22,055 |
| 3 | uneven pairs (915x388/412x891, 830x390/390x860, 896x419/443x915, 844x366/390x820, 640x336/360x616, 896x443/443x939, 800x412/412x915): parity with the budget; every single-screen rule without it | 420 |
| 4 | iPhone 14/15/15 Pro Max side insets 47/59/62, both sides and one side, under `auto`, `physical`, `safe`: keys and bands clear of the insets; parity under `physical` | 108 |
| 5 | Android side cutouts 0/8/24/30 dp at 360/390/412 wide (and 360x640): the margin clears the cutout, adds only the depth beyond it, never raises the bottom offset; parity | 480 |
| 6 | grip lift 0/20/40/80 on four phone pairs and two tablet pairs, both cell modes: clamped, nothing off screen or under a band; parity. Then lift × `anchor: 'safe'` × bottom insets 21/34 on iPhone 12 mini, 14, 15 Pro Max and 640x360 | 256 |
| 7 | short screens 640x336, 592x336, 600x330, 700x320, 1024x300, 800x250, 480x300, 300x200 and their portraits; every near-square window 320–520 dp (step 8) at 46/52/58; eleven windows smaller than their budget: a spec every time, the pad never under 46 nor the right columns under 40 unless degraded, every degraded result with a reason, the text never blamed at the default size; usable and clean, or unusable (2,041 unusable: the page shows classic) | 2,279 |
| 8 | text: both message faces × Message size 0.85/1/1.2/1.4 × system text 0.85/1/1.3/2, both cell modes, on five pairs | 640 |
| 9 | 960x600 / 600x960 show all 21 rows; 3440x1440, 3840x1600, 5120x1440, 2560x1440, 1920x1080 mouse with tiles and text cells under 21.8% void | 22 |
| 10 | 3,000 seeded random windows and settings (NaN, Infinity, strings, nonsense budgets and insets): a spec with only finite numbers every time, and every usable one drawable by `lib.mjs` `drawable()` (674 unusable) | 3,000 |

---

## 3. Where the design came from, and what v2 changed

The judges found no fatal flaw in twin-banks; the final grafted the other four concepts' best ideas onto it, and v2 corrected what the verifiers found. The current state of each piece:

| piece | source | now |
|---|---|---|
| The near-miss guard: hit cells tile each bank, a 12 dp halo that snaps or swallows, a 20 dp confirm ring, gesture ownership by pointer-down | full-bleed | Kept, and v2 makes it act only when a tap would travel, Fight armed included (§6), keeps at least 24 dp between the banks so the halos never meet, and swallows map taps 200 ms after a drawer, modal or menu closes. Round 2: the action pad's seams swallow instead of tiling. |
| Counts as a layer on the pad, not a shelf | thumb-arcs | Kept. v2: a count layer closes on lift unless the hold lasted 600 ms (§8). |
| One HERE layer for the pad-centre radial and the CONTEXT fan | lean-core | Kept. v2: from the pad centre it is slide-only, so a walking tap can never become Descend; round 2: from CONTEXT the stairs take a second tap, so a near miss of COMBAT cannot either. |
| The ghost deck for today's landscape deck spots | lean-core, size-classes | v2: a preview, not a swallow, only when a tap would travel; retires after three sessions with no unconfirmed preview; during the switch it also guards the old radial's and the old pray hold's habits (§15). |
| The map cell | full-bleed ("fill the rows") | v2: the cell that shows at least today's 34 landscape columns where the 12 dp floor allows (13.4 dp on Lucas's phone); "fill the rows" is the `mapCell: 'rows'` setting. |
| The header over the banks | full-bleed | v2: stacked in the glass by default; over the banks only when it shows more rows (or with `mapCell: 'rows'`), only side by side, always 12 dp clear of keys. |
| Short landscape phones: upper-row gaps, the bottom offset and last the pad gap give way so the header fits | full-bleed | Still the order of give for the header over the banks; with the header in the glass, only the bank's own height check uses it (bottom offset, upper gaps, pad gap ≥ 3). |
| The desk dock: the same banks at 40 dp under the whole level, legends, a Ctrl+Space prefix | size-classes | Kept. v2: the prefix is Ctrl+; (Ctrl+Space switches input sources on macOS and ChromeOS); text cells capped by width; 21:9 tiles to 48 px; panels flank the map when the strips beside it are wide. |
| Size classes and the input-mode machine | size-classes | Kept. v2: capture-phase listeners, the `svh` root as the size source, the budget keyed by display mode. |
| Combat on the right thumb, with a `combatThumb: 'L'` setting | full-bleed | Kept. |
| Pray on a long hold | full-bleed | v2: Lucas's 380 ms hold of SACRIFICE stays; the reach (61.8 mm) and the game's own y/n guard it. |
| A sticky layer drops back after 4 s idle or a map tap | lean-core | Kept, for the layers that stay up (hubs, CONTEXT's HERE, held counts). |
| PIN 2 defaults to Fire; PIN 1 stays empty | lean-core | Kept: every phone now has the 24 dp gap, so a stray pad tap reaching PIN 2 is rare (§6). |
| Sacrifice also on the HERE layer (↖) on an altar | lean-core | Kept. |
| MSGS in the row above the pad; that row holds only harmless keys | full-bleed | Kept. |
| The right strip ordered M3, KEYS, M2, so an old INVENTORY-bar tap opens a view | (found in the final) | Kept. |
| iPhone safe areas: physical corners except landscape side insets | thumb-arcs, full-bleed | Kept as `anchor: 'auto'`; v2 counts an inset only beyond the margin that clears it. |

The rest of twin-banks stands: the bank table, the budget memory for browser tabs, the lamps moving onto their keys, today's pad and today's portrait action pad to the dp, and the case wells and CRT glass.

---

## 4. Screen classes

The tier comes from Android's size classes and the input in use: **phone** when the width is under 600 dp or the height under 480 dp (a landscape phone is compact *height*); **tablet** when both are larger; **desk** whenever a mouse or keyboard is the input in use (deferred on 2026-10-03, built on 2026-10-07: see CHANGES, "Desktop mode is built"; where touch is possible, typed keys alone only turn on the key letters). Each threshold has a ±24 dp hysteresis band, so a window on a boundary does not flicker. The tier changes the map treatment and the panels only. No key's size or offset depends on the tier or on the orientation.

| screen | tier | pad / pitch | right columns | edge / bottom offset | bank gap (portrait) | upper rows / gap | glass | header | map dp | cell | cells shown | msg rows | panels |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 896x443 | phone | 58 / 66 | 58 | 18 / 18 | 27 | 48 / 6 | between | in the glass, stacked | 456×282 | 13.4 | 34×21 | 3 | – |
| 443x939 | phone | 58 / 66 | 58 | 18 / 18 | 27 | 48 / 6 | above | stacked | 435×282 | 13.4 | 32×21 | 4 | log |
| 640x360 | phone | 58 / 61 | 44.7 | 8 / 8 | 24 | 44 / 3 | between | in the glass, stacked | 280×239 | 12 | 23×20 | 2 | – |
| 360x640 | phone | 58 / 61 | 44.7 | 8 / 8 | 24 | 44 / 3 | above | stacked | 352×182 | 12 | 29×15 | 2 | – |
| 915x412 | phone | 58 / 64 | 55.3 | 12 / 12 | 24 | 44 / 3 | between | in the glass, stacked | 503×291 | 13.9 | 36×21 | 2 | – |
| 412x915 | phone | 58 / 64 | 55.3 | 12 / 12 | 24 | 44 / 3 | above | stacked | 404×291 | 13.9 | 29×21 | 4 | log |
| 844x390 | phone | 58 / 62 | 53.3 | 8 / 8 | 24 | 44 / 3 | between | in the glass, stacked | 454×269 | 12.8 | 35×21 | 2 | – |
| 390x844 | phone | 58 / 62 | 53.3 | 8 / 8 | 24 | 44 / 3 | above | stacked | 382×269 | 12.8 | 30×21 | 4 | – |
| 1024x768 | tablet | 58 / 66 | 58 | 18 / 18 | 352 | 48 / 6 | above | side by side | 1000×263 | 12.5 | whole | 4 | log, inventory |
| 768x1024 | tablet | 58 / 66 | 58 | 18 / 18 | 352 | 48 / 6 | above | stacked | 760×263 | 12.5 | 61×21 | 3 | log, inventory |
| 1180x820 | tablet | 58 / 66 | 58 | 18 / 18 | 404 | 48 / 6 | above | side by side | 1160×305 | 14.5 | whole | 4 | log, inventory |
| 1366x768 touch | tablet | 58 / 66 | 58 | 18 / 18 | 352 | 48 / 6 | above | side by side | 1200×315 | 15 | whole | 2 | log, inventory |
| 1280x800 mouse | desk | 40 / 46 | 40 | dock | dock | 34 / 4 | dock | side by side | 1200×315 | 15 px | whole | 2 | log, inventory, legend |
| 1920x1080 mouse | desk | 40 / 46 | 40 | dock | dock | 34 / 4 | dock | side by side | 1840×483 | 23 px | whole | 2 | log, inventory, legend |
| 2560x1440 mouse | desk | 40 / 46 | 40 | dock | dock | 34 / 4 | dock | side by side | 2480×651 | 31 px | whole | 2 | log, inventory, legend |
| 1280x800 mouse, today | tablet | 58 / 66 | 58 | 18 / 18 | 384 | 48 / 6 | above | side by side | 1240×326 | 15.5 | whole | 3 | log, inventory |
| 1920x1080 mouse, today | tablet | 58 / 66 | 58 | 18 / 18 | 664 | 48 / 6 | above | side by side | 1880×494 | 23.5 | whole | 2 | log, inventory |
| 2560x1440 mouse, today | tablet | 58 / 66 | 58 | 18 / 18 | 1024 | 48 / 6 | above | side by side | 2520×662 | 31.5 | whole | 2 | log, inventory |
| 3440x1440 mouse, today | tablet | 58 / 66 | 58 | 18 / 18 | 1024 | 48 / 6 | above | side by side | 3400×893 | 42.5 | whole | 4 | log, inventory |

The desk rows are desktop mode, built on 2026-10-07; the rows marked "today" are what a mouse window got while it was deferred (3 to 7 October), and what any window still gets while it is touched: the tablet tier, its banks at phone size in the corners, the cell as §11's monitor cap gives it.

"Cell" is the map cell's height in dp (the web's tile; Android's text cell is 0.5625 as wide). The web draws it at `floor(cell × dpr) / dpr`. The right columns are not rounded to whole dp: a rounding remainder would widen the gap between the banks for one key size and not the next.

### Phone, landscape (896x443, 915x412, 844x390)

- **Banks.** In the bottom corners. On Lucas's phone they sit 18 dp from the side and bottom edges, and the movement pad is exactly where it is today: x 18/84/150, y 235/301/367.
- **Header.** Stacked at the top of the glass between the banks, 12 dp clear of each: messages (2 rows on screens under 800 dp tall, plus spare rows), then the status lines. On Lucas's phone 456 dp wide: 3 message rows and the 3 status lines.
- **Map.** Between the banks, under the header, 12 dp clear of each bank: 456×282 dp on Lucas's phone, 34 columns by all 21 rows at 13.4 dp (today 408×202 dp, 34×17).
- **When the header goes over the banks.** Only when that shows more rows than the header in the glass, and only side by side on the width left after side insets and a cutout, 12 dp clear of every key. Then, in a fixed order, the top margin, the upper-row gaps (6 → 2), the upper rows (48 → 44), the last of their gaps, the bottom offset (at most 10 dp) and last the pad gap (never under 3 dp) give way. In the default cell mode no phone in the sweep needs it, at any key size; with `mapCell: 'rows'` it is used whenever it fits (Lucas's phone: only the top margin gives, 4 → 2.3 dp).
- **Short screens.** A landscape height under 420 dp gets 44 dp upper rows with 3 dp gaps.

### Phone, portrait (443x939, 412x915, 390x844)

- **Banks.** The same two banks, 27 dp apart on Lucas's phone and at least 24 dp everywhere (24 on 412- and 390-wide phones, where the right columns narrow to 55.3 and 53.3 dp to pay for it).
- **Glass.** Full width above the banks, 12 dp clear of them: messages, then status, then the map.
- **Map.** The same cell as landscape: 21 rows, 32 columns on Lucas's phone. Rotating keeps the glyph size and the rows; 2 columns change.
- **Spare height.** Portrait has more height than 21 rows need. It becomes a 4th message row, HP/Pw bars under the status lines, and after those a message log under the map (91 dp on Lucas's phone: the history beyond the band's rows; a tap opens it all). So the map ends 107 dp above the banks on Lucas's phone: no confirm ring is needed there.

### Small phone (640x360 / 360x640)

- **The pad stays at 58 dp** (today 43.6 dp in landscape and 47.2 in portrait). The right bank's columns narrow to 44.7 dp so the banks stay 24 dp apart in portrait. The margins are 8 dp and the gaps 3 dp (pitch 61).
- **Header.** Stacked in the glass, 280 dp wide in landscape, 2 message rows.
- **Map.** 280×239 in landscape at the 12 dp floor (23 columns, 19.9 rows: it pans a little) and 352×182 in portrait (29×15). Today 273×165 and 331×152. The 12 dp floor is why a 360-class phone shows 23, not 34, landscape columns.
- **Smaller keys.** A player who picks 46 dp keys keeps the 12 dp cell and gets the freed width as columns. Nothing else is scaled.
- **Shorter still.** With the status bar showing (640x336 / 360x616) the remembered budget keeps 58 dp keys (the portrait width is 360); a window whose short side is 336 dp in both orientations gets 46 dp keys (`fit.level: 'stepped'`).

### Tablet (1024x768, 768x1024, 1180x820; 960x600)

- **Banks.** At phone size: 58 dp keys, 18 dp offsets. Thumb reach does not grow with the screen. No key is beyond 75 mm; today 16 are on a 1024x768 tablet in landscape.
- **Grip lift.** A setting raises both banks along their side edges by the same amount in both orientations, clamped to what the landscape height allows. It is a setting, not a tier rule, so parity holds.
- **Map.** Landscape shows the whole level when its cell would be 12 dp or more (12.5 dp on 1024x768, 14.5 dp on 1180x820); the spare glass (under 120 dp) becomes 2 more message rows. Portrait keeps the device cell: 61 of 80 columns and all 21 rows on 768x1024, and the glass the level does not need becomes a message log.
- **Tray.** The space between the banks (584×350 on 1024x768) holds the inventory panel, and the message log when the glass has no room for it.
- **960x600 (8-inch Android tablets).** Too short for the whole level above the banks, so the phone rule applies and the column between the banks wins because it shows all 21 rows and at least 70% of the full-width strip's cells (714 against 993): 34×21 at 15.3 dp, with the log over the left bank and the inventory over the right. Portrait 600x960: 39×21.

### Touch laptop (1366x768, touch)

- **Tablet tier.** Phone-size banks in the bottom corners, where touch-laptop users grip.
- **Map.** The whole level at 15 dp above the banks. The 79 dp strips of glass beside it are the main void (9.9%).
- **Tray.** The message log and the inventory, 459 dp wide each.
- **Input.** The first sustained mouse or touchpad use switches to the desk arrangement (§12). A touch switches back.

### Desktop, mouse and keyboard (1280x800, 1920x1080, 2560x1440; ultrawide)

Built on 2026-10-07 (CHANGES, "Desktop mode is built"), as below, with these changes: the cell is whole device pixels (a `dpr` input; at density 1.25 and 1.5 a cell often lost a device pixel); a map too short for the whole level is never wider than it; the arrangement (the header, the cell, the panels, the legend) keeps a 24 dp band, as the touch glass does; a window too short for the dock gets the thumb banks, then classic; where the layout leaves no room for the key legend, the message log shows it while the prefix waits, Ctrl is held or a keyboard-opened layer is up.

- **Map.** The whole level at the largest whole-pixel cell that fits the width and leaves room for the dock, up to 32 px wide: 15, 23 and 31 px. Android's text cells may stand up to 57 px tall (32 px wide). On 21:9 and wider, where 32 px tiles would leave strips wider than a panel beside the level, tiles may grow to 48 px over the next 160 dp of width, a device pixel at a time (2026-10-08; it was a step): 42 px on 3440x1440. It sits right under the header.
- **Safe insets.** The desk lies within them. Each counts only beyond the 2 dp the desk keeps from every edge (§13).
- **Dock.** The same two banks at 40 dp (upper rows 34, strip 30), in the same order, in the row under the map at its outer edges, 12 dp in from the screen's sides. Each has its own well. A phone player finds every key in the same relative place, and on a touchscreen laptop the hands reach the banks where they rest (Lucas, 2026-10-08; until then the banks stood side by side with a 24 dp gap, centred under the map). Every key shows its keyboard key (§12).
- **Panels.** The message log and the inventory share the row between the banks, the full height of the row, each at least 160 dp. The log stays alone when only one fits, since the legend borrows its place. The key legend goes under the left bank when 60 dp are left there. When the strips beside the map are 160 dp or wider (text cells on 16:9, any cell on 32:9), the log and the inventory stand beside the map, from its top to the banks' wells. The legend then takes the row between the banks.
- **Header.** Messages (at most 960 dp, about 110 characters a row) and status side by side at the top.
- **Void**, with the banks at the edges (the sweep's measure, 2026-10-08):
  - tiles: 6.6% at 1920x1080, 5.5% at 2560x1440, 4.0% at 3440x1440, 3.7% at 3840x1600 and 2.6% at 5120x1440;
  - text cells, the same screens: 14.7%, 8.3%, 2.6%, 2.7% and 2.4%.

  The edges cost about 2 points at 16:9: the row under the right bank is empty where the legend stood under the centred dock. Measured before them: 4.4%, 3.4% and 3.2%; 20.9% at 5120x2160, the worst tested (48 px tiles leave height over); text cells 14.5%, 8.2% and 7.7%, and 17.9% at 1280x800. Today's 1920x1080: 21.8%, the sweep's ceiling. With the panels counted as void it is 47–50%: a 3.8:1 level cannot fill a 16:9 screen.

---

## 5. Per control, Lucas's phone (58 dp keys)

Unchanged from the final: v2 moves no key on Lucas's phone. Every control has the same corner offset in both orientations, so one "in, up" column serves both. "In" is measured from its thumb's side edge and "up" from the bottom edge, to the key's centre. The bearing is 0° inward along the bottom edge and 90° straight up. Rects are x, y, w×h in dp; they are the drawn keycaps. Hit cells are larger (§6).

| id | landscape 896x443 | portrait 443x939 | thumb | in, up dp | mm @ bearing |
|---|---|---|---|---|---|
| pad_b ↙ | 18, 367, 58×58 | 18, 863, 58×58 | L | 47, 47 | 10.6 @ 45° |
| pad_j ↓ | 84, 367, 58×58 | 84, 863, 58×58 | L | 113, 47 | 19.4 @ 23° |
| pad_n ↘ | 150, 367, 58×58 | 150, 863, 58×58 | L | 179, 47 | 29.4 @ 15° |
| pad_h ← | 18, 301, 58×58 | 18, 797, 58×58 | L | 47, 113 | 19.4 @ 67° |
| pad_centre | 84, 301, 58×58 | 84, 797, 58×58 | L | 113, 113 | 25.4 @ 45° |
| pad_l → | 150, 301, 58×58 | 150, 797, 58×58 | L | 179, 113 | 33.6 @ 32° |
| pad_y ↖ | 18, 235, 58×58 | 18, 731, 58×58 | L | 47, 179 | 29.4 @ 75° |
| pad_k ↑ | 84, 235, 58×58 | 84, 731, 58×58 | L | 113, 179 | 33.6 @ 58° |
| pad_u ↗ | 150, 235, 58×58 | 150, 731, 58×58 | L | 179, 179 | 40.2 @ 45° |
| msgs | 18, 179, 58×48 | 18, 675, 58×48 | L | 47, 240 | 38.8 @ 79° |
| drop | 84, 179, 58×48 | 84, 675, 58×48 | L | 113, 240 | 42.1 @ 65° |
| pin1 | 150, 179, 58×48 | 150, 675, 58×48 | L | 179, 240 | 47.5 @ 53° |
| game | 18, 125, 58×48 | 18, 621, 58×48 | L | 47, 294 | 47.3 @ 81° |
| m1 | 84, 125, 58×48 | 84, 621, 58×48 | L | 113, 294 | 50.0 @ 69° |
| menu | 150, 125, 58×48 | 150, 621, 58×48 | L | 179, 294 | 54.6 @ 59° |
| rest (Long rest behind it) | 18, 75, 58×44 | 18, 571, 58×44 | L | 47, 346 | 55.4 @ 82° |
| world | 84, 75, 58×44 | 84, 571, 58×44 | L | 113, 346 | 57.8 @ 72° |
| sacrifice | 150, 75, 58×44 | 150, 571, 58×44 | L | 179, 346 | 61.8 @ 63° |
| apply | 820, 367, 58×58 | 367, 863, 58×58 | R | 47, 47 | 10.6 @ 45° |
| search | 754, 367, 58×58 | 301, 863, 58×58 | R | 113, 47 | 19.4 @ 23° |
| inventory | 688, 367, 58×58 | 235, 863, 58×58 | R | 179, 47 | 29.4 @ 15° |
| eat | 820, 301, 58×58 | 367, 797, 58×58 | R | 47, 113 | 19.4 @ 67° |
| context | 754, 301, 58×58 | 301, 797, 58×58 | R | 113, 113 | 25.4 @ 45° |
| combat | 688, 301, 58×58 | 235, 797, 58×58 | R | 179, 113 | 33.6 @ 32° |
| look | 820, 235, 58×58 | 367, 731, 58×58 | R | 47, 179 | 29.4 @ 75° |
| flick | 754, 235, 58×58 | 301, 731, 58×58 | R | 113, 179 | 33.6 @ 58° |
| pin2 | 688, 235, 58×58 | 235, 731, 58×58 | R | 179, 179 | 40.2 @ 45° |
| eq_swap | 820, 179, 58×48 | 367, 675, 58×48 | R | 47, 240 | 38.8 @ 79° |
| eq_remove | 754, 179, 58×48 | 301, 675, 58×48 | R | 113, 240 | 42.1 @ 65° |
| eq_takeoff | 688, 179, 58×48 | 235, 675, 58×48 | R | 179, 240 | 47.5 @ 53° |
| eq_wield | 820, 125, 58×48 | 367, 621, 58×48 | R | 47, 294 | 47.3 @ 81° |
| eq_puton | 754, 125, 58×48 | 301, 621, 58×48 | R | 113, 294 | 50.0 @ 69° |
| eq_wear | 688, 125, 58×48 | 235, 621, 58×48 | R | 179, 294 | 54.6 @ 59° |
| m3 | 820, 75, 58×44 | 367, 571, 58×44 | R | 47, 346 | 55.4 @ 82° |
| keys | 754, 75, 58×44 | 301, 571, 58×44 | R | 113, 346 | 57.8 @ 72° |
| m2 | 688, 75, 58×44 | 235, 571, 58×44 | R | 179, 346 | 61.8 @ 63° |

Reach: nothing is beyond 75 mm. In the stretch band (60–75 mm) are only SACRIFICE and M2, on purpose. Under 15 mm, under the thumb base, are ↙ and APPLY, as today.

**Why each key is where it is.**
- **Left bank (the walking thumb).**
  - The pad is today's pad to the dp, the one thing at full parity today.
  - The row directly above it holds only keys whose mis-tap is harmless: MSGS (a view), DROP (a prompt), PIN 1 (empty by default; its tap opens the picker, Lucas's choice of 2026-10-02). DROP sits in the middle column, so today's wide DROP centre (x 81) still lands on it.
  - REST stays in the top strip, 55 mm away. The owner's code says many-turn commands "belong out of thumb reach" (`RhOverlay.java:1030–1033`); the pad centre handles the one-turn rest.
  - SACRIFICE takes the bank's farthest cell, 61.8 mm, as the owner's code asks ("the furthest point from either thumb", `RhOverlay.java:4170`). A tap offers; Lucas's 380 ms hold prays, and the game asks y/n.
  - The drawer keys (GAME, MENU, WORLD) and M1 fill the middle and top rows.
- **Right bank (the acting thumb).**
  - Rows 0 to 2 are today's portrait action pad, key for key: INVENTORY, SEARCH, APPLY / COMBAT, CONTEXT, EAT / PIN 2, FLICK, LOOK. All eight tier-A verbs sit 10.6 to 33.6 mm from the corner. SEARCH is on the thumb that does not walk.
  - The equipment grid sits above them in today's portrait order (Lucas, 2026-10-02: the rows stay). Take off and Remove sit over the action pad, so the build sets `paranoid_confirmation:+Remove` and both always ask; Swap still acts.
  - The strip holds M3, KEYS and M2. M2, a macro, takes the farthest cell.

---

## 6. The near-miss guard

The failure to prevent is a tap meant for a key that lands on the map and makes the hero travel, or one meant for a key that fires a different key. `hitmap.896x443.svg` and `hitmap.443x939.svg` draw the result.

1. **Hit cells tile each bank, except the action pad's seams.**
   - Every point inside a bank's box belongs to the nearest keycap, so there is no map under a bank, and the outer column and the bottom row take taps out to the screen edges.
   - On the action pad (the right bank's rows 0–2 by default, where most keys act at once), the seam between two keycaps swallows instead, with the tick of item 3. The seam is the drawn gap, widened to at least 8 dp and centred on it where the gap is narrower.
   - On Lucas's phone the gap is 8 dp, so the seam is just the gap. At 360 dp (3 dp gaps) the 2.5 dp of each keycap's face along a seam swallows instead of firing.
   - So a near miss between COMBAT and CONTEXT, or between FLICK and PIN 2, is a lost tap, not the wrong verb. The movement pad and the upper rows still tile.
2. **The pad owns the gap above it.** Between rows 0–2 and row 3, the boundary is row 3's drawn face, not the middle of the gap. On Lucas's phone an upward overshoot leaves the pad only 8 dp past the key's top edge, not 4. The same rule holds on the action pad.
3. **The halo: 12 dp round each bank.**
   - A tap within 8 dp of a keycap snaps to it.
   - From 8 to 12 dp it is swallowed, with a light haptic tick and a 150 ms flash of the halo outline.
   - On a case skin the halo is drawn as the well's rim and the glass bezel.
   - No band, panel or map comes inside a halo; where a band or panel lies 12 dp from a key, the halo wins.
4. **At least 24 dp between the banks.**
   - In portrait the two halos never meet, so every point of a bank and its halo resolves the same in both orientations in that thumb's frame (checked on every pair by the sweep).
   - Beyond a halo, landscape has the map's confirm ring, and portrait the gap between the banks.
   - A tap fires the other bank only 16 dp past its own key's edge (4 dp past that key's halo), where the other bank's 8 dp snap begins. The 8 dp between the two snaps swallow.
5. **The confirm ring: the 20 dp of map next to a halo.**
   - A map tap there does not travel. It outlines the target cell, and a second tap on the same cell within 2 s walks. Anything else clears it.
   - Deeper in the map, a tap travels at once, as today.
   - On Lucas's phone in portrait the map ends 107 dp above the banks, so there is no ring.
6. **Ownership by pointer-down.** A gesture belongs to whatever got its pointer-down. A slide that starts on a key and ends over the map never travels, and a pan that starts on the map still pans.
7. **Taps after a key or a closing.**
   - For 120 ms after a key lifts, a map tap **in the ring** is swallowed. A bounce lands next to the key; a deliberate tap deeper in the map is not delayed.
   - For 200 ms after any drawer, a layer's ALL drawer, a modal or a menu closes, **every** map tap is swallowed, so a bounce or a double tap on a drawer item cannot fall through and travel.
8. **The ghost deck, for the switch.**
   - **What it does.** Taps on today's five landscape deck spots (COMBAT, PIN 2, FLICK, LOOK, CONTEXT, each rect plus 8 dp) preview instead of travelling. The old key's name flashes there with an arrow to its new home, and the target cell is outlined; a second tap on the same cell within 2 s acts.
   - **A catch** is a preview that was not confirmed that way: the player meant the old key. A confirmed preview was a travel and counts for nothing, so a player who taps to travel is not held back.
   - **Retiring.** The deck retires after three sessions in a row with no catch; a setting in MENU brings it back.
   - **A session** starts at a page load or a new game and ends after 30 minutes without input. It counts only once 100 turns have been played in it, so a tab left open for days, or an idle restart, never retires the deck by itself.
   - **Two old habits** are guarded while the deck is active (§15). Swallowed habit taps count as catches.
     - A pad-centre hold that lifts without a slide flashes "HERE: slide" in the layer pill. For 1.5 s, a tap on any of the old radial's five node spots (today's places plus 8 dp) is swallowed with that flash, whatever key or map now lies under it.
     - A hold of 380 ms or more on the old SACRIFICE spot (on a phone in landscape mostly REST, with GAME under it; GAME in portrait and at 640x360) that set nothing flashes an arrow to SACRIFICE as it lifts. The next pad tap within 1.5 s is swallowed, so the habitual y on ↖ cannot walk the hero. A hold that did something with its time is no habit and arms nothing:
       - REST's own count hold, the same gesture, when it picked a count by a slide or left the count layer up to be tapped (the layers stage's review, 3 October 2026);
       - a swipe of REST's strip, however slow, up to show Long rest or down to put it away;
       - a key's own hold where its keycap reaches into the spot: M1's macro editor, a hub's layer (the layers stage's re-check, 3 October 2026).

       GAME's and WORLD's lift is their tap, so a hold of them set nothing: the arrow shows over the drawer the tap opened, and the drawer's backdrop takes the y.

**When the guards act.** The halo's swallow, the seams, the confirm ring, the 120/200 ms rules and the ghost deck are there to stop a near miss from walking the hero or firing the wrong verb. So they act whenever a map tap would travel: whenever the core is waiting for a command. Two states in which something is open count as that:
- **Fight armed** (COMBAT's tap, or Fight from its hub).
  - The overlay holds F until a pad key gives the direction (`overlay.js` sends F and the direction together), so the core is still waiting for a command and a map tap would travel (`click_to_cmd`).
  - The guards stay on. Any map tap while Fight is armed disarms it (the pad's red tint and the ARMED lamp go out) and is consumed: it never travels and never aims.
- **A layer open** (a hub, HERE from CONTEXT, a count held past 600 ms). A map tap only closes the layer and is consumed, as today's scrim does (`overlay.js` `syncModal`).

The guards step aside only where a map tap means something else, and there the tap does what it does today:
- at **--More--** (a tap on the glass is Space, as `web.js` does today);
- in **getpos**: farlook, `_` travel, jumping, a polearm, a spell or a thrown object's target (the tap picks the spot);
- while a **menu** or a text window is up.

In those three states a tap anywhere on the map, ring and ghost spots included, passes through; the halo still snaps to keys within 8 dp but swallows nothing beyond.

In a **direction prompt** (Fire, and any pin or place that asks "In what direction?"), the core reads keys only: `web.js` `nextKey()` drops clicks. A map tap therefore does nothing; it neither travels nor gives a direction. The pad answers, and the halo and seams work as in any other state.

**Caseless mode** keeps the guard. The halos, seams and ring are hit areas laid over the canvas, not paint, so the 8–12 dp band swallows whether or not a rim is drawn (§11).

**How often** (`checks/nearmiss.mjs`: thumb taps scattered at σ 2.3 mm, the brief's 95% box, 200,000 taps a key, while a tap would travel; "today" is the current build's keycaps, the player verifier's model):

| | Lucas 896x443 / 443x939 | 412x915 | 390x844 | 360x640 |
|---|---|---|---|---|
| aimed at the pad's inner column, fires the other bank (portrait) | 0.05% | 0.10% | 0.09% | 0.10% |
| aimed at INVENTORY, COMBAT, PIN 2, fires the pad (portrait) | 0.05% | 0.12% | 0.17% | 0.40% |
| the same, landscape | 0.00% | 0.00% | 0.00% | 0.00% |
| aimed at the pad's inner column, travels | 0 in 200,000 | 0 | 0 | 0 |
| ... lands in the ring (a preview), landscape | 0.23% | 0.25% | 0.25% | 0.20% |
| PIN 2 → Take off, FLICK → Remove, LOOK → Swap | 0.52% | 0.76% | 1.1% | 1.3% |
| **inside the action pad:** aimed at COMBAT, fires CONTEXT (today) | 0.53 / 0.52% (0.00 / 0.52%) | 0.79% (0.82%) | 1.08% (1.12%) | 2.57% (1.69%) |
| aimed at FLICK, fires PIN 2 (today) | 0.52 / 0.55% (1.51 / 0.49%) | 0.83% (0.79%) | 1.18% (1.10%) | 2.62% (1.71%) |
| aimed at CONTEXT, fires another action-pad key (today) | 2.06 / 2.04% (0.00 / 2.05%) | 2.84% (3.26%) | 3.70% (4.50%) | 6.68% (6.85%) |
| aimed at COMBAT, hits COMBAT (today) | 92.9% (88.6 / 91.2%) | 90.9% (88.0%) | 89.0% (85.1%) | 83.7% (80.5%) |

- **Cross-bank.** The final had 0.62–1.45% cross-bank at 360 and 0.57–0.60% at 390.
- **The row above the action pad.** Take off and Remove now always ask (`paranoid_confirmation:+Remove`, in twin), so only Swap's 0.5–1.3% acts.
- **Inside the action pad.** With round 1's tiling, COMBAT → CONTEXT was 1.11% on Lucas's phone, 1.68% at 412, 2.33% at 390 and 4.82% at 360. In landscape, today's COMBAT and CONTEXT are not neighbours; the new landscape has the same rates as portrait, by parity.

**The 360 dp trade-off, chosen.**
- **What the width allows.** At 360 dp, 58 dp pad keys (Lucas's default, never scaled) and the 24 dp between the banks (the cross-bank fix, M5) leave the right bank 44.7 dp columns at a 47.7 dp pitch, against today's 53.7. The margins (8) and gaps (3) are already at their floors, so nothing else can give.
- **What it costs.** With the seams, COMBAT → CONTEXT is 2.6% against today's 1.7%. Every other in-bank figure is at or better than today's, and a tap aimed at COMBAT hits it more often than today (83.7% against 80.5%; the rest is swallowed, and the player taps again).
- **The costly outcome is defused.** From CONTEXT the stairs take a second tap (§8), and PIN 2's Fire asks for a direction, which Esc cancels.
- **The way back.** A player who wants a wider right pitch can choose 52 dp pad keys: the right pitch becomes 51.3 dp.

---

## 7. The FLICK key and its bearings

- **Where.** Right bank, row 2, middle: 33.6 mm @ 58° from the right corner in both orientations. That is its portrait place today. It never changes thumb.
- **What it does.** Tap: its macro. Two flicks keep today's screen bearings: −85° (up, Kick by default) and −40° (up and to the right, the second flick macro).
- **Why the bearings stay screen-fixed.** The key never changes thumb, so one stroke is always the same thumb motion. For the right thumb, up is a reach (37° off the key's radial line) and up-right is a sweep toward the edge (82° off it). Those are two distinct motions. Up-right also lies on the NE–SW diagonal the brief rates fastest for a right thumb. It is exactly the motion Lucas's thumb learned in portrait.
- **Wedges.** They split at −62.5°: up covers −125° to −62.5° and up-right −62.5° to 0°, each 62.5° wide, above the 60° floor. Any other direction cancels.
- **Recognition.** By the angle of the whole stroke from touch-down to lift, with today's minimum travel, `FLICK_MIN` 26 dp, and no maximum. (The final proposed 14 dp; a wobbly tap would then become a Kick.)
- **The legend.** While the thumb strokes, a two-node legend (↑ Kick, ↗ second macro) shows at the map's edge nearest the key: the right edge at FLICK's row in landscape, the bottom edge above FLICK in portrait. The node the stroke points at lights up. While FLICK is **held** and while a flick macro is **being assigned**, the nodes are also targets: hold one with the other thumb to edit its macro, tap one to assign, as today's radial nodes are. They lie inside the map, never over a key; in the spec they are the two pop-ups owned by `flick`.
- **Mirrors.** The left-handed setting mirrors the bearings to −95° and −140° with the key. With `combatThumb: 'L'`, FLICK goes to the left bank and keeps −85° and −40°, today's landscape motion.
- **Edges.** The stroke starts at least 55 dp from the side edge (FLICK's keycap edge, 78 dp to its centre) on every phone and key size, and 84 dp (113 to the centre) on Lucas's phone: well clear of Android's back-gesture strip.

---

## 8. Where layers paint

Every layer paints on the movement pad, which is identical in both orientations. So a layer place is the same thumb motion everywhere. Nothing pops over a key: the layer's name pill draws inside the map, in the corner nearest the pad (a checked pop-up in the spec, owned by `pad_centre`).

| trigger | the pad becomes | how you pick | when it closes |
|---|---|---|---|
| hold COMBAT, INVENTORY, EAT, APPLY (right) | the hub's nine places; centre = ALL (its drawer), as today | chord: keep holding, tap the pad with the left thumb; or let go and tap | after a pick, a map tap, 4 s idle |
| hold DROP (left) | DROP's nine places | let go; the layer stays up; tap | as above |
| hold REST (left); hold SEARCH or a counted CONTEXT (right) | **counts**: ↖ ×1, ↑ ×5, ↗ ×10, → ×20; centre: type any count; the current count lit | slide to a place, or chord with the other thumb | **on lift**, unless the hold lasted 600 ms or more; then sticky, as above |
| hold Long rest, once swiped in from REST | its counts: ↖ ×100, ↑ ×200, ↗ ×300, → ×400 (today's `LONG_COUNT_CHOICES`) | as the counts | as the counts |
| hold the pad centre (left) | **HERE**: ↑ Ascend `<`, ↓ Descend `>`, ← Open, → Close, ↖ Sacrifice, ↗ Pick up, ↙ Loot, ↘ Look here; centre ALL (Chat, Drop unknown…). Places that do not apply this turn are dimmed, never re-ranked; a tap or a slide-and-lift onto a dimmed place does nothing (swallowed, with the tick). | **slide only**: slide from the centre to a place and lift | lifting without a slide closes it |
| tap CONTEXT when one action applies (right) | nothing: the action runs at once, except **Ascend and Descend**: the first tap lights the pad **centre** with them (their word, their arrow in its corner), dims the rest and names them in the pill | a second tap on CONTEXT or on the lit centre within 2 s; ↑ and ↓ themselves only put the stairs away | after 2 s, any other tap, a map tap |
| tap CONTEXT when several actions apply (right) | HERE, as above; **↑ Ascend and ↓ Descend take a second tap**: a tap on ↑ or ↓ lights the centre with them for 2 s (in place of ALL) and names them in the pill; a second tap on ↑ or ↓ only ticks | let go and tap, or chord; the stairs go from CONTEXT or the lit centre | after a pick, a map tap, 4 s idle |

- **What this replaces.** The count-chip rows, the pad-centre radial and the CONTEXT candidate fan. On today's portrait these covered up to 13 keys.
- **Why slide-only from the pad centre.** The centre's tap is the one-turn rest or pick-up a player taps repeatedly; a slow press on the stairs that left a sticky layer up would turn the next step south into Descend. Slide-only means the pad is arrows again the moment the thumb lifts. CONTEXT's HERE stays up to be tapped.
- **Why the stairs take a second tap from CONTEXT** (round 2). CONTEXT sits next to COMBAT, whose tap is always followed by a pad tap. A near miss onto CONTEXT, 0.5% on Lucas's phone and 2.6% at 360 dp (§6), would descend on bare stairs, or open a sticky HERE whose ↓ the aiming tap would hit: P4's failure by another road. So from CONTEXT, Ascend and Descend take a second tap, whether CONTEXT has one action or several, and that tap is CONTEXT's or the pad centre's, never ↑'s or ↓'s: COMBAT's tap is always followed by a tap of the pad that aims, and with the second tap on the lit ↑ or ↓ that aiming tap was the confirmation (the layers stage's review, 3 October 2026). The centre is the one place no aim uses. Every other place either asks (Open, Close, Loot, Sacrifice), shows (Look here) or costs at most a turn (Pick up). A deliberate descent costs one more tap; the pad-centre slide still descends in one gesture.
- **Why counts close on lift.** An accidental 360 ms hold of SEARCH left a count layer that swallowed the next walking tap as "×5". A short hold now closes on lift; a deliberate one (600 ms) stays to be tapped.
- **Safety.** A place that asks for a direction hands the pad straight back as arrows. Pray is on no layer.
- **Long rest.** Swiped up out of the REST slot (Lucas, 2026-10-02), as in the final.

---

## 9. Drawers

- **Columns.** Three columns on every screen and in every orientation. That is today's portrait count; landscape's four go. Items keep their row and column after a rotation, and between phone, tablet and desk.
- **Size and place.** min(420, map width − 12) dp wide, at most 352 dp tall (it scrolls), bottom-anchored and centred in the map area: 420×274 on Lucas's phone in both orientations, between the banks in landscape and above them in portrait, never over a key. A usable layout always has room for it: at least 200 dp for three columns and 88 dp for two rows of 44 dp items. A window that cannot hold it has nowhere to open MENU, so `layout()` calls it unusable and the page shows classic (§12).
- **What carries over.** The drawer's grid is identical in both orientations, but its place on screen follows the map. Drawers are for finding a command, not for blind taps, so that is accepted.
- **Closing.** For 200 ms after a drawer closes, map taps are swallowed (§6).
- **Desk.** An item's own key, typed, closes the drawer and goes to the game, which runs it; the items with no key of their own take 1 to 9, shown while the key letters are (Lucas, 2026-10-07; the design had number keys for every item, and drawers hold up to 31).

---

## 10. Lamps, messages and status

- **Lamps move onto what they describe.**
  - SEARCH (search mode) lights a bar on the SEARCH keycap.
  - ARMED lights the key that armed (COMBAT or a pin), and the pad tints red as today. A map tap while Fight is armed disarms it and is consumed (§6).
  - MORE sits at the right end of the message band.
- **What goes.** The hood and the lip with its lamps and nameplate. The nameplate moves to the MENU screen's title; skins may engrave it on a well.
- **Header.**
  - **In the glass, stacked**, on phones: messages over the status lines, at the top of the map's glass, 12 dp clear of the banks. That is the shape the web's `#glass` and Android's `RhScreen` already have.
  - **Side by side** when the glass is at least 818 dp wide (tablets in landscape, the desk): messages on the left (at most 960 dp, about 110 characters), status on the right (at least 412 dp, today's width).
  - **Over the banks** only when it shows more of the level than the header in the glass would (or with `mapCell: 'rows'`, whenever it fits), side by side across the screen from 4 dp inside the safe edges, and 12 dp clear of every key.
- **Message rows.** Lucas's settings: 2 in landscape, 3 in portrait. Screens under 800 dp tall get at most 2. Spare height adds rows up to 4, then HP and Pw bars under the status lines, then a message log under the map (60 dp or more of spare). On tablets, 120 dp or more of spare becomes the message log first. Tapping the message band opens the history, a second route beside MSGS.
- **Text size is an input to the rule.** A message row is the build's x-height, divided by the face's x-height ratio (Atkinson Hyperlegible Next 0.496, VT323 0.400), × the Message size (0.85–1.4) × the system's text size (clamped 0.8–2, as `overlay.js` `osTextScale()` clamps it) × 1.35 leading. The x-height is the web's 9.5 CSS px (Lucas, 2026-09-28, `overlay.js` `MSG_X`) or Android's 10 dp; each build passes its own. That gives 25.9 dp at the web's defaults (27.2 at Android's) and 89.8 dp at VT323 × 1.4 × 2. The status band is 48 dp × the system's text size. `textMetrics({msgFont, msgSize, textScale, xHeight})` returns both, and `layout()` takes them as `msgRowH` and `statusH` (or `text: {...}`). Larger text re-lays out, identically in both orientations: it never puts a band over a key. It first gives up spare rows, then the cell shrinks toward 12 dp, then message rows go (down to 1). Only at twice the system text size with large message text (Atkinson × 1.4, or VT323 × 1.2 or more) is the portrait glass of a 360x640 phone under 120 dp, and the result is marked degraded (still usable: the drawer fits, so the page draws it).
- **The status is always visible** and never drawn over the map.

---

## 11. The map

- **One cell per device.** It is decided on the device's landscape geometry (with the remembered landscape side insets) at 58 dp keys, and used in both orientations and at every key size:
  - **phones, `mapCell: 'columns'` (default):** the cell that shows at least 34 of the level's 80 columns in landscape (today's count on Lucas's phone) where the 12 dp floor allows, with all 21 rows where they fit: T = clamp(min(landscape map width / 34, landscape map height / 21), 12, 20). That is 13.4 dp on Lucas's phone, 13.9 on 412-class phones, 12.8 on 390-class phones and 12 at 360. The floor binds where the landscape map is under 408 dp wide: the 360 class shows 23 columns. With Android's text cell (0.5625 as wide) the rows bind first: 15.35 dp, 52.8×21 in landscape.
  - **phones, `mapCell: 'rows'`:** the earlier rule, the cell whose 21 rows fill the landscape map, 12–20 dp (17.8 dp on Lucas's phone, 25.6×21), with the header over the banks whenever it fits.
  - **tablets:** the whole-level cell when it is 12 dp or more (cap 24), else the phone rule. No tablet reaches the cap (1920x1080 shows the level at 23.5 dp). On a monitor's window, a tablet while desktop mode is deferred, the cap rises where a 24 dp level would leave strips wider than a panel (240 dp) beside it: over the next 160 dp of width it moves to the cell that fills the width, which it then follows, up to 48 dp (2560x1440: 31.5 dp; 3440x1440: 42.5). It rises with the width, never at once. A window in portrait keeps the cell no larger than a level as wide as its own glass, and never under 24 dp, so a monitor turned to portrait shows as many columns as 24 dp would (1440x2560: 60).
  - **choosing the glass:** the candidate showing the whole level wins. Next comes one showing all 21 rows, which here means within half a row (at most a half-row pan), and it wins only while it shows at least 70% of its rival's cells (960x600: 714 against 993, 0.72). Then the most cells; on a tie, the header in the glass, then the bigger cell. Round 1 ranked the 21 rows strictly first, and on foldables and split views that picked a 120 dp column over a full-width map short by 0.03 of a row.
  - **smaller keys never show less:** when the ranking's own pick at 46 or 52 dp keys would show fewer cells or less map than the next larger key size, the larger size's glass (its kind and its message rows) is used. Smaller keys never make the bank stand taller, and never push the header over the banks lower. Checked on 1,061,627 non-degraded windows and by sweep §2.
  - **a map that does not show the whole level stops at its 80 columns:** the map area is never wider than the level.

  A rotation never changes the glyph size or the rows. On Lucas's phone, landscape shows 34×21 tiles and portrait 32×21.
- **Zoom.** In twin banks, pinch stores a factor of the device cell, not a pixel size, so it carries across windows and is shared by both orientations. It is twin's own prefs key, `zoomFactor`, starting at 1×. It is deliberately not seeded from classic's `zoom`, so the first twin session shows the default cell that test 5 compares. Classic keeps `zoom` in CSS px, read by today's `tileSize()` and clamped 8–96 by its pinch and wheel handlers, and twin never writes it. The web writes the factor on lift, not on every move.
- **Panning** (Lucas, 2026-09-27). At rest the view follows the hero as `placeView` does today: centred along an axis where the level fits, kept to the level's edges where it does not. A drag moves the map along either axis, even one that fits, as far as the finger goes, until the hero moves; then it snaps back. The view locks and centres only at rest.
- **Overview.** Two fingers that land and stay within 10 dp of where they landed for 250 ms show the whole level fitted to the map area (5.7 dp on Lucas's phone) until they lift. A change in their spread of more than 12 dp first makes it a pinch instead.
- **Edge tells.** A monster just outside the panned view puts a small marker on the map's nearest edge. The web starts with any non-pet monster (the glyph data carries `MG_PET` but no hostility); a hostile flag from the window port can follow.
- **Big screens.** The whole level whenever its cell would be 12 dp or more: up to 24 dp on tablets, and on a monitor's window up to 48 dp as the strips beside it close (above); whole device pixels on the desk, up to 32 px wide (48 px for tiles on 21:9 and wider). Non-integer multiples of the 16 px tiles are drawn with a sharp filter (nearest-neighbour up to the next whole multiple, then a smooth downscale). What the level does not need becomes panels in a fixed order: message log, inventory, key legend. They are copies; no key moves for them.
- **The web's tap drift (audit §4.5) is fixed.** Drawing, placement and hit-testing all use one cell, `T_css = floor(T × dpr) / dpr`.
- **Caseless mode** keeps every rect. The wells and bezel are not drawn, and the map may draw dimmed under the halos as context. The halos, seams and ring stay hit areas over the canvas, so the guard works the same (§6). The hero-safe area stays the map area. Toggling the case is a repaint, not a rebuild, so it cannot drop an armed Fight or an open drawer.

---

## 12. What the web detects, and input modes

| signal | read with | used for |
|---|---|---|
| window size | a ResizeObserver on the root, sized in `svh` | W, H. `visualViewport` only lifts the text forms over the soft keyboard; it never re-lays out the keys. |
| the budget | the portrait width, landscape height and landscape width seen, and the landscape side insets, remembered per device **and per display mode** (`display-mode: browser / standalone / fullscreen`, and the Fullscreen API's state) in `localStorage` | `layout()` takes `budget: {w, h, l}` and `sideInsets: {l, r}` so both orientations get the same banks and cell. First visit in portrait: the landscape height is estimated as the short side minus the bars (screen.height − innerHeight), the landscape width as the long side. It re-fits at most once, after the first rotation, never under a finger. A window narrower than `budget.w` or shorter than `budget.h`, in either orientation, lays out without it. |
| size class | W and H against 600 / 480 dp, ±24 dp hysteresis | tier |
| touch available | `any-pointer: coarse` or `maxTouchPoints > 0` | start with thumb banks |
| input in use | `pointerType` on every `pointerdown`, `keydown`, wheel, all listened for **in the capture phase** on `window` (every key handler stops propagation on `pointerdown`) | the state machine below |
| density | `devicePixelRatio`, a `resolution` media query listener | whole-device-pixel cells |
| safe areas | `viewport-fit=cover`, written into the viewport meta only while the layout is twin (classic keeps today's meta, which pads for no safe area), plus a probe element padded with `env(safe-area-inset-*)` | §13 |
| text size | `msgFont`, `msgSize`, `osTextScale()` | `textMetrics()` → `msgRowH`, `statusH` |
| orientation | W > H only (a square window is landscape) | the glass choice |

Never used to decide: the user agent, `pointer: coarse` alone, `hover` alone.

**The device report** (Lucas, 2026-10-06; CHANGES). Everything in this table that the page can read, and what it decided from it, goes into one line at the end of Settings (`viewer.js` `deviceReport()`, from `overlay.js` `deviceFacts()`), with the browser and system named coarsely for the reader. A player shares or copies it and sends it to Lucas; the page sends nothing by itself.

**The input-mode state machine** (from size-classes, in `viewer.js`):
As built on 2026-10-07 (`input.js`, a module of its own; CHANGES, "Desktop mode is built", with Lucas's answers):
- A touch or pen `pointerdown` asks for thumb mode. While the desk shows, that touch does nothing else: it is consumed (no desk key, no travel, no panel), and the thumb banks come at its lift, never held back by the 3 s rule (answer 3b; the design had the touch act in the current layout).
- Two mouse clicks (or wheel use) within 10 s, with no touch for 5 s, ask for desk mode, not within 3 s of the last switch. Typed keys alone never move the board where touch is possible: three game keys in 10 s only turn on the key letters (answer 3a; the design had that for phone-tier windows only). Where no touch is possible the page starts at the desk, and three keys ask for it there.
- A switch to the desk is applied only when nothing is busy: no pointer down, no open layer, drawer, --More--, menu or form, no assignment in progress, no question on the pad, no spot being picked, **no text input focused**. Armed Fight is kept across it.
- Rebuilds keep armed state and open layers, because control ids are stable. `resetState()` runs only when a control disappears.
- The mode is remembered per browser (and per channel). A setting overrides it: "Controls: automatic / thumb banks / mouse and keyboard". "Docked", the desk arrangement at touch size, and "hide the dock" are postponed (answer 9).
- The near-miss guard is for thumbs: the desk's dock has none, and on the thumb banks no part of it acts on a mouse's click.

**The layout setting** (Lucas, 2026-10-02). MENU → Settings gains "Layout: twin banks / classic", prefs key `layout: 'twin' | 'classic'`, default `'twin'`. Classic is today's overlay, unchanged, and stays the fallback. Twin's own changes stay out of classic's way: the zoom factor (`zoomFactor`, §11), `viewport-fit=cover` and the `paranoid_confirmation` line (§16) apply only while the layout is twin.

What the page does with each `layout()` result, while the setting is twin:
- **Usable, not degraded:** drawn as specified.
- **Usable and degraded** (`fit.degraded`; for instance 46 dp keys on a 336 dp short side, or 40 dp right columns): drawn as given. `layout()` guarantees that every key is on screen and on no other key or the map, that no band or panel covers a key, that the map shows at least 8×8 cells, and that the drawer fits. Only sizes fall under the rule's floors. The Layout setting shows the first reason in one line, never as a pop-up.
- **Unusable** (`usable: false`, `fit.level: 'unusable'`), or no spec at all (something threw): the page shows classic for this window, without changing the setting. Twin comes back at the next re-layout whose result is usable. Today that happens on near-square windows: Lucas's phone in split screen (443x460), squares under about 650 dp, and windows under about 300 dp on a side. No real phone, foldable, split view or tablet in the verifiers' lists is unusable; the sweep's sections 7 and 10 count 2,715.

**Desk keys.** Each key shows its keyboard key: the pad shows `y k u h . l b j n`, COMBAT `F`, SEARCH `s`, INVENTORY `i`, EAT `e`, APPLY `a`, DROP `d`, the equipment `W P w T R x`, LOOK `:`, MSGS `^P`. Rolehack's own features sit behind one prefix, **Ctrl+;**, the key right of L, matched by `KeyboardEvent.code` (`Semicolon`) whatever the layout prints on it. It is configurable (Settings: Ctrl+; Ctrl+' Ctrl+\). As built, a key keeps its word and shows its keyboard key in the corner, the game's own where there is one (SACRIFICE `M-o`, REST `20.`, a pin its own key) and else the prefix and a letter, written `^;` as NetHack writes Ctrl (Lucas, 2026-10-07).
- **Why not Ctrl+Space.** Ctrl+Space switches input sources on macOS and ChromeOS, and so do round 1's replacements: Control-Option-Space on macOS and Ctrl+Shift+Space on ChromeOS.
- **Why Ctrl+;.** It is on none of the published ChromeOS, macOS or Windows shortcut lists we found. Japanese input methods use it only while composing in a text field, which the game page is not.
- **The game never had it.** Ctrl+; makes no control character; `web.js` `keyCode()` passes it to the game as a plain `;` (farlook), and the prefix takes it before that.
- **Before shipping,** test 7 confirms it on each target OS.

| after the prefix | does |
|---|---|
| `1` `2` `3` | M1 M2 M3 |
| `4` `5` | PIN 1, PIN 2 |
| `f`, `k`, `u` | FLICK tap, flick ↑, flick ↗ |
| `m` `o` `g` | MENU, WORLD, GAME drawers (WORLD was `w`: a browser tab cannot stop Ctrl+W, and the key after the prefix may come with Ctrl still held) |
| `c` | CONTEXT (the HERE layer when several apply, or when none does) |
| `z` | Long rest |
| a hub's letter (`F i e a d`) | paints that hub's layer on the dock's pad; vi-keys, the arrows or Home, End, PageUp, PageDown pick a place, `.` opens ALL |
| `x` | the count layer for the last counted key (was `n`: a tab cannot stop Ctrl+N either) |

The key after the prefix is read as typed, so `f` and `F` differ; KEYS (the soft keyboard) has no letter. Holding Ctrl alone for 0.4 s shows every legend. "Hide the dock" is postponed (Lucas, 2026-10-07).

Android (later): `Configuration.smallestScreenWidthDp` is not the view's size; the budget comes from `onSizeChanged` (Android, later).

---

## 13. Safe areas and system edge gestures

- **Lucas's phone (Android, native fullscreen).** The banks sit 18 dp from the edges. Android currently letterboxes a fullscreen window away from the cutout (no cutout mode is set), which is why landscape is 896 wide against portrait's 939: Android, later (SHORT_EDGES and a measurement).
- **Android cutouts (`avoidCutout`).** A side cutout's depth counts only beyond the margin that already clears it: the side margin becomes max(margin, depth), in both orientations (parity; portrait width pays, first from the right bank's columns). It never enters the bottom offset. On Lucas's phone a 24 dp cutout moves the banks in by 6 dp; on a 360 dp phone it steps the pad to 46 dp; a 30 dp cutout at 360 narrows the right columns to 41 dp (degraded, with the reason).
- **iPhone, web: `anchor: 'auto'`.**
  - Physical corners, except that in landscape the side safe-area insets are honoured: the outer column moves to the inset, counting the margin it already has (47 dp inset with an 8 dp margin: 39 dp further in).
  - Why: at an 8 dp offset the notch or Dynamic Island, mid-edge in landscape, would cover part of ↖, MSGS and GAME (the outer column) on one side.
  - The cost is the one known parity break: on notched iPhones the landscape banks sit 6.2–8.1 mm inward compared with portrait (`checks/tab.mjs`: iPhone 14, 15 and 15 Pro Max, 0 of 36 trained taps under `auto`, 36 of 36 under `anchor: 'physical'`).
  - The header goes over the banks only on the width left between the insets, so the safe areas never stack it onto the keys (the final's blocker).
  - A setting offers "physical corners" for players who prefer parity and accept a partly covered outer key. The brief's test 6 should settle the default.
- **Bottom insets** (the home indicator) are ignored for the banks under `auto`. The bottom row takes only taps; an upward swipe from the very edge still goes home.
- **`anchor: 'safe'`** honours the bottom inset too. With grip lift, the inset's share and the lift are clamped together against the window, so no key ever leaves the screen. On an iPhone 12 mini in landscape with 40 dp of lift, REST was at y −7 in round 1 and is at 4 now. `safe` already gives up parity, so the clamp may differ between orientations.
- **Android Back** (inward swipes from the side edges):
  - Every sideways drag starts at least 55 dp from a side edge on every phone and key size (FLICK's keycap edge at 360 dp wide; 78 dp to its centre), 84 dp on Lucas's phone (113 to the centre). The pad-centre slide starts at least 63 dp in.
  - REST's swipe to Long rest starts in the outer column, but it is vertical, and Back ignores vertical swipes.
  - `setSystemGestureExclusionRects` covers the two 190 dp pad blocks, within Android's 200 dp limit (Android, later).
- **The text bands** always pad by the safe insets.
- **The desk** (a mouse and keyboard, §4) lies within them as a whole. Every part of it keeps at least 2 dp from every edge (the glass 2, the header and panels 4, the banks 12), so an inset counts only beyond those 2 dp. The desk is laid out in the window less the rest, and moved in by it (2026-10-08).

---

## 14. Design rules

**Kept.**

| rule | how |
|---|---|
| never move a control with motor memory between orientations | by construction: 0 switches, 0 moves, 36 of 36 on every pair, with a 3 dp margin; also at 46/52/58 dp, left-handed, combat-left, text cells, `mapCell: 'rows'`, with cutouts, grip lift, any text size, on uneven pairs with the budget, and in a browser tab; the hit model resolves the same over every bank and halo |
| never reflow by game state | faces change label, never place; the HERE layer has fixed places; panels never move keys |
| movement keys 46/52/58, default 58; 46 dp floor holds at 640x360 | the pad is outside any scale: 58 dp at 640x360 (today 43.6); it steps down only on a short side under about 358 dp, never under 46 unless marked degraded; pad gap ≥ 3 dp (pitch ≥ 61 at 58 dp keys) |
| flick wedges ≥ 60°, ≤ 6 directions | two wedges of 62.5° |
| layers, not fans: nothing pops over keys | every former fan is a pad layer; the flick legend, the layer name pill and the drawer lie inside the map, which no usable layout lets touch a key; 0 pop-ups over keys in the sweep's sections 1 and 3–9 |
| Pray off layers; SACRIFICE/PRAY out of easy reach | SACRIFICE is the left bank's farthest cell, 61.8 mm (today 47–53 mm); Pray is its 380 ms hold (Lucas) with the game's y/n |
| SEARCH on the thumb that is not walking | right bank, 19.4 mm |
| all skins and caseless keep working | the geometry is skin-independent; caseless drops the wells and bezel only; the toggle is a repaint |
| phones 640 to 915 dp wide | the sweep covers phones 344 to 997 wide, foldables and split views, dense grids of windows (480–1000 × 600–960, 1000–2000 × 320–480, every near-square window 320–520), and short sides down to 200; a window with no room for twin banks and a map gets classic |
| other touch targets ≥ 44 dp | smallest 44 dp (the strip, the right columns at 360); under 44 only when marked degraded |
| Long rest behind REST, swiped out | swiped up (Lucas, 2026-10-02); its counts on a hold |
| an empty pin is a picker | its tap opens the picker (Lucas, 2026-10-02) |
| the map can always be dragged | along either axis, even one that fits (Lucas, 2026-09-27); it locks only at rest |

**Bent, knowingly.**
1. **Count-chip rows are gone.** Counts are a layer on the pad instead of a 236 dp row above the key. In a 3×6 bank, nothing above SEARCH or CONTEXT is free of keys. The layer is the owner's own "layers, not fans" grammar, covers nothing and sits 10–40 mm from the corner. The owner's rule is kept in spirit (counts open over no live key), not in letter.
2. **Drawers keep their grid, not their screen place,** between orientations (§9).
3. **On notched iPhones in a browser, the landscape banks sit 6.2–8.1 mm inward** (§13).
4. **Switching between thumb and desk modes moves keys** (58 → 40 dp, corners → dock). It follows a sustained change of input device, not a rotation, and the arrangement is unchanged. Since 2026-10-07 also: a mouse window too short for the dock (about 440 to 490 dp tall, by its width) gets the thumb banks, and the dock again 24 dp taller (Lucas's answer 4).
5. **On short sides the pad steps down** (58 → 52 → 46, under about 358 dp with 58 dp keys), so a 640x336 window that never shows portrait still gets 46 dp keys. The remembered budget keeps 58 where the portrait width allows it.
6. **The right bank's columns pay for the 24 dp gap.** At 360 dp they are 44.7 dp wide at a 47.7 dp pitch (today 53.7); with 46 or 52 dp keys they narrow before the margins and pad gaps do, as asked. The cost is inside the action pad: COMBAT → CONTEXT 2.6% at 360 against today's 1.7%, even with the 8 dp seams. Its costly outcome, a change of level, now takes a second tap (§6, §8).
7. **Android's Control scale setting no longer scales keys.** It scales text instead (Android, later).
8. **Portrait gets 4 message rows and a log on Lucas's phone,** from height the level cannot use.
9. **The header over the banks is rare.** Landscape phones leave the corners over the banks empty (10.2% void on Lucas's phone, today 10.7%) rather than squeeze keys for text.
10. **Near-square windows get classic.** A window with no room for twin banks and a map that shows 8×8 cells and holds the drawer (Lucas's phone in split screen, squares under about 650 dp) shows classic until it grows (§12). The layout setting stays twin.
11. **From CONTEXT, the stairs take two taps** (§8). Today's CONTEXT descends on one tap on bare stairs; the pad-centre slide still does it in one gesture.

---

## 15. What Lucas must relearn

Against **today's landscape**, measured in each control's own thumb frame on his phone (unchanged from the final; v2 moves no key on his phone):

| change | controls |
|---|---|
| **change thumb (6)** | FLICK L→R (47.9 mm mirrored), PIN 2 L→R (31.9), COMBAT L→R (17.8); GAME R→L (18.8), MENU R→L (17.7), WORLD R→L (10.1) |
| **move > 10 mm on the same thumb (9)** | LOOK 62.8 (deck → action pad), INVENTORY 50.9 (top bar → bottom-inner key), M3 41.1, MSGS 33.5, CONTEXT 31.0, M2 27.9, SACRIFICE 21.1, KEYS 15.0, REST 10.8 |
| **move under 10 mm** | EAT 8.3, M1 7.8, SEARCH 7.5, DROP 5.2, APPLY 4.4, the six equipment keys 3.3, PIN 1 1.3 |
| **unchanged** | the nine pad keys, 0.0 mm |

The combat trio and LOOK/CONTEXT move because today's deck has no place in portrait. Any parity layout must move them; the question is only where. Here it is today's portrait spot for every one of them.

**Today's landscape tap spots on the new layout** (`checks/transfer.mjs`, with the hit model): 18 of 36 still fire their key.
- **Five old deck spots land on the map:** COMBAT, PIN 2, FLICK, LOOK, CONTEXT. The ghost deck previews there and points to the new place; a second tap on the same cell acts.
- **Seven land on another key:**
  - old M3 → COMBAT. This arms Fight, the one that matters. The pad turns red and ARMED lights on the key, and a second tap on COMBAT disarms. Move whatever is on M3 before switching, and watch for it in the first sessions.
  - old SACRIFICE → REST (a ×20 rest, interrupted by any monster);
  - old INVENTORY bar → KEYS (the soft keyboard; the strip order was chosen so this is not a macro);
  - old M2 → PIN 2 (Fire, which asks for a direction);
  - old SEARCH → INVENTORY (a view);
  - old EAT → LOOK (free);
  - old M1 → WORLD (a drawer).
- **The other six** (REST, MSGS, KEYS, GAME, WORLD, MENU) land above the banks, where nothing answers now that the header sits in the glass.

**What does not change from today:** Pray is still a 380 ms hold of the key that offers; T and R now always ask which item (they asked whenever two items applied).

**Two habits from today that now land elsewhere** (`../../verify-v2-work/popups.mjs`, `checks/transfer.mjs`). Both are guarded while the ghost deck is active (§6, item 8).
- **The pad-centre radial.**
  - Today: hold the pad centre, lift, then tap a node.
  - v2's HERE is slide-only and closes on lift, so the habitual tap lands on whatever now lies under the old node:
    - landscape: Attack → M1 (a macro), Pick up → PIN 1 (the picker), Descend → the ring (a preview), Look here and Chat → the map (travel);
    - portrait: Attack → M1, Pick up → PIN 1, Descend → PIN 2 (Fire), Look here → COMBAT (arms Fight), Chat → INVENTORY.
  - During the switch, a hold that lifts without a slide flashes "HERE: slide", and for 1.5 s a tap on those five spots is swallowed.
  - The new motion is one gesture: hold, slide to the place, lift.
- **Pray on the old SACRIFICE spot.**
  - Today: hold SACRIFICE for 380 ms, then answer y on ↖.
  - In landscape that spot is now mostly REST. Its 360 ms hold opens the count layer, which closes on lift, so the habitual y on ↖ walks the hero north-west, perhaps at low HP. In portrait the spot is GAME, whose tap opens its drawer; once the drawer is put away, the y walks the same way.
  - During the switch, a hold of 380 ms or more there flashes an arrow to SACRIFICE, and the next pad tap within 1.5 s is swallowed. A hold that set a count, slid REST's strip or opened a key's own editor or layer is left alone (§6, item 8).
  - SACRIFICE is the left bank's top inner key (61.8 mm), and Pray is still its 380 ms hold.

Against **today's portrait** the change is small. One thumb switch (GAME R→L). Five moves over 10 mm: MSGS 23.0, SACRIFICE 22.6, WORLD 17.0, M2 15.2, MENU 10.8. All of the action pad, the equipment and the pad are unmoved. 30 of 36 portrait tap spots still fire their key, all 18 tier-A keys among them. The misses are MSGS → WORLD, MENU → SACRIFICE (an offer prompt), WORLD → swallowed, GAME → M2 (a macro, if one is set), M2 → KEYS and SACRIFICE → GAME.

**With `combatThumb: 'L'`** there are no thumb switches for the combat trio against today's landscape. But COMBAT, FLICK and PIN 2 still move 46–59 mm (to 47–55 mm from the corner, above the prompt row), because the deck is gone. They also switch thumb against today's portrait. It saves no relearning and costs reach, which is why it is not the default (§17, Q3).

---

## 16. Implementation sketch (web)

The web port is built first, behind the "Layout: twin banks / classic" setting, default twin. Classic stays as it is, as the setting's other value and as the fallback. Nothing twin adds reaches classic: the zoom factor has its own prefs key, `viewport-fit=cover` is written only for twin, and the `paranoid_confirmation` line is appended only for twin.

**The shared rule.**
- `layout.js` goes into `win/web/` as it is: a plain module, imported by `overlay.js`. Add it to `build.sh`'s `cp` list and to `sw.js`'s `FILES`, or the installed app breaks offline.
- Golden fixtures: this folder's `spec.json` and `variants/*.json`. `checks/sweep.mjs` is the CI gate (node, no dependencies).

**`overlay.js`.**
- Before the first `layout()` while the layout is twin, write `viewport-fit=cover` into the viewport meta; switching to classic removes it. If a browser ignores the change at run time, the switch takes effect at the next load.
- `rebuild()`: read the size from the `svh` root, the budget for this display mode, the side-inset probe, the input mode and the text metrics (`textMetrics({msgFont, msgSize, textScale: osTextScale(), xHeight: MSG_X})`, the page's own 9.5), call `layout()`. If the result is `usable: false`, or there is no spec, keep or bring back classic for this window (§12). Otherwise place every key absolutely in CSS px from `spec.controls`. Drop the `scale()` transform (`overlay.js:385–393`), `needW`/`needH`, `FIT_FLOOR` and `/this.s` in the flick (`:2139`).
- Compare the output signature: if only the glass changed, move the glass and panels; otherwise re-place the keys and keep the state (snapshot and restore around the old `resetState()` first). Never while a pointer is down or an input has focus.
- Each key element's box is its hit cell, with the keycap drawn inset. On the action pad the seams between keycaps (the drawn gap, at least 8 dp) are swallow strips. A halo div per bank snaps within 8 dp and swallows 8–12 dp. Both act whenever a tap would travel, Fight armed included (§6). `overlay.armed` is readable by `web.js`.
- Layers: COUNT (close on lift unless held 600 ms; Long rest's ×100–×400 on a hold) and HERE (slide-only from the pad centre, sticky from CONTEXT). From CONTEXT, Ascend and Descend take a second tap, on CONTEXT or on the lit pad centre, whether they are its one action or in its HERE; ↑ and ↓ themselves only put the stairs away. A dimmed place swallows. Remove the chip rows, the context radial and the candidate fan. The layer name pill inside the map.
- FLICK: `FLICK_MIN` stays 26, wedges at −62.5° (`FLICK_ARC_SLACK` to match); the legend nodes are targets while held and while assigning.
- Pray stays on the 380 ms SACRIFICE hold. PIN 2 defaults to Fire. Long rest swipes up out of REST. An empty pin's tap opens its picker.
- `data-tier` and `data-input` attributes; the Ctrl+; prefix (by `KeyboardEvent.code` `Semicolon`, taken before `keyCode()` turns it into `;`); the legends.
- The ghost deck's habit guards while it is active: after a pad-centre hold that lifts without a slide, and after a hold of 380 ms or more on the old SACRIFICE spot (§6, item 8).
- `prefs.js`: `layout: 'twin'` (and `'classic'`), `mapCell: 'columns'`, `gripLift: 0`, `anchor: 'auto'`, `ghostDeck` (sessions in a row with no catch, this session's turns and last input time), `zoomFactor: 1` (twin's zoom, a factor of the device cell; not seeded from `zoom`). Classic's `zoom: 0` (CSS px) stays as it is and twin never writes it.

**`web.js`.**
- `layoutGlass()` takes the map area, bands and panels from the spec. The bands stay in `#glass` (the header is stacked in the glass on phones).
- `tileSize()`, in twin, returns the device cell × `zoomFactor`; in classic it stays today's code (`zoom` in px when above 0, else fit the rows). The pinch and wheel handlers write `zoomFactor` in twin and `zoom` (clamped 8–96) in classic, as today. `placeView()` and the tap handler use `T_css = floor(T × dpr) / dpr` (the tap drift). `placeView` keeps Lucas's 2026-09-27 rule: centred or clamped at rest, a drag free along either axis.
- `glassGestures()`: in its tap path (`up()`, `web.js:425–433`), whenever a tap would travel, which is whenever the core waits for a command:
  - the confirm ring, the 120 ms ring rule after a key lifts, the 200 ms after a drawer, modal or menu closes, and the ghost deck's preview;
  - with Fight armed (`overlay.armed`), a map tap disarms it and is consumed, never pushed as a click;
  - with a layer open, a map tap closes it and is consumed, as today's scrim does.

  At --More--, in getpos, and in menus or text windows, taps pass as today. In a direction prompt `nextKey()` keeps dropping clicks. The two-finger overview (10 dp / 250 ms; a pinch beyond 12 dp of spread) and the edge tells; the zoom is written on lift.
- `perm_invent` on and `WIN_INVEN` routed to the inventory panel where the layout has one (`web.js:1667–1669`; `winshim.c` already repopulates it).

**`viewer.js` (new).** The input-mode state machine (capture-phase listeners), the size classes with hysteresis, and the budget memory per display mode.

**`index.html`, `manifest.json`, `rolehack.css`, `web.js` `start()`.**
- `index.html` keeps today's viewport meta; `overlay.js` adds `viewport-fit=cover` for twin. The twin root is sized in `svh`.
- A Fullscreen item in MENU on Android, and an Add to Home Screen hint on iPhone.
- The CSS gains well, rim and bezel paint for the new layout and keeps the classic case.
- `defaults.nh` is unchanged. `start()` already appends the player's own option lines to it; only while the layout is twin, it also appends, on its own line:

```
OPTIONS=paranoid_confirmation:+Remove
```

The `+` keeps the defaults (pray, swim, trap: `src/options.c` `optfn_paranoid_confirmation`, `flags.paranoia_bits` defaults), so Pray stays confirmed and T and R always ask. Classic plays exactly as today. A switch of the Layout setting reaches the game's options at the next game start, because the options file is written once per start.

**Order of work (playable at every step).**
1. `layout.js` in, behind the setting; the classic fallback for unusable results; keys placed from the spec with no scale; the header stacked in the glass; today's chip rows and fans re-anchored inside the map rect; a 3-column drawer; snapshot-and-restore rebuilds; the `paranoid_confirmation` line (twin only). **Lucas tests reach, transfer and combat thumb (brief tests 1, 3, 4) on his phone.**
2. The map cell and `zoomFactor`; the tap-drift fix; message rows, bars and the log from spare height.
3. Layers (COUNT, HERE, the two-tap stairs from CONTEXT), the FLICK legend's targets, the layer pill.
4. The guard: halos and the action pad's seams, the ring, the closing rules and the armed-Fight rule in the tap path, the ghost deck and its habit guards. **Brief test 2 (near misses).**
5. `viewer.js`, the budget per display mode, insets, the desk dock and panels, the Ctrl+; prefix.
6. Twin banks becomes the default (it already is, by the setting); classic stays selectable.

**Main risks.**
1. **The right thumb carries almost every verb.** It holds all eight tier-A action keys, the equipment, PIN 2 and M2/M3; the left thumb walks and keeps the drawers, DROP, PIN 1, REST and M1. The chord (arm right, aim left) is the design's intent and today's portrait. Fatigue and mis-chords in a long fight are untested.
2. **The landscape relearning is real** (§15). The old M3 spot arming Fight is the hazard to watch.
3. **The top rows sit at 55–62 mm** (REST, WORLD, SACRIFICE, M3, KEYS, M2): comfortable-to-stretch on the corner-thumb model, unmeasured for Lucas's grip.
4. **The guard is new input code.** A halo that swallows too much would eat real key taps; one that swallows too little lets a miss travel. The 8/12/20 dp values come from the brief's tap scatter, not from Lucas's logs. The "when a tap would travel" states must be exact: a missed state is either a lost --More-- tap or a guard that does not guard. Fight armed in the overlay is such a state even though no prompt is up.
5. **Swap acts at once** over LOOK: 0.52% of taps aimed at LOOK on Lucas's phone, 1.3% at 360 dp. The rows stay where they are (Lucas); if it bites, Swap becomes a hold.
6. **The default cell is a judgement.** 13.4 dp tiles show today's 34 columns with all 21 rows; `mapCell: 'rows'` gives 17.8 dp and 25.6 columns. Test 5 decides.
7. **Web in a tab.** Parity depends on the remembered budget. Until the first rotation, the landscape height is an estimate and the portrait cell may differ (14.7 dp instead of 13.4 on Lucas's phone).
8. **Android later.** The golden fixtures turn drift into a failing test only when the Android build runs them.
9. **The 360 dp action pad.** COMBAT → CONTEXT is 2.6% against today's 1.7% even with the seams (§6). The stairs take a second tap, so the cost is a wasted tap or a prompt, not a level. If a 360-class phone is at hand, test 2 should include it.

---

## 17. Decisions

### The audit's open questions (AUDIT.md §8)

| # | question | decision | reason |
|---|---|---|---|
| 1 | Lucas's density | The layout no longer depends on it. Every size is in dp. Still ask for `adb shell wm density` for the Android cell (Android, later). | The fix for density dependence is to stop using device px, not to guess the density. |
| 2 | Tab, installed or fullscreen on the web | All three work, each with its own remembered budget. The web offers Fullscreen on Android and Add to Home Screen on iPhone. | `checks/tab.mjs`: 36 of 36 and an unmoved pad with the budget; 12 of 36 without. |
| 3 | Which thumb owns combat | **The right (acting) thumb**, by default. `combatThumb: 'L'` is a setting, scored in `variants/spec-combat-left.json` with the same headline. | Every combat command ends with a direction on the pad; arming with the right thumb leaves the left on the pad to aim. COMBAT, FLICK and PIN 2 land at 33.6–40.2 mm, today's portrait spots. |
| 4 | Is the corner-pivot model right for Lucas's grip | Assumed, and made testable (§18, test 1). Grip lift (now part of the fit) and per-orientation hit-offset learning are the fallbacks. | No reach data exists for his grip. |
| 5 | Which keys he uses most | An opt-in, on-device key counter, exportable, nothing sent. Until then the audit's tiers stand. | The tiers are guesses; the layout's heaviest decisions do not rest on them. |
| 6 | Learn web players' screens | No telemetry. The rule decides on the device from size, budget, insets, text and input. | GitHub Pages cannot receive data, and the rule does not need it. |
| 7 | Whole level on large screens; tile snapping; zoom relative to the fit | Yes: the whole level whenever its cell is ≥ 12 dp. Tiles in whole device pixels with a sharp filter; zoom stored as a factor of the device cell. | Overview plus detail beats a bigger cell once glyphs are readable (brief §6.3). |
| 8 | Tablet and laptop posture | Two hands at the bottom corners at phone offsets by default; grip lift (both orientations, clamped); "docked" for a propped tablet; mouse use switches to the desk dock. | The grip sources conflict (brief §6.5). Corner banks at phone size put no key beyond 75 mm. |
| 9 | 640×360: key floor or glass | **The glass gives way.** The pad keeps 58 dp; the right bank's columns narrow to 44.7 dp. Only a short side under about 358 dp steps the pad. | The pad is the most-used control, and its errors are real moves. |
| 10 | One drawer column count | **3 columns on every screen and orientation.** | Items keep their grid across rotation and devices. |
| 11 | Message line length; status and OS text size | At most 960 dp a row; the status gets the rest. Both bands follow the OS text size (clamped 0.8–2, as the web clamps it); the row height is an input to the rule. | Long lines are hard to read; accessibility; parity at any text size. |
| 12 | Message-band size | Each build keeps its own x-height, and the rule takes it as an input: the web's 9.5 CSS px (Lucas, 2026-09-28), Android's 10 dp. | Both are near the 0.25° at 36 cm target (9.89 dp). Round 1 sized the web's rows at 10 and called that the web's own figure, which it was not. |
| 13 | Keyboard and mouse access | Desk mode: the same banks docked under the map at 40 dp, legends, a Ctrl+; prefix (configurable), "hide the dock". | Brief implication 16. Ctrl+Space, Control-Option-Space and Ctrl+Shift+Space all switch input sources on macOS or ChromeOS. |
| 14 | Device test | §18. | – |

### The brief's open questions (BRIEF.md §10)

| gap | decision |
|---|---|
| 10.1-1 two-thumb grip geometry | The corner pivot is the working model. FLICK keeps one thumb and today's screen bearings. Tests 1 and 3. |
| 10.1-2 map glyph floor | The default cell shows at least today's 34 landscape columns where the 12 dp floor allows, with all 21 rows (13.4 dp on Lucas's phone); the floor is 12 dp; `mapCell: 'rows'` for bigger glyphs; pinch sets a per-device factor. Test 5. |
| 10.1-3 how far a learned key may move | Nothing moves between orientations. The one-time move from today is covered by the ghost deck's preview and the transfer list. Test 4. |
| 10.1-4 tablet and laptop grips; filling space | Corner banks at phone size, grip lift, docked mode; panels in a fixed priority. To be watched on a real tablet. |
| 10.1-5 reliability of the 3×3 pad | 58 dp keys at a 66 dp pitch on Lucas's phone (never under 61 at 58 dp keys), tiled hit cells, the pad owning the gap above it, the halo, 24 dp between the banks and the confirm ring. Test 2. |
| 10.1-6 web policy | The budget memory per display mode, the size classes with hysteresis, the state machine, and a key-size setting because physical size is unknowable. Test 7. |
| 10.2 six-way flicks | Not used: two wedges of 62.5°. |
| 10.2 edge or inset | Keys are drawn inset (18 dp on Lucas's phone, 8–12 elsewhere); hit areas run to the edge. |
| 10.2 tablet grip height | Grip lift. |
| 10.2 one hand in portrait | Not served. The layout assumes two thumbs in both orientations. |
| 10.2 tap model calibration | Hit-offset learning per orientation and thumb is a later step; the guard does not depend on it. |
| 10.2 other browsers, hysteresis | The machine never relies on `pointer: coarse`; its thresholds are untested (test 7). |
| 10.2 renderer parity | `cellAspect` is a setting. The web keeps tiles; `variants/spec-text-cells.json` scores Android's cell. |

### Where the judges disagreed

| question | options | decision and reason |
|---|---|---|
| REST's place | lower to about 47 mm or keep it out of reach | **Keep it in the top strip, 55 mm.** The owner's code says many-turn commands "belong out of thumb reach" (`RhOverlay.java:1030–1033`). The one-turn rest is the pad centre. |
| Choosing a count | thumb-arcs' pad layer, full-bleed's hold-and-scrub, size-classes' key-free band | **The pad layer**, closing on lift unless held 600 ms. It is the existing layer grammar and covers nothing. |
| FLICK bearings | today's screen bearings or mirrored to the thumb frame | **Screen bearings.** It is Lucas's portrait motion today and the fast diagonal for a right thumb. |
| Drawer columns | 3 everywhere or one count per device | **3 everywhere.** |
| Default map cell | twin-banks' 14 dp, "fill 21 landscape rows" (full-bleed), or today's columns (player verifier) | **Today's columns** (34 in landscape, all 21 rows: 13.4 dp on Lucas's phone). "Fill the rows" is the `mapCell: 'rows'` setting. The brief: do not grow glyphs past the floor at the cost of columns; let test 5 decide. |
| Desk keys | docked centred under the map or hung under the map's corners | **Centred dock.** |
| Switching thresholds | 3 clicks/5 keys, 2 clicks/3 keys + lockout, offer then switch | **size-classes' machine**, plus: keys alone never shrink the thumb banks on a phone. |
| Safe areas | one inset envelope, physical corners, safe corners | **Physical corners except landscape side insets**, counted beyond the margin (§13). |

---

## 18. What Lucas should test first

A short on-device plan that would confirm or overturn the riskiest decisions. A prototype needs only the layout and the guard; the ghost deck and panels can wait.

1. **Reach sweep, both orientations** (brief test 1). Hold the phone as he plays and drag each thumb along its comfortable and its farthest arc. It confirms or overturns the corner model, whether the top row (REST 55, SACRIFICE and M2 62 mm) is a stretch or a regrip, and whether ↙/APPLY at 10.6 mm feel "too close". If the top row is a regrip, the upper rows compact (48 → 44) before anything else.
2. **Near misses, landscape.** Ten minutes of walking and fighting with the tap log on. Count taps swallowed by the halo, taps in the confirm ring, any travel that started within 32 dp of a key, and any --More--, farlook or target tap a guard ate (there should be none). Repeat with 52 dp keys. If the ring catches intended map taps often, narrow it to 12 dp. If travel ever starts from a near miss, widen the halo.
3. **Combat thumb.** Thirty fights with the default (arm right, aim left), then thirty with `combatThumb: 'L'`. Time from seeing a monster to the attack, and count mis-chords.
4. **The switch from today.** One landscape session on the new layout straight after the old one. Log ghost-deck previews and every COMBAT arm that came from the old M3 spot. Rotate mid-session and time INVENTORY, SEARCH and FLICK. Try the two old habits too: the pad-centre hold, lift and tap, and the pray hold on the old SACRIFICE spot; both should flash and do nothing. It shows how long the ghost deck needs (it retires itself after three sessions with no unconfirmed preview).
5. **Map cell.** Play a level at the default (13.4 dp tiles, 34×21), then with `mapCell: 'rows'` (17.8 dp, 25.6×21). The first twin session starts at the default (`zoomFactor` 1×, not carried over from classic's zoom). Note the viewing distance and how often he pans. If he keeps 'rows', it becomes the default.
6. **Layers.** Set SEARCH ×10 and REST ×5 by holding the key and tapping or sliding on the pad; rest on the stairs with a slow centre press and step south: the hero must step, not descend. On the stairs, tap CONTEXT once: the pad centre lights with Ascend or Descend and nothing happens; ↑ or ↓ only puts it away; a second tap on CONTEXT or on the lit centre goes. With Fight armed, tap the map: Fight disarms and the hero stays put.
7. **The web on his phone.** Open the build in a Chrome tab, installed, and fullscreen. Record `innerHeight`, `svh`, `devicePixelRatio`, `pointer` and `any-pointer`, then rotate twice. Confirm the pad does not move between orientations or when the toolbar hides, and that each display mode keeps its own budget. Open a split screen beside a wiki: the page should show classic, and twin should come back when the split closes. Confirm that Ctrl+; reaches the page on each desk OS at hand (macOS, ChromeOS, Windows) and switches no input source.

---

## Files

In the repo:

| file | what |
|---|---|
| `win/web/layout.js` | the rule: a plain ES module, no imports, no DOM; `layout()` (with `usable`), `collisions()`, `textMetrics()`, `bankMetrics()`, `deviceCell()`, `tierOf()`, the bank tables, the glass's band |
| `win/web/viewer.js` | what the page knows of the device beyond the window: the remembered budget, the size classes, and the tiers and glasses last drawn |
| `win/web/test/` | `node --test win/web/test/`: the golden screens (`fixtures/spec.json` and the variants), the edge windows, the budget, the size classes and the glass's band |
| `doc/twin-banks/figures/spec.<W>x<H>.svg` | one drawing per scored screen |
| `doc/twin-banks/checks/sweep.mjs` | the CI gate: ten sections, 73,470 layouts; `RH_LAYOUT=<path>` runs it on another build of the rule |
| `doc/twin-banks/checks/drag.mjs` | the glass's band, in windows dragged as the page lays them out |
| `doc/twin-banks/checks/lib.mjs` | the checks' shared helpers: the hit model with the action pad's seams, hit parity, the per-screen rules, `drawable()` |
| `doc/twin-banks/harness/` | the scoring harness (`eval.mjs`, its `SPEC.md`) and `baseline.json`, the build before the redesign as the audit measured it |

The design's other checks (`nearmiss`, `tab`, `guard`, `transfer`, `hitmap`, `voidnp`), `layout-cli.mjs`, the harness reports, the hit maps, the variants' reports and the verifiers' reports and scripts stayed in the working session. Their results are quoted in this document.
