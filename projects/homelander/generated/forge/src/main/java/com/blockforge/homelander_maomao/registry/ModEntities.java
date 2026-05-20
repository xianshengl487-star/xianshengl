package com.blockforge.homelander_maomao.registry;

import com.blockforge.homelander_maomao.HomelanderMaomaoMod;
import com.blockforge.homelander_maomao.entity.VOverdoseMutantEntity;
import com.blockforge.homelander_maomao.entity.VoughtHunterEntity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class ModEntities {
    public static final DeferredRegister<EntityType<?>> ENTITIES = DeferredRegister.create(ForgeRegistries.ENTITY_TYPES, HomelanderMaomaoMod.MODID);

    public static final RegistryObject<EntityType<VoughtHunterEntity>> VOUGHT_HUNTER = ENTITIES.register("vought_hunter", () ->
        EntityType.Builder.of(VoughtHunterEntity::new, MobCategory.MONSTER)
            .sized(0.62f, 1.95f)
            .clientTrackingRange(8)
            .build(HomelanderMaomaoMod.MODID + ":vought_hunter")
    );

    public static final RegistryObject<EntityType<VOverdoseMutantEntity>> V_OVERDOSE_MUTANT = ENTITIES.register("v_overdose_mutant", () ->
        EntityType.Builder.of(VOverdoseMutantEntity::new, MobCategory.MONSTER)
            .sized(0.82f, 2.35f)
            .clientTrackingRange(10)
            .build(HomelanderMaomaoMod.MODID + ":v_overdose_mutant")
    );

    private ModEntities() {}

    public static void register(IEventBus bus) {
        ENTITIES.register(bus);
    }
}
