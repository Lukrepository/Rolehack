// Written for Rolehack by Lucas Ruiz, 2026-10-07.
//
// The input switch's tests (input.js), on node's own test runner:
//
//   node --test win/web/test/
//
// What the page leans on (the design's section 12, with Lucas's answers of
// 2026-10-07):
//  1. a page starts in the mode this browser remembers, else the thumb banks
//     where touch is possible, else the desk; the Controls setting overrides it;
//  2. a touch or a pen asks for the thumb banks at once, and while the desk
//     shows the touch is consumed; on the thumb banks a mouse window fell back
//     to, it is not;
//  3. two mouse presses or the wheel, within 10 s and with no touch for 5 s,
//     ask for the desk, never within 3 s of a switch;
//  4. typed keys never move the board where touch is possible: three in 10 s
//     with no touch for 5 s turn on the key letters; where no touch is
//     possible they ask for the desk;
//  5. the setting thumb banks or mouse and keyboard never asks for a switch.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startMode, freshInput, inputStep, inputSwitched, controlsOf, pointerFor,
  CLICKS, KEYS, WINDOW_MS, NO_TOUCH_MS, LOCKOUT_MS,
  keyCodeOf, isPrefix, prefixChar, prefixEntry, PREFIX, PLACE_KEYS, placeOfKey } from '../input.js';

const touch = (t) => ({ kind: 'pointer', type: 'touch', t });
const pen = (t) => ({ kind: 'pointer', type: 'pen', t });
const mouse = (t) => ({ kind: 'pointer', type: 'mouse', t });
const wheel = (t) => ({ kind: 'wheel', t });
const key = (t) => ({ kind: 'key', t });

// a run of events through the switch; a switch it asks for is applied at once
function run(mode, events, ctx = {}) {
  let s = freshInput(mode);
  const asks = [];
  for (const ev of events) {
    const r = inputStep(s, ev, ctx);
    s = r.state;
    if (r.ask) { asks.push({ ask: r.ask, t: ev.t, consume: r.consume }); s = inputSwitched(s, r.ask, ev.t); }
    if (r.legends) asks.push({ legends: true, t: ev.t });
  }
  return { s, asks };
}

test('the mode a page starts in', () => {
  assert.equal(startMode({ canTouch: true }), 'thumb');
  assert.equal(startMode({ canTouch: false }), 'desk');
  // the remembered mode wins under automatic
  assert.equal(startMode({ canTouch: true, remembered: 'desk' }), 'desk');
  assert.equal(startMode({ canTouch: false, remembered: 'thumb' }), 'thumb');
  // nonsense remembered is no memory
  assert.equal(startMode({ canTouch: true, remembered: 'banana' }), 'thumb');
  // the setting overrides both
  assert.equal(startMode({ setting: 'thumb', canTouch: false, remembered: 'desk' }), 'thumb');
  assert.equal(startMode({ setting: 'desk', canTouch: true, remembered: 'thumb' }), 'desk');
  assert.equal(controlsOf('docked'), 'auto');
  assert.equal(pointerFor('desk'), 'mouse');
  assert.equal(pointerFor('thumb'), 'touch');
});

test('a touch or a pen asks for the thumb banks at once, consumed only while the desk shows', () => {
  for (const ev of [touch, pen]) {
    const s = freshInput('desk');
    const shown = inputStep(s, ev(1000), { deskShown: true });
    assert.equal(shown.ask, 'thumb');
    assert.equal(shown.consume, true);
    // a mouse window too short for the dock shows the thumb banks: the touch acts there
    const fell = inputStep(s, ev(1000), { deskShown: false });
    assert.equal(fell.ask, 'thumb');
    assert.equal(fell.consume, false);
  }
  // the lockout never holds a touch back: just after a switch to the desk
  const s = inputSwitched(freshInput('thumb'), 'desk', 1000);
  assert.equal(inputStep(s, touch(1001), { deskShown: true }).ask, 'thumb');
  // a touch on the thumb banks asks for nothing
  const r = inputStep(freshInput('thumb'), touch(1000), {});
  assert.equal(r.ask, null);
  assert.equal(r.consume, false);
});

test('two mouse presses or the wheel ask for the desk, with no touch for 5 s and not within 3 s of a switch', () => {
  // one press is not enough; two within 10 s are
  assert.deepEqual(run('thumb', [mouse(20000)]).asks, []);
  assert.deepEqual(run('thumb', [mouse(20000), mouse(21000)]).asks.map((a) => a.ask), ['desk']);
  // two presses 10 s or more apart are not
  assert.deepEqual(run('thumb', [mouse(20000), mouse(20000 + WINDOW_MS)]).asks, []);
  // the wheel alone asks
  assert.deepEqual(run('thumb', [wheel(20000)]).asks.map((a) => a.ask), ['desk']);
  // a touch 4.9 s before: no; 5 s before: yes
  assert.deepEqual(run('thumb', [touch(20000), mouse(24000), mouse(24900)]).asks, []);
  assert.deepEqual(run('thumb', [touch(20000), mouse(24000), mouse(20000 + NO_TOUCH_MS)]).asks.map((a) => a.ask), ['desk']);
  assert.deepEqual(run('thumb', [touch(20000), wheel(20000 + NO_TOUCH_MS - 1)]).asks, []);
  // a touch clears the presses before it
  assert.deepEqual(run('thumb', [mouse(20000), touch(20500), mouse(26000)]).asks, []);
  // not within 3 s of a switch: a touch brings the thumb banks, and the mouse
  // that follows 1 s later... is already held back by the 5 s with no touch;
  // the lockout holds a switch made by the setting or the page
  const s = inputSwitched(freshInput('thumb'), 'thumb', 50000);
  const a = inputStep(inputStep(s, mouse(51000), {}).state, mouse(52000), {});
  assert.equal(a.ask, null);
  const b = inputStep(inputStep(s, mouse(51000), {}).state, mouse(50000 + LOCKOUT_MS), {});
  assert.equal(b.ask, 'desk');
  assert.equal(CLICKS, 2);
});

test('typed keys never move the board where touch is possible: they turn on the key letters', () => {
  const ctx = { canTouch: true };
  const k3 = [key(20000), key(21000), key(22000)];
  const r = run('thumb', k3, ctx);
  assert.deepEqual(r.asks, [{ legends: true, t: 22000 }]);
  assert.equal(r.s.mode, 'thumb');
  assert.equal(r.s.legends, true);
  // once on, they are not asked for again
  assert.deepEqual(run('thumb', [...k3, key(23000), key(24000)], ctx).asks.length, 1);
  // two keys are not enough, nor three spread over more than 10 s
  assert.deepEqual(run('thumb', [key(20000), key(21000)], ctx).asks, []);
  assert.deepEqual(run('thumb', [key(20000), key(25000), key(20000 + WINDOW_MS)], ctx).asks, []);
  // a touch within the last 5 s holds them back (Lucas types while he touches)
  assert.deepEqual(run('thumb', [touch(20000), ...k3.map((e) => ({ ...e, t: e.t + 1000 }))], ctx).asks, []);
  assert.equal(KEYS, 3);
});

test('where no touch is possible, three keys ask for the desk', () => {
  const r = run('thumb', [key(20000), key(21000), key(22000)], { canTouch: false });
  assert.deepEqual(r.asks.map((a) => a.ask), ['desk']);
  assert.equal(r.s.mode, 'desk');
  // at the desk keys ask for nothing
  assert.deepEqual(run('desk', [key(20000), key(21000), key(22000)], { canTouch: false }).asks, []);
});

test('the setting thumb banks or mouse and keyboard never asks for a switch', () => {
  for (const setting of ['thumb', 'desk']) {
    const mode = setting;
    const r = run(mode, [mouse(20000), mouse(21000), wheel(22000), touch(30000), pen(40000), key(50000), key(50001), key(50002)], { setting, canTouch: false, deskShown: mode === 'desk' });
    assert.deepEqual(r.asks.filter((a) => a.ask), [], setting);
  }
  // with thumb banks set, keys still bring the key letters
  const t = run('thumb', [key(20000), key(21000), key(22000)], { setting: 'thumb', canTouch: false });
  assert.deepEqual(t.asks, [{ legends: true, t: 22000 }]);
});

test('a mixed hand: the board follows the input in use, and never flips under a single stray press', () => {
  // Lucas's laptop: touch, then the touchpad, then touch again
  const evs = [touch(1000), touch(2000), mouse(8000), mouse(8500), touch(9000), mouse(9500), mouse(9800), touch(20000)];
  const r = run('thumb', evs, { canTouch: true, deskShown: true });
  assert.deepEqual(r.asks.map((a) => `${a.ask}@${a.t}`), ['desk@8500', 'thumb@9000']);
  assert.equal(r.s.mode, 'thumb');
  // the touch at 9000 was consumed: the desk showed
  assert.equal(r.asks[1].consume, true);
});

test('never throws, whatever it is given', () => {
  for (const s of [null, undefined, {}, freshInput('nonsense'), { mode: 'desk', clicks: null }]) {
    for (const ev of [null, {}, { kind: 'pointer' }, { kind: 'key', t: NaN }, { kind: 'wheel', t: 'x' }, mouse(1), touch(Infinity)]) {
      assert.doesNotThrow(() => inputStep(s, ev, null === ev ? undefined : {}));
    }
  }
  assert.doesNotThrow(() => inputSwitched(null, 'desk', 'x'));
  assert.equal(inputSwitched(freshInput('thumb'), 'docked', 5).mode, 'thumb');
});

// a keydown as the browser gives it
const kd = (key, o = {}) => ({ key, code: o.code || '', ctrlKey: !!o.ctrl, altKey: !!o.alt, shiftKey: !!o.shift, metaKey: !!o.meta,
  getModifierState: (m) => m === 'AltGraph' && !!o.altGraph });

test('keys to the game: as before, and the Mac and AltGr fixed', () => {
  // as the page always sent them
  assert.equal(keyCodeOf(kd('s')), 115);
  assert.equal(keyCodeOf(kd('S', { shift: true })), 83);
  assert.equal(keyCodeOf(kd('ArrowLeft')), 104);
  assert.equal(keyCodeOf(kd('ArrowLeft', { shift: true })), 72);
  assert.equal(keyCodeOf(kd('Enter')), 13);
  assert.equal(keyCodeOf(kd('Escape')), 27);
  assert.equal(keyCodeOf(kd('d', { ctrl: true, code: 'KeyD' })), 4);          // ^D, kick
  assert.equal(keyCodeOf(kd('o', { alt: true, code: 'KeyO' })), 0xef);        // M-o, offer
  assert.equal(keyCodeOf(kd(';', { ctrl: true, code: 'Semicolon' })), 59);    // Ctrl+; with no prefix taken: ;
  assert.equal(keyCodeOf(kd('F5')), null);
  assert.equal(keyCodeOf(kd('Control')), null);
  assert.equal(keyCodeOf(kd('Dead')), null);
  // a Mac: Cmd is the browser's; Option types the M- command by the key's place
  assert.equal(keyCodeOf(kd('r', { meta: true, code: 'KeyR' }), true), null);
  assert.equal(keyCodeOf(kd('r', { meta: true, code: 'KeyR' }), false), 114);   // elsewhere Meta is nothing special, as before
  assert.equal(keyCodeOf(kd('ø', { alt: true, code: 'KeyO' }), true), 0xef);    // Option+o: M-o
  assert.equal(keyCodeOf(kd('π', { alt: true, code: 'KeyP' }), true), 0xf0);    // Option+p: M-p, pray
  assert.equal(keyCodeOf(kd('Dead', { alt: true, code: 'KeyE' }), true), 0xe5);  // Option+e: M-e
  assert.equal(keyCodeOf(kd('[', { alt: true, code: 'Digit5' }), true), 91);     // a German Mac's [ is Option+5: [
  // AltGr: the character typed (a German keyboard's \ [ ] { } | ~ @)
  for (const ch of ['\\', '[', ']', '{', '}', '|', '~', '@']) {
    assert.equal(keyCodeOf(kd(ch, { ctrl: true, alt: true, altGraph: true })), ch.charCodeAt(0), ch);
    assert.equal(keyCodeOf(kd(ch, { ctrl: true, alt: true })), ch.charCodeAt(0), `${ch} without the AltGraph state`);
  }
  assert.equal(keyCodeOf(kd('€', { ctrl: true, alt: true, altGraph: true })), 8364);
  // Ctrl and Alt and a letter stays the M- command
  assert.equal(keyCodeOf(kd('a', { ctrl: true, alt: true, code: 'KeyA' })), 0xe1);
  assert.equal(keyCodeOf(null), null);
  assert.equal(keyCodeOf({}), null);
});

test('the prefix: Ctrl and the key right of L by its place, then a key read as typed', () => {
  assert.equal(isPrefix(kd(';', { ctrl: true, code: 'Semicolon' })), true);
  assert.equal(isPrefix(kd('ö', { ctrl: true, code: 'Semicolon' })), true);      // German
  assert.equal(isPrefix(kd('m', { ctrl: true, code: 'Semicolon' })), true);      // French AZERTY
  assert.equal(isPrefix(kd(';', { code: 'Semicolon' })), false);                 // ; alone is farlook
  assert.equal(isPrefix(kd(';', { ctrl: true, alt: true, code: 'Semicolon' })), false);
  assert.equal(isPrefix(kd('$', { ctrl: true, alt: true, altGraph: true, code: 'Semicolon' })), false);
  assert.equal(isPrefix(kd(';', { ctrl: true, meta: true, code: 'Semicolon' })), false);
  // another place by the setting; a bad setting is the default
  assert.equal(isPrefix(kd("'", { ctrl: true, code: 'Quote' }), 'Quote'), true);
  assert.equal(isPrefix(kd(';', { ctrl: true, code: 'Semicolon' }), 'Quote'), false);
  assert.equal(isPrefix(kd(';', { ctrl: true, code: 'Semicolon' }), 'Nonsense'), true);
  // the key after it: as typed, Ctrl held or not; by its place in another script
  assert.equal(prefixChar(kd('f', { ctrl: true, code: 'KeyF' })), 'f');
  assert.equal(prefixChar(kd('F', { shift: true, code: 'KeyF' })), 'F');
  assert.equal(prefixChar(kd('а', { code: 'KeyF' })), 'f');                       // Cyrillic а on the F key
  assert.equal(prefixChar(kd('1', { ctrl: true, code: 'Digit1' })), '1');
  assert.equal(prefixChar(kd('Shift', { shift: true, code: 'ShiftLeft' })), null);
  assert.equal(prefixEntry('o').act, 'world');
  assert.equal(prefixEntry('x').act, 'count');
  assert.equal(prefixEntry('F').hub, 'fight');
  assert.equal(prefixEntry('w'), null);    // a tab cannot stop Ctrl+W
  assert.equal(prefixEntry('n'), null);    // nor Ctrl+N
  // every letter once
  assert.equal(new Set(PREFIX.map((p) => p.ch)).size, PREFIX.length);
  assert.deepEqual(PLACE_KEYS.map(placeOfKey), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(placeOfKey('q'), null);
});

test('input.js stays a plain module: no imports, no DOM, no clock', async () => {
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../input.js', import.meta.url), 'utf8');
  const code = src.replace(/\/\/.*$/gm, '');
  assert.equal(/\bimport\b/.test(code), false);
  assert.equal(/\b(window|document|navigator|localStorage|Date\.now|performance)\b/.test(code), false);
});
