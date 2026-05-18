package com.blockforge.echo_crystal_demo.registry;

import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.RegistryObject;
import com.blockforge.echo_crystal_demo.EchoCrystalDemoMod;

public class ModCreativeTabs {
    public static final DeferredRegister<CreativeModeTab> TABS = DeferredRegister.create(Registries.CREATIVE_MODE_TAB, EchoCrystalDemoMod.MODID);
    public static final RegistryObject<CreativeModeTab> MAIN_TAB = TABS.register("echo_crystal_demo_tab", () -> CreativeModeTab.builder()
        .title(Component.translatable("itemGroup.echo_crystal_demo"))
        .icon(() -> new ItemStack(Items.CRAFTING_TABLE))
        .displayItems((params, output) -> {
            output.accept(ModItems.CHORUS_MOCHI.get());
            output.accept(ModItems.ECHO_BLADE.get());
            output.accept(ModItems.ECHO_CRYSTAL.get());
            output.accept(ModItems.RESONANCE_SHARD.get());
            output.accept(ModItems.ECHO_RESONANCE_BLOCK_ITEM.get());
        }).build());
    public static void register(IEventBus bus) { TABS.register(bus); }
}
