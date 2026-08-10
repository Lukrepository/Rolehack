-- NetHack Apothecary Apo-loca.lua
--      Rolehack: the Apothecary quest -- the Royal Mint.
--      See role-spec-apothecary-2026-07-30.md.
-- NetHack may be freely redistributed.  See license for details.
--
--      The Newgate Warrens: cellars beneath the gaol.

des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noteleport", "hardfloor")

des.map([[
                                                                            
                                                                            
   ------------   ------------                  -------------               
   |..........|   |..........|   ------------   |...........|               
   |..........+###+..........+###|..........|   |...........|   ---------   
   |..........|   |..........|###+..........+###+...........+###|.......|   
   |..........|   -------+----   |..........|   |...........|###+.......|   
   ------+-----          #       |..........|   --------+----   |.......|   
         #               #       -------+----           #       |.......|   
         # ##########    #              #               #       -----+---   
         #           ----+-------       #               #            #      
     ----+--------   |..........|       #           ----+-------     #      
     |...........|   |..........|   ----+--------   |..........|  ---+----  
     |...........+###+..........+###|...........|   |..........|  |......|  
     |...........|   |..........|###+...........+###+..........+##+......|  
     |...........|   ------------   |...........|   |..........|  |......|  
     -------------                  |...........|   ------------  |......|  
                                    -------------                 --------  
                                                                            
                                                                            
]]);

-- Cellars: unlit except where the presses burn.
des.region(selection.area(00,00,75,19), "unlit")
des.region({ region={34,4, 43,7}, lit=1, type="ordinary" })

des.stair("up", 8,4)
des.stair("down", 69,15)

des.non_diggable(selection.area(00,00,75,19))

-- Unentered stock: the counterfeiter's supply line
des.object("gold piece", 25, 12)
des.object("gold piece", 40, 5)
des.object("gold piece", 57, 13)
des.object({ id = "potion of acid" })
des.object({ id = "potion of sickness" })
des.object()
des.object()
des.object()

-- Gaol vermin and Chaloner's runners
des.monster({ class = "r", peaceful=0 })
des.monster({ class = "r", peaceful=0 })
des.monster({ class = "r", peaceful=0 })
des.monster({ class = "r", peaceful=0 })
des.monster({ class = "r", peaceful=0 })
des.monster({ class = "@", peaceful=0 })
des.monster({ class = "@", peaceful=0 })
des.monster({ class = "l", peaceful=0 })
des.monster({ class = "l", peaceful=0 })
des.monster({ class = "F", peaceful=0 })
des.monster({ class = "F", peaceful=0 })
des.trap()
des.trap()
des.trap()
des.trap()
