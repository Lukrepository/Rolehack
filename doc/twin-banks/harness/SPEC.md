# Rolehack layout harness

Scores a touch-layout proposal exactly the way the 29 Sep 2026 audit (`../../audit/AUDIT.md`) scored the current build, so rival redesigns can be compared on the same numbers.

## Run it

```
node eval.mjs my-proposal.json --baseline baseline.json
```

- Needs Node 18 or later. No packages.
- Writes next to the spec:
  - `my-proposal.report.md`: headline, spec problems, the comparison with the baseline, parity and per-screen tables.
  - `my-proposal.report.json`: every number, every control row.
  - `my-proposal.<W>x<H>.svg`: one drawing per screen.
- Prints the headline. It exits 1 if the spec has errors; the report is written anyway.
- `baseline.json` is the current build. `node build-baseline.mjs` rebuilds it from the audit. `node selftest.mjs` checks that the harness still reproduces the audit (498 checks).

## The spec: one JSON file per proposal

Units are dp (= CSS px, 1/160 inch = 0.15875 mm). Origin is the top-left of the screen. Every rect is `x, y, w, h`. The example below is abridged: a real screen lists all of its controls. `baseline.json` is a complete example.

```json
{
  "name": "Proposal B: corner pads",
  "notes": "one line on the idea",
  "retired": { "msgs": "now the first item of the MENU drawer" },
  "screens": {
    "896x443": {
      "W": 896, "H": 443, "pointer": "touch",
      "controls": [
        { "id": "pad_y", "label": "↖ y", "x": 18, "y": 235, "w": 58, "h": 58, "thumb": null, "kind": "pad" },
        { "id": "longrest", "label": "Long rest", "x": 18, "y": 18, "w": 126, "h": 40, "thumb": null, "kind": "key", "behind": "rest" },
        { "id": "quiver", "label": "QUIVER", "x": 700, "y": 300, "w": 58, "h": 58, "thumb": "R", "kind": "key", "tier": "B" }
      ],
      "glass":   { "x": 242, "y": 22, "w": 412, "h": 313 },
      "mapArea": { "x": 244, "y": 85.44, "w": 408, "h": 201.56 },
      "bands":  [ { "name": "messages", "x": 242, "y": 22, "w": 412, "h": 63.44 } ],
      "popups": [ { "owner": "flick", "label": "flick up node", "x": 367, "y": 284, "w": 44, "h": 44 } ],
      "chrome": [ { "name": "lamp strip", "x": 226, "y": 335, "w": 444, "h": 26 } ],
      "decor":  [ { "name": "left well", "x": 8, "y": 8, "w": 210, "h": 427 } ]
    }
  }
}
```

### Screen fields

| field | meaning |
|---|---|
| key, `W`, `H` | the key must be `"<W>x<H>"` and match W and H |
| `pointer` | `"touch"` or `"mouse"`. Reach and small-target checks run on touch screens only. |
| `controls` | every tap target (next table) |
| `glass` | the frame that holds the bands and the map. A trained tap that lands here, on no key, reports `glass`. |
| `mapArea` | where map cells are drawn. Required. |
| `bands` | message and status bands |
| `popups` | transient targets: flick nodes, radials, candidate fans, count-chip rows. `owner` = the control that opens it. |
| `chrome` | non-control UI that carries information (lamps, nameplate, a clock). It counts as used space. |
| `decor` | optional. Case, wells, frames: drawn, but **counted as void**. Put decoration here, not in `chrome`. |

### Control fields

| field | meaning |
|---|---|
| `id` | a canonical id (below) or any new id |
| `label` | free text, shown in the SVG tooltip |
| `x, y, w, h` | the touch rect, in dp |
| `thumb` | `"L"`, `"R"` or `null`. With `null`, the harness assigns the screen half of the control's centre: `x + w/2 < W/2` is L, otherwise R (so a centre exactly on the midline is R). This is the audit's rule. Set it explicitly only for a key you mean to be reached across the midline. |
| `kind` | `pad` (movement pad, the 46 dp floor applies), `key`, `hub`, `flick`, `strip`, `chrome-key`. Only `pad` changes a metric. |
| `behind` | optional: the id of the key this control hides behind. It has no tap target of its own, like Long rest, swiped out of the REST slot. It is left out of tap hits, target sizes, overlaps, void and counts. |
| `tier` | optional, only for **new** ids: `A`, `B` or `C` (default B). Canonical ids always keep the audit's tier. |

### Canonical controls (37 ids, 36 tap targets)

```
pad_y pad_k pad_u pad_h pad_centre pad_l pad_b pad_j pad_n
rest longrest msgs sacrifice m1 drop pin1
combat pin2 flick look context menu world game keys
inventory eq_wear eq_puton eq_wield eq_takeoff eq_remove eq_swap
m2 m3 eat search apply
```

- Every screen must contain all 37, unless an id is listed in top-level `retired` with a string saying where its function went. A canonical id that is missing without being retired is an **error**.
- In the current build `longrest` is `"behind": "rest"`, which is why the audit counts 36 controls.
- Tiers (the audit's guess at use frequency): A = the nine pad keys, rest, context, search, inventory, combat, flick, apply, eat, look. C = menu, world, game, keys, sacrifice, longrest. B = the rest. Weights: A 1, B 0.4, C 0.15.
- New ids are scored like any other control. Give them the same id on every screen, so the harness can pair them across orientations.

### Which screens to include

- The headline needs **896x443, 443x939, 640x360 and 1920x1080**.
- Parity is scored for each of these pairs that is present: 896x443/443x939 (Lucas's phone), 640x360/360x640, 915x412/412x915, 844x390/390x844 and 1024x768/768x1024.
- `baseline.json` covers all ten pair screens plus 1366x768 (touch) and 1920x1080 (mouse). Match that set so that every row of the comparison fills in.

## Metrics

### Parity (per orientation pair), the audit's model unchanged

- **Thumb frame.** Each thumb pivots at the bottom corner of its side. A control's centre is measured as mm *in* from that side edge and mm *up* from the bottom, which gives a distance and a bearing (0° = inward along the bottom edge, 90° = straight up).
- **Flags**, landscape against portrait:
  - THUMB: the control changes thumb.
  - MOVE: same thumb, and it moves more than 10 mm in the thumb frame.
  - BEAR: its bearing changes more than 20°.
  - ORDER: its own move flips its up/down or in/out order with a same-thumb neighbour, where the two are at least 5 mm apart in both orientations. The flip is charged to the control that moved more (both, within 1 mm).
  - MISS: a trained tap fires a different key.
- **Trained taps.** Take the centre as (in, up) under its thumb, and replay it under the *same* thumb on the other screen. The harness reports which key the replayed tap hits (or `no key`, `glass`, `off screen`), in both directions:
  - **L→P** is the landscape spot tapped in portrait. It is the headline's "trained taps on the same key".
  - **P→L** is the reverse.
  - Each is also reported with a 3 dp margin (the spot must lie at least 3 dp inside the key) and as the expected number of hits with 1 mm Gaussian tap scatter.
- **Break score.**
  - Same thumb: move mm / 10.
  - Thumb switch: 6 + 0.5 × (mirrored offset mm / 10).
  - A MISS adds 1.
  - Weighted = break × tier weight. **Σ weighted** sums the live controls; lower is better.
- **INVENTORY and FLICK** are reported in full: the thumb, distance and bearing in each orientation, the move (or the mirrored offset for a switch), and where their trained taps land.
- A control in only one orientation of a pair is listed but not scored. Retire it, or put it in both.

### Per screen

| metric | definition |
|---|---|
| map area | `mapArea` w × h dp, and its % of the screen |
| cells visible | NetHack's 80×21 map at a 12×19 dp text cell and at a 16 dp square tile: min(80, w/cell) columns, min(21, h/cell) rows |
| fit | the square tile, min(w/80, h/21), and the 12:19 text cell that would show all 80×21 |
| targets | the smallest pad key and the smallest other target, by the shorter side. On touch screens, pad keys under 46 dp and other targets under 44 dp are flagged. |
| overlaps | control on control (area > 0.01 dp), control on the map area, control off the screen. Controls on the glass or a band are listed for information. |
| pop-ups | the live controls each pop-up covers (its owner excluded), and pop-ups that run off the screen |
| void % | the share of the screen not covered by the map area, bands, chrome, or any control grown by a 12 dp gutter. Glass outside the map and bands counts as void, and so does `decor`. |
| reach | touch only: controls more than 75 mm from their thumb's corner, and controls inside 15 mm (under the thumb base) |

### Headline

```
<name>: T thumb switches / M moves>10mm / H of N trained taps on the same key (896x443/443x939) | map L% / P% (896x443 / 443x939) | smallest pad key X dp (640x360) | void V% (1920x1080)
```

The current build:

```
baseline (current build): 5 thumb switches / 8 moves>10mm / 18 of 36 trained taps on the same key (896x443/443x939) | map 20.7% / 35.1% (896x443 / 443x939) | smallest pad key 43.6 dp (640x360) | void 21.8% (1920x1080)
```

## Good to know

- **Screens are fixed snapshots.** The harness knows nothing about a proposal's scaling rule. If a layout scales, draw each screen at the size it would really get.
- **mm are phone mm.** 0.15875 mm per dp everywhere, as in the audit. Desktop CSS px are larger, so reach is reported on touch screens only.
- **The corner-thumb model fits phones best.** On tablets and touch laptops the "beyond 75 mm" counts are an upper bound on the problem, not a grip model.
- **Pop-ups are only as good as you list them.** The web captures in the baseline have none; the Android screens carry the model's pop-ups (flick nodes, pad-centre radial, candidate fan, count-chip rows).
- **Not measured:** the flick's direction wedges (screen-fixed in the build), drawer column counts, where layers paint, Android's density-dependent text cell, and safe areas. Describe these in `notes` if the proposal changes them.
- **Reproduction.** On the baseline, `selftest.mjs` checks:
  - every pair against `audit/parity.json`: flags, trained taps, INVENTORY, FLICK, weighted totals and reach;
  - every control row on Lucas's phone;
  - the portrait pop-up covers;
  - the 3 dp and scatter tap counts;
  - the map and key shares in AUDIT.md.
