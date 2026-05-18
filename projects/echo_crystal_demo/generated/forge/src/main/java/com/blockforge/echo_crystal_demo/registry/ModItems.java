package com.blockforge.echo_crystal_demo.registry;

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
import com.blockforge.echo_crystal_demo.EchoCrystalDemoMod;

public class ModItems {
    public static final DeferredRegister<Item> ITEMS = DeferredRegister.create(ForgeRegistries.ITEMS, EchoCrystalDemoMod.MODID);
    public static final RegistryObject<Item> CHORUS_MOCHI = ITEMS.register("chorus_mochi", () -> new Item(new Item.Properties().stacksTo(16).food(new FoodProperties.Builder().nutrition(6).saturationMod(0.8f).build())));
    public static final RegistryObject<Item> ECHO_BLADE = ITEMS.register("echo_blade", () -> new SwordItem(Tiers.DIAMOND, 5, -2.2f, new Item.Properties().stacksTo(1).durability(780)));
    public static final RegistryObject<Item> ECHO_CRYSTAL = ITEMS.register("echo_crystal", () -> new Item(new Item.Properties().stacksTo(1).durability(96)));
    public static final RegistryObject<Item> RESONANCE_SHARD = ITEMS.register("resonance_shard", () -> new Item(new Item.Properties().stacksTo(64)));
    public static final RegistryObject<Item> ECHO_RESONANCE_BLOCK_ITEM = ITEMS.register("echo_resonance_block", () -> new BlockItem(ModBlocks.ECHO_RESONANCE_BLOCK.get(), new Item.Properties()));

    public static void register(IEventBus bus) { ITEMS.register(bus); }
}
