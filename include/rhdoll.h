/* NetHack 5.0  rhdoll.h */
/* Written for Rolehack by Lucas Ruiz, 2026-09-26. */
/* NetHack may be freely redistributed.  See license for details. */

/* Rolehack: the paper doll's core side, shared by the window ports. */

#ifndef RHDOLL_H
#define RHDOLL_H

#define RH_DOLL_SLOTS 11
#define RH_DOLL_LEN (4 + 3 * RH_DOLL_SLOTS + 3)
/* the words after the slots, at fixed places (version 3) */
#define RH_DOLL_SEED  (4 + 3 * RH_DOLL_SLOTS)  /* 37: the skin seed */
#define RH_DOLL_TONE  (RH_DOLL_SEED + 1)       /* 38: the skintone option */
#define RH_DOLL_FLAGS (RH_DOLL_SEED + 2)       /* 39: RH_DOLL_LEFTY; other bits 0 */
#define RH_DOLL_LEFTY 0x1                      /* the hero is left-handed (ULEFTY) */

/* Fill look[RH_DOLL_LEN] with what the hero wears and wields; see rhdoll.c
   for the layout.  to_rgb turns a NetHack colour into the port's RGB, or is
   null to leave the colour index.  Returns 0 when there is no hero to dress
   yet, or the game is over. */
extern int rh_hero_look(int *look, int (*to_rgb)(int));

#endif /* RHDOLL_H */
