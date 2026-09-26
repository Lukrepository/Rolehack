// Written for Rolehack by Lucas Ruiz, 2026-09-26.
//
// The interface's settings and pins, as RhPrefs keeps them on the phone, in
// this browser's storage.  Storage can be missing or refuse writes (a private
// window, cleared site data), so every read and write falls back quietly and
// the defaults stand in.

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

export const MACRO_SLOTS = 3;
export function macros() {
  const m = get('macros');
  return Array.from({ length: MACRO_SLOTS }, (_, n) => (m && m[n]) || { name: '', keys: '' });
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

export function fanSlots(hubId, fallback) {
  const v = get(`fan_${hubId}`);
  return Array.isArray(v) ? v.slice() : fallback.slice();
}
export const saveFanSlots = (hubId, keys) => set(`fan_${hubId}`, keys);
