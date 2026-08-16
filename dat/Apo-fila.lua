-- NetHack Apothecary Apo-fila.lua
--      Rolehack: the Apothecary quest -- Cheapside, on the way to the warrens.
-- NetHack may be freely redistributed.  See license for details.

des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noteleport", "hardfloor")

des.map([[
                                                                            
                                                                            
  ........................................................................  
      . ----------------- . ---------+--------- . ------------------- .     
      . |...............| . |.................| . |.................| .     
      . |...............| . |.................| . |.................| .     
      . +...............| . |.................| . |.................| .     
      . |...............| . |.................| . |.................| .     
      . --------+-------- . ------------------- . ---------+--------- .     
  ........................{.....................{.........................  
      . --------+-------- . ------------------- . ---------+--------- .     
      . |...............| . |.................| . |.................| .     
      . |...............| . |.................| . |.................| .     
      . |...............+ . |.................| . |.................| .     
      . |...............| . |.................| . |.................| .     
      . |...............| . |.................| . |.................| .     
      . ----------------- . ---------+--------- . ------------------- .     
  ........................................................................  
                                                                            
                                                                            
]]);

-- Streets are lit; the buildings are not, unless they are open for trade.
des.region(selection.area(00,00,75,19), "unlit")
des.region({ region={02,02, 73,02}, lit=1, type="ordinary" })
des.region({ region={02,09, 73,09}, lit=1, type="ordinary" })
des.region({ region={02,17, 73,17}, lit=1, type="ordinary" })

-- An apothecary's shop, and a general store.  Precedent for shops in a
-- quest level: Tou-loca.lua.
des.region({ region={29,04, 45,07}, lit=1, type="potion shop", filled=1 })
des.region({ region={51,11, 67,15}, lit=1, type="general store", filled=1 })

des.stair("up", 6,2)
des.stair("down", 70,17)

des.door("closed",16,08)
des.door("closed",37,03)
des.door("closed",59,08)
des.door("closed",16,10)
des.door("locked",37,16)
des.door("closed",59,10)
des.door("closed",08,06)


des.door("closed",24,13)

des.non_diggable(selection.area(00,00,75,19))

-- Constables on Chaloner's payroll, walking their beat.
des.monster({ id = "bribed constable", x=13, y=02, peaceful=0 })
des.monster({ id = "bribed constable", x=38, y=09, peaceful=0 })
des.monster({ id = "bribed constable", x=60, y=17, peaceful=0 })
des.monster({ id = "bribed constable", x=26, y=13, peaceful=0 })
des.monster({ id = "bribed constable", peaceful=0 })
des.monster({ id = "bribed constable", peaceful=0 })

-- and the usual traffic of a city that has stopped trusting its coin
des.monster({ class = "@", peaceful=0 })
des.monster({ class = "@", peaceful=0 })
des.monster({ class = "l", peaceful=0 })
des.monster({ class = "l", peaceful=0 })
des.monster({ class = "r", peaceful=0 })
des.monster({ class = "r", peaceful=0 })
des.monster({ class = "d", peaceful=0 })

des.object("gold piece")
des.object("gold piece")
des.object()
des.object()
des.trap()
des.trap()
