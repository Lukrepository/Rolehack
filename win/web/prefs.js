// Written for Rolehack by Lucas Ruiz, 2026-09-26.
//
// The interface's settings and pins, as RhPrefs keeps them on the phone, in
// this browser's storage.  Storage can be missing or refuse writes (a private
// window, cleared site data), so every read and write falls back quietly and
// the defaults stand in.

import * as C from './commands.js';

const PREFIX = 'rh.';
const DEFAULTS = {
  style: 'terminal',          // terminal | light | gamecube
  case: true,
  phosphor: 'color',          // color | amber | green | white
  statusLines: 'full',        // full | compact | hidden
  padCell: 58,                // 46 | 52 | 58 (Parhi's 9.2 mm)
  labelMode: 'words',         // words | keys | both
  keyFlash: true,
  feedback: 'vibrate',        // off | vibrate | click | both (RhFeedback)
  clickVolume: 60,
  mapMode: 'tiles',           // tiles | text
  zoom: 0,                    // tile size in CSS px; 0 = fit the level's height
  searchMode: false, searchBefore: true, searchCount: 1,
  atkSlots: null, equipSlots: null, counts: {}, macros: null,
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
