package com.blockforge.homelander_maomao.registry;

import com.blockforge.homelander_maomao.HomelanderMaomaoMod;
import com.blockforge.homelander_maomao.entity.VOverdoseMutantEntity;
import com.blockforge.homelander_maomao.entity.VoughtHunterEntity;
import net.minecraftforge.event.entity.EntityAttributeCreationEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = HomelanderMaomaoMod.MODID, bus = Mod.EventBusSubscriber.Bus.MOD)
public final class ModEntityEvents {
    private ModEntityEvents() {}

    @SubscribeEvent
    public static void registerAttributes(EntityAttributeCreationEvent event) {
        event.put(ModEntities.VOUGHT_HUNTER.get(), VoughtHunterEntity.createAttributes().build());
        event.put(ModEntities.V_OVERDOSE_MUTANT.get(), VOverdoseMutantEntity.createAttributes().build());
    }
}
