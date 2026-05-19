import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { type InstalledPlugin, type BlockForgePluginManifest, type PluginAction, type PluginAiPrompt, type PluginElementBlueprint, type PluginWorkbenchCard, type PluginDocLink, type PluginCompatibilityPreset } from '../../shared/types/plugins';
import { readProject, writeProject } from '../project/projectService';

const PLUGIN_SCHEMA_VERSION = '0.1.0';
const BLOCKFORGE_VERSION = '0.1.0';

function pluginsDir(projectDir: string): string {
  return path.join(projectDir, 'editor/plugins');
}

function pluginPackageDir(projectDir: string, safeName: string): string {
  return path.join(pluginsDir(projectDir), safeName);
}

function safePackageName(manifest: BlockForgePluginManifest): string {
  return `${manifest.id}-${manifest.version}`.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function validateId(id: string): string {
  const value = id.trim();
  if (!/^[a-z0-9_.-]+$/.test(value)) throw new Error('插件 id 只能包含小写字母、数字、下划线、点和短横线。');
  return value;
}

function validateUrl(url: string): void {
  const value = url.trim();
  if (!/^https?:\/\//i.test(value)) throw new Error('插件文档链接必须是 http 或 https 地址。');
}

function validateArrayOfStrings(values: unknown, label: string): string[] {
  if (!Array.isArray(values)) throw new Error(`${label} 必须是字符串数组。`);
  return values.map(item => String(item).trim()).filter(Boolean);
}

function validatePromptTarget(value: unknown): PluginAiPrompt['target'] {
  const text = String(value || '').trim();
  if (text === 'logic' || text === 'texture' || text === 'model' || text === 'feature' || text === 'project') return text;
  return 'chat';
}

function validateBlueprintKind(value: unknown): PluginElementBlueprint['kind'] {
  const text = String(value || '').trim();
  if (text === 'item' || text === 'tool' || text === 'block' || text === 'recipe' || text === 'loot_table' || text === 'function' || text === 'mob_effect' || text === 'potion' || text === 'enchantment' || text === 'structure') return text;
  return 'item';
}

function validateDependencyType(value: unknown): PluginCompatibilityPreset['dependencyType'] {
  const text = String(value || '').trim();
  if (text === 'required' || text === 'optional' || text === 'compileOnly' || text === 'runtimeOnly') return text;
  return 'optional';
}

function validateSide(value: unknown): PluginCompatibilityPreset['side'] {
  const text = String(value || '').trim();
  if (text === 'client' || text === 'server' || text === 'both') return text;
  return 'both';
}

function normalizeCompatibilityPresets(values: unknown): PluginCompatibilityPreset[] {
  if (!Array.isArray(values)) return [];
  return values.map((preset, index) => {
    const value = preset as Partial<PluginCompatibilityPreset>;
    const modId = String(value.modId || '').trim();
    return {
      id: String(value.id || modId || `compat_${index + 1}`).trim(),
      modId,
      displayName: String(value.displayName || modId || 'External Mod').trim(),
      versionRange: String(value.versionRange || '[0,)').trim(),
      dependencyType: validateDependencyType(value.dependencyType),
      side: validateSide(value.side),
      gradleCoordinate: String(value.gradleCoordinate || '').trim(),
      note: String(value.note || '').trim(),
      tags: Array.isArray(value.tags) ? value.tags.map(item => String(item).trim()).filter(Boolean) : []
    };
  }).filter(preset => preset.modId.length > 0);
}

function normalizeContributions(input: Partial<BlockForgePluginManifest['contributes']> | undefined): BlockForgePluginManifest['contributes'] {
  const cards = Array.isArray(input?.cards)
    ? input.cards.map(card => ({
        id: String(card.id || card.title || 'card').trim(),
        title: String(card.title || card.id || '插件卡片'),
        description: String(card.description || ''),
        tone: card.tone === 'grass' || card.tone === 'stone' || card.tone === 'ore' || card.tone === 'redstone' || card.tone === 'plank' ? card.tone : 'stone',
        actionId: card.actionId ? String(card.actionId) : undefined,
        tags: Array.isArray(card.tags) ? card.tags.map(item => String(item).trim()).filter(Boolean) : []
      }))
    : [];

  const aiPrompts = Array.isArray(input?.aiPrompts)
    ? input.aiPrompts.map(prompt => ({
        id: String(prompt.id || prompt.label || 'prompt').trim(),
        label: String(prompt.label || prompt.id || 'AI 提示'),
        target: validatePromptTarget(prompt.target),
        prompt: String(prompt.prompt || ''),
        description: String(prompt.description || '')
      }))
    : [];

  const elementBlueprints = Array.isArray(input?.elementBlueprints)
    ? input.elementBlueprints.map(blueprint => ({
        id: String(blueprint.id || blueprint.label || 'blueprint').trim(),
        label: String(blueprint.label || blueprint.id || '元素蓝图'),
        kind: validateBlueprintKind(blueprint.kind),
        elementId: String(blueprint.elementId || blueprint.id || 'plugin_item').trim(),
        zhName: String(blueprint.zhName || blueprint.label || '插件元素'),
        description: String(blueprint.description || ''),
        properties: (blueprint.properties && typeof blueprint.properties === 'object') ? { ...blueprint.properties } : {}
      }))
    : [];

  const actions = Array.isArray(input?.actions)
    ? input.actions.map(action => ({
        id: String(action.id || action.label || 'action').trim(),
        label: String(action.label || action.id || '插件动作'),
        description: String(action.description || ''),
        kind: action.kind === 'open_view' || action.kind === 'set_ai_prompt' || action.kind === 'create_element_blueprint' || action.kind === 'open_external_doc' ? action.kind : 'open_view',
        targetView: action.targetView,
        promptTarget: validatePromptTarget(action.promptTarget),
        prompt: action.prompt ? String(action.prompt) : undefined,
        blueprint: action.blueprint
          ? {
              id: String(action.blueprint.id || action.blueprint.label || 'blueprint').trim(),
              label: String(action.blueprint.label || action.blueprint.id || '元素蓝图'),
              kind: validateBlueprintKind(action.blueprint.kind),
              elementId: String(action.blueprint.elementId || action.blueprint.id || 'plugin_item').trim(),
              zhName: String(action.blueprint.zhName || action.blueprint.label || '插件元素'),
              description: String(action.blueprint.description || ''),
              properties: (action.blueprint.properties && typeof action.blueprint.properties === 'object') ? { ...action.blueprint.properties } : {}
            }
          : undefined,
        url: action.url ? String(action.url) : undefined
      }))
    : [];

  const docs = Array.isArray(input?.docs)
    ? input.docs.map(doc => ({
        id: String(doc.id || doc.title || 'doc').trim(),
        title: String(doc.title || doc.id || '文档'),
        url: String(doc.url || '').trim(),
        description: String(doc.description || '')
      })).filter(doc => doc.url.length > 0)
    : [];

  const compatibilityPresets = normalizeCompatibilityPresets(input?.compatibilityPresets);

  return { cards, actions, aiPrompts, elementBlueprints, compatibilityPresets, docs };
}

function normalizeManifest(input: BlockForgePluginManifest): BlockForgePluginManifest {
  return {
    ...input,
    kind: 'blockforge.plugin',
    schemaVersion: PLUGIN_SCHEMA_VERSION,
    id: String(input.id || '').trim(),
    name: String(input.name || '').trim(),
    version: String(input.version || '').trim(),
    author: String(input.author || '').trim(),
    description: String(input.description || ''),
    compatibleBlockForge: String(input.compatibleBlockForge || BLOCKFORGE_VERSION),
    compatibleMinecraft: validateArrayOfStrings(input.compatibleMinecraft || ['1.20.1'], 'compatibleMinecraft'),
    compatibleLoaders: validateArrayOfStrings(input.compatibleLoaders || ['forge'], 'compatibleLoaders') as BlockForgePluginManifest['compatibleLoaders'],
    tags: Array.isArray(input.tags) ? input.tags.map(item => String(item).trim()).filter(Boolean) : [],
    safety: 'declarative',
    allowExecutableCode: Boolean(input.allowExecutableCode),
    contributes: normalizeContributions(input.contributes)
  };
}

function validateManifest(manifest: BlockForgePluginManifest): string[] {
  const errors: string[] = [];
  if (manifest.kind !== 'blockforge.plugin') errors.push('manifest.kind 必须是 blockforge.plugin。');
  if (manifest.schemaVersion !== PLUGIN_SCHEMA_VERSION) errors.push(`manifest.schemaVersion 必须是 ${PLUGIN_SCHEMA_VERSION}。`);
  for (const key of ['id', 'name', 'version', 'author', 'description', 'compatibleBlockForge'] as const) {
    if (!String(manifest[key] || '').trim()) errors.push(`manifest.${key} 为必填项。`);
  }
  try { validateId(manifest.id); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  if (manifest.allowExecutableCode) errors.push('当前版本只允许声明式插件，不允许可执行代码。');
  if (manifest.safety !== 'declarative') errors.push('当前版本只接受 declarative 安全模式。');
  const minecraft = validateArrayOfStrings(manifest.compatibleMinecraft, 'compatibleMinecraft');
  const loaders = validateArrayOfStrings(manifest.compatibleLoaders, 'compatibleLoaders');
  if (minecraft.length === 0) errors.push('manifest.compatibleMinecraft 至少需要一个版本。');
  if (loaders.length === 0) errors.push('manifest.compatibleLoaders 至少需要一个加载器。');
  for (const loader of loaders) {
    if (loader !== 'forge' && loader !== 'fabric' && loader !== 'paper') {
      errors.push(`不支持的加载器：${loader}`);
    }
  }
  if (!Array.isArray(manifest.tags)) errors.push('manifest.tags 必须是数组。');
  const contributions = manifest.contributes || {};
  for (const card of contributions.cards || []) {
    if (!String(card.id || '').trim()) errors.push('插件卡片缺少 id。');
    if (!String(card.title || '').trim()) errors.push(`插件卡片 ${card.id || ''} 缺少标题。`);
  }
  for (const action of contributions.actions || []) {
    if (!String(action.id || '').trim()) errors.push('插件动作缺少 id。');
    if (!String(action.label || '').trim()) errors.push(`插件动作 ${action.id || ''} 缺少名称。`);
    if (action.kind === 'open_external_doc') {
      try { validateUrl(String(action.url || '')); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    }
  }
  for (const doc of contributions.docs || []) {
    try { validateUrl(doc.url); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  }
  for (const preset of contributions.compatibilityPresets || []) {
    if (!String(preset.id || '').trim()) errors.push('兼容预设缺少 id。');
    if (!String(preset.modId || '').trim()) errors.push(`兼容预设 ${preset.id || ''} 缺少 modId。`);
    try { validateId(String(preset.modId || '')); } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  }
  return errors;
}

async function readManifestFromZip(zipFile: string): Promise<BlockForgePluginManifest> {
  const zip = await JSZip.loadAsync(await fs.readFile(zipFile));
  const manifestEntry = zip.file('manifest.json') || zip.file('plugin.manifest.json');
  if (!manifestEntry) throw new Error('插件包缺少 manifest.json。');
  return JSON.parse(await manifestEntry.async('string')) as BlockForgePluginManifest;
}

async function writeManifest(dir: string, manifest: BlockForgePluginManifest): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

async function writeInstalled(dir: string, installed: InstalledPlugin): Promise<void> {
  await fs.writeFile(path.join(dir, 'installed.json'), JSON.stringify(installed, null, 2), 'utf8');
}

async function applyCompatibilityPresets(projectDir: string, manifest: BlockForgePluginManifest): Promise<void> {
  const presets = manifest.contributes.compatibilityPresets || [];
  if (presets.length === 0) return;
  const project = await readProject(projectDir);
  const existing = project.compatibility.externalMods || [];
  const byModId = new Map(existing.map(entry => [entry.modId, entry]));
  for (const preset of presets) {
    byModId.set(preset.modId, {
      modId: preset.modId,
      displayName: preset.displayName,
      versionRange: preset.versionRange,
      dependencyType: preset.dependencyType,
      side: preset.side,
      gradleCoordinate: preset.gradleCoordinate,
      note: preset.note
    });
  }
  project.compatibility.externalMods = Array.from(byModId.values());
  project.compatibility.acceptedNamespaces = Array.from(new Set([
    ...(project.compatibility.acceptedNamespaces || []),
    ...presets.map(preset => preset.modId)
  ]));
  project.compatibility.allowExternalTags = project.compatibility.allowExternalTags !== false;
  await writeProject(projectDir, project);
}

export const builtinPluginCatalog: BlockForgePluginManifest[] = [
  {
    kind: 'blockforge.plugin',
    schemaVersion: PLUGIN_SCHEMA_VERSION,
    id: 'create_dlc_studio',
    name: '机械动力 DLC 工作室',
    version: '1.0.0',
    author: 'BlockForge Studio',
    description: '面向 Create / 机械动力附属模组的声明式插件：提供依赖提示、机械方块蓝图、工厂建筑、配方思路、AI 设计提示和教程链接。',
    compatibleBlockForge: BLOCKFORGE_VERSION,
    compatibleMinecraft: ['1.20.1'],
    compatibleLoaders: ['forge'],
    tags: ['create', 'addon', 'kinetics', 'automation', 'forge'],
    safety: 'declarative',
    contributes: {
      compatibilityPresets: [
        {
          id: 'create_forge_required',
          modId: 'create',
          displayName: 'Create / 机械动力',
          versionRange: '[0.5.1,)',
          dependencyType: 'required',
          side: 'both',
          gradleCoordinate: '',
          note: 'Create 附属模组依赖。Gradle 坐标随发行渠道变化较大，确认实际 Maven 坐标后再填写；留空时只写 mods.toml 依赖，不破坏构建。',
          tags: ['kinetics', 'forge']
        }
      ],
      cards: [
        {
          id: 'create_dependency_card',
          title: 'Create 依赖预设',
          description: '提示你在项目设置里加入机械动力依赖，生成 Forge 工程时会写入 mods.toml 和 Gradle 依赖。',
          tone: 'redstone',
          actionId: 'create_dependency_prompt',
          tags: ['依赖', 'Create', 'Forge']
        },
        {
          id: 'kinetic_machine_card',
          title: '机械方块蓝图',
          description: '快速创建一个“扭矩加工机”方块，再继续补贴图、模型、GUI 和事件节点。',
          tone: 'stone',
          actionId: 'kinetic_machine_blueprint',
          tags: ['方块', '机器', 'GUI']
        },
        {
          id: 'cog_material_card',
          title: '齿轮材料链',
          description: '生成齿轮合金材料和后续配方思路，适合做 Create 附属的前置材料。',
          tone: 'ore',
          actionId: 'cog_alloy_blueprint',
          tags: ['材料', '配方']
        },
        {
          id: 'factory_structure_card',
          title: '小型机械工坊',
          description: '生成一座 Create 风格工坊建筑结构，后续可用 /function 一键放置。',
          tone: 'plank',
          actionId: 'factory_structure_blueprint',
          tags: ['建筑', 'mcfunction']
        }
      ],
      actions: [
        {
          id: 'create_dependency_prompt',
          label: '写入 Create 依赖教程',
          description: '把 AI 提示切换到 Create 附属依赖配置，方便你复制到项目设置的兼容模组里。',
          kind: 'set_ai_prompt',
          promptTarget: 'project',
          prompt: '请帮我把当前 BlockForge 项目配置成 Create / 机械动力 Forge 1.20.1 附属模组。需要说明：modId=create，显示名=Create，依赖类型=required，side=both，版本范围建议 [0.5.1,)，Gradle 坐标需要根据实际 Maven 仓库确认；同时提醒不要把 API Key 或私人路径写进项目。'
        },
        {
          id: 'kinetic_machine_blueprint',
          label: '生成扭矩加工机方块',
          description: '创建一个适合继续接 GUI、旋转动画、配方和事件逻辑的机械方块。',
          kind: 'create_element_blueprint',
          blueprint: {
            id: 'kinetic_machine',
            label: '扭矩加工机',
            kind: 'block',
            elementId: 'kinetic_processor',
            zhName: '扭矩加工机',
            description: 'Create 附属机器方块草稿：用于接入旋转动力、物品输入输出、加工配方和动画材质。',
            properties: {
              hardness: 4,
              resistance: 6,
              soundType: 'METAL',
              lightLevel: 2,
              requiresCorrectTool: true,
              textureAll: 'kinetic_processor',
              model: 'kinetic_processor_model'
            }
          }
        },
        {
          id: 'cog_alloy_blueprint',
          label: '生成齿轮合金材料',
          description: '创建一个可作为 Create 扩展配方原料的材料物品。',
          kind: 'create_element_blueprint',
          blueprint: {
            id: 'cog_alloy',
            label: '齿轮合金',
            kind: 'item',
            elementId: 'cog_alloy',
            zhName: '齿轮合金',
            description: '用于机械动力附属配方的中间材料，可继续绑定贴图、配方和战利品来源。',
            properties: {
              itemKind: 'generic',
              maxStackSize: 64,
              rarity: 'uncommon',
              creativeTab: 'ingredients',
              texture: 'cog_alloy'
            }
          }
        },
        {
          id: 'factory_structure_blueprint',
          label: '生成机械工坊建筑',
          description: '创建一个小型机械工坊结构蓝图，生成工程后输出 mcfunction。',
          kind: 'create_element_blueprint',
          blueprint: {
            id: 'factory_structure',
            label: '小型机械工坊',
            kind: 'structure',
            elementId: 'create_workshop',
            zhName: '小型机械工坊',
            description: 'Create 风格的小型机械工坊结构：石砖墙、铜色屋顶、玻璃窗和灯光。',
            properties: {
              structureKind: 'cottage',
              width: 13,
              depth: 11,
              height: 6,
              floorBlock: 'minecraft:stone_bricks',
              wallBlock: 'minecraft:bricks',
              roofBlock: 'minecraft:copper_block',
              accentBlock: 'minecraft:stripped_spruce_log',
              glassBlock: 'minecraft:glass_pane',
              doorBlock: 'minecraft:spruce_door',
              torchBlock: 'minecraft:lantern',
              hollow: true,
              includeInterior: true,
              includeLights: true,
              includeLootChest: true
            }
          }
        }
      ],
      aiPrompts: [
        {
          id: 'create_addon_design',
          label: 'Create 附属玩法设计',
          target: 'feature',
          prompt: '为 Minecraft Forge 1.20.1 的 Create / 机械动力附属模组设计一个可实现功能：包含新机器、输入输出、加工配方、动力需求、动画/材质建议、GUI 草图、节点事件和低层实现路径。不要直接写 Java，先输出 BlockForge 可编辑的元素与节点计划。',
          description: '用于从玩法层面构思机械动力 DLC 内容。'
        },
        {
          id: 'create_texture_style',
          label: 'Create 风格材质',
          target: 'texture',
          prompt: '生成一张 16x16 Minecraft 像素材质草案，风格接近机械动力 Create：铜、安山岩、黄铜、齿轮、铆钉、工业边框，高对比但不要过度写实。',
          description: '用于机器方块、齿轮材料、外壳和工坊装饰。'
        },
        {
          id: 'create_model_style',
          label: 'Create 风格 3D 模型',
          target: 'model',
          prompt: '生成一个可导入 Blockbench 的机械动力风格低面数模型方案：包含齿轮、传动轴、外壳、正面输入口和轻微动画部件，并说明纹理命名。',
          description: '用于 AI 模型草案或 Blockbench 外部编辑。'
        },
        {
          id: 'create_dependency_review',
          label: 'Create 依赖检查',
          target: 'project',
          prompt: '检查当前项目是否适合作为 Create 附属模组：Forge 版本、Minecraft 版本、mods.toml mandatory 依赖、Gradle 坐标、资源命名、命名空间、配方是否引用 create: 命名空间，并列出风险。',
          description: '用于生成前自查。'
        }
      ],
      elementBlueprints: [
        {
          id: 'andesite_casing_recipe',
          label: '安山机壳配方草稿',
          kind: 'recipe',
          elementId: 'andesite_casing_recipe',
          zhName: '安山机壳配方草稿',
          description: '演示如何引用 create: 命名空间或通用标签，后续请按实际 Create 版本调整。',
          properties: {
            recipeType: 'shapeless',
            category: 'misc',
            ingredients: ['minecraft:andesite', '#forge:plates/iron'],
            result: 'create:andesite_casing',
            count: 1
          }
        },
        {
          id: 'steam_whistle_function',
          label: '蒸汽哨声函数',
          kind: 'function',
          elementId: 'steam_whistle',
          zhName: '蒸汽哨声',
          description: '一个用于测试粒子和音效的 mcfunction，可以绑定到按钮或右键事件。',
          properties: {
            commands: 'particle minecraft:campfire_cosy_smoke ~ ~1 ~ 0.3 0.6 0.3 0.02 20\nplaysound minecraft:block.copper.place block @p ~ ~ ~ 0.8 1.1'
          }
        }
      ],
      docs: [
        {
          id: 'create_github',
          title: 'Create GitHub',
          url: 'https://github.com/Creators-of-Create/Create',
          description: '查看机械动力源码、版本和发行说明。'
        },
        {
          id: 'create_wiki',
          title: 'Create Wiki',
          url: 'https://create.fandom.com/wiki/Create_Mod_Wiki',
          description: '查询机械动力方块、配方和玩法概念。'
        },
        {
          id: 'forge_docs',
          title: 'Forge 文档',
          url: 'https://docs.minecraftforge.net/',
          description: '用于核对 Forge 1.20.1 的注册、数据包和依赖写法。'
        }
      ]
    }
  },
  {
    kind: 'blockforge.plugin',
    schemaVersion: PLUGIN_SCHEMA_VERSION,
    id: 'recipe_viewer_bridge',
    name: '配方查看器兼容桥',
    version: '1.0.0',
    author: 'BlockForge Studio',
    description: '面向 JEI / EMI / REI 的配方展示插件：帮助模组作者整理配方、说明文本、标签和查看器兼容注意事项。',
    compatibleBlockForge: BLOCKFORGE_VERSION,
    compatibleMinecraft: ['1.20.1'],
    compatibleLoaders: ['forge', 'fabric'],
    tags: ['jei', 'emi', 'rei', 'recipes', 'compatibility'],
    safety: 'declarative',
    contributes: {
      compatibilityPresets: [
        { id: 'jei_optional', modId: 'jei', displayName: 'Just Enough Items', versionRange: '[15,)', dependencyType: 'optional', side: 'client', gradleCoordinate: '', note: '配方查看器兼容。Forge 坐标请按 JEI 官方发行页填写；留空时只作为 mods.toml 可选依赖。', tags: ['recipe-viewer', 'forge'] },
        { id: 'emi_optional', modId: 'emi', displayName: 'EMI', versionRange: '[1,)', dependencyType: 'optional', side: 'client', gradleCoordinate: '', note: 'EMI 配方查看器兼容占位。', tags: ['recipe-viewer'] }
      ],
      cards: [
        { id: 'recipe_doc_card', title: '配方说明面板', description: '为机器配方生成玩家能看懂的说明、输入输出、耗时和条件。', tone: 'grass', actionId: 'recipe_doc_prompt', tags: ['教程', '配方'] },
        { id: 'tag_recipe_card', title: '标签配方模板', description: '快速生成 #forge/#c 这类标签材料配方，便于跨模组兼容。', tone: 'ore', actionId: 'tag_recipe_blueprint', tags: ['标签', '兼容'] }
      ],
      actions: [
        {
          id: 'recipe_doc_prompt',
          label: '生成配方查看器说明',
          description: '让 AI 整理当前配方在 JEI/EMI/REI 中应该如何展示。',
          kind: 'set_ai_prompt',
          promptTarget: 'feature',
          prompt: '请为当前 BlockForge 项目整理配方查看器兼容方案：列出每个自定义配方的输入、输出、耗时、经验、标签材料、说明文本、JEI/EMI/REI 展示风险和需要补充的本地化键。'
        },
        {
          id: 'tag_recipe_blueprint',
          label: '生成标签配方',
          description: '创建一个使用通用标签的无序合成配方。',
          kind: 'create_element_blueprint',
          blueprint: {
            id: 'tag_recipe',
            label: '标签兼容配方',
            kind: 'recipe',
            elementId: 'tagged_component_recipe',
            zhName: '标签兼容配方',
            description: '使用通用标签作为材料，减少和其它模组的冲突。',
            properties: {
              recipeType: 'shapeless',
              category: 'misc',
              ingredients: ['#forge:ingots/iron', '#forge:dusts/redstone'],
              result: 'minecraft:comparator',
              count: 1
            }
          }
        }
      ],
      aiPrompts: [
        { id: 'recipe_cleanup', label: '配方清理', target: 'project', prompt: '检查当前 BlockForge 项目的所有配方：是否使用了合适标签、结果 ID 是否存在、数量是否合理、是否适合在 JEI/EMI 中展示，并输出修正清单。', description: '用于发布前整理配方。' }
      ],
      docs: [
        { id: 'jei', title: 'JEI GitHub', url: 'https://github.com/mezz/JustEnoughItems', description: 'JEI 源码与发行信息。' },
        { id: 'emi', title: 'EMI GitHub', url: 'https://github.com/emilyploszaj/emi', description: 'EMI 源码与发行信息。' }
      ]
    }
  },
  {
    kind: 'blockforge.plugin',
    schemaVersion: PLUGIN_SCHEMA_VERSION,
    id: 'curios_trinkets_workshop',
    name: '饰品槽与装备扩展工坊',
    version: '1.0.0',
    author: 'BlockForge Studio',
    description: '面向 Curios / Trinkets 的饰品、护符、戒指和被动效果附属内容，适合做装备扩展 DLC。',
    compatibleBlockForge: BLOCKFORGE_VERSION,
    compatibleMinecraft: ['1.20.1'],
    compatibleLoaders: ['forge', 'fabric'],
    tags: ['curios', 'trinkets', 'equipment', 'magic'],
    safety: 'declarative',
    contributes: {
      compatibilityPresets: [
        { id: 'curios_optional', modId: 'curios', displayName: 'Curios API', versionRange: '[5,)', dependencyType: 'optional', side: 'both', gradleCoordinate: '', note: 'Forge 饰品槽兼容占位。具体坐标请按 Curios 发行页填写。', tags: ['equipment', 'forge'] },
        { id: 'trinkets_optional', modId: 'trinkets', displayName: 'Trinkets', versionRange: '[3,)', dependencyType: 'optional', side: 'both', gradleCoordinate: '', note: 'Fabric 饰品槽兼容占位。', tags: ['equipment', 'fabric'] }
      ],
      cards: [
        { id: 'ring_card', title: '戒指/护符蓝图', description: '生成一个可继续绑定被动效果和 NBT 的饰品物品。', tone: 'ore', actionId: 'ring_blueprint', tags: ['饰品', 'NBT'] },
        { id: 'passive_logic_card', title: '被动效果节点提示', description: '生成“装备后周期触发”的节点逻辑草案提示。', tone: 'redstone', actionId: 'passive_logic_prompt', tags: ['节点', '事件'] }
      ],
      actions: [
        {
          id: 'ring_blueprint',
          label: '生成护符物品',
          description: '创建一个饰品类物品草稿。',
          kind: 'create_element_blueprint',
          blueprint: {
            id: 'amulet_item',
            label: '护符物品',
            kind: 'item',
            elementId: 'clockwork_amulet',
            zhName: '发条护符',
            description: '饰品/护符草稿：适合绑定 Curios/Trinkets 插槽、NBT 充能和周期事件。',
            properties: { itemKind: 'generic', maxStackSize: 1, rarity: 'rare', durability: 256, texture: 'clockwork_amulet', creativeTab: 'combat' }
          }
        },
        {
          id: 'passive_logic_prompt',
          label: '生成被动饰品逻辑提示',
          description: '让 AI 设计装备时持续生效的节点图。',
          kind: 'set_ai_prompt',
          promptTarget: 'logic',
          prompt: '为一个 Curios/Trinkets 饰品设计 BlockForge 节点图草案：装备时每 40 tick 检查 NBT 能量，如果能量大于 0 就给玩家速度或抗性效果，并扣除能量。只输出 logic_graph_draft JSON。'
        }
      ],
      aiPrompts: [
        { id: 'trinket_design', label: '饰品玩法设计', target: 'feature', prompt: '设计一个 Minecraft 饰品扩展玩法：插槽、被动效果、NBT 能量、冷却、合成配方、贴图风格和事件节点。', description: '适合做装备 DLC。' }
      ]
    }
  },
  {
    kind: 'blockforge.plugin',
    schemaVersion: PLUGIN_SCHEMA_VERSION,
    id: 'farmers_delight_kitchen',
    name: '农夫乐事厨房扩展',
    version: '1.0.0',
    author: 'BlockForge Studio',
    description: '面向 Farmer’s Delight 的食物、锅具、作物和厨房配方扩展，适合制作生活向 DLC。',
    compatibleBlockForge: BLOCKFORGE_VERSION,
    compatibleMinecraft: ['1.20.1'],
    compatibleLoaders: ['forge'],
    tags: ['farmersdelight', 'food', 'cooking', 'crops'],
    safety: 'declarative',
    contributes: {
      compatibilityPresets: [
        { id: 'farmersdelight_optional', modId: 'farmersdelight', displayName: "Farmer's Delight", versionRange: '[1.2,)', dependencyType: 'optional', side: 'both', gradleCoordinate: '', note: '农夫乐事兼容占位。具体坐标请按发行渠道填写。', tags: ['food', 'forge'] }
      ],
      cards: [
        { id: 'food_card', title: '特色食物蓝图', description: '创建一个带饱食度、稀有度和材质提示的新食物。', tone: 'grass', actionId: 'food_blueprint', tags: ['食物'] },
        { id: 'crop_card', title: '作物线提示', description: '让 AI 规划从作物、掉落、配方到食物效果的整条内容线。', tone: 'plank', actionId: 'crop_line_prompt', tags: ['作物', '配方'] }
      ],
      actions: [
        {
          id: 'food_blueprint',
          label: '生成特色食物',
          description: '创建一个可继续加入药水效果和配方的食物物品。',
          kind: 'create_element_blueprint',
          blueprint: {
            id: 'special_food',
            label: '特色食物',
            kind: 'item',
            elementId: 'gearberry_pie',
            zhName: '齿轮莓派',
            description: '生活向附属食物草稿：可继续绑定配方、药水效果和贴图。',
            properties: { itemKind: 'food', maxStackSize: 16, rarity: 'uncommon', foodNutrition: 8, foodSaturation: 0.8, alwaysEat: false, texture: 'gearberry_pie', creativeTab: 'food_and_drinks' }
          }
        },
        {
          id: 'crop_line_prompt',
          label: '规划作物料理线',
          description: '让 AI 生成作物、配方、掉落和效果路线。',
          kind: 'set_ai_prompt',
          promptTarget: 'feature',
          prompt: '为 Farmer’s Delight 风格附属模组设计一条完整料理线：新作物、种子来源、掉落表、食物、锅具/切菜板配方、药水效果、本地化和贴图建议。'
        }
      ],
      aiPrompts: [
        { id: 'food_texture', label: '食物材质提示', target: 'texture', prompt: '生成一张 16x16 Minecraft 食物贴图：温暖、清晰、适合 Farmer’s Delight 风格，边缘有像素高光。', description: '用于食物贴图。' }
      ],
      docs: [
        { id: 'farmersdelight', title: "Farmer's Delight GitHub", url: 'https://github.com/vectorwing/FarmersDelight', description: '农夫乐事源码与发行信息。' }
      ]
    }
  },
  {
    kind: 'blockforge.plugin',
    schemaVersion: PLUGIN_SCHEMA_VERSION,
    id: 'magic_tech_expansion',
    name: '魔法科技扩展包',
    version: '1.0.0',
    author: 'BlockForge Studio',
    description: '为 Botania、Thermal 等常见生态准备的魔法/科技附属创作包，强调材料线、机器线、法术线和跨模组标签。',
    compatibleBlockForge: BLOCKFORGE_VERSION,
    compatibleMinecraft: ['1.20.1'],
    compatibleLoaders: ['forge'],
    tags: ['botania', 'thermal', 'magic', 'technology'],
    safety: 'declarative',
    contributes: {
      compatibilityPresets: [
        { id: 'botania_optional', modId: 'botania', displayName: 'Botania', versionRange: '[1.20,)', dependencyType: 'optional', side: 'both', gradleCoordinate: '', note: '植物魔法兼容占位。', tags: ['magic'] },
        { id: 'thermal_optional', modId: 'thermal', displayName: 'Thermal Series', versionRange: '[11,)', dependencyType: 'optional', side: 'both', gradleCoordinate: '', note: 'Thermal 系列兼容占位。', tags: ['technology'] }
      ],
      cards: [
        { id: 'mana_material_card', title: '魔力材料', description: '生成魔力水晶/粉尘类材料草稿。', tone: 'ore', actionId: 'mana_material_blueprint', tags: ['魔法', '材料'] },
        { id: 'thermal_machine_card', title: '热力机器提示', description: '规划输入、输出、能量、耗时和升级件。', tone: 'redstone', actionId: 'thermal_machine_prompt', tags: ['科技', '机器'] }
      ],
      actions: [
        {
          id: 'mana_material_blueprint',
          label: '生成魔力材料',
          description: '创建一个魔法材料物品。',
          kind: 'create_element_blueprint',
          blueprint: {
            id: 'mana_material',
            label: '魔力材料',
            kind: 'item',
            elementId: 'mana_infused_gear',
            zhName: '魔力灌注齿轮',
            description: '适合同时连接 Botania 魔力线与机械/科技线的中间材料。',
            properties: { itemKind: 'generic', maxStackSize: 64, rarity: 'rare', texture: 'mana_infused_gear', creativeTab: 'ingredients' }
          }
        },
        {
          id: 'thermal_machine_prompt',
          label: '规划热力机器',
          description: '让 AI 设计一个 Thermal 风格机器玩法。',
          kind: 'set_ai_prompt',
          promptTarget: 'feature',
          prompt: '设计一个 Thermal 风格的机器附属功能：能量输入、材料输入、产物输出、耗时、升级槽、GUI、贴图、模型、配方和节点事件。'
        }
      ],
      aiPrompts: [
        { id: 'magic_tech_bridge', label: '魔法科技联动', target: 'feature', prompt: '设计一个把 Botania 魔力材料与 Thermal/Create 机械加工连接起来的附属模组玩法，输出元素清单、配方、节点逻辑和生成步骤。', description: '用于跨模组附属设计。' }
      ]
    }
  },
  {
    kind: 'blockforge.plugin',
    schemaVersion: PLUGIN_SCHEMA_VERSION,
    id: 'world_motion_lab',
    name: '世界动效实验室',
    version: '1.0.0',
    author: 'BlockForge Studio',
    description: '让方块、材质、粒子和事件连起来，做出会呼吸、会闪烁、会触发的内容。',
    compatibleBlockForge: BLOCKFORGE_VERSION,
    compatibleMinecraft: ['1.20.1'],
    compatibleLoaders: ['forge', 'fabric'],
    tags: ['animation', 'materials', 'visual'],
    safety: 'declarative',
    contributes: {
      cards: [
        { id: 'breathing_ore', title: '会呼吸的矿石', description: '快速生成一个带发光/粒子想法的矿石蓝图。', tone: 'ore', actionId: 'ore_blueprint' },
        { id: 'toolsmith_card', title: '霜铸工具', description: '直接产出一个可以继续细化的工具蓝图。', tone: 'stone', actionId: 'tool_blueprint' },
        { id: 'motion_texture', title: '动态材质提示', description: '把静态贴图变成有节奏的纹理方案。', tone: 'grass', actionId: 'motion_texture_prompt' }
      ],
      actions: [
        {
          id: 'ore_blueprint',
          label: '生成矿石蓝图',
          description: '创建一个偏向发光与粒子的方块蓝图。',
          kind: 'create_element_blueprint',
          blueprint: { id: 'ore_blueprint', label: '会呼吸的矿石', kind: 'block', elementId: 'breathing_ore', zhName: '会呼吸的矿石', description: '一个会发光、会冒粒子的矿石想法。', properties: { lightLevel: 11, hardness: 3, resistance: 4, soundType: 'STONE' } }
        },
        {
          id: 'tool_blueprint',
          label: '生成工具蓝图',
          description: '创建一个偏向武器/工具细分的工具蓝图。',
          kind: 'create_element_blueprint',
          blueprint: { id: 'tool_blueprint', label: '霜铸工具', kind: 'tool', elementId: 'frost_tool', zhName: '霜铸工具', description: '一把可继续细化攻击、速度和耐久的工具想法。', properties: { itemKind: 'tool_pickaxe', maxStackSize: 1, durability: 250, tier: 'IRON', attackDamage: 3, attackSpeed: -2.8 } }
        },
        {
          id: 'motion_texture_prompt',
          label: '打开材质提示',
          description: '把 AI 材质提示切到动效/材质优化方向。',
          kind: 'set_ai_prompt',
          promptTarget: 'texture',
          prompt: '把这个材质想象成会轻微流动、有高光节奏和 Minecraft 像素颗粒感的资源。'
        }
      ],
      aiPrompts: [
        { id: 'ore_texture', label: '矿石材质草案', target: 'texture', prompt: '生成一张更像 Minecraft 的发光矿石贴图，色块明显，适合 16x16。', description: '适合做资源包 / 模组贴图的快速起点。' }
      ],
      docs: [
        { id: 'guide', title: '插件制作说明', url: 'https://example.com/blockforge/plugins', description: '插件作者可以参考的约定与 manifest 结构。' }
      ]
    }
  },
  {
    kind: 'blockforge.plugin',
    schemaVersion: PLUGIN_SCHEMA_VERSION,
    id: 'server_toolkit',
    name: '服务端插件工具箱',
    version: '1.0.0',
    author: 'BlockForge Studio',
    description: '专门给 Paper / Bukkit / Spigot 的轻量插件作者准备的快捷入口。',
    compatibleBlockForge: BLOCKFORGE_VERSION,
    compatibleMinecraft: ['1.20.1'],
    compatibleLoaders: ['paper'],
    tags: ['server', 'paper', 'commands'],
    safety: 'declarative',
    contributes: {
      cards: [
        { id: 'welcome_card', title: '欢迎指令包', description: '一键进入插件欢迎语和指令模板。', tone: 'stone', actionId: 'welcome_prompt' },
        { id: 'permission_card', title: '权限模块', description: '把常见的权限逻辑先装进脑子里。', tone: 'plank', actionId: 'permission_prompt' }
      ],
      actions: [
        {
          id: 'welcome_prompt',
          label: '打开欢迎指令草稿',
          description: '把 AI 对话提示切换到服务端插件说明。',
          kind: 'set_ai_prompt',
          promptTarget: 'project',
          prompt: '设计一个 Paper 插件欢迎功能：玩家第一次进入时发送欢迎信息，并提供 /blockforge 命令查看状态。'
        },
        {
          id: 'permission_prompt',
          label: '生成权限思路',
          description: '把 AI 提示切换到权限和配置方向。',
          kind: 'set_ai_prompt',
          promptTarget: 'feature',
          prompt: '为 Paper 插件设计一个权限系统、配置文件和命令结构。'
        }
      ],
      aiPrompts: [
        { id: 'paper_event', label: 'Paper 事件草案', target: 'feature', prompt: '生成一个 Paper 插件功能草案：权限、监听器、配置、命令、消息格式化。', description: '适合服务端插件作者。' }
      ]
    }
  },
  {
    kind: 'blockforge.plugin',
    schemaVersion: PLUGIN_SCHEMA_VERSION,
    id: 'fantasy_dimension_kit',
    name: '幻想维度工具箱',
    version: '1.0.0',
    author: 'BlockForge Studio',
    description: '更天马行空一些：雾气、奇异方块、传送门、低频音效和剧情节点。',
    compatibleBlockForge: BLOCKFORGE_VERSION,
    compatibleMinecraft: ['1.20.1'],
    compatibleLoaders: ['forge', 'fabric'],
    tags: ['dimension', 'magic', 'story'],
    safety: 'declarative',
    contributes: {
      cards: [
        { id: 'portal_card', title: '雾门传送门', description: '构想一个会轻微震动和雾化的传送门。', tone: 'redstone', actionId: 'portal_blueprint' },
        { id: 'story_card', title: '剧情节点包', description: '把玩法蓝图朝剧情 / 任务线方向推一点。', tone: 'stone', actionId: 'story_prompt' }
      ],
      actions: [
        {
          id: 'portal_blueprint',
          label: '生成传送门蓝图',
          description: '生成一个带粒子、声音和触发逻辑的元素蓝图。',
          kind: 'create_element_blueprint',
          blueprint: { id: 'portal_gate', label: '雾门传送门', kind: 'block', elementId: 'mist_portal', zhName: '雾门传送门', description: '一扇更像故事节点的传送门。', properties: { lightLevel: 8, hardness: 2, resistance: 6, soundType: 'AMETHYST' } }
        },
        {
          id: 'story_prompt',
          label: '打开剧情提示',
          description: '把 AI 提示切到剧情、任务和低层事件方向。',
          kind: 'set_ai_prompt',
          promptTarget: 'feature',
          prompt: '设计一个偏剧情的 Minecraft 模组特性：任务链、特殊方块、粒子反馈、音效和低层事件联动。'
        }
      ],
      aiPrompts: [
        { id: 'dimension_story', label: '维度剧情方案', target: 'feature', prompt: '围绕一个神秘维度生成特色玩法方案，包括方块、音效、粒子和任务链。', description: '偏世界观和探索。' }
      ]
    }
  }
];

async function readInstalledPlugin(dir: string): Promise<InstalledPlugin | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(dir, 'installed.json'), 'utf8')) as InstalledPlugin;
  } catch {
    try {
      const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8')) as BlockForgePluginManifest;
      return { manifest, installedPath: dir, installedAt: new Date().toISOString(), enabled: true, source: 'folder' };
    } catch {
      return null;
    }
  }
}

export async function listInstalledPlugins(projectDir: string): Promise<InstalledPlugin[]> {
  try {
    const entries = await fs.readdir(pluginsDir(projectDir), { withFileTypes: true });
    const plugins: InstalledPlugin[] = [];
    for (const entry of entries.filter(item => item.isDirectory())) {
      const plugin = await readInstalledPlugin(path.join(pluginsDir(projectDir), entry.name));
      if (plugin) plugins.push(plugin);
    }
    return plugins.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
  } catch {
    return [];
  }
}

export async function readPluginCatalog(): Promise<BlockForgePluginManifest[]> {
  return builtinPluginCatalog;
}

async function addDirectoryToZip(zip: JSZip, dir: string, baseDir: string): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, fullPath, baseDir);
      continue;
    }
    if (entry.name === 'installed.json') continue;
    zip.file(relativePath, await fs.readFile(fullPath));
  }
}

export async function installBuiltinPlugin(projectDir: string, pluginId: string): Promise<InstalledPlugin> {
  const manifest = builtinPluginCatalog.find(item => item.id === pluginId);
  if (!manifest) throw new Error(`未找到内置插件：${pluginId}`);
  const safeName = safePackageName(manifest);
  const dir = pluginPackageDir(projectDir, safeName);
  await fs.mkdir(dir, { recursive: true });
  const installed: InstalledPlugin = {
    manifest,
    installedPath: dir,
    installedAt: new Date().toISOString(),
    enabled: true,
    source: 'builtin'
  };
  await writeManifest(dir, manifest);
  await writeInstalled(dir, installed);
  await applyCompatibilityPresets(projectDir, manifest);
  return installed;
}

export async function importPluginPackage(projectDir: string, sourceFile: string): Promise<InstalledPlugin> {
  const manifest = normalizeManifest(await readManifestFromZip(sourceFile));
  const errors = validateManifest(manifest);
  if (errors.length) throw new Error(errors.join('\n'));
  const safeName = safePackageName(manifest);
  const dir = pluginPackageDir(projectDir, safeName);
  await fs.mkdir(dir, { recursive: true });
  const zipTarget = path.join(dir, `${safeName}.bfplugin.zip`);
  await fs.copyFile(sourceFile, zipTarget);
  await writeManifest(dir, manifest);
  const installed: InstalledPlugin = {
    manifest,
    installedPath: dir,
    installedAt: new Date().toISOString(),
    enabled: true,
    source: 'zip'
  };
  await writeInstalled(dir, installed);
  await applyCompatibilityPresets(projectDir, manifest);
  return installed;
}

export async function exportPluginPackage(projectDir: string, pluginId: string, outputFile?: string): Promise<string> {
  const plugin = (await listInstalledPlugins(projectDir)).find(item => item.manifest.id === pluginId);
  if (!plugin) throw new Error(`未找到插件：${pluginId}`);
  const zip = new JSZip();
  await addDirectoryToZip(zip, plugin.installedPath, plugin.installedPath);
  const target = outputFile && outputFile.trim()
    ? outputFile
    : path.join(projectDir, 'exports', `${safePackageName(plugin.manifest)}.bfplugin.zip`);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const data = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  await fs.writeFile(target, data);
  return target;
}

export async function createPluginStarter(projectDir: string, name = 'my_plugin'): Promise<string> {
  const safeName = validateId(name);
  const dir = path.join(pluginsDir(projectDir), `${safeName}_starter`);
  await fs.mkdir(dir, { recursive: true });
  const manifest: BlockForgePluginManifest = {
    kind: 'blockforge.plugin',
    schemaVersion: PLUGIN_SCHEMA_VERSION,
    id: safeName,
    name: '我的插件',
    version: '1.0.0',
    author: 'you',
    description: '一个可扩展的 BlockForge 声明式插件。',
    compatibleBlockForge: BLOCKFORGE_VERSION,
    compatibleMinecraft: ['1.20.1'],
    compatibleLoaders: ['forge', 'fabric', 'paper'],
    tags: ['starter', 'plugin'],
    safety: 'declarative',
    contributes: {
      cards: [],
      actions: [],
      aiPrompts: [],
      elementBlueprints: [],
      docs: []
    }
  };
  await writeManifest(dir, manifest);
  await fs.writeFile(path.join(dir, 'README.md'), `# BlockForge 插件模板\n\n把这个目录打包成 zip 后即可导入到 BlockForge Studio。\n\n建议文件：\n- manifest.json\n- icon.png\n- docs/\n- assets/\n`, 'utf8');
  await fs.mkdir(path.join(dir, 'examples'), { recursive: true });
  await fs.writeFile(path.join(dir, 'examples', 'manifest.example.json'), JSON.stringify({
    kind: 'blockforge.plugin',
    schemaVersion: PLUGIN_SCHEMA_VERSION,
    id: `${safeName}_demo`,
    name: '示例插件',
    version: '1.0.0',
    author: 'you',
    description: '一个可直接参考的插件示例。',
    compatibleBlockForge: BLOCKFORGE_VERSION,
    compatibleMinecraft: ['1.20.1'],
    compatibleLoaders: ['forge', 'fabric'],
    tags: ['starter', 'example'],
    safety: 'declarative',
    contributes: {
      cards: [
        { id: 'hello_card', title: '你好，BlockForge', description: '打开一个简单的 AI 提示。', tone: 'grass', actionId: 'hello_prompt' }
      ],
      actions: [
        { id: 'hello_prompt', label: '打开提示', description: '把 AI 切到插件作者模式。', kind: 'set_ai_prompt', promptTarget: 'feature', prompt: '帮我设计一个声明式 BlockForge 插件，包含卡片、动作、AI 提示和元素蓝图。' }
      ],
      aiPrompts: [
        { id: 'feature_hint', label: '功能草案', target: 'feature', prompt: '围绕 BlockForge 插件写一个功能草案。', description: '帮助作者起步。' }
      ],
      elementBlueprints: [
        { id: 'tool_hint', label: '工具蓝图', kind: 'tool', elementId: 'demo_tool', zhName: '示例工具', description: '一个工具元素蓝图示例。', properties: { itemKind: 'tool_pickaxe', durability: 250, attackDamage: 2, attackSpeed: -2.8 } }
      ],
      docs: [
        { id: 'guide', title: '作者说明', url: 'https://example.com/blockforge/plugins', description: '替换成你的文档链接。' }
      ]
    }
  }, null, 2), 'utf8');
  return dir;
}

export async function setPluginEnabled(projectDir: string, pluginId: string, enabled: boolean): Promise<InstalledPlugin[]> {
  const plugins = await listInstalledPlugins(projectDir);
  for (const plugin of plugins) {
    if (plugin.manifest.id !== pluginId) continue;
    plugin.enabled = enabled;
    await writeInstalled(plugin.installedPath, plugin);
  }
  return listInstalledPlugins(projectDir);
}

export async function removePluginPackage(projectDir: string, pluginId: string): Promise<InstalledPlugin[]> {
  const plugins = await listInstalledPlugins(projectDir);
  for (const plugin of plugins) {
    if (plugin.manifest.id !== pluginId) continue;
    await fs.rm(plugin.installedPath, { recursive: true, force: true });
  }
  return listInstalledPlugins(projectDir);
}

export function flattenPluginActions(plugins: InstalledPlugin[]): Array<PluginAction & { pluginId: string; pluginName: string }> {
  const actions: Array<PluginAction & { pluginId: string; pluginName: string }> = [];
  for (const plugin of plugins) {
    if (!plugin.enabled) continue;
    for (const action of plugin.manifest.contributes.actions || []) {
      actions.push({ ...action, pluginId: plugin.manifest.id, pluginName: plugin.manifest.name });
    }
  }
  return actions;
}

export function flattenPluginCards(plugins: InstalledPlugin[]): Array<PluginWorkbenchCard & { pluginId: string; pluginName: string }> {
  const cards: Array<PluginWorkbenchCard & { pluginId: string; pluginName: string }> = [];
  for (const plugin of plugins) {
    if (!plugin.enabled) continue;
    for (const card of plugin.manifest.contributes.cards || []) {
      cards.push({ ...card, pluginId: plugin.manifest.id, pluginName: plugin.manifest.name });
    }
  }
  return cards;
}

export function flattenPluginDocs(plugins: InstalledPlugin[]): Array<PluginDocLink & { pluginId: string; pluginName: string }> {
  const docs: Array<PluginDocLink & { pluginId: string; pluginName: string }> = [];
  for (const plugin of plugins) {
    if (!plugin.enabled) continue;
    for (const doc of plugin.manifest.contributes.docs || []) {
      docs.push({ ...doc, pluginId: plugin.manifest.id, pluginName: plugin.manifest.name });
    }
  }
  return docs;
}

export function flattenPluginPrompts(plugins: InstalledPlugin[]): Array<PluginAiPrompt & { pluginId: string; pluginName: string }> {
  const prompts: Array<PluginAiPrompt & { pluginId: string; pluginName: string }> = [];
  for (const plugin of plugins) {
    if (!plugin.enabled) continue;
    for (const prompt of plugin.manifest.contributes.aiPrompts || []) {
      prompts.push({ ...prompt, pluginId: plugin.manifest.id, pluginName: plugin.manifest.name });
    }
  }
  return prompts;
}
