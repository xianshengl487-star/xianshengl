package com.blockforge.ice_wand_demo.registry;

import net.minecraft.world.food.FoodProperties;
import net.minecraft.world.item.AxeItem;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.HoeItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.PickaxeItem;
import net.minecraft.world.item.ShovelItem;
import net.minecraft.world.item.SwordItem;
import net.minecraft.world.item.Tiers;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;
import net.minecraftforge.eventbus.api.IEventBus;
import com.blockforge.ice_wand_demo.IceWandDemoMod;

public class ModItems {
    public static final DeferredRegister<Item> ITEMS = DeferredRegister.create(ForgeRegistries.ITEMS, IceWandDemoMod.MODID);
    public static final RegistryObject<Item> ICE_WAND = ITEMS.register("ice_wand", () -> new Item(new Item.Properties().stacksTo(1).durability(128)));
    public static final RegistryObject<Item> FROST_BLOCK_ITEM = ITEMS.register("frost_block", () -> new BlockItem(ModBlocks.FROST_BLOCK.get(), new Item.Properties()));

    public static void register(IEventBus bus) { ITEMS.register(bus); }
}
