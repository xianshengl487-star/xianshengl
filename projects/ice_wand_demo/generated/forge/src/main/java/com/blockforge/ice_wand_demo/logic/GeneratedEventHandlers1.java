package com.blockforge.ice_wand_demo.logic;

import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;

@Mod.EventBusSubscriber
public class GeneratedEventHandlers1 {
    @SubscribeEvent
    public static void onRightClickItem(PlayerInteractEvent.RightClickItem event) {
        Player player = event.getEntity();
        Level level = event.getLevel();
        if (level.isClientSide) return;
        if (!event.getItemStack().is(com.blockforge.ice_wand_demo.registry.ModItems.ICE_WAND.get())) return;
        if (player.experienceLevel >= 10) {
        if (Cooldowns.ready(player.getUUID(), "ice_wand", level.getGameTime())) {
        player.giveExperienceLevels(-10);
        if (player.getServer() != null) player.getServer().getCommands().performPrefixedCommand(player.createCommandSourceStack(), "effect give @p minecraft:slowness 3 1");
        Cooldowns.start(player.getUUID(), "ice_wand", level.getGameTime() + 100L);
        } else {
        player.sendSystemMessage(net.minecraft.network.chat.Component.literal("需要 10 级经验，并且冷却已经结束。"));
        }
        } else {
        player.sendSystemMessage(net.minecraft.network.chat.Component.literal("需要 10 级经验，并且冷却已经结束。"));
        }
    }
}
