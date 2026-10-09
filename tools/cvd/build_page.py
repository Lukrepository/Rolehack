#!/usr/bin/env python3
# Written for Rolehack by Lucas Ruiz with Claude, 2026-09-28.
"""Builds colour-vision-brief-2026-09-28.html at the root of the tree it sits
in (the workspace, or this repository, whose kept copy is docs/colour-vision/).

Every swatch on the page is computed here by cvd.simulate() from the colours
in the code; the summary's pair counts and the "What happened next"
paragraph are written by hand, here and in page_template.html.  Run inside WSL after
cvd.py, cvd_tiles.py and cvd_palette.py:

  cd tools/cvd && python3 cvd.py /root/NetHack-web && python3 cvd_tiles.py \
    && python3 cvd_palette.py && python3 build_page.py

The published brief shows Rolehack's colours before the colour-vision work
(RolehackFront e3113a6, RolehackDroid 4b9112228, NetHack-web be8c9983a).  The
code has changed since, so a rebuild today draws the new colours: check out
those commits first, or edit the page's HTML instead.
"""
import sys, json, base64, itertools, html, pathlib, importlib.util
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.argv = ['x', '/root/NetHack-web']
spec = importlib.util.spec_from_file_location('cvd', HERE / 'cvd.py')
cvd = importlib.util.module_from_spec(spec); spec.loader.exec_module(cvd)
H, sim, hx = cvd.hexrgb, cvd.simulate, cvd.tohex
esc = html.escape

SHOW = [('normal', 'Normal'), ('deuteranomaly', 'Deuteranomaly'), ('deuteranopia', 'Deuteranopia'),
        ('protanopia', 'Protanopia'), ('tritanopia', 'Tritanopia'), ('achromatopsia', 'Monochrome')]

def s(h, v):
    return hx(sim(H(h), v))

def worst(cols, v):
    return min(cvd.dist(H(a), H(b), v) for a, b in itertools.combinations(cols, 2))

def verdict(d):
    if d >= 12: return 'clear', '●'
    if d >= 8: return 'weak', '◐'
    return 'collides', '○'

def simrows(cols, chip):
    """cols: the colours whose pairs are judged; chip(v) -> html for that vision."""
    out = ['<div class="sim">']
    for v, label in SHOW:
        d = worst(cols, v)
        word, mark = verdict(d)
        out.append(f'<div class="simrow"><span class="vl">{label}</span><span class="chips">{chip(v)}</span>'
                   f'<span class="de de-{word}" title="worst pair, CIEDE2000">{mark} {d:.1f} <i>{word}</i></span></div>')
    out.append('</div>')
    return '\n'.join(out)

GLASS = '090d0a'
PHOS = 'd7e3d0'

def glass_text(items, v, cls='vt'):
    return (f'<span class="glass {cls}" style="background:{s(GLASS, v)}">'
            + ' '.join(f'<span style="color:{s(c, v)}">{esc(t)}</span>' for t, c in items) + '</span>')

def badges(items, v, style=None):
    out = []
    for i, (t, bg, fg) in enumerate(items):
        st = style[i] if style else 'solid'
        if st == 'solid':
            out.append(f'<span class="badge" style="background:{s(bg, v)};color:{s(fg, v)}">{esc(t)}</span>')
        elif st == 'bold':
            out.append(f'<span class="badge b-bold" style="background:{s(bg, v)};color:{s(fg, v)}">{esc(t)}</span>')
        elif st == 'outline':
            out.append(f'<span class="badge b-out" style="border-color:{s(bg, v)};color:{s(bg, v)}">{esc(t)}</span>')
        else:
            out.append(f'<span class="badge b-plain" style="color:{s(bg, v)}">{esc(t)}</span>')
    return f'<span class="glass" style="background:{s(GLASS, v)}">' + ''.join(out) + '</span>'

def outlines(items, v, widths=None):
    out = []
    for i, (t, c) in enumerate(items):
        w = widths[i] if widths else 2
        out.append(f'<span class="cell" style="border:{w}px {"double" if w > 3 else "solid"} {s(c, v)};'
                   f'background:{s("2b3a3a", v)};color:{s(PHOS, v)}">{esc(t)}</span>')
    return f'<span class="glass" style="background:{s(GLASS, v)}">' + ''.join(out) + '</span>'

def letters(items, pal, v):
    return (f'<span class="glass vt big" style="background:{s("000000", v)}">'
            + ''.join(f'<span title="{esc(n)}" style="color:{s(pal[c], v)}">{esc(ch)}</span>' for ch, n, c in items)
            + '</span>')

def keys(items, v):
    return ''.join(f'<span class="key" style="background:{s(face, v)};color:{s(leg, v)}">{esc(t)}</span>'
                   for t, face, leg in items)

def card(title, where, cue, body, note=''):
    return (f'<article class="card"><h3>{title}</h3><p class="where">{where}</p>'
            f'<p class="cue"><b>Second cue today:</b> {cue}</p>{body}'
            + (f'<p class="note">{note}</p>' if note else '') + '</article>')

P = cvd.PHONE_PAL
W = cvd.WEB_PAL
CLRI = {n: i for i, n in enumerate(cvd.CLR)}
mon = {m['name']: m['clr'] for m in cvd.mons}
def mrow(names, ch):
    return [(ch, n, mon[n]) for n in names]
def palhex(pal):
    return ['#' + p.lstrip('#') for p in pal]
PP, WP = palhex(P), palhex(W)

# ------------------------------------------------------------------ the hero: one status and inventory, twice
def hero(v):
    g = s(GLASS, v)
    ph = s(PHOS, v)
    hp = s('f5b342', v)
    bar = f'<span class="hpbar" style="background:{hp};color:{g}">Mortar the</span> Pestler'
    b = ''.join(f'<span class="gbadge" style="background:{s(bg, v)};color:{s(fg, v)}">{t}</span>'
                for t, bg, fg in [('HUNGRY', 'd9772b', '1a1206'), ('BURDENED', 'c9a227', '1a1206'), ('CONF', 'c9a227', '1a1206')])
    inv = [('a - a blessed +2 knife (weapon in hand)', W[2]), ('b - an uncursed alchemy smock (being worn)', W[11]),
           ('c - a cursed potion of sleeping', W[1]), ('d - a blessed potion of full healing', W[2])]
    lines = ''.join(f'<div style="color:{s(c, v)}">{esc(t)}</div>' for t, c in inv)
    return (f'<div class="screen" style="background:{g};color:{ph}">'
            f'<div>{bar}  Dlvl:9 $:212 T:2794</div>'
            f'<div><span style="color:{hp}">HP:23(41)</span> Pw:7(7) AC:5 Xp:4/1046</div>'
            f'<div>St:11 Dx:14 Co:13 In:16 Wi:15 Ch:9 {b}</div>'
            f'<div class="inv">{lines}</div></div>')

hero_html = ('<div class="hero-pair"><figure><figcaption>Normal vision</figcaption>' + hero('normal')
             + '</figure><figure><figcaption>Deuteranopia, simulated</figcaption>' + hero('deuteranopia')
             + '</figure></div>')

# ------------------------------------------------------------------ audit cards
audit = []
hp_now = [('HP:58(60)', '63e07c'), ('HP:30(60)', 'f5b342'), ('HP:12(60)', 'ff5a44')]
audit.append(card('HP number and bar',
    '<code>RhScreen.java:539</code> and <code>web.js:586</code>: green at 66% and up, amber at 33% and up, red below.',
    'the number, and the bar\'s length under the title. The colour is the at-a-glance alarm.',
    simrows([c for _, c in hp_now], lambda v: glass_text(hp_now, v)),
    'Green and amber are the pair that goes: 7.7 for protanopes, 2.0 in monochrome.'))
outline_now = [('100', P[2]), ('70', P[11]), ('50', P[9]), ('30', P[1])]
audit.append(card('Hero outline on the map (phone)',
    '<code>NHW_Map.java:778</code> draws the hero\'s square in the HP colour the core sends '
    '(<code>winandroid.c:1186</code>), from <code>defaults.nh</code>\'s <code>hilite_status:hitpoints</code>: '
    'green, yellow below 70%, orange below 50%, red below 30%.',
    'none. It is the only HP cue on the map. The web draws a fixed amber outline instead '
    '(<code>web.js:324</code>).',
    simrows([c for _, c in outline_now], lambda v: outlines(outline_now, v)),
    'Its steps (70/50/30%) are not the status line\'s (66/33%), so the two can disagree about how hurt you are.'))
bad_now = [('WEAK', 'c2412e', 'ffffff'), ('HUNGRY', 'd9772b', '1a1206'), ('BURDENED', 'c9a227', '1a1206'), ('LEV', '2f63ad', 'ffffff')]
audit.append(card('Condition badge tiers',
    '<code>RhBadges.java:44</code>, <code>RhTheme.java:57</code> and <code>:415</code>; <code>web.js:37</code>. '
    'Critical red, serious orange, warning amber, info blue.',
    'the word, and worst-first order. How alarmed to be is carried by colour alone.',
    simrows([b for _, b, _ in bad_now], lambda v: badges(bad_now, v)),
    'Serious and warning (Hungry and Burdened, Stressed and Conf) are 5.5 apart for deuteranopes: one colour to them.'))
buc_items = [('blessed', 2), ('uncursed', 11), ('cursed', 1)]
audit.append(card('Blessed, uncursed, cursed in menus: web',
    '<code>defaults.nh</code> (<code>MENUCOLOR=" blessed "=green</code> and the rest, both builds), drawn with '
    '<code>web.js:19</code>\'s palette.',
    'the word itself is in every line. The colour is how you scan a long inventory.',
    simrows([W[i] for _, i in buc_items], lambda v: glass_text([(t, W[i]) for t, i in buc_items], v)),
    'The web\'s green and red are close in lightness, so deuteranopes lose them: 5.2.'))
audit.append(card('Blessed, uncursed, cursed in menus: phone',
    'Same rules, drawn with <code>winandroid.c:789</code>\'s palette (gurrhack\'s pure red, dark green, yellow).',
    'the word.',
    simrows([P[i] for _, i in buc_items], lambda v: glass_text([(t, P[i]) for t, i in buc_items], v)),
    'The phone\'s dark green and bright red differ in lightness, which saves them: 12.2, just at the bar.'))
F = mrow(['lichen', 'brown mold', 'yellow mold', 'green mold', 'red mold'], 'F')
d = mrow(['jackal', 'fox', 'coyote', 'hell hound pup'], 'd')
audit.append(card('ASCII map: same letter, different colour (web palette)',
    'Every monster sharing a letter is told apart by colour alone. <code>web.js:19</code>.',
    'none on the map. Far look (<code>;</code>) names it, and <code>autodescribe</code> (on by default in 5.0) names what is under the cursor while you pick a spot.',
    simrows(sorted({W[c] for _, _, c in F}), lambda v: letters(F, WP, v) + ' ' + letters(d, WP, v)),
    'F: lichen, brown, yellow, green, red mold. d: jackal, fox, coyote, hell hound pup. Of 3,526 same-letter pairs '
    'with different colours, <b>155</b> fall below 8 for protanopes or deuteranopes, and 78 for tritanopes. '
    '(Corrected the same day: first published as 134, because 21 grey-against-cyan pairs, such as wolf and '
    'winter wolf, sit at 7.96 for protanopes and the table rounded them to 8.0.)'))
audit.append(card('ASCII map: same letter, different colour (phone palette)',
    '<code>winandroid.c:789</code>.', 'as above.',
    simrows(sorted({P[c] for _, _, c in F}), lambda v: letters(F, PP, v) + ' ' + letters(d, PP, v)),
    'The phone palette fares better: <b>37</b> pairs collapse for protanopes or deuteranopes, 7 for tritanopes. '
    'Lichen against yellow mold is 3.6 for protanopes.'))
lay = [('APPLY', '35302b', 'fbf8f1'), ('COMBAT', 'a13426', 'fff3ea'), ('EAT', '35302b', 'f08bb6'),
       ('DROP', '35302b', '5fd8c9'), ('INV', '63615c', 'fffaf0')]
audit.append(card('Layer colours (Terminal skins)',
    '<code>RhTheme.layerCap()</code>, <code>RhTheme.java:194</code>.',
    'the layer\'s name chip, and the hub your thumb is holding.',
    simrows(['fbf8f1', 'c85240', 'f08bb6', '5fd8c9', '9c9a94'], lambda v: keys(lay, v)),
    'EAT\'s rose and DROP\'s teal legends meet for deuteranopes (5.5), but only one layer is ever up and it names itself. '
    'On GameCube, the APPLY and COMBAT layer colours (red and scarlet) are only 9.1 apart even in normal vision.'))
audit_html = '\n'.join(audit)

# ------------------------------------------------------------------ tiles
tiles_meta = json.load(open(HERE / 'tiles-sheet.json'))
tile_imgs = {}
for v, _ in SHOW:
    p = HERE / f'tiles-{v}.png'
    if p.exists():
        tile_imgs[v] = 'data:image/png;base64,' + base64.b64encode(p.read_bytes()).decode()
tpairs = json.load(open(HERE / 'cvd-tiles.json'))['pairs']
same = [p for p in tpairs if p['shape'] <= 0.02]
lost = sorted([p for p in same if p['normal'] >= 6 and min(p['protanopia'], p['deuteranopia']) < p['normal'] * 0.4],
              key=lambda p: (p['cls'], p['a']))
tile_rows = ''.join(
    f'<tr><td>{esc(p["a"])}</td><td>{esc(p["b"])}</td><td class="num">{p["normal"]:.1f}</td>'
    f'<td class="num">{p["deuteranopia"]:.1f}</td><td class="num">{p["protanopia"]:.1f}</td>'
    f'<td class="num">{p["achromatopsia"]:.1f}</td></tr>' for p in lost)
group_names = '; '.join(f'<b>{k}</b> ' + ', '.join(n) for k, n in tiles_meta['groups'])
tile_opts = ''.join(
    f'<label><input type="radio" name="tv" id="tv-{v}" value="{v}"{" checked" if v == "deuteranopia" else ""}> {lab}</label>'
    for v, lab in SHOW if v not in ('normal', 'deuteranomaly'))
tile_data = json.dumps({v: tile_imgs[v] for v in tile_imgs})

# ------------------------------------------------------------------ proposal cards
prop = []
hpA = [('HP:58(60)', '56b4e9'), ('HP:30(60)', 'f0e442'), ('HP:12(60)', 'ff6a33')]
hpB = [('HP:58(60)', PHOS), ('HP:30(60)', 'f0d43a'), ('HP:12(60)', 'ff6a33')]
prop.append(card('HP, option A: blue, yellow, vermillion',
    'Okabe&ndash;Ito hues, lifted for the dark glass.', 'unchanged: number and bar. Add inverse video below 15%, as '
    '<code>defaults.nh</code> already asks (<code>red&amp;inverse</code>).',
    simrows([c for _, c in hpA], lambda v: glass_text(hpA, v)),
    'Contrast on the glass: 8.5, 14.8, 6.9 to 1.'))
prop.append(card('HP, option B: plain, yellow, vermillion',
    'Colour only when something is wrong.', 'as A.',
    simrows([c for _, c in hpB], lambda v: glass_text(hpB, v)),
    'Keeps full health quiet. Plain and yellow sit close in lightness, so monochrome leans on the bar and the inverse step.'))
badA = [('WEAK', 'b84a00', 'ffffff'), ('HUNGRY', 'e69f00', '1a1206'), ('BURDENED', 'f0e442', '1a1206'), ('LEV', '56b4e9', '1a1206')]
prop.append(card('Badges: a style per tier, then colour',
    'Critical solid and bold, serious solid, warning outlined, info plain text.',
    'the fill style carries the tier in every vision, monochrome included.',
    simrows([b for _, b, _ in badA], lambda v: badges(badA, v, ['bold', 'solid', 'outline', 'plain'])),
    'The vermillion is darkened so white text keeps 5.2 to 1.'))
bucA = [('blessed', '56b4e9'), ('uncursed', 'f0e442'), ('cursed', 'ff6a33')]
prop.append(card('Menus: sky blue, yellow, vermillion',
    'Either as <code>defaults.nh</code> names (blessed&nbsp;=&nbsp;cyan) or only as the RGB behind them.',
    'the word, unchanged.',
    simrows([c for _, c in bucA], lambda v: glass_text(bucA, v)),
    'Deuteranopes: 15.9, from the web\'s 5.2 and the phone\'s 12.2.'))
outl = [('100', PHOS), ('60', 'f0e442'), ('30', 'ff6a33')]
prop.append(card('Hero outline: the status line\'s steps, and a shape at the bottom',
    'Same thresholds as HP (66/33%). Below 33% the outline doubles.',
    'the double stroke.',
    simrows([c for _, c in outl], lambda v: outlines(outl, v, [2, 2, 5]))))
pal = json.load(open(HERE / 'cvd-palette.json'))
drafted = [pal['palette'].get(n, '#ffffff') for n in cvd.CLR]
drafted[8] = '#ffffff'
DP = palhex([c.lstrip('#') for c in drafted])
prop.append(card('A red-green game palette (machine-searched draft)',
    'The 16 colours the port maps NetHack\'s colour names to, searched to keep every same-letter pair apart.',
    'not a cue: an opt-in palette for the Colour vision setting.',
    simrows(sorted({DP[c].lstrip('#') for _, _, c in F}), lambda v: letters(F, DP, v) + ' ' + letters(d, DP, v)),
    f'Worst same-letter pair for protanopes and deuteranopes: {pal["score"][1]:.1f}, against 1.5 for today\'s phone palette (cyan against bright cyan, close for everyone); '
    f'{pal["collapsing_pairs"]} pairs below 8. The cost is visible: green turns olive and bright blue violet, so it '
    'belongs behind the setting, not in the default.'))
prop_html = '\n'.join(prop)

# ------------------------------------------------------------------ page
page = (HERE / 'page_template.html').read_text(encoding='utf-8')
for k, v in {'%%HERO%%': hero_html, '%%AUDIT%%': audit_html, '%%PROPOSAL%%': prop_html,
             '%%TILEROWS%%': tile_rows, '%%TILEGROUPS%%': group_names, '%%TILEOPTS%%': tile_opts,
             '%%TILEDATA%%': tile_data, '%%TILENORMAL%%': tile_imgs['normal'],
             '%%TILEDEUT%%': tile_imgs['deuteranopia'], '%%NSAME%%': str(len(same)),
             '%%NLOST%%': str(len(lost))}.items():
    page = page.replace(k, v)
assert '%%' not in page, page[page.index('%%') - 40:page.index('%%') + 40]
out = ROOT / 'colour-vision-brief-2026-09-28.html'
out.write_text(page, encoding='utf-8')
print('wrote', out, len(page) // 1024, 'KB')
