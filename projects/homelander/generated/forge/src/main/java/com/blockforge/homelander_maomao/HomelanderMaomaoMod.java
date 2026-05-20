package com.blockforge.homelander_maomao;

import com.mojang.logging.LogUtils;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import org.slf4j.Logger;
import com.blockforge.homelander_maomao.registry.ModItems;
import com.blockforge.homelander_maomao.registry.ModBlocks;
import com.blockforge.homelander_maomao.registry.ModCreativeTabs;
import com.blockforge.homelander_maomao.registry.ModEntities;
import com.blockforge.homelander_maomao.registry.ModMobEffects;
import com.blockforge.homelander_maomao.registry.ModPotions;
import com.blockforge.homelander_maomao.registry.ModEnchantments;
import com.blockforge.homelander_maomao.network.ModNetwork;

@Mod(HomelanderMaomaoMod.MODID)
public class HomelanderMaomaoMod {
    public static final String MODID = "homelander_maomao";
    public static final Logger LOGGER = LogUtils.getLogger();

    public HomelanderMaomaoMod() {
        IEventBus bus = FMLJavaModLoadingContext.get().getModEventBus();
        ModBlocks.register(bus);
        ModEntities.register(bus);
        ModItems.register(bus);
        ModMobEffects.register(bus);
        ModPotions.register(bus);
        ModEnchantments.register(bus);
        ModCreativeTabs.register(bus);
        ModNetwork.register();
    }
}
