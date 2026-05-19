import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { type InstalledPlugin, type BlockForgePluginManifest, type PluginAction, type PluginAiPrompt, type PluginElementBlueprint, type PluginWorkbenchCard, type PluginDocLink } from '../../shared/types/plugins';

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
  if (text === 'item' || text === 'tool' || text === 'block' || text === 'recipe' || text === 'loot_table' || text === 'function' || text === 'mob_effect' || text === 'potion' || text === 'enchantment') return text;
  return 'item';
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

  return { cards, actions, aiPrompts, elementBlueprints, docs };
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

export const builtinPluginCatalog: BlockForgePluginManifest[] = [
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
