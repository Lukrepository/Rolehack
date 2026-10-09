import json, sys, importlib.util, pathlib
HERE = pathlib.Path('.').resolve()
spec = importlib.util.spec_from_file_location('tp', HERE / 'cvd_tilepal.py')
tp = importlib.util.module_from_spec(spec); sys.argv = ['x']; spec.loader.exec_module(tp)
out = {}
for cap in ('9', '12', '15'):
    d = json.load(open(f'cvd-tilepal-{cap}.json'))
    out[cap] = {}
    for mode, vis in tp.MODES.items():
        pal = {k: tp.cvd.hexrgb(v) for k, v in d['modes'][mode]['palette'].items()}
        left = []
        for a, b, h, s in tp.SAME:
            n = tp.pair_de(pal, h, 'normal')
            dd = min(tp.pair_de(pal, h, v) for v in vis)
            if n >= 6 and dd < 0.4 * n:
                left.append(f'{a} / {b}')
        out[cap][mode] = left
        print(cap, mode, len(left), left if mode != 'mono' else left[:6])
json.dump(out, open('cvd-tilepal-left.json', 'w'), indent=1)
