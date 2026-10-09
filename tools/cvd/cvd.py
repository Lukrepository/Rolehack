#!/usr/bin/env python3
"""Colour-vision-deficiency simulation for Rolehack's colours (scratch, 2026-09-28).

Dichromacy: Brettel, Vienot & Mollon 1997, as precomputed for sRGB in
DaltonLens's libDaltonLens.c (linear RGB, two half-planes).
Anomalous trichromacy: Machado, Oliveira & Fernandes 2009, severity 0.6,
matrices from the authors' page, applied in linear RGB.
Achromatopsia: luminance only (Rec.709 Y in linear RGB).
Distance: CIEDE2000 in CIELAB (D65), checked against Sharma et al. 2005 pairs.
"""
import json, math, re, sys, pathlib, itertools

OUT = pathlib.Path(__file__).resolve().parent

def lin(c):
    c /= 255.0
    return c / 12.92 if c < 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def enc(v):
    if v <= 0: return 0
    if v >= 1: return 255
    return round(255 * (v * 12.92 if v < 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055))

def mul(m, v):
    return [m[0]*v[0] + m[1]*v[1] + m[2]*v[2], m[3]*v[0] + m[4]*v[1] + m[5]*v[2], m[6]*v[0] + m[7]*v[1] + m[8]*v[2]]

BRETTEL = {
    'protan': ([0.14980, 1.19548, -0.34528, 0.10764, 0.84864, 0.04372, 0.00384, -0.00540, 1.00156],
               [0.14570, 1.16172, -0.30742, 0.10816, 0.85291, 0.03892, 0.00386, -0.00524, 1.00139],
               [0.00048, 0.00393, -0.00441]),
    'deutan': ([0.36477, 0.86381, -0.22858, 0.26294, 0.64245, 0.09462, -0.02006, 0.02728, 0.99278],
               [0.37298, 0.88166, -0.25464, 0.25954, 0.63506, 0.10540, -0.01980, 0.02784, 0.99196],
               [-0.00281, -0.00611, 0.00892]),
    'tritan': ([1.01277, 0.13548, -0.14826, -0.01243, 0.86812, 0.14431, 0.07589, 0.80500, 0.11911],
               [0.93678, 0.18979, -0.12657, 0.06154, 0.81526, 0.12320, -0.37562, 1.12767, 0.24796],
               [0.03901, -0.02788, -0.01113]),
}
MACHADO06 = {
    'protan': [0.385450, 0.769005, -0.154455, 0.100526, 0.829802, 0.069673, -0.007442, -0.022190, 1.029632],
    'deutan': [0.498864, 0.674741, -0.173604, 0.205199, 0.754872, 0.039929, -0.011131, 0.030969, 0.980162],
    'tritan': [1.104996, -0.046633, -0.058363, -0.032137, 0.971635, 0.060503, 0.001336, 0.317922, 0.680742],
}

VISIONS = ['normal', 'protanomaly', 'deuteranomaly', 'tritanomaly', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia']

KIND = {'prot': 'protan', 'deut': 'deutan', 'trit': 'tritan'}

def simulate(rgb, vision):
    v = [lin(c) for c in rgb]
    if vision == 'normal':
        out = v
    elif vision.endswith('anomaly'):
        out = mul(MACHADO06[KIND[vision[:4]]], v)
    elif vision.endswith('opia') and vision != 'achromatopsia':
        m1, m2, n = BRETTEL[KIND[vision[:4]]]
        out = mul(m1 if v[0]*n[0] + v[1]*n[1] + v[2]*n[2] >= 0 else m2, v)
    else:
        y = 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2]
        out = [y, y, y]
    return tuple(enc(c) for c in out)

def hexrgb(h):
    h = h.lstrip('#')
    if len(h) == 8: h = h[2:]
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def tohex(rgb): return '#%02x%02x%02x' % tuple(rgb)

def lab(rgb):
    r, g, b = (lin(c) for c in rgb)
    x = (0.4124564*r + 0.3575761*g + 0.1804375*b) / 0.95047
    y = (0.2126729*r + 0.7151522*g + 0.0721750*b)
    z = (0.0193339*r + 0.1191920*g + 0.9503041*b) / 1.08883
    f = lambda t: t ** (1/3) if t > 216/24389 else (24389/27*t + 16) / 116
    fx, fy, fz = f(x), f(y), f(z)
    return (116*fy - 16, 500*(fx - fy), 200*(fy - fz))

def de2000(l1, l2):
    L1, a1, b1 = l1; L2, a2, b2 = l2
    C1 = math.hypot(a1, b1); C2 = math.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt(Cb**7 / (Cb**7 + 25**7)))
    a1p, a2p = (1 + G)*a1, (1 + G)*a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1p = math.degrees(math.atan2(b1, a1p)) % 360 if C1p else 0.0
    h2p = math.degrees(math.atan2(b2, a2p)) % 360 if C2p else 0.0
    dLp = L2 - L1; dCp = C2p - C1p
    if C1p * C2p == 0: dhp = 0.0
    else:
        dhp = h2p - h1p
        if dhp > 180: dhp -= 360
        elif dhp < -180: dhp += 360
    dHp = 2 * math.sqrt(C1p*C2p) * math.sin(math.radians(dhp / 2))
    Lbp = (L1 + L2) / 2; Cbp = (C1p + C2p) / 2
    if C1p * C2p == 0: hbp = h1p + h2p
    elif abs(h1p - h2p) <= 180: hbp = (h1p + h2p) / 2
    elif h1p + h2p < 360: hbp = (h1p + h2p + 360) / 2
    else: hbp = (h1p + h2p - 360) / 2
    T = (1 - 0.17*math.cos(math.radians(hbp - 30)) + 0.24*math.cos(math.radians(2*hbp))
         + 0.32*math.cos(math.radians(3*hbp + 6)) - 0.20*math.cos(math.radians(4*hbp - 63)))
    dth = 30 * math.exp(-((hbp - 275) / 25) ** 2)
    Rc = 2 * math.sqrt(Cbp**7 / (Cbp**7 + 25**7))
    Sl = 1 + 0.015*(Lbp - 50)**2 / math.sqrt(20 + (Lbp - 50)**2)
    Sc = 1 + 0.045*Cbp; Sh = 1 + 0.015*Cbp*T
    Rt = -math.sin(math.radians(2*dth)) * Rc
    return math.sqrt((dLp/Sl)**2 + (dCp/Sc)**2 + (dHp/Sh)**2 + Rt*(dCp/Sc)*(dHp/Sh))

# Sharma, Wu & Dalal 2005, test pairs 1, 7 and 17.
for p, q, want in [((50, 2.6772, -79.7751), (50, 0, -82.7485), 2.0425),
                   ((50, 0, 0), (50, -1, 2), 2.3669),
                   ((50, 2.5, 0), (73, 25, -18), 27.1492)]:
    assert abs(de2000(p, q) - want) < 1e-3, (p, q, de2000(p, q))

def lum(rgb):
    r, g, b = (lin(c) for c in rgb)
    return 0.2126*r + 0.7152*g + 0.0722*b

def contrast(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)

def dist(a, b, vision):
    return de2000(lab(simulate(a, vision)), lab(simulate(b, vision)))

# ---------------------------------------------------------------------------------------
# The colours, from the committed code (file:line noted in the brief).

PHONE_PAL = ['555555', 'FF0000', '008800', '664411', '0000FF', 'FF00FF', '00FFFF', '888888',
             'FFFFFF', 'FF9900', '00FF00', 'FFFF00', '0088FF', 'FF77FF', '77FFFF', 'FFFFFF']
WEB_PAL = ['6f6f6f', 'd8453e', '46a946', 'b5762a', '4d74dc', 'b049b0', '3cb1b1', 'c2c2c2',
           'c2c2c2', 'ff9a3a', '6ff06f', 'f3df55', '78a2ff', 'ff78ff', '72f2f2', 'ffffff']
CLR = ['black', 'red', 'green', 'brown', 'blue', 'magenta', 'cyan', 'gray', 'no color', 'orange',
       'bright green', 'yellow', 'bright blue', 'bright magenta', 'bright cyan', 'white']

def mid(fam):  # a keycap face: the radial gradient's two stops, averaged in linear light
    a, b = hexrgb(fam[0]), hexrgb(fam[1])
    return tohex(tuple(enc((lin(x) + lin(y)) / 2) for x, y in zip(a, b)))

SETS = {
    'bless_phone': {'blessed (green)': PHONE_PAL[2], 'uncursed (yellow)': PHONE_PAL[11], 'cursed (red)': PHONE_PAL[1]},
    'bless_web': {'blessed (green)': WEB_PAL[2], 'uncursed (yellow)': WEB_PAL[11], 'cursed (red)': WEB_PAL[1]},
    'hp_status': {'HP >= 66% (green)': '63e07c', 'HP >= 33% (amber)': 'f5b342', 'HP < 33% (red)': 'ff5a44'},
    'hero_outline_phone': {'100%/<100% green': PHONE_PAL[2], '<70% yellow': PHONE_PAL[11],
                           '<50% orange': PHONE_PAL[9], '<30% red': PHONE_PAL[1]},
    'badge_tiers': {'critical': 'c2412e', 'serious': 'd9772b', 'warning': 'c9a227', 'info': '2f63ad'},
    'gc_keys': {'move (yellow)': mid(['ffe066', 'f5c400']), 'APPLY (red)': mid(['f0505f', 'c8102e']),
                'EAT/QUAFF/READ (blue)': mid(['5c93ff', '2a62d8']), 'SEARCH (navy)': mid(['3a4fb0', '22348a']),
                'inventory (grey)': mid(['e4e4ea', 'bdbdc8']), 'Rest/modes (orange)': mid(['ffa347', 'ff6f00']),
                'Long rest (dark orange)': mid(['e0701f', 'c05200']), 'COMBAT (scarlet)': mid(['ff6b5b', 'ff2a1a']),
                'default (dark)': mid(['4a4c6e', '34365a']), 'macro (emerald)': mid(['4fe0c4', '12b89c'])},
    'term_keys': {'pad/APPLY (cream)': mid(['fbf8f1', 'e3ded2']), 'default (dark)': mid(['4b443e', '35302b']),
                  'off (slate)': mid(['7c7a74', '63615c']), 'Rest/modes (amber)': mid(['f8b457', 'e38a26']),
                  'Long rest (amber dark)': mid(['e08c3a', 'c2661a']), 'COMBAT (red)': mid(['c85240', 'a13426']),
                  'macro (jade)': mid(['8cc9b8', '6aae9b'])},
    'term_legends': {'default legend': 'f1e8d5', 'DROP teal': '5fd8c9', 'EAT rose': 'f08bb6',
                     'Msgs lavender': 'c2b6ff', 'APPLY-layer cream': 'fbf8f1', 'lit context (amber)': 'ffc166'},
    'layers_term': {'APPLY': 'fbf8f1', 'COMBAT': 'c85240', 'EAT/QUAFF/READ': 'f08bb6', 'DROP': '5fd8c9',
                    'INVENTORY': '9c9a94'},
    'layers_gc': {'APPLY': 'f0505f', 'COMBAT': 'ff6b5b', 'EAT/QUAFF/READ': '5c93ff', 'DROP': '5fe3d2',
                  'INVENTORY': 'e4e4ea'},
    'okabe_ito': {'orange': 'E69F00', 'sky blue': '56B4E9', 'bluish green': '009E73', 'yellow': 'F0E442',
                  'blue': '0072B2', 'vermillion': 'D55E00', 'reddish purple': 'CC79A7'},
}

LAMPS = {'SEARCH amber': ('FFB347', '4A3413'), 'ARMED red': ('FF5A44', '4A1712'), 'MORE green': ('6DFF7A', '173A1D')}

def set_report(cols):
    names = list(cols)
    out = []
    for a, b in itertools.combinations(names, 2):
        row = {'a': a, 'b': b}
        for v in VISIONS:
            row[v] = round(dist(hexrgb(cols[a]), hexrgb(cols[b]), v), 1)
        out.append(row)
    return out

def swatches(cols):
    return {name: {v: tohex(simulate(hexrgb(h), v)) for v in VISIONS} for name, h in cols.items()}

report = {'sets': {}, 'swatches': {}, 'lamps': {}}
for k, cols in SETS.items():
    report['sets'][k] = set_report(cols)
    report['swatches'][k] = swatches(cols)
for k, (on, off) in LAMPS.items():
    report['lamps'][k] = {v: round(contrast(simulate(hexrgb(on), v), simulate(hexrgb(off), v)), 2) for v in VISIONS}
    report['swatches']['lamp ' + k] = {v: [tohex(simulate(hexrgb(on), v)), tohex(simulate(hexrgb(off), v))] for v in VISIONS}

# ---------------------------------------------------------------------------------------
# ASCII map: monsters sharing a letter, told apart only by colour.
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('/root/NetHack-web')
mh = (SRC / 'include' / 'monsters.h').read_text()
colh = (SRC / 'include' / 'color.h').read_text()
macros = dict(re.findall(r'#define (\w+) (\w+)', colh))
def resolve(tok):
    while tok in macros and not tok.isdigit():
        tok = macros[tok]
    return int(tok)
mons = []
for m in re.finditer(r'MON\((NAMS?)\((.*?)\),\s*(S_\w+),(.*?)(CLR_\w+|HI_\w+|DRAGON_SILVER),\s*(\w+)\)', mh, re.S):
    names = re.findall(r'"([^"]*)"', m.group(2))
    mons.append({'name': names[-1] if m.group(1) == 'NAMS' else names[0], 'cls': m.group(3),
                 'clr': resolve(m.group(5)), 'id': m.group(6)})
report['monster_count'] = len(mons)

def ascii_pairs(pal):
    rows = []
    bycls = {}
    for mo in mons:
        bycls.setdefault(mo['cls'], []).append(mo)
    for cls, ms in bycls.items():
        for a, b in itertools.combinations(ms, 2):
            if a['clr'] == b['clr']:
                continue
            ca, cb = hexrgb(pal[a['clr']]), hexrgb(pal[b['clr']])
            row = {'cls': cls, 'a': a['name'], 'b': b['name'], 'ca': CLR[a['clr']], 'cb': CLR[b['clr']]}
            for v in VISIONS:
                row[v] = round(dist(ca, cb, v), 1)
            rows.append(row)
    return rows

report['ascii_phone'] = ascii_pairs(PHONE_PAL)
report['ascii_web'] = ascii_pairs(WEB_PAL)
report['palette_pairs_phone'] = []
for i, j in itertools.combinations([c for c in range(16) if c != 8], 2):
    row = {'a': CLR[i], 'b': CLR[j]}
    for v in VISIONS:
        row[v] = round(dist(hexrgb(PHONE_PAL[i]), hexrgb(PHONE_PAL[j]), v), 1)
    report['palette_pairs_phone'].append(row)
report['palette_pairs_web'] = []
for i, j in itertools.combinations([c for c in range(16) if c != 8], 2):
    row = {'a': CLR[i], 'b': CLR[j]}
    for v in VISIONS:
        row[v] = round(dist(hexrgb(WEB_PAL[i]), hexrgb(WEB_PAL[j]), v), 1)
    report['palette_pairs_web'].append(row)
report['palettes'] = {'phone': swatches({CLR[i]: PHONE_PAL[i] for i in range(16) if i != 8}),
                      'web': swatches({CLR[i]: WEB_PAL[i] for i in range(16) if i != 8})}

(OUT / 'cvd-report.json').write_text(json.dumps(report, indent=1))
print('ok', len(mons), 'monsters')
