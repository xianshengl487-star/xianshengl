import { contextBridge, ipcRenderer } from 'electron';

const invoke = <T>(channel: string, payload?: unknown) => ipcRenderer.invoke(channel, payload) as Promise<T>;

contextBridge.exposeInMainWorld('blockforge', {
  version: '0.1.0',
  project: {
    create: (payload: unknown) => invoke('project:create', payload),
    createSample: (payload: unknown) => invoke('project:createSample', payload),
    open: (payload?: unknown) => invoke('project:open', payload),
    readRecent: () => invoke('project:readRecent'),
    save: (payload: unknown) => invoke('project:save', payload),
    exportZip: (payload: unknown) => invoke('project:exportZip', payload)
  },
  settings: {
    read: () => invoke('settings:read'),
    save: (payload: unknown) => invoke('settings:save', payload)
  },
  appCommands: {
    onCommand: (callback: (command: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, command: string) => callback(command);
      ipcRenderer.on('app:command', listener);
      return () => ipcRenderer.removeListener('app:command', listener);
    }
  },
  elements: {
    createItem: (payload: unknown) => invoke('elements:createItem', payload),
    createTool: (payload: unknown) => invoke('elements:createTool', payload),
    createBlock: (payload: unknown) => invoke('elements:createBlock', payload),
    createRecipe: (payload: unknown) => invoke('elements:createRecipe', payload),
    createLootTable: (payload: unknown) => invoke('elements:createLootTable', payload),
    createFunction: (payload: unknown) => invoke('elements:createFunction', payload),
    createMobEffect: (payload: unknown) => invoke('elements:createMobEffect', payload),
    createPotion: (payload: unknown) => invoke('elements:createPotion', payload),
    createEnchantment: (payload: unknown) => invoke('elements:createEnchantment', payload),
    createStructure: (payload: unknown) => invoke('elements:createStructure', payload),
    save: (payload: unknown) => invoke('elements:save', payload),
    duplicate: (payload: unknown) => invoke('elements:duplicate', payload),
    delete: (payload: unknown) => invoke('elements:delete', payload),
    list: (payload: unknown) => invoke('elements:list', payload)
  },
  resources: {
    importTexture: (payload: unknown) => invoke('resources:importTexture', payload),
    saveTexture: (payload: unknown) => invoke('resources:saveTexture', payload),
    importModel: (payload: unknown) => invoke('resources:importModel', payload),
    saveModel: (payload: unknown) => invoke('resources:saveModel', payload),
    duplicate: (payload: unknown) => invoke('resources:duplicate', payload),
    delete: (payload: unknown) => invoke('resources:delete', payload),
    readIndex: (payload: unknown) => invoke('resources:readIndex', payload),
    checkMissing: (payload: unknown) => invoke('resources:checkMissing', payload),
    readContent: (payload: unknown) => invoke('resources:readContent', payload)
  },
  textureEditor: {
    openWindow: (payload: unknown) => invoke('textureEditor:openWindow', payload),
    readDraft: (payload: unknown) => invoke('textureEditor:readDraft', payload),
    saveDraft: (payload: unknown) => invoke('textureEditor:saveDraft', payload)
  },
  modelEditor: {
    openWindow: (payload: unknown) => invoke('modelEditor:openWindow', payload),
    readDraft: (payload: unknown) => invoke('modelEditor:readDraft', payload),
    saveDraft: (payload: unknown) => invoke('modelEditor:saveDraft', payload)
  },
  generate: {
    project: (payload: unknown) => invoke('generate:project', payload),
    forge: (payload: unknown) => invoke('generate:forge', payload)
  },
  build: {
    projectJar: (payload: unknown) => invoke('build:projectJar', payload),
    forgeJar: (payload: unknown) => invoke('build:forgeJar', payload),
    onLog: (callback: (line: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, line: string) => callback(line);
      ipcRenderer.on('build:log', listener);
      return () => ipcRenderer.removeListener('build:log', listener);
    }
  },
  logic: {
    createDefault: (payload: unknown) => invoke('logic:createDefault', payload),
    createNode: (payload: unknown) => invoke('logic:createNode', payload),
    nodeTypes: () => invoke('logic:nodeTypes'),
    save: (payload: unknown) => invoke('logic:save', payload),
    load: (payload: unknown) => invoke('logic:load', payload),
    validate: (payload: unknown) => invoke('logic:validate', payload),
    compileToIR: (payload: unknown) => invoke('logic:compileToIR', payload),
    previewForge: (payload: unknown) => invoke('logic:previewForge', payload)
  },
  ui: {
    createDefault: (payload?: unknown) => invoke('ui:createDefault', payload),
    save: (payload: unknown) => invoke('ui:save', payload),
    load: (payload: unknown) => invoke('ui:load', payload)
  },
  ai: {
    readConfig: () => invoke('ai:readConfig'),
    saveConfig: (payload: unknown) => invoke('ai:saveConfig', payload),
    testConnection: (payload: unknown) => invoke('ai:testConnection', payload),
    listModels: (payload: unknown) => invoke('ai:listModels', payload),
    chat: (payload: unknown) => invoke('ai:chat', payload),
    createLogicDraft: (payload: unknown) => invoke('ai:createLogicDraft', payload),
    createTextureDraft: (payload: unknown) => invoke('ai:createTextureDraft', payload),
    createModelDraft: (payload: unknown) => invoke('ai:createModelDraft', payload),
    createFeatureRecipe: (payload: unknown) => invoke('ai:createFeatureRecipe', payload),
    createProjectChangePlan: (payload: unknown) => invoke('ai:createProjectChangePlan', payload),
    applyProjectChangePlan: (payload: unknown) => invoke('ai:applyProjectChangePlan', payload),
    saveChatTranscript: (payload: unknown) => invoke('ai:saveChatTranscript', payload)
  },
  snapshots: {
    create: (payload: unknown) => invoke('snapshots:create', payload),
    list: (payload: unknown) => invoke('snapshots:list', payload),
    restore: (payload: unknown) => invoke('snapshots:restore', payload)
  },
  templates: {
    import: (payload: unknown) => invoke('templates:import', payload),
    list: (payload: unknown) => invoke('templates:list', payload)
  },
  plugins: {
    catalog: () => invoke('plugins:catalog'),
    list: (payload: unknown) => invoke('plugins:list', payload),
    import: (payload: unknown) => invoke('plugins:import', payload),
    installBuiltin: (payload: unknown) => invoke('plugins:installBuiltin', payload),
    toggle: (payload: unknown) => invoke('plugins:toggle', payload),
    remove: (payload: unknown) => invoke('plugins:remove', payload),
    createStarter: (payload: unknown) => invoke('plugins:createStarter', payload),
    export: (payload: unknown) => invoke('plugins:export', payload)
  },
  privacy: {
    scan: () => invoke('privacy:scan')
  },
  system: {
    openPath: (payload: unknown) => invoke('system:openPath', payload),
    openExternal: (payload: unknown) => invoke('system:openExternal', payload)
  }
});
