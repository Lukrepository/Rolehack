/* ROLEHACK: RoleMaker v1 -- a generic ability runner over a static table.
   Design: role-maker-and-apothecary-review-2026-09-27.md, section 8.
   Every row is composed from costs the engine already charges and effects
   it already implements; the runner adds targeting, gates and cooldowns. */
/* Changed for Rolehack by Lucas Ruiz, 2026-09-27.  See ROLEHACK-CHANGES.md. */

#ifndef RHABILITY_H
#define RHABILITY_H

/* how much of the clock an ability takes */
enum rh_time_class {
    RH_T_FREE = 0,  /* ECMD_OK: information only, the turn does not move */
    RH_T_ACTION,    /* one action, as any command */
    RH_T_QUICK,     /* an action, then half of it refunded in movement points */
    RH_T_HELPLESS   /* an action plus `helpless' turns of nomul() */
};

/* what the ability is aimed at */
enum rh_target_kind {
    RH_TG_NONE = 0,
    RH_TG_SELF,
    RH_TG_DIR,      /* getdir(): a direction, never the hero's own square */
    RH_TG_ADJACENT, /* getdir(): a monster the hero can spot next to her */
    RH_TG_HELD,     /* the monster held by a grapple (u.ustuck, not sticky) */
    RH_TG_ITEM      /* getobj(): one item from the pack */
};

/* what it does; a1 and a2 are the row's arguments */
enum rh_effect_kind {
    RH_E_NONE = 0,
    RH_E_ZAP,       /* a1 = a WAN_ or SPE_ type, cast in the chosen direction */
    RH_E_SCROLL,    /* a1 = a SCR_ type, as if read */
    RH_E_QUAFF,     /* a1 = a POT_ type, as if drunk */
    RH_E_POTIONHIT, /* a potion chosen from the pack breaks on the target */
    RH_E_MONFLAG,   /* a1: 1 stun, 2 confuse, 3 blind, 4 freeze, 5 sleep,
                       6 flee; a2 = turns */
    RH_E_FLEE_ALL,  /* every monster in sight within a1 squares flees rnd(a2) */
    RH_E_DAMAGE,    /* the target takes d(a1, a2) */
    RH_E_HEAL,      /* the hero heals d(a1, a2) */
    RH_E_MHURTLE,   /* the target is hurled a1 squares away from the hero */
    RH_E_HURTLE,    /* the hero is hurled a1 squares in the chosen direction */
    RH_E_PROP,      /* hero property a1 (e.g. FAST) for a2 more turns */
    RH_E_IDENTIFY   /* the chosen item is fully identified */
};

/* gates, beyond role and skill */
#define RH_G_HANDS_FREE 0x01
#define RH_G_HOLDING    0x02 /* holding a grappled monster */
#define RH_G_NOT_POLYD  0x04

struct rh_ability {
    const char *name;    /* menu name */
    const char *verb;    /* lower case, for messages: "you can't <verb>" */
    const char *desc;    /* one line for the menu */
    int role;            /* a PM_ role, or NON_PM for any */
    boolean wizonly;     /* a demonstration row: wizard mode only */
    int time;            /* enum rh_time_class */
    int helpless;        /* turns, for RH_T_HELPLESS */
    int target;          /* enum rh_target_kind */
    int skill, minskill; /* gate: P_SKILL(skill) >= minskill; P_NONE = none */
    unsigned gates;      /* RH_G_ flags */
    int pw, nutr, hp, gold, align; /* costs, each 0 for none */
    int effect, a1, a2;  /* enum rh_effect_kind and its arguments */
    int cooldown;        /* turns before it can be used again; 0 = none */
    const char *msg_ok;  /* printed before the effect; one %s = the target */
};

#endif /* RHABILITY_H */
