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
// Key feedback -- a vibration, the click, both or neither -- is feedback.js.

import * as C from './commands.js';
import * as P from './prefs.js';
import * as FB from './feedback.js';

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

// here-context flags (include/rhhere.h)
export const HERE_OBJECT = 0x01, HERE_STAIRS_DOWN = 0x02, HERE_STAIRS_UP = 0x04, ADJ_CLOSED_DOOR = 0x08,
  ADJ_HOSTILE = 0x10, HERE_CONTAINER = 0x20, HERE_ALTAR = 0x40, ADJ_OPEN_DOOR = 0x80;

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

const $ = (id) => document.getElementById(id);
const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const rad = (d) => (d * Math.PI) / 180;

// ______________________________________________________________________________
// A keycap (RhFace.drawKeycap): the tap legend on the top face, a hold legend
// on the front skirt, the raw key in the corner.  Pressed, the face drops.

const fitQueue = new Set();
let fitScheduled = false;
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
    s.left = `${x}px`; s.top = `${y}px`; s.width = `${w}px`; s.height = `${h}px`;
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
    return this;
  }

  tag(t) { this.tagText = t; this.updateCorner(); return this; }

  updateCorner() {
    let corner = this.subRaw && this.subText ? this.subText.trim() : this.tagText;
    if (this.subRaw && corner && corner.length > 4) corner = null;
    this.rk.textContent = corner || '';
  }

  placeholder(on) { this.isPh = on; this.el.classList.toggle('ph', on); this.paint(); return this; }

  lamp(state) {
    let l = this.tp.querySelector('.lamp');
    if (state === null) { if (l) l.remove(); return this; }
    if (!l) l = el('span', 'lamp', this.tp);
    l.classList.toggle('on', state);
    return this;
  }

  lit(on) { this.el.classList.toggle('lit', on); return this; }
  // the flick key: a pointing stick's rubber nub rather than a keycap (RhFace.nub)
  nub(on) { this.isNub = on; this.el.classList.toggle('nub', on); return this; }
  press(on) { this.pressed = on; this.el.classList.toggle('pressed', on); }
  show(on) { this.el.style.display = on ? '' : 'none'; return this; }

  // RhFace.fitLabel: shrink the legend until it fits the face
  fit() {
    if (!this.el.isConnected || ARROW_DEG[this.text] !== undefined) return;
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
    window.addEventListener('resize', () => this.rebuild());
    P.onChange((name) => {
      if (['style', 'case', 'padCell', 'labelMode', 'phosphor'].includes(name)) this.rebuild();
      if (name === 'statusLines') this.host.glassChanged(this.geom);
      if (name === 'msgFont' || name === 'msgSize') this.rebuild();
    });
    if (document.fonts) document.fonts.ready.then(() => this.rebuild());
    this.rebuild();
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
    const W = window.innerWidth, H = window.innerHeight;
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

  resetState() {
    P.macros();   // first run with the flick key moves the retired third point's command first
    this.atkSlotKeys = (P.get('atkSlots') || C.ATK_SLOT_DEFAULT).slice(0, C.ATK_SLOT_DEFAULT.length);
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
    this.ctxRadialOpen = false;
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
    if (!this.lamps) return;
    this.lamps.querySelector('.search').classList.toggle('on', !!P.get('searchMode'));
    this.lamps.querySelector('.armed').classList.toggle('on', !!this.armed);
    this.lamps.querySelector('.more').classList.toggle('on', this.more > 0);
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
    this.scrimHint.style.top = `${this.glassTop() + 6}px`;
    this.scrim.addEventListener('pointerup', (e) => { e.preventDefault(); this.dismissPopups(); });
    this.scrim.addEventListener('pointerdown', (e) => e.preventDefault());
    this.buildDrawer(K);
    this.flashEl = el('div', '', K);
    this.flashEl.id = 'flash';
    this.flashEl.style.zIndex = 30;
    this.refreshContextStrip();
    this.refreshRestFaces();
    this.refreshPadCentre();
    this.recomputeContext();
    if (this.answering) this.paintAnswers();
  }

  // Rest (with Long rest in its scroll well), Msgs and macro 1: the left bank's top rows.
  buildRestAndMsgs(K) {
    const inn = this.termInner(), P_ = this.portrait;
    // the scroll well: landscape, the left bank's top row; portrait, the key row's first slot
    const at = P_ ? this.pFnBox(0) : this.tl(this.termWideKey(), T_ROW1_H, inn, inn);
    const wide = at.w, h = at.h;
    const slot = el('div', 'well-slot', K);
    Object.assign(slot.style, { left: `${at.x}px`, top: `${at.y}px`, width: `${wide}px`, height: `${h}px` });
    const strip = el('div', 'strip', slot);
    strip.style.width = `${2 * wide + T_GAP}px`;
    this.restFace = new Key(strip).place(0, 0, wide, h).face(C.A90);
    this.longFace = new Key(strip).place(wide + T_GAP, 0, wide, h).cap(longRestCap());
    this.restFace.lg.style.paddingRight = '14px';
    this.longFace.lg.style.paddingRight = '14px';
    const dots = el('div', 'dots', slot);
    dots.innerHTML = '<i class="on"></i><i></i>';
    this.restWell = { slot, strip, dots, revealed: false, pinned: false, timer: 0, wide };
    this.bindScrollWell(this.restWell);
    this.bindHold(this.restFace, CHIP_HOLD_MS, () => this.openRestChips(C.CTX_REST), () => {
      this.closeChips();
      this.runAction(C.CTX_REST, slot);
    });
    this.bindHold(this.longFace, CHIP_HOLD_MS, () => this.openRestChips(C.CTX_LONG_REST), () => {
      this.closeChips();
      this.runAction(C.CTX_LONG_REST, slot);
      this.scrollWell(false);
    });

    const prev = new Key(K).box(P_ ? this.pFnBox(1) : this.tl(T_KEY, T_ROW1_H, inn + this.padBox - T_KEY, inn))
      .face(C.VIOLET).label(this.labelFor(C.PREV_MSGS), 9).sub(this.subKeyFor(C.PREV_MSGS), true);
    this.bindTap(prev, () => this.execute(C.PREV_MSGS, prev.el));

    // macro 1: under Msgs in landscape; beside SACRIFICE, over DROP, in portrait
    const macro = this.buildMacroKey(K, 0);
    macro.box(P_ ? this.lb(this.termWideKey(), P_ROW_H, inn + T_KEY + T_GAP, this.pRowBottom(1))
                 : this.tl(this.termWideKey(), T_KEY, inn + T_KEY + T_GAP, this.termRow2Top()));
    this.row2 = [macro];

    // Rest's chips: under the slot in landscape, above the key row in portrait
    const chips = P_ ? this.lb(CHIP_ROW_W + 8, CHIP_SIZE + 8, inn, this.pFnBottom() + P_FN_KEY + CHIP_GAP_ABOVE)
                     : this.tl(CHIP_ROW_W + 8, CHIP_SIZE + 8, inn, inn + T_ROW1_H + T_GAP);
    this.restChips = this.buildCountRow(K, C.CTX_REST, chips);
    this.longChips = this.buildCountRow(K, C.CTX_LONG_REST, chips);
  }

  bindScrollWell(w) {
    let x0 = 0, y0 = 0, t0 = 0, dragging = false, id = null;
    const travel = () => w.wide + T_GAP;
    const cur = () => (w.revealed ? -travel() : 0);
    w.slot.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; t0 = cur(); dragging = false; id = e.pointerId; }, true);
    w.slot.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = (e.clientX - x0) / this.s, dy = (e.clientY - y0) / this.s;
      if (!dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        // the key under the finger gets a cancel: no tap, no hold
        dragging = true;
        clearTimeout(w.timer);
        for (const k of [this.restFace, this.longFace]) k.cancelGesture && k.cancelGesture();
        w.strip.classList.add('drag');
      }
      if (dragging) w.strip.style.transform = `translateX(${clamp(t0 + dx, -travel(), 0)}px)`;
    }, true);
    const end = (e) => {
      if (e.pointerId !== id || !dragging) return;
      dragging = false;
      w.strip.classList.remove('drag');
      const m = /translateX\((-?[\d.]+)px\)/.exec(w.strip.style.transform);
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
    w.strip.style.transform = `translateX(${revealed ? -(w.wide + T_GAP) : 0}px)`;
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
    k.tag(this.portrait && slot > 0 && m.keys && (m.name || m.keys).trim() ? '' : `M${slot + 1}`);
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
    if (this.portrait) return;
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
    this.closeFan();
    this.closeRadial();
    this.closeDrawer();
    this.closeContextRadial();
    this.chipsOpen = act.countKey;
    this.refreshContextStrip();
  }

  refreshRestFaces() {
    const face = (k, r, act) => {
      if (!k || !r) return;
      const n = this.countFor(act), open = this.chipsOpen === act.countKey;
      k.label(P.get('labelMode') === 'keys' ? C.keyWithCount(act, n) : C.wordWithCount(act, n), 8.5)
        .sub(open ? 'pick a count' : 'hold to set');
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
    const mold = el('div', '', K);
    this.padMold = mold;
    const box = this.lb(this.padBox, this.padBox, left, this.termInner());
    Object.assign(mold.style, { position: 'absolute', left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col, key = C.PAD_KEYS[idx];
        const k = new Key(mold).place(col * pitch, row * pitch, this.padCell, this.padCell).cap(role(ROLE_MOVE));
        if (!key) {
          this.padCentre = k;
          this.bindHold(k, CENTRE_HOLD_MS, () => { if (!this.fanOpen && !this.answering) this.openContextRadial(); }, () => {
            if (this.answering) { this.answerPlace(4); return; }
            if (this.fanOpen) { this.layerPlaceTapped(4, k.el); return; }
            if (this.directionPending()) this.pressDirection('.');
            else this.execute(this.padCentreCommand(), k.el);
          });
          continue;
        }
        k.label(C.PAD_ARROW[idx], 18, true).sub(key, true);
        this.bindTap(k, () => {
          if (this.answering) { this.answerPlace(idx); return; }
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
    Object.assign(f.style, { left: `${box.x - 5}px`, top: `${box.y - 5}px`, width: `${box.w + 10}px`, height: `${box.h + 10}px` });
    this.layerFrame = f;
  }

  directionPending() { return !!this.armed || this.expectsDirection; }
  padCentreCommand() { return this.hereHas(HERE_OBJECT) ? C.PICKUP : C.SEARCH; }

  refreshPadCentre() {
    const k = this.padCentre;
    if (!k || this.fanOpen || this.answering) return;   // a layer or a question owns the centre
    if (this.directionPending()) k.label('HERE', 8).sub('.', true);
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
    if (P.get('searchMode') && !this.expectsDirection) {
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
    if (hub === C.HUB_EQUIP) {
      // the inventory bar over the matrix; portrait, the action pad's bottom-left cell
      hv.face.box(this.portrait ? this.pCell(0, 2) : this.tr(this.padBox, T_EQ_BAR, this.termInner(), this.termEqTop()))
        .sub(this.hubIdleSub(hub)).tag('i');
      hv.face.fr.style.fontSize = '6.5px';
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
      const slot = new Key(hv.satellites).box(this.termAttackSlot(n));
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
      const at = this.portrait ? this.rb(cellW, P_ROW_H, right, this.pRowBottom(1 - row))
                               : this.tr(cellW, T_EQ_CELL_H, right, top);
      const slot = new Key(hv.satellites).box(at).defaultCap(role(ROLE_INVENTORY));
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
      if (!item) return;   // empty: a tap does nothing; the hold fills it
      if (attack) this.fireFromHub(C.HUB_ATTACK, item, slot.el);
      else this.execute(item, slot.el);
    });
  }

  slotItem(attack, n) { return C.pinnable((attack ? this.atkSlotKeys : this.equipSlotKeys)[n]); }

  refreshSlots(hv, attack) {
    const taking = this.assignAccepts(attack);
    const hidden = !taking && (hv.hub.id === this.fanOpen || hv.hub.id === this.radialOpen);
    hv.slotFaces.forEach((slot, n) => {
      const item = this.slotItem(attack, n);
      slot.show(!hidden);
      if (taking) slot.placeholder(false).face(C.A90).label('HERE', 8).sub(null);
      else if (!item) slot.placeholder(true).label('+', 15).sub('hold to fill');
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

  placeAssignment(attack, n) {
    const keys = attack ? this.atkSlotKeys : this.equipSlotKeys;
    for (let k = 0; k < keys.length; k++) if (keys[k] === this.assign.key) keys[k] = null;
    keys[n] = this.assign.key;
    P.set(attack ? 'atkSlots' : 'equipSlots', keys);
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
    P.set(attack ? 'atkSlots' : 'equipSlots', keys);
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
      k.cap(role(ROLE_MOVE)).placeholder(false).tag(null).lit(false)
        .label(C.PAD_ARROW[idx], 18, true).sub(C.PAD_KEYS[idx], true);
    });
    if (this.padCentre) this.padCentre.cap(role(ROLE_MOVE)).placeholder(false).tag(null).lit(false);
    this.refreshPadCentre();
  }

  showFrame(title, accent) {
    const fr = this.layerFrame;
    if (!fr) return;
    fr.style.setProperty('--acc', accent);
    fr.firstChild.textContent = title;
    fr.classList.add('on');
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
    if (this.layerFrame) this.layerFrame.classList.remove('on');
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
  }

  closeFan() {
    if (!this.fanOpen) return;
    const was = this.hubView(this.fanOpen);
    this.fanOpen = null;
    this.restorePad();
    if (this.layerFrame) this.layerFrame.classList.remove('on');
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
    const c = this.flickCentre(), bearings = C.FLICK_BEARING, n = bearings.length;
    // the flick's wedges, drawn behind the nodes
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
    this.flickNodes = bearings.map((deg, w) => {
      const slot = P.FLICK_TAP + 1 + w;
      const x = c.x + Math.cos(rad(deg)) * C.FLICK_RADIUS, y = c.y + Math.sin(rad(deg)) * C.FLICK_RADIUS;
      const node = new Key(radial).place(x - SAT_SIZE / 2, y - SAT_SIZE / 2, SAT_SIZE, SAT_SIZE);
      this.bindHold(node, HUB_HOLD_MS, () => { if (!this.assign) this.editMacro(slot); }, () => {
        if (this.assign) { this.placeMacro(slot); return; }
        this.closeRadial();
        this.runOrEditMacro(slot, node.el);
      });
      return node;
    });
    const face = new Key(K).nub(true).box(this.termAttackSlot(2)).face(C.JADE).tag('FLICK');
    this.flickFace = face;
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
    if (this.fanOpen) { const hv = this.hubView(this.fanOpen); if (hv) lift.push(hv.face.el, this.padMold, this.layerFrame); }
    if (this.radialOpen) {
      const hv = this.hubView(this.radialOpen);
      if (hv) lift.push(hv.face.el);
      lift.push(this.radials.get(this.radialOpen));
    }
    if (this.ctxRadialOpen) lift.push(this.ctxRadialEl);
    if (this.candOpen && this.ctxStrip[1]) lift.push(this.ctxStrip[1].el, this.candEl);
    if (this.chipsOpen) {
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
        if (this.assignAcceptsFan(hv.hub)) lift.push(hv.face.el, this.padMold, this.layerFrame);
      }
      if (!this.flickPlacing()) for (const k of this.macroKeys) if (k) lift.push(k.el);
    }
    // the flick key and its radial go on top of everything else lifted
    const top = [];
    if (this.flickFace && (this.assign || this.radialOpen === FLICK_ID)) top.push(this.flickFace.el);
    if (this.radialOpen === FLICK_ID) top.push(this.radials.get(FLICK_ID));
    for (const e of top) lift.push(e);
    if (!lift.length) { this.scrim.classList.remove('on'); return; }
    this.scrimHint.textContent = this.assign
      ? `TAP A LIT KEY TO PLACE ${this.assign.word.toUpperCase()}  ·  TAP ELSEWHERE OR ESC TO CANCEL`
      : 'TAP ANYWHERE OR ESC TO CLOSE';
    this.scrim.classList.add('on');
    for (const e of lift) if (e) e.classList.add('lift');
    for (const e of top) if (e) e.classList.add('lift2');
  }

  dismissPopups() {
    const any = !!(this.chipsOpen || this.candOpen || this.assign || this.radialOpen || this.ctxRadialOpen || this.fanOpen);
    this.closeChips();
    this.closeCandidates();
    this.cancelAssignment();
    this.closeRadial();
    this.closeContextRadial();
    this.closeFan();
    this.syncModal();
    return any;
  }

  closeAll() {
    this.closeChips();
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
    this.flashRaw(cmd.key, from);
    this.updateLamps();
    this.refreshPadCentre();
    this.banner.label(`${cmd.word.toUpperCase()} — PICK A DIRECTION`, 10).show(true);
    this.fitBanner();
  }

  disarm() {
    if (!this.armed) return;
    this.armed = null;
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

  closeContextRadial() {
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
      // Search (slot 2) is the strip's only counted action, so its row saves there
      this.chipRows.push(this.buildCountRow(K, C.CTX_SEARCH, this.termChipBox(n)));
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
        if (n === 1 && this.candidates.length > 1) { this.toggleCandidates(); return; }
        this.runAction(act, k.el);
      });
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
        row.row.style.display = 'none';
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
        f.label(lbl, 9).sub(this.candOpen ? 'pick one' : 'tap to pick');
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
    this.closeFan();
    this.closeRadial();
    this.closeContextRadial();
    this.chipsOpen = act.countKey;
    this.refreshContextStrip();
  }

  closeChips() {
    if (!this.chipsOpen) return;
    this.chipsOpen = null;
    this.refreshContextStrip();
  }

  // ---- SACRIFICE (hold: pray), the left bank's second row
  buildPray(K) {
    // landscape, the left bank's second row; portrait, its top row, over DROP
    const at = this.portrait ? this.lb(T_KEY, P_ROW_H, this.termInner(), this.pRowBottom(1))
                             : this.tl(T_KEY, T_KEY, this.termInner(), this.termRow2Top());
    const f = new Key(K).box(at).face(C.A90).label('SACRIFICE', 7.5).sub('hold · pray');
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
      const at = this.portrait ? this.pFnBox(2 + s) : this.tr(w, T_ROW1_H, right, this.termInner());
      const f = new Key(K).box(at).label(spec.label, 9);
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
    // portrait: 604 does not fit a phone's width, so three columns in 420 (RhDrawer, narrow)
    Object.assign(panel.style, { top: '58px', width: this.portrait ? '420px' : '604px',
      maxHeight: `${Math.min(this.portrait ? 520 : 342, this.DH - 70)}px` });
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
    this.drawerGrid.style.gridTemplateColumns = `repeat(${this.portrait ? 3 : 4}, minmax(0, 1fr))`;
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
      { label: 'Reset zoom', run: () => { P.set('zoom', 0); this.host.glassChanged(this.geom); } },
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
        put('padCell', parseInt(v.padCell, 10));
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
      const r = from.getBoundingClientRect();
      x = (r.left + r.width / 2 - kr.left) / this.s;
      y = (r.top - kr.top) / this.s - 22;
    }
    f.classList.add('on');
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
  bindHold(key, holdMs, onHold, onTap) {
    const e = key.el;
    let pending = 0, justOpened = false;
    e.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      try { e.setPointerCapture(ev.pointerId); } catch (x) { /* synthetic */ }
      key.press(true);
      FB.press();
      justOpened = false;
      clearTimeout(pending);
      pending = setTimeout(() => { pending = 0; justOpened = true; FB.held(); onHold(); }, holdMs);
    });
    e.addEventListener('pointerup', (ev) => {
      ev.stopPropagation();
      key.press(false);
      FB.up();
      if (justOpened) { justOpened = false; return; }
      if (!pending) return;
      clearTimeout(pending);
      pending = 0;
      onTap();
    });
    e.addEventListener('pointercancel', () => { key.press(false); clearTimeout(pending); pending = 0; justOpened = false; });
    key.cancelGesture = () => { key.press(false); clearTimeout(pending); pending = 0; justOpened = false; };
  }

  // Tap / hold / flick on the flick key: a marking menu.  Press and slide toward a
  // node and it fires on release; the radial shows only after FLICK_REVEAL_MS.
  bindFlick(key, bearings, onHold, onTap, onFire) {
    const e = key.el, n = bearings.length;
    const [lower, upper] = flickWedges(bearings, n);
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
      if (justOpened) { justOpened = false; return; }
      if (!dragging) { onTap(); return; }
      const d = dist(ev);
      const w = d >= FLICK_MIN ? wedgeAt((ev.clientX - x0) / this.s, (ev.clientY - y0) / this.s) : -1;
      highlight(-1);
      if (w >= 0) { this.closeRadial(); onFire(w, e); }
      else if (d < FLICK_MIN && !revealed) onTap();
      else if (revealed && w < 0 && d >= FLICK_MIN) this.closeRadial();
      dragging = false;
      revealed = false;
    });
    e.addEventListener('pointercancel', () => { key.press(false); if (revealed) this.closeRadial(); reset(); });
  }
}

// The flick's wedge edges for a bearing set: each wedge runs halfway to its
// neighbours; the outer two a half-step plus FLICK_ARC_SLACK past their node.
function flickWedges(b, n) {
  const lo = [], hi = [];
  for (let w = 0; w < n; w++) {
    lo[w] = w > 0 ? (b[w - 1] + b[w]) / 2 : b[w] - (b[w + 1] - b[w]) / 2 - FLICK_ARC_SLACK;
    hi[w] = w < n - 1 ? (b[w] + b[w + 1]) / 2 : b[w] + (b[w] - b[w - 1]) / 2 + FLICK_ARC_SLACK;
  }
  return [lo, hi];
}
