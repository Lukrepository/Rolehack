# The web port's tests

Tests for the pieces of the page that run without a browser. Today those are
`../layout.js`, the "guarded twin banks" layout rule, `../viewer.js`, the
budget the page remembers for it, `../input.js`, `../glide.js` and
`../channel.js`. They use node's own test runner and assertions, so there is
nothing to install.

## Running them

From the top of the checkout:

    node --test win/web/test/

This needs node 20.19 or later, or 22.7 or later. Those versions load
`layout.js` as an ES module because of its syntax, even though its name ends in
`.js` and there is no `package.json`. Node 21 does not, and fails on the import.
`index.js` makes the directory form work. Node 20 searches the directory for
test files. It takes every module here for one, so it also loads `index.js` and
`edge-cli.mjs`; both do nothing then, and node 20 counts two more tests than
node 22. Node 21 and later run the directory as a module, which is `index.js`,
and it imports every `*.test.mjs` here. Naming the files also works:

    node --test win/web/test/*.test.mjs

`layout.test.mjs` checks that:

- `layout()` reproduces the design's golden screens (`fixtures/`) within 0.5 dp:
  every control, band, map area, glass, panel, pop-up and decor rect (the bank
  wells with their guard halos, and the confirm ring), and the fit;
- it does the same for the edge windows (`fixtures/edge.json`), where the rule
  has to give way: the pad stepping 58 -> 52 -> 46 on short sides, the right
  bank's columns narrowing under 44 dp, the last resort, and windows that come
  back unusable. Each is also held to the design's own numbers, written in
  `edge-cli.mjs`'s `EDGE`: usable, the fit's level, pad and right columns, and
  the gap between the banks. Every screen in the design's spec and variants has
  room to spare, so without these a change to the step-down would pass;
- it never throws over a sweep of windows, pointers and settings (nonsense
  included). Everything it calls usable has no key off screen, on another key,
  on the map or under a band. With plain settings, every window 660 dp or more
  on its short side is usable;
- a window and the same window turned get the same banks: every key keeps its
  offsets from its own bottom corner. Lucas's uneven phone (896x443 / 443x939)
  gets this from its remembered budget;
- the left-handed layout is the right-handed one mirrored;
- with `header: 'stacked'`, for a header that is one block in the glass
  (the page's until it laid its bands out apart, and Android's `RhScreen`),
  messages over the status, no band stands beside another or over the banks,
  and a window whose header is stacked in the glass anyway lays out as it does
  by default;
- a monitor's window, laid out as a tablet while it is touched (and with a
  mouse too while desktop mode was deferred, 3 to 7 October 2026), shows the whole level with its panels clear of every key and of
  the map. Where a 24 dp cell would leave strips wider than a panel beside the
  level, the cell grows up to 48 dp (2560x1440: 31.5 dp, 3440x1440: 42.5 dp).
  Where the level is still narrower than the column between the banks by a
  panel a side (32:9, 5120x1440), the log and the inventory stand beside it.
  The void (no key, map, band or panel) stays within each window's figure,
  under the 21.8% of today's classic page at 1920x1080 everywhere except
  5120x1440 (25%). A tablet never reaches 24 dp, so its layout is the design's.
  A monitor turned to portrait shows no fewer of the level's columns than
  24 dp would (1440x2560: 24 dp, 60 columns);
- the cell grows with a monitor's window, not at once: dragged a pixel at a
  time wider or taller, a window's cell never moves by more than half a dp
  (the first cut jumped from 24 to 30 dp between 2406 and 2408 dp wide);
- `layout.js` stays a plain module, with no imports, no DOM and nothing from node.

`desk.test.mjs` checks the desk, the layout for a mouse and a keyboard (desktop
mode, Lucas, 2026-10-06 and 2026-10-07): its cell is the largest whole
device-pixel cell that fits (`dpr`), which the page draws exactly, and at dpr 1
the cell it always was; a map that pans is never wider than the level and
stays centred; dragged a pixel at a time with the arrangement it last drew
(`prevDesk`), a cell step, the header at 826 dp and the panels' flip each come
24 dp late on the way up and where the old one stops fitting on the way down,
a window dragged taller meets every cell, each 24 dp late, and nothing flips
back within 24 dp; nonsense `dpr` and `prevDesk` never throw;
and a touch or pen layout is the same with or without them.

`viewer.test.mjs` checks the remembered budget (`viewer.js`) with the rule
itself, as the page uses them:

- a first visit in a window that is not the whole device turned lays out as
  that window does with no budget: Lucas's phone in split screen (443x460,
  which comes back unusable, so the page shows classic) and other splits, a
  touch PC's portrait windows, and the phones whose browser bars differ
  between the orientations (an iPhone's Safari, Android's three-button bar);
- in Lucas's tab, a first portrait visit gets the very banks it keeps after
  the first turn;
- a temporary window (a short landscape one, a landscape split, a narrow
  portrait one, a split half, the split screen) changes nothing for the full
  windows after it: not a key, not the map cell, not the stored budget;
- a desktop window teaches nothing, and the landscape height is learnt from
  the device turned and only grows;
- the size classes (phone under 600 dp wide or 480 dp tall, tablet otherwise)
  change only 24 dp past a boundary, each way. A window dragged a pixel at a
  time across one and back changes its tier, the device cell's tier, the whole
  level and the panels once each way, at the band's edges, and jittered about a
  boundary it never changes. No key moves for a tier. A fallback to classic
  keeps the tiers last drawn;
- a large window laid out as for touch (touched, or with Controls set to
  thumb banks) is a tablet, with phone-size keys, the whole level, the log and
  the inventory, never the desk.

`input.test.mjs` checks the input switch (`../input.js`, desktop mode, Lucas's
answers of 2026-10-07), which picks the thumb banks or the desk from the input
in use:

- a page starts in the mode this browser remembers, else the thumb banks where
  touch is possible, else the desk; the Controls setting overrides it;
- a touch or a pen asks for the thumb banks at once, and is consumed while the
  desk shows (never on the thumb banks a mouse window fell back to); the 3 s
  lockout never holds a touch back;
- two mouse presses or the wheel, within 10 s and with no touch for 5 s, ask
  for the desk, not within 3 s of a switch;
- where touch is possible, typed keys only turn on the key letters; where it
  is not, three in 10 s ask for the desk;
- the keys the game is sent: as before, with a Mac's Cmd left to the browser,
  its Option typing the M- command by the key's place (a German Mac's Option+5
  still types `[`), and AltGr characters typed as themselves;
- the Ctrl+; prefix by the key's place, never with Alt, AltGr or Cmd; the key
  after it read as typed (`f` and `F` differ), with no `w` or `n` (a tab
  cannot stop Ctrl+W or Ctrl+N);
- it never throws, and stays a plain module with no DOM and no clock.

`report.test.mjs` also holds the device report's input field: the board in use,
whether the Controls setting fixed it, the key letters, and why a mouse window
shows the thumb banks.

## Where the fixtures come from

`fixtures/` holds verbatim copies of the twin banks design's golden specs
(design v2, 2 October 2026):

- `spec.json`: the 15 scored screens;
- `spec-*.json`: the design folder's `variants/spec-*.json`. These are the same
  rule under one changed setting: combat on the left thumb, left-handed,
  Android's text cells, 46 and 52 dp keys, and `mapCell: 'rows'`.

Each one was written by the design folder's `layout-cli.mjs`. It runs the
design's `layout.js`, which is `win/web/layout.js` with a different header
comment. The `*.report.json` files next to them are the harness's scores, not
layout results, so they are not copied.

**One exception, at Lucas's word (2026-10-08).** The desk's screens (1280x800,
1920x1080 and 2560x1440 in each file, and `edge.json`'s "700x450 mouse") were
rewritten from `win/web/layout.js` when the desk's banks moved to the dock
row's outer edges. `layout-cli.mjs` is not in the repo. Every touch screen and
every other field stayed byte for byte as the design wrote it (DESIGN.md's
CHANGES, "Lucas's first test on his laptop").

`edge.json` is not in the design folder. `edge-cli.mjs`, here, writes it from
the design's `layout.js` for the windows in its `EDGE` table: the Z Fold's
cover screen (344x882, both ways), 336, 330 and 320 dp short sides, 640x336
with a remembered budget, 1024x300 and 800x250, a 360 dp phone with 24 and
30 dp side cutouts, Lucas's phone in split screen (443x460), 480x300, and a
desk window too short for the dock. Each entry keeps its window, pointer and
settings, why it is there, whether it is usable, the gap between the banks and
the whole spec. `edge-cli.mjs` refuses `win/web/layout.js`, and writes nothing
when the design's `layout.js` gives other numbers than `EDGE` holds.

## Refreshing them when the design changes the rule

Since 2026-10-08 the rule is changed in the repo itself (the design folder's
`layout-cli.mjs` stayed in its working session), so a decided change goes:
record it in `DESIGN.md`'s CHANGES; change `win/web/layout.js`; run the gate,
`node doc/twin-banks/checks/sweep.mjs` (and `drag.mjs`); rewrite the golden
screens with `node win/web/test/spec-cli.mjs` and the edge windows with
`node win/web/test/edge-cli.mjs <a copy of win/web/layout.js>` (it refuses the
page's own path; copy the file first, and change `EDGE`'s numbers there first
when the change moves them); read the diff `git` shows in `fixtures/`: it is
the change's effect on every screen, and nothing in it may be a surprise.
Never regenerate to make a failing test pass.

The original procedure, from the design folder:

1. In the design folder, regenerate the specs with `node layout-cli.mjs`. It
   rewrites `spec.json` and `variants/`. The design's CI gate is
   `node checks/sweep.mjs`.
2. Copy the rule into the repo. Take the design's `layout.js` from its first
   `// ---` block onward and put it under the header comment of
   `win/web/layout.js`.
3. Copy the specs:

       cp <design>/spec.json <design>/variants/spec-*.json win/web/test/fixtures/
       rm win/web/test/fixtures/*.report.json

   and write the edge windows' specs from the design's rule:

       node win/web/test/edge-cli.mjs <design>/layout.js

   If it says the design's numbers differ, check them against the design's
   DESIGN.md and, when the change is meant, update `EDGE` in `edge-cli.mjs`
   and run it again.
4. Check the settings table. If `layout-cli.mjs` changed its `SCREENS`, `PAIRS`
   or `VARIANTS`, make the same change at the top of `layout.test.mjs`. The
   first test fails when a fixture has no settings there, or the other way round.
5. Run the tests. To check that the repo's copy passes the design's own gate, run
   `RH_LAYOUT=<repo>/win/web/layout.js node checks/sweep.mjs` in the design
   folder.

Never regenerate the fixtures from `win/web/layout.js` itself. They are there
to catch the page's copy of the rule drifting from the design.

`glide.test.mjs` checks smooth movement's rules (`../glide.js`; stage 1, the
hero, below, and stage 2, the creatures, after it; the brief is
`smooth-movement-brief-2026-10-08.md` in the workspace):

- a step of one square glides; anything farther jumps, and so do steps that
  ran with no paint between them (typed-ahead keys), mounting a steed, and a
  step under which the view jumps ("The view glides too" off, or a device
  that asks for less motion);
- a single step eases out over 100 ms; faster steps glide evenly for 0.75 of
  the time since the previous screen in which the hero moved, so a walk-mode
  run's monster screens, 40 ms after the hero's, don't make it hop;
- a step during a glide starts where the hero is drawn;
- the square the hero glides onto shows what it last showed with nobody on
  it: never a creature or the mark of one (the remembered 'I', a warning
  digit), and not a boulder the hero just pushed;
- `glide.js` stays a plain module, with no imports, no DOM and no clock, so
  these tests can drive it.

Stage 2, the creatures (`screen()`, `pairMoves()`, `picture()`):

- a creature glides only when its picture left one square and the same
  picture appeared on exactly one neighbouring square, uniquely both ways, so
  a line of identical jackals and two candidates for one square jump, as on
  tty's two screens. The tests check each direction alone: one creature with
  two identical pictures beside it jumps, and so do two creatures with one
  picture between them;
- creatures are paired on the picture drawn (tiles.json `same`, the first tile
  with identical pixels; `picture()`), so a male and a female jackal, drawn
  alike, are one picture and their competing moves jump. The test runs
  `../tiles.py` (python3, as `build.sh` does) to check it;
- a pet's heart makes it a different picture; the hero swapping with a pet or
  a peaceful slides both, and the swap is paired first, so a second identical
  pet nearby still glides; marks never glide;
- a glide carries on while its creature stays, and ends when the creature is
  gone (a corpse is never slid) or when the hero's square is where it was
  headed; a chained creature glide is even; a square left and refilled in one
  screen, and a pet following the hero, both glide;
- two squares in one screen jump;
- every glide in one batch (the screens up to the next paint: a shown message
  flushes the map mid-turn) has one length, the hero's when it moved. Screens
  in which the hero kept its square are timed from the last one in which a
  creature moved, came or went, so a message, a missile's frames or a step by
  a hero who isn't drawn doesn't shorten the next glide, while helpless turns
  and a walk-mode run's monster screens still do;
- a creature glides only from a square the last painted frame showed it on, so
  one that moved twice with no paint between, or came into view since, jumps,
  unless it ends one square from where it was last painted (a swap's message,
  then the pet's own move);
- every creature on a step under which the view jumps, and in the rest of
  that batch, jumps too;
- an effect's frames (a missile in flight: the core puts no cursor on the
  hero) start no creature glide, so a missile passing two creatures drawn
  alike never reads as one stepping onto the other's square;
- hallucinating, only the hero glides, and the first screen after it pairs
  with nothing.
