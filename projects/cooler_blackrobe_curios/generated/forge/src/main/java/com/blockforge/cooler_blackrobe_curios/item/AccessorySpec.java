package com.blockforge.cooler_blackrobe_curios.item;

import net.minecraft.world.item.Rarity;

public record AccessorySpec(
    String id,
    int tier,
    AccessorySlot slot,
    double health,
    double armor,
    double toughness,
    double damage,
    double attackSpeed,
    double speed,
    double knockback,
    AccessoryEffectProfile effect
) {
    public Rarity rarity() {
        return switch (Math.max(1, Math.min(5, tier))) {
            case 1 -> Rarity.UNCOMMON;
            case 2, 3 -> Rarity.RARE;
            default -> Rarity.EPIC;
        };
    }

    public String tierLabel() {
        return "T" + Math.max(1, Math.min(5, tier));
    }

    public boolean isMechanic() {
        return effect != AccessoryEffectProfile.NONE;
    }
}
