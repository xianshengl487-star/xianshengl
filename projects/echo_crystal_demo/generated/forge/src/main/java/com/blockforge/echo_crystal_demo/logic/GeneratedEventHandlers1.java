package com.blockforge.echo_crystal_demo.logic;

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
        if (!event.getItemStack().is(com.blockforge.echo_crystal_demo.registry.ModItems.ECHO_CRYSTAL.get())) return;
        double bf_echo_charge = 3;
        String bf_echo_label = "????";
        if (Cooldowns.ready(player.getUUID(), "echo_crystal", level.getGameTime())) {
        if (player.experienceLevel >= (int) (bf_echo_charge)) {
        player.giveExperienceLevels(-((int) (bf_echo_charge)));
        bf_echo_charge = bf_echo_charge + 2;
        event.getItemStack().getOrCreateTag().putDouble("echo_charge", bf_echo_charge);
        event.getItemStack().getOrCreateTag().putString("echo_note", bf_echo_label + " ??? " + String.valueOf(bf_echo_charge) + " ???");
        if (player.getServer() != null) player.getServer().getCommands().performPrefixedCommand(player.createCommandSourceStack(), "execute at @p run particle minecraft:sonic_boom ~ ~1 ~ 0 0 0 0 1");
        player.sendSystemMessage(net.minecraft.network.chat.Component.literal("?b" + bf_echo_label + " ??? " + String.valueOf(bf_echo_charge) + " ?????"));
        Cooldowns.start(player.getUUID(), "echo_crystal", level.getGameTime() + (long) (80));
        } else {
        player.sendSystemMessage(net.minecraft.network.chat.Component.literal("?7?? " + String.valueOf(bf_echo_charge) + " ??????????????"));
        }
        } else {
        player.sendSystemMessage(net.minecraft.network.chat.Component.literal("?7?? " + String.valueOf(bf_echo_charge) + " ??????????????"));
        }
    }
}
