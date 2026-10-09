#!/usr/bin/env python3
# Written for Rolehack by Lucas Ruiz with Claude, 2026-09-28.
"""Colour vision, layer 2: the 16 game colours for each Colour vision mode.

One palette per mode, shared by the phone and the web (Standard keeps each
build's own).  Each starts from the web's layer-1 palette and is searched so
that the colour pairs same-letter monsters use stay apart in that mode's
vision, with blessed, uncursed and cursed (green, yellow, red: defaults.nh's
MENUCOLOR lines) held further apart, text colours readable on the glass, and
every colour near its name for anyone else looking at the screen.

  redgreen    protanopia and deuteranopia together (Lucas, 2026-09-28: one
              palette behind both names to start); green may turn toward
              cyan, so blessed reads apart from cursed (his Q3 lean)
  tritan      tritanopia
  mono        monochrome: lightness only

Run in WSL: python3 cvd_modes.py   (writes cvd-modes.json)
"""
import sys, json, math, random, itertools, importlib.util, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.argv = ['x', '/root/NetHack-web']
spec = importlib.util.spec_from_file_location('cvd', HERE / 'cvd.py')
cvd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cvd)
H = cvd.hexrgb
r = json.load(open(HERE / 'cvd-report.json'))

START = ['777f81', 'ff6267', '1a9b54', 'cc5b10', '2c51ff', '9c2d8b', '23adba', 'c6bfbb',
         'c6bfbb', 'eea104', '55ff9f', 'f2fd19', '34aeff', 'f364c9', '4ee6fc', 'f8fcf6']
IDX = [i for i in range(16) if i != 8]
USED = sorted({tuple(sorted((cvd.CLR.index(x['ca']), cvd.CLR.index(x['cb'])))) for x in r['ascii_web']})
BUC = [(2, 1), (2, 11), (11, 1)]            # blessed/cursed, blessed/uncursed, uncursed/cursed
TEXT = (1, 2, 3, 9, 11)                      # menu and message colours: 4.5:1 on the glass
GLASS, BLACK = H('090d0a'), (0, 0, 0)
ref = {i: cvd.lab(H(START[i])) for i in IDX}
def hue(l): return math.degrees(math.atan2(l[2], l[1])) % 360
def chroma(l): return math.hypot(l[1], l[2])

MODES = {
    'redgreen': {'vis': ('protanopia', 'deuteranopia'), 'hue': {2: 50, 6: 40, 10: 45, 14: 35}, 'hue_default': 25},
    'tritan':   {'vis': ('tritanopia',), 'hue': {}, 'hue_default': 30},
    # Lightness alone cannot keep fifteen colours apart on the map (that is the
    # glyph option's job, layer 3), so monochrome moves only blessed, uncursed
    # and cursed (green, yellow, red) and leaves the rest as Standard.
    'mono':     {'vis': ('achromatopsia',), 'hue': {}, 'hue_default': 15, 'vary': (1, 2, 11)},
}

cache = {}
def sl(rgb, v):
    k = (rgb, v)
    if k not in cache:
        cache[k] = cvd.lab(cvd.simulate(rgb, v))
    return cache[k]

def make(mode, seed=20260928, steps=9000):
    cfg = MODES[mode]
    vis = cfg['vis']
    def ok(i, rgb):
        l = cvd.lab(rgb)
        if chroma(ref[i]) > 20:
            lim = cfg['hue'].get(i, cfg['hue_default'])
            if abs((hue(l) - hue(ref[i]) + 180) % 360 - 180) > lim: return False
            if chroma(l) < 0.7 * chroma(ref[i]): return False
        elif chroma(l) > 4:
            return False
        if cvd.contrast(rgb, BLACK) < (2.5 if i == 0 else 3.0): return False   # CLR_BLACK is dark grey, still seen on the black map
        if i in TEXT:
            if cvd.contrast(rgb, GLASS) < 4.5: return False
            # still readable as the mode's viewer sees it (protanopes see red darker)
            if min(cvd.contrast(cvd.simulate(rgb, v), GLASS) for v in vis) < 3.0: return False
        return True
    def pd(pal, a, b):
        return min(cvd.de2000(sl(pal[a], v), sl(pal[b], v)) for v in vis)
    def score(pal):
        ds = [pd(pal, a, b) for a, b in USED]
        buc = min(pd(pal, a, b) for a, b in BUC)
        nmin = min(cvd.de2000(sl(pal[a], 'normal'), sl(pal[b], 'normal')) for a, b in itertools.combinations(IDX, 2))
        return (min(buc, 15), -sum(d < 8 for d in ds), -sum(d < 12 for d in ds), min(ds), nmin)
    random.seed(seed)
    pal = {i: H(START[i]) for i in IDX}
    best = score(pal)
    start = best
    vary = cfg.get('vary', IDX)
    for step in range(steps):
        i = random.choice(vary)
        old = pal[i]
        s = 40 if step < steps // 2 else 10
        cand = tuple(max(0, min(255, c + random.randint(-s, s))) for c in old)
        if not ok(i, cand):
            continue
        pal[i] = cand
        sc = score(pal)
        if sc[4] >= min(best[4], 12) and sc[:4] >= best[:4]:
            best = sc
        else:
            pal[i] = old
    out = [cvd.tohex(pal[i]) if i != 8 else cvd.tohex(pal[7]) for i in range(16)]
    return out, start, best

res = {}
for mode in MODES:
    out, start, best = make(mode)
    res[mode] = {'colors': out, 'start': start, 'end': best}
    print(mode, 'start', [round(x, 1) if isinstance(x, float) else x for x in start],
          'end', [round(x, 1) if isinstance(x, float) else x for x in best])
    print('  ', out)
json.dump(res, open(HERE / 'cvd-modes.json', 'w'), indent=1)
