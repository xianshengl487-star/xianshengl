package com.blockforge.cooler_blackrobe_curios.registry;

import com.blockforge.cooler_blackrobe_curios.CoolerBlackrobeCuriosMod;
import net.minecraft.world.item.Item;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLCommonSetupEvent;
import top.theillusivec4.curios.api.CuriosApi;
import top.theillusivec4.curios.api.type.capability.ICurioItem;

@Mod.EventBusSubscriber(modid = CoolerBlackrobeCuriosMod.MODID, bus = Mod.EventBusSubscriber.Bus.MOD)
public final class ModCuriosCompat {
    private ModCuriosCompat() {
    }

    @SubscribeEvent
    public static void onCommonSetup(FMLCommonSetupEvent event) {
        event.enqueueWork(ModCuriosCompat::registerCurios);
    }

    private static void registerCurios() {
        for (var registryObject : ModItems.allAccessories()) {
            Item item = registryObject.get();
            if (item instanceof ICurioItem curioItem) {
                CuriosApi.registerCurio(item, curioItem);
            }
        }
    }
}
