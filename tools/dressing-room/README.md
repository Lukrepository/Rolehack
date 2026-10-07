# Rolehack Dressing Room

<!-- Written for Rolehack by Lucas Ruiz, 2026-09-26.  See ROLEHACK-CHANGES.md. -->

A web page for trying the paper doll by hand: any hero body, any skin tone,
any item in every slot, drawn exactly as the Rolehack app draws it.  The live
copy is https://claude.ai/artifact/Q71uL4CefJHJRnfe8g4t7r (shared from its
page).  It was made for Lucas's brother, whose test of a good RPG is that new
gear always changes how you look.

The drawing code in `template.html` is a line-for-line JavaScript port of the
app's `RhDoll.java` (RolehackFront), fed by this repository's own tiles, so
the two must change together: after a change to `RhDoll.java`, port it here,
rebuild and republish.

## Files

| File | What it is |
|---|---|
| `export.py` | Reads `win/share/*.txt`, `include/objects.h` and `src/u_init.c`; writes `data.json`: bodies with their anchors, every wearable item with its floor tile and flags, some absurd things to hold, the starting kits, and the costume table. |
| `template.html` | The page and the doll port.  `__DATA__` marks where the data goes. |
| `build.py` | Inlines `data.json` into `template.html` and writes `rolehack-dressing-room.html`. |
| `outfit.py` | Writes a link to the page wearing an outfit given in plain words. |
| `data.json`, `rolehack-dressing-room.html` | Built files, kept so the page opens without building. |

## Rebuilding

    python3 export.py && python3 build.py

## Outfit links

An artifact link can carry only a bare `#token`, so an outfit is one dotted
token: `body-gender`, `t` and a skin tone 1-8, then a slot letter and an item
id for each worn item (h helmet, e eyewear, a amulet, c cloak, s suit,
u shirt, g gloves, b boots, w weapon, o off hand, d shield), with `k0` or
`n0` when the costume rule or the doll is off.  For example
`#gnome-f.t6.s107.c147`.  Write one from names:

    python3 outfit.py gnome female tone=6 suit="black dragon scale mail" cloak="opera cloak"

The page's "Copy outfit link" key gives one back.  Item ids are positions in
`objects[]`, so links go stale if `objects.h` gains items.

## Credits

Tiles from NetHack 5.0, under the NetHack General Public License (see
`LICENSE`).  Apothecary tiles by Lucas Ruiz.  The doll's layers, the page and
these tools were written by Claude for Rolehack, at Lucas's asking and to his
review.
