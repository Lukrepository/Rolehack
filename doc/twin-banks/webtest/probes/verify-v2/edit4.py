p='DESIGN.md'
s=open(p).read()
n=0
def rep(old,new,count=1):
    global s,n
    assert s.count(old)>=1, old[:90]
    s=s.replace(old,new,count); n+=1
rep("centre ALL (Chat, Drop unknown…). Places that do not apply this turn are dimmed, never re-ranked. | **slide only**: slide from the centre to a place and lift | lifting without a slide closes it |",
    "centre ALL (Chat, Drop unknown…). Places that do not apply this turn are dimmed, never re-ranked; a tap or a slide-and-lift onto a dimmed place does nothing (swallowed, with the tick). | **slide only**: slide from the centre to a place and lift | lifting without a slide closes it |")
rep("| tap CONTEXT when several actions apply (right) | HERE, as above | let go and tap, or chord | after a pick, a map tap, 4 s idle |",
    "| tap CONTEXT when one action applies (right) | nothing: the action runs at once, except **Ascend and Descend**: the first tap lights ↑ or ↓ on the pad and names it in the pill | a second tap on CONTEXT or on the lit place within 2 s | after 2 s, any other tap, a map tap |\n| tap CONTEXT when several actions apply (right) | HERE, as above; **↑ Ascend and ↓ Descend take a second tap** on the same place within 2 s (the first lights it and names it in the pill) | let go and tap, or chord | after a pick, a map tap, 4 s idle |")
rep("Slide-only means the pad is arrows again the moment the thumb lifts. CONTEXT's tap is a deliberate tap on the other thumb, so its HERE stays up to be tapped.",
    "Slide-only means the pad is arrows again the moment the thumb lifts. CONTEXT's HERE stays up to be tapped.\n- **Why the stairs take a second tap from CONTEXT** (round 2). CONTEXT sits next to COMBAT, whose tap is always followed by a pad tap. A near miss onto CONTEXT, 0.5% on Lucas's phone and 2.6% at 360 dp (§6), would descend on bare stairs, or open a sticky HERE whose ↓ the aiming tap would hit: P4's failure by another road. So from CONTEXT, Ascend and Descend take a second tap, whether CONTEXT has one action or several. Every other place either asks (Open, Close, Loot, Sacrifice), shows (Look here) or costs at most a turn (Pick up). A deliberate descent costs one more tap; the pad-centre slide still descends in one gesture.")
rep("- **Size and place.** min(420, map width − 12) dp wide, at most 352 dp tall (it scrolls), bottom-anchored and centred in the map area: 420×274 on Lucas's phone in both orientations, between the banks in landscape and above them in portrait, never over a key.",
    "- **Size and place.** min(420, map width − 12) dp wide, at most 352 dp tall (it scrolls), bottom-anchored and centred in the map area: 420×274 on Lucas's phone in both orientations, between the banks in landscape and above them in portrait, never over a key. A usable layout always has room for it: at least 200 dp for three columns and 88 dp for two rows of 44 dp items. A window that cannot hold it has nowhere to open MENU, so `layout()` calls it unusable and the page shows classic (§12).")
open(p,'w').write(s)
print(n)
