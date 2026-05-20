# BlockForge structure: blacksite_bunker
# Stand where the front center of the structure should appear, then run this function.
fill ~-6 ~0 ~1 ~6 ~0 ~11 minecraft:polished_deepslate
fill ~-6 ~1 ~1 ~6 ~5 ~11 minecraft:deepslate_bricks hollow
fill ~-5 ~1 ~2 ~5 ~4 ~10 minecraft:air
fill ~-7 ~6 ~0 ~7 ~6 ~12 minecraft:deepslate_tiles
fill ~-5 ~1 ~1 ~5 ~1 ~11 minecraft:dark_oak_planks
fill ~-5 ~4 ~1 ~5 ~4 ~11 minecraft:polished_deepslate
fill ~-5 ~2 ~2 ~-5 ~3 ~10 minecraft:iron_bars
fill ~5 ~2 ~2 ~5 ~3 ~10 minecraft:iron_bars
fill ~-2 ~2 ~6 ~2 ~3 ~6 minecraft:iron_bars
fill ~-1 ~1 ~1 ~1 ~2 ~1 minecraft:air
setblock ~0 ~1 ~1 minecraft:iron_door[facing=south,half=lower]
setblock ~0 ~2 ~1 minecraft:iron_door[facing=south,half=upper]
setblock ~-3 ~1 ~4 minecraft:barrel
setblock ~3 ~1 ~4 minecraft:barrel
setblock ~-3 ~1 ~8 minecraft:anvil
setblock ~3 ~1 ~8 minecraft:smithing_table
setblock ~0 ~1 ~8 minecraft:chest[facing=south]
setblock ~-5 ~3 ~3 minecraft:redstone_lamp[lit=true]
setblock ~5 ~3 ~3 minecraft:redstone_lamp[lit=true]
setblock ~-5 ~3 ~9 minecraft:redstone_lamp[lit=true]
setblock ~5 ~3 ~9 minecraft:redstone_lamp[lit=true]
setblock ~0 ~5 ~6 minecraft:soul_lantern
say Generated structure homelander_maomao:blacksite_bunker
