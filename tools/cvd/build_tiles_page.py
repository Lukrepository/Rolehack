#!/usr/bin/env python3
# Written for Rolehack by Lucas Ruiz with Claude, 2026-09-28.
"""Builds colour-vision-tiles-2026-09-28.html at the root of the tree it sits in
(the workspace, or this repository, whose kept copy is docs/colour-vision/) from the
tile palette searches (cvd-tilepal-<cap>.json, one per strength) and the
sheets cvd_tilesheet.py drew from them (tilesheet-<mode>-<cap>-*.png)."""
import json, base64, html, pathlib
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
esc = html.escape

def img(name):
    return 'data:image/png;base64,' + base64.b64encode((HERE / name).read_bytes()).decode()

meta = json.load(open(HERE / 'tilesheet.json'))
CAPS = [c for c in ('9', '12', '15') if (HERE / f'cvd-tilepal-{c}.json').exists()
        and (HERE / f'tilesheet-redgreen-{c}-families.png').exists()]
P = {c: json.load(open(HERE / f'cvd-tilepal-{c}.json')) for c in CAPS}
NAMES = {'redgreen': 'Protanopia and deuteranopia (one palette)', 'tritan': 'Tritanopia', 'mono': 'Monochrome'}
CAPNAME = {'9': 'Gentle', '12': 'Middle', '15': 'Strong'}

head = ('<tr><th>Mode</th><th class="num">Merge today</th>'
        + ''.join(f'<th class="num">{CAPNAME[c]} ({c})</th>' for c in CAPS)
        + '<th class="num">Worst keeps today</th>'
        + ''.join(f'<th class="num">{CAPNAME[c]}</th>' for c in CAPS) + '</tr>')
rows = []
for mode in ('redgreen', 'tritan', 'mono'):
    st = P[CAPS[0]]['modes'][mode]['start']      # today: the same in every search
    ends = [P[c]['modes'][mode]['end'] for c in CAPS]
    rows.append(f'<tr><td>{NAMES[mode]}</td><td class="num">{-st[0]}</td>'
                + ''.join(f'<td class="num">{-e[0]}</td>' for e in ends)
                + f'<td class="num">{st[1]:.0%}</td>'
                + ''.join(f'<td class="num">{e[1]:.0%}</td>' for e in ends) + '</tr>')
table = head.replace('<tr>', '<thead><tr>', 1) + '</thead><tbody>' + '\n'.join(rows) + '</tbody>'
LEFT = json.load(open(HERE / 'cvd-tilepal-left.json'))
left_html = '<ul class="left">' + ''.join(
    f'<li><b>{CAPNAME[c]} ({c})</b>: red-green leaves '
    + (esc('; '.join(LEFT[c]['redgreen'])) if LEFT[c]['redgreen'] else 'none')
    + f'. Monochrome leaves {len(LEFT[c]["mono"])}'
    + (f', e.g. {esc("; ".join(LEFT[c]["mono"][:4]))}' if LEFT[c]['mono'] else '') + '.</li>'
    for c in CAPS) + '</ul>'
table = table + '%%AFTER%%'

def labels(mode):
    return ''.join(f'<li>{esc(l)}</li>' for l in meta['rows'][mode])

def section(mode, kicker, title, text):
    parts = [f'<section><div class="sec-head"><span class="kicker">{kicker}</span><h2>{title}</h2></div>',
             f'<div class="prose">{text}</div>',
             f'<p class="rows">Rows, top to bottom:</p><ol class="rowlist">{labels(mode)}</ol>']
    for c in reversed(CAPS):
        label = f'{CAPNAME[c]} palette (each colour moves up to {c} CIEDE2000)'
        parts.append(f'<figure><figcaption>{esc(label)}: the families</figcaption>'
                     f'<div class="sheet"><img src="{img(f"tilesheet-{mode}-{c}-families.png")}" alt="{esc(label)}, families"></div></figure>')
        parts.append(f'<figure><figcaption>{esc(label)}: ordinary tiles</figcaption>'
                     f'<div class="sheet"><img src="{img(f"tilesheet-{mode}-{c}-sample.png")}" alt="{esc(label)}, ordinary tiles"></div></figure>')
    parts.append('</section>')
    return '\n'.join(parts)

sections = '\n'.join([
    section('redgreen', '2 &middot; Red-green', 'Protanopia and deuteranopia',
            '<p>Row 3 is the problem: brown, green and red mold, the three baby dragons, cockatrice and pyrolisk turn the same '
            'olive. Row 4 is the new palette seen by a deuteranope, row 5 by a protanope. Row 2 is the cost: what everyone '
            'else sees in this mode. The stronger the palette, the more reds lean toward rust and bright green toward '
            'yellow-green; at full strength the ruby potion reads brown.</p>'),
    section('tritan', '3 &middot; Tritanopia', 'Tritanopia',
            '<p>These families mostly stay apart for a tritanope already (row 3), so the palette changes little; it fixes the '
            'few pairs that do merge.</p>'),
    section('mono', '4 &middot; Monochrome', 'Monochrome',
            '<p>With brightness alone the palette can pull some families apart (the dragons now differ in lightness), but '
            'not all: the pairs left need a mark drawn on the tile, which is art work.</p>'),
])

fixed = [c for c in CAPS if P[c]['modes']['redgreen']['end'][0] == 0]
if fixed:
    c = fixed[0]
    others = [f'{CAPNAME[o].lower()} leaves {-P[o]["modes"]["redgreen"]["end"][0]} merged'
              for o in CAPS if int(o) < int(c)]
    lean = (f'<b>{CAPNAME[c]} ({c})</b>, the smallest shift that keeps every red-green family apart'
            + (f' (the {"; the ".join(others)})' if others else '') + '.')
else:
    lean = '<b>none yet</b>: no strength tried keeps every red-green family apart.'

page = (HERE / 'tiles_template.html').read_text(encoding='utf-8')
page = page.replace('%%TABLE%%', table).replace('%%AFTER%%', '')
page = page.replace('%%LEFT%%', left_html)
for k, v in {'%%SECTIONS%%': sections, '%%LEAN%%': lean,
             '%%FAMS%%': esc(', '.join(n for n in meta['families'] if n)),
             '%%SAMPLE%%': esc(', '.join(n for n in meta['sample'] if n))}.items():
    page = page.replace(k, v)
assert '%%' not in page
out = ROOT / 'colour-vision-tiles-2026-09-28.html'
out.write_text(page, encoding='utf-8')
print('wrote', out, len(page) // 1024, 'KB', 'caps', CAPS)
