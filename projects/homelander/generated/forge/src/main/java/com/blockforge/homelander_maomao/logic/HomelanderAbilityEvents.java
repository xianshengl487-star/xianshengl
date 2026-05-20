package com.blockforge.homelander_maomao.logic;

import com.blockforge.homelander_maomao.HomelanderMaomaoMod;
import com.blockforge.homelander_maomao.entity.VOverdoseMutantEntity;
import com.blockforge.homelander_maomao.entity.VoughtHunterEntity;
import com.blockforge.homelander_maomao.network.ModNetwork;
import com.blockforge.homelander_maomao.registry.ModEntities;
import com.blockforge.homelander_maomao.registry.ModItems;
import com.blockforge.homelander_maomao.registry.ModPotions;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import net.minecraft.core.particles.DustParticleOptions;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.damagesource.DamageTypes;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.projectile.Projectile;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.alchemy.PotionUtils;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.living.LivingEntityUseItemEvent;
import net.minecraftforge.event.entity.living.LivingFallEvent;
import net.minecraftforge.event.entity.living.LivingHurtEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import org.joml.Vector3f;

@Mod.EventBusSubscriber(modid = HomelanderMaomaoMod.MODID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public final class HomelanderAbilityEvents {
    private static final String ENERGY_KEY = "bf_energy";
    private static final String HEAT_CD_KEY = "bf_heat_cd";
    private static final String SPECIAL_CD_KEY = "bf_special_cd";
    private static final String ROLL_KEY = "bf_serum_roll";
    private static final String FORM_KEY = "bf_form";
    private static final String FORM_TICKS_KEY = "bf_form_ticks";
    private static final String SURGE_TICKS_KEY = "bf_surge_ticks";
    private static final String POWER_MASK_KEY = "bf_power_mask";
    private static final String STRENGTH_TIER_KEY = "bf_strength_tier";
    private static final String BODY_TIER_KEY = "bf_body_tier";
    private static final String ARCHETYPE_KEY = "bf_archetype";
    private static final String SPEED_TIER_KEY = "bf_speed_tier";
    private static final String SPEED_CHARGE_KEY = "bf_speed_charge";
    private static final String CHRONO_TICKS_KEY = "bf_chrono_ticks";
    private static final String STRENGTH_CAP_KEY = "bf_strength_cap";
    private static final String BODY_CAP_KEY = "bf_body_cap";
    private static final String SPEED_CAP_KEY = "bf_speed_cap";
    private static final String SPEED_LIMIT_ENABLED_KEY = "bf_speed_limit_enabled";
    private static final String SPEED_LIMIT_KEY = "bf_speed_limit";
    private static final String STRENGTH_XP_KEY = "bf_strength_xp";
    private static final String BODY_XP_KEY = "bf_body_xp";
    private static final String SPEED_XP_KEY = "bf_speed_xp";
    private static final String HEAT_TICKS_KEY = "bf_heat_ticks";
    private static final String DEEP_SEA_TICKS_KEY = "bf_deep_sea_ticks";
    private static final String NOIR_TICKS_KEY = "bf_noir_ticks";
    private static final String FLAME_TICKS_KEY = "bf_flame_ticks";
    private static final String REGEN_TICKS_KEY = "bf_regen_ticks";
    private static final String WEAPON_BOOST_TICKS_KEY = "bf_weapon_boost_ticks";
    private static final String WALL_CRAWL_TICKS_KEY = "bf_wall_crawl_ticks";
    private static final String TEMP_POWER_MASK_KEY = "bf_temp_power_mask";
    private static final String TEMP_POWER_TICKS_KEY = "bf_temp_power_ticks";
    private static final String TEMP_STRENGTH_TIER_KEY = "bf_temp_strength_tier";
    private static final String TEMP_BODY_TIER_KEY = "bf_temp_body_tier";
    private static final String TEMP_SPEED_TIER_KEY = "bf_temp_speed_tier";
    private static final String EXTRA_TRAIT_MASK_PREFIX = "bf_extra_trait_mask_";

    private static final UUID HEALTH_BONUS_UUID = UUID.fromString("9a0ac71f-0b49-4bbd-aeb0-6ac70ae2d2a1");
    private static final UUID ARMOR_BONUS_UUID = UUID.fromString("6e0a4100-8b5c-4b0d-a7ad-1ca3c4b5a501");
    private static final UUID TOUGHNESS_BONUS_UUID = UUID.fromString("0fbc1e0c-5d69-42c7-8c5b-2d7f33f44f33");
    private static final UUID KNOCKBACK_BONUS_UUID = UUID.fromString("8f1dfc5c-33e1-4af3-b915-39ef0f0e50a7");
    private static final UUID DAMAGE_BONUS_UUID = UUID.fromString("2b0a8de1-47f5-4af3-9f8f-05fb3cecf0a2");
    private static final UUID SPEED_BONUS_UUID = UUID.fromString("1b6d0a9d-5e2f-4c6b-a421-29b2dcf40375");
    private static final UUID CHRONO_BONUS_UUID = UUID.fromString("8f6c9f9c-cedf-4a0b-9c42-6a0a22d8b5f8");

    private static final int MAX_ENERGY = 200;
    private static final int MAX_PRESET_TIER = 100;
    private static final int EXTRA_TRAIT_COUNT = 100;
    private static final int SURVIVAL_SOFT_CAP_TIER = 6;
    private static final int PERMANENT_FORM_TICKS = -1;
    private static final int FORM_NONE = 0;
    private static final int FORM_MIXED = 1;
    private static final int FORM_ELITE = 2;
    private static final int FORM_PRIME = 3;

    private static final int POWER_FLIGHT = 1 << 0;
    private static final int POWER_HEAT = 1 << 1;
    private static final int POWER_STRENGTH = 1 << 2;
    private static final int POWER_SPEED = 1 << 3;
    private static final int POWER_RESIST = 1 << 4;
    private static final int POWER_BOSS = 1 << 5;
    private static final int POWER_DEEP_SEA = 1 << 6;
    private static final int POWER_NOIR = 1 << 7;
    private static final int POWER_TELEPORT = 1 << 8;
    private static final int POWER_FLAME = 1 << 9;
    private static final int POWER_BLOOD = 1 << 10;
    private static final int POWER_REGEN = 1 << 11;
    private static final int POWER_PURGE = 1 << 12;
    private static final int POWER_STARLIGHT = 1 << 13;
    private static final int POWER_SELF_EXPLODE = 1 << 14;
    private static final int POWER_WEAPON_BOOST = 1 << 15;
    private static final int POWER_WALL_CRAWL = 1 << 16;
    private static final int POWER_INVISIBLE_SKIN = 1 << 17;
    private static final int POWER_GRAVITY = 1 << 18;
    private static final int POWER_SONIC = 1 << 19;
    private static final int POWER_GLITCH = 1 << 20;
    private static final int POWER_PHASE = 1 << 21;

    private static final int ARCHETYPE_NONE = 0;
    private static final int ARCHETYPE_CORE = 1;
    private static final int ARCHETYPE_HOMELANDER = 2;
    private static final int ARCHETYPE_STARLIGHT = 3;
    private static final int ARCHETYPE_A_TRAIN = 4;
    private static final int ARCHETYPE_NOIR = 5;
    private static final int ARCHETYPE_DEEP_SEA = 6;
    private static final int ARCHETYPE_FIRESTARTER = 7;
    private static final int ARCHETYPE_TELEPORTER = 8;
    private static final int ARCHETYPE_BLOOD = 9;
    private static final int ARCHETYPE_SOLDIER_BOY = 10;
    private static final int ARCHETYPE_LOW_GRADE = 11;
    private static final int ARCHETYPE_TRANSLUCENT = 12;

    private static final String[] EXTRA_TRAIT_NAMES = new String[] {
        "热源听觉", "鹰眼动态视力", "震动感知", "危险预感", "夜巡视网膜",
        "心跳定位", "气味追踪", "低光辨识", "电磁嗅觉", "远距听觉",
        "耐火皮肤", "寒霜血液", "电弧皮肤", "毒素过滤", "真空耐受",
        "水压适应", "酸液抗性", "烟尘肺", "辐射耐性", "爆音耳膜",
        "铁拳", "骨刺强化", "反冲肌腱", "爆发握力", "精准投掷",
        "武器亲和", "斩击反射", "破甲掌", "震荡拳", "鹰爪擒拿",
        "弹跳肌腱", "墙面静电", "滑翔膜", "短程冲刺", "急停反射",
        "蛛丝步伐", "水面踏步", "磁靴足弓", "空翻平衡", "坠落卸力",
        "快速凝血", "过载心脏", "钢化骨骼", "高密皮肤", "痛觉关闭",
        "肾上腺泉", "代谢熔炉", "饥饿抑制", "肺活量增幅", "疲劳延迟",
        "精神屏障", "恐惧压制", "意志回响", "镇静脑波", "狂怒开关",
        "眩晕抵抗", "幻觉过滤", "战斗直觉", "幸运偏转", "群体威慑",
        "能量回流", "热量储存", "星光蓄电", "血液充能", "动能电池",
        "冷却神经", "细胞发电", "光谱吸收", "声波蓄压", "暗影充能",
        "相位抖动", "重力偏移", "概率噪声", "血雾共振", "火花呼吸",
        "骨骼回声", "镜像残影", "皮肤拟态", "微型冲击波", "低频咆哮",
        "子弹迟滞", "时间余震", "净化脉冲", "空间折线", "暗物质护膜",
        "生物电锁链", "反超能抗性", "高速思维", "量子闪避", "灾厄适应",
        "神经风暴", "太阳炉心", "深海君主", "黑曜心脏", "血肉王冠",
        "虚空肺", "雷霆骨架", "万有引力点", "时间裂隙", "V 神经王座"
    };

    private static final Random RANDOM = new Random();

    private HomelanderAbilityEvents() {}

    public static void triggerAbility(ServerPlayer player, String abilityId) {
        if (abilityId.startsWith("creative_")) {
            triggerCreativeCommand(player, abilityId);
            sendHudState(player);
            return;
        }
        switch (abilityId) {
            case "heat_vision" -> triggerHeatVision(player);
            case "flight_burst" -> triggerFlightBurst(player);
            case "landing_burst" -> triggerLandingBurst(player);
            case "power_surge" -> triggerPowerSurge(player);
            case "super_punch" -> triggerSuperPunch(player);
            case "starlight_flash" -> triggerStarlightFlash(player);
            case "speed_overdrive" -> triggerSpeedOverdrive(player);
            case "deep_sea" -> triggerDeepSea(player);
            case "noir_shadow" -> triggerNoirShadow(player);
            case "teleport_blink" -> triggerTeleportBlink(player);
            case "flame_wave" -> triggerFlameWave(player);
            case "blood_burst" -> triggerBloodBurst(player);
            case "super_regen" -> triggerSuperRegen(player);
            case "power_purge_blast" -> triggerPowerPurgeBlast(player);
            case "self_explosion" -> triggerSelfExplosion(player);
            case "weapon_overclock" -> triggerWeaponOverclock(player);
            case "wall_crawl" -> triggerWallCrawl(player);
            case "gravity_well" -> triggerGravityWell(player);
            case "sonic_scream" -> triggerSonicScream(player);
            case "anomaly_burst" -> triggerAnomalyBurst(player);
            case "phase_echo" -> triggerPhaseEcho(player);
            case "speed_limit_auto" -> triggerSpeedLimitAuto(player);
            case "speed_limit_clear" -> triggerSpeedLimitClear(player);
            case "panel_status" -> {
            }
            case "boss_roar" -> triggerBossRoar(player);
            default -> tell(player, "鏈煡鑳藉姏: " + abilityId);
        }
        sendHudState(player);
    }

    @SubscribeEvent
    public static void onRightClickItem(PlayerInteractEvent.RightClickItem event) {
        ItemStack stack = event.getItemStack();
        if (stack.is(ModItems.CREATIVE_POWER_PANEL.get())) {
            event.setCancellationResult(InteractionResult.SUCCESS);
            event.setCanceled(true);
            if (event.getEntity() instanceof ServerPlayer player) {
                if (!canUseCreativePowerPanel(player)) {
                    tell(player, "超能力自选面板只能在创造模式使用。");
                    return;
                }
                ModNetwork.sendOpenCreativePowerPanel(player);
                sendHudState(player);
            }
            return;
        }

        if (isGun(stack)) {
            event.setCancellationResult(InteractionResult.SUCCESS);
            event.setCanceled(true);
            if (event.getEntity() instanceof ServerPlayer player) {
                fireGun(player, stack);
            }
            return;
        }

        if (stack.is(ModItems.NULL_FIELD_GRENADE.get()) && event.getEntity() instanceof ServerPlayer player) {
            event.setCancellationResult(InteractionResult.SUCCESS);
            event.setCanceled(true);
            triggerNullFieldGrenade(player, stack);
            return;
        }

        if (stack.is(ModItems.POWER_SCANNER.get()) && event.getEntity() instanceof ServerPlayer player) {
            event.setCancellationResult(InteractionResult.SUCCESS);
            event.setCanceled(true);
            scanPoweredTargets(player, stack);
            return;
        }

        if (stack.is(ModItems.VOUGHT_HUNTER_BEACON.get()) && event.getEntity() instanceof ServerPlayer player) {
            event.setCancellationResult(InteractionResult.SUCCESS);
            event.setCanceled(true);
            deployHunterBeacon(player, stack);
            return;
        }

        if (stack.is(ModItems.KINETIC_FOCUS_RING.get()) && event.getEntity() instanceof ServerPlayer player) {
            event.setCancellationResult(InteractionResult.SUCCESS);
            event.setCanceled(true);
            setTemporaryPowers(player, POWER_WEAPON_BOOST | POWER_STRENGTH, 20 * 90, 2, 0, 0);
            setWeaponBoostTicks(player, Math.max(getWeaponBoostTicks(player), 20 * 75));
            setEnergy(player, Math.min(MAX_ENERGY, getEnergy(player) + 25));
            stack.hurtAndBreak(1, player, p -> p.broadcastBreakEvent(event.getHand()));
            tell(player, "动能聚焦指环已校准：短时间提升近战、枪械和投掷伤害。");
            sendHudState(player);
            return;
        }

        if (stack.is(ModItems.CHRONO_TUNING_CHIP.get()) && event.getEntity() instanceof ServerPlayer player) {
            event.setCancellationResult(InteractionResult.SUCCESS);
            event.setCanceled(true);
            int tempSpeed = Math.max(3, Math.min(MAX_PRESET_TIER, getEffectiveSpeedTier(player) + 1));
            setTemporaryPowers(player, POWER_SPEED, 20 * 120, 0, 0, tempSpeed);
            setSpeedCharge(player, speedChargeTarget(tempSpeed));
            setChronoTicks(player, Math.max(getChronoTicks(player), 20 * 10));
            setEnergy(player, Math.min(MAX_ENERGY, getEnergy(player) + 35));
            stack.hurtAndBreak(1, player, p -> p.broadcastBreakEvent(event.getHand()));
            tell(player, "时间调谐芯片已启动：临时极速与时缓阈值已就绪。");
            sendHudState(player);
            return;
        }

        if (stack.is(ModItems.NOIR_CLIMBING_GLOVES.get()) && event.getEntity() instanceof ServerPlayer player) {
            event.setCancellationResult(InteractionResult.SUCCESS);
            event.setCanceled(true);
            setPowerMask(player, getPowerMask(player) | POWER_WALL_CRAWL | POWER_NOIR);
            setWallCrawlTicks(player, 20 * 120);
            setNoirTicks(player, 20 * 30);
            stack.hurtAndBreak(1, player, p -> p.broadcastBreakEvent(event.getHand()));
            tell(player, "玄色攀爬手套已校准，贴墙前进即可上爬。");
            sendHudState(player);
            return;
        }

        if (stack.is(ModItems.HEAT_VISION_FOCUS.get()) && event.getEntity() instanceof ServerPlayer serverPlayer) {
            event.setCancellationResult(InteractionResult.SUCCESS);
            event.setCanceled(true);
            triggerAbility(serverPlayer, "heat_vision");
            stack.hurtAndBreak(1, serverPlayer, p -> p.broadcastBreakEvent(event.getHand()));
        }
    }

    @SubscribeEvent
    public static void onUseFinish(LivingEntityUseItemEvent.Finish event) {
        if (!(event.getEntity() instanceof ServerPlayer player)) {
            return;
        }
        ItemStack stack = event.getItem();
        if (stack.is(ModItems.COMPOUND_V_SERUM.get()) || PotionUtils.getPotion(stack) == ModPotions.COMPOUND_V_POTION.get()) {
            applySerumRoll(player, false);
        } else if (stack.is(ModItems.UNSTABLE_V_SERUM.get()) || PotionUtils.getPotion(stack) == ModPotions.UNSTABLE_V_POTION.get()) {
            applySerumRoll(player, true);
        } else if (stack.is(ModItems.VOUGHT_MILK.get()) || stack.is(Items.MILK_BUCKET)) {
            refuel(player, 35, "牛奶/能量补给已注入。");
        } else if (stack.is(ModItems.STARLIGHT_CHARGE.get())) {
            refuel(player, 20, "星光能量块已补充。");
        } else if (stack.is(ModItems.INVISIBLE_SKIN_SAMPLE.get())) {
            grantInvisibleSkinPattern(player, false);
            tell(player, "透明人碳素皮肤已融合：常驻隐形，高防御，惧怕爆炸与魔法。");
        } else if (stack.is(ModItems.A_TRAIN_BOOSTER.get())) {
            setEnergy(player, Math.min(MAX_ENERGY, getEnergy(player) + 45));
            setPowerMask(player, getPowerMask(player) | POWER_SPEED);
            int boostedSpeed = Math.max(getSpeedTier(player), 4);
            setSpeedTier(player, boostedSpeed);
            setTierCap(player, SPEED_CAP_KEY, Math.max(getTierCap(player, SPEED_CAP_KEY, boostedSpeed), Math.min(SURVIVAL_SOFT_CAP_TIER, boostedSpeed + 1)));
            awardTierGrowth(player, SPEED_TIER_KEY, SPEED_CAP_KEY, SPEED_XP_KEY, 30);
            setChronoTicks(player, 20 * 8);
            tell(player, "A-Train 强化剂已注入，极速蓄能被推高。");
        } else if (stack.is(ModItems.SOLDIER_BOY_CHARGE_CELL.get())) {
            setEnergy(player, Math.min(MAX_ENERGY, getEnergy(player) + 55));
            setPowerMask(player, getPowerMask(player) | POWER_PURGE | POWER_SELF_EXPLODE);
            setSurgeTicks(player, 20 * 20);
            tell(player, "士兵男孩反超能电芯已接入。");
        } else if (stack.is(ModItems.STARLIGHT_AMPLIFIER.get())) {
            setEnergy(player, Math.min(MAX_ENERGY, getEnergy(player) + 70));
            setPowerMask(player, getPowerMask(player) | POWER_STARLIGHT);
            setSurgeTicks(player, 20 * 12);
            tell(player, "星光放大器已过载充能。");
        } else if (stack.is(ModItems.ANOMALY_V_SERUM.get())) {
            applyAnomalyRoll(player);
        } else if (stack.is(ModItems.TEMP_V24_SERUM.get())) {
            setEnergy(player, Math.min(MAX_ENERGY, getEnergy(player) + 80));
            setSurgeTicks(player, 20 * 60);
            setRegenTicks(player, 20 * 30);
            tell(player, "24 号临时 V 已生效：短时间强化能量、力量与恢复。");
        } else if (stack.is(ModItems.TRIAL_CARD_HEAT.get())) {
            applyTrialCard(player, POWER_HEAT, 20 * 180, 2, 0, 0, "热视线体验卡已激活：Alt+1 可进入长效灼射。");
        } else if (stack.is(ModItems.TRIAL_CARD_FLIGHT.get())) {
            applyTrialCard(player, POWER_FLIGHT, 20 * 240, 0, 1, 0, "飞行体验卡已激活：临时空中机动已解锁。");
        } else if (stack.is(ModItems.TRIAL_CARD_SPEED.get())) {
            applyTrialCard(player, POWER_SPEED, 20 * 180, 0, 0, 4, "极速体验卡已激活：冲刺蓄满后可进入时缓。");
        } else if (stack.is(ModItems.TRIAL_CARD_STARLIGHT.get())) {
            applyTrialCard(player, POWER_STARLIGHT | POWER_REGEN, 20 * 210, 1, 3, 1, "星光体验卡已激活：能量、护盾与恢复短时增强。");
            setSurgeTicks(player, Math.max(getSurgeTicks(player), 20 * 14));
        } else if (stack.is(ModItems.TRIAL_CARD_NOIR.get())) {
            applyTrialCard(player, POWER_NOIR | POWER_WALL_CRAWL | POWER_INVISIBLE_SKIN, 20 * 210, 1, 4, 2, "玄色体验卡已激活：隐形、潜行与爬墙短时开放。");
            setNoirTicks(player, Math.max(getNoirTicks(player), 20 * 90));
            setWallCrawlTicks(player, Math.max(getWallCrawlTicks(player), 20 * 90));
        } else if (stack.is(ModItems.TRIAL_CARD_RANDOM.get())) {
            applyRandomTrialCard(player);
        } else if (stack.is(ModItems.V_TRAINING_MANUAL.get())) {
            ensureCreativeAwakened(player);
            setPowerMask(player, getPowerMask(player) | POWER_STRENGTH | POWER_RESIST);
            setTierCap(player, STRENGTH_CAP_KEY, Math.max(getTierCap(player, STRENGTH_CAP_KEY, getStrengthTier(player)), SURVIVAL_SOFT_CAP_TIER));
            setTierCap(player, BODY_CAP_KEY, Math.max(getTierCap(player, BODY_CAP_KEY, getBodyTier(player)), SURVIVAL_SOFT_CAP_TIER));
            setTierCap(player, SPEED_CAP_KEY, Math.max(getTierCap(player, SPEED_CAP_KEY, getSpeedTier(player)), Math.max(1, getSpeedTier(player))));
            awardTierGrowth(player, STRENGTH_TIER_KEY, STRENGTH_CAP_KEY, STRENGTH_XP_KEY, 85);
            awardTierGrowth(player, BODY_TIER_KEY, BODY_CAP_KEY, BODY_XP_KEY, 85);
            awardTierGrowth(player, SPEED_TIER_KEY, SPEED_CAP_KEY, SPEED_XP_KEY, 65);
            grantTraitBundle(player, 2, 70);
            tell(player, "沃特训练手册已研读：三项档位成长与基础 V 特质获得训练进度。");
        } else if (stack.is(ModItems.V_AMPLIFIER_CORE.get())) {
            setEnergy(player, MAX_ENERGY);
            setSurgeTicks(player, Math.max(getSurgeTicks(player), 20 * 45));
            setHeatCooldown(player, Math.max(0, getHeatCooldown(player) - 80));
            setSpecialCooldown(player, Math.max(0, getSpecialCooldown(player) - 100));
            grantTraitBundle(player, 3, 90);
            tell(player, "V 放大核心已接入：能量填满、冷却降低，并注入额外 V 特质。");
        } else if (stack.is(ModItems.REGENERATION_BOOSTER.get())) {
            setTemporaryPowers(player, POWER_REGEN | POWER_RESIST, 20 * 180, 0, 2, 0);
            setRegenTicks(player, Math.max(getRegenTicks(player), 20 * 150));
            setEnergy(player, Math.min(MAX_ENERGY, getEnergy(player) + 45));
            awardTierGrowth(player, BODY_TIER_KEY, BODY_CAP_KEY, BODY_XP_KEY, 100);
            grantTraitRange(player, 40, 50, "代谢修复");
            tell(player, "超速再生针剂已生效：恢复、抗性和代谢类特质获得强化。");
        } else if (stack.is(ModItems.V_STABILIZER_PATCH.get())) {
            setEnergy(player, Math.min(MAX_ENERGY, getEnergy(player) + 50));
            setHeatCooldown(player, Math.max(0, getHeatCooldown(player) - 40));
            setSpecialCooldown(player, Math.max(0, getSpecialCooldown(player) - 60));
            player.removeEffect(MobEffects.WEAKNESS);
            player.removeEffect(MobEffects.MOVEMENT_SLOWDOWN);
            player.removeEffect(MobEffects.CONFUSION);
            player.removeEffect(MobEffects.DARKNESS);
            tell(player, "V 稳定贴片已生效：恢复能量并解除大部分压制。");
        }
    }

    @SubscribeEvent
    public static void onPlayerClone(PlayerEvent.Clone event) {
        if (!(event.getOriginal() instanceof ServerPlayer original) || !(event.getEntity() instanceof ServerPlayer clone)) {
            return;
        }
        cloneState(original, clone);
    }

    @SubscribeEvent
    public static void onPlayerTick(TickEvent.PlayerTickEvent event) {
        if (event.phase != TickEvent.Phase.END) {
            return;
        }
        if (!(event.player instanceof ServerPlayer player)) {
            return;
        }

        tickTimers(player);
        enforceSpeedLimit(player, false);

        boolean suit = hasFullSuit(player);
        int form = getForm(player);
        int powerMask = getEffectivePowerMask(player);
        int speedTier = getEffectiveSpeedTier(player);
        boolean power = suit || form != FORM_NONE || powerMask != 0 || extraTraitCount(player) > 0;
        boolean boss = hasPower(powerMask, POWER_BOSS) || form >= FORM_PRIME;
        boolean flightAllowed = hasFlightAbility(player, suit, powerMask);

        updateSpeedState(player, speedTier, powerMask);

        int energy = getEnergy(player);
        int cooldown = getHeatCooldown(player);
        int regen = boss ? 3 : form == FORM_ELITE ? 2 : power ? 1 : 0;
        regen += extraTraitEnergyRegen(player);

        if (cooldown > 0) {
            setHeatCooldown(player, cooldown - 1);
        }

        if (flightAllowed) {
            if (energy > 0) {
                player.getAbilities().mayfly = true;
            } else if (!player.getAbilities().instabuild) {
                player.getAbilities().mayfly = false;
                player.getAbilities().flying = false;
            }
        } else if (!player.getAbilities().instabuild) {
            player.getAbilities().mayfly = false;
            player.getAbilities().flying = false;
        }

        if (player.getAbilities().flying && flightAllowed && !player.getAbilities().instabuild && !player.isCreative() && !player.isSpectator()) {
            if (player.tickCount % 2 == 0) {
                setEnergy(player, Math.max(0, energy - 1));
            }
        } else if (regen > 0 && player.tickCount % 20 == 0) {
            setEnergy(player, Math.min(MAX_ENERGY, energy + regen));
            if (player.getHealth() < player.getMaxHealth()) {
                player.heal(boss ? 2.0f : form == FORM_ELITE ? 1.0f : 0.5f);
            }
        }

        syncPowerAttributes(player, suit, form, powerMask, speedTier);

        if (power) {
            applyHeroState(player, suit, form, powerMask, speedTier);
            applyPassiveAbilityTicks(player, form, powerMask, speedTier);
            applyGrowthProgress(player, suit, form, powerMask, speedTier);
            enforceSpeedLimit(player, false);
        } else if (player.getAbsorptionAmount() > 0.0f) {
            player.setAbsorptionAmount(0.0f);
            if (player.isInvisible()) {
                player.setInvisible(false);
            }
        }

        if (player.tickCount % 20 == 0) {
            player.onUpdateAbilities();
        }

        if (player.tickCount % 5 == 0) {
            sendHudState(player);
        }
    }

    @SubscribeEvent
    public static void onFall(LivingFallEvent event) {
        if (!(event.getEntity() instanceof Player player)) {
            return;
        }
        if (!hasHeroState(player)) {
            return;
        }
        event.setCanceled(true);
        event.setDistance(0.0f);
    }

    @SubscribeEvent
    public static void onHurt(LivingHurtEvent event) {
        if (event.getEntity() instanceof Player player && hasHeroState(player)) {
            int form = getForm(player);
            int powerMask = getEffectivePowerMask(player);
            boolean boss = hasPower(powerMask, POWER_BOSS) || form >= FORM_PRIME;
            int bodyTier = player instanceof ServerPlayer serverPlayer
                ? effectiveBodyTier(serverPlayer, hasFullSuit(player), form, powerMask)
                : getBodyTier(player);
            if (hasPower(powerMask, POWER_INVISIBLE_SKIN) && isInvisibleSkinWeaknessDamage(event)) {
                event.setAmount(event.getAmount() * 1.65f + 3.0f);
            } else {
                float scale = boss ? 0.06f : bodyDamageScale(bodyTier);
                if (hasPower(powerMask, POWER_RESIST)) {
                    scale *= 0.8f;
                }
                if (hasPower(powerMask, POWER_INVISIBLE_SKIN)) {
                    scale *= 0.75f;
                }
                if (hasPower(powerMask, POWER_REGEN) || getRegenTicks(player) > 0) {
                    scale *= 0.92f;
                }
                event.setAmount(Math.max(bodyTier >= 4 ? 0.5f : 1.0f, event.getAmount() * scale));
            }
            if (player instanceof ServerPlayer victim) {
                float traitScale = extraTraitDamageScale(victim, event);
                if (traitScale < 1.0f) {
                    event.setAmount(Math.max(0.15f, event.getAmount() * traitScale));
                }
                if (event.getSource().getEntity() instanceof VoughtHunterEntity) {
                    event.setAmount(event.getAmount() + 4.0f);
                    applyPowerSuppression(victim, 20 * 6, 24, false);
                } else if (event.getSource().getEntity() instanceof VOverdoseMutantEntity) {
                    event.setAmount(event.getAmount() + 6.0f);
                    applyPowerSuppression(victim, 20 * 4, 12, false);
                    victim.addEffect(new MobEffectInstance(MobEffects.POISON, 80, 0, false, true, true));
                }
                int bodyAmount = Math.max(1, Math.round(event.getAmount() * 2.0f));
                awardTierGrowth(victim, BODY_TIER_KEY, BODY_CAP_KEY, BODY_XP_KEY, bodyAmount);
            }
        }

        if (event.getSource().getEntity() instanceof ServerPlayer attacker) {
            applyCounterVWeaponEffect(event, attacker, attacker.getMainHandItem());
            boostSpeedImpact(event, attacker);
            boostWeaponDamage(event, attacker);
            boostExtraTraitDamage(event, attacker);
            int powerMask = getEffectivePowerMask(attacker);
            int form = getForm(attacker);
            if (hasPower(powerMask, POWER_STRENGTH) || hasPower(powerMask, POWER_WEAPON_BOOST) || hasPower(powerMask, POWER_BOSS) || form >= FORM_ELITE) {
                int strengthAmount = Math.max(1, Math.round(event.getAmount()));
                if (isGun(attacker.getMainHandItem())) {
                    strengthAmount++;
                }
                awardTierGrowth(attacker, STRENGTH_TIER_KEY, STRENGTH_CAP_KEY, STRENGTH_XP_KEY, strengthAmount);
            }
            if ((hasPower(powerMask, POWER_SPEED) || getSpeedTier(attacker) > 0) && attacker.isSprinting()) {
                awardTierGrowth(attacker, SPEED_TIER_KEY, SPEED_CAP_KEY, SPEED_XP_KEY, 1 + Math.max(0, getSpeedTier(attacker) / 3));
            }
        }
    }

    private static boolean isGun(ItemStack stack) {
        return stack.is(ModItems.VOUGHT_PISTOL.get())
            || stack.is(ModItems.VOUGHT_RIFLE.get())
            || stack.is(ModItems.VOUGHT_SHOTGUN.get())
            || stack.is(ModItems.SUPPRESSOR_RIFLE.get());
    }

    private static boolean isInvisibleSkinWeaknessDamage(LivingHurtEvent event) {
        return event.getSource().is(DamageTypes.EXPLOSION)
            || event.getSource().is(DamageTypes.PLAYER_EXPLOSION)
            || event.getSource().is(DamageTypes.MAGIC)
            || event.getSource().is(DamageTypes.INDIRECT_MAGIC);
    }

    private static void fireGun(ServerPlayer player, ItemStack stack) {
        GunProfile profile = gunProfile(stack);
        if (profile == null) {
            return;
        }
        player.getCooldowns().addCooldown(stack.getItem(), profile.cooldownTicks);
        ServerLevel level = player.serverLevel();
        Vec3 eye = player.getEyePosition();
        Vec3 look = player.getLookAngle().normalize();

        for (int pellet = 0; pellet < profile.pellets; pellet++) {
            Vec3 shot = spreadDirection(look, profile.spread);
            for (int i = 1; i <= profile.range * 2; i++) {
                Vec3 point = eye.add(shot.scale(i * 0.5));
                level.sendParticles(ParticleTypes.CRIT, point.x, point.y, point.z, 1, 0.01, 0.01, 0.01, 0.0);
                level.sendParticles(ParticleTypes.SMOKE, point.x, point.y, point.z, 1, 0.01, 0.01, 0.01, 0.0);
            }
            LivingEntity target = findBeamTarget(player, shot, profile.range, 0.88);
            if (target != null) {
                target.hurt(player.damageSources().playerAttack(player), profile.damage + (float) weaponDamageBonus(player));
                if (stack.is(ModItems.SUPPRESSOR_RIFLE.get()) && target instanceof ServerPlayer victim) {
                    applyPowerSuppression(victim, 20 * 4, 18, false);
                }
            }
        }

        level.playSound(null, player.blockPosition(), profile.sound, SoundSource.PLAYERS, 1.0f, 0.95f + RANDOM.nextFloat() * 0.1f);
        stack.hurtAndBreak(1, player, p -> p.broadcastBreakEvent(net.minecraft.world.InteractionHand.MAIN_HAND));
    }

    private static GunProfile gunProfile(ItemStack stack) {
        if (stack.is(ModItems.VOUGHT_PISTOL.get())) {
            return new GunProfile(24.0, 7.0f, 1, 0.015, 8, SoundEvents.ARROW_SHOOT);
        }
        if (stack.is(ModItems.VOUGHT_RIFLE.get())) {
            return new GunProfile(36.0, 5.5f, 1, 0.01, 4, SoundEvents.ARROW_SHOOT);
        }
        if (stack.is(ModItems.VOUGHT_SHOTGUN.get())) {
            return new GunProfile(16.0, 3.0f, 6, 0.08, 18, SoundEvents.CROSSBOW_SHOOT);
        }
        if (stack.is(ModItems.SUPPRESSOR_RIFLE.get())) {
            return new GunProfile(34.0, 4.5f, 1, 0.012, 6, SoundEvents.CROSSBOW_SHOOT);
        }
        return null;
    }

    private static Vec3 spreadDirection(Vec3 look, double spread) {
        double dx = (RANDOM.nextDouble() - 0.5) * spread;
        double dy = (RANDOM.nextDouble() - 0.5) * spread;
        double dz = (RANDOM.nextDouble() - 0.5) * spread;
        return new Vec3(look.x + dx, look.y + dy, look.z + dz).normalize();
    }

    private static void triggerNullFieldGrenade(ServerPlayer player, ItemStack stack) {
        if (player.getCooldowns().isOnCooldown(stack.getItem())) {
            return;
        }
        player.getCooldowns().addCooldown(stack.getItem(), 60);
        ServerLevel level = player.serverLevel();
        Vec3 center = player.getEyePosition().add(player.getLookAngle().normalize().scale(3.0));
        level.playSound(null, player.blockPosition(), SoundEvents.GENERIC_EXPLODE, SoundSource.PLAYERS, 0.85f, 1.45f);
        level.sendParticles(ParticleTypes.ELECTRIC_SPARK, center.x, center.y, center.z, 80, 4.2, 2.2, 4.2, 0.08);
        level.sendParticles(ParticleTypes.SMOKE, center.x, center.y, center.z, 36, 3.6, 1.5, 3.6, 0.02);
        for (LivingEntity entity : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(7.0))) {
            if (entity == player || !entity.isAlive()) {
                continue;
            }
            float damage = entity instanceof Player ? 7.0f : 10.0f;
            entity.hurt(player.damageSources().magic(), damage);
            entity.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 20 * 6, 2, false, true, true));
            entity.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 20 * 6, 1, false, true, true));
            if (entity instanceof ServerPlayer victim) {
                applyPowerSuppression(victim, 20 * 8, 38, true);
            }
        }
        if (!player.getAbilities().instabuild) {
            stack.shrink(1);
        }
        tell(player, "反 V 零场已爆开：范围内超能力被短暂压制。");
        sendHudState(player);
    }

    private static void scanPoweredTargets(ServerPlayer player, ItemStack stack) {
        if (player.getCooldowns().isOnCooldown(stack.getItem())) {
            return;
        }
        player.getCooldowns().addCooldown(stack.getItem(), 45);
        ServerLevel level = player.serverLevel();
        int found = 0;
        for (LivingEntity entity : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(42.0))) {
            if (entity == player || !entity.isAlive()) {
                continue;
            }
            boolean poweredPlayer = entity instanceof Player targetPlayer && hasHeroState(targetPlayer);
            boolean vThreat = entity instanceof VOverdoseMutantEntity || entity instanceof VoughtHunterEntity;
            if (!poweredPlayer && !vThreat) {
                continue;
            }
            found++;
            entity.addEffect(new MobEffectInstance(MobEffects.GLOWING, 20 * 8, 0, false, false, true));
            level.sendParticles(ParticleTypes.ELECTRIC_SPARK, entity.getX(), entity.getY() + 1.0, entity.getZ(), 8, 0.35, 0.5, 0.35, 0.02);
        }
        stack.hurtAndBreak(1, player, p -> p.broadcastBreakEvent(net.minecraft.world.InteractionHand.MAIN_HAND));
        tell(player, found == 0 ? "扫描完成：附近没有明显 V 能量目标。" : "扫描完成：已标记 " + found + " 个 V 能量目标。");
    }

    private static void deployHunterBeacon(ServerPlayer player, ItemStack stack) {
        if (player.getCooldowns().isOnCooldown(stack.getItem())) {
            return;
        }
        player.getCooldowns().addCooldown(stack.getItem(), 80);
        ServerLevel level = player.serverLevel();
        Vec3 base = player.position().add(player.getLookAngle().normalize().scale(4.0));
        VoughtHunterEntity hunter = ModEntities.VOUGHT_HUNTER.get().create(level);
        if (hunter != null) {
            hunter.moveTo(base.x, player.getY(), base.z, player.getYRot(), 0.0f);
            hunter.finalizeSpawn(level, level.getCurrentDifficultyAt(hunter.blockPosition()), net.minecraft.world.entity.MobSpawnType.MOB_SUMMONED, null, null);
            level.addFreshEntity(hunter);
        }
        if (RANDOM.nextInt(100) < 35) {
            VOverdoseMutantEntity mutant = ModEntities.V_OVERDOSE_MUTANT.get().create(level);
            if (mutant != null) {
                Vec3 offset = base.add(1.8, 0.0, 1.8);
                mutant.moveTo(offset.x, player.getY(), offset.z, player.getYRot(), 0.0f);
                mutant.finalizeSpawn(level, level.getCurrentDifficultyAt(mutant.blockPosition()), net.minecraft.world.entity.MobSpawnType.MOB_SUMMONED, null, null);
                level.addFreshEntity(mutant);
            }
        }
        level.playSound(null, player.blockPosition(), SoundEvents.BEACON_ACTIVATE, SoundSource.PLAYERS, 1.0f, 1.1f);
        level.sendParticles(ParticleTypes.END_ROD, base.x, player.getY() + 1.0, base.z, 40, 0.6, 0.8, 0.6, 0.04);
        if (!player.getAbilities().instabuild) {
            stack.shrink(1);
        }
        tell(player, "沃特猎杀信标已投放：反超能力小队正在入场。");
    }

    private static void applyCounterVWeaponEffect(LivingHurtEvent event, ServerPlayer attacker, ItemStack held) {
        if (!isCounterVWeapon(held) || !(event.getEntity() instanceof ServerPlayer victim) || !hasHeroState(victim)) {
            return;
        }
        boolean hard = held.is(ModItems.COUNTER_V_BATON.get());
        int drain = held.is(ModItems.SUPPRESSOR_RIFLE.get()) ? 22 : hard ? 30 : 16;
        applyPowerSuppression(victim, hard ? 20 * 7 : 20 * 4, drain, hard);
        event.setAmount(event.getAmount() + (hard ? 8.0f : 4.0f));
        if (held.isDamageableItem()) {
            held.hurtAndBreak(1, attacker, p -> p.broadcastBreakEvent(net.minecraft.world.InteractionHand.MAIN_HAND));
        }
    }

    private static boolean isCounterVWeapon(ItemStack stack) {
        return stack.is(ModItems.COUNTER_V_BATON.get())
            || stack.is(ModItems.SUPPRESSOR_RIFLE.get())
            || stack.is(ModItems.NULL_FIELD_GRENADE.get());
    }

    private static void applyPowerSuppression(ServerPlayer victim, int duration, int energyDrain, boolean hard) {
        setEnergy(victim, Math.max(0, getEnergy(victim) - energyDrain));
        setHeatTicks(victim, 0);
        setChronoTicks(victim, 0);
        setSurgeTicks(victim, Math.max(0, getSurgeTicks(victim) / 2));
        setHeatCooldown(victim, Math.max(getHeatCooldown(victim), hard ? 80 : 40));
        setSpecialCooldown(victim, Math.max(getSpecialCooldown(victim), hard ? 90 : 50));
        if (!victim.getAbilities().instabuild) {
            victim.getAbilities().flying = false;
            victim.onUpdateAbilities();
        }
        victim.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, duration, hard ? 2 : 1, false, true, true));
        victim.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, duration, hard ? 2 : 1, false, true, true));
        victim.addEffect(new MobEffectInstance(MobEffects.DARKNESS, Math.min(duration, 20 * 4), 0, false, true, true));
        victim.serverLevel().sendParticles(ParticleTypes.ELECTRIC_SPARK, victim.getX(), victim.getY() + 1.0, victim.getZ(), hard ? 24 : 12, 0.45, 0.65, 0.45, 0.04);
        sendHudState(victim);
    }

    private static void applySerumRoll(ServerPlayer player, boolean unstable) {
        int roll = RANDOM.nextInt(100);
        setRoll(player, roll);
        if (!unstable && roll < 3) {
            grantHomelanderPattern(player, false);
            grantTraitBundle(player, 8, 100);
            tell(player, "V 血清极限觉醒：祖国人模板。");
            return;
        }
        if (roll < (unstable ? 2 : 7)) {
            grantSoldierBoyPattern(player, false);
            grantTraitBundle(player, 7, 92);
            tell(player, "V 血清高危觉醒：士兵男孩模板。");
            return;
        }
        if (roll < (unstable ? 5 : 12)) {
            grantStarlightPattern(player, false);
            grantTraitBundle(player, 6, 84);
            tell(player, "V 血清稀有觉醒：星光模板。");
            return;
        }
        if (roll < (unstable ? 9 : 17)) {
            grantATrainPattern(player, false);
            grantTraitBundle(player, 6, 84);
            tell(player, "V 血清稀有觉醒：极速者模板。");
            return;
        }
        if (roll < (unstable ? 13 : 22)) {
            grantSpecialistPattern(player, false);
            grantTraitBundle(player, 5, unstable ? 80 : 68);
            tell(player, "V 血清变异觉醒：强化体质并附带一项高阶特色能力。");
            return;
        }

        grantCoreRoll(player, unstable, false);
        grantTraitBundle(player, unstable ? 4 : 3, unstable ? 74 : 55);
        tell(player, "V 血清完成抽取：超级力量与钢铁之躯为核心，附带一项特色能力。");
    }

    private static void grantHomelanderPattern(ServerPlayer player) {
        grantHomelanderPattern(player, true);
    }

    private static void grantHomelanderPattern(ServerPlayer player, boolean mature) {
        setEnergy(player, MAX_ENERGY);
        setForm(player, FORM_PRIME, PERMANENT_FORM_TICKS);
        setStrengthTier(player, 5);
        setBodyTier(player, 5);
        setArchetype(player, ARCHETYPE_HOMELANDER);
        setSpeedTier(player, 4);
        setPowerMask(player, POWER_FLIGHT | POWER_HEAT | POWER_STRENGTH | POWER_SPEED | POWER_RESIST | POWER_BOSS
            | POWER_REGEN | POWER_PURGE);
        setSurgeTicks(player, 20 * 20);
        setRegenTicks(player, 20 * 40);
        setWeaponBoostTicks(player, 20 * 30);
        initializeTierProfile(player, mature, 6, 6, 6);
    }

    private static void grantSoldierBoyPattern(ServerPlayer player) {
        grantSoldierBoyPattern(player, true);
    }

    private static void grantSoldierBoyPattern(ServerPlayer player, boolean mature) {
        setEnergy(player, 90);
        setForm(player, FORM_PRIME, PERMANENT_FORM_TICKS);
        setStrengthTier(player, 5);
        setBodyTier(player, 5);
        setArchetype(player, ARCHETYPE_SOLDIER_BOY);
        setSpeedTier(player, 1);
        setPowerMask(player, POWER_STRENGTH | POWER_RESIST | POWER_PURGE | POWER_REGEN | POWER_SELF_EXPLODE | POWER_WEAPON_BOOST);
        setSurgeTicks(player, 20 * 12);
        setWeaponBoostTicks(player, 20 * 45);
        initializeTierProfile(player, mature, 6, 6, 2);
    }

    private static void grantStarlightPattern(ServerPlayer player) {
        grantStarlightPattern(player, true);
    }

    private static void grantStarlightPattern(ServerPlayer player, boolean mature) {
        setEnergy(player, 160);
        setForm(player, FORM_ELITE, PERMANENT_FORM_TICKS);
        setStrengthTier(player, 3);
        setBodyTier(player, 4);
        setArchetype(player, ARCHETYPE_STARLIGHT);
        setSpeedTier(player, 2);
        setPowerMask(player, POWER_STRENGTH | POWER_RESIST | POWER_STARLIGHT | POWER_FLIGHT | POWER_REGEN);
        setSurgeTicks(player, 20 * 10);
        initializeTierProfile(player, mature, 6, 6, 6);
    }

    private static void grantATrainPattern(ServerPlayer player) {
        grantATrainPattern(player, true);
    }

    private static void grantATrainPattern(ServerPlayer player, boolean mature) {
        setEnergy(player, 145);
        setForm(player, FORM_ELITE, PERMANENT_FORM_TICKS);
        setStrengthTier(player, 2);
        setBodyTier(player, 2);
        setArchetype(player, ARCHETYPE_A_TRAIN);
        setSpeedTier(player, 5);
        setPowerMask(player, POWER_STRENGTH | POWER_RESIST | POWER_SPEED);
        setChronoTicks(player, 20 * 4);
        initializeTierProfile(player, mature, 6, 6, 6);
    }

    private static void grantInvisibleSkinPattern(ServerPlayer player) {
        grantInvisibleSkinPattern(player, true);
    }

    private static void grantInvisibleSkinPattern(ServerPlayer player, boolean mature) {
        setEnergy(player, Math.max(getEnergy(player), 120));
        setForm(player, FORM_ELITE, PERMANENT_FORM_TICKS);
        if (getStrengthTier(player) <= 0) {
            setStrengthTier(player, 2);
        }
        setBodyTier(player, Math.max(4, getBodyTier(player)));
        setArchetype(player, ARCHETYPE_TRANSLUCENT);
        setPowerMask(player, getPowerMask(player) | POWER_RESIST | POWER_INVISIBLE_SKIN);
        player.setInvisible(true);
        initializeTierProfile(player, mature, 4, 6, 1);
    }

    private static void grantSpecialistPattern(ServerPlayer player) {
        grantSpecialistPattern(player, true);
    }

    private static void grantSpecialistPattern(ServerPlayer player, boolean mature) {
        int archetype = switch (RANDOM.nextInt(6)) {
            case 0 -> ARCHETYPE_NOIR;
            case 1 -> ARCHETYPE_FIRESTARTER;
            case 2 -> ARCHETYPE_TELEPORTER;
            case 3 -> ARCHETYPE_BLOOD;
            case 4 -> ARCHETYPE_TRANSLUCENT;
            default -> ARCHETYPE_DEEP_SEA;
        };
        int strengthTier = 3 + RANDOM.nextInt(2);
        int bodyTier = 3 + RANDOM.nextInt(2);
        grantCorePackage(player, archetype, strengthTier, bodyTier, 80, PERMANENT_FORM_TICKS, FORM_ELITE, 2, signatureAbilityFor(archetype), mature);
        if (RANDOM.nextBoolean()) {
            setPowerMask(player, getPowerMask(player) | POWER_WEAPON_BOOST);
        }
        if (RANDOM.nextInt(100) < 30) {
            setPowerMask(player, getPowerMask(player) | POWER_WALL_CRAWL);
        }
    }

    private static void applyAnomalyRoll(ServerPlayer player) {
        int roll = RANDOM.nextInt(100);
        if (roll >= 88) {
            grantPhasePattern(player, false);
            grantTraitBundle(player, 3, 98);
            tell(player, "V 异常血清触发：相位回声分支。");
            return;
        }
        if (roll < 45) {
            grantGravityPattern(player, false);
            grantTraitBundle(player, 3, 90);
            tell(player, "V 异常血清触发：重力分支。");
            return;
        }
        if (roll < 80) {
            grantSonicPattern(player, false);
            grantTraitBundle(player, 3, 82);
            tell(player, "V 异常血清触发：音爆分支。");
            return;
        }
        grantGlitchPattern(player, false);
        grantTraitBundle(player, 4, 100);
        tell(player, "V 异常血清触发：异常扰动分支。");
    }

    private static void grantGravityPattern(ServerPlayer player, boolean mature) {
        setEnergy(player, 115);
        setForm(player, FORM_ELITE, PERMANENT_FORM_TICKS);
        setStrengthTier(player, 2);
        setBodyTier(player, 3);
        setArchetype(player, ARCHETYPE_CORE);
        setSpeedTier(player, 1);
        setPowerMask(player, POWER_RESIST | POWER_GRAVITY | POWER_WEAPON_BOOST);
        initializeTierProfile(player, mature, 6, 6, 4);
    }

    private static void grantSonicPattern(ServerPlayer player, boolean mature) {
        setEnergy(player, 120);
        setForm(player, FORM_ELITE, PERMANENT_FORM_TICKS);
        setStrengthTier(player, 3);
        setBodyTier(player, 2);
        setArchetype(player, ARCHETYPE_CORE);
        setSpeedTier(player, 2);
        setPowerMask(player, POWER_STRENGTH | POWER_RESIST | POWER_SONIC);
        initializeTierProfile(player, mature, 6, 6, 4);
    }

    private static void grantGlitchPattern(ServerPlayer player, boolean mature) {
        setEnergy(player, 95);
        setForm(player, FORM_MIXED, PERMANENT_FORM_TICKS);
        setStrengthTier(player, 1);
        setBodyTier(player, 2);
        setArchetype(player, ARCHETYPE_LOW_GRADE);
        setSpeedTier(player, 1);
        setPowerMask(player, POWER_RESIST | POWER_GLITCH | POWER_WALL_CRAWL);
        initializeTierProfile(player, mature, 5, 6, 4);
    }

    private static void grantPhasePattern(ServerPlayer player, boolean mature) {
        setEnergy(player, 110);
        setForm(player, FORM_ELITE, PERMANENT_FORM_TICKS);
        setStrengthTier(player, 2);
        setBodyTier(player, 3);
        setArchetype(player, ARCHETYPE_CORE);
        setSpeedTier(player, 2);
        setPowerMask(player, POWER_RESIST | POWER_TELEPORT | POWER_PHASE);
        initializeTierProfile(player, mature, 5, 6, 5);
    }

    private static void grantCoreRoll(ServerPlayer player, boolean unstable) {
        grantCoreRoll(player, unstable, false);
    }

    private static void grantCoreRoll(ServerPlayer player, boolean unstable, boolean mature) {
        int strengthTier = rollPhysicalTier(unstable);
        int bodyTier = rollPhysicalTier(unstable);
        int bestTier = Math.max(strengthTier, bodyTier);
        int form = bestTier >= 4 ? FORM_ELITE : FORM_MIXED;
        int energy = 42 + bestTier * 10 + RANDOM.nextInt(16);
        int signature = drawSignatureAbility(bestTier, unstable);
        int archetype = archetypeForSignature(signature);
        int speedTier = signature == POWER_SPEED ? rollSpeedTier(Math.min(6, Math.max(1, bestTier + 1))) : 0;
        if (signature == POWER_FLIGHT && bestTier >= 4 && RANDOM.nextInt(100) < 30) {
            speedTier = 1;
        }
        grantCorePackage(player, archetype, strengthTier, bodyTier, energy, PERMANENT_FORM_TICKS, form, speedTier, signature, mature);
        if (bestTier >= 3 && RANDOM.nextInt(100) < 35) {
            setPowerMask(player, getPowerMask(player) | POWER_WEAPON_BOOST);
        }
        if (bestTier >= 4 && RANDOM.nextInt(100) < 18) {
            setPowerMask(player, getPowerMask(player) | POWER_WALL_CRAWL);
        }
        if (bestTier >= 4 && RANDOM.nextInt(100) < 12) {
            setPowerMask(player, getPowerMask(player) | POWER_SELF_EXPLODE);
        }
        if (unstable && RANDOM.nextInt(100) < 28) {
            switch (RANDOM.nextInt(4)) {
                case 0 -> add(player, MobEffects.MOVEMENT_SLOWDOWN, 20 * 8);
                case 1 -> add(player, MobEffects.WEAKNESS, 20 * 8);
                case 2 -> add(player, MobEffects.CONFUSION, 20 * 6);
                default -> add(player, MobEffects.GLOWING, 20 * 8);
            }
        }
    }

    private static void grantCorePackage(ServerPlayer player, int archetype, int strengthTier, int bodyTier, int energy, int duration, int form, int speedTier, int signaturePower, boolean mature) {
        if (archetype == ARCHETYPE_STARLIGHT || hasPower(signaturePower, POWER_STARLIGHT)) {
            bodyTier = Math.max(bodyTier, Math.min(6, strengthTier + 1));
        }
        if (hasPower(signaturePower, POWER_INVISIBLE_SKIN)) {
            strengthTier = Math.max(1, Math.min(3, strengthTier));
            bodyTier = Math.max(4, bodyTier);
        }
        setEnergy(player, Math.min(MAX_ENERGY, energy));
        setForm(player, form, duration);
        setStrengthTier(player, strengthTier);
        setBodyTier(player, bodyTier);
        setArchetype(player, archetype);
        setSpeedTier(player, speedTier);
        int mask = POWER_STRENGTH | POWER_RESIST | signaturePower;
        if (signaturePower == POWER_SELF_EXPLODE || signaturePower == POWER_WEAPON_BOOST || signaturePower == POWER_WALL_CRAWL || signaturePower == POWER_INVISIBLE_SKIN) {
            mask |= signaturePower;
        }
        setPowerMask(player, mask);
        int strengthCap = Math.max(strengthTier, Math.min(SURVIVAL_SOFT_CAP_TIER, strengthTier + 1));
        int bodyCap = Math.max(bodyTier, Math.min(SURVIVAL_SOFT_CAP_TIER, bodyTier + 1));
        int speedCap = speedTier > 0 ? Math.max(speedTier, Math.min(SURVIVAL_SOFT_CAP_TIER, speedTier + 1)) : 0;
        initializeTierProfile(player, mature, strengthCap, bodyCap, speedCap);
    }

    private static void applyHeroState(ServerPlayer player, boolean suit, int form, int powerMask, int speedTier) {
        int speedCharge = getSpeedCharge(player);
        int speedTarget = speedChargeTarget(speedTier);
        double speedRatio = speedTarget <= 0 ? 0.0 : Math.min(1.0, speedCharge / (double) speedTarget);
        int bodyTier = effectiveBodyTier(player, suit, form, powerMask);

        if (player.tickCount % 40 == 0 && (suit || form != FORM_NONE || powerMask != 0)) {
            if (player.getHealth() < player.getMaxHealth()) {
                float healAmount = 0.35f + bodyTier * 0.28f;
                if (form >= FORM_PRIME) {
                    healAmount += 1.0f;
                }
                if (hasPower(powerMask, POWER_REGEN) || getRegenTicks(player) > 0) {
                    healAmount += 1.0f;
                }
                player.heal(healAmount);
            }
        }

        if (hasPower(powerMask, POWER_BOSS) || form >= FORM_PRIME) {
            player.setAbsorptionAmount(20.0f);
        } else if (form == FORM_ELITE) {
            player.setAbsorptionAmount(Math.max(8.0f, bodyTier * 3.0f));
        } else if (suit || form != FORM_NONE || powerMask != 0) {
            player.setAbsorptionAmount(Math.max(2.0f, bodyTier * 1.5f));
        }

        if (hasPower(powerMask, POWER_DEEP_SEA) || getDeepSeaTicks(player) > 0) {
            player.setAirSupply(player.getMaxAirSupply());
        }
        if (hasPower(powerMask, POWER_FLAME) || getFlameTicks(player) > 0) {
            player.setRemainingFireTicks(0);
        }
        if (hasPower(powerMask, POWER_INVISIBLE_SKIN) || (hasPower(powerMask, POWER_NOIR) && getNoirTicks(player) > 0)) {
            player.setInvisible(true);
            if (hasPower(powerMask, POWER_INVISIBLE_SKIN)) {
                suppressInvisibleSkinAggro(player);
            }
        } else if (getNoirTicks(player) <= 0 && player.isInvisible() && !hasPower(powerMask, POWER_NOIR)) {
            player.setInvisible(false);
        }
        if (hasPower(powerMask, POWER_REGEN) || getRegenTicks(player) > 0) {
            if (player.tickCount % 10 == 0 && player.getHealth() < player.getMaxHealth()) {
                player.heal(form >= FORM_PRIME ? 1.75f : form == FORM_ELITE ? 1.25f : 0.75f);
            }
        }
        applyEnhancedSenses(player, suit, form, powerMask, bodyTier);
        applyExtraTraitEffects(player, form, powerMask, bodyTier, speedTier);
        if ((hasPower(powerMask, POWER_DEEP_SEA) || getDeepSeaTicks(player) > 0) && player.isInWaterOrBubble()) {
            applyDeepSeaMovement(player, bodyTier);
        }
        if (hasPower(powerMask, POWER_FLAME) && player.tickCount % 6 == 0) {
            ServerLevel level = player.serverLevel();
            Vec3 pos = player.position().add(0, 1.0, 0);
            level.sendParticles(ParticleTypes.FLAME, pos.x, pos.y, pos.z, 8, 0.3, 0.4, 0.3, 0.01);
        }
        if (hasPower(powerMask, POWER_PHASE)) {
            player.fallDistance = 0.0f;
            if (player.tickCount % 60 == 0) {
                player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 80, 0, false, false, false));
            }
            if (player.tickCount % 16 == 0) {
                ServerLevel level = player.serverLevel();
                Vec3 pos = player.position().add(0, 0.9, 0);
                level.sendParticles(ParticleTypes.PORTAL, pos.x, pos.y, pos.z, 7, 0.25, 0.35, 0.25, 0.015);
            }
        }

        if (speedTier >= 4 && speedCharge >= speedTarget && getChronoTicks(player) > 0) {
            applyTimeDilation(player, speedTier);
        } else if (getChronoTicks(player) > 0) {
            applyTimeDilation(player, speedTier);
        }
    }

    private static void applyEnhancedSenses(ServerPlayer player, boolean suit, int form, int powerMask, int bodyTier) {
        boolean heroState = suit || form != FORM_NONE || powerMask != 0;
        if (!heroState) {
            return;
        }
        boolean homelanderVision = suit || getArchetype(player) == ARCHETYPE_HOMELANDER
            || (hasPower(powerMask, POWER_HEAT) && hasPower(powerMask, POWER_FLIGHT));
        if (homelanderVision && player.tickCount % 200 == 0) {
            player.addEffect(new MobEffectInstance(MobEffects.NIGHT_VISION, 260, 0, false, false, false));
        }
        if (player.tickCount % 40 != 0) {
            return;
        }
        double range = Math.min(64.0, 10.0 + Math.max(1, Math.max(bodyTier, getStrengthTier(player))) * 0.75);
        for (Mob mob : player.serverLevel().getEntitiesOfClass(Mob.class, player.getBoundingBox().inflate(range))) {
            if (!mob.isAlive() || mob.isInvisible()) {
                continue;
            }
            mob.addEffect(new MobEffectInstance(MobEffects.GLOWING, 45, 0, false, false, true));
        }
    }

    private static void applyExtraTraitEffects(ServerPlayer player, int form, int powerMask, int bodyTier, int speedTier) {
        int total = extraTraitCount(player);
        if (total <= 0) {
            return;
        }

        int sensory = traitCountInRange(player, 0, 10);
        int resistance = traitCountInRange(player, 10, 20);
        int movement = traitCountInRange(player, 30, 40);
        int metabolism = traitCountInRange(player, 40, 50);
        int mental = traitCountInRange(player, 50, 60);
        int energy = traitCountInRange(player, 60, 70);
        int exotic = traitCountInRange(player, 70, 80);
        int rare = traitCountInRange(player, 80, 100);

        if ((sensory >= 3 || hasAnyExtraTrait(player, 1, 4, 7, 82, 97)) && player.tickCount % 220 == 0) {
            player.addEffect(new MobEffectInstance(MobEffects.NIGHT_VISION, 260, 0, false, false, false));
        }
        if ((sensory >= 2 || hasAnyExtraTrait(player, 0, 2, 5, 6, 8, 9, 57, 82)) && player.tickCount % 44 == 0) {
            applyExtraTraitScan(player, sensory, rare);
        }

        if (resistance > 0) {
            if (hasAnyExtraTrait(player, 10, 74, 94)) {
                player.setRemainingFireTicks(0);
                if (player.tickCount % 120 == 0) {
                    player.addEffect(new MobEffectInstance(MobEffects.FIRE_RESISTANCE, 160, 0, false, false, false));
                }
            }
            if (hasAnyExtraTrait(player, 13, 16, 86)) {
                player.removeEffect(MobEffects.POISON);
                player.removeEffect(MobEffects.WITHER);
            }
            if (hasAnyExtraTrait(player, 15, 48, 97) || hasPower(powerMask, POWER_DEEP_SEA)) {
                player.setAirSupply(player.getMaxAirSupply());
            }
            if (hasAnyExtraTrait(player, 11, 18) && player.tickCount % 160 == 0) {
                player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 180, 0, false, false, false));
            }
        }

        if (movement > 0) {
            if (player.tickCount % 80 == 0) {
                int amplifier = Math.min(4, movement / 3);
                player.addEffect(new MobEffectInstance(MobEffects.JUMP, 100, amplifier, false, false, false));
            }
            if (hasAnyExtraTrait(player, 32, 38, 39, 70) && player.tickCount % 90 == 0) {
                player.addEffect(new MobEffectInstance(MobEffects.SLOW_FALLING, 120, 0, false, false, false));
            }
            if (hasAnyExtraTrait(player, 31, 35, 37)) {
                applyExtraTraitWallCrawl(player, movement);
            }
        }

        if (metabolism > 0) {
            if (player.tickCount % Math.max(10, 54 - metabolism * 3) == 0 && player.getHealth() < player.getMaxHealth()) {
                player.heal(0.25f + Math.min(1.75f, metabolism * 0.18f + rare * 0.08f));
            }
            if (hasAnyExtraTrait(player, 47, 49) && player.tickCount % 100 == 0) {
                player.getFoodData().eat(1, 0.25f);
            }
            if (hasExtraTrait(player, 45) && player.tickCount % 160 == 0) {
                player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 120, 0, false, false, false));
            }
        }

        if (mental > 0) {
            if (hasAnyExtraTrait(player, 50, 52, 53, 55, 56) && player.tickCount % 20 == 0) {
                player.removeEffect(MobEffects.CONFUSION);
                player.removeEffect(MobEffects.BLINDNESS);
                player.removeEffect(MobEffects.DARKNESS);
            }
            if (hasAnyExtraTrait(player, 58, 72) && player.tickCount % 160 == 0) {
                player.addEffect(new MobEffectInstance(MobEffects.LUCK, 180, Math.min(2, mental / 4), false, false, false));
            }
        }

        if (energy > 0) {
            if (player.tickCount % 20 == 0) {
                int gain = 1 + Math.min(6, energy / 2 + rare / 5);
                setEnergy(player, Math.min(MAX_ENERGY, getEnergy(player) + gain));
                if (hasExtraTrait(player, 65)) {
                    setHeatCooldown(player, Math.max(0, getHeatCooldown(player) - 1));
                    setSpecialCooldown(player, Math.max(0, getSpecialCooldown(player) - 1));
                }
            }
            if ((hasExtraTrait(player, 62) || hasExtraTrait(player, 67)) && hasPower(powerMask, POWER_STARLIGHT) && player.tickCount % 12 == 0) {
                Vec3 pos = player.position().add(0, 1.0, 0);
                player.serverLevel().sendParticles(ParticleTypes.END_ROD, pos.x, pos.y, pos.z, 4, 0.28, 0.32, 0.28, 0.01);
            }
        }

        if (exotic > 0 && player.tickCount % 28 == 0) {
            Vec3 pos = player.position().add(0, 1.0, 0);
            player.serverLevel().sendParticles(ParticleTypes.ELECTRIC_SPARK, pos.x, pos.y, pos.z, Math.min(8, 2 + exotic / 2), 0.35, 0.35, 0.35, 0.01);
        }

        if (hasExtraTrait(player, 80)) {
            applyTraitProjectileDampening(player, 10.0 + rare * 1.5);
        }
        if (hasExtraTrait(player, 81) && speedTier >= 3 && player.isSprinting() && getSpeedCharge(player) >= speedChargeTarget(speedTier)) {
            setChronoTicks(player, Math.max(getChronoTicks(player), 25 + Math.min(80, speedTier * 4)));
        }
        if (hasExtraTrait(player, 87) && player.tickCount % 120 == 0) {
            player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 160, 1, false, false, false));
        }
        if (hasExtraTrait(player, 94) && player.serverLevel().isDay() && player.serverLevel().canSeeSky(player.blockPosition()) && player.tickCount % 40 == 0) {
            setEnergy(player, Math.min(MAX_ENERGY, getEnergy(player) + 4));
            if (player.getHealth() < player.getMaxHealth()) {
                player.heal(0.75f);
            }
        }
        if (hasExtraTrait(player, 97) && player.isInWaterOrBubble()) {
            applyDeepSeaMovement(player, Math.max(bodyTier, 5 + rare / 2));
        }
        if (hasExtraTrait(player, 99) && form >= FORM_ELITE && player.tickCount % 100 == 0) {
            player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 140, 1, false, false, false));
            player.addEffect(new MobEffectInstance(MobEffects.REGENERATION, 120, 0, false, false, false));
        }
    }

    private static void applyExtraTraitScan(ServerPlayer player, int sensory, int rare) {
        double range = Math.min(96.0, 12.0 + sensory * 3.5 + rare * 1.5);
        boolean revealInvisible = hasAnyExtraTrait(player, 1, 8, 57, 82, 97);
        for (Mob mob : player.serverLevel().getEntitiesOfClass(Mob.class, player.getBoundingBox().inflate(range))) {
            if (!mob.isAlive()) {
                continue;
            }
            if (mob.isInvisible() && !revealInvisible) {
                continue;
            }
            mob.addEffect(new MobEffectInstance(MobEffects.GLOWING, 55, 0, false, false, true));
        }
    }

    private static void applyExtraTraitWallCrawl(ServerPlayer player, int movementTraits) {
        if (!player.horizontalCollision || player.isCrouching()) {
            return;
        }
        double climb = 0.10 + Math.min(0.28, movementTraits * 0.025);
        Vec3 delta = player.getDeltaMovement();
        player.setDeltaMovement(delta.x * 0.70, Math.max(delta.y, climb), delta.z * 0.70);
        player.fallDistance = 0.0f;
        player.hurtMarked = true;
    }

    private static void applyTraitProjectileDampening(ServerPlayer player, double radius) {
        for (Projectile projectile : player.serverLevel().getEntitiesOfClass(Projectile.class, player.getBoundingBox().inflate(radius))) {
            if (!projectile.isAlive() || projectile.getOwner() == player) {
                continue;
            }
            projectile.setDeltaMovement(projectile.getDeltaMovement().scale(0.58));
            projectile.hurtMarked = true;
            if (player.tickCount % 5 == 0) {
                player.serverLevel().sendParticles(ParticleTypes.CRIT, projectile.getX(), projectile.getY(), projectile.getZ(), 1, 0.02, 0.02, 0.02, 0.0);
            }
        }
    }

    private static void suppressInvisibleSkinAggro(ServerPlayer player) {
        if (player.tickCount % 4 != 0) {
            return;
        }
        double range = 28.0 + Math.max(0, getBodyTier(player)) * 2.0;
        for (Mob mob : player.serverLevel().getEntitiesOfClass(Mob.class, player.getBoundingBox().inflate(range))) {
            if (!mob.isAlive()) {
                continue;
            }
            if (mob.getTarget() == player) {
                mob.setTarget(null);
                mob.getNavigation().stop();
            }
            if (mob.getLastHurtByMob() == player) {
                mob.setLastHurtByMob(null);
            }
        }
    }

    private static void syncPowerAttributes(ServerPlayer player, boolean suit, int form, int powerMask, int speedTier) {
        boolean boss = hasPower(powerMask, POWER_BOSS) || form >= FORM_PRIME;
        boolean elite = form == FORM_ELITE;
        boolean power = suit || form != FORM_NONE || powerMask != 0;
        int strengthTier = effectiveStrengthTier(player, suit, form, powerMask);
        int bodyTier = effectiveBodyTier(player, suit, form, powerMask);
        int speedCharge = getSpeedCharge(player);
        int speedTarget = speedChargeTarget(speedTier);
        double speedRatio = speedTarget <= 0 ? 0.0 : Math.min(1.0, speedCharge / (double) speedTarget);

        double healthBonus = bodyHealthBonus(bodyTier);
        double armorBonus = bodyArmorBonus(bodyTier);
        double toughnessBonus = bodyToughnessBonus(bodyTier);
        double knockbackBonus = bodyKnockbackBonus(bodyTier);
        double damageBonus = strengthDamageBonus(strengthTier);
        double speedBonus = boss ? 0.070 : elite ? 0.048 : power ? 0.030 : 0.0;

        if (hasPower(powerMask, POWER_STRENGTH) && strengthTier == 0) {
            damageBonus += 3.0;
        }
        if (hasPower(powerMask, POWER_RESIST) && bodyTier == 0) {
            healthBonus += 2.0;
            armorBonus += 1.0;
        }
        if (hasPower(powerMask, POWER_DEEP_SEA)) {
            armorBonus += 1.0;
            toughnessBonus += 0.5;
        }
        if (hasPower(powerMask, POWER_NOIR)) {
            knockbackBonus += 0.05;
            armorBonus += 1.0;
        }
        if (hasPower(powerMask, POWER_INVISIBLE_SKIN)) {
            healthBonus += 18.0;
            armorBonus += 12.0;
            toughnessBonus += 6.0;
            knockbackBonus += 0.25;
            damageBonus += 2.0;
        }
        if (hasPower(powerMask, POWER_REGEN) || getRegenTicks(player) > 0) {
            healthBonus += 2.0;
        }
        if (hasPower(powerMask, POWER_BLOOD)) {
            damageBonus += 2.0;
        }
        if (hasPower(powerMask, POWER_WEAPON_BOOST) || getWeaponBoostTicks(player) > 0) {
            damageBonus += 5.0;
        }
        if (hasPower(powerMask, POWER_SELF_EXPLODE)) {
            toughnessBonus += 1.5;
            knockbackBonus += 0.05;
        }
        if (hasPower(powerMask, POWER_WALL_CRAWL) || hasPower(powerMask, POWER_NOIR) || getWallCrawlTicks(player) > 0) {
            speedBonus += 0.010;
        }
        if (hasPower(powerMask, POWER_TELEPORT)) {
            speedBonus += 0.005;
        }
        if (hasPower(powerMask, POWER_PHASE)) {
            speedBonus += 0.012;
            toughnessBonus += 1.0;
            knockbackBonus += 0.04;
        }
        if (hasPower(powerMask, POWER_SPEED) || speedTier > 0) {
            speedBonus += speedBonusForTier(speedTier, speedRatio);
        }
        if (getChronoTicks(player) > 0) {
            damageBonus += 4.0 + speedTier;
            speedBonus += 0.018 + (speedTier >= 4 ? 0.015 : 0.0);
        }
        if (getSurgeTicks(player) > 0) {
            damageBonus += 4.0;
            speedBonus += 0.018;
        }

        int sensoryTraits = traitCountInRange(player, 0, 10);
        int resistanceTraits = traitCountInRange(player, 10, 20);
        int combatTraits = traitCountInRange(player, 20, 30);
        int movementTraits = traitCountInRange(player, 30, 40);
        int metabolismTraits = traitCountInRange(player, 40, 50);
        int mentalTraits = traitCountInRange(player, 50, 60);
        int energyTraits = traitCountInRange(player, 60, 70);
        int exoticTraits = traitCountInRange(player, 70, 80);
        int rareTraits = traitCountInRange(player, 80, 100);

        healthBonus += resistanceTraits * 0.55 + metabolismTraits * 0.85 + rareTraits * 1.15;
        armorBonus += resistanceTraits * 0.38 + rareTraits * 0.52;
        toughnessBonus += resistanceTraits * 0.18 + exoticTraits * 0.12 + rareTraits * 0.26;
        knockbackBonus += resistanceTraits * 0.006 + movementTraits * 0.004 + rareTraits * 0.008;
        damageBonus += combatTraits * 0.72 + sensoryTraits * 0.10 + energyTraits * 0.16 + exoticTraits * 0.35 + rareTraits * 0.82;
        speedBonus += movementTraits * 0.0035 + energyTraits * 0.0015 + rareTraits * 0.0028;
        if (hasAnyExtraTrait(player, 20, 23, 27, 28, 29, 83)) {
            damageBonus += 2.0;
        }
        if (hasAnyExtraTrait(player, 30, 33, 34, 38, 92)) {
            speedBonus += 0.010;
        }
        if (hasAnyExtraTrait(player, 42, 43, 84, 87, 89, 99)) {
            healthBonus += 3.0;
            toughnessBonus += 0.8;
        }
        if (hasAnyExtraTrait(player, 60, 64, 69, 94)) {
            speedBonus += 0.006;
        }
        syncAttribute(player, Attributes.MAX_HEALTH, HEALTH_BONUS_UUID, "BlockForge Health Bonus", healthBonus);
        syncAttribute(player, Attributes.ARMOR, ARMOR_BONUS_UUID, "BlockForge Armor Bonus", armorBonus);
        syncAttribute(player, Attributes.ARMOR_TOUGHNESS, TOUGHNESS_BONUS_UUID, "BlockForge Toughness Bonus", toughnessBonus);
        syncAttribute(player, Attributes.KNOCKBACK_RESISTANCE, KNOCKBACK_BONUS_UUID, "BlockForge Knockback Bonus", knockbackBonus);
        syncAttribute(player, Attributes.ATTACK_DAMAGE, DAMAGE_BONUS_UUID, "BlockForge Damage Bonus", damageBonus);
        syncAttribute(player, Attributes.MOVEMENT_SPEED, SPEED_BONUS_UUID, "BlockForge Speed Bonus", speedBonus);
        syncAttribute(player, Attributes.ATTACK_SPEED, CHRONO_BONUS_UUID, "BlockForge Chrono Bonus", getChronoTicks(player) > 0 ? 0.10 : 0.0);

        if (player.getHealth() > player.getMaxHealth()) {
            player.setHealth(player.getMaxHealth());
        }
    }

    private static void syncAttribute(ServerPlayer player, Attribute attribute, UUID id, String name, double amount) {
        AttributeInstance instance = player.getAttribute(attribute);
        if (instance == null) {
            return;
        }
        AttributeModifier existing = instance.getModifier(id);
        if (existing != null) {
            instance.removeModifier(existing);
        }
        if (amount != 0.0) {
            instance.addTransientModifier(new AttributeModifier(id, name, amount, AttributeModifier.Operation.ADDITION));
        }
    }

    private static int effectiveStrengthTier(ServerPlayer player, boolean suit, int form, int powerMask) {
        int tier = Math.max(clampTier(getStrengthTier(player)), getTempStrengthTier(player));
        if (suit) {
            tier = Math.max(tier, 3);
        }
        if (hasPower(powerMask, POWER_BOSS) || form >= FORM_PRIME) {
            tier = Math.max(tier, 6);
        } else if (form == FORM_ELITE) {
            tier = Math.max(tier, 4);
        } else if (hasPower(powerMask, POWER_INVISIBLE_SKIN)) {
            tier = Math.max(tier, 2);
        } else if (hasPower(powerMask, POWER_STRENGTH)) {
            tier = Math.max(tier, 1);
        }
        if (hasPower(powerMask, POWER_INVISIBLE_SKIN) && !hasPower(powerMask, POWER_BOSS) && form < FORM_PRIME) {
            tier = Math.min(tier, 2);
        }
        return clampTier(tier);
    }

    private static int effectiveBodyTier(ServerPlayer player, boolean suit, int form, int powerMask) {
        int tier = Math.max(clampTier(getBodyTier(player)), getTempBodyTier(player));
        if (suit) {
            tier = Math.max(tier, 3);
        }
        if (hasPower(powerMask, POWER_BOSS) || form >= FORM_PRIME) {
            tier = Math.max(tier, 6);
        } else if (form == FORM_ELITE) {
            tier = Math.max(tier, 4);
        } else if (hasPower(powerMask, POWER_INVISIBLE_SKIN)) {
            tier = Math.max(tier, 4);
        } else if (hasPower(powerMask, POWER_RESIST)) {
            tier = Math.max(tier, 1);
        }
        if (hasPower(powerMask, POWER_INVISIBLE_SKIN)) {
            tier = Math.max(tier, 4);
        }
        return clampTier(tier);
    }

    private static double strengthDamageBonus(int tier) {
        int safeTier = clampTier(tier);
        if (safeTier > 10) {
            double extra = safeTier - 10.0;
            return 238.0 + Math.pow(extra, 1.36) * 14.0;
        }
        return switch (safeTier) {
            case 1 -> 4.0;
            case 2 -> 9.0;
            case 3 -> 17.0;
            case 4 -> 30.0;
            case 5 -> 48.0;
            case 6 -> 72.0;
            case 7 -> 102.0;
            case 8 -> 138.0;
            case 9 -> 182.0;
            case 10 -> 238.0;
            default -> 0.0;
        };
    }

    private static double bodyHealthBonus(int tier) {
        int safeTier = clampTier(tier);
        if (safeTier > 10) {
            double extra = safeTier - 10.0;
            return 492.0 + Math.pow(extra, 1.42) * 34.0;
        }
        return switch (safeTier) {
            case 1 -> 10.0;
            case 2 -> 24.0;
            case 3 -> 44.0;
            case 4 -> 72.0;
            case 5 -> 112.0;
            case 6 -> 164.0;
            case 7 -> 228.0;
            case 8 -> 304.0;
            case 9 -> 392.0;
            case 10 -> 492.0;
            default -> 0.0;
        };
    }

    private static double bodyArmorBonus(int tier) {
        int safeTier = clampTier(tier);
        if (safeTier > 10) {
            double extra = safeTier - 10.0;
            return 130.0 + Math.pow(extra, 1.24) * 4.8;
        }
        return switch (safeTier) {
            case 1 -> 5.0;
            case 2 -> 10.0;
            case 3 -> 18.0;
            case 4 -> 28.0;
            case 5 -> 40.0;
            case 6 -> 54.0;
            case 7 -> 70.0;
            case 8 -> 88.0;
            case 9 -> 108.0;
            case 10 -> 130.0;
            default -> 0.0;
        };
    }

    private static double bodyToughnessBonus(int tier) {
        int safeTier = clampTier(tier);
        if (safeTier > 10) {
            double extra = safeTier - 10.0;
            return 76.0 + Math.pow(extra, 1.18) * 2.2;
        }
        return switch (safeTier) {
            case 1 -> 1.0;
            case 2 -> 3.0;
            case 3 -> 6.0;
            case 4 -> 10.0;
            case 5 -> 16.0;
            case 6 -> 24.0;
            case 7 -> 34.0;
            case 8 -> 46.0;
            case 9 -> 60.0;
            case 10 -> 76.0;
            default -> 0.0;
        };
    }

    private static double bodyKnockbackBonus(int tier) {
        int safeTier = clampTier(tier);
        if (safeTier > 10) {
            return Math.min(4.0, 1.7 + Math.log1p(safeTier - 10.0) * 0.55);
        }
        return switch (safeTier) {
            case 1 -> 0.15;
            case 2 -> 0.35;
            case 3 -> 0.55;
            case 4 -> 0.75;
            case 5 -> 0.90;
            case 6 -> 1.05;
            case 7 -> 1.20;
            case 8 -> 1.35;
            case 9 -> 1.50;
            case 10 -> 1.70;
            default -> 0.0;
        };
    }

    private static float bodyDamageScale(int tier) {
        int safeTier = clampTier(tier);
        if (safeTier > 10) {
            return (float) Math.max(0.001, 0.012 * Math.pow(0.965, safeTier - 10.0));
        }
        return switch (safeTier) {
            case 1 -> 0.68f;
            case 2 -> 0.46f;
            case 3 -> 0.28f;
            case 4 -> 0.16f;
            case 5 -> 0.08f;
            case 6 -> 0.05f;
            case 7 -> 0.035f;
            case 8 -> 0.025f;
            case 9 -> 0.018f;
            case 10 -> 0.012f;
            default -> 1.0f;
        };
    }

    private static int pickPowers(int picks, int maxTier) {
        Set<Integer> chosen = new HashSet<>();
        int guard = 0;
        while (chosen.size() < picks && guard < 64) {
            chosen.add(drawWeightedPower(maxTier));
            guard++;
        }
        int mask = 0;
        for (int power : chosen) {
            mask |= power;
        }
        return mask;
    }

    private static int drawWeightedPower(int maxTier) {
        List<Integer> pool = new ArrayList<>();
        addWeighted(pool, POWER_FLIGHT, 6);
        addWeighted(pool, POWER_SPEED, 5);
        addWeighted(pool, POWER_STRENGTH, 4);
        addWeighted(pool, POWER_RESIST, 4);
        addWeighted(pool, POWER_DEEP_SEA, 3);
        addWeighted(pool, POWER_WEAPON_BOOST, 3);
        addWeighted(pool, POWER_WALL_CRAWL, 3);
        addWeighted(pool, POWER_INVISIBLE_SKIN, 2);
        if (maxTier >= 2) {
            addWeighted(pool, POWER_HEAT, 3);
            addWeighted(pool, POWER_FLAME, 2);
        }
        if (maxTier >= 3) {
            addWeighted(pool, POWER_NOIR, 2);
            addWeighted(pool, POWER_TELEPORT, 2);
            addWeighted(pool, POWER_REGEN, 2);
            addWeighted(pool, POWER_SELF_EXPLODE, 1);
            addWeighted(pool, POWER_INVISIBLE_SKIN, 2);
        }
        if (maxTier >= 4) {
            addWeighted(pool, POWER_BLOOD, 1);
            addWeighted(pool, POWER_BOSS, 1);
            addWeighted(pool, POWER_PURGE, 1);
            addWeighted(pool, POWER_GRAVITY, 1);
            addWeighted(pool, POWER_SONIC, 1);
            addWeighted(pool, POWER_GLITCH, 1);
            addWeighted(pool, POWER_PHASE, 1);
        }
        return pool.get(RANDOM.nextInt(pool.size()));
    }

    private static void addWeighted(List<Integer> pool, int value, int weight) {
        for (int i = 0; i < weight; i++) {
            pool.add(value);
        }
    }

    private static int rollPhysicalTier(boolean unstable) {
        List<Integer> pool = new ArrayList<>();
        addWeighted(pool, 1, unstable ? 42 : 34);
        addWeighted(pool, 2, unstable ? 28 : 31);
        addWeighted(pool, 3, unstable ? 17 : 22);
        addWeighted(pool, 4, unstable ? 9 : 10);
        addWeighted(pool, 5, unstable ? 4 : 3);
        addWeighted(pool, 6, unstable ? 2 : 1);
        return pool.get(RANDOM.nextInt(pool.size()));
    }

    private static int drawSignatureAbility(int bestTier, boolean unstable) {
        List<Integer> pool = new ArrayList<>();
        addWeighted(pool, POWER_DEEP_SEA, 5);
        addWeighted(pool, POWER_SPEED, 5);
        addWeighted(pool, POWER_WEAPON_BOOST, 4);
        addWeighted(pool, POWER_WALL_CRAWL, 4);
        addWeighted(pool, POWER_INVISIBLE_SKIN, 3);
        if (bestTier >= 2) {
            addWeighted(pool, POWER_FLIGHT, 4);
            addWeighted(pool, POWER_FLAME, 3);
            addWeighted(pool, POWER_STARLIGHT, 3);
        }
        if (bestTier >= 3) {
            addWeighted(pool, POWER_HEAT, 3);
            addWeighted(pool, POWER_NOIR, 3);
            addWeighted(pool, POWER_TELEPORT, 2);
            addWeighted(pool, POWER_REGEN, 2);
            addWeighted(pool, POWER_SELF_EXPLODE, 2);
            addWeighted(pool, POWER_INVISIBLE_SKIN, 2);
        }
        if (bestTier >= 4) {
            addWeighted(pool, POWER_BLOOD, 1);
            addWeighted(pool, POWER_PURGE, 1);
            addWeighted(pool, POWER_GRAVITY, 1);
            addWeighted(pool, POWER_SONIC, 1);
            addWeighted(pool, POWER_GLITCH, 1);
            addWeighted(pool, POWER_PHASE, 1);
        }
        if (unstable) {
            addWeighted(pool, POWER_FLAME, 2);
            addWeighted(pool, POWER_BLOOD, bestTier >= 4 ? 2 : 0);
            addWeighted(pool, POWER_PHASE, bestTier >= 3 ? 1 : 0);
        }
        return pool.get(RANDOM.nextInt(pool.size()));
    }

    private static int signatureAbilityFor(int archetype) {
        return switch (archetype) {
            case ARCHETYPE_NOIR -> POWER_NOIR;
            case ARCHETYPE_FIRESTARTER -> POWER_FLAME;
            case ARCHETYPE_TELEPORTER -> POWER_TELEPORT;
            case ARCHETYPE_BLOOD -> POWER_BLOOD;
            case ARCHETYPE_DEEP_SEA -> POWER_DEEP_SEA;
            case ARCHETYPE_STARLIGHT -> POWER_STARLIGHT;
            case ARCHETYPE_A_TRAIN -> POWER_SPEED;
            case ARCHETYPE_SOLDIER_BOY -> POWER_PURGE;
            case ARCHETYPE_LOW_GRADE -> POWER_WALL_CRAWL;
            case ARCHETYPE_TRANSLUCENT -> POWER_INVISIBLE_SKIN;
            case ARCHETYPE_HOMELANDER -> POWER_HEAT | POWER_FLIGHT;
            default -> 0;
        };
    }

    private static int archetypeForSignature(int signature) {
        if (signature == POWER_STARLIGHT) {
            return ARCHETYPE_STARLIGHT;
        }
        if (signature == POWER_SPEED) {
            return ARCHETYPE_A_TRAIN;
        }
        if (signature == POWER_NOIR) {
            return ARCHETYPE_NOIR;
        }
        if (signature == POWER_INVISIBLE_SKIN) {
            return ARCHETYPE_TRANSLUCENT;
        }
        if (signature == POWER_DEEP_SEA) {
            return ARCHETYPE_DEEP_SEA;
        }
        if (signature == POWER_FLAME || signature == POWER_HEAT) {
            return ARCHETYPE_FIRESTARTER;
        }
        if (signature == POWER_TELEPORT) {
            return ARCHETYPE_TELEPORTER;
        }
        if (signature == POWER_BLOOD) {
            return ARCHETYPE_BLOOD;
        }
        if (signature == POWER_PURGE) {
            return ARCHETYPE_SOLDIER_BOY;
        }
        if (signature == POWER_GRAVITY || signature == POWER_SONIC) {
            return ARCHETYPE_CORE;
        }
        if (signature == POWER_PHASE) {
            return ARCHETYPE_CORE;
        }
        if (signature == POWER_GLITCH) {
            return ARCHETYPE_LOW_GRADE;
        }
        if (signature == POWER_SELF_EXPLODE) {
            return ARCHETYPE_SOLDIER_BOY;
        }
        if (signature == POWER_WEAPON_BOOST || signature == POWER_WALL_CRAWL) {
            return ARCHETYPE_NOIR;
        }
        return ARCHETYPE_CORE;
    }

    private static int rollSpeedTier(int maxTier) {
        List<Integer> pool = new ArrayList<>();
        addWeighted(pool, 1, 20);
        if (maxTier >= 2) {
            addWeighted(pool, 2, 12);
        }
        if (maxTier >= 3) {
            addWeighted(pool, 3, 6);
        }
        if (maxTier >= 4) {
            addWeighted(pool, 4, 3);
        }
        if (maxTier >= 5) {
            addWeighted(pool, 5, 1);
        }
        if (maxTier >= 6) {
            addWeighted(pool, 6, 1);
        }
        if (maxTier >= 7) {
            addWeighted(pool, 7, 1);
        }
        if (maxTier >= 8) {
            addWeighted(pool, 8, 1);
        }
        if (maxTier >= 9) {
            addWeighted(pool, 9, 1);
        }
        if (maxTier >= 10) {
            addWeighted(pool, 10, 1);
        }
        for (int tier = 20; tier <= maxTier; tier += 10) {
            addWeighted(pool, tier, 1);
        }
        return pool.get(RANDOM.nextInt(pool.size()));
    }

    private static double speedBonusForTier(int speedTier, double ratio) {
        double base = speedBaseBonus(speedTier);
        return base * (0.28 + 0.72 * ratio);
    }

    private static double speedBaseBonus(int speedTier) {
        int safeTier = clampTier(speedTier);
        if (safeTier > 10) {
            double extra = safeTier - 10.0;
            return Math.min(3.6, 0.520 + (1.0 - Math.exp(-extra / 20.0)) * 2.35 + extra * 0.006);
        }
        return switch (safeTier) {
            case 1 -> 0.018;
            case 2 -> 0.040;
            case 3 -> 0.072;
            case 4 -> 0.125;
            case 5 -> 0.175;
            case 6 -> 0.230;
            case 7 -> 0.290;
            case 8 -> 0.355;
            case 9 -> 0.430;
            case 10 -> 0.520;
            default -> 0.0;
        };
    }

    private static int speedChargeTarget(int speedTier) {
        int safeTier = clampTier(speedTier);
        if (safeTier > 10) {
            int extra = safeTier - 10;
            return Math.min(60000, 1200 + extra * 220 + extra * extra * 4);
        }
        return switch (safeTier) {
            case 1 -> 80;
            case 2 -> 140;
            case 3 -> 220;
            case 4 -> 300;
            case 5 -> 400;
            case 6 -> 520;
            case 7 -> 660;
            case 8 -> 820;
            case 9 -> 1000;
            case 10 -> 1200;
            default -> 0;
        };
    }

    private static int speedChargeGain(int speedTier) {
        int safeTier = clampTier(speedTier);
        if (safeTier > 10) {
            return Math.min(320, 28 + (safeTier - 10) * 3);
        }
        return switch (safeTier) {
            case 1 -> 3;
            case 2 -> 4;
            case 3 -> 5;
            case 4 -> 7;
            case 5 -> 10;
            case 6 -> 13;
            case 7 -> 16;
            case 8 -> 20;
            case 9 -> 24;
            case 10 -> 28;
            default -> 0;
        };
    }

    private static int speedChargeDecay(int speedTier) {
        int safeTier = clampTier(speedTier);
        if (safeTier > 10) {
            return Math.min(220, 22 + (safeTier - 10) * 2);
        }
        return switch (safeTier) {
            case 1 -> 2;
            case 2 -> 3;
            case 3 -> 4;
            case 4 -> 6;
            case 5 -> 8;
            case 6 -> 10;
            case 7 -> 12;
            case 8 -> 15;
            case 9 -> 18;
            case 10 -> 22;
            default -> 0;
        };
    }

    private static void updateSpeedState(ServerPlayer player, int speedTier, int powerMask) {
        if (!hasPower(powerMask, POWER_SPEED) || speedTier <= 0) {
            setSpeedCharge(player, 0);
            setChronoTicks(player, 0);
            return;
        }

        int target = speedChargeTarget(speedTier);
        int charge = getSpeedCharge(player);
        if (player.isSprinting()) {
            charge = Math.min(target, charge + speedChargeGain(speedTier));
            Vec3 boostDir = horizontalLook(player);
            double boost = sprintBoostForTier(speedTier);
            if (getChronoTicks(player) > 0) {
                boost += 0.030 + speedTier * 0.008;
            } else {
                boost *= 0.34 + 0.66 * Math.min(1.0, charge / (double) target);
            }
            if (boostDir.lengthSqr() > 0.0) {
                player.setDeltaMovement(player.getDeltaMovement().add(boostDir.scale(boost)));
                player.hurtMarked = true;
            }
            if (speedTier >= 3 && charge >= target) {
                int chronoDuration = speedTier >= 8 ? 20 * 14 : speedTier >= 6 ? 20 * 12 : speedTier >= 5 ? 20 * 10 : speedTier >= 4 ? 20 * 8 : 20 * 5;
                setChronoTicks(player, Math.max(getChronoTicks(player), chronoDuration));
                if (player.tickCount % 16 == 0) {
                    player.level().playSound(null, player.blockPosition(), SoundEvents.ELYTRA_FLYING, SoundSource.PLAYERS, 0.85f, speedTier >= 8 ? 2.25f : speedTier >= 6 ? 2.1f : speedTier >= 5 ? 2.0f : speedTier >= 4 ? 1.85f : 1.55f);
                }
            }
        } else {
            charge = Math.max(0, charge - speedChargeDecay(speedTier));
        }
        setSpeedCharge(player, charge);
    }

    private static double sprintBoostForTier(int speedTier) {
        int safeTier = clampTier(speedTier);
        if (safeTier > 10) {
            double extra = safeTier - 10.0;
            return Math.min(4.8, 0.560 + (1.0 - Math.exp(-extra / 18.0)) * 3.1 + extra * 0.012);
        }
        return switch (safeTier) {
            case 1 -> 0.020;
            case 2 -> 0.040;
            case 3 -> 0.068;
            case 4 -> 0.110;
            case 5 -> 0.160;
            case 6 -> 0.220;
            case 7 -> 0.290;
            case 8 -> 0.370;
            case 9 -> 0.460;
            case 10 -> 0.560;
            default -> 0.0;
        };
    }

    private static void enforceSpeedLimit(ServerPlayer player, boolean notify) {
        if (!isSpeedLimitEnabled(player)) {
            return;
        }
        int limit = getSpeedLimitTier(player);
        if (limit <= 0) {
            return;
        }
        int current = getSpeedTier(player);
        if (limit < 3 && getChronoTicks(player) > 0) {
            setChronoTicks(player, 0);
        }
        if (current <= limit) {
            return;
        }

        setSpeedTier(player, limit);
        setSpeedCharge(player, Math.min(getSpeedCharge(player), speedChargeTarget(limit)));
        setChronoTicks(player, 0);
        if (notify) {
            tell(player, "已自动限速到 T" + limit + "，时停阈值为 T3 满蓄力。");
        }
    }

    private static Vec3 horizontalLook(ServerPlayer player) {
        Vec3 look = player.getLookAngle();
        Vec3 flat = new Vec3(look.x, 0.0, look.z);
        if (flat.lengthSqr() < 0.0001) {
            return look.normalize();
        }
        return flat.normalize();
    }

    private static void applyDeepSeaMovement(ServerPlayer player, int bodyTier) {
        if (!player.isInWaterOrBubble()) {
            return;
        }
        int tier = Math.max(1, Math.min(MAX_PRESET_TIER, bodyTier));
        Vec3 movement = player.getDeltaMovement().add(0.0, 0.014 + tier * 0.005, 0.0);
        Vec3 swimDir = horizontalLook(player);
        if (player.isSprinting() && swimDir.lengthSqr() > 0.0) {
            movement = movement.add(swimDir.scale(0.018 + tier * 0.012));
        }
        player.setDeltaMovement(movement);
        player.hurtMarked = true;
        player.addEffect(new MobEffectInstance(MobEffects.DOLPHINS_GRACE, 30, tier - 1, false, false, false));
        player.addEffect(new MobEffectInstance(MobEffects.DIG_SPEED, 30, tier - 1, false, false, false));
    }

    private static void applyGrowthProgress(ServerPlayer player, boolean suit, int form, int powerMask, int speedTier) {
        if (player.tickCount % 20 != 0) {
            return;
        }

        int strengthTier = getStrengthTier(player);
        int strengthCap = getTierCap(player, STRENGTH_CAP_KEY, strengthTier);
        if (strengthCap > strengthTier && (hasPower(powerMask, POWER_STRENGTH) || hasPower(powerMask, POWER_WEAPON_BOOST) || hasPower(powerMask, POWER_BOSS) || form >= FORM_ELITE)) {
            int amount = 1 + Math.max(0, strengthTier / 2);
            if (player.isSprinting()) {
                amount++;
            }
            if (player.isUsingItem()) {
                amount++;
            }
            awardTierGrowth(player, STRENGTH_TIER_KEY, STRENGTH_CAP_KEY, STRENGTH_XP_KEY, amount);
        }

        int bodyTier = getBodyTier(player);
        int bodyCap = getTierCap(player, BODY_CAP_KEY, bodyTier);
        if (bodyCap > bodyTier && (hasPower(powerMask, POWER_RESIST) || hasPower(powerMask, POWER_DEEP_SEA) || hasPower(powerMask, POWER_REGEN) || hasPower(powerMask, POWER_STARLIGHT) || hasPower(powerMask, POWER_INVISIBLE_SKIN) || form != FORM_NONE || suit)) {
            int amount = 1 + Math.max(0, bodyTier / 3);
            if (player.isInWaterOrBubble()) {
                amount += 2;
            }
            if (player.horizontalCollision) {
                amount++;
            }
            if (player.hurtTime > 0) {
                amount++;
            }
            awardTierGrowth(player, BODY_TIER_KEY, BODY_CAP_KEY, BODY_XP_KEY, amount);
        }

        int speedTierCurrent = getSpeedTier(player);
        int speedCap = getTierCap(player, SPEED_CAP_KEY, speedTierCurrent);
        if (speedCap > speedTierCurrent && (hasPower(powerMask, POWER_SPEED) || speedTierCurrent > 0) && player.isSprinting()) {
            int amount = 1 + Math.max(0, speedTierCurrent / 2);
            if (getChronoTicks(player) > 0) {
                amount += 2;
            }
            if (player.getDeltaMovement().lengthSqr() > 0.12) {
                amount++;
            }
            awardTierGrowth(player, SPEED_TIER_KEY, SPEED_CAP_KEY, SPEED_XP_KEY, amount);
        }
    }

    private static void applyPassiveAbilityTicks(ServerPlayer player, int form, int powerMask, int speedTier) {
        if (getDeepSeaTicks(player) > 0 || hasPower(powerMask, POWER_DEEP_SEA)) {
            player.setAirSupply(player.getMaxAirSupply());
        }
        if (hasPower(powerMask, POWER_INVISIBLE_SKIN) || getNoirTicks(player) > 0) {
            player.setInvisible(true);
            if (player.tickCount % 8 == 0) {
                ServerLevel level = player.serverLevel();
                Vec3 pos = player.position().add(0, 1.0, 0);
                level.sendParticles(ParticleTypes.SMOKE, pos.x, pos.y, pos.z, 4, 0.4, 0.2, 0.4, 0.01);
            }
        } else if (player.isInvisible()) {
            player.setInvisible(false);
        }
        if (getFlameTicks(player) > 0) {
            player.setRemainingFireTicks(0);
            if (player.tickCount % 6 == 0) {
                ServerLevel level = player.serverLevel();
                Vec3 pos = player.position().add(0, 1.0, 0);
                level.sendParticles(ParticleTypes.FLAME, pos.x, pos.y, pos.z, 8, 0.3, 0.4, 0.3, 0.01);
            }
        }
        if (getRegenTicks(player) > 0) {
            if (player.tickCount % 10 == 0 && player.getHealth() < player.getMaxHealth()) {
                player.heal(form >= FORM_PRIME ? 1.75f : form == FORM_ELITE ? 1.25f : 0.75f);
            }
        }
        if (hasPower(powerMask, POWER_WEAPON_BOOST) || getWeaponBoostTicks(player) > 0) {
            if (player.tickCount % 12 == 0) {
                ServerLevel level = player.serverLevel();
                Vec3 pos = player.position().add(0, 1.0, 0);
                level.sendParticles(ParticleTypes.ELECTRIC_SPARK, pos.x, pos.y, pos.z, 4, 0.25, 0.2, 0.25, 0.01);
            }
        }
        applyWallCrawl(player, powerMask);
        if (getChronoTicks(player) > 0) {
            applyTimeDilation(player, speedTier);
        }
        if (hasPower(powerMask, POWER_FLAME) && player.tickCount % 6 == 0) {
            ServerLevel level = player.serverLevel();
            Vec3 pos = player.position().add(0, 1.0, 0);
            level.sendParticles(ParticleTypes.FLAME, pos.x, pos.y, pos.z, 8, 0.3, 0.4, 0.3, 0.01);
        }
        if (hasPower(powerMask, POWER_REGEN) || getRegenTicks(player) > 0) {
            if (player.tickCount % 40 == 0 && player.getHealth() < player.getMaxHealth()) {
                player.heal(0.5f);
            }
        }
    }

    private static void applyTimeDilation(ServerPlayer player, int speedTier) {
        double radius = speedTier >= 10 ? 28.0 : speedTier >= 9 ? 25.0 : speedTier >= 8 ? 23.0 : speedTier >= 7 ? 21.0 : speedTier >= 6 ? 19.0 : speedTier >= 5 ? 20.0 : speedTier >= 4 ? 16.0 : speedTier >= 3 ? 11.0 : 7.5;
        double livingFactor = speedTier >= 10 ? 0.008 : speedTier >= 9 ? 0.010 : speedTier >= 8 ? 0.013 : speedTier >= 7 ? 0.016 : speedTier >= 6 ? 0.018 : speedTier >= 5 ? 0.020 : speedTier >= 4 ? 0.035 : speedTier >= 3 ? 0.070 : 0.12;
        double projectileFactor = speedTier >= 10 ? 0.03 : speedTier >= 9 ? 0.04 : speedTier >= 8 ? 0.05 : speedTier >= 7 ? 0.06 : speedTier >= 6 ? 0.07 : speedTier >= 5 ? 0.08 : speedTier >= 4 ? 0.12 : speedTier >= 3 ? 0.22 : 0.35;
        ServerLevel level = player.serverLevel();
        for (LivingEntity entity : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(radius))) {
            if (entity == player || !entity.isAlive()) {
                continue;
            }
            if (entity instanceof ServerPlayer other && (other.isCreative() || other.isSpectator())) {
                continue;
            }
            if (hasSpeedImmunity(entity)) {
                continue;
            }
            entity.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 8, speedTier >= 10 ? 12 : speedTier >= 9 ? 11 : speedTier >= 8 ? 10 : speedTier >= 7 ? 9 : speedTier >= 6 ? 8 : speedTier >= 5 ? 7 : speedTier >= 4 ? 6 : 5, false, false, false));
            entity.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 8, speedTier >= 10 ? 5 : speedTier >= 9 ? 5 : speedTier >= 8 ? 4 : speedTier >= 7 ? 4 : speedTier >= 6 ? 3 : speedTier >= 5 ? 3 : speedTier >= 4 ? 2 : 1, false, false, false));
            entity.setDeltaMovement(entity.getDeltaMovement().scale(livingFactor));
            entity.hurtMarked = true;
            if (entity instanceof Mob mob) {
                mob.getNavigation().stop();
                mob.setAggressive(false);
            }
            if (player.tickCount % 6 == 0) {
                level.sendParticles(ParticleTypes.SMOKE, entity.getX(), entity.getY() + 0.6, entity.getZ(), 1, 0.12, 0.12, 0.12, 0.0);
            }
        }

        for (Projectile projectile : level.getEntitiesOfClass(Projectile.class, player.getBoundingBox().inflate(radius))) {
            if (!projectile.isAlive()) {
                continue;
            }
            if (projectile.getOwner() instanceof LivingEntity owner && hasSpeedImmunity(owner)) {
                continue;
            }
            projectile.setDeltaMovement(projectile.getDeltaMovement().scale(projectileFactor));
            projectile.hurtMarked = true;
            if (player.tickCount % 4 == 0) {
                level.sendParticles(ParticleTypes.ELECTRIC_SPARK, projectile.getX(), projectile.getY(), projectile.getZ(), 1, 0.02, 0.02, 0.02, 0.0);
            }
        }
    }

    private static boolean hasSpeedImmunity(LivingEntity entity) {
        if (entity instanceof ServerPlayer other) {
            return hasPower(getEffectivePowerMask(other), POWER_SPEED) && getEffectiveSpeedTier(other) >= 1;
        }
        return false;
    }

    private static void boostSpeedImpact(LivingHurtEvent event, ServerPlayer attacker) {
        int powerMask = getEffectivePowerMask(attacker);
        int speedTier = getEffectiveSpeedTier(attacker);
        if (!hasPower(powerMask, POWER_SPEED) || speedTier <= 0) {
            return;
        }
        int target = speedChargeTarget(speedTier);
        int charge = getSpeedCharge(attacker);
        double ratio = target <= 0 ? 0.0 : Math.min(1.0, charge / (double) target);
        boolean chrono = getChronoTicks(attacker) > 0;
        if (chrono || ratio >= 0.75) {
            float impact = switch (clampTier(speedTier)) {
                case 1 -> 3.0f;
                case 2 -> 7.0f;
                case 3 -> 13.0f;
                case 4 -> 24.0f;
                case 5 -> 35.0f;
                case 6 -> 47.0f;
                case 7 -> 61.0f;
                case 8 -> 78.0f;
                case 9 -> 98.0f;
                case 10 -> 122.0f;
                default -> 0.0f;
            };
            event.setAmount(event.getAmount() + impact + (chrono ? speedTier * 2.5f : 0.0f));
        }
    }

    private static void boostWeaponDamage(LivingHurtEvent event, ServerPlayer attacker) {
        int powerMask = getEffectivePowerMask(attacker);
        boolean boosted = hasPower(powerMask, POWER_WEAPON_BOOST) || getWeaponBoostTicks(attacker) > 0 || hasPower(powerMask, POWER_BOSS) || getForm(attacker) >= FORM_PRIME;
        if (!boosted) {
            return;
        }
        ItemStack held = attacker.getMainHandItem();
        if (held.isEmpty()) {
            return;
        }
        int strengthTier = effectiveStrengthTier(attacker, hasFullSuit(attacker), getForm(attacker), powerMask);
        float bonus = 2.0f + strengthTier * 1.8f;
        if (getWeaponBoostTicks(attacker) > 0) {
            bonus += 4.0f;
        }
        if (isGun(held)) {
            bonus += 2.5f;
        }
        event.setAmount(event.getAmount() + bonus);
    }

    private static void boostExtraTraitDamage(LivingHurtEvent event, ServerPlayer attacker) {
        int total = extraTraitCount(attacker);
        if (total <= 0) {
            return;
        }
        int combat = traitCountInRange(attacker, 20, 30);
        int sensory = traitCountInRange(attacker, 0, 10);
        int energy = traitCountInRange(attacker, 60, 70);
        int exotic = traitCountInRange(attacker, 70, 80);
        int rare = traitCountInRange(attacker, 80, 100);
        float bonus = (float) (combat * 0.45 + sensory * 0.08 + energy * 0.12 + exotic * 0.28 + rare * 0.55);
        if (hasAnyExtraTrait(attacker, 20, 23, 27, 28, 29, 83)) {
            bonus += 1.5f;
        }
        if (hasAnyExtraTrait(attacker, 25, 64) && isGun(attacker.getMainHandItem())) {
            bonus += 2.0f + combat * 0.25f;
        }
        if (hasExtraTrait(attacker, 73)) {
            event.getEntity().addEffect(new MobEffectInstance(MobEffects.CONFUSION, 70, 0, false, false, false));
        }
        if (hasExtraTrait(attacker, 90)) {
            event.getEntity().addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 70, 0, false, false, false));
        }
        if (bonus > 0.0f) {
            event.setAmount(event.getAmount() + bonus);
        }
    }

    private static float extraTraitDamageScale(ServerPlayer player, LivingHurtEvent event) {
        int total = extraTraitCount(player);
        if (total <= 0) {
            return 1.0f;
        }
        int resistance = traitCountInRange(player, 10, 20);
        int movement = traitCountInRange(player, 30, 40);
        int metabolism = traitCountInRange(player, 40, 50);
        int mental = traitCountInRange(player, 50, 60);
        int exotic = traitCountInRange(player, 70, 80);
        int rare = traitCountInRange(player, 80, 100);
        float scale = (float) Math.max(0.58, 1.0 - resistance * 0.025 - metabolism * 0.012 - rare * 0.018);
        String damageId = event.getSource().getMsgId();
        if (damageId.contains("fire") || damageId.contains("lava") || damageId.contains("hotFloor") || damageId.contains("onFire")) {
            if (hasAnyExtraTrait(player, 10, 74, 94)) {
                scale *= 0.36f;
            }
        }
        if (damageId.contains("freeze") && hasExtraTrait(player, 11)) {
            scale *= 0.45f;
        }
        if ((damageId.contains("drown") || damageId.contains("dryOut")) && hasAnyExtraTrait(player, 15, 48, 97)) {
            scale *= 0.35f;
        }
        if ((damageId.contains("magic") || damageId.contains("wither") || damageId.contains("dragonBreath")) && hasAnyExtraTrait(player, 50, 56, 86, 87, 99)) {
            scale *= 0.62f;
        }
        if ((damageId.contains("explosion") || damageId.contains("sonic")) && hasAnyExtraTrait(player, 19, 22, 80, 87, 88, 95)) {
            scale *= 0.58f;
        }
        if ((damageId.contains("arrow") || damageId.contains("trident") || damageId.contains("mobProjectile") || damageId.contains("fireworks")) && hasAnyExtraTrait(player, 26, 80, 85, 88)) {
            scale *= 0.55f;
        }
        if ((damageId.contains("fall") || damageId.contains("flyIntoWall")) && (movement > 0 || hasAnyExtraTrait(player, 39, 70, 83))) {
            scale *= 0.35f;
        }
        if (mental >= 4 && (damageId.contains("indirectMagic") || damageId.contains("thorns"))) {
            scale *= 0.75f;
        }
        if (exotic >= 5 || rare >= 3) {
            scale *= 0.88f;
        }
        return Math.max(0.12f, scale);
    }

    private static double weaponDamageBonus(ServerPlayer player) {
        int powerMask = getEffectivePowerMask(player);
        if (!hasPower(powerMask, POWER_WEAPON_BOOST) && getWeaponBoostTicks(player) <= 0 && !hasPower(powerMask, POWER_BOSS) && getForm(player) < FORM_PRIME) {
            return 0.0;
        }
        int strengthTier = effectiveStrengthTier(player, hasFullSuit(player), getForm(player), powerMask);
        double bonus = 3.0 + strengthTier * 2.0;
        if (getWeaponBoostTicks(player) > 0) {
            bonus += 4.0;
        }
        return bonus;
    }

    private static void applyWallCrawl(ServerPlayer player, int powerMask) {
        boolean active = hasPower(powerMask, POWER_WALL_CRAWL) || hasPower(powerMask, POWER_NOIR) || getWallCrawlTicks(player) > 0 || hasPower(powerMask, POWER_BOSS);
        if (!active) {
            return;
        }
        if (player.horizontalCollision && !player.isCrouching()) {
            double climb = getWallCrawlTicks(player) > 0 ? 0.30 : 0.20;
            Vec3 delta = player.getDeltaMovement();
            player.setDeltaMovement(delta.x * 0.62, Math.max(delta.y, climb), delta.z * 0.62);
            player.fallDistance = 0.0f;
            player.hurtMarked = true;
            if (player.tickCount % 4 == 0) {
                ServerLevel level = player.serverLevel();
                level.sendParticles(ParticleTypes.CLOUD, player.getX(), player.getY() + 1.0, player.getZ(), 2, 0.1, 0.1, 0.1, 0.01);
            }
        }
    }

    private static void triggerSpeedOverdrive(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "特殊能力还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_SPEED) || getEffectiveSpeedTier(player) < 5) {
            tell(player, "速度档位还没达到最高档。");
            return;
        }
        if (getEnergy(player) < 14) {
            tell(player, "能量不足，无法启动极速爆发。");
            return;
        }
        setEnergy(player, getEnergy(player) - 14);
        setSpecialCooldown(player, 48);
        setSpeedCharge(player, speedChargeTarget(getEffectiveSpeedTier(player)));
        setChronoTicks(player, 20 * 10);
        player.level().playSound(null, player.blockPosition(), SoundEvents.ELYTRA_FLYING, SoundSource.PLAYERS, 1.0f, 1.85f);
        tell(player, "极速爆发已启动。");
    }

    private static void triggerDeepSea(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "特殊能力还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_DEEP_SEA)) {
            tell(player, "你还没有深海能力。");
            return;
        }
        if (getEnergy(player) < 8) {
            tell(player, "能量不足，无法展开深海适应。");
            return;
        }
        setEnergy(player, getEnergy(player) - 8);
        setSpecialCooldown(player, 30);
        setDeepSeaTicks(player, 20 * 120);
        player.setAirSupply(player.getMaxAirSupply());
        tell(player, "深海适应已展开。");
    }

    private static void triggerNoirShadow(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "特殊能力还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_NOIR)) {
            tell(player, "你还没有玄色潜影。");
            return;
        }
        if (getEnergy(player) < 10) {
            tell(player, "能量不足，无法展开玄色潜影。");
            return;
        }
        setEnergy(player, getEnergy(player) - 10);
        setSpecialCooldown(player, 45);
        setNoirTicks(player, 20 * 80);
        player.setInvisible(true);
        tell(player, "玄色潜影已开启。");
    }

    private static void triggerTeleportBlink(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "特殊能力还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_TELEPORT)) {
            tell(player, "你还没有瞬移能力。");
            return;
        }
        if (getEnergy(player) < 12) {
            tell(player, "能量不足，无法瞬移。");
            return;
        }
        Vec3 look = player.getLookAngle().normalize();
        Vec3 target = player.position().add(look.scale(12.0));
        boolean success = player.randomTeleport(target.x, target.y, target.z, true);
        if (!success) {
            tell(player, "瞬移失败，前方空间不安全。");
            return;
        }
        setEnergy(player, getEnergy(player) - 12);
        setSpecialCooldown(player, 24);
        ServerLevel level = player.serverLevel();
        level.sendParticles(ParticleTypes.PORTAL, player.getX(), player.getY() + 1.0, player.getZ(), 32, 0.5, 0.8, 0.5, 0.3);
        level.playSound(null, player.blockPosition(), SoundEvents.ENDERMAN_TELEPORT, SoundSource.PLAYERS, 1.0f, 1.0f);
        tell(player, "瞬移已完成。");
    }

    private static void triggerFlameWave(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "特殊能力还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_FLAME) && !hasPower(getEffectivePowerMask(player), POWER_HEAT)) {
            tell(player, "你还没有火焰能力。");
            return;
        }
        if (getEnergy(player) < 14) {
            tell(player, "能量不足，无法释放火焰波。");
            return;
        }
        setEnergy(player, getEnergy(player) - 14);
        setSpecialCooldown(player, 35);
        setFlameTicks(player, 20 * 30);
        ServerLevel level = player.serverLevel();
        Vec3 center = player.position().add(0, 1.0, 0);
        level.sendParticles(ParticleTypes.FLAME, center.x, center.y, center.z, 56, 1.0, 0.8, 1.0, 0.04);
        for (LivingEntity entity : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(7.0))) {
            if (entity == player || !entity.isAlive()) {
                continue;
            }
            entity.setSecondsOnFire(5);
            entity.hurt(player.damageSources().playerAttack(player), 6.0f + getSpeedTier(player));
        }
        level.playSound(null, player.blockPosition(), SoundEvents.BLAZE_SHOOT, SoundSource.PLAYERS, 1.0f, 0.95f);
        tell(player, "火焰波已释放。");
    }

    private static void triggerBloodBurst(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "特殊能力还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_BLOOD)) {
            tell(player, "你还没有血爆能力。");
            return;
        }
        if (getEnergy(player) < 18) {
            tell(player, "能量不足，无法引爆血液。");
            return;
        }
        LivingEntity target = findBeamTarget(player, player.getLookAngle().normalize(), 14.0, 0.84);
        if (target == null) {
            target = findNearestTarget(player, 6.5);
        }
        if (target == null) {
            tell(player, "附近没有可引爆目标。");
            return;
        }
        setEnergy(player, getEnergy(player) - 18);
        setSpecialCooldown(player, 50);
        float damage = Math.max(8.0f, target.getMaxHealth() * 0.32f);
        target.hurt(player.damageSources().playerAttack(player), damage);
        target.setDeltaMovement(target.getDeltaMovement().add(0.0, 0.4, 0.0));
        ServerLevel level = player.serverLevel();
        level.sendParticles(new DustParticleOptions(new Vector3f(0.88f, 0.05f, 0.05f), 2.0f), target.getX(), target.getY() + 0.5, target.getZ(), 48, 0.4, 0.5, 0.4, 0.08);
        level.playSound(null, target.blockPosition(), SoundEvents.GENERIC_EXPLODE, SoundSource.PLAYERS, 1.0f, 0.85f);
        tell(player, "血爆已触发。");
    }

    private static void triggerSuperRegen(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "特殊能力还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_REGEN)) {
            tell(player, "你还没有超速再生。");
            return;
        }
        if (getEnergy(player) < 10) {
            tell(player, "能量不足，无法启动超速再生。");
            return;
        }
        setEnergy(player, getEnergy(player) - 10);
        setSpecialCooldown(player, 35);
        setRegenTicks(player, 20 * 120);
        player.heal(4.0f);
        tell(player, "超速再生已启动。");
    }

    private static void triggerPowerPurgeBlast(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "净化爆震还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_PURGE) && !hasPower(getEffectivePowerMask(player), POWER_BOSS) && getForm(player) < FORM_PRIME) {
            tell(player, "你还没有净化爆震。");
            return;
        }
        if (getEnergy(player) < 26) {
            tell(player, "能量不足，无法引爆净化爆震。");
            return;
        }

        setEnergy(player, getEnergy(player) - 26);
        setSpecialCooldown(player, 80);
        setSurgeTicks(player, Math.max(getSurgeTicks(player), 20 * 6));
        setChronoTicks(player, 0);

        ServerLevel level = player.serverLevel();
        Vec3 center = player.position().add(0.0, 1.0, 0.0);
        level.playSound(null, player.blockPosition(), SoundEvents.WARDEN_SONIC_BOOM, SoundSource.PLAYERS, 1.6f, 0.82f);
        level.sendParticles(ParticleTypes.SONIC_BOOM, center.x, center.y, center.z, 1, 0.0, 0.0, 0.0, 0.0);
        level.sendParticles(ParticleTypes.EXPLOSION_EMITTER, center.x, center.y, center.z, 1, 0.0, 0.0, 0.0, 0.0);

        for (LivingEntity entity : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(10.0))) {
            if (entity == player || !entity.isAlive()) {
                continue;
            }
            if (entity instanceof ServerPlayer other && !other.isCreative() && !other.isSpectator()) {
                purgeHeroState(other);
            }
            entity.removeEffect(MobEffects.MOVEMENT_SPEED);
            entity.removeEffect(MobEffects.DAMAGE_BOOST);
            entity.removeEffect(MobEffects.REGENERATION);
            entity.removeEffect(MobEffects.ABSORPTION);
            entity.removeEffect(MobEffects.FIRE_RESISTANCE);
            entity.removeEffect(MobEffects.INVISIBILITY);
            entity.hurt(player.damageSources().playerAttack(player), 10.0f + getSpeedTier(player) * 2.0f);

            Vec3 away = entity.position().subtract(player.position());
            if (away.lengthSqr() > 0.01) {
                away = away.normalize();
                entity.setDeltaMovement(entity.getDeltaMovement().add(away.scale(1.5)).add(0.0, 0.45, 0.0));
                entity.hurtMarked = true;
            }
            level.sendParticles(ParticleTypes.SMOKE, entity.getX(), entity.getY() + 0.8, entity.getZ(), 16, 0.35, 0.45, 0.35, 0.02);
        }

        player.hurt(player.damageSources().playerAttack(player), 3.0f);
        player.setDeltaMovement(player.getDeltaMovement().add(0.0, 0.18, 0.0));
        tell(player, "净化爆震已释放，附近超能力被抑制。");
    }

    private static void triggerGravityWell(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "重力塌缩还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_GRAVITY) && !hasPower(getEffectivePowerMask(player), POWER_BOSS) && getForm(player) < FORM_PRIME) {
            tell(player, "你还没有重力场。");
            return;
        }
        if (getEnergy(player) < 16) {
            tell(player, "能量不足，无法压缩重力。");
            return;
        }

        setEnergy(player, getEnergy(player) - 16);
        setSpecialCooldown(player, 40);
        setSurgeTicks(player, Math.max(getSurgeTicks(player), 20 * 8));

        ServerLevel level = player.serverLevel();
        Vec3 center = player.position().add(0.0, 1.0, 0.0);
        level.playSound(null, player.blockPosition(), SoundEvents.AMETHYST_BLOCK_RESONATE, SoundSource.PLAYERS, 1.15f, 0.72f);
        level.sendParticles(ParticleTypes.PORTAL, center.x, center.y, center.z, 36, 0.7, 0.7, 0.7, 0.02);

        double radius = 6.0 + Math.min(6.0, getBodyTier(player) * 0.9);
        double pull = 0.18 + getBodyTier(player) * 0.06;
        for (LivingEntity entity : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(radius))) {
            if (entity == player || !entity.isAlive()) {
                continue;
            }
            if (entity instanceof ServerPlayer other && (other.isCreative() || other.isSpectator())) {
                continue;
            }
            Vec3 delta = player.position().subtract(entity.position());
            if (delta.lengthSqr() > 0.01) {
                Vec3 pullVec = delta.normalize().scale(pull);
                entity.setDeltaMovement(entity.getDeltaMovement().add(pullVec).add(0.0, -0.16, 0.0));
                entity.hurtMarked = true;
            }
            entity.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 60, 1, false, false, false));
            entity.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 60, 0, false, false, false));
        }

        player.addEffect(new MobEffectInstance(MobEffects.SLOW_FALLING, 80, 0, false, false, false));
        awardTierGrowth(player, BODY_TIER_KEY, BODY_CAP_KEY, BODY_XP_KEY, 6 + getBodyTier(player));
        tell(player, "重力塌缩已展开。");
    }

    private static void triggerSonicScream(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "音爆尖啸还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_SONIC) && !hasPower(getEffectivePowerMask(player), POWER_BOSS) && getForm(player) < FORM_PRIME) {
            tell(player, "你还没有声波共振。");
            return;
        }
        if (getEnergy(player) < 18) {
            tell(player, "能量不足，无法发出音爆。");
            return;
        }

        setEnergy(player, getEnergy(player) - 18);
        setSpecialCooldown(player, 45);
        setSurgeTicks(player, Math.max(getSurgeTicks(player), 20 * 10));

        ServerLevel level = player.serverLevel();
        Vec3 center = player.position().add(0.0, 1.0, 0.0);
        level.playSound(null, player.blockPosition(), SoundEvents.WARDEN_SONIC_BOOM, SoundSource.PLAYERS, 1.45f, 0.88f);
        level.sendParticles(ParticleTypes.SONIC_BOOM, center.x, center.y, center.z, 1, 0.0, 0.0, 0.0, 0.0);
        level.sendParticles(ParticleTypes.ELECTRIC_SPARK, center.x, center.y, center.z, 20, 0.6, 0.5, 0.6, 0.03);

        double radius = 8.0 + Math.min(6.0, getStrengthTier(player) * 0.8);
        float damage = 7.0f + getStrengthTier(player) * 1.8f;
        for (LivingEntity entity : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(radius))) {
            if (entity == player || !entity.isAlive()) {
                continue;
            }
            if (entity instanceof ServerPlayer other && (other.isCreative() || other.isSpectator())) {
                continue;
            }
            Vec3 away = entity.position().subtract(player.position());
            if (away.lengthSqr() > 0.01) {
                entity.setDeltaMovement(entity.getDeltaMovement().add(away.normalize().scale(1.1)).add(0.0, 0.18, 0.0));
                entity.hurtMarked = true;
            }
            entity.hurt(player.damageSources().playerAttack(player), damage);
            entity.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 60, 2, false, false, false));
            entity.addEffect(new MobEffectInstance(MobEffects.CONFUSION, 50, 0, false, false, false));
        }

        awardTierGrowth(player, STRENGTH_TIER_KEY, STRENGTH_CAP_KEY, STRENGTH_XP_KEY, 5 + getStrengthTier(player));
        tell(player, "音爆尖啸已释放。");
    }

    private static void triggerAnomalyBurst(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "异常脉冲还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_GLITCH) && !hasPower(getEffectivePowerMask(player), POWER_BOSS) && getForm(player) < FORM_PRIME) {
            tell(player, "你还没有异常扰动。");
            return;
        }
        if (getEnergy(player) < 14) {
            tell(player, "能量不足，无法释放异常脉冲。");
            return;
        }

        setEnergy(player, getEnergy(player) - 14);
        setSpecialCooldown(player, 35);
        setSurgeTicks(player, Math.max(getSurgeTicks(player), 20 * 8));

        ServerLevel level = player.serverLevel();
        Vec3 center = player.position().add(0.0, 1.0, 0.0);
        level.playSound(null, player.blockPosition(), SoundEvents.CONDUIT_AMBIENT, SoundSource.PLAYERS, 1.0f, 0.65f);
        level.sendParticles(ParticleTypes.PORTAL, center.x, center.y, center.z, 48, 1.0, 0.8, 1.0, 0.05);

        int roll = RANDOM.nextInt(4);
        if (roll == 0) {
            for (LivingEntity entity : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(6.5))) {
                if (entity == player || !entity.isAlive()) {
                    continue;
                }
                Vec3 delta = player.position().subtract(entity.position());
                if (delta.lengthSqr() > 0.01) {
                    entity.setDeltaMovement(entity.getDeltaMovement().add(delta.normalize().scale(0.35)).add(0.0, 0.22, 0.0));
                    entity.hurtMarked = true;
                }
                entity.addEffect(new MobEffectInstance(MobEffects.LEVITATION, 30, 0, false, false, false));
            }
        } else if (roll == 1) {
            for (LivingEntity entity : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(8.0))) {
                if (entity == player || !entity.isAlive()) {
                    continue;
                }
                Vec3 away = entity.position().subtract(player.position());
                if (away.lengthSqr() > 0.01) {
                    entity.setDeltaMovement(entity.getDeltaMovement().add(away.normalize().scale(0.9)));
                    entity.hurtMarked = true;
                }
                entity.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 40, 0, false, false, false));
            }
        } else if (roll == 2) {
            Vec3 look = player.getLookAngle().normalize();
            Vec3 target = player.position().add(look.scale(8.0 + RANDOM.nextInt(6)));
            player.randomTeleport(target.x, target.y, target.z, true);
        } else {
            for (LivingEntity entity : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(7.0))) {
                if (entity == player || !entity.isAlive()) {
                    continue;
                }
                entity.addEffect(new MobEffectInstance(MobEffects.GLOWING, 80, 0, false, false, true));
                entity.addEffect(new MobEffectInstance(MobEffects.CONFUSION, 60, 0, false, false, false));
                entity.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 40, 1, false, false, false));
            }
        }

        player.addEffect(new MobEffectInstance(MobEffects.LUCK, 100, 0, false, false, false));
        awardTierGrowth(player, BODY_TIER_KEY, BODY_CAP_KEY, BODY_XP_KEY, 2 + getBodyTier(player) / 2);
        awardTierGrowth(player, STRENGTH_TIER_KEY, STRENGTH_CAP_KEY, STRENGTH_XP_KEY, 2 + getStrengthTier(player) / 2);
        tell(player, "异常脉冲已释放。");
    }

    private static void triggerPhaseEcho(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "相位折跃还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_PHASE) && !hasPower(getEffectivePowerMask(player), POWER_BOSS) && getForm(player) < FORM_PRIME) {
            tell(player, "你还没有相位回声。");
            return;
        }
        if (getEnergy(player) < 12) {
            tell(player, "能量不足，无法稳定相位。");
            return;
        }

        setEnergy(player, getEnergy(player) - 12);
        setSpecialCooldown(player, 32);
        setSurgeTicks(player, Math.max(getSurgeTicks(player), 20 * 6));

        ServerLevel level = player.serverLevel();
        Vec3 before = player.position().add(0.0, 1.0, 0.0);
        Vec3 look = player.getLookAngle().normalize();
        double distance = 7.0 + Math.min(7.0, Math.max(getSpeedTier(player), getBodyTier(player)) * 1.15);
        Vec3 target = player.position().add(look.scale(distance)).add(0.0, 0.25, 0.0);

        level.playSound(null, player.blockPosition(), SoundEvents.ENDERMAN_TELEPORT, SoundSource.PLAYERS, 0.95f, 1.25f);
        level.sendParticles(ParticleTypes.PORTAL, before.x, before.y, before.z, 42, 0.55, 0.7, 0.55, 0.04);
        player.randomTeleport(target.x, target.y, target.z, true);
        Vec3 after = player.position().add(0.0, 1.0, 0.0);
        level.sendParticles(ParticleTypes.PORTAL, after.x, after.y, after.z, 54, 0.65, 0.8, 0.65, 0.06);
        level.sendParticles(ParticleTypes.ELECTRIC_SPARK, after.x, after.y, after.z, 18, 0.45, 0.45, 0.45, 0.03);

        player.addEffect(new MobEffectInstance(MobEffects.INVISIBILITY, 20 * 5, 0, false, false, true));
        player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 20 * 5, 1, false, false, false));
        player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 20 * 4, 1, false, false, false));
        player.fallDistance = 0.0f;

        double radius = 4.5 + Math.min(4.0, getBodyTier(player) * 0.6);
        for (LivingEntity entity : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(radius))) {
            if (entity == player || !entity.isAlive()) {
                continue;
            }
            if (entity instanceof ServerPlayer other && (other.isCreative() || other.isSpectator())) {
                continue;
            }
            entity.addEffect(new MobEffectInstance(MobEffects.CONFUSION, 60, 0, false, false, false));
            entity.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 45, 1, false, false, false));
            Vec3 away = entity.position().subtract(player.position());
            if (away.lengthSqr() > 0.01) {
                entity.setDeltaMovement(entity.getDeltaMovement().add(away.normalize().scale(0.55)).add(0.0, 0.12, 0.0));
                entity.hurtMarked = true;
            }
        }

        awardTierGrowth(player, SPEED_TIER_KEY, SPEED_CAP_KEY, SPEED_XP_KEY, 4 + getSpeedTier(player));
        awardTierGrowth(player, BODY_TIER_KEY, BODY_CAP_KEY, BODY_XP_KEY, 3 + getBodyTier(player) / 2);
        tell(player, "相位折跃已完成。");
    }

    private static void triggerSpeedLimitAuto(ServerPlayer player) {
        int before = getSpeedTier(player);
        setSpeedLimit(player, true, 2);
        enforceSpeedLimit(player, true);
        if (before <= 2) {
            tell(player, "已开启自动限速：T2。时停阈值为 T3 满蓄力。");
        }
    }

    private static void triggerSpeedLimitClear(ServerPlayer player) {
        setSpeedLimit(player, false, getSpeedLimitTier(player));
        tell(player, "自动限速已关闭。时停阈值仍为 T3 满蓄力。");
    }

    private static void triggerSelfExplosion(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "特殊能力还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_SELF_EXPLODE) && !hasPower(getEffectivePowerMask(player), POWER_BOSS) && getForm(player) < FORM_PRIME) {
            tell(player, "你还没有自身爆裂能力。");
            return;
        }
        if (getEnergy(player) < 20) {
            tell(player, "能量不足，无法引爆自身冲击。");
            return;
        }

        setEnergy(player, getEnergy(player) - 20);
        setSpecialCooldown(player, 60);

        ServerLevel level = player.serverLevel();
        Vec3 center = player.position().add(0.0, 1.0, 0.0);
        level.playSound(null, player.blockPosition(), SoundEvents.GENERIC_EXPLODE, SoundSource.PLAYERS, 1.3f, 0.9f);
        level.sendParticles(ParticleTypes.EXPLOSION_EMITTER, center.x, center.y, center.z, 1, 0.0, 0.0, 0.0, 0.0);
        level.sendParticles(ParticleTypes.SMOKE, center.x, center.y, center.z, 24, 0.8, 0.8, 0.8, 0.02);

        double radius = 7.0 + Math.min(3.0, getBodyTier(player) * 0.5);
        float damage = 12.0f + getStrengthTier(player) * 2.0f + getBodyTier(player) * 1.5f;
        for (LivingEntity entity : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(radius))) {
            if (!entity.isAlive()) {
                continue;
            }
            float dealt = entity == player ? Math.max(2.0f, damage * 0.22f) : damage;
            entity.hurt(player.damageSources().playerAttack(player), dealt);
            Vec3 away = entity.position().subtract(player.position());
            if (away.lengthSqr() > 0.01) {
                away = away.normalize();
                entity.setDeltaMovement(entity.getDeltaMovement().add(away.scale(1.2)).add(0.0, 0.35, 0.0));
                entity.hurtMarked = true;
            }
        }

        player.hurt(player.damageSources().playerAttack(player), Math.max(1.0f, 2.5f - getBodyTier(player) * 0.3f));
        player.setDeltaMovement(player.getDeltaMovement().add(0.0, 0.22, 0.0));
        tell(player, "自身爆裂已释放。");
    }

    private static void triggerWeaponOverclock(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "特殊能力还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_WEAPON_BOOST) && !hasPower(getEffectivePowerMask(player), POWER_BOSS) && getForm(player) < FORM_ELITE) {
            tell(player, "你还没有武器增伤能力。");
            return;
        }
        if (getEnergy(player) < 10) {
            tell(player, "能量不足，无法启动武器过载。");
            return;
        }

        setEnergy(player, getEnergy(player) - 10);
        setSpecialCooldown(player, 30);
        setWeaponBoostTicks(player, 20 * 45);
        player.level().playSound(null, player.blockPosition(), SoundEvents.ANVIL_USE, SoundSource.PLAYERS, 1.0f, 1.15f);
        tell(player, "武器过载已启动。");
    }

    private static void triggerWallCrawl(ServerPlayer player) {
        if (getSpecialCooldown(player) > 0) {
            tell(player, "特殊能力还在冷却。");
            return;
        }
        if (!hasPower(getEffectivePowerMask(player), POWER_WALL_CRAWL) && !hasPower(getEffectivePowerMask(player), POWER_NOIR) && !hasPower(getEffectivePowerMask(player), POWER_BOSS)) {
            tell(player, "你还没有墙面攀爬能力。");
            return;
        }
        if (getEnergy(player) < 6) {
            tell(player, "能量不足，无法展开墙面攀爬。");
            return;
        }

        setEnergy(player, getEnergy(player) - 6);
        setSpecialCooldown(player, 18);
        setWallCrawlTicks(player, 20 * 30);
        player.level().playSound(null, player.blockPosition(), SoundEvents.SLIME_BLOCK_STEP, SoundSource.PLAYERS, 0.85f, 1.15f);
        tell(player, "墙面攀爬已展开。");
    }

    private static void applyHeatBeam(ServerPlayer player, int powerMask) {
        if (!hasPower(powerMask, POWER_HEAT) && !hasPower(powerMask, POWER_FLAME)) {
            return;
        }
        if (getEnergy(player) <= 0) {
            setHeatTicks(player, 0);
            return;
        }
        ServerLevel level = player.serverLevel();
        Vec3 eye = player.getEyePosition();
        Vec3 look = player.getLookAngle().normalize();
        int powerTier = Math.max(1, getStrengthTier(player));
        for (int i = 1; i <= 22; i++) {
            Vec3 point = eye.add(look.scale(i * 1.0));
            level.sendParticles(new DustParticleOptions(new org.joml.Vector3f(1.0f, 0.05f, 0.05f), 1.3f), point.x, point.y, point.z, 2, 0.02, 0.02, 0.02, 0.0);
        }
        LivingEntity target = findBeamTarget(player, look, 20.0, 0.90);
        if (target != null) {
            target.setSecondsOnFire(4);
            target.hurt(player.damageSources().playerAttack(player), 2.5f + powerTier * 1.5f);
        }
        if (player.tickCount % 4 == 0) {
            setEnergy(player, getEnergy(player) - 1);
        }
    }

    private static void triggerHeatVision(ServerPlayer player) {
        int energy = getEnergy(player);
        int cooldown = getHeatCooldown(player);
        if (energy < 8) {
            tell(player, "能量不足，热视线无法启动。");
            return;
        }
        if (cooldown > 0) {
            tell(player, "热视线冷却中，还要 " + cooldown + " tick。");
            return;
        }
        setEnergy(player, energy - 8);
        setHeatCooldown(player, 25);
        setHeatTicks(player, 20 * 8);
        tell(player, "热视线进入长效灼射。");
    }

    private static void triggerFlightBurst(ServerPlayer player) {
        if (!hasFlightAbility(player)) {
            tell(player, "你还没有抽取到飞行能力。");
            return;
        }
        int energy = getEnergy(player);
        if (energy < 8) {
            tell(player, "能量不足，无法冲刺。");
            return;
        }
        Vec3 look = player.getLookAngle().normalize();
        player.setDeltaMovement(player.getDeltaMovement().add(look.scale(1.8)).add(0, 0.18, 0));
        player.hurtMarked = true;
        setEnergy(player, energy - 8);
        setSpecialCooldown(player, 10);
        player.level().playSound(null, player.blockPosition(), SoundEvents.ELYTRA_FLYING, SoundSource.PLAYERS, 0.8f, 1.15f);
        tell(player, "飞行冲刺已启动。");
    }

    private static void triggerLandingBurst(ServerPlayer player) {
        if (!hasFlightAbility(player)) {
            tell(player, "你还没有空中机动能力。");
            return;
        }
        if (player.onGround()) {
            ServerLevel level = player.serverLevel();
            level.playSound(null, player.blockPosition(), SoundEvents.GENERIC_EXPLODE, SoundSource.PLAYERS, 0.8f, 1.1f);
            level.sendParticles(ParticleTypes.EXPLOSION, player.getX(), player.getY() + 0.1, player.getZ(), 12, 0.5, 0.1, 0.5, 0.01);
            tell(player, "落地冲击已释放。");
        } else {
            tell(player, "需要在地面附近释放。");
        }
    }

    private static void triggerPowerSurge(ServerPlayer player) {
        setEnergy(player, Math.min(MAX_ENERGY, getEnergy(player) + 20));
        setSurgeTicks(player, Math.max(getSurgeTicks(player), 20 * 12));
        setSpecialCooldown(player, 10);
        if (player.getHealth() < player.getMaxHealth()) {
            player.heal(3.0f);
        }
        tell(player, "能力核心已过载充能。");
    }

    private static void triggerSuperPunch(ServerPlayer player) {
        if (getEnergy(player) < 10) {
            tell(player, "能量不足，超级力量无法激活。");
            return;
        }
        setEnergy(player, getEnergy(player) - 10);
        setSurgeTicks(player, Math.max(getSurgeTicks(player), 20 * 15));
        setSpecialCooldown(player, 10);
        player.level().playSound(null, player.blockPosition(), SoundEvents.PLAYER_ATTACK_CRIT, SoundSource.PLAYERS, 1.0f, 0.8f);
        tell(player, "超级力量爆发。");
    }

    private static void triggerStarlightFlash(ServerPlayer player) {
        if (!hasPower(getEffectivePowerMask(player), POWER_STARLIGHT) && !hasPower(getEffectivePowerMask(player), POWER_BOSS) && getForm(player) < FORM_PRIME) {
            tell(player, "你还没有星光能力。");
            return;
        }
        if (getEnergy(player) < 12) {
            tell(player, "能量不足，星光闪耀无法释放。");
            return;
        }
        setEnergy(player, getEnergy(player) - 12);
        setSpecialCooldown(player, 20);
        ServerLevel level = player.serverLevel();
        Vec3 center = player.position().add(0, 1.0, 0);
        level.sendParticles(new DustParticleOptions(new Vector3f(0.95f, 0.95f, 0.25f), 1.8f), center.x, center.y, center.z, 36, 1.0, 0.6, 1.0, 0.02);
        level.playSound(null, player.blockPosition(), SoundEvents.AMETHYST_BLOCK_CHIME, SoundSource.PLAYERS, 1.0f, 1.2f);
        for (LivingEntity entity : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(7.5))) {
            if (entity != player && entity.distanceTo(player) < 7.5f) {
                entity.addEffect(new MobEffectInstance(MobEffects.GLOWING, 60, 0, false, true, true));
            }
        }
        tell(player, "星光闪耀已释放。");
    }

    private static void triggerBossRoar(ServerPlayer player) {
        int currentMask = getPowerMask(player);
        int currentArchetype = getArchetype(player);
        if (currentArchetype == ARCHETYPE_NONE) {
            currentArchetype = bossRoarArchetypeFromMask(currentMask);
        }
        int boostedMask = currentMask | POWER_STRENGTH | POWER_RESIST | POWER_BOSS | POWER_REGEN | signatureAbilityFor(currentArchetype);
        if (currentArchetype == ARCHETYPE_HOMELANDER || currentArchetype == ARCHETYPE_A_TRAIN) {
            boostedMask |= POWER_SPEED;
        }
        if (currentArchetype == ARCHETYPE_SOLDIER_BOY) {
            boostedMask |= POWER_PURGE | POWER_SELF_EXPLODE | POWER_WEAPON_BOOST;
        }

        setForm(player, FORM_PRIME, 20 * 30);
        setStrengthTier(player, Math.max(6, getStrengthTier(player)));
        setBodyTier(player, Math.max(6, getBodyTier(player)));
        setArchetype(player, currentArchetype);
        setSpeedTier(player, Math.max(bossRoarSpeedFloor(currentArchetype), getSpeedTier(player)));
        setTierCap(player, STRENGTH_CAP_KEY, Math.max(getTierCap(player, STRENGTH_CAP_KEY, getStrengthTier(player)), 6));
        setTierCap(player, BODY_CAP_KEY, Math.max(getTierCap(player, BODY_CAP_KEY, getBodyTier(player)), 6));
        setTierCap(player, SPEED_CAP_KEY, Math.max(getTierCap(player, SPEED_CAP_KEY, getSpeedTier(player)), 6));
        setPowerMask(player, boostedMask);
        setSurgeTicks(player, Math.max(getSurgeTicks(player), 20 * 8));
        setChronoTicks(player, 20 * 6);
        player.level().playSound(null, player.blockPosition(), SoundEvents.WARDEN_ROAR, SoundSource.PLAYERS, 1.0f, 0.9f);
        tell(player, "Boss 咆哮已激活：" + describeArchetype(currentArchetype) + " 模板保持不变。");
    }

    private static int bossRoarArchetypeFromMask(int powerMask) {
        if (hasPower(powerMask, POWER_PURGE) || hasPower(powerMask, POWER_SELF_EXPLODE)) {
            return ARCHETYPE_SOLDIER_BOY;
        }
        if (hasPower(powerMask, POWER_STARLIGHT)) {
            return ARCHETYPE_STARLIGHT;
        }
        if (hasPower(powerMask, POWER_SPEED)) {
            return ARCHETYPE_A_TRAIN;
        }
        if (hasPower(powerMask, POWER_INVISIBLE_SKIN)) {
            return ARCHETYPE_TRANSLUCENT;
        }
        if (hasPower(powerMask, POWER_HEAT) || hasPower(powerMask, POWER_FLIGHT)) {
            return ARCHETYPE_HOMELANDER;
        }
        return ARCHETYPE_CORE;
    }

    private static int bossRoarSpeedFloor(int archetype) {
        return switch (archetype) {
            case ARCHETYPE_A_TRAIN -> 6;
            case ARCHETYPE_HOMELANDER -> 4;
            case ARCHETYPE_SOLDIER_BOY -> 2;
            default -> 3;
        };
    }

    private static LivingEntity findBeamTarget(ServerPlayer player, Vec3 look, double range, double alignmentThreshold) {
        double bestScore = Double.MAX_VALUE;
        LivingEntity best = null;
        for (LivingEntity entity : player.level().getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(range))) {
            if (entity == player || !entity.isAlive()) {
                continue;
            }
            Vec3 delta = entity.getEyePosition().subtract(player.getEyePosition());
            double distance = delta.length();
            if (distance > range) {
                continue;
            }
            double alignment = delta.normalize().dot(look);
            if (alignment < alignmentThreshold) {
                continue;
            }
            double score = distance - alignment * 4.0;
            if (score < bestScore) {
                bestScore = score;
                best = entity;
            }
        }
        return best;
    }

    private static LivingEntity findNearestTarget(ServerPlayer player, double range) {
        double bestDistance = Double.MAX_VALUE;
        LivingEntity best = null;
        for (LivingEntity entity : player.level().getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(range))) {
            if (entity == player || !entity.isAlive()) {
                continue;
            }
            double distance = entity.distanceTo(player);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = entity;
            }
        }
        return best;
    }

    private static boolean hasFullSuit(Player player) {
        return player.getItemBySlot(net.minecraft.world.entity.EquipmentSlot.HEAD).is(ModItems.HOMELANDER_HELMET.get())
            && player.getItemBySlot(net.minecraft.world.entity.EquipmentSlot.CHEST).is(ModItems.HOMELANDER_CHESTPLATE.get())
            && player.getItemBySlot(net.minecraft.world.entity.EquipmentSlot.LEGS).is(ModItems.HOMELANDER_LEGGINGS.get())
            && player.getItemBySlot(net.minecraft.world.entity.EquipmentSlot.FEET).is(ModItems.HOMELANDER_BOOTS.get());
    }

    private static boolean hasFlightAbility(ServerPlayer player) {
        return hasFlightAbility(player, hasFullSuit(player), getEffectivePowerMask(player));
    }

    private static boolean hasFlightAbility(ServerPlayer player, boolean suit, int powerMask) {
        return player.getAbilities().instabuild || player.isCreative() || player.isSpectator()
            || suit || hasPower(powerMask, POWER_FLIGHT);
    }

    private static boolean hasHeroState(Player player) {
        return hasFullSuit(player) || getForm(player) != FORM_NONE || getEffectivePowerMask(player) != 0 || extraTraitCount(player) > 0;
    }

    private static void refuel(ServerPlayer player, int amount, String message) {
        setEnergy(player, Math.min(MAX_ENERGY, getEnergy(player) + amount));
        if (getHeatCooldown(player) > 0) {
            setHeatCooldown(player, Math.max(0, getHeatCooldown(player) - 10));
        }
        if (player.getHealth() < player.getMaxHealth()) {
            player.heal(2.0f);
        }
        tell(player, message);
    }

    private static void applyTrialCard(ServerPlayer player, int mask, int ticks, int strengthTier, int bodyTier, int speedTier, String message) {
        setTemporaryPowers(player, mask, ticks, strengthTier, bodyTier, speedTier);
        setEnergy(player, Math.min(MAX_ENERGY, getEnergy(player) + 70));
        if (hasPower(mask, POWER_HEAT)) {
            setHeatCooldown(player, Math.max(0, getHeatCooldown(player) - 60));
        }
        if (hasPower(mask, POWER_SPEED) && getEffectiveSpeedTier(player) >= 3) {
            tell(player, message + " 时缓阈值：T3 满蓄力。");
        } else {
            tell(player, message);
        }
        sendHudState(player);
    }

    private static void applyRandomTrialCard(ServerPlayer player) {
        switch (RANDOM.nextInt(8)) {
            case 0 -> applyTrialCard(player, POWER_HEAT, 20 * 180, 2, 0, 0, "随机体验卡命中：热视线。");
            case 1 -> applyTrialCard(player, POWER_FLIGHT, 20 * 240, 0, 1, 0, "随机体验卡命中：飞行。");
            case 2 -> applyTrialCard(player, POWER_SPEED, 20 * 180, 0, 0, 4, "随机体验卡命中：极速。");
            case 3 -> {
                applyTrialCard(player, POWER_STARLIGHT | POWER_REGEN, 20 * 210, 1, 3, 1, "随机体验卡命中：星光。");
                setSurgeTicks(player, Math.max(getSurgeTicks(player), 20 * 14));
            }
            case 4 -> {
                applyTrialCard(player, POWER_NOIR | POWER_WALL_CRAWL | POWER_INVISIBLE_SKIN, 20 * 210, 1, 4, 2, "随机体验卡命中：玄色潜影。");
                setNoirTicks(player, Math.max(getNoirTicks(player), 20 * 90));
                setWallCrawlTicks(player, Math.max(getWallCrawlTicks(player), 20 * 90));
            }
            case 5 -> applyTrialCard(player, POWER_GRAVITY, 20 * 150, 0, 3, 0, "随机体验卡命中：重力场。");
            case 6 -> applyTrialCard(player, POWER_PHASE | POWER_TELEPORT, 20 * 150, 0, 2, 2, "随机体验卡命中：相位折跃。");
            default -> applyTrialCard(player, POWER_SONIC | POWER_WEAPON_BOOST, 20 * 150, 2, 0, 0, "随机体验卡命中：音爆武装。");
        }
    }

    private static void add(ServerPlayer player, MobEffect effect, int duration) {
        add(player, effect, duration, 0);
    }

    private static void add(ServerPlayer player, MobEffect effect, int duration, int amplifier) {
        player.addEffect(new MobEffectInstance(effect, duration, amplifier, false, true, true));
    }

    private static void tell(ServerPlayer player, String text) {
        player.displayClientMessage(Component.literal("[BlockForge] " + text), true);
    }

    private static String statusLine(ServerPlayer player) {
        int speedTier = getSpeedTier(player);
        int target = speedChargeTarget(speedTier);
        return "能量 " + getEnergy(player) + "/" + MAX_ENERGY
            + " | 热视线 " + getHeatCooldown(player)
            + " | 特殊冷却 " + getSpecialCooldown(player)
            + " | 力量 T" + getStrengthTier(player)
            + " | 钢铁之躯 T" + getBodyTier(player)
            + " | 速度 S" + speedTier + " " + getSpeedCharge(player) + "/" + target
            + " | 模板 " + describeArchetype(getArchetype(player))
            + " | 形态 " + describeForm(player)
            + " | 抽取 " + getRoll(player);
    }
    private static void sendHudState(ServerPlayer player) {
        ModNetwork.sendAbilityState(player, new ModNetwork.AbilityStatePacket(
            getEnergy(player),
            getHeatCooldown(player),
            getSpecialCooldown(player),
            getForm(player),
            getEffectivePowerMask(player),
            getEffectiveSpeedTier(player),
            getSpeedCharge(player),
            getChronoTicks(player),
            isSpeedLimitEnabled(player) ? 1 : 0,
            getSpeedLimitTier(player),
            getDeepSeaTicks(player),
            getNoirTicks(player),
            getFlameTicks(player),
            getRegenTicks(player),
            getSurgeTicks(player),
            Math.max(getStrengthTier(player), getTempStrengthTier(player)),
            Math.max(getBodyTier(player), getTempBodyTier(player)),
            getArchetype(player),
            extraTraitSummary(player)
        ));
    }

    private static int getEnergy(ServerPlayer player) {
        return player.getPersistentData().getInt(ENERGY_KEY);
    }

    private static void setEnergy(ServerPlayer player, int value) {
        player.getPersistentData().putInt(ENERGY_KEY, Math.max(0, Math.min(MAX_ENERGY, value)));
    }

    private static int getHeatCooldown(ServerPlayer player) {
        return player.getPersistentData().getInt(HEAT_CD_KEY);
    }

    private static void setHeatCooldown(ServerPlayer player, int value) {
        player.getPersistentData().putInt(HEAT_CD_KEY, Math.max(0, value));
    }

    private static int getSpecialCooldown(ServerPlayer player) {
        return player.getPersistentData().getInt(SPECIAL_CD_KEY);
    }

    private static void setSpecialCooldown(ServerPlayer player, int value) {
        player.getPersistentData().putInt(SPECIAL_CD_KEY, Math.max(0, value));
    }

    private static int getRoll(ServerPlayer player) {
        return player.getPersistentData().getInt(ROLL_KEY);
    }

    private static void setRoll(ServerPlayer player, int value) {
        player.getPersistentData().putInt(ROLL_KEY, value);
    }

    private static int getForm(Player player) {
        return player.getPersistentData().getInt(FORM_KEY);
    }

    private static void setForm(ServerPlayer player, int form, int ticks) {
        player.getPersistentData().putInt(FORM_KEY, Math.max(FORM_NONE, Math.min(FORM_PRIME, form)));
        player.getPersistentData().putInt(FORM_TICKS_KEY, ticks == PERMANENT_FORM_TICKS ? PERMANENT_FORM_TICKS : Math.max(0, ticks));
    }

    private static int getPowerMask(Player player) {
        return player.getPersistentData().getInt(POWER_MASK_KEY);
    }

    private static void setPowerMask(ServerPlayer player, int mask) {
        player.getPersistentData().putInt(POWER_MASK_KEY, mask);
    }

    private static int getEffectivePowerMask(Player player) {
        return getPowerMask(player) | getTempPowerMask(player);
    }

    private static int getTempPowerMask(Player player) {
        return getTempPowerTicks(player) > 0 ? player.getPersistentData().getInt(TEMP_POWER_MASK_KEY) : 0;
    }

    private static int getTempPowerTicks(Player player) {
        return Math.max(0, player.getPersistentData().getInt(TEMP_POWER_TICKS_KEY));
    }

    private static int getTempStrengthTier(Player player) {
        return getTempPowerTicks(player) > 0 ? clampTier(player.getPersistentData().getInt(TEMP_STRENGTH_TIER_KEY)) : 0;
    }

    private static int getTempBodyTier(Player player) {
        return getTempPowerTicks(player) > 0 ? clampTier(player.getPersistentData().getInt(TEMP_BODY_TIER_KEY)) : 0;
    }

    private static int getTempSpeedTier(Player player) {
        return getTempPowerTicks(player) > 0 ? clampTier(player.getPersistentData().getInt(TEMP_SPEED_TIER_KEY)) : 0;
    }

    private static int getEffectiveSpeedTier(Player player) {
        return Math.max(clampTier(getSpeedTier(player)), getTempSpeedTier(player));
    }

    private static void setTemporaryPowers(ServerPlayer player, int mask, int ticks, int strengthTier, int bodyTier, int speedTier) {
        if (ticks <= 0) {
            return;
        }
        int cappedSpeedTier = clampTier(speedTier);
        if (cappedSpeedTier > 0 && isSpeedLimitEnabled(player) && getSpeedLimitTier(player) > 0) {
            cappedSpeedTier = Math.min(cappedSpeedTier, getSpeedLimitTier(player));
        }
        player.getPersistentData().putInt(TEMP_POWER_MASK_KEY, getTempPowerMask(player) | mask);
        player.getPersistentData().putInt(TEMP_POWER_TICKS_KEY, Math.max(getTempPowerTicks(player), ticks));
        player.getPersistentData().putInt(TEMP_STRENGTH_TIER_KEY, Math.max(getTempStrengthTier(player), clampTier(strengthTier)));
        player.getPersistentData().putInt(TEMP_BODY_TIER_KEY, Math.max(getTempBodyTier(player), clampTier(bodyTier)));
        player.getPersistentData().putInt(TEMP_SPEED_TIER_KEY, Math.max(getTempSpeedTier(player), cappedSpeedTier));
        if (getForm(player) == FORM_NONE) {
            setForm(player, FORM_MIXED, ticks);
        }
        if (getArchetype(player) == ARCHETYPE_NONE) {
            setArchetype(player, ARCHETYPE_CORE);
        }
    }

    private static void clearTemporaryPowers(ServerPlayer player) {
        player.getPersistentData().putInt(TEMP_POWER_MASK_KEY, 0);
        player.getPersistentData().putInt(TEMP_POWER_TICKS_KEY, 0);
        player.getPersistentData().putInt(TEMP_STRENGTH_TIER_KEY, 0);
        player.getPersistentData().putInt(TEMP_BODY_TIER_KEY, 0);
        player.getPersistentData().putInt(TEMP_SPEED_TIER_KEY, 0);
    }

    private static int getStrengthTier(Player player) {
        return player.getPersistentData().getInt(STRENGTH_TIER_KEY);
    }

    private static void setStrengthTier(ServerPlayer player, int tier) {
        player.getPersistentData().putInt(STRENGTH_TIER_KEY, clampTier(tier));
    }

    private static int getBodyTier(Player player) {
        return player.getPersistentData().getInt(BODY_TIER_KEY);
    }

    private static void setBodyTier(ServerPlayer player, int tier) {
        player.getPersistentData().putInt(BODY_TIER_KEY, clampTier(tier));
    }

    private static int getArchetype(Player player) {
        return player.getPersistentData().getInt(ARCHETYPE_KEY);
    }

    private static void setArchetype(ServerPlayer player, int archetype) {
        player.getPersistentData().putInt(ARCHETYPE_KEY, Math.max(ARCHETYPE_NONE, archetype));
    }

    private static int getSurgeTicks(Player player) {
        return player.getPersistentData().getInt(SURGE_TICKS_KEY);
    }

    private static void setSurgeTicks(ServerPlayer player, int ticks) {
        player.getPersistentData().putInt(SURGE_TICKS_KEY, Math.max(0, ticks));
    }

    private static int getSpeedTier(Player player) {
        return player.getPersistentData().getInt(SPEED_TIER_KEY);
    }

    private static void setSpeedTier(ServerPlayer player, int tier) {
        player.getPersistentData().putInt(SPEED_TIER_KEY, clampTier(tier));
    }

    private static boolean isSpeedLimitEnabled(Player player) {
        return player.getPersistentData().getInt(SPEED_LIMIT_ENABLED_KEY) != 0;
    }

    private static int getSpeedLimitTier(Player player) {
        return clampTier(player.getPersistentData().getInt(SPEED_LIMIT_KEY));
    }

    private static void setSpeedLimit(ServerPlayer player, boolean enabled, int tier) {
        player.getPersistentData().putInt(SPEED_LIMIT_ENABLED_KEY, enabled ? 1 : 0);
        player.getPersistentData().putInt(SPEED_LIMIT_KEY, clampTier(tier));
    }

    private static int getSpeedCharge(Player player) {
        return player.getPersistentData().getInt(SPEED_CHARGE_KEY);
    }

    private static void setSpeedCharge(ServerPlayer player, int value) {
        player.getPersistentData().putInt(SPEED_CHARGE_KEY, Math.max(0, value));
    }

    private static int getChronoTicks(Player player) {
        return player.getPersistentData().getInt(CHRONO_TICKS_KEY);
    }

    private static void setChronoTicks(ServerPlayer player, int value) {
        player.getPersistentData().putInt(CHRONO_TICKS_KEY, Math.max(0, value));
    }

    private static int getHeatTicks(Player player) {
        return player.getPersistentData().getInt(HEAT_TICKS_KEY);
    }

    private static void setHeatTicks(ServerPlayer player, int value) {
        player.getPersistentData().putInt(HEAT_TICKS_KEY, Math.max(0, value));
    }

    private static int getDeepSeaTicks(Player player) {
        return player.getPersistentData().getInt(DEEP_SEA_TICKS_KEY);
    }

    private static void setDeepSeaTicks(ServerPlayer player, int value) {
        player.getPersistentData().putInt(DEEP_SEA_TICKS_KEY, Math.max(0, value));
    }

    private static int getNoirTicks(Player player) {
        return player.getPersistentData().getInt(NOIR_TICKS_KEY);
    }

    private static void setNoirTicks(ServerPlayer player, int value) {
        player.getPersistentData().putInt(NOIR_TICKS_KEY, Math.max(0, value));
    }

    private static int getFlameTicks(Player player) {
        return player.getPersistentData().getInt(FLAME_TICKS_KEY);
    }

    private static void setFlameTicks(ServerPlayer player, int value) {
        player.getPersistentData().putInt(FLAME_TICKS_KEY, Math.max(0, value));
    }

    private static int getRegenTicks(Player player) {
        return player.getPersistentData().getInt(REGEN_TICKS_KEY);
    }

    private static void setRegenTicks(ServerPlayer player, int value) {
        player.getPersistentData().putInt(REGEN_TICKS_KEY, Math.max(0, value));
    }

    private static int getWeaponBoostTicks(Player player) {
        return player.getPersistentData().getInt(WEAPON_BOOST_TICKS_KEY);
    }

    private static void setWeaponBoostTicks(ServerPlayer player, int value) {
        player.getPersistentData().putInt(WEAPON_BOOST_TICKS_KEY, Math.max(0, value));
    }

    private static int getWallCrawlTicks(Player player) {
        return player.getPersistentData().getInt(WALL_CRAWL_TICKS_KEY);
    }

    private static void setWallCrawlTicks(ServerPlayer player, int value) {
        player.getPersistentData().putInt(WALL_CRAWL_TICKS_KEY, Math.max(0, value));
    }

    private static void tickTimers(ServerPlayer player) {
        int formTicks = player.getPersistentData().getInt(FORM_TICKS_KEY);
        if (formTicks > 0) {
            player.getPersistentData().putInt(FORM_TICKS_KEY, formTicks - 1);
        } else if (formTicks == 0 && getForm(player) != FORM_NONE && getStrengthTier(player) <= 0 && getBodyTier(player) <= 0) {
            player.getPersistentData().putInt(FORM_KEY, FORM_NONE);
            player.getPersistentData().putInt(POWER_MASK_KEY, 0);
            player.getPersistentData().putInt(STRENGTH_TIER_KEY, 0);
            player.getPersistentData().putInt(BODY_TIER_KEY, 0);
            player.getPersistentData().putInt(ARCHETYPE_KEY, ARCHETYPE_NONE);
            player.getPersistentData().putInt(SPEED_TIER_KEY, 0);
            player.getPersistentData().putInt(SPEED_CHARGE_KEY, 0);
            player.getPersistentData().putInt(CHRONO_TICKS_KEY, 0);
            player.getPersistentData().putInt(DEEP_SEA_TICKS_KEY, 0);
            player.getPersistentData().putInt(NOIR_TICKS_KEY, 0);
            player.getPersistentData().putInt(FLAME_TICKS_KEY, 0);
            player.getPersistentData().putInt(REGEN_TICKS_KEY, 0);
            if (player.isInvisible()) {
                player.setInvisible(false);
            }
        }

        int surgeTicks = getSurgeTicks(player);
        if (surgeTicks > 0) {
            setSurgeTicks(player, surgeTicks - 1);
        }

        int special = getSpecialCooldown(player);
        if (special > 0) {
            setSpecialCooldown(player, special - 1);
        }
        int heatTicks = getHeatTicks(player);
        if (heatTicks > 0) {
            setHeatTicks(player, heatTicks - 1);
            applyHeatBeam(player, getEffectivePowerMask(player));
        }


        int chrono = getChronoTicks(player);
        if (chrono > 0) {
            setChronoTicks(player, chrono - 1);
        }

        int deepSea = getDeepSeaTicks(player);
        if (deepSea > 0) {
            setDeepSeaTicks(player, deepSea - 1);
        }

        int noir = getNoirTicks(player);
        if (noir > 0) {
            setNoirTicks(player, noir - 1);
        }

        int flame = getFlameTicks(player);
        if (flame > 0) {
            setFlameTicks(player, flame - 1);
        }

        int regen = getRegenTicks(player);
        if (regen > 0) {
            setRegenTicks(player, regen - 1);
        }

        int weaponBoost = getWeaponBoostTicks(player);
        if (weaponBoost > 0) {
            setWeaponBoostTicks(player, weaponBoost - 1);
        }

        int wallCrawl = getWallCrawlTicks(player);
        if (wallCrawl > 0) {
            setWallCrawlTicks(player, wallCrawl - 1);
        }

        int tempPowerTicks = getTempPowerTicks(player);
        if (tempPowerTicks > 1) {
            player.getPersistentData().putInt(TEMP_POWER_TICKS_KEY, tempPowerTicks - 1);
        } else if (tempPowerTicks == 1) {
            clearTemporaryPowers(player);
            tell(player, "超能力体验卡效果已结束。");
        }
    }

    private static void cloneState(ServerPlayer original, ServerPlayer clone) {
        clone.getPersistentData().putInt(ENERGY_KEY, original.getPersistentData().getInt(ENERGY_KEY));
        clone.getPersistentData().putInt(HEAT_CD_KEY, original.getPersistentData().getInt(HEAT_CD_KEY));
        clone.getPersistentData().putInt(SPECIAL_CD_KEY, original.getPersistentData().getInt(SPECIAL_CD_KEY));
        clone.getPersistentData().putInt(ROLL_KEY, original.getPersistentData().getInt(ROLL_KEY));
        clone.getPersistentData().putInt(FORM_KEY, original.getPersistentData().getInt(FORM_KEY));
        clone.getPersistentData().putInt(FORM_TICKS_KEY, original.getPersistentData().getInt(FORM_TICKS_KEY));
        clone.getPersistentData().putInt(SURGE_TICKS_KEY, original.getPersistentData().getInt(SURGE_TICKS_KEY));
        clone.getPersistentData().putInt(POWER_MASK_KEY, original.getPersistentData().getInt(POWER_MASK_KEY));
        clone.getPersistentData().putInt(STRENGTH_TIER_KEY, original.getPersistentData().getInt(STRENGTH_TIER_KEY));
        clone.getPersistentData().putInt(BODY_TIER_KEY, original.getPersistentData().getInt(BODY_TIER_KEY));
        clone.getPersistentData().putInt(ARCHETYPE_KEY, original.getPersistentData().getInt(ARCHETYPE_KEY));
        clone.getPersistentData().putInt(SPEED_TIER_KEY, original.getPersistentData().getInt(SPEED_TIER_KEY));
        clone.getPersistentData().putInt(SPEED_CHARGE_KEY, original.getPersistentData().getInt(SPEED_CHARGE_KEY));
        clone.getPersistentData().putInt(CHRONO_TICKS_KEY, original.getPersistentData().getInt(CHRONO_TICKS_KEY));
        clone.getPersistentData().putInt(SPEED_LIMIT_ENABLED_KEY, original.getPersistentData().getInt(SPEED_LIMIT_ENABLED_KEY));
        clone.getPersistentData().putInt(SPEED_LIMIT_KEY, original.getPersistentData().getInt(SPEED_LIMIT_KEY));
        clone.getPersistentData().putInt(STRENGTH_CAP_KEY, original.getPersistentData().getInt(STRENGTH_CAP_KEY));
        clone.getPersistentData().putInt(BODY_CAP_KEY, original.getPersistentData().getInt(BODY_CAP_KEY));
        clone.getPersistentData().putInt(SPEED_CAP_KEY, original.getPersistentData().getInt(SPEED_CAP_KEY));
        clone.getPersistentData().putInt(STRENGTH_XP_KEY, original.getPersistentData().getInt(STRENGTH_XP_KEY));
        clone.getPersistentData().putInt(BODY_XP_KEY, original.getPersistentData().getInt(BODY_XP_KEY));
        clone.getPersistentData().putInt(SPEED_XP_KEY, original.getPersistentData().getInt(SPEED_XP_KEY));
        clone.getPersistentData().putInt(DEEP_SEA_TICKS_KEY, original.getPersistentData().getInt(DEEP_SEA_TICKS_KEY));
        clone.getPersistentData().putInt(NOIR_TICKS_KEY, original.getPersistentData().getInt(NOIR_TICKS_KEY));
        clone.getPersistentData().putInt(FLAME_TICKS_KEY, original.getPersistentData().getInt(FLAME_TICKS_KEY));
        clone.getPersistentData().putInt(REGEN_TICKS_KEY, original.getPersistentData().getInt(REGEN_TICKS_KEY));
        clone.getPersistentData().putInt(WEAPON_BOOST_TICKS_KEY, original.getPersistentData().getInt(WEAPON_BOOST_TICKS_KEY));
        clone.getPersistentData().putInt(WALL_CRAWL_TICKS_KEY, original.getPersistentData().getInt(WALL_CRAWL_TICKS_KEY));
        for (int slot = 0; slot < 2; slot++) {
            clone.getPersistentData().putLong(EXTRA_TRAIT_MASK_PREFIX + slot, original.getPersistentData().getLong(EXTRA_TRAIT_MASK_PREFIX + slot));
        }
    }

    private static boolean hasPower(int mask, int power) {
        return (mask & power) != 0;
    }

    private static boolean hasExtraTrait(Player player, int index) {
        if (index < 0 || index >= EXTRA_TRAIT_COUNT) {
            return false;
        }
        int slot = index / 64;
        int bit = index % 64;
        return (player.getPersistentData().getLong(EXTRA_TRAIT_MASK_PREFIX + slot) & (1L << bit)) != 0L;
    }

    private static boolean hasAnyExtraTrait(Player player, int... indices) {
        for (int index : indices) {
            if (hasExtraTrait(player, index)) {
                return true;
            }
        }
        return false;
    }

    private static void addExtraTrait(ServerPlayer player, int index) {
        if (index < 0 || index >= EXTRA_TRAIT_COUNT) {
            return;
        }
        int slot = index / 64;
        int bit = index % 64;
        long mask = player.getPersistentData().getLong(EXTRA_TRAIT_MASK_PREFIX + slot);
        player.getPersistentData().putLong(EXTRA_TRAIT_MASK_PREFIX + slot, mask | (1L << bit));
    }

    private static void clearExtraTraits(ServerPlayer player) {
        for (int slot = 0; slot < 2; slot++) {
            player.getPersistentData().putLong(EXTRA_TRAIT_MASK_PREFIX + slot, 0L);
        }
    }

    private static int extraTraitCount(Player player) {
        int count = 0;
        for (int slot = 0; slot < 2; slot++) {
            count += Long.bitCount(player.getPersistentData().getLong(EXTRA_TRAIT_MASK_PREFIX + slot));
        }
        return count;
    }

    private static int traitCountInRange(Player player, int startInclusive, int endExclusive) {
        int count = 0;
        int start = Math.max(0, startInclusive);
        int end = Math.min(EXTRA_TRAIT_COUNT, endExclusive);
        for (int i = start; i < end; i++) {
            if (hasExtraTrait(player, i)) {
                count++;
            }
        }
        return count;
    }

    private static int extraTraitEnergyRegen(Player player) {
        int sensory = traitCountInRange(player, 0, 10);
        int metabolism = traitCountInRange(player, 40, 50);
        int energy = traitCountInRange(player, 60, 70);
        int rare = traitCountInRange(player, 80, 100);
        int regen = sensory / 6 + metabolism / 2 + energy / 2 + rare / 3;
        if (hasAnyExtraTrait(player, 62, 67, 69, 94)) {
            regen += 1;
        }
        return Math.min(6, regen);
    }

    private static void grantTraitBundle(ServerPlayer player, int amount, int maxIndexExclusive) {
        int limit = Math.max(1, Math.min(EXTRA_TRAIT_COUNT, maxIndexExclusive));
        int attempts = 0;
        while (amount > 0 && attempts < 400) {
            int trait = drawExtraTrait(limit);
            if (!hasExtraTrait(player, trait)) {
                addExtraTrait(player, trait);
                amount--;
            }
            attempts++;
        }
        tell(player, "获得 V 特质：" + extraTraitSummary(player));
    }

    private static int drawExtraTrait(int limit) {
        List<Integer> pool = new ArrayList<>();
        for (int i = 0; i < limit; i++) {
            int decade = i / 10;
            int weight = Math.max(1, 13 - decade * 2);
            if (i >= 80) {
                weight = 1;
            }
            addWeighted(pool, i, weight);
        }
        return pool.get(RANDOM.nextInt(pool.size()));
    }

    private static String extraTraitSummary(Player player) {
        List<String> names = new ArrayList<>();
        int total = 0;
        for (int i = 0; i < EXTRA_TRAIT_COUNT; i++) {
            if (hasExtraTrait(player, i)) {
                total++;
                if (names.size() < 8) {
                    names.add(EXTRA_TRAIT_NAMES[i]);
                }
            }
        }
        if (names.isEmpty()) {
            return "";
        }
        String summary = String.join("、", names);
        if (total > names.size()) {
            summary += " 等" + total + "项";
        }
        return summary;
    }

    private static int clampTier(int tier) {
        return Math.max(0, Math.min(MAX_PRESET_TIER, tier));
    }

    private static int getTierCap(Player player, String capKey, int currentTier) {
        int cap = player.getPersistentData().getInt(capKey);
        if (cap <= 0) {
            return clampTier(currentTier);
        }
        return clampTier(cap);
    }

    private static void setTierCap(ServerPlayer player, String capKey, int cap) {
        player.getPersistentData().putInt(capKey, clampTier(cap));
    }

    private static int getTierGrowthXp(Player player, String key) {
        return Math.max(0, player.getPersistentData().getInt(key));
    }

    private static void setTierGrowthXp(ServerPlayer player, String key, int xp) {
        player.getPersistentData().putInt(key, Math.max(0, xp));
    }

    private static int growthStartTier(int cap) {
        cap = clampTier(cap);
        if (cap <= 1) {
            return cap;
        }
        if (cap > 10) {
            return Math.min(10, Math.max(5, cap / 10));
        }
        if (cap <= 3) {
            return 1;
        }
        if (cap <= 5) {
            return 2;
        }
        if (cap <= 7) {
            return 3;
        }
        if (cap <= 9) {
            return 4;
        }
        return 5;
    }

    private static int growthThreshold(int tier) {
        int safeTier = clampTier(tier);
        if (safeTier >= MAX_PRESET_TIER) {
            return 0;
        }
        if (safeTier >= 10) {
            return Math.min(240000, 360 + safeTier * 24 + safeTier * safeTier * 3);
        }
        return switch (safeTier) {
            case 0 -> 20;
            case 1 -> 34;
            case 2 -> 48;
            case 3 -> 68;
            case 4 -> 92;
            case 5 -> 120;
            case 6 -> 154;
            case 7 -> 196;
            case 8 -> 248;
            case 9 -> 310;
            default -> 0;
        };
    }

    private static void awardTierGrowth(ServerPlayer player, String tierKey, String capKey, String xpKey, int amount) {
        int current = clampTier(player.getPersistentData().getInt(tierKey));
        int cap = getTierCap(player, capKey, current);
        if (cap <= current) {
            return;
        }
        int xp = getTierGrowthXp(player, xpKey) + Math.max(0, amount);
        while (current < cap) {
            int threshold = growthThreshold(current);
            if (threshold <= 0 || xp < threshold) {
                break;
            }
            xp -= threshold;
            current++;
        }
        player.getPersistentData().putInt(tierKey, current);
        setTierGrowthXp(player, xpKey, xp);
    }

    private static void initializeTierProfile(ServerPlayer player, boolean mature, int strengthCap, int bodyCap, int speedCap) {
        strengthCap = clampTier(strengthCap);
        bodyCap = clampTier(bodyCap);
        speedCap = clampTier(speedCap);
        setTierCap(player, STRENGTH_CAP_KEY, strengthCap);
        setTierCap(player, BODY_CAP_KEY, bodyCap);
        setTierCap(player, SPEED_CAP_KEY, speedCap);
        if (mature) {
            setStrengthTier(player, strengthCap);
            setBodyTier(player, bodyCap);
            setSpeedTier(player, speedCap);
            setTierGrowthXp(player, STRENGTH_XP_KEY, 0);
            setTierGrowthXp(player, BODY_XP_KEY, 0);
            setTierGrowthXp(player, SPEED_XP_KEY, 0);
            return;
        }
        setStrengthTier(player, Math.min(strengthCap, growthStartTier(strengthCap)));
        setBodyTier(player, Math.min(bodyCap, growthStartTier(bodyCap)));
        setSpeedTier(player, Math.min(speedCap, growthStartTier(speedCap)));
        setTierGrowthXp(player, STRENGTH_XP_KEY, 0);
        setTierGrowthXp(player, BODY_XP_KEY, 0);
        setTierGrowthXp(player, SPEED_XP_KEY, 0);
    }

    private static boolean canUseCreativePowerPanel(ServerPlayer player) {
        return player.isCreative() || player.getAbilities().instabuild;
    }

    private static void triggerCreativeCommand(ServerPlayer player, String command) {
        if (!canUseCreativePowerPanel(player)) {
            tell(player, "超能力自选面板只能在创造模式使用。");
            return;
        }

        switch (command) {
            case "creative_clear" -> {
                clearCreativePowers(player);
                tell(player, "已清空自选超能力。");
                return;
            }
            case "creative_preset_homelander" -> {
                grantHomelanderPattern(player);
                tell(player, "已套用祖国人高阶模板。");
                return;
            }
            case "creative_preset_starlight" -> {
                grantStarlightPattern(player);
                tell(player, "已套用星光模板。");
                return;
            }
            case "creative_preset_atrain" -> {
                grantATrainPattern(player);
                tell(player, "已套用极速者模板。");
                return;
            }
            case "creative_preset_soldier" -> {
                grantSoldierBoyPattern(player);
                tell(player, "已套用士兵男孩模板。");
                return;
            }
            case "creative_preset_translucent" -> {
                grantInvisibleSkinPattern(player);
                tell(player, "已套用透明人模板。");
                return;
            }
            case "creative_preset_specialist" -> {
                grantSpecialistPattern(player);
                tell(player, "已套用随机专精模板。");
                return;
            }
            case "creative_preset_gravity" -> {
                grantGravityPattern(player, true);
                tell(player, "已套用重力场模板。");
                return;
            }
            case "creative_preset_sonic" -> {
                grantSonicPattern(player, true);
                tell(player, "已套用音爆者模板。");
                return;
            }
            case "creative_preset_phase" -> {
                grantPhasePattern(player, true);
                tell(player, "已套用异常相位模板。");
                return;
            }
            default -> {
            }
        }

        if (command.startsWith("creative_traits_")) {
            triggerCreativeTraitCommand(player, command.substring("creative_traits_".length()));
            return;
        }

        if (command.startsWith("creative_strength_")) {
            int tier = parseCreativeTier(command.substring("creative_strength_".length()), 1, MAX_PRESET_TIER);
            ensureCreativeAwakened(player);
            setStrengthTier(player, tier);
            setTierCap(player, STRENGTH_CAP_KEY, tier);
            setTierGrowthXp(player, STRENGTH_XP_KEY, 0);
            setPowerMask(player, getPowerMask(player) | POWER_STRENGTH);
            tell(player, "超级力量已设置为 T" + tier + "。");
            return;
        }
        if (command.startsWith("creative_body_")) {
            int tier = parseCreativeTier(command.substring("creative_body_".length()), 1, MAX_PRESET_TIER);
            ensureCreativeAwakened(player);
            setBodyTier(player, tier);
            setTierCap(player, BODY_CAP_KEY, tier);
            setTierGrowthXp(player, BODY_XP_KEY, 0);
            setPowerMask(player, getPowerMask(player) | POWER_RESIST);
            tell(player, "钢铁之躯已设置为 T" + tier + "。");
            return;
        }
        if (command.startsWith("creative_speed_")) {
            int tier = parseCreativeTier(command.substring("creative_speed_".length()), 0, MAX_PRESET_TIER);
            ensureCreativeAwakened(player);
            setSpeedTier(player, tier);
            setTierCap(player, SPEED_CAP_KEY, tier);
            setTierGrowthXp(player, SPEED_XP_KEY, 0);
            if (tier > 0) {
                setPowerMask(player, getPowerMask(player) | POWER_SPEED);
            } else {
                setPowerMask(player, getPowerMask(player) & ~POWER_SPEED);
                setSpeedCharge(player, 0);
                setChronoTicks(player, 0);
            }
            tell(player, tier > 0 ? "超级速度已设置为 T" + tier + "。" : "超级速度已关闭。");
            return;
        }
        if (command.startsWith("creative_toggle_")) {
            String powerId = command.substring("creative_toggle_".length());
            int power = creativePowerFromId(powerId);
            if (power == 0) {
                tell(player, "未知自选能力：" + powerId);
                return;
            }
            ensureCreativeAwakened(player);
            int mask = getPowerMask(player);
            boolean enabled = !hasPower(mask, power);
            setPowerMask(player, enabled ? mask | power : mask & ~power);
            if (power == POWER_SPEED && enabled && getSpeedTier(player) <= 0) {
                setSpeedTier(player, 1);
                setTierCap(player, SPEED_CAP_KEY, Math.max(getTierCap(player, SPEED_CAP_KEY, 1), 1));
            } else if (power == POWER_SPEED && !enabled) {
                setSpeedTier(player, 0);
                setTierCap(player, SPEED_CAP_KEY, 0);
                setTierGrowthXp(player, SPEED_XP_KEY, 0);
                setSpeedCharge(player, 0);
                setChronoTicks(player, 0);
            }
            if (power == POWER_STRENGTH && enabled && getStrengthTier(player) <= 0) {
                setStrengthTier(player, 1);
                setTierCap(player, STRENGTH_CAP_KEY, Math.max(getTierCap(player, STRENGTH_CAP_KEY, 1), 1));
            } else if (power == POWER_STRENGTH && !enabled) {
                setStrengthTier(player, 0);
                setTierCap(player, STRENGTH_CAP_KEY, 0);
                setTierGrowthXp(player, STRENGTH_XP_KEY, 0);
            }
            if (power == POWER_RESIST && enabled && getBodyTier(player) <= 0) {
                setBodyTier(player, 1);
                setTierCap(player, BODY_CAP_KEY, Math.max(getTierCap(player, BODY_CAP_KEY, 1), 1));
            } else if (power == POWER_RESIST && !enabled) {
                setBodyTier(player, 0);
                setTierCap(player, BODY_CAP_KEY, 0);
                setTierGrowthXp(player, BODY_XP_KEY, 0);
            }
            tell(player, creativePowerLabel(powerId) + (enabled ? " 已加入。" : " 已移除。"));
            return;
        }

        tell(player, "未知自选面板指令：" + command);
    }

    private static void triggerCreativeTraitCommand(ServerPlayer player, String traitId) {
        if ("clear".equals(traitId)) {
            clearExtraTraits(player);
            tell(player, "已清空全部 V 特质。");
            return;
        }

        ensureCreativeAwakened(player);
        switch (traitId) {
            case "sensory" -> grantTraitRange(player, 0, 10, "感官");
            case "resistance" -> grantTraitRange(player, 10, 20, "抗性");
            case "combat" -> grantTraitRange(player, 20, 30, "战斗");
            case "movement" -> grantTraitRange(player, 30, 40, "移动");
            case "metabolism" -> grantTraitRange(player, 40, 50, "代谢");
            case "mental" -> grantTraitRange(player, 50, 60, "精神");
            case "energy" -> grantTraitRange(player, 60, 70, "能量");
            case "exotic" -> grantTraitRange(player, 70, 80, "异能");
            case "rare" -> grantTraitRange(player, 80, 100, "稀有");
            case "random" -> grantTraitBundle(player, 8, 100);
            case "all" -> grantTraitRange(player, 0, EXTRA_TRAIT_COUNT, "全部 100 项");
            default -> tell(player, "未知 V 特质分组：" + traitId);
        }
    }

    private static void grantTraitRange(ServerPlayer player, int startInclusive, int endExclusive, String label) {
        int start = Math.max(0, startInclusive);
        int end = Math.min(EXTRA_TRAIT_COUNT, endExclusive);
        for (int i = start; i < end; i++) {
            addExtraTrait(player, i);
        }
        tell(player, "已加入 " + label + " V 特质：" + extraTraitSummary(player));
    }

    private static void ensureCreativeAwakened(ServerPlayer player) {
        setEnergy(player, MAX_ENERGY);
        if (getForm(player) == FORM_NONE) {
            setForm(player, FORM_MIXED, PERMANENT_FORM_TICKS);
        }
        if (getArchetype(player) == ARCHETYPE_NONE) {
            setArchetype(player, ARCHETYPE_CORE);
        }
    }

    private static int parseCreativeTier(String value, int min, int max) {
        try {
            int tier = Integer.parseInt(value);
            return Math.max(min, Math.min(max, tier));
        } catch (NumberFormatException ex) {
            return min;
        }
    }

    private static int creativePowerFromId(String id) {
        return switch (id) {
            case "flight" -> POWER_FLIGHT;
            case "heat" -> POWER_HEAT;
            case "strength" -> POWER_STRENGTH;
            case "speed" -> POWER_SPEED;
            case "resist" -> POWER_RESIST;
            case "boss" -> POWER_BOSS;
            case "deep_sea" -> POWER_DEEP_SEA;
            case "noir" -> POWER_NOIR;
            case "teleport" -> POWER_TELEPORT;
            case "flame" -> POWER_FLAME;
            case "blood" -> POWER_BLOOD;
            case "regen" -> POWER_REGEN;
            case "purge" -> POWER_PURGE;
            case "starlight" -> POWER_STARLIGHT;
            case "self_explode" -> POWER_SELF_EXPLODE;
            case "weapon_boost" -> POWER_WEAPON_BOOST;
            case "wall_crawl" -> POWER_WALL_CRAWL;
            case "invisible_skin" -> POWER_INVISIBLE_SKIN;
            case "gravity" -> POWER_GRAVITY;
            case "sonic" -> POWER_SONIC;
            case "glitch" -> POWER_GLITCH;
            case "phase" -> POWER_PHASE;
            default -> 0;
        };
    }

    private static String creativePowerLabel(String id) {
        return switch (id) {
            case "flight" -> "飞行";
            case "heat" -> "热视线";
            case "strength" -> "超级力量";
            case "speed" -> "超级速度";
            case "resist" -> "钢铁之躯";
            case "boss" -> "Boss 气场";
            case "deep_sea" -> "深海体质";
            case "noir" -> "玄色潜影";
            case "teleport" -> "瞬移";
            case "flame" -> "火焰细胞";
            case "blood" -> "血液爆炸";
            case "regen" -> "超速再生";
            case "purge" -> "士兵男孩净化爆炸";
            case "starlight" -> "星光";
            case "self_explode" -> "自身爆炸";
            case "weapon_boost" -> "武器增伤";
            case "wall_crawl" -> "爬墙";
            case "invisible_skin" -> "隐形皮肤";
            case "gravity" -> "重力场";
            case "sonic" -> "声波共振";
            case "glitch" -> "异常扰动";
            case "phase" -> "相位回声";
            default -> id;
        };
    }

    private static void clearCreativePowers(ServerPlayer player) {
        setForm(player, FORM_NONE, 0);
        setPowerMask(player, 0);
        setStrengthTier(player, 0);
        setBodyTier(player, 0);
        setArchetype(player, ARCHETYPE_NONE);
        setSpeedTier(player, 0);
        setSpeedCharge(player, 0);
        setChronoTicks(player, 0);
        setTierCap(player, STRENGTH_CAP_KEY, 0);
        setTierCap(player, BODY_CAP_KEY, 0);
        setTierCap(player, SPEED_CAP_KEY, 0);
        setTierGrowthXp(player, STRENGTH_XP_KEY, 0);
        setTierGrowthXp(player, BODY_XP_KEY, 0);
        setTierGrowthXp(player, SPEED_XP_KEY, 0);
        setDeepSeaTicks(player, 0);
        setNoirTicks(player, 0);
        setFlameTicks(player, 0);
        setRegenTicks(player, 0);
        setSurgeTicks(player, 0);
        setWeaponBoostTicks(player, 0);
        setWallCrawlTicks(player, 0);
        clearTemporaryPowers(player);
        clearExtraTraits(player);
        if (player.isInvisible()) {
            player.setInvisible(false);
        }
    }

    private static void purgeHeroState(ServerPlayer player) {
        setForm(player, FORM_NONE, 0);
        setPowerMask(player, 0);
        setStrengthTier(player, 0);
        setBodyTier(player, 0);
        setArchetype(player, ARCHETYPE_NONE);
        setSpeedTier(player, 0);
        setSpeedCharge(player, 0);
        setChronoTicks(player, 0);
        setTierCap(player, STRENGTH_CAP_KEY, 0);
        setTierCap(player, BODY_CAP_KEY, 0);
        setTierCap(player, SPEED_CAP_KEY, 0);
        setTierGrowthXp(player, STRENGTH_XP_KEY, 0);
        setTierGrowthXp(player, BODY_XP_KEY, 0);
        setTierGrowthXp(player, SPEED_XP_KEY, 0);
        setDeepSeaTicks(player, 0);
        setNoirTicks(player, 0);
        setFlameTicks(player, 0);
        setRegenTicks(player, 0);
        setSurgeTicks(player, 0);
        setWeaponBoostTicks(player, 0);
        setWallCrawlTicks(player, 0);
        clearTemporaryPowers(player);
        clearExtraTraits(player);
        if (player.isInvisible()) {
            player.setInvisible(false);
        }
        player.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 20 * 10, 1, false, true, true));
        player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 20 * 8, 0, false, true, true));
        sendHudState(player);
    }

    private static String describeArchetype(int archetype) {
        return switch (archetype) {
            case ARCHETYPE_HOMELANDER -> "祖国人模板";
            case ARCHETYPE_STARLIGHT -> "星光模板";
            case ARCHETYPE_A_TRAIN -> "极速者模板";
            case ARCHETYPE_NOIR -> "玄色模板";
            case ARCHETYPE_DEEP_SEA -> "深海模板";
            case ARCHETYPE_FIRESTARTER -> "火焰模板";
            case ARCHETYPE_TELEPORTER -> "瞬移模板";
            case ARCHETYPE_BLOOD -> "血爆模板";
            case ARCHETYPE_SOLDIER_BOY -> "士兵男孩模板";
            case ARCHETYPE_TRANSLUCENT -> "透明人模板";
            case ARCHETYPE_LOW_GRADE -> "低阶变异";
            case ARCHETYPE_CORE -> "核心体质";
            default -> "未觉醒";
        };
    }

    private static String describeForm(ServerPlayer player) {
        int form = getForm(player);
        int mask = getPowerMask(player);
        if (hasPower(mask, POWER_BOSS) || form >= FORM_PRIME) {
            return "Boss 形态";
        }
        if (form == FORM_ELITE) {
            return "高阶觉醒";
        }
        if (form == FORM_MIXED) {
            return "混合觉醒";
        }
        if (mask != 0) {
            return "残留能力";
        }
        return "普通人类";
    }

    private record GunProfile(double range, float damage, int pellets, double spread, int cooldownTicks, net.minecraft.sounds.SoundEvent sound) {}
}
