#!/usr/bin/env python3
"""Candidate colours for the UI signals, tested the same way (scratch, 2026-09-28)."""
import sys, json, itertools, importlib.util, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.argv = ['x', '/root/NetHack-web']
spec = importlib.util.spec_from_file_location('cvd', HERE / 'cvd.py')
cvd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cvd)
V = cvd.VISIONS
GLASS = cvd.hexrgb('090d0a')
H = cvd.hexrgb

# claim check: where a dichromat rates a pair < 15, the matching anomalous viewer rates it >= (within 1)
r = json.load(open(HERE / 'cvd-report.json'))
viol = []
for k, rows in r['sets'].items():
    for row in rows:
        for a, b in (('protanomaly', 'protanopia'), ('deuteranomaly', 'deuteranopia'), ('tritanomaly', 'tritanopia')):
            if row[b] < 15 and row[a] < row[b] - 1.0:
                viol.append((k, row['a'], row['b'], a, row[a], row[b]))
print('severity claim violations:', viol)

def worst(cols, visions=V):
    out = {}
    for v in visions:
        out[v] = min((round(cvd.dist(H(cols[a]), H(cols[b]), v), 1), a + '/' + b) for a, b in itertools.combinations(cols, 2))
    return out

def contrast_on(cols, bg):
    return {n: round(cvd.contrast(H(c), bg), 2) for n, c in cols.items()}

CANDS = {
    'HP now': {'healthy': '63e07c', 'hurt': 'f5b342', 'critical': 'ff5a44'},
    'HP A: blue / yellow / vermillion': {'healthy': '56b4e9', 'hurt': 'f0e442', 'critical': 'ff6a33'},
    'HP B: plain / yellow / vermillion': {'healthy': 'd7e3d0', 'hurt': 'f0d43a', 'critical': 'ff6a33'},
    'BUC phone now': {'blessed': '008800', 'uncursed': 'ffff00', 'cursed': 'ff0000'},
    'BUC web now': {'blessed': '46a946', 'uncursed': 'f3df55', 'cursed': 'd8453e'},
    'BUC A: sky blue / yellow / vermillion': {'blessed': '56b4e9', 'uncursed': 'f0e442', 'cursed': 'ff6a33'},
    'BUC B: bluish green / yellow / vermillion': {'blessed': '2ec4a6', 'uncursed': 'f0e442', 'cursed': 'ff6a33'},
    'badge fills now': {'critical': 'c2412e', 'serious': 'd9772b', 'warning': 'c9a227', 'info': '2f63ad'},
    'badge fills A (Okabe-Ito)': {'critical': 'd55e00', 'serious': 'e69f00', 'warning': 'f0e442', 'info': '0072b2'},
}
res = {}
for name, cols in CANDS.items():
    res[name] = {'worst': worst(cols), 'on_glass': contrast_on(cols, GLASS)}
    w = res[name]['worst']
    print('%-44s' % name, ' '.join('%s %5.1f' % (v[:5], w[v][0]) for v in V))
    print('%-44s' % '', 'contrast on glass', res[name]['on_glass'])
# badge text on fill
for name, fills, fgs in [('now', ['c2412e', 'd9772b', 'c9a227', '2f63ad'], ['ffffff', '1a1206', '1a1206', 'ffffff']),
                         ('A', ['d55e00', 'e69f00', 'f0e442', '0072b2'], ['ffffff', '1a1206', '1a1206', 'ffffff'])]:
    print('badge text contrast', name, [round(cvd.contrast(H(f), H(t)), 2) for f, t in zip(fills, fgs)])
json.dump(res, open(HERE / 'cvd-candidates.json', 'w'), indent=1)
