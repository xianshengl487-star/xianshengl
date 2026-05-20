package com.blockforge.homelander_maomao.registry;

import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectCategory;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;
import com.blockforge.homelander_maomao.HomelanderMaomaoMod;

public class ModMobEffects {
    public static final DeferredRegister<MobEffect> MOB_EFFECTS = DeferredRegister.create(ForgeRegistries.MOB_EFFECTS, HomelanderMaomaoMod.MODID);
    public static final RegistryObject<MobEffect> A_TRAIN_POWER = MOB_EFFECTS.register("a_train_power", () -> new MobEffect(MobEffectCategory.BENEFICIAL, 0x60A5FA) {});
    public static final RegistryObject<MobEffect> BOSS_FORM = MOB_EFFECTS.register("boss_form", () -> new MobEffect(MobEffectCategory.BENEFICIAL, 0xB91C1C) {});
    public static final RegistryObject<MobEffect> FLIGHT_GENE = MOB_EFFECTS.register("flight_gene", () -> new MobEffect(MobEffectCategory.BENEFICIAL, 0x4AA3FF) {});
    public static final RegistryObject<MobEffect> HEAT_VISION = MOB_EFFECTS.register("heat_vision", () -> new MobEffect(MobEffectCategory.BENEFICIAL, 0xFF2A1F) {});
    public static final RegistryObject<MobEffect> HOMELANDER_POWER = MOB_EFFECTS.register("homelander_power", () -> new MobEffect(MobEffectCategory.BENEFICIAL, 0xF2C94C) {});
    public static final RegistryObject<MobEffect> INVULNERABILITY = MOB_EFFECTS.register("invulnerability", () -> new MobEffect(MobEffectCategory.BENEFICIAL, 0x93C5FD) {});
    public static final RegistryObject<MobEffect> MAEVE_POWER = MOB_EFFECTS.register("maeve_power", () -> new MobEffect(MobEffectCategory.BENEFICIAL, 0xD97706) {});
    public static final RegistryObject<MobEffect> NOIR_POWER = MOB_EFFECTS.register("noir_power", () -> new MobEffect(MobEffectCategory.BENEFICIAL, 0x111827) {});
    public static final RegistryObject<MobEffect> STARLIGHT_POWER = MOB_EFFECTS.register("starlight_power", () -> new MobEffect(MobEffectCategory.BENEFICIAL, 0xFFF7AE) {});
    public static final RegistryObject<MobEffect> SUPER_SPEED = MOB_EFFECTS.register("super_speed", () -> new MobEffect(MobEffectCategory.BENEFICIAL, 0xFACC15) {});
    public static final RegistryObject<MobEffect> SUPER_STRENGTH = MOB_EFFECTS.register("super_strength", () -> new MobEffect(MobEffectCategory.BENEFICIAL, 0xF59E0B) {});

    public static void register(IEventBus bus) { MOB_EFFECTS.register(bus); }
}
