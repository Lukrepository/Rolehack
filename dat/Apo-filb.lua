-- NetHack Apothecary Apo-filb.lua
--      Rolehack: the Apothecary quest -- the Rookery, behind the gaol.
-- NetHack may be freely redistributed.  See license for details.

des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noteleport", "hardfloor")

des.map([[
                                                                            
                                                                            
                -----------               -----------                       
    ----------  |.........|  -----------  |.........|   -----------         
    |........|  |.........|  |.........|  |.........|   |.........| ------  
    |........|  |.........|  |.........|  |.........|   |.........| |....|  
    |........|  |.........|  |.........|  |.........|   |.........| +....|  
    |........|  -----+-----  |.........|  -----+-----   |.........| |....|  
    -----+----               -----+-----                -----+----- |....|  
                                                       ............ ------  
                                 ............          .          .         
            ...........          .          ............                    
   ..........         ............                                          
                                  -----+------   -----+------  ----+-----   
     -----+-----   -----+------   |..........|   |..........|  |........|   
     |.........|   |..........|   |..........|   |..........|  |........|   
     |.........|   |..........|   |..........|   |..........|  |........|   
     |.........|   |..........|   ------------   ------------  |........|   
     -----------   ------------                                ----------   
                                                                            
]]);

des.region(selection.area(00,00,75,19), "unlit")

des.stair("up", 5,12)
des.stair("down", 70,10)

des.non_diggable(selection.area(00,00,75,19))

-- No shops here, and no law worth the name.
des.monster({ id = "bribed constable", peaceful=0 })
des.monster({ id = "bribed constable", peaceful=0 })
des.monster({ id = "bribed constable", peaceful=0 })
des.monster({ class = "@", peaceful=0 })
des.monster({ class = "@", peaceful=0 })
des.monster({ class = "@", peaceful=0 })
des.monster({ class = "l", peaceful=0 })
des.monster({ class = "l", peaceful=0 })
des.monster({ class = "r", peaceful=0 })
des.monster({ class = "r", peaceful=0 })
des.monster({ class = "r", peaceful=0 })
des.monster({ class = "F", peaceful=0 })

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
