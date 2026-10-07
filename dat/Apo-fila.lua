-- NetHack Apothecary Apo-fila.lua
-- Written for Rolehack by Lucas Ruiz, 2026-07-31 to 2026-08-21.  See ROLEHACK-CHANGES.md.
--      Rolehack: the Apothecary quest -- Cheapside, on the way to the warrens.
--      Regenerated 2026-08-21: every building wall is flush with the street
--      it faces, so no door opens into rock.  Layout is flood-fill verified.
-- NetHack may be freely redistributed.  See license for details.

des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noteleport", "hardfloor")

des.map([[
                                                                            
                                                                            
   ......................................................................   
   .------+------.------+------.-------------.------+------.-----+------.   
   .|...........|.|...........|.|...........|.|...........|.|..........|.   
   .|...........+.+...........|.|...........|.+...........|.|..........+.   
   .|...........|.|...........|.|...........|.|...........|.|..........|.   
   .|...........|.|...........|.|...........|.|...........|.|..........|.   
   .-------------.-------------.------+------.-------------.------------.   
   ..............{...........................{...........................   
   .-------------.-------------.-------------.------+------.------------.   
   .|...........|.|...........|.|...........|.|...........|.|..........|.   
   .+...........|.|...........+.+...........|.|...........|.+..........|.   
   .|...........|.|...........|.|...........|.|...........|.|..........|.   
   .|...........|.|...........|.|...........|.|...........|.|..........|.   
   .------+------.------+------.------+------.-------------.-----+------.   
   ......................................................................   
                                                                            
                                                                            
                                                                            
]]);

-- Streets are lit; the buildings are not, unless they are open for trade.
des.region(selection.area(00,00,75,19), "unlit")
des.region({ region={03,02, 72,02}, lit=1, type="ordinary" })
des.region({ region={03,09, 72,09}, lit=1, type="ordinary" })
des.region({ region={03,16, 72,16}, lit=1, type="ordinary" })

-- An apothecary's shop and a general store.  Precedent for shops on a quest
-- level: Tou-loca.lua.  Each has exactly one door, as NetHack requires.
des.region({ region={33,04, 43,07}, lit=1, type="potion shop", filled=1 })
des.region({ region={47,11, 57,14}, lit=1, type="shop", filled=1 })

des.stair("up", 3,2)
des.stair("down", 72,16)

des.door("closed",10,03)
des.door("closed",16,05)
des.door("closed",24,03)
des.door("closed",18,05)
des.door("closed",38,08)
des.door("closed",52,03)
des.door("closed",46,05)
des.door("closed",65,03)
des.door("closed",71,05)
des.door("closed",10,15)
des.door("closed",04,12)
des.door("closed",24,15)
des.door("closed",30,12)
des.door("closed",38,15)
des.door("closed",32,12)
des.door("closed",52,10)
des.door("closed",65,15)
des.door("closed",60,12)

-- Only the city wall is proof against a pick-axe; you can break into a house
-- if you must.  The old version sealed the entire level, which left no way
-- out at all when the layout turned out to be wrong.
des.non_diggable(selection.area(00,00,75,00))
des.non_diggable(selection.area(00,19,75,19))
des.non_diggable(selection.area(00,00,00,19))
des.non_diggable(selection.area(75,00,75,19))

-- Constables on Chaloner's payroll, walking their beat.
des.monster({ id = "bribed constable", x=10, y=02, peaceful=0 })
des.monster({ id = "bribed constable", x=38, y=09, peaceful=0 })
des.monster({ id = "bribed constable", x=60, y=16, peaceful=0 })
des.monster({ id = "bribed constable", peaceful=0 })
des.monster({ id = "bribed constable", peaceful=0 })
des.monster({ id = "bribed constable", peaceful=0 })

-- Cheapside traffic: hired muscle, cutpurses, and whatever lives in the
-- gutter.  One werejackal, deliberately: a city where people are not quite
-- what they appear is the whole point, and it should be a choice rather than
-- an accident of rolling "any human" on a low-difficulty table.
des.monster({ id = "soldier", peaceful=0 })
des.monster({ id = "soldier", peaceful=0 })
des.monster({ id = "werejackal", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "sewer rat", peaceful=0 })
des.monster({ id = "sewer rat", peaceful=0 })
des.monster({ id = "jackal", peaceful=0 })

des.object("gold piece")
des.object("gold piece")
des.object()
des.object()
des.trap()
des.trap()
