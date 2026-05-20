package com.blockforge.cooler_blackrobe_curios.item;

import com.google.common.collect.HashMultimap;
import com.google.common.collect.Multimap;
import java.util.List;
import java.util.UUID;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.Level;
import top.theillusivec4.curios.api.SlotContext;
import top.theillusivec4.curios.api.type.capability.ICurioItem;

public final class BlackrobeCurioItem extends Item implements ICurioItem {
    private final AccessorySpec spec;

    public BlackrobeCurioItem(AccessorySpec spec, Properties properties) {
        super(properties);
        this.spec = spec;
    }

    @Override
    public Multimap<Attribute, AttributeModifier> getAttributeModifiers(SlotContext slotContext, UUID uuid, ItemStack stack) {
        Multimap<Attribute, AttributeModifier> modifiers = HashMultimap.create();
        add(modifiers, Attributes.MAX_HEALTH, uuid, "Blackrobe health", spec.health());
        add(modifiers, Attributes.ARMOR, uuid, "Blackrobe armor", spec.armor());
        add(modifiers, Attributes.ARMOR_TOUGHNESS, uuid, "Blackrobe toughness", spec.toughness());
        add(modifiers, Attributes.ATTACK_DAMAGE, uuid, "Blackrobe damage", spec.damage());
        add(modifiers, Attributes.ATTACK_SPEED, uuid, "Blackrobe attack speed", spec.attackSpeed());
        add(modifiers, Attributes.MOVEMENT_SPEED, uuid, "Blackrobe speed", spec.speed());
        add(modifiers, Attributes.KNOCKBACK_RESISTANCE, uuid, "Blackrobe knockback", spec.knockback());
        return modifiers;
    }

    @Override
    public void curioTick(SlotContext slotContext, ItemStack stack) {
        LivingEntity wearer = slotContext.entity();
        if (wearer == null || wearer.level().isClientSide) {
            return;
        }

        switch (spec.effect()) {
            case SHADOW -> {
                wearer.addEffect(new MobEffectInstance(MobEffects.NIGHT_VISION, 240, 0, false, false, true));
                if (wearer.isCrouching()) {
                    wearer.addEffect(new MobEffectInstance(MobEffects.INVISIBILITY, 80, 0, false, false, true));
                }
            }
            case SUN -> {
                wearer.addEffect(new MobEffectInstance(MobEffects.FIRE_RESISTANCE, 160, 0, false, false, true));
                wearer.setRemainingFireTicks(0);
                if (wearer.tickCount % 20 == 0) {
                    wearer.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 80, 0, false, false, true));
                }
            }
            case DEPTH -> {
                wearer.addEffect(new MobEffectInstance(MobEffects.WATER_BREATHING, 240, 0, false, false, true));
                if (wearer.isInWaterOrBubble()) {
                    wearer.addEffect(new MobEffectInstance(MobEffects.DOLPHINS_GRACE, 100, 0, false, false, true));
                    wearer.setAirSupply(wearer.getMaxAirSupply());
                }
            }
            case STORM -> {
                wearer.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 100, 0, false, false, true));
                wearer.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 80, 0, false, false, true));
                if (wearer.isInWaterRainOrBubble()) {
                    wearer.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 80, 0, false, false, true));
                }
            }
            case VOID -> {
                wearer.addEffect(new MobEffectInstance(MobEffects.NIGHT_VISION, 180, 0, false, false, true));
                wearer.addEffect(new MobEffectInstance(MobEffects.DIG_SPEED, 80, 0, false, false, true));
                if (wearer.tickCount % 60 == 0) {
                    wearer.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 80, 1, false, false, true));
                }
            }
            case REGEN_SHIELD -> {
                if (wearer.getHealth() < wearer.getMaxHealth() * 0.75f) {
                    wearer.addEffect(new MobEffectInstance(MobEffects.REGENERATION, 80, 0, false, false, true));
                }
                if (wearer.getHealth() < wearer.getMaxHealth() * 0.5f) {
                    wearer.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 80, 0, false, false, true));
                }
            }
            case CHRONO_PULSE -> {
                if (wearer.tickCount % 20 == 0 && wearer.isSprinting()) {
                    wearer.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 80, 0, false, false, true));
                    for (LivingEntity target : wearer.level().getEntitiesOfClass(LivingEntity.class, wearer.getBoundingBox().inflate(10.0), entity -> entity != wearer && entity.isAlive())) {
                        target.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 40, 0, false, false, true));
                    }
                }
            }
            case PHASE_STEP -> {
                if (wearer.isCrouching()) {
                    wearer.addEffect(new MobEffectInstance(MobEffects.INVISIBILITY, 60, 0, false, false, true));
                    wearer.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 60, 0, false, false, true));
                }
                if (!wearer.onGround()) {
                    wearer.addEffect(new MobEffectInstance(MobEffects.SLOW_FALLING, 40, 0, false, false, true));
                }
            }
            case BLOOD_SURGE -> {
                if (wearer.getHealth() < wearer.getMaxHealth() * 0.5f) {
                    wearer.addEffect(new MobEffectInstance(MobEffects.REGENERATION, 80, 1, false, false, true));
                    wearer.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 80, 0, false, false, true));
                }
            }
            case SERVO_SHIELD -> {
                if (wearer.getHealth() < wearer.getMaxHealth() * 0.6f) {
                    wearer.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 100, 1, false, false, true));
                    wearer.addEffect(new MobEffectInstance(MobEffects.ABSORPTION, 100, 0, false, false, true));
                }
            }
            case NONE -> {
            }
        }
    }

    @Override
    public void appendHoverText(ItemStack stack, Level level, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.literal("等级 " + spec.tierLabel() + " · " + spec.slot().zhLabel()).withStyle(ChatFormatting.GOLD));
        tooltip.add(Component.literal(spec.isMechanic() ? "机制型" : "数值型").withStyle(ChatFormatting.GRAY));
        appendStat(tooltip, "生命", spec.health());
        appendStat(tooltip, "护甲", spec.armor());
        appendStat(tooltip, "韧性", spec.toughness());
        appendStat(tooltip, "伤害", spec.damage());
        appendStat(tooltip, "攻速", spec.attackSpeed());
        appendStat(tooltip, "速度", spec.speed());
        appendStat(tooltip, "击退抗性", spec.knockback());
        if (spec.effect() != AccessoryEffectProfile.NONE) {
            tooltip.add(Component.literal("机制：" + spec.effect().zhLabel()).withStyle(ChatFormatting.DARK_AQUA));
        }
        super.appendHoverText(stack, level, tooltip, flag);
    }

    private static void add(Multimap<Attribute, AttributeModifier> modifiers, Attribute attribute, UUID uuid, String name, double amount) {
        if (amount == 0.0) {
            return;
        }
        modifiers.put(attribute, new AttributeModifier(uuid, name, amount, AttributeModifier.Operation.ADDITION));
    }

    private static void appendStat(List<Component> tooltip, String label, double value) {
        if (value == 0.0) {
            return;
        }
        tooltip.add(Component.literal(label + " " + format(value)).withStyle(ChatFormatting.DARK_GRAY));
    }

    private static String format(double value) {
        if (Math.abs(value - Math.rint(value)) < 1.0E-6) {
            return String.valueOf((int) Math.rint(value));
        }
        return String.format("%.2f", value);
    }
}
