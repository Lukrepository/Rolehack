# Twin banks: the portrait and landscape redesign

The touch layout of the web port (`win/web/`), and the research and measurements behind it. Each thumb owns one 3×6 bank of keys in its own bottom corner, the same in both orientations. The map takes the rest of the screen.

| file | what |
|---|---|
| [`HANDOFF.md`](HANDOFF.md) | For the next workspace: what is built and where, how to bring an old clone up to date without losing work, the rules that keep `web` and `gh-pages` safe, and what is still open. |
| [`DESIGN.md`](DESIGN.md) | The design, v2: the rule, every key and layer, the near-miss guard, screen classes from phones to monitors. Its CHANGES list every decision since (Lucas's included). |
| [`RESEARCH.md`](RESEARCH.md) | The research brief it rests on: thumb reach, target sizes, muscle memory across orientations, and screen classes. Every claim was fact-checked against its source. |
| [`AUDIT.md`](AUDIT.md) | The audit of the build before the redesign (29 September 2026, `ec134a7`): what moved between orientations, and how much of the screen was empty. |
| [`BUILD.md`](BUILD.md) | The web build's final integration report (4 October 2026): what was checked, and where the page differs from the design. |
| `figures/` | One drawing of the layout per scored screen. |
| `checks/`, `harness/` | The design's gate, the glass's band check, and the scoring harness they use. |
| [`webtest/`](webtest/README.md) | The browser suites that checked the page with real touches (Playwright), and the release research's reproductions, kept as they ran on 2 to 5 October. Not yet runnable as they stand. |

## Running the checks

From the top of the checkout, with node 20.19 or later in the 20 line, or 22.7 or later (not 21; no packages):

    node --test win/web/test/              # the rule against its golden screens, the budget, the size classes, the glass's band
    node doc/twin-banks/checks/sweep.mjs   # the design's gate: 73,470 layouts in ten sections, 0 issues
    node doc/twin-banks/checks/drag.mjs    # windows dragged as the page lays them out: the glass's band
    node doc/twin-banks/checks/desk.mjs    # the desk (a mouse) dragged as the page lays it out, and turned back: whole device pixels, the 80 columns, the desk's band (24 dp, no wider, no narrower)
    node doc/twin-banks/checks/same.mjs    # every touch and pen layout (and any pointer but a mouse) identical to the rule before desktop mode, a pixel at a time across its steps

All of them run `win/web/layout.js`. `RH_LAYOUT=<path>` runs the checks on another build of the rule. `same.mjs` compares it with the unchanged rule (`web` at c694b4c07), from `RH_BASE=<path>`, or `/root/desk/baseline/layout.js` where that exists; without one it prints how to make it.

## Decisions

These are Lucas's decisions. `DESIGN.md` records each one where it applies.

- **Layout setting.** "Layout: twin banks / classic" in Settings, twin by default. Windows too square for twin banks (split screen) show classic.
- **Long rest.** Swiped up out of REST.
- **Empty pins.** An empty pin's tap opens its picker.
- **The map.** It drags freely, and locks and centres only at rest.
- **Pray.** It stays on the 380 ms hold.
- **Desktop mode is deferred** (2026-10-03). A mouse window is laid out by its size as a phone or a tablet. The desk is kept in `layout.js` and its checks for when it is built: the 40 dp dock, key legends, the Ctrl+; prefix and switching by input mode.
- **3440x1440 stays as it is** (2026-10-04): the level spans the window, and the panels sit under it.
- **The glass gets a band** (2026-10-04): 24 dp, as the size classes have.
