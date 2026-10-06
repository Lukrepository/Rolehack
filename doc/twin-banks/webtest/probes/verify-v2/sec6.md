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
     - A hold of 380 ms or more on the old SACRIFICE spot (REST in landscape, GAME in portrait) flashes an arrow to SACRIFICE. The next pad tap within 1.5 s is swallowed, so the habitual y on ↖ cannot walk the hero.

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

