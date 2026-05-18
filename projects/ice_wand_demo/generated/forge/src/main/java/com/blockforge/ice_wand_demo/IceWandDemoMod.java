package com.blockforge.ice_wand_demo;

import com.mojang.logging.LogUtils;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import org.slf4j.Logger;
import com.blockforge.ice_wand_demo.registry.ModItems;
import com.blockforge.ice_wand_demo.registry.ModBlocks;
import com.blockforge.ice_wand_demo.registry.ModCreativeTabs;

@Mod(IceWandDemoMod.MODID)
public class IceWandDemoMod {
    public static final String MODID = "ice_wand_demo";
    public static final Logger LOGGER = LogUtils.getLogger();

    public IceWandDemoMod() {
        IEventBus bus = FMLJavaModLoadingContext.get().getModEventBus();
        ModBlocks.register(bus);
        ModItems.register(bus);
        ModCreativeTabs.register(bus);
    }
}
