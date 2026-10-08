// Written for Rolehack by Lucas Ruiz, 2026-09-26.
//
// The interface's settings and pins, as RhPrefs keeps them on the phone, in
// this browser's storage.  Storage can be missing or refuse writes (a private
// window, cleared site data), so every read and write falls back quietly and
// the defaults stand in.

import * as C from './commands.js';
import { PREFS_PREFIX } from './channel.js';

// rh. on the live page, rhp. on the preview channel (channel.js), so the two keep their own settings
const PREFIX = PREFS_PREFIX;
const DEFAULTS = {
  style: 'terminal',          // terminal | light | gamecube
  case: true,
  phosphor: 'color',          // color | amber | green | white
  colourVision: 'standard',   // standard | protanopia | deuteranopia | tritanopia | monochrome
  userRc: '',                 // the player's own options-file lines, added at the next start
  statusLines: 'full',        // full | compact | hidden
  // pause with --More-- when the message band is full, as tty does; off, the
  // band shows the newest and counts the rest, "+N" (Lucas, 2026-09-28)
  morePause: true,
  // the message band's face and size (step 3 of the message band research):
  // Atkinson Hyperlegible Next, or the screen's own font; the size a factor
  msgFont: 'atkinson',        // atkinson | screen
  msgSize: 1,                 // 0.85 | 1 | 1.2 | 1.4
  // the player's message rules (rhrules.c): "type<TAB>pattern" a line, oldest
  // first, read into ~/.nethackrc as MSGTYPE lines; none to begin with
  msgRules: '',
  // The touch interface's layout (Lucas, 2026-10-02): 'twin', the guarded twin
  // banks -- each thumb its own 3x6 bank in its bottom corner, the same in
  // both orientations (layout.js) -- or 'classic', the case and deck as they
  // were, kept as they were.  A window with no room for twin banks shows
  // classic without changing this.
  layout: 'twin',             // twin | classic
  // Desktop mode (Lucas, 2026-10-07; input.js): which board twin banks show.
  // 'auto' follows the input in use -- the thumb banks for a touch, the desk's
  // dock under the map for the mouse, a touchpad or the wheel -- and the other
  // two fix it.  inputMode is the board the switch last chose, remembered in
  // this browser (null: none yet), which a page starts with under 'auto'.
  controls: 'auto',           // auto | thumb | desk
  inputMode: null,            // thumb | desk
  // the prefix for Rolehack's own keys, by the place of its key (input.js
  // PREFIX_CODES): Ctrl and the key right of L, unless the system takes it
  prefixKey: 'Semicolon',     // Semicolon | Quote | Backslash
  // Twin banks remember the window each display mode has shown in each
  // orientation of the whole device, so a phone's two orientations get the
  // same banks (the design's section 12; viewer.js says which windows teach
  // it): { browser|standalone|fullscreen: { w, h, l, sl, sr, pw, lh } } -- the
  // portrait width w, the landscape height h and width l, the landscape side
  // insets sl and sr; pw marks w and lh marks h, l, sl and sr as seen, not
  // estimated from the screen.
  budgets: {},
  // The ghost deck (the design's section 6, item 8): while it is on, a map tap
  // on one of the old landscape deck keys' spots previews instead of
  // travelling.  It retires itself after three sessions in a row in which no
  // preview went unconfirmed; MENU -> Settings brings it back.
  // the save signature of the build that last wrote this channel's saves
  // (web.js mountSaves, syncSaves): a build of another era finding games here
  // says so once and keeps them aside
  saveEra: '',
  ghostDeck: { on: true, clean: 0, session: null },
  padCell: 58,                // 46 | 52 | 58 (Parhi's 9.2 mm)
  labelMode: 'words',         // words | keys | both
  keyFlash: true,
  feedback: 'vibrate',        // off | vibrate | click | both (RhFeedback)
  clickVolume: 60,
  mapMode: 'tiles',           // tiles | text
  zoom: 0,                    // tile size in CSS px; 0 = fit the level's height
  // Twin banks' own zoom (the design's section 11): a factor of the device's
  // map cell, so it carries across windows and both orientations share it;
  // it starts at 1, not from classic's zoom, which twin never reads nor writes
  zoomFactor: 1,
  // Twin banks' map cell, the device's one (the design's section 11):
  // 'columns', the cell that shows at least today's 34 landscape columns with
  // all 21 rows where the screen allows, or 'rows', the bigger cell whose 21
  // rows fill the landscape height (and the header over the banks)
  mapCell: 'columns',         // columns | rows
  searchMode: false, searchBefore: true, searchCount: 1,
  // the on-screen keyboard for anything typed: for a touch screen whose own
  // keyboard is put away (Lucas, 2026-09-27) -- chosen, never guessed, since a
  // keyboard can be attached and still out of reach
  touchKeyboard: false,
  atkSlots: null, equipSlots: null, counts: {}, macros: null,
  // twin banks' attack pins, their own: PIN 2 starts on Fire there, classic's
  // stays empty (overlay.js twinPins)
  atkSlotsTwin: null,
};

const cache = {};
const listeners = new Set();

export function get(name) {
  if (name in cache) return cache[name];
  let v = DEFAULTS[name];
  try {
    const raw = localStorage.getItem(PREFIX + name);
    if (raw !== null) v = JSON.parse(raw);
  } catch (e) { /* storage unavailable: the default */ }
  cache[name] = v;
  return v;
}

export function set(name, value) {
  cache[name] = value;
  try { localStorage.setItem(PREFIX + name, JSON.stringify(value)); } catch (e) { /* kept for this visit */ }
  for (const fn of listeners) fn(name, value);
}

export const onChange = (fn) => listeners.add(fn);

function unset(name) {
  delete cache[name];
  try { localStorage.removeItem(PREFIX + name); } catch (e) { /* nothing stored */ }
}

// M1-M3, then the flick key's tap, flick up and flick up-right (RhPrefs.FLICK_TAP).
export const MACRO_SLOTS = 3, FLICK_TAP = 3, MACRO_STORE = 6;
export function macros() {
  let m = get('macros');
  if (!Array.isArray(m) || m.length <= FLICK_TAP) {
    // First run with the flick key: Kick on its flick up, and whatever the
    // retired third COMBAT point held onto its tap.
    const base = Array.isArray(m) ? m.slice() : [];
    while (base.length < MACRO_STORE) base.push({ name: '', keys: '' });
    base[FLICK_TAP + 1] = { name: 'Kick', keys: '^D' };
    const atk = get('atkSlots');
    const moved = Array.isArray(atk) && atk[2] ? C.pinnable(atk[2]) : null;
    if (moved) base[FLICK_TAP] = { name: moved.word, keys: moved.key };
    // the retired point is spent once it has moved, so restoring macros cannot bring it back
    if (Array.isArray(atk) && atk.length > C.ATK_SLOT_DEFAULT.length) set('atkSlots', atk.slice(0, C.ATK_SLOT_DEFAULT.length));
    set('macros', base);
    m = base;
  }
  return Array.from({ length: MACRO_STORE }, (_, n) => (m && m[n]) || { name: '', keys: '' });
}

// DEFAULTS (RhPrefs.restoreKeys / restoreMacros)
export function restoreKeys(hubIds) {
  unset('atkSlots');
  unset('atkSlotsTwin');
  unset('equipSlots');
  for (const id of hubIds) unset(`layer_${id}`);
}
export function restoreMacros() {
  unset('macros');
  macros();
}
export function saveMacro(slot, name, keys) {
  const m = macros();
  m[slot] = { name: name.trim(), keys };
  set('macros', m);
}

export function count(countKey, fallback) {
  const c = get('counts') || {};
  return c[countKey] > 0 ? c[countKey] : fallback;
}
export function saveCount(countKey, n) {
  set('counts', { ...(get('counts') || {}), [countKey]: n });
}

// a layer's nine places; the fans' three or four nodes are not carried over
export function fanSlots(hubId, fallback) {
  const v = get(`layer_${hubId}`);
  return Array.isArray(v) && v.length === fallback.length ? v.slice() : fallback.slice();
}
export const saveFanSlots = (hubId, keys) => set(`layer_${hubId}`, keys);
