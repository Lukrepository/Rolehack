#!/usr/bin/env python3
"""Feasibility probe: a 16-colour game palette tuned for red-green (scratch, 2026-09-28).

Hill-climbs the RGB of each NetHack colour to raise the worst colour pair that
same-letter monsters actually use, under protanopia and deuteranopia, while
keeping each colour near its name for normal vision, 3:1 against the black map
(dark grey for CLR_BLACK), and every pair at least 15 apart for normal vision.
"""
import sys, json, math, random, itertools, importlib.util, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.argv = ['x', '/root/NetHack-web']
spec = importlib.util.spec_from_file_location('cvd', HERE / 'cvd.py')
cvd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cvd)
H = cvd.hexrgb
r = json.load(open(HERE / 'cvd-report.json'))

IDX = [i for i in range(16) if i != 8]
used = set()
for row in r['ascii_phone']:
    a, b = cvd.CLR.index(row['ca']), cvd.CLR.index(row['cb'])
    used.add((min(a, b), max(a, b)))
used = sorted(used)
print(len(used), 'colour pairs are used by same-letter monsters')

start = {i: H(cvd.PHONE_PAL[i]) for i in IDX}
ref = {i: cvd.lab(start[i]) for i in IDX}
def hue(l): return math.degrees(math.atan2(l[2], l[1])) % 360
def chroma(l): return math.hypot(l[1], l[2])
ACHRO = {0, 7, 15}
BLACK = (0, 0, 0)

def ok(i, rgb):
    l = cvd.lab(rgb)
    if i in ACHRO:
        if chroma(l) > 8: return False
    else:
        if chroma(l) < 45: return False
        d = abs((hue(l) - hue(ref[i]) + 180) % 360 - 180)
        if d > 30: return False
    need = 2.0 if i == 0 else 3.0
    return cvd.contrast(rgb, BLACK) >= need

cache = {}
def sim_lab(rgb, v):
    k = (rgb, v)
    if k not in cache:
        cache[k] = cvd.lab(cvd.simulate(rgb, v))
    return cache[k]

def score(pal):
    worst_cb = min(min(cvd.de2000(sim_lab(pal[a], v), sim_lab(pal[b], v)) for v in ('protanopia', 'deuteranopia'))
                   for a, b in used)
    worst_n = min(cvd.de2000(sim_lab(pal[a], 'normal'), sim_lab(pal[b], 'normal')) for a, b in itertools.combinations(IDX, 2))
    return worst_cb if worst_n >= 15 else worst_cb - (15 - worst_n) * 5, worst_cb, worst_n

random.seed(20260928)
pal = dict(start)
best = score(pal)
print('start', [round(x, 1) for x in best])
for step in range(6000):
    i = random.choice(IDX)
    old = pal[i]
    s = 40 if step < 3000 else 12
    cand = tuple(max(0, min(255, c + random.randint(-s, s))) for c in old)
    if not ok(i, cand):
        continue
    pal[i] = cand
    sc = score(pal)
    if sc[0] >= best[0]:
        best = sc
    else:
        pal[i] = old
print('end', [round(x, 1) for x in best])
out = {cvd.CLR[i]: cvd.tohex(pal[i]) for i in IDX}
print(json.dumps(out, indent=0))

# the same-letter monster test, as for the shipped palettes
PAL = [cvd.tohex(pal[i]) if i in pal else '#ffffff' for i in range(16)]
bad = 0
for row in r['ascii_phone']:
    ca, cb = H(PAL[cvd.CLR.index(row['ca'])]), H(PAL[cvd.CLR.index(row['cb'])])
    if cvd.dist(ca, cb, 'normal') >= 15 and min(cvd.dist(ca, cb, 'protanopia'), cvd.dist(ca, cb, 'deuteranopia')) < 8:
        bad += 1
print('same-letter pairs collapsing (<8) for protan/deutan with the draft palette:', bad)
json.dump({'palette': out, 'score': best, 'collapsing_pairs': bad}, open(HERE / 'cvd-palette.json', 'w'), indent=1)
