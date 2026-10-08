-- NetHack Apothecary Apo-strt.lua
-- Written for Rolehack by Lucas Ruiz, 2026-07-31 to 2026-08-21.  See ROLEHACK-CHANGES.md.
--      Rolehack: the Apothecary quest -- the Royal Mint.
--      See role-spec-apothecary-2026-07-30.md.
-- NetHack may be freely redistributed.  See license for details.
--
--      The Royal Mint: Sir Isaac Newton and the assay office.

des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noteleport", "hardfloor")

des.map([[
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}........................................................................}}
}}..--------------------------------------------------------------------..}}
}}..|..................................................................|..}}
}}..|...-----------------..............................................|..}}
}}..|...|..{..{...{..{..|..............................................|..}}
}}..|...|...............|....------------------........................|..}}
}}..|...|...............|....|................|........................|..}}
}}..|...|...............|....|................|........................|..}}
}}..|...--------+--------....+.......\........|.....----------------...|..}}
}}..+........................|................|.....|..............|...|..}}
}}..|........................|................|.....|.F.F.F.F.F.F..|...|..}}
}}..|.....------+------......--------+---------.....+..............|...|..}}
}}..|.....|...........|.............................|..............|...|..}}
}}..|.....|...........|.............................|..............|...|..}}
}}..|.....|...........|.............................----------------...|..}}
}}..|.....-------------................................................|..}}
}}..---------------------------------+----------------------------------..}}
}}........................................................................}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
]]);

-- The works are lit; the river is not.
des.region(selection.area(00,00,75,19), "lit")

-- Arrival from the portal: the courtyard between press house and assay office
des.levregion({ region = {26,10,26,10}, type="branch" })
-- Down, towards the warrens
des.stair("down", 60,13)

-- Doors.  Closed, not locked: without a key or a credit card a
-- player can only kick them in, which is a poor way to be let
-- into the King's Mint.
des.door("closed",37,17)
des.door("closed",04,10)
des.door("closed",16,09)
des.door("closed",37,12)
des.door("closed",29,09)
des.door("closed",52,12)
des.door("closed",16,12)

-- Sir Isaac Newton at his bench in the assay office
des.monster({ id = "Sir Isaac Newton", coord = {37, 8}, inventory = function()
   des.object({ id = "touchstone" });
   des.object({ id = "scroll of magic mapping" });
end })
des.object("chest", 37, 8)

-- Assayers, at the benches and on the doors
des.monster("assayer", 33, 08)
des.monster("assayer", 33, 10)
des.monster("assayer", 41, 08)
des.monster("assayer", 41, 10)
des.monster("assayer", 30, 09)
des.monster("assayer", 45, 09)
des.monster("assayer", 16, 07)
des.monster("assayer", 60, 12)

-- Stock in trade
des.object("gold piece", 55, 11)
des.object("gold piece", 59, 11)
des.object("gold piece", 63, 11)
des.object({ id = "potion of acid", x=12, y=14 })
des.object({ id = "potion of healing", x=14, y=14 })

des.non_diggable(selection.area(00,00,75,19))

-- Chaloner's people have got in among the crates.
-- This is the Warden's own hall, and it is guarded.  What gets in is
-- vermin off the river, and the occasional thief after the bullion.
des.monster({ id = "sewer rat", peaceful=0 })
des.monster({ id = "sewer rat", peaceful=0 })
des.monster({ id = "sewer rat", peaceful=0 })
des.monster({ id = "giant rat", peaceful=0 })
des.monster({ id = "giant rat", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.trap()
des.trap()
des.trap()
