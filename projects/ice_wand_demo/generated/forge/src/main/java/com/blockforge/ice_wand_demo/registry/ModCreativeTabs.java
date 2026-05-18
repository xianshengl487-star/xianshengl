package com.blockforge.ice_wand_demo.registry;

import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.RegistryObject;
import com.blockforge.ice_wand_demo.IceWandDemoMod;

public class ModCreativeTabs {
    public static final DeferredRegister<CreativeModeTab> TABS = DeferredRegister.create(Registries.CREATIVE_MODE_TAB, IceWandDemoMod.MODID);
    public static final RegistryObject<CreativeModeTab> MAIN_TAB = TABS.register("ice_wand_demo_tab", () -> CreativeModeTab.builder()
        .title(Component.translatable("itemGroup.ice_wand_demo"))
        .icon(() -> new ItemStack(Items.CRAFTING_TABLE))
        .displayItems((params, output) -> {
            output.accept(ModItems.ICE_WAND.get());
            output.accept(ModItems.FROST_BLOCK_ITEM.get());
        }).build());
    public static void register(IEventBus bus) { TABS.register(bus); }
}
