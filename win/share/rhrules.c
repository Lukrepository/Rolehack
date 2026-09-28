/* NetHack 5.0	rhrules.c */
/* Written for Rolehack by Lucas Ruiz, 2026-09-28. */
/* NetHack may be freely redistributed.  See license for details. */

/*
 * Message rules from the message history: vanilla's MSGTYPE (show, hide,
 * norep, stop), made reachable on a touch screen (the message band research,
 * step 5).  A long press on a line of the history makes a rule from it; GAME
 * -> Message rules lists them, the last that matches first in effect, and
 * takes any away.  The rules are the core's own list (gp.plinemsg_types,
 * options.c), so the O menu's "message types" sees the same ones; the window
 * port keeps them from game to game with rh_rules_serial()/rh_rules_load().
 * None ship with the game: a rule is the player's to make.
 *
 * Shared by the phone (sys/android/winandroid.c) and the web
 * (win/shim/winshim.c); every dialog is an ordinary NetHack menu or line.
 */

#include "hack.h"
#include "nhregex.h"
#include "rhrules.h"

static const struct rh_rule_type {
    const char *name;   /* MSGTYPE's own word */
    int typ;
    char let;
    const char *what;
} rh_types[] = {
    { "stop",  MSGTYP_STOP,   'm', "Stop at --More-- after it" },
    { "hide",  MSGTYP_NOSHOW, 'h', "Hide it (it won't reach the history either)" },
    { "norep", MSGTYP_NOREP,  'r', "Hide it when it repeats the message before" },
    { "show",  MSGTYP_NORMAL, 's', "Show it as usual (undoes an earlier rule)" },
};

static const char *
rh_type_name(int typ)
{
    int i;

    for (i = 0; i < SIZE(rh_types); i++)
        if (rh_types[i].typ == typ)
            return rh_types[i].name;
    return "show";
}

/* A message as the pattern that matches it: POSIX extended regex, the
   specials escaped.  MSGTYPE's own syntax cannot quote a double quote, so
   one becomes '.', which matches it.  Two or more spaces -- NetHack puts two
   after a sentence -- become " +": an options file keeps only one space of
   a run (its lines are munged), and " +" still matches them all. */
static void
rh_pattern_of(const char *msg, char *out, size_t outsz)
{
    size_t n = 0;

    for (; *msg && n + 3 < outsz; msg++) {
        if (*msg == ' ' && msg[1] == ' ') {
            while (msg[1] == ' ')
                msg++;
            out[n++] = ' ';
            out[n++] = '+';
            continue;
        }
        if (*msg == '"') {
            out[n++] = '.';
            continue;
        }
        if (strchr("\\.[](){}*+?|^$", *msg))
            out[n++] = '\\';
        out[n++] = *msg;
    }
    out[n] = '\0';
}

/* Whether a pattern compiles; if not, why, in errbuf */
static boolean
rh_pattern_ok(const char *pattern, char *errbuf)
{
    struct nhregex *re = regex_init();
    boolean ok;

    *errbuf = '\0';
    if (!re)
        return FALSE;
    ok = regex_compile(pattern, re);
    if (!ok) {
        char *desc = regex_error_desc(re, errbuf);

        if (desc && desc != errbuf)
            Strcpy(errbuf, desc);
    }
    regex_free(re);
    return ok;
}

static boolean
rh_rule_add(int typ, const char *pattern)
{
    char buf[BUFSZ];

    Snprintf(buf, sizeof buf, "%s \"%s\"", rh_type_name(typ), pattern);
    return msgtype_parse_add(buf);
}

/* The rules, oldest first: the core keeps them newest first, and the first
   that matches is the one that counts, so the last one made wins. */
static int
rh_rules_list(struct plinemsg_type **out, int max)
{
    struct plinemsg_type *t;
    int n = 0, i;

    for (t = gp.plinemsg_types; t && n < max; t = t->next)
        out[n++] = t;
    for (i = 0; i < n / 2; i++) {
        struct plinemsg_type *x = out[i];

        out[i] = out[n - 1 - i];
        out[n - 1 - i] = x;
    }
    return n;
}

#define RH_RULES_MAX 200

/* Make a rule from a message: how to show it, and what it matches. */
void
rh_message_rule(const char *msg)
{
    char pattern[BUFSZ], buf[BUFSZ], err[BUFSZ];

    if (!msg || !*msg)
        return;
    rh_pattern_of(msg, pattern, 240);
    for (;;) {
        winid win = create_nhwindow(NHW_MENU);
        anything any = cg.zeroany;
        menu_item *pick = (menu_item *) 0;
        int i, n, choice;

        start_menu(win, MENU_BEHAVE_STANDARD);
        add_menu_heading(win, "The message");
        Snprintf(buf, sizeof buf, "  %s", msg);
        add_menu_str(win, buf);
        add_menu_heading(win, "Its rule matches");
        Snprintf(buf, sizeof buf, "  %s", pattern);
        add_menu_str(win, buf);
        add_menu_heading(win, "When it comes up");
        for (i = 0; i < SIZE(rh_types); i++) {
            any.a_int = i + 1;
            add_menu(win, &nul_glyphinfo, &any, rh_types[i].let, 0, ATR_NONE,
                     NO_COLOR, rh_types[i].what, MENU_ITEMFLAGS_NONE);
        }
        any.a_int = 100;
        add_menu(win, &nul_glyphinfo, &any, 'e', 0, ATR_NONE, NO_COLOR,
                 "Change what it matches first", MENU_ITEMFLAGS_NONE);
        end_menu(win, "Make a message rule");
        n = select_menu(win, PICK_ONE, &pick);
        choice = n > 0 ? pick[0].item.a_int : 0;
        if (pick)
            free((genericptr_t) pick);
        destroy_nhwindow(win);
        if (!choice)
            return;
        if (choice == 100) {
            getlin("Match what? (a regular expression; . matches any letter, .* anything)",
                   buf);
            if (*buf && *buf != '\033') {
                char *p;

                for (p = buf; *p; p++)
                    if (*p == '"')
                        *p = '.';
                (void) mungspaces(buf);
                if (!*buf)
                    ;
                else if (!rh_pattern_ok(buf, err))
                    custompline(OVERRIDE_MSGTYPE,
                                "That doesn't work as a pattern%s%s.",
                                *err ? ": " : "", err);
                else if (strlen(buf) < 240)
                    Strcpy(pattern, buf);
            }
            continue;
        }
        if (!rh_pattern_ok(pattern, err)) {
            custompline(OVERRIDE_MSGTYPE, "That doesn't work as a pattern%s%s.",
                        *err ? ": " : "", err);
            continue;
        }
        if (rh_rule_add(rh_types[choice - 1].typ, pattern))
            custompline(OVERRIDE_MSGTYPE,
                        "Message rule: %s \"%s\".  The last rule that matches wins.",
                        rh_types[choice - 1].name, pattern);
        return;
    }
}

/* The rules in order, the last that matches first in effect; pick any to
   take them away. */
void
rh_rules_menu(void)
{
    struct plinemsg_type *list[RH_RULES_MAX];
    int n = rh_rules_list(list, RH_RULES_MAX), i, picked;
    winid win;
    anything any = cg.zeroany;
    menu_item *pick = (menu_item *) 0;
    char buf[BUFSZ];

    if (!n) {
        custompline(OVERRIDE_MSGTYPE,
                    "No message rules yet.  Long-press a message in the history to make one.");
        return;
    }
    win = create_nhwindow(NHW_MENU);
    start_menu(win, MENU_BEHAVE_STANDARD);
    add_menu_str(win, "The last rule that matches a message wins.");
    add_menu_heading(win, "Pick rules to take away");
    for (i = 0; i < n; i++) {
        static const char lets[] =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

        any.a_int = i + 1;
        Snprintf(buf, sizeof buf, "%-5s  %s", rh_type_name(list[i]->msgtype),
                 list[i]->pattern);
        add_menu(win, &nul_glyphinfo, &any, i < 52 ? lets[i] : 0, 0,
                 ATR_NONE, NO_COLOR, buf, MENU_ITEMFLAGS_NONE);
    }
    end_menu(win, "Message rules");
    picked = select_menu(win, PICK_ANY, &pick);
    destroy_nhwindow(win);
    if (picked > 0) {
        /* keep the rest, in their order */
        static char keep_pat[RH_RULES_MAX][BUFSZ];
        int keep_typ[RH_RULES_MAX], k = 0, j;
        boolean gone[RH_RULES_MAX];

        for (i = 0; i < n; i++)
            gone[i] = FALSE;
        for (j = 0; j < picked; j++)
            gone[pick[j].item.a_int - 1] = TRUE;
        for (i = 0; i < n; i++)
            if (!gone[i]) {
                keep_typ[k] = list[i]->msgtype;
                Strcpy(keep_pat[k], list[i]->pattern);
                k++;
            }
        msgtype_free();
        for (i = 0; i < k; i++)
            (void) rh_rule_add(keep_typ[i], keep_pat[i]);
        custompline(OVERRIDE_MSGTYPE, "%d message rule%s taken away.", picked,
                    plur(picked));
    }
    if (pick)
        free((genericptr_t) pick);
}

/* The rules as text for the window port to keep: "type<TAB>pattern" a line,
   oldest first. */
const char *
rh_rules_serial(void)
{
    static char out[RH_RULES_MAX * 64];
    struct plinemsg_type *list[RH_RULES_MAX];
    int n = rh_rules_list(list, RH_RULES_MAX), i;
    size_t len = 0;

    out[0] = '\0';
    for (i = 0; i < n; i++) {
        size_t need = strlen(list[i]->pattern) + 8;

        if (len + need >= sizeof out)
            break;
        Snprintf(out + len, sizeof out - len, "%s\t%s\n",
                 rh_type_name(list[i]->msgtype), list[i]->pattern);
        len += strlen(out + len);
    }
    return out;
}

/* Kept rules back into the game, oldest first, leaving out any it already
   has (the options file's own MSGTYPE lines load first). */
void
rh_rules_load(const char *serial)
{
    char line[BUFSZ];
    const char *p = serial, *e;

    while (p && *p) {
        size_t len;
        char *tab;

        e = strchr(p, '\n');
        len = e ? (size_t) (e - p) : strlen(p);
        if (len < sizeof line) {
            struct plinemsg_type *t;
            boolean have = FALSE;
            int i, typ = -1;

            memcpy(line, p, len);
            line[len] = '\0';
            if ((tab = strchr(line, '\t')) != 0) {
                *tab++ = '\0';
                for (i = 0; i < SIZE(rh_types); i++)
                    if (!strcmp(line, rh_types[i].name))
                        typ = rh_types[i].typ;
                for (t = gp.plinemsg_types; t; t = t->next)
                    if (t->msgtype == typ && !strcmp(t->pattern, tab))
                        have = TRUE;
                if (typ >= 0 && *tab && !have)
                    (void) rh_rule_add(typ, tab);
            }
        }
        p = e ? e + 1 : 0;
    }
}
