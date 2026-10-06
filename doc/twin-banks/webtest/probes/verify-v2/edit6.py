p='DESIGN.md'
s=open(p).read()
n=0
def rep(old,new,count=1):
    global s,n
    assert s.count(old)>=1, old[:90]
    s=s.replace(old,new,count); n+=1
rep("It re-fits at most once, after the first rotation, never under a finger. A window smaller than its budget lays out without it. |",
    "It re-fits at most once, after the first rotation, never under a finger. A window narrower than `budget.w` or shorter than `budget.h`, in either orientation, lays out without it. |")
rep("| safe areas | `viewport-fit=cover` plus a probe element padded with `env(safe-area-inset-*)` | §13 |",
    "| safe areas | `viewport-fit=cover`, written into the viewport meta only while the layout is twin (classic keeps today's meta, which pads for no safe area), plus a probe element padded with `env(safe-area-inset-*)` | §13 |")
rep("**The layout setting** (Lucas, 2026-10-02). MENU → Settings gains \"Layout: twin banks / classic\", prefs key `layout: 'twin' | 'classic'`, default `'twin'`. Classic is today's overlay, unchanged, and stays the fallback: if `layout()` ever returns no spec (it never has, §2), the page shows classic for that window.",
    """**The layout setting** (Lucas, 2026-10-02). MENU → Settings gains "Layout: twin banks / classic", prefs key `layout: 'twin' | 'classic'`, default `'twin'`. Classic is today's overlay, unchanged, and stays the fallback. Twin's own changes stay out of classic's way: the zoom factor (`zoomFactor`, §11), `viewport-fit=cover` and the `paranoid_confirmation` line (§16) apply only while the layout is twin.

What the page does with each `layout()` result, while the setting is twin:
- **Usable, not degraded:** drawn as specified.
- **Usable and degraded** (`fit.degraded`; for instance 46 dp keys on a 336 dp short side, or 40 dp right columns): drawn as given. `layout()` guarantees that every key is on screen and on no other key or the map, that no band or panel covers a key, that the map shows at least 8×8 cells, and that the drawer fits. Only sizes fall under the rule's floors. The Layout setting shows the first reason in one line, never as a pop-up.
- **Unusable** (`usable: false`, `fit.level: 'unusable'`), or no spec at all (something threw): the page shows classic for this window, without changing the setting. Twin comes back at the next re-layout whose result is usable. Today that happens on near-square windows: Lucas's phone in split screen (443x460), squares under about 650 dp, and windows under about 300 dp on a side. No real phone, foldable, split view or tablet in the verifiers' lists is unusable; the sweep's sections 7 and 10 count 2,715.""")
rep("Rolehack's own features sit behind one prefix, Ctrl+Space (configurable). Ctrl+Space switches input sources on macOS and on ChromeOS, so the default there is Ctrl+Option+Space on macOS and **Ctrl+Shift+Space on ChromeOS**. Today Ctrl+Space reaches the game as a space (`web.js:133–150`); the prefix takes it.",
    "Rolehack's own features sit behind one prefix, **Ctrl+;**, the key right of L, matched by `KeyboardEvent.code` (`Semicolon`) whatever the layout prints on it. It is configurable.\n- **Why not Ctrl+Space.** Ctrl+Space switches input sources on macOS and ChromeOS, and so do round 1's replacements: Control-Option-Space on macOS and Ctrl+Shift+Space on ChromeOS.\n- **Why Ctrl+;.** It is on none of the published ChromeOS, macOS or Windows shortcut lists we found. Japanese input methods use it only while composing in a text field, which the game page is not.\n- **The game never had it.** Ctrl+; makes no control character; `web.js` `keyCode()` passes it to the game as a plain `;` (farlook), and the prefix takes it before that.\n- **Before shipping,** test 7 confirms it on each target OS.")
open(p,'w').write(s)
print(n)
