package com.blockforge.homelander_maomao.client;

import com.blockforge.homelander_maomao.HomelanderMaomaoMod;
import com.blockforge.homelander_maomao.network.ModNetwork;
import com.blockforge.homelander_maomao.registry.ModEntities;
import com.blockforge.homelander_maomao.registry.ModItems;
import com.google.common.collect.Multimap;
import com.mojang.blaze3d.platform.InputConstants;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.RegisterGuiOverlaysEvent;
import net.minecraftforge.client.event.RegisterKeyMappingsEvent;
import net.minecraftforge.client.event.EntityRenderersEvent;
import net.minecraftforge.client.event.RenderGuiOverlayEvent;
import net.minecraftforge.client.event.RenderPlayerEvent;
import net.minecraftforge.client.gui.overlay.VanillaGuiOverlay;
import net.minecraftforge.client.settings.KeyConflictContext;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import org.lwjgl.glfw.GLFW;

@Mod.EventBusSubscriber(modid = HomelanderMaomaoMod.MODID, value = Dist.CLIENT, bus = Mod.EventBusSubscriber.Bus.MOD)
public final class HomelanderClient {
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

    private static final int HUD_WIDTH = 86;
    private static final int PANEL_WIDTH = 420;
    private static final int CREATIVE_PANEL_WIDTH = 560;
    private static final int OUTER_MARGIN = 12;
    private static final int MAX_PRESET_TIER = 100;
    private static final ResourceLocation BODY_OVERLAY = new ResourceLocation(HomelanderMaomaoMod.MODID, "compact_body_stats");

    public static final KeyMapping OPEN_PANEL = new KeyMapping("key.homelander_maomao.open_panel", KeyConflictContext.IN_GAME, InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_K, "key.categories.homelander_maomao");
    public static final KeyMapping SELECT_PREVIOUS_ABILITY = new KeyMapping("key.homelander_maomao.select_previous_ability", KeyConflictContext.IN_GAME, InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_LEFT_BRACKET, "key.categories.homelander_maomao");
    public static final KeyMapping SELECT_NEXT_ABILITY = new KeyMapping("key.homelander_maomao.select_next_ability", KeyConflictContext.IN_GAME, InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_RIGHT_BRACKET, "key.categories.homelander_maomao");
    public static final KeyMapping USE_SELECTED_ABILITY = new KeyMapping("key.homelander_maomao.use_selected_ability", KeyConflictContext.IN_GAME, InputConstants.Type.KEYSYM, GLFW.GLFW_KEY_G, "key.categories.homelander_maomao");

    private static volatile AbilityHudState serverState = AbilityHudState.empty();
    private static int selectedAbilityIndex;
    private static String selectedAbilityId = "";

    private HomelanderClient() {}

    @SubscribeEvent
    public static void onRegisterKeys(RegisterKeyMappingsEvent event) {
        event.register(OPEN_PANEL);
        event.register(SELECT_PREVIOUS_ABILITY);
        event.register(SELECT_NEXT_ABILITY);
        event.register(USE_SELECTED_ABILITY);
    }

    @SubscribeEvent
    public static void onRegisterEntityRenderers(EntityRenderersEvent.RegisterRenderers event) {
        event.registerEntityRenderer(ModEntities.VOUGHT_HUNTER.get(), context -> new VoughtHumanoidRenderer<>(context, "vought_hunter", 0.45f, 1.0f));
        event.registerEntityRenderer(ModEntities.V_OVERDOSE_MUTANT.get(), context -> new VoughtHumanoidRenderer<>(context, "v_overdose_mutant", 0.65f, 1.18f));
    }

    @SubscribeEvent
    public static void onRegisterGuiOverlays(RegisterGuiOverlaysEvent event) {
        event.registerAboveAll(BODY_OVERLAY.getPath(), (gui, guiGraphics, partialTick, screenWidth, screenHeight) -> {
            Minecraft minecraft = Minecraft.getInstance();
            if (minecraft.screen instanceof AbilityPanelScreen || minecraft.screen instanceof CreativePowerPanelScreen || minecraft.player == null) {
                return;
            }
            renderCompactBars(guiGraphics, minecraft.player, screenWidth, screenHeight);
        });
    }

    public static void acceptServerState(ModNetwork.AbilityStatePacket packet) {
        serverState = new AbilityHudState(
            packet.energy(), packet.heatCooldown(), packet.specialCooldown(), packet.form(), packet.powerMask(),
            packet.speedTier(), packet.speedCharge(), packet.chronoTicks(), packet.speedLimitEnabled(), packet.speedLimitTier(), packet.deepSeaTicks(), packet.noirTicks(),
            packet.flameTicks(), packet.regenTicks(), packet.surgeTicks(), packet.strengthTier(), packet.bodyTier(),
            packet.archetype(), packet.traitSummary(), true
        );
    }

    public static void openCreativePowerPanel() {
        Minecraft minecraft = Minecraft.getInstance();
        if (minecraft.player != null) {
            minecraft.setScreen(new CreativePowerPanelScreen());
        }
    }

    @Mod.EventBusSubscriber(modid = HomelanderMaomaoMod.MODID, value = Dist.CLIENT, bus = Mod.EventBusSubscriber.Bus.FORGE)
    public static final class ClientForgeEvents {
        private ClientForgeEvents() {}

        @SubscribeEvent
        public static void onClientTick(TickEvent.ClientTickEvent event) {
            if (event.phase != TickEvent.Phase.END) {
                return;
            }
            Minecraft minecraft = Minecraft.getInstance();
            LocalPlayer player = minecraft.player;
            if (player == null) {
                return;
            }
            while (OPEN_PANEL.consumeClick()) {
                if (minecraft.screen instanceof AbilityPanelScreen) {
                    minecraft.setScreen(null);
                } else if (minecraft.screen == null) {
                    minecraft.setScreen(new AbilityPanelScreen());
                }
            }
            if (minecraft.screen != null) {
                return;
            }
            handleSelectedAbilityKeys(player);
        }

        @SubscribeEvent
        public static void onVanillaOverlay(RenderGuiOverlayEvent.Pre event) {
            if (event.getOverlay() == VanillaGuiOverlay.PLAYER_HEALTH.type() || event.getOverlay() == VanillaGuiOverlay.ARMOR_LEVEL.type()) {
                event.setCanceled(true);
            }
        }

        @SubscribeEvent
        public static void onRenderPlayer(RenderPlayerEvent.Pre event) {
            if (event.getEntity().isInvisible()) {
                event.setCanceled(true);
            }
        }
    }

    private static void handleSelectedAbilityKeys(LocalPlayer player) {
        List<AbilityEntry> activeEntries = activeAbilityEntries(player, serverState);
        refreshSelectedAbility(activeEntries);
        while (SELECT_PREVIOUS_ABILITY.consumeClick()) {
            cycleSelectedAbility(activeEntries, -1, player);
        }
        while (SELECT_NEXT_ABILITY.consumeClick()) {
            cycleSelectedAbility(activeEntries, 1, player);
        }
        while (USE_SELECTED_ABILITY.consumeClick()) {
            useSelectedAbility(activeEntries, player);
        }
    }

    private static void cycleSelectedAbility(List<AbilityEntry> activeEntries, int direction, LocalPlayer player) {
        if (activeEntries.isEmpty()) {
            selectedAbilityIndex = 0;
            selectedAbilityId = "";
            player.displayClientMessage(Component.literal("没有可选择的主动技能"), true);
            return;
        }
        selectedAbilityIndex = Math.floorMod(selectedAbilityIndex + direction, activeEntries.size());
        AbilityEntry selected = activeEntries.get(selectedAbilityIndex);
        selectedAbilityId = selected.actionId();
        player.displayClientMessage(Component.literal("当前技能：" + selected.label() + " · " + (selected.ready() ? "可用" : "冷却中")), true);
    }

    private static void useSelectedAbility(List<AbilityEntry> activeEntries, LocalPlayer player) {
        AbilityEntry selected = selectedActiveAbility(activeEntries);
        if (selected == null) {
            player.displayClientMessage(Component.literal("没有可释放的主动技能"), true);
            return;
        }
        if (!selected.ready()) {
            player.displayClientMessage(Component.literal(selected.label() + " 正在冷却"), true);
            return;
        }
        ModNetwork.sendAbilityAction(selected.actionId());
        player.displayClientMessage(Component.literal("释放技能：" + selected.label()), true);
    }

    private static AbilityEntry selectedActiveAbility(LocalPlayer player, AbilityHudState state) {
        return selectedActiveAbility(activeAbilityEntries(player, state));
    }

    private static AbilityEntry selectedActiveAbility(List<AbilityEntry> activeEntries) {
        refreshSelectedAbility(activeEntries);
        return activeEntries.isEmpty() ? null : activeEntries.get(selectedAbilityIndex);
    }

    private static void refreshSelectedAbility(List<AbilityEntry> activeEntries) {
        if (activeEntries.isEmpty()) {
            selectedAbilityIndex = 0;
            selectedAbilityId = "";
            return;
        }
        if (!selectedAbilityId.isBlank()) {
            for (int i = 0; i < activeEntries.size(); i++) {
                if (selectedAbilityId.equals(activeEntries.get(i).actionId())) {
                    selectedAbilityIndex = i;
                    return;
                }
            }
        }
        selectedAbilityIndex = Math.max(0, Math.min(selectedAbilityIndex, activeEntries.size() - 1));
        selectedAbilityId = activeEntries.get(selectedAbilityIndex).actionId();
    }

    private static List<AbilityEntry> activeAbilityEntries(LocalPlayer player, AbilityHudState state) {
        List<AbilityEntry> activeEntries = new ArrayList<>();
        for (AbilityEntry entry : buildAbilityEntries(player, state)) {
            if (entry.clickable()) {
                activeEntries.add(entry);
            }
        }
        return activeEntries;
    }

    public static final class AbilityPanelScreen extends Screen {
        private int panelX;
        private int panelY;
        private int panelHeight;
        private int lastSignature = Integer.MIN_VALUE;
        private List<AbilityEntry> visibleEntries = List.of();

        private AbilityPanelScreen() {
            super(Component.literal("能力面板"));
        }

        @Override
        protected void init() {
            rebuildButtons();
        }

        @Override
        public void tick() {
            int signature = serverState.signature();
            if (signature != lastSignature) {
                rebuildButtons();
            }
        }

        private void rebuildButtons() {
            Minecraft minecraft = Minecraft.getInstance();
            if (minecraft.player == null) {
                return;
            }
            this.clearWidgets();
            AbilityHudState state = serverState;
            this.visibleEntries = buildAbilityEntries(minecraft.player, state);
            this.lastSignature = state.signature();

            int columns = 2;
            int rows = Math.max(1, (visibleEntries.size() + columns - 1) / columns);
            this.panelHeight = Math.min(this.height - OUTER_MARGIN * 2, 132 + rows * 21);
            this.panelX = this.width - PANEL_WIDTH - OUTER_MARGIN;
            this.panelY = OUTER_MARGIN;

            this.addRenderableWidget(Button.builder(Component.literal("×"), button -> this.onClose())
                .bounds(panelX + PANEL_WIDTH - 24, panelY + 8, 18, 18)
                .build());

            int buttonWidth = (PANEL_WIDTH - 30) / columns;
            int startY = panelY + 118;
            for (int i = 0; i < visibleEntries.size(); i++) {
                AbilityEntry entry = visibleEntries.get(i);
                if (!entry.clickable()) {
                    continue;
                }
                int column = i % columns;
                int row = i / columns;
                int x = panelX + 10 + column * (buttonWidth + 8);
                int y = startY + row * 21;
                this.addRenderableWidget(Button.builder(Component.literal(entry.buttonText()), button -> ModNetwork.sendAbilityAction(entry.actionId()))
                    .bounds(x, y, buttonWidth, 17)
                    .build());
            }
        }

        @Override
        public boolean isPauseScreen() {
            return false;
        }

        @Override
        public void render(GuiGraphics guiGraphics, int mouseX, int mouseY, float partialTick) {
            Minecraft minecraft = Minecraft.getInstance();
            LocalPlayer player = minecraft.player;
            if (player == null) {
                return;
            }
            renderPanelFrame(guiGraphics, minecraft.font, player, panelX, panelY, PANEL_WIDTH, panelHeight, visibleEntries);
            super.render(guiGraphics, mouseX, mouseY, partialTick);
        }
    }

    public static final class CreativePowerPanelScreen extends Screen {
        private static final List<CreativePanelButton> BUTTONS = List.of(
            new CreativePanelButton("[清空] 移除全部", "creative_clear"),
            new CreativePanelButton("[模板] 祖国人", "creative_preset_homelander"),
            new CreativePanelButton("[模板] 星光", "creative_preset_starlight"),
            new CreativePanelButton("[模板] 极速者", "creative_preset_atrain"),
            new CreativePanelButton("[模板] 士兵男孩", "creative_preset_soldier"),
            new CreativePanelButton("[模板] 透明人", "creative_preset_translucent"),
            new CreativePanelButton("[模板] 随机专精", "creative_preset_specialist"),
            new CreativePanelButton("[模板] 重力场", "creative_preset_gravity"),
            new CreativePanelButton("[模板] 音爆者", "creative_preset_sonic"),
            new CreativePanelButton("[模板] 异常相位", "creative_preset_phase"),
            new CreativePanelButton("[力量] T1", "creative_strength_1"),
            new CreativePanelButton("[力量] T2", "creative_strength_2"),
            new CreativePanelButton("[力量] T3", "creative_strength_3"),
            new CreativePanelButton("[力量] T4", "creative_strength_4"),
            new CreativePanelButton("[力量] T5", "creative_strength_5"),
            new CreativePanelButton("[力量] T6", "creative_strength_6"),
            new CreativePanelButton("[力量] T7", "creative_strength_7"),
            new CreativePanelButton("[力量] T8", "creative_strength_8"),
            new CreativePanelButton("[力量] T9", "creative_strength_9"),
            new CreativePanelButton("[力量] T10", "creative_strength_10"),
            new CreativePanelButton("[肉体] T1", "creative_body_1"),
            new CreativePanelButton("[肉体] T2", "creative_body_2"),
            new CreativePanelButton("[肉体] T3", "creative_body_3"),
            new CreativePanelButton("[肉体] T4", "creative_body_4"),
            new CreativePanelButton("[肉体] T5", "creative_body_5"),
            new CreativePanelButton("[肉体] T6", "creative_body_6"),
            new CreativePanelButton("[肉体] T7", "creative_body_7"),
            new CreativePanelButton("[肉体] T8", "creative_body_8"),
            new CreativePanelButton("[肉体] T9", "creative_body_9"),
            new CreativePanelButton("[肉体] T10", "creative_body_10"),
            new CreativePanelButton("[速度] 关闭", "creative_speed_0"),
            new CreativePanelButton("[速度] T1", "creative_speed_1"),
            new CreativePanelButton("[速度] T2", "creative_speed_2"),
            new CreativePanelButton("[速度] T3", "creative_speed_3"),
            new CreativePanelButton("[速度] T4", "creative_speed_4"),
            new CreativePanelButton("[速度] T5", "creative_speed_5"),
            new CreativePanelButton("[速度] T6", "creative_speed_6"),
            new CreativePanelButton("[速度] T7", "creative_speed_7"),
            new CreativePanelButton("[速度] T8", "creative_speed_8"),
            new CreativePanelButton("[速度] T9", "creative_speed_9"),
            new CreativePanelButton("[速度] T10", "creative_speed_10"),
            new CreativePanelButton("[能力] 飞行", "creative_toggle_flight"),
            new CreativePanelButton("[能力] 热视线", "creative_toggle_heat"),
            new CreativePanelButton("[能力] 深海", "creative_toggle_deep_sea"),
            new CreativePanelButton("[能力] 玄色", "creative_toggle_noir"),
            new CreativePanelButton("[能力] 瞬移", "creative_toggle_teleport"),
            new CreativePanelButton("[能力] 火焰", "creative_toggle_flame"),
            new CreativePanelButton("[能力] 血爆", "creative_toggle_blood"),
            new CreativePanelButton("[能力] 再生", "creative_toggle_regen"),
            new CreativePanelButton("[能力] 星光", "creative_toggle_starlight"),
            new CreativePanelButton("[能力] 净化爆炸", "creative_toggle_purge"),
            new CreativePanelButton("[能力] 自爆", "creative_toggle_self_explode"),
            new CreativePanelButton("[能力] 武器增伤", "creative_toggle_weapon_boost"),
            new CreativePanelButton("[能力] 爬墙", "creative_toggle_wall_crawl"),
            new CreativePanelButton("[能力] 隐形", "creative_toggle_invisible_skin"),
            new CreativePanelButton("[能力] 重力", "creative_toggle_gravity"),
            new CreativePanelButton("[能力] 音爆", "creative_toggle_sonic"),
            new CreativePanelButton("[能力] 异常", "creative_toggle_glitch"),
            new CreativePanelButton("[能力] 相位", "creative_toggle_phase"),
            new CreativePanelButton("[能力] Boss 气场", "creative_toggle_boss"),
            new CreativePanelButton("[特质] 清空", "creative_traits_clear"),
            new CreativePanelButton("[特质] 感官 1-10", "creative_traits_sensory"),
            new CreativePanelButton("[特质] 抗性 11-20", "creative_traits_resistance"),
            new CreativePanelButton("[特质] 战斗 21-30", "creative_traits_combat"),
            new CreativePanelButton("[特质] 移动 31-40", "creative_traits_movement"),
            new CreativePanelButton("[特质] 代谢 41-50", "creative_traits_metabolism"),
            new CreativePanelButton("[特质] 精神 51-60", "creative_traits_mental"),
            new CreativePanelButton("[特质] 能量 61-70", "creative_traits_energy"),
            new CreativePanelButton("[特质] 异能 71-80", "creative_traits_exotic"),
            new CreativePanelButton("[特质] 稀有 81-100", "creative_traits_rare"),
            new CreativePanelButton("[特质] 随机抽 8 项", "creative_traits_random"),
            new CreativePanelButton("[特质] 全部 100 项", "creative_traits_all")
        );

        private int panelX;
        private int panelY;
        private int panelWidth;
        private int panelHeight;
        private int scrollRow;
        private int maxScrollRow;
        private int gridY;
        private int gridVisibleRows;
        private static final int GRID_BUTTON_WIDTH = 34;
        private static final int GRID_BUTTON_HEIGHT = 22;
        private static final int GRID_GAP = 4;
        private EditBox searchBox;
        private EditBox strengthBox;
        private EditBox bodyBox;
        private EditBox speedBox;
        private String searchText = "";
        private String strengthText = "5";
        private String bodyText = "5";
        private String speedText = "0";

        private CreativePowerPanelScreen() {
            super(Component.literal("超能力自选面板"));
        }

        @Override
        protected void init() {
            rebuildButtons();
        }

        private void rebuildButtons() {
            String nextSearch = searchBox == null ? searchText : searchBox.getValue();
            String nextStrength = strengthBox == null ? strengthText : strengthBox.getValue();
            String nextBody = bodyBox == null ? bodyText : bodyBox.getValue();
            String nextSpeed = speedBox == null ? speedText : speedBox.getValue();
            this.searchText = nextSearch;
            this.strengthText = nextStrength;
            this.bodyText = nextBody;
            this.speedText = nextSpeed;

            this.clearWidgets();
            List<CreativePanelButton> visibleButtons = filteredButtons(searchText);
            this.panelWidth = Math.min(CREATIVE_PANEL_WIDTH, Math.max(220, this.width - OUTER_MARGIN * 2));
            this.panelHeight = Math.min(312, Math.max(128, this.height - OUTER_MARGIN * 2));
            this.panelX = (this.width - panelWidth) / 2;
            this.panelY = Math.max(OUTER_MARGIN, (this.height - panelHeight) / 2);
            this.gridY = panelY + 106;
            int gridHeight = Math.max(GRID_BUTTON_HEIGHT, panelY + panelHeight - gridY - 12);
            int columns = Math.max(3, Math.min(14, (panelWidth - 24) / (GRID_BUTTON_WIDTH + GRID_GAP)));
            int rows = Math.max(1, (visibleButtons.size() + columns - 1) / columns);
            this.gridVisibleRows = Math.max(1, gridHeight / (GRID_BUTTON_HEIGHT + GRID_GAP));
            this.maxScrollRow = Math.max(0, rows - gridVisibleRows);
            this.scrollRow = Math.max(0, Math.min(maxScrollRow, scrollRow));

            Font font = Minecraft.getInstance().font;
            this.addRenderableWidget(Button.builder(Component.literal("×"), button -> this.onClose())
                .bounds(panelX + panelWidth - 24, panelY + 8, 18, 18)
                .build());

            this.searchBox = new EditBox(font, panelX + 54, panelY + 52, panelWidth - 130, 18, Component.literal("搜索"));
            this.searchBox.setValue(searchText);
            this.addRenderableWidget(searchBox);
            this.addRenderableWidget(Button.builder(Component.literal("筛选"), button -> rebuildButtons())
                .bounds(panelX + panelWidth - 70, panelY + 52, 52, 18)
                .build());

            int groupWidth = (panelWidth - 26) / 3;
            int inputY = panelY + 76;
            this.strengthBox = tierBox(font, panelX + 50, inputY, strengthText);
            this.bodyBox = tierBox(font, panelX + 12 + groupWidth + 38, inputY, bodyText);
            this.speedBox = tierBox(font, panelX + 12 + groupWidth * 2 + 38, inputY, speedText);
            this.addRenderableWidget(strengthBox);
            this.addRenderableWidget(bodyBox);
            this.addRenderableWidget(speedBox);
            this.addRenderableWidget(Button.builder(Component.literal("设"), button -> applyTier("creative_strength_", strengthBox, 1, MAX_PRESET_TIER))
                .bounds(panelX + 88, inputY, 24, 18)
                .build());
            this.addRenderableWidget(Button.builder(Component.literal("设"), button -> applyTier("creative_body_", bodyBox, 1, MAX_PRESET_TIER))
                .bounds(panelX + 12 + groupWidth + 76, inputY, 24, 18)
                .build());
            this.addRenderableWidget(Button.builder(Component.literal("设"), button -> applyTier("creative_speed_", speedBox, 0, MAX_PRESET_TIER))
                .bounds(panelX + 12 + groupWidth * 2 + 76, inputY, 24, 18)
                .build());

            int firstIndex = scrollRow * columns;
            int lastIndex = Math.min(visibleButtons.size(), firstIndex + gridVisibleRows * columns);
            for (int i = firstIndex; i < lastIndex; i++) {
                CreativePanelButton entry = visibleButtons.get(i);
                int visibleIndex = i - firstIndex;
                int column = visibleIndex % columns;
                int row = visibleIndex / columns;
                int x = panelX + 12 + column * (GRID_BUTTON_WIDTH + GRID_GAP);
                int y = gridY + row * (GRID_BUTTON_HEIGHT + GRID_GAP);
                this.addRenderableWidget(Button.builder(Component.literal(compactButtonLabel(entry)), button -> ModNetwork.sendAbilityAction(entry.actionId()))
                    .bounds(x, y, GRID_BUTTON_WIDTH, GRID_BUTTON_HEIGHT)
                    .build());
            }
        }

        private EditBox tierBox(Font font, int x, int y, String value) {
            EditBox box = new EditBox(font, x, y, 34, 18, Component.literal("T"));
            box.setMaxLength(3);
            box.setValue(value);
            return box;
        }

        private List<CreativePanelButton> filteredButtons(String search) {
            String normalized = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
            List<CreativePanelButton> result = new ArrayList<>();
            for (CreativePanelButton entry : BUTTONS) {
                if (isTierButton(entry)) {
                    continue;
                }
                String label = entry.label().toLowerCase(Locale.ROOT);
                String action = entry.actionId().toLowerCase(Locale.ROOT);
                if (normalized.isEmpty() || label.contains(normalized) || action.contains(normalized)) {
                    result.add(entry);
                }
            }
            return result;
        }

        private boolean isTierButton(CreativePanelButton entry) {
            return entry.actionId().startsWith("creative_strength_")
                || entry.actionId().startsWith("creative_body_")
                || entry.actionId().startsWith("creative_speed_");
        }

        private String compactButtonLabel(CreativePanelButton entry) {
            return switch (entry.actionId()) {
                case "creative_clear" -> "清空";
                case "creative_preset_homelander" -> "祖国人";
                case "creative_preset_starlight" -> "星光";
                case "creative_preset_atrain" -> "极速";
                case "creative_preset_soldier" -> "士兵";
                case "creative_preset_translucent" -> "透明";
                case "creative_preset_specialist" -> "专精";
                case "creative_preset_gravity" -> "重力型";
                case "creative_preset_sonic" -> "音爆型";
                case "creative_preset_phase" -> "相位型";
                case "creative_toggle_deep_sea" -> "深海";
                case "creative_toggle_weapon_boost" -> "增伤";
                case "creative_toggle_invisible_skin" -> "隐形";
                case "creative_toggle_self_explode" -> "自爆";
                case "creative_toggle_wall_crawl" -> "爬墙";
                case "creative_toggle_gravity" -> "重力";
                case "creative_toggle_sonic" -> "音爆";
                case "creative_toggle_glitch" -> "异常";
                case "creative_toggle_phase" -> "相位";
                case "creative_toggle_boss" -> "Boss";
                case "creative_toggle_purge" -> "净化";
                case "creative_traits_clear" -> "清特";
                case "creative_traits_sensory" -> "感官";
                case "creative_traits_resistance" -> "抗性";
                case "creative_traits_combat" -> "战斗";
                case "creative_traits_movement" -> "移动";
                case "creative_traits_metabolism" -> "代谢";
                case "creative_traits_mental" -> "精神";
                case "creative_traits_energy" -> "能量";
                case "creative_traits_exotic" -> "异能";
                case "creative_traits_rare" -> "稀有";
                case "creative_traits_random" -> "随机";
                case "creative_traits_all" -> "百项";
                default -> entry.label().replace("[能力]", "").replace("[模板]", "").replace("[清空]", "").trim();
            };
        }

        private void applyTier(String prefix, EditBox box, int min, int max) {
            int tier = min;
            try {
                tier = Integer.parseInt(box.getValue().replace("T", "").replace("t", "").trim());
            } catch (NumberFormatException ignored) {
                tier = min;
            }
            tier = Math.max(min, Math.min(max, tier));
            box.setValue(Integer.toString(tier));
            ModNetwork.sendAbilityAction(prefix + tier);
        }

        @Override
        public boolean isPauseScreen() {
            return false;
        }

        @Override
        public boolean mouseScrolled(double mouseX, double mouseY, double delta) {
            if (maxScrollRow > 0 && mouseX >= panelX && mouseX <= panelX + panelWidth && mouseY >= gridY && mouseY <= panelY + panelHeight) {
                int next = scrollRow + (delta < 0 ? 1 : -1);
                next = Math.max(0, Math.min(maxScrollRow, next));
                if (next != scrollRow) {
                    scrollRow = next;
                    rebuildButtons();
                }
                return true;
            }
            return super.mouseScrolled(mouseX, mouseY, delta);
        }

        @Override
        public void render(GuiGraphics guiGraphics, int mouseX, int mouseY, float partialTick) {
            Minecraft minecraft = Minecraft.getInstance();
            Font font = minecraft.font;
            AbilityHudState state = serverState;
            drawTechPanel(guiGraphics, panelX, panelY, panelWidth, panelHeight);
            guiGraphics.drawString(font, "超能力自选面板", panelX + 12, panelY + 10, 0xFFEAFBFF, false);
            guiGraphics.drawString(font, "创造模式专属物品打开 | 点击小按钮会直接写入当前玩家能力", panelX + 12, panelY + 26, 0xFF91D8E8, false);
            String status = "当前：力量 T" + state.strengthTier() + " | 肉体 T" + state.bodyTier() + " | 速度 T" + state.speedTier()
                + " | 能量 " + state.energy() + "/200 | " + describeArchetype(state.archetype());
            guiGraphics.drawString(font, status, panelX + 12, panelY + 40, 0xFFFFF084, false);
            guiGraphics.drawString(font, "搜索", panelX + 12, panelY + 56, 0xFFD8F2FF, false);
            int groupWidth = (panelWidth - 26) / 3;
            guiGraphics.drawString(font, "力量 T", panelX + 12, panelY + 81, 0xFFD8F2FF, false);
            guiGraphics.drawString(font, "肉体 T", panelX + 12 + groupWidth, panelY + 81, 0xFFD8F2FF, false);
            guiGraphics.drawString(font, "速度 T", panelX + 12 + groupWidth * 2, panelY + 81, 0xFFD8F2FF, false);
            String page = maxScrollRow > 0 ? "滚轮翻页 " + (scrollRow + 1) + "/" + (maxScrollRow + 1) : "全部已显示";
            guiGraphics.drawString(font, "小方块是模板/能力开关；T6 生存软上限，创造面板可设到 T100。 " + page, panelX + 12, panelY + 98, 0xFF91D8E8, false);
            guiGraphics.fill(panelX + 10, panelY + 104, panelX + panelWidth - 10, panelY + 105, 0x6636D8FF);
            super.render(guiGraphics, mouseX, mouseY, partialTick);
        }
    }

    private static void renderCompactBars(GuiGraphics guiGraphics, LocalPlayer player, int screenWidth, int screenHeight) {
        Font font = Minecraft.getInstance().font;
        AbilityHudState state = serverState;
        int x = screenWidth / 2 - 91;
        int y = screenHeight - 50;
        double health = player.getHealth();
        double maxHealth = Math.max(1.0, player.getMaxHealth());
        double armor = player.getAttributeValue(Attributes.ARMOR);
        double maxArmor = Math.max(20.0, armor);

        AbilityEntry selected = selectedActiveAbility(player, state);
        if (selected != null) {
            String skillText = "当前技能 " + selected.label() + " | " + USE_SELECTED_ABILITY.getTranslatedKeyMessage().getString();
            int skillWidth = Math.max(HUD_WIDTH, font.width(skillText) + 8);
            int skillColor = selected.ready() ? 0xFFBDEFFF : 0xFFFF8A8A;
            guiGraphics.fill(x - 2, y - 14, x + skillWidth + 2, y - 4, 0x90000000);
            guiGraphics.drawString(font, skillText, x + 4, y - 13, skillColor, false);
        }

        guiGraphics.fill(x - 2, y - 2, x + HUD_WIDTH + 2, y + 22, 0x90000000);
        drawBar(guiGraphics, x, y, HUD_WIDTH, 9, health / maxHealth, 0xFF2A0508, 0xFFFF2235);
        drawBar(guiGraphics, x, y + 11, HUD_WIDTH, 9, Math.min(1.0, armor / maxArmor), 0xFF1B1A12, 0xFFFFD452);
        drawCenteredString(guiGraphics, font, "生命 " + formatOne(health) + "/" + formatOne(maxHealth), x, y + 1, HUD_WIDTH, 0xFFFFFFFF);
        drawCenteredString(guiGraphics, font, "护甲 " + formatOne(armor), x, y + 12, HUD_WIDTH, 0xFFFFF6B0);

        if (state.speedTier() > 0 || state.speedCharge() > 0) {
            int speedX = 12;
            int speedY = screenHeight - 96;
            int speedHeight = 70;
            int target = speedChargeTarget(state.speedTier());
            double ratio = target > 0 ? (double) state.speedCharge() / target : 0.0;
            guiGraphics.fill(speedX - 3, speedY - 3, speedX + 72, speedY + speedHeight + 4, 0x8C000000);
            drawVerticalBar(guiGraphics, speedX, speedY, 8, speedHeight, ratio, 0xFF071119, 0xFF39D8FF);
            guiGraphics.drawString(font, "速度", speedX + 14, speedY + 2, 0xFFBDEFFF, false);
            guiGraphics.drawString(font, "T" + state.speedTier(), speedX + 14, speedY + 14, 0xFFFFFFFF, false);
            guiGraphics.drawString(font, state.speedCharge() + "/" + Math.max(1, target), speedX + 14, speedY + 26, 0xFF91D8E8, false);
            String limit = state.speedLimitEnabled() != 0 ? "限T" + state.speedLimitTier() : "阈T3";
            guiGraphics.drawString(font, limit, speedX + 14, speedY + 38, 0xFFFFF084, false);
        }
    }

    private static void drawBar(GuiGraphics guiGraphics, int x, int y, int width, int height, double ratio, int backColor, int fillColor) {
        int fill = (int) Math.round(width * Math.max(0.0, Math.min(1.0, ratio)));
        guiGraphics.fill(x, y, x + width, y + height, backColor);
        guiGraphics.fill(x, y, x + fill, y + height, fillColor);
        guiGraphics.fill(x, y, x + width, y + 1, 0x70FFFFFF);
        guiGraphics.fill(x, y + height - 1, x + width, y + height, 0x90000000);
    }

    private static void drawVerticalBar(GuiGraphics guiGraphics, int x, int y, int width, int height, double ratio, int backColor, int fillColor) {
        int fill = (int) Math.round(height * Math.max(0.0, Math.min(1.0, ratio)));
        guiGraphics.fill(x, y, x + width, y + height, backColor);
        guiGraphics.fill(x, y + height - fill, x + width, y + height, fillColor);
        guiGraphics.fill(x, y, x + 1, y + height, 0x70FFFFFF);
        guiGraphics.fill(x + width - 1, y, x + width, y + height, 0x90000000);
    }

    private static void drawCenteredString(GuiGraphics guiGraphics, Font font, String text, int x, int y, int width, int color) {
        guiGraphics.drawString(font, text, x + Math.max(0, (width - font.width(text)) / 2), y, color, true);
    }

    private static void renderPanelFrame(GuiGraphics guiGraphics, Font font, LocalPlayer player, int x, int y, int width, int height, List<AbilityEntry> entries) {
        drawTechPanel(guiGraphics, x, y, width, height);
        AbilityHudState state = serverState;
        guiGraphics.drawString(font, "能力档案", x + 12, y + 10, 0xEAFBFF, false);
        guiGraphics.drawString(font, "按 " + OPEN_PANEL.getTranslatedKeyMessage().getString() + " 关闭 | " + SELECT_PREVIOUS_ABILITY.getTranslatedKeyMessage().getString()
            + "/" + SELECT_NEXT_ABILITY.getTranslatedKeyMessage().getString() + " 切换 | " + USE_SELECTED_ABILITY.getTranslatedKeyMessage().getString() + " 使用", x + 82, y + 10, 0x91D8E8, false);

        String line1 = "模板 " + describeArchetype(state.archetype()) + " | 形态 " + describeForm(state) + " | 能量 E" + energyTier(state.energy()) + " " + state.energy() + "/200";
        String line2 = "生命 " + formatOne(player.getHealth()) + "/" + formatOne(player.getMaxHealth()) + " | 护甲 " + formatOne(player.getAttributeValue(Attributes.ARMOR))
            + " | 韧性 " + formatOne(player.getAttributeValue(Attributes.ARMOR_TOUGHNESS)) + " | 攻击 " + formatOne(displayAttackDamage(player, state));
        String line3 = "力量 T" + state.strengthTier() + " | 钢铁之躯 T" + state.bodyTier() + " | " + speedTierName(state.speedTier()) + " " + state.speedCharge() + "/" + speedChargeTarget(state.speedTier())
            + " | 热视线冷却 " + state.heatCooldown() + " | 特殊冷却 " + state.specialCooldown();
        AbilityEntry selected = selectedActiveAbility(player, state);
        String line4 = selected == null ? "当前技能：无可用主动技能" : "当前技能：" + selected.label() + " | " + (selected.ready() ? "可用" : "冷却中");
        String line5 = "时停阈值：T3 满蓄力 | 自动限速：" + (state.speedLimitEnabled() != 0 ? "T" + state.speedLimitTier() : "关闭")
            + " | " + (state.traitSummary().isBlank() ? "V 特质：无" : "V 特质：" + state.traitSummary());
        guiGraphics.drawString(font, line1, x + 12, y + 34, 0xFFEAFBFF, false);
        guiGraphics.drawString(font, line2, x + 12, y + 50, 0xFFD8F2FF, false);
        guiGraphics.drawString(font, line3, x + 12, y + 66, 0xFFB7E4FF, false);
        guiGraphics.drawString(font, line4, x + 12, y + 82, 0xFFFFF084, false);
        guiGraphics.drawString(font, line5, x + 12, y + 96, 0xFFB7E4FF, false);
        guiGraphics.fill(x + 10, y + 100, x + width - 10, y + 101, 0x6636D8FF);
        guiGraphics.drawString(font, entries.isEmpty() ? "尚未觉醒可用能力" : "已拥有能力", x + 12, y + 106, 0xFFFFF084, false);

        int columns = 2;
        int buttonWidth = (width - 30) / columns;
        int startY = y + 118;
        for (int i = 0; i < entries.size(); i++) {
            AbilityEntry entry = entries.get(i);
            if (entry.clickable()) {
                continue;
            }
            int column = i % columns;
            int row = i / columns;
            int bx = x + 10 + column * (buttonWidth + 8);
            int by = startY + row * 21;
            drawPassiveSlot(guiGraphics, font, bx, by, buttonWidth, 17, entry.buttonText());
        }
    }

    private static void drawPassiveSlot(GuiGraphics guiGraphics, Font font, int x, int y, int width, int height, String text) {
        guiGraphics.fill(x, y, x + width, y + height, 0xAA26323B);
        guiGraphics.fill(x, y, x + width, y + 1, 0xFF6D8792);
        guiGraphics.fill(x, y + height - 1, x + width, y + height, 0xFF0A0F14);
        guiGraphics.drawString(font, text, x + 6, y + 5, 0xFFE7F7FF, false);
    }

    private static void drawTechPanel(GuiGraphics guiGraphics, int x, int y, int width, int height) {
        guiGraphics.fill(x, y, x + width, y + height, 0xE00A111A);
        guiGraphics.fill(x, y, x + width, y + 2, 0xFF67F3FF);
        guiGraphics.fill(x, y + height - 2, x + width, y + height, 0x8843C9FF);
        guiGraphics.fill(x, y, x + 2, y + height, 0x8843C9FF);
        guiGraphics.fill(x + width - 2, y, x + width, y + height, 0x5543C9FF);
    }

    private static List<AbilityEntry> buildAbilityEntries(LocalPlayer player, AbilityHudState state) {
        List<AbilityEntry> entries = new ArrayList<>();
        boolean suit = hasFullSuit(player);
        boolean heroState = suit || state.form() != FORM_NONE || state.powerMask() != 0;
        addPassive(entries, state.strengthTier() > 0 || state.hasPower(POWER_STRENGTH), "超级力量", Math.max(1, state.strengthTier()), "常驻加成");
        addPassive(entries, state.bodyTier() > 0 || state.hasPower(POWER_RESIST), "钢铁之躯", Math.max(1, state.bodyTier()), "常驻防御");
        addPassive(entries, state.hasPower(POWER_REGEN), "超速再生", Math.max(1, state.bodyTier()), "常驻恢复");
        addPassive(entries, state.hasPower(POWER_STARLIGHT) || state.archetype() == ARCHETYPE_STARLIGHT, "星光护盾", Math.min(MAX_PRESET_TIER, Math.max(state.bodyTier(), state.strengthTier() + 1)), "防御强化");
        addPassive(entries, state.hasPower(POWER_WEAPON_BOOST), "武器增伤", Math.max(1, state.strengthTier()), "枪械/近战强化");
        addPassive(entries, state.hasPower(POWER_INVISIBLE_SKIN), "透明皮肤", Math.max(4, state.bodyTier()), "常驻隐形/怕爆炸");
        addPassive(entries, state.hasPower(POWER_WALL_CRAWL) || state.hasPower(POWER_NOIR), "墙面攀爬", Math.max(1, state.bodyTier()), "贴墙移动");
        addPassive(entries, state.hasPower(POWER_SPEED) && state.speedTier() > 0, speedTierName(state.speedTier()), state.speedTier(), state.speedTier() >= 3 ? "时间减缓" : "加速蓄力");
        addPassive(entries, state.hasPower(POWER_SPEED) || state.speedTier() > 0, "时停阈值", 3, state.speedLimitEnabled() != 0 ? "限速 T" + state.speedLimitTier() : "建议 T2");
        addPassive(entries, state.hasPower(POWER_DEEP_SEA), "深海体质", Math.max(1, state.bodyTier()), "水下呼吸/速度/速掘");
        addPassive(entries, state.hasPower(POWER_FLAME), "耐热细胞", Math.max(1, state.bodyTier()), "火焰免疫");
        addPassive(entries, state.hasPower(POWER_NOIR), "暗影潜伏", Math.max(1, state.speedTier()), "潜行强化");
        addPassive(entries, state.hasPower(POWER_GRAVITY), "重力场", Math.max(1, state.bodyTier()), "坠落控制/重力压制");
        addPassive(entries, state.hasPower(POWER_SONIC), "声波共振", Math.max(1, state.strengthTier()), "音爆震荡");
        addPassive(entries, state.hasPower(POWER_GLITCH), "异常扰动", Math.max(1, state.bodyTier()), "奇怪效果");
        addPassive(entries, state.hasPower(POWER_PHASE), "相位回声", Math.max(1, state.bodyTier()), "短距折跃/虚化");
        addPassive(entries, state.hasPower(POWER_BOSS) || state.form() >= FORM_PRIME, "威压气场", 5, "Boss 常驻");
        addPassive(entries, heroState, "增强感官", Math.max(1, Math.max(state.strengthTier(), state.bodyTier())),
            (suit || state.archetype() == ARCHETYPE_HOMELANDER) ? "夜视/轮廓扫描" : "轮廓扫描");
        addTraitEntries(entries, state);

        addActive(entries, state.hasPower(POWER_HEAT), 1, "热视线", "heat_vision", state.heatCooldown() == 0);
        addActive(entries, suit || state.hasPower(POWER_FLIGHT), 2, "飞行突进", "flight_burst", true);
        addActive(entries, heroState, 3, "能力充能", "power_surge", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_SPEED) && state.speedTier() > 0, 4, "极速超载", "speed_overdrive", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_PURGE) || state.hasPower(POWER_BOSS) || state.form() >= FORM_PRIME, 5, "净化爆震", "power_purge_blast", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_DEEP_SEA), 6, "深海爆发", "deep_sea", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_NOIR), 6, "玄色潜影", "noir_shadow", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_TELEPORT), 6, "瞬移闪烁", "teleport_blink", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_GRAVITY), 6, "重力塌缩", "gravity_well", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_SONIC), 6, "音爆尖啸", "sonic_scream", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_GLITCH), 6, "异常脉冲", "anomaly_burst", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_PHASE), 0, "相位折跃", "phase_echo", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_SPEED) || state.speedTier() > 0, 0, state.speedLimitEnabled() != 0 ? "解除限速" : "自动限速", state.speedLimitEnabled() != 0 ? "speed_limit_clear" : "speed_limit_auto", true);
        addActive(entries, state.hasPower(POWER_SELF_EXPLODE), 7, "自身爆裂", "self_explosion", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_WEAPON_BOOST), 8, "武器过载", "weapon_overclock", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_WALL_CRAWL), 9, "粘附攀爬", "wall_crawl", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_FLAME) || state.hasPower(POWER_HEAT), 0, "火焰波", "flame_wave", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_BLOOD), 0, "血液爆破", "blood_burst", state.specialCooldown() == 0);
        addActive(entries, state.hasPower(POWER_STARLIGHT) || state.archetype() == ARCHETYPE_STARLIGHT, 0, "星光闪耀", "starlight_flash", state.specialCooldown() == 0);
        addActive(entries, suit || state.hasPower(POWER_FLIGHT), 0, "落地冲击", "landing_burst", true);
        addActive(entries, state.hasPower(POWER_BOSS) || state.form() >= FORM_PRIME, 0, "Boss 咆哮", "boss_roar", state.specialCooldown() == 0);
        return entries;
    }

    private static void addPassive(List<AbilityEntry> entries, boolean condition, String label, int tier, String note) {
        if (condition) {
            entries.add(new AbilityEntry(0, label, "", true, "被动", tier, note));
        }
    }

    private static void addActive(List<AbilityEntry> entries, boolean condition, int comboNumber, String label, String actionId, boolean ready) {
        if (condition) {
            entries.add(new AbilityEntry(comboNumber, label, actionId, ready, "主动", 0, ready ? "可用" : "冷却"));
        }
    }

    private static void addTraitEntries(List<AbilityEntry> entries, AbilityHudState state) {
        if (state.traitSummary().isBlank()) {
            return;
        }
        String[] names = state.traitSummary().split("、");
        int limit = Math.min(8, names.length);
        for (int i = 0; i < limit; i++) {
            String name = names[i].trim();
            if (!name.isEmpty()) {
                addPassive(entries, true, name, Math.max(1, Math.max(state.strengthTier(), state.bodyTier())), "V 特质");
            }
        }
    }

    private static boolean hasFullSuit(LocalPlayer player) {
        return player.getItemBySlot(EquipmentSlot.HEAD).is(ModItems.HOMELANDER_HELMET.get())
            && player.getItemBySlot(EquipmentSlot.CHEST).is(ModItems.HOMELANDER_CHESTPLATE.get())
            && player.getItemBySlot(EquipmentSlot.LEGS).is(ModItems.HOMELANDER_LEGGINGS.get())
            && player.getItemBySlot(EquipmentSlot.FEET).is(ModItems.HOMELANDER_BOOTS.get());
    }

    private static double displayAttackDamage(LocalPlayer player, AbilityHudState state) {
        double base = player.getAttributeValue(Attributes.ATTACK_DAMAGE);
        double itemBonus = mainHandAttackBonus(player.getMainHandItem());
        double tierBonus = strengthDamageBonus(state.strengthTier());
        if (state.hasPower(POWER_BLOOD)) tierBonus += 2.0;
        if (state.chronoTicks() > 0) tierBonus += 4.0 + state.speedTier();
        if (state.surgeTicks() > 0) tierBonus += 4.0;
        return Math.max(base, 1.0 + itemBonus + tierBonus);
    }

    private static double mainHandAttackBonus(ItemStack stack) {
        double bonus = 0.0;
        Multimap<Attribute, AttributeModifier> modifiers = stack.getAttributeModifiers(EquipmentSlot.MAINHAND);
        for (AttributeModifier modifier : modifiers.get(Attributes.ATTACK_DAMAGE)) {
            if (modifier.getOperation() == AttributeModifier.Operation.ADDITION) {
                bonus += modifier.getAmount();
            }
        }
        return Math.max(0.0, bonus);
    }

    private static double strengthDamageBonus(int tier) {
        int safeTier = Math.max(0, Math.min(MAX_PRESET_TIER, tier));
        if (safeTier > 10) {
            double extra = safeTier - 10.0;
            return 274.0 + Math.pow(extra, 1.36) * 14.0;
        }
        return switch (safeTier) {
            case 1 -> 3.0;
            case 2 -> 7.0;
            case 3 -> 14.0;
            case 4 -> 28.0;
            case 5 -> 55.0;
            case 6 -> 82.0;
            case 7 -> 116.0;
            case 8 -> 158.0;
            case 9 -> 210.0;
            case 10 -> 274.0;
            default -> 0.0;
        };
    }

    private static int energyTier(int energy) {
        if (energy >= 180) return 5;
        if (energy >= 140) return 4;
        if (energy >= 100) return 3;
        if (energy >= 60) return 2;
        return energy > 0 ? 1 : 0;
    }

    private static int speedChargeTarget(int speedTier) {
        int safeTier = Math.max(0, Math.min(MAX_PRESET_TIER, speedTier));
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

    private static String speedTierName(int speedTier) {
        int safeTier = Math.max(0, Math.min(MAX_PRESET_TIER, speedTier));
        if (safeTier > 10) {
            if (safeTier >= 100) {
                return "T100 维度撕裂极速";
            }
            if (safeTier >= 80) {
                return "T" + safeTier + " 时空断层极速";
            }
            if (safeTier >= 50) {
                return "T" + safeTier + " 雷暴极限";
            }
            if (safeTier >= 20) {
                return "T" + safeTier + " 神速进化";
            }
            return "T" + safeTier + " 超限极速";
        }
        return switch (safeTier) {
            case 1 -> "T0.5 常人强化";
            case 2 -> "T1 马拉松";
            case 3 -> "T3 超音速";
            case 4 -> "T4 祖国人";
            case 5 -> "T5 嗑药火车头";
            case 6 -> "T6 超限火车头";
            case 7 -> "T7 失速边缘";
            case 8 -> "T8 破音极速";
            case 9 -> "T9 失真冲刺";
            case 10 -> "T10 极限神速";
            default -> "无极速";
        };
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

    private static String describeForm(AbilityHudState state) {
        if (state.hasPower(POWER_BOSS) || state.form() >= FORM_PRIME) return "Boss 形态";
        if (state.form() == FORM_ELITE) return "高阶觉醒";
        if (state.form() == FORM_MIXED) return "混合觉醒";
        if (state.powerMask() != 0) return "残留能力";
        return "普通人类";
    }

    private static String formatOne(double value) {
        return String.format(Locale.ROOT, "%.1f", value);
    }

    private record CreativePanelButton(String label, String actionId) {
    }

    private record AbilityEntry(int comboNumber, String label, String actionId, boolean ready, String type, int tier, String note) {
        boolean clickable() {
            return actionId != null && !actionId.isBlank();
        }

        String buttonText() {
            if (!clickable()) {
                return label + " T" + tier + " · " + type + " · " + note;
            }
            String marker = actionId.equals(selectedAbilityId) ? "▶ " : "";
            return marker + label + " · " + type + " · " + (ready ? "可用" : "冷却");
        }
    }

    private record AbilityHudState(
        int energy, int heatCooldown, int specialCooldown, int form, int powerMask, int speedTier, int speedCharge,
        int chronoTicks, int speedLimitEnabled, int speedLimitTier, int deepSeaTicks, int noirTicks, int flameTicks, int regenTicks, int surgeTicks,
        int strengthTier, int bodyTier, int archetype, String traitSummary, boolean ready
    ) {
        static AbilityHudState empty() {
            return new AbilityHudState(0, 0, 0, FORM_NONE, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, "", false);
        }

        boolean hasPower(int power) {
            return (powerMask & power) != 0;
        }

        int signature() {
            return Objects.hash(energy, heatCooldown, specialCooldown, form, powerMask, speedTier, speedCharge, chronoTicks,
                speedLimitEnabled, speedLimitTier, deepSeaTicks, noirTicks, flameTicks, regenTicks, surgeTicks, strengthTier, bodyTier, archetype, traitSummary, ready);
        }
    }
}
