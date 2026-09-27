/* NetHack 5.0  rhcreate.c */
/* Written for Rolehack by Lucas Ruiz, 2026-09-27. */
/* NetHack may be freely redistributed.  See license for details. */

/*
 * Pictures for player selection, lifted from the Android port's winandroid.c
 * (RolehackDroid a57eb17ed) so every window port finds the same ones.
 *
 * Player selection is role.c's genl_player_setup(), and its menus carry no
 * pictures (nul_glyphinfo).  While it asks (program_state.in_role_selection)
 * a window port can find each entry's picture by its words, as
 * setup_rolemenu() and its kin write them: a role as an("Archeologist") or
 * an("Caveman/Cavewoman"), a race's noun, a gender's or an alignment's
 * adjective.  They come from roles[] and races[], so a role added there
 * brings its picture along, and role.c stays as it is.
 */

#include "hack.h"
#include "rhcreate.h"

/* The gender to draw a picture in, before or after it is picked. */
staticfn int
rh_creation_gender(void)
{
    if (flags.initgend == 0 || flags.initgend == 1)
        return flags.initgend == 1 ? FEMALE : MALE;
    if (flags.initrole >= 0 && !(roles[flags.initrole].allow & ROLE_MALE))
        return FEMALE;
    return MALE;
}

/* The body the hero will be drawn as, as far as it is known: hero_glyph
   (display.h) draws the race under showrace, the role otherwise. */
staticfn int
rh_creation_body(void)
{
    if (flags.initrace >= 0 && (flags.showrace || flags.initrole < 0))
        return races[flags.initrace].mnum;
    if (flags.initrole >= 0)
        return roles[flags.initrole].mnum;
    return PM_HUMAN;
}

int
rh_creation_hero_glyph(void)
{
    if (flags.initrole < 0 || flags.initrace < 0 || flags.initgend < 0)
        return NO_GLYPH;
    return monnum_to_glyph(rh_creation_body(), rh_creation_gender());
}

int
rh_creation_glyph(const char *str)
{
    const char *name = str;
    size_t len;
    int i;

    if (!strncmp(name, "an ", 3))
        name += 3;
    else if (!strncmp(name, "a ", 2))
        name += 2;
    len = strcspn(name, "/");
    for (i = 0; roles[i].name.m; i++) {
        if (strlen(roles[i].name.m) == len
            && !strncmp(name, roles[i].name.m, len))
            return monnum_to_glyph(roles[i].mnum,
                                   flags.initgend == 1 ? FEMALE
                                   : flags.initgend == 0 ? MALE
                                   : (roles[i].allow & ROLE_MALE) ? MALE
                                   : FEMALE);
        if (roles[i].name.f && !strcmp(name, roles[i].name.f))
            return monnum_to_glyph(roles[i].mnum, FEMALE);
    }
    for (i = 0; races[i].noun; i++)
        if (!strcmp(str, races[i].noun))
            return monnum_to_glyph(races[i].mnum, rh_creation_gender());
    for (i = 0; i < ROLE_GENDERS; i++)
        if (!strcmp(str, genders[i].adj))
            return monnum_to_glyph(rh_creation_body(), i == 1 ? FEMALE : MALE);
    for (i = 0; i < ROLE_ALIGNS; i++)
        if (!strcmp(str, aligns[i].adj))
            return altar_to_glyph(Align2amask(aligns[i].value));
    return NO_GLYPH;
}
