package com.blockforge.homelander_maomao.registry;

import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.RegistryObject;
import com.blockforge.homelander_maomao.HomelanderMaomaoMod;

public class ModCreativeTabs {
    public static final DeferredRegister<CreativeModeTab> TABS = DeferredRegister.create(Registries.CREATIVE_MODE_TAB, HomelanderMaomaoMod.MODID);
    public static final RegistryObject<CreativeModeTab> MAIN_TAB = TABS.register("homelander_maomao_tab", () -> CreativeModeTab.builder()
        .title(Component.translatable("itemGroup.homelander_maomao"))
        .icon(() -> new ItemStack(Items.CRAFTING_TABLE))
        .displayItems((params, output) -> {
            output.accept(ModItems.COMPOUND_V_SERUM.get());
            output.accept(ModItems.HOMELANDER_BOOTS.get());
            output.accept(ModItems.HOMELANDER_CHESTPLATE.get());
            output.accept(ModItems.HOMELANDER_HELMET.get());
            output.accept(ModItems.HOMELANDER_LEGGINGS.get());
            output.accept(ModItems.STARLIGHT_BOOTS.get());
            output.accept(ModItems.STARLIGHT_CHESTPLATE.get());
            output.accept(ModItems.STARLIGHT_HELMET.get());
            output.accept(ModItems.STARLIGHT_LEGGINGS.get());
            output.accept(ModItems.A_TRAIN_BOOTS.get());
            output.accept(ModItems.A_TRAIN_CHESTPLATE.get());
            output.accept(ModItems.A_TRAIN_HELMET.get());
            output.accept(ModItems.A_TRAIN_LEGGINGS.get());
            output.accept(ModItems.NOIR_BOOTS.get());
            output.accept(ModItems.NOIR_CHESTPLATE.get());
            output.accept(ModItems.NOIR_HELMET.get());
            output.accept(ModItems.NOIR_LEGGINGS.get());
            output.accept(ModItems.DEEP_BOOTS.get());
            output.accept(ModItems.DEEP_CHESTPLATE.get());
            output.accept(ModItems.DEEP_HELMET.get());
            output.accept(ModItems.DEEP_LEGGINGS.get());
            output.accept(ModItems.TRANSLUCENT_BOOTS.get());
            output.accept(ModItems.TRANSLUCENT_CHESTPLATE.get());
            output.accept(ModItems.TRANSLUCENT_HELMET.get());
            output.accept(ModItems.TRANSLUCENT_LEGGINGS.get());
            output.accept(ModItems.MAEVE_BOOTS.get());
            output.accept(ModItems.MAEVE_CHESTPLATE.get());
            output.accept(ModItems.MAEVE_HELMET.get());
            output.accept(ModItems.MAEVE_LEGGINGS.get());
            output.accept(ModItems.STARLIGHT_CHARGE.get());
            output.accept(ModItems.UNSTABLE_V_SERUM.get());
            output.accept(ModItems.VOUGHT_MILK.get());
            output.accept(ModItems.VOUGHT_POWER_CORE.get());
            output.accept(ModItems.VOUGHT_PISTOL.get());
            output.accept(ModItems.VOUGHT_RIFLE.get());
            output.accept(ModItems.VOUGHT_SHOTGUN.get());
            output.accept(ModItems.HEAT_VISION_FOCUS.get());
            output.accept(ModItems.TEMP_V24_SERUM.get());
            output.accept(ModItems.INVISIBLE_SKIN_SAMPLE.get());
            output.accept(ModItems.NOIR_CLIMBING_GLOVES.get());
            output.accept(ModItems.SOLDIER_BOY_CHARGE_CELL.get());
            output.accept(ModItems.STARLIGHT_AMPLIFIER.get());
            output.accept(ModItems.A_TRAIN_BOOSTER.get());
            output.accept(ModItems.ANOMALY_V_SERUM.get());
            output.accept(ModItems.V_POWER_SHARD.get());
            output.accept(ModItems.COUNTER_V_BATON.get());
            output.accept(ModItems.SUPPRESSOR_RIFLE.get());
            output.accept(ModItems.NULL_FIELD_GRENADE.get());
            output.accept(ModItems.POWER_SCANNER.get());
            output.accept(ModItems.VOUGHT_HUNTER_BEACON.get());
            output.accept(ModItems.V_STABILIZER_PATCH.get());
            output.accept(ModItems.TRIAL_CARD_HEAT.get());
            output.accept(ModItems.TRIAL_CARD_FLIGHT.get());
            output.accept(ModItems.TRIAL_CARD_SPEED.get());
            output.accept(ModItems.TRIAL_CARD_STARLIGHT.get());
            output.accept(ModItems.TRIAL_CARD_NOIR.get());
            output.accept(ModItems.TRIAL_CARD_RANDOM.get());
            output.accept(ModItems.V_TRAINING_MANUAL.get());
            output.accept(ModItems.V_AMPLIFIER_CORE.get());
            output.accept(ModItems.REGENERATION_BOOSTER.get());
            output.accept(ModItems.KINETIC_FOCUS_RING.get());
            output.accept(ModItems.CHRONO_TUNING_CHIP.get());
            output.accept(ModItems.VOUGHT_HUNTER_SPAWN_EGG.get());
            output.accept(ModItems.V_OVERDOSE_MUTANT_SPAWN_EGG.get());
            output.accept(ModItems.CREATIVE_POWER_PANEL.get());

        }).build());
    public static void register(IEventBus bus) { TABS.register(bus); }
}
