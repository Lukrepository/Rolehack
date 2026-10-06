p='DESIGN.md'
s=open(p).read()
n=0
def rep(old,new,count=1):
    global s,n
    assert s.count(old)>=1, old[:90]
    s=s.replace(old,new,count); n+=1
rep("| 12 | Message-band size | 10 dp x-height in both builds. | Android's 10 is closer to the 0.25° at 36 cm target (9.89 dp). |",
    "| 12 | Message-band size | Each build keeps its own x-height, and the rule takes it as an input: the web's 9.5 CSS px (Lucas, 2026-09-28), Android's 10 dp. | Both are near the 0.25° at 36 cm target (9.89 dp). Round 1 sized the web's rows at 10 and called that the web's own figure, which it was not. |")
rep("| 13 | Keyboard and mouse access | Desk mode: the same banks docked under the map at 40 dp, legends, a Ctrl+Space prefix (Ctrl+Shift+Space on ChromeOS), \"hide the dock\". | Brief implication 16. |",
    "| 13 | Keyboard and mouse access | Desk mode: the same banks docked under the map at 40 dp, legends, a Ctrl+; prefix (configurable), \"hide the dock\". | Brief implication 16. Ctrl+Space, Control-Option-Space and Ctrl+Shift+Space all switch input sources on macOS or ChromeOS. |")
rep("| 10.1-2 map glyph floor | The default cell shows at least today's 34 landscape columns with all 21 rows (13.4 dp on Lucas's phone);",
    "| 10.1-2 map glyph floor | The default cell shows at least today's 34 landscape columns where the 12 dp floor allows, with all 21 rows (13.4 dp on Lucas's phone);")
rep("It shows how long the ghost deck needs (it retires itself after three clean sessions).",
    "Try the two old habits too: the pad-centre hold, lift and tap, and the pray hold on the old SACRIFICE spot; both should flash and do nothing. It shows how long the ghost deck needs (it retires itself after three sessions with no unconfirmed preview).")
rep("5. **Map cell.** Play a level at the default (13.4 dp tiles, 34×21), then with `mapCell: 'rows'` (17.7 dp, 26×21).",
    "5. **Map cell.** Play a level at the default (13.4 dp tiles, 34×21), then with `mapCell: 'rows'` (17.8 dp, 25.6×21). The first twin session starts at the default (`zoomFactor` 1×, not carried over from classic's zoom).")
rep("rest on the stairs with a slow centre press and step south: the hero must step, not descend.",
    "rest on the stairs with a slow centre press and step south: the hero must step, not descend. On the stairs, tap CONTEXT once: ↓ lights and nothing happens; a second tap descends. With Fight armed, tap the map: Fight disarms and the hero stays put.")
rep("Confirm the pad does not move between orientations or when the toolbar hides, and that each display mode keeps its own budget.",
    "Confirm the pad does not move between orientations or when the toolbar hides, and that each display mode keeps its own budget. Open a split screen beside a wiki: the page should show classic, and twin should come back when the split closes. Confirm that Ctrl+; reaches the page on each desk OS at hand (macOS, ChromeOS, Windows) and switches no input source.")
rep("| `layout.js` | the rule: a plain ES module, no imports, no DOM; `layout()`, `textMetrics()`, `bankMetrics()`, `deviceCell()`, `tierOf()`, the bank tables. Ships in `win/web/` as it is. |",
    "| `layout.js` | the rule: a plain ES module, no imports, no DOM; `layout()` (with `usable`), `collisions()`, `textMetrics()`, `bankMetrics()`, `deviceCell()`, `tierOf()`, the bank tables. Ships in `win/web/` as it is. |")
rep("| `checks/sweep.mjs` | the CI gate: ten sections, 5,862 layouts; `RH_LAYOUT=<path>` runs it on another build of the rule |",
    "| `checks/sweep.mjs` | the CI gate: ten sections, 73,470 layouts; `RH_LAYOUT=<path>` runs it on another build of the rule |")
rep("| `checks/nearmiss.mjs` | seeded tap-scatter rates under the hit model (§6) |",
    "| `checks/nearmiss.mjs` | seeded tap-scatter rates under the hit model (§6): cross-bank, the row above the action pad, inside the action pad, the map |")
open(p,'w').write(s)
print(n)
