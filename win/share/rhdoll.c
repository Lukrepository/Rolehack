/* NetHack 5.0  rhdoll.c */
/* Written for Rolehack by Lucas Ruiz, 2026-09-26. */
/* NetHack may be freely redistributed.  See license for details. */

/* The paper doll's core side, lifted from the Android port's winandroid.c
   (RolehackDroid aadea7f52) so every window port sends the same look. */

#include "hack.h"
#include "rhdoll.h"

/*
 * Rolehack: the paper doll -- what the hero is wearing and wielding.
 *
 * Every item goes out as the glyph the floor would show for it, never by what
 * it really is.  The tile and the colour both follow the shuffled appearance
 * (o_init.c: shuffle() swaps oc_color, shuffle_tiles() the tiles), so the doll
 * shows no more than a glance at the floor would: "riding gloves", not
 * gauntlets of power.  obj_to_glyph() is not used because its pile-top test
 * reads the floor at the object's ox/oy, which are stale for inventory; and the
 * doll ignores hallucination, as the core does for the hero's own glyph.
 *
 * Layout of the int array (RH_DOLL_LEN):
 *   [0] version (2)   [1] u.ux   [2] u.uy
 *   [3] tile of the hero's own glyph (hero_glyph: role, or race with showrace),
 *       or -1 when the doll must step aside (polymorphed, riding, engulfed,
 *       underwater, mimicking)
 *   then RH_DOLL_SLOTS triples {tile or -1, RGB colour, shape}, in the order
 *   helmet, suit, shirt, cloak, shield, gloves, boots, eyewear, amulet,
 *   weapon, off-hand weapon (only while two-weaponing).
 *   shape: 0 for anything that is not a weapon, else an RH_DOLL_* family,
 *   plus RH_DOLL_TWOHANDED; RH_DOLL_HIDE for dragon scales, which the
 *   interface cannot tell from a suit by the tile's shape; RH_DOLL_DRAGON
 *   and the dragon's index (gray .. yellow) in bits 12-15 for dragon scale
 *   mail, for its pauldrons.  All of these are functions of the object type
 *   alone, and none of those appearances is ever shuffled, so they tell
 *   nothing the tile does not.
 *   A worn cloak, helmet, shield, pair of gloves, pair of boots, amulet or
 *   eyewear carries its style in the low byte (rh_doll_look()), named by the words
 *   the player sees: its description, or its name when it has none.  The
 *   magic cloaks, four helmets, all gloves, the magic boots and all amulets
 *   shuffle their descriptions per game, so the doll draws the "opera cloak"
 *   or the "hexagonal" amulet, never the cloak of invisibility or amulet of
 *   reflection; three shields share "wooden shield", and the Amulet of
 *   Yendor and its imitation "Amulet of Yendor", and each pair is drawn
 *   alike.
 *   RH_DOLL_FRONT marks the cloak-slot items worn in front of the body --
 *   robe, apron (alchemy smock), mummy wrapping; every other cloak is drawn
 *   as a cape behind it, so it no longer hides the armour (Lucas).  All
 *   three have fixed appearances.
 *   RH_DOLL_COSTUME marks a worn item the hero's own role tile already
 *   draws (the Archeologist's fedora, the Knight's ring mail); the doll
 *   leaves the tile alone for it.  Only when the player already knows the
 *   item's type (oc_name_known -- starting kit is discovered at creation),
 *   so it cannot tell a helm of telepathy from a plain helmet.
 *   Bits 17-22 carry an artifact's own art (rh_doll_art(): its place in
 *   rh_doll_arts[] plus one), set only once the inventory would print the
 *   artifact's name, so they tell nothing the player cannot read.  An
 *   artifact is never marked costume.
 *
 *   then, from version 2, the skin: a seed that is fixed for the character
 *   (a hash of ubirthday, which the save keeps) and the skintone option
 *   (0 = random, else the tone the options file fixed).  The interface owns
 *   the tones themselves; it has RH_SKINTONES of them.
 *
 * The Android port sends it when the game waits for a command and when the
 * hero's own square is drawn -- otherwise the welcome screens show the plain
 * tile, and NetHack's own skin tone, until the first command (Lucas) -- and
 * only when something changed.  The web port reads it as it draws.
 */
#define RH_DOLL_SHORT_BLADE  1  /* dagger, knife */
#define RH_DOLL_SWORD        2  /* short, broad, long sword, saber */
#define RH_DOLL_GREAT_SWORD  3
#define RH_DOLL_AXE          4
#define RH_DOLL_PICK         5
#define RH_DOLL_BLUNT        6  /* club, mace, flail, hammer */
#define RH_DOLL_STAFF        7
#define RH_DOLL_POLE         8  /* polearms, spear, trident, lance */
#define RH_DOLL_LAUNCHER     9  /* bow, sling, crossbow */
#define RH_DOLL_MISSILE     10  /* ammo, darts, shuriken, boomerang */
#define RH_DOLL_WHIP        11
#define RH_DOLL_HORN        12  /* unicorn horn */
#define RH_DOLL_CHAIN       13  /* morning star: a spiked ball on a chain, as its floor tile */
#define RH_DOLL_TWOHANDED  0x100
#define RH_DOLL_HIDE       0x200  /* dragon scales: a hide, not a shirt-shaped suit */
#define RH_DOLL_COSTUME    0x400  /* the role tile already draws this item */
#define RH_DOLL_DRAGON     0x800  /* dragon scale mail; index in bits 12-15 */
#define RH_DOLL_FRONT    0x10000  /* robe, apron, mummy wrapping: worn in front */
#define RH_DOLL_ART_SHIFT     17  /* bits 17-22: the artifact's own art, rh_doll_arts[] + 1 */

staticfn int rh_doll_family(struct obj *obj)
{
    int skill;

    if(obj->oclass != WEAPON_CLASS && !is_weptool(obj))
        return 0;
    skill = objects[obj->otyp].oc_skill;
    if(skill < 0)
        return RH_DOLL_MISSILE;
    switch(skill)
    {
    case P_DAGGER: case P_KNIFE:                        return RH_DOLL_SHORT_BLADE;
    case P_SHORT_SWORD: case P_BROAD_SWORD:
    case P_LONG_SWORD: case P_SABER:                    return RH_DOLL_SWORD;
    case P_TWO_HANDED_SWORD:                            return RH_DOLL_GREAT_SWORD;
    case P_AXE:                                         return RH_DOLL_AXE;
    case P_PICK_AXE:                                    return RH_DOLL_PICK;
    case P_CLUB: case P_MACE:
    case P_FLAIL: case P_HAMMER:                        return RH_DOLL_BLUNT;
    case P_MORNING_STAR:                                return RH_DOLL_CHAIN;
    case P_QUARTERSTAFF:                                return RH_DOLL_STAFF;
    case P_POLEARMS: case P_SPEAR: case P_TRIDENT:
    case P_LANCE:                                       return RH_DOLL_POLE;
    case P_BOW: case P_SLING: case P_CROSSBOW:          return RH_DOLL_LAUNCHER;
    case P_DART: case P_SHURIKEN: case P_BOOMERANG:     return RH_DOLL_MISSILE;
    case P_WHIP:                                        return RH_DOLL_WHIP;
    case P_UNICORN_HORN:                                return RH_DOLL_HORN;
    default:                                            return 0;
    }
}

/*
 * What each role's tile already wears, among its starting kit (Lucas: "some
 * of the other base roles have similar clothing which is already represented
 * on model").  Only unshared appearances: no small shield, whose "wooden
 * shield" look two other shields share.
 */
static const struct {
    short role, otyp;
} rh_costume[] = {
    { PM_ARCHEOLOGIST, FEDORA },
    { PM_ARCHEOLOGIST, LEATHER_JACKET },
    { PM_APOTHECARY, ALCHEMY_SMOCK },
    { PM_APOTHECARY, HIGH_BOOTS },
    { PM_APOTHECARY, LENSES },
    { PM_CAVE_DWELLER, LEATHER_ARMOR },
    { PM_KNIGHT, RING_MAIL },
    { PM_KNIGHT, HELMET },
    { PM_MONK, ROBE },
    { PM_CLERIC, ROBE },
    { PM_ROGUE, LEATHER_ARMOR },
    { PM_SAMURAI, SPLINT_MAIL },
    { PM_TOURIST, HAWAIIAN_SHIRT },
    { PM_WIZARD, CLOAK_OF_MAGIC_RESISTANCE },
};

staticfn boolean rh_doll_costume(struct obj *obj)
{
    int i;

    /* showrace draws the race's tile, which wears none of the role's kit */
    if(flags.showrace || !objects[obj->otyp].oc_name_known)
        return FALSE;
    for(i = 0; i < SIZE(rh_costume); ++i)
        if(rh_costume[i].role == Role_switch && rh_costume[i].otyp == obj->otyp)
            return TRUE;
    return FALSE;
}

/*
 * A worn cloak's, helmet's, shield's, gloves', boots', amulet's or eyewear's
 * look, by the words the player sees for it (Lucas asked for the art of each).  The orders match
 * RhDoll's styles; 0 for anything else.  Cornuthaum and dunce cap are both
 * "conical hat"; the small shield and the shields of drain and shock
 * resistance are all "wooden shield".
 */
static const char *const rh_cloak_looks[] = {
    "faded pall", "coarse mantelet", "hooded cloak", "slippery cloak",
    "leather cloak", "tattered cape", "opera cloak", "ornamental cope",
    "piece of cloth", "robe", "apron", "mummy wrapping",
};
static const char *const rh_helm_looks[] = {
    "leather hat", "iron skull cap", "hard hat", "fedora", "conical hat",
    "dented pot", "crystal helmet", "plumed helmet", "etched helmet",
    "crested helmet", "visored helmet",
};
static const char *const rh_shield_looks[] = {
    "wooden shield", "blue and green shield", "white-handed shield",
    "red-eyed shield", "large shield", "large round shield",
    "polished silver shield",
};
static const char *const rh_glove_looks[] = {
    "old gloves", "padded gloves", "riding gloves", "fencing gloves",
};
static const char *const rh_boot_looks[] = {
    "walking shoes", "hard shoes", "hiking boots", "jackboots",
    "combat boots", "jungle boots", "mud boots", "buckled boots",
    "riding boots", "snow boots",
};
static const char *const rh_amulet_looks[] = {
    "circular", "spherical", "oval", "triangular", "pyramidal", "square",
    "concave", "hexagonal", "octagonal", "perforated", "cubical",
    "Amulet of Yendor",
};
static const char *const rh_eyewear_looks[] = {
    "lenses", "blindfold", "towel",
};

staticfn int rh_doll_look(struct obj *obj, const char *const *looks, int n)
{
    const char *look = OBJ_DESCR(objects[obj->otyp]);
    int i;

    if(!look)   /* robe, leather cloak, fedora, dented pot: the name is the look */
        look = OBJ_NAME(objects[obj->otyp]);
    for(i = 0; i < n; ++i)
        if(look && !strcmp(look, looks[i]))
            return i + 1;
    return 0;
}

/*
 * Artifacts with art of their own on the doll (Lucas, 2026-09-26), in
 * artilist.h's order.  The UI's tables (RhDoll.ART_HELD and friends) follow
 * this list: an artifact's place here, plus one, is its number there.
 */
static const short rh_doll_arts[] = {
    ART_EXCALIBUR,
    ART_STORMBRINGER,
    ART_MJOLLNIR,
    ART_CLEAVER,
    ART_GRIMTOOTH,
    ART_ORCRIST,
    ART_STING,
    ART_MAGICBANE,
    ART_FROST_BRAND,
    ART_FIRE_BRAND,
    ART_DRAGONBANE,
    ART_DEMONBANE,
    ART_WEREBANE,
    ART_GRAYSWANDIR,
    ART_GIANTSLAYER,
    ART_OGRESMASHER,
    ART_TROLLSBANE,
    ART_VORPAL_BLADE,
    ART_SNICKERSNEE,
    ART_SUNSWORD,
    ART_ORB_OF_DETECTION,
    ART_HEART_OF_AHRIMAN,
    ART_SCEPTRE_OF_MIGHT,
    ART_STAFF_OF_AESCULAPIUS,
    ART_MAGIC_MIRROR_OF_MERLIN,
    ART_EYES_OF_THE_OVERWORLD,
    ART_MITRE_OF_HOLINESS,
    ART_LONGBOW_OF_DIANA,
    ART_MASTER_KEY_OF_THIEVERY,
    ART_TSURUGI_OF_MURAMASA,
    ART_YENDORIAN_EXPRESS_CARD,
    ART_ORB_OF_FATE,
    ART_EYE_OF_THE_AETHIOPICA,
    ART_LAPIS_PHILOSOPHORUM
};

/*
 * The artifact's art number, or 0 -- given only once the inventory would print
 * its name (xname(): has_oname && dknown), so the doll never shows what the
 * player cannot read.  No artifact exists as a floor tile of its own in 5.0;
 * this art is the doll's alone.
 */
staticfn int rh_doll_art(struct obj *obj)
{
    int i;

    if(!obj->oartifact || !obj->dknown || !has_oname(obj))
        return 0;
    for(i = 0; i < SIZE(rh_doll_arts); ++i)
        if(obj->oartifact == rh_doll_arts[i])
            return i + 1;
    return 0;
}

staticfn void rh_doll_slot(int *out, struct obj *obj, boolean worn,
                           int (*to_rgb)(int))
{
    int art;
    glyph_info ginfo;
    int glyph;

    if(!obj)
    {
        out[0] = -1, out[1] = 0, out[2] = 0;
        return;
    }
    if(obj->otyp == CORPSE)
        glyph = obj->corpsenm + GLYPH_BODY_OFF;
    else if(obj->otyp == STATUE)
        glyph = obj->corpsenm
                + (((obj->spe & CORPSTAT_GENDER) == CORPSTAT_FEMALE)
                   ? GLYPH_STATUE_FEM_OFF : GLYPH_STATUE_MALE_OFF);
    else if(obj_is_generic(obj))
        glyph = obj->oclass + GLYPH_OBJ_OFF;
    else
        glyph = obj->otyp + GLYPH_OBJ_OFF;

    map_glyphinfo(0, 0, glyph, 0, &ginfo);
    out[0] = ginfo.gm.tileidx;
    out[1] = to_rgb ? to_rgb(ginfo.gm.sym.color) : ginfo.gm.sym.color;
    art = rh_doll_art(obj);        /* an artifact is never costume: its art is its own */
    out[2] = rh_doll_family(obj) | (bimanual(obj) ? RH_DOLL_TWOHANDED : 0)
             | (Is_dragon_scales(obj) ? RH_DOLL_HIDE : 0)
             | (worn && !art && rh_doll_costume(obj) ? RH_DOLL_COSTUME : 0)
             | (art << RH_DOLL_ART_SHIFT);
    if(Is_dragon_mail(obj))
        out[2] |= RH_DOLL_DRAGON | ((obj->otyp - GRAY_DRAGON_SCALE_MAIL) << 12);
    if(obj->otyp == ROBE || obj->otyp == ALCHEMY_SMOCK || obj->otyp == MUMMY_WRAPPING)
        out[2] |= RH_DOLL_FRONT;
}

int
rh_hero_look(int *look, int (*to_rgb)(int))
{
    struct obj *slots[RH_DOLL_SLOTS];
    int i;

    if (!isok(u.ux, u.uy) || program_state.gameover)
        return 0;

    slots[0] = uarmh; slots[1] = uarm; slots[2] = uarmu; slots[3] = uarmc;
    slots[4] = uarms; slots[5] = uarmg; slots[6] = uarmf; slots[7] = ublindf;
    slots[8] = uamul; slots[9] = uwep; slots[10] = u.twoweap ? uswapwep : 0;

    look[0] = 2;
    look[1] = u.ux;
    look[2] = u.uy;
    if (Upolyd || u.usteed || u.uswallow || Underwater
        || U_AP_TYPE != M_AP_NOTHING)
        look[3] = -1;
    else {
        glyph_info ginfo;

        map_glyphinfo(0, 0, hero_glyph, 0, &ginfo);
        look[3] = ginfo.gm.tileidx;
    }
    for (i = 0; i < RH_DOLL_SLOTS; ++i) /* 9, 10: in hand */
        rh_doll_slot(&look[4 + 3 * i], slots[i], i < 9, to_rgb);
    if (uarmc) /* slot 3: the cloak */
        look[4 + 3 * 3 + 2] |= rh_doll_look(uarmc, rh_cloak_looks,
                                            SIZE(rh_cloak_looks));
    if (uarmh) /* slot 0: the helmet */
        look[4 + 3 * 0 + 2] |= rh_doll_look(uarmh, rh_helm_looks,
                                            SIZE(rh_helm_looks));
    if (uarms) /* slot 4: the shield */
        look[4 + 3 * 4 + 2] |= rh_doll_look(uarms, rh_shield_looks,
                                            SIZE(rh_shield_looks));
    if (uarmg) /* slot 5: the gloves */
        look[4 + 3 * 5 + 2] |= rh_doll_look(uarmg, rh_glove_looks,
                                            SIZE(rh_glove_looks));
    if (uarmf) /* slot 6: the boots */
        look[4 + 3 * 6 + 2] |= rh_doll_look(uarmf, rh_boot_looks,
                                            SIZE(rh_boot_looks));
    if (uamul) /* slot 8: the amulet */
        look[4 + 3 * 8 + 2] |= rh_doll_look(uamul, rh_amulet_looks,
                                            SIZE(rh_amulet_looks));
    if (ublindf) /* slot 7: the eyewear */
        look[4 + 3 * 7 + 2] |= rh_doll_look(ublindf, rh_eyewear_looks,
                                            SIZE(rh_eyewear_looks));
    /* Knuth's multiplicative hash, high bits: games started seconds apart
       should not just step through the tones in order. */
    look[RH_DOLL_LEN - 2] = (int) ((((unsigned) ubirthday) * 2654435761U) >> 16);
    /* the skintone option lives only in the Android tree so far:
       0 is a random tone per character */
    look[RH_DOLL_LEN - 1] = 0;
    return RH_DOLL_LEN;
}

/*rhdoll.c*/
