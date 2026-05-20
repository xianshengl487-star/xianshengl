package com.blockforge.cooler_blackrobe_curios.registry;

import com.blockforge.cooler_blackrobe_curios.CoolerBlackrobeCuriosMod;
import com.blockforge.cooler_blackrobe_curios.item.AccessoryCatalog;
import com.blockforge.cooler_blackrobe_curios.item.BlackrobeCurioItem;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.Rarity;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class ModItems {
    public static final DeferredRegister<Item> ITEMS = DeferredRegister.create(ForgeRegistries.ITEMS, CoolerBlackrobeCuriosMod.MODID);
    public static final Map<String, RegistryObject<Item>> ACCESSORIES = new LinkedHashMap<>();

    static {
        for (var spec : AccessoryCatalog.ALL) {
            ACCESSORIES.put(spec.id(), ITEMS.register(spec.id(), () -> new BlackrobeCurioItem(spec, new Item.Properties().stacksTo(1).rarity(spec.rarity()))));
        }
    }

    private ModItems() {
    }

    public static RegistryObject<Item> get(String id) {
        return ACCESSORIES.get(id);
    }

    public static Collection<RegistryObject<Item>> allAccessories() {
        return ACCESSORIES.values();
    }

    public static void register(IEventBus bus) {
        ITEMS.register(bus);
    }
}
