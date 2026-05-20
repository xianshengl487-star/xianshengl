package com.blockforge.homelander_maomao.registry;

import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.item.alchemy.Potion;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;
import com.blockforge.homelander_maomao.HomelanderMaomaoMod;

public class ModPotions {
    public static final DeferredRegister<Potion> POTIONS = DeferredRegister.create(ForgeRegistries.POTIONS, HomelanderMaomaoMod.MODID);
    public static final RegistryObject<Potion> BOSS_FORM_POTION = POTIONS.register("boss_form_potion", () -> new Potion("boss_form_potion", new MobEffectInstance(effect("homelander_maomao:boss_form"), 900, 0, false, true, true)));
    public static final RegistryObject<Potion> COMPOUND_V_POTION = POTIONS.register("compound_v_potion", () -> new Potion("compound_v_potion", new MobEffectInstance(effect("homelander_maomao:homelander_power"), 2400, 0, false, true, true)));
    public static final RegistryObject<Potion> UNSTABLE_V_POTION = POTIONS.register("unstable_v_potion", () -> new Potion("unstable_v_potion", new MobEffectInstance(effect("homelander_maomao:super_speed"), 1200, 2, false, true, true), new MobEffectInstance(effect("homelander_maomao:super_strength"), 1200, 1, false, true, true)));

    private static MobEffect effect(String id) {
        return ForgeRegistries.MOB_EFFECTS.getValue(new ResourceLocation(id));
    }

    public static void register(IEventBus bus) { POTIONS.register(bus); }
}
