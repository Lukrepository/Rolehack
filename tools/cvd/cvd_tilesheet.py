#!/usr/bin/env python3
# Written for Rolehack by Lucas Ruiz with Claude, 2026-09-28.
"""Demo sheets for the tile palettes (cvd_tilepal.py): each mode's palette,
seen in normal vision and in that mode's vision, against today's.  Writes
tilesheet-<mode>.png and tilesheet.json (row labels and tile names)."""
import sys, re, json, importlib.util, pathlib
HERE = pathlib.Path(__file__).resolve().parent
PALFILE = sys.argv[1] if len(sys.argv) > 1 else 'cvd-tilepal.json'
SUFFIX = sys.argv[2] if len(sys.argv) > 2 else ''
sys.argv = ['x', '/root/NetHack-web']
spec = importlib.util.spec_from_file_location('cvd', HERE / 'cvd.py')
cvd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cvd)
from PIL import Image
SRC = pathlib.Path('/root/NetHack-web/win/share')

def read(name):
    txt = (SRC / f'{name}.txt').read_text()
    t = {}
    for m in re.finditer(r"^# tile \d+ \((.*?)\)\n(?:#[^\n]*\n)*\{\n(.*?)\n\}", txt, re.S | re.M):
        t.setdefault(m.group(1).split(',')[0] if name == 'monsters' else m.group(1),
                     [r.strip() for r in m.group(2).split('\n')])
    return t
TILES = {}
for n in ('monsters', 'objects', 'other'):
    TILES.update(read(n))
TP = json.load(open(HERE / PALFILE))
H = cvd.hexrgb
STD = {k: H(v) for k, v in TP['palette'].items()}

FAMILIES = ['lichen', 'brown mold', 'yellow mold', 'green mold', 'red mold', None,
            'cockatrice', 'chickatrice', 'pyrolisk', None,
            'baby red dragon', 'baby green dragon', 'baby orange dragon', 'red dragon', 'green dragon', 'orange dragon', None,
            'red naga', 'guardian naga', 'golden naga', None, 'jabberwock', 'vorpal jabberwock']
SAMPLE = ['newt', 'jackal', 'floating eye', 'soldier ant', 'fire ant', 'dwarf', 'Woodland-elf', None,
          'ruby / gain ability', 'pink / restore ability', 'orange / confusion', 'yellow / blindness',
          'emerald / paralysis', 'dark green / speed', 'cyan / levitation', None,
          'tree', 'chaotic altar', 'throne', 'sink']
for n in FAMILIES + SAMPLE:
    assert n is None or n in TILES, n

SCALE, PAD, GAP = 3, 2, 10
def sheet(names, rows):
    """rows: [(palette dict, vision)].  One strip of tiles per row."""
    cells = [n for n in names]
    w = sum((16 * SCALE + PAD) if n else GAP for n in cells) + PAD
    h = len(rows) * (16 * SCALE + PAD) + PAD
    im = Image.new('RGB', (w, h), (20, 18, 16))
    px = im.load()
    cache = {}
    for ri, (pal, vis) in enumerate(rows):
        x0, y0 = PAD, PAD + ri * (16 * SCALE + PAD)
        for n in cells:
            if not n:
                x0 += GAP
                continue
            for y, r in enumerate(TILES[n]):
                for x, ch in enumerate(r):
                    k = (ch, id(pal), vis)
                    if k not in cache:
                        cache[k] = cvd.simulate(pal[ch], vis)
                    c = cache[k]
                    for dy in range(SCALE):
                        for dx in range(SCALE):
                            px[x0 + x * SCALE + dx, y0 + y * SCALE + dy] = c
            x0 += 16 * SCALE + PAD
    return im

meta = {'families': FAMILIES, 'sample': SAMPLE, 'rows': {}}
for mode, vis in (('redgreen', 'deuteranopia'), ('tritan', 'tritanopia'), ('mono', 'achromatopsia')):
    new = {k: H(v) for k, v in TP['modes'][mode]['palette'].items()}
    rows = [(STD, 'normal'), (new, 'normal'), (STD, vis), (new, vis)]
    labels = ['Today, normal vision', 'New palette, normal vision', f'Today, {vis}', f'New palette, {vis}']
    if mode == 'redgreen':
        rows.append((new, 'protanopia'))
        labels.append('New palette, protanopia')
    sheet(FAMILIES, rows).save(HERE / f'tilesheet-{mode}{SUFFIX}-families.png')
    sheet(SAMPLE, rows).save(HERE / f'tilesheet-{mode}{SUFFIX}-sample.png')
    meta['rows'][mode] = labels
(HERE / 'tilesheet.json').write_text(json.dumps(meta, indent=1))
print('ok')
