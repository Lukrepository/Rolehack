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

        if (!isok(x, y))
            continue;

        if (levl[x][y].typ == DOOR && (levl[x][y].doormask & D_CLOSED) != 0)
            hflags |= RH_ADJ_CLOSED_DOOR;
        /* Close, where doclose() would shut the door -- plainly open, and
           nothing seen in the doorway (lock.c's obstructed() refuses an
           object or a monster there). */
        if (levl[x][y].typ == DOOR && levl[x][y].doormask == D_ISOPEN
            && !OBJ_AT(x, y) && !((mtmp = m_at(x, y)) != 0 && canspotmon(mtmp)))
            hflags |= RH_ADJ_OPEN_DOOR;

        mtmp = m_at(x, y);
        if (mtmp && !mtmp->mtame && !mtmp->mpeaceful && canspotmon(mtmp)) {
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
