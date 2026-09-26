/* NetHack 5.0  rhhere.h */
/* Written for Rolehack by Lucas Ruiz, 2026-09-26. */
/* NetHack may be freely redistributed.  See license for details. */

/* Rolehack: what the context key and the pad's centre cell need to know,
   shared by the window ports.  The flags are the Android port's. */

#ifndef RHHERE_H
#define RHHERE_H

#define RH_HERE_OBJECT      0x01
#define RH_HERE_STAIRS_DOWN 0x02
#define RH_HERE_STAIRS_UP   0x04
#define RH_ADJ_CLOSED_DOOR  0x08
#define RH_ADJ_HOSTILE      0x10
#define RH_HERE_CONTAINER   0x20
#define RH_HERE_ALTAR       0x40 /* ROLEHACK: on an altar -- offers Sacrifice */
#define RH_ADJ_OPEN_DOOR    0x80 /* ROLEHACK: an open door beside you, clear to shut -- offers Close */

/* The flags for the hero's square and its neighbours, or -1 before there is
   a level to ask about.  When an adjacent hostile is seen, its name goes in
   mon (up to monsz bytes), else mon is emptied. */
extern int rh_here_context(char *mon, int monsz);

#endif /* RHHERE_H */
