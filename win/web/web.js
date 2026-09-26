// Rolehack web front end, test build: a window port for the WebAssembly
// core, drawing the map in tiles (with the paper doll on the hero) or text.
// The core calls nethackCallback(name, ...args) for every window-port
// function in win/shim/winshim.c and waits on the promise it returns, so
// each handler may take as long as the player does.
import createNetHack from './nethack.js';
import { setPalette, dressHero, LOOK_LEN } from './doll.js';

const COLNO = 80, ROWNO = 21;
// CLR_BLACK .. CLR_WHITE; NO_COLOR (8) draws as gray
const COLORS = ['#6f6f6f', '#d8453e', '#46a946', '#b5762a', '#4d74dc', '#b049b0',
                '#3cb1b1', '#c2c2c2', '#c2c2c2', '#ff9a3a', '#6ff06f', '#f3df55',
                '#78a2ff', '#ff78ff', '#72f2f2', '#ffffff'];
const MG_PET = 0x10;
const MENU_ITEMFLAGS_SELECTED = 1;
const ATR = { BOLD: 1, DIM: 2, ULINE: 4, BLINK: 5, INVERSE: 7 };
const CONDITION_NAMES = {
  BAREH: 'Bare', BLIND: 'Blind', BUSY: 'Busy', CONF: 'Conf', DEAF: 'Deaf',
  ELF_IRON: 'Iron', FLY: 'Fly', FOODPOIS: 'FoodPois', GLOWHANDS: 'Glow',
  GRAB: 'Grab', HALLU: 'Hallu', HELD: 'Held', ICY: 'Icy', INLAVA: 'Lava',
  LEV: 'Lev', PARLYZ: 'Parlyz', RIDE: 'Ride', SLEEPING: 'Zzz', SLIME: 'Slime',
  SLIPPERY: 'Slip', STONE: 'Stone', STRNGL: 'Strngl', STUN: 'Stun',
  SUBMERGED: 'Sub', TERMILL: 'TermIll', TETHERED: 'Teth', TRAPPED: 'Trap',
  UNCONSC: 'Out', WOUNDEDL: 'Legs', HOLDING: 'UHold',
};

const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let M;                    // the Emscripten module
let K;                    // nethackGlobal.constants
let G;                    // nethackGlobal.globals
const wins = new Map();   // winid -> { type, lines, menu }
let nextWin = 1;
let grid = blankGrid();
let cursor = { x: -1, y: -1 };
const msgs = [];          // { text, fresh }
const history = [];
const status = {};        // field name -> { text, color }
let condMask = 0;
let promptText = '';
let moreShown = false;
let mode = 'tiles';       // or 'text'
try { mode = localStorage.getItem('rh.mapmode') === 'text' ? 'text' : 'tiles'; } catch (e) { /* none */ }

function blankGrid() {
  return Array.from({ length: ROWNO }, () =>
    Array.from({ length: COLNO }, () => ({ ch: 32, color: 8, flags: 0, tile: -1 })));
}

/* ---------- input ---------- */

const queue = [];
let waiter = null;

function push(ev) {
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
  }
  if (e.key.length !== 1) return null;
  let c = e.key.charCodeAt(0);
  if (e.ctrlKey && /^[a-z]$/i.test(e.key)) return e.key.toUpperCase().charCodeAt(0) & 0x1f;
  if (e.altKey && c < 128) return c | 0x80;   // M- commands
  return c;
}

window.addEventListener('keydown', (e) => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  const k = keyCode(e);
  if (k === null) return;
  e.preventDefault();
  push({ key: k });
});

// a tap or click on the map is a CLICK_1 at that square (travel, in play)
for (const id of ['map', 'tiles']) {
  $(id).addEventListener('pointerup', (e) => {
    const r = $(id).getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / (r.width / COLNO));
    const y = Math.floor((e.clientY - r.top) / (r.height / ROWNO));
    if (x >= 0 && x < COLNO && y >= 0 && y < ROWNO) push({ click: { x, y, mod: 1 } });
  });
}

$('mode').addEventListener('click', () => {
  mode = mode === 'tiles' ? 'text' : 'tiles';
  try { localStorage.setItem('rh.mapmode', mode); } catch (e) { /* none */ }
  fit();
  render();
});

/* ---------- tiles and the paper doll ---------- */

let sheet = null;         // tiles.png
let sheetPx = null;       // its pixels, for the doll
let sheetCols = 40;
const tileCache = new Map();
const dollCache = new Map();
let tileDev = 16;         // a tile's size on the canvas, in device pixels

async function loadTiles() {
  const info = await (await fetch('tiles.json')).json();
  sheetCols = info.cols;
  setPalette(info.palette);
  sheet = new Image();
  sheet.src = 'tiles.png';
  await sheet.decode();
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

const HEART = ['.X.X.', 'XXXXX', '.XXX.', '..X..'];

function renderTiles() {
  const cv = $('tiles'), cx = cv.getContext('2d'), T = tileDev, px = T / 16;
  cx.imageSmoothingEnabled = false;
  cx.fillStyle = '#000';
  cx.fillRect(0, 0, cv.width, cv.height);
  const look = heroLook();
  for (let y = 0; y < ROWNO; y++) {
    for (let x = 0; x < COLNO; x++) {
      const c = grid[y][x];
      if (c.tile < 0) continue;
      // the doll only where the map shows the hero's own base tile, so a
      // polymorph, a steed or a hallucination draws as the map says
      const doll = look && x === look[1] && y === look[2] && c.tile === look[3] ? dollCanvas(look) : null;
      if (doll) cx.drawImage(doll, x * T, y * T, T, T);
      else cx.drawImage(sheet, (c.tile % sheetCols) * 16, Math.floor(c.tile / sheetCols) * 16,
                        16, 16, x * T, y * T, T, T);
      if (c.flags & MG_PET) {
        cx.fillStyle = '#ff3b5c';
        HEART.forEach((row, r) => [...row].forEach((ch, i) => {
          if (ch === 'X') cx.fillRect(x * T + (1 + i) * px, y * T + (1 + r) * px, Math.ceil(px), Math.ceil(px));
        }));
      }
    }
  }
  if (cursor.x >= 0) {
    cx.strokeStyle = '#e0b04a';
    cx.lineWidth = Math.max(1, Math.round(px));
    cx.strokeRect(cursor.x * T + cx.lineWidth / 2, cursor.y * T + cx.lineWidth / 2,
                  T - cx.lineWidth, T - cx.lineWidth);
  }
}

/* ---------- drawing ---------- */

function fit() {
  const w = window.innerWidth - 32, h = window.innerHeight - 70;
  const tiles = mode === 'tiles' && sheet;
  $('map').hidden = tiles;
  $('tiles').hidden = !tiles;
  $('mode').textContent = tiles ? 'Text map' : 'Tile map';
  if (!tiles) {
    // 80 columns at ~0.6em, and 21 map rows plus ~6 lines of text
    const cell = Math.max(9, Math.min(w / (COLNO * 0.6), h / (ROWNO * 1.12 + 6 * 1.25)));
    document.documentElement.style.setProperty('--cell', `${cell.toFixed(2)}px`);
    return;
  }
  // text lines at a readable size; the tiles take what is left, crisp at a
  // multiple of 16 device pixels when one comes close to the largest fit
  const cell = Math.max(11, Math.min(17, w / (COLNO * 0.6)));
  document.documentElement.style.setProperty('--cell', `${cell.toFixed(2)}px`);
  const dpr = window.devicePixelRatio || 1;
  const fitDev = Math.floor(Math.min(w * dpr / COLNO, (h - cell * 1.25 * 6) * dpr / ROWNO));
  const snapped = Math.floor(fitDev / 16) * 16;
  tileDev = Math.max(6, snapped >= 16 && snapped >= fitDev * 0.85 ? snapped : fitDev);
  const cv = $('tiles');
  cv.width = COLNO * tileDev;
  cv.height = ROWNO * tileDev;
  cv.style.width = `${cv.width / dpr}px`;
  cv.style.height = `${cv.height / dpr}px`;
}
window.addEventListener('resize', () => { fit(); render(); });

function render() {
  if (mode === 'tiles' && sheet) renderTiles(); else renderText();
  renderLines();
}

function renderText() {
  const rows = [];
  for (let y = 0; y < ROWNO; y++) {
    let html = '', run = '', runColor = -1;
    const flush = () => {
      if (run) html += `<span style="color:${COLORS[runColor]}">${esc(run)}</span>`;
      run = '';
    };
    for (let x = 0; x < COLNO; x++) {
      const c = grid[y][x];
      const ch = String.fromCharCode(c.ch || 32);
      const special = (x === cursor.x && y === cursor.y) || (c.flags & MG_PET);
      if (special) {
        flush();
        const cls = [x === cursor.x && y === cursor.y ? 'cur' : '', c.flags & MG_PET ? 'pet' : '']
          .join(' ').trim();
        html += `<span class="${cls}" style="color:${COLORS[c.color]}">${esc(ch)}</span>`;
        runColor = -1;
      } else {
        if (c.color !== runColor) { flush(); runColor = c.color; }
        run += ch;
      }
    }
    flush();
    rows.push(html);
  }
  $('map').innerHTML = rows.join('\n');
}

// the message and status lines, under either map
function renderLines() {
  const shown = msgs.slice(-3).map((m) =>
    `<div class="${m.fresh ? '' : 'old'}">${esc(m.text)}</div>`).join('');
  $('msgs').innerHTML = shown
    + (promptText ? `<div id="prompt">${esc(promptText)}</div>` : '')
    + (moreShown ? '<span class="more">--More--</span>' : '');
  $('status').innerHTML = statusHtml();
}

function addMessage(text) {
  msgs.push({ text, fresh: true });
  history.push(text);
  if (msgs.length > 50) msgs.shift();
}

function ageMessages() { for (const m of msgs) m.fresh = false; }

/* ---------- status ---------- */

function field(name) {
  const f = status[name];
  if (!f || !f.text) return '';
  const color = f.color & 0xff;
  const style = color < 16 && color !== 8 ? ` style="color:${COLORS[color]}"` : '';
  return `<span${style}>${esc(f.text)}</span>`;
}

function statusHtml() {
  const t = (n) => (status[n] && status[n].text) || '';
  const conds = Object.entries(K ? K.CONDITION : {})
    .filter(([n, v]) => typeof v === 'number' && n.startsWith('BL_MASK_') && (condMask & v))
    .map(([n]) => CONDITION_NAMES[n.slice(8)] || n.slice(8));
  const line1 = [field('BL_TITLE'),
    `St:${field('BL_STR')} Dx:${field('BL_DX')} Co:${field('BL_CO')} In:${field('BL_IN')} `
    + `Wi:${field('BL_WI')} Ch:${field('BL_CH')}`, field('BL_ALIGN'),
    t('BL_SCORE') ? `S:${field('BL_SCORE')}` : ''].filter(Boolean).join('  ');
  const xp = t('BL_HD') ? `HD:${field('BL_HD')}`
    : `Xp:${field('BL_XP')}${t('BL_EXP') ? '/' + field('BL_EXP') : ''}`;
  const line2 = [field('BL_LEVELDESC'), `$:${field('BL_GOLD')}`,
    `HP:${field('BL_HP')}(${field('BL_HPMAX')})`, `Pw:${field('BL_ENE')}(${field('BL_ENEMAX')})`,
    `AC:${field('BL_AC')}`, xp, t('BL_TIME') ? `T:${field('BL_TIME')}` : '',
    field('BL_HUNGER'), field('BL_CAP'), esc(conds.join(' '))].filter(Boolean).join(' ');
  return `${line1}\n${line2}`;
}

// gold arrives with its map symbol encoded as \GXXXXNNNN; keep the number
const plainGold = (s) => s.replace(/\\G[0-9a-fA-F]{8}:?/, '');

/* ---------- modal windows ---------- */

function openModal(title, bodyHtml, foot) {
  $('modal-title').textContent = title || '';
  $('modal-title').hidden = !title;
  $('modal-body').innerHTML = bodyHtml;
  $('modal-foot').textContent = foot || '';
  $('modal').hidden = false;
}
function closeModal() { $('modal').hidden = true; }

function lineHtml(l) {
  const cls = { [ATR.BOLD]: 'bold', [ATR.DIM]: 'dim', [ATR.ULINE]: 'uline',
                [ATR.INVERSE]: 'inverse' }[l.attr & 0xff] || '';
  return `<div class="${cls}">${esc(l.text) || ' '}</div>`;
}

async function showText(lines, title) {
  openModal(title, lines.map(lineHtml).join(''), 'Space, Enter or Esc to close');
  for (;;) {
    const k = await nextKey();
    if (k === 32 || k === 13 || k === 27) break;
  }
  closeModal();
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

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

  const draw = () => {
    const body = items.map((it, n) => {
      if (!it.selectable) {
        return it.attr ? `<div class="head">${esc(it.text) || ' '}</div>` : lineHtml(it);
      }
      const mark = how === 2 ? (it.selected ? (it.count > 0 ? '#' : '+') : '-') : '-';
      return `<div class="item${it.selected ? ' sel' : ''}" data-n="${n}">`
        + `${esc(String.fromCharCode(it.ch))} ${mark} ${esc(it.text)}</div>`;
    }).join('');
    const foot = how === 0 ? 'Space, Enter or Esc to close'
      : how === 1 ? 'Press a letter or tap an item; Esc to cancel'
      : 'Letters or taps toggle; . selects all, - none; Enter to accept, Esc to cancel';
    openModal(w && w.menu ? w.menu.prompt : '', body, count ? `Count: ${count}` : foot);
    for (const el of $('modal-body').querySelectorAll('.item')) {
      el.addEventListener('click', () => push({ key: items[+el.dataset.n].ch }));
    }
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
    if (k === 13 || k === 32) return finish(0);
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

async function getLine(title, initial = '', datalist = null) {
  const listAttr = datalist ? ' list="extcmds"' : '';
  const options = datalist ? `<datalist id="extcmds">${datalist.map((n) =>
    `<option value="${esc(n)}">`).join('')}</datalist>` : '';
  openModal(title, `<input class="line" id="line" autocomplete="off"${listAttr}>${options}`,
            'Enter to accept, Esc to cancel');
  const input = $('line');
  input.value = initial;
  input.focus();
  const result = await new Promise((resolve) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); resolve(input.value); }
      if (e.key === 'Escape') { e.preventDefault(); resolve(null); }
    });
  });
  input.blur();
  closeModal();
  return result;
}

/* ---------- the window procedures ---------- */

const handlers = {
  shim_init_nhwindows() {},
  shim_player_selection_or_tty() { return true; },   // core asks with menus
  async shim_askname() {
    let name = null;
    while (!name) name = await getLine('Who are you?');
    G.svp.plname = name.slice(0, 31);
  },
  shim_get_nh_event() {},
  async shim_exit_nhwindows(str) {
    if (str) addMessage(str);
    render();
    await syncSaves();
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
    else if (w.type === K.WIN_TYPE.NHW_MESSAGE) ageMessages();
    else w.lines = [];
  },
  async shim_display_nhwindow(win, blocking) {
    const w = wins.get(win);
    if (!w) return;
    if (w.type === K.WIN_TYPE.NHW_MESSAGE) {
      if (blocking && msgs.some((m) => m.fresh)) {
        moreShown = true;
        for (;;) { const k = await nextKey(); if (k === 32 || k === 13 || k === 27) break; }
        moreShown = false;
        ageMessages();
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
  shim_putstr(win, attr, str) {
    const w = wins.get(win);
    if (!w) return;
    if (w.type === K.WIN_TYPE.NHW_MESSAGE) addMessage(str);
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
    w.menu.items.push({
      lo, hi, selectable: !!(lo || hi), ch: ch & 0xff, gch: gch & 0xff, attr, clr, text: str,
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
  shim_cliparound() {},
  shim_update_positionbar() {},
  shim_print_glyph(win, x, y, gi) {
    if (y < 0 || y >= ROWNO || x < 0 || x >= COLNO) return;
    grid[y][x] = { ch: M._web_glyphinfo(gi, 1), color: M._web_glyphinfo(gi, 2) & 15,
                   flags: M._web_glyphinfo(gi, 3), tile: M._web_glyphinfo(gi, 4) };
  },
  shim_raw_print(str) { if (str) addMessage(str); },
  shim_raw_print_bold(str) { if (str) addMessage(str); },
  async shim_nhgetch() {
    const k = await nextKey();
    ageMessages();
    return k;
  },
  async shim_nh_poskey(xp, yp, modp) {
    const ev = await nextInput();
    ageMessages();
    if (ev.click) {
      M.setValue(xp, ev.click.x, 'i16');
      M.setValue(yp, ev.click.y, 'i16');
      M.setValue(modp, ev.click.mod, 'i32');
      return 0;
    }
    return ev.key;
  },
  shim_nhbell() {
    document.body.animate([{ background: '#402020' }, { background: '' }], 150);
  },
  async shim_doprev_message() {
    await showText(history.slice(-60).map((text) => ({ attr: 0, text })), 'Messages');
    return 0;
  },
  async shim_yn_function(query, resp, def) {
    const shown = resp.split('\x1b')[0];
    const allowed = resp.replace('\x1b', '');
    let q = query;
    if (shown) q += ` [${shown}]`;
    if (def) q += ` (${String.fromCharCode(def)})`;
    promptText = q;
    let k;
    for (;;) {
      k = await nextKey();
      if (!allowed) break;
      if (k === 27) {
        k = allowed.includes('q') ? 113 : allowed.includes('n') ? 110 : def;
        break;
      }
      if ((k === 13 || k === 32) && def) { k = def; break; }
      const ch = String.fromCharCode(k);
      if (allowed.includes(ch)) break;
      if (allowed.includes(ch.toLowerCase())) { k = ch.toLowerCase().charCodeAt(0); break; }
    }
    promptText = '';
    ageMessages();
    if (k >= 32 && k < 127) addMessage(`${q} ${String.fromCharCode(k)}`);
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

/* ---------- saves ---------- */

function syncSaves() {
  return new Promise((resolve) => {
    try { M.FS.syncfs(false, (err) => { if (err) console.warn('save sync', err); resolve(); }); }
    catch (e) { console.warn('save sync', e); resolve(); }
  });
}

/* ---------- start ---------- */

try {
  await loadTiles();
} catch (e) {
  console.warn('tiles', e);   // the text map still works
}
fit();
createNetHack({
  preRun: [(mod) => {
    // a generic user name (sysconf GENERICUSERS), so the game asks "Who are
    // you?" instead of calling everyone web_user
    mod.ENV.USER = 'player';
    // libnh's sysconf turns perm_invent on, which needs a side panel this
    // page doesn't have yet; without one every inventory change pops up
    mod.ENV.NETHACKOPTIONS = '!perm_invent,time';
    // saved games live in IndexedDB so they survive a reload
    mod.FS.mkdir('/save');
    mod.FS.mount(mod.IDBFS, {}, '/save');
    mod.addRunDependency('syncfs');
    mod.FS.syncfs(true, (err) => {
      if (err) console.warn('save restore', err);
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
