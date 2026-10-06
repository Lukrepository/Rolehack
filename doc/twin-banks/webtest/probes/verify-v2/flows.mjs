// Paper play-test: gestures, thumb switches and reach per task, current build vs final.
import fs from 'fs';
const SP = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad';
const base = JSON.parse(fs.readFileSync(`${SP}/design/harness/baseline.json`)).screens;
const fin = JSON.parse(fs.readFileSync(`${SP}/design/v2/spec.json`)).screens;
const MM = 0.15875;
function ctl(sc, id) { const c = sc.controls.find((c) => c.id === id); if (!c) throw new Error(id); return c; }
function reach(sc, c) {
  const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
  const inn = c.thumb === 'L' ? cx : sc.W - cx, up = sc.H - cy;
  return { mm: Math.hypot(inn, up) * MM, bear: Math.atan2(up, inn) * 180 / Math.PI, cx, cy };
}
// a step: [id, how] ; id 'MAP', 'MODAL', 'POPUP:<label>' for non-bank targets; layer places use pad ids
const FLOWS = {
  'walk 1 step': { cur: [['pad_k', 'tap']], fin: [['pad_k', 'tap']] },
  'melee: force-fight F + dir': { cur: [['combat', 'tap'], ['pad_l', 'tap']], fin: [['combat', 'tap'], ['pad_l', 'tap']] },
  'fire (default pins)': { cur: [['combat', 'hold'], ['pad_y', 'tap Fire'], ['pad_l', 'tap dir']], fin: [['pin2', 'tap Fire'], ['pad_l', 'tap dir']] },
  'fire (Fire pinned on PIN 2)': { cur: [['pin2', 'tap'], ['pad_l', 'tap dir']], fin: [['pin2', 'tap'], ['pad_l', 'tap dir']] },
  'throw': { cur: [['combat', 'hold'], ['pad_k', 'tap Throw'], ['MODAL', 'item'], ['pad_l', 'dir']], fin: [['combat', 'hold'], ['pad_k', 'tap Throw'], ['MODAL', 'item'], ['pad_l', 'dir']] },
  'kick (FLICK up)': { cur: [['flick', 'flick up'], ['pad_l', 'dir']], fin: [['flick', 'flick up'], ['pad_l', 'dir']] },
  'search loop: set x20 once': { cur: [['search', 'hold'], ['POPUP:chips_search', 'tap x20']], fin: [['search', 'hold'], ['pad_l', 'tap x20 (count layer)']] },
  'search loop: each 20 turns': { cur: [['search', 'tap']], fin: [['search', 'tap']] },
  'eat (from pack)': { cur: [['eat', 'tap'], ['MODAL', 'item']], fin: [['eat', 'tap'], ['MODAL', 'item']] },
  'eat (corpse here)': { cur: [['eat', 'tap'], ['pad_y', 'y']], fin: [['eat', 'tap'], ['pad_y', 'y']] },
  'quaff unknown': { cur: [['eat', 'hold'], ['pad_k', 'Quaff'], ['MODAL', 'item']], fin: [['eat', 'hold'], ['pad_k', 'Quaff'], ['MODAL', 'item']] },
  'read unknown': { cur: [['eat', 'hold'], ['pad_u', 'Read'], ['MODAL', 'item']], fin: [['eat', 'hold'], ['pad_u', 'Read'], ['MODAL', 'item']] },
  'check inventory': { cur: [['inventory', 'tap'], ['MODAL', 'close']], fin: [['inventory', 'tap'], ['MODAL', 'close']] },
  'wear armour': { cur: [['eq_wear', 'tap'], ['MODAL', 'item']], fin: [['eq_wear', 'tap'], ['MODAL', 'item']] },
  'engrave-test a wand': { cur: [['apply', 'hold'], ['pad_k', 'Engrave'], ['MODAL', 'wand'], ['MAP', '--More--'], ['pad_n', 'n: no add'], ['MODAL', 'type x + Enter']],
                           fin: [['apply', 'hold'], ['pad_k', 'Engrave'], ['MODAL', 'wand'], ['MAP', '--More--'], ['pad_n', 'n: no add'], ['MODAL', 'type x + Enter']] },
  'pray at low HP': { cur: [['sacrifice', 'hold 380 ms'], ['pad_y', 'y']], fin: [['sacrifice', 'hold 800 ms'], ['pad_y', 'y']] },
  'descend (on >)': { cur: [['context', 'tap']], fin: [['context', 'tap']] },
  'context, several apply': { cur: [['context', 'tap'], ['POPUP:cand_1', 'pick']], fin: [['context', 'tap'], ['pad_j', 'pick (HERE layer)']] },
  'open WORLD drawer': { cur: [['world', 'tap'], ['DRAWER', 'item']], fin: [['world', 'tap'], ['DRAWER', 'item']] },
  'messages history': { cur: [['msgs', 'tap']], fin: [['msgs', 'tap']] },
  'farlook a far monster': { cur: [['look', 'hold'], ['MAP', 'monster']], fin: [['look', 'hold'], ['MAP', 'monster']] },
};
function popup(sc, label) { const alts = label === 'chips_search' ? ['chips_search', 'chips_strip2'] : [label]; return sc.popups.find((p) => alts.some((a) => p.label.startsWith(a))); }
function run(name, sc, steps) {
  let sw = 0, last = null, out = [], maxmm = 0;
  for (const [id, how] of steps) {
    if (id === 'MODAL' || id === 'MAP' || id === 'DRAWER') { out.push(`${id}(${how})`); continue; }
    let c, th;
    if (id.startsWith('POPUP:')) { const p = popup(sc, id.slice(6)); const owner = ctl(sc, p.owner); th = owner.thumb; c = { ...p, thumb: th }; }
    else { c = ctl(sc, id); th = c.thumb; }
    const r = reach(sc, c);
    maxmm = Math.max(maxmm, r.mm);
    if (last && last !== th) sw++;
    last = th;
    out.push(`${id}[${th} ${r.mm.toFixed(1)}mm@${r.bear.toFixed(0)}°](${how})`);
  }
  return { sw, n: steps.length, maxmm, out: out.join(' > ') };
}
const pairs = [['896x443', '896x443'], ['443x939', '443x939'], ['640x360', '640x360'], ['360x640', '360x640']];
for (const [name, f] of Object.entries(FLOWS)) {
  console.log(`\n## ${name}`);
  for (const [b, n] of pairs) {
    const A = run(name, base[b], f.cur), B = run(name, fin[n], f.fin);
    console.log(`  ${b} cur : ${A.n} gestures, ${A.sw} bank-thumb switches, max ${A.maxmm.toFixed(1)} mm | ${A.out}`);
    console.log(`  ${n} new : ${B.n} gestures, ${B.sw} bank-thumb switches, max ${B.maxmm.toFixed(1)} mm | ${B.out}`);
  }
}
