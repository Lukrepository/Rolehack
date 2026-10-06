import re
p='DESIGN.md'
s=open(p).read()
n=0
def rep(old,new,count=1):
    global s,n
    assert s.count(old)>=1, old[:90]
    s=s.replace(old,new,count); n+=1
rep("Below what 46 dp keys need, the result is marked degraded and says why; `layout()` never throws.",
    "Below what 46 dp keys need, the result is marked degraded and says why; `layout()` never throws. A window with no room for twin banks and a map (one that shows 8×8 cells and holds the drawer), such as a near-square split screen, comes back unusable, and the page shows classic there.")
rep("On phones that cell shows at least today's 34 columns in landscape, with all 21 rows where they fit. It is set once per device,",
    "On phones that cell shows at least today's 34 columns in landscape where the 12 dp floor allows (a landscape map at least 408 dp wide), with all 21 rows where they fit. It is set once per device,")
rep("Android's text cells 36.7% / 33.4% (53×21 and 51×21 cells at a 15.2 dp cell)",
    "Android's text cells 37.0% / 33.7% (52.8×21 and 50.4×21 cells at a 15.35 dp cell)")
rep("`mapCell: 'rows'` 42.7% / 38.9% (the earlier final's bigger glyphs).",
    "`mapCell: 'rows'` 43.0% / 39.1% (the earlier final's bigger glyphs).")
rep("| v2 with `mapCell: 'rows'` (17.7 dp) | 42.7% | 38.9% | 26×21 / 25×21 |",
    "| v2 with `mapCell: 'rows'` (17.8 dp) | 43.0% | 39.1% | 25.6×21 / 24.4×21 |")
rep("| v2 with Android's text cell (15.2 dp tall) | 36.7% | 33.4% | 53×21 / 51×21 (today about 55×15) |",
    "| v2 with Android's text cell (15.35 dp tall) | 37.0% | 33.7% | 52.8×21 / 50.4×21 (today about 55×15) |")
rows = {
 '896x443': ('32.4 / 20.7','34×21','10.2 / 10.7'),
 '443x939': ('29.5 / 35.1','32×21','4.3 / 9.2'),
 '640x360': ('29.1 / 19.6','23×20','4.4 / 10.0'),
 '360x640': ('27.9 / 21.8','29×15','2.3 / 7.4'),
 '915x412': ('38.9 / 19.9','36×21','7.9 / 9.8'),
 '412x915': ('31.2 / 37.4','29×21','2.5 / 8.5'),
 '844x390': ('37.1 / 19.0','35×21','7.1 / 9.2'),
 '390x844': ('31.3 / 35.5','30×21','7.7 / 8.0'),
 '1024x768': ('33.4 / 35.9','whole','6.2 / 26.2'),
 '768x1024': ('25.4 / 41.3','61×21','4.0 / 20.0'),
 '1180x820': ('36.5 / –','whole','6.9'),
 '1366x768 touch': ('36.0 / 44.3','whole','10.3 / 23.0'),
}
for k,(m,c,v) in rows.items():
    pat = re.compile(r'^\| '+re.escape(k)+r' \| [\d.]+ / [\d.–]+ \| [^|]+ \| [^|]+ \|', re.M)
    assert len(pat.findall(s))==1, k
    s = pat.sub(f'| {k} | {m} | {c} | {v} |', s); n+=1
rep("**Where the void rose.** On Lucas's phone in landscape the header now stacks in the glass, so the 63 dp over each bank is empty (11.4%, today 10.7%).",
    "**The void on Lucas's phone.** In landscape the header stacks in the glass, so the 63 dp over each bank is empty: 10.2% void, a little under today's 10.7% (11.4% in round 1, before the message rows took the web's own 9.5 CSS px x-height).")
rep("| `sweep.mjs`, the CI gate: ten sections, 5,862 layouts (below) | **0 issues.** On the earlier rule (`RH_LAYOUT=../final/layout.mjs`): 3,098 issues, in every section. |",
    "| `sweep.mjs`, the CI gate: ten sections, 53,625 layouts (below) | **0 issues** (2,715 unusable results, all in sections 7 and 10, where the page shows classic). On the earlier rules (`RH_LAYOUT=<path>`): the final 11,217 issues, in every section; round-1 v2 5,331, in six. |")
rep("PIN 2 → Take off 0.52% (Lucas) to 1.30% (360). A pad tap travelling the map: 0 in 200,000; landing in the ring (a preview): 0.20–0.25% in landscape, none in portrait. |",
    "PIN 2 → Take off 0.52% (Lucas) to 1.30% (360). Inside the action pad, COMBAT → CONTEXT 0.52% (Lucas) to 2.57% (360) (§6). A pad tap travelling the map: 0 in 200,000; landing in the ring (a preview): 0.20–0.25% in landscape, none in portrait. |")
rep("≥ 12 dp on every touch screen (101 dp in portrait on Lucas's phone).",
    "≥ 12 dp on every touch screen (107 dp in portrait on Lucas's phone).")
rep("| `voidnp.mjs`: big-screen void with panels counted as void | 1920x1080: 47.1% (panels 42.8% of the screen).",
    "| `voidnp.mjs`: big-screen void with panels counted as void | 1920x1080: 47.4% (panels 43.1% of the screen).")
rep("over 13 phones and 7 tablets in both orientations, 4 touch laptops, 11 mouse screens; every pair by the harness (0/0/0/0, 36 of 36 both ways with the 3 dp margin) and by hit-model parity; every screen by the harness's checks plus: no band or panel over or within 12 dp of a key, pop-ups inside the map, a drawer, ≥ 12 dp key-to-map, mouse void under 21.8% | 760 |",
    "over 13 phones, 7 tablets and 4 foldables or split views (540x720, 561x744, 690x829, 701x841) in both orientations, 4 touch laptops, 11 mouse screens; every pair by the harness (0/0/0/0, 36 of 36 both ways with the 3 dp margin) and by hit-model parity; every screen by the harness's checks plus: usable and drawable, no band or panel over or within 12 dp of a key, pop-ups inside the map, a drawer, ≥ 12 dp key-to-map, mouse void under 21.8% | 880 |")
rep("| 2 | the map never shrinks as the keys shrink: cells and map share, 46 ≥ 52 ≥ 58 | 220 |",
    "| 2 | the map never shrinks as the keys shrink: cells and map share, 46 ≥ 52 ≥ 58, on every matrix screen and variant (260), and on a dense grid of windows 480–1000 × 600–960 dp, step 8, in every variant (15,180 windows, 3 key sizes each); a window usable at one size stays usable at the smaller ones | 15,440 |")
rep("| 6 | grip lift 0/20/40/80 on four phone pairs and two tablet pairs, both cell modes: clamped, nothing off screen or under a band; parity | 192 |",
    "| 6 | grip lift 0/20/40/80 on four phone pairs and two tablet pairs, both cell modes: clamped, nothing off screen or under a band; parity. Then lift × `anchor: 'safe'` × bottom insets 21/34 on iPhone 12 mini, 14, 15 Pro Max and 640x360 | 256 |")
rep("| 7 | short screens 640x336, 592x336, 600x330, 700x320, 1024x300, 800x250, 480x300, 300x200 and their portraits: a spec every time, the pad never under 46 nor the right columns under 40 unless degraded, every degraded result with a reason | 240 |",
    "| 7 | short screens 640x336, 592x336, 600x330, 700x320, 1024x300, 800x250, 480x300, 300x200 and their portraits; every near-square window 320–520 dp (step 8) at 46/52/58; eleven windows smaller than their budget: a spec every time, the pad never under 46 nor the right columns under 40 unless degraded, every degraded result with a reason, the text never blamed at the default size; usable and clean, or unusable (2,041 unusable: the page shows classic) | 2,279 |")
rep("| 10 | 3,000 seeded random windows and settings (NaN, Infinity, strings, nonsense budgets and insets): a spec with only finite numbers every time | 3,000 |",
    "| 10 | 3,000 seeded random windows and settings (NaN, Infinity, strings, nonsense budgets and insets): a spec with only finite numbers every time, and every usable one drawable by `lib.mjs` `drawable()` (674 unusable) | 3,000 |")
open(p,'w').write(s)
print(n)
