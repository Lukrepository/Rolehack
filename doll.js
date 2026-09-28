// Written for Rolehack by Lucas Ruiz, 2026-09-26.
//
// The paper doll for the web page: RhDoll.java's drawing, as ported line for
// line to JavaScript for the Dressing Room (RolehackDroid
// tools/dressing-room/template.html @ 459de7f9c), fed by the core's look
// (win/share/rhdoll.c) instead of the Dressing Room's picker.  The section
// between the rules below is that port unchanged: when RhDoll.java changes,
// port the change to the Dressing Room and copy the section here again.

// ---- palette: letters of win/share/monsters.txt, set from tiles.json
const PAL = {};
const fixed = c => (c in PAL ? PAL[c] : 0xff00ff);
export function setPalette(palette) {
  for (const [k, v] of Object.entries(palette)) PAL[k] = parseInt(v.slice(1), 16);
}

// ======================================================================
// ---------------------------------------------------------------- the doll (a port of RhDoll.java)
const TONES = [0xffd6ba, 0xffb691, 0xeca67e, 0xd28e68, 0xb27254, 0x905844, 0x704238, 0x54322e];
const VANILLA_SKIN = 0xffb691;
const HIDE = 0x200, COSTUME = 0x400, DRAGON = 0x800, FRONT = 0x10000;
const PAULDRONS = [
  "4,6,O 5,6,W 3,7,O 4,7,Q 5,7,W 3,8,W",
  "4,5,N 2,6,N 4,6,H 5,6,H 3,7,H 4,7,C 5,7,C 3,8,C",
  "3,5,N 4,5,N 3,6,N 4,6,B 5,6,N 3,7,B 4,7,N 5,7,B 3,8,N",
  "3,4,H 3,5,C 5,5,H 3,6,D 4,6,C 5,6,D 3,7,D 4,7,D 3,8,J",
  "4,6,N 5,6,O 3,7,N 4,7,O 5,7,O 2,8,B 3,8,O 2,9,B",
  "4,5,C 5,5,C 3,6,C 5,6,K 3,7,C 4,7,K 5,7,K 3,8,K",
  "3,3,W 3,4,R 5,4,W 3,5,R 4,5,Q 5,5,R 3,6,Q 4,6,R 5,6,R 3,7,Q 4,7,R 3,8,Q",
  "4,3,B 3,4,B 4,5,B 5,5,E 3,6,E 4,6,E 5,6,E 3,7,E 4,7,B 3,8,E",
  "3,5,G 5,5,G 3,6,F 4,6,F 5,6,F 3,7,F 4,7,G 5,7,F 3,8,F 3,10,G",
  "4,6,H 5,6,H 3,7,H 4,7,H 5,7,K 3,8,H 3,9,G 3,11,G",
];
const PAULDRON_NAMES = ["a dead stud", "sparks", "a mirror plate", "flames", "icicles", "a crescent", "shards", "a lightning bolt", "fangs and a drop", "acid"];
const DARKER_FROM = "NOWHCKBG", DARKER_TO = "OWVCKJEF";
const C_ROBE = 10, C_APRON = 11, C_WRAPPING = 12;
function cape(l, r, hem, x) { return Object.assign({ l, r, hem, fleck: "", trim: "", glint: "", clasp: "", rough: null, check: null, hood: null, collar: null, ragged: false }, x || {}); }
const CAPES = [null,
  cape("O", "F", "G", { fleck: "G" }),
  cape("C", "K", "J", { rough: ["C", "K"] }),
  cape("B", "P", "P", { hood: ["B", "P"] }),
  cape("J", "A", "J", { glint: "N" }),
  cape("K", "J", "J"),
  cape("O", "P", "O", { ragged: true }),
  cape("N", "O", "O", { collar: ["N", "O"], clasp: "D" }),
  cape("A", "A", "P", { trim: "P", clasp: "H" }),
  cape("P", "P", "B", { check: ["P", "B"] }),
];
const HELMS = [null,
  "6,2,J 7,2,C 8,2,K 9,2,J 5,3,J 6,3,C 7,3,K 8,3,K 9,3,J 10,3,A 5,4,J 10,4,J 5,5,J 10,5,J",  // leather hat
  "7,2,B 8,2,P 6,3,N 7,3,B 8,3,P 9,3,P 10,3,A 5,4,J 10,4,J",  // iron skull cap
  "7,1,P 8,1,P 6,2,P 7,2,N 8,2,P 9,2,P 10,2,A 5,3,P 6,3,P 7,3,P 8,3,P 9,3,P 10,3,P 11,3,A",  // hard hat
  "6,1,A 7,1,A 8,1,A 9,1,A 6,2,K 7,2,K 8,2,K 9,2,K 4,3,A 5,3,A 6,3,A 7,3,A 8,3,A 9,3,A 10,3,A 11,3,A",  // fedora
  "8,0,E 7,1,B 8,1,E 6,2,E 7,2,N 8,2,B 9,2,E 5,3,E 6,3,B 7,3,B 8,3,B 9,3,B 10,3,E",  // conical hat
  "6,1,B 7,1,P 8,1,P 9,1,P 6,2,B 7,2,P 8,2,A 9,2,P 10,2,J 11,1,J 12,0,J 6,3,B 7,3,B 8,3,P 9,3,P 10,3,A",  // dented pot
  "7,1,N 8,1,N 6,2,N 7,2,I 8,2,B 9,2,N 10,2,A 6,3,B 7,3,N 8,3,I 9,3,B 10,3,A",  // crystal helmet
  "8,0,D 9,0,D 7,1,I 8,1,D 6,2,P 7,2,N 8,2,P 9,2,P 10,2,A 6,3,N 7,3,P 8,3,P 9,3,P 10,3,A",  // plumed helmet
  "6,2,P 7,2,N 8,2,B 9,2,P 10,2,A 6,3,N 7,3,B 8,3,N 9,3,B 10,3,A",  // etched helmet
  "8,0,H 7,1,H 8,1,H 9,1,H 6,2,P 7,2,N 8,2,P 9,2,P 10,2,A 6,3,N 7,3,P 8,3,P 9,3,P 10,3,A",  // crested helmet
  "6,2,P 7,2,N 8,2,P 9,2,P 10,2,A 6,3,P 7,3,P 8,3,P 9,3,P 10,3,A 6,4,P 7,4,B 8,4,B 9,4,P 6,5,P 9,5,P",  // visored helmet
];
const HELMS_SHORT = [null,
  "5,5,C 6,5,K 7,5,J 4,6,J 5,6,C 6,6,K 7,6,K 8,6,J 4,7,J 8,7,J",  // leather hat
  "5,5,B 6,5,P 7,5,A 4,6,N 5,6,B 6,6,P 7,6,P 8,6,A 4,7,J 8,7,J",  // iron skull cap
  "5,4,P 6,4,P 4,5,P 5,5,N 6,5,P 7,5,P 8,5,A 3,6,P 4,6,P 5,6,P 6,6,P 7,6,P 8,6,P 9,6,A",  // hard hat
  "5,4,A 6,4,A 7,4,A 5,5,K 6,5,K 7,5,K 3,6,A 4,6,A 5,6,A 6,6,A 7,6,A 8,6,A 9,6,A",  // fedora
  "6,2,E 6,3,B 7,3,E 5,4,E 6,4,N 7,4,E 5,5,E 6,5,B 7,5,B 8,5,E 4,6,E 5,6,B 6,6,B 7,6,B 8,6,E",  // conical hat
  "5,5,B 6,5,P 7,5,P 8,5,P 4,6,B 5,6,P 6,6,A 7,6,P 8,6,P 9,6,J 10,5,J 11,4,J",  // dented pot
  "5,5,N 6,5,N 4,6,N 5,6,I 6,6,B 7,6,N 8,6,A",  // crystal helmet
  "6,3,D 5,4,I 6,4,D 5,5,P 6,5,N 7,5,P 8,5,A 4,6,N 5,6,P 6,6,P 7,6,P 8,6,A",  // plumed helmet
  "5,5,P 6,5,N 7,5,B 8,5,A 4,6,N 5,6,B 6,6,N 7,6,B 8,6,A",  // etched helmet
  "6,3,H 5,4,H 6,4,H 5,5,P 6,5,N 7,5,P 8,5,A 4,6,N 5,6,P 6,6,P 7,6,P 8,6,A",  // crested helmet
  "5,5,P 6,5,N 7,5,P 8,5,A 4,6,P 5,6,P 6,6,P 7,6,P 8,6,A 5,7,B 6,7,B 7,7,B",  // visored helmet
];
const HELM_WORDS = [null, "a soft cap with ear flaps", "a skull cap with straps", "a dome with a brim", "a dark crown, a brown band, a wide brim", "a tall cone with a star", "a pot, handle and all", "glass with coloured glints", "a red plume", "etched lines", "a yellow crest", "a visor over the eyes"];
const CAPE_WORDS = [null, "flecked with green", "rough", "the hood up behind the head", "a glossy glint", "plain leather", "the hem in rags", "a tall collar, a red clasp", "trim and a gold clasp", "checked"];
const SHORT_BLADE = 1, SWORD = 2, GREAT_SWORD = 3, AXE = 4, PICK = 5, BLUNT = 6, STAFF = 7, POLE = 8, LAUNCHER = 9, MISSILE = 10, WHIP = 11, HORN = 12, CHAIN = 13;

const S = (...r) => { const o = []; for (let i = 0; i < r.length; i += 3) o.push([r[i], r[i + 1], r[i + 2]]); return o; };
const S_HELMET = S(0, 3, "~~~~~~~~~~", 1, 3, "~~~~~~~~~~", 2, 3, "~~~~lmA~~~", 3, 3, "~~~lmmdA~~");
const S_EYEWEAR = S(4, 5, "dmmmmd");
const S_SUIT = S(7, 5, "lmddmd", 8, 4, "Nlmmmldd", 9, 4, "lAlmmdAd", 10, 6, "lmmd", 11, 6, "mmdd");
const S_SHIRT = S(8, 5, "lmmmmd", 9, 6, "mmmd", 10, 6, "mmmd");
const S_HIDE = S(7, 5, "lmmmmd", 8, 4, "lmlmlmdd", 9, 4, "mAmlmdAd", 10, 6, "lmld", 11, 6, "mlmd");
const BODY_Y = [7, 8, 9, 10, 11], BODY_X0 = [5, 4, 4, 6, 6], BODY_X1 = [10, 11, 11, 9, 9];
const GAP_FILL_ABOVE = 0.5, BLACK_HIDE_ABOVE = 0.55;
const S_CLOAK = S(7, 5, "lmHmmd", 8, 4, "lmmmmmmd", 9, 4, "lmmmmmmd", 10, 5, "mmmAmd", 11, 4, "lmmmAmmd", 12, 4, "lmmmAmmd");
const S_AMULET = S(8, 7, "lm");
const S_SHIELD = S(-2, -1, "lmdA", -1, -1, "mWdA", 0, -1, "mmdA", 1, 0, "dA");   // a shield whose look is not named
// Shields, as the core numbers them (rh_shield_looks[]), full size on every body (Lucas, 2026-09-26)
const SHIELDS = [null,
  S(-2, -1, "CKJA", -1, -1, "KKJA", 0, -1, "KJJA", 1, 0, "JA"),  // wooden shield
  S(-2, -1, "NNNA", -1, -1, "BNGA", 0, -1, "BNGA", 1, 0, "NA"),  // blue and green shield
  S(-2, -1, "KJJA", -1, -1, "PNPA", 0, -1, "NNPA", 1, 0, "PA"),  // white-handed shield
  S(-2, -1, "KKJA", -1, -1, "DADA", 0, -1, "PDPA", 1, 0, "PA"),  // red-eyed shield
  S(-3, -1, "NNNOA", -2, -1, "NPPOA", -1, -1, "NPPOA", 0, -1, "NPPOA", 1, 0, "NPOA", 2, 1, "OA"),  // large shield
  S(-3, 0, "BB", -2, -1, "BKKBA", -1, -1, "BKJBA", 0, -1, "BJJBA", 1, 0, "BBA"),  // large round shield
  S(-2, -1, "NNOA", -1, -1, "NNZA", 0, -1, "NZOA", 1, 0, "OA"),  // polished silver shield
];
const SHIELD_WORDS = [null, "a brown wooden kite", "white rim, blue and green halves", "a white hand on a dark field", "a red eye, a black pupil", "a tall steel tower shield", "round, a blue rim over wood", "mirror-bright silver"];
// Gloves and boots, as the core numbers them (rh_glove_looks[], rh_boot_looks[]): tools/paperdoll/gloves_boots.py
const GLOVE_LOOKS = [null, "J.", "CC", "KJ", "NO"];
// Amulets, as the core numbers them (rh_amulet_looks[]; tools/paperdoll/amulets.py), worn over armour
const AMULET_LOOKS = [null, ".C.C.C.K.", ".C.CHK.K.", ".C..K..K.", ".C.CKK...", ".C.CKJKJJ", "CK.KK....", "C.KKKJ...", ".C.CKK.K.", "CKKKKK.K.", "CKKKAK.K.", "CCKKKJKKJ", "HDH.B...."];
const AMULET_WORDS = [null, "a ring with a hole", "a ball with a glint", "a tall drop", "a small triangle", "a shaded pyramid", "a flat block", "a bowl", "a diamond", "a round block", "a pierced plate", "a shaded cube", "a gold chain, a blue and red gem"];
// an amulet as its look: a gold chain on the collar, the pendant on the chest -- over any armour
function stampAmulet(px, bg, look, a) {
  const st = look.shape("amulet") & 0xff;
  if (look.art("amulet") === ART_AETHIOPICA || st <= 0 || st >= AMULET_LOOKS.length) {
    stamp(px, bg, look.art("amulet") === ART_AETHIOPICA ? S_AETHIOPICA : S_AMULET, a.torso[0], a.torso[1], false, ramp(look.item("amulet"), false));
    return;
  }
  const p = AMULET_LOOKS[st];
  putPx(px, 7 + a.torso[0], 7 + a.torso[1], fixed("H")); putPx(px, 9 + a.torso[0], 7 + a.torso[1], fixed("H"));
  for (let i = 0; i < 9; i++) if (p[i] !== ".") putPx(px, 7 + i % 3 + a.torso[0], 8 + Math.floor(i / 3) + a.torso[1], fixed(p[i]));
}
function amuletShortColour(look) {
  if (look.art("amulet") === ART_AETHIOPICA) return fixed(AETHIOPICA_SHORT);
  const st = look.shape("amulet") & 0xff;
  if (st <= 0 || st >= AMULET_LOOKS.length) return ramp(look.item("amulet"), false)[1];
  const c = [...AMULET_LOOKS[st]].find(ch => ch !== ".");
  return c ? fixed(c) : ramp(look.item("amulet"), false)[1];
}
// Eyewear, as the core numbers it (rh_eyewear_looks[]; tools/paperdoll/eyewear.py)
const EYEWEAR_HUMAN = [null, S(4, 5, "PNBPNB"), S(4, 5, "RQQQQR", 5, 10, "RR", 6, 11, "R"), S(3, 5, "OOOOOO", 4, 5, "OPPPPOP", 5, 10, "P")];
const EYEWEAR_SHORT = [null, S(7, 4, "PNPNB"), S(7, 4, "RQQQR", 8, 9, "R"), S(6, 4, "OOOOO", 7, 4, "OPPPP")];
const EYEWEAR_WORDS = [null, "two glass lenses, a glint in each", "a dark band, its ties trailing", "a thick towel over the eyes and brow"];
function eyewearSprite(look, shortFrame) {
  if (look.art("eyewear") === ART_EYES) return shortFrame ? S_EYES_SHORT : S_EYES;
  const st = look.shape("eyewear") & 0xff, set = shortFrame ? EYEWEAR_SHORT : EYEWEAR_HUMAN;
  return st > 0 && st < set.length ? set[st] : (shortFrame ? S_EYEWEAR_SHORT : S_EYEWEAR);
}
const BOOT_LOOKS = [null, "JK..", "PN..", "KL..", "JJK.", "RFF.", "JJG.", "KKC.", "KKKH", "QRQ.", "OON."];
const GLOVE_WORDS = [null, "worn dark brown", "light tan, a padded cuff", "brown, a dark gauntlet cuff", "white, a long white cuff"];
const BOOT_WORDS = [null, "low: a brown shoe", "low: iron, a glint", "low: brown, tan laces", "tall: brown", "tall: army green, a dark sole", "tall: a green upper, a brown foot", "tall: orange tops", "tall: brown, a gold buckle", "tall: glossy black", "tall: white fur"];
// gloves as their look: the hand colour, the cuff beside each hand (the anchor's, else the pixel above)
function stampGloves(px, bg, look, a, h) {
  const st = look.shape("gloves") & 0xff, g = st > 0 && st < GLOVE_LOOKS.length ? GLOVE_LOOKS[st] : null;
  const hand = g ? fixed(g[0]) : ramp(look.item("gloves"), false)[1];
  for (let i = 0; i + 1 < h.length; i += 2) {
    recolour(px, bg, h[i], h[i + 1], hand);
    if (!g || g[1] === ".") continue;
    const own = a.cuffs && i + 1 < a.cuffs.length;
    recolour(px, bg, own ? a.cuffs[i] : h[i], own ? a.cuffs[i + 1] : h[i + 1] - 1, fixed(g[1]));
  }
}
// boots as their look: each foot's first pixel outer, the rest inner; a tall boot takes the leg row above
function stampBoots(px, bg, look, a) {
  const st = look.shape("boots") & 0xff, b = st > 0 && st < BOOT_LOOKS.length ? BOOT_LOOKS[st] : null;
  const tint = b ? 0 : ramp(look.item("boots"), false)[1];
  a.feetCols.forEach((x, i) => { const first = i === 0 || x !== a.feetCols[i - 1] + 1; recolour(px, bg, x, a.feetRow, b ? fixed(b[first ? 0 : 1]) : tint); });
  if (!b || b[2] === "." || a.feetRow < 1) return;
  const y = a.feetRow - 1, x0 = a.short ? 3 : 4 + a.torso[0], x1 = a.short ? 9 : 11 + a.torso[0];
  let prev = false;
  for (let x = Math.max(0, x0); x <= Math.min(15, x1); x++) {
    const p = px[y * 16 + x], leg = p !== bg && (p & 0xffffff) !== 0;
    if (leg) px[y * 16 + x] = fixed(!prev && b[3] !== "." ? b[3] : b[2]);
    prev = leg;
  }
}
const shieldSprite = look => { const st = look.shape("shield") & 0xff; return st > 0 && st < SHIELDS.length ? SHIELDS[st] : S_SHIELD; };
const S_SHORT_BLADE = S(-3, 0, "N", -2, 0, "O", -1, -1, "KHK");
const S_SWORD = S(-7, 0, "N", -6, 0, "N", -5, 0, "O", -4, 0, "N", -3, 0, "O", -2, 0, "O", -1, -1, "KHK", 1, 0, "J");
const S_GREAT_SWORD = S(-10, 0, "N", -9, 0, "N", -8, 0, "O", -7, 0, "N", -6, 0, "O", -5, 0, "N", -4, 0, "O", -3, 0, "O", -2, -1, "KHK", -1, 0, "J", 1, 0, "J");
const S_AXE = S(-6, -2, "NOJ", -5, -2, "OWJ", -4, -1, "WJ", -3, 0, "J", -2, 0, "J", -1, 0, "J");
const S_PICK = S(-6, -2, "OOJOO", -5, -2, "W.J.W", -4, 0, "J", -3, 0, "J", -2, 0, "J", -1, 0, "J");
const S_BLUNT = S(-6, -1, "lm", -5, -1, "md", -4, 0, "J", -3, 0, "J", -2, 0, "J", -1, 0, "J");
const S_STAFF = S(-8, 0, "K", -7, 0, "J", -6, 0, "J", -5, 0, "J", -4, 0, "J", -3, 0, "J", -2, 0, "J", -1, 0, "J", 1, 0, "J", 2, 0, "J");
const S_POLE = S(-10, 0, "N", -9, 0, "O", -8, -1, "WOW", -7, 0, "J", -6, 0, "J", -5, 0, "J", -4, 0, "J", -3, 0, "J", -2, 0, "J", -1, 0, "J", 1, 0, "J", 2, 0, "J");
const S_LAUNCHER = S(-4, -1, "J", -3, -2, "J", -2, -2, "J", -1, -2, "J", 0, -2, "J", 1, -2, "J", 2, -1, "J");
const S_MISSILE = S(-2, 0, "l", -1, 0, "m");
const S_WHIP = S(1, -1, "J", 2, -2, "J", 3, -2, "J", 3, -1, "J");
const S_HORN = S(-5, 0, "N", -4, 0, "Z", -3, 0, "N", -2, 0, "Z", -1, 0, "N");
// a morning star: a spiked ball on a chain, as vanilla's floor tile draws it (Lucas, 2026-09-26)
const S_CHAIN = S(-8, -3, "d", -7, -3, "lmd", -6, -4, "dmd", -5, -2, "X", -4, -1, "X", -3, 0, "K", -2, 0, "J", -1, 0, "J");
// Artifacts with art of their own (Lucas, 2026-09-26; tools/paperdoll/artgen.py), numbered as
// the core's rh_doll_arts[]: artilist.h's order.
const ART_EYES = 26, ART_MITRE = 27, ART_AETHIOPICA = 33;
const ART_NAMES = [null, "Excalibur", "Stormbringer", "Mjollnir", "Cleaver", "Grimtooth", "Orcrist", "Sting", "Magicbane", "Frost Brand", "Fire Brand", "Dragonbane", "Demonbane", "Werebane", "Grayswandir", "Giantslayer", "Ogresmasher", "Trollsbane", "Vorpal Blade", "Snickersnee", "Sunsword", "Orb of Detection", "Heart of Ahriman", "Sceptre of Might", "Staff of Aesculapius", "Magic Mirror of Merlin", "Eyes of the Overworld", "Mitre of Holiness", "Longbow of Diana", "Master Key of Thievery", "Tsurugi of Muramasa", "Platinum Yendorian Express Card", "Orb of Fate", "Eye of the Aethiopica", "Lapis Philosophorum"];
const ART_WORDS = [null, "a wide gold crossguard, a blue stone", "a black blade with red runes", "a broad silver hammer, lightning sparks", "a great crescent blade and a back spike", "black blade, red warning glow, green edge", "white blade, a light-blue glow, a green elven hilt", "white blade glowing light blue, a green elven hilt", "magenta sparks at the tip, an athame's black hilt", "an ice-blue blade, a frost glint", "a blade of flame", "mirror-bright (it reflects), red wing guard", "all silver, a gold flame on top, a gold collar", "a curved silver blade, a wolfsbane-purple guard", "a curved grey blade, a moonlit glint, a dark hilt", "a broad blade, a heavy guard", "a huge dark-iron head", "spiked iron ball on a chain, dark grey spikes", "two pixels longer, a black hilt", "katana: curved tip, gold tsuba, long grip", "a white-gold blade, a star of light at the tip", "clear glass, a white glint (it gives ESP)", "a red stone cut as a heart", "a gold sceptre, a crown holding a magenta gem", "a staff with a green serpent coiled up it", "a gold hand-mirror, its glass catching light", "lenses that glow gold (Monk)", "a white mitre with a gold cross (Priest)", "a longer silver bow, moon-white glints", "a gold key: bit at the top, the ring below the hand", "long straight blade, a line of blood", "a black card with a platinum edge and a gold chip", "a golden orb (it gives luck)", "a blue eye set in gold (Wizard)", "a unicorn horn banded in gold (Rolehack)"];
const ART_HELD = [null,
  S(-7, 0, "N", -6, 0, "N", -5, 0, "N", -4, 0, "M", -3, 0, "N", -2, 0, "M", -1, -2, "HHBHH", 1, 0, "H"),  // 1 Excalibur
  S(-7, 0, "R", -6, 0, "D", -5, 0, "R", -4, 0, "Q", -3, 0, "D", -2, 0, "R", -1, -1, "QDQ", 1, 0, "D"),  // 2 Stormbringer
  S(-7, -3, "B", -6, -2, "NOO", -5, -2, "OWW", -4, -2, "B.J", -3, 0, "J", -2, 0, "J", -1, 0, "K"),  // 3 Mjollnir
  S(-7, -2, "N.J", -6, -3, "NOOJ", -5, -3, "OWWJW", -4, -2, "W.J", -3, 0, "J", -2, 0, "J", -1, 0, "J"),  // 4 Cleaver
  S(-4, 0, "S", -3, -1, "DR", -2, 0, "G", -1, -1, "RJR"),  // 5 Grimtooth
  S(-7, 0, "N", -6, -1, "BN", -5, 0, "N", -4, -1, "BN", -3, 0, "N", -2, 0, "O", -1, -1, "FGF", 1, 0, "F"),  // 6 Orcrist
  S(-4, 0, "B", -3, -1, "BN", -2, 0, "N", -1, -1, "FGF"),  // 7 Sting
  S(-4, -1, "I.I", -3, 0, "N", -2, 0, "M", -1, -1, "QIQ"),  // 8 Magicbane
  S(-7, 0, "N", -6, -1, "NB", -5, 0, "B", -4, 0, "N", -3, 0, "B", -2, 0, "B", -1, -1, "PBP", 1, 0, "P"),  // 9 Frost Brand
  S(-7, 0, "H", -6, 0, "C", -5, 0, "H", -4, -1, "DC", -3, 0, "D", -2, 0, "D", -1, -1, "RDR", 1, 0, "D"),  // 10 Fire Brand
  S(-7, 0, "N", -6, 0, "N", -5, 0, "N", -4, 0, "N", -3, 0, "M", -2, -2, "D.M.D", -1, -2, "DKKKD", 1, 0, "K"),  // 11 Dragonbane
  S(-7, 0, "H", -6, -1, "NN", -5, -1, "ZZ", -4, 0, "H", -3, 0, "O", -2, 0, "O", -1, 0, "O"),  // 12 Demonbane
  S(-7, -1, "N", -6, -1, "Z", -5, 0, "N", -4, 0, "Z", -3, 0, "N", -2, 0, "Z", -1, -1, "IEI", 1, 0, "I"),  // 13 Werebane
  S(-7, -1, "Z", -6, -1, "Y", -5, 0, "Z", -4, -1, "NZ", -3, 0, "Y", -2, 0, "Z", -1, -1, "TST", 1, 0, "S"),  // 14 Grayswandir
  S(-7, 0, "Z", -6, -1, "YZ", -5, -1, "YO", -4, -1, "YZ", -3, -1, "YO", -2, -1, "YO", -1, -2, "JKKJ", 1, 0, "K"),  // 15 Giantslayer
  S(-7, -1, "YYW", -6, -1, "WWS", -5, -1, "WSS", -4, 0, "J", -3, 0, "J", -2, 0, "J", -1, 0, "J"),  // 16 Ogresmasher
  S(-9, -3, "S", -8, -4, "ZYX", -7, -5, "SYXWS", -6, -4, "XWW", -5, -3, "S.X", -4, -1, "X", -3, 0, "K", -2, 0, "J", -1, 0, "J"),  // 17 Trollsbane
  S(-9, 0, "N", -8, 0, "M", -7, 0, "N", -6, 0, "M", -5, 0, "N", -4, 0, "M", -3, 0, "N", -2, 0, "M", -1, -1, "SQS", 1, 0, "S"),  // 18 Vorpal Blade
  S(-7, 1, "N", -6, 0, "N", -5, 0, "O", -4, 0, "N", -3, 0, "O", -2, 0, "N", -1, -1, "AHA", 1, 0, "R", 2, 0, "N"),  // 19 Snickersnee
  S(-8, 0, "H", -7, -1, "HNH", -6, 0, "H", -5, 0, "N", -4, 0, "H", -3, 0, "H", -2, 0, "N", -1, -1, "CHC", 1, 0, "H"),  // 20 Sunsword
  S(-3, -2, "NB", -2, -3, "BBP", -1, -2, "PE"),  // 21 Orb of Detection
  S(-3, -3, "D.D", -2, -3, "DCD", -1, -2, "D"),  // 22 Heart of Ahriman
  S(-8, -1, "H.H", -7, -1, "HIH", -6, 0, "H", -5, 0, "H", -4, 0, "H", -3, 0, "H", -2, 0, "H", -1, 0, "K"),  // 23 Sceptre of Might
  S(-8, -1, "GK", -7, 0, "G", -6, 0, "JG", -5, 0, "G", -4, -1, "GJ", -3, 0, "G", -2, 0, "JG", -1, 0, "J", 1, 0, "J", 2, 0, "J"),  // 24 Staff of Aesculapius
  S(-5, -1, "H", -4, -2, "HBH", -3, -2, "HNH", -2, -1, "H", -1, 0, "H"),  // 25 Magic Mirror of Merlin
  null,  // 26 Eyes of the Overworld (worn)
  null,  // 27 Mitre of Holiness (worn)
  S(-5, -1, "N", -4, -2, "Z", -3, -2, "Z", -2, -2, "N", -1, -2, "Z", 0, -2, "Z", 1, -2, "Z", 2, -2, "N", 3, -1, "Z"),  // 28 Longbow of Diana
  S(-5, 0, "H", -4, -1, "HH", -3, -1, "HH", -2, 0, "H", -1, 0, "K", 1, -1, "H.H", 2, 0, "H"),  // 29 Master Key of Thievery
  S(-10, 0, "N", -9, 0, "O", -8, 0, "D", -7, 0, "N", -6, 0, "O", -5, 0, "D", -4, 0, "N", -3, 0, "O", -2, -1, "AHA", -1, 0, "R", 1, 0, "R"),  // 30 Tsurugi of Muramasa
  S(-4, -3, "ZNN", -3, -3, "RRS", -2, -3, "HRR", -1, -3, "QQR"),  // 31 Platinum Yendorian Express Card
  S(-3, -2, "NH", -2, -3, "HHK", -1, -2, "KJ"),  // 32 Orb of Fate
  null,  // 33 Eye of the Aethiopica (worn)
  S(-5, 0, "H", -4, 0, "N", -3, 0, "H", -2, 0, "N", -1, 0, "H"),  // 34 Lapis Philosophorum
];
const ART_MITRE_HUMAN = "7,0,N 8,0,M 6,1,N 7,1,H 8,1,N 9,1,M 6,2,H 7,2,H 8,2,H 9,2,H 5,3,N 6,3,N 7,3,H 8,3,N 9,3,M 10,3,A";
const ART_MITRE_SHORT = "6,2,N 5,3,N 6,3,H 7,3,M 5,4,H 6,4,H 7,4,H 5,5,N 6,5,H 7,5,M 4,6,N 5,6,N 6,6,H 7,6,N 8,6,M";
const S_EYES = S(4, 5, "AHNHNA"), S_EYES_SHORT = S(7, 4, "HNHNH");
const S_AETHIOPICA = S(8, 6, "HEH"), AETHIOPICA_SHORT = "E";
const S_HELMET_SHORT = S(0, 2, "~~~~~~~~~", 1, 2, "~~~~~~~~~", 2, 2, "~~~~~~~~~", 3, 2, "~~~~~~~~~", 4, 2, "~~~~~~~~~", 5, 2, "~~~lmA~~~", 6, 2, "~~lmmdA~~", 7, 4, "~...~");
const S_EYEWEAR_SHORT = S(7, 4, "dmmmd");
const S_FRONT_SHORT = S(9, 3, "lmmmmmd", 10, 3, "lAmmmAd", 11, 5, "mmm", 12, 4, "lmmmd");
const S_ROBE = S(7, 5, "CCJKKK", 8, 4, "CCCJKKKK", 9, 4, "CACJKKAK", 10, 5, "CCJKKK", 11, 4, "CCCJKKKK", 12, 4, "CCCJKKKK");
const S_ROBE_SHORT = S(9, 3, "CCJKKKK", 10, 3, "CAJKKAK", 11, 5, "CJK", 12, 4, "CCJKK");
const S_APRON = S(7, 6, "F..R", 8, 6, "FFFR", 9, 6, "FFFR", 10, 6, "FFFR", 11, 6, "FFFR", 12, 6, "FFFR");
const S_APRON_SHORT = S(9, 5, "FFR", 10, 5, "FFR", 11, 5, "FFR", 12, 5, "FFR");
const SHORT_Y = [9, 10, 11], SHORT_X0 = [3, 3, 5], SHORT_X1 = [9, 9, 7];
const S_HELD = S(-2, -1, "lm", -1, -1, "md");
// what the hand holds: an artifact's own art once its name is known, else its family's
function heldSprite(look, slot) {
  const art = look.art(slot), s = art > 0 && art < ART_HELD.length ? ART_HELD[art] : null;
  return s || weaponSprite(look.shape(slot));
}
function weaponSprite(shape) {
  switch (shape & 0xff) {
    case SHORT_BLADE: return S_SHORT_BLADE; case SWORD: return S_SWORD; case GREAT_SWORD: return S_GREAT_SWORD;
    case AXE: return S_AXE; case PICK: return S_PICK; case BLUNT: return S_BLUNT; case STAFF: return S_STAFF;
    case POLE: return S_POLE; case LAUNCHER: return S_LAUNCHER; case MISSILE: return S_MISSILE;
    case WHIP: return S_WHIP; case HORN: return S_HORN; case CHAIN: return S_CHAIN; default: return S_HELD;
  }
}

const keeps = (a, x, y) => { for (let i = 0; i + 1 < a.keep.length; i += 2) if (a.keep[i] === x && a.keep[i + 1] === y) return true; return false; };
const putPx = (px, x, y, col) => { if (x >= 0 && x < 16 && y >= 0 && y < 16) px[y * 16 + x] = col; };
function capePx(px, bg, x, y, col, overShadow) {
  if (x < 0 || x >= 16 || y < 0 || y >= 16) return;
  const p = px[y * 16 + x];
  if (p === bg || (overShadow && p === 0)) px[y * 16 + x] = col;
}
function recolour(px, bg, x, y, col) {
  if (x < 0 || x >= 16 || y < 0 || y >= 16) return;
  const p = px[y * 16 + x];
  if (p === bg || p === 0) return;
  px[y * 16 + x] = col;
}
function stamp(px, bg, s, ox, oy, mirror, ramp) {
  for (const [ys, x0, row] of s) for (let i = 0; i < row.length; i++) {
    const c = row[i]; if (c === ".") continue;
    const dx = x0 + i, x = ox + (mirror ? -dx : dx), y = oy + ys;
    if (x < 0 || x >= 16 || y < 0 || y >= 16) continue;
    px[y * 16 + x] = c === "~" ? bg : c === "l" ? ramp[0] : c === "m" ? ramp[1] : c === "d" ? ramp[2] : fixed(c);
  }
}
function stampKeep(px, s, a, ramp) {
  for (const [y, x0, row] of s) for (let i = 0; i < row.length; i++) {
    const c = row[i], x = x0 + i;
    if (c === "." || keeps(a, x, y)) continue;
    putPx(px, x, y, c === "l" ? ramp[0] : c === "m" ? ramp[1] : c === "d" ? ramp[2] : fixed(c));
  }
}
const mix = (c, to, f) => {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, R = (to >> 16) & 255, G = (to >> 8) & 255, B = to & 255;
  return (Math.round(r + (R - r) * f) << 16) | (Math.round(g + (G - g) * f) << 8) | Math.round(b + (B - b) * f);
};
const TINT = new Map();
function tint(item) {
  if (TINT.has(item.id)) return TINT.get(item.id);
  const px = item.pxa, bg = px[0], n = new Map(); let best = 0x808080, bestN = 0;
  for (const p of px) {
    if (p === bg || ((p >> 16) & 255) + ((p >> 8) & 255) + (p & 255) < 90) continue;
    const v = (n.get(p) || 0) + 1; n.set(p, v);
    if (v > bestN) { bestN = v; best = p; }
  }
  TINT.set(item.id, best); return best;
}
function ramp(item, large) {
  const c = tint(item);
  return large ? [c, mix(c, 0, 0.2), mix(c, 0, 0.5)] : [mix(c, 0xffffff, 0.45), c, mix(c, 0, 0.45)];
}
function shoulderRow(it) {
  const ibg = it[0];
  for (let y = 0; y < 16; y++) { let n = 0; for (let x = 3; x <= 12; x++) if (it[y * 16 + x] !== ibg) n++; if (n >= 6) return y; }
  return -1;
}
function gapFill(it, sy) {
  const ibg = it[0], n = new Map(); let fill = 0, best = 0;
  for (let y = sy; y < 16; y++) for (let x = 8; x < 16; x++) {
    const c = it[y * 16 + x]; if (c === ibg || c === 0) continue;
    const v = (n.get(c) || 0) + 1; n.set(c, v);
    if (v > best) { best = v; fill = c; }
  }
  return fill;
}
function hideRamp(item) {
  const it = item.pxa, ibg = it[0]; let drawn = 0, black = 0;
  for (const p of it) { if (p === ibg) continue; drawn++; if (p === 0) black++; }
  if (drawn > 0 && black > BLACK_HIDE_ABOVE * drawn) return [0x6c91b6, 0x363636, 0x121212];
  return ramp(item, false);
}
function stampLegs(px, bg, a, it, sy, fill, two) {
  if (a.feetRow < 0) return;
  for (let Y = 12 + a.torso[1]; Y < a.feetRow; Y++) {
    const yf = Y - a.torso[1], fy = sy + 2 + ((yf - 12) % 3 + 3) % 3;
    for (let xf = 4; xf <= 11; xf++) {
      const X = xf + a.torso[0]; if (X < 0 || X >= 16 || Y < 0 || Y >= 16) continue;
      const p = px[Y * 16 + X]; if (p === bg || p === 0) continue;
      if (two) px[Y * 16 + X] = two[(xf + yf) % 2];
      else if (fy >= 0 && fy < 16) { const c = it[fy * 16 + xf]; if (c !== it[0]) px[Y * 16 + X] = c; else if (fill) px[Y * 16 + X] = fill; }
    }
  }
}
function stampBody(px, bg, look, slot, a, fallback) {
  const pants = slot === "suit", item = look.item(slot);
  if (look.shape(slot) & HIDE) {
    const r = hideRamp(item); stamp(px, bg, S_HIDE, a.torso[0], a.torso[1], false, r);
    if (pants) stampLegs(px, bg, a, null, -1, 0, r); return;
  }
  const it = item.pxa, sy = shoulderRow(it);
  if (sy < 0) {
    const r = ramp(item, true); stamp(px, bg, fallback, a.torso[0], a.torso[1], false, r);
    if (pants) stampLegs(px, bg, a, null, -1, 0, [r[1], r[1]]); return;
  }
  const ibg = it[0], gaps = []; let cells = 0;
  for (let r = 0; r < BODY_Y.length; r++) {
    const y = BODY_Y[r], fy = sy + 1 + (y - 7);
    for (let x = BODY_X0[r]; x <= BODY_X1[r]; x++) {
      const X = x + a.torso[0], Y = y + a.torso[1], inside = X >= 0 && X < 16 && Y >= 0 && Y < 16;
      if (y === 9 && (x === 5 || x === 10)) { if (inside) px[Y * 16 + X] = 0; continue; }
      cells++;
      const c = fy >= 0 && fy < 16 ? it[fy * 16 + x] : ibg;
      if (c !== ibg) { if (inside) px[Y * 16 + X] = c; } else if (inside) gaps.push(Y * 16 + X);
    }
  }
  const fill = gaps.length > GAP_FILL_ABOVE * cells ? gapFill(it, sy) : 0;
  if (fill) for (const g of gaps) px[g] = fill;
  if (pants) stampLegs(px, bg, a, it, sy, fill, null);
}
function stampBodyShort(px, bg, look, slot, a, pants) {
  const item = look.item(slot); let two = null, sy = -1, it = null, ibg = 0;
  if (look.shape(slot) & HIDE) { const r = hideRamp(item); two = [r[0], r[1]]; }
  else { it = item.pxa; ibg = it[0]; sy = shoulderRow(it); }
  if (!two && sy < 0) { const r = ramp(item, true); two = [r[1], r[1]]; }
  const gaps = []; let cells = 0;
  for (let r = 0; r < SHORT_Y.length; r++) {
    const y = SHORT_Y[r];
    for (let x = SHORT_X0[r]; x <= SHORT_X1[r]; x++) {
      if (keeps(a, x, y)) continue;
      if (y === 10 && (x === 4 || x === 8)) { px[y * 16 + x] = 0; continue; }
      cells++;
      if (two) { px[y * 16 + x] = two[(x + y) % 2]; continue; }
      const fy = sy + 2 + (y - 9), c = fy < 16 ? it[fy * 16 + x + 1] : ibg;
      if (c !== ibg) px[y * 16 + x] = c; else gaps.push(y * 16 + x);
    }
  }
  const fill = !two && gaps.length > GAP_FILL_ABOVE * cells ? gapFill(it, sy) : 0;
  if (fill) for (const g of gaps) px[g] = fill;
  if (!pants) return;
  for (let x = 4; x <= 8; x++) {
    const p = px[12 * 16 + x]; if (p === bg || p === 0) continue;
    if (two) px[12 * 16 + x] = two[(x + 12) % 2];
    else { const c = sy + 2 < 16 ? it[(sy + 2) * 16 + x + 1] : ibg; if (c !== ibg) px[12 * 16 + x] = c; else if (fill) px[12 * 16 + x] = fill; }
  }
}
function stampHelmet(px, bg, look, a) {
  const mitre = look.art("helmet") === ART_MITRE;
  const st = look.shape("helmet") & 0xff, set = a.short ? HELMS_SHORT : HELMS;
  if (!mitre && (st <= 0 || st >= set.length)) {
    if (a.short) stamp(px, bg, S_HELMET_SHORT, 0, 0, false, ramp(look.item("helmet"), false));
    else stamp(px, bg, S_HELMET, a.head[0], a.head[1], false, ramp(look.item("helmet"), false));
    return;
  }
  const dx = a.short ? 0 : a.head[0], dy = a.short ? 0 : a.head[1];
  if (a.short) {
    for (let y = 0; y <= 6; y++) for (let x = 2; x <= 10; x++) px[y * 16 + x] = bg;
    putPx(px, 4, 7, bg); putPx(px, 8, 7, bg);
  } else for (let y = 0; y <= 3; y++) for (let x = 3; x <= 12; x++) if (!keeps(a, x + dx, y + dy)) putPx(px, x + dx, y + dy, bg);
  const spec = mitre ? (a.short ? ART_MITRE_SHORT : ART_MITRE_HUMAN) : set[st];
  for (const p of spec.split(" ")) { const [x, y, c] = p.split(","); putPx(px, +x + dx, +y + dy, fixed(c)); }
}
function stampPauldrons(px, dragon, a) {
  if (dragon < 0 || dragon >= PAULDRONS.length) return;
  for (const p of PAULDRONS[dragon].split(" ")) {
    const [xs, ys, c] = p.split(","), x = +xs, y = +ys, d = DARKER_FROM.indexOf(c), cr = d >= 0 ? DARKER_TO[d] : c;
    if (a.short) { putPx(px, x - 1, y + 2, fixed(c)); putPx(px, 13 - x, y + 2, fixed(cr)); }
    else { putPx(px, x + a.torso[0], y + a.torso[1], fixed(c)); putPx(px, 15 - x + a.torso[0], y + a.torso[1], fixed(cr)); }
  }
}
const capeStyle = look => { const st = look.shape("cloak") & 0xff; return st > 0 && st < CAPES.length ? CAPES[st] : null; };
function stampCape(px, bg, a, r) {
  const bottom = a.feetRow >= 0 ? a.feetRow : 13 + a.torso[1];
  for (let y = 7 + a.torso[1]; y <= bottom; y++) { capePx(px, bg, 3 + a.torso[0], y, r[0], false); capePx(px, bg, 12 + a.torso[0], y, r[2], true); }
  for (let y = bottom - 1; y <= bottom; y++) { capePx(px, bg, 2 + a.torso[0], y, r[1], false); capePx(px, bg, 13 + a.torso[0], y, r[2], true); }
}
function stampCapeShort(px, bg, r) {
  for (let y = 9; y <= 13; y++) { capePx(px, bg, 2, y, r[0], false); capePx(px, bg, 10, y, r[2], true); }
  for (let y = 12; y <= 13; y++) { capePx(px, bg, 1, y, r[1], false); capePx(px, bg, 11, y, r[2], true); }
}
function stampCloakBehind(px, bg, look, a) {
  const st = capeStyle(look);
  if (!st) { const r = ramp(look.item("cloak"), true); if (a.short) stampCapeShort(px, bg, r); else stampCape(px, bg, a, r); return; }
  let lx, rx, top, bottom, hy, hx0, hx1;
  if (a.short) { lx = 2; rx = 10; top = 9; bottom = 13; hy = 2; hx0 = 3; hx1 = 9; }
  else { lx = 3 + a.torso[0]; rx = 12 + a.torso[0]; top = 7 + a.torso[1]; bottom = a.feetRow >= 0 ? a.feetRow : 13 + a.torso[1]; hy = 1 + a.head[1]; hx0 = 5 + a.head[0]; hx1 = 10 + a.head[0]; }
  for (let y = top; y <= bottom; y++) {
    let cl = st.l, cr = st.r;
    if (st.rough) cl = st.rough[y % 2];
    if (st.check) { cl = st.check[y % 2]; cr = st.check[(y + 1) % 2]; }
    if (st.fleck && y % 3 === 0) cl = st.fleck;
    if (st.ragged && y === bottom && y % 2 === 1) continue;
    capePx(px, bg, lx, y, fixed(cl), false); capePx(px, bg, rx, y, fixed(cr), true);
  }
  for (let y = bottom - 1; y <= bottom; y++) {
    if (st.ragged && y === bottom) continue;
    capePx(px, bg, lx - 1, y, fixed(st.hem), false); capePx(px, bg, rx + 1, y, fixed(st.r === "A" ? st.l : st.hem), true);
  }
  if (st.trim) for (let y = top; y <= bottom; y++) { capePx(px, bg, lx - 1, y, fixed(st.trim), false); capePx(px, bg, rx + 1, y, fixed(st.trim), true); }
  if (st.glint && top + 2 < 16 && lx >= 0 && px[(top + 2) * 16 + lx] === fixed(st.l)) px[(top + 2) * 16 + lx] = fixed(st.glint);
  if (st.hood) {
    const hoodY = a.short ? 4 : hy, hoodLen = a.short ? 3 : 5;
    for (let x = hx0 + 1; x < hx1; x++) capePx(px, bg, x, hoodY, fixed(2 * x < hx0 + hx1 ? st.hood[0] : st.hood[1]), false);
    for (let y = hoodY + 1; y <= hoodY + hoodLen; y++) { capePx(px, bg, hx0, y, fixed(st.hood[0]), false); capePx(px, bg, hx1, y, fixed(st.hood[1]), true); }
  }
  if (st.collar) {
    const cy = hy + 3;
    capePx(px, bg, hx0 - 1, cy, fixed(st.collar[0]), false); capePx(px, bg, hx0, cy + 1, fixed(st.collar[0]), false); capePx(px, bg, hx0, cy + 2, fixed(st.collar[0]), false);
    capePx(px, bg, hx1 + 1, cy, fixed(st.collar[1]), true); capePx(px, bg, hx1, cy + 1, fixed(st.collar[1]), true); capePx(px, bg, hx1, cy + 2, fixed(st.collar[1]), true);
  }
}
function stampCloakFront(px, bg, look, a) {
  const st = look.shape("cloak") & 0xff, dx = a.short ? 0 : a.torso[0], dy = a.short ? 0 : a.torso[1];
  const bottom = a.feetRow >= 0 ? a.feetRow - 1 : 12 + dy;
  if (st === C_WRAPPING) {
    const top = a.short ? 9 : 7 + dy;
    for (let y = top; y <= bottom && y < 16; y++) for (let x = 0; x < 16; x++) {
      if (keeps(a, x, y) || (!a.short && (x < 3 + dx || x > 12 + dx))) continue;
      const p = px[y * 16 + x]; if (p === bg || p === 0) continue;
      px[y * 16 + x] = fixed(y % 2 === 1 ? "N" : "O");
    }
    const spots = a.short ? [5, 10, 7, 12] : [6 + dx, 9 + dy, 9 + dx, 11 + dy];
    for (let i = 0; i < spots.length; i += 2) {
      const x = spots[i], y = spots[i + 1];
      if (x >= 0 && x < 16 && y >= 0 && y < 16 && (px[y * 16 + x] === fixed("N") || px[y * 16 + x] === fixed("O"))) px[y * 16 + x] = fixed("D");
    }
    return;
  }
  const s = st === C_ROBE ? (a.short ? S_ROBE_SHORT : S_ROBE) : st === C_APRON ? (a.short ? S_APRON_SHORT : S_APRON) : null;
  if (!s) { const r = ramp(look.item("cloak"), true); if (a.short) stampKeep(px, S_FRONT_SHORT, a, r); else stamp(px, bg, S_CLOAK, a.torso[0], a.torso[1], false, r); return; }
  for (const [ys, x0, row] of s) for (let i = 0; i < row.length; i++) {
    const c = row[i], x = x0 + i + dx, y = ys + dy;
    if (c === "." || keeps(a, x, y) || (y > bottom && a.feetRow >= 0)) continue;
    putPx(px, x, y, fixed(c));
  }
}
function dressHuman(px, bg, look, a, skin, tile) {
  // first, before any layer: the tile's off-hand pose gives way to a shield or a second weapon
  if (look.draws("shield") || look.has("offhand"))
    for (let i = 0; i + 2 < a.offPose.length; i += 3) { const c = a.offPose[i + 2]; putPx(px, a.offPose[i], a.offPose[i + 1], c === "~" ? bg : c === "L" ? skin : fixed(c)); }
  const front = look.has("cloak") && (look.shape("cloak") & FRONT) !== 0;
  const capeOn = look.draws("cloak") && !front, covered = look.has("suit") || front;
  if (capeOn) stampCloakBehind(px, bg, look, a);
  if (look.draws("shirt") && !covered) stampBody(px, bg, look, "shirt", a, S_SHIRT);
  if (look.draws("suit")) stampBody(px, bg, look, "suit", a, S_SUIT);
  // a front garment the tile itself wears (the Apothecary's smock, a Priest's robe) goes back over the armour
  if (look.draws("suit") && front && (look.shape("cloak") & COSTUME))
    for (let y = 7; y <= 11; y++) for (let x = 6; x <= 9; x++) { const X = x + a.torso[0], Y = y + a.torso[1]; if (X >= 0 && X < 16 && Y >= 0 && Y < 16) px[Y * 16 + X] = tile[Y * 16 + X]; }
  if (look.draws("cloak") && front) stampCloakFront(px, bg, look, a);
  if (capeOn) { const st = capeStyle(look), clasp = st === null ? "H" : st.clasp; if (clasp) putPx(px, 7 + a.torso[0], 7 + a.torso[1], fixed(clasp)); }
  if (look.draws("suit") && (look.shape("suit") & DRAGON)) stampPauldrons(px, (look.shape("suit") >> 12) & 0xf, a);
  if (look.draws("amulet")) stampAmulet(px, bg, look, a);   // over any armour (Lucas)
  if (look.draws("boots") && a.feetRow >= 0) stampBoots(px, bg, look, a);
  if (look.draws("gloves")) stampGloves(px, bg, look, a, a.hands || [a.main[0], a.main[1], a.off[0], a.off[1]]);
  if (look.draws("helmet")) stampHelmet(px, bg, look, a);
  if (look.draws("eyewear")) stamp(px, bg, eyewearSprite(look, false), a.head[0], a.head[1], false, ramp(look.item("eyewear"), false));
  if (look.draws("shield")) stamp(px, bg, shieldSprite(look), a.off[0], a.off[1], false, ramp(look.item("shield"), false));
  if (look.has("weapon")) stamp(px, bg, heldSprite(look, "weapon"), a.main[0], a.main[1], false, ramp(look.item("weapon"), false));
  if (look.has("offhand")) stamp(px, bg, heldSprite(look, "offhand"), a.off[0], a.off[1], true, ramp(look.item("offhand"), false));
}
function dressShort(px, bg, look, a) {
  const front = look.has("cloak") && (look.shape("cloak") & FRONT) !== 0;
  const capeOn = look.draws("cloak") && !front, covered = look.has("suit") || front;
  if (capeOn) stampCloakBehind(px, bg, look, a);
  if (look.draws("shirt") && !covered) stampBodyShort(px, bg, look, "shirt", a, false);
  if (look.draws("suit")) stampBodyShort(px, bg, look, "suit", a, true);
  if (look.draws("cloak") && front) stampCloakFront(px, bg, look, a);
  if (look.draws("suit") && (look.shape("suit") & DRAGON)) stampPauldrons(px, (look.shape("suit") >> 12) & 0xf, a);
  if (look.draws("amulet")) putPx(px, 6, 11, amuletShortColour(look));   // under the beard, over any armour
  if (look.draws("boots")) stampBoots(px, bg, look, a);
  if (look.draws("gloves")) stampGloves(px, bg, look, a, [a.main[0], a.main[1], a.off[0], a.off[1]]);
  if (look.draws("helmet")) stampHelmet(px, bg, look, a);
  if (look.draws("eyewear")) stamp(px, bg, eyewearSprite(look, true), 0, 0, false, ramp(look.item("eyewear"), false));
  if (look.draws("shield")) stamp(px, bg, shieldSprite(look), a.off[0], a.off[1], false, ramp(look.item("shield"), false));   // full size (Lucas)
  // weapons at full size: pound for pound the small races are the strong ones (Lucas, 2026-09-26)
  if (look.has("weapon")) stamp(px, bg, heldSprite(look, "weapon"), a.main[0], a.main[1], false, ramp(look.item("weapon"), false));
  if (look.has("offhand")) stamp(px, bg, heldSprite(look, "offhand"), a.off[0], a.off[1], true, ramp(look.item("offhand"), false));
}
// ======================================================================

// ---- Rolehack web: anchors per base tile, as RhDoll.java's ANCHORS (tile
// numbers in the core's tile order; the Dressing Room keeps the same values
// by body name)
function A(o) {
  return Object.assign({ head: [0, 0], torso: [0, 0], main: [4, 10], off: [11, 10], hands: null,
    feetRow: 13, feetCols: [5, 6, 9, 10], short: false, keep: [], offPose: [], cuffs: null }, o || {});
}
const DEFAULT_ANCHOR = A();
const ANCHORS = new Map();
const pair = (maleTile, a) => { ANCHORS.set(maleTile, a); ANCHORS.set(maleTile + 1, a); };
pair(676, A({ head: [0, 1], torso: [0, 1], main: [4, 11], off: [11, 11], feetRow: 14, feetCols: [5, 6, 7, 9, 10, 11] })); // archeologist
pair(678, A({ feetRow: 14, feetCols: [5, 6, 9, 10] }));                                          // barbarian
pair(680, A());                                                                                    // cave dweller
pair(682, A({ feetRow: -1 }));                                                                     // healer
pair(684, A());                                                                                    // knight
pair(686, A({ head: [0, 2], hands: [6, 9, 7, 9, 9, 9, 10, 9], feetRow: -1 }));                    // monk
ANCHORS.set(688, A({ head: [0, -1], main: [4, 9], off: [11, 9], feetRow: -1 }));                  // cleric, male
ANCHORS.set(689, A({ main: [4, 9], off: [11, 9], feetRow: -1 }));                                 // cleric, female
pair(690, A({ head: [1, 0], torso: [1, 0], main: [5, 10], off: [12, 10], feetCols: [6, 7, 10, 11] })); // ranger
pair(692, A({ head: [0, 2], torso: [0, 2], main: [4, 12], off: [11, 12], feetRow: 14, feetCols: [5, 6, 9, 10] })); // rogue
pair(694, A({ head: [0, 1], torso: [0, 1], main: [4, 11], off: [11, 11], feetRow: 14, feetCols: [5, 6, 9, 10] })); // samurai
pair(696, A({ head: [0, 1], torso: [0, 1], main: [4, 11], off: [11, 11], feetRow: 14, feetCols: [5, 6, 9, 10] })); // tourist
pair(698, A());                                                                                    // valkyrie
pair(700, A({ feetRow: -1 }));                                                                     // wizard
pair(702, A({ hands: [4, 10, 12, 5, 11, 10], cuffs: [4, 9, 12, 6, 11, 9], keep: [12, 3],          // apothecary
  offPose: [11, 7, "~", 12, 6, "~", 12, 5, "~", 12, 4, "~", 13, 4, "~", 12, 3, "~",
            13, 5, "~", 11, 8, "O", 11, 9, "L", 11, 10, "L"] }));
pair(532, A());                                                                                    // human (showrace)
pair(540, A());                                                                                    // elf
const BEARDED = A({ main: [4, 11], off: [8, 11], feetCols: [4, 5, 7, 8], short: true, keep: [5, 9, 6, 9, 7, 9, 6, 10] });
pair(92, BEARDED);                                                                                 // dwarf
ANCHORS.set(338, BEARDED);                                                                         // gnome, male
ANCHORS.set(339, A({ main: [4, 11], off: [8, 11], feetCols: [4, 5, 7, 8], short: true }));        // gnome, female
pair(148, A({ head: [-2, 1], torso: [-2, 0], main: [2, 10], off: [9, 10], feetCols: [2, 3, 4, 6, 7, 8] })); // orc

// ---- Rolehack web: the core's look array (rhdoll.c) as the port's look
// [0] version  [1] x  [2] y  [3] base tile or -1
// then per slot {tile or -1, colour, shape}; then the skin seed and skintone
const SLOT = { helmet: 0, suit: 1, shirt: 2, cloak: 3, shield: 4, gloves: 5, boots: 6,
               eyewear: 7, amulet: 8, weapon: 9, offhand: 10 };
export const LOOK_LEN = 4 + 3 * 11 + 2;

function coreLook(a, tilePx) {
  const tile = s => a[4 + 3 * SLOT[s]];
  const shape = s => (tile(s) >= 0 ? a[6 + 3 * SLOT[s]] : 0);
  const item = s => (tile(s) >= 0 ? { id: tile(s), pxa: tilePx(tile(s)) } : null);
  return { item, shape, has: s => tile(s) >= 0, draws: s => tile(s) >= 0 && !(shape(s) & COSTUME),
           art: s => (shape(s) >> 17) & 0x3f };
}

// The hero's tile, skin-toned and dressed, as 256 0xRRGGBB pixels; null when
// the doll steps aside (polymorphed, riding, engulfed, underwater, mimicking).
// tilePx(n) gives tile n's pixels the same way.
export function dressHero(a, tilePx) {
  if (!a || a[0] < 2 || a[3] < 0) return null;
  const fixedTone = a[LOOK_LEN - 1];
  const tone = fixedTone >= 1 && fixedTone <= TONES.length ? fixedTone - 1
                                                           : (a[LOOK_LEN - 2] & 0x7fffffff) % TONES.length;
  const skin = TONES[tone], anchor = ANCHORS.get(a[3]) || DEFAULT_ANCHOR;
  const px = Int32Array.from(tilePx(a[3])), bg = px[0];
  for (let i = 0; i < 256; i++) if (px[i] === VANILLA_SKIN) px[i] = skin;
  const look = coreLook(a, tilePx);
  if (anchor.short) dressShort(px, bg, look, anchor);
  else dressHuman(px, bg, look, anchor, skin, Int32Array.from(px));
  return px;
}
