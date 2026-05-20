package com.blockforge.cooler_blackrobe_curios.registry;

import com.blockforge.cooler_blackrobe_curios.CoolerBlackrobeCuriosMod;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.RegistryObject;

public final class ModCreativeTabs {
    public static final DeferredRegister<CreativeModeTab> TABS = DeferredRegister.create(Registries.CREATIVE_MODE_TAB, CoolerBlackrobeCuriosMod.MODID);

    public static final RegistryObject<CreativeModeTab> MAIN_TAB = TABS.register("blackrobe_curios_tab", () -> CreativeModeTab.builder()
        .title(Component.translatable("itemGroup.cooler_blackrobe_curios"))
        .icon(() -> new ItemStack(ModItems.get("void_echo_charm").get()))
        .displayItems((params, output) -> ModItems.allAccessories().forEach(item -> output.accept(item.get())))
        .build());

    private ModCreativeTabs() {
    }

    public static void register(IEventBus bus) {
        TABS.register(bus);
    }
}
