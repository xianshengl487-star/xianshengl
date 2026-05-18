package com.blockforge.echo_crystal_demo.registry;

import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;
import net.minecraftforge.eventbus.api.IEventBus;
import com.blockforge.echo_crystal_demo.EchoCrystalDemoMod;

public class ModBlocks {
    public static final DeferredRegister<Block> BLOCKS = DeferredRegister.create(ForgeRegistries.BLOCKS, EchoCrystalDemoMod.MODID);
    public static final RegistryObject<Block> ECHO_RESONANCE_BLOCK = BLOCKS.register("echo_resonance_block", () -> new Block(BlockBehaviour.Properties.of().mapColor(MapColor.STONE).strength(4.5f, 8f).sound(SoundType.AMETHYST).lightLevel(state -> 5).requiresCorrectToolForDrops()));

    public static void register(IEventBus bus) { BLOCKS.register(bus); }
}
