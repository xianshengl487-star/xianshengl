# BlockForge structure: hero_rooftop
# Stand where the front center of the structure should appear, then run this function.
fill ~-9 ~0 ~1 ~9 ~0 ~17 minecraft:smooth_stone
fill ~-9 ~1 ~1 ~9 ~1 ~17 minecraft:black_concrete
fill ~-8 ~1 ~2 ~8 ~1 ~16 minecraft:light_gray_concrete
fill ~-1 ~1 ~6 ~1 ~1 ~12 minecraft:yellow_concrete
fill ~-4 ~1 ~9 ~4 ~1 ~9 minecraft:yellow_concrete
fill ~-8 ~2 ~1 ~-8 ~4 ~17 minecraft:iron_bars
fill ~8 ~2 ~1 ~8 ~4 ~17 minecraft:iron_bars
fill ~-8 ~2 ~1 ~8 ~4 ~1 minecraft:iron_bars
fill ~-8 ~2 ~17 ~8 ~4 ~17 minecraft:iron_bars
fill ~-2 ~1 ~-1 ~2 ~4 ~0 minecraft:smooth_quartz
fill ~-1 ~1 ~-1 ~1 ~3 ~-1 minecraft:air
setblock ~0 ~1 ~0 minecraft:iron_door[facing=south,half=lower]
setblock ~0 ~2 ~0 minecraft:iron_door[facing=south,half=upper]
setblock ~-6 ~1 ~4 minecraft:sea_lantern
setblock ~6 ~1 ~4 minecraft:sea_lantern
setblock ~-6 ~1 ~14 minecraft:sea_lantern
setblock ~6 ~1 ~14 minecraft:sea_lantern
setblock ~0 ~2 ~9 minecraft:sea_lantern
say Generated structure homelander_maomao:hero_rooftop
