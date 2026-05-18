import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createProject, readProject, type CreateProjectOptions } from '../core/project/projectService';
import {
  createBlock,
  createFunctionElement,
  createItem,
  createLootTable,
  createEnchantment,
  createMobEffect,
  createPotion,
  createRecipe,
  deleteElement,
  duplicateElement,
  loadElementSet,
  loadElements,
  saveElement
} from '../core/elements/elementService';
import { checkResources, deleteResource, duplicateResource, importModelJson, importTexture, readResourceContent, readResourceIndex, saveModelJson, saveTextureDataUrl } from '../core/resources/resourceService';
import { generateForgeProject } from '../core/generator/forge/forgeGenerator';
import { buildForgeJar } from '../core/build/buildService';
import { builtInNodeTypes, createNode } from '../core/logic/nodeRegistry';
import { createDefaultLogicGraph, loadLogicGraphs, saveLogicGraph } from '../core/logic/logicService';
import { compileGraphToIR, validateLogicGraph } from '../core/ir/logicCompiler';
import { generateForgeEventHandler } from '../core/generator/forge/forgeEventGenerator';
import { createAssistantReply, createLogicDraft, createProjectChangePlan, listModels, testConnection } from '../core/ai/aiService';
import { applyProjectChangePlan, collectProjectFilesForAi, validateProjectChangePlan } from '../core/ai/projectChangeService';
import { exportProjectZip } from '../core/export/exportService';
import { runPrivacyScan } from '../core/privacy/privacyScanService';
import { createSnapshot, listSnapshots, restoreSnapshot } from '../core/snapshot/snapshotService';
import { importTemplatePackage, listTemplates } from '../core/templates/templateService';
import { createDefaultUiScreen, loadUiScreens, saveUiScreen } from '../core/ui/uiService';
import { deepSeekPreset, type AiChatMessage, type AiProviderConfig } from '../shared/types/ai';
import type { AiProjectChangePlan } from '../shared/types/ai';
import type { ElementModel } from '../shared/types/elements';
import type { LogicGraph } from '../shared/types/logic';
import type { UiScreenModel } from '../shared/types/ui';

interface AppSettings {
  autoBuildAfterGenerate: boolean;
  backgroundColor: string;
  completedProjects: Array<{
    id: string;
    name: string;
    modId: string;
    projectDir: string;
    status: 'completed' | 'polish' | 'archived';
    notes: string;
    updatedAt: string;
  }>;
}

const sampleTexturePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAALUlEQVR4nGP8z8Dwn4ECwESJ5lEDRg0YNWDUgFEDRg0YNWDUgFEDBgD2mAMhSP7qWQAAAABJRU5ErkJggg==',
  'base64'
);

function userDataFile(name: string) {
  return path.join(app.getPath('userData'), name);
}

function defaultAiConfig(): AiProviderConfig {
  return { ...deepSeekPreset, apiKey: '' };
}

function defaultAppSettings(): AppSettings {
  return { autoBuildAfterGenerate: false, backgroundColor: '#ffffff', completedProjects: [] };
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) as T; } catch { return fallback; }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2), 'utf8');
}

async function readRecentProjects(): Promise<string[]> {
  return readJson<string[]>(userDataFile('recent-projects.json'), []);
}

async function addRecentProject(projectDir: string): Promise<string[]> {
  const resolved = path.resolve(projectDir);
  const recent = (await readRecentProjects()).filter(item => path.resolve(item) !== resolved);
  recent.unshift(resolved);
  const next = recent.slice(0, 10);
  await writeJson(userDataFile('recent-projects.json'), next);
  return next;
}

function createWindow() {
  const win = new BrowserWindow({
    title: 'BlockForge Studio',
    width: 1440,
    height: 940,
    minWidth: 1100,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
  if (process.env.NODE_ENV === 'development') {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
  return win;
}

function rendererTarget(extraQuery = '') {
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
  const query = extraQuery ? `?${extraQuery}` : '';
  if (process.env.NODE_ENV === 'development') return `${devUrl}${query}`;
  return path.join(__dirname, '../renderer/index.html');
}

function openTextureEditorWindow(projectDir: string) {
  const win = new BrowserWindow({
    title: 'BlockForge 贴图编辑器',
    width: 1240,
    height: 960,
    minWidth: 960,
    minHeight: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const query = `textureEditor=1&projectDir=${encodeURIComponent(projectDir)}`;
  if (process.env.NODE_ENV === 'development') {
    void win.loadURL(rendererTarget(query));
  } else {
    void win.loadFile(rendererTarget(), { query: { textureEditor: '1', projectDir } });
  }
  return win;
}

function openModelEditorWindow(projectDir: string) {
  const win = new BrowserWindow({
    title: 'BlockForge 3D 模型编辑器',
    width: 1320,
    height: 960,
    minWidth: 1000,
    minHeight: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const query = `modelEditor=1&projectDir=${encodeURIComponent(projectDir)}`;
  if (process.env.NODE_ENV === 'development') {
    void win.loadURL(rendererTarget(query));
  } else {
    void win.loadFile(rendererTarget(), { query: { modelEditor: '1', projectDir } });
  }
  return win;
}

function sendCommand(command: string) {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  win?.webContents.send('app:command', command);
}

function setupMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '项目',
      submenu: [
        { label: '新建项目', accelerator: 'CmdOrCtrl+N', click: () => sendCommand('project:new') },
        { label: '打开项目', accelerator: 'CmdOrCtrl+O', click: () => sendCommand('project:open') },
        { type: 'separator' },
        { label: '导出项目压缩包', accelerator: 'CmdOrCtrl+Shift+E', click: () => sendCommand('project:export') },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    },
    {
      label: '构建',
      submenu: [
        { label: '生成 Forge 工程', accelerator: 'CmdOrCtrl+G', click: () => sendCommand('forge:generate') },
        { label: '构建 jar', accelerator: 'CmdOrCtrl+B', click: () => sendCommand('forge:build') }
      ]
    },
    {
      label: '工具',
      submenu: [
        { label: 'AI 设置', click: () => sendCommand('view:ai') },
        { label: '构建设置', click: () => sendCommand('view:settings') },
        { label: '节点逻辑编辑器', click: () => sendCommand('view:logic') },
        { label: '可视化界面编辑器', click: () => sendCommand('view:ui') },
        { label: '项目管理', click: () => sendCommand('view:manage') },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createSampleProject(projectDir: string) {
  const project = await createProject(projectDir, 'Ice Wand Demo', {
    modId: 'ice_wand_demo',
    packageName: 'com.blockforge.ice_wand_demo',
    author: 'BlockForge'
  });
  const item = createItem(project, 'ice_wand', '冰霜法杖');
  item.properties.itemKind = 'magic_wand';
  item.properties.maxStackSize = 1;
  item.properties.durability = 128;
  item.properties.tier = 'DIAMOND';
  item.properties.attackDamage = 5;
  item.properties.attackSpeed = -2.2;
  item.properties.texture = 'ice_wand';
  item.properties.model = 'ice_wand_model';
  item.properties.rightClickLogic = 'item:ice_wand';
  const block = createBlock(project, 'frost_block', '霜冻方块');
  block.properties.textureAll = 'frost_block';
  block.properties.model = 'frost_block_model';
  const recipe = createRecipe(project, 'ice_wand', '冰霜法杖配方');
  recipe.properties.ingredients = ['minecraft:stick', 'minecraft:snowball'];
  recipe.properties.result = `${project.modId}:ice_wand`;
  const loot = createLootTable(project, 'frost_block', '霜冻方块掉落');
  loot.properties.targetBlock = 'frost_block';
  loot.properties.drop = `${project.modId}:frost_block`;
  const fn = createFunctionElement(project, 'ice_wand_cast', '冰霜法杖施法');
  fn.properties.commands = 'effect give @p minecraft:slowness 3 1\nparticle minecraft:snowflake ~ ~1 ~ 0.6 0.8 0.6 0.02 40';
  const effect = createMobEffect(project, 'frostbite', '霜寒状态');
  effect.properties.category = 'harmful';
  effect.properties.color = '#8fd8ff';
  effect.properties.description = '降低目标速度的冰霜状态效果。';
  const potion = createPotion(project, 'frost_potion', '霜寒药水');
  potion.properties.effects = [{ effect: `${project.modId}:frostbite`, duration: 160, amplifier: 1, visible: true, showIcon: true }];
  const enchantment = createEnchantment(project, 'frost_affinity', '霜寒亲和');
  enchantment.properties.slots = ['mainhand'];
  enchantment.properties.description = '让武器更适合触发冰霜主题逻辑。';

  for (const element of [item, block, recipe, loot, fn, effect, potion, enchantment]) await saveElement(projectDir, element);

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'blockforge-sample-'));
  const itemTexture = path.join(tmpDir, 'ice_wand.png');
  const blockTexture = path.join(tmpDir, 'frost_block.png');
  await fs.writeFile(itemTexture, sampleTexturePng);
  await fs.writeFile(blockTexture, sampleTexturePng);
  await importTexture(projectDir, itemTexture, 'item_texture', 'item:ice_wand', project.modId);
  await importTexture(projectDir, blockTexture, 'block_texture', 'block:frost_block', project.modId);
  await saveModelJson(projectDir, JSON.stringify({ parent: 'minecraft:item/handheld', textures: { layer0: `${project.modId}:item/ice_wand` } }, null, 2), 'item_model', 'item:ice_wand', project.modId, 'ice_wand_model');
  await saveModelJson(projectDir, JSON.stringify({ parent: 'minecraft:block/cube_all', textures: { all: `${project.modId}:block/frost_block` } }, null, 2), 'block_model', 'block:frost_block', project.modId, 'frost_block_model');

  const graph = createDefaultLogicGraph('Ice wand right click', 'item:ice_wand');
  await saveLogicGraph(projectDir, graph);
  await saveUiScreen(projectDir, createDefaultUiScreen('Ice Wand GUI'));
  const elements = await loadElementSet(projectDir);
  await generateForgeProject({ projectDir, project, ...elements, logicIR: [compileGraphToIR(graph)] });
  await addRecentProject(projectDir);
  return { projectDir: path.resolve(projectDir), project };
}

function registerIpc() {
  ipcMain.handle('project:create', async (_event, input: { projectDir: string; displayName: string } & CreateProjectOptions) => {
    const project = await createProject(input.projectDir, input.displayName, input);
    await addRecentProject(input.projectDir);
    return { projectDir: path.resolve(input.projectDir), project };
  });
  ipcMain.handle('project:createSample', async (_event, input: { projectDir: string }) => createSampleProject(input.projectDir));

  ipcMain.handle('project:open', async (_event, input?: { projectDir?: string }) => {
    let projectDir = input?.projectDir;
    if (!projectDir) {
      const picked = await dialog.showOpenDialog({ properties: ['openDirectory'], title: '打开 BlockForge 项目' });
      if (picked.canceled || picked.filePaths.length === 0) return null;
      projectDir = picked.filePaths[0];
    }
    const project = await readProject(projectDir);
    await addRecentProject(projectDir);
    return { projectDir: path.resolve(projectDir), project };
  });

  ipcMain.handle('project:readRecent', async () => readRecentProjects());
  ipcMain.handle('project:exportZip', async (_event, input: { projectDir: string; outputFile?: string }) => exportProjectZip(input.projectDir, input.outputFile));
  ipcMain.handle('settings:read', async () => readJson<AppSettings>(userDataFile('app-settings.json'), defaultAppSettings()));
  ipcMain.handle('settings:save', async (_event, input: { settings: AppSettings }) => {
    const next = { ...defaultAppSettings(), ...input.settings };
    await writeJson(userDataFile('app-settings.json'), next);
    return next;
  });

  ipcMain.handle('elements:createItem', async (_event, input: { projectDir: string; id: string; zhName: string }) => createItem(await readProject(input.projectDir), input.id, input.zhName));
  ipcMain.handle('elements:createBlock', async (_event, input: { projectDir: string; id: string; zhName: string }) => createBlock(await readProject(input.projectDir), input.id, input.zhName));
  ipcMain.handle('elements:createRecipe', async (_event, input: { projectDir: string; id: string; zhName: string }) => createRecipe(await readProject(input.projectDir), input.id, input.zhName));
  ipcMain.handle('elements:createLootTable', async (_event, input: { projectDir: string; id: string; zhName: string }) => createLootTable(await readProject(input.projectDir), input.id, input.zhName));
  ipcMain.handle('elements:createFunction', async (_event, input: { projectDir: string; id: string; zhName: string }) => createFunctionElement(await readProject(input.projectDir), input.id, input.zhName));
  ipcMain.handle('elements:createMobEffect', async (_event, input: { projectDir: string; id: string; zhName: string }) => createMobEffect(await readProject(input.projectDir), input.id, input.zhName));
  ipcMain.handle('elements:createPotion', async (_event, input: { projectDir: string; id: string; zhName: string }) => createPotion(await readProject(input.projectDir), input.id, input.zhName));
  ipcMain.handle('elements:createEnchantment', async (_event, input: { projectDir: string; id: string; zhName: string }) => createEnchantment(await readProject(input.projectDir), input.id, input.zhName));
  ipcMain.handle('elements:save', async (_event, input: { projectDir: string; element: ElementModel }) => {
    await saveElement(input.projectDir, input.element);
    return loadElementSet(input.projectDir);
  });
  ipcMain.handle('elements:duplicate', async (_event, input: { projectDir: string; element: ElementModel; newId: string; zhName?: string }) => {
    const copied = await duplicateElement(input.projectDir, input.element, input.newId, input.zhName);
    return { copied, elements: await loadElementSet(input.projectDir) };
  });
  ipcMain.handle('elements:delete', async (_event, input: { projectDir: string; type: ElementModel['type']; id: string }) => {
    await deleteElement(input.projectDir, input.type, input.id);
    return loadElementSet(input.projectDir);
  });
  ipcMain.handle('elements:list', async (_event, input: { projectDir: string; folder?: string }) => {
    if (input.folder) return loadElements(input.projectDir, input.folder);
    return loadElementSet(input.projectDir);
  });

  ipcMain.handle('resources:importTexture', async (_event, input: { projectDir: string; sourceFile?: string; usage: 'item_texture' | 'block_texture'; ownerElement: string }) => {
    const project = await readProject(input.projectDir);
    let sourceFile = input.sourceFile;
    if (!sourceFile) {
      const picked = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'PNG 贴图', extensions: ['png'] }] });
      if (picked.canceled || picked.filePaths.length === 0) return null;
      sourceFile = picked.filePaths[0];
    }
    return importTexture(input.projectDir, sourceFile, input.usage, input.ownerElement, project.modId);
  });
  ipcMain.handle('resources:saveTexture', async (_event, input: { projectDir: string; pngDataUrl: string; usage: 'item_texture' | 'block_texture'; ownerElement: string; textureName?: string }) => {
    const project = await readProject(input.projectDir);
    return saveTextureDataUrl(input.projectDir, input.pngDataUrl, input.usage, input.ownerElement, project.modId, input.textureName);
  });
  ipcMain.handle('resources:duplicate', async (_event, input: { projectDir: string; resourceId: string; newName?: string }) => {
    const project = await readProject(input.projectDir);
    return duplicateResource(input.projectDir, input.resourceId, project.modId, input.newName);
  });
  ipcMain.handle('resources:delete', async (_event, input: { projectDir: string; resourceId: string }) => deleteResource(input.projectDir, input.resourceId));
  ipcMain.handle('resources:readIndex', async (_event, input: { projectDir: string }) => readResourceIndex(input.projectDir));
  ipcMain.handle('resources:checkMissing', async (_event, input: { projectDir: string }) => checkResources(input.projectDir));
  ipcMain.handle('resources:readContent', async (_event, input: { projectDir: string; resourceId: string }) => readResourceContent(input.projectDir, input.resourceId));
  ipcMain.handle('resources:importModel', async (_event, input: { projectDir: string; sourceFile?: string; usage: 'item_model' | 'block_model'; ownerElement: string; modelName?: string }) => {
    const project = await readProject(input.projectDir);
    let sourceFile = input.sourceFile;
    if (!sourceFile) {
      const picked = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'JSON 模型', extensions: ['json'] }] });
      if (picked.canceled || picked.filePaths.length === 0) return null;
      sourceFile = picked.filePaths[0];
    }
    return importModelJson(input.projectDir, sourceFile, input.usage, input.ownerElement, project.modId, input.modelName);
  });
  ipcMain.handle('resources:saveModel', async (_event, input: { projectDir: string; jsonText: string; usage: 'item_model' | 'block_model'; ownerElement: string; modelName?: string }) => {
    const project = await readProject(input.projectDir);
    return saveModelJson(input.projectDir, input.jsonText, input.usage, input.ownerElement, project.modId, input.modelName);
  });
  ipcMain.handle('textureEditor:openWindow', async (_event, input: { projectDir: string }) => {
    openTextureEditorWindow(input.projectDir);
    return true;
  });
  ipcMain.handle('modelEditor:openWindow', async (_event, input: { projectDir: string }) => {
    openModelEditorWindow(input.projectDir);
    return true;
  });
  ipcMain.handle('modelEditor:readDraft', async (_event, input: { projectDir: string }) => {
    return readJson(path.join(input.projectDir, 'editor/resources/model-editor-draft.json'), null);
  });
  ipcMain.handle('modelEditor:saveDraft', async (_event, input: { projectDir: string; draft: unknown }) => {
    const file = path.join(input.projectDir, 'editor/resources/model-editor-draft.json');
    await writeJson(file, { ...(input.draft as Record<string, unknown>), updatedAt: new Date().toISOString() });
    return file;
  });
  ipcMain.handle('textureEditor:readDraft', async (_event, input: { projectDir: string }) => {
    return readJson(path.join(input.projectDir, 'editor/resources/texture-editor-draft.json'), null);
  });
  ipcMain.handle('textureEditor:saveDraft', async (_event, input: { projectDir: string; draft: unknown }) => {
    const file = path.join(input.projectDir, 'editor/resources/texture-editor-draft.json');
    await writeJson(file, { ...(input.draft as Record<string, unknown>), updatedAt: new Date().toISOString() });
    return file;
  });

  ipcMain.handle('generate:forge', async (_event, input: { projectDir: string }) => {
    const project = await readProject(input.projectDir);
    const elements = await loadElementSet(input.projectDir);
    const graphs = await loadLogicGraphs(input.projectDir);
    const logicIR = graphs
      .filter(graph => graph.enabled && !validateLogicGraph(graph).some(diagnostic => diagnostic.level === 'error'))
      .map(compileGraphToIR);
    const result = await generateForgeProject({ projectDir: input.projectDir, project, ...elements, logicIR });
    const resourceDiagnostics = await checkResources(input.projectDir);
    return { ...result, resourceDiagnostics };
  });

  ipcMain.handle('build:forgeJar', async (event, input: { projectDir: string }) => buildForgeJar(input.projectDir, line => event.sender.send('build:log', line)));

  ipcMain.handle('logic:createDefault', async (_event, input: { boundElement?: string; name?: string }) => createDefaultLogicGraph(input.name, input.boundElement));
  ipcMain.handle('logic:createNode', async (_event, input: { nodeType: string }) => createNode(input.nodeType));
  ipcMain.handle('logic:nodeTypes', async () => builtInNodeTypes);
  ipcMain.handle('logic:save', async (_event, input: { projectDir: string; graph: LogicGraph }) => {
    await saveLogicGraph(input.projectDir, input.graph);
    return loadLogicGraphs(input.projectDir);
  });
  ipcMain.handle('logic:load', async (_event, input: { projectDir: string }) => loadLogicGraphs(input.projectDir));
  ipcMain.handle('logic:validate', async (_event, input: { graph: LogicGraph }) => validateLogicGraph(input.graph));
  ipcMain.handle('logic:compileToIR', async (_event, input: { graph: LogicGraph }) => compileGraphToIR(input.graph));
  ipcMain.handle('logic:previewForge', async (_event, input: { projectDir: string; graph: LogicGraph }) => {
    const project = await readProject(input.projectDir);
    const ir = compileGraphToIR(input.graph);
    return generateForgeEventHandler(project.packageName, ir);
  });

  ipcMain.handle('ui:createDefault', async (_event, input?: { name?: string }) => createDefaultUiScreen(input?.name));
  ipcMain.handle('ui:save', async (_event, input: { projectDir: string; screen: UiScreenModel }) => saveUiScreen(input.projectDir, input.screen));
  ipcMain.handle('ui:load', async (_event, input: { projectDir: string }) => loadUiScreens(input.projectDir));

  ipcMain.handle('ai:readConfig', async () => readJson<AiProviderConfig>(userDataFile('ai-provider.json'), defaultAiConfig()));
  ipcMain.handle('ai:saveConfig', async (_event, input: { config: AiProviderConfig }) => {
    await writeJson(userDataFile('ai-provider.json'), input.config);
    return { ...input.config, apiKey: input.config.apiKey ? '********' : '' };
  });
  ipcMain.handle('ai:testConnection', async (_event, input: { config?: AiProviderConfig }) => testConnection(input.config || await readJson(userDataFile('ai-provider.json'), defaultAiConfig())));
  ipcMain.handle('ai:listModels', async (_event, input: { config?: AiProviderConfig }) => listModels(input.config || await readJson(userDataFile('ai-provider.json'), defaultAiConfig())));
  ipcMain.handle('ai:createLogicDraft', async (_event, input: { config?: AiProviderConfig; prompt: string; context: Record<string, unknown> }) => {
    const config = input.config || await readJson(userDataFile('ai-provider.json'), defaultAiConfig());
    return createLogicDraft(config, input.prompt, builtInNodeTypes, input.context);
  });
  ipcMain.handle('ai:chat', async (_event, input: { config?: AiProviderConfig; messages: AiChatMessage[]; context: Record<string, unknown> }) => {
    const config = input.config || await readJson(userDataFile('ai-provider.json'), defaultAiConfig());
    return createAssistantReply(config, input.messages, input.context);
  });
  ipcMain.handle('ai:createProjectChangePlan', async (_event, input: { projectDir: string; config?: AiProviderConfig; prompt: string; context: Record<string, unknown> }) => {
    const config = input.config || await readJson(userDataFile('ai-provider.json'), defaultAiConfig());
    const files = await collectProjectFilesForAi(input.projectDir);
    const plan = await createProjectChangePlan(config, input.prompt, files, input.context);
    const validationErrors = validateProjectChangePlan(plan);
    return { plan, validationErrors, scannedFiles: files.map(file => file.path) };
  });
  ipcMain.handle('ai:applyProjectChangePlan', async (_event, input: { projectDir: string; plan: AiProjectChangePlan }) => applyProjectChangePlan(input.projectDir, input.plan));
  ipcMain.handle('ai:saveChatTranscript', async (_event, input: { projectDir: string; messages: AiChatMessage[] }) => {
    const file = path.join(input.projectDir, 'logs', `ai_chat_${Date.now()}.md`);
    await fs.mkdir(path.dirname(file), { recursive: true });
    const content = [
      '# BlockForge AI 对话记录',
      '',
      `时间：${new Date().toLocaleString()}`,
      '',
      ...input.messages.map(message => `## ${message.role === 'user' ? '你' : 'AI'}\n\n${message.content}`)
    ].join('\n');
    await fs.writeFile(file, content, 'utf8');
    return file;
  });

  ipcMain.handle('snapshots:create', async (_event, input: { projectDir: string; reason: string }) => createSnapshot(input.projectDir, input.reason || 'manual'));
  ipcMain.handle('snapshots:list', async (_event, input: { projectDir: string }) => listSnapshots(input.projectDir));
  ipcMain.handle('snapshots:restore', async (_event, input: { projectDir: string; snapshotId: string }) => {
    await restoreSnapshot(input.projectDir, input.snapshotId);
    return listSnapshots(input.projectDir);
  });

  ipcMain.handle('templates:import', async (_event, input: { projectDir: string; sourceFile?: string }) => {
    let sourceFile = input.sourceFile;
    if (!sourceFile) {
      const picked = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'BlockForge 模板包', extensions: ['bftemplate', 'zip'] }] });
      if (picked.canceled || picked.filePaths.length === 0) return null;
      sourceFile = picked.filePaths[0];
    }
    return importTemplatePackage(input.projectDir, sourceFile);
  });
  ipcMain.handle('templates:list', async (_event, input: { projectDir: string }) => listTemplates(input.projectDir));
  ipcMain.handle('privacy:scan', async () => runPrivacyScan(path.resolve(__dirname, '../..')));
  ipcMain.handle('system:openPath', async (_event, input: { targetPath: string }) => {
    await fs.mkdir(input.targetPath, { recursive: true });
    const result = await shell.openPath(input.targetPath);
    if (result) throw new Error(result);
    return true;
  });
}

app.whenReady().then(() => {
  setupMenu();
  registerIpc();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
