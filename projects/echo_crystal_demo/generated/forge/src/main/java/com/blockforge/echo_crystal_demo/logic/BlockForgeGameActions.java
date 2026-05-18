package com.blockforge.echo_crystal_demo.logic;

import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraftforge.registries.ForgeRegistries;

public class BlockForgeGameActions {
    public static void giveItem(Player player, String itemId, int count) {
        var item = ForgeRegistries.ITEMS.getValue(new ResourceLocation(itemId));
        if (item != null) player.addItem(new ItemStack(item, count));
    }

    public static void giveEffect(Player player, String effectId, int seconds, int amplifier) {
        var effect = ForgeRegistries.MOB_EFFECTS.getValue(new ResourceLocation(effectId));
        if (effect != null) player.addEffect(new MobEffectInstance(effect, seconds * 20, amplifier));
    }

    public static void playSound(Level level, BlockPos pos, String soundId, float volume, float pitch) {
        var sound = ForgeRegistries.SOUND_EVENTS.getValue(new ResourceLocation(soundId));
        if (sound != null) level.playSound(null, pos, sound, SoundSource.PLAYERS, volume, pitch);
    }

    public static void spawnParticle(Level level, net.minecraft.world.phys.Vec3 pos, String particleId, int count) {
        if (level instanceof ServerLevel serverLevel) {
            serverLevel.sendParticles(ParticleTypes.ENCHANTED_HIT, pos.x, pos.y + 1, pos.z, count, 0.4, 0.4, 0.4, 0.05);
        }
    }

    public static void setBlock(Level level, BlockPos pos, String blockId) {
        var block = ForgeRegistries.BLOCKS.getValue(new ResourceLocation(blockId));
        if (block != null) level.setBlock(pos, block.defaultBlockState(), 3);
    }

    public static void summonEntity(Level level, BlockPos pos, String entityId, int count) {
        if (!(level instanceof ServerLevel serverLevel)) return;
        EntityType<?> type = ForgeRegistries.ENTITY_TYPES.getValue(new ResourceLocation(entityId));
        if (type == null) return;
        for (int i = 0; i < count; i++) {
            var entity = type.create(serverLevel);
            if (entity != null) {
                entity.moveTo(pos.getX() + 0.5, pos.getY() + 1, pos.getZ() + 0.5);
                serverLevel.addFreshEntity(entity);
            }
        }
    }

    public static boolean isBlock(Level level, BlockPos pos, String blockId) {
        var block = ForgeRegistries.BLOCKS.getValue(new ResourceLocation(blockId));
        return block != null && level.getBlockState(pos).is(block);
    }

    public static boolean isBiome(Level level, BlockPos pos, String biomeId) {
        return level.getBiome(pos).unwrapKey().map(key -> key.location().equals(new ResourceLocation(biomeId))).orElse(false);
    }

    public static boolean isEntityType(net.minecraft.world.entity.Entity entity, String entityId) {
        var key = ForgeRegistries.ENTITY_TYPES.getKey(entity.getType());
        return key != null && key.equals(new ResourceLocation(entityId));
    }
}
