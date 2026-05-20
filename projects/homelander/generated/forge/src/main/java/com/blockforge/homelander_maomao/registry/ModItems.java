package com.blockforge.homelander_maomao.registry;

import com.blockforge.homelander_maomao.HomelanderMaomaoMod;
import net.minecraft.world.food.FoodProperties;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.Rarity;
import net.minecraft.world.item.SwordItem;
import net.minecraft.world.item.Tiers;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.common.ForgeSpawnEggItem;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public class ModItems {
    public static final DeferredRegister<Item> ITEMS = DeferredRegister.create(ForgeRegistries.ITEMS, HomelanderMaomaoMod.MODID);
    public static final RegistryObject<Item> COMPOUND_V_SERUM = ITEMS.register("compound_v_serum", () -> new Item(new Item.Properties().stacksTo(16).rarity(Rarity.EPIC).food(new FoodProperties.Builder().nutrition(0).saturationMod(0f).alwaysEat().build())));
    public static final RegistryObject<Item> HOMELANDER_BOOTS = ITEMS.register("homelander_boots", () -> new ArmorItem(ModArmorMaterials.HOMELANDER, ArmorItem.Type.BOOTS, new Item.Properties().stacksTo(1).rarity(Rarity.EPIC)));
    public static final RegistryObject<Item> HOMELANDER_CHESTPLATE = ITEMS.register("homelander_chestplate", () -> new ArmorItem(ModArmorMaterials.HOMELANDER, ArmorItem.Type.CHESTPLATE, new Item.Properties().stacksTo(1).rarity(Rarity.EPIC)));
    public static final RegistryObject<Item> HOMELANDER_HELMET = ITEMS.register("homelander_helmet", () -> new ArmorItem(ModArmorMaterials.HOMELANDER, ArmorItem.Type.HELMET, new Item.Properties().stacksTo(1).rarity(Rarity.EPIC)));
    public static final RegistryObject<Item> HOMELANDER_LEGGINGS = ITEMS.register("homelander_leggings", () -> new ArmorItem(ModArmorMaterials.HOMELANDER, ArmorItem.Type.LEGGINGS, new Item.Properties().stacksTo(1).rarity(Rarity.EPIC)));
    public static final RegistryObject<Item> STARLIGHT_BOOTS = armor("starlight_boots", ModArmorMaterials.STARLIGHT, ArmorItem.Type.BOOTS);
    public static final RegistryObject<Item> STARLIGHT_CHESTPLATE = armor("starlight_chestplate", ModArmorMaterials.STARLIGHT, ArmorItem.Type.CHESTPLATE);
    public static final RegistryObject<Item> STARLIGHT_HELMET = armor("starlight_helmet", ModArmorMaterials.STARLIGHT, ArmorItem.Type.HELMET);
    public static final RegistryObject<Item> STARLIGHT_LEGGINGS = armor("starlight_leggings", ModArmorMaterials.STARLIGHT, ArmorItem.Type.LEGGINGS);
    public static final RegistryObject<Item> A_TRAIN_BOOTS = armor("a_train_boots", ModArmorMaterials.A_TRAIN, ArmorItem.Type.BOOTS);
    public static final RegistryObject<Item> A_TRAIN_CHESTPLATE = armor("a_train_chestplate", ModArmorMaterials.A_TRAIN, ArmorItem.Type.CHESTPLATE);
    public static final RegistryObject<Item> A_TRAIN_HELMET = armor("a_train_helmet", ModArmorMaterials.A_TRAIN, ArmorItem.Type.HELMET);
    public static final RegistryObject<Item> A_TRAIN_LEGGINGS = armor("a_train_leggings", ModArmorMaterials.A_TRAIN, ArmorItem.Type.LEGGINGS);
    public static final RegistryObject<Item> NOIR_BOOTS = armor("noir_boots", ModArmorMaterials.NOIR, ArmorItem.Type.BOOTS);
    public static final RegistryObject<Item> NOIR_CHESTPLATE = armor("noir_chestplate", ModArmorMaterials.NOIR, ArmorItem.Type.CHESTPLATE);
    public static final RegistryObject<Item> NOIR_HELMET = armor("noir_helmet", ModArmorMaterials.NOIR, ArmorItem.Type.HELMET);
    public static final RegistryObject<Item> NOIR_LEGGINGS = armor("noir_leggings", ModArmorMaterials.NOIR, ArmorItem.Type.LEGGINGS);
    public static final RegistryObject<Item> DEEP_BOOTS = armor("deep_boots", ModArmorMaterials.DEEP, ArmorItem.Type.BOOTS);
    public static final RegistryObject<Item> DEEP_CHESTPLATE = armor("deep_chestplate", ModArmorMaterials.DEEP, ArmorItem.Type.CHESTPLATE);
    public static final RegistryObject<Item> DEEP_HELMET = armor("deep_helmet", ModArmorMaterials.DEEP, ArmorItem.Type.HELMET);
    public static final RegistryObject<Item> DEEP_LEGGINGS = armor("deep_leggings", ModArmorMaterials.DEEP, ArmorItem.Type.LEGGINGS);
    public static final RegistryObject<Item> TRANSLUCENT_BOOTS = armor("translucent_boots", ModArmorMaterials.TRANSLUCENT, ArmorItem.Type.BOOTS);
    public static final RegistryObject<Item> TRANSLUCENT_CHESTPLATE = armor("translucent_chestplate", ModArmorMaterials.TRANSLUCENT, ArmorItem.Type.CHESTPLATE);
    public static final RegistryObject<Item> TRANSLUCENT_HELMET = armor("translucent_helmet", ModArmorMaterials.TRANSLUCENT, ArmorItem.Type.HELMET);
    public static final RegistryObject<Item> TRANSLUCENT_LEGGINGS = armor("translucent_leggings", ModArmorMaterials.TRANSLUCENT, ArmorItem.Type.LEGGINGS);
    public static final RegistryObject<Item> MAEVE_BOOTS = armor("maeve_boots", ModArmorMaterials.MAEVE, ArmorItem.Type.BOOTS);
    public static final RegistryObject<Item> MAEVE_CHESTPLATE = armor("maeve_chestplate", ModArmorMaterials.MAEVE, ArmorItem.Type.CHESTPLATE);
    public static final RegistryObject<Item> MAEVE_HELMET = armor("maeve_helmet", ModArmorMaterials.MAEVE, ArmorItem.Type.HELMET);
    public static final RegistryObject<Item> MAEVE_LEGGINGS = armor("maeve_leggings", ModArmorMaterials.MAEVE, ArmorItem.Type.LEGGINGS);
    public static final RegistryObject<Item> STARLIGHT_CHARGE = ITEMS.register("starlight_charge", () -> new Item(new Item.Properties().stacksTo(32).rarity(Rarity.RARE)));
    public static final RegistryObject<Item> UNSTABLE_V_SERUM = ITEMS.register("unstable_v_serum", () -> new Item(new Item.Properties().stacksTo(8).rarity(Rarity.EPIC).food(new FoodProperties.Builder().nutrition(0).saturationMod(0f).alwaysEat().build())));
    public static final RegistryObject<Item> VOUGHT_MILK = ITEMS.register("vought_milk", () -> new Item(new Item.Properties().stacksTo(16).rarity(Rarity.RARE).food(new FoodProperties.Builder().nutrition(4).saturationMod(0.6f).alwaysEat().build())));
    public static final RegistryObject<Item> VOUGHT_POWER_CORE = ITEMS.register("vought_power_core", () -> new Item(new Item.Properties().stacksTo(16).rarity(Rarity.EPIC)));
    public static final RegistryObject<Item> VOUGHT_PISTOL = ITEMS.register("vought_pistol", () -> new Item(new Item.Properties().stacksTo(1).durability(420).rarity(Rarity.RARE)));
    public static final RegistryObject<Item> VOUGHT_RIFLE = ITEMS.register("vought_rifle", () -> new Item(new Item.Properties().stacksTo(1).durability(720).rarity(Rarity.RARE)));
    public static final RegistryObject<Item> VOUGHT_SHOTGUN = ITEMS.register("vought_shotgun", () -> new Item(new Item.Properties().stacksTo(1).durability(560).rarity(Rarity.RARE)));
    public static final RegistryObject<Item> HEAT_VISION_FOCUS = ITEMS.register("heat_vision_focus", () -> new Item(new Item.Properties().stacksTo(1).durability(800).rarity(Rarity.EPIC)));
    public static final RegistryObject<Item> TEMP_V24_SERUM = ITEMS.register("temp_v24_serum", () -> new Item(new Item.Properties().stacksTo(8).rarity(Rarity.EPIC).food(new FoodProperties.Builder().nutrition(0).saturationMod(0f).alwaysEat().build())));
    public static final RegistryObject<Item> INVISIBLE_SKIN_SAMPLE = ITEMS.register("invisible_skin_sample", () -> new Item(new Item.Properties().stacksTo(8).rarity(Rarity.EPIC).food(new FoodProperties.Builder().nutrition(0).saturationMod(0f).alwaysEat().build())));
    public static final RegistryObject<Item> NOIR_CLIMBING_GLOVES = ITEMS.register("noir_climbing_gloves", () -> new Item(new Item.Properties().stacksTo(1).durability(640).rarity(Rarity.RARE)));
    public static final RegistryObject<Item> SOLDIER_BOY_CHARGE_CELL = ITEMS.register("soldier_boy_charge_cell", () -> new Item(new Item.Properties().stacksTo(16).rarity(Rarity.EPIC).food(new FoodProperties.Builder().nutrition(0).saturationMod(0f).alwaysEat().build())));
    public static final RegistryObject<Item> STARLIGHT_AMPLIFIER = ITEMS.register("starlight_amplifier", () -> new Item(new Item.Properties().stacksTo(16).rarity(Rarity.RARE).food(new FoodProperties.Builder().nutrition(0).saturationMod(0f).alwaysEat().build())));
    public static final RegistryObject<Item> A_TRAIN_BOOSTER = ITEMS.register("a_train_booster", () -> new Item(new Item.Properties().stacksTo(16).rarity(Rarity.EPIC).food(new FoodProperties.Builder().nutrition(0).saturationMod(0f).alwaysEat().build())));
    public static final RegistryObject<Item> ANOMALY_V_SERUM = ITEMS.register("anomaly_v_serum", () -> new Item(new Item.Properties().stacksTo(8).rarity(Rarity.EPIC).food(new FoodProperties.Builder().nutrition(0).saturationMod(0f).alwaysEat().build())));
    public static final RegistryObject<Item> V_POWER_SHARD = ITEMS.register("v_power_shard", () -> new Item(new Item.Properties().stacksTo(64).rarity(Rarity.RARE)));
    public static final RegistryObject<Item> COUNTER_V_BATON = ITEMS.register("counter_v_baton", () -> new SwordItem(Tiers.NETHERITE, 4, -2.1f, new Item.Properties().stacksTo(1).durability(860).rarity(Rarity.EPIC)));
    public static final RegistryObject<Item> SUPPRESSOR_RIFLE = ITEMS.register("suppressor_rifle", () -> new Item(new Item.Properties().stacksTo(1).durability(960).rarity(Rarity.EPIC)));
    public static final RegistryObject<Item> NULL_FIELD_GRENADE = ITEMS.register("null_field_grenade", () -> new Item(new Item.Properties().stacksTo(16).rarity(Rarity.RARE)));
    public static final RegistryObject<Item> POWER_SCANNER = ITEMS.register("power_scanner", () -> new Item(new Item.Properties().stacksTo(1).durability(480).rarity(Rarity.RARE)));
    public static final RegistryObject<Item> VOUGHT_HUNTER_BEACON = ITEMS.register("vought_hunter_beacon", () -> new Item(new Item.Properties().stacksTo(8).rarity(Rarity.RARE)));
    public static final RegistryObject<Item> V_STABILIZER_PATCH = ITEMS.register("v_stabilizer_patch", () -> new Item(new Item.Properties().stacksTo(16).rarity(Rarity.RARE).food(new FoodProperties.Builder().nutrition(0).saturationMod(0f).alwaysEat().build())));
    public static final RegistryObject<Item> TRIAL_CARD_HEAT = trialCard("trial_card_heat");
    public static final RegistryObject<Item> TRIAL_CARD_FLIGHT = trialCard("trial_card_flight");
    public static final RegistryObject<Item> TRIAL_CARD_SPEED = trialCard("trial_card_speed");
    public static final RegistryObject<Item> TRIAL_CARD_STARLIGHT = trialCard("trial_card_starlight");
    public static final RegistryObject<Item> TRIAL_CARD_NOIR = trialCard("trial_card_noir");
    public static final RegistryObject<Item> TRIAL_CARD_RANDOM = trialCard("trial_card_random");
    public static final RegistryObject<Item> V_TRAINING_MANUAL = consumable("v_training_manual", Rarity.RARE, 16);
    public static final RegistryObject<Item> V_AMPLIFIER_CORE = consumable("v_amplifier_core", Rarity.EPIC, 8);
    public static final RegistryObject<Item> REGENERATION_BOOSTER = consumable("regeneration_booster", Rarity.RARE, 16);
    public static final RegistryObject<Item> KINETIC_FOCUS_RING = ITEMS.register("kinetic_focus_ring", () -> new Item(new Item.Properties().stacksTo(1).durability(520).rarity(Rarity.RARE)));
    public static final RegistryObject<Item> CHRONO_TUNING_CHIP = ITEMS.register("chrono_tuning_chip", () -> new Item(new Item.Properties().stacksTo(1).durability(460).rarity(Rarity.EPIC)));
    public static final RegistryObject<Item> VOUGHT_HUNTER_SPAWN_EGG = ITEMS.register("vought_hunter_spawn_egg", () -> new ForgeSpawnEggItem(ModEntities.VOUGHT_HUNTER, 0x20242A, 0x38D8FF, new Item.Properties()));
    public static final RegistryObject<Item> V_OVERDOSE_MUTANT_SPAWN_EGG = ITEMS.register("v_overdose_mutant_spawn_egg", () -> new ForgeSpawnEggItem(ModEntities.V_OVERDOSE_MUTANT, 0x2B1337, 0xB6FF3E, new Item.Properties()));
    public static final RegistryObject<Item> CREATIVE_POWER_PANEL = ITEMS.register("creative_power_panel", () -> new Item(new Item.Properties().stacksTo(1).rarity(Rarity.EPIC)));

    private static RegistryObject<Item> armor(String id, ModArmorMaterials material, ArmorItem.Type type) {
        return ITEMS.register(id, () -> new ArmorItem(material, type, new Item.Properties().stacksTo(1).rarity(Rarity.EPIC)));
    }

    private static RegistryObject<Item> trialCard(String id) {
        return consumable(id, Rarity.RARE, 16);
    }

    private static RegistryObject<Item> consumable(String id, Rarity rarity, int stackSize) {
        return ITEMS.register(id, () -> new Item(new Item.Properties().stacksTo(stackSize).rarity(rarity)
            .food(new FoodProperties.Builder().nutrition(0).saturationMod(0f).alwaysEat().build())));
    }

    public static void register(IEventBus bus) {
        ITEMS.register(bus);
    }
}
