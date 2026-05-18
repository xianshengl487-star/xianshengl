package com.blockforge.ice_wand_demo.registry;

import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;
import net.minecraftforge.eventbus.api.IEventBus;
import com.blockforge.ice_wand_demo.IceWandDemoMod;

public class ModBlocks {
    public static final DeferredRegister<Block> BLOCKS = DeferredRegister.create(ForgeRegistries.BLOCKS, IceWandDemoMod.MODID);
    public static final RegistryObject<Block> FROST_BLOCK = BLOCKS.register("frost_block", () -> new Block(BlockBehaviour.Properties.of().mapColor(MapColor.STONE).strength(3f, 3f).sound(SoundType.STONE).requiresCorrectToolForDrops()));

    public static void register(IEventBus bus) { BLOCKS.register(bus); }
}
