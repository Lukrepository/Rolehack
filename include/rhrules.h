/* NetHack 5.0	rhrules.h */
/* Written for Rolehack by Lucas Ruiz, 2026-09-28.  See ROLEHACK-CHANGES.md. */
/* NetHack may be freely redistributed.  See license for details. */

/* Rolehack: message rules from the message history (win/share/rhrules.c) */

#ifndef RHRULES_H
#define RHRULES_H

/* Keys the interface sends: make a rule from the history's chosen line
   (its text fetched by the window port), and open the rules' list.  Both
   are past any key NetHack reads, so nothing else can mistake them. */
#define RH_KEY_RULE  0xE001
#define RH_KEY_RULES 0xE002

extern void rh_message_rule(const char *);
extern void rh_rules_menu(void);
extern const char *rh_rules_serial(void);
extern void rh_rules_load(const char *);

#endif /* RHRULES_H */
