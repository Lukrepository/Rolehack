p='DESIGN.md'
s=open(p).read()
n=0
def rep(old,new,count=1):
    global s,n
    assert s.count(old)>=1, old[:90]
    s=s.replace(old,new,count); n+=1
rep("- **Bottom insets** (the home indicator) are ignored for the banks under `auto`. The bottom row takes only taps; an upward swipe from the very edge still goes home.",
    "- **Bottom insets** (the home indicator) are ignored for the banks under `auto`. The bottom row takes only taps; an upward swipe from the very edge still goes home.\n- **`anchor: 'safe'`** honours the bottom inset too. With grip lift, the inset's share and the lift are clamped together against the window, so no key ever leaves the screen. On an iPhone 12 mini in landscape with 40 dp of lift, REST was at y −7 in round 1 and is at 4 now. `safe` already gives up parity, so the clamp may differ between orientations.")
rep("every former fan is a pad layer; the flick legend, the layer name pill and the drawer lie inside the map; 0 pop-ups over keys in the 2,862 layouts of the sweep's sections 1–9 |",
    "every former fan is a pad layer; the flick legend, the layer name pill and the drawer lie inside the map, which no usable layout lets touch a key; 0 pop-ups over keys in the sweep's sections 1 and 3–9 |")
rep("| phones 640 to 915 dp wide | the sweep covers 344 to 997, and short sides down to 200 |",
    "| phones 640 to 915 dp wide | the sweep covers phones 344 to 997 wide, foldables and split views, dense grids of windows (480–1000 × 600–960, 1000–2000 × 320–480, every near-square window 320–520), and short sides down to 200; a window with no room for twin banks and a map gets classic |")
rep("6. **The right bank's columns pay for the 24 dp gap.** At 360 dp they are 44.7 dp wide; with 46 or 52 dp keys they narrow before the margins and pad gaps do, as asked.",
    "6. **The right bank's columns pay for the 24 dp gap.** At 360 dp they are 44.7 dp wide at a 47.7 dp pitch (today 53.7); with 46 or 52 dp keys they narrow before the margins and pad gaps do, as asked. The cost is inside the action pad: COMBAT → CONTEXT 2.6% at 360 against today's 1.7%, even with the 8 dp seams. Its costly outcome, a change of level, now takes a second tap (§6, §8).")
rep("9. **The header over the banks is rare.** Landscape phones leave the corners over the banks empty (11.4% void on Lucas's phone) rather than squeeze keys for text.",
    "9. **The header over the banks is rare.** Landscape phones leave the corners over the banks empty (10.2% void on Lucas's phone, today 10.7%) rather than squeeze keys for text.\n10. **Near-square windows get classic.** A window with no room for twin banks and a map that shows 8×8 cells and holds the drawer (Lucas's phone in split screen, squares under about 650 dp) shows classic until it grows (§12). The layout setting stays twin.\n11. **From CONTEXT, the stairs take two taps** (§8). Today's CONTEXT descends on one tap on bare stairs; the pad-centre slide still does it in one gesture.")
rep("**What does not change from today:** Pray is still a 380 ms hold of the key that offers; T and R now always ask which item (they asked whenever two items applied).",
    """**What does not change from today:** Pray is still a 380 ms hold of the key that offers; T and R now always ask which item (they asked whenever two items applied).

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
  - In landscape that spot is now REST. Its 360 ms hold opens the count layer, which closes on lift, so the habitual y on ↖ walks the hero north-west, perhaps at low HP. In portrait the spot is GAME, and the y walks the same way.
  - During the switch, a hold of 380 ms or more there flashes an arrow to SACRIFICE, and the next pad tap within 1.5 s is swallowed.
  - SACRIFICE is the left bank's top inner key (61.8 mm), and Pray is still its 380 ms hold.""")
open(p,'w').write(s)
print(n)
