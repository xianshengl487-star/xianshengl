package com.blockforge.echo_crystal_demo.logic;

import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.registries.ForgeRegistries;

public class BlockForgeItemUtils {
    public static boolean has(Player player, String itemId, int count) {
        var item = ForgeRegistries.ITEMS.getValue(new ResourceLocation(itemId));
        if (item == null) return false;
        int found = 0;
        for (ItemStack stack : player.getInventory().items) {
            if (stack.is(item)) found += stack.getCount();
            if (found >= count) return true;
        }
        return false;
    }

    public static void consume(Player player, String itemId, int count) {
        var item = ForgeRegistries.ITEMS.getValue(new ResourceLocation(itemId));
        if (item == null || player.isCreative()) return;
        int remaining = count;
        for (ItemStack stack : player.getInventory().items) {
            if (!stack.is(item)) continue;
            int taken = Math.min(remaining, stack.getCount());
            stack.shrink(taken);
            remaining -= taken;
            if (remaining <= 0) return;
        }
    }
}
