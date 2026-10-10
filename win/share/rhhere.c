/* NetHack 5.0  rhhere.c */
/* Written for Rolehack by Lucas Ruiz, 2026-09-26. */
/* NetHack may be freely redistributed.  See license for details. */

/*
 * A non-blocking "what can I do here", lifted from the Android port's
 * and_send_here_context() (winandroid.c, RolehackDroid aadea7f52) so every
 * window port asks the same questions.
 *
 * here_cmd_menu() answers the same questions but is an interactive command --
 * it builds a menu window and waits for a selection -- so it cannot be called
 * once a turn just to look.  This asks the same things of the same public state
 * and returns instead of prompting.
 */

#include "hack.h"
#include "rhhere.h"

int
rh_here_context(char *mon, int monsz)
{
    int hflags = 0;
    int i;
    struct monst *hostile = 0;
    stairway *stway;

    if (monsz > 0)
        mon[0] = '\0';
    /* Status flushes before a level exists during startup and on game over. */
    if (!program_state.in_moveloop || !isok(u.ux, u.uy))
        return -1;

    if (OBJ_AT(u.ux, u.uy)) {
        struct obj *otmp;

        hflags |= RH_HERE_OBJECT;
        for (otmp = svl.level.objects[u.ux][u.uy]; otmp; otmp = otmp->nexthere)
            if (Is_container(otmp)) {
                hflags |= RH_HERE_CONTAINER;
                break;
            }
    }

    stway = stairway_at(u.ux, u.uy);
    if (stway)
        hflags |= stway->up ? RH_HERE_STAIRS_UP : RH_HERE_STAIRS_DOWN;

    if (IS_ALTAR(levl[u.ux][u.uy].typ))
        hflags |= RH_HERE_ALTAR;

    for (i = 0; i < 8; ++i) {
        coordxy x = u.ux + xdir[i], y = u.uy + ydir[i];
        struct monst *mtmp;
        int glyph, sym;

        if (!isok(x, y))
            continue;

        /* Open and Close follow the map as drawn (glyph_at(), what tty
           shows), never the door itself.  Testing doormask told apart doors
           that tty draws alike: a locked door has no D_CLOSED bit and a door
           mimic stands in a D_NODOOR doorway, so neither got Open while a
           plain closed door did; and a door the hero had never seen got Open
           too.  Now every '+' the hero sees or remembers offers Open, and
           #open finds the lock or the mimic as it does in vanilla (lock.c).
           A doorway shows its open-door symbol only when nothing is drawn
           over it -- no object, no monster seen or sensed, no remembered
           'I' -- which is where doclose() can try to shut it. */
        glyph = glyph_at(x, y);
        if (glyph_is_cmap(glyph)) {
            sym = glyph_to_cmap(glyph);
            if (sym == S_vcdoor || sym == S_hcdoor)
                hflags |= RH_ADJ_CLOSED_DOOR;
            else if (sym == S_vodoor || sym == S_hodoor)
                hflags |= RH_ADJ_OPEN_DOOR;
        }

        /* A hostile only where a monster is drawn: canspotmon() also counts
           a mimic posing as an object or furniture, and mon_nam() would give
           its true name.  (Nothing reads this flag or the name yet.) */
        mtmp = m_at(x, y);
        if (mtmp && !mtmp->mtame && !mtmp->mpeaceful && canspotmon(mtmp)
            && glyph_is_monster(glyph)) {
            hflags |= RH_ADJ_HOSTILE;
            if (!hostile)
                hostile = mtmp;
        }
    }

    if (hostile && monsz > 0)
        Snprintf(mon, monsz, "%s", mon_nam(hostile));
    return hflags;
}

/*rhhere.c*/
