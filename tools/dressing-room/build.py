#!/usr/bin/env python3
# Written for Rolehack by Lucas Ruiz, 2026-09-26.  See ROLEHACK-CHANGES.md.
"""Inline data.json into template.html -> rolehack-dressing-room.html."""
import json, pathlib
here = pathlib.Path(__file__).parent
data = json.dumps(json.load(open(here / "data.json")), separators=(",", ":")).replace("</", r"<\/")
out = (here / "template.html").read_text(encoding="utf-8").replace("__DATA__", data)
(here / "rolehack-dressing-room.html").write_text(out, encoding="utf-8")
print("wrote", len(out), "bytes")
