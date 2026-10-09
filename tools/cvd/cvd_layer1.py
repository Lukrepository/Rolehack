#!/usr/bin/env python3
# Written for Rolehack by Lucas Ruiz with Claude, 2026-09-28.
"""Acceptance numbers for colour vision layer 1 (build ledger #51).

HP tiers under each phosphor, the badge tiers, and the web palette, in every
simulated vision.  The bar: 12 or more clear, 8 to 12 weak, under 8 collides.
Critical HP is also inverse video and the critical badge framed, so those
steps do not depend on these numbers.  Run in WSL: python3 cvd_layer1.py
"""
import sys, json, itertools, importlib.util, pathlib
HERE = pathlib.Path(__file__).resolve().parent
sys.argv = ['x', '/root/NetHack-web']
spec = importlib.util.spec_from_file_location('cvd', HERE / 'cvd.py')
cvd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cvd)
H = cvd.hexrgb
V = ['normal', 'deuteranomaly', 'protanomaly', 'deuteranopia', 'protanopia', 'tritanopia', 'achromatopsia']

# RhTheme.PHOSPHOR_TEXT / web.js PHOS_TEXT, and RhTheme.hpColour() / web.js hpColour()
PHOS = {'colour': 'd7e3d0', 'amber': 'f5a93a', 'green': '52e472', 'white': 'cdd4e0'}
HURT = {'colour': 'ffe14d', 'amber': 'ffffff', 'green': 'ffffff', 'white': 'ffe14d'}
CRIT = 'ff6a33'
BADGES = {'critical': 'b84a00', 'serious': 'e69f00', 'warning': 'f0e442', 'info': '56b4e9'}
OLD_BADGES = {'critical': 'c2412e', 'serious': 'd9772b', 'warning': 'c9a227', 'info': '2f63ad'}
WEB_NEW = ['777f81', 'ff6267', '1a9b54', 'cc5b10', '2c51ff', '9c2d8b', '23adba', 'c6bfbb',
           'c6bfbb', 'eea104', '55ff9f', 'f2fd19', '34aeff', 'f364c9', '4ee6fc', 'f8fcf6']

def row(label, a, b):
    ds = [cvd.dist(H(a), H(b), v) for v in V]
    print('  %-28s' % label + ' '.join('%6.1f' % d for d in ds))
    return ds

out = {}
print('vision:' + ' ' * 23 + ' '.join('%6s' % v[:6] for v in V))
print('HP tiers by phosphor')
for p, t in PHOS.items():
    out['hp_' + p] = {'plain/hurt': row(p + ' plain/hurt', t, HURT[p]),
                      'hurt/critical': row(p + ' hurt/critical', HURT[p], CRIT)}
print('badge tiers, adjacent pairs (old -> new)')
for a, b in (('critical', 'serious'), ('serious', 'warning'), ('warning', 'info')):
    row('old ' + a + '/' + b, OLD_BADGES[a], OLD_BADGES[b])
    out['badge_' + a + '_' + b] = row('new ' + a + '/' + b, BADGES[a], BADGES[b])
print('web blessed/cursed (old -> new)')
row('old green/red', cvd.WEB_PAL[2], cvd.WEB_PAL[1])
out['web_bless_curse'] = row('new green/red', WEB_NEW[2], WEB_NEW[1])
r = json.load(open(HERE / 'cvd-report.json'))
def collapses(pal):
    n = 0
    for x in r['ascii_web']:
        a, b = H(pal[cvd.CLR.index(x['ca'])]), H(pal[cvd.CLR.index(x['cb'])])
        if cvd.dist(a, b, 'normal') >= 15 and min(cvd.dist(a, b, v) for v in ('protanopia', 'deuteranopia')) < 8:
            n += 1
    return n
out['web_same_letter_collapses'] = {'old': collapses(cvd.WEB_PAL), 'new': collapses(WEB_NEW)}
print('web same-letter monster pairs under 8 for protan/deutan:', out['web_same_letter_collapses'])
print('contrast on the glass:', {c: round(cvd.contrast(H(c), H('090d0a')), 1) for c in ['ffe14d', 'ffffff', CRIT] + list(BADGES.values())})
json.dump(out, open(HERE / 'cvd-layer1.json', 'w'), indent=1)
