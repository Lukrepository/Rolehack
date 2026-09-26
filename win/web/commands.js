// Written for Rolehack by Lucas Ruiz, 2026-09-26.
//
// The command vocabulary of the Rolehack interface, as data: a port of
// RhCommands.java (RolehackFront 44a195c).  Keys are in gurrhack's notation --
// ^X control, M-x meta, \e escape, \n return (10), \b DEL (0x7f) -- which
// overlay.js turns into key codes.  Faces name a colour family: G90 (the
// skin's default key), R90 red, A90 amber, OFF90 slate, TEAL, PINK, VIOLET.

export const G90 = 'G90', R90 = 'R90', A90 = 'A90', OFF90 = 'OFF90',
             TEAL = 'TEAL', PINK = 'PINK', VIOLET = 'VIOLET';

const i = (word, key, face = null, altKey = null) => ({ word, key, face, altKey });
const alt = (word, key, altKey) => i(word, key, null, altKey);

const group = (id, title, items) => ({ id, title, items });

export const INVENT = group('invent', 'INVENT', [
  i('Inventory', 'i'), i('By type', 'I'), i('Gems', 'I*'), i('Blessed', 'IB'),
  i('Uncursed', 'IU'), i('Cursed', 'IC'), i('Unknown B/U/C', 'IX'), i('Unpaid', 'Iu'),
  i('Count gold', '$'), i('Adjust letters', 'M-a'), i('Call/name', 'C'), i('Name type', 'M-n'),
]);

export const WEAR = group('wear', 'WEAR', [
  i('Wear armor', 'W'), i('Take off', 'T', OFF90), i('Take off all', 'A', OFF90),
  i('Put on', 'P'), i('Remove', 'R', OFF90),
  i('Worn armor', '['), i('Worn rings', '='), i('Worn amulet', '"'),
]);

export const WEAPON = group('weapon', 'WEAPON', [
  i('Wield', 'w'), i('Unwield', 'w-', OFF90), i('Swap', 'x'),
  i('Two-weapon', 'X', A90), i('Ready quiver', 'Q'),
  i('Wielded', ')'), i('All equipment', '*'), i('Enhance', 'M-e'),
]);

export const DROP = group('drop', 'DROP', [
  i('Drop one', 'd'), i('Drop type', 'D'), i('Pick from menu', 'Dm'), i('Review first', 'Di'),
  i('Blessed', 'DB'), i('Uncursed', 'DU'), i('Cursed', 'DC'), i('Unknown', 'DX'),
  i('Unpaid', 'Du'), i('Drop all', 'Da'), i('Tip container', 'M-T'),
]);

export const FIGHT = group('fight', 'OFFENSE', [
  i('Quiver', 'Q'),
  i('Fight', 'F', R90), i('Kick', '^D', R90), i('Fire', 'f'),
  i('Throw', 't'), i('Zap wand', 'z'), i('Cast spell', 'Z'),
  i('Turn undead', 'M-t'),
]);

export const EQUIP = group('equip', 'EQUIP', [
  i('Wield', 'w'), i('Unwield', 'w-', OFF90), i('Swap', 'x'),
  i('Two-weapon', 'X', A90), i('Ready quiver', 'Q'),
  i('Wear armor', 'W'), i('Take off', 'T', OFF90),
  i('Take off all', 'A', OFF90), i('Put on', 'P'),
  i('Remove', 'R', OFF90),
  i('Inventory', 'i'), i('By type', 'I'), i('Adjust letters', 'M-a'),
  i('Worn armor', '['), i('Worn rings', '='), i('Worn amulet', '"'),
  i('Wielded', ')'), i('All equipment', '*'), i('Enhance', 'M-e'),
  i('Gems', 'I*'), i('Blessed', 'IB'), i('Uncursed', 'IU'), i('Cursed', 'IC'),
  i('Unknown B/U/C', 'IX'), i('Unpaid', 'Iu'), i('Count gold', '$'),
]);

export const USE = group('use', 'USE', [
  i('Eat', 'e'), i('Quaff', 'q'), i('Read', 'r'), i('Apply tool', 'a'),
  i('Zap wand', 'z'), i('Cast spell', 'Z'), i('Dip', 'M-d'), i('Rub', 'M-r'),
  i('Invoke', 'M-i'),
]);

// Intercepted by the overlay; never sent to the core, never pinnable.
export const SEARCH_MODE = i('Search mode', 's+');
export const CASE_TOGGLE = i('Case on/off', '#case');
export const STATUS_TOGGLE = i('Status lines', '#status');
// Web only: the map drawn in tiles or in text.
export const MAP_TOGGLE = i('Tiles / text', '#mapmode');

export const WORLD = group('world', 'WORLD', [
  i('Pick up', ','), i('Open door', 'o'), i('Close door', 'c'), i('Search', 's'),
  SEARCH_MODE,
  i('Rest one', '.'), i('Travel', '_'), i('Go down', '>'), i('Go up', '<'),
  i('Loot box', 'M-l'), i('Force lock', 'M-f'), i('Untrap', 'M-u'), i('Engrave', 'E'),
  i('Chat', 'M-c'), i('Pay bill', 'p'), i('Sacrifice', 'M-o'), i('Sit', 'M-s'),
  i('Jump', 'M-j'), i('Teleport', '^T'), i('Ride', 'M-R'), i('Monster power', 'M-m'),
  i('Wipe face', 'M-w'),
  i('Adjacent trap', '^'), i('Terrain', '\\b'),
]);

export const GAME = group('game', 'GAME', [
  i('All commands', '#'),
  CASE_TOGGLE, STATUS_TOGGLE,
  i('Options', 'O'), i('All options', 'mO'), i('Save', 'S'), i('Help', '?'),
  i('Annotate', 'M-A'), i('Call/name', 'C'), i('Name type', 'M-n'), i('Autopickup', '@'),
  i('Repeat', '^A'), i('Redraw', '^R'), i('Version', 'V'),
  i('Explore mode', 'M-X'), i('Quit', '#'),
  i('Overview', 'M-O'), i('Enhance skills', 'M-e'), i('Discoveries', '\\'), i('Attributes', '^X'),
  i('Genocided', 'M-g'), i('Vanquished', 'M-V'), i('Chronicle', 'v'), i('Conduct', 'M-C'),
  i('Past messages', '^P'), i('Known spells', '+'), i('All equipment', '*'), i('What is', '/'),
  // web only, appended so nothing above moves
  MAP_TOGGLE,
]);

export const WIZ_WORLD = [
  i('Map level', '^F'), i('Detect near', '^E'), i('Create mon', '^G'),
  i('Levelport', '^V'), i('Remake level', '#wizmakemap\\n'),
  i('Where am I', '#wizwhere\\n'), i('Flip level', '#wizfliplevel\\n'),
];

export const WIZ_GAME = [
  i('Wish', '^W'), i('Identify all', '^I'), i('Set intrinsic', '#wizintrinsic\\n'),
  i('Level change', '#levelchange\\n'), i('Polyself', '#polyself\\n'),
  i('Kill monster', '#wizkill\\n'), i('Show stats', '#stats\\n'),
];

export function wizardExtras(groupId) {
  return groupId === 'world' ? WIZ_WORLD : groupId === 'game' ? WIZ_GAME : null;
}

const GROUPS = new Map([INVENT, WEAR, WEAPON, EQUIP, DROP, FIGHT, USE, WORLD, GAME].map((g) => [g.id, g]));
export const groupById = (id) => GROUPS.get(id);

// Hubs.  A tap runs quick, a hold fans the fan, a tap on an open fan opens
// the group's drawer.  fanA0 / fanStep are CSS-convention degrees (0 = east,
// y down, clockwise); leftSide hubs point their hold hint right.
const hub = (o) => o;
export const HUB_ATTACK = hub({ id: 'fight', label: 'OFFENSE', face: R90, quick: i('Inventory', 'i'),
  fan: [], group: FIGHT, fanA0: 0, fanStep: 0, fanRadius: 0, leftSide: true, labelSize: 7 });
export const HUB_DROP = hub({ id: 'drop', label: 'DROP', face: TEAL, quick: i('Drop', 'd'),
  fan: [i('Drop type', 'D'), i('From menu', 'Dm'), i('Review first', 'Di', OFF90)], group: DROP,
  fanA0: -64, fanStep: 32, fanRadius: 110, leftSide: true, labelSize: 10 });
export const HUB_INTERACT = hub({ id: 'apply', label: 'INTERACT', face: G90, quick: i('Apply', 'a'),
  fan: [i('Apply tool', 'a'), i('Sit', 'M-s'), i('Dip', 'M-d'), alt('Engrave', 'E', 'E?')], group: USE,
  fanA0: 258, fanStep: -30, fanRadius: 118, leftSide: false, labelSize: 9.5 });
export const HUB_CONSUME = hub({ id: 'consume', label: 'EAT\nQUAFF\nREAD', face: PINK, quick: i('Eat', 'e'),
  fan: [i('Eat', 'e'), i('Quaff', 'q'), i('Read', 'r')], group: USE,
  fanA0: 200, fanStep: 32, fanRadius: 110, leftSide: false, labelSize: 8 });
export const HUB_EQUIP = hub({ id: 'equip', label: 'INVENTORY', face: G90, quick: i('Inventory', 'i'),
  fan: [], group: EQUIP, fanA0: 0, fanStep: 0, fanRadius: 0, leftSide: false, labelSize: 8.5 });
export const HUBS = [HUB_DROP, HUB_CONSUME, HUB_EQUIP, HUB_ATTACK, HUB_INTERACT];

export const PAD_KEYS = ['y', 'k', 'u', 'h', '', 'l', 'b', 'j', 'n'];
export const PAD_ARROW = ['↖', '↑', '↗', '←', '', '→', '↙', '↓', '↘'];

// OFFENSE's pinnable points' bearings, which are also its radial's and its flick's.
export const ATK_SLOT_BEARING = [-85, -40, 5];
export const ATK_SLOT_RADIUS = 96;
export const ATK_SLOT_DEFAULT = [null, null, null];
// Two nodes: Fight up, Kick up-and-right (Lucas, 2026-09-24).
export const OFFENSE_RADIAL = [i('Fight', 'F', R90), i('Kick', '^D', R90)];

export const EQUIP_SLOT_DEFAULT = ['W', 'P', 'w', 'T', 'R', 'x'];
export const EQUIP_RADIAL = [
  i('Wear', 'W'), i('Off', 'T', OFF90), i('Put on', 'P'),
  i('All off', 'A', OFF90), i('Remove', 'R', OFF90),
];

export const TOP_RIGHT = [
  { label: 'MENU', groupId: 'menu' }, { label: 'WORLD', groupId: 'world' },
  { label: 'GAME', groupId: 'game' }, { label: 'KEYS', groupId: 'keyboard' },
];

export const PRAY = i('Pray', 'M-p', A90);
export const SACRIFICE = i('Sacrifice', 'M-o', A90);
export const PREV_MSGS = i('Msgs', '^P');
export const SEARCH = i('Search', 's');
export const PICKUP = i('Pick up', ',');

// Context actions.  defaultCount > 0 means counted; countKey is where the
// chosen count is stored.
export const COUNT_CHOICES = [1, 5, 10, 20];
export const LONG_COUNT_CHOICES = [100, 200, 300, 400];
const ctx = (id, word, key, defaultCount = 0, altKey = null, holdHint = null,
             countKey = key, counts = COUNT_CHOICES) =>
  ({ id, word, key, defaultCount, altKey, holdHint, countKey, counts });

export const CTX_ATTACK = ctx('attack', 'Attack', 'F');
export const CTX_PICKUP = ctx('pickup', 'Pick up', ',');
export const CTX_DESCEND = ctx('descend', 'Descend', '>');
export const CTX_ASCEND = ctx('ascend', 'Ascend', '<');
export const CTX_OPEN = ctx('open', 'Open door', 'o');
export const CTX_CLOSE = ctx('close', 'Close door', 'c');
export const CTX_LOOT = ctx('loot', 'Loot', 'M-l');
export const CTX_SACRIFICE = ctx('offer', 'Sacrifice', 'M-o');
export const CTX_SEARCH = ctx('search', 'Search', 's', 1);
export const CTX_REST = ctx('rest', 'Rest', '.', 20);
export const CTX_LONG_REST = ctx('longrest', 'Long rest', 's', 200, null, null, 'longrest', LONG_COUNT_CHOICES);
export const CTX_LOOKHERE = ctx('lookhere', 'Look here', ':');
export const CTX_LOOK = ctx('look', 'Look', ':', 0, ';', 'hold · farlook');
export const CTX_CHAT = ctx('chat', 'Chat', 'M-c');
export const CTX_RADIAL = [CTX_ATTACK, CTX_PICKUP, CTX_DESCEND, CTX_LOOKHERE, CTX_CHAT];

export const isCounted = (a) => a.defaultCount > 0;
export const keyWithCount = (a, n) => (n > 1 ? `${n}${a.key}` : a.key);
export const wordWithCount = (a, n) => (n > 1 ? `${a.word} ×${n}` : a.word);

// Pinnable commands: persisted keys become faces again.  Group entries first;
// hub, fan and radial entries overwrite them with their short labels.
const PINNABLE = new Map();
for (const g of GROUPS.values()) for (const it of g.items) PINNABLE.set(it.key, it);
for (const h of HUBS) for (const it of h.fan) PINNABLE.set(it.key, it);
for (const it of EQUIP_RADIAL) PINNABLE.set(it.key, it);
PINNABLE.set('x', i('Swap', 'x'));
PINNABLE.set('X', i('2Weap', 'X'));
PINNABLE.set('W', i('Wear', 'W'));
PINNABLE.set('T', i('Take off', 'T', OFF90));
PINNABLE.set('P', i('Put on', 'P'));
PINNABLE.set('R', i('Remove', 'R', OFF90));
PINNABLE.set('w', i('Wield', 'w'));
for (const k of [SEARCH_MODE.key, CASE_TOGGLE.key, STATUS_TOGGLE.key, MAP_TOGGLE.key]) PINNABLE.delete(k);

export const pinnable = (key) => (key == null ? null : PINNABLE.get(key) || null);
export const isIntercepted = (item) =>
  item === SEARCH_MODE || item === CASE_TOGGLE || item === STATUS_TOGGLE || item === MAP_TOGGLE;

// gurrhack's key notation -> key codes: ^X control, M-x meta, \e escape,
// \n return (10), \b DEL (0x7f).  Cmd.KeySequnece.rebuildSequence(), in JS.
export function keyCodes(seq) {
  const out = [];
  for (let n = 0; n < seq.length; n++) {
    let ch = seq[n];
    if (ch === '^' && seq.length - n >= 2 && seq[n + 1] !== ' ') {
      out.push(seq.charCodeAt(n + 1) & 0x1f);
      n++;
    } else if (ch === 'M' && seq.length - n >= 3 && seq[n + 1] === '-' && seq[n + 2] !== ' ') {
      out.push(seq.charCodeAt(n + 2) | 0x80);
      n += 2;
    } else if (ch === '\\' && seq.length - n >= 2 && 'enb'.includes(seq[n + 1])) {
      out.push({ e: 27, n: 10, b: 0x7f }[seq[n + 1]]);
      n++;
    } else {
      out.push(seq.charCodeAt(n));
    }
  }
  return out;
}
