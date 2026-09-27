/* ROLEHACK: RoleMaker v1 -- a generic ability runner over a static table.
   Design: role-maker-and-apothecary-review-2026-09-27.md, section 8.

   An ability is one row: name, time class, target, gates, costs, effect,
   cooldown, message.  The runner picks the target, checks the gates and the
   cooldown, charges the costs with the engine's own functions (u.uen,
   morehungry, losehp, useupf on gold, adjalign), applies the effect through
   the engine's own entry points (weffects/seffects/peffects on a pseudo
   object, potionhit, monster flags, monflee, hurtle, incr_itimeout,
   identify) and starts a global timer for the cooldown.  Cooldowns live in
   the timer list, so no save-file layout changes and old saves still load.

   #ability (M-b) lists the rows the hero's role can use.  Rows marked
   wizonly are demonstrations, shown in wizard mode only, until Lucas assigns
   them to a role. */
/* Changed for Rolehack by Lucas Ruiz, 2026-09-27.  See ROLEHACK-CHANGES.md. */

#include "hack.h"
#include "rhability.h"

staticfn boolean rh_available(const struct rh_ability *);
staticfn boolean rh_can_pay(const struct rh_ability *);
staticfn void rh_pay(const struct rh_ability *);
staticfn void rh_monflag(struct monst *, int, int);
staticfn void rh_apply(const struct rh_ability *, struct monst *, struct obj *);
staticfn int rh_run(int);
staticfn int rh_potion_ok(struct obj *);

/* the table.  Field order: name, verb, desc, role, wizonly, time, helpless,
   target, skill, minskill, gates, pw, nutr, hp, gold, align, effect, a1, a2,
   cooldown, msg_ok. */
static const struct rh_ability rh_abilities[] = {
    /* live: the Apothecary's Fume.  Throwing a potion at melee range can
       miss; dashing it in a face cannot.  It costs the potion and the
       action, and the vapour rule applies (your_fault). */
    { "Fume", "fume",
      "dash a potion from your pack in an adjacent monster's face; never misses",
      PM_APOTHECARY, FALSE, RH_T_ACTION, 0, RH_TG_ADJACENT, P_NONE, 0, 0,
      0, 0, 0, 0, 0, RH_E_POTIONHIT, 0, 0, 0,
      "You dash it in %s's face!" },

    /* demonstrations (wizard mode only): one row per cost and effect kind */
    { "Assay", "assay",
      "know one item through and through: free action, 100 zorkmids, once in 200 turns",
      NON_PM, TRUE, RH_T_FREE, 0, RH_TG_ITEM, P_NONE, 0, 0,
      0, 0, 0, 100, 0, RH_E_IDENTIFY, 0, 0, 200,
      (const char *) 0 },
    { "Pin", "pin",
      "pin the monster you hold for two turns: 20 nutrition, once in 5 turns",
      NON_PM, TRUE, RH_T_ACTION, 0, RH_TG_HELD, P_BARE_HANDED_COMBAT, P_BASIC,
      RH_G_HANDS_FREE, 0, 20, 0, 0, 0, RH_E_MONFLAG, 4, 2, 5,
      "You pin %s to the floor!" },
    { "Roar", "roar",
      "every monster in sight within 8 squares flees: 2 helpless turns, 100 nutrition, once in 50",
      NON_PM, TRUE, RH_T_HELPLESS, 2, RH_TG_NONE, P_NONE, 0, 0,
      0, 100, 0, 0, 0, RH_E_FLEE_ALL, 8, 10, 50,
      "You roar!" },
    { "Bolt", "bolt",
      "a force bolt that cannot fail, in half an action: 5 Pw, once in 10 turns",
      NON_PM, TRUE, RH_T_QUICK, 0, RH_TG_DIR, P_NONE, 0, 0,
      5, 0, 0, 0, 0, RH_E_ZAP, SPE_FORCE_BOLT, 0, 10,
      (const char *) 0 },
    { "Sprint", "sprint",
      "twenty turns of speed bought with 3 hit points, once in 100 turns",
      NON_PM, TRUE, RH_T_ACTION, 0, RH_TG_SELF, P_NONE, 0, RH_G_NOT_POLYD,
      0, 0, 3, 0, 0, RH_E_PROP, FAST, 20, 100,
      "You feel yourself speed up." },
};

/* can the hero's role use this row at all? */
staticfn boolean
rh_available(const struct rh_ability *a)
{
    if (a->wizonly && !wizard)
        return FALSE;
    return (a->role == NON_PM || Role_if(a->role));
}

/* getobj callback: potions only */
staticfn int
rh_potion_ok(struct obj *obj)
{
    if (!obj)
        return GETOBJ_EXCLUDE;
    return (obj->oclass == POTION_CLASS) ? GETOBJ_SUGGEST : GETOBJ_EXCLUDE;
}

/* refuse, with a reason, if a cost can't be met */
staticfn boolean
rh_can_pay(const struct rh_ability *a)
{
    if (a->pw && u.uen < a->pw) {
        You("don't have enough energy to %s.", a->verb);
        return FALSE;
    }
    if (a->nutr && u.uhunger - a->nutr < 10) {
        You("are too hungry to %s.", a->verb);
        return FALSE;
    }
    if (a->hp && u.uhp <= a->hp) {
        You("are too weak to %s.", a->verb);
        return FALSE;
    }
    if (a->gold && money_cnt(gi.invent) < (long) a->gold) {
        You("can't afford to %s; it costs %d %s.", a->verb, a->gold,
            currency((long) a->gold));
        return FALSE;
    }
    return TRUE;
}

/* charge the costs, each with the engine's own function */
staticfn void
rh_pay(const struct rh_ability *a)
{
    if (a->pw) {
        u.uen -= a->pw;
        disp.botl = TRUE;
    }
    if (a->nutr)
        morehungry(a->nutr);
    if (a->hp)
        losehp(a->hp, "the strain of an ability", KILLED_BY);
    if (a->gold) {
        struct obj *gold = findgold(gi.invent);

        if (gold) {
            if (gold->quan > (long) a->gold)
                useupf(gold, (long) a->gold);
            else
                useup(gold);
        }
        disp.botl = TRUE;
    }
    if (a->align)
        adjalign(-a->align);
}

/* RH_E_MONFLAG: a status on the target */
staticfn void
rh_monflag(struct monst *mtmp, int kind, int turns)
{
    if (turns > 127)
        turns = 127;
    switch (kind) {
    case 1:
        mtmp->mstun = 1;
        break;
    case 2:
        mtmp->mconf = 1;
        break;
    case 3:
        mtmp->mblinded = (unsigned) turns;
        mtmp->mcansee = 0;
        break;
    case 4:
        mtmp->mcanmove = 0;
        mtmp->mfrozen = (unsigned) turns;
        break;
    case 5:
        (void) sleep_monst(mtmp, turns, -1);
        break;
    case 6:
        monflee(mtmp, turns, FALSE, TRUE);
        break;
    default:
        break;
    }
}

/* the effect, through the engine's own entry points */
staticfn void
rh_apply(const struct rh_ability *a, struct monst *mtmp, struct obj *item)
{
    struct obj *pseudo;

    switch (a->effect) {
    case RH_E_ZAP:
    case RH_E_SCROLL:
    case RH_E_QUAFF:
        /* as spelleffects() does: a temporary object carrying the type */
        pseudo = mksobj(a->a1, FALSE, FALSE);
        pseudo->blessed = pseudo->cursed = 0;
        pseudo->quan = 20L; /* do not let useup get it */
        if (a->effect == RH_E_ZAP) {
            zapsetup();
            weffects(pseudo);
            zapwrapup();
        } else if (a->effect == RH_E_SCROLL) {
            (void) seffects(pseudo);
        } else {
            (void) peffects(pseudo);
        }
        obfree(pseudo, (struct obj *) 0);
        break;
    case RH_E_POTIONHIT:
        if (item->quan > 1L)
            item = splitobj(item, 1L);
        freeinv(item);
        potionhit(mtmp, item, POTHIT_HERO_THROW); /* frees item */
        break;
    case RH_E_MONFLAG:
        rh_monflag(mtmp, a->a1, a->a2);
        break;
    case RH_E_FLEE_ALL: {
        struct monst *m;

        for (m = fmon; m; m = m->nmon) {
            if (DEADMONSTER(m) || m == u.usteed || !canseemon(m))
                continue;
            if (distu(m->mx, m->my) > a->a1 * a->a1)
                continue;
            monflee(m, rnd(a->a2), FALSE, TRUE);
        }
        break;
    }
    case RH_E_DAMAGE: {
        int dmg = d(a->a1, a->a2);

        mtmp->mhp -= dmg;
        if (DEADMONSTER(mtmp))
            killed(mtmp);
        else
            wakeup(mtmp, TRUE);
        break;
    }
    case RH_E_HEAL:
        healup(d(a->a1, a->a2), 0, FALSE, FALSE);
        break;
    case RH_E_MHURTLE:
        mhurtle(mtmp, u.dx, u.dy, a->a1);
        break;
    case RH_E_HURTLE:
        hurtle(u.dx, u.dy, a->a1, TRUE);
        break;
    case RH_E_PROP:
        incr_itimeout(&u.uprops[a->a1].intrinsic, a->a2);
        disp.botl = TRUE;
        break;
    case RH_E_IDENTIFY:
        (void) identify(item);
        break;
    default:
        break;
    }
}

/* the timer callback: the cooldown has ended */
void
rh_ability_ready(anything *arg, long timeout UNUSED)
{
    int idx = arg->a_int - 1;

    if (idx >= 0 && idx < SIZE(rh_abilities)
        && rh_available(&rh_abilities[idx]))
        You_feel("ready to %s again.", rh_abilities[idx].verb);
}

/* gates, cooldown, costs, target, message, effect, cooldown, clock */
staticfn int
rh_run(int idx)
{
    const struct rh_ability *a = &rh_abilities[idx];
    struct monst *mtmp = (struct monst *) 0;
    struct obj *item = (struct obj *) 0;
    anything arg;
    long left;

    /* gates */
    if (a->skill != P_NONE && P_SKILL(a->skill) < a->minskill) {
        You("are not skilled enough to %s.", a->verb);
        return ECMD_OK;
    }
    if ((a->gates & RH_G_HANDS_FREE) && uwep) {
        You("need both hands free to %s.", a->verb);
        return ECMD_OK;
    }
    if ((a->gates & RH_G_NOT_POLYD) && Upolyd) {
        You("can't %s in this form.", a->verb);
        return ECMD_OK;
    }
    if ((a->gates & RH_G_HOLDING) || a->target == RH_TG_HELD) {
        if (!u.ustuck || u.uswallow || sticks(u.ustuck->data)) {
            You("are not holding anything to %s.", a->verb);
            return ECMD_OK;
        }
        mtmp = u.ustuck;
    }

    /* cooldown: a global timer keyed on the row */
    arg = cg.zeroany;
    arg.a_int = idx + 1;
    if (a->cooldown && (left = peek_timer(RH_ABILITY_READY, &arg)) > 0
        && left > svm.moves) {
        left -= svm.moves;
        You("can't %s again for %ld more turn%s.", a->verb, left, plur(left));
        return ECMD_OK;
    }

    if (!rh_can_pay(a))
        return ECMD_OK;

    /* the item, before the direction, so a cancel costs nothing */
    if (a->effect == RH_E_POTIONHIT) {
        item = getobj(a->verb, rh_potion_ok, GETOBJ_NOFLAGS);
        if (!item)
            return ECMD_CANCEL;
    } else if (a->target == RH_TG_ITEM) {
        item = getobj(a->verb, any_obj_ok, GETOBJ_NOFLAGS);
        if (!item)
            return ECMD_CANCEL;
    }

    /* the target */
    switch (a->target) {
    case RH_TG_DIR:
        if (!getdir((char *) 0))
            return ECMD_CANCEL;
        if (!u.dx && !u.dy && !u.dz) {
            You("can't %s at yourself.", a->verb);
            return ECMD_OK;
        }
        break;
    case RH_TG_ADJACENT:
        if (!getdir((char *) 0))
            return ECMD_CANCEL;
        if (!u.dx && !u.dy) {
            You("can't %s yourself.", a->verb);
            return ECMD_OK;
        }
        mtmp = m_at(u.ux + u.dx, u.uy + u.dy);
        if (!mtmp || !canspotmon(mtmp)) {
            You("see nothing there to %s.", a->verb);
            return ECMD_OK;
        }
        break;
    default:
        break;
    }
    if (mtmp && a->effect == RH_E_MHURTLE) {
        /* away from the hero */
        u.dx = sgn(mtmp->mx - u.ux);
        u.dy = sgn(mtmp->my - u.uy);
    }

    rh_pay(a);
    if (a->msg_ok) {
        if (strstr(a->msg_ok, "%s"))
            pline(a->msg_ok, mtmp ? mon_nam(mtmp) : "");
        else
            pline("%s", a->msg_ok);
    }
    rh_apply(a, mtmp, item);

    if (a->cooldown)
        (void) start_timer((long) a->cooldown, TIMER_GLOBAL, RH_ABILITY_READY,
                           &arg);

    /* the clock */
    switch (a->time) {
    case RH_T_FREE:
        return ECMD_OK;
    case RH_T_QUICK:
        u.umovement += NORMAL_SPEED / 2;
        return ECMD_TIME;
    case RH_T_HELPLESS:
        nomul(-a->helpless);
        gm.multi_reason = "using an ability";
        gn.nomovemsg = You_can_move_again;
        return ECMD_TIME;
    default:
        return ECMD_TIME;
    }
}

/* #ability: a menu of the rows the hero's role can use */
int
doability(void)
{
    winid win;
    anything any;
    menu_item *pick = (menu_item *) 0;
    char buf[BUFSZ], let = 'a';
    int i, n, count = 0, idx = -1;

    win = create_nhwindow(NHW_MENU);
    start_menu(win, MENU_BEHAVE_STANDARD);
    for (i = 0; i < SIZE(rh_abilities); i++) {
        const struct rh_ability *a = &rh_abilities[i];
        long left = 0L;

        if (!rh_available(a))
            continue;
        if (a->cooldown) {
            any = cg.zeroany;
            any.a_int = i + 1;
            left = peek_timer(RH_ABILITY_READY, &any);
            left = (left > svm.moves) ? left - svm.moves : 0L;
        }
        any = cg.zeroany;
        any.a_int = i + 1;
        if (left > 0L)
            Snprintf(buf, sizeof buf, "%-7s %s [ready in %ld]", a->name,
                     a->desc, left);
        else
            Snprintf(buf, sizeof buf, "%-7s %s", a->name, a->desc);
        add_menu(win, &nul_glyphinfo, &any, let, 0, ATR_NONE, NO_COLOR, buf,
                 MENU_ITEMFLAGS_NONE);
        let = (let == 'z') ? 'A' : let + 1;
        count++;
    }
    if (!count) {
        destroy_nhwindow(win);
        You("have no special abilities.");
        return ECMD_OK;
    }
    end_menu(win, "Use which ability?");
    n = select_menu(win, PICK_ONE, &pick);
    destroy_nhwindow(win);
    if (n > 0) {
        idx = pick[0].item.a_int - 1;
        free((genericptr_t) pick);
    }
    if (idx < 0)
        return ECMD_CANCEL;
    return rh_run(idx);
}

/*rhability.c*/
