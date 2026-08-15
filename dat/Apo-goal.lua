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
             name="The Lapis Philosophorum" })
des.monster({ id = "William Chaloner", x=38, y=06, peaceful=0 })

-- Chaloner's hoard.  He coined some 30,000 guineas in his career and
-- spent little of it; this is a counterfeiter's lair, not a mint, so
-- taking it is recovery rather than theft.  Sized so that a hero who
-- clears the workshop can buy protection two or three times over at
-- the experience level the quest expects (400 x XL per point).
des.gold({ x=35, y=4,  amount = 1800 + math.random(0, 600) })
des.gold({ x=41, y=4,  amount = 1800 + math.random(0, 600) })
des.gold({ x=36, y=7,  amount = 1500 + math.random(0, 500) })
des.gold({ x=40, y=7,  amount = 1500 + math.random(0, 500) })
des.gold({ x=55, y=5,  amount = 1200 + math.random(0, 400) })
des.gold({ x=61, y=13, amount = 1200 + math.random(0, 400) })
des.gold({ x=67, y=9,  amount = 1200 + math.random(0, 400) })
des.gold({ x=6,  y=8,  amount = 900 + math.random(0, 400) })
des.gold({ x=18, y=14, amount = 900 + math.random(0, 400) })
des.gold({ x=12, y=11, amount = 700 + math.random(0, 300) })
-- and the blanks he had not yet struck
des.object("gold piece", 44, 12)
des.object("gold piece", 30, 15)
des.object("gold piece", 64, 16)

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
