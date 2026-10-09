#!/usr/bin/env python3
# Written for Rolehack by Lucas Ruiz with Claude, 2026-09-28.
"""Colour vision for tiles: one tile palette per Colour vision mode.

The tile files (win/share/monsters.txt, objects.txt, other.txt) share one
table of 29 colours.  For each mode this searches new RGB values for the
chromatic entries so that monsters sharing a letter stay apart in that
mode's vision, measured as the mean CIEDE2000 over their 16x16 tiles, while
each colour stays near its own look for normal vision.  The background,
black, the greys, the whites and skin ('L', which the paper doll retints)
are kept as they are.

  python3 cvd_tilepal.py            prints usage and writes cvd-tilepal.json
"""
import sys, re, json, math, random, itertools, importlib.util, pathlib
from collections import Counter
HERE = pathlib.Path(__file__).resolve().parent
MAXDE = float(sys.argv[1]) if len(sys.argv) > 1 else 15.0
sys.argv = ['x', '/root/NetHack-web']
spec = importlib.util.spec_from_file_location('cvd', HERE / 'cvd.py')
cvd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cvd)
SRC = pathlib.Path('/root/NetHack-web/win/share')

def read(name):
    txt = (SRC / f'{name}.txt').read_text()
    pal = {m.group(1): tuple(int(v) for v in m.group(2, 3, 4))
           for m in re.finditer(r"^(\S) = \((\d+),\s*(\d+),\s*(\d+)\)", txt, re.M)}
    tiles = []
    for m in re.finditer(r"^# tile \d+ \((.*?)\)\n(?:#[^\n]*\n)*\{\n(.*?)\n\}", txt, re.S | re.M):
        tiles.append((m.group(1), [r.strip() for r in m.group(2).split('\n')]))
    return pal, tiles

PAL, MON = read('monsters')
_, OBJ = read('objects')
_, OTH = read('other')
use = Counter()
for _, rows in MON + OBJ + OTH:
    for r in rows:
        use.update(r)
FIXED = set('.ALMNOQRSTUVWXYZ01')           # background, black, skin, whites and greys
VARY = [k for k in PAL if k not in FIXED]

# same-letter monster pairs, as pixel-pair histograms
mh = (pathlib.Path('/root/NetHack-web/include/monsters.h')).read_text()
cls_of = {}
for m in re.finditer(r'MON\((NAMS?)\((.*?)\),\s*(S_\w+),', mh, re.S):
    for n in re.findall(r'"([^"]*)"', m.group(2)):
        cls_of[n] = m.group(3)
first = {}
for name, rows in MON:
    base = name.split(',')[0]
    first.setdefault(base, rows)
bycls = {}
for n, rows in first.items():
    if n in cls_of:
        bycls.setdefault(cls_of[n], []).append(n)
PAIRS = []
for cls, names in bycls.items():
    for a, b in itertools.combinations(names, 2):
        h = Counter((ca, cb) for ra, rb in zip(first[a], first[b]) for ca, cb in zip(ra, rb) if ca != cb)
        shape = sum((ca == '.') != (cb == '.') for ra, rb in zip(first[a], first[b]) for ca, cb in zip(ra, rb)) / 256
        PAIRS.append((a, b, h, shape))
SAME = [p for p in PAIRS if p[3] <= 0.02]

cache = {}
def sl(rgb, v):
    k = (rgb, v)
    if k not in cache:
        cache[k] = cvd.lab(cvd.simulate(rgb, v))
    return cache[k]

def pair_de(pal, h, v):
    return sum(n * cvd.de2000(sl(pal[a], v), sl(pal[b], v)) for (a, b), n in h.items()) / 256

def hue(l): return math.degrees(math.atan2(l[2], l[1])) % 360
def chroma(l): return math.hypot(l[1], l[2])
REF = {k: cvd.lab(PAL[k]) for k in PAL}

MODES = {'redgreen': ('protanopia', 'deuteranopia'), 'tritan': ('tritanopia',), 'mono': ('achromatopsia',)}

def search(vis, maxde, seed=20260928, steps=6000):
    def ok(k, rgb):
        l = cvd.lab(rgb)
        if cvd.de2000(l, REF[k]) > maxde: return False
        if chroma(REF[k]) > 20 and abs((hue(l) - hue(REF[k]) + 180) % 360 - 180) > 30: return False
        return True
    def score(pal):
        ds = [min(pair_de(pal, h, v) for v in vis) for _, _, h, _ in SAME]
        norm = [pair_de(pal, h, 'normal') for _, _, h, _ in SAME]
        # the recolour families first: pairs whose own difference is mostly lost
        lost = sum(1 for d, n in zip(ds, norm) if n >= 6 and d < 0.4 * n)
        return (-lost, min(d / n for d, n in zip(ds, norm) if n >= 6))
    random.seed(seed)
    pal = dict(PAL)
    best = score(pal)
    start = best
    for step in range(steps):
        k = random.choice(VARY)
        old = pal[k]
        s = 40 if step < steps // 2 else 12
        cand = tuple(max(0, min(255, c + random.randint(-s, s))) for c in old)
        if not ok(k, cand):
            continue
        pal[k] = cand
        sc = score(pal)
        if sc >= best:
            best = sc
        else:
            pal[k] = old
    return pal, start, best

if __name__ == '__main__':
    print('palette entries by use (pixels over all tiles):')
    print('  ' + '  '.join(f"{k}{PAL[k]}:{use[k]}" for k in sorted(PAL, key=lambda k: -use[k])))
    print(len(PAIRS), 'same-letter monster pairs;', len(SAME), 'share a silhouette; varying', ''.join(VARY))
    out = {'palette': {k: '#%02x%02x%02x' % v for k, v in PAL.items()}, 'modes': {}}
    maxde = MAXDE
    for mode, vis in MODES.items():
        pal, start, best = search(vis, maxde)
        moved = {k: round(cvd.de2000(REF[k], cvd.lab(pal[k])), 1) for k in VARY}
        out['modes'][mode] = {'palette': {k: '#%02x%02x%02x' % pal[k] for k in PAL}, 'start': start, 'end': best, 'moved': moved}
        print(mode, 'lost pairs', -start[0], '->', -best[0], '; worst kept share %.2f -> %.2f' % (start[1], best[1]))
        print('   ', ' '.join(f"{k}:{'#%02x%02x%02x' % pal[k]}({moved[k]})" for k in VARY))
    (HERE / 'cvd-tilepal.json').write_text(json.dumps(out, indent=1))
