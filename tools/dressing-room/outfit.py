#!/usr/bin/env python3
# Written for Rolehack by Lucas Ruiz, 2026-09-26.  See ROLEHACK-CHANGES.md.
"""A link to the Rolehack Dressing Room wearing a given outfit (2026-09-26).

For showing Lucas a design: write the outfit in plain words, get a link that
opens the Dressing Room already dressed.  The page reads the link's #token
(template.html, applyToken()); this writes it from item names.

    python outfit.py gnome female tone=6 suit="black dragon scale mail" \\
                     cloak="opera cloak" weapon="long sword" shield="shield of reflection"

    BODY      a role (archeologist ... apothecary; also priest, caveman) or a
              race (human, elf, dwarf, gnome, orc) -- a race means showrace
    GENDER    male / female (default male)
    tone=N    skin tone 1-8 (default 2, NetHack's own)
    SLOT=NAME helmet, eyewear, amulet, cloak, suit (or armor/armour), shirt,
              gloves, boots, weapon, offhand, shield.  NAME is the item's name
              or its appearance ("opera cloak" finds the cloak of invisibility).
    costume=off   draw the role's own kit over its tile anyway
    doll=off      show the plain tile

Prints the link, and a local file: link for previewing in the browser pane.
Any python 3; reads data.json beside it (export.py writes it).
"""
import difflib, json, pathlib, sys

HERE = pathlib.Path(__file__).parent
URL = "https://claude.ai/artifact/Q71uL4CefJHJRnfe8g4t7r"
CODES = dict(helmet="h", eyewear="e", amulet="a", cloak="c", suit="s", shirt="u", gloves="g",
             boots="b", weapon="w", offhand="o", shield="d")
ALIAS = dict(armor="suit", armour="suit", body="suit", mail="suit", hat="helmet", helm="helmet",
             glasses="eyewear", blindfold="eyewear", cape="cloak", hand="weapon", wield="weapon",
             twoweapon="offhand", feet="boots")
BODYALIAS = {"priest": "cleric", "priestess": "cleric", "caveman": "cave dweller",
             "cavewoman": "cave dweller", "cave": "cave dweller", "archaeologist": "archeologist",
             "walt": "apothecary"}

def main(argv):
    data = json.load(open(HERE / "data.json"))
    bodies = {b["id"] for b in data["bodies"]}
    keys = sorted({b["key"] for b in data["bodies"]})
    words = [a for a in argv if "=" not in a]
    pairs = [a.split("=", 1) for a in argv if "=" in a]
    if not words:
        sys.exit(__doc__)
    key = BODYALIAS.get(words[0].lower(), words[0].lower())
    if len(words) > 1 and words[1].lower() not in ("male", "female", "m", "f"):   # "cave dweller"
        key = BODYALIAS.get(" ".join(words[:2]).lower(), " ".join(words[:2]).lower())
        words = [key] + words[2:]
    gender = "female" if len(words) > 1 and words[1].lower() in ("female", "f") else "male"
    if f"{key},{gender}" not in bodies:
        sys.exit(f"no body '{key}'; one of: {', '.join(keys)}")
    parts = [key.replace(" ", "_") + "-" + gender[0]]
    tone, extra, worn = 2, [], []
    for k, v in pairs:
        k = ALIAS.get(k.lower(), k.lower())
        if k == "tone":
            tone = int(v)
            if not 1 <= tone <= 8:
                sys.exit("tone is 1 (fairest) to 8 (deepest)")
        elif k == "costume":
            extra += [] if v.lower() in ("on", "1", "yes") else ["k0"]
        elif k == "doll":
            extra += [] if v.lower() in ("on", "1", "yes") else ["n0"]
        elif k in CODES:
            want = "weapon" if k == "offhand" else k
            pool = [i for i in data["items"] if i["slot"] == want and not (k == "offhand" and i.get("held"))]
            v = v.replace("armour", "armor").replace("Armour", "Armor")   # NetHack spells it the American way
            bare = lambda t: t.lower()[4:] if t.lower().startswith("the ") else t.lower()   # "the Mitre" or "Mitre"
            hit = [i for i in pool if bare(v) in (bare(i["name"]), i["look"].lower())]
            if not hit:
                names = sorted({i["name"] for i in pool} | {i["look"] for i in pool})
                close = difflib.get_close_matches(v, names, n=4, cutoff=0.5)
                sys.exit(f"no {k} called '{v}'" + (f"; did you mean {', '.join(close)}?" if close else ""))
            parts.append(CODES[k] + str(hit[0]["id"]))
            worn.append(f"{k}: {hit[0]['name']}" + (f" ({hit[0]['look']})" if hit[0]["look"] != hit[0]["name"] else ""))
        else:
            sys.exit(f"unknown slot '{k}'; slots are {', '.join(CODES)}")
    parts.insert(1, f"t{tone}")
    tok = ".".join(parts + extra)
    print(f"{key}, {gender}, skin tone {tone}" + ("".join(f"\n  {w}" for w in worn) or "\n  (nothing worn)"))
    print(f"{URL}#{tok}")
    print((HERE / "rolehack-dressing-room.html").resolve().as_uri() + "#" + tok)

if __name__ == "__main__":
    main(sys.argv[1:])
