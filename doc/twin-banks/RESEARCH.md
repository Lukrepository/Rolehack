# Rolehack layout redesign: research brief

29 September 2026. For Lucas and the redesign team.

**How to read this brief**
- Numbers in brackets are references; the list is at the end. A **†** after a number means that source was read as an abstract only.
- Every research claim here was fact-checked. Where the checker corrected a claim, this brief uses the corrected wording.
- "The audit" means the measured audit of the current build (`AUDIT.md`, beside this file). Its numbers describe Rolehack today. They are measurements, not research. A § number next to "the audit" points to the audit's sections; any other § number points to this brief.
- "Derived" marks arithmetic done for this brief from cited figures. Units: 1 dp = 1/160 in = 0.159 mm, and on Android phones 1 CSS px = 1 dp [1].
- Confidence: **strong** = several primary sources agree, or a direct measurement applies closely. **Moderate** = primary guidance or single studies agree, but applying them to Rolehack needs an inference. **Weak** = inferred, second-hand, abstract-only, or the sources conflict.

---

## 1. The question

> "How should a two-thumb touch interface for a roguelike with a fixed 80x21 grid map be laid out so that (1) every control keeps the same hand, reach and bearing when a phone turns between landscape and portrait, so muscle memory carries over; (2) the map gets as much of the screen as possible while the movement pad stays comfortable and reliable, without shrinking its keys much; and (3) the same placement rule extends dynamically to tablets, touch laptops and mouse-and-keyboard desktops, with no empty voids, and with the web build detecting the viewer's window size and pointer type and serving controls in the right proportions? What do research on thumb reach and grip, touch-target size, spatial and motor memory, responsive and adaptive layout, and game-UI scaling say, which real screen sizes and resolutions should it be designed for, and how have real games solved fitting an interface to any screen size?"

---

## 2. The answer in one page

**The placement rule.** Each control belongs to one thumb, for good. Each thumb's controls form one bank with a fixed arrangement and a fixed physical key size. The bank is anchored to the bottom corner that thumb holds, at the same offset in every orientation. The map takes the rectangle that is left. On bigger screens the extra space goes to the map, up to a comfortable cell size, and then to always-visible information panels. It never goes to bigger keys or moved keys. The layout tier comes from the window's width and height and from the input the player last used, never from the device type.

This is the rule Apple's 2026 Touch Controller framework uses: groups of controls keep "a consistent size and distance from" their anchor as the device shape changes [2, 3]. Microsoft's Xbox touch guide says comfort is "almost radial" from the grip [4].

| Part | What the rule says | Confidence | Main evidence |
|---|---|---|---|
| **Parity** | 1. One owner thumb per control, in every orientation and on every device. | Strong on the direction of the effect. The size of the cost on a phone is unmeasured. | Swapping hand roles slows skilled work [5]; consistent key-to-finger mapping predicts expert speed [6†]; keep commands on the same side [7]; a shifted direction overlay made a NetHack player hit their pet [8] |
| | 2. The same arrangement and order inside each bank. | Moderate | Learned layouts survive scaling but not reflow [9†]; split keyboards keep skill because the layout is unchanged [10] |
| | 3. The same distance and bearing from the corner anchor. | Moderate as a platform rule. Weak as a claim that the thumb then makes the same joint movement. | Platform guidance [2, 4, 11]; grip posture differs between grips and no study measured two-thumb portrait [12†, 13†, 14†] |
| | 4. Directions follow the map: screen-up is map-north in both orientations. Command flicks stay on their thumb. | Moderate | A rotating d-pad kept its directions matched to the display [15]; the audit's FLICK analysis (§3.4) |
| **Map size** | 5. Keep the movement pad at 58 dp (9.2 mm) by default. Win map space elsewhere. | Moderate | One thumb study plus guidance that agrees [7, 16, 17]; the costs of 52 and 46 dp are model estimates [18] |
| | 6. Take space from case chrome, text bands and rare keys first. | Strong (measured) | The audit: 52 dp of width and 70 dp of height in landscape with no key changed (§4.4) |
| | 7. On phones, pan a map viewport at a readable cell size, with an overview on demand. Do not force all 80 columns. | Weak | The only readability floor is for running text, from a secondary source [19]; WCAG allows 2-D scrolling for maps and games [20] |
| **Any screen** | 8. Pick the tier from width and height classes. A landscape phone is "compact height". | Strong | [21, 22, 23] |
| | 9. Keys keep phone physical size on tablets and laptops. | Moderate | [2, 24, 25, 26†] |
| | 10. Fill large windows with panels in priority order, in their own area. Never move a key to make room. | Weak to moderate: precedent only, no comparison study | [27, 28, 29, 30, 31, 32†] |
| | 11. Tablets: anchor to the side edges at an adjustable grip height. | Weak: the sources disagree on where tablet thumbs rest | [7, 33, 34, 35†] |
| | 12. Web: offer touch keys when any touch pointer exists; switch on the input actually used; keep a key-size setting because physical size is unknowable. | Strong on the facts. The switching policy is untested. | [36, 37, 38, 39, 40] |

**What the evidence does not give.** No study we could read measures two-thumb reach in portrait against landscape. None sets a floor for reading map glyphs. None says how far a learned key may move before experts slow down. None tests an on-screen 3x3 pad in a game grip. Section 10 lists how to settle each, mostly with a test on Lucas's phone.

---

## 3. Hands and reach

### 3.1 Where the thumbs sit

No study we could read measured where the thumbs sit in a two-thumb portrait grip, or compared it with a two-thumb landscape grip on the same phone. Most measured reach data is one-handed, portrait and right thumb.

| Grip | What is known |
|---|---|
| Phone, two hands, landscape | A two-handed landscape grip gave 9% higher throughput, 7% faster moves and 4% more precise taps than a one-handed portrait grip. Device movement was 36-63% lower, and the wrist and thumb were more extended. 10 right-handed users. The abstract does not say both thumbs tapped, and there was no two-handed portrait condition [12†]. |
| | Comfortable regions are "almost radial" from the grip point. Thumbs reach only so far toward the centre. The bottom-centre zone is the least used. Players often move their control wheels lower [4]. |
| | For slates held in two hands, the lower corners give quick interaction, anchored thumbs are more accurate, and the middle needs a change of posture [7]. |
| Phone, two hands, portrait or landscape | In thumb typing, two-hand portrait and two-hand landscape gave no extra stability or accuracy over one hand. Bigger targets did help [41†]. |
| | Good zones exist in both orientations. Landscape was faster, but only when users had not been primed with the target name [13†]. |
| | Touch offsets differ between two thumbs, one thumb and the index finger [42†]. |
| Phone grips in daily life (not games) | In a street study of about 1,300 people, 49% held the phone in one hand, 36% cradled it and used the other hand, and 15% used two thumbs [33]. Second-hand report. |
| One hand, portrait (most of the data) | The fastest, most comfortable regions are within easy reach of the thumb base. The corner under the thumb base is awkward because it is "too close". Fastest and slowest regions differ by 7-12% [43]. |
| | Karlson's one-handed comfort ratings fell from 6.4 on the smallest device to 3.0 on a PDA [24, 43]. Thumb throughput was a little better on smaller devices; the authors say a wider grip "could possibly" explain it [24]. |
| | Screen location had no significant effect on tap time or errors. Comfort did vary: the centre was rated 5.7 of 7, the top-left and bottom-left corners 3.7 [16]. |
| Larger phones, one hand | The grip moves toward the top edge as phones get bigger. This study measured fingers behind the screen, not thumb reach on it [44†]. |

### 3.2 A simple hand model anchored to the bottom corners

Use this as a working model, not a measured one. Its ring radii are the brief's and the audit's assumptions. The one published model that predicts the thumb's reachable area from device size, hand size and grip was read as an abstract only, so its coefficients are unknown [45†].

| Element | Value | Source |
|---|---|---|
| Anchor | The bottom-left corner for the left thumb, bottom-right for the right. The same corners in both orientations. | Bottom corners and sides are the places for controls [7]; controls are offsets from an anchor [2, 3] |
| A key's position | Distance *r* from the anchor in mm, and bearing θ (0° = inward along the bottom edge, 90° = straight up) | The audit's convention (§3.1); comfort is radial [4] |
| Too close | *r* under about 15 mm | The zone exists [43]. 15 mm is the audit's assumption. |
| Comfortable | 15-60 mm | The brief's and the audit's assumption |
| Stretch | 60-75 mm | The brief's figure |
| Regrip | beyond 75 mm | The audit's assumption. Regripping costs attention and risks a drop [43]; reach changes the phone's tilt and rotation [46†]. |
| Hand size | Scale the radii by 0.88-1.12 | ANSUR II hand length runs from 165 mm (5th percentile, women) to 210 mm (95th percentile, men), about ±12% [47]. The thumb study's users had thumbs 99-125 mm long [16]. |
| Handedness | About 1 in 10 | 9.6% of women and 11.4% of men in ANSUR II write left-handed (military sample) [47] |
| Best direction | Right thumb: the NE-SW diagonal (15.6 bits/s) beats E-W (13.8 bits/s, though E-W was the most precise at 3.6 mm). Outward beats inward (0.28 vs 0.30 s). The differences are small. Mirror for the left thumb. | [24, 43] |
| Near versus far | Adjacent keys (19.6 mm apart): 271 ms, 3.6 mm effective width. Far keys (40 mm): 337 ms, 3.8 mm. Throughput did not differ. | [24]; adjacent moves took 242-306 ms on every device tested [43] |
| Per-user fit | Let the player sweep each thumb along a diagonal to set a comfortable region. About 200 taps train a personal offset model. | [43, 48†] |

**What the model says about Lucas's phone (derived).**
- The phone is 896 x 443 dp, about 142 x 70 mm.
- In portrait each thumb owns half the width: about 221 dp, or 35 mm. A key more than 35 mm in from its side edge has no place at the same offset in portrait. It would land under the other thumb.
- In landscape the screen is 70 mm tall. Keys up to about 60 mm above the bottom edge stay inside the comfortable band.
- So the offsets that exist in both orientations fill a box about 35 mm wide and 60 mm tall at each bottom corner. That is about 3.8 x 6.5 keys of 58 dp.
- Two banks of 3 x 6 full-size keys (174 x 348 dp each) hold 36 keys. That is the current control count, pad included (the audit §3.2). The top row would reach about 58 mm up, at the edge of the assumed comfortable band. This checks that parity can fit; it is not a layout.
- With 3-key-wide banks, the landscape map could be about 510 dp wide, against about 440 dp in portrait.
- Today's pad centre sits 113 dp in and 113 dp up (the audit §7.2): *r* ≈ 25 mm at 45°. The ↙ key's centre is about 47 dp in and 47 dp up (the audit's rects): *r* ≈ 10.6 mm, inside the assumed "too close" zone. Because that zone's size is an assumption, this is worth testing.
- The audit found 16 keys beyond 75 mm of the corners on a 1024 x 768 tablet in landscape (§3.7).

### 3.3 What stays constant for a thumb when the phone turns

**What design can hold constant:** the owning thumb, each key's *r* and θ from its corner, the key size, and the bank's arrangement. Apple's framework does exactly this [2]. Android's engine guidance says to anchor each control and offset it by a margin, because absolute pixel positions land in different places on different screens [11].

**What probably changes, unmeasured:**
- Thumb and wrist posture. The two-handed landscape grip is more extended than a one-handed portrait grip [12†]. Nobody compared two-thumb portrait with two-thumb landscape.
- Where the good zones are. They exist in both orientations, but were not shown to coincide [13†].
- Touch offsets. They depend on posture [42†].
- The joint movement behind a flick. The direction of a movement relative to the gripping thumb changes selection time [14†, 24]. If the thumb comes in from the bottom corner in portrait but from the side edge in landscape, one on-screen bearing may be two different movements. No source tests this.

So hold the geometry constant and adapt what the player cannot see. A keyboard that adapted its hidden key classifier and kept a stable look sped up typing. One that also moved keys visually did not help [49†].

**Two edge effects break a constant offset.**
- **Safe areas.** In landscape, iPhones inset 47-62 CSS px on each side and 21 px at the bottom; the Pixel 7 insets 52 px on the right [50]. On Android the cutout may sit on a side edge in landscape [51]. Apple adds the insets to control offsets [2]. But the hand holds the physical edge. A landscape-only inset moves a bank about 7-10 mm relative to the thumb (derived, taking 1 CSS px ≈ 1 dp). The choice is to use the same inset in both orientations, which costs portrait width, or to accept the shift. The evidence does not say how much shift is tolerated (section 5).
- **System edge gestures.** Android reserves inward swipes from the side edges for Back. Taps there are fine. Flicks and drags near the edge compete, and the system honours at most 200 dp of vertical exclusion [52]. A 3 x 58 dp pad is 174 dp tall, so it would fit.

---

## 4. Key size and the movement pad

### 4.1 What 58, 52 and 46 dp are

| Key | Size | One-thumb study [16] | Windows 8, sized by error cost [7] | Modelled misses, relative to 58 dp [18] | Platform floors |
|---|---|---|---|---|---|
| 58 dp | 9.21 mm | Meets the 9.2 mm single-tap recommendation. Just under the 9.6 mm recommendation for repeated taps. | Meets the 9 mm class for costly errors and the 9 mm centre-to-centre rule. A gapless pad misses the 11 mm "total target" minimum. | 1x (99.73% success) | Above Android 48 dp [53], Apple 44 pt for frequent game controls [54], Windows 7.5 mm [55] |
| 52 dp | 8.26 mm | Below both recommendations. Above 7.7 mm, the size from which error rates in repeated tapping stopped differing. | Below 9 mm. A gapless 52 dp pad breaks the 9 mm pitch rule. | about 1.8x (99.52%) | Above 48 dp |
| 46 dp | 7.30 mm | Below 7.7 mm | In the 7 mm tier meant for errors fixed in one or two gestures | about 3.4x (99.08%) | Below Android's 48 dp (7.62 mm) and Windows' 7.5 mm |

Notes:
- The 1.8x and 3.4x are ratios from a model, not measurements. The model does not state whether it was calibrated on fingers or thumbs; thumbs are likely worse. Use the ratios, not the success rates [18].
- "7.6 mm for serial tapping" is a common mis-citation. The paper recommends 9.6 mm. 7.7 mm is only where differences stopped being significant [16].
- Windows 8 lists 9 x 9 mm in its table's *minimum* column, and the same page says "there are no definitive recommendations" [7].

### 4.2 What smaller keys cost

- **Speed.** On a gapless keypad, entry time differed between every pair of key sizes, even though the keypad scaled as a whole [16]. The authors think users take extra care with keys smaller than the thumb. Every step of a run pays this cost.
- **Errors.** Only the 5.8 mm keypad was significantly worse than keys of 9.6 mm or more, with 20 users [16]. So the extra error at 52 dp is probably small and hard to detect in a small test.
- **Wrong steps.** 95% of thumb taps on 9.6 mm targets landed inside a 9.1 x 8.9 mm box [16]. That is about one 58 dp key. On a gapless pad a stray tap is a step in the wrong direction, not a harmless miss (derived).
- **Grip does not rescue small keys.** Two-handed thumb typing gave no extra accuracy. Bigger targets did [41†].
- **Eyes on the map.** Soft buttons needed a glance on 98.8% of tasks [56]. Fully eyes-free tapping needed targets of 17.5-20 mm to cover 99% of touches, with a back-of-device technique [57†]. Eyes-free one-thumb tapping fell from 99.6% accuracy on a 2x2 layout to 85.0% on 4x4 [58†]. Typing on a split keyboard kept in peripheral vision was 28% faster than looking at it [59†]. So a pad used with the eyes on the map leans on peripheral vision and forgiving hit areas, not on key size alone.
- **Guidance agrees.** WCAG asks for larger targets when a control is used often, cannot be undone, sits near the edge, or is part of a sequence [17]. The movement pad is all four. Windows puts costly-to-fix targets at 9 mm [7] and asks for more than the minimum on often-pressed targets [55].
- **Map space is set by pitch.** Dropping the pad from 58 to 46 dp saves 36 dp per pad side (derived). Removing case chrome alone gives 52 dp of width and 70 dp of height in landscape (the audit §4.4).
- **The gap.** Every size study here is one-handed and portrait, mostly on a PDA. None tests an on-screen 3x3 pad in a two-thumb game grip with the eyes on the map.
- **The audit.** The build already breaks its own 46 dp floor on small phones. At 640 x 360 the movement keys are 43.6 dp with the 58 dp setting, and 37.7 dp if the player picks 46. One scale factor shrinks the whole case, pad included (the audit, short version item 9 and §5.2).

### 4.3 Spacing: pitch, not gaps

- With the pitch fixed at 58 dp, a dead gap lowers modelled success: 2, 6 and 8 dp gaps give 99.68%, 99.52% and 99.41%, against 99.73% with no gap [18].
- Browsers and platforms send a touch to the nearest target, so spacing can work as well as size [60]. Apple gives a thumbstick's hit area a whole half of the screen [2].
- Microsoft asks for 2 mm of padding and 9 mm centre-to-centre [7]. Apple suggests about 12 pt of padding around bezeled controls [61]. Inside a 3x3 pad, padding would cut pitch. Between clusters it costs little.
- One Shattered Pixel Dungeon player suggested that taps in toolbar gaps may land on the map and move the hero. This is one report, partly second-hand [62].

**Result:** draw the key wells, but let hit areas tile the pad with no dead space. Put padding between clusters, not inside the pad. Never let a tap meant for a key reach the map.

### 4.4 Edges and corners: the sources conflict

| Advice | Source |
|---|---|
| Run the outer keys to the screen edge. Taps in the outer column drift outward; bottom-row taps drift upward. | [16] |
| Put targets with severe error costs further from the edge, with more padding | [55] |
| Make targets near the edge larger | [17] |
| The corner under the thumb base is "too close" | [43] |
| Users wanted the largest targets in three corners (7.5-7.7 mm against 6.0 in the centre), but location had no significant effect on time or errors | [16] |
| Players move their wheels lower | [4] |
| The side edges also hold cutouts, safe-area insets and the Back gesture | [50, 51, 52] |

These do not reduce to one number. A reading that fits most of them (derived): inset the drawn keys; extend tap hit areas to the edge; keep keys that start flicks away from the side edges; set the pad's corner offset by calibration on the device.

### 4.5 Flicks and wedge sizes

| Directions | Wedge | Evidence |
|---|---|---|
| 4 | 90° | Even menu sizes (4, 8, 12) were the easiest to use blind. Up to 5 hidden slices cost little, even early in practice [63]. Vertical and horizontal thumb moves suit either hand; diagonals feel natural for one hand only [43]. |
| 6 | 60° | Not tested in any study we read. Six is above the 5-slice "little or no cost" size [63]. A study said to favour 60° over 45° and 36° (Lai and Zhang) could not be opened. |
| 8 | 45° | Easy as a compass layout [63]. Accuracy drops beyond 8 [64]. |
| more than 8 | under 45° | Avoid [64] |

- The marking-menu data comes from pens, mice and trackballs, not thumbs. Mean errors were 1.6% with the menu shown, 8.2% hidden and 9.4% when marking [63].
- For zigzag (compound-stroke) menus, 8 directions allow only 2 levels at over 90% accuracy. Menus of separate straight strokes reached 3 levels at 93% [64].
- On a phone with one thumb, axis-aligned marks were about as accurate as soft buttons (92.5-93.5% against 91.2%). Free-form paths gave 168% more errors [56]. Gestures needed a look at the phone on 3.5% of tasks, soft buttons on 98.8% [56].

Recognition rules the evidence supports:
- Classify a flick by the angle of the whole stroke. Fingers cannot draw straight lines well [65].
- Use direction only, with a minimum travel and no maximum, so a flick works at any key size [64].
- Tap or flick: Android's touch slop is 8 dp (1.3 mm). Windows 8 treats movement under 2.7 mm (about 17 dp) as a tap [7, 66]. A threshold of about 12-17 dp, set in physical units, sits between them.
- Android's default long press is 400 ms [66]. Hold-to-open layers can be tuned against it.

**The audit:** the FLICK key has two screen-fixed flicks at −85° and −40°. It moves from the left thumb in landscape to the right thumb in portrait. So "up-right" is an inward reach for one thumb and an outward sweep for the other (§3.4).

---

## 5. Motor and spatial memory

Position memory lasts. Finding items in a self-arranged layout was not reliably slower after four months away [67]. Every move throws that memory away.

### 5.1 What must stay fixed

| Keep fixed | Evidence | Strength |
|---|---|---|
| **1. The thumb that operates each control** | Reversing the hands' roles in a skilled task raised hard-task time from 2.33 to 3.09 s and errors from 43.9% to 61.1% [5]. A consistent key-to-finger mapping predicted fast typing [6†]. Windows 8: keep a command in the same relative position and on the same side of the screen [7]. A novice's marking-menu selection rehearses the expert movement [63], so moving a command to another thumb would split its practice (inference). | Strong in direction. The tasks were lab tasks and typing, not touch games. |
| **2. The arrangement and order inside each bank** | Learned layouts survived translation, scaling and perspective change, but not large rotations. A stable layout that scaled "dramatically outperforms" one that reflowed [9†]. Split-angle keyboards keep much typing skill because the key layout is unchanged [10]. WCAG requires the same relative order [68]. | Moderate. The key study is abstract-only; the keyboard point is from a review. |
| **3. The anchor corner and the offset from it** | Two hands form a frame of reference that works without looking: 16.6 mm error against 32.6 mm with one hand [69]. That was a 3D prop task, not thumbs. Comfort is radial from the grip [4]. Apple and Android anchor controls to corners at fixed offsets [2, 11]. | Moderate, and inferred for thumbs |
| **4. What each direction means** | Hinckley et al. rotated their d-pad with the display so its directions kept matching it [15]. So movement and other compass directions follow the map. Command flicks are learned as thumb movements [24, 63], so they stay with one thumb. | Moderate |
| **5. Hold-layer grids and drawers** | A spatially stable grid overlay, where novice moves rehearse expert ones, was 33% faster than marking menus [70†]. | Moderate |
| **6. How rarely the layout changes** | Adaptation once per session helped; up to once per interaction did worse than no adaptation [30]. Moving buttons gave no significant gain. Copying frequent items into a separate area was faster (p = .003), though the two adaptive designs did not differ significantly from each other [30]. A rotation that moves keys acts like a frequent adaptation. | Moderate |

### 5.2 What may scale or change

- **Overall size, within an unknown limit.** Scaling was tolerated [9†]; how much is in the unread full text. Spatial memory also carried from a phone to the palm (68% then 61% of apps recalled) [71†]. That was a change of surface, not of scale.
- **Small shifts, but the margin for tapped keys is small.** EAT and SEARCH move less than 10 mm between orientations, yet a tap learned in landscape fires the wrong key in portrait (the audit §3.5). Only 18 of 36 landscape-trained taps hit the same key in portrait; with 1 mm of scatter, about 15 do (the audit §3.2).
- **The gap between banks, the map size, and how much information shows.** Apple says to keep functionality the same as size classes change, but you can change how much of it is visible [22]. People expect the experience to "remain familiar" through rotation and resizing [22].
- **Hidden hit-testing,** per orientation and per thumb [42†, 49†].
- **Visual style.**

**Must not happen:** large rotations of a bank's arrangement [9†]; keys reflowing into new rows. The drawers reflow today, from 4 columns in landscape to 3 in portrait (the audit §3.6).

**Standards set a low bar.** WCAG asks only for the same order, and exempts changes of orientation or viewport, while noting that a consistent location "is the most usable" [68, 72]. Mainstream responsive guidance moves and reflows UI with no word on motor memory [73]. Shattered Pixel Dungeon's default toolbar moves wait and search to the other thumb when the phone turns [29]. Rolehack's parity goal is stricter than common practice.

### 5.3 Left-handed mirroring

- Diagonal thumb moves feel natural for one hand only. Karlson advises a hand setting, applied consistently [43].
- After one-hand practice, sequence memory was found in both world-centred and body-centred coordinates [74†]. That suggests a mirrored layout keeps part of the learning. Behavioural transfer figures were not reachable.
- About 1 in 10 people write left-handed [47]. A left-handed player found that Shattered Pixel Dungeon's tablet layout put health and messages under the left hand. The request was closed as not planned [75].
- A reading of this (derived): mirror the whole layout as one setting, the same in every orientation. Mirror command flicks with their thumb. Keep movement directions true to the map.

### 5.4 From touch to keyboard

- Showing hotkeys on their commands while a modifier is held raised hotkey use and speed [76†].
- Soft-keyboard hotkeys worked across devices and hand postures [77†].
- A proposed scheme (a hypothesis) says sequence skills are learned in spatial coordinates early and motor coordinates late [78†]. If so, changes to the thumb's movement hurt experts most.
- Apple offers two routes for a touch app on a Mac: scale the whole touch interface, or switch to Mac-sized controls [79].

---

## 6. Any screen

### 6.1 Size classes and breakpoints

| Scheme | Classes |
|---|---|
| Android width [21] | compact under 600 dp (99.96% of phones in portrait); medium 600-840 (93.73% of tablets in portrait); expanded 840-1200 (97.22% of tablets in landscape); large 1200-1600 (large tablets); extra-large 1600 and up (desktop displays) |
| Android height [21] | compact under 480 dp (99.78% of phones in landscape); medium 480-900 (97.59% of phones in portrait, 96.56% of tablets in landscape); expanded 900 and up (94.25% of tablets in portrait) |
| Windows [23, 80] | small under 640, medium 641-1007, large 1008 and up (effective px). Designed for the app's window, not the screen. |

- **Lucas's phone in landscape (896 x 443) is expanded width and compact height.** A rule that reads only width would give it a tablet layout [21]. Classify on both axes: "phone landscape" means compact height. In portrait (443 x 939) it is compact width and expanded height.
- Size classes follow the window, not the device: they are "not intended for isTablet-type logic" [21]. Apple says to base layout on size classes, not on device type or orientation [22].
- Android's supporting-pane layout puts the second pane below the main one at compact width, splits 50/50 at medium, and 70/30 at expanded [81].
- Games' own thresholds: Shattered Pixel Dungeon forces its mobile UI below about 720 x 400 dp [29]. DCSS switches to a small layout below about 45 status plus 55 message characters of width [82]. NetHack's curses interface needs 110 columns to draw borders with status on the side [83].
- Test split-screen at 1/3, 1/2 and 2/3 of the window [84].

**The audit:** the web picks portrait when H > W, its CSS when height ≥ width, and Android uses the system orientation. There is no size class, and Android has no large-screen resources (§2.3, §5.2, §6).

### 6.2 Sizing by viewing distance

- A CSS px is defined as a visual angle: about 0.0213°, one 96-dpi pixel seen from 71 cm [39]. Android browsers map 1 CSS px to 1 dp [1].
- So text and cells sized in CSS px or dp look about the same on a phone at 35 cm and a desktop at 60 cm: about 0.026° against 0.025° per unit (the researchers' calculation) [1]. Windows' effective pixels also fold in viewing distance [23, 65].
- Physical size does not carry over. A 58 px key is 9.2 mm on a phone and about 13-15 mm on touch laptops and monitors; the checker puts the real range at roughly 11-16 mm, depending on OS scaling and panel [1]. The audit measured 0.216-0.277 mm per CSS px on desktop monitors (§1.1).
- Measured viewing distances could not be read. The only cited distances are the CSS nominal 71 cm and the 25 in that Tan et al. assumed [31]. The audit used 36, 40, 50 and 60 cm for phone, tablet, laptop and desktop as its own assumptions (§4.2).

**Rule (derived):** size map glyphs and text by angle, in dp or CSS px. Size touch keys by physical size: dp on phones, a heuristic or calibration elsewhere. Mouse targets can be smaller. Android allows smaller than 48 dp for precise pointers [53], and Apple's macOS default is 28 pt with a 20 pt minimum [61].

### 6.3 Map cell readability

| Floor | Value | Status |
|---|---|---|
| Critical print size (reading slows sharply below it) | x-height 0.2° = 12 arcmin | Secondary report of Legge and Bigelow [19] |
| Xbox game-text minimum, mobile | 18 px body height at 100 DPI = 0.18 in = 4.6 mm, about 28.8 dp | Official guideline; OS magnification does not count [85] |
| ISO 9241-303 character height | 16′ minimum, 20-22′ recommended | Unverified search snippet noted by the completeness critic. Not a checked claim. |
| The audit's working rule | 12′ or more is comfortable; under 6′ is too small | The audit's assumption (§4.2) |

**What Rolehack shows now.**
- Android, whole map in portrait on Lucas's phone: an x-height of about 6.4-6.7′ at 35 cm [86]. That is about half the 12′ floor.
- At 12′ and 35 cm a column needs about 10.6 dp. That fits about 42 columns in 443 dp (portrait), 49 in 516 dp (landscape between banks), and 85 across the full 896 dp [19].
- The web draws square cells in VT323. At the same map width its glyphs are about 42% smaller than Android's [87].
- The audit: default Android cells show about 55 columns in landscape at density 2.4375, or 37 at 1.625; the web shows 34. No phone can show all 80 columns at a comfortable size, even with all chrome removed (§4.2).

**What follows.**
- On phones, show a viewport that pans with the hero. WCAG allows 2-D scrolling for maps and games [20].
- Make that viewport as large as possible. Larger peepholes sped up map learning and navigation, with diminishing returns; a tablet-sized one was a "sweet spot" [32†].
- Give an overview on demand. Overview+detail worked best at every display size; focus+context was harder on small displays [88†].
- Do not grow glyphs past the floor. Larger text did not help reading on the move because it forced more scrolling [89†]. At equal visual angle, a bigger display did not improve reading comprehension [31].

**Caveats.** The 12′ floor is for running text. No source gives a floor for picking out single, crowded map glyphs. The effect of the CRT glow and scanlines on contrast is unmeasured. Rolehack's players already read the map at about 7.4 dp cells (the audit §4.2), well below 10.6 dp. Treat 12′ as a comfortable target to test, not a hard limit.

### 6.4 What to do with the space around a fixed 80x21 map

NetHack's map is fixed at 80 x 21; a bigger terminal only adds space around it [28].

| Option | Who does it | For | Against |
|---|---|---|---|
| Grow cells up to a cap | Brogue caps padding on very wide windows [90]; DCSS caps zoom so line of sight stays visible [27] | Uses the space; readable | No reading gain once glyphs are readable [31, 89†]; diminishing returns [32†] |
| Fill the box with uneven cells | Brogue CE: cells differ by 1 px; tiles may stretch 20% and text 40%; no black bars [90] | No voids | How far NetHack glyphs may stretch is untested |
| Integer scaling with bars | Godot's integer mode [91] | Crisp glyphs | Leaves bars. The audit: web tiles are whole multiples of 16 source pixels in only 5 of 36 cases (§5.2). |
| Letterbox only the game content; anchor the UI to the window | Android large-screen guidance [84] | Simple; keys stay put | Bars inside the glass |
| Add information panels in priority order | DCSS sidebar [27]; NetHack side status and permanent inventory [28, 83]; Shattered Pixel Dungeon's large UI puts the inventory on the main screen [29]; Android's 70/30 supporting pane [81] | Useful information instead of empty case. The Shattered developer credits the v1.2.0 desktop changes, as a whole, with making it feel "like more than a mobile port" [29]. | Panels must not displace keys |
| Cap the chrome | Google Play Games on PC: HUD at most 20% of the screen, and an in-game UI scale [92] | | |

- Measure unused screen area for each tier. News sites that did not scale left growing unused area [93†].
- On big mouse screens, far targets are slow, and the cursor gets hard to follow as users raise mouse acceleration [94]. Keep clickable keys near the glass on desktop.
- Add new things in a separate, marked area and leave existing keys alone [30]. An always-visible inventory panel is a copy of what INVENTORY opens. The INVENTORY key stays where it is.
- No study compares these options for a fixed character grid.

**The audit:** at 1920 x 1080 the keys cover 7% of the window and empty case 27%. Each side well is about 73% empty, and the deck has a 932 dp gap (§5.1). The whole level would fit at a 17.9 px tile, but the web uses 40 px and shows 35.8 of 80 columns (short version item 6). With square web cells the map fills 47% of a 1920 x 1080 window's height; with 0.6:1 cells it would fill 78%, assuming the map spans the width [87].

### 6.5 Tablets, touch laptops and propped devices

The sources disagree on where the grip is.

| Finding | Source |
|---|---|
| Slates are usually held along the sides. Bottom corners and sides suit controls; the top half suits reading. | [7] |
| Thumbs settle in the middle to top third of tablets; the top and bottom edges are hard to reach. Touch-laptop users rest their arms and grip the bottom corners of the screen. | [33] (second-hand) |
| Tablet-sized props were held deep in the thumb cleft, fingers mostly along the left or bottom edge. Two-handed grips added stability and may be essential for long landscape use. Grips shifted over time. | [34] |
| Five holds allow support and interaction together; users change position often to fight fatigue | [95†] |
| Most users leaned back with the tablet on their lap. The holding thumb reaches only near its grip. | [96] |
| In a two-hand landscape tablet grip, each thumb reached only 74% of the screen. Direct touch was still 35% faster than the best indirect method. | [97†] |
| 98% of 64 users wanted different keyboard layouts and positions depending on grip | [35†] |
| Tablets are used for games on the couch, in bed and at the table | [98†] |
| Android moves navigation to a side rail on large screens, because hands hold the sides | [99, 100] |

**Physical key size: keep phone size.** Larger devices reduced one-handed thumb performance [24]. A NetHack-Android player found the buttons "really small" on a 10-inch tablet [25]. Sizing controls as a share of the screen makes them grow on tablets [101]. For keys used without looking, the benefit of size levelled off at 10-15 mm; that study was with blind users, so it is only indicative [26†].

**The audit:** on a 1024 x 768 tablet in landscape, 16 keys are beyond 75 mm of the corners, and INVENTORY moves 102 mm between orientations (§3.7). The case never grows past its design size, so the extra area becomes empty well space (§5.2).

---

## 7. Knowing the viewer on the web

### 7.1 What to detect and how

| To know | Use | Limits | Refs |
|---|---|---|---|
| Window size | `innerWidth`/`innerHeight`, or a ResizeObserver on the root and the glass | `screen.*` may legally report only the viewport. On iOS Safari, `innerWidth`/`innerHeight` report the visual viewport. | [102] |
| A stable height | `svh`, or run fullscreen or as an installed app | `dv*` units change as toolbars move, so keys anchored to them drift; `100vh` can hide the bottom row under the address bar. Support for the new units: Chrome 108, Firefox 101, Safari 15.4. | [39] |
| On-screen keyboard behaviour | viewport `interactive-widget` (`resizes-visual` is the default; `overlays-content` resizes nothing) | | [103] |
| Safe area | `env(safe-area-inset-*)` with `viewport-fit=cover` | Zero on rectangular screens | [50, 103] |
| Size class | width and height classes | | [21] |
| Orientation | the `orientation` media feature (portrait when height ≥ width, from the viewport); ScreenOrientation `change` (Safari 16.4+) | `orientationchange` is deprecated | [36] |
| Touch available | `any-pointer: coarse`; `navigator.maxTouchPoints > 0` | Says the hardware can touch, not that the user will | [36, 38] |
| Primary pointer | `pointer`, `hover` | Describe only the "primary" device. The browser picks it and may change it. | [36] |
| What the player is using now | `pointerType` on each event (`mouse`, `pen`, `touch`, or empty) | Each type has its own primary pointer | [38] |
| A physical keyboard | the first `keydown` | Media features cannot detect keyboards [36]. The Keyboard Map API fires on layout changes, not on plugging in, is "not typically" present on mobile, and `getLayoutMap` is Chromium-only [104]. No API we found detects a keyboard (the researchers' inference). | |
| Pixel density | `devicePixelRatio`; ResizeObserver `device-pixel-content-box` for crisp whole-pixel cells | dpr changes with page zoom except in Safari. `device-pixel-content-box` is not in Safari. | [39, 105] |
| Physical key size | Not available | CSS `mm` and `in` follow px, not real length | [39, 92] |

### 7.2 Limits, and hybrid devices

- **Touch laptops look like mouse machines.** Outside Android, Chromium's shared code makes the primary pointer "fine" whenever the platform reports any fine pointer. On Windows it reports coarse only in tablet (slate) mode, or when the system says no mouse is present, which the code notes "will rarely return 0 even if no external mouse is connected" [37]. On a touch laptop with a mouse, `any-hover: none` is false [36]. Gating touch keys on `pointer: coarse` would hide them from touch-laptop users. Only the Windows and shared Chromium code was read.
- **Android** reports coarse even with a mouse attached, except in desktop mode [37]. Some Samsung phones wrongly match `hover: hover` [106].
- **iPad Safari** shows the same desktop sites as Safari on a Mac [107], so the user agent cannot tell an iPad from a Mac (the researchers' inference).
- **DCSS WebTiles** decides "mobile" from `ontouchstart` alone, which would treat a touch laptop used with a mouse as a phone [82].
- **iPhone** Safari has no Fullscreen API (it is iPad-only, with an overlay button and swipe-down exit) and no orientation lock; by spec, lock needs a fullscreen document [108, 109]. Fullscreen needs a user tap or a user-generated orientation change [108]. So on iPhone the page always turns with the phone, inside the browser bars unless launched from the Home Screen. **On the web, parity between orientations is required, not optional.**
- **Chrome's toolbar** on Android phones is 56 dp tall (96 dp on tablets) [110]. That is 12.6% of Lucas's 443 dp landscape height, leaving 387 dp (derived).
- **Hybrid switching.** How long to wait before switching input modes, so the layout does not flicker, is untested.

**The audit:** the web reads only `innerWidth` and `innerHeight`. It never checks pointer type, hover, safe areas or the visual viewport. Every resize rebuilds the overlay and drops an armed Fight or an open layer, including when a browser toolbar shows or hides. In a browser tab on Lucas's phone (assuming 24 + 56 dp of bars) landscape shrinks to 896 x 363 and the 58 dp keys fall to 50.7 dp. The web also draws the map on a slightly different grid from the one it reads taps on, at non-integer densities. Past some column (19 to 59, depending on density and orientation), a tap can send the hero to the neighbouring cell (short version items 7-8, §4.5, §6).

### 7.3 A detection policy the evidence supports

1. Offer touch keys when `any-pointer: coarse` or `maxTouchPoints > 0`. Show them at launch on such devices [38, 40].
2. Switch on the input actually used. A `pointerdown` with `pointerType` `touch` shows the banks. Keyboard or mouse use for a while fades them and gives the glass the space. Re-check after every configuration change, because available inputs change mid-game [40, 111]. Add hysteresis; the right length is untested.
3. Never decide from `pointer: coarse` alone, from `hover: hover`, or from the user agent [36, 37, 106, 107].
4. Size keys in CSS px (= dp on Android phones) from the player's 46/52/58 setting, never from window size [1]. On large touch windows the same px are physically bigger [1]; a calibration or physical-size setting may be needed [39].
5. Size the page to a stable height (`svh`, or fullscreen or installed). Read the safe-area insets. Keep the on-screen keyboard from reflowing the case [39, 50, 103].
6. Rebuild only when the size class or input mode changes, and never under a finger.

### 7.4 Real screen sizes to design for

**Phones, portrait, in CSS px** (Chrome DevTools device list, fetched 29 Sep 2026) [50]. These are screen sizes; browser bars make the viewport smaller.

| Width x height @ dpr | Devices |
|---|---|
| 344 x 882 | Galaxy Z Fold 5 cover screen |
| 360 x 800 @2.25 | Galaxy A55 |
| 390 x 844 @3 | iPhone 12 Pro, 14, 16e |
| 393 x 852 @3 | iPhone 14 Pro, 15, 15 Pro, 16 |
| 402 x 874 @3 | iPhone 16 Pro |
| 412 x 915 @2.625 | Pixel 7, 8, 8a |
| 412 x 924 @2.625 | Pixel 9, 10 |
| 428 x 926 | iPhone 14 Plus |
| 430 x 932 @3 | iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus |
| 440 x 956 | iPhone 16 Pro Max |
| 443 x 939 | Lucas's phone (the audit) |
| 448 x 997 @3 | Pixel 8 Pro, 9 Pro XL |

The iPhone 17 family is not in the list yet. At 360 px wide, two pads of 58 px keys take 348 px, so this is the binding portrait case (derived in [50]).

**Landscape safe-area insets** (same list) [50]: iPhone 14, 12 Pro and 16e: 47 left, 47 right, 21 bottom. iPhone 14 Pro, 15, 15 Pro and 16: 59/59/21. iPhone 16 Pro and Pro Max: 62/62/21. Pixel 7: 52 on the right.

**Tablets and laptops** (same list) [50]: Galaxy Tab S4 712 x 1138 @2.25; iPad Mini 768 x 1024 @2; Asus Zenbook Fold 853 x 1280 @1.5; Surface Pro 7 912 x 1368 @2; Surface Pro 10 960 x 1440 @2; iPad Pro 13 1032 x 1376 @2; "Laptop with touch" 1280 x 950 @1.

**Desktop displays** (Steam Hardware Survey, August 2026, read through a third-party mirror) [112]: 1920 x 1080 50.52% (56.11% in August 2024); 2560 x 1440 21.86%; 2560 x 1600 5.71%; 3840 x 2160 4.98%; 3440 x 1440 3.14%; 1920 x 1200 2.76%; 1366 x 768 2.23%. By aspect: 16:9 about 80.9%, 16:10 10.9%, 21:9 3.8%. These are gamers' physical displays, not browser viewports.

**OS scaling.** Windows' standard settings are 100%, 125% and 150% [80]. A 1920 x 1080 laptop is then 1920 x 1080, 1536 x 864 or 1280 x 720 CSS px before browser bars.

**Aspect ratios the platforms name.** Apple's guidance gives 16:10, 19.5:9 and 4:3 as examples [113]. Google Play Games on PC: 16:9, plus 21:9, 16:10 and 3:2 [92].

**Missing.** There is no first-party data on browser viewports (StatCounter was blocked) and none on real `innerHeight` per phone browser.

**A test matrix (derived)**

| Class | Sizes (CSS px = dp) | Why |
|---|---|---|
| Phone, portrait | 360 x 800, 390 x 844, 412 x 915, 443 x 939, 448 x 997; edge case 344 x 882 | The width range of current phones [50] |
| Phone, landscape | The same, turned; with 47-62 px side insets and 21 px bottom; and minus 56 dp in a Chrome tab | [50, 110] |
| Small phone | 640 x 360 and 360 x 640 | The audit's case where keys shrink today |
| Tablet | 768 x 1024, 712 x 1138, 1032 x 1376, both orientations; split-screen at 1/3, 1/2 and 2/3 | [50, 84] |
| Touch laptop | 1280 x 950, 1366 x 768, 1536 x 864, 1280 x 720 | [50, 80] |
| Desktop | 1920 x 1080, 2560 x 1440, 2560 x 1600, 3440 x 1440, 3840 x 2160 at 100%, 150% and 200% | [80, 112] |

---

## 8. What other games do

| Game or framework | What it does | Same controls after rotation? | Lesson | Refs |
|---|---|---|---|---|
| Apple Touch Controller (2026) | Nine anchor points. Controls in a section share an anchor and keep their size and distance from it. Safe-area insets are added to offsets. Frequent actions near the thumbs, menus at the top, nothing in the centre. A thumbstick's hit area can be half the screen. | Yes, by construction | The placement rule Rolehack needs | [2] |
| Xbox Touch Adaptation Kit | Radial comfort zones. The left inner wheel holds the one movement control, the right inner wheel the one most frequent action. Players lower their wheels. Controls must stay reachable on phones, tablets and 2-in-1s. | Grip-relative | A polar hand model; the main action on the right thumb | [4] |
| Luanti (Minetest) | Button size = min(short edge / 4.5, 65 dp x HUD scale). Each button stores an anchor (0, 0.5 or 1 per axis, picked by screen third) and an offset in button units. Joystick 3 buttons wide. Android build is landscape-only. | n/a | A tested size cap and anchor rule. On Lucas's phone the cap is 98 dp, so 58 dp keys are unaffected. | [114] |
| Unity and Godot | Unity's Match 0.5 averages the width and height scale in log space, so corner-anchored buttons keep their size through a rotation. Godot recommends a square base resolution for games that support both orientations, "expand" aspect, and corner anchors. | Same key size | Scale from the short side or √(w·h), never from width alone | [91, 115] |
| Dungeon Crawl Stone Soup | The Android build defines only square reference sizes (480-800), noting "usually it can be rotated". Tiles UI fills a sidebar in priority order. Automatic small layout on narrow windows. Zoom capped so line of sight stays visible. WebTiles re-lays out on every resize, with fixed-width text panels, and detects "mobile" by `ontouchstart`. | Same key size | Priority panels; a hard cap on zoom; do not copy the touch check | [27, 82] |
| Shattered Pixel Dungeon | Three interface sizes: mobile, mixed, large. Desktop defaults to large. Forces mobile below about 720 x 400 dp. Integer zoom from screen density, capped after safe insets. The large UI puts the inventory on the main screen (v1.2.0, 23 Mar 2022). On narrow portrait screens a "quickslot swapper" collapses six slots to three in place. A "flip toolbar" option. | No: the default toolbar moves wait and search to the other thumb | Collapse in place rather than move; offer a flip; parity has to be designed in | [29] |
| Shattered Pixel Dungeon player reports | A left-handed tablet player found health and messages under the hand (closed, not planned). Taps in gaps may reach the map (one report). | | A mirror option; no taps falling through to the map | [62, 75] |
| NetHack Android (ForkFront) | Separate portrait and landscape location settings with the same defaults. "Lock view" (on by default) stops scrolling when the whole map fits. | Same defaults | Identical defaults; pin the map when it fits | [116] |
| NetHack Android player reports | The direction overlay shifted, so a zap "left" hit the pet on the right. Command buttons "really small" on a 10-inch tablet. | | A moved direction key causes irreversible actions; size keys physically | [8, 25] |
| Brogue CE and its Android port | Fills any window with its 100 x 34 grid using uneven cells and bounded stretch. The Android port starts in landscape, puts the D-pad in the left side panel, pinch-zooms around the player and zooms out for menus. | Landscape first | Put the pad in space the grid does not need; zoom rather than shrink | [90, 117] |
| Cataclysm: DDA Android | Joystick sized as a share of the longest screen edge; shortcut buttons in raw pixels; shortcuts drawn over the game by default | n/a | Share-of-screen sizing grows on tablets; pixel sizing breaks across densities | [101] |
| NetHack curses interface (3.7, 5.0) | Status and messages can go on any side; a permanent inventory window; borders turn on automatically at 26 x 82; 110 columns needed for borders with side status | n/a | Upstream precedent for side panels | [28, 83] |
| Google Play Games on PC | HUD at most 20% of the screen; place by screen ratios because physical size cannot be known on PC; in-game UI scale; support 16:9, 21:9, 16:10, 3:2 | n/a | Desktop rules differ from touch rules | [92] |
| Android game input guidance | Show touch controls at launch; fade them when a keyboard or gamepad is used; detect inputs, not form factors | n/a | Mode follows input | [40, 111] |
| Apple Mac Catalyst | Either scale the iPad interface as it is, or switch to Mac-sized controls | n/a | Two legitimate desktop routes | [79] |

No telemetry or study we found compares keeping controls in place across orientations with rearranging them. The evidence is player bug reports and platform guidance. Cogmind's UI-scaling series, Caves of Qud's mobile controls and commercial action games' layout editors could not be read.

---

## 9. Design implications for Rolehack

1. **Give each control one thumb, everywhere.** Fix the five thumb switches the audit found: COMBAT, COMBAT pin 2 and FLICK (left to right), MENU and WORLD (right to left) (the audit §3.2) [5, 6†, 7, 63]. Which thumb should own combat is not settled by the evidence. The Xbox kit puts the most frequent action on the right thumb [4], and Rolehack already arms INVENTORY, EAT and APPLY with the right thumb and aims on the left pad (the audit §3.4). The firm point is that combat sits on the same thumb in both orientations.
2. **Anchor banks to the bottom corners only.** Store each key as (corner, offset in dp, size in dp), and compute every layout with one function [2, 3, 11, 113, 114]. Today keys also hang from the top of full-height wells, so INVENTORY moves 50.9 mm on the phone and 102 mm on a tablet (the audit §3.4, §3.7).
3. **Fit each bank inside the parity envelope.** On Lucas's phone that is about 221 dp (35 mm) wide and about 60 mm tall per corner (this brief §3.2, derived). The 36 current controls fit as two 3 x 6 banks of 58 dp keys. Move rare keys (MENU, WORLD, GAME, KEYS) to a top strip at a smaller size, the same in both orientations; Apple puts menus at the top with a 28 pt minimum [54]. Retire the landscape deck and the portrait key row, which cause most of today's moves (the audit §3.3-3.5).
4. **Keep the pad at 58 dp by default, and take it out of the case scale.** Keep 52 and 46 as the player's choice. Never shrink the pad below the chosen size to fit a screen [7, 16, 17, 18, 41†]. Today one scale factor shrinks the pad to 43.6 dp at 640 x 360 (the audit §5.2, §7.3). Check 360 px portrait first: two 58 px pads need 348 px [50].
5. **Tile the hit areas.** No dead space inside the pad. Outer cells run to the bank and screen edge for taps. Drawn wells can stay [2, 16, 18, 60]. When a key or layer disappears, block the area briefly so taps cannot fall through to the map [62].
6. **Learn hidden offsets per orientation and per thumb.** Log taps against key centres. Correct hit-testing, never the visuals [42†, 48†, 49†, 118†, 119†, 120†]. A correction function built from 91,731 installs of a published game cut the error rate by 7.79% in a follow-up [118†]. About 200 taps are enough to start [48†]; a calibration game can double as the pad tutorial.
7. **Few, wide flicks, recognised by angle.** At most 6 wedges of at least 60°; prefer 4 cardinal directions, which suit either hand [43, 63, 64]. Classify by the whole stroke's angle, with no maximum length [64, 65]. Tap-or-flick threshold about 12-17 dp, in physical units [7, 66]. On Android, start flicks away from the side edges [52]. With the FLICK key on one thumb, its −85° and −40° flicks stay the same thumb movement in both orientations (the audit §3.4).
8. **Directions follow the map.** Screen-up is map-north in both orientations, and the pad never rotates [9†, 15]. Filter rotation (Hinckley et al. used ±5° deadbands and a 0.5 s dwell) and offer an in-game orientation lock where the platform allows it: the Android app yes, iPhone web no [15, 109].
9. **One grid for layers and drawers.** Drawers keep one column count in both orientations; layers are identical everywhere [63, 70†]. Today the drawers go from 4 columns to 3 (the audit §3.6).
10. **Take map space from chrome first.** Removing case chrome alone adds 52 x 70 dp in landscape and 32 x 82 dp in portrait, with no key changed. Centring the map under the see-through status band adds 48 dp (the audit §4.4). Today the landscape map is no wider than the portrait one (short version item 4).
11. **Phones: a panning map at a readable cell, with an overview.** Keep one cell size, in dp, for both orientations, so the same columns show after a rotation; Android already keeps one zoom level (the audit §4.1). Set the default cell by test: 12′ at 35 cm means about 10.6 dp columns [19], but players use about 7.4 dp today (the audit §4.2). Pin the view when the whole level fits [116]. Add a one-tap overview [20, 32†, 88†].
12. **Fix the web map grid.** Use Android's 0.6:1 text cell on the web instead of square cells [87]. Fit the level to width as well as height (the audit §5.2, cause 5). Draw and hit-test on the same whole-device-pixel grid [105]; this also removes the audit's tap-drift bug (the audit §4.5).
13. **Classify windows on both axes.** Compact height = phone landscape. Compact width = phone portrait. Medium or expanded on both axes = tablet. Large and extra-large width = desktop [21, 23]. Crossed with the input mode, this gives the tiers. Test split-screen at 1/3, 1/2 and 2/3 [84]. Replace the web's H > W switch (the audit §2.3, §6).
14. **Large windows: keys stay, information grows.** Keys keep their physical size and anchors [2, 24, 25]. Extra space goes to the map, up to a comfortable cell, then stops and centres [31, 32†, 90]. After that it goes to panels in a fixed priority order, for example status, messages, permanent inventory, key legend [27, 28, 29, 81, 83]. Panels are copies in their own area; INVENTORY stays in its bank slot [30]. Aim for chrome at or under 20% on desktop [92], and track unused area as a metric [93†]. Today 27% of a 1920 x 1080 window is empty case (the audit §5.1).
15. **Tablets: side-edge anchors with a grip-height setting.** Default to the bottom corners with the phone offsets. Let the player raise each bank along its side edge as one unit, arrangement unchanged [7, 33, 34, 35†, 99]. Offer a propped (no-grip) mode for a tablet on a table or lap [96, 98†]. Keep phone key size [24, 26†].
16. **Mouse and keyboard: compact keys near the glass, with key legends.** When the player uses the keyboard or mouse, fade the thumb banks and let the map take the window [40]. Keep a compact on-screen set next to the glass, not in the far corners [94]. Show each key's keyboard key on it, at least while a modifier is held [76†, 77†]. Mouse targets may be smaller [53, 61]. Today a keyboard-and-mouse player gets all 36 thumb keys in the window's far corners, and has no keyboard route to layers, drawers, macros or flicks (the audit §5.1, §6).
17. **Web detection by capability and use.** Follow §7.3: `any-pointer` and `maxTouchPoints` to offer touch; `pointerType` and `keydown` to switch; never `pointer: coarse` alone or the user agent [36, 37, 38, 40, 107, 111]. Today the web reads no pointer information (the audit §6).
18. **A stable web viewport.** Size the page to `svh`, or run fullscreen or installed. Use `viewport-fit=cover` and the safe-area insets. Keep the on-screen keyboard from reflowing the case. Rebuild only on a class or input-mode change, never under a finger, and keep armed state [39, 50, 103]. Offer a Fullscreen key on Android and suggest Add to Home Screen on iPhone [108, 109, 110]. Today every resize rebuilds and drops state (the audit §6).
19. **One mirror setting for left-handers.** Mirror the whole layout in every orientation. Mirror command flicks with their thumb. Keep movement directions true to the map [43, 47, 74†, 75].
20. **Decide the safe-area rule by test.** Anchoring to the physical corner keeps the hand's frame. Anchoring to the safe-area corner, as Apple does, shifts landscape banks about 7-10 mm inward [2, 50, 51]. Measure it on Lucas's phone (section 10.3).
21. **Log, with consent.** A bucketed, privacy-reviewed log of taps, flicks, viewport sizes and first input would replace most of the guesses in this brief [48†, 118†]. The web has nowhere to send data today (the audit §6, open question 6). A first step is an on-device log that Lucas can export.

---

## 10. Open questions and thin evidence

### 10.1 The completeness critic's six gaps

| # | Gap | What we have instead | What would settle it |
|---|---|---|---|
| 1 | **Two-thumb grip geometry.** Where each thumb base sits, how far it reaches and which way it points, in portrait against landscape on a phone about 70 x 150 mm. Whether one on-screen flick bearing is the same joint movement in both grips. | One-handed portrait studies [16, 24, 43]; a two-hand landscape against one-hand portrait comparison [12†]; platform guidance [2, 4]; offsets differ by posture [42†] | Touch-point and flick logs on Lucas's phone in both orientations (10.3). Unread leads: Trudeau et al. 2013 (PLOS One), the functional-area model's coefficients [45†], Azenkot and Zhai's full text. |
| 2 | **The map glyph floor.** The smallest readable cell, as a visual angle, at measured viewing distances. Whether portrait needs a cropped map. | Critical print size 12′ (second-hand) [19]; Xbox 4.6 mm text [85]; ISO 9241-303 figures unverified; no measured viewing distances | A glyph-identification test at several cell sizes, with measured viewing distance (10.3) |
| 3 | **How far a learned key may move or resize** before experts slow down. Whether memory follows the corner offset, the absolute position or only the order. | Scaling and translation tolerated, large rotation not, magnitudes unknown [9†]; the audit: moves of 7.5-8.3 mm already misfire (§3.5) | The full text of Scarr et al. 2013; an in-house transfer test |
| 4 | **Tablet and laptop grips, and what fills the space** around the map | Conflicting grip sources (§6.5); precedent only for filling space (§6.4) | Watching Lucas and others play on a tablet and a touch laptop; comparing panels against a bigger map |
| 5 | **Reliability of the fixed 3x3 pad** at 58, 52 and 46 dp in real two-thumb play, with the eyes on the map | One-thumb PDA study [16]; model ratios [18]; Baldauf et al. 2015 on on-screen gamepads was not opened | Logged wrong steps and tap offsets by key size in real play |
| 6 | **Web policy:** key size without physical units, input mode, real viewport sizes | Specs and Chromium source are solid (§7); no first-party viewport data; StatCounter blocked; Steam via a mirror [112] | Bucketed, privacy-reviewed viewport and input logging; testing real touch laptops |

### 10.2 Other thin or conflicting points

- **Six-way flicks** (60° wedges) have never been tested. The interval study said to support 60° was not opened. All marking-menu breadth data comes from pens, mice and trackballs [63, 64].
- **Edge or inset.** One thumb study says run edge keys to the edge [16]; Windows says keep costly targets away from edges [55].
- **Tablet grip height** conflicts (§6.5), and the Hoober data is second-hand [33].
- **One hand in portrait.** Street data suggests portrait phones are often held in one hand or cradled [33]. The layout assumes two thumbs. Games were not studied.
- **The tap model's calibration** (finger or thumb) is unknown [18].
- **The hand model's radii** are assumptions [45†].
- **Browsers other than Chromium.** Safari and Firefox on touch laptops, and iPadOS with a trackpad, were not checked [37].
- **Mode-switch hysteresis** is untested.
- **Renderer parity.** Web cells are square with VT323 glyphs; Android cells are 0.6:1 with FreeMono Bold. Whether to unify on the 0.6:1 text cell, and what that does to 16 x 16 tiles, is undecided [87].
- **Unread precedent:** Cogmind's full UI upscaling series, Caves of Qud mobile, iOS NetHack ports and commercial action games' layout editors.
- **Abstract-only results** (marked †) carry most of the newer evidence on grips, offsets and spatial memory.

### 10.3 What a test on Lucas's phone could settle

First, Lucas's screen resolution and density (the audit's open question 1). It decides whether Android shows 55 or 37 map columns in landscape, and which version of the web tap bug he hits.

| Test | Method | Settles | Does not settle |
|---|---|---|---|
| 1. Reach sweep | In each orientation, two-thumb grip: drag each thumb along its comfortable arc and its farthest arc, as in ThumbSpace [43]. Note where the hands hold the phone. | The real anchor (corner or mid-edge) and ring radii for Lucas; whether this brief's §3.2 parity envelope holds | Other hands (scale by ±12% [47]) |
| 2. Tap log | Prompted taps on every pad and bank key, eyes on a moving target in the glass, about 200 taps per condition [48†]; 58, 52 and 46 dp; both orientations | Offsets per key and orientation; misses and wrong steps by size; whether 52 dp is acceptable; whether the ↙ key is "too close" | Rates for other players |
| 3. Flick log | Flicks from the FLICK key in each orientation, with 4 and with 6 wedges | The angle spread per direction; whether 6 x 60° is reliable for a thumb | Other players |
| 4. Transfer | Play a session in landscape, rotate, then time and count errors on INVENTORY, COMBAT, FLICK and SEARCH. Old layout against a prototype. | Whether the parity rule removes the cost of rotating | Long-term learning |
| 5. Map readability | Measure Lucas's viewing distance in each orientation. Identify glyphs on crowded test maps at 5.5, 7.4, 8.5 and 10.6 dp columns, with the CRT effect on and off. | A practical cell floor for Lucas; whole map or panning map | A general floor |
| 6. Safe area and gestures | In landscape with the cutout side: anchor at the physical edge against the safe edge. Flick near the side edge with gesture navigation on. | Implication 20; Back-gesture conflicts | Other phones |
| 7. Web in the browser | Tab, installed, and fullscreen: record `innerHeight`, `svh`, dpr, `pointer`, `any-pointer` | The real viewport loss (the audit assumed 24 + 56 dp) | Other browsers |

One person's data sets a direction, not a standard. Wider opt-in logging should follow (implication 21).

---

## References

Tags: [industry] = game source code, game documentation, industry code or player reports. [secondary] = a second-hand report, a review, or a third-party copy of data. [abstract only] = only the abstract could be read; marked † in the text. [data] = a dataset or device list. [in-house measurement, not research] = Rolehack's own code, measured by the researchers.

1. Google / Android Developers (2026). Support different screens in web apps. https://developer.android.com/develop/ui/views/layout/webapps/targeting
2. Apple (Keyi Yu, Game Technology team) (2026). Make your game great with touch. WWDC26 session 358, video transcript. https://developer.apple.com/videos/play/wwdc2026/358/
3. Apple (2025). TCControlLayoutAnchor and TCControlLayout. Touch Controller framework documentation (iOS/iPadOS 26). https://developer.apple.com/tutorials/data/documentation/touchcontroller/tccontrollayoutanchor.json
4. Microsoft (2024). A designer's guide to building touch controls (Xbox Game Streaming Touch Adaptation Kit). Microsoft GDK documentation, ms.date 1 Aug 2024, read from a third-party GitHub mirror of the Learn source. https://raw.githubusercontent.com/edigonzales-microsoft/mintlify-docs/main/sources/gdk-docs/docs/features/common/game-streaming/building-touch-layouts/game-streaming-tak-designers-guide.md
5. Hinckley K, Pausch R, Proffitt D, Patten J, Kassell N (1997). Cooperative Bimanual Action. CHI '97. https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/objmanip.pdf
6. Feit AM, Weir D, Oulasvirta A (2016). How We Type: Movement Strategies and Performance in Everyday Typing. CHI 2016, pp. 4262-4273. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2016.bib [abstract only]
7. Microsoft (2012). Windows 8 User Experience Guidelines (touch posture, grips, target sizes, targeting thresholds, app-bar commands). Microsoft design guidelines PDF dated 14 Aug 2012, read from a third-party archive copy. https://raw.githubusercontent.com/tilsgee/DesignGuidelinesArchive/main/uwp8.pdf
8. CJYate (2016). Issue #28: Directional buttons occasionally misfire. gurrhack/NetHack-Android issue tracker, 16 Sep 2016 (player report). https://github.com/gurrhack/NetHack-Android/issues/28 [industry]
9. Scarr J, Cockburn A, Gutwin C, Malacria S (2013). Testing the Robustness and Performance of Spatially Consistent Interfaces. CHI 2013, pp. 3139-3148. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2013.bib [abstract only]
10. Hinckley K, Wigdor D (c. 2012). Input Technologies and Techniques. The Human-Computer Interaction Handbook, 3rd ed. (author draft; review chapter). https://www.microsoft.com/en-us/research/wp-content/uploads/2016/11/Input-Technologies-and-Techniques-HCI-Handbook-3rd-Edition.pdf [secondary]
11. Google / Android Developers (2026). Support multiple form factors and screen sizes (Godot), and the matching Unity large-screen page. https://developer.android.com/games/engines/godot/godot-formfactor
12. Trudeau MB, Asakawa DS, Jindrich DL, Dennerlein JT (2016). Two-handed grip on a mobile phone affords greater thumb motor performance, decreased variability, and a more extended thumb posture than a one-handed grip. Applied Ergonomics 52:24-28. Abstract via a third-party dataset mirror: https://raw.githubusercontent.com/enricoaquilina/text-summmariser/afb332aee10495e16265c7455691b7c069129e9f/datasets/sciencedirect/Training/S0003687015300272.txt [abstract only]
13. Seipp K, Devlin K (2013). Landscape vs Portrait Mode: Which is Faster to Use on Your Smart Phone? MobileHCI 2013, pp. 534-539. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/mobilehci/mobilehci-2013.bib [abstract only]
14. Salazar CAF, Henze N, Wolf K (2016). Ergonomics of Thumb-Based Pointing While Holding Tablets. MobileHCI 2016 Adjunct, pp. 730-737. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/mobilehci/mobilehci-2016.bib [abstract only]
15. Hinckley K, Pierce J, Sinclair M, Horvitz E (2000). Sensing Techniques for Mobile Interaction. UIST 2000. https://www.microsoft.com/en-us/research/wp-content/uploads/2016/11/Sensing-Techniques-for-Mobile-Interaction-UIST-2000.pdf
16. Parhi P, Karlson AK, Bederson BB (2006). Target Size Study for One-Handed Thumb Use on Small Touchscreen Devices. MobileHCI 2006, pp. 203-210. https://www.microsoft.com/en-us/research/wp-content/uploads/2006/01/parhi-mobileHCI06.pdf
17. W3C WAI AG Working Group (2018). Understanding Success Criterion 2.5.5: Target Size (Enhanced). WCAG 2.1. https://raw.githubusercontent.com/w3c/wcag/main/understanding/21/target-size-enhanced.html
18. LY Corporation (2024). Tappy source code, src/tappy.ts (implements the dual-Gaussian tap-success model of Usuba, Sato, Sasaya, Yamanaka and Yamashita 2024). GitHub lycorp-jp/tappy. https://raw.githubusercontent.com/lycorp-jp/tappy/main/src/tappy.ts [industry]
19. Dyson MC (2021), reporting Legge GE and Bigelow CA (J Vision 2011). Legibility: how and why typography affects ease of reading, ch. 5 (Legible Typography web edition). https://raw.githubusercontent.com/rosettatype/legible-typography/master/_chapters_en/5-overview-of-research-type.md [secondary]
20. W3C (2018). WCAG 2.1 Success Criterion 1.4.10 Reflow (the maps-and-games example is in a non-normative note). https://raw.githubusercontent.com/w3c/wcag/main/guidelines/sc/21/reflow.html
21. Google / Android Developers (2026; page updated 22 Sep 2026). Use window size classes. https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes
22. Apple (2026; change log 9 Sep 2026). Human Interface Guidelines: Layout. Apple Developer HIG (JSON source). https://developer.apple.com/tutorials/data/design/human-interface-guidelines/layout.json
23. Microsoft (2024). Screen sizes and breakpoints (Windows apps). MicrosoftDocs/windows-dev-docs source, ms.date 21 Nov 2024. https://raw.githubusercontent.com/MicrosoftDocs/windows-dev-docs/docs/hub/apps/design/layout/screen-sizes-and-breakpoints-for-responsive-design.md
24. Trudeau M, Udtamadilok T, Karlson AK, Dennerlein JT (2012). Thumb Motor Performance Varies by Movement Orientation, Direction, and Device Size during Single-Handed Mobile Phone Use. Human Factors 54(1) (author manuscript). https://www.microsoft.com/en-us/research/wp-content/uploads/2012/02/ThumbMovement.pdf
25. CJYate (2017). Issue #32: Feature request: configurable command button size. gurrhack/NetHack-Android issue tracker, 6 Aug 2017 (player report). https://github.com/gurrhack/NetHack-Android/issues/32 [industry]
26. Rodrigues A, Nicolau H, Montague K, Carriço L, Guerreiro T (2016). Effect of Target Size on Non-Visual Text-Entry. MobileHCI 2016, pp. 47-52. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/mobilehci/mobilehci-2016.bib [abstract only]
27. DCSS development team (2026). Dungeon Crawl Stone Soup options guide, crawl-ref/docs/options_guide.txt (master). https://raw.githubusercontent.com/crawl/crawl/master/crawl-ref/docs/options_guide.txt [industry]
28. NetHack DevTeam (2026). NetHack Guidebook for NetHack 5.0.0 (4 Jul 2026) and include/global.h. https://raw.githubusercontent.com/NetHack/NetHack/master/doc/Guidebook.txt
29. Debenham E (2022-2026). Shattered Pixel Dungeon source code, master read 29 Sep 2026: SPDSettings.java, scenes/PixelScene.java, ui/Toolbar.java, ui/changelist/v1_X_Changes.java (v1.2.0 released 23 Mar 2022), messages/windows/windows.properties. GitHub 00-Evan/shattered-pixel-dungeon. https://raw.githubusercontent.com/00-Evan/shattered-pixel-dungeon/master/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/SPDSettings.java ; https://raw.githubusercontent.com/00-Evan/shattered-pixel-dungeon/master/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/scenes/PixelScene.java ; https://raw.githubusercontent.com/00-Evan/shattered-pixel-dungeon/master/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/ui/Toolbar.java ; https://raw.githubusercontent.com/00-Evan/shattered-pixel-dungeon/master/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/ui/changelist/v1_X_Changes.java ; https://raw.githubusercontent.com/00-Evan/shattered-pixel-dungeon/master/core/src/main/assets/messages/windows/windows.properties [industry]
30. Gajos KZ, Czerwinski M, Tan DS, Weld DS (2006). Exploring the Design Space for Adaptive Graphical User Interfaces. AVI 2006. https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/avi2006-adaptiveui.pdf
31. Tan DS, Gergle D, Scupelli PG, Pausch R (2003). With Similar Visual Angles, Larger Displays Improve Spatial Performance. CHI 2003. https://www.microsoft.com/en-us/research/wp-content/uploads/2016/12/With-Similar-Visual-Angles-Larger-Displays-Improve-Performance-on-Spatial-Task.pdf
32. Rädle R, Jetter H-C, Müller J, Reiterer H (2014). Bigger is Not Always Better: Display Size, Performance, and Task Load during Peephole Map Navigation. CHI 2014, pp. 4127-4136. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2014.bib [abstract only]
33. Clark J (2015), summarising Hoober S (2013) and others. How We Hold Our Gadgets (excerpt from Designing for Touch). A List Apart no. 432, read from a GitHub web capture. https://raw.githubusercontent.com/tdamdouni/WebCapture/master/%23StateoftheArt/How%20We%20Hold%20Our%20Gadgets.md [secondary]
34. Yoon D, Hinckley K, Benko H, Guimbretière F, Irani P, Pahud M, Gavriliu M (2015). Sensing Tablet Grasp + Micro-mobility for Active Reading. UIST 2015. https://www.microsoft.com/en-us/research/wp-content/uploads/2016/10/Sensing-Tablet-Grasp-Micro-mobility-UIST-2015.pdf
35. Cheng L-P, Liang H-S, Wu C-Y, Chen MY (2013). iGrasp: Grasp-Based Adaptive Keyboard for Mobile Devices. CHI 2013, pp. 3037-3046. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2013.bib [abstract only]
36. Rivoal F, Atkins T Jr. (eds.), W3C CSS Working Group (2026). Media Queries Level 4 (Candidate Recommendation Draft, 19 Feb 2026; editor's source), with MDN notes on orientationchange. https://raw.githubusercontent.com/w3c/csswg-drafts/main/mediaqueries-4/Overview.bs
37. The Chromium Authors (2026). Chromium source, main branch fetched 29 Sep 2026: ui/base/pointer/pointer_device.cc, pointer_device_win.cc, pointer_device_android.cc and base/win/win_util.cc. Official GitHub mirror. https://raw.githubusercontent.com/chromium/chromium/main/ui/base/pointer/pointer_device_win.cc ; https://raw.githubusercontent.com/chromium/chromium/main/ui/base/pointer/pointer_device_android.cc
38. W3C Pointer Events Working Group (2026). Pointer Events (editor's draft source). https://raw.githubusercontent.com/w3c/pointerevents/gh-pages/index.html
39. Atkins T, Etemad EJ (eds.), W3C CSS Working Group (2026). CSS Values and Units Module Level 4 (editor's draft source), with MDN browser-compat-data for support. https://raw.githubusercontent.com/w3c/csswg-drafts/main/css-values-4/Overview.bs
40. Google / Android Developers (2026, read 29 Sep 2026). Enable natural input on all form factors. https://developer.android.com/games/develop/multiplatform/enable-natural-input-on-all-form-factors
41. Nicolau H, Jorge J (2012). Touch Typing Using Thumbs: Understanding the Effect of Mobility and Hand Posture. CHI 2012, pp. 2683-2686. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2012.bib [abstract only]
42. Azenkot S, Zhai S (2012). Touch Behavior with Different Postures on Soft Smartphone Keyboards. MobileHCI 2012, pp. 251-260. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/mobilehci/mobilehci-2012.bib [abstract only]
43. Karlson AK (2007). Interface and Interaction Design for One-Handed Mobile Computing. PhD dissertation, University of Maryland (committee-examined, not journal peer review). https://www.microsoft.com/en-us/research/wp-content/uploads/2007/10/umi-umd-4977.pdf
44. Le HV, Mayer S, Bader P, Henze N (2018). Fingers' Range and Comfortable Area for One-Handed Smartphone Interaction Beyond the Touchscreen. CHI 2018. Abstract via a bibliographic mirror: https://raw.githubusercontent.com/swkim101/cspapers.org/main/index/0/2/5062841 [abstract only]
45. Bergstrom-Lehtovirta J, Oulasvirta A (2014). Modeling the Functional Area of the Thumb on Mobile Touchscreen Surfaces. CHI 2014. Abstract via a bibliographic mirror: https://raw.githubusercontent.com/swkim101/cspapers.org/main/index/0/8/568971 [abstract only]
46. Eardley R, Roudaut A, Gill S, Thompson SJ (2017). Understanding Grip Shifts: How Form Factors Impact Hand Movements on Mobile Phones. CHI 2017, pp. 4680-4691. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2017.bib [abstract only]
47. Gordon CC et al., US Army Natick (2012). ANSUR II public data files (female and male) and databases overview. Military sample; copy on GitHub; percentiles computed by the researchers. https://raw.githubusercontent.com/0xArwa/soldier-race-prediction/main/Race%20Prediction/ANSUR%20II%20Databases%20Overview.csv [data]
48. Weir D, Rogers S, Murray-Smith R, Löchtefeld M (2012). A User-Specific Machine Learning Approach for Improving Touch Accuracy on Mobile Devices. UIST 2012, pp. 465-476. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/uist/uist-2012.bib [abstract only]
49. Findlater L, Wobbrock JO (2012). Personalized Input: Improving Ten-Finger Touchscreen Typing through Automatic Adaptation. CHI 2012, pp. 815-824. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2012.bib [abstract only]
50. Chrome DevTools team (2026). EmulatedDevices.ts, main branch fetched 29 Sep 2026; with W3C CSS Environment Variables Module Level 1 on safe-area insets. https://raw.githubusercontent.com/ChromeDevTools/devtools-frontend/main/front_end/models/emulation/EmulatedDevices.ts [data]
51. Google / Android Developers (2026). Display content edge-to-edge in views. https://developer.android.com/develop/ui/views/layout/edge-to-edge
52. Google / Android Developers (2026). View.setSystemGestureExclusionRects (API reference). https://developer.android.com/reference/android/view/View
53. Google / Android Developers (2026). Make apps more accessible: use large, simple controls. https://developer.android.com/guide/topics/ui/accessibility/apps
54. Apple (2025; touch-control guidance updated 9 Jun 2025). Human Interface Guidelines: Game controls. Apple Developer HIG (JSON source). https://developer.apple.com/tutorials/data/design/human-interface-guidelines/game-controls.json
55. Microsoft (2020). Guidelines for touch targets (Windows apps). Microsoft Learn source, MicrosoftDocs/windows-dev-docs. https://raw.githubusercontent.com/MicrosoftDocs/windows-dev-docs/docs/hub/apps/develop/input/guidelines-for-targeting.md
56. Bragdon A, Nelson E, Li Y, Hinckley K (2011). Experimental Analysis of Touch-Screen Gesture Designs in Mobile Environments. CHI 2011. https://www.microsoft.com/en-us/research/wp-content/uploads/2016/11/Mobile-Touch-Gestures-CHI-2011.pdf
57. Corsten C, Cherek C, Karrer T, Borchers J (2015). HaptiCase: Back-of-Device Tactile Landmarks for Eyes-Free Absolute Indirect Touch. CHI 2015, pp. 2171-2180. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2015.bib [abstract only]
58. Wang Y, Yu C, Liu J, Shi Y (2013). Understanding Performance of Eyes-Free, Absolute Position Control on Touchable Mobile Phones. MobileHCI 2013, pp. 79-88. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/mobilehci/mobilehci-2013.bib [abstract only]
59. Lu Y, Yu C, Fan S, Bi X, Shi Y (2019). Typing on Split Keyboards with Peripheral Vision. CHI 2019, pp. 1-12. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2019.bib [abstract only]
60. W3C WAI AG Working Group (2023). Understanding Success Criterion 2.5.8: Target Size (Minimum). WCAG 2.2. https://raw.githubusercontent.com/w3c/wcag/main/understanding/22/target-size-minimum.html
61. Apple (2026). Human Interface Guidelines: Accessibility. Apple Developer HIG (JSON source). https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json
62. adamdw499 (2024). Issue #1749: The small gaps in the UI shouldn't be clickable. Shattered Pixel Dungeon issue tracker, opened 7 Jul 2024 (player report). https://github.com/00-Evan/shattered-pixel-dungeon/issues/1749 [industry]
63. Kurtenbach GP, Sellen AJ, Buxton WAS (1993). An Empirical Evaluation of Some Articulatory and Cognitive Aspects of Marking Menus. Human-Computer Interaction 8(1). Submitted manuscript (July 1991) read. https://www.microsoft.com/en-us/research/wp-content/uploads/2016/08/marking-menus-93.pdf
64. Zhao S, Agrawala M, Hinckley K (2006). Zone and Polygon Menus: Using Relative Position to Increase the Breadth of Multi-Stroke Marking Menus. CHI 2006. https://www.microsoft.com/en-us/research/wp-content/uploads/2016/11/Zone-Polygon-Menus-CHI-2006.pdf
65. Microsoft (2015). Design guidelines for Universal Windows Platform (UWP) apps, August 2015 (touch design; effective pixels and platform scaling). Archived PDF. https://raw.githubusercontent.com/tilsgee/DesignGuidelinesArchive/main/uwp10.pdf
66. Android Open Source Project (2026). frameworks/base core/res/res/values/config.xml (config_viewConfigurationTouchSlop) and ViewConfiguration.java, main branch, GitHub mirror. https://raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/main/core/res/res/values/config.xml
67. Czerwinski M, van Dantzich M, Robertson G, Hoffman H (1999). The Contribution of Thumbnail Image, Mouse-over Text and Spatial Location Memory to Web Page Retrieval in 3D. INTERACT '99, pp. 163-170. https://www.microsoft.com/en-us/research/wp-content/uploads/1999/01/interact99.pdf
68. W3C AG Working Group (2008, current source). WCAG 2 Success Criterion 3.2.3 Consistent Navigation, and Understanding Consistent Navigation. https://raw.githubusercontent.com/w3c/wcag/main/understanding/20/consistent-navigation.html
69. Hinckley K, Pausch R, Proffitt D, Kassell N (1997). Attention and Visual Feedback: The Bimanual Frame of Reference. ACM/SIGGRAPH Symposium on Interactive 3D Graphics 1997. https://www.microsoft.com/en-us/research/wp-content/uploads/2016/12/Bimanual-Frame-of-Reference-I3D-1997.pdf
70. Gutwin C, Cockburn A, Scarr J, Malacria S, Olson SC (2014). Faster Command Selection on Tablets with FastTap. CHI 2014, pp. 2617-2626. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2014.bib [abstract only]
71. Gustafson S, Holz C, Baudisch P (2011). Imaginary Phone: Learning Imaginary Interfaces by Transferring Spatial Memory from a Familiar Device. UIST 2011, pp. 283-292. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/uist/uist-2011.bib [abstract only]
72. W3C AG Working Group (2023). Understanding Success Criterion 3.2.6 Consistent Help. WCAG 2.2. https://raw.githubusercontent.com/w3c/wcag/main/understanding/22/consistent-help.html
73. Microsoft (2024). Responsive design techniques (Windows apps). MicrosoftDocs/windows-dev-docs source, ms.date 25 Sep 2024. https://raw.githubusercontent.com/MicrosoftDocs/windows-dev-docs/docs/hub/apps/design/layout/responsive-design.md
74. Wiestler T, Waters-Metenier S, Diedrichsen J (2014). Effector-Independent Motor Sequence Representations Exist in Extrinsic and Intrinsic Reference Frames. Journal of Neuroscience 34(14):5054. Abstract via a third-party BibTeX mirror: https://raw.githubusercontent.com/bpinsard/CoRe/da973125e25c0cb2d2fde43f4de16e1d8058f261/drafts/rbiq/abstract_rbiq.bib [abstract only]
75. derei (2024). Issue #1852: Left hand enhancement please (tablet layout). Shattered Pixel Dungeon issue tracker, opened 25 Sep 2024 (player report). https://github.com/00-Evan/shattered-pixel-dungeon/issues/1852 [industry]
76. Malacria S, Bailly G, Harrison J, Cockburn A, Gutwin C (2013). Promoting Hotkey Use through Rehearsal with ExposeHK. CHI 2013, pp. 573-582. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2013.bib [abstract only]
77. Fennedy K, Malacria S, Lee H, Perrault ST (2020). Investigating Performance and Usage of Input Methods for Soft Keyboard Hotkeys. MobileHCI 2020. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/mobilehci/mobilehci-2020.bib [abstract only]
78. Hikosaka O, Nakahara H, Rand MK, Sakai K, Lu X, Nakamura K, Miyachi S, Doya K (1999). Parallel neural networks for learning sequential procedures. Trends in Neurosciences 22:464-471. PubMed abstract quoted on an MIT OpenCourseWare readings page: https://raw.githubusercontent.com/mitocwcontent/9.011-fall-2002/main/content/pages/readings.md [abstract only]
79. Apple (2026). Choosing a user interface idiom for your Mac app. Apple Developer Documentation (UIKit / Mac Catalyst). https://developer.apple.com/tutorials/data/documentation/uikit/choosing-a-user-interface-idiom-for-your-mac-app.json
80. Microsoft (2022; 2026). DPI and device-independent pixels (Win32, ms.date 26 May 2022); Screen sizes and breakpoints (Windows apps, ms.date 13 Jul 2026). https://raw.githubusercontent.com/MicrosoftDocs/win32/docs/desktop-src/LearnWin32/dpi-and-device-independent-pixels.md
81. Google / Android Developers (2026). Canonical layouts. https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts
82. DCSS development team (2026). Dungeon Crawl Stone Soup source (master): crawl-ref/source/tilesdl.cc and webserver/game_data/static/game.js. https://raw.githubusercontent.com/crawl/crawl/master/crawl-ref/source/tilesdl.cc ; https://raw.githubusercontent.com/crawl/crawl/master/crawl-ref/source/webserver/game_data/static/game.js [industry]
83. NetHack DevTeam (2026). NetHack 3.7 Guidebook (16 Apr 2026). https://raw.githubusercontent.com/NetHack/NetHack/NetHack-3.7/doc/Guidebook.txt
84. Google / Android Developers (2026). Support large screen resizability (Android game development). https://developer.android.com/games/develop/multiplatform/support-large-screen-resizability
85. Microsoft (2022). Xbox Accessibility Guideline 101: Text display. Microsoft Learn, ms.date 9 May 2022, read from a GitHub mirror. https://raw.githubusercontent.com/edigonzales-microsoft/mintlify-docs/main/sources/gaming/accessibility/xbox-accessibility-guidelines/101.md
86. Rolehack (2026). NHW_Map.java (RolehackFront) and fonts/monobold.ttf (RolehackDroid), local checkouts. file:///home/user/RolehackFront/lib/src/com/tbd/forkfront/NHW_Map.java [in-house measurement, not research]
87. Rolehack (2026). win/web/web.js (renderMap) and VT323-Regular.ttf, local checkout. file:///home/user/Rolehack/win/web/web.js [in-house measurement, not research]
88. Jakobsen MR, Hornbæk K (2011). Sizing up Visualizations: Effects of Display Size in Focus+context, Overview+detail, and Zooming Interfaces. CHI 2011, pp. 1451-1460. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2011.bib [abstract only]
89. Schildbach B, Rukzio E (2010). Investigating Selection and Reading Performance on a Mobile Phone While Walking. MobileHCI 2010, pp. 93-102. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/mobilehci/mobilehci-2010.bib [abstract only]
90. Brogue CE contributors (2026). Brogue: Community Edition, src/platform/tiles.c and CHANGELOG (master). https://raw.githubusercontent.com/tmewett/BrogueCE/master/src/platform/tiles.c [industry]
91. Godot Engine contributors (2026). Multiple resolutions (Godot Engine documentation source). https://raw.githubusercontent.com/godotengine/godot-docs/master/tutorials/rendering/multiple_resolutions.rst
92. Google / Android Developers (2026, read 29 Sep 2026). Configure graphics for Google Play Games on PC. https://developer.android.com/games/playgames/graphics
93. Nebeling M, Matulic F, Norrie MC (2011). Metrics for the Evaluation of News Site Content Layout in Large-Screen Contexts. CHI 2011, pp. 1511-1520. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2011.bib [abstract only]
94. Robertson G, Czerwinski M, Baudisch P, Meyers B, Robbins D, Smith G, Tan D (2005). The Large-Display User Experience. IEEE Computer Graphics and Applications 25(4) (draft). https://www.microsoft.com/en-us/research/wp-content/uploads/2005/01/2005-robertson-cga-largedisplayuserexperiencedraft.pdf
95. Wagner J, Huot S, Mackay W (2012). BiTouch and BiPad: Designing Bimanual Interaction for Hand-held Tablets. CHI 2012. Abstract via a bibliographic mirror: https://raw.githubusercontent.com/swkim101/cspapers.org/main/index/1/6/14136397 [abstract only]
96. Pfeuffer K, Hinckley K, Pahud M, Buxton B (2017). Thumb + Pen Interaction on Tablets. CHI 2017. https://www.microsoft.com/en-us/research/wp-content/uploads/2017/04/Thumb-Plus-Pen-CHI-2017.pdf
97. Wolf K, Henze N (2014). Comparing Pointing Techniques for Grasping Hands on Tablets. MobileHCI 2014, pp. 53-62. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/mobilehci/mobilehci-2014.bib [abstract only]
98. Müller H, Gove J, Webb J (2012). Understanding Tablet Use: A Multi-Method Exploration. MobileHCI 2012, pp. 1-10. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/mobilehci/mobilehci-2012.bib [abstract only]
99. Google / Android Developers (2025; page updated 22 Sep 2026). Layouts and navigation patterns. https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
100. Google / Android Developers (2026). Build adaptive navigation. https://developer.android.com/develop/ui/compose/layouts/adaptive/build-adaptive-navigation
101. CleverRaven contributors (2026). Cataclysm: Dark Days Ahead, src/options.cpp, Android options (master). https://raw.githubusercontent.com/CleverRaven/Cataclysm-DDA/master/src/options.cpp [industry]
102. W3C CSS Working Group (2026). CSSOM View Module Level 1 (editor's draft), with MDN browser-compat-data api/Window.json. https://raw.githubusercontent.com/w3c/csswg-drafts/main/cssom-view-1/Overview.bs
103. MDN contributors (2026). <meta name="viewport"> (interactive-widget, viewport-fit). MDN Web Docs source. https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/html/reference/elements/meta/name/viewport/index.md
104. WICG (2026). Keyboard Map (Community Group Draft), with MDN browser-compat-data api/Keyboard.json. https://raw.githubusercontent.com/WICG/keyboard-map/main/index.bs
105. W3C CSS Working Group (2026). Resize Observer (editor's draft); CSS Conditional Rules Module Level 5 (working draft). https://raw.githubusercontent.com/w3c/csswg-drafts/main/resize-observer-1/Overview.bs
106. MDN / Open Web Docs contributors (2026). browser-compat-data, css/at-rules/media.json (hover). https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/at-rules/media.json
107. Apple (2019). Safari 13 Release Notes. Apple Developer Documentation. https://developer.apple.com/tutorials/data/documentation/safari-release-notes/safari-13-release-notes.json
108. WHATWG; MDN / Open Web Docs contributors (2026). Fullscreen API Standard; browser-compat-data api/Element.json (requestFullscreen). https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Element.json
109. W3C Web Applications Working Group; MDN / Open Web Docs contributors (2026). Screen Orientation (editor's draft); browser-compat-data for ScreenOrientation, manifest orientation and display. https://raw.githubusercontent.com/w3c/screen-orientation/gh-pages/index.html
110. The Chromium Authors (2026). Chromium source: components/browser_ui/styles/android/java/res/values/dimens.xml and chrome/android/java/res/values/dimens.xml. https://raw.githubusercontent.com/chromium/chromium/main/components/browser_ui/styles/android/java/res/values/dimens.xml
111. Google / Android Developers (2026; updated 24 Sep 2026). Develop games for all screens. https://developer.android.com/games/develop/all-screens
112. Valve (data), jdegene (mirror) (2026). Steam Hardware & Software Survey, Primary Display Resolution rows for 2026-08-01, via the third-party mirror steamHWsurvey shs.csv. https://raw.githubusercontent.com/jdegene/steamHWsurvey/master/shs.csv [secondary]
113. Apple (2026). Human Interface Guidelines: Designing for games. Apple Developer HIG (JSON source). https://developer.apple.com/tutorials/data/design/human-interface-guidelines/designing-for-games.json
114. Luanti contributors (2026). Luanti src/gui/touchscreenlayout.cpp (master), with touchcontrols.cpp and the Android manifest. https://raw.githubusercontent.com/luanti-org/luanti/master/src/gui/touchscreenlayout.cpp [industry]
115. Unity Technologies (2024). Designing UI for Multiple Resolutions (uGUI package documentation) and CanvasScaler.cs. https://raw.githubusercontent.com/Unity-Technologies/uGUI/main/com.unity.ugui/Documentation~/HOWTO-UIMultiResolution.md
116. gurrhack (2026). ForkFront-Android lib/res/xml/preferences.xml and lib/res/values/values.xml (master). https://raw.githubusercontent.com/gurrhack/ForkFront-Android/master/lib/res/xml/preferences.xml [industry]
117. bilgincoskun (2026). brogue-android-port README (master). https://raw.githubusercontent.com/bilgincoskun/brogue-android-port/master/README.md [industry]
118. Henze N, Rukzio E, Boll S (2011). 100,000,000 Taps: Analysis and Improvement of Touch Performance in the Large. MobileHCI 2011, pp. 133-142. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/mobilehci/mobilehci-2011.bib [abstract only]
119. Henze N, Rukzio E, Boll S (2012). Observational and Experimental Investigation of Typing Behaviour Using Virtual Keyboards for Mobile Devices. CHI 2012, pp. 2659-2668. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2012.bib [abstract only]
120. Holz C, Baudisch P (2010). The Generalized Perceived Input Point Model and How to Double Touch Accuracy by Extracting Fingerprints. CHI 2010, pp. 581-590. Abstract via ACM DL metadata mirror: https://raw.githubusercontent.com/boudinfl/acm-cr/master/data/acm-dl/chi/chi-2010.bib [abstract only]
