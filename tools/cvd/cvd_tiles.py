#!/usr/bin/env python3
"""Tiles under colour-vision deficiency (scratch, 2026-09-28).

For monsters sharing a class letter, how different are their 16x16 tiles in
each vision?  Mean CIEDE2000 over the 256 pixels, and the share of pixels
where one tile has figure and the other background (a pure shape cue).
Also renders comparison sheets.  Run inside WSL with /root/NetHack-web.
"""
import sys, re, json, itertools, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import cvd
from PIL import Image, ImageDraw

SRC = pathlib.Path('/root/NetHack-web')
OUT = pathlib.Path(__file__).resolve().parent
txt = (SRC / 'win/share/monsters.txt').read_text()
pal = {m.group(1): tuple(int(v) for v in m.group(2, 3, 4))
       for m in re.finditer(r"^(\S) = \((\d+),\s*(\d+),\s*(\d+)\)", txt, re.M)}
tiles = {}
for m in re.finditer(r"^# tile \d+ \((.*?)\)\n(?:#[^\n]*\n)*\{\n(.*?)\n\}", txt, re.S | re.M):
    name = m.group(1)
    base = name.split(',')[0]
    rows = [r.strip() for r in m.group(2).split('\n')]
    if base not in tiles:  # first (male) tile
        tiles[base] = rows

# class of each monster name, from monsters.h (every NAM/NAMS spelling)
mh = (SRC / 'include/monsters.h').read_text()
cls_of = {}
for m in re.finditer(r'MON\((NAMS?)\((.*?)\),\s*(S_\w+),', mh, re.S):
    for n in re.findall(r'"([^"]*)"', m.group(2)):
        cls_of[n] = m.group(3)

BG = '.'
labcache = {}
def lab_px(ch, vision):
    k = (ch, vision)
    if k not in labcache:
        labcache[k] = cvd.lab(cvd.simulate(pal[ch], vision))
    return labcache[k]

def tile_dist(a, b, vision):
    tot = 0.0
    for ra, rb in zip(a, b):
        for ca, cb in zip(ra, rb):
            if ca != cb:
                tot += cvd.de2000(lab_px(ca, vision), lab_px(cb, vision))
    return tot / 256

def shape_diff(a, b):
    return sum((ca == BG) != (cb == BG) for ra, rb in zip(a, b) for ca, cb in zip(ra, rb)) / 256

VIS = ['normal', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia', 'protanomaly', 'deuteranomaly']
bycls = {}
for name, rows in tiles.items():
    if name in cls_of:
        bycls.setdefault(cls_of[name], []).append(name)
pairs = []
for cls, names in bycls.items():
    for a, b in itertools.combinations(names, 2):
        row = {'cls': cls, 'a': a, 'b': b, 'shape': round(shape_diff(tiles[a], tiles[b]), 3)}
        for v in VIS:
            row[v] = round(tile_dist(tiles[a], tiles[b], v), 2)
        pairs.append(row)
json.dump({'pairs': pairs, 'tile_count': len(tiles), 'matched': sum(len(v) for v in bycls.values())},
          open(OUT / 'cvd-tiles.json', 'w'), indent=0)
print(len(tiles), 'monster tiles;', sum(len(v) for v in bycls.values()), 'matched to a class;', len(pairs), 'pairs')

# ---- sheets
def render(rows, vision, scale):
    im = Image.new('RGB', (16 * scale, 16 * scale))
    px = im.load()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            c = cvd.simulate(pal[ch], vision)
            for dy in range(scale):
                for dx in range(scale):
                    px[x * scale + dx, y * scale + dy] = c
    return im

GROUPS = [
    ('F', ['lichen', 'brown mold', 'yellow mold', 'green mold', 'red mold']),
    ('c', ['cockatrice', 'chickatrice', 'pyrolisk']),
    ('d', ['jackal', 'fox', 'coyote', 'hell hound pup']),
    ('D', ['baby red dragon', 'baby green dragon', 'baby orange dragon', 'baby yellow dragon']),
    ('N', ['red naga', 'guardian naga', 'golden naga', 'black naga']),
    ('e', ['floating eye', 'gas spore', 'flaming sphere', 'freezing sphere', 'shocking sphere']),
]
SHOW = ['normal', 'deuteranopia', 'protanopia', 'tritanopia', 'achromatopsia']
scale, pad = 3, 3
for key, names in GROUPS:
    for n in names:
        assert n in tiles, n
W = max(len(n) for _, n in GROUPS)
for v in SHOW:
    sheet = Image.new('RGB', (W * (16 * scale + pad) + pad, len(GROUPS) * (16 * scale + pad) + pad), (20, 18, 16))
    for gi, (key, names) in enumerate(GROUPS):
        for ni, n in enumerate(names):
            sheet.paste(render(tiles[n], v, scale), (pad + ni * (16 * scale + pad), pad + gi * (16 * scale + pad)))
    sheet.save(OUT / f'tiles-{v}.png')
json.dump({'groups': GROUPS, 'show': SHOW}, open(OUT / 'tiles-sheet.json', 'w'))
print('sheets', sheet.size)
