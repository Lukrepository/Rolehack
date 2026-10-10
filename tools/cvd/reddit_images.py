#!/usr/bin/env python3
# Written for Rolehack by Lucas Ruiz with Claude, 2026-10-08.
"""Images for a post about Rolehack's colour-vision tile palettes (r/nethack).

Every monster, object and terrain tile is drawn from vanilla NetHack 5.0.0's
own tile files (git 16ff59115: win/share/*.txt), never Rolehack's sheet.  Each
mode image has four rows: Standard tiles and the mode's palette, each in
typical colour vision and in the simulated vision (Brettel 1997 for
dichromats, luminance for monochrome; tools/cvd/cvd.py).  The families shown
are the same-shaped pairs that merge in that vision with Standard tiles, by
the palette search's rule (cvd_tilepal.py).  The paper doll images come from
the Dressing Room's own compose() (RolehackDroid tools/dressing-room), saved
by the page as /root/cv/doll-pixels.json, and say they are a Rolehack feature.

  python3 reddit_images.py OUTDIR
"""
import sys, re, json, subprocess, pathlib, importlib.util
from PIL import Image, ImageDraw, ImageFont
HERE = pathlib.Path(__file__).resolve().parent
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else HERE / 'reddit')
OUT.mkdir(parents=True, exist_ok=True)
sys.argv = ['x', '/root/NetHack-web']
spec = importlib.util.spec_from_file_location('cvd', HERE / 'cvd.py')
cvd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cvd)

# ---- vanilla 5.0.0 tiles
def vanilla(name):
    return subprocess.run(['git', '-C', '/root/NetHack', 'show', f'16ff59115:win/share/{name}.txt'],
                          capture_output=True, text=True, check=True).stdout
TILES, PAL = {}, None
for name in ('monsters', 'objects', 'other'):
    txt = vanilla(name)
    pal = {m.group(1): tuple(int(v) for v in m.group(2, 3, 4))
           for m in re.finditer(r"^(\S) = \((\d+),\s*(\d+),\s*(\d+)\)", txt, re.M)}
    PAL = PAL or pal
    assert pal == PAL, name
    for m in re.finditer(r"^# tile \d+ \((.*?)\)\n(?:#[^\n]*\n)*\{\n(.*?)\n\}", txt, re.S | re.M):
        key = m.group(1).split(',')[0] if name == 'monsters' else m.group(1)
        TILES.setdefault(key, [r.strip() for r in m.group(2).split('\n')])

hx = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
MAPS = {k: {hx(a): hx(b) for a, b in v.items()} for k, v in json.load(open(HERE / 'cvd-tilemaps.json'))['maps'].items()}
def palette(mode):
    return dict(PAL) if mode is None else {k: MAPS[mode].get(v, v) for k, v in PAL.items()}

# ---- drawing
FONT = '/root/cv/RolehackFront/lib/assets/fonts/AtkinsonHyperlegibleNext-Variable.ttf'
def font(size, weight):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f
F_TITLE, F_SUB, F_ROW, F_FOOT = font(46, 700), font(28, 500), font(27, 600), font(21, 400)
BG, INK, MUTED, ACCENT, RULE = (20, 18, 16), (241, 232, 213), (176, 166, 148), (242, 166, 74), (58, 52, 45)
W = 1920
SCALE, GAP, FAMGAP = 5, 8, 40

def tile_img(rows16, pal, vision, scale):
    im = Image.new('RGB', (16, 16))
    px = im.load()
    for y, r in enumerate(rows16):
        for x, ch in enumerate(r):
            c = pal[ch]
            if vision != 'normal':
                c = tuple(max(0, min(255, int(round(v)))) for v in cvd.simulate(c, vision))
            px[x, y] = c
    return im.resize((16 * scale, 16 * scale), Image.NEAREST)

def px_img(pixels, scale, vision='normal'):
    im = Image.new('RGB', (16, 16))
    p = im.load()
    for i, v in enumerate(pixels):
        c = ((v >> 16) & 255, (v >> 8) & 255, v & 255)
        if vision != 'normal':
            c = tuple(max(0, min(255, int(round(x)))) for x in cvd.simulate(c, vision))
        p[i % 16, i // 16] = c
    return im.resize((16 * scale, 16 * scale), Image.NEAREST)

def strip_width(groups, scale):
    n = sum(len(g) for g in groups)
    return n * 16 * scale + (n - len(groups)) * GAP + (len(groups) - 1) * FAMGAP

def wrap(text, f, width):
    d = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    lines, cur = [], ''
    for w in text.split(' '):
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = w
    return lines + [cur]

def compose(title, subtitle, rows, footer, scale=SCALE, groups=None):
    """rows: [(label, [[PIL tile, ...] per group])].  Text and tiles share one
    left edge; the box is at least 1400 px wide so the text has room."""
    sw = strip_width(groups, scale)
    box = max(sw, 1400)
    th = 16 * scale
    foot = wrap(footer, F_FOOT, box)
    h = 70 + 54 + (44 if subtitle else 0) + len(rows) * (th + 72) + 30 + 30 * len(foot) + 40
    im = Image.new('RGB', (W, h), BG)
    d = ImageDraw.Draw(im)
    x0 = (W - box) // 2
    y = 56
    d.text((x0, y), title, font=F_TITLE, fill=INK)
    y += 62
    if subtitle:
        d.text((x0, y), subtitle, font=F_SUB, fill=ACCENT)
        y += 48
    y += 14
    for label, tiles in rows:
        d.text((x0, y), label, font=F_ROW, fill=MUTED)
        y += 40
        x = x0
        for gi, group in enumerate(tiles):
            for ti, t in enumerate(group):
                im.paste(t, (x, y))
                x += 16 * scale + GAP
            x += FAMGAP - GAP
        y += th + 32
    d.line((x0, y, x0 + box, y), fill=RULE, width=2)
    for i, line in enumerate(foot):
        d.text((x0, y + 16 + 30 * i), line, font=F_FOOT, fill=MUTED)
    return im

def save(im, name):
    p = OUT / name
    im.save(p, 'JPEG', quality=95, subsampling=0, optimize=True)
    print('wrote', p, im.size)

FOOT_SIM = ('Simulated with Brettel, Viénot & Mollon (1997): a model, not what any one person sees. '
            'Tiles: NetHack 5.0.0. Rolehack colour vision is in beta.')
FOOT_MONO = ('Simulated monochromacy: brightness only. A model, not what any one person sees. '
             'Tiles: NetHack 5.0.0. Rolehack colour vision is in beta.')
NAMES = {'redgreen': 'red-green', 'tritan': 'tritan', 'mono': 'monochrome'}

def mode_image(fname, title, vision, vision_label, mode, groups, footer):
    std, mp = palette(None), palette(mode)
    def row(pal, vis):
        return [[tile_img(TILES[n], pal, vis, SCALE) for n in g] for g in groups]
    rows = [('Standard tiles, typical colour vision', row(std, 'normal')),
            (f'Standard tiles, {vision_label}', row(std, vision)),
            (f"Rolehack's {NAMES[mode]} palette, {vision_label}", row(mp, vision)),
            (f"Rolehack's {NAMES[mode]} palette, typical colour vision", row(mp, 'normal'))]
    save(compose(title, None, rows, footer, groups=groups), fname)

DEUT =[['cockatrice', 'pyrolisk'], ['baby red dragon', 'baby green dragon', 'baby orange dragon'],
        ['orange dragon', 'green dragon'], ['lichen', 'brown mold', 'green mold', 'red mold'],
        ['red naga', 'guardian naga'], ['jabberwock', 'vorpal jabberwock']]
PROT = [['baby orange dragon', 'baby green dragon'], ['orange dragon', 'green dragon'],
        ['lichen', 'brown mold', 'green mold', 'red mold']]
TRIT = [['baby gray dragon', 'baby silver dragon', 'baby blue dragon', 'baby green dragon'],
        ['baby white dragon', 'baby yellow dragon'],
        ['gray dragon', 'silver dragon', 'blue dragon', 'green dragon'], ['red mold', 'violet fungus']]
MONO = [['baby gray dragon', 'baby silver dragon', 'baby red dragon', 'baby white dragon', 'baby orange dragon',
         'baby blue dragon', 'baby green dragon', 'baby gold dragon', 'baby yellow dragon'],
        ['lichen', 'brown mold', 'yellow mold', 'green mold', 'red mold', 'violet fungus'],
        ['blue jelly', 'spotted jelly', 'ochre jelly'], ['cockatrice', 'pyrolisk']]
for groups in (DEUT, PROT, TRIT, MONO):
    for g in groups:
        for n in g:
            assert n in TILES, n

mode_image('1-deuteranopia.jpg', 'Deuteranopia: same shape, different colour', 'deuteranopia',
           'simulated deuteranopia', 'redgreen', DEUT, FOOT_SIM)
mode_image('2-protanopia.jpg', 'Protanopia: same shape, different colour', 'protanopia',
           'simulated protanopia', 'redgreen', PROT, FOOT_SIM)
mode_image('3-tritanopia.jpg', 'Tritanopia: same shape, different colour', 'tritanopia',
           'simulated tritanopia', 'tritan', TRIT, FOOT_SIM)
mode_image('4-monochrome.jpg', 'Monochrome: same shape, different colour', 'achromatopsia',
           'simulated monochromacy', 'mono', MONO, FOOT_MONO)

# ---- the rest of the game, in typical vision: what each palette costs
REST = [['newt', 'jackal', 'floating eye', 'soldier ant', 'fire ant', 'dwarf', 'Woodland-elf'],
        ['ruby / gain ability', 'pink / restore ability', 'orange / confusion', 'yellow / blindness',
         'emerald / paralysis', 'dark green / speed', 'cyan / levitation'],
        ['tree', 'chaotic altar', 'throne', 'sink']]
rows = []
for label, mode in (('Standard tiles', None), ("Rolehack's red-green palette", 'redgreen'),
                    ("Rolehack's tritan palette", 'tritan'), ("Rolehack's monochrome palette", 'mono')):
    pal = palette(mode)
    rows.append((label, [[tile_img(TILES[n], pal, 'normal', SCALE) for n in g] for g in REST]))
save(compose('The rest of the game, in typical colour vision', None, rows,
             'Each palette is only used when a player picks that mode; Standard is the default. '
             'Tiles: NetHack 5.0.0. Rolehack colour vision is in beta.', groups=REST), '5-everything-else.jpg')

# ---- vanilla's glyph: option on the text map (no tiles), for red-green vision:
# the whole F class.  Colours are xterm's defaults; vanilla's F's are lichen
# bright green, brown mold brown (xterm draws it dark yellow), yellow mold
# yellow, green mold green, red mold red, shrieker and violet fungus both
# magenta.  The new colours come from the 256-colour cube, so a 256-colour
# terminal shows them exactly; a search (2026-10-08) kept each within 22
# CIEDE2000 of vanilla in typical vision and >= 4.5:1 on black, and maximised
# the closest pair across typical vision, deuteranopia and protanopia.  Closest
# pair, vanilla -> these lines: deuteranopia 3.4 -> 13.1, protanopia 2.7 -> 14.4,
# typical 11.3 -> 15.9.  The eight lines and Enhanced1 were run on the terminal
# build (2026-10-08): ESC[38;5;106m, 186m, 36m, 167m; yellow mold 93m and the
# two magentas 35m unchanged; no option errors.
FMONS = ['lichen', 'brown mold', 'yellow mold', 'green mold', 'red mold', 'shrieker', 'violet fungus']
FVAN = {'lichen': (0, 255, 0), 'brown mold': (205, 205, 0), 'yellow mold': (255, 255, 0), 'green mold': (0, 205, 0),
        'red mold': (205, 0, 0), 'shrieker': (205, 0, 205), 'violet fungus': (205, 0, 205)}
FFIX = dict(FVAN, **{'lichen': (135, 175, 0), 'brown mold': (215, 215, 135), 'green mold': (0, 175, 135),
                     'red mold': (215, 95, 95)})
def glyph_lines():
    out = ['OPTIONS=symset:Enhanced1']
    for n in FMONS:
        if FFIX[n] != FVAN[n]:
            for g in ('male', 'female'):
                out.append('OPTIONS=glyph:G_%s_%s/%d-%d-%d' % ((g, n.replace(' ', '_')) + FFIX[n]))
    return out

def glyph_image():
    term = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', 92)
    code = ImageFont.truetype('/root/cv/RolehackFront/lib/assets/fonts/IBMPlexMono-Regular.ttf', 28)
    name_f, head_f = font(21, 500), font(30, 700)
    sim = lambda c, v: c if v == 'normal' else tuple(max(0, min(255, int(round(x)))) for x in cvd.simulate(c, v))
    cell, gap, pgap = 104, 8, 64
    pw = len(FMONS) * cell + (len(FMONS) - 1) * gap
    box = 2 * pw + pgap
    x0 = (W - box) // 2
    lines = glyph_lines()
    rows = [('Typical colour vision', 'normal'), ('Simulated deuteranopia (red-green)', 'deuteranopia'),
            ('Simulated protanopia (red-green)', 'protanopia')]
    foot = wrap('Yellow mold, shrieker and violet fungus keep their colours (shrieker and violet fungus share one '
                'colour in vanilla, for everyone). Any symset line will do; the glyph lines need one before them. '
                'Needs a terminal with 256 or more colours; recolours the text map, not tiles. '
                "Colours: xterm's defaults. Simulated with Brettel, Viénot & Mollon (1997): a model, "
                'not what any one person sees.', F_FOOT, box)
    im = Image.new('RGB', (W, 2400), BG)
    d = ImageDraw.Draw(im)
    y = 56
    d.text((x0, y), 'Vanilla NetHack can recolour any monster: every F, for red-green vision', font=F_TITLE, fill=INK)
    y += 84
    for p, head in enumerate(('Vanilla colours', 'After these lines in the options file')):
        px = x0 + p * (pw + pgap)
        d.text((px, y), head, font=head_f, fill=ACCENT)
        for i, n in enumerate(FMONS):
            cx = px + i * (cell + gap) + cell // 2
            for k, part in enumerate(n.split(' ')):
                d.text((cx, y + 48 + 25 * k), part, font=name_f, fill=MUTED, anchor='ma')
    y += 48 + 2 * 25 + 18
    for label, vis in rows:
        d.text((x0, y), label, font=F_ROW, fill=MUTED)
        y += 40
        for p, pal in enumerate((FVAN, FFIX)):
            px = x0 + p * (pw + pgap)
            d.rectangle((px, y, px + pw, y + cell), fill=(0, 0, 0))
            for i, n in enumerate(FMONS):
                d.text((px + i * (cell + gap) + cell // 2, y + cell // 2), 'F', font=term,
                       fill=sim(pal[n], vis), anchor='mm')
        y += cell + 30
    y += 6
    lh = 42
    d.rectangle((x0, y, x0 + box, y + len(lines) * lh + 28), fill=(32, 29, 26), outline=RULE, width=2)
    for i, l in enumerate(lines):
        d.text((x0 + 24, y + 14 + lh * i), l, font=code, fill=INK)
    y += len(lines) * lh + 28 + 26
    d.line((x0, y, x0 + box, y), fill=RULE, width=2)
    for i, l in enumerate(foot):
        d.text((x0, y + 16 + 30 * i), l, font=F_FOOT, fill=MUTED)
    return im.crop((0, 0, W, y + 16 + 30 * len(foot) + 40))
save(glyph_image(), '8-text-map-glyph-option.jpg')

# ---- the paper doll: a Rolehack feature
DOLL = json.load(open('/root/cv/doll-pixels.json'))
n = len(DOLL['heroes'])
DS = 7
groups = [list(range(n))]
lab = 'Rolehack  |  Not proposed for NetHack'
rows = [(t, [[px_img(p, DS) for p in DOLL['rows'][k]]]) for t, k in
        (('Vanilla hero tiles', 'standard:bare'), ('Early gear', 'standard:early'),
         ('Late-game gear', 'standard:late'))]
save(compose("Rolehack's paper doll: you look like what you wear", lab, rows,
             'Drawn by the Rolehack app on top of vanilla NetHack 5.0 hero tiles. Armour is cut from '
             "each item's own floor tile, so an unidentified item never gives itself away.",
             scale=DS, groups=groups), '6-paper-doll.jpg')
rows = [(t, [[px_img(p, DS) for p in DOLL['rows'][k]]]) for t, k in
        (('Standard tiles', 'standard:late'), ("Rolehack's red-green palette", 'redgreen:late'),
         ("Rolehack's tritan palette", 'tritan:late'), ("Rolehack's monochrome palette", 'mono:late'))]
save(compose('The paper doll follows the colour-vision palettes', lab, rows,
             'Typical colour vision. Rolehack colour vision is in beta.', scale=DS, groups=groups),
     '7-paper-doll-palettes.jpg')
