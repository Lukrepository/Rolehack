-- NetHack Apothecary Apo-goal.lua
--      Rolehack: the Apothecary quest -- the Royal Mint.
--      See role-spec-apothecary-2026-07-30.md.
-- NetHack may be freely redistributed.  See license for details.
--
--      Chaloner's workshop: the coining floor and the strongroom.

des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noteleport", "hardfloor")

des.map([[
                                                                            
  ------------------------------------------------------------------------  
  |.......................|.......................|......................|  
  |..{..{..{..{..{..{.....|......-----------......|...F..F..F..F..F..F...|  
  |.......................|......|.........|......|......................|  
  |.......................|......|.........|......|...F..F..F..F..F..F...|  
  |.......................|......|.........|......|......................|  
  |.......................|......|.........|......|...F..F..F..F..F..F...|  
  |.......................|......-----+-----......|......................|  
  |.......................+...........................F..F..F..F..F..F...|  
  |...............................................+......................|  
  |.......................|.......................|...F..F..F..F..F..F...|  
  |.......................|.......................|......................|  
  |.......................|.......................|...F..F..F..F..F..F...|  
  |.......................|.......................|......................|  
  |.......................|.......................|...F..F..F..F..F..F...|  
  |.......................|.......................|......................|  
  |.......................|.......................|......................|  
  ------------------------------------------------------------------------  
                                                                            
]]);

-- The coining floor burns day and night.
des.region(selection.area(00,00,75,19), "lit")

des.stair("up", 5,16)

des.door("closed",26,09)
des.door("locked",50,10)
des.door("locked",38,08)

des.non_diggable(selection.area(00,00,75,19))

-- The strongroom: the Stone, and the man who took it
des.object({ id = "touchstone", x=38, y=05, buc="blessed", spe=0,
             name="The Philosopher's Stone" })
des.monster({ id = "William Chaloner", x=38, y=06, peaceful=0 })

-- False coin, stacked and waiting
des.object("gold piece", 36, 4)
des.object("gold piece", 40, 4)
des.object("gold piece", 55, 6)
des.object("gold piece", 61, 12)
des.object("gold piece", 67, 8)

-- Chaloner's works: golems struck from his own dies, and the gold-thieves
-- his false coin attracts.
des.monster({ class = "'", peaceful=0 })
des.monster({ class = "'", peaceful=0 })
des.monster({ class = "'", peaceful=0 })
des.monster({ class = "l", peaceful=0 })
des.monster({ class = "l", peaceful=0 })
des.monster({ class = "l", peaceful=0 })
des.monster({ class = "@", peaceful=0 })
des.monster({ class = "@", peaceful=0 })
des.monster({ class = "@", peaceful=0 })
des.monster({ class = "r", peaceful=0 })
des.monster({ class = "r", peaceful=0 })
des.trap()
des.trap()
des.trap()
des.trap()
des.trap()
