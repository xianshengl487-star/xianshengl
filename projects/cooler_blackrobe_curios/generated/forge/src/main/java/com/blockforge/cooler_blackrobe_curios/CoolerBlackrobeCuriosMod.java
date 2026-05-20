package com.blockforge.cooler_blackrobe_curios;

import com.blockforge.cooler_blackrobe_curios.registry.ModCreativeTabs;
import com.blockforge.cooler_blackrobe_curios.registry.ModItems;
import com.mojang.logging.LogUtils;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import org.slf4j.Logger;

@Mod(CoolerBlackrobeCuriosMod.MODID)
public class CoolerBlackrobeCuriosMod {
    public static final String MODID = "cooler_blackrobe_curios";
    public static final Logger LOGGER = LogUtils.getLogger();

    public CoolerBlackrobeCuriosMod() {
        IEventBus bus = FMLJavaModLoadingContext.get().getModEventBus();
        ModItems.register(bus);
        ModCreativeTabs.register(bus);
    }
}
