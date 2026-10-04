// Written for Rolehack by Lucas Ruiz, 2026-09-26.
//
// The Rolehack touch interface for the web page: the terminal of
// RolehackFront's RhOverlay (44a195c) -- a putty case with a bank of keycaps
// each side and a deck under the CRT glass -- with its gestures (tap, hold,
// tap-again, flick), fans, radials, drawers, pins, counts, macros, lamps and
// the context key.  Geometry is the Java's, in design dp: #case and #keys are
// laid out in those units and scaled as a whole, capped so the case fits the
// window (RhOverlay.updateFitLimit).  The glass itself is web.js's; the host
// is told where it is.
//
// Two geometries, as on the phone: landscape, and portrait whenever the
// window is taller than it is wide -- the "twin pads" board (the P_
// constants): the glass across the top, a row of keys under it, and the two
// banks side by side along the bottom, each ending in a 3x3 pad.  Nothing in
// a bank moves between the two; turning the window rebuilds in place.
//
// Twin banks (Lucas, 2026-10-02: the setting "Layout: twin banks / classic",
// twin by default).  The same keys -- the same Key objects, bindings,
// gestures, hubs, pins, macros and flick -- placed where layout.js's layout()
// puts them: each thumb's 3x6 bank in its own bottom corner, every size and
// offset from the device's short and long sides (or the budget remembered for
// the display mode), never from the orientation, in CSS px with no scale.
// The movement pad keeps the player's key size; the glass takes the rectangle
// the banks leave.  The case paints the two wells and the glass's bezel; the
// hood and the lip go, and their lamps move onto the keys they describe.
// Each key's box is its hit cell, and a guard round the banks keeps a near
// miss from walking the hero or firing another key (the halos and seams
// here, the map's ring in web.js).  The counts and the places of CONTEXT and
// the pad centre are layers on the movement pad, as the hubs' are; whatever
// else popped up over keys opens inside the map instead, and a rebuild -- a
// resize, a turn -- keeps whatever was open or armed.  A window with no room
// for twin banks shows classic, and the setting stays twin.  Classic is the
// board above, as it was; nothing here changes it.
//
// Key feedback -- a vibration, the click, both or neither -- is feedback.js.

import * as C from './commands.js';
import * as P from './prefs.js';
import * as FB from './feedback.js';
import { textMetrics } from './layout.js';
import { budgetedLayout, withClasses, classesOf } from './viewer.js';

// ---- geometry, design dp (RhCase, RhOverlay, RhScreen)
const MARGIN = 8, WELL_PAD = 10, DECK_H = 66, DECK_KEY = 52, HOOD_TOP = 14, HOOD_SIDE = 16,
  LIP = 26, GLASS_R = 20, LAMP_STRIP = 22;
const T_KEY = 58, T_GAP = 6, T_ROW_GAP = 11, T_ROW1_H = 40, T_SLOT_W = 50, T_RIGHT_COL = 88,
  T_INTERACT_H = 105, T_CONSUME_H = 68, T_SEARCH_H = 63, T_SPARE_H = 52, T_EQ_BAR = 28, T_EQ_CELL_H = 48;
const PAD_GAP = 8, FIT_FLOOR = 0.7, T_MIN_HOOD = 400;
// portrait (RhOverlay's P_ constants, RhCase's portrait hood)
const P_ROW_H = 48, P_ROW_GAP = 6, P_FN_KEY = 36, P_FN_KEYS = 8, P_BANK_GAP = 6, P_MIN_GLASS = 300;
const P_INTERACT_FAN_TURN = 12, P_HOOD_SIDE = 8, P_HOOD_TOP = 10;
export const MSG_BAND = 36, STATUS_BAND = 48, LINE = 13.5;
// The message band has a fixed number of rows -- three in portrait, two in
// landscape (Lucas, 2026-09-28) -- and never grows over the map; what does not
// fit waits behind --More-- (web.js).  5 above the rows, 4 below, as RhScreen.
export const msgRows = (portrait) => (portrait ? 3 : 2);

// The message band's text (Lucas, 2026-09-28; step 3 of the message band
// research).  Sized by its x-height, 9.5 CSS px: 0.25 degrees at a phone's
// 36 cm, the research's target, over reading science's 0.2 degree critical
// print size -- VT323 at the old size gave about 0.14.  The x-heights are the
// fonts' own (OS/2 tables), so either face reads the same size.  Times the
// player's size and the system's text size, but not the case's scale: the
// text keeps its size when the case shrinks to fit the window.
const MSG_X = 9.5;
const X_HEIGHT = { atkinson: 0.496, vt323: 0.400 };
export const MSG_LEADING = 1.35;

// The system's text size: iOS's Dynamic Type where there is one (every iOS
// browser is WebKit, whose -apple-system-body is 17 px at the default size),
// else the browser's own default font size over its usual 16.
let osScale = null;
export function osTextScale() {
  if (osScale !== null) return osScale;
  let scale = 1;
  try {
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;font-size:medium';
    document.body.appendChild(probe);
    scale = parseFloat(getComputedStyle(probe).fontSize) / 16;
    if (navigator.maxTouchPoints > 0) {
      probe.style.font = '-apple-system-body';
      if (probe.style.font) scale = parseFloat(getComputedStyle(probe).fontSize) / 17;
    }
    probe.remove();
  } catch (e) { scale = 1; }
  osScale = clamp(scale || 1, 0.8, 2);
  return osScale;
}
export function resetTextScale() { osScale = null; }

export function msgTextPx() {
  const face = P.get('msgFont') === 'screen' ? 'vt323' : 'atkinson';
  return MSG_X / X_HEIGHT[face] * (Number(P.get('msgSize')) || 1) * osTextScale();
}

// The band's height in CSS px: its rows, and 5 above and 4 below at the case's scale.
export const msgBandPx = (portrait, s) => (5 + 4) * s + msgRows(portrait) * msgTextPx() * MSG_LEADING;
const HUB_HOLD_MS = 380, CENTRE_HOLD_MS = 420, SLOT_CLEAR_MS = 420, CHIP_HOLD_MS = 360;
const FLICK_SLOP = 10, FLICK_MIN = 26, FLICK_ARC_SLACK = 15, FLICK_REVEAL_MS = 200;
const FAN_SIZE = [54, 50, 46, 44, 44, 44], FAN_ROTATE = [0, 0, -11, 9, 0, 0];
const CTX_RADIAL_STEP = 26, CTX_RADIAL_A0 = -90, CTX_RADIAL_SIZE = 46, CTX_RADIAL_AIR = 11;
const CHIP_SIZE = 44, CHIP_GAP = 4, CHIP_GAP_ABOVE = 7, CHIP_ROW_W = 5 * CHIP_SIZE + 4 * CHIP_GAP;
const SAT_SIZE = 44, CAND_RADIUS = 100, CAND_SIZE = 54;
const MAX_COUNT = 32767;
const HIDE_LONG_MS = 4000;

// ---- twin banks: layout.js's control ids for the keys built below
const TWIN_PAD = ['pad_y', 'pad_k', 'pad_u', 'pad_h', 'pad_centre', 'pad_l', 'pad_b', 'pad_j', 'pad_n'];   // C.PAD_KEYS' order
const TWIN_HUB = { fight: 'combat', drop: 'drop', apply: 'apply', consume: 'eat', equip: 'inventory' };
const TWIN_EQUIP = ['eq_wear', 'eq_puton', 'eq_wield', 'eq_takeoff', 'eq_remove', 'eq_swap'];   // C.EQUIP_SLOT_DEFAULT's cells
const TWIN_STRIP = ['look', 'context', 'search'];
const TWIN_TOP = ['menu', 'world', 'game', 'keys'];   // C.TOP_RIGHT's order
const TWIN_PINS = ['pin1', 'pin2'];                   // COMBAT's points
const TWIN_MACROS = ['m1', 'm2', 'm3'];
const POP_PAD = 4;        // a pop-up's distance inside the map area's edge
// The ghost deck (the design's section 6, item 8): the old deck keys' spots
// take 8 dp round them, a preview waits 2 s for its second tap, a session ends
// after 30 minutes without input and counts once 100 turns are played in it,
// and three sessions in a row with nothing caught retire it.
const GHOST_SLOP = 8, GHOST_FLASH_MS = 1400;
export const GHOST_CONFIRM_MS = 2000;
const SESSION_IDLE_MS = 30 * 60 * 1000, SESSION_TURNS = 100, GHOST_SESSIONS = 3;
// The near-miss guard (the design's section 6): a 12 dp halo round each bank
// that snaps a tap within 8 dp of a keycap to it and swallows the rest, seams
// at least 8 dp wide between the action pad's keycaps, and the confirm ring,
// the 20 dp of map next to a halo (web.js).  A swallow flashes for 150 ms.
const HALO = 12, SNAP = 8, SEAM = 8, GUARD_FLASH_MS = 150;
export const RING_REACH = HALO + 20;   // a map tap this near a keycap is in the ring
// Layers on the pad (the design's section 8): a sticky layer drops back to
// arrows after 4 s with no input; a count held 600 ms or more stays up when
// the thumb lifts; the stairs from CONTEXT wait 2 s for their second tap.
const STICKY_IDLE_MS = 4000, COUNT_STICKY_MS = 600, STAIRS_MS = 2000;
// the ghost deck's habit guards stand for 1.5 s (classicHabits)
const HABIT_MS = 1500;
// The count layer's places: ↖ ×1, ↑ ×5, ↗ ×10, → ×20 (or a Long rest's
// ×100 to ×400); the centre types any count.
const COUNT_PLACES = [0, 1, 2, 5];
// PIN 1 empty, PIN 2 Fire, in twin banks (the design's section 16); classic's
// two points keep C.ATK_SLOT_DEFAULT, both empty.  Twin keeps its pins under
// their own name (twinPins).
const TWIN_ATK_DEFAULT = [null, 'f'];
// The flick's two wedges split at -62.5 degrees and run 62.5 each way, -125
// to 0 (the design's section 7): 17.5 past each node, where classic has 15.
const TWIN_FLICK_SLACK = 17.5;

// here-context flags (include/rhhere.h)
export const HERE_OBJECT = 0x01, HERE_STAIRS_DOWN = 0x02, HERE_STAIRS_UP = 0x04, ADJ_CLOSED_DOOR = 0x08,
  ADJ_HOSTILE = 0x10, HERE_CONTAINER = 0x20, HERE_ALTAR = 0x40, ADJ_OPEN_DOOR = 0x80;

// Twin banks' HERE layer (the design's section 8), in the pad's order: fixed
// places, never re-ranked, so a place is one thumb motion whatever the turn
// holds.  A place whose flag the turn lacks is dimmed and does nothing; Look
// here always applies.  The centre is ALL, the HERE drawer.  The stairs are
// marked: from CONTEXT they take a second tap.
const HERE_PLACES = [
  { act: C.CTX_SACRIFICE, bit: HERE_ALTAR },                     // ↖
  { act: C.CTX_ASCEND, bit: HERE_STAIRS_UP, stairs: true },      // ↑
  { act: C.CTX_PICKUP, bit: HERE_OBJECT },                       // ↗
  { act: C.CTX_OPEN, bit: ADJ_CLOSED_DOOR },                     // ←
  null,                                                          // ALL
  { act: C.CTX_CLOSE, bit: ADJ_OPEN_DOOR },                      // →
  { act: C.CTX_LOOT, bit: HERE_CONTAINER },                      // ↙
  { act: C.CTX_DESCEND, bit: HERE_STAIRS_DOWN, stairs: true },   // ↓
  { act: C.CTX_LOOKHERE, bit: 0 },                               // ↘
];

// ---- keycap families (RhTheme): top light, top dark, skirt left/mid/right, legend, hold, raw
const fam = (a) => a;
const withLegend = (base, lg) => { const o = base.slice(); o[5] = lg; return o; };
const CAP_CREAM = fam(['#fbf8f1', '#e3ded2', '#dcd6c8', '#c9c2b3', '#a8a091', '#2a2622', '#6e2a0b', '#8b4a12']);
const CAP_DARK = fam(['#4b443e', '#35302b', '#3b3530', '#2c2723', '#1b1815', '#f1e8d5', '#f2a64a', '#f3c46b']);
const CAP_SLATE = fam(['#7c7a74', '#63615c', '#6d6b66', '#595853', '#43423e', '#fffaf0', '#ffd796', '#ffe0a0']);
const CAP_AMBER = fam(['#f8b457', '#e38a26', '#e59633', '#c9761c', '#9f5b12', '#2a1503', '#fff3dc', '#5a3208']);
const CAP_RED = fam(['#c85240', '#a13426', '#a83d2d', '#8e2e21', '#6a1f15', '#fff3ea', '#ffd796', '#ffd796']);
const CAP_AMBER_DARK = fam(['#e08c3a', '#c2661a', '#c86e22', '#a85716', '#7c3e0c', '#2a1503', '#ffe8c8', '#4a2406']);
const CAP_TEAL = withLegend(CAP_DARK, '#5fd8c9'), CAP_ROSE = withLegend(CAP_DARK, '#f08bb6'),
  CAP_LAV = withLegend(CAP_DARK, '#c2b6ff');
const GC_YELLOW = fam(['#ffe066', '#f5c400', '#eab800', '#d4a300', '#a67f00', '#3a2a00', '#4a2f00', '#6b4a00']);
const GC_RED = fam(['#f0505f', '#c8102e', '#c81e33', '#a50f22', '#720816', '#fff4f2', '#ffd9a0', '#ffe3b0']);
const GC_BLUE = fam(['#5c93ff', '#2a62d8', '#2d62cf', '#1f4bb0', '#153582', '#f2f6ff', '#d6e4ff', '#dfe9ff']);
const GC_NAVY = fam(['#3a4fb0', '#22348a', '#273a90', '#1c2b74', '#121d52', '#e8ecff', '#ffd21f', '#ffe066']);
const GC_GREY = fam(['#e4e4ea', '#bdbdc8', '#c4c4ce', '#a7a7b4', '#80808e', '#24242c', '#15175a', '#15175a']);
const GC_ORANGE = fam(['#ffa347', '#ff6f00', '#f07000', '#d45a00', '#9c3f00', '#2a1000', '#fff0dc', '#5a2600']);
const GC_SCARLET = fam(['#ff6b5b', '#ff2a1a', '#f02818', '#cc1a0c', '#8f1006', '#fff5ee', '#ffe28a', '#ffe8a8']);
const GC_DARK = fam(['#4a4c6e', '#34365a', '#3a3c62', '#2b2d4f', '#1a1b36', '#eef0ff', '#ffd21f', '#ffd21f']);
const GC_ORANGE_DARK = fam(['#e0701f', '#c05200', '#b84e00', '#9a4000', '#6a2a00', '#2a1000', '#fff0dc', '#4a1e00']);
const GC_TEAL = withLegend(GC_DARK, '#5fe3d2'), GC_ROSE = withLegend(GC_DARK, '#ff8fc0'),
  GC_LAV = withLegend(GC_DARK, '#c8bcff');
// macros: jade on the Terminal skins, the Emerald Blue GameCube's teal on GameCube
const CAP_JADE = fam(['#8cc9b8', '#6aae9b', '#65a592', '#5a9a88', '#3f7566', '#0f2a24', '#0f2a24', '#1f4a40']);
const GC_EMERALD = fam(['#4fe0c4', '#12b89c', '#16b598', '#11a88e', '#0a7a66', '#032b24', '#032b24', '#04382f']);
// APPLY's layer on the Terminal skins: the cream pad inverted, since APPLY is cream too
const CAP_CREAM_INV = withLegend(CAP_DARK, '#fbf8f1');
const ROLE_MOVE = 0, ROLE_INTERACT = 1, ROLE_CONSUME = 2, ROLE_SEARCH = 3, ROLE_INVENTORY = 4;

const gc = () => P.get('style') === 'gamecube';
function capFor(face) {
  const g = gc();
  switch (face) {
  case C.A90: return g ? GC_ORANGE : CAP_AMBER;
  case C.R90: return g ? GC_SCARLET : CAP_RED;
  case C.OFF90: return CAP_SLATE;
  case C.TEAL: return g ? GC_TEAL : CAP_TEAL;
  case C.PINK: return g ? GC_ROSE : CAP_ROSE;
  case C.VIOLET: return g ? GC_LAV : CAP_LAV;
  case C.JADE: return g ? GC_EMERALD : CAP_JADE;
  default: return g ? GC_DARK : CAP_DARK;
  }
}
// Character creation's keys (web.js creationKeys(), after RhCreate.family()):
// the choices cream (grey on the GameCube), vanilla's other entries dark, the
// default -- the one Enter takes -- amber, Quit red.
export function creationCap(kind) {
  switch (kind) {
  case 'choice': return gc() ? GC_GREY : CAP_CREAM;
  case 'default': return capFor(C.A90);
  case 'quit': return capFor(C.R90);
  default: return capFor(null);
  }
}
function role(r) {
  if (gc()) return [GC_YELLOW, GC_RED, GC_BLUE, GC_NAVY, GC_GREY][r];
  return [CAP_CREAM, CAP_CREAM, CAP_ROSE, CAP_DARK, CAP_DARK][r];
}
const longRestCap = () => (gc() ? GC_ORANGE_DARK : CAP_AMBER_DARK);
// a layer wears its hub's colour (RhTheme.layerCap / layerAccent)
const LAYER_APPLY = 0, LAYER_COMBAT = 1, LAYER_EAT = 2, LAYER_DROP = 3, LAYER_INVENTORY = 4;
function layerCap(kind) {
  const g = gc();
  return [g ? GC_RED : CAP_CREAM_INV, g ? GC_SCARLET : CAP_RED, g ? GC_BLUE : CAP_ROSE,
          g ? GC_TEAL : CAP_TEAL, g ? GC_GREY : CAP_SLATE][kind];
}
function layerAccent(kind) {
  const g = gc();
  return [g ? '#f0505f' : '#fbf8f1', g ? '#ff6b5b' : '#c85240', g ? '#5c93ff' : '#f08bb6',
          g ? '#5fe3d2' : '#5fd8c9', g ? '#e4e4ea' : '#9c9a94'][kind];
}
const FLICK_ID = 'flick';

const ARROW_DEG = { '↑': 0, '↗': 45, '→': 90, '↘': 135, '↓': 180, '↙': 225, '←': 270, '↖': 315 };
const ARROW_SVG = (deg) => `<svg width="20" height="20" viewBox="0 0 20 20" style="transform:rotate(${deg}deg)">`
  + '<path d="M10 16V4M5 9l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2.4" '
  + 'stroke-linecap="round" stroke-linejoin="round"/></svg>';
// the arrow nearest a flick's screen bearing (0 to the right, -90 up): -85 ↑, -40 ↗
const bearingArrow = (b) => {
  const compass = (((b + 90) % 360) + 360) % 360;
  let best = '↑';
  for (const [a, d] of Object.entries(ARROW_DEG)) {
    const off = (x) => Math.min(Math.abs(compass - x), 360 - Math.abs(compass - x));
    if (off(d) < off(ARROW_DEG[best])) best = a;
  }
  return best;
};

const $ = (id) => document.getElementById(id);
const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const rad = (d) => (d * Math.PI) / 180;

// ______________________________________________________________________________
// A keycap (RhFace.drawKeycap): the tap legend on the top face, a hold legend
// on the front skirt, the raw key in the corner.  Pressed, the face drops.

const fitQueue = new Set();
let fitScheduled = false;
// Twin banks fit the skirt's hold hint to the key as well: the right bank's
// columns narrow to 44.7 dp on a 360 dp phone, where "TAP TO FILL" read "AP
// TO FIL" (the review, 2026-10-02).  An overflowing hint gives way to its
// last word, then shrinks, down to 6 px.  Classic's skirts are left as they are.
let skirtFit = false;
const SKIRT_SHORT = { 'tap to fill': 'fill', 'hold to fill': 'fill', 'pick a count': 'count', 'pick a place': 'place',
  'pick a point': 'point', 'pick a cell': 'cell', 'tap to pick': 'pick', 'pick one': 'pick', 'tap = all': 'all',
  'set ×n': '×n', '3 places': '3' };
function scheduleFit(k) {
  fitQueue.add(k);
  if (fitScheduled) return;
  fitScheduled = true;
  requestAnimationFrame(() => {
    fitScheduled = false;
    for (const key of fitQueue) key.fit();
    fitQueue.clear();
  });
}

class Key {
  constructor(parent) {
    this.el = el('button', 'k', parent);
    this.el.type = 'button';
    this.el.innerHTML = '<span class="sh"></span><span class="sk"></span><span class="fr"></span>'
      + '<span class="tp"><span class="rk"></span><span class="lg"></span></span>';
    [this.sh, this.sk, this.fr, this.tp] = this.el.children;
    [this.rk, this.lg] = this.tp.children;
    this.faceColour = C.G90;
    this.capFam = null;       // forced family
    this.defFam = null;       // family while the face is the default
    this.size = 10;
    this.text = '';
    this.subText = null;
    this.subRaw = false;
    this.tagText = null;
    this.isPh = false;
    this.isNub = false;
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  place(x, y, w, h, rot = 0) {
    const s = this.el.style;
    this.kx = x; this.ky = y;
    this.setBox(x, y, w, h);
    if (rot) s.transform = `rotate(${rot}deg)`;
    const shadow = 2.5, front = clamp(h * 0.2, 7, 12), side = Math.min(4, w / 12);
    const r = Math.min(6, (h - shadow) / 5);
    s.setProperty('--r', `${r}px`);
    s.setProperty('--fr', `${Math.max(0, r - 1)}px`);
    s.setProperty('--sink', `${Math.max(0, Math.min(3, front - 3))}px`);
    this.sk.style.bottom = `${shadow}px`;
    this.sh.style.bottom = '0';
    this.fr.style.top = `${h - shadow - front}px`;
    this.fr.style.height = `${front}px`;
    Object.assign(this.tp.style, { left: `${side}px`, right: `${side}px`, top: '2px', bottom: `${shadow + front}px` });
    if (this.isNub) {
      // a round dome in its hole, centred in the key's place
      const d = Math.min(w, h) - 6, hole = d + 5;
      Object.assign(this.tp.style, { left: `${(w - d) / 2}px`, top: `${(h - d) / 2}px`, right: 'auto', bottom: 'auto',
        width: `${d}px`, height: `${d}px` });
      Object.assign(this.sh.style, { left: `${(w - hole) / 2}px`, top: `${(h - hole) / 2 + 1}px`, right: 'auto', bottom: 'auto',
        width: `${hole}px`, height: `${hole}px` });
    }
    this.w = w; this.h = h;
    this.paint();
    scheduleFit(this);
    return this;
  }

  box(b, rot) { return this.place(b.x, b.y, b.w, b.h, rot); }

  // The element's box: the keycap's, or with a hit cell (cell()) the cell's,
  // the keycap drawn inside it at its own place.
  setBox(x, y, w, h) {
    const s = this.el.style, c = this.hit;
    if (!c) { s.left = `${x}px`; s.top = `${y}px`; s.width = `${w}px`; s.height = `${h}px`; return; }
    s.left = `${c.x}px`; s.top = `${c.y}px`; s.width = `${c.w}px`; s.height = `${c.h}px`;
    Object.assign(this.capEl.style, { left: `${x - c.x}px`, top: `${y - c.y}px`, width: `${w}px`, height: `${h}px` });
  }

  // Twin banks: the key's box is its hit cell (the design's section 6) -- the
  // keycap and the gaps round it, out to the screen's edge on the bank's
  // outer side and bottom -- so a tap a little off the keycap still presses
  // it, and the keycap is drawn inset, where the layout put it.  The cell is
  // in the px place() was given, the key's parent's.  Classic's keys have no
  // cell and no .kcap: their box is the keycap, as it always was.
  cell(c) {
    if (!this.capEl) {
      this.capEl = el('span', 'kcap', this.el);
      for (const part of [this.sh, this.sk, this.fr, this.tp]) this.capEl.appendChild(part);
    }
    this.hit = { ...c };
    this.el.classList.add('hitcell');
    this.setBox(this.kx, this.ky, this.w, this.h);
    return this;
  }

  // the keycap as drawn, on screen
  capRect() { return (this.capEl || this.el).getBoundingClientRect(); }

  face(f) { this.faceColour = f || C.G90; this.paint(); return this; }
  cap(c) { this.capFam = c; this.paint(); return this; }
  defaultCap(c) { this.defFam = c; this.paint(); return this; }

  family() {
    if (this.capFam) return this.capFam;
    // an empty key is dark, except a macro's, which keeps the macro colour
    if (this.isPh && this.faceColour !== C.JADE) return capFor(C.G90);
    if (this.defFam && this.faceColour === C.G90) return this.defFam;
    return capFor(this.faceColour);
  }

  paint() {
    const f = this.family(), s = this.el.style;
    ['--t1', '--t2', '--sL', '--sM', '--sR', '--lg', '--hold', '--raw'].forEach((v, n) => s.setProperty(v, f[n]));
    return this;
  }

  label(text, size = this.size, nocase = false) {
    this.text = text || '';
    this.size = size;
    this.el.classList.toggle('nocase', nocase);
    const deg = ARROW_DEG[this.text];
    if (deg !== undefined) this.lg.innerHTML = ARROW_SVG(deg);
    else this.lg.textContent = this.text;
    this.lg.style.fontSize = `${size}px`;
    this.el.setAttribute('aria-label', this.text.replace(/\n/g, ' ') || 'key');
    scheduleFit(this);
    return this;
  }

  // The sub line: a raw key rides in the corner (when it is a key's worth,
  // four characters or fewer); anything else is a hold hint on the skirt.
  sub(text, raw = false) {
    this.subText = text;
    this.subRaw = raw;
    this.updateCorner();
    let hold = '';
    if (text && !raw) {
      hold = text.trim();
      if (hold.startsWith('hold · ')) hold = hold.slice(7);
      else if (hold === 'hold to set') hold = 'set ×n';
      else if (hold === 'hold to edit') hold = 'edit';
    }
    this.fr.textContent = hold;
    this.holdText = hold;
    if (skirtFit) scheduleFit(this);
    return this;
  }

  tag(t) { this.tagText = t; this.updateCorner(); return this; }

  updateCorner() {
    let corner = this.subRaw && this.subText ? this.subText.trim() : this.tagText;
    if (this.subRaw && corner && corner.length > 4) corner = null;
    this.rk.textContent = corner || '';
  }

  placeholder(on) { this.isPh = on; this.el.classList.toggle('ph', on); this.paint(); return this; }

  // a lamp on the keycap: amber, or red for ARMED (cls 'armed'); null takes it off
  lamp(state, cls = '') {
    let l = this.tp.querySelector('.lamp');
    if (state === null) { if (l) l.remove(); return this; }
    if (!l) l = el('span', cls ? `lamp ${cls}` : 'lamp', this.tp);
    l.classList.toggle('on', state);
    return this;
  }

  lit(on) { this.el.classList.toggle('lit', on); return this; }
  // a layer's place that does nothing this turn (twin banks' HERE and counts)
  dim(on) { this.el.classList.toggle('dimmed', on); return this; }
  // the flick key: a pointing stick's rubber nub rather than a keycap (RhFace.nub)
  nub(on) { this.isNub = on; this.el.classList.toggle('nub', on); return this; }
  press(on) { this.pressed = on; this.el.classList.toggle('pressed', on); }
  show(on) { this.el.style.display = on ? '' : 'none'; return this; }

  // RhFace.fitLabel: shrink the legend until it fits the face
  fit() {
    if (!this.el.isConnected) return;
    if (skirtFit) this.fitSkirt();
    if (ARROW_DEG[this.text] !== undefined) return;
    let size = this.size;
    this.lg.style.fontSize = `${size}px`;
    const avail = this.tp.clientWidth - 4, availH = this.tp.clientHeight - 2;
    if (avail <= 0 || availH <= 0) return;   // hidden: fitted when shown
    if (this.lg.style.paddingRight) this.lg.style.maxWidth = `${avail}px`;
    while (size > 5 && (this.lg.scrollWidth > avail || this.lg.scrollHeight > availH)) {
      size *= 0.92;
      this.lg.style.fontSize = `${size}px`;
    }
  }

  // the skirt's hold hint, in twin banks (skirtFit)
  fitSkirt() {
    const fr = this.fr, t = this.holdText || '';
    if (this.frSize === undefined) this.frSize = parseFloat(fr.style.fontSize) || 0;   // INVENTORY's 6.5
    fr.style.fontSize = this.frSize ? `${this.frSize}px` : '';
    fr.textContent = t;
    if (!t || fr.clientWidth <= 0) return;   // hidden: fitted when shown
    const over = () => fr.scrollWidth > fr.clientWidth + 0.5;
    if (over() && SKIRT_SHORT[t]) fr.textContent = SKIRT_SHORT[t];
    let size = parseFloat(getComputedStyle(fr).fontSize) || 7.5;
    while (size > 6 && over()) {
      size = Math.max(6, size * 0.92);
      fr.style.fontSize = `${size}px`;
    }
  }
}

// ______________________________________________________________________________

export class Overlay {
  constructor(host) {
    this.host = host;
    this.caseEl = $('case');
    this.keysEl = $('keys');
    this.here = -1;
    this.hereMon = '';
    this.wizard = false;
    this.expectsDirection = false;
    this.more = 0;
    this.status = {};
    this.twin = null;         // twin banks' layout, while they are what is shown
    this.twinSig = '';        // the controls of the last twin build, for keeping state across rebuilds
    // Classic lays out again on every resize, as it always has.  Twin banks
    // take their size from the svh root's ResizeObserver (watchTwin()).
    window.addEventListener('resize', () => { if (this.wantsTwin()) this.requestRebuild(); else this.rebuild(); });
    P.onChange((name) => {
      if (['style', 'case', 'padCell', 'labelMode', 'phosphor', 'layout'].includes(name)) this.rebuild();
      // the status band's height is an input to twin banks' layout
      if (name === 'statusLines') { if (this.twin) this.rebuild(); else this.host.glassChanged(this.geom); }
      if (name === 'msgFont' || name === 'msgSize') this.rebuild();
      // twin banks' map cell is decided with the banks (layout.js deviceCell)
      if (name === 'mapCell' && this.wantsTwin()) this.rebuild();
    });
    if (document.fonts) document.fonts.ready.then(() => this.rebuild());
    this.guardClicks();
    this.watchTwin();
    this.watchGuard();
    this.startGhostSession();
    this.rebuild();
  }

  // A key acts on its pointerup, and the browser's click for the same touch
  // comes after it, on whatever is under the finger by then: a window the key
  // has just opened.  Wherever a key and a window's control share a place,
  // the click presses the control: with the twin banks layout's keys,
  // INVENTORY's list closed as it opened (a long inventory's ESC lies under
  // the key) and MENU's tap turned the case back on (the Settings form's Case
  // row lies under it; the review, 2026-10-02).  So a click that ends a touch
  // begun on a key and lands outside the keys is dropped, in every layout: it
  // can only press something the finger never went down on.  A click from
  // the keyboard has no pointer and passes.
  //
  // The glass acts on its pointerup too -- a prompt's chips, the message
  // band (Space at --More--, else the history), the status band and the
  // bezel at --More--, a map tap -- and so do the bands where they stand over
  // the banks, out of the glass.  A chip's answer opens the next window under
  // the finger as readily: EAT on a corpse asked "eat it?", the 'n' chip's
  // tap opened "What do you want to eat?" under it and its click took the
  // food ration (the review, 2026-10-02).  So a touch begun there is held to
  // the place it began in the same way, in every layout.  Twin banks' panels
  // out of the glass (#panes: the tray between the banks, over the banks)
  // open the history and the inventory on theirs, and are held the same.
  guardClicks() {
    const from = new Map();   // pointerId -> { at: where the touch began, up: when it lifted (0: still down) }
    let last = null;
    const places = () => [this.keysEl, $('bands'), $('glass'), $('panes')];
    window.addEventListener('pointerdown', (e) => {
      const at = places().find((q) => q && q.contains(e.target));
      if (at) from.set(e.pointerId, { at, up: 0 });
      else from.delete(e.pointerId);
    }, true);
    window.addEventListener('pointerup', (e) => {
      const t = from.get(e.pointerId);
      if (t) { t.up = performance.now(); last = e.pointerId; }
    }, true);
    window.addEventListener('click', (e) => {
      // the click names its pointer (Chrome); a browser whose click does not
      // takes the last touch that lifted
      const named = e.pointerType && typeof e.pointerId === 'number' && e.pointerId >= 0;
      if (!named && !e.detail) return;
      const id = named ? e.pointerId : last, t = from.get(id);
      if (!t) return;
      from.delete(id);
      if (!t.up || performance.now() - t.up > 1000 || t.at.contains(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
  }

  // ---- state from the game
  setHere(flags, mon) {
    if (flags === this.here && mon === this.hereMon) return;
    this.here = flags;
    this.hereMon = mon;
    this.recomputeContext();
  }
  setWizard(on) { this.wizard = on; }
  setMore(n) { this.more = n; this.updateLamps(); }
  setExpectsDirection(on) {
    if (on === this.expectsDirection) return;
    this.expectsDirection = on;
    if (on) this.closeContextRadial();
    this.refreshPadCentre();
  }
  hereHas(bit) { return this.here >= 0 && (this.here & bit) !== 0; }

  // ---- layout
  rebuild() {
    // the root is sized in svh whenever the setting is twin, a window that
    // falls back to classic included, so that falling back never resizes it
    if (this.wantsTwin()) { document.documentElement.dataset.svh = ''; this.rebuildTwin(); return; }
    delete document.documentElement.dataset.svh;
    this.setViewportFit(false);
    document.documentElement.dataset.ui = 'classic';
    delete document.documentElement.dataset.tier;
    this.twinSig = '';
    this.rebuildClassic(window.innerWidth, window.innerHeight);
  }

  wantsTwin() { return P.get('layout') !== 'classic'; }

  // The classic board: the case and its scale, everything rebuilt from nothing.
  rebuildClassic(W, H) {
    this.twin = null;
    skirtFit = false;
    this.padCell = clamp(Number(P.get('padCell')) || 58, 40, 72);
    this.padBox = 3 * this.padCell + 2 * PAD_GAP;
    this.caseless = !P.get('case');
    // the case stood on end whenever the window is taller than it is wide
    this.portrait = H > W;
    const root = document.documentElement.dataset;
    root.skin = { light: 'light', gamecube: 'gamecube' }[P.get('style')] || 'terminal';
    root.case = this.caseless ? 'off' : 'on';
    root.phosphor = P.get('phosphor');
    root.layout = this.portrait ? 'portrait' : 'landscape';

    const s = Math.min(1, Math.max(FIT_FLOOR, Math.min(W / this.needW(), H / this.needH())));
    this.s = s;
    this.DW = W / s;
    this.DH = H / s;
    for (const layer of [this.caseEl, this.keysEl]) {
      layer.style.width = `${this.DW}px`;
      layer.style.height = `${this.DH}px`;
      layer.style.transform = `scale(${s})`;
    }

    // everything goes, as RhOverlay.rebuild() does
    this.caseEl.innerHTML = '';
    this.keysEl.innerHTML = '';
    this.resetState();
    this.buildCase();
    this.buildKeys();
    this.placeRow2();

    const gs = this.glassSide(), gt = this.glassTop(), gb = this.glassBottom();
    this.geom = {
      s, W, H,
      glass: { x: gs * s, y: gt * s, w: (this.DW - 2 * gs) * s, h: (this.DH - gt - gb) * s, r: (this.caseless ? 8 : GLASS_R) * s },
      caseless: this.caseless,
      portrait: this.portrait,
    };
    this.host.glassChanged(this.geom);
  }

  // ---- twin banks: what the page reads, then layout() (the design's section 12)

  // The window's size comes from the root sized in svh (#app, rolehack.css):
  // the small viewport, which keeps still while a browser's toolbar comes and
  // goes.  Not visualViewport: that changes with the soft keyboard and with a
  // pinch, and the keys under a thumb must move for neither; it only lifts the
  // forms clear of the system's keyboard.  A display mode's change (a tab, the
  // installed app, fullscreen) lays out again with that mode's budget.
  watchTwin() {
    this.pointersDown = new Set();
    this.rebuildPending = false;
    const app = $('app');
    if (window.ResizeObserver) new ResizeObserver(() => { if (this.wantsTwin()) this.requestRebuild(); }).observe(app);
    // in the capture phase, before any key stops the event
    window.addEventListener('pointerdown', (e) => { this.pointersDown.add(e.pointerId); this.noteInput(); }, true);
    const up = (e) => {
      this.pointersDown.delete(e.pointerId);
      if (!this.pointersDown.size && this.rebuildPending) setTimeout(() => this.requestRebuild(), 0);
    };
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    window.addEventListener('keydown', () => this.noteInput(), true);
    document.addEventListener('focusout', () => { if (this.rebuildPending) setTimeout(() => this.requestRebuild(), 0); });
    const again = () => { if (this.wantsTwin()) this.requestRebuild(); };
    document.addEventListener('fullscreenchange', again);
    if (window.matchMedia) {
      for (const mode of ['fullscreen', 'standalone', 'browser']) {
        const mq = matchMedia(`(display-mode: ${mode})`);
        if (mq.addEventListener) mq.addEventListener('change', again);
      }
    }
    const vv = window.visualViewport;
    if (vv) {
      const lift = () => document.documentElement.style.setProperty('--vv-room',
        `${Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))}px`);
      vv.addEventListener('resize', lift);
      vv.addEventListener('scroll', lift);
    }
  }

  // Never under a finger nor while a text field has the focus (the soft
  // keyboard is up, and the field would move under the typing): the layout
  // waits, and runs when the finger lifts or the field lets go.  A finger
  // that never reports its lift holds it back for 2.5 s at most.
  twinBusy() {
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && a.offsetParent !== null) return true;
    return this.pointersDown.size > 0 && performance.now() - this.pendingSince < 2500;
  }

  requestRebuild() {
    if (!this.rebuildPending) this.pendingSince = performance.now();
    if (this.geom && this.twinBusy()) {
      this.rebuildPending = true;
      clearTimeout(this.pendingTimer);
      this.pendingTimer = setTimeout(() => { if (this.rebuildPending) this.requestRebuild(); }, 400);
      return;
    }
    this.rebuildPending = false;
    clearTimeout(this.pendingTimer);
    // a resize and the root's observer often ask together: one rebuild a frame
    if (this.rebuildFrame) return;
    this.rebuildFrame = requestAnimationFrame(() => { this.rebuildFrame = 0; this.rebuild(); });
  }

  // viewport-fit=cover, only while the layout is twin banks: classic keeps
  // the viewport it has always had, which pads for no safe area
  setViewportFit(on) {
    const m = document.querySelector('meta[name="viewport"]');
    if (!m) return;
    const parts = m.content.split(',').map((p) => p.trim()).filter((p) => p && !/^viewport-fit\b/.test(p));
    if (on) parts.push('viewport-fit=cover');
    const v = parts.join(', ');
    if (v !== m.content) m.content = v;
  }

  // the safe-area insets, from a probe padded with env(safe-area-inset-*)
  safeInsets() {
    if (!this.insetProbe) {
      this.insetProbe = el('div', '', document.body);
      this.insetProbe.id = 'insetprobe';
    }
    const cs = getComputedStyle(this.insetProbe), px = (v) => Math.max(0, parseFloat(v) || 0);
    return { l: px(cs.paddingLeft), r: px(cs.paddingRight), t: px(cs.paddingTop), b: px(cs.paddingBottom) };
  }

  displayMode() {
    const mm = (q) => !!(window.matchMedia && matchMedia(q).matches);
    if (document.fullscreenElement || mm('(display-mode: fullscreen)')) return 'fullscreen';
    if (mm('(display-mode: standalone)') || navigator.standalone) return 'standalone';
    return 'browser';
  }

  // The budget: what this display mode has shown in each orientation of the
  // whole device -- the portrait width, the landscape height and width, the
  // landscape side insets -- kept in this browser (prefs budgets), so a
  // phone's two orientations get the same banks and the same map cell in a
  // tab, where the toolbar makes the window uneven.  viewer.js decides which
  // windows use it and teach it, and when the screen may stand in for the
  // orientation not seen yet; the layout comes back with it, and what the
  // window taught is stored only once that layout is usable.
  twinLayout(W, H, pointer, settings, insets, mode) {
    const all = P.get('budgets') || {};
    const scr = { w: Number(screen.width) || W, h: Number(screen.height) || H };
    const out = budgetedLayout(W, H, pointer, withClasses(settings, this.twinClasses), scr, insets, all[mode]);
    if (out.learn) P.set('budgets', { ...all, [mode]: out.learn });
    return out;
  }

  rebuildTwin() {
    // the first build cannot wait; any later one waits for the finger or the field
    if (this.geom && this.twinBusy()) { this.requestRebuild(); return; }
    this.setViewportFit(true);
    const root = document.documentElement.dataset;
    const box = $('app').getBoundingClientRect();
    const W = box.width || window.innerWidth, H = box.height || window.innerHeight;
    // Every window is laid out as for touch, a mouse's or a keyboard's
    // included: desktop mode is deferred (Lucas, 2026-10-03), so a large window
    // with a mouse gets the tablet tier's phone-size banks at its corners, not
    // the desk's 40 dp dock (layout.js section 10, kept for later); a
    // physical keyboard drives the game as it always has (web.js keyCode).
    const pointer = 'touch', mode = this.displayMode(), insets = this.safeInsets();
    const padKey = clamp(Number(P.get('padCell')) || 58, 40, 72);
    // the message rows as the page sets them (msgTextPx) and the status band
    // as web.js draws it: inputs to the rule, so it never puts text over a key.
    // In twin banks the status lines follow the system's text size too, as the
    // message rows do (the design's section 10: 48 dp times the text size);
    // classic's stay at the case's scale.
    resetTextScale();
    const textScale = osTextScale();
    const text = textMetrics({ msgFont: P.get('msgFont') === 'screen' ? 'screen' : 'atkinson',
      msgSize: Number(P.get('msgSize')) || 1, textScale, xHeight: MSG_X });
    const statusH = textScale * ({ hidden: 0, compact: STATUS_BAND - LINE }[P.get('statusLines')] ?? STATUS_BAND);
    // The header goes where the rule puts it: stacked at the top of the glass,
    // side by side once the glass is wide enough (a tablet, a laptop), or over
    // the banks when that shows more of the level -- with the map cell
    // 'rows', whenever it fits.  web.js lays the bands out apart, so the page
    // no longer asks for the header stacked, as it did while the bands stayed
    // one block in #glass (layout.js DEFAULTS.header).
    const base = {
      padKey, insets, msgRowH: text.msgRowH, statusH,
      mapCell: P.get('mapCell') === 'rows' ? 'rows' : 'columns',
    };
    const { r, budget, sideInsets, used } = this.twinLayout(W, H, pointer, base, insets, mode);
    const settings = { ...base, budget, sideInsets };
    if (!r || !r.spec || !r.usable) {
      // No room for twin banks and a map (a near-square split screen): classic
      // for this window, the setting kept; twin banks come back with the room.
      const rs = (r && r.spec && r.spec.fit.reasons) || [];
      this.twinFallback = (rs.find((x) => /^unusable/.test(x)) || rs[0] || 'the layout gave no result')
        .replace(/^unusable, the page shows classic: /, '');
      root.ui = 'classic';
      delete root.tier;
      this.twinSig = '';
      this.rebuildClassic(W, H);
      return;
    }
    this.twinFallback = null;
    root.ui = 'twin';
    skirtFit = true;
    const S = r.spec;
    // Control ids are stable: a rebuild with the same controls keeps what is
    // armed, open or being assigned; only a control gone resets it
    const sig = S.controls.map((c) => c.id).sort().join(' ');
    const snap = this.twin && sig === this.twinSig ? this.snapshot() : null;
    this.twin = { spec: S, info: r.info, W, H, pointer, mode, settings, budget: used, reason: r.reason,
      ctl: new Map(S.controls.map((c) => [c.id, c])), keys: new Map(), guard: guardGeometry(S) };
    this.twinSig = sig;
    // the tiers drawn, the next layout's hysteresis (viewer.js, its size classes)
    this.twinClasses = classesOf(r, this.twinClasses);
    root.tier = r.info.tier;

    this.padCell = padKey;
    this.padBox = 3 * this.padCell + 2 * PAD_GAP;
    this.caseless = !P.get('case');
    this.portrait = H > W;
    root.skin = { light: 'light', gamecube: 'gamecube' }[P.get('style')] || 'terminal';
    root.case = this.caseless ? 'off' : 'on';
    root.phosphor = P.get('phosphor');
    root.layout = this.portrait ? 'portrait' : 'landscape';
    // CSS px, as layout() gives them: no scale
    this.s = 1;
    this.DW = W;
    this.DH = H;
    for (const layer of [this.caseEl, this.keysEl]) {
      layer.style.width = `${W}px`;
      layer.style.height = `${H}px`;
      layer.style.transform = '';
    }
    this.caseEl.innerHTML = '';
    this.keysEl.innerHTML = '';
    this.resetState();
    this.buildTwinCase();
    // the halos first, under every key; the cells over them; the seams last
    this.buildHalos(this.keysEl);
    this.buildKeys();
    this.applyCells();
    this.buildSeams(this.keysEl);
    if (snap) this.restoreState(snap);
    this.ghostSpots = this.portrait ? [] : this.classicDeck(W, H);
    this.habitSpots = this.classicHabits(W, H);

    // The bands are the layout's, messages first: the message band's rows and
    // width are what web.js pages the game's messages by (bandMetrics), so
    // --More-- comes exactly when the band shown is full.  headerOver: the
    // bands stand over the banks, outside the glass, each its own pane.
    const [msgBand, statusBand] = S.bands;
    this.geom = {
      s: 1, W, H, twin: true, caseless: this.caseless, portrait: this.portrait,
      glass: { ...S.glass, r: this.caseless ? 0 : 10 },
      map: S.mapArea, msgBand, statusBand, msgRows: r.info.fill.rows_msg, cell: r.info.T,
      headerOver: !!r.info.G.over, textScale, statusLinesH: statusH,
      // The panels the layout leaves room for, the message log and the
      // inventory (its chrome), which web.js lays out and fills
      // (layoutPanels).  'beyond': a log under the band's rows (a phone's, in
      // the glass under the map), which shows the history the band no longer
      // shows; a tablet's shows all of it.
      panels: S.chrome.filter((c) => /^panel: (message log|inventory)\b/.test(c.name)).map((c) => ({
        kind: c.name.startsWith('panel: inventory') ? 'inventory' : 'log',
        beyond: /under the band/.test(c.name), x: c.x, y: c.y, w: c.w, h: c.h })),
    };
    this.host.glassChanged(this.geom);
  }

  // a twin control's rect, from the layout
  tw(id) { const c = this.twin.ctl.get(id); return { x: c.x, y: c.y, w: c.w, h: c.h }; }
  // the key built for a control, for the lamps, the ghost deck and the checks
  twinKey(id, k) { if (this.twin) { this.twin.keys.set(id, k); (k.el || k).dataset.tw = id; } return k; }
  twinEl(id) {
    const k = this.twin && this.twin.keys.get(id);
    return k ? k.el || k : null;
  }
  // the keycap of a control as drawn: its key's .kcap, inset in its hit cell
  // (REST's slot holds the face that shows)
  twinCapRect(id) {
    if (id === 'rest' && this.restWell) return (this.restWell.revealed ? this.longFace : this.restFace).capRect();
    const k = this.twin && this.twin.keys.get(id);
    return k ? (k.capRect ? k.capRect() : k.getBoundingClientRect()) : null;
  }

  // ---- twin banks: what a rebuild keeps (control ids are stable)
  snapshot() {
    const hubId = (hv) => (hv && hv.hub ? hv.hub.id : null);
    return {
      armed: this.armed, armedBy: this.armedBy,
      fanOpen: this.fanOpen, radialOpen: this.radialOpen, ctxRadialOpen: this.ctxRadialOpen,
      candOpen: this.candOpen, chipsOpen: this.chipsOpen,
      assign: this.assign, assignTarget: this.assignTarget, assignHub: this.assignHub,
      drawerOpen: this.drawerOpen, drawerHub: this.drawerHub, assigning: !!this.assigning,
      assignPrompt: this.assigning && this.drawerCount ? this.drawerCount.textContent : null,
      fill: this.fill ? { hub: hubId(this.fill.hv), attack: this.fill.attack, n: this.fill.n } : null,
      drawerScroll: this.drawerGrid ? this.drawerGrid.scrollTop : 0,
      restRevealed: !!(this.restWell && this.restWell.revealed),
      // a layer on the pad that stays up: a count, CONTEXT's HERE and the
      // stairs lit in it, the stairs' first tap (a layer held under a thumb is
      // never rebuilt under it)
      padLayer: this.padLayer ? { kind: this.padLayer.kind, act: this.padLayer.act, fromId: this.padLayer.fromId,
        from: this.padLayer.from === 'context' ? 'context' : null, sticky: !!this.padLayer.sticky,
        lit: this.padLayer.lit ?? null } : null,
    };
  }

  restoreState(s) {
    if (s.assign) {
      // a command in hand: its destinations light again (pickUp, without its closing)
      this.assign = s.assign;
      this.assignTarget = s.assignTarget;
      this.assignHub = s.assignHub;
      if (s.assignTarget === 3) {
        const hv = this.hubView(s.assignHub);
        if (hv) { this.fanOpen = hv.hub.id; hv.face.lit(true); }
      }
    }
    if (s.fanOpen && !this.fanOpen) {
      const hv = this.hubView(s.fanOpen);
      if (hv) {
        this.fanOpen = hv.hub.id;
        this.paintLayer(hv.hub);
        hv.face.lit(true).sub('tap = all');
        if (hv.hub === C.HUB_ATTACK) this.refreshSlots(hv, true);
      }
    }
    if (s.radialOpen === FLICK_ID) {
      this.radialOpen = FLICK_ID;
      const radial = this.radials.get(FLICK_ID);
      if (radial) radial.style.display = '';
    }
    if (s.chipsOpen && !s.padLayer) this.chipsOpen = s.chipsOpen;
    if (s.candOpen && this.candidates.length > 1) this.toggleCandidates();
    if (s.ctxRadialOpen) this.openContextRadial();
    if (s.padLayer) this.reopenPadLayer(s.padLayer);
    if (s.drawerOpen) {
      this.openDrawer(s.drawerOpen, s.drawerHub ? C.HUBS.find((h) => h.id === s.drawerHub.id) || null : null);
      if (s.fill) {
        const hv = this.hubView(s.fill.hub);
        if (hv) this.fill = { hv, attack: s.fill.attack, n: s.fill.n };
      }
      if (s.assigning) this.setAssigning(true, s.assignPrompt || undefined);
      this.drawerGrid.scrollTop = s.drawerScroll;
    }
    if (s.armed) {
      this.armed = s.armed;
      this.armedBy = s.armedBy;
      this.refreshPadCentre();
      this.banner.label(`${s.armed.word.toUpperCase()} — PICK A DIRECTION`, 10).show(true);
      this.fitBanner();
    }
    if (s.restRevealed) this.scrollWell(true);
    this.refreshAllSlots();
    this.updateHubSubLines();
    this.refreshContextStrip();
    this.updateLamps();
    this.syncModal();
  }

  // ---- the ghost deck (the design's section 6, item 8).  On twin banks in
  // landscape, today's deck keys -- COMBAT, PIN 2, FLICK, LOOK, CONTEXT --
  // have gone from the bottom of the screen to the right bank, and their old
  // spots are map.  A map tap on one (its rect and 8 dp round it), whenever
  // the tap would travel, previews instead: the old key's name flashes there
  // with an arrow to its new home and web.js outlines the cell; a second tap
  // on the same cell within 2 s walks.  A preview left unconfirmed is a
  // catch: the player meant the old key.  A session starts with the page or
  // a new game, ends after 30 minutes without input, and counts once 100
  // turns are played in it while the deck could act -- twin banks in
  // landscape, the deck on: turns played in classic or in portrait, where no
  // tap can be caught, count for nothing, or a player who kept classic for a
  // while, or began in portrait, would find the deck retired before ever
  // meeting it (the review, 2026-10-02).  Three sessions that count in a row
  // with no catch retire the deck, and Settings brings it back.  A player who
  // taps to travel is never held back by it: a confirmed preview counts for
  // nothing.
  ghostState() { return { on: true, clean: 0, session: null, ...(P.get('ghostDeck') || {}) }; }
  ghostOn() { return this.ghostState().on !== false; }
  setGhostOn(on) { P.set('ghostDeck', { ...this.ghostState(), on, clean: 0 }); }
  // whether a tap could be caught now: what a session's turns count
  ghostLive() { return !!(this.twin && !this.portrait && this.ghostSpots && this.ghostSpots.length && this.ghostOn()); }

  // the session before is counted, and a new one begins
  nextGhostSession(g) {
    const was = g.session && { ...g.session, turns: Math.max(g.session.turns || 0, this.liveTurns || 0) };
    this.liveTurns = 0;
    if (was && was.turns >= SESSION_TURNS) {
      g.clean = was.caught ? 0 : (g.clean || 0) + 1;
      if (g.clean >= GHOST_SESSIONS) g.on = false;
    }
    g.session = { turns: 0, caught: false };
    return g;
  }
  startGhostSession() {
    this.lastInput = Date.now();
    this.lastTurn = null;
    P.set('ghostDeck', this.nextGhostSession(this.ghostState()));
  }
  noteInput() {
    const now = Date.now();
    if (now - (this.lastInput || now) > SESSION_IDLE_MS) P.set('ghostDeck', this.nextGhostSession(this.ghostState()));
    this.lastInput = now;
  }
  // The game's turn counter (web.js, from the status line).  The turns since
  // the last report count while the deck is live; a turn lower than the last
  // is a new game, and a new session.
  setTurn(t) {
    if (!(t >= 0)) return;
    const last = this.lastTurn;
    this.lastTurn = t;
    if (last === null || last === undefined || t === last) return;
    if (t < last) { P.set('ghostDeck', this.nextGhostSession(this.ghostState())); return; }
    if (!this.ghostLive()) return;
    // kept here, and stored each time it passes another ten turns
    const was = this.liveTurns || 0, turns = was + (t - last);
    this.liveTurns = turns;
    if (Math.floor(turns / 10) === Math.floor(was / 10)) return;
    const g = this.ghostState();
    P.set('ghostDeck', { ...g, session: { caught: false, ...(g.session || {}), turns } });
  }
  ghostCaught() {
    const g = this.ghostState();
    if (g.session && !g.session.caught) P.set('ghostDeck', { ...g, session: { ...g.session, caught: true } });
  }

  // Classic's geometry in this window, scale and all, without building it:
  // where a thumb that learned classic reaches.  at() is a design-dp box in
  // CSS px with the ghost deck's 8 dp round it.
  classicGeom(W, H, portrait) {
    const g = Object.create(Overlay.prototype);
    Object.assign(g, { padCell: this.padCell, padBox: this.padBox, caseless: this.caseless, portrait });
    const s = Math.min(1, Math.max(FIT_FLOOR, Math.min(W / g.needW(), H / g.needH())));
    g.s = s; g.DW = W / s; g.DH = H / s;
    g.at = (b) => ({ x: b.x * s - GHOST_SLOP, y: b.y * s - GHOST_SLOP, w: b.w * s + 2 * GHOST_SLOP, h: b.h * s + 2 * GHOST_SLOP });
    return g;
  }

  // Today's landscape deck, as classic lays it out in this window (its scale
  // and all), in CSS px: the spots a thumb has learned.
  classicDeck(W, H) {
    const g = this.classicGeom(W, H, false), at = g.at;
    const A = C.HUB_ATTACK;
    return [
      { id: 'combat', name: 'COMBAT', r: at(g.cb(g.hubW(A), g.hubH(A), g.hubCx(A), g.hubCy(A))) },
      { id: 'pin2', name: 'PIN 2', r: at(g.termAttackSlot(1)) },
      { id: 'flick', name: 'FLICK', r: at(g.termAttackSlot(2)) },
      { id: 'look', name: 'LOOK', r: at(g.termStripBox(0)) },
      { id: 'context', name: 'CONTEXT', r: at(g.termStripBox(1)) },
    ];
  }

  // ---- the ghost deck's two habit guards (the design's section 6, item 8;
  // section 15), while the deck is on, in either orientation:
  //  - classic's pad centre opened a radial that stayed up for a tap; twin
  //    banks' HERE is slide-only and closes on the lift, so the habitual tap
  //    would land on whatever lies where a node was (M1, PIN 1, the map...).
  //    A hold of the centre that lifts without a slide says "HERE: SLIDE" in
  //    the pill, and for 1.5 s a tap on any of the old nodes' spots is
  //    swallowed, with the same word;
  //  - classic's SACRIFICE was prayed to by a 380 ms hold, then y on ↖ for the
  //    game's question.  Its spot is REST in landscape, GAME in portrait now,
  //    so the y would walk the hero north-west.  A hold of 380 ms there that
  //    did nothing else shows, as it lifts, where SACRIFICE went, and the
  //    next pad tap within 1.5 s is swallowed.  REST's own hold is the same
  //    gesture: one that set a count, by a slide or by staying up to be
  //    tapped, is no habit, and armed nothing -- it once flashed SACRIFICE
  //    at every count, ate the next step and kept the ghost deck from
  //    retiring (the layers stage's review, 2026-10-03).
  // Either swallow is a catch: the player meant the old way.
  classicHabits(W, H) {
    const g = this.classicGeom(W, H, H > W), at = g.at;
    const cx = g.termInner() + g.padBox / 2, cy = g.Y(g.termInner() + g.padBox / 2), r = g.ctxRadialRadius();
    const radial = C.CTX_RADIAL.map((act, n) => {
      const a = rad(CTX_RADIAL_A0 + n * CTX_RADIAL_STEP);
      return at({ x: cx + Math.cos(a) * r - CTX_RADIAL_SIZE / 2, y: cy + Math.sin(a) * r - CTX_RADIAL_SIZE / 2, w: CTX_RADIAL_SIZE, h: CTX_RADIAL_SIZE });
    });
    let pray;
    if (g.portrait) pray = g.lb(T_KEY, P_ROW_H, g.termInner(), g.pRowBottom(1));
    else {
      // where placeRow2() puts the left bank's middle row
      const row1Bottom = g.termInner() + T_ROW1_H, row3Top = g.DH - g.termRow3Bottom() - T_KEY;
      pray = g.tl(T_KEY, T_KEY, g.termInner(), Math.max(g.termRow2Top(), (row1Bottom + row3Top - T_KEY) / 2));
    }
    return { radial, pray: at(pray) };
  }

  // A touch on a habit's spot while its guard is up: swallowed whole, its
  // move and lift too (watchGuard), whatever lies under it.
  habitSwallows(e) {
    const H = this.habit;
    if (!H || !this.twin || !this.habitSpots) return false;
    if (performance.now() > H.until) { this.habit = null; return false; }
    const x = e.clientX, y = e.clientY, inR = (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    if (H.kind === 'radial' ? !this.habitSpots.radial.some(inR) : this.padPlaceAt(x, y) === null || !this.padWalks()) return false;
    if (H.kind === 'pray') this.habit = null;   // only the next pad tap
    FB.tick();
    this.ghostCaught();
    this.noteGuard(`habit ${H.kind}`, e);
    if (H.kind === 'radial') this.pillFlash('HERE: SLIDE');
    else this.prayShow();
    return true;
  }

  // A pad tap is a danger only where it would walk: the pad showing its
  // arrows, nothing over it.  A layer takes it as a place, and a drawer's or
  // a window's backdrop as a close.
  padWalks() {
    return !this.padLayer && !this.fanOpen && !this.answering && !this.drawerOpen && !this.picking
      && !this.scrim.classList.contains('on') && !(this.host.guardsAside && this.host.guardsAside());
  }

  // A hold of the old SACRIFICE spot, from its touch to its lift.  The lift's
  // verdict waits for the key's own lift (a capture listener runs first): a
  // hold of 380 ms that set nothing is the habit -- where SACRIFICE went
  // shows, and the next pad tap's 1.5 s begin.  What a hold did with its
  // time was meant, and holdMeant() marks the hold's own record, by its
  // pointer, so the other thumb's hold meanwhile marks nothing:
  //  - a count picked by a slide, or a count layer left up to be tapped
  //    (countHold);
  //  - REST's strip slid to show or put away Long rest (bindScrollWell): a
  //    slow swipe of it in landscape flashed SACRIFICE, ate the next step
  //    and marked the session caught (the layers stage's re-check,
  //    2026-10-03);
  //  - a key's own hold, M1's macro editor or a hub's layer, where its key
  //    reaches into the spot's 8 dp (bindHold).
  // A key whose lift is its tap -- GAME, the whole spot in portrait and at
  // 640x360, up to a third of it on a phone in landscape; WORLD at its edge
  // -- set nothing by the hold: the flash says, over the drawer the tap
  // opened, where SACRIFICE went, and the drawer's backdrop takes the y
  // (habitSwallows lets it).
  prayHabit(e) {
    const r = this.habitSpots && this.habitSpots.pray;
    if (!r || !this.twin || !this.ghostOn()) return;
    if (!(e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h)) return;
    this.prayHold = { id: e.pointerId, at: performance.now(), meant: false };
  }
  // the touch's hold did something with its time: no habit
  holdMeant(id) {
    if (this.prayHold && this.prayHold.id === id) this.prayHold.meant = true;
  }
  prayLift(e) {
    const hold = this.prayHold;
    if (!hold || hold.id !== e.pointerId) return;
    if (e.type !== 'pointerup' || performance.now() - hold.at < HUB_HOLD_MS) { this.prayHold = null; return; }
    // kept till the key's own lift has run, which may yet mark it (countHold)
    setTimeout(() => {
      if (this.prayHold === hold) this.prayHold = null;
      if (hold.meant || !this.twin) return;
      this.habit = { kind: 'pray', until: performance.now() + HABIT_MS };
      this.prayShow();
    }, 0);
  }
  prayShow() {
    if (this.habitSpots) this.ghostShow({ id: 'sacrifice', name: 'SACRIFICE', r: this.habitSpots.pray });
  }

  // the pad centre lifted without a slide while its HERE was up
  radialHabit() {
    if (!this.twin || !this.ghostOn() || !this.habitSpots) return;
    this.habit = { kind: 'radial', until: performance.now() + HABIT_MS };
    this.pillFlash('HERE: SLIDE');
  }

  // a word on the layer pill with no layer up, for the habit guards
  pillFlash(text) {
    const pill = this.layerPill;
    if (!pill || this.padLayer || this.fanOpen) return;
    pill.style.setProperty('--acc', '#c2b6ff');
    pill.textContent = text;
    pill.classList.add('on');
    clearTimeout(this.pillTimer);
    this.pillTimer = setTimeout(() => { if (!this.padLayer && !this.fanOpen) pill.classList.remove('on'); }, HABIT_MS);
  }

  // the old deck spot under a map tap, while the deck is on
  ghostAt(x, y) {
    if (!this.twin || this.portrait || !this.ghostOn() || !this.ghostSpots) return null;
    return this.ghostSpots.find((g) => x >= g.r.x && x <= g.r.x + g.r.w && y >= g.r.y && y <= g.r.y + g.r.h) || null;
  }

  ghostShow(g) {
    const e = this.ghostEl, k = this.twinEl(g.id);
    if (!e || !k) return;
    const kr = this.twinCapRect(g.id), m = this.twin.spec.mapArea;
    const fx = g.r.x + g.r.w / 2, fy = g.r.y + g.r.h / 2;
    const deg = (Math.atan2(kr.x + kr.width / 2 - fx, -(kr.y + kr.height / 2 - fy)) * 180) / Math.PI;
    e.innerHTML = `<b>${g.name}</b>${ARROW_SVG(deg)}`;
    e.classList.add('on');
    const w = e.offsetWidth, h = e.offsetHeight;
    // above the tapped spot, so the outlined cell under the thumb stays in view
    e.style.left = `${clamp(fx - w / 2, m.x + POP_PAD, m.x + m.w - POP_PAD - w)}px`;
    e.style.top = `${clamp(fy - h - 22, m.y + POP_PAD, m.y + m.h - POP_PAD - h)}px`;
    if (this.ghostLit && this.ghostLit !== k) this.ghostLit.classList.remove('ghostlit');
    this.ghostLit = k;
    k.classList.add('ghostlit');
    clearTimeout(this.ghostTimer);
    this.ghostTimer = setTimeout(() => { e.classList.remove('on'); k.classList.remove('ghostlit'); }, GHOST_FLASH_MS);
  }

  resetState() {
    P.macros();   // first run with the flick key moves the retired third point's command first
    this.atkSlotKeys = (this.twin ? twinPins() : P.get('atkSlots') || C.ATK_SLOT_DEFAULT).slice(0, C.ATK_SLOT_DEFAULT.length);
    this.equipSlotKeys = (P.get('equipSlots') || C.EQUIP_SLOT_DEFAULT).slice();
    this.fanKeys = new Map();
    for (const h of C.HUBS) if (h.fan.length) this.fanKeys.set(h.id, P.fanSlots(h.id, h.fan.map((it) => (it ? it.key : null))));
    this.flickFace = null;
    this.flickNodes = [];
    this.layerFrame = null;
    this.padMold = null;
    this.hubs = [];
    this.fanOpen = null;
    this.drawerOpen = null;
    this.drawerHub = null;
    this.armed = null;
    this.armedBy = null;      // twin banks: the key that armed, whose ARMED lamp is lit
    this.ctxRadialOpen = false;
    // twin banks' layers on the pad (closePadLayer): { kind: 'count' | 'here'
    // | 'stairs', ... }; hubs' layers are fanOpen, as in classic
    if (this.padLayer) clearTimeout(this.padLayer.timer);
    this.padLayer = null;
    clearTimeout(this.idleTimer);
    this.idleTimer = 0;
    this.radialOpen = null;
    this.radials = new Map();
    this.assign = null;
    this.assignTarget = 0;
    this.assignHub = null;
    this.fill = null;
    this.chipsOpen = null;
    this.candOpen = false;
    this.candidates = [];
    this.candSig = '';
    this.ctxActions = [C.CTX_LOOK, null, C.CTX_SEARCH];
    this.ctxStrip = [];
    this.chipRows = [];
    this.topRight = [];
    this.macroKeys = [];
    this.padCells = [];
  }

  // The design size the case needs at scale 1 (RhOverlay.termNeedW/H, pNeedW/H).
  needW() {
    if (this.portrait) return 2 * (MARGIN + this.termBank()) + P_BANK_GAP;
    return 2 * (MARGIN + this.termBank() + MARGIN) + T_MIN_HOOD;
  }
  needH() {
    if (this.portrait) return this.pControlsH() + LIP + P_HOOD_TOP + MARGIN + P_MIN_GLASS;
    const left = 2 * this.termInner() + T_ROW1_H + 2 * T_KEY + 3 * T_ROW_GAP + this.padBox;
    const right = 2 * this.termInner() + T_ROW1_H + 10 + T_EQ_BAR + 8 + 2 * T_EQ_CELL_H + T_GAP
      + 8 + 2 * (T_SPARE_H + T_GAP) + T_SEARCH_H;
    return Math.max(left, right);
  }

  termInner() { return MARGIN + WELL_PAD; }
  termBank() { return this.padBox + 2 * WELL_PAD; }
  termWideKey() { return this.padBox - T_KEY - T_GAP; }
  termRow2Top() { return this.termInner() + T_ROW1_H + T_ROW_GAP; }
  termRow3Bottom() { return this.termInner() + this.padBox + T_ROW_GAP; }
  termDeckLeft() { return MARGIN + this.termBank() + MARGIN + WELL_PAD; }
  termDeckBottom() { return MARGIN + (DECK_H - DECK_KEY) / 2; }
  termEqTop() { return this.termInner() + T_ROW1_H + 10; }
  glassSide() {
    if (this.portrait) return MARGIN + (this.caseless ? 0 : P_HOOD_SIDE);
    return MARGIN + this.termBank() + MARGIN + (this.caseless ? 0 : HOOD_SIDE);
  }
  glassTop() { return MARGIN + (this.caseless ? LAMP_STRIP : this.portrait ? P_HOOD_TOP : HOOD_TOP); }
  glassBottom() {
    if (this.portrait) return this.pControlsH() + (this.caseless ? 0 : LIP);
    return MARGIN + DECK_H + MARGIN + (this.caseless ? 0 : LIP);
  }

  // portrait, derived: design dp from the nearest edge, as above
  /** A bank's well: its pad and the two rows over it. */
  pWellH() { return 2 * WELL_PAD + this.padBox + 2 * (P_ROW_GAP + P_ROW_H); }
  /** The key row's well. */
  pFnH() { return 2 * WELL_PAD + P_FN_KEY; }
  /** From the bottom edge up to the hood: the banks, the key row and the gaps round them. */
  pControlsH() { return 3 * MARGIN + this.pWellH() + this.pFnH(); }
  pFnBottom() { return 2 * MARGIN + this.pWellH() + WELL_PAD; }
  /** The bank rows over the pads: 0 sits on the pad, 1 over that. */
  pRowBottom(row) { return this.termInner() + this.padBox + P_ROW_GAP + row * (P_ROW_H + P_ROW_GAP); }
  /** The right bank's action pad, by column and row from its top-left, measured like the numpad. */
  pCellRight(col) { return this.termInner() + (2 - col) * (this.padCell + PAD_GAP); }
  pCellBottom(row) { return this.termInner() + (2 - row) * (this.padCell + PAD_GAP); }
  pCell(col, row) { return this.rb(this.padCell, this.padCell, this.pCellRight(col), this.pCellBottom(row)); }
  pCellCx(col) { return -(this.pCellRight(col) + this.padCell / 2); }
  pCellCy(row) { return this.pCellBottom(row) + this.padCell / 2; }
  /** The key row shares the width out: slot 0 is REST, wider; 1 to 7 are MSGS, MENU..KEYS, M2, M3. */
  pFnInner() { return this.DW - 2 * this.termInner(); }
  pFnWideW() { return clamp(this.pFnInner() * 0.2, 70, 120); }
  pFnKeyW() { return (this.pFnInner() - this.pFnWideW() - (P_FN_KEYS - 1) * T_GAP) / (P_FN_KEYS - 1); }
  pFnBox(slot) {
    const left = slot === 0 ? this.termInner()
      : this.termInner() + this.pFnWideW() + T_GAP + (slot - 1) * (this.pFnKeyW() + T_GAP);
    return this.lb(slot === 0 ? this.pFnWideW() : this.pFnKeyW(), P_FN_KEY, left, this.pFnBottom());
  }

  // boxes, as RhOverlay's LayoutParams helpers; x < 0 is from the right edge
  X(cx) { return cx >= 0 ? cx : this.DW + cx; }
  Y(cyFromBottom) { return this.DH - cyFromBottom; }
  tl(w, h, left, top) { return { x: left, y: top, w, h }; }
  lb(w, h, left, bottom) { return { x: left, y: this.DH - bottom - h, w, h }; }
  rb(w, h, right, bottom) { return { x: this.DW - right - w, y: this.DH - bottom - h, w, h }; }
  tr(w, h, right, top) { return { x: this.DW - right - w, y: top, w, h }; }
  cb(w, h, cx, cy) { return { x: this.X(cx) - w / 2, y: this.Y(cy) - h / 2, w, h }; }

  // ---- the case (RhCase)
  buildCase() {
    const m = MARGIN, bank = this.termBank(), DW = this.DW, DH = this.DH;
    const rect = (cls, x, y, w, h) => {
      const e = el('div', cls, this.caseEl);
      Object.assign(e.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
      return e;
    };
    let hoodX, hoodW, hoodBottom;
    if (this.portrait) {
      // RhCase's portrait: the banks along the bottom, the key row's well over them
      // across the whole width, and the hood above that
      const well = this.pWellH(), fn = this.pFnH(), top = DH - m - well;
      rect('well', m, top, bank, well);
      rect('well', DW - m - bank, top, bank, well);
      rect('well', m, top - m - fn, DW - 2 * m, fn);
      hoodX = m;
      hoodW = DW - 2 * m;
      hoodBottom = top - m - fn - m;
    } else {
      rect('well', m, m, bank, DH - 2 * m);
      rect('well', DW - m - bank, m, bank, DH - 2 * m);
      hoodX = m + bank + m;
      hoodW = DW - 2 * hoodX;
      rect('well', hoodX, DH - m - DECK_H, hoodW, DECK_H);
      hoodBottom = DH - m - DECK_H - m;
    }
    rect('hood', hoodX, m, hoodW, hoodBottom - m);
    const lip = this.caseless ? rect('lip', hoodX, m, hoodW, LAMP_STRIP)
                              : rect('lip', hoodX, hoodBottom - LIP, hoodW, LIP);
    lip.innerHTML = '<div class="lamps"><span class="search"><i></i>SEARCH</span>'
      + '<span class="armed"><i></i>ARMED</span><span class="more"><i></i>MORE</span></div>'
      + '<div class="plate"><b>ROLEHACK</b><em>RH-5</em></div>';
    this.lamps = lip.querySelector('.lamps');
    this.updateLamps();
  }

  updateLamps() {
    if (this.twin) { this.twinLamps(); return; }
    if (!this.lamps) return;
    this.lamps.querySelector('.search').classList.toggle('on', !!P.get('searchMode'));
    this.lamps.querySelector('.armed').classList.toggle('on', !!this.armed);
    this.lamps.querySelector('.more').classList.toggle('on', this.more > 0);
  }

  // ---- the twin banks' case: the two wells, each as far as its bank's guard
  // halo reaches, their rims the halo's edge (the design's section 6), and the
  // glass's bezel (rolehack.css).  The hood and the lip go; their lamps move
  // onto the keys (twinLamps).  Caseless, there are no wells: the keys stand
  // on the dark, and the rects are the same.
  buildTwinCase() {
    this.lamps = null;
    if (!this.caseless) {
      for (const d of this.twin.spec.decor) {
        if (!/\bwell\b/.test(d.name)) continue;
        const e = el('div', 'well twin', this.caseEl);
        Object.assign(e.style, { left: `${d.x}px`, top: `${d.y}px`, width: `${d.w}px`, height: `${d.h}px` });
      }
    }
    if (!$('morelamp')) {
      const m = el('span', '', $('bands'));
      m.id = 'morelamp';
      m.title = 'MORE';
    }
  }

  // Twin banks' lamps sit on what they describe (the design's section 10):
  // SEARCH's on the SEARCH keycap, ARMED on the key that armed -- COMBAT, or
  // the pin that holds Fight -- and MORE at the right end of the message band.
  twinLamps() {
    const k = (id) => this.twin.keys.get(id);
    // and while Fight is armed the pad tints red (the design's section 10)
    if (this.padMold) this.padMold.classList.toggle('armed', !!this.armed);
    if (k('search')) k('search').lamp(!!P.get('searchMode'));
    for (const id of ['combat', ...TWIN_PINS]) {
      if (!k(id)) continue;
      const on = !!this.armed && (this.armedBy || 'combat') === id;
      // COMBAT keeps its lamp, dark until it arms; a pin's shows only while lit
      k(id).lamp(id === 'combat' || on ? on : null, 'armed');
    }
    const more = $('morelamp');
    if (more) more.classList.toggle('on', this.more > 0);
  }

  // ---- twin banks: the near-miss guard (the design's section 6).  A tap
  // meant for a key must neither walk the hero nor fire another key.  Each
  // key's box is its hit cell (Key.cell, guardGeometry): the cells tile the
  // bank out to the screen's edge on its outer side and bottom, and the pads
  // own the gap above them up to the next row's keycap, so an overshoot from
  // the pad stays on the pad.  Under the cells, a halo 12 dp round each bank:
  // a tap within 8 dp of a keycap is that key's, and one 8 to 12 dp off is
  // swallowed, with a light tick and the halo's edge flashing.  Over the
  // action pad, whose keys act at once, the seams between keycaps (the drawn
  // gap, at least 8 dp) swallow the same way, so a near miss between COMBAT
  // and CONTEXT is a lost tap, not the wrong verb.  The map keeps 12 dp from
  // every key (layout.js), and its 20 dp next to a halo is the confirm ring
  // (web.js glassGestures).
  //
  // The guard acts whenever a tap could do harm, which is everywhere except
  // at --More--, in getpos (farlook, travel, a target: the tap picks the spot)
  // and under a menu or text window (host.guardsAside).  There a tap does
  // what it always did: the halo still snaps to a key, and the rest of it and
  // the seams take nothing, the tap going on to whatever lies under them.
  // With Fight armed or a layer up the guard stays on.
  //
  // With the scrim up (a layer, a radial, a command in hand) only the keys
  // lifted over it answer, and the guard guards those: the halos stand over
  // the scrim and the seams over the lifted keys (syncModal), a near miss of
  // a lifted key snaps to it or is swallowed as it would be with nothing
  // open, and any other touch goes on to the scrim, which closes what is
  // open, as a touch on a key under it does.  Under the scrim, the other
  // thumb's tap on a count or a HERE place that fell a few dp off the pad's
  // inner side closed the layer instead of picking the place.
  guardsAside() { return !!this.picking || !!(this.host.guardsAside && this.host.guardsAside()); }

  // a key that answers a touch now: any, or with the scrim up one lifted over it
  keyLive(id) {
    if (!this.scrim || !this.scrim.classList.contains('on')) return true;
    const t = this.keyTarget(id);
    return !!(t && t.closest('.lift, .lift2'));
  }

  buildHalos(K) {
    for (const B of Object.values(this.twin.guard.banks)) {
      const h = el('div', 'halo', K), r = B.halo;
      Object.assign(h.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
      // the corner into the screen is 12 dp round the bank's last keycap
      if (r.corner) h.style[B.outerLeft ? 'borderTopRightRadius' : 'borderTopLeftRadius'] = `${HALO}px`;
      h.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const g = this.guardAt(e.clientX, e.clientY), live = !!g && this.keyLive(g.id);
        if (live && g.snap) { this.noteGuard('snap', e, g.id); this.forwardDown(e, this.keyTarget(g.id)); return; }
        if (live && g.d <= HALO && !this.guardsAside()) { this.guardSwallow(h, 'halo', e, g.id); return; }
        this.passDown(e, h);
      });
    }
  }

  buildSeams(K) {
    for (const r of this.twin.guard.seams) {
      const s = r.el = el('div', 'seam', K);
      Object.assign(s.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
      s.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const g = this.guardAt(e.clientX, e.clientY);
        if (!this.guardsAside() && (!g || this.keyLive(g.id))) { this.guardSwallow(s, 'seam', e, null); return; }
        this.passDown(e, s);
      });
    }
  }

  // The halos over the scrim (under the keys lifted over it), the seams over
  // those keys, while the scrim is up; in their places under and over the
  // keys when it goes.  (The scrim stands at 5, the lifted keys at 10 and 11.)
  liftGuard(on) {
    for (const e of this.keysEl.querySelectorAll(':scope > .halo, :scope > .seam')) {
      e.style.zIndex = on ? (e.classList.contains('halo') ? '6' : '12') : '';
    }
  }

  // every bank key's element made its hit cell, in its parent's px (the pad's
  // keys sit in their mold); REST's slot was built as its cell
  applyCells() {
    for (const [id, k] of this.twin.keys) {
      const c = this.twin.guard.cells.get(id);
      if (!c || !(k instanceof Key) || k.hit) continue;
      const at = this.tw(id), dx = at.x - k.kx, dy = at.y - k.ky;
      k.cell({ x: c.x - dx, y: c.y - dy, w: c.w, h: c.h });
    }
  }

  // The nearest keycap to a point, and whether the halo snaps it there: within
  // 8 dp, or in portrait between the banks within half their gap less 2 dp
  // (8 whenever the gap is the rule's 24 dp or more), so the two snaps never
  // meet and the middle is swallowed (the hit model, checks/lib.mjs).
  guardAt(x, y) {
    const G = this.twin && this.twin.guard;
    if (!G) return null;
    let best = null;
    for (const c of G.live) {
      const d = Math.hypot(Math.max(c.x - x, 0, x - (c.x + c.w)), Math.max(c.y - y, 0, y - (c.y + c.h)));
      if (!best || d < best.d) best = { id: c.id, d };
    }
    if (!best) return null;
    let snap = SNAP;
    if (G.between && x > G.between.x0 && x < G.between.x1 && y >= G.between.y0) snap = Math.min(SNAP, G.between.w / 2 - 2);
    best.snap = best.d <= snap;
    return best;
  }

  // the element a key's touch goes to: REST's slot holds the face that shows
  keyTarget(id) {
    if (id === 'rest' && this.restWell) return (this.restWell.revealed ? this.longFace : this.restFace).el;
    const k = this.twin.keys.get(id);
    return k ? k.el || k : null;
  }

  // A touch the guard hands on: the same pointer's down, dispatched to the
  // element that takes it, which keeps the rest of the gesture -- its moves,
  // its lift or its cancel -- as if it had been touched there.  The capture
  // goes to it first, so whatever its handler does with it stands: a key
  // takes it again, and a halo that hands the touch on to a key lets the key
  // keep it (taken back afterwards, the key never saw its cancel and stayed
  // down).
  forwardDown(e, target) {
    if (!target) return;
    try { target.setPointerCapture(e.pointerId); } catch (x) { /* not a live pointer */ }
    target.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, composed: true, pointerId: e.pointerId, pointerType: e.pointerType,
      isPrimary: e.isPrimary, clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
      button: e.button, buttons: e.buttons, width: e.width, height: e.height, pressure: e.pressure,
    }));
  }

  // the guard stepping aside: the touch goes on to what lies under the halo or seam
  passDown(e, src) {
    const under = document.elementsFromPoint(e.clientX, e.clientY)
      .find((n) => n !== src && !n.classList.contains('halo') && !n.classList.contains('seam'));
    if (under) this.forwardDown(e, under.closest('button') || under);
  }

  // A swallowed near miss: a light tick, the halo's edge or the seam lit for
  // 150 ms, and the tap goes no further.
  guardSwallow(area, what, e, id) {
    FB.tick();
    this.noteGuard(what, e, id);
    area.classList.add('flash');
    clearTimeout(area.flashTimer);
    area.flashTimer = setTimeout(() => area.classList.remove('flash'), GUARD_FLASH_MS);
  }

  // What the guard did, the latest 200, for the near-miss test on a device
  // (the design's section 18, test 2): web.js adds the ring's catches.  The
  // console reads it as rolehackGuardLog().
  noteGuard(what, e, id = null) {
    const log = this.guardLog || (this.guardLog = []);
    log.push({ what, id, x: e ? Math.round(e.clientX) : null, y: e ? Math.round(e.clientY) : null, at: Date.now() });
    if (log.length > 200) log.shift();
  }

  // The guard's clock and the layers' idle, from the capture phase: every key
  // stops its pointer events, so nothing later in the page would see them.
  // keyUpAt is when a touch begun on a key, a halo or a seam last lifted
  // (web.js swallows a ring tap within 120 ms of it); any touch, as it lands
  // and as it lifts, is input that keeps a sticky layer up for another 4 s.
  // From the lift too: a hub's layer held open 3 s closed 1.4 s after the
  // thumb lifted, its 4 s run from the hold (the layers stage, 2026-10-03).
  watchGuard() {
    this.keyUpAt = -1e9;
    this.habit = null;
    const onKey = new Set(), swallowed = new Set();
    window.addEventListener('pointerdown', (e) => {
      if (this.retarget(e)) return;
      const t = e.target;
      if (t && t.closest && this.keysEl.contains(t) && t.closest('button.k, .well-slot, .halo, .seam')) onKey.add(e.pointerId);
      else onKey.delete(e.pointerId);
      if (this.idleTimer) this.armIdle();
      // the ghost deck's habit guards take the touch before anything under it
      if (this.habitSwallows(e)) {
        swallowed.add(e.pointerId);
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      this.prayHabit(e);
    }, true);
    window.addEventListener('pointerup', (e) => {
      if (onKey.delete(e.pointerId)) this.keyUpAt = performance.now();
      if (this.idleTimer) this.armIdle();
      this.prayLift(e);
    }, true);
    window.addEventListener('pointercancel', (e) => { onKey.delete(e.pointerId); this.prayLift(e); }, true);
    // a key from the keyboard is input too: a sticky layer stays its 4 s more
    window.addEventListener('keydown', () => { if (this.idleTimer) this.armIdle(); }, true);
    for (const type of ['pointermove', 'pointerup', 'pointercancel']) {
      window.addEventListener(type, (e) => {
        if (!swallowed.has(e.pointerId)) return;
        if (type !== 'pointermove') swallowed.delete(e.pointerId);
        e.stopImmediatePropagation();
      }, true);
    }
  }

  // Chrome moves a touch's pointerdown onto a tap target near it -- "touch
  // adjustment" (Blink's touch_adjustment.cc), which hit-tests the finger's
  // contact area, 20 to 32 dp across, and gives the touch to the button that
  // area best covers.  So a touch in a halo, on a seam or in the ring beside
  // a key went to the key: a 30 px touch 10 dp off pad_l, in the halo, and
  // 14 dp off, in the ring, both pressed pad_l, and a seam, which no listener
  // makes a tap target, never swallowed (the layers stage, 2026-10-03).  So
  // did a touch just past a halo, where the case, the glass or a band lies:
  // 14 dp above REST rested 20 turns, and in portrait 14 dp past the left
  // bank's inner edge, between the two halos, armed the right bank's COMBAT
  // (its review, 2026-10-03).  The pointerdown keeps the finger's own point,
  // so a touch goes back where it landed whenever Chrome moved it across the
  // guard's ground: wherever it begins on that ground -- a key's cell, a
  // halo, a seam or the map -- and Chrome gave it to another part of it, and
  // wherever Chrome gave a bank's key, halo or seam a touch that landed off
  // the banks.  Then the hit cells, halos, seams and ring decide as the
  // design has them -- between two keys, or a key and a seam, to the
  // fraction of a px (bankAt) -- and past a halo the case takes nothing and
  // a band does what a tap on it does.  Touches elsewhere -- a window's
  // buttons, a prompt's chips, the drawer, the FLICK legend, the scrim of an
  // open layer -- keep Chrome's help.  True when the touch was moved.
  retarget(e) {
    if (!this.twin || !e.isTrusted || e.pointerType !== 'touch' || !e.target || !e.target.closest) return false;
    const K = this.keysEl;
    const own = (n) => (n && n.closest ? n.closest('button.k, .well-slot, .halo, .seam, #map') : null);
    const bank = (n) => !!(n && n.closest && K.contains(n) && n.closest('.hitcell, .well-slot, .halo, .seam'));
    // at the whole px the touch is in: Chrome hit-tests a fractional point as
    // the next whole px, a px to the right and below; between two keys, or a
    // key and a seam, the guard's own geometry decides
    let real = document.elementFromPoint(Math.floor(e.clientX), Math.floor(e.clientY));
    if (real && K.contains(real) && real.closest('.hitcell, .well-slot, .seam')) real = this.bankAt(e.clientX, e.clientY) || real;
    if (!real || real === e.target) return false;
    const at = own(real), was = own(e.target);
    if (at ? at === was || !(K.contains(at) || (was && K.contains(was))) : !bank(e.target)) return false;
    e.preventDefault();
    e.stopImmediatePropagation();
    this.forwardDown(e, real.closest('button') || real);
    return true;
  }

  // The bank's key or seam whose box holds a point, by the guard's geometry
  // rather than by Chrome's hit test, which takes the px square from a point,
  // right and down, and gives it to the topmost box that square touches: a
  // cell's edge at 67.5 (the 3 dp gaps at 360 dp) gave the px at 67, 1 px
  // off pad_b's keycap, to pad_j beyond it (the layers stage, 2026-10-03).
  // A point on a keycap's own edge is that key's, as the nearest keycap is
  // (the pads' cells begin at the face of the row above them).  A key under
  // the scrim gives the scrim; null where no cell or seam holds the point.
  bankAt(x, y) {
    const G = this.twin.guard, inR = (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    const seam = G.seams.find((r) => r.el && inR(r));
    if (seam) return seam.el;
    const on = G.live.find((c) => G.cells.has(c.id) && x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
    const id = on ? on.id : [...G.cells].find(([, c]) => inR(c))?.[0];
    if (!id) return null;
    return this.keyLive(id) ? this.keyTarget(id) : this.scrim;
  }

  // The nearest keycap's distance from a point on the map, for web.js's ring;
  // null in classic, which has no guard, and at the desk, where a mouse's
  // click on the map is meant where it lands (the ring is for a thumb's
  // near miss).  The desk is deferred (Lucas, 2026-10-03): the page lays out
  // as for touch (rebuildTwin), so a mouse player has the ring too, as the
  // banks it plays with are the thumbs'.
  keyDistance(x, y) {
    if (this.twin && this.twin.spec.pointer === 'mouse') return null;
    const g = this.guardAt(x, y);
    return g ? g.d : null;
  }

  // a layer or the stairs' first tap is up: a map tap only closes it
  layerUp() { return !!(this.padLayer || this.fanOpen || this.radialOpen || this.ctxRadialOpen || this.candOpen || this.chipsOpen); }

  // ---- twin banks: layers on the pad (the design's section 8).  Every
  // layer paints the movement pad, which is the same in both orientations, so
  // a place is one thumb motion everywhere, and nothing pops over a key: the
  // layer's name is on the pill inside the map.  They replace the count-chip
  // rows, the pad centre's radial and CONTEXT's candidate fan.
  //  - COUNT: a hold of REST, SEARCH or a counted CONTEXT -- and of Long rest
  //    once it is swiped in -- puts the counts on the pad: ↖ ×1, ↑ ×5, ↗ ×10,
  //    → ×20 (Long rest ×100 to ×400), the centre any count, typed; the
  //    count in use lit.  Slide to one and lift, or tap one with the other
  //    thumb.  The layer closes when the thumb lifts, unless the hold lasted
  //    600 ms: an accidental hold of SEARCH once left a layer that took the
  //    next walking tap as "×5".
  //  - HERE: a hold of the pad centre, slide-only: slide to a place and lift;
  //    lifting without a slide closes it, so the pad is arrows again the
  //    moment the thumb lifts and a slow press on the stairs never turns the
  //    next step south into Descend.  CONTEXT's tap when several actions
  //    apply opens it to stay up and be tapped.  Its places are fixed --
  //    ↑ Ascend, ↓ Descend, ← Open, → Close, ↖ Sacrifice, ↗ Pick up, ↙ Loot,
  //    ↘ Look here, the centre ALL -- and a place the turn does not offer is
  //    dimmed and does nothing but tick.
  //  - From CONTEXT the stairs take a second tap within 2 s: CONTEXT sits
  //    beside COMBAT, and a near miss onto it must not change level.  With
  //    one action, CONTEXT's first tap lights the pad centre with them; a
  //    second tap on CONTEXT or the centre goes.  In its HERE, a tap on ↑ or
  //    ↓ lights the centre the same way, for CONTEXT or the centre to go.
  //    Never ↑ or ↓ themselves: COMBAT's tap is always followed by a tap of
  //    the pad that aims, and after a near miss onto CONTEXT that tap landed
  //    on the lit ↑ or ↓ and changed level (the layers stage's review,
  //    2026-10-03).  The centre is the one place no aim uses.  ↑ and ↓ only
  //    tick there, and on the one action's pad put the stairs away.  The pad
  //    centre's slide goes at once.
  // A layer left up drops back to arrows after 4 s with no input, or on a
  // map tap (the scrim, which closes anything open).  A place that asks for a
  // direction gives the pad straight back as arrows: the layer closes first.
  hereFrom(from) { return !!(this.padLayer && this.padLayer.kind === 'here' && this.padLayer.from === from); }

  // what any layer on the pad does first: everything else goes
  clearForPadLayer() {
    this.closeFan();
    this.closeRadial();
    this.closeDrawer();
    this.closePadLayer();
    this.disarm();
  }

  openCountLayer(act, from, fromId) {
    if (this.answering || !this.twin) return false;
    this.clearForPadLayer();
    this.padLayer = { kind: 'count', act, from, fromId, sticky: false };
    this.chipsOpen = act.countKey;
    this.paintCount();
    this.refreshContextStrip();   // the key's "pick a count", and the scrim
    return true;
  }

  // False when the pad is taken -- a question, a spot being picked, and for
  // the pad centre's hold also a layer or a direction -- and nothing opened.
  openHere(from) {
    if (this.answering || this.picking || !this.twin) return false;
    if (from === 'centre' && (this.fanOpen || this.padLayer || this.directionPending())) return false;
    this.clearForPadLayer();
    this.padLayer = { kind: 'here', from, lit: null, timer: 0 };
    this.paintHere();
    this.refreshContextStrip();
    if (from === 'context') this.armIdle();
    return true;
  }

  openStairs(act) {
    this.clearForPadLayer();
    const L = this.padLayer = { kind: 'stairs', act };
    L.timer = setTimeout(() => { if (this.padLayer === L) this.closePadLayer(); }, STAIRS_MS);
    this.paintStairs();
    this.refreshContextStrip();
  }

  closePadLayer() {
    const L = this.padLayer;
    if (!L) return;
    this.padLayer = null;
    clearTimeout(L.timer);
    if (!this.fanOpen) this.stopIdle();
    if (L.kind === 'count') this.chipsOpen = null;
    this.restorePad();
    this.hideFrame();
    this.refreshContextStrip();   // the keys' sub lines, and the scrim
  }

  // a rebuild (a resize, a turn) puts back the layer that stayed up
  reopenPadLayer(s) {
    if (s.kind === 'count') {
      const from = s.fromId === 'rest' ? this.restWell.slot : this.twinEl(s.fromId);
      if (from && this.openCountLayer(s.act, from, s.fromId)) { this.padLayer.sticky = true; this.armIdle(); }
    } else if (s.kind === 'here' && s.from === 'context') {
      // the stairs' first tap stays in, its 2 s begun again
      if (this.openHere('context') && s.lit !== null) this.lightStairs(s.lit);
    } else if (s.kind === 'stairs') this.openStairs(s.act);
  }

  // CONTEXT's tap, in twin banks
  contextTapped(act, from) {
    const L = this.padLayer;
    // the stairs lit in CONTEXT's HERE: its second tap goes
    if (L && L.kind === 'here' && L.from === 'context' && L.lit !== null) { this.stairsGo(from); return; }
    if (this.candidates.length > 1) {
      if (L && L.kind === 'here' && L.from === 'context') this.closePadLayer();
      else this.openHere('context');
      return;
    }
    if (act === C.CTX_ASCEND || act === C.CTX_DESCEND) {
      if (L && L.kind === 'stairs' && L.act === act) { this.closePadLayer(); this.runAction(act, from); return; }
      this.openStairs(act);
      return;
    }
    this.runAction(act, from);
  }

  // a place of the pad tapped while a layer of twin banks' is up on it
  padLayerTapped(place, from) {
    const L = this.padLayer;
    if (L.kind === 'count') { this.countPick(place); return; }
    if (L.kind === 'stairs') {
      // the lit centre goes; any other tap, ↑ or ↓ too, only puts the stairs away
      if (place === 4) { this.closePadLayer(); this.runAction(L.act, from); return; }
      FB.tick();
      this.closePadLayer();
      return;
    }
    this.herePick(place, false, from);
  }

  countPick(place) {
    const act = this.padLayer.act;
    if (place === 4) { this.closePadLayer(); this.promptCount(act); return; }
    const i = COUNT_PLACES.indexOf(place);
    if (i < 0 || !(act.counts[i] > 0)) { FB.tick(); return; }   // a blank place: nothing to pick
    P.saveCount(act.countKey, act.counts[i]);
    this.closePadLayer();
  }

  // slid: the pad centre's slide-and-lift, which closes the layer whatever it lands on
  herePick(place, slid, from) {
    const L = this.padLayer;
    if (place === 4) {
      if (L.lit !== null) { this.stairsGo(from); return; }
      this.closePadLayer();
      if (!slid) this.openDrawer('here');
      return;
    }
    const p = HERE_PLACES[place];
    if (p.bit && !this.hereHas(p.bit)) {
      // dimmed: swallowed, with the tick
      FB.tick();
      if (slid) this.closePadLayer();
      return;
    }
    if (p.stairs && L.from === 'context') {
      // their second tap is the centre's or CONTEXT's, never theirs (an aim's)
      if (L.lit === place) FB.tick();
      else this.lightStairs(place);
      return;
    }
    this.closePadLayer();
    this.runAction(p.act, from);
  }

  // CONTEXT's HERE: ↑ or ↓ tapped, the centre lit with them for 2 s
  lightStairs(place) {
    const L = this.padLayer;
    if (!L || L.kind !== 'here') return;
    L.lit = place;
    clearTimeout(L.timer);
    L.timer = setTimeout(() => { if (this.padLayer === L && L.lit === place) { L.lit = null; this.paintHere(); } }, STAIRS_MS);
    this.paintHere();
    this.armIdle();
  }

  // the stairs lit in CONTEXT's HERE go
  stairsGo(from) {
    const p = HERE_PLACES[this.padLayer.lit];
    this.closePadLayer();
    this.runAction(p.act, from);
  }

  // The pad centre's lift while its HERE is up: the place under the thumb.
  // A thumb that slid off the centre and back lifts on ALL, the HERE drawer
  // (it was out of reach: the lift on the centre closed the layer, and said
  // "HERE: SLIDE" to a thumb that had slid -- the layers stage's review,
  // 2026-10-03).  One that never left the centre opens nothing, and one
  // that slid off the pad lets it go.
  hereSlide(ev) {
    this.padHover(null);
    if (!this.hereFrom('centre')) return;
    const L = this.padLayer, place = this.padPlaceAt(ev.clientX, ev.clientY);
    if (place === 4 && L.left) { this.herePick(4, false, this.padCentre && this.padCentre.el); return; }
    if (place === null || place === 4) { this.closePadLayer(); if (!L.left) this.radialHabit(); return; }
    const f = this.padFace(place);
    this.herePick(place, true, f && f.el);
  }

  // The hold that opened a count layer, followed: a slide onto a count picks
  // it as the thumb lifts; else the layer closes then, unless the hold lasted
  // 600 ms, and stays up to be tapped.  fromId: the key whose layer it is.
  countHold(fromId) {
    const mine = () => { const L = this.padLayer; return L && L.kind === 'count' && L.fromId === fromId ? L : null; };
    return {
      move: (ev) => { if (mine()) this.padHover(this.padPlaceAt(ev.clientX, ev.clientY)); },
      release: (ev, ms) => {
        const L = mine();
        if (!L) return;
        this.padHover(null);
        const place = this.padPlaceAt(ev.clientX, ev.clientY);
        // a hold that picked or stays up was meant (prayLift's habit)
        if (place === 4 || COUNT_PLACES.includes(place)) { this.holdMeant(ev.pointerId); this.countPick(place); return; }
        if (ms < COUNT_STICKY_MS) { this.closePadLayer(); return; }
        this.holdMeant(ev.pointerId);
        L.sticky = true;
        this.armIdle();
      },
      cancel: () => { if (mine()) this.closePadLayer(); },
    };
  }

  // the pad's place whose hit cell holds a point, or null
  padPlaceAt(x, y) {
    const cells = this.twin && this.twin.guard.cells;
    if (!cells) return null;
    for (let i = 0; i < 9; i++) {
      const c = cells.get(TWIN_PAD[i]);
      if (c && x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h) return i;
    }
    return null;
  }

  // the place a held thumb is over, pressed, as a key under it would be
  padHover(place) {
    for (let i = 0; i < 9; i++) { const f = this.padFace(i); if (f) f.press(i === place); }
  }

  // The count in use is lit: on the dark cap, its legend glowing amber, among
  // the amber counts.  On an amber cap the amber glow could not be read, 1.12
  // to 1 against the cap's top (the layers stage's review, 2026-10-03).
  paintCount() {
    const act = this.padLayer.act, n = this.countFor(act), preset = act.counts.includes(n), cap = capFor(C.A90);
    const inUse = (f, on) => f.cap(on ? capFor(null) : cap).lit(on);
    for (let place = 0; place < 9; place++) {
      const f = this.padFace(place);
      if (!f) continue;
      const i = COUNT_PLACES.indexOf(place);
      if (place === 4) inUse(f.placeholder(false).tag(null).dim(false), !preset).label('×n', 12, true).sub('type');
      else if (i >= 0) inUse(f.placeholder(false).tag(null).dim(false), act.counts[i] === n).label(`×${act.counts[i]}`, 13, true).sub(null);
      else f.placeholder(true).cap(capFor(C.G90)).tag(null).dim(true).lit(false).label('', 10).sub(null);
    }
    this.showFrame(`${act.word.toUpperCase()} ×${n}`, '#f8b457');
  }

  // The pad centre as the stairs' second tap: the amber cap, its dark legend
  // the stairs' word, their arrow in the corner (place: ↑ 1 or ↓ 7).
  paintStairsGo(f, act, place) {
    f.placeholder(false).cap(capFor(C.A90)).tag(place === 1 ? '↑' : '↓').dim(false).lit(false)
      .label(act.word, 9.5, true).sub('tap to go');
  }

  paintHere() {
    const L = this.padLayer, cap = capFor(C.VIOLET), lit = L.lit !== null ? HERE_PLACES[L.lit] : null;
    for (let place = 0; place < 9; place++) {
      const f = this.padFace(place);
      if (!f) continue;
      if (place === 4) {
        if (lit) this.paintStairsGo(f, lit.act, L.lit);
        else f.placeholder(false).cap(cap).tag(null).dim(false).lit(false).label('ALL', 11).sub('drawer');
        continue;
      }
      const p = HERE_PLACES[place];
      f.placeholder(false).cap(cap).tag(null).dim(!!p.bit && !this.hereHas(p.bit)).lit(false)
        .label(this.labelForAction(p.act), 9.5, true).sub(p.act.key, true);
    }
    this.showFrame(lit ? stairsPill(lit.act) : 'HERE', lit ? '#ffb347' : '#c2b6ff');
  }

  // CONTEXT's one action is the stairs: the centre lit with them, the rest of the pad dimmed
  paintStairs() {
    const L = this.padLayer;
    for (let place = 0; place < 9; place++) {
      const f = this.padFace(place);
      if (!f) continue;
      if (place === 4) this.paintStairsGo(f, L.act, L.act === C.CTX_ASCEND ? 1 : 7);
      else f.dim(true).lit(false);
    }
    this.showFrame(stairsPill(L.act), '#ffb347');
  }

  // A sticky layer's 4 s: any touch starts them again (watchGuard), a thumb
  // still down holds them, and a command being placed or a drawer keeps the
  // layer it belongs to.
  armIdle() {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.idleFired(), STICKY_IDLE_MS);
  }
  stopIdle() { clearTimeout(this.idleTimer); this.idleTimer = 0; }
  idleFired() {
    this.idleTimer = 0;
    if (this.pointersDown && this.pointersDown.size) { this.armIdle(); return; }
    if (this.assign || this.drawerOpen || this.answering) return;
    const L = this.padLayer;
    if (L && (L.kind !== 'count' || L.sticky)) this.closePadLayer();
    if (this.fanOpen) this.closeFan();
  }

  // ---- the keys, in RhOverlay.build()'s order (it is the z order)
  buildKeys() {
    const K = this.keysEl;
    this.buildRestAndMsgs(K);
    this.buildNumpad(K);
    this.buildContextStrip(K);
    this.buildPray(K);
    this.buildTopRight(K);
    this.buildRightMacros(K);
    this.ctxRadialEl = el('div', 'pop', K);
    this.ctxRadialEl.style.display = 'none';
    for (const hub of C.HUBS) this.addHub(K, hub);
    this.buildBanner(K);
    this.scrim = el('div', '', K);
    this.scrim.id = 'scrim';
    this.scrim.style.zIndex = 5;
    this.scrimHint = el('div', 'hint', this.scrim);
    if (this.twin) {
      // twin banks: at the top of the map, between the banks or over them
      const m = this.twin.spec.mapArea;
      Object.assign(this.scrimHint.style, { top: `${m.y + 6}px`, left: `${m.x + m.w / 2}px`, maxWidth: `${m.w - 8}px` });
    } else {
      this.scrimHint.style.top = `${this.glassTop() + 6}px`;
    }
    this.scrim.addEventListener('pointerup', (e) => { e.preventDefault(); this.dismissPopups(); });
    this.scrim.addEventListener('pointerdown', (e) => e.preventDefault());
    this.buildDrawer(K);
    this.flashEl = el('div', '', K);
    this.flashEl.id = 'flash';
    this.flashEl.style.zIndex = 30;
    if (this.twin) {
      // the ghost deck's flash, over the old key's spot (ghostShow)
      this.ghostEl = el('div', 'ghost', K);
      this.ghostEl.style.zIndex = 31;
    }
    this.refreshContextStrip();
    this.refreshRestFaces();
    this.refreshPadCentre();
    this.recomputeContext();
    if (this.answering) this.paintAnswers();
    if (this.twin) this.twinLamps();
  }

  // Rest (with Long rest in its scroll well), Msgs and macro 1: the left bank's top rows.
  buildRestAndMsgs(K) {
    const inn = this.termInner(), P_ = this.portrait, T = this.twin;
    // the scroll well: landscape, the left bank's top row; portrait, the key row's first slot;
    // twin banks, REST's place in the left bank's top strip
    const at = T ? this.tw('rest') : P_ ? this.pFnBox(0) : this.tl(this.termWideKey(), T_ROW1_H, inn, inn);
    const wide = at.w, h = at.h;
    // Twin banks: the slot is REST's hit cell (the design's section 6), and the
    // strip holds two cells, REST's over Long rest's, each keycap inset in its
    // own, so a tap off REST's keycap but in its cell presses whichever face
    // shows, and the strip slides a cell's height
    const cl = T ? this.twin.guard.cells.get('rest') : null;
    const box = cl || at;
    const slot = el('div', 'well-slot', K);
    Object.assign(slot.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
    const strip = el('div', 'strip', slot);
    // Twin banks: Long rest is swiped UP out of REST's slot (Lucas, 2026-10-02:
    // the design's choice stands), so the strip stands on end, Long rest under
    // REST; a vertical swipe also stays clear of Android's sideways Back.
    if (cl) {
      const kx = at.x - cl.x, ky = at.y - cl.y;
      slot.classList.add('v');
      strip.style.width = `${cl.w}px`;
      strip.style.height = `${2 * cl.h}px`;
      this.restFace = new Key(strip).place(kx, ky, wide, h).cell({ x: 0, y: 0, w: cl.w, h: cl.h }).face(C.A90);
      this.longFace = new Key(strip).place(kx, cl.h + ky, wide, h).cell({ x: 0, y: cl.h, w: cl.w, h: cl.h }).cap(longRestCap());
    } else {
      strip.style.width = `${2 * wide + T_GAP}px`;
      this.restFace = new Key(strip).place(0, 0, wide, h).face(C.A90);
      this.longFace = new Key(strip).place(wide + T_GAP, 0, wide, h).cap(longRestCap());
    }
    this.restFace.lg.style.paddingRight = '14px';
    this.longFace.lg.style.paddingRight = '14px';
    const dots = el('div', 'dots', slot);
    dots.innerHTML = '<i class="on"></i><i></i>';
    if (cl) Object.assign(dots.style, { right: `${cl.w - (at.x - cl.x + wide) + 6}px`, top: `${at.y - cl.y + h / 2}px` });
    this.restWell = { slot, strip, dots, revealed: false, pinned: false, timer: 0, wide, vertical: !!T,
      len: cl ? cl.h : T ? h : wide, gap: cl ? 0 : T_GAP };
    if (T) { this.twinKey('rest', slot); this.twinKey('longrest', this.longFace); }
    this.bindScrollWell(this.restWell);
    // Twin banks: a hold paints the counts on the pad (countHold); REST's tap
    // with its own counts up puts them away, as SEARCH's does
    this.bindHold(this.restFace, CHIP_HOLD_MS, () => this.openRestChips(C.CTX_REST), () => {
      if (T && this.chipsOpen === C.CTX_REST.countKey) { this.closeChips(); return; }
      this.closeChips();
      this.runAction(C.CTX_REST, slot);
    }, T ? this.countHold('rest') : null);
    this.bindHold(this.longFace, CHIP_HOLD_MS, () => this.openRestChips(C.CTX_LONG_REST), () => {
      if (T && this.chipsOpen === C.CTX_LONG_REST.countKey) { this.closeChips(); return; }
      this.closeChips();
      this.runAction(C.CTX_LONG_REST, slot);
      this.scrollWell(false);
    }, T ? this.countHold('rest') : null);

    const prev = new Key(K).box(T ? this.tw('msgs') : P_ ? this.pFnBox(1) : this.tl(T_KEY, T_ROW1_H, inn + this.padBox - T_KEY, inn))
      .face(C.VIOLET).label(this.labelFor(C.PREV_MSGS), 9).sub(this.subKeyFor(C.PREV_MSGS), true);
    this.bindTap(prev, () => this.execute(C.PREV_MSGS, prev.el));
    this.twinKey('msgs', prev);

    // macro 1: under Msgs in landscape; beside SACRIFICE, over DROP, in portrait
    const macro = this.buildMacroKey(K, 0);
    macro.box(T ? this.tw('m1') : P_ ? this.lb(this.termWideKey(), P_ROW_H, inn + T_KEY + T_GAP, this.pRowBottom(1))
                 : this.tl(this.termWideKey(), T_KEY, inn + T_KEY + T_GAP, this.termRow2Top()));
    this.row2 = [macro];
    this.twinKey('m1', macro);

    // Rest's chips: under the slot in landscape, above the key row in portrait;
    // twin banks have none, their counts are a layer on the pad (the design's
    // section 8: the count-chip rows go)
    this.restChips = this.longChips = null;
    if (T) return;
    const chips = P_ ? this.lb(CHIP_ROW_W + 8, CHIP_SIZE + 8, inn, this.pFnBottom() + P_FN_KEY + CHIP_GAP_ABOVE)
      : this.tl(CHIP_ROW_W + 8, CHIP_SIZE + 8, inn, inn + T_ROW1_H + T_GAP);
    this.restChips = this.buildCountRow(K, C.CTX_REST, chips);
    this.longChips = this.buildCountRow(K, C.CTX_LONG_REST, chips);
  }

  // The strip slides with the finger: sideways in classic, Long rest coming in
  // from the right; up and down in twin banks (w.vertical), from below.
  bindScrollWell(w) {
    let x0 = 0, y0 = 0, t0 = 0, dragging = false, id = null;
    const travel = () => (w.len || w.wide) + (w.gap ?? T_GAP);
    const cur = () => (w.revealed ? -travel() : 0);
    const axis = w.vertical ? 'translateY' : 'translateX';
    w.slot.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; t0 = cur(); dragging = false; id = e.pointerId; }, true);
    w.slot.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      // twin banks: a hold that put the counts on the pad slides to them, not the strip
      if (!dragging && this.padLayer && this.padLayer.kind === 'count') return;
      const dx = (e.clientX - x0) / this.s, dy = (e.clientY - y0) / this.s;
      const along = w.vertical ? dy : dx, across = w.vertical ? dx : dy;
      if (!dragging && Math.abs(along) > 8 && Math.abs(along) > Math.abs(across)) {
        // the key under the finger gets a cancel: no tap, no hold; and the
        // touch was REST's own swipe, however slow, not the old Pray hold on
        // its spot (prayLift)
        dragging = true;
        this.holdMeant(e.pointerId);
        clearTimeout(w.timer);
        for (const k of [this.restFace, this.longFace]) k.cancelGesture && k.cancelGesture();
        w.strip.classList.add('drag');
      }
      if (dragging) w.strip.style.transform = `${axis}(${clamp(t0 + along, -travel(), 0)}px)`;
    }, true);
    const end = (e) => {
      if (e.pointerId !== id || !dragging) return;
      dragging = false;
      w.strip.classList.remove('drag');
      const m = /translate[XY]\((-?[\d.]+)px\)/.exec(w.strip.style.transform);
      this.scrollWell((m ? parseFloat(m[1]) : 0) < -travel() / 2);
    };
    w.slot.addEventListener('pointerup', end, true);
    w.slot.addEventListener('pointercancel', end, true);
  }

  scrollWell(revealed) {
    const w = this.restWell;
    if (!w) return;
    w.revealed = revealed;
    clearTimeout(w.timer);
    w.strip.style.transform = `${w.vertical ? 'translateY' : 'translateX'}(${revealed ? -((w.len || w.wide) + (w.gap ?? T_GAP)) : 0}px)`;
    const [a, b] = w.dots.children;
    a.classList.toggle('on', !revealed);
    b.classList.toggle('on', revealed);
    if (revealed) w.timer = setTimeout(() => { if (!w.pinned) this.scrollWell(false); }, HIDE_LONG_MS);
  }

  // ---- macros
  buildMacroKey(K, slot) {
    const k = new Key(K).face(C.JADE);
    this.macroKeys[slot] = k;
    // while a command is in hand a tap places it here, and a hold does nothing
    this.bindHold(k, HUB_HOLD_MS, () => { if (!this.assign) this.editMacro(slot); }, () => {
      if (this.assign) { this.placeMacro(slot); return; }
      const m = P.macros()[slot];
      if (!m.keys) { this.editMacro(slot); return; }
      this.closeChips();
      this.flashRaw(m.name || m.keys, k.el);
      this.host.send(m.keys);
    });
    this.refreshMacroKey(slot);
    return k;
  }

  refreshMacroKey(slot) {
    if (slot >= P.MACRO_SLOTS) { this.refreshFlick(); return; }
    const k = this.macroKeys[slot];
    if (!k) return;
    const m = P.macros()[slot];
    // Portrait's key row is too narrow for the tag beside a name, so there it
    // gives way to a label with something to read (a macro of spaces keeps it).
    k.tag(!this.twin && this.portrait && slot > 0 && m.keys && (m.name || m.keys).trim() ? '' : `M${slot + 1}`);
    // every macro is a destination while a command is in hand, from any drawer
    if (this.assign && !this.flickPlacing()) { k.placeholder(false).face(C.A90).label('HERE', 8).sub(null); return; }
    k.face(C.JADE);
    if (m.keys) k.placeholder(false).label(m.name || m.keys, 8.5).sub('hold to edit');
    else k.placeholder(true).label('+', 15).sub('macro');
  }

  // a command in hand becomes the macro: its name and its key sequence
  placeMacro(slot) {
    P.saveMacro(slot, this.assign.word, this.assign.key);
    const fan = this.assignTarget === 3;
    this.assign = null;
    this.assignHub = null;
    if (fan) this.closeFan();
    this.closeRadial();   // the flick key's, when that is where it went
    this.refreshAllSlots();
    this.updateHubSubLines();
    this.syncModal();
  }

  macroTitle(slot) {
    if (slot === P.FLICK_TAP) return 'Flick key: tap';
    if (slot === P.FLICK_TAP + 1) return 'Flick key: flick up';
    if (slot === P.FLICK_TAP + 2) return 'Flick key: flick up-right';
    return P.macros()[slot].keys ? 'Edit macro' : 'New macro';
  }

  editMacro(slot) {
    this.closeAll();
    const m = P.macros()[slot];
    this.host.form(this.macroTitle(slot), [
      { id: 'name', label: 'Name (fits ~8 characters)', value: m.name },
      { id: 'keys', label: 'Keys, e.g. 20s  or  ^Dh  or  M-p', value: m.keys, mono: true },
      { note: 'Sent one key at a time, as typed.  ^X = Ctrl-X,  M-x = Meta-x,  \\e = Escape,  '
        + '\\n = Enter,  \\b = DEL.' },
    ], [
      ...(m.keys ? [{ label: 'Clear', run: () => { P.saveMacro(slot, '', ''); this.refreshMacroKey(slot); } }] : []),
      { label: 'Cancel' },
      { label: 'Save', primary: true, run: (v) => { P.saveMacro(slot, v.name, v.keys); this.refreshMacroKey(slot); } },
    ]);
  }

  // Macros 2 and 3, in the two keys above Search; portrait, the key row's right end.
  buildRightMacros(K) {
    if (this.twin) {
      for (const slot of [1, 2]) this.twinKey(TWIN_MACROS[slot], this.buildMacroKey(K, slot).box(this.tw(TWIN_MACROS[slot])));
      return;
    }
    if (this.portrait) {
      for (const slot of [1, 2]) this.buildMacroKey(K, slot).box(this.pFnBox(5 + slot));
      return;
    }
    const colW = this.padBox - T_RIGHT_COL - T_GAP;
    const right = this.termInner() + T_RIGHT_COL + T_GAP;
    const bottom = this.termInner() + T_SEARCH_H + T_GAP;
    for (let n = 0; n < 2; n++) {
      const slot = 2 - n;
      this.buildMacroKey(K, slot).box(this.rb(colW, T_SPARE_H, right, bottom + n * (T_SPARE_H + T_GAP)));
    }
  }

  // The left bank's middle row takes the centre of whatever the height leaves.
  placeRow2() {
    if (this.portrait || this.twin) return;
    const row1Bottom = this.termInner() + T_ROW1_H;
    const row3Top = this.DH - this.termRow3Bottom() - T_KEY;
    const top = Math.max(this.termRow2Top(), (row1Bottom + row3Top - T_KEY) / 2);
    for (const k of this.row2) k.el.style.top = `${top}px`;
  }

  // ---- counts
  buildCountRow(K, act, box) {
    const row = el('div', 'chiprow', K);
    Object.assign(row.style, { left: `${box.x}px`, top: `${box.y}px`, display: 'none' });
    const chips = [];
    for (const value of act.counts) {
      const chip = new Key(row).place(0, 0, CHIP_SIZE, CHIP_SIZE).face(C.A90).label(`×${value}`, 11, true);
      chip.el.style.position = 'relative';
      this.bindTap(chip, () => { P.saveCount(act.countKey, value); this.closeChips(); });
      chips.push(chip);
    }
    const n = new Key(row).place(0, 0, CHIP_SIZE, CHIP_SIZE).face(C.A90).label('×n', 11, true);
    n.el.style.position = 'relative';
    this.bindTap(n, () => this.promptCount(act));
    chips.push(n);
    return { row, chips, act };
  }

  promptCount(act) {
    this.host.form(`${act.word}: how many turns?`, [
      { id: 'n', label: `1 to ${MAX_COUNT}`, value: String(this.countFor(act)), numeric: true },
    ], [
      { label: 'Cancel' },
      { label: 'Set', primary: true, run: (v) => {
        const n = parseInt(v.n, 10);
        if (!(n >= 1)) return;
        P.saveCount(act.countKey, Math.min(n, MAX_COUNT));
        this.closeChips();
      } },
    ]);
  }

  countFor(act) { return P.count(act.countKey, act.defaultCount); }

  highlightCounts(r, n) {
    const preset = r.act.counts.includes(n);
    r.chips.forEach((c, i) => c.el.classList.toggle('dim', !(i < r.act.counts.length ? r.act.counts[i] === n : !preset)));
  }

  openRestChips(act) {
    if (this.twin) { this.openCountLayer(act, this.restWell.slot, 'rest'); return; }
    this.closeFan();
    this.closeRadial();
    this.closeDrawer();
    this.closeContextRadial();
    this.chipsOpen = act.countKey;
    this.refreshContextStrip();
  }

  refreshRestFaces() {
    // twin banks have no rows (r null): the counts are on the pad
    const face = (k, r, act) => {
      if (!k) return;
      const n = this.countFor(act), open = this.chipsOpen === act.countKey;
      k.label(P.get('labelMode') === 'keys' ? C.keyWithCount(act, n) : C.wordWithCount(act, n), 8.5)
        .sub(open ? 'pick a count' : 'hold to set');
      if (!r) return;
      r.row.style.display = open ? 'flex' : 'none';
      if (open) this.highlightCounts(r, n);
    };
    face(this.restFace, this.restChips, C.CTX_REST);
    face(this.longFace, this.longChips, C.CTX_LONG_REST);
    if (this.restWell) {
      this.restWell.pinned = this.chipsOpen === C.CTX_LONG_REST.countKey;
      if (!this.restWell.pinned && this.restWell.revealed) this.scrollWell(true);
    }
  }

  // ---- the numpad
  buildNumpad(K) {
    const pitch = this.padCell + PAD_GAP, left = this.termInner();
    const mold = el('div', this.twin ? 'padmold' : '', K);
    this.padMold = mold;
    // twin banks: the mold round the pad's nine rects as layout() gives them
    const cells = this.twin ? TWIN_PAD.map((id) => this.tw(id)) : null;
    const box = this.twin ? bounds(cells) : this.lb(this.padBox, this.padBox, left, this.termInner());
    Object.assign(mold.style, { position: 'absolute', left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col, key = C.PAD_KEYS[idx];
        const k = (cells ? new Key(mold).place(cells[idx].x - box.x, cells[idx].y - box.y, cells[idx].w, cells[idx].h)
          : new Key(mold).place(col * pitch, row * pitch, this.padCell, this.padCell)).cap(role(ROLE_MOVE));
        this.twinKey(TWIN_PAD[idx], k);
        if (!key) {
          this.padCentre = k;
          const tap = () => {
            if (this.answering) { this.answerPlace(4); return; }
            if (this.padLayer) { this.padLayerTapped(4, k.el); return; }
            if (this.fanOpen) { this.layerPlaceTapped(4, k.el); return; }
            if (this.directionPending() || this.picking) this.pressDirection('.');
            else this.execute(this.padCentreCommand(), k.el);
          };
          // Twin banks: the hold is the HERE layer, slide-only (hereSlide):
          // slide to a place and lift; a hold that cannot open it -- a layer, a
          // question or a direction already has the pad -- is a slow tap
          this.bindHold(k, CENTRE_HOLD_MS, () => {
            if (this.twin) { if (!this.openHere('centre')) this.centreSlowTap = true; return; }
            if (!this.fanOpen && !this.answering && !this.picking) this.openContextRadial();
          }, tap, this.twin ? {
            move: (ev) => {
              if (!this.hereFrom('centre')) return;
              const place = this.padPlaceAt(ev.clientX, ev.clientY);
              if (place !== 4) this.padLayer.left = true;   // it slid (hereSlide)
              this.padHover(place);
            },
            release: (ev) => {
              if (this.centreSlowTap) { this.centreSlowTap = false; tap(); return; }
              this.hereSlide(ev, k.el);
            },
            cancel: () => { this.centreSlowTap = false; if (this.hereFrom('centre')) this.closePadLayer(); },
          } : null);
          continue;
        }
        k.label(C.PAD_ARROW[idx], 18, true).sub(key, true);
        this.bindTap(k, () => {
          if (this.answering) { this.answerPlace(idx); return; }
          if (this.padLayer) { this.padLayerTapped(idx, k.el); return; }
          if (this.fanOpen) { this.layerPlaceTapped(idx, k.el); return; }
          this.pressDirection(key);
        });
        this.padCells.push(k);
      }
    }
    this.padBoxScreen = box;
    // the frame and name chip round the pad while a layer is up
    const f = el('div', 'layerframe', K);
    el('b', '', f);
    // twin banks: the frame no further out than half the gap to the row above,
    // and its name on the layout's pill, inside the map (the design's section 8)
    const out = this.twin ? Math.min(5, this.twin.info.M.g / 2) : 5;
    Object.assign(f.style, { left: `${box.x - out}px`, top: `${box.y - out}px`, width: `${box.w + 2 * out}px`, height: `${box.h + 2 * out}px` });
    this.layerFrame = f;
    this.layerPill = null;
    const pill = this.twin && this.twin.spec.popups.find((p) => p.owner === 'pad_centre');
    if (pill) {
      this.layerPill = el('div', 'layerpill', K);
      Object.assign(this.layerPill.style, { left: `${pill.x}px`, top: `${pill.y}px`, maxWidth: `${pill.w}px`, height: `${pill.h}px` });
    }
  }

  directionPending() { return !!this.armed || this.expectsDirection; }
  padCentreCommand() { return this.hereHas(HERE_OBJECT) ? C.PICKUP : C.SEARCH; }

  // The game is picking a spot (getpos: a polearm or Snickersnee applied,
  // farlook, travel): the pad moves the cursor and its centre picks the spot
  // with '.' -- it sent the centre's own command, 's' (Lucas, 2026-09-28).
  setPicking(on) {
    if (this.picking === on) return;
    this.picking = on;
    if (on) this.closeContextRadial();
    this.refreshPadCentre();
  }

  refreshPadCentre() {
    const k = this.padCentre;
    if (!k || this.fanOpen || this.answering || this.padLayer) return;   // a layer or a question owns the centre
    if (this.picking) k.label('PICK', 8).sub('.', true);
    else if (this.directionPending()) k.label('HERE', 8).sub('.', true);
    else if (this.hereHas(HERE_OBJECT)) k.label('PICK UP', 8).sub(',', true);
    else k.label('REST', 9).sub('hold · context');
  }

  pressDirection(dir) {
    if (this.armed) {
      const cmd = this.armed;
      this.disarm();
      this.host.send(cmd.key + dir);
      return;
    }
    // search mode pads each step with searches, never while the core wants a direction
    if (P.get('searchMode') && !this.expectsDirection && !this.picking) {
      const n = P.get('searchCount'), s = n > 1 ? `${n}s` : 's';
      this.host.send(P.get('searchBefore') ? s + dir : dir + s);
      return;
    }
    this.host.send(dir);
  }

  toggleSearchMode() {
    if (P.get('searchMode')) {
      P.set('searchMode', false);
      this.updateLamps();
      this.flashRaw('search off', this.padCentre.el);
      return;
    }
    let before = P.get('searchBefore'), count = P.get('searchCount');
    this.host.form('Search mode', [
      { seg: 'when', label: 'Search before or after each step?', value: before ? 'before' : 'after',
        options: [['before', 'Before — search, then move'], ['after', 'After — move, then search']] },
      { seg: 'count', label: 'How many searches with each step?', value: String(count),
        options: [['1', '×1'], ['2', '×2'], ['3', '×3'], ['5', '×5']] },
      { note: 'Each search is a turn.  The SEARCH lamp is lit while this is on; switch it off from the same WORLD entry.' },
    ], [
      { label: 'Cancel' },
      { label: 'Turn on', primary: true, run: (v) => {
        before = v.when === 'before';
        count = parseInt(v.count, 10) || 1;
        P.set('searchBefore', before);
        P.set('searchCount', count);
        P.set('searchMode', true);
        this.updateLamps();
        this.flashRaw((before ? 'search ' : 'step then ') + (count > 1 ? `${count}s` : 's'), this.padCentre.el);
      } },
    ]);
  }

  // ---- hubs
  // Portrait: DROP keeps its wide key over the numpad; the rest are cells of
  // the right bank's action pad -- OFFENSE and EAT/QUAFF/READ its middle row,
  // INVENTORY and INTERACT its bottom corners.
  hubCx(hub) {
    if (this.portrait) {
      if (hub === C.HUB_DROP) return this.termInner() + this.termWideKey() / 2;
      if (hub === C.HUB_ATTACK || hub === C.HUB_EQUIP) return this.pCellCx(0);
      return this.pCellCx(2);   // INTERACT, EAT/QUAFF/READ
    }
    if (hub === C.HUB_ATTACK) return this.termDeckLeft() + this.padCell / 2;
    if (hub === C.HUB_DROP) return this.termInner() + this.termWideKey() / 2;
    return -(this.termInner() + T_RIGHT_COL / 2);   // INTERACT, EAT/QUAFF/READ
  }
  hubCy(hub) {
    if (this.portrait) {
      if (hub === C.HUB_DROP) return this.pRowBottom(0) + P_ROW_H / 2;
      if (hub === C.HUB_ATTACK || hub === C.HUB_CONSUME) return this.pCellCy(1);
      return this.pCellCy(2);   // INVENTORY, INTERACT
    }
    if (hub === C.HUB_ATTACK) return this.termDeckBottom() + DECK_KEY / 2;
    if (hub === C.HUB_DROP) return this.termRow3Bottom() + T_KEY / 2;
    if (hub === C.HUB_INTERACT) return this.termInner() + T_INTERACT_H / 2;
    return this.termInner() + T_INTERACT_H + T_GAP + T_CONSUME_H / 2;
  }
  hubW(hub) {
    if (this.portrait) return hub === C.HUB_DROP ? this.termWideKey() : this.padCell;
    if (hub === C.HUB_ATTACK) return this.padCell;
    if (hub === C.HUB_DROP) return this.termWideKey();
    return T_RIGHT_COL;
  }
  hubH(hub) {
    if (this.portrait) return hub === C.HUB_DROP ? P_ROW_H : this.padCell;
    if (hub === C.HUB_ATTACK) return DECK_KEY;
    if (hub === C.HUB_DROP) return T_KEY;
    return hub === C.HUB_INTERACT ? T_INTERACT_H : T_CONSUME_H;
  }
  // INTERACT sits in the corner in portrait; its fan turns up so the last node stays on screen
  fanA0(hub) { return hub.fanA0 + (this.portrait && hub === C.HUB_INTERACT ? P_INTERACT_FAN_TURN : 0); }
  // a point at a bearing from a hub's centre, in design px from the top-left
  around(hub, deg, r) {
    return { x: this.X(this.hubCx(hub)) + Math.cos(rad(deg)) * r, y: this.Y(this.hubCy(hub)) + Math.sin(rad(deg)) * r };
  }

  addHub(K, hub) {
    const hv = { hub, slotFaces: [] };
    // a hub's fan became its layer on the pad (2026-09-26): nothing hangs off it
    if (hub === C.HUB_ATTACK) {
      this.buildSlotGroup(K, hv, true);
      this.buildFlickKey(K);
    }
    if (hub === C.HUB_EQUIP) this.buildEquipMatrix(K, hv);

    hv.face = new Key(K).face(hub.face).label(hub.label, hub.labelSize);
    if (hub === C.HUB_INTERACT) hv.face.cap(role(ROLE_INTERACT));
    else if (hub === C.HUB_CONSUME) hv.face.cap(role(ROLE_CONSUME));
    else if (hub === C.HUB_EQUIP) hv.face.defaultCap(role(ROLE_INVENTORY));
    hv.face.sub(this.hubIdleSub(hub));
    if (this.twin) this.twinKey(TWIN_HUB[hub.id], hv.face);
    if (hub === C.HUB_EQUIP) {
      // the inventory bar over the matrix; portrait, the action pad's bottom-left cell
      hv.face.box(this.twin ? this.tw('inventory') : this.portrait ? this.pCell(0, 2) : this.tr(this.padBox, T_EQ_BAR, this.termInner(), this.termEqTop()))
        .sub(this.hubIdleSub(hub)).tag('i');
      hv.face.fr.style.fontSize = '6.5px';
    } else if (this.twin) {
      hv.face.box(this.tw(TWIN_HUB[hub.id]));
    } else {
      hv.face.box(this.cb(this.hubW(hub), this.hubH(hub), this.hubCx(hub), this.hubCy(hub)));
    }

    this.bindHold(hv.face, HUB_HOLD_MS, () => this.openFan(hv), () => this.hubTapped(hv));
    this.hubs.push(hv);
  }

  hubIdleSub() { return 'hold · layer'; }

  fireFromHub(hub, item, from) {
    // only Fight is armed: F is a prefix the core reads with no prompt
    if (hub === C.HUB_ATTACK && item.key === 'F') { this.arm(item, from); return; }
    this.execute(item, from);
  }

  // OFFENSE's pinned points: the first beside DROP over the pad's right column,
  // the other two after OFFENSE along the deck.
  termAttackSlot(n) {
    if (this.portrait) {
      // the first beside DROP, as in landscape; the other two head the action pad
      if (n === 0) return this.lb(T_KEY, P_ROW_H, this.termInner() + this.padBox - T_KEY, this.pRowBottom(0));
      return this.pCell(n - 1, 0);
    }
    if (n === 0) return this.lb(T_KEY, T_KEY, this.termInner() + this.padBox - T_KEY, this.termRow3Bottom());
    const left = this.termDeckLeft() + this.padCell + T_GAP + (n - 1) * (T_SLOT_W + T_GAP);
    return this.lb(T_SLOT_W, DECK_KEY, left, this.termDeckBottom());
  }

  buildSlotGroup(K, hv, attack) {
    hv.satellites = el('div', 'pop', K);
    for (let n = 0; n < C.ATK_SLOT_DEFAULT.length; n++) {
      const slot = this.twinKey(TWIN_PINS[n], new Key(hv.satellites).box(this.twin ? this.tw(TWIN_PINS[n]) : this.termAttackSlot(n)));
      hv.slotFaces.push(slot);
      this.bindSlot(hv, slot, attack, n);
    }
    this.refreshSlots(hv, attack);
  }

  buildEquipMatrix(K, hv) {
    hv.satellites = el('div', 'pop', K);
    const cellW = (this.padBox - 2 * T_GAP) / 3;
    for (let n = 0; n < 6; n++) {
      const col = n % 3, row = Math.floor(n / 3);
      const right = this.termInner() + (2 - col) * (cellW + T_GAP);
      const top = this.termEqTop() + T_EQ_BAR + 8 + row * (T_EQ_CELL_H + T_GAP);
      // portrait: the two rows over the action pad, put-on verbs on top
      const at = this.twin ? this.tw(TWIN_EQUIP[n]) : this.portrait ? this.rb(cellW, P_ROW_H, right, this.pRowBottom(1 - row))
                               : this.tr(cellW, T_EQ_CELL_H, right, top);
      const slot = this.twinKey(TWIN_EQUIP[n], new Key(hv.satellites).box(at).defaultCap(role(ROLE_INVENTORY)));
      hv.slotFaces.push(slot);
      this.bindSlot(hv, slot, false, n);
    }
    this.refreshSlots(hv, false);
  }

  bindSlot(hv, slot, attack, n) {
    this.bindHold(slot, SLOT_CLEAR_MS, () => {
      if (this.assign) return;
      if (!this.slotItem(attack, n)) this.fillSlot(hv, attack, n);
      else this.clearSlot(hv, attack, n);
    }, () => {
      if (this.assignAccepts(attack)) { this.placeAssignment(attack, n); return; }
      const item = this.slotItem(attack, n);
      // Empty: in classic a tap does nothing and the hold fills it; in twin
      // banks the tap opens the picker too (Lucas, 2026-10-02: the design's
      // choice stands, an empty pin is a picker)
      if (!item) { if (this.twin) this.fillSlot(hv, attack, n); return; }
      if (attack) this.fireFromHub(C.HUB_ATTACK, item, slot.el);
      else this.execute(item, slot.el);
    });
  }

  slotItem(attack, n) { return C.pinnable((attack ? this.atkSlotKeys : this.equipSlotKeys)[n]); }

  refreshSlots(hv, attack) {
    const taking = this.assignAccepts(attack);
    // classic hid the points beside COMBAT while its fan was out over them;
    // twin banks' layer paints the pad, so the pins stay, dimmed under the
    // scrim as every other key is (the design's section 14: faces change
    // label, never place)
    const hidden = !this.twin && !taking && (hv.hub.id === this.fanOpen || hv.hub.id === this.radialOpen);
    hv.slotFaces.forEach((slot, n) => {
      const item = this.slotItem(attack, n);
      slot.show(!hidden);
      if (taking) slot.placeholder(false).face(C.A90).label('HERE', 8).sub(null);
      else if (!item) slot.placeholder(true).label('+', 15).sub(this.twin ? 'tap to fill' : 'hold to fill');
      else slot.placeholder(false).face(item.face || C.G90).label(this.labelFor(item), attack ? 7.5 : 9).sub(item.key, true);
    });
  }

  fillSlot(hv, attack, n) {
    this.closeChips();
    this.closeRadial();
    this.openDrawer(hv.hub.group.id, hv.hub);
    this.fill = { hv, attack, n };
    this.setAssigning(true, 'pick a command for this key');
  }

  // assignment targets: 0 OFFENSE's points, 1 the equip cells, 2 both, 3 a fan
  assignAccepts(attack) {
    if (!this.assign || this.flickPlacing()) return false;
    // from COMBAT's drawer: its layer or its points; from INVENTORY's: its layer or the cells
    if (this.assignTarget === 3) return attack ? this.assignHub === C.HUB_ATTACK.id : this.assignHub === C.HUB_EQUIP.id;
    if (this.assignTarget === 2) return true;
    return attack ? this.assignTarget === 0 : this.assignTarget === 1;
  }
  assignAcceptsFan(hub) {
    return !!this.assign && !this.flickPlacing() && this.assignTarget === 3 && hub.id === this.assignHub;
  }
  assignTargetFor(hub) { return hub && this.fanKeys.has(hub.id) ? 3 : 2; }

  pickUp(item, target, hub = null) {
    this.closeChips();
    this.closeFan();
    this.closeRadial();
    this.closeDrawer();
    this.assign = item;
    this.assignTarget = target;
    this.assignHub = hub ? hub.id : null;
    if (target === 3) {
      // the layer comes up with every place lit; tapping one places the command
      const hv = this.hubView(this.assignHub);
      if (hv) { this.disarm(); this.fanOpen = hv.hub.id; hv.face.lit(true); }
    }
    this.refreshAllSlots();
    this.updateHubSubLines();
    this.syncModal();
  }

  hubView(id) { return this.hubs.find((h) => h.hub.id === id) || null; }

  fanItem(hub, n) {
    const keys = this.fanKeys.get(hub.id);
    if (!keys || n >= keys.length) return n < hub.fan.length ? hub.fan[n] : null;
    return C.pinnable(keys[n]);
  }

  refreshFan(hv) { if (hv.hub.id === this.fanOpen) this.paintLayer(hv.hub); }

  placeFan(hv, n) {
    const keys = this.fanKeys.get(hv.hub.id);
    if (!keys || !this.assign) return;
    for (let k = 0; k < keys.length; k++) if (keys[k] === this.assign.key) keys[k] = null;
    keys[n] = this.assign.key;
    P.saveFanSlots(hv.hub.id, keys);
    this.assign = null;
    this.assignHub = null;
    this.closeFan();
    this.refreshAllSlots();
    this.updateHubSubLines();
    this.syncModal();
  }

  cancelAssignment() {
    if (!this.assign) return;
    const fan = this.assignTarget === 3;
    this.assign = null;
    this.assignHub = null;
    if (fan) this.closeFan();
    this.refreshAllSlots();
    this.updateHubSubLines();
    this.syncModal();
  }

  // where the attack pins are kept: twin's own, or classic's (twinPins)
  atkPref() { return this.twin ? 'atkSlotsTwin' : 'atkSlots'; }

  placeAssignment(attack, n) {
    const keys = attack ? this.atkSlotKeys : this.equipSlotKeys;
    for (let k = 0; k < keys.length; k++) if (keys[k] === this.assign.key) keys[k] = null;
    keys[n] = this.assign.key;
    P.set(attack ? this.atkPref() : 'equipSlots', keys);
    this.assign = null;
    this.assignHub = null;
    // from COMBAT's or INVENTORY's drawer its layer was up too, and the flick key's radial may be
    this.closeFan();
    this.closeRadial();
    this.refreshAllSlots();
    this.updateHubSubLines();
    this.syncModal();
  }

  clearSlot(hv, attack, n) {
    const keys = attack ? this.atkSlotKeys : this.equipSlotKeys;
    keys[n] = null;
    P.set(attack ? this.atkPref() : 'equipSlots', keys);
    this.refreshSlots(hv, attack);
  }

  refreshAllSlots() {
    for (const hv of this.hubs) {
      this.refreshFan(hv);
      if (hv.hub === C.HUB_ATTACK) this.refreshSlots(hv, true);
      else if (hv.hub === C.HUB_EQUIP) this.refreshSlots(hv, false);
    }
    for (let n = 0; n < this.macroKeys.length; n++) this.refreshMacroKey(n);
    this.refreshFlick();
  }

  updateHubSubLines() {
    for (const hv of this.hubs) {
      let sub;
      if (this.assignAcceptsFan(hv.hub)) sub = 'pick a place';
      else if (hv.hub === C.HUB_ATTACK && this.assignAccepts(true)) sub = 'pick a point';
      else if (hv.hub === C.HUB_EQUIP && this.assignAccepts(false)) sub = 'pick a cell';
      else if (hv.hub.id === this.fanOpen) sub = 'tap = all';
      else sub = this.hubIdleSub(hv.hub);
      hv.face.sub(sub);
    }
  }

  hubTapped(hv) {
    if (this.assignAcceptsFan(hv.hub)) { this.cancelAssignment(); return; }
    if (hv.hub.id === this.fanOpen || hv.hub.id === this.radialOpen) {
      // the third level: the fan closes and the group's drawer opens
      this.closeFan();
      this.closeRadial();
      this.openDrawer(hv.hub.group.id, hv.hub);
      return;
    }
    // Twin banks: a second tap on COMBAT, while it holds Fight armed, disarms
    // it, as the banner's tap does.  Today's landscape M3 spot is COMBAT now,
    // and a tap there from habit arms Fight (the design's section 15).
    if (this.twin && hv.hub === C.HUB_ATTACK && this.armed && this.armedBy === 'combat') {
      this.disarm();
      this.host.send('\\e');
      return;
    }
    this.fireFromHub(hv.hub, hv.hub.quick, hv.face.el);   // COMBAT's Fight arms the pad
  }

  // ---- layers (RhOverlay, 2026-09-26), in place of the fans.  Holding a hub
  // turns the movement pad into its nine places, in the hub's colour; the
  // centre is ALL, the drawer.  Let go and the layer stays up, or keep holding
  // and tap the pad with the other thumb.  A place runs and the pad is arrows again.
  layerKind(hub) {
    if (hub === C.HUB_ATTACK) return LAYER_COMBAT;
    if (hub === C.HUB_DROP) return LAYER_DROP;
    if (hub === C.HUB_CONSUME) return LAYER_EAT;
    if (hub === C.HUB_INTERACT) return LAYER_APPLY;
    return LAYER_INVENTORY;
  }

  padFace(place) {
    if (place === 4) return this.padCentre;
    return this.padCells[place < 4 ? place : place - 1] || null;
  }

  paintLayer(hub) {
    const kind = this.layerKind(hub), cap = layerCap(kind), taking = this.assignAcceptsFan(hub);
    for (let place = 0; place < 9; place++) {
      const f = this.padFace(place);
      if (!f) continue;
      if (place === 4) { f.placeholder(false).cap(cap).label('ALL', 11).sub('drawer'); continue; }
      const item = this.fanItem(hub, place);
      if (taking) f.placeholder(false).cap(capFor(C.A90)).label('HERE', 8).sub(null);
      else if (!item) f.placeholder(true).cap(cap).label('+', 15).sub('assign');
      else f.placeholder(false).cap(cap).label(this.labelFor(item), 9.5, true).sub(item.key, true);
    }
    this.showFrame(`${hub.label.replace(/\n/g, ' ')} LAYER`, layerAccent(kind));
  }

  // the pad as it was: arrows, and the centre's own command
  restorePad() {
    this.padCells.forEach((k, i) => {
      const idx = i < 4 ? i : i + 1;
      k.cap(role(ROLE_MOVE)).placeholder(false).tag(null).lit(false).dim(false)
        .label(C.PAD_ARROW[idx], 18, true).sub(C.PAD_KEYS[idx], true);
    });
    if (this.padCentre) this.padCentre.cap(role(ROLE_MOVE)).placeholder(false).tag(null).lit(false).dim(false);
    this.refreshPadCentre();
  }

  showFrame(title, accent) {
    const fr = this.layerFrame;
    if (!fr) return;
    fr.style.setProperty('--acc', accent);
    fr.firstChild.textContent = title;
    fr.classList.add('on');
    if (this.layerPill) {
      this.layerPill.style.setProperty('--acc', accent);
      this.layerPill.textContent = title;
      this.layerPill.classList.add('on');
    }
  }

  hideFrame() {
    if (this.layerFrame) this.layerFrame.classList.remove('on');
    if (this.layerPill) this.layerPill.classList.remove('on');
  }

  // ---- a question's answers on the pad (Lucas, 2026-09-27: in landscape they
  // were far from the thumbs, and the question easy to miss).  A letter that is
  // also a direction key sits where that direction is -- y up-left and n
  // down-right, as those keys already are -- the rest take the free places in
  // order, and the centre is q (or Esc).  False when they do not fit.
  showAnswers(choices, def, onPick) {
    const places = new Array(9).fill(null);
    const rest = [];
    for (const ch of choices) {
      const at = C.PAD_KEYS.indexOf(ch);
      if (ch !== 'q' && at >= 0 && at !== 4 && !places[at]) places[at] = ch;
      else if (ch !== 'q') rest.push(ch);
    }
    for (const ch of rest) {
      const free = places.findIndex((p, i) => !p && i !== 4);
      if (free < 0) return false;
      places[free] = ch;
    }
    places[4] = choices.includes('q') ? 'q' : '\x1b';
    this.closeAll();
    this.disarm();
    this.answering = { places, def, onPick };
    this.paintAnswers();
    return true;
  }

  paintAnswers() {
    const a = this.answering;
    if (!a) return;
    const cap = capFor(C.A90);
    const WORDS = { y: 'Yes', n: 'No', q: 'Quit', '\x1b': 'Esc' };
    for (let place = 0; place < 9; place++) {
      const f = this.padFace(place);
      if (!f) continue;
      const ch = a.places[place];
      if (!ch) { f.cap(cap).placeholder(true).tag(null).lit(false).label('', 10).sub(null); continue; }
      const isDef = ch.charCodeAt(0) === a.def;
      f.cap(cap).placeholder(false).label(WORDS[ch] || ch, WORDS[ch] ? 12 : 18, true)
        .sub(isDef ? 'default' : null).tag(ch === '\x1b' ? 'Esc' : ch).lit(isDef);
    }
    this.showFrame('ANSWER', '#ffb347');
  }

  hideAnswers() {
    if (!this.answering) return;
    this.answering = null;
    this.hideFrame();
    this.restorePad();
  }

  answerPlace(place) {
    const ch = this.answering && this.answering.places[place];
    if (!ch) return;
    this.answering.onPick(ch === '\x1b' ? 27 : ch.charCodeAt(0));
  }

  layerPlaceTapped(place, from) {
    const hv = this.hubView(this.fanOpen);
    if (!hv) { this.closeFan(); return; }
    if (place === 4) {
      if (this.assign) return;
      this.closeFan();
      this.openDrawer(hv.hub.group.id, hv.hub);
      return;
    }
    if (this.assignAcceptsFan(hv.hub)) { this.placeFan(hv, place); return; }
    if (this.assign) return;
    const item = this.fanItem(hv.hub, place);
    this.closeFan();
    if (!item) {
      // an empty place is the way into the drawer to fill it
      this.openDrawer(hv.hub.group.id, hv.hub);
      this.setAssigning(true, 'pick a command for the layer');
      return;
    }
    this.fireFromHub(hv.hub, item, from);
  }

  openFan(hv) {
    if (this.answering) return;   // a question has the pad
    this.closeCandidates();
    this.closeChips();
    this.closeDrawer();
    this.closeFan();
    this.closeRadial();
    this.closeContextRadial();
    this.disarm();
    this.fanOpen = hv.hub.id;
    this.paintLayer(hv.hub);
    hv.face.lit(true).sub('tap = all');
    if (hv.hub === C.HUB_ATTACK) this.refreshSlots(hv, true);
    this.syncModal();
    // twin banks: a layer left up drops back to arrows after 4 s with no input
    if (this.twin) this.armIdle();
  }

  closeFan() {
    if (!this.fanOpen) return;
    const was = this.hubView(this.fanOpen);
    this.fanOpen = null;
    if (!this.padLayer) this.stopIdle();
    this.restorePad();
    this.hideFrame();
    if (was) {
      was.face.lit(false).sub(this.hubIdleSub(was.hub));
      if (was.hub === C.HUB_ATTACK) this.refreshSlots(was, true);
    }
    this.syncModal();
  }

  // ---- the flick key (RhOverlay.buildFlickKey): the deck's third COMBAT point,
  // a macro key that also flicks -- its tap and two flicks are macros 4-6 (P.FLICK_TAP),
  // drawn as a pointing stick's nub.
  flickCentre() {
    const b = this.termAttackSlot(2);
    return { x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w };
  }

  buildFlickKey(K) {
    const radial = el('div', 'pop', K);
    radial.style.display = 'none';
    this.radials.set(FLICK_ID, radial);
    const c = this.twin ? null : this.flickCentre(), bearings = C.FLICK_BEARING, n = bearings.length;
    // Twin banks: no wedges round the key, which would paint over its
    // neighbours; the two nodes are the layout's legend inside the map, at
    // its edge nearest FLICK, lit by the stroke and tapped or held as the
    // radial's nodes are (the design's section 7)
    const legend = this.twin ? this.twin.spec.popups.filter((p) => p.owner === 'flick') : null;
    if (legend) this.wedges = [];
    else this.buildFlickWedges(radial, c, bearings, n);
    this.flickNodes = bearings.map((deg, w) => {
      const slot = P.FLICK_TAP + 1 + w;
      // A node of the legend stands in a row, not on its bearing, so it
      // wears the stroke's arrow in its corner: ↑ Kick, ↗ the second macro
      const node = legend
        ? new Key(radial).box(legend[w] || { x: this.twin.spec.mapArea.x + POP_PAD + w * (SAT_SIZE + 8), y: this.twin.spec.mapArea.y + POP_PAD, w: SAT_SIZE, h: SAT_SIZE })
          .tag(bearingArrow(deg))
        : new Key(radial).place(c.x + Math.cos(rad(deg)) * C.FLICK_RADIUS - SAT_SIZE / 2, c.y + Math.sin(rad(deg)) * C.FLICK_RADIUS - SAT_SIZE / 2, SAT_SIZE, SAT_SIZE);
      this.bindHold(node, HUB_HOLD_MS, () => { if (!this.assign) this.editMacro(slot); }, () => {
        if (this.assign) { this.placeMacro(slot); return; }
        this.closeRadial();
        this.runOrEditMacro(slot, node.el);
      });
      return node;
    });
    const face = this.twinKey('flick', new Key(K).nub(true).box(this.twin ? this.tw('flick') : this.termAttackSlot(2)).face(C.JADE).tag('FLICK'));
    this.flickFace = face;
    this.bindFlickKey(face, bearings);
  }

  // the flick's wedges, drawn behind the nodes
  buildFlickWedges(radial, c, bearings, n) {
    const [lo, hi] = flickWedges(bearings, n);
    const rIn = c.w / 2 + 5, rOut = C.FLICK_RADIUS + SAT_SIZE / 2 + 12;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'wedges');
    Object.assign(svg.style, { left: `${c.x - rOut}px`, top: `${c.y - rOut}px`, width: `${2 * rOut}px`, height: `${2 * rOut}px` });
    svg.setAttribute('viewBox', `${-rOut} ${-rOut} ${2 * rOut} ${2 * rOut}`);
    const pt = (r, d) => `${(Math.cos(rad(d)) * r).toFixed(2)} ${(Math.sin(rad(d)) * r).toFixed(2)}`;
    this.wedges = [];
    for (let w = 0; w < n; w++) {
      const path = document.createElementNS(svgNS, 'path');
      const big = hi[w] - lo[w] > 180 ? 1 : 0;
      path.setAttribute('d', `M ${pt(rOut, lo[w])} A ${rOut} ${rOut} 0 ${big} 1 ${pt(rOut, hi[w])} `
        + `L ${pt(rIn, hi[w])} A ${rIn} ${rIn} 0 ${big} 0 ${pt(rIn, lo[w])} Z`);
      svg.appendChild(path);
      this.wedges.push(path);
    }
    radial.appendChild(svg);
    this.setWedge(-1);
  }

  bindFlickKey(face, bearings) {
    this.bindFlick(face, bearings,
      () => { if (!this.assign) this.openFlickRadial(); },
      () => {
        if (this.assign) {
          // first tap: the three parts light; a tap on the key again takes its tap
          if (this.radialOpen === FLICK_ID) this.placeMacro(P.FLICK_TAP);
          else this.openFlickRadial();
          return;
        }
        this.closeRadial();
        this.runOrEditMacro(P.FLICK_TAP, face.el);
      },
      (w, from) => {
        if (this.assign) { this.openFlickRadial(); return; }
        this.runOrEditMacro(P.FLICK_TAP + 1 + w, from);
      });
    this.refreshFlick();
  }

  runOrEditMacro(slot, from) {
    const m = P.macros()[slot];
    if (!m.keys) { this.editMacro(slot); return; }
    this.closeChips();
    this.flashRaw(m.name || m.keys, from);
    this.host.send(m.keys);
  }

  // a command in hand and the flick key opened for it: only its three parts take it
  flickPlacing() { return !!this.assign && this.radialOpen === FLICK_ID; }

  openFlickRadial() {
    const radial = this.radials.get(FLICK_ID);
    if (!radial) return;
    this.closeCandidates();
    this.closeChips();
    this.closeDrawer();
    this.closeContextRadial();
    this.closeRadial();
    this.closeFan();   // a command in hand from a layer's drawer: the layer steps aside
    this.radialOpen = FLICK_ID;
    radial.style.display = '';
    this.refreshAllSlots();
    this.updateHubSubLines();
    this.syncModal();
  }

  refreshFlick() {
    if (!this.flickFace) return;
    this.styleFlickPart(this.flickFace, P.FLICK_TAP, 'hold · flick');
    this.flickNodes.forEach((node, w) => this.styleFlickPart(node, P.FLICK_TAP + 1 + w, null));
  }

  styleFlickPart(k, slot, sub) {
    if (this.assign) {
      // a + says the key opens onto more places; opened, it is one of them
      const opener = slot === P.FLICK_TAP && this.radialOpen !== FLICK_ID;
      k.placeholder(false).face(C.A90).label(opener ? '+' : 'HERE', opener ? 15 : 8).sub(opener ? '3 places' : null);
      return;
    }
    const m = P.macros()[slot];
    k.face(C.JADE);
    if (m.keys) k.placeholder(false).label(m.name || m.keys, 8.5, true).sub(sub);
    else k.placeholder(true).label('+', 15).sub(sub);
  }

  setWedge(active) {
    (this.wedges || []).forEach((p, w) => {
      const on = w === active;
      p.setAttribute('fill', on ? 'rgba(255,255,255,.36)' : 'rgba(255,255,255,.08)');
      p.setAttribute('stroke', on ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.25)');
      p.setAttribute('stroke-width', '1');
    });
  }

  closeRadial() {
    if (!this.radialOpen) return;
    const radial = this.radials.get(this.radialOpen);
    if (radial) radial.style.display = 'none';
    const was = this.radialOpen;
    this.radialOpen = null;
    this.setWedge(-1);
    const hv = this.hubView(was);
    if (hv) this.refreshSlotsFor(hv.hub);
    // other destinations light again if a command is still in hand
    if (was === FLICK_ID) { this.refreshAllSlots(); this.updateHubSubLines(); }
    this.syncModal();
  }

  refreshSlotsFor(hub) {
    const hv = this.hubView(hub.id);
    if (hv && hv.satellites) this.refreshSlots(hv, hub === C.HUB_ATTACK);
  }

  // ---- modality: one scrim under anything open; the open things lift above it
  syncModal() {
    if (!this.scrim) return;
    for (const e of this.keysEl.querySelectorAll('.lift, .lift2')) e.classList.remove('lift', 'lift2');
    const lift = [];
    if (this.fanOpen) { const hv = this.hubView(this.fanOpen); if (hv) lift.push(hv.face.el, this.padMold, this.layerFrame, this.layerPill); }
    if (this.radialOpen) {
      const hv = this.hubView(this.radialOpen);
      if (hv) lift.push(hv.face.el);
      lift.push(this.radials.get(this.radialOpen));
    }
    if (this.ctxRadialOpen) lift.push(this.ctxRadialEl);
    if (this.candOpen && this.ctxStrip[1]) lift.push(this.ctxStrip[1].el, this.candEl);
    // twin banks' layers on the pad: the pad, its frame and pill, and the key
    // that opened the layer, so a second tap on it is taken
    const L = this.padLayer;
    if (L) {
      lift.push(this.padMold, this.layerFrame, this.layerPill);
      if (L.kind === 'count') lift.push(L.from);
      else if (L.from === 'context' || L.kind === 'stairs') lift.push(this.ctxStrip[1] && this.ctxStrip[1].el);
    }
    if (this.chipsOpen && !L) {
      if (this.chipsOpen === C.CTX_REST.countKey) lift.push(this.restWell.slot, this.restChips.row);
      else if (this.chipsOpen === C.CTX_LONG_REST.countKey) lift.push(this.restWell.slot, this.longChips.row);
      else this.ctxStrip.forEach((k, n) => {
        const act = this.ctxActions[n];
        if (act && C.isCounted(act) && act.countKey === this.chipsOpen) lift.push(k.el, this.chipRows[n].row);
      });
    }
    if (this.assign) {
      for (const hv of this.hubs) {
        if (hv.satellites && ((hv.hub === C.HUB_ATTACK && this.assignAccepts(true))
                              || (hv.hub === C.HUB_EQUIP && this.assignAccepts(false)))) lift.push(hv.satellites);
        if (this.assignAcceptsFan(hv.hub)) lift.push(hv.face.el, this.padMold, this.layerFrame, this.layerPill);
      }
      if (!this.flickPlacing()) for (const k of this.macroKeys) if (k) lift.push(k.el);
    }
    // the flick key and its radial go on top of everything else lifted
    const top = [];
    if (this.flickFace && (this.assign || this.radialOpen === FLICK_ID)) top.push(this.flickFace.el);
    if (this.radialOpen === FLICK_ID) top.push(this.radials.get(FLICK_ID));
    for (const e of top) lift.push(e);
    if (!lift.length) { this.scrim.classList.remove('on'); if (this.twin) this.liftGuard(false); return; }
    this.scrimHint.textContent = this.assign
      ? `TAP A LIT KEY TO PLACE ${this.assign.word.toUpperCase()}  ·  TAP ELSEWHERE OR ESC TO CANCEL`
      : 'TAP ANYWHERE OR ESC TO CLOSE';
    this.scrim.classList.add('on');
    for (const e of lift) if (e) e.classList.add('lift');
    for (const e of top) if (e) e.classList.add('lift2');
    if (this.twin) this.liftGuard(true);
  }

  dismissPopups() {
    const any = !!(this.chipsOpen || this.candOpen || this.assign || this.radialOpen || this.ctxRadialOpen || this.fanOpen
      || this.padLayer);
    this.closeChips();
    this.closeCandidates();
    this.closePadLayer();
    this.cancelAssignment();
    this.closeRadial();
    this.closeContextRadial();
    this.closeFan();
    this.syncModal();
    return any;
  }

  closeAll() {
    this.closeChips();
    this.closePadLayer();
    this.closeFan();
    this.closeRadial();
    this.closeDrawer();
    this.closeContextRadial();
    this.closeCandidates();
  }

  // Esc does what the phone's Back did: the drawer, then any popup, then a
  // revealed Long rest, then an armed direction.  False lets it reach the game.
  onBack() {
    if (this.drawerOpen) { this.closeDrawer(); return true; }
    if (this.dismissPopups()) return true;
    if (this.restWell && this.restWell.revealed) { this.scrollWell(false); return true; }
    if (this.armed) { this.disarm(); this.host.send('\\e'); return true; }
    return false;
  }

  // ---- armed direction mode
  arm(cmd, from) {
    this.closeCandidates();
    this.closeFan();
    this.closeDrawer();
    this.armed = cmd;
    // twin banks: ARMED lights on the pin that armed, else on COMBAT
    this.armedBy = (from && from.dataset && TWIN_PINS.includes(from.dataset.tw)) ? from.dataset.tw : 'combat';
    this.flashRaw(cmd.key, from);
    this.updateLamps();
    this.refreshPadCentre();
    this.banner.label(`${cmd.word.toUpperCase()} — PICK A DIRECTION`, 10).show(true);
    this.fitBanner();
  }

  disarm() {
    if (!this.armed) return;
    this.armed = null;
    this.armedBy = null;
    this.updateLamps();
    this.refreshPadCentre();
    this.banner.show(false);
  }

  buildBanner(K) {
    this.banner = new Key(K).face(C.R90).label('', 10);
    this.banner.show(false);
    this.banner.el.style.zIndex = 4;
    this.bindTap(this.banner, () => { this.disarm(); this.host.send('\\e'); });
  }

  fitBanner() {
    const w = 260, h = 30;
    if (this.twin) {
      // twin banks: at the top of the map, never over a key
      const m = this.twin.spec.mapArea, ww = Math.min(w, m.w - 2 * POP_PAD);
      this.banner.place(m.x + (m.w - ww) / 2, m.y + POP_PAD, ww, h);
      return;
    }
    this.banner.place(this.DW / 2 - w / 2, this.glassTop() + msgBandPx(this.portrait, this.s) / this.s + 6, w, h);
  }

  // ---- the context radial, off the pad's centre
  ctxRadialRadius() {
    const half = this.padBox / 2;
    let worst = 0;
    for (let n = 0; n < C.CTX_RADIAL.length; n++) {
      const a = rad(CTX_RADIAL_A0 + n * CTX_RADIAL_STEP);
      worst = Math.max(worst, half / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))));
    }
    return worst + CTX_RADIAL_SIZE / 2 + CTX_RADIAL_AIR;
  }

  openContextRadial() {
    // twin banks: the pad centre's hold is the HERE layer, on the pad itself
    if (this.twin) { this.openHere('centre'); return; }
    this.closeChips();
    this.closeFan();
    this.closeDrawer();
    this.closeRadial();
    this.ctxRadialEl.innerHTML = '';
    const cx = this.termInner() + this.padBox / 2, cy = this.Y(this.termInner() + this.padBox / 2);
    const r = this.ctxRadialRadius();
    C.CTX_RADIAL.forEach((act, n) => {
      const a = rad(CTX_RADIAL_A0 + n * CTX_RADIAL_STEP);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      const k = new Key(this.ctxRadialEl).place(x - CTX_RADIAL_SIZE / 2, y - CTX_RADIAL_SIZE / 2, CTX_RADIAL_SIZE, CTX_RADIAL_SIZE)
        .label(this.labelForAction(act), 9.5).sub(this.subKeyForAction(act), true);
      this.bindTap(k, () => { this.closeContextRadial(); this.runAction(act, k.el); });
    });
    this.ctxRadialOpen = true;
    this.ctxRadialEl.style.display = '';
    this.syncModal();
  }

  // Closing the pad centre's list closes twin banks' HERE, wherever it came
  // from, and the stairs' first tap: whatever opened in its place closes it.
  closeContextRadial() {
    if (this.padLayer && this.padLayer.kind !== 'count') { this.closePadLayer(); return; }
    if (!this.ctxRadialOpen) return;
    this.ctxRadialOpen = false;
    this.ctxRadialEl.style.display = 'none';
    this.ctxRadialEl.innerHTML = '';
    this.syncModal();
  }

  // ---- the context strip: Look | this turn's action | Search
  termStripW() {
    const deckInner = this.DW - 2 * this.termDeckLeft();
    const left = this.padCell + 2 * (T_GAP + T_SLOT_W);
    return clamp((deckInner - left - 8 - T_GAP - T_GAP) / 2, 70, 170);
  }
  termStripRight(n) { return n === 0 ? this.termDeckLeft() + this.termStripW() + T_GAP : this.termDeckLeft(); }
  termStripBox(n) {
    // portrait: LOOK ends the action pad's top row, the context key is its
    // centre, and SEARCH sits under it, beside INTERACT
    if (this.twin) return this.tw(TWIN_STRIP[n]);
    if (this.portrait) return n === 0 ? this.pCell(2, 0) : n === 1 ? this.pCell(1, 1) : this.pCell(1, 2);
    if (n === 2) return this.rb(this.padBox - T_RIGHT_COL - T_GAP, T_SEARCH_H, this.termInner() + T_RIGHT_COL + T_GAP, this.termInner());
    return this.rb(this.termStripW(), DECK_KEY, this.termStripRight(n), this.termDeckBottom());
  }
  termChipBox(n) {
    if (this.portrait) {
      return this.rb(CHIP_ROW_W + 8, CHIP_SIZE + 8, this.termInner(),
        this.pCellBottom(n) + this.padCell + CHIP_GAP_ABOVE);
    }
    if (n === 2) return this.rb(CHIP_ROW_W + 8, CHIP_SIZE + 8, this.termInner(), this.termInner() + T_SEARCH_H + CHIP_GAP_ABOVE);
    return this.rb(CHIP_ROW_W + 8, CHIP_SIZE + 8, this.termStripRight(n) + this.termStripW() - CHIP_ROW_W,
      this.termDeckBottom() + DECK_KEY + CHIP_GAP_ABOVE);
  }

  buildContextStrip(K) {
    for (let n = 0; n < 3; n++) {
      const k = new Key(K).box(this.termStripBox(n)).label('', 9.5);
      this.ctxStrip.push(k);
      this.twinKey(TWIN_STRIP[n], k);
      // Search (slot 2) is the strip's only counted action, so its row saves
      // there; twin banks paint their counts on the pad instead
      if (!this.twin) this.chipRows.push(this.buildCountRow(K, C.CTX_SEARCH, this.termChipBox(n)));
      this.bindHold(k, CHIP_HOLD_MS, () => {
        const act = this.ctxActions[n];
        if (!act) return;
        if (C.isCounted(act)) { this.openChips(n); return; }
        if (act.altKey) { this.closeChips(); this.flashRaw(act.altKey, k.el); this.host.send(act.altKey); }
      }, () => {
        const act = this.ctxActions[n];
        if (!act) return;
        if (C.isCounted(act) && act.countKey === this.chipsOpen) { this.closeChips(); return; }
        this.closeChips();
        if (n === 1 && this.twin) { this.contextTapped(act, k.el); return; }
        if (n === 1 && this.candidates.length > 1) { this.toggleCandidates(); return; }
        this.runAction(act, k.el);
      }, this.twin ? this.countHold(TWIN_STRIP[n]) : null);
    }
    this.candEl = el('div', 'pop', K);
    this.candEl.style.display = 'none';
  }

  recomputeContext() {
    this.candidates = [];
    if (this.hereHas(HERE_STAIRS_DOWN)) this.candidates.push(C.CTX_DESCEND);
    if (this.hereHas(HERE_STAIRS_UP)) this.candidates.push(C.CTX_ASCEND);
    if (this.hereHas(HERE_ALTAR)) this.candidates.push(C.CTX_SACRIFICE, C.CTX_DROP_UNKNOWN);
    if (this.hereHas(HERE_CONTAINER)) this.candidates.push(C.CTX_LOOT);
    if (this.hereHas(ADJ_CLOSED_DOOR)) this.candidates.push(C.CTX_OPEN);
    if (this.hereHas(ADJ_OPEN_DOOR)) this.candidates.push(C.CTX_CLOSE);
    const sig = this.candidates.map((a) => a.id).join(' ');
    if (this.candOpen && sig !== this.candSig) this.closeCandidates();
    // twin banks: HERE's places stay where they are and only their dimming
    // follows the turn; the stairs' first tap goes when CONTEXT no longer offers them
    const L = this.padLayer;
    if (L && L.kind === 'here') this.paintHere();
    if (L && L.kind === 'stairs' && sig !== this.candSig) this.closePadLayer();
    this.candSig = sig;
    this.ctxActions = [C.CTX_LOOK, this.candidates[0] || null, C.CTX_SEARCH];
    this.refreshContextStrip();
    this.refreshPadCentre();
  }

  toggleCandidates() {
    if (this.candOpen) { this.closeCandidates(); return; }
    this.closeFan();
    this.closeRadial();
    this.closeDrawer();
    this.closeContextRadial();
    this.candEl.innerHTML = '';
    const n = this.candidates.length;
    const cx = this.X(this.portrait ? this.pCellCx(1) : -(this.termStripRight(1) + this.termStripW() / 2));
    const cy = this.Y(this.portrait ? this.pCellCy(1) : this.termDeckBottom() + DECK_KEY / 2);
    const spread = n <= 2 ? 60 : n === 3 ? 45 : 36, a0 = 270 - (spread * (n - 1)) / 2;
    this.candidates.forEach((act, k) => {
      const a = rad(a0 + k * spread), x = cx + Math.cos(a) * CAND_RADIUS, y = cy + Math.sin(a) * CAND_RADIUS;
      const f = new Key(this.candEl).place(x - CAND_SIZE / 2, y - CAND_SIZE / 2, CAND_SIZE, CAND_SIZE)
        .face(k === 0 ? C.A90 : C.G90).label(act.word, 8.5).sub(act.key, true);
      this.bindTap(f, () => { this.closeCandidates(); this.runAction(act, f.el); });
    });
    this.candEl.style.display = '';
    this.candOpen = true;
    this.refreshContextStrip();
  }

  closeCandidates() {
    if (this.padLayer && this.padLayer.kind !== 'count') { this.closePadLayer(); return; }
    if (!this.candOpen) return;
    this.candOpen = false;
    this.candEl.style.display = 'none';
    this.candEl.innerHTML = '';
    this.refreshContextStrip();
  }

  refreshContextStrip() {
    this.ctxStrip.forEach((f, n) => {
      const act = this.ctxActions[n];
      f.face(C.G90);
      if (n === 1) f.lamp(!!act).lit(!!act);
      if (n === 2) f.defaultCap(role(ROLE_SEARCH));
      const row = this.chipRows[n];
      if (!act) {
        f.placeholder(true).label('', 9.5).sub(null);
        if (row) row.row.style.display = 'none';
        return;
      }
      f.placeholder(false);
      if (C.isCounted(act)) {
        const c = this.countFor(act);
        f.label(P.get('labelMode') === 'keys' ? C.keyWithCount(act, c) : C.wordWithCount(act, c), 9.5)
          .sub(act.countKey === this.chipsOpen ? 'pick a count' : 'hold to set');
      } else if (n === 1 && this.candidates.length > 1) {
        const lbl = this.candidates.length === 2 ? `${this.candidates[0].word}\n${this.candidates[1].word}`
          : `${this.candidates.length} actions`;
        f.label(lbl, 9).sub(this.candOpen || this.hereFrom('context') ? 'pick one' : 'tap to pick');
      } else if (n === 1 && this.padLayer && this.padLayer.kind === 'stairs') {
        // twin banks: the stairs' first tap is in; the second goes
        f.label(this.labelForAction(act), 9.5).sub('tap again');
      } else if (act.holdHint) {
        f.label(this.labelForAction(act), 9.5).sub(act.holdHint);
      } else {
        f.label(this.labelForAction(act), 9.5).sub(act.key, true);
      }
    });
    this.refreshChipRows();
    this.refreshRestFaces();
    this.syncModal();
  }

  refreshChipRows() {
    this.chipRows.forEach((r, n) => {
      const act = this.ctxActions[n];
      const open = !!act && C.isCounted(act) && act.countKey === this.chipsOpen;
      r.row.style.display = open ? 'flex' : 'none';
      if (open) this.highlightCounts(r, this.countFor(act));
    });
  }

  openChips(n) {
    const act = this.ctxActions[n];
    if (!act || !C.isCounted(act)) return;
    if (this.twin) { this.openCountLayer(act, this.ctxStrip[n].el, TWIN_STRIP[n]); return; }
    this.closeFan();
    this.closeRadial();
    this.closeContextRadial();
    this.chipsOpen = act.countKey;
    this.refreshContextStrip();
  }

  closeChips() {
    if (!this.chipsOpen) return;
    if (this.padLayer && this.padLayer.kind === 'count') { this.closePadLayer(); return; }
    this.chipsOpen = null;
    this.refreshContextStrip();
  }

  // ---- SACRIFICE (hold: pray), the left bank's second row
  buildPray(K) {
    // landscape, the left bank's second row; portrait, its top row, over DROP
    const at = this.twin ? this.tw('sacrifice') : this.portrait ? this.lb(T_KEY, P_ROW_H, this.termInner(), this.pRowBottom(1))
                             : this.tl(T_KEY, T_KEY, this.termInner(), this.termRow2Top());
    const f = this.twinKey('sacrifice', new Key(K).box(at).face(C.A90).label('SACRIFICE', 7.5).sub('hold · pray'));
    this.row2.push(f);
    this.bindHold(f, HUB_HOLD_MS, () => this.execute(C.PRAY, f.el), () => this.execute(C.SACRIFICE, f.el));
  }

  // ---- MENU WORLD GAME KEYS
  buildTopRight(K) {
    const n = C.TOP_RIGHT.length, w = (this.padBox - (n - 1) * T_GAP) / n;
    let right = this.termInner();
    for (let s = n - 1; s >= 0; s--) {
      const spec = C.TOP_RIGHT[s];
      // portrait: the key row's middle four
      const at = this.twin ? this.tw(TWIN_TOP[s]) : this.portrait ? this.pFnBox(2 + s) : this.tr(w, T_ROW1_H, right, this.termInner());
      const f = this.twinKey(TWIN_TOP[s], new Key(K).box(at).label(spec.label, 9));
      this.bindTap(f, () => {
        if (spec.groupId === 'menu') this.openSettings();
        else if (spec.groupId === 'keyboard') this.host.toggleKeyboard();
        else this.toggleDrawer(spec.groupId);
      });
      this.topRight.push({ f, spec });
      right += w + T_GAP;
    }
  }

  // ---- drawers (RhDrawer): 604 wide, four columns, ASSIGN in the title bar
  buildDrawer(K) {
    const d = el('div', '', K);
    d.id = 'drawer';
    d.style.zIndex = 20;
    const scrim = el('div', 'dscrim', d);
    scrim.addEventListener('pointerup', (e) => { e.preventDefault(); this.closeDrawer(); });
    const panel = el('div', 'panel', d);
    const at = this.twin && this.twin.spec.popups.find((p) => p.owner === 'world');
    if (at) {
      // Twin banks (the design's section 9): three columns on every screen,
      // min(420, the map's width - 12) wide and at most 352 tall, scrolling;
      // bottom-anchored and centred in the map area, so never over a key
      Object.assign(panel.style, { left: `${at.x}px`, width: `${at.w}px`, transform: 'none',
        bottom: `${this.DH - (at.y + at.h)}px`, maxHeight: `${at.h}px` });
    } else {
      // portrait: 604 does not fit a phone's width, so three columns in 420 (RhDrawer, narrow)
      Object.assign(panel.style, { top: '58px', width: this.portrait ? '420px' : '604px',
        maxHeight: `${Math.min(this.portrait ? 520 : 342, this.DH - 70)}px` });
    }
    const title = el('div', 'title', panel);
    this.drawerTitle = el('b', '', title);
    this.drawerCount = el('span', '', title);
    const assign = new Key(title).place(0, 0, 84, 26).label('ASSIGN', 8.5);
    Object.assign(assign.el.style, { left: 'auto', right: '4px', top: '3px' });
    this.bindTap(assign, () => this.setAssigning(!this.assigning));
    this.assignKey = assign;
    const defaults = new Key(title).place(0, 0, 76, 26).label('DEFAULTS', 8.5);
    Object.assign(defaults.el.style, { left: 'auto', right: '94px', top: '3px' });
    defaults.show(false);
    this.bindTap(defaults, () => this.confirmRestoreDefaults());
    this.defaultsKey = defaults;
    this.drawerGrid = el('div', 'grid', panel);
    this.drawerGrid.style.gridTemplateColumns = `repeat(${this.twin || this.portrait ? 3 : 4}, minmax(0, 1fr))`;
    this.drawerEl = d;
  }

  setAssigning(on, prompt) {
    this.assigning = on;
    this.assignKey.face(on ? C.A90 : C.G90).label(on ? 'ASSIGNING' : 'ASSIGN', 8.5);
    this.drawerCount.textContent = on ? (prompt || 'tap a command to pin it') : this.drawerCountText;
    if (this.defaultsKey) this.defaultsKey.show(on);
  }

  // DEFAULTS (Lucas, 2026-09-26): keys and layers ticked, macros not -- they are the player's own typing
  confirmRestoreDefaults() {
    this.closeDrawer();
    this.host.form('Restore default keys', [
      { seg: 'keys', label: 'Pinned keys and layers: COMBAT\'s points, the Wear / Put on / Wield keys, every layer',
        value: 'yes', options: [['yes', 'Restore'], ['no', 'Keep']] },
      { seg: 'macros', label: 'Macros: M1-M3 emptied, the flick key back to Kick on the flick up',
        value: 'no', options: [['yes', 'Restore'], ['no', 'Keep']] },
    ], [
      { label: 'Cancel' },
      { label: 'Restore', primary: true, run: (v) => {
        if (v.keys === 'yes') P.restoreKeys(C.HUBS.map((h) => h.id));
        if (v.macros === 'yes') P.restoreMacros();
        if (v.keys === 'yes' || v.macros === 'yes') this.rebuild();
      } },
    ]);
  }

  toggleDrawer(groupId) { if (groupId === this.drawerOpen) this.closeDrawer(); else this.openDrawer(groupId); }

  openDrawer(groupId, from = null) {
    this.closeCandidates();
    const g = C.groupById(groupId);
    if (!g) return;
    this.closeFan();
    this.closeContextRadial();
    this.disarm();
    this.drawerOpen = groupId;
    this.drawerHub = from;
    const extras = this.wizard ? C.wizardExtras(g.id) : null;
    const items = extras ? g.items.concat(extras) : g.items;
    this.drawerTitle.textContent = g.title;
    this.drawerCountText = `${items.filter((it) => !it.heading).length} commands`;
    this.setAssigning(false);
    this.drawerGrid.innerHTML = '';
    for (const item of items) {
      // a heading spans the grid, so the keys after it start a fresh row
      if (item.heading) { el('div', 'dhead', this.drawerGrid).textContent = item.word; continue; }
      const f = new Key(this.drawerGrid).place(0, 0, 138, 46).face(item.face || C.G90).label(item.word, 11, true);
      // a tag ("BETA") takes the corner the raw key would have
      if (item.tag) f.sub('', true).tag(item.tag); else f.sub(item.key, true);
      Object.assign(f.el.style, { position: 'relative', left: '0', top: '0', width: '100%' });
      this.bindHold(f, 500, () => this.onDrawerPin(item), () => {
        if (this.assigning) this.onDrawerPin(item);
        else { this.closeDrawer(); this.execute(item, null); }
      });
    }
    this.drawerEl.classList.add('on');
    this.updateDrawerButtons();
  }

  onDrawerPin(item) {
    const from = this.drawerHub, fill = this.fill;
    this.closeDrawer();
    if (C.isIntercepted(item)) return;
    if (fill) {
      this.assign = item;
      this.assignTarget = fill.attack ? 0 : 1;
      this.placeAssignment(fill.attack, fill.n);
      return;
    }
    this.pickUp(item, this.assignTargetFor(from), from);
  }

  closeDrawer() {
    if (!this.drawerOpen) return;
    this.drawerOpen = null;
    this.drawerHub = null;
    this.fill = null;
    this.drawerEl.classList.remove('on');
    this.drawerGrid.innerHTML = '';
    this.assigning = false;
    this.updateDrawerButtons();
    // a bounce or a second tap on an item must not fall through to the map
    // (web.js: map taps are swallowed for 200 ms after a drawer closes)
    if (this.host.windowClosed) this.host.windowClosed();
  }

  updateDrawerButtons() {
    for (const { f, spec } of this.topRight) f.face(spec.groupId === this.drawerOpen ? C.A90 : C.G90);
  }

  // ---- settings (the MENU key)
  openSettings() {
    this.closeAll();
    const seg = (id, label, options) => ({ seg: id, label, value: String(P.get(id)), options });
    this.host.form('Settings', [
      seg('style', 'Style', [['terminal', 'Terminal'], ['light', 'Terminal (light)'], ['gamecube', 'GameCube']]),
      { seg: 'case', label: 'Case', value: P.get('case') ? 'on' : 'off', options: [['on', 'Show the case'], ['off', 'Caseless']] },
      seg('phosphor', 'Screen phosphor', [['color', 'Colour'], ['amber', 'Amber'], ['green', 'Green'], ['white', 'White']]),
      seg('colourVision', "Colour vision: the game's colours in menus, messages and the text map. Protanopia and "
        + 'deuteranopia share a red-green palette and tritanopia has its own; monochrome changes only blessed, '
        + 'uncursed, cursed and HP, by brightness. Tiles are unchanged for now',
        [['standard', 'Standard'], ['protanopia', 'Protanopia'], ['deuteranopia', 'Deuteranopia'],
         ['tritanopia', 'Tritanopia'], ['monochrome', 'Monochrome']]),
      seg('statusLines', 'Status lines', [['full', 'Full'], ['compact', 'Compact'], ['hidden', 'Hidden']]),
      { seg: 'morePause', label: 'When the message band is full', value: P.get('morePause') ? 'on' : 'off',
        options: [['on', 'Pause (--More--)'], ['off', "Don't pause"]] },
      seg('msgFont', 'Message font', [['atkinson', 'Hyperlegible'], ['screen', 'Screen font']]),
      seg('msgSize', 'Message size', [['0.85', 'Small'], ['1', 'Standard'], ['1.2', 'Large'], ['1.4', 'Larger']]),
      seg('mapMode', 'Map', [['tiles', 'Tiles'], ['text', 'Text']]),
      { id: 'userRc', multiline: true, value: P.get('userRc'),
        label: 'Your option lines, one per line, used from the next start. To recolour a monster on the text map, '
          + 'start with a symset line (OPTIONS=symset:DECgraphics, or Enhanced1), then e.g. '
          + 'OPTIONS=glyph:G_male_brown_mold/0-128-255 and the same for G_female_brown_mold (a pet is G_pet_male_ '
          + 'and G_pet_female_); put :U+2663 before the colour to change its symbol too, with Enhanced1' },
      // Lucas, 2026-10-02: twin banks by default, classic kept as it was.  When
      // this window has no room for twin banks, or squeezes them, the first
      // reason why is said here, in a line, never in a pop-up (the design's
      // section 12).
      seg('layout', `Layout: twin banks puts each thumb's keys in its own bottom corner, the same in both orientations; `
        + `classic is the case as it was${this.twinFallback ? `. This window shows classic: ${firstReason(this.twinFallback)}`
          : this.twin && this.twin.spec.fit.degraded ? `. Twin banks here are squeezed: ${firstReason(this.twin.reason)}` : ''}`,
        [['twin', 'Twin banks'], ['classic', 'Classic']]),
      // the design's section 11 and its test 5: today's columns by default,
      // the bigger glyphs of the earlier rule a choice; a pinch zooms either
      seg('mapCell', "Map cell (twin banks): Columns shows at least today's 34 of the level's 80 columns in landscape, "
        + 'with all 21 rows, where the screen allows; Rows draws bigger tiles that fill the landscape height with the '
        + '21 rows, so fewer columns show. The same size in both orientations',
        [['columns', 'Columns'], ['rows', 'Rows']]),
      { seg: 'ghostDeck', label: 'Old key spots (twin banks, landscape): a map tap where COMBAT, PIN 2, FLICK, LOOK or CONTEXT sat '
          + 'on the old deck shows where the key went, and a second tap on the same place walks there. It retires itself '
          + 'after three sessions in a row, each of 100 turns or more played in twin banks in landscape, in which no '
          + 'preview went without its second tap',
        value: this.ghostOn() ? 'on' : 'off', options: [['on', 'On'], ['off', 'Retired']] },
      seg('padCell', 'Movement key size', [['46', '46'], ['52', '52'], ['58', '58 (Parhi)']]),
      seg('labelMode', 'Key labels', [['words', 'Words'], ['keys', 'Keys'], ['both', 'Both']]),
      { seg: 'keyFlash', label: 'Key flash', value: P.get('keyFlash') ? 'on' : 'off', options: [['on', 'On'], ['off', 'Off']] },
      { seg: 'touchKeyboard', label: 'On-screen keyboard for typing: for a touch screen with the keyboard out of reach',
        value: P.get('touchKeyboard') ? 'on' : 'off', options: [['off', 'Off'], ['on', 'On']] },
      // a choice with the click in it plays one, at the volume shown
      { seg: 'feedback', label: 'Key feedback (vibration needs a device that can vibrate)', value: P.get('feedback'),
        options: [['off', 'Off'], ['vibrate', 'Vibration'], ['click', 'Click'], ['both', 'Both']],
        onPick: (val, v) => { if (val === 'click' || val === 'both') FB.preview(Number(v.clickVolume)); } },
      { ...seg('clickVolume', 'Click volume', [['20', '20'], ['40', '40'], ['60', '60'], ['80', '80'], ['100', '100']]),
        onPick: (val) => FB.preview(Number(val)) },
      { note: 'Zoom the map with the mouse wheel or a pinch; drag it to look around.  Esc closes an open fan or drawer.' },
    ], [
      // twin banks keep their own zoom, a factor of the map cell (web.js tileSize)
      { label: 'Reset zoom', run: () => { P.set(this.twin ? 'zoomFactor' : 'zoom', this.twin ? 1 : 0); this.host.glassChanged(this.geom); } },
      { label: 'Done', primary: true, run: (v) => {
        const put = (k, val) => { if (P.get(k) !== val) P.set(k, val); };
        put('style', v.style);
        put('case', v.case === 'on');
        put('phosphor', v.phosphor);
        put('colourVision', v.colourVision);
        put('statusLines', v.statusLines);
        put('morePause', v.morePause === 'on');
        put('msgFont', v.msgFont);
        put('msgSize', Number(v.msgSize));
        put('mapMode', v.mapMode);
        put('userRc', String(v.userRc || '').replace(/\r/g, ''));
        put('padCell', parseInt(v.padCell, 10));
        if ((v.ghostDeck === 'on') !== this.ghostOn()) this.setGhostOn(v.ghostDeck === 'on');
        put('layout', v.layout === 'classic' ? 'classic' : 'twin');
        put('mapCell', v.mapCell === 'rows' ? 'rows' : 'columns');
        put('labelMode', v.labelMode);
        put('keyFlash', v.keyFlash === 'on');
        put('touchKeyboard', v.touchKeyboard === 'on');
        put('feedback', v.feedback);
        put('clickVolume', parseInt(v.clickVolume, 10));
      } },
    ]);
  }

  // ---- commands
  execute(item, from) {
    if (item === C.SEARCH_MODE) { this.closeFan(); this.toggleSearchMode(); return; }
    if (item === C.CASE_TOGGLE) { this.closeFan(); P.set('case', !P.get('case')); return; }
    if (item === C.STATUS_TOGGLE) {
      this.closeFan();
      const order = ['full', 'compact', 'hidden'];
      P.set('statusLines', order[(order.indexOf(P.get('statusLines')) + 1) % 3]);
      return;
    }
    if (item === C.MAP_TOGGLE) { this.closeFan(); P.set('mapMode', P.get('mapMode') === 'text' ? 'tiles' : 'text'); return; }
    if (item === C.MSG_RULES) { this.closeFan(); this.host.rawKey(0xE002); return; }   // rhrules.h RH_KEY_RULES
    this.flashRaw(item.key, from);
    this.closeFan();
    this.host.send(item.key);
  }

  runAction(act, from) {
    const keys = C.isCounted(act) ? C.keyWithCount(act, this.countFor(act)) : act.key;
    this.flashRaw(keys, from);
    this.host.send(keys);
  }

  // the pill above the pressed key
  flashRaw(key, from) {
    if (!P.get('keyFlash') || !key || !this.flashEl) return;
    const f = this.flashEl;
    f.textContent = key;
    const kr = this.keysEl.getBoundingClientRect();
    let x = this.DW / 2, y = this.DH / 2;
    if (from) {
      // twin banks: from the keycap, not the hit cell round it
      const cap = this.twin && from.querySelector(':scope > .kcap');
      const r = (cap || from).getBoundingClientRect();
      x = (r.left + r.width / 2 - kr.left) / this.s;
      y = (r.top - kr.top) / this.s - 22;
    }
    f.classList.add('on');
    if (this.twin) {
      // twin banks: on the map's edge nearest the key, never over a key
      const m = this.twin.spec.mapArea;
      x = clamp(x, m.x + POP_PAD + f.offsetWidth / 2, m.x + m.w - POP_PAD - f.offsetWidth / 2);
      y = clamp(y, m.y + POP_PAD, m.y + m.h - POP_PAD - f.offsetHeight);
    }
    f.style.left = `${x - f.offsetWidth / 2}px`;
    f.style.top = `${Math.max(2, y)}px`;
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => f.classList.remove('on'), 350);
  }

  labelFor(item) { return P.get('labelMode') === 'keys' ? item.key : item.word; }
  subKeyFor(item) { return P.get('labelMode') === 'both' ? item.key : null; }
  labelForAction(act) { return P.get('labelMode') === 'keys' ? act.key : act.word; }
  subKeyForAction(act) { return P.get('labelMode') === 'both' ? act.key : null; }

  // ---- gestures (bindTap, bindHold, bindFlick)
  bindTap(key, action) {
    const e = key.el;
    e.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      try { e.setPointerCapture(ev.pointerId); } catch (x) { /* synthetic */ }
      key.press(true);
      FB.press();
    });
    e.addEventListener('pointerup', (ev) => {
      ev.stopPropagation();
      if (!key.pressed) return;
      key.press(false);
      FB.up();
      action();
    });
    e.addEventListener('pointercancel', () => key.press(false));
    key.cancelGesture = () => key.press(false);
  }

  // Tap / hold / tap-again: the release of the press that opened the hold is swallowed.
  // Twin banks' layers held open (opts): while the thumb that opened one stays
  // down, move(ev) follows it, and its lift is release(ev, ms held) -- a slide
  // onto a place of the pad picks it -- or cancel() if the system takes it.
  bindHold(key, holdMs, onHold, onTap, opts = null) {
    const e = key.el;
    let pending = 0, justOpened = false, downAt = 0;
    e.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      try { e.setPointerCapture(ev.pointerId); } catch (x) { /* synthetic */ }
      key.press(true);
      FB.press();
      justOpened = false;
      downAt = performance.now();
      clearTimeout(pending);
      const id = ev.pointerId;
      pending = setTimeout(() => {
        pending = 0; justOpened = true; FB.held(); onHold();
        // the hold did its key's work (M1's editor, a hub's layer), so it was
        // no old Pray hold (prayLift); a layer held open (opts) is judged by
        // its release, where a count layer that closes unused is the habit
        if (!(opts && opts.release)) this.holdMeant(id);
        // Twin banks: a hold that took its own key away spends the rest of
        // the touch.  A drawer's item held to pin it closes the drawer under
        // the finger and puts up the scrim round the lit places, and the
        // touch, its key gone, lifted on the scrim -- which cancelled the pin
        // as it began: the command was never in hand, so neither the FLICK
        // legend nor any key could take it (the layers stage, 2026-10-03;
        // classic does the same, and is left as it is).
        if (this.twin && !e.isConnected) spendTouch(id);
      }, holdMs);
    });
    if (opts && opts.move) e.addEventListener('pointermove', (ev) => { if (justOpened) opts.move(ev); });
    e.addEventListener('pointerup', (ev) => {
      ev.stopPropagation();
      key.press(false);
      FB.up();
      if (justOpened) {
        justOpened = false;
        if (opts && opts.release) opts.release(ev, performance.now() - downAt);
        return;
      }
      if (!pending) return;
      clearTimeout(pending);
      pending = 0;
      onTap();
    });
    e.addEventListener('pointercancel', () => {
      key.press(false); clearTimeout(pending); pending = 0;
      if (justOpened && opts && opts.cancel) opts.cancel();
      justOpened = false;
    });
    key.cancelGesture = () => { key.press(false); clearTimeout(pending); pending = 0; justOpened = false; };
  }

  // Tap / hold / flick on the flick key: a marking menu.  Press and slide toward a
  // node and it fires on release; the radial shows only after FLICK_REVEAL_MS.
  bindFlick(key, bearings, onHold, onTap, onFire) {
    const e = key.el, n = bearings.length;
    const [lower, upper] = flickWedges(bearings, n, this.twin ? TWIN_FLICK_SLACK : FLICK_ARC_SLACK);
    // Twin banks: the legend is feedback while FLICK is held and its nodes are
    // targets while it is held (the other thumb taps or holds one) or while a
    // command is being placed (the design's section 7); when the thumb lifts
    // with nothing in hand, it goes, rather than stay over the map
    const legendDone = () => { if (this.twin && !this.assign && this.radialOpen === FLICK_ID) this.closeRadial(); };
    const arcCentre = (lower[0] + upper[n - 1]) / 2;
    let pendingHold = 0, pendingReveal = 0, justOpened = false, dragging = false, revealed = false;
    let downAt = 0, x0 = 0, y0 = 0, wedge = -1;
    let ticked = -1;   // the last wedge a detent was felt for, so a re-highlight does not tick twice
    const wedgeAt = (dx, dy) => {
      let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      while (ang <= arcCentre - 180) ang += 360;
      while (ang > arcCentre + 180) ang -= 360;
      for (let w = 0; w < n; w++) if (ang >= lower[w] && ang < upper[w]) return w;
      return -1;
    };
    const highlight = (w) => {
      if (dragging && w !== ticked) {
        if (w >= 0) FB.detent();
        ticked = w;
      }
      if (w === wedge) return;
      if (this.flickNodes[wedge]) this.flickNodes[wedge].press(false);
      wedge = w;
      const open = this.radialOpen === FLICK_ID;
      if (open && this.flickNodes[wedge]) this.flickNodes[wedge].press(true);
      this.setWedge(open ? wedge : -1);
    };
    const reveal = () => {
      if (!dragging || revealed) return;
      if (this.radialOpen !== FLICK_ID) { this.openFlickRadial(); revealed = true; }
      const w = wedge;
      wedge = -1;
      highlight(w);
    };
    const clearTimers = () => { clearTimeout(pendingHold); clearTimeout(pendingReveal); pendingHold = pendingReveal = 0; };
    const reset = () => { clearTimers(); highlight(-1); dragging = false; revealed = false; justOpened = false; };
    const dist = (ev) => Math.hypot((ev.clientX - x0) / this.s, (ev.clientY - y0) / this.s);

    e.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      try { e.setPointerCapture(ev.pointerId); } catch (x) { /* synthetic */ }
      key.press(true);
      FB.press();
      reset();
      ticked = -1;
      x0 = ev.clientX; y0 = ev.clientY; downAt = performance.now();
      pendingHold = setTimeout(() => { pendingHold = 0; justOpened = true; FB.held(); onHold(); }, HUB_HOLD_MS);
      pendingReveal = setTimeout(() => { pendingReveal = 0; reveal(); }, FLICK_REVEAL_MS);
    });
    e.addEventListener('pointermove', (ev) => {
      if (!key.pressed || justOpened) return;
      const dx = (ev.clientX - x0) / this.s, dy = (ev.clientY - y0) / this.s;
      if (!dragging) {
        if (Math.hypot(dx, dy) < FLICK_SLOP) return;
        dragging = true;
        clearTimeout(pendingHold);
        pendingHold = 0;
        if (performance.now() - downAt >= FLICK_REVEAL_MS) {
          clearTimeout(pendingReveal);
          pendingReveal = 0;
          highlight(wedgeAt(dx, dy));
          reveal();
          return;
        }
      }
      highlight(wedgeAt(dx, dy));
    });
    e.addEventListener('pointerup', (ev) => {
      ev.stopPropagation();
      key.press(false);
      FB.up();
      clearTimers();
      if (justOpened) { justOpened = false; highlight(-1); dragging = false; revealed = false; legendDone(); return; }
      if (!dragging) { onTap(); return; }
      const d = dist(ev);
      const w = d >= FLICK_MIN ? wedgeAt((ev.clientX - x0) / this.s, (ev.clientY - y0) / this.s) : -1;
      highlight(-1);
      if (w >= 0) { this.closeRadial(); onFire(w, e); }
      else if (d < FLICK_MIN && !revealed) onTap();
      else if (revealed && w < 0 && d >= FLICK_MIN) this.closeRadial();
      else if (revealed) legendDone();
      dragging = false;
      revealed = false;
    });
    e.addEventListener('pointercancel', () => { key.press(false); if (revealed) this.closeRadial(); reset(); });
  }
}

// Twin banks' near-miss guard as geometry, from the layout's keycaps (the
// design's section 6, whose hit model is its checks/lib.mjs hitModel):
//  - cells: each key's hit cell.  Within a bank every point is the nearest
//    keycap's, which for a bank's grid of keycaps is a rectangle per key out
//    to the middle of each gap; the outer column and the bottom row run on to
//    the screen's edge, and the pads' top row runs up to row 3's keycap (the
//    pads own the gap above them, so an overshoot from the pad stays on it).
//    The desk's dock (a mouse in use) sits mid-screen with panels beside it:
//    its cells stop at the dock's edge (deferred with desktop mode, Lucas,
//    2026-10-03: the page never lays the dock out today).
//  - banks: each bank's box, which side is its outer one, whether it is the
//    action pad's, and its halo: 12 dp round it, clipped to the screen (corner:
//    its inner top corner is still 12 dp round the last keycap's, and rounds).
//  - seams: on the action pad (rows 0-2 of the bank without the movement
//    pad), the strips between keycaps: the drawn gap, at least 8 dp about its
//    middle, so at 3 dp gaps they take 2.5 dp of each keycap's face.
//  - between: in portrait, the gap between the banks, where the halo's snap
//    narrows so the two never meet.
//  - live: the keycaps, for the halo's nearest key and web.js's ring.
function guardGeometry(S) {
  const live = S.controls.filter((c) => !c.behind), thumbs = S.pointer !== 'mouse';
  const cells = new Map(), banks = {}, seams = [];
  const same = (a, b) => Math.abs(a - b) < 0.01, unit = (v) => Math.round(v * 64) / 64;
  const uniq = (vals) => vals.sort((a, b) => a - b).filter((v, i, a) => i === 0 || !same(v, a[i - 1]));
  for (const th of ['L', 'R']) {
    const ks = live.filter((c) => c.thumb === th);
    if (!ks.length) continue;
    const x0 = Math.min(...ks.map((c) => c.x)), x1 = Math.max(...ks.map((c) => c.x + c.w));
    const y0 = Math.min(...ks.map((c) => c.y)), y1 = Math.max(...ks.map((c) => c.y + c.h));
    const outerLeft = x0 < S.W - x1;
    // the bank's columns, left to right, and its rows, top to bottom: the
    // bottom three are the pads
    const colX = uniq(ks.map((c) => c.x)), rowY = uniq(ks.map((c) => c.y));
    const colW = colX.map((v) => ks.find((c) => same(c.x, v)).w), rowH = rowY.map((v) => ks.find((c) => same(c.y, v)).h);
    const nr = rowY.length, padTop = nr - 3;
    // Each edge is put on Chrome's 1/64 px layout grid, so the keycap drawn
    // at the layout's place less the cell's lands where the layout puts it to
    // the layout unit: a cell edge between two units took the keycaps of the
    // 44.67 dp right columns 1/64 px off and moved their legends' edges.
    const xs = colX.map((v, i) => ({
      a: unit(i === 0 ? (outerLeft && thumbs ? 0 : x0) : (colX[i - 1] + colW[i - 1] + v) / 2),
      b: unit(i === colX.length - 1 ? (outerLeft || !thumbs ? x1 : S.W) : (v + colW[i] + colX[i + 1]) / 2),
    }));
    const ys = rowY.map((v, j) => ({
      a: unit(j === 0 ? y0 : j === padTop ? rowY[j - 1] + rowH[j - 1] : (rowY[j - 1] + rowH[j - 1] + v) / 2),
      b: unit(j === nr - 1 ? (thumbs ? S.H : y1) : j + 1 === padTop ? v + rowH[j] : (v + rowH[j] + rowY[j + 1]) / 2),
    }));
    for (const c of ks) {
      const X = xs[colX.findIndex((v) => same(v, c.x))], Y = ys[rowY.findIndex((v) => same(v, c.y))];
      cells.set(c.id, { x: X.a, y: Y.a, w: X.b - X.a, h: Y.b - Y.a });
    }
    const hx0 = Math.max(0, x0 - HALO), hy0 = Math.max(0, y0 - HALO), hx1 = Math.min(S.W, x1 + HALO), hy1 = Math.min(S.H, y1 + HALO);
    const corner = y0 - HALO >= 0 && (outerLeft ? x1 + HALO <= S.W : x0 - HALO >= 0);
    const action = !ks.some((c) => c.kind === 'pad');
    banks[th] = { x0, y0, x1, y1, outerLeft, action, halo: { x: hx0, y: hy0, w: hx1 - hx0, h: hy1 - hy0, corner } };
    if (action && padTop >= 0) {
      const top = rowY[padTop];
      for (let i = 0; i + 1 < colX.length; i++) {
        const a = colX[i] + colW[i], b = colX[i + 1], m = (a + b) / 2, half = Math.max((b - a) / 2, SEAM / 2);
        seams.push({ x: m - half, y: top, w: 2 * half, h: y1 - top });
      }
      for (let j = padTop; j + 1 < nr; j++) {
        const a = rowY[j] + rowH[j], b = rowY[j + 1], m = (a + b) / 2, half = Math.max((b - a) / 2, SEAM / 2);
        seams.push({ x: x0, y: m - half, w: x1 - x0, h: 2 * half });
      }
    }
  }
  let between = null;
  if (S.H > S.W && banks.L && banks.R) {
    const xa = Math.min(banks.L.x1, banks.R.x1), xb = Math.max(banks.L.x0, banks.R.x0);
    between = { x0: xa, x1: xb, w: Math.max(0, xb - xa), y0: Math.min(banks.L.y0, banks.R.y0) };
  }
  return { cells, banks, seams, between, live };
}

// The pill while the stairs wait for their second tap: the lit centre's word
// and where to tap.  The pill is 120 dp (layout.js), about 17 letters, and
// "DESCEND: TAP CENTRE" lost its last one.
const stairsPill = (act) => `${act.word.toUpperCase()}? CENTRE`;

// a layout reason's first clause, for a settings line
const firstReason = (r) => String(r || '').split('; ')[0];

// Twin banks' attack pins.  They are kept apart from classic's: PIN 2 starts
// on Fire in twin and classic's second point stays empty, and with one array
// the first pin set in twin wrote [x, 'f'] where classic reads its pins, so
// classic's second point became Fire (the layers stage's review,
// 2026-10-03).  Until twin's are set, they are classic's, an empty PIN 2
// taking Fire unless Fire is pinned already; a player who pinned in classic
// finds those pins in twin.
function twinPins() {
  const own = P.get('atkSlotsTwin');
  if (Array.isArray(own)) return own.slice();
  const pins = (P.get('atkSlots') || C.ATK_SLOT_DEFAULT).slice(0, C.ATK_SLOT_DEFAULT.length);
  return pins.map((k, n) => k || (TWIN_ATK_DEFAULT[n] && !pins.includes(TWIN_ATK_DEFAULT[n]) ? TWIN_ATK_DEFAULT[n] : null));
}

// The rest of a touch whose key has gone (bindHold): its moves, and its lift
// or cancel, reach nothing past the window's capture phase, where the page's
// own bookkeeping of fingers (watchTwin, watchGuard) has already seen them.
function spendTouch(id) {
  const types = ['pointermove', 'pointerup', 'pointercancel'];
  const stop = (ev) => {
    if (ev.pointerId !== id) return;
    ev.stopImmediatePropagation();
    ev.preventDefault();
    if (ev.type !== 'pointermove') for (const t of types) window.removeEventListener(t, stop, true);
  };
  for (const t of types) window.addEventListener(t, stop, true);
}

// the smallest rect holding them all
function bounds(rs) {
  const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y));
  const x1 = Math.max(...rs.map((r) => r.x + r.w)), y1 = Math.max(...rs.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// The flick's wedge edges for a bearing set: each wedge runs halfway to its
// neighbours; the outer two a half-step plus the slack past their node
// (FLICK_ARC_SLACK; twin banks' TWIN_FLICK_SLACK).
function flickWedges(b, n, slack = FLICK_ARC_SLACK) {
  const lo = [], hi = [];
  for (let w = 0; w < n; w++) {
    lo[w] = w > 0 ? (b[w - 1] + b[w]) / 2 : b[w] - (b[w + 1] - b[w]) / 2 - slack;
    hi[w] = w < n - 1 ? (b[w] + b[w + 1]) / 2 : b[w] + (b[w] - b[w - 1]) / 2 + slack;
  }
  return [lo, hi];
}
