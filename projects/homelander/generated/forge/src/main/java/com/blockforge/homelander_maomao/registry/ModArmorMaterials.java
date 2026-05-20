package com.blockforge.homelander_maomao.registry;

import com.blockforge.homelander_maomao.HomelanderMaomaoMod;
import java.util.EnumMap;
import java.util.Map;
import java.util.function.Supplier;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.ArmorMaterial;
import net.minecraft.world.item.crafting.Ingredient;

public enum ModArmorMaterials implements ArmorMaterial {
    HOMELANDER("homelander", 42, Map.of(
        ArmorItem.Type.BOOTS, 4,
        ArmorItem.Type.LEGGINGS, 7,
        ArmorItem.Type.CHESTPLATE, 9,
        ArmorItem.Type.HELMET, 4
    ), 28, SoundEvents.ARMOR_EQUIP_NETHERITE, 4.0f, 0.18f, () -> Ingredient.of(ModItems.VOUGHT_POWER_CORE.get())),
    STARLIGHT("starlight", 36, Map.of(
        ArmorItem.Type.BOOTS, 3,
        ArmorItem.Type.LEGGINGS, 6,
        ArmorItem.Type.CHESTPLATE, 8,
        ArmorItem.Type.HELMET, 3
    ), 26, SoundEvents.ARMOR_EQUIP_NETHERITE, 3.0f, 0.08f, () -> Ingredient.of(ModItems.STARLIGHT_CHARGE.get())),
    A_TRAIN("a_train", 34, Map.of(
        ArmorItem.Type.BOOTS, 4,
        ArmorItem.Type.LEGGINGS, 5,
        ArmorItem.Type.CHESTPLATE, 7,
        ArmorItem.Type.HELMET, 3
    ), 24, SoundEvents.ARMOR_EQUIP_NETHERITE, 2.5f, 0.06f, () -> Ingredient.of(ModItems.A_TRAIN_BOOSTER.get())),
    NOIR("noir", 38, Map.of(
        ArmorItem.Type.BOOTS, 3,
        ArmorItem.Type.LEGGINGS, 6,
        ArmorItem.Type.CHESTPLATE, 8,
        ArmorItem.Type.HELMET, 3
    ), 22, SoundEvents.ARMOR_EQUIP_NETHERITE, 3.5f, 0.16f, () -> Ingredient.of(ModItems.NOIR_CLIMBING_GLOVES.get())),
    DEEP("deep", 34, Map.of(
        ArmorItem.Type.BOOTS, 3,
        ArmorItem.Type.LEGGINGS, 6,
        ArmorItem.Type.CHESTPLATE, 8,
        ArmorItem.Type.HELMET, 3
    ), 24, SoundEvents.ARMOR_EQUIP_NETHERITE, 2.8f, 0.10f, () -> Ingredient.of(ModItems.VOUGHT_POWER_CORE.get())),
    TRANSLUCENT("translucent", 42, Map.of(
        ArmorItem.Type.BOOTS, 4,
        ArmorItem.Type.LEGGINGS, 7,
        ArmorItem.Type.CHESTPLATE, 9,
        ArmorItem.Type.HELMET, 4
    ), 30, SoundEvents.ARMOR_EQUIP_NETHERITE, 4.2f, 0.20f, () -> Ingredient.of(ModItems.INVISIBLE_SKIN_SAMPLE.get())),
    MAEVE("maeve", 40, Map.of(
        ArmorItem.Type.BOOTS, 4,
        ArmorItem.Type.LEGGINGS, 7,
        ArmorItem.Type.CHESTPLATE, 9,
        ArmorItem.Type.HELMET, 4
    ), 27, SoundEvents.ARMOR_EQUIP_NETHERITE, 4.4f, 0.18f, () -> Ingredient.of(ModItems.VOUGHT_POWER_CORE.get()));

    private static final EnumMap<ArmorItem.Type, Integer> BASE_DURABILITY = new EnumMap<>(ArmorItem.Type.class);

    static {
        BASE_DURABILITY.put(ArmorItem.Type.BOOTS, 13);
        BASE_DURABILITY.put(ArmorItem.Type.LEGGINGS, 15);
        BASE_DURABILITY.put(ArmorItem.Type.CHESTPLATE, 16);
        BASE_DURABILITY.put(ArmorItem.Type.HELMET, 11);
    }

    private final String name;
    private final int durabilityMultiplier;
    private final Map<ArmorItem.Type, Integer> defense;
    private final int enchantmentValue;
    private final SoundEvent equipSound;
    private final float toughness;
    private final float knockbackResistance;
    private final Supplier<Ingredient> repairIngredient;

    ModArmorMaterials(String name, int durabilityMultiplier, Map<ArmorItem.Type, Integer> defense, int enchantmentValue, SoundEvent equipSound, float toughness, float knockbackResistance, Supplier<Ingredient> repairIngredient) {
        this.name = name;
        this.durabilityMultiplier = durabilityMultiplier;
        this.defense = defense;
        this.enchantmentValue = enchantmentValue;
        this.equipSound = equipSound;
        this.toughness = toughness;
        this.knockbackResistance = knockbackResistance;
        this.repairIngredient = repairIngredient;
    }

    @Override
    public int getDurabilityForType(ArmorItem.Type type) {
        return BASE_DURABILITY.get(type) * durabilityMultiplier;
    }

    @Override
    public int getDefenseForType(ArmorItem.Type type) {
        return defense.getOrDefault(type, 0);
    }

    @Override
    public int getEnchantmentValue() {
        return enchantmentValue;
    }

    @Override
    public SoundEvent getEquipSound() {
        return equipSound;
    }

    @Override
    public Ingredient getRepairIngredient() {
        return repairIngredient.get();
    }

    @Override
    public String getName() {
        return HomelanderMaomaoMod.MODID + ":" + name;
    }

    @Override
    public float getToughness() {
        return toughness;
    }

    @Override
    public float getKnockbackResistance() {
        return knockbackResistance;
    }
}
