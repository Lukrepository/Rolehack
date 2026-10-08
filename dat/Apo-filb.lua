-- NetHack Apothecary Apo-filb.lua
-- Written for Rolehack by Lucas Ruiz, 2026-07-31 to 2026-08-21.  See ROLEHACK-CHANGES.md.
--      Rolehack: the Apothecary quest -- the Rookery, behind the gaol.
--      Regenerated 2026-08-21: every building wall is flush with the street
--      it faces, so no door opens into rock.  Layout is flood-fill verified.
-- NetHack may be freely redistributed.  See license for details.

des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noteleport", "hardfloor")

des.map([[
                                                                            
                                                                            
                                                                            
   ------------ ------------ ------------ ------------ ------------ ------  
   |..........| |..........| |..........| |..........| |..........| |....|  
   |..........| |..........| |..........| |..........| |..........| |....|  
   |..........| |..........| |..........| |..........| |..........| |....|  
   |..........| |..........| |..........| |..........| |..........| |....|  
   -----+------ -----+------ -----+------ -----+------ -----+------ --+---  
  ........................................................................  
  .--------+--------.-----------+------------.-------------+-------------.  
  .|...............|.|......................|.|.........................|.  
  .|...............|.|......................|.|.........................|.  
  .-----------------.------------------------.---------------------------.  
  ........................................................................  
   ------+------- ------+------- ------+------- ------+------- -----+-----  
   |............| |............| |............| |............| |.........|  
   |............| |............| |............| |............| |.........|  
   -------------- -------------- -------------- -------------- -----------  
                                                                            
]]);

des.region(selection.area(00,00,75,19), "unlit")

des.stair("up", 2,14)
des.stair("down", 73,9)

des.door("closed",08,08)
des.door("closed",21,08)
des.door("closed",34,08)
des.door("closed",47,08)
des.door("closed",60,08)
des.door("closed",70,08)
des.door("closed",11,10)
des.door("closed",32,10)
des.door("closed",59,10)
des.door("closed",09,15)
des.door("closed",24,15)
des.door("closed",39,15)
des.door("closed",54,15)
des.door("closed",68,15)

des.non_diggable(selection.area(00,00,75,00))
des.non_diggable(selection.area(00,19,75,19))
des.non_diggable(selection.area(00,00,00,19))
des.non_diggable(selection.area(75,00,75,19))

-- No shops here, and no law worth the name.
des.monster({ id = "bribed constable", peaceful=0 })
des.monster({ id = "bribed constable", peaceful=0 })
des.monster({ id = "bribed constable", peaceful=0 })
-- The Rookery keeps worse company than Cheapside: more of Chaloner's men,
-- and more of the neighbours who only look like neighbours by daylight.
des.monster({ id = "soldier", peaceful=0 })
des.monster({ id = "soldier", peaceful=0 })
des.monster({ id = "soldier", peaceful=0 })
des.monster({ id = "werejackal", peaceful=0 })
des.monster({ id = "werejackal", peaceful=0 })
des.monster({ id = "wererat", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "giant rat", peaceful=0 })
des.monster({ id = "giant rat", peaceful=0 })
des.monster({ id = "rabid rat", peaceful=0 })
des.monster({ id = "sewer rat", peaceful=0 })
des.monster({ id = "brown mold", peaceful=0 })

des.object("gold piece")
des.object("gold piece")
des.object({ id = "potion of sickness" })
des.object()
des.object()
des.object()
des.trap()
des.trap()
des.trap()
des.trap()
