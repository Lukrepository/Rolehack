#!/usr/bin/env python3
# Written for Rolehack by Lucas Ruiz, 2026-09-26.
"""Tile sheet for the Rolehack web page.

Reads win/share/monsters.txt, objects.txt and other.txt -- the order
util/tilemap numbers them in, so a tile's place on the sheet is the tileidx
the core sends -- and writes tiles.png (40 tiles to a row, 16x16 each) and
tiles.json (the sheet's shape and monsters.txt's palette, whose letters the
paper doll's sprites use).  No imaging library needed.

  python3 tiles.py OUTDIR
"""
import json, pathlib, re, struct, sys, zlib

TOP = pathlib.Path(__file__).resolve().parents[2]
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
COLS, SIZE = 40, 16


def read(name):
    txt = (TOP / "win" / "share" / f"{name}.txt").read_text()
    pal = {m.group(1): tuple(int(v) for v in m.group(2, 3, 4))
           for m in re.finditer(r"^(\S) = \((\d+),\s*(\d+),\s*(\d+)\)", txt, re.M)}
    tiles = []
    for m in re.finditer(r"^# tile \d+ \((.*?)\)\n(?:#[^\n]*\n)*\{\n(.*?)\n\}", txt, re.S | re.M):
        rows = [r.strip() for r in m.group(2).split("\n")]
        assert len(rows) == SIZE and all(len(r) == SIZE for r in rows), m.group(1)
        tiles.append([[pal[c] for c in r] for r in rows])
    return pal, tiles


def png(path, width, height, rgb_rows):
    raw = b"".join(b"\0" + bytes(v for px in row for v in px) for row in rgb_rows)
    def chunk(kind, data):
        return (struct.pack(">I", len(data)) + kind + data
                + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff))
    path.write_bytes(b"\x89PNG\r\n\x1a\n"
                     + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
                     + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


palette, tiles = read("monsters")
for name in ("objects", "other"):
    tiles += read(name)[1]
rows = (len(tiles) + COLS - 1) // COLS
sheet = [[(0, 0, 0)] * (COLS * SIZE) for _ in range(rows * SIZE)]
for i, t in enumerate(tiles):
    ox, oy = (i % COLS) * SIZE, (i // COLS) * SIZE
    for y in range(SIZE):
        sheet[oy + y][ox:ox + SIZE] = t[y]
OUT.mkdir(parents=True, exist_ok=True)
png(OUT / "tiles.png", COLS * SIZE, rows * SIZE, sheet)
(OUT / "tiles.json").write_text(json.dumps({
    "cols": COLS, "size": SIZE, "count": len(tiles),
    "palette": {k: "#%02x%02x%02x" % v for k, v in palette.items()},
}))
print(f"{len(tiles)} tiles -> {OUT / 'tiles.png'}")
