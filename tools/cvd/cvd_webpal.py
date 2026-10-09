#!/usr/bin/env python3
# Written for Rolehack by Lucas Ruiz with Claude, 2026-09-28.
"""Layer 1: nudge the web build's 16 game colours apart for red-green vision.

Each colour may move at most MAXDE (CIEDE2000, normal vision) from today's
web.js COLORS, must keep 3:1 against the black map and 4.5:1 against the
glass, and keeps its hue within 25 degrees and 85% of its saturation.  The search first cuts the colour pairs
that same-letter monsters use and that fall under 8 for protanopes or
deuteranopes, then those under 12, then raises the worst of them.  Run in WSL:

  python3 cvd_webpal.py [MAXDE]
"""
import sys, json, math, random, itertools, importlib.util, pathlib
HERE = pathlib.Path(__file__).resolve().parent
MAXDE = float(sys.argv[1]) if len(sys.argv) > 1 else 12.0
sys.argv = ['x', '/root/NetHack-web']
spec = importlib.util.spec_from_file_location('cvd', HERE / 'cvd.py')
cvd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cvd)
H = cvd.hexrgb
r = json.load(open(HERE / 'cvd-report.json'))

IDX = [i for i in range(16) if i != 8]
used = sorted({tuple(sorted((cvd.CLR.index(x['ca']), cvd.CLR.index(x['cb'])))) for x in r['ascii_web']})
start = {i: H(cvd.WEB_PAL[i]) for i in IDX}
ref = {i: cvd.lab(start[i]) for i in IDX}
GLASS, BLACK = H('090d0a'), (0, 0, 0)
def hue(l): return math.degrees(math.atan2(l[2], l[1])) % 360
def chroma(l): return math.hypot(l[1], l[2])

cache = {}
def sl(rgb, v):
    k = (rgb, v)
    if k not in cache:
        cache[k] = cvd.lab(cvd.simulate(rgb, v))
    return cache[k]

def ok(i, rgb):
    l = cvd.lab(rgb)
    if cvd.de2000(l, ref[i]) > MAXDE:
        return False
    if chroma(ref[i]) > 20 and abs((hue(l) - hue(ref[i]) + 180) % 360 - 180) > 25:
        return False
    if chroma(ref[i]) > 20 and chroma(l) < 0.85 * chroma(ref[i]):   # keep red red and blue blue
        return False
    if chroma(ref[i]) <= 20 and chroma(l) > 4:   # black, gray and white stay neutral
        return False
    need = 1.0 if i == 0 else 3.0      # CLR_BLACK is dark grey by design
    if cvd.contrast(rgb, BLACK) < need:
        return False
    if i in (1, 2, 11, 3, 9) and cvd.contrast(rgb, GLASS) < 4.5:   # menu and status colours
        return False
    return True

def pairdist(pal, a, b):
    return min(cvd.de2000(sl(pal[a], v), sl(pal[b], v)) for v in ('protanopia', 'deuteranopia'))

def score(pal):
    ds = [pairdist(pal, a, b) for a, b in used]
    normal_min = min(cvd.de2000(sl(pal[a], 'normal'), sl(pal[b], 'normal')) for a, b in itertools.combinations(IDX, 2))
    return (-sum(1 for d in ds if d < 8), -sum(1 for d in ds if d < 12), min(ds), normal_min)

random.seed(20260928)
pal = dict(start)
best = score(pal)
print('start', best)
for step in range(8000):
    i = random.choice(IDX)
    old = pal[i]
    s = 30 if step < 4000 else 8
    cand = tuple(max(0, min(255, c + random.randint(-s, s))) for c in old)
    if not ok(i, cand):
        continue
    pal[i] = cand
    sc = score(pal)
    if sc[3] >= min(best[3], 12) and sc[:3] >= best[:3]:
        best = sc
    else:
        pal[i] = old
print('end', best)
out = ['#' + cvd.tohex(pal.get(i, H('c2c2c2')))[1:] if i != 8 else '#c2c2c2' for i in range(16)]
for i in IDX:
    print('%-15s %s -> %s  (moved %.1f)' % (cvd.CLR[i], '#' + cvd.WEB_PAL[i], out[i], cvd.de2000(ref[i], cvd.lab(pal[i]))))
bad = sum(1 for x in r['ascii_web']
          if cvd.dist(H(out[cvd.CLR.index(x['ca'])]), H(out[cvd.CLR.index(x['cb'])]), 'normal') >= 15
          and min(cvd.dist(H(out[cvd.CLR.index(x['ca'])]), H(out[cvd.CLR.index(x['cb'])]), v) for v in ('protanopia', 'deuteranopia')) < 8)
print('same-letter pairs collapsing (<8) for protan/deutan:', bad, '(today 155)')
bc = {v: round(cvd.dist(H(out[2]), H(out[1]), v), 1) for v in ('normal', 'deuteranomaly', 'deuteranopia', 'protanopia', 'achromatopsia')}
print('blessed/cursed:', bc)
json.dump({'maxde': MAXDE, 'colors': out, 'score': best, 'collapsing_pairs': bad, 'blessed_cursed': bc},
          open(HERE / f'cvd-webpal-{int(MAXDE)}.json', 'w'), indent=1)
