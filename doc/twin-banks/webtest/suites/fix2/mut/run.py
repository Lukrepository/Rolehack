import subprocess, shutil, os, re, sys
SRC = '/home/user/Rolehack/win/web'
M = os.path.dirname(os.path.abspath(__file__))
orig = open(f'{SRC}/layout.js').read()
muts = {
  'skip the 52 step': ("const steps = want > PAD_FLOOR ? [want, ...PAD_STEPS.filter((k) => k < want && k >= PAD_FLOOR)] : [want];",
                       "const steps = want > PAD_FLOOR ? [want, ...PAD_STEPS.filter((k) => k < want && k >= PAD_FLOOR)].slice(0,1).concat([46]) : [want];"),
  'pad step 52->54': ("export const PAD_STEPS = [58, 52, 46];", "export const PAD_STEPS = [58, 54, 46];"),
  'KR_LAST 40->42': ("KR_LAST = 40;", "KR_LAST = 42;"),
  'lastResort margin +3': ("const M = { mode: 'thumb', k, kR: k, m: Math.max(M_MIN, cut),", "const M = { mode: 'thumb', k, kR: k, m: Math.max(M_MIN, cut) + 3,"),
  'ring 20->32': ("  ring: 20,", "  ring: 32,"),
  'no confirm ring': ("function ringRects(map, P, st) {\n  const out = [];", "function ringRects(map, P, st) {\n  const out = [];\n  return out;"),
  'halo 24 in decor': ("w: B.bw + 2 * st.halo, h: B.bh + 2 * st.halo }", "w: B.bw + 4 * st.halo, h: B.bh + 4 * st.halo }"),
  'narrow kicks in at 44 not 40 (KR floor in narrow)': ("const w = widthFit(Sw, kf, KR_LAST, cut);", "const w = widthFit(Sw, kf, KR_LAST + 1, cut);"),
  'unusable verdict skipped': ("  r.usable = !bad.length;", "  r.usable = true; bad.length = 0;"),
  'desk dock min 40->38': None,
}
res = {}
for name, m in muts.items():
    if m is None: continue
    old, new = m
    assert orig.count(old) == 1, name
    w = f'{M}/w'
    shutil.rmtree(w, ignore_errors=True)
    os.makedirs(w)
    shutil.copytree(f'{SRC}/test', f'{w}/test')
    open(f'{w}/layout.js', 'w').write(orig.replace(old, new))
    p = subprocess.run(['node', '--test', f'{w}/test/'], capture_output=True, text=True)
    out = p.stdout
    pas = re.search(r'^# pass (\d+)', out, re.M).group(1); fail = re.search(r'^# fail (\d+)', out, re.M).group(1)
    fails = sorted(set(re.findall(r'^\s*not ok \d+ - (.+)$', out, re.M)))
    res[name] = (pas, fail, fails[:8])
    print(f'{name:50s} pass {pas:>4} fail {fail:>4}  {"; ".join(fails[:6])}')
