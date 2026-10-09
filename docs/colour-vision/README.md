# Colour vision in Rolehack

Two pages written on 2026-09-28, while Rolehack's support for colour-blind
players was designed and built. Each is a single HTML file with its pictures
inside; open it in any browser.

- **[colour-vision-brief-2026-09-28.html](colour-vision-brief-2026-09-28.html)**
  is the research brief and proposal: what a colour-blind player lost in
  Rolehack, what other games and the accessibility guidelines do about it, seven
  decisions, and what happened next. Its swatches show Rolehack's colours as
  they were *before* the work, so it doubles as the "before" picture.
- **[colour-vision-tiles-2026-09-28.html](colour-vision-tiles-2026-09-28.html)**
  covers the tiles: monsters drawn as one sprite in different colours, which
  merge in simulated colour-blind vision (11 pairs for red-green, 8 for
  tritanopia, 51 in monochrome), the palette search that pulls them apart, and
  the choices made.

## What Rolehack does now

The phone and the browser version work alike. Colour vision is marked
**beta**: the palettes are tuned by simulation, and no colour-blind player has
checked them yet. Reports from players who see colour differently are what
will take the label off.

1. **Safe defaults, for every player in every skin.** The HP colour is plain
   while HP is healthy, yellow below two thirds (white under the amber and green
   phosphors), and vermillion in inverse below one third, and the hero's outline
   on the map doubles below one third. Status badges differ by style as well as
   by colour: critical ones are framed and bold, serious ones solid, warnings
   outlined. On the web the 16 game colours were also nudged apart for red-green
   vision.
2. **Colour vision (beta)**: on the phone, Settings → Mobile interface → Colour
   vision (beta), with About colour vision (beta) under it; on the web,
   Settings → Accessibility. Standard (the default, which swaps nothing),
   Protanopia, Deuteranopia, Tritanopia or Monochrome. A mode swaps the game's
   16 colours in menus, messages and the text map. Protanopia and deuteranopia
   share one red-green palette and tritanopia has its own; Monochrome sets
   blessed, uncursed, cursed and HP apart by brightness.
3. **Tile palettes:** each mode also recolours NetHack's tiles and the paper
   doll, with palettes chosen by simulation to pull same-shaped monsters apart.
   In the red-green and tritan simulations none stay merged; in Monochrome 12
   pairs still do (mostly dragons), and need marks drawn on their tiles, which
   are not drawn yet. On the phone a custom tileset is left as it is. On the
   web, a browser that blocks reading the tile image (some privacy settings)
   keeps the plain tiles in every mode.
4. **Vanilla's `glyph:` option works on the text map** (not on tiles): an
   `OPTIONS=glyph:...` line gives any monster or object its own colour, and
   under a UTF-8 symbol set its own symbol. It takes effect only after a
   symbol-set line. The phone's options file (Settings → Edit options file)
   already has one, `OPTIONS=DECgraphics,runmode:walk`, and a second is
   refused. On the web, start Settings → Your option lines with
   `OPTIONS=symset:Enhanced1`; a browser draws DECgraphics garbled.

## How the pages and palettes are made

The scripts are in [`tools/cvd/`](../../tools/cvd/). They simulate colour
vision with Brettel, Viénot and Mollon (1997) for dichromats, Machado, Oliveira
and Fernandes (2009) for anomalous trichromats, and luminance for monochrome,
all in linear RGB, and measure differences in CIEDE2000. They run in WSL
against a NetHack-web checkout at `/root/NetHack-web`.

- **The brief:** `cvd.py`, `cvd_tiles.py`, `cvd_candidates.py`,
  `cvd_palette.py`, then `build_page.py`, whose header gives the order. A
  rebuild recomputes every swatch from the current code, which now has the new
  colours, so the page kept here is the record of the "before".
- **Layers 1 and 2:** `cvd_webpal.py` and `cvd_layer1.py` (the web's nudged
  colours and their acceptance numbers, `cvd-layer1.json`); `cvd_modes.py`
  (one game palette per mode, `cvd-modes.json`).
- **The tile palettes:** `cvd_tilepal.py <strength>` searches one palette per
  mode and scores it over the 161 same-silhouette monster pairs; it writes
  `cvd-tilepal.json`, kept as `cvd-tilepal-<strength>.json` (9, 12 and 15).
  `leftover.py` lists the pairs each strength leaves merged
  (`cvd-tilepal-left.json`). Those two are the test to rerun when the tiles
  change. `cvd_tilesheet.py <palette json> <suffix>` draws the comparison
  sheets (`tilesheet-<mode>-<suffix>-*.png`, not kept here), and
  `build_tiles_page.py` builds the tiles page from them.
- **The maps the apps use:** `cvd_tilegen.py` turns the chosen palettes into
  colour maps (`cvd-tilemaps.json`), which are the tables in RolehackFront's
  `RhTilePalette.java` and the web's `web.js` (`TILE_MODES`), and draws
  `tilemaps-check.png` for a look by eye.

Written by Lucas Ruiz, co-authored with Claude, Anthropic's AI model.
