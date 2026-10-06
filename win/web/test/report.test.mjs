// Written for Rolehack by Lucas Ruiz, 2026-10-06.
//
// The device report's tests (viewer.js deviceReport and browserFamily), on
// node's own test runner:
//
//   node --test win/web/test/
//
// What the page leans on:
//  1. the report is one line, its fields in one fixed order, so a line pasted
//     from a phone and one from a laptop compare field by field;
//  2. a fact the page could not get reads as "?", and the report never
//     throws, says "undefined", "NaN" or "null";
//  3. a window shown as classic says why, and reports classic's figures;
//  4. the browser and the system are named coarsely from Client Hints where
//     the browser gives them, else from the user agent, for the person
//     reading the line.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deviceReport, browserFamily } from '../viewer.js';

// Lucas's phone in landscape, installed, twin banks as the design gives them
const PHONE = {
  build: { short: '885b4be', date: '2026-10-06' },
  window: { w: 896, h: 443 }, screen: { w: 443, h: 939 }, dpr: 2.4375,
  browser: { name: 'Chrome', version: '141', os: 'Android' }, mode: 'standalone',
  touchPoints: 5, pointer: 'coarse', anyPointer: 'coarse', hover: false,
  textScale: 1, msgFont: 'atkinson', msgSize: 1, insets: { l: 0, r: 0, t: 0, b: 0 },
  layout: 'twin', shown: 'twin', fallback: null,
  tier: 'phone', padSetting: 58, pad: 58, rightColumns: 58, fitLevel: 'full', degraded: false, reason: null,
  cell: 13.41, cols: 34.02, rows: 21, whole: false, glass: 'between', headerOver: false,
  budgetUsed: 'seen', budget: { w: 443, h: 443, l: 896 },
  mapCell: 'columns', zoomFactor: 1, style: 'terminal', caseOn: true,
};

test('one line, the fields in one order', () => {
  const line = deviceReport(PHONE);
  assert.equal(line.includes('\n'), false);
  assert.equal(line,
    'Rolehack 885b4be (2026-10-06) · window 896×443 landscape · screen 443×939 · dpr 2.44 · Chrome 141 Android'
    + ' · installed · touch 5 · pointer coarse/coarse · hover no · text ×1 atkinson ×1 · insets 0/0/0/0'
    + ' · layout twin · tier phone · keys 58 dp · cell 13.4 dp · map 34×21 pans · glass between'
    + ' · budget seen w443 h443 l896 · fit full · map cell columns · zoom ×1 · terminal, case');
});

test('a squeezed small phone says what gave way', () => {
  const line = deviceReport({ ...PHONE, window: { w: 640, h: 360 }, padSetting: 58, pad: 58, rightColumns: 44.7,
    fitLevel: 'full', reason: '2 message row(s): the window is too small for more', cols: 23.3, rows: 19.9, cell: 12 });
  assert.match(line, / · keys 58 dp, right 44\.7 · cell 12 dp · map 23\.3×19\.9 pans · /);
  assert.match(line, / · fit full: 2 message row\(s\): the window is too small for more · /);
  const stepped = deviceReport({ ...PHONE, padSetting: 58, pad: 46, rightColumns: 46, fitLevel: 'stepped' });
  assert.match(stepped, / · keys 58 set, 46 drawn dp · /);
});

test('a window shown as classic says why, and reports classic', () => {
  const line = deviceReport({ ...PHONE, window: { w: 443, h: 460 }, shown: 'classic',
    fallback: 'a 443x460 window is too small for twin banks and a map', tier: null,
    pad: 40.6, scale: 0.7, cell: 12, zoom: 0 });
  assert.match(line, / · layout twin, shown as classic: a 443x460 window is too small for twin banks and a map · /);
  assert.match(line, / · keys 40\.6 dp · tile 12 px · scale ×0\.7 · zoom fit · terminal, case$/);
  assert.equal(line.includes('tier'), false);
  const chosen = deviceReport({ ...PHONE, layout: 'classic', shown: 'classic', tier: null, pad: 58, scale: 1, cell: 17, zoom: 17 });
  assert.match(chosen, / · layout classic · keys 58 dp · tile 17 px · scale ×1 · zoom 17 px · /);
});

test('missing facts read as ? and never throw', () => {
  for (const f of [undefined, null, {}, { window: { w: 'x' }, browser: {}, insets: null, budget: {} }]) {
    const line = deviceReport(f);
    assert.match(line, /^Rolehack \? · window \? · screen \? · dpr \? · browser · \? · touch \? · pointer \?\/\? · hover \? /);
    // a tab, the installed app or fullscreen read as words
    assert.match(deviceReport({ mode: 'browser' }), / · browser · in a tab · /);
    assert.match(deviceReport({ mode: 'fullscreen' }), / · browser · fullscreen · /);
    assert.doesNotMatch(line, /undefined|NaN|null/);
    assert.equal(line.includes('\n'), false);
  }
  // a reason too long for a chat line is cut
  const long = deviceReport({ ...PHONE, reason: 'x'.repeat(300) });
  assert.ok(long.length < 600);
  assert.match(long, /x{139}…/);
});

test('the browser and the system, coarsely', () => {
  const ua = (s) => browserFamily(s);
  assert.deepEqual(ua('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'),
    { name: 'Chrome', version: '141', os: 'Android' });
  assert.deepEqual(ua('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/143.0 Mobile/15E148 Safari/605.1.15'),
    { name: 'Firefox', version: '143', os: 'iOS' });
  assert.deepEqual(ua('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'),
    { name: 'Safari', version: '17', os: 'iOS' });
  assert.deepEqual(ua('Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36'),
    { name: 'Samsung Internet', version: '25', os: 'Android' });
  assert.deepEqual(ua('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'),
    { name: 'Edge', version: '140', os: 'Windows' });
  assert.deepEqual(ua('Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0'),
    { name: 'Firefox', version: '143', os: 'Linux' });
  // an iPad asking for desktop pages says it is a Mac; the touch count in the report tells
  assert.deepEqual(ua('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'),
    { name: 'Safari', version: '17', os: 'macOS' });
  // Client Hints win over the string
  assert.deepEqual(browserFamily('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    { brands: [{ brand: 'Not;A=Brand', version: '99' }, { brand: 'Chromium', version: '141' }, { brand: 'Google Chrome', version: '141.0.7390.54' }], platform: 'Windows' }),
    { name: 'Chrome', version: '141', os: 'Windows' });
  assert.deepEqual(browserFamily('', null), { name: '', version: '', os: '' });
  assert.deepEqual(browserFamily(undefined, { brands: 'no', platform: 'Android' }), { name: '', version: '', os: 'Android' });
});
