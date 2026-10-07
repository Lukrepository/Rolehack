# Rolehack

A fork of [NetHack 5.0](https://github.com/NetHack/NetHack) exploring **new player roles** and, later, input design for touch and gamepad.

This is a **proof of concept**, not a release. It compiles, it plays, and it is not balanced.

## Play it in the browser

**https://lukrepository.github.io/Rolehack/** — NetHack 5.0 with the Apothecary, the paper doll and Rolehack's touch controls, as a page. Nothing to install: it runs in Edge, Chrome, Firefox or Safari, on a PC, a tablet or a phone. In Edge or Chrome you can also install it as an app (the "App available" icon at the right end of the address bar); the installed copy starts without a connection.

Games are kept in the browser's own storage for that address. Closing the window keeps the game where it is: give the same name at "Who are you?" to go on. The page shows which commit it was built from at the foot of its loading screen, with a link back to the source here.

The page is built from the [`web`](https://github.com/Lukrepository/Rolehack/tree/web) branch (`win/web/`, `win/shim/`, `win/share/`) and published from the `gh-pages` branch by [`win/web/build.sh`](win/web/build.sh). There is also an Android app, built from [RolehackDroid](https://github.com/Lukrepository/RolehackDroid) and [RolehackFront](https://github.com/Lukrepository/RolehackFront).

Upstream's own documentation is still in [`README`](README); this file describes only what Rolehack adds.

---

## What's here

### The Apothecary — a fourteenth role

NetHack has had thirteen roles since **December 1999**, when Monk and Ranger arrived in 3.3.0 (and the Elf role was removed). `NUM_ROLES` has been `13` through every release since, including 5.0.0. The Apothecary is an attempt at a fourteenth.

**The idea:** alchemy is the deepest system in NetHack that no role is built around. Potion-dipping has real recipes and a genuine upgrade ladder (`src/potion.c`, `mixtype()`), and almost nobody engages with it, because by the time you can identify potions reliably you no longer need to brew them.

So the Apothecary **starts knowing every potion type on sight.** Not their blessed/cursed status — that still has to be earned at an altar, which keeps the Priest's knowledge power distinct and leaves holy water interesting. The role doesn't fight the dungeon so much as process it.

It pays for that: ten starting hit points, two innate intrinsics (poison resistance at XL1, sleep resistance at XL14 — fewer than any role but the Knight), no sword, no polearm, no two-weapon. Human, dwarf, or gnome; lawful or neutral.

### The quest: the Royal Mint

Your leader is **Sir Isaac Newton**, who was made Warden of the Royal Mint in 1695 and personally hunted counterfeiters. Your nemesis is **William Chaloner**, who coined some 30,000 guineas, publicly accused the Mint of incompetence, and was hanged at Tyburn in 1699 after Newton built the case against him with spies and informants. Chaloner wrote him letters begging for mercy from the condemned cell. Newton never replied.

The theme is **false transmutation against true**. A counterfeiter makes base metal look like gold; an alchemist tries to actually make it. The quest artifact is a **touchstone** — the assayer's tool for telling true metal from false — and the guardians of the Mint are assayers. Everything points at the same idea.

Newton summons you through an alchemical working, so the hero is never assumed to be British, or 17th-century, or from Newton's world at all. He petitions rather than conjures, keeps his own faith, and does not presume anything about yours.

### The Lapis Philosophorum

The quest artifact **saves your life while merely carried** — no equipment slot, which is the entire point in an ascension kit where the amulet slot is contested. Unlike an amulet of life saving it is not destroyed. It goes dull and grey, and can be re-tempered:

1. dip the inert stone in **acid** to prime it — with a chance of alchemic blast
2. dip the primed stone in **full healing** to restore it

Each restoration leaves it less stable, so the blast chance climbs with every cycle and the player decides how greedy to be. Doing it in the wrong order is refused without wasting the potion.

*(It is named in Latin because "The Philosopher's Stone" could not be wished for: NetHack's wish parser resolves "stone" to the **rock** object, so the artifact never attached. Latin is also what Newton actually wrote his alchemy in.)*

---

## Building it

Rolehack builds exactly like upstream NetHack 5.0. On Linux (or WSL):

```
cd sys/unix && sh setup.sh hints/linux.500 && cd ..
make fetch-lua
make all && make install
```

For graphical tiles and mouse travel, build both windowports and select at runtime:

```
make WANT_WIN_TTY=1 WANT_WIN_X11=1 all install
NETHACKOPTIONS='windowtype:X11' ./nethack
```

The Apothecary appears in the role menu as **`A`**, directly below Archeologist.

### The browser version (`web` branch)

The core compiles to WebAssembly with the [Emscripten SDK](https://emscripten.org/) (tested with 6.0); the page in `win/web/` is plain JavaScript with no build step of its own. With `emsdk` installed at `~/emsdk` (or `EMSDK` set):

```
sh win/web/build.sh clean
python3 -m http.server 8123 --directory targets/web
```

then open http://localhost:8123/. `build.sh` writes `targets/web/`, which is what the `gh-pages` branch holds. Publishing a new build is copying that directory into `gh-pages` and pushing it, as a new commit on top of the live branch, never forced: [`doc/twin-banks/HANDOFF.md`](doc/twin-banks/HANDOFF.md) has a checked recipe. The page's service worker replaces the installed copy on its next start.

### The `android-port` branch

A separate branch adds a `CROSS_TO_ANDROID` cross-compile target following upstream's existing msdos/amiga/wasm/mips pattern, which builds NetHack 5.0 for `aarch64-linux-android` with the NDK. It has been run on a physical phone via `adb`. Three small, clearly-marked C changes are involved, all in termcap/tty plumbing — no gameplay code.

---

## Provenance

This matters, so it is stated plainly rather than buried.

**The Apothecary — its concept, mechanics, prose, level maps, and implementation — was designed and written by Claude (Anthropic's Opus 5), working in collaboration with [Lucas Ruiz](https://github.com/Lukrepository), who owns this repository.** Every commit carries a `Co-Authored-By: Claude` trailer.

The division of labour, honestly:

- **Claude** proposed the Apothecary and the alchemy premise, found Chaloner in the historical record, wrote the 28 quest messages and the five level maps, implemented all of the C and Lua, and did the testing.
- **Lucas** — who has ascended all thirteen vanilla roles — set the direction and made the design calls: that the Royal Mint should be the quest, that permitted alignments must be justified by quest lore rather than chosen for convenience, that a reflection-granting artifact was derivative and should be cut, that the gold belongs in Chaloner's lair and not the Mint's vault, that a single full-healing potion was far too cheap a price for a life (hence the two-step re-tempering), and that the artifact should be renamed for full consistency rather than kept for a charming exception.

Several bugs were found by Lucas playing it and reporting what he saw — including the role being unreachable in the menu, and every floor tile rendering as a staircase.

Design notes, verification logs, and the analysis this was built on live outside the repo for now.

---

## Status and caveats

- **Proof of concept.** Playable, not balanced. No claim is made that the Apothecary is fair, fun, or finished.
- The Apothecary has its own tiles (a chemist holding a flask up to the light), drawn for Rolehack.
- Not submitted upstream, and not written with upstreaming in mind. NetHack's DevTeam has been conservative about the roster for over a quarter century, and that is their prerogative.
- Licensed under the **NetHack General Public License**, like everything it is derived from. See [`dat/license`](dat/license).

## The Android app

Since 2026-10-07 this branch also holds the Android app's game core: JodiJodington's NetHack 5.0 port (`sys/android/`), with Rolehack's changes, merged in from [RolehackDroid](https://github.com/Lukrepository/RolehackDroid) so that the browser and the phone play the same game. The phone build itself (JDK 17, Android SDK 36, NDK r27d, with [RolehackFront](https://github.com/Lukrepository/RolehackFront) checked out beside the repository) is described in [RolehackDroid's README](https://github.com/Lukrepository/RolehackDroid/blob/rolehack/README.md). The files Rolehack changed in that port, and when, are listed in [`ROLEHACK-CHANGES.md`](ROLEHACK-CHANGES.md).

Credits and licences on the Android side:

- **NetHack 5.0:** the NetHack DevTeam, under the NetHack General Public License (`dat/license`).
- **NetHack for Android:** gurrhack, with the NetHack 5.0 port by JodiJodington. The upstream README is kept here as [UPSTREAM-README.md](UPSTREAM-README.md).
- **The ForkFront user interface:** gurrhack and JodiJodington, with the Rolehack interface in [RolehackFront](https://github.com/Lukrepository/RolehackFront). ForkFront has no licence file in its upstream repositories; its copyright remains with its authors.
- **Rolehack:** Lucas Ruiz, co-authored with Claude, Anthropic's AI model.

---

*NetHack is copyright its authors and the NetHack DevTeam. Rolehack is an unaffiliated fork.*
