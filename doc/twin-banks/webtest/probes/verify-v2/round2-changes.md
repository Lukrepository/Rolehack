### Round 2: the second verifiers (2 October 2026)

Two more verifiers checked round 1, one the rule and one the behaviour and the spec. Every blocker and major issue held up when re-checked and is fixed, and so are the minor ones. Lucas's decisions of 2 October stand: Long rest swiped up, an empty pin's tap opens its picker, the free drag that locks only at rest, Pray on the 380 ms SACRIFICE hold, and "Layout: twin banks / classic" defaulting to twin. Nothing moved on Lucas's phone: 0 thumb switches, 0 moves, 36 of 36 both ways, every control where the final put it.

**What changed in the rule (round 2)**
1. **The glass ranking.** "All 21 rows" now means within half a cell of them, and it outranks more cells only while it shows at least 70% of the rival's cells. 960x600 keeps its 34×21 column (714 cells against the strip's 993, 0.72). The Pixel Fold inner screen (841x701) gets 68.8×21 at full width instead of a 33×21 column, and the iPad mini split half (561x744) 46×20.6 instead of 10×21.
2. **Smaller keys never show less, by construction.** When the ranking's own pick at 46 or 52 dp keys would show fewer cells or less map than the next larger key size, the larger size's glass (its kind and its message rows) is laid out at the smaller keys instead. Smaller keys also never make the bank stand taller: the bottom offset, then the pad gap, hand back the excess. 0 of 1,068,435 windows (280–2400 dp, step 2) show less at a smaller key size.
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

**The gate (round 2):** `checks/sweep.mjs` runs 53,625 layouts in ten sections with 0 issues. That includes 2,715 unusable results, all in sections 7 and 10, where they are allowed. On round-1 v2 (`../v2-round1/layout.js`) the gate reports 5,331 issues in six sections; on the final, 11,217 in all ten.

Rule verifier (`verify2/`):

| # | issue | outcome |
|---|---|---|
| R1 | major: ranking "all 21 rows" strictly first picks a column about 120 dp wide over a full-width map; smaller keys can then show less | **Fixed** (rule items 1, 2). Map share at 58 / 52 / 46 dp keys, with the round-1 figures:<br>• 561x744: 32.8 / 33.4 / 33.4% (58 dp was 7.3%)<br>• 540x720: 30.6 / 33.0 / 34.5% (52 dp was 8.8%)<br>• 841x701: 35.9% at every size (58 dp was 17.1%)<br>• 829x690: 34.9 / 36.2 / 36.2% (58 dp was 17.1%)<br>The verifier's `mono.mjs` finds 0 of 1,068,435 windows (step 2) where the map shrinks; it found 238 of 66,789 at step 8. `cells.mjs` finds 0 of 39,055 windows under 70% of the final's cells and area (was 519). Sweep §2 adds a dense grid, 480–1000 × 600–960 dp at step 8 in every variant, and §1 adds 540x720, 561x744, 690x829 and 701x841. |
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

