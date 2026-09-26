#!/usr/bin/env python3
# Written for Rolehack by Lucas Ruiz, 2026-09-26.
"""App icons for the installable Rolehack web page.

The Apothecary's own tile on the glass of a little terminal, in the case's
putty: icon-192.png and icon-512.png (rounded, for the Start menu and the
taskbar) and icon-maskable-512.png (full bleed, the art inside the safe
zone, for platforms that cut their own shape).

  python3 icons.py OUTDIR
"""
import pathlib, sys
from tiles import read, png

PUTTY_TOP, PUTTY_BOT = (0xe8, 0xdf, 0xc8), (0xd5, 0xc9, 0xab)
GLASS_MID, GLASS_EDGE = (0x10, 0x17, 0x12), (0x05, 0x07, 0x06)
BEZEL = (0x11, 0x0e, 0x0c)


def mix(a, b, f):
    return tuple(round(x + (y - x) * f) for x, y in zip(a, b))


def in_round_rect(x, y, x0, y0, x1, y1, r):
    if x < x0 or x >= x1 or y < y0 or y >= y1:
        return False
    cx = min(max(x, x0 + r), x1 - 1 - r)
    cy = min(max(y, y0 + r), y1 - 1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def icon(size, maskable, tile):
    body_r = 0 if maskable else round(size * 0.19)
    inset = round(size * (0.17 if maskable else 0.12))
    glass_r = round(size * 0.09)
    bezel = max(2, round(size * 0.012))
    scale = max(1, int(size * (0.5 if maskable else 0.6)) // 16)
    art = 16 * scale
    ax = ay = (size - art) // 2
    bg = tile[0][0]
    g0, g1 = inset, size - inset
    rows = []
    for y in range(size):
        row = []
        for x in range(size):
            if not in_round_rect(x, y, 0, 0, size, size, body_r):
                row.append((0, 0, 0, 0))
                continue
            px = mix(PUTTY_TOP, PUTTY_BOT, y / size)
            if in_round_rect(x, y, g0 - bezel, g0 - bezel, g1 + bezel, g1 + bezel, glass_r + bezel):
                px = BEZEL
            if in_round_rect(x, y, g0, g0, g1, g1, glass_r):
                d = ((x - size / 2) ** 2 + (y - size * 0.45) ** 2) ** 0.5 / (size * 0.5)
                px = mix(GLASS_MID, GLASS_EDGE, min(1.0, d))
                if ax <= x < ax + art and ay <= y < ay + art:
                    t = tile[(y - ay) // scale][(x - ax) // scale]
                    if t != bg:
                        px = t
                if (y - g0) % max(3, scale // 3) == 0:      # scanlines
                    px = mix(px, (0, 0, 0), 0.22)
            row.append(px + (255,))
        rows.append(row)
    return rows


def main(out):
    _, tiles, names = read("monsters")
    tile = tiles[names.index("apothecary,male")]
    out.mkdir(parents=True, exist_ok=True)
    for name, size, maskable in (("icon-192.png", 192, False), ("icon-512.png", 512, False),
                                 ("icon-maskable-512.png", 512, True)):
        png(out / name, size, size, icon(size, maskable, tile))
    print(f"icons -> {out}")


if __name__ == "__main__":
    main(pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "."))
