-- NetHack Apothecary Apo-filb.lua
--      Rolehack: the Apothecary quest -- the Royal Mint.
--      See role-spec-apothecary-2026-07-30.md.
-- NetHack may be freely redistributed.  See license for details.
--
--      Warrens, deeper still.

des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noteleport", "hardfloor")

des.map([[
                                                                            
                                                                            
                    -----------                       -----------           
   -------------    |.........|                       |.........|           
   |...........|    |.........|     -------------     |.........|           
   |...........+####+.........+#####+...........+#####+.........|   ------  
   |...........+####+.........+#####+...........+#####+.........+###+....|  
   |...........|    --------+--     |...........|     |.........+###+....|  
   |...........|            #       |...........|     --------+--   |....|  
   ------+------            #       |...........|             #     |....|  
         #                  #       ---------+---             #     |....|  
         #              ----+--------        #                #     ------  
         #              |...........|        #            ----+--------     
     ----+---------     |...........|     ---+---------   |...........|     
     |............+#####+...........|     |...........|   |...........|     
     |............+#####+...........+#####+...........+###+...........|     
     |............|     -------------     |...........|   |...........|     
     --------------                       -------------   -------------     
                                                                            
                                                                            
]]);

des.region(selection.area(00,00,75,19), "unlit")

des.stair("up", 8,5)
des.stair("down", 66,15)

des.non_diggable(selection.area(00,00,75,19))

des.object()
des.object()
des.object()
des.object("gold piece")
des.object("gold piece")

des.monster({ class = "r", peaceful=0 })
des.monster({ class = "r", peaceful=0 })
des.monster({ class = "r", peaceful=0 })
des.monster({ class = "@", peaceful=0 })
des.monster({ class = "@", peaceful=0 })
des.monster({ class = "l", peaceful=0 })
des.monster({ class = "F", peaceful=0 })
des.trap()
des.trap()
des.trap()
