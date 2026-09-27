/* NetHack 5.0  rhcreate.h */
/* Written for Rolehack by Lucas Ruiz, 2026-09-27. */
/* NetHack may be freely redistributed.  See license for details. */

/* Rolehack: pictures for player selection's menus (role.c,
   genl_player_setup()), shared by the window ports.  See rhcreate.c. */

#ifndef RHCREATE_H
#define RHCREATE_H

/* The glyph for a player-selection entry, found by its words, or NO_GLYPH
   for one that is not a role, race, gender or alignment ("Random"). */
extern int rh_creation_glyph(const char *str);

/* The finished hero as the map will draw it, for "Is this ok?", or NO_GLYPH
   while role, race or gender is still open. */
extern int rh_creation_hero_glyph(void);

#endif /* RHCREATE_H */
