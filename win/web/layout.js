// Written for Rolehack by Lucas Ruiz, 2026-10-02.
//
// The touch interface's layout rule, "guarded twin banks": one function,
// layout(W, H, pointer, settings), that places every key, the glass, the
// map, the message and status bands and the panels for any window.  Nothing
// is placed per screen by hand.  Each thumb owns one 3x6 bank of keycaps
// hung from its own bottom corner, and every size and offset in a bank comes
// from the device's short side S and long side L (in a browser tab, the
// remembered budget of the portrait width and the landscape height), from the
// pointer in use and from the player's settings -- never from the
// orientation -- so a phone's two orientations get the same banks by
// construction.  The movement pad keeps the player's key size and is never
// scaled; the map takes the rectangle the banks leave.
//
// A plain module with no imports, no DOM and no file reads, so the page
// imports it as it is, with no build step, and node runs the very same file:
// test/layout.test.mjs holds it to the design's golden specs (test/fixtures/),
// and the design's own checks score it.  It is the rule behind the setting
// "Layout: twin banks / classic", twin by default (Lucas, 2026-10-02); classic
// is the page as it was and does not use it.  layout() never throws: a window
// too small for the rule gets the nearest fit, marked degraded, with the
// reason, and a window with no room for twin banks and a map comes back
// unusable, so the page shows classic there (section 9 below).
//
// Units are dp (CSS px on the web).  Origin top left.  The numbered blocks are
// this file's own; "section N" in a comment is the design's (DESIGN.md, v2 of
// 2 October 2026; test/README.md says where it and the fixtures come from).

// ---------------------------------------------------------------------------------------
// 1. The banks.  One table per thumb, bottom row first.  Columns run from the bank's OUTER
//    edge (the screen edge its thumb holds) inward: c0 outer, c1, c2 inner.  Rows 0-2 are
//    the pads (the movement pad on the left, the action pad on the right), rows 3-4 the
//    upper rows, row 5 the strip.  hand: 'left' swaps the corners; combatThumb: 'L' swaps
//    in the second table.
// ---------------------------------------------------------------------------------------
export const BANK = {
  L: [
    ['pad_b', 'pad_j', 'pad_n'],            // r0  ↙ ↓ ↘
    ['pad_h', 'pad_centre', 'pad_l'],       // r1  ← · →
    ['pad_y', 'pad_k', 'pad_u'],            // r2  ↖ ↑ ↗
    ['msgs', 'drop', 'pin1'],               // r3  only keys whose mis-tap opens a prompt or a view; DROP keeps today's centre
    ['game', 'm1', 'menu'],                 // r4
    ['rest', 'world', 'sacrifice'],         // r5  REST out of easy reach (the owner's rule for many-turn
  ],                                        //     commands); SACRIFICE/PRAY in the farthest cell
  R: [
    ['apply', 'search', 'inventory'],       // r0  (c0 = the right edge): today's portrait action pad...
    ['eat', 'context', 'combat'],           // r1
    ['look', 'flick', 'pin2'],              // r2  ...key for key
    // The equipment stays in today's portrait order (Lucas, 2026-10-02: keep the rows where
    // they are).  Take off and Remove sit over the action pad, so the web's defaults.nh sets
    // paranoid_confirmation:+Remove and both always ask; Swap still acts at once.
    ['eq_swap', 'eq_remove', 'eq_takeoff'], // r3
    ['eq_wield', 'eq_puton', 'eq_wear'],    // r4
    ['m3', 'keys', 'm2'],                   // r5  strip: today's portrait key-row end; an old INVENTORY-bar tap lands on KEYS, not a macro
  ],
};
// combatThumb: 'L' (the audit's open question 3): COMBAT, FLICK and PIN 2 go to the walking
// thumb, above the prompt row, never directly over the pad.  Still one table per thumb, so
// parity holds.
export const BANK_COMBAT_LEFT = {
  L: [
    ['pad_b', 'pad_j', 'pad_n'],
    ['pad_h', 'pad_centre', 'pad_l'],
    ['pad_y', 'pad_k', 'pad_u'],
    ['msgs', 'drop', 'pin1'],
    ['combat', 'flick', 'pin2'],
    ['rest', 'm1', 'sacrifice'],
  ],
  R: [
    ['apply', 'search', 'inventory'],
    ['eat', 'context', 'look'],
    ['eq_swap', 'eq_remove', 'eq_takeoff'],
    ['eq_wield', 'eq_puton', 'eq_wear'],
    ['game', 'world', 'menu'],
    ['m3', 'keys', 'm2'],
  ],
};

export const LABEL = {
  pad_y: '↖ y', pad_k: '↑ k', pad_u: '↗ u', pad_h: '← h', pad_l: '→ l', pad_b: '↙ b', pad_j: '↓ j', pad_n: '↘ n',
  pad_centre: 'centre: REST 1 / PICK UP (hold and slide: the HERE layer)',
  // an empty pin's tap opens its picker (Lucas, 2026-10-02: the design's choice stands)
  drop: 'DROP (hub)', msgs: 'MSGS ^P', pin1: 'PIN 1 (empty by default: a tap opens the picker)',
  // Long rest is swiped UP out of REST (Lucas, 2026-10-02: the design's choice stands)
  rest: 'REST ×n (hold: count layer on the pad; swipe up: LONG REST)', m1: 'M1 macro', world: 'WORLD drawer',
  // Pray stays on Lucas's 380 ms hold (RhOverlay's PRAY_HOLD_MS); the distance and the
  // game's own y/n guard it, not a longer hold
  game: 'GAME drawer', menu: 'MENU (settings)', sacrifice: 'SACRIFICE (tap: offer; hold 380 ms: PRAY)',
  apply: 'APPLY (hub)', search: 'SEARCH s×n (hold: count layer; SEARCH lamp on the cap)', inventory: 'INVENTORY (hub)',
  eat: 'EAT/QUAFF/READ (hub)', context: 'CONTEXT (tap: this turn\'s action; several: the HERE layer, sticky; hold: counts)',
  combat: 'COMBAT (hub; ARMED lamp on the cap)', look: 'LOOK : (hold: farlook)',
  flick: 'FLICK (tap: macro; flick ↑ Kick, ↗ second macro)', pin2: 'PIN 2 (Fire by default)',
  eq_swap: 'Swap x', eq_remove: 'Remove R (asks: paranoid_confirmation:+Remove)', eq_takeoff: 'Take off T (asks: paranoid_confirmation:+Remove)',
  eq_wield: 'Wield w', eq_puton: 'Put on P', eq_wear: 'Wear W',
  m3: 'M3 macro', m2: 'M2 macro', keys: 'KEYS (soft keyboard)',
};
// keyboard legends shown on every key in mouse mode (section 12): what each key sends.
// REST sends . with its count (20. rests; 20s would search), SACRIFICE M-o (its hold, Pray,
// is M-p), the pad centre s (or , for an object).  KEYS, the soft keyboard, has no legend: a
// desk player has a real keyboard, and k after the prefix is flick ↑ (Lucas, 2026-10-07).
export const LEGEND = {
  pad_y: 'y', pad_k: 'k', pad_u: 'u', pad_h: 'h', pad_centre: 's', pad_l: 'l', pad_b: 'b', pad_j: 'j', pad_n: 'n',
  drop: 'd', msgs: '^P', pin1: '^;4', rest: '20.', m1: '^;1', world: '^;o', game: '^;g', menu: '^;m', sacrifice: 'M-o',
  apply: 'a', search: 's', inventory: 'i', eat: 'e', context: '^;c', combat: 'F', look: ':', flick: '^;f', pin2: '^;5',
  eq_swap: 'x', eq_remove: 'R', eq_takeoff: 'T', eq_wield: 'w', eq_puton: 'P', eq_wear: 'W', m3: '^;3', m2: '^;2',
};
// '^;' is the desk prefix, Ctrl and the key right of L (section 12), written with NetHack's ^
// for Ctrl as MSGS's ^P is (Lucas, 2026-10-07): Ctrl+Space and the chords tried after it are
// input-source switches on macOS and ChromeOS.  WORLD is ^;o, not ^;w: a browser tab cannot
// stop Ctrl+W.
const KIND = {
  drop: 'hub', apply: 'hub', inventory: 'hub', eat: 'hub', combat: 'hub', flick: 'flick',
  look: 'strip', context: 'strip', search: 'strip', msgs: 'chrome-key', menu: 'chrome-key', world: 'chrome-key',
  game: 'chrome-key', keys: 'chrome-key',
};

// ---------------------------------------------------------------------------------------
// 2. Text.  The message band's rows are sized by the face's x-height times the player's
//    Message size and the system's text size, at 1.35 leading -- overlay.js msgTextPx()'s
//    own reckoning, so the layout and the page agree on how tall a row is.  The x-height
//    is an input: the web's is 9.5 CSS px (Lucas, 2026-09-28: 0.25 degrees at a phone's
//    36 cm), Android's 10 dp, and each build passes its own.  The row height is an input to
//    the rule: larger text re-lays out, identically in both orientations, and never puts a
//    band over a key.
// ---------------------------------------------------------------------------------------
export const X_HEIGHT = { atkinson: 0.496, screen: 0.400 };   // Atkinson Hyperlegible Next, VT323 (OS/2 tables)
export const MSG_X = 9.5, MSG_X_ANDROID = 10, MSG_LEADING = 1.35;
// The status lines are set at the same text metric as the message rows (Lucas,
// 2026-10-08; until then a 48 dp band of 14 px text): three lines, each one
// message row tall (two in compact), plus the band's own padding, 3 dp above
// and 4 below at the system's text size.
export const STATUS_ROWS = 3, STATUS_PAD = 7;
export function textMetrics({ msgFont = 'atkinson', msgSize = 1, textScale = 1, xHeight = MSG_X } = {}) {
  // the system's text size is clamped as overlay.js osTextScale() clamps it
  const s = clamp(Number(textScale) || 1, 0.8, 2);
  const xh = X_HEIGHT[msgFont] ?? X_HEIGHT.atkinson;
  const x = Number(xHeight) > 0 ? Number(xHeight) : MSG_X;
  const msgRowH = (x / xh) * (Number(msgSize) || 1) * s * MSG_LEADING;
  return { msgRowH, statusH: STATUS_ROWS * msgRowH + STATUS_PAD * s };
}
const ROW_H = textMetrics().msgRowH;          // 25.86 dp at the web's defaults (27.22 at Android's 10 dp)
export const STATUS_H = textMetrics().statusH; // 84.59 dp at the web's defaults: three status lines at the text metric

export const DEFAULTS = {
  padKey: 58,          // the player's movement key size: 46, 52 or 58 dp.  Never scaled to fit.
  deskKey: 40,         // key size while a mouse is the input in use
  cellAspect: 1,       // map cell width / height: 1 for the web's tiles, 0.5625 for Android's text cells
  // The default map cell on phones (section 11).  'columns': the cell that shows at least
  // cellColumns of the level's 80 columns in landscape -- today's web shows 34 on Lucas's
  // phone -- with all 21 rows where they fit, never under fitFloor.  'rows': the earlier
  // rule, the cell whose 21 rows fill the landscape map (bigger glyphs, fewer columns).
  mapCell: 'columns',
  cellColumns: 34,
  fitFloor: 12,        // the smallest default cell; off phones, the whole level is shown when it fits at this or more
  cellMax: 20,         // phones: the default cell never grows past this
  tabletCellMax: 24,   // tablets: the whole-level cell is capped here...
  tabletWideCellMax: 48, // ...or here where 24 dp would leave strips wider than a panel beside the level: a monitor's window (section 8 below)
  deskCellMax: 32,     // desk: whole device pixels up to this (the cell's width, so text cells may stand taller)
  deskWideCellMax: 48, // desk, when 32 px strips beside the map would each be wider than a panel (21:9 and wider)
  dpr: 1,              // device pixels per dp (the page's devicePixelRatio): the desk's cell is whole device pixels
  prevDesk: null,      // the desk's arrangement last drawn (info.desk), for its band (section 10 below)
  msgRows: { landscape: 2, portrait: 3 },   // Lucas's settings (2026-09-28)
  shortScreenRows: 2,  // screens under 800 dp tall get at most this many message rows
  msgRowH: ROW_H,      // one message row, dp (textMetrics())
  statusH: STATUS_H,   // three status lines at the text metric (textMetrics)
  statusW: 412,        // side by side, the status takes today's band width
  gripLift: 0,         // raise both banks along their side edges (same in both orientations; clamped to fit)
  hand: 'right',       // 'left' mirrors the layout: the movement pad takes the right corner
  combatThumb: 'R',    // 'L' puts COMBAT, FLICK and PIN 2 on the walking thumb (BANK_COMBAT_LEFT)
  insets: { l: 0, r: 0, t: 0, b: 0 },       // safe-area insets for this orientation
  sideInsets: null,    // the landscape side insets {l, r}, remembered for the portrait layout
  anchor: 'auto',      // 'physical' corner, 'safe' corner, or 'auto' (section 13)
  avoidCutout: 0,      // Android: a side cutout's depth from the edge; only what the margin does not already clear counts
  budget: null,        // web in a tab: { w: portrait width, h: landscape height, l: landscape width } seen
  prevTier: null,      // the window's last tier, for hysteresis (section 3 below)
  prevCellTier: null,  // the tier the last device cell was decided at, for hysteresis (sections 3 and 8 below)
  prevGlass: null,     // the glass last drawn, { kind, over }, for its band (section 7 below)
  prevCellGlass: null, // the glass the last device cell was decided in, { kind, over, whole } (sections 7 and 8 below)
  halo: 12,            // guard band round each bank (section 6); also the least gap from a band to a key
  ring: 20,            // confirm ring inside the map next to a halo
  // 'auto': the header as section 10 places it -- side by side once the glass is 818 dp
  // wide, over the banks when that shows more of the level.  The web page lays its bands
  // out where 'auto' puts them (web.js layoutTwinGlass).  'stacked': messages over the
  // status at the top of the glass, always, and never over the banks: the shape of a
  // header that is one block in the glass, as the page's was until it laid the bands out
  // apart (2026-10-02) and as Android's RhScreen still is.
  header: 'auto',
};

// The message band: 5 dp above, 4 below, then its rows.
export const bandH = (rows, rowH = ROW_H) => 9 + rows * rowH;
const TOUCH_MIN = 44;
const HEADER_SIDE = 818;       // messages (>= 400) and status (412) side by side from this width
const MSG_MAX = 960;           // a message row never runs longer (about 110 characters)
const MIN_REGION = 120;        // the smallest glass rectangle worth a map
// The width rule's floors (section 3).  The gap between the banks in portrait is at least
// 2 x the halo, so the two halos never meet and a near miss toward the other bank is
// swallowed exactly as it is in landscape.
const G_MIN = 3, M_MIN = 8, C_OLD = 10, C_MIN = 24;
export const PAD_STEPS = [58, 52, 46];   // the pad's sizes; 46 is Lucas's floor
const PAD_FLOOR = 46, KR_MIN = TOUCH_MIN, KR_LAST = 40;

// ---------------------------------------------------------------------------------------
// 3. Tiers: Android's width and height classes, crossed with the input in use, with a
//    ±24 dp hysteresis band.  A landscape phone is compact HEIGHT.  Tiers change the map
//    treatment and the panels only; no key's size or offset depends on the tier.  The
//    band works from the tier the last layout was drawn at: settings.prevTier for the
//    window's, settings.prevCellTier for the device cell's (section 8 below), which the page
//    keeps (viewer.js, its size classes), so a window on a boundary keeps its tier until it is
//    24 dp past it.
//    Desktop mode is being built (Lucas, 2026-10-06 and 2026-10-07; it was deferred on
//    3 October): the page asks for the desk, pointer 'mouse', when its input switch says a
//    mouse or touchpad is in use (section 12), and for 'touch' otherwise, where a monitor's
//    window keeps the tablet tier its size gives.
// ---------------------------------------------------------------------------------------
export function tierOf(W, H, pointer, prev = null) {
  if (pointer === 'mouse') return 'desk';
  const hw = prev === 'phone' ? 24 : prev === 'tablet' ? -24 : 0;
  return W < 600 + hw || H < 480 + hw ? 'phone' : 'tablet';
}

// ---------------------------------------------------------------------------------------
// 4. Bank metrics: a function of S, L, the pointer and the settings only.
//
//    Width (the portrait constraint).  The movement pad keeps the player's size.  The floors
//    come first: 8 dp margins (or the side cutout's depth, when it is deeper), 3 dp gaps and
//    10 dp between the banks.  Then the right bank's columns up to the pad's size, the gaps
//    to 4 dp, the margins to 12, the gap between the banks to 16, the gaps to 8 (today's pad
//    pitch, 66), the margins to 18 (today's pad offset); the rest separates the banks.  If
//    that leaves under 24 dp between the banks, the right bank's columns pay first (never
//    under 44 dp), then the margins and gaps hand back what they took.  When even that does
//    not fit, the pad steps down 58 -> 52 -> 46 (Lucas's floor), then the right columns
//    narrow to 40 (marked degraded), and last everything gives (degraded, with the reason).
//
//    Height (the landscape constraint).  The bank must fit the landscape height: the bottom
//    offset gives (to 5 dp), then the upper rows' gaps, then the pad gap (never under 3).
//    The text header may sit over the banks (side by side, 12 dp clear of every key) when
//    that shows more of the level (or, with mapCell 'rows', whenever it fits): the top
//    margin, the upper-row gaps (6 -> 2), the upper rows (48 -> 44), the last of their gaps,
//    the bottom offset (at most 10 dp) and last the pad gap give way for it.  Grip lift is
//    part of the bottom offset in both checks.
// ---------------------------------------------------------------------------------------
const bankHeight = (M) => 3 * M.k + 3 * M.g + 2 * M.u + 2 * M.gr + M.s;
const bankWidth = (M, kk) => 3 * kk + 2 * M.g;

// The portrait width shared out for one pad size.  null when the right columns would fall
// under kRmin.  m0 is the margin without the cutout: the bottom offset never pays for a side
// cutout.
function widthFit(Sw, k, kRmin, cut) {
  // The right columns are not rounded to whole dp: a rounding remainder would widen the gap
  // between the banks for one key size and not the next, and smaller keys could then show
  // less map.
  const run = (mMin, kRfloor) => {
    const need = 2 * mMin + 4 * G_MIN + C_OLD;
    let kR = k, extra = Sw - 6 * k - need;
    if (extra < 0) { kR = (Sw - 3 * k - need) / 3; extra = 0; }
    let m = mMin, g = G_MIN, c = C_OLD, d;
    const up = (cur, to, n) => Math.max(0, Math.min(extra / n, to - cur));
    d = up(g, 4, 4); g += d; extra -= 4 * d;      // gaps to 4 (pitch 62)
    d = up(m, 12, 2); m += d; extra -= 2 * d;     // edge margins to 12
    d = up(c, 16, 1); c += d; extra -= d;         // the gap between the banks to 16
    d = up(g, 8, 4); g += d; extra -= 4 * d;      // gaps to 8 (today's pad pitch, 66): pitch before position
    d = up(m, 18, 2); m += d; extra -= 2 * d;     // edge margins to 18 (today's pad offset)
    c += extra;                                   // the rest separates the banks in portrait
    // At least 2 x halo between the banks: on 360-412 dp phones a near miss inward of COMBAT
    // or INVENTORY walked the hero (the verifiers' reports, 2026-10-02); now the two halos
    // never meet.  Paid first by the right bank's columns, down to their floor; then the
    // margins and gaps hand back what they took, in the reverse of the order they took it.
    if (c < C_MIN - 1e-9) {
      let def = C_MIN - c;
      const kR2 = Math.max(Math.min(kR, kRfloor), kR - def / 3);
      def -= 3 * (kR - kR2); c += 3 * (kR - kR2); kR = kR2;
      const back = (cur, to, n) => Math.max(0, Math.min(def / n, cur - to));
      if (def > 1e-9) { d = back(m, Math.max(12, mMin), 2); m -= d; def -= 2 * d; c += 2 * d; }
      if (def > 1e-9) { d = back(g, 4, 4); g -= d; def -= 4 * d; c += 4 * d; }
      if (def > 1e-9) { d = back(m, mMin, 2); m -= d; def -= 2 * d; c += 2 * d; }
      if (def > 1e-9) { d = back(g, G_MIN, 4); g -= d; def -= 4 * d; c += 4 * d; }
      if (def > 1e-9) { const kR3 = kR - def / 3; c += 3 * (kR - kR3); kR = kR3; }
    }
    return { kR, m, g, c };
  };
  const a = run(Math.max(M_MIN, cut), kRmin);
  if (a.kR < kRmin - 1e-9) return null;
  return { ...a, m0: run(M_MIN, KR_MIN).m };
}

function baseMetrics(k, w) {
  return { mode: 'thumb', k, kR: w.kR, m: w.m, mb: Math.min(w.m, w.m0), g: w.g, c: w.c, u: 48, gr: 6, s: TOUCH_MIN, top: 4, over: false, free: false, lift: 0 };
}

// The bank under the landscape height with the header in the glass.  null if it cannot fit.
function heightFit(base, Sh, Sw, st) {
  const M = { ...base };
  if (Sh < 420) { M.u = TOUCH_MIN; M.gr = 3; }
  const ex = () => M.top + bankHeight(M) + M.mb - Sh;
  let d = ex(); if (d > 0) M.mb = Math.max(5, M.mb - d);
  d = ex(); if (d > 0) M.gr = Math.max(0, M.gr - d / 2);
  d = ex(); if (d > 0) M.g = Math.max(G_MIN, M.g - d / 3);
  if (ex() > 1e-9) return null;
  M.lift = clamp(st.gripLift, 0, Sh - M.top - bankHeight(M) - M.mb);
  return derive(M, Sw);
}

// The bank squeezed so the side-by-side header fits over it in landscape, 12 dp clear.
// null when the header would not be side by side (the width after side insets and the
// cutout) or cannot fit.  free: nothing had to give.
function overFit(base, Sh, Sw, Lw, st, rowsL) {
  if (st.header === 'stacked') return null;      // the header stays in the glass
  const cut = st.avoidCutout;
  const padL = Math.max(4 + st.sides.l, cut), padR = Math.max(4 + st.sides.r, cut);
  if (Lw - padL - padR < HEADER_SIDE) return null;
  const hdrH = Math.max(bandH(rowsL, st.msgRowH), st.statusH);
  const lift = st.gripLift;
  const room = (X) => Sh - (X.top + hdrH + st.halo + bankHeight(X) + X.mb + lift);
  const X = { ...base };
  let moved = false;
  const levers = [
    ['top', 2, 1],                               // the margin above the header
    ['gr', 2, 2],                                // the upper rows' gaps, 6 -> 2 (hit cells tile across them)
    ['u', TOUCH_MIN, 2],                         // two upper rows, 48 -> 44
    ['gr', 0, 2],                                // their gaps, 2 -> 0 (keycaps drawn 1 dp inside the rect)
    ['mb', Math.max(5, base.mb - 10), 1],        // the bottom offset, at most 10 dp
    ['g', G_MIN, 3],                             // last, the pad gap (3 vertical gaps); pitch >= 61
  ];
  for (const [f, floor, wgt] of levers) {
    const def = -room(X);
    if (def <= 1e-9) break;
    const v = Math.max(floor, X[f] - def / wgt);
    if (v < X[f] - 1e-9) moved = true;
    X[f] = v;
  }
  if (room(X) < -1e-9) return null;
  return derive({ ...X, over: true, free: !moved, lift }, Sw);
}

// Last resort, below the rule: the right columns to 40, the bank gap to 10, the margins to 4,
// the gaps to 2, the upper rows and strip to 40, and then the whole bank scales.  Degraded.
function lastResort(Sw, Sh, k, cut, st) {
  const M = { mode: 'thumb', k, kR: k, m: Math.max(M_MIN, cut), mb: M_MIN, g: G_MIN, c: C_MIN, u: TOUCH_MIN, gr: 0, s: TOUCH_MIN, top: 2, over: false, free: false, lift: 0 };
  const width = () => 2 * M.m + 3 * M.k + 3 * M.kR + 4 * M.g + M.c;
  const height = () => M.top + bankHeight(M) + M.mb;
  let d;
  d = width() - Sw; if (d > 0) M.kR = Math.max(KR_LAST, Math.floor(M.kR - d / 3));
  d = width() - Sw; if (d > 0) M.c = Math.max(C_OLD, M.c - d);
  d = width() - Sw; if (d > 0) M.m = Math.max(4, M.m - d / 2);
  d = width() - Sw; if (d > 0) M.g = Math.max(2, M.g - d / 4);
  d = height() - Sh; if (d > 0) M.mb = Math.max(4, M.mb - d);
  d = height() - Sh; if (d > 0) M.u = Math.max(40, M.u - d / 2);
  d = height() - Sh; if (d > 0) M.s = Math.max(40, M.s - d);
  const f = Math.min(1, Sw / width(), Sh / height());
  if (f < 1) for (const key of ['k', 'kR', 'm', 'mb', 'g', 'c', 'u', 'gr', 's', 'top']) M[key] *= f;
  return derive(M, Sw);
}

// the derived fields: the bank's height and the portrait gap between the banks
function derive(M, Sw) {
  M.B = bankHeight(M);
  M.c = Sw - 2 * M.m - bankWidth(M, M.k) - bankWidth(M, M.kR);
  return M;
}

// The plan for a touch window: the pad size the space allows, the bank metrics, whether
// the header sits over the banks, and the device's map cell.  Same inputs in both
// orientations, so the same plan.
//
// The map cell is the device's, not the key size's: it is decided with the default 58 dp
// keys, and a player who picks 46 or 52 dp keys keeps that glyph size and gets the width
// the smaller banks free as more columns (smaller keys never show less of the level).
function plan(S, L, st, table) {
  const refSt = st.padKey >= PAD_STEPS[0] ? st : { ...st, padKey: PAD_STEPS[0] };
  const ref = planFor(S, L, refSt, table, null);
  const DC = deviceCell(S, L, st, ref.M, table);
  if (refSt === st) return { ...ref, DC, refM: ref.M };
  const p = planFor(S, L, st, table, DC.T);
  // Smaller keys never make the bank stand taller: the width they free goes to wider gaps
  // and margins, and the gaps and the bottom offset are height too (52 dp keys at 384x568
  // stood 1 dp taller than 58 dp keys and showed 0.1 row less).  The bottom offset hands
  // back the excess first, then the pad gap (never under 3 dp).
  // Nor do they push the header over the banks lower: the larger keys squeezed its top
  // margin (4 -> 2) to fit, and smaller keys, needing no squeeze, would hand the margin
  // back and lose a sliver of map (1704x408 with mapCell 'rows': 20.92 rows at 46 dp
  // against 21 at 52).
  const tall = (M) => M.B + M.mb;
  let over = tall(p.M) - tall(ref.M);
  const lower = p.M.over && ref.M.over && p.M.top > ref.M.top + 1e-9;
  if ((over > 1e-9 || lower) && p.M.mode === 'thumb') {
    const M = { ...p.M };
    if (lower) M.top = ref.M.top;
    if (over > 1e-9) { const d = Math.min(over, Math.max(0, M.mb - 5)); M.mb -= d; over -= d; }
    if (over > 1e-9) M.g = Math.max(G_MIN, M.g - over / 3);
    return { ...p, M: derive(M, st.budget?.w ?? S), DC, refM: ref.M };
  }
  return { ...p, DC, refM: ref.M };
}

// One pad setting's plan.  T: the device cell when it is already decided (smaller keys).
function planFor(S, L, st, table, T) {
  const Sw = st.budget?.w ?? S, Sh = st.budget?.h ?? S, Lw = st.budget?.l ?? L;
  const rowsL = rowsFor(Sh, false, st);
  const want = st.padKey, cut = st.avoidCutout;
  const steps = want > PAD_FLOOR ? [want, ...PAD_STEPS.filter((k) => k < want && k >= PAD_FLOOR)] : [want];
  const reasons = [];
  for (const k of steps) {
    const w = widthFit(Sw, k, KR_MIN, cut);
    if (!w) { reasons.push(`a ${r2(Sw)} dp short side has no room for ${k} dp pad keys with ${KR_MIN} dp right columns and ${C_MIN} dp between the banks`); continue; }
    const base = baseMetrics(k, w);
    const M0 = heightFit(base, Sh, Sw, st);
    if (!M0) { reasons.push(`a ${r2(Sh)} dp landscape height has no room for a bank of ${k} dp keys`); continue; }
    const M1 = overFit(base, Sh, Sw, Lw, st, rowsL);
    let M = M0;
    if (M1) {
      if (M1.free || st.mapCell === 'rows') M = M1;
      else {
        // 'columns': squeeze the banks for the header only when that shows more rows
        const d0 = deviceCell(S, L, st, M0, table, T), d1 = deviceCell(S, L, st, M1, table, T);
        if (d0.rows < 21 - 1e-6 && d1.rows > d0.rows + 0.25) M = M1;
      }
    }
    return { M, fit: { level: k === want ? 'full' : 'stepped', padSetting: want, pad: k, kR: M.kR, degraded: false, reasons } };
  }
  const kf = steps[steps.length - 1];
  const w = widthFit(Sw, kf, KR_LAST, cut);
  const M0 = w && heightFit(baseMetrics(kf, w), Sh, Sw, st);
  if (M0) {
    reasons.push(`the right bank's columns narrow to ${r2(M0.kR)} dp, under the ${KR_MIN} dp floor`);
    return { M: M0, fit: { level: 'narrow', padSetting: want, pad: kf, kR: M0.kR, degraded: true, reasons } };
  }
  const M = lastResort(Sw, Sh, kf, cut, st);
  reasons.push(`below the rule: keys ${r2(M.k)} dp, right columns ${r2(M.kR)} dp, ${r2(M.c)} dp between the banks`);
  return { M, fit: { level: 'degraded', padSetting: want, pad: M.k, kR: M.kR, degraded: true, reasons } };
}

// The bank metrics alone (kept for the checks and for RhLayout.java's port).
export function bankMetrics(S, L, pointer, settings = {}) {
  const st = settled(Math.max(S, L), Math.min(S, L), settings);
  if (pointer === 'mouse') return deskMetrics(st);
  const table = st.combatThumb === 'L' ? BANK_COMBAT_LEFT : BANK;
  return plan(Math.min(S, L), Math.max(S, L), st, table).M;
}

function deskMetrics(st) {
  const k = st.deskKey;
  const M = { mode: 'desk', k, kR: k, m: 12, mb: 12, g: 6, c: 24, u: Math.round(k * 0.85), gr: 4, s: Math.round(k * 0.75), top: 4, over: false, free: false, lift: 0 };
  M.B = bankHeight(M);
  return M;
}

function rowSpans(M) {
  const spans = [];
  let up = 0;
  for (let r = 0; r < 6; r++) {
    const h = r < 3 ? M.k : r < 5 ? M.u : M.s;
    spans.push({ up0: up, h });
    up += h + (r <= 2 ? M.g : M.gr);
  }
  return spans;
}

// message rows: Lucas's setting for the orientation; screens under 800 dp tall get at most 2
function rowsFor(H, portrait, st) {
  const rows = st.msgRows[portrait ? 'portrait' : 'landscape'];
  return H < 800 ? Math.min(rows, st.shortScreenRows) : rows;
}

// ---------------------------------------------------------------------------------------
// 5. Banks on a screen.  Each bank hangs from its bottom corner at (m, mb + grip lift).
//    Physical corners by default; 'auto' uses the safe corner only for side insets in
//    landscape (iPhones in a browser), where the notch or island would sit on the outer
//    column.  An inset counts only beyond the margin that already clears it.
// ---------------------------------------------------------------------------------------
function placeBanks(W, H, M, st, table) {
  const mirror = st.hand === 'left';
  const ins = st.insets;
  const landscape = W >= H;
  const useSide = st.anchor === 'safe' || (st.anchor === 'auto' && landscape && (ins.l > 0 || ins.r > 0));
  const useBottom = st.anchor === 'safe';
  // The height fit clamps the grip lift against the bottom offset mb.  Under 'safe' a
  // bottom inset deeper than mb raises the banks further, so the inset's share and the lift
  // are clamped again here against the room this window has over the bank at mb: no key
  // leaves the screen (an iPhone 12 mini with 40 dp of lift put REST at y -7 before,
  // 2026-10-02).  'safe' already gives up parity, so the clamp may differ per orientation.
  const room = Math.max(0, H - M.top - M.B - M.mb);
  const inset = useBottom ? Math.min(Math.max(0, ins.b - M.mb), room) : 0;
  const lift = Math.min(M.lift || 0, room - inset);
  const banks = {};
  for (const corner of ['L', 'R']) {
    const content = mirror ? (corner === 'L' ? 'R' : 'L') : corner;
    const kk = content === 'L' ? M.k : M.kR;
    const bw = bankWidth(M, kk), bh = M.B;
    const outer = useSide ? Math.max(M.m, corner === 'L' ? ins.l : ins.r) : M.m;
    const bottom = M.mb + inset + lift;
    const x0 = corner === 'L' ? outer : W - outer - bw;
    const y1 = H - bottom;
    banks[corner] = { side: corner, content, kk, bw, bh, x0, x1: x0 + bw, y0: y1 - bh, y1 };
  }
  const spans = rowSpans(M);
  const controls = [];
  for (const corner of ['L', 'R']) {
    const B = banks[corner];
    table[B.content].forEach((row, r) => row.forEach((id, c) => {
      const w = B.kk, h = spans[r].h;
      // Movement directions stay true to the map: in the right corner the pad's columns keep
      // their screen order.  Every other key mirrors with its thumb.
      const cc = id.startsWith('pad_') && corner === 'R' ? 2 - c : c;
      const inDp = cc * (B.kk + M.g);
      const x = corner === 'L' ? B.x0 + inDp : B.x1 - inDp - w;
      const y = B.y1 - spans[r].up0 - h;
      controls.push({ id, label: LABEL[id], x: r2(x), y: r2(y), w: r2(w), h: r2(h), thumb: corner, kind: id.startsWith('pad_') ? 'pad' : KIND[id] || 'key' });
    }));
  }
  const rest = controls.find((c) => c.id === 'rest');
  controls.push({ ...rest, id: 'longrest', label: 'LONG REST (swiped up out of the REST slot; hold once out: counts ×100–×400)', behind: 'rest' });
  return { banks, controls, bankTop: Math.min(banks.L.y0, banks.R.y0), lift };
}

// ---------------------------------------------------------------------------------------
// 6. The text header: messages and status, side by side when the width allows (messages
//    at most 960 dp, status at least 412), else stacked, messages first.
// ---------------------------------------------------------------------------------------
function header(x, y, w, rows, st) {
  const BH = bandH(rows, st.msgRowH);
  if (w >= HEADER_SIDE && st.header !== 'stacked') {
    const h = Math.max(BH, st.statusH);
    const mw = Math.min(MSG_MAX, w - st.statusW - 6);
    return {
      h, sideBySide: true, rows,
      bands: [
        { name: `messages (${rows} rows; MORE lamp at the right end)`, x, y, w: mw, h },
        { name: 'status (3 lines)', x: x + mw + 6, y, w: w - mw - 6, h },
      ],
    };
  }
  const SH = st.statusH;
  return {
    h: BH + 2 + SH, sideBySide: false, rows,
    bands: [
      { name: `messages (${rows} rows; MORE lamp at the right end)`, x, y, w, h: BH },
      { name: 'status (3 lines)', x, y: y + BH + 2, w, h: SH },
    ],
  };
}

// ---------------------------------------------------------------------------------------
// 7. Glass candidates.  'between': the full-height column between the banks, with the
//    header stacked at its top, or (landscape, when the plan allows) side by side across
//    the screen over the banks.  'above': the full width above the banks (the tray between
//    the banks takes panels).  Each is clear of the banks by the halo, and so is every band:
//    the over-the-banks header is dropped when it would stack or come within 12 dp of a key.
// ---------------------------------------------------------------------------------------
function candidates(W, H, M, P, st, rows, minRegion = MIN_REGION) {
  const ins = st.insets, halo = st.halo, top = M.top + ins.t;
  const landscape = W >= H;
  const cut = landscape ? st.avoidCutout : 0;
  const padL = Math.max(4 + ins.l, cut), padR = Math.max(4 + ins.r, cut);
  const out = [];
  {
    const x0 = P.banks.L.x1 + halo, x1 = P.banks.R.x0 - halo;
    if (x1 - x0 >= minRegion) {
      let over = false;
      if (M.over && landscape) {
        const hd = header(padL, top, W - padL - padR, rows, st);
        if (hd.sideBySide && top + hd.h + halo <= P.bankTop + 1e-6) {
          const y0 = top + hd.h + 2;
          out.push({ kind: 'between', over: true, hd, region: { x: x0, y: y0, w: x1 - x0, h: H - 4 - ins.b - y0 }, tray: null });
          over = true;
        }
      }
      // mapCell 'rows' keeps the header over the banks whenever it is there; 'columns' also
      // weighs the header in the glass, whose spare height becomes message rows
      if (!(over && st.mapCell === 'rows')) {
        const hd = header(x0, top, x1 - x0, rows, st);
        const y0 = top + hd.h + 2;
        out.push({ kind: 'between', over: false, hd, region: { x: x0, y: y0, w: x1 - x0, h: H - 4 - ins.b - y0 }, tray: null });
      }
    }
  }
  {
    const x0 = padL, x1 = W - padR, y1 = P.bankTop - halo;
    const hd = header(x0, top, x1 - x0, rows, st);
    const y0 = top + hd.h + 2;
    const tray = { x: P.banks.L.x1 + halo, y: P.bankTop, w: P.banks.R.x0 - P.banks.L.x1 - 2 * halo, h: Math.max(P.banks.L.y1, P.banks.R.y1) - P.bankTop };
    out.push({ kind: 'above', over: false, hd, region: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, tray: tray.w >= 240 ? tray : null });
  }
  return out.filter((c) => c.region.w >= minRegion && c.region.h >= minRegion);
}

// cells of the 80x21 level a region shows at cell height T; whole = the level fits
function cellsAt(region, T, a) {
  const cols = Math.min(80, region.w / (a * T)), rowsV = Math.min(21, region.h / T);
  return { cols, rows: rowsV, cells: cols * rowsV, whole: cols >= 80 - 1e-9 && rowsV >= 21 - 1e-9 };
}

// The order of preference between glass candidates: the whole level, then all 21 rows (a
// 960x600 tablet once took a 12.5-row strip over a column with every row), then the most
// cells, then -- on a tie -- the header in the glass (its spare height becomes text), then
// the bigger cell, then the bigger rectangle.
//
// "All 21 rows" means within half a cell of them (at most a half-row pan), and it outranks
// more cells only while it shows at least ALL_ROWS_SHARE of the rival's: ranked strictly
// first, it picked a 120 dp column over a full-width map that was 0.03 of a row short on
// foldables and split screens (the verifiers, 2026-10-02).  960x600 keeps its column of
// every row: 34x21 = 714 cells against the strip's 993, 0.72.
const ALL_ROWS = 20.5, ALL_ROWS_SHARE = 0.7;
function better(p, q) {
  if (p.whole !== q.whole) return p.whole;
  const pr = p.rows >= ALL_ROWS - 1e-6, qr = q.rows >= ALL_ROWS - 1e-6;
  if (pr !== qr && (pr ? p.cells >= ALL_ROWS_SHARE * q.cells : q.cells >= ALL_ROWS_SHARE * p.cells)) return pr;
  if (Math.abs(p.cells - q.cells) > 1e-6) return p.cells > q.cells;
  if (p.over !== q.over) return !p.over;
  if (Math.abs(p.T - q.T) > 1e-6) return p.T > q.T;
  // The whole level at the same cell in either glass (a monitor's window, both at the cap):
  // the glass above the banks, which leaves the tray between them and the glass under the
  // level to the panels.  The taller column between the banks would leave the glass under
  // the level and both corners but their narrow panels void (5120x2160: 52% of it).
  if (p.whole && q.whole && p.kind !== q.kind) return p.kind === 'above';
  return p.region.w * p.region.h > q.region.w * q.region.h;
}
const bestOf = (list) => list.reduce((b, c) => (!b || better(c, b) ? c : b), null);

// The glass keeps a band of GLASS_BAND dp either side of where the ranking changes its mind
// (Lucas, 2026-10-04), as the tiers do (section 3).  The ranking has steps a window can sit
// on: a 1000 dp window dragged across 600 tall swapped a 16.5 dp cell for the whole level at
// 12 (it shows from there), 1280x636 and 1366x656 a 20 dp cell for 12, and 1000x657 the map
// between the banks for the map above them, at every pixel either side.  So the glass the
// page last drew (settings.prevGlass, and prevCellGlass for the device cell's, which
// viewer.js keeps with the tiers) stays while the ranking still picks it somewhere within
// GLASS_BAND dp of the window, and only while it is still a glass this window has: a band
// picks among the window's own candidates, which are all clear of the keys, so it costs a
// little of the level at most, never a key.  The whole level is never kept under the cell's
// floor, so that band is one-sided.  The ranking is tried at the eight windows GLASS_BAND
// dp away; the steps are lines in W and H, so those find them.  Nothing is kept across a
// bigger jump (a rotation, fullscreen): no window GLASS_BAND away picked the old glass.
export const GLASS_BAND = 24;
const NEAR = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
const sameGlass = (s, g, whole) => s.kind === g.kind && !!s.over === !!g.over && (!whole || !!s.whole === !!g.whole);
function keptGlass(best, list, prev, W, H, pickAt, whole) {
  if (!best || !prev || sameGlass(best, prev, whole)) return best;
  const kept = bestOf(list.filter((s) => sameGlass(s, prev, whole)));
  if (!kept) return best;
  const near = NEAR.some(([dx, dy]) => {
    const b = pickAt(Math.max(1, W + dx * GLASS_BAND), Math.max(1, H + dy * GLASS_BAND));
    return b && sameGlass(b, prev, whole);
  });
  return near ? kept : best;
}
// what a stored glass may be: { kind, over[, whole][, portrait] }, or nothing; one that
// says its orientation counts only in that orientation (a turn keeps no glass)
const glassOf = (g, portrait) => (g && typeof g === 'object' && typeof g.kind === 'string'
  && (g.portrait == null || portrait == null || !!g.portrait === !!portrait)
  ? { kind: g.kind, over: !!g.over, whole: !!g.whole } : null);

// ---------------------------------------------------------------------------------------
// 8. One map cell per device, decided on the device's landscape geometry (the remembered
//    landscape side insets included) and used in both orientations, so a rotation never
//    changes the glyph size:
//    - phones, mapCell 'columns' (the default): the cell that shows at least 34 columns of
//      the level in landscape (today's count on Lucas's phone) with all 21 rows where they
//      fit, never under 12 dp nor over 20;
//    - phones, mapCell 'rows': the cell whose 21 rows fill the landscape map, 12 to 20 dp;
//    - tablets: the cell that shows the whole level when that is 12 dp or more (cap 24),
//      else the phone rule.  No tablet is wide enough to reach the cap -- 1920x1080 shows
//      the level at 23.5 dp -- so it binds only on a monitor, which the design gave the
//      desk.  A monitor's window laid out for touch is a tablet (it was every monitor's
//      window while desktop mode was deferred, Lucas, 2026-10-03); there, where 24 dp would
//      leave strips wider than a panel beside the level (WIDE_STRIP), the cap rises towards
//      tabletWideCellMax, the desk's widest (section 10 below), rather than leave the window
//      black: a 2560x1440 window showed the level at 24 dp in a glass half void (52%),
//      3440x1440 62%; now 31.5 and 42.5 dp, 5% and 8%.
//      It rises over WIDE_RAMP dp of width, not at once (tabletCap): a first cut switched
//      to 48 dp at the strips' width, and a monitor's window dragged across 2408 dp wide
//      swapped a 24 dp level for a 30 dp one, and moved the log, at every pixel either side
//      (the reviews, 2026-10-03).  A portrait window keeps the cell under a level as wide
//      as its own glass, never under 24 dp (layoutCore, section 9 below).
//    Pinch stores a factor of this cell, not a pixel size.
// ---------------------------------------------------------------------------------------
const WIDE_STRIP = 240;     // a strip beside the level as wide as a panel (the tray takes one from 240 dp)
const WIDE_RAMP = 160;      // the width over which the strips close once they are WIDE_STRIP
// The whole-level cell's cap on a tablet: tabletCellMax up to where a level at that cell
// would leave strips WIDE_STRIP wide beside it in the region; from there, over the next
// WIDE_RAMP dp, it moves to the cell that fills the region's width, which it then follows,
// up to tabletWideCellMax.  Continuous in the width, so a window dragged wider grows the
// level half a dp at a time (2560x1440 is past the ramp: the level fills it at 31.5 dp).
function tabletCap(regionW, a, st) {
  const lo = st.tabletCellMax, hi = Math.max(lo, st.tabletWideCellMax);
  const t = clamp((regionW - 80 * a * lo - 2 * WIDE_STRIP) / WIDE_RAMP, 0, 1);
  return Math.min(hi, lo + t * Math.max(0, regionW / (80 * a) - lo));
}
export function deviceCell(S, L, settings, M, table = BANK, Tfixed = null) {
  const st = settings.sides ? settings : settled(L, S, settings);
  const W = st.budget?.l ?? L, H = st.budget?.h ?? S;
  // with its own hysteresis: a desktop window dragged across 480 dp tall would
  // otherwise swap the whole-level cell and the phone's at every pixel either side
  const tierAt = (w, h) => tierOf(w, h, 'touch', st.prevCellTier ?? null);
  const tier = tierAt(W, H);
  const ist = { ...st, insets: { l: st.sides.l, r: st.sides.r, t: 0, b: 0 } };
  const a = st.cellAspect;
  // A tablet's glass that holds the whole level is that, and also -- for the band only
  // (section 7) -- the same glass at the phone's cell, panning: the ranking puts any whole
  // level first, so it never picks the second, but a window dragged across where the level
  // first fits (968 wide at 800 tall) keeps it for GLASS_BAND dp.
  const glasses = (W, H, tier) => candidates(W, H, M, placeBanks(W, H, M, ist, table), ist, rowsFor(H, false, st)).flatMap((c) => {
    const R = c.region;
    const fit = Math.min(R.w / (80 * a), R.h / 21);
    const at = (T) => ({ ...cellsAt(R, T, a), T, kind: c.kind, over: c.over, region: R });
    const phoneT = st.mapCell === 'rows' ? clamp(R.h / 21, st.fitFloor, st.cellMax) : clamp(Math.min(R.w / (a * st.cellColumns), R.h / 21), st.fitFloor, st.cellMax);
    if (Tfixed) return [at(Tfixed)];
    if (!(tier === 'tablet' && fit >= st.fitFloor)) return [at(phoneT)];
    const s = { ...at(Math.floor(Math.min(fit, tabletCap(R.w, a, st)) * 2) / 2), whole: true, cells: 1680 };
    const pans = at(phoneT);
    return pans.whole ? [s] : [s, pans];
  });
  const list = glasses(W, H, tier);
  // the band (section 7), for the device cell itself only: a fixed cell (smaller keys, the
  // header's squeeze) compares glasses at that cell, as the ranking does
  const prev = Tfixed ? null : glassOf(st.prevCellGlass);
  const best = keptGlass(bestOf(list), list, prev, W, H, (w, h) => bestOf(glasses(w, h, tierAt(w, h))), true);
  if (!best) return { T: st.fitFloor, tier, kind: 'none', whole: false, rows: 0, cols: 0, cells: 0, over: false };
  return { T: best.T, tier, kind: best.kind, whole: best.whole, rows: best.rows, cols: best.cols, cells: best.cells, over: best.over };
}

// ---------------------------------------------------------------------------------------
// 9. The layout.  It never throws.  Every result says whether the page may draw it:
//    - usable, not degraded: the rule as designed;
//    - usable, degraded: drawn as given -- every key on screen, none on another key or on
//      the map, no band or panel over a key, a map with area -- with sizes under the
//      rule's floors and the reasons in fit.reasons;
//    - unusable (fit.level 'unusable', or no spec when something unexpected threw): the
//      page shows classic for this window (section 12), and twin banks come back when the
//      window can hold them.  Near-square split screens land here (443x460 on Lucas's
//      phone beside a wiki): no rectangle is left for a map.
// ---------------------------------------------------------------------------------------
export function layout(W, H, pointer = 'touch', settings = {}) {
  try {
    const st = settings || {};
    const r = layoutCore(W, H, pointer, st);
    // The glass's band (section 7) never costs a window its twin banks: a kept glass is
    // clear of the keys, but may be too narrow for the drawer (600x620, where the column
    // between the banks was kept 160 dp wide), so the ranking's own pick decides then.
    if (!r.usable && (st.prevGlass || st.prevCellGlass)) {
      const plain = layoutCore(W, H, pointer, { ...st, prevGlass: null, prevCellGlass: null });
      if (plain.usable) return plain;
    }
    // Nor does the desk's band (section 10 below) cost a window its desk.
    if (!r.usable && pointer === 'mouse' && st.prevDesk) {
      const plain = layoutCore(W, H, pointer, { ...st, prevDesk: null });
      if (plain.usable) return plain;
    }
    return r;
  } catch (e) {
    return { spec: null, usable: false, info: null, degraded: true, reason: `layout() failed: ${e && e.message}` };
  }
}

// What would make a spec unsafe to draw: a key off screen, on another key or on the map, a
// band or panel over a key, a map with no area, a number that is not finite.
export function collisions(S) {
  const out = [];
  const live = S.controls.filter((c) => !c.behind);
  const ov = (a, b) => a.x + 0.01 < b.x + b.w && b.x + 0.01 < a.x + a.w && a.y + 0.01 < b.y + b.h && b.y + 0.01 < a.y + a.h;
  const m = S.mapArea;
  if (!(m.w >= 1 && m.h >= 1)) out.push(`the map has no area (${r2(m.w)}x${r2(m.h)})`);
  for (const c of live) {
    if (![c.x, c.y, c.w, c.h].every(Number.isFinite)) { out.push(`${c.id} is not a finite rect`); continue; }
    if (c.x < -0.01 || c.y < -0.01 || c.x + c.w > S.W + 0.01 || c.y + c.h > S.H + 0.01) out.push(`${c.id} off screen`);
    if (m.w >= 1 && m.h >= 1 && ov(c, m)) out.push(`${c.id} on the map`);
  }
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) if (ov(live[i], live[j])) out.push(`${live[i].id} on ${live[j].id}`);
  for (const b of [...S.bands, ...S.chrome]) for (const c of live) if (ov(b, c)) { out.push(`${b.name.split(' (')[0]} over ${c.id}`); break; }
  return out;
}

// A map that cannot show 8x8 cells (the hero and about four cells each way) is no map to
// play on, and a map with no room for the drawer leaves MENU, WORLD and GAME nowhere to
// open (MENU is the way to Settings): classic serves those windows better (a split screen
// beside a wiki with 46 dp keys left a 6-column slit, 2026-10-02).
const MIN_MAP_CELLS = 8;
function verdict(r) {
  const bad = collisions(r.spec);
  const f0 = r.info && r.info.fill;
  if (f0 && !bad.length && (f0.cols < MIN_MAP_CELLS - 1e-6 || f0.rows < MIN_MAP_CELLS - 1e-6)) bad.push(`the map shows ${r2(f0.cols)}x${r2(f0.rows)} cells, under ${MIN_MAP_CELLS}x${MIN_MAP_CELLS}`);
  if (!bad.length && !r.spec.popups.some((p) => p.owner === 'world')) bad.push(`the ${r2(r.spec.mapArea.w)}x${r2(r.spec.mapArea.h)} dp map has no room for the 200x88 dp drawer (MENU, WORLD and GAME open in it)`);
  r.usable = !bad.length;
  if (!r.usable) {
    const f = r.spec.fit;
    f.level = 'unusable'; f.degraded = true;
    f.reasons.push(`unusable, the page shows classic: ${bad.slice(0, 4).join(', ')}${bad.length > 4 ? ` and ${bad.length - 4} more` : ''}`);
    r.degraded = true;
    r.reason = f.reasons.join('; ');
    if (r.info && r.info.fit) r.info.fit = { ...r.info.fit, level: f.level, degraded: true, reasons: f.reasons };
  }
  return r;
}

// settings merged over the defaults, with every number made safe
function settled(W, H, settings) {
  const st = {
    ...DEFAULTS, ...settings,
    msgRows: { ...DEFAULTS.msgRows, ...(settings.msgRows || {}) },
    insets: { ...DEFAULTS.insets, ...(settings.insets || {}) },
  };
  if (settings.text && settings.msgRowH == null) {
    const t = textMetrics(settings.text);
    st.msgRowH = t.msgRowH;
    if (settings.statusH == null) st.statusH = t.statusH;
  }
  for (const k of ['l', 'r', 't', 'b']) st.insets[k] = Math.max(0, num(st.insets[k], 0));
  const pos = (v, d) => (num(v, d) > 0 ? num(v, d) : d);
  st.padKey = pos(st.padKey, DEFAULTS.padKey);
  st.deskKey = pos(st.deskKey, DEFAULTS.deskKey);
  st.gripLift = Math.max(0, num(st.gripLift, 0));
  st.avoidCutout = Math.max(0, num(st.avoidCutout, 0));
  st.msgRowH = pos(st.msgRowH, ROW_H);
  st.statusH = Math.max(0, num(st.statusH, STATUS_H));
  st.cellAspect = pos(st.cellAspect, 1);
  st.dpr = clamp(pos(st.dpr, 1), 0.5, 8);
  for (const k of ['cellColumns', 'fitFloor', 'cellMax', 'tabletCellMax', 'tabletWideCellMax', 'deskCellMax', 'deskWideCellMax', 'halo', 'ring', 'statusW', 'shortScreenRows']) st[k] = pos(st[k], DEFAULTS[k]);
  st.msgRows = { landscape: Math.max(1, Math.round(num(st.msgRows.landscape, 2))), portrait: Math.max(1, Math.round(num(st.msgRows.portrait, 3))) };
  st.header = st.header === 'stacked' ? 'stacked' : 'auto';
  const b = st.budget;
  st.budget = b && num(b.w, 0) > 0 && num(b.h, 0) > 0 ? { w: b.w, h: b.h, l: num(b.l, 0) > 0 ? b.l : Math.max(W, H) } : null;
  // the landscape side insets: remembered, or this window's own when it is landscape
  const si = settings.sideInsets;
  st.sides = si ? { l: Math.max(0, num(si.l, 0)), r: Math.max(0, num(si.r, 0)) } : W >= H ? { l: st.insets.l, r: st.insets.r } : { l: 0, r: 0 };
  return st;
}

function layoutCore(W0, H0, pointer, settings) {
  const W = Math.max(1, num(W0, 1)), H = Math.max(1, num(H0, 1));
  let st = settled(W, H, settings);
  const table = st.combatThumb === 'L' ? BANK_COMBAT_LEFT : BANK;
  const S = Math.min(W, H), L = Math.max(W, H);
  const portrait = H > W;                                  // a square window is landscape
  const reasons = [];
  // The budget promises parity; a window smaller than it promised wins (the toolbar came
  // back, a split screen): lay out without it rather than put keys off screen.  Both axes,
  // in either orientation: the banks were fitted to the budget's width side by side and to
  // its landscape height, so a window narrower than budget.w or shorter than budget.h
  // cannot hold them (400x363 under a 443-wide budget stacked the banks on each other).
  if (st.budget && (W < st.budget.w - 0.5 || H < st.budget.h - 0.5)) {
    reasons.push(`the window (${W}x${H}) is smaller than the remembered budget; laid out without it`);
    st = { ...st, budget: null };
  }
  if (pointer === 'mouse') return verdict(deskLayout(W, H, deskMetrics(st), st, table, reasons));
  const tier = tierOf(W, H, pointer, st.prevTier);
  const { M, fit, DC, refM } = plan(S, L, st, table);
  fit.reasons = [...reasons, ...fit.reasons];
  const P = placeBanks(W, H, M, st, table);
  const a = st.cellAspect;
  let T = DC.T;

  // 9a. the glass: the candidate that shows most of the level at the device cell.  Larger
  //     text first gives up message rows (down to 1), then the smallest glass worth a map.
  const wantRows = rowsFor(H, portrait, st);
  let rows = wantRows, cands = candidates(W, H, M, P, st, rows);
  while (!cands.length && rows > 1) { rows--; cands = candidates(W, H, M, P, st, rows); }
  // the text is to blame only when it is larger than the defaults; otherwise the window is
  // too small (a near-square split screen at the default text size)
  const bigText = st.msgRowH > ROW_H + 1e-6 || st.statusH > STATUS_H + 1e-6;
  if (rows < wantRows) fit.reasons.push(`${rows} message row(s): ${bigText ? 'the text is too large' : 'the window is too small'} for more`);
  let glassDegraded = false;
  if (!cands.length) {
    cands = candidates(W, H, M, P, st, rows, 40);
    glassDegraded = true; fit.reasons.push('the glass is under 120 dp');
  }
  // A monitor turned to portrait (1440x2560) shares the device cell no further than a level
  // as wide as its own widest glass, and never under the tablet's cap: the cell grown for
  // its landscape width (section 8 above) showed 45 of the level's 80 columns at 31.5 dp
  // where 24 dp shows 60 (the reviews, 2026-10-03).  Only past tabletCellMax, which no
  // phone or tablet reaches, so their two orientations keep one cell.
  const portraitCap = (T, cands, portrait) => {
    if (!portrait || T <= st.tabletCellMax || !cands.length) return T;
    const wide = Math.max(...cands.map((c) => c.region.w));
    return Math.max(st.tabletCellMax, Math.min(T, Math.floor(wide / (80 * a) * 2) / 2));
  };
  T = portraitCap(T, cands, portrait);
  const scored = cands.map((c) => ({ ...c, ...cellsAt(c.region, T, a), T }));
  // The glass last drawn, while the ranking still picks it within GLASS_BAND dp (section 7).
  // Each window tried has its own cell: the device's, which a window without a budget
  // decides from its own sides (at 1366 wide the cell grows from 12 dp at 699 tall to 13.5
  // at 740, and the glass the ranking picks there at 13.5 is not the one it picks at 12).
  let G = keptGlass(bestOf(scored), scored, glassOf(st.prevGlass, portrait), W, H, (w, h) => {
    const Pn = placeBanks(w, h, M, st, table);
    let n = rowsFor(h, h > w, st), cs = candidates(w, h, M, Pn, st, n);
    while (!cs.length && n > 1) { n--; cs = candidates(w, h, M, Pn, st, n); }
    const Tn = portraitCap(deviceCell(Math.min(w, h), Math.max(w, h), st, refM, table).T, cs, h > w);
    return bestOf(cs.map((c) => ({ ...c, ...cellsAt(c.region, Tn, a), T: Tn })));
  }, false);
  // Smaller keys never show less of the level (section 2).  The device cell is decided at
  // 58 dp keys, and every glass rectangle only grows as the banks shrink, so the glass the
  // next larger key size picks, taken here at these keys, shows at least what it showed
  // there; when the ranking's own pick shows less (fewer cells or a smaller map), that one
  // is taken instead.  Without this the 21-rows rule could flip a Surface Duo from a
  // full-width map at 58 dp to a 136 dp column at 52 (the verifiers, 2026-10-02).  The
  // larger keys may have given up a message row for their glass (528x592: one row and the
  // full width at 58 dp, where 52 dp keys kept two rows and a 124 dp column), so their row
  // count is tried too.
  const larger = PAD_STEPS.filter((k) => k > st.padKey).pop();
  if (G && larger && !settings.noRegress) {
    const R = layoutCore(W0, H0, pointer, { ...settings, padKey: larger, noRegress: false });
    const pg = R.usable && R.info.G;
    if (pg && pg.kind !== 'none') {
      const shows = (g, n) => { const f = fillGlass(g, T, a, tier, st, n, P, W, H); return { cells: f.cols * f.rows, area: f.map.w * f.map.h }; };
      const was = { cells: R.info.fill.cols * R.info.fill.rows, area: R.spec.mapArea.w * R.spec.mapArea.h };
      const mine = shows(G, rows);
      if (mine.cells < was.cells - 0.01 || mine.area < was.area - 0.5) {
        const like = (c) => c.kind === pg.kind && c.over === pg.over;
        const enough = (c, n) => { if (!c) return false; const s = shows(c, n); return s.cells >= was.cells - 0.01 && s.area >= was.area - 0.5; };
        let same = scored.find(like), n = rows;
        if (!enough(same, n) && R.info.rows < rows) {
          n = R.info.rows;
          same = candidates(W, H, M, P, st, n).map((c) => ({ ...c, ...cellsAt(c.region, T, a), T })).find(like);
        }
        if (enough(same, n)) {
          if (n < rows) fit.reasons.push(`${n} message row(s), as with ${larger} dp keys, so these keys show no less of the level`);
          G = same; rows = n;
        }
      }
    }
  }
  if (!G) {
    // nothing left at all: a map with no area at the top of the screen (the result is
    // marked unusable below, and the page shows classic for this window)
    glassDegraded = true; fit.reasons.push(`no room for the map: a ${W}x${H} window is too small for twin banks and a map`);
    const hd = header(4, 4, Math.max(1, W - 8), 1, st);
    G = { kind: 'none', over: false, hd, region: { x: 4, y: Math.min(H, 4 + hd.h + 2), w: Math.max(0, W - 8), h: 0 }, tray: null, cols: 0, rows: 0, cells: 0 };
  }
  if (glassDegraded) { fit.degraded = true; if (fit.level === 'full' || fit.level === 'stepped') fit.level = 'degraded'; }
  const fill = fillGlass(G, T, a, tier, st, rows, P, W, H);

  // 9b. pop-ups: feedback for the flick, the layer name pill, the drawer.  Counts, context
  //     candidates and the pad-centre list are layers on the pad and pop nothing.
  const popups = popupsFor(P, fill, st);

  // 9c. decor: wells, halos, the confirm ring (drawn; the harness counts decor as void)
  const decor = [];
  for (const side of ['L', 'R']) {
    const B = P.banks[side];
    decor.push({ name: `${side === 'L' ? 'left' : 'right'} bank well + guard halo (12 dp: snaps within 8 dp, swallows beyond)`, ...rnd(clip({ x: B.x0 - st.halo, y: B.y0 - st.halo, w: B.bw + 2 * st.halo, h: B.bh + 2 * st.halo }, W, H)) });
  }
  for (const r of ringRects(fill.map, P, st)) decor.push({ name: 'confirm ring (when a tap would travel: a map tap here previews; a second tap walks)', ...rnd(r) });

  const degraded = !!fit.degraded;
  const spec = {
    W, H, pointer,
    source: `v2 layout(): tier ${tier}, S ${S}, glass ${G.kind}${G.over ? ' with the header over the banks' : ''}, pad ${r2(M.k)} dp${fit.level === 'full' ? '' : ` (${fit.level}; setting ${fit.padSetting})`}, pitch ${r2(M.k + M.g)}, right columns ${r2(M.kR)} dp, m ${r2(M.m)}, mb ${r2(M.mb)}${P.lift ? ` + lift ${r2(P.lift)}` : ''}, g ${r2(M.g)}, gap ${r2(M.c)}, upper ${r2(M.u)}/${r2(M.gr)}, map cell ${r2(T)} dp (${st.mapCell}; ${fill.whole ? 'whole level' : 'pans'}; ${r2(fill.cols)}x${r2(fill.rows)} cells), msg rows ${fill.rows_msg}`,
    controls: P.controls.map((c) => ({ ...c })),
    glass: rnd(fill.glass), mapArea: rnd(fill.map),
    bands: fill.bands.map((b) => ({ name: b.name, ...rnd(b) })),
    popups,
    chrome: fill.panels.map((p) => ({ name: p.name, ...rnd(p) })),
    decor,
    fit: { level: fit.level, pad: r2(M.k), padSetting: fit.padSetting, rightColumns: r2(M.kR), degraded, reasons: fit.reasons },
  };
  const reason = fit.reasons.length ? fit.reasons.join('; ') : null;
  return verdict({ spec, degraded, reason, info: { tier, S, L, portrait, M, banks: P.banks, G, fill, T, DC, bankTop: P.bankTop, lift: P.lift, rows, fit } });
}

// Fill a glass candidate at cell T: the map (the cells actually drawn, at the top of the
// glass, so spare height lies between the map and the banks), extra message rows and
// panels from what the level does not need.
function fillGlass(G, T, a, tier, st, rows0, P, W, H) {
  const R = G.region;
  const c = cellsAt(R, T, a);
  let bands = G.hd.bands.map((b) => ({ ...b }));
  const panels = [];
  let rowsMsg = rows0;
  const LOG = 'panel: message log (history, newest last)';
  const INV = 'panel: inventory (a copy of the INVENTORY list; the key stays in its bank)';
  const whole = tier !== 'phone' && c.whole;
  const mh = Math.max(0, Math.min(R.h, 21 * T));
  // never wider than the level's 80 columns: past them no cell is drawn (a wide window
  // that is a little short of 21 rows once counted its whole width as map)
  const mw = Math.min(R.w, 80 * a * T);
  // Ultrawide: the whole level in the column between the banks, narrower than it by a
  // panel (160 dp) and a 12 dp gap a side, as on 32:9 (5120x1440, the level at 48 dp): the
  // log and the inventory stand beside the level, from its top to the bottom of the screen,
  // as the desk flanks its map (section 10 below), rather than over the banks, 212 dp wide, with
  // the glass beside the level void (33% of 5120x1440; now 24%).
  const side = (R.w - mw) / 2 - 12;
  const flank = G.kind === 'between' && whole && side >= 160;
  // The map between the banks on a landscape screen tall enough to leave 120 dp or more over
  // each bank (960x600 tablets): the log over the left bank, the inventory over the right,
  // each 12 dp clear of the keys and 4 dp clear of the glass.
  if (G.kind === 'between' && P && !flank) {
    const ins = st.insets, y0 = G.over ? G.hd.bands[0].y + G.hd.h + 4 : 4 + ins.t;
    const h = P.bankTop - st.halo - y0;
    const lx0 = 4 + ins.l, lx1 = R.x - 4, rx0 = R.x + R.w + 4, rx1 = W - 4 - ins.r;
    if (h >= 120 && lx1 - lx0 >= 160 && rx1 - rx0 >= 160) {
      panels.push({ name: LOG, x: lx0, y: y0, w: lx1 - lx0, h });
      panels.push({ name: INV, x: rx0, y: y0, w: rx1 - rx0, h });
    }
  }
  const hasLog = () => flank || panels.some((q) => q.name.startsWith('panel: message log'));
  let spare = R.h - mh;
  let y0 = R.y;
  // spare height: first message rows (up to 4 in all), then a log panel
  const canGrow = !G.over;                       // a header over the banks has a fixed height
  if (canGrow && spare > 1) {
    const msgBand = bands[0];
    if (spare >= 120 && tier !== 'phone' && !hasLog()) {
      panels.push({ name: LOG, x: R.x, y: R.y + mh + 4, w: R.w, h: spare - 4 });
      spare = 0;
    } else {
      const add = Math.max(0, Math.min(4 - rowsMsg, Math.floor(spare / st.msgRowH)));
      if (add) {
        const grow = add * st.msgRowH;
        rowsMsg += add;
        bands = bands.map((b, i) => (i === 0 ? { ...b, name: b.name.replace(/\d+ rows/, `${rowsMsg} rows`), h: b.h + grow }
          : b.x === msgBand.x && b.y > msgBand.y ? { ...b, y: b.y + grow } : { ...b, h: b.h + grow }));
        y0 += grow; spare -= grow;
      }
      // what is still spare (two rows' worth or more) becomes the message log under the map:
      // on Lucas's phone in portrait, the 13.4 dp cell's 21 rows leave about 90 dp
      if (spare >= 60 && !hasLog()) {
        panels.push({ name: 'panel: message log (the history under the band\'s rows; a tap opens it all)', x: R.x, y: y0 + mh + 4, w: R.w, h: spare - 4 });
        spare = 0;
      }
    }
  }
  const map = { x: R.x + (R.w - mw) / 2, y: y0, w: mw, h: mh };
  if (flank) {
    panels.push({ name: LOG, x: R.x, y: y0, w: side, h: R.y + R.h - y0 });
    panels.push({ name: INV, x: R.x + R.w - side, y: y0, w: side, h: R.y + R.h - y0 });
  }
  if (G.tray) {
    const want = [];
    if (!hasLog() && tier !== 'phone') want.push(LOG);
    want.push(INV);
    const n = Math.max(1, Math.min(want.length, Math.floor((G.tray.w + 8) / 248)));
    const pw = (G.tray.w - (n - 1) * 8) / n;
    for (let i = 0; i < n; i++) panels.push({ name: want[i], x: G.tray.x + i * (pw + 8), y: G.tray.y, w: pw, h: G.tray.h });
  }
  const glass = bbox([...(G.over ? [] : bands), { x: R.x, y: R.y, w: R.w, h: Math.max(0, R.h) }], 2);
  return { map, bands, panels, glass, whole, cols: T > 0 ? Math.min(80, mw / (a * T)) : 0, rows: T > 0 ? Math.min(21, mh / T) : 0, rows_msg: rowsMsg, spare };
}

// the confirm ring: the strip of the map within `ring` dp of a halo edge
function ringRects(map, P, st) {
  const out = [];
  const m = map, g = st.ring;
  if (m.w <= 0 || m.h <= 0) return out;
  for (const side of ['L', 'R']) {
    const B = P.banks[side];
    const hx0 = B.x0 - st.halo, hx1 = B.x1 + st.halo, hy0 = B.y0 - st.halo;
    // beside the bank (landscape): a vertical strip
    if (side === 'L' && Math.abs(m.x - hx1) < 1 && m.y < B.y1) out.push({ x: m.x, y: Math.max(m.y, hy0), w: g, h: Math.min(m.y + m.h, B.y1) - Math.max(m.y, hy0) });
    if (side === 'R' && Math.abs(m.x + m.w - hx0) < 1 && m.y < B.y1) out.push({ x: m.x + m.w - g, y: Math.max(m.y, hy0), w: g, h: Math.min(m.y + m.h, B.y1) - Math.max(m.y, hy0) });
    // above the bank (portrait): a horizontal strip
    if (m.y + m.h > hy0 - 1 - 21 && m.y + m.h <= hy0 + 1) {
      const x0 = Math.max(m.x, hx0), x1 = Math.min(m.x + m.w, hx1);
      if (x1 > x0) out.push({ x: x0, y: m.y + m.h - g, w: x1 - x0, h: g });
    }
  }
  return out.filter((r) => r.w > 0 && r.h > 0);
}

// The flick legend, the layer name pill and the drawer, all inside the map area, so none of
// them ever covers a key.
function popupsFor(P, fill, st) {
  const pops = [];
  const m = fill.map;
  if (m.w < 2 * 44 + 16 || m.h < 44 + 8) return pops;  // no room inside the map: the legend, pill and drawer are not drawn
  const fl = P.controls.find((c) => c.id === 'flick');
  const flB = P.banks[fl.thumb];
  const NODE = 44, LW = 2 * NODE + 8;
  let lx, ly;
  if (flB.y0 >= m.y + m.h - 1) {                    // bank below the map: the map's bottom edge, over FLICK
    lx = clamp(fl.x + fl.w / 2 - LW / 2, m.x + 4, m.x + m.w - 4 - LW); ly = m.y + m.h - 4 - NODE;
  } else if (flB.x0 >= m.x + m.w - 1) {             // bank to the right: the map's right edge, at FLICK's row
    lx = m.x + m.w - 4 - LW; ly = clamp(fl.y + (fl.h - NODE) / 2, m.y + 4, m.y + m.h - 4 - NODE);
  } else {                                          // bank to the left
    lx = m.x + 4; ly = clamp(fl.y + (fl.h - NODE) / 2, m.y + 4, m.y + m.h - 4 - NODE);
  }
  const mirror = st.hand === 'left';
  const b1 = mirror ? '−95°' : '−85°', b2 = mirror ? '−140°' : '−40°';
  // feedback while the stroke runs; while FLICK is held, and while assigning, the nodes are
  // also targets (hold one to edit its macro, tap one to assign), as today's radial nodes are
  pops.push({ owner: 'flick', label: `flick legend ↑ (${b1}, Kick): feedback while FLICK strokes; a target while FLICK is held or while assigning`, x: r2(lx), y: r2(ly), w: NODE, h: NODE });
  pops.push({ owner: 'flick', label: `flick legend ${mirror ? '↖' : '↗'} (${b2}, second macro): feedback while FLICK strokes; a target while FLICK is held or while assigning`, x: r2(lx + NODE + 8), y: r2(ly), w: NODE, h: NODE });
  // the open layer's name pill: in the map's corner nearest the movement pad, never over a key
  const pw = Math.min(120, m.w - 8), padRight = P.controls.find((c) => c.id === 'pad_centre').thumb === 'R';
  pops.push({ owner: 'pad_centre', label: 'layer name pill (drawn while a layer is up; inside the map, never over keys)', x: r2(padRight ? m.x + m.w - 4 - pw : m.x + 4), y: r2(m.y + m.h - 4 - 24), w: r2(pw), h: 24 });
  // the drawer: 3 columns, min(420, map width - 12) wide, bottom-anchored in the map area;
  // it scrolls, so it needs only two rows of 44 dp items (88 dp) and 200 dp for three columns
  const dw = Math.min(420, m.w - 12), dh = Math.min(352, m.h - 8);
  if (dw >= 200 && dh >= 88) pops.push({ owner: 'world', label: 'drawer: WORLD, GAME, MENU and every layer\'s ALL open here (3 columns on every screen)', x: r2(m.x + (m.w - dw) / 2), y: r2(m.y + m.h - 4 - dh), w: r2(dw), h: r2(dh) });
  return pops;
}

// ---------------------------------------------------------------------------------------
// 10. Desk (mouse and keyboard in use): the same two banks at 40 dp, in the same order,
//     docked side by side and centred directly under the whole level, with keyboard legends.
//     Panels fill the row beside and under the dock.  The cell is capped by its width, so
//     Android's text cells stand taller than tiles; on 21:9 and wider the cap rises to 48 px
//     rather than leave strips wider than a panel beside the map.
//     Desktop mode is being built (Lucas, 2026-10-06 and 2026-10-07; it was deferred from
//     3 October until then): the page asks for the desk when its input switch says a mouse
//     or a touchpad is in use (section 12).  Three things changed for the desk alone, and
//     every result for 'touch' or 'pen' is as it was (checks/same.mjs holds it so):
//     - the cell is whole device pixels (settings.dpr, the page's devicePixelRatio, sections
//       4 and 11): the largest whole device-pixel cell that fits, which the page draws as it
//       is (web.js drawnCell, floor(T x dpr) / dpr).  In whole dp, 1280x800 at dpr 1.25
//       drew 18 device px where 19 fit.  Under the whole level it is the smallest whole
//       device-pixel cell at or over fitFloor (12 dp at dpr 1, 1.25, 1.5 and 2);
//     - a map that pans is never wider than the level (round 2, item 8, as on touch):
//       1280x585 drew a 1264 dp map round a 960 dp level.  It stays centred, so on a short,
//       wide window the log and the inventory may stand beside it;
//     - the arrangement keeps a band (below).
// ---------------------------------------------------------------------------------------

// The desk's band.  The desk's arrangement -- the cell, the header side by side or stacked,
// the log and the inventory beside the map or in the dock row (and in the row each shown or
// not), the key legend in the dock row, under the dock or nowhere -- changed at single
// pixels: the header at 826 dp wide, the panels where the strips beside the map reach 160 dp,
// the legend where 60 dp are left under the dock, the cell at every step, so a window sitting
// on one flipped at every pixel either side.  So it keeps a band of GLASS_BAND dp, as the
// glass does on touch (section 7; Lucas, 2026-10-04).  The page keeps the arrangement it last
// drew (info.desk, given back as settings.prevDesk), and each part of it stays while it still
// fits this window and the rule's own pick at one of the eight windows GLASS_BAND dp away
// chose it, those windows asked with the parts decided before it held at this window's
// (DESK_HELD, where they fit there); otherwise the rule's own pick, given those parts, is
// taken.  The cell is kept while it lies between their cells, and else goes to the nearest
// of them.  Its steps along the height are 21 / dpr dp apart, closer than the band, so a
// window grown taller meets every cell, each GLASS_BAND dp late; taking the rule's own cell
// instead skipped a step or two (12 -> 14 -> 16 dp at 1450 wide) and landed 3 dp past where
// the new cell fits, so a hand that overshot and came back 4 dp changed it again, and the
// panels with it (1760 wide).  While the cell is on its way to the rule's own, a later part
// that is already what the rule's own arrangement here has also stays: with text cells at
// 1040 wide the legend has room in the dock row at the 15 dp cell only, and it came and went
// within that cell's 21 dp.  So a part changes GLASS_BAND dp late on the way up, and on the
// way down where it stops fitting.  A window that also sits within GLASS_BAND dp of the same
// part's step on its other side keeps it while it is dragged along, as the glass does: at
// 1295x720 shrinking, the legend's 'under' waits for the 14 dp cell, because 24 dp shorter
// the 15 dp cell leaves it no room.  Before the windows around were asked with the cell held,
// the panels' band ran 104 to 184 dp wide (1952x780: beside the map at 2136; review of
// 2026-10-07).  The parts are decided in order -- header, cell, panels, legend -- and every
// one is placed by the rule's own geometry, so no key goes anywhere the rule would not put
// one, and a kept arrangement that leaves the desk unusable yields to the rule (layout(),
// section 9).  A prevDesk made at another dpr, cell aspect or key size is ignored, and a first layout keeps
// nothing.
//
// info.desk, which the page keeps and passes back as settings.prevDesk:
//   { dpr, a, k,        the settings it was made at: dpr, cellAspect, deskKey
//     Td, T,            the cell in whole device pixels, and in dp (Td / dpr)
//     sideBySide,       the header's messages and status side by side (else stacked)
//     beside,           the log and the inventory beside the map (else in the dock row,
//                       between the banks, which stand at its edges)
//     log, inv,         each shown in the dock row (both true when beside)
//     legend,           the key legend: 'row' (the dock row's middle; beside only), 'under'
//                       (under the left bank) or 'none'
//     whole }           the whole level shows (derived from the rest; never kept)
const DESK_LEGENDS = ['row', 'under', 'none'];
// the parts each part's band holds at the windows around: those deskPlan decides before it
// and that its fit depends on (the log, the inventory and the legend do not depend on each other)
const DESK_HELD = { sideBySide: [], Td: ['sideBySide'], beside: ['sideBySide', 'Td'], log: ['sideBySide', 'Td', 'beside'], inv: ['sideBySide', 'Td', 'beside'], legend: ['sideBySide', 'Td', 'beside'] };
function deskOf(d, st) {
  if (!d || typeof d !== 'object' || d.dpr !== st.dpr || d.a !== st.cellAspect || d.k !== st.deskKey) return null;
  const b = (v) => (typeof v === 'boolean' ? v : undefined);
  return { Td: Number.isInteger(d.Td) && d.Td > 0 ? d.Td : undefined, sideBySide: b(d.sideBySide), beside: b(d.beside), log: b(d.log), inv: b(d.inv), legend: DESK_LEGENDS.includes(d.legend) ? d.legend : undefined };
}

// The desk's arrangement and geometry at one window.  choose(part, own, fits) returns the
// part to use: the rule's own pick by default, or what the band keeps.
function deskPlan(W, H, M0, st, choose = (part, own) => own) {
  const a = st.cellAspect, dpr = st.dpr;
  const top = 4;
  const rows = st.msgRows.landscape;
  const reasons = [];
  const canSide = W - 8 >= HEADER_SIDE && st.header !== 'stacked';
  const sideBySide = choose('sideBySide', canSide, (v) => !v || canSide);
  const hd = header(4, top, Math.max(1, W - 8), rows, sideBySide ? st : { ...st, header: 'stacked' });
  const mapTop = top + hd.h + 4;
  let M = M0, degraded = false;
  // a window too small for the dock: the dock scales (degraded) rather than leave the screen
  // (the banks at its edges, M.m in, and M.c at least between them)
  {
    const need = 2 * bankWidth(M, M.k) + 2 * M.m + M.c, f = Math.min(1, W / need, Math.max(0.3, (H - mapTop - 12 - 12 - 4 - 60) / M.B));
    if (f < 1) {
      M = { ...M }; for (const key of ['k', 'kR', 'm', 'mb', 'g', 'c', 'u', 'gr', 's']) M[key] *= f; M.B = bankHeight(M);
      degraded = true; reasons.push(`the window is too small for the ${st.deskKey} dp dock; it is scaled to ${r2(f * 100)}%`);
    }
  }
  const dockW = 2 * bankWidth(M, M.k) + M.c, dockH = M.B;
  const availH = Math.max(0, H - mapTop - 12 - dockH - 12 - 4);
  // The cap is on the cell's width, so Android's text cells may stand up to 57 dp tall; on
  // 21:9 and wider, where 32 px tiles would leave strips wider than a panel beside the
  // level, tiles may grow to 48 px (text cells keep their cap).
  let cap = st.deskCellMax / Math.min(1, a);
  if ((W - 16 - 80 * a * cap) / 2 >= 240) cap = Math.max(cap, st.deskWideCellMax);
  // the cell in whole device pixels (the 1e-6: a quotient a rounding error short of whole)
  const fitD = Math.min(Math.floor((W - 16) * dpr / (80 * a) + 1e-6), Math.floor(availH * dpr / 21 + 1e-6));
  const raw = Math.min(fitD, Math.floor(cap * dpr + 1e-6));
  const floorD = Math.ceil(st.fitFloor * dpr - 1e-6);
  const ownWhole = raw / dpr >= st.fitFloor - 1e-9;
  const ownD = ownWhole ? raw : floorD;
  const Td = choose('Td', ownD, (d) => d === floorD || (d > floorD && d <= fitD));
  const whole = Td === ownD ? ownWhole : Td <= fitD;
  const T = Td / dpr;
  // never wider than the level's 80 columns (round 2, item 8), as on touch (fillGlass)
  const mw = Math.max(0, Math.min(W - 16, 80 * a * T)), mh = Math.min(21 * T, availH);
  if (mh < 60) { degraded = true; reasons.push('the map is under 60 dp tall'); }
  const map = { x: (W - mw) / 2, y: mapTop, w: mw, h: mh };
  // The banks stand at the dock row's outer edges, M.m in from the screen's sides, and the
  // log and the inventory between them (Lucas, 2026-10-08: on a touchscreen laptop the edges
  // are where hands reach; "messages and inventory between them, yes ... edges always").
  // The middle starts past the left bank's well (6 dp) and a 12 dp gap.
  const bw = bankWidth(M, M.k), xL = M.m, xR = W - M.m - bw;
  const dy0 = map.y + mh + 12;
  const rowY = dy0, rowH = Math.max(0, H - 4 - rowY);
  const mx0 = xL + bw + 6 + 12, midW = Math.max(0, xR - 6 - 12 - mx0);
  // under the left bank: from the screen's margin to the middle's gap
  const underW = mx0 - 12 - 4, underH = rowH - dockH - 12;
  const underFits = underH >= 60 && underW >= 100;
  const side = map.x - 12 - 4;
  // beside the map, the panels stop over the banks' wells
  const besideH = mh - 6;
  const besideFits = side >= 160 && besideH >= 60;
  const beside = choose('beside', besideFits, (v) => !v || besideFits);
  let log = true, inv = true, legend;
  if (beside) {
    const rowFits = midW >= 160 && rowH >= 60;
    legend = choose('legend', rowFits ? 'row' : underFits ? 'under' : 'none', (v) => v === 'none' || (v === 'row' ? rowFits : underFits));
  } else {
    // the log alone wants 160 dp of the middle; with the inventory, 160 dp each
    const logFits = midW >= 160 && rowH >= 60, invFits = midW >= 2 * 160 + 12 && rowH >= 60;
    log = choose('log', logFits, (v) => !v || logFits);
    inv = choose('inv', invFits, (v) => !v || invFits);
    legend = choose('legend', underFits ? 'under' : 'none', (v) => v === 'none' || (v === 'under' && underFits));
  }
  return {
    desk: { dpr, a, k: st.deskKey, Td, T, sideBySide, beside, log, inv, legend, whole },
    hd, M, degraded, reasons, rows, mapTop, dockW, dockH, T, Td, whole, map, mw, mh, bw, xL, xR, dy0, rowY, rowH, side, besideH, mx0, midW, underW, underH,
  };
}

function deskLayout(W, H, M0, st, table, reasons) {
  const a = st.cellAspect;
  // the band: the rule's own arrangement at the eight windows GLASS_BAND dp away, made only
  // when a part of the last one differs from the rule's own pick here, once for each set of
  // parts held
  const prev = deskOf(st.prevDesk, st);
  // The windows around are asked with the parts already decided here held (DESK_HELD), where
  // they fit there: asked on their own, a window 24 dp taller picks a bigger cell, its map is
  // 80 dp wider, and it kept the panels in the dock row 104 to 184 dp past their step, not 24.
  // A window with no room for the cell held takes its own (a smaller one), or a legend with
  // room at one cell only came and went on the way down (text cells, 1040 wide, dpr 1.25:
  // the 18 device px cell, 659 to 643 tall).
  const here = {}, near = new Map();
  let plain = null;                // the rule's own arrangement here, when it is asked for
  const around = (part) => {
    const held = {};
    for (const p of DESK_HELD[part]) held[p] = here[p];
    const key = JSON.stringify(held);
    if (!near.has(key)) near.set(key, NEAR.map(([dx, dy]) => deskPlan(Math.max(1, W + dx * GLASS_BAND), Math.max(1, H + dy * GLASS_BAND), M0, st, (p, own, fits) => (p in held && fits(held[p]) ? held[p] : own)).desk));
    return near.get(key);
  };
  const keep = (part, own, fits) => {
    const v = prev[part];
    let out = own;
    if (v !== undefined && v !== own && fits(v)) {
      if (part === 'Td') {
        // the kept cell, else the nearest of the cells around (never past the rule's own)
        const ds = around(part).map((d) => d.Td);
        const c = clamp(v, Math.min(...ds), Math.max(...ds));
        if (c >= Math.min(v, own) && c <= Math.max(v, own) && fits(c)) out = c;
      } else if (around(part).some((d) => d[part] === v)) out = v;
      // while the cell is on its way to the rule's own, a part that is already what the
      // rule's own arrangement here has stays so, rather than change and change back
      else if (here.Td !== undefined && here.Td !== (plain || (plain = deskPlan(W, H, M0, st).desk)).Td && plain[part] === v) out = v;
    }
    here[part] = out;
    return out;
  };
  const D = prev ? deskPlan(W, H, M0, st, keep) : deskPlan(W, H, M0, st);
  reasons.push(...D.reasons);
  const { hd, M, map, mw, mh, bw, xL, xR, dy0, dockH, rowY, rowH, T, Td, whole, rows, mapTop } = D;
  const degraded = D.degraded;
  const spans = rowSpans(M);
  const controls = [];
  const banks = {};
  const mirror = st.hand === 'left';
  for (const corner of ['L', 'R']) {
    const content = mirror ? (corner === 'L' ? 'R' : 'L') : corner;
    const x0 = corner === 'L' ? xL : xR;
    banks[corner] = { x0, x1: x0 + bw, y0: dy0, y1: dy0 + dockH, bw, bh: dockH, content };
    table[content].forEach((row, r) => row.forEach((id, c) => {
      const cc = id.startsWith('pad_') && corner === 'R' ? 2 - c : c;
      const inDp = cc * (M.k + M.g);
      const x = corner === 'L' ? x0 + inDp : x0 + bw - inDp - M.k;
      const h = spans[r].h;
      const y = dy0 + dockH - spans[r].up0 - h;
      controls.push({ id, label: LEGEND[id] ? `${LABEL[id]} [${LEGEND[id]}]` : LABEL[id], x: r2(x), y: r2(y), w: r2(M.k), h: r2(h), thumb: corner, kind: id.startsWith('pad_') ? 'pad' : KIND[id] || 'key' });
    }));
  }
  const rest = controls.find((c) => c.id === 'rest');
  controls.push({ ...rest, id: 'longrest', label: 'LONG REST [^;z]', behind: 'rest' });
  const panels = [];
  const LOG = 'panel: message log (history, newest last)', INV = 'panel: inventory (a copy of the INVENTORY list; the key stays in the dock)';
  const LEG = 'panel: key legend (the Ctrl+; prefix routes to layers, drawers, macros, flicks)';
  const { legend } = D.desk;
  const under = { name: LEG, x: 4, y: dy0 + dockH + 12, w: D.underW, h: D.underH };
  if (D.desk.beside) {
    // A level narrower than the screen (text cells on 16:9, any cell on 32:9, a short wide
    // window): the log and the inventory stand beside the map, from its top to the banks'
    // wells under it, and the key legend takes the dock row's middle or the space under the
    // left bank.
    panels.push({ name: LOG, x: 4, y: mapTop, w: D.side, h: D.besideH });
    panels.push({ name: INV, x: map.x + mw + 12, y: mapTop, w: D.side, h: D.besideH });
    if (legend === 'row') panels.push({ name: LEG, x: D.mx0, y: rowY, w: D.midW, h: rowH });
    else if (legend === 'under') panels.push(under);
  } else {
    // the log and the inventory share the middle, the log alone when only it fits
    const shown = [D.desk.log && LOG, D.desk.inv && INV].filter(Boolean);
    const pw = shown.length ? (D.midW - 12 * (shown.length - 1)) / shown.length : 0;
    shown.forEach((name, n) => panels.push({ name, x: D.mx0 + n * (pw + 12), y: rowY, w: pw, h: rowH }));
    if (legend === 'under') panels.push(under);
  }
  const fill = { map, bands: hd.bands, panels, glass: bbox([...hd.bands, map], 2), whole, cols: Math.min(80, mw / (a * T)), rows: Math.min(21, mh / T), rows_msg: rows };
  const P = { banks, controls, bankTop: dy0 };
  const popups = popupsFor(P, fill, st);
  // a well round each bank, as twin banks has
  const decor = ['L', 'R'].map((c) => ({ name: `dock well ${c === 'L' ? 'left' : 'right'}`, ...rnd({ x: banks[c].x0 - 6, y: dy0 - 6, w: bw + 12, h: dockH + 12 }) }));
  const fit = { level: degraded ? 'degraded' : 'full', pad: r2(M.k), padSetting: st.deskKey, rightColumns: r2(M.k), degraded, reasons };
  const spec = {
    W, H, pointer: 'mouse',
    source: `v2 layout(): tier desk, banks ${r2(bw)}x${r2(dockH)} at the dock row's edges, keys ${r2(M.k)} dp with keyboard legends, map cell ${r2(T)} dp${st.dpr !== 1 ? ` (${Td} device px at dpr ${st.dpr})` : ''} (${whole ? 'whole level' : 'pans'}; ${r2(fill.cols)}x${r2(fill.rows)} cells)`,
    controls, glass: rnd(fill.glass), mapArea: rnd(map),
    bands: hd.bands.map((b) => ({ name: b.name, ...rnd(b) })),
    popups, chrome: panels.map((p) => ({ name: p.name, ...rnd(p) })), decor, fit,
  };
  return { spec, degraded, reason: reasons.length ? reasons.join('; ') : null, info: { tier: 'desk', S: Math.min(W, H), L: Math.max(W, H), portrait: H > W, M, banks, G: { kind: 'dock', over: false, hd }, fill, T, DC: { T }, bankTop: dy0, rows, fit, desk: D.desk } };
}

function r2(v) { return Math.round(v * 100) / 100; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function num(v, d) { return typeof v === 'number' && Number.isFinite(v) ? v : d; }
const rnd = (r) => ({ x: r2(r.x), y: r2(r.y), w: r2(r.w), h: r2(r.h) });
const clip = (r, W, H) => {
  const x0 = Math.max(0, r.x), y0 = Math.max(0, r.y), x1 = Math.min(W, r.x + r.w), y1 = Math.min(H, r.y + r.h);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
};
function bbox(rs, pad = 0) {
  const x0 = Math.min(...rs.map((r) => r.x)) - pad, y0 = Math.min(...rs.map((r) => r.y)) - pad;
  const x1 = Math.max(...rs.map((r) => r.x + r.w)) + pad, y1 = Math.max(...rs.map((r) => r.y + r.h)) + pad;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
