# Rolehack terminal layout: audit of the current build

29 September 2026. For Lucas, and for the designers doing the redesign.

**Builds audited (read only, nothing changed):**
- Web port: `/home/user/Rolehack` at `ec134a7` (branch `web`; the checked-out branch is the same commit), `win/web/`.
- Android UI: `/home/user/RolehackFront` at `456361c` (`RhOverlay.java`, 5086 lines; `RhCase`, `RhScreen`, `RhDrawer`, `RhPrefs`, `RhTheme`; ForkFront's `NHW_Map`).
- Android app: `/home/user/RolehackDroid` at `7d08426`.

Only the terminal style is covered: Terminal, Terminal light and GameCube skins, with and without the case. Unless a path names a repo, every file below is relative to the audit's own folder of captures and models (screenshots, JSON, SVG), which stayed in the working session and is not in the repo; this copy keeps the text and its numbers.

## The short version

1. **Parity between orientations is poor, except for the movement pad.** On your phone, 5 of the 36 controls switch thumb when you rotate: COMBAT, its second pinned slot and the FLICK key go from the left thumb to the right, and MENU and WORLD go the other way. Another 8 stay on the same thumb but move more than 10 mm. If you tap in portrait where your thumb learned a key in landscape, you hit that same key for only 18 of the 36. The movement pad does not move at all.
2. **INVENTORY moves 50.9 mm on the right thumb.** In landscape it is a thin bar at the top of the right bank; in portrait it is the bottom-left key of the right action pad. On a tablet the move is 102 mm.
3. **The FLICK key changes thumb, and so do its flicks' meanings.** It sits on the deck under the left thumb in landscape and in the right action pad in portrait. The two flick directions are fixed to the screen, not mirrored, so "up-right" is an inward reach for the left thumb and an outward sweep for the right.
4. **The map gets a small share of the screen.** In landscape it gets 20.7% of your phone's screen; the keys get 35.2% and empty well space 17.3%. Landscape's map area (408 dp wide) is no wider than portrait's (407 dp). Removing only case chrome, with no key changed, adds 52 dp of width and 70 dp of height in landscape.
5. **Large screens are mostly empty case.** The case never grows past its design size, and every key is pinned to a window edge or corner. At 1920×1080 the keys cover 7% of the window and empty case covers 27%. The deck has a 932 dp gap in the middle, and each side well is about 73% empty.
6. **Bigger glass gives bigger tiles, not more map.** The web sizes the tile from the map's height only. So every landscape screen shows 21 to 43 of the 80 columns: a 1024×768 tablet shows 21.4, fewer than your phone's 34. At 1920×1080 the whole level would fit at a 17.9 px tile, but the page uses 40 px.
7. **The web knows only the window's width and height.** It never checks pointer type, hover, safe areas or the visual viewport, and it has no way to tell you what screens players use.
8. **New bug found while checking:** on real phone screens, the web draws the map on a slightly different grid from the one it reads taps on. Past a certain column (column 19 to 59, depending on density and orientation), a tap sends the hero to the cell next to the one tapped. It was confirmed live at density 2.4375, one of the two your phone could have: 8 of 8 taps (§4.5).
9. **The build already breaks some of its own rules.** Small phones get movement keys below 46 dp (43.6 dp at 640×360). In portrait, pop-ups cover live keys. The drawers change their columns between orientations.

---

## 1. What was measured and how

### 1.1 Screens

| screen | dp (= CSS px) | where it comes from |
|---|---|---|
| Lucas's phone, landscape / portrait | 896×443 / 443×939 | measured, native fullscreen (task brief) |
| small phone | 640×360 / 360×640 | brief |
| other phones (web only) | 915×412, 844×390 and their portrait pairs | added to test the range |
| tablet | 1024×768 / 768×1024; 1180×820 (web) | brief |
| touch laptop | 1366×768 | brief |
| desktop, mouse and keyboard | 1280×800, 1440×900, 1920×1080, 2560×1440 | brief plus two common sizes |

Units: 1 dp = 1/160 inch = 0.159 mm, so a 58 dp key is 9.2 mm. On Android Chrome, 1 CSS px = 1 dp. On desktop monitors a CSS px is larger: 0.216 to 0.277 mm (`web-code-scripts/out/physical.md`).

### 1.2 Work streams

| stream | method | main files |
|---|---|---|
| Android landscape geometry | Every control rebuilt from the Java formulas: 3 screens × key sizes 46/52/58, case on and off | `android/landscape.mjs` → `landscape.json`, `landscape-*.svg/.png` |
| Android portrait geometry | Same method for the "twin pads" portrait layout; 9 layouts plus caseless | `android/portrait.mjs` → `portrait.json`, `portrait-*.svg/.png` |
| Java against web | Both models loaded against the real web build in headless Chromium. All 36 controls match within 0.6 dp on every screen and key size; the known differences are in §2.3. | `android/js_crosscheck.mjs`, `android/portrait_crosscheck.mjs` |
| Web in live play | Playwright at 16 viewports. A saved game (Monk "Audit", Dlvl 1, turn 1) is resumed in each. A read-only hook was appended to the served `web.js`; the file on disk is unchanged. Service workers were blocked. All runs at device pixel ratio 1. | `web/capture.mjs`, `web/<W>x<H>.png/.json`, `web/summary.json` |
| Web sizing code | The code read line by line, with scripts that copy its formulas. The scripts stop if a constant disappears from the source. | `web-code.md`, `web-code-scripts/*.mjs`, `web-code-scripts/out/` |
| Map area | ForkFront map cell sizes (text-mode font metrics read from the font file), web tile rule, screen breakdown, reclaimable space | `map/map-area.mjs` → `map-area.json`, `map-area.stdout.txt`, `map/ttf.mjs` |
| Parity | Every control's centre measured from its thumb's bottom corner in both orientations (§3.1) | `parity.mjs` → `parity.json`, `parity.md`, `parity-thumb-frames.svg/.png` |
| This report | Numbers that were not copied from a file above, plus the corrections | `report/numbers.mjs` → `numbers.json`, `numbers.txt`; `report/robust_taps.out.txt` |

### 1.3 Verification

Two independent checks were made, each without reading the first pass's scripts:
- **Android geometry** (`verify/`). The geometry was rebuilt from the Java in Python. It checked 666 control rects across 18 layouts, 36 glass rects and 252 pop-up rects, all within 0.01 dp of the models, and it reproduced every number and flag in the parity table. `verify/android_geom.py`, `compare_android.py`, `robust_taps.py`.
- **Web and map** (`verify-web/`). A fresh Playwright driver with an unmodified `web.js`, reading the map placement through a DevTools breakpoint and again from the canvas pixels. It ran 8 viewports, plus density runs at dpr 1.625 and 2.4375. All 36 keys, the glass, the bands, the tile size and the columns shown matched the captures. `verify-web/measure.mjs`, `compare.txt`, `claims.txt`, `dpr-check.json`, `tap-drift.json`.

### 1.4 Assumptions

- Default preferences: movement keys 58 dp, Control scale 100 (Android), full status lines, Atkinson message font at 100%, system text scale 1, map zoom at its default, case on.
- **Thumb model** (parity): each thumb pivots at the bottom corner of its side of the screen. Bank keys belong to their bank's thumb. Deck and key-row keys belong to the thumb on whichever half of the screen their centre is in.
- **Reach bands**: under 15 mm is under the thumb base; 15–60 mm is comfortable; 60–75 mm is a stretch; beyond 75 mm the grip must shift. The 60–75 mm band is the brief's figure and the 15 mm is our assumption. The repos contain no reach data.
- **Use tiers** (for weighting parity breaks) are our guess, not your data. A: FLICK, COMBAT, LOOK, INVENTORY, context key, EAT, SEARCH, REST, APPLY and the nine pad keys. B: pins, macros, equipment keys, MSGS, DROP. C: MENU, WORLD, GAME, KEYS, Long rest, SACRIFICE.
- **Your phone's density is unknown.** 443 dp wide fits either a 720 px screen (density 1.625) or a 1080 px screen (2.4375). Both are reported wherever it matters.

### 1.5 What was not measured

- Nothing ran on a real device. The web captures ran at dpr 1, except the verifier's two density runs.
- A real touch laptop's pointer reporting was not tested. Headless Chromium reports `pointer: coarse` for any touch context (`verify-web/compare.txt`).
- The iOS home indicator and Android display cutouts (safe areas) were not tested.
- Drawer contents, and the context key's candidate fan in live play, were not tested. The fan needs a game state that offers several actions; its formula is the same in Java and JS (`overlay.js:1724`, `RhOverlay.java:3907`).
- The Light and GameCube skins were not captured. On the web, skins change colours only (`overlay.js:122–160`, `rolehack.css:30–35`), so the geometry is the same.

### 1.6 Numbers corrected after verification

One verifier finding was major: the web's tile drawing at real densities. I re-checked it against the source before choosing numbers. The rest were minor; the ones that change a number or a claim are applied in this report.

| # | first pass said | this report uses | checked against |
|---|---|---|---|
| 1 (major) | Web tiles are drawn at T CSS px, so your phone shows 34×17 (landscape) and 23.9×21 (portrait) | Tiles are drawn at `round(T×dpr)/dpr` CSS px while placement and taps use T. At dpr 2.4375 that is 11.90 / 16.82 px, showing 34.3×17.2 and 24.2×21. At dpr 1.625 it is 12.31 / 17.23 px, showing 33.2×16.6 and 23.6×21. Taps drift onto the next cell (§4.5). | `web.js:327` (draw), `:301` (placeView uses T), `:431` (hit test uses T); `report/numbers.mjs`; `verify-web/dpr-check.json`, `tap-drift.json` |
| 2 | Tablet portrait: the empty case between the banks is 332 dp wide, 18.6% of the screen | 332×318 dp = **13.4%** (13.8% to the bottom edge). The 18.6% is the whole case frame. | `android/portrait.json`, `report/numbers.txt` |
| 3 | Map table: the web "fit" angles 28' (1920×1080) and 12.5' (768×1024) are text x-heights | Those are tile heights. The text x-height at those fits is 12' and 5.2'. | `map/map-area.json` |
| 4 | Web area shares at 640×360 and 360×640 | Exact rectangles, not rasterised. 640×360: empty well 20.41%, keys 33.70%, empty case 34.82%. 360×640: 14.11%, 31.21%, 28.21%. | `verify-web/exact.json` |
| 5 | All of landscape's extra 453 dp of width goes to the banks and their margins | 436 to banks and margins, 16 to the wider hood sides, 1 to the map | `report/numbers.txt` |
| 6 | Empty well space "grows with the screen" | It grows in dp² (68.7k → 208k → 231k → 398k dp²). As a share of the screen it peaks on the 1024×768 tablet (26.5%) and falls at 1366×768 (22.0%) and 1920×1080 (19.2%). | `verify-web/claims.txt` |
| 7 | Portrait map height 358.3 / 358.4 dp | 358.35 dp | `android/portrait.json` |
| 8 | 18 of 36 landscape-trained taps land on the same key in portrait, and the six equipment keys are clean | 18 is right for exact centres, but for the six equipment keys the spot is only 1.0 dp inside the portrait key. With a 3 dp margin, 12 of 36 hold; with 1 mm of tap scatter, about 15.2 hold. | `verify/robust_taps.py` → `report/robust_taps.out.txt` |
| 9 | One of the flick's two flicks "reverses" | The on-screen motion is unchanged. Relative to the thumb, the two flicks swap roles between a reach and a sideways sweep (§3.4). | `RhCommands.java:594`; `RhOverlay.java:4560–4571` |
| 10 | APPLY's fan turns up 12° in portrait (`P_INTERACT_FAN_TURN`) | Fans no longer exist. `fanA0()`, the constant's only reader (`RhOverlay.java:2298`), is never called. Holding APPLY paints its layer on the left pad. | grep; `RhOverlay.java:2312–2313` |
| 11 | INVENTORY is the 6th nearest key in portrait | Tied 5th, at 29.40 mm, the same as LOOK. SEARCH/EAT and COMBAT/FLICK are exact ties too. | `parity.json` |
| 12 | EAT and SEARCH misfire because landscape made them 88–96 dp wide | EAT misses vertically: its landscape centre is 21 dp above portrait EAT, because it stands on the 105 dp APPLY. SEARCH misses sideways: its centre is 18 dp past portrait SEARCH's inner edge. | `RhOverlay.java:2080–2112`, `:3810–3812` |
| 13 | Portrait "splits arm and aim across two thumbs", a loss | The code fact stands, but the layer design plans that two-thumb chord (`RhOverlay.java:2747–2748`), and INVENTORY, EAT and APPLY already work that way in landscape (§3.4). | source |
| 14 | The five worst breaks are all on your most-used list | Tier A is our list. You named INVENTORY and the flick key. FLICK's first place depends on the scoring's thumb-switch base of 6. | `parity.mjs` |
| 15 | No parity break outside keys and pop-ups | The drawers reflow: 4 columns in 604 dp in landscape, 3 in 420 dp in portrait (§3.6). | `RhDrawer.java:46–59` |
| 16 | WORLD changes thumb | True under the half-screen rule, but its centre is only 2.8 dp left of the midline | `verify/compare_android.json` |
| 17 | The web's message-band constant is at `overlay.js:44` | `overlay.js:46` | source |
| 18 | Sub-pixel map offsets, 0.05 mm double rounding, 0.016 dp key-row snapping | Cosmetic. Left as they are in the source files. | `verify-web/compare.txt`; `verify/` |

---

## 2. The layouts today

### 2.1 Landscape: side banks and a deck

`android/landscape-896x443.svg` (and `.png`); screenshot `web/896x443.png`, annotated in `web/896x443-annotated.png`.

```
 LEFT BANK 210            GLASS 412 x 313                    RIGHT BANK 210
 [REST x20   ][MSGS]      message band, 2 rows               [MENU][WORLD][GAME][KEYS]
 [SAC][  M1        ]                                         [   INVENTORY bar 28 tall ]
 [   DROP    ][pin1]      map area 408 x 201.6               [Wear ][Put on][Wield ]
 [ y ][ k ][ u ]                                             [T.off][Remove][Swap  ]
 [ h ][ . ][ l ]          status band, 3 lines               [ M2      ][ EAT     ]
 [ b ][ j ][ n ]          lip: SEARCH ARMED MORE lamps       [ M3      ][ APPLY   ]
                 DECK: [COMBAT][pin2][FLICK]  [LOOK][CONTEXT] [ SEARCH  ][ (APPLY) ]
```
Schematic, not to scale. Rects at 896×443, 58 dp keys (`android/landscape.json`):

| where | controls (x,y w×h dp) |
|---|---|
| left bank, top | REST 18,18 126×40 (Long rest swipes into the same slot), MSGS 150,18 58×40 |
| left bank, middle (centred in the leftover height) | SACRIFICE 18,83 58×58 (hold: pray), M1 82,83 126×58 |
| left bank, above the pad | DROP 18,166 126×58, pin 1 150,166 58×58 |
| left bank, bottom | movement pad 3×3 of 58, x 18/84/150, y 235/301/367 |
| deck, left end | COMBAT 236,376 58×52, pin 2 300,376 50×52, FLICK 356,376 50×52 |
| deck, right end | LOOK 420,376 117×52, context key 543,376 117×52 (width clamped 70–170) |
| right bank, top | MENU/WORLD/GAME/KEYS 43×40 at x 688–835, y 18; INVENTORY bar 688,68 190×28; equipment 2×3 of 59.3×48 at y 104 and 158 |
| right bank, bottom | M2 688,246 96×52, M3 688,304 96×52, SEARCH 688,362 96×63; EAT 790,246 88×68, APPLY 790,320 88×105 |

- **Scale:** `s = min(Control scale, max(0.7, min(W/852, H/415)))` at 58 dp keys (`RhOverlay.java:621`, `RhTheme.java:669`). It is 1 on your phone.
- **Glass:** 412×313. The map area between the bands is 408×201.6 dp.

### 2.2 Portrait: "twin pads"

`android/portrait-443x939.svg` (and `.png`); screenshot `web/443x939.png` and `web/443x939-annotated.png`.

```
 GLASS 411 x 497: message band 3 rows / map area 407 x 358.35 / status band / lip
 KEY ROW:  [REST x20][MSGS][MENU][WORLD] | [GAME][KEYS][M2][M3]      (split at W/2)
 LEFT BANK                         RIGHT BANK
 [SAC][   M1      ]               [Wear  ][Put on ][Wield]
 [  DROP    ][pin1]               [T.off ][Remove ][Swap ]
 [ y ][ k ][ u ]                  [ pin2 ][ FLICK ][LOOK ]
 [ h ][ . ][ l ]                  [COMBAT][CONTEXT][ EAT ]
 [ b ][ j ][ n ]                  [INVENT][SEARCH ][APPLY]
```

| where | controls (x,y w×h dp) at 443×939, 58 dp keys (`android/portrait.json`) |
|---|---|
| key row, full width | REST 18,559 81.4×36; then MSGS, MENU, WORLD, GAME, KEYS, M2 and M3, each 40.5×36 at x 105.4 to 384.5 |
| left bank | SACRIFICE 18,623 58×48; M1 82,623 126×48; DROP 18,677 126×48; pin 1 150,677 58×48; pad 3×3 of 58 at y 731/797/863 |
| right bank | equipment 2×3 of 59.3×48 at y 623 and 677; then a 3×3 action pad of 58: pin 2, FLICK, LOOK / COMBAT, context, EAT / INVENTORY, SEARCH, APPLY |

- **Scale:** `min(W/442, H/742)` at 58 dp keys (`RhOverlay.java:641`, `:647`). On your phone the case fits with 1 dp to spare in width.
- **Gap between the banks:** 7 dp on your phone and 332 dp on a 768×1024 tablet.
- **Key row:** its keys stretch with the width, 40.5 dp on your phone and 81 dp on the tablet (`overlay.js:495–501`).

### 2.3 Web

- **Geometry.** `overlay.js` (2200 lines) mirrors `RhOverlay.java` in design dp and scales the whole case by one factor. At every screen and key size tested, all 36 controls, the glass and the status band sit at the Java's rects within 0.6 dp (`android/js-crosscheck.json`, `android/portrait-js-crosscheck.json`, `verify-web/compare.txt`).
- **Differences from Android:**
  1. **Message band text.** `MSG_X = 9.5` on the web (`overlay.js:46`) and 10 on Android (`RhScreen.java:61`). The web band is 60.7 dp tall against 63.4 in landscape, and 86.6 against 90.7 in portrait. Both cite a target of 0.25° at 36 cm, which is 9.89 dp (`report/numbers.txt`), so Android's 10 is closer.
  2. **Scale cap.** The web is capped at 1 (`overlay.js:385`). Android caps at the Control scale setting, 85–120% (`RhTheme.java:669`). The web has no such setting.
  3. **Count-chip rows over LOOK, the context key and SEARCH.** The web draws 244×52 with a 4 dp backing (`overlay.js:1666`, `rolehack.css:213`); Java draws a bare 236×44 row. The web's chips sit 4 dp further left and higher.
  4. **Orientation rule.** The web switches to portrait when `H > W` (`overlay.js:378`) and the CSS when height ≥ width (`rolehack.css:332`). Android uses `Configuration.orientation` (`RhOverlay.java:786–789`). A tall desktop window gets the portrait twin pads.
  5. **Minor.** Lamps sit 1–2 dp apart between the builds. The text-scale clamp is 0.8–2 on the web and 0.85–2 on Android.
  6. **Web only.** The map tile and tap grid mismatch at non-integer densities (§4.5).
- **Screenshots**, all in `web/`: `<W>x<H>.png` and `<W>x<H>-annotated.png` for 896x443, 443x939, 640x360, 360x640, 915x412, 412x915, 844x390, 390x844, 1024x768, 768x1024, 1180x820, 1366x768, 1280x800, 1440x900, 1920x1080 and 2560x1440. The verifier's shots are `verify-web/<W>x<H>.png`, plus `443x939-dpr2.4375.png`, `443x939-dpr1.625.png` and `896x443-dpr2.4375.png`.
- **Other diagrams:** `android/landscape-640x360.svg`, `landscape-1024x768.svg`, `portrait-360x640.svg`, `portrait-768x1024.svg`, and the parity frames `parity-thumb-frames.svg` (and `.png`).

**The web at 16 viewports** (`web/summary.json`; share of the window, %; the two scaled small phones use the exact values from `verify-web/exact.json`):

| viewport | input | layout | s | glass | drawn map | bands | empty case (in wells) | keys | pad key px (mm on a phone) | tile px | columns × rows shown of 80×21 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 896×443 | touch | L | 1.000 | 32.49 | 20.97 | 11.31 | 32.26 (17.34) | 35.25 | 58 (9.2) | 12 | 34 × 17.0 |
| 443×939 | touch | P | 1.000 | 49.11 | 34.93 | 13.34 | 24.82 (11.78) | 26.07 | 58 (9.2) | 17 | 23.9 × 21 |
| 640×360 | touch | L | 0.751 | 31.47 | 19.98 | 11.26 | 34.82 (20.41) | 33.70 | **43.6 (6.9)** | 12 | 22.8 × 14.0 |
| 360×640 | touch | P | 0.815 | 40.58 | 22.34 | 17.98 | 28.21 (14.11) | 31.21 | 47.2 (7.5) | 12 | 27.6 × 13 |
| 915×412 | touch | L | 0.993 | 32.61 | 20.01 | 12.46 | 30.42 (14.6) | 36.93 | 57.6 (9.1) | 12 | 35.9 × 14.6 |
| 412×915 | touch | P | 0.932 | 50.99 | 35.80 | 13.27 | 24.11 (11.23) | 24.92 | 54.1 (8.6) | 17 | 22.3 × 21 |
| 844×390 | touch | L | 0.940 | 31.67 | 19.00 | 12.56 | 30.86 (14.95) | 37.38 | 54.5 (8.7) | 12 | 32.1 × 13.6 |
| 390×844 | touch | P | 0.882 | 49.90 | 34.26 | 13.97 | 24.40 (11.7) | 25.67 | 51.2 (8.1) | 15 | 23.9 × 21 |
| 1024×768 | touch | L | 1.000 | 43.81 | 35.78 | 7.48 | 37.70 (26.48) | 18.49 | 58 | 25 | 21.4 × 21 |
| 768×1024 | touch | P | 1.000 | 54.47 | 41.05 | 12.63 | 30.26 (7.09) | 15.28 | 58 | 21 | 34.9 × 21 |
| 1180×820 | touch | L | 1.000 | 49.63 | 40.55 | 7.84 | 35.34 (24.85) | 15.03 | 58 | 27 | 25.6 × 21 |
| 1366×768 | touch | L | 1.000 | 53.64 | 43.94 | 9.16 | 32.50 (22.0) | 13.86 | 58 | 25 | 35.1 × 21 |
| 1280×800 | mouse | L | 1.000 | 52.08 | 42.23 | 8.47 | 33.72 (23.3) | 14.20 | 58 | 26 | 30.5 × 21 |
| 1440×900 | mouse | L | 1.000 | 56.80 | 47.82 | 8.04 | 31.98 (22.47) | 11.22 | 58 | 31 | 30.7 × 21 |
| 1920×1080 | mouse | L | 1.000 | 65.79 | 58.01 | 7.55 | 27.20 (19.22) | 7.01 | 58 | 40 | 35.8 × 21 |
| 2560×1440 | mouse | L | 1.000 | 73.77 | 56.66 | 6.14 | 22.28 (16.06) | 3.94 | 58 | 48 | 43.2 × 21 |

- **Checks passed at every size:** no keys overlap, none are off screen, none cover the glass, and the status band never shrinks or overflows.
- **Visible defects:**
  - "HOLD TO FILL" is clipped on the 50 dp deck slots in landscape at every size.
  - In portrait, the M2/M3 corner tags crowd the "+".
  - At 640×360 the message band is 276 px wide with 2 rows, and the Sacrifice label is 5.6 px tall on screen.

---

## 3. Parity between landscape and portrait

### 3.1 How it is measured

- **Position.** Each control's centre is measured under its own thumb, as mm in from that side's edge and mm up from the bottom. From that come the distance from the corner and the bearing (0° = inward along the bottom edge, 90° = straight up).
- **Flags:**
  - THUMB: the control changes thumb.
  - MOVE: it moves more than 10 mm on the same thumb.
  - BEAR: its bearing changes more than 20°.
  - ORDER: it swaps sides with a same-thumb neighbour, where the two are at least 5 mm apart in both orientations.
  - MISS: a tap on the spot learned in one orientation fires another key in the other.
- **Sources:** `parity.mjs` on the Android models. The web captures agree exactly at 896×443, and within 0.016 dp at 443×939.

### 3.2 Summary (your phone, 58 dp keys)

| measure | result |
|---|---|
| controls in both orientations | all 36 (Long rest is behind REST in both); none exists in only one |
| change thumb | **5**: COMBAT, COMBAT pin 2, FLICK (left → right); MENU, WORLD (right → left). WORLD's centre is 2.8 dp from the midline. |
| same thumb, move > 10 mm | **8**: LOOK 62.8, INVENTORY 50.9, M3 44.0, M2 32.6, context key 31.0, KEYS 16.1, GAME 15.7, MSGS 10.9 mm |
| bearing change > 20° | 8 |
| order swapped with a neighbour | 6: LOOK, context key, GAME, INVENTORY, M2, M3 (49 swapped pairs in all) |
| landscape-trained tap, made in portrait | **18** same key, 9 another key, 9 no key. With a 3 dp safety margin only 12 hold; with 1 mm tap scatter about 15.2 hold (`report/robust_taps.out.txt`). |
| unmoved | the 9 pad keys: 0.0 mm. DROP and pin 1 move 1.6 mm. |

Weighted by our tier guess, the worst breaks are FLICK, COMBAT, LOOK, INVENTORY and the context key (`parity.md`). You named two of those five, INVENTORY and the flick key; the ranking of the rest depends on our weights.

### 3.3 The breaks, worst first

| control | tier | landscape: thumb, mm @ bearing | portrait: thumb, mm @ bearing | move mm (mirrored offset) | L-trained tap in portrait hits | P-trained tap in landscape hits | flags |
|---|---|---|---|---|---|---|---|
| FLICK key | A | L 60.8 @ 6° | R 33.6 @ 58° | (47.9) | APPLY | M2 | THUMB BEAR MISS |
| COMBAT | A | L 42.6 @ 9° | R 33.6 @ 32° | (17.8) | INVENTORY | M3 | THUMB BEAR MISS |
| LOOK | A | R 66.6 @ 6° | R 29.4 @ 75° | 62.8 | pad ↙ b | EAT | MOVE BEAR ORDER MISS |
| INVENTORY | A | R 60.1 @ 73° | R 29.4 @ 15° | 50.9 | KEYS | SEARCH | MOVE BEAR ORDER MISS |
| context key | A | R 47.2 @ 8° | R 25.4 @ 45° | 31.0 | no key | M3 | MOVE BEAR ORDER MISS |
| COMBAT pin 2 | B | L 52.0 @ 7° | R 40.2 @ 45° | (31.9) | SEARCH | M2 | THUMB BEAR MISS |
| M3 | B | R 31.1 @ 35° | R 57.8 @ 84° | 44.0 | COMBAT | INVENTORY | MOVE BEAR ORDER MISS |
| EAT/QUAFF/READ | A | R 27.7 @ 69° | R 19.4 @ 67° | 8.3 | LOOK | APPLY | MISS |
| SEARCH | A | R 26.6 @ 17° | R 19.4 @ 23° | 7.5 | INVENTORY | SEARCH | MISS |
| M2 | B | R 37.2 @ 47° | R 59.0 @ 77° | 32.6 | COMBAT pin 2 | INVENTORY | MOVE BEAR ORDER MISS |
| WORLD | C | R 67.9 @ 71° | L 67.1 @ 59° | (14.6) | no key | no key | THUMB |
| MENU | C | R 70.8 @ 65° | L 63.6 @ 65° | (7.2) | no key | no key | THUMB |
| MSGS | B | L 70.3 @ 66° | L 60.8 @ 71° | 10.9 | no key | no key | MOVE |
| KEYS | C | R 64.6 @ 84° | R 61.1 @ 70° | 16.1 | no key | INVENTORY | MOVE MISS |
| GAME | C | R 65.8 @ 78° | R 64.0 @ 64° | 15.7 | no key | INVENTORY | MOVE ORDER MISS |

**The 21 controls with no flag:**
- the 9 pad keys (0.0 mm);
- DROP and pin 1 (1.6 mm);
- the six equipment keys (3.7 mm each; the trained spot lands only 1 dp inside the key);
- APPLY (4.4 mm);
- M1 and SACRIFICE (6.2 mm) and REST (7.7 mm). Their trained taps land on no key, because portrait makes them 6–7 mm lower and shorter.

The full table with in/up millimetres, reach ranks and scores is in `parity.md`. The drawing is `parity-thumb-frames.svg`.

### 3.4 INVENTORY and the FLICK key in detail

**INVENTORY** stays on the right thumb but moves 50.9 mm, 4.9 key pitches of 10.5 mm.
- **Landscape.** The 190×28 dp bar across the top of the right bank, 30.2×4.4 mm (`RhOverlay.java:2364–2366`, `boxTR(mPadBox, T_EQ_BAR, …)`). Its centre is 17.9 mm in and 57.3 mm up: 60.1 mm @ 73°, in the stretch band. At 4.4 mm tall it is the shortest key in either layout.
- **Portrait.** `pCell(0, 2)`, the bottom-left cell of the right action pad, 9.2 mm square. Its centre is 28.4 mm in and 7.5 mm up: 29.4 mm @ 15°, comfortable, tied 5th nearest the corner.
- **The move.** 10.5 mm further in and 49.9 mm down; the bearing turns 58° toward the bottom edge. In landscape it sits above 11 same-thumb keys; in portrait it sits below all of them.
- **Trained taps.** The landscape spot, tapped in portrait, lands on KEYS (1.97 dp inside it). The portrait spot, tapped in landscape, lands on SEARCH.
- **Other screens.** On a 1024×768 / 768×1024 tablet the move is 102.0 mm, because landscape hangs it from the top of a 768 dp tall bank.

**FLICK key** changes thumb.
- **Landscape.** A 50×52 dp nub on the deck under the left thumb, at x 381 of 896 (43% of the way across): 60.8 mm @ 6°, stretch band, almost flat along the bottom edge. Source: `flickCx()` (`RhOverlay.java:1168–1171`).
- **Portrait.** `pCellCx(1)`, the top-middle cell of the right action pad, 58×58: 33.6 mm @ 58° from the right corner, comfortable. The two spots are 47.9 mm apart even after mirroring.
- **Trained taps.** The left thumb's landscape spot, tapped in portrait, lands on APPLY (60 mm inward crosses a 70 mm wide screen). The portrait spot, replayed in landscape, lands on M2.
- **The flicks.**
  - The directions are fixed to the screen: `FLICK_BEARING = {-85°, -40°}` (`RhCommands.java:594`), with no mirroring when the key changes thumb.
  - "Up" is 85° under the left thumb and 95° under the right. "Up-right" is 40° under the left thumb (inward) and 140° under the right (toward the right edge).
  - Measured against the line from the thumb's corner to the key:
    - landscape: up-right is a reach (about 34° off that line), and up is a sideways sweep (about 79° off);
    - portrait: up is the reach (about 37° off), and up-right is the sweep toward the edge (about 82° off).
  - The same motion on screen means a different thumb motion. The flick-up node moves from 65.5 mm @ 19° (left thumb) to 46.7 mm @ 69° (right thumb).
- **Portrait pop-up side effects.** The flick ring runs 17 dp past the right edge. Its nodes cover Put on, Remove and Swap. At 46 dp keys the up-right node is clipped about 0.5 dp off screen.

**The combat cluster moves with FLICK.**
- COMBAT goes from 42.6 mm @ 9° under the left thumb to 33.6 mm @ 32° under the right. Pin 2 goes from 52.0 mm @ 7° to 40.2 mm @ 45°.
- A landscape-trained COMBAT tap fires INVENTORY in portrait, and pin 2's fires SEARCH.
- **Where the aiming happens.** Every hub's layer paints on the left movement pad (`paintLayer`, `RhOverlay.java:2773`).
  - In landscape, COMBAT and its layer are under the same (left) thumb.
  - In portrait, COMBAT is on the right and its layer on the left. That is the two-thumb chord the layer design plans ("keep holding and tap the pad with the other thumb, a chord", `RhOverlay.java:2747–2748`). INVENTORY, EAT and APPLY already work that way in landscape.
  - So landscape groups COMBAT with the walking thumb, and portrait groups it with the other hubs. Which is right is a design decision (§8).

### 3.5 The other breaks

- **LOOK (62.8 mm) and the context key (31.0 mm).** In landscape they are 117 dp wide keys at the right end of the deck. In portrait they are cells of the action pad. A landscape-trained LOOK tap lands on the pad's ↙ b key in portrait.
- **M2 (32.6 mm) and M3 (44.0 mm).** They sit low in the right bank in landscape and at the right end of the top key row in portrait.
- **EAT and SEARCH.** They move less than 10 mm, yet trained taps still misfire. EAT's landscape centre is 21 dp above portrait EAT and lands in LOOK. SEARCH's is 18 dp past portrait SEARCH's inner edge and lands in INVENTORY.
- **MENU, WORLD, GAME, KEYS, MSGS.** These are tier C/B. They move from the corners of the two banks to the key row, which is split at W/2.
- **Pop-ups in portrait** (`parity.md` pop-up table; `android/portrait.json`):
  - The count-chip row above the context key and SEARCH (236 dp wide) covers the pad's ↗ u and → l by 19 dp, against the stated intent at `RhOverlay.java:4082–4085`. The web's 244 dp row overlaps them by a further 8 dp.
  - The pad-centre context radial's nodes land on M1, DROP, pin 1, Take off, pin 2, COMBAT and INVENTORY.
  - REST's chips move 9.5 mm, because they open above the key row.

### 3.6 Drawers

The drawers (MENU, WORLD, GAME and every hub's ALL) do not keep their layout between orientations. They use 4 columns in a 604 dp panel in landscape and 3 columns in a 420 dp panel in portrait (`RhDrawer.java:46–59`; web `overlay.js:1841–1842`). Every item from the fourth on changes row and column. This is a motor-memory break the key parity counts leave out.

### 3.7 Across key sizes and screens

From `parity.md` / `parity.json`. Distances are in real mm at the on-screen scale.

| pair | build | key dp | scale L / P | THUMB | MOVE | L-trained taps on same key | INVENTORY move mm | FLICK mirrored mm | worst same-thumb move | keys beyond 75 mm L / P |
|---|---|---|---|---|---|---|---|---|---|---|
| 896×443 / 443×939 | Android | 46 | 1 / 1 | 5 | 10 | 11 | 51.5 | 41.5 | LOOK 66.3 | 0 / 0 |
| 896×443 / 443×939 | Android | 52 | 1 / 1 | 5 | 8 | 11 | 51.2 | 44.7 | LOOK 64.5 | 0 / 0 |
| 896×443 / 443×939 | Android and web | 58 | 1 / 1 | 5 | 8 | 18 | 50.9 | 47.9 | LOOK 62.8 | 0 / 0 |
| 915×412 / 412×915 | web | 58 | 0.993 / 0.932 | 5 | 8 | 16 | 46.4 | 47.7 | LOOK 65.0 | 0 / 0 |
| 844×390 / 390×844 | web | 58 | 0.94 / 0.882 | 5 | 8 | 16 | 43.9 | 45.2 | LOOK 59.1 | 0 / 0 |
| 640×360 / 360×640 | Android and web | 58 | 0.751 / 0.815 | 5 | 7 | 12 | 42.4 | 35.8 | LOOK 43.8 | 0 / 0 |
| 1024×768 / 768×1024 | Android and web | 58 | 1 / 1 | 5 | 17 | 12 | 102.0 | 47.9 | INVENTORY 102.0 | **16** / 2 |

- **The same five switch thumb on every pair and at every key size.** The layout rules fix them (the deck against the action pad, and the key row split at W/2); screen size plays no part.
- **Smaller keys make parity worse on your phone.** Landscape pins the equipment grid to the top of the right bank and keeps EAT and APPLY 88 dp wide, while portrait shrinks them with the pad. At 46 dp, Wear moves 9.4 mm (against 3.7 at 58 dp).
- **On tablets, 16 keys are beyond 75 mm from the corners in landscape:** REST, MSGS, SACRIFICE, M1, LOOK, KEYS, GAME, WORLD, MENU, INVENTORY and the six equipment keys. The same 16 are beyond reach at 1366×768 and 1180×820. A corner-pivot thumb model only partly fits a tablet anyway.

---

## 4. The map

### 4.1 How each build sizes the map

**Android (ForkFront `NHW_Map`)**
- **What is drawn.** The map view fills the window and the case sits on top, so only the glass shows it. The map centres in `RhOverlay.mapArea()`, the glass between the two bands, inset 2 dp (`RhOverlay.java:562`, `NH_State.applyMapArea()` `:733`). Caseless landscape centres on the whole screen.
- **Cell size.** Text mode (TTY) by default (`Tileset.java:57`). The font is 32 *device* px (`NHW_Map.java:719`), giving 18×32 device px cells. So the cell's size in dp depends on the phone's density.
- **Zoom.** One zoom level, shared by both orientations (`NHW_Map.java:676`). Pinch covers cell heights from 5 to 100 dp. Nothing fits the level to the glass.

**Web**
- **Tile size.** The tile is `clamp(floor(mapArea.h / 21), 12, 48)` (`web.js:297`), which uses the height only.
- **Placement.** The map is centred where it fits and otherwise follows the hero, kept to the level's edges (`placeView`, `web.js:300–321`).
- **Zoom.** Pinch or the mouse wheel stores an absolute tile size of 8–96 px that then applies to every window size (`web.js:410`, `:439`; `prefs.js:34`).
- **Look.** Tiles by default.

### 4.2 How much map each screen shows

Default preferences, case on (`map/map-area.stdout.txt`; web density rows from `report/numbers.txt`).

| screen | build | map area w×h dp (% of screen) | default cell | columns × rows shown of 80×21 | cell that would fit 80×21 |
|---|---|---|---|---|---|
| 896×443 | Android, density 2.4375 | 408×201.6 (20.7%) | text 7.4×13.1 dp | 55.3 × 15.4 | ~4.9 dp wide, font 9.5 dp |
| 896×443 | Android, density 1.625 | 408×201.6 (20.7%) | text 11.1×19.7 dp | 36.8 × 10.2 | font 9.8 dp |
| 896×443 | web, dpr 1 / 2.4375 / 1.625 | 408×204.3 (21.0%) | tile 12 (the floor; height rule gives 9), drawn at 12 / 11.9 / 12.3 | 34 × 17.0 / 34.3 × 17.2 / 33.2 × 16.6 | tile 5.1 |
| 443×939 | Android, density 2.4375 | 407×358.35 (35.1%) | text 7.4×13.1 dp | 55.1 × 21 | font 9.5 dp |
| 443×939 | Android, density 1.625 | 407×358.35 (35.1%) | text 11.1×19.7 dp | 36.7 × 18.2 | font 10.3 dp |
| 443×939 | web, dpr 1 / 2.4375 / 1.625 | 407×362.4 (35.5%) | tile 17, drawn at 17 / 16.8 / 17.2 | 23.9 / 24.2 / 23.6 × 21 | tile 5.1 |
| 640×360 | Android, density 2 / 3 (s 0.75) | 273×165 (19.6%) | 9×16 / 6×10.7 dp | 30.4 × 10.3 / 45.6 × 15.5 | font 6.6 dp |
| 640×360 | web | 273×168 (19.9%) | tile 12 (floor) | 22.8 × 14.0 | tile 3.4 |
| 360×640 | Android, density 2 / 3 (s 0.81) | 331×152 (21.8%) | 9×16 / 6×10.7 dp | 36.7 × 9.5 / 55.1 × 14.2 | font 7.5 dp |
| 360×640 | web | 331×156 (22.4%) | tile 12 (floor) | 27.6 × 13 | tile 4.1 |
| 1024×768 | Android, density 2 | 536×527 (35.9%) | 9×16 dp | 59.6 × 21 | font 12.5 dp |
| 1024×768 | web | 536×529 (36.1%) | tile 25 | **21.4** × 21 | tile 6.7 |
| 768×1024 | Android, density 2 | 732×443 (41.3%) | 9×16 dp | **80 × 21** (all of it) | font 16.7 dp |
| 768×1024 | web | 732×447 (41.6%) | tile 21 | 34.9 × 21 | tile 9.2 |
| 1366×768 | web | 878×529 (44.3%) | tile 25 | 35.1 × 21 | tile 11.0 |
| 1920×1080 | web | 1432×841 (58.1%) | tile 40 | 35.8 × 21 | tile 17.9 |
| 2560×1440 | web | 2072×1201 (67.5%) | tile 48 (the cap) | 43.2 × 21 | tile 25 |

**Could the whole level fit, legibly?** Our rule, not the code's: a text x-height of 12′ (0.2°) or more is comfortable and below 6′ is too small to play on. It uses viewing distances of 36 cm (phone), 40 (tablet), 50 (laptop) and 60 (desktop).
- **Phones:** no. Fitting all 80 columns needs about 5 dp cells, a 6.3–6.8′ x-height on Android and a 5 px tile on the web, below the web's 8 px zoom floor. This holds even with every piece of chrome removed (the fit cell only grows to 5.75 dp). On phones the goal has to be a readable cell that follows the hero.
- **Tablets:** marginal on Android (7.4′ in landscape, 9.9′ in portrait).
- **1920×1080:** yes. The fit tile of 17.9 px is 28.4′ tall; text mode's x-height at that fit is 12′. Yet the page shows 45% of the columns.

**How the builds behave on rotation:**
- **Android** keeps its cell size (one zoom level), so portrait simply adds rows.
- **The web** refits the tile from the new height. Tiles grow 42% (12 → 17) and show about 10 fewer columns.
- **On the web, more height means less map.** Taller glass gives bigger tiles and fewer columns. In landscape, removing the chrome and one message row gives T 15 and 30.7 columns, against 34 today (`map/map-area.json`, `lucasReclaim`).

### 4.3 Where your phone's screen goes (Android, case on)

`map/map-area.stdout.txt`. The web is the same except for its shorter message band (+2.7 / +4.1 dp of map height).

| part | landscape dp² | % | portrait dp² | % |
|---|---|---|---|---|
| map area | 82,238 | 20.7 | 145,847 | 35.1 |
| message band (2 / 3 rows) | 26,135 | 6.6 | 37,258 | 9.0 |
| status band (smoked glass; the map shows through) | 19,776 | 5.0 | 19,728 | 4.7 |
| glass insets and corners | 806 | 0.2 | 1,433 | 0.3 |
| hood lip (lamps, nameplate) | 11,544 | 2.9 | 11,102 | 2.7 |
| hood top / hood sides | 6,216 / 10,016 | 1.6 / 2.5 | 4,270 / 7,952 | 1.0 / 1.9 |
| case frame (margins round and between the wells) | 31,552 | 7.9 | 30,914 | 7.4 |
| keys | 139,908 | 35.2 | 108,444 | 26.1 |
| well space round the keys | 68,736 | 17.3 | 49,028 | 11.8 |

In one dimension, in dp:
- **Landscape, top to bottom:** margin 8, hood top 14, messages 63.4, **map 201.6 (45.5%)**, status 48, lip 26, margin 8, deck 66, margin 8.
- **Landscape, left to right:** margin 8, bank 210, margin 8, hood 16, inset 2, **map 408 (45.5%)**, inset 2, hood 16, margin 8, bank 210, margin 8.
- **Portrait, top to bottom:** margin 8, hood top 10, messages 90.65, **map 358.35 (38.2%)**, status 48, lip 26, margin 8, key row 56, margin 8, banks 318 (33.9%), margin 8.
- **Portrait, left to right:** margin 8, hood 8, inset 2, **map 407 (91.9%)**, inset 2, hood 8, margin 8.

**Landscape's map is no wider than portrait's.** Landscape has 453 dp more width than portrait. Of that, 436 dp goes to the two banks and their margins, 16 to wider hood sides, and 1 to the map.

### 4.4 Space the map could take back

Every item keeps every key its current size (`map/map-area.json`, `lucasReclaim`).

| landscape | dp | portrait | dp |
|---|---|---|---|
| hood top 14 → 0 | +14 h | hood top 10 → 0 | +10 h |
| lip 26 → 0 (the lamps need a new home) | +26 h | lip 26 → 0 | +26 h |
| top margin 8 → 0 | +8 h | top margin 8 → 0 | +8 h |
| hood-to-deck margin 8 → 0 | +8 h | hood-to-key-row margin 8 → 0 | +8 h |
| deck well 66 → 52, hugging its keys | +14 h | key-row well padding 2×10 → 2×2 | +16 h |
| hood sides 2×16 → 0 | +32 w | key row to banks margin 8 → 2 | +6 h |
| well-to-hood margins 2×8 → 0 | +16 w | bank well top padding 10 → 2 | +8 h |
| map insets 2×2 → 0 | +4 w | hood sides, side margins and insets | +32 w |
| **all case chrome** | **+52 w, +70 h** | **all case chrome** | **+32 w, +82 h** |
| status band compact / hidden (existing setting) | +13.5 / +48 h | same | +13.5 / +48 h |
| message band 2 → 1 row | +27.2 h | message band 3 → 2 rows (as in landscape) | +27.2 h |
| remove the deck (5 keys move into the banks; affects parity) | +82 h | fold the key row into the banks (8 keys move) | +64 h |

What these buy:
- **Landscape, all chrome removed:** 460×271.6 dp, 31.5% of the screen. On Android at density 2.4375 that is 62×20.7 cells (all 21 rows with compact status lines). On the web it is T 13, about 35 columns.
- **Portrait, all chrome removed:** 439×440.3 dp, 46.5% of the screen.
- **The status band is already see-through.** Centring the map under it would add 48 dp with no settings change.
- **Caseless mode today:**
  - Android landscape centres the map on the whole screen.
  - The web's caseless landscape fits T 21 over the whole window and shows 42.7 × 21, with the map running under the wells at 65% tint (`web-code-scripts/out/geometry.md`).

### 4.5 A tap bug on real phones (web)

Found by the web verifier. I re-checked it in the source:
- `renderMap` draws each cell at `Td = round(T × dpr)` device pixels (`web.js:327`), which is `Td/dpr` CSS px.
- `placeView` (`web.js:301`) and the tap handler (`web.js:431`, `floor((x − view.left) / view.T)`) both use T.
- So the drawn grid and the tap grid drift apart by `(Td/dpr − T)` per column (`report/numbers.mjs`):

| your phone, web | dpr | T | drawn cell px | drift at column 79 | columns where a tap on the drawn centre hits another cell | measured live |
|---|---|---|---|---|---|---|
| landscape | 2.4375 | 12 | 11.90 | −8 px | columns 59+ (21–22 of 80) | pixels: `verify-web/dpr-check.json` |
| portrait | 2.4375 | 17 | 16.82 | −14 px | columns 47+ (33 of 80) | 8 of 8 taps on columns 66–79 read one cell to the left (`verify-web/tap-drift.json`) |
| portrait | 1.625 | 17 | 17.23 | +18 px | columns 37+ (43 of 80) | pixels: `dpr-check.json` |
| landscape | 1.625 | 12 | 12.31 | +24 px | columns 19+ (61 of 80); up to 2 cells off, some taps dropped; rows 19–20 too | formula only, not run live |

Tapping the map makes the hero travel there, so a wrong cell is a real move. It happens at any dpr where T × dpr is not a whole number; Windows' 125% and 150% scaling are examples. The captures (dpr 1) could not show it.

---

## 5. Large screens

### 5.1 The voids, measured

From the web captures (`web/summary.json`) and the formula traces (`web-code-scripts/out/geometry.md`). Empty case is the case with no key on it; the number in brackets is the part inside the key wells.

| viewport | keys % | empty case % (wells) | drawn map % | columns shown | left well: empty above / below the middle row (dp) | right well: empty middle (dp) | deck gap between FLICK and LOOK (dp) |
|---|---|---|---|---|---|---|---|
| 896×443 (your phone) | 35.25 | 32.26 (17.34) | 20.97 | 34 | 25 / 25 | 40 | 14 |
| 1024×768 | 18.49 | 37.70 (26.48) | 35.78 | 21.4 | 188 / 188 | 365 | 36 |
| 1366×768 | 13.86 | 32.50 (22.0) | 43.94 | 35.1 | 188 / 188 | 365 | 378 |
| 1920×1080 | 7.01 | 27.20 (19.22) | 58.01 | 35.8 | 344 / 344 | 677 | 932 |
| 2560×1440 | 3.94 | 22.28 (16.06) | 56.66 | 43.2 | 524 / 524 | 1037 | 1572 |
| 768×1024 (portrait) | 15.28 | 30.26 (7.09) | 41.05 | 34.9 | gap between the banks: 332×318 dp = 13.4% of the screen | | |

- **Well space grows in area, not in share.** 68.7k dp² on your phone, 208k at 1024×768, 231k at 1366×768 and 398k at 1920×1080. At 1920×1080 each side well is 210×1064 dp and about 73% empty, and so is the 1468×66 deck.
- **Dead glass at 1440p.** At 2560×1440 the 48 px tile cap leaves 11% of the screen as empty glass.
- **Text bands.** The message text is 19.15 px and the status text 14.2 px at every size. A message row holds about 47 characters on your phone, 103 at 1366 wide, 168 at 1920 and 245 at 2560, in 2 rows (`web-code-scripts/out/lineLength.txt`).
- **Drawers** open as a 604×342 panel (landscape) at any window size, and scroll (`overlay.js:1841–1842`).
- **Key size.** On a desktop monitor, the 58 px keys are 13–16 mm and sit in the far corners, to be aimed with a mouse.

### 5.2 Causes in the code

1. **The case never grows past its design size.** `s = Math.min(1, …)` (`overlay.js:385`). Android caps it at the Control scale setting, at most 1.2 (`RhTheme.java:669–672`). Beyond design size every extra dp goes into gaps and glass. Android at 120% on the 1024×768 tablet only shrinks the gaps from 188/188/365 to 148/148/284 dp (`web-code-scripts/out/android.md`).
2. **Every control is pinned to a window edge or corner.** All placement goes through `tl/lb/rb/tr/cb` and `X/Y` (`overlay.js:505–511`; Java `boxLB/box/centredLB`, `RhOverlay.java:4894–4930`).
   - The landscape side wells run the full height (`overlay.js:533–534`). Keys hang from their tops or stand on their bottoms.
   - The left well's middle row centres itself in what is left (`placeRow2`, `overlay.js:756–762`).
   - The right well has nothing in its middle.
   - Empty height is `DH − 393` in the left well (split above and below the middle row) and `DH − 403` in the right well.
3. **The deck pins COMBAT, pin 2 and FLICK to its left end, and LOOK and the context key to its right end.** See `termAttackSlot` (`overlay.js:1014–1023`) and `termStripBox` (`:1658–1664`). The strip keys stop growing at 170 dp (`:1656`), so the gap between the two groups is `DW − 648 − 2 × stripW`.
4. **In portrait the banks are pinned to the bottom corners** (`overlay.js:525–528`). The gap is `DW − 436`, and only the key row stretches (`:495–501`). There are no large-screen resources on Android: no `values-sw600dp` and no `smallestScreenWidthDp` check anywhere.
5. **The map fits the level's height, never its width** (`web.js:297`). The level is 3.81:1, while tablet and desktop map areas are 1.0–1.7:1, so every landscape screen crops the sides and follows the hero. The glass's shape comes from whatever the banks leave (`overlay.js:468–476`), not from the level's 80:21.
6. **Fixed text and panel sizes.** The message band (`overlay.js:46–79`), the status font (`web.js:276`, `:674`), the drawer (`:1841–1842`), modals (at most 920 px wide, `rolehack.css:253`) and the on-screen keyboard (at most 680 px, `rolehack.css:390–391`) do not grow.
7. **Tiles are never whole multiples of 16 source pixels.** The 40 px tile at 1920×1080 is a 2.5× scale, so pixel rows come out uneven. Only 5 of 36 screen and dpr pairs checked were whole multiples (`web-code-scripts/out/physical.md`).

The other direction, small phones:
- **Width binds at 640×360.** `T_MIN_HOOD = 400` (`overlay.js:29`) makes the landscape case need 852 dp at 58 dp keys, so a 640×360 phone gets s = 0.751 and 43.6 dp movement keys.
- **A smaller key preference makes the keys smaller still.** At 46 or 52 dp, the right bank's fixed 411 dp stack sets the height, so the fit shrinks them to 37.7 or 40.8 dp. No setting reaches 46 dp at 640×360 or 720×360 (`web-code-scripts/out/smallphone.md`).

---

## 6. What the web knows about the viewer

| signal | read today? | where | what it is used for |
|---|---|---|---|
| window size | `innerWidth`, `innerHeight` | `overlay.js:373` | scale, design size, orientation, on every `resize` (`:344`, no debounce) |
| orientation | `H > W` | `overlay.js:378` | landscape or twin pads. CSS uses height ≥ width (`rolehack.css:332`), so a square window gets both. |
| a size class (compact, medium, expanded) | no | — | — |
| pointer and hover (`matchMedia('(pointer…)')`, `(hover…)`, `e.pointerType`) | **no** | — | mouse, pen and touch all get the same gestures: hold for layers, drag for the flick |
| touch points | `maxTouchPoints > 0` | `overlay.js:62` | only the iOS text-size probe |
| physical keyboard | not detected, on purpose: the on-screen keyboard is "chosen, never guessed" (`prefs.js:36–39`) | `web.js:133–167` | typed keys go to the game; the layout never changes |
| devicePixelRatio | yes | `web.js:285`, `:326–327` | canvas size and drawn tile (the source of the §4.5 bug); nothing listens for a dpr change without a resize |
| safe areas | **no**: no `viewport-fit=cover`, no `env(safe-area-inset-*)` | `index.html:5` | — |
| `visualViewport`, `screen.orientation` | **no** | — | — |
| OS text size | `osTextScale()` probe | `overlay.js:50–71` | the message band only; keys, the status band, drawers and modals ignore it |
| the player's screen, for you | **no telemetry** | the page fetches only `tiles.json`, `build.json`, `defaults.nh` and a sound | the site is on GitHub Pages, which has nothing to report to |

**What the browser offers but the page ignores** (media features in `web/<W>x<H>.json`, key `media`):
- The mouse runs report `pointer: fine`, `hover: hover` and 0 touch points.
- The touch runs report `pointer: coarse`, `hover: none` and 1 touch point.
- So 1366×768 touch and 1280×800 mouse get the same layout, and a keyboard-and-mouse player gets all 36 thumb keys.

**What a mouse or keyboard player gets and lacks** (`web-code.md` §2):
- **Gets:** pointer and crosshair cursors, wheel zoom, click-to-travel. Arrows and hjkl reach the game. Esc closes the overlay's pop-ups.
- **Lacks:**
  - hover or tooltips on keys;
  - right-click handling (from the code, a right-click on the map also travels and opens the browser menu; not tested);
  - any keyboard route to the overlay's own features (layers, drawers, MENU/WORLD/GAME, macros, flicks, the context key, Rest chips);
  - a layout without the thumb case.

**Other gaps that bear on "serve the right controls for the screen":**
- **Every resize rebuilds the whole overlay.** `resetState()` (`overlay.js:395–398`) closes open layers and drawers and drops an armed Fight or an assignment in progress. A browser toolbar showing or hiding does this mid-game.
- **The PWA keeps the system status bar** (`manifest.json:8`, `"display": "standalone"`). In a normal browser tab on your phone, assuming 24 + 56 dp of browser bars, landscape shrinks to 896×363 and s = 0.875, so the 58 dp keys become 50.7 dp. The bar heights are an assumption (`verify-web/viewport-loss.txt`).
- **The zoom is an absolute pixel size.** It carries across window sizes and ignores the fit (`prefs.js:34`).

**Where a size-and-input-aware layout would plug in** (`web-code.md` §5):
- `overlay.js:372–393` (`rebuild()`): the one place that reads W and H and sets s. The `data-layout` attribute written at `:383` is not read by any CSS yet.
- `overlay.js:448–476` (the design size and glass edges) and `:514–548` (`buildCase`): where each layout's case is built.
- `web.js:258–321` (`layoutGlass`, `tileSize`, `placeView`): the map fit.
- `web.js:133–167` and `:389–441`: keyboard and mouse handling.
- `rolehack.css` and `index.html:5`: CSS size queries and safe areas.
- On Android: `RhOverlay.updateFitLimit`/`onSizeChanged` (`RhOverlay.java:589–638`) and `RhTheme.uiScale` (`RhTheme.java:612–672`).

---

## 7. Constraints any redesign must respect

### 7.1 Design rules, and where the code states them

| rule | source |
|---|---|
| Never move a control that has motor memory on it; never reflow by game state. Look and Search never move ("a control that changes position with game state is what the spatial-memory work says not to build", Scarr, Cockburn & Gutwin 2013). | brief; `RhOverlay.java:1751–1753`; `RhMessagePanel.java:21`; `rolehack.css:277` |
| Movement keys 46 / 52 / 58 dp, default 58 (Parhi, Karlson & Bederson's 9.2 mm) | `RhPrefs.java:62–69`; `prefs.js:28`; `overlay.js:1970` |
| Flick wedges at least 60°, so at most six directions (Lai & Zhang: 36° worst, 45° worse than 60°) | `RhOverlay.java:84–87`; `RhCommands.java:586–596` |
| Layers, not fans: nothing pops over keys. Holding a hub turns the pad into its nine places; the centre is ALL (its drawer). | `RhOverlay.java:2738–2748` |
| Pray stays off every layer; SACRIFICE/PRAY sit deliberately out of easy reach | `RhCommands.java:497–500`, `:666`; `RhOverlay.java:4170–4173` |
| SEARCH is on the right, under the thumb that is not walking, so steps and searches alternate thumbs | `RhOverlay.java:1753–1754` |
| All skins (Terminal, Terminal light, GameCube) and caseless mode keep working | brief; `overlay.js:380`, `:1951` |
| Phones 640 to 915 dp wide | brief |

### 7.2 Facts in the code the redesign has to work with (or change on purpose)

- **Two implementations.** `RhOverlay.java` and `overlay.js` agree within 0.6 dp today. A new layout has to land in both, or in a shared spec both read.
- **One scale for the whole case.** `s = min(cap, max(0.7, min(W/needW, H/needH)))` shrinks the movement pad with everything else. A 46 dp floor for the pad cannot hold on small phones unless the pad's size is taken out of `s`.
- **What sets the design size.** Landscape needs `2 × (8 + bank + 8) + 400` wide (852 at 58 dp keys). The right bank's fixed 411 dp stack sets the height at 46 and 52 dp keys. Portrait needs 442×742 at 58 dp. These are where the small-phone shrink comes from.
- **Layers always paint on the left pad** (`paintLayer`, `RhOverlay.java:2773`). A hub can move without moving its layer's nine places. So a hub's own position is the only motor memory that moving it costs, and which thumb owns COMBAT decides whether arming and aiming share a thumb.
- **The flick's directions are screen-fixed** (`FLICK_BEARING = {-85°, -40°}`). If the flick key changes thumb, the bearings would need mirroring to keep the same thumb motion. Mirroring them keeps each wedge at 60°.
- **Count-chip rows are 236 dp (web 244) wide and anchored to their key** (`RhOverlay.java:4082–4085`). Any key that gets a chip row needs 236 dp of clear space above it that is not over the pad.
- **Drawers are 604 dp / 4 columns or 420 dp / 3 columns** (`RhDrawer.java:46–59`). Keeping item positions across orientations means one column count.
- **The message band text is sized in true dp and does not scale with s.** The target is 0.25° at 36 cm, about 9.9 dp of x-height; Android uses 10 and the web 9.5. Rows: 2 in landscape, 3 in portrait. The status band is 48 dp × s and see-through.
- **Map cells.** Android's text cell is 18×32 *device* px, so its dp size depends on density, and there is one zoom for both orientations. The web's tile follows the map's height, and its zoom is an absolute pixel size. Any "same map on rotation" goal has to deal with both.
- **Orientation rules differ.** Android uses `Configuration.orientation`; the web uses `H > W`; the web's CSS uses height ≥ width.
- **Rebuilds are destructive** on both platforms (`overlay.js:395–398`; `RhOverlay.onSizeChanged` → `rebuild()`, `:589–605`). A layout that changes with window size must not change under a player's finger. That includes browser toolbars, split screen and folds.
- **The movement pad is the one thing already at full parity.** It sits at the same place in the bottom-left corner in both orientations, 113 dp in and 113 dp up to the centre key at 58 dp. DROP, pin 1 and the equipment grid are within 3.7 mm.

### 7.3 Rules the current build already breaks

The redesign should fix these, not inherit them.

| rule | breach today | where measured |
|---|---|---|
| movement keys ≥ 46 dp | 43.6 dp at 640×360 (58 dp preference); 37.7 dp if the player picks 46; 41.7 dp at 360×640 with 46 | `web-code-scripts/out/smallphone.md`, `web/640x360.json` |
| never move a control that has motor memory | the 5 thumb switches and 8 moves over 10 mm in §3; drawers reflow between orientations; the portrait key row's keys change width with the window (40.5 → 81 dp; by window size, not game state) | `parity.json`; `RhDrawer.java:46–59`; `overlay.js:495–501` |
| layers, not fans: nothing pops over keys | portrait: chip rows cover pad ↗ u and → l by 19 dp (27 on the web); flick nodes cover Put on, Remove, Swap; the pad-centre radial covers M1, DROP, pin 1, Take off, pin 2, COMBAT, INVENTORY | `parity.md` pop-up table; `android/portrait.json` |
| pop-ups stay on screen | portrait flick ring runs 17 dp past the right edge; at 46 dp keys its up-right node is about 0.5 dp off screen | `android/portrait.json` |
| SACRIFICE/PRAY out of easy reach | under the corner-thumb model it is 53.1 mm away in landscape and 47.0 mm in portrait, inside the comfortable band and nearer than REST, MSGS and the top-right keys | `parity.json` |
| touch targets not tiny | the landscape INVENTORY bar is 28 dp (4.4 mm) tall; portrait key-row keys are 40.5×36 dp on your phone and about 32×29 dp at 360×640. There is no rule for non-movement keys in the repos; these are the smallest targets. | `android/landscape.json`, `android/portrait.json` |

---

## 8. Open questions

For Lucas:
1. **What is your phone's screen resolution or density** (Settings > About phone, or `adb shell wm size` and `wm density`)? It decides how many map cells Android shows (55 or 37 columns in landscape) and which version of the web tap bug you hit.
2. **How do you play the web build on the phone:** browser tab, installed app, or fullscreen? In a tab, landscape probably loses about 80 dp of height, and the keys shrink to about 51 dp.
3. **Which thumb should own combat** (COMBAT, its pins, the FLICK key) in both orientations? The walking thumb (landscape today: arm and aim on one thumb) or the other thumb (portrait today: arm with the right, aim on the left pad, like INVENTORY, EAT and APPLY)?
4. **Is the corner-pivot thumb model right for your grip?** Do you hold portrait with two thumbs from the bottom corners? Our 60–75 mm stretch band is the brief's figure, and the repos hold no reach data.
5. **Which keys do you actually use most?** Our tiers are guesses. Real counts would settle the parity ranking. They could be counted on the device, since nothing is sent anywhere today.
6. **Do you want to learn web players' screen sizes?** That needs a place to send them (GitHub Pages cannot receive data) and a privacy decision. The alternative is a size-and-input rule decided on the device with nothing sent.

For the designers:
7. **On large screens, should the whole level be shown?** 1920×1080 fits all 80×21 at a readable tile. Should tiles snap to whole multiples of 16? Should the zoom be stored relative to the fit, not in pixels?
8. **On tablets and laptops, what posture is the target:** two hands at the corners, the device on a table, or a mouse? The corner-thumb model puts 16 keys beyond reach on a 1024×768 tablet in landscape.
9. **On a 640×360 phone, which gives way:** the 46 dp key floor, or the glass? Today the glass wins and the keys fall to 43.6 dp.
10. **Should the drawers keep one column count in both orientations?**
11. **Should the message band have a maximum line length on wide screens** (it runs 168 characters a row at 1920)? Should the status band follow the OS text size?
12. **Which message-band size should both builds use**, 10 dp (Android, closer to the 0.25° target) or 9.5 (web)?
13. **How should a keyboard-and-mouse player get to layers, drawers, macros and flicks?** Should the thumb case hide when a physical keyboard is in use?
14. **Needs a device test:** what a real touch laptop reports for `pointer` and `any-pointer`, and whether the bottom keys clear the iOS home indicator and Android display cutouts.

---

## Files

| folder | what |
|---|---|
| `android/` | landscape and portrait models (`landscape.mjs`, `portrait.mjs`), their JSON, SVG/PNG layouts, the web cross-checks, portrait parity |
| `web/` | 16 viewport captures (`.png`, `-annotated.png`, `.json`), `summary.json`, `parity.json`, capture scripts (`setup.mjs`, `capture.mjs`, `parity.mjs`, `table.mjs`, `common.mjs`) |
| `web-code.md`, `web-code-scripts/` | the web sizing code audit and its formula scripts and outputs |
| `map/` | `map-area.mjs`, `map-area.json`, `map-area.stdout.txt`, `ttf.mjs`, cross-checks |
| top level | `parity.mjs`, `parity.json`, `parity.md`, `parity-thumb-frames.svg/.png` |
| `verify/` | independent Android geometry and parity checks (Python) |
| `verify-web/` | independent web and map checks, the density runs, `tap-drift.json`, `viewport-loss.txt` |
| `report/` | `numbers.mjs` (re-run with `node numbers.mjs`), `numbers.json`, `numbers.txt`, `robust_taps.out.txt` |
