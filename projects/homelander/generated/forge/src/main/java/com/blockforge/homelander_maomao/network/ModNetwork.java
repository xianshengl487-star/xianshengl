package com.blockforge.homelander_maomao.network;

import com.blockforge.homelander_maomao.HomelanderMaomaoMod;
import com.blockforge.homelander_maomao.client.HomelanderClient;
import com.blockforge.homelander_maomao.logic.HomelanderAbilityEvents;
import java.util.function.Supplier;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.network.NetworkEvent;
import net.minecraftforge.network.NetworkRegistry;
import net.minecraftforge.network.PacketDistributor;
import net.minecraftforge.network.simple.SimpleChannel;

public final class ModNetwork {
    private static final String PROTOCOL = "5";
    public static final SimpleChannel CHANNEL = NetworkRegistry.newSimpleChannel(
        new ResourceLocation(HomelanderMaomaoMod.MODID, "main"),
        () -> PROTOCOL,
        PROTOCOL::equals,
        PROTOCOL::equals
    );

    private static int id = 0;

    private ModNetwork() {}

    public static void register() {
        CHANNEL.messageBuilder(AbilityActionPacket.class, id++)
            .encoder(AbilityActionPacket::encode)
            .decoder(AbilityActionPacket::decode)
            .consumerMainThread(AbilityActionPacket::handle)
            .add();

        CHANNEL.messageBuilder(AbilityStatePacket.class, id++)
            .encoder(AbilityStatePacket::encode)
            .decoder(AbilityStatePacket::decode)
            .consumerMainThread(AbilityStatePacket::handle)
            .add();

        CHANNEL.messageBuilder(OpenCreativePowerPanelPacket.class, id++)
            .encoder(OpenCreativePowerPanelPacket::encode)
            .decoder(OpenCreativePowerPanelPacket::decode)
            .consumerMainThread(OpenCreativePowerPanelPacket::handle)
            .add();
    }

    public static void sendAbilityAction(String abilityId) {
        CHANNEL.sendToServer(new AbilityActionPacket(abilityId));
    }

    public static void sendAbilityState(ServerPlayer player, AbilityStatePacket packet) {
        CHANNEL.send(PacketDistributor.PLAYER.with(() -> player), packet);
    }

    public static void sendOpenCreativePowerPanel(ServerPlayer player) {
        CHANNEL.send(PacketDistributor.PLAYER.with(() -> player), new OpenCreativePowerPanelPacket());
    }

    public record AbilityActionPacket(String abilityId) {
        public static void encode(AbilityActionPacket message, FriendlyByteBuf buffer) {
            buffer.writeUtf(message.abilityId, 64);
        }

        public static AbilityActionPacket decode(FriendlyByteBuf buffer) {
            return new AbilityActionPacket(buffer.readUtf(64));
        }

        public static void handle(AbilityActionPacket message, Supplier<NetworkEvent.Context> contextSupplier) {
            NetworkEvent.Context context = contextSupplier.get();
            context.enqueueWork(() -> {
                if (context.getSender() != null) {
                    HomelanderAbilityEvents.triggerAbility(context.getSender(), message.abilityId);
                }
            });
            context.setPacketHandled(true);
        }
    }

    public record AbilityStatePacket(
        int energy,
        int heatCooldown,
        int specialCooldown,
        int form,
        int powerMask,
        int speedTier,
        int speedCharge,
        int chronoTicks,
        int speedLimitEnabled,
        int speedLimitTier,
        int deepSeaTicks,
        int noirTicks,
        int flameTicks,
        int regenTicks,
        int surgeTicks,
        int strengthTier,
        int bodyTier,
        int archetype,
        String traitSummary
    ) {
        public static void encode(AbilityStatePacket message, FriendlyByteBuf buffer) {
            buffer.writeInt(message.energy);
            buffer.writeInt(message.heatCooldown);
            buffer.writeInt(message.specialCooldown);
            buffer.writeInt(message.form);
            buffer.writeInt(message.powerMask);
            buffer.writeInt(message.speedTier);
            buffer.writeInt(message.speedCharge);
            buffer.writeInt(message.chronoTicks);
            buffer.writeInt(message.speedLimitEnabled);
            buffer.writeInt(message.speedLimitTier);
            buffer.writeInt(message.deepSeaTicks);
            buffer.writeInt(message.noirTicks);
            buffer.writeInt(message.flameTicks);
            buffer.writeInt(message.regenTicks);
            buffer.writeInt(message.surgeTicks);
            buffer.writeInt(message.strengthTier);
            buffer.writeInt(message.bodyTier);
            buffer.writeInt(message.archetype);
            buffer.writeUtf(message.traitSummary, 512);
        }

        public static AbilityStatePacket decode(FriendlyByteBuf buffer) {
            return new AbilityStatePacket(
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readInt(),
                buffer.readUtf(512)
            );
        }

        public static void handle(AbilityStatePacket message, Supplier<NetworkEvent.Context> contextSupplier) {
            NetworkEvent.Context context = contextSupplier.get();
            context.enqueueWork(() -> HomelanderClient.acceptServerState(message));
            context.setPacketHandled(true);
        }
    }

    public record OpenCreativePowerPanelPacket() {
        public static void encode(OpenCreativePowerPanelPacket message, FriendlyByteBuf buffer) {
        }

        public static OpenCreativePowerPanelPacket decode(FriendlyByteBuf buffer) {
            return new OpenCreativePowerPanelPacket();
        }

        public static void handle(OpenCreativePowerPanelPacket message, Supplier<NetworkEvent.Context> contextSupplier) {
            NetworkEvent.Context context = contextSupplier.get();
            context.enqueueWork(HomelanderClient::openCreativePowerPanel);
            context.setPacketHandled(true);
        }
    }
}
