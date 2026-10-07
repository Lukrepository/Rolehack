-- NetHack Apothecary Apo-goal.lua
-- Written for Rolehack by Lucas Ruiz, 2026-07-31 to 2026-09-23.  See ROLEHACK-CHANGES.md.
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
des.door("closed",50,10)
des.door("closed",38,08)

des.non_diggable(selection.area(00,00,75,19))

-- The strongroom: the horn, and the man who took it
-- ROLEHACK: he does not keep it on the bench.  He keeps it on him, and
-- it is charged: killing him once only spends it.  The potions of acid are
-- half of what you need to wake it up again afterwards.
des.monster({ id = "William Chaloner", x=38, y=06, peaceful=0,
              inventory = function()
   des.object({ id = "unicorn horn", buc="blessed", spe=0,
                name="The Lapis Philosophorum" });
   des.object({ id = "potion of acid" });
   des.object({ id = "potion of acid" });
end })

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
-- Chaloner's works.  Gold golems are the signature: a man who struck
-- thirty thousand guineas would naturally set some of them walking.  The
-- leprechauns collect for him, and the soldiers keep the door.
des.monster({ id = "gold golem", peaceful=0 })
des.monster({ id = "gold golem", peaceful=0 })
des.monster({ id = "paper golem", peaceful=0 })
des.monster({ id = "rope golem", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "soldier", peaceful=0 })
des.monster({ id = "soldier", peaceful=0 })
des.monster({ id = "soldier", peaceful=0 })
des.monster({ id = "sewer rat", peaceful=0 })
des.monster({ id = "sewer rat", peaceful=0 })
des.trap()
des.trap()
des.trap()
des.trap()
des.trap()
