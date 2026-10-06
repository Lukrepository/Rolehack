p='DESIGN.md'
s=open(p).read()
n=0
def rep(old,new,count=1):
    global s,n
    assert s.count(old)>=1, old[:90]
    s=s.replace(old,new,count); n+=1
rep("| Kept, and v2 makes it act only when a tap would travel (§6), keeps at least 24 dp between the banks so the halos never meet, and swallows map taps 200 ms after a drawer, modal or menu closes. |",
    "| Kept, and v2 makes it act only when a tap would travel, Fight armed included (§6), keeps at least 24 dp between the banks so the halos never meet, and swallows map taps 200 ms after a drawer, modal or menu closes. Round 2: the action pad's seams swallow instead of tiling. |")
rep("| Kept. v2: from the pad centre it is slide-only, so a walking tap can never become Descend. |",
    "| Kept. v2: from the pad centre it is slide-only, so a walking tap can never become Descend; round 2: from CONTEXT the stairs take a second tap, so a near miss of COMBAT cannot either. |")
rep("| v2: a preview, not a swallow, only when a tap would travel; retires after three sessions with no catches. |",
    "| v2: a preview, not a swallow, only when a tap would travel; retires after three sessions with no unconfirmed preview; during the switch it also guards the old radial's and the old pray hold's habits (§15). |")
rep("| v2: the cell that shows at least today's 34 landscape columns (13.4 dp on Lucas's phone); \"fill the rows\" is the `mapCell: 'rows'` setting. |",
    "| v2: the cell that shows at least today's 34 landscape columns where the 12 dp floor allows (13.4 dp on Lucas's phone); \"fill the rows\" is the `mapCell: 'rows'` setting. |")
rep("| The desk dock: the same banks at 40 dp under the whole level, legends, a Ctrl+Space prefix | size-classes | Kept. v2: Ctrl+Shift+Space on ChromeOS; text cells capped by width;",
    "| The desk dock: the same banks at 40 dp under the whole level, legends, a Ctrl+Space prefix | size-classes | Kept. v2: the prefix is Ctrl+; (Ctrl+Space switches input sources on macOS and ChromeOS); text cells capped by width;")
rep("| 640x360 | phone | 58 / 61 | 44.7 | 8 / 8 | 24 | 44 / 3 | between | in the glass, stacked | 280×237 | 12 | 23×20 | 2 | – |",
    "| 640x360 | phone | 58 / 61 | 44.7 | 8 / 8 | 24 | 44 / 3 | between | in the glass, stacked | 280×239 | 12 | 23×20 | 2 | – |")
rep("| 360x640 | phone | 58 / 61 | 44.7 | 8 / 8 | 24 | 44 / 3 | above | stacked | 352×180 | 12 | 29×15 | 2 | – |",
    "| 360x640 | phone | 58 / 61 | 44.7 | 8 / 8 | 24 | 44 / 3 | above | stacked | 352×182 | 12 | 29×15 | 2 | – |")
rep("| 915x412 | phone | 58 / 64 | 55.3 | 12 / 12 | 24 | 44 / 3 | between | in the glass, stacked | 503×289 | 13.7 | 37×21 | 2 | – |",
    "| 915x412 | phone | 58 / 64 | 55.3 | 12 / 12 | 24 | 44 / 3 | between | in the glass, stacked | 503×291 | 13.9 | 36×21 | 2 | – |")
rep("| 412x915 | phone | 58 / 64 | 55.3 | 12 / 12 | 24 | 44 / 3 | above | stacked | 404×289 | 13.7 | 29×21 | 4 | log |",
    "| 412x915 | phone | 58 / 64 | 55.3 | 12 / 12 | 24 | 44 / 3 | above | stacked | 404×291 | 13.9 | 29×21 | 4 | log |")
rep("| 844x390 | phone | 58 / 62 | 53.3 | 8 / 8 | 24 | 44 / 3 | between | in the glass, stacked | 454×267 | 12.7 | 36×21 | 2 | – |",
    "| 844x390 | phone | 58 / 62 | 53.3 | 8 / 8 | 24 | 44 / 3 | between | in the glass, stacked | 454×269 | 12.8 | 35×21 | 2 | – |")
rep("| 390x844 | phone | 58 / 62 | 53.3 | 8 / 8 | 24 | 44 / 3 | above | stacked | 382×267 | 12.7 | 30×21 | 4 | – |",
    "| 390x844 | phone | 58 / 62 | 53.3 | 8 / 8 | 24 | 44 / 3 | above | stacked | 382×269 | 12.8 | 30×21 | 4 | – |")
rep("and after those a message log under the map (85 dp on Lucas's phone: the history beyond the band's rows; a tap opens it all). So the map ends 101 dp above the banks on Lucas's phone: no confirm ring is needed there.",
    "and after those a message log under the map (91 dp on Lucas's phone: the history beyond the band's rows; a tap opens it all). So the map ends 107 dp above the banks on Lucas's phone: no confirm ring is needed there.")
rep("- **Map.** 280×237 in landscape at the 12 dp floor (23 columns, 19.7 rows: it pans a little) and 352×180 in portrait (29×15). Today 273×165 and 331×152.",
    "- **Map.** 280×239 in landscape at the 12 dp floor (23 columns, 19.9 rows: it pans a little) and 352×182 in portrait (29×15). Today 273×165 and 331×152. The 12 dp floor is why a 360-class phone shows 23, not 34, landscape columns.")
rep("Too short for the whole level above the banks, so the phone rule applies and the column between the banks wins because it shows all 21 rows: 34×21 at 15.3 dp, with the log over the left bank and the inventory over the right. Portrait 600x960: 39×21.",
    "Too short for the whole level above the banks, so the phone rule applies and the column between the banks wins because it shows all 21 rows and at least 70% of the full-width strip's cells (714 against 993): 34×21 at 15.3 dp, with the log over the left bank and the inventory over the right. Portrait 600x960: 39×21.")
rep("- **Void.** 4.4% at 1920x1080, 3.4% at 2560x1440, 3.2% at 3440x1440; 20.8% at 5120x2160, the worst tested (48 px tiles leave height over). Text cells: 14.4%, 8.2% and 7.6%, and 17.8% at 1280x800. Today's 1920x1080: 21.8%. With the panels counted as void it is 47–49%:",
    "- **Void.** 4.4% at 1920x1080, 3.4% at 2560x1440, 3.2% at 3440x1440; 20.9% at 5120x2160, the worst tested (48 px tiles leave height over). Text cells: 14.5%, 8.2% and 7.7%, and 17.9% at 1280x800. Today's 1920x1080: 21.8%. With the panels counted as void it is 47–50%:")
open(p,'w').write(s)
print(n)
