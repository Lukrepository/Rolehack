/* NetHack 5.0 winshim.c    $NHDT-Date: 1596498345 2020/08/03 23:45:45 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.259 $ */
/* Copyright (c) Adam Powers, 2020                                */
/* NetHack may be freely redistributed.  See license for details. */

/* not an actual windowing port, but a fake win port for libnethack */

#include "hack.h"
#include "func_tab.h"
#include "rhdoll.h"
#include "rhhere.h"
#include <string.h>

#ifdef SHIM_GRAPHICS
#include <stdarg.h>
/* for cross-compiling to WebAssembly (WASM) */
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#endif

#undef SHIM_DEBUG

#ifdef SHIM_DEBUG
#define debugf printf
#else /* !SHIM_DEBUG */
#define debugf(...)
#endif /* SHIM_DEBUG */


/* shim_graphics_callback is the primary interface to shim graphics,
 * call this function with your declared callback function
 * and you will receive all the windowing calls
 */
#ifdef __EMSCRIPTEN__
/************
 * WASM interface
 ************/
EMSCRIPTEN_KEEPALIVE
static char *shim_callback_name = NULL;
void shim_graphics_set_callback(char *cbName);

void shim_graphics_set_callback(char *cbName) {
    if (shim_callback_name != NULL) free(shim_callback_name);
    if(cbName && strlen(cbName) > 0) {
        debugf("setting shim_callback_name: %s\n", cbName);
        shim_callback_name = strdup(cbName);
    } else {
        debugf("un-setting shim_callback_name\n");
        shim_callback_name = NULL;
    }
    /* TODO: free(shim_callback_name) during shutdown? */
}
void local_callback (const char *cb_name, const char *shim_name, void *ret_ptr, const char *fmt_str, void *args);

/* A2P = Argument to Pointer */
#define A2P &
/* P2V = Pointer to Void */
#define P2V (void *)
#define DECLCB(ret_type, name, fn_args, fmt, ...) \
ret_type name fn_args; \
\
ret_type name fn_args { \
    void *args[] = { __VA_ARGS__ }; \
    ret_type ret = (ret_type) 0; \
    debugf("SHIM GRAPHICS: " #name "\n"); \
    if (!shim_callback_name) return ret; \
    local_callback(shim_callback_name, #name, (void *)&ret, fmt, args); \
    debugf("SHIM GRAPHICS: " #name " done.\n"); \
    return ret; \
}

#define VDECLCB(name, fn_args, fmt, ...) \
void name fn_args; \
\
void name fn_args { \
    void *args[] = { __VA_ARGS__ }; \
    debugf("SHIM GRAPHICS: " #name "\n"); \
    if (!shim_callback_name) return; \
    local_callback(shim_callback_name, #name, NULL, fmt, args); \
    debugf("SHIM GRAPHICS: " #name " done.\n"); \
}

#else /* !__EMSCRIPTEN__ */

/************
 * libnethack.a interface
 ************/
typedef void(*shim_callback_t)(const char *name, void *ret_ptr, const char *fmt, ...);
static shim_callback_t shim_graphics_callback = NULL;
void shim_graphics_set_callback(shim_callback_t cb);

void shim_graphics_set_callback(shim_callback_t cb) {
    shim_graphics_callback = cb;
}

#define A2P
#define P2V
#define DECLCB(ret_type, name, fn_args, fmt, ...) \
ret_type name fn_args;\
\
ret_type name fn_args { \
    ret_type ret = (ret_type) 0; \
    debugf("SHIM GRAPHICS: " #name "\n"); \
    if (!shim_graphics_callback) return ret; \
    shim_graphics_callback(#name, (void *)&ret, fmt, ## __VA_ARGS__); \
    debugf("SHIM GRAPHICS: " #name " done.\n"); \
    return ret; \
}

#define VDECLCB(name, fn_args, fmt, ...) \
void name fn_args;\
\
void name fn_args { \
    debugf("SHIM GRAPHICS: " #name "\n"); \
    if (!shim_graphics_callback) return; \
    shim_graphics_callback(#name, NULL, fmt, ## __VA_ARGS__); \
    debugf("SHIM GRAPHICS: " #name " done.\n"); \
}
#endif /* __EMSCRIPTEN__ */

VDECLCB(shim_init_nhwindows,(int *argcp, char **argv), "vpp", P2V argcp, P2V argv)
DECLCB(boolean, shim_player_selection_or_tty,(void), "b")
VDECLCB(shim_askname,(void), "v")
VDECLCB(shim_get_nh_event,(void), "v")
VDECLCB(shim_exit_nhwindows,(const char *str), "vs", P2V str)
VDECLCB(shim_suspend_nhwindows,(const char *str), "vs", P2V str)
VDECLCB(shim_resume_nhwindows,(void), "v")
DECLCB(winid, shim_create_nhwindow, (int type), "ii", A2P type)
VDECLCB(shim_clear_nhwindow,(winid window), "vi", A2P window)
VDECLCB(shim_display_nhwindow,(winid window, boolean blocking), "vib", A2P window, A2P blocking)
VDECLCB(shim_destroy_nhwindow,(winid window), "vi", A2P window)
VDECLCB(shim_curs,(winid a, int x, int y), "viii", A2P a, A2P x, A2P y)
VDECLCB(shim_putstr,(winid w, int attr, const char *str), "viis", A2P w, A2P attr, P2V str)
VDECLCB(shim_display_file,(const char *name, boolean complain), "vsb", P2V name, A2P complain)
VDECLCB(shim_start_menu,(winid window, unsigned long mbehavior), "vii", A2P window, A2P mbehavior)
VDECLCB(shim_add_menu,
    (winid window, const glyph_info *glyphinfo, const ANY_P *identifier, char ch, char gch, int attr, int clr, const char *str, unsigned int itemflags),
    "vipp00iisi",
    A2P window, P2V glyphinfo, P2V identifier, A2P ch, A2P gch, A2P attr, A2P clr, P2V str, A2P itemflags)
VDECLCB(shim_end_menu,(winid window, const char *prompt), "vis", A2P window, P2V prompt)
/* XXX: shim_select_menu menu_list is an output */
DECLCB(int, shim_select_menu,(winid window, int how, MENU_ITEM_P **menu_list), "iiip", A2P window, A2P how, P2V menu_list)
DECLCB(char, shim_message_menu,(char let, int how, const char *mesg), "ciis", A2P let, A2P how, P2V mesg)
VDECLCB(shim_mark_synch,(void), "v")
VDECLCB(shim_wait_synch,(void), "v")
VDECLCB(shim_cliparound,(int x, int y), "vii", A2P x, A2P y)
VDECLCB(shim_update_positionbar,(char *posbar), "vs", P2V posbar)
VDECLCB(shim_print_glyph,(winid w, coordxy x, coordxy y, const glyph_info *glyphinfo, const glyph_info *bkglyphinfo), "vi11pp", A2P w, A2P x, A2P y, P2V glyphinfo, P2V bkglyphinfo)
VDECLCB(shim_raw_print,(const char *str), "vs", P2V str)
VDECLCB(shim_raw_print_bold,(const char *str), "vs", P2V str)
DECLCB(int, shim_nhgetch,(void), "i")
DECLCB(int, shim_nh_poskey,(coordxy *x, coordxy *y, int *mod), "ippp", P2V x, P2V y, P2V mod)
VDECLCB(shim_nhbell,(void), "v")
DECLCB(int, shim_doprev_message,(void),"iv")
DECLCB(char, shim_yn_function,(const char *query, const char *resp, char def), "css0", P2V query, P2V resp, A2P def)
VDECLCB(shim_getlin,(const char *query, char *bufp), "vsp", P2V query, P2V bufp)
DECLCB(int,shim_get_ext_cmd,(void),"iv")
VDECLCB(shim_number_pad,(int state), "vi", A2P state)
VDECLCB(shim_delay_output,(void), "v")
VDECLCB(shim_change_color,(int color, long rgb, int reverse), "viii", A2P color, A2P rgb, A2P reverse)
VDECLCB(shim_change_background,(int white_or_black), "vi", A2P white_or_black)
DECLCB(short, set_shim_font_name,(winid window_type, char *font_name),"2is", A2P window_type, P2V font_name)
DECLCB(char *,shim_get_color_string,(void),"sv")

VDECLCB(shim_preference_update, (const char *pref), "vp", P2V pref)
DECLCB(char *,shim_getmsghistory, (boolean init), "sb", A2P init)
VDECLCB(shim_putmsghistory, (const char *msg, boolean restoring_msghist), "vsb", P2V msg, A2P restoring_msghist)
VDECLCB(shim_status_init, (void), "v")
VDECLCB(shim_status_enablefield,
    (int fieldidx, const char *nm, const char *fmt, boolean enable),
    "vippb",
    A2P fieldidx, P2V nm, P2V fmt, A2P enable)
/* XXX: the second argument to shim_status_update is sometimes an integer and sometimes a pointer */
VDECLCB(shim_status_update,
    (int fldidx, genericptr_t ptr, int chg, int percent, int color, unsigned long *colormasks),
    "vipiiip",
    A2P fldidx, P2V ptr, A2P chg, A2P percent, A2P color, P2V colormasks)
#ifdef __EMSCRIPTEN__
/* XXX: calling repopulate_perminvent() from shim_update_inventory() causes reentrancy that breaks emscripten Asyncify */
/* this should be fine since according to windows.doc, the only purpose of shim_update_inventory() is to call repopulate_perminvent() */
void shim_update_inventory(int a1 UNUSED) {
    if(iflags.perm_invent) {
        repopulate_perminvent();
    }
}

void shim_player_selection() {
    boolean do_genl_player_setup = shim_player_selection_or_tty();
    if (do_genl_player_setup) {
        genl_player_setup(80);
    }
}

win_request_info *
shim_ctrl_nhwindow(
    winid window UNUSED,
    int request UNUSED,
    win_request_info *wri UNUSED) {
    return (win_request_info *) 0;
}

#ifdef INSURANCE
/* Rolehack web: closing the page is how a player stops, at any moment, and
   it must neither lose the game nor bring back an earlier one.  So whenever
   the game waits for the player it takes NetHack's own checkpoint (the one
   INSURANCE takes at each level change: the current level, and the rest of
   the game in the lock file), and the page copies whatever changed to the
   browser's storage at once (web.js); the next start rebuilds a save file
   from it (libnhmain.c).  Waiting for the player is also where a hangup
   saves the game (end_of_input()), in the middle of a command or not.
   Once the game is over the checkpoint is removed, so closing the page at
   "You die..." can't bring the hero back; once it is saved there is
   nothing worth a checkpoint (dosave0()). */
EM_JS(void, web_waiting, (void), {
    if (globalThis.rolehackWaiting)
        globalThis.rolehackWaiting();
});

static void
web_checkpoint(void)
{
    static boolean cleared = FALSE;

    if (program_state.gameover) {
        if (!cleared) {
            cleared = TRUE;
            clearlocks();
        }
    } else if (flags.ins_chkpt && program_state.in_moveloop
               && program_state.something_worth_saving
               && !program_state.saving && !program_state.restoring
               && !program_state.in_getlev && !program_state.in_checkpoint
               && !program_state.in_self_recover
               && !program_state.freeingdata && !program_state.exiting
               && !program_state.panicking && !program_state.done_hup) {
        save_currentstate();
    }
    web_waiting();
}

static void
web_display_nhwindow(winid window, boolean blocking)
{
    if (blocking || (window != WIN_MAP && window != WIN_MESSAGE
                     && window != WIN_STATUS))
        web_checkpoint();
    shim_display_nhwindow(window, blocking);
}

static int
web_select_menu(winid window, int how, MENU_ITEM_P **menu_list)
{
    web_checkpoint();
    return shim_select_menu(window, how, menu_list);
}

static int
web_nhgetch(void)
{
    web_checkpoint();
    return shim_nhgetch();
}

static int
web_nh_poskey(coordxy *x, coordxy *y, int *mod)
{
    web_checkpoint();
    return shim_nh_poskey(x, y, mod);
}

static int
web_doprev_message(void)
{
    web_checkpoint();
    return shim_doprev_message();
}

static char
web_yn_function(const char *query, const char *resp, char def)
{
    web_checkpoint();
    return shim_yn_function(query, resp, def);
}

static void
web_getlin(const char *query, char *bufp)
{
    web_checkpoint();
    shim_getlin(query, bufp);
}

/* '#' opens a menu of the commands, as gurrhack's Android port does
   (do_ext_cmd_menu() in winandroid.c): the everyday ones lettered a-z and
   A-Z, then '*' for every command.  A text field with suggestions was the
   worse thing to use with a thumb (Lucas, 2026-09-27). */
static int
web_ext_cmd_menu(boolean complete)
{
    winid wid;
    int i, count, what;
    menu_item *selected = (menu_item *) 0;
    anything any = cg.zeroany;
    char accelerator = 'a';
    const char *ptr;

    wid = create_nhwindow(NHW_MENU);
    start_menu(wid, MENU_BEHAVE_STANDARD);
    for (i = 0; (ptr = extcmdlist[i].ef_txt) != 0; i++) {
        int flgs = extcmdlist[i].flags;

        if ((flgs & WIZMODECMD) && !wizard)
            continue;
        if (!complete && !(flgs & AUTOCOMPLETE) && !(flgs & WIZMODECMD))
            continue;
        any.a_int = i + 1;
        add_menu(wid, &nul_glyphinfo, &any, accelerator, 0, ATR_NONE, NO_COLOR,
                 ptr, MENU_ITEMFLAGS_NONE);
        /* a-z, A-Z, then none */
        if (accelerator == 'z')
            accelerator = 'A';
        else if (accelerator == 'Z')
            accelerator = 0;
        else if (accelerator)
            accelerator++;
    }
    any.a_int = i + 1;
    if (!complete)
        add_menu(wid, &nul_glyphinfo, &any, '*', 0, ATR_NONE, NO_COLOR,
                 "(list everything)", MENU_ITEMFLAGS_NONE);
    end_menu(wid, "Extended command");
    count = select_menu(wid, PICK_ONE, &selected);
    what = count > 0 ? selected->item.a_int - 1 : -1;
    if (selected)
        free((genericptr_t) selected);
    destroy_nhwindow(wid);
    return (!complete && what == i) ? web_ext_cmd_menu(TRUE) : what;
}

static int
web_get_ext_cmd(void)
{
    web_checkpoint();
    return web_ext_cmd_menu(FALSE);
}

#define WAITS(fn) web_##fn
#endif /* INSURANCE */

/* Rolehack web: the window system says it is up once it is initialised, as
   every window port does (wintty.c when the message window opens,
   winandroid.c in and_init_nhwindows()).  The shim never did, so
   really_done() never called exit_nhwindows() and the page never learnt
   that a game had ended -- it sat on the last question looking hung (Lucas,
   2026-09-27) -- the tombstone went unshown, and getlock() asked about an
   old game on stdin, which a page does not have. */
static void
web_init_nhwindows(int *argcp, char **argv)
{
    shim_init_nhwindows(argcp, argv);
    iflags.window_inited = TRUE;
}

static void
web_exit_nhwindows(const char *str)
{
    shim_exit_nhwindows(str);
    iflags.window_inited = FALSE;
}
#define UPDOWN(fn) web_##fn
#else /* !__EMSCRIPTEN__ */
VDECLCB(shim_player_selection, (void), "v")
VDECLCB(shim_update_inventory,(int a1 UNUSED), "vi", A2P a1)
DECLCB(win_request_info *, shim_ctrl_nhwindow,
    (winid window, int request, win_request_info *wri),
    "viip",
    A2P window, A2P request, P2V wri)
#endif

/* the procedures that wait for the player; web_checkpoint() comes first */
#ifndef WAITS
#define WAITS(fn) shim_##fn
#endif
/* the window system coming up and going down */
#ifndef UPDOWN
#define UPDOWN(fn) shim_##fn
#endif

/* Interface definition used in windows.c */
struct window_procs shim_procs = {
    WPID(shim),
    (0
     | WC_ASCII_MAP
     | WC_MOUSE_SUPPORT
     | WC_COLOR | WC_HILITE_PET | WC_INVERSE | WC_EIGHT_BIT_IN),
    (0
#if defined(SELECTSAVED)
     | WC2_SELECTSAVED
#endif
#if defined(STATUS_HILITES)
     | WC2_HILITE_STATUS | WC2_HITPOINTBAR | WC2_FLUSH_STATUS
     | WC2_RESET_STATUS
#endif
     | WC2_DARKGRAY | WC2_SUPPRESS_HIST | WC2_STATUSLINES),
    {1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1},   /* color availability */
    UPDOWN(init_nhwindows), shim_player_selection, shim_askname, shim_get_nh_event,
    UPDOWN(exit_nhwindows), shim_suspend_nhwindows, shim_resume_nhwindows,
    shim_create_nhwindow, shim_clear_nhwindow, WAITS(display_nhwindow),
    shim_destroy_nhwindow, shim_curs, shim_putstr, genl_putmixed,
    genl_display_file, shim_start_menu, shim_add_menu, shim_end_menu,
    WAITS(select_menu), shim_message_menu, shim_mark_synch,
    shim_wait_synch,
#ifdef CLIPPING
    shim_cliparound,
#endif
#ifdef POSITIONBAR
    shim_update_positionbar,
#endif
    shim_print_glyph, shim_raw_print, shim_raw_print_bold, WAITS(nhgetch),
    WAITS(nh_poskey), shim_nhbell, WAITS(doprev_message),
    WAITS(yn_function), WAITS(getlin), WAITS(get_ext_cmd), shim_number_pad,
    shim_delay_output,
#ifdef CHANGE_COLOR /* the Mac uses a palette device */
    shim_change_color,
#ifdef MAC
    shim_change_background, set_shim_font_name,
#endif
    shim_get_color_string,
#endif

    genl_outrip,
    shim_preference_update,
    shim_getmsghistory, shim_putmsghistory,
    genl_status_init,
    genl_status_finish, genl_status_enablefield,
#ifdef STATUS_HILITES
    shim_status_update,
#else
    genl_status_update,
#endif
    genl_can_suspend_yes,
    shim_update_inventory,
    shim_ctrl_nhwindow,
};

#ifdef __EMSCRIPTEN__
/* convert the C callback to a JavaScript callback */
EM_JS(void, local_callback, (const char *cb_name, const char *shim_name, void *ret_ptr, const char *fmt_str, void *args), {
    // Asyncify.handleAsync() is the more logical choice here; however, the stack unrolling in Asyncify is performed by
    // function call analysis during compilation. Since we are using an indirect callback (cb_name), it can't predict the stack
    // unrolling and it crashes. Thus we use Asyncify.handleSleep() and wakeUp() to make sure that async doesn't break
    // Asyncify. For details, see: https://emscripten.org/docs/porting/asyncify.html#optimizing
    Asyncify.handleSleep(wakeUp => {
        // convert callback arguments to proper JavaScript variadic arguments
        let name = UTF8ToString(shim_name);
        let fmt = UTF8ToString(fmt_str);
        let cbName = UTF8ToString(cb_name);
        // console.log("local_callback:", cbName, fmt, name);

        // get pointer / type conversion helpers
        let getPointerValue = globalThis.nethackGlobal.helpers.getPointerValue;
        let setPointerValue = globalThis.nethackGlobal.helpers.setPointerValue;

        reentryMutexLock(name);

        let argTypes = fmt.split("");
        let retType = argTypes.shift();

        // build array of JavaScript args from WASM parameters
        let jsArgs = [];
        for (let i = 0; i < argTypes.length; i++) {
            let ptr = args + (4*i);
            let val = getArg(name, ptr, argTypes[i]);
            jsArgs.push(val);
        }

        // do the callback
        let userCallback = globalThis[cbName];
        userCallback.call(this, name, ... jsArgs).then((retVal) => {
            // save the return value
            setPointerValue(name, ret_ptr, retType, retVal);
            reentryMutexUnlock();
            try {
                wakeUp();
            } catch (e) {
                
            }
        });

        function getArg(name, ptr, type) {
            return (type === "p") ? getValue(ptr, "*") : getPointerValue(name, getValue(ptr, "*"), type);
        }

        function reentryMutexLock(name) {
            globalThis.nethackGlobal = globalThis.nethackGlobal || {};
            if(globalThis.nethackGlobal.shimFunctionRunning) {
                console.error(`'${name}' attempting second call to 'local_callback' before '${globalThis.nethackGlobal.shimFunctionRunning}' has finished, will crash emscripten Asyncify. For details see: emscripten.org/docs/porting/asyncify.html#reentrancy`);
            }
            globalThis.nethackGlobal.shimFunctionRunning = name;
        }

        function reentryMutexUnlock() {
            globalThis.nethackGlobal.shimFunctionRunning = null;
        }
    });
})
#endif /* __EMSCRIPTEN__ */

#ifdef __EMSCRIPTEN__
/*
 * Rolehack web port: small accessors for the JavaScript window code, so it
 * never has to know struct layouts.
 */

/* a menu identifier is copied by value when the item is added, because
   the core reuses one 'anything' for every add_menu() call */
_Static_assert(sizeof (anything) == 8, "web menu ids are two 32-bit words");

EMSCRIPTEN_KEEPALIVE int web_any_word(const anything *id, int which);
EMSCRIPTEN_KEEPALIVE menu_item *web_menu_alloc(int n);
EMSCRIPTEN_KEEPALIVE void web_menu_set(menu_item *list, int i, int lo,
                                       int hi, int count);
EMSCRIPTEN_KEEPALIVE int web_glyphinfo(const glyph_info *ginfo, int which);
EMSCRIPTEN_KEEPALIVE int web_extcmd_find(const char *txt);
EMSCRIPTEN_KEEPALIVE const char *web_extcmd_name(int i);
EMSCRIPTEN_KEEPALIVE int *web_hero_look(void);
EMSCRIPTEN_KEEPALIVE int web_here_flags(void);
EMSCRIPTEN_KEEPALIVE const char *web_here_monster(void);
EMSCRIPTEN_KEEPALIVE int web_wizard(void);

int
web_any_word(const anything *id, int which)
{
    int32_t w[2];

    (void) memcpy(w, id, sizeof w);
    return w[which & 1];
}

/* the core frees the array returned through select_menu() */
menu_item *
web_menu_alloc(int n)
{
    return (menu_item *) alloc((unsigned) n * sizeof (menu_item));
}

void
web_menu_set(menu_item *list, int i, int lo, int hi, int count)
{
    int32_t w[2];

    w[0] = lo, w[1] = hi;
    (void) memset(&list[i], 0, sizeof list[i]);
    (void) memcpy(&list[i].item, w, sizeof w);
    list[i].count = count;
}

int
web_glyphinfo(const glyph_info *ginfo, int which)
{
    switch (which) {
    case 0:
        return ginfo->glyph;
    case 1:
        return ginfo->ttychar;
    case 2:
        return ginfo->gm.sym.color;
    case 3:
        return (int) ginfo->gm.glyphflags;
    case 4:
        return ginfo->gm.tileidx;
    case 5:
        return (int) ginfo->framecolor;
    }
    return 0;
}

/* get_ext_cmd() answers with an index into extcmdlist[] */
int
web_extcmd_find(const char *txt)
{
    int i;

    for (i = 0; extcmdlist[i].ef_txt; i++)
        if (!strcmpi(extcmdlist[i].ef_txt, txt))
            return i;
    return -1;
}

/* names for the page's completion list; NULL past the end */
const char *
web_extcmd_name(int i)
{
    return extcmdlist[i].ef_txt;
}

/* the paper doll's look (rhdoll.c), read by the page as it draws; colours
   stay NetHack's, since the page tints from the tiles themselves */
int *
web_hero_look(void)
{
    static int look[RH_DOLL_LEN];

    return rh_hero_look(look, (int (*)(int)) 0) ? look : (int *) 0;
}

/* the context key's question (rhhere.c): the flags now, -1 before a level
   exists; web_here_monster() is the hostile beside the hero it last named */
static char web_here_mon[BUFSZ];

int
web_here_flags(void)
{
    return rh_here_context(web_here_mon, (int) sizeof web_here_mon);
}

const char *
web_here_monster(void)
{
    return web_here_mon;
}

/* debug mode, so the drawers can offer the wizard-mode commands */
int
web_wizard(void)
{
    return wizard ? 1 : 0;
}
#endif /* __EMSCRIPTEN__ */

#endif /* SHIM_GRAPHICS */
