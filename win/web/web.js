// Written for Rolehack by Lucas Ruiz, 2026-09-26.
//
// Rolehack web front end: a window port for the WebAssembly core.  The core
// calls nethackCallback(name, ...args) for every window-port function in
// win/shim/winshim.c and waits on the promise it returns, so each handler may
// take as long as the player does.  This file owns the game's side: input,
// the glass (the map in tiles or text, with the paper doll; zoom, pan and
// follow; the message and status lines after RhScreen), menus, prompts and
// forms.  The touch controls are overlay.js.
import createNetHack from './nethack.js';
import { setPalette, dressHero, LOOK_LEN } from './doll.js';
import { Overlay, STATUS_BAND, LINE, msgRows, msgBandPx, msgTextPx, MSG_LEADING, resetTextScale, creationCap,
  GHOST_CONFIRM_MS } from './overlay.js';
import { keyEvents } from './commands.js';
import * as P from './prefs.js';
import * as FB from './feedback.js';

const COLNO = 80, ROWNO = 21;
// CLR_BLACK .. CLR_WHITE; NO_COLOR (8) draws as gray.  Nudged apart for
// red-green vision (colour vision, layer 1; Lucas, 2026-09-28): the old red,
// green and brown were one lightness, so to a deuteranope blessed and cursed,
// and 155 pairs of same-letter monsters, looked alike.  Each colour moved by
// at most 12 CIEDE2000 and kept its hue and most of its saturation; none of
// those pairs now falls under 8 for protanopes or deuteranopes.  Searched by
// the workspace's tools/cvd/cvd_webpal.py; grey and white stay neutral.
const COLORS = ['#777f81', '#ff6267', '#1a9b54', '#cc5b10', '#2c51ff', '#9c2d8b',
                '#23adba', '#c6bfbb', '#c6bfbb', '#eea104', '#55ff9f', '#f2fd19',
                '#34aeff', '#f364c9', '#4ee6fc', '#f8fcf6'];
const MG_PET = 0x10;
const MENU_ITEMFLAGS_SELECTED = 1;
const ATR = { BOLD: 1, DIM: 2, ULINE: 4, BLINK: 5, INVERSE: 7 };
// RhStatus's conditions: short name and severity (2 deadly, 1 impairing, 0 movement)
const CONDITIONS = {
  GRAB: ['Grab', 2], STRNGL: ['Strngl', 2], FOODPOIS: ['FoodPois', 2], SLIME: ['Slime', 2],
  STONE: ['Stone', 2], TERMILL: ['TermIll', 2], INLAVA: ['InLava', 2], BLIND: ['Blind', 1],
  CONF: ['Conf', 1], DEAF: ['Deaf', 1], HALLU: ['Hallu', 1], STUN: ['Stun', 1], FLY: ['Fly', 0],
  LEV: ['Lev', 0], RIDE: ['Ride', 0], ELF_IRON: ['Iron', 1], SUBMERGED: ['Submrg', 1],
  PARLYZ: ['Parlyz', 2], UNCONSC: ['Out', 2], SLEEPING: ['Zzz', 2], HELD: ['Held', 1],
  TRAPPED: ['Trap', 1], TETHERED: ['Teth', 1], WOUNDEDL: ['WLegs', 1], BUSY: ['Busy', 1],
  HOLDING: ['UHold', 0], ICY: ['Icy', 0], SLIPPERY: ['Slip', 0], GLOWHANDS: ['Glow', 0], BAREH: ['Bare', 0],
};
const CONDITION_ORDER = Object.keys(CONDITIONS);
// RhBadges' tiers: critical, serious, warning, info.  Each has a style as well
// as a colour, so it reads without colour vision (colour vision, layer 1; the
// phone's RhBadges.style): solid, bold and framed; solid; an outline; plain
// text.  Okabe and Ito's colour-blind-safe hues.
const TIER_BG = ['#b84a00', '#e69f00', '#f0e442', '#56b4e9'], TIER_FG = ['#ffffff', '#1a1206', '#1a1206', '#1a1206'];
const TIER_STYLE = ['framed', 'solid', 'outline', 'plain'];
// Colour vision (layer 2; Lucas, 2026-09-28): the game's colours for each
// setting, as the phone's RhTheme.gameColour(); Standard is COLORS above.
// Protanopia and deuteranopia share one palette, green turned toward cyan so
// blessed reads apart from cursed; every colour pair that monsters sharing a
// letter use stays at least 14 CIEDE2000 apart in either vision.  Tritanopia
// has its own.  Monochrome moves only green, yellow and red (blessed,
// uncursed, cursed) apart in lightness.  From tools/cvd/cvd_modes.py.
const RED_GREEN = ['#4c4f4e', '#fe5a6b', '#29b491', '#a57007', '#4881ff', '#7134d5', '#3f98a8', '#c4c5cc',
                   '#c4c5cc', '#c7b709', '#a0f2a1', '#ffff0c', '#9eb3ff', '#c5166a', '#00c5f6', '#fffff8'];
const MODE_COLORS = {
  protanopia: RED_GREEN,
  deuteranopia: RED_GREEN,
  tritanopia: ['#4a4f4c', '#fe002a', '#5e8d42', '#a97404', '#9454d8', '#ab1b5b', '#066670', '#aab4b6',
               '#aab4b6', '#acaa26', '#78ff00', '#fbeb4c', '#2daaf3', '#ff82ba', '#07f4e7', '#f8ffff'],
  monochrome: ['#777f81', '#fb8f79', '#2d8e44', '#cc5b10', '#2c51ff', '#9c2d8b', '#23adba', '#c6bfbb',
               '#c6bfbb', '#eea104', '#55ff9f', '#ffff75', '#34aeff', '#f364c9', '#4ee6fc', '#f8fcf6'],
};
const gameColour = (clr) => (MODE_COLORS[P.get('colourVision')] || COLORS)[clr];
// HP by tier, as the phone's RhTheme.hpTier() and hpColour(): plain from two
// thirds up, a warning colour from one third (yellow, or white under the amber
// and green phosphors, whose own text is too close to yellow for red-green
// vision), and vermillion in inverse video below that.  The status line and
// the hero's outline on the map share the steps.
const PHOS_TEXT = { color: '#d7e3d0', amber: '#f5a93a', green: '#52e472', white: '#cdd4e0' };
const PHOS_DIM = { color: '#8c9a88', amber: '#9c6a22', green: '#2c8c46', white: '#7d8698' };
const hpTier = (f) => (f >= 0.66 ? 0 : f >= 0.33 ? 1 : 2);
function hpColour(tier) {
  const p = P.get('phosphor');
  // monochrome: quiet when well, brighter when hurt, inverse when critical
  if (tier === 0) return (P.get('colourVision') === 'monochrome' ? PHOS_DIM : PHOS_TEXT)[p] || PHOS_TEXT.color;
  if (tier === 1) return p === 'amber' || p === 'green' ? '#ffffff' : '#ffe14d';
  return '#ff6a33';
}

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

let M;                    // the Emscripten module
let K;                    // nethackGlobal.constants
let G;                    // nethackGlobal.globals
const wins = new Map();   // winid -> { type, lines, menu }
let nextWin = 1;
let grid = blankGrid();
let cursor = { x: -1, y: -1 };
let focus = { x: -1, y: -1 };   // cliparound's point, where the core gives one
let lastFocus = { x: -1, y: -1 };
const history = [];      // every message, for ^P (the band's page is below)
const status = {};        // field name -> { text, color }
let condMask = 0;
let moreShown = false;
let geom = null;          // where the glass is (overlay.js)
let overlay = null;

function blankGrid() {
  return Array.from({ length: ROWNO }, () =>
    Array.from({ length: COLNO }, () => ({ ch: 32, color: 8, flags: 0, tile: -1 })));
}

/* ---------- input ---------- */

const queue = [];
let waiter = null;

function push(ev) {
  // a key while the ghost deck previews a cell: the preview was not what was meant
  if (ghostPreview && ev.key !== undefined) clearGhostPreview(false);
  if (waiter) { const w = waiter; waiter = null; w(ev); } else queue.push(ev);
}

function nextInput() {
  render();
  return queue.length ? Promise.resolve(queue.shift())
                      : new Promise((r) => { waiter = r; });
}

async function nextKey() {
  for (;;) {
    const ev = await nextInput();
    if (ev.key !== undefined) return ev.key;
  }
}

const ARROWS = { ArrowLeft: 'h', ArrowRight: 'l', ArrowUp: 'k', ArrowDown: 'j',
                 Home: 'y', PageUp: 'u', End: 'b', PageDown: 'n' };

function keyCode(e) {
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
  }
  if (e.key.length !== 1) return null;
  const c = e.key.charCodeAt(0);
  if (e.ctrlKey && /^[a-z]$/i.test(e.key)) return e.key.toUpperCase().charCodeAt(0) & 0x1f;
  if (e.altKey && c < 128) return c | 0x80;   // M- commands
  return c;
}

let formOpen = null;

window.addEventListener('keydown', (e) => {
  if (formOpen) {
    if (e.key === 'Escape') { e.preventDefault(); formOpen.cancel(); }
    else if (e.key === 'Enter') { e.preventDefault(); formOpen.accept(); }
    return;
  }
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  const k = keyCode(e);
  if (k === null) return;
  e.preventDefault();
  // Esc closes the interface's own popups first, as Back did on the phone
  if (k === 27 && $('modal').hidden && overlay && overlay.onBack()) return;
  push({ key: k });
});

// the overlay's commands, in gurrhack's notation, go in as keys; "#name" and
// a newline goes whole, with its name (keyEvents, commands.js)
function send(seq) {
  for (const ev of keyEvents(seq)) push(ev);
}

/* ---------- the glass: map, zoom, pan ---------- */

let sheet = null;         // tiles.png
let sheetPx = null;       // its pixels, for the doll
let sheetCols = 40;
const tileCache = new Map();
const dollCache = new Map();
const view = { T: 24, left: 0, top: 0, panX: 0, panY: 0, area: null };

async function loadTiles() {
  const info = await (await fetch('tiles.json')).json();
  sheetCols = info.cols;
  setPalette(info.palette);
  sheet = new Image();
  // the load event, not decode(): decode() waits while the page is hidden, so
  // an app started minimized or behind another window sat at "Loading"
  await new Promise((resolve, reject) => {
    sheet.onload = resolve;
    sheet.onerror = reject;
    sheet.src = 'tiles.png';
  });
  // the sheet at menu size, for the pictures beside menu items
  document.documentElement.style.setProperty('--menu-sheet',
    `${(sheet.width / 16) * MENU_TILE}px ${(sheet.height / 16) * MENU_TILE}px`);
  const c = document.createElement('canvas');
  c.width = sheet.width;
  c.height = sheet.height;
  const cx = c.getContext('2d');
  cx.drawImage(sheet, 0, 0);
  sheetPx = cx.getImageData(0, 0, c.width, c.height);
}

// tile n as 256 0xRRGGBB pixels, the form the doll works in
function tilePx(n) {
  let px = tileCache.get(n);
  if (px) return px;
  px = new Int32Array(256);
  const ox = (n % sheetCols) * 16, oy = Math.floor(n / sheetCols) * 16, d = sheetPx.data;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const i = ((oy + y) * sheetPx.width + ox + x) * 4;
      px[y * 16 + x] = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    }
  }
  tileCache.set(n, px);
  return px;
}

// the core's look (rhdoll.c), or null before there is a hero to dress
function heroLook() {
  const p = M ? M._web_hero_look() : 0;
  if (!p) return null;
  const a = new Array(LOOK_LEN);
  for (let i = 0; i < LOOK_LEN; i++) a[i] = M.getValue(p + 4 * i, 'i32');
  return a;
}

function dollCanvas(look) {
  const key = look.slice(3).join(',');
  if (dollCache.has(key)) return dollCache.get(key);
  const px = dressHero(look, tilePx);
  let c = null;
  if (px) {
    c = document.createElement('canvas');
    c.width = c.height = 16;
    const cx = c.getContext('2d'), img = cx.createImageData(16, 16);
    for (let i = 0; i < 256; i++) {
      img.data[i * 4] = (px[i] >> 16) & 255;
      img.data[i * 4 + 1] = (px[i] >> 8) & 255;
      img.data[i * 4 + 2] = px[i] & 255;
      img.data[i * 4 + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
  }
  if (dollCache.size > 64) dollCache.clear();
  dollCache.set(key, c);
  return c;
}

const statusBandH = () => ({ hidden: 0, compact: STATUS_BAND - LINE }[P.get('statusLines')] ?? STATUS_BAND);

// Lay the glass out where the overlay says it is.  In the case, the map fills
// the glass and centres between its bands; caseless, it fills the window.
function layoutGlass(g) {
  geom = g;
  if (g.twin) { layoutTwinGlass(g); return; }
  const gl = $('glass'), bands = $('bands'), s = g.s, r = g.glass;
  // what twin banks set and classic does not (layoutTwinGlass)
  $('statband').style.top = '';
  $('map').style.left = $('map').style.top = '';
  const box = g.caseless ? { x: 0, y: 0, w: g.W, h: g.H } : r;
  Object.assign(gl.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px`,
                            borderRadius: g.caseless ? '0' : `${r.r}px` });
  const bx = r.x - box.x, by = r.y - box.y;
  Object.assign(bands.style, { left: `${bx}px`, top: `${by}px`, width: `${r.w}px`, height: `${r.h}px` });
  bands.style.setProperty('--line', `${LINE * s}px`);
  // the message band: its own face and size (overlay.js msgTextPx), a fixed
  // number of rows, and the map below it
  resetTextScale();
  const mb = $('msgband'), bandPx = msgBandPx(g.portrait, s), textPx = msgTextPx();
  mb.style.fontFamily = P.get('msgFont') === 'screen' ? 'var(--screenfont)' : 'var(--msgfont)';
  mb.style.fontSize = `${textPx}px`;
  mb.style.lineHeight = `${textPx * MSG_LEADING}px`;
  mb.style.height = `${bandPx}px`;
  mb.style.padding = `${5 * s}px ${10 * s}px ${4 * s}px`;
  $('statband').style.fontSize = `${10.5 * 1.35 * s}px`;
  $('statband').style.height = `${statusBandH() * s}px`;
  $('statband').style.display = P.get('statusLines') === 'hidden' ? 'none' : '';
  $('chips').style.top = `${bandPx + 6 * s}px`;
  // Where the map centres: the glass between its bands; caseless, the whole
  // window -- except in portrait, where the banks take the bottom of the
  // screen and the hero centres in what is left above them (RhOverlay.mapArea)
  view.area = g.caseless && !g.portrait ? { x: 0, y: 0, w: box.w, h: box.h }
    : { x: bx + 2 * s, y: by + bandPx, w: r.w - 4 * s, h: r.h - bandPx - statusBandH() * s };
  // The canvas is exactly as big as its backing store, a device pixel to a
  // pixel, so what renderMap draws at a device pixel shows at that pixel and
  // the tap maths in CSS px finds it there.  Stretched to box.w, the store was
  // up to half a device pixel off across the glass, and resampled.
  const cv = $('map'), dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(box.w * dpr);
  cv.height = Math.round(box.h * dpr);
  cv.style.width = `${cv.width / dpr}px`;
  cv.style.height = `${cv.height / dpr}px`;
  render();
}

// Twin banks (overlay.js, layout.js): the glass where the layout puts it, the
// bands stacked at its top -- messages, then the status -- at the layout's own
// rects, and the canvas exactly the map area, so the map draws inside it and
// nothing outside it is map: a tap beside it lands on the case, the bands or
// the bezel, never on a cell.  The canvas's edges sit on device pixels, so its
// store maps a pixel to a pixel (the tap drift, layoutGlass above), each moved
// inward to the next one, so it never reaches past the map area.
function layoutTwinGlass(g) {
  const gl = $('glass'), bands = $('bands'), r = g.glass, m = g.map, mb = g.msgBand, sb = g.statusBand;
  const dpr = window.devicePixelRatio || 1, snap = (v) => Math.round(v * dpr) / dpr;
  const gx = snap(r.x), gy = snap(r.y);
  Object.assign(gl.style, { left: `${gx}px`, top: `${gy}px`, width: `${snap(r.x + r.w) - gx}px`, height: `${snap(r.y + r.h) - gy}px`,
                            borderRadius: `${r.r}px` });
  Object.assign(bands.style, { left: `${mb.x - gx}px`, top: `${mb.y - gy}px`, width: `${mb.w}px`, height: `${sb.y + sb.h - mb.y}px` });
  bands.style.setProperty('--line', `${LINE}px`);
  resetTextScale();
  const msg = $('msgband'), textPx = msgTextPx();
  msg.style.fontFamily = P.get('msgFont') === 'screen' ? 'var(--screenfont)' : 'var(--msgfont)';
  msg.style.fontSize = `${textPx}px`;
  msg.style.lineHeight = `${textPx * MSG_LEADING}px`;
  msg.style.height = `${mb.h}px`;
  msg.style.padding = '5px 10px 4px';
  const st = $('statband');
  st.style.fontSize = `${10.5 * 1.35}px`;
  st.style.top = `${sb.y - mb.y}px`;
  st.style.height = `${sb.h}px`;
  st.style.display = P.get('statusLines') === 'hidden' ? 'none' : '';
  // a prompt's choices at the top of the map, as they are under the band in classic
  $('chips').style.top = `${m.y - mb.y + 6}px`;
  const cv = $('map'), inF = (v) => Math.ceil(v * dpr - 1e-6) / dpr, inL = (v) => Math.floor(v * dpr + 1e-6) / dpr;
  const cx = inF(m.x), cy = inF(m.y);
  cv.width = Math.max(1, Math.round((inL(m.x + m.w) - cx) * dpr));
  cv.height = Math.max(1, Math.round((inL(m.y + m.h) - cy) * dpr));
  cv.style.left = `${cx - gx}px`;
  cv.style.top = `${cy - gy}px`;
  cv.style.width = `${cv.width / dpr}px`;
  cv.style.height = `${cv.height / dpr}px`;
  view.area = { x: 0, y: 0, w: cv.width / dpr, h: cv.height / dpr };
  render();
}

// The canvas's store and the drawn cell are in device pixels, and
// devicePixelRatio can change with no resize: the window taken to a screen of
// another density, or the system's scaling changed.  The glass is laid out
// again then; the keys are in CSS px and stay as they are.  A resolution query
// matches only the ratio it was made at, so each change makes the next one.
(function watchDensity() {
  if (!window.matchMedia) return;
  const mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  const changed = () => {
    if (mq.removeEventListener) mq.removeEventListener('change', changed);
    else mq.removeListener(changed);
    if (geom) layoutGlass(geom);
    watchDensity();
  };
  if (mq.addEventListener) mq.addEventListener('change', changed);
  else mq.addListener(changed);   // Safari before 14
}());

// The cell the map is drawn at, in CSS px.  renderMap draws in whole device
// pixels, so a cell of T CSS px is floor(T x dpr) of them, which is this many
// CSS px; placement, the border, the cursor, the pinch and the tap handler
// all take this one cell.  They took T while the drawing took round(T x dpr),
// and the two grids drifted apart by the difference each column: on Lucas's
// phone in portrait (dpr 2.4375, T 17, drawn 16.82) a tap on the drawn centre
// of any column past 46 read as the cell to its left, and the hero walked
// there (the layout audit's section 4.5, 2026-09-29).  Floored, not rounded,
// so the drawn cell is never larger than asked and a cell fitted to the
// level's 21 rows still fits them (the twin banks design, its section 11).
// The 1e-6 keeps a cell that is already whole device pixels (a pinch starts
// from one) from losing one to the floating point.
function drawnCell(T) {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(4, Math.floor(T * dpr + 1e-6)) / dpr;
}

// a length in CSS px moved to the nearest device pixel, where renderMap draws
function toDevicePx(v) {
  const dpr = window.devicePixelRatio || 1;
  return Math.round(v * dpr) / dpr;
}

// the factor a twin banks pinch under way has reached (setZoom), 0 between pinches
let pinchFactor = 0;

function tileSize() {
  // Twin banks: the device's one map cell (layout.js), the same in both
  // orientations, times twin's own zoom factor -- the pinch's while fingers
  // are down -- in classic's 8 to 96 px (the design's section 11).  Classic's
  // zoom is not read here: it is classic's, and a pinch in twin never writes it.
  if (geom && geom.twin && geom.cell > 0) {
    const f = pinchFactor || Number(P.get('zoomFactor')) || 1;
    return clamp(geom.cell * f, 8, 96);
  }
  const z = Number(P.get('zoom')) || 0;
  if (z > 0) return z;
  // fit the level's height, within reason
  return view.area ? clamp(Math.floor(view.area.h / ROWNO), 12, 48) : 24;
}

// A pinch or the wheel asks for a cell of px CSS px.  Classic stores it as
// its zoom, as it always has, the pinch on every move; twin banks store it as
// a factor of the map cell, the pinch's on its lift (live: still moving, kept
// in pinchFactor), not on every move (the design's section 11).
function setZoom(px, live) {
  if (!(geom && geom.twin && geom.cell > 0)) { P.set('zoom', clamp(px, 8, 96)); return; }
  const f = clamp(px, 8, 96) / geom.cell;
  if (live) { pinchFactor = f; render(); } else { pinchFactor = 0; P.set('zoomFactor', f); }
}
function endPinch() {
  const f = pinchFactor;
  pinchFactor = 0;
  if (f && geom && geom.twin) P.set('zoomFactor', f);
}

// view.T is the drawn cell and view.left and view.top sit on device pixels, so
// the grid placed here is the grid drawn, to the pixel.
function placeView() {
  const a = view.area, T = view.T = drawnCell(tileSize());
  const mapW = COLNO * T, mapH = ROWNO * T;
  // follow the hero: the core's cursor sits on it whenever it waits for a command
  const f = focus.x >= 0 ? focus : cursor.x >= 0 ? cursor : { x: 40, y: 10 };
  if (f.x !== lastFocus.x || f.y !== lastFocus.y) {   // it moved: any pan ends
    view.panX = view.panY = 0;
    lastFocus = { x: f.x, y: f.y };
  }
  // At rest the map is centred where it fits and follows the hero, kept to its
  // edges, where it does not.  A drag moves it from there as far as the finger
  // goes -- past the edges into the dark, as the phone's map does (ForkFront's
  // pan(), unbounded) -- until the hero moves.  It was kept inside the edges,
  // and could not move at all along a side it fits (Lucas, 2026-09-27: at most
  // zooms "I can't move the map down").
  const axis = (len, avail, start, fc, pan) => (len <= avail ? start + (avail - len) / 2
    : clamp(start + avail / 2 - (fc + 0.5) * T, start + avail - len, start)) + pan;
  view.left = toDevicePx(axis(mapW, a.w, a.x, f.x, view.panX));
  view.top = toDevicePx(axis(mapH, a.h, a.y, f.y, view.panY));
}

const HEART = ['.X.X.', 'XXXXX', '.XXX.', '..X..'];

function renderMap() {
  if (!view.area) return;
  placeView();
  const cv = $('map'), cx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1;
  // whole device pixels already (placeView); the rounding only clears the
  // floating point
  const Td = Math.round(view.T * dpr), L = Math.round(view.left * dpr), Tp = Math.round(view.top * dpr);
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.imageSmoothingEnabled = false;
  cx.fillStyle = '#000';
  cx.fillRect(0, 0, cv.width, cv.height);
  // the edge of the level, as the phone draws it (ForkFront's drawBorder(), at
  // its default opacity): a 2-pixel line just outside the map's 80 x 21
  cx.strokeStyle = 'rgb(39,39,48)';
  cx.lineWidth = 2;
  cx.strokeRect(L - 4 + 1, Tp - 4 + 1, COLNO * Td + 8 - 2, ROWNO * Td + 8 - 2);
  const tiles = P.get('mapMode') !== 'text' && sheet;
  const look = tiles ? heroLook() : null;
  if (!tiles) {
    cx.font = `${Math.round(Td * 1.05)}px VT323, Consolas, monospace`;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
  }
  for (let y = 0; y < ROWNO; y++) {
    const dy = Tp + y * Td;
    if (dy + Td < 0 || dy > cv.height) continue;
    for (let x = 0; x < COLNO; x++) {
      const dx = L + x * Td;
      if (dx + Td < 0 || dx > cv.width) continue;
      const c = grid[y][x];
      if (tiles) {
        if (c.tile < 0) continue;
        // the doll only where the map shows the hero's own base tile
        const doll = look && x === look[1] && y === look[2] && c.tile === look[3] ? dollCanvas(look) : null;
        if (doll) cx.drawImage(doll, dx, dy, Td, Td);
        else cx.drawImage(sheet, (c.tile % sheetCols) * 16, Math.floor(c.tile / sheetCols) * 16, 16, 16, dx, dy, Td, Td);
      } else if (c.ch !== 32 || c.u) {
        // the player's glyph: colour and character (colour vision, layer 3),
        // as tty draws them; a basic colour still follows Colour vision
        cx.fillStyle = !(c.custom >= 0) ? gameColour(c.color)
          : c.custom & 0x1000000 ? gameColour(c.custom & 15)
          : `#${c.custom.toString(16).padStart(6, '0')}`;
        cx.fillText(c.u ? String.fromCodePoint(c.u) : String.fromCharCode(c.ch), dx + Td / 2, dy + Td / 2 + 1);
      }
      if (c.flags & MG_PET) {
        const p = Math.max(1, Math.round(Td / 16));
        cx.fillStyle = '#ff3b5c';
        HEART.forEach((row, r) => [...row].forEach((ch, i) => {
          if (ch === 'X') cx.fillRect(dx + (1 + i) * p, dy + (1 + r) * p, p, p);
        }));
      }
    }
  }
  if (cursor.x >= 0) {
    // the hero's outline takes the status line's HP steps and colours, and
    // doubles below a third, as on the phone (colour vision, layer 1)
    const lw = Math.max(1, Math.round(Td / 16));
    const hpmax = Number(bare('BL_HPMAX'));
    const tier = hpmax > 0 ? hpTier(clamp(Number(bare('BL_HP')) / hpmax, 0, 1)) : 0;
    cx.strokeStyle = hpmax > 0 ? hpColour(tier) : '#e0b04a';
    cx.lineWidth = lw;
    const x0 = L + cursor.x * Td, y0 = Tp + cursor.y * Td;
    cx.strokeRect(x0 + lw / 2, y0 + lw / 2, Td - lw, Td - lw);
    if (tier === 2) cx.strokeRect(x0 + 2.5 * lw, y0 + 2.5 * lw, Td - 5 * lw, Td - 5 * lw);
  }
  if (ghostPreview) {
    // the ghost deck's preview: the cell a second tap walks to
    const lw = Math.max(1, Math.round(Td / 12));
    cx.strokeStyle = '#ffb347';
    cx.lineWidth = lw;
    cx.setLineDash([2 * lw, lw]);
    cx.strokeRect(L + ghostPreview.x * Td + lw / 2, Tp + ghostPreview.y * Td + lw / 2, Td - lw, Td - lw);
    cx.setLineDash([]);
  }
}

// Twin banks' ghost deck (overlay.js ghostAt; the design's section 6, item
// 8): in landscape a map tap on the spot of one of the old deck's keys --
// COMBAT, PIN 2, FLICK, LOOK, CONTEXT -- previews instead of travelling,
// whenever it would travel: while the core waits for a command, not at
// --More--, in getpos or under a window.  The cell is outlined and the old
// key points to its new place; a second tap on the same cell within 2 s
// walks.  A preview that goes unconfirmed -- it times out, or the next tap or
// key is something else -- is a catch: the player meant the old key.
let commandWait = false;    // the core is in nh_poskey for a command: a map tap would travel
let ghostPreview = null;    // { x, y, timer }: the cell a preview outlines

function clearGhostPreview(confirmed) {
  if (!ghostPreview) return;
  clearTimeout(ghostPreview.timer);
  ghostPreview = null;
  if (!confirmed && overlay) overlay.ghostCaught();
  renderMap();
}

// true when the tap was taken as a preview, and is not to travel
function ghostTap(e, x, y) {
  if (ghostPreview && ghostPreview.x === x && ghostPreview.y === y) { clearGhostPreview(true); return false; }
  if (ghostPreview) clearGhostPreview(false);
  const g = commandWait && overlay && overlay.ghostAt(e.clientX, e.clientY);
  if (!g) return false;
  ghostPreview = { x, y, timer: setTimeout(() => clearGhostPreview(false), GHOST_CONFIRM_MS) };
  overlay.ghostShow(g);
  renderMap();
  return true;
}

// Taps travel, drags pan, two fingers or the wheel zoom.
(function glassGestures() {
  const cv = $('map');
  const pts = new Map();
  let moved = false, pinch = null, panStart = null;
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (x) { /* synthetic */ }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { moved = false; panStart = { x: e.clientX, y: e.clientY, px: view.panX, py: view.panY }; }
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      // the cell as drawn: the fingers grow what they see
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), T: view.T };
      moved = true;
    }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      // classic writes its zoom as the fingers move, as it always has; twin
      // banks keep the factor in hand and write it on the lift
      setZoom(pinch.T * (d / pinch.d), true);
      if (!geom || !geom.twin) render();
      return;
    }
    if (pts.size === 1 && panStart) {
      const dx = e.clientX - panStart.x, dy = e.clientY - panStart.y;
      if (!moved && Math.hypot(dx, dy) < 10) return;
      moved = true;
      view.panX = panStart.px + dx;
      view.panY = panStart.py + dy;
      renderMap();
    }
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size < 2 && pinch) { pinch = null; endPinch(); }
    if (pts.size || moved) return;
    // a tap: a --More-- or a text window's wait is answered, else it is a click on the map
    if (moreShown) { push({ key: 32 }); return; }
    // the grid as drawn: view.T is the drawn cell, view.left and view.top sit
    // on device pixels (placeView)
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left - view.left) / view.T);
    const y = Math.floor((e.clientY - r.top - view.top) / view.T);
    if (x >= 0 && x < COLNO && y >= 0 && y < ROWNO && !ghostTap(e, x, y)) push({ click: { x, y, mod: 1 } });
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); if (pts.size < 2 && pinch) { pinch = null; endPinch(); } });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    // Each notch scales the cell asked for (tileSize()), not the drawn one: the
    // drawn cell is that floored to device pixels, so a trackpad's small steps
    // scaled from it would each be floored away and the map never grow.
    setZoom(tileSize() * Math.pow(1.1, -e.deltaY / 100), false);
    render();
  }, { passive: false });
  // A tap on the message band opens the history, always: a band that answers
  // only sometimes teaches that it never does (the message band research,
  // step 4).  At --More-- the tap is Space.  Not while a question waits on the
  // band or the pad, where a key would be taken as the answer.
  $('msgband').addEventListener('pointerup', () => {
    if (moreShown) push({ key: 32 });
    else if (!page.some((e) => e.ask) && !(overlay && overlay.answering)) send('^P');
  });
  // Twin banks: the canvas is the map area alone, so the status lines and the
  // glass round the map are #glass itself, which answered nothing.  At
  // --More-- a tap there is Space, as a tap anywhere on classic's glass is
  // (the design's section 6; the review, 2026-10-02); elsewhere it does
  // nothing, as before.  The map and the message band answer for themselves.
  const gl = $('glass'), own = (e) => e.target !== cv && !$('msgband').contains(e.target) && !e.target.closest('button');
  let glassDown = null;
  gl.addEventListener('pointerdown', (e) => { glassDown = own(e) ? e.pointerId : null; });
  gl.addEventListener('pointerup', (e) => {
    const down = glassDown;
    glassDown = null;
    if (down === e.pointerId && own(e) && geom && geom.twin && moreShown) push({ key: 32 });
  });
}());

/* ---------- the bands: messages and status (RhScreen) ---------- */

// The message band is tty's top line, three rows high (two in landscape).
// Messages fill it a page at a time; when the next one will not fit, it shows
// --More-- and waits, as tty's update_topl() does when its one line is full
// (win/tty/topl.c), so nothing the game says leaves the screen unseen (Lucas,
// 2026-09-28, after the message band research).  A message longer than the
// band is shown a band at a time.  Esc at --More-- sends the rest of the
// turn's messages to the history only, until the game next asks for input;
// the core's urgent messages still break through, and "You die" (tty's
// WIN_STOP, ATR_URGENT).  With the pause turned off the band shows the newest
// messages and counts the rest, "+N".  The pauses the game asks for itself,
// a MSGTYPE=stop rule's among them, stand either way.
const page = [];          // this page's messages: { text, ask }
let pageFresh = false;    // new since the player last acted; dimmed once they do
let unread = false;       // a message from the game is up that no --More-- or input has passed (tty's TOPLINE_NEED_MORE)
let newPage = true;       // the next message starts a page
let scrollRow = 0;        // a message longer than the band: the first page row shown
let msgStop = false;      // Esc at --More--
let lastHidden = 0;       // with the pause off, how many messages went by unshown
let measureCx = null;

function bandMetrics() {
  const mb = $('msgband'), cs = getComputedStyle(mb), s = geom ? geom.s : 1;
  const width = mb.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  measureCx = measureCx || document.createElement('canvas').getContext('2d');
  measureCx.font = `${cs.fontSize} ${cs.fontFamily}`;
  // tty keeps 8 columns of its line for --More-- (topl.c, CO - 8)
  const slot = measureCx.measureText('--More--').width + 14 * s;
  return { width, slot, rows: geom && geom.twin ? geom.msgRows : msgRows(!!(geom && geom.portrait)), cx: measureCx };
}

// A message broken into the band's rows at spaces, as tty breaks a long one;
// a word wider than a row is broken where it must be.  A page's last row keeps
// room at its right end for --More--.
function wrapRows(text, startRow, m) {
  if (m.width < 40) return [text];      // not laid out yet
  const out = [];
  let row = '', r = startRow;
  const room = () => m.width - ((r % m.rows) === m.rows - 1 ? m.slot : 0);
  const fits = (t) => m.cx.measureText(t).width <= room();
  const end = () => { out.push(row.replace(/ +$/, '')); row = ''; r++; };
  for (const w of text.split(/( +)/)) {
    if (!w) continue;
    if (/^ +$/.test(w)) {
      if (row && fits(row + w)) row += w; else if (row) end();   // a break falls on spaces, and eats them
      continue;
    }
    if (fits(row + w)) { row += w; continue; }
    if (row) end();
    let rest = w;
    while (!fits(rest)) {
      let n = rest.length - 1;
      while (n > 1 && !fits(rest.slice(0, n))) n--;
      row = rest.slice(0, n);
      end();
      rest = rest.slice(n);
    }
    row = rest;
  }
  if (row || !out.length) out.push(row);
  return out;
}

function pageRowsOf(entries, m) {
  const rows = [];
  for (const e of entries) for (const t of wrapRows(e.text, rows.length, m)) rows.push({ t, ask: !!e.ask });
  return rows;
}

const pausing = () => P.get('morePause') !== false;

const ATR_URGENT = 16, ATR_NOHISTORY = 32;   // wintype.h

function renderBands() {
  const m = bandMetrics(), s = geom ? geom.s : 1;
  let rows;
  lastHidden = 0;
  if (pausing()) {
    rows = pageRowsOf(page, m).slice(scrollRow, scrollRow + m.rows);
  } else {
    // the newest messages that fit whole; the newest alone cut short if it is longer
    let k = page.length;
    rows = [];
    while (k > 0) {
      const trial = pageRowsOf(page.slice(k - 1), m);
      if (trial.length > m.rows) break;
      rows = trial;
      k--;
    }
    if (!rows.length && page.length) {
      rows = pageRowsOf(page.slice(-1), m).slice(0, m.rows);
      rows[rows.length - 1].t += '…';
      k = page.length - 1;
    }
    lastHidden = k;
  }
  let html = rows.map((r) => `<div class="r${pageFresh ? '' : ' old'}">${r.ask ? `<span class="ask">${esc(r.t)}</span>` : esc(r.t)}</div>`).join('');
  const at = `right:${10 * s}px;bottom:${4 * s}px`;
  if (moreShown) html += `<span class="slot moreprompt" style="${at}">--More--</span>`;
  else if (lastHidden > 0) html += `<span class="slot more" style="${at}">+${lastHidden} ▸</span>`;
  $('msgband').innerHTML = html;
  if (overlay) overlay.setMore(moreShown ? 1 : lastHidden);
  $('statband').innerHTML = statusHtml();
  fitStatus();
}

function startPage() { page.length = 0; scrollRow = 0; newPage = false; }

// tty's more(): wait for Space or Enter (a tap on the glass is Space); Esc
// skips the rest of the turn's messages
async function more() {
  moreShown = true;
  renderBands();
  for (;;) {
    const k = await nextKey();
    if (k === 32 || isEnter(k)) break;
    if (k === 27) { msgStop = true; break; }
  }
  moreShown = false;
  unread = false;
}

// 256 messages, as the phone's log keeps (ForkFront's NHW_Message)
const HISTORY_MAX = 256;
function remember(text) {
  history.push(text);
  if (history.length > HISTORY_MAX) history.splice(0, history.length - HISTORY_MAX);
}

// A message from the game (putstr to the message window).
async function putMessage(text, attr = 0) {
  if (!(attr & ATR_NOHISTORY)) remember(text);
  if (msgStop && ((attr & ATR_URGENT) || /^You die/.test(text))) { msgStop = false; newPage = true; }
  if (msgStop) return;
  if (newPage) startPage();
  const m = bandMetrics(), pause = pausing() && m.width >= 40;
  if (pause) {
    const used = pageRowsOf(page, m).length;
    if (used > 0 && used + wrapRows(text, used, m).length > scrollRow + m.rows) {
      await more();
      startPage();
    }
  }
  page.push({ text });
  if (page.length > 50) page.shift();
  pageFresh = true;
  unread = true;
  // longer than the band: a band at a time, as long as it isn't skipped
  if (pause) {
    while (!msgStop && pageRowsOf(page, m).length - scrollRow > m.rows) {
      await more();
      if (!msgStop) scrollRow += m.rows;
    }
  }
  renderBands();
}

// A line that never waits: the interface's own notes, raw_print, an answered question.
function addMessage(text) {
  remember(text);
  if (newPage) startPage();
  page.push({ text });
  if (page.length > 50) page.shift();
  pageFresh = true;
}

// The player has acted: the page dims, the next message starts another, and
// an Esc at --More-- has run its course (tty clears WIN_STOP on input).
function endTurn() { pageFresh = false; unread = false; newPage = true; msgStop = false; }

const bare = (n) => ((status[n] && status[n].text) || '').trim();

function badges() {
  const out = [];
  CONDITION_ORDER.forEach((name, n) => {
    const v = K && K.BL_MASK && K.BL_MASK[`BL_MASK_${name}`];
    if (v && (condMask & v)) {
      const [word, sev] = CONDITIONS[name];
      out.push({ text: word.toUpperCase(), tier: sev === 2 ? 0 : sev === 1 ? 2 : 3, order: n });
    }
  });
  const h = bare('BL_HUNGER').toLowerCase();
  if (h) out.push({ text: h.toUpperCase(), tier: /^(weak|faint)/.test(h) ? 0 : h.startsWith('hungry') ? 1 : 2, order: 100 });
  const c = bare('BL_CAP').toLowerCase();
  if (c) out.push({ text: c.toUpperCase(), tier: c.startsWith('burdened') ? 2 : c.startsWith('stressed') ? 1 : 0, order: 101 });
  return out.sort((a, b) => a.tier - b.tier || a.order - b.order);
}

function statusHtml() {
  if (!bare('BL_HPMAX')) return '';
  const mode = P.get('statusLines'), compact = mode === 'compact';
  const title = bare('BL_TITLE');
  const hp = Number(bare('BL_HP')), hpmax = Number(bare('BL_HPMAX')) || 1;
  const frac = clamp(hp / hpmax, 0, 1);
  // HP's colour and the conditions' severities show under every phosphor, as
  // the menu colours do: they are warnings (Lucas, 2026-09-27; RhScreen)
  const tier = hpTier(frac), hpCol = hpColour(tier);
  const lab = (l, n) => (bare(n) ? ` ${l}${bare(n)}` : '');
  const tail1 = [bare('BL_LEVELDESC'), bare('BL_GOLD') !== '' ? `$:${bare('BL_GOLD')}` : '', bare('BL_TIME') ? `T:${bare('BL_TIME')}` : '']
    .filter(Boolean).join(' ');
  const xp = bare('BL_XP') ? ` Xp:${bare('BL_XP')}${bare('BL_EXP') ? `/${bare('BL_EXP')}` : ''}` : lab('HD:', 'BL_HD');
  const tail2 = `Pw:${bare('BL_ENE')}(${bare('BL_ENEMAX')})${lab('AC:', 'BL_AC')}${xp}${bare('BL_ALIGN') ? `  ${bare('BL_ALIGN')}` : ''}`;
  const stats = ['St:', 'Dx:', 'Co:', 'In:', 'Wi:', 'Ch:'].map((l, n) =>
    `${l}${bare(['BL_STR', 'BL_DX', 'BL_CO', 'BL_IN', 'BL_WI', 'BL_CH'][n])}`).join(' ');
  const badgeHtml = `<span class="badges">${badges().map((b) =>
    `<span class="badge ${TIER_STYLE[b.tier]}" style="--bc:${TIER_BG[b.tier]};--bf:${TIER_FG[b.tier]}">${esc(b.text)}</span>`).join('')}</span>`;
  const titleHtml = `<span class="title">${esc(title)}<span class="hpbar" style="width:calc(${(frac * 100).toFixed(1)}% + 1px);`
    + `background:${hpCol}"><span>${esc(title)}</span></span></span>`;
  const row1 = `<div class="row">${titleHtml}&nbsp;&nbsp;${esc(tail1)}${compact ? badgeHtml : ''}</div>`;
  const hpText = `HP:${esc(bare('BL_HP'))}(${esc(bare('BL_HPMAX'))})`;
  const hpHtml = tier === 2 ? `<span class="hpcrit" style="background:${hpCol}">${hpText}</span>`
    : `<span style="color:${hpCol}">${hpText}</span>`;
  const row2 = `<div class="row">${hpHtml}&nbsp;${esc(tail2)}</div>`;
  const row3 = compact ? '' : `<div class="row">${esc(stats)}&nbsp;&nbsp;${badgeHtml}</div>`;
  return row1 + row2 + row3;
}

// the lines shrink together until the widest fits
function fitStatus() {
  const sb = $('statband');
  if (!geom || sb.style.display === 'none') return;
  const base = 10.5 * 1.35 * geom.s;
  sb.style.fontSize = `${base}px`;
  const avail = sb.clientWidth - 20 * geom.s;
  let widest = 0;
  for (const r of sb.children) widest = Math.max(widest, r.scrollWidth);
  if (widest > avail && avail > 0) sb.style.fontSize = `${base * Math.max(0.6, avail / widest)}px`;
}

function render() {
  renderMap();
  renderBands();
  if (M && overlay) {
    const flags = M._web_here_flags();
    overlay.setHere(flags, flags >= 0 ? M.UTF8ToString(M._web_here_monster()) : '');
    overlay.setWizard(!!M._web_wizard());
  }
}


// gold arrives with its map symbol encoded as \GXXXXNNNN; keep the number
const plainGold = (s) => s.replace(/\\G[0-9a-fA-F]{8}:?/, '');

/* ---------- prompts: choices as chips ---------- */

// the choices a prompt offers: its explicit ones, or getobj's "[abc or ?*]"
function promptChoices(query, allowed) {
  if (allowed) return [...allowed.split('\x1b')[0]];
  if (/what direction/.test(query)) return ['<', '>', '.'];
  const m = /\[([^\]]*)\]/.exec(query);
  if (!m) return [];
  const out = [];
  for (const part of m[1].split(/\s+or\s+|\s+/)) {
    for (let i = 0; i < part.length; i++) {
      if (part[i + 1] === '-' && part[i + 2]) {
        for (let c = part.charCodeAt(i); c <= part.charCodeAt(i + 2); c++) out.push(String.fromCharCode(c));
        i += 2;
      } else if (part[i] !== '-') out.push(part[i]);
    }
  }
  return [...new Set(out)].slice(0, 40);
}

function showChips(choices) {
  const c = $('chips');
  c.innerHTML = '';
  if (!choices.length) return;
  for (const ch of choices) {
    const b = document.createElement('button');
    b.textContent = ch;
    b.addEventListener('pointerdown', () => { b.classList.add('pressed'); FB.press(); });
    b.addEventListener('pointerleave', () => b.classList.remove('pressed'));
    b.addEventListener('pointerup', (e) => { e.preventDefault(); b.classList.remove('pressed'); FB.up(); push({ key: ch.charCodeAt(0) }); });
    c.appendChild(b);
  }
  const x = document.createElement('button');
  x.className = 'esc';
  x.textContent = 'Esc';
  x.addEventListener('pointerdown', () => { x.classList.add('pressed'); FB.press(); });
  x.addEventListener('pointerleave', () => x.classList.remove('pressed'));
  x.addEventListener('pointerup', (e) => { e.preventDefault(); x.classList.remove('pressed'); FB.up(); push({ key: 27 }); });
  c.appendChild(x);
}

/* ---------- modal windows ---------- */

// A keycap for the windows' bezels, laid out in a row: the legend on the top
// face, and the key that does the same on the front skirt.  It never takes
// the focus, so a line being typed keeps it and a key isn't pressed twice.
function capButton(label, { key = '', amber = false, onTap = null } = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.tabIndex = -1;
  b.className = amber ? 'cap amber' : 'cap';
  b.innerHTML = `<span>${esc(label)}</span>${key ? `<b>${esc(key)}</b>` : ''}`;
  b.addEventListener('mousedown', (e) => e.preventDefault());
  b.addEventListener('pointerdown', () => { b.classList.add('pressed'); FB.press(); });
  const release = () => { if (b.classList.contains('pressed')) { b.classList.remove('pressed'); FB.up(); } };
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, release);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  if (onTap) b.addEventListener('click', onTap);
  return b;
}
// a key for the game, from a keycap
const pushKey = (k) => () => push({ key: k });

function openModal(title, bodyHtml, hint = '', caps = []) {
  $('modal-title').textContent = title || '';
  $('modal-title').hidden = !title;
  $('modal-body').innerHTML = bodyHtml;
  $('modal-body').scrollTop = 0;
  setHint(hint);
  $('modal-caps').replaceChildren(...caps);
  $('modal').hidden = false;
}
function setHint(text, count = false) {
  $('modal-hint').textContent = text;
  $('modal-hint').classList.toggle('count', count);
}
function closeModal() {
  $('modal').hidden = true;
  // character creation's keys go with the window (creationKeys)
  const keys = $('ckeys');
  if (keys) keys.remove();
  $('modal').querySelector('.box').classList.remove('creating');
}

// tty's text attributes, on the text alone as tty draws them
const ATTR_CLASS = { [ATR.BOLD]: 'bold', [ATR.DIM]: 'dim', [ATR.ULINE]: 'uline', [ATR.INVERSE]: 'inverse' };
function attrText(text, attr) {
  const cls = ATTR_CLASS[attr & 0xff];
  return cls ? `<span class="${cls}">${esc(text)}</span>` : esc(text);
}
// the game's colour for a line, when the screen follows the game's colours
// Plain text takes the phosphor; the game's colours -- the player's menu
// colours: blessed, uncursed, cursed -- show under every phosphor, since they
// carry what the phosphor only dresses (Lucas, 2026-09-27; the phone's
// RhDialogSkin.itemColour()).  Grey is the phosphor's dim, as on the phone.
function tint(clr) {
  if (!(clr >= 0 && clr < 16) || clr === 8) return '';
  if (clr === 7 && P.get('phosphor') !== 'color') return ' style="color:var(--phos-dim)"';
  return ` style="color:${gameColour(clr)}"`;
}
function lineHtml(l) {
  return `<div>${attrText(l.text, l.attr) || ' '}</div>`;
}

const isEnter = (k) => k === 13 || k === 10;

// tty's paging keys scroll the window: > next page, < previous, ^ first, | last
function pageKey(k) {
  const b = $('modal-body'), page = Math.max(40, b.clientHeight - 30);
  if (k === 62) b.scrollTop += page;
  else if (k === 60) b.scrollTop -= page;
  else if (k === 94) b.scrollTop = 0;
  else if (k === 124) b.scrollTop = b.scrollHeight;
  else return false;
  return true;
}
// Space pages on, as in tty, until the last page, where it acts as Enter
function spacePages() {
  const b = $('modal-body');
  if (b.scrollTop + b.clientHeight >= b.scrollHeight - 2) return false;
  pageKey(62);
  return true;
}

// A text window.  The history opens at its newest line, with keys to page
// back and on, a window at a time (the message band research, step 4:
// paging keeps a place where free scrolling loses it).
// The message rules (rhrules.c): a long press on a line of the history, or a
// right click, names that line and closes the history; the window port then
// asks what the rule should do.  The rules live in the core, and this page
// keeps them from game to game (syncRules; ~/.nethackrc).
const RH_KEY_RULE = 0xE001;   // rhrules.h
let ruleFrom = null;
let rulesKept = false;        // the rc carried the kept rules, so the core's list is whole

function armRuleLines(body) {
  for (const d of body.children) {
    const text = d.textContent.trim();
    if (!text) continue;
    d.classList.add('histline');
    let timer = null, x = 0, y = 0;
    const cancel = () => { clearTimeout(timer); timer = null; d.classList.remove('pressing'); };
    const choose = () => { cancel(); ruleFrom = text; push({ key: RH_KEY_RULE }); };
    d.addEventListener('pointerdown', (e) => {
      x = e.clientX; y = e.clientY;
      d.classList.add('pressing');
      timer = setTimeout(choose, 550);
    });
    d.addEventListener('pointermove', (e) => { if (timer && Math.hypot(e.clientX - x, e.clientY - y) > 10) cancel(); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) d.addEventListener(ev, cancel);
    d.addEventListener('contextmenu', (e) => { e.preventDefault(); choose(); });
  }
}

function syncRules() {
  if (!rulesKept || !M || !M._web_rules_serial) return;
  const s = M.UTF8ToString(M._web_rules_serial());
  if (s !== String(P.get('msgRules') || '')) P.set('msgRules', s);
}

async function showText(lines, title, history = false) {
  const caps = history
    ? [capButton('Earlier', { key: '<', onTap: pushKey(60) }), capButton('Later', { key: '>', onTap: pushKey(62) })]
    : [];
  caps.push(capButton('OK', { key: 'Enter', amber: true, onTap: pushKey(13) }));
  openModal(title, lines.map(lineHtml).join(''),
            history ? '< > page · long-press a message for a rule · Enter closes' : 'Space pages · Enter or Esc closes', caps);
  if (history) {
    $('modal-body').scrollTop = $('modal-body').scrollHeight;
    armRuleLines($('modal-body'));
  }
  for (;;) {
    const k = await nextKey();
    if (history && k === RH_KEY_RULE) break;
    if (pageKey(k) || (k === 32 && spacePages())) continue;
    if (k === 32 || isEnter(k) || k === 27) break;
  }
  closeModal();
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MENU_TILE = 32;   // two pixels per tile pixel, crisp beside the menu's text

// A tile from the sheet as a menu picture; an empty slot for an item without one.
function tileSpan(tile) {
  if (tile < 0) return '<span class="mtile none"></span>';
  const x = (tile % sheetCols) * MENU_TILE, y = Math.floor(tile / sheetCols) * MENU_TILE;
  return `<span class="mtile" style="background-position:-${x}px -${y}px"></span>`;
}

// A tile at any size, unfiltered, for character creation's keys and hero.
function tilePic(tile, px, cls) {
  const x = (tile % sheetCols) * px, y = Math.floor(tile / sheetCols) * px;
  return `<span class="${cls}" style="width:${px}px;height:${px}px;`
    + `background-size:${(sheet.width / 16) * px}px ${(sheet.height / 16) * px}px;`
    + `background-position:-${x}px -${y}px"></span>`;
}

// Character creation as keys (Lucas, 2026-09-27; the phone's RhCreate).
// While the core's player selection asks (role.c genl_player_setup(), winshim.c
// web_creation()), its pick-one menus are drawn as keycaps on the bezel under
// the glass, the way a keyboard sits under a screen: the choices with their
// pictures (winshim.c web_add_menu()), vanilla's other entries -- Random, "Pick
// race first" and its kin, the role filter, Quit -- a row of smaller keys
// under them.  A key presses its item's letter, so the menu answers exactly as
// it does to a keyboard.  The glass keeps the title and vanilla's lines: the
// character so far, "race forces neutral", and at "Is this ok?" the hero.
function creationKeys(w, items) {
  const confirm = /^Is this ok\?/.test(w && w.menu ? w.menu.prompt : '');
  const pictures = !!sheet && P.get('mapMode') !== 'text' && items.some((i) => i.selectable && i.tile >= 0);
  const split = !confirm && pictures;
  const hero = confirm && sheet ? M._web_creation_hero() : -1;
  const glass = (hero >= 0 ? `<div class="chero">${tilePic(hero, 96, 'cpic')}</div>` : '')
    + items.filter((i) => !i.selectable)
      .map((it) => `<div class="cline${confirm ? ' mid' : ''}">${esc(it.text.trim())}</div>`).join('');

  const keys = document.createElement('div');
  keys.id = 'ckeys';
  keys.className = 'ckeys';
  const main = document.createElement('div');
  main.className = confirm ? 'cgrid answers' : 'cgrid';
  const extra = document.createElement('div');
  extra.className = 'cgrid extra';
  for (const it of items) {
    if (!it.selectable) continue;
    const small = split && it.tile < 0;
    const pic = pictures && it.tile >= 0;
    const kind = it.selected ? 'default' : (it.ch === 113 && it.text === 'Quit') ? 'quit' : small ? 'extra' : 'choice';
    // vanilla writes a role as an("Archeologist"); under its picture the
    // article is clutter.  "Yes; start game" breaks at its semicolon.
    let label = pic ? it.text.replace(/^an? /, '') : it.text;
    label = label.replace('; ', ';\n');
    const b = document.createElement('button');
    b.type = 'button';
    b.tabIndex = -1;
    // the phone's keys shrink a legend to fit; here a long one is set smaller
    const long = label.replace('\n', '').length > 14;
    b.className = `cap ck${small ? ' small' : ''}${pic ? ' pic' : ''}${confirm ? ' answer' : ''}${long ? ' long' : ''}`;
    const f = creationCap(kind);
    ['--t1', '--t2', '--sl', '--sm', '--sr', '--lg', '--hold', '--raw'].forEach((v, n) => b.style.setProperty(v, f[n]));
    b.innerHTML = `<span>${it.ch ? `<i>${esc(String.fromCharCode(it.ch))}</i>` : ''}`
      + `${pic ? tilePic(it.tile, 48, 'cpic') : ''}<em>${esc(label)}</em></span>`;
    // the windows' keycap press (capButton): down on touch, the pick on release
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('pointerdown', () => { b.classList.add('pressed'); FB.press(); });
    const release = () => { if (b.classList.contains('pressed')) { b.classList.remove('pressed'); FB.up(); } };
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, release);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('click', () => push({ key: it.ch }));
    (small ? extra : main).appendChild(b);
  }
  keys.append(main);
  if (extra.childElementCount) keys.append(extra);

  $('modal-body').innerHTML = glass;
  const box = $('modal').querySelector('.box');
  box.classList.add('creating');
  box.insertBefore(keys, box.querySelector('.deck'));
}

async function selectMenu(win, how, listPtr) {
  const w = wins.get(win);
  const items = (w && w.menu) ? w.menu.items : [];
  // tty gives unlabelled selectable items letters in order, skipping used ones
  const used = new Set(items.filter((i) => i.ch).map((i) => i.ch));
  let li = 0;
  for (const it of items) {
    if (!it.selectable || it.ch) continue;
    while (li < LETTERS.length && used.has(LETTERS.charCodeAt(li))) li++;
    if (li < LETTERS.length) it.ch = LETTERS.charCodeAt(li++);
  }
  let count = '';

  // the bezel: OK alone for a menu that only shows; Esc to pick one; to pick
  // any, All and None as well, and OK
  const caps = how === 0 ? [capButton('OK', { key: 'Enter', amber: true, onTap: pushKey(13) })]
    : how === 1 ? [capButton('Esc', { key: 'Esc', onTap: pushKey(27) })]
    : [capButton('All', { key: '.', onTap: pushKey(46) }), capButton('None', { key: '-', onTap: pushKey(45) }),
       capButton('Esc', { key: 'Esc', onTap: pushKey(27) }),
       capButton('OK', { key: 'Enter', amber: true, onTap: pushKey(13) })];
  const hint = how === 0 ? 'Space pages · Enter or Esc closes'
    : how === 1 ? 'Tap an item or press its letter'
    : 'Tap or type a letter to mark it · a number first sets a count';
  openModal(w && w.menu ? w.menu.prompt : '', '', hint, caps);
  // character creation's menus are keys (creationKeys); they never change
  const creating = how === 1 && !!M._web_creation();
  if (creating) {
    creationKeys(w, items);
    setHint('Tap a key, or press its letter');
  }

  const draw = () => {
    if (creating) {
      if (count) setHint(`Count ${count}`, true);
      return;
    }
    // ForkFront's menu pictures: a column only when some item has one; an item
    // without keeps the slot so the text lines up; a heading takes none; and
    // none at all while the map is drawn in text
    const pictures = sheet && P.get('mapMode') !== 'text' && items.some((i) => i.selectable && i.tile >= 0);
    const body = items.map((it, n) => {
      if (!it.selectable) {
        return `<div class="${it.attr ? 'head' : ''}"${tint(it.clr)}>${attrText(it.text, it.attr) || ' '}</div>`;
      }
      const mark = how === 2 ? (it.selected ? (it.count > 0 ? '#' : '+') : '-') : '-';
      return `<div class="item${it.selected ? ' sel' : ''}" data-n="${n}">`
        // a flex row drops the spaces between its spans, so they go inside
        + `<span class="let">${esc(String.fromCharCode(it.ch))}</span><span class="mark"> ${mark} </span>`
        + `${pictures ? tileSpan(it.tile) : ''}<span${tint(it.clr)}>${attrText(it.text, it.attr)}</span></div>`;
    }).join('');
    const scroll = $('modal-body').scrollTop;
    $('modal-body').innerHTML = body;
    $('modal-body').scrollTop = scroll;
    for (const e of $('modal-body').querySelectorAll('.item')) {
      e.addEventListener('click', () => push({ key: items[+e.dataset.n].ch }));
    }
    if (count) setHint(`Count ${count}`, true);
    else setHint(hint);
  };

  const finish = (n) => {
    closeModal();
    const chosen = items.filter((i) => i.selectable && i.selected);
    if (n < 0 || !chosen.length) { M.setValue(listPtr, 0, '*'); return n < 0 ? -1 : 0; }
    const list = M._web_menu_alloc(chosen.length);
    chosen.forEach((it, i) => M._web_menu_set(list, i, it.lo, it.hi, it.count > 0 ? it.count : -1));
    M.setValue(listPtr, list, '*');
    return chosen.length;
  };

  for (;;) {
    draw();
    const k = await nextKey();
    if (k === 27) return finish(-1);
    if (pageKey(k) || (k === 32 && spacePages())) continue;
    if (isEnter(k) || k === 32) return finish(0);
    if (how === 0) continue;
    if (k >= 48 && k <= 57) { count += String.fromCharCode(k); continue; }
    const hit = items.filter((i) => i.selectable && i.ch === k);
    const group = hit.length ? hit : items.filter((i) => i.selectable && i.gch && i.gch === k);
    if (group.length) {
      for (const it of group) {
        if (how === 1) {
          for (const o of items) o.selected = false;
          it.selected = true;
        } else {
          it.selected = count ? true : !it.selected;
        }
        it.count = count ? parseInt(count, 10) : -1;
      }
      count = '';
      if (how === 1) return finish(0);
      continue;
    }
    if (how === 2 && (k === 46 || k === 44)) for (const it of items) if (it.selectable) it.selected = true;
    if (how === 2 && k === 45) for (const it of items) it.selected = false;
    count = '';
  }
}

// A line of text.  Keys already queued -- a macro's "#terrain\n" -- are typed
// into it first, so a sequence can answer the prompt it opens.
async function getLine(title, initial = '', datalist = null) {
  let value = initial;
  while (queue.length && queue[0].key !== undefined) {
    const k = queue.shift().key;
    if (isEnter(k)) return value;
    if (k === 27) return null;
    if (k === 8 || k === 0x7f) value = value.slice(0, -1);
    else if (k >= 32 && k < 127) value += String.fromCharCode(k);
  }
  const listAttr = datalist ? ' list="linechoices"' : '';
  const options = datalist ? `<datalist id="linechoices">${datalist.map((n) =>
    `<option value="${esc(n)}">`).join('')}</datalist>` : '';
  let answer;
  const result = new Promise((resolve) => { answer = resolve; });
  openModal(title, `<input class="line" id="line" autocomplete="off" spellcheck="false"${listAttr}>${options}`,
            datalist ? 'Type, or pick from the list' : '',
            // Keys brings up the soft keyboard, whose own key the window covers
            [capButton('Keys', { onTap: () => showKeyboard(!$('kbd').classList.contains('on')) }),
             capButton('Esc', { key: 'Esc', onTap: () => answer(null) }),
             capButton('OK', { key: 'Enter', amber: true, onTap: () => answer($('line').value) })]);
  const input = $('line');
  // touch only: the page's own keyboard, and none of the system's over it
  const touch = !!P.get('touchKeyboard');
  if (touch) { input.inputMode = 'none'; showKeyboard(true); }
  input.value = value;
  input.focus();
  if (value && value === initial) input.select();   // an offer: typing replaces it
  // The key that answers stops here.  Otherwise it reached the window's own
  // handler after the line had closed and let go of the focus, and went on to
  // the game: Enter at "Who are you?" answered "Shall I pick a character for
  // you?" with yes (2026-09-27), and after any other line it was a ^J.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); answer(input.value); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); answer(null); }
  });
  await result;
  input.blur();
  if (touch) showKeyboard(false);
  closeModal();
  return result;
}

/* ---------- forms: the overlay's dialogs ---------- */

function form(title, fields, buttons) {
  const box = $('form');
  box.querySelector('.title').textContent = title;
  const body = box.querySelector('.body');
  body.innerHTML = '';
  const values = {};
  const f = document.createElement('div');
  f.className = 'form';
  for (const fd of fields) {
    if (fd.note) { const n = document.createElement('div'); n.className = 'note'; n.textContent = fd.note; f.appendChild(n); continue; }
    if (fd.html) { const n = document.createElement('div'); n.className = 'note'; n.innerHTML = fd.html; f.appendChild(n); continue; }
    const lab = document.createElement('label');
    lab.textContent = fd.label;
    if (fd.seg) {
      // a row of keycaps; the chosen one lit amber, as a mode toggle is
      values[fd.seg] = fd.value;
      const seg = document.createElement('div');
      seg.className = 'seg';
      for (const [val, text] of fd.options) {
        const b = capButton(text, { amber: val === fd.value, onTap: () => {
          values[fd.seg] = val;
          for (const o of seg.children) o.classList.toggle('amber', o === b);
          if (fd.onPick) fd.onPick(val, values);
        } });
        seg.appendChild(b);
      }
      lab.appendChild(seg);
    } else if (fd.multiline) {
      const inp = document.createElement('textarea');
      inp.value = fd.value || '';
      inp.spellcheck = false;
      inp.rows = 4;
      inp.addEventListener('input', () => { values[fd.id] = inp.value; });
      // Enter makes a new line here; Esc still closes the form
      inp.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
      values[fd.id] = inp.value;
      lab.appendChild(inp);
    } else {
      const inp = document.createElement('input');
      inp.value = fd.value || '';
      inp.spellcheck = false;
      if (fd.numeric) inp.inputMode = 'numeric';
      inp.addEventListener('input', () => { values[fd.id] = inp.value; });
      inp.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        e.stopPropagation();
        done(primary);
      });
      values[fd.id] = inp.value;
      lab.appendChild(inp);
    }
    f.appendChild(lab);
  }
  const primary = buttons.find((b) => b.primary);
  // touch only: a dialog with something to type in brings the keyboard up
  const touch = !!P.get('touchKeyboard') && !!f.querySelector('input');
  const done = (b) => {
    box.parentElement.hidden = true;
    formOpen = null;
    if (touch) showKeyboard(false);
    if (b && b.run) b.run(values);
  };
  box.querySelector('.caps').replaceChildren(...buttons.map((b) =>
    capButton(b.label, { amber: !!b.primary, key: b.primary ? 'Enter' : '', onTap: () => done(b) })));
  box.querySelector('.hint').textContent = 'Esc closes';
  body.appendChild(f);
  box.parentElement.hidden = false;
  body.scrollTop = 0;
  formOpen = { cancel: () => done(null), accept: () => done(primary) };
  if (touch) {
    for (const inp of f.querySelectorAll('input')) inp.inputMode = 'none';
    showKeyboard(true);
  }
  const first = f.querySelector('input');
  if (first) first.focus();
}

/* ---------- the end of a game ---------- */

// NetHack ends by exiting, and a page cannot exit, so it said nothing and
// looked hung (Lucas, 2026-09-27: after a save, and after 'q' at "Do you
// want your possessions identified?", which skips the rest and ends).  A
// save closes the window, as the program closes; a death or a quit, or a
// window that may not close itself, says so and offers what comes next.
function gameEnded(saved) {
  const offer = (refused) => form(saved ? 'Game saved' : 'Game over', [
    { note: saved ? 'Your game is kept. Give the same name at "Who are you?" to go on with it.'
                  : 'This game has ended.' },
    ...(refused ? [{ note: 'This window cannot close itself; close it as you would any other.' }] : []),
    ...(build ? [{ html: `Rolehack build ${esc(build.short)} (${esc(build.date)}) · <a href="${esc(build.source)}" target="_blank" rel="noopener">source on GitHub</a>` }] : []),
  ], [
    { label: saved ? 'Go on playing' : 'New game', run: () => location.reload() },
    { label: 'Close', primary: true, run: () => close() },
  ]);
  const close = () => {
    window.close();
    // a browser tab the page did not open may refuse; the page is still here
    setTimeout(() => offer(true), 400);
  };
  if (saved) setTimeout(close, 600); else offer(false);
}

/* ---------- the soft keyboard (KEYS) ---------- */

const KBD_ROWS = [
  ['Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', '⌫'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['Ctrl', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
  ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Meta'],
  ['#', '?', '*', '$', '_', '<', '>', ':', '@', 'Space', '`', 'Hide'],
];
const SHIFTED = { 1: '!', 2: '@', 3: '#', 4: '$', 5: '%', 6: '^', 7: '&', 8: '*', 9: '(', 0: ')', '-': '_', '=': '+',
  '[': '{', ']': '}', '\\': '|', ';': ':', "'": '"', ',': '<', '.': '>', '/': '?', '`': '~' };

function buildKeyboard() {
  const kb = $('kbd'), mods = { Ctrl: false, Shift: false, Meta: false };
  const modKeys = {};
  for (const row of KBD_ROWS) {
    const r = document.createElement('div');
    r.className = 'row';
    for (const label of row) {
      const b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.className = 'cap';
      b.innerHTML = `<span>${esc(label)}</span>`;
      if (label in mods) modKeys[label] = b;
      if (label === 'Space') b.style.flexGrow = '3';
      else if (label === 'Enter' || label === 'Shift') b.style.flexGrow = '1.5';
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('pressed'); FB.press(); });
      const release = () => { if (b.classList.contains('pressed')) { b.classList.remove('pressed'); FB.up(); } };
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, release);
      b.addEventListener('click', () => {
        // a modifier held down lights amber, as the overlay's mode keys do
        if (label in mods) { mods[label] = !mods[label]; b.classList.toggle('amber', mods[label]); return; }
        if (label === 'Hide') { showKeyboard(false); return; }
        let code;
        if (label === 'Esc') code = 27;
        else if (label === '⌫') code = 8;
        else if (label === 'Enter') code = 13;
        else if (label === 'Space') code = 32;
        else {
          let ch = label;
          if (mods.Shift) ch = SHIFTED[ch] || ch.toUpperCase();
          code = ch.charCodeAt(0);
          if (mods.Ctrl && /^[a-z]$/i.test(ch)) code = ch.toUpperCase().charCodeAt(0) & 0x1f;
          else if (mods.Meta) code |= 0x80;
        }
        for (const m of Object.keys(mods)) { mods[m] = false; modKeys[m].classList.remove('amber'); }
        if (!typeInto(code)) push({ key: code });
      });
      r.appendChild(b);
    }
    kb.appendChild(r);
  }
}

// While a line is being typed -- "Who are you?", a name, a # command, a
// dialog's field -- the soft keyboard types into it, as a real one does.
function typeInto(code) {
  // the focused field, or the open window's line if a tap took the focus off it
  let input = document.activeElement;
  if (!input || input.tagName !== 'INPUT') {
    input = formOpen ? $('form').querySelector('input') : !$('modal').hidden ? $('line') : null;
    if (!input) {
      // a dialog with nothing to type in: Esc and Enter answer it, as the real
      // keys do, and nothing reaches the game underneath
      if (formOpen) {
        if (code === 27) formOpen.cancel();
        else if (code === 13) formOpen.accept();
        return true;
      }
      return false;
    }
    input.focus();
  }
  if (code === 13 || code === 27) {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: code === 13 ? 'Enter' : 'Escape', bubbles: true }));
    return true;
  }
  let start = input.selectionStart, end = input.selectionEnd;
  if (code === 8) {
    if (start === end && start > 0) start--;
    input.setRangeText('', start, end, 'end');
  } else if (code >= 32 && code < 127) {
    input.setRangeText(String.fromCharCode(code), start, end, 'end');
  } else {
    return true;   // a Ctrl or Meta key has no place in a line
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

// The keyboard sits above the windows, and a window makes room for it.
function showKeyboard(on) {
  const kb = $('kbd');
  kb.classList.toggle('on', on);
  document.documentElement.style.setProperty('--kbd-room', on ? `${kb.offsetHeight + 12}px` : '0px');
}
window.addEventListener('resize', () => { if ($('kbd').classList.contains('on')) showKeyboard(true); });

/* ---------- the window procedures ---------- */

const handlers = {
  shim_init_nhwindows() {},
  shim_player_selection_or_tty() { return true; },   // core asks with menus
  async shim_askname() {
    // the name is all it takes to go on with a game, so the latest one left
    // open or saved is offered, and the others listed
    const games = gamesKept();
    let name = null;
    while (!name) name = await getLine('Who are you?', games[0] || '', games.length ? games : null);
    G.svp.plname = name.slice(0, 31);
  },
  shim_get_nh_event() {},
  async shim_exit_nhwindows(str) {
    if (str) addMessage(str);
    render();
    await syncSaves();
    // save.c says goodbye this way; a death or a quit says nothing here
    gameEnded(str === 'Be seeing you...');
  },
  shim_suspend_nhwindows() {},
  shim_resume_nhwindows() {},
  shim_create_nhwindow(type) {
    const id = nextWin++;
    wins.set(id, { type, lines: [], menu: null });
    return id;
  },
  shim_clear_nhwindow(win) {
    const w = wins.get(win);
    if (!w) return;
    if (w.type === K.WIN_TYPE.NHW_MAP) grid = blankGrid();
    else if (w.type === K.WIN_TYPE.NHW_MESSAGE) { pageFresh = false; unread = false; newPage = true; }
    else w.lines = [];
  },
  async shim_display_nhwindow(win, blocking) {
    const w = wins.get(win);
    if (!w) return;
    if (w.type === K.WIN_TYPE.NHW_MESSAGE) {
      // the game's own --More-- (a MSGTYPE=stop rule's, "You die...", ...)
      if (blocking && unread && !msgStop) {
        await more();
        pageFresh = false;
        newPage = true;
      }
    } else if ((w.type === K.WIN_TYPE.NHW_TEXT || w.type === K.WIN_TYPE.NHW_MENU) && w.lines.length) {
      await showText(w.lines);
      w.lines = [];
    } else {
      render();
    }
  },
  shim_destroy_nhwindow(win) { wins.delete(win); },
  shim_curs(win, x, y) {
    const w = wins.get(win);
    if (w && w.type === K.WIN_TYPE.NHW_MAP) cursor = { x, y };
  },
  async shim_putstr(win, attr, str) {
    const w = wins.get(win);
    if (!w) return;
    if (w.type === K.WIN_TYPE.NHW_MESSAGE) await putMessage(str, attr);
    else w.lines.push({ attr, text: str });
  },
  shim_start_menu(win) {
    const w = wins.get(win);
    if (w) w.menu = { items: [], prompt: '' };
  },
  shim_add_menu(win, glyphinfo, identifier, ch, gch, attr, clr, str, itemflags) {
    const w = wins.get(win);
    if (!w || !w.menu) return;
    const lo = M._web_any_word(identifier, 0), hi = M._web_any_word(identifier, 1);
    // the item's picture, as the Android port finds it (and_add_menu): the
    // glyph's tile, or none for the core's nul_glyphinfo, whose glyph is NO_GLYPH
    const glyph = glyphinfo ? M._web_glyphinfo(glyphinfo, 0) : K.GLYPH.NO_GLYPH;
    const tile = glyph === K.GLYPH.NO_GLYPH ? -1 : M._web_glyphinfo(glyphinfo, 4);
    w.menu.items.push({
      lo, hi, selectable: !!(lo || hi), ch: ch & 0xff, gch: gch & 0xff, attr, clr, text: str, tile,
      selected: !!(itemflags & MENU_ITEMFLAGS_SELECTED), count: -1,
    });
  },
  shim_end_menu(win, prompt) {
    const w = wins.get(win);
    if (w && w.menu) w.menu.prompt = prompt || '';
  },
  shim_select_menu(win, how, listPtr) { return selectMenu(win, how, listPtr); },
  shim_message_menu(let_, how, mesg) { addMessage(mesg); return 0; },
  shim_mark_synch() { render(); },
  shim_wait_synch() { render(); },
  // the core names the point to keep in view; a new one ends any pan
  shim_cliparound(x, y) { focus = { x, y }; },
  shim_update_positionbar() {},
  shim_print_glyph(win, x, y, gi) {
    if (y < 0 || y >= ROWNO || x < 0 || x >= COLNO) return;
    grid[y][x] = { ch: M._web_glyphinfo(gi, 1), color: M._web_glyphinfo(gi, 2) & 15,
                   custom: M._web_glyphinfo(gi, 6), u: M._web_glyphinfo(gi, 7),
                   flags: M._web_glyphinfo(gi, 3), tile: M._web_glyphinfo(gi, 4) };
  },
  shim_raw_print(str) { if (str) addMessage(str); },
  shim_raw_print_bold(str) { if (str) addMessage(str); },
  async shim_nhgetch() {
    if (overlay && M._web_picking) overlay.setPicking(!!M._web_picking());
    const k = await nextKey();
    endTurn();
    return k;
  },
  async shim_nh_poskey(xp, yp, modp) {
    syncRules();
    const picking = !!(M._web_picking && M._web_picking());
    if (overlay && M._web_picking) overlay.setPicking(picking);
    // a map tap now would travel (getpos takes it as the spot instead)
    commandWait = !picking;
    const ev = await nextInput();
    commandWait = false;
    endTurn();
    if (ev.click) {
      M.setValue(xp, ev.click.x, 'i16');
      M.setValue(yp, ev.click.y, 'i16');
      M.setValue(modp, ev.click.mod, 'i32');
      return 0;
    }
    if (ev.ext && M._web_set_ext_name) M.ccall('web_set_ext_name', null, ['string'], [ev.ext]);
    return ev.key;
  },
  shim_nhbell() {
    $('glass').animate([{ filter: 'brightness(1.8)' }, { filter: 'none' }], 150);
  },
  // ^P: the history, newest last, the band's own page in bold at its end
  async shim_doprev_message() {
    const fromBold = history.length - Math.min(page.length, history.length);
    ruleFrom = null;
    await showText(history.map((text, i) => ({ attr: i >= fromBold ? ATR.BOLD : 0, text })), 'Messages', true);
    if (ruleFrom) M.ccall('web_set_rule_text', null, ['string'], [ruleFrom]);
    ruleFrom = null;
    return 0;
  },
  async shim_yn_function(query, resp, def) {
    const shown = resp.split('\x1b')[0];
    const allowed = resp.replace('\x1b', '');
    let q = query;
    if (shown) q += ` [${shown}]`;
    if (def) q += ` (${String.fromCharCode(def)})`;
    // the question joins the band, after a --More-- if the page is full, as
    // tty's prompt does; a question is never skipped by an Esc
    msgStop = false;
    if (newPage) startPage();
    const m = bandMetrics();
    if (pausing() && m.width >= 40) {
      const used = pageRowsOf(page, m).length;
      if (used > 0 && used + wrapRows(q, used, m).length > scrollRow + m.rows) { await more(); startPage(); }
    }
    const asked = { text: q, ask: true };
    page.push(asked);
    pageFresh = true;
    renderBands();
    const direction = /what direction/.test(query);
    if (direction && overlay) overlay.setExpectsDirection(true);
    showChips(promptChoices(query, allowed));
    // the answers on the pad, under the thumb (overlay.js showAnswers): resp's
    // letters, or a short "[ynaq]" written into the question itself, as role.c
    // asks "Shall I pick ...?" -- never an item prompt's "[fg or ?*]"
    const letters = shown || ((/\[([a-zA-Z]{1,8})\]\s*$/.exec(query) || [])[1] || '');
    const onPad = !direction && !!letters && !!overlay
      && overlay.showAnswers([...letters], def, (key) => push({ key }));
    let k;
    for (;;) {
      k = await nextKey();
      if (!allowed) break;
      if (k === 27) {
        k = allowed.includes('q') ? 113 : allowed.includes('n') ? 110 : def;
        break;
      }
      if ((isEnter(k) || k === 32) && def) { k = def; break; }
      const ch = String.fromCharCode(k);
      if (allowed.includes(ch)) break;
      if (allowed.includes(ch.toLowerCase())) { k = ch.toLowerCase().charCodeAt(0); break; }
    }
    const at = page.indexOf(asked);
    if (at >= 0) page.splice(at, 1);
    showChips([]);
    if (onPad) overlay.hideAnswers();
    if (direction && overlay) overlay.setExpectsDirection(false);
    endTurn();
    // the answered question stays in view, as tty leaves it on its line, and
    // the next message takes its place without a --More--
    if (k >= 32 && k < 127) { addMessage(`${q} ${String.fromCharCode(k)}`); newPage = true; }
    return k > 127 ? 27 : k;
  },
  async shim_getlin(query, bufp) {
    const s = await getLine(query);
    M.stringToUTF8(s === null ? '\x1b' : s, bufp, 256);
  },
  async shim_get_ext_cmd() {
    const names = [];
    for (let i = 0; ; i++) {
      const p = M._web_extcmd_name(i);
      if (!p) break;
      names.push(M.UTF8ToString(p));
    }
    const s = await getLine('#', '', names);
    if (!s) return -1;
    const i = M.ccall('web_extcmd_find', 'number', ['string'], [s.trim()]);
    if (i < 0) addMessage(`Unknown extended command '${s}'.`);
    return i;
  },
  shim_number_pad() {},
  async shim_delay_output() { render(); await sleep(40); },
  shim_change_color() {},
  shim_get_color_string() { return ''; },
  shim_preference_update() {},
  shim_getmsghistory() { return ''; },   // '' comes back to C as NULL
  shim_putmsghistory(msg) { if (msg) history.push(msg); },
  shim_status_update(fldidx, ptr, chg, percent, color, colormasks) {
    const name = K.STATUS_FIELD[fldidx];
    if (name === 'BL_FLUSH' || name === 'BL_RESET') { render(); return; }
    if (name === 'BL_CONDITION') { condMask = ptr ? M.getValue(ptr, 'i32') : 0; return; }
    if (!name) return;
    let text = ptr ? M.UTF8ToString(ptr) : '';
    if (name === 'BL_GOLD') text = plainGold(text);
    status[name] = { text: text.trim(), color };
    // the turn counter, for the ghost deck's sessions (overlay.js setTurn)
    if (name === 'BL_TIME' && overlay) overlay.setTurn(parseInt(text, 10));
  },
};

globalThis.nethackCallback = async (name, ...args) => {
  K = K || globalThis.nethackGlobal.constants;   // set up by main()
  G = G || globalThis.nethackGlobal.globals;
  const h = handlers[name];
  if (!h) { console.debug('unhandled', name, args); return 0; }
  try {
    const r = await h(...args);
    return r === undefined ? 0 : r;
  } catch (e) {
    console.error(name, e);
    return 0;
  }
};

/* ---------- saves, and the installed app ---------- */

// Closing the page is how a player stops.  NetHack's playground (levels,
// saves, bones, scores: VAR_PLAYGROUND=/save) is kept in IndexedDB, and
// whenever the game waits for the player it checkpoints itself (winshim.c)
// and the changes are copied here, so the copy is never behind what the
// player has seen; the next start rebuilds the game from it (libnhmain.c).
// When the game ends the checkpoint goes, so a death can't be undone by
// closing the page.
globalThis.rolehackWaiting = () => { syncSaves(); };
// for looking at the playground from the browser's console
globalThis.rolehackFiles = () => M && M.FS;

// A copy takes a few milliseconds; closing the page in the middle of one
// asks first, which gives it time to finish.
window.addEventListener('beforeunload', (e) => {
  if (!syncing) return;
  e.preventDefault();
  e.returnValue = '';
});

// the files, cached for starting with no server (sw.js); and the saves kept
// out of the browser's reach when it clears space
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('service worker', e));
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// One copy at a time; a checkpoint taken during a copy is copied right after.
let syncing = null, syncAgain = false;
function syncSaves() {
  if (syncing) { syncAgain = true; return syncing; }
  syncing = new Promise((resolve) => {
    try { M.FS.syncfs(false, (err) => { if (err) console.warn('save sync', err); resolve(); }); }
    catch (e) { console.warn('save sync', e); resolve(); }
  }).then(() => {
    syncing = null;
    if (syncAgain) { syncAgain = false; return syncSaves(); }
  });
  return syncing;
}

// The playground as NetHack expects to find it.  Before 2026-09-26 only the
// saves were kept, at the top; they move to save/, where NetHack looks.
function preparePlayground(FS) {
  const has = (p) => { try { FS.stat(p); return true; } catch (e) { return false; } };
  if (!has('/save/save')) FS.mkdir('/save/save');
  for (const f of FS.readdir('/save')) {
    if (/^\d[^.]*$/.test(f) && FS.isFile(FS.stat(`/save/${f}`).mode) && !has(`/save/save/${f}`)) {
      FS.rename(`/save/${f}`, `/save/save/${f}`);
    }
  }
  for (const f of ['perm', 'record', 'logfile', 'xlogfile', 'livelog']) {
    if (!has(`/save/${f}`)) FS.writeFile(`/save/${f}`, '');
  }
}

// Names with a game to go on with, latest first: a checkpoint (<uid><name>.0,
// a game whose page was closed) or a save file (save/<uid><name>).  The uid
// is always 0 here.
function gamesKept() {
  const found = [];
  const scan = (dir, re) => {
    try {
      for (const f of M.FS.readdir(dir)) {
        const m = re.exec(f);
        if (m) found.push({ name: m[1], t: M.FS.stat(`${dir}/${f}`).mtime.getTime() });
      }
    } catch (e) { /* no such directory yet */ }
  };
  scan('/save', /^0(.+)\.0$/);
  scan('/save/save', /^0([^.]+)$/);
  found.sort((a, b) => b.t - a.t);
  return [...new Set(found.map((g) => g.name))];
}

/* ---------- start ---------- */

try {
  await loadTiles();
  // the band measures its rows with the font it draws them in (wrapRows), so
  // the face must be in before the first message
  try { await document.fonts.load(`16px "Atkinson Hyperlegible Next"`); } catch (e) { /* the fallback measures itself */ }
} catch (e) {
  console.warn('tiles', e);   // the text map still works
}
buildKeyboard();
P.onChange((name) => { if (['mapMode', 'zoom', 'zoomFactor', 'colourVision'].includes(name)) render(); });
overlay = new Overlay({
  send,
  rawKey: (k) => push({ key: k }),
  glassChanged: (g) => layoutGlass(g),
  form,
  toggleKeyboard: () => showKeyboard(!$('kbd').classList.contains('on')),
});
// build.json, written by build.sh: the commit this page was built from and a
// link to its source on GitHub.  Shown at the foot of the boot screen and at
// the end of a game, so whoever plays it can find the source.
let build = null;
async function loadBuild() {
  try { build = await (await fetch('build.json')).json(); } catch (e) { return; }
  const a = $('build');
  a.textContent = `Rolehack · build ${build.short} (${build.date}) · source on GitHub`;
  a.href = build.source;
}

async function start() {
  loadBuild();
  // the phone's options (defaults.nh), read by the game as ~/.nethackrc
  let rc = '';
  try { rc = await (await fetch('defaults.nh')).text(); } catch (e) { console.warn('defaults.nh', e); }
  // the player's message rules, kept in this browser, go in as MSGTYPE lines
  if (rc) {
    const rules = String(P.get('msgRules') || '').split('\n').map((l) => l.split('\t'))
      .filter(([t, p]) => t && p).map(([t, p]) => `MSGTYPE=${t} "${p}"`);
    if (rules.length) rc += `\n# Message rules made in the game (Rolehack; GAME -> Message rules)\n${rules.join('\n')}\n`;
    // Twin banks put Take off and Remove right over the action pad, so they
    // always ask which item, even with one candidate (the design's section
    // 16; src/options.c optfn_paranoid_confirmation): the + keeps the
    // defaults, Pray's confirmation among them.  Only for twin banks, so
    // classic plays as it always has.  The options file is written once a
    // start, and a game restored from its save keeps the confirmations it
    // was saved with (restore.c restores flags), so the line reaches the
    // games started with it: a change of layout, the next new game.  Before
    // the player's own lines, which come last so that they win: their own
    // paranoid_confirmation (none, say) stands over this one.
    if (P.get('layout') !== 'classic') rc += '\n# Twin banks: T and R always ask (Rolehack; Settings -> Layout)\nOPTIONS=paranoid_confirmation:+Remove\n';
    // the player's own lines from Settings (colour vision, layer 3: glyph:)
    const own = String(P.get('userRc') || '').trim();
    if (own) rc += `\n# Your own options (Settings -> Your option lines)\n${own}\n`;
    rulesKept = true;
  }
  createNetHack({
    preRun: [(mod) => {
      if (rc) {
        mod.ENV.HOME = '/home/web_user';
        try { mod.FS.mkdirTree('/home/web_user'); } catch (e) { /* there already */ }
        mod.FS.writeFile('/home/web_user/.nethackrc', rc);
      }
      // a generic user name (sysconf GENERICUSERS), so the game asks "Who are
      // you?" instead of calling everyone web_user
      mod.ENV.USER = 'player';
      // libnh's sysconf turns perm_invent on, which needs a side panel this
      // page doesn't have yet; without one every inventory change pops up
      mod.ENV.NETHACKOPTIONS = '!perm_invent,time';
      mod.FS.mkdir('/save');
      mod.FS.mount(mod.IDBFS, {}, '/save');
      mod.addRunDependency('syncfs');
      mod.FS.syncfs(true, (err) => {
        if (err) console.warn('save restore', err);
        preparePlayground(mod.FS);
        mod.removeRunDependency('syncfs');
      });
    }],
    print: (s) => console.log(s),
    printErr: (s) => console.warn(s),
    // main() starts right after this, before the factory's promise settles
    onRuntimeInitialized() {
      M = this;
      $('boot').remove();
      M.ccall('shim_graphics_set_callback', null, ['string'], ['nethackCallback']);
    },
  }).catch((e) => { $('boot').textContent = `The game failed to load: ${e}`; });
}

// One page plays at a time.  Two would each keep their own copy of a game in
// the same storage, and the one closed last would win -- a way back to an
// earlier state.  A second page waits and starts when the first one closes.
if (navigator.locks) {
  const waiting = setTimeout(() => {
    $('boot-text').textContent = 'Rolehack is open in another window. It starts here when that one closes.';
  }, 800);
  navigator.locks.request('rolehack-game', () => {
    clearTimeout(waiting);
    $('boot-text').textContent = 'Loading Rolehack…';
    start();
    return new Promise(() => {});   // held until the page goes
  });
} else {
  start();
}
