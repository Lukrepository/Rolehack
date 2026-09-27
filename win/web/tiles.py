#!/usr/bin/env python3
# Written for Rolehack by Lucas Ruiz, 2026-09-26.
"""Tile sheet for the Rolehack web page.

Reads win/share/monsters.txt, objects.txt and other.txt, then monsters.txt
again in grayscale for the statues -- the order util/tilemap numbers them in
(statues are its "generated" tiles, after other.txt), so a tile's place on the
sheet is the tileidx the core sends -- and writes tiles.png (40 tiles to a row, 16x16 each) and
tiles.json (the sheet's shape and monsters.txt's palette, whose letters the
paper doll's sprites use).  No imaging library needed.

  python3 tiles.py OUTDIR
"""
import json, pathlib, re, struct, sys, zlib

TOP = pathlib.Path(__file__).resolve().parents[2]
COLS, SIZE = 40, 16

# util/tile2bmp's third pass reads monsters.txt again with tiletext.c's
# graymappings: each palette index (its place in the file's colour map) to
# another.  Those are the statue tiles.  Statues drew as black squares on the
# web page until this pass was added (Lucas, 2026-09-27).
GRAYMAP = [0, 1, 17, 18, 19, 20, 27, 22, 23, 24, 25, 26, 21, 15, 13, 14, 14,
           1, 17, 18, 19, 20, 27, 22, 23, 24, 25, 20]


def read(name, gray=False):
    """A tile file's palette, its tiles as rows of RGB tuples, and their names."""
    txt = (TOP / "win" / "share" / f"{name}.txt").read_text()
    pal = {m.group(1): tuple(int(v) for v in m.group(2, 3, 4))
           for m in re.finditer(r"^(\S) = \((\d+),\s*(\d+),\s*(\d+)\)", txt, re.M)}
    order = list(pal)
    shade = {c: (order[GRAYMAP[i]] if gray and i < len(GRAYMAP) else c) for i, c in enumerate(order)}
    tiles, names = [], []
    for m in re.finditer(r"^# tile \d+ \((.*?)\)\n(?:#[^\n]*\n)*\{\n(.*?)\n\}", txt, re.S | re.M):
        rows = [r.strip() for r in m.group(2).split("\n")]
        assert len(rows) == SIZE and all(len(r) == SIZE for r in rows), m.group(1)
        tiles.append([[pal[shade[c]] for c in r] for r in rows])
        names.append(m.group(1))
    return pal, tiles, names


def png(path, width, height, rows):
    """Rows of RGB or RGBA tuples, written as an 8-bit PNG."""
    alpha = len(rows[0][0]) == 4
    raw = b"".join(b"\0" + bytes(v for px in row for v in px) for row in rows)
    def chunk(kind, data):
        return (struct.pack(">I", len(data)) + kind + data
                + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff))
    path.write_bytes(b"\x89PNG\r\n\x1a\n"
                     + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6 if alpha else 2, 0, 0, 0))
                     + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def main(out):
    palette, tiles, _ = read("monsters")
    for name in ("objects", "other"):
        tiles += read(name)[1]
    # the statues: a male and a female for each monster, as monsters.txt has
    # them (tilemap's maxmontile + 1 of them; the file's last tile is not one)
    statues = read("monsters", gray=True)[1]
    tiles += statues[:len(statues) - 1]
    rows = (len(tiles) + COLS - 1) // COLS
    sheet = [[(0, 0, 0)] * (COLS * SIZE) for _ in range(rows * SIZE)]
    for i, t in enumerate(tiles):
        ox, oy = (i % COLS) * SIZE, (i // COLS) * SIZE
        for y in range(SIZE):
            sheet[oy + y][ox:ox + SIZE] = t[y]
    out.mkdir(parents=True, exist_ok=True)
    png(out / "tiles.png", COLS * SIZE, rows * SIZE, sheet)
    (out / "tiles.json").write_text(json.dumps({
        "cols": COLS, "size": SIZE, "count": len(tiles),
        "palette": {k: "#%02x%02x%02x" % v for k, v in palette.items()},
    }))
    print(f"{len(tiles)} tiles -> {out / 'tiles.png'}")


if __name__ == "__main__":
    main(pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "."))
