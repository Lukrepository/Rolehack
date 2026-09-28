#include <string.h>
/* Changed for Rolehack by Lucas Ruiz, 2026-09-23 to 2026-09-28.  See ROLEHACK-CHANGES.md. */
#include <errno.h>
#include <jni.h>
#include <ctype.h>

#include "hack.h"
#include "rhrules.h"   /* Rolehack: message rules */
#include "func_tab.h"   /* for extended commands */
#include "dlb.h"

staticfn void and_init_nhwindows(int *, char **);
staticfn void and_player_selection(void);
staticfn void and_askname(void);
staticfn void and_get_nh_event(void) ;
staticfn void and_exit_nhwindows(const char *);
staticfn void and_suspend_nhwindows(const char *);
staticfn void and_resume_nhwindows(void);
staticfn winid and_create_nhwindow(int);
staticfn void and_clear_nhwindow(winid);
staticfn void and_display_nhwindow(winid, boolean);
staticfn void and_dismiss_nhwindow(winid);
staticfn void and_destroy_nhwindow(winid);
staticfn void and_curs(winid,int,int);
staticfn void and_putstr(winid, int, const char *);
staticfn void and_putmixed(winid, int, const char *);
staticfn void and_display_file(const char *, boolean);
staticfn void and_start_menu(winid, unsigned long);
staticfn void and_add_menu(winid,const glyph_info *, const anything *, char, char, int, int, const char *, unsigned int);
staticfn void and_end_menu(winid, const char *);
staticfn int and_select_menu(winid, int, menu_item **);
staticfn char and_message_menu(char, int, const char *);
staticfn void and_update_inventory(int);
staticfn void and_mark_synch(void);
staticfn void and_wait_synch(void);
#ifdef CLIPPING
staticfn void and_cliparound(int, int);
#endif
#ifdef POSITIONBAR
staticfn void and_update_positionbar(char *);
#endif
staticfn void and_print_glyph(winid,coordxy,coordxy,const glyph_info *,const glyph_info *);
staticfn void and_raw_print(const char *);
staticfn void and_raw_print_bold(const char *);
staticfn int and_nhgetch(void);
staticfn int and_nh_poskey(coordxy *, coordxy *, int *);
staticfn void and_nhbell(void);
staticfn int and_doprev_message(void);
staticfn char and_yn_function(const char *, const char *, char);
staticfn void and_getlin(const char *,char *);
staticfn int and_get_ext_cmd(void);
staticfn void and_number_pad(int);
staticfn void and_delay_output(void);
#ifdef CHANGE_COLOR
staticfn void and_change_color(int color, long rgb,int reverse);
staticfn char * and_get_color_string(void);
#endif
staticfn void and_start_screen(void);
staticfn void and_end_screen(void);
staticfn char* and_getmsghistory(boolean);
staticfn void and_putmsghistory(const char *, boolean);
staticfn void save_msg(const char* msg);
staticfn void and_status_update(int, genericptr_t, int, int, int, unsigned long *);
staticfn void and_status_flush(void);
staticfn win_request_info* and_ctrl_nhwindow(winid, int, win_request_info*);

int NetHackMain(int argc, char** argv);

struct window_procs and_procs = {
    WPID(and),
    WC_COLOR | WC_HILITE_PET | WC_INVERSE,  /* window port capability options supported */
    WC2_HILITE_STATUS | WC2_FLUSH_STATUS
    | WC2_URGENT_MESG,   /* additional window port capability options supported;
                            Rolehack: an urgent message ends an Esc at --More-- */
    {1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1},   /* color availability */
    and_init_nhwindows,
    and_player_selection,
    and_askname,
    and_get_nh_event,
    and_exit_nhwindows,
    and_suspend_nhwindows,
    and_resume_nhwindows,
    and_create_nhwindow,
    and_clear_nhwindow,
    and_display_nhwindow,
    and_destroy_nhwindow,
    and_curs,
    and_putstr,
    and_putmixed,
    and_display_file,
    and_start_menu,
    and_add_menu,
    and_end_menu,
    and_select_menu,
    and_message_menu,
    and_mark_synch,
    and_wait_synch,
#ifdef CLIPPING
    and_cliparound,
#endif
#ifdef POSITIONBAR
    and_update_positionbar,
#endif
    and_print_glyph,
    and_raw_print,
    and_raw_print_bold,
    and_nhgetch,
    and_nh_poskey,
    and_nhbell,
    and_doprev_message,
    and_yn_function,
    and_getlin,
    and_get_ext_cmd,
    and_number_pad,
    and_delay_output,
#ifdef CHANGE_COLOR
    and_change_color,
    and_get_color_string,
#endif
    genl_outrip,
    genl_preference_update,
    and_getmsghistory,
    and_putmsghistory,
    genl_status_init,
    genl_status_finish,
    genl_status_enablefield,
    and_status_update,
    genl_can_suspend_no,
    and_update_inventory,
    and_ctrl_nhwindow,
};

static void and_n_getline(const char* question, char* buf, int nMax, int showLog);
static void and_n_getline_r(const char* question, char* buf, int nMax, int showLog, int reentry);

//____________________________________________________________________________________
// Java objects. Make sure they are not garbage collected!
static JNIEnv* jEnv;
static jclass jApp;
static jobject jAppInstance;
static jmethodID jDebugLog;
static jmethodID jReceiveKey;
static jmethodID jReceivePosKey;
static jmethodID jCreateWindow;
static jmethodID jDisplayWindow;
static jmethodID jClearWindow;
static jmethodID jDestroyWindow;
static jmethodID jPutString;
static jmethodID jSetHealthColor;
static jmethodID jRedrawStatus;
static jmethodID jRawPrint;
static jmethodID jSetCursorPos;
static jmethodID jPrintTile;
static jmethodID jYNFunction;
static jmethodID jGetLine;
static jmethodID jStartMenu;
static jmethodID jAddMenu;
static jmethodID jEndMenu;
static jmethodID jSelectMenu;
static jmethodID jCliparound;
static jmethodID jDelayOutput;
static jmethodID jShowDPad;
static jmethodID jShowLog;
static jmethodID jSetUsername;
static jmethodID jSetNumPadOption;
static jmethodID jAskName;
static jmethodID jLoadSound;
static jmethodID jPlaySound;
static jmethodID jGetDumplogDir;
/* Rolehack: structured status for the mobile interface. */
static jmethodID jStatusField;
static jmethodID jPlayerInfo;
static jmethodID jHereContext;
static jmethodID jHeroLook;     /* Rolehack: the paper doll */
static jmethodID jCreation;     /* Rolehack: character creation's menus */
static jmethodID jMsgBand, jMsgRows, jMore, jMsgScroll;   /* Rolehack: the message band's --More-- */
static jmethodID jAnswers;      /* Rolehack: a question's answers on the pad */
static jmethodID jRuleText, jLoadRules, jSaveRules;   /* Rolehack: message rules (rhrules.c) */

static boolean quit_if_possible;
static boolean restoring_msghistory;

static char* msghistory[32];
static int msghistory_idx;
static int msghistory_idx0;

extern const char *status_fieldfmt[MAXBLSTATS];
#define MAXBLCONDITIONS 13
extern char *status_vals[MAXBLSTATS];
static int status_colors[MAXBLSTATS];
extern boolean status_activefields[MAXBLSTATS];
extern const struct conditions_t conditions[CONDITION_COUNT];
static unsigned long* cond_hilites;
static unsigned long active_conditions;


//____________________________________________________________________________________
//
// Helpers
//____________________________________________________________________________________
jbyteArray create_bytearray(const char* str)
{
    int len = str ? strlen(str) : 0;
    jbyteArray a = (*jEnv)->NewByteArray(jEnv, len);
    jbyte* e = (*jEnv)->GetByteArrayElements(jEnv, a, 0);
    memcpy(e, str, len);
    (*jEnv)->ReleaseByteArrayElements(jEnv, a, e, 0);
    return a;
    // return (*jEnv)->NewStringUTF(jEnv, str);
}

//____________________________________________________________________________________
void destroy_jobject(jstring jstr)
{
    (*jEnv)->DeleteLocalRef(jEnv, jstr);
}

#define JNICallV(func, ...) (*jEnv)->CallVoidMethod(jEnv, jAppInstance, func, ## __VA_ARGS__);
#define JNICallI(func, ...) (*jEnv)->CallIntMethod(jEnv, jAppInstance, func, ## __VA_ARGS__);
#define JNICallO(func, ...) (*jEnv)->CallObjectMethod(jEnv, jAppInstance, func, ## __VA_ARGS__);

/*
 * Rolehack: look up a method only the Rolehack UI has, tolerating its absence.
 *
 * GetMethodID() returns NULL *and* leaves a NoSuchMethodError pending when the
 * Java side lacks the method, and any later JNI call made with an exception
 * pending is an error -- CheckJNI, on in every debuggable build, aborts the
 * process.  Built against the stock ForkFront, which has none of these
 * methods, the game would die at launch.  Clearing the error leaves the ID
 * NULL; every caller already checks for that, so such a build simply runs as
 * the plain JodiJodington port.
 */
staticfn jmethodID rh_optional_method(const char *name, const char *sig)
{
    jmethodID id = (*jEnv)->GetMethodID(jEnv, jApp, name, sig);

    if((*jEnv)->ExceptionCheck(jEnv))
    {
        (*jEnv)->ExceptionClear(jEnv);
        id = 0;
    }
    return id;
}

/*
 * Rolehack: the message band pages as tty's top line does.  The band holds a
 * fixed number of rows (RhScreen: three in portrait, two in landscape); when
 * the next message will not fit, it shows --More-- and waits, as tty's
 * update_topl() does (win/tty/topl.c), so nothing the game says leaves the
 * screen unseen.  The interface measures (rhMsgRows, the wrap it draws with);
 * the core keeps the page, as tty keeps its line.  Esc at --More-- sends the
 * rest of the turn's messages to the log only, until the game next asks for
 * input; urgent messages and "You die" break through (tty's WIN_STOP and
 * ATR_URGENT).  The core's own --More-- requests (a MSGTYPE=stop rule's,
 * "You die...") used to be answered by ForkFront at once; they wait now.
 * With the pause turned off the band shows the newest and counts the rest,
 * but the core's own requests still wait.  (Lucas, 2026-09-28.)
 */
#define RH_LOG_ONLY (1 << 30)   /* NHW_Message.ATTR_LOG_ONLY: the log, not the band */
static int rh_page_rows;        /* rows this page has used */
static int rh_scroll;           /* a message longer than the band: the first row shown */
static boolean rh_new_page = TRUE;  /* the next message starts a page */
static boolean rh_unread;       /* nothing has acknowledged the page: tty's TOPLINE_NEED_MORE */
static boolean rh_page_fresh;   /* new since the player last acted; dims when they do */
static boolean rh_msg_stop;     /* Esc at --More-- */
static boolean rh_in_more;

/* the band's rows; negative when a full band shouldn't pause; 0, no band (the classic line) */
staticfn int rh_msg_band(void)
{
    if(!(jMsgBand && jMsgRows && jMore && jMsgScroll) || WIN_MESSAGE == WIN_ERR)
        return 0;
    return JNICallI(jMsgBand);
}

staticfn int rh_msg_rows(const char *str, int start)
{
    jbyteArray j = create_bytearray(str);
    int n = JNICallI(jMsgRows, j, start);
    destroy_jobject(j);
    return n;
}

staticfn void rh_start_page(void)
{
    JNICallV(jClearWindow, WIN_MESSAGE, 0);
    rh_page_rows = 0;
    rh_scroll = 0;
    rh_new_page = FALSE;
}

/* tty's more(): Space or Enter goes on, Esc skips the rest of the turn */
staticfn void rh_more(void)
{
    int c;

    rh_in_more = TRUE;
    JNICallV(jMore, 1);
    for(;;)
    {
        c = and_nhgetch();
        if(c == ' ' || c == '\n' || c == '\r')
            break;
        if(c == '\033')
        {
            rh_msg_stop = TRUE;
            break;
        }
    }
    JNICallV(jMore, 0);
    rh_in_more = FALSE;
    rh_unread = FALSE;
}

/* The player has acted: the page dims, the next message starts another, and
   an Esc at --More-- has run its course. */
staticfn void rh_msg_input(void)
{
    if(rh_in_more)
        return;
    rh_msg_stop = FALSE;
    rh_unread = FALSE;
    rh_new_page = TRUE;
    if(rh_page_fresh && rh_msg_band())
    {
        JNICallV(jClearWindow, WIN_MESSAGE, 0);
    }
    rh_page_fresh = FALSE;
}

/* Before a message goes out: wait at --More-- if the band is full.  Returns
   RH_LOG_ONLY for a message the band should not show. */
staticfn int rh_msg_place(const char *str, boolean urgent, int *bandp, int *rowsp)
{
    int band = rh_msg_band();

    *bandp = band;
    *rowsp = 0;
    if(!band)
        return 0;
    if(restoring_msghistory)
        return RH_LOG_ONLY;     /* a restored game's history: into the log, as tty's */
    if(rh_msg_stop && (urgent || !strncmp(str, "You die", 7)))
    {
        rh_msg_stop = FALSE;
        rh_new_page = TRUE;
    }
    if(rh_msg_stop)
        return RH_LOG_ONLY;
    if(rh_new_page)
        rh_start_page();
    if(band > 0)
    {
        int n = rh_msg_rows(str, rh_page_rows);

        if(rh_page_rows > 0 && rh_page_rows + n > rh_scroll + band)
        {
            rh_more();
            rh_start_page();
            n = rh_msg_rows(str, 0);
        }
        *rowsp = n;
    }
    return 0;
}

/* After it has gone out: a message longer than the band, a band at a time. */
staticfn void rh_msg_placed(int band, int rows)
{
    rh_page_rows += rows;
    rh_unread = TRUE;
    rh_page_fresh = TRUE;
    while(band > 0 && !rh_msg_stop && rh_page_rows - rh_scroll > band)
    {
        rh_more();
        if(rh_msg_stop)
            break;
        rh_scroll += band;
        JNICallV(jMsgScroll, rh_scroll);
        rh_unread = TRUE;
    }
}

/*
 * Rolehack: a question's answers on the movement pad (RhOverlay.showAnswers),
 * as the web port has them.  A question asked on the message line reads keys,
 * and the pad's keys go in as directions, which a key read throws away, so the
 * pad could not answer "Do you want to see your attributes? [ynq]" (Lucas,
 * 2026-09-28).  Its letters are sent while it waits; none takes them down.
 */
staticfn void rh_answers(const char *choices, char def)
{
    char letters[QBUFSZ];
    int n = 0;
    jbyteArray jb;

    if(!jAnswers)
        return;
    for(; choices && *choices && *choices != '\033' && n < (int) sizeof letters - 1; choices++)
        if(isalpha((uchar) *choices))
            letters[n++] = *choices;
    letters[n] = '\0';
    jb = create_bytearray(letters);
    JNICallV(jAnswers, jb, (int) def);
    destroy_jobject(jb);
}

/*
 * Rolehack: message rules (win/share/rhrules.c; the message band research,
 * step 5).  A long press on a line of the history closes it and sends
 * RH_KEY_RULE, and the line's text is fetched here; GAME -> Message rules
 * sends RH_KEY_RULES at the command prompt.  The rules are kept in the app's
 * settings (rhMsgRules) from game to game: loaded at the first command
 * prompt, saved whenever they change.  The options file's own MSGTYPE lines
 * load as they always did, first.
 */
static boolean rh_rules_restored;

staticfn char *rh_bytes_of(jbyteArray a)
{
    jsize len;
    char *buf;

    if(!a)
        return 0;
    len = (*jEnv)->GetArrayLength(jEnv, a);
    buf = (char *) alloc((unsigned) len + 1);
    (*jEnv)->GetByteArrayRegion(jEnv, a, 0, len, (jbyte *) buf);
    buf[len] = '\0';
    destroy_jobject(a);
    return buf;
}

staticfn void rh_rules_restore(void)
{
    char *kept;
    jbyteArray a;

    if(rh_rules_restored || !jLoadRules || !jSaveRules)
        return;
    rh_rules_restored = TRUE;
    a = (jbyteArray) JNICallO(jLoadRules);   /* (the macro ends its own statement) */
    kept = rh_bytes_of(a);
    if(kept)
    {
        rh_rules_load(kept);
        free(kept);
    }
}

staticfn void rh_rules_sync(void)
{
    static char *last;
    const char *now;
    jbyteArray jb;

    if(!rh_rules_restored)
        return;     /* an empty list before the kept one is in must not replace it */
    now = rh_rules_serial();
    if(last && !strcmp(last, now))
        return;
    if(last)
        free(last);
    last = dupstr(now);
    jb = create_bytearray(now);
    JNICallV(jSaveRules, jb);
    destroy_jobject(jb);
}

staticfn void rh_rule_from_log(void)
{
    char *text;
    jbyteArray a;

    if(!jRuleText)
        return;
    a = (jbyteArray) JNICallO(jRuleText);
    text = rh_bytes_of(a);
    if(text)
    {
        rh_message_rule(text);
        free(text);
    }
}

//____________________________________________________________________________________
void Java_com_tbd_forkfront_NetHackIO_RunNetHack(JNIEnv* env, jobject thiz, jstring path, jstring username)
{
    char* params[10];
    const char* pChars;

    jEnv = env;
    jAppInstance = thiz;
    jApp = (*jEnv)->GetObjectClass(jEnv, jAppInstance);
    jDebugLog = (*jEnv)->GetMethodID(jEnv, jApp, "debugLog", "([B)V");
    jReceiveKey = (*jEnv)->GetMethodID(jEnv, jApp, "receiveKeyCmd", "()I");
    jReceivePosKey = (*jEnv)->GetMethodID(jEnv, jApp, "receivePosKeyCmd", "(I[I)I");
    jCreateWindow = (*jEnv)->GetMethodID(jEnv, jApp, "createWindow", "(I)I");
    jClearWindow = (*jEnv)->GetMethodID(jEnv, jApp, "clearWindow", "(II)V");
    jDisplayWindow = (*jEnv)->GetMethodID(jEnv, jApp, "displayWindow", "(II)V");
    jDestroyWindow = (*jEnv)->GetMethodID(jEnv, jApp, "destroyWindow", "(I)V");
    jPutString = (*jEnv)->GetMethodID(jEnv, jApp, "putString", "(II[BII)V");
    jSetHealthColor = (*jEnv)->GetMethodID(jEnv, jApp, "setHealthColor", "(I)V");
    jRedrawStatus = (*jEnv)->GetMethodID(jEnv, jApp, "redrawStatus", "()V");
    jRawPrint = (*jEnv)->GetMethodID(jEnv, jApp, "rawPrint", "(I[B)V");
    jSetCursorPos = (*jEnv)->GetMethodID(jEnv, jApp, "setCursorPos", "(III)V");
    jPrintTile = (*jEnv)->GetMethodID(jEnv, jApp, "printTile", "(IIIIIII)V");
    jYNFunction = (*jEnv)->GetMethodID(jEnv, jApp, "ynFunction", "([B[BI)V");
    jGetLine = (*jEnv)->GetMethodID(jEnv, jApp, "getLine", "([BIII)Ljava/lang/String;");
    jStartMenu = (*jEnv)->GetMethodID(jEnv, jApp, "startMenu", "(I)V");
    jAddMenu = (*jEnv)->GetMethodID(jEnv, jApp, "addMenu", "(IIJIII[BII)V");
    jEndMenu = (*jEnv)->GetMethodID(jEnv, jApp, "endMenu", "(I[B)V");
    jSelectMenu = (*jEnv)->GetMethodID(jEnv, jApp, "selectMenu", "(III)[J");
    jCliparound = (*jEnv)->GetMethodID(jEnv, jApp, "cliparound", "(IIII)V");
    jDelayOutput = (*jEnv)->GetMethodID(jEnv, jApp, "delayOutput", "()V");
    jShowDPad = (*jEnv)->GetMethodID(jEnv, jApp, "askDirection", "()V");
    jShowLog = (*jEnv)->GetMethodID(jEnv, jApp, "showLog", "(I)V");
    jSetUsername = (*jEnv)->GetMethodID(jEnv, jApp, "setUsername", "([B)V");
    jSetNumPadOption = (*jEnv)->GetMethodID(jEnv, jApp, "setNumPadOption", "(I)V");
    jAskName = (*jEnv)->GetMethodID(jEnv, jApp, "askName", "(I[Ljava/lang/String;)Ljava/lang/String;");
    jLoadSound = (*jEnv)->GetMethodID(jEnv, jApp, "loadSound", "([B)V");
    jPlaySound = (*jEnv)->GetMethodID(jEnv, jApp, "playSound", "([BI)V");
    jGetDumplogDir = (*jEnv)->GetMethodID(jEnv, jApp, "getDumplogDir", "()Ljava/lang/String;");
    /* Rolehack: structured status for the mobile interface.  Optional, so a
       build against the stock ForkFront still runs; see rh_optional_method(). */
    jStatusField = rh_optional_method("statusField", "(I[BI)V");
    jPlayerInfo = rh_optional_method("setPlayerInfo", "([B[B[BI)V");
    jHereContext = rh_optional_method("hereContext", "(I[B)V");
    jHeroLook = rh_optional_method("heroLook", "([I)V");
    jCreation = rh_optional_method("rhCreation", "(III)V");
    jMsgBand = rh_optional_method("rhMsgBand", "()I");
    jMsgRows = rh_optional_method("rhMsgRows", "([BI)I");
    jMore = rh_optional_method("rhMore", "(I)V");
    jMsgScroll = rh_optional_method("rhMsgScroll", "(I)V");
    jAnswers = rh_optional_method("rhAnswers", "([BI)V");
    jRuleText = rh_optional_method("rhRuleText", "()[B");
    jLoadRules = rh_optional_method("rhLoadRules", "()[B");
    jSaveRules = rh_optional_method("rhSaveRules", "([B)V");

    if(!(jReceiveKey && jReceivePosKey && jCreateWindow && jClearWindow && jDisplayWindow &&
            jDestroyWindow && jPutString && jRawPrint && jSetCursorPos && jPrintTile &&
            jYNFunction && jGetLine && jStartMenu && jAddMenu && jEndMenu && jSelectMenu &&
            jCliparound && jDelayOutput && jShowDPad && jShowLog && jSetUsername &&
            jSetNumPadOption && jAskName && jSetHealthColor && jRedrawStatus &&
            jLoadSound && jPlaySound && jGetDumplogDir))
    {
        debuglog("baaaaad");
        return;
    }

    pChars = (*jEnv)->GetStringUTFChars(jEnv, path, 0);
    if(chdir(pChars) != 0)
        debuglog("chdir failed %d", errno);
    (*jEnv)->ReleaseStringUTFChars(jEnv, path, pChars);

    params[0] = "nethack";
    params[1] = 0;

    NetHackMain(1, params);
}

//____________________________________________________________________________________
boolean SaveAndExit()
{
    if(!program_state.gameover && program_state.something_worth_saving)
    {
        program_state.done_hup = 0;
        clear_nhwindow(WIN_MESSAGE);
        pline("Saving...");
        if(dosave0())
        {
            program_state.something_worth_saving = 0;
            u.uhp = -1;     /* universal game's over indicator */
            /* make sure they see the Saving message */
            display_nhwindow(WIN_MESSAGE, TRUE);
            exit_nhwindows("Be seeing you...");
            nh_terminate(EXIT_SUCCESS);
        }
        return FALSE;
    }
    return TRUE;
}

//____________________________________________________________________________________
void Java_com_tbd_forkfront_NetHackIO_SaveNetHackState(JNIEnv* env, jobject thiz)
{
    if(!program_state.gameover && program_state.something_worth_saving)
        save_currentstate();
}

//____________________________________________________________________________________
void quit_possible()
{
    if(quit_if_possible)
    {
        quit_if_possible = FALSE;
        if(!SaveAndExit())
        {
            if(and_yn_function("Error saving game. Quit anyway?", ynchars, 'n') == 'y')
                nh_terminate(EXIT_SUCCESS);
        }
    }
}

//____________________________________________________________________________________
void set_username()
{
    jstring username = create_bytearray(svp.plname);
    JNICallV(jSetUsername, username);
    destroy_jobject(username);

}

//____________________________________________________________________________________
void debuglog(const char *fmt, ...)
{
    char buf[256];

    if(fmt != 0)
    {
        va_list args;
        va_start(args, fmt);
        vsnprintf(buf, sizeof(buf), fmt, args);
        va_end(args);
    }
    else
    {
        strcpy(buf, "(null)");
    }

    jbyteArray jstr = create_bytearray(buf);
    JNICallV(jDebugLog, jstr);
    destroy_jobject(jstr);
}

//____________________________________________________________________________________
//init_nhwindows(int* argcp, char** argv)
//      -- Initialize the windows used by NetHack.  This can also
//         create the standard windows listed at the top, but does
//         not display them.
//      -- Any commandline arguments relevant to the windowport
//         should be interpreted, and *argcp and *argv should
//         be changed to remove those arguments.
//      -- When the message window is created, the variable
//         iflags.window_inited needs to be set to TRUE.  Otherwise
//         all plines() will be done via raw_print().
//      ** Why not have init_nhwindows() create all of the "standard"
//      ** windows?  Or at least all but WIN_INFO?  -dean
void and_init_nhwindows(int* argcp, char** argv)
{
    //debuglog("and_init_nhwindows()");
    iflags.window_inited = TRUE;
}

//____________________________________________________________________________________
// Rolehack: character creation on the mobile interface (Lucas, 2026-09-27).
//
// Player selection is the core's own, role.c's genl_player_setup(), as tty and
// curses use: "Shall I pick a character for you?", the "Pick race first"
// family of entries and the role filter, vanilla's line of the character so
// far, and "Is this ok?".  This port used to ask with its own short loop,
// which had none of them (Lucas: "sometimes I really do just want to see what
// kind of gnome I can play").  The window port adds two things while it asks
// (program_state.in_role_selection): each role, race, gender and alignment
// entry gets its picture, found by its words, so a role added to roles[] brings
// its picture along; and rh_creation() tells the interface which menus these
// are, so it can draw them as keys.  Built against the stock ForkFront they
// stay plain menus, with pictures.
#define RH_CREATE_PICK    1
#define RH_CREATE_CONFIRM 2

/* the last menu's prompt was vanilla's "Is this ok?" */
static boolean rh_menu_confirm;

staticfn void rh_creation(int step, int glyph)
{
    glyph_info gi;
    int tile = -1;

    if(!jCreation)
        return;
    if(glyph != NO_GLYPH)
    {
        map_glyphinfo(0, 0, glyph, 0, &gi);
        tile = gi.gm.tileidx;
    }
    JNICallV(jCreation, step, tile, iflags.rh_skintone);
}

/* The gender to draw a picture in, before or after it is picked. */
staticfn int rh_creation_gender(void)
{
    if(flags.initgend == 0 || flags.initgend == 1)
        return flags.initgend == 1 ? FEMALE : MALE;
    if(flags.initrole >= 0 && !(roles[flags.initrole].allow & ROLE_MALE))
        return FEMALE;
    return MALE;
}

/* The body the hero will be drawn as, as far as it is known: hero_glyph
   (display.h) draws the race under showrace, the role otherwise. */
staticfn int rh_creation_body(void)
{
    if(flags.initrace >= 0 && (flags.showrace || flags.initrole < 0))
        return races[flags.initrace].mnum;
    if(flags.initrole >= 0)
        return roles[flags.initrole].mnum;
    return PM_HUMAN;
}

/* The finished hero, for "Is this ok?". */
staticfn int rh_hero_glyph(void)
{
    if(flags.initrole < 0 || flags.initrace < 0 || flags.initgend < 0)
        return NO_GLYPH;
    return monnum_to_glyph(rh_creation_body(), rh_creation_gender());
}

/*
 * A player-selection entry's picture, by its words (role.c's setup_*menu()):
 * a role as an("Archeologist") or an("Caveman/Cavewoman"), a race's noun, a
 * gender's or an alignment's adjective.  "Random", "Pick race first" and the
 * like match none of them and have no picture.
 */
staticfn int rh_creation_glyph(const char *str)
{
    const char *name = str;
    size_t len;
    int i;

    if(!strncmp(name, "an ", 3))
        name += 3;
    else if(!strncmp(name, "a ", 2))
        name += 2;
    len = strcspn(name, "/");
    for(i = 0; roles[i].name.m; i++)
    {
        if(strlen(roles[i].name.m) == len && !strncmp(name, roles[i].name.m, len))
            return monnum_to_glyph(roles[i].mnum,
                                   flags.initgend == 1 ? FEMALE
                                   : flags.initgend == 0 ? MALE
                                   : (roles[i].allow & ROLE_MALE) ? MALE : FEMALE);
        if(roles[i].name.f && !strcmp(name, roles[i].name.f))
            return monnum_to_glyph(roles[i].mnum, FEMALE);
    }
    for(i = 0; races[i].noun; i++)
        if(!strcmp(str, races[i].noun))
            return monnum_to_glyph(races[i].mnum, rh_creation_gender());
    for(i = 0; i < ROLE_GENDERS; i++)
        if(!strcmp(str, genders[i].adj))
            return monnum_to_glyph(rh_creation_body(), i == 1 ? FEMALE : MALE);
    for(i = 0; i < ROLE_ALIGNS; i++)
        if(!strcmp(str, aligns[i].adj))
            return altar_to_glyph(Align2amask(aligns[i].value));
    return NO_GLYPH;
}

//____________________________________________________________________________________
//player_selection()
//      -- Do a window-port specific player type selection.  If
//         player_selection() offers a Quit option, it is its
//         responsibility to clean up and terminate the process.
//         You need to fill in pl_character[0].
void and_player_selection()
{
    /* Rolehack: the core's own selection (see above) */
    if(genl_player_setup(0))
        return;

    /* Quit, or Back: as this port always has */
    clearlocks();
    and_exit_nhwindows("bye");
    nh_terminate(EXIT_SUCCESS);
}

//____________________________________________________________________________________
//get_nh_event()    -- Does window event processing (e.g. exposure events).
//         A noop for the tty and X window-ports.
void and_get_nh_event()
{
}

//____________________________________________________________________________________
//exit_nhwindows(str)
//      -- Exits the window system.  This should dismiss all windows,
//         except the "window" used for raw_print().  str is printed
//         if possible.
void and_exit_nhwindows(const char *str)
{
    //debuglog("exit_nhwindows");
    iflags.window_inited = FALSE;
}

//____________________________________________________________________________________
//suspend_nhwindows(str)
//      -- Prepare the window to be suspended.
void and_suspend_nhwindows(const char *str)
{
}

//____________________________________________________________________________________
//resume_nhwindows()
//      -- Restore the windows after being suspended.
void and_resume_nhwindows()
{
}

//____________________________________________________________________________________
//window = create_nhwindow(type)
//      -- Create a window of type "type."
winid and_create_nhwindow(int type)
{
    return JNICallI(jCreateWindow, type);
}

//____________________________________________________________________________________
//clear_nhwindow(window)
//      -- Clear the given window, when appropriate.
void and_clear_nhwindow(winid wid)
{
    //debuglog("and_clear_nhwindow(%d)", wid);
    JNICallV(jClearWindow, wid, Is_rogue_level(&u.uz));
    if(wid == WIN_MESSAGE)
    {
        /* Rolehack: the next message starts a page; the band dims this one */
        rh_new_page = TRUE;
        rh_unread = FALSE;
        rh_page_fresh = FALSE;
    }
}

//____________________________________________________________________________________
//display_nhwindow(window, boolean blocking)
//      -- Display the window on the screen.  If there is data
//         pending for output in that window, it should be sent.
//         If blocking is TRUE, display_nhwindow() will not
//         return until the data has been displayed on the screen,
//         and acknowledged by the user where appropriate.
//      -- All calls are blocking in the tty window-port.
//      -- Calling display_nhwindow(WIN_MESSAGE,???) will do a
//         --more--, if necessary, in the tty window-port.
void and_display_nhwindow(winid wid, boolean blocking)
{
    //debuglog("display_nhwindow(%d)", wid);
    if(wid == WIN_MESSAGE && rh_msg_band())
    {
        /* Rolehack: the core's own --More-- waits, when something is up that
           nothing has acknowledged -- as tty's does */
        JNICallV(jDisplayWindow, wid, FALSE);
        if(blocking && rh_unread && !rh_msg_stop)
        {
            rh_more();
            rh_new_page = TRUE;
            JNICallV(jClearWindow, WIN_MESSAGE, 0);
            rh_page_fresh = FALSE;
        }
        return;
    }
    if(wid != WIN_MESSAGE && /*wid != WIN_STATUS && */wid != WIN_MAP)
        blocking = TRUE;
    JNICallV(jDisplayWindow, wid, blocking);
    if(blocking)
        and_nhgetch();
}

//____________________________________________________________________________________
//destroy_nhwindow(window)
//      -- Destroy will dismiss the window if the window has not
//         already been dismissed.
void and_destroy_nhwindow(winid wid)
{
    JNICallV(jDestroyWindow, wid);
}

//____________________________________________________________________________________
//curs(window, x, y)
//      -- Next output to window will start at (x,y), also moves
//         displayable cursor to (x,y).  For backward compatibility,
//         1 <= x < cols, 0 <= y < rows, where cols and rows are
//         the size of window.
//      -- For variable sized windows, like the status window, the
//         behavior when curs() is called outside the window's limits
//         is unspecified. The mac port wraps to 0, with the status
//         window being 2 lines high and 80 columns wide.
//      -- Still used by curs_on_u(), status updates, screen locating
//         (identify, teleport).
//      -- NHW_MESSAGE, NHW_MENU and NHW_TEXT windows do not
//         currently support curs in the tty window-port.
void and_curs(winid wid, int x, int y)
{
    JNICallV(jSetCursorPos, wid, x, y);
}

// For TEXTCOLOR
static int text_attribs = 0;
static int text_color = CLR_WHITE;

static int palette[CLR_MAX] = {
    0xFF555555, // CLR_BLACK
    0xFFFF0000, // CLR_RED
    0xFF008800, // CLR_GREEN
    0xFF664411, // CLR_BROWN
    0xFF0000FF, // CLR_BLUE
    0xFFFF00FF, // CLR_MAGENTA
    0xFF00FFFF, // CLR_CYAN
    0xFF888888, // CLR_GRAY
    0xFFFFFFFF, // NO_COLOR
    0xFFFF9900, // CLR_ORANGE
    0xFF00FF00, // CLR_BRIGHT_GREEN
    0xFFFFFF00, // CLR_YELLOW
    0xFF0088FF, // CLR_BRIGHT_BLUE
    0xFFFF77FF, // CLR_BRIGHT_MAGENTA
    0xFF77FFFF, // CLR_BRIGHT_CYAN
    0xFFFFFFFF  // CLR_WHITE
};
int nhcolor_to_RGB(int c)
{
    if(c >= 0 && c < CLR_MAX)
        return palette[c];
    return 0xFF000000;
}

const char* colname(int color)
{
    switch(color)
    {
    case CLR_BLACK: return "black";
    case CLR_RED: return "red";
    case CLR_GREEN: return "green";
    case CLR_BROWN: return "brown";
    case CLR_BLUE: return "blue";
    case CLR_MAGENTA: return "magenta";
    case CLR_CYAN: return "cyan";
    case CLR_GRAY: return "gray";
    case NO_COLOR: return "no color";
    case CLR_ORANGE: return "orange";
    case CLR_BRIGHT_GREEN: return "bright green";
    case CLR_YELLOW: return "yellow";
    case CLR_BRIGHT_BLUE: return "bright blue";
    case CLR_BRIGHT_MAGENTA: return "bright magenta";
    case CLR_BRIGHT_CYAN: return "bright cyan";
    case CLR_WHITE: return "white";
    default: return "black";
    }
}

void
term_start_attr(int attr)
{
    text_attribs |= 1<<attr;
}

void
term_end_attr(int attr)
{
    text_attribs &= ~(1<<attr);
}

void
term_start_color(int color)
{
    //debuglog("term_start_color %s", colname(color));
    text_color = color;
}

void
term_end_color()
{
    text_color = CLR_WHITE;
}

//____________________________________________________________________________________
//putstr(window, attr, str)
//      -- Print str on the window with the given attribute.  Only
//         printable ASCII characters (040-0126) must be supported.
//         Multiple putstr()s are output on separate lines.  Attributes
//         can be one of
//          ATR_NONE (or 0)
//          ATR_ULINE
//          ATR_BOLD
//          ATR_BLINK
//          ATR_INVERSE
//         If a window-port does not support all of these, it may map
//         unsupported attributes to a supported one (e.g. map them
//         all to ATR_INVERSE).  putstr() may compress spaces out of
//         str, break str, or truncate str, if necessary for the
//         display.  Where putstr() breaks a line, it has to clear
//         to end-of-line.
//      -- putstr should be implemented such that if two putstr()s
//         are done consecutively the user will see the first and
//         then the second.  In the tty port, pline() achieves this
//         by calling more() or displaying both on the same line.
//____________________________________________________________________________________
void and_putstr_ex(winid wid, int attr, const char *str, int append, int nhcolor)
{
    if(!str || !*str)
        return;
    jbyteArray jstr = create_bytearray(str);
    JNICallV(jPutString, wid, attr, jstr, append, nhcolor_to_RGB(nhcolor));
    destroy_jobject(jstr);
}

void and_putstr(winid wid, int attr, const char *str)
{
    int rh_attr = 0, rh_band = 0, rh_rows = 0;

    if(wid == WIN_MESSAGE && str && *str)
    {
        /* Rolehack: the message band's --More--; see rh_msg_place() */
        boolean urgent = (attr & ATR_URGENT) != 0;

        attr &= ~(ATR_URGENT | ATR_NOHISTORY);
        rh_attr = rh_msg_place(str, urgent, &rh_band, &rh_rows);
    }

    if(attr)
        attr = 1<<attr;
    else
        attr = text_attribs;

    and_putstr_ex(wid, attr | rh_attr, str, 0, text_color);
    if(rh_band && !rh_attr)
        rh_msg_placed(rh_band, rh_rows);

    if(wid == NHW_MESSAGE)
    {
        save_msg(str);
#ifdef USER_SOUNDS
        if(!restoring_msghistory)
            play_sound_for_message(str);
#endif
    }
}

void and_set_health_color(int nhcolor)
{
    JNICallV(jSetHealthColor, nhcolor_to_RGB(nhcolor));
}

void and_bot_updated()
{
    JNICallV(jRedrawStatus);
}

//____________________________________________________________________________________
//status_update(int fldindex, genericptr_t ptr, int chg, int percentage, int color, long *colormasks)
//      -- update the value of a status field.
//      -- the fldindex identifies which field is changing and
//         is an integer index value from botl.h
//      -- fldindex could be any one of the following from botl.h:
//         BL_TITLE, BL_STR, BL_DX, BL_CO, BL_IN, BL_WI, BL_CH,
//         BL_ALIGN, BL_SCORE, BL_CAP, BL_GOLD, BL_ENE, BL_ENEMAX,
//         BL_XP, BL_AC, BL_HD, BL_TIME, BL_HUNGER, BL_HP, BL_HPMAX,
//         BL_LEVELDESC, BL_EXP, BL_CONDITION
//      -- The value passed for BL_GOLD includes a leading
//         symbol for GOLD "$:nnn". If the window port needs to use
//         the textual gold amount without the leading "$:" the port
//         will have to add 2 to the passed "ptr" for the BL_GOLD case.
//      -- fldindex could also be BL_FLUSH (-1), which is not really
//         a field index, but is a special trigger to tell the
//         windowport that it should redisplay all its status fields,
//         even if no changes have been presented to it.
//      -- ptr is usually a "char *", unless fldindex is BL_CONDITION.
//         If fldindex is BL_CONDITION, then ptr is a long value with
//         any or none of the following bits set (from botl.h):
//                        BL_MASK_STONE           0x00000001L
//                        BL_MASK_SLIME           0x00000002L
//                        BL_MASK_STRNGL          0x00000004L
//                        BL_MASK_FOODPOIS        0x00000008L
//                        BL_MASK_TERMILL         0x00000010L
//                        BL_MASK_BLIND           0x00000020L
//                        BL_MASK_DEAF            0x00000040L
//                        BL_MASK_STUN            0x00000080L
//                        BL_MASK_CONF            0x00000100L
//                        BL_MASK_HALLU           0x00000200L
//                        BL_MASK_LEV             0x00000400L
//                        BL_MASK_FLY             0x00000800L
//                        BL_MASK_RIDE            0x00001000L
//      -- color is an unsigned int.
//             int & 0x00FF = color CLR_*
//             int >> 8 = attribute (if any)
//         This contains the color and attribute that the field should
//         be displayed in.
//         This is relevant for everything except BL_CONDITION fldindex.
//         If fldindex is BL_CONDITION, this parameter should be ignored,
//         as condition hilighting is done via the next colormasks
//         parameter instead.
//      -- colormasks - pointer to cond_hilites[] array of colormasks.
//         Only relevant for BL_CONDITION fldindex. The window port
//         should ignore this parameter for other fldindex values.
//         Each condition bit must only ever appear in one of the
//         CLR_ array members, but can appear in multiple HL_ATTCLR_
//         offsets (because more than one attribute can co-exist).
//         For the user's chosen set of BL_MASK_ condition bits,
//         They are stored internally in the cond_hilites[] array,
//         at the array offset aligned to the color those condtion
//         bits should display in.
//         For example, if the user has chosen to display strngl
//         and stone and termill in red and inverse,
//              BL_MASK_SLIME           0x00000002
//              BL_MASK_STRNGL          0x00000004
//              BL_MASK_TERMILL         0x00000010
//         The bitmask corresponding to those conditions is
//         0x00000016 (or 00010110 in binary) and the color
//         is at offset 1 (CLR_RED).
//         Here is how that is stored in the cond_hilites[] array:
//         +------+----------------------+--------------------+
//         |array |                      |                    |
//         |offset| macro for indexing   |   bitmask          |
//         |------+----------------------+--------------------+
//         |   0  |   CLR_BLACK          |                    |
//         +------+----------------------+--------------------+
//         |   1  |   CLR_RED            |   00010110         |
//         +------+----------------------+--------------------+
//         |   2  |   CLR_GREEN          |                    |
//         +------+----------------------+--------------------+
//         |   3  |   CLR_BROWN          |                    |
//         +------+----------------------+--------------------+
//         |   4  |   CLR_BLUE           |                    |
//         +------+----------------------+--------------------+
//         |   5  |   CLR_MAGENTA        |                    |
//         +------+----------------------+--------------------+
//         |   6  |   CLR_CYAN           |                    |
//         +------+----------------------+--------------------+
//         |   7  |   CLR_GRAY           |                    |
//         +------+----------------------+--------------------+
//         |   8  |   NO_COLOR           |                    |
//         +------+----------------------+--------------------+
//         |   9  |   CLR_ORANGE         |                    |
//         +------+----------------------+--------------------+
//         |  10  |   CLR_BRIGHT_GREEN   |                    |
//         +------+----------------------+--------------------+
//         |  11  |   CLR_BRIGHT_YELLOW  |                    |
//         +------+----------------------+--------------------+
//         |  12  |   CLR_BRIGHT_BLUE    |                    |
//         +------+----------------------+--------------------+
//         |  13  |   CLR_BRIGHT_MAGENTA |                    |
//         +------+----------------------+--------------------+
//         |  14  |   CLR_BRIGHT_CYAN    |                    |
//         +------+----------------------+--------------------+
//         |  15  |   CLR_WHITE          |                    |
//         +------+----------------------+--------------------+
//         |  16  |   HL_ATTCLR_DIM      |                    | CLR_MAX
//         +------+----------------------+--------------------+
//         |  17  |   HL_ATTCLR_BLINK    |                    |
//         +------+----------------------+--------------------+
//         |  18  |   HL_ATTCLR_ULINE    |                    |
//         +------+----------------------+--------------------+
//         |  19  |   HL_ATTCLR_INVERSE  |   00010110         |
//         +------+----------------------+--------------------+
//         |  20  |   HL_ATTCLR_BOLD     |                    |
//         +------+----------------------+--------------------+
//         |  21  |  beyond array boundary                    | BL_ATTCLR_MAX
//         The window port can AND (&) the bits passed in the
//         ptr argument to status_update() with any non-zero
//         entries in the cond_hilites[] array to determine
//         the color and attributes for displaying the
//         condition on the screen for the user.
//         If the bit for a particular condition does not
//         appear in any of the cond_hilites[] array offsets,
//         that condition should be displayed in the default
//         color and attributes.
//____________________________________________________________________________________
int hl_attridx_to_attrmask(int idx)
{
    switch(idx)
    {
    case HL_ATTCLR_DIM:     return (1<<ATR_DIM);
    case HL_ATTCLR_BLINK:   return (1<<ATR_BLINK);
    case HL_ATTCLR_ULINE:   return (1<<ATR_ULINE);
    case HL_ATTCLR_INVERSE: return (1<<ATR_INVERSE);
    case HL_ATTCLR_BOLD:    return (1<<ATR_BOLD);
    }
    return 0;
}

int hl_attrmask_to_attrmask(int mask)
{
    int attr = 0;
    if(mask & HL_DIM) attr |= (1<<ATR_DIM);
    if(mask & HL_BLINK) attr |= (1<<ATR_BLINK);
    if(mask & HL_ULINE) attr |= (1<<ATR_ULINE);
    if(mask & HL_INVERSE) attr |= (1<<ATR_INVERSE);
    if(mask & HL_BOLD) attr |= (1<<ATR_BOLD);
    return attr;
}

void and_status_update(int idx, genericptr_t ptr, int chg, int percent, int color, unsigned long *colormasks)
{
    long cond, *condptr = (long *) ptr;
    char *nb, *text = (char *) ptr;
    int i;

    if(idx == BL_FLUSH)
    {
        if(cond_hilites)
            and_status_flush();
    }
    else if(status_activefields[idx])
    {
        if(idx == BL_CONDITION)
        {
            cond_hilites = colormasks;
            active_conditions = condptr ? *condptr : 0L;
            *status_vals[idx] = 0;
        }
        else if(idx == BL_GOLD && *text == '\\')
        {
            // Remove encoded glyph value. (This might break in the future if the format is changed in botl.c)
            text += 10;
            Sprintf(status_vals[idx], "$%s", text);
            status_colors[idx] = color;
        }
        else
        {
            Sprintf(status_vals[idx], status_fieldfmt[idx] ? status_fieldfmt[idx] : "%s", text ? text : "");
            status_colors[idx] = color;
        }
    }
}

int get_condition_color(int cond_mask)
{
    int i;
    for(i = 0; i < CLR_MAX; i++)
        if(cond_hilites[i] & cond_mask)
            return i;
    return CLR_WHITE;
}

int get_condition_attr(int cond_mask)
{
    int i;
    int attr = 0;
    for(i = CLR_MAX; i < BL_ATTCLR_MAX; i++)
        if(cond_hilites[i] & cond_mask)
            attr |= hl_attridx_to_attrmask(i);
    return attr;
}

void print_conditions(void)
{
    int i;
    for(i = 0; i < CONDITION_COUNT; i++) {
        int cond_mask = 1 << i;
        if(active_conditions & cond_mask)
        {
            // TODO: make the size of the text customizable
            const char* name = conditions[i].text[0];
            int color = get_condition_color(cond_mask);
            int attr = get_condition_attr(cond_mask);
            //debuglog("cond '%s' active. col=%s attr=%x", name, colname(color), attr);
            and_putstr_ex(WIN_STATUS, ATR_NONE, " ", 0, CLR_WHITE);
            and_putstr_ex(WIN_STATUS, attr, name, 0, color);
        }
    }
}

void print_status_field(int idx, boolean first_field)
{
    if(!status_activefields[idx])
        return;

    const char* val = status_vals[idx];

    if(first_field && *val == ' ')
    {
        // Remove leading space of first field
        val++;
    }
    else if(idx == BL_LEVELDESC && !first_field)
    {
        /* leveldesc has no leading space, so if we've moved
           it past the first position, provide one */
        and_putstr_ex(WIN_STATUS, ATR_NONE, " ", 0, CLR_WHITE);
    }

    // Don't want coloring on leading spaces (ATR_INVERSE would show), so print those first
    while(*val == ' ')
    {
        and_putstr_ex(WIN_STATUS, ATR_NONE, " ", 0, CLR_WHITE);
        val++;
    }

    if(idx == BL_CONDITION)
    {
        print_conditions();
    }
    else
    {
        int attr = (status_colors[idx] >> 8) & 0xFF;
        int color = status_colors[idx] & 0xFF;
        if(idx == BL_HP)
        {
            and_set_health_color(color);
        }
        else if(idx == BL_HPMAX)
        {
            // Set hp-max to same color as hp if it's not explicitly defined
            if(color == NO_COLOR && attr == ATR_NONE && status_activefields[BL_HP])
            {
                attr = (status_colors[BL_HP] >> 8) & 0xFF;
                color = status_colors[BL_HP] & 0xFF;
            }
        }
        else if(idx == BL_ENEMAX)
        {
            // Set power-max to same color as power if it's not explicitly defined
            if(color == NO_COLOR && attr == ATR_NONE && status_activefields[BL_ENE])
            {
                attr = (status_colors[BL_ENE] >> 8) & 0xFF;
                color = status_colors[BL_ENE] & 0xFF;
            }
        }
        and_putstr_ex(WIN_STATUS, hl_attrmask_to_attrmask(attr), val, 0, color);
    //  debuglog("field %d: %s color %s", idx+1, val, colname(color));
    }
}

/*
 * Rolehack: hand Java the status fields separately, so the mobile interface can
 * draw an HP bar and a hunger badge instead of re-parsing a formatted line.
 *
 * Sent alongside the classic two-row text, never instead of it -- the old status
 * window keeps working exactly as before.  Values are the same strings the text
 * rows use, minus the leading spaces the layout adds, so BL_GOLD still arrives
 * as "$123" and BL_HP as "18".
 */
/* Rolehack: what the context strip and the pad's centre cell need to know. */
#define RH_HERE_OBJECT      0x01
#define RH_HERE_STAIRS_DOWN 0x02
#define RH_HERE_STAIRS_UP   0x04
#define RH_ADJ_CLOSED_DOOR  0x08
#define RH_ADJ_HOSTILE      0x10
#define RH_HERE_CONTAINER   0x20
#define RH_HERE_ALTAR       0x40 /* ROLEHACK: on an altar -- offers Sacrifice */
#define RH_ADJ_OPEN_DOOR    0x80 /* ROLEHACK: an open door beside you, clear to shut -- offers Close */

/*
 * A non-blocking "what can I do here".
 *
 * here_cmd_menu() answers the same questions but is an interactive command --
 * it builds a menu window and waits for a selection -- so it cannot be called
 * once a turn just to look.  This asks the same things of the same public state
 * and returns instead of prompting.
 *
 * ROLEHACK: sent from two places.  The status pass sends it every time, as it
 * always has.  But the core only makes a status pass when a status field
 * changed (botl.c), and some moves change none: travel, rush and run leave
 * the turn counter alone while context.run is set (allmain.c), and a Fast
 * hero's extra move does not advance it at all.  After those the pad kept
 * offering what was on the square you left, until a wait moved the clock
 * (Lucas, 2026-09-26).  So the command wait sends it too, when it differs
 * from what the interface last got.
 */
staticfn void and_send_here_context(boolean always)
{
    static int last_flags = -1;
    static char last_mon[BUFSZ];
    int flags = 0;
    int i;
    struct monst *hostile = 0;
    const char *mon;
    stairway *stway;
    jbyteArray jmon;

    if(!jHereContext)
        return;

    /* Status flushes before a level exists during startup and on game over. */
    if(!program_state.in_moveloop || !isok(u.ux, u.uy))
        return;

    if(OBJ_AT(u.ux, u.uy))
    {
        struct obj *otmp;

        flags |= RH_HERE_OBJECT;
        for(otmp = svl.level.objects[u.ux][u.uy]; otmp; otmp = otmp->nexthere)
            if(Is_container(otmp))
            {
                flags |= RH_HERE_CONTAINER;
                break;
            }
    }

    stway = stairway_at(u.ux, u.uy);
    if(stway)
        flags |= stway->up ? RH_HERE_STAIRS_UP : RH_HERE_STAIRS_DOWN;

    if(IS_ALTAR(levl[u.ux][u.uy].typ))
        flags |= RH_HERE_ALTAR;

    for(i = 0; i < 8; ++i)
    {
        coordxy x = u.ux + xdir[i], y = u.uy + ydir[i];
        struct monst *mtmp;

        if(!isok(x, y))
            continue;

        if(levl[x][y].typ == DOOR && (levl[x][y].doormask & D_CLOSED) != 0)
            flags |= RH_ADJ_CLOSED_DOOR;
        /* ROLEHACK: Close, where doclose() would shut the door -- plainly open,
         * and nothing seen in the doorway (lock.c's obstructed() refuses an
         * object or a monster there). */
        if(levl[x][y].typ == DOOR && levl[x][y].doormask == D_ISOPEN && !OBJ_AT(x, y)
           && !((mtmp = m_at(x, y)) != 0 && canspotmon(mtmp)))
            flags |= RH_ADJ_OPEN_DOOR;

        mtmp = m_at(x, y);
        if(mtmp && !mtmp->mtame && !mtmp->mpeaceful && canspotmon(mtmp))
        {
            flags |= RH_ADJ_HOSTILE;
            if(!hostile)
                hostile = mtmp;
        }
    }

    mon = hostile ? mon_nam(hostile) : "";
    if(!always && flags == last_flags && !strcmp(mon, last_mon))
        return;
    last_flags = flags;
    Strcpy(last_mon, mon);

    jmon = create_bytearray(mon);
    JNICallV(jHereContext, flags, jmon);
    destroy_jobject(jmon);
}

/*
 * Rolehack: the paper doll -- what the hero is wearing and wielding.
 *
 * Every item goes out as the glyph the floor would show for it, never by what
 * it really is.  The tile and the colour both follow the shuffled appearance
 * (o_init.c: shuffle() swaps oc_color, shuffle_tiles() the tiles), so the doll
 * shows no more than a glance at the floor would: "riding gloves", not
 * gauntlets of power.  obj_to_glyph() is not used because its pile-top test
 * reads the floor at the object's ox/oy, which are stale for inventory; and the
 * doll ignores hallucination, as the core does for the hero's own glyph.
 *
 * Layout of the int array (RH_DOLL_LEN):
 *   [0] version (2)   [1] u.ux   [2] u.uy
 *   [3] tile of the hero's own glyph (hero_glyph: role, or race with showrace),
 *       or -1 when the doll must step aside (polymorphed, riding, engulfed,
 *       underwater, mimicking)
 *   then RH_DOLL_SLOTS triples {tile or -1, RGB colour, shape}, in the order
 *   helmet, suit, shirt, cloak, shield, gloves, boots, eyewear, amulet,
 *   weapon, off-hand weapon (only while two-weaponing).
 *   shape: 0 for anything that is not a weapon, else an RH_DOLL_* family,
 *   plus RH_DOLL_TWOHANDED; RH_DOLL_HIDE for dragon scales, which the
 *   interface cannot tell from a suit by the tile's shape; RH_DOLL_DRAGON
 *   and the dragon's index (gray .. yellow) in bits 12-15 for dragon scale
 *   mail, for its pauldrons.  All of these are functions of the object type
 *   alone, and none of those appearances is ever shuffled, so they tell
 *   nothing the tile does not.
 *   A worn cloak, helmet, shield, pair of gloves, pair of boots, amulet or
 *   eyewear carries its style in the low byte (rh_doll_look()), named by the words
 *   the player sees: its description, or its name when it has none.  The
 *   magic cloaks, four helmets, all gloves, the magic boots and all amulets
 *   shuffle their descriptions per game, so the doll draws the "opera cloak"
 *   or the "hexagonal" amulet, never the cloak of invisibility or amulet of
 *   reflection; three shields share "wooden shield", and the Amulet of
 *   Yendor and its imitation "Amulet of Yendor", and each pair is drawn
 *   alike.
 *   RH_DOLL_FRONT marks the cloak-slot items worn in front of the body --
 *   robe, apron (alchemy smock), mummy wrapping; every other cloak is drawn
 *   as a cape behind it, so it no longer hides the armour (Lucas).  All
 *   three have fixed appearances.
 *   RH_DOLL_COSTUME marks a worn item the hero's own role tile already
 *   draws (the Archeologist's fedora, the Knight's ring mail); the doll
 *   leaves the tile alone for it.  Only when the player already knows the
 *   item's type (oc_name_known -- starting kit is discovered at creation),
 *   so it cannot tell a helm of telepathy from a plain helmet.
 *   Bits 17-22 carry an artifact's own art (rh_doll_art(): its place in
 *   rh_doll_arts[] plus one), set only once the inventory would print the
 *   artifact's name, so they tell nothing the player cannot read.  An
 *   artifact is never marked costume.
 *
 *   then, from version 2, the skin: a seed that is fixed for the character
 *   (a hash of ubirthday, which the save keeps) and the skintone option
 *   (0 = random, else the tone the options file fixed).  The interface owns
 *   the tones themselves; it has RH_SKINTONES of them.
 *
 * Sent when the game waits for a command, and when the hero's own square is
 * drawn -- otherwise the welcome screens show the plain tile, and NetHack's
 * own skin tone, until the first command (Lucas) -- and only when something
 * changed.
 */
#define RH_DOLL_SLOTS 11
#define RH_DOLL_LEN (4 + 3 * RH_DOLL_SLOTS + 2)
#define RH_DOLL_SHORT_BLADE  1  /* dagger, knife */
#define RH_DOLL_SWORD        2  /* short, broad, long sword, saber */
#define RH_DOLL_GREAT_SWORD  3
#define RH_DOLL_AXE          4
#define RH_DOLL_PICK         5
#define RH_DOLL_BLUNT        6  /* club, mace, flail, hammer */
#define RH_DOLL_STAFF        7
#define RH_DOLL_POLE         8  /* polearms, spear, trident, lance */
#define RH_DOLL_LAUNCHER     9  /* bow, sling, crossbow */
#define RH_DOLL_MISSILE     10  /* ammo, darts, shuriken, boomerang */
#define RH_DOLL_WHIP        11
#define RH_DOLL_HORN        12  /* unicorn horn */
#define RH_DOLL_CHAIN       13  /* morning star: a spiked ball on a chain, as its floor tile */
#define RH_DOLL_TWOHANDED  0x100
#define RH_DOLL_HIDE       0x200  /* dragon scales: a hide, not a shirt-shaped suit */
#define RH_DOLL_COSTUME    0x400  /* the role tile already draws this item */
#define RH_DOLL_DRAGON     0x800  /* dragon scale mail; index in bits 12-15 */
#define RH_DOLL_FRONT    0x10000  /* robe, apron, mummy wrapping: worn in front */
#define RH_DOLL_ART_SHIFT     17  /* bits 17-22: the artifact's own art, rh_doll_arts[] + 1 */

staticfn int rh_doll_family(struct obj *obj)
{
    int skill;

    if(obj->oclass != WEAPON_CLASS && !is_weptool(obj))
        return 0;
    skill = objects[obj->otyp].oc_skill;
    if(skill < 0)
        return RH_DOLL_MISSILE;
    switch(skill)
    {
    case P_DAGGER: case P_KNIFE:                        return RH_DOLL_SHORT_BLADE;
    case P_SHORT_SWORD: case P_BROAD_SWORD:
    case P_LONG_SWORD: case P_SABER:                    return RH_DOLL_SWORD;
    case P_TWO_HANDED_SWORD:                            return RH_DOLL_GREAT_SWORD;
    case P_AXE:                                         return RH_DOLL_AXE;
    case P_PICK_AXE:                                    return RH_DOLL_PICK;
    case P_CLUB: case P_MACE:
    case P_FLAIL: case P_HAMMER:                        return RH_DOLL_BLUNT;
    case P_MORNING_STAR:                                return RH_DOLL_CHAIN;
    case P_QUARTERSTAFF:                                return RH_DOLL_STAFF;
    case P_POLEARMS: case P_SPEAR: case P_TRIDENT:
    case P_LANCE:                                       return RH_DOLL_POLE;
    case P_BOW: case P_SLING: case P_CROSSBOW:          return RH_DOLL_LAUNCHER;
    case P_DART: case P_SHURIKEN: case P_BOOMERANG:     return RH_DOLL_MISSILE;
    case P_WHIP:                                        return RH_DOLL_WHIP;
    case P_UNICORN_HORN:                                return RH_DOLL_HORN;
    default:                                            return 0;
    }
}

/*
 * What each role's tile already wears, among its starting kit (Lucas: "some
 * of the other base roles have similar clothing which is already represented
 * on model").  Only unshared appearances: no small shield, whose "wooden
 * shield" look two other shields share.
 */
static const struct {
    short role, otyp;
} rh_costume[] = {
    { PM_ARCHEOLOGIST, FEDORA },
    { PM_ARCHEOLOGIST, LEATHER_JACKET },
    { PM_APOTHECARY, ALCHEMY_SMOCK },
    { PM_APOTHECARY, HIGH_BOOTS },
    { PM_APOTHECARY, LENSES },
    { PM_CAVE_DWELLER, LEATHER_ARMOR },
    { PM_KNIGHT, RING_MAIL },
    { PM_KNIGHT, HELMET },
    { PM_MONK, ROBE },
    { PM_CLERIC, ROBE },
    { PM_ROGUE, LEATHER_ARMOR },
    { PM_SAMURAI, SPLINT_MAIL },
    { PM_TOURIST, HAWAIIAN_SHIRT },
    { PM_WIZARD, CLOAK_OF_MAGIC_RESISTANCE },
};

staticfn boolean rh_doll_costume(struct obj *obj)
{
    int i;

    /* showrace draws the race's tile, which wears none of the role's kit */
    if(flags.showrace || !objects[obj->otyp].oc_name_known)
        return FALSE;
    for(i = 0; i < SIZE(rh_costume); ++i)
        if(rh_costume[i].role == Role_switch && rh_costume[i].otyp == obj->otyp)
            return TRUE;
    return FALSE;
}

/*
 * A worn cloak's, helmet's, shield's, gloves', boots', amulet's or eyewear's
 * look, by the words the player sees for it (Lucas asked for the art of each).  The orders match
 * RhDoll's styles; 0 for anything else.  Cornuthaum and dunce cap are both
 * "conical hat"; the small shield and the shields of drain and shock
 * resistance are all "wooden shield".
 */
static const char *const rh_cloak_looks[] = {
    "faded pall", "coarse mantelet", "hooded cloak", "slippery cloak",
    "leather cloak", "tattered cape", "opera cloak", "ornamental cope",
    "piece of cloth", "robe", "apron", "mummy wrapping",
};
static const char *const rh_helm_looks[] = {
    "leather hat", "iron skull cap", "hard hat", "fedora", "conical hat",
    "dented pot", "crystal helmet", "plumed helmet", "etched helmet",
    "crested helmet", "visored helmet",
};
static const char *const rh_shield_looks[] = {
    "wooden shield", "blue and green shield", "white-handed shield",
    "red-eyed shield", "large shield", "large round shield",
    "polished silver shield",
};
static const char *const rh_glove_looks[] = {
    "old gloves", "padded gloves", "riding gloves", "fencing gloves",
};
static const char *const rh_boot_looks[] = {
    "walking shoes", "hard shoes", "hiking boots", "jackboots",
    "combat boots", "jungle boots", "mud boots", "buckled boots",
    "riding boots", "snow boots",
};
static const char *const rh_amulet_looks[] = {
    "circular", "spherical", "oval", "triangular", "pyramidal", "square",
    "concave", "hexagonal", "octagonal", "perforated", "cubical",
    "Amulet of Yendor",
};
static const char *const rh_eyewear_looks[] = {
    "lenses", "blindfold", "towel",
};

staticfn int rh_doll_look(struct obj *obj, const char *const *looks, int n)
{
    const char *look = OBJ_DESCR(objects[obj->otyp]);
    int i;

    if(!look)   /* robe, leather cloak, fedora, dented pot: the name is the look */
        look = OBJ_NAME(objects[obj->otyp]);
    for(i = 0; i < n; ++i)
        if(look && !strcmp(look, looks[i]))
            return i + 1;
    return 0;
}

/*
 * Artifacts with art of their own on the doll (Lucas, 2026-09-26), in
 * artilist.h's order.  The UI's tables (RhDoll.ART_HELD and friends) follow
 * this list: an artifact's place here, plus one, is its number there.
 */
static const short rh_doll_arts[] = {
    ART_EXCALIBUR,
    ART_STORMBRINGER,
    ART_MJOLLNIR,
    ART_CLEAVER,
    ART_GRIMTOOTH,
    ART_ORCRIST,
    ART_STING,
    ART_MAGICBANE,
    ART_FROST_BRAND,
    ART_FIRE_BRAND,
    ART_DRAGONBANE,
    ART_DEMONBANE,
    ART_WEREBANE,
    ART_GRAYSWANDIR,
    ART_GIANTSLAYER,
    ART_OGRESMASHER,
    ART_TROLLSBANE,
    ART_VORPAL_BLADE,
    ART_SNICKERSNEE,
    ART_SUNSWORD,
    ART_ORB_OF_DETECTION,
    ART_HEART_OF_AHRIMAN,
    ART_SCEPTRE_OF_MIGHT,
    ART_STAFF_OF_AESCULAPIUS,
    ART_MAGIC_MIRROR_OF_MERLIN,
    ART_EYES_OF_THE_OVERWORLD,
    ART_MITRE_OF_HOLINESS,
    ART_LONGBOW_OF_DIANA,
    ART_MASTER_KEY_OF_THIEVERY,
    ART_TSURUGI_OF_MURAMASA,
    ART_YENDORIAN_EXPRESS_CARD,
    ART_ORB_OF_FATE,
    ART_EYE_OF_THE_AETHIOPICA,
    ART_LAPIS_PHILOSOPHORUM
};

/*
 * The artifact's art number, or 0 -- given only once the inventory would print
 * its name (xname(): has_oname && dknown), so the doll never shows what the
 * player cannot read.  No artifact exists as a floor tile of its own in 5.0;
 * this art is the doll's alone.
 */
staticfn int rh_doll_art(struct obj *obj)
{
    int i;

    if(!obj->oartifact || !obj->dknown || !has_oname(obj))
        return 0;
    for(i = 0; i < SIZE(rh_doll_arts); ++i)
        if(obj->oartifact == rh_doll_arts[i])
            return i + 1;
    return 0;
}

staticfn void rh_doll_slot(int *out, struct obj *obj, boolean worn)
{
    int art;
    glyph_info gi;
    int glyph;

    if(!obj)
    {
        out[0] = -1, out[1] = 0, out[2] = 0;
        return;
    }
    if(obj->otyp == CORPSE)
        glyph = obj->corpsenm + GLYPH_BODY_OFF;
    else if(obj->otyp == STATUE)
        glyph = obj->corpsenm
                + (((obj->spe & CORPSTAT_GENDER) == CORPSTAT_FEMALE)
                   ? GLYPH_STATUE_FEM_OFF : GLYPH_STATUE_MALE_OFF);
    else if(obj_is_generic(obj))
        glyph = obj->oclass + GLYPH_OBJ_OFF;
    else
        glyph = obj->otyp + GLYPH_OBJ_OFF;

    map_glyphinfo(0, 0, glyph, 0, &gi);
    out[0] = gi.gm.tileidx;
    out[1] = nhcolor_to_RGB(gi.gm.sym.color);
    art = rh_doll_art(obj);        /* an artifact is never costume: its art is its own */
    out[2] = rh_doll_family(obj) | (bimanual(obj) ? RH_DOLL_TWOHANDED : 0)
             | (Is_dragon_scales(obj) ? RH_DOLL_HIDE : 0)
             | (worn && !art && rh_doll_costume(obj) ? RH_DOLL_COSTUME : 0)
             | (art << RH_DOLL_ART_SHIFT);
    if(Is_dragon_mail(obj))
        out[2] |= RH_DOLL_DRAGON | ((obj->otyp - GRAY_DRAGON_SCALE_MAIL) << 12);
    if(obj->otyp == ROBE || obj->otyp == ALCHEMY_SMOCK || obj->otyp == MUMMY_WRAPPING)
        out[2] |= RH_DOLL_FRONT;
}

staticfn void and_send_hero_look(boolean from_display)
{
    static int last[RH_DOLL_LEN];
    int look[RH_DOLL_LEN];
    struct obj *slots[RH_DOLL_SLOTS];
    int i;
    jintArray arr;

    if(!jHeroLook || !isok(u.ux, u.uy) || program_state.gameover)
        return;
    /* A command prompt can come before there is a hero to dress; a drawn
       hero square cannot. */
    if(!from_display && !program_state.in_moveloop)
        return;

    slots[0] = uarmh; slots[1] = uarm; slots[2] = uarmu; slots[3] = uarmc;
    slots[4] = uarms; slots[5] = uarmg; slots[6] = uarmf; slots[7] = ublindf;
    slots[8] = uamul; slots[9] = uwep; slots[10] = u.twoweap ? uswapwep : 0;

    look[0] = 2;
    look[1] = u.ux;
    look[2] = u.uy;
    if(Upolyd || u.usteed || u.uswallow || Underwater || U_AP_TYPE != M_AP_NOTHING)
        look[3] = -1;
    else
    {
        glyph_info gi;

        map_glyphinfo(0, 0, hero_glyph, 0, &gi);
        look[3] = gi.gm.tileidx;
    }
    for(i = 0; i < RH_DOLL_SLOTS; ++i)
        rh_doll_slot(&look[4 + 3 * i], slots[i], i < 9);    /* 9, 10: in hand */
    if(uarmc)                                               /* slot 3: the cloak */
        look[4 + 3 * 3 + 2] |= rh_doll_look(uarmc, rh_cloak_looks, SIZE(rh_cloak_looks));
    if(uarmh)                                               /* slot 0: the helmet */
        look[4 + 3 * 0 + 2] |= rh_doll_look(uarmh, rh_helm_looks, SIZE(rh_helm_looks));
    if(uarms)                                               /* slot 4: the shield */
        look[4 + 3 * 4 + 2] |= rh_doll_look(uarms, rh_shield_looks, SIZE(rh_shield_looks));
    if(uarmg)                                               /* slot 5: the gloves */
        look[4 + 3 * 5 + 2] |= rh_doll_look(uarmg, rh_glove_looks, SIZE(rh_glove_looks));
    if(uarmf)                                               /* slot 6: the boots */
        look[4 + 3 * 6 + 2] |= rh_doll_look(uarmf, rh_boot_looks, SIZE(rh_boot_looks));
    if(uamul)                                               /* slot 8: the amulet */
        look[4 + 3 * 8 + 2] |= rh_doll_look(uamul, rh_amulet_looks, SIZE(rh_amulet_looks));
    if(ublindf)                                             /* slot 7: the eyewear */
        look[4 + 3 * 7 + 2] |= rh_doll_look(ublindf, rh_eyewear_looks, SIZE(rh_eyewear_looks));
    /* Knuth's multiplicative hash, high bits: games started seconds apart
       should not just step through the tones in order. */
    look[RH_DOLL_LEN - 2] = (int) ((((unsigned) ubirthday) * 2654435761U) >> 16);
    look[RH_DOLL_LEN - 1] = iflags.rh_skintone;

    if(!memcmp(look, last, sizeof look))
        return;
    memcpy(last, look, sizeof look);

    arr = (*jEnv)->NewIntArray(jEnv, RH_DOLL_LEN);
    (*jEnv)->SetIntArrayRegion(jEnv, arr, 0, RH_DOLL_LEN, look);
    JNICallV(jHeroLook, arr);
    destroy_jobject(arr);
}

staticfn void and_send_status_fields(void)
{
    int idx;

    if(!jStatusField)
        return;

    for(idx = 0; idx < MAXBLSTATS; ++idx)
    {
        const char *val;
        jbyteArray jstr;

        if(idx == BL_CONDITION || !status_activefields[idx])
            continue;

        val = status_vals[idx];
        if(!val)
            continue;
        while(*val == ' ')
            ++val;

        jstr = create_bytearray(val);
        JNICallV(jStatusField, idx, jstr, status_colors[idx] & 0xFF);
        destroy_jobject(jstr);
    }

    /* The condition mask travels as an int; the names are Java's to render. */
    JNICallV(jStatusField, BL_CONDITION, (jbyteArray) 0, (int) active_conditions);

    if(jPlayerInfo)
    {
        /*
         * Role and race are not status fields.  BL_ALIGN carries the alignment
         * word, but the header's role line also wants "Valkyrie" and "Dwarf".
         */
        const char *role = (flags.female && gu.urole.name.f)
                               ? gu.urole.name.f : gu.urole.name.m;
        jbyteArray jname = create_bytearray(svp.plname);
        jbyteArray jrole = create_bytearray(role ? role : "");
        jbyteArray jrace = create_bytearray(gu.urace.noun ? gu.urace.noun : "");
        /* Bit 0: wizard mode, so the drawers can offer the debug commands. */
        JNICallV(jPlayerInfo, jname, jrole, jrace, wizard ? 1 : 0);
        destroy_jobject(jname);
        destroy_jobject(jrole);
        destroy_jobject(jrace);
    }
}

void and_status_flush()
{
    enum statusfields idx, *fieldlist;
    register int i;

    static enum statusfields fieldorder_line1[] = {
        BL_TITLE, BL_STR, BL_DX, BL_CO, BL_IN, BL_WI, BL_CH, BL_ALIGN, BL_SCORE,
        BL_FLUSH, BL_FLUSH, BL_FLUSH, BL_FLUSH, BL_FLUSH, BL_FLUSH
    };

    static enum statusfields fieldorder_line2[] = {
        BL_LEVELDESC, BL_GOLD, BL_HP, BL_HPMAX, BL_ENE, BL_ENEMAX, BL_AC, BL_XP,
        BL_EXP, BL_HD, BL_TIME, BL_HUNGER, BL_CAP, BL_CONDITION, BL_FLUSH
    };

    curs(WIN_STATUS, 1, 0);
    for(i = 0; (idx = fieldorder_line1[i]) != BL_FLUSH; ++i)
        print_status_field(idx, i == 0);

    curs(WIN_STATUS, 1, 1);
    for(i = 0; (idx = fieldorder_line2[i]) != BL_FLUSH; ++i)
        print_status_field(idx, i == 0);

    and_send_status_fields();   /* Rolehack */
    and_send_here_context(TRUE);    /* Rolehack */
    and_bot_updated();
}

staticfn win_request_info* and_ctrl_nhwindow(winid window, int request, win_request_info *wri) {
    return NULL;
}

//____________________________________________________________________________________
void and_putmixed(winid window, int attr, const char *str)
{
    //debuglog("put mixed: %s", str);
    genl_putmixed(window, attr, str);
}

//____________________________________________________________________________________
//display_file(str, boolean complain)
//      -- Display the file named str.  Complain about missing files
//         iff complain is TRUE.
void and_display_file(const char *name, boolean complain)
{
    //debuglog("and_display_file(%s, %d)", name, complain);

    dlb* f;
    char buf[BUFSZ];
    char *cr;

    and_clear_nhwindow(WIN_MESSAGE);
    f = dlb_fopen(name, "r");
    if(f)
    {
        winid datawin = and_create_nhwindow(NHW_TEXT);
        boolean empty = TRUE;
        while(dlb_fgets(buf, BUFSZ, f))
        {
            if((cr = strchr(buf, '\n')) != 0)
                *cr = 0;
            if(strchr(buf, '\t') != 0)
                (void)tabexpand(buf);
            empty = FALSE;
            and_putstr(datawin, 0, buf);
        }
        (void)dlb_fclose(f);
        if(!empty)
            and_display_nhwindow(datawin, TRUE);
        and_destroy_nhwindow(datawin);
    }
}

//____________________________________________________________________________________
//start_menu(window)
//      -- Start using window as a menu.  You must call start_menu()
//         before add_menu().  After calling start_menu() you may not
//         putstr() to the window.  Only windows of type NHW_MENU may
//         be used for menus.
void and_start_menu(winid wid, unsigned long behavior)
{
    JNICallV(jStartMenu, wid);
}

//____________________________________________________________________________________
//add_menu(windid window, int glyph, const anything identifier,
//              char accelerator, char groupacc,
//              int attr, char *str, boolean preselected)
//      -- Add a text line str to the given menu window.  If identifier
//         is 0, then the line cannot be selected (e.g. a title).
//         Otherwise, identifier is the value returned if the line is
//         selected.  Accelerator is a keyboard key that can be used
//         to select the line.  If the accelerator of a selectable
//         item is 0, the window system is free to select its own
//         accelerator.  It is up to the window-port to make the
//         accelerator visible to the user (e.g. put "a - " in front
//         of str).  The value attr is the same as in putstr().
//         Glyph is an optional glyph to accompany the line.  If
//         window port cannot or does not want to display it, this
//         is OK.  If there is no glyph applicable, then this
//         value will be NO_GLYPH.
//      -- All accelerators should be in the range [A-Za-z],
//         but there are a few exceptions such as the tty player
//         selection code which uses '*'.
//          -- It is expected that callers do not mix accelerator
//         choices.  Either all selectable items have an accelerator
//         or let the window system pick them.  Don't do both.
//      -- Groupacc is a group accelerator.  It may be any character
//         outside of the standard accelerator (see above) or a
//         number.  If 0, the item is unaffected by any group
//         accelerator.  If this accelerator conflicts with
//         the menu command (or their user defined alises), it loses.
//         The menu commands and aliases take care not to interfere
//         with the default object class symbols.
//      -- If you want this choice to be preselected when the
//         menu is displayed, set preselected to TRUE.
void and_add_menu(winid wid, const glyph_info *glyphinfo, const anything *ident, char accelerator, char groupacc, int attr, int color, const char *str, unsigned int itemflags)
{
    boolean preselected = ((itemflags & MENU_ITEMFLAGS_SELECTED) != 0);
    int tile;
    if (glyphinfo == &nul_glyphinfo) {
        tile = -1;
        /* Rolehack: player selection's entries get their pictures */
        if(program_state.in_role_selection && ident->a_void)
        {
            int glyph = rh_creation_glyph(str);
            if(glyph != NO_GLYPH)
            {
                glyph_info gi;
                map_glyphinfo(0, 0, glyph, 0, &gi);
                tile = gi.gm.tileidx;
            }
        }
    } else {
        tile = glyphinfo->gm.tileidx;
    }

    if(iflags.use_menu_color) {
        color = nhcolor_to_RGB(color);
    } else {
        color = -1;
    }

    //debuglog("add menu %d: %s", attr, str);

    if(attr)
        attr = 1<<attr;

    jbyteArray jstr = create_bytearray(str);
    JNICallV(jAddMenu, wid, tile, ident->a_long, (int)accelerator, (int)groupacc, attr, jstr, (int)preselected, color);
    destroy_jobject(jstr);
}

//____________________________________________________________________________________
//end_menu(window, prompt)
//      -- Stop adding entries to the menu and flushes the window
//         to the screen (brings to front?).  Prompt is a prompt
//         to give the user.  If prompt is NULL, no prompt will
//         be printed.
//      ** This probably shouldn't flush the window any more (if
//      ** it ever did).  That should be select_menu's job.  -dean
void and_end_menu(winid wid, const char *prompt)
{
    jbyteArray jstr;
    rh_menu_confirm = prompt && !strncmp(prompt, "Is this ok?", 11);
    if(prompt)
        jstr = create_bytearray(prompt);
    else
        jstr = create_bytearray("");
    JNICallV(jEndMenu, wid, jstr);
    destroy_jobject(jstr);
}

//____________________________________________________________________________________
//int select_menu(windid window, int how, menu_item **selected)
//      -- Return the number of items selected; 0 if none were chosen,
//         -1 when explicitly cancelled.  If items were selected, then
//         selected is filled in with an allocated array of menu_item
//         structures, one for each selected line.  The caller must
//         free this array when done with it.  The "count" field
//         of selected is a user supplied count.  If the user did
//         not supply a count, then the count field is filled with
//         -1 (meaning all).  A count of zero is equivalent to not
//         being selected and should not be in the list.  If no items
//         were selected, then selected is NULL'ed out.  How is the
//         mode of the menu.  Three valid values are PICK_NONE,
//         PICK_ONE, and PICK_ANY, meaning: nothing is selectable,
//         only one thing is selectable, and any number valid items
//         may selected.  If how is PICK_NONE, this function should
//         never return anything but 0 or -1.
//      -- You may call select_menu() on a window multiple times --
//         the menu is saved until start_menu() or destroy_nhwindow()
//         is called on the window.
//      -- Note that NHW_MENU windows need not have select_menu()
//         called for them. There is no way of knowing whether
//         select_menu() will be called for the window at
//         create_nhwindow() time.
int and_select_menu_r(winid wid, int how, menu_item **selected, int reentry)
{
    int i, n;
    jlongArray a;
    jlong* p;
    jlong* q;


    a = (jlongArray)JNICallO(jSelectMenu, wid, how, reentry);

    *selected = 0;

    if(a == 0)
        return -1;

    n = (*jEnv)->GetArrayLength(jEnv, a);


    if(n > 1) // n should always be 2k (id, count) pairs
    {
        n >>= 1;

        q = p = (*jEnv)->GetLongArrayElements(jEnv, a, 0);
        *selected = (menu_item*)alloc(sizeof(menu_item) * n);
        for(i = 0; i < n; i++)
        {
            (*selected)[i].item = cg.zeroany;
            (*selected)[i].item.a_long = *p++;
            (*selected)[i].count = *p++;
        }
        (*jEnv)->ReleaseLongArrayElements(jEnv, a, q, 0);
    }
    else if(n == 1)
    {
        // special case: ABORT
        if(!program_state.gameover && program_state.something_worth_saving)
            n = 0;
        else
            n = and_select_menu_r(wid, how, selected, 1);
    }

    destroy_jobject(a);

    return n;
}

int and_select_menu(winid wid, int how, menu_item **selected)
{
    /* Rolehack: player selection's pick-one menus are drawn as keys */
    if(program_state.in_role_selection && how == PICK_ONE)
        rh_creation(rh_menu_confirm ? RH_CREATE_CONFIRM : RH_CREATE_PICK,
                    rh_menu_confirm ? rh_hero_glyph() : NO_GLYPH);
    return and_select_menu_r(wid, how, selected, 0);
}

//____________________________________________________________________________________
//char message_menu(char let, int how, const char *mesg)
//      -- tty-specific hack to allow single line context-sensitive
//         help to behave compatibly with multi-line help menus.
//      -- This should only be called when a prompt is active; it
//         sends `mesg' to the message window.  For tty, it forces
//         a --More-- prompt and enables `let' as a viable keystroke
//         for dismissing that prompt, so that the original prompt
//         can be answered from the message line "help menu".
//      -- Return value is either `let', '\0' (no selection was made),
//         or '\033' (explicit cancellation was requested).
//      -- Interfaces which issue prompts and messages to separate
//         windows typically won't need this functionality, so can
//         substitute genl_message_menu (windows.c) instead.
char and_message_menu(char let, int how, const char* mesg)
{
    //debuglog("message_menu: %s", mesg);

    pline("%s", mesg);
    return 0;
}

//____________________________________________________________________________________
//update_inventory()
//      -- Indicate to the window port that the inventory has been
//         changed.
//      -- Merely calls display_inventory() for window-ports that
//         leave the window up, otherwise empty.
void and_update_inventory(int arg)
{
    (void) arg;
    //debuglog("and_update_inventory");
}

//____________________________________________________________________________________
//mark_synch()  -- Don't go beyond this point in I/O on any channel until
//         all channels are caught up to here.  Can be an empty call
//         for the moment
void and_mark_synch()
{
    //debuglog("and_mark_synch");
}

//____________________________________________________________________________________
//wait_synch()  -- Wait until all pending output is complete (*flush*() for
//         streams goes here).
//      -- May also deal with exposure events etc. so that the
//         display is OK when return from wait_synch().
void and_wait_synch(void)
{
    //debuglog("and_wait_synch");
}

//____________________________________________________________________________________
#ifdef CLIPPING
//cliparound(x, y)-- Make sure that the user is more-or-less centered on the
//         screen if the playing area is larger than the screen.
//      -- This function is only defined if CLIPPING is defined.
void and_cliparound(int x, int y)
{
    //debuglog("and_cliparound %dx%d (%dx%d)", x, y, u.ux, u.uy);
    JNICallV(jCliparound, x, y, u.ux, u.uy);
}

#endif

//____________________________________________________________________________________
#ifdef POSITIONBAR
//update_positionbar(char *features)
//      -- Optional, POSITIONBAR must be defined. Provide some
//         additional information for use in a horizontal
//         position bar (most useful on clipped displays).
//         Features is a series of char pairs.  The first char
//         in the pair is a symbol and the second char is the
//         column where it is currently located.
//         A '<' is used to mark an upstairs, a '>'
//         for a downstairs, and an '@' for the current player
//         location. A zero char marks the end of the list.
void and_update_positionbar(char *features)
{
    //debuglog("and_update_positionbar");
}

#endif

//____________________________________________________________________________________
//print_glyph(window, x, y, glyph)
//      -- Print the glyph at (x,y) on the given window.  Glyphs are
//         integers at the interface, mapped to whatever the window-
//         port wants (symbol, font, color, attributes, ...there's
//         a 1-1 map between glyphs and distinct things on the map).

void and_print_glyph(winid wid, coordxy x, coordxy y, const glyph_info *glyphinfo, const glyph_info *bkglyphinfo)
{
    (void) bkglyphinfo;
    //debuglog("and_print_glyph wid=%d %dx%d", wid, x, y);

    int tile = glyphinfo->gm.tileidx;
    unsigned int special = glyphinfo->gm.glyphflags;

    /* Rolehack: the doll's look goes out before the hero is drawn */
    if(wid == WIN_MAP && (special & MG_HERO))
        and_send_hero_look(TRUE);

    special &= ~(MG_CORPSE|MG_INVIS|MG_RIDDEN|MG_STATUE); // TODO support
    if(!iflags.hilite_pet)
        special &= ~MG_PET;
    if(!iflags.hilite_pile)
        special &= ~MG_OBJPILE;
    if(!iflags.use_inverse)
        special &= ~MG_DETECT;
    JNICallV(jPrintTile, wid, x, y, tile, glyphinfo->ttychar, nhcolor_to_RGB(glyphinfo->gm.sym.color), special);
}

//____________________________________________________________________________________
// raw_print(str)   -- Print directly to a screen, or otherwise guarantee that
//         the user sees str.  raw_print() appends a newline to str.
//         It need not recognize ASCII control characters.  This is
//         used during startup (before windowing system initialization
//         -- maybe this means only error startup messages are raw),
//         for error messages, and maybe other "msg" uses.  E.g.
//         updating status for micros (i.e, "saving").
void and_raw_print(const char* str)
{
    jbyteArray jstr = create_bytearray(str);
    JNICallV(jRawPrint, ATR_NONE, jstr);
    destroy_jobject(jstr);
}

//____________________________________________________________________________________
// raw_print_bold(str)
//      -- Like raw_print(), but prints in bold/standout (if possible).
void and_raw_print_bold(const char* str)
{
    jbyteArray jstr = create_bytearray(str);
    JNICallV(jRawPrint, ATR_BOLD, jstr);
    destroy_jobject(jstr);
}

//____________________________________________________________________________________
//int nhgetch() -- Returns a single character input from the user.
//      -- In the tty window-port, nhgetch() assumes that tgetch()
//         will be the routine the OS provides to read a character.
//         Returned character _must_ be non-zero and it must be
//                   non meta-zero too (zero with the meta-bit set).
int and_nhgetch()
{
    //debuglog("and_nhgetch");
    int c = JNICallI(jReceiveKey);

    rh_msg_input();     /* Rolehack: the band dims; the next message starts a page */
    quit_if_possible = FALSE;
    if(c == 0x80)
    {
        if(!program_state.gameover && program_state.something_worth_saving)
        {
            c = '\033';
            quit_if_possible = TRUE;
        }
        else
            c = and_nhgetch();
    }
    return c;
}

void and_you_die()
{
    JNICallV(jShowLog, 1);
    and_nhgetch();
}

//____________________________________________________________________________________
//int nh_poskey(int *x, int *y, int *mod)
//      -- Returns a single character input from the user or a
//         a positioning event (perhaps from a mouse).  If the
//         return value is non-zero, a character was typed, else,
//         a position in the MAP window is returned in x, y and mod.
//         mod may be one of
//
//          CLICK_1     /* mouse click type 1 */
//          CLICK_2     /* mouse click type 2 */
//
//         The different click types can map to whatever the
//         hardware supports.  If no mouse is supported, this
//         routine always returns a non-zero character.

// hack: don't accept dir commands from touch events when mouse is locked. translate to tile position instead
static boolean bMouseLock;
void lock_mouse_cursor(boolean bLock)
{
    bMouseLock = bLock;
}

int and_nh_poskey(coordxy *x, coordxy *y, int *mod)
{
    //debuglog("and_nh_poskey");
    jintArray a;

    and_send_hero_look(FALSE);   /* Rolehack: the paper doll */
    and_send_here_context(FALSE);    /* Rolehack: after a move that made no status pass */
    rh_rules_restore();              /* Rolehack: the kept message rules, once */
    rh_rules_sync();                 /* ... and kept again when they change */
    a = (*jEnv)->NewIntArray(jEnv, 2);
    int c = JNICallI(jReceivePosKey, bMouseLock, a);
    rh_msg_input();     /* Rolehack: the band dims; the next message starts a page */
    if(!c)
    {
        int* e = (*jEnv)->GetIntArrayElements(jEnv, a, 0);
        *x = e[0];
        *y = e[1];
        *mod = CLICK_1;
        (*jEnv)->ReleaseIntArrayElements(jEnv, a, e, 0);
    }
    quit_if_possible = FALSE;
    if(c == 0x80)
    {
        if(!program_state.gameover && program_state.something_worth_saving)
        {
            c = '\033';
            quit_if_possible = TRUE;
        }
        else
            c = and_nh_poskey(x, y, mod);
    }
    destroy_jobject(a);
    if(c == RH_KEY_RULES)
    {
        /* Rolehack: GAME -> Message rules */
        rh_rules_menu();
        return and_nh_poskey(x, y, mod);
    }
    return c;
}

//____________________________________________________________________________________
//nhbell()  -- Beep at user.  [This will exist at least until sounds are
//         redone, since sounds aren't attributable to windows anyway.]
void and_nhbell()
{
//  debuglog("and_nhbell");
}

//____________________________________________________________________________________
//doprev_message()
//      -- Display previous messages.  Used by the ^P command.
//      -- On the tty-port this scrolls WIN_MESSAGE back one line.
int and_doprev_message()
{
//  debuglog("and_doprev_message");
    JNICallV(jShowLog, 1);
    /* Rolehack: a long press on a line makes a message rule from it */
    if(and_nhgetch() == RH_KEY_RULE)
        rh_rule_from_log();
    return 0;
}

//____________________________________________________________________________________
// char yn_function(const char *ques, const char *choices, char default)
//      -- Print a prompt made up of ques, choices and default.
//         Read a single character response that is contained in
//         choices or default.  If choices is NULL, all possible
//         inputs are accepted and returned.  This overrides
//         everything else.  The choices are expected to be in
//         lower case.  Entering ESC always maps to 'q', or 'n',
//         in that order, if present in choices, otherwise it maps
//         to default.  Entering any other quit character (SPACE,
//         RETURN, NEWLINE) maps to default.
//      -- If the choices string contains ESC, then anything after
//         it is an acceptable response, but the ESC and whatever
//         follows is not included in the prompt.
//      -- If the choices string contains a '#' then accept a count.
//         Place this value in the global "yn_number" and return '#'.
//      -- This uses the top line in the tty window-port, other
//         ports might use a popup.
//      -- If choices is NULL, all possible inputs are accepted and
//         returned, preserving case (upper or lower.) This means that
//         if the calling function needs an exact match, it must handle
//         user input correctness itself.
char and_yn_function(const char *question, const char *choices, char def)
{
    char ch;
    char message[BUFSZ];
    char res_ch[2];
    boolean digit_ok, allow_num;
    intptr_t esc;
    int nChoices;

    /* Rolehack: role.c asks "Shall I pick a character for you? [ynaq]"
       with no choices and reads any key, which here meant a question on the
       message line and no way to answer it but the keys.  A question that
       ends in letters in brackets gets those letters as its buttons, as the
       web port does; the caller still checks what comes back. */
    char rh_choices[QBUFSZ], rh_question[BUFSZ];
    if(!choices && question)
    {
        const char *lb = strrchr(question, '[');
        size_t n = lb ? strspn(lb + 1, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ") : 0;

        if(lb && n > 0 && n < sizeof rh_choices && lb[1 + n] == ']'
           && !lb[2 + n + strspn(lb + 2 + n, " ")]
           && (size_t) (lb - question) < sizeof rh_question)
        {
            memcpy(rh_choices, lb + 1, n);
            rh_choices[n] = '\0';
            memcpy(rh_question, question, lb - question);
            rh_question[lb - question] = '\0';
            (void) trimspaces(rh_question);
            choices = rh_choices;
            question = rh_question;
        }
    }

    if(choices)
    {
        nChoices = strlen(choices);
        esc = (intptr_t) strchr(choices, '\033');
        if(esc)
            esc -= (intptr_t)choices;
        else
            esc = -1;
    }
    else
    {
        esc = -1;
    }
    allow_num = choices && strchr(choices, '#');

    //if(choices)
    //  debuglog("yn %s [%s](%c)", question, choices, def);
    //else
    //  debuglog("yn %s", question);

    if(iflags.force_invmenu && choices && nChoices <= 4 && esc < 0 && !allow_num)
    {
        int i;
        // pop up dialog
        jbyteArray jq = create_bytearray(question);
        jbyteArray jb = (*jEnv)->NewByteArray(jEnv, nChoices);
        jbyte* pTmp = (*jEnv)->GetByteArrayElements(jEnv, jb, 0);
        memcpy(pTmp, choices, nChoices);
        (*jEnv)->ReleaseByteArrayElements(jEnv, jb, pTmp, 0);
        JNICallV(jYNFunction, jq, jb, def);
        destroy_jobject(jq);
        destroy_jobject(jb);

        ch = and_nhgetch();
        return ch;
    }

    if(choices)
    {
        char choicebuf[QBUFSZ];

        strcpy(choicebuf, choices);
        if(esc >= 0)
        {
            /* anything beyond <esc> is hidden */
            choicebuf[esc] = '\0';
        }
        sprintf(message, "%s [%s]", question, choicebuf);
        if(def)
            sprintf(eos(message), " (%c) ", def);   /* Rolehack: tty's spacing, "[yn] (n)" */
    }
    else
    {
        strcpy(message, question);
        strcat(message, " ");
    }

    if(strstr(question, "what direction"))
    {
        // directional choice
        and_clear_nhwindow(WIN_MESSAGE);
        and_putstr(WIN_MESSAGE, ATR_BOLD, message);
        if(iflags.force_invmenu)
        {
            JNICallV(jShowDPad);
            ch = and_nhgetch();
            return ch;
        }
        else
        {
            coordxy x = u.ux, y = u.uy;
            int mod = 0;
            int ch = and_nh_poskey(&x, &y, &mod);
            if(!ch)
            {
                x -= u.ux;
                y -= u.uy;
                if(x > 2*abs(y))
                    x = 1, y = 0;
                else if(y > 2*abs(x))
                    x = 0, y = 1;
                else if(x < -2*abs(y))
                    x = -1, y = 0;
                else if(y < -2*abs(x))
                    x = 0, y = -1;
                else
                    x = sgn(x), y = sgn(y);

                if(x == 0 && y == 0)    /* map click on player to "rest" command */
                    ch = '.';
                else
                    ch = xytodir(x, y);
            }
            return ch;
        }
    }

    // and_clear_nhwindow(WIN_MESSAGE);
    and_putstr(WIN_MESSAGE, ATR_BOLD, message);
    rh_answers(choices, def);   /* Rolehack: the answers on the pad */

    ch = 0;
    do
    {
        ch = and_nhgetch();
        if(choices)
            ch = lowc(ch);
        else
            break; /* If choices is NULL, all possible inputs are accepted and returned. */

        digit_ok = allow_num && digit(ch);
        if(ch == '\033')
        {
            if(strchr(choices, 'q'))
                ch = 'q';
            else if(strchr(choices, 'n'))
                ch = 'n';
            else
                ch = def;
            break;
        }
        else if(strchr(quitchars, ch))
        {
            ch = def;
            break;
        }
        else if(!strchr(choices, ch) && !digit_ok)
        {
            and_nhbell();
            ch = (char)0;
            /* and try again... */
        }
        else if(ch == '#' || digit_ok)
        {
            char z, digit_string[2];
            int n_len = 0;
            long value = 0;
            and_putstr_ex(WIN_MESSAGE, 1<<ATR_BOLD, "#", 1, CLR_WHITE);
            n_len++;
            digit_string[1] = '\0';
            if(ch != '#')
            {
                digit_string[0] = ch;
                and_putstr_ex(WIN_MESSAGE, 1<<ATR_BOLD, digit_string, 1, CLR_WHITE);
                n_len++;
                value = ch - '0';
                ch = '#';
            }
            do
            { /* loop until we get a non-digit */
                z = lowc(readchar());
                if(digit(z))
                {
                    value = (10 * value) + (z - '0');
                    if(value < 0)
                        break; /* overflow: try again */
                    digit_string[0] = z;
                    and_putstr_ex(WIN_MESSAGE, 1<<ATR_BOLD, digit_string, 0, CLR_WHITE);
                    n_len++;
                }
                else if(z == 'y' || strchr(quitchars, z))
                {
                    if(z == '\033')
                        value = -1; /* abort */
                    z = '\n'; /* break */
                }
                else if(z == 0x7f)
                {
                    if(n_len <= 1)
                    {
                        value = -1;
                        break;
                    }
                    else
                    {
                        value /= 10;
                        and_putstr_ex(WIN_MESSAGE, 1<<ATR_BOLD, digit_string, -2, CLR_WHITE);
                        n_len--;
                    }
                }
                else
                {
                    value = -1; /* abort */
                    and_nhbell();
                    break;
                }
            }
            while(z != '\n');
            if(value > 0)
                yn_number = value;
            else if(value == 0)
                ch = 'n'; /* 0 => "no" */
            else
            { /* remove number from top line, then try again */
                and_putstr_ex(WIN_MESSAGE, 1<<ATR_BOLD, digit_string, -n_len-1, CLR_WHITE);
                n_len = 0;
                ch = (char)0;
            }
        }
    }
    while(!ch);
    rh_answers(NULL, 0);        /* Rolehack: the pad is the pad again */

    /* display selection in the message window */
    if(choices)
    {
        if(isprint(ch) && ch != '#')
        {
            res_ch[0] = ch;
            res_ch[1] = '\x0';
            and_putstr_ex(WIN_MESSAGE, 1<<ATR_BOLD, res_ch, 1, CLR_WHITE);
        }
    }
    else
    {
        and_clear_nhwindow(WIN_MESSAGE);
    }

    return ch;
}

//____________________________________________________________________________________
void and_n_getline(const char* question, char* buf, int nMax, int showLog)
{
    and_n_getline_r(question, buf, nMax, showLog, 0);
}

void and_n_getline_r(const char* question, char* buf, int nMax, int showLog, int reentry)
{
    int i, n;
    const jchar* pChars;
    jstring jstr;
    jbyteArray jq;

    jq = create_bytearray(question);
    jstr = (jstring)JNICallO(jGetLine, jq, nMax, showLog, reentry);
    destroy_jobject(jq);


    n = (*jEnv)->GetStringLength(jEnv, jstr);
    if(n >= nMax)
        n = nMax - 1;
    i = 0;
    if(n > 0)
    {
        pChars = (*jEnv)->GetStringChars(jEnv, jstr, 0);
    //debuglog("    returned %c %s", *pChars, pChars);
        if(*pChars == 0x80)
        {
            // special case: ABORT
            if(!program_state.gameover && program_state.something_worth_saving)
            {
                buf[0] = '\033';
                i = 1;
            }
            else
            {
                (*jEnv)->ReleaseStringChars(jEnv, jstr, pChars);
                destroy_jobject(jstr);
                and_n_getline_r(question, buf, nMax, showLog, 1);
                return;
            }
        }
        else if(*pChars == '\033')
        {
            buf[0] = '\033';
            i = 1;
        }
        else
        {
            for(; i < n; i++)
            {
                if(isprint(pChars[i]))
                    buf[i] = pChars[i];
                else
                    buf[i] = '?';
            }
        }
        (*jEnv)->ReleaseStringChars(jEnv, jstr, pChars);
    }
    destroy_jobject(jstr);
    buf[i] = 0;
}

//____________________________________________________________________________________
// getlin(const char *ques, char *input)
//      -- Prints ques as a prompt and reads a single line of text,
//         up to a newline.  The string entered is returned without the
//         newline.  ESC is used to cancel, in which case the string
//         "\033\000" is returned.
//      -- getlin() must call flush_screen(1) before doing anything.
//      -- This uses the top line in the tty window-port, other
//         ports might use a popup.
//      -- getlin() can assume the input buffer is at least BUFSZ
//         bytes in size and must truncate inputs to fit, including
//         the nul character.
void and_getlin(const char *question, char *input)
{
//  debuglog("and_getlin '%s'", question);
    and_n_getline(question, input, BUFSZ, FALSE);
}

void and_getlin_log(const char *question, char *input)
{
    and_n_getline(question, input, BUFSZ, TRUE);
}

//____________________________________________________________________________________
//askname() -- Ask the user for a player name.
void and_askname()
{
//  debuglog("ask name");

    int i, n, w;
    const jchar* pChars;
    jstring jstr;

    char** saves = get_saved_games();

    int nSaves = 0;
    while(saves && saves[nSaves])
        nSaves++;

    jclass stringClass = (*jEnv)->FindClass(jEnv, "java/lang/String");
    jobjectArray strings = (*jEnv)->NewObjectArray(jEnv, nSaves, stringClass, 0);
    for(i = 0; i < nSaves; i++) {
        char *first_del = strchr(saves[i], '-');
        if (first_del) *first_del = 0;
        (*jEnv)->SetObjectArrayElement(jEnv, strings, i, (*jEnv)->NewStringUTF(jEnv, saves[i]));
    }

    jstr = (jstring)JNICallO(jAskName, PL_NSIZ, strings);

    for(i = 0; i < nSaves; i++)
        destroy_jobject((*jEnv)->GetObjectArrayElement(jEnv, strings, i));
    destroy_jobject(strings);

    n = (*jEnv)->GetStringLength(jEnv, jstr) - 1;
    w = n;
    if(n >= PL_NSIZ)
        n = PL_NSIZ - 1;
    i = 0;
    if(n > 0)
    {
        pChars = (*jEnv)->GetStringChars(jEnv, jstr, 0);
        if(*pChars == 0x80 || *pChars == '\033')
        {
            clearlocks();
            and_exit_nhwindows("bye");
            nh_terminate(EXIT_SUCCESS);
        }

        if( pChars[w] == '1' )
            wizard = TRUE;

        for(; i < n; i++)
        {
            if(isprint(pChars[i]))
                svp.plname[i] = pChars[i];
            else
                svp.plname[i] = '?';
        }
        (*jEnv)->ReleaseStringChars(jEnv, jstr, pChars);
    }
    svp.plname[i] = 0;
    destroy_jobject(jstr);
}

//____________________________________________________________________________________
//int get_ext_cmd(void)
//      -- Get an extended command in a window-port specific way.
//         An index into extcmdlist[] is returned on a successful
//         selection, -1 otherwise.
int do_ext_cmd_menu(BOOLEAN_P complete)
{
//  debuglog("and_get_ext_cmd");
    winid wid;
    int i, count, what, flgs;
    menu_item *selected = NULL;
    anything any = cg.zeroany;
    char accelerator = 'a', tmp_acc = 0;
    const char *ptr;

    wid = and_create_nhwindow(NHW_MENU);
    and_start_menu(wid, MENU_BEHAVE_STANDARD);
    for(i = 0; (ptr = extcmdlist[i].ef_txt); i++)
    {
        flgs = extcmdlist[i].flags;
        if((flgs & WIZMODECMD) && !wizard)
            continue;

        if(!complete && !(flgs & AUTOCOMPLETE) && !(flgs & WIZMODECMD))
            continue;

        any.a_int = i+1;
        and_add_menu(wid, &nul_glyphinfo, &any, accelerator, 0, ATR_NONE, NO_COLOR, ptr, MENU_ITEMFLAGS_NONE);

        if(accelerator == 'z')
            accelerator = 'A';
        else if(accelerator == 'Z')
            accelerator = 0;
        else
            accelerator++;
    }
    any.a_int = i+1;
    if(!complete)
        and_add_menu(wid, &nul_glyphinfo, &any, '*', 0, ATR_NONE, NO_COLOR, "(list everything)", 0);
    and_end_menu(wid, "Extended command");
    count = and_select_menu(wid, PICK_ONE, &selected);
    what = count > 0 ? selected->item.a_int - 1 : -1;
    if(selected)
        free(selected);
    and_destroy_nhwindow(wid);

    return what == any.a_int-1 ? do_ext_cmd_menu(TRUE) : what;
}

const char* complete_ext_cmd(const char* base)
{
    int i, icmd = -1;

    for(i = 0; extcmdlist[i].ef_txt != (char *)0; i++)
    {
        if(!strncmpi(base, extcmdlist[i].ef_txt, strlen(base)))
        {
            if(icmd == -1)  /* no matches yet */
                icmd = i;
            else            /* more than 1 match */
                return 0;
        }
    }

    if(icmd >= 0)
        return extcmdlist[icmd].ef_txt;

    return 0;
}

void get_ext_cmd_auto(const char *query, register char *bufp)
{
    register int n = 0, nl = 0;
    const char* complete = 0;
    register int c;
    const int maxc = COLNO >= BUFSZ ? BUFSZ-1 : COLNO;

    pline("%s ", query);
    bufp[n] = 0;
    for(;;)
    {
        c = and_nhgetch();
        if(c == EOF || c == '\n')
        {
            bufp[n] = 0;
            if(complete)
                strcpy(bufp, complete);
            save_msg(bufp);
            break;
        }
        if(c == '\033')
        {
            bufp[0] = c;
            bufp[1] = 0;
            break;
        }
        if(c == 0x7f)
        {
            if(n > 0)
                bufp[--n] = 0;
        }
        else if(' ' <= (unsigned char) c && n < maxc)
        {
            bufp[n] = c;
            bufp[++n] = 0;
        }
        complete = complete_ext_cmd(bufp);
        and_putstr_ex(WIN_MESSAGE, 0, bufp, -nl-1, CLR_WHITE);
        if(complete) {
            and_putstr_ex(WIN_MESSAGE, 1<<ATR_INVERSE, complete + n, 1, CLR_WHITE);
        }
        nl = complete ? strlen(complete) : n;
    }
    clear_nhwindow(WIN_MESSAGE);    /* clean up after ourselves */
}

/*
 * Read in an extended command, doing command line completion.  We
 * stop when we have found enough characters to make a unique command.
 */
int do_ext_cmd_text()
{
    int i;
    char buf[BUFSZ];

    get_ext_cmd_auto("#", buf);

    (void) mungspaces(buf);
    if (buf[0] == 0 || buf[0] == '\033') return -1;

    for (i = 0; extcmdlist[i].ef_txt != (char *)0; i++)
        if (!strcmpi(buf, extcmdlist[i].ef_txt)) break;

    if (!gi.in_doagain) {
        int j;
        for (j = 0; buf[j]; j++)
            cmdq_add_key(CQ_REPEAT, buf[j]);
        cmdq_add_key(CQ_REPEAT, '\n');
    }

    if (extcmdlist[i].ef_txt == (char *)0) {
        pline("%s: unknown extended command.", buf);
        i = -1;
    }

    return i;
}

int and_get_ext_cmd()
{
    /*
     * Rolehack: always menu.  Typing a command name is the worse interaction on
     * a touch device, and the menu's '*' entry reaches the complete extcmdlist
     * anyway.  Restore the iflags.extmenu test to get the typed prompt back.
     */
    return do_ext_cmd_menu(FALSE);
}

//____________________________________________________________________________________
//number_pad(state)
//      -- Initialize the number pad to the given state.
void and_number_pad(int state)
{
//  debuglog("and_number_pad(%d)", state);
    JNICallV(jSetNumPadOption, state);
}

//____________________________________________________________________________________
//delay_output()    -- Causes a visible delay of 50ms in the output.
//         Conceptually, this is similar to wait_synch() followed
//         by a nap(50ms), but allows asynchronous operation.
void and_delay_output()
{
//  debuglog("and_delay_output()");
    JNICallV(jDelayOutput);
}

//____________________________________________________________________________________
#ifdef CHANGE_COLOR
void and_change_color(int color_number, long rgb, int reverse)
{
    // debuglog("and_change_color %d == 0x%X %s", color_number, rgb, reverse?" reverse":"");
    if(color_number >= 0 && color_number < CLR_MAX)
        palette[color_number] = 0xFF000000 | rgb;
}

//____________________________________________________________________________________
char* and_get_color_string()
{
//  debuglog("and_get_color_string");
    return "";
}
#endif

//____________________________________________________________________________________
//start_screen()    -- Only used on Unix tty ports, but must be declared for
//         completeness.  Sets up the tty to work in full-screen
//         graphics mode.  Look at win/tty/termcap.c for an
//         example.  If your window-port does not need this function
//         just declare an empty function.
void and_start_screen()
{
//  debuglog("and_start_screen");
}

//____________________________________________________________________________________
//end_screen()  -- Only used on Unix tty ports, but must be declared for
//         completeness.  The complement of start_screen().
void and_end_screen()
{
//  debuglog("and_end_screen");
}

//____________________________________________________________________________________
// and_getmsghistory(init)
//      window ports can provide their own getmsghistory() routine to
//      preserve message history between games. The routine is called
//      repeatedly from the core save routine, and the window port is
//      expected to successively return each message that it wants
//      saved, starting with the oldest message first, finishing with
//      the most recent. Return null pointer when finished.
int add_msghistory_idx(boolean idx)
{
    return (idx + 1) % (sizeof(msghistory)/sizeof(char*));
}
char* and_getmsghistory(boolean init)
{
    if(init)
    {
        msghistory_idx0 = msghistory_idx;
        while(1)
        {
            if(msghistory[msghistory_idx0])
                return msghistory[msghistory_idx0];
            msghistory_idx0 = add_msghistory_idx(msghistory_idx0);
            if(msghistory_idx0 == msghistory_idx)
                return 0;
        };
    }
    else
    {
        msghistory_idx0 = add_msghistory_idx(msghistory_idx0);
        if(msghistory_idx0 == msghistory_idx)
            return 0;
        return msghistory[msghistory_idx0];
    }
}

// and_putmsghistory(msg, restoring)
//      window ports can provide their own putmsghistory() routine
//      to load message history from a saved game. The routine is
//      called repeatedly from the core restore routine, starting
//      with the oldest saved message first, and finishing with
//      the latest. The window port routine is expected to load
//      the message recall buffers in such a way that the ordering
//      is preserved. The window port routine should make no
//      assumptions about how many messages are forthcoming, nor
//      should it assume that another message will follow this
//      one, so it should keep all pointers/indexes intact at the
//      end of each call.
void and_putmsghistory(const char *msg, boolean restoring)
{
    if(!msg) return;
    if(restoring)
    {
//      debuglog("restore msghistory: %s", msg);
        restoring_msghistory = TRUE;
        and_putstr(WIN_MESSAGE, ATR_NONE, msg);
        restoring_msghistory = FALSE;
    }
    else
    {
//      debuglog("put msghistory: %s", msg);
    }
}

void save_msg(const char* msg)
{
    if(!msg || !*msg || !strcmp("Restoring save file...", msg))
        return;
    if(msghistory[msghistory_idx])
        free(msghistory[msghistory_idx]);
    msghistory[msghistory_idx] = strdup(msg);
    msghistory_idx = add_msghistory_idx(msghistory_idx);
}

int doshowlog()
{
//  debuglog("doshowlog");
    JNICallV(jShowLog, 0);
    return 0;
}

#ifdef USER_SOUNDS
void load_usersound(const char *filename)
{
    //debuglog("load_usersound(%s)", filename);
    jbyteArray jstr = create_bytearray(filename);
    JNICallV(jLoadSound, jstr);
    destroy_jobject(jstr);
}

void play_usersound(char *filename, int32_t volume, int32_t idx)
{
    (void) idx;
    //debuglog("play_usersound(%s, %d)", filename, volume);
    jbyteArray jstr = create_bytearray(filename);
    JNICallV(jPlaySound, jstr, volume);
    destroy_jobject(jstr);
}

#ifdef SND_LIB_ANDROIDSOUND
struct sound_procs androidsound_procs = {
    SOUNDID(androidsound),
    .sound_triggers = SOUND_TRIGGER_USERSOUNDS,
    .sound_play_usersound = play_usersound,
};
#endif
#endif /* USER_SOUNDS */

#ifdef DUMPLOG
void and_get_dumplog_dir(char* buf)
{
    int i, n;
    const jchar* pChars;
    jstring jstr;

    jstr = (jstring)JNICallO(jGetDumplogDir);
    n = (*jEnv)->GetStringLength(jEnv, jstr);

    if(n > 0 && n < BUFSZ - 1)
    {
        pChars = (*jEnv)->GetStringChars(jEnv, jstr, 0);
        for(i = 0; i < n; i++)
            buf[i] = pChars[i];
        (*jEnv)->ReleaseStringChars(jEnv, jstr, pChars);
        if(buf[n - 1] != '/')
            buf[n++] = '/';
    }
    else
        n = 0;
    buf[n] = 0;
    destroy_jobject(jstr);
}
#endif

