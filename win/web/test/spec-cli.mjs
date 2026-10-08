// Written for Rolehack by Lucas Ruiz, 2026-10-08.
//
// The golden screens' fixtures (fixtures/spec.json and spec-*.json), and the
// command that rewrites them from the page's own rule when the design changes
// the rule on purpose:
//
//   node win/web/test/spec-cli.mjs
//
// The design's layout-cli.mjs, which first wrote them, stayed in the design's
// working session (README.md, "Refreshing them"); this is its stand-in, with
// the same screens, pairs and variants, which layout.test.mjs imports from
// here so they are written down once.  It is for a decided change recorded in
// DESIGN.md's CHANGES, never to make a failing test pass: the diff it leaves
// in git is the change's effect on every screen, and is read before it is
// committed.  Numbers are rounded to 0.01 dp as the design's were.  The edge
// windows (fixtures/edge.json) have their own tool, edge-cli.mjs.
//
// Under node 20, "node --test win/web/test/" loads every module in this
// directory as a test file, this one too; the test runner marks its children
// with NODE_TEST_CONTEXT, and then this file only exports.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { layout } from '../layout.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');

// How the design's layout-cli.mjs makes each fixture: the screens of a pair
// are laid out with the pair's remembered budget (portrait width, landscape
// height and width), as the page does once the device has been seen both
// ways (section 12); each variant is the rule under one changed setting.
export const PAIRS = [['896x443', '443x939'], ['640x360', '360x640'], ['915x412', '412x915'], ['844x390', '390x844'], ['1024x768', '768x1024']];
export const VARIANTS = {
  'spec.json': {},
  'spec-combat-left.json': { combatThumb: 'L' },
  'spec-left-handed.json': { hand: 'left' },
  'spec-text-cells.json': { cellAspect: 0.5625 },
  'spec-pad46.json': { padKey: 46 },
  'spec-pad52.json': { padKey: 52 },
  'spec-cell-rows.json': { mapCell: 'rows' },
};
export const SCREENS = ['896x443', '443x939', '640x360', '360x640', '915x412', '412x915', '844x390', '390x844',
  '1024x768', '768x1024', '1180x820', '1366x768', '1280x800', '1920x1080', '2560x1440'];

export function screenSettings(W, H, settings) {
  const key = `${W}x${H}`, pr = PAIRS.find(([l, p]) => l === key || p === key);
  if (!pr) return settings;
  const [lw, lh] = pr[0].split('x').map(Number), [pw] = pr[1].split('x').map(Number);
  return { ...settings, budget: { w: pw, h: lh, l: lw } };
}

// every number rounded to 0.01, as the design's fixtures are
function round(v) {
  if (typeof v === 'number') return Math.round(v * 100) / 100;
  if (Array.isArray(v)) return v.map(round);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, round(x)]));
  return v;
}

async function main() {
  for (const [file, settings] of Object.entries(VARIANTS)) {
    const p = path.join(FIXTURES, file);
    const fx = JSON.parse(fs.readFileSync(p, 'utf8'));
    const screens = {};
    for (const key of SCREENS) {
      const [W, H] = key.split('x').map(Number);
      const pointer = (fx.screens[key] && fx.screens[key].pointer) || 'touch';
      const r = layout(W, H, pointer, screenSettings(W, H, settings));
      if (!r.spec || !r.usable) { console.error(`${file} ${key}: ${r.usable ? 'no spec' : 'unusable'} (${r.reason}); nothing written`); return 1; }
      screens[key] = round(r.spec);
    }
    fs.writeFileSync(p, JSON.stringify({ ...fx, screens }, null, 1) + '\n');
    console.log(`wrote ${path.relative(process.cwd(), p)} (${SCREENS.length} screens)`);
  }
  return 0;
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct && !process.env.NODE_TEST_CONTEXT) process.exitCode = await main();
