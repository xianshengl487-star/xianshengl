import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { deepSeekPreset, lmStudioPreset, mimoPreset, ollamaPreset } from '../shared/types/ai';
import type { AiChatMessage, AiModelDraft, AiModFeatureDraft, AiProjectChangePlan, AiProviderConfig, AiTextureDraft } from '../shared/types/ai';
import type { Diagnostic, ElementModel, EnchantmentRarity, EnchantmentSlot, ItemKind, ItemRarity, ItemUseAnimation, MobEffectCategory, PotionEffectSpec, PotionKind, RecipeType, ToolTier } from '../shared/types/elements';
import type { BlockForgeIR, LogicEdge, LogicGraph, LogicNode, LogicVariable, LogicVariableType, PortType } from '../shared/types/logic';
import { loaderDeployFolder, loaderDisplayName, loaderOutputFolder, loaderShortName, type LoaderId, type ModCompatibilityEntry, type ProjectModel } from '../shared/types/project';
import type { ResourceIndex, ResourceItem } from '../shared/types/resources';
import type { UiScreenModel, UiWidget, UiWidgetType } from '../shared/types/ui';
import type { BlockForgePluginManifest, InstalledPlugin, PluginAction, PluginAiPrompt, PluginElementBlueprint, PluginWorkbenchCard } from '../shared/types/plugins';

type ViewId = 'home' | 'design' | 'elements' | 'resources' | 'logic' | 'ui' | 'forge' | 'ai' | 'plugins' | 'manage' | 'settings';
type BottomId = 'logs' | 'diagnostics' | 'ir' | 'code' | 'ai';
type ElementKind = 'item' | 'tool' | 'block' | 'recipe' | 'loot_table' | 'function' | 'mob_effect' | 'potion' | 'enchantment';
type TextureTool = 'pencil' | 'eraser' | 'fill' | 'eyedropper';
type TextureSize = 16 | 32 | 64;
type ModelUsage = 'item_model' | 'block_model';

type ElementSet = {
  items: ElementModel[];
  tools: ElementModel[];
  blocks: ElementModel[];
  recipes: ElementModel[];
  lootTables: ElementModel[];
  functions: ElementModel[];
  mobEffects: ElementModel[];
  potions: ElementModel[];
  enchantments: ElementModel[];
};

type ResourceContextMenu = {
  resource: ResourceItem;
  x: number;
  y: number;
} | null;

type SnapshotInfo = {
  id: string;
  path: string;
  createdAt: string;
  reason: string;
};

type InstalledTemplate = {
  manifest: {
    id: string;
    name: string;
    version: string;
    author: string;
    description: string;
  };
  installedPath: string;
  installedAt: string;
};

type PluginActionRuntime = PluginAction & { pluginId: string; pluginName: string };
type PluginCardRuntime = PluginWorkbenchCard & { pluginId: string; pluginName: string };
type PluginPromptRuntime = PluginAiPrompt & { pluginId: string; pluginName: string };
type PluginBlueprintRuntime = PluginElementBlueprint & { pluginId: string; pluginName: string };
type PluginRuntime = InstalledPlugin;

type AppSettings = {
  autoBuildAfterGenerate: boolean;
  backgroundColor: string;
  uiDensity: UiDensity;
  panelVisibility: PanelVisibility;
  aiPermissions: AiPermissions;
  completedProjects: CompletedProject[];
};

type UiDensity = 'comfortable' | 'compact';

type PanelVisibility = {
  leftSidebar: boolean;
  rightSidebar: boolean;
  bottomPanel: boolean;
};

type AiPermissions = {
  chat: boolean;
  readProjectContext: boolean;
  logicDraft: boolean;
  textureDraft: boolean;
  modelDraft: boolean;
  featureRecipe: boolean;
  projectPlan: boolean;
  applyProjectPlan: boolean;
};

type CompletedProject = {
  id: string;
  name: string;
  modId: string;
  projectDir: string;
  status: 'completed' | 'polish' | 'archived';
  notes: string;
  updatedAt: string;
};

type DesignModuleStatus = 'done' | 'active' | 'todo' | 'blocked';

type DesignModule = {
  id: string;
  title: string;
  status: DesignModuleStatus;
  progress: number;
  summary: string;
  nextAction: string;
  view: ViewId;
};

type DesignTask = {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  view: ViewId;
  actionLabel: string;
};

type ContentKit = {
  id: string;
  title: string;
  subtitle: string;
  elementKind: ElementKind;
  elementId: string;
  elementName: string;
  view: ViewId;
  tone: 'grass' | 'stone' | 'ore' | 'redstone';
};

const loaderOptions: Array<{ id: LoaderId; label: string; hint: string }> = [
  { id: 'forge', label: 'Forge 模组', hint: '适合现有 Forge 流程、事件代码和模组发布。' },
  { id: 'fabric', label: 'Fabric 模组', hint: '适合更轻量的 Fabric 工程和资源输出。' },
  { id: 'paper', label: 'Paper 插件', hint: '适合常见的 Bukkit / Spigot / Paper 服务端插件。' }
];

type AiDraftNode = {
  id?: string;
  nodeId?: string;
  nodeType?: string;
  type?: string;
  title?: string;
  params?: Record<string, unknown>;
  position?: { x?: number; y?: number };
  comment?: string;
};

type AiDraftEdge = {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: PortType;
};

type AiLogicDraft = {
  type: 'logic_graph_draft';
  name?: string;
  event: string;
  boundElement?: string;
  nodes: AiDraftNode[];
  edges: AiDraftEdge[];
};

type TextureEditorDraft = {
  textureName: string;
  textureUsage: 'item_texture' | 'block_texture';
  textureOwner: string;
  textureSize: TextureSize;
  textureColor: string;
  textureTool: TextureTool;
  texturePixels: string[];
  texturePixelScale?: number;
  updatedAt?: string;
};

type ModelEditorDraft = {
  modelName: string;
  modelUsage: ModelUsage;
  modelOwner: string;
  modelJson: string;
  updatedAt?: string;
};

type PrivacyScanResult = {
  ok: boolean;
  rootDir: string;
  scannedFiles: number;
  findings: Array<{
    type: string;
    file: string;
    line: number;
  }>;
};

const api = window.blockforge;
const textureEditorMode = new URLSearchParams(window.location.search).get('textureEditor') === '1';
const modelEditorMode = new URLSearchParams(window.location.search).get('modelEditor') === '1';
const initialProjectDir = new URLSearchParams(window.location.search).get('projectDir') || 'E:\\MCMOD\\projects\\ice_wand_demo';
const emptyElements: ElementSet = { items: [], tools: [], blocks: [], recipes: [], lootTables: [], functions: [], mobEffects: [], potions: [], enchantments: [] };
const kindLabels: Record<ElementKind, string> = {
  item: '物品',
  tool: '工具',
  block: '方块',
  recipe: '配方',
  loot_table: '战利品表',
  function: 'mcfunction',
  mob_effect: '状态效果',
  potion: '药水',
  enchantment: '附魔'
};
const itemKindLabels: Record<ItemKind, string> = {
  generic: '普通物品 / 材料',
  magic_wand: '法杖 / 特殊右键物品',
  weapon_sword: '武器：剑',
  weapon_axe: '武器：斧',
  weapon_bow: '武器：弓',
  weapon_crossbow: '武器：弩',
  weapon_pistol: '武器：手枪',
  weapon_rifle: '武器：步枪',
  weapon_shotgun: '武器：霰弹枪',
  weapon_magic_gun: '武器：魔能枪',
  weapon_spear: '武器：长枪',
  weapon_hammer: '武器：战锤',
  weapon_dagger: '武器：匕首',
  weapon_shield: '武器：盾',
  armor_helmet: '护甲：头盔',
  armor_chestplate: '护甲：胸甲',
  armor_leggings: '护甲：护腿',
  armor_boots: '护甲：靴子',
  tool_pickaxe: '工具：镐',
  tool_axe: '工具：斧',
  tool_shovel: '工具：铲',
  tool_hoe: '工具：锄',
  food: '食物'
};
const itemRarityLabels: Record<ItemRarity, string> = {
  common: '普通',
  uncommon: '罕见',
  rare: '稀有',
  epic: '史诗'
};
const itemUseAnimationLabels: Record<ItemUseAnimation, string> = {
  none: '无',
  eat: '进食',
  drink: '饮用',
  block: '格挡',
  bow: '拉弓',
  spear: '投掷',
  crossbow: '装填弩'
};
const mobEffectCategoryLabels: Record<MobEffectCategory, string> = {
  beneficial: '增益',
  harmful: '减益',
  neutral: '中性'
};
const potionKindLabels: Record<PotionKind, string> = {
  drinkable: '可饮用',
  splash: '喷溅',
  lingering: '滞留',
  tipped_arrow: '药箭'
};
const enchantmentRarityLabels: Record<EnchantmentRarity, string> = {
  common: '普通',
  uncommon: '罕见',
  rare: '稀有',
  very_rare: '极稀有'
};
const enchantmentSlotLabels: Record<EnchantmentSlot, string> = {
  mainhand: '主手',
  offhand: '副手',
  head: '头盔',
  chest: '胸甲',
  legs: '护腿',
  feet: '靴子',
  any: '任意'
};
const recipeTypeLabels: Record<RecipeType, string> = {
  shapeless: '无序合成',
  shaped: '有序合成',
  smelting: '熔炉烧炼'
};
type CompatibilityPreset = {
  modId: string;
  displayName: string;
  versionRange: string;
  dependencyType: ModCompatibilityEntry['dependencyType'];
  side: ModCompatibilityEntry['side'];
  gradleCoordinate: string;
  note: string;
};
const compatibilityPresets: CompatibilityPreset[] = [
  { modId: 'jei', displayName: 'Just Enough Items', versionRange: '[15,)', dependencyType: 'optional', side: 'client', gradleCoordinate: '', note: '配方展示、材料查询和玩家查阅入口。' },
  { modId: 'jade', displayName: 'Jade', versionRange: '[11,)', dependencyType: 'optional', side: 'client', gradleCoordinate: '', note: '方块/实体信息提示兼容。' },
  { modId: 'curios', displayName: 'Curios API', versionRange: '[5,)', dependencyType: 'optional', side: 'both', gradleCoordinate: '', note: '饰品槽、装备扩展和特殊物品栏。' },
  { modId: 'create', displayName: 'Create', versionRange: '[0.5,)', dependencyType: 'optional', side: 'both', gradleCoordinate: '', note: '机械动力、转轴、动力方块和材料联动。' },
  { modId: 'geckolib', displayName: 'GeckoLib', versionRange: '[4,)', dependencyType: 'optional', side: 'both', gradleCoordinate: '', note: '实体、方块和物品动画扩展。' },
  { modId: 'patchouli', displayName: 'Patchouli', versionRange: '[84,)', dependencyType: 'optional', side: 'both', gradleCoordinate: '', note: '内置手册、教程书和多页说明。' },
  { modId: 'architectury', displayName: 'Architectury API', versionRange: '[9,)', dependencyType: 'optional', side: 'both', gradleCoordinate: '', note: '多加载器公共 API 兼容层。' }
];
const variableTypeLabels: Record<LogicVariableType, string> = {
  number: '数字',
  string: '文本',
  boolean: '布尔'
};
const viewLabels: Record<ViewId, string> = {
  home: '工作台',
  design: '蓝图',
  elements: '方块/物品',
  resources: '材质资源',
  logic: '红石逻辑',
  ui: 'GUI 容器',
  forge: '工程输出',
  ai: 'AI 助手',
  plugins: '插件工坊',
  manage: '存档管理',
  settings: '设置/教程'
};
const bottomLabels: Record<BottomId, string> = {
  logs: '日志',
  diagnostics: '诊断',
  ir: '中间表示',
  code: '工程代码',
  ai: 'AI 输出'
};
const uiWidgetLabels: Record<UiWidgetType, string> = {
  label: '文本',
  button: '按钮',
  image: '图片',
  slot: '物品槽'
};
const itemTiers: ToolTier[] = ['WOOD', 'STONE', 'IRON', 'GOLD', 'DIAMOND', 'NETHERITE'];
const itemTierLabels: Record<ToolTier, string> = {
  WOOD: '木质',
  STONE: '石质',
  IRON: '铁质',
  GOLD: '金质',
  DIAMOND: '钻石',
  NETHERITE: '下界合金'
};
const eventNodeGroups = [
  { title: '玩家事件', nodes: [['event.player_join', '进入世界'], ['event.player_tick', '玩家每刻'], ['event.player_hurt', '受到伤害'], ['event.player_respawn', '重生'], ['event.player_attack', '攻击实体']] },
  { title: '物品/方块事件', nodes: [['event.item_right_click', '右键物品'], ['event.item_use', '使用物品'], ['event.item_crafted', '合成物品'], ['event.block_right_click', '右键方块'], ['event.block_break', '破坏方块'], ['event.block_place', '放置方块']] },
  { title: '实体/世界事件', nodes: [['event.living_death', '实体死亡'], ['event.entity_spawn', '实体生成'], ['event.world_load', '世界加载'], ['event.world_tick', '世界每刻']] }
] as const;
const gameNodeGroups = [
  { title: '玩家动作', nodes: [['action.send_message', '发消息'], ['action.give_item', '给予物品'], ['action.give_effect', '给予效果'], ['action.consume_xp_level', '消耗经验'], ['action.consume_item', '消耗物品'], ['action.give_xp', '给予经验']] },
  { title: '世界动作', nodes: [['action.play_sound', '播放音效'], ['action.spawn_particle', '生成粒子'], ['action.set_block', '设置方块'], ['action.summon_entity', '召唤实体'], ['action.execute_command', '执行命令'], ['action.set_time', '设置时间'], ['action.teleport_entity', '传送实体'], ['action.shoot_projectile', '发射弹丸']] },
  { title: '游戏判断', nodes: [['condition.player_has_item', '拥有物品'], ['condition.player_xp_level_at_least', '经验达到'], ['condition.cooldown_ready', '冷却完成'], ['condition.block_is', '脚下方块'], ['condition.biome_is', '所在群系'], ['condition.entity_type_is', '实体类型']] },
  { title: '变量 / NBT', nodes: [['condition.variable_equals', '变量等于'], ['condition.variable_greater_or_equal', '变量大于等于'], ['condition.nbt_has_key', 'NBT 存在'], ['condition.nbt_string_equals', 'NBT 文本等于'], ['condition.nbt_number_gte', 'NBT 数字大于等于'], ['action.variable_set', '设置变量'], ['action.variable_add', '增加变量'], ['action.set_variable_text', '设置文本变量'], ['action.append_to_list', '追加文本列表'], ['action.nbt_set_string', '写入 NBT 文本'], ['action.nbt_set_number', '写入 NBT 数字'], ['action.nbt_set_boolean', '写入 NBT 布尔'], ['action.nbt_remove', '删除 NBT']] },
  { title: '经验与状态', nodes: [['action.give_xp', '给予经验'], ['action.give_effect', '给予效果'], ['action.consume_xp_level', '消耗经验']] }
] as const;
const defaultAiPermissions: AiPermissions = {
  chat: true,
  readProjectContext: true,
  logicDraft: true,
  textureDraft: true,
  modelDraft: true,
  featureRecipe: true,
  projectPlan: false,
  applyProjectPlan: false
};

const defaultPanelVisibility: PanelVisibility = {
  leftSidebar: true,
  rightSidebar: true,
  bottomPanel: true
};

const defaultAppSettings: AppSettings = { autoBuildAfterGenerate: false, backgroundColor: '#ffffff', uiDensity: 'comfortable', panelVisibility: defaultPanelVisibility, aiPermissions: defaultAiPermissions, completedProjects: [] };

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function previewTextureDraft(draft: AiTextureDraft) {
  return pretty({
    ...draft,
    pixels: `${draft.pixels.length} pixels`,
    previewPixels: draft.pixels.slice(0, 64)
  });
}

function previewModelDraft(draft: AiModelDraft) {
  return pretty({
    ...draft,
    modelJson: draft.modelJson.length > 1600 ? `${draft.modelJson.slice(0, 1600)}\n...` : draft.modelJson
  });
}

function shortPath(value: string, maxLength = 58) {
  if (value.length <= maxLength) return value;
  return `...${value.slice(value.length - maxLength)}`;
}

function nowLine(text: string) {
  return `[${new Date().toLocaleTimeString()}] ${text}`;
}

function diagnosticLevelLabel(level: Diagnostic['level']) {
  if (level === 'error') return '错误';
  if (level === 'warning') return '警告';
  return '信息';
}

function formatDiagnostics(items: Diagnostic[]) {
  return items.map((item, index) => [
    `${index + 1}. [${diagnosticLevelLabel(item.level)}] ${item.code}`,
    `位置：${item.target || '全局'}`,
    `说明：${item.message}`,
    item.humanAdvice ? `建议：${item.humanAdvice}` : ''
  ].filter(Boolean).join('\n')).join('\n\n');
}

function formatBuildResult(result: unknown) {
  const value = result as {
    success?: boolean;
    message?: string;
    logFile?: string;
    jarFiles?: string[];
    copiedToExports?: string[];
    javaOk?: boolean;
    gradleCommand?: string;
  };
  return [
    `状态：${value.success ? '成功' : '失败'}`,
    value.message ? `说明：${value.message}` : '',
    `Java 检查：${value.javaOk ? '通过' : '未通过'}`,
    value.gradleCommand ? `Gradle 命令：${value.gradleCommand}` : '',
    value.logFile ? `日志文件：${value.logFile}` : '',
    value.jarFiles?.length ? `生成 jar：\n${value.jarFiles.join('\n')}` : '生成 jar：无',
    value.copiedToExports?.length ? `已复制到 exports：\n${value.copiedToExports.join('\n')}` : '已复制到 exports：无'
  ].filter(Boolean).join('\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseAiDraftFromOutput(text: string): AiLogicDraft {
  const value = JSON.parse(text) as Partial<AiLogicDraft>;
  if (value.type !== 'logic_graph_draft' || !value.event || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    throw new Error('当前 AI 输出不是可应用的 logic_graph_draft。请先重新生成草案。');
  }
  return value as AiLogicDraft;
}

function normalizeEventType(event: string) {
  return event.replace(/^event\./, '').trim() || 'item_right_click';
}

function defaultSourceHandle(node: LogicNode) {
  return node.outputs.find(port => port.id === 'exec_out')?.id
    || node.outputs.find(port => port.id === 'true_out')?.id
    || node.outputs.find(port => port.type === 'exec')?.id
    || 'exec_out';
}

function defaultTargetHandle(node: LogicNode) {
  return node.inputs.find(port => port.id === 'exec_in')?.id
    || node.inputs.find(port => port.type === 'exec')?.id
    || 'exec_in';
}

function coerceParamValue(current: unknown, next: string) {
  const trimmed = next.trim();
  if (/^var:[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed) || /^\$\{[a-zA-Z_][a-zA-Z0-9_]*\}$/.test(trimmed)) return trimmed;
  if (typeof current === 'number') {
    const number = Number(next);
    return Number.isFinite(number) ? number : next;
  }
  if (typeof current === 'boolean') return next === 'true';
  return next;
}

function formatVariableReferenceForParam(key: string, current: unknown, variableId: string) {
  const id = variableId.trim().replace(/[^a-zA-Z0-9_]/g, '_');
  if (!id) return '';
  if (key === 'variable') return id;
  if (typeof current === 'number' || typeof current === 'boolean') return `var:${id}`;
  return '${' + id + '}';
}

function itemKindDefaults(kind: ItemKind): Record<string, unknown> {
  const base = {
    itemKind: kind,
    maxStackSize: 64,
    durability: undefined,
    tier: undefined,
    rarity: 'common',
    attackDamage: undefined,
    attackSpeed: undefined,
    useDuration: 32,
    useAnimation: 'none',
    enchantmentValue: 1,
    canRepair: true,
    ammoItem: '',
    ammoPerShot: 1,
    magazineSize: 1,
    reloadTicks: 20,
    projectileDamage: 2,
    projectileSpeed: 3,
    projectileSpread: 1,
    shotCount: 1
  };
  if (kind === 'magic_wand') return { ...base, maxStackSize: 1, durability: 128, tier: 'DIAMOND', rarity: 'rare', attackDamage: 4, attackSpeed: -2.2, useDuration: 24, useAnimation: 'spear', enchantmentValue: 18 };
  if (kind === 'weapon_sword') return { ...base, maxStackSize: 1, durability: 250, tier: 'IRON', rarity: 'uncommon', attackDamage: 3, attackSpeed: -2.4, useAnimation: 'block', enchantmentValue: 14 };
  if (kind === 'weapon_axe') return { ...base, maxStackSize: 1, durability: 250, tier: 'IRON', rarity: 'uncommon', attackDamage: 6, attackSpeed: -3.1, useAnimation: 'block', enchantmentValue: 14 };
  if (kind === 'weapon_bow') return { ...base, maxStackSize: 1, durability: 384, tier: 'IRON', rarity: 'rare', attackDamage: 2, attackSpeed: -2.8, useDuration: 72000, useAnimation: 'bow', enchantmentValue: 1 };
  if (kind === 'weapon_crossbow') return { ...base, maxStackSize: 1, durability: 465, tier: 'IRON', rarity: 'rare', attackDamage: 2, attackSpeed: -3, useDuration: 72000, useAnimation: 'crossbow', enchantmentValue: 1 };
  if (kind === 'weapon_pistol') return { ...base, maxStackSize: 1, durability: 200, tier: 'IRON', rarity: 'rare', attackDamage: 6, attackSpeed: -2.5, useDuration: 20, useAnimation: 'crossbow', enchantmentValue: 1, ammoItem: 'minecraft:arrow', ammoPerShot: 1, magazineSize: 6, reloadTicks: 20, projectileDamage: 6, projectileSpeed: 4.5, projectileSpread: 0.8, shotCount: 1 };
  if (kind === 'weapon_rifle') return { ...base, maxStackSize: 1, durability: 320, tier: 'IRON', rarity: 'rare', attackDamage: 8, attackSpeed: -2.9, useDuration: 20, useAnimation: 'crossbow', enchantmentValue: 1, ammoItem: 'minecraft:arrow', ammoPerShot: 1, magazineSize: 12, reloadTicks: 30, projectileDamage: 8, projectileSpeed: 5.5, projectileSpread: 0.2, shotCount: 1 };
  if (kind === 'weapon_shotgun') return { ...base, maxStackSize: 1, durability: 280, tier: 'IRON', rarity: 'epic', attackDamage: 4, attackSpeed: -3, useDuration: 20, useAnimation: 'crossbow', enchantmentValue: 1, ammoItem: 'minecraft:arrow', ammoPerShot: 1, magazineSize: 4, reloadTicks: 35, projectileDamage: 4, projectileSpeed: 3.5, projectileSpread: 2.5, shotCount: 5 };
  if (kind === 'weapon_magic_gun') return { ...base, maxStackSize: 1, durability: 500, tier: 'DIAMOND', rarity: 'epic', attackDamage: 10, attackSpeed: -2.8, useDuration: 20, useAnimation: 'crossbow', enchantmentValue: 18, ammoItem: 'minecraft:ender_pearl', ammoPerShot: 1, magazineSize: 8, reloadTicks: 25, projectileDamage: 10, projectileSpeed: 6, projectileSpread: 0.1, shotCount: 1 };
  if (kind === 'weapon_spear') return { ...base, maxStackSize: 1, durability: 250, tier: 'IRON', rarity: 'uncommon', attackDamage: 5, attackSpeed: -2.9, useDuration: 72000, useAnimation: 'spear', enchantmentValue: 14 };
  if (kind === 'weapon_hammer') return { ...base, maxStackSize: 1, durability: 450, tier: 'IRON', rarity: 'rare', attackDamage: 9, attackSpeed: -3.5, useAnimation: 'block', enchantmentValue: 12 };
  if (kind === 'weapon_dagger') return { ...base, maxStackSize: 1, durability: 150, tier: 'IRON', rarity: 'uncommon', attackDamage: 2, attackSpeed: -1.2, useAnimation: 'none', enchantmentValue: 10 };
  if (kind === 'weapon_shield') return { ...base, maxStackSize: 1, durability: 336, tier: 'IRON', rarity: 'uncommon', attackDamage: 0, attackSpeed: -3, useDuration: 72000, useAnimation: 'block', enchantmentValue: 1 };
  if (kind === 'armor_helmet' || kind === 'armor_chestplate' || kind === 'armor_leggings' || kind === 'armor_boots') return { ...base, maxStackSize: 1, durability: 200, tier: 'IRON', rarity: 'rare', attackDamage: 0, attackSpeed: 0, useAnimation: 'none', enchantmentValue: 9 };
  if (kind === 'tool_pickaxe') return { ...base, maxStackSize: 1, durability: 250, tier: 'IRON', rarity: 'uncommon', attackDamage: 1, attackSpeed: -2.8, useAnimation: 'none', enchantmentValue: 12 };
  if (kind === 'tool_axe') return { ...base, maxStackSize: 1, durability: 250, tier: 'IRON', rarity: 'uncommon', attackDamage: 6, attackSpeed: -3.1, useAnimation: 'none', enchantmentValue: 12 };
  if (kind === 'tool_shovel') return { ...base, maxStackSize: 1, durability: 250, tier: 'IRON', rarity: 'uncommon', attackDamage: 1.5, attackSpeed: -3, useAnimation: 'none', enchantmentValue: 12 };
  if (kind === 'tool_hoe') return { ...base, maxStackSize: 1, durability: 250, tier: 'IRON', rarity: 'uncommon', attackDamage: -2, attackSpeed: -1, useAnimation: 'none', enchantmentValue: 12 };
  if (kind === 'food') return { ...base, maxStackSize: 64, durability: undefined, rarity: 'common', foodNutrition: 4, foodSaturation: 0.3, foodIsMeat: false, alwaysEat: false, useAnimation: 'eat', useDuration: 32 };
  return base;
}

function formatRecipePattern(value: unknown) {
  return Array.isArray(value) ? value.map(line => String(line)).join('\n') : '';
}

function parseRecipePattern(value: string) {
  return value.split(/\r?\n/).map(line => line.trimEnd()).filter(line => line.length > 0);
}

function formatRecipeKey(value: unknown) {
  if (!isRecord(value)) return '';
  return Object.entries(value).map(([slot, item]) => `${slot}=${String(item)}`).join('\n');
}

function parseRecipeKey(value: string) {
  const key: Record<string, string> = {};
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(.+?)[=:](.+)$/);
    if (match) key[match[1].trim()] = match[2].trim();
  }
  return key;
}

function normalizeSettings(settings: Partial<AppSettings>): AppSettings {
  return {
    ...defaultAppSettings,
    ...settings,
    uiDensity: settings.uiDensity === 'compact' ? 'compact' : 'comfortable',
    panelVisibility: { ...defaultPanelVisibility, ...(settings.panelVisibility || {}) },
    aiPermissions: { ...defaultAiPermissions, ...(settings.aiPermissions || {}) },
    completedProjects: Array.isArray(settings.completedProjects) ? settings.completedProjects : []
  };
}

function normalizeVariable(value: unknown, index: number): LogicVariable {
  if (typeof value === 'string') {
    return { id: value, name: value, type: 'number', defaultValue: 0, scope: 'local' };
  }
  const next = value as Partial<LogicVariable>;
  const type: LogicVariableType = next.type === 'string' || next.type === 'boolean' ? next.type : 'number';
  return {
    id: String(next.id || next.name || `var_${index}`).replace(/[^a-zA-Z0-9_]/g, '_'),
    name: String(next.name || next.id || `变量 ${index + 1}`),
    type,
    defaultValue: next.defaultValue ?? (type === 'boolean' ? false : type === 'string' ? '' : 0),
    scope: next.scope === 'player_persistent' || next.scope === 'global' ? next.scope : 'local'
  };
}

function normalizeLogicGraph(graph: LogicGraph): LogicGraph {
  return {
    ...graph,
    variables: (Array.isArray(graph.variables) ? graph.variables : []).map(normalizeVariable)
  };
}

function createTexturePixels(size: TextureSize, fill = 'transparent') {
  return Array.from({ length: size * size }, () => fill);
}

function ownerTextureName(ownerElement: string) {
  const id = ownerElement.split(':')[1] || ownerElement;
  return id.replace(/[^a-z0-9_]/g, '_').toLowerCase();
}

function ownerModelName(ownerElement: string) {
  return `${ownerTextureName(ownerElement)}_model`;
}

function isTextureNameValid(value: string) {
  return /^[a-z0-9_]+$/.test(value);
}

function isModelNameValid(value: string) {
  return /^[a-z0-9_]+$/.test(value);
}

function basenameNoExt(filePath: string) {
  return filePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || filePath;
}

function duplicateId(id: string) {
  return `${id}_copy`.replace(/[^a-z0-9_]/g, '_');
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createUiWidget(type: UiWidgetType, index: number): UiWidget {
  const base = {
    id: `${type}_${Date.now()}_${index}`,
    type,
    x: 16 + index * 6,
    y: 18 + index * 6,
    width: type === 'slot' ? 18 : type === 'image' ? 32 : 70,
    height: type === 'slot' ? 18 : type === 'image' ? 32 : 20,
    text: uiWidgetLabels[type]
  };
  if (type === 'button') return { ...base, text: '按钮', action: 'close' };
  if (type === 'image') return { ...base, text: '图片', texture: '' };
  if (type === 'slot') return { ...base, text: '槽位' };
  return base;
}

function providerNeedsApiKey(config: AiProviderConfig) {
  return config.provider !== 'ollama' && config.provider !== 'lmstudio';
}

function withApiKey(preset: Omit<AiProviderConfig, 'apiKey'>, apiKey = ''): AiProviderConfig {
  return { ...preset, apiKey };
}

function projectTargetLabel(project: ProjectModel | null): string {
  return project ? loaderDisplayName(project.primaryLoader) : 'Forge 模组';
}

function projectTargetShort(project: ProjectModel | null): string {
  return project ? loaderShortName(project.primaryLoader) : 'Forge';
}

function projectGeneratedRoot(project: ProjectModel | null): string {
  return project ? loaderOutputFolder(project.primaryLoader) : 'forge';
}

function projectDeployFolder(project: ProjectModel | null): string {
  return project ? loaderDeployFolder(project.primaryLoader) : 'mods';
}

function deploymentCommandsText(projectDir: string, project: ProjectModel | null): string {
  if (!project) return '先创建或打开项目，再生成工程。';
  const root = projectGeneratedRoot(project);
  return `输出文件：
${projectDir}\\generated\\${root}\\BLOCKFORGE_DEPLOY_COMMANDS.md
${projectDir}\\generated\\${root}\\blockforge-setup-env.ps1
${projectDir}\\generated\\${root}\\blockforge-check-env.ps1
${projectDir}\\generated\\${root}\\blockforge-deploy-local.ps1

常用命令：
cd ${projectDir}\\generated\\${root}
powershell -ExecutionPolicy Bypass -File .\\blockforge-check-env.ps1
powershell -ExecutionPolicy Bypass -File .\\blockforge-deploy-local.ps1 -Build

部署目标：${projectDeployFolder(project)}`;
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>(textureEditorMode || modelEditorMode ? 'resources' : 'home');
  const [bottomTab, setBottomTab] = useState<BottomId>('logs');
  const [projectDir, setProjectDir] = useState(initialProjectDir);
  const [openDir, setOpenDir] = useState('');
  const [project, setProject] = useState<ProjectModel | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [elements, setElements] = useState<ElementSet>(emptyElements);
  const [resources, setResources] = useState<ResourceIndex>({ schemaVersion: '0.1.0', resources: [] });
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [templates, setTemplates] = useState<InstalledTemplate[]>([]);
  const [plugins, setPlugins] = useState<PluginRuntime[]>([]);
  const [pluginCatalog, setPluginCatalog] = useState<BlockForgePluginManifest[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [logs, setLogs] = useState(nowLine('BlockForge Studio 已就绪。'));
  const [statusMessage, setStatusMessage] = useState('就绪');
  const [busy, setBusy] = useState('');
  const [irPreview, setIrPreview] = useState<BlockForgeIR | null>(null);
  const [codePreview, setCodePreview] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [aiDraft, setAiDraft] = useState<AiLogicDraft | null>(null);
  const [aiChatMessages, setAiChatMessages] = useState<AiChatMessage[]>([]);
  const [aiChatInput, setAiChatInput] = useState('帮我看看当前模组项目还可以补哪些内容？');
  const [aiProjectPrompt, setAiProjectPrompt] = useState('整体检查这个模组项目，补全缺失描述、优化元素命名、为物品和方块补全合理属性，并改进节点逻辑说明。');
  const [aiProjectPlan, setAiProjectPlan] = useState<AiProjectChangePlan | null>(null);
  const [aiProjectValidation, setAiProjectValidation] = useState<string[]>([]);
  const [aiScannedFiles, setAiScannedFiles] = useState<string[]>([]);
  const [aiAvailableModels, setAiAvailableModels] = useState<string[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [privacyResult, setPrivacyResult] = useState<PrivacyScanResult | null>(null);

  const [displayName, setDisplayName] = useState('Ice Wand Demo');
  const [modId, setModId] = useState('ice_wand_demo');
  const [packageName, setPackageName] = useState('com.blockforge.ice_wand_demo');
  const [author, setAuthor] = useState('player');
  const [projectLoader, setProjectLoader] = useState<LoaderId>('forge');
  const [compatModId, setCompatModId] = useState('');
  const [compatDisplayName, setCompatDisplayName] = useState('');
  const [compatVersionRange, setCompatVersionRange] = useState('[0,)');
  const [compatDependencyType, setCompatDependencyType] = useState<ModCompatibilityEntry['dependencyType']>('required');
  const [compatSide, setCompatSide] = useState<ModCompatibilityEntry['side']>('both');
  const [compatGradleCoordinate, setCompatGradleCoordinate] = useState('');
  const [compatNote, setCompatNote] = useState('');

  const [elementKind, setElementKind] = useState<ElementKind>('item');
  const [elementId, setElementId] = useState('ice_wand');
  const [elementName, setElementName] = useState('冰霜法杖');
  const [elementFilter, setElementFilter] = useState('');
  const [draftElement, setDraftElement] = useState<ElementModel | null>(null);
  const [elementJson, setElementJson] = useState('');

  const [texturePath, setTexturePath] = useState('');
  const [textureUsage, setTextureUsage] = useState<'item_texture' | 'block_texture'>('item_texture');
  const [textureOwner, setTextureOwner] = useState('item:ice_wand');
  const [textureName, setTextureName] = useState('ice_wand');
  const [textureSize, setTextureSize] = useState<TextureSize>(16);
  const [texturePixelScale, setTexturePixelScale] = useState(24);
  const [textureColor, setTextureColor] = useState('#7dd3fc');
  const [textureTool, setTextureTool] = useState<TextureTool>('pencil');
  const [texturePixels, setTexturePixels] = useState(() => createTexturePixels(16));
  const [textureDrawing, setTextureDrawing] = useState(false);
  const [textureDraftLoaded, setTextureDraftLoaded] = useState(false);
  const [modelPath, setModelPath] = useState('');
  const [modelUsage, setModelUsage] = useState<ModelUsage>('item_model');
  const [modelOwner, setModelOwner] = useState('item:ice_wand');
  const [modelName, setModelName] = useState('ice_wand_model');
  const [modelJson, setModelJson] = useState('');
  const [modelDraftLoaded, setModelDraftLoaded] = useState(false);
  const [resourceMenu, setResourceMenu] = useState<ResourceContextMenu>(null);
  const [templatePath, setTemplatePath] = useState('');
  const [pluginPath, setPluginPath] = useState('');
  const [pluginStarterName, setPluginStarterName] = useState('my_plugin');

  const [graphs, setGraphs] = useState<LogicGraph[]>([]);
  const [currentGraph, setCurrentGraph] = useState<LogicGraph | null>(null);
  const [variableId, setVariableId] = useState('counter');
  const [variableName, setVariableName] = useState('计数器');
  const [variableType, setVariableType] = useState<LogicVariableType>('number');
  const [variableDefault, setVariableDefault] = useState('0');
  const [nodeTypes, setNodeTypes] = useState<string[]>([]);
  const [selectedNodeType, setSelectedNodeType] = useState('action.send_message');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [edgeSource, setEdgeSource] = useState('');
  const [edgeSourceHandle, setEdgeSourceHandle] = useState('exec_out');
  const [edgeTarget, setEdgeTarget] = useState('');

  const [uiScreens, setUiScreens] = useState<UiScreenModel[]>([]);
  const [currentUiScreen, setCurrentUiScreen] = useState<UiScreenModel | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState('');

  const [aiConfig, setAiConfig] = useState<AiProviderConfig>({
    provider: 'deepseek',
    displayName: 'DeepSeek',
    apiBaseUrl: 'https://api.deepseek.com',
    apiKey: '',
    model: 'deepseek-chat',
    temperature: 0.3,
    maxTokens: 4096,
    stream: false,
    timeoutMs: 60000,
    compatibleMode: 'openai'
  });
  const [aiPrompt, setAiPrompt] = useState('右键冰霜法杖，消耗10级经验，执行冰冻效果命令，然后进入5秒冷却。');
  const [aiTexturePrompt, setAiTexturePrompt] = useState('画一个 16x16 的 Minecraft 冰霜法杖物品贴图，深蓝木柄、浅蓝晶体、雪花高光，适合物品栏显示。');
  const [aiTextureDraft, setAiTextureDraft] = useState<AiTextureDraft | null>(null);
  const [aiModelPrompt, setAiModelPrompt] = useState('生成一个可在 Blockbench 打开的冰霜法杖 3D 物品模型，细长手柄、顶部蓝色晶体，符合当前工程目标和 1.20.1。');
  const [aiModelDraft, setAiModelDraft] = useState<AiModelDraft | null>(null);
  const [aiFeaturePrompt, setAiFeaturePrompt] = useState('设计一个会动起来的魔法方块：周期性发光、粒子、音效、右键切换状态，并给出材质、动画、节点逻辑和当前工程目标的制作路线。');
  const [aiFeatureDraft, setAiFeatureDraft] = useState<AiModFeatureDraft | null>(null);
  const commandHandlers = useRef<Record<string, () => void>>({});
  const autoOpenedTextureProject = useRef(false);

  const allElements = useMemo(() => [
    ...elements.items,
    ...elements.tools,
    ...elements.blocks,
    ...elements.recipes,
    ...elements.lootTables,
    ...elements.functions,
    ...elements.mobEffects,
    ...elements.potions,
    ...elements.enchantments
  ], [elements]);
  const filteredElements = useMemo(() => {
    const keyword = elementFilter.trim().toLowerCase();
    if (!keyword) return allElements;
    return allElements.filter(element => [
      element.id,
      element.type,
      element.displayName.zh_cn,
      element.displayName.en_us,
      element.description
    ].join(' ').toLowerCase().includes(keyword));
  }, [allElements, elementFilter]);
  const projectStats = useMemo(() => ({
    elements: allElements.length,
    resources: resources.resources.length,
    graphs: graphs.length,
    screens: uiScreens.length,
    plugins: plugins.filter(plugin => plugin.enabled).length,
    completed: appSettings.completedProjects.some(item => item.projectDir === projectDir)
  }), [allElements.length, appSettings.completedProjects, graphs.length, plugins, projectDir, resources.resources.length, uiScreens.length]);
  const missingTextureElements = useMemo(() => allElements.filter(element => {
    if (element.type === 'item' || element.type === 'tool') return !(element.properties as { texture?: string; model?: string }).texture && !(element.properties as { model?: string }).model;
    if (element.type === 'block') return !(element.properties as { textureAll?: string; model?: string }).textureAll && !(element.properties as { model?: string }).model;
    return false;
  }), [allElements]);
  const contentKits = useMemo<ContentKit[]>(() => [
    {
      id: 'ore_line',
      title: '矿脉材料线',
      subtitle: '先做发光矿石，再补材料、掉落和熔炼配方。',
      elementKind: 'block',
      elementId: 'glow_ore',
      elementName: '发光矿石',
      view: 'elements',
      tone: 'stone'
    },
    {
      id: 'spell_line',
      title: '法杖药水线',
      subtitle: '适合右键施法、状态效果、药水和粒子命令。',
      elementKind: 'item',
      elementId: 'arcane_staff',
      elementName: '奥术法杖',
      view: 'elements',
      tone: 'ore'
    },
    {
      id: 'tool_line',
      title: '工具武器线',
      subtitle: '适合剑、斧、镐、铲、锄等更细的装备起点。',
      elementKind: 'tool',
      elementId: 'frost_pickaxe',
      elementName: '霜冻工具',
      view: 'elements',
      tone: 'stone'
    },
    {
      id: 'machine_line',
      title: '机器方块线',
      subtitle: '适合 GUI、物品槽、红石节点和方块交互。',
      elementKind: 'block',
      elementId: 'copper_workbench',
      elementName: '铜制工作台',
      view: 'elements',
      tone: 'redstone'
    },
    {
      id: 'survival_line',
      title: '生存扩展线',
      subtitle: '从食物、附魔、战利品表开始做可游玩的内容。',
      elementKind: 'item',
      elementId: 'cave_berry',
      elementName: '洞穴浆果',
      view: 'elements',
      tone: 'grass'
    }
  ], []);
  const designTasks = useMemo<DesignTask[]>(() => [
    {
      id: 'project',
      title: '建立项目档案',
      detail: project ? `当前项目：${project.displayName}，命名空间：${project.modId}，目标：${projectTargetLabel(project)}` : '还没有打开项目，不能继续生成元素和工程。',
      done: Boolean(project),
      view: 'home',
      actionLabel: project ? '查看项目' : '创建项目'
    },
    {
      id: 'core-element',
      title: '至少制作一个核心元素',
      detail: projectStats.elements > 0 ? `已创建 ${projectStats.elements} 个元素。` : '建议先做一个物品或方块，再补配方、掉落和逻辑。',
      done: projectStats.elements > 0,
      view: 'elements',
      actionLabel: '编辑元素'
    },
    {
      id: 'textures',
      title: '补齐物品和方块贴图',
      detail: missingTextureElements.length === 0 && projectStats.elements > 0 ? '物品和方块都已绑定贴图。' : `还有 ${missingTextureElements.length} 个物品或方块缺少贴图。`,
      done: projectStats.elements > 0 && missingTextureElements.length === 0,
      view: 'resources',
      actionLabel: '处理贴图'
    },
    {
      id: 'recipe',
      title: '补充获取方式',
      detail: elements.recipes.length > 0 || elements.lootTables.length > 0 ? `配方 ${elements.recipes.length}，战利品表 ${elements.lootTables.length}。` : '建议至少添加一个配方或战利品表，让玩家能在游戏里获得内容。',
      done: elements.recipes.length > 0 || elements.lootTables.length > 0,
      view: 'elements',
      actionLabel: '添加配方'
    },
    {
      id: 'logic',
      title: '配置交互逻辑',
      detail: projectStats.graphs > 0 ? `已有 ${projectStats.graphs} 张节点图，可以继续校验和预览代码。` : '可以用节点图实现右键、变量、NBT、命令和条件判断。',
      done: projectStats.graphs > 0,
      view: 'logic',
      actionLabel: '编辑节点'
    },
    {
      id: 'ui',
      title: '设计可选 GUI',
      detail: projectStats.screens > 0 ? `已有 ${projectStats.screens} 个界面模型。` : '如果模组需要菜单、机器界面或信息面板，可以在这里做 GUI 草图。',
      done: projectStats.screens > 0,
      view: 'ui',
      actionLabel: '设计界面'
    },
    {
      id: 'forge',
      title: '生成并构建工程',
      detail: codePreview ? '已经有代码预览，下一步可以构建 jar。' : '生成工程后会写入 Java、资源、Gradle、部署脚本和日志。',
      done: Boolean(codePreview),
      view: 'forge',
      actionLabel: '生成工程'
    }
  ], [codePreview, elements.lootTables.length, elements.recipes.length, missingTextureElements.length, project, projectStats.elements, projectStats.graphs, projectStats.screens]);
  const designModules = useMemo<DesignModule[]>(() => {
    const hasProjectOutput = Boolean(project) && (codePreview.length > 0 || diagnostics.some(item => item.code.includes('FORGE') || item.code.includes('BUILD')));
    return [
      {
        id: 'project',
        title: '项目基础',
        status: project ? 'done' : 'todo',
        progress: project ? 100 : 0,
        summary: project ? `${project.displayName} / ${project.modId} / ${projectTargetLabel(project)}` : '先创建或打开一个 BlockForge 项目。',
        nextAction: project ? '继续完善内容' : '创建项目或打开最近项目',
        view: 'home'
      },
      {
        id: 'elements',
        title: '元素系统',
        status: projectStats.elements > 0 ? 'active' : project ? 'todo' : 'blocked',
        progress: Math.min(100, projectStats.elements * 18),
        summary: `物品 ${elements.items.length}、工具 ${elements.tools.length}、方块 ${elements.blocks.length}、配方 ${elements.recipes.length}、战利品表 ${elements.lootTables.length}、函数 ${elements.functions.length}`,
        nextAction: projectStats.elements > 0 ? '继续细化属性和说明' : '至少创建一个物品或方块',
        view: 'elements'
      },
      {
        id: 'resources',
        title: '资源与贴图',
        status: projectStats.resources > 0 ? 'active' : projectStats.elements > 0 ? 'todo' : 'blocked',
        progress: Math.min(100, projectStats.resources * 25),
        summary: `已登记 ${projectStats.resources} 个贴图与模型资源，支持导入、绘制、复制、删除和绑定。`,
        nextAction: projectStats.resources > 0 ? '检查缺失资源并补齐' : '导入 PNG 或 3D 模型资源',
        view: 'resources'
      },
      {
        id: 'logic',
        title: '节点逻辑',
        status: projectStats.graphs > 0 ? 'active' : projectStats.elements > 0 ? 'todo' : 'blocked',
        progress: Math.min(100, projectStats.graphs * 35),
        summary: `已有 ${projectStats.graphs} 张节点图；支持变量、NBT、条件、动作和代码预览。`,
        nextAction: projectStats.graphs > 0 ? '校验并编译为 IR' : '创建示例节点图或让 AI 生成草案',
        view: 'logic'
      },
      {
        id: 'ui',
        title: '可视化界面',
        status: projectStats.screens > 0 ? 'active' : project ? 'todo' : 'blocked',
        progress: Math.min(100, projectStats.screens * 50),
        summary: `已有 ${projectStats.screens} 个界面模型；支持文本、按钮、图片、物品槽。`,
        nextAction: projectStats.screens > 0 ? '调整控件属性和布局' : '创建一个 GUI 草图',
        view: 'ui'
      },
      {
        id: 'plugins',
        title: '插件扩展',
        status: projectStats.plugins > 0 ? 'active' : project ? 'todo' : 'blocked',
        progress: Math.min(100, projectStats.plugins * 36),
        summary: `已有 ${projectStats.plugins} 个已启用插件；可以贡献卡片、元素蓝图、AI 提示和文档。`,
        nextAction: projectStats.plugins > 0 ? '继续安装或编写插件包' : '先安装一个内置插件或导入插件包',
        view: 'plugins'
      },
      {
        id: 'forge',
        title: '生成与构建',
        status: hasProjectOutput ? 'active' : project ? 'todo' : 'blocked',
        progress: hasProjectOutput ? 70 : 0,
        summary: `生成 ${projectTargetShort(project)} 1.20.1 工程、构建前快照、国内镜像、部署脚本和导出目录。`,
        nextAction: hasProjectOutput ? '运行构建并查看日志' : '生成工程',
        view: 'forge'
      },
      {
        id: 'ai',
        title: 'AI 辅助',
        status: aiConfig.model ? 'active' : 'todo',
        progress: aiChatMessages.length > 0 || aiProjectPlan ? 80 : aiConfig.model ? 45 : 0,
        summary: `当前模型：${aiConfig.displayName || aiConfig.provider} / ${aiConfig.model || '未设置'}`,
        nextAction: aiChatMessages.length > 0 ? '保存对话或生成变更计划' : '检测本地模型并开始对话',
        view: 'ai'
      }
    ];
  }, [aiChatMessages.length, aiConfig.displayName, aiConfig.model, aiConfig.provider, aiProjectPlan, codePreview.length, diagnostics, elements.blocks.length, elements.functions.length, elements.items.length, elements.tools.length, elements.lootTables.length, elements.recipes.length, project, projectStats.elements, projectStats.graphs, projectStats.plugins, projectStats.resources, projectStats.screens]);
  const designScore = useMemo(() => {
    if (designModules.length === 0) return 0;
    return Math.round(designModules.reduce((sum, item) => sum + item.progress, 0) / designModules.length);
  }, [designModules]);
  const nextDesignModules = designModules.filter(item => item.status !== 'done' && item.progress < 100).slice(0, 3);
  const taskScore = useMemo(() => {
    if (designTasks.length === 0) return 0;
    return Math.round((designTasks.filter(task => task.done).length / designTasks.length) * 100);
  }, [designTasks]);
  const pluginCards = useMemo(() => plugins.filter(plugin => plugin.enabled).flatMap(plugin => (plugin.manifest.contributes.cards || []).map(card => ({ ...card, pluginId: plugin.manifest.id, pluginName: plugin.manifest.name }))), [plugins]);
  const pluginActions = useMemo(() => plugins.filter(plugin => plugin.enabled).flatMap(plugin => (plugin.manifest.contributes.actions || []).map(action => ({ ...action, pluginId: plugin.manifest.id, pluginName: plugin.manifest.name }))), [plugins]);
  const pluginPrompts = useMemo(() => plugins.filter(plugin => plugin.enabled).flatMap(plugin => (plugin.manifest.contributes.aiPrompts || []).map(prompt => ({ ...prompt, pluginId: plugin.manifest.id, pluginName: plugin.manifest.name }))), [plugins]);
  const pluginBlueprints = useMemo(() => plugins.filter(plugin => plugin.enabled).flatMap(plugin => (plugin.manifest.contributes.elementBlueprints || []).map(blueprint => ({ ...blueprint, pluginId: plugin.manifest.id, pluginName: plugin.manifest.name }))), [plugins]);
  const pluginDocs = useMemo(() => plugins.filter(plugin => plugin.enabled).flatMap(plugin => (plugin.manifest.contributes.docs || []).map(doc => ({ ...doc, pluginId: plugin.manifest.id, pluginName: plugin.manifest.name }))), [plugins]);

  const canUseBridge = Boolean(api);
  const selectedLogicNode = currentGraph?.nodes.find(node => node.nodeId === selectedNodeId) || null;
  const selectedWidget = currentUiScreen?.widgets.find(widget => widget.id === selectedWidgetId) || null;

  function pushLog(text: string) {
    setLogs(prev => `${prev}\n${nowLine(text)}`);
    setStatusMessage(text);
  }

  function reportError(action: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    setDiagnostics([{
      level: 'error',
      code: 'UI_ACTION_FAILED',
      message: `${action}失败：${message}`,
      humanAdvice: '请查看底部日志后重试。如果项目路径不正确，请先创建或打开一个有效的 BlockForge 项目。'
    }]);
    setBottomTab('diagnostics');
    pushLog(`${action}失败：${message}`);
  }

  async function runAction<T>(label: string, action: () => Promise<T>): Promise<T | undefined> {
    setBusy(label);
    setStatusMessage(`${label}...`);
    setBottomTab('logs');
    pushLog(`开始执行：${label}。`);
    try {
      return await action();
    } catch (error) {
      reportError(label, error);
      return undefined;
    } finally {
      setBusy('');
    }
  }

  async function refreshProjectData(dir = projectDir) {
    if (!api || !dir) return;
    const loaded = await api.elements.list({ projectDir: dir }) as ElementSet;
    setElements(loaded);
    setResources(await api.resources.readIndex({ projectDir: dir }));
    setSnapshots(await api.snapshots.list({ projectDir: dir }));
    setTemplates(await api.templates.list({ projectDir: dir }));
    setPlugins(await api.plugins.list({ projectDir: dir }));
    const loadedScreens = await api.ui.load({ projectDir: dir });
    setUiScreens(loadedScreens);
    if (loadedScreens.length > 0) setCurrentUiScreen(loadedScreens[0]);
    else setCurrentUiScreen(null);
    const loadedGraphs = (await api.logic.load({ projectDir: dir })).map(normalizeLogicGraph);
    setGraphs(loadedGraphs);
    if (loadedGraphs.length > 0) setCurrentGraph(loadedGraphs[0]);
  }

  async function openProjectResult(result: { projectDir: string; project: ProjectModel } | null) {
    if (!result) return;
    setProjectDir(result.projectDir);
    setProject(result.project);
    setModId(result.project.modId);
    setPackageName(result.project.packageName);
    setDisplayName(result.project.displayName);
    setProjectLoader(result.project.primaryLoader);
    setActiveView(textureEditorMode || modelEditorMode ? 'resources' : 'elements');
    pushLog(`已打开项目：${result.project.displayName}，目录：${result.projectDir}。`);
    setTextureDraftLoaded(false);
    setModelDraftLoaded(false);
    await refreshProjectData(result.projectDir);
    await loadTextureDraft(result.projectDir);
    await loadModelDraft(result.projectDir);
    setRecent(await api!.project.readRecent());
  }

  useEffect(() => {
    if (!api) return;
    void api.project.readRecent().then(setRecent);
    void api.plugins.catalog().then(setPluginCatalog).catch(() => undefined);
    void api.logic.nodeTypes().then(types => {
      setNodeTypes(types);
      setSelectedNodeType(types.find(type => type.startsWith('action.')) || types[0] || '');
    });
    void api.ai.readConfig().then(setAiConfig).catch(() => undefined);
    void api.settings.read().then(settings => setAppSettings(normalizeSettings(settings))).catch(() => undefined);
    return api.build.onLog(line => setLogs(prev => `${prev}\n${line.trimEnd()}`));
  }, []);

  useEffect(() => {
    if ((!textureEditorMode && !modelEditorMode) || !api || autoOpenedTextureProject.current || project) return;
    autoOpenedTextureProject.current = true;
    void openProject(projectDir);
  }, [api, project, projectDir]);

  useEffect(() => {
    setElementJson(draftElement ? pretty(draftElement) : '');
  }, [draftElement]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => reportError('Renderer error', event.error || event.message);
    const onRejection = (event: PromiseRejectionEvent) => reportError('Action', event.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(() => {
    const stopDrawing = () => setTextureDrawing(false);
    window.addEventListener('mouseup', stopDrawing);
    return () => window.removeEventListener('mouseup', stopDrawing);
  }, []);

  useEffect(() => {
    const closeMenu = () => setResourceMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    setTextureName(ownerTextureName(textureOwner));
  }, [textureOwner]);

  useEffect(() => {
    if (!api || !project || !textureDraftLoaded) return;
    const timer = window.setTimeout(() => {
      void saveTextureDraft();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [api, project, projectDir, textureColor, textureDraftLoaded, textureName, textureOwner, texturePixelScale, texturePixels, textureSize, textureTool, textureUsage]);

  useEffect(() => {
    if (!api || !project || !modelDraftLoaded) return;
    const timer = window.setTimeout(() => {
      void persistModelDraft();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [api, project, projectDir, modelDraftLoaded, modelJson, modelName, modelOwner, modelUsage]);

  useEffect(() => {
    if (!api) return;
    return api.appCommands.onCommand(command => commandHandlers.current[command]?.());
  }, []);

  useEffect(() => {
    commandHandlers.current = {
      'project:new': () => setActiveView('home'),
      'project:open': () => void openProject(openDir || undefined),
      'project:export': () => void exportProjectZip(),
      'project:generate': () => void generateProject(),
      'project:build': () => void buildProjectJar(),
      'forge:generate': () => void generateProject(),
      'forge:build': () => void buildProjectJar(),
      'view:ai': () => setActiveView('ai'),
      'view:logic': () => setActiveView('logic'),
      'view:ui': () => setActiveView('ui'),
      'view:plugins': () => setActiveView('plugins'),
      'view:manage': () => setActiveView('manage'),
      'view:settings': () => setActiveView('settings')
    };
  });

  async function createProject() {
    await runAction('创建项目', async () => {
      if (!api) return;
      const result = await api.project.create({ projectDir, displayName, modId, packageName, author, primaryLoader: projectLoader });
      await openProjectResult(result);
    });
  }

  async function createSampleProject() {
    await runAction('创建示例项目', async () => {
      if (!api) return;
      const result = await api.project.createSample({ projectDir, primaryLoader: projectLoader });
      await openProjectResult(result);
      pushLog(`示例项目已创建：当前目标为 ${projectTargetLabel(result?.project || project)}。`);
    });
  }

  async function openProject(pathValue?: string) {
    await runAction('打开项目', async () => {
      if (!api) return;
      const result = await api.project.open(pathValue ? { projectDir: pathValue } : undefined);
      await openProjectResult(result);
    });
  }

  async function createElementDraft(saveImmediately = true) {
    await runAction(saveImmediately ? '创建元素' : '生成元素草稿', async () => {
      if (!api || !project) return;
      const payload = { projectDir, id: elementId, zhName: elementName };
      const creator = {
        item: api.elements.createItem,
        tool: api.elements.createTool,
        block: api.elements.createBlock,
        recipe: api.elements.createRecipe,
        loot_table: api.elements.createLootTable,
        function: api.elements.createFunction,
        mob_effect: api.elements.createMobEffect,
        potion: api.elements.createPotion,
        enchantment: api.elements.createEnchantment
      }[elementKind];
      const element = await creator(payload);
      setDraftElement(element);
      setActiveView('elements');
      if (saveImmediately) {
        const saved = await api.elements.save({ projectDir, element });
        setElements(saved);
        pushLog(`已保存${kindLabels[elementKind]}：${element.id}。`);
      }
    });
  }

  function applyContentKit(kit: ContentKit) {
    setElementKind(kit.elementKind);
    setElementId(kit.elementId);
    setElementName(kit.elementName);
    setActiveView(kit.view);
    pushLog(`已载入玩法蓝图：${kit.title}。请在元素页确认属性后保存。`);
  }

  async function saveDraftElement() {
    await runAction('保存元素', async () => {
      if (!api || !draftElement) return;
      const parsed = JSON.parse(elementJson) as ElementModel;
      const saved = await api.elements.save({ projectDir, element: parsed });
      setElements(saved);
      setDraftElement(parsed);
      pushLog(`已保存元素：${parsed.id}。`);
    });
  }

  async function duplicateDraftElement() {
    await runAction('复制元素', async () => {
      if (!api || !draftElement) return;
      const suggested = duplicateId(draftElement.id);
      const newId = window.prompt('输入副本元素 ID（小写英文、数字、下划线）', suggested);
      if (!newId) {
        pushLog('已取消复制元素。');
        return;
      }
      const zhName = window.prompt('输入副本中文名', `${draftElement.displayName.zh_cn} 副本`) || undefined;
      const result = await api.elements.duplicate({ projectDir, element: draftElement, newId, zhName });
      setElements(result.elements);
      setDraftElement(result.copied);
      setElementJson(pretty(result.copied));
      setElementId(result.copied.id);
      setElementName(result.copied.displayName.zh_cn);
      pushLog(`已复制元素：${draftElement.id} -> ${result.copied.id}。`);
    });
  }

  async function deleteDraftElement() {
    if (!draftElement) return;
    const ok = window.confirm(`确定删除元素 ${draftElement.displayName.zh_cn} (${draftElement.type}:${draftElement.id}) 吗？\n资源文件不会自动删除，可在资源页右键清理。`);
    if (!ok) return;
    await runAction('删除元素', async () => {
      if (!api || !draftElement) return;
      const saved = await api.elements.delete({ projectDir, type: draftElement.type, id: draftElement.id });
      setElements(saved);
      setDraftElement(null);
      setElementJson('');
      pushLog(`已删除元素：${draftElement.id}。`);
    });
  }

  async function runProjectHealthCheck() {
    await runAction('项目健康检查', async () => {
      if (!api || !project) return;
      const nextDiagnostics: Diagnostic[] = [];
      for (const element of allElements) {
        if (!/^[a-z][a-z0-9_]*$/.test(element.id)) {
          nextDiagnostics.push({
            level: 'error',
            code: 'ELEMENT_ID_INVALID',
            target: `${element.type}:${element.id}`,
            message: `元素 ID 不合法：${element.id}`,
            humanAdvice: '元素 ID 建议使用小写英文字母、数字和下划线，并且以字母开头。'
          });
        }
        if ((element.type === 'item' || element.type === 'block') && element.enabled) {
          const props = element.properties as Record<string, unknown>;
          const textureName = String(element.type === 'item' ? props.texture || '' : props.textureAll || '');
          const modelName = String(props.model || '');
          if (!textureName && !modelName) {
            nextDiagnostics.push({
              level: 'warning',
              code: 'ELEMENT_TEXTURE_EMPTY',
              target: `${element.type}:${element.id}`,
              message: `元素“${element.displayName.zh_cn}”还没有绑定贴图或 3D 模型。`,
              humanAdvice: '打开资源页导入或绘制贴图，或者绑定一个 item/block 模型资源。'
            });
          }
          if (modelName) {
            const modelResource = resources.resources.find(resource => resource.type === 'model' && basenameNoExt(resource.path) === modelName);
            if (!modelResource) {
              nextDiagnostics.push({
                level: 'warning',
                code: 'ELEMENT_MODEL_EMPTY',
                target: `${element.type}:${element.id}`,
                message: `元素“${element.displayName.zh_cn}”引用了模型 ${modelName}，但资源索引中没有找到。`,
                humanAdvice: '请在资源页创建或导入同名模型文件，或者把模型资源名改成存在的文件名。'
              });
            }
          }
        }
      }
      nextDiagnostics.push(...await api.resources.checkMissing({ projectDir }));
      for (const graph of graphs) {
        const graphDiagnostics = await api.logic.validate({ graph });
        nextDiagnostics.push(...graphDiagnostics.map(item => ({
          ...item,
          target: item.target ? `${graph.name} / ${item.target}` : graph.name
        })));
      }
      setDiagnostics(nextDiagnostics);
      setBottomTab('diagnostics');
      pushLog(nextDiagnostics.length ? `项目健康检查完成：发现 ${nextDiagnostics.length} 条诊断。` : '项目健康检查通过，未发现问题。');
    });
  }

  async function importTexture() {
    await runAction('导入贴图', async () => {
      if (!api || !project) return;
      const resource = await api.resources.importTexture({ projectDir, sourceFile: texturePath || undefined, usage: textureUsage, ownerElement: textureOwner });
      setResources(await api.resources.readIndex({ projectDir }));
      if (resource) {
        await bindTextureToElement(ownerTextureName(textureOwner));
        pushLog(`已为 ${textureOwner} 导入并自动绑定贴图。`);
      } else {
        pushLog('贴图导入已取消。');
      }
    });
  }

  async function bindTextureToElement(name: string) {
    if (!api || !project) return;
    const [ownerType, ownerId] = textureOwner.split(':');
    if (!ownerId || (ownerType !== 'item' && ownerType !== 'tool' && ownerType !== 'block')) return;
    const pool = ownerType === 'block' ? elements.blocks : ownerType === 'tool' ? elements.tools : elements.items;
    const element = pool.find(item => item.id === ownerId);
    if (!element) return;
    const propName = ownerType === 'block' ? 'textureAll' : 'texture';
    const next = {
      ...element,
      properties: { ...(element.properties as Record<string, unknown>), [propName]: name }
    };
    const saved = await api.elements.save({ projectDir, element: next });
    setElements(saved);
    if (draftElement?.type === next.type && draftElement.id === next.id) {
      setDraftElement(next);
      setElementJson(pretty(next));
    }
  }

  async function bindModelToElement(name: string) {
    if (!api || !project) return;
    const [ownerType, ownerId] = modelOwner.split(':');
    if (!ownerId || (ownerType !== 'item' && ownerType !== 'tool' && ownerType !== 'block')) return;
    const pool = ownerType === 'block' ? elements.blocks : ownerType === 'tool' ? elements.tools : elements.items;
    const element = pool.find(item => item.id === ownerId);
    if (!element) return;
    const next = {
      ...element,
      properties: { ...(element.properties as Record<string, unknown>), model: name }
    };
    const saved = await api.elements.save({ projectDir, element: next });
    setElements(saved);
    if (draftElement?.type === next.type && draftElement.id === next.id) {
      setDraftElement(next);
      setElementJson(pretty(next));
    }
  }

  function paintPixel(index: number) {
    if (textureTool === 'eyedropper') {
      const picked = texturePixels[index];
      if (picked !== 'transparent') setTextureColor(picked);
      setTextureTool('pencil');
      return;
    }
    const nextColor = textureTool === 'eraser' ? 'transparent' : textureColor;
    if (textureTool === 'fill') {
      const target = texturePixels[index];
      if (target === nextColor) return;
      const next = [...texturePixels];
      const queue = [index];
      while (queue.length) {
        const current = queue.pop()!;
        if (next[current] !== target) continue;
        next[current] = nextColor;
        const x = current % textureSize;
        const y = Math.floor(current / textureSize);
        if (x > 0) queue.push(current - 1);
        if (x < textureSize - 1) queue.push(current + 1);
        if (y > 0) queue.push(current - textureSize);
        if (y < textureSize - 1) queue.push(current + textureSize);
      }
      setTexturePixels(next);
      return;
    }
    setTexturePixels(prev => prev.map((pixel, pixelIndex) => pixelIndex === index ? nextColor : pixel));
  }

  function resetTextureCanvas(size = textureSize) {
    setTextureSize(size);
    setTexturePixels(createTexturePixels(size));
  }

  function textureDraft(): TextureEditorDraft {
    return {
      textureName,
      textureUsage,
      textureOwner,
      textureSize,
      textureColor,
      textureTool,
      texturePixels,
      texturePixelScale
    };
  }

  function applyTextureDraft(draft: TextureEditorDraft) {
    if (!draft) return;
    if (draft.textureSize && draft.textureSize !== textureSize) setTextureSize(draft.textureSize);
    if (Array.isArray(draft.texturePixels) && draft.texturePixels.length > 0) setTexturePixels(draft.texturePixels);
    if (draft.textureName) setTextureName(draft.textureName);
    if (draft.textureUsage) setTextureUsage(draft.textureUsage);
    if (draft.textureOwner) setTextureOwner(draft.textureOwner);
    if (draft.textureColor) setTextureColor(draft.textureColor);
    if (draft.textureTool) setTextureTool(draft.textureTool);
    if (typeof draft.texturePixelScale === 'number') setTexturePixelScale(draft.texturePixelScale);
    setTextureDraftLoaded(true);
  }

  async function loadTextureDraft(targetProjectDir = projectDir) {
    if (!api || !targetProjectDir) return;
    try {
      const draft = await api.textureEditor.readDraft({ projectDir: targetProjectDir });
      if (draft) {
        applyTextureDraft(draft);
        pushLog(`已载入贴图草稿：${draft.textureName || '未命名'}。`);
      }
      setTextureDraftLoaded(true);
    } catch {
      setTextureDraftLoaded(true);
    }
  }

  async function saveTextureDraft() {
    if (!api || !project) return;
    await api.textureEditor.saveDraft({ projectDir, draft: textureDraft() });
  }

  function applyAiTextureDraft(draft: AiTextureDraft) {
    const firstColor = draft.palette.find(color => color !== 'transparent')
      || draft.pixels.find(color => color !== 'transparent')
      || textureColor;
    setAiTextureDraft(draft);
    setTextureName(draft.textureName);
    setTextureUsage(draft.textureUsage);
    setTextureOwner(draft.textureOwner);
    setTextureSize(draft.size);
    setTexturePixels(draft.pixels);
    setTextureColor(firstColor);
    setTextureTool('pencil');
    setTextureDraftLoaded(true);
    return firstColor;
  }

  async function createAiTextureDraft() {
    await runAction('AI 绘制材质草稿', async () => {
      if (!api || !project) return;
      if (!appSettings.aiPermissions.textureDraft) {
        reportError('AI 绘制材质草稿', new Error('当前已关闭 AI 材质草稿权限。'));
        return;
      }
      const draft = await api.ai.createTextureDraft({
        config: aiConfig,
        prompt: aiTexturePrompt,
        context: {
          ...aiProjectContext(),
          modId: project.modId,
          textureName,
          textureUsage,
          textureOwner,
          textureSize,
          currentElement: draftElement ? `${draftElement.type}:${draftElement.id}` : textureOwner,
          availableElements: allElements.map(element => `${element.type}:${element.id}`)
        }
      });
      const firstColor = applyAiTextureDraft(draft);
      await api.textureEditor.saveDraft({
        projectDir,
        draft: {
          textureName: draft.textureName,
          textureUsage: draft.textureUsage,
          textureOwner: draft.textureOwner,
          textureSize: draft.size,
          textureColor: firstColor,
          textureTool: 'pencil',
          texturePixels: draft.pixels,
          texturePixelScale
        }
      });
      setAiOutput(pretty(draft));
      setActiveView('resources');
      setBottomTab('ai');
      pushLog(`AI 已绘制材质草稿：${draft.textureName}。确认满意后点击“保存绘制贴图并绑定”。`);
    });
  }

  async function openTextureEditorWindow() {
    await runAction('打开独立贴图窗口', async () => {
      if (!api || !project) return;
      await saveTextureDraft();
      await api.textureEditor.openWindow({ projectDir });
      pushLog('已打开独立贴图编辑窗口。');
    });
  }

  function texturePixelsToDataUrl() {
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建贴图画布。');
    ctx.clearRect(0, 0, textureSize, textureSize);
    for (const [index, color] of texturePixels.entries()) {
      if (color === 'transparent') continue;
      ctx.fillStyle = color;
      ctx.fillRect(index % textureSize, Math.floor(index / textureSize), 1, 1);
    }
    return canvas.toDataURL('image/png');
  }

  async function saveDrawnTexture() {
    await runAction('保存绘制贴图', async () => {
      if (!api || !project) return;
      if (!isTextureNameValid(textureName)) {
        throw new Error('贴图名只能使用小写英文字母、数字和下划线。');
      }
      await api.resources.saveTexture({
        projectDir,
        pngDataUrl: texturePixelsToDataUrl(),
        usage: textureUsage,
        ownerElement: textureOwner,
        textureName
      });
      await bindTextureToElement(textureName);
      setResources(await api.resources.readIndex({ projectDir }));
      await saveTextureDraft();
      pushLog(`已保存 ${textureSize}x${textureSize} PNG 贴图 ${textureName}.png，并自动绑定到 ${textureOwner}。`);
    });
  }

  function modelDraft(): ModelEditorDraft {
    return {
      modelName,
      modelUsage,
      modelOwner,
      modelJson
    };
  }

  function applyModelDraft(draft: ModelEditorDraft) {
    if (!draft) return;
    if (draft.modelName) setModelName(draft.modelName);
    if (draft.modelUsage) setModelUsage(draft.modelUsage);
    if (draft.modelOwner) setModelOwner(draft.modelOwner);
    if (typeof draft.modelJson === 'string') setModelJson(draft.modelJson);
    setModelDraftLoaded(true);
  }

  async function loadModelDraft(targetProjectDir = projectDir) {
    if (!api || !targetProjectDir) return;
    try {
      const draft = await api.modelEditor.readDraft({ projectDir: targetProjectDir });
      if (draft) {
        applyModelDraft(draft);
        pushLog(`已载入模型草稿：${draft.modelName || '未命名'}。`);
      }
      setModelDraftLoaded(true);
    } catch {
      setModelDraftLoaded(true);
    }
  }

  async function persistModelDraft() {
    if (!api || !project) return;
    await api.modelEditor.saveDraft({ projectDir, draft: modelDraft() });
  }

  function applyAiModelDraft(draft: AiModelDraft) {
    setAiModelDraft(draft);
    setModelName(draft.modelName);
    setModelUsage(draft.modelUsage);
    setModelOwner(draft.modelOwner);
    setModelJson(draft.modelJson);
    setModelDraftLoaded(true);
  }

  async function createAiModelDraft() {
    await runAction('AI 生成模型草稿', async () => {
      if (!api || !project) return;
      if (!appSettings.aiPermissions.modelDraft) {
        reportError('AI 生成模型草稿', new Error('当前已关闭 AI 模型草稿权限。'));
        return;
      }
      const draft = await api.ai.createModelDraft({
        config: aiConfig,
        prompt: aiModelPrompt,
        context: {
          ...aiProjectContext(),
          modId: project.modId,
          textureName,
          textureUsage,
          modelName,
          modelUsage,
          modelOwner,
          availableResources: resources.resources.map(resource => ({
            type: resource.type,
            path: resource.path,
            usage: resource.usage,
            ownerElement: resource.ownerElement
          }))
        }
      });
      applyAiModelDraft(draft);
      await api.modelEditor.saveDraft({
        projectDir,
        draft: {
          modelName: draft.modelName,
          modelUsage: draft.modelUsage,
          modelOwner: draft.modelOwner,
          modelJson: draft.modelJson
        }
      });
      setAiOutput(pretty(draft));
      setActiveView('resources');
      setBottomTab('ai');
      pushLog(`AI 已生成模型草稿：${draft.modelName}。可直接在 Blockbench/模型编辑器里继续修整。`);
    });
  }

  function defaultModelJson() {
    const ownerId = ownerTextureName(modelOwner);
    if (modelUsage === 'block_model') {
      return JSON.stringify({
        parent: 'minecraft:block/cube_all',
        textures: {
          all: `${project?.modId || 'minecraft'}:block/${ownerId}`
        }
      }, null, 2);
    }
    return JSON.stringify({
      parent: 'minecraft:item/generated',
      textures: {
        layer0: `${project?.modId || 'minecraft'}:item/${ownerId}`
      }
    }, null, 2);
  }

  function applyModelBindingFields(resource: ResourceItem) {
    const usage = resource.usage === 'block_model' ? 'block_model' : 'item_model';
    setModelUsage(usage);
    if (resource.ownerElement) setModelOwner(resource.ownerElement);
    setModelName(basenameNoExt(resource.path));
    setModelJson('');
    setModelDraftLoaded(true);
  }

  async function loadModelResource(resource: ResourceItem) {
    if (!api || !project || resource.type !== 'model') return;
    const content = await api.resources.readContent({ projectDir, resourceId: resource.resourceId });
    const usage = resource.usage === 'block_model' ? 'block_model' : 'item_model';
    setModelUsage(usage);
    setModelOwner(resource.ownerElement || (usage === 'block_model' ? 'block:stone' : 'item:stick'));
    setModelName(basenameNoExt(resource.path));
    setModelJson(content);
    setModelDraftLoaded(true);
  }

  async function importModel() {
    await runAction('导入模型', async () => {
      if (!api || !project) return;
      if (!isModelNameValid(modelName)) {
        throw new Error('模型名只能使用小写英文字母、数字和下划线。');
      }
      const resource = await api.resources.importModel({
        projectDir,
        sourceFile: modelPath || undefined,
        usage: modelUsage,
        ownerElement: modelOwner,
        modelName
      });
      setResources(await api.resources.readIndex({ projectDir }));
      if (resource) {
        await bindModelToElement(modelName);
        await persistModelDraft();
        pushLog(`已导入 3D 模型 ${modelName}.json 并绑定到 ${modelOwner}。`);
      } else {
        pushLog('模型导入已取消。');
      }
    });
  }

  async function saveModelDraft() {
    await runAction('保存模型', async () => {
      if (!api || !project) return;
      if (!isModelNameValid(modelName)) {
        throw new Error('模型名只能使用小写英文字母、数字和下划线。');
      }
      const payloadJson = modelJson.trim() || defaultModelJson();
      await api.resources.saveModel({
        projectDir,
        jsonText: payloadJson,
        usage: modelUsage,
        ownerElement: modelOwner,
        modelName
      });
      await bindModelToElement(modelName);
      setResources(await api.resources.readIndex({ projectDir }));
      setModelJson(payloadJson);
      setModelDraftLoaded(true);
      await api.modelEditor.saveDraft({ projectDir, draft: { ...modelDraft(), modelJson: payloadJson } });
      pushLog(`已保存 3D 模型 ${modelName}.json，并自动绑定到 ${modelOwner}。`);
    });
  }

  async function saveModelEditorDraft() {
    await runAction('保存模型草稿', async () => {
      if (!api || !project) return;
      await persistModelDraft();
      pushLog(`模型草稿已保存：${modelName || '未命名'}。`);
    });
  }

  async function resetModelDraft() {
    const nextJson = defaultModelJson();
    setModelJson(nextJson);
    setModelDraftLoaded(true);
    if (api && project) await api.modelEditor.saveDraft({ projectDir, draft: { ...modelDraft(), modelJson: nextJson } });
  }

  async function openModelEditorWindow() {
    await runAction('打开独立模型窗口', async () => {
      if (!api || !project) return;
      await persistModelDraft();
      await api.modelEditor.openWindow({ projectDir });
      pushLog('已打开独立 3D 模型编辑窗口。');
    });
  }

  async function duplicateResource(resource: ResourceItem) {
    await runAction('复制资源', async () => {
      if (!api || !project) return;
      const suggested = `${basenameNoExt(resource.path)}_copy`;
      const newName = window.prompt(resource.type === 'model' ? '输入复制后的模型名（小写字母、数字、下划线）' : '输入复制后的贴图名（小写字母、数字、下划线）', suggested);
      if (!newName) return;
      const copied = await api.resources.duplicate({ projectDir, resourceId: resource.resourceId, newName });
      setResources(await api.resources.readIndex({ projectDir }));
      pushLog(`已复制资源：${copied.path}`);
    });
  }

  async function deleteResourceFromMenu(resource: ResourceItem) {
    const ok = window.confirm(`确定删除资源文件吗？\n${resource.path}`);
    if (!ok) return;
    await runAction('删除资源', async () => {
      if (!api || !project) return;
      setResources(await api.resources.delete({ projectDir, resourceId: resource.resourceId }));
      pushLog(`已删除资源：${resource.path}`);
    });
  }

  async function copyResourcePath(resource: ResourceItem) {
    try {
      await navigator.clipboard?.writeText(`${projectDir}\\${resource.path.replace(/\//g, '\\')}`);
      pushLog(`已复制资源路径：${resource.path}`);
    } catch (error) {
      reportError('复制资源路径', error);
    }
  }

  async function bindResourceToCurrentElement(resource: ResourceItem) {
    await runAction('绑定资源', async () => {
      if (!api || !project) return;
      const name = basenameNoExt(resource.path);
      if (resource.type === 'model') {
        const usage = resource.usage === 'block_model' ? 'block_model' : 'item_model';
        setModelUsage(usage);
        setModelName(name);
        if (resource.ownerElement) setModelOwner(resource.ownerElement);
        await bindModelToElement(name);
      } else {
        const usage = resource.usage === 'block_texture' ? 'block_texture' : 'item_texture';
        setTextureUsage(usage);
        setTextureName(name);
        if (resource.ownerElement) setTextureOwner(resource.ownerElement);
        await bindTextureToElement(name);
      }
      setResources(await api.resources.readIndex({ projectDir }));
      pushLog(`已把 ${name}.${resource.type === 'model' ? 'json' : 'png'} 绑定到 ${resource.ownerElement || '当前元素'}。`);
    });
  }

  async function checkMissingResources() {
    await runAction('检查资源', async () => {
      if (!api || !project) return;
      const result = await api.resources.checkMissing({ projectDir });
      setDiagnostics(result);
      setBottomTab('diagnostics');
      pushLog(result.length ? `资源检查发现 ${result.length} 条诊断。` : '资源检查通过。');
    });
  }

  async function generateProject(autoBuildOverride = appSettings.autoBuildAfterGenerate) {
    const generated = await runAction('生成工程', async () => {
      if (!api) return;
      const result = await api.generate.project({ projectDir });
      setDiagnostics(result.resourceDiagnostics || []);
      setResources(await api.resources.readIndex({ projectDir }));
      setCodePreview(result.preview || '');
      pushLog(`${projectTargetLabel(project)}已生成：${result.root}。已复制 ${result.copiedResources} 个资源，部署命令已写入 BLOCKFORGE_DEPLOY_COMMANDS.md。`);
      setActiveView('forge');
      return result;
    });
    if (generated && autoBuildOverride) {
      pushLog(`已启用自动构建，开始构建 ${projectTargetShort(project)} jar。`);
      await buildProjectJar();
    }
  }

  async function buildProjectJar() {
    await runAction('构建 jar', async () => {
      if (!api) return;
      setActiveView('forge');
      const result = await api.build.projectJar({ projectDir });
      pushLog(`构建结果：\n${formatBuildResult(result)}`);
    });
  }

  async function generateForge(autoBuildOverride = appSettings.autoBuildAfterGenerate) {
    return generateProject(autoBuildOverride);
  }

  async function buildJar() {
    return buildProjectJar();
  }

  async function saveCurrentWork() {
    await runAction('保存当前工作', async () => {
      if (!api || !project) return;
      if (draftElement) {
        const parsed = JSON.parse(elementJson) as ElementModel;
        setElements(await api.elements.save({ projectDir, element: parsed }));
        setDraftElement(parsed);
      }
      if (currentGraph) {
        setGraphs(await api.logic.save({ projectDir, graph: currentGraph }));
      }
      if (currentUiScreen) {
        const saved = await api.ui.save({ projectDir, screen: currentUiScreen });
        setCurrentUiScreen(saved);
        setUiScreens(await api.ui.load({ projectDir }));
      }
      pushLog('当前元素、节点图和界面模型已保存。');
    });
  }

  async function saveAppSettings(nextSettings = appSettings, label = '保存设置') {
    await runAction(label, async () => {
      if (!api) return;
      const saved = await api.settings.save({ settings: nextSettings });
      setAppSettings(normalizeSettings(saved));
      pushLog(`${label}已完成。`);
    });
  }

  async function updateAppSettings(patch: Partial<AppSettings>) {
    const next = { ...appSettings, ...patch };
    setAppSettings(next);
    await saveAppSettings(next);
  }

  async function saveCurrentProject(nextProject: ProjectModel) {
    if (!api || !project) return;
    const saved = await api.project.save({ projectDir, project: nextProject });
    setProject(saved);
    setDisplayName(saved.displayName);
    setModId(saved.modId);
    setPackageName(saved.packageName);
    setAuthor(saved.author);
    setProjectLoader(saved.primaryLoader);
    pushLog(`已保存项目：${saved.displayName}。`);
  }

  async function addCompatibilityEntry() {
    if (!project || !compatModId.trim()) return;
    const entry: ModCompatibilityEntry = {
      modId: compatModId.trim(),
      displayName: compatDisplayName.trim() || compatModId.trim(),
      versionRange: compatVersionRange.trim() || '[0,)',
      dependencyType: compatDependencyType,
      side: compatSide,
      gradleCoordinate: compatGradleCoordinate.trim(),
      note: compatNote.trim()
    };
    const externalMods = [...(project.compatibility?.externalMods || []).filter(item => item.modId !== entry.modId), entry];
    const nextCompatibility = {
      externalMods,
      acceptedNamespaces: project.compatibility?.acceptedNamespaces || [],
      allowExternalTags: project.compatibility?.allowExternalTags !== false
    };
    await saveCurrentProject({ ...project, compatibility: nextCompatibility });
    setCompatModId('');
    setCompatDisplayName('');
    setCompatVersionRange('[0,)');
    setCompatDependencyType('required');
    setCompatSide('both');
    setCompatGradleCoordinate('');
    setCompatNote('');
  }

  async function addCompatibilityPreset(preset: CompatibilityPreset) {
    if (!project) return;
    const externalMods = [...(project.compatibility?.externalMods || []).filter(item => item.modId !== preset.modId), preset];
    const acceptedNamespaces = Array.from(new Set([...(project.compatibility?.acceptedNamespaces || []), preset.modId]));
    await saveCurrentProject({
      ...project,
      compatibility: {
        externalMods,
        acceptedNamespaces,
        allowExternalTags: project.compatibility?.allowExternalTags !== false
      }
    });
  }

  async function removeCompatibilityEntry(modIdValue: string) {
    if (!project) return;
    const externalMods = (project.compatibility?.externalMods || []).filter(item => item.modId !== modIdValue);
    const nextCompatibility = {
      externalMods,
      acceptedNamespaces: project.compatibility?.acceptedNamespaces || [],
      allowExternalTags: project.compatibility?.allowExternalTags !== false
    };
    await saveCurrentProject({ ...project, compatibility: nextCompatibility });
  }

  async function markCurrentProjectCompleted() {
    await runAction('加入完成项目列表', async () => {
      if (!project) return;
      const existing = appSettings.completedProjects.find(item => item.projectDir === projectDir);
      const entry: CompletedProject = {
        id: existing?.id || `completed_${Date.now()}`,
        name: existing?.name || project.displayName,
        modId: project.modId,
        projectDir,
        status: existing?.status || 'completed',
        notes: existing?.notes || '首版已生成，可继续打磨内容。',
        updatedAt: new Date().toISOString()
      };
      const nextProjects = existing
        ? appSettings.completedProjects.map(item => item.id === existing.id ? entry : item)
        : [entry, ...appSettings.completedProjects];
      const next = { ...appSettings, completedProjects: nextProjects };
      setAppSettings(next);
      await saveAppSettings(next, '保存完成项目列表');
    });
  }

  function updateCompletedProject(id: string, patch: Partial<CompletedProject>) {
    setAppSettings({
      ...appSettings,
      completedProjects: appSettings.completedProjects.map(item => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item)
    });
  }

  async function removeCompletedProject(id: string) {
    const next = { ...appSettings, completedProjects: appSettings.completedProjects.filter(item => item.id !== id) };
    setAppSettings(next);
    await saveAppSettings(next, '保存完成项目列表');
  }

  async function exportProjectZip() {
    await runAction('导出项目压缩包', async () => {
      if (!api) return;
      const output = await api.project.exportZip({ projectDir });
      pushLog(`项目压缩包已导出：${output}`);
    });
  }

  async function openPath(targetPath: string) {
    await runAction('打开文件夹', async () => {
      if (!api) return;
      await api.system.openPath({ targetPath });
      pushLog(`已打开文件夹：${targetPath}`);
    });
  }

  async function copyDeploymentCommands() {
    await runAction('复制部署命令', async () => {
      const text = deploymentCommandsText(projectDir, project);
      if (!navigator.clipboard?.writeText) throw new Error('当前环境不支持剪贴板操作。');
      await navigator.clipboard.writeText(text);
      pushLog('部署命令已复制到剪贴板。');
    });
  }

  async function runPrivacyScan() {
    await runAction('发布前隐私检查', async () => {
      if (!api) return;
      const result = await api.privacy.scan();
      setPrivacyResult(result);
      if (result.ok) {
        setDiagnostics([]);
        pushLog(`隐私检查通过：扫描 ${result.scannedFiles} 个文件，没有发现明显密钥、邮箱或本机路径。`);
        return;
      }
      const nextDiagnostics: Diagnostic[] = result.findings.map(finding => ({
        level: 'error',
        code: 'PRIVACY_SCAN_FINDING',
        target: `${finding.file}:${finding.line}`,
        message: `发现 ${finding.type}`,
        humanAdvice: '提交到 GitHub 前请移除或改成本机配置、示例占位符。'
      }));
      setDiagnostics(nextDiagnostics);
      setBottomTab('diagnostics');
      pushLog(`隐私检查未通过：发现 ${result.findings.length} 处疑似隐私内容，请先处理。`);
    });
  }

  async function refreshManagement() {
    if (!api || !project) return;
    setSnapshots(await api.snapshots.list({ projectDir }));
    setTemplates(await api.templates.list({ projectDir }));
    setPlugins(await api.plugins.list({ projectDir }));
  }

  async function createManualSnapshot() {
    await runAction('创建快照', async () => {
      if (!api || !project) return;
      const target = await api.snapshots.create({ projectDir, reason: 'manual' });
      pushLog(`已创建快照：${target}`);
      await refreshManagement();
    });
  }

  async function restoreSnapshot(snapshotId: string) {
    if (!api || !project) return;
    const ok = window.confirm(`确定要恢复快照 ${snapshotId} 吗？恢复前会先创建一个安全快照。`);
    if (!ok) return;
    await runAction('恢复快照', async () => {
      setSnapshots(await api.snapshots.restore({ projectDir, snapshotId }));
      await refreshProjectData(projectDir);
      pushLog(`已恢复快照：${snapshotId}。`);
    });
  }

  async function importTemplatePackage() {
    await runAction('导入模板包', async () => {
      if (!api || !project) return;
      const installed = await api.templates.import({ projectDir, sourceFile: templatePath || undefined });
      if (installed) pushLog(`模板包已导入：${installed.manifest.name} ${installed.manifest.version}。`);
      else pushLog('模板包导入已取消。');
      await refreshManagement();
    });
  }

  async function refreshPlugins() {
    if (!api || !project) return;
    setPluginCatalog(await api.plugins.catalog());
    setPlugins(await api.plugins.list({ projectDir }));
  }

  async function importPluginPackage() {
    await runAction('导入插件包', async () => {
      if (!api || !project) return;
      const installed = await api.plugins.import({ projectDir, sourceFile: pluginPath || undefined });
      if (installed) pushLog(`插件已安装：${installed.manifest.name} ${installed.manifest.version}。`);
      else pushLog('插件导入已取消。');
      await refreshPlugins();
    });
  }

  async function installBuiltinPlugin(pluginId: string) {
    await runAction('安装内置插件', async () => {
      if (!api || !project) return;
      const installed = await api.plugins.installBuiltin({ projectDir, pluginId });
      pushLog(`内置插件已安装：${installed.manifest.name}。`);
      await refreshPlugins();
    });
  }

  async function togglePlugin(plugin: PluginRuntime) {
    await runAction(plugin.enabled ? '停用插件' : '启用插件', async () => {
      if (!api || !project) return;
      setPlugins(await api.plugins.toggle({ projectDir, pluginId: plugin.manifest.id, enabled: !plugin.enabled }));
      pushLog(`${plugin.enabled ? '已停用' : '已启用'}插件：${plugin.manifest.name}。`);
    });
  }

  async function removePlugin(plugin: PluginRuntime) {
    const ok = window.confirm(`确定移除插件 ${plugin.manifest.name} 吗？插件包会从当前项目的 editor/plugins 中移除。`);
    if (!ok) return;
    await runAction('移除插件', async () => {
      if (!api || !project) return;
      setPlugins(await api.plugins.remove({ projectDir, pluginId: plugin.manifest.id }));
      pushLog(`插件已移除：${plugin.manifest.name}。`);
    });
  }

  async function createPluginStarter() {
    await runAction('生成插件模板', async () => {
      if (!api || !project) return;
      const target = await api.plugins.createStarter({ projectDir, name: pluginStarterName || 'my_plugin' });
      pushLog(`插件模板已生成：${target}`);
      await openPath(target);
      await refreshPlugins();
    });
  }

  async function exportPluginPackage(plugin: PluginRuntime) {
    await runAction('导出插件包', async () => {
      if (!api || !project) return;
      const target = await api.plugins.export({ projectDir, pluginId: plugin.manifest.id });
      if (target) {
        pushLog(`插件包已导出：${target}`);
        await openPath(target.replace(/[\\/][^\\/]+$/, ''));
      } else {
        pushLog('插件包导出已取消。');
      }
    });
  }

  function setAiPromptByPlugin(target: PluginPromptRuntime['target'] | PluginActionRuntime['promptTarget'], prompt: string) {
    if (target === 'logic') setAiPrompt(prompt);
    else if (target === 'texture') setAiTexturePrompt(prompt);
    else if (target === 'model') setAiModelPrompt(prompt);
    else if (target === 'feature') setAiFeaturePrompt(prompt);
    else if (target === 'project') setAiProjectPrompt(prompt);
    else setAiChatInput(prompt);
    setActiveView('ai');
    setBottomTab('ai');
    pushLog('插件已写入 AI 提示，可以继续让模型生成草案。');
  }

  async function applyPluginBlueprint(blueprint: PluginBlueprintRuntime | PluginElementBlueprint) {
    await runAction(`运行插件蓝图：${blueprint.label}`, async () => {
      if (!api || !project) return;
      const payload = { projectDir, id: blueprint.elementId, zhName: blueprint.zhName };
      const creator = {
        item: api.elements.createItem,
        tool: api.elements.createTool,
        block: api.elements.createBlock,
        recipe: api.elements.createRecipe,
        loot_table: api.elements.createLootTable,
        function: api.elements.createFunction,
        mob_effect: api.elements.createMobEffect,
        potion: api.elements.createPotion,
        enchantment: api.elements.createEnchantment
      }[blueprint.kind];
      const element = await creator(payload);
      const patched = {
        ...element,
        description: blueprint.description || element.description,
        properties: {
          ...(element.properties as Record<string, unknown>),
          ...(blueprint.properties || {})
        }
      } as ElementModel;
      const saved = await api.elements.save({ projectDir, element: patched });
      setElements(saved);
      setDraftElement(patched);
      setElementKind(blueprint.kind as ElementKind);
      setElementId(blueprint.elementId);
      setElementName(blueprint.zhName);
      setElementJson(pretty(patched));
      setActiveView('elements');
      pushLog(`插件蓝图已创建元素：${blueprint.kind}:${blueprint.elementId}。`);
    });
  }

  async function runPluginAction(action: PluginActionRuntime) {
    if (action.kind === 'open_view') {
      setActiveView((action.targetView || 'design') as ViewId);
      pushLog(`插件动作：打开 ${viewLabels[(action.targetView || 'design') as ViewId] || action.targetView}。`);
      return;
    }
    if (action.kind === 'set_ai_prompt') {
      setAiPromptByPlugin(action.promptTarget || 'chat', action.prompt || action.description);
      return;
    }
    if (action.kind === 'create_element_blueprint' && action.blueprint) {
      await applyPluginBlueprint(action.blueprint);
      return;
    }
    if (action.kind === 'open_external_doc' && action.url) {
      await runAction('打开插件文档', async () => {
        if (!api) return;
        await api.system.openExternal({ url: action.url! });
        pushLog(`已打开插件文档：${action.url}`);
      });
      return;
    }
    pushLog(`插件动作 ${action.label} 暂时没有可执行的声明式处理器。`);
  }

  async function runPluginCard(card: PluginCardRuntime) {
    const action = pluginActions.find(item => item.pluginId === card.pluginId && item.id === card.actionId);
    if (action) await runPluginAction(action);
    else {
      setActiveView('plugins');
      pushLog(`插件卡片：${card.title}。请在插件工坊中查看贡献内容。`);
    }
  }

  async function createExampleLogic() {
    await runAction('创建示例节点图', async () => {
      if (!api) return;
      const graph = normalizeLogicGraph(await api.logic.createDefault({ boundElement: textureOwner || 'item:ice_wand' }));
      setCurrentGraph(graph);
      setGraphs(prev => [graph, ...prev.filter(item => item.graphId !== graph.graphId)]);
      pushLog('已创建右键示例节点图。');
    });
  }

  async function createLogicTemplate(template: 'spell' | 'break_drop' | 'welcome' | 'utility') {
    await runAction('创建事件模板', async () => {
      if (!api) return;
      const makeNode = async (nodeType: string) => api.logic.createNode({ nodeType });
      const link = (source: LogicNode, sourceHandle: string, target: LogicNode, targetHandle: string): LogicEdge => ({
        id: `edge_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        source: source.nodeId,
        sourceHandle,
        target: target.nodeId,
        targetHandle,
        type: 'exec'
      });

      let graph: LogicGraph;
      if (template === 'spell') {
        const event = await makeNode('event.item_right_click');
        const xp = await makeNode('condition.player_xp_level_at_least');
        const cooldown = await makeNode('condition.cooldown_ready');
        const consume = await makeNode('action.consume_xp_level');
        const effect = await makeNode('action.give_effect');
        const sound = await makeNode('action.play_sound');
        const startCooldown = await makeNode('action.start_cooldown');
        const denied = await makeNode('action.send_message');

        event.position = { x: 40, y: 120 };
        xp.position = { x: 250, y: 80 };
        cooldown.position = { x: 500, y: 80 };
        consume.position = { x: 740, y: 40 };
        effect.position = { x: 950, y: 40 };
        sound.position = { x: 1160, y: 40 };
        startCooldown.position = { x: 1370, y: 40 };
        denied.position = { x: 740, y: 220 };

        xp.params.level = 10;
        cooldown.params.cooldownId = 'ice_wand';
        consume.params.amount = 10;
        effect.params.effect = 'minecraft:slowness';
        effect.params.seconds = 3;
        effect.params.amplifier = 1;
        sound.params.sound = 'minecraft:block.amethyst_block.chime';
        startCooldown.params.cooldownId = 'ice_wand';
        startCooldown.params.ticks = 100;
        denied.params.text = '经验不足或技能仍在冷却。';

        graph = {
          schemaVersion: '0.1.0',
          graphId: `logic_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
          name: '右键施法模板',
          eventType: 'item_right_click',
          boundElement: textureOwner || 'item:ice_wand',
          enabled: true,
          targetLoaders: ['forge'],
          nodes: [event, xp, cooldown, consume, effect, sound, startCooldown, denied],
          edges: [
            link(event, 'exec_out', xp, 'exec_in'),
            link(xp, 'true_out', cooldown, 'exec_in'),
            link(cooldown, 'true_out', consume, 'exec_in'),
            link(consume, 'exec_out', effect, 'exec_in'),
            link(effect, 'exec_out', sound, 'exec_in'),
            link(sound, 'exec_out', startCooldown, 'exec_in'),
            link(xp, 'false_out', denied, 'exec_in'),
            link(cooldown, 'false_out', denied, 'exec_in')
          ],
          variables: [],
          resources: [],
          diagnostics: [],
          generatedCodeCache: {},
          editorView: { zoom: 1, position: { x: 0, y: 0 }, groups: [] }
        };
      } else if (template === 'break_drop') {
        const event = await makeNode('event.block_break');
        const hasTool = await makeNode('condition.player_has_item');
        const give = await makeNode('action.give_item');
        const sound = await makeNode('action.play_sound');
        const denied = await makeNode('action.send_message');

        event.position = { x: 40, y: 120 };
        hasTool.position = { x: 260, y: 80 };
        give.position = { x: 520, y: 40 };
        sound.position = { x: 760, y: 40 };
        denied.position = { x: 520, y: 220 };

        hasTool.params.item = 'minecraft:iron_pickaxe';
        hasTool.params.count = 1;
        give.params.item = 'minecraft:diamond';
        give.params.count = 1;
        sound.params.sound = 'minecraft:block.stone.break';
        denied.params.text = '你需要正确工具才能触发额外掉落。';

        graph = {
          schemaVersion: '0.1.0',
          graphId: `logic_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
          name: '破坏方块掉落模板',
          eventType: 'block_break',
          boundElement: textureOwner || 'block:machine_block',
          enabled: true,
          targetLoaders: ['forge'],
          nodes: [event, hasTool, give, sound, denied],
          edges: [
            link(event, 'exec_out', hasTool, 'exec_in'),
            link(hasTool, 'true_out', give, 'exec_in'),
            link(give, 'exec_out', sound, 'exec_in'),
            link(hasTool, 'false_out', denied, 'exec_in')
          ],
          variables: [],
          resources: [],
          diagnostics: [],
          generatedCodeCache: {},
          editorView: { zoom: 1, position: { x: 0, y: 0 }, groups: [] }
        };
      } else if (template === 'utility') {
        const event = await makeNode('event.item_use');
        const hasItem = await makeNode('condition.player_has_item');
        const effect = await makeNode('action.give_effect');
        const sound = await makeNode('action.play_sound');
        const message = await makeNode('action.send_message');

        event.position = { x: 40, y: 120 };
        hasItem.position = { x: 250, y: 80 };
        effect.position = { x: 500, y: 40 };
        sound.position = { x: 740, y: 40 };
        message.position = { x: 980, y: 40 };

        hasItem.params.item = textureOwner || 'minecraft:stick';
        hasItem.params.count = 1;
        effect.params.effect = 'minecraft:speed';
        effect.params.seconds = 3;
        effect.params.amplifier = 0;
        sound.params.sound = 'minecraft:block.note_block.bell';
        message.params.text = '道具已激活。';

        graph = {
          schemaVersion: '0.1.0',
          graphId: `logic_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
          name: '道具使用模板',
          eventType: 'item_use',
          boundElement: textureOwner || 'item:ice_wand',
          enabled: true,
          targetLoaders: ['forge'],
          nodes: [event, hasItem, effect, sound, message],
          edges: [
            link(event, 'exec_out', hasItem, 'exec_in'),
            link(hasItem, 'true_out', effect, 'exec_in'),
            link(effect, 'exec_out', sound, 'exec_in'),
            link(sound, 'exec_out', message, 'exec_in'),
            link(hasItem, 'false_out', message, 'exec_in')
          ],
          variables: [],
          resources: [],
          diagnostics: [],
          generatedCodeCache: {},
          editorView: { zoom: 1, position: { x: 0, y: 0 }, groups: [] }
        };
      } else {
        const event = await makeNode('event.player_join');
        const message = await makeNode('action.send_message');
        const item = await makeNode('action.give_item');
        const sound = await makeNode('action.play_sound');

        event.position = { x: 40, y: 120 };
        message.position = { x: 260, y: 80 };
        item.position = { x: 520, y: 40 };
        sound.position = { x: 760, y: 40 };

        message.params.text = '欢迎来到 BlockForge 世界！';
        item.params.item = 'minecraft:compass';
        item.params.count = 1;
        sound.params.sound = 'minecraft:block.note_block.pling';

        graph = {
          schemaVersion: '0.1.0',
          graphId: `logic_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
          name: '进入世界欢迎模板',
          eventType: 'player_join',
          boundElement: 'player',
          enabled: true,
          targetLoaders: ['forge'],
          nodes: [event, message, item, sound],
          edges: [
            link(event, 'exec_out', message, 'exec_in'),
            link(message, 'exec_out', item, 'exec_in'),
            link(item, 'exec_out', sound, 'exec_in')
          ],
          variables: [],
          resources: [],
          diagnostics: [],
          generatedCodeCache: {},
          editorView: { zoom: 1, position: { x: 0, y: 0 }, groups: [] }
        };
      }

      const normalized = normalizeLogicGraph(graph);
      setCurrentGraph(normalized);
      setGraphs(prev => [normalized, ...prev.filter(item => item.graphId !== normalized.graphId)]);
      pushLog(`已创建事件模板：${graph.name}。`);
    });
  }

  async function createEventGraph(nodeType: string, name: string, boundElement: string) {
    await runAction('创建事件图', async () => {
      if (!api) return;
      const event = await api.logic.createNode({ nodeType });
      const graph: LogicGraph = {
        schemaVersion: '0.1.0',
        graphId: `logic_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        name,
        eventType: nodeType.replace('event.', ''),
        boundElement,
        enabled: true,
        targetLoaders: ['forge'],
        nodes: [event],
        edges: [],
        variables: [],
        resources: [],
        diagnostics: [],
        generatedCodeCache: {},
        editorView: { zoom: 1, position: { x: 0, y: 0 }, groups: [] }
      };
      setCurrentGraph(graph);
      setGraphs(prev => [graph, ...prev.filter(item => item.graphId !== graph.graphId)]);
      pushLog(`已创建事件图：${name}。`);
    });
  }

  async function saveGraph() {
    await runAction('保存节点图', async () => {
      if (!api || !currentGraph) return;
      const saved = await api.logic.save({ projectDir, graph: currentGraph });
      setGraphs(saved);
      pushLog(`已保存节点图：${currentGraph.name}。`);
    });
  }

  async function addNode() {
    await runAction('添加节点', async () => {
      if (!api || !currentGraph || !selectedNodeType) return;
      const node = await api.logic.createNode({ nodeType: selectedNodeType });
      node.position = { x: 120 + currentGraph.nodes.length * 34, y: 120 + currentGraph.nodes.length * 18 };
      setCurrentGraph({
        ...currentGraph,
        eventType: node.nodeType.startsWith('event.') ? node.nodeType.replace('event.', '') : currentGraph.eventType,
        nodes: [...currentGraph.nodes, node]
      });
      setSelectedNodeId(node.nodeId);
      pushLog(`已添加节点：${node.title}。`);
    });
  }

  async function addNodeByType(nodeType: string) {
    const previous = selectedNodeType;
    setSelectedNodeType(nodeType);
    await runAction('添加节点', async () => {
      if (!api || !currentGraph) return;
      const node = await api.logic.createNode({ nodeType });
      node.position = { x: 120 + currentGraph.nodes.length * 34, y: 120 + currentGraph.nodes.length * 18 };
      const firstVariable = currentGraph.variables[0]?.id;
      if (node.params.variable === '' && firstVariable) node.params.variable = firstVariable;
      setCurrentGraph({
        ...currentGraph,
        eventType: node.nodeType.startsWith('event.') ? node.nodeType.replace('event.', '') : currentGraph.eventType,
        nodes: [...currentGraph.nodes, node]
      });
      setSelectedNodeId(node.nodeId);
      pushLog(`已添加节点：${node.title}。`);
    });
    setSelectedNodeType(previous);
  }

  function addEdge() {
    if (!currentGraph || !edgeSource || !edgeTarget) {
      reportError('连接节点', new Error('请先选择源节点和目标节点。'));
      return;
    }
    const edge: LogicEdge = {
      id: `edge_${Date.now()}`,
      source: edgeSource,
      sourceHandle: edgeSourceHandle,
      target: edgeTarget,
      targetHandle: 'exec_in',
      type: 'exec'
    };
    setCurrentGraph({ ...currentGraph, edges: [...currentGraph.edges, edge] });
    pushLog(`已连接：${edge.sourceHandle} -> ${edge.targetHandle}。`);
  }

  function updateLogicNode(nodeId: string, patch: Partial<LogicNode>) {
    setCurrentGraph(graph => graph ? {
      ...graph,
      nodes: graph.nodes.map(node => node.nodeId === nodeId ? { ...node, ...patch } : node)
    } : graph);
  }

  function deleteLogicNode(nodeId: string) {
    if (!currentGraph) return;
    setCurrentGraph({
      ...currentGraph,
      nodes: currentGraph.nodes.filter(node => node.nodeId !== nodeId),
      edges: currentGraph.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
    });
    setSelectedNodeId('');
    pushLog('已删除节点及相关连线。');
  }

  function parseVariableDefault(type: LogicVariableType, value: string): string | number | boolean {
    if (type === 'boolean') return value === 'true';
    if (type === 'number') return Number(value || 0);
    return value;
  }

  function addVariable() {
    if (!currentGraph) return;
    const id = variableId.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) {
      reportError('创建变量', new Error('变量 id 只能使用英文字母、数字和下划线，并且不能以数字开头。'));
      return;
    }
    if (currentGraph.variables.some(variable => variable.id === id)) {
      reportError('创建变量', new Error(`变量 ${id} 已存在。`));
      return;
    }
    const variable: LogicVariable = {
      id,
      name: variableName.trim() || id,
      type: variableType,
      defaultValue: parseVariableDefault(variableType, variableDefault),
      scope: 'local'
    };
    setCurrentGraph({ ...currentGraph, variables: [...currentGraph.variables, variable] });
    pushLog(`已创建本地变量：${variable.name} (${variable.id})。`);
  }

  function createVariableFromParam(idInput: string, current: unknown) {
    if (!currentGraph) return false;
    const id = idInput.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) {
      reportError('创建变量', new Error('变量 id 只能使用英文字母、数字和下划线，并且不能以数字开头。'));
      return false;
    }
    if (currentGraph.variables.some(variable => variable.id === id)) return true;
    const type: LogicVariableType = typeof current === 'boolean' ? 'boolean' : typeof current === 'number' ? 'number' : 'string';
    const variable: LogicVariable = {
      id,
      name: id,
      type,
      defaultValue: type === 'boolean' ? false : type === 'number' ? 0 : '',
      scope: 'local'
    };
    setCurrentGraph(graph => graph ? { ...graph, variables: graph.variables.some(item => item.id === id) ? graph.variables : [...graph.variables, variable] } : graph);
    pushLog(`已从节点参数创建变量：${variable.name} (${variable.id})。`);
    return true;
  }

  function updateVariable(id: string, patch: Partial<LogicVariable>) {
    if (!currentGraph) return;
    setCurrentGraph({
      ...currentGraph,
      variables: currentGraph.variables.map(variable => variable.id === id ? { ...variable, ...patch } : variable)
    });
  }

  function removeVariable(id: string) {
    if (!currentGraph) return;
    setCurrentGraph({
      ...currentGraph,
      variables: currentGraph.variables.filter(variable => variable.id !== id)
    });
    pushLog(`已删除变量：${id}。引用它的节点会在校验时提示。`);
  }

  async function createUiScreen() {
    await runAction('创建界面', async () => {
      if (!api || !project) return;
      const screen = await api.ui.createDefault({ name: `${project.modId}_screen` });
      const saved = await api.ui.save({ projectDir, screen });
      const loaded = await api.ui.load({ projectDir });
      setUiScreens(loaded);
      setCurrentUiScreen(saved);
      setSelectedWidgetId(saved.widgets[0]?.id || '');
      setActiveView('ui');
      pushLog(`已创建可视化界面：${saved.name}。`);
    });
  }

  async function saveUiScreen() {
    await runAction('保存界面', async () => {
      if (!api || !project || !currentUiScreen) return;
      const saved = await api.ui.save({ projectDir, screen: currentUiScreen });
      setCurrentUiScreen(saved);
      setUiScreens(await api.ui.load({ projectDir }));
      pushLog(`已保存界面模型：editor/ui/${saved.id}.json。`);
    });
  }

  function updateUiScreen(patch: Partial<UiScreenModel>) {
    if (!currentUiScreen) return;
    setCurrentUiScreen({ ...currentUiScreen, ...patch, updatedAt: new Date().toISOString() });
  }

  function addUiWidget(type: UiWidgetType) {
    if (!currentUiScreen) return;
    const widget = createUiWidget(type, currentUiScreen.widgets.length);
    setCurrentUiScreen({ ...currentUiScreen, widgets: [...currentUiScreen.widgets, widget], updatedAt: new Date().toISOString() });
    setSelectedWidgetId(widget.id);
  }

  function updateUiWidget(id: string, patch: Partial<UiWidget>) {
    if (!currentUiScreen) return;
    setCurrentUiScreen({
      ...currentUiScreen,
      widgets: currentUiScreen.widgets.map(widget => widget.id === id ? { ...widget, ...patch } : widget),
      updatedAt: new Date().toISOString()
    });
  }

  function deleteUiWidget(id: string) {
    if (!currentUiScreen) return;
    setCurrentUiScreen({
      ...currentUiScreen,
      widgets: currentUiScreen.widgets.filter(widget => widget.id !== id),
      updatedAt: new Date().toISOString()
    });
    setSelectedWidgetId('');
  }

  async function buildGraphFromAiDraft(draft: AiLogicDraft): Promise<LogicGraph> {
    if (!api) throw new Error('Electron 桥接不可用，无法创建节点图。');
    const eventType = normalizeEventType(draft.event);
    const eventNodeType = nodeTypes.includes(`event.${eventType}`) ? `event.${eventType}` : 'event.item_right_click';
    const aliasMap = new Map<string, string>();
    const graphNodes: LogicNode[] = [];
    let eventNode: LogicNode | null = null;

    const makeNode = async (draftNode: AiDraftNode, index: number) => {
      const requestedType = String(draftNode.nodeType || draftNode.type || '').trim();
      if (!requestedType) throw new Error(`AI 草案第 ${index + 1} 个节点缺少 nodeType。`);
      if (!nodeTypes.includes(requestedType)) throw new Error(`AI 草案包含未知节点类型：${requestedType}`);
      const node = await api.logic.createNode({ nodeType: requestedType });
      const alias = String(draftNode.id || draftNode.nodeId || `${requestedType}_${index}`);
      const params = isRecord(draftNode.params) ? draftNode.params : {};
      node.title = draftNode.title || node.title;
      node.params = { ...node.params, ...params };
      node.comment = draftNode.comment;
      node.position = {
        x: Number(draftNode.position?.x ?? 80 + index * 220),
        y: Number(draftNode.position?.y ?? (requestedType.startsWith('condition.') ? 90 : 210))
      };
      aliasMap.set(alias, node.nodeId);
      aliasMap.set(node.nodeId, node.nodeId);
      aliasMap.set(requestedType, node.nodeId);
      graphNodes.push(node);
      if (requestedType.startsWith('event.')) eventNode = node;
      return node;
    };

    for (const [index, draftNode] of draft.nodes.entries()) {
      await makeNode(draftNode, index);
    }

    if (!eventNode) {
      const node = await api.logic.createNode({ nodeType: eventNodeType });
      node.position = { x: 40, y: 140 };
      graphNodes.unshift(node);
      eventNode = node;
      aliasMap.set('event', node.nodeId);
      aliasMap.set(eventNodeType, node.nodeId);
    }

    const byId = new Map(graphNodes.map(node => [node.nodeId, node]));
    const resolveNodeId = (alias: string) => aliasMap.get(alias) || (byId.has(alias) ? alias : '');
    const graphEdges = draft.edges.map((edge, index) => {
      const source = resolveNodeId(edge.source);
      const target = resolveNodeId(edge.target);
      if (!source || !target) throw new Error(`AI 草案第 ${index + 1} 条连线引用了不存在的节点。`);
      const sourceNode = byId.get(source)!;
      const targetNode = byId.get(target)!;
      const sourceHandle = sourceNode.outputs.some(port => port.id === edge.sourceHandle) ? edge.sourceHandle! : defaultSourceHandle(sourceNode);
      const targetHandle = targetNode.inputs.some(port => port.id === edge.targetHandle) ? edge.targetHandle! : defaultTargetHandle(targetNode);
      return { id: `ai_edge_${Date.now()}_${index}`, source, sourceHandle, target, targetHandle, type: edge.type || 'exec' } as LogicEdge;
    });

    if (graphEdges.length === 0 && graphNodes.length > 1) {
      for (let index = 0; index < graphNodes.length - 1; index += 1) {
        graphEdges.push({
          id: `ai_edge_auto_${Date.now()}_${index}`,
          source: graphNodes[index].nodeId,
          sourceHandle: defaultSourceHandle(graphNodes[index]),
          target: graphNodes[index + 1].nodeId,
          targetHandle: defaultTargetHandle(graphNodes[index + 1]),
          type: 'exec'
        });
      }
    }

    return {
      schemaVersion: '0.1.0',
      graphId: `logic_ai_${Date.now()}`,
      name: draft.name || `AI 草案：${eventType}`,
      eventType,
      boundElement: draft.boundElement || currentGraph?.boundElement || textureOwner || undefined,
      enabled: true,
      targetLoaders: ['forge'],
      nodes: graphNodes,
      edges: graphEdges,
      variables: [],
      resources: [],
      diagnostics: [],
      generatedCodeCache: {},
      naturalLanguageCache: aiPrompt,
      editorView: { zoom: 1, position: { x: 0, y: 0 }, groups: [] }
    };
  }

  async function validateGraph() {
    await runAction('校验节点图', async () => {
      if (!api || !currentGraph) return;
      const result = await api.logic.validate({ graph: currentGraph });
      setDiagnostics(result);
      setBottomTab('diagnostics');
      pushLog(`节点图校验返回 ${result.length} 条诊断。`);
    });
  }

  async function compileGraph() {
    await runAction('编译节点图', async () => {
      if (!api || !currentGraph) return;
      const ir = await api.logic.compileToIR({ graph: currentGraph });
      const code = project ? await api.logic.previewForge({ projectDir, graph: currentGraph }) : '';
      setIrPreview(ir);
      setCodePreview(code);
      setBottomTab('ir');
      pushLog('节点图已编译为 BlockForge IR。');
    });
  }

  async function saveAiConfig() {
    await runAction('保存 AI 配置', async () => {
      if (!api) return;
      await api.ai.saveConfig({ config: aiConfig });
      pushLog('AI 服务商配置已保存到本机。');
    });
  }

  async function testAi() {
    await runAction('测试 AI 连接', async () => {
      if (!api) return;
      const ok = await api.ai.testConnection({ config: aiConfig });
      pushLog(ok ? 'AI 服务商连接正常。' : 'AI 服务商未返回预期响应。');
    });
  }

  async function listAiModels() {
    await runAction('检测本地 AI 模型', async () => {
      if (!api) return;
      const models = await api.ai.listModels({ config: aiConfig });
      setAiAvailableModels(models);
      if (models.length > 0 && (!aiConfig.model || aiConfig.provider === 'ollama' || aiConfig.provider === 'lmstudio')) {
        setAiConfig({ ...aiConfig, model: models[0] });
      }
      pushLog(models.length ? `已检测到 ${models.length} 个模型。` : '没有检测到模型。请确认本地 AI 软件已启动并已下载模型。');
    });
  }

  function applyAiPreset(preset: Omit<AiProviderConfig, 'apiKey'>) {
    setAiAvailableModels([]);
    setAiConfig(withApiKey(preset, preset.provider === aiConfig.provider ? aiConfig.apiKey : ''));
    pushLog(`已切换 AI 预设：${preset.displayName}。`);
  }

  function aiProjectContext() {
    if (!appSettings.aiPermissions.readProjectContext) {
      return {
        project: project ? { displayName: project.displayName, modId: project.modId, minecraftVersion: project.minecraftVersion } : null,
        activeView,
        counts: {
          elements: allElements.length,
          resources: resources.resources.length,
          graphs: graphs.length,
          uiScreens: uiScreens.length,
          plugins: plugins.length
        },
        permission: 'restricted'
      };
    }
    return {
      project,
      activeView,
      currentElement: draftElement ? `${draftElement.type}:${draftElement.id}` : null,
      elementCount: allElements.length,
      resourceCount: resources.resources.length,
      graphCount: graphs.length,
      uiScreenCount: uiScreens.length,
      plugins: plugins.map(plugin => ({
        id: plugin.manifest.id,
        name: plugin.manifest.name,
        enabled: plugin.enabled,
        tags: plugin.manifest.tags,
        actionCount: plugin.manifest.contributes.actions?.length || 0
      })),
      diagnostics: diagnostics.slice(0, 12)
    };
  }

  async function sendAiChat() {
    await runAction('发送 AI 对话', async () => {
      if (!api || !aiChatInput.trim()) return;
      if (!appSettings.aiPermissions.chat) {
        reportError('发送 AI 对话', new Error('当前已关闭 AI 对话权限。'));
        return;
      }
      const userMessage: AiChatMessage = { role: 'user', content: aiChatInput.trim() };
      const nextMessages = [...aiChatMessages, userMessage];
      setAiChatMessages(nextMessages);
      setAiChatInput('');
      const reply = await api.ai.chat({
        config: aiConfig,
        messages: nextMessages,
        context: aiProjectContext()
      });
      const updatedMessages = [...nextMessages, { role: 'assistant', content: reply } as AiChatMessage];
      setAiChatMessages(updatedMessages);
      setAiOutput(updatedMessages.map(message => `${message.role === 'user' ? '你' : 'AI'}：${message.content}`).join('\n\n'));
      setBottomTab('ai');
      pushLog('AI 对话已返回。');
    });
  }

  function clearAiChat() {
    setAiChatMessages([]);
    setAiOutput('');
    pushLog('AI 对话已清空。');
  }

  async function saveAiChatTranscript() {
    await runAction('保存 AI 对话记录', async () => {
      if (!api || !project || aiChatMessages.length === 0) return;
      const file = await api.ai.saveChatTranscript({ projectDir, messages: aiChatMessages });
      pushLog(`AI 对话记录已保存：${file}`);
    });
  }

  async function createAiDraft() {
    await runAction('生成 AI 节点草案', async () => {
      if (!api) return;
      if (!appSettings.aiPermissions.logicDraft) {
        reportError('生成 AI 节点草案', new Error('当前已关闭节点草案权限。'));
        return;
      }
      const draft = await api.ai.createLogicDraft({
        config: aiConfig,
        prompt: aiPrompt,
        context: {
          ...aiProjectContext(),
          currentGraph: appSettings.aiPermissions.readProjectContext ? currentGraph : null,
          availableElements: allElements.map(element => `${element.type}:${element.id}`)
        }
      }) as AiLogicDraft;
      setAiDraft(draft);
      setAiOutput(pretty(draft));
      setBottomTab('ai');
      pushLog('AI 已返回节点图草案 JSON。');
    });
  }

  async function applyAiDraft() {
    await runAction('应用 AI 节点草案', async () => {
      if (!api || !project) return;
      const draft = aiDraft || parseAiDraftFromOutput(aiOutput);
      const ok = window.confirm('将 AI 草案转换为 BlockForge 节点图，并先校验再保存。AI 不会直接写 Java。确认应用吗？');
      if (!ok) {
        pushLog('已取消应用 AI 节点草案。');
        return;
      }
      const graph = await buildGraphFromAiDraft(draft);
      const result = await api.logic.validate({ graph });
      setCurrentGraph(graph);
      setSelectedNodeId(graph.nodes[0]?.nodeId || '');
      setActiveView('logic');
      setDiagnostics(result);
      if (result.some(item => item.level === 'error')) {
        setBottomTab('diagnostics');
        pushLog(`AI 草案已转换为节点图，但发现 ${result.length} 条诊断，暂未保存。`);
        return;
      }
      const saved = await api.logic.save({ projectDir, graph });
      setGraphs(saved);
      const ir = await api.logic.compileToIR({ graph });
      const code = await api.logic.previewForge({ projectDir, graph });
      setIrPreview(ir);
      setCodePreview(code);
      setBottomTab('code');
      pushLog(`AI 草案已校验并保存为节点图：${graph.name}。`);
    });
  }

  async function createAiFeatureRecipe() {
    await runAction('生成 AI 特色玩法方案', async () => {
      if (!api || !project) return;
      if (!appSettings.aiPermissions.featureRecipe) {
        reportError('生成 AI 特色玩法方案', new Error('当前已关闭 AI 特色玩法方案权限。'));
        return;
      }
      const draft = await api.ai.createFeatureRecipe({
        config: aiConfig,
        prompt: aiFeaturePrompt,
        context: {
          ...aiProjectContext(),
          project,
          selectedElement: draftElement ? `${draftElement.type}:${draftElement.id}` : null,
          selectedTexture: { textureName, textureUsage, textureOwner },
          selectedModel: { modelName, modelUsage, modelOwner },
          existingLogicGraphs: graphs.map(graph => ({ name: graph.name, eventType: graph.eventType, boundElement: graph.boundElement })),
          featureTargets: ['animated_block', 'animated_texture', 'material_polish', 'particle_loop', 'low_level_method']
        }
      });
      setAiFeatureDraft(draft);
      setAiOutput(pretty(draft));
      setBottomTab('ai');
      pushLog(`AI 已生成特色玩法方案：${draft.title}。`);
    });
  }

  function sendFeatureToLogicPrompt() {
    if (!aiFeatureDraft) return;
    setAiPrompt([
      `请把下面这个特色玩法拆成 BlockForge 节点图草案：${aiFeatureDraft.title}`,
      aiFeatureDraft.summary,
      '',
      '重点：',
      ...aiFeatureDraft.logicPlan.map(item => `- ${item}`),
      '',
      '附加实现：',
      ...aiFeatureDraft.forgeNotes.map(item => `- ${item}`)
    ].join('\n'));
    pushLog('已把特色玩法方案写入节点草案提示。');
  }

  function sendFeatureToProjectPlanPrompt() {
    if (!aiFeatureDraft) return;
    setAiProjectPrompt([
      `请按下面的特色玩法方案补全 BlockForge 项目，但不要直接写生成目录：${aiFeatureDraft.title}`,
      aiFeatureDraft.summary,
      '',
      '步骤：',
      ...aiFeatureDraft.steps.map((step, index) => `${index + 1}. ${step}`),
      '',
      '资源计划：',
      ...aiFeatureDraft.assetPlan.map(item => `- ${item}`),
      '',
      '逻辑计划：',
      ...aiFeatureDraft.logicPlan.map(item => `- ${item}`)
    ].join('\n'));
    pushLog('已把特色玩法方案写入 AI 工程大改提示。');
  }

  async function createAiProjectPlan() {
    await runAction('生成 AI 工程变更计划', async () => {
      if (!api || !project) return;
      if (!appSettings.aiPermissions.projectPlan) {
        reportError('生成 AI 工程变更计划', new Error('当前已关闭工程变更计划权限。'));
        return;
      }
      const result = await api.ai.createProjectChangePlan({
        projectDir,
        config: aiConfig,
        prompt: aiProjectPrompt,
        context: appSettings.aiPermissions.readProjectContext ? {
          project,
          elementCount: allElements.length,
          resources: resources.resources.map(resource => ({ path: resource.path, usage: resource.usage, ownerElement: resource.ownerElement })),
          graphs: graphs.map(graph => ({ graphId: graph.graphId, name: graph.name, boundElement: graph.boundElement, nodes: graph.nodes.length, edges: graph.edges.length })),
          uiScreens: uiScreens.map(screen => ({ id: screen.id, name: screen.name, widgets: screen.widgets.length }))
        } : {
          project: project ? { displayName: project.displayName, modId: project.modId, minecraftVersion: project.minecraftVersion } : null,
          elementCount: allElements.length,
          resourceCount: resources.resources.length,
          graphCount: graphs.length,
          uiScreenCount: uiScreens.length,
          permission: 'restricted'
        }
      });
      setAiProjectPlan(result.plan);
      setAiProjectValidation(result.validationErrors);
      setAiScannedFiles(result.scannedFiles);
      setAiOutput(pretty(result.plan));
      setBottomTab('ai');
      pushLog(`AI 已生成工程变更计划：${result.plan.files.length} 个文件，扫描 ${result.scannedFiles.length} 个项目文件。`);
      if (result.validationErrors.length) {
        setDiagnostics(result.validationErrors.map(message => ({ level: 'error', code: 'AI_PROJECT_PLAN_INVALID', message })));
        setBottomTab('diagnostics');
      }
    });
  }

  async function applyAiProjectPlan() {
    if (!aiProjectPlan) return;
    if (!appSettings.aiPermissions.applyProjectPlan) {
      reportError('应用 AI 工程变更计划', new Error('当前已关闭直接应用工程变更计划的权限。'));
      return;
    }
    const changedCount = aiProjectPlan.files.length;
    const ok = window.confirm(`AI 将修改整个 BlockForge 项目编辑文件。\n\n标题：${aiProjectPlan.title}\n风险：${aiProjectPlan.riskLevel}\n影响文件：${changedCount} 个\n\n应用前会自动创建快照。确认应用吗？`);
    if (!ok) {
      pushLog('已取消应用 AI 工程变更计划。');
      return;
    }
    await runAction('应用 AI 工程变更计划', async () => {
      if (!api || !project) return;
      const result = await api.ai.applyProjectChangePlan({ projectDir, plan: aiProjectPlan });
      pushLog(`AI 工程变更已应用。快照：${result.snapshotPath}；写入 ${result.changedFiles.length} 个文件，删除 ${result.deletedFiles.length} 个文件。`);
      await refreshProjectData(projectDir);
      await runProjectHealthCheck();
    });
  }

  const selectedSourceNode = currentGraph?.nodes.find(node => node.nodeId === edgeSource);
  const pickElement = (element: ElementModel) => {
    setDraftElement(element);
    if (element.type === 'item' || element.type === 'block') {
      setTextureOwner(`${element.type}:${element.id}`);
      setTextureUsage(element.type === 'block' ? 'block_texture' : 'item_texture');
      setModelOwner(`${element.type}:${element.id}`);
      setModelUsage(element.type === 'block' ? 'block_model' : 'item_model');
      setModelName(String((element.properties as { model?: string }).model || ownerModelName(`${element.type}:${element.id}`)));
    }
    setActiveView('elements');
  };

  return (
    <div className={`app-shell density-${appSettings.uiDensity} ${appSettings.panelVisibility.leftSidebar ? '' : 'no-left-sidebar'} ${appSettings.panelVisibility.rightSidebar ? '' : 'no-right-sidebar'} ${appSettings.panelVisibility.bottomPanel ? '' : 'no-bottom-panel'} ${textureEditorMode ? 'texture-editor-mode' : ''} ${modelEditorMode ? 'model-editor-mode' : ''}`} style={{ '--app-background-color': appSettings.backgroundColor } as CSSProperties}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <span className="minecraft-cube grass" />
            <div>
              <strong>BlockForge Studio</strong>
              <small>像搭方块一样制作模组与插件</small>
            </div>
          </div>
          <span>{project ? `${project.displayName} / ${project.modId}` : '未打开项目'} · {canUseBridge ? '桌面桥接已就绪' : '桥接不可用'} · {statusMessage}</span>
        </div>
        <div className="top-actions">
          {busy && <span className="busy-pill">处理中：{busy}</span>}
          <button onClick={() => generateProject()} disabled={!project || Boolean(busy)}>生成工程</button>
          <button onClick={buildProjectJar} disabled={!project || Boolean(busy)}>构建 jar</button>
        </div>
      </header>

      <main className={`workspace ${textureEditorMode || modelEditorMode ? 'asset-editor-workspace' : ''}`}>
        {!textureEditorMode && !modelEditorMode && (
        <aside className="sidebar">
          <div className="panel-title">方块工作区</div>
          <button className={activeView === 'home' ? 'tree-item active' : 'tree-item'} onClick={() => setActiveView('home')}>工作台总览</button>
          <button className={activeView === 'design' ? 'tree-item active' : 'tree-item'} onClick={() => setActiveView('design')}>玩法蓝图</button>
          <button className={activeView === 'plugins' ? 'tree-item active' : 'tree-item'} onClick={() => setActiveView('plugins')}>插件工坊</button>
          <TreeGroup title={`物品 (${elements.items.length})`} items={elements.items} onPick={pickElement} />
          <TreeGroup title={`工具 (${elements.tools.length})`} items={elements.tools} onPick={pickElement} />
          <TreeGroup title={`方块 (${elements.blocks.length})`} items={elements.blocks} onPick={pickElement} />
          <TreeGroup title={`状态效果 (${elements.mobEffects.length})`} items={elements.mobEffects} onPick={pickElement} />
          <TreeGroup title={`药水 (${elements.potions.length})`} items={elements.potions} onPick={pickElement} />
          <TreeGroup title={`附魔 (${elements.enchantments.length})`} items={elements.enchantments} onPick={pickElement} />
          <TreeGroup title={`配方 (${elements.recipes.length})`} items={elements.recipes} onPick={pickElement} />
          <TreeGroup title={`战利品表 (${elements.lootTables.length})`} items={elements.lootTables} onPick={pickElement} />
          <TreeGroup title={`函数 (${elements.functions.length})`} items={elements.functions} onPick={pickElement} />
          <div className="tree-group">
            <div className="tree-group-title">节点图 ({graphs.length})</div>
            {graphs.map(graph => (
              <button
                key={graph.graphId}
                className="tree-item"
                onClick={() => {
                  setCurrentGraph(normalizeLogicGraph(graph));
                  setSelectedNodeId(graph.nodes[0]?.nodeId || '');
                  if (graph.boundElement) setTextureOwner(graph.boundElement);
                  setActiveView('logic');
                }}
              >
                {graph.name}
              </button>
            ))}
          </div>
          <div className="tree-group">
            <div className="tree-group-title">可视化界面 ({uiScreens.length})</div>
            {uiScreens.length === 0 && <div className="tree-empty">空</div>}
            {uiScreens.map(screen => (
              <button
                key={screen.id}
                className="tree-item"
                onClick={() => {
                  setCurrentUiScreen(screen);
                  setSelectedWidgetId(screen.widgets[0]?.id || '');
                  setActiveView('ui');
                }}
              >
                {screen.name}
              </button>
            ))}
          </div>
        </aside>
        )}

        <section className="editor-area">
          <div className="tabs">
            {(['home', 'design', 'elements', 'resources', 'logic', 'ui', 'forge', 'ai', 'plugins', 'manage', 'settings'] as ViewId[]).map(view => (
              <button key={view} className={activeView === view ? 'tab active' : 'tab'} onClick={() => setActiveView(view)}>
                {viewLabels[view]}
              </button>
            ))}
          </div>

          {activeView === 'design' && (
            <section className="view-grid two design-center">
              <Panel title="模组蓝图总览">
                <div className="design-hero">
                  <div>
                    <span>从一块矿石到一个可玩的模组</span>
                    <strong>{designScore}%</strong>
                  </div>
                  <ProgressBar value={designScore} />
                  <p>把项目当作一个世界存档来搭建：先放方块和物品，再铺材质、红石逻辑、GUI 容器，最后生成并构建工程。这里会按当前进度提示下一步。</p>
                </div>
                <div className="design-flow">
                  {designModules.map((module, index) => (
                    <button key={module.id} className={`design-step ${module.status}`} onClick={() => setActiveView(module.view)}>
                      <span>{index + 1}</span>
                      <strong>{module.title}</strong>
                      <small>{module.nextAction}</small>
                    </button>
                  ))}
                </div>
              </Panel>
              <Panel title="下一块该放哪里">
                {!project && <div className="tree-empty">还没有打开项目。先创建示例项目，最快能验证完整流程。</div>}
                {project && (
                  <>
                    <div className="next-action-list">
                      {nextDesignModules.map(module => (
                        <div className="next-action" key={module.id}>
                          <div>
                            <strong>{module.title}</strong>
                            <span>{module.summary}</span>
                            <small>{module.nextAction}</small>
                          </div>
                          <button onClick={() => setActiveView(module.view)}>处理</button>
                        </div>
                      ))}
                      {nextDesignModules.length === 0 && <div className="tree-empty">核心流程已经比较完整。可以生成工程、构建 jar，然后加入完成项目列表。</div>}
                    </div>
                    <div className="button-row wrap">
                      <button onClick={runProjectHealthCheck} disabled={Boolean(busy)}>项目健康检查</button>
                      <button onClick={saveCurrentWork} disabled={Boolean(busy)}>保存当前工作</button>
                      <button onClick={() => generateProject(true)} disabled={Boolean(busy)}>生成并打包</button>
                      <button onClick={() => setActiveView('ai')}>让 AI 巡检蓝图</button>
                    </div>
                  </>
                )}
              </Panel>
              <Panel title="生存模式制作清单">
                <div className="checklist-head">
                  <div>
                    <strong>{taskScore}%</strong>
                    <span>清单完成度</span>
                  </div>
                  <ProgressBar value={taskScore} />
                </div>
                <div className="task-list">
                  {designTasks.map(task => (
                    <div className={task.done ? 'task-row done' : 'task-row'} key={task.id}>
                      <span>{task.done ? '完成' : '待办'}</span>
                      <div>
                        <strong>{task.title}</strong>
                        <small>{task.detail}</small>
                      </div>
                      <button onClick={() => setActiveView(task.view)}>{task.actionLabel}</button>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="玩法蓝图包">
                <div className="kit-grid">
                  {contentKits.map(kit => (
                    <button className={`kit-card ${kit.tone}`} key={kit.id} onClick={() => applyContentKit(kit)}>
                      <span className={`minecraft-cube ${kit.tone}`} />
                      <strong>{kit.title}</strong>
                      <small>{kit.subtitle}</small>
                    </button>
                  ))}
                </div>
                <div className="hint">蓝图包会先把元素类型、ID 和中文名填好，你可以继续编辑属性、贴图、模型、掉落和节点逻辑。</div>
              </Panel>
              <Panel title="快速创建">
                <div className="quick-suggestion-grid">
                  <button onClick={() => { setElementKind('item'); setElementId('new_material'); setElementName('新材料'); setActiveView('elements'); }}>材料物品</button>
                  <button onClick={() => { setElementKind('item'); setElementId('magic_wand'); setElementName('魔法法杖'); setActiveView('elements'); }}>法杖物品</button>
                  <button onClick={() => { setElementKind('tool'); setElementId('frost_pickaxe'); setElementName('霜冻工具'); setActiveView('elements'); }}>工具</button>
                  <button onClick={() => { setElementKind('block'); setElementId('machine_block'); setElementName('机器方块'); setActiveView('elements'); }}>机器方块</button>
                  <button onClick={() => { setElementKind('mob_effect'); setElementId('frostbite'); setElementName('霜寒状态'); setActiveView('elements'); }}>状态效果</button>
                  <button onClick={() => { setElementKind('potion'); setElementId('frost_potion'); setElementName('霜寒药水'); setActiveView('elements'); }}>药水</button>
                  <button onClick={() => { setElementKind('enchantment'); setElementId('frost_affinity'); setElementName('霜寒亲和'); setActiveView('elements'); }}>附魔</button>
                  <button onClick={() => { setElementKind('recipe'); setElementId('core_recipe'); setElementName('核心配方'); setActiveView('elements'); }}>合成配方</button>
                  <button onClick={() => { setElementKind('loot_table'); setElementId('block_loot'); setElementName('方块掉落'); setActiveView('elements'); }}>掉落表</button>
                  <button onClick={() => { setElementKind('function'); setElementId('cast_spell'); setElementName('施法函数'); setActiveView('elements'); }}>mcfunction</button>
                </div>
                <div className="hint">这些按钮会帮你预填元素类型、ID 和中文名，再到“方块/物品”页继续细化具体属性。</div>
              </Panel>
              <Panel title="功能模块矿脉">
                <div className="module-grid">
                  {designModules.map(module => (
                    <div className={`module-card ${module.status}`} key={module.id}>
                      <div className="module-card-head">
                        <strong>{module.title}</strong>
                        <StatusPill status={module.status} />
                      </div>
                      <ProgressBar value={module.progress} />
                      <span>{module.summary}</span>
                      <button onClick={() => setActiveView(module.view)}>打开模块</button>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="工作台原则">
                <div className="principle-list">
                  <div><strong>桌面工作台优先</strong><span>保持 VS Code + MCreator 风格，所有工具围绕当前项目展开。</span></div>
                  <div><strong>像红石一样可追踪</strong><span>构建、AI 大改、快照和日志都保留痕迹，方便回退和排错。</span></div>
                  <div><strong>表单是铁镐，JSON 是钻镐</strong><span>常用属性直接填，高级 JSON 兜底，最终都生成可检查的工程文件。</span></div>
                  <div><strong>国内网络友好</strong><span>构建默认偏向国内镜像，失败时保存日志并给出可读原因。</span></div>
                  <div><strong>保留扩展矿道</strong><span>Fabric、多版本加载器、高级 GUI 运行时等先保留结构，不伪装成完整实现。</span></div>
                </div>
              </Panel>
            </section>
          )}

          {activeView === 'home' && (
            <section className="view-grid two">
              <Panel title="方块工坊总控台">
                <div className="workbench-hero">
                  <div className="block-mosaic" aria-hidden="true">
                    <span className="block grass" />
                    <span className="block dirt" />
                    <span className="block stone" />
                    <span className="block ore" />
                    <span className="block redstone" />
                    <span className="block plank" />
                  </div>
                  <div>
                    <strong>{project ? project.displayName : '先放下第一块方块'}</strong>
                    <span>{project ? `命名空间 ${project.modId} · ${projectTargetLabel(project)} · ${project.minecraftVersion}` : '创建项目后，就能开始制作物品、方块、贴图、红石逻辑和工程打包。'}</span>
                  </div>
                </div>
                <div className="button-row wrap">
                  <button onClick={() => setActiveView('design')}>查看玩法蓝图</button>
                  <button onClick={() => setActiveView('elements')} disabled={!project}>创建方块/物品</button>
                  <button onClick={() => setActiveView('resources')} disabled={!project}>制作材质资源</button>
                  <button onClick={() => generateProject(true)} disabled={!project || Boolean(busy)}>生成并打包</button>
                </div>
                <div className="hint">这里是 BlockForge 的工作台入口：从世界设定到元素、资源、红石节点和导出，都尽量保持可视、可回退、可继续修改。</div>
              </Panel>
              <Panel title="新建项目">
                <Field label="项目目录" value={projectDir} onChange={setProjectDir} hint="BlockForge 会在这里保存编辑数据、生成工程、构建日志和导出的 jar。" />
                <Field label="显示名称" value={displayName} onChange={setDisplayName} />
                <Field label="模组 ID（modId）" value={modId} onChange={setModId} hint="只用小写英文、数字和下划线，例如 echo_crystal_demo。它会成为 Minecraft 资源命名空间。" />
                <Field label="Java 包名（packageName）" value={packageName} onChange={setPackageName} hint="生成 Java 代码时使用，例如 com.blockforge.echo_crystal_demo。" />
                <Field label="作者" value={author} onChange={setAuthor} />
                <label>工程目标</label>
                <div className="button-row wrap">
                  {loaderOptions.map(option => (
                    <button
                      key={option.id}
                      className={projectLoader === option.id ? 'selected' : ''}
                      onClick={() => setProjectLoader(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="hint">{loaderOptions.find(option => option.id === projectLoader)?.hint}</div>
                <div className="button-row">
                  <button onClick={createProject} disabled={!canUseBridge || Boolean(busy)}>创建项目</button>
                  <button onClick={createSampleProject} disabled={!canUseBridge || Boolean(busy)}>一键示例项目</button>
                </div>
                <div className="hint">示例项目会根据工程目标自动生成对应骨架；Forge / Fabric 会带上物品、方块、配方和资源，Paper 会生成可运行的服务端插件模板。</div>
              </Panel>
              <Panel title="打开项目">
                <Field label="项目目录" value={openDir} onChange={setOpenDir} placeholder="留空时打开系统目录选择器" hint="可以打开最近项目，也可以粘贴任意 BlockForge 项目目录。" />
                <button onClick={() => openProject(openDir || undefined)} disabled={!canUseBridge || Boolean(busy)}>打开项目</button>
                <div className="recent-list">
                  {recent.map(item => <button key={item} onClick={() => openProject(item)}>{item}</button>)}
                </div>
              </Panel>
              <Panel title="当前世界概览">
                {!project && <div className="tree-empty">还没有打开项目。创建或打开项目后，这里会显示模组内容完成度。</div>}
                {project && (
                  <>
                    <div className="stat-grid">
                      <div><strong>{projectStats.elements}</strong><span>元素</span></div>
                      <div><strong>{projectStats.resources}</strong><span>资源文件</span></div>
                      <div><strong>{projectStats.graphs}</strong><span>节点图</span></div>
                      <div><strong>{projectStats.screens}</strong><span>界面模型</span></div>
                      <div><strong>{projectStats.plugins}</strong><span>插件</span></div>
                    </div>
                    <div className="button-row wrap">
                      <button onClick={() => setActiveView('elements')}>编辑方块/物品</button>
                      <button onClick={() => setActiveView('resources')}>制作材质资源</button>
                      <button onClick={() => setActiveView('logic')}>编辑红石逻辑</button>
                      <button onClick={() => setActiveView('forge')}>锻造与构建</button>
                      <button onClick={saveCurrentWork} disabled={Boolean(busy)}>保存当前工作</button>
                      <button onClick={runProjectHealthCheck} disabled={Boolean(busy)}>项目健康检查</button>
                    </div>
                    <div className="hint">{projectStats.completed ? '这个项目已在完成项目列表中。' : '项目完成后，可以在“项目管理”里加入完成项目列表。'}</div>
                  </>
                )}
              </Panel>
            </section>
          )}

          {activeView === 'elements' && (
            <section className="view-grid two">
              <Panel title="放置新方块 / 物品">
                <label>类型</label>
                <select value={elementKind} onChange={event => setElementKind(event.target.value as ElementKind)}>
                  {Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <Field label="元素 ID" value={elementId} onChange={setElementId} />
                <Field label="中文名" value={elementName} onChange={setElementName} />
                <div className="button-row">
                  <button onClick={() => createElementDraft(false)} disabled={!project || Boolean(busy)}>只生成草稿</button>
                  <button onClick={() => createElementDraft(true)} disabled={!project || Boolean(busy)}>创建并保存</button>
                </div>
                <div className="element-search">
                  <Field label="搜索工坊元素" value={elementFilter} onChange={setElementFilter} placeholder="输入 ID、中文名、类型或描述" />
                  <div className="element-search-list">
                    {filteredElements.length === 0 && <div className="tree-empty">没有匹配的元素。</div>}
                    {filteredElements.map(element => (
                      <button key={`${element.type}:${element.id}`} className="resource-row" onClick={() => pickElement(element)}>
                        <strong>{element.displayName.zh_cn || element.id}</strong>
                        <span>{kindLabels[element.type as ElementKind] || element.type} · {element.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </Panel>
              <Panel title="属性锻造台">
                {!draftElement && <div className="tree-empty">先在左侧创建或选择一个元素，再像调工作台配方一样细化属性。</div>}
                {draftElement && <ElementQuickEditor element={draftElement} project={project} onChange={(next) => { setDraftElement(next); setElementJson(pretty(next)); }} />}
                <details className="advanced-block">
                  <summary>高级：查看或直接编辑元素 JSON</summary>
                  <textarea className="json-editor" value={elementJson} onChange={event => setElementJson(event.target.value)} />
                </details>
                <div className="button-row wrap">
                  <button onClick={saveDraftElement} disabled={!draftElement || Boolean(busy)}>保存元素</button>
                  <button onClick={duplicateDraftElement} disabled={!draftElement || Boolean(busy)}>复制为新元素</button>
                  <button onClick={deleteDraftElement} disabled={!draftElement || Boolean(busy)}>删除元素</button>
                </div>
              </Panel>
            </section>
          )}

          {activeView === 'resources' && (
            <section className="view-grid two">
              <Panel title="贴图引用与严格格式">
                <Field label="贴图 PNG 路径" value={texturePath} onChange={setTexturePath} placeholder="留空时打开文件选择器" hint="可选择外部 PNG 文件，也可以在右侧像素绘制器里直接画。" />
                <label>用途</label>
                <select value={textureUsage} onChange={event => setTextureUsage(event.target.value as 'item_texture' | 'block_texture')}>
                  <option value="item_texture">物品贴图</option>
                  <option value="block_texture">方块贴图</option>
                </select>
                <Field label="绑定元素" value={textureOwner} onChange={value => {
                  setTextureOwner(value);
                  setTextureUsage(value.startsWith('block:') ? 'block_texture' : 'item_texture');
                }} hint="格式为 item:物品id、tool:工具id 或 block:方块id，例如 item:echo_crystal。" />
                <Field label="贴图文件名" value={textureName} onChange={value => setTextureName(value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} hint="不用写 .png，生成时会自动放到正确目录。" />
                <div className="button-row">
                  <button onClick={importTexture} disabled={!project || Boolean(busy)}>选择 PNG 并自动绑定</button>
                  <button onClick={checkMissingResources} disabled={!project || Boolean(busy)}>检查资源</button>
                </div>
                <div className="format-rules">
                  <strong>贴图格式要求</strong>
                  <span>只接受 PNG，不接受 JPG、WEBP 或 GIF。</span>
                  <span>尺寸必须是 16x16、32x32 或 64x64 的正方形；Minecraft 原版风格推荐 16x16。</span>
                  <span>贴图名只能使用小写英文字母、数字和下划线，例如 ice_wand。</span>
                  <span>物品输出到 assets/&lt;modid&gt;/textures/item/&lt;name&gt;.png。</span>
                  <span>方块输出到 assets/&lt;modid&gt;/textures/block/&lt;name&gt;.png。</span>
                  <span>绑定元素必须写成 item:id 或 block:id；导入或绘制保存后会自动写入元素的 texture / textureAll 属性。</span>
                </div>
                <div className="resource-list">
                  {resources.resources.length === 0 && <div className="tree-empty">还没有资源。导入贴图或模型后会出现在这里。</div>}
                  {resources.resources.map(resource => (
                    <button
                      key={resource.resourceId}
                      className="resource-row"
                      onContextMenu={event => {
                        event.preventDefault();
                        setResourceMenu({ resource, x: event.clientX, y: event.clientY });
                      }}
                      onClick={() => {
                        if (resource.type === 'model') {
                          void loadModelResource(resource);
                          if (resource.ownerElement) {
                            setModelOwner(resource.ownerElement);
                            setModelUsage(resource.usage === 'block_model' ? 'block_model' : 'item_model');
                          }
                          setModelName(basenameNoExt(resource.path));
                        } else {
                          if (resource.ownerElement) setTextureOwner(resource.ownerElement);
                          setTextureUsage(resource.usage === 'block_texture' ? 'block_texture' : 'item_texture');
                          setTextureName(basenameNoExt(resource.path));
                        }
                      }}
                    >
                      <strong>{basenameNoExt(resource.path)}</strong>
                      <span>{resource.path}</span>
                      <small>{resource.type === 'model' ? '3D 模型' : '贴图'} · {resource.ownerElement || '未绑定'} · 右键复制/删除/绑定</small>
                    </button>
                  ))}
                </div>
                <details className="advanced-block">
                  <summary>高级：资源索引 JSON</summary>
                  <pre className="data-preview compact">{pretty(resources)}</pre>
                </details>
              </Panel>
              <Panel title="内置像素绘制器">
                <div className="texture-toolbar">
                  <label>尺寸</label>
                  <select value={textureSize} onChange={event => resetTextureCanvas(Number(event.target.value) as TextureSize)}>
                    <option value={16}>16x16</option>
                    <option value={32}>32x32</option>
                    <option value={64}>64x64</option>
                  </select>
                  <label>缩放</label>
                  <input type="range" min="12" max="40" value={texturePixelScale} onChange={event => setTexturePixelScale(Number(event.target.value))} />
                  <label>颜色</label>
                  <input type="color" value={textureColor} onChange={event => setTextureColor(event.target.value)} />
                  <label>工具</label>
                  <select value={textureTool} onChange={event => setTextureTool(event.target.value as TextureTool)}>
                    <option value="pencil">画笔</option>
                    <option value="eraser">橡皮</option>
                    <option value="fill">填充</option>
                    <option value="eyedropper">取色</option>
                  </select>
                </div>
                <TextureCanvas
                  size={textureSize}
                  pixels={texturePixels}
                  drawing={textureDrawing}
                  pixelScale={texturePixelScale}
                  onStart={(index) => { setTextureDrawing(true); paintPixel(index); }}
                  onMove={(index) => { if (textureDrawing && textureTool !== 'fill' && textureTool !== 'eyedropper') paintPixel(index); }}
                  onPaint={paintPixel}
                />
                <div className="button-row">
                  <button onClick={saveDrawnTexture} disabled={!project || Boolean(busy)}>保存绘制贴图并绑定</button>
                  <button onClick={openTextureEditorWindow} disabled={!project || Boolean(busy)}>弹出独立窗口</button>
                  <button onClick={createAiTextureDraft} disabled={!project || Boolean(busy) || !appSettings.aiPermissions.textureDraft || (providerNeedsApiKey(aiConfig) && !aiConfig.apiKey)}>AI 画材质</button>
                  <button onClick={() => resetTextureCanvas()} disabled={Boolean(busy)}>清空画布</button>
                </div>
                <div className="hint">绘制器保存的是透明背景 PNG；如果要用外部参考图，点击左侧“选择 PNG 并自动绑定”。AI 画材质会先生成草稿并铺到当前画布上。</div>
              </Panel>
              <Panel title="3D 模型编辑器">
                <Field label="模型文件路径" value={modelPath} onChange={setModelPath} placeholder="留空时打开文件选择器" hint="支持导入 Blockbench 导出的 JSON 模型，也可以直接编辑当前模型内容。" />
                <label>用途</label>
                <select value={modelUsage} onChange={event => setModelUsage(event.target.value as ModelUsage)}>
                  <option value="item_model">物品模型</option>
                  <option value="block_model">方块模型</option>
                </select>
                <Field label="绑定元素" value={modelOwner} onChange={value => {
                  setModelOwner(value);
                  setModelUsage(value.startsWith('block:') ? 'block_model' : 'item_model');
                  setModelName(ownerModelName(value));
                }} hint="格式为 item:物品id、tool:工具id 或 block:方块id，例如 item:ice_wand。" />
                <Field label="模型文件名" value={modelName} onChange={value => setModelName(value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} hint="不用写 .json，生成时会放到 models/item 或 models/block。" />
                <div className="button-row">
                  <button onClick={importModel} disabled={!project || Boolean(busy)}>导入 JSON 并绑定</button>
                  <button onClick={saveModelDraft} disabled={!project || Boolean(busy)}>保存模型</button>
                  <button onClick={saveModelEditorDraft} disabled={!project || Boolean(busy)}>保存草稿</button>
                  <button onClick={createAiModelDraft} disabled={!project || Boolean(busy) || !appSettings.aiPermissions.modelDraft || (providerNeedsApiKey(aiConfig) && !aiConfig.apiKey)}>AI 生成模型</button>
                  <button onClick={resetModelDraft} disabled={!project || Boolean(busy)}>填充模板</button>
                  <button onClick={openModelEditorWindow} disabled={!project || Boolean(busy)}>弹出独立窗口</button>
                </div>
                <label>模型 JSON</label>
                <textarea className="json-editor model-editor" value={modelJson} onChange={event => setModelJson(event.target.value)} placeholder={defaultModelJson()} />
                <div className="hint">物品模型会生成到 assets/&lt;modid&gt;/models/item/，方块模型会生成到 assets/&lt;modid&gt;/models/block/。AI 模型草稿会保持 Minecraft / Blockbench JSON 格式，确认后再保存。</div>
                <details className="advanced-block">
                  <summary>模型预览</summary>
                  <pre className="data-preview compact">{modelJson ? modelJson : defaultModelJson()}</pre>
                </details>
              </Panel>
            </section>
          )}

          {activeView === 'logic' && (
            <section className="logic-view">
              <div className="logic-toolbar">
                <button onClick={createExampleLogic} disabled={!project || Boolean(busy)}>示例节点图</button>
                <button onClick={saveGraph} disabled={!currentGraph || !project || Boolean(busy)}>保存</button>
                <button onClick={validateGraph} disabled={!currentGraph || Boolean(busy)}>校验</button>
                <button onClick={compileGraph} disabled={!currentGraph || Boolean(busy)}>预览逻辑与代码</button>
                <select value={selectedNodeType} onChange={event => setSelectedNodeType(event.target.value)}>
                  {nodeTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <button onClick={addNode} disabled={!currentGraph || Boolean(busy)}>添加节点</button>
              </div>
              <div className="event-editor-panel">
                <div className="event-editor-head">
                  <div>
                    <strong>事件编辑器</strong>
                    <span>选择 Minecraft 触发时机，再把条件和动作接到事件的执行出口。</span>
                  </div>
                  <code>{currentGraph?.eventType || '未选择事件'}</code>
                </div>
                <div className="event-group-grid">
                  {eventNodeGroups.map(group => (
                    <div className="event-group" key={group.title}>
                      <strong>{group.title}</strong>
                      <div className="button-row mini wrap">
                        {group.nodes.map(([nodeType, label]) => (
                          <button key={nodeType} onClick={() => addNodeByType(nodeType)} disabled={!currentGraph || Boolean(busy)}>{label}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hint">首版事件代码生成最完整支持“右键物品”；其他事件会先进入节点图和 IR，作为后续事件映射的可视化入口。</div>
              </div>
              <div className="event-blank-panel">
                <div className="event-editor-head">
                  <div>
                    <strong>其余事件快速起稿</strong>
                    <span>先创建只有事件入口的空白节点图，再按需要加入游戏动作、变量和 NBT。</span>
                  </div>
                </div>
                <div className="event-quick-grid">
                  <button onClick={() => createEventGraph('event.block_right_click', '右键方块事件', textureOwner || 'block:machine_block')} disabled={!project || Boolean(busy)}>右键方块</button>
                  <button onClick={() => createEventGraph('event.block_place', '放置方块事件', textureOwner || 'block:machine_block')} disabled={!project || Boolean(busy)}>放置方块</button>
                  <button onClick={() => createEventGraph('event.item_use', '使用物品事件', textureOwner || 'item:ice_wand')} disabled={!project || Boolean(busy)}>使用物品</button>
                  <button onClick={() => createEventGraph('event.item_crafted', '合成物品事件', textureOwner || 'item:ice_wand')} disabled={!project || Boolean(busy)}>合成物品</button>
                  <button onClick={() => createEventGraph('event.player_tick', '玩家每刻事件', 'player')} disabled={!project || Boolean(busy)}>玩家每刻</button>
                  <button onClick={() => createEventGraph('event.player_hurt', '玩家受伤事件', 'player')} disabled={!project || Boolean(busy)}>玩家受伤</button>
                  <button onClick={() => createEventGraph('event.player_respawn', '玩家重生事件', 'player')} disabled={!project || Boolean(busy)}>玩家重生</button>
                  <button onClick={() => createEventGraph('event.player_attack', '玩家攻击事件', 'player')} disabled={!project || Boolean(busy)}>玩家攻击</button>
                  <button onClick={() => createEventGraph('event.living_death', '实体死亡事件', 'entity')} disabled={!project || Boolean(busy)}>实体死亡</button>
                  <button onClick={() => createEventGraph('event.entity_spawn', '实体生成事件', 'entity')} disabled={!project || Boolean(busy)}>实体生成</button>
                  <button onClick={() => createEventGraph('event.world_load', '世界加载事件', 'world')} disabled={!project || Boolean(busy)}>世界加载</button>
                  <button onClick={() => createEventGraph('event.world_tick', '世界每刻事件', 'world')} disabled={!project || Boolean(busy)}>世界每刻</button>
                </div>
              </div>
              <div className="template-panel">
                <div className="event-editor-head">
                  <div>
                    <strong>常用玩法事件模板</strong>
                    <span>一键生成完整节点链，之后可以继续改参数、增删节点和连线。</span>
                  </div>
                </div>
                <div className="template-grid">
                  <button onClick={() => createLogicTemplate('spell')} disabled={!project || Boolean(busy)}>
                    <strong>右键法杖施法</strong>
                    <span>经验判断、冷却、药水效果、音效、失败提示</span>
                  </button>
                  <button onClick={() => createLogicTemplate('break_drop')} disabled={!project || Boolean(busy)}>
                    <strong>破坏方块额外掉落</strong>
                    <span>工具判断、给予物品、播放音效、失败提示</span>
                  </button>
                  <button onClick={() => createLogicTemplate('welcome')} disabled={!project || Boolean(busy)}>
                    <strong>进入世界欢迎奖励</strong>
                    <span>欢迎消息、给予指南针、播放提示音</span>
                  </button>
                  <button onClick={() => createLogicTemplate('utility')} disabled={!project || Boolean(busy)}>
                    <strong>道具使用响应</strong>
                    <span>使用检测、给予效果、音效、提示消息</span>
                  </button>
                </div>
              </div>
              <div className="game-content-panel">
                <div className="event-editor-head">
                  <div>
                    <strong>游戏内容节点库</strong>
                    <span>常见游戏动作和判断，参数使用 Minecraft 命名空间，例如 minecraft:diamond、minecraft:speed。</span>
                  </div>
                </div>
                <div className="event-group-grid">
                  {gameNodeGroups.map(group => (
                    <div className="event-group" key={group.title}>
                      <strong>{group.title}</strong>
                      <div className="button-row mini wrap">
                        {group.nodes.map(([nodeType, label]) => (
                          <button key={nodeType} onClick={() => addNodeByType(nodeType)} disabled={!currentGraph || Boolean(busy)}>{label}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="variable-panel">
                <div className="variable-create-row">
                  <input value={variableId} onChange={event => setVariableId(event.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))} placeholder="变量 id，例如 counter" />
                  <input value={variableName} onChange={event => setVariableName(event.target.value)} placeholder="显示名" />
                  <select value={variableType} onChange={event => setVariableType(event.target.value as LogicVariableType)}>
                    {Object.entries(variableTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  {variableType === 'boolean' ? (
                    <select value={variableDefault} onChange={event => setVariableDefault(event.target.value)}>
                      <option value="false">false</option>
                      <option value="true">true</option>
                    </select>
                  ) : (
                    <input value={variableDefault} onChange={event => setVariableDefault(event.target.value)} placeholder="默认值" />
                  )}
                  <button onClick={addVariable} disabled={!currentGraph || Boolean(busy)}>新建变量</button>
                </div>
                <div className="variable-list">
                  {(currentGraph?.variables || []).length === 0 && <span className="tree-empty">还没有变量。先建变量，再添加变量节点。</span>}
                  {(currentGraph?.variables || []).map(variable => (
                    <div className="variable-row" key={variable.id}>
                      <input value={variable.name} onChange={event => updateVariable(variable.id, { name: event.target.value })} />
                      <code>{variable.id}</code>
                      <select value={variable.type} onChange={event => updateVariable(variable.id, { type: event.target.value as LogicVariableType })}>
                        {Object.entries(variableTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <input value={String(variable.defaultValue)} onChange={event => updateVariable(variable.id, { defaultValue: parseVariableDefault(variable.type, event.target.value) })} />
                      <button onClick={() => removeVariable(variable.id)} disabled={Boolean(busy)}>删除</button>
                    </div>
                  ))}
                </div>
                <div className="button-row mini">
                  <button onClick={() => addNodeByType('action.variable_set')} disabled={!currentGraph || Boolean(busy)}>设置变量节点</button>
                  <button onClick={() => addNodeByType('action.variable_add')} disabled={!currentGraph || Boolean(busy)}>增加变量节点</button>
                  <button onClick={() => addNodeByType('condition.variable_equals')} disabled={!currentGraph || Boolean(busy)}>变量等于判断</button>
                  <button onClick={() => addNodeByType('condition.variable_greater_or_equal')} disabled={!currentGraph || Boolean(busy)}>变量大于等于判断</button>
                </div>
                <div className="button-row mini">
                  <button onClick={() => addNodeByType('action.nbt_set_string')} disabled={!currentGraph || Boolean(busy)}>写入 NBT 文本</button>
                  <button onClick={() => addNodeByType('action.nbt_set_number')} disabled={!currentGraph || Boolean(busy)}>写入 NBT 数字</button>
                  <button onClick={() => addNodeByType('condition.nbt_has_key')} disabled={!currentGraph || Boolean(busy)}>NBT 存在判断</button>
                  <button onClick={() => addNodeByType('condition.nbt_number_gte')} disabled={!currentGraph || Boolean(busy)}>NBT 数字判断</button>
                </div>
                <div className="hint">变量写法：在文本里用 <code>{'${counter}'}</code> 插入变量；在数字或布尔参数里可写 <code>var:counter</code>。NBT 是 Minecraft 的物品/实体标签数据，首版先生成“手持物品”的 NBT 读写。</div>
              </div>
              <div className="edge-editor">
                <select value={edgeSource} onChange={event => { setEdgeSource(event.target.value); setEdgeSourceHandle('exec_out'); }}>
                  <option value="">源节点</option>
                  {currentGraph?.nodes.map(node => <option key={node.nodeId} value={node.nodeId}>{node.title}</option>)}
                </select>
                <select value={edgeSourceHandle} onChange={event => setEdgeSourceHandle(event.target.value)}>
                  {(selectedSourceNode?.outputs || []).map(port => <option key={port.id} value={port.id}>{port.name}</option>)}
                </select>
                <select value={edgeTarget} onChange={event => setEdgeTarget(event.target.value)}>
                  <option value="">目标节点</option>
                  {currentGraph?.nodes.filter(node => node.inputs.some(port => port.type === 'exec')).map(node => <option key={node.nodeId} value={node.nodeId}>{node.title}</option>)}
                </select>
                <button onClick={addEdge} disabled={!currentGraph || Boolean(busy)}>连线</button>
              </div>
              <div className="logic-canvas">
                {currentGraph && <LogicEdgesOverlay graph={currentGraph} />}
                {currentGraph?.nodes.map(node => (
                  <LogicNodeCard
                    key={node.nodeId}
                    node={node}
                    selected={node.nodeId === selectedNodeId}
                    onSelect={() => setSelectedNodeId(node.nodeId)}
                  />
                ))}
              </div>
              {selectedLogicNode && (
                <LogicNodeInspector
                  node={selectedLogicNode}
                  variables={currentGraph?.variables || []}
                  onChange={patch => updateLogicNode(selectedLogicNode.nodeId, patch)}
                  onCreateVariable={(id, current) => createVariableFromParam(id, current)}
                  onDelete={() => deleteLogicNode(selectedLogicNode.nodeId)}
                />
              )}
              <div className="edge-list">
                {(currentGraph?.edges || []).map(edge => <span key={edge.id}>{edge.sourceHandle}: {edge.source.slice(0, 10)} → {edge.target.slice(0, 10)}</span>)}
              </div>
            </section>
          )}

          {activeView === 'ui' && (
            <section className="view-grid two ui-editor">
              <Panel title="可视化界面">
                <div className="button-row">
                  <button onClick={createUiScreen} disabled={!project || Boolean(busy)}>新建界面</button>
                  <button onClick={saveUiScreen} disabled={!project || !currentUiScreen || Boolean(busy)}>保存界面</button>
                  <button onClick={() => openPath(`${projectDir}\\editor\\ui`)} disabled={!project || Boolean(busy)}>打开界面目录</button>
                </div>
                <div className="list-panel">
                  {uiScreens.length === 0 && <div className="tree-empty">还没有界面模型。点击“新建界面”开始。</div>}
                  {uiScreens.map(screen => (
                    <button
                      key={screen.id}
                      className="resource-row"
                      onClick={() => {
                        setCurrentUiScreen(screen);
                        setSelectedWidgetId(screen.widgets[0]?.id || '');
                      }}
                    >
                      <strong>{screen.name}</strong>
                      <span>{screen.id}</span>
                      <small>{screen.width}x{screen.height} · {screen.widgets.length} 个控件</small>
                    </button>
                  ))}
                </div>
                {currentUiScreen && (
                  <>
                    <Field label="界面 ID" value={currentUiScreen.id} onChange={value => updateUiScreen({ id: value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} />
                    <Field label="界面名称" value={currentUiScreen.name} onChange={value => updateUiScreen({ name: value })} />
                    <NumberField label="宽度" value={currentUiScreen.width} onChange={value => updateUiScreen({ width: clampNumber(value, 80, 512) })} />
                    <NumberField label="高度" value={currentUiScreen.height} onChange={value => updateUiScreen({ height: clampNumber(value, 60, 512) })} />
                    <label>背景颜色</label>
                    <input type="color" value={currentUiScreen.background} onChange={event => updateUiScreen({ background: event.target.value })} />
                    <div className="button-row mini">
                      {(['label', 'button', 'image', 'slot'] as UiWidgetType[]).map(type => (
                        <button key={type} onClick={() => addUiWidget(type)} disabled={Boolean(busy)}>添加{uiWidgetLabels[type]}</button>
                      ))}
                    </div>
                  </>
                )}
                <div className="hint">首版界面编辑器保存的是 BlockForge 界面模型，可用于设计容器、按钮、图片和槽位布局；后续会继续补更完整的菜单自动生成。</div>
              </Panel>
              <Panel title="界面画布">
                {!currentUiScreen && <div className="tree-empty">先创建或选择一个界面。</div>}
                {currentUiScreen && (
                  <>
                    <div className="ui-canvas-wrap">
                      <div
                        className="ui-canvas"
                        style={{
                          width: currentUiScreen.width * 3,
                          height: currentUiScreen.height * 3,
                          background: currentUiScreen.background
                        }}
                      >
                        {currentUiScreen.widgets.map(widget => (
                          <button
                            key={widget.id}
                            type="button"
                            className={`ui-widget ${widget.type} ${selectedWidgetId === widget.id ? 'selected' : ''}`}
                            style={{
                              left: widget.x * 3,
                              top: widget.y * 3,
                              width: widget.width * 3,
                              height: widget.height * 3
                            }}
                            onClick={() => setSelectedWidgetId(widget.id)}
                          >
                            {widget.type === 'slot' ? '' : widget.type === 'image' ? (widget.texture || '图片') : widget.text}
                          </button>
                        ))}
                      </div>
                    </div>
                    {selectedWidget && (
                      <div className="ui-inspector">
                        <div className="panel-title">控件属性</div>
                        <label>控件类型</label>
                        <select value={selectedWidget.type} onChange={event => updateUiWidget(selectedWidget.id, { type: event.target.value as UiWidgetType })}>
                          {Object.entries(uiWidgetLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
                        </select>
                        <Field label="文本" value={selectedWidget.text} onChange={value => updateUiWidget(selectedWidget.id, { text: value })} />
                        <div className="ui-number-grid">
                          <NumberField label="X" value={selectedWidget.x} onChange={value => updateUiWidget(selectedWidget.id, { x: clampNumber(value, 0, currentUiScreen.width) })} />
                          <NumberField label="Y" value={selectedWidget.y} onChange={value => updateUiWidget(selectedWidget.id, { y: clampNumber(value, 0, currentUiScreen.height) })} />
                          <NumberField label="宽" value={selectedWidget.width} onChange={value => updateUiWidget(selectedWidget.id, { width: clampNumber(value, 8, currentUiScreen.width) })} />
                          <NumberField label="高" value={selectedWidget.height} onChange={value => updateUiWidget(selectedWidget.id, { height: clampNumber(value, 8, currentUiScreen.height) })} />
                        </div>
                        <Field label="贴图引用" value={selectedWidget.texture || ''} onChange={value => updateUiWidget(selectedWidget.id, { texture: value })} placeholder="例如 textures/gui/panel.png 或资源名" />
                        <Field label="动作" value={selectedWidget.action || ''} onChange={value => updateUiWidget(selectedWidget.id, { action: value })} placeholder="例如 close / run_function:modid:path" />
                        <div className="button-row">
                          <button onClick={() => deleteUiWidget(selectedWidget.id)} disabled={Boolean(busy)}>删除控件</button>
                        </div>
                      </div>
                    )}
                    <details className="advanced-block">
                      <summary>高级：界面模型 JSON</summary>
                      <pre className="data-preview compact">{pretty(currentUiScreen)}</pre>
                    </details>
                  </>
                )}
              </Panel>
            </section>
          )}

          {activeView === 'forge' && (
            <section className="view-grid two">
              <Panel title="工程输出">
                <button onClick={() => generateProject()} disabled={!project || Boolean(busy)}>生成工程</button>
                <button onClick={buildProjectJar} disabled={!project || Boolean(busy)}>构建 jar</button>
                <button onClick={exportProjectZip} disabled={!project || Boolean(busy)}>导出项目 zip</button>
                <button onClick={() => openPath(`${projectDir}\\generated\\${projectGeneratedRoot(project)}`)} disabled={!project || Boolean(busy)}>打开工程目录</button>
                <button onClick={() => openPath(`${projectDir}\\exports`)} disabled={!project || Boolean(busy)}>打开导出目录</button>
                <pre className="data-preview">{project ? `${projectDir}\\generated\\${projectGeneratedRoot(project)}\n${projectDir}\\generated\\${projectGeneratedRoot(project)}\\BLOCKFORGE_DEPLOY_COMMANDS.md\n${projectDir}\\generated\\${projectGeneratedRoot(project)}\\blockforge-setup-env.ps1\n${projectDir}\\generated\\${projectGeneratedRoot(project)}\\blockforge-check-env.ps1\n${projectDir}\\generated\\${projectGeneratedRoot(project)}\\blockforge-deploy-local.ps1\n${projectDir}\\exports` : '未打开项目。'}</pre>
              </Panel>
              <Panel title="代码预览">
                <pre className="data-preview">{codePreview || '这里会显示生成的工程预览或节点图代码预览。'}</pre>
              </Panel>
            </section>
          )}

          {activeView === 'ai' && (
            <section className="view-grid two">
              <Panel title="AI 服务商">
                <div className="button-row wrap">
                  <button onClick={() => applyAiPreset(ollamaPreset)}>使用 Ollama 本地免费模型</button>
                  <button onClick={() => applyAiPreset(lmStudioPreset)}>使用 LM Studio 本地模型</button>
                  <button onClick={() => applyAiPreset(mimoPreset)}>使用 MIMO 预设</button>
                  <button onClick={() => applyAiPreset(deepSeekPreset)}>使用 DeepSeek 在线接口</button>
                </div>
                <Field label="服务商" value={aiConfig.provider} onChange={value => setAiConfig({ ...aiConfig, provider: value })} />
                <Field label="接口地址" value={aiConfig.apiBaseUrl} onChange={value => setAiConfig({ ...aiConfig, apiBaseUrl: value })} />
                <Field label="模型" value={aiConfig.model} onChange={value => setAiConfig({ ...aiConfig, model: value })} />
                {aiAvailableModels.length > 0 && (
                  <>
                    <label>检测到的模型</label>
                    <select value={aiConfig.model} onChange={event => setAiConfig({ ...aiConfig, model: event.target.value })}>
                      {aiAvailableModels.map(model => <option key={model} value={model}>{model}</option>)}
                    </select>
                  </>
                )}
                <label>API 密钥</label>
                <input type="password" value={aiConfig.apiKey} placeholder={providerNeedsApiKey(aiConfig) ? '在线服务通常需要 API Key' : '本地模型通常可留空'} onChange={event => setAiConfig({ ...aiConfig, apiKey: event.target.value })} />
                <div className="button-row wrap">
                  <button onClick={saveAiConfig} disabled={!canUseBridge || Boolean(busy)}>保存本机配置</button>
                  <button onClick={testAi} disabled={!canUseBridge || (providerNeedsApiKey(aiConfig) && !aiConfig.apiKey) || Boolean(busy)}>测试连接</button>
                  <button onClick={listAiModels} disabled={!canUseBridge || Boolean(busy)}>检测模型</button>
                </div>
                <div className="hint">当前连接：{aiConfig.displayName || aiConfig.provider} / {aiConfig.model} / {aiConfig.apiBaseUrl}</div>
                <div className="setup-snippets">
                  <strong>本地免费模型启动提示</strong>
                  <code>ollama pull qwen2.5-coder:7b</code>
                  <code>ollama serve</code>
                  <span>LM Studio：打开 Local Server，保持 OpenAI-compatible server 运行，再点击“检测模型”。</span>
                  <span>MIMO 预设可以直接改接口地址和模型名，适配你的本地或在线 OpenAI-compatible 服务。</span>
                </div>
              </Panel>
              <Panel title="AI 权限">
                <div className="permission-box">
                  <BooleanField label="允许 AI 对话" value={appSettings.aiPermissions.chat} onChange={value => void updateAppSettings({ aiPermissions: { ...appSettings.aiPermissions, chat: value } })} />
                  <BooleanField label="允许读取项目上下文" value={appSettings.aiPermissions.readProjectContext} onChange={value => void updateAppSettings({ aiPermissions: { ...appSettings.aiPermissions, readProjectContext: value } })} />
                  <BooleanField label="允许生成节点草案" value={appSettings.aiPermissions.logicDraft} onChange={value => void updateAppSettings({ aiPermissions: { ...appSettings.aiPermissions, logicDraft: value } })} />
                  <BooleanField label="允许生成材质草稿" value={appSettings.aiPermissions.textureDraft} onChange={value => void updateAppSettings({ aiPermissions: { ...appSettings.aiPermissions, textureDraft: value } })} />
                  <BooleanField label="允许生成模型草稿" value={appSettings.aiPermissions.modelDraft} onChange={value => void updateAppSettings({ aiPermissions: { ...appSettings.aiPermissions, modelDraft: value } })} />
                  <BooleanField label="允许生成特色方案" value={appSettings.aiPermissions.featureRecipe} onChange={value => void updateAppSettings({ aiPermissions: { ...appSettings.aiPermissions, featureRecipe: value } })} />
                  <BooleanField label="允许生成工程变更计划" value={appSettings.aiPermissions.projectPlan} onChange={value => void updateAppSettings({ aiPermissions: { ...appSettings.aiPermissions, projectPlan: value } })} />
                  <BooleanField label="允许直接应用工程变更计划" value={appSettings.aiPermissions.applyProjectPlan} onChange={value => void updateAppSettings({ aiPermissions: { ...appSettings.aiPermissions, applyProjectPlan: value } })} />
                </div>
                <div className="hint">云端 AI 只在你允许的范围内工作。贴图、模型和特色玩法都会先产出草稿，再由你确认保存。</div>
              </Panel>
              <Panel title="免费 AI 对话">
                <div className="chat-panel">
                  {aiChatMessages.length === 0 && <div className="tree-empty">这里可以直接和本地免费模型聊天，询问模组创意、构建错误、节点逻辑或贴图建议。</div>}
                  {aiChatMessages.map((message, index) => (
                    <div key={`${message.role}_${index}`} className={`chat-message ${message.role}`}>
                      <strong>{message.role === 'user' ? '你' : 'AI'}</strong>
                      <span>{message.content}</span>
                    </div>
                  ))}
                </div>
                <textarea value={aiChatInput} onChange={event => setAiChatInput(event.target.value)} placeholder="输入你想问 AI 的问题..." />
                <div className="button-row wrap">
                  <button onClick={sendAiChat} disabled={!appSettings.aiPermissions.chat || !aiChatInput.trim() || (providerNeedsApiKey(aiConfig) && !aiConfig.apiKey) || Boolean(busy)}>发送对话</button>
                  <button onClick={saveAiChatTranscript} disabled={!project || aiChatMessages.length === 0 || Boolean(busy)}>保存到日志</button>
                  <button onClick={clearAiChat} disabled={Boolean(busy)}>清空对话</button>
                </div>
              </Panel>
              <Panel title="节点草案">
                <textarea value={aiPrompt} onChange={event => setAiPrompt(event.target.value)} />
                <div className="button-row">
                  <button onClick={createAiDraft} disabled={!appSettings.aiPermissions.logicDraft || (providerNeedsApiKey(aiConfig) && !aiConfig.apiKey) || Boolean(busy)}>生成 JSON 草案</button>
                  <button onClick={applyAiDraft} disabled={!project || !aiOutput || Boolean(busy)}>校验并应用到节点图</button>
                </div>
                <div className="hint">AI 只能返回节点草案 JSON。应用前会弹窗确认、转换为节点图并校验，不会直接写入 Java。关闭权限后，这里会直接锁定。</div>
                <pre className="data-preview">{aiOutput || 'AI 节点草案 JSON 会显示在这里。'}</pre>
              </Panel>
              <Panel title="AI 材质草稿">
                <textarea value={aiTexturePrompt} onChange={event => setAiTexturePrompt(event.target.value)} />
                <div className="button-row wrap">
                  <button onClick={createAiTextureDraft} disabled={!appSettings.aiPermissions.textureDraft || (providerNeedsApiKey(aiConfig) && !aiConfig.apiKey) || Boolean(busy)}>生成贴图草稿</button>
                  <button onClick={saveDrawnTexture} disabled={!project || Boolean(busy)}>保存当前贴图</button>
                </div>
                <div className="hint">云端 AI 会返回 16x16 / 32x32 / 64x64 的像素草稿，再铺到当前绘制器。确认后再保存，贴图仍然由你掌控。</div>
                <pre className="data-preview compact">{aiTextureDraft ? previewTextureDraft(aiTextureDraft) : 'AI 贴图草稿会显示在这里。'}</pre>
              </Panel>
              <Panel title="AI 模型草稿">
                <textarea value={aiModelPrompt} onChange={event => setAiModelPrompt(event.target.value)} />
                <div className="button-row wrap">
                  <button onClick={createAiModelDraft} disabled={!appSettings.aiPermissions.modelDraft || (providerNeedsApiKey(aiConfig) && !aiConfig.apiKey) || Boolean(busy)}>生成模型草稿</button>
                  <button onClick={saveModelDraft} disabled={!project || Boolean(busy)}>保存当前模型</button>
                  <button onClick={saveModelEditorDraft} disabled={!project || Boolean(busy)}>保存草稿</button>
                </div>
                <div className="hint">这个入口会输出适合 Blockbench / MCPBlockbench 继续调整的模型 JSON，方便做方块动起来、武器摆动或材质细分。</div>
                <pre className="data-preview compact">{aiModelDraft ? previewModelDraft(aiModelDraft) : 'AI 模型草稿会显示在这里。'}</pre>
              </Panel>
              <Panel title="AI 特色玩法方案">
                <textarea value={aiFeaturePrompt} onChange={event => setAiFeaturePrompt(event.target.value)} />
                <div className="button-row wrap">
                  <button onClick={createAiFeatureRecipe} disabled={!appSettings.aiPermissions.featureRecipe || (providerNeedsApiKey(aiConfig) && !aiConfig.apiKey) || Boolean(busy)}>生成特色方案</button>
                  <button onClick={sendFeatureToLogicPrompt} disabled={!aiFeatureDraft}>写入节点草案</button>
                  <button onClick={sendFeatureToProjectPlanPrompt} disabled={!aiFeatureDraft}>写入工程大改</button>
                </div>
                <div className="hint">这里会把“方块动起来”“更多动画”“材质优化”“更低层的模组制作方法”拆成可执行路线，方便继续走节点图、资源和工程变更计划。</div>
                {aiFeatureDraft && (
                  <details className="advanced-block">
                    <summary>特色方案预览</summary>
                    <pre className="data-preview compact">{pretty(aiFeatureDraft)}</pre>
                  </details>
                )}
              </Panel>
              <Panel title="AI 工程大改">
                <textarea value={aiProjectPrompt} onChange={event => setAiProjectPrompt(event.target.value)} />
                <div className="permission-box">
                  <strong>权限边界</strong>
                  <span>AI 会读取当前项目的编辑文件，返回“变更计划”，不会直接写入。</span>
                  <span>允许修改：blockforge.project.json、editor/、src/custom/。</span>
                  <span>禁止修改：generated、exports、logs、dist、node_modules。</span>
                  <span>应用前自动创建快照，应用后自动刷新项目并运行健康检查。</span>
                </div>
                <div className="button-row wrap">
                  <button onClick={createAiProjectPlan} disabled={!appSettings.aiPermissions.projectPlan || !project || (providerNeedsApiKey(aiConfig) && !aiConfig.apiKey) || Boolean(busy)}>生成工程变更计划</button>
                  <button onClick={applyAiProjectPlan} disabled={!appSettings.aiPermissions.applyProjectPlan || !project || !aiProjectPlan || aiProjectValidation.length > 0 || Boolean(busy)}>确认并应用计划</button>
                </div>
                {aiScannedFiles.length > 0 && <div className="hint">已扫描 {aiScannedFiles.length} 个工程文件；完整列表在下方预览。</div>}
                {aiProjectValidation.length > 0 && (
                  <div className="validation-box">
                    {aiProjectValidation.map(error => <span key={error}>{error}</span>)}
                  </div>
                )}
              </Panel>
              <Panel title="工程变更预览">
                {!aiProjectPlan && <div className="tree-empty">还没有工程变更计划。</div>}
                {aiProjectPlan && (
                  <>
                    <div className="plan-summary">
                      <strong>{aiProjectPlan.title}</strong>
                      <span>风险等级：{aiProjectPlan.riskLevel === 'high' ? '高' : aiProjectPlan.riskLevel === 'medium' ? '中' : '低'}</span>
                      <p>{aiProjectPlan.summary}</p>
                    </div>
                    <div className="list-panel">
                      {aiProjectPlan.files.map(file => (
                        <div className="list-row" key={`${file.action}:${file.path}`}>
                          <div>
                            <strong>{file.action === 'delete' ? '删除' : '写入'}：{file.path}</strong>
                            <span>{file.reason}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <details className="advanced-block">
                      <summary>高级：完整计划 JSON 与扫描文件</summary>
                      <pre className="data-preview compact">{pretty({ plan: aiProjectPlan, scannedFiles: aiScannedFiles })}</pre>
                    </details>
                  </>
                )}
              </Panel>
            </section>
          )}

          {activeView === 'settings' && (
            <section className="view-grid settings-grid">
              <Panel title="工作台说明">
                <div className="list-panel">
                  <div className="list-row">
                    <div>
                      <strong>BlockForge Studio 是一个像 VS Code 一样组织项目、像 MCreator 一样制作模组和插件的桌面工作台。</strong>
                      <span>你可以把它理解成一张强化工作台：左侧是世界资源树，中间是编辑区域，右侧是属性和检查结果，底部保留日志和工程输出。</span>
                    </div>
                  </div>
                  <div className="list-row">
                    <div>
                      <strong>推荐的生存模式流程</strong>
                      <span>先做物品和方块，再绑定材质或 3D 模型；接着用红石逻辑节点连接事件、条件、变量、NBT 和动作；最后生成工程并构建 jar。</span>
                    </div>
                  </div>
                  <div className="list-row">
                    <div>
                      <strong>当前重点能力</strong>
                      <span>Forge / Fabric / Paper、中文属性面板、状态效果/药水/附魔、内置像素绘制器、Blockbench JSON 模型、右键资源管理、变量/NBT 节点、AI 草案校验和构建前快照。</span>
                    </div>
                  </div>
                </div>
                <div className="hint">推荐顺序：工作台 → 方块/物品 → 材质资源 → 红石逻辑 → 工程输出 → 构建/导出。任何生成和 AI 大改动前都会尽量保留快照，方便回退。</div>
              </Panel>
              <Panel title="新手教程">
                <div className="tutorial-list">
                  <TutorialStep
                    number="1"
                    title="创建世界存档"
                    text="在“工作台”页设置项目目录、模组 ID 和 Java 包名。模组 ID 就是 Minecraft 资源命名空间，建议使用小写英文和下划线。"
                    actionLabel="打开工作台"
                    onAction={() => setActiveView('home')}
                  />
                  <TutorialStep
                    number="2"
                    title="放置方块与物品"
                    text="在“方块/物品”页新建物品、方块、状态效果、药水、附魔、配方、战利品表或 mcfunction。常用属性用表单编辑，高级 JSON 默认折叠。"
                    actionLabel="去放置元素"
                    onAction={() => setActiveView('elements')}
                  />
                  <TutorialStep
                    number="3"
                    title="制作材质与模型"
                    text="在“材质资源”页导入 PNG，或用内置像素绘制器制作 16x16、32x32、64x64 贴图；同一页也能导入和编辑 Blockbench JSON 模型。保存后会自动绑定到当前元素。"
                    actionLabel="去做资源包"
                    onAction={() => setActiveView('resources')}
                  />
                  <TutorialStep
                    number="4"
                    title="连接红石逻辑"
                    text="在“红石逻辑”页添加事件、条件、动作、变量和 NBT 节点。先在变量面板创建变量，再右键任意节点参数输入框，或者直接点“插变量”按钮即可插入变量。"
                    actionLabel="去连红石"
                    onAction={() => setActiveView('logic')}
                  />
                  <TutorialStep
                    number="5"
                    title="构建工程 jar"
                    text="在“工程输出”页先生成工程，再构建 jar。构建成功后，jar 会复制到项目 exports 目录，也可以用部署脚本送到对应目录。"
                    actionLabel="去工程输出"
                    onAction={() => setActiveView('forge')}
                  />
                  <TutorialStep
                    number="6"
                    title="让 AI 当制图台助手"
                    text="在“AI 助手”页可以配置 MIMO、Ollama、LM Studio 或其他 OpenAI-compatible 服务。AI 草案不会直接写 Java；应用前会先校验节点图或展示工程变更计划。"
                    actionLabel="打开 AI 助手"
                    onAction={() => setActiveView('ai')}
                  />
                  <TutorialStep
                    number="7"
                    title="安装或编写插件"
                    text="到“插件工坊”里安装内置扩展、导入插件包或生成插件模板。插件可以贡献工作台卡片、AI 提示、元素蓝图和文档链接，用来把 BlockForge 变成更像平台的工具。"
                    actionLabel="打开插件工坊"
                    onAction={() => setActiveView('plugins')}
                  />
                </div>
                <div className="button-row wrap">
                  <button onClick={saveCurrentWork} disabled={!project || Boolean(busy)}>保存当前工作</button>
                  <button onClick={() => generateProject(true)} disabled={!project || Boolean(busy)}>一键生成并构建</button>
                </div>
              </Panel>
              <Panel title="模组兼容">
                <div className="hint">这里记录你要兼容的外部模组。填写模组 ID 后，生成器会把依赖写进 Forge/Fabric 工程文件；坐标填全后还能直接进 Gradle。</div>
                <div className="compat-preset-grid">
                  {compatibilityPresets.map(preset => (
                    <button key={preset.modId} type="button" onClick={() => void addCompatibilityPreset(preset)} disabled={!project || Boolean(busy)}>
                      <strong>{preset.displayName}</strong>
                      <span>{preset.modId} · {preset.side === 'client' ? '客户端' : preset.side === 'server' ? '服务端' : '双端'}</span>
                      <small>{preset.note}</small>
                    </button>
                  ))}
                </div>
                <div className="form-grid compact">
                  <Field label="模组 ID" value={compatModId} onChange={setCompatModId} placeholder="jei" />
                  <Field label="显示名" value={compatDisplayName} onChange={setCompatDisplayName} placeholder="Just Enough Items" />
                  <Field label="版本范围" value={compatVersionRange} onChange={setCompatVersionRange} placeholder="[1.0,)" />
                  <Field label="Gradle 坐标" value={compatGradleCoordinate} onChange={setCompatGradleCoordinate} placeholder="curse.maven:jei-238222:511..." />
                  <div>
                    <label>依赖类型</label>
                    <select value={compatDependencyType} onChange={event => setCompatDependencyType(event.target.value as ModCompatibilityEntry['dependencyType'])}>
                      <option value="required">必须依赖</option>
                      <option value="optional">可选依赖</option>
                      <option value="compileOnly">仅编译期</option>
                      <option value="runtimeOnly">仅运行期</option>
                    </select>
                  </div>
                  <div>
                    <label>加载侧</label>
                    <select value={compatSide} onChange={event => setCompatSide(event.target.value as ModCompatibilityEntry['side'])}>
                      <option value="both">客户端 + 服务端</option>
                      <option value="client">仅客户端</option>
                      <option value="server">仅服务端</option>
                    </select>
                  </div>
                  <Field label="备注" value={compatNote} onChange={setCompatNote} placeholder="例如：需要 JEI 展示配方" />
                </div>
                <div className="button-row">
                  <button onClick={addCompatibilityEntry} disabled={!project || !compatModId.trim() || Boolean(busy)}>添加兼容项</button>
                </div>
                <div className="list-panel">
                  {(project?.compatibility.externalMods || []).length === 0 && <div className="tree-empty">还没有添加外部模组依赖。</div>}
                  {(project?.compatibility.externalMods || []).map(entry => (
                    <div className="list-row" key={entry.modId}>
                      <div>
                        <strong>{entry.displayName || entry.modId}</strong>
                        <span>{entry.modId} · {entry.dependencyType} · {entry.side} · {entry.versionRange}</span>
                        <small>{entry.gradleCoordinate || '未填写坐标'}{entry.note ? ` · ${entry.note}` : ''}</small>
                      </div>
                      <div className="button-row">
                        <button onClick={() => void removeCompatibilityEntry(entry.modId)} disabled={Boolean(busy)}>删除</button>
                      </div>
                    </div>
                  ))}
                </div>
                <Field
                  label="允许的外部命名空间"
                  value={(project?.compatibility.acceptedNamespaces || []).join('\n')}
                  onChange={value => {
                    if (!project) return;
                    void saveCurrentProject({
                      ...project,
                      compatibility: {
                        ...project.compatibility,
                        acceptedNamespaces: value.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean)
                      }
                    });
                  }}
                  hint="填 `jei`、`curios` 之类的命名空间后，配方、掉落表和节点里的外部引用会更容易管理。"
                />
                <BooleanField
                  label="允许外部 Tag"
                  value={project?.compatibility.allowExternalTags !== false}
                  onChange={value => {
                    if (!project) return;
                    void saveCurrentProject({
                      ...project,
                      compatibility: {
                        ...project.compatibility,
                        allowExternalTags: value
                      }
                    });
                  }}
                />
                <div className="hint">如果只是引用别人的方块、物品、标签或配方，直接在 ID 里写 `别的modid:物品名` 就行；这里主要负责“项目知道自己依赖谁”。</div>
              </Panel>
              <Panel title="构建设置">
                <BooleanField
                  label="生成工程后自动构建 jar"
                  value={appSettings.autoBuildAfterGenerate}
                  onChange={value => void updateAppSettings({ autoBuildAfterGenerate: value })}
                />
                <div className="hint">打开后，点击“生成工程”会先重新生成工程，再自动运行构建入口。构建前仍会创建快照，并把完整日志保存到 logs 目录。</div>
                <div className="button-row">
                  <button onClick={() => saveAppSettings()} disabled={!canUseBridge || Boolean(busy)}>保存设置</button>
                  <button onClick={() => generateProject(true)} disabled={!project || Boolean(busy)}>生成工程并自动构建</button>
                </div>
              </Panel>
              <Panel title="界面背景">
                <label>背景颜色</label>
                <input type="color" value={appSettings.backgroundColor} onChange={event => setAppSettings({ ...appSettings, backgroundColor: event.target.value })} />
                <Field label="颜色值" value={appSettings.backgroundColor} onChange={value => setAppSettings({ ...appSettings, backgroundColor: value })} />
                <div className="button-row">
                  <button onClick={() => saveAppSettings()} disabled={!canUseBridge || Boolean(busy)}>保存背景颜色</button>
                  <button onClick={() => updateAppSettings({ backgroundColor: '#ffffff' })} disabled={!canUseBridge || Boolean(busy)}>恢复白色</button>
                </div>
                <div className="hint">默认背景为白色。可以用取色器选择颜色，也可以手动输入十六进制颜色值。</div>
              </Panel>
              <Panel title="界面密度">
                <div className="button-row wrap">
                  <button
                    className={appSettings.uiDensity === 'comfortable' ? 'selected' : ''}
                    onClick={() => void updateAppSettings({ uiDensity: 'comfortable' })}
                    disabled={!canUseBridge || Boolean(busy)}
                  >
                    舒展
                  </button>
                  <button
                    className={appSettings.uiDensity === 'compact' ? 'selected' : ''}
                    onClick={() => void updateAppSettings({ uiDensity: 'compact' })}
                    disabled={!canUseBridge || Boolean(busy)}
                  >
                    紧凑
                  </button>
                </div>
                <div className="hint">舒展模式更适合长时间编辑；紧凑模式会缩小面板、间距和顶部区域，适合同时看更多节点、属性和日志。</div>
              </Panel>
              <Panel title="面板显隐">
                <div className="button-row wrap">
                  <button
                    className={appSettings.panelVisibility.leftSidebar ? 'selected' : ''}
                    onClick={() => void updateAppSettings({ panelVisibility: { ...appSettings.panelVisibility, leftSidebar: !appSettings.panelVisibility.leftSidebar } })}
                    disabled={!canUseBridge || Boolean(busy)}
                  >
                    左侧资源栏
                  </button>
                  <button
                    className={appSettings.panelVisibility.rightSidebar ? 'selected' : ''}
                    onClick={() => void updateAppSettings({ panelVisibility: { ...appSettings.panelVisibility, rightSidebar: !appSettings.panelVisibility.rightSidebar } })}
                    disabled={!canUseBridge || Boolean(busy)}
                  >
                    右侧属性栏
                  </button>
                  <button
                    className={appSettings.panelVisibility.bottomPanel ? 'selected' : ''}
                    onClick={() => void updateAppSettings({ panelVisibility: { ...appSettings.panelVisibility, bottomPanel: !appSettings.panelVisibility.bottomPanel } })}
                    disabled={!canUseBridge || Boolean(busy)}
                  >
                    底部日志栏
                  </button>
                </div>
                <div className="hint">可按当前任务把不需要的面板先收起来；如果你在做节点或贴图，通常会更舒服一些。</div>
              </Panel>
              <Panel title="部署环境">
                <div className="hint">生成工程后会自动写入环境检查、环境安装提示和本地部署脚本。</div>
                <div className="button-row wrap">
                  <button onClick={() => void copyDeploymentCommands()} disabled={!project || Boolean(busy)}>复制部署命令</button>
                  <button onClick={() => openPath(project ? `${projectDir}\\generated\\${projectGeneratedRoot(project)}` : projectDir)} disabled={!project || Boolean(busy)}>打开生成目录</button>
                  <button onClick={() => openPath(project ? `${projectDir}\\exports` : projectDir)} disabled={!project || Boolean(busy)}>打开导出目录</button>
                </div>
                <pre className="data-preview">{deploymentCommandsText(projectDir, project)}</pre>
              </Panel>
              <Panel title="发布前隐私检查">
                <div className="list-panel">
                  <div className="list-row">
                    <div>
                      <strong>本机密钥只存在用户配置目录</strong>
                      <span>AI API Key 会写入 Electron 的 userData 配置，不会写入项目导出包，也不会进入源码提交。</span>
                    </div>
                  </div>
                  <div className="list-row">
                    <div>
                      <strong>项目草稿默认排除</strong>
                      <span>贴图编辑器草稿、模型编辑器草稿、构建日志、快照和 exports 会被 Git 忽略，避免把本地调试数据推到 GitHub。</span>
                    </div>
                  </div>
                  <div className="list-row">
                    <div>
                      <strong>发布前运行扫描</strong>
                      <span>提交前执行 npm run privacy:scan，检查源码中是否出现 API Key、邮箱、本机用户目录或聊天临时文件路径。</span>
                    </div>
                  </div>
                </div>
                <div className="button-row">
                  <button onClick={runPrivacyScan} disabled={!canUseBridge || Boolean(busy)}>运行隐私检查</button>
                </div>
                {privacyResult && (
                  <div className={`privacy-result ${privacyResult.ok ? 'pass' : 'fail'}`}>
                    <strong>{privacyResult.ok ? '检查通过' : '需要处理'}</strong>
                    <span>扫描目录：{privacyResult.rootDir}</span>
                    <span>扫描文件：{privacyResult.scannedFiles} 个；发现：{privacyResult.findings.length} 处</span>
                    {privacyResult.findings.length > 0 && (
                      <pre className="data-preview compact">
                        {privacyResult.findings.slice(0, 20).map(finding => `${finding.type}: ${finding.file}:${finding.line}`).join('\n')}
                        {privacyResult.findings.length > 20 ? '\n...还有更多结果，请查看诊断面板。' : ''}
                      </pre>
                    )}
                  </div>
                )}
                <pre className="data-preview compact">npm run privacy:scan</pre>
              </Panel>
            </section>
          )}

          {activeView === 'plugins' && (
            <section className="view-grid two">
              <Panel title="插件工坊">
                <Field label="插件包路径" value={pluginPath} onChange={setPluginPath} placeholder="留空则打开文件选择器" />
                <Field label="插件模板名" value={pluginStarterName} onChange={setPluginStarterName} />
                <div className="button-row wrap">
                  <button onClick={importPluginPackage} disabled={!project || Boolean(busy)}>导入插件包</button>
                  <button onClick={createPluginStarter} disabled={!project || Boolean(busy)}>生成插件模板</button>
                  <button onClick={refreshPlugins} disabled={!project || Boolean(busy)}>刷新插件</button>
                  <button onClick={() => openPath(`${projectDir}\\editor\\plugins`)} disabled={!project || Boolean(busy)}>打开插件目录</button>
                </div>
                <div className="hint">插件采用声明式 manifest：可以贡献工作台卡片、AI 提示、元素蓝图、外链文档和插件动作。当前版本不执行第三方可执行代码，优先保证安全与可预期性。</div>
                <div className="list-panel">
                  {plugins.length === 0 && <div className="tree-empty">还没有安装插件。</div>}
                  {plugins.map(plugin => (
                    <div className={`plugin-row ${plugin.enabled ? 'enabled' : 'disabled'}`} key={`${plugin.manifest.id}:${plugin.manifest.version}`}>
                      <div>
                        <strong>{plugin.manifest.name}</strong>
                        <span>{plugin.manifest.version}，作者：{plugin.manifest.author}，目标：{plugin.manifest.compatibleLoaders.join(' / ')}</span>
                        <small>{plugin.manifest.description}</small>
                      </div>
                      <div className="button-row wrap">
                        <button onClick={() => void togglePlugin(plugin)}>{plugin.enabled ? '停用' : '启用'}</button>
                        <button onClick={() => void exportPluginPackage(plugin)}>导出</button>
                        <button onClick={() => void removePlugin(plugin)}>移除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="插件市场与贡献">
                <div className="button-row wrap">
                  <button onClick={refreshPlugins} disabled={!project || Boolean(busy)}>同步内置插件</button>
                  {pluginCatalog.map(item => (
                    <button key={item.id} onClick={() => void installBuiltinPlugin(item.id)} disabled={!project || Boolean(busy)}>
                      安装 {item.name}
                    </button>
                  ))}
                </div>
                <div className="list-panel">
                  {pluginCards.length === 0 && <div className="tree-empty">插件卡片会显示在这里。</div>}
                  {pluginCards.map(card => (
                    <div className="list-row" key={`${card.pluginId}:${card.id}`}>
                      <div>
                        <strong>{card.title}</strong>
                        <span>{card.pluginName} · {card.description}</span>
                        <small>{(card.tags || []).join(' / ') || '无标签'}</small>
                      </div>
                      <button onClick={() => void runPluginCard(card)}>执行</button>
                    </div>
                  ))}
                </div>
                <div className="list-panel">
                  {pluginActions.length === 0 && <div className="tree-empty">插件动作会显示在这里。</div>}
                  {pluginActions.map(action => (
                    <div className="list-row" key={`${action.pluginId}:${action.id}`}>
                      <div>
                        <strong>{action.label}</strong>
                        <span>{action.pluginName} · {action.description}</span>
                      </div>
                      <button onClick={() => void runPluginAction(action)}>运行</button>
                    </div>
                  ))}
                </div>
                <div className="list-panel">
                  {pluginPrompts.length === 0 && <div className="tree-empty">插件 AI 提示会显示在这里。</div>}
                  {pluginPrompts.map(prompt => (
                    <div className="list-row" key={`${prompt.pluginId}:${prompt.id}`}>
                      <div>
                        <strong>{prompt.label}</strong>
                        <span>{prompt.pluginName} · {prompt.description || prompt.target}</span>
                        <small>{prompt.prompt}</small>
                      </div>
                      <button onClick={() => setAiPromptByPlugin(prompt.target, prompt.prompt)}>应用到 AI</button>
                    </div>
                  ))}
                </div>
                <div className="list-panel">
                  {pluginBlueprints.length === 0 && <div className="tree-empty">插件元素蓝图会显示在这里。</div>}
                  {pluginBlueprints.map(blueprint => (
                    <div className="list-row" key={`${blueprint.pluginId}:${blueprint.id}`}>
                      <div>
                        <strong>{blueprint.label}</strong>
                        <span>{blueprint.pluginName} · {blueprint.kind}:{blueprint.elementId}</span>
                        <small>{blueprint.description}</small>
                      </div>
                      <button onClick={() => void applyPluginBlueprint(blueprint)}>生成元素</button>
                    </div>
                  ))}
                </div>
                <div className="list-panel">
                  {pluginDocs.length === 0 && <div className="tree-empty">插件文档链接会显示在这里。</div>}
                  {pluginDocs.map(doc => (
                    <div className="list-row" key={`${doc.pluginId}:${doc.id}`}>
                      <div>
                        <strong>{doc.title}</strong>
                        <span>{doc.pluginName}</span>
                        <small>{doc.description || doc.url}</small>
                      </div>
                      <button onClick={() => void api?.system.openExternal({ url: doc.url })}>打开</button>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>
          )}

          {activeView === 'manage' && (
            <section className="view-grid two">
              <Panel title="项目快照">
                <div className="button-row">
                  <button onClick={createManualSnapshot} disabled={!project || Boolean(busy)}>创建快照</button>
                  <button onClick={refreshManagement} disabled={!project || Boolean(busy)}>刷新</button>
                  <button onClick={runProjectHealthCheck} disabled={!project || Boolean(busy)}>项目健康检查</button>
                  <button onClick={() => openPath(`${projectDir}\\editor\\snapshots`)} disabled={!project || Boolean(busy)}>打开文件夹</button>
                </div>
                <div className="list-panel">
                  {snapshots.length === 0 && <div className="tree-empty">还没有快照。</div>}
                  {snapshots.map(snapshot => (
                    <div className="list-row" key={snapshot.id}>
                      <div>
                        <strong>{snapshot.reason}</strong>
                        <span>{snapshot.id}</span>
                      </div>
                      <button onClick={() => restoreSnapshot(snapshot.id)} disabled={Boolean(busy)}>恢复</button>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="模板包">
                <Field label="模板 zip 路径" value={templatePath} onChange={setTemplatePath} placeholder="留空则打开文件选择器" />
                <div className="button-row">
                  <button onClick={importTemplatePackage} disabled={!project || Boolean(busy)}>导入模板</button>
                  <button onClick={refreshManagement} disabled={!project || Boolean(busy)}>刷新</button>
                  <button onClick={() => openPath(`${projectDir}\\editor\\templates`)} disabled={!project || Boolean(busy)}>打开文件夹</button>
                </div>
                <div className="list-panel">
                  {templates.length === 0 && <div className="tree-empty">还没有安装模板包。</div>}
                  {templates.map(template => (
                    <div className="list-row" key={`${template.manifest.id}:${template.manifest.version}`}>
                      <div>
                        <strong>{template.manifest.name}</strong>
                        <span>{template.manifest.version}，作者：{template.manifest.author}</span>
                      </div>
                      <small>{template.manifest.description}</small>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="完成项目列表">
                <div className="button-row">
                  <button onClick={markCurrentProjectCompleted} disabled={!project || Boolean(busy)}>把当前项目标为完成</button>
                  <button onClick={() => saveAppSettings(appSettings, '保存完成项目列表')} disabled={Boolean(busy)}>保存列表</button>
                </div>
                <div className="hint">这个列表保存在本机设置里，适合记录已完成或待打磨的模组项目；可以随时修改名称、状态和备注。</div>
                <div className="list-panel">
                  {appSettings.completedProjects.length === 0 && <div className="tree-empty">还没有完成项目。</div>}
                  {appSettings.completedProjects.map(item => (
                    <div className="completed-project-row" key={item.id}>
                      <Field label="项目名" value={item.name} onChange={value => updateCompletedProject(item.id, { name: value })} />
                      <Field label="模组 ID" value={item.modId} onChange={value => updateCompletedProject(item.id, { modId: value })} />
                      <Field label="项目目录" value={item.projectDir} onChange={value => updateCompletedProject(item.id, { projectDir: value })} />
                      <label>状态</label>
                      <select value={item.status} onChange={event => updateCompletedProject(item.id, { status: event.target.value as CompletedProject['status'] })}>
                        <option value="completed">已完成</option>
                        <option value="polish">继续打磨</option>
                        <option value="archived">已归档</option>
                      </select>
                      <label>备注</label>
                      <textarea value={item.notes} onChange={event => updateCompletedProject(item.id, { notes: event.target.value })} />
                      <div className="completed-project-actions">
                        <button onClick={() => openProject(item.projectDir)} disabled={Boolean(busy)}>打开项目</button>
                        <button onClick={() => openPath(item.projectDir)} disabled={Boolean(busy)}>打开目录</button>
                        <button onClick={() => removeCompletedProject(item.id)} disabled={Boolean(busy)}>移除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>
          )}
        </section>

        {!textureEditorMode && !modelEditorMode && (
        <aside className="rightbar">
          <div className="panel-title">当前上下文</div>
          <label>项目目录</label>
          <input value={projectDir} onChange={event => setProjectDir(event.target.value)} title={projectDir} />
          <button onClick={() => openPath(projectDir)} disabled={!project || Boolean(busy)}>打开项目目录</button>
          <label>当前元素</label>
          <input value={draftElement ? `${draftElement.type}:${draftElement.id}` : '未选择'} readOnly />
          <label>绑定元素</label>
          <input value={textureOwner} onChange={event => setTextureOwner(event.target.value)} />
          <div className="context-summary">
            <strong>{viewLabels[activeView]}</strong>
            <span>{project ? shortPath(projectDir) : '请先创建或打开项目'}</span>
            <span>{draftElement ? `正在编辑：${kindLabels[draftElement.type as ElementKind] || draftElement.type} / ${draftElement.id}` : '未选择元素'}</span>
          </div>
          {!api && <div className="bridge-warning">Electron 桥接不可用。文件系统操作需要在桌面应用中执行。</div>}
        </aside>
        )}
      </main>

      {resourceMenu && (
        <div className="context-menu" style={{ left: resourceMenu.x, top: resourceMenu.y }} onClick={event => event.stopPropagation()}>
          <button onClick={() => copyResourcePath(resourceMenu.resource)}>复制资源路径</button>
          <button onClick={() => duplicateResource(resourceMenu.resource)}>{resourceMenu.resource.type === 'model' ? '复制为新模型' : '复制为新贴图'}</button>
          <button onClick={() => bindResourceToCurrentElement(resourceMenu.resource)}>绑定到当前元素</button>
          <button onClick={() => deleteResourceFromMenu(resourceMenu.resource)}>删除资源文件</button>
        </div>
      )}

      {!textureEditorMode && !modelEditorMode && (
      <footer className="bottom-panel">
        <div className="bottom-tabs">
          {(['logs', 'diagnostics', 'ir', 'code', 'ai'] as BottomId[]).map(tab => (
            <button key={tab} className={bottomTab === tab ? 'active' : ''} onClick={() => setBottomTab(tab)}>
              {bottomLabels[tab]}
            </button>
          ))}
        </div>
        <pre>
          {bottomTab === 'logs' && logs}
          {bottomTab === 'diagnostics' && (diagnostics.length ? formatDiagnostics(diagnostics) : '暂无诊断。')}
          {bottomTab === 'ir' && (irPreview ? pretty(irPreview) : '暂无中间表示预览。')}
          {bottomTab === 'code' && (codePreview || '暂无工程代码预览。')}
          {bottomTab === 'ai' && (aiOutput || '暂无智能助手输出。')}
        </pre>
      </footer>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      {children}
    </div>
  );
}

function TutorialStep({ number, title, text, actionLabel, onAction }: { number: string; title: string; text: string; actionLabel: string; onAction(): void }) {
  return (
    <div className="tutorial-step">
      <div className="tutorial-number">{number}</div>
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      <button onClick={onAction}>{actionLabel}</button>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-bar" aria-label={`完成度 ${clamped}%`}>
      <span style={{ width: `${clamped}%` }} />
    </div>
  );
}

function StatusPill({ status }: { status: DesignModuleStatus }) {
  const labelMap: Record<DesignModuleStatus, string> = {
    done: '已完成',
    active: '进行中',
    todo: '待处理',
    blocked: '需前置'
  };
  return <em className={`status-pill ${status}`}>{labelMap[status]}</em>;
}

function TextureCanvas({
  size,
  pixels,
  drawing,
  pixelScale,
  onStart,
  onMove,
  onPaint
}: {
  size: TextureSize;
  pixels: string[];
  drawing: boolean;
  pixelScale: number;
  onStart(index: number): void;
  onMove(index: number): void;
  onPaint(index: number): void;
}) {
  return (
    <div className="texture-canvas-wrap">
      <div className="texture-canvas" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: `${size * pixelScale}px` }}>
        {pixels.map((pixel, index) => (
          <button
            key={index}
            type="button"
            className={`texture-pixel ${pixel === 'transparent' ? 'transparent' : ''}`}
            style={pixel === 'transparent' ? undefined : { backgroundColor: pixel }}
            onMouseDown={event => {
              event.preventDefault();
              onStart(index);
            }}
            onMouseEnter={() => onMove(index)}
            onClick={() => { if (!drawing) onPaint(index); }}
            title={`${index % size}, ${Math.floor(index / size)} ${pixel}`}
          />
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange(value: string): void; placeholder?: string; hint?: string }) {
  return (
    <>
      <label>{label}</label>
      <input value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
      {hint && <div className="field-hint">{hint}</div>}
    </>
  );
}

function SelectField<TValue extends string>({ label, value, options, onChange }: { label: string; value: string; options: Record<TValue, string>; onChange(value: TValue): void }) {
  return (
    <>
      <label>{label}</label>
      <select value={value} onChange={event => onChange(event.target.value as TValue)}>
        {Object.entries(options).map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel as string}</option>
        ))}
      </select>
    </>
  );
}

function BooleanField({ label, value, onChange }: { label: string; value: boolean; onChange(value: boolean): void }) {
  return (
    <label className="checkbox-row">
      <input type="checkbox" checked={value} onChange={event => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function TreeGroup({ title, items, onPick }: { title: string; items: ElementModel[]; onPick(element: ElementModel): void }) {
  return (
    <div className="tree-group">
      <div className="tree-group-title">{title}</div>
      {items.length === 0 && <div className="tree-empty">空</div>}
      {items.map(item => (
        <button key={`${item.type}:${item.id}`} className="tree-item" onClick={() => onPick(item)}>
          {item.id}
        </button>
      ))}
    </div>
  );
}

function ElementQuickEditor({ element, project, onChange }: { element: ElementModel; project: ProjectModel | null; onChange(element: ElementModel): void }) {
  const update = (patch: Partial<ElementModel>) => onChange({ ...element, ...patch });
  const updateDisplay = (key: 'zh_cn' | 'en_us', value: string) => onChange({
    ...element,
    displayName: { ...element.displayName, [key]: value }
  });
  const updateProp = (key: string, value: unknown) => onChange({
    ...element,
    properties: { ...(element.properties as Record<string, unknown>), [key]: value }
  });
  const props = element.properties as Record<string, unknown>;
  const itemKind = String(props.itemKind ?? 'generic') as ItemKind;
  const isTieredItem = itemKind.startsWith('weapon_') || itemKind.startsWith('tool_') || itemKind === 'magic_wand' || itemKind.startsWith('armor_');
  const isWeaponItem = itemKind === 'weapon_sword' || itemKind === 'weapon_axe' || itemKind === 'weapon_bow' || itemKind === 'weapon_crossbow' || itemKind === 'weapon_shield' || itemKind === 'weapon_pistol' || itemKind === 'weapon_rifle' || itemKind === 'weapon_shotgun' || itemKind === 'weapon_magic_gun' || itemKind === 'weapon_spear' || itemKind === 'weapon_hammer' || itemKind === 'weapon_dagger';
  const isArmorItem = itemKind.startsWith('armor_');
  const isToolItem = itemKind.startsWith('tool_') || itemKind === 'magic_wand';
  const isFoodItem = itemKind === 'food';
  const applyItemKind = (kind: ItemKind) => onChange({
    ...element,
    properties: { ...props, ...itemKindDefaults(kind) }
  });
  const modelValue = String(props.model ?? '');
  const potionEffects = Array.isArray(props.effects) ? props.effects as PotionEffectSpec[] : [];
  const enchantmentSlots = Array.isArray(props.slots) ? props.slots as EnchantmentSlot[] : [];
  const incompatible = Array.isArray(props.incompatibleWith) ? props.incompatibleWith as string[] : [];
  const compatibilityMods = project?.compatibility.externalMods || [];
  const splitMultiValue = (value: string) => value.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean);
  const updatePotionEffect = (index: number, patch: Partial<PotionEffectSpec>) => {
    onChange({
      ...element,
      properties: {
        ...props,
        effects: potionEffects.map((effect, currentIndex) => currentIndex === index ? { ...effect, ...patch } : effect)
      }
    });
  };
  const addPotionEffect = () => {
    onChange({
      ...element,
      properties: {
        ...props,
        effects: [
          ...potionEffects,
          { effect: 'minecraft:speed', duration: 200, amplifier: 0, ambient: false, visible: true, showIcon: true }
        ]
      }
    });
  };
  const removePotionEffect = (index: number) => {
    onChange({
      ...element,
      properties: {
        ...props,
        effects: potionEffects.filter((_, currentIndex) => currentIndex !== index)
      }
    });
  };
  const updateEnchantmentSlots = (value: string) => {
    const validSlots = new Set<EnchantmentSlot>(['mainhand', 'offhand', 'head', 'chest', 'legs', 'feet', 'any']);
    onChange({
      ...element,
      properties: {
        ...props,
        slots: splitMultiValue(value)
          .map(item => item.toLowerCase() as EnchantmentSlot)
          .filter(item => validSlots.has(item))
      }
    });
  };
  const updateIncompatible = (value: string) => {
    onChange({
      ...element,
      properties: {
        ...props,
        incompatibleWith: splitMultiValue(value)
      }
    });
  };
  return (
    <div className="quick-editor">
      <div className="panel-title">属性表单</div>
      <Field label="元素 ID" value={element.id} onChange={value => update({ id: value })} hint="生成到 Minecraft 后会使用这个英文 ID。建议只用小写英文、数字和下划线。" />
      <Field label="中文名" value={element.displayName.zh_cn} onChange={value => updateDisplay('zh_cn', value)} />
      <Field label="英文名" value={element.displayName.en_us} onChange={value => updateDisplay('en_us', value)} />
      <Field label="描述" value={element.description} onChange={value => update({ description: value })} />
      {(element.type === 'item' || element.type === 'tool') && (
        <>
          <SelectField label={element.type === 'tool' ? '工具细分' : '物品细分'} value={itemKind} options={itemKindLabels} onChange={applyItemKind} />
          <div className="button-row mini">
            <button type="button" onClick={() => applyItemKind('weapon_sword')}>剑</button>
            <button type="button" onClick={() => applyItemKind('weapon_axe')}>战斧</button>
            <button type="button" onClick={() => applyItemKind('weapon_bow')}>弓</button>
            <button type="button" onClick={() => applyItemKind('weapon_crossbow')}>弩</button>
            <button type="button" onClick={() => applyItemKind('weapon_pistol')}>手枪</button>
            <button type="button" onClick={() => applyItemKind('weapon_rifle')}>步枪</button>
            <button type="button" onClick={() => applyItemKind('weapon_shotgun')}>霰弹枪</button>
            <button type="button" onClick={() => applyItemKind('weapon_magic_gun')}>魔能枪</button>
            <button type="button" onClick={() => applyItemKind('weapon_spear')}>长枪</button>
            <button type="button" onClick={() => applyItemKind('weapon_hammer')}>战锤</button>
            <button type="button" onClick={() => applyItemKind('weapon_dagger')}>匕首</button>
            <button type="button" onClick={() => applyItemKind('weapon_shield')}>盾</button>
            <button type="button" onClick={() => applyItemKind('tool_pickaxe')}>镐</button>
            <button type="button" onClick={() => applyItemKind('tool_axe')}>斧</button>
            <button type="button" onClick={() => applyItemKind('tool_shovel')}>铲</button>
            <button type="button" onClick={() => applyItemKind('tool_hoe')}>锄</button>
            <button type="button" onClick={() => applyItemKind('armor_helmet')}>头盔</button>
            <button type="button" onClick={() => applyItemKind('armor_chestplate')}>胸甲</button>
            <button type="button" onClick={() => applyItemKind('armor_leggings')}>护腿</button>
            <button type="button" onClick={() => applyItemKind('armor_boots')}>靴子</button>
            <button type="button" onClick={() => applyItemKind('magic_wand')}>法杖</button>
            <button type="button" onClick={() => applyItemKind('food')}>食物</button>
          </div>
          <NumberField label="最大堆叠" value={Number(props.maxStackSize ?? 64)} onChange={value => updateProp('maxStackSize', value)} />
          <SelectField label="稀有度" value={String(props.rarity ?? 'common')} options={itemRarityLabels} onChange={value => updateProp('rarity', value)} />
          <NumberField label="耐久" value={props.durability === undefined ? 0 : Number(props.durability)} onChange={value => updateProp('durability', value || undefined)} />
          {isTieredItem && (
            <>
              <SelectField label="工具/武器等级" value={String(props.tier ?? 'IRON')} options={itemTierLabels} onChange={value => updateProp('tier', value)} />
              <NumberField label="攻击伤害" value={Number(props.attackDamage ?? 4)} onChange={value => updateProp('attackDamage', value)} />
              <NumberField label="攻击速度" value={Number(props.attackSpeed ?? -2.4)} onChange={value => updateProp('attackSpeed', value)} />
            </>
          )}
          {(isWeaponItem || isToolItem) && (
            <>
              <SelectField label="使用动画" value={String(props.useAnimation ?? 'none')} options={itemUseAnimationLabels} onChange={value => updateProp('useAnimation', value)} />
              <NumberField label="使用时长 tick" value={Number(props.useDuration ?? 32)} onChange={value => updateProp('useDuration', value)} />
              <NumberField label="附魔能力" value={Number(props.enchantmentValue ?? 1)} onChange={value => updateProp('enchantmentValue', value)} />
              <BooleanField label="不可维修" value={props.canRepair === false} onChange={value => updateProp('canRepair', !value)} />
              <Field label="弹药物品" value={String(props.ammoItem ?? '')} onChange={value => updateProp('ammoItem', value)} hint="远程枪械可填 minecraft:arrow / minecraft:snowball 等。留空时仅用于预设说明。" />
              <NumberField label="每次消耗弹药" value={Number(props.ammoPerShot ?? 1)} onChange={value => updateProp('ammoPerShot', value)} />
              <NumberField label="弹匣容量" value={Number(props.magazineSize ?? 1)} onChange={value => updateProp('magazineSize', value)} />
              <NumberField label="装填 tick" value={Number(props.reloadTicks ?? 20)} onChange={value => updateProp('reloadTicks', value)} />
              <NumberField label="弹丸伤害" value={Number(props.projectileDamage ?? 2)} onChange={value => updateProp('projectileDamage', value)} />
              <NumberField label="弹丸速度" value={Number(props.projectileSpeed ?? 3)} onChange={value => updateProp('projectileSpeed', value)} step="0.1" />
              <NumberField label="弹丸散布" value={Number(props.projectileSpread ?? 1)} onChange={value => updateProp('projectileSpread', value)} step="0.1" />
              <NumberField label="连发数量" value={Number(props.shotCount ?? 1)} onChange={value => updateProp('shotCount', value)} />
            </>
          )}
          {isArmorItem && (
            <>
              <SelectField label="使用动画" value={String(props.useAnimation ?? 'none')} options={itemUseAnimationLabels} onChange={value => updateProp('useAnimation', value)} />
              <NumberField label="防具附魔能力" value={Number(props.enchantmentValue ?? 9)} onChange={value => updateProp('enchantmentValue', value)} />
              <BooleanField label="不可维修" value={props.canRepair === false} onChange={value => updateProp('canRepair', !value)} />
            </>
          )}
          {isFoodItem && (
            <>
              <NumberField label="饱食度" value={Number(props.foodNutrition ?? 4)} onChange={value => updateProp('foodNutrition', value)} />
              <NumberField label="饱和度" value={Number(props.foodSaturation ?? 0.3)} onChange={value => updateProp('foodSaturation', value)} step="0.1" />
              <BooleanField label="按肉类处理" value={Boolean(props.foodIsMeat)} onChange={value => updateProp('foodIsMeat', value)} />
              <BooleanField label="满饱食也可食用" value={Boolean(props.alwaysEat)} onChange={value => updateProp('alwaysEat', value)} />
            </>
          )}
          <BooleanField label="防火物品" value={Boolean(props.fireResistant)} onChange={value => updateProp('fireResistant', value)} />
          <Field label="创造物品栏" value={String(props.creativeTab ?? '')} onChange={value => updateProp('creativeTab', value)} hint="例如 blockforge_tab、combat、building_blocks。" />
          <Field label="贴图文件名" value={String(props.texture ?? '')} onChange={value => updateProp('texture', value)} hint="不用写 .png，例如 echo_crystal。" />
          <Field label={element.type === 'tool' ? '工具 3D 模型资源' : '物品 3D 模型资源'} value={modelValue} onChange={value => updateProp('model', value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} hint="生成到 models/item/ 目录；留空时使用默认物品或工具模型。" />
          <div className="button-row mini">
            <button type="button" onClick={() => updateProp('model', `${element.id}_model`)}>生成模型名</button>
            <button type="button" onClick={() => updateProp('model', '')}>清空模型</button>
          </div>
          <Field label="右键节点逻辑" value={String(props.rightClickLogic ?? '')} onChange={value => updateProp('rightClickLogic', value)} hint="通常写 item:物品ID 或 tool:工具ID，用于绑定节点图。" />
          <div className="button-row mini">
            <button type="button" onClick={() => updateProp('creativeTab', `${element.namespace}_tab`)}>项目默认物品栏</button>
            <button type="button" onClick={() => updateProp('creativeTab', 'combat')}>战斗分类</button>
            <button type="button" onClick={() => updateProp('creativeTab', 'ingredients')}>材料分类</button>
            <button type="button" onClick={() => updateProp('creativeTab', 'tools_and_utilities')}>工具分类</button>
            <button type="button" onClick={() => updateProp('creativeTab', 'food_and_drinks')}>食物分类</button>
          </div>
        </>
      )}
      {element.type === 'block' && (
        <>
          <NumberField label="硬度" value={Number(props.hardness ?? 3)} onChange={value => updateProp('hardness', value)} />
          <NumberField label="爆炸抗性" value={Number(props.resistance ?? 3)} onChange={value => updateProp('resistance', value)} />
          <NumberField label="亮度" value={Number(props.lightLevel ?? 0)} onChange={value => updateProp('lightLevel', value)} />
          <Field label="声音类型" value={String(props.soundType ?? 'STONE')} onChange={value => updateProp('soundType', value)} />
          <Field label="全方块贴图文件名" value={String(props.textureAll ?? '')} onChange={value => updateProp('textureAll', value)} hint="不用写 .png，六个面会共用这张贴图。" />
          <Field label="3D模型资源" value={modelValue} onChange={value => updateProp('model', value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} hint="生成到 models/block/ 目录；留空时使用默认立方体模型。" />
          <div className="button-row mini">
            <button type="button" onClick={() => updateProp('model', `${element.id}_model`)}>生成模型名</button>
            <button type="button" onClick={() => updateProp('model', '')}>清空模型</button>
          </div>
        </>
      )}
      {element.type === 'mob_effect' && (
        <>
          <SelectField label="效果分类" value={String(props.category ?? 'beneficial')} options={mobEffectCategoryLabels} onChange={value => updateProp('category', value)} />
          <Field label="颜色" value={String(props.color ?? '#7dd3fc')} onChange={value => updateProp('color', value)} />
          <BooleanField label="瞬时效果" value={Boolean(props.instant)} onChange={value => updateProp('instant', value)} />
          <BooleanField label="环境效果" value={Boolean(props.ambient)} onChange={value => updateProp('ambient', value)} />
          <BooleanField label="显示图标" value={Boolean(props.showIcon)} onChange={value => updateProp('showIcon', value)} />
          <BooleanField label="显示粒子" value={Boolean(props.visible)} onChange={value => updateProp('visible', value)} />
          <Field label="说明" value={String(props.description ?? '')} onChange={value => updateProp('description', value)} />
        </>
      )}
      {element.type === 'potion' && (
        <>
          <SelectField label="药水类型" value={String(props.potionKind ?? 'drinkable')} options={potionKindLabels} onChange={value => updateProp('potionKind', value)} />
          <Field label="基础药水" value={String(props.basePotion ?? 'minecraft:awkward')} onChange={value => updateProp('basePotion', value)} hint="例如 minecraft:awkward 或 minecraft:healing。" />
          <Field label="颜色" value={String(props.color ?? '#7dd3fc')} onChange={value => updateProp('color', value)} />
          <label>效果列表</label>
          <div className="nested-list">
            {potionEffects.length === 0 && <div className="tree-empty">暂无效果，点击下方按钮添加。</div>}
            {potionEffects.map((effect, index) => (
              <div className="nested-card" key={`${effect.effect}-${index}`}>
                <Field label="效果" value={effect.effect} onChange={value => updatePotionEffect(index, { effect: value })} />
                <NumberField label="持续 tick" value={Number(effect.duration ?? 200)} onChange={value => updatePotionEffect(index, { duration: value })} />
                <NumberField label="等级" value={Number(effect.amplifier ?? 0)} onChange={value => updatePotionEffect(index, { amplifier: value })} />
                <div className="button-row mini">
                  <button type="button" onClick={() => updatePotionEffect(index, { ambient: !effect.ambient })}>{effect.ambient ? '取消环境效果' : '环境效果'}</button>
                  <button type="button" onClick={() => updatePotionEffect(index, { visible: !effect.visible })}>{effect.visible ? '隐藏粒子' : '显示粒子'}</button>
                  <button type="button" onClick={() => updatePotionEffect(index, { showIcon: !effect.showIcon })}>{effect.showIcon ? '隐藏图标' : '显示图标'}</button>
                  <button type="button" onClick={() => removePotionEffect(index)}>删除</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addPotionEffect}>添加效果</button>
          </div>
        </>
      )}
      {element.type === 'enchantment' && (
        <>
          <SelectField label="稀有度" value={String(props.rarity ?? 'rare')} options={enchantmentRarityLabels} onChange={value => updateProp('rarity', value)} />
          <NumberField label="最高等级" value={Number(props.maxLevel ?? 3)} onChange={value => updateProp('maxLevel', value)} />
          <NumberField label="最低成本" value={Number(props.minCost ?? 1)} onChange={value => updateProp('minCost', value)} />
          <NumberField label="最高成本" value={Number(props.maxCost ?? 25)} onChange={value => updateProp('maxCost', value)} />
          <BooleanField label="宝藏附魔" value={Boolean(props.treasureOnly)} onChange={value => updateProp('treasureOnly', value)} />
          <BooleanField label="诅咒" value={Boolean(props.curse)} onChange={value => updateProp('curse', value)} />
          <BooleanField label="可自然获取" value={Boolean(props.discoverable ?? true)} onChange={value => updateProp('discoverable', value)} />
          <label>适用槽位</label>
          <textarea value={enchantmentSlots.join('\n')} onChange={event => updateEnchantmentSlots(event.target.value)} placeholder={'mainhand\noffhand\nchest'} />
          <div className="hint">可填 mainhand、offhand、head、chest、legs、feet、any，支持多行或逗号分隔。</div>
          <label>不兼容附魔</label>
          <textarea value={incompatible.join('\n')} onChange={event => updateIncompatible(event.target.value)} placeholder={'minecraft:sharpness\nminecraft:smite'} />
          <Field label="说明" value={String(props.description ?? '')} onChange={value => updateProp('description', value)} />
        </>
      )}
      {element.type === 'recipe' && (
        <>
          <SelectField
            label="配方类型"
            value={String(props.recipeType ?? 'shapeless')}
            options={recipeTypeLabels}
            onChange={value => updateProp('recipeType', value)}
          />
          <Field label="分类" value={String(props.category ?? 'misc')} onChange={value => updateProp('category', value)} />
          <Field label="结果物品" value={String(props.result ?? '')} onChange={value => updateProp('result', value)} />
          <NumberField label="数量" value={Number(props.count ?? 1)} onChange={value => updateProp('count', value)} />
          {props.recipeType === 'shaped' && (
            <>
              <label>合成形状</label>
              <textarea
                value={formatRecipePattern(props.pattern)}
                placeholder={'ABA\n C \nABA'}
                onChange={event => updateProp('pattern', parseRecipePattern(event.target.value))}
              />
              <label>材料键值</label>
              <textarea
                value={formatRecipeKey(props.key)}
                placeholder={'A=minecraft:stick\nB=minecraft:snowball\nC=minecraft:diamond'}
                onChange={event => updateProp('key', parseRecipeKey(event.target.value))}
              />
              <div className="hint">有序合成使用多行形状和 A=item 形式的材料映射。</div>
              <div className="button-row mini">
                {(compatibilityMods.slice(0, 6)).map(entry => (
                  <button key={entry.modId} type="button" onClick={() => updateProp('key', { ...(props.key || {}), X: `${entry.modId}:` })}>{entry.displayName || entry.modId}</button>
                ))}
              </div>
            </>
          )}
          {(props.recipeType === 'shapeless' || !props.recipeType) && (
            <>
              <label>材料</label>
              <textarea
                value={Array.isArray(props.ingredients) ? props.ingredients.join('\n') : ''}
                placeholder={'minecraft:stick\nminecraft:snowball'}
                onChange={event => updateProp('ingredients', event.target.value.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean))}
              />
              <div className="hint">无序合成每行一个材料，也可以用逗号分隔。</div>
              <div className="button-row mini">
                {(compatibilityMods.slice(0, 6)).map(entry => (
                  <button key={entry.modId} type="button" onClick={() => updateProp('ingredients', [...(Array.isArray(props.ingredients) ? props.ingredients : []), `${entry.modId}:`])}>{entry.displayName || entry.modId}</button>
                ))}
              </div>
            </>
          )}
          {props.recipeType === 'smelting' && (
            <>
              <Field label="输入物品" value={String(props.input ?? '')} onChange={value => updateProp('input', value)} />
              <NumberField label="经验值" value={Number(props.experience ?? 0)} onChange={value => updateProp('experience', value)} step="0.1" />
              <NumberField label="烧炼时间 tick" value={Number(props.cookingTime ?? 200)} onChange={value => updateProp('cookingTime', value)} />
            </>
          )}
        </>
      )}
      {element.type === 'loot_table' && (
        <>
          <Field label="目标方块" value={String(props.targetBlock ?? '')} onChange={value => updateProp('targetBlock', value)} />
          <Field label="掉落物" value={String(props.drop ?? '')} onChange={value => updateProp('drop', value)} />
          <NumberField label="最小数量" value={Number(props.minCount ?? 1)} onChange={value => updateProp('minCount', value)} />
          <NumberField label="最大数量" value={Number(props.maxCount ?? 1)} onChange={value => updateProp('maxCount', value)} />
          <div className="button-row mini">
            <button type="button" onClick={() => updateProp('drop', `${element.namespace}:${String(props.targetBlock || element.id)}`)}>掉落目标方块</button>
            {compatibilityMods.slice(0, 6).map(entry => (
              <button key={entry.modId} type="button" onClick={() => updateProp('drop', `${entry.modId}:`) }>{entry.displayName || entry.modId}</button>
            ))}
            <button type="button" onClick={() => onChange({ ...element, properties: { ...props, minCount: 1, maxCount: 1 } })}>固定 1 个</button>
            <button type="button" onClick={() => onChange({ ...element, properties: { ...props, minCount: 1, maxCount: 3 } })}>随机 1-3 个</button>
          </div>
        </>
      )}
      {element.type === 'function' && (
        <>
          <label>命令</label>
          <textarea value={String(props.commands ?? '')} onChange={event => updateProp('commands', event.target.value)} />
        </>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange, step = '1' }: { label: string; value: number; onChange(value: number): void; step?: string }) {
  return (
    <>
      <label>{label}</label>
      <input type="number" step={step} value={value} onChange={event => onChange(Number(event.target.value))} />
    </>
  );
}

function LogicEdgesOverlay({ graph }: { graph: LogicGraph }) {
  const byId = new Map(graph.nodes.map(node => [node.nodeId, node]));
  const width = Math.max(900, ...graph.nodes.map(node => node.position.x + 260));
  const height = Math.max(460, ...graph.nodes.map(node => node.position.y + 160));
  return (
    <svg className="logic-edges" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <marker id="logic-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>
      {graph.edges.map(edge => {
        const source = byId.get(edge.source);
        const target = byId.get(edge.target);
        if (!source || !target) return null;
        const x1 = source.position.x + 190;
        const y1 = source.position.y + 43;
        const x2 = target.position.x;
        const y2 = target.position.y + 43;
        const curve = Math.max(80, Math.abs(x2 - x1) * 0.45);
        const path = `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`;
        return <path key={edge.id} d={path} className={`logic-edge ${edge.sourceHandle === 'false_out' ? 'false' : ''}`} markerEnd="url(#logic-arrow)" />;
      })}
    </svg>
  );
}

function LogicNodeInspector({ node, variables, onChange, onCreateVariable, onDelete }: { node: LogicNode; variables: LogicVariable[]; onChange(patch: Partial<LogicNode>): void; onCreateVariable(id: string, current: unknown): boolean; onDelete(): void }) {
  const updateParam = (key: string, value: string) => onChange({
    params: { ...node.params, [key]: coerceParamValue(node.params[key], value) }
  });
  const insertVariable = (key: string, current: unknown) => {
    const variableList = variables.map(variable => `${variable.name} (${variable.id})`).join('\n');
    const input = window.prompt(
      variableList
        ? `输入变量 ID 或变量名。\n\n可用变量：\n${variableList}`
        : '当前还没有变量，先输入一个变量 ID 也可以。',
      variables[0]?.id || ''
    );
    if (!input) return;
    const trimmed = input.trim();
    const matched = variables.find(variable => variable.id === trimmed || variable.name === trimmed);
    if (!matched) {
      const ok = window.confirm(`变量“${trimmed}”还没有创建。\n\n是否现在创建并插入？`);
      if (!ok || !onCreateVariable(trimmed, current)) return;
    }
    updateParam(key, formatVariableReferenceForParam(key, current, matched?.id || trimmed));
  };
  return (
    <div className="node-inspector">
      <div>
        <strong>{node.title}</strong>
        <span>{node.nodeType}</span>
      </div>
      <Field label="节点标题" value={node.title} onChange={value => onChange({ title: value })} />
      <Field label="备注" value={node.comment || ''} onChange={value => onChange({ comment: value })} />
      <div className="node-param-grid">
        {Object.entries(node.params).map(([key, value]) => (
          <label key={key} onContextMenu={event => { event.preventDefault(); insertVariable(key, value); }} title="右键插入变量">
            <span>{key}</span>
            <div className="node-param-row">
              {key === 'variable' ? (
                <select value={String(value || '')} onChange={event => updateParam(key, event.target.value)}>
                  <option value="">选择变量</option>
                  {variables.map(variable => <option key={variable.id} value={variable.id}>{variable.name} ({variable.id})</option>)}
                </select>
              ) : typeof value === 'boolean' ? (
                <select value={String(value)} onChange={event => updateParam(key, event.target.value)}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={String(value ?? '')}
                  onChange={event => updateParam(key, event.target.value)}
                />
              )}
              <button type="button" className="small-action" onClick={() => insertVariable(key, value)} title="插入变量">插变量</button>
            </div>
          </label>
        ))}
        {Object.keys(node.params).length === 0 && <span className="tree-empty">这个节点没有可编辑参数。</span>}
      </div>
      <div className="hint">参数输入框支持右键插入变量，也可以直接点“插变量”按钮；数字、布尔和文本参数会自动转成可识别的变量引用。</div>
      <button onClick={onDelete}>删除节点</button>
    </div>
  );
}

function LogicNodeCard({ node, selected, onSelect }: { node: LogicNode; selected?: boolean; onSelect(): void }) {
  return (
    <button className={`logic-node ${selected ? 'selected' : ''}`} style={{ left: node.position.x, top: node.position.y }} onClick={onSelect}>
      <strong>{node.title}</strong>
      <span>{node.nodeType}</span>
      <small>in {node.inputs.length} / out {node.outputs.length}</small>
    </button>
  );
}
