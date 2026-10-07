// Written for Rolehack by Lucas Ruiz, 2026-10-07.
//
// The input switch (the design's section 12, with Lucas's answers of
// 2026-10-07; DESIGN.md, CHANGES, "Desktop mode is built"): which board the
// page shows, the thumb banks in the screen's bottom corners or the desk's
// dock under the map, from the input actually in use -- never from what the
// browser says the device is.  Lucas's laptop has a touchscreen, a touchpad,
// a mouse and a keyboard, and Chromium calls its pointer coarse with no hover
// while he clicks with the touchpad; an iPad with a keyboard case is a Mac to
// its user agent.  Only the events themselves tell: a finger's or a pen's
// pointerdown, a mouse's (a touchpad's too), a wheel, a key typed to the game.
//
//  - A touch or a pen asks for the thumb banks.  While the desk shows, that
//    touch does nothing else: it is consumed, so a thumb reaching where a
//    thumb key used to be never presses a small desk key, walks the hero on
//    the map or opens a panel, and the thumb banks come at its lift, at once
//    (Lucas's answer 3b; the design had the touch act on the desk).
//  - Two mouse presses, or the wheel, within 10 s, with no touch for 5 s, ask
//    for the desk -- not within 3 s of the last switch, so a mixed hand does
//    not flip the board back and forth.
//  - Typed keys never move the board where touch is possible (Lucas's answer
//    3a): three game keys in 10 s with no touch for 5 s only turn on the key
//    letters on the thumb banks.  Where no touch is possible the page starts
//    at the desk anyway, and three keys ask for it there.
//  - The setting "Controls: automatic / thumb banks / mouse and keyboard"
//    overrides the switch; automatic starts from the mode remembered in this
//    browser, else the thumb banks where touch is possible, else the desk.
//
// A plain module like layout.js and viewer.js: no DOM, no storage, no clock
// of its own.  overlay.js feeds it the events, each with its time, from
// capture-phase listeners on the window (trusted events only: the guard
// re-dispatches a touch to the key it snaps to), applies what it asks for
// when the page is quiet, and stores the mode; node tests it
// (test/input.test.mjs).

export const CLICKS = 2;             // mouse presses within WINDOW_MS that ask for the desk
export const KEYS = 3;               // game keys within WINDOW_MS that ask for the desk, or the key letters
export const WINDOW_MS = 10000;
export const NO_TOUCH_MS = 5000;     // no touch for this long before the mouse or keys may ask
export const LOCKOUT_MS = 3000;      // no switch to the desk this soon after a switch

const MODES = ['thumb', 'desk'];
export const SETTINGS = ['auto', 'thumb', 'desk'];

// The setting as stored, made safe.
export function controlsOf(v) { return SETTINGS.includes(v) ? v : 'auto'; }

// The mode a page starts in.
export function startMode({ setting = 'auto', remembered = null, canTouch = false } = {}) {
  const s = controlsOf(setting);
  if (s !== 'auto') return s;
  if (MODES.includes(remembered)) return remembered;
  return canTouch ? 'thumb' : 'desk';
}

export function freshInput(mode = 'thumb') {
  return { mode: MODES.includes(mode) ? mode : 'thumb', legends: false, clicks: [], keys: [], lastTouch: -Infinity, lastSwitch: -Infinity };
}

const recent = (list, t) => list.filter((x) => t - x < WINDOW_MS && x <= t);

// One event.  ev: { kind: 'pointer' | 'wheel' | 'key', type: the pointerType
// ('touch' | 'pen' | 'mouse' | ''), t: its time in ms }.  ctx: { setting,
// canTouch, deskShown: the desk is what the page shows now }.  Returns the
// new state and what it asks: ask, a mode to switch to (null: none);
// consume, true when this touch is to do nothing else; legends, true when
// the key letters are to come on.  A touch's switch is asked at once (the
// page applies it at the lift); the desk's waits for a quiet moment.
export function inputStep(state, ev, ctx = {}) {
  const s = { ...(state || freshInput()), clicks: [...((state && state.clicks) || [])], keys: [...((state && state.keys) || [])] };
  const t = Number(ev && ev.t);
  const out = { state: s, ask: null, consume: false, legends: false };
  if (!ev || !Number.isFinite(t)) return out;
  const setting = controlsOf(ctx.setting);
  const auto = setting === 'auto';
  const quietTouch = t - s.lastTouch >= NO_TOUCH_MS;
  const unlocked = t - s.lastSwitch >= LOCKOUT_MS;
  if (ev.kind === 'pointer' && (ev.type === 'touch' || ev.type === 'pen')) {
    s.lastTouch = t;
    s.clicks = [];
    s.keys = [];
    if (auto && s.mode === 'desk') {
      out.ask = 'thumb';
      // only the desk's dock is guarded: the thumb banks a mouse window fell
      // back to are a thumb's ground already
      out.consume = !!ctx.deskShown;
    }
    return out;
  }
  if (ev.kind === 'pointer' && ev.type === 'mouse') {
    s.clicks = recent(s.clicks, t);
    s.clicks.push(t);
    if (auto && s.mode === 'thumb' && quietTouch && unlocked && s.clicks.length >= CLICKS) out.ask = 'desk';
    return out;
  }
  if (ev.kind === 'wheel') {
    if (auto && s.mode === 'thumb' && quietTouch && unlocked) out.ask = 'desk';
    return out;
  }
  if (ev.kind === 'key') {
    s.keys = recent(s.keys, t);
    s.keys.push(t);
    if (s.keys.length < KEYS || !quietTouch) return out;
    if (ctx.canTouch || s.mode === 'desk' || !auto) {
      if (!s.legends && s.mode === 'thumb') { s.legends = true; out.legends = true; }
      return out;
    }
    if (unlocked) out.ask = 'desk';
    return out;
  }
  return out;
}

// The page switched: the new mode, the time, and the counts begun afresh.
export function inputSwitched(state, mode, t) {
  const s = { ...(state || freshInput()) };
  if (!MODES.includes(mode)) return s;
  s.mode = mode;
  s.lastSwitch = Number.isFinite(Number(t)) ? Number(t) : s.lastSwitch;
  s.clicks = [];
  s.keys = [];
  return s;
}

// The pointer layout() is asked for in a mode.
export const pointerFor = (mode) => (mode === 'desk' ? 'mouse' : 'touch');

// ---------------------------------------------------------------------------
// Keys (desktop mode's step 2).  What a keydown is to the game, and Rolehack's
// own keys behind a prefix (the design's section 12).
// ---------------------------------------------------------------------------

// The arrows and the keys beside them walk, as vi-keys; Shift runs.
export const ARROWS = { ArrowLeft: 'h', ArrowRight: 'l', ArrowUp: 'k', ArrowDown: 'j',
  Home: 'y', PageUp: 'u', End: 'b', PageDown: 'n' };

// A letter or digit by the key's place, for a key whose character is not
// the plain one: a Mac's Option, a Cyrillic or Greek layout.
function placeChar(e) {
  const code = String((e && e.code) || '');
  const k = /^Key([A-Z])$/.exec(code);
  if (k) return e.shiftKey ? k[1] : k[1].toLowerCase();
  const d = /^Digit([0-9])$/.exec(code);
  return d ? d[1] : null;
}
const altGraph = (e) => !!(e && typeof e.getModifierState === 'function' && e.getModifierState('AltGraph'));

// The code a keydown sends the game, or null for a key the page leaves to the
// browser.  mac: the page runs on a Mac (its Cmd and Option keys).
//  - Cmd on a Mac is the browser's: Cmd+R reloads, as it should (it reached
//    the game as r, read, and the page kept the browser from reloading).
//  - Ctrl and a letter is the control character (^D kicks).
//  - A character typed with AltGr (Windows: Ctrl and Alt together) is that
//    character: \ and [ on a German keyboard were M- commands.
//  - Alt and a key is the M- command of that key (M-o offers).  A Mac's
//    Option changes the character (Option+o types ø, Option+e waits for an
//    accent); the key's place says which letter it was.  An ASCII character
//    Option types (a German Mac's [ is Option+5) is that character.
export function keyCodeOf(e, mac = false) {
  if (!e || typeof e.key !== 'string') return null;
  if (mac && e.metaKey) return null;
  if (ARROWS[e.key]) {
    const c = ARROWS[e.key];
    return (e.shiftKey ? c.toUpperCase() : c).charCodeAt(0);
  }
  switch (e.key) {
    case 'Enter': return 13;
    case 'Escape': return 27;
    case 'Backspace': return 8;
    case 'Tab': return 9;
    case 'Delete': return 0x7f;
    default: break;
  }
  const typed = e.key.length === 1;
  if (altGraph(e) || (!mac && e.ctrlKey && e.altKey && typed && !/^[a-z]$/i.test(e.key))) {
    return typed ? e.key.charCodeAt(0) : null;
  }
  if (e.altKey) {
    let c = typed ? e.key : null;
    // a Mac's Option types no plain letter of its own: a plain character is
    // the layout's (a German Mac's [), the rest say the key by its place
    if (mac && c !== null && c.charCodeAt(0) < 128) return c.charCodeAt(0);
    if (c === null || c.charCodeAt(0) >= 128) c = placeChar(e) || c;
    if (c === null) return null;
    const cc = c.charCodeAt(0);
    return cc < 128 ? cc | 0x80 : cc;
  }
  if (!typed) return null;
  if (e.ctrlKey && /^[a-z]$/i.test(e.key)) return e.key.toUpperCase().charCodeAt(0) & 0x1f;
  return e.key.charCodeAt(0);
}

// The prefix: Ctrl and the key right of L, by its place (KeyboardEvent.code
// 'Semicolon', whatever the layout prints on it: ö on a German keyboard, m on
// a French one), never with Alt, AltGr or Cmd.  A setting may name another
// key's place (PREFIX_CODES).
export const PREFIX_CODES = { Semicolon: 'Ctrl+;', Quote: "Ctrl+'", Backslash: 'Ctrl+\\' };
export function isPrefix(e, code = 'Semicolon') {
  return !!(e && e.ctrlKey && !e.altKey && !e.metaKey && !altGraph(e) && e.code === (PREFIX_CODES[code] ? code : 'Semicolon'));
}

// The key after the prefix, with Ctrl still held or let go: its character
// as typed, so f (FLICK's tap) and F (COMBAT's layer) differ; a letter or
// digit by its place where the layout types another script.
export function prefixChar(e) {
  if (!e || typeof e.key !== 'string') return null;
  if (e.key.length === 1 && /^[A-Za-z0-9]$/.test(e.key)) return e.key;
  return placeChar(e);
}

// What each key after the prefix does (the design's section 12's table, with
// Lucas's answers of 2026-10-07: WORLD on o and counts on x, since a browser
// tab cannot stop Ctrl+W or Ctrl+N; no letter for KEYS).  The page carries
// them out (overlay.js prefixAct); the key-legend panel lists them.
export const PREFIX = [
  { ch: '1', act: 'm1', word: 'M1' },
  { ch: '2', act: 'm2', word: 'M2' },
  { ch: '3', act: 'm3', word: 'M3' },
  { ch: '4', act: 'pin1', word: 'PIN 1' },
  { ch: '5', act: 'pin2', word: 'PIN 2' },
  { ch: 'f', act: 'flick', word: 'FLICK' },
  { ch: 'k', act: 'flick1', word: 'flick ↑' },
  { ch: 'u', act: 'flick2', word: 'flick ↗' },
  { ch: 'm', act: 'menu', word: 'MENU' },
  { ch: 'o', act: 'world', word: 'WORLD' },
  { ch: 'g', act: 'game', word: 'GAME' },
  { ch: 'c', act: 'context', word: 'CONTEXT' },
  { ch: 'z', act: 'longrest', word: 'LONG REST' },
  { ch: 'x', act: 'count', word: 'counts' },
  { ch: 'F', act: 'layer', hub: 'fight', word: 'COMBAT layer' },
  { ch: 'i', act: 'layer', hub: 'equip', word: 'INVENTORY layer' },
  { ch: 'e', act: 'layer', hub: 'consume', word: 'EAT layer' },
  { ch: 'a', act: 'layer', hub: 'apply', word: 'APPLY layer' },
  { ch: 'd', act: 'layer', hub: 'drop', word: 'DROP layer' },
];
export const prefixEntry = (ch) => PREFIX.find((p) => p.ch === ch) || null;

// A layer opened from the keyboard: the vi-keys pick its places, in the
// pad's order (commands.js PAD_KEYS), and . its centre, ALL.
export const PLACE_KEYS = ['y', 'k', 'u', 'h', '.', 'l', 'b', 'j', 'n'];
export function placeOfKey(ch) {
  const n = PLACE_KEYS.indexOf(ch);
  return n < 0 ? null : n;
}
