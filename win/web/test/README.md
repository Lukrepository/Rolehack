# The web port's tests

Tests for the pieces of the page that run without a browser. Today that is
`../layout.js`, the "guarded twin banks" layout rule. They use node's own test
runner and assertions, so there is nothing to install.

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
- with `header: 'stacked'`, the page's setting while it keeps the bands in
  `#glass`, messages over the status, no band stands beside another or over
  the banks, and a window whose header is stacked in the glass anyway lays out
  as it does by default;
- `layout.js` stays a plain module, with no imports, no DOM and nothing from node.

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
